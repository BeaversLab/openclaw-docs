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

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord [Getting Started](/fr/plugins/building-plugins) pour connaître la structure de base du package et la configuration du manifeste.</Info>

## Fonctionnement des plugins de channel

Les plugins de channel n'ont pas besoin de leurs propres outils d'envoi/de modification/de réaction. OpenClaw conserve un
outil partagé `message` dans le cœur. Votre plugin possède :

- **Config** — résolution de compte et assistant de configuration
- **Sécurité** — stratégie DM et listes d'autorisation
- **Jumelage (Pairing)** — flux d'approbation DM
- **Grammaire de session** — comment les identifiants de conversation spécifiques au fournisseur sont mappés aux discussions de base, aux identifiants de thread et aux replis parent
- **Sortant (Outbound)** — envoi de texte, de médias et de sondages vers la plateforme
- **Threading** — comment les réponses sont threadées
- **Heartbeat typing** — signaux de frappe/occupation optionnels pour les cibles de livraison heartbeat

Le cœur possède l'outil de message partagé, le câblage des invites, la forme de la clé de session externe,
la tenue de livre `:thread:` générique et la répartition.

Si votre channel prend en charge les indicateurs de frappe en dehors des réponses entrantes, exposez
`heartbeat.sendTyping(...)` sur le plugin de channel. Le core l'appelle avec la
cible de livraison heartbeat résolue avant le début de l'exécution du modèle heartbeat
et utilise le cycle de vie partagé de maintien/nettoyage de la frappe. Ajoutez `heartbeat.clearTyping(...)`
lorsque la plateforme a besoin d'un signal d'arrêt explicite.

Si votre channel ajoute des paramètres d'outil de message qui transportent des sources média, exposez ces
noms de paramètres via `describeMessageTool(...).mediaSourceParams`. Le core utilise
cette liste explicite pour la normalisation des chemins du bac à sable et la stratégie d'accès média sortant,
afin que les plugins n'aient pas besoin de cas particuliers dans le cœur partagé pour les paramètres
d'avatar, de pièce jointe ou d'image de couverture spécifiques au fournisseur.
Préférez renvoyer une carte indexée par action telle que
`{ "set-profile": ["avatarUrl", "avatarPath"] }` afin que les actions non liées n'héritent
des arguments média d'une autre action. Un tableau plat fonctionne toujours pour les paramètres
qui sont intentionnellement partagés entre chaque action exposée.

Si votre plateforme stocke une portée supplémentaire dans les identifiants de conversation, conservez cet analyse dans le plugin avec `messaging.resolveSessionConversation(...)`. C'est le hook canonique pour mapper `rawId` vers l'identifiant de conversation de base, l'identifiant de fil optionnel, le `baseConversationId` explicite, et tout `parentConversationCandidates`.
Lorsque vous renvoyez `parentConversationCandidates`, gardez-les ordonnés du parent le plus étroit à la conversation la plus large/de base.

Les plugins groupés qui ont besoin du même analyse avant le démarrage du registre de canaux peuvent également exposer un fichier `session-key-api.ts` de premier niveau avec un export `resolveSessionConversation(...)` correspondant. Core utilise cette surface sécurisée pour l'amorçage uniquement lorsque le registre de plugins d'exécution n'est pas encore disponible.

`messaging.resolveParentConversationCandidates(...)` reste disponible en tant que solution de repli de compatibilité héritée lorsqu'un plugin n'a besoin que de replis parents par-dessus l'identifiant générique/brut. Si les deux hooks existent, core utilise `resolveSessionConversation(...).parentConversationCandidates` d'abord et ne revient à `resolveParentConversationCandidates(...)` que lorsque le hook canonique les omet.

## Approbations et capacités du canal

La plupart des plugins de canal n'ont pas besoin de code spécifique aux approbations.

