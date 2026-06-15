---
summary: "Outils d'agent pour le statut inter-session, la récupération, la messagerie et l'orchestration de sous-agents"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect spawned sub-agent status
title: "Outils de session"
---

OpenClaw fournit aux agents des outils pour travailler sur plusieurs sessions, inspecter le statut et orchestrer des sous-agents.

## Outils disponibles

| Outil              | Ce qu'il fait                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `sessions_list`    | Lister les sessions avec des filtres optionnels (type, étiquette, agent, récence, aperçu)               |
| `sessions_history` | Lire la transcription d'une session spécifique                                                          |
| `sessions_send`    | Envoyer un message à une autre session et attendre optionnellement                                      |
| `sessions_spawn`   | Générer une session de sous-agent isolée pour le travail en arrière-plan                                |
| `sessions_yield`   | Terminer le tour actuel et attendre les résultats de suivi du sous-agent                                |
| `subagents`        | Lister l'état des sous-agents générés pour cette session                                                |
| `session_status`   | Afficher une carte de style `/status` et définir optionnellement une substitution de modèle par session |

Ces outils sont toujours soumis au profil d'outil actif et à la politique d'autorisation/refus. `tools.profile: "coding"` inclut l'ensemble complet d'orchestration de session, y compris `sessions_spawn`, `sessions_yield`, et `subagents`.
`tools.profile: "messaging"` inclut les outils de messagerie inter-session
(`sessions_list`, `sessions_history`, `sessions_send`, `session_status`) mais
n'inclut pas la génération de sous-agents. Pour conserver un profil de messagerie et toujours
permettre la délégation native, ajoutez :

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"],
  },
}
```

Les stratégies de groupe, de fournisseur, de bac à sable et par agent peuvent toujours supprimer ces outils
après l'étape du profil. Utilisez `/tools` à partir de la session affectée pour inspecter la
liste d'outils effective.

## Listage et lecture des sessions

`sessions_list` renvoie des sessions avec leur clé, agentId, kind, channel, model,
les nombres de jetons et les horodatages. Filtrez par kind (`main`, `group`, `cron`, `hook`,
`node`), `label` exact, `agentId` exact, texte de recherche ou récence
(`activeMinutes`). Lorsque vous avez besoin d'un tri de type boîte de réception, il peut également demander un titre
dérivé délimité par la visibilité, un extrait d'aperçu du dernier message ou des messages
récents bornés sur chaque ligne. Les titres dérivés et les aperçus sont produits uniquement pour les sessions
que l'appelant peut déjà voir en vertu de la stratégie de visibilité des outils de session configurée, de sorte que
les sessions non liées restent masquées. Lorsque la visibilité est restreinte, `sessions_list`
renvoie des métadonnées `visibility` optionnelles indiquant le mode effectif et un avertissement selon lequel
les résultats peuvent être limités par la portée.

`sessions_history` récupère la transcription de la conversation pour une session spécifique.
Par défaut, les résultats des outils sont exclus -- passez `includeTools: true` pour les voir.
La vue renvoyée est intentionnellement bornée et filtrée pour la sécurité :

- le texte de l'assistant est normalisé avant le rappel :
  - les balises de réflexion sont supprimées
  - les blocs d'échafaudage `<relevant-memories>` / `<relevant_memories>` sont supprimés
  - les blocs de payload XML d'appel d'outil en texte brut tels que `<tool_call>...</tool_call>`,
    `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>` et
    `<function_calls>...</function_calls>` sont supprimés, y compris les payloads
    tronqués qui ne se ferment jamais proprement
  - l'échafaudage d'appel/résultat d'outil rétrogradé tel que `[Tool Call: ...]`,
    `[Tool Result ...]` et `[Historical context ...]` est supprimé
  - les jetons de contrôle de modèle fuyants tels que `<|assistant|>`, d'autres jetons
    ASCII `<|...|>` et les variantes de pleine chasse `<｜...｜>` sont supprimés
  - les XML d'appel d'outil MiniMax malformés tels que `<invoke ...>` /
    `</minimax:tool_call>` sont supprimés
- le texte de type identifiant/jeton est rédigé avant d'être renvoyé
- les blocs de texte long sont tronqués
- les historiques très volumineux peuvent supprimer les anciennes lignes ou remplacer une ligne trop
  grande par `[sessions_history omitted: message too large]`
- l'outil signale des indicateurs résumés tels que `truncated`, `droppedMessages`,
  `contentTruncated`, `contentRedacted` et `bytes`

Les deux outils acceptent soit une **clé de session** (comme `"main"`) soit un **ID de session**
provenant d'un appel de liste précédent.

Si vous avez besoin de la transcription exacte octet par octet, inspectez le fichier de transcription sur
le disque au lieu de traiter `sessions_history` comme une vidange brute.

## Envoi de messages inter-sessions

`sessions_send` envoie un message à une autre session et attend facultativement la
réponse :

- **Tirer-et-oublier (Fire-and-forget) :** définissez `timeoutSeconds: 0` pour mettre en file d'attente et revenir
  immédiatement.
- **Attendre la réponse :** définissez un délai d'attente et obtenez la réponse en ligne.

Les sessions de chat délimitées par un fil, telles que les clés Slack ou Discord se terminant par
`:thread:<id>`, ne sont pas des cibles `sessions_send` valides. Utilisez la clé de session du canal parent
pour la coordination inter-agents afin que les messages routés par l'outil n'apparaissent pas
à l'intérieur d'un fil actif orienté humain.

Les messages et les réponses de suivi A2A sont marqués comme données inter-sessions dans le
prompt de réception (`[Inter-session message ... isUser=false]`) et dans la provenance de la transcription. L'agent récepteur doit les traiter comme des données routées par l'outil, et non comme une
instruction directe rédigée par l'utilisateur final.

Après que la cible a répondu, OpenClaw peut exécuter une **boucle de retour de réponse** où les
agents alternent les messages (jusqu'à `session.agentToAgent.maxPingPongTurns`, plage
0-20, par défaut 5). L'agent cible peut répondre
`REPLY_SKIP` pour arrêter tôt.

## Assistants d'état et d'orchestration

`session_status` est l'outil léger équivalent à `/status` pour la session
actuelle ou une autre session visible. Il signale l'utilisation, l'heure, l'état du modèle/d'exécution et
le contexte de la tâche d'arrière-plan lié lorsqu'il est présent. Comme `/status`, il peut remplir
les compteurs de jetons/cache épars à partir de la dernière entrée d'utilisation de la transcription, et
`model=default` efface une substitution par session. Utilisez `sessionKey="current"` pour
la session actuelle de l'appelant ; les étiquettes de client visibles telles que `openclaw-tui` ne
sont pas des clés de session.

Lorsque les métadonnées de route sont disponibles, `session_status` inclut également un bloc JSON visible `Route context` et des champs structurés `details` correspondants. Ces champs distinguent la clé de session de la route qui gère actuellement l'exécution en direct :

- `origin` est l'endroit où la session a été créée, ou le provider déduit d'un préfixe de clé de session livrable lorsque l'ancien état manque de métadonnées d'origine stockées.
- `active` est la route d'exécution en direct actuelle. Elle n'est signalée que pour la session en direct ou actuelle en cours de traitement.
- `deliveryContext` est la route de livraison persistante stockée sur la session, qu'OpenClaw peut réutiliser pour une livraison ultérieure même lorsque la surface active diffère.

`sessions_yield` termine intentionnellement le tour actuel afin que le message suivant puisse être l'événement de suivi que vous attendez. Utilisez-le après avoir généré des sous-agents lorsque vous voulez que les résultats d'achèvement arrivent comme le message suivant au lieu de construire des boucles de sondage.

`subagents` est l'assistant de visibilité pour les sous-agents OpenClaw déjà générés. Il prend en charge `action: "list"` pour inspecter les exécutions actuelles/récentes.

## Génération de sous-agents

`sessions_spawn` crée une session isolée pour une tâche d'arrière-plan par défaut. Il est toujours non bloquant -- il retourne immédiatement un `runId` et un `childSessionKey`. Les exécutions natives de sous-agents reçoivent la tâche déléguée dans le premier message visible `[Subagent Task]` de la session enfant, tandis que le prompt système ne contient que les règles d'exécution du sous-agent et le contexte de routage.

Options clés :

- `runtime: "subagent"` (par défaut) ou `"acp"` pour les agents de harnais externe.
- `model` et `thinking` des remplacements pour la session enfant.
- `thread: true` pour lier la génération à un fil de discussion (Discord, Slack, etc.).
- `sandbox: "require"` pour appliquer le sandboxing sur l'enfant.
- `context: "fork"` pour les sous-agents natifs lorsque l'enfant a besoin de la
  transcription du demandeur actuel ; omettez-le ou utilisez `context: "isolated"` pour un enfant propre.
  Les sous-agents natifs liés au fil s'initialisent par défaut à `context: "fork"`, sauf si
  `threadBindings.defaultSpawnContext` indique le contraire.

Les sous-agents feuille par défaut n'obtiennent pas d'outils de session. Lorsque
`maxSpawnDepth >= 2`, les sous-agents orchestrateurs de profondeur 1 reçoivent en outre
`sessions_spawn`, `subagents`, `sessions_list` et `sessions_history` afin qu'ils
puissent gérer leurs propres enfants. Les exécutions feuille n'obtiennent toujours pas d'outils d'orchestration
récursifs.

Après achèvement, une étape d'annonce publie le résultat sur le canal du demandeur.
La livraison de l'achèvement préserve le routage lié au fil/sujet lorsque disponible, et si
l'origine de l'achèvement identifie uniquement un canal, OpenClaw peut toujours réutiliser la
route stockée de la session du demandeur (`lastChannel` / `lastTo`) pour une livraison
directe.

Pour un comportement spécifique à l'ACP, voir [ACP Agents](/fr/tools/acp-agents).

## Visibilité

Les outils de session sont délimités pour limiter ce que l'agent peut voir :

| Niveau  | Portée                                          |
| ------- | ----------------------------------------------- |
| `self`  | Uniquement la session actuelle                  |
| `tree`  | Session actuelle + sous-agents générés          |
| `agent` | Toutes les sessions pour cet agent              |
| `all`   | Toutes les sessions (inter-agents si configuré) |

La valeur par défaut est `tree`. Les sessions sandbox sont limitées à `tree` quelle que soit la
configuration.

## Pour aller plus loin

- [Session Management](/fr/concepts/session) -- routage, cycle de vie, maintenance
- [ACP Agents](/fr/tools/acp-agents) -- génération de harnais externe
- [Multi-agent](/fr/concepts/multi-agent) -- architecture multi-agents
- [Gateway Configuration](/fr/gateway/configuration) -- paramètres de configuration des outils de session

## Connexes

- [Session management](/fr/concepts/session)
- [Session pruning](/fr/concepts/session-pruning)
