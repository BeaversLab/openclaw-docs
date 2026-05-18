---
summary: "Tâches planifiées, webhooks et déclencheurs Gmail PubSub pour le planificateur du Gateway"
read_when:
  - Scheduling background jobs or wakeups
  - Wiring external triggers (webhooks, Gmail) into OpenClaw
  - Deciding between heartbeat and cron for scheduled tasks
title: "Tâches planifiées"
sidebarTitle: "Tâches planifiées"
---

Cron est le planificateur intégré de la Gateway. Il persiste les tâches, réveille l'agent au bon moment et peut renvoyer le résultat vers un channel de discussion ou un point de terminaison webhook.

## Quick start

<Steps>
  <Step title="Ajouter un rappel ponctuel">
    ```bash
    openclaw cron add \
      --name "Reminder" \
      --at "2026-02-01T16:00:00Z" \
      --session main \
      --system-event "Reminder: check the cron docs draft" \
      --wake now \
      --delete-after-run
    ```
  </Step>
  <Step title="Vérifier vos tâches">
    ```bash
    openclaw cron list
    openclaw cron get <job-id>
    openclaw cron show <job-id>
    ```
  </Step>
  <Step title="Voir l'historique d'exécution">
    ```bash
    openclaw cron runs --id <job-id>
    ```
  </Step>
</Steps>

## Fonctionnement de cron

