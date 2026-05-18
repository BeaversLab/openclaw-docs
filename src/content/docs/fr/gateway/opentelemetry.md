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
fonctionne sans modification de code. Pour les journaux de fichiers locaux et comment les lire, voir
[Journalisation](/fr/logging).

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

| Signal        | Ce qu'il contient                                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Métriques** | Compteurs et histogrammes pour l'utilisation des jetons, le coût, la durée d'exécution, le flux de messages, les événements Talk, les voies de file d'attente, l'état/récupération de session, exec et la pression mémoire. |
| **Traces**    | Spans pour l'utilisation du modèle, les appels de modèle, le cycle de vie du harnais, l'exécution d'outils, exec, le traitement des webhooks/messages, l'assemblage du contexte et les boucles d'outils.                    |
| **Journaux**  | Enregistrements structurés `logging.file` exportés via OTLP lorsque `diagnostics.otel.logs` est activé.                                                                                                                     |

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

Le contenu brut du modèle/de l'outil n'est **pas** exporté par défaut. Les spans transportent des identifiants bornés (channel, provider, model, catégorie d'erreur, identifiants de demande hachés uniquement) et n'incluent jamais le texte de l'invite, le texte de la réponse, les entrées de l'outil, les sorties de l'outil ou les clés de session.
Les métriques Talk n'exportent que des métadonnées d'événement bornées telles que le mode, le transport, le provider et le type d'événement. Elles n'incluent pas les transcriptions, les charges utiles audio, les identifiants de session, les identifiants de tour, les identifiants d'appel, les identifiants de salle ou les jetons de transfert.

Les demandes sortantes de modèle peuvent inclure un en-tête W3C `traceparent`. Cet en-tête n'est généré qu'à partir du contexte de trace de diagnostic propriétaire OpenClaw pour l'appel de modèle actif. Les en-têtes `traceparent` existants fournis par l'appelant sont remplacés, de sorte que les plugins ou les options de provider personnalisées ne peuvent pas usurper l'ascendance de trace inter-services.

Définissez `diagnostics.otel.captureContent.*` sur `true` uniquement lorsque votre collecteur et votre politique de rétention sont approuvés pour le texte du prompt, de la réponse, de l'outil ou du système-prompt. Chaque sous-clé est activée indépendamment :

- `inputMessages` - contenu du prompt utilisateur.
- `outputMessages` - contenu de la réponse du model.
- `toolInputs` - charges utiles des arguments de l'outil.
- `toolOutputs` - charges utiles des résultats de l'outil.
- `systemPrompt` - prompt système/développeur assemblé.

Lorsqu'une sous-clé est activée, les spans de model et d'outil reçoivent des attributs `openclaw.content.*` bornés et rédigés pour cette classe uniquement.

## Échantillonnage et vidage

- **Traces :** `diagnostics.otel.sampleRate` (span racine uniquement, `0.0` supprime tout, `1.0` garde tout).
- **Métriques :** `diagnostics.otel.flushIntervalMs` (minimum `1000`).
- **Journaux (Logs) :** Les journaux OTLP respectent `logging.level` (niveau de journalisation fichier). Ils utilisent le chemin de rédaction des enregistrements de journaux de diagnostic, et non le formatage de la console. Les installations à fort volume devraient préférer l'échantillonnage/le filtrage du collecteur OTLP à l'échantillonnage local.
- **Corrélation des journaux fichiers :** Les journaux fichiers JSONL incluent `traceId`, `spanId`, `parentSpanId` et `traceFlags` de premier niveau lorsque l'appel de journalisation transporte un contexte de trace de diagnostic valide, ce qui permet aux processeurs de journaux de joindre les lignes de journal locales aux spans exportées.
- **Corrélation des requêtes :** Les requêtes HTTP du Gateway et les trames WebSocket créent une portée de trace de requête interne. Les journaux et les événements de diagnostic dans cette portée héritent de la trace de requête par défaut, tandis que les exécutions d'agent et les appels de model sont créés en tant qu'enfants afin que les en-têtes `traceparent` du provider restent sur la même trace.

## Métriques exportées

### Utilisation du model

- `openclaw.tokens` (compteur, attrs : `openclaw.token`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.agent`)
- `openclaw.cost.usd` (compteur, attrs : `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.run.duration_ms` (histogram, attrs : `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs : `openclaw.context`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`)
- `gen_ai.client.token.usage` (histogram, métrique de conventions sémantiques GenAI, attrs : `gen_ai.token.type` = `input`/`output`, `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`)
- `gen_ai.client.operation.duration` (histogram, secondes, métrique de conventions sémantiques GenAI, attrs : `gen_ai.provider.name`, `gen_ai.operation.name`, `gen_ai.request.model`, `error.type` optionnel)
- `openclaw.model_call.duration_ms` (histogram, attrs : `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`, ainsi que `openclaw.errorCategory` et `openclaw.failureKind` sur les erreurs classifiées)
- `openclaw.model_call.request_bytes` (histogram, taille en octets UTF-8 de la payload finale de requête du modèle ; pas de contenu de payload brute)
- `openclaw.model_call.response_bytes` (histogram, taille en octets UTF-8 des événements de réponse du modèle diffusés en continu ; pas de contenu de réponse brute)
- `openclaw.model_call.time_to_first_byte_ms` (histogram, temps écoulé avant le premier événement de réponse diffusé en continu)

### Flux de messages

- `openclaw.webhook.received` (compteur, attrs : `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.error` (compteur, attrs : `openclaw.channel`, `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs : `openclaw.channel`, `openclaw.webhook`)
- `openclaw.message.queued` (compteur, attrs : `openclaw.channel`, `openclaw.source`)
- `openclaw.message.processed` (compteur, attrs : `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs : `openclaw.channel`, `openclaw.outcome`)
- `openclaw.message.delivery.started` (compteur, attrs : `openclaw.channel`, `openclaw.delivery.kind`)
- `openclaw.message.delivery.duration_ms` (histogram, attrs : `openclaw.channel`, `openclaw.delivery.kind`, `openclaw.outcome`, `openclaw.errorCategory`)

### Talk

- `openclaw.talk.event` (compteur, attrs : `openclaw.talk.event_type`, `openclaw.talk.mode`, `openclaw.talk.transport`, `openclaw.talk.brain`, `openclaw.talk.provider`)
- `openclaw.talk.event.duration_ms` (histogram, attrs : identiques à `openclaw.talk.event` ; émis lorsqu'un événement Talk signale une durée)
- `openclaw.talk.audio.bytes` (histogram, attrs : identiques à `openclaw.talk.event` ; émis pour les événements de trame audio Talk qui signalent une longueur en octets)

### Files d'attente et sessions

- `openclaw.queue.lane.enqueue` (compteur, attrs : `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (compteur, attrs : `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs : `openclaw.lane` ou `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs : `openclaw.lane`)
- `openclaw.session.state` (compteur, attrs : `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (compteur, attrs : `openclaw.state` ; émis uniquement pour la gestion des sessions obsolètes sans travail actif)
- `openclaw.session.stuck_age_ms` (histogram, attrs : `openclaw.state` ; émis uniquement pour la gestion des sessions obsolètes sans travail actif)
- `openclaw.session.recovery.requested` (compteur, attrs : `openclaw.state`, `openclaw.action`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.completed` (compteur, attrs : `openclaw.state`, `openclaw.action`, `openclaw.status`, `openclaw.active_work_kind`, `openclaw.reason`)
- `openclaw.session.recovery.age_ms` (histogram, attrs : identiques au compteur de récupération correspondant)
- `openclaw.run.attempt` (compteur, attrs : `openclaw.attempt`)

### Télémétrie de l'activité de session

`diagnostics.stuckSessionWarnMs` est le seuil d'âge sans progression pour le
diagnostic de l'activité de session. Une session `processing` ne vieillit pas vers ce seuil
tant que OpenClaw observe une progression d'exécution de réponse, d'outil, de statut, de bloc ou d'ACP.
Les keepalives de frappe ne sont pas comptés comme une progression, donc un model ou harnais silencieux peut
toujours être détecté.

OpenClaw classe les sessions en fonction du travail qu'il peut encore observer :

- `session.long_running` : le travail intégré actif, les appels de model ou les appels d'outil
  progressent toujours.
- `session.stalled` : un travail actif existe, mais l'exécution active n'a pas signalé de progrès récent. Les exécutions intégrées bloquées restent d'abord en observation uniquement, puis abandonnent le drainage (abort-drain) après `diagnostics.stuckSessionAbortMs` sans progrès, afin que les tours en file d'attente derrière la voie (lane) puissent reprendre. Si non défini, le seuil d'abandon correspond par défaut à la fenêtre étendue plus sécurisée d'au moins 5 minutes et 3x `diagnostics.stuckSessionWarnMs`.
- `session.stuck` : gestion administrative de session obsolète sans travail actif. Cela libère
  la voie de session affectée immédiatement.

La récupération émet des événements structurés `session.recovery.requested` et
`session.recovery.completed`. L'état de diagnostic de session n'est marqué inactif
qu'après un résultat de récupération modificateur (`aborted` ou `released`) et uniquement si la
même génération de traitement est toujours actuelle.

Seul `session.stuck` émet le compteur `openclaw.session.stuck`, l'histogramme `openclaw.session.stuck_age_ms` et la plage `openclaw.session.stuck`. Les diagnostics `session.stuck` répétés se désactivent tant que la session reste inchangée, donc les tableaux de bord devraient alerter sur les augmentations soutenues plutôt qu'à chaque battement de cœur (heartbeat). Pour le bouton de configuration et les valeurs par défaut, voir [Référence de configuration](/fr/gateway/configuration-reference#diagnostics).

### Cycle de vie du harnais

- `openclaw.harness.duration_ms` (histogramme, attrs : `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.harness.phase` en cas d'erreur)

### Exécution

- `openclaw.exec.duration_ms` (histogramme, attrs : `openclaw.exec.target`, `openclaw.exec.mode`, `openclaw.outcome`, `openclaw.failureKind`)

### Internes des diagnostics (mémoire et boucle d'outils)

- `openclaw.memory.heap_used_bytes` (histogramme, attrs : `openclaw.memory.kind`)
- `openclaw.memory.rss_bytes` (histogramme)
- `openclaw.memory.pressure` (compteur, attrs : `openclaw.memory.level`)
- `openclaw.tool.loop.iterations` (compteur, attrs : `openclaw.toolName`, `openclaw.outcome`)
- `openclaw.tool.loop.duration_ms` (histogramme, attrs : `openclaw.toolName`, `openclaw.outcome`)

## Plages exportées

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.tokens.*` (entrée/sortie/cache_read/cache_write/total)
  - `gen_ai.system` par défaut, ou `gen_ai.provider.name` lorsque les dernières conventions sémantiques GenAI sont activées
  - `gen_ai.request.model`, `gen_ai.operation.name`, `gen_ai.usage.*`
- `openclaw.run`
  - `openclaw.outcome`, `openclaw.channel`, `openclaw.provider`, `openclaw.model`, `openclaw.errorCategory`
- `openclaw.model.call`
  - `gen_ai.system` par défaut, ou `gen_ai.provider.name` lorsque les dernières conventions sémantiques GenAI sont activées
  - `gen_ai.request.model`, `gen_ai.operation.name`, `openclaw.provider`, `openclaw.model`, `openclaw.api`, `openclaw.transport`
  - `openclaw.errorCategory` et `openclaw.failureKind` facultatif en cas d'erreur
  - `openclaw.model_call.request_bytes`, `openclaw.model_call.response_bytes`, `openclaw.model_call.time_to_first_byte_ms`
  - `openclaw.provider.request_id_hash` (hachage basé sur SHA borné de l'id de requête du provider amont ; les ids bruts ne sont pas exportés)
- `openclaw.harness.run`
  - `openclaw.harness.id`, `openclaw.harness.plugin`, `openclaw.outcome`, `openclaw.provider`, `openclaw.model`, `openclaw.channel`
  - À la fin : `openclaw.harness.result_classification`, `openclaw.harness.yield_detected`, `openclaw.harness.items.started`, `openclaw.harness.items.completed`, `openclaw.harness.items.active`
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
  - `openclaw.prompt.size`, `openclaw.history.size`, `openclaw.context.tokens`, `openclaw.errorCategory` (pas de contenu de prompt, d'historique, de réponse ou de clé de session)
- `openclaw.tool.loop`
  - `openclaw.toolName`, `openclaw.outcome`, `openclaw.iterations`, `openclaw.errorCategory` (pas de messages de boucle, de paramètres ou de sortie d'outil)
- `openclaw.memory.pressure`
  - `openclaw.memory.level`, `openclaw.memory.heap_used_bytes`, `openclaw.memory.rss_bytes`

Lorsque la capture de contenu est explicitement activée, les spans de modèle et d'outil peuvent également inclure des attributs `openclaw.content.*` bornés et rédigés pour les classes de contenu spécifiques que vous avez choisies.

## Catalogue des événements de diagnostic

Les événements ci-dessous prennent en charge les métriques et spans ci-dessus. Les plugins peuvent également s'y abonner directement sans exportation OTLP.

**Utilisation du modèle**

- `model.usage` - jetons, coût, durée, contexte, fournisseur/modèle/canal,
  identifiants de session. `usage` est la comptabilité fournisseur/tour pour le coût et la télémétrie ;
  `context.used` est l'instantané actuel du prompt/contexte et peut être inférieur à
  `usage.total` du fournisseur lorsque des entrées mises en cache ou des appels de boucle d'outil sont impliqués.

**Flux de messages**

- `webhook.received` / `webhook.processed` / `webhook.error`
- `message.queued` / `message.processed`
- `message.delivery.started` / `message.delivery.completed` / `message.delivery.error`

**File d'attente et session**

- `queue.lane.enqueue` / `queue.lane.dequeue`
- `session.state` / `session.long_running` / `session.stalled` / `session.stuck`
- `run.attempt` / `run.progress`
- `diagnostic.heartbeat` (compteurs agrégés : webhooks/file/session)

**Cycle de vie du harnais**

- `harness.run.started` / `harness.run.completed` / `harness.run.error` -
  cycle de vie par exécution pour le harnais de l'agent. Inclut `harnessId`, optionnel
  `pluginId`, provider/model/channel, et l'identifiant d'exécution. L'achèvement ajoute
  `durationMs`, `outcome`, optionnel `resultClassification`, `yieldDetected`,
  et les comptes `itemLifecycle`. Les erreurs ajoutent `phase`
  (`prepare`/`start`/`send`/`resolve`/`cleanup`), `errorCategory`, et
  optionnel `cleanupFailed`.

**Exec**

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

Pour une sortie de débogage ciblée sans déclencher `logging.level`, utilisez les drapeaux de
diagnostic. Les drapeaux ne sont pas sensibles à la casse et supportent les caractères génériques (par exemple `telegram.*` ou
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

La sortie des drapeaux va vers le fichier de journal standard (`logging.file`) et est toujours
masquée par `logging.redactSensitive`. Guide complet :
[Diagnostics flags](/fr/diagnostics/flags).

## Désactiver

```json5
{
  diagnostics: { otel: { enabled: false } },
}
```

Vous pouvez également omettre `diagnostics-otel` dans `plugins.allow`, ou exécuter
`openclaw plugins disable diagnostics-otel`.

## Connexes

- [Logging](/fr/logging) - journaux de fichiers, sortie console, suivi CLI, et l'onglet Logs de l'interface de contrôle
- [Fonctionnement interne des journaux du Gateway](/fr/gateway/logging) - styles de journal WS, préfixes de sous-système et capture console
- [Diagnostics flags](/fr/diagnostics/flags) - indicateurs de journal de débogage ciblés
- [Diagnostics export](/fr/gateway/diagnostics) - tool de bundle de support pour les opérateurs (séparé de l'exportation OTEL)
- [Configuration reference](/fr/gateway/configuration-reference#diagnostics) - référence complète des champs `diagnostics.*`
