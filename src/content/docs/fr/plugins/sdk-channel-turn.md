---
summary: "runtime.channel.turn -- le noyau d'événement entrant partagé que les plugins de canal intégrés et tiers utilisent pour enregistrer, distribuer et finaliser les tours d'agent"
title: "Channel turn kernel"
sidebarTitle: "Channel turn"
read_when:
  - You are building a channel plugin and want the shared inbound event lifecycle
  - You are migrating a channel monitor off hand-rolled record/dispatch glue
  - You need to understand admission, ingest, classify, preflight, resolve, record, dispatch, and finalize stages
---

Le noyau de tour de canal est la machine à état entrante partagée qui transforme un événement de plateforme normalisé en un tour d'agent. Les plugins de canal fournissent les faits de la plateforme et le rappel de livraison. Le cœur possède l'orchestration : ingest, classify, preflight, resolve, authorize, assemble, record, dispatch et finalize.

Utilisez ceci lorsque votre plugin est sur le chemin rapide des messages entrants. Pour les événements non-message (commandes slash, modales, interactions avec les boutons, événements de cycle de vie, réactions, état vocal), gardez-les locaux au plugin. Le noyau ne possède que les événements qui peuvent devenir un tour de texte de l'agent.

<Info>Le noyau est accessible via le runtime de plugin injecté en tant que `runtime.channel.turn.*`. Le type du runtime de plugin est exporté depuis `openclaw/plugin-sdk/core`, les plugins natifs tiers peuvent donc utiliser ces points d'entrée de la même manière que les plugins de canal intégrés.</Info>

## Pourquoi un noyau partagé

Les plugins de canal répètent le même flux entrant : normaliser, router, filtrer, construire un contexte, enregistrer les métadonnées de session, dispatcher le tour de l'agent, finaliser l'état de livraison. Sans noyau partagé, un changement concernant le filtrage des mentions, les réponses visibles uniquement par les outils, les métadonnées de session, l'historique en attente ou la finalisation du dispatch doit être appliqué par canal.

Le noyau garde volontairement séparés quatre concepts :

- `ConversationFacts` : origine du message
- `RouteFacts` : l'agent et la session qui doivent le traiter
- `ReplyPlanFacts` : destination des réponses visibles
- `MessageFacts` : le corps et le contexte supplémentaire que l'agent doit voir

Les DMs Slack, les sujets Telegram, les fils Matrix et les sessions de sujet Feishu distinguent tous ces éléments en pratique. Les traiter comme un seul identifiant entraîne une dérive au fil du temps.

## Cycle de vie des étapes

Le noyau exécute le même pipeline fixe quel que soit le canal :

1. `ingest` -- l'adaptateur convertit un événement brut de la plateforme en `NormalizedTurnInput`
2. `classify` -- l'adaptateur déclare si cet événement peut démarrer un tour d'agent
3. `preflight` -- l'adaptateur effectue la déduplication, l'auto-écho, l'hydratation, le anti-rebond, le déchiffrement, le préremplissage partiel des faits
4. `resolve` -- l'adaptateur renvoie un tour entièrement assemblé (itinéraire, plan de réponse, message, livraison)
5. `authorize` -- les stratégies de DM, de groupe, de mention et de commande appliquées aux faits assemblés
6. `assemble` -- `FinalizedMsgContext` construit à partir des faits via `buildContext`
7. `record` -- métadonnées de session entrante et dernier itinéraire persistants
8. `dispatch` -- tour d'agent exécuté via le répartiteur de blocs tamponné
9. `finalize` -- le `onFinalize` de l'adaptateur s'exécute même en cas d'erreur de distribution

Chaque étape émet un événement de journal structuré lorsqu'un rappel `log` est fourni. Voir [Observabilité](#observability).

## Types d'admission

Le noyau ne lève pas d'exception lorsqu'un tour est bloqué. Il renvoie un `ChannelTurnAdmission` :

