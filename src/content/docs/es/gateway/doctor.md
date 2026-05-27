---
summary: "Comando Doctor: comprobaciones de estado, migraciones de configuración y pasos de reparación"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` es la herramienta de reparación y migración para OpenClaw. Corrige configuraciones/estados obsoletos, verifica el estado y proporciona pasos de reparación procesables.

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

    Aceptar los valores predeterminados sin preguntar (incluidos los pasos de reparación de reinicio/servicio/sandbox cuando corresponda).

  </Tab>
  <Tab title="--fix">
    ```bash
    openclaw doctor --fix
    ```

    Aplicar las reparaciones recomendadas sin preguntar (reparaciones + reinicios cuando sea seguro).

  </Tab>
  <Tab title="--lint">
    ```bash
    openclaw doctor --lint
    openclaw doctor --lint --json
    ```

    Ejecutar comprobaciones de salud estructuradas para CI o automatización previa al vuelo. Este modo es
    de solo lectura: no pregunta, repara, migra configuraciones, reinicia servicios o
    modifica el estado.

  </Tab>
  <Tab title="--fix --force">
    ```bash
    openclaw doctor --fix --force
    ```

    Aplicar también reparaciones agresivas (sobrescribe las configuraciones personalizadas del supervisor).

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    Ejecutar sin indicaciones y aplicar solo migraciones seguras (normalización de configuración + movimientos de estado en disco). Omite las acciones de reinicio/servicio/sandbox que requieren confirmación humana. Las migraciones de estado heredadas se ejecutan automáticamente cuando se detectan.

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    Escanear los servicios del sistema en busca de instalaciones adicionales de la puerta de enlace (launchd/systemd/schtasks).

  </Tab>
</Tabs>

Si desea revisar los cambios antes de escribir, abra primero el archivo de configuración:

```bash
cat ~/.openclaw/openclaw.json
```

## Modo de inspección de solo lectura

`openclaw doctor --lint` es el pariente compatible con la automatización de
`openclaw doctor --fix`. Ambos utilizan las comprobaciones de salud de doctor, pero su postura es
diferente:

| Modo                     | Preguntas | Escribe configuración/estado   | Salida                          | Úselo para                                |
| ------------------------ | --------- | ------------------------------ | ------------------------------- | ----------------------------------------- |
| `openclaw doctor`        | sí        | no                             | informe de salud amigable       | un humano verificando el estado           |
| `openclaw doctor --fix`  | a veces   | sí, con política de reparación | registro de reparación amigable | aplicando reparaciones aprobadas          |
| `openclaw doctor --lint` | no        | no                             | hallazgos estructurados         | CI, pruebas previas y puertas de revisión |

Las verificaciones de salud modernizadas pueden proporcionar una implementación opcional de `repair()`.
`doctor --fix` aplica esas reparaciones cuando existen y continúa usando el
flujo de reparación de doctor existente para las verificaciones que aún no han migrado.
El contrato de reparación estructurado también separa el reporte de reparación de la detección:
`detect()` reporta los hallazgos actuales, mientras que `repair()` puede reportar cambios,
diferencias de configuración/archivos y efectos secundarios que no son de archivo. Esto mantiene la ruta de migración abierta
para `doctor --fix --dry-run` y salida diff futuras sin hacer que las verificaciones de lint
plifiquen mutaciones.

Ejemplos:

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --only core/doctor/gateway-config --json
```

La salida JSON incluye:

- `ok`: si algún hallazgo visible cumplió con el umbral de severidad seleccionado
- `checksRun`: número de verificaciones de salud ejecutadas
- `checksSkipped`: verificaciones omitidas por `--only` o `--skip`
- `findings`: diagnósticos estructurados con `checkId`, `severity`, `message`, y
  `path` opcionales, `line`, `column`, `ocPath`, y `fixHint`

Códigos de salida:

- `0`: sin hallazgos en o por encima del umbral seleccionado
- `1`: uno o más hallazgos cumplieron con el umbral seleccionado
- `2`: fallo de comando/tiempo de ejecución antes de que se pudieran emitir los hallazgos de lint

Use `--severity-min info|warning|error` para controlar tanto lo que se imprime como lo que
causa una salida de lint distinta de cero. Use `--only <id>` para puertas de pre-vuelo estrechas y
`--skip <id>` para excluir temporalmente una verificación ruidosa manteniendo el resto de la
ejecución de lint activa.
Las opciones de salida de lint como `--json`, `--severity-min`, `--only` y `--skip`
deben emparejarse con `--lint`; las ejecuciones normales de doctor y repair las rechazan.

## Lo que hace (resumen)

