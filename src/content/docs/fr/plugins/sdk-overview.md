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
  Vous recherchez plutôt un guide pratique ? Commencez par [Building plugins](/fr/plugins/building-plugins), utilisez [Channel plugins](/fr/plugins/sdk-channel-plugins) pour les plugins de canal, [Provider plugins](/fr/plugins/sdk-provider-pluginsCLI) pour les plugins de fournisseur, [CLI backend plugins](/fr/plugins/cli-backend-pluginsCLI) pour les backends CLI d'IA locale, et [Plugin
  hooks](/fr/plugins/hooks) pour les plugins de cycle de vie ou d'outil.
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

Le plugin SDK est exposé sous la forme d'un ensemble de sous-chemins étroits regroupés par domaine (point
d'entrée du plugin, canal, fournisseur, authentification, exécution, capacité, mémoire et aides réservées
pour les plugins groupés). Pour le catalogue complet — groupé et lié — voir
[Sous-chemins du Plugin SDK](/fr/plugins/sdk-subpaths).

La liste générée de plus de 200 sous-chemins réside dans `scripts/lib/plugin-sdk-entrypoints.json`.

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

Les commandes de plugin peuvent définir `agentPromptGuidance` lorsque l'agent a besoin d'un indicateur de routage court et propriétaire de la commande. Gardez ce texte relatif à la commande elle-même ; n'ajoutez pas de stratégie spécifique au provider ou au plugin aux générateurs d'invite principaux.

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

| Méthode                                                                  | Contrat qu'il possède                                                                                                                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerSessionExtension(...)`                                      | État de session compatible JSON et appartenant au plugin, projeté via les sessions Gateway                                                                                       |
| `api.enqueueNextTurnInjection(...)`                                      | Contexte durable exactement une fois injecté dans le prochain tour d'agent pour une session                                                                                      |
| `api.registerTrustedToolPolicy(...)`                                     | Stratégie d'outil pré-plugin groupée/de confiance pouvant bloquer ou réécrire les paramètres d'outil                                                                             |
| `api.registerToolMetadata(...)`                                          | Métadonnées d'affichage du catalogue d'outils sans modifier l'implémentation de l'outil                                                                                          |
| `api.registerCommand(...)`                                               | Commandes de plugin délimitées ; les résultats des commandes peuvent définir `continueAgent: true` ; les commandes natives Discord prennent en charge `descriptionLocalizations` |
| `api.registerControlUiDescriptor(...)`                                   | Descripteurs de contribution de l'interface utilisateur de contrôle pour les surfaces de session, d'outil, d'exécution ou de paramètres                                          |
| `api.registerRuntimeLifecycle(...)`                                      | Rappels de nettoyage pour les ressources d'exécution détenues par le plugin sur les chemins de réinitialisation/suppression/rechargement                                         |
| `api.registerAgentEventSubscription(...)`                                | Abonnements aux événements désinfectés pour l'état et les moniteurs du flux de travail                                                                                           |
| `api.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)` | État de brouillon du plugin par exécution effacé lors du cycle de vie de l'exécution terminale                                                                                   |
| `api.registerSessionSchedulerJob(...)`                                   | Enregistrements de tâches du planificateur de session détenus par le plugin avec un nettoyage déterministe                                                                       |

Les contrats divisent intentionnellement l'autorité :

- Les plugins externes peuvent posséder des extensions de session, des descripteurs d'interface utilisateur, des commandes, des métadonnées d'outil, des injections de tour suivant et des crochets normaux.
- Les stratégies d'outil de confiance s'exécutent avant les crochets `before_tool_call` ordinaires et sont uniquement groupées car elles participent à la stratégie de sécurité de l'hôte.
- La propriété de commande réservée est uniquement groupée. Les plugins externes doivent utiliser leurs propres noms de commande ou alias.
- `allowPromptInjection=false` désactive les crochets de modification de prompt, y compris `agent_turn_prepare`, `before_prompt_build`, `heartbeat_prompt_contribution`, les champs de prompt de l'ancien `before_agent_start` et `enqueueNextTurnInjection`.

Exemples de consommateurs non-Plan :

| Archétype de plugin                             | Crochets utilisés                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flux de travail d'approbation                   | Extension de session, continuation de commande, injection de tour suivant, descripteur d'interface utilisateur                                                                                                |
| Porte de stratégie budgétaire/espace de travail | Stratégie d'outil de confiance, métadonnées d'outil, projection de session                                                                                                                                    |
| Moniteur de cycle de vie en arrière-plan        | Nettoyage du cycle de vie d'exécution, abonnement aux événements de l'agent, propriété/nettoyage du planificateur de session, contribution de prompt de rythme cardiaque, descripteur d'interface utilisateur |
| Assistant de configuration ou d'onboarding      | Extension de session, commandes délimitées, descripteur de l'interface utilisateur de contrôle                                                                                                                |

