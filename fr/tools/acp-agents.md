---
summary: "Use ACP runtime sessions for Pi, Claude Code, Codex, OpenCode, Gemini CLI, and other harness agents"
read_when:
  - Running coding harnesses through ACP
  - Setting up thread-bound ACP sessions on thread-capable channels
  - Binding Discord channels or Telegram forum topics to persistent ACP sessions
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP Agents"
---

# ACP agents

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) sessions let OpenClaw run external coding harnesses (for example Pi, Claude Code, Codex, OpenCode, and Gemini CLI) through an ACP backend plugin.

If you ask OpenClaw in plain language to "run this in Codex" or "start Claude Code in a thread", OpenClaw should route that request to the ACP runtime (not the native sub-agent runtime).

## Fast operator flow

Use this when you want a practical `/acp` runbook:

1. Spawn a session:
   - `/acp spawn codex --mode persistent --thread auto`
2. Work in the bound thread (or target that session key explicitly).
3. Check runtime state:
   - `/acp status`
4. Tune runtime options as needed:
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Nudge an active session without replacing context:
   - `/acp steer tighten logging and continue`
6. Stop work:
   - `/acp cancel` (stop current turn), or
   - `/acp close` (close session + remove bindings)

## Quick start for humans

Examples of natural requests:

- "Start a persistent Codex session in a thread here and keep it focused."
- "Run this as a one-shot Claude Code ACP session and summarize the result."
- "Use Gemini CLI for this task in a thread, then keep follow-ups in that same thread."

What OpenClaw should do:

1. Pick `runtime: "acp"`.
2. Resolve the requested harness target (`agentId`, for example `codex`).
3. If thread binding is requested and the current channel supports it, bind the ACP session to the thread.
4. Route follow-up thread messages to that same ACP session until unfocused/closed/expired.

## ACP versus sub-agents

Use ACP when you want an external harness runtime. Use sub-agents when you want OpenClaw-native delegated runs.

| Area          | ACP session                           | Sub-agent run                      |
| ------------- | ------------------------------------- | ---------------------------------- |
| Runtime       | Plug-in principal ACP (par exemple, acpx) | Runtime de sous-agent natif OpenClaw  |
| Clé de session   | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`  |
| Commandes principales | `/acp ...`                            | `/subagents ...`                   |
| Outil de génération (Spawn tool)    | `sessions_spawn` avec `runtime:"acp"` | `sessions_spawn` (runtime par défaut) |

Voir aussi [Sous-agents](/fr/tools/subagents).

## Sessions liées aux threads (indépendantes du canal)

Lorsque les liaisons de thread sont activées pour un adaptateur de canal, les sessions ACP peuvent être liées à des threads :

- OpenClaw lie un thread à une session ACP cible.
- Les messages de suivi dans ce thread sont acheminés vers la session ACP liée.
- La sortie ACP est renvoyée au même thread.
- La perte de focus, la fermeture, l'archivage, le délai d'inactivité ou l'expiration de la durée de vie maximale supprime la liaison.

La prise en charge de la liaison de thread est spécifique à l'adaptateur. Si l'adaptateur de canal actif ne prend pas en charge les liaisons de thread, OpenClaw renvoie un message clair indiquant que la fonctionnalité n'est pas prise en charge ou indisponible.

Indicateurs de fonctionnalité requis pour l'ACP lié aux threads :

- `acp.enabled=true`
- `acp.dispatch.enabled` est activé par défaut (définissez `false` pour suspendre la répartition ACP)
- Indicateur de création de thread ACP de l'adaptateur de canal activé (spécifique à l'adaptateur)
  - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canaux prenant en charge les threads

- Tout adaptateur de canal qui expose une capacité de liaison de session/thread.
- Prise en charge intégrée actuelle :
  - Threads/canaux Discord
  - Sujets Telegram (sujets de forum dans les groupes/supergroupes et sujets de DM)
- Les canaux de plug-in peuvent ajouter une prise en charge via la même interface de liaison.

## Paramètres spécifiques au canal

Pour les workflows non éphémères, configurez les liaisons ACP persistantes dans les entrées `bindings[]` de niveau supérieur.

### Modèle de liaison

- `bindings[].type="acp"` marque une liaison de conversation ACP persistante.
- `bindings[].match` identifie la conversation cible :
  - Canal ou thread Discord : `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Sujet de forum Telegram : `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` est l'ID de l'agent OpenClaw propriétaire.
