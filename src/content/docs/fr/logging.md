---
summary: "Aperçu de la journalisation : fichiers de journalisation, sortie console, suivi par CLI, et l'interface utilisateur de contrôle"
read_when:
  - You need a beginner-friendly overview of logging
  - You want to configure log levels or formats
  - You are troubleshooting and need to find logs quickly
title: "Aperçu de la journalisation"
---

# Journalisation

OpenClaw dispose de deux surfaces principales de journalisation :

- **Journaux de fichiers** (lignes JSON) écrits par le Gateway.
- **Sortie console** affichée dans les terminaux et l'interface de débogage du Gateway.

L'onglet **Logs** de l'interface utilisateur de contrôle suit le fichier journal de la passerelle. Cette page explique où se trouvent les journaux, comment les lire, et comment configurer les niveaux et formats de journalisation.

## Emplacement des journaux

Par défaut, le Gateway écrit un fichier journal rotatif sous :

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

La date utilise le fuseau horaire local de l'hôte de la passerelle.

Vous pouvez remplacer cela dans `~/.openclaw/openclaw.json` :

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## Lire les journaux

### CLI : suivi en direct (recommandé)

Utilisez la CLI pour suivre le fichier journal de la passerelle via RPC :

```bash
openclaw logs --follow
```

Options actuelles utiles :

- `--local-time` : afficher les horodatages dans votre fuseau horaire local
- `--url <url>` / `--token <token>` / `--timeout <ms>` : indicateurs standard Gateway RPC
- `--expect-final` : indicateur d'attente de réponse finale RPC pris en charge par l'agent (accepté ici via la couche client partagée)

Modes de sortie :

- **Sessions TTY** : lignes de journalisation structurées, colorées et jolies.
- **Sessions non-TTY** : texte brut.
- `--json` : JSON délimité par des lignes (un événement de journal par ligne).
- `--plain` : forcer le texte brut dans les sessions TTY.
- `--no-color` : désactiver les couleurs ANSI.

Lorsque vous passez une `--url` explicite, la CLI n'applique pas automatiquement la configuration ou les informations d'identification de l'environnement ; incluez `--token` vous-même si le Gateway cible nécessite une authentification.

En mode JSON, la CLI émet des objets balisés `type` :

- `meta` : métadonnées du flux (fichier, curseur, taille)
- `log` : entrée de journal analysée
- `notice` : indicateurs de troncation / rotation
- `raw` : ligne de journal non analysée

Si la Gateway de boucle locale demande un couplage, `openclaw logs` revient automatiquement au fichier journal local configuré. Les cibles `--url` explicites n'utilisent pas ce repli.

Si le Gateway est inaccessible, la CLI imprime un court indice pour exécuter :

```bash
openclaw doctor
```

### Interface utilisateur de contrôle (web)

L'onglet **Logs** de l'interface utilisateur de contrôle suit le même fichier en utilisant `logs.tail`.
Voir [/web/control-ui](/en/web/control-ui) pour savoir comment l'ouvrir.

### Journaux canal uniquement

To filter channel activity (WhatsApp/Telegram/etc), use:

```bash
openclaw channels logs --channel whatsapp
```

## Log formats

### File logs (JSONL)

Each line in the log file is a JSON object. The CLI and Control UI parse these
entries to render structured output (time, level, subsystem, message).

### Console output

Console logs are **TTY-aware** and formatted for readability:

- Subsystem prefixes (e.g. `gateway/channels/whatsapp`)
- Level coloring (info/warn/error)
- Optional compact or JSON mode

Console formatting is controlled by `logging.consoleStyle`.

### Gateway WebSocket logs

`openclaw gateway` also has WebSocket protocol logging for RPC traffic:

- normal mode: only interesting results (errors, parse errors, slow calls)
- `--verbose`: all request/response traffic
- `--ws-log auto|compact|full`: pick the verbose rendering style
- `--compact`: alias for `--ws-log compact`

Examples:

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## Configuring logging

