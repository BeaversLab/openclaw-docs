---
summary: "Diriger une exécution active sans changer le mode de file"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue modes
  - Deciding whether to steer the current run or an ACP session
title: "Diriger"
sidebarTitle: "Diriger"
---

`/steer` essaie d'abord d'envoyer des directives à une exécution déjà active. C'est pour les moments où l'on souhaite « ajuster cette exécution tant qu'elle fonctionne encore ». Si l'exécution actuelle ne peut pas accepter de directives, OpenClaw envoie le message sous forme de invite normal au lieu de l'abandonner.

## Session actuelle

Utilisez `/steer` de premier niveau pour cibler l'exécution active de la session actuelle :

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

Comportement :

- Cible uniquement l'exécution active de la session actuelle.
- Fonctionne indépendamment du mode `/queue` de la session.
- Démarre un tour normal avec le même message lorsque la session est inactive ou
  que l'exécution active ne peut pas accepter le guidage.
- Utilise le chemin de guidage de l'exécution active, afin que le modèle voie les
  instructions à la prochaine limite d'exécution prise en charge.

## Guidage vs file d'attente

`/queue steer` fait en sorte que les messages entrants normaux essaient de diriger l'exécution active lorsqu'ils arrivent pendant qu'une exécution est active. `/steer <message>` est une commande explicite qui essaie d'injecter le message de cette commande dans l'exécution active à la prochaine limite d'exécution prise en charge, quel que soit le paramètre `/queue` stocké. Lorsque cette injection n'est pas disponible, le préfixe de commande est supprimé et `<message>` continue en tant qu'invite normal.

Utilisation :

- `/steer <message>` lorsque vous souhaitez guider l'exécution active immédiatement.
- `/queue steer` lorsque vous souhaitez que les messages normaux futurs dirigent les exécutions actives par défaut.
- `/queue collect` ou `/queue followup` lorsque les messages normaux futurs doivent attendre un tour ultérieur au lieu de diriger l'exécution active.
- `/queue interrupt` lorsque le message le plus récent doit remplacer l'exécution active au lieu de la diriger.

Pour les modes de file et les limites de direction, voir [File de commandes](/fr/concepts/queue) et [File de direction](/fr/concepts/queue-steering).

## Sous-agents

`/steer` de premier niveau cible l'exécution active de la session actuelle. Les sous-agents font rapport à leur session parente/demandeur ; `/subagents` sert uniquement à la visibilité.

## Sessions ACP

Utilisez `/acp steer` lorsque la cible est une session de harnais ACP :

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

Voir [Agents ACP](/fr/tools/acp-agents) pour la sélection de session ACP et le comportement à l'exécution.

## Connexes

- [Commandes Slash](/fr/tools/slash-commands)
- [File d'attente de commandes](/fr/concepts/queue)
- [File d'attente de pilotage](/fr/concepts/queue-steering)
- [Sous-agents](/fr/tools/subagents)
