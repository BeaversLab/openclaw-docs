---
summary: "Comando Doctor: comprobaciones de estado, migraciones de configuración y pasos de reparación"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` es la herramienta de reparación y migración para OpenClaw. Corrige el estado/configuración obsoleto, verifica el estado y proporciona pasos de reparación accionables.

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
- Hablar sobre la migración de la configuración desde los campos planos heredados `talk.*` a `talk.provider` + `talk.providers.<provider>`.
- La migración del navegador comprueba las configuraciones heredadas de la extensión de Chrome y la preparación de Chrome MCP.
- Advertencias de sobrescritura del proveedor de OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
- Advertencias de sombreado de OAuth de Codex (`models.providers.openai-codex`).
- Verificación de requisitos previos de OAuth TLS para perfiles OAuth de OpenAI Codex.
- Migración de estado heredado en disco (sesiones/directorio de agente/autenticación de WhatsApp).
- Migración de clave de contrato de manifiesto de complemento heredado (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
- Migración de tienda cron heredada (`jobId`, `schedule.cron`, campos de nivel superior de entrega/payload, payload `provider`, trabajos de reserva de webhook simples `notify: true`).
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
- Diagnósticos de colisión de puertos de Gateway (predeterminado `18789`).
- Advertencias de seguridad para políticas de MD abiertas.
- Verificaciones de autenticación de la puerta de enlace para el modo de token local (ofrece generación de token cuando no existe ninguna fuente de token; no sobrescribe las configuraciones de SecretRef de token).
- Verificación de persistencia de systemd en Linux.
- Verificación del tamaño del archivo de arranque del espacio de trabajo (advertencias de truncamiento/cerca del límite para archivos de contexto).
- Verificación del estado de finalización del shell e instalación/actualización automática.
- Verificación de disponibilidad del proveedor de incrustación de búsqueda de memoria (modelo local, clave de API remota o binario QMD).
- Verificaciones de instalación desde el código fuente (desajuste del espacio de trabajo pnpm, activos de la interfaz de usuario faltantes, binario tsx faltante).
- Escribe la configuración actualizada + los metadatos del asistente.

## Relleno y restablecimiento de la interfaz de usuario de Dreams

La escena Dreams de la interfaz de usuario de Control incluye las acciones **Backfill** (Relleno), **Reset** (Restablecer) y **Clear Grounded** (Limpiar Grounded) para el flujo de trabajo de soñar con conexión a tierra. Estas acciones utilizan métodos RPC de estilo doctor de puerta de enlace, pero **no** son parte de la reparación/migración de la CLI de `openclaw doctor`.

Lo que hacen:

- **Backfill** escanea los archivos históricos `memory/YYYY-MM-DD.md` en el espacio de trabajo activo, ejecuta el pase de diario REM con conexión a tierra y escribe entradas de relleno reversibles en `DREAMS.md`.
- **Reset** elimina solo aquellas entradas de diario de relleno marcadas de `DREAMS.md`.
- **Clear Grounded** elimina solo las entradas a corto plazo preparadas y solo conectadas que
  provienen de la reproducción histórica y aún no han acumulado recuerdo en vivo o
  soporte diario.

Lo que **no** hacen por sí mismos:

- no editan `MEMORY.md`
- no ejecutan migraciones completas de doctor
- no preparan automáticamente candidatos conectados en el almacén de promoción
  a corto plazo en vivo a menos que ejecute explícitamente primero la ruta de CLI preparada

Si desea que la reproducción histórica conectada influya en el carril de promoción
profunda normal, utilice el flujo de CLI en su lugar:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Eso prepara candidatos duraderos conectados en el almacén de soñación a corto plazo mientras
mantiene `DREAMS.md` como la superficie de revisión.

## Comportamiento detallado y justificación

### 0) Actualización opcional (instalaciones de git)

Si esto es una comprobación de git y doctor se está ejecutando de manera interactiva, ofrece
actualizar (fetch/rebase/build) antes de ejecutar doctor.

### 1) Normalización de configuración

Si la configuración contiene formas de valores heredados (por ejemplo, `messages.ackReaction`
sin una invalidación específica del canal), doctor las normaliza en el esquema
actual.

Eso incluye campos planos heredados de Talk. La configuración pública actual de Talk es
`talk.provider` + `talk.providers.<provider>`. Doctor reescribe las antiguas
formas `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` /
`talk.apiKey` en el mapa del proveedor.

### 2) Migraciones de claves de configuración heredadas

Cuando la configuración contiene claves en desuso, otros comandos se niegan a ejecutarse y le piden
que ejecute `openclaw doctor`.

Doctor hará lo siguiente:

- Explicar qué claves heredadas se encontraron.
- Mostrar la migración que aplicó.
- Reescribir `~/.openclaw/openclaw.json` con el esquema actualizado.

Gateway también ejecuta automáticamente las migraciones de doctor al inicio cuando detecta un
formato de configuración heredado, por lo que las configuraciones obsoletas se reparan sin intervención manual.
Las migraciones del almacén de trabajos de Cron son manejadas por `openclaw doctor --fix`.

Migraciones actuales:

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → nivel superior `bindings`
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
- Para canales con `accounts` con nombre pero con valores de canal de nivel superior de cuenta única persistentes, mueve esos valores con ámbito de cuenta a la cuenta promovida elegida para ese canal (`accounts.default` para la mayoría de los canales; Matrix puede conservar un objetivo con nombre/predeterminado coincidente existente)
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (herramientas/elevado/exec/sandbox/subagentes)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- eliminar `browser.relayBindHost` (configuración heredada de retransmisión de extensiones)

Las advertencias del Doctor también incluyen orientación predeterminada de la cuenta para canales multicuenta:

- Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, el Doctor advierte que el enrutamiento de reserva puede seleccionar una cuenta inesperada.
- Si `channels.<channel>.defaultAccount` está configurado con un ID de cuenta desconocido, el Doctor advierte y lista los IDs de cuenta configurados.

### 2b) Invalidaciones del proveedor OpenCode

Si ha añadido `models.providers.opencode`, `opencode-zen` o `opencode-go`
manualmente, anula el catálogo integrado de OpenCode de `@mariozechner/pi-ai`.
Esto puede forzar a los modelos a la API incorrecta o anular los costos. El Doctor advierte para que
pueda eliminar la anulación y restaurar el enrutamiento de API por modelo + los costos.

### 2c) Migración del navegador y preparación para Chrome MCP

Si su configuración del navegador todavía apunta a la ruta eliminada de la extensión de Chrome, el Doctor
la normaliza al modelo de conexión MCP de Chrome local actual del host:

- `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
- `browser.relayBindHost` se elimina