| Type          | Quand                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dispatch`    | Le tour est admis. Le tour de l'agent s'exécute et le chemin de réponse visible est activé.                                                                                       |
| `observeOnly` | Le tour s'exécute de bout en bout mais l'adaptateur de livraison n'envoie rien de visible. Utilisé pour les agents observateurs de diffusion et autres flux multi-agents passifs. |
| `handled`     | Un événement de plateforme a été consommé localement (cycle de vie, réaction, bouton, modal). Le noyau ignore la répartition.                                                     |
| `drop`        | Skip path. En option, `recordHistory: true` conserve le message dans l'historique du groupe en attente afin qu'une mention future dispose d'un contexte.                          |

L'admission peut provenir de `classify` (la classe d'événement a indiqué qu'elle ne pouvait pas démarrer un tour), de `preflight` (déduplication, écho de soi, mention manquante avec enregistrement d'historique), ou de `resolveTurn` lui-même.

## Points d'entrée

L'exécution expose trois points d'entrée préférés afin que les adaptateurs puissent s'inscrire au niveau qui correspond au canal.

```typescript
runtime.channel.turn.run(...)             // adapter-driven full pipeline
runtime.channel.turn.runAssembled(...)    // already-built context + delivery adapter
runtime.channel.turn.runPrepared(...)     // channel owns dispatch; kernel runs record + finalize
runtime.channel.turn.buildContext(...)    // pure facts to FinalizedMsgContext mapping
```

Deux anciens assistants d'exécution restent disponibles pour la compatibilité du Plugin SDK :

```typescript
runtime.channel.turn.runResolved(...)      // deprecated compatibility alias; prefer run
runtime.channel.turn.dispatchAssembled(...) // deprecated compatibility alias; prefer runAssembled
```

### run

À utiliser lorsque votre channel peut exprimer son flux entrant sous la forme d'un `ChannelTurnAdapter<TRaw>`. L'adaptateur possède des rappels pour `ingest`, `classify` en option, `preflight` en option, `resolveTurn` obligatoire, et `onFinalize` en option.

```typescript
await runtime.channel.turn.run({
  channel: "tlon",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest(raw) {
      return {
        id: raw.messageId,
        timestamp: raw.timestamp,
        rawText: raw.body,
        textForAgent: raw.body,
      };
    },
    classify(input) {
      return { kind: "message", canStartAgentTurn: input.rawText.length > 0 };
    },
    async preflight(input, eventClass) {
      if (await isDuplicate(input.id)) {
        return { admission: { kind: "drop", reason: "dedupe" } };
      }
      return {};
    },
    resolveTurn(input) {
      return buildAssembledTurn(input);
    },
    onFinalize(result) {
      clearPendingGroupHistory(result);
    },
  },
});
```

`run` est la forme appropriée lorsque le channel possède une logique d'adaptateur réduite et bénéficie de la propriété du cycle de vie via des crochets (hooks).

### runAssembled

À utiliser lorsque le channel a déjà résolu le routage, construit un `FinalizedMsgContext`,
et a seulement besoin de l'ordonnancement partagé pour l'enregistrement, le pipeline de réponse, l'expédition et la finalisation.
C'est la forme préférée pour les chemins d'entrée groupés simples qui
répéteraient autrefois le code répétitif (boilerplate) de `createChannelMessageReplyPipeline(...)` et
`runPrepared(...)`.

```typescript
await runtime.channel.turn.runAssembled({
  cfg,
  channel: "irc",
  accountId,
  agentId: route.agentId,
  routeSessionKey: route.sessionKey,
  storePath,
  ctxPayload,
  recordInboundSession: runtime.channel.session.recordInboundSession,
  dispatchReplyWithBufferedBlockDispatcher: runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher,
  delivery: {
    deliver: async (payload) => {
      await sendPlatformReply(payload);
    },
    onError: (err, info) => {
      runtime.error?.(`reply ${info.kind} failed: ${String(err)}`);
    },
  },
});
```

Choisissez `runAssembled` plutôt que `runPrepared` lorsque le seul comportement d'expédition
propriétaire du canal est la livraison finale de la charge utile plus, en option, la saisie, les options de réponse, la livraison
durable ou la journalisation des erreurs.

### runPrepared

À utiliser lorsque le channel dispose d'un répartiteur local complexe avec des aperçus, des tentatives, des modifications ou un amorçage de fil de discussion qui doit rester la propriété du channel. Le noyau enregistre toujours la session entrante avant l'expédition et présente un `DispatchedChannelTurnResult` uniforme.

```typescript
const { dispatchResult } = await runtime.channel.turn.runPrepared({
  channel: "matrix",
  accountId,
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  record: {
    onRecordError,
    updateLastRoute,
  },
  onPreDispatchFailure: async (err) => {
    await stopStatusReactions();
  },
  runDispatch: async () => {
    return await runMatrixOwnedDispatcher();
  },
});
```

Les canaux riches (Matrix, Mattermost, Microsoft Teams, Feishu, QQ Bot) utilisent `runPrepared` car leur répartiteur orchestre des comportements spécifiques à la plateforme dont le noyau ne doit pas avoir connaissance.

### buildContext

Une fonction pure qui mappe les faisceaux de faits en `FinalizedMsgContext`. À utiliser lorsque votre channel réalise manuellement une partie du pipeline mais souhaite conserver une forme de contexte cohérente.

```typescript
const ctxPayload = runtime.channel.turn.buildContext({
  channel: "googlechat",
  accountId,
  messageId,
  timestamp,
  from,
  sender,
  conversation,
  route,
  reply,
  message,
  access,
  media,
  supplemental,
});
```

`buildContext` est également utile à l'intérieur des rappels `resolveTurn` lors de l'assemblage d'un tour pour `run`.

<Note>Les helpers SDK dépréciés tels que `dispatchInboundReplyWithBase` passent toujours par un helper de tour assemblé. Le nouveau code de plugin doit utiliser `run` ou `runPrepared`.</Note>

## Types de faits

Les faits que le noyau consomme depuis votre adaptateur sont indépendants de la plateforme. Traduisez les objets de la plateforme dans ces formes avant de les transmettre au noyau.

### NormalizedTurnInput

| Champ             | Objectif                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`              | ID de message stable utilisé pour la déduplication et les journaux                                            |
| `timestamp`       | Optionnel epoch ms                                                                                            |
| `rawText`         | Corps tel que reçu de la plateforme                                                                           |
| `textForAgent`    | Corps nettoyé optionnel pour l'agent (suppression des mentions, nettoyage de la frappe)                       |
| `textForCommands` | Corps optionnel utilisé pour l'analyse `/command`                                                             |
| `raw`             | Référence de transfert (pass-through) optionnelle pour les adaptateurs de rappel qui ont besoin de l'original |

