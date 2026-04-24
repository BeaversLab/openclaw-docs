---
summary: "Utilisez les sessions d'exécution ACP pour Codex, Claude Code, Cursor, Gemini CLI, OpenClaw ACP et autres agents de harnais"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Debugging ACP completion delivery or agent-to-agent loops
  - Operating /acp commands from chat
title: "Agents ACP"
---

# Agents ACP

Les sessions [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) permettent à OpenClaw d'exécuter des harnais de codage externes (par exemple Pi, Claude Code, Codex, Cursor, Copilot, OpenClaw ACP, OpenCode, Gemini CLI et autres harnais ACPX pris en charge) via un plugin backend ACP.

Si vous demandez à OpenClaw en langage clair de « lancer ceci dans Codex » ou de « démarrer Claude Code dans un fil », OpenClaw doit acheminer cette demande vers l'exécution ACP (et non l'exécution native des sous-agents). Chaque génération de session ACP est suivie en tant que [tâche d'arrière-plan](/fr/automation/tasks).

Si vous souhaitez que Codex ou Claude Code se connecte en tant que client MCP externe directement
aux conversations existantes du OpenClaw channel, utilisez [`openclaw mcp serve`](/fr/cli/mcp)
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

- Les nouvelles installations livrent désormais le plugin d'exécution `acpx` groupé activé par défaut.
- Le plugin groupé `acpx` préfère son binaire `acpx` épinglé localement au plugin.
- Au démarrage, OpenClaw sonde ce binaire et le répare automatiquement si nécessaire.
- Commencez par `/acp doctor` si vous souhaitez une vérification rapide de disponibilité.

Ce qui peut encore arriver à la première utilisation :

- Un adaptateur de harnais cible peut être récupéré à la demande avec `npx` la première fois que vous utilisez ce harnais.
- L'authentification du fournisseur doit toujours exister sur l'hôte pour ce harnais.
- Si l'hôte n'a pas accès à npm/au réseau, les récupérations d'adaptateur lors de la première exécution peuvent échouer jusqu'à ce que les caches soient préchauffés ou que l'adaptateur soit installé d'une autre manière.

Exemples :

- `/acp spawn codex` : OpenClaw devrait être prêt à amorcer `acpx`, mais l'adaptateur ACP Codex peut encore nécessiter une récupération lors de la première exécution.
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

1. Choisissez `runtime: "acp"`.
2. Résolvez la cible du harnais demandée (`agentId`, par exemple `codex`).
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
2. plugin de runtime `acpx` intégré
3. Adaptateur ACP Claude
4. Mécanisme de runtime/session côté Claude

Distinction importante :

- ACP Claude est une session de harnais avec des contrôles ACP, la reprise de session, le suivi des tâches en arrière-plan et une liaison de conversation/fil facultative.
- Les backends CLI sont des runtimes de repli locaux en mode texte uniquement. Voir [Backends CLI](/fr/gateway/cli-backends).

Pour les opérateurs, la règle pratique est la suivante :

- vous voulez `/acp spawn`, des sessions liables, des contrôles de runtime ou un travail de harnais persistant : utilisez ACP
- vous voulez un repli texte local simple via le CLI brut : utilisez les backends CLI

## Sessions liées

### Liaisons de conversation actuelle

Utilisez `/acp spawn <harness> --bind here` lorsque vous souhaitez que la conversation actuelle devienne un espace de travail ACP durable sans créer de fil de discussion enfant.

Comportement :

- OpenClaw conserve la propriété du transport de channel, de l'auth, de la sécurité et de la livraison.
- La conversation actuelle est épinglée à la clé de session ACP générée.
- Les messages de suivi dans cette conversation sont acheminés vers la même session ACP.
- `/new` et `/reset` réinitialisent la même session ACP liée en place.
- `/acp close` ferme la session et supprime la liaison de conversation actuelle.

Ce que cela signifie en pratique :

- `--bind here` conserve la même surface de chat. Sur Discord, le channel actuel reste le channel actuel.
- `--bind here` peut toujours créer une nouvelle session ACP si vous lancez un nouveau travail. La liaison attache cette session à la conversation actuelle.
- `--bind here` ne crée pas par lui-même un fil Discord ou un sujet Telegram enfant.
- Le runtime ACP peut toujours avoir son propre répertoire de travail (`cwd`) ou un espace de travail géré par le backend sur le disque. Cet espace de travail runtime est distinct de la surface de chat et n'implique pas un nouveau fil de messagerie.
- Si vous lancez vers un agent ACP différent et ne transmettez pas `--cwd`, OpenClaw hérite par défaut de l'espace de travail de **l'agent cible**, et non de celui du demandeur.
- Si ce chemin d'espace de travail hérité est manquant (`ENOENT`/`ENOTDIR`), OpenClaw revient au cwd par défaut du backend au lieu de réutiliser silencieusement le mauvais arbre.
- Si l'espace de travail hérité existe mais ne peut pas être accessible (par exemple `EACCES`), spawn renvoie la véritable erreur d'accès au lieu d'abandonner `cwd`.

Modèle mental :

- interface de discussion : là où les gens continuent de parler (`Discord channel`, `Telegram topic`, `iMessage chat`)
- session ACP : l'état d'exécution durable Codex/Claude/Gemini vers lequel OpenClaw achemine
- fil/sujet enfant : une interface de messagerie supplémentaire optionnelle créée uniquement par `--thread ...`
- espace de travail d'exécution : l'emplacement du système de fichiers où le harnais s'exécute (`cwd`, extraction de repo, espace de travail backend)

Exemples :

- `/acp spawn codex --bind here` : conserver cette discussion, générer ou attacher une session ACP Codex, et y router les futurs messages
- `/acp spawn codex --thread auto` : OpenClaw peut créer un fil/sujet enfant et lier la session ACP à cet endroit
- `/acp spawn codex --bind here --cwd /workspace/repo` : même liaison de discussion que ci-dessus, mais Codex s'exécute dans `/workspace/repo`

Prise en charge de la liaison de conversation actuelle :

- Les canaux de discussion/messagerie qui annoncent la prise en charge de la liaison de conversation en cours peuvent utiliser `--bind here` via le chemin partagé de liaison de conversation.
- Les canaux avec une sémantique de fil/topic personnalisée peuvent toujours fournir une canonicalisation spécifique au canal derrière la même interface partagée.
- `--bind here` signifie toujours « lier la conversation actuelle sur place ».
- Les liaisons de conversation actuelle génériques utilisent le stockage de liaison OpenClaw partagé et survivent aux redémarrages normaux de la passerelle.

Notes :

- `--bind here` et `--thread ...` s'excluent mutuellement sur `/acp spawn`.
- Sur Discord, `--bind here` lie le channel ou le fil actuel sur place. `spawnAcpSessions` n'est requis que lorsque OpenClaw doit créer un fil enfant pour `--thread auto|here`.
- Si le channel actif n'expose pas de liaisons ACP pour la conversation actuelle, OpenClaw renvoie un message clair indiquant que ce n'est pas pris en charge.
- `resume` et les questions « new session » sont des questions de session ACP, et non des questions de channel. Vous pouvez réutiliser ou remplacer l'état d'exécution sans changer l'interface de discussion actuelle.

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

Pour les flux de travail non éphémères, configurez les liaisons ACP persistantes dans les entrées de niveau supérieur `bindings[]`.

### Modèle de liaison

- `bindings[].type="acp"` marque une liaison de conversation ACP persistante.
- `bindings[].match` identifie la conversation cible :
  - Discord channel ou fil : Discord + `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Sujet de forum Telegram : Telegram + `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - Chat de groupe/DM BlueBubbles : BlueBubbles + `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Privilégiez `chat_id:*` ou `chat_identifier:*` pour les liaisons de groupe stables.
  - Chat de groupe/DM iMessage : iMessage + `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Privilégiez `chat_id:*` pour les liaisons de groupe stables.
- `bindings[].agentId` est l'ID de l'agent propriétaire OpenClaw.
- Les remplacements ACP facultatifs se trouvent sous `bindings[].acp` :
  - `mode` (`persistent` ou `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Runtime defaults per agent

Utilisez `agents.list[].runtime` pour définir les valeurs par défaut ACP une fois par agent :

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (ID de harnais, par exemple `codex` ou `claude`)
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
- Pour les créations d'ACP inter-agents sans `cwd` explicite, OpenClaw hérite de l'espace de travail de l'agent cible à partir de la configuration de l'agent.
- Les chemins d'espace de travail hérités manquants reviennent au cwd par défaut du backend ; les échecs d'accès non manquants apparaissent comme des erreurs de création.

## Start ACP sessions (interfaces)

### Depuis `sessions_spawn`

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

- `runtime` est par défaut `subagent`, définissez donc `runtime: "acp"` explicitement pour les sessions ACP.
- Si `agentId` est omis, OpenClaw utilise `acp.defaultAgent` lorsqu'il est configuré.
- `mode: "session"` nécessite `thread: true` pour maintenir une conversation liée persistante.

Détails de l'interface :

- `task` (requis) : invite initiale envoyée à la session ACP.
- `runtime` (requis pour ACP) : doit être `"acp"`.
- `agentId` (facultatif) : identifiant du harnais cible ACP. Revient à `acp.defaultAgent` s'il est défini.
- `thread` (facultatif, par défaut `false`) : demande le flux de liaison de fil de discussion lorsque pris en charge.
- `mode` (facultatif) : `run` (unique) ou `session` (persistant).
  - la valeur par défaut est `run`
  - si `thread: true` et le mode sont omis, OpenClaw peut par défaut adopter un comportement persistant selon le chemin d'exécution
  - `mode: "session"` nécessite `thread: true`
- `cwd` (facultatif) : répertoire de travail d'exécution demandé (validé par la stratégie de backend/d'exécution). S'il est omis, le spawn ACP hérite de l'espace de travail de l'agent cible lorsqu'il est configuré ; les chemins hérités manquants reviennent aux valeurs par défaut du backend, tandis que les erreurs d'accès réelles sont renvoyées.
- `label` (facultatif) : libellé orienté opérateur utilisé dans le texte de la session/bannière.
- `resumeSessionId` (facultatif) : reprend une session ACP existante au lieu d'en créer une nouvelle. L'agent rejoue son historique de conversation via `session/load`. Nécessite `runtime: "acp"`.
- `streamTo` (facultatif) : `"parent"` diffuse les résumés de progression de l'exécution ACP initiale vers la session du demandeur sous forme d'événements système.
  - Lorsqu'elles sont disponibles, les réponses acceptées incluent `streamLogPath` pointant vers un journal JSONL délimité à la session (`<sessionId>.acp-stream.jsonl`) que vous pouvez suivre pour l'historique complet du relais.
- `model` (optionnel) : substitution explicite du model pour la session enfant ACP. Pris en compte pour `runtime: "acp"` afin que l'enfant utilise le model demandé au lieu de revenir silencieusement au model par défaut de l'agent cible.

## Modèle de livraison

Les sessions ACP peuvent être soit des espaces de travail interactifs, soit des tâches en arrière-plan appartenant au parent. Le chemin de livraison dépend de cette forme.

### Sessions ACP interactives

Les sessions interactives sont destinées à continuer la discussion sur une surface de chat visible :

- `/acp spawn ... --bind here` lie la conversation actuelle à la session ACP.
- `/acp spawn ... --thread ...` lie un thread/sujet de channel à la session ACP.
- Les `bindings[].type="acp"` configurés de manière persistante acheminent les conversations correspondantes vers la même session ACP.

Les messages de suivi dans la conversation liée sont acheminés directement vers la session ACP, et la sortie ACP est renvoyée vers ce même channel/thread/sujet.

### Sessions ACP ponctuelles détenues par le parent

Les sessions ACP ponctuelles générées par une autre exécution d'agent sont des enfants en arrière-plan, similaires aux sous-agents :

- Le parent demande du travail avec `sessions_spawn({ runtime: "acp", mode: "run" })`.
- L'enfant s'exécute dans sa propre session de harnais ACP.
- La complétion est renvoyée via le chemin d'annonce interne de complétion de tâche.
- Le parent réécrit le résultat de l'enfant avec la voix normale de l'assistant lorsqu'une réponse orientée utilisateur est utile.

Ne traitez pas ce chemin comme un chat de pair à pair entre le parent et l'enfant. L'enfant dispose déjà d'un channel de complétion vers le parent.

### `sessions_send` et livraison A2A

`sessions_send` peut cibler une autre session après le démarrage. Pour les sessions de pair normales, OpenClaw utilise un chemin de suivi agent-à-agent (A2A) après l'injection du message :

- attendre la réponse de la session cible
- permettre facultativement au demandeur et à la cible d'échanger un nombre limité de tours de suivi
- demander à la cible de produire un message d'annonce
- livrer cette annonce au channel ou thread visible

Ce chemin A2A est un repli pour les envois de pairs où l'expéditeur a besoin d'un suivi visible. Il reste activé lorsqu'une session non liée peut voir et envoyer un message à une cible ACP, par exemple sous de larges paramètres `tools.sessions.visibility`.

OpenClaw ignore le suivi A2A uniquement lorsque le demandeur est le parent de son propre enfant ACP ponctuel possédé par ce parent. Dans ce cas, l'exécution d'A2A après l'achèvement de la tâche peut réveiller le parent avec le résultat de l'enfant, renvoyer la réponse du parent vers l'enfant et créer une boucle d'écho parent/enfant. Le résultat `sessions_send` signale `delivery.status="skipped"` pour ce cas d'enfant possédé car le chemin d'achèvement est déjà responsable du résultat.

### Reprendre une session existante

Utilisez `resumeSessionId` pour continuer une session ACP précédente au lieu d'en commencer une nouvelle. L'agent rejoue son historique de conversation via `session/load`, il reprend donc avec le contexte complet de ce qui s'est passé auparavant.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Cas d'usage courants :

- Transférer une session Codex de votre ordinateur portable à votre téléphone — dites à votre agent de reprendre là où vous vous êtes arrêté
- Continuer une session de codage que vous avez commencée de manière interactive dans le CLI, désormais en mode sans tête via votre agent
- Reprendre le travail qui a été interrompu par un redémarrage de la passerelle ou un délai d'inactivité

Notes :

- `resumeSessionId` nécessite `runtime: "acp"` — renvoie une erreur s'il est utilisé avec le runtime de sous-agent.
- `resumeSessionId` restaure l'historique de la conversation ACP en amont ; `thread` et `mode` s'appliquent toujours normalement à la nouvelle session OpenClaw que vous créez, donc `mode: "session"` nécessite toujours `thread: true`.
- L'agent cible doit prendre en charge `session/load` (Codex et Claude Code le font).
- Si l'ID de session n'est pas trouvé, le lancement échoue avec une erreur claire — aucun retour silencieux à une nouvelle session.

### Test de fumée de l'opérateur

Utilisez ceci après un déploiement de passerelle lorsque vous souhaitez une vérification rapide en direct que le lancement ACP
fonctionne réellement de bout en bout, et ne se contente pas de réussir les tests unitaires.

Porte recommandée :

1. Vérifiez la version/le commit de la passerelle déployée sur l'hôte cible.
2. Confirmez que la source déployée inclut l'acceptation de lignée ACP dans
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`).
3. Ouvrez une session de pont ACPX temporaire vers un agent en direct (par exemple
   `razor(main)` sur `jpclawhq`).
4. Demandez à cet agent d'appeler `sessions_spawn` avec :
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - tâche : `Reply with exactly LIVE-ACP-SPAWN-OK`
5. Vérifiez que l'agent signale :
   - `accepted=yes`
   - un `childSessionKey` réel
   - aucune erreur de validateur
6. Nettoyez la session temporaire du pont ACPX.

Exemple de prompt pour l'agent en direct :

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Notes :

- Conservez ce test de fumée sur `mode: "run"` à moins que vous ne testiez intentionnellement
  des sessions ACP persistantes liées aux fils de discussion.
- N'exigez pas `streamTo: "parent"` pour la porte de base. Ce chemin dépend
  des capacités du demandeur/de la session et constitue une vérification d'intégration distincte.
- Traitez les tests `mode: "session"` liés aux fils de discussion comme un second passage d'intégration
  plus riche à partir d'un fil Discord réel ou d'un sujet Telegram.

## Compatibilité du bac à sable

Les sessions ACP s'exécutent actuellement sur l'hôte d'exécution, et non à l'intérieur du bac à sable OpenClaw.

Limitations actuelles :

- Si la session du demandeur est isolée dans un bac à sable, les créations ACP sont bloquées pour `sessions_spawn({ runtime: "acp" })` et `/acp spawn`.
  - Erreur : `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` avec `runtime: "acp"` ne prend pas en charge `sandbox: "require"`.
  - Erreur : `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Utilisez `runtime: "subagent"` lorsque vous avez besoin d'une exécution appliquée par le bac à sable.

### Depuis la commande `/acp`

Utilisez `/acp spawn` pour un contrôle explicite de l'opérateur depuis le chat lorsque cela est nécessaire.

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
   - puis l'ID de session de forme UUID
   - puis l'étiquette
2. Liaison du fil de discussion actuel (si cette conversation/fil est liée à une session ACP)
3. Repli vers la session du demandeur actuel

Les liaisons de conversation actuelle et les liaisons de fil de discussion participent toutes deux à l'étape 2.

Si aucune cible n'est résolue, OpenClaw renvoie une erreur claire (`Unable to resolve session target: ...`).

## Modes de liaison de spawn

`/acp spawn` prend en charge `--bind here|off`.

| Mode   | Comportement                                                                    |
| ------ | ------------------------------------------------------------------------------- |
| `here` | Liez la conversation active actuelle en place ; échouez si aucune n'est active. |
| `off`  | Ne créez pas de liaison de conversation actuelle.                               |

Notes :

- `--bind here` est le chemin d'opérateur le plus simple pour « rendre ce channel ou chat pris en charge par Codex ».
- `--bind here` ne crée pas de fil de discussion enfant.
- `--bind here` n'est disponible que sur les channels qui exposent la prise en charge de la liaison de conversation actuelle.
- `--bind` et `--thread` ne peuvent pas être combinés dans le même appel `/acp spawn`.

## Modes de fil de discussion de spawn

`/acp spawn` prend en charge `--thread auto|here|off`.

| Mode   | Comportement                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| `auto` | Dans un fil de discussion actif : liez ce fil. En dehors d'un fil : créez/liez un fil enfant lorsque pris en charge. |
| `here` | Nécessite le fil de discussion actif actuel ; échouez si vous n'en êtes pas dans un.                                 |
| `off`  | Aucune liaison. La session démarre non liée.                                                                         |

Notes :

- Sur les surfaces sans liaison de fil de discussion, le comportement par défaut est effectivement `off`.
- Le spawn lié à un fil nécessite la prise en charge de la politique de channel :
  - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`
- Utilisez `--bind here` lorsque vous souhaitez épingler la conversation actuelle sans créer de fil de discussion enfant.

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

`/acp status` affiche les options d'exécution effectives et, si disponible, les identifiants de session au niveau de l'exécution et du backend.

Certains contrôles dépendent des fonctionnalités du backend. Si un backend ne prend pas en charge un contrôle, OpenClaw renvoie une erreur claire indiquant que le contrôle n'est pas pris en charge.

## Livre de recettes des commandes ACP

| Commande             | Ce qu'elle fait                                                                                | Exemple                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Créer une session ACP ; liaison actuelle ou de filtre de discussion (thread bind) facultative. | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Annuler le tour en cours pour la session cible.                                                | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Envoyer une instruction de direction (steer) à la session en cours d'exécution.                | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Fermer la session et dissocier les cibles de fil de discussion.                                | `/acp close`                                                  |
| `/acp status`        | Afficher le backend, le mode, l'état, les options d'exécution, les capacités.                  | `/acp status`                                                 |
| `/acp set-mode`      | Définir le mode d'exécution pour la session cible.                                             | `/acp set-mode plan`                                          |
| `/acp set`           | Écriture générique d'option de configuration d'exécution.                                      | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Définir le répertoire de travail d'exécution (override).                                       | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Définir le profil de politique d'approbation.                                                  | `/acp permissions strict`                                     |
| `/acp timeout`       | Définir le délai d'attente de l'exécution (secondes).                                          | `/acp timeout 120`                                            |
| `/acp model`         | Définir le modèle d'exécution (override).                                                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Supprimer les remplacements d'options d'exécution de session.                                  | `/acp reset-options`                                          |
| `/acp sessions`      | Lister les sessions ACP récentes du stockage.                                                  | `/acp sessions`                                               |
| `/acp doctor`        | Santé du backend, capacités, corrections actionnables.                                         | `/acp doctor`                                                 |
| `/acp install`       | Imprimer les étapes d'installation et d'activation déterministes.                              | `/acp install`                                                |

`/acp sessions` lit le magasin pour la session liée ou requérante actuelle. Les commandes qui acceptent les jetons `session-key`, `session-id` ou `session-label` résolvent les cibles via la découverte de session de passerelle, y compris les racines `session.store` personnalisées par agent.

## Mappage des options d'exécution

`/acp` dispose de commandes pratiques et d'un définisseur générique.

Opérations équivalentes :

- `/acp model <id>` correspond à la clé de configuration d'exécution `model`.
- `/acp permissions <profile>` correspond à la clé de configuration d'exécution `approval_policy`.
- `/acp timeout <seconds>` correspond à la clé de configuration d'exécution `timeout`.
- `/acp cwd <path>` met à jour directement la substitution du cwd d'exécution.
- `/acp set <key> <value>` est le chemin générique.
  - Cas particulier : `key=cwd` utilise le chemin de substitution du cwd.
- `/acp reset-options` efface toutes les substitutions d'exécution pour la session cible.

## prise en charge du harnais acpx (actuelle)

Alias de harnais intégrés acpx actuels :

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

Lorsque OpenClaw utilise le backend acpx, privilégiez ces valeurs pour `agentId`, sauf si votre configuration acpx définit des alias d'agents personnalisés.
Si votre installation locale de Cursor expose toujours l'ACP en tant que `agent acp`, substituez la commande d'agent `cursor` dans votre configuration acpx au lieu de modifier la valeur par défaut intégrée.

L'utilisation directe de la CLI acpx peut également cibler des adaptateurs arbitraires via `--agent <command>`, mais cette échappatoire brute est une fonctionnalité de la CLI acpx (et non le chemin normal `agentId` d'CLI).

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