- Core gère `/approve` dans la même conversation, les charges utiles partagées des boutons d'approbation et la livraison de repli générique.
- Préférez un objet `approvalCapability` sur le plugin de canal lorsque le canal a besoin d'un comportement spécifique aux approbations.
- `ChannelPlugin.approvals` est supprimé. Mettez les faits de livraison/natif/rendering/auth d'approbation sur `approvalCapability`.
- `plugin.auth` est login/logout uniquement ; core ne lit plus les hooks d'auth d'approbation depuis cet objet.
- `approvalCapability.authorizeActorAction` et `approvalCapability.getActionAvailabilityState` sont la jonction canonique d'auth d'approbation.
- Utilisez `approvalCapability.getActionAvailabilityState` pour la disponibilité de l'auth d'approbation dans la même conversation.
- Si votre canal expose des approbations d'exécution natives, utilisez `approvalCapability.getExecInitiatingSurfaceState` pour l'état de la surface/initiateur/client-natif lorsqu'il diffère de l'autorisation d'approbation de même discussion. Le cœur utilise ce crochet spécifique à l'exécution pour distinguer `enabled` vs `disabled`, décider si le canal initiateur prend en charge les approbations d'exécution natives, et inclure le canal dans les instructions de secours du client natif. `createApproverRestrictedNativeApprovalCapability(...)` remplit cela pour le cas courant.
- Utilisez `outbound.shouldSuppressLocalPayloadPrompt` ou `outbound.beforeDeliverPayload` pour le comportement du cycle de vie de la charge utile spécifique au canal, tel que le masquage des invites d'approbation locale en double ou l'envoi d'indicateurs de frappe avant la livraison.
- Utilisez `approvalCapability.delivery` uniquement pour le routage des approbations natives ou la suppression du secours.
- Utilisez `approvalCapability.nativeRuntime` pour les faits d'approbation natifs possédés par le canal. Gardez-le paresseux sur les points d'entrée à chaud du canal avec `createLazyChannelApprovalNativeRuntimeAdapter(...)`, qui peut importer votre module d'exécution à la demande tout en permettant au cœur d'assembler le cycle de vie de l'approbation.
- Utilisez `approvalCapability.render` uniquement lorsqu'un canal a vraiment besoin de charges utiles d'approbation personnalisées au lieu du moteur de rendu partagé.
- Utilisez `approvalCapability.describeExecApprovalSetup` lorsque le canal souhaite que la réponse du chemin désactivé explique les boutons de configuration exacts nécessaires pour activer les approbations d'exécution natives. Le crochet reçoit `{ channel, channelLabel, accountId }` ; les canaux à compte nommé doivent afficher des chemins délimités au compte tels que `channels.<channel>.accounts.<id>.execApprovals.*` au lieu des valeurs par défaut de niveau supérieur.
- Si un canal peut déduire des identités DM stables de type propriétaire à partir de la configuration existante, utilisez `createResolvedApproverActionAuthAdapter` à partir de `openclaw/plugin-sdk/approval-runtime` pour restreindre `/approve` de même discussion sans ajouter de logique cœur spécifique à l'approbation.
- Si un canal a besoin d'une livraison native des approbations, concentrez le code du canal sur la normalisation des cibles ainsi que sur les faits de transport/présentation. Utilisez `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver` et `createApproverRestrictedNativeApprovalCapability` de `openclaw/plugin-sdk/approval-runtime`. Placez les faits spécifiques au canal derrière `approvalCapability.nativeRuntime`, idéalement via `createChannelApprovalNativeRuntimeAdapter(...)` ou `createLazyChannelApprovalNativeRuntimeAdapter(...)`, afin que le cœur puisse assembler le gestionnaire et gérer le filtrage des requêtes, le routage, la déduplication, l'expiration, l'abonnement à la passerelle et les avis de routage ailleurs. `nativeRuntime` est divisé en quelques plus petites interfaces :
- `availability` — si le compte est configuré et si une requête doit être traitée
- `presentation` — mapper le modèle de vue d'approbation partagé en charges utiles natives en attente/résolues/expirées ou en actions finales
- `transport` — préparer les cibles et envoyer/mettre à jour/supprimer les messages d'approbation natifs
- `interactions` — crochets optionnels bind/unbind/clear-action pour les boutons natifs ou les réactions
- `observe` — crochets optionnels pour les diagnostics de livraison
- Si le canal a besoin d'objets détenus par l'exécution tels qu'un client, un jeton, une application Bolt ou un récepteur de webhook, enregistrez-les via `openclaw/plugin-sdk/channel-runtime-context`. Le registre générique de contexte d'exécution permet au cœur d'amorcer les gestionnaires pilotés par les capacités à partir de l'état de démarrage du canal sans ajouter de colle wrapper spécifique aux approbations.
- N'utilisez `createChannelApprovalHandler` ou `createChannelNativeApprovalRuntime` de niveau inférieur que lorsque l'interface pilotée par les capacités n'est pas encore assez expressive.
- Les canaux d'approbation natifs doivent router à la fois `accountId` et `approvalKind` via ces assistants. `accountId` maintient la stratégie d'approbation multi-compte limitée au bon compte bot, et `approvalKind` rend le comportement d'approbation exécutif vs plugin disponible pour le canal sans branches codées en dur dans le cœur.
- Le cœur possède désormais également les avis de réacheminement des approbations. Les plugins de canal ne doivent pas envoyer leurs propres messages de suivi « l'approbation est passée en DM / un autre canal » à partir de `createChannelNativeApprovalRuntime` ; à la place, exposez un routage précis de l'origine + DM de l'approbateur via les assistants de capacité d'approbation partagés et laissez le cœur agréger les livraisons réelles avant de publier un avis de retour vers le chat initiateur.
- Conservez le type d'ID d'approbation livré de bout en bout. Les clients natifs ne doivent pas deviner ou réécrire le routage des approbations exec vs plugin à partir de l'état local au canal.
- Différents types d'approbation peuvent intentionnellement exposer différentes surfaces natives.
  Exemples groupés actuels :
  - Slack conserve le routage d'approbation natif disponible pour les ID exec et plugin.
  - Matrix conserve le même routage natif DM/canal et l'UX de réaction pour les approbations exec et plugin, tout en permettant toujours à l'auth de différer selon le type d'approbation.
