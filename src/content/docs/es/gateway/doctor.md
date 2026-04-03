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
- La migración del navegador busca configuraciones heredadas de la extensión de Chrome y la preparación para Chrome MCP.
- Advertencias de anulación del proveedor OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Verificación de requisitos previos de OAuth TLS para perfiles OAuth de OpenAI Codex.
- Migración de estado heredado en disco (sesiones/directorio del agente/auth de WhatsApp).
- Migración de clave de contrato de manifiesto de complemento heredada (`speechProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders` → `contracts`).
- Migración de almacenamiento cron heredado (`jobId`, `schedule.cron`, campos de nivel superior de entrega/carga útil, carga útil `provider`, trabajos de reserva de webhook simples `notify: true`).
- Inspección del archivo de bloqueo de sesión y limpieza de bloqueos obsoletos.
- Verificaciones de integridad y permisos del estado (sesiones, transcripciones, directorio de estado).
- Verificaciones de permisos del archivo de configuración (chmod 600) al ejecutarse localmente.
- Salud de autenticación del modelo: verifica la caducidad de OAuth, puede actualizar tokens que están por caducar e informa de estados de perfil de autenticación en período de espera/deshabilitados.
- Detección de directorio de espacio de trabajo adicional (`~/openclaw`).
- Reparación de la imagen de sandbox cuando el sandbox está habilitado.
- Migración de servicio heredado y detección de puerta de enlace adicional.
- Migración de estado heredado del canal Matrix (en modo `--fix` / `--repair`).
- Verificaciones de tiempo de ejecución de la puerta de enlace (servicio instalado pero no en ejecución; etiqueta launchd en caché).
- Advertencias de estado del canal (sondeadas desde la puerta de enlace en ejecución).
- Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
- Verificaciones de mejores prácticas de tiempo de ejecución de la puerta de enlace (Node frente a Bun, rutas del administrador de versiones).
- Diagnósticos de colisión de puertos de la puerta de enlace (puerto predeterminado `18789`).
- Advertencias de seguridad para políticas de MD abiertas.
- Verificaciones de autenticación de la puerta de enlace para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones de SecretRef de token).
- Verificación de persistencia de systemd en Linux.
- Verificación del tamaño del archivo de arranque del espacio de trabajo (advertencias de truncamiento/cerca del límite para archivos de contexto).
- Verificación del estado de finalización del shell e instalación/actualización automática.
- Verificación de preparación del proveedor de incrustación de búsqueda de memoria (modelo local, clave de API remota o binario QMD).
- Verificaciones de instalación de origen (desajuste del espacio de trabajo pnpm, activos de interfaz de usuario faltantes, binario tsx faltante).
- Escribe la configuración actualizada + los metadatos del asistente.

## Comportamiento detallado y fundamentos

### 0) Actualización opcional (instalaciones git)

Si esto es una copia de trabajo de git y doctor se ejecuta de forma interactiva, ofrece
actualizar (fetch/rebase/build) antes de ejecutar doctor.

### 1) Normalización de la configuración

Si la configuración contiene formas de valores heredados (por ejemplo `messages.ackReaction`
sin una anulación específica del canal), doctor las normaliza en el esquema
actual.

### 2) Migraciones de claves de configuración heredadas

Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden
que ejecute `openclaw doctor`.

Doctor hará lo siguiente:

- Explicará qué claves heredadas se encontraron.
- Mostrará la migración que aplicó.
- Reescribirá `~/.openclaw/openclaw.json` con el esquema actualizado.

Gateway también ejecuta automáticamente las migraciones de doctor al inicio cuando detecta un
formato de configuración heredado, por lo que las configuraciones obsoletas se reparan sin intervención manual.
Las migraciones de la tienda de trabajos de Cron son manejadas por `openclaw doctor --fix`.

