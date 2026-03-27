---
title: "Configuration et configuration du plugin"
sidebarTitle: "Configuration et configuration"
summary: "Assistants de configuration, setup-entry.ts, schémas de configuration et métadonnées package."
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# Configuration et configuration du plugin

Référence pour le packaging des plugins (métadonnées `package.json`), les manifests
(`openclaw.plugin.json`), les points d'entrée de configuration et les schémas de configuration.

<Tip>
  **Vous cherchez un guide pas à pas ?** Les guides pratiques couvrent le packaging en contexte :
  [Plugins de canal](/fr/plugins/sdk-channel-plugins#step-1-package-and-manifest) et [Plugins de
  fournisseur](/fr/plugins/sdk-provider-plugins#step-1-package-and-manifest).
</Tip>

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

**Plugin de fournisseur :**

```json
{
  "name": "@myorg/openclaw-my-provider",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "providers": ["my-provider"]
  }
}
```

### champs `openclaw`

| Champ        | Type       | Description                                                                                     |
| ------------ | ---------- | ----------------------------------------------------------------------------------------------- |
| `extensions` | `string[]` | Fichiers de point d'entrée (relatifs à la racine du package)                                    |
| `setupEntry` | `string`   | Point d'entrée léger uniquement pour la configuration (optionnel)                               |
| `channel`    | `object`   | Métadonnées du canal : `id`, `label`, `blurb`, `selectionLabel`, `docsPath`, `order`, `aliases` |
| `providers`  | `string[]` | Ids de fournisseurs enregistrés par ce plugin                                                   |
| `install`    | `object`   | Indices d'installation : `npmSpec`, `localPath`, `defaultChoice`                                |
| `startup`    | `object`   | Indicateurs de comportement au démarrage                                                        |

### Chargement différé complet

Les plugins de canal peuvent opter pour un chargement différé avec :

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

Lorsqu'il est activé, OpenClaw ne charge que `setupEntry` pendant la phase de démarrage
préalable à l'écoute, même pour les canaux déjà configurés. Le point d'entrée complet se charge après
que la passerelle a commencé à écouter.

<Warning>
  N'activez le chargement différé que lorsque votre `setupEntry` enregistre tout ce dont le gateway
  a besoin avant qu'il ne commence à écouter (enregistrement de canal, routes HTTP, méthodes de
  gateway). Si l'entrée complète possède des capacités de démarrage requises, conservez le
  comportement par défaut.
</Warning>

## Manifeste du plugin

Chaque plugin natif doit inclure un `openclaw.plugin.json` à la racine du paquet.
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

Même les plugins sans configuration doivent inclure un schéma. Un schéma vide est valide :

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

Voir [Plugin Manifest](/fr/plugins/manifest) pour la référence complète du schéma.

## Entrée de configuration

Le fichier `setup-entry.ts` est une alternative légère à `index.ts` que
OpenClaw charge lorsqu'il a besoin uniquement des surfaces de configuration (onboarding, réparation de configuration,
inspection de canal désactivé).

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

Cela évite de charger du code d'exécution lourd (bibliothèques cryptographiques, enregistrements CLI,
services d'arrière-plan) lors des flux de configuration.

**Quand OpenClaw utilise `setupEntry` au lieu de l'entrée complète :**

- Le canal est désactivé mais a besoin de surfaces de configuration/onboarding
- Le canal est activé mais non configuré
- Le chargement différé est activé (`deferConfiguredChannelFullLoadUntilAfterListen`)

**Ce que `setupEntry` doit enregistrer :**

- L'objet plugin de canal (via `defineSetupPluginEntry`)
- Toutes les routes HTTP requises avant l'écoute du gateway
- Toutes les méthodes de gateway nécessaires lors du démarrage

**Ce que `setupEntry` ne doit PAS inclure :**

- Enregistrements CLI
- Services d'arrière-plan
- Importations d'exécution lourdes (crypto, SDK)
- Méthodes de gateway nécessaires uniquement après le démarrage

## Schéma de configuration

La configuration du plugin est validée par rapport au schéma JSON de votre manifeste. Les utilisateurs
configurent les plugins via :

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

Votre plugin reçoit cette configuration en tant que `api.pluginConfig` lors de l'enregistrement.

Pour une configuration spécifique au canal, utilisez plutôt la section de configuration du canal :

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

### Construction des schémas de configuration de canal

Utilisez `buildChannelConfigSchema` de `openclaw/plugin-sdk/core` pour convertir un
schéma Zod dans le wrapper `ChannelConfigSchema` que OpenClaw valide :

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

## Assistants de configuration

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
Voir les plugins fournis (par exemple `extensions/discord/src/channel.setup.ts`) pour
des exemples complets.

Pour les invites de liste d'autorisation DM qui nécessitent uniquement le flux standard
`note -> prompt -> parse -> merge -> patch`, privilégiez les assistants de configuration
partagés de `openclaw/plugin-sdk/setup` : `createPromptParsedAllowFromForAccount(...)`,
`createTopLevelChannelParsedAllowFromPrompt(...)`, et
`createNestedChannelParsedAllowFromPrompt(...)`.

Pour les blocs de statut de configuration de channel qui ne varient que par les étiquettes, les scores et les lignes
supplémentaires facultatives, privilégiez `createStandardChannelSetupStatus(...)` de
`openclaw/plugin-sdk/setup` au lieu de recréer le même objet `status` dans
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

## Publication et installation

**Plugins externes :** publiez sur [ClawHub](/fr/tools/clawhub) ou npm, puis installez :

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw essaie d'abord ClawHub et revient automatiquement à npm. Vous pouvez également
forcer une source spécifique :

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
openclaw plugins install npm:@myorg/openclaw-my-plugin       # npm only
```

**Plugins dans le dépôt :** placez-les sous `extensions/` et ils sont automatiquement
découverts lors de la construction.

**Les utilisateurs peuvent parcourir et installer :**

```bash
openclaw plugins search <query>
openclaw plugins install <package-name>
```

<Info>
  Pour les installations issues de npm, `openclaw plugins install` exécute `npm install
  --ignore-scripts` (pas de scripts de cycle de vie). Gardez les arbres de dépendances des plugins
  purs JS/TS et évitez les packages qui nécessitent des constructions `postinstall`.
</Info>

## Connexes

- [Points d'entrée SDK](/fr/plugins/sdk-entrypoints) -- `definePluginEntry` et `defineChannelPluginEntry`
- [Manifeste de plugin](/fr/plugins/manifest) -- référence complète du schéma de manifeste
- [Création de plugins](/fr/plugins/building-plugins) -- guide de démarrage étape par étape

import fr from "/components/footer/fr.mdx";

<fr />
