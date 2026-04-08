---
title: "Création de plugins de canal"
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

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord [Getting Started](/en/plugins/building-plugins) pour découvrir la structure de base du package et la configuration du manifeste.</Info>

## Fonctionnement des plugins de canal

Les plugins de canal n'ont pas besoin de leurs propres outils d'envoi/de modification/de réaction. OpenClaw conserve un
outil `message` partagé dans le core. Votre plugin possède :

- **Config** — résolution de compte et assistant de configuration
- **Sécurité** — stratégie DM et listes autorisées
- **Appairage** — flux d'approbation DM
- **Grammaire de session** — comment les ids de conversation spécifiques au fournisseur sont mappés aux discussions de base, aux ids de fil et aux replis parents
- **Sortant** — l'envoi de texte, de médias et de sondages vers la plateforme
- **Enfilage** — comment les réponses sont organisées en fils

Le core possède l'outil de message partagé, le câblage des invites, la forme de la clé de session externe,
la tenue de livre générique `:thread:`, et la distribution.

Si votre plateforme stocke une portée supplémentaire dans les ids de conversation, gardez cet analyseur
dans le plugin avec `messaging.resolveSessionConversation(...)`. C'est le
hook canonique pour mapper `rawId` à l'id de conversation de base, à l'id de fil optionnel,
au `baseConversationId` explicite, et à tout `parentConversationCandidates`.
Lorsque vous renvoyez `parentConversationCandidates`, gardez-les ordonnés du
parent le plus étroit à la conversation la plus large/de base.

Les plugins groupés qui ont besoin du même analyseur avant le démarrage du registre de canaux
peuvent également exposer un fichier `session-key-api.ts` de niveau supérieur avec un export `resolveSessionConversation(...)` correspondant.
Le core n'utilise cette surface sécurisée pour le démarrage
que lorsque le registre de plugins d'exécution n'est pas encore disponible.

`messaging.resolveParentConversationCandidates(...)` reste disponible en tant que
repli de compatibilité hérité lorsqu'un plugin n'a besoin que de replis parents en plus
de l'id générique/brut. Si les deux hooks existent, le core utilise
`resolveSessionConversation(...).parentConversationCandidates` en premier et ne
revient à `resolveParentConversationCandidates(...)` que lorsque le hook canonique
les omet.

## Approbations et capacités des canaux

La plupart des plugins de canal n'ont pas besoin de code spécifique aux approbations.

- Le core possède les `/approve` dans la même discussion, les charges utiles partagées des boutons d'approbation, et la livraison de repli générique.
- Privilégiez un objet `approvalCapability` sur le plugin de canal lorsque celui-ci nécessite un comportement spécifique aux approbations.
- `approvalCapability.authorizeActorAction` et `approvalCapability.getActionAvailabilityState` constituent la jonction canonique pour l'authentification par approbation.
- Si votre canal expose des approbations d'exécution natives, implémentez `approvalCapability.getActionAvailabilityState` même lorsque le transport natif réside entièrement sous `approvalCapability.native`. Le cœur utilise ce crochet de disponibilité pour distinguer `enabled` de `disabled`, décider si le canal initiateur prend en charge les approbations natives, et inclure le canal dans les instructions de repli du client natif.
- Utilisez `outbound.shouldSuppressLocalPayloadPrompt` ou `outbound.beforeDeliverPayload` pour le comportement du cycle de vie des charges utiles spécifique au canal, tel que le masquage des invites d'approbation locales en double ou l'envoi d'indicateurs de frappe avant la livraison.
- Utilisez `approvalCapability.delivery` uniquement pour le routage des approbations natives ou la suppression du repli.
- Utilisez `approvalCapability.render` uniquement lorsqu'un canal a véritablement besoin de charges utiles d'approbation personnalisées au lieu du renderer partagé.
- Utilisez `approvalCapability.describeExecApprovalSetup` lorsque le canal souhaite que la réponse du chemin désactivé explique exactement les paramètres de configuration nécessaires pour activer les approbations d'exécution natives. Le crochet reçoit `{ channel, channelLabel, accountId }` ; les canaux avec compte nommé doivent afficher des chemins délimités au compte, tels que `channels.<channel>.accounts.<id>.execApprovals.*`, au lieu des valeurs par défaut de niveau supérieur.
- Si un canal peut déduire des identités de type propriétaire DM stables à partir de la configuration existante, utilisez `createResolvedApproverActionAuthAdapter` de `openclaw/plugin-sdk/approval-runtime` pour restreindre les `/approve` de même discussion sans ajouter de logique centrale spécifique aux approbations.
- Si un canal nécessite la livraison d'approbations natives, concentrez le code du canal sur la normalisation des cibles et les crochets de transport. Utilisez `createChannelExecApprovalProfile`, `createChannelNativeOriginTargetResolver`, `createChannelApproverDmTargetResolver`, `createApproverRestrictedNativeApprovalCapability` et `createChannelNativeApprovalRuntime` de `openclaw/plugin-sdk/approval-runtime` afin que le cœur gère le filtrage, le routage, la déduplication, l'expiration et l'abonnement à la passerelle des requêtes.
- Les canaux d'approbation natifs doivent faire passer à la fois `accountId` et `approvalKind` par ces assistants. `accountId` conserve la stratégie d'approbation multi-compte limitée au bon compte bot, et `approvalKind` rend le comportement d'approbation exécutable par rapport au plugin disponible pour le canal sans branches codées en dur dans le noyau.
- Conservez le type d'ID d'approbation livré de bout en bout. Les clients natifs ne doivent pas deviner ou réécrire le routage d'approbation exécutable par rapport au plugin à partir de l'état local au canal.
- Différents types d'approbation peuvent intentionnellement exposer différentes surfaces natives.
  Exemples groupés actuels :
  - Slack conserve le routage d'approbation natif disponible pour les IDs exécutables et de plugin.
  - Matrix conserve le routage natif DM/canal pour les approbations exécutables uniquement et laisse
    les approbations de plugin sur le chemin `/approve` de même chat partagé.
