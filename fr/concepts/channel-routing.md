---
summary: "Règles de routage par canal (WhatsApp, Telegram, Discord, Slack) et contexte partagé"
read_when:
  - Changing channel routing or inbox behavior
title: "Routage des canaux"
---

# Canaux et routage

OpenClaw route les réponses **vers le canal d'où provient le message**. Le
model ne choisit pas de canal ; le routage est déterministe et contrôlé par la
configuration de l'hôte.

## Termes clés

- **Channel** : `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.
- **AccountId** : instance de compte par canal (lorsque pris en charge).
- **AgentId** : un espace de travail isolé + magasin de session (« cerveau »).
- **SessionKey** : la clé de compartiment utilisée pour stocker le contexte et contrôler la concurrence.

## Formes de clés de session (exemples)

Les messages directs réduisent vers la session **principale** de l'agent :

- `agent:<agentId>:<mainKey>` (par défaut : `agent:main:main`)

Les groupes et les canaux restent isolés par canal :

- Groupes : `agent:<agentId>:<channel>:group:<id>`
- Canaux/salons : `agent:<agentId>:<channel>:channel:<id>`

Fils de discussion :

- Les fils de discussion Slack/Discord ajoutent `:thread:<threadId>` à la clé de base.
- Les sujets de forum Telegram intègrent `:topic:<topicId>` dans la clé de groupe.

Exemples :

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Règles de routage (choix d'un agent)

Le routage choisit **un agent** pour chaque message entrant :

1. **Correspondance exacte des pairs** (`bindings` avec `peer.kind` + `peer.id`).
2. **Correspondance de guilde** (Discord) via `guildId`.
3. **Correspondance d'équipe** (Slack) via `teamId`.
4. **Correspondance de compte** (`accountId` sur le canal).
5. **Correspondance de canal** (n'importe quel compte sur ce canal).
6. **Agent par défaut** (`agents.list[].default`, sinon première entrée de la liste, repli sur `main`).

L'agent correspondant détermine quel espace de travail et quel magasin de session sont utilisés.

## Groupes de diffusion (exécuter plusieurs agents)

Les groupes de diffusion vous permettent d'exécuter **plusieurs agents** pour le même pair **quand OpenClaw répondrait normalement** (par exemple : dans les groupes WhatsApp, après le filtrage par mention/activation).

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

Voir : [Groupes de diffusion](/fr/broadcast-groups).

## Aperçu de la configuration

- `agents.list` : définitions d'agents nommées (espace de travail, model, etc.).
- `bindings` : faire correspondre les channels/comptes/pairs entrants aux agents.

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

## Comportement WebChat

WebChat se rattache à l'**agent sélectionné** et utilise par défaut la session principale de cet agent. De ce fait, WebChat vous permet de voir le contexte inter-canal pour cet agent en un seul endroit.

## Contexte de réponse

Les réponses entrantes incluent :

- `ReplyToId`, `ReplyToBody` et `ReplyToSender` lorsque disponibles.
- Le contexte cité est ajouté à `Body` sous forme de bloc `[Replying to ...]`.

Ceci est cohérent d'un channel à l'autre.

import fr from '/components/footer/fr.mdx';

<fr />