### ChannelEventClass

| Champ                  | Objectif                                                                         |
| ---------------------- | -------------------------------------------------------------------------------- |
| `kind`                 | `message`, `command`, `interaction`, `reaction`, `lifecycle`, `unknown`          |
| `canStartAgentTurn`    | Si faux, le noyau renvoie `{ kind: "handled" }`                                  |
| `requiresImmediateAck` | Indication pour les adaptateurs qui doivent accuser réception avant l'expédition |

### SenderFacts

| Champ          | Objet                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------- |
| `id`           | ID d'expéditeur stable de la plateforme                                                       |
| `name`         | Nom d'affichage                                                                               |
| `username`     | Gérer si distinct de `name`                                                                   |
| `tag`          | Discriminateur de style Discord ou balise de plateforme                                       |
| `roles`        | IDs de rôle, utilisés pour la correspondance de la liste d'autorisation des rôles des membres |
| `isBot`        | Vrai lorsque l'expéditeur est un bot connu (le noyau l'utilise pour le rejet)                 |
| `isSelf`       | Vrai lorsque l'expéditeur est l'agent configuré lui-même                                      |
| `displayLabel` | Libellé pré-rendu pour le texte de l'enveloppe                                                |

### ConversationFacts

| Champ             | Objectif                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `kind`            | `direct`, `group`, ou `channel`                                                                |
| `id`              | Identifiant de conversation utilisé pour le routage                                            |
| `label`           | Libellé humain pour l'enveloppe                                                                |
| `spaceId`         | Identificateur d'espace externe optionnel (espace de travail Slack, serveur domestique Matrix) |
| `parentId`        | Identifiant de conversation externe lorsqu'il s'agit d'un fil                                  |
| `threadId`        | Identifiant du fil lorsque ce message se trouve dans un fil                                    |
| `nativeChannelId` | Identifiant de canal natif à la plateforme lorsqu'il diffère de l'identifiant de routage       |
| `routePeer`       | Pair utilisé pour la recherche `resolveAgentRoute`                                             |