- Les substitutions ACP facultatives se trouvent sous `bindings[].acp` :
  - `mode` (`persistent` ou `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Runtime defaults per agent

Utilisez `agents.list[].runtime` pour définir les valeurs par défaut ACP une fois par agent :

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (id de harnais, par exemple `codex` ou `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

Priorité de remplacement pour les sessions liées ACP :

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

- OpenClaw garantit que la session ACP configurée existe avant son utilisation.
- Les messages dans ce channel ou sujet sont acheminés vers la session ACP configurée.
- Dans les conversations liées, `/new` et `/reset` réinitialisent la même clé de session ACP sur place.
- Les liaisons d'exécution temporaires (par exemple créées par les flux de focus de thread) s'appliquent toujours là où elles sont présentes.

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

- `runtime` est `subagent` par défaut, définissez donc `runtime: "acp"` explicitement pour les sessions ACP.
- Si `agentId` est omis, OpenClaw utilise `acp.defaultAgent` si configuré.
- `mode: "session"` nécessite `thread: true` pour maintenir une conversation liée persistante.

Détails de l'interface :

- `task` (requis) : prompt initial envoyé à la session ACP.
- `runtime` (requis pour ACP) : doit être `"acp"`.
- `agentId` (facultatif) : id du harnais cible ACP. Revient à `acp.defaultAgent` si défini.
- `thread` (facultatif, par défaut `false`) : demande le flux de liaison de thread lorsque pris en charge.
- `mode` (facultatif) : `run` (ponctuel) ou `session` (persistant).
  - la valeur par défaut est `run`
  - si `thread: true` et le mode sont omis, OpenClaw peut par défaut adopter un comportement persistant en fonction du chemin d'exécution
  - `mode: "session"` nécessite `thread: true`
- `cwd` (facultatif) : répertoire de travail d'exécution demandé (validé par la stratégie de backend/d'exécution).
- `label` (facultatif) : libellé destiné à l'opérateur, utilisé dans le texte de session/bannière.
- `resumeSessionId` (facultatif) : reprendre une session ACP existante au lieu d'en créer une nouvelle. L'agent rejoue son historique de conversation via `session/load`. Nécessite `runtime: "acp"`.
- `streamTo` (facultatif) : `"parent"` diffuse les résumés de progression initiaux de l'exécution ACP vers la session demanderes sous forme d'événements système.
  - Lorsqu'elles sont disponibles, les réponses acceptées incluent `streamLogPath` pointant vers un journal JSONL avec portée de session (`<sessionId>.acp-stream.jsonl`) que vous pouvez suivre pour obtenir l'historique complet du relais.

### Reprendre une session existante

Utilisez `resumeSessionId` pour continuer une session ACP précédente au lieu de recommencer à zéro. L'agent rejoue son historique de conversation via `session/load`, il reprend donc avec le contexte complet de ce qui s'est passé avant.

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
- Continuer une session de codage que vous avez commencée de manière interactive dans le CLI, désormais sans affichage via votre agent
- Reprendre le travail qui a été interrompu par un redémarrage de la passerelle ou un délai d'inactivité

Remarques :

- `resumeSessionId` nécessite `runtime: "acp"` — renvoie une erreur s'il est utilisé avec l'environnement d'exécution du sous-agent.
- `resumeSessionId` restaure l'historique des conversations ACP en amont ; `thread` et `mode` s'appliquent toujours normalement à la nouvelle session OpenClaw que vous créez, donc `mode: "session"` nécessite toujours `thread: true`.
- L'agent cible doit prendre en charge `session/load` (Codex et Claude Code le font).
- Si l'ID de session n'est pas trouvé, le lancement échoue avec une erreur claire — aucun retour silencieux à une nouvelle session.

### Test de fumée de l'opérateur

Utilisez ceci après un déploiement de passerelle lorsque vous souhaitez une vérification rapide en direct que le lancement ACP
fonctionne réellement de bout en bout, et ne se contente pas de passer les tests unitaires.

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
5. Vérifiez que l'agent rapporte :
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

