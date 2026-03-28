---
summary: "Utiliser les sessions du runtime ACP pour Pi, Claude Code, Codex, OpenCode, Gemini CLI et autres agents de harnais"
read_when:
  - Running coding harnesses through ACP
  - Setting up thread-bound ACP sessions on thread-capable channels
  - Binding Discord channels or Telegram forum topics to persistent ACP sessions
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "Agents ACP"
---

# Agents ACP

Les sessions [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) permettent à OpenClaw d'exécuter des harnais de codage externes (par exemple Pi, Claude Code, Codex, OpenCode et Gemini CLI) via un plugin backend ACP.

Si vous demandez à OpenClaw en langage naturel de « exécuter ceci dans Codex » ou de « démarrer Claude Code dans un fil », OpenClaw doit acheminer cette demande vers le runtime ACP (et non vers le runtime natif des sous-agents).

## Flux rapide pour l'opérateur

Utilisez ceci lorsque vous souhaitez un `/acp` runbook pratique :

1. Lancer une session :
   - `/acp spawn codex --mode persistent --thread auto`
2. Travaillez dans le fil lié (ou ciblez explicitement cette clé de session).
3. Vérifier l'état du runtime :
   - `/acp status`
4. Ajustez les options du runtime selon les besoins :
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Relancer une session active sans remplacer le contexte :
   - `/acp steer tighten logging and continue`
6. Arrêter le travail :
   - `/acp cancel` (arrêter le tour actuel), ou
   - `/acp close` (fermer la session + supprimer les liaisons)

## Démarrage rapide pour les humains

Exemples de demandes naturelles :

- « Démarrer une session Codex persistante dans un fil ici et la garder ciblée. »
- « Exécuter ceci comme une session ACP Claude Code ponctuelle et résumer le résultat. »
- « Utiliser Gemini CLI pour cette tâche dans un fil, puis conserver les suites dans ce même fil. »

Ce que OpenClaw doit faire :

1. Choisissez `runtime: "acp"`.
2. Résolvez la cible du harnais demandée (`agentId`, par exemple `codex`).
3. Si une liaison de fil est demandée et que le canal actuel la prend en charge, liez la session ACP au fil.
4. Acheminez les messages de suite du fil vers cette même session ACP jusqu'à ce qu'elle soit perdue/fermée/expirée.

## ACP par rapport aux sous-agents

Utilisez l'ACP lorsque vous souhaitez un runtime de harnais externe. Utilisez les sous-agents lorsque vous souhaitez des exécutions déléguées natives OpenClaw.

| Domaine               | Session ACP                           | Exécution de sous-agent               |
| --------------------- | ------------------------------------- | ------------------------------------- |
| Runtime               | Plugin backend ACP (par exemple acpx) | Runtime natif de sous-agent OpenClaw  |
| Clé de session        | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`     |
| Commandes principales | `/acp ...`                            | `/subagents ...`                      |
| Outil de Spawn        | `sessions_spawn` avec `runtime:"acp"` | `sessions_spawn` (runtime par défaut) |

Voir aussi [Sous-agents](/fr/tools/subagents).

## Sessions liées aux fils (indépendantes du channel)

Lorsque les liaisons de fils sont activées pour un adaptateur de channel, les sessions ACP peuvent être liées aux fils :

- OpenClaw lie un fil à une session ACP cible.
- Les messages de suivi dans ce fil sont acheminés vers la session ACP liée.
- La sortie ACP est renvoyée au même fil.
- La perte de focus, la fermeture, l'archivage, l'expiration du délai d'inactivité ou de l'âge maximal supprime la liaison.

La prise en charge de la liaison de fils est spécifique à l'adaptateur. Si l'adaptateur de channel actif ne prend pas en charge les liaisons de fils, OpenClaw renvoie un message clair indiquant que la fonctionnalité n'est pas prise en charge ou indisponible.

Indicateurs de fonctionnalités requis pour l'ACP liée aux fils :

- `acp.enabled=true`
- `acp.dispatch.enabled` est activé par défaut (définissez `false` pour suspendre la répartition ACP)
- Indicateur de création de fil ACP par adaptateur de channel activé (spécifique à l'adaptateur)
  - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canaux prenant en charge les fils

- Tout adaptateur de channel qui expose une capacité de liaison de session/de fil.
- Prise en charge intégrée actuelle :
  - Fils/canaux Discord
  - Sujets Telegram (sujets de forum dans les groupes/super-groupes et sujets de DM)
- Les canaux de plugins peuvent ajouter une prise en charge via la même interface de liaison.

## Paramètres spécifiques au channel

Pour les workflows non éphémères, configurez des liaisons ACP persistantes dans les entrées `bindings[]` de premier niveau.

### Modèle de liaison

- `bindings[].type="acp"` marque une liaison de conversation ACP persistante.
- `bindings[].match` identifie la conversation cible :
  - Salon ou fil Discord : Discord channel or thread: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Sujet de forum Telegram : Telegram forum topic: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` est l'ID de l'agent OpenClaw propriétaire.
