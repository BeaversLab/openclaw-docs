---
title: "Points d'entrée des plugins"
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

<Tip>**Vous cherchez un guide pas à pas ?** Voir [Channel Plugins](/en/plugins/sdk-channel-plugins) ou [Provider Plugins](/en/plugins/sdk-provider-plugins) pour des guides détaillés.</Tip>

## `definePluginEntry`

**Importation :** `openclaw/plugin-sdk/plugin-entry`

Pour les plugins de provider, les plugins d'outil, les plugins de hook et tout ce qui n'est
**pas** un channel de messagerie.

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
- OpenClaw résout et mémorise ce schéma lors du premier accès, afin que les constructeurs de schémas coûteux ne s'exécutent qu'une seule fois.

## `defineChannelPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Enveloppe `definePluginEntry` avec un câblage spécifique au channel. Appelle automatiquement
`api.registerChannel({ plugin })`, expose une option de métadonnées CLI d'aide racine,
et conditionne `registerFull` selon le mode d'enregistrement.

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

- `setRuntime` est appelé lors de l'enregistrement afin que vous puissiez stocker la référence d'exécution
  (généralement via `createPluginRuntimeStore`). Il est ignoré lors de la capture
  des métadonnées CLI.
- `registerCliMetadata` s'exécute à la fois pendant `api.registrationMode === "cli-metadata"`
  et `api.registrationMode === "full"`.
  Utilisez-le comme l'emplacement canonique pour les descripteurs CLI appartenant au channel afin que l'aide racine
  reste non activante tandis que l'enregistrement normal des commandes CLI reste compatible
  avec les chargements complets de plugins.
- `registerFull` ne s'exécute que lorsque `api.registrationMode === "full"`. Il est ignoré
  lors du chargement en mode configuration uniquement.
- Comme `definePluginEntry`, `configSchema` peut être une fabrique différée et OpenClaw
  mémorise le schéma résolu lors du premier accès.
- Pour les commandes racine CLI appartenant au plugin, privilégiez `api.registerCli(..., { descriptors: [...] })`
  lorsque vous voulez que la commande reste chargée à la demande sans disparaître de l'arbre
  d'analyse CLI racine. Pour les plugins de channel, privilégiez l'enregistrement de ces descripteurs
  depuis `registerCliMetadata(...)` et gardez `registerFull(...)` concentré sur le travail d'exécution uniquement.
- Si `registerFull(...)` enregistre également des méthodes de passerelle RPC, gardez-les sur un
  préfixe spécifique au plugin. Les espaces de noms d'administration principale réservés (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) sont toujours forcés à
  `operator.admin`.

## `defineSetupPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Pour le fichier `setup-entry.ts` léger. Renvoie simplement `{ plugin }` sans
câblage d'exécution ou CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw charge ceci à la place de l'entrée complète lorsqu'un channel est désactivé,
non configuré, ou lorsque le chargement différé est activé. Voir
[Configuration et configuration](/en/plugins/sdk-setup#setup-entry) pour savoir quand cela est important.

En pratique, associez `defineSetupPluginEntry(...)` aux familles d'assistants de configuration
étroits :

- `openclaw/plugin-sdk/setup-runtime` pour les assistants de configuration sûrs pour l'exécution tels que
  les adaptateurs de correctifs de configuration sécurisés pour l'importation, la sortie de note de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries`, et les proxies de configuration délégués
- `openclaw/plugin-sdk/channel-setup` pour les surfaces de configuration en installation facultative
- `openclaw/plugin-sdk/setup-tools` pour les assistants de configuration/installation CLI/archive/docs

Gardez les SDK lourds, l'enregistrement CLI et les services d'exécution de longue durée dans l'entrée
complète.

Les canaux d'espace de travail regroupés qui séparent les surfaces de configuration et d'exécution peuvent utiliser
`defineBundledChannelSetupEntry(...)` de
`openclaw/plugin-sdk/channel-entry-contract` à la place. Ce contrat permet à
l'entrée de configuration de conserver des exportations de plugins/secrets sécurisés pour la configuration tout en exposant toujours un
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

Utilisez ce contrat regroupé uniquement lorsque les flux de configuration ont véritablement besoin d'un setter d'exécution léger
avant le chargement de l'entrée complète du canal.

## Mode d'enregistrement

`api.registrationMode` indique à votre plugin comment il a été chargé :

| Mode              | Quand                                             | Ce qu'il faut enregistrer                                                                                      |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `"full"`          | Démarrage normal de la passerelle                 | Tout                                                                                                           |
| `"setup-only"`    | Canal désactivé/non configuré                     | Enregistrement du canal uniquement                                                                             |
| `"setup-runtime"` | Flux de configuration avec l'exécution disponible | Enregistrement du canal plus uniquement l'exécution légère nécessaire avant le chargement de l'entrée complète |
| `"cli-metadata"`  | Aide racine / capture des métadonnées CLI         | Descripteurs CLI uniquement                                                                                    |

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

Traitez `"setup-runtime"` comme la fenêtre pendant laquelle les surfaces de démarrage de configuration uniquement doivent
exister sans réintroduire l'exécution complète du canal regroupé. Les bons choix sont
l'enregistrement du canal, les routes HTTP sécurisées pour la configuration, les méthodes de passerelle sécurisées pour la configuration et
les assistants de configuration délégués. Les services d'arrière-plan lourds, les enregistreurs CLI et
les amorçages de SDK fournisseur/client appartiennent toujours à `"full"`.

Pour les enregistreurs CLI spécifiquement :

- utilisez `descriptors` lorsque l'enregistreur possède une ou plusieurs commandes racines et que vous
  voulez que OpenClaw charge le module CLI réel de manière paresseuse lors de la première invocation
- assurez-vous que ces descripteurs couvrent chaque racine de commande de niveau supérieur exposée par le
  enregistreur
- utilisez `commands` seul uniquement pour les chemins de compatibilité eagres

## Formes de plugins

OpenClaw classe les plugins chargés selon leur comportement d'enregistrement :

| Forme                 | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| **plain-capability**  | Un type de capacité (par exemple, fournisseur uniquement)        |
| **hybrid-capability** | Plusieurs types de capacités (par exemple, fournisseur + parole) |
| **hook-only**         | Seulement des hooks, aucune capacité                             |
| **non-capability**    | Outils/commandes/services mais aucune capacité                   |

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin.

## Connexes

- [Aperçu du SDK](/en/plugins/sdk-overview) — API d'enregistrement et référence des sous-chemins
- [Assistants d'exécution](/en/plugins/sdk-runtime) — `api.runtime` et `createPluginRuntimeStore`
- [Configuration et installation](/en/plugins/sdk-setup) — manifeste, point d'entrée d'installation, chargement différé
- [Plugins de canal](/en/plugins/sdk-channel-plugins) — construction de l'objet `ChannelPlugin`
- [Plugins de fournisseur](/en/plugins/sdk-provider-plugins) — enregistrement de fournisseur et crochets