El Doctor también audita la ruta MCP de Chrome local del host cuando utiliza el perfil `defaultProfile:
"user"` or a configured `existing-session`:

- verifica si Google Chrome está instalado en el mismo host para perfiles
  de autoconexión predeterminados
- verifica la versión de Chrome detectada y advierte cuando está por debajo de Chrome 144
- te recuerda que habilites la depuración remota en la página de inspección del
  navegador (por ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging`
  o `edge://inspect/#remote-debugging`)

Doctor no puede habilitar la configuración del lado de Chrome por ti. El MCP de
Chrome local en el host aún requiere:

- un navegador basado en Chromium 144+ en el host de la puerta de enlace/nodo
- que el navegador se esté ejecutando localmente
- depuración remota habilitada en ese navegador
- aprobar el primer mensaje de consentimiento de conexión en el navegador

La preparación aquí se refiere solo a los requisitos previos de conexión local.
La sesión existente mantiene los límites de ruta actuales de Chrome MCP; las
rutas avanzadas como `responsebody`, exportación de PDF,
interceptación de descargas y acciones por lotes aún requieren un navegador
administrado o un perfil CDP sin procesar.

Esta verificación **no** se aplica a Docker, sandbox, navegador remoto u otros
flujos sin cabeza. Esos continúan usando CDP sin procesar.

### 2d) Requisitos previos de OAuth TLS

Cuando se configura un perfil OAuth de OpenAI Codex, doctor sondea el punto de
conexión de autorización de OpenAI para verificar que la pila TLS local de
Node/OpenSSL pueda validar la cadena de certificados. Si el sondeo falla con un
error de certificado (por ejemplo `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`,
certificado caducado o certificado autofirmado), doctor imprime instrucciones
de solución específicas de la plataforma. En macOS con un Homebrew Node, la
solución suele ser `brew postinstall ca-certificates`. Con `--deep`,
el sondeo se ejecuta incluso si la puerta de enlace está sana.

### 2c) Invalidaciones del proveedor OAuth de Codex

Si anteriormente agregaste configuraciones de transporte heredadas de OpenAI
bajo `models.providers.openai-codex`, pueden oscurecer la ruta del proveedor OAuth
de Codex integrada que las versiones más nuevas usan automáticamente. Doctor
advierte cuando ve esas configuraciones de transporte antiguas junto con OAuth
de Codex para que puedas eliminar o reescribir la invalidación de transporte
obsoleta y recuperar el comportamiento de enrutamiento/reserva integrado. Los
servidores proxy personalizados y las invalidaciones solo de encabezados aún
son compatibles y no activan esta advertencia.

### 3) Migraciones de estado heredadas (diseño de disco)

Doctor puede migrar diseques de disco antiguos a la estructura actual:

- Almacenamiento de sesiones + transcripciones:
  - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
- Directorio del agente:
  - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
- Estado de autenticación de WhatsApp (Baileys):
  - desde el `~/.openclaw/credentials/*.json` heredado (excepto `oauth.json`)
  - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminado: `default`)