La configuration de la liaison de thread est spécifique à l'adaptateur de canal. Exemple pour Discord :

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

Si le lancement d'ACP lié à un thread ne fonctionne pas, vérifiez d'abord le paramètre d'adaptateur :

- Discord : `channels.discord.threadBindings.spawnAcpSessions=true`

Les liaisons de conversation actuelle ne nécessitent pas la création de threads enfants. Elles nécessitent un contexte de conversation actif et un adaptateur de canal qui expose les liaisons de conversation ACP.

Voir [Référence de configuration](/fr/gateway/configuration-reference).

## Configuration du plugin pour le backend acpx

Les nouvelles installations incluent le plugin d'exécution groupé `acpx` activé par défaut, donc l'ACP
fonctionne généralement sans étape d'installation de plugin manuelle.

Commencez par :

```text
/acp doctor
```

Si vous avez désactivé `acpx`, refusé via `plugins.allow` / `plugins.deny`, ou souhaitez
passer à une extraction de développement locale, utilisez le chemin de plugin explicite :

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

### Commande acpx et configuration de version

Par défaut, le plugin backend acpx groupé (`acpx`) utilise le binaire épinglé local au plugin :

1. La commande par défaut est le `node_modules/.bin/acpx` local au plugin à l'intérieur du package de plugin ACPX.
2. La version attendue par défaut correspond à l'épinglage de l'extension.
3. Le démarrage enregistre le backend ACP immédiatement comme non prêt.
4. Une tâche de vérification en arrière-plan vérifie `acpx --version`.
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
- Lorsque `command` pointe vers un binaire/chemin personnalisé, l'auto-installation locale au plugin est désactivée.
- Le démarrage de OpenClaw reste non bloquant pendant l'exécution de la vérification de l'état du backend.

