---
summary: "Estado y próximos pasos para desacoplar los escuchas de la puerta de enlace de Discord de los turnos de agente de larga duración con un trabajador de entrada específico de Discord"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Plan de trabajador de entrada asíncrono de Discord"
---

# Plan de trabajador de entrada asíncrono de Discord

## Objetivo

Elimine el tiempo de espera del escucha de Discord como modo de error visible para el usuario haciendo que los turnos de entrada de Discord sean asíncronos:

1. El escucha de la puerta de enlace acepta y normaliza los eventos entrantes rápidamente.
2. Una cola de ejecución de Discord almacena trabajos serializados claveados por el mismo límite de ordenamiento que usamos hoy.
3. Un trabajador ejecuta el turno real del agente fuera de la vida útil del escucha de Carbon.
4. Las respuestas se entregan de vuelta al canal o hilo de origen después de que se completa la ejecución.

Esta es la solución a largo plazo para que las ejecuciones en cola de Discord agoten el tiempo de espera en `channels.discord.eventQueue.listenerTimeout` mientras la ejecución del agente aún está progresando.

## Estado actual

Este plan está parcialmente implementado.

Ya hecho:

- El tiempo de espera del escucha de Discord y el tiempo de espera de ejecución de Discord ahora son configuraciones separadas.
- Los turnos de entrada de Discord aceptados se ponen en cola en `src/discord/monitor/inbound-worker.ts`.
- El trabajador ahora posee el turno de larga duración en lugar del escucha de Carbon.
- El ordenamiento por ruta existente se conserva mediante la clave de cola.
- Existe cobertura de regresión de tiempo de espera para la ruta del trabajador de Discord.

Lo que esto significa en lenguaje sencillo:

- el error de tiempo de espera en producción está solucionado
- el turno de larga duración ya no muere solo porque expira el presupuesto del escucha de Discord
- la arquitectura del trabajador aún no está terminada

Lo que todavía falta:

- `DiscordInboundJob` todavía está solo parcialmente normalizado y todavía lleva referencias de tiempo de ejecución en vivo
- la semántica de comandos (`stop`, `new`, `reset`, controles de sesión futuros) aún no son totalmente nativos del trabajador
- la observabilidad del trabajador y el estado del operador siguen siendo mínimos
- todavía no hay durabilidad de reinicio

## Por qué existe esto

El comportamiento actual vincula el turno completo del agente a la vida útil del escucha:

- `src/discord/monitor/listeners.ts` aplica el tiempo de espera y el límite de interrupción.
- `src/discord/monitor/message-handler.ts` mantiene la ejecución en cola dentro de ese límite.
- `src/discord/monitor/message-handler.process.ts` realiza la carga de medios, el enrutamiento, el despacho, la escritura, la transmisión de borradores y la entrega de la respuesta final en línea.

Esa arquitectura tiene dos propiedades indeseables:

- los turnos largos pero saludables pueden ser abortados por el perro guardián del escucha
- los usuarios pueden no ver respuesta alguna, incluso cuando el tiempo de ejecución aguas abajo habría producido una

Aumentar el tiempo de espera ayuda, pero no cambia el modo de fallo.

## No objetivos

- No rediseñar canales que no sean de Discord en esta pasada.
- No ampliar esto a un marco de trabajo de trabajador genérico para todos los canales en la primera implementación.
- No extraer aún una abstracción de trabajador de entrada compartida entre canales; solo compartir primitivas de bajo nivel cuando la duplicación sea obvia.
- No añadir recuperación duradera ante fallos en la primera pasada a menos que sea necesario para aterrizar de forma segura.
- No cambiar la selección de ruta, la semántica de enlace ni la política de ACP en este plan.

## Restricciones actuales

La ruta de procesamiento actual de Discord todavía depende de algunos objetos de tiempo de ejecución activos que no deben permanecer dentro de la carga útil del trabajo a largo plazo:

- Carbon `Client`
- formas de eventos de Discord sin procesar
- mapa de historial de guild en memoria
- retornos de llamada del administrador de enlace de hilos
- estado de escritura y flujo de borradores en vivo

Ya movimos la ejecución a una cola de trabajadores, pero el límite de normalización aún está incompleto. En este momento, el trabajador es "ejecutar más tarde en el mismo proceso con algunos de los mismos objetos en vivo", no un límite de trabajo completamente basado en datos.

## Arquitectura objetivo

### 1. Fase de escucha

`DiscordMessageListener` sigue siendo el punto de entrada, pero su trabajo pasa a ser:

- ejecutar comprobaciones previas y de política
- normalizar la entrada aceptada en un `DiscordInboundJob` serializable
- poner en cola el trabajo en una cola asíncrona por sesión o por canal
- volver inmediatamente a Carbon una vez que la puesta en cola tenga éxito

