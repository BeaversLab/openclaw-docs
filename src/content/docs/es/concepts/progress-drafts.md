---
summary: "Progress drafts: one visible work-in-progress message that updates while an agent runs"
read_when:
  - Configuring visible progress updates for long-running chat turns
  - Choosing between partial, block, and progress streaming modes
  - Explaining how OpenClaw updates one channel message while work is in progress
  - Troubleshooting progress drafts, standalone progress messages, or finalization fallback
title: "Borradores de progreso"
---

Los borradores de progreso hacen que las turnos de agente de larga duración cobren vida en el chat sin convertir
la conversación en una pila de respuestas de estado temporales.

Cuando los borradores de progreso están habilitados, OpenClaw crea un mensaje de trabajo en progreso visible
solo después de que el turno demuestra que está realizando un trabajo real, lo actualiza mientras el
agente lee, planifica, llama a herramientas o espera la aprobación, y luego convierte ese borradero
en la respuesta final cuando el canal puede hacerlo de manera segura.

```text
Shelling...
📖 from docs/concepts/progress-drafts.md
🔎 Web Search: for "discord edit message"
🛠️ Bash: run tests
```

Use los borradores de progreso cuando desee un mensaje de estado ordenado durante el trabajo intensivo en herramientas
y la respuesta final cuando el turno haya terminado.

## Inicio rápido

Habilite los borradores de progreso por canal con `streaming.mode: "progress"`:

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
      },
    },
  },
}
```

Eso suele ser suficiente. OpenClaw elegirá una etiqueta automática de una palabra, esperará
hasta que el trabajo dure al menos cinco segundos o emita un segundo evento de trabajo, añadirá líneas de progreso
compactas mientras ocurre trabajo útil y suprimirá el progreso independiente duplicado
para ese turno.

## Lo que ven los usuarios

Un borrador de progreso tiene dos partes:

| Parte              | Propósito                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Etiqueta           | Una línea corta de inicio/estado como `Working` o `Shelling`.                                                                           |
| Líneas de progreso | Actualizaciones de ejecución compactas que utilizan los mismos iconos de herramienta y formateador de detalles que la salida detallada. |

La etiqueta aparece después de que el agente inicia un trabajo significativo y permanece ocupado
durante cinco segundos o emite un segundo evento de trabajo. Es parte de la lista de líneas de
progreso continuo, por lo que el estado de inicio se desplaza una vez que aparece suficiente trabajo concreto.
Las respuestas de solo texto plano no muestran un borrador de progreso. Las líneas de progreso se agregan
solo cuando el agente emite actualizaciones de trabajo útiles, por ejemplo `🛠️ Bash: run tests`,
`🔎 Web Search: for "discord edit message"` o `✍️ Write: to /tmp/file`.
De forma predeterminada, utilizan el mismo modo de explicación compacta que `/verbose`; configure
`agents.defaults.toolProgressDetail: "raw"` cuando esté depurando y también desee que se agreguen
comandos/detalles sin procesar.
La respuesta final reemplaza el borrador cuando es posible; de lo contrario,
OpenClaw envía la respuesta final normalmente y limpia o deja de actualizar el
borrador de acuerdo con el transporte del canal.

## Elegir un modo

`channels.<channel>.streaming.mode` controla el comportamiento visible en curso:

| Modo       | Mejor para                                            | Lo que aparece en el chat                                         |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| `off`      | Canales silenciosos                                   | Solo la respuesta final.                                          |
| `partial`  | Ver aparecer el texto de la respuesta                 | Un borrador editado con el texto de respuesta más reciente.       |
| `block`    | Fragmentos de vista previa de respuesta más grandes   | Una vista previa actualizada o añadida en fragmentos más grandes. |
| `progress` | Turnos intensivos en herramientas o de larga duración | Un borrador de estado y luego la respuesta final.                 |

Elija `progress` cuando a los usuarios les importe más "qué está sucediendo" que ver
el texto de la respuesta fluir token por token.

Elija `partial` cuando la respuesta en sí sea la señal de progreso.

Elija `block` cuando desee actualizaciones de vista previa del borrador en fragmentos de texto más grandes. En
Discord y Telegram, `streaming.mode: "block"` sigue siendo transmisión de vista previa, no
entrega en bloque normal. Use `streaming.block.enabled` o el legado
`blockStreaming` cuando desee respuestas de bloque normales.

## Configurar etiquetas

Las etiquetas de progreso se encuentran en `channels.<channel>.streaming.progress`.

La etiqueta predeterminada es `auto`, la cual elige del grupo de etiquetas de una sola palabra integradas en OpenClaw:

```text
Working
Shelling
Scuttling
Clawing
Pinching
Molting
Bubbling
Tiding
Reefing
Cracking
Sifting
Brining
Nautiling
Krilling
Barnacling
Lobstering
Tidepooling
Pearling
Snapping
Surfacing
```

Usar una etiqueta fija:

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "Investigating",
        },
      },
    },
  },
}
```

