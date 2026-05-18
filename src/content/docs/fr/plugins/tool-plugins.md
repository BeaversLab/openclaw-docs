---
summary: "Créez des tools d'agent typés simples avec defineToolPlugin et openclaw plugins init/build/validate"
title: "Plugins de tools"
sidebarTitle: "Plugins de Tools"
read_when:
  - You want to build a simple OpenClaw plugin that only adds agent tools
  - You want to use defineToolPlugin instead of hand-writing plugin manifest metadata
  - You need to scaffold, generate, validate, test, or publish a tool-only plugin
---

Les plugins de tools ajoutent des tools appelables par l'agent à OpenClaw sans ajouter de channel,
de provider de modèle, de hook, de service ni de backend de configuration. Utilisez OpenClaw`defineToolPlugin`OpenClaw lorsque
le plugin possède une liste fixe de tools et que vous souhaitez qu'OpenClaw génère les métadonnées
du manifeste qui rendent ces tools détectables sans charger de code d'exécution.

Le flux recommandé est le suivant :

1. Générez l'échafaudage d'un paquet avec `openclaw plugins init`.
2. Écrivez des tools avec `defineToolPlugin`.
3. Build JavaScript.
4. Générez les métadonnées `openclaw.plugin.json` et `package.json` avec
   `openclaw plugins build`.
5. Validez les métadonnées générées avant de publier ou d'installer.

Pour les plugins de provider, de channel, de hook, de service ou à capacités mixtes, commencez plutôt par
[Building plugins](/fr/plugins/building-plugins), [Channel Plugins](/fr/plugins/sdk-channel-plugins),
ou [Provider Plugins](/fr/plugins/sdk-provider-plugins).

## Configuration requise

- Node >= 22.
- Sortie de paquet TypeScript ESM.
- `typebox` pour les schémas de configuration et de paramètres de tool.
- `openclaw >=2026.5.17`OpenClaw, la première version d'OpenClaw qui exporte
  `openclaw/plugin-sdk/tool-plugin`.
- Une racine de paquet pouvant expédier `dist/`, `openclaw.plugin.json` et
  `package.json`.

Le plugin généré importe `typebox` à l'exécution, gardez donc `typebox` dans
`dependencies`, et pas seulement dans `devDependencies`.

## Démarrage rapide

Créez un nouveau paquet de plugin :

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm install
npm run plugin:build
npm run plugin:validate
npm test
```

L'échafaudage crée :

- `src/index.ts` : une entrée `defineToolPlugin` avec un tool `echo`.
- `src/index.test.ts` : un petit test de métadonnées.
- `tsconfig.json` : sortie TypeScript NodeNext vers `dist/`.
- `package.json` : scripts, dépendances d'exécution et
  `openclaw.extensions: ["./dist/index.js"]`.
- `openclaw.plugin.json` : métadonnées de manifeste générées pour l'outil initial.

Sortie de validation attendue :

```text
Plugin stock-quotes is valid.
```

## Écrire un tool

`defineToolPlugin` prend l'identité du plugin, un schéma de configuration optionnel et une
liste statique de tools. Les types de paramètres et de configuration sont déduits des schémas
TypeBox.

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quote snapshots.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "Quote API key." })),
    baseUrl: Type.Optional(Type.String({ description: "Quote API base URL." })),
  }),
  tools: (tool) => [
    tool({
      name: "stock_quote",
      label: "Stock Quote",
      description: "Fetch a stock quote snapshot.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol, for example OPEN." }),
      }),
      async execute({ symbol }, config, context) {
        context.signal?.throwIfAborted();
        return {
          symbol: symbol.toUpperCase(),
          configured: Boolean(config.apiKey),
          baseUrl: config.baseUrl ?? "https://api.example.com",
        };
      },
    }),
  ],
});
```

Les noms de tools constituent l'API stable. Choisissez des noms uniques, en minuscules et
assez spécifiques pour éviter les collisions avec les tools principaux ou d'autres plugins.

## Tools optionnels et de fabrique

Définissez `optional: true` lorsque les utilisateurs doivent explicitement mettre le tool sur liste blanche avant qu'il
ne soit envoyé à un model :

```typescript
tool({
  name: "workflow_run",
  description: "Run an external workflow.",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  execute: ({ goal }) => ({ queued: true, goal }),
});
```

`openclaw plugins build` écrit l'entrée de manifeste `toolMetadata.<tool>.optional`
correspondante, afin que OpenClaw puisse découvrir le tool sans charger le code
d'exécution du plugin.

