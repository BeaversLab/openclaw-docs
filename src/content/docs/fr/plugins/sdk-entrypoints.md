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

<Tip>**Vous cherchez un didacticiel ?** Voir [Channel Plugins](/en/plugins/sdk-channel-plugins) ou [Provider Plugins](/en/plugins/sdk-provider-plugins) pour des guides étape par étape.</Tip>

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
- `configSchema` peut être une fonction pour une évaluation différée.

## `defineChannelPluginEntry`

**Importation :** `openclaw/plugin-sdk/core`

Encapsule `definePluginEntry` avec un câblage spécifique au channel. Appelle automatiquement
`api.registerChannel({ plugin })`, expose une couture (seam) de métadonnées CLI d'aide racine facultative,
et conditionne `registerFull` au mode d'enregistrement.

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

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
  Utilisez-le comme l'emplacement canonique pour les descripteurs CLI détenus par le channel afin que l'aide racine
  reste non activante pendant que l'enregistrement normal des commandes CLI reste compatible
  avec les chargements complets de plugins.
- `registerFull` ne s'exécute que lors de `api.registrationMode === "full"`. Il est ignoré
  lors du chargement en mode configuration uniquement.
- Pour les commandes CLI racines détenues par le plugin, privilégiez `api.registerCli(..., { descriptors: [...] })`
  lorsque vous souhaitez que la commande reste chargée à la demande sans disparaître de l'arbre
  d'analyse CLI racine. Pour les plugins de channel, privilégiez l'enregistrement de ces descripteurs
  depuis `registerCliMetadata(...)` et gardez `registerFull(...)` concentré sur le travail d'exécution uniquement.

## `defineSetupPluginEntry`

**Import :** `openclaw/plugin-sdk/core`

Pour le fichier `setup-entry.ts` léger. Renvoie simplement `{ plugin }` sans
câblage d'exécution ou CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw charge ceci à la place de l'entrée complète lorsqu'un channel est désactivé,
non configuré, ou lorsque le chargement différé est activé. Voir
[Setup and Config](/en/plugins/sdk-setup#setup-entry) pour savoir quand cela est important.

## Mode d'enregistrement

`api.registrationMode` indique à votre plugin comment il a été chargé :

| Mode              | Quand                                         | Ce qu'il faut enregistrer            |
| ----------------- | --------------------------------------------- | ------------------------------------ |
| `"full"`          | Démarrage normal de la passerelle             | Tout                                 |
| `"setup-only"`    | Channel désactivé/non configuré               | Enregistrement du channel uniquement |
| `"setup-runtime"` | Flux de configuration avec runtime disponible | Channel + runtime léger              |
| `"cli-metadata"`  | Aide racine / capture des métadonnées CLI     | Descripteurs CLI uniquement          |

`defineChannelPluginEntry` gère cette division automatiquement. Si vous utilisez
`definePluginEntry` directement pour un channel, vérifiez le mode vous-même :

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

Pour les registres CLI spécifiquement :

- utilisez `descriptors` lorsque le registre possède une ou plusieurs commandes racines et que vous
  voulez qu'OpenClaw charge à la demande le vrai module CLI lors de la première invocation
- assurez-vous que ces descripteurs couvrent chaque racine de commande de premier niveau exposée par le
  registre
- utilisez `commands` seul uniquement pour les chemins de compatibilité impatients

## Formes de plugin

OpenClaw classe les plugins chargés selon leur comportement d'enregistrement :

| Forme                 | Description                                             |
| --------------------- | ------------------------------------------------------- |
| **plain-capability**  | Un type de capacité (ex. fournisseur uniquement)        |
| **hybrid-capability** | Types de capacités multiples (ex. fournisseur + parole) |
| **hook-only**         | Seulement des hooks, aucune capacité                    |
| **non-capability**    | Outils/commandes/services mais aucune capacité          |

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin.

## Connexes

- [Aperçu du SDK](/en/plugins/sdk-overview) — référence de l'API d'enregistrement et des sous-chemins
- [Assistants de runtime](/en/plugins/sdk-runtime) — `api.runtime` et `createPluginRuntimeStore`
- [Configuration et installation](/en/plugins/sdk-setup) — manifeste, entrée de configuration, chargement différé
- [Plugins Channel](/en/plugins/sdk-channel-plugins) — construction de l'objet `ChannelPlugin`
- [Plugins Provider](/en/plugins/sdk-provider-plugins) — enregistrement de fournisseur et hooks
