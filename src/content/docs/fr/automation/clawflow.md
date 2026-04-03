---
summary: "Note de compatibilité pour les anciennes références ClawFlow dans les notes de version et la documentation"
read_when:
  - You encounter ClawFlow or openclaw flows in older release notes or docs
  - You want to understand what ClawFlow terminology maps to in the current CLI
  - You want to translate older flow references into the supported task commands
title: "ClawFlow"
---

# ClawFlow

`ClawFlow` apparaît dans certaines anciennes notes de version et documentation OpenClaw comme s'il s'agissait d'un environnement d'exécution orienté utilisateur avec sa propre surface de commande `openclaw flows`.

Ce n'est pas la surface actuelle orientée opérateur dans ce dépôt.

Aujourd'hui, la surface CLI prise en charge pour inspecter et gérer le travail détaché est [`openclaw tasks`](/en/automation/tasks).

## Ce qu'il faut utiliser aujourd'hui

- `openclaw tasks list` affiche les exécutions détachées suivies
- `openclaw tasks show <lookup>` affiche une tâche par ID de tâche, ID d'exécution ou clé de session
- `openclaw tasks cancel <lookup>` annule une tâche en cours d'exécution
- `openclaw tasks audit` signale les exécutions de tâches obsolètes ou rompues

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## Ce que cela signifie pour les anciennes références

Si vous voyez `ClawFlow` ou `openclaw flows` dans :

- d'anciennes notes de version
- fil de discussion sur les problèmes
- résultats de recherche obsolètes
- notes locales obsolètes

traduisez ces instructions vers la tâche actuelle CLI :

- `openclaw flows list` -> `openclaw tasks list`
- `openclaw flows show <lookup>` -> `openclaw tasks show <lookup>`
- `openclaw flows cancel <lookup>` -> `openclaw tasks cancel <lookup>`

## Connexes

- [Tâches d'arrière-plan](/en/automation/tasks) — registre du travail détaché
- [CLI : flux](/en/cli/flows) — note de compatibilité pour le nom de commande erroné
- [Tâches Cron](/en/automation/cron-jobs) — tâches planifiées susceptibles de créer des tâches
