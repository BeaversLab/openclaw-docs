---
summary: "Sous-agents : génération d'exécutions d'agent isolées qui annoncent les résultats au chat demandeur"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sous-agents"
---

# Sous-agents

Les sous-agents sont des exécutions d'agent en arrière-plan lancées à partir d'une exécution d'agent existante. Ils s'exécutent dans leur propre session (`agent:<agentId>:subagent:<uuid>`) et, une fois terminés, **annoncent** leur résultat au channel de discussion demandeur. Chaque exécution de sous-agent est suivie comme une [tâche d'arrière-plan](/fr/automation/tasks).

## Commande slash

Utilisez `/subagents` pour inspecter ou contrôler les exécutions de sous-agents pour la **session actuelle** :

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

Contrôles de liaison de fil :

Ces commandes fonctionnent sur les channels qui prennent en charge les liaisons de fil persistantes. Voir **Channels prenant en charge les fils** ci-dessous.

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` affiche les métadonnées d'exécution (statut, horodatages, id de session, chemin du transcript, nettoyage).
Utilisez `sessions_history` pour une vue de rappel bornée et filtrée par sécurité ; inspectez le
chemin du transcript sur le disque lorsque vous avez besoin du transcript intégral brut.

### Comportement de génération

`/subagents spawn` démarre un sous-agent en arrière-plan en tant que commande utilisateur, et non en tant que relais interne, et il envoie une mise à jour finale d'achèvement au channel demandeur lorsque l'exécution se termine.

- La commande de génération est non bloquante ; elle renvoie immédiatement un id d'exécution.
- Lors de l'achèvement, le sous-agent annonce un message de résumé/résultat au channel de chat demandeur.
- L'achèvement est basé sur le push (push-based). Une fois lancé, n'interrogez pas `/subagents list`,
  `sessions_list`, ou `sessions_history` en boucle juste pour attendre qu'il
  se termine ; inspectez le statut uniquement à la demande pour le débogage ou l'intervention.
- Lors de l'achèvement, OpenClaw fait de son mieux pour fermer les onglets/processus de navigateur suivis ouverts par cette session de sous-agent avant que le flux de nettoyage de l'annonce ne se poursuive.
- Pour les lancements manuels, la livraison est résiliente :
  - OpenClaw essaie d'abord la livraison directe `agent` avec une clé d'idempotence stable.
  - Si la livraison directe échoue, elle revient au routage par file d'attente.
  - Si le routage par file d'attente n'est toujours pas disponible, l'annonce est réessayée avec un court délai exponentiel avant l'abandon final.
- La livraison de l'achèvement conserve la route demandeur résolue :
  - les routes d'achèvement liées au fil ou à la conversation l'emportent lorsqu'elles sont disponibles
  - si l'origine de l'achèvement fournit uniquement un channel, OpenClaw remplit la cible/le compte manquant à partir de la route résolue de la session du demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe fonctionne toujours
- Le transfert de l'achèvement vers la session du demandeur est un contexte interne généré à l'exécution (et non du texte rédigé par l'utilisateur) et inclut :
  - `Result` (dernier texte de réponse `assistant` visible, sinon dernier texte tool/toolResult nettoyé ; les exécutions ayant échoué de manière terminale ne réutilisent pas le texte de réponse capturé)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - statistiques compactes d'exécution/jetons
  - une instruction de livraison indiquant à l'agent demandeur de réécrire avec une voix d'assistant normale (ne pas transférer de métadonnées internes brutes)
- `--model` et `--thinking` remplacent les valeurs par défaut pour cette exécution spécifique.
- Utilisez `info`/`log` pour inspecter les détails et la sortie après achèvement.
- `/subagents spawn` est le mode à tir unique (`mode: "run"`). Pour les sessions persistantes liées aux fils, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
- Pour les sessions de harnais ACP (Codex, Claude Code, Gemini CLI), utilisez `sessions_spawn` avec `runtime: "acp"` et consultez [ACP Agents](/fr/tools/acp-agents), en particulier le [modèle de livraison ACP](/fr/tools/acp-agents#delivery-model) lors du débogage des complétions ou des boucles agent-à-agent.

Objectifs principaux :

- Paralléliser les travaux de « recherche / tâche longue / tool lent » sans bloquer l'exécution principale.
- Garder les sous-agents isolés par défaut (séparation de session + sandboxing optionnel).
- Rendre la surface des tools difficile à utiliser de manière abusive : les sous-agents ne reçoivent **pas** les tools de session par défaut.
- Prendre en charge une profondeur d'imbrication configurable pour les modèles d'orchestrateur.

Note de coût : chaque sous-agent a son **propre** contexte et sa propre utilisation de jetons. Pour les tâches lourdes ou répétitives,
définissez un model moins coûteux pour les sous-agents et gardez votre agent principal sur un model de meilleure qualité.
Vous pouvez configurer cela via `agents.defaults.subagents.model` ou des remplacements par agent.

## Tool

Utilisez `sessions_spawn` :

- Lance une exécution de sous-agent (`deliver: false`, voie globale : `subagent`)
- Exécute ensuite une étape d'annonce et publie la réponse d'annonce dans le channel de chat demandeur
- Model par défaut : hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.model` (ou `agents.list[].subagents.model` par agent) ; un `sessions_spawn.model` explicite l'emporte toujours.
- Réflexion (thinking) par défaut : hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.thinking` (ou `agents.list[].subagents.thinking` par agent) ; un `sessions_spawn.thinking` explicite l'emporte toujours.
- Délai d'exécution par défaut : si `sessions_spawn.runTimeoutSeconds` est omis, OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` s'il est défini ; sinon, il revient à `0` (pas de délai).

Paramètres de l'outil :

- `task` (requis)
- `label?` (facultatif)
- `agentId?` (facultatif ; générer sous un autre identifiant d'agent si autorisé)
- `model?` (facultatif ; remplace le modèle du sous-agent ; les valeurs non valides sont ignorées et le sous-agent s'exécute sur le modèle par défaut avec un avertissement dans le résultat de l'outil)
- `thinking?` (facultatif ; remplace le niveau de réflexion pour l'exécution du sous-agent)
- `runTimeoutSeconds?` (par défaut `agents.defaults.subagents.runTimeoutSeconds` si défini, sinon `0` ; lorsqu'il est défini, l'exécution du sous-agent est abandonnée après N secondes)
- `thread?` (par défaut `false` ; lorsque `true`, demande une liaison de thread de channel pour cette session de sous-agent)
- `mode?` (`run|session`)
  - la valeur par défaut est `run`
  - si `thread: true` et `mode` sont omis, la valeur par défaut devient `session`
  - `mode: "session"` nécessite `thread: true`
- `cleanup?` (`delete|keep`, par défaut `keep`)
- `sandbox?` (`inherit|require`, par défaut `inherit` ; `require` rejette la génération sauf si l'environnement d'exécution enfant cible est sandboxé)
- `sessions_spawn` n'accepte **pas** les paramètres de livraison au channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Pour la livraison, utilisez `message`/`sessions_send` depuis l'exécution générée.

## Sessions liées aux threads

Lorsque les liaisons de thread sont activées pour un channel, un sous-agent peut rester lié à un thread afin que les messages de suivi des utilisateurs dans ce thread continuent d'être acheminés vers la même session de sous-agent.

### Canaux prenant en charge les fils

- Discord (actuellement le seul canal pris en charge) : prend en charge les sessions de sous-agent liées aux fils persistants (`sessions_spawn` avec `thread: true`), les contrôles manuels de fils (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) et les clés d'adaptateur `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours` et `channels.discord.threadBindings.spawnSubagentSessions`.

Flux rapide :

1. Générer avec `sessions_spawn` en utilisant `thread: true` (et facultativement `mode: "session"`).
2. OpenClaw crée ou lie un fil à cette cible de session dans le canal actif.
3. Les réponses et les messages de suivi dans ce fil sont acheminés vers la session liée.
4. Utilisez `/session idle` pour inspecter/mettre à jour la perte de focus automatique due à l'inactivité et `/session max-age` pour contrôler la limite stricte.
5. Utilisez `/unfocus` pour détacher manuellement.

Contrôles manuels :

- `/focus <target>` lie le fil actuel (ou en crée un) à une cible de sous-agent/session.
- `/unfocus` supprime la liaison pour le fil lié actuel.
- `/agents` liste les exécutions actives et l'état de liaison (`thread:<id>` ou `unbound`).
- `/session idle` et `/session max-age` ne fonctionnent que pour les fils liés ayant le focus.

Commutateurs de configuration :

- Défaut global : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`
- La substitution de canal et les clés de liaison automatique de génération sont spécifiques à l'adaptateur. Voir **Canaux prenant en charge les fils** ci-dessus.

Consultez [Référence de configuration](/fr/gateway/configuration-reference) et [Commandes slash](/fr/tools/slash-commands) pour les détails actuels de l'adaptateur.

Liste blanche :

- `agents.list[].subagents.allowAgents` : liste des ID d'agents qui peuvent être ciblés via `agentId` (`["*"]` pour autoriser tout). Par défaut : uniquement l'agent demandeur.
- `agents.defaults.subagents.allowAgents` : liste d'autorisation de l'agent cible par défaut utilisée lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents`.
- Garantie d'héritage du bac à sable (Sandbox) : si la session du demandeur est isolée (sandboxed), `sessions_spawn` rejette les cibles qui s'exécuteraient sans isolation.
- `agents.defaults.subagents.requireAgentId` / `agents.list[].subagents.requireAgentId` : si true, bloque les appels `sessions_spawn` qui omettent `agentId` (force une sélection explicite de profil). Par défaut : false.

Découverte :

- Utilisez `agents_list` pour voir quels identifiants d'agents sont actuellement autorisés pour `sessions_spawn`.

Archivage automatique :

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut : 60).
- L'archivage utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via le renommage).
- L'archivage automatique est au mieux effort ; les minuteries en attente sont perdues si la passerelle redémarre.
- `runTimeoutSeconds` n'archive **pas** automatiquement ; il arrête seulement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archivage automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.
- Le nettoyage du navigateur est distinct du nettoyage de l'archive : les onglets/processus de navigateur suivis sont fermés au mieux lorsque l'exécution se termine, même si l'enregistrement de la transcription/session est conservé.

## Sous-agents imbriqués

Par défaut, les sous-agents ne peuvent pas créer leurs propres sous-agents (`maxSpawnDepth: 1`). Vous pouvez activer un niveau d'imbrication en définissant `maxSpawnDepth: 2`, ce qui permet le **modèle d'orchestrateur** : principal → sous-agent orchestrateur → sous-sous-agents travailleurs.

### Comment activer

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
      },
    },
  },
}
```

### Niveaux de profondeur

| Profondeur | Forme de la clé de session                   | Rôle                                                 | Peut créer ?                      |
| ---------- | -------------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| 0          | `agent:<id>:main`                            | Agent principal                                      | Toujours                          |
| 1          | `agent:<id>:subagent:<uuid>`                 | Sous-agent (orchestrateur si profondeur 2 autorisée) | Seulement si `maxSpawnDepth >= 2` |
| 2          | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sous-sous-agent (travailleur feuille)                | Jamais                            |

### Chaîne d'annonce

Les résultats remontent la chaîne :

1. Le travailleur de profondeur 2 se termine → annonce à son parent (orchestrateur de profondeur 1)
2. L'orchestrateur de profondeur 1 reçoit l'annonce, synthétise les résultats, se termine → annonce au principal
3. L'agent principal reçoit l'annonce et la transmet à l'utilisateur

Chaque niveau ne voit que les annonces de ses enfants directs.

Directives opérationnelles :

- Lancez le travail enfant une fois et attendez les événements de fin au lieu de construire des boucles de polling autour des commandes `sessions_list`, `sessions_history`, `/subagents list` ou `exec` de mise en veille.
- Si un événement de fin d'enfant arrive après avoir déjà envoyé la réponse finale, le suivi correct est le jeton silencieux exact `NO_REPLY` / `no_reply`.

### Stratégie d'outil par profondeur

- Le rôle et la portée de contrôle sont écrits dans les métadonnées de session au moment du lancement. Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`)** : Obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` pour pouvoir gérer ses enfants. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, quand `maxSpawnDepth == 1`)** : Aucun outil de session (comportement actuel par défaut).
- **Profondeur 2 (travailleur feuille)** : Aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Ne peut pas lancer d'autres enfants.

### Limite de lancement par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent` (par défaut : 5) enfants actifs à la fois. Cela empêche une dispersion excessive d'un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se propage à leurs enfants de profondeur 2.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.
- `/subagents kill all` arrête tous les sous-agents pour le demandeur et se propage.

