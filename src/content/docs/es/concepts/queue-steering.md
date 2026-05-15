---
summary: "Cómo la dirección de ejecución activa pone en cola los mensajes en los límites de tiempo de ejecución"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steer, queue, collect, and followup modes
title: "Cola de dirección"
---

Cuando llega un mensaje mientras una ejecución de sesión ya está transmitiendo, OpenClaw puede
enviar ese mensaje al tiempo de ejecución activo en lugar de iniciar otra ejecución para
la misma sesión. Los modos públicos son neutrales al tiempo de ejecución; Pi y el arnés nativo del servidor de aplicaciones Codex
implementan los detalles de entrega de manera diferente.

## Límite de tiempo de ejecución

La dirección no interrumpe una llamada a herramienta que ya se está ejecutando. Pi busca
mensajes de dirección en cola en los límites del modelo:

1. El asistente solicita llamadas a herramientas.
2. Pi ejecuta el lote de llamadas a herramientas del mensaje del asistente actual.
3. Pi emite el evento de fin de turno.
4. Pi drena los mensajes de dirección en cola.
5. Pi agrega esos mensajes como mensajes de usuario antes de la siguiente llamada al LLM.

Esto mantiene los resultados de las herramientas emparejados con el mensaje del asistente que los solicitó,
y luego permite que la siguiente llamada al modelo vea la última entrada del usuario.

El arnés nativo del servidor de aplicaciones Codex expone `turn/steer` en lugar de la
cola de dirección interna de Pi. OpenClaw adapta los mismos modos allí:

- `steer` agrupa los mensajes en cola durante la ventana silenciosa configurada y luego envía una
  única solicitud `turn/steer` con toda la entrada del usuario recopilada en orden de llegada.
- `queue` mantiene la forma serializada heredada mediante el envío de solicitudes `turn/steer`
  separadas.
- `followup`, `collect`, `steer-backlog` y `interrupt` mantienen el comportamiento de
  cola propiedad de OpenClaw alrededor del turno activo de Codex.

Los turnos de revisión de Codex y compactación manual rechazan la dirección del mismo turno. Cuando un
tiempo de ejecución no puede aceptar dirección, OpenClaw recurre a la cola de seguimiento donde
ese modo lo permite.

Esta página explica la dirección en modo cola para los mensajes entrantes normales. Para el
comando explícito `/steer <message>`, consulte [Steer](/es/tools/steer).

## Modos

| Modo            | Comportamiento de ejecución activa                                                                                                      | Comportamiento de seguimiento posterior                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `steer`         | Inyecta todos los mensajes de dirección en cola juntos en el siguiente límite de tiempo de ejecución. Este es el predeterminado.        | Solo recurre a followup cuando steering no está disponible.                                      |
| `queue`         | Steering heredado de uno a la vez. Pi inyecta un mensaje en cola por límite del modelo; Codex envía solicitudes `turn/steer` separadas. | Solo recurre a followup cuando steering no está disponible.                                      |
| `steer-backlog` | Mismo comportamiento de steering de ejecución activa que `steer`.                                                                       | También mantiene el mismo mensaje para un turno de seguimiento posterior.                        |
| `followup`      | No dirige la ejecución actual.                                                                                                          | Ejecuta mensajes en cola más tarde.                                                              |
| `collect`       | No dirige la ejecución actual.                                                                                                          | Combina mensajes en cola compatibles en un turno posterior después de la ventana de antirrebote. |
| `interrupt`     | Aborta la ejecución activa y luego inicia el mensaje más reciente.                                                                      | Ninguno.                                                                                         |

## Ejemplo de ráfaga

Si cuatro usuarios envían mensajes mientras el agente está ejecutando una llamada de herramienta:

- `steer`: el tiempo de ejecución activo recibe los cuatro mensajes en orden de llegada antes
  de su siguiente decisión del modelo. Pi los drena en el siguiente límite del modelo; Codex
  los recibe como un `turn/steer` por lotes.
- `queue`: steering en serie heredado. Pi inyecta un mensaje en cola a la vez;
  Codex recibe solicitudes `turn/steer` separadas.
- `collect`: OpenClaw espera hasta que termine la ejecución activa y luego crea un seguimiento
  con mensajes en cola compatibles después de la ventana de antirrebote.

## Alcance

El steering siempre apunta a la ejecución de la sesión activa actual. No crea una nueva
sesión, cambia la política de herramientas de la ejecución activa ni divide mensajes por remitente. En
los canales multiusuario, las solicitudes entrantes ya incluyen el remitente y el contexto de la ruta, por lo que
la siguiente llamada al modelo puede ver quién envió cada mensaje.

Use `collect` cuando desee que OpenClaw construya un turno de seguimiento posterior que pueda
combinar mensajes compatibles y conservar la política de eliminación de la cola de seguimiento. Use
`queue` solo cuando necesite el comportamiento de steering heredado de uno a la vez.

## Antirrebote

`messages.queue.debounceMs` se aplica a la entrega de seguimiento, incluida `collect`,
`followup`, `steer-backlog` y la alternativa `steer` cuando la dirección activa de la ejecución no está
disponible. Para Pi, la `steer` activa por sí misma no utiliza el temporizador de antirrebote porque
Pi agrupa naturalmente los mensajes hasta el siguiente límite del modelo. Para el arnés
nativo de Codex, OpenClaw utiliza el mismo valor de antirrebote que la ventana de silencio antes
de enviar los `turn/steer` agrupados.

## Relacionado

- [Cola de comandos](/es/concepts/queue)
- [Dirigir (Steer)](/es/tools/steer)
- [Mensajes](/es/concepts/messages)
- [Bucle del agente](/es/concepts/agent-loop)
