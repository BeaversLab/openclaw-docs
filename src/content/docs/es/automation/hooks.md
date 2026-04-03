---
summary: "Hooks: automatización basada en eventos para comandos y eventos del ciclo de vida"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Los Hooks proporcionan un sistema extensible basado en eventos para automatizar acciones en respuesta a comandos y eventos del agente. Los Hooks se descubren automáticamente desde los directorios y se pueden inspeccionar con `openclaw hooks`, mientras que la instalación y actualización de los paquetes de hooks ahora se realiza a través de `openclaw plugins`.

## Orientación

Los Hooks son pequeños scripts que se ejecutan cuando sucede algo. Hay dos tipos:

- **Hooks** (esta página): se ejecutan dentro de la Gateway cuando se disparan eventos del agente, como `/new`, `/reset`, `/stop`, o eventos del ciclo de vida.
- **Webhooks**: webhooks HTTP externos que permiten a otros sistemas desencadenar trabajo en OpenClaw. Consulte [Webhook Hooks](/en/automation/webhook) o use `openclaw webhooks` para los comandos auxiliares de Gmail.

Los Hooks también se pueden incluir dentro de complementos (plugins); consulte [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks). `openclaw hooks list` muestra tanto los hooks independientes como los hooks gestionados por complementos.

Usos comunes:

- Guardar una instantánea de la memoria cuando restablezca una sesión
- Mantener un registro de auditoría de los comandos para solucionar problemas o cumplimiento
- Desencadenar una automatización de seguimiento cuando una sesión inicia o termina
- Escribir archivos en el espacio de trabajo del agente o llamar a API externas cuando se disparan eventos

Si sabe escribir una pequeña función de TypeScript, puede escribir un hook. Los hooks gestionados y empaquetados son código local de confianza. Los hooks del espacio de trabajo se descubren automáticamente, pero OpenClaw los mantiene deshabilitados hasta que los habilita explícitamente a través de la CLI o la configuración.

## Descripción general

El sistema de Hooks le permite:

- Guardar el contexto de la sesión en la memoria cuando se emite `/new`
- Registrar todos los comandos para auditoría
- Desencadenar automatizaciones personalizadas en eventos del ciclo de vida del agente
- Ampliar el comportamiento de OpenClaw sin modificar el código central

## Primeros pasos

### Hooks incluidos

OpenClaw incluye cuatro Hooks incluidos que se descubren automáticamente:

- **💾 session-memory**: Guarda el contexto de la sesión en su espacio de trabajo del agente (por defecto `~/.openclaw/workspace/memory/`) cuando emite `/new` o `/reset`
- **📎 bootstrap-extra-files**: Inyecta archivos de arranque adicionales del espacio de trabajo desde patrones de glob/ruta configurados durante `agent:bootstrap`
- **📝 command-logger**: Registra todos los eventos de comandos en `~/.openclaw/logs/commands.log`
- **🚀 boot-md**: Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (requiere que los hooks internos estén habilitados)

Listar enlaces disponibles:

```bash
openclaw hooks list
```

Habilitar un enlace:

```bash
openclaw hooks enable session-memory
```

Verificar el estado del enlace:

```bash
openclaw hooks check
```

Obtener información detallada:

```bash
openclaw hooks info session-memory
```

### Incorporación

Durante la incorporación (`openclaw onboard`), se le pedirá que habilite los hooks recomendados. El asistente descubre automáticamente los hooks elegibles y los presenta para su selección.

### Límite de confianza

Los Hooks se ejecutan dentro del proceso de la Gateway. Trate los hooks incluidos, los hooks gestionados y `hooks.internal.load.extraDirs` como código local confiable. Los hooks del espacio de trabajo bajo `<workspace>/hooks/` son código local del repositorio, por lo que OpenClaw requiere un paso de habilitación explícito antes de cargarlos.

## Descubrimiento de Hooks

Los hooks se descubren automáticamente desde estos directorios, en orden de precedencia de anulación creciente:

1. **Bundled hooks**: enviados con OpenClaw; ubicados en `<openclaw>/dist/hooks/bundled/` para instalaciones de npm (o un `hooks/bundled/` del mismo nivel para binarios compilados)
2. **Plugin hooks**: hooks empaquetados dentro de plugins instalados (consulte [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks))
3. **Managed hooks**: `~/.openclaw/hooks/` (instalados por el usuario, compartidos entre espacios de trabajo; pueden anular los hooks integrados y de plugins). Los **directorios de hooks adicionales** configurados mediante `hooks.internal.load.extraDirs` también se tratan como hooks gestionados y comparten la misma precedencia de anulación.
4. **Workspace hooks**: `<workspace>/hooks/` (por agente, deshabilitados de forma predeterminada hasta que se habilite explícitamente; no pueden anular hooks de otras fuentes)

Los hooks del espacio de trabajo pueden agregar nuevos nombres de hooks para un repositorio, pero no pueden anular los hooks incluidos, administrados o proporcionados por complementos con el mismo nombre.

Los directorios de hooks administrados pueden ser un **único hook** o un **paquete de hooks** (directorio de paquetes).

Cada hook es un directorio que contiene:

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Paquetes de Hooks (npm/archivos)

Los hook packs son paquetes npm estándar que exportan uno o más hooks a través de `openclaw.hooks` en
`package.json`. Instálelos con:

```bash
openclaw plugins install <path-or-spec>
```

Las especificaciones de npm son solo de registro (nombre del paquete + versión exacta opcional o etiqueta de distribución).
Las especificaciones de Git/URL/archivo y los rangos semver se rechazan.

