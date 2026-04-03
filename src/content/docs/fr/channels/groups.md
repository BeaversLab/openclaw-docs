---
summary: "Comportement des discussions de groupe sur toutes les surfaces (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Groupes"
---

# Groupes

OpenClaw traite les discussions de groupe de manière cohérente sur toutes les surfaces : Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

## Introduction pour débutants (2 minutes)

OpenClaw « vit » sur vos propres comptes de messagerie. Il n'y a pas d'utilisateur bot WhatsApp distinct.
Si **vous** êtes dans un groupe, WhatsApp peut voir ce groupe et y répondre.

Comportement par défaut :

- Les groupes sont restreints (`groupPolicy: "allowlist"`).
- Les réponses nécessitent une mention, sauf si vous désactivez explicitement le filtrage par mention.

Traduction : les expéditeurs autorisés peuvent déclencher OpenClaw en le mentionnant.

> TL;DR
>
> - L'**accès DM** est contrôlé par `*.allowFrom`.
> - L'**accès aux groupes** est contrôlé par `*.groupPolicy` + listes d'autorisation (`*.groups`, `*.groupAllowFrom`).
> - Le **déclenchement de réponse** est contrôlé par le filtrage des mentions (`requireMention`, `/activation`).

Flux rapide (ce qui arrive à un message de groupe) :

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Group message flow](/images/groups-flow.svg)

Si vous voulez...

| Objectif                                                          | Ce qu'il faut définir                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Autoriser tous les groupes mais répondre uniquement sur @mentions | `groups: { "*": { requireMention: true } }`                |
| Désactiver toutes les réponses de groupe                          | `groupPolicy: "disabled"`                                  |
| Seulement des groupes spécifiques                                 | `groups: { "<group-id>": { ... } }` (pas de clé `"*"`)     |
| Seulement vous pouvez déclencher dans les groupes                 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## Clés de session

- Les sessions de groupe utilisent des clés de session `agent:<agentId>:<channel>:group:<id>` (les salons/canaux utilisent `agent:<agentId>:<channel>:channel:<id>`).
- Les sujets de forum Telegram ajoutent `:topic:<threadId>` à l'identifiant du groupe afin que chaque sujet ait sa propre session.
- Les conversations directes utilisent la session principale (ou par expéditeur si configuré).
- Les signaux de présence (heartbeats) sont ignorés pour les sessions de groupe.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Modèle : DMs personnels + groupes publics (agent unique)

Oui — cela fonctionne bien si votre trafic « personnel » est constitué de **DMs** et votre trafic « public » de **groupes**.

Pourquoi : en mode agent unique, les DMs atterrissent généralement dans la clé de session **principale** (`agent:main:main`), tandis que les groupes utilisent toujours des clés de session **non principales** (`agent:main:<channel>:group:<id>`). Si vous activez l'isolation (sandboxing) avec `mode: "non-main"`, ces sessions de groupe s'exécutent dans Docker tandis que votre session DM principale reste sur l'hôte.

Cela vous offre un « cerveau » d'agent unique (espace de travail partagé + mémoire), mais deux postures d'exécution :

- **DMs** : outils complets (hôte)
- **Groupes** : sandbox + outils restreints (Docker)

> Si vous avez besoin d'espaces de travail ou de personnalités vraiment distincts (les « personnels » et « publics » ne doivent jamais se mélanger), utilisez un deuxième agent + liaisons. Voir [Multi-Agent Routing](/en/concepts/multi-agent).

Exemple (DMs sur l'hôte, groupes en sandbox + outils de messagerie uniquement) :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // groups/channels are non-main -> sandboxed
        scope: "session", // strongest isolation (one container per group/channel)
        workspaceAccess: "none",
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        // If allow is non-empty, everything else is blocked (deny still wins).
        allow: ["group:messaging", "group:sessions"],
        deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"],
      },
    },
  },
}
```

Vous préférez « les groupes ne peuvent voir que le dossier X » plutôt que « pas d'accès à l'hôte » ? Gardez `workspaceAccess: "none"` et montez uniquement les chemins autorisés dans le bac à sable :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
        docker: {
          binds: [
            // hostPath:containerPath:mode
            "/home/user/FriendsShared:/data:ro",
          ],
        },
      },
    },
  },
}
```

Connexe :

