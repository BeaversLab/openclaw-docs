---
summary: "Comando Doctor: comprobaciones de estado, migraciones de configuración y pasos de reparación"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` es la herramienta de reparación y migración para OpenClaw. Soluciona configuraciones o estados obsoletos, verifica el estado de salud y proporciona pasos de reparación accionables.

## Inicio rápido

```bash
openclaw doctor
```

### Modos sin interfaz gráfica y de automatización

<Tabs>
  <Tab title="--yes">
    ```bash
    openclaw doctor --yes
    ```

    Acepta los valores predeterminados sin solicitar confirmación (incluidos los pasos de reparación de reinicio/servicio/sandbox cuando sea aplicable).

  </Tab>
  <Tab title="--repair">
    ```bash
    openclaw doctor --repair
    ```

    Aplica las reparaciones recomendadas sin solicitar confirmación (reparaciones + reinicios donde sea seguro).

  </Tab>
  <Tab title="--repair --force">
    ```bash
    openclaw doctor --repair --force
    ```

    También aplica reparaciones agresivas (sobrescribe las configuraciones personalizadas del supervisor).

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    Se ejecuta sin solicitudes y solo aplica migraciones seguras (normalización de configuración + movimientos de estado en disco). Omite las acciones de reinicio/servicio/sandbox que requieren confirmación humana. Las migraciones de estado heredado se ejecutan automáticamente cuando se detectan.

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    Escanea los servicios del sistema en busca de instalaciones adicionales de la puerta de enlace (launchd/systemd/schtasks).

  </Tab>
</Tabs>

Si desea revisar los cambios antes de escribirlos, abra primero el archivo de configuración:

```bash
cat ~/.openclaw/openclaw.json
```

## Lo que hace (resumen)

<AccordionGroup>
  <Accordion title="Salud, interfaz de usuario y actualizaciones">
    - Actualización previa al vuelo opcional para instalaciones de git (solo interactivo).
    - Verificación de frescura del protocolo de la interfaz de usuario (reconstruye la Interfaz de Control cuando el esquema del protocolo es más reciente).
    - Verificación de estado + solicitud de reinicio.
    - Resumen del estado de las habilidades (elegibles/faltantes/bloqueadas) y estado de los complementos.
  </Accordion>
  <Accordion title="Configuración y migraciones">
    - Normalización de configuración para valores heredados.
    - Migración de la configuración de Talk desde campos planos heredados `talk.*` a `talk.provider` + `talk.providers.<provider>`.
    - Comprobaciones de migración del navegador para configuraciones heredadas de extensiones de Chrome y preparación de Chrome MCP.
    - Advertencias de anulación de proveedor de OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
    - Advertencias de sombra de OAuth de Codex (`models.providers.openai-codex`).
    - Comprobación de requisitos previos de TLS de OAuth para perfiles OAuth de OpenAI Codex.
    - Migración de estado en disco heredado (sesiones/directorio de agente/auth de WhatsApp).
    - Migración de clave de contrato de manifiesto de complemento heredado (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Migración de tienda cron heredada (`jobId`, `schedule.cron`, campos de nivel superior de entrega/payload, payload `provider`, trabajos de reserva de webhook simple `notify: true`).
    - Migración de política de tiempo de ejecución de agente heredada a `agents.defaults.agentRuntime` y `agents.list[].agentRuntime`.
  </Accordion>
  <Accordion title="Estado e integridad">
    - Inspección de archivos de bloqueo de sesión y limpieza de bloqueos obsoletos.
    - Reparación de transcripciones de sesión para ramas de reescritura de prompts duplicadas creadas por las versiones afectadas del 2026.4.24.
    - Comprobaciones de integridad y permisos de estado (sesiones, transcripciones, directorio de estado).
    - Comprobaciones de permisos de archivos de configuración (chmod 600) al ejecutarse localmente.
    - Estado de autenticación del modelo: comprueba la caducidad de OAuth, puede actualizar tokens que caducan e informa de estados de perfil de autenticación en período de enfriamiento/deshabilitados.
    - Detección de directorio de espacio de trabajo adicional (`~/openclaw`).
  </Accordion>
  <Accordion title="Gateway, servicios y supervisores">
    - Reparación de la imagen de sandbox cuando el sandbox está habilitado.
    - Migración de servicios heredados y detección de gateways adicionales.
    - Migración del estado heredado del canal Matrix (en modo `--fix` / `--repair`).
    - Verificaciones de tiempo de ejecución del gateway (servicio instalado pero no en ejecución; etiqueta launchd en caché).
    - Advertencias de estado del canal (sondeadas desde el gateway en ejecución).
    - Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
    - Limpieza del entorno de proxy integrado para servicios de gateway que capturaron valores de shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` durante la instalación o actualización.
    - Verificaciones de mejores prácticas de tiempo de ejecución del gateway (Node vs Bun, rutas del gestor de versiones).
    - Diagnósticos de colisión de puertos del gateway (predeterminado `18789`).
  </Accordion>
  <Accordion title="Autenticación, seguridad y emparejamiento">
    - Advertencias de seguridad para políticas de MD abiertas.
    - Verificaciones de autenticación del gateway para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones de SecretRef del token).
    - Detección de problemas de emparejamiento de dispositivos (solicitudes de primer emparejamiento pendientes, actualizaciones de rol/alcance pendientes, desviación obsoleta de la caché del token de dispositivo local y desviación de autenticación del registro emparejado).
  </Accordion>
  <Accordion title="Espacio de trabajo y shell">
    - Verificación de persistencia de systemd en Linux.
    - Verificación del tamaño del archivo de arranque del espacio de trabajo (advertencias de truncamiento/cerca del límite para archivos de contexto).
    - Verificación del estado de completación del shell y instalación/actualización automática.
    - Verificación de preparación del proveedor de incrustación de búsqueda de memoria (modelo local, clave de API remota o binario QMD).
    - Verificaciones de instalación desde el código fuente (discordancia del espacio de trabajo pnpm, activos de interfaz faltantes, binario tsx faltante).
    - Escribe la configuración actualizada + metadatos del asistente.
  </Accordion>
