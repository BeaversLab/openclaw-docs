---
summary: "Guide étape par étape pour créer un plugin de channel de messagerie pour OpenClaw"
title: "Création de plugins de channel"
sidebarTitle: "Plugins de Channel"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

Ce guide explique la création d'un plugin de channel qui connecte OpenClaw à une
plateforme de messagerie. À la fin, vous disposerez d'un channel fonctionnel avec une sécurité DM,
le jumelage, le threading des réponses et la messagerie sortante.

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord [Getting Started](/fr/plugins/building-plugins) pour connaître la structure de package de base et la configuration du manifeste.</Info>

## Fonctionnement des plugins de channel

Les plugins de canal n'ont pas besoin de leurs propres outils d'envoi/de modification/de réaction. OpenClaw conserve un outil `message` partagé dans le cœur. Votre plugin possède :

- **Config** - résolution de compte et assistant de configuration
- **Sécurité** - stratégie de DM et listes d'autorisation
- **Appariement** - flux d'approbation DM
- **Grammaire de session** - comment les identifiants de conversation spécifiques au fournisseur sont mappés aux chats de base, aux identifiants de fil de discussion et aux replis parent
- **Sortant** - envoi de texte, de médias et de sondages vers la plateforme
- **Fils de discussion** - comment les réponses sont organisées en fils
- **Frappe de l'état de santé** - signaux facultatifs de frappe/occupation pour les cibles de livraison de l'état de santé

Le cœur possède l'outil de message partagé, le câblage des invites, la forme de la clé de session externe,
la tenue de livres générique `:thread:` et la répartition.

Les nouveaux plugins de canal doivent également exposer un adaptateur `message` avec
`defineChannelMessageAdapter` de `openclaw/plugin-sdk/channel-outbound`. L'adaptateur déclare quelles capacités d'envoi final durables le transport natif
prend réellement en charge et dirige les envois de texte/médias vers les mêmes fonctions de transport que
l'adaptateur `outbound` hérité. Ne déclarez une capacité que lorsqu'un test de contrat
prouve l'effet secondaire natif et le reçu renvoyé.
Pour le contrat API complet, les exemples, la matrice des capacités, les règles de reçu, la finalisation
de l'aperçu en direct, la stratégie d'accusé de réception de réception, les tests et la table de migration, consultez
[API sortant du canal](/fr/plugins/sdk-channel-outbound).
Si l'adaptateur `outbound` existant possède déjà les bonnes méthodes d'envoi et
les métadonnées de capacité, utilisez `createChannelMessageAdapterFromOutbound(...)` pour
dériver l'adaptateur `message` au lieu d'écrire manuellement un autre pont.
Les envois de l'adaptateur doivent renvoyer des valeurs `MessageReceipt`. Lorsque le code de compatibilité
a encore besoin d'identifiants hérités, dérivez-les avec `listMessageReceiptPlatformIds(...)`
ou `resolveMessageReceiptPrimaryId(...)` au lieu de conserver des champs `messageIds` parallèles
dans le nouveau code de cycle de vie.
Les canaux prenant en charge les aperçus doivent également déclarer `message.live.capabilities` avec
le cycle de vie en direct exact qu'ils possèdent, tel que `draftPreview`,
`previewFinalization`, `progressUpdates`, `nativeStreaming`, ou
`quietFinalization`. Les canaux qui finalisent un aperçu de brouillon en place doivent
également déclarer `message.live.finalizer.capabilities`, tel que `finalEdit`,
`normalFallback`, `discardPending`, `previewReceipt`, et
`retainOnAmbiguousFailure`, et acheminer la logique d'exécution via
`defineFinalizableLivePreviewAdapter(...)` plus
`deliverWithFinalizableLivePreviewAdapter(...)`. Maintenez ces capacités prises en charge
par des tests `verifyChannelMessageLiveCapabilityAdapterProofs(...)` et
`verifyChannelMessageLiveFinalizerProofs(...)` afin que le comportement de l'aperçu natif,
de la progression, de l'édition, de la repli/conservation, du nettoyage et du reçu ne puisse pas dériver
en silence.
Les récepteurs entrants qui diffèrent les accusés de réception de la plateforme doivent déclarer
`message.receive.defaultAckPolicy` et `supportedAckPolicies` au lieu de masquer
le timing des accusés de réception dans l'état local du moniteur. Couvrez chaque stratégie déclarée avec
`verifyChannelMessageReceiveAckPolicyAdapterProofs(...)`.

