---
summary: "DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZaloComportement de chat de groupe sur différentes surfaces (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Groupes"
sidebarTitle: "Groupes"
---

OpenClaw traite les discussions de groupe de manière cohérente sur toutes les surfaces : Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

Pour les salons toujours actifs qui doivent fournir un contexte discret, sauf si l'agent envoie explicitement un message visible, consultez [Événements de salon ambiant](/fr/channels/ambient-room-events).

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

Pour les discussions directes et tout autre événement source, utilisez `messages.visibleReplies: "message_tool"`WebChat pour appliquer globalement le même comportement de réponse visible pour les outils uniquement. Les tours directs WebChat internes sont configurés par défaut pour une livraison automatique de la réponse finale, afin que Pi et Codex reçoivent le même contrat de réponse visible. Définissez `messages.visibleReplies: "message_tool"` pour exiger intentionnellement `message(action=send)` pour une sortie visible. `messages.groupChat.visibleReplies` reste la substitution plus spécifique pour les salons de groupes/canaux.

Cela remplace l'ancien modèle qui consistait à forcer le modèle à répondre `NO_REPLY` pour la plupart des tours en mode lurk. En mode outil uniquement, ne rien faire de visible signifie simplement ne pas appeler l'outil de message.

Les indicateurs de frappe sont toujours envoyés pour les demandes de groupe directes. Les événements ambiants des salles toujours actives, lorsqu'ils sont activés, restent stricts et silencieux à moins que l'agent n'appelle l'outil de message.

Les sessions suppriment les résumés détaillés d'outils/de progression par défaut. Utilisez `/verbose on`
pour afficher ces résumés pour la session actuelle pendant le débogage, et
`/verbose off` pour revenir au comportement de réponse finale uniquement. Le même état détaillé
s'applique aux discussions directes, aux groupes, aux canaux et aux sujets de forum.

Pour soumettre les bavardages de groupe toujours actifs sans mention en tant que contexte de salon discret plutôt qu'en tant que demandes des utilisateurs, utilisez [Événements de salon ambiant](/fr/channels/ambient-room-events) :

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

Les messages mentionnés, les commandes, les demandes d'annulation et les DMs restent des demandes utilisateur.

Pour exiger que la sortie visible passe par l'outil de message pour les demandes de groupe/canal :

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

La passerelle recharge à chaud la configuration `messages` après l'enregistrement du fichier. Redémarrez uniquement
lorsque la surveillance des fichiers ou le rechargement de la configuration est désactivé dans le déploiement.

Pour exiger que la sortie visible passe par l'outil de message pour chaque chat source :

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

Les commandes slash natives (Discord, Telegram et autres surfaces avec support de commandes natives) contournent DiscordTelegram`visibleReplies: "message_tool"` et répondent toujours visiblement afin que l'interface utilisateur de commande native du canal reçoive la réponse attendue. Cela s'applique uniquement aux tours de commande native validés ; les commandes `/...` saisies sous forme de texte et les tours de discussion ordinaires suivent toujours la valeur par défaut configurée pour le groupe.

## Visibilité du contexte et listes d'autorisation (allowlists)

Deux contrôles différents sont impliqués dans la sécurité des groupes :

- **Autorisation de déclenchement** : qui peut déclencher l'agent (`groupPolicy`, `groups`, `groupAllowFrom`, listes d'autorisation spécifiques au canal).
- **Visibilité du contexte** : quel contexte supplémentaire est injecté dans le modèle (texte de réponse, citations, historique des fils, métadonnées transférées).

Par défaut, OpenClaw privilégie le comportement de chat normal et conserve le contexte tel qu'il est principalement reçu. Cela signifie que les listes d'autorisation décident principalement de qui peut déclencher des actions, et non d'une limite universelle de rédaction pour chaque extrait cité ou historique.