- Clés de configuration et valeurs par défaut : [configuration du Gateway](/en/gateway/configuration-reference#agentsdefaultssandbox)
- Débogage du blocage d'un outil : [Bac à sable vs Stratégie d'outil vs Élevé](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
- Détails des montages de liaison : [Isolement (Sandboxing)](/en/gateway/sandboxing#custom-bind-mounts)

## Libellés d'affichage

- Les libellés de l'interface utilisateur utilisent `displayName` si disponible, formatés comme `<channel>:<token>`.
- `#room` est réservé aux salons/canaux ; les discussions de groupe utilisent `g-<slug>` (en minuscules, espaces -> `-`, garder `#@+._-`).

## Stratégie de groupe

Contrôler la gestion des messages de groupe/salon par canal :

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789"], // numeric Telegram user id (wizard can resolve @username)
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"],
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"],
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["user@org.com"],
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        GUILD_ID: { channels: { help: { allow: true } } },
      },
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } },
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@owner:example.org"],
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
    },
  },
}
```

| Stratégie     | Comportement                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `"open"`      | Les groupes contournent les listes d'autorisation ; le filtrage par mention s'applique toujours. |
| `"disabled"`  | Bloquer tous les messages de groupe.                                                             |
| `"allowlist"` | Autoriser uniquement les groupes/salons correspondant à la liste d'autorisation configurée.      |

Remarques :

- `groupPolicy` est distinct du filtrage par mention (qui nécessite des @mentions).
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo : utilisez `groupAllowFrom` (solution de repli : `allowFrom` explicite).
- Les approbations d'appariement DM (entrées du magasin `*-allowFrom`) s'appliquent uniquement à l'accès DM ; l'autorisation de l'expéditeur de groupe reste explicite aux listes d'autorisation de groupe.
- Discord : la liste d'autorisation utilise `channels.discord.guilds.<id>.channels`.
- Slack : la liste d'autorisation utilise `channels.slack.channels`.
- Matrix : la liste d'autorisation utilise `channels.matrix.groups`. Privilégiez les ID de salle ou les alias ; la recherche par nom de salle rejointe est au mieux effort, et les noms non résolus sont ignorés à l'exécution. Utilisez `channels.matrix.groupAllowFrom` pour restreindre les expéditeurs ; les listes d'autorisation `users` par salle sont également prises en charge.
- Les DM de groupe sont contrôlés séparément (`channels.discord.dm.*`, `channels.slack.dm.*`).
- Telegram allowlist peut correspondre aux ID d'utilisateur (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou aux noms d'utilisateur (`"@alice"` ou `"alice"`) ; les préfixes ne sont pas sensibles à la casse.
- La valeur par défaut est `groupPolicy: "allowlist"` ; si votre allowlist de groupe est vide, les messages de groupe sont bloqués.
- Sécurité d'exécution : lorsqu'un bloc de fournisseur est complètement manquant (`channels.<provider>` absent), la stratégie de groupe revient à un mode fermé par défaut (généralement `allowlist`) au lieu d'hériter de `channels.defaults.groupPolicy`.

Modèle mental rapide (ordre d'évaluation pour les messages de groupe) :

1. `groupPolicy` (ouvert/désactivé/allowlist)
2. allowlists de groupe (`*.groups`, `*.groupAllowFrom`, allowlist spécifique au channel)
3. filtrage par mention (`requireMention`, `/activation`)

## Filtrage par mention (par défaut)

Les messages de groupe nécessitent une mention, sauf si cela est remplacé pour chaque groupe. Les valeurs par défaut résident par sous-système sous `*.groups."*"`.

Répondre à un message du bot compte comme une mention implicite (lorsque le channel prend en charge les métadonnées de réponse). Cela s'applique à Telegram, WhatsApp, Slack, Discord et Microsoft Teams.

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false },
      },
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false },
      },
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw", "\\+15555550123"],
          historyLimit: 50,
        },
      },
    ],
  },
}
```

Remarques :

