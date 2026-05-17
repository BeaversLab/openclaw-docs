---
summary: "Hooks: automatización basada en eventos para comandos y eventos del ciclo de vida"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Los Hooks son pequeños scripts que se ejecutan cuando sucede algo dentro de Gateway. Pueden descubrirse desde directorios e inspeccionarse con `openclaw hooks`. Gateway carga los hooks internos solo después de que habilites los hooks o configures al menos una entrada de hook, un paquete de hooks (hook pack), un controlador heredado (legacy handler) o un directorio de hooks adicional.

Hay dos tipos de hooks en OpenClaw:

- **Hooks internos** (esta página): se ejecutan dentro de Gateway cuando se activan eventos del agente, como `/new`, `/reset`, `/stop` o eventos del ciclo de vida.
- **Webhooks**: endpoints HTTP externos que permiten a otros sistemas desencadenar trabajo en OpenClaw. Consulte [Webhooks](/es/automation/cron-jobs#webhooks).

Los hooks también pueden empaquetarse dentro de complementos (plugins). `openclaw hooks list` muestra tanto los hooks independientes como los hooks gestionados por complementos.

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
| `os`       | Plataformas requeridas (por ejemplo, `["darwin", "linux"]`)   |
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

Cada evento incluye: `type`, `action`, `sessionKey`, `timestamp`, `messages` (envío para enviar al usuario) y `context` (datos específicos del evento). Los contextos de enlace de complementos de agente y herramienta también pueden incluir `trace`, un contexto de seguimiento de diagnóstico de solo lectura compatible con W3C que los complementos pueden pasar a registros estructurados para la correlación OTEL.

### Aspectos destacados del contexto del evento

**Eventos de comando** (`command:new`, `command:reset`): `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`.

**Eventos de mensaje** (`message:received`): `context.from`, `context.content`, `context.channelId`, `context.metadata` (datos específicos del proveedor que incluyen `senderId`, `senderName`, `guildId`). `context.content` prefiere un cuerpo de comando no blanco para mensajes tipo comando, luego recurre al cuerpo entrante sin procesar y al cuerpo genérico; no incluye el enriquecimiento solo para el agente, como el historial de hilos o los resúmenes de enlaces.

**Eventos de mensaje** (`message:sent`): `context.to`, `context.content`, `context.success`, `context.channelId`.

**Eventos de mensaje** (`message:transcribed`): `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`.

**Eventos de mensaje** (`message:preprocessed`): `context.bodyForAgent` (cuerpo enriquecido final), `context.from`, `context.channelId`.

**Eventos de arranque** (`agent:bootstrap`): `context.bootstrapFiles` (matriz mutable), `context.agentId`.

**Eventos de parche de sesión** (`session:patch`): `context.sessionEntry`, `context.patch` (solo campos modificados), `context.cfg`. Solo los clientes privilegiados pueden activar eventos de parche.

**Eventos de compactación**: `session:compact:before` incluye `messageCount`, `tokenCount`. `session:compact:after` añade `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

`command:stop` observa al usuario emitir `/stop`; es un ciclo de vida de cancelación/comando, no una puerta de finalización del agente. Los complementos que necesitan inspeccionar una respuesta final natural y pedir al agente que haga otra pasada deben usar en su lugar el enlace de complemento tipado `before_agent_finalize`. Consulte [Plugin hooks](/es/plugins/hooks).

**Eventos del ciclo de vida de la puerta de enlace**: `gateway:shutdown` incluye `reason` y `restartExpectedMs` y se activa cuando comienza el apagado de la puerta de enlace. `gateway:pre-restart` incluye el mismo contexto pero solo se activa cuando el apagado es parte de un reinicio esperado y se suministra un valor finito de `restartExpectedMs`. Durante el apagado, cada espera de enlace de ciclo de vida es de mejor esfuerzo y está limitada para que el apagado continúe si un controlador se bloquea.

Entre el evento `gateway:shutdown` (o `gateway:pre-restart`) y el resto de la secuencia de apagado, la puerta de enlace también dispara un enlace de complemento tipado `session_end` para cada sesión que aún estaba activa cuando el proceso se detuvo. El `reason` del evento es `shutdown` para una detención SIGTERM/SIGINT simple y `restart` cuando el cierre se programó como parte de un reinicio esperado. Este drenaje está limitado, por lo que un controlador `session_end` lento no puede bloquear la salida del proceso, y las sesiones que ya se han finalizado mediante replace / reset / delete / compaction se omiten para evitar disparos dobles.

## Descubrimiento de enlaces

Los enlaces se descubren desde estos directorios, en orden de precedencia de anulación creciente:

1. **Enlaces incluidos**: enviados con OpenClaw
2. **Enlaces de complementos**: enlaces incluidos dentro de complementos instalados
3. **Enlaces administrados**: `~/.openclaw/hooks/` (instalados por el usuario, compartidos entre espacios de trabajo). Los directorios adicionales de `hooks.internal.load.extraDirs` comparten esta precedencia.
4. **Enlaces del espacio de trabajo**: `<workspace>/hooks/` (por agente, deshabilitados de forma predeterminada hasta que se habiliten explícitamente)

Los enlaces del espacio de trabajo pueden agregar nuevos nombres de enlace, pero no pueden anular los enlaces incluidos, administrados o proporcionados por complementos con el mismo nombre.

La puerta de enlace omite el descubrimiento de enlaces internos al inicio hasta que se configuran los enlaces internos. Habilite un enlace incluido o administrado con `openclaw hooks enable <name>`, instale un paquete de enlace o configure `hooks.internal.enabled=true` para optar. Cuando habilita un enlace con nombre, la puerta de enlace carga solo el controlador de ese enlace; `hooks.internal.enabled=true`, directorios de enlace adicionales y controladores heredados optan por un descubrimiento amplio.

### Paquetes de enlace

Los paquetes de hooks son paquetes npm que exportan hooks a través de `openclaw.hooks` en `package.json`. Instale con:

```bash
openclaw plugins install <path-or-spec>
```

Las especificaciones de npm son solo de registro (nombre del paquete + versión exacta opcional o etiqueta de distribución). Se rechazan las especificaciones de Git/URL/archivo y los rangos semver.

## Hooks incluidos

| Hook                  | Eventos                                           | Lo que hace                                                                      |
| --------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| session-memory        | `command:new`, `command:reset`                    | Guarda el contexto de la sesión en `<workspace>/memory/`                         |
| bootstrap-extra-files | `agent:bootstrap`                                 | Inyecta archivos de arranque adicionales desde patrones glob                     |
| command-logger        | `command`                                         | Registra todos los comandos en `~/.openclaw/logs/commands.log`                   |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | Envía avisos de chat visibles cuando inicia/termina la compactación de la sesión |
| boot-md               | `gateway:startup`                                 | Ejecuta `BOOT.md` cuando se inicia la puerta de enlace                           |

Habilite cualquier hook incluido:

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### detalles de session-memory

Extrae los últimos 15 mensajes de usuario/assistente y los guarda en `<workspace>/memory/YYYY-MM-DD-HHMM.md` usando la fecha local del host. La captura de memoria se ejecuta en segundo plano, por lo que los reconocimientos `/new` y `/reset` no se retrasan por lecturas de transcripciones ni por la generación opcional de slugs. Establezca `hooks.internal.entries.session-memory.llmSlug: true` para generar slugs de nombres de archivo descriptivos con el modelo configurado. Requiere que `workspace.dir` esté configurado.

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

### detalles de command-logger

Registra cada comando de barra en `~/.openclaw/logs/commands.log`.

<a id="compaction-notifier"></a>

### detalles de compaction-notifier

Envía mensajes de estado cortos a la conversación actual cuando OpenClaw comienza y termina de compactar la transcripción de la sesión. Esto hace que las respuestas largas sean menos confusas en las interfaces de chat, ya que el usuario puede ver que el asistente está resumiendo el contexto y continuará después de la compactación.

<a id="boot-md"></a>

### detalles de boot-md

Ejecuta `BOOT.md` desde el espacio de trabajo activo cuando se inicia la puerta de enlace.

## Ganchos de complementos

Los complementos pueden registrar ganchos tipificados a través del Plugin SDK para una integración más profunda:
interceptar llamadas a herramientas, modificar indicaciones, controlar el flujo de mensajes y más.
Use ganchos de complementos cuando necesite `before_tool_call`, `before_agent_reply`,
`before_install` u otros ganchos del ciclo de vida en proceso.

Para obtener la referencia completa de ganchos de complementos, consulte [Ganchos de complementos](/es/plugins/hooks).

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

Directorios de gancho adicionales:

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

<Note>El formato de configuración de matriz `hooks.internal.handlers` heredado todavía es compatible por compatibilidad con versiones anteriores, pero los nuevos ganchos deben usar el sistema basado en descubrimiento.</Note>

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

- **Mantenga los controladores rápidos.** Los ganchos se ejecutan durante el procesamiento de comandos. Realice trabajos pesados de fuego y olvido con `void processInBackground(event)`.
- **Maneje los errores con elegancia.** Envuelva las operaciones riesgosas en try/catch; no genere excepciones para que otros controladores puedan ejecutarse.
- **Filtre los eventos temprano.** Regrese inmediatamente si el tipo/acción del evento no es relevante.
- **Use claves de evento específicas.** Prefiera `"events": ["command:new"]` sobre `"events": ["command"]` para reducir la sobrecarga.

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

### Gancho no ejecutándose

1. Verifique que el gancho esté habilitado: `openclaw hooks list`
2. Reinicie su proceso de puerta de enlace para que los ganchos se recarguen.
3. Revise los registros de la puerta de enlace: `./scripts/clawlog.sh | grep hook`

## Relacionado

- [Referencia de CLI: ganchos](/es/cli/hooks)
- [Webhooks](/es/automation/cron-jobs#webhooks)
- [Ganchos de complementos](/es/plugins/hooks) — ganchos del ciclo de vida del complemento en proceso
- [Configuración](/es/gateway/configuration-reference#hooks)
