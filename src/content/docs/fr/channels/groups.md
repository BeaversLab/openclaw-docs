---
summary: "DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZaloComportement de chat de groupe sur différentes surfaces (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Groupes"
sidebarTitle: "Groupes"
---

OpenClaw traite les discussions de groupe de manière cohérente sur toutes les surfaces : Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

Pour les salons toujours actifs qui doivent fournir un contexte discret à moins que l'agent n'envoie explicitement un message visible, voir [Événements ambiants de salon](/fr/channels/ambient-room-events).

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

Pour les salons de groupes/canaux, OpenClaw utilise par défaut OpenClaw`messages.groupChat.visibleReplies: "message_tool"`.
`openclaw doctor --fix` écrit cette valeur par défaut dans les configurations de canal configuré qui l'omettent.
Cela signifie que l'agent traite toujours le tour et peut mettre à jour la mémoire/l'état de la session, et il doit s'exprimer visiblement avec `message(action=send)`OpenClaw lorsqu'il a une réponse pour le salon. Si le modèle manque cet outil et renvoie un texte final substantiel, OpenClaw garde ce texte final privé au lieu de le publier dans le salon.

Ce comportement par défaut dépend d'un modèle/runtime qui appelle de manière fiable les outils. Si les journaux montrent du texte d'assistant mais `didSendViaMessagingTool: false`, le modèle a répondu en privé au lieu d'appeler l'outil de message. La salle reste silencieuse, et le journal détaillé de la passerelle enregistre les métadonnées de la charge utile finale supprimée. Ce n'est pas un échec d'envoi Discord/Slack/Telegram, mais un signal de discipline des outils. Utilisez un modèle fiable pour les appels d'outils pour les sessions de groupe/channel, ou définissez `messages.groupChat.visibleReplies: "automatic"` lorsque vous souhaitez que toutes les réponses de groupe visibles utilisent le chemin de réponse finale hérité.

Si l'outil de message n'est pas disponible sous la stratégie d'outil active, OpenClaw revient par défaut à des réponses visibles automatiques au lieu de supprimer silencieusement la réponse. `openclaw doctor` avertit concernant cette inadéquation.

Pour les discussions directes et tout autre événement source, utilisez `messages.visibleReplies: "message_tool"` pour appliquer globalement le même comportement de réponse visible par outil uniquement. Les harnais peuvent également choisir cela comme valeur par défaut non définie ; le harnais Codex le fait pour les discussions directes en mode Codex. `messages.groupChat.visibleReplies` reste la substitution plus spécifique pour les salles de groupe/channel.

Cela remplace l'ancien modèle qui consistait à forcer le modèle à répondre `NO_REPLY` pour la plupart des tours en mode lurk. En mode outil uniquement, ne rien faire de visible signifie simplement ne pas appeler l'outil de message.

Les indicateurs de frappe sont toujours envoyés pour les demandes de groupe directes. Les événements ambiants des salles toujours actives, lorsqu'ils sont activés, restent stricts et silencieux à moins que l'agent n'appelle l'outil de message.

Pour soumettre les bavardages de groupe toujours actifs sans mention en tant que contexte de salle calme au lieu de demandes d'utilisateur, utilisez [Événements de salle ambiante](/fr/channels/ambient-room-events) :

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

Pour restaurer les réponses finales automatiques héritées pour les demandes de groupe/channel :

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

La passerelle recharge à chaud la config `messages` après l'enregistrement du fichier. Redémarrez uniquement lorsque la surveillance des fichiers ou le rechargement de la configuration est désactivé dans le déploiement.

Pour exiger que la sortie visible passe par l'outil de message pour chaque discussion source :

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