Les assistants de réponse hérités tels que `createChannelTurnReplyPipeline`,
`dispatchInboundReplyWithBase` et `recordInboundSessionAndDispatchReply`
restent disponibles pour les répartiteurs de compatibilité. N'utilisez pas ces noms pour le nouveau
code de canal ; les nouveaux plugins devraient commencer par l'adaptateur `message`, les reçus et
les assistants de cycle de vie de réception/envoi sur `openclaw/plugin-sdk/channel-outbound`.

Les channels migrant l'autorisation entrante peuvent utiliser le sous-chemin expérimental `openclaw/plugin-sdk/channel-ingress-runtime` depuis les chemins de réception d'exécution. Le sous-chemin conserve la recherche de plateforme et les effets secondaires dans le plugin, tout en partageant la résolution de l'état de la liste d'autorisation, les décisions de route/expéditeur/commande/événement/activation, les diagnostics expurgés et le mappage d'admission de tour. Conservez la normalisation de l'identité du plugin dans le descripteur que vous passez au résolveur ; ne sérialisez pas les valeurs de correspondance brutes de l'état résolu ou de la décision. Voir [Channel ingress API](/fr/plugins/sdk-channel-ingress) pour la conception de l'API, la limite de responsabilité et les attentes de test.

Si votre channel prend en charge les indicateurs de frappe en dehors des réponses entrantes, exposez
`heartbeat.sendTyping(...)` sur le plugin de channel. Core l'appelle avec la
cible de livraison de pulsation (heartbeat) résolue avant le début de l'exécution du modèle de pulsation
et utilise le cycle de vie partagé de maintien/nettoyage de frappe. Ajoutez `heartbeat.clearTyping(...)`
lorsque la plateforme a besoin d'un signal d'arrêt explicite.

Si votre channel ajoute des paramètres d'outil de message (message-tool) qui transportent des sources média, exposez ces
noms de paramètres via `describeMessageTool(...).mediaSourceParams`. Core utilise
cette liste explicite pour la normalisation du chemin du bac à sable et la stratégie d'accès média sortant,
de sorte que les plugins n'ont pas besoin de cas particuliers dans le cœur partagé (shared-core) pour les paramètres
d'avatar, de pièce jointe ou d'image de couche spécifiques au fournisseur.
Préférez renvoyer une carte indexée par action telle que
`{ "set-profile": ["avatarUrl", "avatarPath"] }` afin que les actions non liées n'héritent
pas des arguments média d'une autre action. Un tableau plat fonctionne toujours pour les paramètres qui
sont intentionnellement partagés entre chaque action exposée.

Si votre channel nécessite une mise en forme spécifique au fournisseur pour `message(action="send")`,
préférez `actions.prepareSendPayload(...)`. Placez les cartes natives, les blocs, les intégrations ou
autres données durables sous `payload.channelData.<channel>` et laissez le cœur effectuer
l'envoi réel via l'adaptateur outbound/message. Utilisez
`actions.handleAction(...)` pour l'envoi uniquement en tant que solution de repli de compatibilité pour
les charges utiles qui ne peuvent pas être sérialisées et réessayées.

Si votre plateforme stocke une portée supplémentaire dans les identifiants de conversation, gardez cet analyseur
dans le plugin avec `messaging.resolveSessionConversation(...)`. C'est le
crochet canonique pour mapper `rawId` à l'identifiant de conversation de base, au fil de discussion optionnel,
au `baseConversationId` explicite, et à tout `parentConversationCandidates`.
Lorsque vous renvoyez `parentConversationCandidates`, gardez-les ordonnés du
parent le plus étroit vers la conversation la plus large/de base.

Utilisez `openclaw/plugin-sdk/channel-route` lorsque le code du plugin doit normaliser des champs de type route, comparer un fil de discussion enfant avec sa route parente, ou construire une clé de déduplication stable à partir de `{ channel, to, accountId, threadId }`. L'assistant normalise les identifiants numériques de fil de discussion de la même manière que le cœur, les plugins devraient donc l'utiliser de préférence aux comparaisons `String(threadId)` ad hoc.
Les plugins avec une syntaxe cible spécifique au fournisseur doivent exposer `messaging.resolveOutboundSessionRoute(...)` afin que le cœur obtienne l'identité de session et de fil native du fournisseur sans utiliser de shims d'analyse.

