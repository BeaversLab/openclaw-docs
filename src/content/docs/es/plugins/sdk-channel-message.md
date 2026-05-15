---
summary: "API del ciclo de vida de mensajes para complementos de canal, incluyendo envíos duraderos, recibos, vista previa en vivo, política de acuse de recibo de recepción y migración heredada"
title: "API de mensajes del canal"
read_when:
  - You are building or refactoring a messaging channel plugin
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from legacy reply pipeline or inbound reply dispatch helpers
---

Los complementos de canal deben exponer un adaptador `message` desde
`openclaw/plugin-sdk/channel-message`. El adaptador describe el ciclo de vida del mensaje nativo
que la plataforma admite:

```text
receive -> route and record -> agent turn -> durable final send
send -> render batch -> platform I/O -> receipt -> lifecycle side effects
live preview -> final edit or fallback -> receipt
```

Core posee la puesta en cola, la durabilidad, la política de reintentos genérica, los enlaces (hooks), los recibos y la
herramienta compartida `message`. El complemento posee las llamadas nativas de envío/edición/eliminación, la normalización
de objetivos, la enumeración de hilos (threading) de la plataforma, las citas seleccionadas, las banderas de notificación, el estado
de la cuenta y los efectos secundarios específicos de la plataforma.

Utilice esta página junto con [Creación de complementos de canal](/es/plugins/sdk-channel-plugins).

La subruta `channel-message` es intencionalmente lo suficientemente ligera para archivos de inicio
de complemento frecuentes como `channel.ts`: expone contratos de adaptador, pruebas de capacidad,
recibos y fachadas de compatibilidad sin cargar la entrega saliente.
Los asistentes de entrega en tiempo de ejecución están disponibles en
`openclaw/plugin-sdk/channel-message-runtime` para rutas de código de monitoreo/envío que
ya están realizando E/S de mensajes asíncrona.

El nuevo código de envío de canal y complemento debería utilizar los asistentes del ciclo de vida de mensajes de
`openclaw/plugin-sdk/channel-message-runtime`: `sendDurableMessageBatch`,
`withDurableMessageSendContext`, o `deliverInboundReplyWithMessageSendContext`.
El antiguo
asistente `deliverOutboundPayloads(...)` en `openclaw/plugin-sdk/outbound-runtime`
es un sustrato de compatibilidad/tiempo de ejecución en desuso para elementos internos salientes, recuperación,
y adaptadores heredados. No lo utilice para nuevas rutas de envío de canal o complemento.

`sendDurableMessageBatch(...)` devuelve un resultado explícito del ciclo de vida:

- `sent` - se entregó al menos un mensaje visible de la plataforma.
- `suppressed` - ningún mensaje de plataforma debe tratarse como faltante. Las razones
  estables incluyen `cancelled_by_message_sending_hook`,
  `empty_after_message_sending_hook`, `no_visible_payload`,
  `adapter_returned_no_identity`, y el heredado `no_visible_result`.
- `partial_failed` - al menos un mensaje de plataforma se entregó antes de que fallara una carga útil o efecto secundario posterior. El resultado incluye el prefijo del recibo entregado más el error.
- `failed` - no se produjo ningún recibo de plataforma.

Use `payloadOutcomes` cuando un lote mezcle cargas útiles enviadas, suprimidas y fallidas.
No infiera la cancelación del gancho comprobando si la matriz antigua de entrega directa está vacía.

Los despachadores de compatibilidad que aún necesiten el despachador de respuesta almacenada en búfer deben construir opciones de prefijo de respuesta con `createChannelMessageReplyPipeline(...)` de `openclaw/plugin-sdk/channel-message`, y luego llamar al `channel.turn.runPrepared(...)` del tiempo de ejecución. Eso mantiene la grabación de la sesión y el orden de despacho en el ciclo de vida de turno compartido sin agregar otro contenedor de turno público.

## Adaptador mínimo

La mayoría de los nuevos complementos de canal pueden comenzar con un adaptador pequeño:

```typescript
import { defineChannelMessageAdapter, createMessageReceiptFromOutboundResults } from "openclaw/plugin-sdk/channel-message";

export const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  durableFinal: {
    capabilities: {
      text: true,
      replyTo: true,
      thread: true,
      messageSendingHooks: true,
    },
  },
  send: {
    text: async ({ cfg, to, text, accountId, replyToId, threadId, signal }) => {
      const sent = await sendDemoMessage({
        cfg,
        to,
        text,
        accountId: accountId ?? undefined,
        replyToId: replyToId ?? undefined,
        threadId: threadId == null ? undefined : String(threadId),
        signal,
      });

      return {
        receipt: createMessageReceiptFromOutboundResults({
          results: [{ channel: "demo", messageId: sent.id, conversationId: to }],
          kind: "text",
          threadId: threadId == null ? undefined : String(threadId),
          replyToId: replyToId ?? undefined,
        }),
      };
    },
  },
});
```

Luego adjúntelo al complemento del canal:

```typescript
export const demoPlugin = createChatChannelPlugin({
  base: {
    id: "demo",
    message: demoMessageAdapter,
    // other channel plugin fields
  },
});
```

Solo declare capacidades que el adaptador realmente preserve. Cada capacidad declarada debe tener una prueba de contrato.

## Puente de salida

Si el canal ya tiene un adaptador `outbound` compatible, prefiera derivar el adaptador de mensajes en lugar de duplicar el código de envío:

```typescript
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-message";

const demoMessageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound: demoOutboundAdapter,
});
```

El puente convierte los resultados de envío de salida antiguos en valores `MessageReceipt`. El nuevo código debe pasar los recibos de extremo a extremo y solo derivar identificadores heredados en los bordes de compatibilidad con `listMessageReceiptPlatformIds(...)` o `resolveMessageReceiptPrimaryId(...)`.
Si no se suministra ninguna política de recepción, `createChannelMessageAdapterFromOutbound(...)` usa la política de reconocimiento de recepción `manual`. Eso hace que el reconocimiento de plataforma propiedad del complemento sea explícito sin cambiar los canales que reconocen webhooks, sockets o compensaciones de sondeo fuera del contexto de recepción genérico.

## Envíos de herramientas de mensajes

La ruta compartida `message(action="send")` debe usar el mismo ciclo de vida de entrega central que las respuestas finales. Si un canal necesita una forma específica del proveedor para el envío de la herramienta, implemente `actions.prepareSendPayload(...)` en lugar de enviar desde `actions.handleAction(...)`.

`prepareSendPayload(...)` recibe el `ReplyPayload` central normalizado más el
contexto completo de la acción. Devuelva una carga útil con datos específicos del canal en
`payload.channelData.<channel>` y deje que el núcleo llame a `sendMessage(...)`,
el tiempo de ejecución del ciclo de vida de los mensajes, la cola de escritura previa, los enlaces de envío de mensajes,
reintentos, recuperación y limpieza de acknowledgements. El tiempo de ejecución del ciclo de vida puede llamar
`deliverOutboundPayloads(...)` internamente como sustrato de compatibilidad, pero los complementos
del canal no deben llamarlo directamente para un nuevo comportamiento de envío.

Devuelva `null` solo cuando el envío no pueda representarse como una carga útil duradera, por
ejemplo porque contiene una fábrica de componentes no serializable. El núcleo mantendrá
la acción de complemento heredada (fallback) para compatibilidad, pero las nuevas características de envío del canal
deben ser expresables como datos de carga útil duradera.

```typescript
export const demoActions: ChannelMessageActionAdapter = {
  describeMessageTool: () => ({ actions: ["send"], capabilities: ["presentation"] }),
  prepareSendPayload: ({ ctx, payload }) => {
    if (ctx.action !== "send") {
      return null;
    }
    return {
      ...payload,
      channelData: {
        ...payload.channelData,
        demo: {
          ...(payload.channelData?.demo as object | undefined),
          nativeCard: ctx.params.card,
        },
      },
    };
  },
};
```

El adaptador de salida luego lee `payload.channelData.demo` dentro de `sendPayload`.
Esto mantiene la representación específica de la plataforma en el complemento, mientras que el núcleo aún posee
persistencia, reintento, recuperación, enlaces y acknowledgement.