- Gardez ce test de fumée sur `mode: "run"` sauf si vous testez intentionnellement
  des sessions ACP persistantes liées aux threads.
- N'exigez pas `streamTo: "parent"` pour la porte de base. Ce chemin dépend des
  capacités du demandeur/de la session et constitue une vérification d'intégration distincte.
- Traitez les tests `mode: "session"` liés aux threads comme un deuxième passage d'intégration
  plus complet à partir d'un thread Discord réel ou d'un sujet Telegram.

## Compatibilité du bac à sable

Les sessions ACP s'exécutent actuellement sur l'hôte d'exécution, et non à l'intérieur du bac à sable OpenClaw.

Limitations actuelles :

- Si la session du demandeur est en bac à sable, les lancements ACP sont bloqués pour à la fois `sessions_spawn({ runtime: "acp" })` et `/acp spawn`.
  - Erreur : `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` avec `runtime: "acp"` ne prend pas en charge `sandbox: "require"`.
  - Erreur : `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Utilisez `runtime: "subagent"` lorsque vous avez besoin d'une exécution imposée par le bac à sable.

### À partir de la commande `/acp`

Utilisez `/acp spawn` pour un contrôle explicite de l'opérateur depuis le chat lorsque cela est nécessaire.

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

Paramètres clés :

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

Voir [Slash Commands](/fr/tools/slash-commands).

## Résolution de la cible de session

La plupart des actions `/acp` acceptent une cible de session facultative (`session-key`, `session-id` ou `session-label`).

Ordre de résolution :

1. Argument de cible explicite (ou `--session` pour `/acp steer`)
   - puis la clé tries
   - puis l'identifiant de session de type UUID
   - puis l'étiquette
2. Liaison de thread actuelle (si cette conversation/thread est liée à une session ACP)
3. Recours à la session du demandeur actuel

Si aucune cible n'est résolue, OpenClaw renvoie une erreur claire (`Unable to resolve session target: ...`).

## Modes de création de thread

`/acp spawn` prend en charge `--thread auto|here|off`.

| Mode   | Comportement                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------- |
| `auto` | Dans un thread actif : lier ce thread. En dehors d'un thread : créer/lier un thread enfant lorsque pris en charge. |
| `here` | Nécessite un thread actuel actif ; échec en l'absence de thread.                                                  |
| `off`  | Aucune liaison. La session démarre sans liaison.                                                                 |

Notes :

- Sur les surfaces sans liaison de thread, le comportement par défaut est effectivement `off`.
- La création liée à un thread nécessite la prise en charge de la stratégie du channel :
  - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`

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

`/acp status` affiche les options d'exécution effectives et, lorsque disponibles, les identifiants de session au niveau de l'exécution et du backend.

Certains contrôles dépendent des fonctionnalités du backend. Si un backend ne prend pas en charge un contrôle, OpenClaw renvoie une erreur claire de contrôle non pris en charge.

## Livre de recettes des commandes ACP

| Commande              | Ce qu'elle fait                                              | Exemple                                                        |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | Créer une session ACP ; liaison de thread facultative.                 | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | Annuler le tour en cours pour la session cible.                 | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | Envoyer une instruction de guidage à la session en cours d'exécution.                | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | Fermer la session et dissocier les cibles de thread.                  | `/acp close`                                                   |
| `/acp status`        | Afficher le backend, le mode, l'état, les options d'exécution, les fonctionnalités. | `/acp status`                                                  |
| `/acp set-mode`      | Définir le mode d'exécution pour la session cible.                      | `/acp set-mode plan`                                           |
| `/acp set`           | Écriture générique d'option de configuration d'exécution.                      | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | Définir le répertoire de travail de l'exécution (remplacement).                   | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | Définir le profil de stratégie d'approbation.                              | `/acp permissions strict`                                      |
| `/acp timeout`       | Définir le délai d'attente de l'exécution (secondes).                            | `/acp timeout 120`                                             |
| `/acp model`         | Définir le modèle de l'exécution (remplacement).                               | `/acp model anthropic/claude-opus-4-5`                         |
| `/acp reset-options` | Supprimer les remplacements des options d'exécution de session.                  | `/acp reset-options`                                           |
| `/acp sessions`      | Lister les sessions ACP récentes à partir du magasin.                      | `/acp sessions`                                                |
| `/acp doctor`        | Santé du backend, fonctionnalités, corrections exploitables.           | `/acp doctor`                                                  |
| `/acp install`       | Imprimer les étapes déterministes d'installation et d'activation.             | `/acp install`                                                 |

