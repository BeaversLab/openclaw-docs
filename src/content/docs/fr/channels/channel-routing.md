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

- **Channel** : `telegram`, `whatsapp`, `discord`, `irc`, `googlechat`, `slack`, `signal`, `imessage`, `line`, ainsi que les canaux de plugiciels. `webchat` est le canal de l'interface utilisateur WebChat interne et n'est pas un canal sortant configurable.
- **AccountId**: per‑channel account instance (when supported).
- Compte par défaut du canal facultatif : `channels.<channel>.defaultAccount` choisit
  quel compte est utilisé lorsqu'un chemin sortant ne spécifie pas `accountId`.
  - Dans les configurations multi-comptes, définissez une valeur par défaut explicite (`defaultAccount` ou `accounts.default`) lorsque deux comptes ou plus sont configurés. Sans cela, le routage de secours peut choisir le premier ID de compte normalisé.
- **AgentId**: an isolated workspace + session store (“brain”).
- **SessionKey**: the bucket key used to store context and control concurrency.

## Session key shapes (examples)

Les messages directs sont regroupés dans la **session principale** de l'agent par défaut :

- `agent:<agentId>:<mainKey>` (par défaut : `agent:main:main`)

Même lorsque l'historique des conversations par messages directs est partagé avec la session principale, les règles de bac à sable et d'outil utilisent une clé d'exécution de conversation directe dérivée par compte pour les MD externes, afin que les messages originaires du canal ne soient pas traités comme des exécutions de session principale locales.

Les groupes et les canaux restent isolés par canal :

- Groupes : `agent:<agentId>:<channel>:group:<id>`
- Canaux/salons : `agent:<agentId>:<channel>:channel:<id>`

Fils de discussion :

- Les fils de discussion Slack/Discord ajoutent `:thread:<threadId>` à la clé de base.
- Les sujets de forum Telegram intègrent `:topic:<topicId>` dans la clé de groupe.

Exemples :

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Épinglage de la route MD principale

Lorsque `session.dmScope` est `main`, les messages directs peuvent partager une session principale.
Pour empêcher que le `lastRoute` de la session ne soit écrasé par des MD de non-propriétaires,
OpenClaw déduit un propriétaire épinglé à partir de `allowFrom` lorsque toutes ces conditions sont remplies :

- `allowFrom` comporte exactement une entrée sans caractère générique.
- L'entrée peut être normalisée en un ID d'expéditeur concret pour ce canal.
- L'expéditeur du MD entrant ne correspond pas à ce propriétaire épinglé.

Dans ce cas de non-correspondance, OpenClaw enregistre toujours les métadonnées de session entrantes, mais
il évite de mettre à jour le `lastRoute` de la session principale.

## Règles de routage (choix d'un agent)

Le routage choisit **un agent** pour chaque message entrant :

1. **Correspondance exacte des pairs** (`bindings` avec `peer.kind` + `peer.id`).
2. **Correspondance des pairs parents** (héritage du fil).
3. **Correspondance Guilde + rôles** (Discord) via `guildId` + `roles`.
4. **Guild match** (Discord) via `guildId`.
5. **Team match** (Slack) via `teamId`.
6. **Account match** (`accountId` on the channel).
7. **Channel match** (any account on that channel, `accountId: "*"`).
8. **Default agent** (`agents.list[].default`, else first list entry, fallback to `main`).

When a binding includes multiple match fields (`peer`, `guildId`, `teamId`, `roles`), **all provided fields must match** for that binding to apply.

The matched agent determines which workspace and session store are used.

## Broadcast groups (run multiple agents)

Broadcast groups let you run **multiple agents** for the same peer **when OpenClaw would normally reply** (for example: in WhatsApp groups, after mention/activation gating).

Config :

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

See : [Broadcast Groups](/fr/channels/broadcast-groups).

## Config overview

- `agents.list` : named agent definitions (workspace, model, etc.).
- `bindings` : map inbound channels/accounts/peers to agents.

Example :

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

## Session storage

Session stores live under the state directory (default `~/.openclaw`) :

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- JSONL transcripts live alongside the store

You can override the store path via `session.store` and `{agentId}` templating.

Gateway and ACP session discovery also scans disk-backed agent stores under the
default `agents/` root and under templated `session.store` roots. Discovered
stores must stay inside that resolved agent root and use a regular
`sessions.json` file. Symlinks and out-of-root paths are ignored.

## WebChat behavior

WebChat attaches to the **selected agent** and defaults to the agent’s main
session. Because of this, WebChat lets you see cross‑channel context for that
agent in one place.

## Reply context

Inbound replies include :

- `ReplyToId`, `ReplyToBody`, and `ReplyToSender` when available.
- Le contexte cité est ajouté à `Body` sous forme de bloc `[Replying to ...]`.

Ceci est cohérent sur tous les canaux.