El escucha ya no debe ser el propietario del tiempo de vida del turno LLM de extremo a extremo.

### 2. Carga útil del trabajo normalizada

Introducir un descriptor de trabajo serializable que contenga solo los datos necesarios para ejecutar el turno más adelante.

Forma mínima:

- identidad de ruta
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- identidad de entrega
  - id del canal de destino
  - id del mensaje objetivo de respuesta
  - id del hilo si está presente
- identidad del remitente
  - id, etiqueta, nombre de usuario y etiqueta del remitente
- contexto del canal
  - id de guild
  - nombre o slug del canal
  - metadatos del hilo
  - anulación del prompt del sistema resuelto
- cuerpo del mensaje normalizado
  - texto base
  - texto efectivo del mensaje
  - descriptores de adjuntos o referencias a medios resueltos
- decisiones de filtrado
  - resultado del requisito de mención
  - resultado de la autorización del comando
  - metadatos de la sesión o agente enlazado, si corresponde

El payload del trabajo no debe contener objetos Carbon en vivo ni cierres mutables.

Estado de la implementación actual:

- parcialmente hecho
- `src/discord/monitor/inbound-job.ts` existe y define la entrega al trabajador
- el payload todavía contiene contexto de ejecución de Discord en vivo y debería reducirse más

### 3. Etapa del trabajador

Añadir un ejecutor de trabajador específico para Discord responsable de:

- reconstruir el contexto del turno desde `DiscordInboundJob`
- cargar medios y cualquier metadato adicional del canal necesario para la ejecución
- despachar el turno del agente
- entregar los payloads de respuesta finales
- actualizar el estado y los diagnósticos

Ubicación recomendada:

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. Modelo de ordenamiento

El ordenamiento debe permanecer equivalente al actual para un límite de ruta determinado.

Clave recomendada:

- usar la misma lógica de clave de cola que `resolveDiscordRunQueueKey(...)`

Esto preserva el comportamiento existente:

- una conversación de agente enlazada no se intercala consigo misma
- diferentes canales de Discord aún pueden progresar de forma independiente

### 5. Modelo de tiempo de espera

Después de la transición, hay dos clases separadas de tiempo de espera:

- tiempo de espera del escucha
  - solo cubre la normalización y la puesta en cola
  - debe ser corto
- tiempo de espera de ejecución
  - opcional, propiedad del trabajador, explícito y visible para el usuario
  - no debe heredarse accidentalmente de la configuración del escucha de Carbon

Esto elimina el acoplamiento accidental actual entre "el escucha de la puerta de enlace de Discord se mantuvo vivo" y "la ejecución del agente está saludable".

## Fases de implementación recomendadas

### Fase 1: límite de normalización

- Estado: implementado parcialmente
- Hecho:
  - extracción de `buildDiscordInboundJob(...)`
  - añadidas pruebas de entrega al trabajador
- Pendiente:
  - hacer que `DiscordInboundJob` sea solo datos planos
  - mover las dependencias de tiempo de ejecución en vivo a servicios propiedad del trabajador en lugar del payload por trabajo
  - dejar de reconstruir el contexto del proceso cosiendo referencias vivas del escucha de vuelta al trabajo

### Fase 2: cola de trabajadores en memoria

- Estado: implementado
- Hecho:
  - añadido `DiscordInboundWorkerQueue` claveado por la clave de cola de ejecución resuelta
  - el escucha pone trabajos en cola en lugar de esperar directamente `processDiscordMessage(...)`
  - el trabajador ejecuta trabajos en proceso, solo en memoria

Este es el primer cambio funcional.

### Fase 3: división de procesos

- Estado: no iniciado
- Mover la propiedad de entrega, escritura y transmisión de borradores detrás de adaptadores orientados al trabajador.
- Reemplazar el uso directo del contexto de preverificación en vivo con la reconstrucción del contexto del trabajador.
- Mantener `processDiscordMessage(...)` temporalmente como fachada si es necesario, luego dividirlo.

### Fase 4: semántica de comandos

- Estado: no iniciado
  Asegurarse de que los comandos nativos de Discord aún se comporten correctamente cuando el trabajo está en cola:

- `stop`
- `new`
- `reset`
- cualquier comando futuro de control de sesión

La cola de trabajadores debe exponer suficiente estado de ejecución para que los comandos apunten al turno activo o en cola.

### Fase 5: observabilidad y experiencia del operador

- Estado: no iniciado
- emitir profundidad de la cola y recuentos de trabajadores activos al estado del monitor
- registrar hora de puesta en cola, hora de inicio, hora de finalización, y motivo de tiempo de espera o cancelación
- exponer claramente en los registros los tiempos de espera o fallos de entrega propiedad del trabajador

### Fase 6: seguimiento opcional de durabilidad