`/acp sessions` lit le magasin pour la session actuellement liée ou demanderesse. Les commandes qui acceptent les jetons `session-key`, `session-id` ou `session-label` résolvent les cibles via la découverte de session de passerelle, y compris les racines `session.store` personnalisées par agent.

## Mappage des options d'exécution

`/acp` dispose de commandes pratiques et d'un définition générique.

Opérations équivalentes :

- `/acp model <id>` correspond à la clé de configuration d'exécution `model`.
- `/acp permissions <profile>` correspond à la clé de configuration d'exécution `approval_policy`.
- `/acp timeout <seconds>` correspond à la clé de configuration d'exécution `timeout`.
- `/acp cwd <path>` met à jour directement la substitution de cwd d'exécution.
- `/acp set <key> <value>` est le chemin générique.
  - Cas particulier : `key=cwd` utilise le chemin de substitution de cwd.
- `/acp reset-options` efface toutes les substitutions d'exécution pour la session cible.

## Prise en charge du harnais acpx (actuel)

Alias de harnais intégrés actuels d'acpx :

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

Lorsque OpenClaw utilise le backend acpx, privilégiez ces valeurs pour `agentId`, sauf si votre configuration acpx définit des alias d'agent personnalisés.

L'utilisation directe de la CLI acpx peut également cibler des adaptateurs arbitraires via `--agent <command>`, mais cette échappatoire brute est une fonctionnalité de la CLI acpx (et non le chemin normal OpenClaw `agentId`).

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
    allowedAgents: ["pi", "claude", "codex", "opencode", "gemini", "kimi"],
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

Si le lancement ACP lié à un thread ne fonctionne pas, vérifiez d'abord le fanion de fonctionnalité de l'adaptateur :

- Discord : `channels.discord.threadBindings.spawnAcpSessions=true`

Voir [Référence de configuration](/fr/gateway/configuration-reference).

## Configuration du plugin pour le backend acpx

Installer et activer le plugin :

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Installation de l'espace de travail local pendant le développement :

```bash
openclaw plugins install ./extensions/acpx
```

Ensuite, vérifiez l'état du backend :

```text
/acp doctor
```

### Configuration de la commande et de la version acpx

Par défaut, le plugin acpx (publié en tant que `@openclaw/acpx`) utilise le binaire épinglé local au plugin :

1. La commande par défaut est `extensions/acpx/node_modules/.bin/acpx`.
2. La version attendue par défaut est l'épinglage de l'extension.
3. Le démarrage enregistre immédiatement le backend ACP comme non prêt.
4. Une tâche d'arrière-plan de vérification vérifie `acpx --version`.
5. Si le binaire local du plugin est manquant ou ne correspond pas, il exécute :
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
- Lorsque `command` pointe vers un binaire/chemin personnalisé, l'installation automatique locale du plugin est désactivée.
- Le démarrage de OpenClaw reste non bloquant pendant que la vérification de l'état du backend s'exécute.

Voir [Plugins](/fr/tools/plugin).

## Configuration des autorisations

Les sessions ACP s'exécutent de manière non interactive — il n'y a pas de TTY pour approuver ou refuser les invites d'autorisation d'écriture de fichier et d'exécution de shell. Le plugin acpx fournit deux clés de configuration qui contrôlent la gestion des autorisations :

### `permissionMode`

Contrôle les opérations que l'agent de harnais peut effectuer sans invite.

| Valeur           | Comportement                                                  |
| --------------- | --------------------------------------------------------- |
| `approve-all`   | Approuver automatiquement toutes les écritures de fichiers et les commandes shell.          |
| `approve-reads` | Approuver automatiquement les lectures uniquement ; les écritures et les exécutions nécessitent des invites. |
| `deny-all`      | Refuser toutes les invites d'autorisation.                              |

### `nonInteractivePermissions`