Les plugins groupés qui ont besoin du même analyseur avant le démarrage du registre de canaux
peuvent également exposer un fichier `session-key-api.ts` de niveau supérieur avec un export `resolveSessionConversation(...)` correspondant.
Le cœur utilise cette surface sûre pour le démarrage
uniquement lorsque le registre de plugins d'exécution n'est pas encore disponible.

`messaging.resolveParentConversationCandidates(...)` reste disponible en tant que
solution de repli de compatibilité héritée lorsqu'un plugin a uniquement besoin de replis parents au-dessus
de l'identifiant générique/brut. Si les deux crochets existent, le cœur utilise
`resolveSessionConversation(...).parentConversationCandidates` en premier et ne
revient à `resolveParentConversationCandidates(...)` que lorsque le crochet canonique
les omet.

## Approbations et capacités du channel

La plupart des plugins de channel n'ont pas besoin de code spécifique aux approbations.

- Le cœur gère les `/approve` dans la même conversation, les charges utiles partagées des boutons d'approbation, et la livraison de repli générique.
- Préférez un seul objet `approvalCapability` sur le plugin de canal lorsque le canal a besoin d'un comportement spécifique aux approbations.
- `ChannelPlugin.approvals` est supprimé. Placez les faits de livraison/natif/rendu/authentification des approbations sur `approvalCapability`.
- `plugin.auth` est réservé à la connexion/déconnexion ; le noyau ne lit plus les hooks d'authentification d'approbation depuis cet objet.
- `approvalCapability.authorizeActorAction` et `approvalCapability.getActionAvailabilityState` constituent la jonction canonique pour l'authentification des approbations.
- Utilisez `approvalCapability.getActionAvailabilityState` pour la disponibilité de l'authentification des approbations dans le même chat.
- Si votre canal expose des approbations d'exécution natives, utilisez `approvalCapability.getExecInitiatingSurfaceState` pour l'état de la surface d'initiation/client natif lorsqu'il diffère de l'authentification des approbations dans le même chat. Le noyau utilise ce hook spécifique à l'exécution pour distinguer `enabled` de `disabled`, pour décider si le canal d'initiation prend en charge les approbations d'exécution natives, et pour inclure le canal dans les directives de repli du client natif. `createApproverRestrictedNativeApprovalCapability(...)` remplit cela pour le cas courant.
- Utilisez `outbound.shouldSuppressLocalPayloadPrompt` ou `outbound.beforeDeliverPayload` pour le comportement du cycle de vie de la charge utile spécifique au canal, tel que masquer les invites d'approbation locales en double ou envoyer des indicateurs de frappe avant la livraison.
- Utilisez `approvalCapability.delivery` uniquement pour le routage des approbations natives ou la suppression du repli.
- Utilisez `approvalCapability.nativeRuntime` pour les faits d'approbation natifs appartenant au canal. Gardez-le paresseux sur les points d'entrée à chaud du canal avec `createLazyChannelApprovalNativeRuntimeAdapter(...)`, qui peut importer votre module d'exécution à la demande tout en permettant au noyau d'assembler le cycle de vie de l'approbation.
- Utilisez `approvalCapability.render` uniquement lorsqu'un canal a vraiment besoin de charges utiles d'approbation personnalisées au lieu du moteur de rendu partagé.
- Utilisez `approvalCapability.describeExecApprovalSetup` lorsque le canal souhaite que la réponse du chemin désactivé explique les boutons de configuration exacts nécessaires pour activer les approbations d'exécution natives. Le hook reçoit `{ channel, channelLabel, accountId }` ; les canaux avec compte nommé doivent afficher des chemins étendus au compte tels que `channels.<channel>.accounts.<id>.execApprovals.*` au lieu des valeurs par défaut de niveau supérieur.
- Si un channel peut déduire des identités DM stables de type propriétaire à partir de la configuration existante, utilisez `createResolvedApproverActionAuthAdapter` depuis `openclaw/plugin-sdk/approval-runtime` pour restreindre `/approve` de même discussion sans ajouter de logique principale spécifique aux approbations.
- Si l'autorisation d'approbation personnalisée autorise intentionnellement uniquement le repli sur la même conversation, renvoyez `markImplicitSameChatApprovalAuthorization({ authorized: true })` à partir de `openclaw/plugin-sdk/approval-auth-runtime` ; sinon, le cœur traite le résultat comme une autorisation explicite de l'approuvant.
- Si un rappel natif dépossédé par le canal résout les approbations directement, utilisez `isImplicitSameChatApprovalAuthorization(...)` avant la résolution afin que le repli implicite passe toujours par l'autorisation d'acteur normale du canal.
- Si un canal a besoin d'une livraison d'approbation native, concentrez le code du canal sur la normalisation de la cible ainsi que sur les faits de transport/présentation. Utilisez `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver` et `createApproverRestrictedNativeApprovalCapability` à partir de `openclaw/plugin-sdk/approval-runtime`. Placez les faits spécifiques au canal derrière `approvalCapability.nativeRuntime`, idéalement via `createChannelApprovalNativeRuntimeAdapter(...)` ou `createLazyChannelApprovalNativeRuntimeAdapter(...)`, afin que le cœur puisse assembler le gestionnaire et gérer le filtrage des requêtes, le routage, la déduplication, l'expiration, l'abonnement à la passerelle et les avis de routage-ailleurs. `nativeRuntime` est divisé en quelques coutures plus petites :
- Utilisez `createNativeApprovalChannelRouteGates` de `openclaw/plugin-sdk/approval-native-runtime` lorsqu'un channel prend en charge à la fois la livraison native d'origine de session et les cibles de transfert d'approbation explicites. L'assistant centralise la sélection de la configuration d'approbation, la gestion de `mode`, les filtres d'agent/session, la liaison de compte, la correspondance session-cible et la correspondance de liste de cibles, tandis que les appelants possèdent toujours l'identifiant du channel, le mode de transfert par défaut, la recherche de compte, la vérification de l'activation du transport, la normalisation de la cible et la résolution de la cible source de tour. Ne l'utilisez pas pour créer des valeurs par défaut de stratégie de channel appartenant au cœur ; transmettez explicitement le mode par défaut documenté du channel.
- `createChannelNativeOriginTargetResolver` utilise par défaut le matcher de route de channel partagé pour les cibles `{ to, accountId, threadId }`. Ne passez `targetsMatch` que lorsqu'un channel a des règles d'équivalence spécifiques au fournisseur, comme la correspondance de préfixe d'horodatage Slack.
- Passez `normalizeTargetForMatch` à `createChannelNativeOriginTargetResolver` lorsque le channel doit canoniser les identifiants de fournisseur avant l'exécution du matcher de route par défaut ou d'un rappel `targetsMatch` personnalisé, tout en préservant la cible d'origine pour la livraison. Utilisez `normalizeTarget` uniquement lorsque la cible de livraison résolue elle-même doit être canonisée.
- `availability` - si le compte est configuré et si une requête doit être gérée
- `presentation` - mapper le modèle de vue d'approbation partagé en charges utiles natives en attente/résolues/expirées ou en actions finales
- `transport` - préparer les cibles ainsi qu'envoyer/mettre à jour/supprimer les messages d'approbation natifs
- `interactions` - hooks bind/unbind/clear-action facultatifs pour les boutons ou réactions natifs, ainsi qu'un hook `cancelDelivered` facultatif. Implémentez `cancelDelivered` lorsque `deliverPending` enregistre un état en cours de traitement ou persistant (tel qu'un magasin de cibles de réaction) afin que cet état puisse être libéré si l'arrêt d'un gestionnaire annule la livraison avant l'exécution de `bindPending` ou lorsque `bindPending` ne renvoie aucun descripteur
- `observe` - hooks de diagnostics de livraison facultatifs
- Si le channel a besoin d'objets détenus par le runtime tels qu'un client, un jeton, une application Bolt ou un récepteur de webhook, enregistrez-les via Bolt`openclaw/plugin-sdk/channel-runtime-context`. Le registre générique de contexte d'exécution permet au cœur d'amorcer les gestionnaires basés sur les capacités à partir de l'état de démarrage du channel sans ajouter de colle d'enveloppe spécifique aux approbations.
- Optez pour le niveau inférieur `createChannelApprovalHandler` ou `createChannelNativeApprovalRuntime` uniquement lorsque la couture basée sur les capacités n'est pas encore assez expressive.
- Les channels d'approbation natifs doivent acheminer à la fois `accountId` et `approvalKind` via ces assistants. `accountId` maintient la stratégie d'approbation multi-compte délimitée au bon compte bot, et `approvalKind` maintient le comportement d'approbation exec vs plugin disponible pour le channel sans branches codées en dur dans le cœur.
- Le cœur possède désormais également les avis de réacheminement d'approbation. Les plugins de channel ne doivent pas envoyer leurs propres messages de suivi "l'approbation est allée vers les DMs / un autre channel" depuis `createChannelNativeApprovalRuntime` ; à la place, exposez un routage exact de l'origine + DM de l'approbateur via les assistants de capacité d'approbation partagés et laissez le cœur agréger les livraisons réelles avant de poster tout avis vers le chat initiateur.
- Conservez le type d'ID d'approbation livré de bout en bout. Les clients natifs ne doivent pas
  deviner ou réécrire le routage d'approbation exec vs plugin à partir de l'état local au channel.
