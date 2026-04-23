---
summary: "Tâches planifiées, webhooks et déclencheurs Gmail PubSub pour le planificateur du Gateway"
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
openclaw cron show <job-id>

# See run history
openclaw cron runs --id <job-id>
```

## Fonctionnement de Cron

- Cron s'exécute **au sein du processus de la Gateway** (et non au sein du model).
- Les définitions de tâches sont persistantes dans `~/.openclaw/cron/jobs.json`, ce qui évite de perdre les planifications lors des redémarrages.
- L'état d'exécution au runtime persiste à côté dans `~/.openclaw/cron/jobs-state.json`. Si vous suivez les définitions cron dans git, suivez `jobs.json` et ajoutez `jobs-state.json` à gitignore.
- Après la séparation, les anciennes versions d'OpenClaw peuvent lire `jobs.json` mais peuvent considérer les tâches comme nouvelles car les champs d'exécution résident désormais dans `jobs-state.json`.
- Toutes les exécutions cron créent des enregistrements de [tâche d'arrière-plan](/fr/automation/tasks).
- Les tâches ponctuelles (`--at`) sont automatiquement supprimées après succès par défaut.
- Les exécutions cron isolées essaient au mieux de fermer les onglets/processus de navigateur suivis pour leur session `cron:<jobId>` lorsque l'exécution se termine, afin que l'automatisation de navigateur détachée ne laisse pas de processus orphelins.
- Les exécutions cron isolées se protègent également contre les réponses d'accusé de réception obsolètes. Si le premier résultat n'est qu'une mise à jour de l'état provisoire (`on it`, `rassemblement de toutes les informations
  et autres indices similaires) et qu'aucune exécution de sous-agent descendant n'est encore responsable de la réponse finale, OpenClaw relance une fois une demande pour le résultat réel avant la livraison.

<a id="maintenance"></a>

La réconciliation des tâches pour cron est gérée par le runtime : une tâche cron active reste active tant que le runtime cron suit toujours cette tâche comme en cours d'exécution, même si une ancienne ligne de session enfant existe toujours. Une fois que le runtime cesse de posséder la tâche et que la fenêtre de grâce de 5 minutes expire, la maintenance peut marquer la tâche comme `lost`.

## Types de planification

| Type    | Indicateur CLI | Description                                            |
| ------- | -------------- | ------------------------------------------------------ |
| `at`    | `--at`         | Horodatage ponctuel (ISO 8601 ou relatif comme `20m`)  |
| `every` | `--every`      | Intervalle fixe                                        |
| `cron`  | `--cron`       | Expression cron à 5 ou 6 champs avec `--tz` facultatif |

Les horodatages sans fuseau horaire sont traités comme UTC. Ajoutez `--tz America/New_York` pour la planification locale en heure de l'horloge murale.

Les expressions récurrentes au début de l'heure sont automatiquement étalées jusqu'à 5 minutes pour réduire les pics de charge. Utilisez `--exact` pour forcer une minutage précis ou `--stagger 30s` pour une fenêtre explicite.

### Le jour du mois et le jour de la semaine utilisent une logique OU

