---
title: "Créer des plugins de canal"
sidebarTitle: "Plugins de canal"
summary: "Guide étape par étape pour créer un plugin de canal de messagerie pour OpenClaw"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

# Création de plugins de canal

Ce guide explique la création d'un plugin de canal qui connecte OpenClaw à une
plateforme de messagerie. À la fin, vous disposerez d'un canal fonctionnel avec la sécurité DM,
l'appairage, le threading des réponses et la messagerie sortante.

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord [Getting Started](/en/plugins/building-plugins) pour connaître la structure de package de base et la configuration du manifeste.</Info>

## Fonctionnement des plugins de canal

Les plugins de canal n'ont pas besoin de leurs propres outils d'envoi/de modification/de réaction. OpenClaw conserve un
outil `message` partagé dans le cœur. Votre plugin possède :

- **Config** — résolution de compte et assistant de configuration
- **Sécurité** — stratégie DM et listes autorisées
- **Appairage** — flux d'approbation DM
- **Grammaire de session** — comment les ids de conversation spécifiques au fournisseur sont mappés aux discussions de base, aux ids de fil et aux replis parents
- **Sortant** — l'envoi de texte, de médias et de sondages vers la plateforme
- **Enfilage** — comment les réponses sont organisées en fils

Le cœur possède l'outil de message partagé, le câblage des invites, la forme de la clé de session externe,
la tenue de livre `:thread:` générique et la répartition.

Si votre channel ajoute des paramètres de message-tool qui transportent des sources de médias, exposez ces
noms de paramètres via `describeMessageTool(...).mediaSourceParams`. Le Core utilise
cette liste explicite pour la normalisation des chemins du bac à sable et la politique d'accès aux
médias sortants, afin que les plugins n'aient pas besoin de cas particuliers shared-core pour les
paramètres d'avatar, de pièce jointe ou d'image de couverture spécifiques au provider.
Préférez renvoyer une carte indexée par action telle que
`{ "set-profile": ["avatarUrl", "avatarPath"] }` afin que les actions non liées n'héritent
pas des arguments média d'une autre action. Un tableau plat fonctionne toujours pour les paramètres
qui sont intentionnellement partagés entre chaque action exposée.

Si votre plateforme stocke une portée supplémentaire dans les identifiants de conversation, gardez cet
analyse dans le plugin avec `messaging.resolveSessionConversation(...)`. C'est le
hook canonique pour mapper `rawId` vers l'identifiant de conversation de base, l'identifiant de fil
optionnel, le `baseConversationId` explicite, et tout `parentConversationCandidates`.
Lorsque vous renvoyez `parentConversationCandidates`, gardez-les ordonnés du
parent le plus étroit vers la conversation la plus large/base.

Les plugins groupés qui ont besoin de la même analyse avant le démarrage du registre de channels
peuvent également exposer un fichier `session-key-api.ts` de premier niveau avec un export
`resolveSessionConversation(...)` correspondant. Le Core n'utilise cette surface sécurisée pour
l'amorçage que lorsque le registre de plugins d'exécution n'est pas encore disponible.

`messaging.resolveParentConversationCandidates(...)` reste disponible en tant
que solution de repli de compatibilité héritée lorsqu'un plugin a uniquement besoin de replis parents au-dessus
de l'identifiant générique/brut. Si les deux hooks existent, le core utilise
`resolveSessionConversation(...).parentConversationCandidates` en premier et ne
revient à `resolveParentConversationCandidates(...)` que lorsque le hook canonique
les omet.

## Approbations et capacités du channel

La plupart des plugins de channel n'ont pas besoin de code spécifique aux approbations.

