---
summary: "Assistants de configuration, setup-entry.ts, schémas de configuration et métadonnées package."
title: "Configuration et configuration du plugin"
sidebarTitle: "Configuration et config"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

Référence pour le conditionnement des plugins (métadonnées `package.json`), les manifestes (`openclaw.plugin.json`), les entrées de configuration et les schémas de configuration.

<Tip>**Vous cherchez un guide pas à pas ?** Les guides pratiques couvrent le packaging en contexte : [Plugins de canal](/fr/plugins/sdk-channel-plugins#step-1-package-and-manifest) et [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins#step-1-package-and-manifest).</Tip>

## Métadonnées du package

Votre `package.json` a besoin d'un champ `openclaw` qui indique au système de plugins ce que votre plugin fournit :

<Tabs>
  <Tab title="Plugin de canal">
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
  </Tab>
  <Tab title="Plugin de fournisseur / base de référence ClawHub">
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
  </Tab>
</Tabs>

<Note>Si vous publiez le plugin en externe sur ClawHub, ces champs `compat` et `build` sont requis. Les extraits de publication canoniques se trouvent dans `docs/snippets/plugin-publish/`.</Note>

### Champs `openclaw`

<ParamField path="extensions" type="string[]">
  Fichiers de point d'entrée (relatifs à la racine du package).
</ParamField>
<ParamField path="setupEntry" type="string">
  Point d'entrée léger pour la configuration uniquement (facultatif).
</ParamField>
<ParamField path="channel" type="object">
  Métadonnées du catalogue de channels pour la configuration, le sélecteur, le démarrage rapide et les surfaces d'état.
</ParamField>
<ParamField path="providers" type="string[]">
  IDs de fournisseurs enregistrés par ce plugin.
</ParamField>
<ParamField path="install" type="object">
  Indices d'installation : `npmSpec`, `localPath`, `defaultChoice`, `minHostVersion`, `expectedIntegrity`, `allowInvalidConfigRecovery`.
</ParamField>
<ParamField path="startup" type="object">
  Indicateurs de comportement de démarrage.
</ParamField>

### `openclaw.channel`

`openclaw.channel` sont des métadonnées de package légères pour la découverte de channels et les surfaces de configuration avant le chargement de l'exécution.

| Champ                                  | Type       | Signification                                                                                                      |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`                                   | `string`   | Identifiant canonique du channel.                                                                                  |
| `label`                                | `string`   | Libellé principal du channel.                                                                                      |
| `selectionLabel`                       | `string`   | Libellé du sélecteur/configuration lorsqu'il doit différer de `label`.                                             |
| `detailLabel`                          | `string`   | Libellé de détail secondaire pour les catalogues de channels et les surfaces d'état plus riches.                   |
| `docsPath`                             | `string`   | Chemin de documentation pour la configuration et les liens de sélection.                                           |
| `docsLabel`                            | `string`   | Remplacer le libellé utilisé pour les liens de documentation lorsqu'il doit différer de l'identifiant du channel.  |
| `blurb`                                | `string`   | Courte description d'intégration/catalogue.                                                                        |
| `order`                                | `number`   | Ordre de tri dans les catalogues de channels.                                                                      |
| `aliases`                              | `string[]` | Alias de recherche supplémentaires pour la sélection du channel.                                                   |
| `preferOver`                           | `string[]` | Identifiants de plugin/channel de priorité inférieure que ce channel doit surpasser.                               |
| `systemImage`                          | `string`   | Nom d'icône/d'image système facultatif pour les catalogues d'interface utilisateur du channel.                     |
| `selectionDocsPrefix`                  | `string`   | Texte de préfixe avant les liens vers la documentation dans les surfaces de sélection.                             |
| `selectionDocsOmitLabel`               | `boolean`  | Afficher directement le chemin de la documentation au lieu d'un lien étiqueté dans la copie de sélection.          |
| `selectionExtras`                      | `string[]` | Courtes chaînes supplémentaires ajoutées dans la copie de sélection.                                               |
| `markdownCapable`                      | `boolean`  | Marque le channel comme compatible Markdown pour les décisions de formatage sortant.                               |
| `exposure`                             | `object`   | Contrôles de visibilité du channel pour la configuration, les listes configurées et les surfaces de documentation. |
| `quickstartAllowFrom`                  | `boolean`  | Opter ce canal pour le flux de configuration de démarrage rapide standard `allowFrom`.                             |
| `forceAccountBinding`                  | `boolean`  | Exiger une liaison de compte explicite même lorsqu'un seul compte existe.                                          |
| `preferSessionLookupForAnnounceTarget` | `boolean`  | Préférer la recherche de session lors de la résolution des cibles d'annonce pour ce channel.                       |

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

- `configured` : inclure le canal dans les surfaces de listing de type configuré/statut
- `setup` : inclure le canal dans les sélecteurs de configuration/installation interactifs
- `docs` : marquer le canal comme public dans les surfaces de documentation/navigation

<Note>`showConfigured` et `showInSetup` restent pris en charge en tant qu'alias hérités. Privilégiez `exposure`.</Note>

### `openclaw.install`

`openclaw.install` est des métadonnées de package, et non des métadonnées de manifeste.

| Champ                        | Type                                | Signification                                                                                                                     |
| ---------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `clawhubSpec`                | `string`                            | Spécification canonique ClawHub pour les flux d'installation/de mise à jour et d'installation à la demande lors de l'intégration. |
| `npmSpec`                    | `string`                            | Spécification canonique npm pour les flux de repli d'installation/de mise à jour.                                                 |
| `localPath`                  | `string`                            | Chemin d'installation pour le développement local ou groupé.                                                                      |
| `defaultChoice`              | `"clawhub"` \| `"npm"` \| `"local"` | Source d'installation préférée lorsque plusieurs sources sont disponibles.                                                        |
| `minHostVersion`             | `string`                            | Version OpenClaw minimale prise en charge sous la forme `>=x.y.z` ou `>=x.y.z-prerelease`.                                        |
| `expectedIntegrity`          | `string`                            | Chaîne d'intégrité de distribution npm attendue, généralement `sha512-...`, pour les installations épinglées.                     |
| `allowInvalidConfigRecovery` | `boolean`                           | Lets bundled-plugin reinstall flows recover from specific stale-config failures.                                                  |

<AccordionGroup>
  <Accordion title="Onboarding behavior">
    Interactive onboarding also uses `openclaw.install`ClawHubnpmClawHub for install-on-demand surfaces. If your plugin exposes provider auth choices or channel setup/catalog metadata before runtime loads, onboarding can show that choice, prompt for ClawHub, npm, or local install, install or enable the plugin, then continue the selected flow. ClawHub onboarding choices use `clawhubSpec`npm and are preferred when present; npm choices require trusted catalog metadata with a registry `npmSpec`; exact versions and `expectedIntegrity`npm are optional npm pins. If `expectedIntegrity`npm is present, install/update flows enforce it for npm. Keep the "what to show" metadata in `openclaw.plugin.json` and the "how to install it" metadata in `package.json`.
  </Accordion>
  <Accordion title="minHostVersion enforcement">
    If `minHostVersion` is set, install and non-bundled manifest-registry loading both enforce it. Older hosts skip external plugins; invalid version strings are rejected. Bundled source plugins are assumed to be co-versioned with the host checkout.
  </Accordion>
  <Accordion title="npmPinned npm installs"npm>
    For pinned npm installs, keep the exact version in `npmSpec` and add the expected artifact integrity:

    ```json
    {
      "openclaw": {
        "install": {
          "npmSpec": "@wecom/wecom-openclaw-plugin@1.2.3",
          "expectedIntegrity": "sha512-REPLACE_WITH_NPM_DIST_INTEGRITY",
          "defaultChoice": "npm"
        }
      }
    }
    ```

  </Accordion>
  <Accordion title="allowInvalidConfigRecovery scope">
    `allowInvalidConfigRecovery` n'est pas une solution de contournement générale pour les configurations cassées. Elle est destinée uniquement à la récupération restreinte des plugins groupés, afin que la réinstallation/l'installation puisse réparer les restes connus de mise à niveau, comme un chemin de plugin groupé manquant ou une entrée `channels.<id>` obsolète pour ce même plugin. Si la configuration est cassée pour des raisons sans rapport, l'installation échoue toujours et indique à l'opérateur d'exécuter `openclaw doctor --fix`.
  </Accordion>
</AccordionGroup>

### Chargement différé complet

Les plugins de channel peuvent opter pour le chargement différé avec :

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

Lorsqu'il est activé, OpenClaw ne charge que `setupEntry` lors de la phase de démarrage pré-écoute, même pour les canaux déjà configurés. L'entrée complète se charge après que la passerelle a commencé à écouter.

<Warning>N'activez le chargement différé que lorsque votre `setupEntry` enregistre tout ce dont la passerelle a besoin avant qu'elle ne commence à écouter (enregistrement du canal, routes HTTP, méthodes de passerelle). Si l'entrée complète possède des capacités de démarrage requises, conservez le comportement par défaut.</Warning>

Si votre entrée de configuration/complète enregistre des méthodes RPC de passerelle, gardez-les sur un préfixe spécifique au plugin. Les espaces de noms d'administration principaux réservés (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent la propriété du cœur et résolvent toujours vers `operator.admin`.

## Manifeste du plugin

Chaque plugin natif doit inclure un `openclaw.plugin.json` à la racine du package. OpenClaw l'utilise pour valider la configuration sans exécuter le code du plugin.

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

Pour les plugins de channel, ajoutez `kind` et `channels` :

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

Voir [Plugin manifest](/fr/plugins/manifest) pour la référence complète du schéma.

## Publication sur ClawHub

Pour les packages de plugins, utilisez la commande spécifique au package ClawHub :

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

<Note>L'alias de publication hérité réservé aux compétences est destiné aux compétences. Les packages de plugins doivent toujours utiliser `clawhub package publish`.</Note>

## Entrée de configuration

Le fichier `setup-entry.ts` est une alternative légère à `index.ts` qu'OpenClaw charge lorsqu'il a uniquement besoin de surfaces de configuration (onboarding, réparation de la configuration, inspection de channel désactivé).

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

Cela évite de charger du code d'exécution lourd (bibliothèques crypto, enregistrements CLI, services d'arrière-plan) lors des flux de configuration.

Les channels d'espace de travail regroupés qui conservent des exports sûrs pour la configuration dans des modules sidecar peuvent utiliser `defineBundledChannelSetupEntry(...)` depuis `openclaw/plugin-sdk/channel-entry-contract` au lieu de `defineSetupPluginEntry(...)`. Ce contrat regroupé prend également en charge un export `runtime` facultatif afin que le câblage d'exécution au moment de la configuration puisse rester léger et explicite.

<AccordionGroup>
  <Accordion title="Quand OpenClaw utilise setupEntry au lieu de l'entrée complète">
    - Le channel est désactivé mais a besoin de surfaces de configuration/onboarding.
    - Le channel est activé mais non configuré.
    - Le chargement différé est activé (`deferConfiguredChannelFullLoadUntilAfterListen`).

  </Accordion>
  <Accordion title="Ce que setupEntry doit enregistrer">
    - L'objet plugin de channel (via `defineSetupPluginEntry`).
    - Toutes les routes HTTP requises avant l'écoute de la passerelle.
    - Toutes les méthodes de passerelle nécessaires lors du démarrage.

    Ces méthodes de passerelle de démarrage doivent toujours éviter les espaces de noms d'administration principaux réservés tels que `config.*` ou `update.*`.

  </Accordion>
  <Accordion title="Ce que setupEntry ne doit PAS inclure">
    - Les enregistrements CLI.
    - Les services d'arrière-plan.
    - Les importations d'exécution lourdes (crypto, SDK).
    - Les méthodes de Gateway nécessaires uniquement après le démarrage.

  </Accordion>
</AccordionGroup>

### Importations de helpers de configuration restreints

Pour les chemins à chaud uniquement pour la configuration, privilégiez les joints de helpers de configuration restreints par rapport au parapluie plus large `plugin-sdk/setup` lorsque vous n'avez besoin que d'une partie de la surface de configuration :

| Chemin d'importation               | Utilisez-le pour                                                                                                           | Exports clés                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/setup-runtime`         | helpers d'exécution au moment de la configuration qui restent disponibles dans `setupEntry` / démarrage de channel différé | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
| `plugin-sdk/setup-adapter-runtime` | alias de compatibilité obsolète ; utilisez `plugin-sdk/setup-runtime`                                                      | `createEnvPatchedAccountSetupAdapter`                                                                                                                                                                                                                                                                                 |
| `plugin-sdk/setup-tools`           | helpers de configuration/installation CLI/archive/docs                                                                     | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR`                                                                                                                                                                                                         |

Utilisez la jonction `plugin-sdk/setup` plus large lorsque vous souhaitez la boîte à outils de configuration partagée complète, y compris les aides de correctifs de configuration telles que `moveSingleAccountChannelSectionToDefaultAccount(...)`.

Utilisez `createSetupTranslator(...)` pour le texte fixe de l'assistant de configuration. Il suit la langue de l'assistant CLI (`OPENCLAW_LOCALE`, puis les variables de langue du système) et revient à l'anglais. Conservez le texte de configuration spécifique au plugin dans le code détenu par le plugin et n'utilisez les clés de catalogue partagé que pour les étiquettes de configuration courantes, le texte d'état et le texte de configuration officiel des plugins groupés.

Les adaptateurs de correctifs de configuration restent sûrs sur le chemin critique lors de l'importation. Leur recherche de surface de contrat de promotion à compte unique groupée est paresseuse, donc l'importation de `plugin-sdk/setup-runtime` ne charge pas avidement la découverte de surface de contrat groupée avant que l'adaptateur ne soit réellement utilisé.

### Promotion à compte unique détenue par le canal

Lorsqu'un canal passe d'une configuration de niveau supérieur à compte unique à `channels.<id>.accounts.*`, le comportement partagé par défaut consiste à déplacer les valeurs promues délimitées au compte dans `accounts.default`.

Les canaux groupés peuvent restreindre ou remplacer cette promotion via leur surface de contrat de configuration :

- `singleAccountKeysToMove` : clés supplémentaires de niveau supérieur qui doivent être déplacées vers le compte promu
- `namedAccountPromotionKeys` : lorsque des comptes nommés existent déjà, seules ces clés sont déplacées vers le compte promu ; les clés de stratégie/livraison partagées restent à la racine du channel
- `resolveSingleAccountPromotionTarget(...)` : choisir quel compte existant reçoit les valeurs promues

<Note>Matrix est l'exemple groupé actuel. S'il existe exactement un compte nommé Matrix, ou si `defaultAccount` pointe vers une clé non canonique existante telle que `Ops`, la promotion préserve ce compte au lieu de créer une nouvelle entrée `accounts.default`.</Note>

## Schéma de configuration

La configuration du plugin est validée par rapport au JSON Schema de votre manifeste. Les utilisateurs configurent les plugins via :

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

Utilisez `buildChannelConfigSchema` pour convertir un schéma Zod en le wrapper `ChannelConfigSchema` utilisé par les artefacts de configuration possédés par le plugin :

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

Si vous rédigez déjà le contrat en JSON Schema ou TypeBox, utilisez l'assistant direct pour qu'OpenClaw puisse ignorer la conversion Zod-vers-JSON-Schema sur les chemins de métadonnées :

```typescript
import { Type } from "typebox";
import { buildJsonChannelConfigSchema } from "openclaw/plugin-sdk/channel-config-schema";

const configSchema = buildJsonChannelConfigSchema(
  Type.Object({
    token: Type.Optional(Type.String()),
    allowFrom: Type.Optional(Type.Array(Type.String())),
  }),
);
```

Pour les plugins tiers, le contrat cold-path est toujours le manifeste du plugin : reflétez le JSON Schema généré dans `openclaw.plugin.json#channelConfigs` afin que le schéma de configuration, l'installation et les surfaces de l'interface utilisateur puissent inspecter `channels.<id>` sans charger de code d'exécution.

## Assistants d'installation

Les plugins de channel peuvent fournir des assistants d'installation interactifs pour `openclaw onboard`. L'assistant est un objet `ChannelSetupWizard` sur le `ChannelPlugin` :

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

Le type `ChannelSetupWizard` prend en charge `credentials`, `textInputs`, `dmPolicy`, `allowFrom`, `groupAccess`, `prepare`, `finalize`, et plus. Consultez les packages de plugins inclus (par exemple le plugin Discord `src/channel.setup.ts`) pour des exemples complets.

<AccordionGroup>
  <Accordion title="Invites allowFrom partagées">
    Pour les invites de liste d'autorisation DM qui ne nécessitent que le flux standard `note -> prompt -> parse -> merge -> patch`, préférez les assistants de configuration partagés de `openclaw/plugin-sdk/setup` : `createPromptParsedAllowFromForAccount(...)`, `createTopLevelChannelParsedAllowFromPrompt(...)` et `createNestedChannelParsedAllowFromPrompt(...)`.
  </Accordion>
  <Accordion title="Statut de configuration de canal standard">
    Pour les blocs de statut de configuration de canal qui ne varient que par les étiquettes, les scores et les lignes supplémentaires facultatives, préférez `createStandardChannelSetupStatus(...)` de `openclaw/plugin-sdk/setup` au lieu de recréer manuellement le même objet `status` dans chaque plugin.
  </Accordion>
  <Accordion title="Surface de configuration de canal facultative">
    Pour les surfaces de configuration facultatives qui ne doivent apparaître que dans certains contextes, utilisez `createOptionalChannelSetupSurface` de `openclaw/plugin-sdk/channel-setup` :

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

    `plugin-sdk/channel-setup` expose également les constructeurs de plus bas niveau `createOptionalChannelSetupAdapter(...)` et `createOptionalChannelSetupWizard(...)` lorsque vous n'avez besoin que de la moitié de cette surface d'installation facultative.

    L'adaptateur/assistant facultatif généré échoue en mode fermé (fail closed) lors des écritures de configuration réelles. Ils réutilisent un message d'installation requis à travers `validateInput`, `applyAccountConfig` et `finalize`, et ajoutent un lien vers la documentation lorsque `docsPath` est défini.

  </Accordion>
  <Accordion title="Helpers de configuration basés sur binaire">
    Pour les interfaces de configuration basées sur un binaire, préférez les helpers délégués partagés plutôt que de copier le même code de collage binaire/statut dans chaque channel :

    - `createDetectedBinaryStatus(...)` pour les blocs de statut qui ne varient que par les étiquettes, les indices, les scores et la détection de binaire
    - `createCliPathTextInput(...)` pour les champs de texte basés sur un chemin
    - `createDelegatedSetupWizardStatusResolvers(...)`, `createDelegatedPrepare(...)`, `createDelegatedFinalize(...)` et `createDelegatedResolveConfigured(...)` lorsque `setupEntry` doit transmettre à un assistant complet plus lourd de manière paresseuse
    - `createDelegatedTextInputShouldPrompt(...)` lorsque `setupEntry` a uniquement besoin de déléguer une décision `textInputs[*].shouldPrompt`

  </Accordion>
</AccordionGroup>

## Publication et installation

**Plugins externes :** publiez sur [ClawHub](/fr/clawhub), puis installez :

<Tabs>
  <Tab title="npm">
    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    Les spécifications de package nues s'installent depuis npm lors du basculement de lancement.

  </Tab>
  <Tab title="ClawHub uniquement">
    ```bash
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```
  </Tab>
  <Tab title="Spécification de package npm">
    Utilisez npm lorsqu'un package n'a pas encore migré vers ClawHub, ou lorsque vous avez besoin d'un chemin d'installation npm direct lors de la migration :

    ```bash
    openclaw plugins install npm:@myorg/openclaw-my-plugin
    ```

  </Tab>
</Tabs>

**Plugins dans le dépôt :** placez-les sous l'arborescence de l'espace de travail des plugins groupés (bundled) et ils sont automatiquement découverts lors de la construction.

**Les utilisateurs peuvent installer :**

```bash
openclaw plugins install <package-name>
```

<Info>Pour les installations provenant de npm, `openclaw plugins install` installe le paquet dans un projet par plugin sous `~/.openclaw/npm/projects` avec les scripts de cycle de vie désactivés. Gardez les arbres de dépendances des plugins purs JS/TS et évitez les paquets qui nécessitent des builds `postinstall`.</Info>

<Note>Gateway startup n'installe pas les dépendances des plugins. Les flux d'installation npm/git/ClawHub gèrent eux-mêmes la convergence des dépendances ; les plugins locaux doivent déjà avoir leurs dépendances installées.</Note>

Les métadonnées du package groupé sont explicites et non déduites du JavaScript construit au démarrage de la passerelle. Les dépendances d'exécution appartiennent au package plugin qui les possède ; le démarrage OpenClaw groupé ne répare ni ne met en miroir les dépendances des plugins.

## Connexes

- [Création de plugins](/fr/plugins/building-plugins) — guide de démarrage étape par étape
- [Manifeste du plugin](/fr/plugins/manifest) — référence complète du schéma de manifeste
- [Points d'entrée du SDK](/fr/plugins/sdk-entrypoints) — `definePluginEntry` et `defineChannelPluginEntry`
