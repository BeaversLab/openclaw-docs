---
summary: "OpenClawCréez votre premier plugin OpenClaw en quelques minutes"
title: "Création de plugins"
sidebarTitle: "Getting Started"
doc-schema-version: 1
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are choosing between channel, provider, CLI backend, tool, or hook docs
---

Les plugins étendent OpenClaw sans modifier le cœur. Un plugin peut ajouter un canal de messagerie, un fournisseur de modèle, un backend CLI local, un outil d'agent, un hook, un fournisseur de média ou une autre capacité détenue par un plugin.

Vous n'avez pas besoin d'ajouter un plugin externe au référentiel OpenClaw. Publiez le package sur [ClawHub](OpenClawClawHub/en/clawhub) et les utilisateurs l'installent avec :

```bash
openclaw plugins install clawhub:<package-name>
```

Les spécifications de package nues s'installent toujours depuis npm pendant la bascule de lancement. Utilisez le préfixe npm`clawhub:`ClawHub lorsque vous souhaitez la résolution ClawHub.

## Prérequis

- Utilisez Node 22.19 ou plus récent et un gestionnaire de packages tel que `npm` ou `pnpm`.
- Soyez familiarisé avec les modules ESM TypeScript.
- Pour le travail sur les plugins groupés dans le dépôt, clonez le référentiel et exécutez `pnpm install`OpenClaw.
  Le développement de plugins avec extraction du code source est réservé à pnpm car OpenClaw charge les plugins groupés depuis les packages de l'espace de travail `extensions/*`.

## Choisir la forme du plugin

<CardGroup cols={2}>
  <Card title="Plugin de canal" icon="messages-square" href="/fr/plugins/sdk-channel-plugins" OpenClaw>
    Connectez OpenClaw à une plateforme de messagerie.
  </Card>
  <Card title="Plugin de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Ajoutez un fournisseur de modèle, de média, de recherche, de récupération, de synthèse vocale ou en temps réel.
  </Card>
  <Card title="CLIPlugin backend CLI" icon="terminal" href="/fr/plugins/cli-backend-plugins" CLIOpenClaw>
    Exécutez une IA CLI locale via le repli de modèle d'OpenClaw.
  </Card>
  <Card title="Tool plugin" icon="wrench" href="/fr/plugins/tool-plugins">
    Enregistrer les outils d'agent.
  </Card>
</CardGroup>

## Démarrage rapide

Créez un plugin d'outil minimal en enregistrant un outil d'agent requis. C'est la
forme de plugin utile la plus courte et présente le package, le manifeste, le point d'entrée et
la preuve locale.

