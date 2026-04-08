---
summary: "Outils d'agent pour le statut inter-session, la rappel, la messagerie et l'orchestration de sous-agents"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect status or control spawned sub-agents
title: "Outils de session"
---

# Outils de Session

OpenClaw fournit aux agents des outils pour travailler à travers les sessions, inspecter le statut et orchestrer des sous-agents.

## Outils disponibles

| Outil              | Ce qu'il fait                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `sessions_list`    | Lister les sessions avec des filtres optionnels (type, récence)                                         |
| `sessions_history` | Lire la transcription d'une session spécifique                                                          |
| `sessions_send`    | Envoyer un message à une autre session et attendre optionnellement                                      |
| `sessions_spawn`   | Créer une session de sous-agent isolée pour le traitement en arrière-plan                               |
| `sessions_yield`   | Terminez le tour actuel et attendez les résultats des sous-agents de suivi                              |
| `subagents`        | Lister, diriger ou tuer les sous-agents générés pour cette session                                      |
| `session_status`   | Afficher une carte de style `/status` et définir facultativement une substitution de modèle par session |

## Listage et lecture des sessions

`sessions_list` retourne les sessions avec leur clé, kind, channel, model, le nombre de tokens et les horodatages. Filtrez par kind (`main`, `group`, `cron`, `hook`, `node`) ou par récence (`activeMinutes`).

`sessions_history` récupère la transcription de conversation pour une session spécifique.
Par défaut, les résultats des outils sont exclus -- passez `includeTools: true` pour les voir.
La vue retournée est intentionnellement bornée et filtrée pour la sécurité :

- le texte de l'assistant est normalisé avant le rappel :
  - les balises de réflexion (thinking) sont supprimées
  - les blocs d'échafaudage `<relevant-memories>` / `<relevant_memories>` sont supprimés
  - les blocs de payload XML d'appel d'outil en texte brut tels que `<tool_call>...</tool_call>`,
    `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>` et
    `<function_calls>...</function_calls>` sont supprimés, y compris les payloads
    tronqués qui ne se ferment jamais proprement
  - l'échafaudage d'appel/résultat d'outil rétrogradé tel que `[Tool Call: ...]`,
    `[Tool Result ...]` et `[Historical context ...]` est supprimé
  - les jetons de contrôle de modèle fuités tels que `<|assistant|>`, d'autres jetons
    ASCII `<|...|>` et les variantes pleine largeur `<｜...｜>` sont supprimés
  - les XML d'appel d'outil MiniMax malformés tels que `<invoke ...>` /
    `</minimax:tool_call>` sont supprimés
- le texte de type identifiant/jeton est masqué avant d'être retourné
- les longs blocs de texte sont tronqués
- les très grands historiques peuvent supprimer les anciennes lignes ou remplacer une ligne trop volumineuse par
  `[sessions_history omitted: message too large]`
- l'outil signale des indicateurs récapitulatifs tels que `truncated`, `droppedMessages`,
  `contentTruncated`, `contentRedacted` et `bytes`

Les deux outils acceptent soit une **clé de session** (comme `"main"`) soit un **ID de session**
d'un appel de liste précédent.

Si vous avez besoin de la transcription exacte octet par octet, inspectez le fichier de transcription sur
le disque au lieu de traiter `sessions_history` comme un vidage brut.

## Envoi de messages inter-sessions

`sessions_send` délivre un message à une autre session et attend facultativement
la réponse :

- **Fire-and-forget :** définissez `timeoutSeconds: 0` pour mettre en file d'attente et retourner
  immédiatement.
- **Attendre la réponse :** définissez un délai d'attente et obtenez la réponse en ligne.

Après que la cible a répondu, OpenClaw peut exécuter une **boucle de réponse** où les
agents alternent les messages (jusqu'à 5 tours). L'agent cible peut répondre
`REPLY_SKIP` pour arrêter prématurément.

## Aides au statut et à l'orchestration

`session_status` est l'outil léger équivalent à `/status` pour la session
courante ou une autre session visible. Il signale l'utilisation, l'heure, l'état du modèle/runtime et
le contexte de tâche d'arrière-plan lié lorsqu'il est présent. Comme `/status`, il peut remplir
les compteurs de jetons/cache pars à partir de la dernière entrée d'utilisation de transcription, et
`model=default` efface une priorité par session.

`sessions_yield` termine intentionnellement le tour actuel afin que le message suivant puisse être
l'événement de suivi que vous attendez. Utilisez-le après avoir généré des sous-agents lorsque
vous voulez que les résultats d'achèvement arrivent comme le message suivant au lieu de construire
des boucles de sondage.

`subagents` est l'aide du plan de contrôle pour les sous-agents OpenClaw
déjà générés. Il prend en charge :

- `action: "list"` pour inspecter les exécutions actives/récentes
- `action: "steer"` pour envoyer des instructions de suivi à un enfant en cours d'exécution
- `action: "kill"` pour arrêter un enfant ou `all`

## Génération de sous-agents

`sessions_spawn` crée une session isolée pour une tâche en arrière-plan. Elle est toujours non bloquante -- elle renvoie immédiatement un `runId` et `childSessionKey`.

Options clés :

- `runtime: "subagent"` (par défaut) ou `"acp"` pour les agents de harnais externes.
- `model` et `thinking` remplacements pour la session enfant.
- `thread: true` pour lier le lancement à un fil de discussion (Discord, Slack, etc.).
- `sandbox: "require"` pour appliquer le sandboxing à l'enfant.

Par défaut, les sous-agents feuilles ne reçoivent pas d'outils de session. Lorsque `maxSpawnDepth >= 2`, les sous-agents orchestrateurs de profondeur 1 reçoivent également `sessions_spawn`, `subagents`, `sessions_list` et `sessions_history` afin qu'ils puissent gérer leurs propres enfants. Les exécutions feuilles ne reçoivent toujours pas d'outils d'orchestration récursifs.

Après achèvement, une étape d'annonce publie le résultat dans le canal du demandeur. La livraison de l'achèvement préserve le routage lié au fil/sujet si disponible, et si l'origine de l'achèvement n'identifie qu'un canal, OpenClaw peut toujours réutiliser la route stockée de la session du demandeur (`lastChannel` / `lastTo`) pour une livraison directe.

Pour le comportement spécifique à l'ACP, voir [ACP Agents](/en/tools/acp-agents).

## Visibilité

Les outils de session sont délimités pour limiter ce que l'agent peut voir :

| Niveau  | Portée                                           |
| ------- | ------------------------------------------------ |
| `self`  | Uniquement la session actuelle                   |
| `tree`  | Session actuelle + sous-agents lancés            |
| `agent` | Toutes les sessions pour cet agent               |
| `all`   | Toutes les sessions (multi-agentes si configuré) |

La valeur par défaut est `tree`. Les sessions sandboxées sont limitées à `tree` indépendamment de la configuration.

## Pour aller plus loin

- [Gestion de session](/en/concepts/session) -- routage, cycle de vie, maintenance
- [Agents ACP](/en/tools/acp-agents) -- lancement de harnais externe
- [Multi-agent](/en/concepts/multi-agent) -- architecture multi-agents
- [Gateway Configuration](/en/gateway/configuration) -- paramètres de configuration des outils de session
