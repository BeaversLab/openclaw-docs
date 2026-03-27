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

<Info>
  Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord [Getting
  Started](/fr/plugins/building-plugins) pour connaître la structure de base du package et la
  configuration du manifeste.
</Info>

## Fonctionnement des plugins de canal

Les plugins de canal n'ont pas besoin de leurs propres outils d'envoi/modification/réaction. OpenClaw conserve un
outil partagé `message` dans le cœur. Votre plugin possède :

- **Config** — résolution de compte et assistant de configuration
- **Sécurité** — stratégie DM et listes autorisées
- **Appairage** — flux d'approbation DM
- **Sortant** — envoi de texte, de médias et de sondages vers la plateforme
- **Threading** — mode d'organisation des réponses en fils

Le cœur possède l'outil de message partagé, le câblage des invites, la tenue de session et
la répartition.

## Procédure pas à pas

<Steps>
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

  <Step title="Construire l'objet du plugin de channel">
    L'interface `ChannelPlugin` possède de nombreuses surfaces d'adaptateur optionnelles. Commencez par
    le minimum — `id` et `setup` — et ajoutez des adaptateurs selon vos besoins.

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
      Au lieu d'implémenter manuellement les interfaces d'adaptateur de bas niveau, vous passez
      des options déclaratives et le générateur les compose :

      | Option | Ce qu'il connecte |
      | --- | --- |
      | `security.dm` | Résolveur de sécurité DM délimité depuis les champs de configuration |
      | `pairing.text` | Flux d'appariement DM basé sur du texte avec échange de code |
      | `threading` | Résolveur de mode de réponse (fixe, délimité au compte, ou personnalisé) |
      | `outbound.attachedResults` | Fonctions d'envoi qui renvoient des métadonnées de résultat (ID de message) |

      Vous pouvez également passer des objets d'adaptateur bruts au lieu des options déclaratives
      si vous avez besoin d'un contrôle total.
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
      registerFull(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          { commands: ["acme-chat"] },
        );
      },
    });
    ```

    `defineChannelPluginEntry` gère la division configuration/enregistrement complet
    automatiquement. Voir
    [Entry Points](/fr/plugins/sdk-entrypoints#definechannelpluginentry) pour toutes
    les options.

  </Step>

  <Step title="Ajouter une entrée de configuration">
    Créez `setup-entry.ts` pour un chargement léger lors de l'onboarding :

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    OpenClaw charge cela à la place de l'entrée complète lorsque le channel est désactivé
    ou non configuré. Cela évite d'inclure du code d'exécution lourd lors des flux de configuration.
    Voir [Setup and Config](/fr/plugins/sdk-setup#setup-entry) pour plus de détails.

  </Step>

  <Step title="Gérer les messages entrants">
    Votre plugin doit recevoir les messages de la plateforme et les transmettre à
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
          // see a real example in extensions/msteams or extensions/googlechat.
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
      (ex. `extensions/msteams`, `extensions/googlechat`) pour des modèles concrets.
    </Note>

  </Step>

  <Step title="Tester">
    Écrivez des tests co-localisés dans `src/channel.test.ts` :

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
    pnpm test -- extensions/acme-chat/
    ```

    Pour les assistants de test partagés, consultez [Testing](/fr/plugins/sdk-testing).

  </Step>
</Steps>

## Structure des fichiers

```
extensions/acme-chat/
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
  <Card
    title="Options de discussion"
    icon="git-branch"
    href="/fr/plugins/sdk-entrypoints#registration-mode"
  >
    Modes de réponse fixes, délimités au compte ou personnalisés
  </Card>
  <Card
    title="Intégration de l'outil de message"
    icon="puzzle"
    href="/fr/plugins/architecture#channel-plugins-and-the-shared-message-tool"
  >
    describeMessageTool et découverte d'actions
  </Card>
  <Card
    title="Résolution de cible"
    icon="crosshair"
    href="/fr/plugins/architecture#channel-target-resolution"
  >
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Assistants d'exécution" icon="settings" href="/fr/plugins/sdk-runtime">
    TTS, STT, média, subagent via api.runtime
  </Card>
</CardGroup>

## Étapes suivantes

- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) — si votre plugin fournit également des modèles
- [Aperçu du SDK](/fr/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Tests du SDK](/fr/plugins/sdk-testing) — utilitaires de test et tests contractuels
- [Manifeste de plugin](/fr/plugins/manifest) — schéma complet du manifeste

import fr from "/components/footer/fr.mdx";

<fr />
