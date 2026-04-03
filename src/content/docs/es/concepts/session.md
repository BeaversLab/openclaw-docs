---
summary: "Cómo OpenClaw gestiona las sesiones de conversación"
read_when:
  - You want to understand session routing and isolation
  - You want to configure DM scope for multi-user setups
title: "Gestión de sesiones"
---

# Gestión de Sesiones

OpenClaw organiza las conversaciones en **sesiones**. Cada mensaje se enruta a una
sesión según su origen -- mensajes directos, chats grupales, trabajos cron, etc.

## Cómo se enrutan los mensajes

| Origen            | Comportamiento                |
| ----------------- | ----------------------------- |
| Mensajes directos | Sesión compartida por defecto |
| Chats grupales    | Aislado por grupo             |
| Salas/canales     | Aislado por sala              |
| Trabajos cron     | Sesión nueva por ejecución    |
| Webhooks          | Aislado por webhook           |

## Aislamiento de mensajes directos

Por defecto, todos los mensajes directos comparten una sesión para mantener la continuidad. Esto es adecuado para
configuraciones de un solo usuario.

<Warning>Si varias personas pueden enviar mensajes a su agente, active el aislamiento de mensajes directos. Sin él, todos los usuarios comparten el mismo contexto de conversación: los mensajes privados de Alice serían visibles para Bob.</Warning>

**La solución:**

```json5
{
  session: {
    dmScope: "per-channel-peer", // isolate by channel + sender
  },
}
```

Otras opciones:

- `main` (por defecto) -- todos los mensajes directos comparten una sesión.
- `per-peer` -- aislar por remitente (entre canales).
- `per-channel-peer` -- aislar por canal + remitente (recomendado).
- `per-account-channel-peer` -- aislar por cuenta + canal + remitente.

<Tip>Si la misma persona se pone en contacto con usted desde varios canales, use `session.identityLinks` para vincular sus identidades para que compartan una sesión.</Tip>

Verifique su configuración con `openclaw security audit`.

## Ciclo de vida de la sesión

Las sesiones se reutilizan hasta que caducan:

- **Reinicio diario** (por defecto) -- sesión nueva a las 4:00 AM hora local en la puerta de enlace
  (gateway).
- **Reinicio por inactividad** (opcional) -- sesión nueva después de un período de inactividad. Configure
  `session.reset.idleMinutes`.
- **Reinicio manual** -- escriba `/new` o `/reset` en el chat. `/new <model>` también
  cambia el modelo.

Cuando se configuran tanto el reinicio diario como el por inactividad, gana el que caduque primero.

## Dónde reside el estado

Todo el estado de la sesión es propiedad de la **puerta de enlace** (gateway). Los clientes de la interfaz de usuario consultan la puerta de enlace para
obtener datos de la sesión.

- **Almacenamiento:** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Transcripciones:** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

## Mantenimiento de la sesión

OpenClaw delimita automáticamente el almacenamiento de la sesión a lo largo del tiempo. De forma predeterminada, se ejecuta en modo `warn` (informa qué se limpiaría). Establezca `session.maintenance.mode` en `"enforce"` para la limpieza automática:

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "30d",
      maxEntries: 500,
    },
  },
}
```

Vista previa con `openclaw sessions cleanup --dry-run`.

## Inspeccionar sesiones

- `openclaw status` -- ruta de almacenamiento de la sesión y actividad reciente.
- `openclaw sessions --json` -- todas las sesiones (filtrar con `--active <minutes>`).
- `/status` en el chat -- uso del contexto, modelo e interruptores.
- `/context list` -- qué hay en el prompt del sistema.

## Lecturas adicionales

- [Poda de sesiones](/en/concepts/session-pruning) -- recortar resultados de herramientas
- [Compactación](/en/concepts/compaction) -- resumir conversaciones largas
- [Herramientas de sesión](/en/concepts/session-tool) -- herramientas de agente para trabajo entre sesiones
- [Análisis profundo de la gestión de sesiones](/en/reference/session-management-compaction) --
  esquema de almacenamiento, transcripciones, política de envío, metadatos de origen y configuración avanzada
- [Multiagente](/en/concepts/multi-agent) — enrutamiento y aislamiento de sesiones entre agentes
- [Tareas en segundo plano](/en/automation/tasks) — cómo el trabajo desvinculado crea registros de tareas con referencias de sesión
- [Enrutamiento de canales](/en/channels/channel-routing) — cómo se enrutan los mensajes entrantes a las sesiones
