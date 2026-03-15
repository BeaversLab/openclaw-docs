---
summary: "Sous-agents : génération d'exécutions d'agent isolées qui annoncent les résultats au chat demandeur"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sous-agents"
---

# Sous-agents

Les sous-agents sont des exécutions d'agent en arrière-plan générées à partir d'une exécution d'agent existante. Ils s'exécutent dans leur propre session (`agent:<agentId>:subagent:<uuid>`) et, une fois terminés, **annoncent** leur résultat au channel de chat demandeur.

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
- Pour les sessions de harnais ACP (Codex, Claude Code, Gemini CLI), utilisez `sessions_spawn` avec `runtime: "acp"` et consultez [ACP Agents](/fr/tools/acp-agents).

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

Voir [Référence de configuration](/fr/gateway/configuration-reference) et [Commandes slash](/fr/tools/slash-commands) pour les détails actuels de l'adaptateur.

Liste d'autorisation :

- `agents.list[].subagents.allowAgents` : liste des IDs d'agents qui peuvent être ciblés via `agentId` (`["*"]` pour tout autoriser). Par défaut : uniquement l'agent demandeur.
- Garde d'héritage du bac à sable : si la session demandeur est sandboxée, `sessions_spawn` rejette les cibles qui s'exécuteraient sans bac à sable.

Discovery :

- Utilisez `agents_list` pour voir quels IDs d'agents sont actuellement autorisés pour `sessions_spawn`.

Archivage automatique :

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut : 60).
- L'archivage utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via renommage).
- L'archivage automatique est au meilleur effort ; les minuteurs en attente sont perdus si la passerelle redémarre.
- `runTimeoutSeconds` n'archive **pas** automatiquement ; il arrête seulement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archivage automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.

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

| Profondeur | Forme de la clé de session                   | Rôle                                                           | Peut créer ?                      |
| ---------- | -------------------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| 0          | `agent:<id>:main`                            | Agent principal                                                | Toujours                          |
| 1          | `agent:<id>:subagent:<uuid>`                 | Sous-agent (orchestrateur quand la profondeur 2 est autorisée) | Seulement si `maxSpawnDepth >= 2` |
| 2          | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sous-sous-agent (travailleur terminal)                         | Jamais                            |

### Chaîne d'annonces

Les résultats remontent la chaîne :

1. Le travailleur de profondeur-2 se termine → annonce à son parent (orchestrateur de profondeur-1)
2. L'orchestrateur de profondeur-1 reçoit l'annonce, synthétise les résultats, se termine → annonce au principal
3. L'agent principal reçoit l'annonce et la transmet à l'utilisateur

Chaque niveau ne voit que les annonces de ses enfants directs.

### Stratégie d'outil par profondeur

- Le rôle et le périmètre de contrôle sont écrits dans les métadonnées de session au moment de la création. Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`)** : Obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` pour qu'il puisse gérer ses enfants. Les autres outils de session/système restent refusés.
- **Profondeur 1 (terminal, quand `maxSpawnDepth == 1`)** : Aucun outil de session (comportement par défaut actuel).
- **Profondeur 2 (travailleur terminal)** : Aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Ne peut pas créer d'autres enfants.

### Limite de création par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent` (par défaut : 5) enfants actifs à la fois. Cela empêche une expansion incontrôlée à partir d'un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur-1 arrête automatiquement tous ses enfants de profondeur-2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se répercute en cascade sur leurs enfants de profondeur 2.
- `/subagents kill <id>` arrête un sous-agent spécifique et se répercute en cascade sur ses enfants.
- `/subagents kill all` arrête tous les sous-agents pour le demandeur et se répercute en cascade.

## Authentification

L'authentification du sous-agent est résolue par **agent id**, et non par type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé à partir du `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **fallback** ; les profils de l'agent prévalent sur les profils principaux en cas de conflit.

Remarque : la fusion est additive, les profils principaux sont donc toujours disponibles en tant que secours. Une authentification entièrement isolée par agent n'est pas encore prise en charge.

## Annoncer

Les sous-agents font rapport via une étape d'annonce :

- L'étape d'annonce s'exécute dans la session du sous-agent (et non dans la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est posté.
- Sinon, la livraison dépend de la profondeur du demandeur :
  - les sessions demandeur de premier niveau utilisent un appel de suivi `agent` avec livraison externe (`deliver=true`)
  - les sessions sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants en session
  - si une session sous-agent demandeur imbriquée a disparu, OpenClaw revient au demandeur de cette session si disponible
- L'agrégation de l'achèvement des enfants est limitée à l'exécution du demandeur actuel lors de la construction des résultats d'achèvement imbriqués, empêchant les sorties d'enfants périmées d'exécutions précédentes de fuir dans l'annonce actuelle.
- Les réponses d'annonce préservent le routage de fil/discussion lorsque disponible sur les adaptateurs de canal.
- Le contexte d'annonce est normalisé en un bloc d'événement interne stable :
  - source (`subagent` ou `cron`)
  - clé/id de session enfant
  - type d'annonce + étiquette de tâche
  - ligne d'état dérivée du résultat de l'exécution (`success`, `error`, `timeout` ou `unknown`)
  - contenu du résultat de l'étape d'annonce (ou `(no output)` si manquant)
  - une instruction de suivi décrivant quand répondre ou rester silencieux
- `Status` n'est pas déduit de la sortie du modèle ; il provient des signaux de résultat de l'exécution.

Les charges utiles d'annonce incluent une ligne de statistiques à la fin (même lorsqu'elles sont encapsulées) :

- Temps d'exécution (par exemple, `runtime 5m12s`)
- Utilisation des jetons (entrée/sortie/total)
- Coût estimé lorsque la tarification du modèle est configurée (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId` et le chemin de la transcription (afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur le disque)
- Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses destinées à l'utilisateur doivent être réécrites avec la voix normale de l'assistant.

## Stratégie d'outils (outils de sous-agent)

Par défaut, les sous-agents reçoivent **tous les outils sauf les outils de session** et les outils système :

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

Les sous-agents utilisent une file d'attente dédiée en processus :

- Nom de la file : `subagent`
- Simultanéité : `agents.defaults.subagents.maxConcurrent` (par défaut `8`)

## Arrêt

- L'envoi de `/stop` dans le chat du demandeur abandonne la session du demandeur et arrête toutes les exécutions de sous-agents actives lancées à partir de celle-ci, en cascade vers les enfants imbriqués.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.

## Limitations

- L'annonce de sous-agent est effectuée sur la base du **meilleur effort**. Si la passerelle redémarre, le travail d'"annonce en retour" en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md` + `TOOLS.md` (pas de `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` ou `BOOTSTRAP.md`).
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'utilisation.
- `maxChildrenPerAgent` limite le nombre d'enfants actifs par session (par défaut : 5, plage : 1–20).

import fr from '/components/footer/fr.mdx';

<fr />
