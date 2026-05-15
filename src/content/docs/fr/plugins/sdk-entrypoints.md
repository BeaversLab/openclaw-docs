---
summary: "Référence pour definePluginEntry, defineChannelPluginEntry et defineSetupPluginEntry"
title: "Points d'entrée des plugins"
sidebarTitle: "Points d'entrée"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

Chaque plugin exporte un objet d'entrée par défaut. Le SDK fournit trois assistants pour les créer.

Pour les plugins installés, `package.json` doit diriger le chargement d'exécution vers le JavaScript construit lorsque disponible :

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

`extensions` et `setupEntry` restent des entrées source valides pour le développement en espace de travail et l'extraction git. `runtimeExtensions` et `runtimeSetupEntry`OpenClawnpm sont préférés lorsqu'OpenClaw charge un package installé et permettent aux packages npm d'éviter la compilation TypeScript à l'exécution. Les entrées d'exécution explicites sont requises : `runtimeSetupEntry` nécessite `setupEntry`, et l'absence d'artefacts `runtimeExtensions` ou `runtimeSetupEntry`OpenClaw fait échouer l'installation/découverte au lieu de revenir silencieusement à la source. Si un package installé ne déclare qu'une entrée source TypeScript, OpenClaw utilisera un homologue `dist/*.js` construit correspondant s'il en existe un, puis reviendra à la source TypeScript.

Tous les chemins d'entrée doivent rester dans le répertoire du package du plugin. Les entrées d'exécution et les homologues JavaScript construits inférés ne rendent pas un chemin source `extensions` ou `setupEntry` sortant valide.

<Tip>**Vous cherchez un guide pas à pas ?** Consultez [Plugins de canal](/fr/plugins/sdk-channel-plugins) ou [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) pour des guides étape par étape.</Tip>

## `definePluginEntry`

**Importation :** `openclaw/plugin-sdk/plugin-entry`

Pour les fournisseurs, les outils, les hooks et tout ce qui n'est **pas** un canal de messagerie.

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
- `kind` est pour les emplacements exclusifs : `"memory"` ou `"context-engine"`.
- `configSchema` peut être une fonction pour une évaluation paresseuse.
- OpenClaw résout et mémorise ce schéma lors du premier accès, de sorte que les constructeurs de schéma coûteux ne s'exécutent qu'une seule fois.

## `defineChannelPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Enveloppe `definePluginEntry` avec un câblage spécifique au channel. Appelle automatiquement
`api.registerChannel({ plugin })`CLI, expose une jonction de métadonnées CLI d'aide racine optionnelle
et conditionne `registerFull` au mode d'enregistrement.

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

- `setRuntime` est appelé lors de l'enregistrement afin que vous puissiez stocker la référence d'exécution
  (généralement via `createPluginRuntimeStore`CLI). Il est ignoré lors de la capture
  des métadonnées CLI.
- `registerCliMetadata` s'exécute pendant `api.registrationMode === "cli-metadata"`,
  `api.registrationMode === "discovery"` et
  `api.registrationMode === "full"`CLICLI.
  Utilisez-le comme l'emplacement canonique pour les descripteurs CLI appartenant au channel afin que l'aide racine
  reste non activante, que les instantanés Discovery incluent les métadonnées de commandes statiques, et
  que l'enregistrement normal des commandes CLI reste compatible avec les chargements complets de plugins.
- L'enregistrement Discovery est non activant, et non sans importation. OpenClaw peut
  évaluer l'entrée de plugin de confiance et le module de plugin de channel pour construire
  l'instantané, donc gardez les importations de haut niveau sans effets secondaires et placez les sockets,
  clients, workers et services derrière des chemins uniquement OpenClaw`"full"`.
- `registerFull` ne s'exécute que lors de `api.registrationMode === "full"`. Il est ignoré
  lors du chargement en mode configuration uniquement.
- Comme `definePluginEntry`, `configSchema`OpenClaw peut être une usine paresseuse et OpenClaw
  mémorise le schéma résolu lors du premier accès.
- Pour les commandes racine de l'interface en ligne de commande (CLI) détenues par le plugin, préférez CLI`api.registerCli(..., { descriptors: [...] })`CLI
  lorsque vous voulez que la commande reste chargée à la demande sans disparaître de
  l'arbre d'analyse de la CLI racine. Pour les commandes de fonctionnalité à nœuds couplés, préférez
  `api.registerNodeCliFeature(...)` afin que la commande atterrisse sous `openclaw nodes`.
  Pour les autres commandes de plugin imbriquées, ajoutez `parentPath` et enregistrez les commandes sur
  l'objet `program`OpenClaw passé au registraire ; OpenClaw le résout vers la
  commande parente avant d'appeler le plugin. Pour les plugins de channel, préférez
  enregistrer ces descripteurs depuis `registerCliMetadata(...)` et gardez
  `registerFull(...)` concentré sur le travail d'exécution uniquement.
- Si `registerFull(...)`RPC enregistre également des méthodes RPC de passerelle, conservez-les sur un
  préfixe spécifique au plugin. Les espaces de noms d'administration principaux réservés (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) sont toujours forcés vers
  `operator.admin`.

