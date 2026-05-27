---
summary: "Tarjetas de mensajes semánticas, botones, selecciones, texto de reserva e indicaciones de entrega para complementos de canal"
title: "Presentación de mensajes"
read_when:
  - Adding or modifying message card, button, or select rendering
  - Building a channel plugin that supports rich outbound messages
  - Changing message tool presentation or delivery capabilities
  - Debugging provider-specific card/block/component rendering regressions
---

La presentación de mensajes es el contrato compartido de OpenClaw para la interfaz de usuario de chat enriquecido saliente.
Permite que los agentes, comandos de CLI, flujos de aprobación y complementos describan la intención del mensaje
una sola vez, mientras que cada complemento de canal representa la mejor forma nativa que pueda.

Utilice la presentación para una interfaz de usuario de mensaje portable:

- secciones de texto
- texto de contexto/pie de página pequeño
- divisores
- botones
- menús de selección
- título y tono de la tarjeta

No agregue nuevos campos nativos del proveedor, como Discord `components`, Slack
`blocks`, Telegram `buttons`, Teams `card` o Feishu `card` a la herramienta de
mensaje compartida. Esos son resultados del renderizador propiedad del complemento del canal.

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
  webApp?: { url: string };
  /** @deprecated Use webApp. Accepted for legacy JSON payloads only. */
  web_app?: { url: string };
  priority?: number;
  disabled?: boolean;
  reusable?: boolean;
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

- `value` es un valor de acción de la aplicación que se devuelve a través de la ruta de
  interacción existente del canal cuando este admite controles en los que se puede hacer clic.
- `url` es un botón de enlace. Puede existir sin `value`.
- `webApp` describe un botón de aplicación web nativo del canal. Telegram lo representa
  como `web_app` y solo lo admite en chats privados. `web_app` todavía
  se acepta en payloads JSON sueltos por compatibilidad, pero los productores de
  TypeScript deben usar `webApp`.
- `label` es obligatorio y también se usa en el texto de reserva.
- `style` es consultivo. Los renderizadores deben asignar los estilos no admitidos a un valor
  predeterminado seguro, no fallar el envío.
- `priority` es opcional. Cuando un canal anuncia límites de acción y los controles
  deben eliminarse, el núcleo mantiene primero los botones de mayor prioridad y preserva
  el orden original entre los botones de igual prioridad. Cuando todos los controles caben, se conserva
  el orden original.
- `disabled` es opcional. Los canales deben optar por participar con `supportsDisabled`; de lo contrario,
  el núcleo degrada el control deshabilitado a texto de reserva no interactivo.
- `reusable` es opcional. Los canales que admitan devoluciones de llamada nativas reutilizables pueden mantener la acción disponible después de una interacción exitosa. Úselo para acciones repetibles o idempotentes como actualizar, inspeccionar u obtener más detalles; déjelo sin configurar para aprobaciones normales de un solo uso y acciones destructivas.

Semántica de selección:

- `options[].value` es el valor de la aplicación seleccionado.
- `placeholder` es orientativo y puede ser ignorado por canales sin soporte nativo de selección.
- Si un canal no admite selecciones, el texto de reserva enumera las etiquetas.

## Ejemplos de productores

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

Botón de Mini App de Telegram:

```json
{
  "blocks": [
    {
      "type": "buttons",
      "buttons": [{ "label": "Launch", "web_app": { "url": "https://example.com/app" } }]
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

## Contrato del renderizador

Los complementos del canal declaran soporte de renderizado en su adaptador de salida:

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
    limits: {
      actions: {
        maxActions: 25,
        maxActionsPerRow: 5,
        maxRows: 5,
        maxLabelLength: 80,
        maxValueBytes: 100,
        supportsStyles: true,
        supportsDisabled: false,
      },
      selects: {
        maxOptions: 25,
        maxLabelLength: 100,
        maxValueBytes: 100,
      },
      text: {
        maxLength: 2000,
        encoding: "characters",
        markdownDialect: "discord-markdown",
      },
    },
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

Los booleanos de capacidad describen lo que el renderizador puede hacer interactivo. Los `limits` opcionales describen el sobre genérico que el núcleo puede adaptar antes de llamar al renderizador:

```ts
type ChannelPresentationCapabilities = {
  supported?: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  limits?: {
    actions?: {
      maxActions?: number;
      maxActionsPerRow?: number;
      maxRows?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
      supportsStyles?: boolean;
      supportsDisabled?: boolean;
      supportsLayoutHints?: boolean;
    };
    selects?: {
      maxOptions?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
    };
    text?: {
      maxLength?: number;
      encoding?: "characters" | "utf8-bytes" | "utf16-units";
      markdownDialect?: "plain" | "markdown" | "html" | "slack-mrkdwn" | "discord-markdown";
      supportsEdit?: boolean;
    };
  };
};
```

El núcleo aplica límites genéricos a los controles semánticos antes del renderizado. Los renderizadores aún poseen la validación y el recorte final específicos del proveedor para el recuento de bloques nativos, el tamaño de la tarjeta, los límites de URL y las peculiaridades del proveedor que no se pueden expresar en el contrato genérico. Si los límites eliminan cada control de un bloque, el núcleo mantiene las etiquetas como texto de contexto no interactivo para que el mensaje entregado aún tenga un respaldo visible.

## Flujo de renderizado del núcleo

Cuando un `ReplyPayload` o una acción de mensaje incluye `presentation`, el núcleo:

1. Normaliza la carga útil de presentación.
2. Resuelve el adaptador de salida del canal de destino.
3. Lee `presentationCapabilities`.
4. Aplica límites genéricos de capacidad, como el recuento de acciones, la longitud de la etiqueta y el recuento de opciones de selección, cuando el adaptador los anuncia.
5. Llama a `renderPresentation` cuando el adaptador puede renderizar la carga útil.
6. Recurre a texto conservador cuando el adaptador está ausente o no puede renderizar.
7. Envía la carga útil resultante a través de la ruta de entrega normal del canal.
8. Aplica metadatos de entrega como `delivery.pin` después del primer mensaje enviado con éxito.

El núcleo es propietario del comportamiento de reserva para que los productores puedan mantenerse independientes del canal. Los complementos del canal son propietarios del renderizado nativo y el manejo de interacciones.

## Reglas de degradación

La presentación debe ser segura para enviar en canales limitados.

El texto de reserva incluye:

- `title` como la primera línea
- bloques `text` como párrafos normales
- bloques `context` como líneas de contexto compactas
- bloques `divider` como un separador visual
- etiquetas de botones, incluidas las URL para los botones de enlace
- etiquetas de opciones de selección

Los controles nativos no compatibles deben degradarse en lugar de provocar el fallo de todo el envío.
Ejemplos:

- Telegram con los botones en línea desactivados envía el texto de reserva.
- Un canal sin soporte de selección enumera las opciones de selección como texto.
- Un botón de solo URL se convierte en un botón de enlace nativo o en una línea de URL de reserva.
- Los fallos de anclaje opcionales no provocan el fallo del mensaje entregado.

La excepción principal es `delivery.pin.required: true`; si se solicita el anclaje como
obligatorio y el canal no puede anclar el mensaje enviado, la entrega informa de un fallo.

## Asignación de proveedores

Renderizados incluidos actualmente:

| Canal           | Objetivo de renderizado nativo            | Notas                                                                                                                                                                                       |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | Componentes y contenedores de componentes | Conserva el `channelData.discord.components` heredado para los productores de cargas útiles nativas del proveedor existentes, pero los nuevos envíos compartidos deben usar `presentation`. |
| Slack           | Block Kit                                 | Conserva el `channelData.slack.blocks` heredado para los productores de cargas útiles nativas del proveedor existentes, pero los nuevos envíos compartidos deben usar `presentation`.       |
| Telegram        | Texto más teclados en línea               | Los botones/selecciones requieren capacidad de botón en línea para la superficie de destino; de lo contrario, se usa el texto de reserva.                                                   |
| Mattermost      | Texto más elementos interactivos          | Otros bloques se degradan a texto.                                                                                                                                                          |
| Microsoft Teams | Adaptive Cards                            | Se incluye texto plano `message` con la tarjeta cuando se proporcionan ambos.                                                                                                               |
| Feishu          | Tarjetas interactivas                     | El encabezado de la tarjeta puede usar `title`; el cuerpo evita duplicar ese título.                                                                                                        |
| Canales simples | Texto de reserva                          | Los canales sin renderizador siguen obteniendo una salida legible.                                                                                                                          |

La compatibilidad con la carga útil nativa del proveedor es una ayuda de transición para los
productores de respuestas existentes. No es una razón para agregar nuevos campos nativos compartidos.

## Presentación vs InteractiveReply

`InteractiveReply` es el subconjunto interno más antiguo utilizado por los asistentes de aprobación e interacción.
Admite:

- texto
- botones
- selecciones

`MessagePresentation` es el contrato compartido de envío canónico. Añade:

- título
- tono
- contexto
- divisor
- botones solo de URL
- metadatos de entrega genéricos a través de `ReplyPayload.delivery`

Use ayudantes de `openclaw/plugin-sdk/interactive-runtime` al conectar código
antiguo:

```ts
import { adaptMessagePresentationForChannel, applyPresentationActionLimits, interactiveReplyToPresentation, normalizeMessagePresentation, presentationPageSize, presentationToInteractiveControlsReply, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

El código nuevo debe aceptar o producir `MessagePresentation` directamente. Las cargas útiles existentes
de `interactive` son un subconjunto obsoleto de `presentation`; el soporte en tiempo
de ejecución se mantiene para productores antiguos.

Los tipos `InteractiveReply*` heredados y los ayudantes de conversión están marcados
como `@deprecated` en el SDK:

- `InteractiveReply`, `InteractiveReplyBlock`, `InteractiveReplyButton`,
  `InteractiveReplyOption`, `InteractiveReplySelectBlock` y
  `InteractiveReplyTextBlock`
- `normalizeInteractiveReply(...)`
- `hasInteractiveReplyBlocks(...)`
- `interactiveReplyToPresentation(...)`
- `presentationToInteractiveReply(...)`
- `presentationToInteractiveControlsReply(...)`
- `resolveInteractiveTextFallback(...)`
- `reduceInteractiveReply(...)`

`presentationToInteractiveReply(...)` y
`presentationToInteractiveControlsReply(...)` siguen disponibles como puentes de renderizado
para implementaciones de canales heredadas. El código nuevo del productor no debería
llamarlos; envíe `presentation` y deje que la adaptación del núcleo/canal maneje el renderizado.

Los ayudantes de aprobación también tienen reemplazos con prioridad de presentación:

- use `buildApprovalPresentationFromActionDescriptors(...)` en lugar de
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- use `buildApprovalPresentation(...)` en lugar de
  `buildApprovalInteractiveReply(...)`
- use `buildExecApprovalPresentation(...)` en lugar de
  `buildExecApprovalInteractiveReply(...)`

`renderMessagePresentationFallbackText(...)` devuelve una cadena vacía para
los bloques de presentación que no tienen texto de respaldo, como una presentación
solo de divisor. Los transportes que requieren un cuerpo de envío no vacío pueden pasar
`emptyFallback` para optar por un cuerpo mínimo sin cambiar el contrato de respaldo
predeterminado.

## Anclaje de entrega

Fijar es un comportamiento de entrega, no de presentación. Use `delivery.pin` en lugar de
campos nativos del proveedor como `channelData.telegram.pin`.

Semántica:

- `pin: true` fija el primer mensaje entregado con éxito.
- `pin.notify` por defecto es `false`.
- `pin.required` por defecto es `false`.
- Los fallos de anclaje opcionales se degradan y dejan el mensaje enviado intacto.
- Los fallos de anclaje requeridos provocan el fallo de la entrega.
- Los mensajes fragmentados anclan el primer fragmento entregado, no el fragmento final.

Las acciones de mensaje manual `pin`, `unpin` y `pins` todavía existen para mensajes existentes
cuando el proveedor admite esas operaciones.

## Lista de verificación para autores de plugins

- Declare `presentation` de `describeMessageTool(...)` cuando el canal pueda
  renderizar o degradar de forma segura la presentación semántica.
- Añada `presentationCapabilities` al adaptador de salida en tiempo de ejecución.
- Implemente `renderPresentation` en el código en tiempo de ejecución, no en el código de
  configuración del plugin del plano de control.
- Mantenga las librerías de interfaz de usuario nativas fuera de las rutas de configuración/catalogación activas.
- Declare los límites de capacidades genéricas en `presentationCapabilities.limits` cuando
  sean conocidos.
- Conservar los límites finales de la plataforma en el renderizador y en las pruebas.
- Añada pruebas de reserva para botones no admitidos, selecciones, botones de URL, duplicación de título/texto
  y envíos mixtos de `message` más `presentation`.
- Añada soporte de anclaje de entrega a través de `deliveryCapabilities.pin` y
  `pinDeliveredMessage` solo cuando el proveedor pueda anclar el ID del mensaje enviado.
- No exponga nuevos campos nativos de tarjeta/bloque/componente/botón del proveedor a través
  del esquema de acción de mensaje compartido.

## Documentos relacionados

- [CLI de mensajes](/es/cli/message)
- [Descripción general del SDK de plugins](/es/plugins/sdk-overview)
- [Arquitectura de plugins](/es/plugins/architecture-internals#message-tool-schemas)
- [Plan de refactorización de la presentación del canal](/es/plan/ui-channels)
