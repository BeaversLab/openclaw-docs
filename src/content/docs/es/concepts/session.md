---
summary: "Cómo OpenClaw gestiona las sesiones de conversación"
read_when:
  - You want to understand session routing and isolation
  - You want to configure DM scope for multi-user setups
  - You are debugging daily or idle session resets
title: "Gestión de sesiones"
---

OpenClaw organiza las conversaciones en **sesiones**. Cada mensaje se enruta a una
sesión según su origen -- mensajes directos, chats de grupo, trabajos cron, etc.

## Cómo se enrutan los mensajes

| Origen            | Comportamiento                 |
| ----------------- | ------------------------------ |
| Mensajes directos | Sesión compartida por defecto  |
| Chats de grupo    | Aislado por grupo              |
| Salas/canales     | Aislado por sala               |
| Trabajos cron     | Sesión nueva en cada ejecución |
| Webhooks          | Aislado por hook               |

## Aislamiento de mensajes directos

Por defecto, todos los mensajes directos comparten una sesión para mantener la continuidad.
Esto es adecuado para configuraciones de un solo usuario.

<Warning>Si varias personas pueden enviar mensajes a tu agente, habilita el aislamiento de mensajes directos. Sin él, todos los usuarios comparten el mismo contexto de conversación -- los mensajes privados de Alice serían visibles para Bob.</Warning>

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
- `per-peer` -- aislar por remitente (a través de canales).
- `per-channel-peer` -- aislar por canal + remitente (recomendado).
- `per-account-channel-peer` -- aislar por cuenta + canal + remitente.

<Tip>Si la misma persona te contacta desde varios canales, usa `session.identityLinks` para vincular sus identidades y que compartan una sesión.</Tip>

Verifica tu configuración con `openclaw security audit`.

## Ciclo de vida de la sesión

Las sesiones se reutilizan hasta que expiran:

- **Reinicio diario** (por defecto) -- sesión nueva a las 4:00 AM hora local en el host de
  la puerta de enlace. La frescura diaria se basa en cuándo se inició el `sessionId` actual, no
  en escrituras posteriores de metadatos.
- **Reinicio por inactividad** (opcional) -- sesión nueva después de un período de inactividad.
  Establece `session.reset.idleMinutes`. La frescura por inactividad se basa en la última interacción
  real de usuario/canal, por lo que los eventos del sistema de latido, cron y exec no
  mantienen la sesión activa.
- **Reinicio manual** -- escribe `/new` o `/reset` en el chat. `/new <model>` también
  cambia el modelo.

Cuando están configurados tanto el restablecimiento diario como el de inactividad, gana el que expire primero. Los turnos de Heartbeat, cron, exec y otros eventos del sistema pueden escribir metadatos de la sesión, pero esas escrituras no extienden la vigencia del restablecimiento diario o de inactividad. Cuando un restablecimiento reinicia la sesión, las notificaciones de eventos del sistema en cola para la sesión antigua se descartan para que las actualizaciones en segundo plano obsoletas no se antepongan al primer aviso en la nueva sesión.

Las sesiones con una sesión CLI activa propiedad del proveedor no se cortan por el valor diario implícito. Use `/reset` o configure `session.reset` explícitamente cuando esas sesiones deban expirar en un temporizador.

## Dónde reside el estado

Todo el estado de la sesión es propiedad de la **puerta de enlace** (gateway). Los clientes de la interfaz de usuario consultan la puerta de enlace para
obtener datos de la sesión.

- **Almacén:** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Transcripciones:** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` mantiene marcas de tiempo de ciclo de vida separadas:

- `sessionStartedAt`: cuándo comenzó el `sessionId` actual; el restablecimiento diario usa esto.
- `lastInteractionAt`: última interacción de usuario/canal que extiende la vida útil de inactividad.
- `updatedAt`: última mutación de fila de almacenamiento; útil para listar y podar, pero no es autoritativo para la vigencia del restablecimiento diario/inactivo.

Las filas antiguas sin `sessionStartedAt` se resuelven desde el encabezado de sesión JSONL de la transcripción cuando está disponible. Si una fila antigua también carece de `lastInteractionAt`, la vigencia de inactividad vuelve a esa hora de inicio de sesión, no a escrituras de contabilidad posteriores.

## Mantenimiento de sesiones

OpenClaw limita automáticamente el almacenamiento de sesiones con el tiempo. De forma predeterminada, se ejecuta en modo `warn` (informa qué se limpiaría). Establezca `session.maintenance.mode` en `"enforce"` para la limpieza automática:

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

Para límites de `maxEntries` de tamaño de producción, las escrituras del tiempo de ejecución de Gateway usan un pequeño búfer de marca de agua alta y limpian de vuelta hasta el límite configurado por lotes. Esto evita ejecutar una limpieza completa del almacenamiento en cada sesión de cron aislada. `openclaw sessions cleanup --enforce` aplica el límite inmediatamente.

Vista previa con `openclaw sessions cleanup --dry-run`.

## Inspección de sesiones

- `openclaw status` -- ruta del almacén de sesiones y actividad reciente.
- `openclaw sessions --json` -- todas las sesiones (filtrar con `--active <minutes>`).
- `/status` en el chat -- uso del contexto, modelo y alternadores.
- `/context list` -- lo que hay en el prompt del sistema.

## Lecturas adicionales

- [Poda de sesión](/es/concepts/session-pruning) -- recortar resultados de herramientas
- [Compactación](/es/concepts/compaction) -- resumir conversaciones largas
- [Herramientas de sesión](/es/concepts/session-tool) -- herramientas de agente para trabajo entre sesiones
- [Análisis profundo de la gestión de sesiones](/es/reference/session-management-compaction) --
  esquema de almacenamiento, transcripciones, política de envío, metadatos de origen y configuración avanzada
- [Multiagente](/es/concepts/multi-agent) — enrutamiento y aislamiento de sesiones entre agentes
- [Tareas en segundo plano](/es/automation/tasks) — cómo el trabajo desconectado crea registros de tareas con referencias de sesión
- [Enrutamiento de canales](/es/channels/channel-routing) -- cómo se enrutan los mensajes entrantes a las sesiones

## Relacionado

- [Poda de sesión](/es/concepts/session-pruning)
- [Herramientas de sesión](/es/concepts/session-tool)
- [Cola de comandos](/es/concepts/queue)