Las especificaciones simples y `@latest` se mantienen en la rama estable. Si npm resuelve cualquiera de
estas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
ejiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta.

Ejemplo `package.json`:

```json
{
  "name": "@acme/my-hooks",
  "version": "0.1.0",
  "openclaw": {
    "hooks": ["./hooks/my-hook", "./hooks/other-hook"]
  }
}
```

Cada entrada apunta a un directorio de hooks que contiene `HOOK.md` y un archivo de controlador. El cargador intenta `handler.ts`, `handler.js`, `index.ts`, `index.js` en orden.
Los hook packs pueden incluir dependencias; se instalarán en `~/.openclaw/hooks/<id>`.
Cada entrada `openclaw.hooks` debe permanecer dentro del directorio del paquete después de la resolución
del enlace simbólico; las entradas que salen son rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del hook-pack con `npm install --ignore-scripts`
(sin scripts de ciclo de vida). Mantenga los árboles de dependencias del hook pack como "JS/TS puro" y evite paquetes que dependan
de compilaciones `postinstall`.

## Estructura del Hook

### Formato HOOK.md

El archivo `HOOK.md` contiene metadatos en el frontmatter de YAML además de la documentación de Markdown:

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/automation/hooks#my-hook
metadata: { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Detailed documentation goes here...

## What It Does

- Listens for `/new` commands
- Performs some action
- Logs the result

## Requirements

- Node.js must be installed

## Configuration

No configuration needed.
```

### Campos de Metadatos

El objeto `metadata.openclaw` admite:

- **`emoji`**: emoji de visualización para la CLI (por ejemplo, `"💾"`)
- **`events`**: Matriz de eventos a los que escuchar (por ejemplo, `["command:new", "command:reset"]`)
- **`export`**: Exportación con nombre que se debe utilizar (por defecto es `"default"`)
- **`homepage`**: URL de la documentación
- **`os`**: Plataformas requeridas (por ejemplo, `["darwin", "linux"]`)
- **`requires`**: Requisitos opcionales
  - **`bins`**: Binarios requeridos en PATH (por ejemplo, `["git", "node"]`)
  - **`anyBins`**: Al menos uno de estos binarios debe estar presente
  - **`env`**: Variables de entorno requeridas
  - **`config`**: Rutas de configuración requeridas (por ejemplo, `["workspace.dir"]`)
- **`always`**: Omitir las comprobaciones de elegibilidad (booleano)
- **`install`**: Métodos de instalación (para hooks incluidos: `[{"id":"bundled","kind":"bundled"}]`)

### Implementación del Manejador

El archivo `handler.ts` exporta una función `HookHandler`:

```typescript
const myHandler = async (event) => {
  // Only trigger on 'new' command
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  console.log(`  Session: ${event.sessionKey}`);
  console.log(`  Timestamp: ${event.timestamp.toISOString()}`);

  // Your custom logic here

  // Optionally send message to user
  event.messages.push("✨ My hook executed!");
};

export default myHandler;
```

#### Contexto del Evento

Cada evento incluye:

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway' | 'message',
  action: string,              // e.g., 'new', 'reset', 'stop', 'received', 'sent'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    // Command events (command:new, command:reset):
    sessionEntry?: SessionEntry,       // current session entry
    previousSessionEntry?: SessionEntry, // pre-reset entry (preferred for session-memory)
    commandSource?: string,            // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    cfg?: OpenClawConfig,
    // Command events (command:stop only):
    sessionId?: string,
    // Agent bootstrap events (agent:bootstrap):
    bootstrapFiles?: WorkspaceBootstrapFile[],
    sessionKey?: string,           // routing session key
    sessionId?: string,            // internal session UUID
    agentId?: string,              // resolved agent ID
    // Message events (see Message Events section for full details):
    from?: string,             // message:received
    to?: string,               // message:sent
    content?: string,
    channelId?: string,
    success?: boolean,         // message:sent
  }
}
```

## Tipos de Eventos

### Eventos de Comando

Se activan cuando se emiten comandos del agente:

- **`command`**: Todos los eventos de comandos (escucha general)
- **`command:new`**: Cuando se emite el comando `/new`
- **`command:reset`**: Cuando se emite el comando `/reset`
- **`command:stop`**: Cuando se emite el comando `/stop`

### Eventos de sesión

- **`session:compact:before`**: Justo antes de que la compactación resuma el historial
- **`session:compact:after`**: Después de que se complete la compactación con metadatos de resumen

Las cargas internas de hooks emiten estos como `type: "session"` con `action: "compact:before"` / `action: "compact:after"`; los oyentes se suscriben con las claves combinadas anteriores.
El registro específico de manejadores utiliza el formato de clave literal `${type}:${action}`. Para estos eventos, registre `session:compact:before` y `session:compact:after`.

Campos de contexto de `session:compact:before`:

- `sessionId`: UUID de sesión interna
- `missingSessionKey`: verdadero cuando no había ninguna clave de sesión disponible
- `messageCount`: número de mensajes antes de la compactación
- `tokenCount`: recuento de tokens antes de la compactación (puede estar ausente)
- `messageCountOriginal`: recuento de mensajes del historial de sesión completo sin truncar
- `tokenCountOriginal`: recuento de tokens del historial original completo (puede estar ausente)

campos de contexto `session:compact:after` (además de `sessionId` y `missingSessionKey`):

- `messageCount`: recuento de mensajes después de la compactación
- `tokenCount`: recuento de tokens después de la compactación (puede estar ausente)
- `compactedCount`: número de mensajes que fueron compactados/eliminados
- `summaryLength`: longitud de caracteres del resumen de compactación generado
- `tokensBefore`: recuento de tokens antes de la compactación (para el cálculo delta)
- `tokensAfter`: recuento de tokens después de la compactación
- `firstKeptEntryId`: ID de la primera entrada de mensaje retenida después de la compactación

### Eventos de Agente

- **`agent:bootstrap`**: Antes de que se inyecten los archivos de arranque del espacio de trabajo (los hooks pueden mutar `context.bootstrapFiles`)

### Eventos de Gateway

Se activa cuando se inicia el gateway:

- **`gateway:startup`**: Después de que se inician los canales y se cargan los hooks

### Eventos de Parche de Sesión

Se activa cuando se modifican las propiedades de la sesión:

- **`session:patch`**: Cuando se actualiza una sesión

#### Contexto del Evento de Sesión

Los eventos de sesión incluyen un contexto rico sobre la sesión y los cambios:

```typescript
{
  sessionEntry: SessionEntry, // The complete updated session entry
  patch: {                    // The patch object (only changed fields)
    // Session identity & labeling
    label?: string | null,           // Human-readable session label

    // AI model configuration
    model?: string | null,           // Model override (e.g., "claude-sonnet-4-6")
    thinkingLevel?: string | null,   // Thinking level ("off"|"low"|"med"|"high")
    verboseLevel?: string | null,    // Verbose output level
    reasoningLevel?: string | null,  // Reasoning mode override
    elevatedLevel?: string | null,   // Elevated mode override
    responseUsage?: "off" | "tokens" | "full" | "on" | null, // Usage display mode ("on" is backwards-compat alias for "full")
    fastMode?: boolean | null,                    // Fast/turbo mode toggle
    spawnedWorkspaceDir?: string | null,          // Workspace dir override for spawned subagents
    subagentRole?: "orchestrator" | "leaf" | null, // Subagent role assignment
    subagentControlScope?: "children" | "none" | null, // Scope of subagent control

    // Tool execution settings
    execHost?: string | null,        // Exec host (sandbox|gateway|node)
    execSecurity?: string | null,    // Security mode (deny|allowlist|full)
    execAsk?: string | null,         // Approval mode (off|on-miss|always)
    execNode?: string | null,        // Node ID for host=node

    // Subagent coordination
    spawnedBy?: string | null,       // Parent session key (for subagents)
    spawnDepth?: number | null,      // Nesting depth (0 = root)

    // Communication policies
    sendPolicy?: "allow" | "deny" | null,          // Message send policy
    groupActivation?: "mention" | "always" | null, // Group chat activation
  },
  cfg: OpenClawConfig            // Current gateway config
}
```

**Nota de seguridad:** Solo los clientes privilegiados (incluida la Interfaz de Control) pueden activar eventos `session:patch`. A los clientes estándar de WebChat se les bloquea el parcheo de sesiones, por lo que el hook no se activará desde esas conexiones.

Consulte `SessionsPatchParamsSchema` en `src/gateway/protocol/schema/sessions.ts` para obtener la definición completa del tipo.

#### Ejemplo: Hook de Registrador de Parches de Sesión

```typescript
const handler = async (event) => {
  if (event.type !== "session" || event.action !== "patch") {
    return;
  }
  const { patch } = event.context;
  console.log(`[session-patch] Session updated: ${event.sessionKey}`);
  console.log(`[session-patch] Changes:`, patch);
};

export default handler;
```

### Eventos de Mensaje

Se activa cuando se reciben o envían mensajes:

- **`message`**: Todos los eventos de mensaje (escucha general)
- **`message:received`**: Cuando se recibe un mensaje entrante de cualquier canal. Se activa al principio del procesamiento antes de la comprensión de medios. El contenido puede contener marcadores de posición sin procesar como `<media:audio>` para archivos adjuntos de medios que aún no se han procesado.
- **`message:transcribed`**: Cuando un mensaje ha sido procesado completamente, incluyendo la transcripción de audio y la comprensión de enlaces. En este punto, `transcript` contiene el texto completo de la transcripción para mensajes de audio. Use este enlace cuando necesite acceso al contenido de audio transcrito.
- **`message:preprocessed`**: Se activa para cada mensaje después de que se completa toda la comprensión de medios y enlaces, dando a los enlaces acceso al cuerpo completamente enriquecido (transcripciones, descripciones de imágenes, resúmenes de enlaces) antes de que el agente lo vea.
- **`message:sent`**: Cuando un mensaje saliente se envía exitosamente

#### Contexto del evento de mensaje

Los eventos de mensaje incluyen un contexto rico sobre el mensaje:

```typescript
// message:received context
{
  from: string,           // Sender identifier (phone number, user ID, etc.)
  content: string,        // Message content
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "whatsapp", "telegram", "discord")
  accountId?: string,     // Provider account ID for multi-account setups
  conversationId?: string, // Chat/conversation ID
  messageId?: string,     // Message ID from the provider
  metadata?: {            // Additional provider-specific data
    to?: string,
    provider?: string,
    surface?: string,
    threadId?: string | number,
    senderId?: string,
    senderName?: string,
    senderUsername?: string,
    senderE164?: string,
    guildId?: string,     // Discord guild / server ID
    channelName?: string, // Channel name (e.g., Discord channel name)
  }
}

// message:sent context
{
  to: string,             // Recipient identifier
  content: string,        // Message content that was sent
  success: boolean,       // Whether the send succeeded
  error?: string,         // Error message if sending failed
  channelId: string,      // Channel (e.g., "whatsapp", "telegram", "discord")
  accountId?: string,     // Provider account ID
  conversationId?: string, // Chat/conversation ID
  messageId?: string,     // Message ID returned by the provider
  isGroup?: boolean,      // Whether this outbound message belongs to a group/channel context
  groupId?: string,       // Group/channel identifier for correlation with message:received
}

// message:transcribed context
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body before enrichment
  bodyForAgent?: string,  // Enriched body visible to the agent
  transcript: string,     // Audio transcript text
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file that was transcribed
  mediaType?: string,     // MIME type of the media
}

// message:preprocessed context
{
  from?: string,          // Sender identifier
  to?: string,            // Recipient identifier
  body?: string,          // Raw inbound body
  bodyForAgent?: string,  // Final enriched body after media/link understanding
  transcript?: string,    // Transcript when audio was present
  timestamp?: number,     // Unix timestamp when received
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  senderId?: string,      // Sender user ID
  senderName?: string,    // Sender display name
  senderUsername?: string,
  provider?: string,      // Provider name
  surface?: string,       // Surface name
  mediaPath?: string,     // Path to the media file
  mediaType?: string,     // MIME type of the media
  isGroup?: boolean,
  groupId?: string,
}
```

#### Ejemplo: Enlace de registrador de mensajes

```typescript
const isMessageReceivedEvent = (event: { type: string; action: string }) => event.type === "message" && event.action === "received";
const isMessageSentEvent = (event: { type: string; action: string }) => event.type === "message" && event.action === "sent";

const handler = async (event) => {
  if (isMessageReceivedEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Received from ${event.context.from}: ${event.context.content}`);
  } else if (isMessageSentEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Sent to ${event.context.to}: ${event.context.content}`);
  }
};

export default handler;
```

### Enlaces de resultados de herramientas (API de complementos)

Estos enlaces no son escuchas de flujo de eventos; permiten que los complementos ajusten sincrónicamente los resultados de las herramientas antes de que OpenClaw los persista.

- **`tool_result_persist`**: transforma los resultados de las herramientas antes de que se escriban en la transcripción de la sesión. Debe ser sincrónico; devuelva la carga útil del resultado de la herramienta actualizada o `undefined` para mantenerla tal como está. Consulte [Bucle de agente](/en/concepts/agent-loop).

### Eventos de enlace de complementos

#### before_tool_call

Se ejecuta antes de cada llamada a la herramienta. Los complementos pueden modificar los parámetros, bloquear la llamada o solicitar la aprobación del usuario.

Campos devueltos:

- **`params`**: Anula los parámetros de la herramienta (combinados con los parámetros originales)
- **`block`**: Establézcalo en `true` para bloquear la llamada a la herramienta
- **`blockReason`**: Motivo que se muestra al agente cuando se bloquea
- **`requireApproval`**: Pausa la ejecución y espera la aprobación del usuario a través de canales

El campo `requireApproval` activa la aprobación nativa de la plataforma (botones de Telegram, componentes de Discord, comando `/approve`) en lugar de confiar en la cooperación del agente:

```typescript
{
  requireApproval: {
    title: "Sensitive operation",
    description: "This tool call modifies production data",
    severity: "warning",       // "info" | "warning" | "critical"
    timeoutMs: 120000,         // default: 120s
    timeoutBehavior: "deny",   // "allow" | "deny" (default)
    onResolution: async (decision) => {
      // Called after the user resolves: "allow-once", "allow-always", "deny", "timeout", or "cancelled"
    },
  }
}
```

La devolución de llamada `onResolution` se invoca con la cadena de decisión final después de que se resuelve, agota el tiempo o se cancela la aprobación. Se ejecuta dentro del proceso del complemento (no se envía a la puerta de enlace). Úsela para persistir decisiones, actualizar cachés o realizar limpieza.

El campo `pluginId` se marca automáticamente mediante el ejecutor de hooks desde el registro del complemento. Cuando varios complementos devuelven `requireApproval`, gana el primero (mayor prioridad).

`block` tiene prioridad sobre `requireApproval`: si el resultado del hook combinado tiene tanto `block: true` como un campo `requireApproval`, la llamada a la herramienta se bloquea inmediatamente sin activar el flujo de aprobación. Esto asegura que el bloqueo de un complemento de mayor prioridad no pueda ser anulado por una solicitud de aprobación de un complemento de menor prioridad.

Si la puerta de enlace no está disponible o no admite aprobaciones de complementos, la llamada a la herramienta recurre a un bloqueo suave utilizando el `description` como motivo del bloqueo.

#### before_install

Se ejecuta después del escaneo de seguridad de instalación integrado y antes de que continúe la instalación. OpenClaw activa este hook para instalaciones interactivas de habilidades, así como para instalaciones de paquetes de complementos, paquetes y archivos únicos.

El comportamiento predeterminado difiere según el tipo de destino:

- Las instalaciones de complementos fallan de forma cerrada en los hallazgos del escaneo integrado `critical` y los errores de escaneo, a menos que el operador use explícitamente `openclaw plugins install --dangerously-force-unsafe-install`.
- Las instalaciones de habilidades aún muestran los hallazgos del escaneo integrado y los errores de escaneo como advertencias y continúan de manera predeterminada.

Campos devueltos:

- **`findings`**: Hallazgos de escaneo adicionales para mostrar como advertencias
- **`block`**: Establézcalo en `true` para bloquear la instalación
- **`blockReason`**: Motivo legible por humanos que se muestra cuando se bloquea

Campos del evento:

- **`targetType`**: Categoría del destino de instalación (`skill` o `plugin`)
- **`targetName`**: Nombre de habilidad legible por humanos o id de complemento para el destino de instalación
- **`sourcePath`**: Ruta absoluta al contenido del destino de instalación que se está escaneando
- **`sourcePathKind`**: Si el contenido escaneado es un `file` o `directory`
- **`origin`**: Origen de instalación normalizado cuando está disponible (por ejemplo `openclaw-bundled`, `openclaw-workspace`, `plugin-bundle`, `plugin-package` o `plugin-file`)
- **`request`**: Procedencia de la solicitud de instalación, incluyendo `kind`, `mode` y opcional `requestedSpecifier`
- **`builtinScan`**: Resultado estructurado del escáner incorporado, incluyendo `status`, recuentos resumidos, hallazgos y opcional `error`
- **`skill`**: Metadatos de instalación de habilidad cuando `targetType` es `skill`, incluyendo `installId` y la `installSpec` seleccionada
- **`plugin`**: Metadatos de instalación del complemento cuando `targetType` es `plugin`, incluyendo el `pluginId` canónico, `contentType` normalizado, opcional `packageName` / `manifestId` / `version`, y `extensions`

Evento de ejemplo (instalación del paquete de complemento):

```json
{
  "targetType": "plugin",
  "targetName": "acme-audit",
  "sourcePath": "/var/folders/.../openclaw-plugin-acme-audit/package",
  "sourcePathKind": "directory",
  "origin": "plugin-package",
  "request": {
    "kind": "plugin-npm",
    "mode": "install",
    "requestedSpecifier": "@acme/openclaw-plugin-audit@1.4.2"
  },
  "builtinScan": {
    "status": "ok",
    "scannedFiles": 12,
    "critical": 0,
    "warn": 1,
    "info": 0,
    "findings": [
      {
        "severity": "warn",
        "ruleId": "network_fetch",
        "file": "dist/index.js",
        "line": 88,
        "message": "Dynamic network fetch detected during install review."
      }
    ]
  },
  "plugin": {
    "pluginId": "acme-audit",
    "contentType": "package",
    "packageName": "@acme/openclaw-plugin-audit",
    "manifestId": "acme-audit",
    "version": "1.4.2",
    "extensions": ["./dist/index.js"]
  }
}
```

Las instalaciones de habilidades usan la misma forma de evento con `targetType: "skill"` y un objeto `skill` en lugar de `plugin`.

Semántica de decisión:

- `before_install`: `{ block: true }` es terminal y detiene los manejadores de menor prioridad.
- `before_install`: `{ block: false }` se trata como sin decisión.

Use este enlace para escáneres de seguridad externos, motores de políticas o puertas de aprobación empresarial que necesiten auditar los orígenes de instalación antes de que se instalen.

#### Ciclo de vida de compactación

Enlaces del ciclo de vida de compactación expuestos a través del ejecutor de enlaces del complemento:

- **`before_compaction`**: Se ejecuta antes de la compactación con metadatos de recuento/token
- **`after_compaction`**: Se ejecuta después de la compactación con metadatos del resumen de compactación

### Referencia completa de Hooks de Complementos

Los 27 hooks registrados a través del SDK de Complementos. Los hooks marcados como **secuenciales** se ejecutan en orden de prioridad y pueden modificar resultados; los hooks **paralelos** son de disparar y olvidar.

#### Hooks de modelo y aviso

| Hook                   | Cuándo                                                          | Ejecución  | Devuelve                                                   |
| ---------------------- | --------------------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `before_model_resolve` | Antes de la búsqueda de modelo/proveedor                        | Secuencial | `{ modelOverride?, providerOverride? }`                    |
| `before_prompt_build`  | Después de que el modelo se resuelve, mensajes de sesión listos | Secuencial | `{ systemPrompt?, prependContext?, appendSystemContext? }` |
| `before_agent_start`   | Hook combinado heredado (preferir los dos anteriores)           | Secuencial | Unión de ambas formas de resultado                         |
| `llm_input`            | Inmediatamente antes de la llamada a la API del LLM             | Paralelo   | `void`                                                     |
| `llm_output`           | Inmediatamente después de recibir la respuesta del LLM          | Paralelo   | `void`                                                     |

#### Hooks del ciclo de vida del agente

| Hook                | Cuándo                                                               | Ejecución | Devuelve |
| ------------------- | -------------------------------------------------------------------- | --------- | -------- |
| `agent_end`         | Después de que se completa la ejecución del agente (éxito o fracaso) | Paralelo  | `void`   |
| `before_reset`      | Cuando `/new` o `/reset` borra una sesión                            | Paralelo  | `void`   |
| `before_compaction` | Antes de que la compactación resuma el historial                     | Paralelo  | `void`   |
| `after_compaction`  | Después de que se completa la compactación                           | Paralelo  | `void`   |

#### Hooks del ciclo de vida de la sesión

| Hook            | Cuándo                           | Ejecución | Devuelve |
| --------------- | -------------------------------- | --------- | -------- |
| `session_start` | Cuando comienza una nueva sesión | Paralelo  | `void`   |
| `session_end`   | Cuando termina una sesión        | Paralelo  | `void`   |

#### Hooks de flujo de mensajes

| Hook                   | Cuándo                                                              | Ejecución                  | Devuelve                      |
| ---------------------- | ------------------------------------------------------------------- | -------------------------- | ----------------------------- |
| `inbound_claim`        | Antes del envío de comando/agente; gana la primera reclamación      | Secuencial                 | `{ handled: boolean }`        |
| `message_received`     | Después de recibir un mensaje entrante                              | Paralelo                   | `void`                        |
| `before_dispatch`      | Después de analizar los comandos, antes del envío al modelo         | Secuencial                 | `{ handled: boolean, text? }` |
| `message_sending`      | Antes de que se entregue un mensaje saliente                        | Secuencial                 | `{ content?, cancel? }`       |
| `message_sent`         | Después de que se entrega un mensaje saliente                       | Paralelo                   | `void`                        |
| `before_message_write` | Antes de que se escriba un mensaje en la transcripción de la sesión | **Sincrónico**, secuencial | `{ block?, message? }`        |

#### Ganchos de ejecución de herramientas

| Gancho                | Cuándo                                                                  | Ejecución                  | Devuelve                                              |
| --------------------- | ----------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `before_tool_call`    | Antes de cada llamada a herramienta                                     | Secuencial                 | `{ params?, block?, blockReason?, requireApproval? }` |
| `after_tool_call`     | Después de que se completa una llamada a herramienta                    | Paralelo                   | `void`                                                |
| `tool_result_persist` | Antes de que se escriba un resultado de herramienta en la transcripción | **Sincrónico**, secuencial | `{ message? }`                                        |

#### Ganchos de subagente

| Gancho                     | Cuándo                                                  | Ejecución  | Devuelve                          |
| -------------------------- | ------------------------------------------------------- | ---------- | --------------------------------- |
| `subagent_spawning`        | Antes de que se cree una sesión de subagente            | Secuencial | `{ status, threadBindingReady? }` |
| `subagent_delivery_target` | Después de generar, para resolver el destino de entrega | Secuencial | `{ origin? }`                     |
| `subagent_spawned`         | Después de que se genera completamente un subagente     | Paralelo   | `void`                            |
| `subagent_ended`           | Cuando termina una sesión de subagente                  | Paralelo   | `void`                            |

#### Ganchos de puerta de enlace

| Gancho          | Cuándo                                                                       | Ejecución | Devuelve |
| --------------- | ---------------------------------------------------------------------------- | --------- | -------- |
| `gateway_start` | Después de que el proceso de puerta de enlace se haya iniciado completamente | Paralelo  | `void`   |
| `gateway_stop`  | Cuando la puerta de enlace se está apagando                                  | Paralelo  | `void`   |

#### Ganchos de instalación

| Gancho           | Cuándo                                                                          | Ejecución  | Devuelve                              |
| ---------------- | ------------------------------------------------------------------------------- | ---------- | ------------------------------------- |
| `before_install` | Después del escaneo de seguridad integrado, antes de que proceda la instalación | Secuencial | `{ findings?, block?, blockReason? }` |

<Note>Dos ganchos (`tool_result_persist` y `before_message_write`) son **solo síncronos** — no deben devolver una Promise. Devolver una Promise desde estos ganchos se detecta en tiempo de ejecución y el resultado se descarta con una advertencia.</Note>

Para conocer las firmas completas de los controladores y los tipos de contexto, consulte [Plugin Architecture](/en/plugins/architecture).

### Eventos futuros

Se planean los siguientes tipos de eventos para el flujo de eventos de hook interno.
Tenga en cuenta que `session_start` y `session_end` ya existen como hooks de [Plugin Hook API](/en/plugins/architecture#provider-runtime-hooks)
pero aún no están disponibles como claves de eventos de hook interno en los metadatos de `HOOK.md`:

- **`session:start`**: Cuando comienza una nueva sesión (planificado para el flujo de hook interno; disponible como hook de plugin `session_start`)
- **`session:end`**: Cuando termina una sesión (planificado para el flujo de hook interno; disponible como hook de plugin `session_end`)
- **`agent:error`**: Cuando un agente encuentra un error

## Crear Hooks Personalizados

### 1. Elegir ubicación

- **Hooks de espacio de trabajo** (`<workspace>/hooks/`): Por agente; puede agregar nuevos nombres de hook pero no puede anular los hooks empaquetados, administrados o de complementos con el mismo nombre
- **Hooks administrados** (`~/.openclaw/hooks/`): Compartidos entre espacios de trabajo; puede anular los hooks empaquetados y de complementos

### 2. Crear estructura de directorios

```bash
mkdir -p ~/.openclaw/hooks/my-hook
cd ~/.openclaw/hooks/my-hook
```

### 3. Crear HOOK.md

```markdown
---
name: my-hook
description: "Does something useful"
metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
---

# My Custom Hook

This hook does something useful when you issue `/new`.
```

### 4. Crear handler.ts

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log("[my-hook] Running!");
  // Your logic here
};

export default handler;
```

### 5. Habilitar y probar

```bash
# Verify hook is discovered
openclaw hooks list

# Enable it
openclaw hooks enable my-hook

# Restart your gateway process (menu bar app restart on macOS, or restart your dev process)

# Trigger the event
# Send /new via your messaging channel
```

## Configuración

### Nuevo formato de configuración (Recomendado)

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

### Configuración por Hook

Los hooks pueden tener una configuración personalizada:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": {
            "MY_CUSTOM_VAR": "value"
          }
        }
      }
    }
  }
}
```

### Directorios adicionales

Cargar hooks desde directorios adicionales (tratados como hooks administrados, misma precedencia de anulación):

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

### Formato de configuración heredado (Todavía compatible)

El formato de configuración antiguo todavía funciona por compatibilidad con versiones anteriores:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts",
          "export": "default"
        }
      ]
    }
  }
}
```

Nota: `module` debe ser una ruta relativa al espacio de trabajo. Se rechazan las rutas absolutas y el recorrido fuera del espacio de trabajo.

**Migración**: Utilice el nuevo sistema basado en descubrimiento para los nuevos hooks. Los controladores heredados se cargan después de los hooks basados en directorios.

## Comandos de CLI

### Listar Hooks

```bash
# List all hooks
openclaw hooks list

