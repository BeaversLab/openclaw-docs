---
summary: "Guía de extremo a extremo para ejecutar OpenClaw como asistente personal con precauciones de seguridad"
read_when:
  - Onboarding a new assistant instance
  - Reviewing safety/permission implications
title: "Configuración del asistente personal"
---

OpenClaw es una puerta de enlace autoalojada que conecta Discord, Google Chat, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo y más con agentes de IA. Esta guía cubre la configuración de "asistente personal": un número de WhatsApp dedicado que se comporta como tu asistente de IA siempre activo.

## ⚠️ Seguridad primero

Estás poniendo a un agente en posición de:

- ejecutar comandos en tu máquina (dependiendo de tu política de herramientas)
- leer/escribir archivos en tu espacio de trabajo
- enviar mensajes de vuelta a través de WhatsApp/Telegram/Discord/Mattermost y otros canales incluidos

Empieza con precaución:

- Establece siempre `channels.whatsapp.allowFrom` (nunca ejecutes abierto al mundo en tu Mac personal).
- Utiliza un número de WhatsApp dedicado para el asistente.
- Los latidos ahora tienen un valor predeterminado de cada 30 minutos. Desactívalos hasta que confíes en la configuración estableciendo `agents.defaults.heartbeat.every: "0m"`.

## Requisitos previos

- OpenClaw instalado y registrado - consulta [Introducción](/es/start/getting-started) si aún no lo has hecho
- Un segundo número de teléfono (SIM/eSIM/prepago) para el asistente

## La configuración de dos teléfonos (recomendada)

Quieres esto:

```mermaid
flowchart TB
    A["<b>Your Phone (personal)<br></b><br>Your WhatsApp<br>+1-555-YOU"] -- message --> B["<b>Second Phone (assistant)<br></b><br>Assistant WA<br>+1-555-ASSIST"]
    B -- linked via QR --> C["<b>Your Mac (openclaw)<br></b><br>AI agent"]
```

Si vinculas tu WhatsApp personal a OpenClaw, cada mensaje que recibas se convierte en "entrada del agente". Eso casi nunca es lo que quieres.

## Inicio rápido de 5 minutos

1. Emparejar WhatsApp Web (muestra un código QR; escanea con el teléfono del asistente):

```bash
openclaw channels login
```

2. Iniciar la puerta de enlace (déjala en ejecución):

```bash
openclaw gateway --port 18789
```

3. Pon una configuración mínima en `~/.openclaw/openclaw.json`:

```json5
{
  gateway: { mode: "local" },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

Ahora envía un mensaje al número del asistente desde tu teléfono autorizado.

Cuando finalice el registro, OpenClaw abre automáticamente el tablero e imprime un enlace limpio (sin tokenizar). Si el tablero solicita autenticación, pega el secreto compartido configurado en la configuración de la UI de Control. El registro utiliza un token de forma predeterminada (`gateway.auth.token`), pero la autenticación por contraseña también funciona si cambiaste `gateway.auth.mode` a `password`. Para volver a abrir más tarde: `openclaw dashboard`.

## Dar al agente un espacio de trabajo (AGENTS)

OpenClaw lee las instrucciones de operación y la "memoria" de su directorio de espacio de trabajo.

De manera predeterminada, OpenClaw usa `~/.openclaw/workspace` como el espacio de trabajo del agente y lo creará (junto con los `AGENTS.md` iniciales, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`) automáticamente durante la configuración/primera ejecución del agente. `BOOTSTRAP.md` solo se crea cuando el espacio de trabajo es totalmente nuevo (no debería volver a aparecer después de eliminarlo). `MEMORY.md` es opcional (no se crea automáticamente); cuando está presente, se carga para las sesiones normales. Las sesiones de subagentes solo inyectan `AGENTS.md` y `TOOLS.md`.

<Tip>Trate esta carpeta como la memoria de OpenClaw y conviértala en un repositorio git (idealmente privado) para que sus `AGENTS.md` y archivos de memoria estén respaldados. Si git está instalado, los espacios de trabajo nuevos se inicializan automáticamente.</Tip>

```bash
openclaw setup
```

Diseño completo del espacio de trabajo + guía de respaldo: [Agent workspace](/es/concepts/agent-workspace)
Flujo de trabajo de memoria: [Memory](/es/concepts/memory)

Opcional: elija un espacio de trabajo diferente con `agents.defaults.workspace` (admite `~`).

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

Si ya envía sus propios archivos de espacio de trabajo desde un repositorio, puede deshabilitar por completo la creación de archivos de arranque:

```json5
{
  agents: {
    defaults: {
      skipBootstrap: true,
    },
  },
}
```

## La configuración que lo convierte en "un asistente"

OpenClaw tiene una configuración de asistente predeterminada bastante buena, pero generalmente querrás ajustar:

- persona/instrucciones en [`SOUL.md`](/es/concepts/soul)
- valores predeterminados de pensamiento (si se desea)
- latidos (heartbeats) (una vez que confíes en él)

Ejemplo:

```json5
{
  logging: { level: "info" },
  agent: {
    model: "anthropic/claude-opus-4-6",
    workspace: "~/.openclaw/workspace",
    thinkingDefault: "high",
    timeoutSeconds: 1800,
    // Start with 0; enable later.
    heartbeat: { every: "0m" },
  },
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  routing: {
    groupChat: {
      mentionPatterns: ["@openclaw", "openclaw"],
    },
  },
  session: {
    scope: "per-sender",
    resetTriggers: ["/new", "/reset"],
    reset: {
      mode: "daily",
      atHour: 4,
      idleMinutes: 10080,
    },
  },
}
```

## Sesiones y memoria

- Archivos de sesión: `~/.openclaw/agents/<agentId>/sessions/{{SessionId}}.jsonl`
- Metadatos de la sesión (uso de tokens, última ruta, etc.): `~/.openclaw/agents/<agentId>/sessions/sessions.json` (legado: `~/.openclaw/sessions/sessions.json`)
- `/new` o `/reset` inicia una sesión nueva para ese chat (configurable vía `resetTriggers`). Si se envía solo, OpenClaw confirma el restablecimiento sin invocar el modelo.
- `/compact [instructions]` compacta el contexto de la sesión e informa el presupuesto de contexto restante.

## Latidos (modo proactivo)

De forma predeterminada, OpenClaw ejecuta un latido cada 30 minutos con el mensaje:
`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
Establezca `agents.defaults.heartbeat.every: "0m"` para desactivar.

- Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados de markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API.
- Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.
- Si el agente responde con `HEARTBEAT_OK` (opcionalmente con un relleno corto; consulte `agents.defaults.heartbeat.ackMaxChars`), OpenClaw suprime la entrega saliente para ese latido.
- De forma predeterminada, se permite la entrega de latidos a destinos `user:<id>` de tipo MD. Establezca `agents.defaults.heartbeat.directPolicy: "block"` para suprimir la entrega a destinos directos manteniendo activas las ejecuciones de latido.
- Los latidos ejecutan turnos completos del agente: intervalos más cortos consumen más tokens.

```json5
{
  agent: {
    heartbeat: { every: "30m" },
  },
}
```

## Medios de entrada y salida

Los archivos adjuntos entrantes (imágenes/audio/documentos) pueden mostrarse en su comando a través de plantillas:

- `{{MediaPath}}` (ruta de archivo temporal local)
- `{{MediaUrl}}` (pseudo-URL)
- `{{Transcript}}` (si la transcripción de audio está habilitada)

Archivos adjuntos salientes del agente: incluya `MEDIA:<path-or-url>` en su propia línea (sin espacios). Ejemplo:

```
Here's the screenshot.
MEDIA:https://example.com/screenshot.png
```

OpenClaw los extrae y los envía como medios junto con el texto.

El comportamiento de la ruta local sigue el mismo modelo de confianza de lectura de archivos que el agente:

- Si `tools.fs.workspaceOnly` es `true`, las rutas locales `MEDIA:` salientes se mantienen restringidas a la raíz temporal de OpenClaw, la caché de medios, las rutas del espacio de trabajo del agente y los archivos generados por el sandbox.
- Si `tools.fs.workspaceOnly` es `false`, los archivos locales `MEDIA:` salientes pueden usar archivos locales del host que el agente ya tiene permiso para leer.
- Las rutas locales pueden ser absolutas, relativas al espacio de trabajo o relativas al inicio con `~/`.
- Los envíos locales del host aún solo permiten tipos de medios y documentos seguros (imágenes, audio, video, PDF y documentos de Office). Los archivos de texto sin formato y los similares a secretos no se tratan como medios enviables.

Esto significa que las imágenes/archivos generados fuera del espacio de trabajo ahora se pueden enviar cuando tu política de sistema de archivos ya permite esas lecturas, sin reabrir la exfiltración de archivos de texto arbitrarios del host.

## Lista de verificación de operaciones

```bash
openclaw status          # local status (creds, sessions, queued events)
openclaw status --all    # full diagnosis (read-only, pasteable)
openclaw status --deep   # asks the gateway for a live health probe with channel probes when supported
openclaw health --json   # gateway health snapshot (WS; default can return a fresh cached snapshot)
```

Los registros se encuentran en `/tmp/openclaw/` (predeterminado: `openclaw-YYYY-MM-DD.log`).

## Próximos pasos

- WebChat: [WebChat](/es/web/webchat)
- Operaciones de Gateway: [Manual de operaciones de Gateway](/es/gateway)
- Cron + despertares: [Trabajos Cron](/es/automation/cron-jobs)
- Compañero de la barra de menús de macOS: [OpenClaw macOS app](/es/platforms/macos)
- Aplicación de nodo iOS: [iOS app](/es/platforms/ios)
- Aplicación de nodo Android: [Android app](/es/platforms/android)
- Estado de Windows: [Windows (WSL2)](/es/platforms/windows)
- Estado de Linux: [Linux app](/es/platforms/linux)
- Seguridad: [Security](/es/gateway/security)

## Relacionado

- [Getting started](/es/start/getting-started)
- [Setup](/es/start/setup)
- [Channels overview](/es/channels)