Utilisez `factory` lorsqu'un tool a besoin du contexte d'outil d'exécution avant de pouvoir
être créé. La fabrique garde les métadonnées statiques tout en permettant au tool de se retirer pour une
exécution spécifique, d'inspecter l'état du bac à sable (sandbox) ou de lier des helpers d'exécution.

```typescript
tool({
  name: "local_workflow",
  description: "Run a local workflow outside sandboxed sessions.",
  parameters: Type.Object({ goal: Type.String() }),
  optional: true,
  factory({ api, toolContext }) {
    if (toolContext.sandboxed) {
      return null;
    }
    return createLocalWorkflowTool(api);
  },
});
```

Les fabriques sont toujours destinées aux noms de tools fixes. Utilisez `definePluginEntry` directement lorsque
le plugin calcule les noms de tools de manière dynamique ou combine des tools avec des hooks,
services, providers, commandes ou autres surfaces d'exécution.

## Valeurs de retour

`defineToolPlugin` enveloppe les valeurs de retour simples dans le format de résultat
de tool OpenClaw :

- Renvoyez une chaîne lorsque le model doit voir ce texte exact.
- Renvoyez une valeur compatible JSON lorsque vous voulez que le model voie du JSON formaté
  et que OpenClaw garde la valeur originale dans `details`.

```typescript
tool({
  name: "echo_text",
  description: "Echo input text.",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => input,
});
```

```typescript
tool({
  name: "echo_json",
  description: "Echo input as structured JSON.",
  parameters: Type.Object({
    input: Type.String(),
  }),
  execute: ({ input }) => ({ input, length: input.length }),
});
```

Utilisez un tool de fabrique lorsque vous devez renvoyer un `AgentToolResult` personnalisé ou réutiliser
une implémentation `api.registerTool` existante. Utilisez `definePluginEntry` à la place
de `defineToolPlugin` lorsque vous avez besoin de tools entièrement dynamiques ou de capacités de plugin
mixtes.

## Configuration

`configSchema` est optionnel. Si vous l'omettez, OpenClaw utilise un schéma strict d'objet vide
et le manifeste généré inclut toujours `configSchema`.

```typescript
export default defineToolPlugin({
  id: "no-config-tools",
  name: "No Config Tools",
  description: "Adds tools that do not need configuration.",
  tools: () => [],
});
```

Lorsque vous incluez `configSchema`, le deuxième argument `execute` est typé à partir du schéma :

```typescript
const configSchema = Type.Object({
  apiKey: Type.String(),
});

export default defineToolPlugin({
  id: "configured-tools",
  name: "Configured Tools",
  description: "Adds configured tools.",
  configSchema,
  tools: (tool) => [
    tool({
      name: "configured_ping",
      description: "Check whether configuration is available.",
      parameters: Type.Object({}),
      execute: (_params, config) => ({ hasKey: config.apiKey.length > 0 }),
    }),
  ],
});
```

OpenClaw lit la configuration du plugin depuis l'entrée du plugin dans la configuration du Gateway. Ne codez pas en dur les secrets dans le code source ou dans les exemples de documentation. Utilisez la configuration, les variables d'environnement ou les SecretRefs selon le modèle de sécurité du plugin.

## Métadonnées générées

OpenClaw découvre les plugins installés à partir des métadonnées à froid. Il doit être capable de lire le manifeste du plugin avant d'importer le code d'exécution du plugin. OpenClaw`defineToolPlugin` expose donc des métadonnées statiques, et `openclaw plugins build` écrit ces métadonnées dans le package.

Exécutez le générateur après avoir modifié l'identifiant, le nom, la description, le schéma de configuration, l'activation ou les noms des outils du plugin :

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

Pour un plugin à un seul outil, le manifeste généré ressemble à ceci :

```json
{
  "id": "stock-quotes",
  "name": "Stock Quotes",
  "description": "Fetch stock quote snapshots.",
  "version": "0.1.0",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  },
  "activation": {
    "onStartup": true
  },
  "contracts": {
    "tools": ["stock_quote"]
  }
}
```

`contracts.tools`OpenClaw est le contrat de découverte important. Il indique à OpenClaw quel plugin possède chaque outil sans charger le code d'exécution de chaque plugin installé. Si le manifeste est périmé, l'outil peut être absent de la découverte ou le mauvais plugin peut être blâmé pour une erreur d'enregistrement.

## Métadonnées du package

Pour le workflow simple de plugin d'outil, `openclaw plugins build` aligne `package.json` sur l'entrée d'exécution unique sélectionnée :