- `createApproverRestrictedNativeApprovalAdapter` existe toujours comme wrapper de compatibilité, mais le nouveau code devrait préférer le générateur de capacités et exposer `approvalCapability` sur le plugin.

Pour les points d'entrée à chaud du canal, préférez les sous-chemins d'exécution plus étroits lorsque vous n'avez besoin que d'une seule partie de cette famille :

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`

De même, préférez `openclaw/plugin-sdk/setup-runtime`,
`openclaw/plugin-sdk/setup-adapter-runtime`,
`openclaw/plugin-sdk/reply-runtime`,
`openclaw/plugin-sdk/reply-dispatch-runtime`,
`openclaw/plugin-sdk/reply-reference`, et
`openclaw/plugin-sdk/reply-chunking` lorsque vous n'avez pas besoin de la surface parapluie plus large.

Pour la configuration spécifiquement :

- `openclaw/plugin-sdk/setup-runtime` couvre les assistants de configuration sûrs pour l'exécution :
  adaptateurs de correctifs de configuration sécurisés pour l'importation (`createPatchedAccountSetupAdapter`,
  `createEnvPatchedAccountSetupAdapter`,
  `createSetupInputPresenceValidator`), sortie de note de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries`, et les générateurs
  de proxy de configuration délégués
- `openclaw/plugin-sdk/setup-adapter-runtime` est la jonction d'adaptateur étroite consciente de l'environnement
  pour `createEnvPatchedAccountSetupAdapter`