# Show only eligible hooks
openclaw hooks list --eligible

# Verbose output (show missing requirements)
openclaw hooks list --verbose

# JSON output
openclaw hooks list --json
```

### Información del Hook

```bash
# Show detailed info about a hook
openclaw hooks info session-memory

# JSON output
openclaw hooks info session-memory --json
```

### Verificar elegibilidad

```bash
# Show eligibility summary
openclaw hooks check

# JSON output
openclaw hooks check --json
```

### Habilitar/Deshabilitar

```bash
# Enable a hook
openclaw hooks enable session-memory

# Disable a hook
openclaw hooks disable command-logger
```

## Referencia de hook empaquetado

### session-memory

Guarda el contexto de la sesión en la memoria cuando emite `/new` o `/reset`.

**Eventos**: `command:new`, `command:reset`

**Requisitos**: `workspace.dir` debe estar configurado

**Salida**: `<workspace>/memory/YYYY-MM-DD-slug.md` (el valor predeterminado es `~/.openclaw/workspace`)

**Qué hace**:

1. Usa la entrada de sesión previa al restablecimiento para localizar la transcripción correcta
2. Extrae los últimos 15 mensajes de usuario/asistente de la conversación (configurable)
3. Usa el LLM para generar un slug de nombre de archivo descriptivo
4. Guarda los metadatos de la sesión en un archivo de memoria con fecha

**Ejemplo de salida**:

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram

## Conversation Summary

user: Can you help me design the API?
assistant: Sure! Let's start with the endpoints...
```

