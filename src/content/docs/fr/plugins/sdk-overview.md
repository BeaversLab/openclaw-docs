---
title: "Vue d'ensemble du SDK de plugin"
sidebarTitle: "Vue d'ensemble du SDK"
summary: "Carte d'import, référence de l'API d'enregistrement, et architecture du SDK"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# Vue d'ensemble du SDK de plug-in

Le SDK de plug-in est le contrat typé entre les plug-ins et le cœur. Cette page est la référence pour **ce qu'il faut importer** et **ce que vous pouvez enregistrer**.

<Tip>**Vous cherchez un guide pratique ?** - Premier plugin ? Commencez par [Getting Started](/en/plugins/building-plugins) - Plugin de canal ? Voir [Channel Plugins](/en/plugins/sdk-channel-plugins) - Plugin de fournisseur ? Voir [Provider Plugins](/en/plugins/sdk-provider-plugins)</Tip>

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
    | `plugin-sdk/channel-inbound` | Débounce, correspondance de mentions, assistants d'enveloppe |
    | `plugin-sdk/channel-send-result` | Types de résultats de réponse |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Assistants d'analyse/correspondance de cible |
    | `plugin-sdk/channel-contract` | Types de contrat de canal |
    | `plugin-sdk/channel-feedback` | Câblage de réactions/commentaires |
  </Accordion>

<Accordion title="Sous-chemins du fournisseur">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/cli-backend` | Valeurs par défaut du backend CLI + constantes de surveillance | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-model-shared` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`,
  `buildSingleProviderApiKeyCatalog` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` et similaires | | `plugin-sdk/provider-stream` | Types de wrappers de flux | | `plugin-sdk/provider-onboard` | Assistants de correctifs de configuration Onboarding | | `plugin-sdk/global-singleton` | Assistants de singleton/map/cache local au processus |
</Accordion>

<Accordion title="Sous-chemins d'authentification et de sécurité">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | Assistants d'analyse d'entrée de secrets | | `plugin-sdk/webhook-ingress` | Assistants de requête/cible de webhook | | `plugin-sdk/webhook-request-guards` | Assistants de taille/délai d'expiration du
  corps de la requête |
</Accordion>

<Accordion title="Sous-chemins d'exécution et de stockage">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Assistants de chargement/écriture de configuration | | `plugin-sdk/approval-runtime` | Assistants d'exécution et d'approbation de plugins | | `plugin-sdk/infra-runtime` | Assistants d'événements système et de pulsation | | `plugin-sdk/collection-runtime` |
  Assistants de petit cache borné | | `plugin-sdk/diagnostic-runtime` | Assistants de drapeaux de diagnostic et d'événements | | `plugin-sdk/error-runtime` | Assistants de graphe d'erreurs et de formatage | | `plugin-sdk/fetch-runtime` | Assistants de récupération encapsulée, de proxy et de recherche épinglée | | `plugin-sdk/host-runtime` | Assistants de normalisation de nom d'hôte et d'hôte SCP |
  | `plugin-sdk/retry-runtime` | Assistants de configuration de nouvelle tentative et d'exécuteur de nouvelle tentative | | `plugin-sdk/agent-runtime` | Assistants de répertoire/identité/espace de travail de l'agent | | `plugin-sdk/directory-runtime` | Requête/dédoublonnage de répertoire basé sur la configuration | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Sous-chemins de capacité et de test">
    | Sous-chemin | Exportations clés |
    | --- | --- |
    | `plugin-sdk/image-generation` | Types de provider de génération d'images |
    | `plugin-sdk/media-understanding` | Types de provider de compréhension multimédia |
    | `plugin-sdk/speech` | Types de provider de reconnaissance vocale |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces
méthodes :

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

| Méthode                         | Ce qu'il enregistre                            |
| ------------------------------- | ---------------------------------------------- |
| `api.registerTool(tool, opts?)` | Outil d'agent (requis ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)      |

### Infrastructure