Estas migraciones se realizan mejor esfuerzo y son idempotentes; doctor emitirá advertencias cuando
deje carpetas heredadas como copias de seguridad. El Gateway/CLI también migra automáticamente
las sesiones heredadas + el directorio del agente al inicio para que el historial/autenticación/modelos aterricen en la
ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo
a través de `openclaw doctor`. La normalización del proveedor/mapa de proveedores de Talk ahora
compara por igualdad estructural, por lo que las diferencias solo en el orden de las claves ya no activan
cambios repetidos sin operación `doctor --fix`.

### 3a) Migraciones de manifiesto de complemento heredado

Doctor escanea todos los manifiestos de complementos instalados en busca de claves de capacidades
de nivel superior obsoletas
(`speechProviders`, `realtimeTranscriptionProviders`,
`realtimeVoiceProviders`, `mediaUnderstandingProviders`,
`imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`,
`webSearchProviders`). Cuando se encuentran, ofrece moverlas al objeto `contracts`
y reescribir el archivo de manifiesto en el lugar. Esta migración es idempotente;
si la clave `contracts` ya tiene los mismos valores, la clave heredada se elimina
sin duplicar los datos.

### 3b) Migraciones de tienda cron heredada

Doctor también verifica el almacén de trabajos cron (`~/.openclaw/cron/jobs.json` de forma predeterminada,
o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el programador aún
acepta por compatibilidad.

Las limpiezas de cron actuales incluyen:

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
- campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- alias de entrega de payload `provider` → explícito `delivery.channel`
- trabajos de reserva de webhook antiguos simples `notify: true` → explícito `delivery.mode="webhook"` con `delivery.to=cron.webhook`

Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin cambiar el comportamiento. Si un trabajo combina la reserva de notificación antigua con un modo de entrega no webhook existente, doctor advierte y deja ese trabajo para su revisión manual.

### 3c) Limpieza de bloqueos de sesión

Doctor escanea cada directorio de sesión del agente en busca de archivos de bloqueo de escritura obsoletos — archivos que quedaron cuando una sesión salió anormalmente. Para cada archivo de bloqueo encontrado, reporta: la ruta, PID, si el PID todavía está vivo, la antigüedad del bloqueo y si se considera obsoleto (PID muerto o mayor a 30 minutos). En modo `--fix` / `--repair` elimina automáticamente los archivos de bloqueo obsoletos; de lo contrario, imprime una nota y te instruye a volver a ejecutar con `--fix`.

### 4) Verificaciones de integridad del estado (persistencia de sesión, enrutamiento y seguridad)

El directorio de estado es el tallo cerebral operativo. Si desaparece, pierdes sesiones, credenciales, registros y configuración (a menos que tengas copias de seguridad en otro lugar).

Doctor verifica:

- **Directorio de estado faltante**: advierte sobre la pérdida catastrófica de estado, solicita recrear el directorio y recuerda que no puede recuperar los datos faltantes.
- **Permisos del directorio de estado**: verifica la capacidad de escritura; ofrece reparar los permisos (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
- **Directorio de estado sincronizado en la nube en macOS**: advierte cuando el estado se resuelve bajo iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta y carreras de bloqueo/sincronización.
- **Directorio de estado SD o eMMC en Linux**: advierte cuando el estado se resuelve en una fuente de montaje `mmcblk*`, porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse más rápido bajo escrituras de sesión y credenciales.
- **Directorios de sesión faltantes**: `sessions/` y el directorio de almacenamiento de sesiones son necesarios para persistir el historial y evitar fallos `ENOENT`.
- **Discrepancia de transcripción**: advierte cuando las entradas de sesión recientes tienen archivos de transcripción faltantes.
- **Sesión principal "1-line JSONL"**: marca cuando la transcripción principal tiene solo una
  línea (el historial no se está acumulando).
- **Múltiples directorios de estado**: advierte cuando existen múltiples carpetas `~/.openclaw` en los
  directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede
  dividirse entre instalaciones).
- **Recordatorio de modo remoto**: si `gateway.mode=remote`, doctor le recuerda que lo ejecute
  en el host remoto (el estado reside allí).
- **Permisos del archivo de configuración**: advierte si `~/.openclaw/openclaw.json` es
  legible para el grupo/mundo y ofrece restringirlo a `600`.

### 5) Estado de autenticación del modelo (caducidad de OAuth)

Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están
por expirar/expirados y puede actualizarlos cuando sea seguro. Si el perfil
de OAuth/token de Anthropic está obsoleto, sugiere una clave de API de Anthropic o la
ruta del token de configuración de Anthropic.
Las solicitudes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive`
omite los intentos de actualización.

Cuando una actualización de OAuth falla permanentemente (por ejemplo `refresh_token_reused`,
`invalid_grant`, o un proveedor que le indica que vuelva a iniciar sesión), doctor informa
que se requiere volver a autenticarse e imprime el comando `openclaw models auth login --provider ...` exacto
que se debe ejecutar.

Doctor también informa sobre los perfiles de autenticación que están temporalmente inutilizables debido a:

- períodos de espera cortos (límites de tasa/tiempos de espera/fallos de autenticación)
- desactivaciones más largas (fallos de facturación/crédito)

### 6) Validación del modelo de Hooks

Si `hooks.gmail.model` está establecido, doctor valida la referencia del modelo contra el
catálogo y la lista de permitidos y advierte cuando no se pueda resolver o esté prohibido.

### 7) Reparación de la imagen de Sandbox

Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece compilar o
cambiar a nombres heredados si falta la imagen actual.

### 7b) Dependencias de runtime de plugins incluidos

Doctor verifica que las dependencias de runtime de los plugins incluidos (por ejemplo los
paquetes de runtime del plugin de Discord) estén presentes en la raíz de instalación de OpenClaw.
Si falta alguno, doctor informa los paquetes y los instala en
modo `openclaw doctor --fix` / `openclaw doctor --repair`.

### 8) Migraciones y sugerencias de limpieza del servicio Gateway

Doctor detecta los servicios de puerta de enlace heredados (launchd/systemd/schtasks) y
ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto de puerta de enlace
actual. También puede escanear servicios adicionales tipo puerta de enlace e imprimir sugerencias de limpieza.
Los servicios de puerta de enlace OpenClaw con nombre de perfil se consideran de primera clase y no se
marcan como "extra".

### 8b) Migración de la matriz de inicio (Startup Matrix)

Cuando una cuenta de canal Matrix tiene una migración de estado heredado pendiente o accionable,
doctor (en modo `--fix` / `--repair`) crea una instantánea de pre-migración y luego
ejecuta los pasos de mejor esfuerzo de migración: migración de estado Matrix heredada y preparación de
estado cifrado heredada. Ambos pasos no son fatales; los errores se registran y el
inicio continúa. En modo de solo lectura (`openclaw doctor` sin `--fix`) esta verificación
se omite por completo.

### 9) Advertencias de seguridad

Doctor emite advertencias cuando un proveedor está abierto a MDs sin una lista de permitidos, o
cuando una política está configurada de una manera peligrosa.

### 10) Persistencia de systemd (Linux)

Si se ejecuta como un servicio de usuario de systemd, doctor asegura que la persistencia esté habilitada para que la
puerta de enlace se mantenga activa después de cerrar la sesión.

### 11) Estado del espacio de trabajo (habilidades, complementos y directorios heredados)

Doctor imprime un resumen del estado del espacio de trabajo para el agente predeterminado:

- **Estado de las habilidades (Skills)**: cuenta las habilidades elegibles, con requisitos faltantes y bloqueadas por lista de permitidos.
- **Directorios heredados del espacio de trabajo**: advierte cuando `~/openclaw` u otros directorios heredados del espacio de trabajo
  existen junto con el espacio de trabajo actual.
- **Estado de los complementos (Plugins)**: cuenta los complementos cargados/desactivados/con error; lista los IDs de complemento para cualquier
  error; informa las capacidades de los complementos del paquete.
- **Advertencias de compatibilidad de complementos**: marca los complementos que tienen problemas de compatibilidad con
  el tiempo de ejecución actual.
- **Diagnósticos de complementos**: expone cualquier advertencia o error en tiempo de carga emitido por el
  registro de complementos.

### 11b) Tamaño del archivo de arranque (Bootstrap)

Doctor verifica si los archivos de arranque del espacio de trabajo (por ejemplo `AGENTS.md`,
`CLAUDE.md` u otros archivos de contexto inyectados) están cerca o por encima del presupuesto de caracteres configurado. Informa los recuentos de caracteres sin procesar frente a los inyectados por archivo, el porcentaje de truncamiento, la causa del truncamiento (`max/file` o `max/total`) y el total de caracteres inyectados como fracción del presupuesto total. Cuando los archivos están truncados o cerca del límite, doctor imprime consejos para ajustar `agents.defaults.bootstrapMaxChars`
y `agents.defaults.bootstrapTotalMaxChars`.

### 11c) Completado de Shell

Doctor verifica si el completado por tabulación está instalado para el shell actual
(zsh, bash, fish o PowerShell):

- Si el perfil del shell utiliza un patrón de completado dinámico lento
  (`source <(openclaw completion ...)`), doctor lo actualiza a la variante
  de archivo en caché más rápida.
- Si el completado está configurado en el perfil pero falta el archivo de caché,
  doctor regenera la caché automáticamente.
- Si no hay ningún completado configurado, doctor sugiere instalarlo
  (solo modo interactivo; se omite con `--non-interactive`).

Ejecute `openclaw completion --write-state` para regenerar la caché manualmente.

### 12) Verificaciones de autenticación de Gateway (token local)

Doctor verifica la preparación de autenticación del token de la puerta de enlace local.

- Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
- Si `gateway.auth.token` está administrado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto sin formato.
- `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

### 12b) Reparaciones con reconocimiento de SecretRef de solo lectura

Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de falla rápida en tiempo de ejecución.

- `openclaw doctor --fix` ahora utiliza el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estado para reparaciones de configuración específicas.
- Ejemplo: la reparación de `@username` de Telegram `allowFrom` / `groupAllowFrom` intenta utilizar las credenciales del bot configuradas cuando están disponibles.
- Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta del comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de fallar o informar erróneamente que falta el token.

### 13) Verificación de estado del gateway + reinicio

Doctor ejecuta una verificación de estado y ofrece reiniciar el gateway cuando parece
no estar sano.

### 13b) Disponibilidad de búsqueda de memoria

Doctor verifica si el proveedor de incrustación de búsqueda de memoria configurado está listo
para el agente predeterminado. El comportamiento depende del backend y el proveedor configurados:

- **Backend QMD**: sondea si el binario `qmd` está disponible y se puede iniciar.
  Si no es así, imprime orientación de corrección que incluye el paquete npm y una opción de ruta binaria manual.
- **Proveedor local explícito**: verifica si hay un archivo de modelo local o una URL de modelo
  remoto/descargable reconocida. Si falta, sugiere cambiar a un proveedor remoto.
- **Proveedor remoto explícito** (`openai`, `voyage`, etc.): verifica que una clave de API esté
  presente en el entorno o en el almacén de autenticación. Imprime sugerencias de corrección accionables si falta.
- **Proveedor automático**: primero verifica la disponibilidad del modelo local y luego prueba cada proveedor
  remoto en orden de selección automática.

Cuando hay disponible un resultado de sondeo del gateway (el gateway estaba sano en el momento de la
verificación), doctor coteja su resultado con la configuración visible en la CLI y señala
cualquier discrepancia.

Use `openclaw memory status --deep` para verificar la disponibilidad de incrustación en tiempo de ejecución.

### 14) Advertencias de estado del canal

Si el gateway está sano, doctor ejecuta un sondeo de estado del canal e informa
advertencias con correcciones sugeridas.

### 15) Auditoría y reparación de configuración del supervisor

Doctor verifica la configuración del supervisor instalada (launchd/systemd/schtasks) en busca de
valores predeterminados faltantes o desactualizados (p. ej., dependencias de systemd network-online y
retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede
reescribir el archivo/tarea de servicio con los valores predeterminados actuales.

Notas:

- `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
- `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
- `openclaw doctor --repair` aplica las correcciones recomendadas sin solicitar confirmación.
- `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
- Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación/reparación del servicio doctor valida el SecretRef pero no persiste los valores de token en texto plano resueltos en los metadatos del entorno del servicio supervisor.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con una guía accionable.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
- Para las unidades user-systemd de Linux, las comprobaciones de deriva de token de doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
- Siempre puede forzar una reescritura completa mediante `openclaw gateway install --force`.

### 16) Diagnósticos del tiempo de ejecución y puertos del Gateway

Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También comprueba colisiones de puertos en el puerto del gateway (por defecto `18789`) e informa de las causas probables (gateway ya ejecutándose, túnel SSH).

### 17) Mejores prácticas del tiempo de ejecución del Gateway

Doctor advierte cuando el servicio gateway se ejecuta en Bun o en una ruta de Node gestionada por versiones (`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp y Telegram requieren Node, y las rutas de gestores de versiones pueden romperse después de las actualizaciones porque el servicio no carga su shell init. Doctor ofrece migrar a una instalación de Node del sistema cuando está disponible (Homebrew/apt/choco).

### 18) Escritura de configuración + metadatos del asistente

Doctor persiste cualquier cambio de configuración y marca los metadatos del asistente para registrar la ejecución de doctor.

### 19) Consejos del espacio de trabajo (sistema de respaldo + memoria)

Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de respaldo si el espacio de trabajo aún no está bajo git.

Consulte [/concepts/agent-workspace](/en/concepts/agent-workspace) para obtener una guía completa sobre la estructura del espacio de trabajo y el respaldo en git (se recomienda GitHub o GitLab privados).
