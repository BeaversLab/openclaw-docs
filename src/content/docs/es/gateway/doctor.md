---
summary: "Comando Doctor: comprobaciones de estado, migraciones de configuración y pasos de reparación"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` es la herramienta de reparación y migración para OpenClaw. Corrige el estado/configuración obsoletos, verifica el estado y proporciona pasos de reparación procesables.

## Inicio rápido

```bash
openclaw doctor
```

### Sin interfaz gráfica / automatización

```bash
openclaw doctor --yes
```

Acepta los valores predeterminados sin preguntar (incluyendo pasos de reparación de reinicio/servicio/sandbox cuando sea aplicable).

```bash
openclaw doctor --repair
```

Aplica las reparaciones recomendadas sin preguntar (reparaciones + reinicios donde sea seguro).

```bash
openclaw doctor --repair --force
```

Aplica también reparaciones agresivas (sobrescribe las configuraciones personalizadas del supervisor).

```bash
openclaw doctor --non-interactive
```

Ejecuta sin preguntar y aplica solo migraciones seguras (normalización de configuración + movimientos de estado en disco). Omite acciones de reinicio/servicio/sandbox que requieren confirmación humana.
Las migraciones de estado heredadas se ejecutan automáticamente cuando se detectan.

```bash
openclaw doctor --deep
```

Escanea los servicios del sistema en busca de instalaciones adicionales de la puerta de enlace (launchd/systemd/schtasks).

Si desea revisar los cambios antes de escribirlos, abra primero el archivo de configuración:

```bash
cat ~/.openclaw/openclaw.json
```

## Lo que hace (resumen)

- Actualización previa opcional para instalaciones de git (solo interactivo).
- Verificación de frescura del protocolo de la interfaz de usuario (reconstruye la interfaz de usuario de Control cuando el esquema del protocolo es más reciente).
- Verificación de estado + solicitud de reinicio.
- Resumen del estado de las habilidades (elegibles/faltantes/bloqueadas) y estado del complemento.
- Normalización de configuración para valores heredados.
- Habla de la migración de configuración de los campos planos heredados `talk.*` a `talk.provider` + `talk.providers.<provider>`.
- La migración del navegador comprueba las configuraciones heredadas de la extensión de Chrome y la preparación de Chrome MCP.
- Advertencias de anulación de proveedor de OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Comprobación de requisitos previos de TLS OAuth para perfiles OAuth de OpenAI Codex.
- Migración del estado en disco heredado (sessions/agent dir/WhatsApp auth).
- Migración de clave de contrato de manifiesto de complemento heredada (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
- Migración de tienda cron heredada (`jobId`, `schedule.cron`, campos de nivel superior delivery/payload, payload `provider`, trabajos de reserva de webhook simple `notify: true`).
- Inspección de archivo de bloqueo de sesión y limpieza de bloqueos obsoletos.
- Comprobaciones de integridad y permisos de estado (sessions, transcripts, state dir).
- Comprobaciones de permisos de archivos de configuración (chmod 600) al ejecutarse localmente.
- Estado de autenticación del modelo: comprueba la caducidad de OAuth, puede actualizar los tokens que caducan y reporta los estados de cooldown/desactivado del perfil de autenticación.
- Detección de directorio de espacio de trabajo adicional (`~/openclaw`).
- Reparación de imagen de sandbox cuando el sandbox está habilitado.
- Migración de servicio heredado y detección de puerta de enlace adicional.
- Migración de estado heredado del canal Matrix (en modo `--fix` / `--repair`).
- Comprobaciones de tiempo de ejecución de la puerta de enlace (servicio instalado pero no en ejecución; etiqueta launchd en caché).
- Advertencias de estado del canal (sondeadas desde la puerta de enlace en ejecución).
- Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
- Comprobaciones de mejores prácticas de tiempo de ejecución de la puerta de enlace (Node vs Bun, rutas de gestor de versiones).
- Diagnósticos de colisión de puerto de puerta de enlace (predeterminado `18789`).
- Advertencias de seguridad para políticas de DM abiertas.
- Comprobaciones de autenticación de puerta de enlace para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones de SecretRef de token).
- Verificación de persistencia de systemd en Linux.
- Verificación del tamaño del archivo de inicialización del espacio de trabajo (advertencias de truncamiento/cerca del límite para archivos de contexto).
- Verificación del estado de finalización del shell y autoinstalación/actualización.
- Verificación de preparación del proveedor de incrustación para búsqueda de memoria (modelo local, clave de API remota o binario QMD).
- Verificaciones de instalación desde el código fuente (discordancia del espacio de trabajo pnpm, activos de interfaz faltantes, binario tsx faltante).
- Escribe la configuración actualizada + metadatos del asistente.

## Comportamiento detallado y fundamento

### 0) Actualización opcional (instalaciones git)

Si es una copia de trabajo git y doctor se está ejecutando de forma interactiva, ofrece
actualizar (fetch/rebase/build) antes de ejecutar doctor.

### 1) Normalización de configuración

Si la configuración contiene formas de valores heredados (por ejemplo `messages.ackReaction`
sin una invalidación específica del canal), doctor las normaliza en el esquema
actual.

Esto incluye los campos planos heredados de Talk. La configuración pública actual de Talk es
`talk.provider` + `talk.providers.<provider>`. Doctor reescribe las antiguas
formas `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` /
`talk.apiKey` en el mapa del proveedor.

### 2) Migraciones de claves de configuración heredadas

Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden
que ejecute `openclaw doctor`.

Doctor hará lo siguiente:

- Explicar qué claves heredadas se encontraron.
- Mostrar la migración que aplicó.
- Reescribir `~/.openclaw/openclaw.json` con el esquema actualizado.

La Gateway también ejecuta automáticamente las migraciones de doctor al iniciar cuando detecta un
formato de configuración heredado, por lo que las configuraciones obsoletas se reparan sin intervención manual.
Las migraciones del almacén de trabajos de Cron son manejadas por `openclaw doctor --fix`.

Migraciones actuales:

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de nivel superior
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` heredado → `talk.provider` + `talk.providers.<provider>`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
- `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
- `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
- `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
- `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
- `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
- `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
- `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold`
  → `plugins.entries.voice-call.config.streaming.providers.openai.*`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- Para canales con `accounts` con nombre pero valores de canal de nivel superior de cuenta única persistentes, mueva esos valores con ámbito de cuenta a la cuenta promovida elegida para ese canal (`accounts.default` para la mayoría de los canales; Matrix puede conservar un destino predeterminado/con nombre coincidente existente)
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (herramientas/elevado/exec/sandbox/subagentes)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- eliminar `browser.relayBindHost` (configuración heredada de retransmisión de extensiones)

