---
title: "Construction d'extensions"
summary: "Guide étape par étape pour créer des extensions de channel et de provider pour OpenClaw"
read_when:
  - You want to create a new OpenClaw plugin or extension
  - You need to understand the plugin SDK import patterns
  - You are adding a new channel or provider to OpenClaw
---

# Construction d'extensions

Ce guide explique comment créer une extension OpenClaw à partir de zéro. Les
extensions peuvent ajouter des channels, des providers de modèle, des outils ou d'autres capacités.

## Prérequis

- Dépôt OpenClaw cloné et dépendances installées (`pnpm install`)
- Familiarité avec TypeScript (ESM)

## Structure de l'extension

Chaque extension se trouve sous `extensions/<name>/` et suit cette disposition :

```
extensions/my-channel/
├── package.json          # npm metadata + openclaw config
├── index.ts              # Entry point (defineChannelPluginEntry)
├── setup-entry.ts        # Setup wizard (optional)
├── api.ts                # Public contract barrel (optional)
├── runtime-api.ts        # Internal runtime barrel (optional)
└── src/
    ├── channel.ts        # Channel adapter implementation
    ├── runtime.ts        # Runtime wiring
    └── *.test.ts         # Colocated tests
```

## Étape 1 : Créer le package

Créer `extensions/my-channel/package.json` :

```json
{
  "name": "@openclaw/my-channel",
  "version": "2026.1.1",
  "description": "OpenClaw My Channel plugin",
  "type": "module",
  "dependencies": {},
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "selectionLabel": "My Channel (plugin)",
      "docsPath": "/channels/my-channel",
      "docsLabel": "my-channel",
      "blurb": "Short description of the channel.",
      "order": 80
    },
    "install": {
      "npmSpec": "@openclaw/my-channel",
      "localPath": "extensions/my-channel"
    }
  }
}
```

Le champ `openclaw` indique au système de plugins ce que fournit votre extension.
Pour les plugins de provider, utilisez `providers` au lieu de `channel`.

## Étape 2 : Définir le point d'entrée

Créer `extensions/my-channel/index.ts` :

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Connects OpenClaw to My Channel",
  plugin: {
    // Channel adapter implementation
  },
});
```

Pour les plugins de provider, utilisez plutôt `definePluginEntry`.

## Étape 3 : Importer depuis des sous-chemins ciblés

Le SDK de plugin expose de nombreux sous-chemins ciblés. Importez toujours depuis des
sous-chemins spécifiques plutôt que depuis la racine monolithique :

```typescript
// Correct: focused subpaths
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
import { createChannelPairingController } from "openclaw/plugin-sdk/channel-pairing";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";
import { resolveChannelGroupRequireMention } from "openclaw/plugin-sdk/channel-policy";

// Wrong: monolithic root (lint will reject this)
import { ... } from "openclaw/plugin-sdk";
```

Sous-chemins courants :

| Sous-chemin                         | Objectif                                              |
| ----------------------------------- | ----------------------------------------------------- |
| `plugin-sdk/core`                   | Définitions d'entrée de plugin, types de base         |
| `plugin-sdk/channel-setup`          | Adaptateurs/assistants de configuration optionnels    |
| `plugin-sdk/channel-pairing`        | Primitives d'appariement DM                           |
| `plugin-sdk/channel-reply-pipeline` | Câblage de réponse de préfixe + saisie                |
| `plugin-sdk/channel-config-schema`  | Constructeurs de schéma de configuration              |
| `plugin-sdk/channel-policy`         | Assistants de stratégie de groupe/DM                  |
| `plugin-sdk/secret-input`           | Analyse/assistants de saisie de secrets               |
| `plugin-sdk/webhook-ingress`        | Assistants de requête/cible de webhook                |
| `plugin-sdk/runtime-store`          | Stockage persistant de plugin                         |
| `plugin-sdk/allow-from`             | Résolution de liste d'autorisation                    |
| `plugin-sdk/reply-payload`          | Types de réponse de message                           |
| `plugin-sdk/provider-onboard`       | Correctifs de configuration d'intégration de provider |
| `plugin-sdk/testing`                | Utilitaires de test                                   |

Utilisez la primitive la plus étroite correspondant à la tâche. Optez pour `channel-runtime`
ou d'autres barils d'assistance plus volumineux uniquement lorsqu'un sous-chemin dédié n'existe pas encore.

## Étape 4 : Utiliser des barils locaux pour les importations internes

Dans votre extension, créez des fichiers barils pour le partage de code interne au lieu
d'importer via le SDK du plugin :

```typescript
// api.ts — public contract for this extension
export { MyChannelConfig } from "./src/config.js";
export { MyChannelRuntime } from "./src/runtime.js";

// runtime-api.ts — internal-only exports (not for production consumers)
export { internalHelper } from "./src/helpers.js";
```

**Garde-fou contre l'auto-importation** : n'importez jamais votre propre extension via son
chemin de contrat SDK publié à partir des fichiers de production. Acheminez les importations internes
via `./api.ts` ou `./runtime-api.ts` à la place. Le contrat SDK est
uniquement pour les consommateurs externes.

## Étape 5 : Ajouter un manifeste de plugin

Créez `openclaw.plugin.json` à la racine de votre extension :

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "name": "My Channel Plugin",
  "description": "Connects OpenClaw to My Channel"
}
```

Voir [Plugin manifest](/fr/plugins/manifest) pour le schéma complet.

## Étape 6 : Tester avec des tests de contrat

OpenClaw exécute des tests de contrat sur tous les plugins enregistrés. Après avoir ajouté votre
extension, exécutez :

```bash
pnpm test:contracts:channels   # channel plugins
pnpm test:contracts:plugins    # provider plugins
```

Les tests de contrat vérifient que votre plugin est conforme à l'interface attendue (assistant
de configuration, liaison de session, gestion des messages, politique de groupe, etc.).

Pour les tests unitaires, importez les helpers de test depuis la surface de test publique :

```typescript
import { createTestRuntime } from "openclaw/plugin-sdk/testing";
```

## Application des règles de linting

Trois scripts appliquent les limites du SDK :

1. **Pas d'imports racine monolithiques** — `openclaw/plugin-sdk` root est rejeté
2. **Pas d'imports src/ directs** — les extensions ne peuvent pas importer `../../src/` directement
3. **Pas d'auto-imports** — les extensions ne peuvent pas importer leur propre sous-chemin `plugin-sdk/<name>`

Exécutez `pnpm check` pour vérifier toutes les limites avant de valider.

## Liste de contrôle

Avant de soumettre votre extension :

- [ ] `package.json` possède les métadonnées `openclaw` correctes
- [ ] Le point d'entrée utilise `defineChannelPluginEntry` ou `definePluginEntry`
- [ ] Tous les imports utilisent des chemins `plugin-sdk/<subpath>` ciblés
- [ ] Les imports internes utilisent des barils locaux, pas d'auto-imports SDK
- [ ] Le manifeste `openclaw.plugin.json` est présent et valide
- [ ] Les tests de contrat réussissent (`pnpm test:contracts`)
- [ ] Les tests unitaires sont colocalisés en tant que `*.test.ts`
- [ ] `pnpm check` réussit (lint + format)
- [ ] Page de documentation créée sous `docs/channels/` ou `docs/plugins/`

import fr from "/components/footer/fr.mdx";

<fr />
