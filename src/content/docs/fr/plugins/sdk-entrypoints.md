---
title: "Points d'entrée du plugin"
sidebarTitle: "Points d'entrée"
summary: "Référence pour definePluginEntry, defineChannelPluginEntry et defineSetupPluginEntry"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

# Points d'entrée des plugins

Chaque plugin exporte un objet d'entrée par défaut. Le SDK fournit trois assistants pour
les créer.

Pour les plugins installés, `package.json` doit diriger le chargement d'exécution vers le JavaScript
construit, si disponible :

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
dans l'espace de travail et l'extraction git. `runtimeExtensions` et `runtimeSetupEntry` sont préférés
lorsque OpenClaw charge un package installé et permettent aux packages npm d'éviter la
compilation TypeScript à l'exécution. Si un package installé déclare uniquement une entrée source
TypeScript, OpenClaw utilisera un homologue `dist/*.js` construit correspondant lorsqu'un
existe, puis reviendra à la source TypeScript.

Tous les chemins d'entrée doivent rester dans le répertoire du package du plugin. Les entrées d'exécution
et les homologues JavaScript construits déduits ne rendent pas un chemin source `extensions` ou
`setupEntry` échappé valide.

<Tip>**Vous cherchez un guide pas à pas ?** Voir [Plugins de channel](/fr/plugins/sdk-channel-plugins) ou [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) pour des guides détaillés.</Tip>

## `definePluginEntry`

**Importation :** `openclaw/plugin-sdk/plugin-entry`

Pour les plugins fournisseur, les plugins tool, les plugins hook et tout ce qui n'est **pas**
un channel de messagerie.

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
| `id`           | `string`                                                         | Oui         | —                   |
| `name`         | `string`                                                         | Oui         | —                   |
| `description`  | `string`                                                         | Oui         | —                   |
| `kind`         | `string`                                                         | Non         | —                   |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | Non         | Schéma d'objet vide |
| `register`     | `(api: OpenClawPluginApi) => void`                               | Oui         | —                   |

- `id` doit correspondre à votre manifeste `openclaw.plugin.json`.
- `kind` est pour les emplacements exclusifs : `"memory"` ou `"context-engine"`.
- `configSchema` peut être une fonction pour une évaluation paresseuse.
- OpenClaw résout et mémorise ce schéma lors du premier accès, les constructeurs de schéma coûteux ne s'exécutant donc qu'une seule fois.

## `defineChannelPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Enveloppe `definePluginEntry` avec un câblage spécifique au channel. Appelle automatiquement `api.registerChannel({ plugin })`, expose une couture de métadonnées optionnelle d'aide racine CLI, et verrouille `registerFull` sur le mode d'enregistrement.

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
| `id`                  | `string`                                                         | Oui         | —                   |
| `name`                | `string`                                                         | Oui         | —                   |
| `description`         | `string`                                                         | Oui         | —                   |
| `plugin`              | `ChannelPlugin`                                                  | Oui         | —                   |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | Non         | Schéma d'objet vide |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | Non         | —                   |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | Non         | —                   |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | Non         | —                   |

- `setRuntime` est appelé lors de l'enregistrement afin que vous puissiez stocker la référence d'exécution (généralement via `createPluginRuntimeStore`). Il est ignoré lors de la capture des métadonnées CLI.
- `registerCliMetadata` s'exécute à la fois pendant `api.registrationMode === "cli-metadata"` et `api.registrationMode === "full"`. Utilisez-le comme l'emplacement canonique pour les descripteurs CLI appartenant au channel afin que l'aide racine reste non activante tandis que l'enregistrement normal des commandes CLI reste compatible avec les chargements complets de plugins.
- `registerFull` ne s'exécute que lorsque `api.registrationMode === "full"`. Il est ignoré lors du chargement en mode configuration uniquement.
- Comme `definePluginEntry`, `configSchema` peut être une fabrique paresseuse et OpenClaw mémorise le schéma résolu lors du premier accès.
- Pour les commandes racine CLI détenues par le plugin, privilégiez `api.registerCli(..., { descriptors: [...] })`
  lorsque vous voulez que la commande reste chargée à la demande sans disparaître de
  l'arbre d'analyse du CLI racine. Pour les plugins de channel, privilégiez l'enregistrement de ces descripteurs
  depuis `registerCliMetadata(...)` et gardez `registerFull(...)` concentré sur le travail exclusif à l'exécution.
- Si `registerFull(...)` enregistre également des méthodes RPC de passerelle, conservez-les sur un
  préfixe spécifique au plugin. Les espaces de noms d'administration principaux réservés (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) sont toujours forcés à
  `operator.admin`.