Usar su propio grupo de etiquetas automáticas:

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          labels: ["Checking", "Reading", "Testing", "Finishing"],
        },
      },
    },
  },
}
```

Ocultar la etiqueta y mostrar solo las líneas de progreso:

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: false,
        },
      },
    },
  },
}
```

## Controlar las líneas de progreso

Las líneas de progreso están habilitadas de forma predeterminada en el modo de progreso. Provienen de eventos de
ejecución reales: inicios de herramientas, actualizaciones de elementos, planes de tareas, aprobaciones, resultados de comandos, resúmenes
de parches y actividad de agente similar.

OpenClaw utiliza el mismo formateador para los borradores de progreso y para `/verbose`:

```json5
{
  agents: {
    defaults: {
      toolProgressDetail: "explain", // explain | raw
    },
  },
}
```

`"explain"` es el predeterminado y mantiene los borradores estables con etiquetas concisas como
`🛠️ check JS syntax for /tmp/app.js`. `"raw"` añade el comando/detalle
subyacente cuando está disponible, lo cual es útil durante la depuración pero más ruidoso
en el chat.

Por ejemplo, el mismo comando aparece de manera diferente según el modo de detalle:

| Modo      | Línea de progreso                                              |
| --------- | -------------------------------------------------------------- |
| `explain` | `🛠️ check JS syntax for /tmp/app.js`                           |
| `raw`     | `🛠️ check JS syntax for /tmp/app.js, node --check /tmp/app.js` |

Limitar cuántas líneas permanecen visibles:

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLines: 4,
        },
      },
    },
  },
}
```

Las líneas de progreso se compactan automáticamente para reducir el reflujo de los burbujas de chat mientras se edita el borrador.

De forma predeterminada, OpenClaw trunca las líneas de progreso largas para que las ediciones repetidas de los borradores no
se ajusten de manera diferente en cada actualización. El presupuesto predeterminado por línea es de 120 caracteres.
El texto se corta en un límite de palabras, mientras que los detalles largos, como rutas o comandos sin procesar,
se acortan con puntos suspensivos en el medio para que el sufijo permanezca visible.

Ajustar el presupuesto por línea:

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLineChars: 160,
        },
      },
    },
  },
}
```

Slack puede representar las líneas de progreso como campos estructurados de Block Kit en lugar de
un solo cuerpo de texto:

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          render: "rich",
        },
      },
    },
  },
}
```

La representación enriquecida mantiene la misma alternativa de texto sin formato, de modo que los canales y clientes que
no admiten la forma enriquecida aún puedan mostrar el texto de progreso compacto.

Mantener el único borrador de progreso pero ocultar las líneas de herramientas y tareas:

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          toolProgress: false,
        },
      },
    },
  },
}
```

Con `toolProgress: false`, OpenClaw sigue suprimiendo los antiguos mensajes independientes
de progreso de herramientas para ese turno. El canal se mantiene visualmente silencioso hasta la
respuesta final, excepto por la etiqueta si se ha configurado una.

## Comportamiento del canal

Cada canal utiliza el transporte más limpio que admite:

| Canal           | Transporte de progreso                                 | Notas                                                                                                           |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Discord         | Enviar un mensaje y luego editarlo.                    | Las ediciones finales del texto se realizan en su lugar cuando caben en un solo mensaje de vista previa seguro. |
| Matrix          | Enviar un evento y luego editarlo.                     | La configuración de transmisión a nivel de cuenta controla los borradores a nivel de cuenta.                    |
| Microsoft Teams | Transmisión nativa de Teams en chats personales.       | `streaming.mode: "block"` se asigna a la entrega de bloques de Teams.                                           |
| Slack           | Transmisión nativa o publicación de borrador editable. | La disponibilidad de hilos afecta si se puede utilizar la transmisión nativa.                                   |
| Telegram        | Enviar un mensaje y luego editarlo.                    | Los borradores visibles antiguos pueden reemplazarse para que las marcas de tiempo finales sigan siendo útiles. |
| Mattermost      | Publicación de borrador editable.                      | La actividad de las herramientas se pliega en la misma publicación de estilo borrador.                          |

Los canales sin soporte de edición segura generalmente recurren a indicadores de escritura o
entrega solo final.

## Finalización

Cuando la respuesta final está lista, OpenClaw intenta mantener el chat limpio:

- Si el borrador puede convertirse con seguridad en la respuesta final, OpenClaw lo edita en su lugar.
- Si el canal utiliza transmisión de progreso nativa, OpenClaw finaliza esa transmisión
  cuando el transporte nativo acepta el texto final.
- Si la respuesta final tiene contenido multimedia, un mensaje de aprobación, un objetivo de respuesta explícito,
  demasiados fragmentos o una edición/envío fallido, OpenClaw envía la respuesta final a través
  de la ruta de entrega normal del canal.

La ruta alternativa es intencional. Es mejor enviar una respuesta final nueva que
perder texto, malencadenar una respuesta o sobrescribir un borrador con una carga que el canal
no pueda representar de forma segura.

## Solución de problemas

**Solo veo la respuesta final.**

Compruebe que `channels.<channel>.streaming.mode` esté configurado en `progress` para la
cuenta o el canal que manejó el mensaje. Algunas rutas de grupo o respuesta de cita pueden
deshabilitar las vistas previas de borrador para un turno cuando el canal no puede editar de forma segura el mensaje
correcto.

**Veo la etiqueta pero no las líneas de herramientas.**

Compruebe `streaming.progress.toolProgress`. Si es `false`, OpenClaw mantiene el
comportamiento de borrador único pero oculta las líneas de progreso de herramientas y tareas.

**Veo un mensaje final nuevo en lugar de un borrador editado.**

Esa es una alternativa de seguridad. Puede ocurrir para respuestas multimedia, respuestas largas,
objetivos de respuesta explícitos, borradores antiguos de Telegram, objetivos de hilo de Slack faltantes,
mensajes de vista previa eliminados o finalización fallida de la transmisión nativa.

**Sigo viendo mensajes de progreso independientes.**

El modo de progreso suprime los mensajes de progreso de herramientas independientes predeterminados cuando un borrador
está activo. Si siguen apareciendo mensajes independientes, verifique que el turno esté usando realmente
el modo de progreso y no `streaming.mode: "off"` o una ruta de canal que
no pueda crear un borrador para ese mensaje.

**Teams se comporta de manera diferente a Discord o Telegram.**

Microsoft Teams utiliza una transmisión nativa en chats personales en lugar del transporte de vista previa genérico
de enviar y editar. Teams también trata `streaming.mode: "block"` como
entrega en bloque de Teams porque no tiene el mismo modo de bloque de vista previa de borrador
utilizado por Discord y Telegram.

## Relacionado

- [Transmisión y fragmentación](/es/concepts/streaming)
- [Mensajes](/es/concepts/messages)
- [Configuración del canal](/es/gateway/config-channels)
- [Discord](/es/channels/discord)
- [Matrix](/es/channels/matrix)
- [Microsoft Teams](/es/channels/msteams)
- [Slack](/es/channels/slack)
- [Telegram](/es/channels/telegram)
