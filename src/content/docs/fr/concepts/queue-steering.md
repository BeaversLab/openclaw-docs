---
summary: "Comment le steering de run actif met en file d'attente les messages aux limites de l'exécution"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steer, queue, collect, and followup modes
title: "File d'attente de steering"
---

Lorsqu'un message arrive alors qu'une session est déjà en cours de diffusion, OpenClaw peut
envoyer ce message dans l'exécution active au lieu de démarrer une autre exécution pour
la même session. Les modes publics sont neutres par rapport à l'exécution ; Pi et le harnais
natif du serveur d'application Codex implémentent les détails de livraison différemment.

## Limite d'exécution

Le steering n'interrompt pas un appel d'outil qui est déjà en cours d'exécution. Pi vérifie les
messages de steering en file d'attente aux limites du modèle :

1. L'assistant demande des appels d'outils.
2. Pi exécute le lot d'appels d'outils du message actuel de l'assistant.
3. Pi émet l'événement de fin de tour.
4. Pi vide les messages de steering en file d'attente.
5. Pi ajoute ces messages en tant que messages utilisateur avant le prochain appel LLM.

Cela permet de garder les résultats des outils associés au message de l'assistant qui les a demandés,
puis permet au prochain appel du modèle de voir les dernières entrées de l'utilisateur.

Le harnais natif du serveur d'application Codex expose `turn/steer` au lieu de la
file d'attente de steering interne de Pi. OpenClaw adapte les mêmes modes à cet endroit :

- `steer` regroupe les messages en file d'attente pour la fenêtre de silence configurée, puis envoie une
  seule requête `turn/steer` avec toutes les entrées utilisateur collectées dans l'ordre d'arrivée.
- `queue` conserve la forme sérialisée héritée en envoyant des requêtes `turn/steer`
  séparées.
- `followup`, `collect`, `steer-backlog` et `interrupt` conservent le comportement
  de file d'attente propriétaire de OpenClaw autour du tour Codex actif.

Les tours de révision Codex et de compactage manuel rejettent le steering de même tour. Lorsqu'une
exécution ne peut pas accepter le steering, OpenClaw revient à la file d'attente de suivi où
ce mode l'autorise.

Cette page explique le steering en mode file d'attente pour les messages entrants normaux. Pour la
commande explicite `/steer <message>`, voir [Steer](/fr/tools/steer).

## Modes

| Mode            | Comportement du run actif                                                                                                                   | Comportement du suivi ultérieur                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `steer`         | Injecte tous les messages de direction en file d'attente ensemble à la prochaine limite d'exécution. Il s'agit de la valeur par défaut.     | Revient au suivi uniquement lorsque la direction n'est pas disponible.                                         |
| `queue`         | Direction héritée un par un. Pi injecte un message en file d'attente par limite de model ; Codex envoie des requêtes `turn/steer` séparées. | Revient au suivi uniquement lorsque la direction n'est pas disponible.                                         |
| `steer-backlog` | Même comportement de direction d'exécution active que `steer`.                                                                              | Conserve également le même message pour un tour de suivi ultérieur.                                            |
| `followup`      | Ne dirige pas l'exécution actuelle.                                                                                                         | Exécute les messages en file d'attente ultérieurement.                                                         |
| `collect`       | Ne dirige pas l'exécution actuelle.                                                                                                         | Fusionne les messages en file d'attente compatibles en un seul tour ultérieur après la fenêtre de anti-rebond. |
| `interrupt`     | Abandonne l'exécution active, puis démarre le message le plus récent.                                                                       | Aucun.                                                                                                         |

## Exemple de rafale

Si quatre utilisateurs envoient des messages pendant que l'agent exécute un tool :

- `steer` : l'exécution active reçoit les quatre messages dans l'ordre d'arrivée avant
  sa prochaine décision de model. Pi les vide à la limite de model suivante ; Codex
  les reçoit en un seul lot `turn/steer`.
- `queue` : direction sérialisée héritée. Pi injecte un message en file d'attente à la fois ;
  Codex reçoit des requêtes `turn/steer` séparées.
- `collect` : OpenClaw attend la fin de l'exécution active, puis crée un tour
  de suivi avec les messages en file d'attente compatibles après la fenêtre de anti-rebond.

## Portée

La direction cible toujours l'exécution de session active en cours. Elle ne crée pas de nouvelle
session, ne modifie pas la stratégie de tool de l'exécution active, ni ne divise les messages par expéditeur. Dans
les canaux multi-utilisateurs, les invites entrantes incluent déjà le contexte de l'expéditeur et de l'itinéraire, afin
que le prochain appel de model puisse voir qui a envoyé chaque message.

Utilisez `collect` lorsque vous souhaitez que OpenClaw crée un tour de suivi ultérieur pouvant
fusionner les messages compatibles et préserver la stratégie d'abandon de la file d'attente de suivi. Utilisez
`queue` uniquement lorsque vous avez besoin de l'ancien comportement de direction un par un.

## Anti-rebond

`messages.queue.debounceMs` s'applique à la livraison de suivi, y compris `collect`,
`followup`, `steer-backlog`, et le repli `steer` lorsque la direction d'exécution active n'est pas
disponible. Pour Pi, la `steer` active elle-même n'utilise pas la minuterie de rebond (debounce) car
Pi regroupe naturellement les messages jusqu'à la prochaine limite du modèle. Pour le harnais
Codex natif, OpenClaw utilise la même valeur de rebond que la fenêtre de silence avant
d'envoyer le `turn/steer` regroupé.

## Connexes

- [File de commandes](/fr/concepts/queue)
- [Diriger](/fr/tools/steer)
- [Messages](/fr/concepts/messages)
- [Boucle de l'agent](/fr/concepts/agent-loop)
