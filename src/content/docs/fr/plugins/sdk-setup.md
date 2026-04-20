---
title: "Configuration et configuration du plugin"
sidebarTitle: "Configuration et config"
summary: "Assistants de configuration, setup-entry.ts, schémas de configuration et métadonnées package."
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# Configuration et configuration du plugin

Référence pour le conditionnement des plugins (métadonnées `package.json`), les manifestes
(`openclaw.plugin.json`), les entrées de configuration et les schémas de configuration.

<Tip>**Vous cherchez un guide pas à pas ?** Les guides pratiques couvrent le packaging en contexte : [Plugins de canaux](/en/plugins/sdk-channel-plugins#step-1-package-and-manifest) et [Plugins de fournisseurs](/en/plugins/sdk-provider-plugins#step-1-package-and-manifest).</Tip>

## Métadonnées du package

Votre `package.json` a besoin d'un champ `openclaw` qui indique au système de plugins ce
que votre plugin fournit :

**Plugin de canal :**

```json
{
  "name": "@myorg/openclaw-my-channel",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "blurb": "Short description of the channel."
    }
  }
}
```

**Plugin de fournisseur / ligne de base de publication ClawHub :**

```json openclaw-clawhub-package.json
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

Si vous publiez le plugin en externe sur ClawHub, ces champs `compat` et `build`
sont requis. Les extraits de publication canoniques se trouvent dans
`docs/snippets/plugin-publish/`.

### Champs `openclaw`

| Champ        | Type       | Description                                                                                                        |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `extensions` | `string[]` | Fichiers de point d'entrée (relatifs à la racine du package)                                                       |
| `setupEntry` | `string`   | Point d'entrée léger uniquement pour la configuration (optionnel)                                                  |
| `channel`    | `object`   | Métadonnées du catalogue de canaux pour la configuration, le sélecteur, le démarrage rapide et les surfaces d'état |
| `providers`  | `string[]` | Identifiants de fournisseur enregistrés par ce plugin                                                              |
| `install`    | `object`   | Indices d'installation : `npmSpec`, `localPath`, `defaultChoice`, `minHostVersion`, `allowInvalidConfigRecovery`   |
| `startup`    | `object`   | Indicateurs de comportement au démarrage                                                                           |

### `openclaw.channel`

`openclaw.channel` sont des métadonnées de package légères pour la découverte de canaux et les surfaces de configuration
avant le chargement de l'exécution.

| Champ                                  | Type       | Signification                                                                                                          |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`                                   | `string`   | Identifiant canonique du canal.                                                                                        |
| `label`                                | `string`   | Étiquette principale du canal.                                                                                         |
| `selectionLabel`                       | `string`   | Libellé du sélecteur/de la configuration lorsqu'il doit différer de `label`.                                           |
| `detailLabel`                          | `string`   | Libellé de détail secondaire pour les catalogues de canaux et les surfaces d'état plus riches.                         |
| `docsPath`                             | `string`   | Chemin de documentation pour les liens de configuration et de sélection.                                               |
| `docsLabel`                            | `string`   | Remplacer le libellé utilisé pour les liens de documentation lorsqu'il doit différer de l'identifiant du canal.        |
| `blurb`                                | `string`   | Courte description d'intégration/de catalogue.                                                                         |
| `order`                                | `number`   | Ordre de tri dans les catalogues de canaux.                                                                            |
| `aliases`                              | `string[]` | Alias de recherche supplémentaires pour la sélection de canal.                                                         |
| `preferOver`                           | `string[]` | Identifiants de plugin/canal de priorité inférieure que ce canal devrait surpasser.                                    |
| `systemImage`                          | `string`   | Nom d'icône/d'image système optionnel pour les catalogues d'interface de canal.                                        |
| `selectionDocsPrefix`                  | `string`   | Texte de préfixe avant les liens de documentation dans les surfaces de sélection.                                      |
| `selectionDocsOmitLabel`               | `boolean`  | Afficher directement le chemin de documentation au lieu d'un lien de documentation libellé dans la copie de sélection. |
| `selectionExtras`                      | `string[]` | Courtes chaînes supplémentaires ajoutées dans la copie de sélection.                                                   |
| `markdownCapable`                      | `boolean`  | Marque le canal comme prenant en charge le markdown pour les décisions de formatage sortant.                           |
| `exposure`                             | `object`   | Contrôles de visibilité du canal pour la configuration, les listes configurées et les surfaces de documentation.       |
| `quickstartAllowFrom`                  | `boolean`  | Inclure ce canal dans le flux de configuration standard de démarrage rapide `allowFrom`.                               |
| `forceAccountBinding`                  | `boolean`  | Exiger une liaison de compte explicite même lorsqu'un seul compte existe.                                              |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | Préférer la recherche de session lors de la résolution des cibles d'annonce pour ce canal.                             |

Exemple :

```json
{
  "openclaw": {
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (self-hosted)",
      "detailLabel": "My Channel Bot",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Webhook-based self-hosted chat integration.",
      "order": 80,
      "aliases": ["mc"],
      "preferOver": ["my-channel-legacy"],
      "selectionDocsPrefix": "Guide:",
      "selectionExtras": ["Markdown"],
      "markdownCapable": true,
      "exposure": {
        "configured": true,
        "setup": true,
        "docs": true
      },
      "quickstartAllowFrom": true
    }
  }
}
```

`exposure` prend en charge :

- `configured` : inclure le channel dans les surfaces de listing de style configuré/état
- `setup` : inclure le channel dans les sélecteurs de configuration/installation interactifs
- `docs` : marquer le channel comme public dans les surfaces de documentation/navigation

`showConfigured` et `showInSetup` restent pris en charge en tant qu'alias hérités. Préférez
`exposure`.

### `openclaw.install`

`openclaw.install` est une métadonnée de package, pas une métadonnée de manifeste.

| Champ                        | Type                 | Signification                                                                                                    |
| ---------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npmSpec`                    | `string`             | Spécification npm canonique pour les flux d'installation/de mise à jour.                                         |
| `localPath`                  | `string`             | Chemin d'installation pour le développement local ou groupé.                                                     |
| `defaultChoice`              | `"npm"` \| `"local"` | Source d'installation préférée lorsque les deux sont disponibles.                                                |
| `minHostVersion`             | `string`             | Version minimale prise en charge de OpenClaw sous la forme `>=x.y.z`.                                            |
| `allowInvalidConfigRecovery` | `boolean`            | Permet aux flux de réinstallation de plugins groupés de récupérer de certaines pannes de configuration obsolète. |

Si `minHostVersion` est défini, l'installation et le chargement du registre de manifestes l'appliquent
tous les deux. Les hôtes plus anciens ignorent le plugin ; les chaînes de version invalides sont rejetées.

`allowInvalidConfigRecovery` n'est pas une contournement général pour les configurations cassées. Il est
uniquement pour une récupération étroite de plugin groupé, afin que la réinstallation/configuration puisse réparer des
déchets connus de mise à niveau comme un chemin de plugin groupé manquant ou une entrée `channels.<id>`
périmée pour ce même plugin. Si la configuration est cassée pour des raisons sans rapport, l'installation
échoue toujours de manière fermée et indique à l'opérateur d'exécuter `openclaw doctor --fix`.

### Chargement complet différé

Les plugins de channel peuvent opter pour un chargement différé avec :

```json
{
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

Lorsqu'il est activé, OpenClaw charge uniquement `setupEntry` pendant la phase de démarrage
préalable à l'écoute, même pour les channels déjà configurés. L'entrée complète se charge après
que la passerelle a commencé à écouter.

<Warning>N'activez le chargement différé que lorsque votre `setupEntry` enregistre tout ce dont la passerelle a besoin avant de commencer à écouter (enregistrement de canal, routes HTTP, méthodes de passerelle). Si l'entrée complète possède des capacités de démarrage requises, conservez le comportement par défaut.</Warning>

Si votre entrée de configuration/complète enregistre des méthodes RPC de passerelle, gardez-les sur un
préfixe spécifique au plugin. Les espaces de noms admin principaux réservés (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) restent la propriété du cœur et résolvent toujours
vers `operator.admin`.

## Manifeste du plugin

Chaque plugin natif doit inclure un `openclaw.plugin.json` à la racine du package.
OpenClaw l'utilise pour valider la configuration sans exécuter le code du plugin.

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Adds My Plugin capabilities to OpenClaw",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookSecret": {
        "type": "string",
        "description": "Webhook verification secret"
      }
    }
  }
}
```

Pour les plugins de canal, ajoutez `kind` et `channels` :

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

Même les plugins sans configuration doivent fournir un schéma. Un schéma vide est valide :

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

Voir [Plugin Manifest](/en/plugins/manifest) pour la référence complète du schéma.

## Publication sur ClawHub

Pour les packages de plugins, utilisez la commande spécifique au package ClawHub :

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

L'alias de publication hérité réservé aux compétences (skills) est destiné aux compétences. Les packages de plugins doivent
toujours utiliser `clawhub package publish`.

## Entrée de configuration

Le fichier `setup-entry.ts` est une alternative légère à `index.ts` que
OpenClaw charge lorsqu'il n'a besoin que des surfaces de configuration (onboarding, réparation de la configuration,
inspection de canal désactivé).

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

Cela évite de charger du code d'exécution lourd (bibliothèques de cryptographie, enregistrements CLI,
services d'arrière-plan) lors des flux de configuration.

Les canaux d'espace de travail regroupés qui conservent des exportations sûres pour la configuration dans des modules sidecar peuvent
utiliser `defineBundledChannelSetupEntry(...)` depuis
`openclaw/plugin-sdk/channel-entry-contract` au lieu de
`defineSetupPluginEntry(...)`. Ce contrat regroupé prend également en charge une exportation
`runtime` facultative afin que le câblage d'exécution au moment de la configuration puisse rester léger et explicite.

**Lorsque OpenClaw utilise `setupEntry` au lieu de l'entrée complète :**

- Le canal est désactivé mais nécessite des surfaces de configuration/onboarding
- Le canal est activé mais non configuré
- Le chargement différé est activé (`deferConfiguredChannelFullLoadUntilAfterListen`)

**Ce que `setupEntry` doit enregistrer :**

- L'objet du plugin de canal (via `defineSetupPluginEntry`)
- Toutes les routes HTTP requises avant l'écoute de la passerelle
- Toutes les méthodes de passerelle nécessaires lors du démarrage

Ces méthodes de passerelle de démarrage doivent toujours éviter les espaces de noms d'administration principale réservés tels que
`config.*` ou `update.*`.

**Ce que `setupEntry` ne doit PAS inclure :**

- Enregistrements CLI
- Services d'arrière-plan
- Importations d'exécution lourdes (crypto, SDK)
- Méthodes Gateway nécessaires uniquement après le démarrage

### Importations étroites d'aides à la configuration

Pour les chemins d'accès chauds réservés uniquement à la configuration, privilégiez les interfaces étroites d'aides à la configuration par rapport au parapluie plus large
`plugin-sdk/setup` lorsque vous n'avez besoin que d'une partie de la surface de configuration :

| Chemin d'importation               | Utilisez-le pour                                                                                                         | Exportations clés                                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | aides à l'exécution au moment de la configuration qui restent disponibles dans `setupEntry` / démarrage différé du canal | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | adaptateurs de configuration de compte conscients de l'environnement                                                     | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                        |
| `plugin-sdk/setup-tools`           | assistants d'installation/de configuration/CLI/archive/docs                                                              | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                |

Utilisez la couture `plugin-sdk/setup` plus large lorsque vous souhaitez la boîte à outils d'installation partagée complète, y compris les assistants de correctifs de configuration tels que `moveSingleAccountChannelSectionToDefaultAccount(...)`.

Les adaptateurs de correctifs d'installation restent sûrs pour le chemin critique lors de l'importation. Leur recherche de surface de contrat de promotion à compte unique groupée est paresseuse, donc l'importation de `plugin-sdk/setup-runtime` ne charge pas eagèrement la découverte de surface de contrat groupée avant que l'adaptateur ne soit réellement utilisé.

### Promotion à compte unique détenue par le channel

Lorsqu'un channel passe d'une configuration de premier niveau à compte unique à `channels.<id>.accounts.*`, le comportement partagé par défaut consiste à déplacer les valeurs promues délimitées au compte dans `accounts.default`.

Les channels groupés peuvent restreindre ou remplacer cette promotion via leur surface de contrat d'installation :

- `singleAccountKeysToMove` : clés supplémentaires de premier niveau qui doivent être déplacées dans le compte promu
- `namedAccountPromotionKeys` : lorsque des comptes nommés existent déjà, seules ces clés sont déplacées dans le compte promu ; les clés de stratégie/livraison partagées restent à la racine du channel
- `resolveSingleAccountPromotionTarget(...)` : choisir quel compte existant reçoit les valeurs promues

Matrix est l'exemple groupé actuel. Si exactement un compte nommé Matrix existe déjà, ou si `defaultAccount` pointe vers une clé non canonique existante telle que `Ops`, la promotion préserve ce compte au lieu de créer une nouvelle entrée `accounts.default`.

## Schéma de configuration

La configuration du plugin est validée par rapport au schéma JSON de votre manifeste. Les utilisateurs configurent les plugins via :

```json5
{
  plugins: {
    entries: {
      "my-plugin": {
        config: {
          webhookSecret: "abc123",
        },
      },
    },
  },
}
```

Votre plugin reçoit cette configuration sous forme de `api.pluginConfig` lors de l'enregistrement.

Pour une configuration spécifique au channel, utilisez plutôt la section de configuration du channel :

```json5
{
  channels: {
    "my-channel": {
      token: "bot-token",
      allowFrom: ["user1", "user2"],
    },
  },
}
```

### Création de schémas de configuration de channel

Utilisez `buildChannelConfigSchema` de `openclaw/plugin-sdk/core` pour convertir un schéma Zod dans l'enveloppe `ChannelConfigSchema` que OpenClaw valide :

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/core";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

## Assistants d'installation

Les plugins de channel peuvent fournir des assistants de configuration interactifs pour `openclaw onboard`.
L'assistant est un objet `ChannelSetupWizard` sur le `ChannelPlugin` :

```typescript
import type { ChannelSetupWizard } from "openclaw/plugin-sdk/channel-setup";