Voir [Plugins](/fr/tools/plugin).

### Installation automatique des dépendances

Lorsque vous installez OpenClaw globalement avec `npm install -g openclaw`, les dépendances
runtime d'acpx (binaires spécifiques à la plateforme) sont installées automatiquement
via un hook postinstall. Si l'installation automatique échoue, la passerelle démarre
cormais normalement et signale la dépendance manquante via `openclaw acp doctor`.

### Pont MCP des outils de plugin

Par défaut, les sessions ACPX n'exposent **pas** les outils enregistrés par le plugin
OpenClaw au harnais ACP.

Si vous souhaitez que les agents ACP tels que Codex ou Claude Code appellent les outils
de plugin OpenClaw installés tels que la rappel/stockage de mémoire, activez le pont dédié :

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Ce que cela fait :

- Injecte un serveur MCP intégré nommé `openclaw-plugin-tools` dans l'amorçage
  de la session ACPX.
- Expose les outils de plugin déjà enregistrés par les plugins OpenClaw
  installés et activés.
- Garde la fonctionnalité explicite et désactivée par défaut.

Notes de sécurité et de confiance :

- Cela étend la surface d'outils du harnais ACP.
- Les agents ACP n'ont accès qu'aux outils de plugin déjà actifs dans la passerelle.
- Traitez cela avec la même limite de confiance que de laisser ces plugins s'exécuter dans
  OpenClaw lui-même.