| Méthode                                        | Ce qu'il enregistre               |
| ---------------------------------------------- | --------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Hook d'événement                  |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP Gateway |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway RPC               |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                 |
| `api.registerService(service)`                 | Service d'arrière-plan            |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif           |

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de premier niveau :

- `commands` : racines de commande explicites détenues par le registre
- `descriptors` : descripteurs de commande au moment de l'analyse utilisés pour l'aide de la CLI racine,
  le routage et l'enregistrement différé des CLI du plugin

Si vous souhaitez qu'une commande de plugin reste chargée à la demande dans le chemin normal de la CLI racine,
fournissez des `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce
registre.

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

Utilisez `commands` seul uniquement lorsque vous n'avez pas besoin de l'enregistrement différé de la CLI racine.
Ce chemin de compatibilité urgent reste pris en charge, mais il n'installe pas
de placeholders basés sur des descripteurs pour le chargement différé au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut d'un
backend CLI local tel que `claude-cli` ou `codex-cli`.

- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle comme `claude-cli/opus`.
- Le `config` du backend utilise la même structure que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur prime toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la
  defaut du plugin avant d'exécuter la CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion
  (par exemple pour normaliser les anciennes formes d'indicateurs).

### Emplacements exclusifs

| Méthode                                    | Ce qu'il enregistre                     |
| ------------------------------------------ | --------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois) |
| `api.registerMemoryPromptSection(builder)` | Générateur de section de prompt mémoire |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidange mémoire    |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution mémoire          |

### Adaptateurs d'intégration mémoire

| Méthode                                        | Ce qu'il enregistre                                   |
| ---------------------------------------------- | ----------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'intégration mémoire pour le plugin actif |

- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont exclusifs aux plugins de mémoire.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'incorporation (par exemple `openai`, `gemini`, ou un
  identifiant défini par un plugin personnalisé).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                       |
| -------------------------------------------- | ----------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé           |
| `api.onConversationBindingResolved(handler)` | Callback de liaison de conversation |

### Sémantique de décision du hook

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est traité comme une absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `before_install` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_install` : renvoyer `{ block: false }` est traité comme une absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `message_sending` : renvoyer `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `message_sending` : renvoyer `{ cancel: false }` est traité comme une absence de décision (identique à l'omission de `cancel`), et non comme une substitution.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                             |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Identifiant du plugin                                                   |
| `api.name`               | `string`                  | Nom d'affichage                                                         |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                          |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                      |
| `api.source`             | `string`                  | Chemin source du plugin                                                 |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle                                 |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin depuis `plugins.entries.<id>.config` |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/en/plugins/sdk-runtime)                       |
| `api.logger`             | `PluginLogger`            | Journaliste délimité (`debug`, `info`, `warn`, `error`)                 |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`, `"setup-only"`, `"setup-runtime"`, ou `"cli-metadata"`        |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                        |

## Convention de module interne

Au sein de votre plugin, utilisez des fichiers "barrel" locaux pour les importations internes :

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

<Warning>
  Le code de production de l'extension doit également éviter les importations `openclaw/plugin-sdk/<other-plugin>`.
  Si un assistant est véritablement partagé, promouvez-le vers un sous-chemin SDK neutre
  tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre
  surface orientée capacité au lieu de coupler deux plugins ensemble.
</Warning>

## Connexes

- [Points d'entrée](/en/plugins/sdk-entrypoints) — options `definePluginEntry` et `defineChannelPluginEntry`
- [Assistants d'exécution](/en/plugins/sdk-runtime) — référence complète de l'espace de noms `api.runtime`
- [Configuration et installation](/en/plugins/sdk-setup) — empaquetage, manifestes, schémas de configuration
- [Tests](/en/plugins/sdk-testing) — utilitaires de test et règles de linting
- [Migration du SDK](/en/plugins/sdk-migration) — migration depuis les surfaces obsolètes
- [Fonctionnement interne des plugins](/en/plugins/architecture) — architecture approfondie et modèle de capacité
