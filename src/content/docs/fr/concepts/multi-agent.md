---
summary: "Routage multi-agent : agents isolés, comptes de canal et liaisons"
title: Routage Multi-Agent
read_when: "Vous voulez plusieurs agents isolés (espaces de travail + auth) dans un seul processus de passerelle."
status: active
---

# Routage Multi-Agent

Objectif : plusieurs agents _isolés_ (espace de travail séparé + `agentDir` + sessions), plus plusieurs comptes de canal (par exemple, deux WhatsApp) dans un seul Gateway en cours d'exécution. Le trafic entrant est acheminé vers un agent via des liaisons.

## Qu'est-ce qu'« un agent » ?

Un **agent** est un cerveau entièrement délimité avec son propre :

- **Espace de travail** (fichiers, AGENTS.md/SOUL.md/USER.md, notes locales, règles de persona).
- **Répertoire d'état** (`agentDir`) pour les profils d'authentification, le registre de modèle et la configuration par agent.
- **Magasin de sessions** (historique des discussions + état de routage) sous `~/.openclaw/agents/<agentId>/sessions`.

Les profils d'authentification sont **propres à chaque agent**. Chaque agent lit à partir de son propre :

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

`sessions_history` est également le chemin de rappel inter-sessions le plus sûr ici : il renvoie une vue délimitée et nettoyée, et non une vidange brute de la transcription. Le rappel de l'assistant supprime les balises de réflexion, la structure `<relevant-memories>`, les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appel d'outil tronqués), la structure d'appel d'outil rétrogradée, les jetons de contrôle de modèle ASCII/pleine largeur divulgués et les XML d'appel d'outil MiniMax malformés avant la rédaction/troncature.

Les identifiants de l'agent principal ne sont **pas** partagés automatiquement. Ne réutilisez jamais `agentDir` entre les agents (cela provoque des collisions d'authentification/session). Si vous souhaitez partager des identifiants, copiez `auth-profiles.json` dans le `agentDir` de l'autre agent.