- Le Core gère les `/approve` de même chat, les charges utiles partagées des boutons d'approbation, et la livraison de repli générique.
- Préférez un objet `approvalCapability` sur le plugin de channel lorsque le channel a besoin d'un comportement spécifique aux approbations.
- `ChannelPlugin.approvals` est supprimé. Placez les faits de livraison/natif/render/auth d'approbation sur `approvalCapability`.
- `plugin.auth` est uniquement login/logout ; le noyau ne lit plus les hooks d'auth d'approbation depuis cet objet.
- `approvalCapability.authorizeActorAction` et `approvalCapability.getActionAvailabilityState` sont la jointure canonique pour l'auth d'approbation.
- Utilisez `approvalCapability.getActionAvailabilityState` pour la disponibilité de l'auth d'approbation same-chat.
- Si votre canal expose des approbations d'exécution natives, utilisez `approvalCapability.getExecInitiatingSurfaceState` pour l'état de la surface/initiative/natif-client lorsqu'il diffère de l'auth d'approbation same-chat. Le noyau utilise ce hook spécifique à l'exécution pour distinguer `enabled` vs `disabled`, décider si le canal initiateur prend en charge les approbations d'exécution natives, et inclure le canal dans les conseils de repli du client natif. `createApproverRestrictedNativeApprovalCapability(...)` remplit cela pour le cas courant.
- Utilisez `outbound.shouldSuppressLocalPayloadPrompt` ou `outbound.beforeDeliverPayload` pour le comportement du cycle de vie des payloads spécifique au canal, tel que masquer les invites d'approbation locales en double ou envoyer des indicateurs de frappe avant la livraison.
- Utilisez `approvalCapability.delivery` uniquement pour le routage des approbations natives ou la suppression du repli.
- Utilisez `approvalCapability.nativeRuntime` pour les faits d'approbation natifs appartenant au canal. Gardez-le paresseux sur les points d'entrée à chaud du canal avec `createLazyChannelApprovalNativeRuntimeAdapter(...)`, qui peut importer votre module d'exécution à la demande tout en permettant au noyau d'assembler le cycle de vie de l'approbation.
- Utilisez `approvalCapability.render` uniquement lorsqu'un canal a vraiment besoin de payloads d'approbation personnalisés au lieu du moteur de rendu partagé.
- Utilisez `approvalCapability.describeExecApprovalSetup` lorsque le canal souhaite que la réponse du chemin désactivé explique les boutons de configuration exacts nécessaires pour activer les approbations d'exécution natives. Le hook reçoit `{ channel, channelLabel, accountId }` ; les canaux à compte nommé doivent rendre des chemins délimités au compte tels que `channels.<channel>.accounts.<id>.execApprovals.*` au lieu des valeurs par défaut de premier niveau.
- Si un canal peut déduire des identités DM stables de type propriétaire à partir de la configuration existante, utilisez `createResolvedApproverActionAuthAdapter` depuis `openclaw/plugin-sdk/approval-runtime` pour restreindre `/approve` same-chat sans ajouter de logique principale spécifique aux approbations.
- Si un canal nécessite une livraison d'approbation native, concentrez le code du canal sur la normalisation des cibles ainsi que sur les faits de transport/présentation. Utilisez `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver` et `createApproverRestrictedNativeApprovalCapability` de `openclaw/plugin-sdk/approval-runtime`. Placez les faits spécifiques au canal derrière `approvalCapability.nativeRuntime`, idéalement via `createChannelApprovalNativeRuntimeAdapter(...)` ou `createLazyChannelApprovalNativeRuntimeAdapter(...)`, afin que le cœur puisse assembler le gestionnaire et s'occuper du filtrage des requêtes, du routage, de la déduplication, de l'expiration, de l'abonnement à la passerelle et des avis de routage ailleurs. `nativeRuntime` est divisé en quelques interfaces plus petites :
- `availability` — si le compte est configuré et si une requête doit être traitée
- `presentation` — mapper le modèle de vue d'approbation partagé en charges utiles natives en attente/résolues/expirées ou actions finales
- `transport` — préparer les cibles plus envoyer/mettre à jour/supprimer les messages d'approbation natifs
- `interactions` — crochets optionnels bind/unbind/clear-action pour les boutons natifs ou les réactions
- `observe` — crochets optionnels pour les diagnostics de livraison
- Si le canal a besoin d'objets possédés par l'exécution tels qu'un client, un jeton, une application Bolt ou un récepteur de webhook, enregistrez-les via `openclaw/plugin-sdk/channel-runtime-context`. Le registre de contexte d'exécution générique permet au cœur d'amorcer les gestionnaires pilotés par les capacités à partir de l'état de démarrage du canal sans ajouter de colle d'enveloppe spécifique à l'approbation.
- N'utilisez `createChannelApprovalHandler` ou `createChannelNativeApprovalRuntime` de niveau inférieur que lorsque l'interface pilotée par les capacités n'est pas encore assez expressive.
- Les canaux d'approbation natifs doivent faire passer à la fois `accountId` et `approvalKind` par ces assistants. `accountId` maintient la stratégie d'approbation multi-compte limitée au bon compte de bot, et `approvalKind` maintient le comportement d'approbation exec vs plugin disponible pour le canal sans branches codées en dur dans le cœur.
- Core possède désormais également les avis de réacheminement des approbations. Les plugins de channel ne doivent pas envoyer leurs propres messages de suivi « l'approbation est allée dans les DMs / un autre channel » depuis `createChannelNativeApprovalRuntime` ; à la place, exposez un routage précis de l'origine + DM de l'approbateur via les assistants de capacité d'approbation partagés et laissez le noyau agréger les livraisons réelles avant de publier tout avis vers le chat initiateur.
- Conservez le type d'ID d'approbation livré de bout en bout. Les clients natifs ne doivent pas
  deviner ou réécrire le routage d'approbation exec vs plugin à partir de l'état local du channel.