Les commandes natives (Discord, Telegram et autres surfaces avec prise en charge native des commandes) contournent DiscordTelegram`visibleReplies: "message_tool"` et répondent toujours visiblement afin que l'interface utilisateur de commande native du canal reçoive la réponse attendue. Cela s'applique uniquement aux tours de commandes natives validés ; les commandes `/...` saisies en texte et les tours de chat ordinaires suivent toujours la valeur par défaut du groupe configuré.

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
  <Accordion title="Orientation de durcissement (prévue)">
    - `contextVisibility: "all"` (par défaut) conserve le comportement actuel tel que reçu.
    - `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés.
    - `contextVisibility: "allowlist_quote"` est `allowlist` plus une exception de citation/réponse explicite.

    Tant que ce modèle de durcissement n'est pas implémenté de manière cohérente sur tous les canaux, attendez-vous à des différences selon la surface.

  </Accordion>
</AccordionGroup>

![Flux de messages de groupe](/images/groups-flow.svg)

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
- Les sujets de forum Telegram ajoutent `:topic:<threadId>` à l'ID de groupe afin que chaque sujet ait sa propre session.
- Les discussions directes utilisent la session principale (ou par expéditeur si configuré).
- Les signaux de présence (heartbeats) sont ignorés pour les sessions de groupe.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Motif : DMs personnels + groupes publics (agent unique)

Oui — cela fonctionne bien si votre trafic « personnel » est constitué de **DMs** et votre trafic « public » de **groupes**.

Pourquoi : en mode agent unique, les DMs atterrissent généralement dans la clé de session **main** (`agent:main:main`), tandis que les groupes utilisent toujours des clés de session **non-main** (`agent:main:<channel>:group:<id>`). Si vous activez l'isolement (sandboxing) avec `mode: "non-main"`, ces sessions de groupe s'exécutent dans le backend d'isolement configuré, tandis que votre session principale de DM reste sur l'hôte. Docker est le backend par défaut si vous n'en choisissez pas un.

Cela vous offre un « cerveau » d'agent unique (espace de travail partagé + mémoire), mais deux postures d'exécution :

- **DMs** : outils complets (hôte)
- **Groupes** : sandbox + outils restreints

<Note>Si vous avez besoin d'espaces de travail ou de personae vraiment distincts (le « personnel » et le « public » ne doivent jamais être mélangés), utilisez un second agent + liaisons. Voir [Routage multi-agent](/fr/concepts/multi-agent).</Note>

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
    Vous préférez « les groupes ne peuvent voir que le dossier X » plutôt que « pas d'accès hôte » ? Gardez `workspaceAccess: "none"` et montez uniquement les chemins autorisés dans le sandbox :

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

- Clés de configuration et valeurs par défaut : [configuration du Gateway](/fr/gateway/config-agents#agentsdefaultssandbox)
- Débogage du blocage d'un tool : [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)
- Détails des bind mounts : [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts)

## Libellés d'affichage

- Les libellés de l'interface utilisateur utilisent `displayName` si disponible, formaté comme `<channel>:<token>`.
- `#room` est réservé aux salons/canaux ; les discussions de groupe utilisent `g-<slug>` (minuscules, espaces -> `-`, garder `#@+._-`).

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
  <Accordion title="Notes par canal">
    - `groupPolicy`WhatsAppTelegramSignaliMessageMicrosoft TeamsZalo est distinct du filtrage des mentions (qui nécessite des @mentions).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo : utilisez `groupAllowFrom` (alternative : `allowFrom`Signal explicite).
    - Signal : `groupAllowFrom`Signal peut correspondre à l'ID de groupe Signal entrant ou au téléphone/UUID de l'expéditeur.
    - Les approbations d'appariement DM (entrées du magasin `*-allowFrom`Discord) s'appliquent uniquement à l'accès DM ; l'autorisation de l'expéditeur du groupe reste explicite aux listes d'autorisation de groupe.
    - Discord : la liste d'autorisation utilise `channels.discord.guilds.<id>.channels`Slack.
    - Slack : la liste d'autorisation utilise `channels.slack.channels`Matrix.
    - Matrix : la liste d'autorisation utilise `channels.matrix.groups`. Préférez les ID de salle ou les alias ; la recherche par nom de salle rejointe est au mieux effort, et les noms non résolus sont ignorés à l'exécution. Utilisez `channels.matrix.groupAllowFrom` pour restreindre les expéditeurs ; les listes d'autorisation `users` par salle sont également prises en charge.
    - Les DM de groupe sont contrôlés séparément (`channels.discord.dm.*`, `channels.slack.dm.*`Telegram).
    - La liste d'autorisation Telegram peut correspondre aux ID utilisateur (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou aux noms d'utilisateur (`"@alice"` ou `"alice"`) ; les préfixes ne sont pas sensibles à la casse.
    - La valeur par défaut est `groupPolicy: "allowlist"` ; si votre liste d'autorisation de groupe est vide, les messages de groupe sont bloqués.
    - Sécurité à l'exécution : lorsqu'un bloc de fournisseur est totalement absent (`channels.<provider>` manquant), la stratégie de groupe revient à un mode fermé par défaut (généralement `allowlist`) au lieu d'hériter de `channels.defaults.groupPolicy`.

  </Accordion>