## Authentification

L'authentification du sous-agent est résolue par **id d'agent**, et non par type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé à partir du `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **secours** ; les profils d'agent prévalent sur les profils principaux en cas de conflit.

Remarque : la fusion est additive, donc les profils principaux sont toujours disponibles comme secours. Une authentification totalement isolée par agent n'est pas encore prise en charge.

## Annonce

Les sous-agents rapportent les résultats via une étape d'annonce :

- L'étape d'annonce s'exécute dans la session du sous-agent (et non dans la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Si le dernier texte de l'assistant est le jeton silencieux exact `NO_REPLY` / `no_reply`,
  la sortie de l'annonce est supprimée même s'il y avait une progression visible précédente.
- Sinon, la livraison dépend de la profondeur du demandeur :
  - les sessions de demandeur de premier niveau utilisent un appel de suivi `agent` avec une livraison externe (`deliver=true`)
  - les sessions de sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants dans la session
  - si une session de sous-agent demandeur imbriqué a disparu, OpenClaw revient au demandeur de cette session si disponible
- Pour les sessions de demandeur de premier niveau, la livraison directe en mode completion résout d'abord toute route de conversation/fil liée et le remplacement de hook, puis remplit les champs manquants de la cible du channel à partir de la route stockée de la session du demandeur. Cela permet de garder les complétions sur le bon chat/sujet même lorsque l'origine de la complétion n'identifie que le channel.
- L'agrégation des complétions enfants est limitée à l'exécution du demandeur actuel lors de la construction des résultats de complétion imbriqués, empêchant les sorties enfants obsolètes de l'exécution précédente de fuir dans l'annonce actuelle.
- Les réponses d'annonce préservent le routage fil/sujet lorsqu'il est disponible sur les adaptateurs de channel.
- Le contexte d'annonce est normalisé en un bloc d'événement interne stable :
  - source (`subagent` ou `cron`)
  - clé/id de la session enfant
  - type d'annonce + libellé de la tâche
  - ligne d'état dérivée du résultat de l'exécution (`success`, `error`, `timeout` ou `unknown`)
  - contenu du résultat sélectionné à partir du dernier texte d'assistant visible, sinon dernier texte tool/toolResult nettoyé ; les exécutions ayant échoué de manière terminale signalent l'état d'échec sans rejouer le texte de réponse capturé
  - une instruction de suivi décrivant quand répondre ou rester silencieux
- `Status` n'est pas déduit de la sortie du modèle ; il provient de signaux de résultat d'exécution.
- En cas de timeout, si l'enfant n'a passé que des appels d'outils, l'annonce peut réduire cet historique en un bref résumé de progrès partiel au lieu de rejouer la sortie brute de l'outil.

Les charges utiles d'annonce incluent une ligne de statistiques à la fin (même lorsqu'elles sont encapsulées) :

- Durée d'exécution (ex. `runtime 5m12s`)
- Utilisation de jetons (entrée/sortie/total)
- Coût estimé lorsque la tarification du modèle est configurée (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId`, et le chemin de la transcription (afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur le disque)
- Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses destinées à l'utilisateur doivent être réécrites avec la voix normale de l'assistant.