- Examinez les plugins installés avant de l'activer.

Les `mcpServers` personnalisés fonctionnent toujours comme avant. Le pont d'outils de plugin intégré est une
commodité d'adhésion supplémentaire, et non un remplacement de la configuration générique de serveur MCP.

### Pont MCP des outils OpenClaw

Par défaut, les sessions ACPX n'exposent **pas** non plus les outils intégrés OpenClaw via
MCP. Activez le pont core-tools séparé lorsqu'un agent ACP a besoin d'outils
intégrés sélectionnés tels que `cron` :

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

Ce que cela fait :

- Injecte un serveur MCP intégré nommé `openclaw-tools` dans l'amorçage
  de la session ACPX.
- Expose les outils intégrés sélectionnés d'OpenClaw. Le serveur initial expose `cron`.
- Garde l'exposition des core-tools explicite et désactivée par défaut.

### Configuration du délai d'attente d'exécution

Le plugin `acpx` inclus par défaut définit le runtime intégré sur un délai d'attente
de 120 secondes. Cela donne suffisamment de temps aux harnais plus lents tels que Gemini CLI pour terminer
le démarrage et l'initialisation de l'ACP. Modifiez-le si votre hôte nécessite une
limite d'exécution différente :

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

Redémarrez la passerelle après avoir modifié cette valeur.

