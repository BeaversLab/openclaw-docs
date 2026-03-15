---
summary: "Règles de routage par canal (WhatsApp, Telegram, Discord, Slack) et contexte partagé"
read_when:
  - Changing channel routing or inbox behavior
title: "Channel Routing"
---

# Channels & routing

OpenClaw routes replies **back to the channel where a message came from**. The
model does not choose a channel; routing is deterministic and controlled by the
host configuration.

## Key terms

- **Channel**: `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.
- **AccountId**: per‑channel account instance (when supported).
- Optional channel default account: `channels.<channel>.defaultAccount` chooses
  which account is used when an outbound path does not specify `accountId`.
  - In multi-account setups, set an explicit default (`defaultAccount` or `accounts.default`) when two or more accounts are configured. Without it, fallback routing may pick the first normalized account ID.
- **AgentId**: an isolated workspace + session store (“brain”).
- **SessionKey**: the bucket key used to store context and control concurrency.

## Session key shapes (examples)

Direct messages collapse to the agent’s **main** session:

- `agent:<agentId>:<mainKey>` (default: `agent:main:main`)

Groups and channels remain isolated per channel:

- Groups: `agent:<agentId>:<channel>:group:<id>`
- Channels/rooms: `agent:<agentId>:<channel>:channel:<id>`

Threads:

- Slack/Discord threads append `:thread:<threadId>` to the base key.
- Telegram forum topics embed `:topic:<topicId>` in the group key.

Examples:

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Main DM route pinning

Lorsque `session.dmScope` est `main`, les messages privés peuvent partager une session principale. Pour empêcher que le `lastRoute` de la session ne soit écrasé par des messages privés de non-propriétaires, OpenClaw déduit un propriétaire épinglé à partir de `allowFrom` lorsque toutes les conditions suivantes sont remplies :

- `allowFrom` a exactement une entrée non générique (non-wildcard).
- L'entrée peut être normalisée en un ID d'expéditeur concret pour ce channel.
- L'expéditeur du message privé entrant ne correspond pas à ce propriétaire épinglé.

Dans ce cas de non-correspondance, OpenClaw enregistre toujours les métadonnées de session entrantes, mais il ignore la mise à jour du `lastRoute` de la session principale.

## Règles de routage (choix d'un agent)

Le routage choisit **un agent** pour chaque message entrant :

1. **Correspondance exacte de pair** (`bindings` avec `peer.kind` + `peer.id`).
2. **Correspondance de pair parent** (héritage de fil de discussion).
3. **Correspondance Guilde + rôles** (Discord) via `guildId` + `roles`.
4. **Correspondance de Guilde** (Discord) via `guildId`.
5. **Correspondance d'équipe** (Slack) via `teamId`.
6. **Correspondance de compte** (`accountId` sur le channel).
7. **Correspondance de channel** (n'importe quel compte sur ce channel, `accountId: "*"`).
8. **Agent par défaut** (`agents.list[].default`, sinon première entrée de la liste, repli sur `main`).

Lorsqu'une liaison inclut plusieurs champs de correspondance (`peer`, `guildId`, `teamId`, `roles`), **tous les champs fournis doivent correspondre** pour que cette liaison s'applique.

L'agent correspondant détermine quel espace de travail et quel magasin de session sont utilisés.

## Groupes de diffusion (exécuter plusieurs agents)

Les groupes de diffusion vous permettent d'exécuter **plusieurs agents** pour le même pair **lorsqu'OpenClaw répondrait normalement** (par exemple : dans les groupes WhatsApp, après filtrage par mention/activation).

Configuration :

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

Voir : [Groupes de diffusion](/fr/channels/broadcast-groups).

## Aperçu de la configuration

- `agents.list` : définitions d'agents nommés (espace de travail, modèle, etc.).
- `bindings` : mappe les canaux/comptes/pairs entrants aux agents.

Exemple :

```json5
{
  agents: {
    list: [{ id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}
```

## Stockage de session

Les magasins de session résident dans le répertoire d'état (par défaut `~/.openclaw`) :

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Les transcriptions JSONL résident à côté du magasin

Vous pouvez remplacer le chemin du magasin via le modèle `session.store` et `{agentId}`.

La découverte de sessions Gateway et ACP analyse également les magasins d'agents sur disque sous la racine `agents/` par défaut et sous les racines `session.store` modelisées. Les magasins découverts doivent rester à l'intérieur de cette racine d'agent résolue et utiliser un fichier `sessions.json` régulier. Les liens symboliques et les chemins hors racine sont ignorés.

## Comportement WebChat

WebChat s'attache à l'**agent sélectionné** et utilise par défaut la session principale de l'agent. Pour cette raison, WebChat vous permet de voir le contexte inter-canaux de cet agent en un seul endroit.

## Contexte de réponse

Les réponses entrantes incluent :

- `ReplyToId`, `ReplyToBody` et `ReplyToSender` lorsqu'ils sont disponibles.
- Le contexte cité est ajouté à `Body` sous forme de bloc `[Replying to ...]`.

Ceci est cohérent sur tous les canaux.

import fr from '/components/footer/fr.mdx';

<fr />