**Ejemplos de nombres de archivo**:

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md` (marca de tiempo de respaldo si falla la generación del slug)

**Activar**:

```bash
openclaw hooks enable session-memory
```

### bootstrap-extra-files

Inyecta archivos de arranque adicionales (por ejemplo, `AGENTS.md` / `TOOLS.md` locales de monorepo) durante `agent:bootstrap`.

**Eventos**: `agent:bootstrap`

**Requisitos**: `workspace.dir` debe estar configurado

**Salida**: No se escriben archivos; el contexto de arranque se modifica solo en memoria.

**Config**:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md", "packages/*/TOOLS.md"]
        }
      }
    }
  }
}
```

**Opciones de configuración**:

- `paths` (string[]): patrones glob/ruta para resolver desde el espacio de trabajo.
- `patterns` (string[]): alias de `paths`.
- `files` (string[]): alias de `paths`.

**Notas**:

- Las rutas se resuelven en relación con el espacio de trabajo.
- Los archivos deben permanecer dentro del espacio de trabajo (verificado con realpath).
- Solo se cargan los nombres base de arranque reconocidos (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`, `memory.md`).
- Para sesiones de subagente/cron se aplica una lista de permitidos más estrecha (`AGENTS.md`, `TOOLS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`).

**Activar**:

```bash
openclaw hooks enable bootstrap-extra-files
```

### command-logger

Registra todos los eventos de comandos en un archivo de auditoría centralizado.

**Eventos**: `command`

**Requisitos**: Ninguno

**Salida**: `~/.openclaw/logs/commands.log`

**Qué hace**:

1. Captura los detalles del evento (acción de comando, marca de tiempo, clave de sesión, ID del remitente, fuente)
2. Añade al archivo de registro en formato JSONL
3. Se ejecuta en silencio en segundo plano

**Entradas de registro de ejemplo**:

```jsonl
{"timestamp":"2026-01-16T14:30:00.000Z","action":"new","sessionKey":"agent:main:main","senderId":"+1234567890","source":"telegram"}
{"timestamp":"2026-01-16T15:45:22.000Z","action":"stop","sessionKey":"agent:main:main","senderId":"user@example.com","source":"whatsapp"}
```

**Ver registros**:

```bash
# View recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print with jq
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**Activar**:

```bash
openclaw hooks enable command-logger
```

### boot-md

Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (después de que se inicien los canales).
Los hooks internos deben estar habilitados para que esto se ejecute.

**Eventos**: `gateway:startup`

**Requisitos**: `workspace.dir` debe estar configurado

**Lo que hace**:

1. Lee `BOOT.md` de su espacio de trabajo
2. Ejecuta las instrucciones a través del ejecutor de agentes
3. Envía cualquier mensaje saliente solicitado a través de la herramienta de mensajes

**Activar**:

```bash
openclaw hooks enable boot-md
```

## Buenas prácticas

### Mantenga los controladores rápidos

Los hooks se ejecutan durante el procesamiento de comandos. Manténgalos ligeros:

```typescript
// ✓ Good - async work, returns immediately
const handler: HookHandler = async (event) => {
  void processInBackground(event); // Fire and forget
};

// ✗ Bad - blocks command processing
const handler: HookHandler = async (event) => {
  await slowDatabaseQuery(event);
  await evenSlowerAPICall(event);
};
```

### Maneje los errores con elegancia

Envuelva siempre las operaciones riesgosas:

```typescript
const handler: HookHandler = async (event) => {
  try {
    await riskyOperation(event);
  } catch (err) {
    console.error("[my-handler] Failed:", err instanceof Error ? err.message : String(err));
    // Don't throw - let other handlers run
  }
};
```

### Filtre eventos temprano

Regrese temprano si el evento no es relevante:

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // Your logic here
};
```

### Use claves de evento específicas

Especifique eventos exactos en los metadatos cuando sea posible:

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

En lugar de:

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## Depuración

### Activar registro de Hooks

La puerta de enlace registra la carga de hooks al inicio:

```text
Registered hook: session-memory -> command:new, command:reset
Registered hook: bootstrap-extra-files -> agent:bootstrap
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### Verificar descubrimiento