const setupWizard: ChannelSetupWizard = {
  channel: "my-channel",
  status: {
    configuredLabel: "Connected",
    unconfiguredLabel: "Not configured",
    resolveConfigured: ({ cfg }) => Boolean((cfg.channels as any)?.["my-channel"]?.token),
  },
  credentials: [
    {
      inputKey: "token",
      providerHint: "my-channel",
      credentialLabel: "Bot token",
      preferredEnvVar: "MY_CHANNEL_BOT_TOKEN",
      envPrompt: "Use MY_CHANNEL_BOT_TOKEN from environment?",
      keepPrompt: "Keep current token?",
      inputPrompt: "Enter your bot token:",
      inspect: ({ cfg, accountId }) => {
        const token = (cfg.channels as any)?.["my-channel"]?.token;
        return {
          accountConfigured: Boolean(token),
          hasConfiguredValue: Boolean(token),
        };
      },
    },
  ],
};
```

Le type `ChannelSetupWizard` prend en charge `credentials`, `textInputs`,
`dmPolicy`, `allowFrom`, `groupAccess`, `prepare`, `finalize`, et plus encore.
Voir les packages de plugins inclus (par exemple le plugin Discord `src/channel.setup.ts`) pour
des exemples complets.

Pour les invites de liste d'autorisation DM qui nécessitent uniquement le flux standard
`note -> prompt -> parse -> merge -> patch`, préférez les assistants de configuration partagés
de `openclaw/plugin-sdk/setup` : `createPromptParsedAllowFromForAccount(...)`,
`createTopLevelChannelParsedAllowFromPrompt(...)`, et
`createNestedChannelParsedAllowFromPrompt(...)`.

Pour les blocs de statut de configuration de channel qui ne varient que par les étiquettes, les scores et les lignes supplémentaires facultatives,
préférez `createStandardChannelSetupStatus(...)` issu de
`openclaw/plugin-sdk/setup` plutôt que de recréer manuellement le même objet `status` dans
chaque plugin.

Pour les surfaces de configuration facultatives qui ne doivent apparaître que dans certains contextes, utilisez
`createOptionalChannelSetupSurface` de `openclaw/plugin-sdk/channel-setup` :

```typescript
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";

