---
summary: "Comment le steering de run actif met en file d'attente les messages aux limites de l'exécution"
read_when:
  - Explaining how steer behaves while an agent is using tools
  - Changing active-run queue behavior or runtime steering integration
  - Comparing steering with followup, collect, and interrupt queue modes
title: "File d'attente de steering"
---

Lorsqu'une invite normale arrive alors qu'une exécution de session est déjà en cours de diffusion, OpenClaw tente d'envoyer cette invite dans le runtime actif par défaut lorsque le mode de file d'attente est OpenClaw`steer`OpenClaw. Aucune entrée de configuration et aucune directive de file d'attente ne sont requises pour ce comportement par défaut. OpenClaw et le harness natif du serveur d'application Codex implémentent les détails de livraison différemment.

## Limite d'exécution

Le pilotage n'interrompt pas un appel d'outil qui est déjà en cours d'exécution. OpenClaw vérifie les messages de pilotage en file d'attente aux limites du modèle :

1. L'assistant demande des appels d'outils.
2. OpenClaw exécute le lot d'appels d'outils du message de l'assistant actuel.
3. OpenClaw émet l'événement de fin de tour.
4. OpenClaw draine les messages de pilotage en file d'attente.
5. OpenClaw ajoute ces messages en tant que messages utilisateur avant le prochain appel LLM.

Cela permet de garder les résultats des outils associés au message de l'assistant qui les a demandés,
puis permet au prochain appel du modèle de voir les dernières entrées de l'utilisateur.

Le harness natif du serveur d'application Codex expose `turn/steer`OpenClawOpenClaw au lieu de la file d'attente de pilotage interne du runtime OpenClaw. OpenClaw regroupe les invites en file d'attente pour la fenêtre de silence configurée, puis envoie une seule requête `turn/steer` avec toutes les entrées utilisateur collectées dans l'ordre d'arrivée.

La révision Codex et la compactification manuelle rejettent la direction du même tour. Lorsqu'un
runtime ne peut pas accepter de direction en mode `steer`, OpenClaw attend que l'exécution
active soit terminée avant de démarrer l'invite.

Cette page explique la direction en mode de file d'attente pour les messages entrants normaux lorsque le mode
est `steer`. Si le mode est `followup` ou `collect`, les messages normaux n'entrent pas
dans ce chemin de direction ; ils attendent la fin de l'exécution active. Pour la commande explicite
`/steer <message>`, voir [Steer](/fr/tools/steer).

## Modes

| Mode        | Comportement de l'exécution active                                | Comportement ultérieur                                                                                    |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `steer`     | Oriente l'invite vers le runtime actif lorsque cela est possible. | Attend la fin de l'exécution active si la direction n'est pas disponible.                                 |
| `followup`  | N'oriente pas.                                                    | Exécute les messages en file d'attente ultérieurement après la fin de l'exécution active.                 |
| `collect`   | N'oriente pas.                                                    | Fusionne les messages en file d'attente compatibles en un seul tour ultérieur après la fenêtre de rebond. |
| `interrupt` | Interrompt l'exécution active au lieu de l'orienter.              | Démarre le message le plus récent après l'interruption.                                                   |

## Exemple de rafale

Si quatre utilisateurs envoient des messages pendant que l'agent exécute un appel d'outil :

- Avec le comportement par défaut, le runtime actif reçoit les quatre messages dans l'ordre d'arrivée avant sa prochaine décision de modèle. OpenClaw les draine à la prochaine limite de modèle ; Codex les reçoit comme un seul OpenClaw`turn/steer` regroupé.
- Avec `/queue collect`, OpenClaw ne pilote pas. Il attend la fin de l'exécution active, puis crée un tour de suivi avec les messages en file d'attente compatibles après la fenêtre de rebond.
- Avec `/queue interrupt`, OpenClaw interrompt l'exécution active et démarre le message le plus récent au lieu de piloter.

## Portée

Le pilotage cible toujours l'exécution de session active actuelle. Il ne crée pas de nouvelle session, ne modifie pas la stratégie de tool de l'exécution active et ne divise pas les messages par expéditeur. Dans les canaux multi-utilisateurs, les invites entrantes incluent déjà le contexte de l'expéditeur et de l'itinéraire, de sorte que le prochain appel du modèle peut voir qui a envoyé chaque message.

Utilisez `followup` ou `collect` lorsque vous souhaitez que les messages soient mis en file d'attente par défaut au lieu de piloter l'exécution active. Utilisez `interrupt` lorsque la dernière invite doit remplacer l'exécution active.

## Rebond

`messages.queue.debounceMs` s'applique à la livraison de `followup` et de `collect` en file d'attente. En mode `steer` avec le harness natif Codex, il définit également la fenêtre de silence avant d'envoyer des `turn/steer`OpenClawOpenClaw regroupés. Pour OpenClaw, le pilotage actif n'utilise pas lui-même la minuterie de rebond car OpenClaw regroupe naturellement les messages jusqu'à la prochaine limite de modèle.

## Connexes

- [File de commandes](/fr/concepts/queue)
- [Piloter (Steer)](/fr/tools/steer)
- [Messages](/fr/concepts/messages)
- [Boucle d'agent](/fr/concepts/agent-loop)
