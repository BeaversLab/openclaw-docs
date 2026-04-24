---
title: Plan de refactorización de la presentación de canales
summary: Desacoplar la presentación semántica de mensajes de los renderizadores de IU nativos del canal.
read_when:
  - Refactoring channel message UI, interactive payloads, or native channel renderers
  - Changing message tool capabilities, delivery hints, or cross-context markers
  - Debugging Discord Carbon import fanout or channel plugin runtime laziness
---

# Plan de refactorización de la presentación de canales

## Estado

Implementado para el agente compartido, la CLI, la capacidad del complemento y las superficies de entrega saliente:

- `ReplyPayload.presentation` transporta la IU de mensajes semánticos.
- `ReplyPayload.delivery.pin` transporta las solicitudes de anclaje de mensajes enviados.
- Las acciones de mensajes compartidos exponen `presentation`, `delivery` y `pin` en lugar de `components`, `blocks`, `buttons` o `card` nativos del proveedor.
- Core renderiza o degrada automáticamente la presentación a través de capacidades de salida declaradas por el complemento.
- Los renderizadores de Discord, Slack, Telegram, Mattermost, MS Teams y Feishu consumen el contrato genérico.
- El código del plano de control del canal de Discord ya no importa contenedores de IU con respaldo de Carbon.

La documentación canónica ahora reside en [Presentación de mensajes](/es/plugins/message-presentation).
Mantenga este plan como contexto histórico de implementación; actualice la guía canónica
para cambios en el contrato, el renderizador o el comportamiento de reserva.

## Problema

La IU del canal está dividida actualmente en varias superficies incompatibles:

- Core posee un gancho de renderizador entre contextos con forma de Discord a través de `buildCrossContextComponents`.
- El `channel.ts` de Discord puede importar la IU nativa de Carbon a través de `DiscordUiContainer`, lo que introduce dependencias de IU en tiempo de ejecución en el plano de control del complemento del canal.
- El agente y la CLI exponen escotillas de escape de carga útil nativa, como `components` de Discord, `blocks` de Slack, `buttons` de Telegram o Mattermost, y `card` de Teams o Feishu.
- `ReplyPayload.channelData` transporta tanto sugerencias de transporte como sobres de IU nativos.
- Existe el modelo genérico `interactive`, pero es más estrecho que los diseños enriquecidos que ya utilizan Discord, Slack, Teams, Feishu, LINE, Telegram y Mattermost.

Esto hace que Core sea consciente de las formas de la IU nativa, debilita la pereza del tiempo de ejecución del complemento y da a los agentes demasiadas formas específicas del proveedor para expresar la misma intención del mensaje.

## Objetivos

- Core decide la mejor presentación semántica para un mensaje a partir de las capacidades declaradas.
- Las extensiones declaran capacidades y renderizan la presentación semántica en cargas útiles (payloads) nativas del transporte.
- La interfaz de usuario de Control Web permanece separada de la interfaz de usuario nativa del chat.
- Las cargas útiles de canal nativo no se exponen a través de la superficie de mensajes del agente compartido ni de la CLI.
- Las características de presentación no soportadas se degradan automáticamente a la mejor representación de texto.
- El comportamiento de entrega, como fijar un mensaje enviado, es metadatos de entrega genéricos, no presentación.

## Objetivos No Cubiertos

- No hay adaptador (shim) de compatibilidad hacia atrás para `buildCrossContextComponents`.
- No hay salidas de escape (escape hatches) nativas públicas para `components`, `blocks`, `buttons` o `card`.
- No hay importaciones principales de bibliotecas de interfaz de usuario nativas del canal.
- No hay costuras (seams) de SDK específicos del proveedor para canales agrupados.

## Modelo Objetivo

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

Los esquemas del agente externo y de la CLI ahora usan `presentation`; `interactive` permanece como un asistente de análisis/renderizado heredado interno para los productores de respuestas existentes.

## Metadatos de Entrega

Añadir un campo `delivery` propiedad del núcleo para el comportamiento de envío que no es de interfaz de usuario.

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
- `notify` por defecto es `false`.
- `required` por defecto es `false`; los canales no soportados o el fallo al fijar se degradan automáticamente continuando con la entrega.
- Las acciones de mensaje manuales `pin`, `unpin` y `list-pins` permanecen para los mensajes existentes.

El enlace de tema ACP de Telegram actual debería moverse de `channelData.telegram.pin = true` a `delivery.pin = true`.

## Contrato de capacidades de tiempo de ejecución

Añadir ganchos de representación de presentación y entrega al adaptador de salida en tiempo de ejecución, no al complemento del canal del plano de control.

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
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

- Resolver el canal de destino y el adaptador de tiempo de ejecución.
- Solicitar capacidades de presentación.
- Degradar los bloques no compatibles antes de la representación.
- Llamar a `renderPresentation`.
- Si no existe ningún procesador, convertir la presentación a texto alternativo.
- Después de un envío exitoso, llamar a `pinDeliveredMessage` cuando se solicita y se admite `delivery.pin`.

## Asignación de canales

Discord:

- Renderizar `presentation` a componentes v2 y contenedores de Carbon en módulos solo de tiempo de ejecución.
- Mantener los auxiliares de color de acento en módulos ligeros.
- Eliminar las importaciones de `DiscordUiContainer` del código del plano de control del complemento del canal.

