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

## Visibilité du contexte et listes d'autorisation

Deux contrôles différents interviennent dans la sécurité des groupes :

- **Autorisation de déclenchement** : qui peut déclencher l'agent (`groupPolicy`, `groups`, `groupAllowFrom`, listes d'autorisation spécifiques au channel).
- **Visibilité du contexte** : quel contexte supplémentaire est injecté dans le model (texte de réponse, citations, historique des fils, métadonnées transmises).

Par défaut, OpenClaw privilégie le comportement de chat normal et conserve le contexte tel qu'il est principalement reçu. Cela signifie que les listes d'autorisation décident principalement de qui peut déclencher des actions, et ne constituent pas une limite de rédaction universelle pour chaque extrait cité ou historique.

Le comportement actuel est spécifique au channel :

- Certains canaux appliquent déjà un filtrage basé sur l'expéditeur pour le contexte supplémentaire dans des chemins spécifiques (par exemple l'amorçage de fils Slack, les recherches de réponse/fils Matrix).
- D'autres canaux transmettent toujours le contexte de citation/réponse/transfert tel quel.

Direction de durcissement (prévue) :

- `contextVisibility: "all"` (par défaut) conserve le comportement actuel tel que reçu.
- `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés.
- `contextVisibility: "allowlist_quote"` est `allowlist` plus une exception explicite de citation/réponse.

Jusqu'à ce que ce modèle de durcissement soit implémenté de manière cohérente sur tous les canaux, attendez-vous à des différences selon l'interface.

![Flux de messages de groupe](/images/groups-flow.svg)

Si vous voulez...

| Objectif                                                          | Ce qu'il faut définir                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Autoriser tous les groupes mais répondre uniquement aux @mentions | `groups: { "*": { requireMention: true } }`                |
| Désactiver toutes les réponses de groupe                          | `groupPolicy: "disabled"`                                  |
| Seulement des groupes spécifiques                                 | `groups: { "<group-id>": { ... } }` (pas de clé `"*"`)     |
| Seulement vous pouvez déclencher dans les groupes                 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## Clés de session

- Les sessions de groupe utilisent des clés de session `agent:<agentId>:<channel>:group:<id>` (les salons/channels utilisent `agent:<agentId>:<channel>:channel:<id>`).
- Les sujets de forum Telegram ajoutent `:topic:<threadId>` à l'identifiant de groupe afin que chaque sujet ait sa propre session.
- Les chats directs utilisent la session principale (ou par expéditeur si configuré).
- Les signaux de présence (heartbeats) sont ignorés pour les sessions de groupe.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Modèle : DMs personnels + groupes publics (agent unique)

Oui — cela fonctionne bien si votre trafic « personnel » se compose de **DMs** et si votre trafic « public » se compose de **groups**.

Pourquoi : en mode mono-agent, les DMs atterrissent généralement dans la **main** session key (`agent:main:main`), tandis que les groupes utilisent toujours des **non-main** session keys (`agent:main:<channel>:group:<id>`). Si vous activez le sandboxing avec `mode: "non-main"`, ces sessions de groupe s'exécutent dans Docker tandis que votre session principale de DM reste sur l'hôte.

Cela vous offre un « cerveau » d'agent unique (espace de travail partagé + mémoire), mais deux postures d'exécution :

- **DMs** : outils complets (hôte)
- **Groups** : sandbox + outils restreints (Docker)

> Si vous avez besoin d'espaces de travail ou de personnalités véritablement distincts (« personnel » et « public » ne doivent jamais se mélanger), utilisez un second agent + liaisons. Voir [Multi-Agent Routing](/en/concepts/multi-agent).

Exemple (DMs sur l'hôte, groupes sandboxés + outils de messagerie uniquement) :

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

Vous voulez que « les groupes ne puissent voir que le dossier X » au lieu de « aucun accès à l'hôte » ? Gardez `workspaceAccess: "none"` et montez uniquement les chemins autorisés (allowlisted) dans le sandbox :

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
- Débogage des raisons pour lesquelles un outil est bloqué : [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
- Détails sur les montages de liaison (bind mounts) : [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts)

## Libellés d'affichage

- Les libellés de l'interface utilisateur utilisent `displayName` si disponibles, formatés comme `<channel>:<token>`.
- `#room` est réservé aux salons/canaux ; les discussions de groupe utilisent `g-<slug>` (minuscules, espaces -> `-`, garder `#@+._-`).

