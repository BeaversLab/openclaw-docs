---
summary: "Utilisez des sessions d'exécution ACP pour Codex, Claude Code, Cursor, Gemini CLI, OpenClaw ACP et autres agents de harnais"
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

Si vous demandez à OpenClaw en langage clair de « lancer ceci dans Codex » ou de « démarrer Claude Code dans un fil », OpenClaw doit router cette demande vers l'exécution ACP (et non vers l'exécution des sous-agents natifs). Chaque création de session ACP est suivie en tant que [tâche d'arrière-plan](/en/automation/tasks).

Si vous souhaitez que Codex ou Claude Code se connecte en tant que client MCP externe directement aux conversations de canal OpenClaw existantes, utilisez [`openclaw mcp serve`](/en/cli/mcp)
au lieu d'ACP.

## Flux d'opérateur rapide

Utilisez ceci lorsque vous souhaitez un guide opérationnel `/acp` pratique :

1. Lancer une session :
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. Travaillez dans la conversation liée ou le fil (ou ciblez explicitement cette clé de session).
3. Vérifiez l'état du runtime :
   - `/acp status`
4. Ajustez les options du runtime si nécessaire :
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Stimulez une session active sans remplacer le contexte :
   - `/acp steer tighten logging and continue`
6. Arrêter le travail :
   - `/acp cancel` (arrêter le tour actuel), ou
   - `/acp close` (fermer la session + supprimer les liaisons)

## Quick start pour les humains

Exemples de demandes naturelles :

- "Liez ce Discord à Codex."
- "Lancez une session Codex persistante dans un fil ici et gardez-la concentrée."
- "Exécutez ceci en tant que session ACP Claude Code ponctuelle et résumez le résultat."
- "Liez cette conversation iMessage à Codex et gardez les suites dans le même espace de travail."
- "Utilisez Gemini CLI pour cette tâche dans un fil, puis conservez les suites dans ce même fil."

Ce que OpenClaw doit faire :

1. Choisissez `runtime: "acp"`.
2. Résolvez la cible du harnais demandée (`agentId`, par exemple `codex`).
3. Si la liaison à la conversation en cours est demandée et que le channel actif la prend en charge, liez la session ACP à cette conversation.
4. Sinon, si la liaison de fil (thread) est demandée et que le canal actuel la prend en charge, liez la session ACP au fil.
5. Acheminez les messages de suivi liés vers cette même session ACP jusqu'à ce qu'elle ne soit plus focalisée/fermée/expirée.

## ACP par rapport aux sous-agents

Utilisez ACP lorsque vous souhaitez un runtime de harnais externe. Utilisez les sous-agents lorsque vous souhaitez des exécutions déléguées natives OpenClaw.

| Zone                  | Session ACP                              | Exécution de sous-agent                 |
| --------------------- | ---------------------------------------- | --------------------------------------- |
| Runtime               | Plug-in principal ACP (par exemple acpx) | Runtime de sous-agent natif OpenClaw    |
| Clé de session        | `agent:<agentId>:acp:<uuid>`             | `agent:<agentId>:subagent:<uuid>`       |
| Commandes principales | `/acp ...`                               | `/subagents ...`                        |
| Outil de Spawn        | `sessions_spawn` avec `runtime:"acp"`    | `sessions_spawn` (exécution par défaut) |

Voir aussi [Sous-agents](/en/tools/subagents).

## Sessions liées

### Liaisons de conversation actuelle

Utilisez `/acp spawn <harness> --bind here` lorsque vous souhaitez que la conversation actuelle devienne un espace de travail ACP durable sans créer de fil enfant.

Comportement :

- OpenClaw continue de posséder le transport de channel, l'authentification, la sécurité et la livraison.
- La conversation actuelle est épinglée à la clé de session ACP générée.
- Les messages de suivi dans cette conversation sont acheminés vers la même session ACP.
- `/new` et `/reset` réinitialisent la même session ACP liée en place.
- `/acp close` ferme la session et supprime la liaison de conversation actuelle.

Ce que cela signifie en pratique :

- `--bind here` conserve la même surface de discussion. Sur Discord, le channel actuel reste le channel actuel.
- `--bind here` peut toujours créer une nouvelle session ACP si vous lancez un nouveau travail. La liaison attache cette session à la conversation actuelle.
- `--bind here` ne crée pas de fils Discord ou de sujets Telegram enfants par lui-même.
- Le runtime ACP peut toujours avoir son propre répertoire de travail (`cwd`) ou un espace de travail géré par le backend sur le disque. Cet espace de travail runtime est distinct de la surface de discussion et n'implique pas un nouveau fil de messagerie.

Modèle mental :

- surface de discussion : là où les gens continuent de parler (`Discord channel`, `Telegram topic`, `iMessage chat`)
- Session ACP : l'état d'exécution durable Codex/Claude/Gemini vers lequel OpenClaw achemine
- fil/sujet enfant : une surface de messagerie supplémentaire optionnelle créée uniquement par `--thread ...`
- espace de travail runtime : l'emplacement du système de fichiers où le harness s'exécute (`cwd`, extraction de dépôt, espace de travail backend)

Exemples :

- `/acp spawn codex --bind here` : garder cette discussion, créer ou attacher une session ACP Codex, et acheminer les futurs messages ici vers elle
- `/acp spawn codex --thread auto` : OpenClaw peut créer un fil/sujet enfant et y attacher la session ACP
- `/acp spawn codex --bind here --cwd /workspace/repo` : même liaison de discussion que ci-dessus, mais Codex s'exécute dans `/workspace/repo`

Prise en charge de la liaison de conversation actuelle :

- Les channels de discussion/message qui annoncent la prise en charge de la liaison de conversation actuelle peuvent utiliser `--bind here` via le chemin de liaison de conversation partagé.
- Les canaux avec une sémantique de fil/discussion personnalisée peuvent toujours fournir une canonicalisation spécifique au canal derrière la même interface partagée.
- `--bind here` signifie toujours « lier la conversation actuelle en place ».
- Les liaisons de conversation actuelle génériques utilisent le magasin de liaisons partagé OpenClaw et survivent aux redémarrages normaux de la passerelle.

Notes :

- `--bind here` et `--thread ...` sont mutuellement exclusifs sur `/acp spawn`.
- Sur Discord, `--bind here` lie le channel ou le fil actuel en place. `spawnAcpSessions` n'est requis que lorsque OpenClaw doit créer un fil enfant pour `--thread auto|here`.
- Si le channel actif n'expose pas de liaisons ACP de conversation actuelle, OpenClaw renvoie un message clair indiquant que cette fonctionnalité n'est pas prise en charge.
- Les questions `resume` et « nouvelle session » sont des questions de session ACP, et non des questions de channel. Vous pouvez réutiliser ou remplacer l'état du runtime sans changer la surface de discussion actuelle.

### Sessions liées aux fils de discussion

Lorsque les liaisons de fils de discussion sont activées pour un adaptateur de channel, les sessions ACP peuvent être liées aux fils de discussion :

- OpenClaw lie un thread à une session ACP cible.
- Les messages de suivi dans ce thread sont acheminés vers la session ACP liée.
- La sortie ACP est renvoyée vers le même thread.
- La perte de focus, la fermeture, l'archivage, l'expiration du délai d'inactivité ou l'ancienneté maximale supprime la liaison.

La prise en charge de la liaison de thread est spécifique à l'adaptateur. Si l'adaptateur de channel actif ne prend pas en charge les liaisons de thread, OpenClaw renvoie un message clair indiquant que la fonctionnalité n'est pas prise en charge ou indisponible.

Drapeaux de fonctionnalités requis pour l'ACP liée au thread :

- `acp.enabled=true`
- `acp.dispatch.enabled` est activé par défaut (définissez `false` pour mettre en pause la répartition ACP)
- Channel-adapter ACP thread-spawn flag enabled (adapter-specific)
  - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canaux prenant en charge les fils

- Tout adaptateur de canal qui expose la capacité de liaison session/fil.
- Support intégré actuel :
  - Fils/canaux Discord
  - Telegram topics (sujets de forum dans les groupes/super-groupes et les sujets de DM)
- Les canaux de plugin peuvent ajouter une prise en charge via la même interface de liaison.

## Paramètres spécifiques au canal

Pour les workflows non éphémères, configurez des liaisons ACP persistantes dans les entrées `bindings[]` de niveau supérieur.

### Modèle de liaison

- `bindings[].type="acp"` marque une liaison de conversation ACP persistante.
- `bindings[].match` identifie la conversation cible :
  - Salon ou fil Discord : `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Sujet de forum Telegram : `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - Discussion de groupe/DM BlueBubbles : `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Privilégiez `chat_id:*` ou `chat_identifier:*` pour des liaisons de groupe stables.
  - Discussion de groupe/DM iMessage : `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Privilégiez `chat_id:*` pour des liaisons de groupe stables.
- `bindings[].agentId` est l'identifiant de l'agent OpenClaw propriétaire.
- Les substitutions ACP facultatives se trouvent sous `bindings[].acp` :
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
- Les messages dans ce channel ou sujet sont routés vers la session ACP configurée.
- Dans les conversations liées, `/new` et `/reset` réinitialisent la même clé de session ACP en place.
- Les liaisons temporaires de runtime (par exemple celles créées par les flux de focus de fil de discussion) s'appliquent toujours là où elles sont présentes.

## Démarrer les sessions ACP (interfaces)

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

- `runtime` a la valeur par défaut `subagent`, définissez donc `runtime: "acp"` explicitement pour les sessions ACP.
- Si `agentId` est omis, OpenClaw utilise `acp.defaultAgent` lorsqu'il est configuré.
- `mode: "session"` nécessite `thread: true` pour maintenir une conversation liée persistante.

Détails de l'interface :

- `task` (requis) : invite initiale envoyée à la session ACP.
- `runtime` (requis pour ACP) : doit être `"acp"`.
- `agentId` (facultatif) : id du harnais cible ACP. Revient à `acp.defaultAgent` si défini.
- `thread` (facultatif, par défaut `false`) : demande le flux de liaison de fil là où c'est pris en charge.
- `mode` (facultatif) : `run` (une fois) ou `session` (persistant).
  - la valeur par défaut est `run`
  - si `thread: true` et le mode sont omis, OpenClaw peut par défaut adopter un comportement persistant selon le chemin d'exécution
  - `mode: "session"` nécessite `thread: true`
- `cwd` (facultatif) : répertoire de travail d'exécution demandé (validé par la stratégie backend/runtime).
- `label` (facultatif) : libellé destiné à l'opérateur, utilisé dans le texte de la session/bannière.
- `resumeSessionId` (facultatif) : reprend une session ACP existante au lieu d'en créer une nouvelle. L'agent rejoue son historique de conversation via `session/load`. Nécessite `runtime: "acp"`.
- `streamTo` (facultatif) : `"parent"` diffuse les résumés de progression d'exécution ACP initiaux vers la session du demandeur en tant qu'événements système.
  - Lorsqu'elles sont disponibles, les réponses acceptées incluent `streamLogPath` pointant vers un journal JSONL délimité à la session (`<sessionId>.acp-stream.jsonl`) que vous pouvez suivre pour l'historique complet de relais.

### Reprendre une session existante

Utilisez `resumeSessionId` pour continuer une session ACP précédente au lieu d'en recommencer une nouvelle. L'agent rejoue son historique de conversation via `session/load`, il reprend donc avec le contexte complet de ce qui s'est passé auparavant.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Cas d'usage courants :

- Transférer une session Codex de votre ordinateur portable vers votre téléphone — demandez à votre agent de reprendre là où vous vous êtes arrêté
- Poursuivre une session de codage que vous avez lancée de manière interactive dans le CLI, désormais sans interface via votre agent
- Reprendre le travail qui a été interrompu par un redémarrage de la passerelle ou un délai d'inactivité

Remarques :

- `resumeSessionId` nécessite `runtime: "acp"` — renvoie une erreur s'il est utilisé avec le runtime des sous-agents.
- `resumeSessionId` restaure l'historique de la conversation ACP en amont ; `thread` et `mode` s'appliquent toujours normalement à la nouvelle session OpenClaw que vous créez, donc `mode: "session"` nécessite toujours `thread: true`.
- L'agent cible doit prendre en charge `session/load` (Codex et Claude Code le font).
- Si l'ID de session n'est pas trouvé, le démarrage échoue avec une erreur claire — aucun retour silencieux vers une nouvelle session.

### Test de fumée de l'opérateur

Utilisez ceci après un déploiement de passerelle lorsque vous souhaitez une vérification rapide en direct que le démarrage ACP
fonctionne réellement de bout en bout, et pas seulement réussir les tests unitaires.

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
6. Nettoyez la session temporaire du pont ACPX.

Exemple d'invite pour l'agent en direct :

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Notes :

- Gardez ce test de fumée sur `mode: "run"` sauf si vous testez intentionnellement
  des sessions ACP persistantes liées aux fils de discussion.
- N'exigez pas `streamTo: "parent"` pour la porte de base (gate). Ce chemin dépend des capacités du demandeur/de la session et constitue une vérification d'intégration distincte.
- Traitez le test `mode: "session"` lié au fil comme un deuxième passage d'intégration plus riche à partir d'un fil Discord réel ou d'un sujet Telegram.

## Compatibilité du bac à sable

Les sessions ACP s'exécutent actuellement sur l'hôte d'exécution, et non à l'intérieur du bac à sable OpenClaw.

Limitations actuelles :

- Si la session du demandeur est sandboxed (isolée), les créations ACP sont bloquées à la fois pour `sessions_spawn({ runtime: "acp" })` et `/acp spawn`.
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

Voir [Slash Commands](/en/tools/slash-commands).

## Résolution de la cible de session

La plupart des actions `/acp` acceptent une cible de session optionnelle (`session-key`, `session-id` ou `session-label`).

Ordre de résolution :

1. Argument de cible explicite (ou `--session` pour `/acp steer`)
   - essaie la clé
   - puis l'identifiant de session de forme UUID
   - puis l'étiquette
2. Liaison du fil de discussion actuel (si cette conversation/fil est lié à une session ACP)
3. Repli de session du demandeur actuel

Les liaisons de conversation actuelle et les liaisons de fil participent toutes deux à l'étape 2.

Si aucune cible n'est résolue, OpenClaw renvoie une erreur claire (`Unable to resolve session target: ...`).

## Modes de liaison de génération

`/acp spawn` prend en charge `--bind here|off`.

| Mode   | Comportement                                                                    |
| ------ | ------------------------------------------------------------------------------- |
| `here` | Lier la conversation active actuelle en place ; échouer si aucune n'est active. |
| `off`  | Ne créez pas de liaison de conversation actuelle.                               |

Notes :

- `--bind here` est le chemin d'opérateur le plus simple pour « rendre ce canal ou ce chat pris en charge par Codex ».
- `--bind here` ne crée pas de fil de discussion enfant.
- `--bind here` n'est disponible que sur les canaux qui exposent la prise en charge de la liaison à la conversation actuelle.
- `--bind` et `--thread` ne peuvent pas être combinés dans le même appel `/acp spawn`.

## Modes de création de threads

`/acp spawn` prend en charge `--thread auto|here|off`.

| Mode   | Comportement                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| `auto` | Dans un thread actif : lier ce thread. En dehors d'un thread : créer/lier un thread enfant lorsque pris en charge. |
| `here` | Exiger le fil de discussion actif actuel ; échouer si ce n'est pas le cas.                                         |
| `off`  | Aucune liaison. La session démarre sans liaison.                                                                   |

Remarques :

- Sur les surfaces sans liaison de fil, le comportement par défaut est effectivement `off`.
- Le spawn lié au fil nécessite la prise en charge de la stratégie de channel :
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

`/acp status` affiche les options d'exécution effectives et, si disponibles, les identifiants de session au niveau de l'exécution et du backend.

Certains contrôles dépendent des capacités du backend. Si un backend ne prend pas en charge un contrôle, OpenClaw renvoie une erreur de contrôle non pris en charge claire.

## Livre de recettes des commandes ACP

| Commande             | Ce qu'elle fait                                                               | Exemple                                                       |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Créer une session ACP ; liaison actuelle ou de fil optionnelle.               | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Annuler le tour en cours pour la session cible.                               | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Envoyer une instruction de direction à la session en cours.                   | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Fermer la session et dissocier les cibles de fil.                             | `/acp close`                                                  |
| `/acp status`        | Afficher le backend, le mode, l'état, les options d'exécution, les capacités. | `/acp status`                                                 |
| `/acp set-mode`      | Définir le mode d'exécution pour la session cible.                            | `/acp set-mode plan`                                          |
| `/acp set`           | Écriture générique d'option de configuration du runtime.                      | `/acp set model openai/gpt-5.2`                               |
| `/acp cwd`           | Définir le répertoire de travail du runtime.                                  | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Définir le profil de politique d'approbation.                                 | `/acp permissions strict`                                     |
| `/acp timeout`       | Définir le délai d'attente du runtime (secondes).                             | `/acp timeout 120`                                            |
| `/acp model`         | Définir la substitution du model d'exécution.                                 | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Supprimer les substitutions des options d'exécution de la session.            | `/acp reset-options`                                          |
| `/acp sessions`      | Lister les sessions ACP récentes depuis le magasin.                           | `/acp sessions`                                               |
| `/acp doctor`        | Santé du backend, capacités, correctifs actionnables.                         | `/acp doctor`                                                 |
| `/acp install`       | Afficher les étapes d'installation et d'activation déterministes.             | `/acp install`                                                |

`/acp sessions` lit le magasin pour la session liée actuelle ou la session demanderesse. Les commandes qui acceptent les jetons `session-key`, `session-id` ou `session-label` résolvent les cibles via la découverte de session de passerelle, y compris les racines `session.store` personnalisées par agent.

## Mappage des options d'exécution

`/acp` dispose de commandes pratiques et d'un définisseur générique.

Opérations équivalentes :

- `/acp model <id>` correspond à la clé de configuration d'exécution `model`.
- `/acp permissions <profile>` correspond à la clé de configuration d'exécution `approval_policy`.
- `/acp timeout <seconds>` correspond à la clé de configuration d'exécution `timeout`.
- `/acp cwd <path>` met à jour directement le remplacement du cwd d'exécution.
- `/acp set <key> <value>` est le chemin générique.
  - Cas particulier : `key=cwd` utilise le chemin de remplacement cwd.
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

Lorsque OpenClaw utilise le backend acpx, préférez ces valeurs pour `agentId`, sauf si votre configuration acpx définit des alias d'agent personnalisés.
Si votre installation locale de Cursor expose encore l'ACP sous la forme `agent acp`, remplacez la commande de l'agent `cursor` dans votre configuration acpx au lieu de modifier la valeur par défaut intégrée.

L'utilisation directe de l'acpx CLI peut également cibler des adaptateurs arbitraires via `--agent <command>`, mais cette échappatoire brute est une fonctionnalité de l'acpx CLI (et non le chemin normal OpenClaw `agentId`).

## Configuration requise

Ligne de base ACP principale :

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

La configuration de liaison de fil est spécifique à l'adaptateur de channel. Exemple pour Discord :

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

Si la création d'ACP liée à un fil ne fonctionne pas, vérifiez d'abord l'indicateur de fonctionnalité de l'adaptateur :

- Discord : `channels.discord.threadBindings.spawnAcpSessions=true`

Les liaisons de conversation actuelle ne nécessitent pas la création de fils de discussion enfants. Elles nécessitent un contexte de conversation actif et un adaptateur de channel qui expose des liaisons de conversation ACP.

Voir [Référence de configuration](/en/gateway/configuration-reference).

## Configuration du plugin pour le backend acpx

Installer et activer le plugin :

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

Par défaut, le plugin de backend acpx fourni (`acpx`) utilise le binaire épinglé local au plugin :

1. La commande par défaut correspond au `node_modules/.bin/acpx` local au plugin à l'intérieur du package de plugins ACPX.
2. La version attendue par défaut est l'épinglage de l'extension.
3. Le démarrage enregistre immédiatement le backend ACP comme non prêt.
4. Une tâche d'arrière-plan de vérification vérifie `acpx --version`.
5. Si le binaire local au plugin est manquant ou ne correspond pas, il exécute :
   `npm install --omit=dev --no-save acpx@<pinned>` et revérifie.

Vous pouvez remplacer la commande/la version dans la configuration du plugin :

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
- Le démarrage d'OpenClaw reste non bloquant pendant que la vérification de santé du backend s'exécute.

Voir [Plugins](/en/tools/plugin).

### Installation automatique des dépendances

Lorsque vous installez OpenClaw globalement avec `npm install -g openclaw`, les dépendances d'exécution acpx (binaires spécifiques à la plateforme) sont installées automatiquement via un hook postinstall. Si l'installation automatique échoue, la passerelle démarre normalement tout de même et signale la dépendance manquante via `openclaw acp doctor`.

### Pont MCP des outils de plugin

Par défaut, les sessions ACPX **n'exposent pas** les outils enregistrés par les plugins OpenClaw au harnais ACP.

Si vous souhaitez que les agents ACP tels que Codex ou Claude Code puissent appeler les outils de plugin OpenClaw installés, tels que la mémoire de rappel/stockage, activez le pont dédié :

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Ce que cela fait :

- Injecte un serveur MCP intégré nommé `openclaw-plugin-tools` dans l'amorçage de la session ACPX.
- Expose les outils de plugin déjà enregistrés par les plugins OpenClaw installés et activés.
- Garde la fonctionnalité explicite et désactivée par défaut.

Notes de sécurité et de confiance :

- Cela étend la surface d'outils du harnais ACP.
- Les agents ACP n'ont accès qu'aux outils de plugin déjà actifs dans la passerelle.
- Traitez cela avec la même limite de confiance que d'autoriser ces plugins à s'exécuter dans OpenClaw lui-même.
- Passez en revue les plugins installés avant d'activer cette fonctionnalité.

Les `mcpServers` personnalisés fonctionnent toujours comme avant. Le pont intégré plugin-tools est une commodité supplémentaire optionnelle, et non un remplacement de la configuration générique du serveur MCP.

## Configuration des autorisations

Les sessions ACP s'exécutent de manière non interactive — il n'y a pas de TTY pour approuver ou refuser les invites d'autorisation d'écriture de fichiers et d'exécution de shell. Le plugin acpx fournit deux clés de configuration qui contrôlent la gestion des autorisations :

Ces autorisations de harnais ACPX sont distinctes des approbations d'exécution OpenClaw et distinctes des indicateurs de contournement des fournisseurs backend CLI, tels que Claude CLI `--permission-mode bypassPermissions`. `approve-all` d'ACPX est le commutateur de bris de verre au niveau du harnais pour les sessions ACP.

### `permissionMode`

Contrôle les opérations que l'agent du harnais peut effectuer sans invite.

| Valeur          | Comportement                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `approve-all`   | Approuver automatiquement toutes les écritures de fichiers et les commandes shell.                        |
| `approve-reads` | Approuver automatiquement uniquement les lectures ; les écritures et l'exécution nécessitent des invites. |
| `deny-all`      | Refuser toutes les invites d'autorisation.                                                                |

### `nonInteractivePermissions`

Contrôle ce qui se passe lorsqu'une invite d'autorisation devrait être affichée mais qu'aucun TTY interactif n'est disponible (ce qui est toujours le cas pour les sessions ACP).

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

> **Important :** OpenClaw utilise par défaut `permissionMode=approve-reads` et `nonInteractivePermissions=fail`. Dans les sessions ACP non interactives, toute écriture ou exécution déclenchant une invite d'autorisation peut échouer avec `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si vous devez restreindre les autorisations, définissez `nonInteractivePermissions` sur `deny` afin que les sessions se dégradent gracieusement au lieu de planter.

## Dépannage

| Symptôme                                                                    | Cause probable                                                                             | Correction                                                                                                                                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Plugin backend manquant ou désactivé.                                                      | Installez et activez le plugin backend, puis exécutez `/acp doctor`.                                                                                                                                                    |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP désactivé globalement.                                                                 | Définissez `acp.enabled=true`.                                                                                                                                                                                          |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Répartition depuis les messages de fil de discussion normaux désactivée.                   | Définissez `acp.dispatch.enabled=true`.                                                                                                                                                                                 |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent absent de la liste autorisée.                                                        | Utilisez un `agentId` autorisé ou mettez à jour `acp.allowedAgents`.                                                                                                                                                    |
| `Unable to resolve session target: ...`                                     | Jeton de clé/id/label incorrect.                                                           | Exécutez `/acp sessions`, copiez la clé/label exacte, réessayez.                                                                                                                                                        |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` utilisé sans conversation liable active.                                     | Déplacez-vous vers le chat/channel cible et réessayez, ou utilisez un spawn non lié.                                                                                                                                    |
| `Conversation bindings are unavailable for <channel>.`                      | L'adaptateur manque de capacité de liaison ACP pour la conversation actuelle.              | Utilisez `/acp spawn ... --thread ...` lorsque pris en charge, configurez `bindings[]` de niveau supérieur, ou déplacez-vous vers un channel pris en charge.                                                            |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` utilisé en dehors d'un contexte de fil de discussion.                      | Déplacez-vous vers le fil de discussion cible ou utilisez `--thread auto`/`off`.                                                                                                                                        |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Un autre utilisateur possède la cible de liaison active.                                   | Reliez-vous en tant que propriétaire ou utilisez une autre conversation ou un autre fil.                                                                                                                                |
| `Thread bindings are unavailable for <channel>.`                            | L'adaptateur manque de capacité de liaison de fil.                                         | Utilisez `--thread off` ou passez à un adaptateur/channel pris en charge.                                                                                                                                               |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | L'exécution ACP est côté hôte ; la session demandrice est sandboxed.                       | Utilisez `runtime="subagent"` depuis les sessions sandboxed, ou lancez un spawn ACP depuis une session non sandboxed.                                                                                                   |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` demandé pour l'exécution ACP.                                          | Utilisez `runtime="subagent"` pour le sandboxing requis, ou utilisez ACP avec `sandbox="inherit"` depuis une session non sandboxed.                                                                                     |
| Métadonnées ACP manquantes pour la session liée                             | Métadonnées de session ACP périmées/supprimées.                                            | Recréez avec `/acp spawn`, puis reliez/focalisez le fil.                                                                                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloque les écritures/exécutions dans la session ACP non interactive.      | Définissez `plugins.entries.acpx.config.permissionMode` sur `approve-all` et redémarrez la passerelle. Voir [Permission configuration](#permission-configuration).                                                      |
| La session ACP échoue prématurément avec peu de sortie                      | Les invites d'autorisation sont bloquées par `permissionMode`/`nonInteractivePermissions`. | Vérifiez les journaux de la passerelle pour `AcpRuntimeError`. Pour des autorisations complètes, définissez `permissionMode=approve-all` ; pour une dégradation gracieuse, définissez `nonInteractivePermissions=deny`. |
| La session ACP stalle indéfiniment après avoir terminé le travail           | Le processus du harnais est terminé mais la session ACP n'a pas signalé la fin.            | Surveillez avec `ps aux \| grep acpx` ; tuez manuellement les processus périmés.                                                                                                                                        |
