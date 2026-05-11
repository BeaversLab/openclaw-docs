---
summary: "Exporter les diagnostics OpenClaw vers n'importe quel collecteur OpenTelemetry via le plugin diagnostics-otel (OTLP/HTTP)"
title: "Export OpenTelemetry"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw exporte les diagnostics via le plugin `diagnostics-otel` inclus
en utilisant **OTLP/HTTP (protobuf)**. Tout collecteur ou backend acceptant OTLP/HTTP
fonctionne sans modification de code. Pour les journaux de fichiers locaux et comment les lire, voir
[Logging](/fr/logging).

## Fonctionnement global

- Les **événements de diagnostic** sont des enregistrements structurés, en cours de traitement, émis par le
  Gateway et les plugins inclus pour les exécutions de modèle, le flux de messages, les sessions, les files d'attente,
  et l'exécution.
- Le **plugin `diagnostics-otel`** s'abonne à ces événements et les exporte en tant que
  **métriques**, **traces**, et **journaux** OpenTelemetry via OTLP/HTTP.
- Les **appels au fournisseur** reçoivent un en-tête W3C `traceparent` du contexte de span d'appel de modèle de confiance de OpenClaw
  lorsque le transport du fournisseur accepte les en-têtes personnalisés.
  Le contexte de trace émis par le plugin n'est pas propagé.
- Les exportateurs ne s'attachent que lorsque la surface de diagnostic et le plugin sont tous deux
  activés, donc le coût en cours de traitement reste proche de zéro par défaut.

## Quick start

```json5
{
  plugins: {
    allow: ["diagnostics-otel"],
    entries: {
      "diagnostics-otel": { enabled: true },
    },
  },
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      protocol: "http/protobuf",
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2,
      flushIntervalMs: 60000,
    },
  },
}
```

Vous pouvez également activer le plugin depuis la CLI :

```bash
openclaw plugins enable diagnostics-otel
```

<Note>`protocol` prend actuellement uniquement en charge `http/protobuf`. `grpc` est ignoré.</Note>

## Signaux exportés

| Signal        | Ce qu'il contient                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Métriques** | Compteurs et histogrammes pour l'utilisation des jetons, le coût, la durée d'exécution, le flux de messages, les voies de file d'attente, l'état de la session, l'exécution et la pression mémoire.             |
| **Traces**    | Spans pour l'utilisation du modèle, les appels au modèle, le cycle de vie du harnais, l'exécution d'outils, l'exécution, le traitement des webhooks/messages, l'assemblage du contexte et les boucles d'outils. |
| **Journaux**  | Enregistrements `logging.file` structurés exportés via OTLP lorsque `diagnostics.otel.logs` est activé.                                                                                                         |

Activez ou désactivez `traces`, `metrics` et `logs` indépendamment. Les trois sont activés par défaut
lorsque `diagnostics.otel.enabled` est vrai.

## Référence de configuration

```json5
{
  diagnostics: {
    enabled: true,
    otel: {
      enabled: true,
      endpoint: "http://otel-collector:4318",
      tracesEndpoint: "http://otel-collector:4318/v1/traces",
      metricsEndpoint: "http://otel-collector:4318/v1/metrics",
      logsEndpoint: "http://otel-collector:4318/v1/logs",
      protocol: "http/protobuf", // grpc is ignored
      serviceName: "openclaw-gateway",
      headers: { "x-collector-token": "..." },
      traces: true,
      metrics: true,
      logs: true,
      sampleRate: 0.2, // root-span sampler, 0.0..1.0
      flushIntervalMs: 60000, // metric export interval (min 1000ms)
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
      },
    },
  },
}
```

### Variables d'environnement