## Stratégie de groupe

Contrôlez la manière dont les messages de groupe/salon sont gérés par canal :

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

| Stratégie     | Comportement                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `"open"`      | Les groupes contournent les listes d'autorisation ; le filtrage par mention (mention-gating) s'applique toujours. |
| `"disabled"`  | Bloquer tous les messages de groupe entièrement.                                                                  |
| `"allowlist"` | Autoriser uniquement les groupes/salons correspondant à la liste d'autorisation configurée.                       |

Notes :

- `groupPolicy` est distinct du filtrage par mention (mention-gating) (qui nécessite des @mentions).
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo : utilisez `groupAllowFrom` (alternative : `allowFrom` explicite).
- Les approbations d'appariement DM (entrées de magasin `*-allowFrom`) s'appliquent uniquement à l'accès DM ; l'autorisation de l'expéditeur du groupe reste explicite aux listes d'autorisation de groupe.
- Discord : la liste d'autorisation utilise `channels.discord.guilds.<id>.channels`.
- Slack : la liste d'autorisation utilise `channels.slack.channels`.
- Matrix : la liste d'autorisation utilise `channels.matrix.groups`. Préférez les ID ou alias de salle ; la recherche par nom de salle jointe est effectuée au mieux, et les noms non résolus sont ignorés lors de l'exécution. Utilisez `channels.matrix.groupAllowFrom` pour restreindre les expéditeurs ; les listes d'autorisation `users` par salle sont également prises en charge.
- Les DM de groupe sont contrôlés séparément (`channels.discord.dm.*`, `channels.slack.dm.*`).
- La liste d'autorisation Telegram peut correspondre aux ID utilisateur (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou aux noms d'utilisateur (`"@alice"` ou `"alice"`) ; les préfixes ne sont pas sensibles à la casse.
- La valeur par défaut est `groupPolicy: "allowlist"` ; si votre liste d'autorisation de groupe est vide, les messages de groupe sont bloqués.
- Sécurité d'exécution : lorsqu'un bloc de fournisseur est complètement absent (`channels.<provider>` absent), la stratégie de groupe revient à un mode fermé par défaut (généralement `allowlist`) au lieu d'hériter de `channels.defaults.groupPolicy`.

