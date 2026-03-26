---
summary: "Hooks: automatización basada en eventos para comandos y eventos del ciclo de vida"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Los Hooks proporcionan un sistema extensible basado en eventos para automatizar acciones en respuesta a comandos y eventos del agente. Los Hooks se descubren automáticamente desde los directorios y se pueden gestionar mediante comandos de CLI, de manera similar a como funcionan las habilidades en OpenClaw.

## Orientación

Los Hooks son pequeños scripts que se ejecutan cuando sucede algo. Hay dos tipos:

- **Hooks** (esta página): se ejecutan dentro del Gateway cuando se disparan eventos del agente, como `/new`, `/reset`, `/stop`, o eventos del ciclo de vida.
- **Webhooks**: webhooks HTTP externos que permiten a otros sistemas desencadenar trabajo en OpenClaw. Consulte [Webhook Hooks](/es/automation/webhook) o use `openclaw webhooks` para comandos auxiliares de Gmail.

Los ganchos también se pueden agrupar dentro de complementos; consulte [Ganchos de complemento](/es/plugins/architecture#provider-runtime-hooks).

Usos comunes:

- Guardar una instantánea de la memoria cuando restablezca una sesión
- Mantener un registro de auditoría de los comandos para solucionar problemas o cumplimiento
- Desencadenar una automatización de seguimiento cuando una sesión inicia o termina
- Escribir archivos en el espacio de trabajo del agente o llamar a API externas cuando se disparan eventos

Si puede escribir una pequeña función de TypeScript, puede escribir un Hook. Los Hooks se descubren automáticamente y los habilita o deshabilita a través de la CLI.

## Descripción general

El sistema de Hooks le permite:

- Guardar el contexto de la sesión en la memoria cuando se emite `/new`
- Registrar todos los comandos para auditoría
- Desencadenar automatizaciones personalizadas en eventos del ciclo de vida del agente
- Ampliar el comportamiento de OpenClaw sin modificar el código central

## Primeros pasos

### Hooks incluidos

OpenClaw incluye cuatro Hooks incluidos que se descubren automáticamente:

- **💾 session-memory**: Guarda el contexto de la sesión en su espacio de trabajo del agente (por defecto `~/.openclaw/workspace/memory/`) cuando emite `/new`
- **📎 bootstrap-extra-files**: Inyecta archivos de arranque adicionales del espacio de trabajo desde patrones glob/ruta configurados durante `agent:bootstrap`
- **📝 command-logger**: Registra todos los eventos de comandos en `~/.openclaw/logs/commands.log`
- **🚀 boot-md**: Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (requiere que los enlaces internos estén habilitados)

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

Durante la incorporación (`openclaw onboard`), se le pedirá que habilite los enlaces recomendados. El asistente descubre automáticamente los enlaces elegibles y los presenta para su selección.

## Descubrimiento de Enlaces

Los enlaces se descubren automáticamente desde tres directorios (en orden de precedencia):

1. **Enlaces del espacio de trabajo**: `<workspace>/hooks/` (por agente, mayor precedencia)
2. **Enlaces administrados**: `~/.openclaw/hooks/` (instalados por el usuario, compartidos entre espacios de trabajo)
3. **Enlaces incluidos**: `<openclaw>/dist/hooks/bundled/` (enviados con OpenClaw)

Los directorios de enlaces administrados pueden ser un **único enlace** o un **paquete de enlaces** (directorio de paquetes).

Cada enlace es un directorio que contiene:

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Paquetes de Enlaces (npm/archivos)

Los paquetes de enlaces son paquetes npm estándar que exportan uno o más enlaces a través de `openclaw.hooks` en
`package.json`. Instálelos con:

```bash
openclaw hooks install <path-or-spec>
```

Las especificaciones de npm son solo de registro (nombre del paquete + versión exacta opcional o etiqueta de distribución).
Las especificaciones de Git/URL/archivo y los rangos de semver se rechazan.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
estas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta de versión preliminar como `@beta`/`@rc` o una versión preliminar exacta.

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

Cada entrada apunta a un directorio de enlaces que contiene `HOOK.md` y `handler.ts` (o `index.ts`).
Los paquetes de enlaces pueden enviar dependencias; se instalarán en `~/.openclaw/hooks/<id>`.
Cada entrada `openclaw.hooks` debe permanecer dentro del directorio del paquete después de la resolución
de enlaces simbólicos; las entradas que escapen se rechazan.

Nota de seguridad: `openclaw hooks install` instala dependencias con `npm install --ignore-scripts`
(sin scripts de ciclo de vida). Mantenga los árboles de dependencias de los paquetes de enlaces como "JS/TS puro" y evite paquetes que dependen
de compilaciones `postinstall`.

## Estructura del Enlace

### Formato HOOK.md

El archivo `HOOK.md` contiene metadatos en el frontmatter YAML más documentación Markdown:

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

El objeto `metadata.openclaw` soporta:

- **`emoji`**: Emoji a mostrar para la CLI (por ejemplo, `"💾"`)
- **`events`**: Array de eventos a escuchar (por ejemplo, `["command:new", "command:reset"]`)
- **`export`**: Export con nombre a usar (por defecto `"default"`)
- **`homepage`**: URL de documentación
- **`requires`**: Requisitos opcionales
  - **`bins`**: Binarios requeridos en PATH (por ejemplo, `["git", "node"]`)
  - **`anyBins`**: Al menos uno de estos binarios debe estar presente
  - **`env`**: Variables de entorno requeridas
  - **`config`**: Rutas de configuración requeridas (por ejemplo, `["workspace.dir"]`)
  - **`os`**: Plataformas requeridas (por ejemplo, `["darwin", "linux"]`)
- **`always`**: Omitir comprobaciones de elegibilidad (booleano)
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
    // Command events:
    sessionEntry?: SessionEntry,
    sessionId?: string,
    sessionFile?: string,
    commandSource?: string,    // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    bootstrapFiles?: WorkspaceBootstrapFile[],
    cfg?: OpenClawConfig,
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

### Eventos de Comandos

Se activan cuando se emiten comandos del agente:

- **`command`**: Todos los eventos de comandos (escucha general)
- **`command:new`**: Cuando se emite el comando `/new`
- **`command:reset`**: Cuando se emite el comando `/reset`
- **`command:stop`**: Cuando se emite el comando `/stop`

### Eventos de Sesión

- **`session:compact:before`**: Justo antes de que la compactación resuma el historial
- **`session:compact:after`**: Después de que la compactación se completa con metadatos de resumen

Los payloads internos de los hooks emiten estos como `type: "session"` con `action: "compact:before"` / `action: "compact:after"`; los oyentes se suscriben con las claves combinadas anteriores.
El registro específico del manejador utiliza el formato de clave literal `${type}:${action}`. Para estos eventos, registre `session:compact:before` y `session:compact:after`.

### Eventos de Agente

- **`agent:bootstrap`**: Antes de que se inyecten los archivos de arranque del espacio de trabajo (los hooks pueden mutar `context.bootstrapFiles`)

### Eventos de Gateway

Se activan cuando se inicia el gateway:

- **`gateway:startup`**: Después de que se inician los canales y se cargan los hooks

### Eventos de Mensaje

Se activan cuando se reciben o envían mensajes:

- **`message`**: Todos los eventos de mensaje (oyente general)
- **`message:received`**: Cuando se recibe un mensaje entrante de cualquier canal. Se dispara temprano en el procesamiento antes de la comprensión de medios. El contenido puede contener marcadores de posición sin procesar como `<media:audio>` para archivos adjuntos de medios que aún no se han procesado.
- **`message:transcribed`**: Cuando un mensaje ha sido completamente procesado, incluyendo la transcripción de audio y la comprensión de enlaces. En este punto, `transcript` contiene el texto completo de la transcripción para mensajes de audio. Utilice este hook cuando necesite acceder al contenido de audio transcrito.
- **`message:preprocessed`**: Se dispara para cada mensaje después de que se completa toda la comprensión de medios + enlaces, dando a los hooks acceso al cuerpo completamente enriquecido (transcripciones, descripciones de imágenes, resúmenes de enlaces) antes de que el agente lo vea.
- **`message:sent`**: Cuando un mensaje saliente se envía correctamente

#### Contexto del Evento de Mensaje

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
    threadId?: string,
    senderId?: string,
    senderName?: string,
    senderUsername?: string,
    senderE164?: string,
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
  body?: string,          // Raw inbound body before enrichment
  bodyForAgent?: string,  // Enriched body visible to the agent
  transcript: string,     // Audio transcript text
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
}

