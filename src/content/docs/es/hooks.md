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

- **Hooks** (esta página): se ejecutan dentro de la Gateway cuando se activan eventos del agente, como `/new`, `/reset`, `/stop` o eventos del ciclo de vida.
- **Webhooks**: webhooks HTTP externos que permiten a otros sistemas activar trabajo en OpenClaw. Consulte [Webhook Hooks](/es/automation/webhook) o use `openclaw webhooks` para comandos auxiliares de Gmail.

Los Hooks también se pueden incluir en paquetes (plugins); consulte [Plugins](/es/plugin#plugin-hooks).

Usos comunes:

- Guardar una instantánea de la memoria cuando restablezca una sesión
- Mantener un registro de auditoría de los comandos para solucionar problemas o cumplimiento
- Activar una automatización de seguimiento cuando una sesión inicia o termina
- Escribir archivos en el espacio de trabajo del agente o llamar a API externas cuando se activan eventos

Si puede escribir una pequeña función de TypeScript, puede escribir un hook. Los Hooks se descubren automáticamente y se habilitan o deshabilitan a través de la CLI.

## Descripción general

El sistema de Hooks le permite:

- Guardar el contexto de la sesión en la memoria cuando se emite `/new`
- Registrar todos los comandos para auditoría
- Activar automatizaciones personalizadas en eventos del ciclo de vida del agente
- Extender el comportamiento de OpenClaw sin modificar el código central

## Primeros pasos

### Hooks incluidos

OpenClaw incluye cuatro hooks que se descubren automáticamente:

- **💾 session-memory**: Guarda el contexto de la sesión en su espacio de trabajo del agente (por defecto `~/.openclaw/workspace/memory/`) cuando emite `/new`
- **📝 command-logger**: Registra todos los eventos de comandos en `~/.openclaw/logs/commands.log`
- **🚀 boot-md**: Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (requiere que los hooks internos estén habilitados)
- **😈 soul-evil**: Intercambia el contenido inyectado de `SOUL.md` con `SOUL_EVIL.md` durante una ventana de purga o por casualidad aleatoria

Listar los hooks disponibles:

```bash
openclaw hooks list
```

Activar un hook:

```bash
openclaw hooks enable session-memory
```

Verificar el estado del hook:

```bash
openclaw hooks check
```

Obtener información detallada:

```bash
openclaw hooks info session-memory
```

### Incorporación

Durante la incorporación (`openclaw onboard`), se le solicitará que active los hooks recomendados. El asistente descubre automáticamente los hooks elegibles y los presenta para su selección.

## Descubrimiento de Hooks

Los hooks se descubren automáticamente desde tres directorios (en orden de prioridad):

1. **Hooks del espacio de trabajo**: `<workspace>/hooks/` (por agente, mayor prioridad)
2. **Hooks gestionados**: `~/.openclaw/hooks/` (instalados por el usuario, compartidos entre espacios de trabajo)
3. **Hooks incluidos**: `<openclaw>/dist/hooks/bundled/` (enviados con OpenClaw)

Los directorios de hooks gestionados pueden ser un **único hook** o un **paquete de hooks** (directorio de paquete).

Cada hook es un directorio que contiene:

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

## Paquetes de Hooks (npm/archivos)

Los paquetes de hooks son paquetes estándar de npm que exportan uno o más hooks a través de `openclaw.hooks` en
`package.json`. Instálelos con:

```bash
openclaw hooks install <path-or-spec>
```

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

Cada entrada apunta a un directorio de hooks que contiene `HOOK.md` y `handler.ts` (o `index.ts`).
Los paquetes de hooks pueden enviar dependencias; se instalarán en `~/.openclaw/hooks/<id>`.

## Estructura del Hook

### Formato HOOK.md

El archivo `HOOK.md` contiene metadatos en el frontmatter YAML más documentación de Markdown:

```markdown
---
name: my-hook
description: "Short description of what this hook does"
homepage: https://docs.openclaw.ai/hooks#my-hook
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

- **`emoji`**: Emoji de visualización para la CLI (por ejemplo, `"💾"`)
- **`events`**: Matriz de eventos a los que escuchar (por ejemplo, `["command:new", "command:reset"]`)
- **`export`**: Exportación con nombre a utilizar (por defecto es `"default"`)
- **`homepage`**: URL de documentación
- **`requires`**: Requisitos opcionales
  - **`bins`**: Binarios requeridos en PATH (por ejemplo, `["git", "node"]`)
  - **`anyBins`**: Al menos uno de estos binarios debe estar presente
  - **`env`**: Variables de entorno requeridas
  - **`config`**: Rutas de configuración requeridas (ej., `["workspace.dir"]`)
  - **`os`**: Plataformas requeridas (ej., `["darwin", "linux"]`)
- **`always`**: Omitir comprobaciones de elegibilidad (booleano)
- **`install`**: Métodos de instalación (para hooks incluidos: `[{"id":"bundled","kind":"bundled"}]`)

### Implementación del controlador

El archivo `handler.ts` exporta una función `HookHandler`:

```typescript
import type { HookHandler } from "../../src/hooks/hooks.js";

const myHandler: HookHandler = async (event) => {
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

#### Contexto del evento

Cada evento incluye:

```typescript
{
  type: 'command' | 'session' | 'agent' | 'gateway',
  action: string,              // e.g., 'new', 'reset', 'stop'
  sessionKey: string,          // Session identifier
  timestamp: Date,             // When the event occurred
  messages: string[],          // Push messages here to send to user
  context: {
    sessionEntry?: SessionEntry,
    sessionId?: string,
    sessionFile?: string,
    commandSource?: string,    // e.g., 'whatsapp', 'telegram'
    senderId?: string,
    workspaceDir?: string,
    bootstrapFiles?: WorkspaceBootstrapFile[],
    cfg?: OpenClawConfig
  }
}
```

## Tipos de eventos

### Eventos de comandos

Activados cuando se emiten comandos del agente:

- **`command`**: Todos los eventos de comandos (oyente general)
- **`command:new`**: Cuando se emite el comando `/new`
- **`command:reset`**: Cuando se emite el comando `/reset`
- **`command:stop`**: Cuando se emite el comando `/stop`

### Eventos del agente

- **`agent:bootstrap`**: Antes de que se inyecten los archivos de arranque del espacio de trabajo (los hooks pueden mutar `context.bootstrapFiles`)

### Eventos de la pasarela

Activados cuando se inicia la pasarela:

- **`gateway:startup`**: Después de que los canales se inician y se cargan los hooks

### Hooks de resultados de herramientas (API de complementos)

Estos hooks no son oyentes de flujo de eventos; permiten que los complementos ajusten sincrónicamente los resultados de las herramientas antes de que OpenClaw los guarde.

- **`tool_result_persist`**: transforma los resultados de las herramientas antes de que se escriban en la transcripción de la sesión. Debe ser síncrono; devuelve la carga útil del resultado de la herramienta actualizada o `undefined` para mantenerla tal cual. Consulte [Bucle del agente](/es/concepts/agent-loop).

### Eventos futuros

Tipos de eventos planificados:

- **`session:start`**: Cuando comienza una nueva sesión
- **`session:end`**: Cuando termina una sesión
- **`agent:error`**: Cuando un agente encuentra un error
- **`message:sent`**: Cuando se envía un mensaje
- **`message:received`**: Cuando se recibe un mensaje

## Creación de Hooks Personalizados

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
import type { HookHandler } from "../../src/hooks/hooks.js";

const handler: HookHandler = async (event) => {
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

### Formato de Configuración Heredado (Todavía Soportado)

El formato de configuración antiguo todavía funciona por compatibilidad hacia atrás:

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

## Hooks Incluidos

### session-memory

Guarda el contexto de la sesión en la memoria cuando emites `/new`.

**Eventos**: `command:new`

**Requisitos**: `workspace.dir` debe estar configurado

**Salida**: `<workspace>/memory/YYYY-MM-DD-slug.md` (por defecto es `~/.openclaw/workspace`)

**Lo que hace**:

1. Utiliza la entrada de sesión previa al restablecimiento para ubicar la transcripción correcta
2. Extrae las últimas 15 líneas de la conversación
3. Utiliza LLM para generar un nombre de archivo descriptivo (slug)
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
- `2026-01-16-1430.md` (marca de tiempo de respaldo si falla la generación del slug)

**Habilitar**:

```bash
openclaw hooks enable session-memory
```

### command-logger

Registra todos los eventos de comandos en un archivo de auditoría centralizado.

**Eventos**: `command`

**Requisitos**: Ninguno

**Salida**: `~/.openclaw/logs/commands.log`

**Lo que hace**:

1. Captura detalles del evento (acción de comando, marca de tiempo, clave de sesión, ID del remitente, origen)
2. Agrega al archivo de registro en formato JSONL
3. Se ejecuta silenciosamente en segundo plano

**Ejemplos de entradas de registro**:

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

**Habilitar**:

```bash
openclaw hooks enable command-logger
```

### soul-evil

Intercambia el contenido inyectado de `SOUL.md` con `SOUL_EVIL.md` durante una ventana de purga o por azar.

**Eventos**: `agent:bootstrap`

**Documentación**: [SOUL Evil Hook](/es/hooks/soul-evil)

**Salida**: No se escriben archivos; los intercambios ocurren solo en memoria.

**Activar**:

```bash
openclaw hooks enable soul-evil
```

**Configuración**:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "soul-evil": {
          "enabled": true,
          "file": "SOUL_EVIL.md",
          "chance": 0.1,
          "purge": { "at": "21:00", "duration": "15m" }
        }
      }
    }
  }
}
```

### boot-md

Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (después de que inicien los canales).
Los hooks internos deben estar habilitados para que esto se ejecute.

**Eventos**: `gateway:startup`

**Requisitos**: `workspace.dir` debe estar configurado

**Lo que hace**:

1. Lee `BOOT.md` de su espacio de trabajo
2. Ejecuta las instrucciones a través del agente de ejecución (agent runner)
3. Envía cualquier mensaje saliente solicitado a través de la herramienta de mensajes

**Activar**:

```bash
openclaw hooks enable boot-md
```

## Mejores Prácticas

### Mantenga los Manejadores Rápidos

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

Siempre envuelva las operaciones riesgosas:

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

En lugar de:

```yaml
metadata: { "openclaw": { "events": ["command"] } } # General - more overhead
```

## Depuración

### Activar el Registro de Hooks

La puerta de enlace registra la carga de hooks al inicio:

```
Registered hook: session-memory -> command:new
Registered hook: command-logger -> command
Registered hook: boot-md -> gateway:startup
```

### Verificar el Descubrimiento

Listar todos los hooks descubiertos:

```bash
openclaw hooks list --verbose
```

### Verificar el Registro

En su manejador, registre cuándo se llama:

```typescript
const handler: HookHandler = async (event) => {
  console.log("[my-handler] Triggered:", event.type, event.action);
  // Your logic
};
```

### Verificar la Elegibilidad

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

Pruebe sus manejadores de forma aislada:

```typescript
import { test } from "vitest";
import { createHookEvent } from "./src/hooks/hooks.js";
import myHandler from "./hooks/my-hook/handler.js";

