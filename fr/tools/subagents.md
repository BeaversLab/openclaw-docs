---
summary: "Sub-agents: spawning isolated agent runs that announce results back to the requester chat"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-Agents"
---

# Sub-agents

Sub-agents are background agent runs spawned from an existing agent run. They run in their own session (`agent:<agentId>:subagent:<uuid>`) and, when finished, **announce** their result back to the requester chat channel.

## Slash command

Use `/subagents` to inspect or control sub-agent runs for the **current session**:

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

Thread binding controls:

These commands work on channels that support persistent thread bindings. See **Thread supporting channels** below.

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` shows run metadata (status, timestamps, session id, transcript path, cleanup).

### Spawn behavior

`/subagents spawn` starts a background sub-agent as a user command, not an internal relay, and it sends one final completion update back to the requester chat when the run finishes.

- The spawn command is non-blocking; it returns a run id immediately.
- On completion, the sub-agent announces a summary/result message back to the requester chat channel.
- For manual spawns, delivery is resilient:
  - OpenClaw tries direct `agent` delivery first with a stable idempotency key.
  - If direct delivery fails, it falls back to queue routing.
  - If queue routing is still not available, the announce is retried with a short exponential backoff before final give-up.
- The completion handoff to the requester session is runtime-generated internal context (not user-authored text) and includes:
  - `Result` (`assistant` texte de réponse, ou dernier `toolResult` si la réponse de l'assistant est vide)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - statistiques d'exécution/jeton compactes
  - une instruction de livraison indiquant à l'agent demandeur de réécrire avec une voix normale d'assistant (ne pas transmettre de métadonnées internes brutes)
- `--model` et `--thinking` remplacent les valeurs par défaut pour cette exécution spécifique.
- Utilisez `info`/`log` pour inspecter les détails et la sortie après l'achèvement.
- `/subagents spawn` est le mode ponctuel (`mode: "run"`). Pour des sessions persistantes liées aux fils, utilisez `sessions_spawn` avec `thread: true` et `mode: "session"`.
- Pour les sessions de harnais ACP (Codex, Claude Code, Gemini CLI), utilisez `sessions_spawn` avec `runtime: "acp"` et consultez [ACP Agents](/fr/tools/acp-agents).

Objectifs principaux :

- Paralléliser le travail "recherche / longue tâche / tool lent" sans bloquer l'exécution principale.
- Garder les sous-agents isolés par défaut (séparation de session + sandboxing optionnel).
- Rendre la surface tool difficile à mauvaise utilisation : les sous-agents ne reçoivent **pas** les tools de session par défaut.
- Prendre en charge une profondeur d'imbrication configurable pour les modèles d'orchestrateur.

Note de coût : chaque sous-agent a son **propre** contexte et sa propre utilisation de jetons. Pour les tâches lourdes ou répétitives, définissez un model moins coûteux pour les sous-agents et gardez votre agent principal sur un model de meilleure qualité. Vous pouvez configurer cela via `agents.defaults.subagents.model` ou des remplacements par agent.

## Tool

Utilisez `sessions_spawn` :

- Démarre une exécution de sous-agent (`deliver: false`, voie globale : `subagent`)
- Exécute ensuite une étape d'annonce et publie la réponse d'annonce sur le channel de discussion demandeur
- Model par défaut : hérite de l'appelant sauf si vous définissez `agents.defaults.subagents.model` (ou `agents.list[].subagents.model` par agent) ; un `sessions_spawn.model` explicite l'emporte toujours.
- Default thinking: inherits the caller unless you set `agents.defaults.subagents.thinking` (or per-agent `agents.list[].subagents.thinking`); an explicit `sessions_spawn.thinking` still wins.
- Default run timeout: if `sessions_spawn.runTimeoutSeconds` is omitted, OpenClaw uses `agents.defaults.subagents.runTimeoutSeconds` when set; otherwise it falls back to `0` (no timeout).

Tool params:

- `task` (required)
- `label?` (optional)
- `agentId?` (optional; spawn under another agent id if allowed)
- `model?` (optional; overrides the sub-agent model; invalid values are skipped and the sub-agent runs on the default model with a warning in the tool result)
- `thinking?` (optional; overrides thinking level for the sub-agent run)
- `runTimeoutSeconds?` (defaults to `agents.defaults.subagents.runTimeoutSeconds` when set, otherwise `0`; when set, the sub-agent run is aborted after N seconds)
- `thread?` (default `false`; when `true`, requests channel thread binding for this sub-agent session)
- `mode?` (`run|session`)
  - default is `run`
  - if `thread: true` and `mode` omitted, default becomes `session`
  - `mode: "session"` requires `thread: true`
- `cleanup?` (`delete|keep`, default `keep`)
- `sandbox?` (`inherit|require`, default `inherit`; `require` rejects spawn unless target child runtime is sandboxed)
- `sessions_spawn` n'accepte **pas** les paramètres de livraison par channel (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`). Pour la livraison, utilisez `message`/`sessions_send` depuis l'exécution générée.