Las cargas útiles `message(action="send")` preparadas y la entrega genérica de respuestas finales utilizan
entrega central con cola de mejor esfuerzo de forma predeterminada. La puesta en cola duradera requerida es
válida solo después de que el núcleo verifique que el canal puede conciliar un envío cuyo resultado es
desconocido después de un bloqueo. Si el adaptador no puede implementar `reconcileUnknownSend`,
mantenga la ruta de envío preparada como mejor esfuerzo; el núcleo aún intentará la cola de escritura previa,
pero la persistencia de la cola o la recuperación de bloqueos inciertos no es parte del
contrato de entrega requerido.

## Capacidades finales duraderas

La entrega final duradera es opcional por efecto secundario. El núcleo solo usará entrega
duradera genérica cuando el adaptador declare cada capacidad necesaria por la
carga útil y las opciones de entrega.

| Capacidad              | Declarar cuando                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `text`                 | El adaptador puede enviar texto y devolver un recibo.                                                                    |
| `media`                | Los envíos de medios devuelven recibos para cada mensaje visible de la plataforma.                                       |
| `payload`              | El adaptador conserva la semántica de carga útil de respuesta enriquecida, no solo texto y una URL de medios.            |
| `replyTo`              | Los objetivos de respuesta nativos llegan a la plataforma.                                                               |
| `thread`               | Los destinos de hilos nativos, temas o hilos de canales llegan a la plataforma.                                          |
| `silent`               | La supresión de notificaciones llega a la plataforma.                                                                    |
| `nativeQuote`          | Los metadatos de la cita seleccionada llegan a la plataforma.                                                            |
| `messageSendingHooks`  | Los enlaces de envío de mensajes principales pueden cancelar o reescribir el contenido antes de la E/S de la plataforma. |
| `batch`                | Los lotes renderizados de varias partes se pueden reproducir como un plan duradero.                                      |
| `reconcileUnknownSend` | El adaptador puede resolver la recuperación de `unknown_after_send` sin reproducción ciega.                              |
| `afterSendSuccess`     | Los efectos secundarios locales del canal posteriores al envío se ejecutan una vez.                                      |
| `afterCommit`          | Los efectos secundarios locales del canal posteriores a la confirmación se ejecutan una vez.                             |

La entrega final de mejor esfuerzo no requiere `reconcileUnknownSend`; utiliza el ciclo de vida compartido cuando el adaptador preserva la semántica visible de la carga útil y recurre a la E/S directa de la plataforma si la persistencia de la cola no está disponible. La entrega final duradera requerida debe exigir explícitamente `reconcileUnknownSend`. Si el adaptador no puede determinar si un envío iniciado/desconocido llegó a la plataforma, no declare esa capacidad; el núcleo rechazará la entrega duradera requerida antes de poner en cola.

Cuando una persona que llama necesita entrega duradera, derive los requisitos en lugar de construir mapas a mano:

```typescript
import { deriveDurableFinalDeliveryRequirements } from "openclaw/plugin-sdk/channel-message";

const requiredCapabilities = deriveDurableFinalDeliveryRequirements({
  payload,
  replyToId,
  threadId,
  silent,
  payloadTransport: true,
  extraCapabilities: {
    nativeQuote: hasSelectedQuote(payload),
  },
});
```

`messageSendingHooks` se requiere de forma predeterminada. Establezca `messageSendingHooks: false` solo para una ruta que intencionalmente no pueda ejecutar enlaces globales de envío de mensajes.

## Contrato de envío duradero

Un envío final duradero tiene semánticas más estrictas que la entrega propiedad del canal heredada:

- Cree la intención duradera antes de la E/S de la plataforma.
- Si la entrega duradera devuelve un resultado manejado, no recurra al envío heredado.
- Trate la cancelación del enlace y los resultados de no envío como terminales.
- Trate `unsupported` solo como un resultado previo a la intención.
- Para la durabilidad requerida, falle antes de la E/S de la plataforma si la cola no puede registrar que el envío de la plataforma ha comenzado.
- Para la entrega final requerida y los envíos requeridos de herramientas de mensajes preparados, realice un verificación previa de `reconcileUnknownSend`; la recuperación debe poder confirmar un mensaje ya enviado o reproducir solo después de que el adaptador demuestre que el envío original no ocurrió.
- Para `best_effort`, los fallos de escritura en la cola pueden recurrir a la E/S directa de la plataforma.
- Reenvíe las señales de aborto a la carga de medios y a los envíos de la plataforma.
- Ejecute los ganchos posteriores a la confirmación después del acuse de recibo de la cola; la alternativa de mejor esfuerzo directo los ejecuta después de una E/S de plataforma exitosa porque no hay una confirmación durable de la cola.
- Devuelva recibos para cada ID de mensaje de plataforma visible.
- Use `reconcileUnknownSend` cuando una plataforma puede verificar si un envío incierto ya llegó al usuario.