- Différents types d'approbation peuvent intentionnellement exposer différentes surfaces natives.
  Exemples regroupés actuels :
  - Slack conserve le routage d'approbation natif disponible pour les identifiants exec et plugin.
  - Matrix conserve le même routage natif DM/channel et la même UX de réaction pour les approbations exec et plugin, tout en permettant à l'auth de différer selon le type d'approbation.
- `createApproverRestrictedNativeApprovalAdapter` existe toujours en tant que wrapper de compatibilité, mais le nouveau code devrait préférer le constructeur de capacités et exposer `approvalCapability` sur le plugin.

Pour les points d'entrée de channel à chaud, préférez les sous-chemins d'exécution plus étroits lorsque vous n'avez besoin que d'une seule partie de cette famille :

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

De même, préférez `openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/reply-runtime`,
`openclaw/plugin-sdk/reply-dispatch-runtime`,
`openclaw/plugin-sdk/reply-reference`, et
`openclaw/plugin-sdk/reply-chunking` lorsque vous n'avez pas besoin de la surface globale plus large.

Spécifiquement pour la configuration :

- `openclaw/plugin-sdk/setup-runtime` couvre les assistants de configuration sécurisés au runtime :
  `createSetupTranslator`, les adaptateurs de correctifs de configuration sécurisés à l'importation (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), la sortie de note de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries`, et les constructeurs
  de proxy de configuration délégués