### RouteFacts

| Champ                   | Objectif                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `agentId`               | Agent qui doit gérer ce tour                                                         |
| `accountId`             | Remplacement optionnel (canaux multi-comptes)                                        |
| `routeSessionKey`       | Clé de session utilisée pour le routage                                              |
| `dispatchSessionKey`    | Clé de session utilisée lors de la distribution si elle diffère de la clé de routage |
| `persistedSessionKey`   | Clé de session écrite dans les métadonnées de session persistantes                   |
| `parentSessionKey`      | Parent pour les sessions ramifiées/enfilées                                          |
| `modelParentSessionKey` | Parent côté modèle pour les sessions ramifiées                                       |
| `mainSessionKey`        | Épingle de propriétaire DM principale pour les conversations directes                |
| `createIfMissing`       | Autoriser l'étape d'enregistrement à créer une ligne de session manquante            |

### ReplyPlanFacts

| Champ                     | Objectif                                                           |
| ------------------------- | ------------------------------------------------------------------ |
| `to`                      | Cible de réponse logique écrite dans le contexte `To`              |
| `originatingTo`           | Cible du contexte d'origine (`OriginatingTo`)                      |
| `nativeChannelId`         | Identifiant de canal natif à la plateforme pour la livraison       |
| `replyTarget`             | Destination finale de la réponse visible si elle diffère de `to`   |
| `deliveryTarget`          | Remplacement de livraison de niveau inférieur                      |
| `replyToId`               | Identifiant de message cité/ancré                                  |
| `replyToIdFull`           | Identifiant cité complet lorsque la plateforme en possède les deux |
| `messageThreadId`         | Identifiant du fil au moment de la livraison                       |
| `threadParentId`          | Identifiant du message parent du fil                               |
| `sourceReplyDeliveryMode` | `thread`, `reply`, `channel`, `direct`, ou `none`                  |

### AccessFacts

`AccessFacts` porte les booléens nécessaires à l'étape d'autorisation. La correspondance d'identité reste dans le canal : le noyau consomme uniquement le résultat.

| Champ      | Objet                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| `dm`       | Décision d'autorisation/appariement/refus de DM et liste `allowFrom`                                         |
| `group`    | Stratégie de groupe, autorisation de route, autorisation de l'expéditeur, liste blanche, exigence de mention |
| `commands` | Autorisation de commande sur les autorisateurs configurés                                                    |
| `mentions` | Si la détection de mention est possible et si l'agent a été mentionné                                        |

### MessageFacts

| Champ            | Objet                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| `body`           | Corps final de l'enveloppe (formaté)                                         |
| `rawBody`        | Corps entrant brut                                                           |
| `bodyForAgent`   | Corps que voit l'agent                                                       |
| `commandBody`    | Corps utilisé pour l'analyse des commandes                                   |
| `envelopeFrom`   | Libellé de l'expéditeur pré-rendu pour l'enveloppe                           |
| `senderLabel`    | Remplacement facultatif pour l'expéditeur rendu                              |
| `preview`        | Aperçu court expurgé pour les journaux                                       |
| `inboundHistory` | Entrées récentes de l'historique entrant lorsque le canal conserve un tampon |

### SupplementalContextFacts

Le contexte supplémentaire couvre la citation, le transfert et le contexte d'amorçage de fil. Le noyau applique la stratégie `contextVisibility` configurée. L'adaptateur de canal fournit uniquement les faits et les indicateurs `senderAllowed` afin que la stratégie inter-canaux reste cohérente.

### InboundMediaFacts

Les médias sont structurés en faits. Le téléchargement, l'authentification, la stratégie SSRF, les règles CDN et le déchiffrement de la plateforme restent locaux au canal. Le noyau mappe les faits vers `MediaPath`, `MediaUrl`, `MediaType`, `MediaPaths`, `MediaUrls`, `MediaTypes` et `MediaTranscribedIndexes`.

