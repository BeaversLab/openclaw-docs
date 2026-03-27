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

- **Hooks** (esta página): se ejecutan dentro de la Gateway cuando se activan eventos del agente, como `/new`, `/reset`, `/stop`, o eventos del ciclo de vida.
- **Webhooks**: webhooks HTTP externos que permiten a otros sistemas activar trabajo en OpenClaw. Consulte [Webhook Hooks](/es/automation/webhook) o use `openclaw webhooks` para los comandos auxiliares de Gmail.

Los Hooks también se pueden incluir en complementos (plugins); consulte [Plugin hooks](/es/plugins/architecture#provider-runtime-hooks). `openclaw hooks list` muestra tanto los hooks independientes como los hooks gestionados por complementos.

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

Los Hooks se ejecutan dentro del proceso Gateway. Trate los hooks incluidos, los hooks administrados y `hooks.internal.load.extraDirs` como código local confiable. Los hooks del espacio de trabajo bajo `<workspace>/hooks/` son código local al repositorio, por lo que OpenClaw requiere un paso de habilitación explícito antes de cargarlos.

## Descubrimiento de Hooks

Los hooks se descubren automáticamente desde estos directorios, en orden de precedencia de anulación creciente:

1. **Hooks incluidos**: enviados con OpenClaw; ubicados en `<openclaw>/dist/hooks/bundled/` para instalaciones de npm (o un `hooks/bundled/` adjunto para binarios compilados)
2. **Hooks de complementos**: hooks incluidos dentro de complementos instalados (consulte [Hooks de complementos](/es/plugins/architecture#provider-runtime-hooks))
3. **Hooks administrados**: `~/.openclaw/hooks/` (instalados por el usuario, compartidos entre espacios de trabajo; pueden anular los hooks incluidos y de complementos). Los **directorios de hooks adicionales** configurados a través de `hooks.internal.load.extraDirs` también se tratan como hooks administrados y comparten la misma precedencia de anulación.
4. **Hooks del espacio de trabajo**: `<workspace>/hooks/` (por agente, deshabilitados de forma predeterminada hasta que se habiliten explícitamente; no pueden anular hooks de otras fuentes)

Los hooks del espacio de trabajo pueden agregar nuevos nombres de hooks para un repositorio, pero no pueden anular los hooks incluidos, administrados o proporcionados por complementos con el mismo nombre.

Los directorios de hooks administrados pueden ser un **único hook** o un **paquete de hooks** (directorio de paquetes).

Cada hook es un directorio que contiene:

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Paquetes de Hooks (npm/archivos)

Los paquetes de hooks son paquetes npm estándar que exportan uno o más hooks a través de `openclaw.hooks` en
`package.json`. Instálelos con:

```bash
openclaw plugins install <path-or-spec>
```

Las especificaciones de npm son solo de registro (nombre del paquete + versión exacta opcional o etiqueta de distribución).
Las especificaciones de Git/URL/archivo y los rangos semver se rechazan.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve alguna de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta.

Ejemplo de `package.json`:

```json
{
  "name": "@acme/my-hooks",
  "version": "0.1.0",
  "openclaw": {
    "hooks": ["./hooks/my-hook", "./hooks/other-hook"]
  }
}
```

Cada entrada apunta a un directorio de hook que contiene `HOOK.md` y `handler.ts` (o `index.ts`).
Los hook packs pueden incluir dependencias; se instalarán en `~/.openclaw/hooks/<id>`.
Cada entrada `openclaw.hooks` debe permanecer dentro del directorio del paquete después de la resolución
de enlaces simbólicos; se rechazan las entradas que salen de él.

Nota de seguridad: `openclaw plugins install` instala las dependencias del hook-pack con `npm install --ignore-scripts`
(sin scripts de ciclo de vida). Mantenga los árboles de dependencias de hook pack como "JS/TS puro" y evite paquetes que dependan
de compilaciones `postinstall`.

## Estructura del Hook

### Formato HOOK.md

El archivo `HOOK.md` contiene metadatos en el frontmatter de YAML más documentación de Markdown:

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/automation/hooks#my-hook
metadata:
  { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
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

- **`emoji`**: Emoji de visualización para la CLI (por ejemplo, `"💾"`)
- **`events`**: Array de eventos a escuchar (por ejemplo, `["command:new", "command:reset"]`)
- **`export`**: Exportación con nombre a utilizar (por defecto `"default"`)
- **`homepage`**: URL de documentación
- **`os`**: Plataformas requeridas (por ejemplo, `["darwin", "linux"]`)
- **`requires`**: Requisitos opcionales
  - **`bins`**: Binarios requeridos en PATH (por ejemplo, `["git", "node"]`)
  - **`anyBins`**: Al menos uno de estos binarios debe estar presente
  - **`env`**: Variables de entorno requeridas
  - **`config`**: Rutas de configuración requeridas (por ejemplo, `["workspace.dir"]`)
- **`always`**: Omitir comprobaciones de elegibilidad (booleano)
- **`install`**: Métodos de instalación (para hooks empaquetados: `[{"id":"bundled","kind":"bundled"}]`)

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
- **`session:compact:after`**: Después de que la compactación se completa con metadatos de resumen

Las cargas útiles internas de los hooks emiten estos como `type: "session"` con `action: "compact:before"` / `action: "compact:after"`; los escuchas se suscriben con las claves combinadas anteriores.
El registro específico de manejadores utiliza el formato de clave literal `${type}:${action}`. Para estos eventos, registre `session:compact:before` y `session:compact:after`.

### Eventos de agente

- **`agent:bootstrap`**: Antes de que se inyecten los archivos de arranque del espacio de trabajo (los hooks pueden mutar `context.bootstrapFiles`)

### Eventos de puerta de enlace

Se activa cuando se inicia la puerta de enlace:

- **`gateway:startup`**: Después de que se inician los canales y se cargan los hooks

### Eventos de parche de sesión

Se activa cuando se modifican las propiedades de la sesión:

- **`session:patch`**: Cuando se actualiza una sesión

#### Contexto del evento de sesión

Los eventos de sesión incluyen un contexto rico sobre la sesión y los cambios:

```typescript
{
  sessionEntry: SessionEntry, // The complete updated session entry
  patch: {                    // The patch object (only changed fields)
    // Session identity & labeling
    label?: string | null,           // Human-readable session label

    // AI model configuration
    model?: string | null,           // Model override (e.g., "claude-opus-4-5")
    thinkingLevel?: string | null,   // Thinking level ("off"|"low"|"med"|"high")
    verboseLevel?: string | null,    // Verbose output level
    reasoningLevel?: string | null,  // Reasoning mode override
    elevatedLevel?: string | null,   // Elevated mode override
    responseUsage?: "off" | "tokens" | "full" | null, // Usage display mode

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

**Nota de seguridad:** Solo los clientes privilegiados (incluida la interfaz de usuario de Control) pueden activar eventos `session:patch`. A los clientes estándar de WebChat se les bloquea el parcheo de sesiones (ver PR #20800), por lo que el hook no se activará desde esas conexiones.

Consulte `SessionsPatchParamsSchema` en `src/gateway/protocol/schema/sessions.ts` para la definición completa del tipo.

#### Ejemplo: Hook de registrador de parches de sesión

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

### Eventos de mensaje

Se activa cuando se reciben o envían mensajes:

- **`message`**: Todos los eventos de mensaje (escucha general)
- **`message:received`**: Cuando se recibe un mensaje entrante de cualquier canal. Se activa temprano en el procesamiento antes de la comprensión de medios. El contenido puede contener marcadores de posición sin procesar como `<media:audio>` para archivos adjuntos de medios que aún no se han procesado.
- **`message:transcribed`**: Cuando un mensaje se ha procesado completamente, incluyendo la transcripción de audio y la comprensión de enlaces. En este punto, `transcript` contiene el texto completo de la transcripción para mensajes de audio. Use este hook cuando necesite acceder al contenido de audio transcrito.
- **`message:preprocessed`**: Se activa para cada mensaje después de que se completa toda la comprensión de medios y enlaces, dando a los hooks acceso al cuerpo completamente enriquecido (transcripciones, descripciones de imágenes, resúmenes de enlaces) antes de que el agente lo vea.
- **`message:sent`**: Cuando un mensaje saliente se envía correctamente

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

#### Ejemplo: Hook de registrador de mensajes

```typescript
const isMessageReceivedEvent = (event: { type: string; action: string }) =>
  event.type === "message" && event.action === "received";
const isMessageSentEvent = (event: { type: string; action: string }) =>
  event.type === "message" && event.action === "sent";

const handler = async (event) => {
  if (isMessageReceivedEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Received from ${event.context.from}: ${event.context.content}`);
  } else if (isMessageSentEvent(event as { type: string; action: string })) {
    console.log(`[message-logger] Sent to ${event.context.to}: ${event.context.content}`);
  }
};

export default handler;
```

### Hooks de resultados de herramientas (API de complementos)

Estos hooks no son oyentes de flujos de eventos; permiten que los complementos ajusten sincrónicamente los resultados de las herramientas antes de que OpenClaw los persista.

- **`tool_result_persist`**: transformar los resultados de las herramientas antes de que se escriban en la transcripción de la sesión. Debe ser síncrono; devuelva la carga útil del resultado de la herramienta actualizada o `undefined` para mantenerla tal cual. Vea [Agent Loop](/es/concepts/agent-loop).

### Eventos de hooks de complementos

Hooks del ciclo de vida de compactación expuestos a través del ejecutor de hooks de complementos:

- **`before_compaction`**: Se ejecuta antes de la compactación con metadatos de recuento/tokens
- **`after_compaction`**: Se ejecuta después de la compactación con metadatos de resumen de compactación

### Eventos futuros

Tipos de eventos planificados:

- **`session:start`**: Cuando comienza una nueva sesión
- **`session:end`**: Cuando termina una sesión
- **`agent:error`**: Cuando un agente encuentra un error

## Creación de hooks personalizados

### 1. Elegir ubicación

- **Hooks del espacio de trabajo** (`<workspace>/hooks/`): Por agente; puede agregar nuevos nombres de hooks pero no puede anular los hooks integrados, administrados o de complementos con el mismo nombre
- **Ganchos administrados** (`~/.openclaw/hooks/`): Compartidos entre espacios de trabajo; pueden anular los ganchos integrados y de complementos

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

### Configuración por gancho

Los ganchos pueden tener configuración personalizada:

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

Cargar ganchos desde directorios adicionales (tratados como ganchos administrados, misma precedencia de anulación):

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

**Migración**: Utilice el nuevo sistema basado en descubrimiento para los nuevos ganchos. Los controladores heredados se cargan después de los ganchos basados en directorios.

## Comandos de CLI

### Listar ganchos

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

### Información del gancho

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

## Referencia de ganchos integrados

### memoria-de-sesión

Guarda el contexto de la sesión en la memoria cuando emite `/new` o `/reset`.

**Eventos**: `command:new`, `command:reset`

**Requisitos**: `workspace.dir` debe estar configurado

**Salida**: `<workspace>/memory/YYYY-MM-DD-slug.md` (el valor predeterminado es `~/.openclaw/workspace`)

**Lo que hace**:

1. Utiliza la entrada de sesión previa al restablecimiento para localizar la transcripción correcta
2. Extrae los últimos 15 mensajes de usuario/asistente de la conversación (configurable)
3. Utiliza LLM para generar un slug de nombre de archivo descriptivo
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
- `2026-01-16-1430.md` (marca de tiempo de reserva si falla la generación del slug)

**Activar**:

```bash
openclaw hooks enable session-memory
```

### archivos-extra-de-inicialización

Inyecta archivos de inicialización adicionales (por ejemplo, `AGENTS.md` / `TOOLS.md` locales de monorepo) durante `agent:bootstrap`.

**Eventos**: `agent:bootstrap`

**Requisitos**: `workspace.dir` debe estar configurado

**Salida**: No se escriben archivos; el contexto de inicialización se modifica solo en memoria.

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

**Lo que hace**:

1. Captura detalles del evento (acción de comando, marca de tiempo, clave de sesión, ID del remitente, origen)
2. Añade al archivo de registro en formato JSONL
3. Se ejecuta silenciosamente en segundo plano

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

## Mejores Prácticas

### Mantenga los Controladores Rápidos

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

### Maneje los Errores con Gracia

Siempre envuelva operaciones riesgosas:

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

### Filtre Eventos Temprano

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

### Use Claves de Evento Específicas

Especifique eventos exactos en los metadatos cuando sea posible:

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

Más que:

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## Depuración

### Activar Registro de Hooks

La puerta de enlace registra la carga de los ganchos al inicio:

```
Registered hook: session-memory -> command:new
Registered hook: bootstrap-extra-files -> agent:bootstrap
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### Comprobar Descubrimiento

Listar todos los ganchos descubiertos:

```bash
openclaw hooks list --verbose
```

### Comprobar Registro

En su controlador, registre cuándo se llama:

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### Verificar Elegibilidad

Compruebe por qué un gancho no es elegible:

```bash
openclaw hooks info my-hook
```

Busque requisitos faltantes en la salida.

## Pruebas

### Registros de la Puerta de Enlace

Monitoree los registros de la puerta de enlace para ver la ejecución del gancho:

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### Probar Ganchos Directamente

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

### Componentes Principales

- **`src/hooks/types.ts`**: Definiciones de tipos
- **`src/hooks/workspace.ts`**: Escaneo y carga de directorios
- **`src/hooks/frontmatter.ts`**: Análisis de metadatos HOOK.md
- **`src/hooks/config.ts`**: Verificación de elegibilidad
- **`src/hooks/hooks-status.ts`**: Informe de estado
- **`src/hooks/loader.ts`**: Cargador de módulos dinámicos
- **`src/cli/hooks-cli.ts`**: Comandos CLI
- **`src/gateway/server-startup.ts`**: Carga ganchos al iniciar la puerta de enlace
- **`src/auto-reply/reply/commands-core.ts`**: Activa eventos de comandos

### Flujo de Descubrimiento

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

### Flujo de Eventos

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

## Solución de Problemas

### Gancho No Descubierto

1. Compruebe la estructura del directorio:

   ```bash
   ls -la ~/.openclaw/hooks/my-hook/
   # Should show: HOOK.md, handler.ts
   ```

2. Verifique el formato HOOK.md:

   ```bash
   cat ~/.openclaw/hooks/my-hook/HOOK.md
   # Should have YAML frontmatter with name and metadata
   ```

3. Listar todos los ganchos descubiertos:

   ```bash
   openclaw hooks list
   ```

### Gancho No Elegible

Verifique los requisitos:

```bash
openclaw hooks info my-hook
```

Busque lo que falta:

- Binarios (verificar PATH)
- Variables de entorno
- Valores de configuración
- Compatibilidad con el sistema operativo

### El Gancho No Se Ejecuta

1. Verifique que el gancho esté habilitado:

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. Reinicie el proceso de su puerta de enlace para que los ganchos se vuelvan a cargar.

3. Revise los registros de la puerta de enlace en busca de errores:

   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### Errores del Controlador

Busque errores de TypeScript/importación:

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

1. Crear directorio de gancho:

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

4. Verifique y reinicie el proceso de su puerta de enlace:

   ```bash
   openclaw hooks list
   # Should show: 🎯 my-hook ✓
   ```

**Beneficios de la migración**:

- Descubrimiento automático
- Gestión CLI
- Verificación de elegibilidad
- Mejor documentación
- Estructura consistente

## Véase También

- [Referencia CLI: hooks](/es/cli/hooks)
- [Léeme de Ganchos Incluidos](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Ganchos de Webhook](/es/automation/webhook)
- [Configuración](/es/gateway/configuration-reference#hooks)

import es from "/components/footer/es.mdx";

<es />
