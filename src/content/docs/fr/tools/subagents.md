---
summary: "Sous-agents : génération d'exécutions d'agent isolées qui annoncent les résultats au chat demandeur"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sous-agents"
---

# Sous-agents

Les sous-agents sont des exécutions d'agent en arrière-plan générées à partir d'une exécution d'agent existante. Ils s'exécutent dans leur propre session (`agent:<agentId>:subagent:<uuid>`) et, une fois terminés, **annoncent** leur résultat au canal de discussion demandeur. Chaque exécution de sous-agent est suivie comme une [tâche d'arrière-plan](/en/automation/tasks).

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

`/subagents info` affiche les métadonnées de l'exécution (statut, horodatages, id de session, chemin de la transcription, nettoyage).

### Comportement de génération

`/subagents spawn` lance un sous-agent en arrière-plan en tant que commande utilisateur, et non en tant que relais interne, et envoie une mise à jour finale d'achèvement au chat demandeur lorsque l'exécution est terminée.

- La commande de génération est non bloquante ; elle renvoie immédiatement un id d'exécution.
- Lors de l'achèvement, le sous-agent annonce un message de résumé/résultat au channel de chat demandeur.
- Pour les générations manuelles, la livraison est résiliente :
  - OpenClaw essaie d'abord la livraison directe `agent` avec une clé d'idempotence stable.
  - Si la livraison directe échoue, elle revient au routage par file d'attente.
  - Si le routage par file d'attente n'est toujours pas disponible, l'annonce est réessayée avec un court délai exponentiel avant l'abandon final.
- La transmission de la complétion à la session demanderesse est un contexte interne généré à l'exécution (et non un texte rédigé par l'utilisateur) et comprend :
  - `Result` (texte de réponse `assistant`, ou dernier `toolResult` si la réponse de l'assistant est vide)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - statistiques compactes d'exécution/jetons
  - une instruction de livraison indiquant à l'agent demandeur de réécrire avec la voix normale de l'assistant (et non de transmettre des métadonnées internes brutes)
- `--model` et `--thinking` remplacent les valeurs par défaut pour cette exécution spécifique.
- Utilisez `info`/`log` pour inspecter les détails et la sortie après la fin de l'exécution.
- `/subagents spawn` est le mode ponctuel (`mode: "run"`). Pour les sessions persistantes liées aux fils, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
- Pour les sessions de harnais ACP (Codex, Claude Code, Gemini CLI), utilisez `sessions_spawn` avec `runtime: "acp"` et consultez [ACP Agents](/en/tools/acp-agents).

Objectifs principaux :

- Paralléliser les travaux de "recherche / tâche longue / outil lent" sans bloquer l'exécution principale.
- Garder les sous-agents isolés par défaut (séparation des sessions + sandboxing optionnel).
- Rendre la surface d'outil difficile à mauvaise utilisation : les sous-agents n'obtiennent **pas** les outils de session par défaut.
- Prendre en charge une profondeur d'imbrication configurable pour les modèles d'orchestrateur.

Note sur les coûts : chaque sous-agent possède son **propre** contexte et sa propre utilisation de jetons. Pour les tâches lourdes ou répétitives,
définissez un modèle moins coûteux pour les sous-agents et gardez votre agent principal sur un modèle de meilleure qualité.
Vous pouvez configurer cela via `agents.defaults.subagents.model` ou des redéfinitions par agent.

## Outil

Utilisez `sessions_spawn` :

- Lance une exécution de sous-agent (`deliver: false`, voie globale : `subagent`)
- Exécute ensuite une étape d'annonce et publie la réponse d'annonce sur le channel de chat demandeur
- Modèle par défaut : hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.model` (ou par agent `agents.list[].subagents.model`) ; un `sessions_spawn.model` explicite l'emporte toujours.
- Réflexion par défaut : hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.thinking` (ou par agent `agents.list[].subagents.thinking`) ; un `sessions_spawn.thinking` explicite l'emporte toujours.
- Délai d'exécution par défaut : si `sessions_spawn.runTimeoutSeconds` est omis, OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` si défini ; sinon il revient à `0` (pas de délai).

Paramètres de l'outil :

- `task` (requis)
- `label?` (facultatif)
- `agentId?` (facultatif ; générer sous un autre id d'agent si autorisé)
- `model?` (facultatif ; remplace le modèle du sous-agent ; les valeurs invalides sont ignorées et le sous-agent s'exécute sur le modèle par défaut avec un avertissement dans le résultat de l'outil)
- `thinking?` (facultatif ; remplace le niveau de réflexion pour l'exécution du sous-agent)
- `runTimeoutSeconds?` (par défaut `agents.defaults.subagents.runTimeoutSeconds` si défini, sinon `0` ; si défini, l'exécution du sous-agent est abandonnée après N secondes)
- `thread?` (défaut `false` ; quand `true`, demande la liaison de thread de channel pour cette session de sous-agent)
- `mode?` (`run|session`)
  - la valeur par défaut est `run`
  - si `thread: true` et `mode` omis, la valeur par défaut devient `session`
  - `mode: "session"` nécessite `thread: true`
- `cleanup?` (`delete|keep`, défaut `keep`)
- `sandbox?` (`inherit|require`, par défaut `inherit` ; `require` rejette le spawn sauf si l'environnement d'exécution enfant ciblé est sandboxed)
- `sessions_spawn` n'accepte **pas** les paramètres de livraison par channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Pour la livraison, utilisez `message`/`sessions_send` depuis l'exécution lancée.

## Sessions liées aux threads

Lorsque les liaisons de thread sont activées pour un channel, un sous-agent peut rester lié à un thread afin que les messages de suivi de l'utilisateur dans ce thread continuent d'être acheminés vers la même session de sous-agent.

### Channels prenant en charge les threads

- Discord (actuellement le seul channel pris en charge) : prend en charge les sessions persistantes de sous-agents liées aux threads (`sessions_spawn` avec `thread: true`), les contrôles manuels de thread (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`), et les clés d'adaptateur `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours` et `channels.discord.threadBindings.spawnSubagentSessions`.

Flux rapide :

1. Lancer avec `sessions_spawn` en utilisant `thread: true` (et optionnellement `mode: "session"`).
2. OpenClaw crée ou lie un thread à cette cible de session dans le channel actif.
3. Les réponses et les messages de suivi dans ce thread sont acheminés vers la session liée.
4. Utilisez `/session idle` pour inspecter/mettre à jour l'auto-désactivation par inactivité et `/session max-age` pour contrôler la limite stricte.
5. Utilisez `/unfocus` pour détacher manuellement.

Contrôles manuels :

- `/focus <target>` lie le thread actuel (ou en crée un) à une cible de sous-agent/session.
- `/unfocus` supprime la liaison pour le thread lié actuel.
- `/agents` liste les exécutions actives et l'état de liaison (`thread:<id>` ou `unbound`).
- `/session idle` et `/session max-age` ne fonctionnent que pour les fils liés focalisés.

Commutateurs de configuration :

- Par défaut global : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`
- La priorité du canal et les clés de liaison automatique de génération sont spécifiques à l'adaptateur. Voir **Canaux supportant les fils** ci-dessus.

Consultez [Référence de configuration](/en/gateway/configuration-reference) et [Commandes slash](/en/tools/slash-commands) pour les détails actuels de l'adaptateur.

Liste d'autorisation :

- `agents.list[].subagents.allowAgents` : liste des IDs d'agents qui peuvent être ciblés via `agentId` (`["*"]` pour tout autoriser). Par défaut : uniquement l'agent demandeur.
- Garde d'héritage du bac à sable : si la session demandeur est sandboxée, `sessions_spawn` rejette les cibles qui s'exécuteraient sans bac à sable.
- `agents.defaults.subagents.requireAgentId` / `agents.list[].subagents.requireAgentId` : si vrai, bloque les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil). Par défaut : false.

Discovery :

- Utilisez `agents_list` pour voir quels identifiants d'agent sont actuellement autorisés pour `sessions_spawn`.

Archivage automatique :

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut : 60).
- L'archivage utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via le renommage).
- L'archivage automatique est de type « best-effort » ; les minuteurs en attente sont perdus si la passerelle redémarre.
- `runTimeoutSeconds` n'archive **pas** automatiquement ; il arrête seulement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archivage automatique s'applique également aux sessions de profondeur 1 et de profondeur 2.

## Sous-agents imbriqués

Par défaut, les sous-agents ne peuvent pas générer leurs propres sous-agents (`maxSpawnDepth: 1`). Vous pouvez activer un niveau d'imbrication en définissant `maxSpawnDepth: 2`, ce qui permet le **modèle d'orchestrateur** : principal → sous-agent orchestrateur → sous-sous-agents workers.

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

| Profondeur | Forme de la clé de session                   | Rôle                                                             | Peut générer ?                    |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------- | --------------------------------- |
| 0          | `agent:<id>:main`                            | Agent principal                                                  | Toujours                          |
| 1          | `agent:<id>:subagent:<uuid>`                 | Sous-agent (orchestrateur lorsque la profondeur 2 est autorisée) | Seulement si `maxSpawnDepth >= 2` |
| 2          | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sous-sous-agent (feuille de travail)                             | Jamais                            |

### Chaîne d'annonces

Les résultats remontent la chaîne :

1. Le travailleur de profondeur 2 se termine → annonce à son parent (orchestrateur de profondeur 1)
2. L'orchestrateur de profondeur 1 reçoit l'annonce, synthétise les résultats, se termine → annonce au principal
3. L'agent principal reçoit l'annonce et la transmet à l'utilisateur

Chaque niveau ne voit que les annonces de ses enfants directs.

### Stratégie d'outils par profondeur

- Le rôle et le périmètre de contrôle sont écrits dans les métadonnées de la session au moment de la création. Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`)** : Obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` pour qu'il puisse gérer ses enfants. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, quand `maxSpawnDepth == 1`)** : Aucun outil de session (comportement par défaut actuel).
- **Profondeur 2 (travailleur feuille)** : Aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Impossible de générer d'autres enfants.

### Limite de création par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent` (par défaut : 5) enfants actifs à la fois. Cela empêche une expansion incontrôlée à partir d'un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se propage à leurs enfants de profondeur 2.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.
- `/subagents kill all` arrête tous les sous-agents pour le demandeur et se propage.

## Authentification

L'auth du sous-agent est résolue par **id d'agent**, et non par type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'auth est chargé à partir des `agentDir` de cet agent.
- Les profils d'auth de l'agent principal sont fusionnés en tant que **solution de secours** ; les profils de l'agent priment sur les profils principaux en cas de conflit.

Remarque : la fusion est additive, donc les profils principaux sont toujours disponibles en solution de secours. Une auth entièrement isolée par agent n'est pas encore prise en charge.

## Annonce

Les sous-agents rapportent via une étape d'annonce :

- L'étape d'annonce s'exécute à l'intérieur de la session du sous-agent (pas la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Sinon, la livraison dépend de la profondeur du demandeur :
  - les sessions de demandeur de niveau supérieur utilisent un appel de suivi `agent` avec livraison externe (`deliver=true`)
  - les sessions de sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants en session
  - si une session de sous-agent demandeur imbriqué a disparu, OpenClaw se rabat sur le demandeur de cette session si disponible
- L'agrégation des achèvements enfants est limitée à l'exécution du demandeur actuel lors de la construction des résultats d'achèvement imbriqués, empêchant les sorties enfants périmées d'exécutions précédentes de fuir dans l'annonce actuelle.
- Les réponses d'annonce préservent le routage de fil/discussion lorsqu'il est disponible sur les adaptateurs de channel.
- Le contexte d'annonce est normalisé en un bloc d'événement interne stable :
  - source (`subagent` ou `cron`)
  - clé/id de session enfant
  - type d'annonce + libellé de tâche
  - ligne d'état dérivée du résultat de l'exécution (`success`, `error`, `timeout` ou `unknown`)
  - contenu du résultat de l'étape d'annonce (ou `(no output)` si manquant)
  - une instruction de suivi décrivant quand répondre ou rester silencieux
- `Status` n'est pas déduit de la sortie du modèle ; il provient des signaux de résultat de l'exécution.

Les charges utiles d'annonce incluent une ligne de statistiques à la fin (même lorsqu'elles sont enveloppées) :

- Durée d'exécution (ex. `runtime 5m12s`)
- Utilisation des jetons (entrée/sortie/total)
- Coût estimé lorsque la tarification du modèle est configurée (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId` et chemin de transcription (afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur disque)
- Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses orientées utilisateur doivent être réécrites avec la voix normale de l'assistant.

## Stratégie d'outils (outils de sous-agent)

Par défaut, les sous-agents obtiennent **tous les outils sauf les outils de session** et les outils système :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

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
- Simultanéité : `agents.defaults.subagents.maxConcurrent` (par défaut `8`)

## Arrêt

- L'envoi de `/stop` dans le chat du demandeur abandonne la session du demandeur et arrête toutes les exécutions de sous-agents actives lancées à partir de celle-ci, en cascade vers les enfants imbriqués.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.

## Limitations

- L'annonce des sous-agents est effectuée au **meilleur effort**. Si la passerelle redémarre, le travail d'annonce en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de la passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md` + `TOOLS.md` (pas de `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` ou `BOOTSTRAP.md`).
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'usage.
- `maxChildrenPerAgent` limite les enfants actifs par session (par défaut : 5, plage : 1–20).
