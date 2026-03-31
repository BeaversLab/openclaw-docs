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

Vous n'avez pas besoin d'ajouter votre plugin au dépôt OpenClaw. Publiez sur
[ClawHub](/en/tools/clawhub) ou npm et les utilisateurs l'installent avec
`openclaw plugins install <package-name>`. OpenClaw essaie d'abord ClawHub et
revient automatiquement à npm.

## Prérequis

- Node >= 22 et un gestionnaire de paquets (npm ou pnpm)
- Familiarité avec TypeScript (ESM)
- Pour les plugins dans le dépôt : dépôt cloné et `pnpm install` terminé

## Quel type de plugin ?

<CardGroup cols={3}>
  <Card title="Plugin de canal" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    Connecter OpenClaw à une plateforme de messagerie (Discord, IRC, etc.)
  </Card>
  <Card title="Provider plugin" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    Ajouter un provider de modèle (LLM, proxy ou point de terminaison personnalisé)
  </Card>
  <Card title="Plugin d'outil / de hook" icon="wrench">
    Enregistrez des outils d'agent, des hooks d'événement ou des services — continuer ci-dessous
  </Card>
</CardGroup>

## Quick start : plugin d'outil

Ce guide pas à pas crée un plugin minimal qui enregistre un outil d'agent. Les plugins
de canal et de fournisseur ont des guides dédiés liés ci-dessus.

<Steps>
  <Step title="Créer le package et le manifeste">
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
    [Manifest](/en/plugins/manifest) pour le schéma complet.

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

    `definePluginEntry` est pour les plugins qui ne sont pas des channels. Pour les channels, utilisez
    `defineChannelPluginEntry` — voir [Plugins de channel](/en/plugins/sdk-channel-plugins).
    Pour toutes les options de point d'entrée, voir [Points d'entrée](/en/plugins/sdk-entrypoints).

  </Step>

  <Step title="Test et publier">

    **Plugins externes :** publiez sur [ClawHub](/en/tools/clawhub) ou npm, puis installez :

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw vérifie d'abord ClawHub, puis se rabat sur npm.

    **Plugins dans le dépôt :** placez sous `extensions/` — découverts automatiquement.

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## Capacités des plugins

Un seul plugin peut enregistrer un nombre quelconque de capacités via l'objet `api` :

