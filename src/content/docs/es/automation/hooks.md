---
summary: "Hooks: automatización basada en eventos para comandos y eventos del ciclo de vida"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Los hooks son pequeños scripts que se ejecutan cuando sucede algo dentro del Gateway. Pueden ser descubiertos desde directorios e inspeccionados con `openclaw hooks`. El Gateway carga los hooks internos solo después de que habilites los hooks o configures al menos una entrada de hook, un paquete de hooks, un controlador heredado o un directorio de hooks adicional.

Hay dos tipos de hooks en OpenClaw:

- **Hooks internos** (esta página): se ejecutan dentro del Gateway cuando se disparan eventos del agente, como `/new`, `/reset`, `/stop`, o eventos del ciclo de vida.
- **Webhooks**: puntos finales HTTP externos que permiten a otros sistemas desencadenar trabajo en OpenClaw. Consulte [Webhooks](/es/automation/cron-jobs#webhooks).

Los hooks también se pueden agrupar dentro de complementos. `openclaw hooks list` muestra tanto los hooks independientes como los hooks gestionados por complementos.

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

| Evento                   | Cuándo se dispara                                                              |
| ------------------------ | ------------------------------------------------------------------------------ |
| `command:new`            | Comando `/new` emitido                                                         |
| `command:reset`          | Comando `/reset` emitido                                                       |
| `command:stop`           | Comando `/stop` emitido                                                        |
| `command`                | Cualquier evento de comando (escucha general)                                  |
| `session:compact:before` | Antes de que la compactación resuma el historial                               |
| `session:compact:after`  | Después de que se complete la compactación                                     |
| `session:patch`          | Cuando se modifican las propiedades de la sesión                               |
| `agent:bootstrap`        | Antes de que se inyecten los archivos de arranque del espacio de trabajo       |
| `gateway:startup`        | Después de que los canales se inicien y se carguen los hooks                   |
| `gateway:shutdown`       | Cuando comienza el apagado del gateway                                         |
| `gateway:pre-restart`    | Antes de un reinicio esperado del gateway                                      |
| `message:received`       | Mensaje entrante de cualquier canal                                            |
| `message:transcribed`    | Después de que se complete la transcripción de audio                           |
| `message:preprocessed`   | Después de que se complete u omita el procesamiento previo de medios y enlaces |
| `message:sent`           | Mensaje saliente entregado                                                     |

## Escribir hooks

### Estructura del hook

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
| `events`   | Matriz de eventos a escuchar                                  |
| `export`   | Exportación con nombre para usar (por defecto es `"default"`) |
| `os`       | Plataformas requeridas (p. ej., `["darwin", "linux"]`)        |
| `requires` | Rutas `bins`, `anyBins`, `env` o `config` requeridas          |
| `always`   | Omitir comprobaciones de elegibilidad (booleano)              |
| `install`  | Métodos de instalación                                        |

### Implementación del controlador

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

Cada evento incluye: `type`, `action`, `sessionKey`, `timestamp`, `messages` (push para enviar al usuario) y `context` (datos específicos del evento). Los contextos de los hooks de los complementos de agentes y herramientas también pueden incluir `trace`, un contexto de seguimiento de diagnóstico de solo lectura compatible con W3C que los complementos pueden pasar a los registros estructurados para la correlación OTEL.

### Aspectos destacados del contexto del evento

**Eventos de comando** (`command:new`, `command:reset`): `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`.

**Eventos de mensaje** (`message:received`): `context.from`, `context.content`, `context.channelId`, `context.metadata` (datos específicos del proveedor que incluyen `senderId`, `senderName`, `guildId`).

**Eventos de mensaje** (`message:sent`): `context.to`, `context.content`, `context.success`, `context.channelId`.

**Eventos de mensaje** (`message:transcribed`): `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`.

**Eventos de mensaje** (`message:preprocessed`): `context.bodyForAgent` (cuerpo final enriquecido), `context.from`, `context.channelId`.

**Eventos de inicialización** (`agent:bootstrap`): `context.bootstrapFiles` (matriz mutable), `context.agentId`.

**Eventos de parche de sesión** (`session:patch`): `context.sessionEntry`, `context.patch` (solo campos cambiados), `context.cfg`. Solo los clientes con privilegios pueden activar eventos de parche.

**Eventos de compactación**: `session:compact:before` incluye `messageCount`, `tokenCount`. `session:compact:after` añade `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

`command:stop` observa al usuario emitiendo `/stop`; es un ciclo de vida de cancelación/comando, no una puerta de finalización del agente. Los complementos que necesiten inspeccionar una respuesta final natural y pedir al agente que haga una pasada más deben usar en su lugar el gancho de complemento tipado `before_agent_finalize`. Consulte [Ganchos de complemento](/es/plugins/hooks).

**Eventos del ciclo de vida de la puerta de enlace**: `gateway:shutdown` incluye `reason` y `restartExpectedMs` y se dispara cuando comienza el apagado de la puerta de enlace. `gateway:pre-restart` incluye el mismo contexto pero solo se dispara cuando el apagado es parte de un reinicio esperado y se proporciona un valor finito de `restartExpectedMs`. Durante el apagado, cada espera de gancho del ciclo de vida es de mejor esfuerzo y está limitada para que el apagado continúe si un controlador se detiene.

## Descubrimiento de ganchos

Los ganchos se descubren en estos directorios, en orden de precedencia de anulación creciente:

1. **Ganchos incluidos**: enviados con OpenClaw
2. **Ganchos de complemento**: ganchos incluidos dentro de complementos instalados
3. **Ganchos gestionados**: `~/.openclaw/hooks/` (instalados por el usuario, compartidos entre espacios de trabajo). Los directorios adicionales de `hooks.internal.load.extraDirs` comparten esta precedencia.
4. **Ganchos del espacio de trabajo**: `<workspace>/hooks/` (por agente, deshabilitados por defecto hasta que se habiliten explícitamente)

Los hooks del espacio de trabajo pueden añadir nuevos nombres de hooks, pero no pueden anular los hooks integrados, gestionados o proporcionados por complementos con el mismo nombre.

El Gateway omite el descubrimiento de hooks internos al inicio hasta que se configuran los hooks internos. Habilite un hook integrado o gestionado con `openclaw hooks enable <name>`, instale un paquete de hooks o configure `hooks.internal.enabled=true` para participar. Cuando habilita un hook con nombre, el Gateway carga solo el controlador de ese hook; `hooks.internal.enabled=true`, directorios de hooks adicionales y controladores heredados participan en el descubrimiento amplio.

### Paquetes de hooks

Los paquetes de hooks son paquetes npm que exportan hooks a través de `openclaw.hooks` en `package.json`. Instale con:

```bash
openclaw plugins install <path-or-spec>
```

Las especificaciones de npm son solo de registro (nombre del paquete + versión exacta opcional o etiqueta de distribución). Se rechazan las especificaciones de Git/URL/archivo y los rangos de semver.

## Hooks integrados

| Hook                  | Eventos                        | Lo que hace                                                    |
| --------------------- | ------------------------------ | -------------------------------------------------------------- |
| session-memory        | `command:new`, `command:reset` | Guarda el contexto de la sesión en `<workspace>/memory/`       |
| bootstrap-extra-files | `agent:bootstrap`              | Inyecta archivos de arranque adicionales desde patrones glob   |
| command-logger        | `command`                      | Registra todos los comandos en `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | Ejecuta `BOOT.md` cuando se inicia el gateway                  |

Habilite cualquier hook integrado:

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### Detalles de session-memory

Extrae los últimos 15 mensajes de usuario/asistente, genera un nombre de archivo descriptivo a través de LLM y guarda en `<workspace>/memory/YYYY-MM-DD-slug.md` usando la fecha local del host. Requiere que `workspace.dir` esté configurado.

<a id="bootstrap-extra-files"></a>

### Configuración de bootstrap-extra-files

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

### Detalles de command-logger

Registra cada comando de barra en `~/.openclaw/logs/commands.log`.

<a id="boot-md"></a>

### detalles de boot-md

Ejecuta `BOOT.md` desde el espacio de trabajo activo cuando se inicia la puerta de enlace.

## Hooks de complementos

Los complementos pueden registrar hooks con tipos a través del Plugin SDK para una integración más profunda:
interceptar llamadas a herramientas, modificar mensajes, controlar el flujo de mensajes y más.
Use hooks de complementos cuando necesite `before_tool_call`, `before_agent_reply`,
`before_install` u otros hooks del ciclo de vida en proceso.

Para obtener la referencia completa de hooks de complementos, consulte [Plugin hooks](/es/plugins/hooks).

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

<Note>El formato de configuración de matriz `hooks.internal.handlers` heredado aún es compatible con versiones anteriores, pero los nuevos hooks deben usar el sistema basado en descubrimiento.</Note>

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
- **Maneje los errores con elegancia.** Envuelva las operaciones arriesgadas en try/catch; no lance excepciones para que otros controladores puedan ejecutarse.
- **Filtre los eventos temprano.** Regrese inmediatamente si el tipo/acción del evento no es relevante.
- **Use claves de evento específicas.** Prefiera `"events": ["command:new"]` sobre `"events": ["command"]` para reducir la sobrecarga.

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
2. Reinicie su proceso de puerta de enlace para que los hooks se recarguen.
3. Revise los registros de la puerta de enlace: `./scripts/clawlog.sh | grep hook`

## Relacionado

- [Referencia de CLI: hooks](/es/cli/hooks)
- [Webhooks](/es/automation/cron-jobs#webhooks)
- [Plugin hooks](/es/plugins/hooks) — hooks del ciclo de vida del complemento en proceso
- [Configuración](/es/gateway/configuration-reference#hooks)