Migraciones actuales:

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → `bindings` de nivel superior
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
- `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
- `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
- `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- Para los canales con `accounts` con nombre pero sin `accounts.default`, mueve los valores de canal de nivel superior de una sola cuenta con ámbito de cuenta a `channels.<channel>.accounts.default` cuando estén presentes
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (herramientas/elevated/exec/sandbox/subagentes)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- eliminar `browser.relayBindHost` (configuración de retransmisión de extensión heredada)

Las advertencias del Doctor también incluyen orientación predeterminada de la cuenta para canales multicuenta:

- Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, el Doctor advierte que el enrutamiento de reserva puede elegir una cuenta inesperada.
- Si `channels.<channel>.defaultAccount` está configurado con un ID de cuenta desconocido, el Doctor advierte y enumera los IDs de cuenta configurados.

### 2b) Invalidaciones de proveedor de OpenCode

Si has añadido `models.providers.opencode`, `opencode-zen` o `opencode-go`
manualmente, esto anula el catálogo integrado de OpenCode de `@mariozechner/pi-ai`.
Eso puede forzar a los modelos a usar la API incorrecta o anular los costos. El Doctor advierte para que
puedas eliminar la invalidación y restaurar el enrutamiento de API por modelo + los costos.

### 2c) Migración del navegador y preparación para Chrome MCP

Si la configuración de su navegador todavía apunta a la ruta eliminada de la extensión de Chrome, doctor la normaliza al modelo de conexión local actual de Chrome MCP:

- `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
- `browser.relayBindHost` se elimina

Doctor también audita la ruta local de Chrome MCP cuando utiliza el perfil `defaultProfile:
"user"` or a configured `existing-session`:

- verifica si Google Chrome está instalado en el mismo host para perfiles de
  autoconexión predeterminados