Las advertencias de Doctor también incluyen orientación predeterminada de la cuenta para canales multicuenta:

- Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, Doctor advierte que el enrutamiento de reserva puede elegir una cuenta inesperada.
- Si `channels.<channel>.defaultAccount` está configurado con un ID de cuenta desconocido, Doctor advierte y enumera los IDs de cuenta configurados.

### 2b) Invalidaciones del proveedor de OpenCode

Si ha añadido `models.providers.opencode`, `opencode-zen` o `opencode-go`
manualmente, esto anula el catálogo integrado de OpenCode de `@mariozechner/pi-ai`.
Eso puede forzar a los modelos a la API incorrecta o anular los costos. Doctor advierte para que
pueda eliminar la anulación y restaurar el enrutamiento de API + costos por modelo.

### 2c) Migración del navegador y preparación para Chrome MCP

Si su configuración del navegador todavía apunta a la ruta eliminada de la extensión de Chrome, Doctor
la normaliza al modelo de conexión local de host de Chrome MCP actual:

- `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
- `browser.relayBindHost` se elimina

Doctor también audita la ruta local de host de Chrome MCP cuando usa el perfil `defaultProfile:
"user"` or a configured `existing-session`:

- comprueba si Google Chrome está instalado en el mismo host para los perfiles
  de autoconexión predeterminados
- comprueba la versión de Chrome detectada y advierte cuando está por debajo de Chrome 144
- te recuerda que habilites la depuración remota en la página de inspección del navegador (por
  ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`,
  o `edge://inspect/#remote-debugging`)