- Différents types d'approbations peuvent intentionnellement exposer différentes surfaces natives.
  Exemples groupés actuels :
  - Slack conserve le routage natif des approbations disponible pour les IDs exec et plugin.
  - Matrix conserve le même routage natif DM/channel et la même UX de réaction pour les approbations
    exec et plugin, tout en permettant à l'authentification de différer selon le type d'approbation.
- `createApproverRestrictedNativeApprovalAdapter` existe toujours en tant que wrapper de compatibilité, mais le nouveau code devrait préférer le générateur de capacités et exposer `approvalCapability` sur le plugin.

Pour les points d'entrée à chaud du channel, préférez les sous-chemins d'exécution plus étroits lorsque vous n'avez besoin
que d'une seule partie de cette famille :

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
`openclaw/plugin-sdk/reply-chunking` lorsque vous n'avez pas besoin de la surface parapluie
plus large.

Spécifiquement pour la configuration :

- `openclaw/plugin-sdk/setup-runtime` couvre les assistants de configuration sûrs pour l'exécution :
  adaptateurs de correctifs de configuration sûrs à l'importation (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), sortie de note de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries`, et les générateurs
  de proxy de configuration délégués
- `openclaw/plugin-sdk/setup-adapter-runtime` est la jonction d'adaptateur
  étroite et sensible à l'environnement pour `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` couvre les builders de configuration d'installation facultative plus quelques primitives sûres pour la configuration :
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

Si votre channel prend en charge la configuration ou l'authentification pilotée par les variables d'environnement et que les flux de démarrage/configuration génériques doivent connaître ces noms d'environnement avant le chargement du runtime, déclarez-les dans le manifeste du plugin avec `channelEnvVars`. Gardez le runtime du channel `envVars` ou les constantes locales uniquement pour le texte destiné aux opérateurs.
`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, et
`splitSetupEntries`

- n'utilisez la couche `openclaw/plugin-sdk/setup` plus large que lorsque vous avez également besoin des aides plus lourdes partagées pour la configuration/démarrage, telles que
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si votre channel souhaite uniquement annoncer « installer ce plugin d'abord » dans les surfaces de configuration, préférez `createOptionalChannelSetupSurface(...)`. L'adaptateur/l'assistant généré échoue de manière fermée lors des écritures de configuration et de la finalisation, et ils réutilisent le même message d'installation requise pour la validation, la finalisation et le copier-coller du lien vers la documentation.

Pour les autres chemins critiques du channel, préférez les aides étroites aux surfaces héritées plus larges :

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution`, et
  `openclaw/plugin-sdk/account-helpers` pour la configuration multi-compte et
  le repli vers le compte par défaut