- Cron s'exécute **au sein du processus du Gateway** (et non au sein du modèle).
- Les définitions des tâches sont persistantes dans `~/.openclaw/cron/jobs.json`, donc les redémarrages ne font pas perdre les planifications.
- L'état d'exécution au moment de l'exécution (runtime) persiste à côté dans `~/.openclaw/cron/jobs-state.json`. Si vous suivez les définitions cron dans git, suivez `jobs.json` et mettez `jobs-state.json` dans votre .gitignore.
- Après la séparation, les anciennes versions de OpenClaw peuvent lire `jobs.json` mais peuvent traiter les tâches comme nouvelles car les champs d'exécution résident désormais dans `jobs-state.json`.
- Lorsque `jobs.json` est modifié pendant que le Gateway est en cours d'exécution ou arrêté, OpenClaw compare les champs de planification modifiés avec les métadonnées des créneaux d'exécution en attente et efface les valeurs `nextRunAtMs` obsolètes. Les reformats purs ou les réécritures ne changeant que l'ordre des clés préservent le créneau en attente.
- Toutes les exécutions cron créent des enregistrements de [tâche d'arrière-plan](/fr/automation/tasks).
- Au démarrage du Gateway, les travaux isolés de tour d'agent en retard sont replanifiés en dehors de la fenêtre de connexion au channel au lieu d'être rejoués immédiatement, afin que le démarrage de Discord/Telegram et la configuration des commandes natives restent réactifs après les redémarrages.
- Les travaux ponctuels (`--at`) sont supprimés automatiquement après succès par défaut.
- Les exécutions cron isolées tentent au mieux de fermer les onglets/processus de navigateur suivis pour leur session `cron:<jobId>` lorsque l'exécution est terminée, afin que l'automatisation de navigateur détachée ne laisse pas de processus orphelins derrière elle.
- Les exécutions cron isolées qui reçoivent la subvention étroite d'auto-nettoyage cron peuvent toujours lire le statut du planificateur, une liste auto-filtrée de leur travail actuel, et l'historique d'exécution de ce travail, afin que les vérifications de statut/heartbeat puissent inspecter leur propre planification sans obtenir un accès plus large à la mutation cron.
- Les exécutions cron isolées se protègent également contre les réponses d'accusé de réception périmées. Si le premier résultat n'est qu'une mise à jour de statut provisoire (`on it`, `pulling everything together`, et indices similaires) et qu'aucune exécution de sous-agent descendant n'est encore responsable de la réponse finale, OpenClaw redemande une fois le résultat réel avant la livraison.
- Les exécutions cron isolées préfèrent les métadonnées structurées de refus d'exécution de l'exécution intégrée, puis se rabattent sur les marqueurs connus de résumé/sortie finaux tels que `SYSTEM_RUN_DENIED` et `INVALID_REQUEST`, afin qu'une commande bloquée ne soit pas signalée comme une exécution réussie.
- Les exécutions cron isolées traitent également les échecs d'agent au niveau de l'exécution comme des erreurs de travail même lorsqu'aucune charge utile de réponse n'est produite, de sorte que les échecs de model/provider incrémentent les compteurs d'erreurs et déclenchent des notifications d'échec au lieu d'effacer le travail comme réussi.
- Lorsqu'un travail isolé de tour d'agent atteint `timeoutSeconds`, le cron abandonne l'exécution de l'agent sous-jacente et lui accorde une courte fenêtre de nettoyage. Si l'exécution ne se vide pas, le nettoyage propriété du Gateway force la suppression de la propriété de session de cette exécution avant que le cron n'enregistre le délai d'attente, afin que le travail de chat en file d'attente ne reste pas bloqué derrière une session de traitement périmée.
- Si un tour d'agent isolé stagne avant le démarrage du runner ou avant le premier appel du model, cron enregistre un délai d'attente spécifique à la phase tel que `setup timed out before runner start` ou `stalled before first model call (last phase: context-engine)`. Ces chiens de garde couvrent les fournisseurs intégrés et les fournisseurs basés sur la CLI avant que leur processus externe CLI ne soit réellement démarré, et sont plafonnés indépendamment des longues valeurs `timeoutSeconds` afin que les échecs de démarrage à froid/d'authentification/contexte apparaissent rapidement au lieu d'attendre le budget complet de la tâche.

<a id="maintenance"></a>

<Note>
La réconciliation des tâches pour cron est d'abord assurée par le runtime, et ensuite sauvegardée par l'historique durable : une tâche cron active reste active tant que le runtime cron suit encore cette tâche comme étant en cours d'exécution, même si une ancienne ligne de session enfant existe toujours. Une fois que le runtime cesse de posséder la tâche et que la fenêtre de grâce de 5 minutes expire, la maintenance vérifie les journaux d'exécution persistants et l'état de la tâche pour l'exécution `cron:<jobId>:<startedAt>` correspondante. Si cet historique durable montre un résultat terminal, le grand livre des tâches est finalisé à partir de celui-ci ; sinon, la maintenance détenue par Gateway peut marquer la tâche comme `lost`. L'audit hors ligne CLI peut récupérer à partir de l'historique durable, mais il ne traite pas son propre ensemble vide de tâches actives en cours comme une preuve qu'une exécution cron détenue par Gateway a disparu.
</Note>

## Types de planification

| Genre   | Indicateur CLI | Description                                           |
| ------- | -------------- | ----------------------------------------------------- |
| `at`    | `--at`         | Horodatage ponctuel (ISO 8601 ou relatif comme `20m`) |
| `every` | `--every`      | Intervalle fixe                                       |
| `cron`  | `--cron`       | Expression cron à 5 ou 6 champs avec `--tz` optionnel |

Les horodatages sans fuseau horaire sont traités comme UTC. Ajoutez `--tz America/New_York` pour une planification locale basée sur l'horloge.

Les expressions récurrentes en haut de l'heure sont automatiquement étalées jusqu'à 5 minutes pour réduire les pics de charge. Utilisez `--exact` pour forcer une synchronisation précise ou `--stagger 30s` pour une fenêtre explicite.

### Le jour du mois et le jour de la semaine utilisent une logique OU

Les expressions cron sont analysées par [croner](https://github.com/Hexagon/croner). Lorsque les champs jour-du-mois et jour-de-la-semaine ne sont pas des caractères génériques, croner correspond lorsque **l'un ou l'autre** des champs correspond — et non les deux. Il s'agit du comportement standard de Vixie cron.

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

Cela se déclenche environ 5 à 6 fois par mois au lieu de 0 à 1 fois par mois. OpenClaw utilise ici le comportement OU par défaut de Croner. Pour exiger les deux conditions, utilisez le modificateur de jour de la semaine `+` de Croner (`0 9 15 * +1`) ou planifiez sur un champ et gardez l'autre dans le prompt ou la commande de votre tâche.

## Styles d'exécution

| Style                 | Valeur `--session`  | S'exécute dans               | Idéal pour                                |
| --------------------- | ------------------- | ---------------------------- | ----------------------------------------- |
| Session principale    | `main`              | Prochain tour de pulsation   | Rappels, événements système               |
| Isolé                 | `isolated`          | `cron:<jobId>` dédié         | Rapports, tâches d'arrière-plan           |
| Session actuelle      | `current`           | Lié au moment de la création | Travail récurrent sensible au contexte    |
| Session personnalisée | `session:custom-id` | Session nommée persistante   | Workflows qui s'appuient sur l'historique |

<AccordionGroup>
  <Accordion title="Session principale vs isolée vs personnalisée">
    Les tâches de **session principale** mettent en file un événement système et réveillent facultativement la pulsation (`--wake now` ou `--wake next-heartbeat`). Ces événements système n'étendent pas la fraîcheur de réinitialisation quotidiale/inactive pour la session cible. Les tâches **isolées** exécutent un tour d'agent dédié avec une session fraîche. Les **sessions personnalisées** (`session:xxx`) conservent le contexte entre les exécutions, permettant des flux de travail tels que les standups quotidiens qui s'appuient sur des résumés précédents.
  </Accordion>
  <Accordion title="Signification de « nouvelle session » pour les tâches isolées">
    Pour les tâches isolées, « nouvelle session » signifie un nouvel identifiant de transcription/session pour chaque exécution. OpenClaw peut transmettre des préférences sécurisées telles que les paramètres de réflexion/rapide/verbeux, les étiquettes et les substitutions explicites de modèle/d'authentification sélectionnées par l'utilisateur, mais il n'hérite pas du contexte de conversation ambiant d'une ligne cron plus ancienne : le routage canal/groupe, la stratégie d'envoi ou de file d'attente, l'élévation, l'origine ou la liaison d'exécution ACP. Utilisez `current` ou `session:<id>` lorsqu'une tâche récurrente doit délibérément s'appuyer sur le même contexte de conversation.
  </Accordion>
  <Accordion title="Nettoyage de l'exécution">
    Pour les tâches isolées, le démontage de l'exécution inclut désormais un nettoyage au mieux du navigateur pour cette session cron. Les échecs de nettoyage sont ignorés pour que le résultat cron réel l'emporte tout de même.

    Les exécutions cron isolées suppriment également toutes les instances d'exécution MCP regroupées créées pour la tâche via le chemin de nettoyage de l'exécution partagé. Cela correspond à la manière dont les clients MCP de session principale et de session personnalisée sont démontés, afin que les tâches cron isolées ne fuient pas les processus enfants stdio ou les connexions MCP de longue durée entre les exécutions.

  </Accordion>
  <Accordion title="Livraison par sous-agent et Discord">
    Lorsque les exécutions cron isolées orchestrent des sous-agents, la livraison privilégie également la sortie finale du descendant par rapport au texte parent intermédiaire obsolète. Si les descendants sont toujours en cours d'exécution, OpenClaw supprime cette mise à jour parente partielle au lieu de l'annoncer.

    Pour les cibles d'annonce Discord texte uniquement, OpenClaw envoie le texte final canonique de l'assistant une seule fois au lieu de relire à la fois les charges utiles de texte diffusées/intermédiaires et la réponse finale. Les médias et les charges utiles Discord structurées sont toujours livrés comme des charges utiles distinctes pour que les pièces jointes et les composants ne soient pas perdus.

  </Accordion>
</AccordionGroup>

### Options de charge utile pour les tâches isolées

<ParamField path="--message" type="string" required>
  Texte d'invite (requis pour isolé).
</ParamField>
<ParamField path="--model" type="string">
  Remplacement du modèle ; utilise le modèle autorisé sélectionné pour la tâche.
</ParamField>
<ParamField path="--thinking" type="string">
  Remplacement du niveau de réflexion.
</ParamField>
<ParamField path="--light-context" type="boolean">
  Ignorer l'injection du fichier d'amorçage de l'espace de travail.
</ParamField>
<ParamField path="--tools" type="string">
  Restreindre les outils que la tâche peut utiliser, par exemple `--tools exec,read`.
</ParamField>

`--model` utilise le modèle autorisé sélectionné comme modèle principal de cette tâche. Ce n'est pas la même chose qu'un remplacement `/model` de session de chat : les chaînes de repli configurées s'appliquent toujours lorsque le modèle principal de la tâche échoue. Si le modèle demandé n'est pas autorisé ou ne peut pas être résolu, cron fait échouer l'exécution avec une erreur de validation explicite au lieu de revenir silencieusement au choix du modèle agent/défaut de la tâche.

Les tâches cron peuvent également porter des `fallbacks` au niveau du payload. Lorsqu'elles sont présentes, cette liste remplace la chaîne de repli configurée pour la tâche. Utilisez `fallbacks: []` dans le payload/API de la tâche lorsque vous souhaitez une exécution cron stricte qui n'essaie que le modèle sélectionné. Si une tâche a `--model` mais ni payload ni replis configurés, OpenClaw transmet un remplacement de repli vide explicite afin que le principal de l'agent ne soit pas ajouté comme cible de réessai cachée supplémentaire.

La priorité de sélection du modèle pour les tâches isolées est :

1. Remplacement du modèle par le hook Gmail (lorsque l'exécution provient de Gmail et que ce remplacement est autorisé)
2. `model` du payload par tâche
3. Remplacement du modèle de session cron stocké sélectionné par l'utilisateur
4. Sélection du modèle agent/défaut

Le mode rapide suit également la sélection dynamique résolue. Si la configuration du modèle sélectionné dispose de `params.fastMode`, le cron isolé l'utilise par défaut. Un remplacement `fastMode` de session stockée l'emporte toujours sur la configuration dans les deux sens.

Si une exécution isolée rencontre une transition en direct du modèle, cron réessaie avec le provider/model commuté et persiste cette sélection en direct pour l'exécution active avant de réessayer. Lorsque la transition emporte également un nouveau profil d'authentification, cron persiste également ce remplacement de profil d'authentification pour l'exécution active. Les tentatives sont limitées : après la tentative initiale plus 2 nouvelles tentatives de transition, cron abandonne au lieu de boucler indéfiniment.

Avant qu'une exécution cron isolée n'entre dans le lanceur d'agent, OpenClaw vérifie les points de terminaison locaux de provider accessibles pour les providers `api: "ollama"` et `api: "openai-completions"` configurés dont le `baseUrl` est boucle locale, réseau privé ou `.local`. Si ce point de terminaison est en panne, l'exécution est enregistrée comme `skipped`Ollama avec une erreur provider/model claire au lieu de lancer un appel de modèle. Le résultat du point de terminaison est mis en cache pendant 5 minutes, de sorte que de nombreuses tâches en attente utilisant le même serveur local Ollama, vLLM, SGLang ou LM Studio mort partagent une seule petite sonde au lieu de créer une tempête de requêtes. Les exécutions ignorées de prévol de provider n'incrémentent pas le backoff des erreurs d'exécution ; activez `failureAlert.includeSkipped` lorsque vous souhaitez des notifications répétées d'ignoré.

## Livraison et sortie

| Mode       | Ce qu'il se passe                                                           |
| ---------- | --------------------------------------------------------------------------- |
| `announce` | Livraison de secours du texte final vers la cible si l'agent n'a pas envoyé |
| `webhook`  | POST de la charge utile de l'événement terminé vers une URL                 |
| `none`     | Pas de livraison de secours du lanceur                                      |

Utilisez `--announce --channel telegram --to "-1001234567890"` pour la livraison vers le channel. Pour les sujets de forum Telegram, utilisez `-1001234567890:topic:123` ; les appelants directs RPC/config peuvent également passer `delivery.threadId` sous forme de chaîne ou de nombre. Les cibles Slack/Discord/Mattermost doivent utiliser des préfixes explicites (`channel:<id>`, `user:<id>`). Les IDs de salle Matrix sont sensibles à la casse ; utilisez l'ID de salle exact ou le formulaire `room:!room:server` depuis Matrix.

Lorsque la livraison d'annonce utilise `channel: "last"` ou omet `channel`, une cible avec un préfixe de fournisseur telle que `telegram:123` peut sélectionner le canal avant que cron ne revienne à l'historique de session ou à un seul canal configuré. Seuls les préfixes annoncés par le plugin chargé sont des sélecteurs de fournisseur. Si `delivery.channel` est explicite, le préfixe de la cible doit nommer le même fournisseur ; par exemple, `channel: "whatsapp"` avec `to: "telegram:123"` est rejeté au lieu de laisser WhatsApp interpréter l'ID Telegram comme un numéro de téléphone. Les préfixes de type de cible et de service tels que `channel:<id>`, `user:<id>`, `imessage:<handle>` et `sms:<number>` restent une syntaxe de cible appartenant au canal, et non des sélecteurs de fournisseur.

Pour les tâches isolées, la livraison de chat est partagée. Si une route de chat est disponible, l'agent peut utiliser l'outil `message` même lorsque la tâche utilise `--no-deliver`. Si l'agent envoie à la cible configurée/actuelle, OpenClaw ignore l'annonce de secours. Sinon, `announce`, `webhook` et `none` ne contrôlent que ce que le runner fait avec la réponse finale après le tour de l'agent.

Lorsqu'un agent crée un rappel isolé à partir d'un chat actif, OpenClaw stocke la cible de livraison en direct préservée pour la route d'annonce de secours. Les clés de session internes peuvent être en minuscules ; les cibles de livraison du fournisseur ne sont pas reconstruites à partir de ces clés lorsque le contexte de chat actuel est disponible.

La livraison d'annonce implicite utilise les listes d'autorisation de canaux configurées pour valider et réacheminer les cibles obsolètes. Les approbations de magasin d'appairage DM ne sont pas des destinataires d'automatisation de secours ; définissez `delivery.to` ou configurez l'entrée de canal `allowFrom` lorsqu'une tâche planifiée doit envoyer proactivement à un DM.

Les notifications d'échec suivent un chemin de destination distinct :

- `cron.failureDestination` définit une valeur par défaut globale pour les notifications d'échec.
- `job.delivery.failureDestination` remplace cela pour chaque tâche.
- Si aucun n'est défini et que la tâche diffuse déjà via `announce`, les notifications d'échec reviennent désormais à cette cible d'annonce primaire.
- `delivery.failureDestination` n'est pris en charge que sur les tâches `sessionTarget="isolated"`, sauf si le mode de livraison principal est `webhook`.
- `failureAlert.includeSkipped: true` active les alertes répétées d'exécutions ignorées pour une tâche ou une stratégie d'alerte cron globale. Les exécutions ignorées conservent un compteur consécutif distinct, elles n'affectent donc pas l'attente en cas d'erreur d'exécution.

## Exemples CLI

<Tabs>
  <Tab title="Rappel unique">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="Tâche isolée récurrente">```bash openclaw cron add \ --name "Morning brief" \ --cron "0 7 * * *" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Summarize overnight updates." \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="Modèle et remplacement de la réflexion">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
</Tabs>

## Webhooks

Gateway peut exposer des points de terminaison de webhook HTTP pour des déclencheurs externes. Activer dans la configuration :

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

<AccordionGroup>
  <Accordion title="POST /hooks/wake">
    Mettre en file d'attente un événement système pour la session principale :

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/wake \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"text":"New email received","mode":"now"}'
    ```

    <ParamField path="text" type="string" required>
      Description de l'événement.
    </ParamField>
    <ParamField path="mode" type="string" default="now">
      `now` ou `next-heartbeat`.
    </ParamField>

  </Accordion>
  <Accordion title="POST /hooks/agent">
    Exécuter un tour d'agent isolé :

    ```bash
    curl -X POST http://127.0.0.1:18789/hooks/agent \
      -H 'Authorization: Bearer SECRET' \
      -H 'Content-Type: application/json' \
      -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.4"}'
    ```

    Champs : `message` (requis), `name`, `agentId`, `wakeMode`, `deliver`, `channel`, `to`, `model`, `fallbacks`, `thinking`, `timeoutSeconds`.

  </Accordion>
  <Accordion title="Mapped hooks (POST /hooks/<name>)">
    Les noms de hooks personnalisés sont résolus via `hooks.mappings` dans la configuration. Les mappages peuvent transformer des payloads arbitraires en actions `wake` ou `agent` à l'aide de modèles ou de transformations de code.
  </Accordion>
</AccordionGroup>

<Warning>
Gardez les points de terminaison des hooks derrière une boucle locale (loopback), un tailnet ou un proxy inverse de confiance.

- Utilisez un jeton de hook dédié ; ne réutilisez pas les jetons d'authentification de la passerelle.
- Gardez `hooks.path` sur un sous-chemin dédié ; `/` est rejeté.
- Définissez `hooks.allowedAgentIds` pour limiter le routage `agentId` explicite.
- Gardez `hooks.allowRequestSessionKey=false` sauf si vous avez besoin de sessions sélectionnées par l'appelant.
- Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour contraindre les formes de clés de session autorisées.
- Les payloads des hooks sont enveloppés avec des limites de sécurité par défaut.

</Warning>

## Intégration Gmail PubSub

Connectez les déclencheurs de boîte de réception Gmail à OpenClaw via Google PubSub.

<Note>**Prérequis :** `gcloud` CLI, `gog` (gogcli), hooks OpenClaw activés, Tailscale pour le point de terminaison HTTPS public.</Note>

### Configuration via Assistant (recommandé)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Cela écrit la configuration `hooks.gmail`, active le préréglage Gmail et utilise Tailscale Funnel pour le point de terminaison de push.

### Démarrage automatique de Gateway

Lorsque `hooks.enabled=true` et `hooks.gmail.account` sont définis, le Gateway démarre `gog gmail watch serve` au démarrage et renouvelle automatiquement la surveillance. Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour refuser.

### Configuration manuelle unique

<Steps>
  <Step title="Sélectionner le projet GCP">
    Sélectionnez le projet GCP qui possède le client OAuth utilisé par `gog` :

    ```bash
    gcloud auth login
    gcloud config set project <project-id>
    gcloud services enable gmail.googleapis.com pubsub.googleapis.com
    ```

  </Step>
  <Step title="Créer le sujet et accorder l'accès push Gmail">
    ```bash
    gcloud pubsub topics create gog-gmail-watch
    gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
      --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
      --role=roles/pubsub.publisher
    ```
  </Step>
  <Step title="Démarrer la surveillance">
    ```bash
    gog gmail watch start \
      --account openclaw@gmail.com \
      --label INBOX \
      --topic projects/<project-id>/topics/gog-gmail-watch
    ```
  </Step>
</Steps>

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

# Get one stored job as JSON
openclaw cron get <jobId>

# Show one job, including resolved delivery route
openclaw cron show <jobId>

# Edit a job
openclaw cron edit <jobId> --message "Updated prompt" --model "opus"

# Force run a job now
openclaw cron run <jobId>

# Force run a job now and wait for its terminal status
openclaw cron run <jobId> --wait --wait-timeout 10m --poll-interval 2s

# Run only if due
openclaw cron run <jobId> --due

# View run history
openclaw cron runs --id <jobId> --limit 50

# View one exact run
openclaw cron runs --id <jobId> --run-id <runId>

# Delete a job
openclaw cron remove <jobId>

# Agent selection (multi-agent setups)
openclaw cron add --name "Ops sweep" --cron "0 6 * * *" --session isolated --message "Check ops queue" --agent ops
openclaw cron edit <jobId> --clear-agent
```

`openclaw cron run <jobId>` renvoie après avoir mis en file d'attente l'exécution manuelle. Utilisez `--wait` pour les hooks d'arrêt, les scripts de maintenance ou d'autres automatisations qui doivent bloquer jusqu'à ce que l'exécution en file d'attente soit terminée. Le mode d'attente interroge exactement le `runId` renvoyé ; il quitte avec `0` pour le statut `ok` et une valeur non nulle pour `error`, `skipped` ou un dépassement du délai d'attente.

<Note>
Remarque sur la priorité du modèle :

- `openclaw cron add|edit --model ...` modifie le modèle sélectionné pour la tâche.
- Si le modèle est autorisé, ce fournisseur/modèle exact atteint l'exécution de l'agent isolé.
- S'il n'est pas autorisé ou ne peut pas être résolu, cron échoue l'exécution avec une erreur de validation explicite.
- Les chaînes de repli configurées s'appliquent toujours car le `--model` cron est une priorité de tâche, et non une priorité de `/model` de session.
- Le `fallbacks` de la charge utile remplace les replis configurés pour cette tâche ; `fallbacks: []` désactive le repli et rend l'exécution stricte.
- Un `--model` simple sans liste de repli explicite ou configurée ne revient pas automatiquement à la priorité de l'agent comme cible de réessai silencieux supplémentaire.

</Note>

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

`maxConcurrentRuns` limite à la fois la répartition cron planifiée et l'exécution des tours d'agent isolé. Les tours d'agent cron isolés utilisent en interne le `cron-nested` dédié de la file d'attente, donc augmenter cette valeur permet aux exécutions cron LLM indépendantes de progresser en parallèle au lieu de simplement démarrer leurs wrappers cron externes. Le `nested` partagé non-cron n'est pas élargi par ce paramètre.

Le sidecar d'état d'exécution est dérivé de `cron.store` : un magasin `.json` tel que `~/clawd/cron/jobs.json` utilise `~/clawd/cron/jobs-state.json`, tandis qu'un chemin de magasin sans suffixe `.json` ajoute `-state.json`.

Si vous modifiez manuellement `jobs.json`, laissez `jobs-state.json` hors du contrôle de source. OpenClaw utilise ce sidecar pour les créneaux en attente, les marqueurs actifs, les métadonnées de dernière exécution et l'identité du programme qui indique au planificateur lorsqu'une tâche modifiée externement nécessite un nouveau `nextRunAtMs`.

Désactiver cron : `cron.enabled: false` ou `OPENCLAW_SKIP_CRON=1`.

<AccordionGroup>
  <Accordion title="Comportement de nouvelle tentative">
    **Nouvelle tentative unique** : les erreurs transitoires (limite de débit, surcharge, réseau, erreur serveur) sont réessayées jusqu'à 3 fois avec un backoff exponentiel. Les erreurs permanentes désactivent immédiatement.

    **Nouvelle tentative récurrente** : backoff exponentiel (30 s à 60 min) entre les tentatives. Le backoff est réinitialisé après la prochaine exécution réussie.

  </Accordion>
  <Accordion title="Maintenance">
    `cron.sessionRetention` (par défaut `24h`) nettoie les entrées de session d'exécution isolées. `cron.runLog.maxBytes` / `cron.runLog.keepLines` nettoient automatiquement les fichiers de journal d'exécution.
  </Accordion>
</AccordionGroup>

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

<AccordionGroup>
  <Accordion title="Cron ne se déclenche pas">
    - Vérifiez la `cron.enabled` et la env var `OPENCLAW_SKIP_CRON`.
    - Confirmez que le Gateway fonctionne en continu.
    - Pour les planifications `cron`, vérifiez le fuseau horaire (`--tz`) par rapport au fuseau horaire de l'hôte.
    - `reason: not-due` dans la sortie d'exécution signifie qu'une exécution manuelle a été vérifiée avec `openclaw cron run <jobId> --due` et que la tâche n'était pas encore attendue.

  </Accordion>
  <Accordion title="Cron déclenché mais aucune livraison">
    - Le mode de livraison `none` signifie qu'aucun envoi de repli par le runner n'est attendu. L'agent peut toujours envoyer directement avec l'outil `message` lorsqu'une route de chat est disponible.
    - La cible de livraison manquante/invalide (`channel`/`to`) signifie que l'envoi sortant a été ignoré.
    - Pour Matrix, les tâches copiées ou héritées avec des IDs de salle `delivery.to` en minuscules peuvent échouer car les IDs de salle Matrix sont sensibles à la casse. Modifiez la tâche avec la valeur exacte `!room:server` ou `room:!room:server` provenant de Matrix.
    - Les erreurs d'auth de channel (`unauthorized`, `Forbidden`) signifient que la livraison a été bloquée par les identifiants.
    - Si l'exécution isolée renvoie uniquement le jeton silencieux (`NO_REPLY` / `no_reply`), OpenClaw supprime la livraison sortante directe et supprime également le chemin de résumé mis en file d'attente en repli, donc rien n'est renvoyé dans le chat.
    - Si l'agent doit lui-même envoyer un message à l'utilisateur, vérifiez que la tâche a une route utilisable (`channel: "last"` avec un chat précédent, ou un channel/cible explicite).

  </Accordion>
  <Accordion title="Cron ou heartbeat semble empêcher le basculement /new-style">
    - La fraîcheur de la réinitialisation quotidienne et inactive n'est pas basée sur `updatedAt` ; voir [Session management](/fr/concepts/session#session-lifecycle).
    - Les réveils Cron, les exécutions de heartbeat, les notifications d'exécution et la tenue de livres de la passerelle peuvent mettre à jour la ligne de session pour le routage/le statut, mais ils n'étendent pas `sessionStartedAt` ni `lastInteractionAt`.
    - Pour les lignes héritées créées avant l'existence de ces champs, OpenClaw peut récupérer `sessionStartedAt` à partir de l'en-tête de session JSONL de la transcription lorsque le fichier est toujours disponible. Les lignes inactives héritées sans `lastInteractionAt` utilisent cette heure de début récupérée comme référence inactive.

  </Accordion>
  <Accordion title="Pièges de fuseau horaire">
    - Cron sans `--tz` utilise le fuseau horaire de l'hôte de la passerelle.
    - Les planifications `at` sans fuseau horaire sont traitées comme UTC.
    - Le `activeHours` Heartbeat utilise la résolution de fuseau horaire configurée.

  </Accordion>
</AccordionGroup>

## Connexes

- [Automatisation](/fr/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches d'arrière-plan](/fr/automation/tasks) — registre des tâches pour les exécutions cron
- [Heartbeat](/fr/gateway/heartbeat) — tours de session principale périodiques
- [Fuseau horaire](/fr/concepts/timezone) — configuration du fuseau horaire