<Steps>
  <Step title="Créer les métadonnées du package">
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

    Les plugins externes publiés doivent faire pointer les entrées d'exécution vers des fichiers JavaScript
    construits. Consultez [Points d'entrée du SDK](/fr/plugins/sdk-entrypoints) pour le contrat complet du
    point d'entrée.

    Chaque plugin a besoin d'un manifeste, même lorsqu'il n'a pas de configuration. Les outils d'exécution
    doivent apparaître dans `contracts.tools` pour qu'OpenClaw puisse découvrir la propriété sans
    charger impatiemment chaque runtime de plugin. Définissez `activation.onStartup`
    intentionnellement. Cet exemple démarre au démarrage du Gateway.

    Pour chaque champ de manifeste, consultez [Manifeste du plugin](/fr/plugins/manifest).

  </Step>

  <Step title="Enregistrer l'outil">
    ```typescript index.ts
    import { Type } from "typebox";
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Echo one input value",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return {
              content: [{ type: "text", text: `Got: ${params.input}` }],
            };
          },
        });
      },
    });
    ```

    Utilisez `definePluginEntry` pour les plugins qui ne sont pas des channels. Les plugins de channel utilisent
    `defineChannelPluginEntry`.

  </Step>

  <Step title="Tester le runtime">
    Pour un plugin installé ou externe, inspectez le runtime chargé :

    ```bash
    openclaw plugins inspect my-plugin --runtime --json
    ```

    Si le plugin enregistre une commande CLI, exécutez également cette commande. Par exemple,
    une commande de démonstration doit avoir une preuve d'exécution telle que
    `openclaw demo-plugin ping`.

    Pour un plugin groupé dans ce dépôt, OpenClaw découvre les packages de plugins
    à partir de l'espace de travail `extensions/*`. Exécutez le test ciblé le plus proche :

    ```bash
    pnpm test -- extensions/my-plugin/
    pnpm check
    ```

  </Step>

  <Step title="Publier">
    Validez le package avant publication :

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    ```

    Les extraits canoniques du ClawHub se trouvent dans `docs/snippets/plugin-publish/`.

  </Step>

  <Step title="Install"ClawHub>
    Installez le package publié via ClawHub :

    ```bash
    openclaw plugins install clawhub:your-org/your-plugin
    ```

  </Step>
</Steps>

<a id="registering-agent-tools"></a>

## Enregistrement des outils

Les outils peuvent être requis ou facultatifs. Les outils requis sont toujours disponibles lorsque le
plugin est activé. Les outils facultatifs nécessitent une acceptation par l'utilisateur.

```typescript
register(api) {
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

Chaque outil enregistré avec `api.registerTool(...)` doit également être déclaré dans le
manifeste du plugin :

```json
{
  "contracts": {
    "tools": ["workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

Les utilisateurs acceptent via `tools.allow` :

```json5
{
  tools: { allow: ["workflow_tool"] }, // or ["my-plugin"] for all tools from one plugin
}
```

Utilisez des outils facultatifs pour les effets secondaires, les binaires inhabituels ou les capacités qui
ne doivent pas être exposées par défaut. Les noms d'outils ne doivent pas entrer en conflit avec les outils principaux ;
les conflits sont ignorés et signalés dans les diagnostics du plugin. Les
enregistrements malformés, y compris les descripteurs d'outils sans `parameters`, sont ignorés et
signalés de la même manière. Les outils enregistrés sont des fonctions typées que le modèle peut appeler
une fois les vérifications de stratégie et de liste blanche passées.

Les fabriques d'outils reçoivent un objet de contexte fourni par le runtime. Utilisez `ctx.activeModel`
lorsqu'un outil doit journaliser, afficher ou s'adapter au modèle actif pour le tour
courant. L'objet peut inclure `provider`, `modelId` et `modelRef`OpenClaw. Traitez-le comme
métadonnées d'exécution informationnelles, et non comme une limite de sécurité contre l'opérateur
local, le code de plugin installé ou un runtime OpenClaw modifié. Les outils locaux sensibles
doivent toujours exiger une acceptation explicite du plugin ou de l'opérateur et échouer en mode fermé
lorsque les métadonnées du modèle actif sont manquantes ou inadaptées.

Le manifeste déclare la propriété et la découverte ; l'exécution appelle toujours l'implémentation
de l'outil enregistré en direct. Gardez `toolMetadata.<tool>.optional: true`
aligné avec `api.registerTool(..., { optional: true })`OpenClaw pour qu'OpenClaw puisse éviter
de charger ce runtime de plugin jusqu'à ce que l'outil soit explicitement autorisé.

## Conventions d'importation

Importez à partir des sous-chemins SDK ciblés :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
```

N'importez pas à partir du baril racine obsolète :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk";
```

Dans le package de votre plugin, utilisez des fichiers barrel locaux tels que `api.ts` et `runtime-api.ts` pour les importations internes. N'importez pas votre propre plugin via un chemin SDK. Les helpers spécifiques au provider doivent rester dans le package provider, sauf si la jointure est véritablement générique.

Les méthodes RPC de GatewayRPC personnalisées sont un point d'entrée avancé. Gardez-les sur un préfixe spécifique au plugin ; les espaces de noms d'administration principale tels que `config.*`, `exec.approvals.*`, `operator.admin.*`, `wizard.*` et `update.*` restent réservés et résolvent vers `operator.admin`. Le pont `openclaw/plugin-sdk/gateway-method-runtime` est réservé aux itinéraires HTTP des plugins qui déclarent `contracts.gatewayMethodDispatch: ["authenticated-request"]`.

Pour la carte d'importation complète, consultez la [vue d'ensemble du SDK Plugin](/fr/plugins/sdk-overview).

## Liste de contrôle avant soumission

<Check>**package.** contient les métadonnées `openclaw` correctes</Check>
<Check>Le manifeste **openclaw.plugin.** est présent et valide</Check>
<Check>Le point d'entrée utilise `defineChannelPluginEntry` ou `definePluginEntry`</Check>
<Check>Toutes les importations utilisent des chemins `plugin-sdk/<subpath>` ciblés</Check>
<Check>Les importations internes utilisent des modules locaux, pas des auto-importations du SDK</Check>
<Check>Les tests réussissent (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` réussit (plugins dans le dépôt)</Check>

## Tester contre les versions bêta

1. Surveillez les tags de publication GitHub sur [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) et abonnez-vous via `Watch` > `Releases`. Les tags bêta ressemblent à `v2026.3.N-beta.1`. Vous pouvez également activer les notifications pour le compte X officiel OpenClaw [@openclaw](https://x.com/openclaw) pour les annonces de publication.
2. Testez votre plugin par rapport au tag bêta dès son apparition. La fenêtre avant la version stable est généralement de quelques heures seulement.
3. Publiez dans le fil de discussion de votre plugin sur le canal Discord `plugin-forum`Discord après avoir testé avec `all good` ou ce qui a échoué. Si vous n'avez pas encore de fil de discussion, créez-en un.
4. Si quelque chose échoue, ouvrez ou mettez à jour un problème intitulé `Beta blocker: <plugin-name> - <summary>` et appliquez l'étiquette `beta-blocker`. Mettez le lien du problème dans votre fil de discussion.
5. Ouvrez une PR vers `main` intitulée `fix(<plugin-id>): beta blocker - <summary>`Discord et liez le problème à la fois dans la PR et votre fil de discussion Discord. Les contributeurs ne peuvent pas étiqueter les PR, donc le titre est le signal côté PR pour les mainteneurs et l'automatisation. Les bloquants avec une PR sont fusionnés ; les bloquants sans PR pourraient tout de même être livrés. Les mainteneurs surveillent ces fils de discussion pendant les tests bêta.
6. Le silence signifie que tout va bien. Si vous manquez la fenêtre, votre correctif sera probablement inclus dans le prochain cycle.

## Étapes suivantes

<CardGroup cols={2}>
  <Card title="Plugins de canal" icon="messages-square" href="/fr/plugins/sdk-channel-plugins">
    Créer un plugin de canal de messagerie
  </Card>
  <Card title="Plugins de fournisseur" icon="cpu" href="/fr/plugins/sdk-provider-plugins">
    Créer un plugin de fournisseur de modèle
  </Card>
  <Card title="CLIPlugins de backend CLI" icon="terminal" href="/fr/plugins/cli-backend-plugins" CLI>
    Enregistrer un backend IA local CLI
  </Card>
  <Card title="Aperçu du SDK" icon="book-open" href="/fr/plugins/sdk-overview" API>
    Référence de l'API d'import map et d'enregistrement
  </Card>
  <Card title="Helpers d'exécution" icon="settings" href="/fr/plugins/sdk-runtime">
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

- [Crochets de plugin](/fr/plugins/hooks)
- [Architecture des plugins](/fr/plugins/architecture)
