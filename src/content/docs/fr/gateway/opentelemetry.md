---
summary: "OpenClawExporter les diagnostics OpenClaw vers n'importe quel collecteur OpenTelemetry via le plugin diagnostics-otel (OTLP/HTTP)"
title: "Exportation OpenTelemetry"
read_when:
  - You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector
  - You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend
  - You need the exact metric names, span names, or attribute shapes to build dashboards or alerts
---

OpenClaw exporte des diagnostics via le plugin officiel OpenClaw`diagnostics-otel`
en utilisant **OTLP/HTTP (protobuf)**. Tout collecteur ou backend acceptant OTLP/HTTP
fonctionne sans modification de code. Pour les journaux de fichiers locaux et leur lecture, consultez
[Logging](/fr/logging).

## Fonctionnement global

- Les **événements de diagnostic** sont des enregistrements structurés, en cours de traitement, émis par le
  Gateway et les plugins inclus pour les exécutions de modèle, le flux de messages, les sessions, les files d'attente,
  et l'exécution.
- Le **plugin `diagnostics-otel`** s'abonne à ces événements et les exporte en tant que
  **métriques**, **traces** et **journaux** OpenTelemetry via OTLP/HTTP.
- Les **appels de fournisseur** reçoivent un en-tête W3C `traceparent`OpenClaw du contexte de span
  d'appel de modèle de confiance d'OpenClaw lorsque le transport du fournisseur accepte les en-têtes
  personnalisés. Le contexte de trace émis par le plugin n'est pas propagé.
- Les exportateurs ne s'attachent que lorsque la surface de diagnostic et le plugin sont tous deux
  activés, donc le coût en cours de traitement reste proche de zéro par défaut.

## Quick start

Pour les installations empaquetées, installez d'abord le plugin :

```bash
openclaw plugins install clawhub:@openclaw/diagnostics-otel
```

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

Vous pouvez également activer le plugin depuis le CLI :

```bash
openclaw plugins enable diagnostics-otel
```

<Note>`protocol` prend actuellement uniquement en charge `http/protobuf`. `grpc` est ignoré.</Note>

## Signaux exportés

| Signal        | Ce qu'il contient                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Métriques** | Compteurs et histogrammes pour l'utilisation des jetons, le coût, la durée d'exécution, l'utilisation des compétences, le flux de messages, les événements Talk, les voies de file d'attente, l'état/récupération de session, l'exécution d'outils, exec et la pression mémoire. |
| **Traces**    | Spans pour l'utilisation de modèles, les appels de modèles, le cycle de vie du harnais, l'utilisation des compétences, l'exécution d'outils, exec, le traitement de webhooks/messages, l'assemblage du contexte et les boucles d'outils.                                         |
| **Journaux**  | Enregistrements `logging.file` structurés exportés via OTLP lorsque `diagnostics.otel.logs` est activé ; les corps des journaux sont retenus sauf si la capture de contenu est explicitement activée.                                                                            |

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

