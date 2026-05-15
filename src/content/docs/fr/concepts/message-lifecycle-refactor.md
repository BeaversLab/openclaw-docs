---
summary: "Plan de conception pour le cycle de vie unifié et durable des messages : réception, envoi, prévisualisation, modification et diffusion"
read_when:
  - Refactoring channel send or receive behavior
  - Changing channel turn, reply dispatch, outbound queue, preview streaming, or plugin SDK message APIs
  - Designing a new channel plugin that needs durable sends, receipts, previews, edits, or retries
title: "Refactorisation du cycle de vie des messages"
---

Cette page présente la conception cible pour remplacer les assistants dispersés de tour de channel, d'envoi de réponse, de diffusion de prévisualisation et de livraison sortante par un cycle de vie de message durable.

La version courte :

- Les primitives centrales doivent être **receive** (réception) et **send** (envoi), et non **reply** (réponse).
- Une réponse n'est qu'une relation sur un message sortant.
- Un tour est une commodité de traitement entrant, et non le propriétaire de la livraison.
- L'envoi doit être basé sur le contexte : `begin`, rendu, prévisualisation ou diffusion, envoi final, validation (commit), échec.
- La réception doit également être basée sur le contexte : normalisation, déduplication, routage, enregistrement, distribution, accusé de réception de la plateforme, échec.
- Le SDK public de plugin devrait se réduire à une petite surface de message de channel.

## Problèmes

La pile de channels actuelle a grandi à partir de plusieurs besoins locaux valides :

- Les adaptateurs entrants simples utilisent `runtime.channel.turn.run`.
- Les adaptateurs riches utilisent `runtime.channel.turn.runPrepared`.
- Les assistants hérités utilisent `dispatchInboundReplyWithBase`, `recordInboundSessionAndDispatchReply`, les assistants de payload de réponse, le découpage en chunks de réponse, les références de réponse et les assistants d'exécution sortante.
- La diffusion de prévisualisation réside dans les répartiteurs spécifiques aux channels.
- La durabilité de la livraison finale est en cours d'ajout autour des chemins de payload de réponse existants.

Cette forme corrige des bugs locaux, mais elle laisse OpenClaw avec trop de concepts publics et trop d'endroits où la sémantique de livraison peut dériver.

Le problème de fiabilité qui a exposé cela est :

```text
Telegram polling update acked
  -> assistant final text exists
  -> process restarts before sendMessage succeeds
  -> final response is lost
```

L'invariant cible est plus large que Telegram : une fois que le cœur décide qu'un message sortant visible devrait exister, l'intention doit être durable avant que l'envoi sur la plateforme ne soit tenté, et le reçu de la plateforme doit être validé après succès. Cela offre à OpenClaw une récupération au moins une fois. Le comportement exactement une fois n'existe que pour les adaptateurs qui peuvent prouver une idempotence native ou réconcilier une tentative inconnue après envoi par rapport à l'état de la plateforme avant la relecture.

C'est l'état final de cette refactorisation, et non une description de chaque chemin actuel. Lors de la migration, les assistants d'envoi existants peuvent encore revenir à un envoi direct lorsque les écritures en file d'attente du meilleur effort échouent. La refactorisation n'est terminée que lorsque les envois finaux durables échouent de manière fermée ou qu'ils désactivent explicitement cette option avec une stratégie non durable documentée.

## Objectifs

- Un cycle de vie principal pour tous les chemins de réception et d'envoi de messages de channel.
- Envois finaux durables par défaut dans le nouveau cycle de vie des messages après qu'un adaptateur a déclaré un comportement sécurisé pour la relecture.
- Sémantiques partagées pour l'aperçu, l'édition, le flux, la finalisation, la nouvelle tentative, la récupération et les accusés de réception.
- Une petite surface SDK de plugin que les plugins tiers peuvent apprendre et maintenir.
- Compatibilité pour les appelants `channel.turn` existants pendant la migration.
- Des points d'extension clairs pour les nouvelles capacités de channel.
- Aucune branche spécifique à la plateforme dans le cœur.
- Pas de messages de channel à delta de jetons. Le streaming de channel reste un aperçu de message, une édition, un ajout ou une livraison de bloc terminé.
- Métadonnées structurées d'origine OpenClaw pour la sortie opérationnelle/système afin que les défaillances de passerelle visibles ne réintègrent pas les salles partagées activées pour les bots sous forme de nouveaux prompts.

## Non-objectifs

- Ne pas supprimer `runtime.channel.turn.*` dans la première phase.
- Ne pas forcer chaque channel dans le même comportement de transport natif.
- Ne pas apprendre au cœur les sujets Telegram, les flux natifs Slack, les rétractations Matrix, les cartes Feishu, la voix QQ ou les activités Teams.
- Ne pas publier tous les assistants de migration internes en tant qu'API SDK stable.
- Ne pas faire en sorte que les nouvelles tentatives rejouent des opérations de plateforme non idempotentes terminées.

## Modèle de référence

Le Chat Vercel a un bon modèle mental public :

- `Chat`
- `Thread`
- `Channel`
- `Message`
- méthodes d'adaptateur telles que `postMessage`, `editMessage`, `deleteMessage`,
  `stream`, `startTyping`, et les récupérations d'historique
- un adaptateur d'état pour la déduplication, les verrous, les files d'attente et la persistance

OpenClaw devrait emprunter le vocabulaire, et non copier la surface.

Ce dont OpenClaw a besoin au-delà de ce modèle :

- Intentions d'envoi sortantes durables avant les appels de transport directs.
- Contextes d'envoi explicites avec begin, commit et fail.
- Contextes de réception qui connaissent la stratégie d'accusé de réception de la plateforme.
- Reçus qui survivent aux redémarrages et peuvent piloter les modifications, les suppressions, les récupérations et
  la suppression des doublons.
- Un SDK public plus petit. Les plugins groupés peuvent utiliser des assistants d'exécution internes, mais
  les plugins tiers devraient voir une API de message cohérente.
- Comportement spécifique à l'agent : sessions, transcriptions, block streaming, progression de l'outil,
  approbations, directives média, réponses silencieuses et historique des mentions de groupe.

Les promesses de style `thread.post()`OpenClaw ne suffisent pas pour OpenClaw. Elles masquent la
limite de la transaction qui décide si un envoi est récupérable.

## Modèle principal

Le nouveau domaine devrait vivre dans un espace de noms principal interne tel que
`src/channels/message/*`.

Il a quatre concepts :

```typescript
core.messages.receive(...)
core.messages.send(...)
core.messages.live(...)
core.messages.state(...)
```

`receive` possède le cycle de vie entrant.

`send` possède le cycle de vie sortant.

