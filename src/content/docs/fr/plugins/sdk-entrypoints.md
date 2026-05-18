---
summary: "Référence pour defineToolPlugin, definePluginEntry, defineChannelPluginEntry et defineSetupPluginEntry"
title: "Points d'entrée des plugins"
sidebarTitle: "Points d'entrée"
read_when:
  - You need the exact type signature of defineToolPlugin, definePluginEntry, or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

Chaque plugin exporte un objet d'entrée par défaut. Le SDK fournit des aides pour
les créer.

Pour les plugins installés, `package.json` doit diriger le chargement d'exécution vers le JavaScript
construit lorsque disponible :

```json
{
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "setupEntry": "./src/setup-entry.ts",
    "runtimeSetupEntry": "./dist/setup-entry.js"
  }
}
```

`extensions` et `setupEntry` restent des entrées source valides pour le développement
en espace de travail et en extraction git. `runtimeExtensions` et `runtimeSetupEntry` sont préférés
lorsqu'OpenClaw charge un package installé et permettent aux packages npm d'éviter la
compilation TypeScript à l'exécution. Des entrées d'exécution explicites sont requises : `runtimeSetupEntry`
nécessite `setupEntry`, et les artefacts `runtimeExtensions` ou `runtimeSetupEntry`
manquants échouent à l'installation/découverte au lieu de revenir silencieusement à la source. Si
un package installé déclare uniquement une entrée source TypeScript, OpenClaw utilisera un
pair construit `dist/*.js` correspondant lorsqu'il existe, puis reviendra à la source
TypeScript.

Tous les chemins d'entrée doivent rester à l'intérieur du répertoire du package du plugin. Les entrées d'exécution
et les pairs JavaScript construits inférés ne rendent pas un chemin source `extensions` ou
`setupEntry` sortant valide.

<Tip>**Vous cherchez un tutoriel ?** Voir [Plugins d'outils](/fr/plugins/tool-plugins), [Plugins de canal](/fr/plugins/sdk-channel-plugins), ou [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) pour des guides étape par étape.</Tip>

## `defineToolPlugin`

**Importation :** `openclaw/plugin-sdk/tool-plugin`

Pour les plugins simples qui n'ajoutent que des outils d'agent. `defineToolPlugin` garde le
source d'écriture petit, déduit les types de configuration et de paramètres d'outil à partir des schémas TypeBox,
encapsule les valeurs de retour simples dans le format de résultat d'outil OpenClaw, et
expose des métadonnées statiques que `openclaw plugins build` écrit dans le manifeste
du plugin.

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quotes.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "API key." })),
  }),
  tools: (tool) => [
    tool({
      name: "quote",
      label: "Quote",
      description: "Fetch a quote.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol." }),
      }),
      execute: async ({ symbol }, config) => ({ symbol, hasKey: Boolean(config.apiKey) }),
    }),
  ],
});
```

- `configSchema` est optionnel. Lorsqu'il est omis, OpenClaw utilise un schéma d'objet vide strict
  et le manifeste généré inclut toujours `configSchema`.
- `execute` renvoie une chaîne simple ou une valeur sérialisable en JSON. L'assistant l'encapsule
  en tant que résultat d'outil texte avec `details`.
- Les noms d'outils sont statiques. `openclaw plugins build` dérive `contracts.tools`
  à partir des outils déclarés, les auteurs n'ont donc pas besoin de dupliquer les noms manuellement.
- Le chargement à l'exécution reste strict. Les plugins installés ont toujours besoin
  de `openclaw.plugin.json` et de `package.json` `openclaw.extensions` ; OpenClaw
  n'exécute pas le code du plugin pour déduire les données manquantes du manifeste.

## `definePluginEntry`

**Import :** `openclaw/plugin-sdk/plugin-entry`

Pour les plugins de fournisseur, les plugins d'outils avancés, les plugins de hook, et tout ce qui n'est
**pas** un canal de messagerie.

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Short summary",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
  },
});
```

| Champ          | Type                                                             | Obligatoire | Par défaut          |
| -------------- | ---------------------------------------------------------------- | ----------- | ------------------- |
| `id`           | `string`                                                         | Oui         | -                   |
| `name`         | `string`                                                         | Oui         | -                   |
| `description`  | `string`                                                         | Oui         | -                   |
| `kind`         | `string`                                                         | Non         | -                   |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | Non         | Schéma d'objet vide |
| `register`     | `(api: OpenClawPluginApi) => void`                               | Oui         | -                   |

- `id` doit correspondre à votre manifeste `openclaw.plugin.json`.
- `kind` est destiné aux emplacements exclusifs : `"memory"` ou `"context-engine"`.
- `configSchema` peut être une fonction pour une évaluation différée.
- OpenClaw résout et mémorise ce schéma lors du premier accès, afin que les constructeurs de schéma coûteux ne s'exécutent qu'une seule fois.