<AccordionGroup>
  <Accordion title="Current behavior is channel-specific">
    - Certains canaux appliquent déjà un filtrage basé sur l'expéditeur pour le contexte supplémentaire dans des chemins spécifiques (par exemple l'amorçage de fils de discussion Slack, les recherches de réponses/fils Matrix).
    - D'autres canaux transmettent toujours le contexte de citation/réponse/transfert tel qu'il est reçu.

  </Accordion>
  <Accordion title="Direction du durcissement (prévu)">
    - `contextVisibility: "all"` (par défaut) conserve le comportement actuel tel que reçu.
    - `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés.
    - `contextVisibility: "allowlist_quote"` est `allowlist` plus une exception de citation/réponse explicite.

    Jusqu'à ce que ce modèle de durcissement soit implémenté de manière cohérente sur tous les canaux, attendez-vous à des différences selon la surface.

  </Accordion>
</AccordionGroup>

![Flux des messages de groupe](/images/groups-flow.svg)

Si vous souhaitez...

| Objectif                                                               | Ce qu'il faut définir                                      |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Autoriser tous les groupes mais ne répondre qu'aux @mentions           | `groups: { "*": { requireMention: true } }`                |
| Désactiver toutes les réponses de groupe                               | `groupPolicy: "disabled"`                                  |
| Seulement des groupes spécifiques                                      | `groups: { "<group-id>": { ... } }` (pas de clé `"*"`)     |
| Seulement vous pouvez déclencher dans les groupes                      | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| Réutiliser un ensemble d'expéditeurs de confiance sur plusieurs canaux | `groupAllowFrom: ["accessGroup:operators"]`                |

Pour les listes d'autorisation d'expéditeurs réutilisables, voir [Groupes d'accès](/fr/channels/access-groups).

## Clés de session

- Les sessions de groupe utilisent des clés de session `agent:<agentId>:<channel>:group:<id>` (les salons/canaux utilisent `agent:<agentId>:<channel>:channel:<id>`).
- Les sujets de forum Telegram ajoutent `:topic:<threadId>` à l'identifiant du groupe afin que chaque sujet ait sa propre session.
- Les discussions directes utilisent la session principale (ou par expéditeur si configuré).
- Les signaux de présence (heartbeats) sont ignorés pour les sessions de groupe.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Modèle : DMs personnels + groupes publics (agent unique)

Oui — cela fonctionne bien si votre trafic « personnel » se compose de **DMs** et votre trafic « public » de **groupes**.

Pourquoi : en mode mono-agent, les DMs atterrissent généralement dans la clé de session **principale** (`agent:main:main`), tandis que les groupes utilisent toujours des clés de session **non principales** (`agent:main:<channel>:group:<id>`). Si vous activez le sandboxing avec `mode: "non-main"`, ces sessions de groupe s'exécutent dans le backend de sandbox configuré tandis que votre session DM principale reste sur l'hôte. Docker est le backend par défaut si vous n'en choisissez pas un.

Cela vous offre un seul « cerveau » d'agent (espace de travail partagé + mémoire), mais deux postures d'exécution :

- **DMs** : outils complets (hôte)
- **Groupes** : sandbox + outils restreints

<Note>Si vous avez besoin d'espaces de travail/personas vraiment distincts (les contextes « personnel » et « public » ne doivent jamais être mélangés), utilisez un second agent + bindings. Voir [Routage Multi-Agent](/fr/concepts/multi-agent).</Note>

<Tabs>
  <Tab title="DMs sur l'hôte, groupes en sandbox">
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
    Vous voulez que « les groupes ne peuvent voir que le dossier X » au lieu de « pas d'accès à l'hôte » ? Gardez `workspaceAccess: "none"` et montez uniquement les chemins autorisés dans la sandbox :

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

Connexes :

- Clés de configuration et valeurs par défaut : [Configuration du Gateway](/fr/gateway/config-agents#agentsdefaultssandbox)
- Débogage du blocage d'un outil : [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)
- Détails sur les bind mounts : [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts)

## Libellés d'affichage

- Les étiquettes de l'interface utilisateur utilisent `displayName` si disponibles, formatées comme `<channel>:<token>`.
- `#room` est réservé aux salons/canaux ; les discussions de groupe utilisent `g-<slug>` (minuscules, espaces -> `-`, conserver `#@+._-`).

## Politique de groupe

Contrôlez la façon dont les messages de groupe/salon sont gérés par canal :

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

| Politique     | Comportement                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `"open"`      | Les groupes contournent les listes d'autorisation ; le filtrage par mention s'applique toujours. |
| `"disabled"`  | Bloquer tous les messages de groupe entièrement.                                                 |
| `"allowlist"` | Autoriser uniquement les groupes/salons qui correspondent à la liste d'autorisation configurée.  |

