---
summary: "Référence CLI pour `openclaw cron` (planifier et exécuter des tâches d'arrière-plan)"
read_when:
  - Vous souhaitez des tâches planifiées et des réveils
  - Vous déboguez l'exécution et les journaux cron
title: "cron"
---

# `openclaw cron`

Gérer les tâches cron pour le planificateur Gateway.

Connexe :

- Tâches cron : [Tâches cron](/fr/automation/cron-jobs)

Astuce : exécutez `openclaw cron --help` pour l'ensemble complet des commandes.

Remarque : les tâches isolées `cron add` sont livrées par défaut via `--announce`. Utilisez `--no-deliver` pour conserver
la sortie en interne. `--deliver` reste un alias obsolète pour `--announce`.

Remarque : les tâches ponctuelles (`--at`) sont supprimées après succès par défaut. Utilisez `--keep-after-run` pour les conserver.

Remarque : les tâches récurrentes utilisent désormais une attente exponentielle avec nouvelle tentative après des erreurs consécutives (30 s → 1 min → 5 min → 15 min → 60 min), puis retournent à l'horaire normal après la prochaine exécution réussie.

Remarque : `openclaw cron run` renvoie désormais dès que l'exécution manuelle est mise en file d'attente. Les réponses réussies incluent `{ ok: true, enqueued: true, runId }` ; utilisez `openclaw cron runs --id <job-id>` pour suivre le résultat final.

Remarque : la rétention/le nettoyage est contrôlé dans la configuration :

- `cron.sessionRetention` (par défaut `24h`) nettoie les sessions d'exécution isolées terminées.
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` nettoient `~/.openclaw/cron/runs/<jobId>.jsonl`.

Remarque de mise à niveau : si vous avez d'anciennes tâches cron antérieures au format actuel de livraison/stockage, exécutez
`openclaw doctor --fix`. Doctor normalise désormais les champs cron hérités (`jobId`, `schedule.cron`,
champs de livraison de niveau supérieur, alias de livraison `provider`) et migre les simples
tâches de repli webhook `notify: true` vers une livraison webhook explicite lorsque `cron.webhook` est
configuré.

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

Annoncer sur un channel spécifique :

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

`--light-context` s'applique uniquement aux travaux de tour d'agent isolés. Pour les exécutions cron, le mode léger garde le contexte d'amorçage vide au lieu d'injecter l'ensemble complet d'amorçage de l'espace de travail.

import en from "/components/footer/en.mdx";

<en />