test("my handler works", async () => {
  const event = createHookEvent("command", "new", "test-session", {
    foo: "bar",
  });

  await myHandler(event);

  // Assert side effects
});
```

## Arquitectura

### Componentes Principales

- **`src/hooks/types.ts`**: Definiciones de tipos
- **`src/hooks/workspace.ts`**: Escaneo y carga de directorios
- **`src/hooks/frontmatter.ts`**: Análisis de metadatos de HOOK.md
- **`src/hooks/config.ts`**: Verificación de elegibilidad
- **`src/hooks/hooks-status.ts`**: Reporte de estado
- **`src/hooks/loader.ts`**: Cargador de módulos dinámicos
- **`src/cli/hooks-cli.ts`**: Comandos de CLI
- **`src/gateway/server-startup.ts`**: Carga los hooks al inicio de la puerta de enlace
- **`src/auto-reply/reply/commands-core.ts`**: Activa eventos de comandos

### Flujo de Descubrimiento

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

### Hook No Descubierto

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

### Hook No Elegible

Verifique los requisitos:

```bash
openclaw hooks info my-hook
```

Busque elementos faltantes:

- Binarios (verificar PATH)
- Variables de entorno
- Valores de configuración
- Compatibilidad con el sistema operativo

### Hook No Se Ejecuta

1. Verifique que el enlace esté habilitado:

   ```bash
   openclaw hooks list
   # Should show ✓ next to enabled hooks
   ```

2. Reinicie su proceso de puerta de enlace para que los enlaces se recarguen.

3. Revise los registros de la puerta de enlace en busca de errores:
   ```bash
   ./scripts/clawlog.sh | grep hook
   ```

### Errores del controlador

Busque errores de TypeScript/importación:

```bash
# Test import directly
node -e "import('./path/to/handler.ts').then(console.log)"
```

## Guía de migración

### Desde la configuración heredada hasta el descubrimiento

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

1. Crear directorio de enlace:

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

## Véase también

- [Referencia de CLI: enlaces](/es/cli/hooks)
- [LÉEME de Enlaces Empaquetados](https://github.com/openclaw/openclaw/tree/main/src/hooks/bundled)
- [Enlaces de Webhook](/es/automation/webhook)
- [Configuración](/es/gateway/configuration#hooks)