## `defineChannelPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Encapsule `definePluginEntry` avec un câblage spécifique au canal. Appelle automatiquement `api.registerChannel({ plugin })`, expose une couture de métadonnées d'aide racine facultative pour le CLI, et conditionne `registerFull` au mode d'enregistrement.

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerCliMetadata(api) {
    api.registerCli(/* ... */);
  },
  registerFull(api) {
    api.registerGatewayMethod(/* ... */);
  },
});
```

| Champ                 | Type                                                             | Obligatoire | Par défaut          |
| --------------------- | ---------------------------------------------------------------- | ----------- | ------------------- |
| `id`                  | `string`                                                         | Oui         | -                   |
| `name`                | `string`                                                         | Oui         | -                   |
| `description`         | `string`                                                         | Oui         | -                   |
| `plugin`              | `ChannelPlugin`                                                  | Oui         | -                   |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | Non         | Schéma d'objet vide |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | Non         | -                   |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | Non         | -                   |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | Non         | -                   |

- `setRuntime` est appelé lors de l'enregistrement afin que vous puissiez stocker la référence d'exécution (généralement via `createPluginRuntimeStore`). Elle est ignorée lors de la capture des métadonnées du CLI.
- `registerCliMetadata` s'exécute pendant `api.registrationMode === "cli-metadata"`, `api.registrationMode === "discovery"` et `api.registrationMode === "full"`. Utilisez-la comme emplacement canonique pour les descripteurs CLI détenus par le canal, afin que l'aide racine reste non activante, que les instantanés de découverte incluent les métadonnées de commande statiques, et que l'enregistrement normal des commandes CLI reste compatible avec les chargements complets de plugins.
- L'enregistrement par découverte est non activant, et non sans importation. OpenClaw peut évaluer l'entrée de plugin approuvée et le module de plugin de canal pour construire l'instantané. Assurez-vous donc que les importations de niveau supérieur sont sans effets secondaires et placez les sockets, clients, workers et services derrière des chemins exclusifs à `"full"`.
- `registerFull` ne s'exécute que lorsque `api.registrationMode === "full"`. Elle est ignorée
  lors du chargement en mode configuration uniquement.
- Tout comme `definePluginEntry`, `configSchema` peut être une fabrique différée et OpenClaw
  mémorise le schéma résolu lors du premier accès.
- Pour les commandes racine CLI détenues par le plugin, privilégiez `api.registerCli(..., { descriptors: [...] })`
  lorsque vous souhaitez que la commande reste chargée à la demande sans disparaître de l'arbre
  d'analyse CLI racine. Pour les commandes de fonctionnalité de nœuds jumelés, privilégiez
  `api.registerNodeCliFeature(...)` afin que la commande atterrisse sous `openclaw nodes`.
  Pour les autres commandes de plugin imbriquées, ajoutez `parentPath` et enregistrez les commandes sur
  l'objet `program` transmis au registre ; OpenClaw le résout vers la
  commande parente avant d'appeler le plugin. Pour les plugins de channel, préférez
  l'enregistrement de ces descripteurs depuis `registerCliMetadata(...)` et gardez
  `registerFull(...)` axé sur le travail uniquement à l'exécution.
- Si `registerFull(...)` enregistre également des méthodes RPC de passerelle, gardez-les sur un
  préfixe spécifique au plugin. Les espaces de noms d'administration principaux réservés (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) sont toujours forcés vers
  `operator.admin`.

## `defineSetupPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Pour le fichier léger `setup-entry.ts`. Renvoie uniquement `{ plugin }` sans
câblage d'exécution ou CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw charge ceci à la place de l'entrée complète lorsqu'un channel est désactivé,
non configuré, ou lorsque le chargement différé est activé. Voir
[Configuration et configuration](/fr/plugins/sdk-setup#setup-entry) pour savoir quand cela est important.

En pratique, associez `defineSetupPluginEntry(...)` aux familles d'assistants de configuration étroits :

- `openclaw/plugin-sdk/setup-runtime` pour les helpers de configuration sécurisés au runtime tels que
  `createSetupTranslator`, les adaptateurs de correctifs de configuration sécurisés pour l'importation, la sortie de note de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries` et les proxies de configuration délégués
- `openclaw/plugin-sdk/channel-setup` pour les surfaces de configuration d'installation facultative
- `openclaw/plugin-sdk/setup-tools` pour les helpers de configuration/installation CLI/archive/docs

Gardez les SDK lourds, l'inscription CLI et les services de longue durée du runtime dans l'entrée
complète.

Les canaux d'espace de travail regroupés qui séparent les surfaces de configuration et d'exécution peuvent utiliser
`defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` à la place. Ce contrat permet à
l'entrée de configuration de conserver les exportations de plugins/secrets sécurisées pour la configuration tout en exposant toujours un
setter de runtime :

```typescript
import { defineBundledChannelSetupEntry } from "openclaw/plugin-sdk/channel-entry-contract";

export default defineBundledChannelSetupEntry({
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "myChannelPlugin",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setMyChannelRuntime",
  },
});
```

Utilisez ce contrat regroupé uniquement lorsque les flux de configuration ont vraiment besoin d'un setter de runtime léger
avant le chargement de l'entrée complète du canal.

## Mode d'inscription

`api.registrationMode` indique à votre plugin comment il a été chargé :

| Mode              | Quand                                         | Ce qu'il faut inscrire                                                                                                                                    |
| ----------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"full"`          | Démarrage normal de la passerelle             | Tout                                                                                                                                                      |
| `"discovery"`     | Découverte des capacités en lecture seule     | Inscription du canal plus descripteurs statiques CLI ; le code d'entrée peut se charger, mais saute les sockets, les workers, les clients et les services |
| `"setup-only"`    | Canal désactivé/non configuré                 | Inscription du canal uniquement                                                                                                                           |
| `"setup-runtime"` | Flux de configuration avec runtime disponible | Inscription du canal plus uniquement le runtime léger nécessaire avant le chargement de l'entrée complète                                                 |
| `"cli-metadata"`  | Aide racine / capture des métadonnées CLI     | Descripteurs CLI uniquement                                                                                                                               |

`defineChannelPluginEntry` gère cette division automatiquement. Si vous utilisez
`definePluginEntry` directement pour un canal, vérifiez le mode vous-même :

```typescript
register(api) {
  if (
    api.registrationMode === "cli-metadata" ||
    api.registrationMode === "discovery" ||
    api.registrationMode === "full"
  ) {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

Le mode Discovery crée un instantané du registre sans activation. Il peut toujours évaluer
le point d'entrée du plugin et l'objet du plugin de canal afin que OpenClawCLI puisse enregistrer les capacités de canal
et les descripteurs CLI statiques. Considérez l'évaluation du module dans le mode découverte comme
digne de confiance mais légère : aucun client réseau, sous-processus, écouteurs, connexions de base de données,
workers en arrière-plan, lectures d'informations d'identification ou autres effets secondaires d'exécution en direct
au niveau supérieur.

Considérez `"setup-runtime"` comme la fenêtre pendant laquelle les surfaces de démarrage uniquement de configuration doivent
exister sans réintégrer l'exécution complète du canal groupé. Sont adaptés
l'enregistrement du canal, les routes HTTP sécurisées pour la configuration, les méthodes de passerelle sécurisées pour la configuration, et
les assistants de configuration délégués. Les services d'arrière-plan lourds, les enregistreurs CLI et
les amorçages du SDK fournisseur/client appartiennent toujours à `"full"`.

Pour les enregistreurs CLI spécifiquement :

- utilisez `descriptors` lorsque l'enregistreur possède une ou plusieurs commandes racines et que vous
  voulez que OpenClaw charge à la demande le véritable module CLI lors de la première invocation
- assurez-vous que ces descripteurs couvrent chaque racine de commande de premier niveau exposée par
  l'enregistreur
- gardez les noms de commande des descripteurs en lettres, chiffres, tiret et trait de soulignement,
  commençant par une lettre ou un chiffre ; OpenClaw rejette les noms de descripteurs en dehors
  de cette forme et supprime les séquences de contrôle du terminal des descriptions avant
  l'affichage de l'aide
- utilisez `commands` seul uniquement pour les chemins de compatibilité impatients

## Formes de plugins

OpenClaw classe les plugins chargés selon leur comportement d'enregistrement :

| Forme                 | Description                                             |
| --------------------- | ------------------------------------------------------- |
| **plain-capability**  | Un type de capacité (ex. fournisseur uniquement)        |
| **hybrid-capability** | Types de capacités multiples (ex. fournisseur + parole) |
| **hook-only**         | Seulement des hooks, aucune capacité                    |
| **non-capability**    | Outils/commandes/services mais aucune capacité          |

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin.

## Connexes

- [Aperçu du SDK](/fr/plugins/sdk-overview) - référence de l'API d'enregistrement et des sous-chemins
- [Runtime Helpers](/fr/plugins/sdk-runtime) - `api.runtime` et `createPluginRuntimeStore`
- [Setup and Config](/fr/plugins/sdk-setup) - manifest, point d'entrée de configuration, chargement différé
- [Channel Plugins](/fr/plugins/sdk-channel-plugins) - construction de l'objet `ChannelPlugin`
- [Provider Plugins](/fr/plugins/sdk-provider-plugins) - inscription du provider et hooks