- `mentionPatterns` sont des motifs regex sécurisés insensibles à la casse ; les motifs non valides et les formes de répétition imbriquée non sécurisées sont ignorés.
- Les surfaces qui fournissent des mentions explicites passent toujours ; les motifs sont un repli.
- Remplacement par agent : `agents.list[].groupChat.mentionPatterns` (utile lorsque plusieurs agents partagent un groupe).
- Le filtrage par mention n'est appliqué que lorsque la détection de mention est possible (les mentions natives ou `mentionPatterns` sont configurées).
- Les valeurs par défaut Discord se trouvent dans `channels.discord.guilds."*"` (remplaçables par guilde/channel).
- Le contexte de l'historique de groupe est encapsulé de manière uniforme sur tous les channels et est **en attente uniquement** (messages ignorés en raison du filtrage par mention) ; utilisez `messages.groupChat.historyLimit` pour la valeur par défaut globale et `channels.<channel>.historyLimit` (ou `channels.<channel>.accounts.*.historyLimit`) pour les remplacements. Définissez `0` pour désactiver.

## Restrictions d'outil de groupe/channel (optionnel)

Certaines configurations de channel prennent en charge la restriction des outils disponibles **à l'intérieur d'un groupe/room/channel spécifique**.

- `tools` : autoriser/refuser les outils pour l'ensemble du groupe.
- `toolsBySender` : remplacements par expéditeur au sein du groupe.
  Utilisez des préfixes de clé explicites :
  `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` et le caractère générique `"*"`.
  Les clés héritées sans préfixe sont toujours acceptées et correspondantes en tant que `id:` uniquement.

Ordre de résolution (le plus spécifique l'emporte) :

1. group/channel `toolsBySender` correspondance
2. group/channel `tools`
3. défaut (`"*"`) `toolsBySender` correspondance
4. défaut (`"*"`) `tools`

Exemple (Telegram) :

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { tools: { deny: ["exec"] } },
        "-1001234567890": {
          tools: { deny: ["exec", "read", "write"] },
          toolsBySender: {
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

Remarques :

- Les restrictions d'outils de groupe/channel sont appliquées en plus de la stratégie d'outil global/agent (le refus l'emporte toujours).
- Certains channels utilisent une imbrication différente pour les rooms/channels (par exemple, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).

## Listes d'autorisation de groupe (Group allowlists)

Lorsque `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` est configuré, les clés agissent comme une liste d'autorisation de groupe. Utilisez `"*"` pour autoriser tous les groupes tout en définissant le comportement de mention par défaut.

Intentions courantes (copier/coller) :

1. Désactiver toutes les réponses de groupe

```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } },
}
```

2. Autoriser uniquement des groupes spécifiques (WhatsApp)

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "123@g.us": { requireMention: true },
        "456@g.us": { requireMention: false },
      },
    },
  },
}
```

3. Autoriser tous les groupes mais exiger une mention (explicite)

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } },
    },
  },
}
```

4. Seul le propriétaire peut déclencher dans les groupes (WhatsApp)

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
      groups: { "*": { requireMention: true } },
    },
  },
}
```

## Activation (propriétaire uniquement)

Les propriétaires de groupe peuvent activer/désactiver l'activation par groupe :

- `/activation mention`
- `/activation always`

Le propriétaire est déterminé par `channels.whatsapp.allowFrom` (ou l'E.164 du bot lui-même s'il n'est pas défini). Envoyez la commande sous forme de message autonome. D'autres surfaces ignorent actuellement `/activation`.

## Champs de contexte

Les payloads entrants de groupe définissent :

- `ChatType=group`
- `GroupSubject` (si connu)
- `GroupMembers` (si connu)
- `WasMentioned` (résultat du filtrage par mention)
- Les sujets de forum Telegram incluent également `MessageThreadId` et `IsForum`.

Notes spécifiques au canal :

- BlueBubbles peut optionnellement enrichir les participants de groupe macOS sans nom à partir de la base de données Contacts locale avant de remplir `GroupMembers`. Ceci est désactivé par défaut et ne s'exécute qu'après que le filtrage de groupe normal est passé.

Le prompt système de l'agent inclut une introduction de groupe lors du premier tour d'une nouvelle session de groupe. Cela rappelle au model de répondre comme un humain, d'éviter les tableaux Markdown, et d'éviter de taper des séquences `\n` littérales.

## Spécificités iMessage

- Préférez `chat_id:<id>` lors du routage ou de la mise sur liste blanche.
- Lister les chats : `imsg chats --limit 20`.
- Les réponses de groupe reviennent toujours au même `chat_id`.

## Spécificités WhatsApp

Voir [Group messages](/en/channels/group-messages) pour le comportement exclusif à WhatsApp (injection d'historique, détails de gestion des mentions).