- `openclaw/plugin-sdk/channel-setup` couvre les générateurs de configuration d'installation facultative ainsi que quelques primitives sûres pour la configuration :
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,
  `createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
  `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled` et
  `splitSetupEntries`
- utilisez la couture `openclaw/plugin-sdk/setup` plus large uniquement lorsque vous avez également besoin des assistants plus lourds de configuration/installation partagés tels que
  `moveSingleAccountChannelSectionToDefaultAccount(...)`

Si votre channel souhaite uniquement annoncer « installez d'abord ce plugin » dans les surfaces de configuration,
préférez `createOptionalChannelSetupSurface(...)`. L'adaptateur/l'assistant généré échoue de manière fermée (fail closed) lors des écritures de configuration et de la finalisation, et ils réutilisent le même message d'installation requise pour la validation, la finalisation et la copie du lien de documentation.

Pour d'autres chemins de channel fréquents, préférez les assistants étroits aux surfaces héritées plus larges :

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
  `openclaw/plugin-sdk/outbound-runtime` pour le chargement des médias ainsi que les délégués d'identité et d'envoi sortant
- `openclaw/plugin-sdk/thread-bindings-runtime` pour le cycle de vie de liaison de thread
  et l'enregistrement de l'adaptateur
- `openclaw/plugin-sdk/agent-media-payload` uniquement lorsque la disposition des champs de payload agent/média héritée est encore requise
- `openclaw/plugin-sdk/telegram-command-config` pour la normalisation des commandes personnalisées Telegram,
  la validation des doublons/conflits, et un contrat de configuration de commande stable en repli

Les canaux d'authentification uniquement peuvent généralement s'arrêter au chemin par défaut : le cœur gère les approbations et le plugin expose simplement les capacités d'authentification et d'envoi sortant. Les canaux à approbation native tels que Matrix, Slack, Telegram et les transports de chat personnalisés devraient utiliser les assistants natifs partagés au lieu de créer leur propre cycle de vie d'approbation.

## Procédure pas à pas

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package and manifest">
    Créez les fichiers de plugin standard. Le champ `channel` dans `package.json` est
    ce qui fait de ce plugin un plugin de channel. Pour la surface complète des métadonnées de package,
    consultez [Plugin Setup and Config](/en/plugins/sdk-setup#openclawchannel) :

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

  <Step title="Build the channel plugin object">
    L'interface `ChannelPlugin` possède de nombreuses surfaces d'adaptateur optionnelles. Commencez par
    le minimum — `id` et `setup` — et ajoutez des adaptateurs au besoin.

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

    <Accordion title="What createChatChannelPlugin does for you">
      Au lieu d'implémenter manuellement les interfaces d'adaptateur de bas niveau, vous passez
      des options déclaratives et le générateur les compose :

      | Option | Ce qu'il connecte |
      | --- | --- |
      | `security.dm` | Résolveur de sécurité DM délimité à partir des champs de configuration |
      | `pairing.text` | Flux de jumelage DM basé sur du texte avec échange de code |
      | `threading` | Résolveur de mode de réponse (fixe, délimité au compte ou personnalisé) |
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

    Placez les descripteurs CLI du canal dans `registerCliMetadata(...)` afin qu'OpenClaw
    puisse les afficher dans l'aide racine sans activer l'exécution complète du canal,
    tandis que les chargements complets normaux récupèrent toujours les mêmes descripteurs pour l'enregistrement réel des
    commandes. Réservez `registerFull(...)` pour le travail uniquement lors de l'exécution.
    Si `registerFull(...)` enregistre des méthodes RPC de passerelle, utilisez un
    préfixe spécifique au plugin. Les espaces de noms d'administration principaux (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers
    `operator.admin`.
    `defineChannelPluginEntry` gère automatiquement la division du mode d'enregistrement. Consultez
    [Points d'entrée](/en/plugins/sdk-entrypoints#definechannelpluginentry) pour toutes
    les options.

  </Step>

  <Step title="Ajouter une entrée de configuration">
    Créez `setup-entry.ts` pour un chargement léger pendant l'onboarding :

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw charge ceci au lieu de l'entrée complète lorsque le canal est désactivé
    ou non configuré. Cela évite d'importer du code d'exécution lourd lors des flux de configuration.
    Consultez [Configuration et installation](/en/plugins/sdk-setup#setup-entry) pour plus de détails.

  </Step>

  <Step title="Gérer les messages entrants">
    Votre plugin doit recevoir les messages de la plateforme et les transmettre à
    OpenClaw. Le modèle typique est un webhook qui vérifie la requête et
    la distribue via le gestionnaire entrant de votre canal :

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
      son propre pipeline entrant. Regardez les plugins de canal fournis
      (par exemple le package du plugin Microsoft Teams ou Google Chat) pour des modèles réels.
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

    Pour les helpers de test partagés, consultez [Tests](/en/plugins/sdk-testing).

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
    Modes de réponse fixes, délimités par le compte ou personnalisés
  </Card>
  <Card title="Intégration de l'outil de message" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool et découverte des actions
  </Card>
  <Card title="Résolution de cible" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Helpers d'exécution" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, STT, média, subagent via api.runtime
  </Card>
</CardGroup>

<Note>Certains points d'entrée d'assistants groupés existent toujours pour la maintenance et la compatibilité des plugins groupés. Ils ne constituent pas le modèle recommandé pour les nouveaux plugins de canal ; préférez les sous-chemins génériques channel/setup/reply/runtime de la surface SDK commune, sauf si vous maintenez directement cette famille de plugins groupés.</Note>

## Étapes suivantes

- [Plugins de fournisseur](/en/plugins/sdk-provider-plugins) — si votre plugin fournit également des modèles
- [Aperçu du SDK](/en/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Tests du SDK](/en/plugins/sdk-testing) — utilitaires de test et tests de contrat
- [Manifeste de plugin](/en/plugins/manifest) — schéma complet du manifeste
