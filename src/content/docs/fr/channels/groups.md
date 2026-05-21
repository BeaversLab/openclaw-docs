---
summary: "DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZaloComportement de chat de groupe sur différentes surfaces (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Groupes"
sidebarTitle: "Groupes"
---

OpenClaw traite les discussions de groupe de manière cohérente sur toutes les surfaces : Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

Pour les salons toujours actifs qui doivent fournir un contexte discret, sauf si l'agent envoie explicitement un message visible, voir [Ambient room events](/fr/channels/ambient-room-events).

## Introduction pour débutants (2 minutes)

OpenClaw « vit » sur vos propres comptes de messagerie. Il n'y a pas d'utilisateur bot WhatsApp distinct. Si **vous** êtes dans un groupe, OpenClaw peut voir ce groupe et y répondre.

Comportement par défaut :

- Les groupes sont restreints (`groupPolicy: "allowlist"`).
- Les réponses nécessitent une mention sauf si vous désactivez explicitement le filtrage par mention.
- Les réponses visibles dans les groupes/canaux utilisent l'outil `message` par défaut.

En résumé : les expéditeurs autorisés peuvent déclencher OpenClaw en le mentionnant.

<Note>
**En bref**

- **L'accès par DM** est contrôlé par `*.allowFrom`.
- **L'accès aux groupes** est contrôlé par `*.groupPolicy` + les listes d'autorisation (`*.groups`, `*.groupAllowFrom`).
- **Le déclenchement des réponses** est contrôlé par le filtrage par mention (`requireMention`, `/activation`).

</Note>

Flux rapide (ce qui arrive à un message de groupe) :

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
mention/reply/command/DM -> user request
always-on group chatter -> user request, or room event when configured
```

## Réponses visibles

Pour les requêtes de groupe/channel normales, OpenClaw utilise par défaut `messages.groupChat.visibleReplies: "automatic"`. Le texte final de l'assistant est publié via l'ancien chemin de réponse visible, sauf si vous configurez le salon pour une sortie exclusive à l'outil de message.

Utilisez `messages.groupChat.visibleReplies: "message_tool"` lorsqu'un salon partagé doit laisser l'agent décider quand parler en appelant `message(action=send)`. Cela fonctionne mieux pour les salons de groupe utilisant des modèles de dernière génération, fiables avec les outils, tels que GPT 5.5. Si le modèle manque cet outil et renvoie du texte final substantiel, OpenClaw garde ce texte final privé au lieu de le publier dans le salon.

Si l'outil de message n'est pas disponible sous la stratégie d'outil active, OpenClaw revient
aux réponses visibles automatiques au lieu de supprimer silencieusement la réponse.
`openclaw doctor` avertit de cette inadéquation.

Pour les discussions directes et tout autre événement source, utilisez `messages.visibleReplies: "message_tool"` pour appliquer globalement le même comportement de réponse visible pour les outils uniquement. Certains harnais, y compris Codex, appliquent également par défaut la livraison par outil de message aux discussions directes/Source lorsque ce paramètre n'est pas défini. Définissez `messages.visibleReplies: "automatic"` pour forcer l'ancien chemin de réponse finale automatique. `messages.groupChat.visibleReplies` reste la substitution plus spécifique pour les salons de groupes/canaux.

Cela remplace l'ancien modèle qui consistait à forcer le modèle à répondre `NO_REPLY` pour la plupart des tours en mode silencieux. En mode outils uniquement, ne rien faire de visible signifie simplement ne pas appeler l'outil de message.

Les indicateurs de frappe sont toujours envoyés pour les demandes de groupe directes. Les événements ambiants des salles toujours actives, lorsqu'ils sont activés, restent stricts et silencieux à moins que l'agent n'appelle l'outil de message.

Pour soumettre les discussions de groupe toujours actives non mentionnées en tant que contexte de salon discret plutôt que comme demandes des utilisateurs, utilisez [Ambient room events](/fr/channels/ambient-room-events) :

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
    },
  },
}
```

La valeur par défaut est `unmentionedInbound: "user_request"`.

Les messages mentionnés, les commandes, les demandes d'abandon et les DMs restent des demandes d'utilisateur.

Pour exiger que la sortie visible passe par l'outil de message pour les requêtes de groupe/channel :

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

