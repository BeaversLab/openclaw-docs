---
summary: "Carte d'importation, référence de l'API et architecture du SDK"
title: "Aperçu du SDK de plugin"
sidebarTitle: "Aperçu du SDK"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

Le SDK de plugin constitue le contrat typé entre les plugins et le cœur du système. Cette page est la référence pour **ce qu'il faut importer** et **ce que vous pouvez enregistrer**.

<Tip>
  Vous cherchez plutôt un guide pratique ?

- Premier plugin ? Commencez par [Créer des plugins](/fr/plugins/building-plugins).
- Plugin de channel ? Consultez [Plugins de channel](/fr/plugins/sdk-channel-plugins).
- Plugin de fournisseur ? Consultez [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins).
- Plugin d'outil ou de hook de cycle de vie ? Consultez [Hooks de plugin](/fr/plugins/hooks).
  </Tip>

## Convention d'importation

Importez toujours depuis un sous-chemin spécifique :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

Chaque sous-chemin est un petit module autonome. Cela permet de garder le démarrage rapide et d'éviter les problèmes de dépendances circulaires. Pour les assistants d'entrée/de build spécifiques à un channel, préférez `openclaw/plugin-sdk/channel-core` ; gardez `openclaw/plugin-sdk/core` pour la surface générale et les assistants partagés tels que `buildChannelConfigSchema`.

Pour la configuration du channel, publiez le schéma JSON propriétaire du channel via `openclaw.plugin.json#channelConfigs`. Le sous-chemin `plugin-sdk/channel-config-schema` est destiné aux primitives de schéma partagées et au générateur générique. Les exportations de schéma de canal groupé obsolètes se trouvent sur `plugin-sdk/channel-config-schema-legacy` uniquement pour la compatibilité groupée ; elles ne constituent pas un modèle pour les nouveaux plugins.

<Warning>
  Do not import provider- or channel-branded convenience seams (for example
  `openclaw/plugin-sdk/slack`, `.../discord`, `.../signal`, `.../whatsapp`).
  Bundled plugins compose generic SDK subpaths inside their own `api.ts` /
  `runtime-api.ts` barrels; core consumers should either use those plugin-local
  barrels or add a narrow generic SDK contract when a need is truly
  cross-channel.

A small set of bundled-plugin helper seams (`plugin-sdk/feishu`,
`plugin-sdk/zalo`, `plugin-sdk/matrix*`, and similar) still appear in the
generated export map. They exist for bundled-plugin maintenance only and are
not recommended import paths for new third-party plugins.

</Warning>

## Référence des sous-chemins

Le plugin SDK est exposé sous la forme d'un ensemble de sous-chemins étroits groupés par domaine (point d'entrée du plugin, channel, provider, auth, runtime, capability, mémoire et helpers réservés aux plugins groupés). Pour le catalogue complet — groupé et lié — voir [Sous-chemins du plugin SDK](/fr/plugins/sdk-subpaths).

La liste générée de plus de 200 sous-chemins réside dans `scripts/lib/plugin-sdk-entrypoints.json`.

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces méthodes :

### Enregistrement des capacités

| Méthode                                          | Ce qu'il enregistre                          |
| ------------------------------------------------ | -------------------------------------------- |
| `api.registerProvider(...)`                      | Inférence de texte (LLM)                     |
| `api.registerAgentHarness(...)`                  | Exécuteur d'agent expérimental de bas niveau |
| `api.registerCliBackend(...)`                    | Backend d'inférence CLI local                |
| `api.registerChannel(...)`                       | Channel de messagerie                        |
| `api.registerSpeechProvider(...)`                | Synthèse vocale / STT                        |
| `api.registerRealtimeTranscriptionProvider(...)` | Transcription en temps réel en flux continu  |
| `api.registerRealtimeVoiceProvider(...)`         | Sessions vocales en temps réel duplex        |
| `api.registerMediaUnderstandingProvider(...)`    | Analyse d'image/audio/vidéo                  |
| `api.registerImageGenerationProvider(...)`       | Génération d'images                          |
| `api.registerMusicGenerationProvider(...)`       | Génération de musique                        |
| `api.registerVideoGenerationProvider(...)`       | Génération de vidéo                          |
| `api.registerWebFetchProvider(...)`              | Provider de récupération/extraction Web      |
| `api.registerWebSearchProvider(...)`             | Recherche Web                                |

### Outils et commandes

| Méthode                         | Ce qu'il enregistre                            |
| ------------------------------- | ---------------------------------------------- |
| `api.registerTool(tool, opts?)` | Outil d'agent (requis ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)      |

Les commandes de plugin peuvent définir `agentPromptGuidance` lorsque l'agent a besoin d'un
indicateur de routage court et propriétaire de la commande. Gardez ce texte sur
la commande elle-même ; n'ajoutez pas de stratégie spécifique au fournisseur ou
au plugin aux générateurs d'invite principaux.

