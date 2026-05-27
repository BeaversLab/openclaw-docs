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

<Note>This page is for plugin authors using `openclaw/plugin-sdk/*`OpenClawGatewayOpenClaw inside OpenClaw. For external apps, scripts, dashboards, CI jobs, and IDE extensions that want to run agents through the Gateway, use the [OpenClaw App SDK](/fr/concepts/openclaw-sdk) and the `@openclaw/sdk` package instead.</Note>

<Tip>
  Looking for a how-to guide instead? Start with [Building plugins](/fr/plugins/building-plugins), use [Channel plugins](/fr/plugins/sdk-channel-plugins) for channel plugins, [Provider plugins](/fr/plugins/sdk-provider-pluginsCLI) for provider plugins, [CLI backend plugins](/fr/plugins/cli-backend-pluginsCLI) for local AI CLI backends, and [Plugin hooks](/fr/plugins/hooks) for tool or lifecycle
  hook plugins.
</Tip>

## Convention d'importation

Importez toujours depuis un sous-chemin spécifique :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

Chaque sous-chemin est un petit module autonome. Cela permet un démarrage rapide et
évite les problèmes de dépendances circulaires. Pour les assistants d'entrée/build spécifiques au canal,
privilégiez `openclaw/plugin-sdk/channel-core` ; gardez `openclaw/plugin-sdk/core` pour
la surface globale plus large et les assistants partagés tels que
`buildChannelConfigSchema`.

Pour la configuration du canal, publiez le schéma JSON détenu par le canal via
`openclaw.plugin.json#channelConfigs`. Le sous-chemin `plugin-sdk/channel-config-schema`OpenClaw
est destiné aux primitives de schéma partagées et au générateur générique. Les plugins
d'OpenClaw utilisent `plugin-sdk/bundled-channel-config-schema` pour les schémas
de canal groupés conservés. Les exportations de compatibilité obsolètes restent sur
`plugin-sdk/channel-config-schema-legacy` ; aucun sous-chemin de schéma groupé n'est un
modèle pour les nouveaux plugins.

<Warning>
  N'importez pas les seams de commodité estampillés provider ou channel (par exemple
  `openclaw/plugin-sdk/slack`, `.../discord`, `.../signal`, `.../whatsapp`).
  Les plugins groupés composent des sous-chemins SDK génériques dans leurs propres `api.ts` /
  `runtime-api.ts`; les consommateurs du cœur doivent soit utiliser ces `api.ts` locaux
  au plugin, soit ajouter un contrat SDK générique étroit lorsqu'un besoin est vraiment
  multi-canal.

Un petit ensemble de seams d'aide pour plugins groupés apparaît toujours dans la carte d'export
générée lorsqu'ils ont une utilisation par le propriétaire suivie. Ils existent uniquement pour la maintenance
des plugins groupés et ne sont pas des chemins d'importation recommandés pour les nouveaux plugins tiers.

`openclaw/plugin-sdk/discord` et `openclaw/plugin-sdk/telegram-account` sont
également conservés comme façades de compatibilité dépréciées pour une utilisation suivie par le propriétaire. Ne
copiez pas ces chemins d'importation dans de nouveaux plugins ; utilisez plutôt des aides d'exécution injectées et
des sous-chemins SDK de canal génériques.

</Warning>

## Référence du sous-chemin

The plugin SDK is exposed as a set of narrow subpaths grouped by area (plugin
entry, channel, provider, auth, runtime, capability, memory, and reserved
bundled-plugin helpers). For the full catalog — grouped and linked — see
[Plugin SDK subpaths](/fr/plugins/sdk-subpaths).