La passerelle recharge à chaud la configuration `messages` après l'enregistrement du fichier. Redémarrez uniquement lorsque la surveillance des fichiers ou le rechargement de la configuration est désactivé dans le déploiement.

Pour exiger que la sortie visible passe par l'outil de message pour chaque discussion source :

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

Les commandes slash natives (Discord, Telegram et autres surfaces avec prise en charge native des commandes) contournent DiscordTelegram`visibleReplies: "message_tool"` et répondent toujours visiblement afin que l'interface utilisateur de commande native du canal reçoive la réponse attendue. Cela s'applique uniquement aux tours de commande native validés ; les commandes `/...` saisies en texte et les tours de discussion ordinaires suivent toujours la valeur par défaut configurée du groupe.

## Visibilité du contexte et listes d'autorisation

Deux contrôles différents sont impliqués dans la sécurité des groupes :

- **Autorisation de déclenchement** : qui peut déclencher l'agent (`groupPolicy`, `groups`, `groupAllowFrom`, listes d'autorisation spécifiques au canal).
- **Visibilité du contexte** : quel contexte supplémentaire est injecté dans le modèle (texte de réponse, citations, historique des fils, métadonnées transférées).

Par défaut, OpenClaw privilégie le comportement de chat normal et conserve le contexte tel qu'il est principalement reçu. Cela signifie que les listes d'autorisation décident principalement de qui peut déclencher des actions, et ne constituent pas une frontière universelle de rédaction pour chaque extrait cité ou historique.

<AccordionGroup>
  <Accordion title="Le comportement actuel est spécifique au canal"SlackMatrix>
    - Certains canaux appliquent déjà un filtrage basé sur l'expéditeur pour le contexte supplémentaire dans des chemins spécifiques (par exemple, l'amorçage de fils Slack, les recherches de réponses/fils Matrix).
    - D'autres canaux transmettent toujours le contexte de citation/réponse/transfert tel qu'il est reçu.

  </Accordion>
  <Accordion title="Direction du durcissement (prévu)">
    - `contextVisibility: "all"` (par défaut) conserve le comportement actuel tel que reçu.
    - `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés.
    - `contextVisibility: "allowlist_quote"` est `allowlist` plus une exception de citation/réponse explicite.

    Tant que ce modèle de durcissement n'est pas implémenté de manière cohérente sur tous les canaux, attendez-vous à des différences selon la surface.

  </Accordion>
</AccordionGroup>

![Flux des messages de groupe](/images/groups-flow.svg)

Si vous souhaitez...

| Objectif                                                               | Ce qu'il faut définir                                      |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Autoriser tous les groupes mais répondre uniquement lors des @mentions | `groups: { "*": { requireMention: true } }`                |
| Désactiver toutes les réponses de groupe                               | `groupPolicy: "disabled"`                                  |
| Seuls certains groupes                                                 | `groups: { "<group-id>": { ... } }` (pas de clé `"*"`)     |
| Seul vous pouvez déclencher dans les groupes                           | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| Réutiliser un ensemble d'expéditeurs de confiance sur tous les canaux  | `groupAllowFrom: ["accessGroup:operators"]`                |

Pour les listes d'autorisation d'expéditeurs réutilisables, voir [Groupes d'accès](/fr/channels/access-groups).

## Clés de session

- Les sessions de groupe utilisent des clés de session `agent:<agentId>:<channel>:group:<id>` (les salons/canaux utilisent `agent:<agentId>:<channel>:channel:<id>`).
- Les sujets de forum Telegram ajoutent Telegram`:topic:<threadId>` à l'identifiant de groupe afin que chaque sujet ait sa propre session.
- Les discussions directes utilisent la session principale (ou par expéditeur si configuré).
- Les signaux de présence (heartbeats) sont ignorés pour les sessions de groupe.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Motif : DMs personnels + groupes publics (agent unique)

Oui — cela fonctionne bien si votre trafic « personnel » est constitué de **DMs** et votre trafic « public » de **groupes**.

Pourquoi : en mode mono-agent, les DMs atterrissent généralement dans la clé de session **principale** (`agent:main:main`), tandis que les groupes utilisent toujours des clés de session **non principales** (`agent:main:<channel>:group:<id>`). Si vous activez l'isolation (sandboxing) avec `mode: "non-main"`, ces sessions de groupe s'exécutent dans le backend d'isolation configuré tandis que votre session principale de DM reste sur l'hôte. Docker est le backend par défaut si vous n'en choisissez pas un.

Cela vous offre un « cerveau » d'agent unique (espace de travail partagé + mémoire), mais deux postures d'exécution :

- **DMs** : outils complets (hôte)
- **Groupes** : sandbox + outils restreints

<Note>Si vous avez besoin d'espaces de travail ou de personas vraiment distincts (les « personnels » et « publics » ne doivent jamais être mélangés), utilisez un second agent + liaisons. Voir [Routage multi-agent](/fr/concepts/multi-agent).</Note>

<Tabs>
  <Tab title="DMs sur l'hôte, groupes sandboxés">
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
  </Tab>
  <Tab title="Les groupes ne voient qu'un dossier autorisé">
    Vous préférez « les groupes peuvent uniquement voir le dossier X » plutôt que « pas d'accès hôte » ? Gardez `workspaceAccess: "none"` et montez uniquement les chemins autorisés dans le bac à sable :

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

  </Tab>
</Tabs>

Connexe :

- Clés de configuration et valeurs par défaut : [configuration de la Gateway](/fr/gateway/config-agents#agentsdefaultssandbox)
- Débogage du blocage d'un outil : [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)
- Détails des bind mounts : [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts)

## Libellés d'affichage

- Les étiquettes de l'interface utilisateur utilisent `displayName` si elles sont disponibles, formatées comme `<channel>:<token>`.
- `#room` est réservé aux salons/canaux ; les chats de groupe utilisent `g-<slug>` (minuscules, espaces -> `-`, conserver `#@+._-`).

