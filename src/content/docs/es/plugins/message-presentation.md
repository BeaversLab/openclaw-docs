---
title: "Presentación de mensajes"
summary: "Tarjetas de mensaje semánticas, botones, selecciones, texto de reserva y sugerencias de entrega para complementos de canal"
read_when:
  - Adding or modifying message card, button, or select rendering
  - Building a channel plugin that supports rich outbound messages
  - Changing message tool presentation or delivery capabilities
  - Debugging provider-specific card/block/component rendering regressions
---

# Presentación de mensajes

La presentación de mensajes es el contrato compartido de OpenClaw para la interfaz de usuario de chat saliente enriquecido.
Permite a los agentes, comandos de CLI, flujos de aprobación y complementos describir la intención del mensaje
una sola vez, mientras que cada complemento de canal representa la mejor forma nativa que pueda.

Use la presentación para una interfaz de usuario de mensaje portátil:

- secciones de texto
- texto de contexto/pie de página pequeño
- divisores
- botones
- menús de selección
- título y tono de la tarjeta

No agregue nuevos campos nativos del proveedor como Discord `components`, Slack
`blocks`, Telegram `buttons`, Teams `card`, o Feishu `card` a la herramienta de
mensaje compartida. Esos son resultados de renderizado propiedad del complemento del canal.

## Contrato

Los autores de complementos importan el contrato público desde:

```ts
import type { MessagePresentation, ReplyPayloadDelivery } from "openclaw/plugin-sdk/interactive-runtime";
```

Forma:

```ts
type MessagePresentation = {
  title?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  blocks: MessagePresentationBlock[];
};

type MessagePresentationBlock = { type: "text"; text: string } | { type: "context"; text: string } | { type: "divider" } | { type: "buttons"; buttons: MessagePresentationButton[] } | { type: "select"; placeholder?: string; options: MessagePresentationOption[] };

type MessagePresentationButton = {
  label: string;
  value?: string;
  url?: string;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  value: string;
};

type ReplyPayloadDelivery = {
  pin?:
    | boolean
    | {
        enabled: boolean;
        notify?: boolean;
        required?: boolean;
      };
};
```

Semántica de botones:

- `value` es un valor de acción de la aplicación enrutado de vuelta a través de la ruta de
  interacción existente del canal cuando el canal admite controles clicables.
- `url` es un botón de enlace. Puede existir sin `value`.
- `label` es obligatorio y también se usa en el texto de reserva.
- `style` es consultivo. Los renderizadores deben asignar estilos no admitidos a un valor predeterminado
  seguro, no fallar el envío.

Semántica de selección:

- `options[].value` es el valor de la aplicación seleccionada.
- `placeholder` es consultivo y puede ser ignorado por canales sin soporte de
  selección nativo.
- Si un canal no admite selecciones, el texto de reserva enumera las etiquetas.

## Ejemplos de productor

Tarjeta simple:

```json
{
  "title": "Deploy approval",
  "tone": "warning",
  "blocks": [
    { "type": "text", "text": "Canary is ready to promote." },
    { "type": "context", "text": "Build 1234, staging passed." },
    {
      "type": "buttons",
      "buttons": [
        { "label": "Approve", "value": "deploy:approve", "style": "success" },
        { "label": "Decline", "value": "deploy:decline", "style": "danger" }
      ]
    }
  ]
}
```

Botón de enlace solo URL:

```json
{
  "blocks": [
    { "type": "text", "text": "Release notes are ready." },
    {
      "type": "buttons",
      "buttons": [{ "label": "Open notes", "url": "https://example.com/release" }]
    }
  ]
}
```

Menú de selección:

```json
{
  "title": "Choose environment",
  "blocks": [
    {
      "type": "select",
      "placeholder": "Environment",
      "options": [
        { "label": "Canary", "value": "env:canary" },
        { "label": "Production", "value": "env:prod" }
      ]
    }
  ]
}
```

Envío de CLI:

```bash
openclaw message send --channel slack \
  --target channel:C123 \
  --message "Deploy approval" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Canary is ready."},{"type":"buttons","buttons":[{"label":"Approve","value":"deploy:approve","style":"success"},{"label":"Decline","value":"deploy:decline","style":"danger"}]}]}'
```

Entrega fijada:

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

Entrega fijada con JSON explícito:

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## Contrato de renderizado