</AccordionGroup>

Modèle mental rapide (ordre d'évaluation pour les messages de groupe) :

<Steps>
  <Step title="groupPolicy">`groupPolicy` (ouvert/désactivé/liste d'autorisation).</Step>
  <Step title="Group allowlists">Listes d'autorisation de groupe (`*.groups`, `*.groupAllowFrom`, liste d'autorisation spécifique au canal).</Step>
  <Step title="Mention gating">Gestion des mentions (`requireMention`, `/activation`).</Step>
</Steps>

## Gestion des mentions (par défaut)

Les messages de groupe nécessitent une mention, sauf si cette règle est remplacée pour un groupe spécifique. Les valeurs par défaut se trouvent par sous-système sous `*.groups."*"`.

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
  <Accordion title="Notes sur le filtrage des mentions">
    - `mentionPatterns` sont des motifs regex sûrs insensibles à la casse ; les motifs non valides et les formes de répétition imbriquées non sûres sont ignorés.
    - Les surfaces qui fournissent des mentions explicites passent toujours ; les motifs sont un repli.
    - Remplacement par agent : `agents.list[].groupChat.mentionPatterns` (utile lorsque plusieurs agents partagent un groupe).
    - Le filtrage des mentions n'est appliqué que lorsque la détection de mention est possible (les mentions natives ou `mentionPatterns` sont configurées).
    - La mise sur liste blanche d'un groupe ou d'un expéditeur ne désactive pas le filtrage des mentions ; définissez le `requireMention` de ce groupe sur `false` lorsque tous les messages doivent déclencher.
    - Le contexte d'invite automatique de chat de groupe transporte l'instruction de réponse silencieuse résolue à chaque tour ; les fichiers de l'espace de travail ne doivent pas dupliquer la mécanique `NO_REPLY`.
    - Les groupes où les réponses silencieuses automatiques sont autorisées traitent les tours vides propres ou les tours de modèle contenant uniquement du raisonnement comme silencieux, équivalent à `NO_REPLY`. Les chats directs ne reçoivent jamais de conseils `NO_REPLY`, et les réponses de groupe avec uniquement l'outil de message restent silencieuses en n'appelant pas `message(action=send)`.
    - Les bavardages de groupe toujours activés en mode ambiant utilisent par défaut la sémantique de requête utilisateur. Définissez `messages.groupChat.unmentionedInbound: "room_event"` pour les soumettre comme contexte silencieux à la place. Voir [Ambient room events](/fr/channels/ambient-room-events) pour des exemples de configuration.
    - Les événements de salle ne sont pas stockés sous forme de fausses requêtes utilisateur, et le texte d'assistant privé provenant d'événements de salle sans outil de message n'est pas rejoué dans l'historique de chat.
    - Les valeurs par défaut Discord se trouvent dans `channels.discord.guilds."*"` (modifiable par guilde/channel).
    - Le contexte de l'historique de groupe est enveloppé de manière uniforme sur tous les channels. Les groupes avec filtrage de mentions gardent les messages en attente ignorés ; les groupes toujours activés peuvent également conserver les messages de salle traités récents lorsque le channel le prend en charge. Utilisez `messages.groupChat.historyLimit` pour la valeur par défaut globale et `channels.<channel>.historyLimit` (ou `channels.<channel>.accounts.*.historyLimit`) pour les remplacements. Définissez `0` pour désactiver.

  </Accordion>
</AccordionGroup>

## Restrictions d'outils de groupe/channel (optionnel)

Certaines configurations de canal prennent en charge la restriction des outils disponibles **au sein d'un groupe/salle/canal spécifique**.

- `tools` : autoriser/refuser les outils pour l'ensemble du groupe.
- `toolsBySender` : remplacements par expéditeur au sein du groupe. Utilisez des préfixes de clé explicites : `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` et le caractère générique `"*"`OpenClaw. Les identifiants de canal utilisent les identifiants de canal canoniques OpenClaw ; les alias tels que `teams` sont normalisés en `msteams`. Les clés sans préfixe héritées sont toujours acceptées et mises en correspondance en tant que `id:` uniquement.

Ordre de résolution (le plus spécifique l'emporte) :

<Steps>
  <Step title="Group toolsBySender">Correspondance `toolsBySender` de groupe/canal.</Step>
  <Step title="Group tools">`tools` de groupe/canal.</Step>
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

<Note>Les restrictions d'outils de groupe/canal sont appliquées en plus de la stratégie d'outils globale/de l'agent (le refus l'emporte toujours). Certains canaux utilisent une imbrication différente pour les salales/canaux (par exemple, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listes blanches de groupes

Lorsque `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` est configuré, les clés agissent comme une liste blanche de groupes. Utilisez `"*"` pour autoriser tous les groupes tout en définissant le comportement de mention par défaut.

<Warning>
  Confusion courante : l'approbation du couplage (pairing) pour les DM n'est pas la même chose que l'autorisation de groupe. Pour les channels qui prennent en charge le couplage DM, le magasin de couplage (pairing store) déverrouille uniquement les DM. Les commandes de groupe nécessitent toujours une autorisation explicite de l'expéditeur du groupe via les listes d'autorisation de configuration
  telles que `groupAllowFrom` ou le repli de configuration documenté pour ce channel.
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

Le propriétaire est déterminé par `channels.whatsapp.allowFrom` (ou l'auto E.164 du bot s'il n'est pas défini). Envoyez la commande sous forme de message autonome. Les autres surfaces ignorent actuellement `/activation`.

## Champs de contexte

Les charges utiles entrantes de groupe définissent :

- `ChatType=group`
- `GroupSubject` (si connu)
- `GroupMembers` (si connu)
- `WasMentioned` (résultat du filtrage par mention)
- Les sujets de forum Telegram incluent également `MessageThreadId` et `IsForum`.

Le prompt système de l'agent comprend une introduction de groupe lors du premier tour d'une nouvelle session de groupe. Il rappelle au modèle de répondre comme un humain, d'éviter les tableaux Markdown, de minimiser les lignes vides et de suivre l'espacement normal de la discussion, et d'éviter de taper des séquences littérales `\n`. Les noms de groupe et les étiquettes des participants provenant du channel sont rendus sous forme de métadonnées non fiables clôturées, et non d'instructions système en ligne.

## Spécificités iMessage

- Privilégiez `chat_id:<id>` lors du routage ou de la mise sur liste blanche.
- Lister les chats : `imsg chats --limit 20`.
- Les réponses de groupe reviennent toujours au même `chat_id`.

## Invites système WhatsApp

Voir WhatsApp/en/channels/whatsapp#system-prompts pour les règles canoniques des invites système WhatsApp, y compris la résolution des invites de groupe et directes, le comportement des caractères génériques et la sémantique de remplacement du compte.

## Spécificités WhatsApp

Voir [Group messages](/fr/channels/group-messages) pour les comportements spécifiques à WhatsApp (injection de l'historique, détails de la gestion des mentions).

## Connexes

- [Broadcast groups](/fr/channels/broadcast-groups)
- [Channel routing](/fr/channels/channel-routing)
- [Group messages](/fr/channels/group-messages)
- [Pairing](/fr/channels/pairing)
