---
summary: "Hooks: automatización basada en eventos para comandos y eventos del ciclo de vida"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Los Hooks son pequeños scripts que se ejecutan cuando sucede algo dentro del Gateway. Pueden ser descubiertos desde directorios e inspeccionados con `openclaw hooks`. El Gateway carga los hooks internos solo después de que habilites los hooks o configures al menos una entrada de hook, un paquete de hooks (hook pack), un controlador heredado (legacy handler) o un directorio de hooks extra.

Hay dos tipos de hooks en OpenClaw:

- **Hooks internos** (esta página): se ejecutan dentro de la Gateway cuando se activan eventos del agente, como `/new`, `/reset`, `/stop`, o eventos del ciclo de vida.
- **Webhooks**: puntos finales HTTP externos que permiten a otros sistemas desencadenar trabajo en OpenClaw. Consulte [Webhooks](/es/automation/cron-jobs#webhooks).

Los hooks también se pueden empaquetar dentro de complementos (plugins). `openclaw hooks list` muestra tanto los hooks independientes como los gestionados por complementos.

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
| `command:new`            | Comando `/new` emitido                                                   |
| `command:reset`          | Comando `/reset` emitido                                                 |
| `command:stop`           | Comando `/stop` emitido                                                  |
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

| Campo      | Descripción                                                   |
| ---------- | ------------------------------------------------------------- |
| `emoji`    | Mostrar emoji para la CLI                                     |
| `events`   | Matriz de eventos a los que escuchar                          |
| `export`   | Exportación con nombre para usar (por defecto es `"default"`) |
| `os`       | Plataformas requeridas (por ejemplo, `["darwin", "linux"]`)   |
| `requires` | Rutas `bins`, `anyBins`, `env` o `config` requeridas          |
| `always`   | Omitir comprobaciones de elegibilidad (booleano)              |
| `install`  | Métodos de instalación                                        |

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

**Eventos de comandos** (`command:new`, `command:reset`): `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`.

**Eventos de mensajes** (`message:received`): `context.from`, `context.content`, `context.channelId`, `context.metadata` (datos específicos del proveedor, incluyendo `senderId`, `senderName`, `guildId`).

**Eventos de mensajes** (`message:sent`): `context.to`, `context.content`, `context.success`, `context.channelId`.

**Eventos de mensajes** (`message:transcribed`): `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`.

**Eventos de mensajes** (`message:preprocessed`): `context.bodyForAgent` (cuerpo final enriquecido), `context.from`, `context.channelId`.

**Eventos de arranque** (`agent:bootstrap`): `context.bootstrapFiles` (array mutable), `context.agentId`.

**Eventos de parches de sesión** (`session:patch`): `context.sessionEntry`, `context.patch` (solo campos cambiados), `context.cfg`. Solo los clientes privilegiados pueden activar eventos de parches.

**Eventos de compactación**: `session:compact:before` incluye `messageCount`, `tokenCount`. `session:compact:after` añade `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

## Descubrimiento de Hooks

Los Hooks se descubren en estos directorios, en orden de prioridad de invalidación creciente:

1. **Hooks incluidos**: enviados con OpenClaw
2. **Hooks de complementos**: Hooks incluidos dentro de los complementos instalados
3. **Hooks gestionados**: `~/.openclaw/hooks/` (instalado por el usuario, compartido entre espacios de trabajo). Los directorios adicionales de `hooks.internal.load.extraDirs` comparten esta precedencia.
4. **Hooks del espacio de trabajo**: `<workspace>/hooks/` (por agente, deshabilitado por defecto hasta que se habilite explícitamente)

Los Hooks del espacio de trabajo pueden añadir nuevos nombres de Hook, pero no pueden invalidar los Hooks incluidos, administrados o proporcionados por complementos con el mismo nombre.

El Gateway omite el descubrimiento de hooks internos al inicio hasta que se configuran los hooks internos. Habilite un hook incluido o administrado con `openclaw hooks enable <name>`, instale un paquete de hooks o establezca `hooks.internal.enabled=true` para optar por participar. Cuando habilita un hook con nombre, el Gateway carga solo el controlador de ese hook; `hooks.internal.enabled=true`, los directorios de hooks adicionales y los controladores heredados optan por el descubrimiento amplio.

### Paquetes de hooks

Los paquetes de hooks son paquetes npm que exportan hooks a través de `openclaw.hooks` en `package.json`. Instale con:

```bash
openclaw plugins install <path-or-spec>
```

Las especificaciones de npm son solo de registro (nombre del paquete + versión exacta opcional o etiqueta de distribución). Se rechazan las especificaciones de Git/URL/archivo y los rangos de semver.

## Hooks incluidos

| Hook                  | Eventos                        | Lo que hace                                                    |
| --------------------- | ------------------------------ | -------------------------------------------------------------- |
| session-memory        | `command:new`, `command:reset` | Guarda el contexto de la sesión en `<workspace>/memory/`       |
| bootstrap-extra-files | `agent:bootstrap`              | Inyecta archivos de arranque adicionales desde patrones glob   |
| command-logger        | `command`                      | Registra todos los comandos en `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | Ejecuta `BOOT.md` cuando se inicia el gateway                  |

Habilite cualquier hook incluido:

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### detalles de session-memory

Extrae los últimos 15 mensajes de usuario/asistente, genera un nombre de archivo descriptivo (slug) a través de LLM y guarda en `<workspace>/memory/YYYY-MM-DD-slug.md`. Requiere que `workspace.dir` esté configurado.

<a id="bootstrap-extra-files"></a>

### configuración de bootstrap-extra-files

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

Las rutas se resuelven en relación con el espacio de trabajo. Solo se cargan los nombres base de arranque reconocidos (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`).

<a id="command-logger"></a>

### detalles del command-logger

Registra cada comando de barra en `~/.openclaw/logs/commands.log`.

<a id="boot-md"></a>

### detalles del boot-md

Ejecuta `BOOT.md` del espacio de trabajo activo cuando se inicia la puerta de enlace.

## Ganchos de complementos

Los complementos pueden registrar ganchos a través del Plugin SDK para una integración más profunda: interceptar llamadas a herramientas, modificar indicaciones, controlar el flujo de mensajes y más. El Plugin SDK expone 28 ganchos que cubren la resolución de modelos, el ciclo de vida del agente, el flujo de mensajes, la ejecución de herramientas, la coordinación de subagentes y el ciclo de vida de la puerta de enlace.

Para obtener la referencia completa de los ganchos de complementos, incluyendo `before_tool_call`, `before_agent_reply`, `before_install` y todos los demás ganchos de complementos, consulte [Arquitectura de complementos](/es/plugins/architecture#provider-runtime-hooks).

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

Variables de entorno por gancho:

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

Directorios de ganchos adicionales:

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

<Note>El formato de configuración de matriz `hooks.internal.handlers` heredado aún es compatible por motivos de compatibilidad con versiones anteriores, pero los nuevos ganchos deben usar el sistema basado en descubrimiento.</Note>

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

- **Mantenga los controladores rápidos.** Los ganchos se ejecutan durante el procesamiento de comandos. Realice trabajos pesados de manera asíncrona con `void processInBackground(event)`.
- **Maneje los errores con elegancia.** Envuelva las operaciones riesgosas en try/catch; no lance excepciones para que otros controladores puedan ejecutarse.
- **Filtre los eventos desde el principio.** Regrese inmediatamente si el tipo/acción del evento no es relevante.
- **Use claves de eventos específicas.** Prefiera `"events": ["command:new"]` sobre `"events": ["command"]` para reducir la sobrecarga.

## Solución de problemas

### Gancho no descubierto

```bash
# Verify directory structure
ls -la ~/.openclaw/hooks/my-hook/
# Should show: HOOK.md, handler.ts

# List all discovered hooks
openclaw hooks list
```

### Gancho no elegible

```bash
openclaw hooks info my-hook
```

Compruebe si faltan binarios (PATH), variables de entorno, valores de configuración o compatibilidad con el sistema operativo.

### El gancho no se está ejecutando

1. Verifique que el gancho esté habilitado: `openclaw hooks list`
2. Reinicie el proceso de su puerta de enlace para que los ganchos se vuelvan a cargar.
3. Verifica los registros de la puerta de enlace (gateway): `./scripts/clawlog.sh | grep hook`

## Relacionado

- [Referencia de CLI: hooks](/es/cli/hooks)
- [Webhooks](/es/automation/cron-jobs#webhooks)
- [Arquitectura de Plugins](/es/plugins/architecture#provider-runtime-hooks) — referencia completa de hooks de plugins
- [Configuración](/es/gateway/configuration-reference#hooks)
