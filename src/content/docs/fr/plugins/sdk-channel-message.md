---
summary: "APIAPI de cycle de vie des messages pour les plugins de channel, incluant les envois durables, les reçus, la prévisualisation en direct, la stratégie d'accusé de réception de réception et la migration de l'ancien système"
title: "APIAPI de message de channel"
read_when:
  - You are building or refactoring a messaging channel plugin
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from legacy reply pipeline or inbound reply dispatch helpers
---

Les plugins de channel doivent exposer un adaptateur `message` à partir de
`openclaw/plugin-sdk/channel-message`. L'adaptateur décrit le cycle de vie natif du
message que la plateforme prend en charge :

```text
receive -> route and record -> agent turn -> durable final send
send -> render batch -> platform I/O -> receipt -> lifecycle side effects
live preview -> final edit or fallback -> receipt
```

Le Cœur gère la mise en file d'attente, la durabilité, la stratégie de réessay générique, les hooks, les reçus et l'outil `message` partagé. Le plugin possède les appels natifs d'envoi/modification/suppression, la normalisation des cibles, le thread de la plateforme, les citations sélectionnées, les indicateurs de notification, l'état du compte et les effets secondaires spécifiques à la plateforme.

Utilisez cette page avec [Création de plugins de channel](/fr/plugins/sdk-channel-plugins).

Le sous-chemin `channel-message` est intentionnellement assez léger pour les fichiers d'amorçage de plugin à chaud tels que `channel.ts` : il expose les contrats d'adaptateur, les preuves de capacité, les reçus et les façades de compatibilité sans charger la livraison sortante.
Les assistants de livraison à l'exécution sont disponibles à partir de
`openclaw/plugin-sdk/channel-message-runtime` pour les chemins de code de surveillance/envoi qui
effectuent déjà des E/S de messages asynchrones.

Le nouveau code d'envoi de channel et de plugin devrait utiliser les assistants de cycle de vie des messages de
`openclaw/plugin-sdk/channel-message-runtime` : `sendDurableMessageBatch`,
`withDurableMessageSendContext` ou `deliverInboundReplyWithMessageSendContext`.
L'ancien assistant
`deliverOutboundPayloads(...)` dans `openclaw/plugin-sdk/outbound-runtime`
est un substrat de compatibilité/runtime obsolète pour les internes sortants, la récupération
et les adaptateurs hérités. Ne l'utilisez pas pour les nouveaux chemins d'envoi de channel ou de plugin.

`sendDurableMessageBatch(...)` renvoie un résultat de cycle de vie explicite :

- `sent` - au moins un message de plateforme visible a été livré.
- `suppressed` - aucun message de plateforme ne doit être traité comme manquant. Les raisons stables incluent `cancelled_by_message_sending_hook`,
  `empty_after_message_sending_hook`, `no_visible_payload`,
  `adapter_returned_no_identity` et l'ancien `no_visible_result`.
- `partial_failed` - au moins un message de la plateforme a été délivré avant qu'une
  charge utile ou un effet secondaire ultérieur n'échoue. Le résultat inclut le préfixe
  de reçu délivré ainsi que l'échec.
- `failed` - aucun reçu de la plateforme n'a été généré.

Utilisez `payloadOutcomes` lorsqu'un lot contient un mélange de charges utiles envoyées,
supprimées et ayant échoué.
Ne déduisez pas l'annulation d'un hook en vérifiant si l'ancien tableau de livraison
directe est vide.

Les répartiteurs de compatibilité qui ont toujours besoin du répartiteur de réponses
tamponné doivent construire des options de préfixe de réponse avec `createChannelMessageReplyPipeline(...)`
à partir de `openclaw/plugin-sdk/channel-message`, puis appeler le `channel.turn.runPrepared(...)`
du runtime. Cela maintient l'enregistrement de session et l'ordre de répartition
sur le cycle de vie du tour partagé sans ajouter un autre wrapper de tour public.

## Adaptateur minimal

La plupart des nouveaux plugins de channel peuvent commencer avec un petit adaptateur :

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

Attachez-le ensuite au plugin de channel :

```typescript
export const demoPlugin = createChatChannelPlugin({
  base: {
    id: "demo",
    message: demoMessageAdapter,
    // other channel plugin fields
  },
});
```

Ne déclarez que les capacités que l'adaptateur préserve vraiment. Chaque capacité
déclarée doit disposer d'un test de contrat.

## Pont sortant

Si le channel dispose déjà d'un adaptateur `outbound` compatible,
préférez dériver l'adaptateur de message plutôt que de dupliquer le code d'envoi :

```typescript
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-message";

const demoMessageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound: demoOutboundAdapter,
});
```

