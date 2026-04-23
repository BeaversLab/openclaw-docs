---
summary: "Référence CLI pour `openclaw cron` (planifier et exécuter des tâches d'arrière-plan)"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

Gérer les tâches cron pour le planificateur du Gateway.

Connexes :

- Tâches cron : [Tâches cron](/fr/automation/cron-jobs)

Astuce : exécutez `openclaw cron --help` pour l'interface complète des commandes.

Remarque : `openclaw cron list` et `openclaw cron show <job-id>` prévisualisent
la route de livraison résolue. Pour `channel: "last"`, la prévisualisation indique si la
route est résolue à partir de la session principale/actuelle ou échouera en mode fermé.

Remarque : les tâches cron `cron add` isolées utilisent par défaut la livraison `--announce`. Utilisez `--no-deliver` pour garder
la sortie en interne. `--deliver` reste un alias obsolète pour `--announce`.

Remarque : la livraison de chat cron isolée est partagée. `--announce` est la livraison de repli
du lanceur pour la réponse finale ; `--no-deliver` désactive ce repli mais ne
supprime pas l'`message` tool de l'agent lorsqu'une route de chat est disponible.

Remarque : les tâches ponctuelles (`--at`) sont supprimées après succès par défaut. Utilisez `--keep-after-run` pour les conserver.

Remarque : `--session` prend en charge `main`, `isolated`, `current` et `session:<id>`.
Utilisez `current` pour lier à la session active au moment de la création, ou `session:<id>` pour
une clé de session persistante explicite.

Remarque : pour les tâches ponctuelles CLI, les datetimes `--at` sans décalage sont traités comme UTC sauf si vous passez également
`--tz <iana>`, qui interprète cette heure locale d'horloge murale dans le fuseau horaire donné.

Remarque : les tâches récurrentes utilisent désormais une temporisation exponentielle de nouvelle tentative après des erreurs consécutives (30 s → 1 min → 5 min → 15 min → 60 min), puis reviennent à la programmation normale après la prochaine exécution réussie.

Remarque : `openclaw cron run` retourne désormais dès que l'exécution manuelle est mise en file d'attente pour exécution. Les réponses réussies incluent `{ ok: true, enqueued: true, runId }` ; utilisez `openclaw cron runs --id <job-id>` pour suivre le résultat éventuel.

Remarque : `openclaw cron run <job-id>` force l'exécution par défaut. Utilisez `--due` pour conserver
l'ancien comportement « exécuter uniquement si dû ».

Remarque : les tâches cron isolées suppriment les réponses d'accusé de réception obsolètes. Si le premier résultat n'est qu'une mise à jour de l'état provisoire et qu'aucune exécution de sous-agent descendant n'est responsable de la réponse finale, cron interroge à nouveau une fois pour obtenir le résultat réel avant la livraison.

Remarque : si une exécution cron isolée ne renvoie que le jeton silencieux (`NO_REPLY` / `no_reply`), cron supprime à la fois la livraison sortante directe et le chemin de résumé mis en file d'attente de secours, de sorte que rien n'est renvoyé à la discussion.

Remarque : `cron add|edit --model ...` utilise le modèle autorisé sélectionné pour la tâche. Si le modèle n'est pas autorisé, cron avertit et revient plutôt à la sélection du modèle agent/défaut de la tâche. Les chaînes de secours configurées s'appliquent toujours, mais une substitution de modèle simple sans liste de secours explicite par tâche n'ajoute plus l'agent principal comme cible de nouvelle tentative cachée supplémentaire.

Remarque : la priorité du modèle cron isolé est d'abord la substitution du crochet Gmail, puis `--model` par tâche, puis toute substitution de modèle de session cron stockée, puis enfin la sélection normale agent/défaut.

Remarque : le mode rapide cron isolé suit la sélection du modèle en direct résolue. La `params.fastMode` de configuration du modèle s'applique par défaut, mais une substitution de session stockée `fastMode` l'emporte toujours sur la configuration.

Remarque : si une exécution isolée génère `LiveSessionModelSwitchError`, cron rend persistant le fournisseur/modèle commuté (et la substitution de profil d'authentification commutée si présente) avant de réessayer. La boucle de nouvelle tentative externe est limitée à 2 nouvelles tentatives de commutation après la tentative initiale, puis abandonne au lieu de boucler indéfiniment.

Remarque : les notifications d'échec utilisent d'abord `delivery.failureDestination`, puis `cron.failureDestination` global, et reviennent enfin à la cible d'annonce principale de la tâche lorsqu'aucune destination d'échec explicite n'est configurée.

Remarque : la rétention/le nettoyage est contrôlé dans la configuration :

- `cron.sessionRetention` (par défaut `24h`) nettoie les sessions d'exécution isolées terminées.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` nettoient `~/.openclaw/cron/runs/<jobId>.jsonl`.

Note de mise à niveau : si vous avez des tâches cron plus anciennes provenant d'avant le format de livraison/stockage actuel, exécutez
`openclaw doctor --fix`. Doctor normalise désormais les champs cron hérités (`jobId`, `schedule.cron`,
champs de livraison de niveau supérieur incluant l'hérité `threadId`, les alias de livraison `provider` du payload) et migre les simples
tâches de repli de webhook `notify: true` vers une livraison webhook explicite lorsque `cron.webhook` est
configuré.

## Modifications courantes

Mettre à jour les paramètres de livraison sans changer le message :

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

Désactiver la livraison pour une tâche isolée :

```bash
openclaw cron edit <job-id> --no-deliver
```

Activer le contexte d'amorçage léger (lightweight bootstrap) pour une tâche isolée :

```bash
openclaw cron edit <job-id> --light-context
```

Annoncer à un channel spécifique :

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

Créer une tâche isolée avec un contexte d'amorçage léger :

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` s'applique uniquement aux tâches isolées de tour d'agent (agent-turn). Pour les exécutions cron, le mode légarde le contexte d'amorçage vide au lieu d'injecter l'ensemble complet d'amorçage de l'espace de travail.

Note sur la propriété de la livraison :

- La livraison de chat cron isolée est partagée. L'agent peut envoyer directement avec l'outil
  `message` lorsqu'une route de chat est disponible.
- `announce` effectue une livraison de repli (fallback-delivers) de la réponse finale uniquement lorsque l'agent n'a pas envoyé
  directement à la cible résolue. `webhook` publie le payload terminé sur une URL.
  `none` désactive la livraison de repli du runner.

## Commandes d'administration courantes

Exécution manuelle :

```bash
openclaw cron list
openclaw cron show <job-id>
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

Les entrées `cron runs` incluent des diagnostics de livraison avec la cible cron prévue,
la cible résolue, les envois d'outil de message, l'utilisation du repli et l'état de livraison.

Redirection d'agent/session :

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

Ajustements de livraison :

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

Note sur la livraison en cas d'échec :

- `delivery.failureDestination` est pris en charge pour les tâches isolées.
- Les tâches de session principale peuvent uniquement utiliser `delivery.failureDestination` lorsque le mode de
  livraison principal est `webhook`.
- Si vous ne définissez aucune destination d'échec et que la tâche annonce déjà à un
  channel, les notifications d'échec réutilisent cette même cible d'annonce.
