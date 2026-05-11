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

Vous n'avez pas besoin d'ajouter votre plugin au dépôt OpenClaw. Publiez-le sur [ClawHub](/fr/tools/clawhub) ou npm et les utilisateurs l'installent avec `openclaw plugins install <package-name>`. OpenClaw essaie d'abord ClawHub et revient automatiquement à npm.

## Prérequis

- Node >= 22 et un gestionnaire de packages (npm ou pnpm)
- Familiarité avec TypeScript (ESM)
- Pour les plugins en interne (in-repo) : dépôt cloné et `pnpm install` effectué

## Quel type de plugin ?

<CardGroup cols={3}>
  <Card title="Plugin de channel" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Connecter OpenClaw à une plateforme de messagerie (Discord, IRC, etc.)
  </Card>
  <Card title="Plugin de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Ajouter un model provider (LLM, proxy, ou endpoint personnalisé)
  </Card>
  <Card title="Plugin d'outil / hook" icon="wrench" href="/fr/plugins/hooks">
    Enregistrer des agent tools, event hooks ou services — continuer ci-dessous
  </Card>
</CardGroup>

Pour un plugin de channel dont l'installation n'est pas garantie lors de l'exécution de l'onboarding/setup, utilisez `createOptionalChannelSetupSurface(...)` depuis `openclaw/plugin-sdk/channel-setup`. Il produit une paire adaptateur de configuration + assistant qui annonce la nécessité de l'installation et échoue de manière fermée sur les écritures de configuration réelles jusqu'à ce que le plugin soit installé.

## Démarrage rapide : plugin d'outil

Ce guide pas à pas crée un plugin minimal qui enregistre un agent tool. Les plugins de channel et de provider ont des guides dédiés liés ci-dessus.

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
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    Chaque plugin a besoin d'un manifeste, même sans configuration. Consultez
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
    `defineChannelPluginEntry` — voir [Channel Plugins](/fr/plugins/sdk-channel-plugins).
    Pour toutes les options de point d'entrée, consultez [Entry Points](/fr/plugins/sdk-entrypoints).

  </Step>

  <Step title="Tester et publier">

    **Plugins externes :** validez et publiez avec ClawHub, puis installez :

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    OpenClaw vérifie également ClawHub avant npm pour les spécifications de package nues comme
    `@myorg/openclaw-my-plugin`.

    **Plugins dans le dépôt :** placez-les sous l'arborescence de l'espace de travail des plugins groupés — découverts automatiquement.

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## Capacités des plugins

Un seul plugin peut enregistrer un nombre quelconque de capacités via l'objet `api` :

