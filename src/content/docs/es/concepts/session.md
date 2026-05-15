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

### Acoplar canales vinculados

Los comandos de acoplamiento permiten a un usuario mover la ruta de respuesta de la sesión de chat directo actual a otro canal vinculado sin iniciar una nueva sesión. Consulte [Acoplamiento de canales](/es/concepts/channel-docking) para ver ejemplos, configuración y solución de problemas.

Verifique su configuración con `openclaw security audit`.

## Ciclo de vida de la sesión

Las sesiones se reutilizan hasta que caducan:

- **Reinicio diario** (predeterminado) -- nueva sesión a las 4:00 a. m. hora local en el host de puerta de enlace. La frescura diaria se basa en cuándo comenzó el `sessionId` actual, no en escrituras de metadatos posteriores.
- **Reinicio por inactividad** (opcional) -- nueva sesión después de un período de inactividad. Configure `session.reset.idleMinutes`. La frescura por inactividad se basa en la última interacción real de usuario/canal, por lo que los eventos del sistema de latido, cron y exec no mantienen la sesión activa.
- **Reinicio manual** -- escriba `/new` o `/reset` en el chat. `/new <model>` también cambia el modelo.

Cuando se configuran tanto los reinicios diarios como los de inactividad, gana el que caduque primero. Los turnos de eventos del sistema de latido, cron, exec y otros pueden escribir metadatos de sesión, pero esas escrituras no extienden la frescura del reinicio diario o por inactividad. Cuando un reinicio hace avanzar la sesión, las notificaciones de eventos del sistema en cola para la sesión anterior se descartan para que las actualizaciones en segundo plano obsoletas no se antepongan al primer mensaje en la nueva sesión.

Las sesiones con una sesión de CLI activa propiedad del proveedor no se interrumpen por el valor diario predeterminado implícito. Use `/reset` o configure `session.reset` explícitamente cuando esas sesiones deban caducar en un temporizador.

## Dónde reside el estado

Todo el estado de la sesión es propiedad de la **puerta de enlace**. Los clientes de interfaz de usuario consultan a la puerta de enlace para obtener datos de la sesión.

- **Almacenamiento:** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Transcripciones:** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` mantiene marcas de tiempo de ciclo de vida separadas:

- `sessionStartedAt`: cuándo comenzó el `sessionId` actual; el reinicio diario usa esto.
- `lastInteractionAt`: última interacción de usuario/canal que extiende la vida útil de inactividad.
- `updatedAt`: última mutación de fila de almacenamiento; útil para listar y limpiar, pero no autoritativo para la frescura del reinicio diario/inactividad.

Las filas antiguas sin `sessionStartedAt` se resuelven desde el encabezado de sesión transcript JSONL cuando está disponible. Si una fila antigua tampoco tiene `lastInteractionAt`, la frescura de inactividad vuelve a esa hora de inicio de sesión, no a las escrituras de contabilidad posteriores.

## Mantenimiento de sesiones

OpenClaw limita automáticamente el almacenamiento de sesiones con el tiempo. De forma predeterminada, se ejecuta en modo `warn` (informa lo que se limpiaría). Establezca `session.maintenance.mode` en `"enforce"` para la limpieza automática:

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

Para los límites `maxEntries` de tamaño de producción, las escrituras de tiempo de ejecución de Gateway usan un pequeño búfer de nivel alto alto y vuelven a limpiar hasta el límite configurado por lotes. Las lecturas de la tienda de sesiones no podan ni limitan las entradas durante el inicio de Gateway. Esto evita ejecutar una limpieza completa de la tienda en cada inicio o sesión cron aislada. `openclaw sessions cleanup --enforce` aplica el límite inmediatamente.

El mantenimiento conserva los punteros de conversación externos duraderos, incluyendo las sesiones grupales y las sesiones de chat con ámbito de hilo, mientras que aún permite que las entradas sintéticas de cron, hook, latido, ACP y sub-agente envejezcan.

Si anteriormente usó el aislamiento de mensajes directos y luego devolvió `session.dmScope` a `main`, obtenga una vista previa de las filas de DM antiguas con clave de par obsoletas con `openclaw sessions cleanup --dry-run --fix-dm-scope`. Aplicar la misma bandera retira esas filas antiguas de DM directas y mantiene sus transcripciones como archivos eliminados.

Vista previa con `openclaw sessions cleanup --dry-run`.

## Inspeccionar sesiones

- `openclaw status` -- ruta de la tienda de sesiones y actividad reciente.
- `openclaw sessions --json` -- todas las sesiones (filtro con `--active <minutes>`).
- `/status` en el chat -- uso del contexto, modelo y alternadores.
- `/context list` -- lo que hay en el mensaje del sistema.

## Lecturas adicionales

- [Poda de sesiones](/es/concepts/session-pruning) -- recortando resultados de herramientas
- [Compactación](/es/concepts/compaction) -- resumiendo conversaciones largas
- [Herramientas de sesión](/es/concepts/session-tool) -- herramientas de agente para trabajo entre sesiones
- [Análisis profundo de la gestión de sesiones](/es/reference/session-management-compaction) --
  esquema de tienda, transcripciones, política de envío, metadatos de origen y configuración avanzada
- [Multi-Agent](/es/concepts/multi-agent) — enrutamiento y aislamiento de sesiones entre agentes
- [Background Tasks](/es/automation/tasks) — cómo el trabajo separado crea registros de tareas con referencias a sesiones
- [Channel Routing](/es/channels/channel-routing) — cómo se enrutan los mensajes entrantes a las sesiones

## Relacionado

- [Poda de sesiones](/es/concepts/session-pruning)
- [Herramientas de sesión](/es/concepts/session-tool)
- [Cola de comandos](/es/concepts/queue)