- `openclaw/plugin-sdk/inbound-envelope` et
  `openclaw/plugin-sdk/inbound-reply-dispatch` pour le routage/l'enveloppe entrant et
  le câblage d'enregistrement et de répartition
- `openclaw/plugin-sdk/messaging-targets` pour l'analyse et la correspondance des cibles
- `openclaw/plugin-sdk/outbound-media` et
  `openclaw/plugin-sdk/outbound-runtime` pour le chargement des médias ainsi que les délégués d'identité et d'envoi sortant
- `openclaw/plugin-sdk/thread-bindings-runtime` pour le cycle de vie de liaison de thread
  et l'inscription de l'adaptateur
- `openclaw/plugin-sdk/agent-media-payload` uniquement lorsque la disposition héritée des champs de payload agent/média est encore requise
- `openclaw/plugin-sdk/telegram-command-config` pour la normalisation des commandes personnalisées Telegram, la validation des doublons/conflits, et un contrat de configuration de commande stable en repli

Les canaux avec authentification uniquement peuvent généralement s'en tenir au chemin par défaut : le cœur gère les approbations et le plugin expose simplement les capacités d'authentification et de sortie. Les canaux avec approbation native tels que Matrix, Slack, Telegram et les transports de chat personnalisés devraient utiliser les assistants natifs partagés au lieu de créer leur propre cycle de vie d'approbation.

## Stratégie de mention entrante

Conservez la gestion des mentions entrantes divisée en deux couches :

- collecte de preuves appartenant au plugin
- évaluation de stratégie partagée

Utilisez `openclaw/plugin-sdk/channel-inbound` pour la couche partagée.

Convient bien à la logique locale du plugin :

- détection de réponse au bot
- détection de citation du bot
- vérifications de participation au fil de discussion
- exclusions de messages système/service
- caches natifs à la plate-forme nécessaires pour prouver la participation du bot

Convient bien à l'assistant partagé :

- `requireMention`
- résultat de mention explicite
- liste d'autorisation de mention implicite
- contournement de commande
- décision finale d'ignorer

Flux privilégié :

1. Calculez les faits de mention locaux.
2. Passez ces faits à `resolveInboundMentionDecision({ facts, policy })`.
3. Utilisez `decision.effectiveWasMentioned`, `decision.shouldBypassMention` et `decision.shouldSkip` dans votre portail entrant.

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
les canaux de plugin groupés qui dépendent déjà de l'injection d'exécution :

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

Les anciens assistants `resolveMentionGating*` restent sur
`openclaw/plugin-sdk/channel-inbound` uniquement en tant qu'exportations de compatibilité. Le nouveau code
devrait utiliser `resolveInboundMentionDecision({ facts, policy })`.