```json
{
  "type": "module",
  "files": ["dist", "openclaw.plugin.json", "README.md"],
  "dependencies": {
    "typebox": "^1.1.38"
  },
  "peerDependencies": {
    "openclaw": ">=2026.5.17"
  },
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

Utilisez le JavaScript compilé tel que `./dist/index.js` pour les packages installés. Les entrées source sont utiles dans le développement d'espace de travail, mais les packages publiés ne doivent pas dépendre du chargement du runtime TypeScript.

## Valider dans CI

Utilisez `plugins build --check` pour faire échouer CI lorsque les métadonnées générées sont périmées sans réécrire les fichiers :

```bash
npm run build
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
npm test
```

`plugins validate` vérifie que :

- `openclaw.plugin.json` existe et passe le chargeur de manifeste normal.
- L'entrée actuelle exporte les métadonnées `defineToolPlugin`.
- Les champs du manifeste généré correspondent aux métadonnées de l'entrée.
- `contracts.tools` correspond aux noms d'outils déclarés.
- `package.json` fait pointer `openclaw.extensions` vers l'entrée d'exécution sélectionnée.

## Installer et inspecter localement

À partir d'un checkout OpenClaw distinct ou d'une CLI installée, installez le chemin du package :

```bash
openclaw plugins install ./stock-quotes
openclaw plugins inspect stock-quotes --runtime
```

Pour un test d'empaquetage, empotez d'abord et installez l'archive tar :

```bash
npm pack
openclaw plugins install npm-pack:./openclaw-plugin-stock-quotes-0.1.0.tgz
openclaw plugins inspect stock-quotes --runtime --json
```

Après l'installation, démarrez ou redémarrez le Gateway et demandez à l'agent d'utiliser l'outil. Si vous déboguez la visibilité de l'outil, inspectez le runtime du plugin et le catalogue d'outils effectif avant de modifier le code.

## Publier

Publiez via ClawHub lorsque le paquet est prêt :

```bash
clawhub package publish your-org/stock-quotes --dry-run
clawhub package publish your-org/stock-quotes
```

Installez avec un localisateur ClawHub explicite :

```bash
openclaw plugins install clawhub:your-org/stock-quotes
```

Les spécifications de paquet npm nues restent prises en charge pendant la période de transition de lancement, mais ClawHub est la surface de découverte et de distribution privilégiée pour les plugins OpenClaw.

## Dépannage

### `plugin entry not found: ./dist/index.js`

Le fichier d'entrée sélectionné n'existe pas. Exécutez `npm run build`, puis réexécutez `openclaw plugins build --entry ./dist/index.js` ou `openclaw plugins validate --entry ./dist/index.js`.

### `plugin entry does not expose defineToolPlugin metadata`

L'entrée n'a pas exporté de valeur créée par `defineToolPlugin`. Vérifiez que l'export par défaut du module est le résultat de `defineToolPlugin(...)`, ou passez l'entrée correcte avec `--entry`.

### `openclaw.plugin.json generated metadata is stale`

Le manifeste ne correspond plus aux métadonnées d'entrée. Exécutez :

```bash
npm run build
openclaw plugins build --entry ./dist/index.js
```

Validez les modifications de `openclaw.plugin.json` et de `package.json`.

### `package.json openclaw.extensions must include ./dist/index.js`

Les métadonnées du paquet pointent vers une entrée de runtime différente. Exécutez `openclaw plugins build --entry ./dist/index.js` pour que le générateur aligne les métadonnées du paquet avec l'entrée que vous souhaitez livrer.

### `Cannot find package 'typebox'`

Le plugin compilé importe `typebox` au runtime. Conservez `typebox` dans `dependencies`, réinstallez les dépendances du paquet, recompilez et relancez la validation.

### L'outil n'apparaît pas après l'installation

Vérifiez ceci dans l'ordre :

1. `openclaw plugins inspect <plugin-id> --runtime`
2. `openclaw plugins validate --root <plugin-root> --entry ./dist/index.js`
3. `openclaw.plugin.json` a `contracts.tools` avec les noms d'outils attendus.
4. `package.json` a `openclaw.extensions: ["./dist/index.js"]`.
5. Le Gateway a été redémarré ou rechargé après l'installation du plugin.

## Voir aussi

- [Création de plugins](/fr/plugins/building-plugins)
- [Points d'entrée des plugins](/fr/plugins/sdk-entrypoints)
- [Sous-chemins du SDK de plugin](/fr/plugins/sdk-subpaths)
- [Manifeste du plugin](/fr/plugins/manifest)
- [CLI des plugins](CLI)(/en/cli/plugins)
- [Publication sur ClawHub](ClawHub)(/en/clawhub/publishing)
