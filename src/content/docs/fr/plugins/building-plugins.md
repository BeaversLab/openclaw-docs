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

Les plugins étendent OpenClaw avec de nouvelles capacités : channels, fournisseurs de modèles,
speech, transcription en temps réel, voix en temps réel, compréhension des médias, génération
d'images, génération de vidéos, récupération web, recherche web, outils d'agent, ou toute
combinaison.

Vous n'avez pas besoin d'ajouter votre plugin au dépôt OpenClaw. Publiez sur
[ClawHub](/fr/tools/clawhub) ou npm et les utilisateurs installent avec
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
  <Card title="Provider plugin" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Ajouter un provider de modèle (LLM, proxy ou point de terminaison personnalisé)
  </Card>
  <Card title="Plugin d'outil / de hook" icon="wrench">
    Enregistrez des outils d'agent, des hooks d'événement ou des services — continuer ci-dessous
  </Card>
</CardGroup>

Si un plugin de channel est facultatif et peut ne pas être installé lors de l'exécution de l'onboarding/setup,
utilisez `createOptionalChannelSetupSurface(...)` depuis
`openclaw/plugin-sdk/channel-setup`. Il produit une paire adaptateur de configuration + assistant
qui annonce la condition d'installation et échoue de manière fermée sur les écritures de configuration réelles
jusqu'à ce que le plugin soit installé.

## Quick start : plugin tool

Ce guide pas à pas crée un plugin minimal qui enregistre un outil d'agent. Les plugins
de channel et de provider ont des guides dédiés liés ci-dessus.

<Steps>
  <Step title="Create the package and manifest">
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

  <Step title="Write the entry point">

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

    `definePluginEntry` est destiné aux plugins autres que les canaux. Pour les canaux, utilisez
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

    OpenClaw vérifie aussi ClawHub avant npm pour les spécifications de package nues comme
    `@myorg/openclaw-my-plugin`.

    **Plugins dans le dépôt :** placez-les sous l'arborescence de l'espace de travail du plugin groupé — découverts automatiquement.

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## Capacités des plugins

Un seul plugin peut enregistrer un nombre quelconque de capacités via l'objet `api` :