</AccordionGroup>

## Relleno y restablecimiento de la interfaz de usuario de Dreams

La escena Dreams de la interfaz de usuario de Control incluye las acciones **Backfill** (Relleno), **Reset** (Restablecer) y **Clear Grounded** (Limpiar Grounded) para el flujo de trabajo de soñación con grounding. Estas acciones utilizan métodos RPC de estilo doctor del gateway, pero **no** son parte de la reparación/migración de la CLI de `openclaw doctor`.

Lo que hacen:

- **Backfill** escanea archivos históricos de `memory/YYYY-MM-DD.md` en el espacio de trabajo activo, ejecuta el pase del diario REM fundamentado y escribe entradas de backfill reversibles en `DREAMS.md`.
- **Reset** elimina solo esas entradas de diario de backfill marcadas de `DREAMS.md`.
- **Clear Grounded** elimina solo las entradas a corto plazo preparadas y solo fundamentadas que provienen de la repetición histórica y aún no han acumulado recuerdo en vivo o soporte diario.

Lo que **no** hacen por sí mismos:

- no editan `MEMORY.md`
- no ejecutan migraciones completas de doctor
- no preparan automáticamente candidatos fundamentados en el almacén de promoción a corto plazo en vivo a menos que ejecute explícitamente primero la ruta de CLI preparada

Si desea que la repetición histórica fundamentada influya en el carril normal de promoción profunda, utilice el flujo de CLI en su lugar:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Eso prepara candidatos duraderos fundamentados en el almacén de soñación a corto plazo mientras mantiene `DREAMS.md` como la superficie de revisión.

## Comportamiento detallado y justificación