## Stratégie de groupe

Contrôlez la manière dont les messages de groupe/salon sont gérés par channel :

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
        "!roomId:example.org": { enabled: true },
        "#alias:example.org": { enabled: true },
      },
    },
  },
}
```

| Stratégie     | Comportement                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `"open"`      | Les groupes contournent les listes d'autorisation ; le filtrage par mention s'applique toujours. |
| `"disabled"`  | Bloquer tous les messages de groupe entièrement.                                                 |
| `"allowlist"` | Autoriser uniquement les groupes/salons correspondant à la liste d'autorisation configurée.      |

<AccordionGroup>
  <Accordion title="Remarques par channel">
    - `groupPolicy`WhatsAppTelegramSignaliMessageMicrosoft TeamsZalo est distinct du filtrage par mention (qui nécessite des @mentions).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo : utilisez `groupAllowFrom` (solution de repli : `allowFrom`Signal explicite).
    - Signal : `groupAllowFrom`Signal peut correspondre à l'ID de groupe Signal entrant ou au téléphone/UUID de l'expéditeur.
    - Les approbations d'appariement de DM (entrées du magasin `*-allowFrom`Discord) s'appliquent uniquement à l'accès par DM ; l'autorisation de l'expéditeur du groupe reste explicite aux listes d'autorisation (allowlists) de groupe.
    - Discord : l'allowlist utilise `channels.discord.guilds.<id>.channels`Slack.
    - Slack : l'allowlist utilise `channels.slack.channels`Matrix.
    - Matrix : l'allowlist utilise `channels.matrix.groups`. Privilégiez les ID ou alias de salle ; la recherche par nom de salle rejointe est basée sur l'effort, et les noms non résolus sont ignorés lors de l'exécution. Utilisez `channels.matrix.groupAllowFrom` pour restreindre les expéditeurs ; les allowlists `users` par salle sont également prises en charge.
    - Les DM de groupe sont contrôlés séparément (`channels.discord.dm.*`, `channels.slack.dm.*`Telegram).
    - L'allowlist Telegram peut correspondre aux ID utilisateur (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou aux noms d'utilisateur (`"@alice"` ou `"alice"`) ; les préfixes ne respectent pas la casse.
    - La valeur par défaut est `groupPolicy: "allowlist"` ; si votre allowlist de groupe est vide, les messages de groupe sont bloqués.
    - Sécurité d'exécution : lorsqu'un bloc provider est complètement manquant (`channels.<provider>` absent), la stratégie de groupe revient à un mode fermé par défaut (typiquement `allowlist`) au lieu d'hériter de `channels.defaults.groupPolicy`.

  </Accordion>
</AccordionGroup>

Modèle mental rapide (ordre d'évaluation pour les messages de groupe) :

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist).</Step>
  <Step title="Listes d'autorisation de groupe">Listes d'autorisation de groupe (`*.groups`, `*.groupAllowFrom`, liste d'autorisation spécifique au channel).</Step>
  <Step title="Filtrage des mentions">Filtrage des mentions (`requireMention`, `/activation`).</Step>
</Steps>

## Gestion des mentions (par défaut)

Les messages de groupe nécessitent une mention, sauf s'ils sont remplacés par groupe. Les valeurs par défaut se trouvent par sous-système sous `*.groups."*"`.

Répondre à un message du bot compte comme une mention implicite lorsque le canal prend en charge les métadonnées de réponse. Citer un message du bot peut également compter comme une mention implicite sur les canaux qui exposent les métadonnées de citation. Les cas intégrés actuels incluent Telegram, WhatsApp, Slack, Discord, Microsoft Teams et ZaloUser.

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

<AccordionGroup>
  <Accordion title="Notes sur le filtrage par mention">
    - `mentionPatterns` sont des motifs regex sécurisés insensibles à la casse ; les motifs non valides et les formes de répétition imbriquées non sécurisées sont ignorés.
    - Les surfaces qui fournissent des mentions explicites passent toujours ; les motifs constituent un repli.
    - Remplacement par agent : `agents.list[].groupChat.mentionPatterns` (utile lorsque plusieurs agents partagent un groupe).
    - Le filtrage par mention n'est appliqué que lorsque la détection de mention est possible (les mentions natives ou `mentionPatterns` sont configurées).
    - L'autorisation d'un groupe ou d'un expéditeur ne désactive pas le filtrage par mention ; définissez le `requireMention` de ce groupe sur `false` lorsque tous les messages doivent déclencher une action.
    - Le contexte de prompt de chat de groupe automatique transporte l'instruction de réponse silencieuse résolue à chaque tour ; les fichiers de l'espace de travail ne doivent pas dupliquer la mécanique de `NO_REPLY`.
    - Les groupes où les réponses silencieuses automatiques sont autorisées traitent les tours de modèle vides ou constitués uniquement de raisonnement comme silencieux, équivalents à `NO_REPLY`. Les discussions directes ne reçoivent jamais de guidage `NO_REPLY`, et les réponses de groupe utilisant uniquement l'outil de message restent silencieuses en n'appelant pas `message(action=send)`.
    - Les bavardages de groupe permanents ambiants utilisent par défaut la sémantique de demande utilisateur. Définissez `messages.groupChat.unmentionedInbound: "room_event"` pour les soumettre en tant que contexte silencieux à la place. Voir [Événements de salle ambiants](/fr/channels/ambient-room-events) pour des exemples de configuration.
    - Les événements de salle ne sont pas stockés comme de fausses demandes utilisateur, et le texte privé de l'assistant provenant d'événements de salle sans outil de message n'est pas rejoué dans l'historique de chat.
    - Les valeurs par défaut Discord se trouvent dans `channels.discord.guilds."*"` (remplaçable par guilde/channel).
    - Le contexte d'historique de groupe est enveloppé de manière uniforme sur les channels. Les groupes filtrés par mention conservent les messages en attente ignorés ; les groupes permanents peuvent également conserver les messages de salle traités récents lorsque le channel le prend en charge. Utilisez `messages.groupChat.historyLimit` pour la valeur par défaut globale et `channels.<channel>.historyLimit` (ou `channels.<channel>.accounts.*.historyLimit`) pour les remplacements. Définissez `0` pour désactiver.

  </Accordion>
</AccordionGroup>

## Restrictions d'outils de groupe/channel (optionnel)

Certaines configurations de canal prennent en charge la restriction des outils disponibles **au sein d'un groupe/salle/canal spécifique**.

- `tools` : autoriser/interdire les outils pour l'ensemble du groupe.
- `toolsBySender` : substitutions par expéditeur au sein du groupe. Utilisez des préfixes de clés explicites : `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` et le caractère générique `"*"`. Les ID de canal utilisent les ID de canal canoniques OpenClaw ; les alias tels que `teams` sont normalisés en `msteams`. Les clés héritées sans préfixe sont toujours acceptées et correspondantes uniquement en tant que `id:`.

Ordre de résolution (le plus spécifique l'emporte) :

<Steps>
  <Step title="Group toolsBySender">Correspondance de `toolsBySender` pour le groupe/le canal.</Step>
  <Step title="Group tools">`tools` pour le groupe/le canal.</Step>
  <Step title="Default toolsBySender">Correspondance `toolsBySender` par défaut (`"*"`).</Step>
  <Step title="Default tools">`tools` par défaut (`"*"`).</Step>
</Steps>

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

<Note>Les restrictions d'outils de groupe/canal sont appliquées en plus de la stratégie d'outils globale/de l'agent (le refus l'emporte toujours). Certains canaux utilisent une imbrication différente pour les salons/canaux (par exemple, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listes blanches de groupes

Lorsque `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` est configuré, les clés agissent comme une liste d'autorisation (allowlist) de groupe. Utilisez `"*"` pour autoriser tous les groupes tout en définissant toujours le comportement de mention par défaut.

<Warning>
  Confusion courante : l'approbation de l'appairage DM n'est pas la même que l'autorisation de groupe. Pour les canaux qui prennent en charge l'appairage DM, le stockage d'appairage déverrouille uniquement les DM. Les commandes de groupe nécessitent toujours une autorisation explicite de l'expéditeur du groupe à partir des listes d'autorisation de configuration telles que `groupAllowFrom` ou le
  repli de configuration documenté pour ce canal.
</Warning>

Intentions courantes (copier/coller) :

<Tabs>
  <Tab title="Désactiver toutes les réponses de groupe">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="Autoriser uniquement certains groupes (WhatsApp)">
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
  </Tab>
  <Tab title="Autoriser tous les groupes mais exiger une mention">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Déclencheurs uniquement pour le propriétaire (WhatsApp)">
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
  </Tab>
</Tabs>

## Activation (propriétaire uniquement)

Les propriétaires de groupe peuvent activer ou désactiver l'activation par groupe :

- `/activation mention`
- `/activation always`

Le propriétaire est déterminé par `channels.whatsapp.allowFrom` (ou par l'E.164 du bot lui-même s'il n'est pas défini). Envoyez la commande sous forme de message autonome. Les autres surfaces ignorent actuellement `/activation`.

## Champs de contexte

Les charges utiles entrantes de groupe définissent :

- `ChatType=group`
- `GroupSubject` (si connu)
- `GroupMembers` (si connu)
- `WasMentioned` (résultat du filtrage des mentions)
- Les sujets de forum Telegram incluent également `MessageThreadId` et `IsForum`.

Le système de prompt de l'agent inclut une introduction au groupe lors du premier tour d'une nouvelle session de groupe. Il rappelle au model de répondre comme un humain, d'éviter les tableaux Markdown, de minimiser les lignes vides et de respecter l'espacement normal des discussions, et d'éviter de taper des séquences `\n` littérales. Les noms de groupe et les étiquettes des participants provenant de la chaîne sont rendus sous forme de métadonnées non fiables clôturées, et non d'instructions système en ligne.

## Spécificités iMessage

- Privilégiez `chat_id:<id>` lors du routage ou de la mise sur liste autorisée.
- Lister les discussions : `imsg chats --limit 20`.
- Les réponses de groupe vont toujours au même `chat_id`.

## Invites système WhatsApp

Voir WhatsApp/en/channels/whatsapp#system-prompts pour les règles canoniques du système de prompt WhatsApp, y compris la résolution des prompts de groupe et directs, le comportement des caractères génériques et la sémantique de priorité de compte.

## Spécificités WhatsApp

Voir [Group messages](/fr/channels/group-messages) pour les comportements spécifiques à WhatsApp (injection d'historique, détails de gestion des mentions).

## Connexes

- [Broadcast groups](/fr/channels/broadcast-groups)
- [Channel routing](/fr/channels/channel-routing)
- [Group messages](/fr/channels/group-messages)
- [Pairing](/fr/channels/pairing)