Listar todos los hooks descubiertos:

```bash
openclaw hooks list --verbose
```

### Verificar registro

En su controlador, registre cuándo se llama:

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### Verificar elegibilidad

Verifique por qué un hook no es elegible:

```bash
openclaw hooks info my-hook
```

Busque requisitos faltantes en la salida.

## Pruebas

### Registros de la puerta de enlace

Monitoree los registros de la puerta de enlace para ver la ejecución del hook:

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### Probar Hooks directamente

Pruebe sus controladores de forma aislada:

```typescript
import { test } from "vitest";
import myHandler from "./hooks/my-hook/handler.js";

test("my handler works", async () => {
  const event = {
    type: "command",
    action: "new",
    sessionKey: "test-session",
    timestamp: new Date(),
    messages: [],
    context: { foo: "bar" },
  };

  await myHandler(event);

  // Assert side effects
});
```

## Arquitectura

### Componentes principales

- **`src/hooks/types.ts`**: Definiciones de tipos
- **`src/hooks/workspace.ts`**: Escaneo y carga de directorios
- **`src/hooks/frontmatter.ts`**: Análisis de metadatos de HOOK.md
- **`src/hooks/config.ts`**: Verificación de elegibilidad
- **`src/hooks/hooks-status.ts`**: Informe de estado
- **`src/hooks/loader.ts`**: Cargador de módulos dinámicos
- **`src/cli/hooks-cli.ts`**: Comandos de CLI
- **`src/gateway/server-startup.ts`**: Carga hooks al inicio de la puerta de enlace
- **`src/auto-reply/reply/commands-core.ts`**: Activa eventos de comando