<Note>Les espaces de noms d'administration principaux réservés (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent toujours `operator.admin`, même si un plugin tente d'assigner une portée de méthode de Gateway plus restreinte. Privilégiez les préfixes spécifiques aux plugins pour les méthodes appartenant aux plugins.</Note>

<Accordion title="Quand utiliser le middleware de résultat d'outil">
  Les plugins groupés peuvent utiliser `api.registerAgentToolResultMiddleware(...)` lorsqu'ils
  ont besoin de réécrire un résultat d'outil après son exécution et avant que le runtime
  ne renvoie ce résultat dans le modèle. Il s'agit de la jonction neutre de confiance
  pour les réducteurs de sortie asynchrones tels que tokenjuice.

Les plugins groupés doivent déclarer `contracts.agentToolResultMiddleware` pour chaque
cible de runtime, par exemple `["pi", "codex"]`OpenClaw. Les plugins externes
ne peuvent pas enregistrer ce middleware ; gardez les hooks de plugin OpenClaw normaux pour le travail
qui ne nécessite pas de synchronisation pré-modèle des résultats d'outil. L'ancien chemin d'enregistrement
de la fabrique d'extension Pi-only a été supprimé.

</Accordion>

### Enregistrement de la découverte Gateway

`api.registerGatewayDiscoveryService(...)`GatewayBonjourOpenClawGatewayGateway permet à un plugin d'annoncer la Gateway
active sur un transport de découverte local tel que mDNS/Bonjour. OpenClaw appelle le
service lors du démarrage de la Gateway lorsque la découverte locale est activée, transmet les
ports actuels de la Gateway et les données d'indications TXT non secrètes, et appelle le gestionnaire
`stop`Gateway renvoyé lors de l'arrêt de la Gateway.

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
une authentification. La découverte est une indication de routage ; l'authentification et l'épinglage TLS de la Gateway
possèdent toujours la confiance.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de commande :

- `commands` : noms de commande explicites détenus par le registraire
- `descriptors` : descripteurs de commandes au moment de l'analyse utilisés pour l'aide CLI,
  le routage et l'enregistrement différé des plugins CLI
- `parentPath` : chemin de commande parent facultatif pour les groupes de commandes imbriqués, tel que
  `["nodes"]`

Pour les fonctionnalités à nœuds couplés, préférez
`api.registerNodeCliFeature(registrar, opts?)`. C'est un petit wrapper autour de
`api.registerCli(..., { parentPath: ["nodes"] })` et rend les commandes telles que
`openclaw nodes canvas` des fonctionnalités de nœud explicitement détenues par le plugin.