| Variable                                                                                                          | Objectif                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | Remplacer `diagnostics.otel.endpoint`. Si la valeur contient déjà `/v1/traces`, `/v1/metrics` ou `/v1/logs`, elle est utilisée telle quelle.                                                                                                                                                                                           |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Remplacements de point de terminaison spécifiques aux Signal utilisés lorsque la clé de configuration `diagnostics.otel.*Endpoint` correspondante n'est pas définie. La configuration spécifique à la Signal l'emporte sur les variables d'environnement spécifiques à la Signal, qui l'emportent sur le point de terminaison partagé. |
| `OTEL_SERVICE_NAME`                                                                                               | Remplacer `diagnostics.otel.serviceName`.                                                                                                                                                                                                                                                                                              |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | Remplacer le protocole réseau (seul `http/protobuf` est honoré aujourd'hui).                                                                                                                                                                                                                                                           |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | Définir sur `gen_ai_latest_experimental` pour émettre le dernier attribut de span GenAI expérimental (`gen_ai.provider.name`) au lieu de l'ancien `gen_ai.system`. Les métriques GenAI utilisent toujours des attributs sémantiques bornés et de faible cardinalité, quelle que soit la configuration.                                 |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | Définir sur `1` lorsqu'un autre préchargement ou processus hôte a déjà enregistré le SDK OpenTelemetry global. Le plugin saute alors son propre cycle de vie NodeSDK mais connecte toujours les écouteurs de diagnostic et honore `traces`/`metrics`/`logs`.                                                                           |

## Confidentialité et capture de contenu

Le contenu brut du model/tool n'est **pas** exporté par défaut. Les spans portent des
identifiants bornés (channel, provider, model, catégorie d'erreur, identifiants de
requête hachés uniquement) et n'incluent jamais le texte du prompt, le texte de
la réponse, les entrées du tool, les sorties du tool, ou les clés de session.

Les requêtes model sortantes peuvent inclure un en-tête W3C `traceparent`. Cet en-tête n'est
généré qu'à partir du contexte de trace de diagnostic propriété d'OpenClaw pour l'appel model
actif. Les en-têtes `traceparent` existants fournis par l'appelant sont remplacés, empêchant les plugins ou
les options de provider personnalisées de usurper l'ascendance de trace inter-services.

Définissez `diagnostics.otel.captureContent.*` sur `true` uniquement lorsque votre collecteur et
votre politique de rétention sont approuvés pour le texte du prompt, de la réponse,
du tool ou du système-prompt. Chaque sous-clé est un opt-in indépendant :

- `inputMessages` — contenu du prompt utilisateur.
- `outputMessages` — contenu de la réponse du model.
- `toolInputs` — payloads des arguments de tool.
- `toolOutputs` — payloads des résultats de tool.
- `systemPrompt` — invite système/développeur assemblée.

Lorsqu'une sous-clé est activée, les spans de model et de tool obtiennent des attributs `openclaw.content.*` bornés et rédactés pour cette classe uniquement.

## Échantillonnage et vidage

- **Traces :** `diagnostics.otel.sampleRate` (racine de span uniquement, `0.0` supprime tout,
  `1.0` conserve tout).
- **Métriques :** `diagnostics.otel.flushIntervalMs` (minimum `1000`).
- **Journaux :** Les journaux OTLP respectent `logging.level` (niveau de journal fichier). Ils utilisent le chemin de rédaction des enregistrements de journaux de diagnostic, et non le formatage de la console. Les installations à fort volume devraient préférer l'échantillonnage/filtrage du collecteur OTLP à l'échantillonnage local.
- **Corrélation des journaux fichiers :** Les journaux fichiers JSONL incluent `traceId`, `spanId`, `parentSpanId` et `traceFlags` de premier niveau lorsque l'appel de journal transporte un contexte de trace de diagnostic valide, ce qui permet aux processeurs de journaux de joindre les lignes de journaux locales aux spans exportées.
- **Corrélation des requêtes :** Les requêtes HTTP du Gateway et les trames WebSocket créent une portée de trace de requête interne. Les journaux et les événements de diagnostic dans cette portée héritent de la trace de requête par défaut, tandis que les spans d'exécution d'agent et d'appel de model sont créés en tant qu'enfants pour que les en-têtes `traceparent` du provider restent sur la même trace.

## Métriques exportées

### Utilisation du model

- `openclaw.tokens` (compteur, attrs : `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (compteur, attrs : `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histogramme, attrs : `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogramme, attrs : `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogramme, métrique GenAI semantic-conventions, attrs : `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogramme, secondes, métrique GenAI semantic-conventions, attrs : `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, `error.type` en option)
- `openclaw.model_call.duration_ms` (histogramme, attrs : `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, plus `openclaw.errorCategory` et `openclaw.failureKind` pour les erreurs classifiées)
- `openclaw.model_call.request_bytes` (histogramme, taille en octets UTF-8 de la charge utile finale de la requête du modèle ; pas de contenu de charge utile brute)
- `openclaw.model_call.response_bytes` (histogramme, taille en octets UTF-8 des événements de réponse du modèle en streaming ; pas de contenu de réponse brute)
- `openclaw.model_call.time_to_first_byte_ms` (histogramme, temps écoulé avant le premier événement de réponse en streaming)

### Flux de messages

- `openclaw.webhook.received` (compteur, attrs : `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (compteur, attrs : `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogramme, attrs : `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (compteur, attrs : `openclaw.channel`, `openclaw.source`)
- `openclaw.message.processed` (compteur, attrs : `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogramme, attrs : `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (compteur, attrs : `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (histogramme, attrs : `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Files d'attente et sessions

- `openclaw.queue.lane.enqueue` (compteur, attrs : `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (compteur, attrs : `openclaw.lane`)
- `openclaw.queue.depth` (histogramme, attrs : `openclaw.lane` ou `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogramme, attrs : `openclaw.lane`)
- `openclaw.session.state` (compteur, attrs : `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (compteur, attrs : `openclaw.state`)
- `openclaw.session.stuck_age_ms` (histogramme, attrs : `openclaw.state`)
- `openclaw.run.attempt` (compteur, attrs : `openclaw.attempt`)

### Cycle de vie du harnais

- `openclaw.harness.duration_ms` (histogramme, attrs : `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase` en cas d'erreur)

### Exec

- `openclaw.exec.duration_ms` (histogramme, attrs : `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`)

### Diagnostics internes (mémoire et boucle d'outil)

- `openclaw.memory.heap_used_bytes` (histogramme, attrs : `openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (histogramme)
- `openclaw.memory.pressure` (compteur, attrs : `openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (compteur, attrs : `openclaw.toolName`, `openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (histogramme, attrs : `openclaw.toolName`, `openclaw.outcome`)

## Spans exportées

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
  - `gen_ai.system` par défaut, ou `gen_ai.provider.name` lorsque les dernières conventions sémantiques GenAI sont activées
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - `gen_ai.system` par défaut, ou `gen_ai.provider.name` lorsque les dernières conventions sémantiques GenAI sont activées
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory` et `openclaw.failureKind` facultatif en cas d'erreur
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (hachage borné basé sur SHA de l'id de requête du fournisseur en amont ; les ids bruts ne sont pas exportés)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - Lors de l'achèvement : `openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - En cas d'erreur : `openclaw.harness.phase`, `openclaw.errorCategory`, `openclaw.harness.cleanup_failed` facultatif
- `openclaw.tool.execution`
  - `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.errorCategory`, `openclaw.tool.params.*`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`, `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.chatId`, `openclaw.messageId`, `openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (pas de contenu de prompt, d'historique, de réponse ou de clé de session)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (pas de messages de boucle, de paramètres ou de sortie d'outil)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

Lorsque la capture de contenu est explicitement activée, les spans de model et de tool peuvent également inclure des attributs `openclaw.content.*` bornés et rédigés pour les classes de contenu spécifiques que vous avez choisies.

## Catalogue des événements de diagnostic

Les événements ci-dessous prennent en charge les métriques et les spans ci-dessus. Les plugins peuvent également s'y abonner directement sans exportation OTLP.

**Utilisation du modèle**

- `model.usage` — jetons, coût, durée, contexte, provider/model/channel,
  identifiants de session. `usage` est la comptabilité provider/tour pour le coût et la télémétrie ;
  `context.used` est l'instantané actuel du prompt/contexte et peut être inférieur à
  celui du provider `usage.total` lorsque des entrées mises en cache ou des appels tool-loop sont impliqués.

**Flux de messages**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**File d'attente et session**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.stuck`
- `run.attempt`
- `diagnostic.heartbeat` (compteurs agrégés : webhooks/file/session)

**Cycle de vie du harnais**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` —
  cycle de vie par exécution pour le harnais de l'agent. Inclut `harnessId`, en option
  `pluginId`, provider/model/channel, et l'ID d'exécution. L'achèvement ajoute
  `durationMs`, `outcome`, en option `resultClassification`, `yieldDetected`,
  et les décomptes `itemLifecycle`. Les erreurs ajoutent `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`), `errorCategory`, et
  en option `cleanupFailed`.

**Exec**

- `exec.process.completed` — résultat final, durée, cible, mode, code de sortie et type d'échec. Le texte de la commande et les répertoires de travail ne sont pas inclus.

## Sans exportateur

Vous pouvez garder les événements de diagnostic accessibles aux plugins ou aux récepteurs personnalisés sans exécuter `diagnostics-otel` :

```json5
{
  diagnostics: { enabled: true },
}
```

Pour une sortie de débogage ciblée sans élever `logging.level`, utilisez les indicateurs
de diagnostic. Les indicateurs ne sont pas sensibles à la casse et prennent en charge les caractères génériques (par ex. `telegram.*` ou
`*`) :

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

Ou en tant que substitution d'env ponctuelle :

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

La sortie des indicateurs va vers le fichier journal standard (`logging.file`) et est toujours
masquée par `logging.redactSensitive`. Guide complet :
[Indicateurs de diagnostic](/fr/diagnostics/flags).

## Désactiver

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

Vous pouvez également omettre `diagnostics-otel` de `plugins.allow`, ou exécuter
`openclaw plugins disable diagnostics-otel`.

## Connexes

- [Journalisation](/fr/logging) — journaux de fichiers, sortie console, suivi CLI et l'onglet Journaux de l'interface de contrôle
- [Internes de journalisation du Gateway](/fr/gateway/logging) — styles de journal WS, préfixes de sous-système et capture de console
- [Indicateurs de diagnostic](/fr/diagnostics/flags) — indicateurs de journal de débogage ciblés
- [Export de diagnostic](/fr/gateway/diagnostics) — outil de bundle de support pour opérateur (séparé de l'export OTEL)
- [Référence de configuration](/fr/gateway/configuration-reference#diagnostics) — référence complète du champ `diagnostics.*`
