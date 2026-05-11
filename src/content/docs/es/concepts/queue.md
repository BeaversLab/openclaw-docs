---
summary: "Diseño de cola de comandos que serializa las ejecuciones de respuesta automática entrantes"
read_when:
  - Changing auto-reply execution or concurrency
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

## Modos de cola (por canal)

Los mensajes entrantes pueden dirigir la ejecución actual, esperar el siguiente turno, o hacer ambos:

- `steer`: inyecta inmediatamente en la ejecución actual (cancela las llamadas a herramientas pendientes después del siguiente límite de herramienta). Si no se está transmitiendo (streaming), vuelve al modo de seguimiento (followup).
- `followup`: pone en cola para el siguiente turno del agente después de que termine la ejecución actual.
- `collect`: combina todos los mensajes en cola en un **único** turno de seguimiento (followup) (predeterminado). Si los mensajes tienen como objetivo diferentes canales/hilos, se drenan individualmente para preservar el enrutamiento.
- `steer-backlog` (también conocido como `steer+backlog`): dirige ahora **y** preserva el mensaje para un turno de seguimiento.
- `interrupt` (heredado): aborta la ejecución activa para esa sesión y luego ejecuta el mensaje más nuevo.
- `queue` (alias heredado): igual que `steer`.

Steer-backlog significa que puede obtener una respuesta de seguimiento después de la ejecución dirigida, por lo que
las superficies de transmisión pueden parecer duplicados. Prefiera `collect`/`steer` si desea
una respuesta por mensaje entrante.
Envíe `/queue collect` como un comando independiente (por sesión) o configure `messages.queue.byChannel.discord: "collect"`.

Valores predeterminados (cuando no se establecen en la configuración):

- Todas las superficies → `collect`

Configure globalmente o por canal a través de `messages.queue`:

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## Opciones de cola

Las opciones se aplican a `followup`, `collect` y `steer-backlog` (y a `steer` cuando vuelve al seguimiento):

- `debounceMs`: espere silencio antes de iniciar un turno de seguimiento (evita “continuar, continuar”).
- `cap`: máximo de mensajes en cola por sesión.
- `drop`: política de desbordamiento (`old`, `new`, `summarize`).

Summarize mantiene una lista corta de viñetas de los mensajes descartados y la inyecta como un mensaje de seguimiento sintético.
Valores predeterminados: `debounceMs: 1000`, `cap: 20`, `drop: summarize`.

## Anulaciones por sesión

- Envíe `/queue <mode>` como un comando independiente para guardar el modo de la sesión actual.
- Las opciones se pueden combinar: `/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` o `/queue reset` borra la anulación de la sesión.

## Alcance y garantías

- Se aplica a las ejecuciones del agente de respuesta automática en todos los canales entrantes que utilizan la canalización de respuesta de la puerta de enlace (WhatsApp web, Telegram, Slack, Discord, Signal, iMessage, webchat, etc.).
- El carril predeterminado (`main`) es a nivel de proceso para latidos entrantes + principales; configure `agents.defaults.maxConcurrent` para permitir múltiples sesiones en paralelo.
- Pueden existir carriles adicionales (p. ej. `cron`, `cron-nested`, `nested`, `subagent`) para que los trabajos en segundo plano se ejecuten en paralelo sin bloquear las respuestas entrantes. Los turnos aislados de agentes cron mantienen un hueco `cron` mientras su ejecución interna del agente usa `cron-nested`; ambos usan `cron.maxConcurrentRuns`. Los flujos `nested` compartidos no cron mantienen su propio comportamiento de carril. Estas ejecuciones desacopladas se rastrean como [tareas en segundo plano](/es/automation/tasks).
- Los carriles por sesión garantizan que solo una ejecución de agente toque una sesión dada a la vez.
- Sin dependencias externas ni subprocesos de trabajo en segundo plano; TypeScript puro + promesas.

## Solución de problemas

- Si los comandos parecen bloqueados, activa los registros detallados y busca las líneas "queued for …ms" para confirmar que la cola se está drenando.
- Si necesitas la profundidad de la cola, activa los registros detallados y observa las líneas de temporización de la cola.

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Política de reintentos](/es/concepts/retry)