| Capacité                                    | Méthode d'enregistrement                         | Guide détaillé                                                                           |
| ------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Inférence de texte (LLM)                    | `api.registerProvider(...)`                      | [Provider Plugins](/fr/plugins/sdk-provider-plugins)                                     |
| Backend d'inférence CLI                     | `api.registerCliBackend(...)`                    | [Backends CLI](/fr/gateway/cli-backends)                                                 |
| Channel / messagerie                        | `api.registerChannel(...)`                       | [Channel Plugins](/fr/plugins/sdk-channel-plugins)                                       |
| Synthèse et reconnaissance vocale (TTS/STT) | `api.registerSpeechProvider(...)`                | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| Transcription en temps réel                 | `api.registerRealtimeTranscriptionProvider(...)` | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| Voix en temps réel                          | `api.registerRealtimeVoiceProvider(...)`         | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| Compréhension des médias                    | `api.registerMediaUnderstandingProvider(...)`    | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities)       |
| Génération d'images                         | `api.registerImageGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération de musique                       | `api.registerMusicGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération vidéo                            | `api.registerVideoGenerationProvider(...)`       | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Récupération Web                            | `api.registerWebFetchProvider(...)`              | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recherche Web                               | `api.registerWebSearchProvider(...)`             | [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Middleware de résultat d'outil              | `api.registerAgentToolResultMiddleware(...)`     | [Aperçu du SDK](/fr/plugins/sdk-overview#registration-api)                               |
| Outils d'agent                              | `api.registerTool(...)`                          | Ci-dessous                                                                               |
| Commandes personnalisées                    | `api.registerCommand(...)`                       | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |
| Points d'ancrage de plugin                  | `api.on(...)`                                    | [Points d'ancrage de plugin](/fr/plugins/hooks)                                          |
| Points d'ancrage d'événements internes      | `api.registerHook(...)`                          | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |
| Routes HTTP                                 | `api.registerHttpRoute(...)`                     | [Fonctionnalités internes](/fr/plugins/architecture-internals#gateway-http-routes)       |
| Sous-commandes CLI                          | `api.registerCli(...)`                           | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                           |

Pour l'API d'enregistrement complet, voir [Aperçu du SDK](/fr/plugins/sdk-overview#registration-api).

Les plugins regroupés peuvent utiliser `api.registerAgentToolResultMiddleware(...)` lorsqu'ils
ont besoin d'une réécriture asynchrone des résultats d'outils avant que le modèle ne voie la sortie. Déclarez les
runtimes ciblés dans `contracts.agentToolResultMiddleware`, par exemple
`["pi", "codex"]`. Il s'agit d'une zone fiable pour les plugins regroupés ; les plugins
externes devraient préférer les points d'ancrage de plugin standard OpenClaw à moins que OpenClaw ne développe une
stratégie de confiance explicite pour cette fonctionnalité.

Si votre plugin enregistre des méthodes de passerelle RPC personnalisées, gardez-les sur un
préfixe spécifique au plugin. Les espaces de noms d'administration principaux (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours à
`operator.admin`, même si un plugin demande une portée plus restreinte.

Sémantique des gardes de points d'ancrage à garder à l'esprit :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `before_tool_call` : `{ block: false }` est traité comme une absence de décision.
- `before_tool_call` : `{ requireApproval: true }` met en pause l'exécution de l'agent et invite l'utilisateur à approuver via la superposition d'approbation d'exécution, les boutons Telegram, les interactions Discord, ou la commande `/approve` sur n'importe quel canal.
- `before_install` : `{ block: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `before_install` : `{ block: false }` est traité comme une absence de décision.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `message_sending` : `{ cancel: false }` est traité comme une absence de décision.
- `message_received` : préférez le champ typé `threadId` lorsque vous avez besoin d'un routage entrant de fil/discussion. Conservez `metadata` pour les extras spécifiques au canal.
- `message_sending` : préférez les champs de routage typés `replyToId` / `threadId` aux clés de métadonnées spécifiques au canal.

La commande `/approve` gère à la fois les approbations d'exécution et de plugin avec un retour limité : lorsqu'un identifiant d'approbation d'exécution n'est pas trouvé, OpenClaw réessaie le même identifiant via les approbations de plugin. Le transfert des approbations de plugin peut être configuré indépendamment via `approvals.plugin` dans la configuration.

Si une plomberie d'approbation personnalisée doit détecter ce même cas de retour limité, préférez `isApprovalNotFoundError` de `openclaw/plugin-sdk/error-runtime` plutôt que de faire correspondre manuellement les chaînes d'expiration d'approbation.

Voir [Plugin hooks](/fr/plugins/hooks) pour des exemples et la référence des crochets (hooks).

## Enregistrement des outils d'agent

Les outils sont des fonctions typées que le LLM peut appeler. Ils peuvent être requis (toujours disponibles) ou optionnels (opt-in utilisateur) :

```typescript
register(api) {
  // Required tool — always available
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // Optional tool — user must add to allowlist
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

Les utilisateurs activent les outils optionnels dans la configuration :

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- Les noms d'outils ne doivent pas entrer en conflit avec les outils principaux (les conflits sont ignorés)
- Les outils dont les objets d'enregistrement sont malformés, y compris ceux manquant de `parameters`, sont ignorés et signalés dans les diagnostics du plugin au lieu d'interrompre les exécutions de l'agent
- Utilisez `optional: true` pour les outils ayant des effets secondaires ou des exigences binaires supplémentaires
- Les utilisateurs peuvent activer tous les outils d'un plugin en ajoutant l'identifiant du plugin à `tools.allow`

## Conventions d'importation

Importez toujours à partir des chemins `openclaw/plugin-sdk/<subpath>` ciblés :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Pour la référence complète des sous-chemins, consultez la [Vue d'ensemble du SDK](/fr/plugins/sdk-overview).

Dans votre plugin, utilisez les fichiers de regroupement locaux (`api.ts`, `runtime-api.ts`) pour
les importations internes — n'importez jamais votre propre plugin via son chemin SDK.

Pour les plugins de provider, conservez les helpers spécifiques au provider dans ces
barrels à la racine du package, sauf si l'interface est vraiment générique. Exemples groupés actuels :

- Anthropic : wrappers de flux Claude et helpers `service_tier` / bêta
- OpenAI : builders de provider, helpers de modèle par défaut, providers en temps réel
- OpenRouter : builder de provider plus helpers d'intégration/configuration

Si un helper n'est utile qu'à l'intérieur d'un seul package de provider groupé, gardez-le sur
cette interface à la racine du package au lieu de le promouvoir dans `openclaw/plugin-sdk/*`.

Certaines interfaces de helper `openclaw/plugin-sdk/<bundled-id>` générées existent toujours pour
la maintenance et la compatibilité des plugins groupés, par exemple
`plugin-sdk/feishu-setup` ou `plugin-sdk/zalo-setup`. Traitez-les comme des surfaces
réservées, et non comme le modèle par défaut pour les nouveaux plugins tiers.

## Liste de contrôle pré-soumission

<Check>**package.** possède les métadonnées `openclaw` correctes</Check>
<Check>le manifeste **openclaw.plugin.** est présent et valide</Check>
<Check>Le point d'entrée utilise `defineChannelPluginEntry` ou `definePluginEntry`</Check>
<Check>Toutes les importations utilisent des chemins `plugin-sdk/<subpath>` ciblés</Check>
<Check>Les importations internes utilisent des modules locaux, pas des auto-imports SDK</Check>
<Check>Les tests passent (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` réussit (plugins dans le dépôt)</Check>

## Tests de version bêta

1. Surveillez les balises de version GitHub sur [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) et abonnez-vous via `Watch` > `Releases`. Les balises bêta ressemblent à `v2026.3.N-beta.1`. Vous pouvez également activer les notifications pour le compte X officiel GitHub [@openclaw](https://x.com/openclaw) pour les annonces de version.
2. Testez votre plugin par rapport à la balise bêta dès qu'elle apparaît. La fenêtre avant la version stable est généralement de quelques heures seulement.
3. Publiez dans le fil de discussion de votre plugin sur le canal Discord `plugin-forum` après avoir testé avec `all good` ou avec ce qui a échoué. Si vous n'avez pas encore de fil de discussion, créez-en un.
4. Si quelque chose casse, ouvrez ou mettez à jour un problème intitulé `Beta blocker: <plugin-name> - <summary>` et appliquez l'étiquette `beta-blocker`. Mettez le lien du problème dans votre fil de discussion.
5. Ouvrez une PR vers `main` intitulée `fix(<plugin-id>): beta blocker - <summary>` et liez le problème à la fois dans la PR et dans votre fil Discord. Les contributeurs ne peuvent pas étiqueter les PR, donc le titre est le signal côté PR pour les mainteneurs et l'automatisation. Les bloquants avec une PR sont fusionnés ; les bloquants sans PR pourraient tout de même être expédiés. Les mainteneurs surveillent ces fils pendant les tests bêta.
6. Le silence signifie que tout va bien. Si vous manquez la fenêtre, votre correction atterrira probablement dans le prochain cycle.

## Étapes suivantes

<CardGroup cols={2}>
  <Card title="Plugins de canal" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Créer un plugin de canal de messagerie
  </Card>
  <Card title="Plugins de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Créer un plugin de fournisseur de modèle
  </Card>
  <Card title="Aperçu du SDK" icon="book-open" href="/fr/plugins/sdk-overview">
    Référence de l'API et de la carte d'importation
  </Card>
  <Card title="Assistants d'exécution" icon="settings" href="/fr/plugins/sdk-runtime">
    TTS, recherche, subagent via api.runtime
  </Card>
  <Card title="Tests" icon="test-tubes" href="/fr/plugins/sdk-testing">
    Utilitaires et modèles de test
  </Card>
  <Card title="Manifeste de plugin" icon="file-" href="/fr/plugins/manifest">
    Référence complète du schéma de manifeste
  </Card>
</CardGroup>

## Connexes

- [Architecture des plugins](/fr/plugins/architecture) — plongée en profondeur dans l'architecture interne
- [Présentation du SDK](/fr/plugins/sdk-overview) — Référence du SDK de plugin
- [Manifeste](/fr/plugins/manifest) — Format du manifeste de plugin
- [Plugins de channel](/fr/plugins/sdk-channel-plugins) — Création de plugins de channel
- [Plugins de provider](/fr/plugins/sdk-provider-plugins) — Création de plugins de provider