### Configuration de l'agent de sonde de santé

Le plugin groupé `acpx` sonde un agent de harnais tout en décidant si le backend d'exécution intégré est prêt. Il est configuré par défaut sur `codex`. Si votre déploiement utilise un agent ACP par défaut différent, définissez l'agent de sonde avec le même identifiant :

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

Redémarrez la passerelle après avoir modifié cette valeur.

## Configuration des autorisations

Les sessions ACP s'exécutent de manière non interactive — il n'y a pas de TTY pour approuver ou refuser les invites d'autorisation d'écriture de fichiers et d'exécution de shell. Le plugin acpx fournit deux clés de configuration qui contrôlent la gestion des autorisations :

Ces autorisations de harnais ACPX sont distinctes des approbations d'exécution OpenClaw et distinctes des indicateurs de contournement des fournisseurs de backend CLI tels que CLI `--permission-mode bypassPermissions`. `approve-all` ACPX est le commutateur de rupture de verre au niveau du harnais pour les sessions ACP.

### `permissionMode`

Contrôle les opérations que l'agent de harnais peut effectuer sans invite.

| Valeur          | Comportement                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `approve-all`   | Approuver automatiquement toutes les écritures de fichiers et les commandes shell.                        |
| `approve-reads` | Approuver automatiquement les lectures uniquement ; les écritures et l'exécution nécessitent des invites. |
| `deny-all`      | Refuser toutes les invites d'autorisation.                                                                |

