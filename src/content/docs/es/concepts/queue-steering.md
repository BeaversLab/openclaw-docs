---
summary: "Cómo la dirección de ejecución activa pone en cola los mensajes en los límites de tiempo de ejecución"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steering with followup, collect, and interrupt queue modes
title: "Cola de dirección"
---

Cuando llega un mensaje normal mientras una ejecución de sesión ya se está transmitiendo, OpenClaw intenta enviar ese mensaje al tiempo de ejecución activo de forma predeterminada cuando el modo de cola es `steer`. No se requiere ninguna entrada de configuración ni ninguna directiva de cola para ese comportamiento predeterminado. OpenClaw y el arnés nativo del servidor de aplicaciones Codex implementan los detalles de entrega de manera diferente.

## Límite de tiempo de ejecución

La guía no interrumpe una llamada a herramienta que ya se está ejecutando. OpenClaw busca mensajes de guía en cola en los límites del modelo:

1. El asistente solicita llamadas a herramientas.
2. OpenClaw ejecuta el lote de llamadas a herramientas del mensaje del asistente actual.
3. OpenClaw emite el evento de fin de turno.
4. OpenClaw drena los mensajes de guía en cola.
5. OpenClaw agrega esos mensajes como mensajes de usuario antes de la siguiente llamada al LLM.

Esto mantiene los resultados de las herramientas emparejados con el mensaje del asistente que los solicitó,
y luego permite que la siguiente llamada al modelo vea la última entrada del usuario.

El arnés nativo del servidor de aplicaciones Codex expone `turn/steer` en lugar de la cola de guía interna del tiempo de ejecución de OpenClaw. OpenClaw agrupa los mensajes en cola para la ventana de silencio configurada y luego envía una única solicitud `turn/steer` con toda la entrada del usuario recopilada en orden de llegada.

La revisión de Codex y la compactación manual rechazan el direccionamiento del mismo turno. Cuando un
tiempo de ejecución no puede aceptar direccionamiento en el modo `steer`, OpenClaw espera a que la ejecución
activa termine antes de iniciar el mensaje.

Esta página explica el direccionamiento en modo de cola para mensajes entrantes normales cuando el modo
es `steer`. Si el modo es `followup` o `collect`, los mensajes normales no entran
en esta ruta de direccionamiento; esperan hasta que finalice la ejecución activa. Para el comando
explícito `/steer <message>`, consulte [Steer](/es/tools/steer).

## Modos

| Modo        | Comportamiento de ejecución activa                            | Comportamiento posterior                                                                                  |
| ----------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `steer`     | Dirige el mensaje al tiempo de ejecución activo cuando puede. | Espera a que finalice la ejecución activa si el direccionamiento no está disponible.                      |
| `followup`  | No dirige.                                                    | Ejecuta los mensajes en cola más tarde después de que finaliza la ejecución activa.                       |
| `collect`   | No dirige.                                                    | Combina los mensajes en cola compatibles en un solo turno posterior después de la ventana de antirrebote. |
| `interrupt` | Aborta la ejecución activa en lugar de dirigirla.             | Inicia el mensaje más reciente después de abortar.                                                        |

## Ejemplo de ráfaga

Si cuatro usuarios envían mensajes mientras el agente está ejecutando una llamada a una herramienta:

- Con el comportamiento predeterminado, el tiempo de ejecución activo recibe los cuatro mensajes en orden de llegada antes de su próxima decisión del modelo. OpenClaw los drena en el siguiente límite del modelo; Codex los recibe como un único `turn/steer` agrupado.
- Con `/queue collect`, OpenClaw no dirige. Espera hasta que la ejecución activa
  finalice y luego crea un turno de seguimiento con mensajes en cola compatibles después de la
  ventana de anti-rebote.
- Con `/queue interrupt`, OpenClaw anula la ejecución activa e inicia el mensaje más
  reciente en lugar de dirigir.

## Ámbito

La dirección siempre tiene como objetivo la ejecución de la sesión activa actual. No crea una nueva
sesión, cambia la política de herramientas de la ejecución activa ni divide los mensajes por remitente. En
canales multiusuario, los mensajes entrantes ya incluyen el remitente y el contexto de la ruta, por lo que
la siguiente llamada al modelo puede ver quién envió cada mensaje.

Use `followup` o `collect` cuando desee que los mensajes se pongan en cola de forma predeterminada en lugar
de dirigir la ejecución activa. Use `interrupt` cuando el mensaje más reciente deba
reemplazar la ejecución activa.

## Anti-rebote

`messages.queue.debounceMs` se aplica a la entrega de `followup` y `collect` en cola. En el modo `steer` con el arnés nativo de Codex, también establece la ventana de silencio antes de enviar `turn/steer` agrupados. Para OpenClaw, la guía activa en sí no utiliza el temporizador de rebote (debounce) porque OpenClaw agrupa naturalmente los mensajes hasta el siguiente límite del modelo.

## Relacionado

- [Cola de comandos](/es/concepts/queue)
- [Dirigir](/es/tools/steer)
- [Mensajes](/es/concepts/messages)
- [Bucle del agente](/es/concepts/agent-loop)