Le pont convertit les anciens résultats d'envoi sortant en valeurs `MessageReceipt`.
Le nouveau code doit transmettre les reçus de bout en bout et ne dériver les anciens identifiants
qu'aux bords de compatibilité avec `listMessageReceiptPlatformIds(...)` ou
`resolveMessageReceiptPrimaryId(...)`.
Si aucune politique de réception n'est fournie, `createChannelMessageAdapterFromOutbound(...)`
utilise la politique de reconnaissance de réception `manual`.
Cela rend la reconnaissance de plateforme détenue par le plugin explicite sans modifier les
channels qui reconnaissent les webhooks, les sockets ou les décalages de sondage (polling)
en dehors du contexte de réception générique.

## Envois via l'outil de message

Le chemin partagé `message(action="send")` doit utiliser le même cycle de vie
de livraison de base que les réponses finales. Si un channel a besoin d'une mise en forme
spécifique au provider pour l'envoi de l'outil, implémentez `actions.prepareSendPayload(...)`
au lieu d'envoyer depuis `actions.handleAction(...)`.

`prepareSendPayload(...)` reçoit le `ReplyPayload` normalisé ainsi que le
contexte complet de l'action. Retournez une charge utile avec des données spécifiques au
canal dans `payload.channelData.<channel>` et laissez le noyau appeler `sendMessage(...)`,
le runtime du cycle de vie des messages, la file d'attente write-ahead, les hooks d'envoi,
la nouvelle tentative, la récupération et le nettoyage des acquittements. Le runtime du cycle de vie peut appeler
`deliverOutboundPayloads(...)` en interne en tant que substrat de compatibilité, mais les plugins de
canal ne doivent pas l'appeler directement pour les nouveaux comportements d'envoi.

Ne retournez `null` que lorsque l'envoi ne peut pas être représenté comme une charge utile durable, par
exemple parce qu'il contient une fabrique de composants non sérialisable. Le noyau conservera
le repli vers l'action de plugin héritée pour la compatibilité, mais les nouvelles fonctionnalités d'envoi de
canal devraient pouvoir être exprimées sous forme de données de charge utile durables.

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

L'adaptateur sortant lit ensuite `payload.channelData.demo` à l'intérieur de `sendPayload`.
Cela permet de conserver le rendu spécifique à la plateforme dans le plugin tandis que le noyau garde
généralement la persistance, la nouvelle tentative, la récupération, les hooks et l'acquittement.

Les charges utiles `message(action="send")` préparées et la livraison générique de réponse finale utilisent
la livraison de base avec mise en file d'attente au meilleur effort par défaut. La mise en file d'attente durable requise n'est
valide qu'après que le noyau ait vérifié que le canal peut réconcilier un envoi dont le résultat est
inconnu après un crash. Si l'adaptateur ne peut pas implémenter `reconcileUnknownSend`,
conservez le chemin d'envoi préparé au meilleur effort ; le noyau essaiera toujours la file d'attente write-ahead,
mais la persistance de la file ou la récupération après crash incertaine ne font pas partie du
contrat de livraison requis.

## Capacités finales durables

La livraison finale durable est optionnelle par effet secondaire. Le noyau n'utilisera la livraison
durable générique que lorsque l'adaptateur déclare chaque capacité nécessaire pour la
charge utile et les options de livraison.

| Capacité               | Déclarer quand                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `text`                 | L'adaptateur peut envoyer du texte et retourner un accusé de réception.                                           |
| `media`                | Les envois de média retournent des accusés de réception pour chaque message visible de la plateforme.             |
| `payload`              | L'adaptateur préserve la sémantique de charge utile de riche réponse, pas seulement le texte et une URL de média. |
| `replyTo`              | Les cibles de réponse native atteignent la plateforme.                                                            |
| `thread`               | Les cibles de fil de discussion natif, de sujet ou de fil de discussion de channel atteignent la plateforme.      |
| `silent`               | La suppression des notifications atteint la plateforme.                                                           |
| `nativeQuote`          | Les métadonnées de citation sélectionnée atteignent la plateforme.                                                |
| `messageSendingHooks`  | Les hooks d'envoi de messages principaux peuvent annuler ou réécrire le contenu avant l'E/S de la plateforme.     |
| `batch`                | Les lots rendus en plusieurs parties peuvent être rejoués en tant qu'un plan durable unique.                      |
| `reconcileUnknownSend` | L'adaptateur peut résoudre la récupération `unknown_after_send` sans rejeu aveugle.                               |
| `afterSendSuccess`     | Les effets secondaires après envoi locaux au channel s'exécutent une seule fois.                                  |
| `afterCommit`          | Les effets secondaires après commit locaux au channel s'exécutent une seule fois.                                 |