// message:preprocessed context
{
  body?: string,          // Raw inbound body
  bodyForAgent?: string,  // Final enriched body after media/link understanding
  transcript?: string,    // Transcript when audio was present
  channelId: string,      // Channel (e.g., "telegram", "whatsapp")
  conversationId?: string,
  messageId?: string,
  isGroup?: boolean,
  groupId?: string,
}
```

#### Ejemplo: Hook de Registrador de Mensajes

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

### Hooks de Resultados de Herramientas (API de Plugin)

Estos hooks no son oyentes de flujo de eventos; permiten que los plugins ajusten sincrónicamente los resultados de las herramientas antes de que OpenClaw los persista.

- **`tool_result_persist`**: transformar los resultados de las herramientas antes de que se escriban en la transcripción de la sesión. Debe ser síncrono; devuelva el payload actualizado del resultado de la herramienta o `undefined` para dejarlo como está. Vea [Bucle de Agente](/es/concepts/agent-loop).

### Eventos de Hook de Complemento

Hooks del ciclo de vida de compactación expuestos a través del ejecutor de hooks de complemento:

- **`before_compaction`**: Se ejecuta antes de la compactación con metadatos de recuento/tokens
- **`after_compaction`**: Se ejecuta después de la compactación con metadatos del resumen de compactación

### Eventos Futuros

Tipos de eventos planificados:

- **`session:start`**: Cuando comienza una nueva sesión
- **`session:end`**: Cuando termina una sesión
- **`agent:error`**: Cuando un agente encuentra un error

## Crear Hooks Personalizados

### 1. Elegir Ubicación

- **Hooks del espacio de trabajo** (`<workspace>/hooks/`): Por agente, mayor prioridad
- **Hooks administrados** (`~/.openclaw/hooks/`): Compartidos entre espacios de trabajo

### 2. Crear Estructura de Directorios

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

### 5. Habilitar y Probar

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

### Nuevo Formato de Configuración (Recomendado)

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

Los hooks pueden tener configuración personalizada:

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

### Directorios Adicionales

Cargar hooks desde directorios adicionales:

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

### Formato de Configuración Heredado (Aún Compatible)

El formato de configuración antiguo sigue funcionando por compatibilidad hacia atrás:

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

**Migración**: Utilice el nuevo sistema basado en descubrimiento para nuevos hooks. Los controladores heredados se cargan después de los hooks basados en directorios.

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

### Verificar Elegibilidad

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

## Referencia de hooks incluidos

### memoria-de-sesión

Guarda el contexto de la sesión en la memoria cuando emites `/new`.

**Eventos**: `command:new`

**Requisitos**: `workspace.dir` debe estar configurado

**Salida**: `<workspace>/memory/YYYY-MM-DD-slug.md` (predeterminado en `~/.openclaw/workspace`)

**Lo que hace**:

1. Utiliza la entrada de sesión previa al reinicio para localizar la transcripción correcta
2. Extrae las últimas 15 líneas de la conversación
3. Utiliza LLM para generar un slug de nombre de archivo descriptivo
4. Guarda los metadatos de la sesión en un archivo de memoria con fecha

**Ejemplo de salida**:

```markdown
# Session: 2026-01-16 14:30:00 UTC