`live` possède l'aperçu, la modification, la progression et l'état du flux.

`state` possède le stockage durable des intentions, les reçus, l'idempotence, la récupération, les verrous et
la déduplication.

## Termes de message

### Message

Un message normalisé est neutre par rapport à la plateforme :

```typescript
type ChannelMessage = {
  id: string;
  channel: string;
  accountId?: string;
  direction: "inbound" | "outbound";
  target: MessageTarget;
  sender?: MessageActor;
  body?: MessageBody;
  attachments?: MessageAttachment[];
  relation?: MessageRelation;
  origin?: MessageOrigin;
  timestamp?: number;
  raw?: unknown;
};
```

### Cible

La cible décrit où réside le message :

```typescript
type MessageTarget = {
  kind: "direct" | "group" | "channel" | "thread";
  id: string;
  label?: string;
  spaceId?: string;
  parentId?: string;
  threadId?: string;
  nativeChannelId?: string;
};
```

### Relation

La réponse est une relation, pas une racine d'API :

```typescript
type MessageRelation =
  | {
      kind: "reply";
      inboundMessageId?: string;
      replyToId?: string;
      threadId?: string;
      quote?: MessageQuote;
    }
  | {
      kind: "followup";
      sessionKey?: string;
      previousMessageId?: string;
    }
  | {
      kind: "broadcast";
      reason?: string;
    }
  | {
      kind: "system";
      reason: "approval" | "task" | "hook" | "cron" | "subagent" | "message_tool" | "cli" | "control_ui" | "automation" | "error";
    };
```

Cela permet au même chemin d'envoi de gérer les réponses normales, les notifications cron, les invites d'approbation,
les achèvements de tâches, les envois d'outils de message, les envois depuis la CLI ou l'UI de contrôle, les résultats
de sous-agent et les envois d'automatisation.

### Origine

L'origine décrit qui a produit un message et comment OpenClaw doit traiter les échos de
ce message. Elle est distincte de la relation : un message peut être une réponse à un utilisateur
et toujours être une sortie opérationnelle provenant d'OpenClaw.

```typescript
type MessageOrigin =
  | {
      source: "openclaw";
      schemaVersion: 1;
      kind: "gateway_failure";
      code: "agent_failed_before_reply" | "missing_api_key" | "model_login_expired";
      echoPolicy: "drop_bot_room_echo";
    }
  | {
      source: "user" | "external_bot" | "platform" | "unknown";
    };
```

Core possède la signification de la sortie provenant d'OpenClaw. Les canaux possèdent la manière dont cette
origine est encodée dans leur transport.

La première utilisation requise est la sortie de défaillance de la passerelle. Les utilisateurs humains doivent toujours voir des messages tels que "Agent a échoué avant la réponse" ou "Clé API manquante", mais la sortie opérationnelle APIOpenClaw étiquetée ne doit pas être acceptée en tant que saisie provenant du bot dans les salons partagés lorsque `allowBots` est activé.

### Accusé de réception

Les accusés de réception sont de premier ordre :

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  sentAt: number;
  raw?: unknown;
};