const setupSurface = createOptionalChannelSetupSurface({
  channel: "my-channel",
  label: "My Channel",
  npmSpec: "@myorg/openclaw-my-channel",
  docsPath: "/channels/my-channel",
});
// Returns { setupAdapter, setupWizard }
```

`plugin-sdk/channel-setup` expose également les constructeurs de plus bas niveau
`createOptionalChannelSetupAdapter(...)` et
`createOptionalChannelSetupWizard(...)` lorsque vous n'avez besoin que d'une seule moitié de
cette surface d'installation facultative.

L'adaptateur/assistant facultatif généré échoue de manière fermée lors des écritures de configuration réelles. Ils
réutilisent un seul message d'installation requise sur `validateInput`,
`applyAccountConfig` et `finalize`, et ajoutent un lien vers la documentation lorsque `docsPath` est
défini.

Pour les interfaces utilisateur de configuration basées sur des binaires, préférez les assistants délégués partagés plutôt que de
copier la même colle binaire/statut dans chaque channel :

- `createDetectedBinaryStatus(...)` pour les blocs de statut qui ne varient que par les étiquettes,
  les indices, les scores et la détection de binaire
- `createCliPathTextInput(...)` pour les entrées texte basées sur un chemin
- `createDelegatedSetupWizardStatusResolvers(...)`,
  `createDelegatedPrepare(...)`, `createDelegatedFinalize(...)` et
  `createDelegatedResolveConfigured(...)` lorsque `setupEntry` doit transmettre à
  un assistant complet plus volumineux de manière paresseuse
- `createDelegatedTextInputShouldPrompt(...)` lorsque `setupEntry` a seulement besoin de
  déléguer une décision `textInputs[*].shouldPrompt`

## Publication et installation

**Plugins externes :** publiez sur [ClawHub](/en/tools/clawhub) ou npm, puis installez :

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw essaie d'abord ClawHub et revient automatiquement à npm. Vous pouvez également
forcer explicitement ClawHub :

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
```

Il n'y a pas de remplacement `npm:` correspondant. Utilisez la spécification de package npm normale lorsque vous
voulez le chemin npm après le repli sur ClawHub :

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

**Plugins dans le dépôt :** placez-les sous l'arborescence de l'espace de travail du plugin groupé et ils seront automatiquement
découverts lors de la construction.

**Les utilisateurs peuvent installer :**

```bash
openclaw plugins install <package-name>
```

<Info>Pour les installations issues de npm, `openclaw plugins install` exécute `npm install --ignore-scripts` (pas de scripts de cycle de vie). Gardez les arbres de dépendances des plugins en JS/TS pur et évitez les packages qui nécessitent des builds `postinstall`.</Info>

## Connexes

- [Points d'entrée du SDK](/en/plugins/sdk-entrypoints) -- `definePluginEntry` et `defineChannelPluginEntry`
- [Manifeste de plugin](/en/plugins/manifest) -- référence complète du schéma de manifeste
- [Création de plugins](/en/plugins/building-plugins) -- guide de démarrage pas à pas