- **Session Key**: agent:main:main
- **Session ID**: abc123def456
- **Source**: telegram
```

**Ejemplos de nombres de archivo**:

- `2026-01-16-vendor-pitch.md`
- `2026-01-16-api-design.md`
- `2026-01-16-1430.md` (marca de tiempo de reserva si falla la generación del slug)

**Habilitar**:

```bash
openclaw hooks enable session-memory
```

### archivos-extra-de-inicialización

Inyecta archivos de arranque adicionales (por ejemplo, `AGENTS.md` / `TOOLS.md` locales de monorepo) durante `agent:bootstrap`.

**Eventos**: `agent:bootstrap`

**Requisitos**: `workspace.dir` debe estar configurado

**Salida**: No se escriben archivos; el contexto de arranque se modifica solo en memoria.

**Configuración**:

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

**Notas**:

- Las rutas se resuelven en relación con el espacio de trabajo.
- Los archivos deben permanecer dentro del espacio de trabajo (verificados con realpath).
- Solo se cargan los nombres base de arranque reconocidos.
- Se conserva la lista de permitidos del subagente (solo `AGENTS.md` y `TOOLS.md`).

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
2. Ejecuta las instrucciones mediante el ejecutor del agente
3. Envía cualquier mensaje saliente solicitado a través de la herramienta de mensajes

**Activar**:

```bash
openclaw hooks enable boot-md
```

## Buenas Prácticas

### Mantener los Controladores Rápidos

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

### Manejar Errores con Gracia

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

### Filtrar Eventos Temprano

Retorne temprano si el evento no es relevante:

```typescript
const handler: HookHandler = async (event) => {
  // Only handle 'new' commands
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  // Your logic here
};
```

### Usar Claves de Evento Específicas

Especifique eventos exactos en los metadatos cuando sea posible:

```yaml
metadata: { "openclaw": { "events": ["command:new"] } } # Specific
```

Más que:

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## Depuración

### Activar el Registro de Hooks

La puerta de enlace registra la carga de hooks al inicio:

```
Registered hook: session-memory -> command:new
Registered hook: bootstrap-extra-files -> agent:bootstrap
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### Verificar Descubrimiento

