---
summary: "OpenClawCréez votre premier plugin OpenClaw en quelques minutes"
title: "Création de plugins"
sidebarTitle: "Getting Started"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

Les plugins étendent OpenClaw avec de nouvelles capacités : channels, model providers, speech, realtime transcription, realtime voice, media understanding, image generation, video generation, web fetch, web search, agent tools, ou toute combinaison de ces éléments.

Vous n'avez pas besoin d'ajouter votre plugin au référentiel OpenClaw. Publiez sur
[ClawHub](OpenClawClawHub/en/clawhub) et les utilisateurs installent avec
`openclaw plugins install clawhub:<package-name>`npm. Les spécifications de package nues s'installent
toujours depuis npm lors du basculement de lancement.

## Prérequis

- Node >= 22 et un gestionnaire de packages (npm ou pnpm)
- Familiarité avec TypeScript (ESM)
- Pour les plugins dans le dépôt : dépôt cloné et `pnpm install`OpenClaw terminé. Le développement
  de plugins sur le code source est réservé à pnpm car OpenClaw charge les plugins
  regroupés depuis les packages de l'espace de travail `extensions/*`.

## Quel type de plugin ?

<CardGroup cols={3}>
  <Card title="Plugin de canal" icon="messages-square" href="/fr/plugins/sdk-channel-plugins" OpenClawDiscord>
    Connecter OpenClaw à une plateforme de messagerie (Discord, IRC, etc.)
  </Card>
  <Card title="Plugin de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins" LLM>
    Ajouter un fournisseur de modèle (LLM, proxy ou point de terminaison personnalisé)
  </Card>
  <Card title="CLIPlugin backend CLI" icon="terminal" href="/fr/plugins/cli-backend-plugins" CLIOpenClaw>
    Mapper une IA locale CLI dans le lanceur de repli de texte d'OpenClaw
  </Card>
  <Card title="Plugin d'outil" icon="wrench" href="/fr/plugins/tool-plugins">
    Ajouter des outils d'agent typés simples avec des métadonnées de manifeste générées
  </Card>
  <Card title="Plugin de hook" icon="plug" href="/fr/plugins/hooks">
    Enregistrer des hooks d'événements, des services ou des intégrations d'exécution avancées
  </Card>
</CardGroup>

Pour un plugin de canal dont l'installation n'est pas garantie lors de l'exécution de l'intégration/configuration, utilisez `createOptionalChannelSetupSurface(...)` de `openclaw/plugin-sdk/channel-setup`. Il produit une paire adaptateur de configuration + assistant qui annonce la nécessité de l'installation et échoue de manière fermée lors des écritures de configuration réelles jusqu'à ce que le plugin soit installé.

## Quick start : tool plugin

