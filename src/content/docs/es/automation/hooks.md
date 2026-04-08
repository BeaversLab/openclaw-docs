---
summary: "Hooks: automatización basada en eventos para comandos y eventos del ciclo de vida"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Los Hooks son pequeños scripts que se ejecutan cuando algo sucede dentro del Gateway. Se descubren automáticamente desde los directorios y se pueden inspeccionar con `openclaw hooks`.

Hay dos tipos de hooks en OpenClaw:

- **Internal hooks** (esta página): se ejecutan dentro del Gateway cuando se disparan eventos del agente, como `/new`, `/reset`, `/stop`, o eventos del ciclo de vida.
- **Webhooks**: puntos finales HTTP externos que permiten a otros sistemas activar trabajo en OpenClaw. Consulte [Webhooks](/en/automation/cron-jobs#webhooks).

Los hooks también se pueden empaquetar dentro de complementos. `openclaw hooks list` muestra tanto los hooks independientes como los gestionados por complementos.

## Inicio rápido

```bash
# List available hooks
openclaw hooks list

# Enable a hook
openclaw hooks enable session-memory

# Check hook status
openclaw hooks check

# Get detailed information
openclaw hooks info session-memory
```

## Tipos de eventos

| Evento                   | Cuándo se dispara                                                        |
| ------------------------ | ------------------------------------------------------------------------ |
| `command:new`            | comando `/new` emitido                                                   |
| `command:reset`          | comando `/reset` emitido                                                 |
| `command:stop`           | comando `/stop` emitido                                                  |
| `command`                | Cualquier evento de comando (escucha general)                            |
| `session:compact:before` | Antes de que la compactación resuma el historial                         |
| `session:compact:after`  | Después de que se complete la compactación                               |
| `session:patch`          | Cuando se modifican las propiedades de la sesión                         |
| `agent:bootstrap`        | Antes de que se inyecten los archivos de arranque del espacio de trabajo |
| `gateway:startup`        | Después de que se inician los canales y se cargan los hooks              |
| `message:received`       | Mensaje entrante de cualquier canal                                      |
| `message:transcribed`    | Después de que se complete la transcripción de audio                     |
| `message:preprocessed`   | Después de que se complete toda la comprensión de medios y enlaces       |
| `message:sent`           | Mensaje saliente entregado                                               |

## Escribiendo hooks

### Estructura del Hook

Cada hook es un directorio que contiene dos archivos:

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

### Formato HOOK.md

```markdown
---
name: my-hook
description: "Short description of what this hook does"
metadata: { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Detailed documentation goes here.
```

**Campos de metadatos** (`metadata.openclaw`):

| Campo      | Descripción                                                |
| ---------- | ---------------------------------------------------------- |
| `emoji`    | Mostrar emoji para la CLI                                  |
| `events`   | Matriz de eventos a los que escuchar                       |
| `export`   | Exportación con nombre para usar (por defecto `"default"`) |
| `os`       | Plataformas requeridas (ej., `["darwin", "linux"]`)        |
| `requires` | Rutas `bins`, `anyBins`, `env` o `config` requeridas       |
| `always`   | Omitir comprobaciones de elegibilidad (booleano)           |
| `install`  | Métodos de instalación                                     |

### Implementación del manejador

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  // Your logic here

  // Optionally send message to user
  event.messages.push("Hook executed!");
};

export default handler;
```

Cada evento incluye: `type`, `action`, `sessionKey`, `timestamp`, `messages` (push para enviar al usuario) y `context` (datos específicos del evento).

### Aspectos destacados del contexto del evento

**Eventos de comando** (`command:new`, `command:reset`): `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`.

**Eventos de mensaje** (`message:received`): `context.from`, `context.content`, `context.channelId`, `context.metadata` (datos específicos del proveedor incluyendo `senderId`, `senderName`, `guildId`).

**Eventos de mensaje** (`message:sent`): `context.to`, `context.content`, `context.success`, `context.channelId`.

**Eventos de mensaje** (`message:transcribed`): `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`.

**Eventos de mensaje** (`message:preprocessed`): `context.bodyForAgent` (cuerpo final enriquecido), `context.from`, `context.channelId`.

**Eventos de arranque** (`agent:bootstrap`): `context.bootstrapFiles` (matriz mutable), `context.agentId`.

**Eventos de parche de sesión** (`session:patch`): `context.sessionEntry`, `context.patch` (solo campos cambiados), `context.cfg`. Solo los clientes con privilegios pueden activar eventos de parche.

**Eventos de compactación**: `session:compact:before` incluye `messageCount`, `tokenCount`. `session:compact:after` añade `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

## Descubrimiento de Hooks

Los Hooks se descubren en estos directorios, en orden de prioridad de invalidación creciente:

1. **Hooks incluidos**: enviados con OpenClaw
2. **Hooks de complementos**: Hooks incluidos dentro de los complementos instalados
3. **Hooks administrados**: `~/.openclaw/hooks/` (instalados por el usuario, compartidos entre espacios de trabajo). Los directorios adicionales de `hooks.internal.load.extraDirs` comparten esta prioridad.
4. **Hooks del espacio de trabajo**: `<workspace>/hooks/` (por agente, deshabilitados por defecto hasta que se habiliten explícitamente)