La livraison finale de type « meilleur effort » n'exige pas `reconcileUnknownSend` ; elle utilise
le cycle de vie partagé lorsque l'adaptateur préserve les sémantiques visibles de la charge utile, et
revient à l'E/S directe de la plateforme si la persistance de la file d'attente n'est pas disponible. La livraison finale durable
requise doit exiger explicitement `reconcileUnknownSend`. Si l'adaptateur ne peut pas déterminer si un envoi démarré/inconnu a atteint la plateforme,
ne déclarez pas cette capacité ; le cœur rejettera la livraison durable requise
avant la mise en file d'attente.

Lorsqu'un appelant a besoin d'une livraison durable, dérivez les exigences au lieu de construire
les cartes à la main :

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

`messageSendingHooks` est requis par défaut. Définissez `messageSendingHooks: false`
seulement pour un chemin qui ne peut intentionnellement pas exécuter les hooks globaux d'envoi de messages.

## Contrat d'envoi durable

Un envoi final durable a des sémantiques plus strictes que la livraison propriétaire du channel héritée :

- Créez l'intention durable avant l'E/S de la plateforme.
- Si la livraison durable renvoie un résultat géré, ne revenez pas à l'envoi hérité.
- Traitez l'annulation de hook et les résultats sans envoi comme terminaux.
- Traitez `unsupported` uniquement comme un résultat pré-intentionnel.
- Pour une durabilité requise, échouez avant l'E/S de la plateforme si la file d'attente ne peut pas enregistrer
  que l'envoi de la plateforme a commencé.
- Pour la livraison finale requise et les envois requis de l'outil de message préparé,
  effectuez un vol de contrôle `reconcileUnknownSend` ; la récupération doit être capable d'acquitter un
  message déjà envoyé ou de rejouer uniquement après que l'adaptateur a prouvé que l'envoi original
  n'a pas eu lieu.
- Pour `best_effort`, les échecs d'écriture dans la file d'attente peuvent revenir à des E/S directes avec la plateforme.
- Transférer les signaux d'abandon au chargement des médias et aux envois vers la plateforme.
- Exécuter les hooks après-commit après l'accusé de réception de la file d'attente ; le repli direct de meilleur effort les exécute après des E/S réussies avec la plateforme car il n'y a pas de commit durable dans la file d'attente.
- Retourner des reçus pour chaque identifiant de message visible sur la plateforme.
- Utilisez `reconcileUnknownSend` lorsqu'une plateforme peut vérifier si un envoi incertain a déjà atteint l'utilisateur.

Ce contrat évite les envois en double après les plantages et évite de contourner les hooks d'annulation de l'envoi de messages.

## Reçus

`MessageReceipt` est le nouvel enregistrement interne de ce que la plateforme a accepté :

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

Utilisez `createMessageReceiptFromOutboundResults(...)` lors de l'adaptation d'un résultat d'envoi existant. Utilisez `createPreviewMessageReceipt(...)` lorsqu'un message de prévisualisation en direct devient le reçu final. Évitez d'ajouter de nouveaux champs `messageIds` locaux au propriétaire. L'ancien `ChannelDeliveryResult.messageIds` est toujours produit aux limites de compatibilité.

## Prévisualisation en direct

Les canaux qui diffusent des prévisualisations de brouillons ou des mises à jour de progression doivent déclarer des capacités en direct (live) :

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

Utilisez `defineFinalizableLivePreviewAdapter(...)` et `deliverWithFinalizableLivePreviewAdapter(...)` pour la finalisation à l'exécution. Le finaliseur décide si la réponse finale modifie la prévisualisation en place, envoie un repli normal, ignore l'état de prévisualisation en attente, conserve une modification échouée ambiguë sans dupliquer le message et retourne le reçu final.

## Politique d'accusé de réception de réception