Este contrato evita envíos duplicados después de fallas y evita omitir los ganchos de cancelación de envío de mensajes.

## Recibos

`MessageReceipt` es el nuevo registro interno de lo que aceptó la plataforma:

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  sentAt: number;
  raw?: readonly MessageReceiptSourceResult[];
};
```

Use `createMessageReceiptFromOutboundResults(...)` al adaptar un resultado de envío existente. Use `createPreviewMessageReceipt(...)` cuando un mensaje de vista previa en vivo se convierte en el recibo final. Evite agregar nuevos campos `messageIds` locales del propietario. El `ChannelDeliveryResult.messageIds` heredado todavía se produce en los bordes de compatibilidad.

## Vista previa en vivo

Los canales que transmiten vistas previas de borradores o actualizaciones de progreso deben declarar capacidades en vivo:

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  live: {
    capabilities: {
      draftPreview: true,
      previewFinalization: true,
      progressUpdates: true,
      quietFinalization: true,
    },
    finalizer: {
      capabilities: {
        finalEdit: true,
        normalFallback: true,
        discardPending: true,
        previewReceipt: true,
        retainOnAmbiguousFailure: true,
      },
    },
  },
});
```

Use `defineFinalizableLivePreviewAdapter(...)` y `deliverWithFinalizableLivePreviewAdapter(...)` para la finalización en tiempo de ejecución. El finalizador decide si la respuesta final edita la vista previa en su lugar, envía una alternativa normal, descarta el estado de vista previa pendiente, mantiene una edición fallida ambigua sin duplicar el mensaje y devuelve el recibo final.

## Política de acuse de recibo de recepción

Los receptores entrantes que controlan el tiempo de reconocimiento de la plataforma deben declarar la política de recepción:

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  receive: {
    defaultAckPolicy: "after_agent_dispatch",
    supportedAckPolicies: ["after_receive_record", "after_agent_dispatch"],
  },
});
```

Los adaptadores que no declaran la política de recepción tienen por defecto:

```typescript
{
  receive: {
    defaultAckPolicy: "manual",
    supportedAckPolicies: ["manual"],
  },
}
```

Use el valor predeterminado cuando la plataforma no tiene reconocimiento que diferir, ya reconoce antes del procesamiento asíncrono, o necesita semánticas de respuesta específicas del protocolo. Declare una de las políticas por etapas solo cuando el receptor realmente use el contexto de recepción para mover el reconocimiento de la plataforma más tarde.

Políticas:

| Política               | Usar cuando                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `after_receive_record` | La plataforma puede ser reconocida después de que el evento entrante se analice y registre.                     |
| `after_agent_dispatch` | La plataforma debe esperar hasta que el despacho del agente haya sido aceptado.                                 |
| `after_durable_send`   | La plataforma debe esperar hasta que la entrega final tenga una decisión duradera.                              |
| `manual`               | El complemento posee el reconocimiento porque la semántica de la plataforma no coincide con una etapa genérica. |

Use `createMessageReceiveContext(...)` en receptores que difieren el estado de reconocimiento, y
`shouldAckMessageAfterStage(...)` cuando el receptor necesita probar si una
etapa ha cumplido con la política configurada.

## Pruebas de contrato

Las declaraciones de capacidades son parte del contrato del complemento. Respáldelas con pruebas:

```typescript
import { verifyChannelMessageAdapterCapabilityProofs, verifyChannelMessageLiveCapabilityAdapterProofs, verifyChannelMessageLiveFinalizerProofs, verifyChannelMessageReceiveAckPolicyAdapterProofs } from "openclaw/plugin-sdk/channel-message";

