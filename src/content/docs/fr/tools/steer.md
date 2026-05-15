---
summary: "Diriger une exécution active sans changer le mode de file d'attente"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue steer
  - Deciding whether to steer the current run, a sub-agent, or an ACP session
title: "Diriger"
sidebarTitle: "Diriger"
---

`/steer` envoie des instructions à une exécution déjà active. Il est destiné aux moments « ajuster cette exécution pendant qu'elle fonctionne encore », et non pour démarrer un nouveau tour.

## Session actuelle

Utilisez `/steer` de niveau supérieur pour cibler l'exécution active de la session actuelle :

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

Comportement :

- Cible uniquement l'exécution active de la session actuelle.
- Fonctionne indépendamment du mode `/queue` de la session.
- Ne démarre pas une nouvelle exécution lorsque la session est inactive.
- Répond avec un avertissement lorsqu'il n'y a aucune exécution active à diriger.
- Utilise le chemin de pilotage de l'exécution active, de sorte que le modèle voit les instructions à la prochaine limite d'exécution prise en charge.

## Diriger vs file d'attente

`/queue steer` modifie le comportement des messages entrants normaux lorsqu'ils arrivent pendant qu'une exécution est active. `/steer <message>` est une commande explicite qui tente d'injecter le message de cette commande dans l'exécution active à la prochaine limite d'exécution prise en charge, quel que soit le paramètre `/queue` stocké.

Utilisation :

- `/steer <message>` lorsque vous souhaitez guider l'exécution active immédiatement.
- `/queue steer` lorsque vous souhaitez que les messages normaux futurs dirigent les exécutions actives par défaut.
- `/queue collect` ou `/queue followup` lorsque les nouveaux messages doivent attendre un tour ultérieur au lieu de diriger l'exécution active.

Pour les modes de file d'attente et le comportement de repli, voir [Command queue](/fr/concepts/queue) et [Steering queue](/fr/concepts/queue-steering).

## Sous-agents

Utilisez `/subagents steer` lorsque la cible est une exécution enfant :

```text
/subagents steer 2 focus only on the API surface
```

`/steer` de niveau supérieur ne sélectionne pas de sous-agent par id ou par index de liste. Il cible toujours l'exécution active de la session actuelle. Voir [Sub-agents](/fr/tools/subagents) pour les identifiants, les étiquettes et les commandes de contrôle des sous-agents.

## Sessions ACP

Utilisez `/acp steer` lorsque la cible est une session de harnais ACP :

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

Voir [ACP agents](/fr/tools/acp-agents) pour la sélection de session ACP et le comportement à l'exécution.

## Connexes

- [Commandes de barre oblique](/fr/tools/slash-commands)
- [File de commandes](/fr/concepts/queue)
- [File de guidage](/fr/concepts/queue-steering)
- [Sous-agents](/fr/tools/subagents)
