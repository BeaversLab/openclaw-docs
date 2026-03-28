---
summary: "Diseño de cola de comandos que serializa las ejecuciones de respuesta automática entrantes"
read_when:
  - Changing auto-reply execution or concurrency
title: "Cola de comandos"
---

# Cola de comandos (2026-01-16)

Serializamos las ejecuciones de respuesta automática entrantes (todos los canales) a través de una pequeña cola en proceso para evitar que múltiples ejecuciones de agentes colisionen, al tiempo que permitimos un paralelismo seguro entre sesiones.

## Por qué

- Las ejecuciones de respuesta automática pueden ser costosas (llamadas a LLM) y pueden colisionar cuando llegan varios mensajes entrantes muy juntos.
- La serialización evita competir por recursos compartidos (archivos de sesión, registros, stdin de CLI) y reduce la posibilidad de alcanzar límites de tasa ascendentes.

## Cómo funciona

- Una cola FIFO consciente de carriles drena cada carril con un límite de concurrencia configurable (predeterminado 1 para carriles no configurados; principal predeterminado a 4, subagente a 8).
- `runEmbeddedPiAgent` pone en cola por **clave de sesión** (carril `session:<key>`) para garantizar solo una ejecución activa por sesión.
- Luego, cada ejecución de sesión se pone en cola en un **carril global** (`main` de forma predeterminada), de modo que el paralelismo general se limita mediante `agents.defaults.maxConcurrent`.
- Cuando el registro detallado está habilitado, las ejecuciones en cola emiten un aviso breve si esperaron más de ~2s antes de comenzar.
- Los indicadores de escritura aún se activan inmediatamente al poner en cola (cuando el canal lo admite), de modo que la experiencia del usuario no cambia mientras esperamos nuestro turno.

## Modos de cola (por canal)

Los mensajes entrantes pueden dirigir la ejecución actual, esperar un turno de seguimiento o hacer ambos:

- `steer`: inyecta inmediatamente en la ejecución actual (cancela las llamadas a herramientas pendientes después del siguiente límite de herramienta). Si no se está transmitiendo, vuelve al seguimiento.
- `followup`: pone en cola para el siguiente turno de agente después de que termine la ejecución actual.
- `collect`: combina todos los mensajes en cola en un **único** turno de seguimiento (predeterminado). Si los mensajes apuntan a diferentes canales/hilos, se drenan individualmente para preservar el enrutamiento.
- `steer-backlog` (también conocido como `steer+backlog`): dirige ahora **y** preserva el mensaje para un turno de seguimiento.
- `interrupt` (heredado): aborta la ejecución activa para esa sesión y luego ejecuta el mensaje más reciente.
- `queue` (alias heredado): igual que `steer`.

Steer-backlog significa que puedes obtener una respuesta de seguimiento después de la ejecución dirigida, por lo que
las superficies de streaming pueden parecer duplicados. Prefiere `collect`/`steer` si quieres
una respuesta por mensaje entrante.
Envía `/queue collect` como un comando independiente (por sesión) o establece `messages.queue.byChannel.discord: "collect"`.

Valores predeterminados (cuando no se establecen en la configuración):

- Todas las superficies → `collect`

Configura globalmente o por canal a través de `messages.queue`:

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

- `debounceMs`: espera tranquilidad antes de iniciar un turno de seguimiento (evita “continuar, continuar”).
- `cap`: máx. mensajes en cola por sesión.
- `drop`: política de desbordamiento (`old`, `new`, `summarize`).

Summarize mantiene una lista corta de viñetas de mensajes descartados y la inyecta como un prompt de seguimiento sintético.
Valores predeterminados: `debounceMs: 1000`, `cap: 20`, `drop: summarize`.

## Anulaciones por sesión

- Envía `/queue <mode>` como un comando independiente para almacenar el modo de la sesión actual.
- Las opciones se pueden combinar: `/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` o `/queue reset` borra la anulación de la sesión.

## Alcance y garantías

- Se aplica a las ejecuciones del agente de auto-respuesta en todos los canales entrantes que utilizan la canalización de respuesta de la puerta de enlace (WhatsApp web, Telegram, Slack, Discord, Signal, iMessage, webchat, etc.).
- El carril predeterminado (`main`) es para todo el proceso para latidos entrantes + principales; establece `agents.defaults.maxConcurrent` para permitir múltiples sesiones en paralelo.
- Pueden existir carriles adicionales (ej. `cron`, `subagent`) para que los trabajos en segundo plano se ejecuten en paralelo sin bloquear las respuestas entrantes.
- Los carriles por sesión garantizan que solo una ejecución del agente toque una sesión dada a la vez.
- Sin dependencias externas ni subprocesos de trabajo en segundo plano; TypeScript puro + promesas.

## Solución de problemas

- Si los comandos parecen bloqueados, active los registros detallados y busque las líneas “queued for …ms” para confirmar que la cola se está vaciando.
- Si necesita la profundidad de la cola, active los registros detallados y vigile las líneas de temporización de la cola.