| Capacité                                    | Méthode d'enregistrement                         | Guide détaillé                                                                     |
| ------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Inférence de texte (LLM)                    | `api.registerProvider(...)`                      | [Provider Plugins](/fr/plugins/sdk-provider-plugins)                               |
| Backend d'inférence CLI                     | `api.registerCliBackend(...)`                    | [CLI Backends](/fr/gateway/cli-backends)                                           |
| Channel / messagerie                        | `api.registerChannel(...)`                       | [Channel Plugins](/fr/plugins/sdk-channel-plugins)                                 |
| Synthèse et reconnaissance vocale (TTS/STT) | `api.registerSpeechProvider(...)`                | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Transcription en temps réel                 | `api.registerRealtimeTranscriptionProvider(...)` | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Voix en temps réel                          | `api.registerRealtimeVoiceProvider(...)`         | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Compréhension des médias                    | `api.registerMediaUnderstandingProvider(...)`    | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération d'images                         | `api.registerImageGenerationProvider(...)`       | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération de musique                       | `api.registerMusicGenerationProvider(...)`       | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Génération de vidéo                         | `api.registerVideoGenerationProvider(...)`       | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Récupération web                            | `api.registerWebFetchProvider(...)`              | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Recherche web                               | `api.registerWebSearchProvider(...)`             | [Provider Plugins](/fr/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Extension Pi intégrée                       | `api.registerEmbeddedExtensionFactory(...)`      | [SDK Overview](/fr/plugins/sdk-overview#registration-api)                          |
| Outils d'agent                              | `api.registerTool(...)`                          | Ci-dessous                                                                         |
| Commandes personnalisées                    | `api.registerCommand(...)`                       | [Entry Points](/fr/plugins/sdk-entrypoints)                                        |
| Crochets d'événements                       | `api.registerHook(...)`                          | [Entry Points](/fr/plugins/sdk-entrypoints)                                        |
| Routes HTTP                                 | `api.registerHttpRoute(...)`                     | [Internals](/fr/plugins/architecture#gateway-http-routes)                          |
| Sous-commandes CLI                          | `api.registerCli(...)`                           | [Points d'entrée](/fr/plugins/sdk-entrypoints)                                     |

Pour l'API complet, consultez [Présentation du SDK](/fr/plugins/sdk-overview#registration-api).

Utilisez `api.registerEmbeddedExtensionFactory(...)` lorsqu'un plugin a besoin de hooks d'exécution intégrée natifs pour Pi, tels que la réécriture asynchrone `tool_result` avant que le message de résultat de l'outil final ne soit émis. Préférez les hooks de plugin OpenClaw standard lorsque le travail ne nécessite pas de minutage d'extension Pi.

Si votre plugin enregistre des méthodes de passerelle RPC personnalisées, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration principaux (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent réservés et résolvent toujours vers `operator.admin`, même si un plugin demande une portée plus restreinte.

Sémantique des gardes de hooks à garder à l'esprit :

- `before_tool_call` : `{ block: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `before_tool_call` : `{ block: false }` est traité comme une absence de décision.
- `before_tool_call` : `{ requireApproval: true }` met en pause l'exécution de l'agent et invite l'utilisateur à approuver via la superposition d'approbation d'exécution, les boutons Telegram, les interactions Discord ou la commande `/approve` sur n'importe quel canal.
- `before_install` : `{ block: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `before_install` : `{ block: false }` est traité comme une absence de décision.
- `message_sending` : `{ cancel: true }` est terminal et arrête les gestionnaires de moindre priorité.
- `message_sending` : `{ cancel: false }` est traité comme une absence de décision.
- `message_received` : préférez le champ typé `threadId` lorsque vous avez besoin d'un routage de sujet/discussion entrant. Conservez `metadata` pour les extras spécifiques au canal.
- `message_sending` : préférez les champs de routage typés `replyToId` / `threadId` aux clés de métadonnées spécifiques au canal.

La commande `/approve` gère à la fois les approbations exec et plugin avec un repli borné : lorsqu'un id d'approbation exec n'est pas trouvé, OpenClaw réessaye le même id via les approbations de plugin. Le transfert des approbations de plugin peut être configuré indépendamment via `approvals.plugin` dans la config.

Si une plomberie d'approbation personnalisée doit détecter ce même cas de repli borné, préférez `isApprovalNotFoundError` depuis `openclaw/plugin-sdk/error-runtime` plutôt que de faire correspondre manuellement les chaînes d'expiration d'approbation.

Consultez [sémantique de décision des hooks de présentation du SDK](/fr/plugins/sdk-overview#hook-decision-semantics) pour plus de détails.

## Enregistrement des outils d'agent

Les outils sont des fonctions typées que le LLM peut appeler. Ils peuvent être requis (toujours disponibles) ou optionnels (optionnel pour l'utilisateur) :

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
- Utilisez `optional: true` pour les outils avec des effets secondaires ou des exigences binaires supplémentaires
- Les utilisateurs peuvent activer tous les outils d'un plugin en ajoutant l'id du plugin à `tools.allow`

## Conventions d'importation

Importez toujours depuis des chemins `openclaw/plugin-sdk/<subpath>` ciblés :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

Pour la référence complète des sous-chemins, consultez [Présentation du SDK](/fr/plugins/sdk-overview).

Au sein de votre plugin, utilisez des fichiers barrel locaux (`api.ts`, `runtime-api.ts`) pour les imports internes — n'importez jamais votre propre plugin via son chemin SDK.

Pour les plugins de fournisseur, gardez les helpers spécifiques au fournisseur dans ces barrels racine de package, sauf si la jointure est vraiment générique. Exemples groupés actuels :

- Anthropic : wrappers de flux Claude et helpers `service_tier` / bêta
- OpenAI : builders de fournisseur, helpers de modèle par défaut, fournisseurs en temps réel
- OpenRouter : builder de fournisseur plus helpers d'intégration/config

Si un helper n'est utile qu'à l'intérieur d'un seul package fournisseur groupé, gardez-le sur cette jointure racine de package au lieu de le promouvoir dans `openclaw/plugin-sdk/*`.

Certaines jointures de helper `openclaw/plugin-sdk/<bundled-id>` générées existent encore pour la maintenance et la compatibilité des plugins groupés, par exemple `plugin-sdk/feishu-setup` ou `plugin-sdk/zalo-setup`. Traitez-les comme des surfaces réservées, et non comme le modèle par défaut pour les nouveaux plugins tiers.

## Liste de contrôle avant soumission

<Check>**package.** contient les métadonnées `openclaw` correctes</Check>
<Check>Le manifeste **openclaw.plugin.** est présent et valide</Check>
<Check>Le point d'entrée utilise `defineChannelPluginEntry` ou `definePluginEntry`</Check>
<Check>Tous les imports utilisent des chemins `plugin-sdk/<subpath>` focalisés</Check>
<Check>Les imports internes utilisent des modules locaux, pas les auto-imports du SDK</Check>
<Check>Les tests passent (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` réussit (plugins dans le dépôt)</Check>

## Tests de version bêta

1. Surveillez les balises de version GitHub sur [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) et abonnez-vous via `Watch` > `Releases`. Les balises bêta ressemblent à `v2026.3.N-beta.1`. Vous pouvez également activer les notifications pour le compte X officiel OpenClaw [@openclaw](https://x.com/openclaw) pour les annonces de version.
2. Testez votre plugin par rapport à la balise bêta dès qu'elle apparaît. La fenêtre avant la version stable est généralement de seulement quelques heures.
3. Publiez dans le fil de discussion de votre plugin sur le canal `plugin-forum` Discord après avoir testé avec `all good` ou ce qui a cassé. Si vous n'avez pas encore de fil de discussion, créez-en un.
4. Si quelque chose casse, ouvrez ou mettez à jour un ticket intitulé `Beta blocker: <plugin-name> - <summary>` et appliquez l'étiquette `beta-blocker`. Mettez le lien du ticket dans votre fil de discussion.
5. Ouvrez une PR vers `main` intitulée `fix(<plugin-id>): beta blocker - <summary>` et liez le ticket à la fois dans la PR et dans votre fil Discord. Les contributeurs ne peuvent pas étiqueter les PR, donc le titre est le signal côté PR pour les mainteneurs et l'automatisation. Les blocages avec une PR sont fusionnés ; les blocages sans PR pourraient être publiés quand même. Les mainteneurs surveillent ces fils pendant les tests bêta.
6. Le silence signifie tout va bien. Si vous manquez la fenêtre, votre correction sera probablement incluse dans le prochain cycle.

## Étapes suivantes

<CardGroup cols={2}>
  <Card title="Plugins de canal" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Créer un plugin de canal de messagerie
  </Card>
  <Card title="Plugins de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Créer un plugin de fournisseur de modèle
  </Card>
  <Card title="Présentation du SDK" icon="book-open" href="/fr/plugins/sdk-overview">
    Référence de l'API de mappage des imports et d'enregistrement
  </Card>
  <Card title="Assistants d'exécution" icon="settings" href="/fr/plugins/sdk-runtime">
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

- [Architecture des plugins](/fr/plugins/architecture) — plongée en profondeur dans l'architecture interne
- [Présentation du SDK](/fr/plugins/sdk-overview) — Référence du SDK de plugin
- [Manifeste](/fr/plugins/manifest) — format du manifeste de plugin
- [Plugins de canal](/fr/plugins/sdk-channel-plugins) — créer des plugins de canal
- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) — créer des plugins de fournisseur
