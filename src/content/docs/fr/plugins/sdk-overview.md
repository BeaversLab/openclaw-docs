---
summary: "APIImport map, référence de l'API d'enregistrement et architecture du SDK"
title: "Aperçu du SDK de plugin"
sidebarTitle: "Aperçu du SDK de plugin"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

Le SDK de plugin constitue le contrat typé entre les plugins et le cœur du système. Cette page est la référence pour **ce qu'il faut importer** et **ce que vous pouvez enregistrer**.

<Note>Cette page est destinée aux auteurs de plugins utilisant `openclaw/plugin-sdk/*`OpenClawGatewayOpenClaw à l'intérieur d'OpenClaw. Pour les applications externes, les scripts, les tableaux de bord, les tâches CI et les extensions IDE qui souhaitent exécuter des agents via le Gateway, utilisez plutôt le [OpenClaw App SDK](/fr/concepts/openclaw-sdk) et le package `@openclaw/sdk`.</Note>

<Tip>
  Vous cherchez plutôt un guide pratique ? Commencez par [Building plugins](/fr/plugins/building-plugins), utilisez [Channel plugins](/fr/plugins/sdk-channel-plugins) pour les plugins de canal, [Provider plugins](/fr/plugins/sdk-provider-pluginsCLI) pour les plugins de fournisseur, [CLI backend plugins](/fr/plugins/cli-backend-pluginsCLI) pour les backends CLI d'IA locale, et [Plugin
  hooks](/fr/plugins/hooks) pour les plugins d'outils ou de crochets de cycle de vie.
</Tip>

## Convention d'importation

Importez toujours depuis un sous-chemin spécifique :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

Chaque sous-chemin est un petit module autonome. Cela permet un démarrage rapide et évite les problèmes de dépendances circulaires. Pour les assistants d'entrée/compilation spécifiques aux canaux, préférez `openclaw/plugin-sdk/channel-core` ; gardez `openclaw/plugin-sdk/core` pour l'interface globale et les assistants partagés tels que `buildChannelConfigSchema`.

Pour la configuration du canal, publiez le JSON Schema du canal via `openclaw.plugin.json#channelConfigs`. Le sous-chemin `plugin-sdk/channel-config-schema`OpenClaw est destiné aux primitives de schéma partagées et au générateur générique. Les plugins intégrés d'OpenClaw utilisent `plugin-sdk/bundled-channel-config-schema` pour les schémas de canaux intégrés conservés. Les exportations de compatibilité obsolètes restent sur `plugin-sdk/channel-config-schema-legacy` ; aucun des sous-chemins de schéma intégré n'est un modèle pour les nouveaux plugins.

<Warning>
  N'importez pas les interfaces de commodité marquées par un fournisseur ou un canal (par exemple
  `openclaw/plugin-sdk/slack`, `.../discord`, `.../signal`, `.../whatsapp`).
  Les plugins groupés composent des sous-chemins SDK génériques à l'intérieur de leurs propres `api.ts` /
  `runtime-api.ts` (barrels) ; les consommateurs du cœur doivent soit utiliser ces
  (barrels) locaux au plugin, soit ajouter un contrat SDK générique étroit lorsqu'un besoin est
  véritablement inter-canaux.

Un petit ensemble d'interfaces d'aide pour les plugins groupés apparaît toujours dans la carte
d'export générée lorsqu'ils ont une utilisation par le propriétaire suivie. Ils n'existent que pour la
maintenance des plugins groupés et ne sont pas des chemins d'importation recommandés pour les nouveaux
plugins tiers.

`openclaw/plugin-sdk/discord` et `openclaw/plugin-sdk/telegram-account` sont
également conservés comme façades de compatibilité dépréciées pour une utilisation par le propriétaire suivie.
Ne copiez pas ces chemins d'importation dans de nouveaux plugins ; utilisez plutôt les aides d'exécution
injectées et les sous-chemins SDK de canal génériques.

</Warning>

## Référence du sous-chemin