L'inventaire des points d'entrée du compilateur réside dans
`scripts/lib/plugin-sdk-entrypoints.json`; les exportations du package sont générées à partir
du sous-ensemble public après soustraction des sous-chemins de test interne locaux au dépôt répertoriés dans
`scripts/lib/plugin-sdk-private-local-only-subpaths.json`. Exécutez
`pnpm plugin-sdk:surface` pour auditer le nombre d'exportations publiques. Les sous-chemins publics dépréciés
assez anciens et non utilisés par le code de production des extensions groupées sont
suivis dans `scripts/lib/plugin-sdk-deprecated-public-subpaths.json`; les
de ré-exportation dépréciés larges sont suivis dans
`scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json`.

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces
méthodes :

### Enregistrement des capacités

| Méthode                                          | Ce qu'il enregistre                          |
| ------------------------------------------------ | -------------------------------------------- |
| `api.registerProvider(...)`                      | Inférence de texte (LLM)                     |
| `api.registerAgentHarness(...)`                  | Exécuteur d'agent de bas niveau expérimental |
| `api.registerCliBackend(...)`                    | Backend d'inférence CLI local                |
| `api.registerChannel(...)`                       | Canal de messagerie                          |
| `api.registerEmbeddingProvider(...)`             | Reusable vector embedding provider           |
| `api.registerSpeechProvider(...)`                | Text-to-speech / STT synthesis               |
| `api.registerRealtimeTranscriptionProvider(...)` | Streaming realtime transcription             |
| `api.registerRealtimeVoiceProvider(...)`         | Duplex realtime voice sessions               |
| `api.registerMediaUnderstandingProvider(...)`    | Image/audio/video analysis                   |
| `api.registerImageGenerationProvider(...)`       | Image generation                             |
| `api.registerMusicGenerationProvider(...)`       | Music generation                             |
| `api.registerVideoGenerationProvider(...)`       | Video generation                             |
| `api.registerWebFetchProvider(...)`              | Web fetch / scrape provider                  |
| `api.registerWebSearchProvider(...)`             | Web search                                   |

Embedding providers registered with `api.registerEmbeddingProvider(...)` must
also be listed in `contracts.embeddingProviders` in the plugin manifest. This
is the generic embedding surface for reusable vector generation. Memory-only
adapters still use `api.registerMemoryEmbeddingProvider(...)` and
`contracts.memoryEmbeddingProviders`.

### Tools and commands

Utilisez [`defineToolPlugin`](/fr/plugins/tool-plugins) pour les plugins simples composés uniquement d'outils
avec des noms d'outils fixes. Utilisez `api.registerTool(...)` directement pour les plugins mixtes
ou l'enregistrement d'outils entièrement dynamique.

| Méthode                         | Ce qu'il enregistre                                 |
| ------------------------------- | --------------------------------------------------- |
| `api.registerTool(tool, opts?)` | Outil d'agent (obligatoire ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)           |

Les commandes de plugin peuvent définir `agentPromptGuidance` lorsque l'agent a besoin d'un
indice de routage court et owned par la commande. Gardez ce texte concernant la commande elle-même ; n'ajoutez pas
de stratégie spécifique au fournisseur ou au plugin aux constructeurs de prompt principaux.

Les entrées de guidage peuvent être des chaînes héritées, qui s'appliquent à chaque surface de prompt, ou
des entrées structurées :

```ts
agentPromptGuidance: ["Global command hint.", { text: "Only show this in the main PI prompt.", surfaces: ["pi_main"] }];
```

`surfaces` structuré peut inclure `pi_main`, `codex_app_server`, `cli_backend`,
`acp_backend`, ou `subagent`. Omettez `surfaces` pour un guidage intentionnel pour toutes les surfaces.
Ne passez pas un tableau `surfaces` vide ; il est rejeté pour qu'une perte accidentelle
de portée ne devienne pas du texte de prompt global.

Les instructions de développeur du serveur d'application native Codex sont plus strictes que pour les autres surfaces
de prompt : seul le guidage explicitement délimité à `codex_app_server` est promu dans
cette voie à priorité plus élevée. Le guidage de chaîne hérité et le guidage structuré non délimité
restent disponibles pour les surfaces de prompt non-Codex pour la compatibilité.