Utilisez `toInboundMediaFacts(...)` de `openclaw/plugin-sdk/channel-inbound` lorsque
votre canal dispose d'une liste de médias résolus et doit uniquement attacher des faits génériques :

```typescript
media: toInboundMediaFacts(resolvedMedia, {
  kind: "image",
  messageId: input.id,
});
```

Si un média mélange des fichiers locaux et des entrées URL uniquement, gardez la liste sous forme de faits de média.
Core préserve les index des tableaux lors de l'écriture des champs de contexte hérités afin que la compréhension des médias en aval, les marqueurs de transcription et les notes de prompt continuent de faire référence à la même pièce jointe.

Pour les messages de groupe ignorés qui doivent être disponibles lors d'une mention ultérieure, passez les faits de média via le champ `preflight.media` du tour. Le noyau convertit ces faits en entrées de média d'historique borné avant l'enregistrement :

```typescript
preflight(input) {
  return {
    admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
    media: () => toInboundMediaFacts(resolveLocalImages(input), {
      kind: "image",
      messageId: input.id,
    }),
    history: {
      key: historyKey,
      limit: historyLimit,
      mediaLimit: 4,
      shouldRecord: () => stillCurrent(input),
    },
  };
}
```

Les médias de l'historique sont intentionnellement conservateurs : images uniquement pour l'instant, chemins locaux lisibles uniquement, bornés par la limite de média configurée, et toujours liés à la clé d'historique du channel. Les URLs de provider authentifiées doivent être téléchargées par le plugin avant de devenir des médias visibles par le model.

## Fenêtres d'historique

Le code de tour de message doit utiliser `createChannelHistoryWindow(...)` au lieu d'appeler directement les helpers de map de bas niveau `reply-history`. Les anciens helpers de map restent importables en tant qu'exports de compatibilité obsolètes, mais le nouveau code d'exécution du plugin ne doit pas les appeler. La façade de fenêtre maintient le contexte textuel, `InboundHistory` structuré, la normalisation des médias d'historique et le nettoyage derrière une seule API détenue par Core, tout en laissant toujours le channel choisir le rendu d'une ligne d'historique.

```typescript
const history = createChannelHistoryWindow({ historyMap: groupHistories });

await history.recordWithMedia({
  historyKey,
  limit: historyLimit,
  entry,
  media: () =>
    toInboundMediaFacts(resolvedImages, {
      kind: "image",
      messageId: entry.messageId,
    }),
});

const combinedBody = history.buildPendingContext({
  historyKey,
  limit: historyLimit,
  currentMessage,
  formatEntry: (entry) => `${entry.sender}: ${entry.body}`,
});
```

Les anciens exports `buildPendingHistoryContextFromMap`,
`buildInboundHistoryFromMap`, `recordPendingHistoryEntry*` et
`clearHistoryEntries*` restent disponibles pour compatibilité obsolète pour les plugins
qui n'ont pas encore migré. Les nouveaux travaux de channel doivent utiliser la fenêtre ou les options d'enregistrement/finalisation du noyau de tour.

## Modèles de message courants

Groupe texte uniquement avec mention requise :

```typescript
preflight(input) {
  const decision = resolveInboundMentionDecision({ facts, policy });
  if (decision.shouldSkip) {
    return {
      admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
      history: { key: historyKey, limit: historyLimit },
    };
  }
  return { access: { mentions: decision } };
}
```

Message image uniquement suivi d'une mention ultérieure :

```typescript
preflight(input) {
  if (!wasMentioned && resolvedImages.length > 0) {
    return {
      admission: { kind: "drop", reason: "missing_mention", recordHistory: true },
      media: () => toInboundMediaFacts(resolvedImages, {
        kind: "image",
        messageId: input.id,
      }),
      history: { key: historyKey, limit: historyLimit, mediaLimit: 4 },
    };
  }
  return {};
}
```

Réponse explicite à une image :

```typescript
resolveTurn(input, _eventClass, preflight) {
  return {
    ...assembled,
    media: toInboundMediaFacts([...currentMedia, ...referencedReplyMedia]),
    supplemental: {
      quote: preflight.supplemental?.quote,
    },
  };
}
```