Le SDK de plugin est exposé sous la forme d'un ensemble de sous-chemins étroits groupés par domaine (point d'entrée du plugin, canal, fournisseur, authentification, runtime, capacité, mémoire et assistants de plugin groupés réservés). Pour le catalogue complet — groupé et lié — voir [Plugin SDK subpaths](/fr/plugins/sdk-subpaths).

L'inventaire des points d'entrée du compilateur réside dans `scripts/lib/plugin-sdk-entrypoints.json` ; les exportations du package sont générées à partir du sous-ensemble public après soustraction des sous-chemins de test/internal locaux au référentiel répertoriés dans `scripts/lib/plugin-sdk-private-local-only-subpaths.json`. Exécutez `pnpm plugin-sdk:surface` pour vérifier le nombre d'exportations publiques. Les sous-chemins publics obsolètes suffisamment anciens et non utilisés par le code de production des extensions groupées sont suivis dans `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` ; les barils de réexportation obsolètes larges sont suivis dans `scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json`.

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces méthodes :

### Enregistrement des capacités

| Méthode                                          | Ce qu'il enregistre                          |
| ------------------------------------------------ | -------------------------------------------- |
| `api.registerProvider(...)`                      | Inférence de texte (LLM)                     |
| `api.registerAgentHarness(...)`                  | Exécuteur d'agent de bas niveau expérimental |
| `api.registerCliBackend(...)`                    | Backend d'inférence CLI local                |
| `api.registerChannel(...)`                       | Canal de messagerie                          |
| `api.registerSpeechProvider(...)`                | Synthèse vocale / STT                        |
| `api.registerRealtimeTranscriptionProvider(...)` | Transcription en temps réel en continu       |
| `api.registerRealtimeVoiceProvider(...)`         | Sessions vocales duplex en temps réel        |
| `api.registerMediaUnderstandingProvider(...)`    | Analyse d'image/audio/vidéo                  |
| `api.registerImageGenerationProvider(...)`       | Génération d'images                          |
| `api.registerMusicGenerationProvider(...)`       | Génération de musique                        |
| `api.registerVideoGenerationProvider(...)`       | Génération vidéo                             |
| `api.registerWebFetchProvider(...)`              | Provider de récupération/extraction Web      |
| `api.registerWebSearchProvider(...)`             | Recherche Web                                |

### Outils et commandes

| Méthode                         | Ce qu'il enregistre                            |
| ------------------------------- | ---------------------------------------------- |
| `api.registerTool(tool, opts?)` | Outil d'agent (requis ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)      |

Les commandes de plugin peuvent définir `agentPromptGuidance` lorsque l'agent a besoin d'un indicateur de routage court et propriétaire de la commande. Conservez ce texte sur la commande elle-même ; n'ajoutez pas de stratégie spécifique au fournisseur ou au plugin aux constructeurs de prompts principaux.

### Infrastructure

| Méthode                                        | Ce qu'il enregistre                                     |
| ---------------------------------------------- | ------------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Hook d'événement                                        |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP Gateway                       |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway RPC                                     |
| `api.registerGatewayDiscoveryService(service)` | Annonceur de découverte Gateway locale                  |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                                       |
| `api.registerNodeCliFeature(registrar, opts?)` | Fonctionnalité de nœud CLI sous `openclaw nodes`        |
| `api.registerService(service)`                 | Service d'arrière-plan                                  |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif                                 |
| `api.registerAgentToolResultMiddleware(...)`   | Middleware de résultat d'outil au moment de l'exécution |
| `api.registerMemoryPromptSupplement(builder)`  | Section d'invite additive adjacente à la mémoire        |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de recherche/lecture de mémoire additive         |

### Hooks d'hôte pour les plugins de workflow

Les hooks d'hôte sont les points d'assemblage du SDK pour les plugins qui doivent participer au cycle de vie de l'hôte plutôt que d'ajouter simplement un provider, un canal ou un outil. Ce sont des contrats génériques ; le mode Plan peut les utiliser, mais les flux de travail d'approbation, les portails de stratégie d'espace de travail, les moniteurs d'arrière-plan, les assistants de configuration et les plugins compagnons d'interface utilisateur peuvent aussi les utiliser.