<AccordionGroup>
  <Accordion title="0. Actualización opcional (instalaciones git)">
    Si esta es una extracción de git y doctor se está ejecutando de manera interactiva, ofrece actualizar (fetch/rebase/build) antes de ejecutar doctor.
  </Accordion>
  <Accordion title="1. Normalización de configuración">
    Si la configuración contiene formas de valores heredados (por ejemplo `messages.ackReaction` sin una anulación específica del canal), doctor los normaliza al esquema actual.

    Eso incluye campos planos heredados de Talk. La configuración pública actual de Talk es `talk.provider` + `talk.providers.<provider>`. Doctor reescribe las formas antiguas de `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` en el mapa de proveedores.

  </Accordion>
  <Accordion title="2. Migraciones de claves de configuración heredadas">
    Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden que ejecute `openclaw doctor`.

    El Doctor hará lo siguiente:

    - Explicará qué claves heredadas se encontraron.
    - Mostrará la migración que aplicó.
    - Reescribirá `~/.openclaw/openclaw.json` con el esquema actualizado.

    El Gateway también ejecuta automáticamente las migraciones del doctor al iniciar cuando detecta un formato de configuración heredado, por lo que las configuraciones obsoletas se reparan sin intervención manual. Las migraciones del almacén de trabajos cron son manejadas por `openclaw doctor --fix`.

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
    - `messages.tts.provider: "edge"` y `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` y `messages.tts.providers.microsoft`
    - `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` y `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` y `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - Para canales con `accounts` con nombre pero con valores de canal de nivel superior de una sola cuenta persistentes, mueva esos valores con ámbito de cuenta a la cuenta promovida elegida para ese canal (`accounts.default` para la mayoría de los canales; Matrix puede conservar un destino nombrado/predeterminado coincidente existente)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (herramientas/elevadas/exec/sandbox/subagentes)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - eliminar `agents.defaults.llm`; use `models.providers.<id>.timeoutSeconds` para tiempos de espera lentos de proveedor/modelo
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - eliminar `browser.relayBindHost` (configuración heredada de relé de extensión)
    - `models.providers.*.api: "openai"` heredado → `"openai-completions"` (el inicio del Gateway también omite los proveedores cuyo `api` está configurado en un valor de enumeración futuro o desconocido en lugar de fallar de forma cerrada)

    Las advertencias del Doctor también incluyen orientación predeterminada de la cuenta para canales multicuenta:

    - Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, el doctor advierte que el enrutamiento de respaldo puede elegir una cuenta inesperada.
    - Si `channels.<channel>.defaultAccount` está configurado en un ID de cuenta desconocido, el doctor advierte y enumera los IDs de cuenta configurados.

  </Accordion>
  <Accordion title="2b. Invalidaciones del proveedor de OpenCode">
    Si ha añadido `models.providers.opencode`, `opencode-zen` o `opencode-go` manualmente, esto anula el catálogo integrado de OpenCode de `@mariozechner/pi-ai`. Esto puede forzar a los modelos a usar la API incorrecta o anular los costes. Doctor le advierte para que pueda eliminar la invalidación y restaurar el enrutamiento de la API y los costes por modelo.
  </Accordion>
  <Accordion title="2c. Migración del navegador y preparación para Chrome MCP">
    Si su configuración del navegador aún apunta a la ruta de la extensión de Chrome eliminada, doctor la normaliza al modelo de conexión de Chrome MCP local actual del host:

    - `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
    - `browser.relayBindHost` se elimina

    Doctor también audita la ruta de Chrome MCP local del host cuando utiliza `defaultProfile: "user"` o un perfil `existing-session` configurado:

    - comprueba si Google Chrome está instalado en el mismo host para los perfiles de conexión automática predeterminados
    - comprueba la versión de Chrome detectada y advierte cuando es inferior a Chrome 144
    - le recuerda que habilite la depuración remota en la página de inspección del navegador (por ejemplo, `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging` o `edge://inspect/#remote-debugging`)

    Doctor no puede habilitar la configuración del lado de Chrome por usted. Chrome MCP local del host aún requiere:

    - un navegador basado en Chromium 144+ en el host de puerta de enlace/nodo
    - que el navegador se esté ejecutando localmente
    - depuración remota habilitada en ese navegador
    - aprobar el primer aviso de consentimiento de conexión en el navegador

    La preparación aquí se refiere solo a los requisitos previos de conexión local. La sesión existente mantiene los límites de ruta actuales de Chrome MCP; las rutas avanzadas como `responsebody`, exportación de PDF, intercepción de descargas y acciones por lotes aún requieren un navegador administrado o un perfil CDP sin formato.

    Esta comprobación **no** se aplica a Docker, sandbox, navegador remoto u otros flujos sin cabeza. Esos continúan usando CDP sin formato.

  </Accordion>
  <Accordion title="2d. Requisitos previos de OAuth TLS">
    Cuando se configura un perfil OAuth de OpenAI Codex, el doctor sondea el punto de conexión de autorización de OpenAI para verificar que la pila TLS local de Node/OpenSSL pueda validar la cadena de certificados. Si el sondeo falla con un error de certificado (por ejemplo `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificado caducado o certificado autofirmado), el doctor imprime instrucciones de corrección específicas de la plataforma. En macOS con un Node de Homebrew, la corrección suele ser `brew postinstall ca-certificates`. Con `--deep`, el sondeo se ejecuta incluso si la puerta de enlace está sana.
  </Accordion>
  <Accordion title="2e. Invalidaciones del proveedor OAuth de Codex">
    Si anteriormente añadió configuraciones de transporte heredadas de OpenAI bajo `models.providers.openai-codex`, pueden ocultar la ruta del proveedor OAuth de Codex integrada que las versiones más nuevas usan automáticamente. El doctor advierte cuando ve esas configuraciones de transporte antiguas junto con OAuth de Codex para que pueda eliminar o reescribir la invalidación de transporte obsoleta y recuperar el comportamiento de enrutamiento/alternativa integrado. Los proxies personalizados y las invalidaciones solo de encabezado siguen siendo compatibles y no activan esta advertencia.
  </Accordion>
  <Accordion title="2f. Advertencias de ruta del complemento Codex">
    Cuando el complemento Codex incluido está habilitado, doctor también verifica si las referencias del modelo primario `openai-codex/*` aún se resuelven a través del ejecutor PI predeterminado. Esa combinación es válida cuando deseas la autenticación OAuth/suscripción de Codex a través de PI, pero es fácil confundirla con el arnés del servidor de aplicaciones (app-server) nativo de Codex. Doctor advierte y señala la forma explícita del servidor de aplicaciones: `openai/*` más `agentRuntime.id: "codex"` o `OPENCLAW_AGENT_RUNTIME=codex`.

    Doctor no repara esto automáticamente porque ambas rutas son válidas:

    - `openai-codex/*` + PI significa "usar la autenticación OAuth/suscripción de Codex a través del ejecutor normal de OpenClaw."
    - `openai/*` + `runtime: "codex"` significa "ejecutar el turno integrado a través del servidor de aplicaciones nativo de Codex."
    - `/codex ...` significa "controlar o vincular una conversación nativa de Codex desde el chat."
    - `/acp ...` o `runtime: "acp"` significa "usar el adaptador ACP/acpx externo."

    Si aparece la advertencia, elige la ruta que pretendías y edita la configuración manualmente. Mantén la advertencia tal como está cuando el OAuth de Codex a través de PI es intencional.

  </Accordion>
  <Accordion title="3. Migraciones de estado heredado (diseño de disco)">
    Doctor puede migrar diseños en disco antiguos a la estructura actual:

    - Almacén de sesiones + transcripciones:
      - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
    - Directorio del agente:
      - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
    - Estado de autenticación de WhatsApp (Baileys):
      - de `~/.openclaw/credentials/*.json` heredado (excepto `oauth.json`)
      - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminado: `default`)

    Estas migraciones se realizan con el mejor esfuerzo y son idempotentes; doctor emitirá advertencias cuando deje carpetas heredadas como copias de seguridad. Gateway/CLI también migra automáticamente las sesiones heredadas + el directorio del agente al iniciarse para que el historial/autenticación/modelos aterricen en la ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo a través de `openclaw doctor`. La normalización del proveedor/mapa de proveedores de Talk ahora compara por igualdad estructural, por lo que las diferencias solo en el orden de las claves ya no desencadenan cambios repetidos sin operación `doctor --fix`.

  </Accordion>
  <Accordion title="3a. Migraciones de manifiesto de complementos heredados">
    Doctor escanea todos los manifiestos de complementos instalados en busca de claves de capacidades de nivel superior obsoletas (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Cuando se encuentran, ofrece moverlas al objeto `contracts` y reescribir el archivo de manifiesto en su lugar. Esta migración es idempotente; si la clave `contracts` ya tiene los mismos valores, la clave heredada se elimina sin duplicar los datos.
  </Accordion>
  <Accordion title="3b. Migraciones del almacén de cron heredado">
    Doctor también verifica el almacén de trabajos cron (`~/.openclaw/cron/jobs.json` de forma predeterminada, o `cron.store` cuando se anula) en busca de formas de trabajos antiguas que el planificador aún acepta por compatibilidad.

    Las limpiezas de cron actuales incluyen:

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - campos de payload de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
    - campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - alias de entrega `provider` del payload → `delivery.channel` explícita
    - trabajos simples de respaldo de webhook `notify: true` heredados → `delivery.mode="webhook"` explícita con `delivery.to=cron.webhook`

    Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin cambiar el comportamiento. Si un trabajo combina el respaldo de notificación heredado con un modo de entrega que no sea un webhook existente, doctor avisa y deja ese trabajo para su revisión manual.

  </Accordion>
  <Accordion title="3c. Limpieza de bloqueos de sesión">
    Doctor escanea cada directorio de sesión del agente en busca de archivos de bloqueo de escritura obsoletos (archivos que quedaron cuando una sesión salió de manera anormal). Para cada archivo de bloqueo encontrado, informa: la ruta, el PID, si el PID aún está vivo, la antigüedad del bloqueo y si se considera obsoleto (PID muerto o anterior a 30 minutos). En el modo `--fix` / `--repair`, elimina automáticamente los archivos de bloqueo obsoletos; de lo contrario, imprime una nota y le instruye a volver a ejecutar con `--fix`.
  </Accordion>
  <Accordion title="3d. Reparación de la rama de la transcripción de la sesión">
    Doctor escanea los archivos JSONL de sesión del agente en busca de la forma de rama duplicada creada por el error de reescritura de la transcripción del prompt del 24.4.2026: un turno de usuario abandonado con el contexto de tiempo de ejecución interno de OpenClaw más un hermano activo que contiene el mismo prompt visible del usuario. En el modo `--fix` / `--repair`, doctor hace una copia de seguridad de cada archivo afectado junto al original y reescribe la transcripción a la rama activa para que el historial de la puerta de enlace y los lectores de memoria ya no vean turnos duplicados.
  </Accordion>
  <Accordion title="4. Verificaciones de integridad del estado (persistencia de sesión, enrutamiento y seguridad)">
    El directorio de estado es el tronco encefálico operativo. Si desaparece, pierdes las sesiones, las credenciales, los registros y la configuración (a menos que tengas copias de seguridad en otro lugar).

    Doctor verifica:

    - **Directorio de estado faltante**: advierte sobre una pérdida catastrófica del estado, solicita recrear el directorio y recuerda que no puede recuperar los datos faltantes.
    - **Permisos del directorio de estado**: verifica la capacidad de escritura; ofrece reparar los permisos (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
    - **Directorio de estado sincronizado en la nube en macOS**: advierte cuando el estado se resuelve bajo iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta y carreras de bloqueo/sincronización.
    - **Directorio de estado en SD o eMMC de Linux**: advierte cuando el estado se resuelve en una fuente de montaje `mmcblk*`, porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse más rápido bajo las escrituras de sesión y credenciales.
    - **Directorios de sesión faltantes**: `sessions/` y el directorio de almacenamiento de sesiones son necesarios para persistir el historial y evitar fallos `ENOENT`.
    - **Discrepancia de transcripción**: advierte cuando las entradas de sesión recientes tienen archivos de transcripción faltantes.
    - **"JSONL de 1 línea" de la sesión principal**: marca cuando la transcripción principal tiene solo una línea (el historial no se está acumulando).
    - **Múltiples directorios de estado**: advierte cuando existen múltiples carpetas `~/.openclaw` en los directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede dividirse entre instalaciones).
    - **Recordatorio de modo remoto**: si `gateway.mode=remote`, doctor te recuerda que lo ejecutes en el host remoto (el estado reside allí).
    - **Permisos del archivo de configuración**: advierte si `~/.openclaw/openclaw.json` es legible por el grupo/mundo y ofrece restringirlo a `600`.

  </Accordion>
  <Accordion title="5. Estado de autenticación del modelo (caducidad de OAuth)">
    Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están a punto de caducar o caducados, y puede actualizarlos cuando es seguro. Si el perfil de OAuth/token de Anthropic está obsoleto, sugiere una clave de API de Anthropic o la ruta del token de configuración de Anthropic. Las solicitudes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive` omite los intentos de actualización.

    Cuando una actualización de OAuth falla permanentemente (por ejemplo `refresh_token_reused`, `invalid_grant`, o un proveedor que le indica que inicie sesión nuevamente), doctor informa que se requiere volver a autenticarse e imprime el comando exacto `openclaw models auth login --provider ...` para ejecutar.

    Doctor también informa sobre los perfiles de autenticación que están temporalmente inutilizables debido a:

    - enfriamientos cortos (límites de tasa/tiempos de espera/fallos de autenticación)
    - desactivaciones más largas (fallos de facturación/crédito)

  </Accordion>
  <Accordion title="6. Validación del modelo de Hooks">
    Si `hooks.gmail.model` está configurado, doctor valida la referencia del modelo contra el catálogo y la lista de permitidos (allowlist) y advierte cuando no se pueda resolver o no esté permitido.
  </Accordion>
  <Accordion title="7. Reparación de la imagen de Sandbox">
    Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece construir o cambiar a nombres heredados si falta la imagen actual.
  </Accordion>
  <Accordion title="7b. Dependencias de tiempo de ejecución del complemento incluido">
    Doctor verifica las dependencias de tiempo de ejecución solo para los complementos incluidos que están activos en la configuración actual o habilitados por su valor predeterminado de manifiesto incluido, por ejemplo `plugins.entries.discord.enabled: true`, `channels.discord.enabled: true` heredado o un proveedor incluido habilitado de forma predeterminada. Si falta alguno, doctor informa los paquetes y los instala en modo `openclaw doctor --fix` / `openclaw doctor --repair`. Los complementos externos todavía usan `openclaw plugins install` / `openclaw plugins update`; doctor no instala dependencias para rutas de complementos arbitrarias.

    Durante la reparación de doctor, las instalaciones de npm de dependencias de tiempo de ejecución incluidas informan el progreso del indicador de actividad en sesiones TTY y el progreso de línea periódico en la salida redirigida/sin cabeza. La puerta de enlace (Gateway) y la CLI local también pueden reparar bajo demanda las dependencias de tiempo de ejecución de complementos incluidos activos antes de importar un complemento incluido. Estas instalaciones tienen como ámbito la raíz de instalación del tiempo de ejecución del complemento, se ejecutan con los scripts deshabilitados, no escriben un bloqueo de paquete (package lock) y están protegidas por un bloqueo de raíz de instalación para que los inicios simultáneos de la CLI o la puerta de enlace no modifiquen el mismo árbol `node_modules` al mismo tiempo.

  </Accordion>
  <Accordion title="8. Migraciones de servicios de puerta de enlace y sugerencias de limpieza">
    Doctor detecta los servicios de puerta de enlace heredados (launchd/systemd/schtasks) y ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto de puerta de enlace actual. También puede buscar servicios adicionales similares a una puerta de enlace e imprimir sugerencias de limpieza. Los servicios de puerta de enlace de OpenClaw con nombre de perfil se consideran de primera clase y no se marcan como "adicionales".

    En Linux, si falta el servicio de puerta de enlace de nivel de usuario pero existe un servicio de puerta de enlace de OpenClaw de nivel de sistema, doctor no instala automáticamente un segundo servicio de nivel de usuario. Inspeccione con `openclaw gateway status --deep` o `openclaw doctor --deep`, luego elimine el duplicado o configure `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando un supervisor del sistema sea el propietario del ciclo de vida de la puerta de enlace.

  </Accordion>
  <Accordion title="8b. Migración de Matrix al inicio">
    Cuando una cuenta de canal de Matrix tiene una migración de estado heredada pendiente o accionable, doctor (en modo `--fix` / `--repair`) crea una instantánea previa a la migración y luego ejecuta los pasos de migración de mejor esfuerzo: migración de estado heredado de Matrix y preparación de estado cifrado heredado. Ambos pasos no son fatales; los errores se registran y el inicio continúa. En modo de solo lectura (`openclaw doctor` sin `--fix`) esta verificación se omite por completo.
  </Accordion>
  <Accordion title="8c. Emparejamiento de dispositivos y deriva de autenticación">
    Doctor ahora inspecciona el estado de emparejamiento de dispositivos como parte del pase de salud normal.

    Lo que reporta:

    - solicitudes de emparejamiento por primera vez pendientes
    - actualizaciones de rol pendientes para dispositivos ya emparejados
    - actualizaciones de alcance (scope) pendientes para dispositivos ya emparejados
    - reparaciones de discordancia de claves públicas donde el ID del dispositivo aún coincide pero la identidad del dispositivo ya no coincide con el registro aprobado
    - registros emparejados que carecen de un token activo para un rol aprobado
    - tokens emparejados cuyos alcances derivan fuera de la línea base de emparejamiento aprobada
    - entradas locales de tokens de dispositivo en caché para la máquina actual que son anteriores a una rotación de tokens del lado de la puerta de enlace o que llevan metadatos de alcance obsoletos

    Doctor no aprueba automáticamente las solicitudes de emparejamiento ni rota automáticamente los tokens de dispositivo. En su lugar, imprime los siguientes pasos exactos:

    - inspeccionar solicitudes pendientes con `openclaw devices list`
    - aprobar la solicitud exacta con `openclaw devices approve <requestId>`
    - rotar un token nuevo con `openclaw devices rotate --device <deviceId> --role <role>`
    - eliminar y volver a aprobar un registro obsoleto con `openclaw devices remove <deviceId>`

    Esto cierra el agujero común de "ya emparejado pero aún se requiere emparejamiento": doctor ahora distingue el emparejamiento por primera vez de las actualizaciones de rol/alcance pendientes y de la deriva de tokens obsoletos/identidad de dispositivo.

  </Accordion>
  <Accordion title="9. Advertencias de seguridad">
    Doctor emite advertencias cuando un proveedor está abierto a MDs sin una lista de permitidos, o cuando una política está configurada de manera peligrosa.
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    Si se ejecuta como un servicio de usuario de systemd, doctor asegura que el "lingering" esté habilitado para que la puerta de enlace se mantenga activa después de cerrar la sesión.
  </Accordion>
  <Accordion title="11. Estado del espacio de trabajo (habilidades, complementos y directorios heredados)">
    Doctor imprime un resumen del estado del espacio de trabajo para el agente predeterminado:

    - **Estado de las habilidades (Skills)**: cuenta las habilidades elegibles, con requisitos faltantes y bloqueadas por la lista de permitidos.
    - **Directorios de espacio de trabajo heredados**: advierte cuando `~/openclaw` u otros directorios de espacio de trabajo heredados existen junto con el espacio de trabajo actual.
    - **Estado de los complementos (Plugins)**: cuenta los complementos habilitados/deshabilitados/con error; lista los ID de complemento para cualquier error; informa las capacidades del paquete de complementos.
    - **Advertencias de compatibilidad de complementos**: marca los complementos que tienen problemas de compatibilidad con el tiempo de ejecución actual.
    - **Diagnósticos de complementos**: expone cualquier advertencia o error de tiempo de carga emitido por el registro de complementos.

  </Accordion>
  <Accordion title="11b. Tamaño del archivo de arranque (bootstrap)">
    Doctor verifica si los archivos de arranque del espacio de trabajo (por ejemplo `AGENTS.md`, `CLAUDE.md` u otros archivos de contexto inyectados) están cerca o por encima del presupuesto de caracteres configurado. Informa los recuentos de caracteres sin procesar frente a los inyectados por archivo, el porcentaje de truncamiento, la causa del truncamiento (`max/file` o `max/total`) y el total de caracteres inyectados como una fracción del presupuesto total. Cuando los archivos están truncados o cerca del límite, doctor imprime consejos para ajustar `agents.defaults.bootstrapMaxChars` y `agents.defaults.bootstrapTotalMaxChars`.
  </Accordion>
  <Accordion title="11d. Limpieza de complementos de canales obsoletos">
    Cuando `openclaw doctor --fix` elimina un complemento de canal faltante, también elimina la configuración de ámbito de canal huérfana que hacía referencia a ese complemento: entradas `channels.<id>`, objetivos de latido que nombraban al canal y anulaciones `agents.*.models["<channel>/*"]`. Esto evita bucles de arranque de Gateway donde el tiempo de ejecución del canal ha desaparecido pero la configuración todavía le pide a la puerta de enlace que se enlace a él.
  </Accordion>
  <Accordion title="11c. Completación de shell">
    Doctor verifica si la completación con tabulador está instalada para el shell actual (zsh, bash, fish o PowerShell):

    - Si el perfil del shell usa un patrón de completación dinámica lento (`source <(openclaw completion ...)`), doctor lo actualiza a la variante de archivo en caché más rápida.
    - Si la completación está configurada en el perfil pero falta el archivo de caché, doctor regenera la caché automáticamente.
    - Si no hay ninguna completación configurada, doctor sugiere instalarla (solo en modo interactivo; se omite con `--non-interactive`).

    Ejecute `openclaw completion --write-state` para regenerar la caché manualmente.

  </Accordion>
  <Accordion title="12. Verificaciones de autenticación de Gateway (token local)">
    Doctor verifica la preparación de autenticación del token local de la puerta de enlace.

    - Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
    - Si `gateway.auth.token` está gestionado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto sin formato.
    - `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

  </Accordion>
  <Accordion title="12b. Reparaciones con conocimiento de SecretRef de solo lectura">
    Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de falla rápida en tiempo de ejecución.

    - `openclaw doctor --fix` ahora usa el mismo modelo de resumen de SecretRef de solo lectura que los comandos de familia de estado para reparaciones de configuración específicas.
    - Ejemplo: la reparación de Telegram `allowFrom` / `groupAllowFrom` `@username` intenta usar las credenciales del bot configuradas cuando están disponibles.
    - Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta del comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de fallar o informar erróneamente que falta el token.

  </Accordion>
  <Accordion title="13. Verificación de estado de Gateway + reinicio">
    Doctor ejecuta una verificación de estado y ofrece reiniciar la puerta de enlace cuando parece no estar sana.
  </Accordion>
  <Accordion title="13b. Estado de preparación de la búsqueda en memoria">
    Doctor comprueba si el proveedor de incrustaciones (embeddings) de búsqueda en memoria configurado está listo para el agente predeterminado. El comportamiento depende del backend y del proveedor configurados:

    - **Backend QMD**: sondea si el binario `qmd` está disponible y se puede iniciar. Si no es así, imprime orientación de corrección que incluye el paquete npm y una opción de ruta binaria manual.
    - **Proveedor local explícito**: comprueba si hay un archivo de modelo local o una URL de modelo remota/descargable reconocida. Si falta, sugiere cambiar a un proveedor remoto.
    - **Proveedor remoto explícito** (`openai`, `voyage`, etc.): verifica que haya una clave API presente en el entorno o en el almacén de autenticación. Imprime sugerencias de corrección accionables si falta.
    - **Proveedor automático**: comprueba primero la disponibilidad del modelo local y luego intenta cada proveedor remoto en orden de selección automática.

    Cuando hay un resultado de sondeo de puerta de enlace (gateway) en caché disponible (la puerta de enlace estaba sana en el momento de la comprobación), doctor contrasta su resultado con la configuración visible en la CLI y señala cualquier discrepancia. Doctor no inicia un nuevo ping de incrustación en la ruta predeterminada; use el comando de estado profundo de memoria cuando desee una comprobación en vivo del proveedor.

    Use `openclaw memory status --deep` para verificar la preparación de las incrustaciones en tiempo de ejecución.

  </Accordion>
  <Accordion title="14. Advertencias de estado del canal">
    Si la puerta de enlace está sana, doctor ejecuta un sondeo de estado del canal e informa de advertencias con correcciones sugeridas.
  </Accordion>
  <Accordion title="15. Auditoría y reparación de la configuración del supervisor">
    Doctor verifica la configuración del supervisor instalada (launchd/systemd/schtasks) en busca de valores predeterminados faltantes o desactualizados (por ejemplo, dependencias de red systemd en línea y retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede reescribir el archivo de servicio/tarea a los valores predeterminados actuales.

    Notas:

    - `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
    - `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
    - `openclaw doctor --repair` aplica las soluciones recomendadas sin solicitar confirmación.
    - `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` mantiene doctor en modo de solo lectura para el ciclo de vida del servicio de puerta de enlace. Sigue informando sobre el estado del servicio y ejecuta reparaciones que no son del servicio, pero omite la instalación, el inicio, el reinicio, el arranque, la reescritura de la configuración del supervisor y la limpieza de servicios heredados porque un supervisor externo posee ese ciclo de vida.
    - Si la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, la instalación/reparación del servicio doctor valida el SecretRef pero no persiste los valores de token de texto sin formato resueltos en los metadatos del entorno del servicio del supervisor.
    - Doctor detecta valores de entorno de servicio administrados por `.env`/respaldados por SecretRef que instalaciones antiguas de LaunchAgent, systemd o Tarea programada de Windows incrustaron en línea y reescribe los metadatos del servicio para que esos valores se carguen desde la fuente de ejecución en lugar de la definición del supervisor.
    - Doctor detecta cuándo el comando del servicio todavía fija un `--port` antiguo después de los cambios de `gateway.port` y reescribe los metadatos del servicio al puerto actual.
    - Si la autenticación por token requiere un token y el token SecretRef configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con orientación procesable.
    - Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
    - Para las unidades user-systemd de Linux, las comprobaciones de desviación de token de doctor ahora incluyen ambas fuentes `Environment=` y `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
    - Las reparaciones del servicio doctor se niegan a reescribir, detener o reiniciar un servicio de puerta de enlace desde un binario OpenClaw anterior cuando la configuración fue escrita por última vez por una versión más reciente. Consulte [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - Siempre puede forzar una reescritura completa a través de `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="16. Diagnósticos del tiempo de ejecución y puerto de Gateway">
    Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También verifica si hay colisiones de puertos en el puerto de la puerta de enlace (predeterminado `18789`) e informa las causas probables (puerta de enlace ya en ejecución, túnel SSH).
  </Accordion>
  <Accordion title="17. Mejores prácticas del tiempo de ejecución de Gateway">
    Doctor advierte cuando el servicio de la puerta de enlace se ejecuta en Bun o en una ruta de Node administrada por versión (`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp + Telegram requieren Node, y las rutas de administradores de versiones pueden romperse después de las actualizaciones porque el servicio no carga la inicialización de su shell. Doctor ofrece migrar a una instalación del sistema Node cuando está disponible (Homebrew/apt/choco).
  </Accordion>
  <Accordion title="18. Escritura de configuración + metadatos del asistente">
    Doctor persiste cualquier cambio de configuración y marca los metadatos del asistente para registrar la ejecución del doctor.
  </Accordion>
  <Accordion title="19. Consejos del espacio de trabajo (copia de seguridad + sistema de memoria)">
    Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad si el espacio de trabajo aún no está bajo git.

    Consulte [/concepts/agent-workspace](/es/concepts/agent-workspace) para obtener una guía completa sobre la estructura del espacio de trabajo y la copia de seguridad de git (se recomienda GitHub o GitLab privados).

  </Accordion>
</AccordionGroup>

## Relacionado

- [Manual de operaciones de Gateway](/es/gateway)
- [Solución de problemas de Gateway](/es/gateway/troubleshooting)
