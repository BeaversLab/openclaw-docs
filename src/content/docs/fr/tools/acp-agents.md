---
summary: "Utilisez les sessions d'exécution ACP pour Codex, Claude Code, Cursor, Gemini CLI, OpenClaw ACP et autres agents de harnais"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "Agents ACP"
---

# Agents ACP

Les sessions [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) permettent à OpenClaw d'exécuter des harnais de codage externes (par exemple Pi, Claude Code, Codex, Cursor, Copilot, OpenClaw ACP, OpenCode, Gemini CLI et autres harnais ACPX pris en charge) via un plugin backend ACP.

Si vous demandez à OpenClaw en langage clair de "lancer ceci dans Codex" ou de "démarrer Claude Code dans un fil", OpenClaw devrait acheminer cette demande vers l'exécution ACP (et non l'exécution du sous-agent natif). Chaque lancement de session ACP est suivi comme une [tâche d'arrière-plan](/fr/automation/tasks).

Si vous souhaitez que Codex ou Claude Code se connecte en tant que client MCP externe directement
aux conversations de canal OpenClaw existantes, utilisez [`openclaw mcp serve`](/fr/cli/mcp)
à la place d'ACP.

## Quelle page me faut-il ?

Il existe trois surfaces voisines qu'il est facile de confondre :

| Vous souhaitez...                                                                           | Utiliser ceci                            | Notes                                                                                                                    |
| ------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Exécuter Codex, Claude Code, Gemini CLI ou un autre harnais externe _via_ OpenClaw          | Cette page : Agents ACP                  | Sessions liées au chat, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tâches d'arrière-plan, contrôles d'exécution |
| Exposer une session OpenClaw Gateway _en tant que_ serveur ACP pour un éditeur ou un client | [`openclaw acp`](/fr/cli/acp)            | Mode pont. L'IDE/le client parle ACP à OpenClaw via stdio/WebSocket                                                      |
| Réutiliser un CLI IA local en tant que modèle de repli texte uniquement                     | [Backends CLI](/fr/gateway/cli-backends) | Pas ACP. Pas d'outils OpenClaw, pas de contrôles ACP, pas d'exécution de harnais                                         |

## Est-ce que cela fonctionne directement ?

Généralement, oui.

- Les nouvelles installations livrent désormais le plugin d'exécution `acpx` intégré activé par défaut.
- Le plugin intégré `acpx` préfère son binaire `acpx` épinglé localement au plugin.
- Au démarrage, OpenClaw sonde ce binaire et le répare automatiquement si nécessaire.
- Commencez par `/acp doctor` si vous souhaitez une vérification rapide de disponibilité.

Ce qui peut encore arriver à la première utilisation :

- Un adaptateur de harnais cible peut être récupéré à la demande avec `npx` la première fois que vous utilisez ce harnais.
- L'authentification du fournisseur doit toujours exister sur l'hôte pour ce harnais.
- Si l'hôte n'a pas accès à npm/au réseau, les récupérations d'adaptateur lors de la première exécution peuvent échouer jusqu'à ce que les caches soient préchauffés ou que l'adaptateur soit installé d'une autre manière.

Exemples :

- `/acp spawn codex` : OpenClaw devrait être prêt à initialiser `acpx` , mais l'adaptateur ACP Codex peut encore avoir besoin d'une récupération au premier lancement.
- `/acp spawn claude` : même histoire pour l'adaptateur ACP Claude, plus l'authentification côté Claude sur cet hôte.

## Flux de l'opérateur rapide

Utilisez ceci lorsque vous souhaitez un guide opérationnel `/acp` pratique :

1. Lancer une session :
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. Travaillez dans la conversation liée ou le fil (ou ciblez explicitement cette clé de session).
3. Vérifier l'état du runtime :
   - `/acp status`
4. Ajustez les options du runtime si nécessaire :
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Pousser une session active sans remplacer le contexte :
   - `/acp steer tighten logging and continue`
6. Arrêter le travail :
   - `/acp cancel` (arrêter le tour actuel), ou
   - `/acp close` (fermer la session + supprimer les liaisons)

## Démarrage rapide pour les humains

Exemples de demandes naturelles :

- "Liez ce Discord channel à Codex."
- "Lancez une session Codex persistante dans un fil ici et gardez-la focalisée."
- "Exécutez ceci en tant que session ACP Claude Code à usage unique et résumez le résultat."
- "Liez cette conversation iMessage à Codex et gardez les suites dans le même espace de travail."
- "Utilisez le CLI Gemini pour cette tâche dans un fil, puis gardez les suites dans ce même fil."

Ce que OpenClaw doit faire :

1. Choisissez `runtime: "acp"` .
2. Résolvez la cible du harnais demandé ( `agentId` , par exemple `codex` ).
3. Si une liaison à la conversation actuelle est demandée et que le channel actif la prend en charge, liez la session ACP à cette conversation.
4. Sinon, si une liaison au fil est demandée et que le channel actuel la prend en charge, liez la session ACP au fil.
5. Acheminez les messages liés de suivi vers cette même session ACP jusqu'à ce qu'elle soit perdue/fermée/expirée.

## ACP par rapport aux sous-agents

Utilisez ACP lorsque vous souhaitez un runtime de harnais externe. Utilisez les sous-agents lorsque vous souhaitez des exécutions déléguées natives OpenClaw .

| Zone                  | Session ACP                           | Exécution de sous-agent               |
| --------------------- | ------------------------------------- | ------------------------------------- |
| Runtime               | Plugin backend ACP (par exemple acpx) | Runtime de sous-agent natif OpenClaw  |
| Clé de session        | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`     |
| Commandes principales | `/acp ...`                            | `/subagents ...`                      |
| Outil de lancement    | `sessions_spawn` avec `runtime:"acp"` | `sessions_spawn` (runtime par défaut) |

Voir aussi [Sous-agents](/fr/tools/subagents).

## Fonctionnement de l'exécution de Claude Code par ACP

Pour Claude Code via ACP, la pile est la suivante :

1. OpenClaw plan de contrôle de session ACP
2. plugin runtime `acpx` groupé
3. Adaptateur ACP Claude
4. Mécanisme de runtime/session côté Claude

Distinction importante :

- ACP Claude est une session de harnais avec des contrôles ACP, la reprise de session, le suivi des tâches en arrière-plan et une liaison de conversation/fil facultative.
- Les backends CLI sont des runtimes de repli locaux texte uniquement distincts. Voir [Backends CLI](/fr/gateway/cli-backends).

Pour les opérateurs, la règle pratique est la suivante :

- vous voulez `/acp spawn`, des sessions liables, des contrôles de runtime ou un travail de harnais persistant : utilisez ACP
- vous voulez un repli texte local simple via le CLI brut : utilisez les backends CLI

## Sessions liées

### Liaisons de conversation actuelle

Utilisez `/acp spawn <harness> --bind here` lorsque vous voulez que la conversation actuelle devienne un espace de travail ACP durable sans créer de fil de discussion enfant.

Comportement :

- OpenClaw conserve la propriété du transport de channel, de l'auth, de la sécurité et de la livraison.
- La conversation actuelle est épinglée à la clé de session ACP générée.
- Les messages de suivi dans cette conversation sont acheminés vers la même session ACP.
- `/new` et `/reset` réinitialisent la même session ACP liée sur place.
- `/acp close` ferme la session et supprime la liaison de conversation actuelle.

Ce que cela signifie en pratique :

- `--bind here` conserve la même surface de chat. Sur Discord, le channel actuel reste le channel actuel.
- `--bind here` peut toujours créer une nouvelle session ACP si vous lancez un nouveau travail. La liaison attache cette session à la conversation actuelle.
- `--bind here` ne crée pas de fil de discussion Discord enfant ni de sujet Telegram par lui-même.
- Le runtime ACP peut toujours avoir son propre répertoire de travail (`cwd`) ou un espace de travail géré par le backend sur le disque. Cet espace de travail runtime est distinct de la surface de chat et n'implique pas un nouveau fil de messagerie.
- Si vous générez vers un autre agent ACP et ne passez pas `--cwd`, OpenClaw hérite de l'espace de travail de l'**agent cible** par défaut, et non celui du demandeur.
- Si ce chemin d'espace de travail hérité est manquant (`ENOENT`/`ENOTDIR`), OpenClaw revient au cwd par défaut du backend au de réutiliser silencieusement le mauvais arbre.
- Si l'espace de travail hérité existe mais n'est pas accessible (par exemple `EACCES`), la génération renvoie la vraie erreur d'accès au lieu d'abandonner `cwd`.

Modèle mental :

- surface de discussion : l'endroit où les gens continuent de parler (`Discord channel`, `Telegram topic`, `iMessage chat`)
- session ACP : l'état d'exécution durable Codex/Claude/Gemini vers lequel OpenClaw achemine
- fil/topic enfant : une surface de messagerie supplémentaire facultative créée uniquement par `--thread ...`
- espace de travail d'exécution : l'emplacement du système de fichiers où le harnais s'exécute (`cwd`, extraction de dépôt, espace de travail backend)

Exemples :

- `/acp spawn codex --bind here` : conserver cette discussion, générer ou attacher une session ACP Codex, et acheminer les messages futurs ici vers celle-ci
- `/acp spawn codex --thread auto` : OpenClaw peut créer un fil/topic enfant et lier la session ACP là
- `/acp spawn codex --bind here --cwd /workspace/repo` : même liaison de discussion que ci-dessus, mais Codex s'exécute dans `/workspace/repo`

Prise en charge de la liaison de conversation actuelle :

- Les canaux de discussion/messagerie qui annoncent la prise en charge de la liaison de conversation actuelle peuvent utiliser `--bind here` via le chemin de liaison de conversation partagé.
- Les canaux avec une sémantique de fil/topic personnalisée peuvent toujours fournir une canonicalisation spécifique au canal derrière la même interface partagée.
- `--bind here` signifie toujours « lier la conversation actuelle en place ».
- Les liaisons de conversation actuelle génériques utilisent le stockage de liaison OpenClaw partagé et survivent aux redémarrages normaux de la passerelle.

Notes :

- `--bind here` et `--thread ...` s'excluent mutuellement sur `/acp spawn`.
- Sur Discord, `--bind here` lie le channel ou le fil actuel en place. `spawnAcpSessions` n'est requis que lorsqu'OpenClaw doit créer un fil enfant pour `--thread auto|here`.
- Si le channel actif n'expose pas de liaisons ACP pour la conversation actuelle, OpenClaw renvoie un message clair indiquant que ce n'est pas pris en charge.
- `resume` et les questions de « nouvelle session » sont des questions relatives à la session ACP, et non au channel. Vous pouvez réutiliser ou remplacer l'état du runtime sans changer la surface de chat actuelle.

### Sessions liées aux fils

Lorsque les liaisons de fils sont activées pour un adaptateur de channel, les sessions ACP peuvent être liées aux fils :

- OpenClaw lie un fil à une session ACP cible.
- Les messages de suivi dans ce fil sont acheminés vers la session ACP liée.
- La sortie ACP est renvoyée vers le même fil.
- La perte de focus, la fermeture, l'archivage, l'expiration par inactivité ou l'expiration par ancienneté maximale supprime la liaison.

La prise en charge des liaisons de fils est spécifique à l'adaptateur. Si l'adaptateur de channel actif ne prend pas en charge les liaisons de fils, OpenClaw renvoie un message clair indiquant que ce n'est pas pris en charge ou indisponible.

Indicateurs de fonctionnalités requis pour l'ACP liée aux fils :

- `acp.enabled=true`
- `acp.dispatch.enabled` est activé par défaut (définissez `false` pour suspendre l'acheminement ACP)
- Indicateur de création de fils ACP de l'adaptateur de channel activé (spécifique à l'adaptateur)
  - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`

### Channels prenant en charge les fils

- Tout adaptateur de channel qui expose la capacité de liaison de session/fil.
- Support intégré actuel :
  - Fils/channels Discord
  - Sujets Telegram (sujets de forum dans les groupes/super-groupes et sujets DM)
- Les channels de plugin peuvent ajouter un support via la même interface de liaison.

## Paramètres spécifiques au channel

Pour les workflows non éphémères, configurez des liaisons ACP persistantes dans les entrées `bindings[]` de niveau supérieur.

### Modèle de liaison

- `bindings[].type="acp"` marque une liaison de conversation ACP persistante.
- `bindings[].match` identifie la conversation cible :
  - Channel ou fil Discord : `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Sujet de forum Telegram : `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles DM/group chat : `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Privilégiez `chat_id:*` ou `chat_identifier:*` pour des liaisons de groupe stables.
  - iMessage DM/group chat : `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Privilégiez `chat_id:*` pour des liaisons de groupe stables.
- `bindings[].agentId` est l'ID de l'agent OpenClaw propriétaire.
- Les remplacements ACP facultatifs se trouvent sous `bindings[].acp` :
  - `mode` (`persistent` ou `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Runtime defaults per agent

Utilisez `agents.list[].runtime` pour définir les valeurs par défaut ACP une fois par agent :

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id, par exemple `codex` ou `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

Priorité de remplacement pour les sessions ACP liées :

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. valeurs par défaut ACP globales (par exemple `acp.backend`)

Exemple :

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

Comportement :

- OpenClaw s'assure que la session ACP configurée existe avant son utilisation.
- Les messages dans ce canal ou sujet sont routés vers la session ACP configurée.
- Dans les conversations liées, `/new` et `/reset` réinitialisent la même clé de session ACP sur place.
- Les liaisons d'exécution temporaires (par exemple créées par les flux de focus de fil) s'appliquent toujours lorsqu'elles sont présentes.
- Pour les créations ACP inter-agents sans `cwd` explicite, OpenClaw hérite de l'espace de travail de l'agent cible à partir de la configuration de l'agent.
- Les chemins d'espace de travail hérités manquants reviennent au cwd par défaut du backend ; les échecs d'accès non manquants apparaissent comme des erreurs de création.

## Start ACP sessions (interfaces)

### From `sessions_spawn`

Utilisez `runtime: "acp"` pour démarrer une session ACP à partir d'un tour d'agent ou d'un appel d'outil.

```json
{
  "task": "Open the repo and summarize failing tests",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

Notes :

- `runtime` a pour valeur par défaut `subagent`, définissez donc `runtime: "acp"` explicitement pour les sessions ACP.
- Si `agentId` est omis, OpenClaw utilise `acp.defaultAgent` lorsqu'il est configuré.
- `mode: "session"` nécessite `thread: true` pour maintenir une conversation liée persistante.

Détails de l'interface :

- `task` (requis) : invite initiale envoyée à la session ACP.
- `runtime` (requis pour ACP) : doit être `"acp"`.
- `agentId` (facultatif) : id du harnais cible ACP. Revient à `acp.defaultAgent` si défini.
- `thread` (facultatif, par défaut `false`) : demande le flux de liaison de thread lorsque pris en charge.
- `mode` (facultatif) : `run` (ponctuel) ou `session` (persistant).
  - la valeur par défaut est `run`
  - si `thread: true` et le mode sont omis, OpenClaw peut adopter par défaut un comportement persistant selon le chemin d'exécution
  - `mode: "session"` nécessite `thread: true`
- `cwd` (facultatif) : répertoire de travail d'exécution demandé (validé par la stratégie backend/runtime). S'il est omis, le spawn ACP hérite de l'espace de travail de l'agent cible lorsqu'il est configuré ; les chemins hérités manquants reviennent aux valeurs par défaut du backend, tandis que les erreurs d'accès réelles sont renvoyées.
- `label` (facultatif) : label destiné à l'opérateur, utilisé dans le texte de session/bannière.
- `resumeSessionId` (facultatif) : reprend une session ACP existante au lieu d'en créer une nouvelle. L'agent rejoue son historique de conversation via `session/load`. Nécessite `runtime: "acp"`.
- `streamTo` (facultatif) : `"parent"` diffuse les résumés de progression initiaux de l'exécution ACP vers la session demandeur en tant qu'événements système.
  - Lorsqu'elles sont disponibles, les réponses acceptées incluent `streamLogPath` pointant vers un journal JSONL délimité à la session (`<sessionId>.acp-stream.jsonl`) que vous pouvez suivre pour l'historique complet du relais.

### Reprendre une session existante

Utilisez `resumeSessionId` pour continuer une session ACP précédente au lieu d'en commencer une nouvelle. L'agent rejoue son historique de conversation via `session/load`, il reprend donc avec le contexte complet de ce qui s'est passé avant.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Cas d'usage courants :

- Transférer une session Codex de votre ordinateur portable vers votre téléphone — dites à votre agent de reprendre là où vous vous êtes arrêté
- Continuer une session de codage que vous avez commencée de manière interactive dans le CLI, maintenant sans tête via votre agent
- Reprendre le travail qui a été interrompu par un redémarrage de la passerelle ou un délai d'inactivité

Remarques :

- `resumeSessionId` nécessite `runtime: "acp"` — renvoie une erreur s'il est utilisé avec le runtime de sous-agent.
- `resumeSessionId` restaure l'historique des conversations ACP en amont ; `thread` et `mode` s'appliquent toujours normalement à la nouvelle session OpenClaw que vous créez, donc `mode: "session"` nécessite toujours `thread: true`.
- L'agent cible doit prendre en charge `session/load` (Codex et Claude Code le font).
- Si l'ID de session n'est pas trouvé, le lancement échoue avec une erreur claire — aucune repli silencieux vers une nouvelle session.

### Test de fumée de l'opérateur

Utilisez ceci après un déploiement de passerelle lorsque vous souhaitez une vérification rapide en direct que le lancement ACP fonctionne réellement de bout en bout, et pas seulement réussir les tests unitaires.

Porte recommandée :

1. Vérifiez la version/le commit de la passerelle déployée sur l'hôte cible.
2. Confirmez que la source déployée inclut l'acceptation de lignée ACP dans `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`).
3. Ouvrez une session de pont ACPX temporaire vers un agent en direct (par exemple `razor(main)` sur `jpclawhq`).
4. Demandez à cet agent d'appeler `sessions_spawn` avec :
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - tâche : `Reply with exactly LIVE-ACP-SPAWN-OK`
5. Vérifiez que l'agent signale :
   - `accepted=yes`
   - un `childSessionKey` réel
   - aucune erreur de validateur
6. Nettoyez la session de pont ACPX temporaire.

Exemple d'invite pour l'agent en direct :

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Remarques :

- Gardez ce test de fumée sur `mode: "run"` sauf si vous testez intentionnellement des sessions ACP persistantes liées aux threads.
- Ne nécessitez pas `streamTo: "parent"` pour la porte de base. Ce chemin dépend des capacités du demandeur/de la session et constitue une vérification d'intégration distincte.
- Traitez le test `mode: "session"` lié au fil de discussion comme un deuxième passage d'intégration plus riche à partir d'un fil de discussion Discord réel ou d'un sujet Telegram.

## Compatibilité du bac à sable

Les sessions ACP s'exécutent actuellement sur l'hôte d'exécution, et non à l'intérieur du bac à sable OpenClaw.

Limites actuelles :

- Si la session du demandeur est isolée (sandboxed), les créations ACP sont bloquées pour `sessions_spawn({ runtime: "acp" })` et `/acp spawn`.
  - Erreur : `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` avec `runtime: "acp"` ne prend pas en charge `sandbox: "require"`.
  - Erreur : `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Utilisez `runtime: "subagent"` lorsque vous avez besoin d'une exécution imposée par le bac à sable.

### Depuis la commande `/acp`

Utilisez `/acp spawn` pour un contrôle explicite de l'opérateur depuis le chat lorsque nécessaire.

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --bind here
/acp spawn codex --thread here
```

Indicateurs clés :

- `--mode persistent|oneshot`
- `--bind here|off`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

Voir [Slash Commands](/fr/tools/slash-commands).

## Résolution de la cible de session

La plupart des actions `/acp` acceptent une cible de session facultative (`session-key`, `session-id` ou `session-label`).

Ordre de résolution :

1. Argument de cible explicite (ou `--session` pour `/acp steer`)
   - essaie la clé
   - puis l'identifiant de session de forme UUID
   - puis l'étiquette
2. Liaison de fil de discussion actuel (si cette conversation/fil est lié à une session ACP)
3. Retour à la session du demandeur actuel

Les liaisons de conversation actuelle et les liaisons de fil de discussion participent toutes deux à l'étape 2.

Si aucune cible n'est résolue, OpenClaw renvoie une erreur claire (`Unable to resolve session target: ...`).

## Modes de liaison de création

`/acp spawn` prend en charge `--bind here|off`.

| Mode   | Comportement                                                                    |
| ------ | ------------------------------------------------------------------------------- |
| `here` | Liez la conversation active actuelle en place ; échouez si aucune n'est active. |
| `off`  | Ne créez pas de liaison de conversation actuelle.                               |

Notes :

- `--bind here` est le chemin d'opérateur le plus simple pour « rendre ce channel ou chat pris en charge par Codex ».
- `--bind here` ne crée pas de fil de discussion enfant.
- `--bind here` est uniquement disponible sur les channels qui exposent la prise en charge de la liaison à la conversation actuelle.
- `--bind` et `--thread` ne peuvent pas être combinés dans le même appel `/acp spawn`.

## Modes de création de fils de discussion

`/acp spawn` prend en charge `--thread auto|here|off`.

| Mode   | Comportement                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------ |
| `auto` | Dans un fil actif : lier ce fil. En dehors d'un fil : créer/lier un fil enfant lorsque pris en charge. |
| `here` | Nécessite un fil actif actuel ; échoue si ce n'est pas le cas.                                         |
| `off`  | Aucune liaison. La session démarre sans liaison.                                                       |

Notes :

- Sur les surfaces sans liaison de fil, le comportement par défaut est effectivement `off`.
- La création liée à un fil nécessite la prise en charge de la stratégie de channel :
  - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`
- Utilisez `--bind here` lorsque vous souhaitez épingler la conversation actuelle sans créer de fil enfant.

## Contrôles ACP

Famille de commandes disponible :

- `/acp spawn`
- `/acp cancel`
- `/acp steer`
- `/acp close`
- `/acp status`
- `/acp set-mode`
- `/acp set`
- `/acp cwd`
- `/acp permissions`
- `/acp timeout`
- `/acp model`
- `/acp reset-options`
- `/acp sessions`
- `/acp doctor`
- `/acp install`

`/acp status` affiche les options d'exécution effectives et, si disponibles, les identifiants de session au niveau de l'exécution et du backend.

Certains contrôles dépendent des capacités du backend. Si un backend ne prend pas en charge un contrôle, OpenClaw renvoie une erreur claire de contrôle non pris en charge.

## Livre de recettes de commandes ACP

| Commande             | Ce qu'elle fait                                                               | Exemple                                                       |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Créer une session ACP ; liaison actuelle ou liaison de fil optionnelle.       | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Annuler le tour en cours pour la session cible.                               | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Envoyer une instruction de direction à la session en cours.                   | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Fermer la session et dissocier les cibles du fil.                             | `/acp close`                                                  |
| `/acp status`        | Afficher le backend, le mode, l'état, les options d'exécution, les capacités. | `/acp status`                                                 |
| `/acp set-mode`      | Définir le mode d'exécution pour la session cible.                            | `/acp set-mode plan`                                          |
| `/acp set`           | Écriture générique d'option de configuration d'exécution.                     | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Définir le répertoire de travail d'exécution.                                 | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Définir le profil de politique d'approbation.                                 | `/acp permissions strict`                                     |
| `/acp timeout`       | Définir le délai d'expiration d'exécution (secondes).                         | `/acp timeout 120`                                            |
| `/acp model`         | Définir le modèle d'exécution.                                                | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Supprimer les substitutions d'options d'exécution de session.                 | `/acp reset-options`                                          |
| `/acp sessions`      | Lister les sessions ACP récentes depuis le stockage.                          | `/acp sessions`                                               |
| `/acp doctor`        | Santé du backend, capacités, corrections actionnables.                        | `/acp doctor`                                                 |
| `/acp install`       | Imprimer les étapes déterministes d'installation et d'activation.             | `/acp install`                                                |

`/acp sessions` lit le stockage pour la session liée actuelle ou la session demanderesse. Les commandes qui acceptent les jetons `session-key`, `session-id` ou `session-label` résolvent les cibles via la découverte de session de passerelle, y compris les racines `session.store` personnalisées par agent.

## Mappage des options d'exécution

`/acp` dispose de commandes pratiques et d'un définisseur générique.

Opérations équivalentes :

- `/acp model <id>` correspond à la clé de configuration d'exécution `model`.
- `/acp permissions <profile>` correspond à la clé de configuration d'exécution `approval_policy`.
- `/acp timeout <seconds>` correspond à la clé de configuration d'exécution `timeout`.
- `/acp cwd <path>` met à jour directement la substitution du répertoire de travail d'exécution.
- `/acp set <key> <value>` est le chemin générique.
  - Cas particulier : `key=cwd` utilise le chemin de substitution du répertoire de travail.
- `/acp reset-options` efface toutes les substitutions d'exécution pour la session cible.

## prise en charge du harnais acpx (actuelle)

Alias de harnais intégrés actuels d'acpx :

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI : `cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

Lorsque OpenClaw utilise le backend acpx, privilégiez ces valeurs pour `agentId`, sauf si votre configuration acpx définit des alias d'agent personnalisés.
Si votre installation locale de Cursor expose toujours l'ACP en tant que `agent acp`, substituez la commande de l'agent `cursor` dans votre configuration acpx au lieu de modifier la valeur par défaut intégrée.

L'utilisation directe de l'CLI acpx peut également cibler des adaptateurs arbitraires via `--agent <command>`, mais cette échappatoire brute est une fonctionnalité de l'CLI acpx (et non le chemin normal OpenClaw `agentId`).

## Configuration requise

Ligne de base ACP de base :

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "pi", "qwen"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

La configuration de liaison de fil de discussion est spécifique à l'adaptateur de canal. Exemple pour Discord :

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnAcpSessions: true,
      },
    },
  },
}
```

Si le lancement ACP lié à un fil de discussion ne fonctionne pas, vérifiez d'abord le paramètre d'activation de la fonctionnalité de l'adaptateur :

- Discord : `channels.discord.threadBindings.spawnAcpSessions=true`

Les liaisons de conversation actuelle ne nécessitent pas la création de sous-fils de discussion. Elles nécessitent un contexte de conversation actif et un adaptateur de canal qui expose les liaisons de conversation ACP.

Voir [Référence de configuration](/fr/gateway/configuration-reference).

## Configuration du plugin pour le backend acpx

Les nouvelles installations incluent le plugin d'exécution `acpx` groupé activé par défaut, l'ACP fonctionne donc généralement sans étape d'installation manuelle du plugin.

Commencez par :

```text
/acp doctor
```

Si vous avez désactivé `acpx`, refusé via `plugins.allow` / `plugins.deny`, ou souhaitez
passer à une extraction de développement locale, utilisez le chemin explicite du plugin :

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Installation de l'espace de travail local pendant le développement :

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

Vérifiez ensuite l'état du backend :

```text
/acp doctor
```

### Configuration de la commande et de la version acpx

Par défaut, le plugin backend acpx groupé (`acpx`) utilise le binaire épinglé local au plugin :

1. La commande correspond par défaut au `node_modules/.bin/acpx` local au plugin dans le package de plugin ACPX.
2. La version attendue correspond par défaut à l'épinglage de l'extension.
3. Le démarrage enregistre le backend ACP immédiatement comme non prêt.
4. Une tâche d'arrière-plan vérifie `acpx --version`.
5. Si le binaire local au plugin est manquant ou ne correspond pas, il exécute :
   `npm install --omit=dev --no-save acpx@<pinned>` et revérifie.

Vous pouvez remplacer la commande/version dans la configuration du plugin :

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

Notes :

- `command` accepte un chemin absolu, un chemin relatif ou un nom de commande (`acpx`).
- Les chemins relatifs sont résolus à partir du répertoire de l'espace de travail OpenClaw.
- `expectedVersion: "any"` désactive la correspondance stricte de version.
- Lorsque `command` pointe vers un binaire/chemin personnalisé, l'installation automatique locale au plugin est désactivée.
- Le démarrage de OpenClaw reste non bloquant pendant l'exécution de la vérification de l'état du backend.

Voir [Plugins](/fr/tools/plugin).

### Installation automatique des dépendances

Lorsque vous installez OpenClaw globalement avec `npm install -g openclaw`, les dépendances
d'exécution acpx (binaires spécifiques à la plateforme) sont installées automatiquement
via un crochet postinstall. Si l'installation automatique échoue, la passerelle démarre
couramment et signale la dépendance manquante via `openclaw acp doctor`.

### Pont MCP des outils de plugin

Par défaut, les sessions ACPX n'exposent **pas** les outils enregistrés par le plugin OpenClaw à
l'interface ACP.

Si vous souhaitez que les agents ACP tels que Codex ou Claude Code appellent les outils de plugin
OpenClaw installés tels que la récupération/le stockage de mémoire, activez le pont dédié :

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Ce que cela fait :

- Injecte un serveur MCP intégré nommé `openclaw-plugin-tools` dans le bootstrap
  de session ACPX.
- Expose les outils de plugin déjà enregistrés par les plugins OpenClaw
  installés et activés.
- Garde la fonctionnalité explicite et désactivée par défaut.

Notes de sécurité et de confiance :

- Cela étend la surface des outils du harnais ACP.
- Les agents ACP ont accès uniquement aux outils de plugin déjà actifs dans la passerelle.
- Considérez cela comme la même limite de confiance que d'autoriser ces plugins à s'exécuter dans
  OpenClaw lui-même.
- Vérifiez les plugins installés avant de l'activer.

Les `mcpServers` personnalisés fonctionnent toujours comme avant. Le pont plugin-tools intégré est une
commodité d'adhésion supplémentaire, et non un remplacement de la configuration générique de serveur MCP.

### Configuration du délai d'expiration d'exécution

Le plugin `acpx` groupé définit par défaut les tours d'exécution intégrés à un délai d'attente de 120 secondes.
Cela donne aux harnais plus lents comme Gemini CLI suffisamment de temps pour terminer
le démarrage et l'initialisation de l'ACP. Modifiez-le si votre hôte a besoin d'une limite
d'exécution différente :

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

Redémarrez la passerelle après avoir modifié cette valeur.

## Configuration des permissions

Les sessions ACP s'exécutent de manière non interactive — il n'y a pas de TTY pour approuver ou refuser les invites de permission d'écriture de fichiers et d'exécution de shell. Le plugin acpx fournit deux clés de configuration qui contrôlent la gestion des permissions :

Ces permissions de harnais ACPX sont distinctes des approbations d'exécution OpenClaw et distinctes des indicateurs de contournement des fournisseurs de backend CLI tels que CLI de Claude `--permission-mode bypassPermissions`. `approve-all` ACPX est le commutateur de dernier recours au niveau du harnais pour les sessions ACP.

### `permissionMode`

Contrôle les opérations que l'agent de harnais peut effectuer sans invite.

| Valeur          | Comportement                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `approve-all`   | Approuver automatiquement toutes les écritures de fichiers et les commandes shell.                           |
| `approve-reads` | Approuver automatiquement uniquement les lectures ; les écritures et les exécutions nécessitent des invites. |
| `deny-all`      | Refuser toutes les invites de permission.                                                                    |

### `nonInteractivePermissions`

Contrôle ce qui se passe lorsqu'une invite de permission devrait être affichée mais qu'aucun TTY interactif n'est disponible (ce qui est toujours le cas pour les sessions ACP).

| Valeur | Comportement                                                                |
| ------ | --------------------------------------------------------------------------- |
| `fail` | Interrompre la session avec `AcpRuntimeError`. **(par défaut)**             |
| `deny` | Refuser silencieusement la permission et continuer (dégradation gracieuse). |

### Configuration

Définir via la configuration du plugin :

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Redémarrez la passerelle après avoir modifié ces valeurs.

> **Important :** OpenClaw utilise par défaut actuellement `permissionMode=approve-reads` et `nonInteractivePermissions=fail`. Dans les sessions ACP non interactives, toute opération d'écriture ou d'exécution déclenchant une invite d'autorisation peut échouer avec `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si vous devez restreindre les autorisations, définissez `nonInteractivePermissions` sur `deny` afin que les sessions se dégradent gracieusement au lieu de planter.

## Dépannage

| Symptôme                                                                    | Cause probable                                                                  | Correction                                                                                                                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Plugin backend manquant ou désactivé.                                           | Installez et activez le plugin backend, puis exécutez `/acp doctor`.                                                                                              |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP désactivé globalement.                                                      | Définissez `acp.enabled=true`.                                                                                                                                    |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Répartition depuis les messages de fil de discussion normale désactivée.        | Définissez `acp.dispatch.enabled=true`.                                                                                                                           |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent absent de la liste autorisée.                                             | Utilisez un `agentId` autorisé ou mettez à jour `acp.allowedAgents`.                                                                                              |
| `Unable to resolve session target: ...`                                     | Jeton de clé/id/étiquette incorrect.                                            | Exécutez `/acp sessions`, copiez la clé/l'étiquette exacte, réessayez.                                                                                            |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` utilisé sans conversation liable active.                          | Déplacez-vous vers le chat/channel cible et réessayez, ou utilisez un spawn non lié.                                                                              |
| `Conversation bindings are unavailable for <channel>.`                      | L'adaptateur manque de capacité de liaison ACP de conversation actuelle.        | Utilisez `/acp spawn ... --thread ...` lorsque pris en charge, configurez `bindings[]` de premier niveau, ou déplacez-vous vers un channel pris en charge.        |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` utilisé en dehors d'un contexte de fil de discussion.           | Déplacez-vous vers le fil de discussion cible ou utilisez `--thread auto`/`off`.                                                                                  |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Un autre utilisateur possède la cible de liaison active.                        | Reliez en tant que propriétaire ou utilisez une conversation ou un fil de discussion différent.                                                                   |
| `Thread bindings are unavailable for <channel>.`                            | L'adaptateur manque de capacité de liaison de fil de discussion.                | Utilisez `--thread off` ou déplacez-vous vers un adaptateur/channel pris en charge.                                                                               |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | Le runtime ACP est côté hôte ; la session demandeur est isolée (sandboxed).     | Utilisez `runtime="subagent"` depuis les sessions isolées, ou exécutez un spawn ACP depuis une session non isolée.                                                |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` requested for ACP runtime.                                  | Use `runtime="subagent"` for required sandboxing, or use ACP with `sandbox="inherit"` from a non-sandboxed session.                                               |
| Missing ACP metadata for bound session                                      | Stale/deleted ACP session metadata.                                             | Recreate with `/acp spawn`, then rebind/focus thread.                                                                                                             |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` blocks writes/exec in non-interactive ACP session.             | Set `plugins.entries.acpx.config.permissionMode` to `approve-all` and restart gateway. See [Permission configuration](#permission-configuration).                 |
| ACP session fails early with little output                                  | Permission prompts are blocked by `permissionMode`/`nonInteractivePermissions`. | Check gateway logs for `AcpRuntimeError`. For full permissions, set `permissionMode=approve-all`; for graceful degradation, set `nonInteractivePermissions=deny`. |
| ACP session stalls indefinitely after completing work                       | Harness process finished but ACP session did not report completion.             | Monitor with `ps aux \| grep acpx`; kill stale processes manually.                                                                                                |