### `nonInteractivePermissions`

Contrôle ce qui se passe lorsqu'une invite d'autorisation devrait être affichée mais qu'aucun TTY interactif n'est disponible (ce qui est toujours le cas pour les sessions ACP).

| Valeur | Comportement                                                                 |
| ------ | ---------------------------------------------------------------------------- |
| `fail` | Interrompre la session avec `AcpRuntimeError`. **(par défaut)**              |
| `deny` | Refuser silencieusement l'autorisation et continuer (dégradation gracieuse). |

### Configuration

Définir via la configuration du plugin :

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Redémarrez la passerelle après avoir modifié ces valeurs.

> **Important :** OpenClaw est configuré par défaut actuellement sur `permissionMode=approve-reads` et `nonInteractivePermissions=fail`. Dans les sessions ACP non interactives, toute écriture ou exécution déclenchant une invite d'autorisation peut échouer avec `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si vous devez restreindre les autorisations, définissez `nonInteractivePermissions` sur `deny` afin que les sessions se dégradent gracieusement au lieu de planter.

## Dépannage

| Symptôme                                                                    | Cause probable                                                                                   | Correction                                                                                                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Plugin backend manquant ou désactivé.                                                            | Installez et activez le plugin backend, puis exécutez `/acp doctor`.                                                                                                                                                   |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP désactivé globalement.                                                                       | Définissez `acp.enabled=true`.                                                                                                                                                                                         |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Répartition à partir des messages de discussion normaux désactivée.                              | Définissez `acp.dispatch.enabled=true`.                                                                                                                                                                                |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent absent de la liste autorisée.                                                              | Utilisez un `agentId` autorisé ou mettez à jour `acp.allowedAgents`.                                                                                                                                                   |
| `Unable to resolve session target: ...`                                     | Jeton de clé/id/étiquette incorrect.                                                             | Exécutez `/acp sessions`, copiez la clé/étiquette exacte, réessayez.                                                                                                                                                   |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` utilisé sans conversation liable active.                                           | Déplacez-vous vers la conversation/le channel cible et réessayez, ou utilisez un spawn non lié.                                                                                                                        |
| `Conversation bindings are unavailable for <channel>.`                      | L'adaptateur manque de capacité de liaison ACP de conversation actuelle.                         | Utilisez `/acp spawn ... --thread ...` lorsque pris en charge, configurez `bindings[]` de niveau supérieur, ou passez à un channel pris en charge.                                                                     |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` utilisé hors contexte de discussion.                                             | Déplacez-vous vers la discussion cible ou utilisez `--thread auto`/`off`.                                                                                                                                              |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Un autre utilisateur possède la cible de liaison active.                                         | Reliez en tant que propriétaire ou utilisez une conversation ou une discussion différente.                                                                                                                             |
| `Thread bindings are unavailable for <channel>.`                            | L'adaptateur manque de capacité de liaison de discussion.                                        | Utilisez `--thread off` ou passez à un adaptateur/channel pris en charge.                                                                                                                                              |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | Le runtime ACP est côté hôte ; la session demandeur est sandboxed.                               | Utilisez `runtime="subagent"` depuis des sessions sandboxed, ou exécutez un spawn ACP depuis une session non-sandboxed.                                                                                                |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` demandé pour le runtime ACP.                                                 | Utilisez `runtime="subagent"` pour le sandboxing requis, ou utilisez ACP avec `sandbox="inherit"` depuis une session non-sandboxed.                                                                                    |
| Métadonnées ACP manquantes pour la session liée                             | Métadonnées de session ACP obsolètes/supprimées.                                                 | Recréez avec `/acp spawn`, puis reliez/focalisez la discussion.                                                                                                                                                        |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloque les écritures/exéc dans une session ACP non interactive.                 | Définissez `plugins.entries.acpx.config.permissionMode` sur `approve-all` et redémarrez la passerelle. Voir [Permission configuration](#permission-configuration).                                                     |
| La session ACP échoue rapidement avec peu de sortie                         | Les invites d'autorisation sont bloquées par `permissionMode`/`nonInteractivePermissions`.       | Vérifiez les journaux de la passerelle pour `AcpRuntimeError`. Pour des autorisations complètes, définissez `permissionMode=approve-all` ; pour une dégradation élégante, définissez `nonInteractivePermissions=deny`. |
| La session ACP stalle indéfiniment après avoir terminé le travail           | Le processus du harnais s'est terminé mais la session ACP n'a pas signalé la fin de l'exécution. | Surveillez avec `ps aux \| grep acpx` ; tuez manuellement les processus périmés.                                                                                                                                       |