Ce guide pas à pas crée un plugin minimal qui enregistre un outil d'agent. Les plugins de canal et de provider disposent de guides dédiés liés ci-dessus. Pour le flux de travail détaillé des outils uniquement, consultez [Tool Plugins](/fr/plugins/tool-plugins).

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

    Chaque plugin a besoin d'un manifeste, même sans configuration. Les outils enregistrés lors de l'exécution doivent être listés dans `contracts.tools` afin qu'OpenClaw puisse découvrir le plugin propriétaire sans charger le runtime de chaque plugin. Pour les simples plugins d'outils uniquement, préférez `defineToolPlugin` plus `openclaw plugins build` afin que les noms des outils et le schéma de configuration vide soient générés à partir d'une source unique de vérité. Les plugins doivent également déclarer `activation.onStartup` intentionnellement. Cet exemple le définit à `true`. Consultez [Manifest](/fr/plugins/manifest) pour le schéma complet. Les extraits de publication canoniques sur ClawHub se trouvent dans `docs/snippets/plugin-publish/`.

  </Step>

  <Step title="Écrire le point d'entrée">

    ```typescript
    // index.ts
    import { Type } from "typebox";
    import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

    export default defineToolPlugin({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      tools: (tool) => [
        tool({
          name: "my_tool",
          description: "Do a thing",
          parameters: Type.Object({ input: Type.String() }),
          async execute({ input }) {
            return { message: `Got: ${input}` };
          },
        }),
      ],
    });
    ```

    `defineToolPlugin` est destiné aux simples plugins d'outils d'agent. Pour les providers, les hooks, les services et autres plugins avancés non-canaux, utilisez `definePluginEntry`. Pour les canaux, utilisez `defineChannelPluginEntry` - consultez [Channel Plugins](/fr/plugins/sdk-channel-plugins). Pour le flux de travail complet `defineToolPlugin`, consultez [Tool Plugins](/fr/plugins/tool-plugins). Pour toutes les options de point d'entrée, consultez [Entry Points](/fr/plugins/sdk-entrypoints).

  </Step>

  <Step title="Générer et valider les métadonnées">

    ```bash
    npm run build
    openclaw plugins build --entry ./dist/index.js
    openclaw plugins validate --entry ./dist/index.js
    ```

    `openclaw plugins build` écrit `openclaw.plugin.json` et maintient
    `package.json` `openclaw.extensions` pointé vers le module d'entrée. Pour
    les packages publiés, dirigez-le vers le JavaScript construit tel que `./dist/index.js`.
    Le manifeste généré est le contrat de chargement à froid qu'OpenClaw lit avant
    l'importation à l'exécution. `openclaw plugins validate` importe l'entrée uniquement pendant
    la validation de l'auteur et vérifie que le manifeste et les métadonnées du package correspondent
    aux métadonnées statiques `defineToolPlugin`.

  </Step>

  <Step title="Tester et publier">

    **Plugins externes :** validez et publiez avec ClawHub, puis installez :

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    Les spécifications de package nues comme `@myorg/openclaw-my-plugin` s'installent depuis npm pendant
    le basculement de lancement. Utilisez `clawhub:` lorsque vous voulez la résolution ClawHub.

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
| Inférence de texte (LLM)                    | `api.registerProvider(...)`                      | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins)                               |
| Backend d'inférence CLI                     | `api.registerCliBackend(...)`                    | [Plugins de backend CLI](/fr/plugins/cli-backend-plugins)                                |
| Canal / messagerie                          | `api.registerChannel(...)`                       | [Plugins de canal](/fr/plugins/sdk-channel-plugins)                                      |
| Synthèse et reconnaissance vocale (TTS/STT) | `api.registerSpeechProvider(...)`                | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Transcription en temps réel                 | `api.registerRealtimeTranscriptionProvider(...)` | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Voix en temps réel                          | `api.registerRealtimeVoiceProvider(...)`         | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Compréhension des médias                    | `api.registerMediaUnderstandingProvider(...)`    | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération d'images                         | `api.registerImageGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération de musique                       | `api.registerMusicGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération vidéo                            | `api.registerVideoGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Récupération web                            | `api.registerWebFetchProvider(...)`              | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recherche web                               | `api.registerWebSearchProvider(...)`             | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Middleware de résultat d'outil              | `api.registerAgentToolResultMiddleware(...)`     | [Présentation du SDK](/fr/plugins/sdk-overview#registration-api)                         |
| Outils d'agent                              | `api.registerTool(...)`                          | Ci-dessous                                                                               |
| Commandes personnalisées                    | `api.registerCommand(...)`                       | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |
| Crochets de plugin                          | `api.on(...)`                                    | [Crochets de plugin](/fr/plugins/hooks)                                                  |
| Crochets d'événements internes              | `api.registerHook(...)`                          | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |
| Routes HTTP                                 | `api.registerHttpRoute(...)`                     | [Fonctionnement interne](/fr/plugins/architecture-internals#gateway-http-routes)         |
| Sous-commandes CLI                          | `api.registerCli(...)`                           | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |

Pour l'API d'enregistrement complet, consultez la [Présentation du SDK](/fr/plugins/sdk-overview#registration-api).

Les plugins regroupés peuvent utiliser `api.registerAgentToolResultMiddleware(...)` lorsqu'ils
ont besoin d'une réécriture asynchrone des résultats d'outils avant que le modèle ne voie la sortie. Déclarez les
runtimes ciblés dans `contracts.agentToolResultMiddleware`, par exemple
`["pi", "codex"]`. Il s'agit d'une interface de confiance pour les plugins regroupés ; les plugins
externes devraient préférer les crochets de plugin réguliers d'OpenClaw, à moins qu'OpenClaw ne développe une
politique de confiance explicite pour cette capacité.

Si votre plugin enregistre des méthodes de passerelle RPC personnalisées, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration principaux (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers `operator.admin`, même si un plugin demande une portée plus restreinte.

`openclaw/plugin-sdk/gateway-method-runtime` est un pont de plan de contrôle réservé pour les routes HTTP de plugin qui déclarent `contracts.gatewayMethodDispatch: ["authenticated-request"]`. C'est une garde d'utilisation intentionnelle pour les plugins natifs examinés, et non une limite de bac à sable.

Sémantique des gardes de hook à garder à l'esprit :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_tool_call` : `{ block: false }` est traité comme une absence de décision.
- `before_tool_call` : `{ requireApproval: true }` met en pause l'exécution de l'agent et invite l'utilisateur à approuver via la superposition d'approbation d'exécution, les boutons Telegram, les interactions Discord, ou la commande `/approve` sur n'importe quel canal.
- `before_install` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_install` : `{ block: false }` est traité comme une absence de décision.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `message_sending` : `{ cancel: false }` est traité comme une absence de décision.
- `message_received` : préférez le champ typé `threadId` lorsque vous avez besoin d'un routage de thread/sujet entrant. Gardez `metadata` pour les extras spécifiques au canal.
- `message_sending` : préférez les champs de routage typés `replyToId` / `threadId` aux clés de métadonnées spécifiques au canal.

La commande `/approve` gère à la fois les approbations d'exécution et de plugin avec une repli limité : lorsqu'un identifiant d'approbation d'exécution n'est pas trouvé, OpenClaw réessaie le même identifiant via les approbations de plugin. Le transfert des approbations de plugin peut être configuré indépendamment via `approvals.plugin` dans la configuration.

Si une plomberie d'approbation personnalisée doit détecter ce même cas de repli limité, préférez `isApprovalNotFoundError` de `openclaw/plugin-sdk/error-runtime` plutôt que de faire correspondre manuellement les chaînes d'expiration d'approbation.

Consultez [Plugin hooks](/fr/plugins/hooks) pour des exemples et la référence des hooks.

## Enregistrement des outils d'agent

Les outils sont des fonctions typées que le LLM peut appeler. Ils peuvent être requis (toujours disponibles) ou facultatifs (option utilisateur) :

Pour les plugins simples qui possèdent uniquement un ensemble fixe d'outils, préférez [`defineToolPlugin`](/fr/plugins/tool-plugins). Il génère des métadonnées de manifeste et maintient l'alignement de `contracts.tools`. Utilisez l'interface de niveau inférieur `api.registerTool(...)` lorsque le plugin possède également des canaux, des fournisseurs, des hooks, des services, des commandes ou un enregistrement d'outils entièrement dynamique.

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

Les usines d'outils reçoivent un objet de contexte fourni par le runtime. Utilisez `ctx.activeModel` lorsqu'un outil doit consigner, afficher ou s'adapter au modèle actif pour le tour actuel. L'objet peut inclure `provider`, `modelId` et `modelRef`. Traitez-le comme des métadonnées d'exécution informatives, et non comme une limite de sécurité contre l'opérateur local, le code de plugin installé ou un runtime OpenClaw modifié. Pour les outils locaux sensibles, conservez une option explicite du plugin ou de l'opérateur et échouez en mode fermé lorsque les métadonnées du modèle actif sont manquantes ou inadaptées.

Chaque outil enregistré avec `api.registerTool(...)` doit également être déclaré dans le manifeste du plugin :

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

OpenClaw capture et met en cache le descripteur validé de l'outil enregistré, de sorte que les plugins ne dupliquent pas OpenClaw`description` ou les données de schéma dans le manifeste. Le contrat du manifeste déclare uniquement la propriété et la découverte ; l'exécution appelle toujours l'implémentation de l'outil enregistré en direct. Définissez `toolMetadata.<tool>.optional: true` pour les outils enregistrés avec `api.registerTool(..., { optional: true })`OpenClaw afin qu'OpenClaw puisse éviter de charger ce runtime de plugin jusqu'à ce que l'outil soit explicitement autorisé.

Les utilisateurs activent les outils optionnels dans la configuration :

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- Les noms d'outils ne doivent pas entrer en conflit avec les outils principaux (les conflits sont ignorés)
- Les outils avec des objets d'enregistrement mal formés, y compris l'absence de `parameters`, sont ignorés et signalés dans les diagnostics du plugin au lieu d'interrompre les exécutions de l'agent
- Utilisez `optional: true` pour les outils ayant des effets secondaires ou des exigences binaires supplémentaires
- Les utilisateurs peuvent activer tous les outils d'un plugin en ajoutant l'identifiant du plugin à `tools.allow`

## Enregistrement des commandes CLI

Les plugins peuvent ajouter des groupes de commandes racine `openclaw` avec `api.registerCli`. Fournissez `descriptors`OpenClaw pour chaque racine de commande de niveau supérieur afin qu'OpenClaw puisse afficher et acheminer la commande sans charger impatiemment chaque runtime de plugin.

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

Après l'installation, vérifiez l'enregistrement du runtime et exécutez la commande :

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## Conventions d'importation

Importez toujours à partir des chemins `openclaw/plugin-sdk/<subpath>` ciblés :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Pour la référence complète des sous-chemins, consultez [Aperçu du SDK](/fr/plugins/sdk-overview).

Au sein de votre plugin, utilisez des fichiers baril locaux (`api.ts`, `runtime-api.ts`) pour les importations internes - n'importez jamais votre propre plugin via son chemin SDK.

Pour les plugins de fournisseur, conservez les assistants spécifiques au fournisseur dans ces barils à la racine du package, sauf si la jointure est vraiment générique. Exemples groupés actuels :

- Anthropic : wrappers de flux Claude et assistants Anthropic`service_tier` / bêta
- OpenAI : constructeurs de fournisseurs, assistants de modèle par défaut, fournisseurs en temps réel
- OpenRouter : constructeur de fournisseur plus assistants d'intégration/configuration

Si un helper n'est utile qu'à l'intérieur d'un seul package provider groupé, gardez-le sur cette seam de racine de package (package-root seam) au lieu de le promouvoir dans `openclaw/plugin-sdk/*`.

Certaines seams de helper `openclaw/plugin-sdk/<bundled-id>` générées existent toujours pour la maintenance des plugins groupés lorsqu'elles ont une utilisation suivie par un propriétaire. Traitez-les comme des surfaces réservées, et non comme le modèle par défaut pour les nouveaux plugins tiers.

## Liste de contrôle préalable à la soumission

<Check>**package.** possède les métadonnées `openclaw` correctes</Check>
<Check>le manifeste **openclaw.plugin.** est présent et valide</Check>
<Check>Le point d'entrée utilise `defineToolPlugin`, `defineChannelPluginEntry` ou `definePluginEntry`</Check>
<Check>Tous les imports utilisent des chemins `plugin-sdk/<subpath>` ciblés</Check>
<Check>Les imports internes utilisent des modules locaux, et non des auto-imports du SDK</Check>
<Check>Les tests passent (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` réussit (plugins dans le dépôt)</Check>

## Tests de version bêta

1. Surveillez les tags de publication GitHub sur [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) et abonnez-vous via `Watch` > `Releases`. Les tags bêta ressemblent à `v2026.3.N-beta.1`. Vous pouvez également activer les notifications pour le compte X officiel OpenClaw [@openclaw](https://x.com/openclaw) pour les annonces de publication.
2. Testez votre plugin par rapport au tag bêta dès son apparition. La fenêtre avant la version stable est généralement de quelques heures seulement.
3. Publiez dans le fil de discussion de votre plugin dans le salon Discord `plugin-forum` Discord après avoir testé, soit avec `all good`, soit avec ce qui a cassé. Si vous n'avez pas encore de fil de discussion, créez-en un.
4. Si quelque chose casse, ouvrez ou mettez à jour un problème intitulé `Beta blocker: <plugin-name> - <summary>` et appliquez l'étiquette `beta-blocker`. Mettez le lien du problème dans votre fil de discussion.
5. Ouvrez une PR sur `main` intitulée `fix(<plugin-id>): beta blocker - <summary>`Discord et liez le ticket à la PR ainsi qu'à votre fil Discord. Les contributeurs ne peuvent pas étiqueter les PR, le titre est donc le signal côté PR pour les mainteneurs et l'automatisation. Les bloquants avec une PR sont fusionnés ; les bloquants sans PR pourraient tout de même être livrés. Les mainteneurs surveillent ces fils durant les tests bêta.
6. Le silence signifie tout va bien. Si vous manquez la fenêtre, votre correction sera probablement incluse dans le prochain cycle.

## Étapes suivantes

<CardGroup cols={2}>
  <Card title="Plugins de canal" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Créer un plugin de canal de messagerie
  </Card>
  <Card title="Plugins de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Créer un plugin de fournisseur de modèle
  </Card>
  <Card title="Plugins de backend CLI" icon="terminal" href="/fr/plugins/cli-backend-plugins">
    Enregistrer un backend CLI local
  </Card>
  <Card title="Aperçu du SDK" icon="book-open" href="/fr/plugins/sdk-overview">
    Carte d'importation et référence de l'API d'enregistrement
  </Card>
  <Card title="Assistances d'exécution" icon="settings" href="/fr/plugins/sdk-runtime">
    TTS, recherche, subagent via api.runtime
  </Card>
  <Card title="Tests" icon="test-tubes" href="/fr/plugins/sdk-testing">
    Utilitaires et modèles de test
  </Card>
  <Card title="Manifeste du plugin" icon="file-" href="/fr/plugins/manifest">
    Référence complète du schéma de manifeste
  </Card>
</CardGroup>

## Connexes

- [Architecture des plugins](/fr/plugins/architecture) - plongée approfondie dans l'architecture interne
- [Vue d'ensemble du SDK](/fr/plugins/sdk-overview) - Référence du SDK de plugin
- [Manifeste](/fr/plugins/manifest) - format du manifeste de plugin
- [Plugins de channel](/fr/plugins/sdk-channel-plugins) - Créer des plugins de channel
- [Plugins de provider](/fr/plugins/sdk-provider-plugins) - Créer des plugins de provider
