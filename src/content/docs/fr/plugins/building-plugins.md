---
summary: "Créez votre premier plugin OpenClaw en quelques minutes"
title: "Création de plugins"
sidebarTitle: "Getting Started"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

Les plugins étendent OpenClaw avec de nouvelles capacités : channels, model providers, speech, realtime transcription, realtime voice, media understanding, image generation, video generation, web fetch, web search, agent tools, ou toute combinaison de ces éléments.

Vous n'avez pas besoin d'ajouter votre plugin au dépôt OpenClaw. Publiez sur
[ClawHub](/fr/clawhub) et les utilisateurs l'installent avec
`openclaw plugins install clawhub:<package-name>`. Les spécifications nues de package s'installent
toujours depuis npm pendant la bascule de lancement.

## Prérequis

- Node >= 22 et un gestionnaire de packages (npm ou pnpm)
- Familiarité avec TypeScript (ESM)
- Pour les plugins en dépôt : dépôt cloné et `pnpm install` terminé. Le développement
  de plugins dans la source est pnpm uniquement car OpenClaw charge les plugins
  regroupés depuis les packages de l'espace de travail `extensions/*`.

## Quel type de plugin ?

<CardGroup cols={3}>
  <Card title="Plugin de canal" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Connecter OpenClaw à une plateforme de messagerie (Discord, IRC, etc.)
  </Card>
  <Card title="Plugin de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Ajouter un fournisseur de modèle (LLM, proxy ou point de terminaison personnalisé)
  </Card>
  <Card title="Plugin backend CLI" icon="terminal" href="/fr/plugins/cli-backend-plugins">
    Mapper une CLI IA locale dans le lanceur de repli texte de OpenClaw
  </Card>
  <Card title="Plugin d'outil / hook" icon="wrench" href="/fr/plugins/hooks">
    Enregistrer des outils d'agent, des hooks d'événements ou des services - continuer ci-dessous
  </Card>
</CardGroup>

Pour un plugin de channel dont l'installation lors de l'exécution de l'onboarding/setup
n'est pas garantie, utilisez `createOptionalChannelSetupSurface(...)` depuis
`openclaw/plugin-sdk/channel-setup`. Il produit un couple adaptateur de configuration + assistant
qui annonce la condition d'installation et échoue de manière fermée sur les écritures de configuration réelles
jusqu'à ce que le plugin soit installé.

## Quick start : plugin tool

Ce guide pas à pas crée un plugin minimal qui enregistre un outil d'agent. Les plugins
de channel et de provider ont des guides dédiés liés ci-dessus.

<Steps>
  <Step title="Créer le package et le manifeste">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "description": "Adds a custom tool to OpenClaw",
      "contracts": {
        "tools": ["my_tool"]
      },
      "activation": {
        "onStartup": true
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    Chaque plugin a besoin d'un manifeste, même sans configuration. Les outils enregistrés à l'exécution
    doivent être listés dans `contracts.tools` afin qu'OpenClaw puisse découvrir le plugin
    propriétaire sans charger chaque runtime de plugin. Les plugins doivent également déclarer
    `activation.onStartup` intentionnellement. Cet exemple le définit à `true`. Voir
    [Manifest](/fr/plugins/manifest) pour le schéma complet. Les extraits de publication canoniques ClawHub
    se trouvent dans `docs/snippets/plugin-publish/`.

  </Step>

  <Step title="Écrire le point d'entrée">

    ```typescript
    // index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { Type } from "@sinclair/typebox";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Do a thing",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return { content: [{ type: "text", text: `Got: ${params.input}` }] };
          },
        });
      },
    });
    ```

    `definePluginEntry` est destiné aux plugins non-channel. Pour les channels, utilisez
    `defineChannelPluginEntry` - voir [Plugins de Channel](/fr/plugins/sdk-channel-plugins).
    Pour toutes les options de point d'entrée, voir [Points d'entrée](/fr/plugins/sdk-entrypoints).

  </Step>

  <Step title="Tester et publier">

    **Plugins externes :** validez et publiez avec ClawHub, puis installez :

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    Les spécifications de package nues comme `@myorg/openclaw-my-plugin` s'installent depuis npm lors
    du basculement de lancement. Utilisez `clawhub:` lorsque vous souhaitez la résolution ClawHub.

    **Plugins dans le dépôt :** placez-les sous l'arborescence de l'espace de travail des plugins groupés - découverts automatiquement.

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## Capacités des plugins