- `createApproverRestrictedNativeApprovalAdapter` existe toujours en tant que wrapper de compatibilité, mais le nouveau code devrait préférer le générateur de capacités et exposer `approvalCapability` sur le plugin.

Pour les points d'entrée à chaud de canal, préférez les sous-chemins d'exécution plus étroits lorsque vous n'avez besoin que d'une seule partie de cette famille :

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
`openclaw/plugin-sdk/setup-adapter-runtime`,
`openclaw/plugin-sdk/reply-runtime`,
`openclaw/plugin-sdk/reply-dispatch-runtime`,
`openclaw/plugin-sdk/reply-reference`, et
`openclaw/plugin-sdk/reply-chunking` lorsque vous n'avez pas besoin de la surface parapluie plus large.

Pour la configuration spécifiquement :

- `openclaw/plugin-sdk/setup-runtime` couvre les assistants de configuration sécurisés pour l'exécution :
  adaptateurs de correctifs de configuration sécurisés pour l'importation (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), sortie de note de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries`, et les générateurs de proxy de configuration délégués
- `openclaw/plugin-sdk/setup-adapter-runtime` est la jointure d'adaptation étroite sensible à l'environnement
  pour `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` couvre les builders de configuration d'installation facultative
  ainsi que quelques primitives sécurisées pour la configuration :
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

Si votre channel prend en charge la configuration ou l'authentification basée sur des variables d'environnement et que les flux génériques de démarrage/configuration doivent connaître ces noms de variables avant le chargement du runtime, déclarez-les dans le manifeste du plugin avec `channelEnvVars`. Gardez le `envVars` du channel ou les constantes locales pour le texte destiné aux opérateurs uniquement.