| Méthode                                                                              | Contrat qu'il possède                                                                                                                                                            |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | État de session compatible JSON et appartenant au plugin, projeté via les sessions Gateway                                                                                       |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | Contexte durable exactement une fois injecté dans le prochain tour d'agent pour une session                                                                                      |
| `api.registerTrustedToolPolicy(...)`                                                 | Stratégie d'outil pré-plugin groupée/de confiance pouvant bloquer ou réécrire les paramètres d'outil                                                                             |
| `api.registerToolMetadata(...)`                                                      | Métadonnées d'affichage du catalogue d'outils sans modifier l'implémentation de l'outil                                                                                          |
| `api.registerCommand(...)`                                                           | Commandes de plugin délimitées ; les résultats des commandes peuvent définir `continueAgent: true` ; les commandes natives Discord prennent en charge `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | Descripteurs de contribution de l'interface utilisateur de contrôle pour les surfaces de session, d'outil, d'exécution ou de paramètres                                          |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | Rappels de nettoyage pour les ressources d'exécution détenues par le plugin sur les chemins de réinitialisation/suppression/rechargement                                         |
| `api.agent.events.registerAgentEventSubscription(...)`                               | Abonnements aux événements désinfectés pour l'état et les moniteurs du flux de travail                                                                                           |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | État de brouillon du plugin par exécution effacé lors du cycle de vie de l'exécution terminale                                                                                   |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | Nettoyage des métadonnées pour les tâches du planificateur appartenant au plugin ; ne planifie pas de travail ni ne crée d'enregistrements de tâches                             |
| `api.session.workflow.sendSessionAttachment(...)`                                    | Livraison de pièces jointes fichiers médiées par l'hôte, uniquement groupée, vers l'itinéraire de session sortant direct actif                                                   |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | Tours de session planifiés basés sur Cron, uniquement groupés, plus nettoyage basé sur des balises                                                                               |
| `api.session.controls.registerSessionAction(...)`                                    | Actions de session typées que les clients peuvent envoyer via le Gateway                                                                                                         |

Utilisez les espaces de noms groupés pour le nouveau code de plugin :

- `api.session.state.registerSessionExtension(...)`
- `api.session.workflow.enqueueNextTurnInjection(...)`
- `api.session.workflow.registerSessionSchedulerJob(...)`
- `api.session.workflow.sendSessionAttachment(...)`
- `api.session.workflow.scheduleSessionTurn(...)`
- `api.session.workflow.unscheduleSessionTurnsByTag(...)`
- `api.session.controls.registerSessionAction(...)`
- `api.session.controls.registerControlUiDescriptor(...)`
- `api.agent.events.registerAgentEventSubscription(...)`
- `api.agent.events.emitAgentEvent(...)`
- `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`
- `api.lifecycle.registerRuntimeLifecycle(...)`

Les méthodes plates équivalentes restent disponibles en tant qu'alias de compatibilité obsolètes pour les plugins existants. N'ajoutez pas de nouveau code de plugin qui appelle directement `api.registerSessionExtension`, `api.enqueueNextTurnInjection`, `api.registerControlUiDescriptor`, `api.registerRuntimeLifecycle`, `api.registerAgentEventSubscription`, `api.emitAgentEvent`, `api.setRunContext`, `api.getRunContext`, `api.clearRunContext`, `api.registerSessionSchedulerJob`, `api.registerSessionAction`, `api.sendSessionAttachment`, `api.scheduleSessionTurn` ou `api.unscheduleSessionTurnsByTag`.

`scheduleSessionTurn(...)` est une commodité à portée de session basée sur le planificateur Cron du Gateway. Cron gère le minutage et crée l'enregistrement de tâche en arrière-plan lorsque le tour s'exécute ; le Plugin SDK se contente de contraindre la session cible, la dénomination détenue par le plugin et le nettoyage. Utilisez `api.runtime.tasks.managedFlows` à l'intérieur du tour programmé lorsque le travail lui-même nécessite un état durable de flux de tâches en plusieurs étapes.

Les contrats divisent intentionnellement l'autorité :

- Les plugins externes peuvent posséder des extensions de session, des descripteurs d'interface utilisateur, des commandes, des métadonnées de tool, des injections de tour suivant et des hooks normaux.
- Les stratégies de tool de confiance s'exécutent avant les hooks `before_tool_call` ordinaires et sont réservées aux bundles car elles participent à la politique de sécurité de l'hôte.
- La propriété réservée des commandes est réservée aux bundles. Les plugins externes doivent utiliser leurs propres noms ou alias de commande.
- `allowPromptInjection=false` désactive les hooks de mutation de prompt, y compris `agent_turn_prepare`, `before_prompt_build`, `heartbeat_prompt_contribution`, les champs de prompt de l'ancien `before_agent_start` et `enqueueNextTurnInjection`.

Exemples de consommateurs non-Plan :

| Archétype de plugin                         | Hooks utilisés                                                                                                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow d'approbation                      | Extension de session, continuation de commande, injection de tour suivant, descripteur d'interface utilisateur                                                                         |
| Porte de stratégie budgétaire/de workspace  | Stratégie d'outil de confiance, métadonnées d'outil, projection de session                                                                                                             |
| Moniteur du cycle de vie en arrière-plan    | Nettoyage du cycle de vie d'exécution, abonnement aux événements de l'agent, propriétaire/nettoyage du planificateur de session, contribution de l'invite de heartbeat, descripteur UI |
| Assistant de configuration ou d'intégration | Extension de session, commandes délimitées, descripteur de l'interface de contrôle                                                                                                     |

<Note>Les espaces de noms admin principaux réservés (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent toujours `operator.admin`, même si un plugin tente d'assigner une portée de méthode de passerelle plus étroite. Privilégiez les préfixes spécifiques aux plugins pour les méthodes détenues par les plugins.</Note>

<Accordion title="Quand utiliser l'intergiciel de résultat d'outil">
  Les plugins groupés peuvent utiliser `api.registerAgentToolResultMiddleware(...)` lorsqu'ils
  ont besoin de réécrire un résultat d'outil après exécution et avant que le runtime
  ne renvoie ce résultat dans le modèle. Il s'agit de la jonction neutre de runtime sécurisée
  pour les réducteurs de sortie asynchrones tels que tokenjuice.

Les plugins groupés doivent déclarer `contracts.agentToolResultMiddleware` pour chaque
cible runtime, par exemple `["pi", "codex"]`. Les plugins externes
ne peuvent pas enregistrer cet intergiciel ; gardez les hooks normaux de plugin OpenClaw pour le travail
qui ne nécessite pas de synchronisation de résultat d'outil pré-modèle. L'ancien chemin d'enregistrement
usine d'extension intégrée uniquement pour Pi a été supprimé.

</Accordion>

### Enregistrement Gateway discovery

`api.registerGatewayDiscoveryService(...)` permet à un plugin d'annoncer le Gateway actif
sur un transport de découverte local tel que mDNS/Bonjour. OpenClaw appelle le
service lors du démarrage du Gateway lorsque la découverte locale est activée, transmet les
ports actuels du Gateway et les données de suggestion TXT non secrètes, et appelle le gestionnaire
`stop` retourné lors de l'arrêt du Gateway.

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

Les plugins de découverte Gateway ne doivent pas traiter les valeurs TXT annoncées comme des secrets ou
une authentification. La découverte est une indication de routage ; l'authentification Gateway et le épinglage TLS
conservernt toujours la confiance.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de commande :

- `commands` : noms de commandes explicites détenus par le registrant
- `descriptors` : descripteurs de commande au moment de l'analyse utilisés pour l'aide CLI,
  le routage et l'enregistrement différé des plugins CLI
- `parentPath` : chemin de commande parent facultatif pour les groupes de commandes imbriqués, tel que
  `["nodes"]`

Pour les fonctionnalités à nœuds couplés, préférez
`api.registerNodeCliFeature(registrar, opts?)`. Il s'agit d'un petit wrapper autour de
`api.registerCli(..., { parentPath: ["nodes"] })` qui rend des commandes telles que
`openclaw nodes canvas` des fonctionnalités de nœud explicitement détenues par le plugin.

Si vous souhaitez qu'une commande de plugin reste chargée à la demande dans le chemin normal de la racine CLI,
fournissez `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce
registrant.

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

