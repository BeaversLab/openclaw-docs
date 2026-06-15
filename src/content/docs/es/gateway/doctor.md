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
  <Accordion title="Config and migrations">
    - Config normalization for legacy values.
    - Talk config migration from legacy flat `talk.*` fields into `talk.provider` + `talk.providers.<provider>`.
    - Browser migration checks for legacy Chrome extension configs and Chrome MCP readiness.
    - OpenCode provider override warnings (`models.providers.opencode` / `models.providers.opencode-go`).
    - Legacy OpenAI Codex provider/profile migration (`openai-codex` → `openai`) and shadowing warnings for stale `models.providers.openai-codex`.
    - OAuth TLS prerequisites check for OpenAI Codex OAuth profiles.
    - Plugin/tool allowlist warnings when `plugins.allow` is restrictive but tool policy still asks for wildcard or plugin-owned tools.
    - Legacy on-disk state migration (sessions/agent dir/WhatsApp auth).
    - Legacy plugin manifest contract key migration (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Legacy cron store migration (`jobId`, `schedule.cron`, top-level delivery/payload fields, payload `provider`, `notify: true` webhook fallback jobs).
    - Legacy whole-agent runtime-policy cleanup; provider/model runtime policy is the active route selector.
    - Stale plugin config cleanup when plugins are enabled; when `plugins.enabled=false`, stale plugin references are treated as inert containment config and are preserved.

  </Accordion>
  <Accordion title="Estado e integridad">
    - Inspección del archivo de bloqueo de sesión y limpieza de bloqueos obsoletos.
    - Reparación de la transcripción de la sesión para ramas duplicadas de reescritura de prompts creadas por las versiones afectadas de 2026.4.24.
    - Detección de lápidas de recuperación de reinicio de subagentes bloqueados, con `--fix` soporte para borrar indicadores obsoletos de recuperación abortada para que el inicio no siga tratando al proceso secundario como reinicio-abortado.
    - Verificaciones de integridad y permisos de estado (sesiones, transcripciones, directorio de estado).
    - Verificaciones de permisos de archivos de configuración (chmod 600) al ejecutarse localmente.
    - Estado de autenticación del modelo: verifica la caducidad de OAuth, puede actualizar los tokens que caducan e informa de los estados de perfil de autenticación en enfriamiento/deshabilitado.
    - Detección de directorios de espacio de trabajo adicionales (`~/openclaw`).

  </Accordion>
  <Accordion title="Gateway, servicios y supervisores">
    - Reparación de imágenes de sandbox cuando el sandboxing está habilitado.
    - Migración de servicios heredados y detección de gateways adicionales.
    - Migración de estado heredado del canal Matrix (en modo `--fix` / `--repair`).
    - Verificaciones de tiempo de ejecución del Gateway (servicio instalado pero no en ejecución; etiqueta launchd en caché).
    - Advertencias de estado del canal (sondeadas desde el gateway en ejecución).
    - Las verificaciones de permisos específicas del canal se encuentran en `openclaw channels capabilities`; por ejemplo, los permisos del canal de voz de Discord se auditan con `openclaw channels capabilities --channel discord --target channel:<channel-id>`.
    - Verificaciones de capacidad de respuesta de WhatsApp para la salud degradada del bucle de eventos del Gateway con clientes TUI locales aún en ejecución; `--fix` detiene solo los clientes TUI locales verificados.
    - Reparación de rutas de Codex para referencias de modelos `openai-codex/*` heredadas en modelos principales, respaldos, modelos de generación de imágenes/vídeo, anulaciones de heartbeat/subagente/compacción, ganchos, anulaciones de modelos de canal y pines de rutas de sesión; `--fix` las reescribe a `openai/*`, migra perfiles/orden de autenticación `openai-codex:*` a `openai:*`, elimina pines de tiempo de ejecución de sesión/agente completo obsoletos y deja referencias canónicas de agente OpenAI en el arnés Codex predeterminado.
    - Auditoría de configuración del supervisor (launchd/systemd/schtasks) con reparación opcional.
    - Limpieza del entorno de proxy integrado para servicios de gateway que capturaron valores de shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` durante la instalación o actualización.
    - Verificaciones de mejores prácticas de tiempo de ejecución del Gateway (Node vs Bun, rutas de gestor de versiones).
    - Diagnósticos de colisión de puertos del Gateway (predeterminado `18789`).

  </Accordion>
  <Accordion title="Auth, seguridad y emparejamiento">
    - Advertencias de seguridad para políticas de DM abiertas.
    - Verificaciones de autenticación del gateway para el modo de token local (ofrece generación de token cuando no existe una fuente de token; no sobrescribe las configuraciones de SecretRef de token).
    - Detección de problemas de emparejamiento de dispositivos (solicitudes de primer emparejamiento pendientes, actualizaciones de rol/alcance pendientes, deriva de caché de token de dispositivo local obsoleto y deriva de autenticación de registro emparejado).

  </Accordion>
  <Accordion title="Workspace y shell">
    - Verificación de persistencia de systemd en Linux.
    - Verificación del tamaño del archivo de arranque del espacio de trabajo (advertencias de truncamiento/cerca del límite para archivos de contexto).
    - Verificación de preparación de habilidades para el agente predeterminado; informa habilidades permitidas con bins, env, config o requisitos de OS faltantes, y `--fix` puede deshabilitar habilidades no disponibles en `skills.entries`.
    - Verificación del estado de finalización de shell y auto-instalación/actualización.
    - Verificación de preparación del proveedor de incrustación para búsqueda de memoria (modelo local, clave de API remota o binario QMD).
    - Verificaciones de instalación desde código fuente (discordancia de espacio de trabajo pnpm, activos de UI faltantes, binario tsx faltante).
    - Escribe configuración actualizada + metadatos del asistente.

  </Accordion>
</AccordionGroup>

## Relleno y restablecimiento de Dreams UI

La escena Dreams de la interfaz de usuario de Control incluye las acciones **Backfill** (Rellenar), **Reset** (Restablecer) y **Clear Grounded** (Limpiar anclado) para el flujo de trabajo de soñado anclado. Estas acciones utilizan métodos RPC de estilo doctor de gateway, pero **no** son parte de la reparación/migración de la CLI de `openclaw doctor`.

Lo que hacen:

- **Backfill** escanea archivos históricos de `memory/YYYY-MM-DD.md` en el espacio de trabajo activo, ejecuta el pase de diario REM anclado y escribe entradas de relleno reversibles en `DREAMS.md`.
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

Eso prepara candidatos duraderos anclados en el almacén de soñado a corto plazo mientras mantiene `DREAMS.md` como la superficie de revisión.

## Comportamiento detallado y fundamentación

<AccordionGroup>
  <Accordion title="0. Actualización opcional (instalaciones de git)">
    Si se trata de un checkout de git y doctor se está ejecutando de forma interactiva, se ofrece actualizar (fetch/rebase/build) antes de ejecutar doctor.
  </Accordion>
  <Accordion title="1. Normalización de la configuración">
    Si la configuración contiene formas de valores heredadas (por ejemplo `messages.ackReaction` sin una invalidación específica del canal), doctor las normaliza al esquema actual.

    Eso incluye campos planos heredados de Talk. La configuración pública actual de voz de Talk es `talk.provider` + `talk.providers.<provider>`, y la configuración de voz en tiempo real es `talk.realtime.*`. Doctor reescribe las formas antiguas `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` en el mapa de proveedores, y reescribe los selectores en tiempo real de nivel superior heredados (`talk.mode`, `talk.transport`, `talk.brain`, `talk.model`, `talk.voice`) en `talk.realtime`.

    Doctor también advierte cuando `plugins.allow` no está vacío y la política de herramientas utiliza
    entradas de herramientas comodín o propiedad de complementos. `tools.allow: ["*"]` solo coincide con herramientas
    de complementos que realmente se cargan; no omite la lista blanca exclusiva de
    complementos.

  </Accordion>
  <Accordion title="2. Migraciones de claves de configuración heredadas">
    Cuando la configuración contiene claves obsoletas, otros comandos se niegan a ejecutarse y le piden que ejecute `openclaw doctor`.

    Doctor hará lo siguiente:

    - Explicar qué claves heredadas se encontraron.
    - Mostrar la migración que aplicó.
    - Reescribir `~/.openclaw/openclaw.json` con el esquema actualizado.

    El inicio de Gateway rechaza los formatos de configuración heredados y le pide que ejecute `openclaw doctor --fix`; no reescribe `openclaw.json` al iniciarse. Las migraciones de la tienda de trabajos de Cron también son manejadas por `openclaw doctor --fix`.

    Migraciones actuales:

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - eliminar `channels.webchat` y `gateway.webchat` retirados
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → `bindings` de nivel superior
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` heredados → `talk.provider` + `talk.providers.<provider>`
    - selectores de Talk en tiempo real de nivel superior heredados (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` y `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` y `messages.tts.providers.microsoft`
    - Campos de selección de altavoz TTS (`voice`/`voiceName`/`voiceId`) → `speakerVoice`/`speakerVoiceId`
    - `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` y `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` y `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - Para canales con `accounts` con nombre pero con valores de canal de nivel superior de cuenta única persistentes, mueva esos valores con alcance de cuenta a la cuenta promovida elegida para ese canal (`accounts.default` para la mayoría de los canales; Matrix puede conservar un objetivo con nombre/predeterminado coincidente existente)
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - eliminar `agents.defaults.llm`; use `models.providers.<id>.timeoutSeconds` para tiempos de espera lentos del proveedor/modelo, y mantenga el tiempo de espera del agente/ejecución por encima de ese valor cuando toda la ejecución deba durar más tiempo
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - eliminar `browser.relayBindHost` (configuración de relé de extensión heredada)
    - `models.providers.*.api: "openai"` heredado → `"openai-completions"` (el inicio de la puerta de enlace también omite los proveedores cuyo `api` está establecido en un valor de enumeración futuro o desconocido en lugar de fallar de forma cerrada)
    - eliminar `plugins.entries.codex.config.codexDynamicToolsProfile`; Codex app-server siempre mantiene las herramientas del espacio de trabajo nativas de Codex como nativas

    Las advertencias de Doctor también incluyen orientación predeterminada de cuenta para canales multicuenta:

    - Si se configuran dos o más entradas `channels.<channel>.accounts` sin `channels.<channel>.defaultAccount` o `accounts.default`, doctor advierte que el enrutamiento de reserva puede elegir una cuenta inesperada.
    - Si `channels.<channel>.defaultAccount` se establece en un ID de cuenta desconocido, doctor advierte y enumera los ID de cuenta configurados.

  </Accordion>
  <Accordion title="2b. Anulaciones del proveedor OpenCode">
    Si ha agregado `models.providers.opencode`, `opencode-zen` o `opencode-go` manualmente, esto anula el catálogo integrado de OpenCode de `openclaw/plugin-sdk/llm`. Eso puede forzar modelos en la API incorrecta o reducir costos a cero. Doctor advierte para que pueda eliminar la anulación y restaurar el enrutamiento de API por modelo + costos.
  </Accordion>
  <Accordion title="2c. Migración del navegador y preparación para Chrome MCP">
    Si la configuración de su navegador todavía apunta a la ruta eliminada de la extensión de Chrome, doctor la normaliza al modelo de conexión local de Chrome MCP actual:

    - `browser.profiles.*.driver: "extension"` se convierte en `"existing-session"`
    - `browser.relayBindHost` se elimina

    Doctor también audita la ruta local de Chrome MCP cuando usa `defaultProfile: "user"` o un perfil `existing-session` configurado:

    - verifica si Google Chrome está instalado en el mismo host para perfiles de autoconexión predeterminados
    - verifica la versión de Chrome detectada y advierte cuando está por debajo de Chrome 144
    - le recuerda que habilite la depuración remota en la página de inspección del navegador (por ejemplo `chrome://inspect/#remote-debugging`, `brave://inspect/#remote-debugging` o `edge://inspect/#remote-debugging`)

    Doctor no puede habilitar la configuración del lado de Chrome por usted. Chrome MCP local aún requiere:

    - un navegador basado en Chromium 144+ en el host de puerta de enlace/nodo
    - que el navegador se ejecute localmente
    - depuración remota habilitada en ese navegador
    - aprobar el primer mensaje de consentimiento de conexión en el navegador

    La preparación aquí se trata solo de los requisitos previos de conexión local. Existing-session mantiene los límites de ruta actuales de Chrome MCP; las rutas avanzadas como `responsebody`, exportación de PDF, intercepción de descargas y acciones por lotes aún requieren un navegador administrado o un perfil CDP sin procesar.

    Esta verificación **no** se aplica a Docker, sandbox, remote-browser u otros flujos sin cabeza. Esos continúan usando CDP sin procesar.

  </Accordion>
  <Accordion title="2d. Requisitos previos de OAuth TLS">
    Cuando se configura un perfil OAuth de OpenAI Codex, doctor sondea el punto de conexión de autorización de OpenAI para verificar que la pila TLS local de Node/OpenSSL pueda validar la cadena de certificados. Si el sondeo falla con un error de certificado (por ejemplo `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, certificado caducado o certificado autofirmado), doctor imprime instrucciones de corrección específicas de la plataforma. En macOS con un Node de Homebrew, la corrección suele ser `brew postinstall ca-certificates`. Con `--deep`, el sondeo se ejecuta incluso si la puerta de enlace está sana.
  </Accordion>
  <Accordion title="2e. Invalidaciones del proveedor OAuth de Codex">
    Si anteriormente añadió configuraciones de transporte heredadas de OpenAI bajo `models.providers.openai-codex`, pueden ocultar la ruta del proveedor OAuth de Codex integrada que las versiones más nuevas utilizan automáticamente. Doctor advierte cuando detecta esas configuraciones de transporte antiguas junto con OAuth de Codex para que pueda eliminar o reescribir la invalidación de transporte obsoleta y recuperar el comportamiento de enrutamiento/fallback integrado. Los proxies personalizados y las invalidaciones solo de encabezado aún son compatibles y no activan esta advertencia.
  </Accordion>
  <Accordion title="2f. Reparación de ruta Codex">
    Doctor verifica referencias de modelos `openai-codex/*` heredadas. El enrutamiento del arnés Codex nativo utiliza referencias de modelos canónicas `openai/*`; los turnos del agente OpenAI pasan a través del arnés del servidor de aplicaciones Codex en lugar de la ruta del proveedor OpenClaw OpenAI.

    En modo `--fix` / `--repair`, doctor reescribe las referencias afectadas del agente predeterminado y por agente, incluyendo modelos principales, alternativos, de generación de imágenes/video, anulaciones de latido/subagente/compactación, ganchos, anulaciones de modelo de canal y el estado de ruta de sesión persistente obsoleto:

    - `openai-codex/gpt-*` se convierte en `openai/gpt-*`.
    - La intención Codex se mueve a entradas `agentRuntime.id: "codex"` con alcance de proveedor/modelo para las referencias de modelo de agente reparadas.
    - Se elimina la configuración de tiempo de ejecución obsoleta de todo el agente y las fijaciones de tiempo de ejecución de sesión persistente porque la selección en tiempo de ejecución tiene alcance de proveedor/modelo.
    - La política de tiempo de ejecución de proveedor/modelo existente se preserva, a menos que la referencia de modelo heredada reparada necesite enrutamiento Codex para mantener la ruta de autenticación antigua.
    - Las listas de modelos alternativos existentes se conservan con sus entradas heredadas reescritas; la configuración copiada por modelo se mueve de la clave heredada a la clave canónica `openai/*`.
    - La sesión persistente `modelProvider`/`providerOverride`, `model`/`modelOverride`, los avisos de alternancia y las fijaciones de perfil de autenticación se reparan en todos los almacenes de sesión de agente descubiertos.
    - `/codex ...` significa "controlar o vincular una conversación Codex nativa desde el chat."
    - `/acp ...` o `runtime: "acp"` significa "usar el adaptador ACP/acpx externo."

  </Accordion>
  <Accordion title="2g. Limpieza de la ruta de sesión">
    Doctor también escanea los almacenes de sesión de agente descubiertos en busca de estados de ruta creados automáticamente obsoletos después de mover los modelos configurados o el tiempo de ejecución fuera de una ruta propiedad de un complemento, como Codex.

    `openclaw doctor --fix` puede limpiar estados obsoletos creados automáticamente, como fijaciones de modelos `modelOverrideSource: "auto"`, metadatos del modelo de tiempo de ejecución, IDs de arnés fijados, enlaces de sesión de CLI y anulaciones de perfil de autenticación automática, cuando su ruta propietaria ya no está configurada. Las elecciones explícitas del usuario o del modelo de sesión heredado se informan para su revisión manual y se dejan intactas; cámbielas con `/model ...`, `/new` o restablezca la sesión cuando esa ruta ya no sea la prevista.

  </Accordion>
  <Accordion title="3. Migraciones de estado heredado (diseño de disco)">
    Doctor puede migrar diseños en disco antiguos a la estructura actual:

    - Almacén de sesiones + transcripciones:
      - de `~/.openclaw/sessions/` a `~/.openclaw/agents/<agentId>/sessions/`
    - Directorio del agente:
      - de `~/.openclaw/agent/` a `~/.openclaw/agents/<agentId>/agent/`
    - Estado de autenticación de WhatsApp (Baileys):
      - del `~/.openclaw/credentials/*.json` heredado (excepto `oauth.json`)
      - a `~/.openclaw/credentials/whatsapp/<accountId>/...` (ID de cuenta predeterminado: `default`)

    Estas migraciones se realizan con el mejor esfuerzo y son idempotentes; doctor emitirá advertencias cuando deje carpetas heredadas como copias de seguridad. Gateway/CLI también migra automáticamente las sesiones heredadas + el directorio del agente al inicio para que el historial/autenticación/modelos aterricen en la ruta por agente sin una ejecución manual de doctor. La autenticación de WhatsApp se migra intencionalmente solo a través de `openclaw doctor`. La normalización del proveedor/mapa de proveedores de Talk ahora compara por igualdad estructural, por lo que las diferencias solo en el orden de las claves ya no activan cambios repetidos sin operación `doctor --fix`.

  </Accordion>
  <Accordion title="3a. Migraciones de manifiesto de complementos heredados">
    Doctor escanea todos los manifiestos de complementos instalados en busca de claves de capacidades de nivel superior obsoletas (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). Cuando se encuentran, ofrece moverlas al objeto `contracts` y reescribir el archivo de manifiesto en su lugar. Esta migración es idempotente; si la clave `contracts` ya tiene los mismos valores, la clave heredada se elimina sin duplicar los datos.
  </Accordion>
  <Accordion title="3b. Migraciones de almacenamiento cron heredadas">
    Doctor también verifica el almacenamiento de trabajos cron (`~/.openclaw/cron/jobs.json` de forma predeterminada, o `cron.store` cuando se anula) en busca de formas de trabajos antiguas que el programador aún acepta por compatibilidad.

    Las limpiezas cron actuales incluyen:

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - campos de carga útil de nivel superior (`message`, `model`, `thinking`, ...) → `payload`
    - campos de entrega de nivel superior (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - alias de entrega `provider` de carga útil → `delivery.channel` explícito
    - trabajos de reserva de webhook `notify: true` heredados → entrega de webhook explícita desde `cron.webhook`; los trabajos de anuncio mantienen su entrega de chat y obtienen `delivery.completionDestination`

    Gateway también sanea las filas cron con formato incorrecto en el momento de la carga para que los trabajos válidos sigan ejecutándose. Las filas con formato incorrecto sin procesar se copian en `jobs-quarantine.json` junto al almacén activo antes de ser eliminadas de `jobs.json`; doctor informa las filas en cuarentena para que pueda revisarlas o repararlas manualmente.

    El inicio de Doctor y Gateway utiliza la misma migración `notify: true` antes de que se ejecute el programador. Si falta `cron.webhook`, doctor advierte y deja el marcador de notificación heredado para su reparación manual.

    En Linux, doctor también advierte cuando el crontab del usuario aún invoca el `~/.openclaw/bin/ensure-whatsapp.sh` heredado. Ese script local de host no es mantenido por OpenClaw actual y puede escribir mensajes `Gateway inactive` falsos en `~/.openclaw/logs/whatsapp-health.log` cuando cron no puede llegar al bus de usuario systemd. Elimine la entrada obsoleta de crontab con `crontab -e`; use `openclaw channels status --probe`, `openclaw doctor` y `openclaw gateway status` para las verificaciones de estado actuales.

  </Accordion>
  <Accordion title="3c. Limpieza de bloqueos de sesión">
    Doctor escanea cada directorio de sesión de agente en busca de archivos de bloqueo de escritura obsoletos (stale) — archivos que quedaron atrás cuando una sesión salió de manera anormal. Para cada archivo de bloqueo encontrado, reporta: la ruta, PID, si el PID sigue vivo, la antigüedad del bloqueo y si se considera obsoleto (PID muerto, metadatos de propietario malformados, mayor de 30 minutos, o un PID vivo que se puede probar que pertenece a un proceso que no es de OpenClaw). En el modo `--fix` / `--repair` elimina automáticamente los bloqueos con propietarios muertos, huérfanos, reciclados, malformados-antiguos o no OpenClaw. Los bloqueos antiguos que todavía son propiedad de un proceso OpenClaw vivo se reportan pero se dejan en su lugar para que doctor no interrumpa un escritor de transcripciones activo.
  </Accordion>
  <Accordion title="3d. Reparación de la rama de transcripción de sesión">
    Doctor escanea los archivos JSONL de sesión de agente en busca de la forma de rama duplicada creada por el error de reescritura de transcripción de prompt del 2026.4.24: un turno de usuario abandonado con contexto de tiempo de ejecución interno de OpenClaw más un hermano activo que contiene el mismo prompt de usuario visible. En el modo `--fix` / `--repair`, doctor hace una copia de seguridad de cada archivo afectado junto al original y reescribe la transcripción a la rama activa para que los lectores del historial y la memoria de la pasarela ya no vean turnos duplicados.
  </Accordion>
  <Accordion title="4. Verificaciones de integridad del estado (persistencia de la sesión, enrutamiento y seguridad)">
    El directorio de estado es el tronco encefálico operativo. Si desaparece, perderás las sesiones, las credenciales, los registros y la configuración (a menos que tengas copias de seguridad en otro lugar).

    Doctor verifica:

    - **State dir missing** (Directorio de estado faltante): advierte sobre una pérdida catastrófica del estado, solicita recrear el directorio y recuerda que no puede recuperar los datos faltantes.
    - **State dir permissions** (Permisos del directorio de estado): verifica la capacidad de escritura; ofrece reparar los permisos (y emite una sugerencia `chown` cuando se detecta una discrepancia de propietario/grupo).
    - **macOS cloud-synced state dir** (Directorio de estado sincronizado en la nube en macOS): advierte cuando el estado se resuelve bajo iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) o `~/Library/CloudStorage/...` porque las rutas respaldadas por sincronización pueden causar E/S más lenta y carreras de bloqueo/sincronización.
    - **Linux SD or eMMC state dir** (Directorio de estado en SD o eMMC de Linux): advierte cuando el estado se resuelve en un origen de montaje `mmcblk*`, porque la E/S aleatoria respaldada por SD o eMMC puede ser más lenta y desgastarse más rápido bajo escrituras de sesiones y credenciales.
    - **Session dirs missing** (Directorios de sesión faltantes): `sessions/` y el directorio de almacenamiento de la sesión son necesarios para persistir el historial y evitar fallos `ENOENT`.
    - **Transcript mismatch** (Discrepancia de transcripción): advierte cuando las entradas de sesión recientes tienen archivos de transcripción faltantes.
    - **Main session "1-line JSONL"** (Sesión principal "1 línea JSONL"): marca cuando la transcripción principal tiene solo una línea (el historial no se está acumulando).
    - **Multiple state dirs** (Múltiples directorios de estado): advierte cuando existen múltiples carpetas `~/.openclaw` en los directorios de inicio o cuando `OPENCLAW_STATE_DIR` apunta a otro lugar (el historial puede dividirse entre instalaciones).
    - **Remote mode reminder** (Recordatorio de modo remoto): si `gateway.mode=remote`, doctor te recuerda que lo ejecutes en el host remoto (el estado reside allí).
    - **Config file permissions** (Permisos del archivo de configuración): advierte si `~/.openclaw/openclaw.json` es legible por el grupo/mundo y ofrece restringirlo a `600`.

  </Accordion>
  <Accordion title="5. Estado de autenticación del modelo (expiración de OAuth)">
    Doctor inspecciona los perfiles de OAuth en el almacén de autenticación, advierte cuando los tokens están expirando o caducados y puede actualizarlos cuando es seguro. Si el perfil OAuth/token de Anthropic está obsoleto, sugiere una clave de API de Anthropic o la ruta del token de configuración de Anthropic. Las solicitudes de actualización solo aparecen al ejecutarse de forma interactiva (TTY); `--non-interactive` omite los intentos de actualización.

    Cuando una actualización de OAuth falla de forma permanente (por ejemplo, `refresh_token_reused`, `invalid_grant`, o un proveedor que te indica que vuelvas a iniciar sesión), doctor informa que se requiere volver a autenticarse e imprime el comando exacto `openclaw models auth login --provider ...` para ejecutar.

    Doctor también informa de los perfiles de autenticación que están temporalmente inutilizables debido a:

    - enfriamientos cortos (límites de tasa/tiempos de espera/fallos de autenticación)
    - deshabilitaciones más largas (fallos de facturación/crédito)

    Los perfiles de OAuth heredados de Codex cuyos tokens residen en el Llavero de macOS (incorporación anterior al diseño sidecar basado en archivos) solo son reparados por doctor. Ejecuta `openclaw doctor --fix` una vez desde una terminal interactiva para migrar los tokens heredados respaldados por el Llavero directamente a `auth-profiles.json`; después de eso, los turnos integrados (Telegram, cron, despacho de subagente) los resuelven como perfiles OAuth canónicos de OpenAI.

  </Accordion>
  <Accordion title="6. Validación de modelo de Hooks">
    Si `hooks.gmail.model` está establecido, doctor valida la referencia del modelo contra el catálogo y la lista de permitidos (allowlist) y advierte cuando no se pueda resolver o esté prohibido.
  </Accordion>
  <Accordion title="7. Reparación de imagen de Sandbox">
    Cuando el sandbox está habilitado, doctor verifica las imágenes de Docker y ofrece construirlas o cambiar a nombres heredados si falta la imagen actual.
  </Accordion>
  <Accordion title="7b. Limpieza de instalación de complementos">
    Doctor elimina el estado de preparación de dependencias de complementos generado por OpenClaw en modo `openclaw doctor --fix` / `openclaw doctor --repair`. Esto cubre las raíces de dependencias generadas obsoletas, los directorios antiguos de etapa de instalación, los residuos locales de paquetes del código anterior de reparación de dependencias de complementos agrupados, y las copias administradas de npm huérfanas o recuperadas de complementos `@openclaw/*` agrupados que pueden ocultar el manifiesto agrupado actual. Doctor también vuelve a vincular el paquete anfitrión `openclaw` en los complementos administrados por npm que declaran `peerDependencies.openclaw`, de modo que las importaciones locales de tiempo de ejecución del paquete, como `openclaw/plugin-sdk/*`, sigan resolviéndose después de las actualizaciones o reparaciones de npm.

    Doctor también puede reinstalar complementos descargables que faltan cuando la configuración los referencia pero el registro local de complementos no puede encontrarlos. Los ejemplos incluyen material `plugins.entries`, configuraciones de canal/proveedor/búsqueda configuradas y tiempos de ejecución del agente configurados. Durante las actualizaciones de paquetes, doctor evita ejecutar la reparación del complemento del administrador de paquetes mientras se está intercambiando el paquete principal; ejecute `openclaw doctor --fix` nuevamente después de la actualización si un complemento configurado aún necesita recuperación. El inicio de Gateway y la recarga de configuración no ejecutan administradores de paquetes; las instalaciones de complementos siguen siendo un trabajo explícito de doctor/install/update.

  </Accordion>
  <Accordion title="8. Migraciones y sugerencias de limpieza de servicios de Gateway">
    Doctor detecta los servicios de puerta de enlace heredados (launchd/systemd/schtasks) y ofrece eliminarlos e instalar el servicio OpenClaw utilizando el puerto de puerta de enlace actual. También puede escanear en busca de servicios adicionales similares a una puerta de enlace e imprimir sugerencias de limpieza. Los servicios de puerta de enlace de OpenClaw con nombre de perfil se consideran de primera clase y no se marcan como "extra."

    En Linux, si falta el servicio de puerta de enlace de nivel de usuario pero existe un servicio de puerta de enlace de OpenClaw de nivel de sistema, doctor no instala automáticamente un segundo servicio de nivel de usuario. Inspeccione con `openclaw gateway status --deep` o `openclaw doctor --deep`, luego elimine el duplicado o establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando un supervisor del sistema sea el propietario del ciclo de vida de la puerta de enlace.

  </Accordion>
  <Accordion title="8b. Migración de Matrix al inicio">
    Cuando una cuenta de canal Matrix tiene una migración de estado heredada pendiente o accionable, doctor (en modo `--fix` / `--repair`) crea una instantánea previa a la migración y luego ejecuta los pasos de migración de mejor esfuerzo: migración de estado heredado de Matrix y preparación de estado cifrado heredado. Ambos pasos no son fatales; los errores se registran y el inicio continúa. En modo de solo lectura (`openclaw doctor` sin `--fix`) esta comprobación se omite por completo.
  </Accordion>
  <Accordion title="8c. Emparejamiento de dispositivos y deriva de autenticación">
    Doctor ahora inspecciona el estado de emparejamiento de dispositivos como parte del paso de salud normal.

    Lo que informa:

    - solicitudes de emparejamiento por primera vez pendientes
    - actualizaciones de rol pendientes para dispositivos ya emparejados
    - actualizaciones de ámbito pendientes para dispositivos ya emparejados
    - reparaciones de discrepancias de claves públicas donde el ID del dispositivo aún coincide pero la identidad del dispositivo ya no coincide con el registro aprobado
    - registros emparejados que carecen de un token activo para un rol aprobado
    - tokens emparejados cuyos ámbitos se desvían de la línea base de emparejamiento aprobada
    - entradas de token de dispositivo en caché local para la máquina actual que son anteriores a una rotación de token del lado de la puerta de enlace o contienen metadatos de ámbito obsoletos

    Doctor no aprueba automáticamente las solicitudes de emparejamiento ni rota automáticamente los tokens de dispositivo. En su lugar, imprime los siguientes pasos exactos:

    - inspeccionar solicitudes pendientes con `openclaw devices list`
    - aprobar la solicitud exacta con `openclaw devices approve <requestId>`
    - rotar un token nuevo con `openclaw devices rotate --device <deviceId> --role <role>`
    - eliminar y volver a aprobar un registro obsoleto con `openclaw devices remove <deviceId>`

    Esto cierra el hueco común de "ya emparejado pero todavía se requiere emparejamiento": doctor ahora distingue el emparejamiento por primera vez de las actualizaciones pendientes de rol/ámbito y de la deriva de token obsoleto/identidad de dispositivo.

  </Accordion>
  <Accordion title="9. Advertencias de seguridad">
    Doctor emite advertencias cuando un proveedor está abierto a MDs sin una lista de permitidos, o cuando una política está configurada de manera peligrosa.
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    Si se ejecuta como un servicio de usuario de systemd, doctor se asegura de que lingering esté habilitado para que la puerta de enlace permanezca activa después de cerrar la sesión.
  </Accordion>
  <Accordion title="11. Estado del espacio de trabajo (habilidades, complementos y directorios heredados)">
    Doctor imprime un resumen del estado del espacio de trabajo para el agente predeterminado:

    - **Estado de las habilidades**: cuenta las habilidades elegibles, con requisitos faltantes y bloqueadas por la lista de permitidos.
    - **Directorios de espacio de trabajo heredados**: advierte cuando `~/openclaw` u otros directorios de espacio de trabajo heredados existen junto al espacio de trabajo actual.
    - **Estado de los complementos**: cuenta los complementos habilitados/deshabilitados/con error; lista los ID de los complementos para cualquier error; informa las capacidades de los complementos del paquete.
    - **Advertencias de compatibilidad de complementos**: marca los complementos que tienen problemas de compatibilidad con el tiempo de ejecución actual.
    - **Diagnósticos de complementos**: expone cualquier advertencia o error en tiempo de carga emitido por el registro de complementos.

  </Accordion>
  <Accordion title="11b. Tamaño del archivo de arranque">
    Doctor verifica si los archivos de arranque del espacio de trabajo (por ejemplo `AGENTS.md`, `CLAUDE.md` u otros archivos de contexto inyectados) están cerca o por encima del presupuesto de caracteres configurado. Informa el recuento de caracteres sin procesar frente a los inyectados por archivo, el porcentaje de truncamiento, la causa del truncamiento (`max/file` o `max/total`) y el total de caracteres inyectados como una fracción del presupuesto total. Cuando los archivos están truncados o cerca del límite, doctor imprime consejos para ajustar `agents.defaults.bootstrapMaxChars` y `agents.defaults.bootstrapTotalMaxChars`.
  </Accordion>
  <Accordion title="11d. Limpieza de complementos de canal obsoletos">
    Cuando `openclaw doctor --fix` elimina un complemento de canal faltante, también elimina la configuración colgante con alcance de canal que hacía referencia a ese complemento: entradas `channels.<id>`, objetivos de latido que nombraban el canal y anulaciones `agents.*.models["<channel>/*"]`. Esto evita bucles de arranque de Gateway donde el tiempo de ejecución del canal ha desaparecido pero la configuración aún solicita a la puerta de enlace que se vincule a él.
  </Accordion>
  <Accordion title="11c. Completado de shell">
    Doctor comprueba si el completado por tabulación está instalado para el shell actual (zsh, bash, fish o PowerShell):

    - Si el perfil del shell usa un patrón de completado dinámico lento (`source <(openclaw completion ...)`), doctor lo actualiza a la variante de archivo en caché más rápida.
    - Si el completado está configurado en el perfil pero falta el archivo de caché, doctor regenera la caché automáticamente.
    - Si no hay ningún completado configurado, doctor solicita instalarlo (solo modo interactivo; se omite con `--non-interactive`).

    Ejecute `openclaw completion --write-state` para regenerar la caché manualmente.

  </Accordion>
  <Accordion title="12. Verificaciones de autenticación de Gateway (token local)">
    Doctor comprueba el estado de preparación de la autenticación del token local de gateway.

    - Si el modo de token necesita un token y no existe ninguna fuente de token, doctor ofrece generar uno.
    - Si `gateway.auth.token` está gestionado por SecretRef pero no está disponible, doctor advierte y no lo sobrescribe con texto sin formato.
    - `openclaw doctor --generate-gateway-token` fuerza la generación solo cuando no hay ningún SecretRef de token configurado.

  </Accordion>
  <Accordion title="12b. Reparaciones con reconocimiento de SecretRef de solo lectura">
    Algunos flujos de reparación necesitan inspeccionar las credenciales configuradas sin debilitar el comportamiento de fallo rápido en tiempo de ejecución.

    - `openclaw doctor --fix` ahora usa el mismo modelo de resumen de SecretRef de solo lectura que los comandos de familia de estado para reparaciones de configuración específicas.
    - Ejemplo: la reparación de Telegram `allowFrom` / `groupAllowFrom` `@username` intenta usar las credenciales del bot configuradas cuando están disponibles.
    - Si el token del bot de Telegram está configurado a través de SecretRef pero no está disponible en la ruta del comando actual, doctor informa que la credencial está configurada pero no disponible y omite la resolución automática en lugar de fallar o informar erróneamente que falta el token.

  </Accordion>
  <Accordion title="13. Verificación de estado de Gateway + reinicio">
    Doctor ejecuta una verificación de estado y ofrece reiniciar la puerta de enlace cuando parece poco saludable.
  </Accordion>
  <Accordion title="13b. Estado de preparación de la búsqueda de memoria">
    Doctor verifica si el proveedor de incrustación de búsqueda de memoria configurado está listo para el agente predeterminado. El comportamiento depende del backend y del proveedor configurados:

    - **Backend QMD**: comprueba si el binario `qmd` está disponible y se puede iniciar. Si no, imprime orientación de solución que incluye el paquete npm y una opción de ruta binaria manual.
    - **Proveedor local explícito**: busca un archivo de modelo local o una URL de modelo remota/descargable reconocida. Si falta, sugiere cambiar a un proveedor remoto.
    - **Proveedor remoto explícito** (`openai`, `voyage`, etc.): verifica que haya una clave API en el entorno o en el almacén de autenticación. Imprime sugerencias de solución accionables si falta.
    - **Proveedor automático heredado**: trata `memorySearch.provider: "auto"` como OpenAI, verifica la disponibilidad de OpenAI y `doctor --fix` lo reescribe a `provider: "openai"`.

    Cuando hay un resultado de sondeo de puerta de enlace en caché disponible (la puerta de enlace estaba sana en el momento de la verificación), doctor cruza su resultado con la configuración visible de la CLI y nota cualquier discrepancia. Doctor no inicia un ping de incrustación nuevo en la ruta predeterminada; use el comando de estado profundo de memoria cuando quiera una verificación en vivo del proveedor.

    Use `openclaw memory status --deep` para verificar la disponibilidad de incrustación en tiempo de ejecución.

  </Accordion>
  <Accordion title="14. Advertencias del estado del canal">
    Si la pasarela está sana, doctor ejecuta un sondeo del estado del canal e informa advertencias con soluciones sugeridas.
  </Accordion>
  <Accordion title="15. Auditoría y reparación de la configuración del supervisor">
    Doctor verifica la configuración del supervisor instalada (launchd/systemd/schtasks) en busca de valores predeterminados faltantes o desactualizados (por ejemplo, dependencias de red en línea de systemd y el retraso de reinicio). Cuando encuentra una discrepancia, recomienda una actualización y puede reescribir el archivo de servicio/tarea con los valores predeterminados actuales.

    Notas:

    - `openclaw doctor` solicita confirmación antes de reescribir la configuración del supervisor.
    - `openclaw doctor --yes` acepta las solicitudes de reparación predeterminadas.
    - `openclaw doctor --fix` aplica las soluciones recomendadas sin solicitar confirmación (`--repair` es un alias).
    - `openclaw doctor --fix --force` sobrescribe las configuraciones personalizadas del supervisor.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` mantiene doctor en modo de solo lectura para el ciclo de vida del servicio de gateway. Sigue informando sobre el estado del servicio y ejecuta reparaciones que no son del servicio, pero omite la instalación/inicio/reinicio/inicialización del servicio, la reescritura de la configuración del supervisor y la limpieza de servicios heredados porque un supervisor externo es propietario de ese ciclo de vida.
    - En Linux, doctor no reescribe los metadatos de comando/punto de entrada mientras la unidad gateway de systemd correspondiente está activa. También ignora las unidades extra similares a gateway inactivas y no heredadas durante el escaneo de servicios duplicados para que los archivos de servicio acompañantes no generen ruido en la limpieza.
    - Si la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, la instalación/reparación del servicio de doctor valida el SecretRef, pero no persiste los valores de token de texto sin formato resueltos en los metadatos del entorno del servicio del supervisor.
    - Doctor detecta valores de entorno de servicio administrados respaldados por `.env`/SecretRef que las instalaciones antiguas de LaunchAgent, systemd o Tarea programada de Windows incrustaron en línea y reescribe los metadatos del servicio para que esos valores se carguen desde la fuente de tiempo de ejecución en lugar de la definición del supervisor.
    - Doctor detecta cuando el comando del servicio aún fija un `--port` antiguo después de cambios en `gateway.port` y reescribe los metadatos del servicio al puerto actual.
    - Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, doctor bloquea la ruta de instalación/reparación con orientación práctica.
    - Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, doctor bloquea la instalación/reparación hasta que el modo se establece explícitamente.
    - Para las unidades systemd de usuario de Linux, las verificaciones de deriva de token de doctor ahora incluyen ambas fuentes `Environment=` y `EnvironmentFile=` al comparar los metadatos de autenticación del servicio.
    - Las reparaciones del servicio de doctor se niegan a reescribir, detener o reiniciar un servicio de gateway de un binario OpenClaw anterior cuando la configuración fue escrita por última vez por una versión más reciente. Consulte [Solución de problemas de Gateway](/es/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - Siempre puede forzar una reescritura completa mediante `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="16. Diagnóstico del tiempo de ejecución y puerto de Gateway">
    Doctor inspecciona el tiempo de ejecución del servicio (PID, último estado de salida) y advierte cuando el servicio está instalado pero no se está ejecutando realmente. También verifica si hay colisiones de puertos en el puerto de gateway (por defecto `18789`) e informa de las causas probables (gateway ya ejecutándose, túnel SSH).
  </Accordion>
  <Accordion title="17. Mejores prácticas del tiempo de ejecución de Gateway">
    Doctor advierte cuando el servicio de gateway se ejecuta en Bun o en una ruta de Node con gestión de versiones (`nvm`, `fnm`, `volta`, `asdf`, etc.). Los canales de WhatsApp y Telegram requieren Node, y las rutas de gestores de versiones pueden romperse después de las actualizaciones porque el servicio no carga la inicialización de su shell. Doctor ofrece migrar a una instalación de Node del sistema cuando esté disponible (Homebrew/apt/choco).

    Los LaunchAgents de macOS recién instalados o reparados usan una ruta de sistema canónica (`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`) en lugar de copiar la ruta del shell interactivo, por lo que los binarios del sistema administrados por Homebrew siguen disponibles, mientras que los directorios de Volta, asdf, fnm, pnpm y otros gestores de versiones no cambian qué resuelven los procesos secundarios de Node. Los servicios de Linux todavía conservan raíces de entorno explícitas (`NVM_DIR`, `FNM_DIR`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `BUN_INSTALL`, `PNPM_HOME`) y directorios de binarios de usuario estables, pero los directorios de reserva de gestores de versiones supuestos solo se escriben en la ruta del servicio cuando esos directorios existen en el disco.

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