Si votre channel peut apparaître dans `status`, `channels list`, `channels status`, ou
les analyses SecretRef avant le démarrage du runtime du plugin, ajoutez `openclaw.setupEntry` dans
`package.json`. Ce point d'entrée doit être sûr à importer dans les chemins de commande en lecture seule et doit renvoyer les métadonnées du channel, l'adaptateur de configuration sécurisé, l'adaptateur de statut et les métadonnées de la cible secrète du channel nécessaires pour ces résumés. Ne démarrez pas de clients, d'écouteurs ou de runtimes de transport à partir du point d'entrée de configuration.

Gardez également le chemin d'importation de l'entrée principale du channel étroit. La découverte peut évaluer l'entrée et le module du plugin de channel pour enregistrer les capacités sans activer le channel. Les fichiers tels que `channel-plugin-api.ts` doivent exporter l'objet du plugin de channel sans importer les assistants de configuration, les clients de transport, les écouteurs de socket, les lanceurs de sous-processus ou les modules de démarrage de service. Placez ces pièces de runtime dans des modules chargés depuis `registerFull(...)`, les setters de runtime ou les adaptateurs de capacité différés.

`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, et
`splitSetupEntries`

- utilisez la couture `openclaw/plugin-sdk/setup` plus large uniquement lorsque vous avez également besoin des assistants partagés plus lourds de configuration/démarrage tels que
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si votre channel souhaite uniquement annoncer « installer ce plugin d'abord » dans les surfaces de configuration, préférez `createOptionalChannelSetupSurface(...)`. L'adaptateur/l'assistant généré échouent de manière fermée sur les écritures de configuration et la finalisation, et ils réutilisent le même message d'installation requise pour la validation, la finalisation et le copier-coller du lien vers la documentation.

Pour d'autres chemins critiques du channel, préférez les assistants étroits aux surfaces héritées plus larges :

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution` et
  `openclaw/plugin-sdk/account-helpers` pour la configuration multi-compte et
  le repli vers le compte par défaut
- `openclaw/plugin-sdk/inbound-envelope` et
  `openclaw/plugin-sdk/inbound-reply-dispatch` pour le routage/l'enveloppe entrant et
  le câblage d'enregistrement et de répartition
- `openclaw/plugin-sdk/messaging-targets` pour l'analyse et la correspondance des cibles
- `openclaw/plugin-sdk/outbound-media` et
  `openclaw/plugin-sdk/outbound-runtime` pour le chargement des médias, ainsi que les délégués d'identité et d'envoi sortant et la planification de la charge utile
- `buildThreadAwareOutboundSessionRoute(...)` à partir de
  `openclaw/plugin-sdk/channel-core` lorsqu'une route sortante doit préserver un
  `replyToId`/`threadId` explicite ou récupérer la session `:thread:` actuelle
  après que la clé de session de base correspond toujours. Les plugins de fournisseur peuvent remplacer la priorité, le comportement de suffixe et la normalisation de l'ID de thread lorsque leur plateforme a des sémantiques de livraison de thread natives.
- `openclaw/plugin-sdk/thread-bindings-runtime` pour le cycle de vie de liaison de thread
  et l'enregistrement de l'adaptateur
- `openclaw/plugin-sdk/agent-media-payload` uniquement lorsque la disposition du champ de charge utile d'agent/média héritée est encore requise
- `openclaw/plugin-sdk/telegram-command-config` pour la normalisation des commandes personnalisées Telegram,
  la validation des doublons/conflits et un contrat de configuration de commande stable en repli

Les channels authentification uniquement peuvent généralement s'arrêter au chemin par défaut : le cœur gère les approbations et le plugin expose simplement les capacités sortantes/d'authentification. Les channels à approbation native tels que Matrix, Slack, Telegram et les transports de chat personnalisés devraient utiliser les assistants natifs partagés au lieu de créer leur propre cycle de vie d'approbation.

## Politique de mention entrante

Conservez la gestion des mentions entrantes divisée en deux couches :

- collecte de preuves appartenant au plugin
- évaluation de politique partagée