`sessions_history` est le chemin d'orchestration le plus sûr :

- la mémoire de l'assistant est d'abord normalisée :
  - les balises de réflexion sont supprimées
  - les blocs d'échafaudage `<relevant-memories>` / `<relevant_memories>` sont supprimés
  - les blocs de charges utiles XML d'appels d'outils en texte brut tels que `<tool_call>...</tool_call>`,
    `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>` et
    `<function_calls>...</function_calls>` sont supprimés, y compris les charges utiles
    tronquées qui ne se ferment jamais proprement
  - l'échafaudage rétrogradé d'appel/résultat d'outil et les marqueurs de contexte historique sont supprimés
  - les jetons de contrôle de modèle fuits tels que `<|assistant|>`, d'autres jetons
    ASCII `<|...|>` et les variantes pleine largeur `<｜...｜>` sont supprimés
  - les XML d'appels d'outils MiniMax malformés sont supprimés
- le texte de type identifiant/jeton est masqué
- les longs blocs peuvent être tronqués
- les très grands historiques peuvent supprimer les anciennes lignes ou remplacer une ligne trop volumineuse par
  `[sessions_history omitted: message too large]`
- l'inspection brute de la transcription sur disque est la solution de repli lorsque vous avez besoin de la transcription complète octet par octet