Si vous souhaitez qu'une commande de plugin reste chargée diffément dans le chemin normal de la racine CLI,
fournissez `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce
registrar.

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
Ce chemin de compatité impatient reste pris en charge, mais il n'installe pas
de placeholders basés sur des descripteurs pour le chargement différé au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut d'un
backend AI CLI local tel que `codex-cli`.

- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle comme `codex-cli/gpt-5`.
- Le `config` du backend utilise la même forme que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur l'emporte toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la
  valeur par défaut du plugin avant d'exécuter le CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après fusion
  (par exemple pour normaliser les anciennes formes de drapeaux).
- Utilisez `resolveExecutionArgs` pour les réécritures d'argv limitées à la demande qui appartiennent
  au dialecte CLI, comme le mappage des niveaux de réflexion OpenClaw à un indicateur d'effort natif.

Pour un guide de création de bout en bout, consultez
[Plugins backend CLI](/fr/plugins/cli-backend-plugins).

### Slots exclusifs

| Méthode                                    | Ce qu'il enregistre                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois). Le rappel `assemble()` reçoit `availableTools` et `citationsMode` afin que le moteur puisse adapter les ajouts de prompt. |
| `api.registerMemoryCapability(capability)` | Capacité de mémoire unifiée                                                                                                                                        |
| `api.registerMemoryPromptSection(builder)` | Générateur de section de prompt de mémoire                                                                                                                         |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire                                                                                                                             |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire                                                                                                                                  |

### Adaptateurs d'incorporation de mémoire

| Méthode                                        | Ce qu'il enregistre                                        |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'incorporation de mémoire pour le plugin actif |

- `registerMemoryCapability`API est l'API de plugin de mémoire exclusive préférée.
- `registerMemoryCapability` peut également exposer `publicArtifacts.listArtifacts(...)`
  afin que les plugins compagnons puissent consommer les artefacts de mémoire exportés via
  `openclaw/plugin-sdk/memory-host-core` au lieu d'accéder à la structure privée d'un
  plugin de mémoire spécifique.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont des API de plugin de mémoire exclusives compatibles avec les versions héritées.
- `MemoryFlushPlan.model` peut épingler le tour de vidage à une référence `provider/model`
  exacte, telle que `ollama/qwen3:8b`, sans hériter de la chaîne de repli
  active.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'incorporation (par exemple `openai`, `gemini` ou un identifiant
  personnalisé défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

Voir [Hooks de plugin](/fr/plugins/hooks) pour des exemples, des noms de hook courants et la sémantique
de garde.

### Sémantique de décision de hook

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_tool_call` : le renvoi de `{ block: false }` est considéré comme une absence de décision (identique à l'omission de `block`), et non comme une priorité.
- `before_install` : le renvoi de `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_install` : le renvoi de `{ block: false }` est considéré comme une absence de décision (identique à l'omission de `block`), et non comme une priorité.
- `reply_dispatch` : le renvoi de `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame la répartition, les gestionnaires de priorité inférieure et le chemin de répartition du modèle par défaut sont ignorés.
- `message_sending` : le renvoi de `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `message_sending` : le renvoi de `{ cancel: false }` est considéré comme une absence de décision (identique à l'omission de `cancel`), et non comme une priorité.
- `message_received` : utilisez le champ typé `threadId` lorsque vous avez besoin d'un routage de fil/topic entrant. Conservez `metadata` pour les éléments spécifiques au channel.
- `message_sending` : utilisez les champs de routage typés `replyToId` / `threadId` avant de revenir aux `metadata` spécifiques au channel.
- `gateway_start` : utilisez `ctx.config`, `ctx.workspaceDir` et `ctx.getCron?.()` pour l'état de démarrage détenu par la passerelle au lieu de vous fier aux hooks `gateway:startup` internes.
- `cron_changed` : observez les changements du cycle de vie cron détenus par la passerelle. Utilisez `event.job?.state?.nextRunAtMs` et `ctx.getCron?.()` lors de la synchronisation avec des planificateurs de réveil externes, et gardez OpenClaw comme source de vérité pour les vérifications d'échéance et l'exécution.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                            |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Id du plugin                                                                                                           |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                        |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                         |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                     |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                                |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                                                               |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsque disponible)                   |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin depuis `plugins.entries.<id>.config`                                                |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/fr/plugins/sdk-runtime)                                                                      |
| `api.logger`             | `PluginLogger`            | Enregistreur avec portée (`debug`, `info`, `warn`, `error`)                                                            |
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
  depuis le code de production. Acheminez les importations internes via `./api.ts` ou
  `./runtime-api.ts`. Le chemin du SDK est uniquement le contrat externe.
</Warning>

Les surfaces publiques des plugins groupés chargés par façade (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` et fichiers d'entrée publics similaires) préfèrent
l'instantané de configuration d'exécution actif lorsque OpenClaw est déjà en cours d'exécution. Si aucun instantané
d'exécution n'existe encore, elles reviennent au fichier de configuration résolu sur le disque.
Les façades de plugins groupés empaquetés doivent être chargées via les chargeurs de façade
de plugins de OpenClaw ; les importations directes depuis `dist/extensions/...` contournent les vérifications
de manifeste et de sidecar d'exécution que les installations empaquetées utilisent pour le code détenu par le plugin.

Les plugins de fournisseur peuvent exposer un contrat local étroit de type « barrel » lorsqu'une
aide est intentionnellement spécifique au fournisseur et n'appartient pas encore à un sous-chemin SDK générique.
Exemples groupés :

- **Anthropic** : jonction publique `api.ts` / `contract-api.ts` pour Claude
  en-tête bêta et aides de flux `service_tier`.
- **`@openclaw/openai-provider`** : `api.ts` exporte les constructeurs de fournisseur,
  les aides de modèle par défaut et les constructeurs de fournisseur en temps réel.
- **`@openclaw/openrouter-provider`** : `api.ts` exporte le constructeur de fournisseur
  ainsi que les aides d'intégration/de configuration.

<Warning>
  Le code de production d'extension doit également éviter les imports `openclaw/plugin-sdk/<other-plugin>`.
  Si une aide est véritablement partagée, promouvez-la vers un sous-chemin SDK neutre
tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre surface orientée capacité
au lieu de coupler deux plugins ensemble.
</Warning>

## Connexes

<CardGroup cols={2}>
  <Card title="Points d'entrée" icon="door-open" href="/fr/plugins/sdk-entrypoints">
    Options `definePluginEntry` et `defineChannelPluginEntry`.
  </Card>
  <Card title="Aides d'exécution" icon="gears" href="/fr/plugins/sdk-runtime">
    Référence complète de l'espace de noms `api.runtime`.
  </Card>
  <Card title="Configuration et installation" icon="sliders" href="/fr/plugins/sdk-setup">
    Packaging, manifestes et schémas de configuration.
  </Card>
  <Card title="Tests" icon="vial" href="/fr/plugins/sdk-testing">
    Utilitaires de test et règles de lint.
  </Card>
  <Card title="Migration du SDK" icon="arrows-turn-right" href="/fr/plugins/sdk-migration">
    Migration depuis des surfaces obsolètes.
  </Card>
  <Card title="Fonctionnement interne des plugins" icon="diagram-project" href="/fr/plugins/architecture">
    Architecture approfondie et model de capacités.
  </Card>
</CardGroup>