Los complementos de canal declaran soporte de renderizado en su adaptador de salida:

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
  },
  deliveryCapabilities: {
    pin: true,
  },
  renderPresentation({ payload, presentation, ctx }) {
    return renderNativePayload(payload, presentation, ctx);
  },
  async pinDeliveredMessage({ target, messageId, pin }) {
    await pinNativeMessage(target, messageId, { notify: pin.notify === true });
  },
};
```

Los campos de capacidad son booleanos intencionalmente simples. Describen lo que el
renderizador puede hacer interactivo, no todos los límites de la plataforma nativa. Los renderizadores aún
poseen límites específicos de la plataforma, como la cantidad máxima de botones, bloques y
tamaño de tarjeta.

## Flujo de renderizado central

Cuando un `ReplyPayload` o una acción de mensaje incluye `presentation`, el núcleo:

1. Normaliza el payload de presentación.
2. Resuelve el adaptador de salida del canal de destino.
3. Lee `presentationCapabilities`.
4. Llama a `renderPresentation` cuando el adaptador puede renderizar el payload.
5. Recurre a texto conservador cuando el adaptador no está presente o no puede renderizar.
6. Envía el payload resultante a través de la ruta normal de entrega del canal.
7. Aplica metadatos de entrega como `delivery.pin` después del primer
   mensaje enviado con éxito.

El núcleo posee el comportamiento de respaldo para que los productores puedan mantenerse agnósticos al canal. Los complementos
del canal son dueños de la renderización nativa y el manejo de interacciones.

## Reglas de degradación

La presentación debe ser segura de enviar en canales limitados.

El texto de respaldo incluye:

- `title` como la primera línea
- bloques `text` como párrafos normales
- bloques `context` como líneas de contexto compactas
- bloques `divider` como un separador visual
- etiquetas de botones, incluyendo URLs para botones de enlace
- etiquetas de opciones de selección

Los controles nativos no compatibles deben degradarse en lugar de fallar todo el envío.
Ejemplos:

- Telegram con botones en línea deshabilitados envía el respaldo de texto.
- Un canal sin soporte de selección enumera las opciones de selección como texto.
- Un botón de solo URL se convierte en un botón de enlace nativo o en una línea de URL de respaldo.
- Los fallos de fijación opcionales no fallan el mensaje entregado.

La excepción principal es `delivery.pin.required: true`; si se solicita la fijación como
obligatoria y el canal no puede fijar el mensaje enviado, la entrega reporta un fallo.

## Asignación de proveedor

Renderers incluidos actualmente:

| Canal           | Destino de renderizado nativo             | Notas                                                                                                                                                                             |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | Componentes y contenedores de componentes | Conserva el `channelData.discord.components` heredado para productores de payload nativos del proveedor existentes, pero los nuevos envíos compartidos deben usar `presentation`. |
| Slack           | Block Kit                                 | Conserva el `channelData.slack.blocks` heredado para productores de payload nativos del proveedor existentes, pero los nuevos envíos compartidos deben usar `presentation`.       |
| Telegram        | Texto más teclados en línea               | Los botones/selecciones requieren capacidad de botón en línea para la superficie de destino; de lo contrario, se usa el respaldo de texto.                                        |
| Mattermost      | Texto más accesorios interactivos         | Otros bloques se degradan a texto.                                                                                                                                                |
| Microsoft Teams | Adaptive Cards                            | Se incluye texto `message` plano con la tarjeta cuando se proporcionan ambos.                                                                                                     |
| Feishu          | Tarjetas interactivas                     | El encabezado de la tarjeta puede usar `title`; el cuerpo evita duplicar ese título.                                                                                              |
| Canales simples | Respaldo de texto                         | Los canales sin renderizador todavía obtienen una salida legible.                                                                                                                 |

La compatibilidad con la carga útil nativa del proveedor es una facilidad de transición para los
productores de respuesta existentes. No es una razón para agregar nuevos campos nativos compartidos.

## Presentación frente a InteractiveReply

`InteractiveReply` es el subconjunto interno más antiguo utilizado por los asistentes de aprobación e
interacción. Soporta:

- texto
- botones
- selecciones

`MessagePresentation` es el contrato de envío compartido canónico. Agrega:

- título
- tono
- contexto
- divisor
- Botones solo de URL
- metadatos de entrega genéricos a través de `ReplyPayload.delivery`

Use los asistentes de `openclaw/plugin-sdk/interactive-runtime` al conectar código
antiguo:

```ts
import { interactiveReplyToPresentation, normalizeMessagePresentation, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

El código nuevo debe aceptar o producir `MessagePresentation` directamente.

## Pin de entrega

Fijar es un comportamiento de entrega, no una presentación. Use `delivery.pin` en lugar de
campos nativos del proveedor como `channelData.telegram.pin`.

Semántica:

- `pin: true` fija el primer mensaje entregado con éxito.
- `pin.notify` tiene como valor predeterminado `false`.
- `pin.required` tiene como valor predeterminado `false`.
- Los fallos de fijación opcionales se degradan y dejan el mensaje enviado intacto.
- Los fallos de fijación obligatorios fallan la entrega.
- Los mensajes fragmentados fijan el primer fragmento entregado, no el fragmento final.

Las acciones de mensaje manuales `pin`, `unpin` y `pins` todavía existen para mensajes
existentes donde el proveedor soporta esas operaciones.

## Lista de verificación para el autor del complemento

- Declare `presentation` de `describeMessageTool(...)` cuando el canal pueda
  renderizar o degradar de forma segura la presentación semántica.
- Agregue `presentationCapabilities` al adaptador de salida en tiempo de ejecución.
- Implemente `renderPresentation` en el código en tiempo de ejecución, no en el código de configuración
  del complemento del plano de control.
- Mantén las bibliotecas de interfaz de usuario nativas fuera de las rutas de configuración/calentamiento.
- Conserva los límites de la plataforma en el renderizador y en las pruebas.
- Añade pruebas de reserva para botones no compatibles, selecciones, botones de URL, duplicación de título/texto
  y envíos mixtos de `message` más `presentation`.
- Añade soporte de anclaje de entrega a través de `deliveryCapabilities.pin` y
  `pinDeliveredMessage` solo cuando el proveedor puede anclar el ID del mensaje enviado.
- No expongas nuevos campos de tarjeta/bloque/componente/botón nativos del proveedor a través
  del esquema de acción de mensaje compartido.

## Documentos Relacionados

- [Message CLI](/es/cli/message)
- [Plugin SDK Overview](/es/plugins/sdk-overview)
- [Plugin Architecture](/es/plugins/architecture#message-tool-schemas)
- [Channel Presentation Refactor Plan](/es/plan/ui-channels)