All logging configuration lives under `logging` in `~/.openclaw/openclaw.json`.

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": ["sk-.*"]
  }
}
```

### Log levels

- `logging.level`: **file logs** (JSONL) level.
- `logging.consoleLevel`: **console** verbosity level.

You can override both via the **`OPENCLAW_LOG_LEVEL`** environment variable (e.g. `OPENCLAW_LOG_LEVEL=debug`). The env var takes precedence over the config file, so you can raise verbosity for a single run without editing `openclaw.json`. You can also pass the global CLI option **`--log-level <level>`** (for example, `openclaw --log-level debug gateway run`), which overrides the environment variable for that command.

`--verbose` only affects console output and WS log verbosity; it does not change
file log levels.

### Console styles

`logging.consoleStyle`:

- `pretty`: human-friendly, colored, with timestamps.
- `compact`: tighter output (best for long sessions).
- `json`: JSON per line (for log processors).

### Redaction

Tool summaries can redact sensitive tokens before they hit the console:

- `logging.redactSensitive` : `off` | `tools` (par défaut : `tools`)
- `logging.redactPatterns` : liste de chaînes regex pour remplacer l'ensemble par défaut

La rédaction affecte uniquement la **sortie console** et ne modifie pas les fichiers journaux.

## Diagnostics + OpenTelemetry

Les diagnostics sont des événements structurés et lisibles par machine pour les exécutions de modèle **et**
la télémétrie du flux de messages (webhooks, mise en file d'attente, état de la session). Ils ne **remplacent pas**
les journaux ; ils existent pour alimenter les métriques, les traces et autres exportateurs.

Les événements de diagnostic sont émis en cours de processus, mais les exportateurs ne s'attachent que lorsque
les diagnostics + le plugin d'exportateur sont activés.

### OpenTelemetry vs OTLP

- **OpenTelemetry (OTel)** : le modèle de données + SDK pour les traces, métriques et journaux.
- **OTLP** : le protocole réseau utilisé pour exporter les données OTel vers un collecteur/un backend.
- OpenClaw exporte via **OTLP/HTTP (protobuf)** aujourd'hui.

### Signaux exportés

- **Métriques** : compteurs + histogrammes (utilisation des jetons, flux de messages, mise en file d'attente).
- **Traces** : spans pour l'utilisation du modèle + le traitement des webhooks/messages.
- **Journaux** : exportés via OTLP lorsque `diagnostics.otel.logs` est activé. Le volume
  de journaux peut être élevé ; gardez `logging.level` et les filtres d'exportateur à l'esprit.

### Catalogue des événements de diagnostic

Utilisation du modèle :

- `model.usage` : jetons, coût, durée, contexte, fournisseur/modèle/canal, ids de session.

Flux de messages :

- `webhook.received` : entrée webhook par canal.
- `webhook.processed` : webhook géré + durée.
- `webhook.error` : erreurs du gestionnaire de webhook.
- `message.queued` : message mis en file d'attente pour traitement.
- `message.processed` : résultat + durée + erreur facultative.

File d'attente + session :

- `queue.lane.enqueue` : mise en file de la voie de file de commande + profondeur.
- `queue.lane.dequeue` : retrait de la voie de file de commande + temps d'attente.
- `session.state` : transition de l'état de session + raison.
- `session.stuck` : avertissement de session bloquée + âge.
- `run.attempt` : métadonnées de nouvelle tentative/tentative d'exécution.
- `diagnostic.heartbeat` : compteurs agrégés (webhooks/file d'attente/session).

### Activer les diagnostics (sans exportateur)

Utilisez ceci si vous souhaitez que les événements de diagnostic soient disponibles pour les plugins ou les récepteurs personnalisés :

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### Indicateurs de diagnostic (journaux ciblés)

Utilisez des indicateurs pour activer des journaux de débogage supplémentaires et ciblés sans augmenter `logging.level`.
Les indicateurs ne sont pas sensibles à la casse et prennent en charge les caractères génériques (par exemple `telegram.*` ou `*`).

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

Remplacement de variable d'environnement (ponctuel) :

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

Notes :

- Les journaux d'indicateurs sont envoyés vers le fichier journal standard (identique à `logging.file`).
- La sortie est toujours masquée conformément à `logging.redactSensitive`.
- Guide complet : [/diagnostics/flags](/en/diagnostics/flags).

### Exporter vers OpenTelemetry

Les diagnostics peuvent être exportés via le plugin `diagnostics-otel` (OTLP/HTTP). Cela
fonctionne avec n'importe quel collecteur/backend OpenTelemetry acceptant OTLP/HTTP.

```json
{
  "plugins": {
    "allow": ["diagnostics-otel"],
    "entries": {
      "diagnostics-otel": {
        "enabled": true
      }
    }
  },
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "endpoint": "http://otel-collector:4318",
      "protocol": "http/protobuf",
      "serviceName": "openclaw-gateway",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.2,
      "flushIntervalMs": 60000
    }
  }
}
```

Notes :

- Vous pouvez également activer le plugin avec `openclaw plugins enable diagnostics-otel`.
- `protocol` prend actuellement en charge uniquement `http/protobuf`. `grpc` est ignoré.
- Les métriques incluent l'utilisation des jetons, le coût, la taille du contexte, la durée d'exécution et les compteurs/histogrammes
  de flux de messages (webhooks, mise en file d'attente, état de session, profondeur/attente de file).
- Les traces/métriques peuvent être activées/désactivées avec `traces` / `metrics` (par défaut : activé). Les traces
  incluent les spans d'utilisation du modèle ainsi que les spans de traitement des webhooks/messages lorsqu'elles sont activées.
- Définissez `headers` lorsque votre collecteur nécessite une authentification.
- Variables d'environnement prises en charge : `OTEL_EXPORTER_OTLP_ENDPOINT`,
  `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_PROTOCOL`.

### Métriques exportées (noms + types)

Utilisation du modèle :

- `openclaw.tokens` (compteur, attributs : `openclaw.token`, `openclaw.channel`,
  `openclaw.provider`, `openclaw.model`)
- `openclaw.cost.usd` (compteur, attributs : `openclaw.channel`, `openclaw.provider`,
  `openclaw.model`)
- `openclaw.run.duration_ms` (histogramme, attributs : `openclaw.channel`,
  `openclaw.provider`, `openclaw.model`)
- `openclaw.context.tokens` (histogram, attrs: `openclaw.context`,
  `openclaw.channel`, `openclaw.provider`, `openclaw.model`)

Flux de messages :

- `openclaw.webhook.received` (counter, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.webhook.error` (counter, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.message.queued` (counter, attrs: `openclaw.channel`,
  `openclaw.source`)
- `openclaw.message.processed` (counter, attrs: `openclaw.channel`,
  `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogram, attrs: `openclaw.channel`,
  `openclaw.outcome`)

