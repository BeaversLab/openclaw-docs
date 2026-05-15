---
summary: "Comando Doctor: comprobaciones de estado, migraciones de configuración y pasos de reparación"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` es la herramienta de reparación y migración para OpenClaw. Corrige la configuración/estado obsoleto, verifica el estado y proporciona pasos de reparación accionables.

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
    - Actualización previa opcional para instalaciones de git (solo interactivo).
    - Verificación de frescura del protocolo de la interfaz de usuario (reconstruye la interfaz de usuario de Control cuando el esquema del protocolo es más reciente).
    - Verificación de estado + solicitud de reinicio.
    - Resumen del estado de las habilidades (elegibles/faltantes/bloqueadas) y estado de los complementos.

  </Accordion>
  <Accordion title="Configuración y migraciones">
    - Normalización de configuración para valores heredados.
    - Migración de configuración de Talk desde campos planos heredados `talk.*` a `talk.provider` + `talk.providers.<provider>`.
    - Verificaciones de migración del navegador para configuraciones de extensiones de Chrome heredadas y preparación de Chrome MCP.
    - Advertencias de anulación de proveedor de OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
    - Advertencias de sombreado de OAuth de Codex (`models.providers.openai-codex`).
    - Verificación de requisitos previos de TLS para OAuth para perfiles OAuth de OpenAI Codex.
    - Advertencias de lista de permitidos de complementos/herramientas cuando `plugins.allow` es restrictivo pero la política de herramientas aún solicita comodines o herramientas propiedad del complemento.
    - Migración de estado en disco heredado (sesiones/directorio del agente/auth de WhatsApp).
    - Migración de clave de contrato de manifiesto de complemento heredado (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Migración de tienda cron heredada (`jobId`, `schedule.cron`, campos de nivel superior de entrega/carga útil, carga útil `provider`, trabajos de reserva de webhook `notify: true` simples).
    - Limpieza de política de tiempo de ejecución de agente completo heredado; la política de tiempo de ejecución de proveedor/modelo es el selector de ruta activo.
    - Limpieza de configuración de complemento obsoleto cuando los complementos están habilitados; cuando `plugins.enabled=false`, las referencias a complementos obsoletos se tratan como configuración de contención inerte y se conservan.

  </Accordion>
  <Accordion title="Estado e integridad">
    - Inspección de archivos de bloqueo de sesión y limpieza de bloqueos obsoletos.
    - Reparación de transcripciones de sesión para ramas de reescritura de indicaciones duplicadas creadas por las versiones afectadas del 2026.4.24.
    - Detección de lápidas de recuperación de reinicio de subagentes bloqueados, con compatibilidad con `--fix` para borrar indicadores de recuperación abortados obsoletos para que el inicio no siga tratando al secundario como reinicio abortado.
    - Verificaciones de integridad y permisos de estado (sesiones, transcripciones, directorio de estado).
    - Verificaciones de permisos de archivos de configuración (chmod 600) al ejecutarse localmente.
    - Estado de autenticación del modelo: verifica el vencimiento de OAuth, puede actualizar los tokens que vencen e informa de los estados de perfil de autenticación de enfriamiento/deshabilitado.
    - Detección de directorio de espacio de trabajo adicional (`~/openclaw`).

  </Accordion>
  <Accordion title="Puerta de enlace, servicios y supervisores">
    - Reparación de la imagen de espacio aislado (sandbox) cuando el modo sandbox está habilitado.
    - Migración de servicios heredados y detección de puertas de enlace adicionales.
    - Migración del estado heredado del canal Matrix (en modo `--fix` / `--repair`).
    - Verificaciones de tiempo de ejecución de la puerta de enlace (servicio instalado pero no en ejecución; etiqueta launchd en caché).
    - Advertencias de estado del canal (sondeadas desde la puerta de enlace en ejecución).
    - Las verificaciones de permisos específicas del canal se encuentran en `openclaw channels capabilities`; por ejemplo, los permisos del canal de voz de Discord se auditan con `openclaw channels capabilities --channel discord --target channel:<channel-id>`.
    - Verificaciones de capacidad de respuesta de WhatsApp para la salud degradada del bucle de eventos de la puerta de enlace con clientes TUI locales aún en ejecución; `--fix` detiene solo los clientes TUI locales verificados.
    - Reparación de rutas de Codex para referencias de modelo `openai-codex/*` heredadas en modelos principales, alternativas (fallbacks), anulaciones de latido/subagente/compactación, enlaces (hooks), anulaciones de modelo de canal y pines de ruta de sesión; `--fix` las reescribe a `openai/*`, elimina pines de tiempo de ejecución de sesión/agente completo obsoletos y deja referencias de agente OpenAI canónicas en el arnés predeterminado de Codex.
    - Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
    - Limpieza del entorno de proxy integrado para servicios de puerta de enlace que capturaron valores de shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` durante la instalación o actualización.
    - Verificaciones de mejores prácticas de tiempo de ejecución de la puerta de enlace (Node vs Bun, rutas de gestor de versiones).
    - Diagnósticos de colisión de puertos de la puerta de enlace (predeterminado `18789`).

  </Accordion>
  <Accordion title="Autenticación, seguridad y emparejamiento">
    - Advertencias de seguridad para políticas de MD abiertas.
    - Verificaciones de autenticación de la puerta de enlace para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones de SecretRef de token).
    - Detección de problemas de emparejamiento de dispositivos (solicitudes de primer emparejamiento pendientes, actualizaciones de rol/alcance pendientes, deriva de caché de token de dispositivo local obsoleto y deriva de autenticación de registro emparejado).

  </Accordion>
  <Accordion title="Workspace and shell">
    - Verificación de persistencia de systemd en Linux.
    - Verificación del tamaño del archivo de arranque del área de trabajo (advertencias de truncamiento/cerca del límite para archivos de contexto).
    - Verificación de preparación de habilidades para el agente predeterminado; informa habilidades permitidas con bins, env, config o requisitos del SO faltantes, y `--fix` puede deshabilitar habilidades no disponibles en `skills.entries`.
    - Verificación del estado de finalización del shell y autoinstalación/actualización.
    - Verificación de preparación del proveedor de incrustación de búsqueda de memoria (modelo local, clave de API remota o binario QMD).
    - Verificaciones de instalación desde el código fuente (discordancia del espacio de trabajo pnpm, activos de IU faltantes, binario tsx faltante).
    - Escribe configuración actualizada + metadatos del asistente.

  </Accordion>
</AccordionGroup>

## Relleno y restablecimiento de la interfaz de usuario de Dreams

La escena Dreams de la interfaz de usuario de Control incluye las acciones **Backfill**, **Reset** y **Clear Grounded** para el flujo de trabajo de grounded dreaming. Estas acciones utilizan métodos RPC estilo doctor de puerta de enlace, pero **no** son parte de la reparación/migración de la CLI de `openclaw doctor`.

Lo que hacen:

- **Backfill** escanea archivos históricos `memory/YYYY-MM-DD.md` en el área de trabajo activa, ejecuta el pase de diario REM anclado y escribe entradas de retroalimentación reversibles en `DREAMS.md`.
- **Reset** elimina solo esas entradas de diario de retroalimentación marcadas de `DREAMS.md`.
- **Clear Grounded** elimina solo las entradas a corto plazo preparadas y solo fundamentadas que provienen de la repetición histórica y aún no han acumulado recuerdo en vivo o soporte diario.

Lo que **no** hacen por sí mismos:

- no editan `MEMORY.md`
- no ejecutan migraciones completas de doctor
- no preparan automáticamente candidatos fundamentados en el almacén de promoción a corto plazo en vivo a menos que ejecute explícitamente primero la ruta de CLI preparada

Si desea que la repetición histórica fundamentada influya en el carril normal de promoción profunda, utilice el flujo de CLI en su lugar:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Eso almacena candidatos duraderos anclados en el almacén de soñado a corto plazo mientras mantiene `DREAMS.md` como la superficie de revisión.

## Comportamiento detallado y justificación

<AccordionGroup>
  <Accordion title="0. Actualización opcional (instalaciones git)">
    Si esta es una extracción de git y doctor se está ejecutando de manera interactiva, ofrece actualizar (fetch/rebase/build) antes de ejecutar doctor.
  </Accordion>
  <Accordion title="1. Normalización de la configuración">
    Si la configuración contiene formas de valores heredadas (por ejemplo, `messages.ackReaction` sin una invalidación específica del canal), doctor las normaliza al esquema actual.

    Esto incluye los campos planos heredados de Talk. La configuración de voz pública actual de Talk es `talk.provider` + `talk.providers.<provider>`, y la configuración de voz en tiempo real es `talk.realtime.*`. Doctor reescribe las antiguas formas `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` en el mapa de proveedores, y reescribe los selectores en tiempo real de nivel superior heredados (`talk.mode`, `talk.transport`, `talk.brain`, `talk.model`, `talk.voice`) en `talk.realtime`.

    Doctor también advierte cuando `plugins.allow` no está vacío y la política de herramientas utiliza
    entradas de herramientas comodín o propiedad de complementos. `tools.allow: ["*"]` solo coincide con herramientas
    de complementos que realmente se cargan; no omite la lista de permitidos exclusiva
    de complementos. Doctor escribe `plugins.bundledDiscovery: "compat"` para configuraciones de lista de permitidos
    heredadas migradas para preservar el comportamiento existente del proveedor agrupado, y
    luego apunta a la configuración más estricta `"allowlist"`.

  </Accordion>
  <Accordion title="2. Migraciones de claves de configuración heredadas">
    Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden que ejecute `openclaw doctor`.

    Doctor hará lo siguiente:

    - Explicar qué claves heredadas se encontraron.
    - Mostrar la migración que aplicó.
    - Reescribir `~/.openclaw/openclaw.json` con el esquema actualizado.

    El inicio de Gateway rechaza los formatos de configuración heredados y le pide que ejecute `openclaw doctor --fix`; no reescribe `openclaw.json` al iniciarse. Las migraciones del almacén de trabajos cron también son manejadas por `openclaw doctor --fix`.

    Migraciones actuales:

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - configuraciones de canal configurado sin política de respuesta visible → `messages.groupChat.visibleReplies: "message_tool"`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → `bindings` de nivel superior
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` heredados → `talk.provider` + `talk.providers.<provider>`
    - selectores de Talk en tiempo real de nivel superior heredados (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
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
    - Para canales con `accounts` con nombre pero con valores de canal de nivel superior de una sola cuenta persistentes, mueva esos valores con ámbito de cuenta a la cuenta promovida elegida para ese canal (`accounts.default` para la mayoría de los canales; Matrix puede conservar un objetivo con nombre/predeterminado existente que coincida)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (herramientas/elevadas/exec/sandbox/subagentes)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - eliminar `agents.defaults.llm`; use `models.providers.<id>.timeoutSeconds` para tiempos de espera lentos de proveedor/modelo
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - eliminar `browser.relayBindHost` (configuración de relé de extensión heredada)
    - `models.providers.*.api: "openai"` heredado → `"openai-completions"` (el inicio de Gateway también omite los proveedores cuyo `api` está configurado en un valor de enumeración futuro o desconocido en lugar de fallar de forma segura)
    - eliminar `plugins.entries.codex.config.codexDynamicToolsProfile`; el servidor de aplicaciones de Codex siempre mantiene las herramientas del espacio de trabajo nativas de Codex de forma nativa

    Las advertencias de Doctor también incluyen orientación predeterminada de cuenta para canales multicuenta:

    - Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, Doctor advierte que el enrutamiento de reserva puede elegir una cuenta inesperada.
    - Si `channels.<channel>.defaultAccount` está configurado en un ID de cuenta desconocido, Doctor advierte y enumera los ID de cuenta configurados.

  </Accordion>
  <Accordion title="2b. Invalidaciones del proveedor OpenCode">
    Si ha añadido `models.providers.opencode`, `opencode-zen` o `opencode-go` manualmente, esto anula el catálogo OpenCode integrado de `@mariozechner/pi-ai`. Eso puede forzar a los modelos a usar la API incorrecta o dejar los costes en cero. Doctor le advierte para que pueda eliminar la invalidación y restaurar el enrutamiento y los costes de la API por modelo.
  </Accordion>
  <Accordion title="2c. Migración del navegador y preparación de Chrome MCP">
    Si la configuración de su navegador sigue apuntando a la ruta de la extensión de Chrome eliminada, doctor la normaliza al modelo de conexión de Chrome MCP local actual del host:

    - `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
    - `browser.relayBindHost` se elimina

    Doctor también audita la ruta de Chrome MCP local del host cuando usa `defaultProfile: "user"` o un perfil `existing-session` configurado:

    - comprueba si Google Chrome está instalado en el mismo host para los perfiles de autoconexión predeterminados
    - comprueba la versión de Chrome detectada y advierte cuando es inferior a Chrome 144
    - le recuerda que habilite la depuración remota en la página de inspección del navegador (por ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging` o `edge://inspect/#remote-debugging`)

    Doctor no puede habilitar la configuración del lado de Chrome por usted. Chrome MCP local del host todavía requiere:

    - un navegador basado en Chromium 144+ en el host de puerta de enlace/nodo
    - que el navegador se esté ejecutando localmente
    - depuración remota habilitada en ese navegador
    - aprobar el primer mensaje de consentimiento de conexión en el navegador

    La preparación aquí trata solo sobre los requisitos previos de conexión local. La sesión existente mantiene los límites de ruta actuales de Chrome MCP; las rutas avanzadas como `responsebody`, exportación de PDF, interceptación de descargas y acciones por lotes todavía requieren un navegador administrado o un perfil CDP sin procesar.

    Esta comprobación **no** se aplica a Docker, sandbox, remote-browser u otros flujos sin cabeza. Esos continúan usando CDP sin procesar.

  </Accordion>
  <Accordion title="2d. Requisitos previos de OAuth TLS">
    Cuando se configura un perfil OAuth de OpenAI Codex, doctor sondea el punto de conexión de autorización de OpenAI para verificar que la pila TLS local de Node/OpenSSL pueda validar la cadena de certificados. Si el sondeo falla con un error de certificado (por ejemplo `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificado caducado o certificado autofirmado), doctor imprime instrucciones de reparación específicas de la plataforma. En macOS con un Node instalado mediante Homebrew, la solución suele ser `brew postinstall ca-certificates`. Con `--deep`, el sondeo se ejecuta aunque la puerta de enlace esté sana.
  </Accordion>
  <Accordion title="2e. Invalidaciones del proveedor OAuth de Codex">
    Si anteriormente añadió opciones de transporte heredadas de OpenAI bajo `models.providers.openai-codex`, pueden eclipsar la ruta del proveedor OAuth de Codex integrada que las versiones más recientes usan automáticamente. Doctor avisa cuando detecta esas opciones de transporte antiguas junto con OAuth de Codex para que pueda eliminar o reescribir la invalidación de transporte obsoleta y recuperar el comportamiento de enrutamiento y reserva integrado. Los proxies personalizados y las invalidaciones solo de encabezados siguen siendo compatibles y no activan esta advertencia.
  </Accordion>
  <Accordion title="2f. Reparación de ruta de Codex">
    Doctor busca referencias de modelos `openai-codex/*` heredadas. El enrutamiento del arnés nativo de Codex utiliza referencias de modelos canónicas `openai/*`; los turnos del agente OpenAI pasan a través del arnés del servidor de aplicaciones de Codex en lugar de la ruta OpenAI de OpenClaw PI.

    En el modo `--fix` / `--repair`, el doctor reescribe las referencias afectadas del agente predeterminado y por agente, incluyendo modelos principales, respaldos, anulaciones de latido/subagente/compactación, ganchos, anulaciones de modelos de canal y el estado de ruta de sesión persistente obsoleto:

    - `openai-codex/gpt-*` se convierte en `openai/gpt-*`.
    - Se eliminan la configuración de tiempo de ejecución de todo el agente obsoleta y las fijaciones de tiempo de ejecución de sesión persistente porque la selección de tiempo de ejecución está limitada al proveedor/modelo.
    - Se conserva la política de tiempo de ejecución explícita del proveedor/modelo.
    - Se conservan las listas de respaldo de modelos existentes con sus entradas heredadas reescritas; la configuración copiada por modelo se mueve de la clave heredada a la clave canónica `openai/*`.
    - Se reparan la sesión persistente `modelProvider`/`providerOverride`, `model`/`modelOverride`, los avisos de respaldo, las fijaciones de perfil de autenticación y las fijaciones del arnés Codex en todos los almacenes de sesión de agente descubiertos.
    - `/codex ...` significa "controlar o vincular una conversación nativa de Codex desde el chat."
    - `/acp ...` o `runtime: "acp"` significa "usar el adaptador externo ACP/acpx."

  </Accordion>
  <Accordion title="2g. Limpieza de ruta de sesión">
    Doctor también escanea los almacenes de sesiones de agente descubiertos en busca de estados de ruta creados automáticamente y obsoletos después de que mueve los modelos o el tiempo de ejecución configurados lejos de una ruta propiedad de un complemento, como Codex.

    `openclaw doctor --fix` puede borrar el estado obsoleto creado automáticamente, como los pines del modelo `modelOverrideSource: "auto"`, los metadatos del modelo en tiempo de ejecución, los ids de arnés fijos, los enlaces de sesión de la CLI y las anulaciones automáticas del perfil de autenticación, cuando su ruta propietaria ya no está configurada. Las elecciones explícitas del usuario o del modelo de sesión heredado se informan para su revisión manual y se dejan intactas; cámbielas con `/model ...`, `/new`, o restablezca la sesión cuando esa ruta ya no sea la prevista.

  </Accordion>
  <Accordion title="3. Migraciones de estado heredado (diseño de disco)">
    Doctor puede migrar diseños de disco antiguos a la estructura actual:

    - Almacén de sesiones + transcripciones:
      - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
    - Directorio del agente:
      - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
    - Estado de autenticación de WhatsApp (Baileys):
      - del estado heredado `~/.openclaw/credentials/*.json` (excepto `oauth.json`)
      - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminada: `default`)

    Estas migraciones son de mejor esfuerzo e idempotentes; doctor emitirá advertencias cuando deje carpetas heredadas como copias de seguridad. Gateway/CLI también migra automáticamente las sesiones heredadas + el directorio del agente al inicio, de modo que el historial/la autenticación/los modelos aterrizan en la ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo a través de `openclaw doctor`. La normalización del proveedor/provider-map de Talk ahora compara por igualdad estructural, por lo que las diferencias solo en el orden de las claves ya no activan cambios repetidos de no operación `doctor --fix`.

  </Accordion>
  <Accordion title="3a. Migraciones de manifiesto de complementos heredados">
    Doctor escanea todos los manifiestos de complementos instalados en busca de claves de capacidades de nivel superior obsoletas (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Cuando se encuentran, ofrece moverlas al objeto `contracts` y reescribir el archivo de manifiesto en su lugar. Esta migración es idempotente; si la clave `contracts` ya tiene los mismos valores, la clave heredada se elimina sin duplicar los datos.
  </Accordion>
  <Accordion title="3b. Migraciones del almacén de cron heredado">
    Doctor también comprueba el almacén de trabajos cron (`~/.openclaw/cron/jobs.json` por defecto, o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el planificador aún acepta por compatibilidad.

    Las limpiezas de cron actuales incluyen:

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
    - campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - alias de entrega `provider` de carga útil → `delivery.channel` explícito
    - trabajos de reserva de webhook heredados simples `notify: true` → `delivery.mode="webhook"` explícito con `delivery.to=cron.webhook`

    Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin cambiar el comportamiento. Si un trabajo combina la reserva de notificación heredada con un modo de entrega que no sea un webhook existente, doctor advierte y deja ese trabajo para su revisión manual.

    En Linux, doctor también advierte cuando el crontab del usuario todavía invoca el `~/.openclaw/bin/ensure-whatsapp.sh` heredado. Ese script local de host no es mantenido por el OpenClaw actual y puede escribir mensajes falsos de `Gateway inactive` en `~/.openclaw/logs/whatsapp-health.log` cuando cron no puede alcanzar el bus de usuario de systemd. Elimine la entrada obsoleta de crontab con `crontab -e`; use `openclaw channels status --probe`, `openclaw doctor` y `openclaw gateway status` para las comprobaciones de salud actuales.

  </Accordion>
  <Accordion title="3c. Limpieza de bloqueos de sesión">
    Doctor escanea cada directorio de sesión del agente en busca de archivos de bloqueo de escritura obsoletos (stale) — archivos que quedaron cuando una sesión finalizó de manera anormal. Para cada archivo de bloqueo encontrado, informa: la ruta, el PID, si el PID sigue vivo, la antigüedad del bloqueo y si se considera obsoleto (PID muerto, antigüedad mayor a 30 minutos o un PID vivo que se puede probar que pertenece a un proceso que no es de OpenClaw). En el modo `--fix` / `--repair` elimina automáticamente los archivos de bloqueo obsoletos; de lo contrario, imprime una nota y le indica que vuelva a ejecutar con `--fix`.
  </Accordion>
  <Accordion title="3d. Reparación de rama de transcripción de sesión">
    Doctor escanea los archivos JSONL de sesión del agente en busca de la forma de rama duplicada creada por el error de reescritura de transcripción de prompt del 2026.4.24: un turno de usuario abandonado con contexto de tiempo de ejecución interno de OpenClaw más un hermano activo que contiene el mismo mensaje de usuario visible. En el modo `--fix` / `--repair`, doctor hace una copia de seguridad de cada archivo afectado junto al original y reescribe la transcripción a la rama activa para que los lectores del historial y la memoria de la gateway ya no vean turnos duplicados.
  </Accordion>
  <Accordion title="4. Verificaciones de integridad del estado (persistencia de sesión, enrutamiento y seguridad)">
    El directorio de estado es el tronco encefálico operativo. Si desaparece, pierdes las sesiones, las credenciales, los registros y la configuración (a menos que tengas copias de seguridad en otro lugar).

    Doctor verifica:

    - **Directorio de estado faltante**: advierte sobre una pérdida catastrófica de estado, solicita recrear el directorio y recuerda que no puede recuperar los datos faltantes.
    - **Permisos del directorio de estado**: verifica la escritura; ofrece reparar los permisos (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
    - **Directorio de estado sincronizado en la nube en macOS**: advierte cuando el estado se resuelve bajo iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden provocar E/S más lenta y condiciones de carrera de bloqueo/sincronización.
    - **Directorio de estado en SD o eMMC de Linux**: advierte cuando el estado se resuelve en una fuente de montaje `mmcblk*`, porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse más rápidamente con las escrituras de sesión y credenciales.
    - **Directorios de sesión faltantes**: `sessions/` y el directorio de almacenamiento de sesiones son necesarios para persistir el historial y evitar fallos `ENOENT`.
    - **Discrepancia de transcripción**: advierte cuando las entradas de sesión recientes tienen archivos de transcripción faltantes.
    - **Sesión principal "1-line JSONL"**: marca cuando la transcripción principal tiene solo una línea (el historial no se está acumulando).
    - **Múltiples directorios de estado**: advierte cuando existen múltiples carpetas `~/.openclaw` en los directorios principales o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede dividirse entre instalaciones).
    - **Recordatorio de modo remoto**: si `gateway.mode=remote`, doctor te recuerda que lo ejecutes en el host remoto (el estado reside allí).
    - **Permisos del archivo de configuración**: advierte si `~/.openclaw/openclaw.json` es legible por grupo/mundo y ofrece ajustarlo a `600`.

  </Accordion>
  <Accordion title="5. Estado de autenticación del modelo (expiración de OAuth)">
    Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, avisa cuando los tokens están por expirar/expirados y puede actualizarlos cuando es seguro. Si el perfil de OAuth/token de Anthropic está obsoleto, sugiere una clave de API de Anthropic o la ruta del token de configuración de Anthropic. Las solicitudes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive` omite los intentos de actualización.

    Cuando una actualización de OAuth falla permanentemente (por ejemplo, `refresh_token_reused`, `invalid_grant`, o un proveedor que te indica que vuelvas a iniciar sesión), doctor informa que se requiere volver a autenticarse e imprime el comando exacto `openclaw models auth login --provider ...` a ejecutar.

    Doctor también informa sobre los perfiles de autenticación que no se pueden usar temporalmente debido a:

    - períodos de espera breves (límites de velocidad/tiempos de espera/fallos de autenticación)
    - deshabilitaciones más largas (fallos de facturación/crédito)

  </Accordion>
  <Accordion title="6. Validación del modelo de Hooks">
    Si `hooks.gmail.model` está configurado, doctor valida la referencia del modelo contra el catálogo y la lista de permitidos, y avisa cuando no se pueda resolver o esté prohibido.
  </Accordion>
  <Accordion title="7. Reparación de la imagen de Sandbox">
    Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece compilar o cambiar a nombres heredados si falta la imagen actual.
  </Accordion>
  <Accordion title="7b. Limpieza de instalación de plugins">
    Doctor elimina el estado de preparación de dependencias de plugins generado por OpenClaw heredado en el modo `openclaw doctor --fix` / `openclaw doctor --repair`. Esto cubre las raíces de dependencias generadas obsoletas, los directorios de etapa de instalación antiguos, los residuos locales de paquetes del código de reparación de dependencias de plugins empaquetados anterior y las copias administradas de npm huérfanas o recuperadas de plugins `@openclaw/*` empaquetados que pueden ocultar el manifiesto empaquetado actual.

    Doctor también puede reinstalar plugins descargables que faltan cuando la configuración hace referencia a ellos pero el registro de plugins local no puede encontrarlos. Los ejemplos incluyen material `plugins.entries`, configuración de canal/proveedor/búsqueda configurada y tiempos de ejecución del agente configurados. Durante las actualizaciones de paquetes, doctor evita ejecutar la reparación del plugin del administrador de paquetes mientras se está intercambiando el paquete principal; ejecute `openclaw doctor --fix` nuevamente después de la actualización si un plugin configurado aún necesita recuperación. El inicio de Gateway y la recarga de la configuración no ejecutan administradores de paquetes; las instalaciones de plugins siguen siendo un trabajo explícito de doctor/instalación/actualización.

  </Accordion>
  <Accordion title="8. Migraciones de servicios de Gateway y sugerencias de limpieza">
    Doctor detecta servicios de puerta de enlace heredados (launchd/systemd/schtasks) y ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto de puerta de enlace actual. También puede escanear servicios adicionales similares a la puerta de enlace e imprimir sugerencias de limpieza. Los servicios de puerta de enlace OpenClaw con nombre de perfil se consideran de primera clase y no se marcan como "extra".

    En Linux, si falta el servicio de puerta de enlace a nivel de usuario pero existe un servicio de puerta de enlace OpenClaw a nivel de sistema, doctor no instala automáticamente un segundo servicio a nivel de usuario. Inspeccione con `openclaw gateway status --deep` o `openclaw doctor --deep`, luego elimine el duplicado o establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando un supervisor del sistema sea propietario del ciclo de vida de la puerta de enlace.

  </Accordion>
  <Accordion title="8b. Migración de Matrix al inicio">
    Cuando una cuenta de canal de Matrix tiene una migración de estado heredada pendiente o accionable, doctor (en modo `--fix` / `--repair`) crea una instantánea previa a la migración y luego ejecuta los pasos de migración de mejor esfuerzo: migración de estado heredado de Matrix y preparación del estado cifrado heredado. Ambos pasos no son fatales; los errores se registran y el inicio continúa. En modo de solo lectura (`openclaw doctor` sin `--fix`) esta verificación se omite por completo.
  </Accordion>
  <Accordion title="8c. Emparejamiento de dispositivos y deriva de autenticación">
    Doctor ahora inspecciona el estado de emparejamiento de dispositivos como parte del pase de salud normal.

    Lo que informa:

    - solicitudes de emparejamiento por primera vez pendientes
    - actualizaciones de rol pendientes para dispositivos ya emparejados
    - actualizaciones de alcance pendientes para dispositivos ya emparejados
    - reparaciones de discordancia de claves públicas donde la identificación del dispositivo aún coincide pero la identidad del dispositivo ya no coincide con el registro aprobado
    - registros emparejados a los que falta un token activo para un rol aprobado
    - tokens emparejados cuyos alcances derivan fuera de la línea base de emparejamiento aprobada
    - entradas de token de dispositivo en caché local para la máquina actual que anteceden una rotación de tokens del lado de la puerta de enlace o transportan metadatos de alcance obsoletos

    Doctor no autoaprueba solicitudes de emparejamiento ni autorrota tokens de dispositivos. En su lugar, imprime los siguientes pasos exactos:

    - inspeccionar solicitudes pendientes con `openclaw devices list`
    - aprobar la solicitud exacta con `openclaw devices approve <requestId>`
    - rotar un token nuevo con `openclaw devices rotate --device <deviceId> --role <role>`
    - eliminar y volver a aprobar un registro obsoleto con `openclaw devices remove <deviceId>`

    Esto cierra el hueco común de "ya emparejado pero aún se requiere emparejamiento": doctor ahora distingue el emparejamiento por primera vez de las actualizaciones de rol/alcance pendientes y de la deriva de token/identidad de dispositivo obsoleta.

  </Accordion>
  <Accordion title="9. Advertencias de seguridad">
    Doctor emite advertencias cuando un proveedor está abierto a MDs sin una lista de permitidos, o cuando una política está configurada de manera peligrosa.
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    Si se ejecuta como un servicio de usuario de systemd, doctor asegura que lingering esté habilitado para que la puerta de enlace se mantenga activa después de cerrar sesión.
  </Accordion>
  <Accordion title="11. Estado del espacio de trabajo (habilidades, complementos y directorios heredados)">
    Doctor imprime un resumen del estado del espacio de trabajo para el agente predeterminado:

    - **Estado de las habilidades (Skills)**: cuenta las habilidades elegibles, con requisitos faltantes y bloqueadas por la lista de permitidos.
    - **Directorios de espacio de trabajo heredados**: advierte cuando existen `~/openclaw` u otros directorios de espacio de trabajo heredados junto al espacio de trabajo actual.
    - **Estado de los complementos**: cuenta los complementos habilitados/deshabilitados/con error; lista los ID de complemento para cualquier error; informa las capacidades de los complementos agrupados.
    - **Advertencias de compatibilidad de complementos**: marca los complementos que tienen problemas de compatibilidad con el tiempo de ejecución actual.
    - **Diagnósticos de complementos**: expone cualquier advertencia o error de tiempo de carga emitido por el registro de complementos.

  </Accordion>
  <Accordion title="11b. Tamaño del archivo de arranque">
    Doctor verifica si los archivos de arranque del espacio de trabajo (por ejemplo `AGENTS.md`, `CLAUDE.md` u otros archivos de contexto inyectados) están cerca o por encima del presupuesto de caracteres configurado. Informa los recuentos de caracteres brutos frente a los inyectados por archivo, el porcentaje de truncamiento, la causa del truncamiento (`max/file` o `max/total`) y el total de caracteres inyectados como una fracción del presupuesto total. Cuando los archivos están truncados o cerca del límite, doctor imprime consejos para ajustar `agents.defaults.bootstrapMaxChars` y `agents.defaults.bootstrapTotalMaxChars`.
  </Accordion>
  <Accordion title="11d. Limpieza de complementos de canal obsoletos">
    Cuando `openclaw doctor --fix` elimina un complemento de canal faltante, también elimina la configuración de ámbito de canal colgada que hacía referencia a ese complemento: entradas `channels.<id>`, objetivos de latido que nombraban el canal y anulaciones `agents.*.models["<channel>/*"]`. Esto evita bucles de arranque de Gateway donde el tiempo de ejecución del canal ha desaparecido pero la configuración aún le pide a la puerta de enlace que se vincule a él.
  </Accordion>
  <Accordion title="11c. Finalización de shell">
    Doctor comprueba si la finalización con tabulación está instalada para el shell actual (zsh, bash, fish o PowerShell):

    - Si el perfil del shell utiliza un patrón de finalización dinámica lento (`source <(openclaw completion ...)`), doctor lo actualiza a la variante de archivo en caché más rápida.
    - Si la finalización está configurada en el perfil pero falta el archivo de caché, doctor regenera la caché automáticamente.
    - Si no hay ninguna finalización configurada, doctor ofrece instalarla (solo modo interactivo; se omite con `--non-interactive`).

    Ejecute `openclaw completion --write-state` para regenerar la caché manualmente.

  </Accordion>
  <Accordion title="12. Comprobaciones de autenticación de Gateway (token local)">
    Doctor comprueba el estado de preparación de la autenticación del token de la puerta de enlace local.

    - Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
    - Si `gateway.auth.token` está gestionado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto plano.
    - `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

  </Accordion>
  <Accordion title="12b. Reparaciones con conocimiento de SecretRef de solo lectura">
    Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de falla rápida (fail-fast) en tiempo de ejecución.

    - `openclaw doctor --fix` ahora utiliza el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estado para reparaciones de configuración específicas.
    - Ejemplo: la reparación de `allowFrom` / `groupAllowFrom` `@username` de Telegram intenta utilizar las credenciales del bot configuradas cuando están disponibles.
    - Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta del comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de fallar o informar erróneamente que falta el token.

  </Accordion>
  <Accordion title="13. Comprobación de estado de Gateway + reinicio">
    Doctor ejecuta una comprobación de estado y ofrece reiniciar la puerta de enlace cuando parece poco saludable.
  </Accordion>
  <Accordion title="13b. Preparación de la búsqueda de memoria">
    Doctor verifica si el proveedor de incrustación de búsqueda de memoria configurado está listo para el agente predeterminado. El comportamiento depende del backend y el proveedor configurados:

    - **Backend QMD**: sondea si el binario `qmd` está disponible y se puede iniciar. Si no, imprime orientación de solución que incluye el paquete npm y una opción de ruta binaria manual.
    - **Proveedor local explícito**: busca un archivo de modelo local o una URL de modelo remoto/descargable reconocida. Si falta, sugiere cambiar a un proveedor remoto.
    - **Proveedor remoto explícito** (`openai`, `voyage`, etc.): verifica que haya una clave API presente en el entorno o en el almacén de autenticación. Imprime sugerencias de solución accionables si falta.
    - **Proveedor automático**: verifica primero la disponibilidad del modelo local y luego intenta cada proveedor remoto en orden de selección automática.

    Cuando hay un resultado de sondeo de gateway almacenado en caché disponible (el gateway estaba sano en el momento de la verificación), doctor contrasta su resultado con la configuración visible en la CLI y nota cualquier discrepancia. Doctor no inicia un ping de incrustación nuevo en la ruta predeterminada; use el comando de estado de memoria profunda cuando desee una verificación en vivo del proveedor.

    Use `openclaw memory status --deep` para verificar la preparación de la incrustación en tiempo de ejecución.

  </Accordion>
  <Accordion title="14. Advertencias de estado del canal">
    Si el gateway está sano, doctor ejecuta un sondeo de estado del canal e informa advertencias con soluciones sugeridas.
  </Accordion>
  <Accordion title="15. Auditoría y reparación de la configuración del supervisor">
    Doctor verifica la configuración instalada del supervisor (launchd/systemd/schtasks) en busca de valores predeterminados faltantes o desactualizados (por ejemplo, dependencias de red systemd en línea y retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede reescribir el archivo de servicio/tarea a los valores predeterminados actuales.

    Notas:

    - `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
    - `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
    - `openclaw doctor --repair` aplica las correcciones recomendadas sin solicitar confirmación.
    - `openclaw doctor --repair --force` sobrescribe las configuraciones personalizadas del supervisor.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` mantiene doctor en modo de solo lectura para el ciclo de vida del servicio de puerta de enlace. Aún informa el estado del servicio y ejecuta reparaciones que no son del servicio, pero omite la instalación/inicio/reinicio/inicialización del servicio, la reescritura de la configuración del supervisor y la limpieza de servicios heredados porque un supervisor externo posee ese ciclo de vida.
    - En Linux, doctor no reescribe los metadatos de comando/punto de entrada mientras la unidad de puerta de enlace systemd coincidente está activa. También ignora las unidades adicionales tipo puerta de enlace inactivas que no son heredadas durante el escaneo de servicios duplicados para que los archivos de servicios complementarios no generen ruido de limpieza.
    - Si la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, la instalación/reparación del servicio doctor valida el SecretRef pero no persiste los valores de token de texto resueltos en los metadatos del entorno del servicio del supervisor.
    - Doctor detecta valores de entorno de servicio administrados `.env`/respaldados por SecretRef que las instalaciones antiguas de LaunchAgent, systemd o Tarea programada de Windows incrustaban en línea y reescribe los metadatos del servicio para que esos valores se carguen desde la fuente de tiempo de ejecución en lugar de la definición del supervisor.
    - Doctor detecta cuando el comando del servicio aún fija un `--port` antiguo después de los cambios de `gateway.port` y reescribe los metadatos del servicio al puerto actual.
    - Si la autenticación por token requiere un token y el SecretRef de token configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con orientación procesable.
    - Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
    - Para las unidades systemd de usuario de Linux, las comprobaciones de deriva de token de doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
    - Las reparaciones del servicio doctor se niegan a reescribir, detener o reiniciar un servicio de puerta de enlace desde un binario OpenClaw anterior cuando la configuración fue escrita por última vez por una versión más reciente. Consulte [Solución de problemas de puerta de enlace](/es/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - Siempre puede forzar una reescritura completa mediante `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="16. Diagnósticos del tiempo de ejecución y puerto de la puerta de enlace">
    Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También comprueba si hay colisiones de puertos en el puerto de la puerta de enlace (predeterminado `18789`) e informa de las causas probables (la puerta de enlace ya se está ejecutando, túnel SSH).
  </Accordion>
  <Accordion title="17. Mejores prácticas del tiempo de ejecución de la puerta de enlace">
    Doctor advierte cuando el servicio de la puerta de enlace se ejecuta en Bun o en una ruta de Node administrada por versiones (`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp y Telegram requieren Node, y las rutas de los gestores de versiones pueden romperse después de las actualizaciones porque el servicio no carga su init de shell. Doctor ofrece migrar a una instalación de Node del sistema cuando esté disponible (Homebrew/apt/choco).

    Los LaunchAgents de macOS recién instalados o reparados utilizan una RUTA del sistema canónica (`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`) en lugar de copiar la RUTA del shell interactivo, por lo que los binarios del sistema gestionados por Homebrew permanecen disponibles, mientras que los directorios de Volta, asdf, fnm, pnpm y otros gestores de versiones no cambian qué Node resuelven los procesos secundarios. Los servicios de Linux aún conservan raíces de entorno explícitas (`NVM_DIR`, `FNM_DIR`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `BUN_INSTALL`, `PNPM_HOME`) y directorios de usuario-bin estables, pero los directorios de reserva de gestores de versiones supuestos solo se escriben en la RUTA del servicio cuando esos directorios existen en el disco.

  </Accordion>
  <Accordion title="18. Escritura de configuración + metadatos del asistente">
    Doctor guarda cualquier cambio de configuración y marca los metadatos del asistente para registrar la ejecución del doctor.
  </Accordion>
  <Accordion title="19. Consejos del espacio de trabajo (copia de seguridad + sistema de memoria)">
    Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad si el espacio de trabajo aún no está bajo git.

    Consulte [/concepts/agent-workspace](/es/concepts/agent-workspace) para obtener una guía completa sobre la estructura del espacio de trabajo y la copia de seguridad en git (se recomienda un GitHub o GitLab privado).

  </Accordion>
</AccordionGroup>

## Relacionado

- [Manual de procedimientos de Gateway](/es/gateway)
- [Solución de problemas de Gateway](/es/gateway/troubleshooting)