- `openclaw/plugin-sdk/setup-runtime` inclut la jonction d'adaptateur consciente de l'env pour
  `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` couvre les constructeurs de configuration d'installation facultative
  ainsi que quelques primitives de configuration sécurisées :
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

Si votre channel prend en charge la configuration ou l'authentification basées sur l'env et que les flux de démarrage/config génériques doivent connaître ces noms d'env avant le chargement du runtime, déclarez-les dans le manifeste du plugin avec `channelEnvVars`. Gardez le runtime du channel `envVars` ou des constantes locales uniquement pour le texte destiné aux opérateurs.

Si votre channel peut apparaître dans les balayages `status`, `channels list`, `channels status` ou SecretRef avant le démarrage du runtime du plugin, ajoutez `openclaw.setupEntry` dans `package.json`. Ce point d'entrée doit être sûr à importer dans les chemins de commande en lecture seule et doit renvoyer les métadonnées du channel, l'adaptateur de configuration sûr pour l'installation, l'adaptateur de statut et les métadonnées de la cible secrète du channel nécessaires pour ces résumés. Ne démarrez pas de clients, d'écouteurs ou de runtimes de transport à partir du point d'entrée de configuration.

Gardez également le chemin d'importation de l'entrée principale du channel étroit. Discovery peut évaluer l'entrée et le module du plugin de channel pour enregistrer les capacités sans activer le channel. Les fichiers tels que `channel-plugin-api.ts` doivent exporter l'objet du plugin de channel sans importer les assistants d'installation, les clients de transport, les écouteurs de socket, les lanceurs de sous-processus ou les modules de démarrage de service. Mettez ces éléments d'exécution dans des modules chargés depuis `registerFull(...)`, les setters d'exécution ou les adaptateurs de capacité différés.

`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled` et
`splitSetupEntries`

- utilisez la couture `openclaw/plugin-sdk/setup` plus large uniquement lorsque vous avez également besoin des assistants de configuration/installation partagés plus lourds tels que `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si votre channel souhaite uniquement annoncer "installer ce plugin d'abord" dans les surfaces de configuration, préférez `createOptionalChannelSetupSurface(...)`. L'adaptateur/l'assistant généré échoue en mode fermé lors de l'écriture et de la finalisation de la configuration, et ils réutilisent le même message d'installation requise pour la validation, la finalisation et la copie du lien vers la documentation.

Pour d'autres chemins critiques du channel, préférez les assistants étroits aux surfaces héritées plus larges :

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution` et
  `openclaw/plugin-sdk/account-helpers` pour la configuration multi-compte et
  le repli vers le compte par défaut