- verifica la versión de Chrome detectada y advierte cuando es inferior a Chrome 144
- le recuerda que habilite la depuración remota en la página de inspección del navegador (por
  ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`
  o `edge://inspect/#remote-debugging`)

Doctor no puede habilitar la configuración del lado de Chrome por usted. Chrome MCP local
todavía requiere:

- un navegador basado en Chromium 144+ en el host de puerta de enlace/nodo
- el navegador ejecutándose localmente
- depuración remota habilitada en ese navegador
- aprobar el primer mensaje de consentimiento de conexión en el navegador

Esta verificación **no** se aplica a Docker, sandbox, navegador remoto u otros
flujos sin cabeza. Esos continúan usando CDP sin procesar.

### 2d) Requisitos previos de OAuth TLS

Cuando se configura un perfil OAuth de OpenAI Codex, doctor sondea el punto final de autorización de OpenAI para verificar que la pila TLS local de Node/OpenSSL pueda validar la cadena de certificados. Si el sondeo falla con un error de certificado (por ejemplo `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificado caducado o certificado autofirmado), doctor imprime instrucciones de reparación específicas de la plataforma. En macOS con un Node de Homebrew, la solución suele ser `brew postinstall ca-certificates`. Con `--deep`, el sondeo se ejecuta incluso si la puerta de enlace está sana.

### 3) Migraciones de estado heredadas (diseño de disco)

Doctor puede migrar diseques en disco antiguos a la estructura actual:

- Almacenamiento de sesiones + transcripciones:
  - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
- Directorio del agente:
  - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
- Estado de autenticación de WhatsApp (Baileys):
  - de `~/.openclaw/credentials/*.json` heredado (excepto `oauth.json`)
  - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminado: `default`)

Estas migraciones son de mejor esfuerzo e idempotentes; el doctor emitirá advertencias cuando
deje carpetas heredadas como copias de seguridad. La Gateway/CLI también auto-migra
las sesiones heredadas y el directorio del agente al inicio para que el historial/autenticación/modelos aterricen en la
ruta por agente sin una ejecución manual del doctor. La autenticación de WhatsApp se migra intencionalmente solo
a través de `openclaw doctor`.

### 3a) Migraciones de manifiestos de plugins heredados

El doctor escanea todos los manifiestos de plugins instalados en busca de claves de capacidad de nivel superior obsoletas
(`speechProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`).
Cuando se encuentran, ofrece moverlas al objeto `contracts` y reescribir el archivo de manifiesto
in situ. Esta migración es idempotente; si la clave `contracts` ya tiene los
mismos valores, la clave heredada se elimina sin duplicar los datos.

### 3b) Migraciones de almacén de cron heredado

El doctor también verifica el almacén de trabajos de cron (`~/.openclaw/cron/jobs.json` por defecto,
o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el planificador aún
acepta por compatibilidad.

Las limpiezas de cron actuales incluyen:

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
- campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de entrega `provider` de carga útil → `delivery.channel` explícito
- trabajos de reserva de webhook `notify: true` heredados simples → `delivery.mode="webhook"` explícito con `delivery.to=cron.webhook`

El doctor solo auto-migra los trabajos `notify: true` cuando puede hacerlo sin
cambiar el comportamiento. Si un trabajo combina la reserva de notificación heredada con un modo de
entrega existente que no sea webhook, el doctor advierte y deja ese trabajo para revisión manual.

### 3c) Limpieza de bloqueos de sesión

Doctor escanea cada directorio de sesión del agente en busca de archivos de bloqueo de escritura obsoletos (stale) — archivos que quedan atrás cuando una sesión sale de manera anormal. Por cada archivo de bloqueo encontrado, informa: la ruta, PID, si el PID sigue vivo, la antigüedad del bloqueo y si se considera obsoleto (PID muerto o anterior a 30 minutos). En modo `--fix` / `--repair` elimina automáticamente los archivos de bloqueo obsoletos; de lo contrario, imprime una nota y le instruye para que vuelva a ejecutar con `--fix`.

### 4) Verificaciones de integridad del estado (persistencia de la sesión, enrutamiento y seguridad)

El directorio de estado es el tronco encefálico operativo. Si desaparece, pierde sesiones, credenciales, registros y configuración (a menos que tenga copias de seguridad en otro lugar).

Doctor verifica:

- **State dir missing (Directorio de estado faltante)**: advierte sobre una pérdida catastrófica del estado, solicita recrear el directorio y le recuerda que no puede recuperar los datos faltantes.
- **State dir permissions (Permisos del directorio de estado)**: verifica la capacidad de escritura; ofrece reparar los permisos (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
- **macOS cloud-synced state dir (Directorio de estado sincronizado en la nube en macOS)**: advierte cuando el estado se resuelve bajo iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta y carreras de bloqueo/sincronización.
- **Linux SD or eMMC state dir (Directorio de estado en SD o eMMC de Linux)**: advierte cuando el estado se resuelve en un origen de montaje `mmcblk*`, porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse más rápido bajo las escrituras de sesión y credenciales.
- **Session dirs missing (Directorios de sesión faltantes)**: se requiere `sessions/` y el directorio de almacenamiento de sesiones para persistir el historial y evitar fallos `ENOENT`.
- **Transcript mismatch (Discrepancia de transcripción)**: advierte cuando las entradas de sesión recientes tienen archivos de transcripción faltantes.
- **Main session “1-line JSONL” (Sesión principal “1 línea JSONL”)**: marca cuando la transcripción principal tiene solo una línea (el historial no se está acumulando).
- **Multiple state dirs (Múltiples directorios de estado)**: advierte cuando existen múltiples carpetas `~/.openclaw` en diferentes directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede dividirse entre instalaciones).
- **Remote mode reminder (Recordatorio de modo remoto)**: si `gateway.mode=remote`, doctor le recuerda que lo ejecute en el host remoto (el estado reside allí).
- **Permisos del archivo de configuración**: advierte si `~/.openclaw/openclaw.json` es
  legible por el grupo/mundo y ofrece ajustarlo a `600`.

### 5) Estado de autenticación del modelo (caducidad de OAuth)

Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están
por caducar/caducados y puede actualizarlos cuando sea seguro. Si el perfil de Anthropic Claude Code
está obsoleto, sugiere ejecutar `claude setup-token` (o pegar un token de configuración).
Los mensajes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive`
omite los intentos de actualización.

Doctor también informa sobre los perfiles de autenticación que están temporalmente inutilizables debido a:

- períodos de enfriamiento cortos (límites de velocidad/tiempos de espera/fallos de autenticación)
- inhabilitaciones más largas (fallos de facturación/crédito)

### 6) Validación del modelo de Hooks

Si `hooks.gmail.model` está establecido, doctor valida la referencia del modelo contra el
catálogo y la lista de permitidos (allowlist) y advierte cuando no se resuelva o no esté permitido.

### 7) Reparación de la imagen de sandbox

Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece compilar o
cambiar a nombres heredados si falta la imagen actual.

### 7b) Dependencias del tiempo de ejecución de complementos incluidos

Doctor verifica que las dependencias del tiempo de ejecución de los complementos incluidos (por ejemplo, los
paquetes del tiempo de ejecución del complemento de Discord) estén presentes en la raíz de instalación de OpenClaw.
Si falta alguno, doctor informa sobre los paquetes y los instala en
modo `openclaw doctor --fix` / `openclaw doctor --repair`.

### 8) Migraciones del servicio de puerta de enlace y sugerencias de limpieza

Doctor detecta servicios de puerta de enlace heredados (launchd/systemd/schtasks) y
ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto de puerta de enlace
actual. También puede buscar servicios adicionales similares a puertas de enlace e imprimir sugerencias de limpieza.
Los servicios de puerta de enlace de OpenClaw con nombre de perfil se consideran de primera clase y no
se marcan como "adicionales".

### 8b) Migración de la matriz de inicio (Startup Matrix)

Cuando una cuenta de canal de Matrix tiene una migración de estado heredada pendiente o accionable, doctor (en modo `--fix` / `--repair`) crea una instantánea previa a la migración y luego ejecuta los pasos de migración de mejor esfuerzo: migración de estado heredada de Matrix y preparación de estado cifrado heredado. Ambos pasos no son fatales; los errores se registran y el inicio continúa. En modo de solo lectura (`openclaw doctor` sin `--fix`) esta verificación se omite por completo.

### 9) Advertencias de seguridad

Doctor emite advertencias cuando un proveedor está abierto a MD sin una lista de permitidos, o cuando una política está configurada de forma peligrosa.

### 10) persistencia de systemd (Linux)

Si se ejecuta como un servicio de usuario de systemd, doctor asegura que la persistencia esté habilitada para que la puerta de enlace permanezca activa después de cerrar la sesión.

### 11) Estado del espacio de trabajo (habilidades, complementos y directorios heredados)

Doctor imprime un resumen del estado del espacio de trabajo para el agente predeterminado:

- **Estado de las habilidades**: cuenta las habilidades elegibles, con requisitos faltantes y bloqueadas por la lista de permitidos.
- **Directorios de espacio de trabajo heredados**: advierte cuando `~/openclaw` u otros directorios de espacio de trabajo heredados existen junto con el espacio de trabajo actual.
- **Estado de los complementos**: cuenta los complementos cargados/deshabilitados/con error; enumera los ID de complemento para cualquier error; informa las capacidades de los complementos del paquete.
- **Advertencias de compatibilidad de complementos**: marca los complementos que tienen problemas de compatibilidad con el tiempo de ejecución actual.
- **Diagnósticos de complementos**: expone cualquier advertencia o error en tiempo de carga emitido por el registro de complementos.

### 11b) Tamaño del archivo de arranque

Doctor verifica si los archivos de arranque del espacio de trabajo (por ejemplo `AGENTS.md`, `CLAUDE.md` u otros archivos de contexto inyectados) están cerca o por encima del presupuesto de caracteres configurado. Informa los recuentos de caracteres brutos frente a inyectados por archivo, el porcentaje de truncamiento, la causa del truncamiento (`max/file` o `max/total`) y el total de caracteres inyectados como fracción del presupuesto total. Cuando los archivos están truncados o cerca del límite, doctor imprime consejos para ajustar `agents.defaults.bootstrapMaxChars` y `agents.defaults.bootstrapTotalMaxChars`.

### 11c) Completado de shell

Doctor verifica si el completado por tabulación está instalado para el shell actual (zsh, bash, fish o PowerShell):

- Si el perfil del shell usa un patrón de completado dinámico lento
  (`source <(openclaw completion ...)`), doctor lo actualiza a la variante
  de archivo en caché más rápida.
- Si el completado está configurado en el perfil pero falta el archivo de caché,
  doctor regenera la caché automáticamente.
- Si no hay ningún completado configurado, doctor sugiere instalarlo
  (solo en modo interactivo; se omite con `--non-interactive`).

Ejecute `openclaw completion --write-state` para regenerar la caché manualmente.

### 12) Verificaciones de autenticación de Gateway (token local)

Doctor verifica la preparación de la autenticación mediante token local del gateway.

- Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
- Si `gateway.auth.token` está administrado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto sin formato.
- `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

### 12b) Reparaciones con reconocimiento de SecretRef de solo lectura

Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de falla rápida en tiempo de ejecución.

- `openclaw doctor --fix` ahora usa el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estado para reparaciones de configuración específicas.
- Ejemplo: la reparación de `allowFrom` / `groupAllowFrom` `@username` de Telegram intenta usar las credenciales del bot configuradas cuando están disponibles.
- Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta del comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de fallar o informar erróneamente que falta el token.

### 13) Verificación de estado del Gateway + reinicio

Doctor ejecuta una verificación de estado y ofrece reiniciar el gateway cuando parece
no saludable.

### 13b) Preparación de la búsqueda de memoria

Doctor verifica si el proveedor de incrustación (embedding) de búsqueda de memoria configurado está listo
para el agente predeterminado. El comportamiento depende del backend y el proveedor configurados:

- **Backend QMD**: comprueba si el binario `qmd` está disponible y se puede iniciar.
  Si no, imprime orientación de solución que incluye el paquete npm y una opción de ruta binaria manual.
- **Proveedor local explícito**: busca un archivo de modelo local o una URL de modelo
  remota/descargable reconocida. Si falta, sugiere cambiar a un proveedor remoto.
- **Proveedor remoto explícito** (`openai`, `voyage`, etc.): verifica que una clave de API
  esté presente en el entorno o en el almacén de autenticación. Imprime sugerencias de reparación accionables si falta.
- **Proveedor automático**: comprueba primero la disponibilidad del modelo local y luego intenta cada
  proveedor remoto en el orden de selección automática.

Cuando hay un resultado de sondeo de la puerta de enlace disponible (la puerta de enlace estaba sana en el momento de la
verificación), doctor compara su resultado con la configuración visible en la CLI y señala
cualquier discrepancia.

Use `openclaw memory status --deep` para verificar la preparación de los embeddings en tiempo de ejecución.

### 14) Advertencias del estado del canal

Si la puerta de enlace está sana, doctor ejecuta un sondeo del estado del canal e informa
advertencias con soluciones sugeridas.

### 15) Auditoría y reparación de la configuración del supervisor

Doctor verifica la configuración del supervisor instalada (launchd/systemd/schtasks) para detectar
valores predeterminados faltantes o obsoletos (por ejemplo, dependencias de red en línea de systemd y
retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede
reescribir el archivo/tarea de servicio a los valores predeterminados actuales.

Notas:

- `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
- `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
- `openclaw doctor --repair` aplica las soluciones recomendadas sin solicitar confirmación.
- `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
- Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación/reparación del servicio doctor valida el SecretRef pero no persiste los valores de token en texto plano resueltos en los metadatos del entorno del servicio del supervisor.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con orientación accionable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
- Para las unidades user-systemd de Linux, las comprobaciones de deriva de tokens de doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
- Siempre puede forzar una reescritura completa mediante `openclaw gateway install --force`.

### 16) Diagnóstico del tiempo de ejecución y puerto de la puerta de enlace

Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el
servicio está instalado pero no se está ejecutando realmente. También verifica colisiones de puertos
en el puerto de gateway (por defecto `18789`) e informa las causas probables (gateway ya
en ejecución, túnel SSH).

### 17) Mejores prácticas de tiempo de ejecución del Gateway

Doctor advierte cuando el servicio del gateway se ejecuta en Bun o en una ruta de Node gestionada por versiones
(`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp + Telegram requieren Node,
y las rutas de gestores de versiones pueden romperse después de las actualizaciones porque el servicio no
carga la inicialización de su shell. Doctor ofrece migrar a una instalación del sistema Node cuando
está disponible (Homebrew/apt/choco).

### 18) Escritura de configuración + metadatos del asistente

Doctor conserva cualquier cambio en la configuración y aplica los metadatos del asistente para registrar la
ejecución de doctor.

### 19) Consejos del espacio de trabajo (copia de seguridad + sistema de memoria)

Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad
si el espacio de trabajo aún no está bajo git.

Consulte [/concepts/agent-workspace](/en/concepts/agent-workspace) para obtener una guía completa sobre
la estructura del espacio de trabajo y la copia de seguridad con git (se recomienda GitHub o GitLab privados).
