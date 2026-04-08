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

<Tip>**Vous cherchez un guide pas à pas ?** Voir [Channel Plugins](/en/plugins/sdk-channel-plugins) ou [Provider Plugins](/en/plugins/sdk-provider-plugins) pour des guides étape par étape.</Tip>

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
- OpenClaw résout et mémorise ce schéma lors du premier accès, afin que les constructeurs de schémas coûteux ne s'exécutent qu'une seule fois.

## `defineChannelPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Enveloppe `definePluginEntry` avec un câblage spécifique au channel. Appelle automatiquement
`api.registerChannel({ plugin })`, expose une couture de métadonnées CLI d'aide racine facultative,
et verrouille `registerFull` sur le mode d'enregistrement.

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

- `setRuntime` est appelé lors de l'enregistrement afin que vous puissiez stocker la référence du runtime
  (généralement via `createPluginRuntimeStore`). Elle est ignorée lors de la capture
  des métadonnées CLI.
- `registerCliMetadata` s'exécute à la fois pendant `api.registrationMode === "cli-metadata"`
  et `api.registrationMode === "full"`.
  Utilisez-le comme l'emplacement canonique pour les descripteurs CLI détenus par le channel afin que l'aide racine
  reste non activante tandis que l'enregistrement normal des commandes CLI reste compatible
  avec les chargements complets de plugins.
- `registerFull` ne s'exécute que lorsque `api.registrationMode === "full"`. Elle est ignorée
  lors du chargement en mode configuration uniquement.
- Comme `definePluginEntry`, `configSchema` peut être une fabrique paresseuse et OpenClaw
  mémoïse le schéma résolu lors du premier accès.
- Pour les commandes racine CLI appartenant au plugin, préférez `api.registerCli(..., { descriptors: [...] })`
  lorsque vous souhaitez que la commande reste chargée à la demande sans disparaître de
  l'arbre d'analyse du CLI racine. Pour les plugins de canal, préférez l'enregistrement de ces descripteurs
  depuis `registerCliMetadata(...)` et gardez `registerFull(...)` concentré sur le travail exclusivement lié à l'exécution.
- Si `registerFull(...)` enregistre également des méthodes de passerelle RPC, gardez-les sur un
  préfixe spécifique au plugin. Les espaces de noms d'administration principaux réservés (`config.*`,
  `exec.approvals.*`, `wizard.*`, `update.*`) sont toujours forcés à
  `operator.admin`.

## `defineSetupPluginEntry`

**Importation :** `openclaw/plugin-sdk/channel-core`

Pour le fichier `setup-entry.ts` léger. Renvoie uniquement `{ plugin }` sans
câblage d'exécution ou de CLI.

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

OpenClaw charge ceci au lieu de l'entrée complète lorsqu'un canal est désactivé,
non configuré, ou lorsque le chargement différé est activé. Voir
[Configuration et installation](/en/plugins/sdk-setup#setup-entry) pour savoir quand cela est important.

En pratique, associez `defineSetupPluginEntry(...)` aux familles d'assistants de configuration
étroits :

- `openclaw/plugin-sdk/setup-runtime` pour les assistants de configuration sûrs pour l'exécution, tels que
  les adaptateurs de correctifs de configuration sécurisés pour l'importation, la sortie de note de recherche,
  `promptResolvedAllowFrom`, `splitSetupEntries`, et les proxys de configuration délégués
- `openclaw/plugin-sdk/channel-setup` pour les surfaces de configuration d'installation facultative
- `openclaw/plugin-sdk/setup-tools` pour les assistants de configuration/installation/CLI/archive/docs

Gardez les SDK lourds, l'enregistrement CLI et les services d'exécution de longue durée dans l'entrée
complète.

## Mode d'enregistrement

`api.registrationMode` indique à votre plugin comment il a été chargé :

| Mode              | Quand                                             | Ce qu'il faut enregistrer                                                                                      |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `"full"`          | Démarrage normal de la passerelle                 | Tout                                                                                                           |
| `"setup-only"`    | Canal désactivé/non configuré                     | Enregistrement du canal uniquement                                                                             |
| `"setup-runtime"` | Flux de configuration avec l'exécution disponible | Enregistrement du canal plus uniquement l'exécution légère nécessaire avant le chargement de l'entrée complète |
| `"cli-metadata"`  | Aide racine / capture des métadonnées CLI         | Descripteurs CLI uniquement                                                                                    |

`defineChannelPluginEntry` gère cette division automatiquement. Si vous utilisez
`definePluginEntry` directement pour un channel, vérifiez vous-même le mode :

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

Considérez `"setup-runtime"` comme la fenêtre durant laquelle les surfaces de démarrage setup-only doivent
exister sans ré-entrer dans le runtime complet du channel groupé. Les cas d'usage appropriés sont
l'enregistrement de channel, les routes HTTP setup-safe, les méthodes de passerelle setup-safe, et
les assistants de configuration délégués. Les services d'arrière-plan lourds, les enregistreurs CLI, et
les amorçages SDK provider/client appartiennent toujours à `"full"`.

Pour les enregistreurs CLI spécifiquement :

- utilisez `descriptors` lorsque l'enregistreur possède une ou plusieurs commandes racines et que vous
  souhaitez que OpenClaw charge le module CLI réel de manière paresseuse lors de la première invocation
- assurez-vous que ces descripteurs couvrent chaque racine de commande de premier niveau exposée par
  l'enregistreur
- utilisez `commands` seul uniquement pour les chemins de compatibilité eager

## Formes de plugins

OpenClaw classe les plugins chargés selon leur comportement d'enregistrement :

| Forme                 | Description                                          |
| --------------------- | ---------------------------------------------------- |
| **plain-capability**  | Un seul type de capacité (ex. provider uniquement)   |
| **hybrid-capability** | Types de capacités multiples (ex. provider + parole) |
| **hook-only**         | Seulement des hooks, aucune capacité                 |
| **non-capability**    | Outils/commandes/services mais aucune capacité       |

Utilisez `openclaw plugins inspect <id>` pour voir la forme d'un plugin.

## Connexes

- [Aperçu du SDK](/en/plugins/sdk-overview) — API d'enregistrement et référence de sous-chemin
- [Assistants d'exécution](/en/plugins/sdk-runtime) — `api.runtime` et `createPluginRuntimeStore`
- [Configuration et installation](/en/plugins/sdk-setup) — manifeste, entrée de configuration, chargement différé
- [Plugins de channel](/en/plugins/sdk-channel-plugins) — construction de l'objet `ChannelPlugin`
- [Plugins de fournisseur](/en/plugins/sdk-provider-plugins) — enregistrement de fournisseur et hooks
