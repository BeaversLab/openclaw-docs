---
summary: "Règles de routage par canal (WhatsApp, Telegram, Discord, Slack) et contexte partagé"
read_when:
  - Modification du routage par canal ou du comportement de la boîte de réception
title: "Routage de canal"
---

# Channels & routing

OpenClaw achemine les réponses **vers le canal d'où provient le message**. Le
model ne choisit pas de canal ; le routage est déterministe et contrôlé par la
configuration de l'hôte.

## Key terms

- **Channel** : `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.
- **AccountId**: per‑channel account instance (when supported).
- Compte par canal par défaut : `channels.<channel>.defaultAccount` choisit
  quel compte est utilisé lorsqu'un chemin sortant ne spécifie pas `accountId`.
  - Dans les configurations multi-comptes, définissez un défaut explicite (`defaultAccount` ou `accounts.default`) lorsque deux comptes ou plus sont configurés. Sans cela, le routage de secours peut choisir le premier ID de compte normalisé.
- **AgentId**: an isolated workspace + session store (“brain”).
- **SessionKey**: the bucket key used to store context and control concurrency.

## Session key shapes (examples)

Direct messages collapse to the agent’s **main** session:

- `agent:<agentId>:<mainKey>` (par défaut : `agent:main:main`)

Groups and channels remain isolated per channel:

- Groupes : `agent:<agentId>:<channel>:group:<id>`
- Canaux/salles : `agent:<agentId>:<channel>:channel:<id>`

Threads:

- Les fils de discussion Slack/Discord ajoutent `:thread:<threadId>` à la clé de base.
- Les sujets de forum Telegram intègrent `:topic:<topicId>` dans la clé de groupe.

Examples:

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Main DM route pinning

Lorsque `session.dmScope` est `main`, les messages directs peuvent partager une session principale.
Pour empêcher que le `lastRoute` de la session ne soit écrasé par des messages directs de non-propriétaires,
OpenClaw déduit un propriétaire épinglé à partir de `allowFrom` lorsque toutes ces conditions sont remplies :

- `allowFrom` a exactement une entrée non générique.
- L'entrée peut être normalisée en un ID d'expéditeur concret pour ce channel.
- L'expéditeur du message privé entrant ne correspond pas à ce propriétaire épinglé.

Dans ce cas de non-concordance, OpenClaw enregistre toujours les métadonnées de session entrantes, mais il
saute la mise à jour du `lastRoute` de la session principale.

## Règles de routage (choix d'un agent)

Le routage choisit **un agent** pour chaque message entrant :

1. **Correspondance exacte de pair** (`bindings` avec `peer.kind` + `peer.id`).
2. **Correspondance de pair parent** (héritage de fil de discussion).
3. **Correspondance Guilde + rôles** (Discord) via `guildId` + `roles`.
4. **Correspondance de guilde** (Discord) via `guildId`.
5. **Team match** (Slack) via `teamId`.
6. **Account match** (`accountId` sur le channel).
7. **Channel match** (n'importe quel compte sur ce channel, `accountId: "*"`).
8. **Default agent** (`agents.list[].default`, sinon première entrée de liste, repli sur `main`).

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

Voir : [Broadcast Groups](/fr/channels/broadcast-groups).

## Aperçu de la configuration

- `agents.list` : définitions d'agents nommés (espace de travail, model, etc.).
- `bindings` : mapper les channels/comptes/pairs entrants aux agents.

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

Vous pouvez remplacer le chemin du magasin via `session.store` et `{agentId}` de templating.

La découverte de session Gateway et ACP analyse également les magasins d'agents sur disque sous
la racine `agents/` par défaut et sous les racines `session.store` templatisées. Les magasins
découverts doivent rester à l'intérieur de cette racine d'agent résolue et utiliser un fichier
`sessions.json` régulier. Les liens symboliques et les chemins hors racine sont ignorés.

## Comportement WebChat

WebChat se rattache à l'**agent sélectionné** et par défaut à la session principale
de l'agent. Pour cette raison, WebChat vous permet de voir le contexte inter‑channel pour cet
agent en un seul endroit.

## Contexte de réponse

Les réponses entrantes incluent :

- `ReplyToId`, `ReplyToBody`, et `ReplyToSender` lorsque disponible.
- Le contexte cité est ajouté à `Body` sous forme de bloc `[Replying to ...]`.

Ceci est cohérent sur tous les canaux.

import en from "/components/footer/en.mdx";

<en />
