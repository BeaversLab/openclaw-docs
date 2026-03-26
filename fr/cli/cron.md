---
summary: "Référence de la CLI pour `openclaw cron` (planifier et exécuter des tâches en arrière-plan)"
read_when:
  - You want scheduled jobs and wakeups
  - You’re debugging cron execution and logs
title: "cron"
---

# `openclaw cron`

Gérer les tâches cron pour le planificateur du Gateway.

Connexes :

- Tâches cron : [Tâches cron](/fr/automation/cron-jobs)

Conseil : exécutez `openclaw cron --help` pour voir toutes les commandes disponibles.

Remarque : les tâches isolées `cron add` utilisent par défaut la livraison `--announce`. Utilisez `--no-deliver` pour conserver
la sortie en interne. `--deliver` reste un alias déprécié pour `--announce`.

Remarque : les tâches ponctuelles (`--at`) sont supprimées après réussite par défaut. Utilisez `--keep-after-run` pour les conserver.

Remarque : les tâches récurrentes utilisent désormais une nouvelle tentative avec attente exponentielle après des erreurs consécutives (30 s → 1 min → 5 min → 15 min → 60 min), puis reviennent à la planification normale après la prochaine exécution réussie.

Remarque : `openclaw cron run` renvoie désormais dès que l'exécution manuelle est mise en file d'attente. Les réponses réussies incluent `{ ok: true, enqueued: true, runId }` ; utilisez `openclaw cron runs --id <job-id>` pour suivre le résultat final.

Remarque : la rétention/le nettoyage est contrôlé dans la configuration :

- `cron.sessionRetention` (par défaut `24h`) nettoie les sessions d'exécution isolées terminées.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` nettoient `~/.openclaw/cron/runs/<jobId>.jsonl`.

Note de mise à jour : si vous avez d'anciennes tâches cron antérieures au format de livraison/stockage actuel, exécutez
`openclaw doctor --fix`. Doctor normalise désormais les champs cron hérités (`jobId`, `schedule.cron`,
champs de livraison de premier niveau, alias de livraison de payload `provider`) et migre les simples
tâches de secours de webhook `notify: true` vers une livraison de webhook explicite lorsque `cron.webhook` est
configuré.

## Modifications courantes

Mettre à jour les paramètres de livraison sans changer le message :

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

Désactiver la diffusion pour une tâche isolée :

```bash
openclaw cron edit <job-id> --no-deliver
```

Activer le contexte d'amorçage léger pour une tâche isolée :

```bash
openclaw cron edit <job-id> --light-context
```

Annoncer à un canal spécifique :

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

`--light-context` s'applique uniquement aux tâches isolées de type agent-turn. Pour les exécutions cron, le mode léger maintient le contexte d'amorçage vide au lieu d'injecter l'ensemble complet d'amorçage de l'espace de travail.

import fr from "/components/footer/fr.mdx";

<fr />