### Infrastructure

| Méthode                                        | Ce qu'il enregistre                               |
| ---------------------------------------------- | ------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Hook d'événement                                  |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP Gateway                 |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway RPC                               |
| `api.registerGatewayDiscoveryService(service)` | Annonceur de découverte Gateway local             |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                                 |
| `api.registerNodeCliFeature(registrar, opts?)` | Fonctionnalité de nœud CLI sous `openclaw nodes`  |
| `api.registerService(service)`                 | Service d'arrière-plan                            |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif                           |
| `api.registerAgentToolResultMiddleware(...)`   | Middleware de résultat d'outil à l'exécution      |
| `api.registerMemoryPromptSupplement(builder)`  | Section de prompt additive adjacente à la mémoire |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de recherche/lecture de mémoire additive   |

### Hôtes de crochet pour les plugins de workflow

Les hôtes de crochet sont les points de liaison du SDK pour les plugins qui doivent participer au cycle de vie de l'hôte plutôt que de simplement ajouter un fournisseur, un canal ou un outil. Ce sont des contrats génériques ; le mode Plan peut les utiliser, tout comme les workflows d'approbation, les portes de stratégie d'espace de travail, les moniteurs en arrière-plan, les assistants de configuration et les plugins compagnons d'interface utilisateur.