Les commandes imbriquées reçoivent la commande parente résolue en tant que `program` :

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerNodesCanvasCommands } = await import("./src/cli.js");
    registerNodesCanvasCommands(program);
  },
  {
    parentPath: ["nodes"],
    descriptors: [
      {
        name: "canvas",
        description: "Capture or render canvas content from a paired node",
        hasSubcommands: true,
      },
    ],
  },
);
```

Utilisez `commands` seul uniquement lorsque vous n'avez pas besoin de l'enregistrement différé de la racine CLI.
Ce chemin de compatité rapide reste pris en charge, mais il n'installe pas
de placeholders basés sur des descripteurs pour le chargement différé au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut d'un
backend d'CLI local tel que `codex-cli`.

- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle comme `codex-cli/gpt-5`.
- Le `config` du backend utilise la même forme que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur l'emporte toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la
  valeur par défaut du plugin avant d'exécuter le CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion
  (par exemple pour normaliser les anciennes formes de drapeaux).
- Utilisez `resolveExecutionArgs` pour les réécritures argv limitées à la requête qui appartiennent au
  dialecte CLI, telles que le mappage des niveaux de réflexion OpenClaw vers un
  drapeau d'effort natif.

Pour un guide de création complet, consultez
[Plugins de backend CLI](CLI/en/plugins/cli-backend-plugins).

### Slots exclusifs

| Méthode                                    | Ce qu'il enregistre                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois). Le rappel `assemble()` reçoit `availableTools` et `citationsMode` afin que le moteur puisse adapter les ajouts de prompt. |
| `api.registerMemoryCapability(capability)` | Capacité de mémoire unifiée                                                                                                                                        |
| `api.registerMemoryPromptSection(builder)` | Constructeur de section de prompt de mémoire                                                                                                                       |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire                                                                                                                             |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire                                                                                                                                  |

### Adaptateurs d'intégration de mémoire

| Méthode                                        | Ce qu'il enregistre                                      |
| ---------------------------------------------- | -------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'intégration de mémoire pour le plugin actif |

- `registerMemoryCapability`API est l'API exclusive de plugin de mémoire préférée.
- `registerMemoryCapability` peut également exposer `publicArtifacts.listArtifacts(...)`
  afin que les plugins compagnons puissent consommer les artefacts de mémoire exportés via
  `openclaw/plugin-sdk/memory-host-core` au lieu d'accéder à la structure privée
  d'un plugin de mémoire spécifique.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont des API exclusives de plugin de mémoire compatibles avec l'héritage.
- `MemoryFlushPlan.model` peut épingler le tour de vidage à une référence `provider/model`
  exacte, telle que `ollama/qwen3:8b`, sans hériter de la chaîne de repli
  active.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'intégration (par exemple `openai`, `gemini` ou un identifiant personnalisé
  défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

Consultez [Hooks de plugin](/fr/plugins/hooks) pour des exemples, des noms de hooks courants et la sémantique
de garde.

### Sémantique de décision de hook

- `before_tool_call` : le renvoi de `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_tool_call` : le renvoi de `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme un remplacement.
- `before_install` : le renvoi de `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_install` : le renvoi de `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme un remplacement.
- `reply_dispatch` : le renvoi de `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame la répartition, les gestionnaires de moindre priorité et le chemin de répartition du modèle par défaut sont ignorés.
- `message_sending` : le renvoi de `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `message_sending` : le renvoi de `{ cancel: false }` est traité comme l'absence de décision (identique à l'omission de `cancel`), et non comme un remplacement.
- `message_received` : utilisez le champ typé `threadId` lorsque vous avez besoin d'un routage de discussion/sujet entrant. Gardez `metadata` pour les éléments spécifiques au channel.
- `message_sending` : utilisez les champs de routage typés `replyToId` / `threadId` avant de revenir aux `metadata` spécifiques au channel.
- `gateway_start` : utilisez `ctx.config`, `ctx.workspaceDir` et `ctx.getCron?.()` pour l'état de démarrage détenu par la passerelle au lieu de vous fier aux hooks internes `gateway:startup`.
- `cron_changed` : observez les modifications du cycle de vie cron détenues par la passerelle. Utilisez `event.job?.state?.nextRunAtMs` et `ctx.getCron?.()` lors de la synchronisation des planificateurs de réveil externes, et conservez OpenClaw comme source de vérité pour les vérifications d'échéance et l'exécution.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                        |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `api.id`                 | `string`                  | ID du plugin                                                                                                       |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                    |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                     |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                 |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                            |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                                                           |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsque disponible)               |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin depuis `plugins.entries.<id>.config`                                            |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/fr/plugins/sdk-runtime)                                                                  |
| `api.logger`             | `PluginLogger`            | Enregistreur d'étendue (`debug`, `info`, `warn`, `error`)                                                          |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre légère de démarrage/configuration pré-entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                                                                   |

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
  depuis le code de production. Acheminez les importations internes via `./api.ts` ou
  `./runtime-api.ts`. Le chemin du SDK est uniquement le contrat externe.
</Warning>

Les surfaces publiques des plugins groupés chargés par façade (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` et fichiers d'entrée publics similaires) préfèrent
le cliché de configuration d'exécution actif lorsque OpenClaw est déjà en cours d'exécution. Si aucun cliché d'exécution
n'existe encore, ils reviennent au fichier de configuration résolu sur le disque.
Les façades de plugins groupés empaquetés doivent être chargées via les chargeurs de
façade de plugins de OpenClaw ; les importations directes depuis `dist/extensions/...` contournent les
vérifications de manifeste et de sidecar d'exécution que les installations empaquetées utilisent pour le code détenu par le plugin.