Utilisez `openclaw/plugin-sdk/channel-mention-gating` pour les décisions de politique de mention.
Utilisez `openclaw/plugin-sdk/channel-inbound` uniquement lorsque vous avez besoin du barillet d'assistance entrant plus large.

Convient bien à la logique locale du plugin :

- détection de réponse au bot
- détection de bot cité
- vérifications de participation au fil de discussion
- exclusions de messages de service/système
- caches natifs de la plateforme nécessaires pour prouver la participation du bot

Convient bien à l'aide partagée :

- `requireMention`
- résultat de mention explicite
- liste d'autorisation de mention implicite
- contournement de commande
- décision de saut final

Flux préféré :

1. Calculez les faits de mention locaux.
2. Passez ces faits dans `resolveInboundMentionDecision({ facts, policy })`.
3. Utilisez `decision.effectiveWasMentioned`, `decision.shouldBypassMention` et `decision.shouldSkip` dans votre porte d'entrée entrante.

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
les plugins de canal groupés qui dépendent déjà de l'injection d'exécution :

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

Si vous avez besoin uniquement de `implicitMentionKindWhen` et
`resolveInboundMentionDecision`, importez depuis
`openclaw/plugin-sdk/channel-mention-gating` pour éviter le chargement d'assistants d'exécution entrants non liés.

Les anciens assistants `resolveMentionGating*` restent sur `openclaw/plugin-sdk/channel-inbound` uniquement en tant qu'exportations de compatibilité. Le nouveau code devrait utiliser `resolveInboundMentionDecision({ facts, policy })`.