| Méthode                                                                              | Contrat dont il est propriétaire                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | État de session compatible JSON et propriété du plugin, projeté via les sessions Gateway                                                                                         |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | Contexte durable exactement une fois injecté dans le prochain tour d'agent pour une session                                                                                      |
| `api.registerTrustedToolPolicy(...)`                                                 | Stratégie d'outil pré-plugin groupée/approuvée capable de bloquer ou de réécrire les paramètres d'outil                                                                          |
| `api.registerToolMetadata(...)`                                                      | Métadonnées d'affichage du catalogue d'outils sans modifier l'implémentation de l'outil                                                                                          |
| `api.registerCommand(...)`                                                           | Commandes de plugin délimitées ; les résultats des commandes peuvent définir `continueAgent: true` ; les commandes natives Discord prennent en charge `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | Descripteurs de contribution d'interface utilisateur de contrôle pour les surfaces de session, d'outil, d'exécution ou de paramètres                                             |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | Rappels de nettoyage pour les ressources d'exécution appartenant au plugin sur les chemins de réinitialisation/suppression/rechargement                                          |
| `api.agent.events.registerAgentEventSubscription(...)`                               | Abonnements aux événements nettoyés pour l'état du workflow et les moniteurs                                                                                                     |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | État de brouillon du plugin par exécution effacé lors du cycle de vie d'exécution terminal                                                                                       |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | Métadonnées de nettoyage pour les tâches du planificateur appartenant au plugin ; ne planifie pas de travail ni ne crée d'enregistrements de tâches                              |
| `api.session.workflow.sendSessionAttachment(...)`                                    | Livraison de pièces jointes de fichiers médiées par l'hôte, uniquement groupées, vers la route de session sortante directe active                                                |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | Tours de session planifiés basés sur Cron, uniquement groupés, plus un nettoyage basé sur des balises                                                                            |
| `api.session.controls.registerSessionAction(...)`                                    | Actions de session typées que les clients peuvent dispatcher via le Gateway                                                                                                      |

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

Les méthodes plates équivalentes restent disponibles en tant qu'alias de compatibilité obsolètes pour les plugins existants. N'ajoutez pas de nouveau code de plugin qui appelle directement `api.registerSessionExtension`, `api.enqueueNextTurnInjection`,
`api.registerControlUiDescriptor`, `api.registerRuntimeLifecycle`,
`api.registerAgentEventSubscription`, `api.emitAgentEvent`,
`api.setRunContext`, `api.getRunContext`, `api.clearRunContext`,
`api.registerSessionSchedulerJob`, `api.registerSessionAction`,
`api.sendSessionAttachment`, `api.scheduleSessionTurn`, ou
`api.unscheduleSessionTurnsByTag`.

`scheduleSessionTurn(...)` est une commodité à portée de session sur le planificateur Cron du Gateway. Cron gère le timing et crée l'enregistrement de tâche en arrière-plan lorsque le tour s'exécute ; le Plugin SDK ne contraint que la session cible, la nommage appartenant au plugin et le nettoyage. Utilisez `api.runtime.tasks.managedFlows` dans le tour planifié lorsque le travail lui-même nécessite un état de flux de tâches multi-étapes durable.

Les contrats divisent intentionnellement l'autorité :

- Les plugins externes peuvent posséder des extensions de session, descripteurs d'interface utilisateur, commandes, métadonnées de tool, injections de tour suivant et hooks normaux.
- Les stratégies de tool de confiance s'exécutent avant les hooks `before_tool_call` ordinaires et sont réservées aux bundles car elles participent à la politique de sécurité de l'hôte.
- La propriété de commande réservée est réservée aux bundles. Les plugins externes doivent utiliser leurs propres noms ou alias de commande.
- `allowPromptInjection=false` désactive les hooks de modification de prompt, y compris
  `agent_turn_prepare`, `before_prompt_build`, `heartbeat_prompt_contribution`,
  les champs de prompt des `before_agent_start` hérités, et
  `enqueueNextTurnInjection`.

Exemples de consommateurs non-Plan :

| Archétype de plugin                               | Hooks utilisés                                                                                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow d'approbation                            | Extension de session, continuation de commande, injection de tour suivant, descripteur d'interface utilisateur                                                                                           |
| Porte de stratégie budgétaire/d'espace de travail | Stratégie d'outil de confiance, métadonnées d'outil, projection de session                                                                                                                               |
| Moniteur du cycle de vie en arrière-plan          | Nettoyage du cycle de vie d'exécution, abonnement aux événements de l'agent, possession/nettoyage de l'ordonnanceur de session, contribution au prompt de pulsation, descripteur d'interface utilisateur |
| Assistant de configuration ou d'intégration       | Extension de session, commandes délimitées, descripteur de l'interface utilisateur de contrôle                                                                                                           |

<Note>Les espaces de noms d'administration du noyau réservés (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent toujours `operator.admin`, même si un plugin tente d'assigner une portée de méthode de passerelle plus étroite. Préférez les préfixes spécifiques aux plugins pour les méthodes appartenant aux plugins.</Note>

<Accordion title="Quand utiliser le middleware de résultat d'outil">
  Les plugins groupés peuvent utiliser `api.registerAgentToolResultMiddleware(...)` lorsqu'ils
  ont besoin de réécrire un résultat d'outil après l'exécution et avant que le runtime
  ne renvoie ce résultat dans le modèle. Il s'agit de la jointure neutre par rapport au runtime
  de confiance pour les réducteurs de sortie asynchrones tels que tokenjuice.

Les plugins groupés doivent déclarer `contracts.agentToolResultMiddleware` pour chaque
cible runtime, par exemple `["pi", "codex"]`. Les plugins externes
ne peuvent pas enregistrer ce middleware ; gardez les hooks de plugin normaux OpenClaw pour le travail
qui n'a pas besoin de synchronisation pré-modèle des résultats d'outil. L'ancien chemin d'enregistrement
de fabrique d'extension embarqué Pi uniquement a été supprimé.

</Accordion>

### Enregistrement de découverte Gateway

`api.registerGatewayDiscoveryService(...)` permet à un plugin d'annoncer le Gateway actif
sur un transport de découverte local tel que mDNS/Bonjour. OpenClaw appelle le
service lors du démarrage du Gateway lorsque la découverte locale est activée, transmet les
ports actuels du Gateway et les données de conseil TXT non secrètes, et appelle le gestionnaire
`stop` renvoyé lors de l'arrêt du Gateway.

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
comme une authentification. La découverte est une indication de routage ; l'authentification Gateway et le
épinglage TLS (TLS pinning) conservent toujours la confiance.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de commande :

- `commands` : noms de commandes explicites détenus par le registrant
- `descriptors` : descripteurs de commande au moment de l'analyse utilisés pour l'aide CLI,
  le routage et l'enregistrement différé du plugin CLI
- `parentPath` : chemin de commande parent optionnel pour les groupes de commandes imbriqués, tel que
  `["nodes"]`

Pour les fonctionnalités de nœuds jumelés, préférez
`api.registerNodeCliFeature(registrar, opts?)`. C'est un petit wrapper autour de
`api.registerCli(..., { parentPath: ["nodes"] })` et rend des commandes telles que
`openclaw nodes canvas` des fonctionnalités de nœud explicitement détenues par le plugin.

Si vous souhaitez qu'une commande de plugin reste chargée à la demande (lazy-loaded) dans le chemin normal de la racine CLI,
fournissez des `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce
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
Ce chemin de compatibilité eagre reste pris en charge, mais il n'installe pas
les espaces réservés basés sur des descripteurs pour le chargement différé au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut pour un backend CLI d'IA local tel que `claude-cli` ou `my-cli`.

- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle comme `my-cli/gpt-5`.
- Le `config` du backend utilise la même structure que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur l'emporte toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la valeur par défaut du plugin avant d'exécuter le CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion (par exemple pour normaliser les anciennes formes de drapeaux).
- Utilisez `resolveExecutionArgs` pour les réécritures d'argv limitées à la requête qui appartiennent au dialecte CLI, telles que le mappage des niveaux de réflexion OpenClaw vers un drapeau d'effort natif.

Pour un guide de création de bout en bout, consultez [plugins de backend CLI](/fr/plugins/cli-backend-plugins).

### Slots exclusifs

| Méthode                                    | Ce qu'il enregistre                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois). Le rappel `assemble()` reçoit `availableTools` et `citationsMode` afin que le moteur puisse adapter les ajouts de prompt. |
| `api.registerMemoryCapability(capability)` | Capacité de mémoire unifiée                                                                                                                                        |
| `api.registerMemoryPromptSection(builder)` | Générateur de section de prompt mémoire                                                                                                                            |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire                                                                                                                             |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire                                                                                                                                  |

### Adaptateurs d'intégration de mémoire

| Méthode                                        | Ce qu'il enregistre                                      |
| ---------------------------------------------- | -------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'intégration de mémoire pour le plugin actif |

- `registerMemoryCapability` est l'API exclusive de plugin de mémoire préférée.
- `registerMemoryCapability` peut également exposer `publicArtifacts.listArtifacts(...)` afin que les plugins compagnons puissent consommer les artefacts de mémoire exportés via `openclaw/plugin-sdk/memory-host-core` au lieu d'accéder à la disposition privée d'un plugin de mémoire spécifique.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont des API de plugin de mémoire exclusives compatibles avec les versions héritées.
- `MemoryFlushPlan.model` peut épingler le tour de vidage (flush turn) à une référence `provider/model`
  exacte, telle que `ollama/qwen3:8b`, sans hériter de la chaîne de repli (fallback chain) active.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'intégration (embeddings) (par exemple `openai`, `gemini`, ou un identifiant personnalisé défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'elle fait                   |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

Voir [Plugin hooks](/fr/plugins/hooks) pour des exemples, des noms de hook courants et la sémantique de garde.

