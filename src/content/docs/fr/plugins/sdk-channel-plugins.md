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

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord [Getting Started](/en/plugins/building-plugins) pour connaître la structure de base du package et la configuration du manifeste.</Info>

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
- Utilisez `auth.authorizeActorAction` ou `auth.getActionAvailabilityState` uniquement lorsque l'auth d'approbation diffère de l'auth de discussion normale.
- Utilisez `outbound.shouldSuppressLocalPayloadPrompt` ou `outbound.beforeDeliverPayload` pour le comportement du cycle de vie de la charge utile spécifique au canal, tel que le masquage des invites d'approbation locale en double ou l'envoi d'indicateurs de frappe avant la livraison.
- Utilisez `approvals.delivery` uniquement pour le routage d'approbation natif ou la suppression du repli.
- Utilisez `approvals.render` uniquement lorsqu'un canal a vraiment besoin de charges utiles d'approbation personnalisées au lieu du moteur de rendu partagé.
- Si un canal peut déduire des identités DM stables de type propriétaire à partir de la configuration existante, utilisez `createResolvedApproverActionAuthAdapter` de `openclaw/plugin-sdk/approval-runtime` pour restreindre les `/approve` de même discussion sans ajouter de logique principale spécifique à l'approbation.

Pour Slack, Matrix, Microsoft Teams et les canaux de chat similaires, le chemin par défaut suffit généralement : le cœur gère les approbations et le plugin expose simplement les capacités sortantes et d'authentification normales.

## Procédure pas à pas

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package et manifeste">
    Créez les fichiers de plugin standard. Le champ `channel` dans `package.json` est
    ce qui fait de ce plugin un plugin de canal :

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

  <Step title="Créer l'objet de plugin de channel">
    L'interface `ChannelPlugin` dispose de nombreuses surfaces d'adaptateur facultatives. Commencez par le minimum — `id` et `setup` — et ajoutez des adaptateurs selon vos besoins.

    Créez `src/channel.ts` :

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
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
      Au lieu d'implémenter manuellement les interfaces d'adaptateur de bas niveau, vous passez des options déclaratives et le générateur les compose :

      | Option | Ce qu'il connecte |
      | --- | --- |
      | `security.dm` | Résolveur de sécurité DM délimité à partir des champs de configuration |
      | `pairing.text` | Flux de couplage DM basé sur du texte avec échange de code |
      | `threading` | Résolveur de mode de réponse (fixe, délimité au compte ou personnalisé) |
      | `outbound.attachedResults` | Fonctions d'envoi qui renvoient les métadonnées de résultat (ID de message) |

      Vous pouvez également passer des objets d'adaptateur bruts au lieu des options déclaratives si vous avez besoin d'un contrôle total.
    </Accordion>

  </Step>

  <Step title="Connecter le point d'entrée">
    Créez `index.ts` :

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
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

    Placez les descripteurs CLI appartenant au channel dans `registerCliMetadata(...)` afin qu'OpenClaw puisse les afficher dans l'aide racine sans activer l'environnement d'exécution complet du channel, tandis que les chargements complets normaux récupèrent toujours les mêmes descripteurs pour l'enregistrement réel des commandes. Conservez `registerFull(...)` pour le travail uniquement en cours d'exécution. `defineChannelPluginEntry` gère automatiquement la division du mode d'enregistrement. Consultez [Entry Points](/en/plugins/sdk-entrypoints#definechannelpluginentry) pour toutes les options.

  </Step>

  <Step title="Ajouter une entrée de configuration">
    Créez `setup-entry.ts` pour un chargement léger pendant l'onboarding :

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw charge ceci au lieu de l'entrée complète lorsque le channel est désactivé ou non configuré. Cela évite d'intégrer du code d'exécution lourd lors des flux de configuration. Consultez [Setup and Config](/en/plugins/sdk-setup#setup-entry) pour plus de détails.

  </Step>

  <Step title="Handle inbound messages">
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
      son propre pipeline entrant. Consultez les plugins de canal fournis
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

    Pour les helpers de test partagés, consultez [Testing](/en/plugins/sdk-testing).

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
  <Card title="Threading options" icon="git-branch" href="/en/plugins/sdk-entrypoints#registration-mode">
    Modes de réponse fixes, délimités par compte ou personnalisés
  </Card>
  <Card title="Message tool integration" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool et découverte d'actions
  </Card>
  <Card title="Target resolution" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, STT, média, subagent via api.runtime
  </Card>
</CardGroup>

## Étapes suivantes

- [Provider Plugins](/en/plugins/sdk-provider-plugins) — si votre plugin fournit également des modèles
- [SDK Overview](/en/plugins/sdk-overview) — référence complète des imports de sous-chemins
- [SDK Testing](/en/plugins/sdk-testing) — utilitaires de test et tests de contrat
- [Plugin Manifest](/en/plugins/manifest) — schéma complet du manifeste