Message direct avec historique :

```typescript
resolveTurn(input) {
  return {
    ...assembled,
    history: undefined,
    message: {
      rawBody: input.rawText,
      bodyForAgent: input.textForAgent,
    },
  };
}
```

## Contrat de l'adaptateur

Pour la `run` complète, la forme de l'adaptateur est :

```typescript
type ChannelTurnAdapter<TRaw> = {
  ingest(raw: TRaw): Promise<NormalizedTurnInput | null> | NormalizedTurnInput | null;
  classify?(input: NormalizedTurnInput): Promise<ChannelEventClass> | ChannelEventClass;
  preflight?(input: NormalizedTurnInput, eventClass: ChannelEventClass): Promise<PreflightFacts | ChannelTurnAdmission | null | undefined>;
  resolveTurn(input: NormalizedTurnInput, eventClass: ChannelEventClass, preflight: PreflightFacts): Promise<ChannelTurnResolved> | ChannelTurnResolved;
  onFinalize?(result: ChannelTurnResult): Promise<void> | void;
};
```

`resolveTurn` renvoie un `ChannelTurnResolved`, qui est un `AssembledChannelTurn` avec un type d'admission facultatif. Renvoyer `{ admission: { kind: "observeOnly" } }` exécute le tour sans produire de sortie visible. L'adaptateur possède toujours le callback de livraison ; il devient simplement une opération vide pour ce tour.

`onFinalize` s'exécute pour chaque résultat, y compris les erreurs de dispatch. Utilisez-le pour effacer l'historique des groupes en attente, supprimer les réactions d'accusé de réception, arrêter les indicateurs d'état et vider l'état local.

## Adaptateur de livraison

Le noyau n'appelle pas directement la plateforme. Le canal fournit au noyau un `ChannelEventDeliveryAdapter` :

```typescript
type ChannelEventDeliveryAdapter = {
  deliver(payload: ReplyPayload, info: ChannelDeliveryInfo): Promise<ChannelDeliveryResult | void>;
  onError?(err: unknown, info: { kind: string }): void;
  durable?: false | DurableInboundReplyDeliveryOptions;
};

type ChannelDeliveryResult = {
  messageIds?: string[];
  receipt?: MessageReceipt;
  threadId?: string;
  replyToId?: string;
  visibleReplySent?: boolean;
};
```

`deliver` est appelé une fois par bloc de réponse mis en mémoire tampon. Lors de la migration du cycle de vie des messages, la livraison des événements de canal assemblés appartient par défaut au canal : un champ `durable` omis signifie que le noyau doit appeler `deliver` directement et ne doit pas passer par la livraison sortante générique. Ne définissez `durable` qu'après avoir vérifié que le canal prouve que le chemin d'envoi générique préserve l'ancien comportement de livraison, y compris les cibles de réponse/discussion, la gestion des médias, les caches de messages envoyés/auto-écho, le nettoyage du statut et les identifiants de message renvoyés. `durable: false` reste une orthographe de compatibilité pour « utiliser la méthode de rappel propriétaire du canal », mais les canaux non migrés ne devraient pas avoir besoin de l'ajouter. Renvoyez les identifiants de message de la plateforme lorsque le canal les possède afin que le répartiteur puisse conserver les ancres de discussion et modifier les blocs ultérieurs ; les nouveaux chemins de livraison doivent également renvoyer `receipt` afin que la récupération, la finalisation de l'aperçu et la suppression des doublons puissent cesser d'utiliser `messageIds`. Pour les tours d'observation uniquement, renvoyez `{ visibleReplySent: false }` ou utilisez `createNoopChannelEventDeliveryAdapter()`.

Les canaux utilisant `runPrepared` avec un répartiteur entièrement propriétaire du canal n'ont pas de `ChannelEventDeliveryAdapter`. Ces répartiteurs ne sont pas durables par défaut. Ils doivent conserver leur chemin de livraison direct jusqu'à ce qu'ils choisissent explicitement le nouveau contexte d'envoi avec une cible complète, un adaptateur sécurisé pour la relecture, un contrat de reçu et des hooks d'effets secondaires du canal.