## Stratégie d'outils (outils de sous-agent)

Par défaut, les sous-agents reçoivent **tous les outils sauf les outils de session** et les outils système :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` reste ici aussi une vue de rappel bornée et nettoyée ; il ne s'agit pas
d'un vidage brut de transcription.

Lorsque `maxSpawnDepth >= 2`, les sous-agents orchestrateurs de profondeur 1 reçoivent également `sessions_spawn`, `subagents`, `sessions_list` et `sessions_history` afin qu'ils puissent gérer leurs enfants.

Remplacer via la configuration :

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

## Simultanéité

Les sous-agents utilisent une file d'attente dédiée dans le processus :

- Nom de la file : `subagent`
- Simultanéité : `agents.defaults.subagents.maxConcurrent` (défaut `8`)

## Arrêt

- Envoyer `/stop` dans le chat demandeur abandonne la session du demandeur et arrête toutes les exécutions de sous-agents actives lancées à partir de celle-ci, en cascade vers les enfants imbriqués.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.

## Limitations

- L'annonce du sous-agent est effectuée sur la base du **meilleur effort**. Si la passerelle redémarre, le travail d'« annonce en retour » en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md` + `TOOLS.md` (pas de `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` ou `BOOTSTRAP.md`).
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'utilisation.
- `maxChildrenPerAgent` limite le nombre d'enfants actifs par session (défaut : 5, plage : 1–20).