Les récepteurs entrants qui contrôlent le calendrier de l'accusé de réception de la plateforme doivent déclarer une politique de réception :

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  receive: {
    defaultAckPolicy: "after_agent_dispatch",
    supportedAckPolicies: ["after_receive_record", "after_agent_dispatch"],
  },
});
```

Les adaptateurs qui ne déclarent pas de politique de réception sont par défaut :

```typescript
{
  receive: {
    defaultAckPolicy: "manual",
    supportedAckPolicies: ["manual"],
  },
}
```

Utilisez la valeur par défaut lorsque la plateforme n'a pas d'accusé de réception à différer, accuse déjà réception avant le traitement asynchrone, ou nécessite une sémantique de réponse spécifique au protocole. Déclarez l'une des politiques par étapes uniquement lorsque le récepteur utilise réellement le contexte de réception pour déplacer l'accusé de réception de la plateforme plus tard.

Politiques :

| Politique              | Utiliser quand                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `after_receive_record` | La plateforme peut être reconnue une fois l'événement entrant analysé et enregistré.                                              |
| `after_agent_dispatch` | La plateforme doit attendre que la distribution de l'agent soit acceptée.                                                         |
| `after_durable_send`   | La plateforme doit attendre que la livraison finale ait une décision durable.                                                     |
| `manual`               | Le plugin possède la gestion des accusés de réception car la sémantique de la plateforme ne correspond pas à une étape générique. |

Utilisez `createMessageReceiveContext(...)` dans les récepteurs qui diffèrent l'état d'accusé de réception, et `shouldAckMessageAfterStage(...)` lorsque le récepteur doit tester si une étape a satisfait la stratégie configurée.

## Tests de contrat

Les déclarations de capacités font partie du contrat du plugin. Assurez-les par des tests :

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

Ajoutez des suites de preuves en direct et de réception lorsque l'adaptateur déclare ces fonctionnalités. Une preuve manquante doit faire échouer le test plutôt que d'élargir silencieusement la surface durable.

## API de compatibilité obsolètes

Ces API restent importables pour la compatibilité avec les tiers. Ne les utilisez pas pour le nouveau code de channel.

| API obsolète                                 | Remplacement                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/channel-reply-pipeline` | `openclaw/plugin-sdk/channel-message`                                                                                                       |
| `createChannelTurnReplyPipeline(...)`        | `createChannelMessageReplyPipeline(...)` pour les répartiteurs de compatibilité, ou un adaptateur `message` pour le nouveau code de channel |
| `buildChannelMessageReplyDispatchBase(...)`  | `createChannelMessageReplyPipeline(...)` plus `channel.turn.runPrepared(...)`, ou un adaptateur `message` pour le nouveau code de channel   |
| `dispatchChannelMessageReplyWithBase(...)`   | `createChannelMessageReplyPipeline(...)` plus `channel.turn.runPrepared(...)`, ou un adaptateur `message` pour le nouveau code de channel   |
| `recordChannelMessageReplyDispatch(...)`     | `createChannelMessageReplyPipeline(...)` plus `channel.turn.runPrepared(...)`, ou un adaptateur `message` pour le nouveau code de channel   |
| `deliverOutboundPayloads(...)`               | `sendDurableMessageBatch(...)` ou `deliverInboundReplyWithMessageSendContext(...)` depuis `channel-message-runtime`                         |
| `deliverDurableInboundReplyPayload(...)`     | `deliverInboundReplyWithMessageSendContext(...)` depuis `openclaw/plugin-sdk/channel-message-runtime`                                       |
| `dispatchInboundReplyWithBase(...)`          | `createChannelMessageReplyPipeline(...)` plus `channel.turn.runPrepared(...)`, ou un adaptateur `message` pour le nouveau code de channel   |
| `recordInboundSessionAndDispatchReply(...)`  | `createChannelMessageReplyPipeline(...)` plus `channel.turn.runPrepared(...)`, ou un adaptateur `message` pour le nouveau code de channel   |
| `resolveChannelSourceReplyDeliveryMode(...)` | `resolveChannelMessageSourceReplyDeliveryMode(...)`                                                                                         |
| `deliverFinalizableDraftPreview(...)`        | `defineFinalizableLivePreviewAdapter(...)` plus `deliverWithFinalizableLivePreviewAdapter(...)`                                             |
| `DraftPreviewFinalizerDraft`                 | `LivePreviewFinalizerDraft`                                                                                                                 |
| `DraftPreviewFinalizerResult`                | `LivePreviewFinalizerResult`                                                                                                                |

Les répartiteurs de compatibilité peuvent toujours utiliser `createReplyPrefixContext(...)`,
`createReplyPrefixOptions(...)` et `createTypingCallbacks(...)` via la
façade de message. Le nouveau code de cycle de vie doit éviter l'ancien
sous-chemin `channel-reply-pipeline`.

## Liste de contrôle de migration

1. Ajoutez `message: defineChannelMessageAdapter(...)` ou
   `message: createChannelMessageAdapterFromOutbound(...)` au plugin de channel.
2. Retournez `MessageReceipt` pour les envois de texte, de média et de payload.
3. Déclarez uniquement les capacités prises en charge par le comportement natif et les tests.
4. Remplacez les cartes de exigences de durabilité écrites à la main par
   `deriveDurableFinalDeliveryRequirements(...)`.
5. Déplacez la finalisation de l'aperçu via les assistants d'aperçu en direct lorsque le channel
   modifie les messages de brouillon sur place.
6. Déclarez la stratégie d'accusé de réception de réception uniquement lorsque le récepteur peut vraiment différer l'accusé de réception
   de la plateforme.
7. Conservez les anciens assistants de répartition de réponse uniquement aux limites de compatibilité.