Modèle mental rapide (ordre d'évaluation pour les messages de groupe) :

1. `groupPolicy` (ouvert/désactivé/liste d'autorisation)
2. listes d'autorisation de groupe (`*.groups`, `*.groupAllowFrom`, liste d'autorisation spécifique au channel)
3. filtrage par mention (`requireMention`, `/activation`)

## Filtrage par mention (par défaut)

Les messages de groupe nécessitent une mention, sauf s'ils sont remplacés pour chaque groupe. Les valeurs par défaut se trouvent par sous-système sous `*.groups."*"`.

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

Notes :

- `mentionPatterns` sont des motifs de regex sécurisés insensibles à la casse ; les motifs non valides et les formes de répétition imbriquées non sécurisées sont ignorés.
- Les surfaces qui fournissent des mentions explicites passent toujours ; les motifs sont un repli.
- Contournement par agent : `agents.list[].groupChat.mentionPatterns` (utile lorsque plusieurs agents partagent un groupe).
- Le filtrage des mentions n'est appliqué que lorsque la détection des mentions est possible (mentions natives ou `mentionPatterns` configurés).
- Les valeurs par défaut de Discord se trouvent dans `channels.discord.guilds."*"` (surchargeable par guilde/canal).
- Le contexte de l'historique de groupe est enveloppé de manière uniforme sur les canaux et est **« en attente uniquement »** (messages ignorés en raison du filtrage des mentions) ; utilisez `messages.groupChat.historyLimit` pour la valeur par défaut globale et `channels.<channel>.historyLimit` (ou `channels.<channel>.accounts.*.historyLimit`) pour les surcharges. Définissez `0` pour désactiver.

## Restrictions d'outils de groupe/canal (facultatif)

Certaines configurations de canaux prennent en charge la restriction des outils disponibles **à l'intérieur d'un groupe/salon/canal spécifique**.

- `tools` : autoriser/refuser les outils pour l'ensemble du groupe.
- `toolsBySender` : surcharges par expéditeur au sein du groupe.
  Utilisez des préfixes de clé explicites :
  `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` et le caractère générique `"*"`.
  Les clés héritées sans préfixe sont toujours acceptées et correspondantes en tant que `id:` uniquement.

Ordre de résolution (le plus spécifique l'emporte) :

1. correspondance `toolsBySender` de groupe/canal
2. `tools` de groupe/canal
3. correspondance `toolsBySender` par défaut (`"*"`)
4. `tools` par défaut (`"*"`)

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

- Les restrictions d'outils de groupe/canal sont appliquées en plus de la stratégie d'outil globale/par agent (le refus l'emporte toujours).
- Certains canaux utilisent une imbrication différente pour les salons/canaux (par exemple, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).

## Listes d'autorisation de groupes

Lorsque `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` est configuré, les clés agissent comme une liste d'autorisation de groupes. Utilisez `"*"` pour autoriser tous les groupes tout en définissant le comportement de mention par défaut.

Confusion courante : l'approbation du jumelage (pairing) DM n'est pas la même que l'autorisation de groupe. Pour les channels qui prennent en charge le jumelage DM, le magasin de jumelage (pairing store) déverrouille uniquement les DMs. Les commandes de groupe nécessitent toujours une autorisation explicite de l'expéditeur du groupe à partir des listes de configuration (allowlists) telles que `groupAllowFrom` ou du repli de configuration documenté pour ce channel.

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

Les propriétaires de groupe peuvent activer ou désactiver l'activation par groupe :

- `/activation mention`
- `/activation always`

Le propriétaire est déterminé par `channels.whatsapp.allowFrom` (ou l'auto E.164 du bot s'il n'est pas défini). Envoyez la commande sous forme de message autonome. Les autres surfaces ignorent actuellement `/activation`.

## Champs de contexte

Les payloads entrants de groupe définissent :

- `ChatType=group`
- `GroupSubject` (si connu)
- `GroupMembers` (si connu)
- `WasMentioned` (résultat du filtrage par mention)
- Les sujets de forum Telegram incluent également `MessageThreadId` et `IsForum`.

Notes spécifiques au channel :

- BlueBubbles peut optionnellement enrichir les participants de groupe sans nom macOS à partir de la base de données Contacts locale avant de remplir `GroupMembers`. Ceci est désactivé par défaut et ne s'exécute qu'après que le filtrage normal de groupe soit passé.

Le prompt système de l'agent inclut une introduction de groupe lors du premier tour d'une nouvelle session de groupe. Il rappelle au modèle de répondre comme un humain, d'éviter les tableaux Markdown, de minimiser les lignes vides et de suivre l'espacement normal de discussion, et d'éviter de taper des séquences littérales `\n`.

## Spécificités iMessage

- Préférez `chat_id:<id>` lors du routage ou de la mise sur liste blanche (allowlisting).
- Lister les chats : `imsg chats --limit 20`.
- Les réponses de groupe vont toujours au même `chat_id`.

## Spécificités WhatsApp

Voir [Group messages](/en/channels/group-messages) pour les comportements exclusifs à WhatsApp (injection d'historique, détails de gestion des mentions).
