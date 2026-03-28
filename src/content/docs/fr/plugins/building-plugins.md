---
title: "Construire des plugins"
sidebarTitle: "Getting Started"
summary: "Créez votre premier plugin OpenClaw en quelques minutes"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

# Construire des plugins

Les plugins étendent OpenClaw avec de nouvelles capacités : canaux, providers de modèles, synthèse vocale,
génération d'images, recherche web, outils d'agent, ou toute combinaison.

Vous n'avez pas besoin d'ajouter votre plugin au dépôt OpenClaw. Publiez-le sur
[ClawHub](/fr/tools/clawhub) ou npm et les utilisateurs l'installent avec
`openclaw plugins install <package-name>`. OpenClaw essaie d'abord ClawHub et
revient automatiquement à npm.

## Prérequis

- Node >= 22 et un gestionnaire de paquets (npm ou pnpm)
- Familiarité avec TypeScript (ESM)
- Pour les plugins dans le dépôt : dépôt cloné et `pnpm install` terminé

## Quel type de plugin ?

<CardGroup cols={3}>
  <Card title="Plugin de canal" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Connecter OpenClaw à une plateforme de messagerie (Discord, IRC, etc.)
  </Card>
  <Card title="Plugin de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Ajouter un provider de modèle (LLM, proxy, ou endpoint personnalisé)
  </Card>
  <Card title="Plugin d'outil / hook" icon="wrench">
    Enregistrer des outils d'agent, des hooks d'événements ou des services — continuez ci-dessous
  </Card>
</CardGroup>

## Quick start : plugin d'outil

Ce guide pas à pas crée un plugin minimal qui enregistre un outil d'agent. Les plugins
de canal et de fournisseur ont des guides dédiés liés ci-dessus.

<Steps>
  <Step title="Créer le paquet et le manifeste">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"]
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
    [Manifest](/fr/plugins/manifest) pour le schéma complet.

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

    `definePluginEntry` est pour les plugins non-channel. Pour les channels, utilisez
    `defineChannelPluginEntry` — voir [Channel Plugins](/fr/plugins/sdk-channel-plugins).
    Pour toutes les options de point d'entrée, voir [Entry Points](/fr/plugins/sdk-entrypoints).

  </Step>

  <Step title="Tester et publier">

    **Plugins externes :** publiez sur [ClawHub](/fr/tools/clawhub) ou npm, puis installez :

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw vérifie ClawHub en premier, puis se rabat sur npm.

    **Plugins dans le dépôt :** placez-les sous `extensions/` — découverts automatiquement.

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## Capacités des plugins

Un seul plugin peut enregistrer un nombre quelconque de capacités via l'objet `api` :

| Capacité                                    | Méthode d'enregistrement                      | Guide détaillé                                                                     |
| ------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Inférence de texte (LLM)                    | `api.registerProvider(...)`                   | [Provider Plugins](/fr/plugins/sdk-provider-plugins)                               |
| Channel / messagerie                        | `api.registerChannel(...)`                    | [Channel Plugins](/fr/plugins/sdk-channel-plugins)                                 |
| Synthèse et reconnaissance vocale (TTS/STT) | `api.registerSpeechProvider(...)`             | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Compréhension des médias                    | `api.registerMediaUnderstandingProvider(...)` | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération d'images                         | `api.registerImageGenerationProvider(...)`    | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recherche Web                               | `api.registerWebSearchProvider(...)`          | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Outils d'agent                              | `api.registerTool(...)`                       | Ci-dessous                                                                         |
| Commandes personnalisées                    | `api.registerCommand(...)`                    | [Entry Points](/fr/plugins/sdk-entrypoints)                                        |
| Crochets d'événements (Event hooks)         | `api.registerHook(...)`                       | [Entry Points](/fr/plugins/sdk-entrypoints)                                        |
| Routes HTTP                                 | `api.registerHttpRoute(...)`                  | [Internals](/fr/plugins/architecture#gateway-http-routes)                          |
| Sous-commandes CLI                          | `api.registerCli(...)`                        | [Entry Points](/fr/plugins/sdk-entrypoints)                                        |

Pour l'API d'enregistrement complète, voir [SDK Overview](/fr/plugins/sdk-overview#registration-api).

Sémantique des gardes de hooks à garder à l'esprit :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_tool_call` : `{ block: false }` est traité comme une absence de décision.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `message_sending` `{ cancel: false }` est traité comme une absence de décision.

Consultez [sémantique de décision de hook du SDK Overview](/fr/plugins/sdk-overview#hook-decision-semantics) pour plus de détails.

## Enregistrement des outils d'agent

Les outils sont des fonctions typées que le LLM peut appeler. Ils peuvent être obligatoires (toujours disponibles) ou facultatifs (option utilisateur) :

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

Les utilisateurs activent les outils facultatifs dans la configuration :

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- Les noms d'outils ne doivent pas entrer en conflit avec les outils principaux (les conflits sont ignorés)
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

Pour la référence complète des sous-chemins, consultez [SDK Overview](/fr/plugins/sdk-overview).

Dans votre plugin, utilisez des fichiers barrel locaux (`api.ts`, `runtime-api.ts`) pour les importations internes — n'importez jamais votre propre plugin via son chemin SDK.

## Liste de contrôle préalable à la soumission

<Check>**package.** contient les métadonnées `openclaw` correctes</Check>
<Check>le manifeste **openclaw.plugin.** est présent et valide</Check>
<Check>Le point d'entrée utilise `defineChannelPluginEntry` ou `definePluginEntry`</Check>
<Check>Tous les imports utilisent des chemins `plugin-sdk/<subpath>` ciblés</Check>
<Check>Les imports internes utilisent des modules locaux, pas les auto-imports du SDK</Check>
<Check>Les tests passent (`pnpm test -- extensions/my-plugin/`)</Check>
<Check>`pnpm check` réussit (plugins dans le dépôt)</Check>

## Étapes suivantes

<CardGroup cols={2}>
  <Card title="Plugins de Channel" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Créer un plugin de channel de messagerie
  </Card>
  <Card title="Plugins de Fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Créer un plugin de fournisseur de model
  </Card>
  <Card title="Aperçu du SDK" icon="book-open" href="/fr/plugins/sdk-overview">
    Référence de l'API d'importation et d'enregistrement
  </Card>
  <Card title="Helpers d'exécution" icon="settings" href="/fr/plugins/sdk-runtime">
    TTS, recherche, subagent via api.runtime
  </Card>
  <Card title="Tests" icon="test-tubes" href="/fr/plugins/sdk-testing">
    Utilitaires et modèles de test
  </Card>
  <Card title="Manifeste du Plugin" icon="file-json" href="/fr/plugins/manifest">
    Référence complète du schéma de manifeste
  </Card>
</CardGroup>