### Flujo de descubrimiento

```
Gateway startup
    ↓
Scan directories (bundled → plugin → managed + extra dirs → workspace)
    ↓
Parse HOOK.md files
    ↓
Sort by override precedence (bundled < plugin < managed < workspace)
    ↓
Check eligibility (bins, env, config, os)
    ↓
Load handlers from eligible hooks
    ↓
Register handlers for events
```

### Flujo de eventos

```
User sends /new
    ↓
Command validation
    ↓
Create hook event
    ↓
Trigger hook (all registered handlers)
    ↓
Command processing continues
    ↓
Session reset
```

## Solución de problemas

### Hook no descubierto

1. Verifique la estructura del directorio:

   ```bash
   ls -la ~/.openclaw/hooks/my-hook/
   # Should show: HOOK.md, handler.ts
   ```

2. Verifique el formato de HOOK.md:

   ```bash
   cat ~/.openclaw/hooks/my-hook/HOOK.md
   # Should have YAML frontmatter with name and metadata
   ```

3. Listar todos los hooks descubiertos:

   ```bash
   openclaw hooks list
   ```

### Hook no elegible

Verifique los requisitos:

```bash
openclaw hooks info my-hook
```

Busque lo que falta:

- Binarios (verificar PATH)
- Variables de entorno
- Valores de configuración
- Compatibilidad con el sistema operativo