Les expressions cron sont analysées par [croner](https://github.com/Hexagon/croner). Lorsque les champs jour-du-mois et jour-de-la-semaine sont tous deux non génériques, croner correspond lorsque **l'un ou l'autre** des champs correspond — et non les deux. C'est le comportement standard du cron Vixie.

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

Cela se déclenche environ 5 à 6 fois par mois au lieu de 0 à 1 fois par mois. OpenClaw utilise ici le comportement OU par défaut de Croner. Pour exiger les deux conditions, utilisez le modificateur de jour-de-la-semaine `+` de Croner (`0 9 15 * +1`) ou planifiez sur un champ et gardez l'autre dans l'invite ou la commande de votre tâche.

## Styles d'exécution

| Style                 | Valeur `--session`  | S'exécute dans               | Idéal pour                       |
| --------------------- | ------------------- | ---------------------------- | -------------------------------- |
| Session principale    | `main`              | Prochain tour de heartbeat   | Rappels, événements système      |
| Isolé                 | `isolated`          | `cron:<jobId>` dédié         | Rapports, tâches d'arrière-plan  |
| Session actuelle      | `current`           | Lié au moment de la création | Travail récurrent contextuel     |
| Session personnalisée | `session:custom-id` | Session nommée persistante   | Workflows basés sur l'historique |

Les tâches de **session principale** mettent en file d'attente un événement système et réveillent éventuellement le heartbeat (`--wake now` ou `--wake next-heartbeat`). Les tâches **isolées** exécutent un tour d'agent dédié avec une nouvelle session. Les **sessions personnalisées** (`session:xxx`) conservent le contexte entre les exécutions, permettant des flux de travail tels que des points quotidiens qui s'appuient sur des résumés précédents.

Pour les tâches isolées, le démontage de l'exécution inclut désormais un nettoyage de navigationur de meilleure effort pour cette session cron. Les échecs de nettoyage sont ignorés afin que le résultat cron réel prévale.

Lorsque les exécutions cron isolées orchestrent des sous-agents, la livraison préfère également la sortie finale du descendant au texte intermédiaire parent obsolète. Si les descendants sont toujours en cours d'exécution, OpenClaw supprime cette mise à jour parent partielle au lieu de l'annoncer.

### Options de payload pour les tâches isolées

- `--message` : texte d'invite (requis pour isolé)
- `--model` / `--thinking` : remplacements du model et du niveau de réflexion
- `--light-context` : ignorer l'injection du fichier d'amorçage de l'espace de travail
- `--tools exec,read` : restreindre les outils que la tâche peut utiliser

`--model` utilise le model autorisé sélectionné pour cette tâche. Si le model demandé
n'est pas autorisé, cron enregistre un avertissement et revient à la sélection du
model agent/défaut de la tâche à la place. Les chaînes de repli configurées s'appliquent toujours, mais un remplacement de model simple sans liste de repli explicite par tâche n'ajoute plus l'agent principal comme cible de réessai cachée supplémentaire.

La priorité de sélection du model pour les tâches isolées est :

1. Remplacement du model par le hook Gmail (lorsque l'exécution provient de Gmail et que ce remplacement est autorisé)
2. Payload par tâche `model`
3. Remplacement du model de session cron stockée
4. Sélection du model agent/défaut

Le mode rapide suit également la sélection en direct résolue. Si la configuration du model sélectionné
possède `params.fastMode`, cron isolé l'utilise par défaut. Un remplacement `fastMode` de session stockée l'emporte toujours sur la configuration dans les deux sens.

Si une exécution isolée rencontre un transfert de changement de model en direct, cron réessaie avec
le provider/model changé et conserve cette sélection en direct avant de réessayer. Lorsque
le changement transporte également un nouveau profil d'authentification, cron conserve également ce remplacement
de profil d'authentification. Les tentatives sont limitées : après la tentative initiale plus 2 tentatives
de changement, cron abandonne au lieu de boucler indéfiniment.

## Livraison et sortie

| Mode       | Ce qui se passe                                                             |
| ---------- | --------------------------------------------------------------------------- |
| `announce` | Livraison de secours du texte final à la cible si l'agent ne l'a pas envoyé |
| `webhook`  | POST du payload de l'événement terminé vers une URL                         |
| `none`     | Pas de livraison de secours du runner                                       |

Utilisez `--announce --channel telegram --to "-1001234567890"` pour la livraison vers le channel. Pour les sujets de forum Telegram, utilisez `-1001234567890:topic:123`. Les cibles Slack/Discord/Mattermost devraient utiliser des préfixes explicites (`channel:<id>`, `user:<id>`).

Pour les tâches isolées, la diffusion par chat est partagée. Si une route de chat est disponible, l'agent peut utiliser l'outil `message` même lorsque la tâche utilise `--no-deliver`. Si l'agent envoie à la cible configurée/actuelle, OpenClaw ignore l'annonce de secours. Sinon, `announce`, `webhook` et `none` contrôlent uniquement ce que le gestionnaire fait de la réponse finale après le tour de l'agent.

Les notifications d'échec suivent un chemin de destination distinct :

- `cron.failureDestination` définit une valeur par défaut globale pour les notifications d'échec.
- `job.delivery.failureDestination` remplace cette valeur pour chaque tâche.
- Si aucun des deux n'est défini et que la tâche est déjà diffusée via `announce`, les notifications d'échec reviennent maintenant à cette cible d'annonce principale.
- `delivery.failureDestination` est uniquement pris en charge sur les tâches `sessionTarget="isolated"`, sauf si le mode de diffusion principal est `webhook`.

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

Tâche isolée avec modèle et substitution de réflexion :

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

Chaque requête doit inclure le jeton du hook via l'en-tête :

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

Les noms de hooks personnalisés sont résolus via `hooks.mappings` dans la configuration. Les mappages peuvent transformer des charges utiles arbitraires en actions `wake` ou `agent` avec des modèles ou des transformations de code.

### Sécurité

- Gardez les points de terminaison des hooks derrière le bouclage (loopback), le tailnet ou un proxy inverse de confiance.
- Utilisez un jeton de hook dédié ; ne réutilisez pas les jetons d'authentification de la passerelle.
- Conservez `hooks.path` sur un sous-chemin dédié ; `/` est rejeté.
- Définissez `hooks.allowedAgentIds` pour limiter le routage explicite `agentId`.
- Gardez `hooks.allowRequestSessionKey=false` activé, sauf si vous nécessitez des sessions sélectionnées par l'appelant.
- Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour contraindre les formes de clés de session autorisées.
- Les charges utiles des hooks sont enveloppées avec des limites de sécurité par défaut.

## Intégration Gmail PubSub

Connectez les déclencheurs de boîte de réception Gmail à OpenClaw via Google PubSub.

**Prérequis** : `gcloud` CLI, `gog` (gogcli), hooks OpenClaw activés, Tailscale pour le point de terminaison HTTPS public.

### Configuration via assistant (recommandé)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Cela écrit la configuration `hooks.gmail`, active le préréglage Gmail et utilise Tailscale Funnel pour le point de terminaison de push.

### Démarrage automatique de Gateway

Lorsque `hooks.enabled=true` et `hooks.gmail.account` sont définis, Gateway démarre `gog gmail watch serve` au démarrage et renouvelle automatiquement la surveillance. Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour désactiver.

### Configuration ponctuelle manuelle

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

3. Démarrez la surveillance :

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

# Show one job, including resolved delivery route
openclaw cron show <jobId>

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

Remarque sur le remplacement du modèle :

- `openclaw cron add|edit --model ...` modifie le modèle sélectionné pour la tâche.
- Si le modèle est autorisé, ce fournisseur/modèle exact atteint l'exécution
  de l'agent isolé.
- S'il n'est pas autorisé, cron avertit et revient à la sélection du modèle par défaut/de l'agent
  de la tâche.
- Les chaînes de repli configurées s'appliquent toujours, mais un remplacement simple `--model` sans
  liste de repli explicite par tâche ne revient plus en silence au principal
  de l'agent comme cible de réessai supplémentaire.

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

Le sidecar d'état d'exécution est dérivé de `cron.store` : un magasin `.json` tel que
`~/clawd/cron/jobs.json` utilise `~/clawd/cron/jobs-state.json`, tandis qu'un chemin de magasin
sans le suffixe `.json` ajoute `-state.json`.

Désactiver cron : `cron.enabled: false` ou `OPENCLAW_SKIP_CRON=1`.

**Nouvelle tentative unique** : les erreurs transitoires (limite de débit, surcharge, réseau, erreur serveur) sont réessayées jusqu'à 3 fois avec un backoff exponentiel. Les erreurs permanentes désactivent immédiatement.

**Nouvelle tentative récurrente** : backoff exponentiel (30s à 60m) entre les tentatives. Le backoff est réinitialisé après la prochaine exécution réussie.

**Maintenance** : `cron.sessionRetention` (par défaut `24h`) nettoie les entrées de session d'exécution isolées. `cron.runLog.maxBytes` / `cron.runLog.keepLines` nettoient automatiquement les fichiers de journal d'exécution.

## Dépannage

### Échelle de commande

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

- Vérifiez la env var `cron.enabled` et `OPENCLAW_SKIP_CRON`.
- Confirmez que le Gateway fonctionne en continu.
- Pour les planifications `cron`, vérifiez le fuseau horaire (`--tz`) par rapport au fuseau horaire de l'hôte.
- `reason: not-due` dans la sortie d'exécution signifie qu'une exécution manuelle a été vérifiée avec `openclaw cron run <jobId> --due` et que la tâche n'était pas encore attendue.

### Cron s'est déclenché mais pas de livraison

- Le mode de livraison `none` signifie qu'aucun envoi de repli du runner n'est attendu. L'agent peut
  toujours envoyer directement avec l'outil `message` lorsqu'une route de discussion est disponible.
- Une cible de livraison manquante/invalide (`channel`/`to`) signifie que la sortie a été ignorée.
- Les erreurs d'authentification de canal (`unauthorized`, `Forbidden`) signifient que la livraison a été bloquée par les informations d'identification.
- Si l'exécution isolée renvoie uniquement le jeton silencieux (`NO_REPLY` / `no_reply`),
  OpenClaw supprime la livraison sortante directe et supprime également le chemin
  de résumé mis en file d'attente de repli, rien n'est donc renvoyé à la discussion.
- Si l'agent doit lui-même envoyer un message à l'utilisateur, vérifiez que la tâche dispose d'une route utilisable (`channel: "last"` avec une discussion précédente, ou un channel/cible explicite).

### Pièges liés au fuseau horaire

- Cron sans `--tz` utilise le fuseau horaire de l'hôte de la passerelle.
- Les planifications `at` sans fuseau horaire sont traitées comme UTC.
- Le `activeHours` Heartbeat utilise la résolution de fuseau horaire configurée.

## Connexes

- [Automation & Tasks](/fr/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Background Tasks](/fr/automation/tasks) — registre des tâches pour les exécutions cron
- [Heartbeat](/fr/gateway/heartbeat) — tours de session principale périodiques
- [Timezone](/fr/concepts/timezone) — configuration du fuseau horaire
