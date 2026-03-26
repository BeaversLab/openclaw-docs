---
summary: "Aperçu de la journalisation : journaux de fichiers, sortie console, suivi en direct via CLI et l'interface de contrôle"
read_when:
  - You need a beginner-friendly overview of logging
  - You want to configure log levels or formats
  - You are troubleshooting and need to find logs quickly
title: "Journalisation"
---

# Journalisation

OpenClaw enregistre les journaux à deux endroits :

- **Journaux de fichiers** (lignes JSON) écrits par le Gateway.
- **Sortie console** affichée dans les terminaux et l'interface de contrôle.

Cette page explique où se trouvent les journaux, comment les lire et comment configurer les niveaux et formats de journalisation.

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

Modes de sortie :

- **Sessions TTY** : lignes de journalisation structurées, colorées et élégantes.
- **Sessions non-TTY** : texte brut.
- `--json` : JSON délimité par des lignes (un événement de journal par ligne).
- `--plain` : forcer le texte brut dans les sessions TTY.
- `--no-color` : désactiver les couleurs ANSI.

En mode JSON, la CLI émet des objets balisés `type` :

- `meta` : métadonnées du flux (fichier, curseur, taille)
- `log` : entrée de journal analysée
- `notice` : indices de troncation / rotation
- `raw` : ligne de journal non analysée

Si le Gateway est injoignable, la CLI imprime un court conseil pour exécuter :

```bash
openclaw doctor
```

### Interface de contrôle (web)

L'onglet **Logs** de l'interface de contrôle suit le même fichier en utilisant `logs.tail`.
Voir [/web/control-ui](/fr/web/control-ui) pour savoir comment l'ouvrir.

### Journaux de canal uniquement

Pour filtrer l'activité du canal (WhatsApp/Telegram/etc), utilisez :

```bash
openclaw channels logs --channel whatsapp
```

## Formats de journalisation

### Journaux de fichiers (JSONL)

Chaque ligne du fichier journal est un objet JSON. La CLI et l'interface de contrôle analysent ces entrées pour afficher une sortie structurée (heure, niveau, sous-système, message).

### Sortie console

Les journaux de la console sont **sensibles au TTY** et formatés pour la lisibilité :

- Préfixes de sous-système (ex. `gateway/channels/whatsapp`)
- Coloration par niveau (info/warn/error)
- Mode compact ou JSON facultatif

Le formatage de la console est contrôlé par `logging.consoleStyle`.

## Configuration de la journalisation

Toute la configuration de la journalisation se trouve sous `logging` dans `~/.openclaw/openclaw.json`.

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

### Niveaux de journalisation

- `logging.level` : niveau des **journaux de fichiers** (JSONL).
- `logging.consoleLevel` : niveau de verbosité de la **console**.

Vous pouvez remplacer les deux via la variable d'environnement **`OPENCLAW_LOG_LEVEL`** (par exemple `OPENCLAW_LOG_LEVEL=debug`). La variable d'environnement a priorité sur le fichier de configuration, vous pouvez donc augmenter la verbosité pour une seule exécution sans modifier `openclaw.json`. Vous pouvez également passer l'option globale CLI **`--log-level <level>`** (par exemple, `openclaw --log-level debug gateway run`), qui remplace la variable d'environnement pour cette commande.

`--verbose` n'affecte que la sortie de la console ; il ne modifie pas les niveaux de journalisation des fichiers.

### Styles de console

`logging.consoleStyle` :

- `pretty` : convivial pour l'humain, coloré, avec horodatages.
- `compact` : sortie plus compacte (idéal pour les sessions longues).
- `json` : JSON par ligne (pour les processeurs de journaux).

### Masquage

Les résumés d'outils peuvent masquer les jetons sensibles avant qu'ils n'atteignent la console :

- `logging.redactSensitive` : `off` | `tools` (par défaut : `tools`)
- `logging.redactPatterns` : liste de chaînes regex pour remplacer l'ensemble par défaut

Le masquage affecte **uniquement la sortie de la console** et ne modifie pas les journaux de fichiers.

## Diagnostics + OpenTelemetry

