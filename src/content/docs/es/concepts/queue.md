---
summary: "Modos de cola de auto-respuesta, valores predeterminados y anulaciones por sesión"
read_when:
  - Changing auto-reply execution or concurrency
  - Explaining /queue modes or message steering behavior
title: "Cola de comandos"
---

Serializamos las ejecuciones de autorespuestas entrantes (todos los canales) a través de una pequeña cola en proceso para evitar que múltiples ejecuciones del agente colisionen, permitiendo al mismo tiempo un paralelismo seguro entre sesiones.

## Por qué

- Las ejecuciones de autorespuestas pueden ser costosas (llamadas a LLM) y pueden colisionar cuando llegan varios mensajes entrantes muy juntos.
- La serialización evita competir por recursos compartidos (archivos de sesión, registros, stdin de CLI) y reduce la probabilidad de límites de tasa aguas arriba.

## Cómo funciona

- Una cola FIFO con conocimiento de carriles (lane-aware) drena cada carril con un límite de concurrencia configurable (por defecto 1 para carriles no configurados; el principal es 4 por defecto, el subagente es 8).
- `runEmbeddedPiAgent` pone en cola por **clave de sesión** (carril `session:<key>`) para garantizar solo una ejecución activa por sesión.
- Cada ejecución de sesión se pone en cola en un **carril global** (`main` por defecto) para que el paralelismo general esté limitado por `agents.defaults.maxConcurrent`.
- Cuando el registro detallado está habilitado, las ejecuciones en cola emiten un breve aviso si esperaron más de ~2s antes de comenzar.
- Los indicadores de escritura (typing indicators) aún se activan inmediatamente al poner en cola (cuando el canal lo soporta) para que la experiencia del usuario no cambie mientras esperamos nuestro turno.

## Valores predeterminados

Cuando no están configurados, todas las superficies de canales entrantes usan:

- `mode: "steer"`
- `debounceMs: 500`
- `cap: 20`
- `drop: "summarize"`

`steer` es el valor predeterminado porque mantiene el turno activo del modelo receptivo sin
iniciar una segunda ejecución de sesión. Drena todos los mensajes de dirección que llegaron
antes del siguiente límite del modelo. Si la ejecución actual no puede aceptar dirección,
OpenClaw recurre a una entrada de cola de seguimiento.

## Modos de cola

Los mensajes entrantes pueden dirigir la ejecución actual, esperar un turno de seguimiento o hacer ambas cosas:

- `steer`: pone en cola los mensajes de dirección en el tiempo de ejecución activo. Pi entrega todos los mensajes de dirección pendientes **después de que el turno actual del asistente termine de ejecutar sus llamadas a herramientas**, antes de la siguiente llamada al LLM; el servidor de aplicaciones de Codex recibe un `turn/steer` por lotes. Si la ejecución no está transmitiendo activamente o la dirección no está disponible, OpenClaw recurre a una entrada de cola de seguimiento.
- `queue` (legado): dirección antigua de uno a la vez. Pi entrega un mensaje de dirección en cola en cada límite del modelo; el servidor de aplicaciones de Codex recibe solicitudes `turn/steer` separadas. Se prefiere `steer` a menos que necesites el comportamiento serializado anterior.
- `followup`: pone en cola cada mensaje para un turno de agente posterior después de que termina la ejecución actual.
- `collect`: fusiona los mensajes en cola en un **único** turno de seguimiento después de la ventana de silencio. Si los mensajes tienen como objetivo diferentes canales/hilos, se drenan individualmente para preservar el enrutamiento.
- `steer-backlog` (también conocido como `steer+backlog`): dirige ahora **y** preserva el mismo mensaje para un turno de seguimiento.
- `interrupt` (legado): aborta la ejecución activa para esa sesión y luego ejecuta el mensaje más nuevo.

Steer-backlog significa que puedes obtener una respuesta de seguimiento después de la ejecución dirigida, por lo que
las superficies de transmisión pueden parecer duplicados. Se prefiere `collect`/`steer` si deseas
una respuesta por mensaje entrante.

Para conocer el comportamiento de tiempo y dependencia específico del tiempo de ejecución, consulte
[Steering queue](/es/concepts/queue-steering). Para el comando `/steer <message>`
explícito, consulte [Steer](/es/tools/steer).

Configure globalmente o por canal mediante `messages.queue`:

```json5
{
  messages: {
    queue: {
      mode: "steer",
      debounceMs: 500,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## Opciones de cola

Las opciones se aplican a `followup`, `collect` y `steer-backlog` (y a `steer` o al `queue` heredado cuando la dirección (steering) vuelve al seguimiento (followup)):

- `debounceMs`: ventana silenciosa antes de vaciar los seguimientos (followups) en cola. Los números simples son milisegundos; las unidades `ms`, `s`, `m`, `h` y `d` son aceptadas por las opciones `/queue`.
- `cap`: máximo de mensajes en cola por sesión. Se ignoran los valores inferiores a `1`.
- `drop: "summarize"`: predeterminado. Descarta las entradas en cola más antiguas según sea necesario, mantiene resúmenes compactos y los inyecta como un aviso de seguimiento (followup) sintético.
- `drop: "old"`: descarta las entradas en cola más antiguas según sea necesario, sin conservar los resúmenes.
- `drop: "new"`: rechaza el mensaje más reciente cuando la cola ya está llena.

Valores predeterminados: `debounceMs: 500`, `cap: 20`, `drop: summarize`.

## Precedencia

Para la selección del modo, OpenClaw resuelve:

1. Invalidación `/queue` en línea o almacenada por sesión.
2. `messages.queue.byChannel.<channel>`.
3. `messages.queue.mode`.
4. `steer` predeterminado.

Para las opciones, las opciones `/queue` en línea o almacenadas tienen prioridad sobre la configuración. Luego
se aplican el tiempo de rebote (debounce) específico del canal (`messages.queue.debounceMsByChannel`), los valores predeterminados
de rebote del complemento (plugin), las opciones `messages.queue` globales y los valores predeterminados integrados.
`cap` y `drop` son opciones globales/sesión, no claves de configuración por canal.

## Invalidaciones por sesión

- Envíe `/queue <mode>` como un comando independiente para guardar el modo de la sesión actual.
- Las opciones se pueden combinar: `/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` o `/queue reset` borran la anulación de la sesión.

## Alcance y garantías

- Se aplica a las ejecuciones del agente de autorespuesta en todos los canales entrantes que utilizan la canalización de respuesta de la puerta de enlace (WhatsApp web, Telegram, Slack, Discord, Signal, iMessage, webchat, etc.).
- El carril predeterminado (`main`) es para todo el proceso para latidos entrantes + principales; establezca `agents.defaults.maxConcurrent` para permitir múltiples sesiones en paralelo.
- Pueden existir carriles adicionales (por ejemplo, `cron`, `cron-nested`, `nested`, `subagent`) para que los trabajos en segundo plano se ejecuten en paralelo sin bloquear las respuestas entrantes. Los turnos de agente cron aislados mantienen un espacio `cron` mientras que su ejecución interna del agente usa `cron-nested`; ambos usan `cron.maxConcurrentRuns`. Los flujos `nested` no cron compartidos mantienen su propio comportamiento de carril. Estas ejecuciones separadas se rastrean como [tareas en segundo plano](/es/automation/tasks).
- Los carriles por sesión garantizan que solo una ejecución del agente toque una sesión determinada a la vez.
- Sin dependencias externas ni subprocesos de trabajo en segundo plano; TypeScript puro + promesas.

## Solución de problemas

- Si los comandos parecen estar atascados, habilite los registros detallados y busque las líneas "queued for ...ms" para confirmar que la cola se está drenando.
- Si necesita la profundidad de la cola, habilite los registros detallados y observe las líneas de tiempo de la cola.
- Las ejecuciones del servidor de aplicaciones de Codex que aceptan un turno y luego dejan de emitir progreso son interrumpidas por el adaptador de Codex para que el carril de sesión activo pueda liberarse en lugar de esperar el tiempo de espera de la ejecución externa.
- Cuando los diagnósticos están habilitados, las sesiones que permanecen en `processing` más allá de `diagnostics.stuckSessionWarnMs` sin una respuesta, herramienta, estado, bloque o progreso de ACP observado se clasifican por actividad actual. El trabajo activo se registra como `session.long_running`; el trabajo activo sin progreso reciente se registra como `session.stalled`; `session.stuck` está reservado para la contabilidad de sesiones obsoletas sin trabajo activo, y solo esa ruta puede liberar el carril de sesión afectado para que se drene el trabajo en cola. Los diagnósticos repetidos de `session.stuck` se espacian mientras la sesión permanece sin cambios.

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Cola de dirección](/es/concepts/queue-steering)
- [Dirigir](/es/tools/steer)
- [Política de reintentos](/es/concepts/retry)
