---
summary: "APIAPI de cycle de vie des messages sortants pour les plugins de channel : adaptateurs, accusés de réception, envois durables, aperçu en direct et assistants de pipeline de réponse"
title: "APIAPI sortante de channel"
read_when:
  - You are building or refactoring a messaging channel plugin send path
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from channel-message, channel-message-runtime, or legacy reply dispatch helpers
---

Les plugins de channel doivent exposer le comportement des messages sortants à partir de
`openclaw/plugin-sdk/channel-outbound`. Utilisez
`openclaw/plugin-sdk/channel-inbound` pour l'orchestration de réception/contexte/répartition.

Le composant Core gère la mise en file d'attente, la durabilité, la stratégie de réessai générique, les hooks, les accusés de réception et l'outil partagé `message`. Le plugin possède les appels natifs d'envoi/modification/suppression, la normalisation des cibles, le threading de la plateforme, les citations sélectionnées, les indicateurs de notification, l'état du compte et les effets secondaires spécifiques à la plateforme.

## Adaptateur

La plupart des plugins définissent un adaptateur `message` :

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

Ne déclarez que les capacités que le transport natif préserve réellement. Couvrez chaque capacité déclarée d'envoi, d'accusé de réception, d'aperçu en direct et d'accusé de réception de réception avec les assistants de contrat exportés depuis ce sous-chemin.

## Adaptateurs sortants existants

Si le channel possède déjà un adaptateur `outbound` compatible, dérivez l'adaptateur de message au lieu de dupliquer le code d'envoi :

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

## Envois durables

Les assistants d'envoi d'exécution résident également sur `channel-outbound` :

- `sendDurableMessageBatch(...)`
- `withDurableMessageSendContext(...)`
- `deliverInboundReplyWithMessageSendContext(...)`
- assistants de diffusion en continu/progression de brouillon tels que `resolveChannelStreamingPreviewChunk(...)`

`sendDurableMessageBatch(...)` renvoie un résultat explicite :

- `sent` : au moins un message de plateforme visible a été livré.
- `suppressed` : aucun message de plateforme ne doit être traité comme manquant.
- `partial_failed` : au moins un message de plateforme a été livré avant l'échec d'une charge utile ou d'un effet secondaire ultérieur.
- `failed` : aucun accusé de réception de plateforme n'a été produit.

Utilisez `payloadOutcomes` lorsqu'un lot mélange des charges utiles envoyées, supprimées et ayant échoué.
Ne déduisez pas l'annulation d'un hook d'un résultat de livraison directe hérité vide.

## Répartition de compatibilité

La distribution des réponses entrantes doit être assemblée via
`dispatchChannelInboundReply(...)` à partir de `channel-inbound`. Conservez la livraison
de la plateforme dans l'adaptateur de livraison ; utilisez `channel-outbound` pour les adaptateurs de
messages, les envois durables, les reçus, l'aperçu en direct et les options du pipeline de réponse.