Les compétences sont chargées à partir de l'espace de travail de chaque agent ainsi que des racines partagées telles que `~/.openclaw/skills`, puis filtrées par la liste d'autorisation des compétences de l'agent effectif lorsqu'elle est configurée. Utilisez `agents.defaults.skills` pour une base partagée et `agents.list[].skills` pour un remplacement par agent. Voir [Skills: per-agent vs shared](/fr/tools/skills#per-agent-vs-shared-skills) et [Skills: agent skill allowlists](/fr/tools/skills#agent-skill-allowlists).

Le Gateway peut héberger **un agent** (par défaut) ou **plusieurs agents** côte à côte.

**Remarque sur l'espace de travail :** l'espace de travail de chaque agent est le **cwd par défaut**, et non un bac à sable strict. Les chemins relatifs sont résolus à l'intérieur de l'espace de travail, mais les chemins absolus peuvent atteindre d'autres emplacements de l'hôte à moins que le sandboxing ne soit activé. Voir [Sandboxing](/fr/gateway/sandboxing).

## Chemins (carte rapide)

- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état : `~/.openclaw` (ou `OPENCLAW_STATE_DIR`)
- Espace de travail : `~/.openclaw/workspace` (ou `~/.openclaw/workspace-<agentId>`)
- Répertoire de l'agent : `~/.openclaw/agents/<agentId>/agent` (ou `agents.list[].agentDir`)
- Sessions : `~/.openclaw/agents/<agentId>/sessions`

### Mode mono-agent (par défaut)

Si vous ne faites rien, OpenClaw exécute un seul agent :

- `agentId` correspond par défaut à **`main`**.
- Les sessions sont clés en tant que `agent:main:<mainKey>`.
- L'espace de travail par défaut est `~/.openclaw/workspace` (ou `~/.openclaw/workspace-<profile>` lorsque `OPENCLAW_PROFILE` est défini).
- L'état par défaut est `~/.openclaw/agents/main/agent`.

## Assistant d'agent

Utilisez l'assistant d'agent pour ajouter un nouvel agent isolé :

```bash
openclaw agents add work
```

Ajoutez ensuite `bindings` (ou laissez l'assistant le faire) pour router les messages entrants.

Vérifiez avec :

```bash
openclaw agents list --bindings
```

## Quick start

<Steps>
  <Step title="Créer chaque espace de travail d'agent">

Utilisez l'assistant ou créez les espaces de travail manuellement :

```bash
openclaw agents add coding
openclaw agents add social
```

Chaque agent obtient son propre espace de travail avec `SOUL.md`, `AGENTS.md` et `USER.md` en option, ainsi qu'un `agentDir` dédié et un stockage de session sous `~/.openclaw/agents/<agentId>`.

  </Step>

  <Step title="Créer les comptes de canal">

Créez un compte par agent sur vos canaux préférés :

- Discord : un bot par agent, activez Message Content Intent, copiez chaque jeton.
- Telegram : un bot par agent via BotFather, copiez chaque jeton.
- WhatsApp : liez chaque numéro de téléphone par compte.

```bash
openclaw channels login --channel whatsapp --account work
```

Voir les guides de canal : [Discord](/fr/channels/discord), [Telegram](/fr/channels/telegram), [WhatsApp](/fr/channels/whatsapp).

  </Step>

  <Step title="Ajouter les agents, comptes et liaisons">

Ajoutez des agents sous `agents.list`, des comptes de canal sous `channels.<channel>.accounts`, et connectez-les avec `bindings` (exemples ci-dessous).

  </Step>

  <Step title="Redémarrer et vérifier">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## Multi-agents = plusieurs personnes, plusieurs personnalités

Avec **plusieurs agents**, chaque `agentId` devient une **personnalité entièrement isolée** :

- **Différents numéros de téléphone/comptes** (par canal `accountId`).
- **Différentes personnalités** (fichiers d'espace de travail par agent comme `AGENTS.md` et `SOUL.md`).
- **Auth + sessions séparées** (pas de mélange sauf si explicitement activé).

Cela permet à **plusieurs personnes** de partager un même serveur Gateway tout en gardant leurs « cerveaux » IA et leurs données isolés.

## Recherche de mémoire QMD inter-agent

Si un agent doit rechercher les transcriptions de session QMD d'un autre agent, ajoutez
collections supplémentaires sous `agents.list[].memorySearch.qmd.extraCollections`.
Utilisez `agents.defaults.memorySearch.qmd.extraCollections` uniquement lorsque chaque agent
doit hériter des mêmes collections de transcriptions partagées.

```json5
{
  agents: {
    defaults: {
      workspace: "~/workspaces/main",
      memorySearch: {
        qmd: {
          extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }],
        },
      },
    },
    list: [
      {
        id: "main",
        workspace: "~/workspaces/main",
        memorySearch: {
          qmd: {
            extraCollections: [{ path: "notes" }], // resolves inside workspace -> collection named "notes-main"
          },
        },
      },
      { id: "family", workspace: "~/workspaces/family" },
    ],
  },
  memory: {
    backend: "qmd",
    qmd: { includeDefaultMemory: false },
  },
}
```

Le chemin de collection supplémentaire peut être partagé entre les agents, mais le nom de la collection
reste explicite lorsque le chemin est en dehors de l'espace de travail de l'agent. Les chemins à l'intérieur de
l'espace de travail restent limités à l'agent, de sorte que chaque agent conserve son propre ensemble de recherche de transcription.

## Un numéro WhatsApp, plusieurs personnes (division de DM)

Vous pouvez router **différents WhatsApp DMs** vers différents agents tout en restant sur **un compte WhatsApp**. Faites correspondre l'expéditeur E.164 (comme `+15551234567`) avec `peer.kind: "direct"`. Les réponses proviennent toujours du même numéro WhatsApp (pas d'identité d'expéditeur par agent).

Détail important : les discussions directes sont réduites à la **clé de session principale** de l'agent, donc une véritable isolation nécessite **un agent par personne**.

Exemple :

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" },
    ],
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } },
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } },
    },
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

Notes :

- Le contrôle d'accès DM est **global par compte WhatsApp** (appariement/liste blanche), et non par agent.
- Pour les groupes partagés, liez le groupe à un seul agent ou utilisez [Groupes de diffusion](/fr/channels/broadcast-groups).

## Règles de routage (comment les messages choisissent un agent)

Les liaisons sont **déterministes** et **le plus spécifique l'emporte** :

1. correspondance `peer` (id DM/groupe/canal exact)
2. correspondance `parentPeer` (héritage de fil de discussion)
3. `guildId + roles` (routage par rôle Discord)
4. `guildId` (Discord)
5. `teamId` (Slack)
6. correspondance `accountId` pour un canal
7. correspondance au niveau du canal (`accountId: "*"`)
8. retour à l'agent par défaut (`agents.list[].default`, sinon première entrée de la liste, par défaut : `main`)