### Infrastructure

| Méthode                                        | Ce qu'il enregistre                              |
| ---------------------------------------------- | ------------------------------------------------ |
| `api.registerHook(events, handler, opts?)`     | Hook d'événement                                 |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP Gateway                |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway RPC                              |
| `api.registerGatewayDiscoveryService(service)` | Annonceur de découverte Gateway locale           |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                                |
| `api.registerService(service)`                 | Service d'arrière-plan                           |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif                          |
| `api.registerAgentToolResultMiddleware(...)`   | Intergiciel de résultat d'outil d'exécution      |
| `api.registerMemoryPromptSupplement(builder)`  | Section d'invite additive adjacente à la mémoire |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de recherche/lecture de mémoire additive  |

<Note>Les espaces de noms d'administration principaux réservés (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent toujours `operator.admin`, même si un plugin tente d'attribuer une portée de méthode de passerelle plus étroite. Privilégiez les préfixes spécifiques au plugin pour les méthodes détenues par le plugin.</Note>

<Accordion title="Quand utiliser l'intergiciel de résultat d'outil">
  Les plugins groupés peuvent utiliser `api.registerAgentToolResultMiddleware(...)` lorsqu'ils
  ont besoin de réécrire un résultat d'outil après l'exécution et avant que l'exécution
  ne renvoie ce résultat dans le model. Il s'agit de la jonction neutre de confiance
  pour les réducteurs de sortie asynchrones tels que tokenjuice.

Les plugins groupés doivent déclarer `contracts.agentToolResultMiddleware` pour chaque
exécution ciblée, par exemple `["pi", "codex"]`. Les plugins externes
ne peuvent pas enregistrer cet intergiciel ; gardez les hooks de plugin OpenClaw normaux pour le travail
qui n'a pas besoin du timing du résultat d'outil pré-model. L'ancien chemin d'enregistrement de
la fabrique d'extension intégrée uniquement pour Pi a été supprimé.

</Accordion>

### Enregistrement de la découverte Gateway

`api.registerGatewayDiscoveryService(...)` permet à un plugin d'annoncer le Gateway actif sur un transport de découverte local tel que mDNS/Bonjour. OpenClaw appelle le service lors du démarrage du Gateway lorsque la découverte locale est activée, transmet les ports actuels du Gateway et les données d'indication TXT non secrètes, et appelle le gestionnaire `stop` renvoyé lors de l'arrêt du Gateway.

```typescript
api.registerGatewayDiscoveryService({
  id: "my-discovery",
  async advertise(ctx) {
    const handle = await startMyAdvertiser({
      gatewayPort: ctx.gatewayPort,
      tls: ctx.gatewayTlsEnabled,
      displayName: ctx.machineDisplayName,
    });
    return { stop: () => handle.stop() };
  },
});
```

Les plugins de découverte Gateway ne doivent pas traiter les valeurs TXT annoncées comme des secrets ou une authentification. La découverte est une indication de routage ; l'authentification Gateway et l'épinglage TLS possèdent toujours la confiance.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de premier niveau :

- `commands` : racines de commandes explicites détenues par le registrar
- `descriptors` : descripteurs de commandes au moment de l'analyse utilisés pour l'aide de la CLI racine, le routage et l'enregistrement différé de la CLI du plugin

Si vous souhaitez qu'une commande de plugin reste chargée en différé dans le chemin normal de la CLI racine, fournissez `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce registrar.

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

Utilisez `commands` seul uniquement lorsque vous n'avez pas besoin d'un enregistrement différé de la CLI racine. Ce chemin de compatibilité hâtive reste pris en charge, mais il n'installe pas de substituts (placeholders) basés sur des descripteurs pour le chargement différé au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut d'un backend d'CLI local tel que `codex-cli`.

- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle comme `codex-cli/gpt-5`.
- Le `config` du backend utilise la même forme que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur l'emporte toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la valeur par défaut du plugin avant d'exécuter la CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion (par exemple pour normaliser les anciennes formes d'indicateurs).

### Slots exclusifs

| Méthode                                    | Ce qu'il enregistre                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois). La fonction de rappel `assemble()` reçoit `availableTools` et `citationsMode` afin que le moteur puisse adapter les ajouts de prompt. |
| `api.registerMemoryCapability(capability)` | Capacité de mémoire unifiée                                                                                                                                                    |
| `api.registerMemoryPromptSection(builder)` | Générateur de section de prompt de mémoire                                                                                                                                     |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire                                                                                                                                         |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire                                                                                                                                              |

### Adaptateurs d'intégration de mémoire

| Méthode                                        | Ce qu'il enregistre                                      |
| ---------------------------------------------- | -------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'intégration de mémoire pour le plugin actif |

- `registerMemoryCapability` est l'API exclusive préférée pour les plugins de mémoire.
- `registerMemoryCapability` peut également exposer `publicArtifacts.listArtifacts(...)`
  afin que les plugins compagnons puissent consommer les artefacts de mémoire exportés via
  `openclaw/plugin-sdk/memory-host-core` au lieu d'accéder à la structure privée d'un
  plugin de mémoire spécifique.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont des API exclusives de plugin de mémoire compatibles avec les versions héritées.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'intégration (par exemple `openai`, `gemini`, ou un identifiant
  personnalisé défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

Voir [Plugin hooks](/fr/plugins/hooks) pour des exemples, des noms de hooks courants et la sémantique
de garde.

### Sémantique de décision de hook

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est traité comme une absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `before_install` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_install` : renvoyer `{ block: false }` est traité comme une absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `reply_dispatch` : le retour de `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame la répartition, les gestionnaires de moindre priorité et le chemin de répartition du modèle par défaut sont ignorés.
- `message_sending` : le retour de `{ cancel: true }` est terminal. Une fois qu'un gestionnaire le définit, les gestionnaires de moindre priorité sont ignorés.
- `message_sending` : le retour de `{ cancel: false }` est considéré comme l'absence de décision (identique à l'omission de `cancel`), et non comme une substitution.
- `message_received` : utilisez le champ typé `threadId` lorsque vous avez besoin d'un routage de fil/sujet entrant. Réservez `metadata` pour les extras spécifiques au canal.
- `message_sending` : utilisez les champs de routage typés `replyToId` / `threadId` avant de revenir aux `metadata` spécifiques au canal.
- `gateway_start` : utilisez `ctx.config`, `ctx.workspaceDir` et `ctx.getCron?.()` pour l'état de démarrage détenu par la passerelle au lieu de vous fier aux crochets `gateway:startup` internes.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                            |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | ID du plugin                                                                                                           |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                        |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                         |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                     |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                                |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                                                               |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsque disponible)                   |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin provenant de `plugins.entries.<id>.config`                                          |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/fr/plugins/sdk-runtime)                                                                      |
| `api.logger`             | `PluginLogger`            | Journalisateur délimité (`debug`, `info`, `warn`, `error`)                                                             |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre de démarrage/configuration légère avant l'entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                                                                       |

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
  à partir du code de production. Acheminez les importations internes via `./api.ts` ou
  `./runtime-api.ts`. Le chemin du SDK est uniquement le contrat externe.
</Warning>

Les surfaces publiques de plugins regroupés chargés par façade (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` et fichiers d'entrée publics similaires) préfèrent l'instantané de configuration d'exécution actif lorsque OpenClaw est déjà en cours d'exécution. Si aucun instantané d'exécution n'existe encore, ils reviennent au fichier de configuration résolu sur le disque.

Les plugins fournisseur peuvent exposer un contrat local étroit pour le plugin lorsqu'une fonction auxiliaire est intentionnellement spécifique au fournisseur et n'appartient pas encore à un sous-chemin SDK générique. Exemples regroupés :

- **Anthropic** : jointure publique `api.ts` / `contract-api.ts` pour l'en-tête bêta Claude
  et les aides de flux `service_tier`.
- **`@openclaw/openai-provider`** : `api.ts` exporte les constructeurs de fournisseur,
  les aides de modèle par défaut et les constructeurs de fournisseur en temps réel.
- **`@openclaw/openrouter-provider`** : `api.ts` exporte le constructeur de fournisseur
  ainsi que les aides d'intégration/configuration.

<Warning>
  Le code de production d'extension doit également éviter les importations `openclaw/plugin-sdk/<other-plugin>`
  . Si une fonction auxiliaire est vraiment partagée, promouvez-la vers un sous-chemin SDK neutre
  tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre
  surface orientée capacité au lieu de coupler deux plugins ensemble.
</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Points d'entrée" icon="door-open" href="/fr/plugins/sdk-entrypoints">
    Options `definePluginEntry` et `defineChannelPluginEntry`.
  </Card>
  <Card title="Assistants d'exécution" icon="gears" href="/fr/plugins/sdk-runtime">
    Référence complète de l'espace de noms `api.runtime`.
  </Card>
  <Card title="Configuration et installation" icon="sliders" href="/fr/plugins/sdk-setup">
    Packaging, manifests et schémas de configuration.
  </Card>
  <Card title="Tests" icon="vial" href="/fr/plugins/sdk-testing">
    Utilitaires de test et règles de linting.
  </Card>
  <Card title="Migration du SDK" icon="arrows-turn-right" href="/fr/plugins/sdk-migration">
    Migration depuis les surfaces dépréciées.
  </Card>
  <Card title="Fonctionnement interne des plugins" icon="diagram-project" href="/fr/plugins/architecture">
    Architecture approfondie et modèle de capacités.
  </Card>
</CardGroup>