Les plugins de fournisseur peuvent exposer un barrel de contrat local au plugin étroit lorsqu'une fonctionnalité d'aide est intentionnellement spécifique au fournisseur et n'appartient pas encore à un sous-chemin de SDK générique. Exemples groupés :

- **Anthropic** : jonction publique `api.ts` / `contract-api.ts` pour
  l'en-tête bêta de Claude et les fonctions d'aide de flux `service_tier`.
- **`@openclaw/openai-provider`** : `api.ts` exporte les constructeurs de fournisseur,
  les fonctions d'aide de modèle par défaut et les constructeurs de fournisseur en temps réel.
- **`@openclaw/openrouter-provider`** : `api.ts` exporte le constructeur de fournisseur
  ainsi que les fonctions d'aide d'intégration/configuration.

<Warning>
  Le code de production d'extension doit également éviter les importations `openclaw/plugin-sdk/<other-plugin>`.
  Si une fonctionnalité d'aide est véritablement partagée, promouvez-la vers un sous-chemin de SDK neutre
  tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre
  surface orientée capacité au lieu de coupler deux plugins ensemble.
</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Points d'entrée" icon="door-open" href="/fr/plugins/sdk-entrypoints">
    Options `definePluginEntry` et `defineChannelPluginEntry`.
  </Card>
  <Card title="Fonctions d'aide d'exécution" icon="gears" href="/fr/plugins/sdk-runtime">
    Référence complète de l'espace de noms `api.runtime`.
  </Card>
  <Card title="Configuration et installation" icon="sliders" href="/fr/plugins/sdk-setup">
    Empaquetage, manifestes et schémas de configuration.
  </Card>
  <Card title="Tests" icon="vial" href="/fr/plugins/sdk-testing">
    Utilitaires de test et règles de linting.
  </Card>
  <Card title="Migration du SDK" icon="arrows-turn-right" href="/fr/plugins/sdk-migration">
    Migration depuis les interfaces dépréciées.
  </Card>
  <Card title="Fonctionnement interne du plugin" icon="diagram-project" href="/fr/plugins/architecture">
    Architecture approfondie et model de capacités.
  </Card>
</CardGroup>