### Hook No Ejecutándose

1. Verificar que el hook esté habilitado:

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. Reinicie su proceso de puerta de enlace para que los hooks se recarguen.

3. Revise los registros de la puerta de enlace en busca de errores:

   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### Errores del Manejador

Comprobar si hay errores de TypeScript/importación:

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## Guía de Migración

### Desde la Configuración Heredada hasta el Descubrimiento

**Antes**:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "handlers": [
        {
          "event": "command:new",
          "module": "./hooks/handlers/my-handler.ts"
        }
      ]
    }
  }
}
```

**Después**:

1. Crear directorio de hook:

   ```bash
   mkdir -p ~/.openclaw/hooks/my-hook
   mv ./hooks/handlers/my-handler.ts ~/.openclaw/hooks/my-hook/handler.ts
   ```

2. Crear HOOK.md:

   ```markdown
   ---
   name: my-hook
   description: "My custom hook"
   metadata: { "openclaw": { "emoji": "🎯", "events": ["command:new"] } }
   ---

   # My Hook

   Does something useful.
   ```

3. Actualizar configuración:

   ```json
   {
     "hooks": {
       "internal": {
         "enabled": true,
         "entries": {
           "my-hook": { "enabled": true }
         }
       }
     }
   }
   ```

4. Verificar y reiniciar su proceso de puerta de enlace:

   ```bash
   openclaw hooks list
   # Should show: 🎯 my-hook ✓
   ```

**Beneficios de la migración**:

- Descubrimiento automático
- Gestión por CLI
- Verificación de elegibilidad
- Mejor documentación
- Estructura consistente

## Véase También

- [Referencia de CLI: hooks](/en/cli/hooks)
- [LÉEME de Hooks Incluidos](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Webhook Hooks](/en/automation/webhook)
- [Configuración](/en/gateway/configuration-reference#hooks)
