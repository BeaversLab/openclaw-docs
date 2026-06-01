---
summary: "API del ciclo de vida de mensajes salientes para complementos de canal: adaptadores, recibos, envíos duraderos, vista previa en vivo y asistentes de canalización de respuestas"
title: "API de salida del canal"
read_when:
  - You are building or refactoring a messaging channel plugin send path
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from channel-message, channel-message-runtime, or legacy reply dispatch helpers
---

Los complementos de canal deben exponer el comportamiento de los mensajes salientes desde
`openclaw/plugin-sdk/channel-outbound`. Utilice
`openclaw/plugin-sdk/channel-inbound` para la orquestación de recepción/contexto/despacho.

Core es propietario de la puesta en cola, la durabilidad, la política de reintento genérica, los enlaces, los recibos y la
herramienta compartida `message`. El complemento es propietario de las llamadas nativas de envío/edición/eliminación, la normalización
del objetivo, el subprocesamiento de la plataforma, las citas seleccionadas, los indicadores de notificación, el estado
de la cuenta y los efectos secundarios específicos de la plataforma.

## Adaptador

La mayoría de los complementos definen un adaptador `message`:

```ts
import { defineChannelMessageAdapter, createMessageReceiptFromOutboundResults } from "openclaw/plugin-sdk/channel-outbound";

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

Solo declare las capacidades que el transporte nativo realmente conserva. Cubra cada
capacidad de envío, recibo, vista previa en vivo y acuse de recibo de recepción declarada con los
asistentes de contrato exportados desde esta subruta.

## Adaptadores de salida existentes

Si el canal ya tiene un adaptador `outbound` compatible, derive el adaptador
de mensajes en lugar de duplicar el código de envío:

```ts
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-outbound";

export const messageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound,
  durableFinal: {
    capabilities: {
      text: true,
      media: true,
    },
  },
});
```

## Envíos duraderos

Los asistentes de envío en tiempo de ejecución también residen en `channel-outbound`:

- `sendDurableMessageBatch(...)`
- `withDurableMessageSendContext(...)`
- `deliverInboundReplyWithMessageSendContext(...)`
- asistentes de transmisión/progreso de borradores como `resolveChannelStreamingPreviewChunk(...)`

`sendDurableMessageBatch(...)` devuelve un resultado explícito:

- `sent`: se entregó al menos un mensaje de plataforma visible.
- `suppressed`: ningún mensaje de plataforma debe tratarse como faltante.
- `partial_failed`: se entregó al menos un mensaje de plataforma antes de que fallara una carga útil
  efecto secundario posterior.
- `failed`: no se produjo ningún recibo de plataforma.

Use `payloadOutcomes` cuando un lote mezcle cargas útiles enviadas, suprimidas y fallidas.
No infiera la cancelación del enlace a partir de un resultado de entrega directa heredado vacío.

## Despacho de compatibilidad

El envío de respuestas entrantes debe ensamblarse a través de
`dispatchChannelInboundReply(...)` desde `channel-inbound`. Mantenga la entrega de la plataforma en el adaptador de entrega; use `channel-outbound` para los adaptadores de mensajes,
envíos duraderos, recibos, vista previa en vivo y opciones de canalización de respuesta.