Un seul plugin peut enregistrer un nombre quelconque de capacités via l'objet `api` :

| Capacité                                    | Méthode d'enregistrement                         | Guide détaillé                                                                           |
| ------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Inférence de texte (LLM)                    | `api.registerProvider(...)`                      | [Plugins de Fournisseur](/fr/plugins/sdk-provider-plugins)                               |
| Backend d'inférence CLI                     | `api.registerCliBackend(...)`                    | [Plugins Backend CLI](/fr/plugins/cli-backend-plugins)                                   |
| Channel / messagerie                        | `api.registerChannel(...)`                       | [Plugins de canal](/fr/plugins/sdk-channel-plugins)                                      |
| Synthèse et reconnaissance vocale (TTS/STT) | `api.registerSpeechProvider(...)`                | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Transcription en temps réel                 | `api.registerRealtimeTranscriptionProvider(...)` | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Voix en temps réel                          | `api.registerRealtimeVoiceProvider(...)`         | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Compréhension des médias                    | `api.registerMediaUnderstandingProvider(...)`    | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération d'images                         | `api.registerImageGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération de musique                       | `api.registerMusicGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération de vidéo                         | `api.registerVideoGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Récupération web                            | `api.registerWebFetchProvider(...)`              | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recherche web                               | `api.registerWebSearchProvider(...)`             | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Middleware de résultat d'outil              | `api.registerAgentToolResultMiddleware(...)`     | [Aperçu du SDK](/fr/plugins/sdk-overview#registration-api)                               |
| Outils d'agent                              | `api.registerTool(...)`                          | Ci-dessous                                                                               |
| Commandes personnalisées                    | `api.registerCommand(...)`                       | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |
| Hooks de plugin                             | `api.on(...)`                                    | [Hooks de plugin](/fr/plugins/hooks)                                                     |
| Hooks d'événement internes                  | `api.registerHook(...)`                          | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |
| Routes HTTP                                 | `api.registerHttpRoute(...)`                     | [Internes](/fr/plugins/architecture-internals#gateway-http-routes)                       |
| Sous-commandes CLI                          | `api.registerCli(...)`                           | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |

Pour l'API d'enregistrement complet, voir [Aperçu du SDK](/fr/plugins/sdk-overview#registration-api).

Les plugins groupés peuvent utiliser `api.registerAgentToolResultMiddleware(...)` lorsqu'ils ont besoin d'une réécriture asynchrone des résultats des outils avant que le modèle ne voie la sortie. Déclarez les environnements d'exécution ciblés dans `contracts.agentToolResultMiddleware`, par exemple `["pi", "codex"]`OpenClawOpenClaw. Il s'agit d'une interface de confiance pour les plugins groupés ; les plugins externes devraient préférer les hooks de plugin OpenClaw standard, sauf si OpenClaw développe une politique de confiance explicite pour cette fonctionnalité.

Si votre plugin enregistre des méthodes RPC de passerelle personnalisées, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration principaux (RPC`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers `operator.admin`, même si un plugin demande une portée plus étroite.

Sémantique des gardes de hooks à garder à l'esprit :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `before_tool_call` : `{ block: false }` est traité comme une absence de décision.
- `before_tool_call` : `{ requireApproval: true }`TelegramDiscord met en pause l'exécution de l'agent et invite l'utilisateur à approuver via la superposition d'approbation d'exécution, les boutons Telegram, les interactions Discord, ou la commande `/approve` sur n'importe quel canal.
- `before_install` : `{ block: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `before_install` : `{ block: false }` est traité comme une absence de décision.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `message_sending` : `{ cancel: false }` est traité comme une absence de décision.
- `message_received` : préférez le champ typé `threadId` lorsque vous avez besoin d'un routage entrant de fil/sujet. Gardez `metadata` pour les extras spécifiques au canal.
- `message_sending` : préférez les champs de routage typés `replyToId` / `threadId` aux clés de métadonnées spécifiques au canal.

La commande `/approve` gère les approbations d'exécution et de plugins avec un retour en arrière limité : lorsqu'un identifiant d'approbation d'exécution n'est pas trouvé, OpenClaw réessaie le même identifiant via les approbations de plugins. Le transfert des approbations de plugins peut être configuré indépendamment via `approvals.plugin` dans la configuration.

Si une plomberie d'approbation personnalisée doit détecter ce même cas de retour en arrière limité, préférez `isApprovalNotFoundError` de `openclaw/plugin-sdk/error-runtime` plutôt que de faire correspondre manuellement les chaînes d'expiration d'approbation.

Voir [Plugin hooks](/fr/plugins/hooks) pour des exemples et la référence des hooks.

## Enregistrement des tools de l'agent

Les tools sont des fonctions typées que le LLM peut appeler. Ils peuvent être requis (toujours disponibles) ou optionnels (choisis par l'utilisateur) :

```typescript
register(api) {
  // Required tool - always available
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // Optional tool - user must add to allowlist
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a workflow",
      parameters: Type.Object({ pipeline: Type.String() }),
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

Chaque tool enregistré avec `api.registerTool(...)` doit également être déclaré dans le manifeste du plugin :

```json
{
  "contracts": {
    "tools": ["my_tool", "workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

OpenClaw capture et met en cache le descripteur validé du tool enregistré, de sorte que les plugins ne dupliquent pas `description` ou les données de schéma dans le manifeste. Le contrat de manifeste ne déclare que la propriété et la découverte ; l'exécution appelle toujours l'implémentation du tool enregistré en direct.
Définissez `toolMetadata.<tool>.optional: true` pour les tools enregistrés avec `api.registerTool(..., { optional: true })` afin que OpenClaw puisse éviter de charger ce runtime de plugin jusqu'à ce que le tool soit explicitement autorisé.

Les utilisateurs activent les tools optionnels dans la configuration :

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- Les noms de tools ne doivent pas entrer en conflit avec les tools principaux (les conflits sont ignorés)
- Les tools avec des objets d'enregistrement malformés, y compris un `parameters` manquant, sont ignorés et signalés dans les diagnostics du plugin au lieu d'interrompre les exécutions de l'agent
- Utilisez `optional: true` pour les tools avec des effets secondaires ou des exigences binaires supplémentaires
- Les utilisateurs peuvent activer tous les tools d'un plugin en ajoutant l'identifiant du plugin à `tools.allow`

## Enregistrement des commandes CLI

Les plugins peuvent ajouter des groupes de commandes racine `openclaw` avec `api.registerCli`. Fournissez `descriptors` pour chaque racine de commande de niveau supérieur afin que OpenClaw puisse afficher et acheminer la commande sans charger impatiemment chaque runtime de plugin.

```typescript
register(api) {
  api.registerCli(
    ({ program }) => {
      const demo = program
        .command("demo-plugin")
        .description("Run demo plugin commands");

      demo
        .command("ping")
        .description("Check that the plugin CLI is executable")
        .action(() => {
          console.log("demo-plugin:pong");
        });
    },
    {
      descriptors: [
        {
          name: "demo-plugin",
          description: "Run demo plugin commands",
          hasSubcommands: true,
        },
      ],
    },
  );
}
```

Après l'installation, vérifiez l'enregistrement d'exécution et exécutez la commande :

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## Conventions d'importation

Importez toujours depuis des chemins `openclaw/plugin-sdk/<subpath>` ciblés :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Pour la référence complète des sous-chemins, consultez la [Présentation du SDK](/fr/plugins/sdk-overview).

Dans votre plugin, utilisez des fichiers baril locaux (`api.ts`, `runtime-api.ts`) pour
les importations internes - n'importez jamais votre propre plugin via son chemin SDK.

Pour les plugins de fournisseur, gardez les assistants spécifiques au fournisseur dans ces barils
à la racine du package, sauf si la jointure est vraiment générique. Exemples groupés actuels :

- Anthropic : wrappers de flux Claude et assistants `service_tier` / bêta
- OpenAI : constructeurs de fournisseurs, assistants de modèle par défaut, fournisseurs en temps réel
- OpenRouter : constructeur de fournisseur plus assistants d'intégration/de configuration

Si un assistant n'est utile qu'à l'intérieur d'un seul package de fournisseur groupé, gardez-le sur cette
jointure à la racine du package au lieu de le promouvoir dans `openclaw/plugin-sdk/*`.

Certaines jointures d'assistant `openclaw/plugin-sdk/<bundled-id>` générées existent toujours pour
la maintenance des plugins groupés lorsqu'elles ont une utilisation suivie par un propriétaire. Traitez-les comme
des surfaces réservées, et non comme le modèle par défaut pour les nouveaux plugins tiers.

## Liste de contrôle avant soumission

<Check>**package.** contient les métadonnées correctes `openclaw`</Check>
<Check>Le manifeste **openclaw.plugin.** est présent et valide</Check>
<Check>Le point d'entrée utilise `defineChannelPluginEntry` ou `definePluginEntry`</Check>
<Check>Tous les imports utilisent des chemins `plugin-sdk/<subpath>` ciblés</Check>
<Check>Les imports internes utilisent des modules locaux, pas des auto-imports SDK</Check>
<Check>Les tests passent (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` réussit (plugins dans le dépôt)</Check>

## Tests de version bêta

1. Surveillez les balises de version GitHub sur [openclaw/openclaw](GitHubhttps://github.com/openclaw/openclaw/releases) et abonnez-vous via `Watch` > `Releases`. Les balises bêta ressemblent à `v2026.3.N-beta.1`OpenClaw. Vous pouvez également activer les notifications pour le compte X officiel OpenClaw [@openclaw](https://x.com/openclaw) pour les annonces de version.
2. Testez votre plugin par rapport à la balise bêta dès qu'elle apparaît. La fenêtre avant la version stable n'est généralement que de quelques heures.
3. Publiez dans le fil de discussion de votre plugin dans le canal Discord `plugin-forum`Discord après avoir testé avec soit `all good` soit ce qui a échoué. Si vous n'avez pas encore de fil de discussion, créez-en un.
4. Si quelque chose se brise, ouvrez ou mettez à jour un problème intitulé `Beta blocker: <plugin-name> - <summary>` et appliquez l'étiquette `beta-blocker`. Mettez le lien du problème dans votre fil de discussion.
5. Ouvrez une PR vers `main` intitulée `fix(<plugin-id>): beta blocker - <summary>`Discord et liez le problème à la fois dans la PR et dans votre fil Discord. Les contributeurs ne peuvent pas étiqueter les PR, donc le titre est le signal côté PR pour les mainteneurs et l'automatisation. Les bloquants avec une PR sont fusionnés ; les bloquants sans PR pourraient tout de même être expédiés. Les mainteneurs surveillent ces fils pendant les tests bêta.
6. Le silence signifie que c'est bon. Si vous manquez la fenêtre, votre correctif atterrira probablement dans le prochain cycle.

## Étapes suivantes

<CardGroup cols={2}>
  <Card title="Plugins de channel" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Créer un plugin de channel de messagerie
  </Card>
  <Card title="Plugins de provider" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Créer un plugin de provider de model
  </Card>
  <Card title="CLIPlugins Backend CLI" icon="terminal" href="/fr/plugins/cli-backend-plugins" CLI>
    Enregistrer un backend IA local CLI
  </Card>
  <Card title="Présentation du SDK" icon="book-open" href="/fr/plugins/sdk-overview">
    Référence de la carte d'importation et de l'API
  </Card>
  <Card title="Helpers d'exécution" icon="settings" href="/fr/plugins/sdk-runtime">
    TTS, recherche, sous-agent via api.runtime
  </Card>
  <Card title="Tests" icon="test-tubes" href="/fr/plugins/sdk-testing">
    Utilitaires et modèles de test
  </Card>
  <Card title="Manifeste de plugin" icon="file-" href="/fr/plugins/manifest">
    Référence complète du schéma de manifeste
  </Card>
</CardGroup>

## Connexes

- [Architecture des plugins](/fr/plugins/architecture) - plongée approfondie dans l'architecture interne
- [Présentation du SDK](/fr/plugins/sdk-overview) - Référence du SDK de plugin
- [Manifeste](/fr/plugins/manifest) - format du manifeste de plugin
- [Plugins de channel](/fr/plugins/sdk-channel-plugins) - créer des plugins de channel
- [Plugins de provider](/fr/plugins/sdk-provider-plugins) - créer des plugins de provider
