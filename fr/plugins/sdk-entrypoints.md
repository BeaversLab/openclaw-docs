---
title: "Points d'entrée des plugins"
sidebarTitle: "Points d'entrée"
summary: "Référence pour definePluginEntry, defineChannelPluginEntry et defineSetupPluginEntry"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup)
  - You are looking up entry point options
---

# Points d'entrée des plugins

Chaque plugin exporte un objet d'entrée par défaut. Le SDK fournit trois assistants pour
les créer.

<Tip>
  **Vous cherchez un guide pas à pas ?** Consultez [Plugins de
  channel](/fr/plugins/sdk-channel-plugins) ou [Plugins de
  provider](/fr/plugins/sdk-provider-plugins) pour des guides détaillés.
</Tip>

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
`api.registerChannel({ plugin })` et conditionne `registerFull` au mode d'enregistrement.

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerFull(api) {
    api.registerCli(/* ... */);
    api.registerGatewayMethod(/* ... */);
  },
});
```

| Champ          | Type                                                             | Obligatoire | Par défaut          |
| -------------- | ---------------------------------------------------------------- | ----------- | ------------------- |
| `id`           | `string`                                                         | Oui         | —                   |
| `name`         | `string`                                                         | Oui         | —                   |
| `description`  | `string`                                                         | Oui         | —                   |
| `plugin`       | `ChannelPlugin`                                                  | Oui         | —                   |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | Non         | Schéma d'objet vide |
| `setRuntime`   | `(runtime: PluginRuntime) => void`                               | Non         | —                   |
| `registerFull` | `(api: OpenClawPluginApi) => void`                               | Non         | —                   |

- `setRuntime` est appelé lors de l'enregistrement afin que vous puissiez stocker la référence du runtime
  (généralement via `createPluginRuntimeStore`).
- `registerFull` ne s'exécute que lorsque `api.registrationMode === "full"`. Il est ignoré
  lors du chargement en mode configuration uniquement.

## `defineSetupPluginEntry`

**Importation :** `openclaw/plugin-sdk/core`

Pour le fichier `setup-entry.ts` léger. Renvoie uniquement `{ plugin }` sans
runtime ni connexion CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw charge ceci à la place de l'entrée complète lorsqu'un canal est désactivé,
non configuré, ou lorsque le chargement différé est activé. Voir
[Setup and Config](/fr/plugins/sdk-setup#setup-entry) pour savoir quand cela est important.

## Mode d'enregistrement

`api.registrationMode` indique à votre plugin comment il a été chargé :

| Mode              | Quand                                         | Ce qu'il faut enregistrer          |
| ----------------- | --------------------------------------------- | ---------------------------------- |
| `"full"`          | Démarrage normal de la passerelle             | Tout                               |
| `"setup-only"`    | Canal désactivé/non configuré                 | Enregistrement du canal uniquement |
| `"setup-runtime"` | Flux de configuration avec runtime disponible | Canal + runtime léger              |

`defineChannelPluginEntry` gère cette division automatiquement. Si vous utilisez
`definePluginEntry` directement pour un canal, vérifiez le mode vous-même :

```typescript
register(api) {
  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerCli(/* ... */);
  api.registerService(/* ... */);
}
```

## Formes de plugins

OpenClaw classifie les plugins chargés selon leur comportement d'enregistrement :

| Forme                 | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| **plain-capability**  | Un type de capacité (ex. fournisseur uniquement)                 |
| **hybrid-capability** | Types de capacités multiples (ex. fournisseur + synthèse vocale) |
| **hook-only**         | Seulement des hooks, aucune capacité                             |
| **non-capability**    | Outils/commandes/services mais aucune capacité                   |

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin.

## Connexes

- [SDK Overview](/fr/plugins/sdk-overview) — API d'enregistrement et référence des sous-chemins
- [Runtime Helpers](/fr/plugins/sdk-runtime) — `api.runtime` et `createPluginRuntimeStore`
- [Setup and Config](/fr/plugins/sdk-setup) — manifeste, entrée de configuration, chargement différé
- [Plugins de canal](/fr/plugins/sdk-channel-plugins) — construction de l'objet `ChannelPlugin`
- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) — enregistrement et hooks du fournisseur

import fr from "/components/footer/fr.mdx";

<fr />
