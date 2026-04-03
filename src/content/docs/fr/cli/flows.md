---
summary: "Note de compatibilité pour la commande `openclaw flows` documentée par erreur"
read_when:
  - You encounter openclaw flows in older release notes, issue threads, or search results
  - You want to know what command replaced openclaw flows
title: "flows"
---

# `openclaw flows`

`openclaw flows` n'est **pas** une commande actuelle de la CLI OpenClaw.

Certaines anciennes notes de version et documentations ont documenté par erreur une surface de commande `flows`. La surface d'opérateur prise en charge est [`openclaw tasks`](/en/automation/tasks).

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## Utiliser à la place

- `openclaw tasks list` — lister les tâches d'arrière-plan suivies
- `openclaw tasks show <lookup>` — inspecter une tâche par ID de tâche, ID d'exécution ou clé de session
- `openclaw tasks cancel <lookup>` — annuler une tâche d'arrière-plan en cours d'exécution
- `openclaw tasks notify <lookup> <policy>` — modifier le comportement de notification des tâches
- `openclaw tasks audit` — afficher les exécutions de tâches obsolètes ou cassées

## Pourquoi cette page existe

Cette page reste en place afin que les liens existants provenant d'anciennes entrées de journal des modifications, de fils de discussion et de résultats de recherche bénéficient d'une correction claire plutôt que d'une impasse.

## Connexes

- [Tâches d'arrière-plan](/en/automation/tasks) — registre des travaux détachés
- [Référence de la CLI](/en/cli/index) — arborescence complète des commandes