Doctor no puede habilitar la configuración del lado de Chrome por ti. Chrome MCP local en el host
aún requiere:

- un navegador basado en Chromium 144+ en el host gateway/nodo
- el navegador ejecutándose localmente
- depuración remota habilitada en ese navegador
- aprobar el primer mensaje de consentimiento de conexión en el navegador

La preparación aquí se trata solo de los requisitos previos de conexión local. La sesión existente mantiene
los límites de ruta actuales de Chrome MCP; las rutas avanzadas como `responsebody`, exportación de
PDF, interceptación de descargas y acciones por lotes aún requieren un
navegador administrado o perfil CDP sin procesar.

Esta comprobación **no** se aplica a Docker, sandbox, navegador remoto u otros
flujos sin cabeza. Esos continúan usando CDP sin procesar.

### 2d) Requisitos previos de OAuth TLS

Cuando se configura un perfil OAuth de OpenAI Codex, doctor sondea el punto final
de autorización de OpenAI para verificar que la pila TLS local de Node/OpenSSL pueda
validar la cadena de certificados. Si el sondeo falla con un error de certificado (por
ejemplo `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificado caducado o certificado autofirmado),
doctor imprime orientación de corrección específica de la plataforma. En macOS con un Node de Homebrew, la
corrección suele ser `brew postinstall ca-certificates`. Con `--deep`, el sondeo se ejecuta
even si el gateway está sano.

### 3) Migraciones de estado heredado (diseño de disco)

Doctor puede migrar diseños en disco más antiguos a la estructura actual:

- Almacén de sesiones + transcripciones:
  - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
- Directorio del agente:
  - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
- Estado de autenticación de WhatsApp (Baileys):
  - del legado `~/.openclaw/credentials/*.json` (excepto `oauth.json`)
  - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminada: `default`)

Estas migraciones se realizan con el máximo esfuerzo y son idempotentes; doctor emitirá advertencias cuando deje carpetas heredadas como copias de seguridad. Gateway/CLI también migra automáticamente las sesiones heredadas + el directorio del agente al inicio para que el historial/la autenticación/los modelos se guarden en la ruta por agente sin necesidad de ejecutar manualmente doctor. La autenticación de WhatsApp se migra intencionalmente solo a través de `openclaw doctor`. La normalización del proveedor/mapa de proveedores de Talk ahora compara por igualdad estructural, por lo que las diferencias solo en el orden de las claves ya no activan cambios repetidos de no operación `doctor --fix`.

### 3a) Migraciones de manifiesto de complementos heredados

Doctor escanea todos los manifiestos de complementos instalados en busca de claves de capacidades de nivel superior obsoletas (`speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`,
`webSearchProviders`). Cuando se encuentran, ofrece moverlas al objeto `contracts`
y reescribir el archivo de manifiesto en el lugar. Esta migración es idempotente;
si la clave `contracts` ya tiene los mismos valores, la clave heredada se elimina
sin duplicar los datos.

### 3b) Migraciones de almacenamiento cron heredado

Doctor también verifica el almacenamiento de trabajos cron (`~/.openclaw/cron/jobs.json` de forma predeterminada,
o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el planificador todavía
acepta por compatibilidad.

Las limpiezas cron actuales incluyen:

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
- campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de entrega `provider` de carga útil → `delivery.channel` explícito
- trabajos de reserva de webhook heredados simples `notify: true` → `delivery.mode="webhook"` explícitos con `delivery.to=cron.webhook`

Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin cambiar el comportamiento. Si un trabajo combina la reserva de notificación heredada con un modo de entrega que no sea webhook existente, doctor advierte y deja ese trabajo para su revisión manual.

### 3c) Limpieza de bloqueos de sesión

Doctor escanea cada directorio de sesión del agente en busca de archivos de bloqueo de escritura obsoletos — archivos que quedaron atrás cuando una sesión salió anormalmente. Para cada archivo de bloqueo encontrado, reporta: la ruta, PID, si el PID sigue vivo, la antigüedad del bloqueo y si se considera obsoleto (PID muerto o anterior a 30 minutos). En el modo `--fix` / `--repair` elimina automáticamente los archivos de bloqueo obsoletos; de lo contrario, imprime una nota y le indica que vuelva a ejecutar con `--fix`.

### 4) Verificaciones de integridad del estado (persistencia de la sesión, enrutamiento y seguridad)

El directorio de estado es el tronco encefálico operativo. Si desaparece, pierde sesiones, credenciales, registros y configuración (a menos que tenga copias de seguridad en otro lugar).

Doctor comprueba:

- **State dir missing**: advierte sobre la pérdida catastrófica del estado, solicita recrear el directorio y le recuerda que no puede recuperar los datos faltantes.
- **State dir permissions**: verifica la capacidad de escritura; ofrece reparar los permisos (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
- **macOS cloud-synced state dir**: advierte cuando el estado se resuelve bajo iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta y carreras de bloqueo/sincronización.
- **Linux SD or eMMC state dir**: advierte cuando el estado se resuelve en una fuente de montaje `mmcblk*`, porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse más rápido bajo escrituras de sesión y credenciales.
- **Session dirs missing**: `sessions/` y el directorio de almacenamiento de la sesión son necesarios para persistir el historial y evitar fallos `ENOENT`.
- **Transcript mismatch**: advierte cuando las entradas de sesión recientes tienen archivos de transcripción faltantes.
- **Sesión principal “1-line JSONL”**: marca cuando la transcripción principal tiene solo una
  línea (el historial no se está acumulando).
- **Múltiples directorios de estado**: advierte cuando existen varias carpetas `~/.openclaw` en los
  directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede
  dividirse entre instalaciones).
- **Recordatorio de modo remoto**: si `gateway.mode=remote`, doctor le recuerda que debe ejecutarlo
  en el host remoto (el estado reside allí).
- **Permisos del archivo de configuración**: advierte si `~/.openclaw/openclaw.json` es
  legible por el grupo/mundo y ofrece restringirlo a `600`.

### 5) Estado de autenticación del modelo (caducidad de OAuth)

Doctor inspecciona los perfiles OAuth en el almacén de autenticación, advierte cuando los tokens están
por caducar/caducados y puede actualizarlos cuando es seguro. Si el perfil de OAuth/token
de Anthropic está obsoleto, sugiere una clave de API de Anthropic o la ruta heredada
del token de configuración de Anthropic.
Las solicitudes de actualización solo aparecen al ejecutarse interactivamente (TTY); `--non-interactive`
omite los intentos de actualización.

Doctor también detecta el estado obsoleto eliminado de la CLI de Anthropic Claude. Si los bytes
antiguos de las credenciales `anthropic:claude-cli` todavía existen en `auth-profiles.json`,
doctor los convierte de nuevo en perfiles de token/OAuth de Anthropic y reescribe
las referencias de modelos obsoletas `claude-cli/...`.
Si los bytes han desaparecido, doctor elimina la configuración obsoleta e imprime comandos
de recuperación en su lugar.

Doctor también informa sobre los perfiles de autenticación que están temporalmente inutilizables debido a:

- períodos de enfriamiento cortos (límites de velocidad/tiempos de espera/fallos de autenticación)
- deshabilitaciones más largas (fallos de facturación/crédito)

### 6) Validación del modelo de Hooks

Si `hooks.gmail.model` está configurado, doctor valida la referencia del modelo contra el
catálogo y la lista de permitidos y advierte cuando no se pueda resolver o esté prohibido.

### 7) Reparación de la imagen de Sandbox

Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece compilar o
cambiar a nombres heredados si falta la imagen actual.

### 7b) Dependencias de tiempo de ejecución del complemento incluido

Doctor verifica que las dependencias de tiempo de ejecución de los complementos incluidos (por ejemplo, los
paquetes de tiempo de ejecución del complemento Discord) estén presentes en la raíz de instalación de OpenClaw.
Si faltan algunos, doctor informa sobre los paquetes y los instala en modo
`openclaw doctor --fix` / `openclaw doctor --repair`.

### 8) Migraciones del servicio de puerta de enlace y sugerencias de limpieza

Doctor detecta los servicios de puerta de enlace heredados (launchd/systemd/schtasks) y
ofrece eliminarlos e instalar el servicio OpenClaw usando el puerto de puerta de enlace
actual. También puede escanear en busca de servicios adicionales similares a una puerta de enlace e imprimir sugerencias de limpieza.
Los servicios de puerta de enlace de OpenClaw con nombres de perfil se consideran de primera clase y no
se marcan como "extra".

### 8b) Migración de Matrix al inicio

Cuando una cuenta de canal de Matrix tiene una migración de estado heredada pendiente o accionable,
Doctor (en modo `--fix` / `--repair`) crea una instantánea de premigración y luego
ejecuta los pasos de mejor esfuerzo para la migración: migración del estado heredado de Matrix y preparación
del estado cifrado heredado. Ambos pasos no son fatales; los errores se registran y el
inicio continúa. En modo de solo lectura (`openclaw doctor` sin `--fix`) esta comprobación
se omite por completo.

### 9) Advertencias de seguridad

Doctor emite advertencias cuando un proveedor está abierto a MD sin una lista de permitidos, o
cuando una política está configurada de forma peligrosa.

### 10) Persistencia de systemd (Linux)

Si se ejecuta como un servicio de usuario de systemd, Doctor asegura que la persistencia esté habilitada para que la
puerta de enlace permanezca activa después de cerrar la sesión.

### 11) Estado del espacio de trabajo (habilidades, complementos y directorios heredados)

Doctor imprime un resumen del estado del espacio de trabajo para el agente predeterminado:

- **Estado de las habilidades**: cuenta las habilidades elegibles, con requisitos faltantes y bloqueadas por la lista de permitidos.
- **Directorios de espacio de trabajo heredados**: advierte cuando `~/openclaw` u otros directorios de espacio de trabajo heredados
  existen junto con el espacio de trabajo actual.
- **Estado de los complementos**: cuenta los complementos cargados/desactivados/con error; lista los ID de complemento para cualquier
  error; informa las capacidades de los complementos del paquete.
- **Advertencias de compatibilidad de complementos**: marca los complementos que tienen problemas de compatibilidad con
  el tiempo de ejecución actual.
- **Diagnósticos de complementos**: expone cualquier advertencia o error de tiempo de carga emitido por el
  registro de complementos.

### 11b) Tamaño del archivo de arranque

Doctor verifica si los archivos de inicialización del espacio de trabajo (por ejemplo `AGENTS.md`,
`CLAUDE.md` u otros archivos de contexto inyectados) están cerca o por encima del presupuesto
de caracteres configurado. Informa los recuentos de caracteres sin procesar frente a los inyectados por archivo, el porcentaje
de truncamiento, la causa del truncamiento (`max/file` o `max/total`) y el total de caracteres
inyectados como fracción del presupuesto total. Cuando los archivos están truncados o cerca
del límite, doctor imprime consejos para ajustar `agents.defaults.bootstrapMaxChars`
y `agents.defaults.bootstrapTotalMaxChars`.

### 11c) Completado de shell

Doctor verifica si el completado por tabulación está instalado para el shell actual
(zsh, bash, fish o PowerShell):

- Si el perfil del shell utiliza un patrón de completado dinámico lento
  (`source <(openclaw completion ...)`), doctor lo actualiza a la variante de
  archivo en caché más rápida.
- Si el completado está configurado en el perfil pero falta el archivo de caché,
  doctor regenera la caché automáticamente.
- Si no hay ningún completado configurado, doctor solicita instalarlo
  (solo en modo interactivo; se omite con `--non-interactive`).

Ejecute `openclaw completion --write-state` para regenerar la caché manualmente.

### 12) Verificaciones de autenticación de Gateway (token local)

Doctor verifica la preparación de autenticación del token de la puerta de enlace local.

- Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
- Si `gateway.auth.token` está gestionado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto sin formato.
- `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

### 12b) Reparaciones con reconocimiento de SecretRef de solo lectura

Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de fallo rápido en tiempo de ejecución.

- `openclaw doctor --fix` ahora utiliza el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estado para reparaciones de configuración específicas.
- Ejemplo: la reparación de `@username` `allowFrom` / `groupAllowFrom` de Telegram intenta utilizar las credenciales del bot configuradas cuando están disponibles.
- Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta de comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de fallar o informar erróneamente que falta el token.

### 13) Verificación de estado + reinicio del Gateway

Doctor ejecuta una verificación de estado y ofrece reiniciar el gateway cuando parece
no saludable.

### 13b) Preparación para la búsqueda de memoria

Doctor verifica si el proveedor de embeddings de búsqueda de memoria configurado está listo
para el agente predeterminado. El comportamiento depende del backend y del proveedor configurados:

- **Backend QMD**: sondea si el binario `qmd` está disponible y se puede iniciar.
  Si no, imprime orientación de solución que incluye el paquete npm y una opción de ruta binaria manual.
- **Proveedor local explícito**: verifica si hay un archivo de modelo local o una URL de modelo
  remoto/descargable reconocida. Si falta, sugiere cambiar a un proveedor remoto.
- **Proveedor remoto explícito** (`openai`, `voyage`, etc.): verifica que una clave de API esté
  presente en el entorno o en el almacén de autenticación. Imprime sugerencias de solución accionables si falta.
- **Proveedor automático**: primero verifica la disponibilidad del modelo local y luego intenta cada proveedor
  remoto en orden de selección automática.

Cuando está disponible un resultado de sondeo del gateway (el gateway estaba saludable en el momento de la
verificación), doctor lo contrasta con la configuración visible para la CLI y anota
cualquier discrepancia.

Use `openclaw memory status --deep` para verificar la preparación de los embeddings en tiempo de ejecución.

### 14) Advertencias de estado del canal

Si el gateway está saludable, doctor ejecuta un sondeo de estado del canal e informa
advertencias con soluciones sugeridas.

### 15) Auditoría y reparación de la configuración del Supervisor

Doctor verifica la configuración del supervisor instalado (launchd/systemd/schtasks) en busca de
defectos predeterminados faltantes o desactualizados (por ejemplo, dependencias network-online de systemd y
retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede
reescribir el archivo de servicio/tarea a los valores predeterminados actuales.

Notas:

- `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
- `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
- `openclaw doctor --repair` aplica las soluciones recomendadas sin solicitudes.
- `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
- Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación/reparación del servicio doctor valida el SecretRef pero no persiste los valores de token de texto plano resueltos en los metadatos del entorno del servicio supervisor.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con una guía accionable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
- Para las unidades user-systemd de Linux, las comprobaciones de deriva de token de doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
- Siempre puedes forzar una reescritura completa a través de `openclaw gateway install --force`.

### 16) Diagnósticos del tiempo de ejecución y puerto de la Gateway

Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También verifica colisiones de puertos en el puerto de la gateway (por defecto `18789`) e informa las causas probables (gateway ya ejecutándose, túnel SSH).

### 17) Mejores prácticas del tiempo de ejecución de la Gateway

Doctor advierte cuando el servicio de la gateway se ejecuta en Bun o en una ruta de Node gestionada por versión (`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp y Telegram requieren Node, y las rutas de gestores de versiones pueden romperse después de las actualizaciones porque el servicio no carga tu init de shell. Doctor ofrece migrar a una instalación de Node del sistema cuando esté disponible (Homebrew/apt/choco).

### 18) Escritura de configuración + metadatos del asistente

Doctor persiste cualquier cambio de configuración y marca los metadatos del asistente para registrar la ejecución de doctor.

### 19) Consejos del espacio de trabajo (sistema de copia de seguridad + memoria)

Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad si el espacio de trabajo aún no está bajo git.

Consulte [/concepts/agent-workspace](/en/concepts/agent-workspace) para obtener una guía completa sobre la estructura del espacio de trabajo y la copia de seguridad en git (se recomienda GitHub o GitLab privados).