- `openclaw/plugin-sdk/inbound-envelope` et
  `openclaw/plugin-sdk/channel-inbound` pour le câblage de la route/enveloppe entrante et
  de l'enregistrement et de la répartition
- `openclaw/plugin-sdk/channel-targets` pour les assistants d'analyse de la cible
- `openclaw/plugin-sdk/outbound-media` pour le chargement des médias et
  `openclaw/plugin-sdk/channel-outbound` pour les délégués d'identité et d'envoi sortants
  ainsi que pour la planification de la charge utile
- `buildThreadAwareOutboundSessionRoute(...)` de
  `openclaw/plugin-sdk/channel-core` lorsqu'une route sortante doit préserver un `replyToId`/`threadId` explicite
  ou récupérer la session `:thread:` actuelle
  après concordance de la clé de session de base. Les plugins de fournisseur peuvent remplacer la priorité, le comportement de suffixe et la normalisation de l'identifiant de fil lorsque leur plateforme possède une sémantique de livraison de fil native.
- `openclaw/plugin-sdk/thread-bindings-runtime` pour le cycle de vie de liaison de fil
  et l'enregistrement de l'adaptateur
- `openclaw/plugin-sdk/agent-media-payload` uniquement lorsqu'une disposition de champ de charge utile agent/média héritée est encore requise
- `openclaw/plugin-sdk/telegram-command-config` pour la normalisation des commandes personnalisées Telegram,
  la validation des doublons/conflits et un contrat de configuration de commande stable de repli

Les canaux d'authentification uniquement peuvent généralement s'arrêter au chemin par défaut : le cœur gère les approbations et le plugin expose simplement les capacités sortantes/d'authentification. Les canaux d'approbation natifs tels que Matrix, Slack, Telegram et les transports de discussion personnalisés devraient utiliser les assistants natifs partagés au lieu de créer leur propre cycle de vie d'approbation.

## Politique de mention entrante

Conservez la gestion des mentions entrantes divisée en deux couches :

- collecte de preuves appartenant au plugin
- évaluation de la politique partagée

Utilisez `openclaw/plugin-sdk/channel-mention-gating` pour les décisions de politique de mention.
Utilisez `openclaw/plugin-sdk/channel-inbound` uniquement lorsque vous avez besoin de l'assistant entrant plus large.

Convient bien pour la logique locale au plugin :

- détection de réponse au bot
- détection de bot cité
- vérifications de participation au fil
- exclusions de messages de service/système
- caches natifs de la plateforme nécessaires pour prouver la participation du bot

Convient bien pour l'assistant partagé :

- `requireMention`
- résultat de mention explicite
- liste d'autorisation de mention implicite
- contournement de commande
- décision finale de saut

Flux préféré :

1. Calculez les faits de mention locaux.
2. Passez ces faits à `resolveInboundMentionDecision({ facts, policy })`.
3. Utilisez `decision.effectiveWasMentioned`, `decision.shouldBypassMention` et `decision.shouldSkip` dans votre porte entrante.

