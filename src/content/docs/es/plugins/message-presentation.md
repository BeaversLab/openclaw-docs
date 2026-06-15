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

type MessagePresentationAction = { type: "command"; command: string } | { type: "callback"; value: string };

type MessagePresentationButton = {
  label: string;
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
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
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
  value?: string;
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

- `action.type: "command"` ejecuta un comando de barra nativo a través de la ruta de comandos del núcleo. Use esto para botones y menús de comandos integrados.
- `action.type: "callback"` lleva datos opacos del complemento a través de la ruta de interacción del canal. Los complementos del canal no deben reinterpretar los datos de devolución de llamada como comandos de barra.
- `value` es el valor de devolución de llamada opaco heredado. Los nuevos controles deben usar `action` para que los complementos del canal puedan asignar comandos y devoluciones de llamada sin adivinar a partir del texto.
- `url` es un botón de enlace. Puede existir sin `value`.
- `webApp` describe un botón de aplicación web nativo del canal. Telegram representa esto como `web_app` y solo lo admite en chats privados. `web_app` todavía se acepta en cargas JSON sueltas por compatibilidad, pero los productores de TypeScript deben usar `webApp`.
- `label` es obligatorio y también se usa en la reserva de texto.
- `style` es consultivo. Los renderizadores deben asignar estilos no compatibles a un valor predeterminado seguro, no fallar el envío.
- `priority` es opcional. Cuando un canal anuncia límites de acción y se deben eliminar controles, el núcleo mantiene primero los botones de mayor prioridad y preserva el orden original entre los botones de igual prioridad. Cuando todos los controles caben, se conserva el orden de creación.
- `disabled` es opcional. Los canales deben aceptar explícitamente con `supportsDisabled`; de lo contrario, el núcleo degrada el control deshabilitado a texto de reserva no interactivo.
- `reusable` es opcional. Los canales que admiten devoluciones de llamada nativas reutilizables pueden mantener la acción disponible después de una interacción exitosa. Úselo para acciones repetibles o idempotentes como actualizar, inspeccionar o más detalles; déjelo sin configurar para aprobaciones normales de un solo uso y acciones destructivas.

Semántica de selección:

- `options[].action` tiene el mismo significado de comando/devolución de llamada que el botón `action`.
- `options[].value` es el valor de aplicación seleccionado heredado.
- `placeholder` es consultivo y puede ser ignorado por canales sin soporte de selección nativo.
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

Envío CLI:

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

Los booleanos de capacidad describen qué puede hacer interactivo el renderizador. Opcional
`limits` describe el sobre genérico que el núcleo puede adaptar antes de llamar al
renderizador:

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

El núcleo aplica límites genéricos a los controles semánticos antes del renderizado. Los renderizadores
aún poseen la validación y recorte final específicos del proveedor para el recuento de bloques nativos,
tamaño de tarjeta, límites de URL y peculiaridades del proveedor que no pueden expresarse en
el contrato genérico. Si los límites eliminan todos los controles de un bloque, el núcleo mantiene
las etiquetas como texto de contexto no interactivo para que el mensaje entregado aún tenga un
respaldo visible.

## Flujo de renderizado del núcleo

Cuando un `ReplyPayload` o acción de mensaje incluye `presentation`, el núcleo:

1. Normaliza el payload de presentación.
2. Resuelve el adaptador de salida del canal objetivo.
3. Lee `presentationCapabilities`.
4. Aplica límites de capacidad genéricos como el recuento de acciones, la longitud de la etiqueta y el
   recuento de opciones de selección cuando el adaptador los anuncia.
5. Llama a `renderPresentation` cuando el adaptador puede renderizar el payload.
6. Recurre a texto conservador cuando el adaptador está ausente o no puede renderizar.
7. Envía el payload resultante a través de la ruta de entrega normal del canal.
8. Aplica metadatos de entrega como `delivery.pin` después del primer mensaje
   enviado exitosamente.

El núcleo es propietario del comportamiento de reserva para que los productores puedan mantenerse agnósticos al canal. Los
complementos del canal son propietarios del renderizado nativo y el manejo de interacciones.

## Reglas de degradación

La presentación debe ser segura para enviar en canales limitados.

El texto de reserva incluye:

- `title` como la primera línea
- Bloques `text` como párrafos normales
- Bloques `context` como líneas de contexto compactas
- Bloques `divider` como un separador visual
- Etiquetas de botones, incluidas las URL para los botones de enlace
- Etiquetas de opciones de selección

Los controles nativos no admitidos deben degradarse en lugar de fallar todo el envío.
Ejemplos:

- Telegram con los botones en línea desactivados envía el texto de reserva.
- Un canal sin soporte de selección lista las opciones de selección como texto.
- Un botón de solo URL se convierte en un botón de enlace nativo o en una línea de URL de reserva.
- Los fallos de anclaje opcionales no provocan el fallo del mensaje entregado.

La excepción principal es `delivery.pin.required: true`; si se solicita anclar como
obligatorio y el canal no puede anclar el mensaje enviado, la entrega informa de un fallo.

## Asignación de proveedores

Renderizados incluidos actualmente:

| Canal           | Destino de renderizado nativo             | Notas                                                                                                                                                                                |
| --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discord         | Componentes y contenedores de componentes | Conserva el legado `channelData.discord.components` para los productores de payloads nativos del proveedor existentes, pero los nuevos envíos compartidos deben usar `presentation`. |
| Slack           | Block Kit                                 | Conserva el legado `channelData.slack.blocks` para los productores de payloads nativos del proveedor existentes, pero los nuevos envíos compartidos deben usar `presentation`.       |
| Telegram        | Texto más teclados en línea               | Los botones/selecciones requieren capacidad de botón en línea para la superficie de destino; de lo contrario, se usa el texto de reserva.                                            |
| Mattermost      | Texto más props interactivos              | Otros bloques se degradan a texto.                                                                                                                                                   |
| Microsoft Teams | Adaptive Cards                            | El texto plano `message` se incluye con la tarjeta cuando se proporcionan ambos.                                                                                                     |
| Feishu          | Tarjetas interactivas                     | El encabezado de la tarjeta puede usar `title`; el cuerpo evita duplicar ese título.                                                                                                 |
| Canales simples | Texto de reserva                          | Los canales sin renderizador todavía obtienen una salida legible.                                                                                                                    |

La compatibilidad con el payload nativo del proveedor es una ayuda de transición para los
productores de respuesta existentes. No es una razón para agregar nuevos campos nativos compartidos.

## Presentación vs InteractiveReply

`InteractiveReply` es el subconjunto interno más antiguo utilizado por los ayudantes de aprobación e interacción.
Soporta:

- texto
- botones
- selecciones

`MessagePresentation` es el contrato de envío compartido canónico. Agrega:

- título
- tono
- contexto
- divisor
- botones de solo URL
- metadatos de entrega genéricos a través de `ReplyPayload.delivery`

Use ayudantes de `openclaw/plugin-sdk/interactive-runtime` al conectar código
antiguo:

```ts
import { adaptMessagePresentationForChannel, applyPresentationActionLimits, interactiveReplyToPresentation, normalizeMessagePresentation, presentationPageSize, presentationToInteractiveControlsReply, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

El nuevo código debe aceptar o producir `MessagePresentation` directamente. Las cargas útiles `interactive` existentes son un subconjunto obsoleto de `presentation`; el soporte en tiempo de ejecución se mantiene para productores antiguos.

Los tipos `InteractiveReply*` heredados y los asistentes de conversión están marcados como `@deprecated` en el SDK:

- `InteractiveReply`, `InteractiveReplyBlock`, `InteractiveReplyButton`,
  `InteractiveReplyOption`, `InteractiveReplySelectBlock`, y
  `InteractiveReplyTextBlock`
- `normalizeInteractiveReply(...)`
- `hasInteractiveReplyBlocks(...)`
- `interactiveReplyToPresentation(...)`
- `presentationToInteractiveReply(...)`
- `presentationToInteractiveControlsReply(...)`
- `resolveInteractiveTextFallback(...)`
- `reduceInteractiveReply(...)`

`presentationToInteractiveReply(...)` y
`presentationToInteractiveControlsReply(...)` siguen disponibles como puentes de renderizado para implementaciones de canales heredadas. El código de productor nuevo no debe llamarlos; envíe `presentation` y deje que la adaptación del núcleo/canal maneje el renderizado.

Los asistentes de aprobación también tienen reemplazos con prioridad de presentación:

- use `buildApprovalPresentationFromActionDescriptors(...)` en lugar de
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- use `buildApprovalPresentation(...)` en lugar de
  `buildApprovalInteractiveReply(...)`
- use `buildExecApprovalPresentation(...)` en lugar de
  `buildExecApprovalInteractiveReply(...)`

`renderMessagePresentationFallbackText(...)` devuelve una cadena vacía para los bloques de presentación que no tienen alternativa de texto, como una presentación que solo es un divisor. Los transportes que requieren un cuerpo de envío no vacío pueden pasar `emptyFallback` para optar por un cuerpo mínimo sin cambiar el contrato de alternativa predeterminado.

## Anclaje de entrega

Fijar es un comportamiento de entrega, no de presentación. Use `delivery.pin` en lugar de campos nativos del proveedor como `channelData.telegram.pin`.

Semántica:

- `pin: true` fija el primer mensaje entregado con éxito.
- `pin.notify` por defecto es `false`.
- `pin.required` por defecto es `false`.
- Los fallos de anclaje opcionales degradan y dejan el mensaje enviado intacto.
- Los fallos de anclaje requeridos fallan la entrega.
- Los mensajes fragmentados fijan el primer fragmento entregado, no el fragmento final.

Las acciones de mensaje manuales `pin`, `unpin` y `pins` todavía existen para mensajes existentes
donde el proveedor admite esas operaciones.

## Lista de verificación para el autor del complemento

- Declare `presentation` de `describeMessageTool(...)` cuando el canal pueda
  representar o degradar de forma segura la presentación semántica.
- Agregue `presentationCapabilities` al adaptador de salida en tiempo de ejecución.
- Implemente `renderPresentation` en el código en tiempo de ejecución, no en el código de configuración
  del complemento del plano de control.
- Mantenga las bibliotecas de interfaz de usuario nativas fuera de las rutas de configuración/catálogo activas.
- Declare los límites de capacidad genérica en `presentationCapabilities.limits` cuando
  sean conocidos.
- Conserve los límites finales de la plataforma en el renderizador y las pruebas.
- Agregue pruebas de respaldo para botones no compatibles, selecciones, botones de URL, duplicación de
  título/texto y envíos mixtos de `message` más `presentation`.
- Agregue soporte de fijación de entrega a través de `deliveryCapabilities.pin` y
  `pinDeliveredMessage` solo cuando el proveedor pueda fijar el id del mensaje enviado.
- No exponga nuevos campos nativos del proveedor de tarjetas/bloques/componentes/botones a través
  del esquema de acción de mensaje compartido.

## Documentos relacionados

- [CLI de mensajes](/es/cli/message)
- [Descripción general del SDK de complementos](/es/plugins/sdk-overview)
- [Arquitectura de complementos](/es/plugins/architecture-internals#message-tool-schemas)
- [Plan de refactorización de presentación del canal](/es/plan/ui-channels)
