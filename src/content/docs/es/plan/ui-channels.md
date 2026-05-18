---
summary: Desacoplar la presentación semántica de mensajes de los renderizadores de IU nativos del canal.
title: Plan de refactorización de la presentación del canal
read_when:
  - Refactoring channel message UI, interactive payloads, or native channel renderers
  - Changing message tool capabilities, delivery hints, or cross-context markers
  - Debugging Discord Carbon import fanout or channel plugin runtime laziness
---

## Estado

Implementado para el agente compartido, la CLI, la capacidad del complemento y las superficies de entrega saliente:

- `ReplyPayload.presentation` transporta la IU de mensajes semántica.
- `ReplyPayload.delivery.pin` transporta las solicitudes de fijación de mensajes enviados.
- Las acciones de mensajes compartidos exponen `presentation`, `delivery` y `pin` en lugar de `components`, `blocks`, `buttons` o `card` nativos del proveedor.
- El núcleo renderiza o degrada automáticamente la presentación a través de capacidades de salida declaradas por el complemento.
- Los renderizadores de Discord, Slack, Telegram, Mattermost, MS Teams y Feishu consumen el contrato genérico.
- El código del plano de control del canal de Discord ya no importa contenedores de IU respaldados por Carbon.

La documentación canónica ahora se encuentra en [Message Presentation](/es/plugins/message-presentation).
Mantenga este plan como contexto de implementación histórico; actualice la guía canónica
para cambios en el contrato, el renderizador o el comportamiento de reserva.

## Problema

La IU del canal actualmente está dividida en varias superficies incompatibles:

- El núcleo posee un gancho de renderizado entre contextos con forma de Discord a través de `buildCrossContextComponents`.
- El `channel.ts` de Discord puede importar la IU nativa de Carbon a través de `DiscordUiContainer`, lo que introduce dependencias de IU en tiempo de ejecución en el plano de control del complemento del canal.
- El agente y la CLI exponen salidas de escape de carga útil nativa, como `components` de Discord, `blocks` de Slack, `buttons` de Telegram o Mattermost, y `card` de Teams o Feishu.
- `ReplyPayload.channelData` transporta tanto sugerencias de transporte como sobres de IU nativos.
- Existe el modelo genérico `interactive`, pero es más estrecho que los diseños enriquecidos ya utilizados por Discord, Slack, Teams, Feishu, LINE, Telegram y Mattermost.

Esto hace que el núcleo sea consciente de las formas de la IU nativa, debilita la pereza del tiempo de ejecución del complemento y da a los agentes demasiadas formas específicas del proveedor para expresar la misma intención del mensaje.

## Objetivos

- El núcleo decide la mejor presentación semántica para un mensaje a partir de las capacidades declaradas.
- Las extensiones declaran capacidades y renderizan la presentación semántica en cargas útiles de transporte nativas.
- La interfaz de usuario de Control Web permanece separada de la interfaz de usuario nativa del chat.
- Las cargas útiles del canal nativo no se exponen a través del agente compartido ni de la superficie de mensajes de la CLI.
- Las características de presentación no compatibles se degradan automáticamente a la mejor representación de texto.
- El comportamiento de entrega, como fijar un mensaje enviado, es metadatos de entrega genéricos, no presentación.

## Objetivos no excluidos

- No hay una capa de compatibilidad hacia atrás para `buildCrossContextComponents`.
- No hay salidas de escape nativas públicas para `components`, `blocks`, `buttons` o `card`.
- No hay importaciones principales de librerías de interfaz de usuario nativas del canal.
- No hay costuras de SDK específicas del proveedor para canales agrupados.

## Modelo de destino

Añadir un campo `presentation` propiedad del núcleo a `ReplyPayload`.

```ts
type MessagePresentationTone = "neutral" | "info" | "success" | "warning" | "danger";

type MessagePresentation = {
  tone?: MessagePresentationTone;
  title?: string;
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
```

`interactive` se convierte en un subconjunto de `presentation` durante la migración:

- El bloque de texto `interactive` se asigna a `presentation.blocks[].type = "text"`.
- El bloque de botones `interactive` se asigna a `presentation.blocks[].type = "buttons"`.
- El bloque de selección `interactive` se asigna a `presentation.blocks[].type = "select"`.

Los esquemas del agente externo y de la CLI ahora usan `presentation`; `interactive` sigue siendo un asistente de análisis/representación (parser/rendering) de legado interno para los productores de respuestas existentes.
La API pública orientada al productor trata `interactive` como obsoleta. El soporte
en tiempo de ejecución se mantiene para que los asistentes de aprobación existentes y los complementos antiguos continúen
funcionando mientras el código nuevo emite `presentation`.

## Metadatos de entrega

Añadir un campo `delivery` propiedad del núcleo (core-owned) para el comportamiento de envío que no es de UI.

```ts
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

Semántica:

- `delivery.pin = true` significa fijar el primer mensaje entregado con éxito.
- `notify` se establece de forma predeterminada en `false`.
- `required` se establece de forma predeterminada en `false`; los canales no compatibles o el fallo al fijar se degradan automáticamente continuando con la entrega.
- Las acciones de mensaje manual `pin`, `unpin` y `list-pins` se mantienen para los mensajes existentes.

El enlace actual de temas de ACP de Telegram debería moverse de `channelData.telegram.pin = true` a `delivery.pin = true`.

## Contrato de capacidad en tiempo de ejecución

Añadir hooks de renderizado de presentación y entrega al adaptador de salida en tiempo de ejecución, no al complemento del canal del plano de control.

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
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

type ChannelDeliveryCapabilities = {
  pinSentMessage?: boolean;
};

type ChannelOutboundAdapter = {
  presentationCapabilities?: ChannelPresentationCapabilities;

  renderPresentation?: (params: { payload: ReplyPayload; presentation: MessagePresentation; ctx: ChannelOutboundSendContext }) => ReplyPayload | null;

  deliveryCapabilities?: ChannelDeliveryCapabilities;

  pinDeliveredMessage?: (params: { cfg: OpenClawConfig; accountId?: string | null; to: string; threadId?: string | number | null; messageId: string; notify: boolean }) => Promise<void>;
};
```

Comportamiento principal:

- Resolver el canal de destino y el adaptador en tiempo de ejecución.
- Solicitar capacidades de presentación.
- Degrada los bloques no compatibles y aplica los límites de capacidad genéricos antes de
  renderizar.
- Llamar a `renderPresentation`.
- Si no existe un renderizador, convertir la presentación a texto de respaldo.
- Después de un envío exitoso, llamar a `pinDeliveredMessage` cuando `delivery.pin` se solicita y es compatible.

## Asignación de canales

Discord:

- Renderizar `presentation` a componentes v2 y contenedores de Carbon en módulos solo de tiempo de ejecución.
- Mantener los auxiliares de color de acento en módulos ligeros.
- Eliminar las importaciones de `DiscordUiContainer` del código del plano de control (control-plane) del complemento del canal.

Slack:

- Renderizar `presentation` a Block Kit.
- Eliminar la entrada `blocks` del agente y la CLI.

Telegram:

- Renderizar texto, contexto y divisores como texto.
- Renderizar acciones y selecciones como teclados en línea cuando estén configurados y permitidos para la superficie de destino.
- Usar texto de respaldo cuando los botones en línea están deshabilitados.
- Mover la fijación de temas de ACP a `delivery.pin`.

Mattermost:

- Renderizar acciones como botones interactivos donde estén configurados.
- Renderizar otros bloques como texto de respaldo.

MS Teams:

- Renderizar `presentation` a Adaptive Cards.
- Mantener las acciones manuales de fijar/desanclar/listar fijados.
- Implementar opcionalmente `pinDeliveredMessage` si el soporte de Graph es confiable para la conversación de destino.

Feishu:

- Renderizar `presentation` a tarjetas interactivas.
- Mantener las acciones manuales de fijar/desanclar/listar fijados.
- Opcionalmente, implementa `pinDeliveredMessage` para la fijación de mensajes enviados si el comportamiento de la API es confiable.

LINE:

- Renderiza `presentation` como mensajes Flex o de plantilla cuando sea posible.
- Recurre al texto para bloques no admitidos.
- Elimina los payloads de UI de LINE de `channelData`.

Canales simples o limitados:

- Convertir la presentación a texto con formato conservador.

## Pasos de refactorización

1. Vuelve a aplicar la corrección de la versión de Discord que separa `ui-colors.ts` de la UI respaldada por Carbon y elimina `DiscordUiContainer` de `extensions/discord/src/channel.ts`.
2. Agrega `presentation` y `delivery` a `ReplyPayload`, la normalización de payloads salientes, los resúmenes de entrega y los payloads de hooks.
3. Agrega el esquema `MessagePresentation` y los auxiliares de análisis en una subruta estrecha del SDK/runtime.
4. Reemplaza las capacidades de mensaje `buttons`, `cards`, `components` y `blocks` con capacidades de presentación semántica.
5. Añadir hooks de adaptador de salida en tiempo de ejecución para el renderizado de presentación y la fijación de entrega.
6. Reemplaza la construcción de componentes entre contextos con `buildCrossContextPresentation`.
7. Elimina `src/infra/outbound/channel-adapters.ts` y quita `buildCrossContextComponents` de los tipos de complementos de canal.
8. Cambia `maybeApplyCrossContextMarker` para adjuntar `presentation` en lugar de parámetros nativos.
9. Actualizar las rutas de envío de despacho de complementos para consumir solo metadatos de presentación y entrega semántica.
10. Elimina los parámetros de payload nativos del agente y la CLI: `components`, `blocks`, `buttons` y `card`.
11. Eliminar ayudantes del SDK que crean esquemas de herramientas de mensaje nativas, reemplazándolos con ayudantes de esquema de presentación.
12. Elimina los sobres de UI/nativos de `channelData`; mantén solo los metadatos de transporte hasta que se revise cada campo restante.
13. Migrar los renderizadores de Discord, Slack, Telegram, Mattermost, MS Teams, Feishu y LINE.
14. Actualizar la documentación para la CLI de mensajes, páginas de canales, SDK de complementos y libro de recetas de capacidades.
15. Ejecutar el perfilado de difusión de importación para Discord y los puntos de entrada de canales afectados.

Los pasos 1-11 y 13-14 están implementados en esta refactorización para los contratos del agente compartido, la CLI, la capacidad del complemento y los adaptadores salientes. El paso 12 sigue siendo una limpieza interna más profunda de los sobres de transporte `channelData` privados del proveedor. El paso 15 sigue siendo una validación de seguimiento si queremos números cuantificados de importación/difusión más allá de la puerta de tipos/pruebas.

## Pruebas

Añadir o actualizar:

- Pruebas de normalización de presentación.
- Pruebas de autodegradación de presentación para bloques no compatibles.
- Pruebas de marcadores entre contextos para el despacho de complementos y las rutas de entrega principales.
- Pruebas de matriz de renderizado de canales para Discord, Slack, Telegram, Mattermost, MS Teams, Feishu, LINE y alternativa de texto.
- Pruebas de esquema de herramientas de mensaje que demuestran que los campos nativos han desaparecido.
- Pruebas de CLI que demuestran que las marcas nativas han desaparecido.
- Regresión de pereza de importación del punto de entrada de Discord que cubre Carbon.
- Pruebas de fijación de entrega que cubren Telegram y la alternativa genérica.

## Preguntas abiertas

- ¿Se debe implementar `delivery.pin` para Discord, Slack, MS Teams y Feishu en la primera pasada, o solo Telegram primero?
- ¿Debería `delivery` eventualmente absorber campos existentes como `replyToId`, `replyToCurrent`, `silent` y `audioAsVoice`, o mantenerse enfocado en comportamientos posteriores al envío?
- ¿Debe la presentación admitir imágenes o referencias de archivos directamente, o los medios deben permanecer separados del diseño de la interfaz de usuario por ahora?

## Relacionado

- [Resumen de canales](/es/channels)
- [Presentación de mensajes](/es/plugins/message-presentation)
