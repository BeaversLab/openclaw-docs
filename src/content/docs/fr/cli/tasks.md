---
summary: "Référence CLI pour `openclaw tasks` (grand livre des tâches en arrière-plan et état du flux de tâches)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `openclaw tasks flow`
title: "`openclaw tasks`"
---

Inspect durable background tasks and Task Flow state. With no subcommand,
`openclaw tasks` is equivalent to `openclaw tasks list`.

Voir [Tâches d'arrière-plan](/fr/automation/tasks) pour le cycle de vie et le modèle de livraison.

## Usage

```bash
openclaw tasks
openclaw tasks list
openclaw tasks list --runtime acp
openclaw tasks list --status running
openclaw tasks show <lookup>
openclaw tasks notify <lookup> state_changes
openclaw tasks cancel <lookup>
openclaw tasks audit
openclaw tasks maintenance
openclaw tasks maintenance --apply
openclaw tasks flow list
openclaw tasks flow show <lookup>
openclaw tasks flow cancel <lookup>
```

## Root Options

- `--json`: output JSON.
- `--runtime <name>`: filter by kind: `subagent`, `acp`, `cron`, or `cli`.
- `--status <name>`: filter by status: `queued`, `running`, `succeeded`, `failed`, `timed_out`, `cancelled`, or `lost`.

## Subcommands

### `list`

```bash
openclaw tasks list [--runtime <name>] [--status <name>] [--json]
```

Lists tracked background tasks newest first.

### `show`

```bash
openclaw tasks show <lookup> [--json]
```

Shows one task by task ID, run ID, or session key.

### `notify`

```bash
openclaw tasks notify <lookup> <done_only|state_changes|silent>
```

Changes the notification policy for a running task.

### `cancel`

```bash
openclaw tasks cancel <lookup>
```

Cancels a running background task.

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

Surfaces stale, lost, delivery-failed, or otherwise inconsistent task and Task Flow records. Lost tasks retained until `cleanupAfter` are warnings; expired or unstamped lost tasks are errors.

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

Prévisualise ou applique la réconciliation des tâches et des flux de tâches, le nettoyage de l'horodatage, l'élagage,
et le nettoyage du registre de sessions d'exécution cron obsolètes.
Pour les tâches cron, la réconciliation utilise les journaux d'exécution persistés/l'état des tâches avant de marquer une
ancienne tâche active `lost`, afin que les exécutions cron terminées ne deviennent pas de fausses erreurs d'audit
simplement parce que l'état d'exécution en mémoire du Gateway a disparu. L'audit hors ligne de la CLI
n'est pas autoritaire pour l'ensemble de tâches cron actives locales au processus du Gateway. Les tâches de la CLI
avec un ID d'exécution/ID source sont marquées `lost` lorsque leur contexte d'exécution en direct du Gateway a
disparu, même si une ancienne ligne de session enfant reste.
Lorsqu'elle est appliquée, la maintenance élague également les lignes du registre de sessions `cron:<jobId>:run:<uuid>`
âgées de plus de 7 jours tout en préservant les tâches cron en cours d'exécution et en laissant
les lignes de sessions non cron intactes.

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

Inspects or cancels durable Task Flow state under the task ledger.

## Related

- [Référence de la CLI](/fr/cli)
- [Tâches d'arrière-plan](/fr/automation/tasks)