<AccordionGroup>
  <Accordion title="Salud, IU y actualizaciones">
    - Actualización opcional de pre-vuelo para instalaciones de git (solo interactivo).
    - Verificación de frescura del protocolo de la IU (reconstruye la IU de Control cuando el esquema del protocolo es más reciente).
    - Verificación de estado + aviso de reinicio.
    - Resumen del estado de las habilidades (elegibles/faltantes/bloqueadas) y estado de los complementos.

  </Accordion>
  <Accordion title="Configuración y migraciones">
    - Normalización de configuración para valores heredados.
    - Migración de configuración de Talk desde campos planos heredados `talk.*` hacia `talk.provider` + `talk.providers.<provider>`.
    - Verificaciones de migración del navegador para configuraciones heredadas de extensiones de Chrome y preparación para Chrome MCP.
    - Advertencias de anulación de proveedor de OpenCode (`models.providers.opencode` / `models.providers.opencode-go`).
    - Advertencias de sombreado de OAuth de Codex (`models.providers.openai-codex`).
    - Verificación de requisitos previos de TLS de OAuth para perfiles OAuth de OpenAI Codex.
    - Advertencias de lista de permitidos (allowlist) de complementos/herramientas cuando `plugins.allow` es restrictivo pero la política de herramientas todavía solicita herramientas comodín o propias del complemento.
    - Migración de estado en disco heredado (sesiones/directorio del agente/autenticación de WhatsApp).
    - Migración de clave de contrato de manifiesto de complemento heredada (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Migración de almacén cron heredado (`jobId`, `schedule.cron`, campos de nivel superior de entrega/carga útil, carga útil `provider`, trabajos de reserva de webhook simples `notify: true`).
    - Limpieza de política de tiempo de ejecución de agente completo heredado; la política de tiempo de ejecución de proveedor/modelo es el selector de ruta activo.
    - Limpieza de configuración obsoleta de complementos cuando los complementos están habilitados; cuando `plugins.enabled=false`, las referencias obsoletas a complementos se tratan como configuración de contención inerte y se conservan.

  </Accordion>
  <Accordion title="Estado e integridad">
    - Inspección del archivo de bloqueo de sesión y limpieza de bloqueos obsoletos.
    - Reparación de la transcripción de sesión para ramas duplicadas de reescritura de prompts creadas por las versiones afectadas del 2026.4.24.
    - Detección de lápidas de recuperación de reinicio de subagentes bloqueados, con compatibilidad con `--fix` para borrar indicadores obsoletos de recuperación abortada para que el inicio no siga tratando al proceso hijo como reinicio abortado.
    - Verificaciones de integridad y permisos de estado (sesiones, transcripciones, directorio de estado).
    - Verificaciones de permisos del archivo de configuración (chmod 600) al ejecutarse localmente.
    - Estado de autenticación del modelo: verifica la expiración de OAuth, puede actualizar tokens que expiran pronto e informa de estados de perfil de autenticación en tiempo de espera/deshabilitados.
    - Detección de directorio de espacio de trabajo adicional (`~/openclaw`).

  </Accordion>
  <Accordion title="Gateway, servicios y supervisores">
    - Reparación de la imagen de sandbox cuando el sandbox está habilitado.
    - Migración de servicios heredados y detección de gateway adicional.
    - Migración del estado heredado del canal Matrix (en modo `--fix` / `--repair`).
    - Verificaciones de tiempo de ejecución del gateway (servicio instalado pero no en ejecución; etiqueta launchd en caché).
    - Advertencias de estado del canal (sondeadas desde el gateway en ejecución).
    - Las verificaciones de permisos específicas del canal se encuentran en `openclaw channels capabilities`; por ejemplo, los permisos del canal de voz de Discord se auditan con `openclaw channels capabilities --channel discord --target channel:<channel-id>`.
    - Verificaciones de capacidad de respuesta de WhatsApp para la salud degradada del bucle de eventos del Gateway con clientes TUI locales aún en ejecución; `--fix` detiene solo los clientes TUI locales verificados.
    - Reparación de la ruta Codex para referencias de modelo `openai-codex/*` heredadas en modelos principales, alternativas, anulaciones de latido/subagente/compactación, ganchos, anulaciones de modelo de canal y pines de ruta de sesión; `--fix` las reescribe a `openai/*`, elimina los pines de tiempo de ejecución de sesión/agente completo obsoletos y deja referencias de agente OpenAI canónicas en el arnés Codex predeterminado.
    - Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
    - Limpieza del entorno de proxy integrado para servicios de gateway que capturaron valores de shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` durante la instalación o actualización.
    - Verificaciones de mejores prácticas de tiempo de ejecución del Gateway (Node vs Bun, rutas del administrador de versiones).
    - Diagnósticos de colisión de puertos del Gateway (predeterminado `18789`).

  </Accordion>
  <Accordion title="Auth, seguridad y emparejamiento">
    - Advertencias de seguridad para políticas de DM abiertas.
    - Verificaciones de autenticación del gateway para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones de SecretRef de token).
    - Detección de problemas de emparejamiento de dispositivos (solicitudes de primer emparejamiento pendientes, actualizaciones de rol/alcance pendientes, deriva de caché de token de dispositivo local obsoleto y deriva de autenticación de registro emparejado).

  </Accordion>
  <Accordion title="Workspace and shell">
    - Verificación de persistencia de systemd en Linux.
    - Verificación del tamaño del archivo de arranque del espacio de trabajo (advertencias de truncamiento/cerca del límite para archivos de contexto).
    - Verificación de preparación de habilidades para el agente predeterminado; informa habilidades permitidas con bins, env, config o requisitos de SO faltantes, y `--fix` puede deshabilitar habilidades no disponibles en `skills.entries`.
    - Verificación del estado de completado del shell y auto-instalación/actualización.
    - Verificación de preparación del proveedor de incrustación de búsqueda de memoria (modelo local, clave de API remota o binario QMD).
    - Verificaciones de instalación de fuente (desajuste del espacio de trabajo pnpm, activos de IU faltantes, binario tsx faltante).
    - Escribe la configuración actualizada + metadatos del asistente.

  </Accordion>
</AccordionGroup>

## Relleno y restablecimiento de Dreams UI

La escena Dreams de la interfaz de usuario de Control incluye las acciones **Backfill** (Relleno), **Reset** (Restablecer) y **Clear Grounded** (Limpiar con respaldo) para el flujo de trabajo de soñar con respaldo. Estas acciones utilizan métodos RPC de estilo doctor de puerta de enlace, pero **no** son parte de la reparación/migración de la CLI de `openclaw doctor`.

Lo que hacen:

- **Backfill** escanea archivos históricos `memory/YYYY-MM-DD.md` en el espacio de trabajo activo, ejecuta el pase de diario REM con respaldo y escribe entradas de relleno reversibles en `DREAMS.md`.
- **Reset** elimina solo esas entradas de diario de relleno marcadas de `DREAMS.md`.
- **Clear Grounded** elimina solo las entradas a corto plazo solo con respaldo ensayadas que provinieron de la repetición histórica y aún no han acumulado recuerdo en vivo o soporte diario.

Lo que **no** hacen por sí mismos:

- no editan `MEMORY.md`
- no ejecutan migraciones completas del doctor
- no ensayan automáticamente candidatos con respaldo en el almacén de promoción a corto plazo en vivo a menos que ejecutes explícitamente primero la ruta CLI ensayada

Si deseas que la repetición histórica con respaldo influya en el carril normal de promoción profunda, utiliza el flujo CLI en su lugar:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

Eso ensaya candidatos duraderos con respaldo en el almacén de soñar a corto plazo mientras mantiene `DREAMS.md` como la superficie de revisión.

## Comportamiento detallado y fundamentación

<AccordionGroup>
  <Accordion title="0. Actualización opcional (instalaciones de git)">
    Si se trata de un checkout de git y doctor se está ejecutando de forma interactiva, se ofrece actualizar (fetch/rebase/build) antes de ejecutar doctor.
  </Accordion>
  <Accordion title="1. Normalización de la configuración">
    Si la configuración contiene formas de valores heredados (por ejemplo `messages.ackReaction` sin una anulación específica del canal), doctor los normaliza al esquema actual.

    Esto incluye los campos planos heredados de Talk. La configuración de habla pública actual de Talk es `talk.provider` + `talk.providers.<provider>`, y la configuración de voz en tiempo real es `talk.realtime.*`. Doctor reescribe las formas antiguas de `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` en el mapa de proveedores, y reescribe los selectores en tiempo real de nivel superior heredados (`talk.mode`, `talk.transport`, `talk.brain`, `talk.model`, `talk.voice`) en `talk.realtime`.

    Doctor también advierte cuando `plugins.allow` no está vacío y la política de herramientas utiliza
    entradas de comodín o herramientas propiedad de complementos. `tools.allow: ["*"]` solo coincide con herramientas
    de complementos que realmente se cargan; no evita la lista blanca exclusiva
    de complementos. Doctor escribe `plugins.bundledDiscovery: "compat"` para configuraciones heredadas
    de lista blanca migradas para preservar el comportamiento existente del proveedor agrupado, y
    luego señala la configuración más estricta de `"allowlist"`.

  </Accordion>
  <Accordion title="2. Migraciones de claves de configuración heredadas">
    Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden que ejecute `openclaw doctor`.

    Doctor hará lo siguiente:

    - Explicará qué claves heredadas se encontraron.
    - Mostrará la migración que aplicó.
    - Reescribirá `~/.openclaw/openclaw.json` con el esquema actualizado.

    El inicio del Gateway rechaza los formatos de configuración heredados y le pide que ejecute `openclaw doctor --fix`; no reescribe `openclaw.json` al iniciarse. Las migraciones del almacén de trabajos de Cron también son manejadas por `openclaw doctor --fix`.

    Migraciones actuales:

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
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
    - Para canales con `accounts` con nombre pero con valores de canal de nivel superior de una sola cuenta persistentes, mueva esos valores con ámbito de cuenta a la cuenta promovida elegida para ese canal (`accounts.default` para la mayoría de los canales; Matrix puede conservar un destino nombrado/predeterminado coincidente existente)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (herramientas/elevated/exec/sandbox/subagentes)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - eliminar `agents.defaults.llm`; use `models.providers.<id>.timeoutSeconds` para tiempos de espera lentos de proveedor/modelo, y mantenga el tiempo de espera del agente/ejecución por encima de ese valor cuando toda la ejecución deba durar más
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - eliminar `browser.relayBindHost` (configuración de relé de extensión heredada)
    - `models.providers.*.api: "openai"` heredado → `"openai-completions"` (el inicio de la puerta de enlace también omite los proveedores cuyo `api` está configurado en un valor de enumeración futuro o desconocido en lugar de fallar de forma cerrada)
    - eliminar `plugins.entries.codex.config.codexDynamicToolsProfile`; el servidor de aplicaciones de Codex siempre mantiene las herramientas del espacio de trabajo nativas de Codex como nativas

    Las advertencias de Doctor también incluyen orientación predeterminada de cuenta para canales multicuenta:

    - Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, doctor advierte que el enrutamiento de reserva puede elegir una cuenta inesperada.
    - Si `channels.<channel>.defaultAccount` está configurado en un ID de cuenta desconocido, doctor advierte y enumera los IDs de cuenta configurados.

  </Accordion>
  <Accordion title="2b. Invalidaciones del proveedor de OpenCode">
    Si ha añadido `models.providers.opencode`, `opencode-zen` o `opencode-go` manualmente, esto anula el catálogo integrado de OpenCode de `@earendil-works/pi-ai`. Eso puede forzar que los modelos usen la API incorrecta o reduzca los costes a cero. Doctor le avisa para que pueda eliminar la invalidación y restaurar el enrutamiento y los costes de la API por modelo.
  </Accordion>
  <Accordion title="2c. Migración del navegador y preparación para Chrome MCP">
    Si su configuración del navegador todavía apunta a la ruta eliminada de la extensión de Chrome, doctor la normaliza al modelo de conexión de Chrome MCP local del host actual:

    - `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
    - `browser.relayBindHost` se elimina

    Doctor también audita la ruta de Chrome MCP local del host cuando usa `defaultProfile: "user"` o un perfil `existing-session` configurado:

    - comprueba si Google Chrome está instalado en el mismo host para los perfiles de conexión automática predeterminados
    - comprueba la versión de Chrome detectada y avisa cuando es inferior a Chrome 144
    - le recuerda que habilite la depuración remota en la página de inspección del navegador (por ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging` o `edge://inspect/#remote-debugging`)

    Doctor no puede habilitar la configuración del lado de Chrome por usted. Chrome MCP local del host todavía requiere:

    - un navegador basado en Chromium 144+ en el host de puerta de enlace/nodo
    - que el navegador se esté ejecutando localmente
    - depuración remota habilitada en ese navegador
    - aprobar el primer mensaje de consentimiento de conexión en el navegador

    La preparación aquí se refiere solo a los requisitos previos de conexión local. La sesión existente mantiene los límites de ruta actuales de Chrome MCP; las rutas avanzadas como `responsebody`, exportación de PDF, interceptación de descargas y acciones por lotes todavía requieren un navegador administrado o un perfil CDP sin procesar.

    Esta comprobación **no** se aplica a Docker, sandbox, navegador remoto u otros flujos sin cabeza. Esos continúan usando CDP sin procesar.

  </Accordion>
  <Accordion title="2d. Requisitos previos de OAuth TLS">
    Cuando se configura un perfil OAuth de OpenAI Codex, doctor sondea el punto de conexión de autorización de OpenAI para verificar que la pila TLS local de Node/OpenSSL pueda validar la cadena de certificados. Si el sondeo falla con un error de certificado (por ejemplo `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificado caducado o certificado autofirmado), doctor imprime instrucciones de reparación específicas de la plataforma. En macOS con un Node de Homebrew, la solución suele ser `brew postinstall ca-certificates`. Con `--deep`, el sondeo se ejecuta incluso si la puerta de enlace está sana.
  </Accordion>
  <Accordion title="2e. Invalidaciones del proveedor OAuth de Codex">
    Si anteriormente agregó configuraciones de transporte heredadas de OpenAI bajo `models.providers.openai-codex`, pueden ensombrecer la ruta del proveedor OAuth de Codex integrada que las versiones más recientes usan automáticamente. Doctor advierte cuando detecta esas configuraciones de transporte antiguas junto con OAuth de Codex para que pueda eliminar o reescribir la invalidación de transporte obsoleta y recuperar el comportamiento de enrutamiento/respaldo integrado. Los proxies personalizados y las invalidaciones solo de encabezado siguen siendo compatibles y no activan esta advertencia.
  </Accordion>
  <Accordion title="2f. Reparación de ruta de Codex">
    Doctor comprueba si hay referencias de modelo `openai-codex/*` heredadas. El enrutamiento del arnés de Codex nativo utiliza referencias de modelo `openai/*` canónicas; los giros del agente de OpenAI pasan a través del arnés del servidor de aplicaciones de Codex en lugar de la ruta de OpenAI de OpenClaw PI.

    En el modo `--fix` / `--repair`, doctor reescribe las referencias afectadas del agente predeterminado y por agente, incluyendo modelos principales, alternativos, anulaciones de latido/subagente/compactación, enlaces, anulaciones del modelo de canal y el estado de ruta de sesión persistente obsoleto:

    - `openai-codex/gpt-*` se convierte en `openai/gpt-*`.
    - La intención de Codex se mueve a entradas `agentRuntime.id: "codex"` con ámbito de proveedor/modelo para las referencias de modelo de agente reparadas, de modo que los perfiles de autenticación `openai-codex:...` aún puedan seleccionarse después de que la referencia del modelo se convierta en `openai/*`.
    - Se eliminan la configuración de tiempo de ejecución de todo el agente obsoleta y los pines de tiempo de ejecución de sesión persistente porque la selección de tiempo de ejecución tiene ámbito de proveedor/modelo.
    - La política de tiempo de ejecución de proveedor/modelo existente se preserva, a menos que la referencia de modelo heredada reparada necesite enrutamiento Codex para mantener la ruta de autenticación anterior.
    - Las listas de modelos de respaldo existentes se conservan con sus entradas heredadas reescritas; la configuración copiada por modelo se mueve de la clave heredada a la clave canónica `openai/*`.
    - Se reparan la sesión persistente `modelProvider`/`providerOverride`, `model`/`modelOverride`, los avisos de respaldo y los pines de perfil de autenticación en todos los almacenes de sesión de agente descubiertos.
    - `/codex ...` significa "controlar o vincular una conversación nativa de Codex desde el chat."
    - `/acp ...` o `runtime: "acp"` significa "usar el adaptador externo ACP/acpx."

  </Accordion>
  <Accordion title="2g. Limpieza de la ruta de sesión">
    Doctor también escanea los almacenes de sesión del agente descubiertos en busca de estados de ruta creados automáticamente y obsoletos después de mover los modelos configurados o el tiempo de ejecución lejos de una ruta propiedad de un complemento como Codex.

    `openclaw doctor --fix` puede borrar el estado obsoleto creado automáticamente, como fijaciones de modelos `modelOverrideSource: "auto"`, metadatos del modelo de tiempo de ejecución, identificadores de arnés fijados, enlaces de sesión de CLI y anulaciones de perfil de autenticación automática, cuando su ruta propietaria ya no está configurada. Las selecciones explícitas de modelos de sesión por parte del usuario o heredadas se reportan para su revisión manual y se dejan intactas; cámbielas con `/model ...`, `/new`, o restablezca la sesión cuando esa ruta ya no sea la prevista.

  </Accordion>
  <Accordion title="3. Migraciones de estado heredado (diseño de disco)">
    Doctor puede migrar diseños de disco antiguos a la estructura actual:

    - Almacén de sesiones + transcripciones:
      - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
    - Directorio del agente:
      - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
    - Estado de autenticación de WhatsApp (Baileys):
      - de `~/.openclaw/credentials/*.json` heredado (excepto `oauth.json`)
      - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (id de cuenta predeterminado: `default`)

    Estas migraciones se realizan con el mejor esfuerzo y son idempotentes; doctor emitirá advertencias cuando deje carpetas heredadas como copias de seguridad. Gateway/CLI también migra automáticamente las sesiones heredadas + el directorio del agente al inicio para que el historial/autenticación/modelos aterricen en la ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo a través de `openclaw doctor`. La normalización del proveedor de Talk / mapa de proveedores ahora compara por igualdad estructural, por lo que las diferencias solo en el orden de las claves ya no activan cambios `doctor --fix` repetidos sin operación.

  </Accordion>
  <Accordion title="3a. Migraciones de manifiesto de complementos heredados">
    Doctor escanea todos los manifiestos de complementos instalados en busca de claves de capacidades de nivel superior obsoletas (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Cuando se encuentran, ofrece moverlas al objeto `contracts` y reescribir el archivo de manifiesto en el lugar. Esta migración es idempotente; si la clave `contracts` ya tiene los mismos valores, la clave heredada se elimina sin duplicar los datos.
  </Accordion>
  <Accordion title="3b. Migraciones del almacén de cron heredado">
    Doctor también verifica el almacén de trabajos de cron (`~/.openclaw/cron/jobs.json` por defecto, o `cron.store` cuando se anula) en busca de formas de trabajo antiguas que el planificador aún acepta por compatibilidad.

    Las limpiezas de cron actuales incluyen:

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
    - campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - alias de entrega `provider` de carga útil → `delivery.channel` explícita
    - trabajos de respaldo de webhook heredados `notify: true` simples → `delivery.mode="webhook"` explícito con `delivery.to=cron.webhook`

    Doctor solo migra automáticamente los trabajos `notify: true` cuando puede hacerlo sin cambiar el comportamiento. Si un trabajo combina el respaldo de notificación heredado con un modo de entrega que no sea webhook existente, doctor advierte y deja ese trabajo para su revisión manual.

    En Linux, doctor también advierte cuando el crontab del usuario aún invoca el `~/.openclaw/bin/ensure-whatsapp.sh` heredado. Ese script local del host no es mantenido por el OpenClaw actual y puede escribir mensajes `Gateway inactive` falsos en `~/.openclaw/logs/whatsapp-health.log` cuando cron no puede alcanzar el bus de usuario de systemd. Elimine la entrada de crontab obsoleta con `crontab -e`; use `openclaw channels status --probe`, `openclaw doctor` y `openclaw gateway status` para las comprobaciones de salud actuales.

  </Accordion>
  <Accordion title="3c. Limpieza de bloqueos de sesión">
    Doctor escanea cada directorio de sesión del agente en busca de archivos de bloqueo de escritura obsoletos (stale) — archivos que quedaron cuando una sesión finalizó de manera anormal. Por cada archivo de bloqueo encontrado, informa: la ruta, el PID, si el PID sigue vivo, la antigüedad del bloqueo y si se considera obsoleto (PID muerto, anterior a 30 minutos, o un PID vivo que se pueda probar que pertenece a un proceso que no es de OpenClaw). En el modo `--fix` / `--repair` elimina automáticamente los archivos de bloqueo obsoletos; de lo contrario, imprime una nota y le instruye para que vuelva a ejecutar con `--fix`.
  </Accordion>
  <Accordion title="3d. Reparación de rama de transcripción de sesión">
    Doctor escanea los archivos JSONL de sesión del agente en busca de la forma de rama duplicada creada por el error de reescritura de transcripción de instrucciones del 2026.4.24: un turno de usuario abandonado con el contexto de tiempo de ejecución interno de OpenClaw más un hermano activo que contiene la misma instrucción de usuario visible. En el modo `--fix` / `--repair`, doctor hace una copia de seguridad de cada archivo afectado junto al original y reescribe la transcripción a la rama activa para que los lectores del historial y la memoria de la puerta de enlace ya no vean turnos duplicados.
  </Accordion>
  <Accordion title="4. Verificaciones de integridad del estado (persistencia de sesión, enrutamiento y seguridad)">
    El directorio de estado es el tronco encefálico operativo. Si desaparece, pierdes las sesiones, las credenciales, los registros y la configuración (a menos que tengas copias de seguridad en otro lugar).

    Doctor verifica:

    - **State dir missing**: advierte sobre una pérdida catastrófica del estado, solicita recrear el directorio y recuerda que no puede recuperar los datos perdidos.
    - **State dir permissions**: verifica la escritura; ofrece reparar los permisos (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
    - **macOS cloud-synced state dir**: advierte cuando el estado se resuelve bajo iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta y carreras de bloqueo/sincronización.
    - **Linux SD o eMMC state dir**: advierte cuando el estado se resuelve en una fuente de montaje `mmcblk*`, porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse más rápido con las escrituras de sesión y credenciales.
    - **Session dirs missing**: `sessions/` y el directorio de almacenamiento de sesiones son necesarios para persistir el historial y evitar fallos `ENOENT`.
    - **Transcript mismatch**: advierte cuando las entradas de sesión recientes tienen archivos de transcripción perdidos.
    - **Main session "1-line JSONL"**: marca cuando la transcripción principal tiene solo una línea (el historial no se está acumulando).
    - **Multiple state dirs**: advierte cuando existen múltiples carpetas `~/.openclaw` en los directorios principales o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede dividirse entre instalaciones).
    - **Remote mode reminder**: si `gateway.mode=remote`, doctor te recuerda que lo ejecutes en el host remoto (el estado reside allí).
    - **Config file permissions**: advierte si `~/.openclaw/openclaw.json` es legible por el grupo/mundo y ofrece restringirlo a `600`.

  </Accordion>
  <Accordion title="5. Estado de autenticación del modelo (expiración de OAuth)">
    Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están por expirar o expirados, y puede actualizarlos cuando sea seguro. Si el perfil de OAuth/token de Anthropic está obsoleto, sugiere una clave de API de Anthropic o la ruta del token de configuración de Anthropic. Las solicitudes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive` omite los intentos de actualización.

    Cuando una actualización de OAuth falla permanentemente (por ejemplo `refresh_token_reused`, `invalid_grant`, o un proveedor que te indica que vuelvas a iniciar sesión), doctor informa que se requiere volver a autenticarse e imprime el comando exacto `openclaw models auth login --provider ...` a ejecutar.

    Doctor también informa de los perfiles de autenticación que están temporalmente inutilizables debido a:

    - períodos de enfriamiento cortos (límites de tasa/tiempos de espera/fallos de autenticación)
    - deshabilitaciones más largas (fallos de facturación/crédito)

    Los perfiles de OAuth de Codex heredados cuyos tokens residen en el Llavero de macOS (incorporación anterior antes del diseño sidecar basado en archivos) no son detectados por la ruta de tiempo de ejecución integrada; esa ruta se ejecuta con `allowKeychainPrompt: false` y no puede activar un aviso del Llavero. Ejecuta `openclaw doctor --fix` una vez para migrar los tokens heredados respaldados por el Llavero en línea dentro de `auth-profiles.json`; después de eso, los turnos integrados (Telegram, cron, despacho de subagentes) los resuelven como cualquier otro perfil de OAuth en línea.

  </Accordion>
  <Accordion title="6. Validación del modelo de Hooks">
    Si `hooks.gmail.model` está configurado, doctor valida la referencia del modelo contra el catálogo y la lista de permitidos (allowlist) y advierte cuando no se resolverá o no está permitido.
  </Accordion>
  <Accordion title="7. Reparación de imagen de Sandbox">
    Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece construirlas o cambiar a nombres heredados si falta la imagen actual.
  </Accordion>
  <Accordion title="7b. Limpieza de instalación de complementos">
    Doctor elimina el estado de preparación de dependencias de complementos generado por OpenClaw en modo `openclaw doctor --fix` / `openclaw doctor --repair`. Esto cubre las raíces de dependencias generadas obsoletas, los directorios de instalación antiguos, los escombros locales del paquete del código anterior de reparación de dependencias de complementos empaquetados y las copias administradas de npm huérfanas o recuperadas de complementos `@openclaw/*` empaquetados que pueden ocultar el manifiesto empaquetado actual. Doctor también vuelve a vincular el paquete anfitrión `openclaw` en los complementos administrados de npm que declaran `peerDependencies.openclaw`, por lo que las importaciones de tiempo de ejecución locales del paquete, como `openclaw/plugin-sdk/*`, siguen resolviéndose después de las actualizaciones o reparaciones de npm.

    Doctor también puede reinstalar complementos descargables que faltan cuando la configuración los referencia pero el registro local de complementos no puede encontrarlos. Los ejemplos incluyen `plugins.entries` material, la configuración de canal/proveedor/búsqueda configurada y los tiempos de ejecución del agente configurados. Durante las actualizaciones de paquetes, doctor evita ejecutar la reparación de complementos del administrador de paquetes mientras se está intercambiando el paquete principal; ejecute `openclaw doctor --fix` nuevamente después de la actualización si un complemento configurado aún necesita recuperación. El inicio de Gateway y la recarga de la configuración no ejecutan administradores de paquetes; las instalaciones de complementos siguen siendo un trabajo explícito de doctor/install/update.

  </Accordion>
  <Accordion title="8. Migraciones de servicios de Gateway y sugerencias de limpieza">
    Doctor detecta los servicios de puerta de enlace heredados (launchd/systemd/schtasks) y ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto de puerta de enlace actual. También puede escanear servicios adicionales similares a la puerta de enlace e imprimir sugerencias de limpieza. Los servicios de puerta de enlace de OpenClaw con nombre de perfil se consideran de primera clase y no se marcan como "adicionales."

    En Linux, si falta el servicio de puerta de enlace a nivel de usuario pero existe un servicio de puerta de enlace de OpenClaw a nivel de sistema, doctor no instala automáticamente un segundo servicio a nivel de usuario. Inspeccione con `openclaw gateway status --deep` o `openclaw doctor --deep`, luego elimine el duplicado o establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando un supervisor del sistema sea el propietario del ciclo de vida de la puerta de enlace.

  </Accordion>
  <Accordion title="8b. Migración de Matrix al inicio">
    Cuando una cuenta de canal de Matrix tiene una migración de estado heredada pendiente o procesable, doctor (en modo `--fix` / `--repair`) crea una instantánea de pre-migración y luego ejecuta los pasos de migración de mejor esfuerzo: migración de estado heredado de Matrix y preparación de estado cifrado heredado. Ambos pasos no son fatales; los errores se registran y el inicio continúa. En modo de solo lectura (`openclaw doctor` sin `--fix`) esta verificación se omite por completo.
  </Accordion>
  <Accordion title="8c. Emparejamiento de dispositivos y deriva de autenticación">
    Doctor ahora inspecciona el estado de emparejamiento de dispositivos como parte del pase de salud normal.

    Lo que informa:

    - solicitudes de emparejamiento por primera vez pendientes
    - actualizaciones de rol pendientes para dispositivos ya emparejados
    - actualizaciones de alcance pendientes para dispositivos ya emparejados
    - reparaciones de desajuste de clave pública donde la ID del dispositivo todavía coincide pero la identidad del dispositivo ya no coincide con el registro aprobado
    - registros emparejados que carecen de un token activo para un rol aprobado
    - tokens emparejados cuyos alcances se derivan fuera de la línea base de emparejamiento aprobada
    - entradas de token de dispositivo almacenadas en caché localmente para la máquina actual que son anteriores a una rotación de tokens en el lado de la puerta de enlace o contienen metadatos de alcance obsoletos

    Doctor no aprueba automáticamente las solicitudes de emparejamiento ni rota automáticamente los tokens de dispositivo. En su lugar, imprime los siguientes pasos exactos:

    - inspeccionar solicitudes pendientes con `openclaw devices list`
    - aprobar la solicitud exacta con `openclaw devices approve <requestId>`
    - rotar un token nuevo con `openclaw devices rotate --device <deviceId> --role <role>`
    - eliminar y volver a aprobar un registro obsoleto con `openclaw devices remove <deviceId>`

    Esto cierra el agujero común de "ya emparejado pero aún requiriendo emparejamiento": doctor ahora distingue el emparejamiento por primera vez de las actualizaciones de rol/alcance pendientes y de la deriva de token/identidad de dispositivo obsoleta.

  </Accordion>
  <Accordion title="9. Advertencias de seguridad">
    Doctor emite advertencias cuando un proveedor está abierto a MDs sin una lista de permitidos, o cuando una política está configurada de manera peligrosa.
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    Si se ejecuta como un servicio de usuario de systemd, doctor se asegura de que lingering esté habilitado para que la puerta de enlace permanezca activa después de cerrar la sesión.
  </Accordion>
  <Accordion title="11. Estado del área de trabajo (habilidades, complementos y directorios heredados)">
    Doctor imprime un resumen del estado del área de trabajo para el agente predeterminado:

    - **Estado de las habilidades**: cuenta las habilidades elegibles, con requisitos faltantes y bloqueadas por la lista de permitidos.
    - **Directorios heredados del área de trabajo**: advierte cuando `~/openclaw` u otros directorios de área de trabajo heredados existen junto con el área de trabajo actual.
    - **Estado de los complementos**: cuenta los complementos habilitados/deshabilitados/con errores; enumera los ID de los complementos para cualquier error; informa sobre las capacidades del complemento de paquete.
    - **Advertencias de compatibilidad de complementos**: marca los complementos que tienen problemas de compatibilidad con el tiempo de ejecución actual.
    - **Diagnósticos de complementos**: expone cualquier advertencia o error en tiempo de carga emitido por el registro de complementos.

  </Accordion>
  <Accordion title="11b. Tamaño del archivo de arranque">
    Doctor comprueba si los archivos de arranque del área de trabajo (por ejemplo `AGENTS.md`, `CLAUDE.md` u otros archivos de contexto inyectados) están cerca o por encima del presupuesto de caracteres configurado. Informa los recuentos de caracteres brutos frente a los inyectados por archivo, el porcentaje de truncamiento, la causa del truncamiento (`max/file` o `max/total`) y el total de caracteres inyectados como fracción del presupuesto total. Cuando los archivos se truncan o están cerca del límite, doctor imprime consejos para ajustar `agents.defaults.bootstrapMaxChars` y `agents.defaults.bootstrapTotalMaxChars`.
  </Accordion>
  <Accordion title="11d. Limpieza de complementos de canal obsoletos">
    Cuando `openclaw doctor --fix` elimina un complemento de canal faltante, también elimina la configuración de alcance de canal huérfana que hacía referencia a ese complemento: entradas `channels.<id>`, objetivos de latido que nombraban el canal y anulaciones `agents.*.models["<channel>/*"]`. Esto evita bucles de arranque de Gateway donde el tiempo de ejecución del canal ya no existe pero la configuración aún solicita a la puerta de enlace que se enlace a él.
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor verifica si el completado por tabulación está instalado para el shell actual (zsh, bash, fish o PowerShell):

    - Si el perfil del shell usa un patrón de completado dinámico lento (`source <(openclaw completion ...)`), doctor lo actualiza a la variante de archivo en caché más rápida.
    - Si el completado está configurado en el perfil pero falta el archivo de caché, doctor regenera la caché automáticamente.
    - Si no hay ningún completado configurado, doctor solicita instalarlo (solo en modo interactivo; se omite con `--non-interactive`).

    Ejecute `openclaw completion --write-state` para regenerar la caché manualmente.

  </Accordion>
  <Accordion title="12. Gateway auth checks (local token)">
    Doctor verifica la preparación de autenticación del token de puerta de enlace local.

    - Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
    - Si `gateway.auth.token` está gestionado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto sin formato.
    - `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

  </Accordion>
  <Accordion title="12b. Read-only SecretRef-aware repairs">
    Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de fallo rápido en tiempo de ejecución.

    - `openclaw doctor --fix` ahora utiliza el mismo modelo de resumen de SecretRef de solo lectura que los comandos de la familia de estado para reparaciones de configuración dirigidas.
    - Ejemplo: la reparación `allowFrom` / `groupAllowFrom` `@username` de Telegram intenta utilizar las credenciales del bot configuradas cuando están disponibles.
    - Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta del comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de bloquearse o informar erróneamente que falta el token.

  </Accordion>
  <Accordion title="13. Verificación de estado de Gateway + reinicio">
    Doctor ejecuta una verificación de estado y ofrece reiniciar la puerta de enlace cuando parece poco saludable.
  </Accordion>
  <Accordion title="13b. Preparación de la búsqueda de memoria">
    Doctor comprueba si el proveedor de incrustación de búsqueda de memoria configurado está listo para el agente predeterminado. El comportamiento depende del backend y del proveedor configurados:

    - **Backend QMD**: sondea si el binario `qmd` está disponible y se puede iniciar. Si no, imprime orientación de solución que incluye el paquete npm y una opción de ruta de binario manual.
    - **Proveedor local explícito**: comprueba si hay un archivo de modelo local o una URL de modelo remoto/descargable reconocida. Si falta, sugiere cambiar a un proveedor remoto.
    - **Proveedor remoto explícito** (`openai`, `voyage`, etc.): verifica si hay una clave API presente en el entorno o en el almacén de autenticación. Imprime sugerencias de solución accionables si falta.
    - **Proveedor automático**: comprueba primero la disponibilidad del modelo local y luego intenta cada proveedor remoto en orden de selección automática.

    Cuando hay disponible un resultado de sondeo de puerta de enlace en caché (la puerta de enlace estaba sana en el momento de la comprobación), doctor cruza su resultado con la configuración visible en la CLI y señala cualquier discrepancia. Doctor no inicia un ping de incrustación nuevo en la ruta predeterminada; use el comando de estado de memoria profundo cuando desee una comprobación en vivo del proveedor.

    Use `openclaw memory status --deep` para verificar la preparación de incrustación en tiempo de ejecución.

  </Accordion>
  <Accordion title="14. Advertencias del estado del canal">
    Si la pasarela está sana, doctor ejecuta un sondeo del estado del canal e informa advertencias con soluciones sugeridas.
  </Accordion>
  <Accordion title="15. Auditoría y reparación de la configuración del supervisor">
    Doctor verifica la configuración del supervisor instalada (launchd/systemd/schtasks) en busca de valores predeterminados faltantes o obsoletos (por ejemplo, dependencias de red en línea de systemd y retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede reescribir el archivo de servicio/tarea con los valores predeterminados actuales.

    Notas:

    - `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
    - `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
    - `openclaw doctor --fix` aplica las correcciones recomendadas sin solicitar confirmación (`--repair` es un alias).
    - `openclaw doctor --fix --force` sobrescribe las configuraciones personalizadas del supervisor.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` mantiene el doctor en modo de solo lectura para el ciclo de vida del servicio de puerta de enlace. Todavía informa el estado del servicio y ejecuta reparaciones que no son del servicio, pero omite la instalación/inicio/reinicio/inicialización del servicio, las reescrituras de la configuración del supervisor y la limpieza de servicios heredados porque un supervisor externo posee ese ciclo de vida.
    - En Linux, el doctor no reescribe los metadatos de comando/punto de entrada mientras la unidad de puerta de enlace systemd coincidente está activa. También ignora las unidades adicionales similares a la puerta de enlace no heredadas e inactivas durante el escaneo de servicios duplicados para que los archivos de servicio complementarios no generen ruido de limpieza.
    - Si la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, la instalación/reparación del servicio del doctor valida el SecretRef pero no persiste los valores de token de texto plano resueltos en los metadatos del entorno del servicio del supervisor.
    - El doctor detecta los valores de entorno del servicio respaldados por `.env`/SecretRef administrados que las instalaciones antiguas de LaunchAgent, systemd o Tarea programada de Windows incrustaron en línea y reescribe los metadatos del servicio para que esos valores se carguen desde la fuente de ejecución en lugar de la definición del supervisor.
    - El doctor detecta cuándo el comando del servicio aún fija un puerto `--port` antiguo después de cambios `gateway.port` y reescribe los metadatos del servicio al puerto actual.
    - Si la autenticación por token requiere un token y el token SecretRef configurado no está resuelto, el doctor bloquea la ruta de instalación/reparación con orientación práctica.
    - Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está configurado, el doctor bloquea la instalación/reparación hasta que el modo se establezca explícitamente.
    - Para las unidades user-systemd de Linux, las comprobaciones de deriva de tokens del doctor ahora incluyen tanto las fuentes `Environment=` como `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
    - Las reparaciones del servicio del doctor se niegan a reescribir, detener o reiniciar un servicio de puerta de enlace desde un binario OpenClaw anterior cuando la configuración fue escrita por última vez por una versión más reciente. Consulte [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - Siempre puede forzar una reescritura completa mediante `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="16. Diagnósticos del tiempo de ejecución y puerto de Gateway">
    Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También verifica si hay colisiones de puertos en el puerto de gateway (predeterminado `18789`) e informa de las causas probables (gateway ya ejecutándose, túnel SSH).
  </Accordion>
  <Accordion title="17. Mejores prácticas del tiempo de ejecución de Gateway">
    Doctor advierte cuando el servicio gateway se ejecuta en Bun o en una ruta de Node administrada por versiones (`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp y Telegram requieren Node, y las rutas de administradores de versiones pueden romperse después de las actualizaciones porque el servicio no carga la inicialización de su shell. Doctor ofrece migrar a una instalación del sistema Node cuando está disponible (Homebrew/apt/choco).

    Los LaunchAgents de macOS recién instalados o reparados utilizan una RUTA del sistema canónica (`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`) en lugar de copiar la RUTA del shell interactivo, por lo que los binarios del sistema administrados por Homebrew permanecen disponibles, mientras que los directorios de Volta, asdf, fnm, pnpm y otros administradores de versiones no cambian qué procesos secundarios de Node se resuelven. Los servicios de Linux aún mantienen raíces de entorno explícitas (`NVM_DIR`, `FNM_DIR`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `BUN_INSTALL`, `PNPM_HOME`) y directorios de usuario-bin estables, pero los directorios de reserva del administrador de versiones supuestos solo se escriben en la RUTA del servicio cuando esos directorios existen en el disco.

  </Accordion>
  <Accordion title="18. Escritura de configuración + metadatos del asistente">
    Doctor persiste cualquier cambio de configuración y marca los metadatos del asistente para registrar la ejecución del doctor.
  </Accordion>
  <Accordion title="19. Consejos del espacio de trabajo (copia de seguridad + sistema de memoria)">
    Doctor sugiere un sistema de memoria del espacio de trabajo cuando falta e imprime un consejo de copia de seguridad si el espacio de trabajo aún no está bajo git.

    Consulte [/concepts/agent-workspace](/es/concepts/agent-workspace) para obtener una guía completa sobre la estructura del espacio de trabajo y la copia de seguridad con git (se recomienda GitHub o GitLab privados).

  </Accordion>
</AccordionGroup>

## Relacionado

- [Manual de procedimientos de Gateway](/es/gateway)
- [Solución de problemas de Gateway](/es/gateway/troubleshooting)
