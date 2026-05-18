---
summary: "Diriger une exécution active sans changer le mode de file d'attente"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue modes
  - Deciding whether to steer the current run, a sub-agent, or an ACP session
title: "Diriger"
sidebarTitle: "Diriger"
---

`/steer`OpenClaw essaie d'abord d'envoyer des instructions à une exécution déjà active. C'est pour les moments où l'on souhaite "ajuster cette exécution pendant qu'elle travaille encore". Si l'exécution actuelle ne peut pas accepter de guidage, OpenClaw envoie le message sous forme de invite normal au lieu de l'abandonner.

## Session actuelle

Utilisez `/steer` de niveau supérieur pour cibler l'exécution active de la session actuelle :

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

`/queue steer` fait en sorte que les messages entrants normaux essaient de guider l'exécution active lorsqu'ils arrivent pendant qu'une exécution est active. `/steer <message>` est une commande explicite qui essaie d'injecter le message de cette commande dans l'exécution active à la prochaine limite d'exécution prise en charge, indépendamment du paramètre `/queue` stocké. Lorsque cette injection n'est pas disponible, le préfixe de commande est supprimé et `<message>` continue comme un invite normal.

Utilisation :

- `/steer <message>` lorsque vous voulez guider l'exécution active maintenant.
- `/queue steer` lorsque vous voulez que les messages normaux futurs guident
  les exécutions actives par défaut.
- `/queue collect` ou `/queue followup` lorsque les messages normaux futurs doivent attendre
  un tour ultérieur au lieu de guider l'exécution active.
- `/queue interrupt` lorsque le message le plus récent doit remplacer l'exécution
  active au lieu de la guider.

Pour les modes de file d'attente et les limites de guidage, voir [Command queue](/fr/concepts/queue) et
[Steering queue](/fr/concepts/queue-steering).

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

Voir [ACP agents](/fr/tools/acp-agents) pour la sélection de session ACP et le comportement
d'exécution.

## Connexes

- [Slash commands](/fr/tools/slash-commands)
- [Command queue](/fr/concepts/queue)
- [Steering queue](/fr/concepts/queue-steering)
- [Sous-agents](/fr/tools/subagents)