- Estado: no iniciado
  Solo después de que la versión en memoria sea estable:

- decidir si los trabajos en cola de Discord deben sobrevivir al reinicio de la puerta de enlace
- si es así, persistir descriptores de trabajo y puntos de control de entrega
- si no, documentar el límite explícito en memoria

Esto debería ser un seguimiento separado a menos que se requiera la recuperación tras el reinicio para completar.

## Impacto en archivos

Archivos principales actuales:

- `src/discord/monitor/listeners.ts`
- `src/discord/monitor/message-handler.ts`
- `src/discord/monitor/message-handler.preflight.ts`
- `src/discord/monitor/message-handler.process.ts`
- `src/discord/monitor/status.ts`

Archivos de trabajador actuales:

- `src/discord/monitor/inbound-job.ts`
- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.test.ts`
- `src/discord/monitor/message-handler.queue.test.ts`

Próximos puntos de contacto probables:

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## Siguiente paso ahora

El siguiente paso es hacer que el límite del trabajador sea real en lugar de parcial.

Haz esto a continuación:

1. Mover las dependencias de tiempo de ejecución en vivo fuera de `DiscordInboundJob`
2. Mantener esas dependencias en la instancia del trabajador de Discord en su lugar
3. Reducir los trabajos en cola a datos específicos de Discord sin procesar:
   - identidad de la ruta
   - destino de entrega
   - información del remitente
   - instantánea del mensaje normalizado
   - decisiones de bloqueo y vinculación
4. Reconstruir el contexto de ejecución del trabajador a partir de esos datos sin procesar dentro del trabajador

En la práctica, eso significa:

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- otros identificadores mutables solo de tiempo de ejecución

deberían dejar de residir en cada trabajo en cola y, en su lugar, residir en el propio trabajador o detrás de adaptadores propiedad del trabajador.

Después de que eso se implemente, el siguiente seguimiento debería ser la limpieza del estado de los comandos para `stop`, `new` y `reset`.

## Plan de pruebas

Mantener la cobertura existente de reproducibilidad de tiempo de espera en:

- `src/discord/monitor/message-handler.queue.test.ts`

Añadir nuevas pruebas para:

1. el listener regresa después de poner en cola sin esperar a que se complete todo el turno
2. se conserva el ordenamiento por ruta
3. diferentes canales aún se ejecutan simultáneamente
4. las respuestas se entregan al destino del mensaje original
5. `stop` cancela la ejecución activa propiedad del trabajador
6. el fallo del trabajador produce diagnósticos visibles sin bloquear trabajos posteriores
7. los canales de Discord vinculados a ACP aún se enrutan correctamente bajo la ejecución del trabajador

## Riesgos y mitigaciones

- Riesgo: la semántica de los comandos se desvía del comportamiento síncrono actual
  Mitigación: implementar la canalización del estado de los comandos en el mismo cambio, no más tarde

- Riesgo: la entrega de respuestas pierde el contexto del hilo o de respuesta a
  Mitigación: hacer que la identidad de entrega sea de primera clase en `DiscordInboundJob`

- Riesgo: envíos duplicados durante reintentos o reinicios de cola
  Mitigación: mantener el primer paso solo en memoria, o agregar idempotencia de entrega explícita antes de la persistencia

- Riesgo: `message-handler.process.ts` se vuelve más difícil de razonar durante la migración
  Mitigación: dividir en ayudantes de normalización, ejecución y entrega antes o durante el cambio del trabajador

## Criterios de aceptación

El plan está completo cuando:

1. El tiempo de espera del listener de Discord ya no aborta los turnos de larga duración sanos.
2. La vida útil del listener y la vida útil del turno del agente son conceptos separados en el código.
3. Se conserva el ordenamiento existente por sesión.
4. Los canales de Discord vinculados a ACP funcionan a través de la misma ruta del trabajador.
5. `stop` apunta a la ejecución propiedad del trabajador en lugar de a la pila de llamadas antigua propiedad del escuchador.
6. Los tiempos de espera y los fallos de entrega se convierten en resultados explícitos del trabajador, no en caídas silenciosas del escuchador.

## Estrategia de aterrizaje restante

Terminar esto en PRs de seguimiento:

1. hacer que `DiscordInboundJob` sea solo de datos simples y mover las referencias de tiempo de ejecución en vivo al trabajador
2. limpiar la propiedad del estado de los comandos para `stop`, `new` y `reset`
3. agregar observabilidad del trabajador y estado del operador
4. decidir si se necesita durabilidad o documentar explícitamente el límite en memoria

Esto sigue siendo un seguimiento acotado si se mantiene solo para Discord y si continuamos evitando una abstracción de trabajador multicanal prematura.

import en from "/components/footer/en.mdx";

<en />