## Sessions liées aux fils

Lorsque les liaisons de fils sont activées pour un channel, un sous-agent peut rester lié à un fil, de sorte que les messages de suivi des utilisateurs dans ce fil continuent d'être acheminés vers la même session de sous-agent.

### Channels supportant les fils

- Discord (actuellement le seul channel pris en charge) : prend en charge les sessions persistantes de sous-agents liés aux fils (`sessions_spawn` avec `thread: true`), les contrôles manuels des fils (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`) et les clés d'adaptateur `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours` et `channels.discord.threadBindings.spawnSubagentSessions`.

Flux rapide :

1. Générez avec `sessions_spawn` en utilisant `thread: true` (et optionnellement `mode: "session"`).
2. OpenClaw crée ou lie un fil à cette cible de session dans le channel actif.
3. Les réponses et les messages de suivi dans ce fil sont acheminés vers la session liée.
4. Utilisez `/session idle` pour inspecter/mettre à jour l'auto-perte de focus par inactivité et `/session max-age` pour contrôler la limite stricte.
5. Utilisez `/unfocus` pour détacher manuellement.

Contrôles manuels :

- `/focus <target>` lie le fil actuel (ou en crée un) à une cible de sous-agent/session.
- `/unfocus` supprime la liaison pour le fil lié actuel.
- `/agents` liste les exécutions actives et l'état de liaison (`thread:<id>` ou `unbound`).
- `/session idle` et `/session max-age` ne fonctionnent que pour les fils liés focalisés.

Commutateurs de configuration :

- Global default : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`
- La substitution de canal et les clés de liaison automatique de génération (spawn auto-bind keys) sont spécifiques à l'adaptateur. Voir **Thread supporting channels** ci-dessus.

Voir [Configuration Reference](/fr/gateway/configuration-reference) et [Slash commands](/fr/tools/slash-commands) pour les détails actuels de l'adaptateur.

Liste blanche (Allowlist) :

- `agents.list[].subagents.allowAgents` : liste des identifiants d'agents qui peuvent être ciblés via `agentId` (`["*"]` pour autoriser n'importe lequel). Par défaut : uniquement l'agent demandeur.
- Garantie d'héritage de Sandbox : si la session du demandeur est sandboxed, `sessions_spawn` rejette les cibles qui s'exécuteraient sans sandbox (unsandboxed).

Discovery :

- Utilisez `agents_list` pour voir quels identifiants d'agents sont actuellement autorisés pour `sessions_spawn`.

Archivage automatique (Auto-archive) :

- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut : 60).
- L'archivage utilise `sessions.delete` et renomme la transcription en `*.deleted.<timestamp>` (même dossier).
- `cleanup: "delete"` archive immédiatement après l'annonce (conserve tout de même la transcription via le renommage).
- L'archivage automatique est au mieux effort (best-effort) ; les minuteurs en attente sont perdus si la passerelle redémarre.
- `runTimeoutSeconds` n'effectue **pas** l'archivage automatique ; il arrête simplement l'exécution. La session reste jusqu'à l'archivage automatique.
- L'archivage automatique s'applique de manière égale aux sessions de profondeur 1 et de profondeur 2.

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
| 2          | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sous-sous-agent (worker feuille)                                 | Jamais                            |

### Chaîne d'annonce

Les résultats remontent la chaîne :

1. Le worker de profondeur 2 se termine → annonce à son parent (orchestrateur de profondeur 1)
2. L'orchestrateur de profondeur 1 reçoit l'annonce, synthétise les résultats, se termine → annonce au principal
3. L'agent principal reçoit l'annonce et la transmet à l'utilisateur

Chaque niveau ne voit que les annonces de ses enfants directs.

### Stratégie d'outil par profondeur

- Le rôle et le périmètre de contrôle sont inscrits dans les métadonnées de session au moment de la génération. Cela empêche les clés de session plates ou restaurées de retrouver accidentellement des privilèges d'orchestrateur.
- **Profondeur 1 (orchestrateur, quand `maxSpawnDepth >= 2`)** : Obtient `sessions_spawn`, `subagents`, `sessions_list`, `sessions_history` afin qu'il puisse gérer ses enfants. Les autres outils de session/système restent refusés.
- **Profondeur 1 (feuille, quand `maxSpawnDepth == 1`)** : Aucun outil de session (comportement actuel par défaut).
- **Profondeur 2 (worker feuille)** : Aucun outil de session — `sessions_spawn` est toujours refusé à la profondeur 2. Impossible de générer d'autres enfants.

### Limite de génération par agent

Chaque session d'agent (à n'importe quelle profondeur) peut avoir au plus `maxChildrenPerAgent` (par défaut : 5) enfants actifs à la fois. Cela empêche une diffusion incontrôlée à partir d'un seul orchestrateur.

### Arrêt en cascade