## Procédure pas à pas

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package and manifest">
    Créez les fichiers de plugin standard. Le champ `channel` dans `package.json` est ce qui fait de ce plugin un plugin de canal. Pour l'ensemble des métadonnées de package, consultez [Plugin Setup and Config](/fr/plugins/sdk-setup#openclaw-channel) :

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

    `configSchema` valide `plugins.entries.acme-chat.config`. Utilisez-le pour les paramètres appartenant au plugin qui ne sont pas la configuration du compte du canal. `channelConfigs` valide `channels.acme-chat` et est la source du chemin froid utilisée par le schéma de configuration, la configuration et les surfaces de l'interface utilisateur avant le chargement du runtime du plugin.

  </Step>

  <Step title="Créer l'objet du plugin channel">
    L'interface `ChannelPlugin` possède de nombreuses surfaces d'adaptateur optionnelles. Commencez par le minimum — `id` et `setup` — et ajoutez des adaptateurs selon vos besoins.

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

    <Accordion title="Ce que fait createChatChannelPlugin pour vous">
      Au lieu d'implémenter manuellement les interfaces d'adaptateur de bas niveau, vous passez des options déclaratives et le constructeur les compose :

      | Option | Ce qu'il connecte |
      | --- | --- |
      | `security.dm` | Résolveur de sécurité DM délimité à partir des champs de configuration |
      | `pairing.text` | Flux de jumelage DM basé sur du texte avec échange de code |
      | `threading` | Résolveur de mode de réponse (fixe, délimité au compte ou personnalisé) |
      | `outbound.attachedResults` | Fonctions d'envoi qui renvoient des métadonnées de résultat (ID de message) |

      Vous pouvez également passer des objets d'adaptateur bruts au lieu des options déclaratives si vous avez besoin d'un contrôle total.

      Les adaptateurs sortants bruts peuvent définir une fonction `chunker(text, limit, ctx)`.
      Le `ctx.formatting` optionnel transporte les décisions de formaturation au moment de la livraison
      telles que `maxLinesPerMessage` ; appliquez-le avant l'envoi afin que les fils de discussion
      et les limites des segments soient résolus une seule fois par la livraison sortante partagée.
      Les contextes d'envoi incluent également `replyToIdSource` (`implicit` ou `explicit`)
      lorsqu'une cible de réponse native a été résolue, permettant aux helpers de payload de préserver
      les balises de réponse explicites sans consommer un slot de réponse implicite à usage unique.
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
    ```

    Placez les descripteurs CLI appartenant au canal dans `registerCliMetadata(...)` afin qu'OpenClaw
    puisse les afficher dans l'aide racine sans activer le runtime complet du canal,
    tandis que les chargements complets normaux récupèrent toujours les mêmes descripteurs pour
    l'enregistrement réel des commandes. Gardez `registerFull(...)` pour les travaux exclusifs au runtime.
    Si `registerFull(...)` enregistre des méthodes RPC de passerelle, utilisez un
    préfixe spécifique au plugin. Les espaces de noms d'administration de base (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et sont toujours
    résolus vers `operator.admin`.
    `defineChannelPluginEntry` gère automatiquement la division du mode d'enregistrement. Consultez
    [Entry Points](/fr/plugins/sdk-entrypoints#definechannelpluginentry) pour toutes
    les options.

  </Step>

  <Step title="Ajouter une entrée de configuration">
    Créez `setup-entry.ts` pour un chargement léger lors de l'intégration :

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw charge ceci au lieu de l'entrée complète lorsque le canal est désactivé
    ou non configuré. Cela évite d'importer du code de runtime lourd pendant les flux de configuration.
    Consultez [Setup and Config](/fr/plugins/sdk-setup#setup-entry) pour plus de détails.

    Les canaux d'espace de travail regroupés qui séparent les exportations sûres pour la configuration
    en modules sidecar peuvent utiliser `defineBundledChannelSetupEntry(...)` depuis
    `openclaw/plugin-sdk/channel-entry-contract` lorsqu'ils ont également besoin d'un
    définisseur de runtime explicite au moment de la configuration.

  </Step>

  <Step title="Gérer les messages entrants">
    Votre plugin doit recevoir des messages de la plateforme et les transmettre à
    OpenClaw. Le modèle typique est un webhook qui vérifie la requête et
    la répartit via le gestionnaire entrant de votre canal :

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK —
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      La gestion des messages entrants est spécifique au canal. Chaque plugin de canal possède
      son propre pipeline entrant. Regardez les plugins de canal regroupés
      (par exemple le package de plugin Microsoft Teams ou Google Chat) pour des modèles réels.
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Tester">
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

    Pour les assistants de test partagés, consultez [Testing](/fr/plugins/sdk-testing).

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

## Rubriques avancées

<CardGroup cols={2}>
  <Card title="Options de discussion" icon="git-branch" href="/fr/plugins/sdk-entrypoints#registration-mode">
    Modes de réponse fixes, étendus au compte ou personnalisés
  </Card>
  <Card title="Intégration de l'outil de message" icon="puzzle" href="/fr/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool et découverte des actions
  </Card>
  <Card title="Résolution de cible" icon="crosshair" href="/fr/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Assistances d'exécution" icon="settings" href="/fr/plugins/sdk-runtime">
    TTS, STT, media, subagent via api.runtime
  </Card>
</CardGroup>

<Note>Certains points d'entrée d'assistance groupés existent toujours pour la maintenance et la compatibilité des plugins groupés. Ils ne constituent pas le modèle recommandé pour les nouveaux plugins de channel ; préférez les sous-chemins génériques channel/setup/reply/runtime de la surface commune du SDK, sauf si vous maintenez directement cette famille de plugins groupés.</Note>

## Étapes suivantes

- [Provider Plugins](/fr/plugins/sdk-provider-plugins) — si votre plugin fournit également des modèles
- [Présentation du SDK](/fr/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Tests du SDK](/fr/plugins/sdk-testing) — utilitaires de test et tests de contrat
- [Manifeste du plugin](/fr/plugins/manifest) — schéma complet du manifeste

## Connexes

- [Configuration du SDK de plugin](/fr/plugins/sdk-setup)
- [Création de plugins](/fr/plugins/building-plugins)
- [Plugins de harnais d'agent](/fr/plugins/sdk-agent-harness)