## `defineSetupPluginEntry`

**Import :** `openclaw/plugin-sdk/channel-core`

Pour le fichier `setup-entry.ts` léger. Retourne uniquement `{ plugin }` sans
connexion à l'exécution ou au CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw charge ceci à la place de l'entrée complète lorsqu'un channel est désactivé,
non configuré, ou lorsque le chargement différé est activé. Voir
[Setup and Config](/fr/plugins/sdk-setup#setup-entry) pour savoir quand cela est important.

En pratique, associez `defineSetupPluginEntry(...)` aux familles d'assistants de configuration
étroits :

- `openclaw/plugin-sdk/setup-runtime` pour les assistants de configuration sûrs pour l'exécution tels que
  les adaptateurs de correctifs de configuration sécurisés pour l'importation, la sortie des notes de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries`, et les proxies de configuration délégués
- `openclaw/plugin-sdk/channel-setup` pour les surfaces de configuration d'installation facultative
- `openclaw/plugin-sdk/setup-tools` pour les assistants de configuration/installation CLI/archive/docs

Conservez les SDK lourds, l'enregistrement CLI et les services d'exécution longue durée dans l'entrée
complète.

Les channels d'espace de travail regroupés qui séparent les surfaces de configuration et d'exécution peuvent utiliser
`defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` à la place. Ce contrat permet à l'entrée
de configuration de conserver les exportations de plugin/secrets sûrs pour la configuration tout en exposant
toujours un setter d'exécution :

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

N'utilisez ce contrat regroupé que lorsque les flux de configuration ont vraiment besoin d'un setter d'exécution
léger avant le chargement de l'entrée complète du channel.

## Mode d'enregistrement

`api.registrationMode` indique à votre plugin comment il a été chargé :

| Mode              | Quand                                         | Ce qu'il faut enregistrer                                                                                    |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `"full"`          | Démarrage normal de la passerelle             | Tout                                                                                                         |
| `"setup-only"`    | Canal désactivé ou non configuré              | Enregistrement du canal uniquement                                                                           |
| `"setup-runtime"` | Flux de configuration avec runtime disponible | Enregistrement du canal plus uniquement le runtime léger nécessaire avant le chargement de l'entrée complète |
| `"cli-metadata"`  | Aide racine / capture des métadonnées CLI     | Descripteurs CLI uniquement                                                                                  |

`defineChannelPluginEntry` gère cette division automatiquement. Si vous utilisez
`definePluginEntry` directement pour un canal, vérifiez le mode vous-même :

```typescript
register(api) {
  if (api.registrationMode === "cli-metadata" || api.registrationMode === "full") {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

Considérez `"setup-runtime"` comme la fenêtre pendant laquelle les surfaces de démarrage de configuration uniquement doivent
exister sans réintégrer le runtime complet groupé du canal. Les options appropriées sont
l'enregistrement du canal, les routes HTTP sécurisées pour la configuration, les méthodes de passerelle sécurisées pour la configuration, et
les helpers de configuration délégués. Les services d'arrière-plan lourds, les enregistreurs CLI et
les initialisations du SDK provider/client appartiennent toujours à `"full"`.

Pour les enregistreurs CLI spécifiquement :

- utilisez `descriptors` lorsque l'enregistreur possède une ou plusieurs commandes racines et que vous
  souhaitez que OpenClaw charge à la demande le vrai module CLI lors de la première invocation
- assurez-vous que ces descripteurs couvrent chaque racine de commande de niveau supérieur exposée par
  l'enregistreur
- utilisez `commands` seul uniquement pour les chemins de compatibilité eager

## Formes de plugins

OpenClaw classe les plugins chargés selon leur comportement d'enregistrement :

| Forme                 | Description                                          |
| --------------------- | ---------------------------------------------------- |
| **plain-capability**  | Un type de capacité (ex. provider uniquement)        |
| **hybrid-capability** | Types de capacités multiples (ex. provider + speech) |
| **hook-only**         | Seulement des hooks, aucune capacité                 |
| **non-capability**    | Outils/commandes/services mais aucune capacité       |

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin.

## Connexes

- [Aperçu du SDK](/fr/plugins/sdk-overview) — référence de l'API d'enregistrement et des sous-chemins
- [Helpers d'exécution](/fr/plugins/sdk-runtime) — `api.runtime` et `createPluginRuntimeStore`
- [Configuration et installation](/fr/plugins/sdk-setup) — manifeste, entrée de configuration, chargement différé
- [Plugins de canal](/fr/plugins/sdk-channel-plugins) — construction de l'objet `ChannelPlugin`
- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) — enregistrement de fournisseur et hooks