Arrêter un orchestrateur de profondeur 1 arrête automatiquement tous ses enfants de profondeur 2 :

- `/stop` dans le chat principal arrête tous les agents de profondeur 1 et se propage à leurs enfants de profondeur 2.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.
- `/subagents kill all` arrête tous les sous-agents pour le demandeur et se propage.

## Authentification

L'authentification du sous-agent est résolue par **ID d'agent**, et non par type de session :

- La clé de session du sous-agent est `agent:<agentId>:subagent:<uuid>`.
- Le magasin d'authentification est chargé à partir du `agentDir` de cet agent.
- Les profils d'authentification de l'agent principal sont fusionnés en tant que **secours** ; les profils de l'agent prévalent sur les profils principaux en cas de conflit.

Remarque : la fusion est additive, donc les profils principaux sont toujours disponibles en tant que secours. Une authentification totalement isolée par agent n'est pas encore prise en charge.

## Annonce

Les sous-agents font rapport via une étape d'annonce :

- L'étape d'annonce s'exécute dans la session du sous-agent (pas la session du demandeur).
- Si le sous-agent répond exactement `ANNOUNCE_SKIP`, rien n'est publié.
- Sinon, la livraison dépend de la profondeur du demandeur :
  - les sessions de demandeur de niveau supérieur utilisent un appel de suivi `agent` avec une livraison externe (`deliver=true`)
  - les sessions de sous-agent demandeur imbriquées reçoivent une injection de suivi interne (`deliver=false`) afin que l'orchestrateur puisse synthétiser les résultats enfants en session
  - si une session de sous-agent demandeur imbriqué a disparu, OpenClaw revient au demandeur de cette session si disponible
- L'agrégation de l'achèvement des enfants est limitée à l'exécution du demandeur actuel lors de la construction des constatations d'achèvement imbriquées, empêchant les sorties d'enfants obsolètes de l'exécution précédente de fuir dans l'annonce actuelle.
- Les réponses d'annonce préservent le routage de fil/discussion lorsque disponible sur les adaptateurs de channel.
- Le contexte d'annonce est normalisé en un bloc d'événement interne stable :
  - source (`subagent` ou `cron`)
  - clé/id de session enfant
  - type d'annonce + étiquette de tâche
  - ligne d'état dérivée du résultat de l'exécution (`success`, `error`, `timeout`, ou `unknown`)
  - contenu du résultat de l'étape d'annonce (ou `(no output)` si manquant)
  - une instruction de suivi décrivant quand répondre vs. rester silencieux
- `Status` n'est pas déduit de la sortie du model ; il provient des signaux de résultat de l'exécution.

Les charges utiles d'annonce incluent une ligne de statistiques à la fin (même lorsqu'elles sont enveloppées) :

- Durée d'exécution (par ex., `runtime 5m12s`)
- Utilisation des jetons (entrée/sortie/total)
- Coût estimé lorsque la tarification du model est configurée (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId`, et le chemin de la transcription (afin que l'agent principal puisse récupérer l'historique via `sessions_history` ou inspecter le fichier sur le disque)
- Les métadonnées internes sont destinées uniquement à l'orchestration ; les réponses orientées utilisateur doivent être réécrites dans la voix normale de l'assistant.

## Stratégie d'outils (outils de sous-agent)

Par défaut, les sous-agents obtiennent **tous les outils sauf les outils de session** et les outils système :

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

Lorsque `maxSpawnDepth >= 2`, les sous-agents orchestrateurs de profondeur 1 reçoivent également `sessions_spawn`, `subagents`, `sessions_list` et `sessions_history` afin qu'ils puissent gérer leurs enfants.

Remplacer via la config :

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

- Nom de la voie : `subagent`
- Simultanéité : `agents.defaults.subagents.maxConcurrent` (par défaut `8`)

## Arrêt

- L'envoi de `/stop` dans le chat demandeur abandonne la session demandeur et arrête toutes les exécutions de sous-agents actives lancées à partir de celle-ci, en cascade vers les enfants imbriqués.
- `/subagents kill <id>` arrête un sous-agent spécifique et se propage à ses enfants.

## Limitations

- L'annonce du sous-agent est effectuée sur la base du **best-effort**. Si la passerelle redémarre, le travail d'annonce en attente est perdu.
- Les sous-agents partagent toujours les mêmes ressources de processus de passerelle ; traitez `maxConcurrent` comme une soupape de sécurité.
- `sessions_spawn` est toujours non bloquant : il renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Le contexte du sous-agent n'injecte que `AGENTS.md` + `TOOLS.md` (pas de `SOUL.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md` ou `BOOTSTRAP.md`).
- La profondeur d'imbrication maximale est de 5 (plage `maxSpawnDepth` : 1–5). Une profondeur de 2 est recommandée pour la plupart des cas d'utilisation.
- `maxChildrenPerAgent` plafonne les enfants actifs par session (par défaut : 5, plage : 1–20).

import fr from "/components/footer/fr.mdx";

<fr />
