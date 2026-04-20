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

- Tâches Cron : [Tâches Cron](/fr/automation/cron-jobs)

Astuce : exécutez `openclaw cron --help` pour l'interface complète des commandes.

Remarque : les tâches isolées `cron add` sont par défaut livrées via `--announce`. Utilisez `--no-deliver` pour conserver
la sortie en interne. `--deliver` reste un alias obsolète pour `--announce`.

Remarque : les exécutions isolées possédées par cron attendent un résumé en texte brut et le runner possède
le chemin d'envoi final. `--no-deliver` conserve l'exécution en interne ; il ne redonne
pas la livraison à l'outil de messagerie de l'agent.

Remarque : les tâches ponctuelles (`--at`) sont supprimées après succès par défaut. Utilisez `--keep-after-run` pour les conserver.

Remarque : `--session` prend en charge `main`, `isolated`, `current` et `session:<id>`.
Utilisez `current` pour lier à la session active au moment de la création, ou `session:<id>` pour
une clé de session persistante explicite.

Remarque : pour les tâches ponctuelles CLI, les dates/heures `--at` sans fuseau sont traitées comme UTC, sauf si vous passez également
`--tz <iana>`, qui interprète cette heure locale dans le fuseau horaire donné.

Remarque : les tâches récurrentes utilisent désormais un réessai exponentiel après des erreurs consécutives (30 s → 1 min → 5 min → 15 min → 60 min), puis reviennent à la planification normale après la prochaine exécution réussie.

Remarque : `openclaw cron run` renvoie désormais dès que l'exécution manuelle est mise en file d'attente. Les réponses réussies incluent `{ ok: true, enqueued: true, runId }` ; utilisez `openclaw cron runs --id <job-id>` pour suivre le résultat final.

Remarque : `openclaw cron run <job-id>` force l'exécution par défaut. Utilisez `--due` pour conserver
l'ancien comportement "exécuter uniquement si prévu".

Remarque : l'exécution isolée de cron supprime les réponses d'accusé de réception périmées. Si le premier résultat n'est qu'une mise à jour de l'état intérimaire et qu'aucune exécution de sous-agent descendant n'est responsable de la réponse finale, cron relance une fois la demande pour le vrai résultat avant la livraison.

Remarque : si une exécution cron isolée renvoie uniquement le jeton silencieux (`NO_REPLY` /
`no_reply`), cron supprime la livraison sortante directe ainsi que le chemin de résumé mis en file d'attente de secours, de sorte que rien n'est renvoyé à la discussion.

Remarque : `cron add|edit --model ...` utilise le modèle autorisé sélectionné pour la tâche.
Si le modèle n'est pas autorisé, cron avertit et revient à la sélection de modèle par défaut/agent de la tâche à la place. Les chaînes de secours configurées s'appliquent toujours, mais un remplacement de modèle simple sans liste de secours explicite par tâche n'ajoute plus le principal de l'agent comme cible de retry supplémentaire cachée.

Remarque : la priorité du modèle cron isolé est d'abord le remplacement du crochet Gmail, puis `--model` par tâche, puis tout remplacement de modèle de session cron stocké, et enfin la sélection normale par défaut/agent.

Remarque : le mode rapide cron isolé suit la sélection de modèle en direct résolue. La `params.fastMode` de configuration du modèle s'applique par défaut, mais un remplacement de `fastMode` de session stockée l'emporte toujours sur la configuration.

Remarque : si une exécution isolée lève `LiveSessionModelSwitchError`, cron persiste le fournisseur/modèle commuté (et le remplacement de profil d'authentification commuté lorsqu'il est présent) avant de réessayer. La boucle de retry externe est limitée à 2 retry de commutation après la tentative initiale, puis abandonne au lieu de boucler indéfiniment.

Remarque : les notifications d'échec utilisent d'abord `delivery.failureDestination`, puis
`cron.failureDestination` global, et reviennent enfin à la cible d'annonce principale de la tâche lorsqu'aucune destination d'échec explicite n'est configurée.

Remarque : la rétention/le nettoyage est contrôlé dans la configuration :

- `cron.sessionRetention` (par défaut `24h`) nettoie les sessions d'exécution isolées terminées.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` nettoient `~/.openclaw/cron/runs/<jobId>.jsonl`.

Note de mise à niveau : si vous avez des tâches cron plus anciennes provenant d'avant le format de livraison/stockage actuel, exécutez `openclaw doctor --fix`. Doctor normalise désormais les champs cron hérités (`jobId`, `schedule.cron`, champs de livraison de niveau supérieur, y compris `threadId` hérité, alias de livraison payload `provider`) et migre les tâches de secours webhook simples `notify: true` vers une livraison webhook explicite lorsque `cron.webhook` est configuré.

## Modifications courantes

Mettre à jour les paramètres de livraison sans modifier le message :

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

Désactiver la livraison pour une tâche isolée :

```bash
openclaw cron edit <job-id> --no-deliver
```

Activer le contexte d'amorçage léger pour une tâche isolée :

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

`--light-context` s'applique uniquement aux tâches de tour d'agent isolées. Pour les exécutions cron, le mode léger maintient le contexte d'amorçage vide au lieu d'injecter l'ensemble d'amorçage complet de l'espace de travail.

Note sur la propriété de la livraison :

- Les tâches isolées détenues par Cron acheminent toujours la livraison finale visible par l'utilisateur via le lanceur cron (`announce`, `webhook` ou `none` uniquement interne).
- Si la tâche mentionne l'envoi d'un message à un destinataire externe, l'agent doit décrire la destination prévue dans son résultat au lieu d'essayer de l'envoyer directement.

## Commandes d'administration courantes

Exécution manuelle :

```bash
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

Redirection de l'agent/session :

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
- Les tâches de session principale ne peuvent utiliser `delivery.failureDestination` que lorsque le mode de livraison principal est `webhook`.
- Si vous ne définissez aucune destination d'échec et que la tâche annonce déjà à un channel, les notifications d'échec réutilisent cette même cible d'annonce.