Los Hooks del espacio de trabajo pueden añadir nuevos nombres de Hook, pero no pueden invalidar los Hooks incluidos, administrados o proporcionados por complementos con el mismo nombre.

### Paquetes de Hooks

Los paquetes de Hooks son paquetes npm que exportan Hooks a través de `openclaw.hooks` en `package.json`. Instale con:

```bash
openclaw plugins install <path-or-spec>
```

Las especificaciones de Npm son solo de registro (nombre del paquete + versión exacta opcional o etiqueta de distribución). Se rechazan las especificaciones de Git/URL/archivo y los rangos de semver.

## Hooks incluidos

| Hook                  | Eventos                        | Lo que hace                                                    |
| --------------------- | ------------------------------ | -------------------------------------------------------------- |
| session-memory        | `command:new`, `command:reset` | Guarda el contexto de la sesión en `<workspace>/memory/`       |
| bootstrap-extra-files | `agent:bootstrap`              | Inyecta archivos de arranque adicionales desde patrones glob   |
| command-logger        | `command`                      | Registra todos los comandos en `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | Ejecuta `BOOT.md` cuando se inicia la puerta de enlace         |

Habilite cualquier Hook incluido:

```bash
openclaw hooks enable <hook-name>
```

### Detalles de session-memory

Extrae los últimos 15 mensajes de usuario/asistente, genera un nombre de archivo descriptivo a través de LLM y lo guarda en `<workspace>/memory/YYYY-MM-DD-slug.md`. Requiere que `workspace.dir` esté configurado.

### config de bootstrap-extra-files

```json
{
  "hooks": {
    "internal": {
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

Las rutas se resuelven en relación con el espacio de trabajo. Solo se cargan los nombres base de bootstrap reconocidos (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`).

## Hooks de complementos

Los complementos pueden registrar hooks a través del Plugin SDK para una integración más profunda: interceptar llamadas a herramientas, modificar indicaciones (prompts), controlar el flujo de mensajes y más. El Plugin SDK expone 28 hooks que cubren la resolución de modelos, el ciclo de vida del agente, el flujo de mensajes, la ejecución de herramientas, la coordinación de subagentes y el ciclo de vida de la puerta de enlace.

Para obtener la referencia completa de hooks de complementos, incluyendo `before_tool_call`, `before_agent_reply`, `before_install` y todos los demás hooks de complementos, consulte [Arquitectura de complementos](/en/plugins/architecture#provider-runtime-hooks).

## Configuración

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

Variables de entorno por hook:

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": { "MY_CUSTOM_VAR": "value" }
        }
      }
    }
  }
}
```

Directorios de hooks adicionales:

```json
{
  "hooks": {
    "internal": {
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

<Note>El formato de configuración de matriz `hooks.internal.handlers` heredado aún es compatible por motivos de compatibilidad con versiones anteriores, pero los nuevos hooks deben usar el sistema basado en descubrimiento.</Note>

## Referencia de CLI

```bash
# List all hooks (add --eligible, --verbose, or --json)
openclaw hooks list

# Show detailed info about a hook
openclaw hooks info <hook-name>

# Show eligibility summary
openclaw hooks check

# Enable/disable
openclaw hooks enable <hook-name>
openclaw hooks disable <hook-name>
```

## Mejores prácticas

- **Mantenga los controladores rápidos.** Los hooks se ejecutan durante el procesamiento de comandos. Realice trabajos pesados de forma asíncrona con `void processInBackground(event)`.
- **Maneje los errores con elegancia.** Envuelva las operaciones riesgosas en try/catch; no lance excepciones para que otros controladores puedan ejecutarse.
- **Filtre los eventos temprano.** Regrese inmediatamente si el tipo de evento/acción no es relevante.
- **Use claves de eventos específicas.** Prefiera `"events": ["command:new"]` sobre `"events": ["command"]` para reducir la sobrecarga.

## Solución de problemas

### Hook no descubierto

```bash
# Verify directory structure
ls -la ~/.openclaw/hooks/my-hook/
# Should show: HOOK.md, handler.ts

# List all discovered hooks
openclaw hooks list
```

### Hook no elegible

```bash
openclaw hooks info my-hook
```

Compruebe si faltan binarios (PATH), variables de entorno, valores de configuración o compatibilidad con el sistema operativo.

### Hook no se ejecuta

1. Verifique que el hook esté habilitado: `openclaw hooks list`
2. Reinicie su proceso de puerta de enlace para que los hooks se vuelvan a cargar.
3. Consulte los registros de la puerta de enlace: `./scripts/clawlog.sh | grep hook`

## Relacionado

- [Referencia de CLI: hooks](/en/cli/hooks)
- [Webhooks](/en/automation/cron-jobs#webhooks)
- [Arquitectura de plugins](/en/plugins/architecture#provider-runtime-hooks) — referencia completa de hooks de plugins
- [Configuración](/en/gateway/configuration-reference#hooks)