<AccordionGroup>
  <Accordion title="Notes par canal">
    - `groupPolicy` est distinct du filtrage par mentions (qui nécessite des @mentions).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo : utilisez `groupAllowFrom` (de secours : `allowFrom` explicite).
    - Signal : `groupAllowFrom` peut correspondre soit à l'ID de groupe Signal entrant, soit au téléphone/UUID de l'expéditeur.
    - Les approbations d'appariement DM (entrées du magasin `*-allowFrom`) s'appliquent uniquement à l'accès DM ; l'autorisation de l'expéditeur du groupe reste explicite aux listes d'autorisation de groupe.
    - Discord : la liste d'autorisation utilise `channels.discord.guilds.<id>.channels`.
    - Slack : la liste d'autorisation utilise `channels.slack.channels`.
    - Matrix : la liste d'autorisation utilise `channels.matrix.groups`. Privilégiez les ID ou alias de salon ; la recherche par nom de salon rejoint est de « meilleur effort », et les noms non résolus sont ignorés lors de l'exécution. Utilisez `channels.matrix.groupAllowFrom` pour restreindre les expéditeurs ; les listes d'autorisation `users` par salon sont également prises en charge.
    - Les DM de groupe sont contrôlés séparément (`channels.discord.dm.*`, `channels.slack.dm.*`).
    - La liste d'autorisation Telegram peut correspondre aux ID utilisateur (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou aux noms d'utilisateur (`"@alice"` ou `"alice"`) ; les préfixes ne sont pas sensibles à la casse.
    - La valeur par défaut est `groupPolicy: "allowlist"` ; si votre liste d'autorisation de groupe est vide, les messages de groupe sont bloqués.
    - Sécurité d'exécution : lorsqu'un bloc fournisseur est complètement absent (`channels.<provider>` manquant), la stratégie de groupe revient à un mode fermé par défaut (généralement `allowlist`) au lieu d'hériter de `channels.defaults.groupPolicy`.

  </Accordion>
</AccordionGroup>

Modèle mental rapide (ordre d'évaluation pour les messages de groupe) :

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist).</Step>
  <Step title="Listes blanches de groupe">Listes blanches de groupe (`*.groups`, `*.groupAllowFrom`, liste blanche spécifique au channel).</Step>
  <Step title="Filtrage par mention">Filtrage par mention (`requireMention`, `/activation`).</Step>
</Steps>

## Filtrage des mentions (par défaut)

Les messages de groupe nécessitent une mention, sauf si cette règle est remplacée pour un groupe spécifique. Les valeurs par défaut sont définies par sous-système sous `*.groups."*"`.

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
    - Les `mentionPatterns` sont des motifs regex sécurisés insensibles à la casse ; les motifs non valides et les formes de répétition imbriquées non sécurisées sont ignorés.
    - Les surfaces qui fournissent des mentions explicites passent toujours ; les motifs sont un repli.
    - Remplacement par agent : `agents.list[].groupChat.mentionPatterns` (utile lorsque plusieurs agents partagent un groupe).
    - Le filtrage des mentions n'est appliqué que lorsque la détection de mentions est possible (mentions natives ou `mentionPatterns` sont configurés).
    - L'ajout à une liste d'autorisation d'un groupe ou d'un expéditeur ne désactive pas le filtrage des mentions ; définissez le `requireMention` de ce groupe sur `false` lorsque tous les messages doivent déclencher.
    - Le contexte de prompt de chat de groupe automatique transporte l'instruction de réponse silencieuse résolue à chaque tour ; les fichiers de l'espace de travail ne doivent pas dupliquer la mécanique `NO_REPLY`.
    - Les groupes où les réponses silencieuses automatiques sont autorisées traitent les tours de modèle vides propres ou de raisonnement uniquement comme silencieux, équivalent à `NO_REPLY`. Les chats directs ne reçoivent jamais de guidage `NO_REPLY`, et les réponses de groupe avec outil de message uniquement restent silencieuses en n'appelant pas `message(action=send)`.
    - Les bavardages de groupe ambiant toujours actifs utilisent par défaut la sémantique de demande de l'utilisateur. Définissez `messages.groupChat.unmentionedInbound: "room_event"` pour le soumettre en tant que contexte silencieux à la place. Voir [Ambient room events](/fr/channels/ambient-room-events) pour des exemples de configuration.
    - Les événements de salle ne sont pas stockés en tant que fausses demandes d'utilisateur, et le texte d'assistant privé provenant d'événements de salle sans outil de message n'est pas rejoué comme historique de chat.
    - Les valeurs par défaut de Discord se trouvent dans `channels.discord.guilds."*"` (remplaçables par guilde/channel).
    - Le contexte d'historique de groupe est encapsulé de manière uniforme sur les canaux. Les groupes filtrés par mention conservent les messages en attente ignorés ; les groupes toujours actifs peuvent également conserver les messages de salle traités récents lorsque le channel le prend en charge. Utilisez `messages.groupChat.historyLimit` pour la valeur par défaut globale et `channels.<channel>.historyLimit` (ou `channels.<channel>.accounts.*.historyLimit`) pour les remplacements. Définissez `0` pour désactiver.

  </Accordion>
