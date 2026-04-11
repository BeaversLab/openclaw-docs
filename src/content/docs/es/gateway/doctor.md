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
- Advertencias de sombra OAuth de Codex (`models.providers.openai-codex`).
- Verificación de requisitos previos de OAuth TLS para perfiles OAuth de OpenAI Codex.
- Migración de estado heredado en disco (sesiones/directorio de agente/autenticación de WhatsApp).
- Migración de clave de contrato de manifiesto de complemento heredado (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
- Migración de tienda cron heredada (`jobId`, `schedule.cron`, campos de entrega/carga útil de nivel superior, carga útil `provider`, trabajos de reserva de webhook simple `notify: true`).
- Inspección de archivo de bloqueo de sesión y limpieza de bloqueos obsoletos.
- Verificaciones de integridad y permisos de estado (sesiones, transcripciones, directorio de estado).
- Verificaciones de permisos de archivos de configuración (chmod 600) al ejecutarse localmente.
- Salud de autenticación del modelo: verifica la caducidad de OAuth, puede actualizar tokens que están por caducar e informa estados de perfil de autenticación en período de espera/desactivados.
- Detección de directorio de espacio de trabajo adicional (`~/openclaw`).
- Reparación de imagen de espacio aislado cuando el sandbox está habilitado.
- Migración de servicio heredado y detección de puerta de enlace adicional.
- Migración de estado heredado del canal Matrix (en modo `--fix` / `--repair`).
- Verificaciones de tiempo de ejecución de la puerta de enlace (servicio instalado pero no en ejecución; etiqueta launchd en caché).
- Advertencias de estado del canal (sondeadas desde la puerta de enlace en ejecución).
- Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
- Verificaciones de mejores prácticas de tiempo de ejecución de la puerta de enlace (Node frente a Bun, rutas del administrador de versiones).
- Diagnósticos de colisión de puertos de la puerta de enlace (predeterminado `18789`).
- Advertencias de seguridad para políticas de MD abiertas.
- Verificaciones de autenticación de la puerta de enlace para el modo de token local (ofrece generación de token cuando no existe ninguna fuente de token; no sobrescribe las configuraciones de SecretRef de token).
- Verificación de persistencia de systemd en Linux.
- Verificación del tamaño del archivo de arranque del espacio de trabajo (advertencias de truncamiento/cerca del límite para archivos de contexto).
- Verificación del estado de finalización del shell e instalación/actualización automática.
- Verificación de disponibilidad del proveedor de incrustación de búsqueda de memoria (modelo local, clave de API remota o binario QMD).
- Verificaciones de instalación desde el código fuente (desajuste del espacio de trabajo pnpm, activos de la interfaz de usuario faltantes, binario tsx faltante).
- Escribe la configuración actualizada + los metadatos del asistente.

## Comportamiento detallado y fundamentos

### 0) Actualización opcional (instalaciones git)

Si esta es una copia de trabajo de git y doctor se está ejecutando de manera interactiva, ofrece actualizar (fetch/rebase/build) antes de ejecutar doctor.

### 1) Normalización de la configuración

Si la configuración contiene formas de valores heredados (por ejemplo `messages.ackReaction` sin una anulación específica del canal), doctor las normaliza al esquema actual.

Eso incluye los campos planos heredados de Talk. La configuración pública actual de Talk es `talk.provider` + `talk.providers.<provider>`. Doctor reescribe las formas antiguas `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` en el mapa de proveedores.

### 2) Migraciones de claves de configuración heredadas

Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden que ejecute `openclaw doctor`.

Doctor hará lo siguiente:

- Explicar qué claves heredadas se encontraron.
- Mostrar la migración que aplicó.
- Reescribir `~/.openclaw/openclaw.json` con el esquema actualizado.

El Gateway también ejecuta automáticamente las migraciones de doctor al iniciar cuando detecta un formato de configuración heredado, por lo que las configuraciones obsoletas se reparan sin intervención manual. Las migraciones del almacén de trabajos de Cron son manejadas por `openclaw doctor --fix`.

Migraciones actuales:

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de nivel superior
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` heredados → `talk.provider` + `talk.providers.<provider>`
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
- Para los canales con `accounts` con nombre pero con valores de canal de nivel superior de una sola cuenta persistentes, mueva esos valores con ámbito de cuenta a la cuenta promovida elegida para ese canal (`accounts.default` para la mayoría de los canales; Matrix puede conservar un destino con nombre/predeterminado coincidente existente)
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (herramientas/elevado/exec/sandbox/subagentes)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- eliminar `browser.relayBindHost` (configuración heredada de relay de extensión)

Las advertencias del Doctor también incluyen orientación predeterminada de cuenta para canales multicuenta:

- Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, el Doctor advierte que el enrutamiento de reserva puede elegir una cuenta inesperada.
- Si `channels.<channel>.defaultAccount` está establecido en un ID de cuenta desconocido, el Doctor advierte y enumera los IDs de cuenta configurados.

### 2b) Anulaciones del proveedor OpenCode

Si ha añadido `models.providers.opencode`, `opencode-zen` o `opencode-go`
manualmente, se anula el catálogo OpenCode integrado de `@mariozechner/pi-ai`.
Eso puede forzar modelos a la API incorrecta o anular los costos. El Doctor advierte para que
pueda eliminar la anulación y restaurar el enrutamiento de API por modelo + costos.

### 2c) Migración del navegador y preparación para Chrome MCP

Si la configuración de su navegador todavía apunta a la ruta eliminada de la extensión de Chrome, el Doctor
la normaliza al modelo de conexión local de host de Chrome MCP actual:

- `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
- `browser.relayBindHost` se elimina

El Doctor también audita la ruta local de host de Chrome MCP cuando usa el perfil `defaultProfile:
"user"` or a configured `existing-session`:

- verifica si Google Chrome está instalado en el mismo host para perfiles
  de autoconexión predeterminados
- verifica la versión de Chrome detectada y advierte cuando está por debajo de Chrome 144
- le recuerda que habilite la depuración remota en la página de inspección del navegador (por
  ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`,
  o `edge://inspect/#remote-debugging`)

El Doctor no puede habilitar la configuración del lado de Chrome por usted. Chrome MCP local de host
aún requiere:

- un navegador basado en Chromium 144+ en el host de puerta de enlace/nodo
- el navegador ejecutándose localmente
- depuración remota habilitada en ese navegador
- aprobar el primer mensaje de consentimiento de conexión en el navegador

La disponibilidad aquí se refiere únicamente a los requisitos previos de conexión local. Existing-session mantiene
los límites de ruta de Chrome MCP actuales; las rutas avanzadas como `responsebody`, la
exportación de PDF, la interceptación de descargas y las acciones por lotes aún requieren un
navegador administrado o un perfil CDP sin procesar.

Esta verificación **no** se aplica a Docker, sandbox, remote-browser u otros
flujos headless. Estos continúan usando CDP sin procesar.

### 2d) Requisitos previos de OAuth TLS

Cuando se configura un perfil OAuth de OpenAI Codex, doctor sondea el punto de conexión de autorización de OpenAI
para verificar que la pila TLS local de Node/OpenSSL pueda
validar la cadena de certificados. Si el sondeo falla con un error de certificado (por
ejemplo `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificado caducado o certificado autofirmado),
doctor imprime instrucciones de corrección específicas de la plataforma. En macOS con un Homebrew Node, la
corrección suele ser `brew postinstall ca-certificates`. Con `--deep`, el sondeo se ejecuta
incluso si la puerta de enlace está sana.

### 2c) Invalidaciones del proveedor OAuth de Codex

Si anteriormente agregó configuraciones de transporte heredadas de OpenAI en
`models.providers.openai-codex`, pueden hacer sombra a la ruta del proveedor OAuth de Codex
integrada que las versiones más nuevas usan automáticamente. Doctor avisa cuando detecta
esas configuraciones de transporte antiguas junto con OAuth de Codex para que pueda eliminar o reescribir
la invalidación de transporte obsoleta y recuperar el comportamiento de enrutamiento/respaldo
integrado. Los proxies personalizados y las invalidaciones solo de encabezados todavía son compatibles y no
activan esta advertencia.

### 3) Migraciones de estado heredado (diseño de disco)

Doctor puede migrar diseños en disco antiguos a la estructura actual:

- Almacén de sesiones + transcripciones:
  - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
- Directorio del agente:
  - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
- Estado de autenticación de WhatsApp (Baileys):
  - de `~/.openclaw/credentials/*.json` heredado (excepto `oauth.json`)
  - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminado: `default`)

Estas migraciones se realizan con el mejor esfuerzo y son idempotentes; doctor emitirá advertencias cuando deje carpetas heredadas como copias de seguridad. El Gateway/CLI también auto-migra las sesiones heredadas + el directorio del agente al inicio para que el historial/autenticación/modelos aterricen en la ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo a través de `openclaw doctor`. La normalización del proveedor de Talk/provider-map ahora compara por igualdad estructural, por lo que las diferencias solo en el orden de las claves ya no desencadenan cambios repetidos de no-op `doctor --fix`.

### 3a) Migraciones de manifiesto de complementos heredados

Doctor escanea todos los manifiestos de complementos instalados en busca de claves de capacidades de nivel superior obsoletas (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Cuando se encuentran, ofrece moverlas al objeto `contracts` y reescribir el archivo de manifiesto en su lugar. Esta migración es idempotente; si la clave `contracts` ya tiene los mismos valores, la clave heredada se elimina sin duplicar los datos.

### 3b) Migraciones de tienda cron heredadas

Doctor también verifica la tienda de trabajos cron (`~/.openclaw/cron/jobs.json` por defecto, o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el planificador aún acepta por compatibilidad.

Las limpiezas cron actuales incluyen:

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
- campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de entrega `provider` de carga útil → `delivery.channel` explícito
- trabajos de reserva de webhook heredados simples `notify: true` → `delivery.mode="webhook"` explícitos con `delivery.to=cron.webhook`

Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin cambiar el comportamiento. Si un trabajo combina la reserva de notificación heredada con un modo de entrega existente que no sea webhook, doctor advierte y deja ese trabajo para su revisión manual.

### 3c) Limpieza de bloqueos de sesión

Doctor escanea cada directorio de sesión de agente en busca de archivos obsoletos de bloqueo de escritura (write-lock) — archivos que quedaron atrás cuando una sesión finalizó anormalmente. Para cada archivo de bloqueo encontrado, informa: la ruta, PID, si el PID todavía está vivo, la antigüedad del bloqueo y si se considera obsoleto (PID muerto o mayor de 30 minutos). En modo `--fix` / `--repair` elimina automáticamente los archivos de bloqueo obsoletos; de lo contrario, imprime una nota y le indica que vuelva a ejecutar con `--fix`.

### 4) Verificaciones de integridad del estado (persistencia de sesión, enrutamiento y seguridad)

El directorio de estado es el tallo cerebral operativo. Si desaparece, pierde sesiones, credenciales, registros y configuración (a menos que tenga copias de seguridad en otro lugar).

Doctor comprueba:

- **Directorio de estado faltante**: advierte sobre una pérdida catastrófica de estado, solicita recrear el directorio y recuerda que no puede recuperar los datos faltantes.
- **Permisos del directorio de estado**: verifica la capacidad de escritura; ofrece reparar los permisos (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
- **Directorio de estado sincronizado en la nube en macOS**: advierte cuando el estado se resuelve bajo iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta y condiciones de carrera de bloqueo/sincronización.
- **Directorio de estado en SD o eMMC de Linux**: advierte cuando el estado se resuelve en un origen de montaje `mmcblk*`, porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse más rápido bajo escrituras de sesión y credenciales.
- **Directorios de sesión faltantes**: `sessions/` y el directorio de almacenamiento de sesión son necesarios para persistir el historial y evitar fallos `ENOENT`.
- **Discrepancia de transcripción**: advierte cuando las entradas de sesión recientes tienen archivos de transcripción faltantes.
- **Sesión principal “JSONL de 1 línea”**: marca cuando la transcripción principal tiene solo una
  línea (el historial no se está acumulando).
- **Múltiples directorios de estado**: advierte cuando existen múltiples carpetas `~/.openclaw` en
  directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede
  dividirse entre instalaciones).
- **Recordatorio de modo remoto**: si `gateway.mode=remote`, doctor te recuerda que lo ejecutes
  en el host remoto (el estado reside allí).
- **Permisos del archivo de configuración**: advierte si `~/.openclaw/openclaw.json` es
  legible para el grupo/mundo y ofrece ajustarlo a `600`.

### 5) Estado de autenticación del modelo (caducidad de OAuth)

Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están
por caducar/caducados y puede actualizarlos cuando es seguro. Si el perfil de
OAuth/token de Anthropic está obsoleto, sugiere una clave de API de Anthropic o la ruta del
token de configuración de Anthropic.
Las solicitudes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive`
omite los intentos de actualización.

Doctor también informa sobre los perfiles de autenticación que no se pueden usar temporalmente debido a:

- períodos de espera cortos (límites de tasa/tiempos de espera/fallos de autenticación)
- inhabilitaciones más largas (fallos de facturación/crédito)

### 6) Validación del modelo de Hooks

Si `hooks.gmail.model` está configurado, doctor valida la referencia del modelo contra el
catálogo y la lista de permitidos y advierte cuando no se resolverá o no está permitido.

### 7) Reparación de la imagen de Sandbox

Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece compilar o
cambiar a nombres heredados si falta la imagen actual.

### 7b) Dependencias de tiempo de ejecución de complementos incluidos

Doctor verifica que las dependencias de tiempo de ejecución de los complementos incluidos (por ejemplo, los
paquetes de tiempo de ejecución del complemento de Discord) estén presentes en la raíz de instalación de OpenClaw.
Si falta alguno, doctor informa los paquetes y los instala en
modo `openclaw doctor --fix` / `openclaw doctor --repair`.

### 8) Migraciones del servicio Gateway y sugerencias de limpieza

Doctor detecta servicios de puerta de enlace heredados (launchd/systemd/schtasks) y
ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto de puerta de enlace
actual. También puede buscar servicios adicionales similares a una puerta de enlace e imprimir sugerencias de limpieza.
Los servicios de puerta de enlace OpenClaw con nombre de perfil se consideran de primera clase y no
se marcan como "adicionales".

### 8b) Migración de la matriz de inicio

Cuando una cuenta de canal de Matrix tiene una migración de estado heredada pendiente o accionable, doctor (en modo `--fix` / `--repair`) crea una instantánea pre-migración y luego ejecuta los pasos de migración de mejor esfuerzo: migración de estado heredado de Matrix y preparación de estado cifrado heredado. Ambos pasos no son fatales; los errores se registran y el inicio continúa. En modo de solo lectura (`openclaw doctor` sin `--fix`) esta verificación se omite por completo.

### 9) Advertencias de seguridad

Doctor emite advertencias cuando un proveedor está abierto a MDs sin una lista de permitidos, o cuando una política está configurada de forma peligrosa.

### 10) systemd linger (Linux)

Si se ejecuta como un servicio de usuario de systemd, doctor asegura que lingering esté habilitado para que la puerta de enlace se mantenga activa después de cerrar la sesión.

### 11) Estado del espacio de trabajo (habilidades, complementos y directorios heredados)

Doctor imprime un resumen del estado del espacio de trabajo para el agente predeterminado:

- **Estado de las habilidades (skills)**: cuenta las habilidades elegibles, con requisitos faltantes y bloqueadas por la lista de permitidos.
- **Directorios de espacio de trabajo heredados**: advierte cuando `~/openclaw` u otros directorios de espacio de trabajo heredados existen junto al espacio de trabajo actual.
- **Estado de los complementos (plugins)**: cuenta los complementos cargados/deshabilitados/con error; enumera los ID de los complementos para cualquier error; informa las capacidades del complemento de paquete (bundle).
- **Advertencias de compatibilidad de complementos**: marca los complementos que tienen problemas de compatibilidad con el tiempo de ejecución actual.
- **Diagnósticos de complementos**: expone cualquier advertencia o error en el tiempo de carga emitido por el registro de complementos.

### 11b) Tamaño del archivo de arranque

Doctor verifica si los archivos de arranque del espacio de trabajo (por ejemplo `AGENTS.md`, `CLAUDE.md` u otros archivos de contexto inyectados) están cerca o por encima del presupuesto de caracteres configurado. Informa los recuentos de caracteres brutos frente a los inyectados por archivo, el porcentaje de truncamiento, la causa del truncamiento (`max/file` o `max/total`) y el total de caracteres inyectados como fracción del presupuesto total. Cuando los archivos están truncados o cerca del límite, doctor imprime consejos para ajustar `agents.defaults.bootstrapMaxChars` y `agents.defaults.bootstrapTotalMaxChars`.

### 11c) Completado de Shell

Doctor verifica si el completado por tabulación está instalado para el shell actual (zsh, bash, fish o PowerShell):

- Si el perfil del shell usa un patrón de completado dinámico lento
  (`source <(openclaw completion ...)`), doctor lo actualiza a la variante
  de archivo en caché más rápida.
- Si el completado está configurado en el perfil pero falta el archivo de caché,
  doctor regenera la caché automáticamente.
- Si no hay ningún completado configurado, doctor ofrece instalarlo
  (solo modo interactivo; se omite con `--non-interactive`).

Ejecute `openclaw completion --write-state` para regenerar la caché manualmente.

### 12) Verificaciones de autenticación de la puerta de enlace (token local)

Doctor comprueba la preparación de la autenticación del token de la puerta de enlace local.

- Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
- Si `gateway.auth.token` está gestionado por SecretRef pero no está disponible, doctor avisa y no lo sobrescribe con texto sin formato.
- `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no se ha configurado ningún SecretRef de token.

### 12b) Reparaciones compatibles con SecretRef de solo lectura

Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de fallo rápido en tiempo de ejecución.

- `openclaw doctor --fix` ahora usa el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estado para reparaciones de configuración específicas.
- Ejemplo: la reparación de Telegram `allowFrom` / `groupAllowFrom` `@username` intenta usar las credenciales del bot configuradas cuando están disponibles.
- Si el token del bot de Telegram está configurado mediante SecretRef pero no está disponible en la ruta del comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de bloquearse o informar erróneamente que falta el token.

### 13) Verificación de estado de la puerta de enlace + reinicio

Doctor ejecuta una verificación de estado y ofrece reiniciar la puerta de enlace cuando parece
poco saludable.

### 13b) Preparación de la búsqueda de memoria

Doctor comprueba si el proveedor de incrustación de búsqueda de memoria configurado está listo
para el agente predeterminado. El comportamiento depende del backend y el proveedor configurados:

- **Backend QMD**: sondea si el binario `qmd` está disponible y se puede iniciar.
  Si no, imprime orientación de arreglo que incluye el paquete npm y una opción de ruta de binario manual.
- **Proveedor local explícito**: comprueba si hay un archivo de modelo local o una URL de modelo
  remota/descargable reconocida. Si falta, sugiere cambiar a un proveedor remoto.
- **Proveedor remoto explícito** (`openai`, `voyage`, etc.): verifica que una clave de API esté
  presente en el entorno o en el almacén de autenticación. Imprime sugerencias de reparación si falta.
- **Proveedor automático**: comprueba primero la disponibilidad del modelo local y luego intenta cada
  proveedor remoto en el orden de selección automática.

Cuando está disponible un resultado de sondeo de la puerta de enlace (la puerta de enlace estaba sana en el momento de la
verificación), doctor cruza su resultado con la configuración visible de la CLI y anota
cualquier discrepancia.

Use `openclaw memory status --deep` para verificar la preparación de incrustación (embedding) en tiempo de ejecución.

### 14) Advertencias de estado del canal

Si la puerta de enlace está sana, doctor ejecuta un sondeo del estado del canal e informa
advertencias con soluciones sugeridas.

### 15) Auditoría y reparación de la configuración del supervisor

Doctor verifica la configuración del supervisor instalado (launchd/systemd/schtasks) en busca de
valores predeterminados faltantes o obsoletos (por ejemplo, dependencias de red en línea de systemd y
retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede
reescribir el archivo de servicio/tarea a los valores predeterminados actuales.

Notas:

- `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
- `openclaw doctor --yes` acepta las sugerencias de reparación predeterminadas.
- `openclaw doctor --repair` aplica las correcciones recomendadas sin solicitar confirmación.
- `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
- Si la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, la instalación/reparación del servicio doctor valida el SecretRef pero no persiste los valores de token de texto plano resueltos en los metadatos del entorno del servicio del supervisor.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con orientación accionable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
- Para las unidades systemd de usuario de Linux, las comprobaciones de deriva del token de doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
- Siempre puede forzar una reescritura completa mediante `openclaw gateway install --force`.

### 16) Diagnósticos del tiempo de ejecución y puerto de la puerta de enlace

Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También verifica si hay colisiones de puerto en el puerto de la puerta de enlace (por defecto `18789`) e informa de las causas probables (la puerta de enlace ya se está ejecutando, túnel SSH).

### 17) Mejores prácticas del tiempo de ejecución de la puerta de enlace

Doctor advierte cuando el servicio de la puerta de enlace se ejecuta en Bun o en una ruta de Node con gestión de versiones (`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp y Telegram requieren Node, y las rutas de gestores de versiones pueden romperse después de las actualizaciones porque el servicio no carga su inicio de shell. Doctor ofrece migrar a una instalación del sistema Node cuando está disponible (Homebrew/apt/choco).

### 18) Escritura de configuración + metadatos del asistente

Doctor persiste cualquier cambio en la configuración y estampa los metadatos del asistente para registrar la ejecución del doctor.

### 19) Consejos del espacio de trabajo (copia de seguridad + sistema de memoria)

Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad si el espacio de trabajo aún no está bajo git.

Consulte [/concepts/agent-workspace](/en/concepts/agent-workspace) para obtener una guía completa sobre la estructura del espacio de trabajo y la copia de seguridad de git (se recomienda GitHub o GitLab privados).