it("backs declared message capabilities", async () => {
  await expect(
    verifyChannelMessageAdapterCapabilityProofs({
      adapterName: "demo",
      adapter: demoMessageAdapter,
      proofs: {
        text: async () => {
          const result = await demoMessageAdapter.send!.text!(textCtx);
          expect(result.receipt.platformMessageIds).toContain("msg-1");
        },
        replyTo: async () => {
          await demoMessageAdapter.send!.text!({ ...textCtx, replyToId: "parent-1" });
          expect(sendDemoMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              replyToId: "parent-1",
            }),
          );
        },
        messageSendingHooks: () => {
          expect(demoMessageAdapter.durableFinal!.capabilities!.messageSendingHooks).toBe(true);
        },
      },
    }),
  ).resolves.toContainEqual({ capability: "text", status: "verified" });
});
```

Agregue suites de prueba en vivo y de recepción cuando el adaptador declare esas características. Una
prueba faltante debería fallar la prueba en lugar de ampliar silenciosamente la superficie
durable.

## APIs de compatibilidad obsoletas

Estas APIs siguen siendo importables para la compatibilidad con terceros. No las use para
nuevo código de canal.

| API obsoleta                                 | Reemplazo                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/channel-reply-pipeline` | `openclaw/plugin-sdk/channel-message`                                                                                              |
| `createChannelTurnReplyPipeline(...)`        | `createChannelMessageReplyPipeline(...)` para despachadores de compatibilidad, o un adaptador `message` para nuevo código de canal |
| `buildChannelMessageReplyDispatchBase(...)`  | `createChannelMessageReplyPipeline(...)` más `channel.turn.runPrepared(...)`, o un adaptador `message` para nuevo código de canal  |
| `dispatchChannelMessageReplyWithBase(...)`   | `createChannelMessageReplyPipeline(...)` más `channel.turn.runPrepared(...)`, o un adaptador `message` para nuevo código de canal  |
| `recordChannelMessageReplyDispatch(...)`     | `createChannelMessageReplyPipeline(...)` más `channel.turn.runPrepared(...)`, o un adaptador `message` para nuevo código de canal  |
| `deliverOutboundPayloads(...)`               | `sendDurableMessageBatch(...)` o `deliverInboundReplyWithMessageSendContext(...)` de `channel-message-runtime`                     |
| `deliverDurableInboundReplyPayload(...)`     | `deliverInboundReplyWithMessageSendContext(...)` de `openclaw/plugin-sdk/channel-message-runtime`                                  |
| `dispatchInboundReplyWithBase(...)`          | `createChannelMessageReplyPipeline(...)` más `channel.turn.runPrepared(...)`, o un adaptador `message` para nuevo código de canal  |
| `recordInboundSessionAndDispatchReply(...)`  | `createChannelMessageReplyPipeline(...)` más `channel.turn.runPrepared(...)`, o un adaptador `message` para nuevo código de canal  |
| `resolveChannelSourceReplyDeliveryMode(...)` | `resolveChannelMessageSourceReplyDeliveryMode(...)`                                                                                |
| `deliverFinalizableDraftPreview(...)`        | `defineFinalizableLivePreviewAdapter(...)` más `deliverWithFinalizableLivePreviewAdapter(...)`                                     |
| `DraftPreviewFinalizerDraft`                 | `LivePreviewFinalizerDraft`                                                                                                        |
| `DraftPreviewFinalizerResult`                | `LivePreviewFinalizerResult`                                                                                                       |

Los despachadores de compatibilidad todavía pueden usar `createReplyPrefixContext(...)`,
`createReplyPrefixOptions(...)` y `createTypingCallbacks(...)` a través de la
fachada de mensajes. El nuevo código del ciclo de vida debe evitar la antigua
subruta `channel-reply-pipeline`.

## Lista de comprobación de migración

1. Añada `message: defineChannelMessageAdapter(...)` o
   `message: createChannelMessageAdapterFromOutbound(...)` al complemento del canal.
2. Devuelva `MessageReceipt` desde los envíos de texto, medios y cargas útiles.
3. Declare solo las capacidades respaldadas por el comportamiento nativo y las pruebas.
4. Reemplace los mapas de requisitos durables escritos a mano con
   `deriveDurableFinalDeliveryRequirements(...)`.
5. Mueva la finalización de la vista previa a través de los asistentes de vista previa en vivo cuando el canal
   edite los mensajes de borrador en su lugar.
6. Declare la política de reconocimiento de recepción solo cuando el receptor pueda diferir realmente el reconocimiento
   de la plataforma.
7. Mantenga los asistentes de despacho de respuesta heredados solo en los bordes de compatibilidad.