## `defineSetupPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Pour le fichier `setup-entry.ts` léger. Renvoie simplement `{ plugin }`CLI sans
câblage d'exécution ou de CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw charge ceci à la place de l'entrée complète lorsqu'un channel est désactivé,
non configuré, ou lorsque le chargement différé est activé. Voir
[Configuration et installation](OpenClaw/en/plugins/sdk-setup#setup-entry) pour savoir quand cela est important.

En pratique, associez `defineSetupPluginEntry(...)` aux familles d'assistants de configuration étroits :

- `openclaw/plugin-sdk/setup-runtime` pour les assistants de configuration sécurisés pour l'exécution tels que
  les adaptateurs de correctifs de configuration sécurisés pour l'importation, la sortie de note de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries`, et les proxys de configuration délégués
- `openclaw/plugin-sdk/channel-setup` pour les surfaces de configuration d'installation facultative
- `openclaw/plugin-sdk/setup-tools`CLI pour les assistants de configuration/installation/CLI/archive/docs

Conservez les SDK lourds, l'enregistrement CLI et les services d'exécution longue durée dans l'entrée
complète.

Les canaux d'espace de travail regroupés qui séparent la configuration et l'exécution peuvent utiliser
`defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` à la place. Ce contrat permet au point d'entrée de configuration de conserver les exportations de plugins/secrets sûrs pour la configuration tout en exposant toujours un
setter d'exécution :

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

| Mode              | Quand                                         | Ce qu'il faut enregistrer                                                                                                                                       |
| ----------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"full"`          | Démarrage normal de la passerelle             | Tout                                                                                                                                                            |
| `"discovery"`     | Découverte des capacités en lecture seule     | Enregistrement de canal plus descripteurs statiques CLI ; le code d'entrée peut se charger, mais ignorera les sockets, les workers, les clients et les services |
| `"setup-only"`    | Canal désactivé/non configuré                 | Enregistrement de canal uniquement                                                                                                                              |
| `"setup-runtime"` | Flux de configuration avec runtime disponible | Enregistrement de canal plus uniquement le runtime léger nécessaire avant le chargement complet de l'entrée                                                     |
| `"cli-metadata"`  | Aide racine / capture des métadonnées CLI     | Descripteurs CLI uniquement                                                                                                                                     |

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

Le mode découverte construit un instantané de registre non activant. Il peut toujours évaluer
l'entrée du plugin et l'objet du plugin de canal afin que OpenClaw puisse enregistrer les capacités de
canal et les descripteurs statiques CLI. Traitez l'évaluation de module en découverte comme
fiable mais légère : pas de clients réseau, de sous-processus, d'écouteurs, de connexions
base de données, de workers en arrière-plan, de lectures d'identifiants, ou autres effets de bord
runtime actifs au niveau supérieur.

Traitez `"setup-runtime"` comme la fenêtre pendant laquelle les surfaces de démarrage réservées à la configuration doivent
exister sans réintégrer l'exécution complète du canal regroupé. Les choix appropriés sont
l'enregistrement du canal, les routes HTTP sûres pour la configuration, les méthodes de passerelle sûres pour la configuration et
les assistants de configuration délégués. Les services d'arrière-plan lourds, les enregistreurs CLI et
les initialisations du SDK fournisseur/client appartiennent toujours à `"full"`.

Pour les registres CLI spécifiquement :

- utilisez `descriptors` lorsque l'enregistreur possède une ou plusieurs commandes racines et que vous
  voulez que OpenClaw charge le module réel CLI de manière paresseuse lors de la première invocation
- assurez-vous que ces descripteurs couvrent chaque racine de commande de premier niveau exposée par le
  registre
- gardez les noms de commandes descripteurs en lettres, chiffres, tiret et trait de soulignement,
  commençant par une lettre ou un chiffre ; OpenClaw rejette les noms de descripteurs en dehors
  de cette forme et supprime les séquences de contrôle de terminal des descriptions avant
  le rendu de l'aide
- utilisez `commands` seul uniquement pour les chemins de compatité eager

## Formes de plugins

OpenClaw classe les plugins chargés selon leur comportement d'enregistrement :

| Forme                 | Description                                          |
| --------------------- | ---------------------------------------------------- |
| **plain-capability**  | Un type de capacité (ex. fournisseur uniquement)     |
| **hybrid-capability** | Types de capacités multiples (ex. provider + speech) |
| **hook-only**         | Seulement des hooks, pas de capacités                |
| **non-capability**    | Outils/commandes/services mais pas de capacités      |

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin.

## Connexes

- [Aperçu du SDK](/fr/plugins/sdk-overview) - API d'enregistrement et référence des sous-chemins
- [Assistants d'exécution](/fr/plugins/sdk-runtime) - `api.runtime` et `createPluginRuntimeStore`
- [Configuration et installation](/fr/plugins/sdk-setup) - manifeste, point d'entrée de configuration, chargement différé
- [Plugins de canal](/fr/plugins/sdk-channel-plugins) - construction de l'objet `ChannelPlugin`
- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) - enregistrement et hooks du fournisseur
