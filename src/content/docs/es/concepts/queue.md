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

La dirección en el mismo turno (Same-turn steering) es el valor predeterminado. Un mensaje que llega a mitad de la ejecución se inyecta en el entorno de ejecución activo cuando la ejecución puede aceptar dirección, por lo que no se inicia una segunda ejecución de sesión. Si la ejecución activa no puede aceptar dirección, OpenClaw espera a que termine la ejecución activa antes de iniciar el mensaje.

## Modos de cola

`/queue` controla lo que hacen los mensajes entrantes normales mientras una sesión ya tiene una ejecución activa:

- `steer`: inyecta mensajes en el entorno de ejecución activo. Pi entrega todos los mensajes de dirección pendientes **después de que el turno del asistente actual termine de ejecutar sus llamadas a herramientas**, antes de la siguiente llamada al LLM; el servidor de aplicaciones Codex recibe un `turn/steer` por lotes. Si la ejecución no está transmitiendo activamente o la dirección no está disponible, OpenClaw espera hasta que termine la ejecución activa antes de iniciar el mensaje.
- `followup`: no dirigir. Poner en cola cada mensaje para un turno de agente posterior después de que finalice la ejecución actual.
- `collect`: no dirigir. Combinar los mensajes en cola en un **único** turno de seguimiento después de la ventana de silencio. Si los mensajes tienen como objetivo diferentes canales/hilos, se drenan individualmente para preservar el enrutamiento.
- `interrupt`: abortar la ejecución activa para esa sesión y luego ejecutar el mensaje más reciente.

Para ver el tiempo específico de la ejecución y el comportamiento de las dependencias, consulte
[Steering queue](/es/concepts/queue-steering). Para el comando explícito `/steer <message>`,
consulte [Steer](/es/tools/steer).

Configure globalmente o por canal a través de `messages.queue`:

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

Las opciones se aplican a la entrega en cola. `debounceMs` también establece la ventana de silencio de dirección de Codex en el modo `steer`:

- `debounceMs`: ventana de silencio antes de drenar los seguimientos en cola o recopilar lotes; en el modo `steer` de Codex, ventana de silencio antes de enviar el `turn/steer` por lotes. Los números simples son milisegundos; las unidades `ms`, `s`, `m`, `h` y `d` son aceptadas por las opciones `/queue`.
- `cap`: máx. mensajes en cola por sesión. Se ignoran los valores inferiores a `1`.
- `drop: "summarize"`: predeterminado. Descarta las entradas en cola más antiguas según sea necesario, mantiene resúmenes compactos y los inyecta como un mensaje de seguimiento sintético.
- `drop: "old"`: descarta las entradas en cola más antiguas según sea necesario, sin conservar los resúmenes.
- `drop: "new"`: rechaza el mensaje más reciente cuando la cola ya está llena.

Valores predeterminados: `debounceMs: 500`, `cap: 20`, `drop: summarize`.

## Steer y streaming

Cuando el streaming del canal es `partial` o `block`, el steering puede parecer varias
respuestas cortas visibles mientras la ejecución activa alcanza los límites de tiempo de ejecución:

- `partial`: la vista previa puede finalizar antes, y luego comienza una nueva vista previa después
  de que el steering sea aceptado.
- `block`: los bloques de tamaño de borrador pueden crear la misma apariencia secuencial.
- Sin streaming, el steering vuelve a un seguimiento después de la ejecución activa cuando
  el tiempo de ejecución no puede aceptar steering en el mismo turno.

`steer` no aborta las herramientas en vuelo. Use `/queue interrupt` cuando el mensaje
más reciente deba abortar la ejecución actual.

## Precedencia

Para la selección del modo, OpenClaw resuelve:

1. Invalidación en línea o almacenada por sesión `/queue`.
2. `messages.queue.byChannel.<channel>`.
3. `messages.queue.mode`.
4. `steer` predeterminado.

Para las opciones, las opciones en línea o almacenadas `/queue` tienen prioridad sobre la configuración. Luego
se aplica el antirrebote específico del canal (`messages.queue.debounceMsByChannel`), los valores predeterminados
de antirrebote del complemento, las opciones globales `messages.queue` y los valores predeterminados integrados.
`cap` y `drop` son opciones globales/de sesión, no claves de configuración por canal.

## Invalidaciones por sesión

- Envíe `/queue <steer|followup|collect|interrupt>` como un comando independiente para almacenar el modo de cola para la sesión actual.
- Las opciones se pueden combinar: `/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` o `/queue reset` borra la invalidación de la sesión.

## Alcance y garantías

- Se aplica a las ejecuciones del agente de autorespuesta en todos los canales entrantes que utilizan la canalización de respuesta de la puerta de enlace (WhatsApp web, Telegram, Slack, Discord, Signal, iMessage, webchat, etc.).
- El carril predeterminado (`main`) es para todo el proceso para latidos entrantes + principales; establezca `agents.defaults.maxConcurrent` para permitir múltiples sesiones en paralelo.
- Pueden existir carriles adicionales (p. ej. `cron`, `cron-nested`, `nested`, `subagent`) para que los trabajos en segundo plano se ejecuten en paralelo sin bloquear las respuestas entrantes. Los turnos aislados de agentes cron ocupan un espacio `cron` mientras su ejecución interna del agente utiliza `cron-nested`; ambos usan `cron.maxConcurrentRuns`. Los flujos `nested` compartidos no cron mantienen su propio comportamiento de carril. Estas ejecuciones separadas se rastrean como [tareas en segundo plano](/es/automation/tasks).
- Los carriles por sesión garantizan que solo una ejecución de agente toque una sesión determinada a la vez.
- Sin dependencias externas ni hilos de trabajo en segundo plano; TypeScript puro + promesas.

## Solución de problemas

- Si los comandos parecen atascados, habilite los registros detallados y busque las líneas "queued for ...ms" para confirmar que la cola se está drenando.
- Si necesita la profundidad de la cola, habilite los registros detallados y observe las líneas de tiempo de la cola.
- Las ejecuciones del servidor de aplicaciones Codex que aceptan un turno y luego dejan de emitir progreso son interrumpidas por el adaptador Codex para que el carril de sesión activo pueda liberarse en lugar de esperar el tiempo de espera de la ejecución externa.
- Cuando el diagnóstico está habilitado, las sesiones que permanecen en `processing` más allá de `diagnostics.stuckSessionWarnMs` sin progreso observado de respuesta, herramienta, estado, bloque o ACP se clasifican por actividad actual. El trabajo activo se registra como `session.long_running`; el trabajo activo sin progreso reciente se registra como `session.stalled`; `session.stuck` está reservado para la contabilidad de sesiones obsoletas sin trabajo activo, y solo esa ruta puede liberar el carril de sesión afectado para que se drene el trabajo en cola. Los diagnósticos `session.stuck` repetidos se reducen mientras la sesión permanece sin cambios.

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Cola de dirección (Steering queue)](/es/concepts/queue-steering)
- [Dirigir (Steer)](/es/tools/steer)
- [Política de reintentos](/es/concepts/retry)