| Variable                                                                                                          | Objet                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                     | Remplacer `diagnostics.otel.endpoint`. Si la valeur contient déjà `/v1/traces`, `/v1/metrics` ou `/v1/logs`, elle est utilisée telle quelle.                                                                                                                                                                    |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` / `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` / `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Remplacements de point de terminaison spécifiques aux Signal utilisés lorsque la clé de configuration `diagnostics.otel.*Endpoint` correspondante n'est pas définie. La configuration spécifique Signal prime sur la variable d'environnement spécifique Signal, qui prime sur le point de terminaison partagé. |
| `OTEL_SERVICE_NAME`                                                                                               | Remplacer `diagnostics.otel.serviceName`.                                                                                                                                                                                                                                                                       |
| `OTEL_EXPORTER_OTLP_PROTOCOL`                                                                                     | Remplacer le protocole de transmission (seul `http/protobuf` est reconnu aujourd'hui).                                                                                                                                                                                                                          |
| `OTEL_SEMCONV_STABILITY_OPT_IN`                                                                                   | Définir à `gen_ai_latest_experimental` pour émettre le dernier attribut de span GenAI expérimental (`gen_ai.provider.name`) au lieu de l'ancien `gen_ai.system`. Les métriques GenAI utilisent toujours des attributs sémantiques bornés et de faible cardinalité, quelle que soit la configuration.            |
| `OPENCLAW_OTEL_PRELOADED`                                                                                         | Définir à `1` lorsqu'un autre préchargement ou processus hôte a déjà enregistré le SDK OpenTelemetry global. Le plugin ignore alors son propre cycle de vie NodeSDK mais câble toujours les écouteurs de diagnostic et respecte `traces`/`metrics`/`logs`.                                                      |

## Confidentialité et capture de contenu

Le contenu brut des modèles/outils n'est **pas** exporté par défaut. Les spans transportent des
identifiants bornés (channel, provider, model, catégorie d'erreur, identifiants de requête hachés uniquement,
source de l'outil, propriétaire de l'outil, et nom/source de la compétence) et n'incluent jamais le texte du prompt,
le texte de réponse, les entrées d'outils, les sorties d'outils, les chemins de fichiers de compétences ou les clés de session.
Les enregistrements de journaux OTLP conservent la sévérité, le logger, l'emplacement du code, le contexte de trace approuvé,
et les attributs nettoyés par défaut, mais le corps brut du message de journal n'est exporté
que lorsque `diagnostics.otel.captureContent` est défini sur le booléen `true`. Les sous-clés
`captureContent.*` granulaires n'activent pas les corps de journaux. Les étiquettes ressemblant à
des clés de session d'agent étendu sont remplacées par `unknown`.
Les métriques Talk exportent uniquement des métadonnées d'événements bornés telles que le mode, le transport,
le provider et le type d'événement. Elles n'incluent pas de transcriptions, de charges utiles audio,
identifiants de session, identifiants de tour, identifiants d'appel, identifiants de salle ou de jetons de transfert.

Les demandes de modèles sortantes peuvent inclure un en-tête W3C `traceparent`OpenClaw. Cet en-tête est
généré uniquement à partir du contexte de trace de diagnostic propriété d'OpenClaw pour l'appel de modèle
actif. Les en-têtes `traceparent` existants fournis par l'appelant sont remplacés, de sorte que les plugins ou
les options de fournisseur personnalisées ne peuvent pas falsifier l'ascendance de la trace inter-services.

Réglez `diagnostics.otel.captureContent.*` sur `true` uniquement lorsque votre collecteur et
votre politique de rétention sont approuvés pour le texte du prompt, de la réponse,
de l'outil ou du système-prompt. Chaque sous-clé est optionnelle indépendamment :

- `inputMessages` - contenu du prompt utilisateur.
- `outputMessages` - contenu de la réponse du model.
- `toolInputs` - charges utiles des arguments de l'outil.
- `toolOutputs` - charges utiles des résultats de l'outil.
- `systemPrompt` - prompt système/développeur assemblé.

Lorsqu'une sous-clé est activée, les spans de model et d'outil reçoivent des
attributs `openclaw.content.*` limités et rédigés pour cette classe uniquement.
Utilisez le booléen `captureContent: true` uniquement pour les captures de diagnostics
larges où les corps de messages de log OTLP sont également approuvés pour l'export.

## Échantillonnage et vidage

- **Traces :** `diagnostics.otel.sampleRate` (root-span uniquement, `0.0` supprime tout,
  `1.0` garde tout).
- **Métriques :** `diagnostics.otel.flushIntervalMs` (minimum `1000`).
- **Logs :** Les logs OTLP respectent `logging.level` (niveau de log fichier).
  Ils utilisent le chemin de rédaction des enregistrements de log de diagnostic,
  et non le formatage de la console. Les installations à fort volume devraient
  préférer l'échantillonnage/filtrage du collecteur OTLP à l'échantillonnage local.
- **Corrélation de logs fichier :** Les logs fichier JSONL incluent des éléments de
  niveau supérieur `traceId`, `spanId`, `parentSpanId` et `traceFlags`
  lorsque l'appel de log transporte un contexte de trace de diagnostic valide,
  ce qui permet aux processeurs de logs de joindre les lignes de log locales
  aux spans exportés.
- **Corrélation des requêtes :** Les requêtes HTTP du Gateway et les trames WebSocket
  créent une portée de trace de requête interne. Les logs et événements de
  diagnostic dans cette portée héritent de la trace de requête par défaut,
  tandis que les spans d'exécution d'agent et d'appel de model sont créés en tant
  qu'enfants pour que les en-têtes `traceparent` du provider restent sur la même trace.

## Métriques exportées

### Utilisation du model

- `openclaw.tokens` (compteur, attrs : `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (compteur, attrs : `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histogramme, attrs : `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogramme, attrs : `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogramme, métrique de conventions sémantiques GenAI, attrs : `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogramme, secondes, métrique de conventions sémantiques GenAI, attrs : `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, facultatif `error.type`)
- `openclaw.model_call.duration_ms` (histogramme, attrs : `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, plus `openclaw.errorCategory` et `openclaw.failureKind` sur les erreurs classées)
- `openclaw.model_call.request_bytes` (histogramme, taille en octets UTF-8 de la charge utile finale de la requête du modèle ; pas de contenu de la charge utile brute)
- `openclaw.model_call.response_bytes` (histogramme, taille en octets UTF-8 des événements de réponse du modèle diffusés en continu ; pas de contenu de réponse brute)
- `openclaw.model_call.time_to_first_byte_ms` (histogramme, temps écoulé avant le premier événement de réponse diffusé en continu)
- `openclaw.skill.used` (compteur, attrs : `openclaw.skill.name`, `openclaw.skill.source`, `openclaw.skill.activation`, facultatif `openclaw.agent`, facultatif `openclaw.toolName`)

### Flux de messages

- `openclaw.webhook.received` (compteur, attrs : `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (compteur, attrs : `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.received` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.started` (counter, attrs: `openclaw.channel`, `openclaw.source`)
- `openclaw.message.dispatch.completed` (counter, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.dispatch.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`, `openclaw.source`)
- `openclaw.message.processed` (counter, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (counter, attrs: `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (histogram, attrs: `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Talk

- `openclaw.talk.event` (counter, attrs: `openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`)
- `openclaw.talk.event.duration_ms` (histogram, attrs: identique à `openclaw.talk.event` ; émis lorsqu'un événement Talk signale une durée)
- `openclaw.talk.audio.bytes` (histogram, attrs: identique à `openclaw.talk.event` ; émis pour les événements de trame audio Talk qui signalent une longueur en octets)

### Files d'attente et sessions

- `openclaw.queue.lane.enqueue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs : `openclaw.lane` ou `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs : `openclaw.lane`)
- `openclaw.session.state` (counter, attrs : `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (counter, attrs : `openclaw.state` ; émis uniquement pour la maintenance des sessions obsolètes sans travail actif)
- `openclaw.session.stuck_age_ms` (histogram, attrs : `openclaw.state` ; émis uniquement pour la maintenance des sessions obsolètes sans travail actif)
- `openclaw.session.turn.created` (counter, attrs : `openclaw.agent`, `openclaw.channel`, `openclaw.trigger`)
- `openclaw.session.recovery.requested` (counter, attrs : `openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (counter, attrs : `openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (histogram, attrs : identiques à ceux du compteur de récupération correspondant)
- `openclaw.run.attempt` (counter, attrs : `openclaw.attempt`)

### Télémétrie de l'activité des sessions

`diagnostics.stuckSessionWarnMs` est le seuil d'âge sans progression pour les
diagnostics de l'activité des sessions. Une session `processing` ne vieillit pas vers ce seuil
tant que OpenClaw observe une progression de réponse, d'outil, de statut, de bloc ou du runtime ACP.
Les keepalives de frappe ne sont pas comptés comme une progression, donc un model ou un harnais silencieux peut
toujours être détecté.

OpenClaw classe les sessions selon le travail qu'il peut encore observer :

- `session.long_running` : le travail intégré actif, les appels de model ou les appels d'outil
  sont toujours en cours de progression.
- `session.stalled` : un travail actif existe, mais l'exécution active n'a pas signalé
  de progrès récents. Les exécutions intégrées bloquées restent d'abord en observation seule, puis
  abandonnent-vident après `diagnostics.stuckSessionAbortMs` sans progrès afin que les tours
  en file d'attente derrière la voie puissent reprendre. Si non défini, le seuil d'abandon par défaut à
  la fenêtre étendue plus sûre d'au moins 5 minutes et 3x
  `diagnostics.stuckSessionWarnMs`.
- `session.stuck` : tenue de livre de session obsolète sans travail actif. Cela libère
  immédiatement la voie de session affectée.

La récupération émet des événements structurés `session.recovery.requested` et
`session.recovery.completed` . L'état de diagnostic de session est marqué comme inactif
seulement après un résultat de récupération mutateur (`aborted` ou `released`) et seulement si la
même génération de traitement est toujours actuelle.

Seul `session.stuck` émet le compteur `openclaw.session.stuck`, l'histogramme
`openclaw.session.stuck_age_ms` et la portée `openclaw.session.stuck`.
Les diagnostics `session.stuck` répétés se désistent tant que la session reste
inchangée, donc les tableaux de bord doivent alerter sur les augmentations soutenues plutôt qu'à chaque
top de battement de cœur. Pour le paramètre de configuration et les valeurs par défaut, voir
[Référence de configuration](/fr/gateway/configuration-reference#diagnostics).

### Cycle de vie du harnais

- `openclaw.harness.duration_ms` (histogramme, attrs : `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase` en cas d'erreur)

### Exécution

- `openclaw.exec.duration_ms` (histogramme, attrs : `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`)

### Éléments internes de diagnostic (mémoire et boucle d'outils)

- `openclaw.memory.heap_used_bytes` (histogramme, attrs : `openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (histogramme)
- `openclaw.memory.pressure` (compteur, attrs : `openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (compteur, attrs : `openclaw.toolName`, `openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (histogram, attrs : `openclaw.toolName`, `openclaw.outcome`)

## Spans exportés

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
  - `openclaw.provider.request_id_hash` (hachage basé sur SHA borné de l'id de requête du fournisseur en amont ; les ids bruts ne sont pas exportés)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - Lors de l'achèvement : `openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
  - En cas d'erreur : `openclaw.harness.phase`, `openclaw.errorCategory`, `openclaw.harness.cleanup_failed` facultatif
- `openclaw.tool.execution`
  - `gen_ai.tool.name`, `openclaw.toolName`, `openclaw.errorCategory`, `openclaw.tool.params.*`
- `openclaw.exec`
  - `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`, `openclaw.exec.command_length`, `openclaw.exec.exit_code`, `openclaw.exec.timed_out`
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.reason`
- `openclaw.message.delivery`
  - `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`, `openclaw.delivery.result_count`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`
- `openclaw.context.assembled`
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (aucun contenu de prompt, d'historique, de réponse ou de clé de session)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (pas de messages de boucle, de paramètres ou de sortie d'outil)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

Lorsque la capture de contenu est explicitement activée, les spans de model et d'outil peuvent également inclure des attributs `openclaw.content.*` bornés et rédigés pour les classes de contenu spécifiques que vous avez activées.

## Catalogue des événements de diagnostic

Les événements ci-dessous prennent en charge les métriques et les spans ci-dessus. Les plugins peuvent également s'y abonner directement sans exportation OTLP.

**Utilisation du modèle**

- `model.usage` - jetons, coût, durée, contexte, fournisseur/modèle/canal,
  identifiants de session. `usage` est la comptabilité fournisseur/tour pour le coût et la télémétrie ;
  `context.used` est l'instantané actuel du prompt/contexte et peut être inférieur à
  celui du fournisseur `usage.total` lorsque des entrées mises en cache ou des appels de boucle d'outil (tool-loop) sont impliqués.

**Flux de messages**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**File d'attente et session**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat` (compteurs agrégés : webhooks/file d'attente/session)

**Cycle de vie du harnais**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  cycle de vie par exécution pour le harnais de l'agent. Inclut `harnessId`, optionnel
  `pluginId`, fournisseur/modèle/canal, et l'identifiant d'exécution. La complétion ajoute
  `durationMs`, `outcome`, optionnel `resultClassification`, `yieldDetected`,
  et les comptes `itemLifecycle`. Les erreurs ajoutent `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`), `errorCategory`, et
  optionnel `cleanupFailed`.

**Exécution**

- `exec.process.completed` - résultat final, durée, cible, mode, code de
  sortie et type d'échec. Le texte de la commande et les répertoires de travail ne sont
  pas inclus.

## Sans exportateur

Vous pouvez garder les événements de diagnostic disponibles pour les plugins ou les puits personnalisés sans
exécuter `diagnostics-otel` :

```json5
{
  diagnostics: { enabled: true },
}
```

Pour une sortie de débogage ciblée sans déclencher `logging.level`, utilisez les indicateurs de diagnostic. Les indicateurs ne sont pas sensibles à la casse et prennent en charge les caractères génériques (par exemple `telegram.*` ou `*`) :

```json5
{
  diagnostics: { flags: ["telegram.http"] },
}
```

Ou en tant que substitution d'environnement ponctuelle :

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload openclaw gateway
```

La sortie des indicateurs va vers le fichier journal standard (`logging.file`) et est toujours masquée par `logging.redactSensitive`. Guide complet :
[Diagnostics flags](/fr/diagnostics/flags).

## Désactiver

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

Vous pouvez également omettre `diagnostics-otel` de `plugins.allow`, ou exécuter `openclaw plugins disable diagnostics-otel`.

## Connexes

- [Logging](/fr/logging) - journaux de fichiers, sortie console, suivi CLI et l'onglet Logs de l'interface utilisateur de contrôle
- [Gateway logging internals](/fr/gateway/logging) - styles de journaux WS, préfixes de sous-système et capture de console
- [Diagnostics flags](/fr/diagnostics/flags) - indicateurs de journal de débogage ciblés
- [Diagnostics export](/fr/gateway/diagnostics) - outil de bundle de support pour opérateur (séparé de l'export OTEL)
- [Configuration reference](/fr/gateway/configuration-reference#diagnostics) - référence complète du champ `diagnostics.*`