- Les remplacements ACP optionnels se trouvent sous `bindings[].acp` :
  - `mode` (`persistent` ou `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Runtime defaults per agent

Utilisez `agents.list[].runtime` pour définir les valeurs par défaut ACP une fois par agent :

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (ID du harnais, par exemple `codex` ou `claude`)
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

- OpenClaw garantit que la session ACP configurée existe avant utilisation.
- Les messages dans ce salon ou sujet sont routés vers la session ACP configurée.
- Dans les conversations liées, `/new` et `/reset` réinitialisent la même clé de session ACP en place.
- Les liaisons d'exécution temporaires (par exemple créées par les flux de focus sur le fil) s'appliquent toujours là où elles sont présentes.

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

Remarques :

- `runtime` est `subagent` par défaut, définissez donc `runtime: "acp"` explicitement pour les sessions ACP.
- Si `agentId` est omis, OpenClaw utilise `acp.defaultAgent` lorsque configuré.
- `mode: "session"` nécessite `thread: true` pour maintenir une conversation liée persistante.

Détails de l'interface :

- `task` (obligatoire) : invite initiale envoyée à la session ACP.
- `runtime` (obligatoire pour ACP) : doit être `"acp"`.
- `agentId` (facultatif) : ID du harnais cible ACP. Revient à `acp.defaultAgent` si défini.
- `thread` (facultatif, par défaut `false`) : demander le flux de liaison de thread lorsque pris en charge.
- `mode` (facultatif) : `run` (une fois) ou `session` (persistant).
  - la valeur par défaut est `run`
  - si `thread: true` et le mode sont omis, OpenClaw peut par défaut adopter un comportement persistant selon le chemin d'exécution
  - `mode: "session"` nécessite `thread: true`
- `cwd` (facultatif) : répertoire de travail de l'exécution demandé (validé par la stratégie backend/runtime).
- `label` (facultatif) : label destiné à l'opérateur utilisé dans le texte de session/bannière.
- `resumeSessionId` (facultatif) : reprendre une session ACP existante au lieu d'en créer une nouvelle. L'agent rejoue son historique de conversation via `session/load`. Nécessite `runtime: "acp"`.
- `streamTo` (facultatif) : `"parent"` diffuse les résumés de progression de l'exécution ACP initiale vers la session du demandeur sous forme d'événements système.
  - Lorsqu'elles sont disponibles, les réponses acceptées incluent `streamLogPath` pointant vers un journal JSONL délimité à la session (`<sessionId>.acp-stream.jsonl`) que vous pouvez suivre pour l'historique complet du relais.

### Reprendre une session existante

Utilisez `resumeSessionId` pour continuer une session ACP précédente au lieu de recommencer. L'agent rejoue son historique de conversation via `session/load`, il reprend donc avec le contexte complet de ce qui s'est passé auparavant.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Cas d'usage courants :

- Transférer une session Codex de votre ordinateur portable vers votre téléphone — demandez à votre agent de reprendre là où vous vous étiez arrêté
- Continuer une session de codage que vous avez lancée de manière interactive dans le CLI, maintenant en mode sans tête via votre agent
- Reprendre le travail qui a été interrompu par un redémarrage de la passerelle ou un délai d'inactivité

Remarques :

- `resumeSessionId` nécessite `runtime: "acp"` — renvoie une erreur s'il est utilisé avec le runtime des sous-agents.
- `resumeSessionId` restaure l'historique des conversations ACP en amont ; `thread` et `mode` s'appliquent toujours normalement à la nouvelle session OpenClaw que vous créez, donc `mode: "session"` nécessite toujours `thread: true`.
- L'agent cible doit prendre en charge `session/load` (Codex et Claude Code le font).
- Si l'ID de session n'est pas trouvé, le lancement échoue avec une erreur claire — aucun retour silencieux à une nouvelle session.

### Test de fumée de l'opérateur

Utilisez ceci après un déploiement de passerelle lorsque vous souhaitez une vérification rapide en direct que le lancement ACP
fonctionne réellement de bout en bout, et pas seulement réussir les tests unitaires.

Portail recommandé :

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
5. Vérifiez le rapport de l'agent :
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
- N'exigez pas `streamTo: "parent"` pour la porte de base (basic gate). Ce chemin dépend des capacités du demandeur/de la session et constitue une vérification d'intégration distincte.
- Traitez le test `mode: "session"` lié au fil comme une seconde passe d'intégration plus riche à partir d'un vrai fil Discord ou d'un sujet Telegram.

## Compatibilité du bac à sable

Les sessions ACP s'exécutent actuellement sur le runtime hôte, et non à l'intérieur du bac à sable OpenClaw.

Limitations actuelles :

- Si la session du demandeur est isolée (sandboxed), les créations ACP sont bloquées pour `sessions_spawn({ runtime: "acp" })` et `/acp spawn`.
  - Erreur : `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` avec `runtime: "acp"` ne prend pas en charge `sandbox: "require"`.
  - Erreur : `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Utilisez `runtime: "subagent"` lorsque vous avez besoin d'une exécution imposée par le bac à sable.

### Depuis la commande `/acp`

Utilisez `/acp spawn` pour un contrôle explicite de l'opérateur depuis le chat lorsque cela est nécessaire.

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

Indicateurs clés :

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

Voir [Commandes Slash](/fr/tools/slash-commands).

## Résolution de la cible de session

La plupart des actions `/acp` acceptent une cible de session facultative (`session-key`, `session-id` ou `session-label`).

Ordre de résolution :

1. Argument de cible explicite (ou `--session` pour `/acp steer`)
   - essaie la clé
   - puis l'ID de session de forme UUID
   - puis l'étiquette
2. Liaison de fil actuelle (si cette conversation/fil est liée à une session ACP)
3. Repli vers la session du demandeur actuel

Si aucune cible n'est résolue, OpenClaw renvoie une erreur claire (`Unable to resolve session target: ...`).

## Modes de fil de création

`/acp spawn` prend en charge `--thread auto|here|off`.

| Mode   | Comportement                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| `auto` | Dans un fil actif : lier ce fil. En dehors d'un fil : créer/lier un fil enfant lorsque cela est pris en charge. |
| `here` | Nécessite un fil actif actuel ; échoue si ce n'est pas le cas.                                                  |
| `off`  | Aucune liaison. La session démarre sans liaison.                                                                |

Notes :

- Sur les surfaces sans liaison de fil, le comportement par défaut est effectivement `off`.
- Le création de fil lié nécessite la prise en charge de la stratégie de canal :
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

`/acp status` affiche les options d'exécution effectives et, si disponibles, les identifiants de session au niveau de l'exécution et du backend.

Certains contrôles dépendent des capacités du backend. Si un backend ne prend pas en charge un contrôle, OpenClaw renvoie une erreur claire de contrôle non pris en charge.

## Livre de recettes des commandes ACP

| Commande             | Ce qu'elle fait                                                               | Exemple                                                        |
| -------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | Créer une session ACP ; liaison de fil facultative.                           | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | Annuler le tour en cours pour la session cible.                               | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | Envoyer une instruction de guidage à la session en cours d'exécution.         | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | Fermer la session et dissocier les cibles de fil.                             | `/acp close`                                                   |
| `/acp status`        | Afficher le backend, le mode, l'état, les options d'exécution, les capacités. | `/acp status`                                                  |
| `/acp set-mode`      | Définir le mode d'exécution pour la session cible.                            | `/acp set-mode plan`                                           |
| `/acp set`           | Écriture générique d'option de configuration de runtime.                      | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | Définir le remplacement du répertoire de travail du runtime.                  | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | Définir le profil de politique d'approbation.                                 | `/acp permissions strict`                                      |
| `/acp timeout`       | Définir le délai d'expiration du runtime (secondes).                          | `/acp timeout 120`                                             |
| `/acp model`         | Définir le remplacement du modèle de runtime.                                 | `/acp model anthropic/claude-opus-4-6`                         |
| `/acp reset-options` | Supprimer les remplacements d'options de runtime de session.                  | `/acp reset-options`                                           |
| `/acp sessions`      | Lister les sessions ACP récentes depuis le magasin.                           | `/acp sessions`                                                |
| `/acp doctor`        | Santé du backend, capacités, corrections actionnables.                        | `/acp doctor`                                                  |
| `/acp install`       | Imprimer les étapes d'installation et d'activation déterministes.             | `/acp install`                                                 |

`/acp sessions` lit le magasin pour la session liée actuelle ou la session demanderesse. Les commandes qui acceptent les jetons `session-key`, `session-id` ou `session-label` résolvent les cibles via la découverte de session de passerelle, y compris les racines `session.store` personnalisées par agent.

## Mappage des options de runtime

`/acp` dispose de commandes pratiques et d'un définisseur générique.

Opérations équivalentes :

- `/acp model <id>` correspond à la clé de configuration de runtime `model`.
- `/acp permissions <profile>` correspond à la clé de configuration de runtime `approval_policy`.
- `/acp timeout <seconds>` correspond à la clé de configuration de runtime `timeout`.
- `/acp cwd <path>` met à jour directement le remplacement du cwd du runtime.
- `/acp set <key> <value>` est le chemin générique.
  - Cas particulier : `key=cwd` utilise le chemin de remplacement du cwd.
- `/acp reset-options` efface tous les remplacements de runtime pour la session cible.

## prise en charge du harnais acpx (actuel)

Alias de harnais intégrés actuels d'acpx :

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

Lorsque OpenClaw utilise le backend acpx, privilégiez ces valeurs pour `agentId` sauf si votre configuration acpx définit des alias d'agent personnalisés.

L'utilisation directe de la CLI acpx peut également cibler des adaptateurs arbitraires via `--agent <command>`, mais cette échappatoire brute est une fonctionnalité de la CLI acpx (et non le chemin normal OpenClaw `agentId`).

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

Si le lancement d'ACP lié à un fil ne fonctionne pas, vérifiez d'abord le paramètre de fonctionnalité de l'adaptateur :

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

Vérifiez ensuite l'état du backend :

```text
/acp doctor
```

### Configuration de la commande et de la version d'acpx

Par défaut, le plugin backend groupé acpx (`acpx`) utilise le binaire épinglé local au plugin :

1. La commande par défaut est `extensions/acpx/node_modules/.bin/acpx`.
2. La version attendue correspond par défaut à l'épingle de l'extension.
3. Le démarrage enregistre immédiatement le backend ACP comme non prêt.
4. Une tâche d'arrière-plan vérifie `acpx --version`.
5. Si le binaire local du plugin est manquant ou ne correspond pas, il exécute :
   `npm install --omit=dev --no-save acpx@<pinned>` et vérifie à nouveau.

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
- Le démarrage de OpenClaw reste non bloquant pendant que la vérification de l'état du backend s'exécute.

Voir [Plugins](/fr/tools/plugin).

## Configuration des autorisations

Les sessions ACP s'exécutent de manière non interactive — il n'y a pas de TTY pour approuver ou refuser les invites d'autorisation d'écriture de fichiers et d'exécution de shell. Le plugin acpx fournit deux clés de configuration qui contrôlent la gestion des autorisations :

### `permissionMode`

Contrôle les opérations que l'agent de harnais peut effectuer sans invite.

| Valeur          | Comportement                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `approve-all`   | Approuver automatiquement toutes les écritures de fichiers et les commandes shell.                           |
| `approve-reads` | Approuver automatiquement les lectures uniquement ; les écritures et les exécutions nécessitent des invites. |
| `deny-all`      | Refuser toutes les invites d'autorisation.                                                                   |

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

> **Important :** OpenClaw utilise par défaut `permissionMode=approve-reads` et `nonInteractivePermissions=fail`. Dans les sessions ACP non interactives, toute écriture ou exécution déclenchant une invite d'autorisation peut échouer avec `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si vous devez restreindre les autorisations, définissez `nonInteractivePermissions` sur `deny` afin que les sessions se dégradent gracieusement au lieu de planter.

## Dépannage

| Symptôme                                                                 | Cause probable                                                                             | Correction                                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | Plugin backend manquant ou désactivé.                                                      | Installez et activez le plugin backend, puis exécutez `/acp doctor`.                                                                                                                                                    |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP désactivé globalement.                                                                 | Définissez `acp.enabled=true`.                                                                                                                                                                                          |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | Répartition à partir des messages de fil normaux désactivée.                               | Définissez `acp.dispatch.enabled=true`.                                                                                                                                                                                 |
| `ACP agent "<id>" is not allowed by policy`                              | Agent absent de la liste d'autorisation.                                                   | Utilisez `agentId` autorisés ou mettez à jour `acp.allowedAgents`.                                                                                                                                                      |
| `Unable to resolve session target: ...`                                  | Jeton de clé/id/label incorrect.                                                           | Exécutez `/acp sessions`, copiez la clé/label exacte, réessayez.                                                                                                                                                        |
| `--thread here requires running /acp spawn inside an active ... thread`  | `--thread here` utilisé en dehors d'un contexte de fil de discussion.                      | Déplacez-vous vers le fil de discussion cible ou utilisez `--thread auto`/`off`.                                                                                                                                        |
| `Only <user-id> can rebind this thread.`                                 | Un autre utilisateur possède la liaison du fil de discussion.                              | Reliez en tant que propriétaire ou utilisez un autre fil de discussion.                                                                                                                                                 |
| `Thread bindings are unavailable for <channel>.`                         | L'adaptateur manque de capacité de liaison de fil de discussion.                           | Utilisez `--thread off` ou déplacez-vous vers un adaptateur/channel pris en charge.                                                                                                                                     |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | Le runtime ACP est côté hôte ; la session du demandeur est sandboxed.                      | Utilisez `runtime="subagent"` depuis des sessions sandboxed, ou exécutez ACP spawn depuis une session non sandboxed.                                                                                                    |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | `sandbox="require"` demandé pour le runtime ACP.                                           | Utilisez `runtime="subagent"` pour le sandboxing requis, ou utilisez ACP avec `sandbox="inherit"` depuis une session non sandboxed.                                                                                     |
| Métadonnées ACP manquantes pour la session liée                          | Métadonnées de session ACP obsolètes/supprimées.                                           | Recréez avec `/acp spawn`, puis reliez/focussez le fil de discussion.                                                                                                                                                   |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` bloque les écritures/exécutions dans une session ACP non interactive.     | Définissez `plugins.entries.acpx.config.permissionMode` sur `approve-all` et redémarrez la passerelle. Voir [Permission configuration](#permission-configuration).                                                      |
| La session ACP échoue rapidement avec peu de sortie                      | Les invites d'autorisation sont bloquées par `permissionMode`/`nonInteractivePermissions`. | Vérifiez les journaux de la passerelle pour `AcpRuntimeError`. Pour des autorisations complètes, définissez `permissionMode=approve-all` ; pour une dégradation gracieuse, définissez `nonInteractivePermissions=deny`. |
| La session ACP se bloque indéfiniment après avoir terminé le travail     | Le processus du harnais est terminé mais la session ACP n'a pas signalé la fin.            | Surveillez avec `ps aux \| grep acpx` ; tuez manuellement les processus périmés.                                                                                                                                        |