```typescript
import { implicitMentionKindWhen, matchesMentionWithExplicit, resolveInboundMentionDecision } from "openclaw/plugin-sdk/channel-inbound";

const mentionMatch = matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const facts = {
  canDetectMention: true,
  wasMentioned: mentionMatch.matched,
  hasAnyMention: mentionMatch.hasExplicitMention,
  implicitMentionKinds: [...implicitMentionKindWhen("reply_to_bot", isReplyToBot), ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot)],
};

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    allowedImplicitMentionKinds: requireExplicitMention ? [] : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`api.runtime.channel.mentions` expose les mêmes assistants de mention partagés pour
les plugins de channel groupés qui dépendent déjà de l'injection de runtime :

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

Si vous avez besoin uniquement de `implicitMentionKindWhen` et
de `resolveInboundMentionDecision`, importez depuis
`openclaw/plugin-sdk/channel-mention-gating` pour éviter le chargement d'assistants de runtime
inbound non liés.

Utilisez `resolveInboundMentionDecision({ facts, policy })` pour le filtrage des mentions.

## Procédure pas à pas

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package et manifeste">
    Créez les fichiers de plugin standard. Le champ `channel` dans `package.json` est
    ce qui fait de ce plugin un plugin de channel. Pour la surface complète des métadonnées de package,
    consultez [Configuration et configuration des plugins](/fr/plugins/sdk-setup#openclaw-channel) :

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "Connect OpenClaw to Acme Chat."
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "kind": "channel",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat channel plugin",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {}
      },
      "channelConfigs": {
        "acme-chat": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "uiHints": {
            "token": {
              "label": "Bot token",
              "sensitive": true
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

    `configSchema` valide `plugins.entries.acme-chat.config`. Utilisez-le pour
    les paramètres appartenant au plugin qui ne sont pas la configuration du compte du channel. `channelConfigs`
    valide `channels.acme-chat` et est la source de chemin froid utilisée par le schéma de configuration,
    la configuration et les surfaces de l'interface utilisateur avant le chargement du runtime du plugin.

  </Step>

  <Step title="Créer l'objet du plugin de channel">
    L'interface `ChannelPlugin` possède de nombreuses surfaces d'adaptateur optionnelles. Commencez par
    le minimum - `id` et `setup` - et ajoutez des adaptateurs selon vos besoins.

    Créez `src/channel.ts` :

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // your platform API client

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: token is required");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        setup: {
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
      }),

      // DM security: who can message the bot
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // Pairing: approval flow for new DM contacts
      pairing: {
        text: {
          idLabel: "Acme Chat username",
          message: "Send this code to verify your identity:",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // Threading: how replies are delivered
      threading: { topLevelReplyToMode: "reply" },

      // Outbound: send messages to the platform
      outbound: {
        attachedResults: {
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    Pour les channels qui acceptent à la fois les clés DM de premier niveau canoniques et les clés imbriquées héritées, utilisez les assistants de `plugin-sdk/channel-config-helpers` : `resolveChannelDmAccess`, `resolveChannelDmPolicy`, `resolveChannelDmAllowFrom`, et `normalizeChannelDmPolicy` placent les valeurs locales au compte avant les valeurs racines héritées. Associez le même résolveur à une réparation doctor via `normalizeLegacyDmAliases` afin que l'exécution et la migration lisent le même contrat.

    <Accordion title="Ce que fait createChatChannelPlugin pour vous">
      Au lieu d'implémenter manuellement les interfaces d'adaptateur de bas niveau, vous passez
      des options déclaratives et le générateur les compose :

      | Option | Ce qu'il connecte |
      | --- | --- |
      | `security.dm` | Résolveur de sécurité DM délimité à partir des champs de configuration |
      | `pairing.text` | Flux d'appariement DM basé sur du texte avec échange de codes |
      | `threading` | Résolveur de mode de réponse (fixe, délimité au compte, ou personnalisé) |
      | `outbound.attachedResults` | Fonctions d'envoi qui renvoient des métadonnées de résultat (ID de message) |

      Vous pouvez également passer des objets d'adaptateur bruts au lieu des options déclaratives
      si vous avez besoin d'un contrôle total.

      Les adaptateurs sortants bruts peuvent définir une fonction `chunker(text, limit, ctx)`.
      L'optionnel `ctx.formatting` porte les décisions de formatage au moment de la livraison
      telles que `maxLinesPerMessage` ; appliquez-le avant l'envoi afin que le threading de réponse
      et les limites des blocs soient résolus une seule fois par la livraison sortante partagée.
      Les contextes d'envoi incluent également `replyToIdSource` (`implicit` ou `explicit`)
      lorsqu'une cible de réponse native a été résolue, afin que les assistants de payload puissent préserver
      les balises de réponse explicites sans consommer un créneau de réponse implicite à usage unique.
    </Accordion>

  </Step>

  <Step title="Connecter le point d'entrée">
    Créez `index.ts` :

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat channel plugin",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat management",
                hasSubcommands: false,
              },
            ],
          },
        );
      },
      registerFull(api) {
        api.registerGatewayMethod(/* ... */);
      },
    });
    ```CLI

    Placez les descripteurs CLI appartenant au channel dans `registerCliMetadata(...)`OpenClaw afin qu'OpenClaw
    puisse les afficher dans l'aide racine sans activer le runtime complet du channel,
    tandis que les chargements complets normaux récupèrent toujours les mêmes descripteurs pour l'enregistrement
    réel des commandes. Conservez `registerFull(...)` pour le travail exclusif au runtime.
    Si `registerFull(...)`RPC enregistre des méthodes RPC de passerelle, utilisez un
    préfixe spécifique au plugin. Les espaces de noms d'administration principaux (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent
    toujours vers `operator.admin`.
    `defineChannelPluginEntry` gère automatiquement la répartition du mode d'enregistrement. Consultez
    [Points d'entrée](/en/plugins/sdk-entrypoints#definechannelpluginentry) pour toutes
    les options.

  </Step>

  <Step title="Ajouter une entrée de configuration">
    Créez `setup-entry.ts` pour un chargement léger lors de l'onboarding :

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```OpenClaw

    OpenClaw charge ceci au lieu de l'entrée complète lorsque le channel est désactivé
    ou non configuré. Cela évite d'intégrer du code de runtime lourd lors des flux de configuration.
    Consultez [Configuration et paramétrage](/en/plugins/sdk-setup#setup-entry) pour plus de détails.

    Les channels d'espace de travail regroupés qui divisent les exportations sécurisées pour la configuration en
    modules sidecar peuvent utiliser `defineBundledChannelSetupEntry(...)` depuis
    `openclaw/plugin-sdk/channel-entry-contract` lorsqu'ils ont également besoin
    d'un définitseur de runtime explicite pour la configuration.

  </Step>

  <Step title="Handle inbound messages"OpenClaw>
    Votre plugin doit recevoir des messages de la plateforme et les transmettre à
    OpenClaw. Le modèle typique est un webhook qui vérifie la requête et
    la distribue via le gestionnaire inbound de votre channel :

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK -
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```Microsoft TeamsGoogle Chat

    <Note>
      La gestion des messages entrants est spécifique au channel. Chaque plugin de channel possède
      son propre pipeline inbound. Consultez les plugins de channel fournis
      (par exemple le package du plugin Microsoft Teams ou Google Chat) pour des modèles réels.
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Test">
Écrivez des tests colocalisés dans `src/channel.test.ts` :

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("resolves account from config", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- <bundled-plugin-root>/acme-chat/
    ```

    Pour les helpers de test partagés, voir [Testing](/fr/plugins/sdk-testing).

</Step>
</Steps>

## Structure des fichiers

```
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel metadata
├── openclaw.plugin.json      # Manifest with config schema
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # Public exports (optional)
├── runtime-api.ts            # Internal runtime exports (optional)
└── src/
    ├── channel.ts            # ChannelPlugin via createChatChannelPlugin
    ├── channel.test.ts       # Tests
    ├── client.ts             # Platform API client
    └── runtime.ts            # Runtime store (if needed)
```

## Sujets avancés

<CardGroup cols={2}>
  <Card title="Threading options" icon="git-branch" href="/fr/plugins/sdk-entrypoints#registration-mode">
    Modes de réponse fixes, au niveau du compte ou personnalisés
  </Card>
  <Card title="Message tool integration" icon="puzzle" href="/fr/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool et découverte d'actions
  </Card>
  <Card title="Target resolution" icon="crosshair" href="/fr/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/fr/plugins/sdk-runtime">
    TTS, STT, média, subagent via api.runtime
  </Card>
  <Card title="APIChannel inbound API" icon="bolt" href="/fr/plugins/sdk-channel-inbound">
    Cycle de vie partagé des événements entrants : ingest, resolve, record, dispatch, finalize
  </Card>
</CardGroup>

<Note>Certaines couches d'assistance groupées existent toujours pour la maintenance et la compatibilité des plugins groupés. Elles ne constituent pas le modèle recommandé pour les nouveaux plugins de channel ; privilégiez les sous-chemins génériques channel/setup/reply/runtime de la surface SDK commune sauf si vous maintenez directement cette famille de plugins groupés.</Note>

## Étapes suivantes

- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) - si votre plugin fournit également des modèles
- [Présentation du SDK](/fr/plugins/sdk-overview) - référence complète des imports de sous-chemins
- [Tests du SDK](/fr/plugins/sdk-testing) - utilitaires de test et tests de contrat
- [Manifeste de plugin](/fr/plugins/manifest) - schéma complet du manifeste

## Connexes

- [Configuration du SDK de plugin](/fr/plugins/sdk-setup)
- [Création de plugins](/fr/plugins/building-plugins)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
