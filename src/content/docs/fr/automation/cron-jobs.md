---
summary: "GatewayTâches planifiées, webhooks et déclencheurs PubSub Gmail pour le planificateur Gateway"
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
  <Step title="Ajouter un rappel unique">
    ```bash
    openclaw cron create "2026-02-01T16:00:00Z" \
      --name "Reminder" \
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
- Les définitions de tâches, l'état d'exécution et l'historique des exécutions sont persistés dans la base de données d'état SQLite partagée d'OpenClaw, de sorte que les redémarrages ne fassent pas perdre les planifications.
- Lors d'une mise à niveau, les fichiers `~/.openclaw/cron/jobs.json`, `jobs-state.json` et `runs/*.jsonl` hérités sont importés une fois et renommés avec un suffixe `.migrated`. Les lignes de tâches malformées sont ignorées lors de l'exécution et copiées dans `jobs-quarantine.json` pour une réparation ou un examen ultérieur.
- `cron.store` nomme toujours la clé logique de stockage cron et le chemin d'importation hérité. Après l'importation, la modification de ce fichier JSON ne change plus les tâches cron actives ; utilisez plutôt `openclaw cron add|edit|remove` ou les méthodes cron Gateway du RPC.
- Toutes les exécutions cron créent des enregistrements de [tâche d'arrière-plan](/fr/automation/tasks).
- Au démarrage du Gateway, les tâches isolées en attente d'exécution par l'agent (agent-turn) en retard sont replanifiées en dehors de la fenêtre de connexion du canal au lieu d'être rejouées immédiatement, afin que le démarrage de Discord/Telegram et la configuration des commandes natives restent réactifs après les redémarrages.
- Les tâches ponctuelles (`--at`) sont automatiquement supprimées après succès par défaut.
- Les exécutions cron isolées tentent au mieux de fermer les onglets/processus de navigateur suivis pour leur session `cron:<jobId>` lorsque l'exécution est terminée, afin que l'automatisation de navigateur détachée ne laisse pas de processus orphelins derrière elle.
- Les exécutions cron isolées qui reçoivent la subvention étroite d'auto-nettoyage cron peuvent toujours lire le statut du planificateur, une liste auto-filtrée de leur tâche actuelle et l'historique d'exécution de cette tâche, afin que les vérifications de statut/heartbeat puissent inspecter leur propre planification sans obtenir un accès plus large à la mutation cron.
- Les exécutions cron isolées se protègent également contre les réponses d'accusé de réception périmées. Si le premier résultat est juste une mise à jour de statut provisoire (`on it`, `pulling everything together`, et indices similaires) et qu'aucune exécution de sous-agent descendant n'est encore responsable de la réponse finale, OpenClaw redemande une fois le résultat réel avant la livraison.
- Les exécutions cron isolées utilisent des métadonnées structurées de refus d'exécution provenant de l'exécution intégrée, y compris les wrappers `UNAVAILABLE` de l'hôte de nœud dont le message d'erreur imbriqué commence par `SYSTEM_RUN_DENIED` ou `INVALID_REQUEST`, de sorte qu'une commande bloquée n'est pas signalée comme une exécution réussie (verte) tandis que le texte ordinaire de l'assistant n'est pas traité comme un refus.
- Les exécutions cron isolées traitent également les échecs de l'agent au niveau de l'exécution comme des erreurs de tâche même lorsqu'aucune charge utile de réponse n'est produite, de sorte que les échecs du modèle/fournisseur incrémentent les compteurs d'erreurs et déclenchent des notifications d'échec au lieu de marquer la tâche comme réussie.
- Lorsqu'une tâche de tour d'agent isolé atteint `timeoutSeconds`, cron interrompt l'exécution de l'agent sous-jacente et lui accorde une courte fenêtre de nettoyage. Si l'exécution ne se vide pas, le nettoyage appartenant à Gateway force la suppression de la propriété de session de cette exécution avant que cron n'enregistre le dépassement de délai, afin que le travail de chat mis en file d'attente ne reste pas bloqué derrière une session de traitement obsolète.
- Si un tour d'agent isolé stalle avant le démarrage du runner ou avant le premier appel au modèle, cron enregistre un dépassement de délai spécifique à la phase, tel que `setup timed out before runner start` ou `stalled before first model call (last phase: context-engine)`. Ces chiens de garde couvrent les fournisseurs intégrés et les fournisseurs pris en charge par la CLI avant que leur processus externe CLI ne soit réellement démarré, et sont plafonnés indépendamment des longues valeurs `timeoutSeconds`, afin que les échecs de démarrage à froid, d'authentification ou de contexte apparaissent rapidement au lieu d'attendre le budget complet de la tâche.
- Si vous utilisez le cron système ou un autre planificateur externe pour exécuter `openclaw agent`, enveloppez-le d'une escalation d'arrêt forcé même si le CLI gère `SIGTERM`/`SIGINT`. Les exécutions supportées par le Gateway demandent au Gateway d'annuler les exécutions acceptées ; les exécutions de secours locales et intégrées reçoivent le même signal d'annulation. Pour GNU `timeout`, préférez `timeout -k 60 600 openclaw agent ...` à un simple `timeout 600 ...` ; la valeur `-k` est le filet de sécurité du superviseur si le processus ne peut pas se vider. Pour les unités systemd, conservez la même forme en utilisant un signal d'arrêt `SIGTERM` plus une fenêtre de grâce telle que `TimeoutStopSec` avant toute mise à mort finale. Si une nouvelle tentative réutilise un `--run-id` alors que l'exécution Gateway d'origine est toujours active, le doublon est signalé comme en cours de vol au lieu de démarrer une deuxième exécution.

<a id="maintenance"></a>

<Note>
La réconciliation des tâches pour cron est d'abord gérée par le runtime, ensuite sauvegardée par l'historique durable : une tâche cron active reste en vie tant que le runtime cron suit toujours cette tâche comme étant en cours d'exécution, même si une ancienne ligne de session enfant existe toujours. Une fois que le runtime cesse de posséder la tâche et que la fenêtre de grâce de 5 minutes expire, la maintenance vérifie les journaux d'exécution persistants et l'état de la tâche pour l'exécution `cron:<jobId>:<startedAt>` correspondante. Si cet historique durable montre un résultat terminal, le registre des tâches est finalisé à partir de celui-ci ; sinon la maintenance détenue par Gateway peut marquer la tâche `lost`. L'audit hors ligne du CLI peut récupérer à partir de l'historique durable, mais il ne traite pas son propre ensemble vide de tâches actives en cours comme une preuve qu'une exécution cron détenue par Gateway a disparu.
</Note>

## Types de planification

| Type    | Indicateur CLI | Description                                              |
| ------- | -------------- | -------------------------------------------------------- |
| `at`    | `--at`         | Horodatage unique (ISO 8601 ou relatif comme `20m`)      |
| `every` | `--every`      | Intervalle fixe                                          |
| `cron`  | `--cron`       | Expression cron sur 5 ou 6 champs avec `--tz` facultatif |

Les horodatages sans fuseau horaire sont traités comme UTC. Ajoutez `--tz America/New_York` pour une planification locale à l'heure de l'horloge.

Les expressions récurrentes en début d'heure sont automatiquement échelonnées jusqu'à 5 minutes pour réduire les pics de charge. Utilisez `--exact` pour forcer une synchronisation précise ou `--stagger 30s` pour une fenêtre explicite.

### Jour du mois et jour de la semaine utilisent une logique OU

Les expressions cron sont analysées par [croner](https://github.com/Hexagon/croner). Lorsque les champs jour du mois et jour de la semaine ne sont pas des caractères génériques, croner correspond lorsque **l'un ou l'autre** des champs correspond — et non les deux. Il s'agit du comportement standard de Vixie cron.

```
# Intended: "9 AM on the 15th, only if it's a Monday"
# Actual:   "9 AM on every 15th, AND 9 AM on every Monday"
0 9 15 * 1
```

Cela se déclenche environ 5 à 6 fois par mois au lieu de 0 à 1 fois par mois. OpenClaw utilise ici le comportement OU par défaut de Croner. Pour exiger les deux conditions, utilisez le modificateur de jour de la semaine `+` de Croner (`0 9 15 * +1`) ou planifiez sur un champ et protégez l'autre dans l'invite ou la commande de votre tâche.

## Styles d'exécution

| Style                 | valeur `--session`  | S'exécute dans               | Idéal pour                       |
| --------------------- | ------------------- | ---------------------------- | -------------------------------- |
| Session principale    | `main`              | Voie de réveil cron dédiée   | Rappels, événements système      |
| Isolé                 | `isolated`          | `cron:<jobId>` dédié         | Rapports, tâches en arrière-plan |
| Session actuelle      | `current`           | Lié au moment de la création | Travail récurrent contextuel     |
| Session personnalisée | `session:custom-id` | Session nommée persistante   | Workflows basés sur l'historique |

<AccordionGroup>
  <Accordion title="Session principale vs isolée vs personnalisée">
    Les tâches de **session principale** mettent en file un événement système dans une voie d'exécution propriétaire de cron et réveillent éventuellement le heartbeat (`--wake now` ou `--wake next-heartbeat`). Elles peuvent utiliser le dernier contexte de livraison de la session principale cible pour les réponses, mais elles n'ajoutent pas de tours de cron de routine à la voie de chat humain et n'étendent pas la fraîcheur de réinitialisation quotidiale/inactive pour la session cible. Les tâches **isolées** exécutent un tour d'agent dédié avec une session fraîche. Les **sessions personnalisées** (`session:xxx`) conservent le contexte entre les exécutions, permettant des flux de travail tels que les stand-ups quotidiens qui s'appuient sur des résumés précédents.

    Les événements cron de session principale sont des rappels d'événements système autonomes. Ils n'incluent
    pas automatiquement l'instruction "Read HEARTBEAT.md" du prompt heartbeat par défaut. Si un rappel récurrent doit consulter
    `HEARTBEAT.md`, indiquez-le explicitement dans le texte de l'événement cron ou dans les
    propres instructions de l'agent.

  </Accordion>
  <Accordion title="Signification de 'session fraîche' pour les tâches isolées">
    Pour les tâches isolées, "session fraîche" signifie un nouvel ID de transcription/session pour chaque exécution. OpenClaw peut transporter des préférences sécurisées telles que les paramètres de réflexion/rapide/verbeux, les étiquettes et les substitutions explicites de modèle/authentification sélectionnées par l'utilisateur, mais il n'hérite pas du contexte de conversation ambiant d'une ligne cron plus ancienne : routage de channel/groupe, stratégie d'envoi ou de file d'attente, élévation, origine ou liaison d'exécution ACP. Utilisez `current` ou `session:<id>` lorsqu'une tâche récurrente doit délibérément s'appuyer sur le même contexte de conversation.
  </Accordion>
  <Accordion title="Nettoyage de l'exécution">
    Pour les tâches isolées, le démontage de l'exécution inclut désormais un nettoyage du navigateur de meilleure volonté pour cette session cron. Les échecs de nettoyage sont ignorés afin que le résultat réel du cron prime toujours.

    Les exécutions cron isolées suppriment également toutes les instances d'exécution MCP groupées créées pour la tâche via le chemin de nettoyage de l'exécution partagé. Cela correspond à la manière dont les clients MCP de session principale et de session personnalisée sont démontés, de sorte que les tâches cron isolées ne fuient pas les processus enfants stdio ou les connexions MCP durables entre les exécutions.

  </Accordion>
  <Accordion title="DiscordSubagent et livraison Discord"OpenClawDiscordOpenClawDiscord>
    Lorsque les tâches cron isolées orchestrent des sous-agents, la livraison privilégie également la sortie finale du descendant par rapport au texte intermédiaire parent périmé. Si les descendants sont toujours en cours d'exécution, OpenClaw supprime cette mise à jour parentielle partielle au lieu de l'annoncer.

    Pour les cibles d'annonce Discord texte uniquement, OpenClaw envoie le texte final canonique de l'assistant une seule fois au lieu de relayer à la fois les charges utiles de texte diffusé/intermédiaire et la réponse finale. Les médias et les charges utiles structurées Discord sont toujours livrés sous forme de charges utiles distinctes afin que les pièces jointes et les composants ne soient pas perdus.

  </Accordion>
</AccordionGroup>

### Options de charge utile pour les tâches isolées

<ParamField path="--message" type="string" required>
  Texte d'invite (requis pour les tâches isolées).
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

`--model` utilise le modèle autorisé sélectionné comme modèle principal de cette tâche. Ce n'est pas la même chose qu'un remplacement `/model` de session de chat : les chaînes de repli configurées s'appliquent toujours lorsque le modèle principal de la tâche échoue. Si le modèle demandé n'est pas autorisé ou ne peut pas être résolu, cron échoue l'exécution avec une erreur de validation explicite au lieu de revenir silencieusement au modèle par défaut/agent de la tâche.

Les tâches cron peuvent également transporter une liste `fallbacks` au niveau du payload. Lorsqu'elle est présente, cette liste remplace la chaîne de repli configurée pour la tâche. Utilisez `fallbacks: []` dans le payload de la tâche/API lorsque vous souhaitez une exécution cron stricte qui n'essaie que le modèle sélectionné. Si une tâche a `--model` mais ni payload ni replis configurés, OpenClaw transmet une substitution de repli vide explicite afin que le modèle principal de l'agent ne soit pas ajouté comme cible de retry supplémentaire masquée.

Les vérifications préalables du fournisseur local parcourent les replis configurés avant de marquer une exécution cron comme `skipped` ; `fallbacks: []` maintient ce chemin préalable strict.

La priorité de sélection du modèle pour les tâches isolées est :

1. Substitution du modèle pour le hook Gmail (lorsque l'exécution provient de Gmail et que cette substitution est autorisée)
2. `model` du payload par tâche
3. Substitution du modèle de session cron stocké sélectionné par l'utilisateur
4. Sélection du modèle agent/défaut

Le mode rapide suit également la sélection en direct résolue. Si la configuration du modèle sélectionné a `params.fastMode`, le cron isolé l'utilise par défaut. Une substitution de session stockée `fastMode` l'emporte toujours sur la configuration dans les deux sens.

Si une exécution isolée rencontre un transfert de changement de modèle en direct, le cron réessaie avec le fournisseur/modèle commuté et rend persistante cette sélection en direct pour l'exécution active avant de réessayer. Lorsque le transfert comprend également un nouveau profil d'authentification, le cron rend également persistante cette substitution de profil d'authentification pour l'exécution active. Les tentatives sont limitées : après la tentative initiale plus 2 tentatives de transfert, le cron abandonne au lieu de boucler indéfiniment.

Avant qu'une exécution cron isolée n'entre dans l'exécuteur de l'agent, OpenClaw vérifie les points de terminaison du fournisseur locaux accessibles pour les fournisseurs OpenClaw`api: "ollama"` et `api: "openai-completions"` configurés dont l'`baseUrl` est bouclage (loopback), réseau privé ou `.local`. Si ce point de terminaison est en panne, l'exécution est enregistrée comme `skipped`Ollama avec une erreur claire de fournisseur/modèle au lieu de lancer un appel au modèle. Le résultat du point de terminaison est mis en cache pendant 5 minutes, de sorte que de nombreuses tâches échues utilisant le même serveur local Ollama, vLLM, SGLang ou LM Studio mort partagent une petite sonde au lieu de créer une tempête de requêtes. Les exécutions de pré-vol du fournisseur ignorées n'incrémentent pas le délai d'attente (backoff) en cas d'erreur d'exécution ; activez `failureAlert.includeSkipped` lorsque vous souhaitez des notifications répétées d'ignoraison.

## Livraison et sortie

| Mode       | Ce qui se passe                                                                |
| ---------- | ------------------------------------------------------------------------------ |
| `announce` | Livraison de secours du texte final vers la cible si l'agent ne l'a pas envoyé |
| `webhook`  | POST de la charge utile de l'événement terminé vers une URL                    |
| `none`     | Aucune livraison de secours de l'exécuteur                                     |

Utilisez `--announce --channel telegram --to "-1001234567890"`Telegram pour la livraison vers le channel. Pour les sujets de forum Telegram, utilisez `-1001234567890:topic:123`OpenClawTelegram ; OpenClaw accepte également l'abréviation `-1001234567890:123`RPC détenue par Telegram. Les appelants directs RPC/config peuvent passer `delivery.threadId`SlackDiscordMattermost sous forme de chaîne ou de nombre. Les cibles Slack/Discord/Mattermost doivent utiliser des préfixes explicites (`channel:<id>`, `user:<id>`Matrix). Les ID de salle Matrix sont sensibles à la casse ; utilisez l'ID de salle exact ou le formulaire `room:!room:server`Matrix de Matrix.

Lorsque la livraison par annonce utilise `channel: "last"` ou omet `channel`, une cible préfixée par fournisseur telle que `telegram:123` peut sélectionner le canal avant que cron ne revienne à l'historique de session ou à un canal configuré unique. Seuls les préfixes annoncés par le plugin chargé sont des sélecteurs de fournisseur. Si `delivery.channel` est explicite, le préfixe de cible doit nommer le même fournisseur ; par exemple, `channel: "whatsapp"` avec `to: "telegram:123"` est rejeté au lieu de laisser WhatsApp interpréter l'ID Telegram comme un numéro de téléphone. Les préfixes de type de cible et de service tels que `channel:<id>`, `user:<id>`, `imessage:<handle>` et `sms:<number>` restent une syntaxe de cible appartenant au canal, et non des sélecteurs de fournisseur.

Pour les tâches isolées, la livraison par chat est partagée. Si une route de chat est disponible, l'agent peut utiliser l'outil `message` même lorsque la tâche utilise `--no-deliver`. Si l'agent envoie à la cible configurée/actuelle, OpenClaw ignore l'annonce de secours. Sinon, `announce`, `webhook` et `none` ne contrôlent que ce que le runner fait avec la réponse finale après le tour de l'agent.

Lorsqu'un agent crée un rappel isolé à partir d'un chat actif, OpenClaw stocke la cible de livraison live préservée pour la route d'annonce de secours. Les clés de session internes peuvent être en minuscules ; les cibles de livraison par fournisseur ne sont pas reconstruites à partir de ces clés lorsque le contexte de chat actuel est disponible.

La livraison implicite par annonce utilise les listes d'autorisation de canaux configurées pour valider et réacheminer les cibles obsolètes. Les approbations de magasin d'appariement DM ne sont pas des destinataires d'automatisation de secours ; définissez `delivery.to` ou configurez l'entrée de canal `allowFrom` lorsqu'une tâche planifiée doit envoyer proactivement à un DM.

## Langue de sortie

Les tâches cron n'infèrent pas de langue de réponse à partir du canal, des paramètres régionaux ou des messages
précédents. Placez la règle de langue dans le message planifié ou le modèle :

```bash
openclaw cron edit <jobId> \
  --message "Summarize the updates. Respond in Chinese; keep URLs, code, and product names unchanged."
```

Pour les fichiers de modèle, conservez l'instruction de langue dans le prompt rendu et vérifiez que les espaces réservés tels que `{{language}}` sont remplis avant l'exécution de la tâche. Si la sortie mélange les langues, rendez la règle explicite, par exemple : « Utiliser le chinois pour le texte narratif et conserver les termes techniques en anglais ».

Les notifications d'échec suivent un chemin de destination séparé :

- `cron.failureDestination` définit une valeur par défaut globale pour les notifications d'échec.
- `job.delivery.failureDestination` remplace cette valeur pour chaque tâche.
- Si aucun des deux n'est défini et que la tâche est déjà livrée via `announce`, les notifications d'échec reviennent désormais à cette cible d'annonce principale.
- `delivery.failureDestination` n'est pris en charge que sur les tâches `sessionTarget="isolated"`, sauf si le mode de livraison principal est `webhook`.
- `failureAlert.includeSkipped: true` active les alertes répétées d'exécutions ignorées pour une tâche ou une stratégie d'alerte cron globale. Les exécutions ignorées conservent un compteur consécutif d'ignorances distinct, de sorte qu'elles n'affectent pas l'attente en cas d'erreur d'exécution.

## Exemples CLI

<Tabs>
  <Tab title="Rappel ponctuel">```bash openclaw cron add \ --name "Calendar check" \ --at "20m" \ --session main \ --system-event "Next heartbeat: check calendar." \ --wake now ```</Tab>
  <Tab title="Tâche isolée récurrente">```bash openclaw cron create "0 7 * * *" \ "Summarize overnight updates." \ --name "Morning brief" \ --tz "America/Los_Angeles" \ --session isolated \ --announce \ --channel slack \ --to "channel:C1234567890" ```</Tab>
  <Tab title="Modèle et remplacement de la réflexion">```bash openclaw cron add \ --name "Deep analysis" \ --cron "0 6 * * 1" \ --tz "America/Los_Angeles" \ --session isolated \ --message "Weekly deep analysis of project progress." \ --model "opus" \ --thinking high \ --announce ```</Tab>
  <Tab title="Sortie webhook">```bash openclaw cron create "0 18 * * 1-5" \ "Summarize today's deploys as JSON." \ --name "Deploy digest" \ --webhook "https://example.invalid/openclaw/cron" ```</Tab>
</Tabs>

## Webhooks

Le Gateway peut exposer des points de terminaison HTTP webhook pour des déclencheurs externes. Activer dans la configuration :

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
    Les noms de hooks personnalisés sont résolus via `hooks.mappings` dans la configuration. Les mappages peuvent transformer des charges utiales arbitraires en actions `wake` ou `agent` à l'aide de modèles ou de transformations de code.
  </Accordion>
</AccordionGroup>

<Warning>
Gardez les points de terminaison des hooks derrière un bouclage, un tailnet ou un proxy inverse de confiance.

- Utilisez un jeton de hook dédié ; ne réutilisez pas les jetons d'authentification de la passerelle.
- Gardez `hooks.path` sur un sous-chemin dédié ; `/` est rejeté.
- Définissez `hooks.allowedAgentIds` pour limiter l'agent effectif qu'un hook peut cibler, y compris l'agent par défaut lorsque `agentId` est omis.
- Gardez `hooks.allowRequestSessionKey=false` sauf si vous avez besoin de sessions sélectionnées par l'appelant.
- Si vous activez `hooks.allowRequestSessionKey`, définissez également `hooks.allowedSessionKeyPrefixes` pour contraindre les formes de clés de session autorisées.
- Les charges utiles des hooks sont enveloppées avec des limites de sécurité par défaut.

</Warning>

## Intégration Gmail PubSub

Connectez les déclencheurs de boîte de réception Gmail à OpenClaw via Google PubSub.

<Note>**Prérequis :** `gcloud`CLI CLI, `gog`OpenClawTailscale (gogcli), hooks OpenClaw activés, Tailscale pour le point de terminaison HTTPS public.</Note>

### Configuration via l'assistant (recommandé)

```bash
openclaw webhooks gmail setup --account openclaw@gmail.com
```

Cela écrit la configuration `hooks.gmail`Tailscale, active le préréglage Gmail et utilise Tailscale Funnel pour le point de terminaison de push.

### Démarrage automatique de la Gateway

Lorsque `hooks.enabled=true` et `hooks.gmail.account`Gateway sont définis, la Gateway démarre `gog gmail watch serve` au démarrage et renouvelle automatiquement la surveillance. Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour refuser.

### Configuration manuelle unique

<Steps>
  <Step title="GCPSélectionner le projet GCP"GCPOAuth>
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
openclaw cron create "0 6 * * *" "Check ops queue" --name "Ops sweep" --session isolated --agent ops
openclaw cron edit <jobId> --clear-agent
```

`openclaw cron run <jobId>` renvoie après avoir mis en file d'attente l'exécution manuelle. Utilisez `--wait` pour les hooks d'arrêt, les scripts de maintenance ou d'autres automatisations qui doivent bloquer jusqu'à ce que l'exécution en file d'attente soit terminée. Le mode d'attente interroge l'`runId` exact renvoyé ; il sort `0` pour le statut `ok` et non-zéro pour `error`, `skipped`, ou un dépassement de délai d'attente.

`openclaw cron create` est un alias pour `openclaw cron add`, et les nouvelles tâches peuvent utiliser un planning positionnel (`"0 9 * * 1"`, `"every 1h"`, `"20m"`, ou un horodatage ISO) suivi d'un invite d'agent positionnel. Utilisez `--webhook <url>` sur `cron add|create` ou `cron edit` pour envoyer (POST) la charge utile de l'exécution terminée à un point de terminaison HTTP. La livraison par Webhook ne peut pas être combinée avec les indicateurs de livraison par chat tels que `--announce`, `--channel`, `--to`, `--thread-id`, ou `--account`.

<Note>
Remarque sur la substitution du modèle :

- `openclaw cron add|edit --model ...` modifie le modèle sélectionné pour la tâche.
- Si le modèle est autorisé, ce fournisseur/modèle exact atteint l'exécution de l'agent isolé.
- S'il n'est pas autorisé ou ne peut pas être résolu, cron échoue l'exécution avec une erreur de validation explicite.
- Les chaînes de secours (fallback) configurées s'appliquent toujours car `--model` de cron est un élément principal de la tâche, et non une substitution de session `/model`.
- La charge utile `fallbacks` remplace les secours configurés pour cette tâche ; `fallbacks: []` désactive le secours et rend l'exécution stricte.
- Un `--model` simple sans liste de secours explicite ou configurée ne revient pas à l'élément principal de l'agent comme cible de réessai silencieux supplémentaire.

</Note>

## Configuration

```json5
{
  cron: {
    enabled: true,
    store: "~/.openclaw/cron/jobs.json",
    maxConcurrentRuns: 8,
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

`maxConcurrentRuns` limite à la fois la répartition cron planifiée et l'exécution du tour d'agent isolé, et par défaut à 8. Les tours d'agent cron isolés utilisent en interne la file d'exécution dédiée `cron-nested` de la file d'attente, donc augmenter cette valeur permet aux exécutions indépendantes du cron LLM de progresser en parallèle au lieu de seulement démarrer leurs wrappers cron externes. La voie partagée non-cron `nested` n'est pas élargie par ce paramètre.

`cron.store` est une clé de magasin logique et un chemin d'importation hérité. Les magasins existants sont importés dans SQLite lors du premier chargement et archivés ; les futures modifications cron devraient passer par le CLI ou l'Gateway du API.

Désactiver cron : `cron.enabled: false` ou `OPENCLAW_SKIP_CRON=1`.

<AccordionGroup>
  <Accordion title="Comportement de nouvelle tentative">
    **Nouvelle tentative ponctuelle** : les erreurs transitoires (limite de débit, surcharge, réseau, erreur serveur) sont réessayées jusqu'à 3 fois avec un décalage exponentiel. Les erreurs permanentes désactivent immédiatement.

    **Nouvelle tentative récurrente** : décalage exponentiel (30s à 60m) entre les tentatives. Le décalage est réinitialisé après la prochaine exécution réussie.

  </Accordion>
  <Accordion title="Maintenance">
    `cron.sessionRetention` (par défaut `24h`) nettoie les entrées de session d'exécution isolées. `cron.runLog.keepLines` limite les lignes d'historique d'exécution SQLite conservées par tâche ; `maxBytes` est conservé pour la compatibilité de configuration avec les anciens journaux d'exécution basés sur des fichiers.
  </Accordion>
</AccordionGroup>

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

<AccordionGroup>
  <Accordion title="Cron ne se déclenche pas"`OPENCLAW_SKIP_CRON``cron.enabled`>
    - Vérifiez la Gateway env var.
    - Confirmez que le Gateway fonctionne en continu.
    - Pour les planifications `cron`, vérifiez le fuseau horaire (`--tz`) par rapport au fuseau horaire de l'hôte.
    - `reason: not-due` dans la sortie d'exécution signifie qu'une exécution manuelle a été vérifiée avec `openclaw cron run <jobId> --due` et que la tâche n'était pas encore due.

  </Accordion>
  <Accordion title="Cron fired but no delivery">
    - Le mode de livraison `none` signifie qu'aucun envoi de secours par le runner n'est attendu. L'agent peut toujours envoyer directement avec l'outil `message` lorsqu'une route de chat est disponible.
    - La cible de livraison manquante ou invalide (`channel`/`to`) signifie que l'envoi sortant a été ignoré.
    - Pour Matrix, les tâches copiées ou héritées avec des ID de salle `delivery.to` en minuscules peuvent échouer car les ID de salle Matrix sont sensibles à la casse. Modifiez la tâche avec la valeur exacte `!room:server` ou `room:!room:server` issue de Matrix.
    - Les erreurs d'authentification du canal (`unauthorized`, `Forbidden`) signifient que la livraison a été bloquée par les informations d'identification.
    - Si l'exécution isolée renvoie uniquement le jeton silencieux (`NO_REPLY` / `no_reply`), OpenClaw supprime la livraison sortante directe et supprime également le chemin de résumé mis en file d'attente de secours, donc rien n'est renvoyé au chat.
    - Si l'agent doit lui-même envoyer un message à l'utilisateur, vérifiez que la tâche dispose d'une route utilisable (`channel: "last"` avec un chat précédent, ou un canal/cible explicite).

  </Accordion>
  <Accordion title="Cron or heartbeat appears to prevent /new-style rollover">
    - La fraîcheur de la réinitialisation quotidienne et inactive n'est pas basée sur `updatedAt` ; voir [Gestion de session](/fr/concepts/session#session-lifecycle).
    - Les réveils Cron, les exécutions de heartbeat, les notifications d'exécution et la tenue de livres de la passerelle peuvent mettre à jour la ligne de session pour le routage/le statut, mais ils n'étendent pas `sessionStartedAt` ou `lastInteractionAt`.
    - Pour les lignes héritées créées avant l'existence de ces champs, OpenClaw peut récupérer `sessionStartedAt` à partir de l'en-tête de session JSONL de la transcription lorsque le fichier est toujours disponible. Les lignes inactives héritées sans `lastInteractionAt` utilisent cette heure de début récupérée comme ligne de base inactive.

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