type MessageReceiptPart = {
  platformMessageId: string;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  index: number;
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  raw?: unknown;
};
```

Les accusés de réception sont le pont entre l'intention durable et la modification, la suppression, la finalisation de l'aperçu, la suppression des doublons et la récupération futures.

Un accusé de réception peut décrire un message de plateforme ou une livraison en plusieurs parties. Le texte fractionné, le média plus le texte, la voix plus le texte et les solutions de repli des cartes doivent préserver tous les identifiants de plateforme tout en exposant toujours un identifiant principal pour le fil de discussion et les modifications ultérieures.

## Contexte de réception

La réception ne doit pas être un simple appel d'assistant. Le cœur a besoin d'un contexte qui connaît la déduplication, le routage, l'enregistrement de session et la stratégie d'accusé de réception de la plateforme.

```typescript
type MessageReceiveContext = {
  id: string;
  channel: string;
  accountId?: string;
  input: ChannelMessage;
  ack: ReceiveAckController;
  route: MessageRouteController;
  session: MessageSessionController;
  log: MessageLifecycleLogger;

  dedupe(): Promise<ReceiveDedupeResult>;
  resolve(): Promise<ResolvedInboundMessage>;
  record(resolved: ResolvedInboundMessage): Promise<RecordResult>;
  dispatch(recorded: RecordResult): Promise<DispatchResult>;
  commit(result: DispatchResult): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

Flux de réception :

```text
platform event
  -> begin receive context
  -> normalize
  -> classify
  -> dedupe and self-echo gate
  -> route and authorize
  -> record inbound session metadata
  -> dispatch agent run
  -> durable outbound sends happen through send context
  -> commit receive
  -> ack platform when policy allows
```

L'accusé de réception (Ack) n'est pas une chose unique. Le contrat de réception doit maintenir ces signaux séparés :

- **Accusé de réception de transport (Transport ack) :** indique au webhook ou à la socket de la plateforme que OpenClaw a accepté l'enveloppe de l'événement. Certaines plateformes l'exigent avant l'envoi.
- **Accusé de réception du décalage de sondage (Polling offset ack) :** fait avancer un curseur pour que le même événement ne soit pas récupéré à nouveau. Cela ne doit pas dépasser le travail qui ne peut pas être récupéré.
- **Accusé de réception de l'enregistrement entrant (Inbound record ack) :** confirme que OpenClaw a persisté suffisamment de métadonnées entrantes pour dédupliquer et router une nouvelle livraison.
- **Accusé de réception visible par l'utilisateur :** comportement facultatif de lecture/état/frappe ; n'est jamais une limite de durabilité.

`ReceiveAckPolicy` contrôle uniquement l'accusé de réception du transport ou du sondage. Il ne doit pas être réutilisé pour les accusés de réception de lecture ou les réactions d'état.

Avant l'autorisation du bot, la réception doit appliquer la stratégie d'écho partagée OpenClaw lorsque le canal peut décoder les métadonnées d'origine du message :

```typescript
function shouldDropOpenClawEcho(params: { origin?: MessageOrigin; isBotAuthor: boolean; isRoomish: boolean }): boolean {
  return params.isBotAuthor && params.isRoomish && params.origin?.source === "openclaw" && params.origin.kind === "gateway_failure" && params.origin.echoPolicy === "drop_bot_room_echo";
}
```

Ce rejet est basé sur les balises, non sur le texte. Un message de salon créé par le bot avec le même texte visible de défaillance de la passerelle mais sans les métadonnées d'origine OpenClaw passe toujours par l'autorisation normale `allowBots`.

La stratégie d'accusé de réception est explicite :

```typescript
type ReceiveAckPolicy = { kind: "immediate"; reason: "webhook-timeout" | "platform-contract" } | { kind: "after-record" } | { kind: "after-durable-send" } | { kind: "manual" };
```

Le polling Telegram utilise désormais la stratégie d'accusé de réception du contexte de réception (receive-context ack policy) pour son filigrane de redémarrage persistant. Le tracker observe toujours les mises à jour grammY lorsqu'elles entrent dans la chaîne de middleware, mais OpenClaw ne persiste que l'identifiant de mise à jour complétée en sécurité après répartition réussie, laissant les mises à jour échouées ou en attente de priorité inférieure rejouables après un redémarrage. Le décalage de récupération (fetch offset) en amont de TelegramgrammYOpenClawTelegram`getUpdates`OpenClaw est toujours contrôlé par la bibliothèque de polling, la coupure plus profonde restante consiste donc en une source de polling entièrement durable si nous avons besoin d'une nouvelle livraison au niveau de la plate-forme au-delà du filigrane de redémarrage d'OpenClaw. Les plates-formes de webhook peuvent avoir besoin d'un accusé de réception HTTP immédiat, mais elles ont toujours besoin d'une déduplication entrante et d'intentions d'envoi sortantes durables car les webhooks peuvent livrer à nouveau.

## Contexte d'envoi

L'envoi est également basé sur le contexte :

```typescript
type MessageSendContext = {
  id: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  intent: DurableSendIntent;
  attempt: number;
  signal: AbortSignal;
  previousReceipt?: MessageReceipt;
  preview?: LiveMessageState;
  log: MessageLifecycleLogger;

  render(): Promise<RenderedMessageBatch>;
  previewUpdate(rendered: RenderedMessageBatch): Promise<LiveMessageState>;
  send(rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit(receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete(receipt: MessageReceipt): Promise<void>;
  commit(receipt: MessageReceipt): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

Orchestration préférée :

```typescript
await core.messages.withSendContext(message, async (ctx) => {
  const rendered = await ctx.render();

  if (ctx.preview?.canFinalizeInPlace) {
    return await ctx.edit(ctx.preview.receipt, rendered);
  }

  return await ctx.send(rendered);
});
```

L'assistant s'étend à :

```text
begin durable intent
  -> render
  -> optional preview/edit/stream work
  -> mark sending
  -> final platform send or final edit
  -> mark committing with raw receipt
  -> commit receipt
  -> ack durable intent
  -> fail durable intent on classified failure
```

L'intention doit exister avant l'E/S de transport. Un redémarrage après le début mais avant la validation est récupérable.

La limite dangereuse se situe après le succès de la plate-forme et avant la validation du reçu. Si un processus meurt à ce moment-là, OpenClaw ne peut pas savoir si le message de la plate-forme existe, à moins que l'adaptateur ne fournisse une idempotence native ou un chemin de réconciliation des reçus. Ces tentatives doivent reprendre dans OpenClaw`unknown_after_send`, et non un rejeu aveugle. Les canaux sans réconciliation peuvent choisir un rejeu au moins une fois uniquement si les messages visibles en double sont un compromis acceptable et documenté pour ce canal et cette relation. Le pont de réconciliation du SDK actuel exige de l'adaptateur de déclarer `reconcileUnknownSend`, puis demande à `durableFinal.reconcileUnknownSend` de classer une entrée inconnue comme `sent`, `not_sent`, ou `unresolved` ; seul `not_sent` autorise le rejeu, et les entrées non résolues restent terminales ou ne réessaient que la vérification de réconciliation.

La politique de durabilité doit être explicite :

```typescript
type MessageDurabilityPolicy = "required" | "best_effort" | "disabled";
```

`required` signifie que le composant principal doit échouer de manière sécurisée (fail closed) lorsqu'il ne peut pas écrire l'intention durable. `best_effort` peut être utilisé par défaut lorsque la persistance n'est pas disponible. `disabled` conserve l'ancien comportement d'envoi direct. Pendant la migration, les wrappers legacy et les aides de compatibilité publique utilisent `disabled` par défaut ; ils ne doivent pas déduire `required` du fait qu'un channel possède un adaptateur de sortie générique.

Les contextes d'envoi possèdent également les effets post-envoi locaux au channel. Une migration n'est pas sûre si la livraison durable contourne le comportement local qui était précédemment attaché au chemin d'envoi direct du channel. Les exemples incluent les caches de suppression d'écho de soi, les marqueurs de participation aux fils de discussion, les ancres d'édition natives, le rendu des signatures de model, et les gardes contre les doublons spécifiques à la plateforme. Ces effets doivent soit être déplacés vers l'adaptateur d'envoi, l'adaptateur de rendu, ou un hook de contexte d'envoi nommé avant que ce channel puisse activer la livraison finale générique durable.

Les helpers d'envoi doivent renvoyer des reçus jusqu'à leur appelant. Les wrappers durables ne peuvent pas avaler les ids de message ou remplacer un résultat de livraison de channel par `undefined` ; les répartiteurs tamponnés utilisent ces ids pour les ancres de fils de discussion, les modifications ultérieures, la finalisation des aperçus et la suppression des doublons.

Les envois de repli (fallback) opèrent sur des lots, pas sur des charges utiles uniques. Les réécritures de réponse silencieuse, le repli média, le repli carte et la projection de chunk peuvent tous produire plus d'un message livrable, donc un contexte d'envoi doit soit livrer le lot projeté entier, soit documenter explicitement pourquoi une seule charge utile est valide.

```typescript
type RenderedMessageBatch = {
  units: RenderedMessageUnit[];
  atomicity: "all_or_retry_remaining" | "best_effort_parts";
  idempotencyKey: string;
};

type RenderedMessageUnit = {
  index: number;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  payload: unknown;
  required: boolean;
};
```

Lorsqu'un tel repli est durable, tout le lot projeté doit être représenté par une intention d'envoi durable ou un autre plan de lot atomique. Enregistrer chaque charge utile une par une ne suffit pas : un plantage entre les charges utiles peut laisser un repli partiel visible sans enregistrement durable pour les charges utiles restantes. La récupération doit savoir quelles unités ont déjà des reçus et soit rejouer uniquement les unités manquantes, soit marquer le lot `unknown_after_send` jusqu'à ce que l'adaptateur le réconcilie.

## Live context

Le comportement d'aperçu, d'édition, de progression et de flux devrait constituer un cycle de vie optionnel unique.

```typescript
type MessageLiveAdapter = {
  begin?(ctx: MessageSendContext): Promise<LiveMessageState>;
  update?(ctx: MessageSendContext, state: LiveMessageState, update: LiveMessageUpdate): Promise<LiveMessageState>;
  finalize?(ctx: MessageSendContext, state: LiveMessageState, final: RenderedMessageBatch): Promise<MessageReceipt>;
  cancel?(ctx: MessageSendContext, state: LiveMessageState, reason: LiveCancelReason): Promise<void>;
};
```

L'état en direct est suffisamment durable pour permettre la récupération ou la suppression des doublons :

```typescript
type LiveMessageState = {
  mode: "partial" | "block" | "progress" | "native";
  receipt?: MessageReceipt;
  visibleSince?: number;
  canFinalizeInPlace: boolean;
  lastRenderedHash?: string;
  staleAfterMs?: number;
};
```

Cela devrait couvrir le comportement actuel :

- Telegram envoi plus édition de l'aperçu, avec une nouvelle version finale après l'obsolescence de l'aperçu.
- Discord envoi plus édition de l'aperçu, annulation en cas de média/erreur/réponse explicite.
- Slack flux natif ou aperçu de brouillon selon la forme du fil de discussion.
- Mattermost finalisation du brouillon de publication.
- Matrix finalisation de l'événement brouillon ou suppression en cas de non-concordance.
- Flux de progression natif Teams.
- Flux du bot QQ ou repli accumulé.

## Surface de l'adaptateur

La cible du SDK public doit être un sous-chemin :

```typescript
import { defineChannelMessageAdapter } from "openclaw/plugin-sdk/channel-message";
```

Forme de la cible :

```typescript
type ChannelMessageAdapter = {
  receive?: MessageReceiveAdapter;
  send: MessageSendAdapter;
  live?: MessageLiveAdapter;
  origin?: MessageOriginAdapter;
  render?: MessageRenderAdapter;
  capabilities: MessageCapabilities;
};
```

Adaptateur d'envoi :

```typescript
type MessageSendAdapter = {
  send(ctx: MessageSendContext, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit?(ctx: MessageSendContext, receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  classifyError?(ctx: MessageSendContext, error: unknown): DeliveryFailureKind;
  reconcileUnknownSend?(ctx: MessageSendContext): Promise<MessageReceipt | null>;
  afterSendSuccess?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  afterCommit?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
};
```

Adaptateur de réception :

```typescript
type MessageReceiveAdapter<TRaw = unknown> = {
  normalize(raw: TRaw, ctx: MessageNormalizeContext): Promise<ChannelMessage>;
  classify?(message: ChannelMessage): Promise<MessageEventClass>;
  preflight?(message: ChannelMessage, event: MessageEventClass): Promise<MessagePreflightResult>;
  ackPolicy?(message: ChannelMessage, event: MessageEventClass): ReceiveAckPolicy;
};
```

Avant l'autorisation préalable au vol, le cœur doit exécuter le prédicat d'écho partagé OpenClaw
chaque fois que `origin.decode` renvoie des métadonnées d'origine OpenClaw. L'adaptateur de réception
fournit des faits sur la plate-forme tels que l'auteur du bot et la forme de la salle ; le cœur possède la décision
de suppression et l'ordonnancement afin que les canaux ne réimplémentent pas les filtres de texte.

Adaptateur d'origine :

```typescript
type MessageOriginAdapter<TRaw = unknown, TNative = unknown> = {
  encode?(origin: MessageOrigin): TNative | undefined;
  decode?(raw: TRaw): MessageOrigin | undefined;
};
```

Le cœur définit `MessageOrigin`. Les canaux le traduisent uniquement vers et depuis les métadonnées de
transport natif. Slack mappe ceci vers `chat.postMessage({ metadata })` et
`message.metadata` entrant ; Matrix peut le mapper vers du contenu d'événement supplémentaire ; les canaux
sans métadonnées natives peuvent utiliser un registre de réception/sortant lorsque c'est la
meilleure approximation disponible.

Capacités :

```typescript
type MessageCapabilities = {
  text: { maxLength?: number; chunking?: boolean };
  attachments?: {
    upload: boolean;
    remoteUrl: boolean;
    voice?: boolean;
  };
  threads?: {
    reply: boolean;
    topic?: boolean;
    nativeThread?: boolean;
  };
  live?: {
    edit: boolean;
    delete: boolean;
    nativeStream?: boolean;
    progress?: boolean;
  };
  delivery?: {
    idempotencyKey?: boolean;
    retryAfter?: boolean;
    receiptRequired?: boolean;
  };
};
```

## Réduction du SDK public

La nouvelle surface publique devrait absorber ou déprécier ces zones conceptuelles :

- `reply-runtime`
- `reply-dispatch-runtime`
- `reply-reference`
- `reply-chunking`
- `reply-payload`
- `inbound-reply-dispatch`
- `channel-reply-pipeline`
- la plupart des utilisations publiques de `outbound-runtime`
- assistants de cycle de vie de flux de brouillon ad hoc

Les sous-chemins de compatibilité peuvent rester en tant que wrappers, mais les nouveaux plugins tiers
ne devraient pas en avoir besoin.

Les plugins groupés peuvent conserver des importations d'assistants internes via des sous-chemins
d'exécution réservés lors de la migration. La documentation publique devrait orienter les auteurs de plugins
vers `plugin-sdk/channel-message` une fois qu'il existe.

## Relation avec le tour de canal

`runtime.channel.turn.*` doit rester pendant la migration.

Il doit devenir un adaptateur de compatibilité :

```text
channel.turn.run
  -> messages.receive context
  -> session dispatch
  -> messages.send context for visible output
```

`channel.turn.runPrepared` doit également rester initialement :

```text
channel-owned dispatcher
  -> messages.receive record/finalize bridge
  -> messages.live for preview/progress
  -> messages.send for final delivery
```

Une fois que tous les plugins groupés et les chemins de compatibilité tiers connus sont pontés,
`channel.turn` peut être déprécié. Il ne doit pas être supprimé tant qu'il n'existe pas
un chemin de migration SDK publié et des tests de contrat prouvant que les anciens plugins fonctionnent toujours
ou échouent avec une erreur de version claire.

## Garanties de compatibilité

Pendant la migration, la livraison générique durable est facultatif (opt-in) pour tout channel dont
le rappel de livraison existant a des effets secondaires au-delà de « envoyer cette charge utile ».

Les points d'entrée hérités sont non durables par défaut :

- `channel.turn.run` et `dispatchAssembledChannelTurn` utilisent le
  rappel de livraison du channel sauf si ce channel fournit explicitement un objet de stratégie/options
  durable audité.
- `channel.turn.runPrepared` reste la propriété du channel jusqu'à ce que le
  répartiteur préparé appelle explicitement le contexte d'envoi.
- Les aides de compatibilité publiques telles que `recordInboundSessionAndDispatchReply`,
  `dispatchInboundReplyWithBase` et les aides de DM direct n'injectent jamais de livraison
  générique durable avant le rappel `deliver` ou `reply` fourni par l'appelant.

Pour les types de pont de migration, `durable: undefined` signifie « non durable ». Le
chemin durable est activé uniquement par une valeur de stratégie/options explicite. `durable:
false` peut rester comme une orthographe de compatibilité, mais l'implémentation ne doit pas
obliger chaque channel non migré à l'ajouter.

Le code de pont actuel doit garder la décision de durabilité explicite :

- La livraison finale durable renvoie un statut discriminé. `handled_visible` et
  `handled_no_send` sont terminaux ; `unsupported` et `not_applicable` peuvent revenir
  à la livraison propriétaire du channel ; `failed` propage l'échec de l'envoi.
- La livraison finale générique durable est conditionnée par des capacités d'adaptateur telles que
  la livraison silencieuse, la préservation de la cible de réponse, la préservation des citations natives, et
  les crochets (hooks) d'envoi de messages. Le manque de parité doit choisir la livraison propriétaire du channel,
  et non un envoi générique qui modifie le comportement visible par l'utilisateur.
- Les envois durables soutenus par une file exposent une référence d'intention de livraison. Les champs de `pendingFinalDelivery*` session existants peuvent porter l'identifiant de l'intention pendant la transition ; l'état final est un `MessageSendIntent` store au lieu du texte de réponse gelé plus des champs de contexte ad hoc.

N'activez pas le chemin durable générique pour un channel tant que toutes les conditions suivantes ne sont pas vraies :

- L'adaptateur d'envoi générique exécute le même rendu et le même comportement de transport que l'ancien chemin direct.
- Les effets secondaires locaux post-envoi sont préservés via le contexte d'envoi.
- L'adaptateur renvoie des accusés de réception ou des résultats de livraison avec tous les identifiants de message de la plateforme.
- Les chemins du répartiteur préparé (dispatcher) appellent soit le nouveau contexte d'envoi, soit restent documentés comme étant en dehors de la garantie durable.
- La livraison de repli (fallback) gère chaque charge utile projetée, pas seulement la première.
- La livraison de repli durable enregistre l'intégralité du tableau de charges utiles projetées comme une intention rejouable ou un plan par lots.

Risques concrets de migration à préserver :

- Le moniteur de livraison iMessage enregistre les messages envoyés dans un cache d'écho après un envoi réussi. Les envois finaux durables doivent toujours remplir ce cache, sinon OpenClaw peut réingérer ses propres réponses finales en tant que messages utilisateur entrants.
- Tlon ajoute une signature de model optionnelle et enregistre les fils de discussion participés après les réponses de groupe. La livraison durable générique ne doit pas contourner ces effets ; déplacez-les soit dans les adaptateurs de rendu/envoi/finalisation Tlon, soit gardez Tlon sur le chemin propriétaire du channel.
- Discord et d'autres répartiteurs préparés possèdent déjà le comportement de livraison directe et de prévisualisation. Ils ne sont pas couverts par une garantie durable de tour assemblé jusqu'à ce que leurs répartiteurs préparés acheminent explicitement les finales via le contexte d'envoi.
- La livraison de repli silencieuse Telegram doit livrer l'intégralité du tableau de charges utiles projetées. Un raccourci à charge utile unique peut abandonner les charges utiles de repli supplémentaires après la projection.
- LINE, Zalo, Nostr et autres chemins assemblés/helper existants peuvent
  avoir une gestion des reply-tokens, un proxy média, des caches de messages envoyés, un nettoyage du chargement/du statut
  ou des cibles callback uniquement. Ils restent sur une livraison détenue par le canal jusqu'à ce que
  ces sémantiques soient représentées par l'adaptateur d'envoi et vérifiées par les tests.
- Les helpers Direct-DM peuvent avoir un callback de réponse qui est la seule cible de transport
  correcte. La sortie générique ne doit pas deviner à partir de `OriginatingTo` ou `To` et ignorer
  ce callback.
- La sortie d'échec de la passerelle OpenClaw doit rester visible pour les humains, mais les échos de salle
  créés par des bots balisés doivent être supprimés avant l'autorisation `allowBots`.
  Les canaux ne doivent pas implémenter cela avec des filtres de préfixe de texte visible, sauf comme
  mesure d'urgence de courte durée ; le contrat durable est les métadonnées d'origine structurées.

## Stockage interne

La file d'attente durable devrait stocker les intentions d'envoi de messages, pas les payloads de réponse.

```typescript
type DurableSendIntent = {
  id: string;
  idempotencyKey: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  batch?: RenderedMessageBatch;
  liveState?: LiveMessageState;
  status: "pending" | "sending" | "committing" | "unknown_after_send" | "sent" | "failed" | "cancelled";
  attempt: number;
  nextAttemptAt?: number;
  receipt?: MessageReceipt;
  partialReceipt?: MessageReceipt;
  failure?: DeliveryFailure;
  createdAt: number;
  updatedAt: number;
};
```

Boucle de récupération :

```text
load pending or sending intents
  -> acquire idempotency lock
  -> skip if receipt already committed
  -> reconstruct send context
  -> render if needed
  -> reconcile unknown_after_send if needed
  -> call adapter send/edit/finalize
  -> commit receipt, mark unknown_after_send, or schedule retry
```

La file d'attente doit conserver suffisamment d'identité pour rejouer via le même compte,
fil de discussion, cible, politique de formatage et règles de média après redémarrage.

## Classes d'échec

Les adaptateurs de canal classifient les échecs de transport dans des catégories fermées :

```typescript
type DeliveryFailureKind = "transient" | "rate_limit" | "auth" | "permission" | "not_found" | "invalid_payload" | "conflict" | "cancelled" | "unknown";
```

Politique principale :

- Réessayer `transient` et `rate_limit`.
- Ne pas réessayer `invalid_payload` sauf si un repli de rendu existe.
- Ne pas réessayer `auth` ou `permission` jusqu'à ce que la configuration change.
- Pour `not_found`, laisser la finalisation en direct revenir de l'édition à un nouvel envoi lorsque
  le canal déclare cela sûr.
- Pour `conflict`, utiliser les règles de reçu/d'idempotence pour décider si le message
  existe déjà.
- Toute erreur après que l'adaptateur peut avoir terminé les E/S de la plate-forme mais avant le commit
  du reçu devient `unknown_after_send` à moins que l'adaptateur ne puisse prouver que l'opération
  de la plate-forme n'a pas eu lieu.

## Mappage de canal

| Canal           | Migration de cible                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Telegram        | Politique d'accusé de réception de réception plus envois finaux durables. L'adaptateur en direct possède l'envoi plus l'aperçu d'édition, l'envoi final de l'aperçu périmé, les sujets, le saut de l'aperçu de réponse quote-reply, le repli média et la gestion du retry-after.                                                                                                                                                                                                                                                                             |
| Discord         | L'adaptateur d'envoi encapsule la livraison durable de la charge utile existante. L'adaptateur en direct gère la modification du brouillon, le brouillon de progression, l'annulation de l'aperçu des médias/erreurs, la conservation de la cible de réponse et les accusés de réception de l'identifiant du message. Auditer les échos d'échec de passerelle générés par le bot dans les salons partagés ; utiliser un registre sortant ou un autre équivalent natif si Discord ne peut pas transporter les métadonnées d'origine sur les messages normaux. |
| Slack           | L'adaptateur d'envoi gère les publications de chat normales. L'adaptateur en direct choisit le flux natif lorsque la forme du fil le prend en charge, sinon l'aperçu du brouillon. Les accusés de réception préservent les horodatages des fils. L'adaptateur d'origine mappe les échecs de passerelle OpenClaw sur le Slack `chat.postMessage.metadata` et supprime les échos de salon de bot étiquetés avant l'autorisation `allowBots`.                                                                                                                   |
| WhatsApp        | L'adaptateur d'envoi gère l'envoi de texte/médias avec des intentions finales durables. L'adaptateur de réception gère les mentions de groupe et l'identité de l'expéditeur. L'adaptateur en direct peut rester absent jusqu'à ce que WhatsApp dispose d'un transport modifiable.                                                                                                                                                                                                                                                                            |
| Matrix          | L'adaptateur en direct gère les modifications des événements de brouillon, la finalisation, la radiation, les contraintes des médias chiffrés et le secours en cas de non-concordance de la cible de réponse. L'adaptateur de réception gère l'hydratation et la déduplication des événements chiffrés. L'adaptateur d'origine devrait encoder l'origine de l'échec de passerelle OpenClaw dans le contenu de l'événement Matrix et supprimer les échos de salon de bot configurés avant le traitement `allowBots`.                                          |
| Mattermost      | L'adaptateur en direct gère une publication de brouillon, le repli progression/outil, la finalisation sur place et le secours d'envoi frais.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Microsoft Teams | L'adaptateur en direct gère le comportement de flux de progression et de bloc natif. L'adaptateur d'envoi gère les activités et les accusés de réception des pièces jointes/cartes.                                                                                                                                                                                                                                                                                                                                                                          |
| Feishu          | L'adaptateur de rendu gère le rendu texte/carte/brut. L'adaptateur en direct gère le flux continu des cartes et la suppression des doublons finaux. L'adaptateur d'envoi gère les commentaires, les sessions de sujet, les médias et la suppression vocale.                                                                                                                                                                                                                                                                                                  |
| Bot QQ          | L'adaptateur en direct gère le flux continu C2C, le délai d'attente de l'accumulateur et l'envoi final de secours. L'adaptateur de rendu gère les balises médias et le texte-voix.                                                                                                                                                                                                                                                                                                                                                                           |
| Signal          | Simple adaptateur de réception et d'envoi. Pas d'adaptateur en direct sauf si signal-cli ajoute une prise en charge fiable de la modification.                                                                                                                                                                                                                                                                                                                                                                                                               |
| iMessage        | Adaptateur de réception et d'envoi simple. L'envoi iMessage doit préserver la population du cache d'écho du moniteur avant que les éléments durables finaux puissent contourner la livraison par le moniteur.                                                                                                                                                                                                                                                                                                                                                |
| Google Chat     | Adaptateur de réception et d'envoi simple avec la relation de thread mappée aux espaces et aux identifiants de thread. Vérifier le comportement de la salle `allowBots=true`OpenClaw pour les échos d'échec de passerelle OpenClaw étiquetés.                                                                                                                                                                                                                                                                                                                |
| LINE            | Adaptateur de réception et d'envoi simple avec les contraintes de jeton de réponse modélisées comme une capacité cible/relation.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Nextcloud Talk  | Pont de réception SDK plus adaptateur d'envoi.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| IRC             | Adaptateur de réception et d'envoi simple, pas d'accusés de réception d'édition durables.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Nostr           | Adaptateur de réception et d'envoi pour les DMs chiffrés ; les accusés de réception sont des identifiants d'événement.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Chaîne QA       | Adaptateur de test contractuel pour les comportements de réception, d'envoi, en direct, de nouvelle tentative et de récupération.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Synology Chat   | Adaptateur de réception et d'envoi simple.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Tlon            | L'adaptateur d'envoi doit préserver le rendu de la signature du modèle et le suivi des threads participés avant que la livraison générique finale durable soit activée.                                                                                                                                                                                                                                                                                                                                                                                      |
| Twitch          | Adaptateur de réception et d'envoi simple avec classification de la limitation de débit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Zalo            | Adaptateur de réception et d'envoi simple.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Zalo Personal   | Adaptateur de réception et d'envoi simple.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Plan de migration

### Phase 1 : Domaine de message interne

- Ajouter les types `src/channels/message/*` pour les messages, les cibles, les relations,
  les origines, les accusés de réception, les capacités, les intentions durables, le contexte de réception, le contexte d'envoi,
  le contexte en direct et les classes d'échec.
- Ajouter `origin?: MessageOrigin` au type de charge utile du pont de migration utilisé par
  la livraison de réponse actuelle, puis déplacer ce champ vers `ChannelMessage` et les types de messages
  rendus au fur et à mesure que la refactorisation remplace les charges utiles de réponse.
- Garder ceci interne jusqu'à ce que les adaptateurs et les tests prouvent la forme.
- Ajouter des tests unitaires purs pour les transitions d'état et la sérialisation.

### Phase 2 : Cœur d'envoi durable

- Déplacer la file d'attente sortante existante de la durabilité de la charge utile de réponse aux intentions
  d'envoi de messages durables.
- Permettre à une intention d'envoi durable de porter un tableau de charges utiles projetées ou un plan de lot, et non
  une seule charge utile de réponse.
- Préserver le comportement de récupération de file d'attente actuel via une conversion de compatibilité.
- Faire en sorte que `deliverOutboundPayloads` appelle `messages.send`.
- Rendre la durabilité de l'envoi final par défaut et échouer de manière fermée lorsque l'intention durable ne peut pas être écrite dans le nouveau cycle de vie des messages, après que l'adaptateur a déclaré la sécurité de la relecture. Les chemins de compatibilité existants des tours de channel et du SDK restent en envoi direct par défaut pendant cette phase.
- Enregistrer les reçus de manière cohérente.
- Renvoyer les reçus et les résultats de livraison à l'appelant du répartiteur d'origine au lieu de traiter l'envoi durable comme un effet secondaire terminal.
- Persister l'origine du message via les intentions d'envoi durables afin que la récupération, la relecture et les envois fragmentés préservent la provenance opérationnelle OpenClaw.

### Phase 3 : Pont de tour de channel

- Réimplémenter `channel.turn.run` et `dispatchAssembledChannelTurn` sur la base de `messages.receive` et `messages.send`.
- Garder les types de faits actuels stables.
- Conserver le comportement hérité par défaut. Un channel à tour assemblé ne devient durable que lorsque son adaptateur opte explicitement pour une politique de durabilité sûre en relecture.
- Conserver `durable: false` comme une échappatoire de compatibilité pour les chemins qui finalisent les modifications natives et ne peuvent pas encore relire en toute sécurité, mais ne pas compter sur les marqueurs `false` pour protéger les channels non migrés.
- Durabilité par défaut du tour assemblé uniquement dans le nouveau cycle de vie des messages, une fois que le mappage du channel prouve que le chemin d'envoi générique préserve l'ancienne sémantique de livraison du channel.

### Phase 4 : Pont du répartiteur préparé

- Remplacer `deliverDurableInboundReplyPayload` par un pont de contexte d'envoi.
- Garder l'ancien assistant comme wrapper.
- Porter Telegram, WhatsApp, Slack, Signal, iMessage et Discord en premier car ils possèdent déjà un travail final durable ou des chemins d'envoi plus simples.
- Traiter chaque répartiteur préparé comme non couvert jusqu'à ce qu'il opte explicitement pour le contexte d'envoi. La documentation et les entrées de journal des modifications doivent indiquer « tours de channel assemblés » ou nommer les chemins de channel migrés plutôt que de revendiquer toutes les réponses finales automatiques.
- Conserver `recordInboundSessionAndDispatchReply`, les assistants de DM directs et autres
  assistants de compatibilité publics préservant le comportement. Ils pourront exposer une option
  d'adhésion explicite au contexte d'envoi plus tard, mais ne doivent pas tenter automatiquement une livraison
  générique durable avant le rappel de livraison détenu par l'appelant.

### Phase 5 : Cycle de vie unifié en direct

- Construire `messages.live` avec deux adaptateurs de preuve :
  - Telegram pour l'envoi plus l'édition plus l'envoi final périmé.
  - Matrix pour la finalisation du brouillon plus le repli de rétractation.
- Ensuite, migrer Discord, Slack, Mattermost, Teams, QQ Bot et Feishu.
- Supprimer le code de finalisation de l'aperçu en double seulement après que chaque channel a
  des tests de parité.

### Phase 6 : SDK public

- Ajouter `openclaw/plugin-sdk/channel-message`.
- Documenter cela comme l'API de plugin de channel préférée.
- Mettre à jour les exportations de packages, l'inventaire des points d'entrée, les lignes de base de l'API générées et
  la documentation du SDK de plugin.
- Inclure `MessageOrigin`, les hooks d'encodage/décodage d'origine et le prédicat partagé
  `shouldDropOpenClawEcho` dans la surface du SDK de messages de channel.
- Conserver les wrappers de compatibilité pour les anciens sous-chemins.
- Marquer les assistants du SDK nommés reply comme obsolètes dans la documentation une fois que les plugins groupés sont
  migrés.

### Phase 7 : Tous les expéditeurs

Déplacer tous les producteurs sortants non-réponse vers `messages.send` :

- notifications cron et de rythme cardiaque
- achèvements de tâches
- résultats de hook
- invites d'approbation et résultats d'approbation
- envois d'outil de message
- annonces d'achèvement de sous-agent
- envois explicites via CLI ou l'interface de contrôle
- chemins d'automatisation/diffusion

C'est ici que le modèle cesse d'être des "réponses d'agent" et devient "OpenClaw envoie
des messages".

### Phase 8 : Déprécier le tour

- Conserver `channel.turn` comme wrapper pendant au moins une fenêtre de compatibilité.
- Publier des notes de migration.
- Exécuter les tests de compatibilité du SDK de plugin sur les anciens imports.
- Supprimer ou masquer les anciens assistants internes seulement après qu'aucun plugin groupé n'en ait besoin
  et que les contrats tiers ont un remplacement stable.

## Plan de test

Tests unitaires :

- Sérialisation et récupération de l'intention d'envoi durable.
- Réutilisation de la clé d'idempotence et suppression des doublons.
- Validation de réception et saut de relecture.
- Récupération `unknown_after_send` qui réconcilie avant la relecture lorsqu'un adaptateur
  prend en charge la réconciliation.
- Stratégie de classification des échecs.
- Séquencement de la stratégie d'accusé de réception de réception.
- Mappage des relations pour les envois de réponse, de suivi, système et de diffusion.
- Fabrique d'origine en cas d'échec du Gateway et prédicat `shouldDropOpenClawEcho`.
- Préservation de l'origine via la normalisation de la charge utile, le découpage, la sérialisation de la file d'attente durable et la récupération.

Tests d'intégration :

- L'adaptateur simple `channel.turn.run` enregistre et envoie toujours.
- La livraison d'un tour assemblé hérité ne devient pas durable, sauf si le channel y opte explicitement.
- Le pont `channel.turn.runPrepared` enregistre et finalise toujours.
- Les assistants de compatibilité publique appellent par défaut les rappels de livraison détenus par l'appelant et n'effectuent pas d'envoi générique avant ces rappels.
- La livraison de repli durable rejoue l'ensemble du tableau de charges utiles projetées après redémarrage et ne peut pas laisser les charges utiles ultérieures non enregistrées après un plantage précoce.
- La livraison d'un tour assemblé durable renvoie les identifiants de messages de la plateforme au répartisseur tamponné.
- Les crochets de livraison personnalisés renvoient toujours les identifiants de messages de la plateforme lorsque la livraison durable est désactivée ou indisponible.
- La réponse finale survit au redémarrage entre l'achèvement de l'assistant et l'envoi sur la plateforme.
- Le brouillon d'aperçu est finalisé sur place lorsque cela est autorisé.
- Le brouillon d'aperçu est annulé ou expurgé lorsque une inadéquation média/erreur/cible de réponse nécessite une livraison normale.
- Le Block streaming et le preview streaming ne livrent pas tous les deux le même texte.
- Les médias diffusés tôt ne sont pas dupliqués lors de la livraison finale.

Tests de channel :

- La réponse de sujet Telegram avec l'accusé de réception par interrogation retardé jusqu'au filigrane de completion sécurisé du contexte de réception.
- Récupération par interrogation Telegram pour les mises à jour acceptées mais non livrées couvertes par le modèle d'offset sécurisé complété persistant.
- L'aperçu périmé Telegram envoie une nouvelle version finale et nettoie l'aperçu.
- Le repli silencieux Telegram envoie chaque charge utile de repli projetée.
- La durabilité du repli silencieux Telegram enregistre l'ensemble du tableau de repli projeté de manière atomique, et non une intention durable à charge utile unique par itération de boucle.
- Discord annulation de l'aperçu sur média/erreur/réponse explicite.
- Les finales du répartiteur préparé Discord transitent par le contexte d'envoi avant que les docs
  ou le changelog ne revendiquent la durabilité de réponse finale Discord.
- Les envois finaux durables iMessage remplissent le cache d'écho de messages envoyés du moniteur.
- Les chemins de livraison hérités de LINE, Zalo et Nostr ne sont pas contournés par
  l'envoi durable générique jusqu'à ce que leurs tests de parité d'adaptateur existent.
- La livraison par rappel Direct-DM/Nostr reste autoritaire sauf si elle est explicitement
  migrée vers une cible de message complète et un adaptateur d'envoi sécurisé contre les relectures.
- Les messages d'échec de passerelle Slack balisés OpenClaw restent visibles en sortie, les échos
  de salle de bot balisés sont abandonnés avant `allowBots`, et les messages de bot non balisés avec le
  même texte visible suivent toujours l'autorisation normale du bot.
- Retour du flux natif Slack à l'aperçu de brouillon dans les DM de premier niveau.
- Finalisation de l'aperçu Matrix et retour de suppression.
- Les échos de salle d'échec de passerelle Matrix balisés OpenClaw à partir des comptes bot configurés
  sont abandonnés avant le traitement `allowBots`.
- Les audits de cascade d'échec de passerelle en salle partagée Discord et Google Chat couvrent
  les modes `allowBots` avant de revendiquer une protection générique.
- Finalisation du brouillon Mattermost et retour de nouvel envoi.
- Finalisation de la progression native Teams.
- Suppression des finaux en double Feishu.
- Retour du délai d'attente de l'accumulateur du bot QQ.
- Les envois finaux durables Tlon préservent le rendu de la signature du modèle et le suivi
  des fils participés.
- Envois finaux durables simples pour WhatsApp, Signal, iMessage, Google Chat, LINE, IRC, Nostr, Nextcloud Talk,
  Synology Chat, Tlon, Twitch, Zalo et Zalo Personnel.

Validation :

- Fichiers Vitest ciblés pendant le développement.
- `pnpm check:changed` dans Testbox pour l'ensemble de la surface modifiée.
- `pnpm check` plus large dans Testbox avant d'intégrer la refactorisation complète ou après
  les modifications du SDK public/export.
- Test de fumée en direct ou sur le channel qa pour au moins un channel capable d'édition et un
  simple channel d'envoi uniquement avant de supprimer les wrappers de compatibilité.

## Questions ouvertes

- Si Telegram doit éventuellement remplacer la source du runner grammY par une
  source de polling entièrement durable qui peut contrôler la renvoi au niveau de la plateforme, et non
  seulement le filigrane de redémarrage persisté de OpenClaw.
- Si l'état durable de l'aperçu en direct doit être stocké dans le même enregistrement de file
  que l'intention d'envoi finale ou dans un magasin d'état de live frère.
- Combien de temps les wrappers de compatibilité restent documentés après
  la sortie de `plugin-sdk/channel-message`.
- Si les plugins tiers doivent implémenter des adaptateurs de réception directement ou fournir
  uniquement des crochets (hooks) normalize/send/live via `defineChannelMessageAdapter`.
- Quels champs de reçu sont sûrs à exposer dans le SDK public par rapport à l'état
  du runtime interne.
- Si les effets secondaires tels que les caches de self-echo et les marqueurs de thread participé
  doivent être modélisés comme des crochets (hooks) de contexte d'envoi, des étapes de finalisation détenues par l'adaptateur, ou
  des abonnés aux reçus.
- Quels channels disposent de métadonnées d'origine natives, lesquels ont besoin de registries
  sortants persistants, et lesquels ne peuvent pas offrir une suppression fiable de l'écho inter-bots.

## Critères d'acceptation

- Chaque channel de message groupé envoie la sortie visible finale via
  `messages.send`.
- Chaque channel de message entrant passe par `messages.receive` ou un
  wrapper de compatibilité documenté.
- Chaque channel d'aperçu/édition/stream utilise `messages.live` pour l'état de brouillon et
  la finalisation.
- `channel.turn` est uniquement un wrapper.
- Les helpers du SDK nommés Reply sont des exports de compatibilité, pas le chemin recommandé.
- La récupération durable peut rejouer les envois finaux en attente après redémarrage sans perdre
  la réponse finale ni dupliquer les envois déjà validés ; les envois dont
  l'issue de la plateforme est inconnue sont réconciliés avant le rejeu ou documentés comme
  au-moins-une-fois pour cet adaptateur.
- Les envois finaux durables échouent de manière fermée lorsque l'intention durable ne peut pas être écrite,
  sauf si un appelant a explicitement sélectionné un mode non durable documenté.
- Les helpers de compatibilité pour le tour de channel (channel-turn) et le SDK utilisent par défaut la livraison directe
  propriétaire du channel ; l'envoi générique durable est un choix explicite uniquement.
- Les reçus (receipts) préservent tous les identifiants de message de la plateforme pour les livraisons en plusieurs parties et un
  identifiant principal pour la commodité du fil de discussion/édition.
- Les wrappers durables préservent les effets secondaires locaux au channel avant de remplacer les rappels (callbacks)
  de livraison directe.
- Les répartiteurs (dispatchers) préparés ne sont pas comptés comme durables tant que leur chemin de livraison final
  n'utilise pas explicitement le contexte d'envoi.
- La livraison de secours gère chaque charge utile projetée.
- La livraison de secours durable enregistre chaque charge utile projetée dans une intention
  répétable ou un plan de traitement par lot unique.
- OpenClaw-originated gateway failure output est visible par les humains, mais les échos de salle (room echoes)
  marqués comme créés par le bot sont abandonnés avant l'autorisation du bot sur les channels qui
  déclarent prendre en charge le contrat d'origine.
- La documentation explique l'envoi, la réception, le mode live, l'état, les reçus, les relations, la politique
  d'échec, la migration et la couverture de test.

## Connexes

- [Messages](/fr/concepts/messages)
- [Streaming et découpage](/fr/concepts/streaming)
- [Brouillons de progression](/fr/concepts/progress-drafts)
- [Politique de réessai](/fr/concepts/retry)
- [Noyau de tour de channel](/fr/plugins/sdk-channel-turn)