## Procédure pas à pas

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package et manifeste">
    Créez les fichiers de plugin standard. Le champ `channel` dans `package.json` est
    ce qui fait de ce plugin un plugin de canal. Pour la surface complète des métadonnées de package,
    voir [Configuration et configuration des plugins](/en/plugins/sdk-setup#openclaw-channel) :

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
        "properties": {
          "acme-chat": {
            "type": "object",
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

  </Step>

  <Step title="Créer l'objet du plugin de channel">
    L'interface `ChannelPlugin` possède de nombreuses surfaces d'adaptateur optionnelles. Commencez par
    le minimum — `id` et `setup` — et ajoutez les adaptateurs dont vous avez besoin.

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

    <Accordion title="Ce que createChatChannelPlugin fait pour vous">
      Au lieu d'implémenter manuellement les interfaces de bas niveau, vous passez
      des options déclaratives et le constructeur les compose :

      | Option | Ce qu'il connecte |
      | --- | --- |
      | `security.dm` | Résolveur de sécurité DM délimité à partir des champs de configuration |
      | `pairing.text` | Flux d'appairage DM basé sur du texte avec échange de code |
      | `threading` | Résolveur de mode de réponse (fixe, délimité au compte, ou personnalisé) |
      | `outbound.attachedResults` | Fonctions d'envoi qui renvoient des métadonnées de résultat (ID de message) |

      Vous pouvez également passer des objets d'adaptateur bruts au lieu des options déclaratives
      si vous avez besoin d'un contrôle total.
    </Accordion>

  </Step>

  <Step title="Câbler le point d'entrée">
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

    Placez les descripteurs CLI appartenant au channel dans `registerCliMetadata(...)` pour qu'OpenClaw
    puisse les afficher dans l'aide racine sans activer le runtime complet du channel,
    tandis que les chargements complets normaux récupèrent toujours les mêmes descripteurs pour l'enregistrement réel des
    commandes. Gardez `registerFull(...)` pour le travail exclusif au runtime.
    Si `registerFull(...)` enregistre des méthodes RPC de passerelle, utilisez un
    préfixe spécifique au plugin. Les espaces de noms d'administration principaux (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent
    toujours vers `operator.admin`.
    `defineChannelPluginEntry` gère automatiquement la division du mode d'enregistrement. Consultez
    [Entry Points](/en/plugins/sdk-entrypoints#definechannelpluginentry) pour toutes
    les options.

  </Step>

  <Step title="Ajouter une entrée de configuration">
    Créez `setup-entry.ts` pour un chargement léger lors de l'onboarding :

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw charge ceci au lieu de l'entrée complète lorsque le channel est désactivé
    ou non configuré. Cela évite d'importer du code d'exécution lourd lors des flux de configuration.
    Voir [Setup and Config](/en/plugins/sdk-setup#setup-entry) pour plus de détails.

    Les canaux d'espace de travail regroupés qui séparent les exportations sûres pour la configuration en modules
    sidecar peuvent utiliser `defineBundledChannelSetupEntry(...)` à partir de
    `openclaw/plugin-sdk/channel-entry-contract` lorsqu'ils ont également besoin d'un
    définisseur d'exécution explicite au moment de la configuration.

  </Step>

  <Step title="Gérer les messages entrants">
    Votre plugin doit recevoir des messages de la plateforme et les transmettre à
    OpenClaw. Le modèle typique est un webhook qui vérifie la demande et
    la distribue via le gestionnaire entrant de votre channel :

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
      La gestion des messages entrants est spécifique au channel. Chaque plugin de channel possède
      son propre pipeline entrant. Regardez les plugins de channel regroupés
      (par exemple le package de plugin Microsoft Teams ou Google Chat) pour des modèles réels.
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

    Pour les helpers de test partagés, voir [Testing](/en/plugins/sdk-testing).

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
  <Card title="Options de discussion" icon="git-branch" href="/en/plugins/sdk-entrypoints#registration-mode">
    Modes de réponse fixes, limités au compte ou personnalisés
  </Card>
  <Card title="Intégration de l'outil de message" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool et découverte d'actions
  </Card>
  <Card title="Résolution de la cible" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Assistants d'exécution" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, STT, media, subagent via api.runtime
  </Card>
</CardGroup>

<Note>Certaines couches d'assistance groupées (bundled) existent toujours pour la maintenance et la compatibilité des plugins groupés. Elles ne constituent pas le modèle recommandé pour les nouveaux plugins de channel ; privilégiez les sous-chemins génériques channel/setup/reply/runtime de la surface commune du SDK, sauf si vous maintenez directement cette famille de plugins groupés.</Note>

## Étapes suivantes

- [Plugins de fournisseur](/en/plugins/sdk-provider-plugins) — si votre plugin fournit également des modèles
- [Aperçu du SDK](/en/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Tests du SDK](/en/plugins/sdk-testing) — utilitaires de test et tests de contrat
- [Manifeste de plugin](/en/plugins/manifest) — schéma complet du manifeste