### Sémantique de décision des hooks

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `before_install` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_install` : renvoyer `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `reply_dispatch` : renvoyer `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame le dispatch, les gestionnaires de moindre priorité et le chemin de dispatch par défaut du modèle sont ignorés.
- `message_sending` : renvoyer `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `message_sending` : renvoyer `{ cancel: false }` est traité comme l'absence de décision (identique à l'omission de `cancel`), et non comme une substitution.
- `message_received` : utilisez le champ typé `threadId` lorsque vous avez besoin d'un routage entrant de fil/discussion. Conservez `metadata` pour les éléments spécifiques au canal.
- `message_sending` : utilisez les champs de routage typés `replyToId` / `threadId` avant de revenir aux `metadata` spécifiques au canal.
- `gateway_start` : utilisez `ctx.config` , `ctx.workspaceDir` et `ctx.getCron?.()` pour l'état de démarrage propriétaire de la passerelle au lieu de vous fier aux hooks internes `gateway:startup` .
- `cron_changed` : observez les changements du cycle de vie cron propriétaires de la passerelle. Utilisez `event.job?.state?.nextRunAtMs` et `ctx.getCron?.()` lors de la synchronisation de planificateurs de réveil externes, et gardez OpenClaw comme source de vérité pour les vérifications d'échéance et l'exécution.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                                |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | ID du plugin                                                                                                               |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                            |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                             |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                         |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                                    |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                                                                   |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsqu'il est disponible)                 |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin provenant de `plugins.entries.<id>.config`                                              |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/fr/plugins/sdk-runtime)                                                                          |
| `api.logger`             | `PluginLogger`            | Enregistreur délimité ( `debug` , `info` , `warn` , `error` )                                                              |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre légère de pré-démarrage/configuration avant l'entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                                                                           |

## Convention de module interne

Au sein de votre plugin, utilisez des fichiers barrel locaux pour les importations internes :

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
  `./runtime-api.ts`. Le chemin du SDK n'est que le contrat externe.
</Warning>

Les surfaces publiques des plugins regroupés chargés par façade (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts`, et fichiers d'entrée publics similaires) préfèrent
l'instantané actif de la configuration d'exécution lorsque OpenClaw est déjà en cours d'exécution. Si aucun instantané d'exécution n'existe encore,
ils reviennent au fichier de configuration résolu sur le disque.
Les façades de plugins regroupés empaquetés doivent être chargées via les chargeurs de façade
de plugins de OpenClaw ; les importations directes depuis `dist/extensions/...` contournent le manifeste
et les vérifications du sidecar d'exécution que les installations empaquetées utilisent pour le code appartenant au plugin.

Les plugins de fournisseur peuvent exposer un contrat étroit local au plugin via un fichier barrel lorsqu'une assistant est intentionnellement spécifique au fournisseur et n'appartient pas encore à un sous-chemin générique du SDK. Exemples regroupés :

- **Anthropic** : jointure publique `api.ts` / `contract-api.ts` pour Claude
  beta-header et assistants de flux `service_tier`.
- **`@openclaw/openai-provider`** : `api.ts` exporte des constructeurs de fournisseur,
  des assistants de modèle par défaut, et des constructeurs de fournisseur en temps réel.
- **`@openclaw/openrouter-provider`** : `api.ts` exporte le constructeur de fournisseur
  ainsi que des assistants d'onboarding/de configuration.

<Warning>
  Le code de production des extensions doit également éviter les importations `openclaw/plugin-sdk/<other-plugin>`.
  Si un assistant est véritablement partagé, promouvez-le vers un sous-chemin de SDK neutre
  tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre
  interface orientée capacité au lieu de coupler deux plugins entre eux.
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
    Conditionnement, manifestes et schémas de configuration.
  </Card>
  <Card title="Tests" icon="vial" href="/fr/plugins/sdk-testing">
    Utilitaires de test et règles de linting.
  </Card>
  <Card title="Migration du SDK" icon="arrows-turn-right" href="/fr/plugins/sdk-migration">
    Migration depuis des interfaces dépréciées.
  </Card>
  <Card title="Fonctionnement interne des plugins" icon="diagram-project" href="/fr/plugins/architecture">
    Architecture approfondie et modèle de capacité.
  </Card>
</CardGroup>