Contrôle ce qui se passe lorsqu'une invite d'autorisation devrait s'afficher mais qu'aucun TTY interactif n'est disponible (ce qui est toujours le cas pour les sessions ACP).

| Valeur  | Comportement                                                          |
| ------ | ----------------------------------------------------------------- |
| `fail` | Abandonner la session avec `AcpRuntimeError`. **(par défaut)**           |
| `deny` | Refuser silencieusement l'autorisation et continuer (dégradation gracieuse). |

### Configuration

Définir via la configuration du plugin :

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Redémarrez la passerelle après avoir modifié ces valeurs.

> **Important :** OpenClaw utilise par défaut actuellement `permissionMode=approve-reads` et `nonInteractivePermissions=fail`. Dans les sessions ACP non interactives, toute écriture ou exécution déclenchant une invite d'autorisation peut échouer avec `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si vous devez restreindre les autorisations, définissez `nonInteractivePermissions` sur `deny` afin que les sessions se dégradent gracieusement au lieu de planter.

## Dépannage

| Symptôme                                                                  | Cause probable                                                                    | Correctif                                                                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | Plugin backend manquant ou désactivé.                                             | Installez et activez le plugin backend, puis exécutez `/acp doctor`.                                                                                                        |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP désactivé globalement.                                                          | Définissez `acp.enabled=true`.                                                                                                                                           |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | Répartition à partir des messages de fil normaux désactivée.                                  | Définissez `acp.dispatch.enabled=true`.                                                                                                                                  |
| `ACP agent "<id>" is not allowed by policy`                              | Agent absent de la liste autorisée.                                                         | Utilisez un `agentId` autorisé ou mettez à jour `acp.allowedAgents`.                                                                                                              |
| `Unable to resolve session target: ...`                                  | Jeton de clé/id/étiquette incorrect.                                                         | Exécutez `/acp sessions`, copiez la clé/l'étiquette exacte, réessayez.                                                                                                                 |
| `--thread here requires running /acp spawn inside an active ... thread`  | `--thread here` utilisé hors du contexte d'un fil.                                  | Déplacez-vous vers le fil cible ou utilisez `--thread auto`/`off`.                                                                                                               |
| `Only <user-id> can rebind this thread.`                                 | Un autre utilisateur possède la liaison de fil.                                               | Reliez en tant que propriétaire ou utilisez un autre fil.                                                                                                                        |
| `Thread bindings are unavailable for <channel>.`                         | L'adaptateur ne prend pas en charge la liaison de fil.                                        | Utilisez `--thread off` ou passez à un adaptateur/channel pris en charge.                                                                                                          |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | Le runtime ACP est côté hôte ; la session du demandeur est sandboxed.                       | Utilisez `runtime="subagent"` depuis des sessions sandboxed, ou exécutez ACP spawn depuis une session non sandboxed.                                                                  |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | `sandbox="require"` demandé pour le runtime ACP.                                  | Utilisez `runtime="subagent"` pour le sandboxing requis, ou utilisez ACP avec `sandbox="inherit"` depuis une session non sandboxed.                                               |
| Métadonnées ACP manquantes pour la session liée                                   | Métadonnées de session ACP obsolètes/supprimées.                                             | Recréez avec `/acp spawn`, puis reliez/focalisez le fil.                                                                                                             |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` bloque les écritures/exéc dans une session ACP non interactive.             | Définissez `plugins.entries.acpx.config.permissionMode` sur `approve-all` et redémarrez la passerelle. Voir [Permission configuration](#permission-configuration).                 |
| La session ACP échoue rapidement avec peu de sortie                               | Les invites d'autorisation sont bloquées par `permissionMode`/`nonInteractivePermissions`. | Vérifiez les journaux de la passerelle pour `AcpRuntimeError`. Pour des autorisations complètes, définissez `permissionMode=approve-all` ; pour une dégradation progressive, définissez `nonInteractivePermissions=deny`. |
| La session ACP reste bloquée indéfiniment après avoir terminé le travail                    | Le processus du harnais est terminé mais la session ACP n'a pas signalé son achèvement.             | Surveillez avec `ps aux \| grep acpx` ; tuez manuellement les processus périmés.                                                                                                |

import en from "/components/footer/en.mdx";

<en />
