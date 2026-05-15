---
summary: "Metadatos de presentación de mensajes de Matrix para clientes compatibles con OpenClaw"
read_when:
  - Building Matrix clients that render OpenClaw rich responses
  - Debugging com.openclaw.presentation event content
title: "Metadatos de presentación de Matrix"
---

OpenClaw puede adjuntar metadatos normalizados `MessagePresentation` a eventos `m.room.message` salientes de Matrix bajo `com.openclaw.presentation`.

Los clientes de Matrix estándar siguen mostrando el texto plano `body`. Los clientes compatibles con OpenClaw pueden leer los metadatos estructurados y mostrar una interfaz de usuario nativa, como botones, selectores, filas de contexto y divisores.

## Contenido del evento

Los metadatos se almacenan en el contenido del evento de Matrix:

```json
{
  "msgtype": "m.text",
  "body": "Select model\n\n- DeepSeek: /model deepseek/deepseek-chat",
  "com.openclaw.presentation": {
    "version": 1,
    "type": "message.presentation",
    "title": "Select model",
    "tone": "info",
    "blocks": [
      {
        "type": "select",
        "placeholder": "Choose model",
        "options": [
          {
            "label": "DeepSeek",
            "value": "/model deepseek/deepseek-chat"
          }
        ]
      }
    ]
  }
}
```

`version` es la versión del esquema de metadatos de presentación de Matrix. `type` es un discriminador estable para clientes compatibles con OpenClaw. Los clientes deben ignorar valores `type` desconocidos, versiones desconocidas que no puedan interpretar de forma segura y tipos de bloques desconocidos.

## Comportamiento de reserva (fallback)

OpenClaw siempre genera un texto de reserva legible en `body`. Los metadatos estructurados son complementarios y no deben ser obligatorios para la interoperabilidad básica de Matrix.

Los clientes no compatibles deben seguir mostrando el texto de reserva. Los clientes compatibles con OpenClaw pueden preferir los metadatos estructurados para su visualización, conservando el texto de reserva para copiar, buscar, notificaciones y accesibilidad.

## Bloques compatibles

El adaptador de salida de Matrix anuncia compatibilidad con:

- `buttons`
- `select`
- `context`
- `divider`

Los clientes deben tratar estos bloques como sugerencias de presentación de mejor esfuerzo. Los campos desconocidos y los tipos de bloques desconocidos deben ignorarse en lugar de provocar que falle la representación completa del mensaje.

## Interacciones

Estos metadatos no añaden semánticas de devolución de llamada (callback) de Matrix. Los valores de las opciones de los botones y los selectores son cargas útiles de interacción de reserva, generalmente comandos de barra o comandos de texto. Un cliente de Matrix que quiera admitir la interacción puede enviar el valor seleccionado de vuelta a la sala como un mensaje normal.

Por ejemplo, un botón con el valor `/model deepseek/deepseek-chat` se puede manejar enviando ese valor como un mensaje de texto cifrado de Matrix en la misma sala.

## Relación con los metadatos de aprobación

`com.openclaw.presentation` es para la presentación general de mensajes enriquecidos.

Los mensajes de aprobación utilizan los metadatos dedicados `com.openclaw.approval` porque las aprobaciones conllevan un estado sensible a la seguridad, decisiones y detalles de ejecución/complemento. Si ambas claves de metadatos están presentes en el mismo evento, los clientes deben dar prioridad al renderizador de aprobación dedicado.

## Mensajes de medios

Cuando una respuesta contiene varias URL de medios, OpenClaw envía un evento de Matrix por cada URL de medios. Los metadatos de presentación se adjuntan solo al primer evento de medios para que los clientes tengan una carga estructurada estable y se eviten los renderizadores duplicados.

Mantenga los metadatos de presentación compactos. El texto grande visible para el usuario debe permanecer en `body` y utilizar la ruta normal de fragmentación de texto de Matrix.
