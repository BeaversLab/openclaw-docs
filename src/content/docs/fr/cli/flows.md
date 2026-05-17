---
summary: "Redirection : les commandes de flux se trouvent sous `openclaw tasks flow`"
read_when:
  - You encounter `openclaw flows` in older docs or release notes
  - You want a quick TaskFlow inspection reference
title: "Flux (redirection)"
---

# `openclaw tasks flow`

Il n'y a pas de commande `openclaw flows` de niveau supérieur. L'inspection de Durable TaskFlow se trouve sous `openclaw tasks flow`.

## Sous-commandes

```bash
openclaw tasks flow list   [--json] [--status <name>]
openclaw tasks flow show   <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

| Sous-commande | Description                               | Arguments / options                                                                                  |
| ------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `list`        | Lister les TaskFlows suivis.              | `--json` sortie lisible par machine ; `--status <name>` filtre (voir les valeurs d'état ci-dessous). |
| `show`        | Afficher un TaskFlow.                     | `<lookup>` id de flux ou clé de propriétaire ; `--json` sortie lisible par machine.                  |
| `cancel`      | Annuler un TaskFlow en cours d'exécution. | `<lookup>` id de flux ou clé de propriétaire.                                                        |

`<lookup>` accepte soit un id de flux (renvoyé par `list` / `show`) soit la clé de propriétaire du flux (l'identifiant stable que le sous-système propriétaire utilise pour suivre le flux).

### Valeurs du filtre de statut

`--status` sur `list` accepte l'une des valeurs suivantes :

`queued`, `running`, `waiting`, `blocked`, `succeeded`, `failed`, `cancelled`, `lost`

## Exemples

```bash
openclaw tasks flow list
openclaw tasks flow list --status running
openclaw tasks flow list --json
openclaw tasks flow show flow_abc123
openclaw tasks flow show flow_abc123 --json
openclaw tasks flow cancel flow_abc123
```

Pour les concepts complets et la création de TaskFlow, voir [TaskFlow](/fr/automation/taskflow). Pour la commande parente `tasks`, voir [référence de la CLI des tâches](/fr/cli/tasks).

## Connexes

- [Référence de la CLI](/fr/cli)
- [Automatisation](/fr/automation)
- [TaskFlow](/fr/automation/taskflow)