Si plusieurs liaisons correspondent dans le même niveau, la première dans l'ordre de configuration l'emporte.
Si une liaison définit plusieurs champs de correspondance (par exemple `peer` + `guildId`), tous les champs spécifiés sont requis (sémantique `AND`).

Détail important de la portée du compte :

- Une liaison qui omet `accountId` correspond uniquement au compte par défaut.
- Utilisez `accountId: "*"` pour un repli à l'échelle du channel sur tous les comptes.
- Si vous ajoutez plus tard la même liaison pour le même agent avec un identifiant de compte explicite, OpenClaw met à niveau la liaison existante limitée au channel en liaison au niveau du compte au lieu de la dupliquer.

## Plusieurs comptes / numéros de téléphone

Les channels qui prennent en charge **plusieurs comptes** (par exemple WhatsApp) utilisent `accountId` pour identifier
chaque connexion. Chaque `accountId` peut être acheminé vers un agent différent, permettant ainsi à un seul serveur d'héberger
plusieurs numéros de téléphone sans mélanger les sessions.

Si vous souhaitez un compte par défaut à l'échelle du channel lorsque `accountId` est omis, définissez
`channels.<channel>.defaultAccount` (facultatif). S'il n'est pas défini, OpenClaw revient
à `default` s'il est présent, sinon au premier identifiant de compte configuré (trié).

Les channels courants prenant en charge ce modèle incluent :

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `bluebubbles`, `zalo`, `zalouser`, `nostr`, `feishu`

## Concepts

- `agentId` : un « cerveau » (espace de travail, authentification par agent, stockage de session par agent).
- `accountId` : une instance de compte de channel (par exemple compte WhatsApp `"personal"` contre `"biz"`).
- `binding` : achemine les messages entrants vers un `agentId` par `(channel, accountId, peer)` et facultativement par ids de guilde/équipe.
- Les discussions directes sont réduites à `agent:<agentId>:<mainKey>` (« principal » par agent ; `session.mainKey`).

## Exemples de plateformes

### Bots Discord par agent

Chaque compte de bot Discord correspond à un `accountId` unique. Liez chaque compte à un agent et conservez les listes d'autorisation par bot.

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "coding", workspace: "~/.openclaw/workspace-coding" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "discord", accountId: "default" } },
    { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
  ],
  channels: {
    discord: {
      groupPolicy: "allowlist",
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN_MAIN",
          guilds: {
            "123456789012345678": {
              channels: {
                "222222222222222222": { allow: true, requireMention: false },
              },
            },
          },
        },
        coding: {
          token: "DISCORD_BOT_TOKEN_CODING",
          guilds: {
            "123456789012345678": {
              channels: {
                "333333333333333333": { allow: true, requireMention: false },
              },
            },
          },
        },
      },
    },
  },
}
```

Notes :

- Invitez chaque bot sur la guilde et activez l'intention de contenu de message (Message Content Intent).
- Les jetons résident dans `channels.discord.accounts.<id>.token` (le compte par défaut peut utiliser `DISCORD_BOT_TOKEN`).

### Bots Telegram par agent

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "alerts", workspace: "~/.openclaw/workspace-alerts" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "telegram", accountId: "default" } },
    { agentId: "alerts", match: { channel: "telegram", accountId: "alerts" } },
  ],
  channels: {
    telegram: {
      accounts: {
        default: {
          botToken: "123456:ABC...",
          dmPolicy: "pairing",
        },
        alerts: {
          botToken: "987654:XYZ...",
          dmPolicy: "allowlist",
          allowFrom: ["tg:123456789"],
        },
      },
    },
  },
}
```

Notes :

- Créez un bot par agent avec BotFather et copiez chaque jeton.
- Les jetons résident dans `channels.telegram.accounts.<id>.botToken` (le compte par défaut peut utiliser `TELEGRAM_BOT_TOKEN`).

### Numéros WhatsApp par agent

Liez chaque compte avant de démarrer la passerelle :