Listar todos los hooks descubiertos:

```bash
openclaw hooks list --verbose
```

### Verificar Registro

En su controlador, registre cuándo se llama:

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### Verificar Elegibilidad

Verifique por qué un hook no es elegible:

```bash
openclaw hooks info my-hook
```

Busque requisitos faltantes en la salida.

## Pruebas

### Registros de la Puerta de Enlace

Monitoree los registros de la puerta de enlace para ver la ejecución del hook:

```bash
# macOS
./scripts/clawlog.sh -f

# Other platforms
tail -f ~/.openclaw/gateway.log
```

### Probar Hooks Directamente

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
- **`src/gateway/server-startup.ts`**: Carga los hooks al iniciar la puerta de enlace
- **`src/auto-reply/reply/commands-core.ts`**: Activa eventos de comandos

### Flujo de descubrimiento

```
Gateway startup
    ↓
Scan directories (workspace → managed → bundled)
    ↓
Parse HOOK.md files
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

1. Verificar la estructura del directorio:

   ```bash
   ls -la ~/.openclaw/hooks/my-hook/
   # Should show: HOOK.md, handler.ts
   ```

2. Verificar el formato de HOOK.md:

   ```bash
   cat ~/.openclaw/hooks/my-hook/HOOK.md
   # Should have YAML frontmatter with name and metadata
   ```

3. Listar todos los hooks descubiertos:

   ```bash
   openclaw hooks list
   ```

### Hook no elegible

Verificar los requisitos:

```bash
openclaw hooks info my-hook
```

Buscar elementos faltantes:

- Binarios (verificar PATH)
- Variables de entorno
- Valores de configuración
- Compatibilidad con el sistema operativo

### Hook No Se Ejecuta

1. Verifique que el hook esté habilitado:

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

4. Verifique y reinicie su proceso de puerta de enlace:

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

- [Referencia de la CLI: hooks](/es/cli/hooks)
- [Léame de los Hooks Incluidos](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Hooks de Webhook](/es/automation/webhook)
- [Configuración](/es/gateway/configuration-reference#hooks)

import es from "/components/footer/es.mdx";

<es />
