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

Les sessions [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) permettent à OpenClaw d'exécuter des harnais de codage externes (par exemple Pi, Claude Code, Codex, Cursor, Copilot, OpenClaw ACP, OpenCode, Gemini CLI et autres harnais ACPX pris en charge) via un plugin principal ACP.

Si vous demandez à OpenClaw en langage clair de « exécuter ceci dans Codex » ou de « démarrer Claude Code dans un fil », OpenClaw doit acheminer cette demande vers l'exécution ACP (et non l'exécution des sous-agents natifs). Chaque lancement de session ACP est suivi en tant que [tâche d'arrière-plan](/en/automation/tasks).

Si vous souhaitez que Codex ou Claude Code se connecte en tant que client MCP externe directement
aux conversations de canal OpenClaw existantes, utilisez [`openclaw mcp serve`](/en/cli/mcp)
au lieu de l'ACP.

## Quelle page me faut-il ?

Il existe trois surfaces voisines qu'il est facile de confondre :

| Vous souhaitez...                                                                           | Utiliser ceci                 | Notes                                                                                                                    |
| ------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Exécuter Codex, Claude Code, Gemini CLI ou un autre harnais externe _via_ OpenClaw          | Cette page : Agents ACP       | Sessions liées au chat, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tâches d'arrière-plan, contrôles d'exécution |
| Exposer une session OpenClaw Gateway _en tant que_ serveur ACP pour un éditeur ou un client | [`openclaw acp`](/en/cli/acp) | Mode pont. L'IDE/le client parle ACP à OpenClaw via stdio/WebSocket                                                      |

## Cela fonctionne-t-il hors de la boîte ?

En général, oui.

- Les nouvelles installations sont désormais livrées avec le plugin d'exécution `acpx` groupé activé par défaut.
- Le plugin `acpx` groupé préfère son binaire `acpx` épinglé localement au plugin.
- Au démarrage, OpenClaw sonde ce binaire et se répare automatiquement si nécessaire.
- Commencez par `/acp doctor` si vous souhaitez une vérification rapide de disponibilité.

Ce qui peut encore arriver à la première utilisation :

- Un adaptateur de harnais cible peut être récupéré à la demande avec `npx` la première fois que vous utilisez ce harnais.
- L'authentification du fournisseur doit toujours exister sur l'hôte pour ce harnais.
- Si l'hôte n'a pas d'accès npm/réseau, les récupérations d'adaptateurs au premier lancement peuvent échouer jusqu'à ce que les caches soient préchauffés ou que l'adaptateur soit installé d'une autre manière.

Exemples :

- `/acp spawn codex` : OpenClaw devrait être prêt à amorcer `acpx`, mais l'adaptateur ACP Codex peut encore avoir besoin d'une récupération au premier lancement.
- `/acp spawn claude` : même histoire pour l'adaptateur ACP Claude, plus l'auth côté Claude sur cet hôte.

## Flux d'opérateur rapide

Utilisez ceci lorsque vous souhaitez un guide opérationnel `/acp` pratique :

1. Lancer une session :
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. Travaillez dans la conversation liée ou le fil (ou ciblez explicitement cette clé de session).
3. Vérifier l'état du runtime :
   - `/acp status`
4. Ajustez les options du runtime selon les besoins :
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Stimuler une session active sans remplacer le contexte :
   - `/acp steer tighten logging and continue`
6. Arrêter le travail :
   - `/acp cancel` (arrêter le tour actuel), ou
   - `/acp close` (fermer la session + supprimer les liaisons)

## Démarrage rapide pour les humains

Exemples de demandes naturelles :

- "Liez ce Discord à Codex."
- "Lancez une session Codex persistante dans un fil ici et gardez-la concentrée."
- "Exécutez ceci en tant que session ACP Claude Code unique et résumez le résultat."
- "Liez cette discussion iMessage à Codex et gardez les suites dans le même espace de travail."
- "Utilisez le CLI Gemini pour cette tâche dans un fil, puis conservez les suites dans ce même fil."

Ce que OpenClaw devrait faire :

1. Choisissez `runtime: "acp"`.
2. Résolvez la cible du harnais demandée (`agentId`, par exemple `codex`).
3. Si une liaison à la conversation actuelle est demandée et que le channel actif la prend en charge, liez la session ACP à cette conversation.
4. Sinon, si une liaison de fil est demandée et que le channel actuel la prend en charge, liez la session ACP au fil.
5. Acheminez les messages liés de suivi vers cette même session ACP jusqu'à ce qu'elle soit désactivée/fermée/expirée.

## ACP par rapport aux sous-agents

Utilisez ACP lorsque vous souhaitez un runtime de harnais externe. Utilisez les sous-agents lorsque vous souhaitez des exécutions déléguées natives OpenClaw.

| Zone                            | Session ACP                           | Exécution de sous-agent               |
| ------------------------------- | ------------------------------------- | ------------------------------------- |
| Runtime                         | Plugin backend ACP (par exemple acpx) | Runtime de sous-agent natif OpenClaw  |
| Clé de session                  | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`     |
| Commandes principales           | `/acp ...`                            | `/subagents ...`                      |
| Outil de lancement (Spawn tool) | `sessions_spawn` avec `runtime:"acp"` | `sessions_spawn` (runtime par défaut) |

Voir aussi [Sous-agents](/en/tools/subagents).

## Comment ACP exécute Claude Code

Pour Claude Code via ACP, la pile est la suivante :

1. Plan de contrôle de session ACP OpenClaw
2. plugin de runtime `acpx` inclus
3. Adaptateur ACP Claude
4. Mécanisme de runtime/session côté Claude

Distinction importante :

- ACP Claude est une session de harnais avec des contrôles ACP, la reprise de session, le suivi des tâches en arrière-plan et une liaison de conversation/fil optionnelle.
  Pour les opérateurs, la règle pratique est :

- vous voulez `/acp spawn`, des sessions liables, des contrôles de runtime ou un travail de harnais persistant : utilisez ACP

## Sessions liées

### Liens de conversation actuelle

Utilisez `/acp spawn <harness> --bind here` lorsque vous souhaitez que la conversation actuelle devienne un espace de travail ACP durable sans créer de fil enfant.

Comportement :

- OpenClaw conserve la propriété du transport, de l'authentification, de la sécurité et de la livraison du canal.
- La conversation actuelle est épinglée à la clé de session ACP générée.
- Les messages de suivi dans cette conversation sont acheminés vers la même session ACP.
- `/new` et `/reset` réinitialisent la même session ACP liée sur place.
- `/acp close` ferme la session et supprime la liaison de conversation actuelle.

Ce que cela signifie en pratique :

- `--bind here` conserve la même surface de discussion. Sur Discord, le canal actuel reste le canal actuel.
- `--bind here` peut toujours créer une nouvelle session ACP si vous lancez un nouveau travail. La liaison attache cette session à la conversation actuelle.
- `--bind here` ne crée pas de fil Discord ou de sujet Telegram enfant par lui-même.
- Le runtime ACP peut toujours avoir son propre répertoire de travail (`cwd`) ou son espace de travail géré par le backend sur le disque. Cet espace de travail runtime est distinct de la surface de discussion et n'implique pas un nouveau fil de messagerie.
- Si vous effectuez un spawn vers un autre agent ACP et que vous ne passez pas `--cwd`, OpenClaw hérite par défaut de l'espace de travail de **l'agent cible**, et non celui du demandeur.
- Si ce chemin d'espace de travail hérité est manquant (`ENOENT`/`ENOTDIR`), OpenClaw revient par défaut au cwd du backend au de réutiliser silencieusement le mauvais arbre.
- Si l'espace de travail hérité existe mais ne peut pas être accessible (par exemple `EACCES`), le spawn renvoie la véritable erreur d'accès au lieu d'abandonner `cwd`.

Modèle mental :

- surface de discussion : l'endroit où les gens continuent de discuter (`Discord channel`, `Telegram topic`, `iMessage chat`)
- session ACP : l'état d'exécution durable Codex/Claude/Gemini vers lequel OpenClaw achemine
- fil de discussion/sujet enfant : une surface de messagerie supplémentaire facultative créée uniquement par `--thread ...`
- espace de travail d'exécution : l'emplacement du système de fichiers où le harnais s'exécute (`cwd`, extraction de dépôt, espace de travail backend)

Exemples :

- `/acp spawn codex --bind here` : conserver cette discussion, créer ou attacher une session ACP Codex, et acheminer les futurs messages ici vers celle-ci
- `/acp spawn codex --thread auto` : OpenClaw peut créer un fil de discussion/sujet enfant et y lier la session ACP
- `/acp spawn codex --bind here --cwd /workspace/repo` : même liaison de discussion que ci-dessus, mais Codex s'exécute dans `/workspace/repo`

Prise en charge de la liaison de conversation actuelle :

- Les canaux de discussion/message qui annoncent la prise en charge de la liaison de conversation actuelle peuvent utiliser `--bind here` via le chemin de liaison de conversation partagé.
- Les canaux avec une sémantique de fil de discussion/sujet personnalisée peuvent toujours fournir une canonisation spécifique au canal derrière la même interface partagée.
- `--bind here` signifie toujours « lier la conversation actuelle en place ».
- Les liaisons de conversation actuelle génériques utilisent le magasin de liaisons partagé OpenClaw et survivent aux redémarrages normaux de la passerelle.

Notes :

- `--bind here` et `--thread ...` s'excluent mutuellement sur `/acp spawn`.
- Sur Discord, `--bind here` lie le channel ou le fil de discussion actuel en place. `spawnAcpSessions` n'est requis que lorsqu'OpenClaw doit créer un fil enfant pour `--thread auto|here`.
- Si le channel actif n'expose pas de liaisons ACP de conversation actuelle, OpenClaw renvoie un message clair indiquant que ce n'est pas pris en charge.
- `resume` et les questions de « nouvelle session » sont des questions de session ACP, et non des questions de channel. Vous pouvez réutiliser ou remplacer l'état d'exécution sans changer la surface de chat actuelle.

### Sessions liées aux fils de discussion

Lorsque les liaisons de fils sont activées pour un adaptateur de channel, les sessions ACP peuvent être liées aux fils :

- OpenClaw lie un fil à une session ACP cible.
- Les messages de suivi dans ce fil sont acheminés vers la session ACP liée.
- La sortie ACP est renvoyée au même fil.
- La perte de focus, la fermeture, l'archivage, l'expiration par inactivité ou l'expiration par ancienneté maximale supprime la liaison.

La prise en charge de la liaison de fils est spécifique à l'adaptateur. Si l'adaptateur de channel actif ne prend pas en charge les liaisons de fils, OpenClaw renvoie un message clair indiquant que ce n'est pas pris en charge ou indisponible.

Drapeaux de fonctionnalités requis pour l'ACP liée aux fils :

- `acp.enabled=true`
- `acp.dispatch.enabled` est activé par défaut (définissez `false` pour mettre en pause la répartition ACP)
- Drapeau de création de fils ACP de l'adaptateur de channel activé (spécifique à l'adaptateur)
  - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`

### Channels prenant en charge les fils

- Tout adaptateur de channel qui expose la capacité de liaison de session/fil.
- Support intégré actuel :
  - Fils/channels Discord
  - Sujets Telegram (sujets de forum dans les groupes/super-groupes et sujets DM)
- Les channels de plugin peuvent ajouter une prise en charge via la même interface de liaison.

## Paramètres spécifiques au channel

Pour les workflows non éphémères, configurez des liaisons ACP persistantes dans les entrées `bindings[]` de niveau supérieur.

### Modèle de liaison

- `bindings[].type="acp"` marque une liaison de conversation ACP persistante.
- `bindings[].match` identifie la conversation cible :
  - Channel ou fil Discord : `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Sujet de forum Telegram : `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles DM/group chat : `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Préférez `chat_id:*` ou `chat_identifier:*` pour des liaisons de groupe stables.
  - iMessage DM/group chat : `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Préférez `chat_id:*` pour des liaisons de groupe stables.
- `bindings[].agentId` est l'identifiant de l'agent propriétaire OpenClaw.
- Les substitutions ACP optionnelles se trouvent sous `bindings[].acp` :
  - `mode` (`persistent` ou `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Runtime defaults per agent

Utilisez `agents.list[].runtime` pour définir les valeurs par défaut ACP une fois par agent :

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (identifiant du harnais, par exemple `codex` ou `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

Priorité de substitution pour les sessions ACP liées :

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

- OpenClaw s'assure que la session ACP configurée existe avant utilisation.
- Les messages dans ce canal ou sujet sont acheminés vers la session ACP configurée.
- Dans les conversations liées, `/new` et `/reset` réinitialisent la même clé de session ACP en place.
- Les liaisons d'exécution temporaires (par exemple créées par les flux de focalisation de fil de discussion) s'appliquent toujours lorsqu'elles sont présentes.
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

- `runtime` est défini par défaut sur `subagent`, définissez donc `runtime: "acp"` explicitement pour les sessions ACP.
- Si `agentId` est omis, OpenClaw utilise `acp.defaultAgent` lorsque configuré.
- `mode: "session"` nécessite `thread: true` pour maintenir une conversation liée persistante.

Détails de l'interface :

- `task` (requis) : invite initiale envoyée à la session ACP.
- `runtime` (requis pour ACP) : doit être `"acp"`.
- `agentId` (optionnel) : identifiant du harnais cible ACP. Revient à `acp.defaultAgent` si défini.
- `thread` (optionnel, par défaut `false`) : demande le flux de liaison de fil (thread binding) lorsque pris en charge.
- `mode` (optionnel) : `run` (une seule fois) ou `session` (persistant).
  - la valeur par défaut est `run`
  - si `thread: true` et le mode sont omis, OpenClaw peut par défaut adopter un comportement persistant selon le chemin d'exécution
  - `mode: "session"` nécessite `thread: true`
- `cwd` (optionnel) : répertoire de travail d'exécution demandé (validé par la stratégie backend/runtime). Si omis, le spawn ACP hérite de l'espace de travail de l'agent cible lorsqu'il est configuré ; les chemins hérités manquants reviennent aux valeurs par défaut du backend, tandis que les erreurs d'accès réelles sont renvoyées.
- `label` (optionnel) : étiquette destinée à l'opérateur, utilisée dans le texte de la session/bannière.
- `resumeSessionId` (optionnel) : reprend une session ACP existante au lieu d'en créer une nouvelle. L'agent rejoue son historique de conversation via `session/load`. Nécessite `runtime: "acp"`.
- `streamTo` (optionnel) : `"parent"` diffuse les résumés de progression initiaux de l'exécution ACP vers la session du demandeur sous forme d'événements système.
  - Lorsqu'elles sont disponibles, les réponses acceptées incluent `streamLogPath` pointant vers un journal JSONL délimité à la session (`<sessionId>.acp-stream.jsonl`) que vous pouvez suivre pour l'historique complet du relais.

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

- Transférer une session Codex de votre ordinateur portable vers votre téléphone — dites à votre agent de reprendre là où vous vous êtes arrêté
- Continuer une session de codage que vous avez commencée de manière interactive dans le CLI, maintenant en mode headless via votre agent
- Reprendre le travail qui a été interrompu par un redémarrage de la passerelle ou un délai d'inactivité

Notes :

- `resumeSessionId` nécessite `runtime: "acp"` — renvoie une erreur si utilisé avec le runtime de sous-agent.
- `resumeSessionId` restaure l'historique des conversations ACP en amont ; `thread` et `mode` s'appliquent toujours normalement à la nouvelle session OpenClaw que vous créez, donc `mode: "session"` nécessite toujours `thread: true`.
- L'agent cible doit prendre en charge `session/load` (Codex et Claude Code le font).
- Si l'ID de session n'est pas trouvé, le lancement échoue avec une erreur claire — aucune conversion silencieuse vers une nouvelle session.

### Test de fumée de l'opérateur

Utilisez ceci après un déploiement de passerelle lorsque vous souhaitez une vérification rapide en direct que le lancement ACP
fonctionne réellement de bout en bout, et pas seulement qu'il réussit les tests unitaires.

Porte recommandée :

1. Vérifiez la version/le commit de la passerelle déployée sur l'hôte cible.
2. Confirmez que la source déployée inclut l'acceptation de la lignée ACP dans
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
6. Nettoyez la session de pont ACPX temporaire.

Exemple de prompt pour l'agent en direct :

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Notes :

- Gardez ce test de fumée sur `mode: "run"` sauf si vous testez intentionnellement
  des sessions ACP persistantes liées aux fils de discussion.
- Ne nécessitez pas `streamTo: "parent"` pour la porte de base (gate). Ce chemin dépend des capacités du demandeur/de la session et constitue une vérification d'intégration distincte.
- Traitez le test `mode: "session"` lié au fil (thread-bound) comme un second passage d'intégration plus riche à partir d'un fil Discord ou d'un sujet Telegram réel.

## Compatibilité du bac à sable

Les sessions ACP s'exécutent actuellement sur l'hôte d'exécution (runtime), et non à l'intérieur du bac à sable OpenClaw.

Limitations actuelles :

- Si la session du demandeur est isolée (sandboxed), les créations (spawns) ACP sont bloquées pour `sessions_spawn({ runtime: "acp" })` et `/acp spawn`.
  - Erreur : `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` avec `runtime: "acp"` ne prend pas en charge `sandbox: "require"`.
  - Erreur : `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Utilisez `runtime: "subagent"` lorsque vous avez besoin d'une exécution imposée par le bac à sable.

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

Voir [Commandes Slash](/en/tools/slash-commands).

## Résolution de la cible de session

La plupart des actions `/acp` acceptent une cible de session facultative (`session-key`, `session-id`, ou `session-label`).

Ordre de résolution :

1. Argument de cible explicite (ou `--session` pour `/acp steer`)
   - essaie la clé
   - puis l'ID de session de forme UUID
   - puis l'étiquette
2. Liaison de fil actuel (si cette conversation/fil est liée à une session ACP)
3. Repli (fallback) vers la session du demandeur actuel

Les liaisons de conversation actuelle et les liaisons de fil participent toutes deux à l'étape 2.

Si aucune cible n'est résolue, OpenClaw renvoie une erreur claire (`Unable to resolve session target: ...`).

## Modes de liaison de création (Spawn bind)

`/acp spawn` prend en charge `--bind here|off`.

| Mode   | Comportement                                                                    |
| ------ | ------------------------------------------------------------------------------- |
| `here` | Lier la conversation active actuelle en place ; échouer si aucune n'est active. |
| `off`  | Ne pas créer de liaison de conversation actuelle.                               |

Notes :

- `--bind here` est le chemin d'exploitation le plus simple pour « rendre ce canal ou cette conversation compatible avec Codex ».
- `--bind here` ne crée pas de fil de discussion enfant.
- `--bind here` est uniquement disponible sur les canaux qui exposent la prise en charge de la liaison de conversation actuelle.
- `--bind` et `--thread` ne peuvent pas être combinés dans le même appel `/acp spawn`.

## Modes de génération de fils de discussion

`/acp spawn` prend en charge `--thread auto|here|off`.

| Mode   | Comportement                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------ |
| `auto` | Dans un fil actif : lier ce fil. En dehors d'un fil : créer/lier un fil enfant lorsque pris en charge. |
| `here` | Nécessite un fil actif actuel ; échoue si aucun.                                                       |
| `off`  | Aucune liaison. La session démarre sans liaison.                                                       |

Notes :

- Sur les surfaces sans liaison de fil, le comportement par défaut est effectivement `off`.
- La génération liée à un fil nécessite la prise en charge de la stratégie de canal :
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

`/acp status` affiche les options d'exécution effectives et, si disponibles, les identifiants de session au niveau de l'exécution et au niveau du backend.

Certains contrôles dépendent des capacités du backend. Si un backend ne prend pas en charge un contrôle, OpenClaw renvoie une erreur claire de contrôle non pris en charge.

## Livre de recettes de commandes ACP

| Commande             | Ce qu'elle fait                                                               | Exemple                                                       |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Créer une session ACP ; liaison actuelle ou de fil optionnelle.               | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Annuler le tour en cours pour la session cible.                               | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Envoyer des instructions de pilotage à la session en cours.                   | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Fermer la session et dissocier les cibles de fil de discussion.               | `/acp close`                                                  |
| `/acp status`        | Afficher le backend, le mode, l'état, les options d'exécution, les capacités. | `/acp status`                                                 |
| `/acp set-mode`      | Définir le mode d'exécution pour la session cible.                            | `/acp set-mode plan`                                          |
| `/acp set`           | Écriture générique d'option de configuration d'exécution.                     | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Définir la substitution du répertoire de travail d'exécution.                 | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Définir le profil de politique d'approbation.                                 | `/acp permissions strict`                                     |
| `/acp timeout`       | Définir le délai d'expiration d'exécution (secondes).                         | `/acp timeout 120`                                            |
| `/acp model`         | Définir la substitution de modèle d'exécution.                                | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Supprimer les substitutions d'options d'exécution de session.                 | `/acp reset-options`                                          |
| `/acp sessions`      | Lister les sessions ACP récentes du magasin.                                  | `/acp sessions`                                               |
| `/acp doctor`        | Santé du backend, capacités, corrections actionnables.                        | `/acp doctor`                                                 |
| `/acp install`       | Imprimer les étapes d'installation et d'activation déterministes.             | `/acp install`                                                |

`/acp sessions` lit le magasin pour la session liée actuelle ou la session demanderesse. Les commandes qui acceptent les jetons `session-key`, `session-id` ou `session-label` résolvent les cibles via la découverte de session de passerelle, y compris les racines `session.store` personnalisées par agent.

## Mappage des options d'exécution

`/acp` dispose de commandes pratiques et d'un définisseur générique.

Opérations équivalentes :

- `/acp model <id>` correspond à la clé de configuration d'exécution `model`.
- `/acp permissions <profile>` correspond à la clé de configuration d'exécution `approval_policy`.
- `/acp timeout <seconds>` correspond à la clé de configuration d'exécution `timeout`.
- `/acp cwd <path>` met à jour directement le remplacement du cwd d'exécution.
- `/acp set <key> <value>` est le chemin générique.
  - Cas particulier : `key=cwd` utilise le chemin de remplacement du cwd.
- `/acp reset-options` efface tous les remplacements d'exécution pour la session cible.

## prise en charge du harnais acpx (actuel)

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

Lorsque OpenClaw utilise le backend acpx, préférez ces valeurs pour `agentId` sauf si votre configuration acpx définit des alias d'agent personnalisés.
Si votre installation locale de Cursor expose toujours ACP comme `agent acp`, remplacez la commande de l'agent `cursor` dans votre configuration acpx au lieu de modifier la valeur par défaut intégrée.

L'utilisation directe de la CLI acpx peut également cibler des adaptateurs arbitraires via `--agent <command>`, mais cette échappatoire brute est une fonctionnalité de la CLI acpx (et non le chemin normal OpenClaw `agentId`).

## Configuration requise

Référence de base ACP :

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

La configuration de liaison de thread est spécifique à l'adaptateur de channel. Exemple pour Discord :

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

Si le lancement d'ACP lié à un thread ne fonctionne pas, vérifiez d'abord le jeton de fonctionnalité de l'adaptateur :

- Discord : `channels.discord.threadBindings.spawnAcpSessions=true`

Les liaisons de conversation actuelle ne nécessitent pas la création de threads enfants. Elles nécessitent un contexte de conversation actif et un adaptateur de channel qui expose les liaisons de conversation ACP.

Voir [Référence de configuration](/en/gateway/configuration-reference).

## Configuration du plugin pour le backend acpx

Les nouvelles installations incluent le plugin d'exécution `acpx` groupé activé par défaut, donc ACP
fonctionne généralement sans étape d'installation de plugin manuelle.

Commencer par :

```text
/acp doctor
```

Si vous avez désactivé `acpx`, refusé via `plugins.allow` / `plugins.deny`, ou souhaitez
basculer vers une extraction de développement locale, utilisez le chemin d'accès explicite du plugin :

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Installation de l'espace de travail local lors du développement :

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

Vérifiez ensuite l'état du backend :

```text
/acp doctor
```

### Configuration de la commande et de la version acpx

Par défaut, le plugin backend acpx fourni (`acpx`) utilise le binaire épinglé localement au plugin :

1. La commande pointe par défaut sur le `node_modules/.bin/acpx` local au plugin à l'intérieur du paquet ACPX.
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

Remarques :

- `command` accepte un chemin absolu, un chemin relatif ou un nom de commande (`acpx`).
- Les chemins relatifs sont résolus à partir du répertoire de l'espace de travail OpenClaw.
- `expectedVersion: "any"` désactive la correspondance stricte de version.
- Lorsque `command` pointe vers un binaire/chemin personnalisé, l'installation automatique locale au plugin est désactivée.
- Le démarrage de OpenClaw reste non bloquant tant que la vérification de l'état du backend s'exécute.

Voir [Plugins](/en/tools/plugin).

### Installation automatique des dépendances

Lorsque vous installez OpenClaw globalement avec `npm install -g openclaw`, les dépendances
d'exécution acpx (binaires spécifiques à la plateforme) sont installées automatiquement
via un hook postinstall. Si l'installation automatique échoue, la passerelle démarre
toujours normalement et signale la dépendance manquante via `openclaw acp doctor`.

### Pont MCP des outils de plugin

Par défaut, les sessions ACPX n'exposent **pas** les outils enregistrés par le plugin OpenClaw à
l'interface ACP.

Si vous souhaitez que les agents ACP tels que Codex ou Claude Code appellent les outils de plugin OpenClaw
installés tels que la rappel/stockage de mémoire, activez le pont dédié :

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Ce que cela fait :

- Injecte un serveur MCP intégré nommé `openclaw-plugin-tools` dans l'amorçage de la
  session ACPX.
- Expose les outils de plugin déjà enregistrés par les plugins OpenClaw
  installés et activés.
- Garde la fonctionnalité explicite et désactivée par défaut.

Notes de sécurité et de confiance :

- Cela étend la surface de l'outil de harnais ACP.
- Les agents ACP obtiennent uniquement l'accès aux outils de plugin déjà actifs dans la passerelle.
- Traitez cela comme la même limite de confiance que de laisser ces plugins s'exécuter dans
  OpenClaw lui-même.
- Passez en revue les plugins installés avant de l'activer.

Les `mcpServers` personnalisés fonctionnent toujours comme avant. Le pont plugin-tools intégré est une
convenience supplémentaire optionnelle, et non un remplacement de la configuration générique du serveur MCP.

## Configuration des permissions

Les sessions ACP s'exécutent de manière non interactive — il n'y a pas de TTY pour approuver ou refuser les invites de permission d'écriture de fichiers et d'exécution de shell. Le plugin acpx fournit deux clés de configuration qui contrôlent la gestion des permissions :

Ces permissions de harnais ACPX sont distinctes des approbations d'exécution OpenClaw et distinctes des indicateurs de contournement du fournisseur backend CLI tels que Claude CLI `--permission-mode bypassPermissions`. `approve-all` ACPX est le commutateur de secours au niveau du harnais pour les sessions ACP.

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
| `fail` | Abandonner la session avec `AcpRuntimeError`. **(par défaut)**              |
| `deny` | Refuser silencieusement la permission et continuer (dégradation gracieuse). |

### Configuration

Définir via la configuration du plugin :

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Redémarrez la passerelle après avoir modifié ces valeurs.

> **Important :** OpenClaw utilise actuellement par défaut `permissionMode=approve-reads` et `nonInteractivePermissions=fail`. Dans les sessions ACP non interactives, toute opération d'écriture ou d'exécution déclenchant une invite d'autorisation peut échouer avec `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si vous devez restreindre les autorisations, définissez `nonInteractivePermissions` sur `deny` afin que les sessions se dégradent gracieusement au lieu de planter.

## Dépannage

| Symptôme                                                                    | Cause probable                                                                             | Solution                                                                                                                                                                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Plugin backend manquant ou désactivé.                                                      | Installez et activez le plugin backend, puis exécutez `/acp doctor`.                                                                                                                                                    |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP désactivé globalement.                                                                 | Définissez `acp.enabled=true`.                                                                                                                                                                                          |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Répartition depuis les messages de fil normaux désactivée.                                 | Définissez `acp.dispatch.enabled=true`.                                                                                                                                                                                 |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent absent de la liste autorisée.                                                        | Utilisez un `agentId` autorisé ou mettez à jour `acp.allowedAgents`.                                                                                                                                                    |
| `Unable to resolve session target: ...`                                     | Jeton de clé/id/étiquette incorrect.                                                       | Exécutez `/acp sessions`, copiez la clé/l'étiquette exacte, réessayez.                                                                                                                                                  |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` utilisé sans conversation liable active.                                     | Déplacez-vous vers le chat/la channel cible et réessayez, ou utilisez un génération non liée.                                                                                                                           |
| `Conversation bindings are unavailable for <channel>.`                      | L'adaptateur manque de capacité de liaison ACP de conversation actuelle.                   | Utilisez `/acp spawn ... --thread ...` lorsque pris en charge, configurez `bindings[]` de niveau supérieur, ou déplacez-vous vers un channel pris en charge.                                                            |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` utilisé en dehors d'un contexte de fil.                                    | Déplacez-vous vers le fil cible ou utilisez `--thread auto`/`off`.                                                                                                                                                      |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Un autre utilisateur possède la cible de liaison active.                                   | Reliez en tant que propriétaire ou utilisez une conversation ou un fil différent.                                                                                                                                       |
| `Thread bindings are unavailable for <channel>.`                            | L'adaptateur manque de capacité de liaison de fil.                                         | Utilisez `--thread off` ou déplacez-vous vers un adaptateur/channel pris en charge.                                                                                                                                     |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | Le runtime ACP est côté hôte ; la session de demande est sandboxed.                        | Utilisez `runtime="subagent"` à partir de sessions sandboxed, ou exécutez un génération ACP à partir d'une session non sandboxed.                                                                                       |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` demandé pour le runtime ACP.                                           | Utilisez `runtime="subagent"` pour le sandboxing requis, ou utilisez ACP avec `sandbox="inherit"` à partir d'une session non sandboxée.                                                                                 |
| Métadonnées ACP manquantes pour la session liée                             | Métadonnées de session ACP obsolètes/supprimées.                                           | Recréez avec `/acp spawn`, puis reliez/focalisez le fil.                                                                                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloque les écritures/exécutions dans une session ACP non interactive.     | Définissez `plugins.entries.acpx.config.permissionMode` sur `approve-all` et redémarrez la passerelle. Voir [Permission configuration](#permission-configuration).                                                      |
| La session ACP échoue rapidement avec peu de sortie                         | Les invites d'autorisation sont bloquées par `permissionMode`/`nonInteractivePermissions`. | Vérifiez les journaux de la passerelle pour `AcpRuntimeError`. Pour des autorisations complètes, définissez `permissionMode=approve-all` ; pour une dégradation gracieuse, définissez `nonInteractivePermissions=deny`. |
| La session ACP bloque indéfiniment après avoir terminé le travail           | Le processus du harnais est terminé mais la session ACP n'a pas signalé l'achèvement.      | Surveillez avec `ps aux \| grep acpx` ; tuez manuellement les processus obsolètes.                                                                                                                                      |
