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
- Les tâches persistent à `~/.openclaw/cron/jobs.json`, les redémarrages ne font donc pas perdre les planifications.
- Toutes les exécutions cron créent des enregistrements de [tâche d'arrière-plan](/en/automation/tasks).
- Les tâches ponctuelles (`--at`) sont automatiquement supprimées après succès par défaut.
- Les exécutions cron isolées tentent au mieux de fermer les onglets/processus de navigateur suivis pour leur session `cron:<jobId>` lorsque l'exécution se termine, afin que l'automatisation de navigateur détachée ne laisse pas de processus orphelins derrière elle.
- Les exécutions cron isolées se protègent également contre les réponses d'accusé de réception obsolètes. Si le premier résultat n'est qu'une mise à jour de l'état intérimaire (`on it`, `pulling everything
together`, et indices similaires) et qu'aucune exécution de sous-agent descendant n'est encore responsable de la réponse finale, OpenClaw redemande une fois le résultat réel avant la livraison.

<a id="maintenance"></a>

La réconciliation des tâches pour cron est gérée par l'exécution : une tâche cron active reste active tant que l'exécution cron suit toujours cette tâche comme en cours d'exécution, même si une ancienne ligne de session enfant existe toujours. Une fois que l'exécution cesse de posséder la tâche et que la fenêtre de grâce de 5 minutes expire, la maintenance peut marquer la tâche comme `lost`.

## Types de planification

| Type    | Indicateur CLI | Description                                            |
| ------- | -------------- | ------------------------------------------------------ |
| `at`    | `--at`         | Horodatage ponctuel (ISO 8601 ou relatif comme `20m`)  |
| `every` | `--every`      | Intervalle fixe                                        |
| `cron`  | `--cron`       | Expression cron à 5 ou 6 champs avec `--tz` facultatif |

Les horodatages sans fuseau horaire sont traités comme UTC. Ajoutez `--tz America/New_York` pour une planification locale de l'horloge murale.

Les expressions récurrentes en haut de l'heure sont automatiquement étalées jusqu'à 5 minutes pour réduire les pics de charge. Utilisez `--exact` pour forcer un timing précis ou `--stagger 30s` pour une fenêtre explicite.

## Styles d'exécution

| Style                 | valeur `--session`  | S'exécute dans                     | Idéal pour                       |
| --------------------- | ------------------- | ---------------------------------- | -------------------------------- |
| Session principale    | `main`              | Prochain tour de battement de cœur | Rappels, événements système      |
| Isolé                 | `isolated`          | `cron:<jobId>` dédié               | Rapports, tâches d'arrière-plan  |
| Session actuelle      | `current`           | Lié au moment de la création       | Travail récurrent contextuel     |
| Session personnalisée | `session:custom-id` | Session nommée persistante         | Workflows basés sur l'historique |

Les tâches de **session principale** mettent en file d'attente un événement système et réveillent éventuellement le heartbeat (`--wake now` ou `--wake next-heartbeat`). Les tâches **isolées** exécutent un tour d'agent dédié avec une nouvelle session. Les **sessions personnalisées** (`session:xxx`) conservent le contexte entre les exécutions, permettant des flux de travail comme les points quotidiens qui s'appuient sur des résumés précédents.

Pour les tâches isolées, le démontage de l'exécution inclut désormais un nettoyage de navigation de meilleure instance pour cette session cron. Les échecs de nettoyage sont ignorés afin que le résultat cron réel l'emporte toujours.

Lorsque les exécutions cron isolées orchestrent des sous-agents, la livraison privilégie également la sortie du descendant final par rapport au texte intermédiaire parent obsolète. Si les descendants sont toujours en cours d'exécution, OpenClaw supprime cette mise à jour parentielle partielle au lieu de l'annoncer.

### Options de payload pour les tâches isolées

- `--message` : texte du prompt (requis pour isolé)
- `--model` / `--thinking` : substitutions de model et de niveau de réflexion
- `--light-context` : ignorer l'injection du fichier d'amorçage de l'espace de travail
- `--tools exec,read` : restreindre les outils que la tâche peut utiliser

`--model` utilise le model autorisé sélectionné pour cette tâche. Si le model demandé n'est pas autorisé, cron enregistre un avertissement et revient à la sélection du model agent/défaut de la tâche à la place. Les chaînes de repli configurées s'appliquent toujours, mais une substitution de model simple sans liste de repli explicite par tâche n'ajoute plus l'agent principal comme cible de réessai supplémentaire cachée.

La priorité de sélection du model pour les tâches isolées est :

1. Substitution du model du hook Gmail (lorsque l'exécution provient de Gmail et que cette substitution est autorisée)
2. Payload par tâche `model`
3. Substitution du model de session cron stockée
4. Sélection du model agent/défaut

Le mode rapide suit également la sélection en direct résolue. Si la configuration du model sélectionné a `params.fastMode`, le cron isolé l'utilise par défaut. Une substitution `fastMode` de session stockée l'emporte toujours sur la configuration dans les deux sens.

Si une exécution isolée rencontre une transmission de changement de modèle en direct (live model-switch handoff), cron réessaie avec le fournisseur/modèle commuté et persiste cette sélection en direct avant de réessayer. Lorsque le commutateur transporte également un nouveau profil d'authentification, cron persiste également cette remplacement du profil d'authentification. Les nouvelles tentatives sont limitées : après la tentative initiale plus 2 nouvelles tentatives de commutation, cron abandonne au lieu de boucler indéfiniment.

## Livraison et sortie

| Mode       | Ce qui se passe                                            |
| ---------- | ---------------------------------------------------------- |
| `announce` | Envoyer le résumé au channel cible (par défaut pour isolé) |
| `webhook`  | POST la charge utile de l'événement terminé à une URL      |
| `none`     | Interne uniquement, aucune livraison                       |

Utilisez `--announce --channel telegram --to "-1001234567890"` pour la livraison vers le channel. Pour les sujets de forum Telegram, utilisez `-1001234567890:topic:123`. Les cibles Slack/Discord/Mattermost doivent utiliser des préfixes explicites (`channel:<id>`, `user:<id>`).

Pour les tâches isolées possédées par cron, le gestionnaire (runner) possède le chemin de livraison final. L'agent est invité à renvoyer un résumé en texte brut, et ce résumé est ensuite envoyé via `announce`, `webhook`, ou conservé en interne pour `none`. `--no-deliver` ne redonne pas la livraison à l'agent ; il garde l'exécution en interne.

Si la tâche originale demande explicitement d'envoyer un message à un destinataire externe, l'agent doit noter à qui/où ce message doit aller dans sa sortie, au lieu d'essayer de l'envoyer directement.

Les notifications d'échec suivent un chemin de destination distinct :

- `cron.failureDestination` définit une valeur par défaut globale pour les notifications d'échec.
- `job.delivery.failureDestination` remplace cela pour chaque tâche.
- Si aucun n'est défini et que la tâche est déjà livrée via `announce`, les notifications d'échec reviennent maintenant à cette cible d'annonce principale.
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

Tâche isolée récurrente avec livraison :

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

Tâche isolée avec remplacement de modèle et de réflexion :

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

Gateway peut exposer des points de terminaison webhook HTTP pour des déclencheurs externes. Activer dans la configuration :

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

Chaque requête doit inclure le jeton du hook via l'en-tête :

- `Authorization: Bearer <token>` (recommandé)
- `x-openclaw-token: <token>`

Les jetons de chaîne de requête (query-string) sont rejetés.

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

### Crochets mappés (POST /hooks/\<name\>)

Les noms de crochets personnalisés sont résolus via `hooks.mappings` dans la configuration. Les mappages peuvent transformer des charges utiles arbitraires en actions `wake` ou `agent` avec des modèles ou des transformations de code.

### Sécurité

- Gardez les points de terminaison des crochets derrière une boucle locale (loopback), un tailnet ou un proxy inverse approuvé.
- Utilisez un jeton de crochet dédié ; ne réutilisez pas les jetons d'authentification de la passerelle.
- Conservez `hooks.path` sur un sous-chemin dédié ; `/` est rejeté.
- Définissez `hooks.allowedAgentIds` pour limiter le routage explicite `agentId`.
- Conservez `hooks.allowRequestSessionKey=false` sauf si vous avez besoin de sessions sélectionnées par l'appelant.
- Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour contraindre les formes autorisées des clés de session.
- Les charges utiles des crochets sont enveloppées avec des limites de sécurité par défaut.

## Intégration Gmail PubSub

Connectez les déclencheurs de boîte de réception Gmail à OpenClaw via Google PubSub.

**Prérequis** : `gcloud` CLI, `gog` (gogcli), crochets OpenClaw activés, Tailscale pour le point de terminaison HTTPS public.

### Configuration de l'assistant (recommandé)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Cela écrit la configuration `hooks.gmail`, active le préréglage Gmail et utilise le Funnel Tailscale pour le point de terminaison de push.

### Démarrage automatique Gateway

Lorsque `hooks.enabled=true` et `hooks.gmail.account` sont définis, le Gateway lance `gog gmail watch serve` au démarrage et renouvelle automatiquement la surveillance. Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour désactiver.

### Configuration unique manuelle

1. Sélectionnez le projet GCP qui possède le client OAuth utilisé par `gog` :

```bash
gcloud auth login
gcloud config set project <project-id>
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

2. Créez un sujet et accordez l'accès push Gmail :

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

3. Démarrer la surveillance :

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

### Remplacement du modèle Gmail

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

Note sur le remplacement du modèle :

- `openclaw cron add|edit --model ...` modifie le modèle sélectionné pour la tâche.
- Si le modèle est autorisé, ce fournisseur/modèle exact atteint l'exécution
  de l'agent isolé.
- S'il n'est pas autorisé, cron avertit et revient à la sélection de
  modèle par défaut/agent de la tâche.
- Les chaînes de repli configurées s'appliquent toujours, mais un remplacement `--model` simple
  sans liste de repli explicite par tâche ne revient plus à la valeur
  principale de l'agent comme cible de réessai silencieux supplémentaire.

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

Désactiver cron : `cron.enabled: false` ou `OPENCLAW_SKIP_CRON=1`.

**Réessai ponctuel** : les erreurs transitoires (limite de taux, surcharge, réseau, erreur serveur) sont réessayées jusqu'à 3 fois avec un backoff exponentiel. Les erreurs permanentes désactivent immédiatement.

**Réessai récurrent** : backoff exponentiel (30 s à 60 m) entre les tentatives. Le backoff est réinitialisé après la prochaine exécution réussie.

**Maintenance** : `cron.sessionRetention` (par défaut `24h`) nettoie les entrées de session d'exécution isolée. `cron.runLog.maxBytes` / `cron.runLog.keepLines` nettoient automatiquement les fichiers de journal d'exécution.

## Dépannage

### Échelle de commandes

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

### Cron ne se déclenche pas

- Vérifiez la variable d'environnement `cron.enabled` et `OPENCLAW_SKIP_CRON`.
- Confirmez que le Gateway fonctionne en continu.
- Pour les planifications `cron`, vérifiez le fuseau horaire (`--tz`) par rapport au fuseau horaire de l'hôte.
- `reason: not-due` dans la sortie d'exécution signifie qu'une exécution manuelle a été vérifiée avec `openclaw cron run <jobId> --due` et que la tâche n'était pas encore attendue.

### Cron s'est déclenché mais pas de livraison

- Le mode de livraison est `none` signifie qu'aucun message externe n'est attendu.
- La cible de livraison manquante/invalide (`channel`/`to`) signifie que l'envoi a été ignoré.
- Les erreurs d'authentification de canal (`unauthorized`, `Forbidden`) signifient que la livraison a été bloquée par les informations d'identification.
- Si l'exécution isolée renvoie uniquement le jeton silencieux (`NO_REPLY` / `no_reply`),
  OpenClaw supprime la livraison directe sortante et supprime également le chemin de résumé mis en file d'attente de secours,
  de sorte que rien n'est renvoyé à la discussion.
- Pour les tâches isolées détenues par cron, ne vous attendez pas à ce que l'agent utilise l'outil de message
  comme solution de repli. Le responsable d'exécution possède la livraison finale ; `--no-deliver` la garde
  en interne au lieu de permettre un envoi direct.

### Pièges de fuseau horaire

- Cron sans `--tz` utilise le fuseau horaire de l'hôte de la passerelle.
- Les planifications `at` sans fuseau horaire sont traitées comme UTC.
- Le `activeHours` Heartbeat utilise la résolution de fuseau horaire configurée.

## Connexes

- [Automatisation et tâches](/en/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches d'arrière-plan](/en/automation/tasks) — registre des tâches pour les exécutions cron
- [Heartbeat](/en/gateway/heartbeat) — tours de session principale périodiques
- [Fuseau horaire](/en/concepts/timezone) — configuration du fuseau horaire