Les diagnostics sont des événements structurés, lisibles par machine pour les exécutions de modèle **et**
la télémétrie du flux de messages (webhooks, mise en file d'attente, état de session). Ils ne **remplacent pas**
les journaux ; ils existent pour alimenter les métriques, les traces et autres exportateurs.

Les événements de diagnostic sont émis en processus, mais les exportateurs ne s'attachent que lorsque le diagnostic et le module d'exportation sont activés.

### OpenTelemetry contre OTLP

- **OpenTelemetry (OTel)** : le modèle de données + les SDK pour les traces, les métriques et les journaux.
- **OTLP** : le protocole filaire utilisé pour exporter les données OTel vers un collecteur/un backend.
- OpenClaw exporte via **OTLP/HTTP (protobuf)** aujourd'hui.

### Signaux exportés

- **Métriques** : compteurs + histogrammes (utilisation des jetons, flux des messages, mise en file d'attente).
- **Traces** : intervalles pour l'utilisation du modèle + le traitement des webhooks/messages.
- **Journaux** : exportés via OTLP lorsque `diagnostics.otel.logs` est activé. Le volume de journaux peut être élevé ; gardez à l'esprit `logging.level` et les filtres de l'exportateur.

### Catalogue des événements de diagnostic

Utilisation du modèle :

- `model.usage` : jetons, coût, durée, contexte, provider/model/channel, identifiants de session.

Flux des messages :

- `webhook.received` : entrée webhook par channel.
- `webhook.processed` : webhook géré + durée.
- `webhook.error` : erreurs du gestionnaire de webhook.
- `message.queued` : message mis en file d'attente pour traitement.
- `message.processed` : résultat + durée + erreur facultative.

File d'attente + session :

- `queue.lane.enqueue` : mise en file de la voie de la file de commandes + profondeur.
- `queue.lane.dequeue` : retrait de la voie de la file de commandes + temps d'attente.
- `session.state` : transition de l'état de la session + raison.
- `session.stuck` : avertissement de session bloquée + âge.
- `run.attempt` : métadonnées de nouvelle tentative/tentative d'exécution.
- `diagnostic.heartbeat` : compteurs agrégés (webhooks/file d'attente/session).

### Activer le diagnostic (sans exportateur)

Utilisez ceci si vous souhaitez que les événements de diagnostic soient disponibles pour les modules ou les récepteurs personnalisés :

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

Substitution d'environnement ( ponctuelle) :

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

Notes :

- Les journaux des indicateurs (Flag logs) vont vers le fichier journal standard (identique à `logging.file`).
- La sortie est toujours masquée conformément à `logging.redactSensitive`.
- Guide complet : [/diagnostics/flags](/fr/diagnostics/flags).

### Exporter vers OpenTelemetry

Les diagnostics peuvent être exportés via le plugin `diagnostics-otel` (OTLP/HTTP). Cela fonctionne avec tout collecteur ou backend OpenTelemetry acceptant OTLP/HTTP.

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
- `protocol` prend actuellement uniquement en charge `http/protobuf`. `grpc` est ignoré.
- Les métriques incluent l'utilisation des jetons, le coût, la taille du contexte, la durée d'exécution et les compteurs/histogrammes de flux de messages (webhooks, mise en file d'attente, état de la session, profondeur d'attente/attente).
- Les traces/métriques peuvent être activées ou désactivées avec `traces` / `metrics` (par défaut : activé). Les traces incluent les spans d'utilisation du modèle ainsi que les spans de traitement des webhooks/messages lorsqu'elles sont activées.
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
- `openclaw.context.tokens` (histogramme, attributs : `openclaw.context`,
  `openclaw.channel`, `openclaw.provider`, `openclaw.model`)

Flux de messages :

- `openclaw.webhook.received` (compteur, attrs : `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.webhook.error` (compteur, attrs : `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.webhook.duration_ms` (histogramme, attrs : `openclaw.channel`,
  `openclaw.webhook`)
- `openclaw.message.queued` (compteur, attrs : `openclaw.channel`,
  `openclaw.source`)
- `openclaw.message.processed` (compteur, attrs : `openclaw.channel`,
  `openclaw.outcome`)
- `openclaw.message.duration_ms` (histogramme, attrs : `openclaw.channel`,
  `openclaw.outcome`)

Files d'attente + sessions :

- `openclaw.queue.lane.enqueue` (compteur, attrs : `openclaw.lane`)
- `openclaw.queue.lane.dequeue` (compteur, attrs : `openclaw.lane`)
- `openclaw.queue.depth` (histogramme, attrs : `openclaw.lane` ou
  `openclaw.channel=heartbeat`)
- `openclaw.queue.wait_ms` (histogramme, attrs : `openclaw.lane`)
- `openclaw.session.state` (compteur, attrs : `openclaw.state`, `openclaw.reason`)
- `openclaw.session.stuck` (compteur, attrs : `openclaw.state`)
- `openclaw.session.stuck_age_ms` (histogramme, attrs : `openclaw.state`)
- `openclaw.run.attempt` (compteur, attrs : `openclaw.attempt`)

### Spans exportés (noms + attributs clés)

- `openclaw.model.usage`
  - `openclaw.channel`, `openclaw.provider`, `openclaw.model`
  - `openclaw.sessionKey`, `openclaw.sessionId`
  - `openclaw.tokens.*` (entrée/sorture/cache*lecture/cache*écriture/total)
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

### Échantillonnage + vidage

- Échantillonnage des traces : `diagnostics.otel.sampleRate` (0,0–1,0, spans racines uniquement).
- Intervalle d'export des métriques : `diagnostics.otel.flushIntervalMs` (min 1000 ms).

### Notes sur le protocole

- Les points de terminaison OTLP/HTTP peuvent être définis via `diagnostics.otel.endpoint` ou
  `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Si le point de terminaison contient déjà `/v1/traces` ou `/v1/metrics`, il est utilisé tel quel.
- Si le point de terminaison contient déjà `/v1/logs`, il est utilisé tel quel pour les journaux.
- `diagnostics.otel.logs` active l'export des journaux OTLP pour la sortie de l'enregistreur principal.

### Comportement d'export des journaux

- Les journaux OTLP utilisent les mêmes enregistrements structurés que ceux écrits dans `logging.file`.
- Respecter `logging.level` (niveau de journal fichier). Le masquage de la console ne s'applique **pas**
  aux journaux OTLP.
- Les installations à fort volume devraient privilégier l'échantillonnage/filtrage du collecteur OTLP.

## Conseils de dépannage

- **Gateway injoignable ?** Exécutez d'abord `openclaw doctor`.
- **Journaux vides ?** Vérifiez que le Gateway est en cours d'exécution et écrit dans le chemin de fichier
  indiqué dans `logging.file`.
- **Besoin de plus de détails ?** Définissez `logging.level` sur `debug` ou `trace` et réessayez.

import fr from "/components/footer/fr.mdx";

<fr />
