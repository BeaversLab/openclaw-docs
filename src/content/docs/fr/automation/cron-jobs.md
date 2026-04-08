---
summary: "Tâches planifiées, webhooks et déclencheurs PubSub Gmail pour le planificateur de la Gateway"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "Tâches planifiées"
---

# Tâches planifiées (Cron)

Cron est le planificateur intégré de la Gateway. Il persiste les tâches, réveille l'agent au bon moment et peut renvoyer le résultat vers un channel de discussion ou un point de terminaison webhook.

## Quick start

```bash
# Add a one-shot reminder
openclaw cron add \
  --name "Reminder" \
  --at "2026-02-01T16:00:00Z" \
  --session main \
  --system-event "Reminder: check the cron docs draft" \
  --wake now \
  --delete-after-run

# Check your jobs
openclaw cron list

# See run history
openclaw cron runs --id <job-id>
```

## Fonctionnement de Cron

- Cron s'exécute **au sein du processus de la Gateway** (et non au sein du model).
- Les tâches sont persistées à `~/.openclaw/cron/jobs.json`, les redémarrages ne perdent donc pas les planifications.
- Toutes les exécutions Cron créent des enregistrements de [tâche d'arrière-plan](/en/automation/tasks).
- Les tâches ponctuelles (`--at`) sont supprimées automatiquement après leur succès par défaut.
- Les exécutions Cron isolées essaient au mieux de fermer les onglets/processus de navigateur suivis pour leur session `cron:<jobId>` à la fin de l'exécution, afin que l'automatisation de navigateur détachée ne laisse pas de processus orphelins.
- Les exécutions Cron isolées se protègent également contre les réponses d'accusé de réception périmées. Si le
  premier résultat est seulement une mise à jour de l'état provisoire (`on it`, `rassemblant toutes
les informations`, et indices similaires) et qu'aucune exécution de sous-agent descendante n'est encore
  responsable de la réponse finale, OpenClaw relance une fois la demande pour le résultat
  réel avant la livraison.

La réconciliation des tâches pour Cron est gérée par l'exécution : une tâche Cron active reste active tant que
l'exécution Cron suit toujours cette tâche comme étant en cours d'exécution, même si une ancienne ligne de session enfant existe toujours.
Une fois que l'exécution cesse de posséder la tâche et que la fenêtre de grâce de 5 minutes expire, la maintenance peut
marquer la tâche comme `lost`.

## Types de planification

| Type    | Indicateur CLI | Description                                            |
| ------- | -------------- | ------------------------------------------------------ |
| `at`    | `--at`         | Horodatage ponctuel (ISO 8601 ou relatif comme `20m`)  |
| `every` | `--every`      | Intervalle fixe                                        |
| `cron`  | `--cron`       | Expression Cron à 5 ou 6 champs avec `--tz` facultatif |

Les horodatages sans fuseau horaire sont traités comme UTC. Ajoutez `--tz America/New_York` pour une planification locale à l'heure de l'horloge.

Les expressions récurrentes en début d'heure sont automatiquement étalées jusqu'à 5 minutes pour réduire les pics de charge. Utilisez `--exact` pour forcer une synchronisation précise ou `--stagger 30s` pour une fenêtre explicite.

## Styles d'exécution

| Style                 | valeur `--session`  | S'exécute dans               | Idéal pour                             |
| --------------------- | ------------------- | ---------------------------- | -------------------------------------- |
| Session principale    | `main`              | Prochain tour de heartbeat   | Rappels, événements système            |
| Isolé                 | `isolated`          | `cron:<jobId>` dédié         | Rapports, tâches d'arrière-plan        |
| Session actuelle      | `current`           | Lié au moment de la création | Travail récurrent sensible au contexte |
| Session personnalisée | `session:custom-id` | Session nommée persistante   | Workflows basés sur l'historique       |

Les tâches de **session principale** mettent en file d'attente un événement système et réveillent éventuellement le heartbeat (`--wake now` ou `--wake next-heartbeat`). Les tâches **isolées** exécutent un tour d'agent dédié avec une nouvelle session. Les **sessions personnalisées** (`session:xxx`) conservent le contexte entre les exécutions, permettant des flux de travail tels que des stand-ups quotidiens basés sur des résumés précédents.

Pour les tâches isolées, le démontage de l'exécution inclut désormais un nettoyage de meilleure possible du navigateur pour cette session cron. Les échecs de nettoyage sont ignorés pour que le résultat réel du cron prime.

Lorsque les exécutions cron isolées orchestrant des sous-agents, la livraison préfère également la sortie finale du descendant par rapport au texte intermédiaire périmé du parent. Si les descendants sont toujours en cours d'exécution, OpenClaw supprime cette mise à jour partielle du parent au lieu de l'annoncer.

### Options de payload pour les tâches isolées

- `--message` : texte du prompt (requis pour les tâches isolées)
- `--model` / `--thinking` : substitutions de modèle et de niveau de réflexion
- `--light-context` : ignorer l'injection du fichier d'amorçage de l'espace de travail
- `--tools exec,read` : restreindre les outils que la tâche peut utiliser

`--model` utilise le modèle autorisé sélectionné pour cette tâche. Si le modèle demandé n'est pas autorisé, le cron enregistre un avertissement et revient à la sélection de modèle par défaut de l'agent/de la tâche. Les chaînes de repli configurées s'appliquent toujours, mais une substitution de modèle simple sans liste de repli explicite par tâche n'ajoute plus le modèle principal de l'agent comme cible de retry supplémentaire masquée.

La priorité de sélection du modèle pour les tâches isolées est :

1. Remplacement du modèle par le hook Gmail (lorsque l'exécution provient de Gmail et que ce remplacement est autorisé)
2. Payload `model` par tâche
3. Remplacement du modèle de session cron stockée
4. Sélection du modèle par défaut/de l'agent

Le mode rapide suit également la sélection en direct résolue. Si la configuration du modèle sélectionné dispose de `params.fastMode`, le cron isolé l'utilise par défaut. Un remplacement `fastMode` de session stockée l'emporte toujours sur la configuration dans les deux sens.

Si une exécution isolée rencontre un transfert (handoff) avec changement de modèle en direct, le cron réessaie avec le provider/modèle commuté et conserve cette sélection en direct avant de réessayer. Lorsque le transfert transporte également un nouveau profil d'authentification, le cron conserve également ce remplacement de profil d'authentification. Les tentatives sont limitées : après la tentative initiale plus 2 nouvelles tentatives de commutation, le cron abandonne au lieu de boucler indéfiniment.

## Livraison et sortie

| Mode       | Ce qui se passe                                            |
| ---------- | ---------------------------------------------------------- |
| `announce` | Envoyer le résumé au channel cible (par défaut pour isolé) |
| `webhook`  | POST du payload de l'événement terminé vers une URL        |
| `none`     | Interne uniquement, aucune livraison                       |

Utilisez `--announce --channel telegram --to "-1001234567890"` pour la livraison vers un channel. Pour les sujets de forum Telegram, utilisez `-1001234567890:topic:123`. Les cibles Slack/Discord/Mattermost doivent utiliser des préfixes explicites (`channel:<id>`, `user:<id>`).

Pour les tâches isolées appartenant au cron, le runner possède le chemin de livraison final. L'agent est invité à renvoyer un résumé en texte brut, et ce résumé est ensuite envoyé via `announce`, `webhook`, ou conservé en interne pour `none`. `--no-deliver` ne redonne pas la livraison à l'agent ; il conserve l'exécution en interne.

Si la tâche originale indique explicitement d'envoyer un message à un destinataire externe, l'agent doit indiquer à qui/où ce message doit aller dans sa sortie, au lieu d'essayer de l'envoyer directement.

Les notifications d'échec suivent un chemin de destination distinct :

- `cron.failureDestination` définit une valeur par défaut globale pour les notifications d'échec.
- `job.delivery.failureDestination` remplace cela pour chaque tâche.
- Si aucun n'est défini et que la tâche diffuse déjà via `announce`, les notifications d'échec reviennent désormais à cette cible d'annonce principale.
- `delivery.failureDestination` n'est pris en charge que sur les tâches `sessionTarget="isolated"` sauf si le mode de livraison principal est `webhook`.

## Exemples CLI

Rappel ponctuel (session principale) :

```bash
openclaw cron add \
  --name "Calendar check" \
  --at "20m" \
  --session main \
  --system-event "Next heartbeat: check calendar." \
  --wake now
```

Tâche isolée récurrente avec diffusion :

```bash
openclaw cron add \
  --name "Morning brief" \
  --cron "0 7 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Summarize overnight updates." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

Tâche isolée avec model et substitution de réflexion :

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 1" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Weekly deep analysis of project progress." \
  --model "opus" \
  --thinking high \
  --announce
```

## Webhooks

Gateway peut exposer des points de terminaison HTTP webhook pour des déclencheurs externes. Activer dans la configuration :

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
  },
}
```

### Authentification

Chaque requête doit inclure le jeton de hook via l'en-tête :

- `Authorization: Bearer <token>` (recommandé)
- `x-openclaw-token: <token>`

Les jetons de chaîne de requête sont rejetés.

### POST /hooks/wake

Mettre en file d'attente un événement système pour la session principale :

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

- `text` (obligatoire) : description de l'événement
- `mode` (facultatif) : `now` (par défaut) ou `next-heartbeat`

### POST /hooks/agent

Exécuter un tour d'agent isolé :

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4-mini"}'
```

Champs : `message` (obligatoire), `name`, `agentId`, `wakeMode`, `deliver`, `channel`, `to`, `model`, `thinking`, `timeoutSeconds`.

### Hooks mappés (POST /hooks/\<name\>)

Les noms de hooks personnalisés sont résolus via `hooks.mappings` dans la configuration. Les mappages peuvent transformer des charges utiales arbitraires en actions `wake` ou `agent` avec des modèles ou des transformations de code.

### Sécurité

- Gardez les points de terminaison de hook derrière une boucle locale, un réseau tailnet ou un proxy inverse de confiance.
- Utilisez un jeton de hook dédié ; ne réutilisez pas les jetons d'authentification de la passerelle.
- Gardez `hooks.path` sur un sous-chemin dédié ; `/` est rejeté.
- Définissez `hooks.allowedAgentIds` pour limiter le routage explicite `agentId`.
- Gardez `hooks.allowRequestSessionKey=false` sauf si vous avez besoin de sessions sélectionnées par l'appelant.
- Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour contraindre les formes de clés de session autorisées.
- Hook payloads are wrapped with safety boundaries by default.

## Intégration Gmail PubSub

Wire Gmail inbox triggers to OpenClaw via Google PubSub.

**Prerequisites**: `gcloud` CLI, `gog` (gogcli), OpenClaw hooks enabled, Tailscale for the public HTTPS endpoint.

### Configuration assistée (recommandée)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

This writes `hooks.gmail` config, enables the Gmail preset, and uses Tailscale Funnel for the push endpoint.

### Gateway auto-start

When `hooks.enabled=true` and `hooks.gmail.account` is set, the Gateway starts `gog gmail watch serve` on boot and auto-renews the watch. Set `OPENCLAW_SKIP_GMAIL_WATCHER=1` to opt out.

### Configuration ponctuelle manuelle

1. Select the GCP project that owns the OAuth client used by `gog`:

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. Create topic and grant Gmail push access:

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. Start the watch:

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

### Gmail model override

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

## Gestion des tâches

```bash
# List all jobs
openclaw cron list

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw cron run <jobId>

# Run only if due
openclaw cron run <jobId> --due

# View run history
openclaw cron runs --id <jobId> --limit 50

# Delete a job
openclaw cron remove <jobId>

# Agent selection (multi-agent setups)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

Model override note:

- `openclaw cron add|edit --model ...` changes the job's selected model.
- If the model is allowed, that exact provider/model reaches the isolated agent
  run.
- If it is not allowed, cron warns and falls back to the job's agent/default
  model selection.
- Configured fallback chains still apply, but a plain `--model` override with
  no explicit per-job fallback list no longer falls through to the agent
  primary as a silent extra retry target.

## Configuration

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 1,
    retry: {
      maxAttempts: 3,
      backoffMs: [60000, 120000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "server_error"],
    },
    webhookToken: "replace-with-dedicated-webhook-token",
    sessionRetention: "24h",
    runLog: { maxBytes: "2mb", keepLines: 2000 },
  },
}
```

Disable cron: `cron.enabled: false` or `OPENCLAW_SKIP_CRON=1`.

**One-shot retry**: transient errors (rate limit, overload, network, server error) retry up to 3 times with exponential backoff. Permanent errors disable immediately.

**Recurring retry**: exponential backoff (30s to 60m) between retries. Backoff resets after the next successful run.

**Maintenance**: `cron.sessionRetention` (default `24h`) prunes isolated run-session entries. `cron.runLog.maxBytes` / `cron.runLog.keepLines` auto-prune run-log files.

## Dépannage

### Command ladder

```bash
openclaw status
openclaw gateway status
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
openclaw doctor
```

### Cron not firing

- Check `cron.enabled` and `OPENCLAW_SKIP_CRON` env var.
- Confirm the Gateway is running continuously.
- Pour les planifications `cron`, vérifiez le fuseau horaire (`--tz`) par rapport au fuseau horaire de l'hôte.
- `reason: not-due` dans la sortie d'exécution signifie que l'exécution manuelle a été vérifiée avec `openclaw cron run <jobId> --due` et que la tâche n'était pas encore due.

### Cron s'est déclenché mais pas de livraison

- Le mode de livraison est `none` signifie qu'aucun message externe n'est attendu.
- La cible de livraison manquante/invalide (`channel`/`to`) signifie que l'envoi a été ignoré.
- Les erreurs d'authentification de canal (`unauthorized`, `Forbidden`) signifient que la livraison a été bloquée par les identifiants.
- Si l'exécution isolée renvoie uniquement le jeton silencieux (`NO_REPLY` / `no_reply`),
  OpenClaw supprime la livraison sortante directe et supprime également le chemin de résumé mis en file d'attente de secours,
  donc rien n'est renvoyé à la discussion.
- Pour les tâches isolées détenues par cron, ne vous attendez pas à ce que l'agent utilise l'outil de message
  comme solution de secours. Le runner possède la livraison finale ; `--no-deliver` la garde
  en interne au lieu de permettre un envoi direct.

### Pièges de fuseau horaire

- Cron sans `--tz` utilise le fuseau horaire de l'hôte de la passerelle.
- Les planifications `at` sans fuseau horaire sont traitées comme UTC.
- Le `activeHours` Heartbeat utilise la résolution de fuseau horaire configurée.

## Connexes

- [Automation & Tasks](/en/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Background Tasks](/en/automation/tasks) — registre des tâches pour les exécutions cron
- [Heartbeat](/en/gateway/heartbeat) — tours de session principale périodiques
- [Timezone](/en/concepts/timezone) — configuration du fuseau horaire