</AccordionGroup>

## Restrictions d'outils de groupe/channel (facultatif)

Certaines configurations de canal prennent en charge la restriction des outils disponibles **à l'intérieur d'un groupe/salon/canal spécifique**.

- `tools` : autoriser/refuser les outils pour l'ensemble du groupe.
- `toolsBySender` : substitutions par expéditeur au sein du groupe. Utilisez des préfixes de clés explicites : `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>`, et le caractère générique `"*"`. Les identifiants de canal utilisent les identifiants de canal canoniques OpenClaw ; les alias tels que `teams` sont normalisés vers `msteams`. Les clés héritées sans préfixe sont toujours acceptées et correspondantes uniquement en tant que `id:`.

Ordre de résolution (le plus spécifique l'emporte) :

<Steps>
  <Step title="Group toolsBySender">Correspondance de groupe/canal `toolsBySender`.</Step>
  <Step title="Group tools">Outils de groupe/canal `tools`.</Step>
  <Step title="Default toolsBySender">Correspondance `toolsBySender` par défaut (`"*"`).</Step>
  <Step title="Default tools">Outils `tools` par défaut (`"*"`).</Step>
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

<Note>Les restrictions d'outils de groupe/canal sont appliquées en plus de la stratégie d'outils globale/agent (le refus l'emporte toujours). Certains canaux utilisent une imbrication différente pour les salons/canaux (par exemple, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listes d'autorisation de groupe

Lorsque `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` est configuré, les clés agissent comme une liste d'autorisation de groupe. Utilisez `"*"` pour autoriser tous les groupes tout en définissant le comportement de mention par défaut.

<Warning>
  Confusion courante : l'approbation du jumelage DM n'est pas la même que l'autorisation de groupe. Pour les canaux qui prennent en charge le jumelage DM, le stockage de jumelage ne déverrouille que les DM. Les commandes de groupe nécessitent toujours une autorisation d'expéditeur de groupe explicite à partir des listes d'autorisation de configuration telles que `groupAllowFrom` ou le repli de
  configuration documenté pour ce canal.
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
  <Tab title="WhatsAppAutoriser uniquement des groupes spécifiques (WhatsApp)">
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
  <Tab title="WhatsAppDéclencheurs propriétaires uniquement (WhatsApp)">
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

Le propriétaire est déterminé par `channels.whatsapp.allowFrom` (ou l'E.164 propre du bot lorsqu'il n'est pas défini). Envoyez la commande sous forme de message autonome. Les autres surfaces ignorent actuellement `/activation`.

## Champs de contexte

Les payloads entrants de groupe définissent :

- `ChatType=group`
- `GroupSubject` (si connu)
- `GroupMembers` (si connu)
- `WasMentioned` (résultat du filtrage des mentions)
- Les sujets de forum Telegram incluent également Telegram`MessageThreadId` et `IsForum`.

Le prompt système de l'agent inclut une introduction de groupe au premier tour d'une nouvelle session de groupe. Il rappelle au modèle de répondre comme un humain, d'éviter les tableaux Markdown, de minimiser les lignes vides et de respecter l'espacement normal de discussion, et d'éviter de taper des séquences littérales `\n`. Les noms de groupe et les étiquettes des participants provenant du canal sont rendus sous forme de métadonnées non fiables clôturées, et non d'instructions système en ligne.

## Spécificités iMessage

- Privilégiez `chat_id:<id>` lors du routage ou de la liste d'autorisation.
- Lister les discussions : `imsg chats --limit 20`.
- Les réponses de groupe vont toujours vers le même `chat_id`.

## Invites système WhatsApp

Voir [WhatsApp](WhatsApp/en/channels/whatsapp#system-promptsWhatsApp) pour les règles canoniques du prompt système WhatsApp, y compris la résolution des prompts de groupe et directs, le comportement des caractères génériques et la sémantique de remplacement de compte.

## Spécificités WhatsApp

Voir [Group messages](/fr/channels/group-messagesWhatsApp) pour le comportement spécifique à WhatsApp (injection de l'historique, détails de la gestion des mentions).

## Connexes

- [Broadcast groups](/fr/channels/broadcast-groups)
- [Channel routing](/fr/channels/channel-routing)
- [Group messages](/fr/channels/group-messages)
- [Pairing](/fr/channels/pairing)
