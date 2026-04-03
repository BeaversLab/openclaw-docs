---
summary: "Outils d'agent pour lister les sessions, lire l'historique et les messages intersessions"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
title: "Outils de session"
---

# Outils de Session

OpenClaw fournit aux agents des outils pour travailler à travers les sessions -- lister les conversations,
lire l'historique, envoyer des messages à d'autres sessions et créer des sous-agents.

## Outils disponibles

| Outil              | Ce qu'il fait                                                             |
| ------------------ | ------------------------------------------------------------------------- |
| `sessions_list`    | Lister les sessions avec des filtres optionnels (type, récence)           |
| `sessions_history` | Lire la transcription d'une session spécifique                            |
| `sessions_send`    | Envoyer un message à une autre session et attendre optionnellement        |
| `sessions_spawn`   | Créer une session de sous-agent isolée pour le traitement en arrière-plan |

## Listing et lecture des sessions

`sessions_list` renvoie les sessions avec leur clé, type, channel, model,
nombres de jetons et horodatages. Filtrer par type (`main`, `group`, `cron`, `hook`,
`node`) ou récence (`activeMinutes`).

`sessions_history` récupère la transcription de la conversation pour une session spécifique.
Par défaut, les résultats des outils sont exclus -- passez `includeTools: true` pour les voir.

Les deux outils acceptent soit une **clé de session** (comme `"main"`) soit un **ID de session**
issu d'un appel de liste précédent.

## Envoi de messages intersessions

`sessions_send` délivre un message à une autre session et attend optionnellement la
réponse :

- **Tirer-et-oublier :** définissez `timeoutSeconds: 0` pour mettre en file d'attente et retourner
  immédiatement.
- **Attendre la réponse :** définissez un délai d'expiration et obtenez la réponse en ligne.

Après que la cible ait répondu, OpenClaw peut exécuter une **boucle de réponse** où les
agents alternent les messages (jusqu'à 5 tours). L'agent cible peut répondre
`REPLY_SKIP` pour arrêter tôt.

## Création de sous-agents

`sessions_spawn` crée une session isolée pour une tâche d'arrière-plan. Elle est toujours
non bloquante -- elle retourne immédiatement une `runId` et un `childSessionKey`.

Options clés :

- `runtime: "subagent"` (par défaut) ou `"acp"` pour les agents de harnais externes.
- `model` et `thinking` remplacements pour la session enfant.
- `thread: true` pour lier le lancement à un fil de discussion (Discord, Slack, etc.).
- `sandbox: "require"` pour appliquer le sandboxing à l'enfant.

Les sous-agents bénéficient de l'ensemble complet d'outils à l'exception des outils de session (pas de lancement récursif).
Une fois terminé, une étape d'annonce publie le résultat dans le channel du demandeur.

Pour un comportement spécifique à l'ACP, voir [ACP Agents](/en/tools/acp-agents).

## Visibilité

Les outils de session sont délimités pour limiter ce que l'agent peut voir :

| Niveau  | Portée                                          |
| ------- | ----------------------------------------------- |
| `self`  | Seulement la session actuelle                   |
| `tree`  | Session actuelle + sous-agents lancés           |
| `agent` | Toutes les sessions pour cet agent              |
| `all`   | Toutes les sessions (inter-agents si configuré) |

La valeur par défaut est `tree`. Les sessions sandboxed sont limitées à `tree` quelle que soit la
configuration.

## Pour aller plus loin

- [Session Management](/en/concepts/session) -- routage, cycle de vie, maintenance
- [ACP Agents](/en/tools/acp-agents) -- lancement de harnais externe
- [Multi-agent](/en/concepts/multi-agent) -- architecture multi-agent
- [Gateway Configuration](/en/gateway/configuration) -- paramètres de configuration des outils de session
