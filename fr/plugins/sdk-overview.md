---
title: "Vue d'ensemble du SDK de plug-in"
sidebarTitle: "Vue d'ensemble du SDK"
summary: "Carte d'importation, référence de l'API d'enregistrement et architecture du SDK"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# Vue d'ensemble du SDK de plug-in

Le SDK de plug-in est le contrat typé entre les plug-ins et le cœur. Cette page est la référence pour **ce qu'il faut importer** et **ce que vous pouvez enregistrer**.

<Tip>
  **Vous cherchez un guide pratique ?** - Premier plug-in ? Commencez par [Getting
  Started](/fr/plugins/building-plugins) - Plug-in de channel ? Consultez [Channel
  Plugins](/fr/plugins/sdk-channel-plugins) - Plug-in de provider ? Consultez [Provider
  Plugins](/fr/plugins/sdk-provider-plugins)
</Tip>

## Convention d'importation

Importez toujours depuis un sous-chemin spécifique :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
```

Chaque sous-chemin est un petit module autonome. Cela permet de garder le démarrage rapide et évite les problèmes de dépendances circulaires.

## Référence des sous-chemins

Les sous-chemins les plus couramment utilisés, regroupés par objectif. La liste complète des 100+
sous-chemins se trouve dans `scripts/lib/plugin-sdk-entrypoints.json`.

### Point d'entrée du plug-in

| Sous-chemin               | Exportations clés                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry` | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`         | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema` |

<AccordionGroup>
  <Accordion title="Sous-chemins de canal">
    | Sous-chemin | Exportations clés |
    | --- | --- |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface` |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Types de schéma de configuration de canal |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/channel-inbound` | Anti-rebond, correspondance de mentions, assistants d'enveloppe |
    | `plugin-sdk/channel-send-result` | Types de résultats de réponse |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Assistants d'analyse/correspondance de cible |
    | `plugin-sdk/channel-contract` | Types de contrat de canal |
    | `plugin-sdk/channel-feedback` | Câblage de commentaires/réactions |
  </Accordion>

<Accordion title="Sous-chemins de fournisseur">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/provider-auth` |
  `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | |
  `plugin-sdk/provider-models` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog` |
  Réexportations de type de catalogue | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` et
  similaires | | `plugin-sdk/provider-stream` | Types de wrappers de flux | |
  `plugin-sdk/provider-onboard` | Assistants de correctifs de configuration d'onboarding |
</Accordion>

<Accordion title="Sous-chemins d'authentification et de sécurité">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/command-auth` |
  `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | |
  `plugin-sdk/secret-input` | Assistants d'analyse de saisie de secrets | |
  `plugin-sdk/webhook-ingress` | Assistants de requête/cible de webhook |
</Accordion>

<Accordion title="Sous-chemins d'exécution et de stockage">
  | Sous-chemin | Principaux exports | | --- | --- | | `plugin-sdk/runtime-store` |
  `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Assistants de chargement/écriture de
  la configuration | | `plugin-sdk/infra-runtime` | Assistants d'événements système / heartbeat | |
  `plugin-sdk/agent-runtime` | Assistants de répertoire/identité/espace de travail de l'agent | |
  `plugin-sdk/directory-runtime` | Requête/dédoublonnement de répertoire avec support de
  configuration | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Sous-chemins de capacité et de test">
    | Sous-chemin | Principaux exports |
    | --- | --- |
    | `plugin-sdk/image-generation` | Types de provider de génération d'images |
    | `plugin-sdk/media-understanding` | Types de provider de compréhension multimédia |
    | `plugin-sdk/speech` | Types de provider de synthèse vocale |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces
méthodes :

### Enregistrement des capacités

| Méthode                                       | Ce qu'elle enregistre     |
| --------------------------------------------- | ------------------------- |
| `api.registerProvider(...)`                   | Inférence de texte (LLM)  |
| `api.registerChannel(...)`                    | Channel de messagerie     |
| `api.registerSpeechProvider(...)`             | Synthèse vocale / STT     |
| `api.registerMediaUnderstandingProvider(...)` | Analyse image/audio/vidéo |
| `api.registerImageGenerationProvider(...)`    | Génération d'images       |
| `api.registerWebSearchProvider(...)`          | Recherche Web             |

### Outils et commandes

| Méthode                         | Ce qu'elle enregistre                          |
| ------------------------------- | ---------------------------------------------- |
| `api.registerTool(tool, opts?)` | Outil d'agent (requis ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)      |

### Infrastructure

| Méthode                                        | Ce qu'elle enregistre                |
| ---------------------------------------------- | ------------------------------------ |
| `api.registerHook(events, handler, opts?)`     | Hook d'événement                     |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP du Gateway |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway du RPC               |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                    |
| `api.registerService(service)`                 | Service d'arrière-plan               |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif              |

### Slots exclusifs

| Méthode                                    | Ce qu'elle enregistre                        |
| ------------------------------------------ | -------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois)      |
| `api.registerMemoryPromptSection(builder)` | Constructeur de section de prompt de mémoire |

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

### Sémantique de décision de hook

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est considéré comme une absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `message_sending` : renvoyer `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `message_sending` : renvoyer `{ cancel: false }` est considéré comme une absence de décision (identique à l'omission de `cancel`), et non comme une substitution.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                  |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Identifiant du plugin                                                        |
| `api.name`               | `string`                  | Nom d'affichage                                                              |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                               |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                           |
| `api.source`             | `string`                  | Chemin source du plugin                                                      |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                     |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle                                      |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin à partir de `plugins.entries.<id>.config` |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/fr/plugins/sdk-runtime)                            |
| `api.logger`             | `PluginLogger`            | Enregistreur avec portée (`debug`, `info`, `warn`, `error`)                  |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`, `"setup-only"`, ou `"setup-runtime"`                               |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                             |

## Convention de module interne

Dans votre plugin, utilisez des fichiers barils locaux pour les importations internes :

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  N'importez jamais votre propre plugin via `openclaw/plugin-sdk/<your-plugin>`
  depuis le code de production. Acheminez les importations internes via `./api.ts` ou
  `./runtime-api.ts`. Le chemin du SDK est uniquement le contrat externe.
</Warning>

## Connexes

- [Points d'entrée](/fr/plugins/sdk-entrypoints) — options `definePluginEntry` et `defineChannelPluginEntry`
- [Assistants d'exécution](/fr/plugins/sdk-runtime) — référence complète de l'espace de noms `api.runtime`
- [Configuration et installation](/fr/plugins/sdk-setup) — empaquetage, manifestes, schémas de configuration
- [Tests](/fr/plugins/sdk-testing) — utilitaires de test et règles de linting
- [Migration du SDK](/fr/plugins/sdk-migration) — migration depuis les surfaces dépréciées
- [Internes du plugin](/fr/plugins/architecture) — architecture approfondie et modèle de capacité

import fr from "/components/footer/fr.mdx";

<fr />