Les assistants de compatibilité publique tels que `recordInboundSessionAndDispatchReply`, `dispatchInboundReplyWithBase` et les assistants DM directs doivent rester préservateurs du comportement pendant la migration. Ils ne doivent pas appeler la livraison durable générique avant les rappels `deliver` ou `reply` détenus par l'appelant.

## Options d'enregistrement

L'étape d'enregistrement (record) encapsule `recordInboundSession`. La plupart des channels peuvent utiliser les valeurs par défaut. Remplacez-les via `record` :

```typescript
record: {
  groupResolution,
  createIfMissing: true,
  updateLastRoute,
  onRecordError: (err) => log.warn("record failed", err),
  trackSessionMetaTask: (task) => pendingTasks.push(task),
}
```

Le répartiteur (dispatcher) attend l'étape d'enregistrement. Si l'enregistrement génère une erreur, le noyau exécute `onPreDispatchFailure` (lorsqu'il est fourni à `runPrepared`) et relance l'erreur.

## Observabilité

Chaque étape émet un événement structuré lorsqu'un rappel `log` est fourni :

```typescript
await runtime.channel.turn.run({
  channel: "twitch",
  accountId,
  raw,
  adapter,
  log: (event) => {
    runtime.log?.debug?.(`turn.${event.stage}:${event.event}`, {
      channel: event.channel,
      accountId: event.accountId,
      messageId: event.messageId,
      sessionKey: event.sessionKey,
      admission: event.admission,
      reason: event.reason,
    });
  },
});
```

Étapes enregistrées : `ingest`, `classify`, `preflight`, `resolve`, `authorize`, `assemble`, `record`, `dispatch`, `finalize`. Évitez d'enregistrer les corps bruts ; utilisez `MessageFacts.preview` pour de courtes aperçus expurgés.

## Ce qui reste local au channel

Le noyau est propriétaire de l'orchestration. Le channel est toujours propriétaire de :

- Transports de plateforme (passerelle, REST, websocket, interrogation, webhooks)
- Résolution d'identité et correspondance de nom d'affichage
- Commandes natives, commandes slash, autocomplétion, modales, boutons, état vocal
- Rendu des cartes (cards), modales et cartes adaptatives
- Authentification des médias, règles CDN, médias chiffrés, transcription
- API de modification, de réaction, de suppression et de présence
- Rétrochargement (backfill) et récupération de l'historique côté plateforme
- Flux d'appariement nécessitant une vérification spécifique à la plateforme

Si deux channels commencent à avoir besoin du même assistant pour l'un de ces éléments, extrayez un assistant SDK partagé au lieu de le pousser dans le noyau.

## Stabilité

`runtime.channel.turn.*` fait partie de la surface publique du runtime des plugins. Les types de faits (`SenderFacts`, `ConversationFacts`, `RouteFacts`, `ReplyPlanFacts`, `AccessFacts`, `MessageFacts`, `SupplementalContextFacts`, `InboundMediaFacts`) et les formes d'admission (`ChannelTurnAdmission`, `ChannelEventClass`) sont accessibles via `PluginRuntime` à partir de `openclaw/plugin-sdk/core`.

Les règles de compatibilité ascendante s'appliquent : les nouveaux champs de fait sont additifs, les types d'admission ne sont pas renommés et les noms des points d'entrée restent stables. Les nouveaux besoins de canal qui nécessitent un changement non additif doivent passer par le processus de migration du SDK de plug-in.

## Connexes

- [Refactorisation du cycle de vie des messages](/fr/concepts/message-lifecycle-refactor) pour le cycle de vie planifié envoyer/recevoir/en direct qui enveloppera ce noyau
- [Création de plug-ins de canal](/fr/plugins/sdk-channel-plugins) pour le contrat de plug-in de canal plus large
- [Aides d'exécution de plug-in](/fr/plugins/sdk-runtime) pour d'autres surfaces `runtime.*`
- [Fonctionnalités internes des plug-ins](/fr/plugins/architecture-internals) pour le pipeline de chargement et les mécanismes de registre