```bash
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

`~/.openclaw/openclaw.json` (JSON5) :

```js
{
  agents: {
    list: [
      {
        id: "home",
        default: true,
        name: "Home",
        workspace: "~/.openclaw/workspace-home",
        agentDir: "~/.openclaw/agents/home/agent",
      },
      {
        id: "work",
        name: "Work",
        workspace: "~/.openclaw/workspace-work",
        agentDir: "~/.openclaw/agents/work/agent",
      },
    ],
  },

  // Deterministic routing: first match wins (most-specific first).
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

    // Optional per-peer override (example: send a specific group to work agent).
    {
      agentId: "work",
      match: {
        channel: "whatsapp",
        accountId: "personal",
        peer: { kind: "group", id: "1203630...@g.us" },
      },
    },
  ],

  // Off by default: agent-to-agent messaging must be explicitly enabled + allowlisted.
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },

  channels: {
    whatsapp: {
      accounts: {
        personal: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/personal
          // authDir: "~/.openclaw/credentials/whatsapp/personal",
        },
        biz: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/biz
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

## Exemple : discussion quotidienne WhatsApp + travail approfondi Telegram

Divisez par channel : acheminez WhatsApp vers un agent rapide du quotidien et Telegram vers un agent Opus.

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6",
      },
    ],
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } },
  ],
}
```

Notes :

- Si vous disposez de plusieurs comptes pour un channel, ajoutez `accountId` à la liaison (par exemple `{ channel: "whatsapp", accountId: "personal" }`).
- Pour acheminer un DM/groupe unique vers Opus tout en gardant le reste en chat, ajoutez une liaison `match.peer` pour cet interlocuteur ; les correspondances d'interlocuteurs l'emportent toujours sur les règles à l'échelle du channel.

## Exemple : même channel, un interlocuteur vers Opus

Gardez WhatsApp sur l'agent rapide, mais acheminez un DM vers Opus :

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6",
      },
    ],
  },
  bindings: [
    {
      agentId: "opus",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } },
    },
    { agentId: "chat", match: { channel: "whatsapp" } },
  ],
}
```

Les liaisons d'interlocuteurs l'emportent toujours, gardez-les donc au-dessus de la règle à l'échelle du channel.

## Agent familial lié à un groupe WhatsApp

Liez un agent familial dédié à un seul groupe WhatsApp, avec un filtrage par mention
et une politique d'outil plus stricte :

```json5
{
  agents: {
    list: [
      {
        id: "family",
        name: "Family",
        workspace: "~/.openclaw/workspace-family",
        identity: { name: "Family Bot" },
        groupChat: {
          mentionPatterns: ["@family", "@familybot", "@Family Bot"],
        },
        sandbox: {
          mode: "all",
          scope: "agent",
        },
        tools: {
          allow: ["exec", "read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"],
        },
      },
    ],
  },
  bindings: [
    {
      agentId: "family",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" },
      },
    },
  ],
}
```

Notes :

- Les listes d'autorisation/refus d'outils sont des **tools**, et non des compétences. Si une compétence doit exécuter
  un binaire, assurez-vous que `exec` est autorisé et que le binaire existe dans le bac à sable.
- Pour un filtrage plus strict, définissez `agents.list[].groupChat.mentionPatterns` et gardez
  les listes d'autorisation de groupe activées pour le channel.

## Configuration du bac à sable et des outils par agent

Chaque agent peut avoir son propre bac à sable et ses propres restrictions d'outils :

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // No sandbox for personal agent
        },
        // No tool restrictions - all tools available
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // Always sandboxed
          scope: "agent",  // One container per agent
          docker: {
            // Optional one-time setup after container creation
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // Only read tool
          deny: ["exec", "write", "edit", "apply_patch"],    // Deny others
        },
      },
    ],
  },
}
```

Remarque : `setupCommand` réside sous `sandbox.docker` et s'exécute une fois lors de la création du conteneur.
Les redéfinitions `sandbox.docker.*` par agent sont ignorées lorsque la portée résolue est `"shared"`.

**Avantages :**

- **Isolation de sécurité** : restreindre les outils pour les agents non fiables
- **Contrôle des ressources** : isoler des agents spécifiques tout en en gardant d'autres sur l'hôte
- **Politiques flexibles** : différentes autorisations par agent

Remarque : `tools.elevated` est **global** et basé sur l'expéditeur ; il n'est pas configurable par agent.
Si vous avez besoin de limites par agent, utilisez `agents.list[].tools` pour refuser `exec`.
Pour le ciblage de groupe, utilisez `agents.list[].groupChat.mentionPatterns` afin que les @mentions correspondent proprement à l'agent prévu.

Voir [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) pour des exemples détaillés.

## Connexes

- [Channel Routing](/fr/channels/channel-routing) — acheminement des messages vers les agents
- [Sub-Agents](/fr/tools/subagents) — lancement d'exécutions d'agent en arrière-plan
- [ACP Agents](/fr/tools/acp-agents) — exécution de harnais de codage externes
- [Presence](/fr/concepts/presence) — présence et disponibilité des agents
- [Session](/fr/concepts/session) — isolement et acheminement des sessions