| Capacité                  | Méthode d'enregistrement                      | Guide détaillé                                                                           |
| ------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Inférence de texte (LLM)  | `api.registerProvider(...)`                   | [Plugins de fournisseur](/en/plugins/sdk-provider-plugins)                               |
| CLI backend d'inférence   | `api.registerCliBackend(...)`                 | [CLI Backends](/en/gateway/cli-backends)                                                 |
| Canal / messagerie        | `api.registerChannel(...)`                    | [Plugins de canal](/en/plugins/sdk-channel-plugins)                                      |
| Synthèse vocale (TTS/STT) | `api.registerSpeechProvider(...)`             | [Plugins de fournisseur](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Compréhension des médias  | `api.registerMediaUnderstandingProvider(...)` | [Plugins de fournisseur](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération d'images       | `api.registerImageGenerationProvider(...)`    | [Plugins de fournisseur](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recherche Web             | `api.registerWebSearchProvider(...)`          | [Plugins de fournisseur](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Outils d'agent            | `api.registerTool(...)`                       | Ci-dessous                                                                               |
| Commandes personnalisées  | `api.registerCommand(...)`                    | [Points d'entrée](/en/plugins/sdk-entrypoints)                                           |
| Crochets d'événement      | `api.registerHook(...)`                       | [Points d'entrée](/en/plugins/sdk-entrypoints)                                           |
| Routes HTTP               | `api.registerHttpRoute(...)`                  | [Fonctionnement interne](/en/plugins/architecture#gateway-http-routes)                   |
| CLI sous-commandes        | `api.registerCli(...)`                        | [Points d'entrée](/en/plugins/sdk-entrypoints)                                           |

Pour l'API d'enregistrement complète, voir [Vue d'ensemble du SDK](/en/plugins/sdk-overview#registration-api).

Sémantique des gardes de hook à garder à l'esprit :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `before_tool_call` : `{ block: false }` est considéré comme aucune décision.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de priorité inférieure.
- `message_sending` : `{ cancel: false }` est considéré comme aucune décision.

Voir [SDK Overview hook decision semantics](/en/plugins/sdk-overview#hook-decision-semantics) pour plus de détails.

## Enregistrement des outils d'agent

Les outils sont des fonctions typées que le LLM peut appeler. Ils peuvent être requis (toujours disponibles) ou optionnels (choix de l'utilisateur) :

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
- Utilisez `optional: true` pour les outils ayant des effets secondaires ou des exigences binaires supplémentaires
- Les utilisateurs peuvent activer tous les outils d'un plugin en ajoutant l'identifiant du plugin à `tools.allow`

## Conventions d'importation

Importez toujours depuis des chemins `openclaw/plugin-sdk/<subpath>` ciblés :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Pour la référence complète du sous-chemin, consultez [Vue d'ensemble du SDK](/en/plugins/sdk-overview).

Dans votre plugin, utilisez des fichiers barrel locaux (`api.ts`, `runtime-api.ts`) pour les
importations internes — n'importez jamais votre propre plugin via son chemin SDK.

## Liste de contrôle avant soumission

<Check>Le fichier **package.** contient les métadonnées `openclaw` correctes</Check>
<Check>Le manifeste **openclaw.plugin.** est présent et valide</Check>
<Check>Le point d'entrée utilise `defineChannelPluginEntry` ou `definePluginEntry`</Check>
<Check>Tous les importations utilisent des chemins `plugin-sdk/<subpath>` ciblés</Check>
<Check>Les importations internes utilisent des modules locaux, pas des auto-imports du SDK</Check>
<Check>Les tests passent (`pnpm test -- extensions/my-plugin/`)</Check>
<Check>`pnpm check` réussit (plugins dans le dépôt)</Check>

## Test de version bêta

1. Surveillez les balises de publication GitHub sur [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) et abonnez-vous via `Watch` > `Releases`. Les balises bêta ressemblent à `v2026.3.N-beta.1`. Vous pouvez également activer les notifications pour le compte OpenClaw X officiel [@openclaw](https://x.com/openclaw) pour les annonces de publication.
2. Testez votre plugin par rapport au label bêta dès qu'il apparaît. La fenêtre avant la version stable est généralement de seulement quelques heures.
3. Publiez dans le fil de discussion de votre plugin dans le `plugin-forum` Discord channel après avoir testé avec `all good` ou ce qui a échoué. Si vous n'avez pas encore de fil de discussion, créez-en un.
4. Si quelque chose casse, ouvrez ou mettez à jour un problème intitulé `Beta blocker: <plugin-name> - <summary>` et appliquez l'étiquette `beta-blocker`. Mettez le lien du problème dans votre fil de discussion.
5. Ouvrez une PR sur `main` intitulée `fix(<plugin-id>): beta blocker - <summary>` et liez le ticket à la fois dans la PR et dans votre fil Discord. Les contributeurs ne peuvent pas étiqueter les PR, donc le titre est le signal côté PR pour les maintainers et l'automatisation. Les bloqueurs avec une PR sont fusionnés ; les bloqueurs sans PR pourraient tout de même être publiés. Les maintainers surveillent ces fils pendant les tests bêta.
6. Le silence signifie que c'est bon. Si vous manquez la fenêtre, votre correction sera probablement incluse dans le prochain cycle.

## Étapes suivantes

<CardGroup cols={2}>
  <Card title="Plugins de Channel" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    Créer un plugin de channel de messagerie
  </Card>
  <Card title="Plugins de fournisseur" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    Créer un plugin de fournisseur de modèle
  </Card>
  <Card title="Aperçu du SDK" icon="book-open" href="/en/plugins/sdk-overview">
    Référence de la carte d'importation et de l'API
  </Card>
  <Card title="Assistances d'exécution" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, recherche, subagent via api.runtime
  </Card>
  <Card title="Testing" icon="test-tubes" href="/en/plugins/sdk-testing">
    Utilitaires et modèles de test
  </Card>
  <Card title="Manifeste du plugin" icon="file-" href="/en/plugins/manifest">
    Référence complète du schéma du manifeste
  </Card>
</CardGroup>
