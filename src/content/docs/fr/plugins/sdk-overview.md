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

<Tip>**Vous cherchez un guide pratique ?** - Premier plugin ? Commencez par [Getting Started](/en/plugins/building-plugins) - Plugin de canal ? Consultez [Channel Plugins](/en/plugins/sdk-channel-plugins) - Plugin de fournisseur ? Consultez [Provider Plugins](/en/plugins/sdk-provider-plugins)</Tip>

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

<Accordion title="Sous-chemins du provider">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/cli-backend` | Valeurs par défaut du backend CLI + constantes du watchdog | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-models` | Alias de modèle de provider compatibilité obsolète ; préférez les sous-chemins spécifiques au
  provider ou `plugin-sdk/provider-model-shared` | | `plugin-sdk/provider-model-shared` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog` | | `plugin-sdk/provider-catalog` | Alias de générateur de provider compatibilité obsolète ; préférez les sous-chemins spécifiques au provider ou `plugin-sdk/provider-catalog-shared` | |
  `plugin-sdk/provider-usage` | `fetchClaudeUsage` et similaires | | `plugin-sdk/provider-stream` | Types de wrappers de flux | | `plugin-sdk/provider-onboard` | Aides pour la correction de la configuration Onboarding | | `plugin-sdk/global-singleton` | Aides pour singleton/map/cache locaux au processus |
</Accordion>

<Accordion title="Sous-chemins d'authentification et de sécurité">
  | Sous-chemin | Principaux exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | Assistants d'analyse de l'entrée secrète | | `plugin-sdk/webhook-ingress` | Assistants de requête/cible de Webhook | | `plugin-sdk/webhook-request-guards` | Assistants de taille/délai d'attente du
  corps de la requête |
</Accordion>

<Accordion title="Sous-chemins d'exécution et de stockage">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Assistants de chargement/écriture de configuration | | `plugin-sdk/approval-runtime` | Assistants d'exécution et d'approbation de plugin | | `plugin-sdk/infra-runtime` | Assistants d'événement système/de pulsation | | `plugin-sdk/collection-runtime` |
  Assistants de petit cache borné | | `plugin-sdk/diagnostic-runtime` | Assistants d'indicateur de diagnostic et d'événement | | `plugin-sdk/error-runtime` | Assistants de graphe d'erreurs et de formatage | | `plugin-sdk/fetch-runtime` | Assistants de récupération encapsulée, de proxy et de recherche épinglée | | `plugin-sdk/host-runtime` | Assistants de normalisation de nom d'hôte et d'hôte SCP |
  | `plugin-sdk/retry-runtime` | Assistants de configuration de nouvelle tentative et d'exécuteur de nouvelle tentative | | `plugin-sdk/agent-runtime` | Assistants de répertoire/identité/espace de travail de l'agent | | `plugin-sdk/directory-runtime` | Requête/dédoublonnage de répertoire basé sur la configuration | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Sous-chemins des capacités et des tests">
    | Sous-chemin | Principaux exports |
    | --- | --- |
    | `plugin-sdk/image-generation` | Types de provider de génération d'images |
    | `plugin-sdk/media-understanding` | Types de provider de compréhension multimédia |
    | `plugin-sdk/speech` | Types de provider de reconnaissance vocale |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces méthodes :

### Enregistrement des capacités

| Méthode                                       | Ce qu'elle enregistre            |
| --------------------------------------------- | -------------------------------- |
| `api.registerProvider(...)`                   | Inférence de texte (LLM)         |
| `api.registerCliBackend(...)`                 | Backend d'inférence CLI local    |
| `api.registerChannel(...)`                    | Channel de messagerie            |
| `api.registerSpeechProvider(...)`             | Synthèse Texte-vers-parole / STT |
| `api.registerMediaUnderstandingProvider(...)` | Analyse d'image/audio/vidéo      |
| `api.registerImageGenerationProvider(...)`    | Génération d'images              |
| `api.registerWebSearchProvider(...)`          | Recherche Web                    |

### Outils et commandes

| Méthode                         | Ce qu'il enregistre                                |
| ------------------------------- | -------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Tool d'agent (obligatoire ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)          |

### Infrastructure

| Méthode                                        | Ce qu'il enregistre               |
| ---------------------------------------------- | --------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Hook d'événement                  |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP Gateway |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway RPC               |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                 |
| `api.registerService(service)`                 | Service d'arrière-plan            |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif           |

### Inscription du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut d'un backend CLI d'IA local tel que `claude-cli` ou `codex-cli`.

- Le backend `id` devient le préfixe du fournisseur dans les références de modèle comme `claude-cli/opus`.
- Le backend `config` utilise la même forme que `agents.defaults.cliBackends.<id>`.
- La configuration utilisateur l'emporte toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la valeur par défaut du plugin avant d'exécuter le CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion
  (par exemple pour normaliser les anciennes formes d'indicateurs).

### Emplacements exclusifs

| Méthode                                    | Ce qu'il enregistre                     |
| ------------------------------------------ | --------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois) |
| `api.registerMemoryPromptSection(builder)` | Générateur de section d'invite mémoire  |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire  |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur du runtime mémoire           |

### Adaptateurs d'incorporation de mémoire

| Méthode                                        | Ce qu'il enregistre                                        |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'incorporation de mémoire pour le plugin actif |

- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont exclusifs aux plugins de mémoire.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un ou plusieurs identifiants d'adaptateurs d'intégration (par exemple `openai`, `gemini`, ou un identifiant personnalisé défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Crochet de cycle de vie typé      |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

### Sémantique des décisions de hook

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est traité comme une absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `message_sending` : le renvoi de `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `message_sending` : le renvoi de `{ cancel: false }` est traité comme l'absence de décision (identique à l'omission de `cancel`), et non comme une priorité.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                             |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Identifiant du plugin                                                   |
| `api.name`               | `string`                  | Nom d'affichage                                                         |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                          |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                      |
| `api.source`             | `string`                  | Chemin source du plugin                                                 |
| `api.rootDir`            | `string?`                 | Répertoire racine du plug-in (facultatif)                               |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle                                 |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin depuis `plugins.entries.<id>.config` |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/en/plugins/sdk-runtime)                       |
| `api.logger`             | `PluginLogger`            | Journaliste délimité (`debug`, `info`, `warn`, `error`)                 |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`, `"setup-only"`, ou `"setup-runtime"`                          |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                        |

## Convention de module interne

Dans votre plugin, utilisez des fichiers barrel locaux pour les importations internes :

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  N'importez jamais votre propre plugin via `openclaw/plugin-sdk/<your-plugin>`
  depuis du code de production. Acheminez les importations internes via `./api.ts` ou
  `./runtime-api.ts`. Le chemin du SDK est uniquement le contrat externe.
</Warning>

## Connexes

- [Points d'entrée](/en/plugins/sdk-entrypoints) — options `definePluginEntry` et `defineChannelPluginEntry`
- [Assistants d'exécution](/en/plugins/sdk-runtime) — référence complète de l'espace de noms `api.runtime`
- [Configuration et installation](/en/plugins/sdk-setup) — packaging, manifests, schémas de configuration
- [Tests](/en/plugins/sdk-testing) — utilitaires de test et règles de linter
- [Migration du SDK](/en/plugins/sdk-migration) — migration à partir des surfaces obsolètes
- [Internalisation des plugins](/en/plugins/architecture) — architecture approfondie et modèle de fonctionnalités