Slack:

- Renderizar `presentation` a Block Kit.
- Eliminar la entrada de `blocks` del agente y la CLI.

Telegram:

- Renderizar texto, contexto y divisores como texto.
- Renderizar acciones y selecciones como teclados en línea cuando esté configurado y permitido para la superficie de destino.
- Usar el texto alternativo cuando los botones en línea están deshabilitados.
- Mover la fijación de temas de ACP a `delivery.pin`.

Mattermost:

- Renderizar acciones como botones interactivos donde estén configurados.
- Renderizar otros bloques como texto alternativo.

MS Teams:

- Renderizar `presentation` a Adaptive Cards.
- Mantener acciones manuales de fijar/desfijar/listar-fijados.
- Implementar opcionalmente `pinDeliveredMessage` si la compatibilidad con Graph es confiable para la conversación de destino.

Feishu:

- Renderizar `presentation` a tarjetas interactivas.
- Mantener acciones manuales de fijar/desfijar/listar-fijados.
- Implementar opcionalmente `pinDeliveredMessage` para la fijación de mensajes enviados si el comportamiento de la API es confiable.

LINE:

- Renderizar `presentation` a mensajes Flex o de plantilla donde sea posible.
- Recurre al texto para los bloques no compatibles.
- Eliminar las cargas útiles de la interfaz de usuario de LINE de `channelData`.

Canales simples o limitados:

- Convertir la presentación a texto con formato conservador.

## Pasos de refactorización

1. Volver a aplicar la corrección de la versión de Discord que divide `ui-colors.ts` de la interfaz de usuario respaldada por Carbon y elimina `DiscordUiContainer` de `extensions/discord/src/channel.ts`.
2. Añada `presentation` y `delivery` a `ReplyPayload`, normalización de carga útil (payload) saliente, resúmenes de entrega y cargas útiles de enlace (hooks).
3. Añada esquema `MessagePresentation` y auxiliares de analizador (parser) en una subruta estrecha de SDK/runtime.
4. Reemplace las capacidades de mensaje `buttons`, `cards`, `components` y `blocks` con capacidades de presentación semántica.
5. Añada enlaces (hooks) de adaptador saliente en tiempo de ejecución para el renderizado de presentación y la fijación de entrega.
6. Reemplace la construcción de componentes entre contextos con `buildCrossContextPresentation`.
7. Elimine `src/infra/outbound/channel-adapters.ts` y elimine `buildCrossContextComponents` de los tipos de complementos de canal.
8. Cambie `maybeApplyCrossContextMarker` para adjuntar `presentation` en lugar de parámetros nativos.
9. Actualice las rutas de envío (send paths) de complemento-despacho (plugin-dispatch) para consumir solo presentación semántica y metadatos de entrega.
10. Elimine los parámetros de carga útil (payload) nativos del agente y la CLI: `components`, `blocks`, `buttons` y `card`.
11. Elimine los auxiliares del SDK que crean esquemas de herramientas de mensaje nativos, reemplazándolos con auxiliares de esquema de presentación.
12. Elimine los sobres (envelopes) de interfaz de usuario (UI)/nativos de `channelData`; mantenga solo los metadatos de transporte hasta que se revise cada campo restante.
13. Migre los renderizadores de Discord, Slack, Telegram, Mattermost, MS Teams, Feishu y LINE.
14. Actualice la documentación para la CLI de mensajes, páginas de canales, SDK de complementos y libro de recetas de capacidades.
15. Ejecute el perfilado de expansión de importación (import fanout) para Discord y los puntos de entrada de canales afectados.

Los pasos 1-11 y 13-14 están implementados en esta refactorización para el agente compartido, la CLI, la capacidad del complemento y los contratos del adaptador saliente. El paso 12 sigue siendo una limpieza interna más profunda para los sobres de transporte `channelData` privados del proveedor. El paso 15 sigue siendo una validación de seguimiento si queremos números de expansión de importación cuantificados más allá de la puerta de tipo/prueba.

## Pruebas

Añada o actualice:

- Pruebas de normalización de presentación.
- Pruebas de degradación automática de presentación para bloques no compatibles.
- Pruebas de marcadores entre contextos para el envío de complementos y las rutas principales de entrega.
- Pruebas de matriz de renderizado de canal para Discord, Slack, Telegram, Mattermost, MS Teams, Feishu, LINE y reserva de texto.
- Pruebas de esquema de herramienta de mensajes que demuestran que los campos nativos han desaparecido.
- Pruebas de CLI que demuestran que las banderas nativas han desaparecido.
- Regresión de pereza de importación del punto de entrada de Discord que cubre Carbon.
- Pruebas de anclaje de entrega que cubren Telegram y la reserva genérica.

## Preguntas abiertas

- ¿Se debe implementar `delivery.pin` para Discord, Slack, MS Teams y Feishu en la primera pasada, o solo Telegram primero?
- ¿Debe `delivery` eventualmente absorber los campos existentes como `replyToId`, `replyToCurrent`, `silent` y `audioAsVoice`, o mantenerse enfocado en los comportamientos posteriores al envío?
- ¿Debe la presentación admitir imágenes o referencias a archivos directamente, o los medios deben permanecer separados del diseño de la interfaz de usuario por ahora?
