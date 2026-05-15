---
summary: "Règles de routage par canal (WhatsApp, Telegram, Discord, Slack) et contexte partagé"
read_when:
  - Changing channel routing or inbox behavior
title: "Routage des canaux"
---

# Channels & routing

OpenClaw routes replies **back to the channel where a message came from**. The
model does not choose a channel; routing is deterministic and controlled by the
host configuration.

## Key terms

- **Channel** : `telegram`, `whatsapp`, `discord`, `irc`, `googlechat`, `slack`, `signal`, `imessage`, `line`, ainsi que les canaux de plugiciels. `webchat` est le canal de l'interface utilisateur WebChat interne et n'est pas un canal sortant configurable.
- **AccountId** : instance de compte par channel (lorsque pris en charge).
- Compte par défaut du canal facultatif : `channels.<channel>.defaultAccount` choisit
  quel compte est utilisé lorsqu'un chemin sortant ne spécifie pas `accountId`.
  - Dans les configurations multi-comptes, définissez une valeur par défaut explicite (`defaultAccount` ou `accounts.default`) lorsque deux comptes ou plus sont configurés. Sans cela, le routage de secours peut choisir le premier ID de compte normalisé.
- **AgentId** : un espace de travail isolé + magasin de session ("cerveau").
- **SessionKey**: the bucket key used to store context and control concurrency.

## Préfixes de cible sortante

Les cibles sortantes explicites peuvent inclure un préfixe de provider, tel que `telegram:123` ou `tg:123`. Le Core traite ce préfixe comme un indicateur de sélection de channel uniquement lorsque le channel sélectionné est `last` ou autrement non résolu, et uniquement lorsque le plugin chargé annonce ce préfixe. Si l'appelant a déjà sélectionné un channel explicite, le préfixe du provider doit correspondre à ce channel ; les combinaisons inter-channel telles que la livraison WhatsApp vers `telegram:123` échouent avant la normalisation spécifique au plugin de la cible.

Les préfixes de type de cible et de service tels que `channel:<id>`, `user:<id>`, `room:<id>`, `thread:<id>`, `imessage:<handle>` et `sms:<number>` restent à l'intérieur de la grammaire du channel sélectionné. Ils ne sélectionnent pas le provider par eux-mêmes.

## Formes de clés de session (exemples)

Les messages directs s'effondrent vers la session **principale** de l'agent par défaut :

- `agent:<agentId>:<mainKey>` (par défaut : `agent:main:main`)

Même lorsque l'historique des conversations par message direct est partagé avec main, la stratégie de sandbox et d'outil utilise une clé d'exécution de chat direct par compte dérivée pour les DM externes, afin que les messages d'origine channel ne soient pas traités comme des exécutions de session principale locales.

Les groupes et les channels restent isolés par channel :

- Groupes : `agent:<agentId>:<channel>:group:<id>`
- Channels/salles : `agent:<agentId>:<channel>:channel:<id>`

Fils de discussion :

- Les fils de discussion Slack/Discord ajoutent `:thread:<threadId>` à la clé de base.
- Les sujets de forum Telegram intègrent `:topic:<topicId>` dans la clé de groupe.

Exemples :

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Épinglage de la route DM principale

Lorsque `session.dmScope` est `main`, les messages privés peuvent partager une session principale. Pour empêcher que le `lastRoute`OpenClaw de la session ne soit écrasé par des DM non propriétaires, OpenClaw déduit un propriétaire épinglé à partir de `allowFrom` lorsque toutes les conditions suivantes sont remplies :

- `allowFrom` a exactement une entrée sans caractère générique.
- L'entrée peut être normalisée en un ID d'expéditeur concret pour ce channel.
- L'expéditeur du DM entrant ne correspond pas à ce propriétaire épinglé.

Dans ce cas de non-concordance, OpenClaw enregistre toujours les métadonnées de session entrantes, mais il ignore la mise à jour du OpenClaw`lastRoute` de la session principale.

## Enregistrement entrant gardé

Les plugins de channel peuvent marquer un enregistrement de session entrant comme `createIfMissing: false`OpenClawOpenClaw lorsqu'un chemin gardé ne doit pas créer une nouvelle session OpenClaw. Dans ce mode, OpenClaw peut mettre à jour les métadonnées et le `lastRoute` d'une session existante, mais il ne crée pas d'entrée de session de routage uniquement parce qu'un message a été observé.

## Règles de routage (choix d'un agent)

Le routage choisit **un agent** pour chaque message entrant :

1. **Correspondance exacte des pairs** (`bindings` avec `peer.kind` + `peer.id`).
2. **Correspondance des pairs parents** (héritage de fil de discussion).
3. **Correspondance Guilde + rôles** (Discord) via Discord`guildId` + `roles`.
4. **Correspondance de guilde** (Discord) via Discord`guildId`.
5. **Correspondance d'équipe** (Slack) via Slack`teamId`.
6. **Correspondance de compte** (`accountId` sur le channel).
7. **Correspondance de channel** (n'importe quel compte sur ce channel, `accountId: "*"`).
8. **Agent par défaut** (`agents.list[].default`, sinon la première entrée de la liste, en repli sur `main`).

Lorsqu'une liaison inclut plusieurs champs de correspondance (`peer`, `guildId`, `teamId`, `roles`), **tous les champs fournis doivent correspondre** pour que cette liaison s'applique.

L'agent correspondant détermine quel espace de travail et quel stockage de session sont utilisés.

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

Voir : [Groupes de diffusion](/fr/channels/broadcast-groups).

## Vue d'ensemble de la configuration

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

Les magasins de session se trouvent sous le répertoire d'état (par défaut `~/.openclaw`) :

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Les transcriptions JSONL vivent à côté du magasin

Vous pouvez remplacer le chemin du magasin via le modèle `session.store` et `{agentId}`.

La découverte de session Gateway et ACP analyse également les magasins d'agents sur disque sous la racine par défaut `agents/` et sous les racines modèles `session.store`. Les magasins découverts doivent rester à l'intérieur de cette racine d'agent résolue et utiliser un fichier `sessions.json` régulier. Les liens symboliques et les chemins hors racine sont ignorés.

## Comportement WebChat

WebChat s'attache à l'**agent sélectionné** et utilise par défaut la session principale de cet agent. De ce fait, WebChat vous permet de voir le contexte inter-channel pour cet agent au même endroit.

## Contexte de réponse

Les réponses entrantes incluent :

- `ReplyToId`, `ReplyToBody` et `ReplyToSender` lorsque disponibles.
- Le contexte cité est ajouté à `Body` sous forme de bloc `[Replying to ...]`.

Ceci est cohérent sur tous les channels.

## Connexes

- [Groupes](/fr/channels/groups)
- [Groupes de diffusion](/fr/channels/broadcast-groups)
- [Jumelage](/fr/channels/pairing)