Files d'attente + sessions :

- `openclaw.queue.lane.enqueue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (counter, attrs: `openclaw.lane`)
- `openclaw.queue.depth` (histogram, attrs: `openclaw.lane` ou
  `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogram, attrs: `openclaw.lane`)
- `openclaw.session.state` (counter, attrs: `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (counter, attrs: `openclaw.state`)
- `openclaw.session.stuck_age_ms` (histogram, attrs: `openclaw.state`)
- `openclaw.run.attempt` (counter, attrs: `openclaw.attempt`)

### Spans exportées (noms + attributs clés)

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.sessionKey`, `openclaw.sessionId`
  - `openclaw.tokens.*` (input/output/cache_read/cache_write/total)
- `openclaw.webhook.processed`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`, `openclaw.webhook`, `openclaw.chatId`,
    `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`, `openclaw.outcome`, `openclaw.chatId`,
    `openclaw.messageId`, `openclaw.sessionKey`, `openclaw.sessionId`,
    `openclaw.reason`
- `openclaw.session.stuck`
  - `openclaw.state`, `openclaw.ageMs`, `openclaw.queueDepth`,
    `openclaw.sessionKey`, `openclaw.sessionId`

### Échantillonnage et vidage

- Échantillonnage des traces : `diagnostics.otel.sampleRate` (0.0–1.0, spans racine uniquement).
- Intervalle d'exportation des métriques : `diagnostics.otel.flushIntervalMs` (min 1000ms).

### Notes sur le protocole

- Les points de terminaison OTLP/HTTP peuvent être définis via `diagnostics.otel.endpoint` ou
  `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Si le point de terminaison contient déjà `/v1/traces` ou `/v1/metrics`, il est utilisé tel quel.
- Si le point de terminaison contient déjà `/v1/logs`, il est utilisé tel quel pour les journaux.
- `diagnostics.otel.logs` active l'exportation des journaux OTLP pour la sortie de l'enregistreur principal.

### Comportement d'exportation des journaux

- Les journaux OTLP utilisent les mêmes enregistrements structurés que ceux écrits dans `logging.file`.
- Respecter `logging.level` (niveau de journalisation fichier). Le masquage de la console ne **s'applique pas**
  aux journaux OTLP.
- Les installations à fort volume devraient préférer l'échantillonnage/filtrage du collecteur OTLP.

## Conseils de dépannage

- **Gateway inaccessible ?** Exécutez d'abord `openclaw doctor`.
- **Journaux vides ?** Vérifiez que le Gateway est en cours d'exécution et écrit dans le chemin de fichier
  indiqué dans `logging.file`.
- **Besoin de plus de détails ?** Définissez `logging.level` sur `debug` ou `trace` et réessayez.

## Connexes

- [Gateway Logging Internals](/en/gateway/logging) — styles de journaux WS, préfixes de sous-système et capture de console
- [Diagnostics](/en/gateway/configuration-reference#diagnostics) — Exportation OpenTelemetry et configuration de trace du cache
