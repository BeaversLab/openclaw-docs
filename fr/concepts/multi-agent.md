---
summary: "Routage multi-agent : agents isolés, comptes de canal et liaisons"
title: Routage Multi-Agent
read_when: "Vous souhaitez plusieurs agents isolés (espaces de travail + auth) dans un seul processus de passerelle."
status: active
---

# Routage Multi-Agent

Objectif : plusieurs agents _isolés_ (espace de travail séparé + `agentDir` + sessions), ainsi que plusieurs comptes de canal (par exemple, deux WhatsApp) dans un seul Gateway en cours d'exécution. Le trafic entrant est acheminé vers un agent via des liaisons.

## Qu'est-ce qu'« un agent » ?

Un **agent** est un cerveau entièrement délimité avec son propre :

- **Espace de travail** (fichiers, AGENTS.md/SOUL.md/USER.md, notes locales, règles de persona).
- **Répertoire d'état** (`agentDir`) pour les profils d'authentification, le registre de modèles et la configuration par agent.
- **Magasin de sessions** (historique des discussions + état de routage) sous `~/.openclaw/agents/<agentId>/sessions`.

Les profils d'authentification sont **propres à chaque agent**. Chaque agent lit à partir de son propre :

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Les identifiants de l'agent principal ne sont **pas** partagés automatiquement. Ne réutilisez jamais `agentDir`
entre les agents (cela provoque des collisions d'authentification/session). Si vous souhaitez partager des identifiants,
copiez `auth-profiles.json` dans le `agentDir` de l'autre agent.

Les compétences (Skills) sont propres à chaque agent via le dossier `skills/` de chaque espace de travail, avec des compétences partagées
disponibles depuis `~/.openclaw/skills`. Voir [Compétences : par agent vs partagées](/fr/tools/skills#per-agent-vs-shared-skills).

Le Gateway peut héberger **un agent** (par défaut) ou **plusieurs agents** côte à côte.

**Note sur l'espace de travail :** l'espace de travail de chaque agent est le **cwd par défaut**, et non un bac à sable
strict. Les chemins relatifs sont résolus à l'intérieur de l'espace de travail, mais les chemins absolus peuvent
atteindre d'autres emplacements de l'hôte sauf si le sandboxing est activé. Voir
[Sandboxing](/fr/gateway/sandboxing).

## Chemins (carte rapide)

- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état : `~/.openclaw` (ou `OPENCLAW_STATE_DIR`)
- Espace de travail : `~/.openclaw/workspace` (ou `~/.openclaw/workspace-<agentId>`)
- Répertoire de l'agent : `~/.openclaw/agents/<agentId>/agent` (ou `agents.list[].agentDir`)
- Sessions : `~/.openclaw/agents/<agentId>/sessions`

### Mode mono-agent (par défaut)

Si vous ne faites rien, OpenClaw exécute un seul agent :

- `agentId` vaut par défaut **`main`**.
- Les sessions sont indexées comme `agent:main:<mainKey>`.
- L'espace de travail vaut par défaut `~/.openclaw/workspace` (ou `~/.openclaw/workspace-<profile>` lorsque `OPENCLAW_PROFILE` est défini).
- L'état vaut par défaut `~/.openclaw/agents/main/agent`.

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

Chaque agent obtient son propre espace de travail avec `SOUL.md`, `AGENTS.md` et `USER.md` en option, ainsi qu'un `agentDir` dédié et un magasin de sessions sous `~/.openclaw/agents/<agentId>`.

  </Step>

  <Step title="Créer des comptes de channel">

Créez un compte par agent sur les channels de votre choix :

- Discord : un bot par agent, activez l'intention de contenu de message (Message Content Intent), copiez chaque jeton.
- Telegram : un bot par agent via BotFather, copiez chaque jeton.
- WhatsApp : liez chaque numéro de téléphone par compte.

```bash
openclaw channels login --channel whatsapp --account work
```

Voir les guides de channel : [Discord](/fr/channels/discord), [Telegram](/fr/channels/telegram), [WhatsApp](/fr/channels/whatsapp).

  </Step>

  <Step title="Ajouter des agents, des comptes et des liaisons">

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

## Plusieurs agents = plusieurs personnes, plusieurs personnalités

Avec **plusieurs agents**, chaque `agentId` devient une **personnalité entièrement isolée** :

- **Différents numéros de téléphone/comptes** (par channel `accountId`).
- **Différentes personnalités** (fichiers d'espace de travail par agent comme `AGENTS.md` et `SOUL.md`).
- **Auth + sessions séparées** (aucun croisement sauf si explicitement activé).

Cela permet à **plusieurs personnes** de partager un serveur Gateway tout en gardant leurs « cerveaux » IA et leurs données isolés.

## Un numéro WhatsApp, plusieurs personnes (division de DM)

Vous pouvez acheminer **différents DM WhatsApp** vers différents agents tout en restant sur **un seul compte WhatsApp**. Faites correspondre sur l'expéditeur E.164 (comme `+15551234567`) avec `peer.kind: "direct"`. Les réponses proviennent toujours du même numéro WhatsApp (pas d'identité d'expéditeur par agent).

Détail important : les chats directs réduisent vers la **clé de session principale** de l'agent, donc une véritable isolation nécessite **un agent par personne**.

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

- Le contrôle d'accès DM est **global par compte WhatsApp** (jumelage/liste blanche), et non par agent.
- Pour les groupes partagés, liez le groupe à un seul agent ou utilisez [Groupes de diffusion](/fr/channels/broadcast-groups).

## Règles de routage (comment les messages choisissent un agent)

Les liaisons sont **déterministes** et **le plus spécifique l'emporte** :

1. correspondance `peer` (id DM/groupe/canal exact)
2. correspondance `parentPeer` (héritage de fil de discussion)
3. `guildId + roles` (routage par rôle Discord)
4. `guildId` (Discord)
5. `teamId` (Slack)
6. `accountId` correspondance pour une channel
7. correspondance au niveau channel (`accountId: "*"`)
8. repli vers l'agent par défaut (`agents.list[].default`, sinon première entrée de la liste, par défaut : `main`)

Si plusieurs liaisons correspondent dans le même niveau, la première dans l'ordre de configuration l'emporte.
Si une liaison définit plusieurs champs de correspondance (par exemple `peer` + `guildId`), tous les champs spécifiés sont requis (sémantique `AND`).

Détail important sur la portée du compte :

- Une liaison qui omet `accountId` correspond uniquement au compte par défaut.
- Utilisez `accountId: "*"` pour un repli couvrant l'ensemble de la channel pour tous les comptes.
- Si vous ajoutez ultérieurement la même liaison pour le même agent avec un identifiant de compte explicite, OpenClaw met à niveau la liaison existante limitée à la channel pour qu'elle soit couverte par le compte au lieu de la dupliquer.

## Plusieurs comptes / numéros de téléphone

Les channels qui prennent en charge **plusieurs comptes** (par exemple WhatsApp) utilisent `accountId` pour identifier
chaque connexion. Chaque `accountId` peut être acheminé vers un agent différent, permettant ainsi à un seul serveur d'héberger
plusieurs numéros de téléphone sans mélanger les sessions.

Si vous souhaitez un compte par défaut pour toute la channel lorsque `accountId` est omis, définissez
`channels.<channel>.defaultAccount` (optionnel). Lorsqu'il n'est pas défini, OpenClaw revient
à `default` s'il est présent, sinon au premier identifiant de compte configuré (trié).

Les channels courants prenant en charge ce modèle incluent :

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `bluebubbles`, `zalo`, `zalouser`, `nostr`, `feishu`

## Concepts

- `agentId` : un « cerveau » (espace de travail, auth par agent, magasin de sessions par agent).
- `accountId` : une instance de compte de channel (par exemple, compte WhatsApp WhatsApp `"personal"` vs `"biz"`).
- `binding` : achemine les messages entrants vers un `agentId` par `(channel, accountId, peer)` et, facultativement, par les identifiants de guilde/d'équipe.
- Les chats directs sont réduits à `agent:<agentId>:<mainKey>` (« principal » par agent ; `session.mainKey`).

## Exemples de plateformes

### Bots Discord par agent

Chaque compte de bot Discord correspond à un `accountId` unique. Liez chaque compte à un agent et conservez des listes d'autorisation par bot.

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

## Exemple : chat quotidien WhatsApp + travail profond Telegram

Division par channel : acheminez WhatsApp vers un agent rapide du quotidien et Telegram vers un agent Opus.

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

- Si vous avez plusieurs comptes pour un channel, ajoutez `accountId` à la liaison (par exemple `{ channel: "whatsapp", accountId: "personal" }`).
- Pour acheminer un DM/groupe unique vers Opus tout en gardant le reste en chat, ajoutez une liaison `match.peer` pour ce pair ; les correspondances de pair l'emportent toujours sur les règles à l'échelle du channel.

## Exemple : même channel, un pair vers Opus

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

Les liaisons homologues priment toujours, alors gardez-les au-dessus de la règle à l'échelle du canal.

## Agent familial lié à un groupe WhatsApp

Liez un agent familial dédié à un seul groupe WhatsApp, avec un filtrage par mention
et une politique de tool plus stricte :

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
          allow: [
            "exec",
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
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

- Les listes d'autorisation/d'interdiction de tools sont des **tools**, et non des compétences. Si une compétence doit exécuter
  un binaire, assurez-vous que `exec` est autorisé et que le binaire existe dans le sandbox.
- Pour un filtrage plus strict, définissez `agents.list[].groupChat.mentionPatterns` et gardez
  les listes d'autorisation de groupe activées pour le canal.

## Configuration Sandbox et Tools par agent

Chaque agent peut avoir son propre bac à sable et ses propres restrictions d'outil :

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

Remarque : `setupCommand` se trouve sous `sandbox.docker` et s'exécute une seule fois lors de la création du conteneur.
Les remplacements `sandbox.docker.*` par agent sont ignorés lorsque la portée résolue est `"shared"`.

**Avantages :**

- **Isolation de sécurité** : restreindre les outils pour les agents non fiables
- **Contrôle des ressources** : isoler dans un sandbox des agents spécifiques tout en en gardant d'autres sur l'hôte
- **Politiques flexibles** : différentes permissions pour chaque agent

Remarque : `tools.elevated` est **global** et basé sur l'expéditeur ; il n'est pas configurable par agent.
Si vous avez besoin de limites par agent, utilisez `agents.list[].tools` pour refuser `exec`.
Pour le ciblage de groupe, utilisez `agents.list[].groupChat.mentionPatterns` afin que les @mentions correspondent proprement à l'agent prévu.

Voir [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) pour des exemples détaillés.

import fr from "/components/footer/fr.mdx";

<fr />
