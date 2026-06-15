---
summary: "Comportement des discussions de groupe sur différentes plateformes (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
  - Scoping mentionPatterns to specific group conversations
title: "Groupes"
sidebarTitle: "Groupes"
---

OpenClaw traite les discussions de groupe de manière cohérente sur toutes les surfaces : Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

Pour les salons toujours actifs qui doivent fournir un contexte silencieux sauf si l'agent envoie explicitement un message visible, consultez [Ambient room events](/fr/channels/ambient-room-events).

## Introduction pour débutants (2 minutes)

OpenClaw « vit » sur vos propres comptes de messagerie. Il n'y a pas d'utilisateur bot WhatsApp distinct. Si **vous** êtes dans un groupe, OpenClaw peut voir ce groupe et y répondre.

Comportement par défaut :

- Les groupes sont restreints (`groupPolicy: "allowlist"`).
- Les réponses nécessitent une mention sauf si vous désactivez explicitement le filtrage par mention.
- Les réponses visibles dans les groupes/canaux utilisent l'outil `message` par défaut.

En résumé : les expéditeurs autorisés peuvent déclencher OpenClaw en le mentionnant.

<Note>
**TL;DR**

- L'**accès DM** est contrôlé par `*.allowFrom`.
- L'**accès aux groupes** est contrôlé par `*.groupPolicy` + les listes d'autorisation (`*.groups`, `*.groupAllowFrom`).
- Le **déclenchement des réponses** est contrôlé par le filtrage des mentions (`requireMention`, `/activation`).

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

Pour les demandes normales dans les groupes/canaux, OpenClaw utilise par défaut `messages.groupChat.visibleReplies: "automatic"`. Le texte final de l'assistant est publié via le chemin de réponse visible hérité, sauf si vous configurez le salon pour utiliser exclusivement la sortie par outil de message.

Utilisez `messages.groupChat.visibleReplies: "message_tool"` lorsqu'un salon partagé doit laisser l'agent décider quand parler en appelant `message(action=send)`. Cela fonctionne mieux pour les salons de groupe utilisant des modèles de dernière génération, fiables avec les outils, tels que GPT 5.5. Si le modèle manque cet outil et renvoie un texte final substantiel, OpenClaw garde ce texte final privé au lieu de le publier dans le salon.

Utilisez `"automatic"` pour les modèles plus faibles ou les runtimes qui ne comprennent pas de manière fiable la livraison exclusivement par outil. En mode automatique, le texte final de l'assistant est le chemin de réponse visible source, de sorte qu'un modèle qui ne peut pas appeler `message(action=send)` de manière cohérente peut toujours répondre normalement.

Si l'outil de message n'est pas disponible sous la stratégie d'outil active, OpenClaw revient par défaut à des réponses visibles automatiques au lieu de supprimer silencieusement la réponse. OpenClaw`openclaw doctor` avertit de cette inadéquation.

Pour les discussions directes et tout autre événement source, utilisez `messages.visibleReplies: "message_tool"`WebChat pour appliquer globalement le même comportement de réponse visible uniquement via l'outil. Les tours directs WebChat internes utilisent par défaut la livraison automatique de la réponse finale afin que Pi et Codex reçoivent le même contrat de réponse visible. Définissez `messages.visibleReplies: "message_tool"` pour exiger intentionnellement `message(action=send)` pour une sortie visible. `messages.groupChat.visibleReplies` reste la substitution plus spécifique pour les salons de groupe/chaîne.

Cela remplace l'ancien modèle consistant à forcer le modèle à répondre `NO_REPLY` pour la plupart des tours en mode observation (lurk-mode). En mode outil uniquement, le prompt ne définit pas de contrat `NO_REPLY`. Ne rien faire de visible signifie simplement ne pas appeler l'outil de message.

Les liaisons de conversation détenues par des plugins font exception. Une fois qu'un plugin lie un fil et réclame le tour entrant, la réponse renvoyée par le plugin est la réponse de liaison visible ; elle n'a pas besoin de `message(action=send)`. Cette réponse est une sortie du runtime du plugin, et non le texte final privé du modèle.

Les indicateurs de frappe sont toujours envoyés pour les demandes de groupe directes. Les événements ambiants de salon toujours actifs, lorsqu'ils sont activés, restent stricts et silencieux, sauf si l'agent appelle l'outil de message.

Les sessions suppriment les résumés verbeux d'outil/progression par défaut. Utilisez `/verbose on` pour afficher ces résumés pour la session actuelle lors du débogage, et `/verbose off` pour revenir à un comportement de réponse finale uniquement. Le même état verbeux s'applique aux discussions directes, aux groupes, aux chaînes et aux sujets de forum.

Pour soumettre les bavardages de groupe toujours actifs non mentionnés en tant que contexte de salon calme au lieu de demandes utilisateur, utilisez [Ambient room events](/fr/channels/ambient-room-events) :

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

Les messages mentionnés, les commandes, les demandes d'abandon et les DMs restent des demandes utilisateur.

Pour exiger que la sortie visible passe par l'outil de message pour les demandes de groupe/chaîne :

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

La passerelle recharge à chaud la configuration `messages` après l'enregistrement du fichier. Ne redémarrez que
lorsque la surveillance des fichiers ou le rechargement de la configuration est désactivé dans le déploiement.

Pour exiger que la sortie visible passe par l'outil de message pour chaque chat source :

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

Les commandes barre oblique natives (Discord, Telegram et autres surfaces avec prise en charge native des commandes) contournent `visibleReplies: "message_tool"` et répondent toujours visiblement pour que l'interface utilisateur de commande native du canal reçoive la réponse attendue. Cela s'applique uniquement aux tours de commande native validés ; les commandes `/...` saisies sous forme de texte et les tours de conversation ordinaires suivent toujours la valeur par défaut configurée pour le groupe.

## Visibilité du contexte et listes d'autorisation

Deux contrôles différents sont impliqués dans la sécurité des groupes :

- **Autorisation de déclenchement** : qui peut déclencher l'agent (`groupPolicy`, `groups`, `groupAllowFrom`, listes d'autorisation spécifiques au canal).
- **Visibilité du contexte** : quel contexte supplémentaire est injecté dans le modèle (texte de réponse, citations, historique du fil, métadonnées transférées).

Par défaut, OpenClaw privilégie le comportement de chat normal et conserve le contexte principalement tel qu'il est reçu. Cela signifie que les listes d'autorisation décident principalement de qui peut déclencher des actions, et non d'une frontière universelle de rédaction pour chaque extrait cité ou historique.

<AccordionGroup>
  <Accordion title="Le comportement actuel est spécifique au canal">
    - Certains canaux appliquent déjà un filtrage basé sur l'expéditeur pour le contexte supplémentaire dans des chemins spécifiques (par exemple, l'amorçage de fil Slack, les recherches de réponse/fil Matrix).
    - D'autres canaux transmettent toujours le contexte de citation/réponse/transfert tel quel.

  </Accordion>
  <Accordion title="Direction de durcissement (prévu)">
    - `contextVisibility: "all"` (par défaut) conserve le comportement actuel tel quel.
    - `contextVisibility: "allowlist"` filtre le contexte supplémentaire aux expéditeurs autorisés.
    - `contextVisibility: "allowlist_quote"` est `allowlist` plus une exception de citation/réponse explicite.

    Jusqu'à ce que ce modèle de durcissement soit implémenté de manière cohérente sur tous les canaux, attendez-vous à des différences selon la surface.

  </Accordion>
</AccordionGroup>

![Group message flow](/images/groups-flow.svg)

Si vous souhaitez...

| Objectif                                                                | Ce qu'il faut définir                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| Autoriser tous les groupes mais ne répondre qu'aux mentions (@mentions) | `groups: { "*": { requireMention: true } }`                |
| Désactiver toutes les réponses de groupe                                | `groupPolicy: "disabled"`                                  |
| Seulement certains groupes                                              | `groups: { "<group-id>": { ... } }` (pas de clé `"*"`)     |
| Seulement vous pouvez déclencher dans les groupes                       | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| Réutiliser un ensemble d'expéditeurs de confiance sur plusieurs canaux  | `groupAllowFrom: ["accessGroup:operators"]`                |

Pour les listes d'autorisation d'expéditeurs réutilisables, voir [Access groups](/fr/channels/access-groups).

## Clés de session

- Les sessions de groupe utilisent des clés de session `agent:<agentId>:<channel>:group:<id>` (les salons/canaux utilisent `agent:<agentId>:<channel>:channel:<id>`).
- Les sujets de forum Telegram ajoutent Telegram`:topic:<threadId>` à l'identifiant du groupe afin que chaque sujet ait sa propre session.
- Les discussions directes utilisent la session principale (ou par expéditeur si configuré).
- Les signaux de présence (heartbeats) sont ignorés pour les sessions de groupe.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Modèle : DMs personnels + groupes publics (agent unique)

Oui — cela fonctionne bien si votre trafic « personnel » est constitué de **DMs** et votre trafic « public » de **groupes**.

Pourquoi : en mode agent unique, les DMs atterrissent généralement dans la clé de session **principale** (`agent:main:main`), tandis que les groupes utilisent toujours des clés de session **non principales** (`agent:main:<channel>:group:<id>`). Si vous activez l'isolement (sandboxing) avec `mode: "non-main"`Docker, ces sessions de groupe s'exécutent dans le backend d'isolement configuré, tandis que votre session principale de DM reste sur l'hôte. Docker est le backend par défaut si vous n'en choisissez pas un.

Cela vous offre un « cerveau » d'agent unique (espace de travail partagé + mémoire), mais deux postures d'exécution :

- **DMs** : outils complets (hôte)
- **Groupes** : sandbox + outils restreints

<Note>Si vous avez besoin d'espaces de travail/personnalités véritablement séparés (le « personnel » et le « public » ne doivent jamais être mélangés), utilisez un deuxième agent + liaisons. Voir [Multi-Agent Routing](/fr/concepts/multi-agent).</Note>

<Tabs>
  <Tab title="DMs sur l'hôte, groupes isolés">
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
    Vous préférez « les groupes ne peuvent voir que le dossier X » plutôt que « aucun accès à l'hôte » ? Gardez `workspaceAccess: "none"` et montez uniquement les chemins autorisés dans le sandbox :

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

- Clés de configuration et valeurs par défaut : [configuration du Gateway](/fr/gateway/config-agents#agentsdefaultssandbox)
- Débogage du blocage d'un outil : [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)
- Détails des bind mounts : [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts)

## Libellés d'affichage

- Les libellés de l'interface utilisateur utilisent `displayName` si disponible, formaté comme `<channel>:<token>`.
- `#room` est réservé aux salons/canaux ; les discussions de groupe utilisent `g-<slug>` (minuscules, espaces -> `-`, conserver `#@+._-`).

## Stratégie de groupe

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

| Stratégie (Policy) | Comportement                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `"open"`           | Les groupes contournent les listes d'autorisation ; le filtrage des mentions s'applique toujours. |
| `"disabled"`       | Bloquer entièrement tous les messages de groupe.                                                  |
| `"allowlist"`      | Autoriser uniquement les groupes/salons qui correspondent à la liste d'autorisation configurée.   |

<AccordionGroup>
  <Accordion title="Per-channel notes">
    - `groupPolicy` est distinct du filtrage par mention (qui nécessite des @mentions).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo : utilisez `groupAllowFrom` (solution de repli : `allowFrom` explicite).
    - Signal : `groupAllowFrom` peut correspondre soit à l'ID de groupe Signal entrant, soit au téléphone/UUID de l'expéditeur.
    - Les approbations d'appariement DM (entrées du magasin `*-allowFrom`) s'appliquent uniquement à l'accès DM ; l'autorisation de l'expéditeur du groupe reste explicite aux listes d'autorisation de groupe.
    - Discord : la liste d'autorisation utilise `channels.discord.guilds.<id>.channels`.
    - Slack : la liste d'autorisation utilise `channels.slack.channels`.
    - Matrix : la liste d'autorisation utilise `channels.matrix.groups`. Préférez les ID de salle ou les alias ; la recherche de nom de salle rejointe est au mieux, et les noms non résolus sont ignorés lors de l'exécution. Utilisez `channels.matrix.groupAllowFrom` pour restreindre les expéditeurs ; les listes d'autorisation `users` par salle sont également prises en charge.
    - Les DM de groupe sont contrôlés séparément (`channels.discord.dm.*`, `channels.slack.dm.*`).
    - La liste d'autorisation Telegram peut correspondre aux ID utilisateur (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou aux noms d'utilisateur (`"@alice"` ou `"alice"`) ; les préfixes ne sont pas sensibles à la casse.
    - La valeur par défaut est `groupPolicy: "allowlist"` ; si votre liste d'autorisation de groupe est vide, les messages de groupe sont bloqués.
    - Sécurité à l'exécution : lorsqu'un bloc de fournisseur est complètement manquant (`channels.<provider>` absent), la stratégie de groupe revient à un mode fermé par défaut (généralement `allowlist`) au lieu d'hériter de `channels.defaults.groupPolicy`.

  </Accordion>
</AccordionGroup>

Modèle mental rapide (ordre d'évaluation pour les messages de groupe) :

<Steps>
  <Step title="groupPolicy">`groupPolicy` (ouvert/désactivé/liste blanche).</Step>
  <Step title="Group allowlists">Listes blanches de groupe (`*.groups`, `*.groupAllowFrom`, liste blanche spécifique au canal).</Step>
  <Step title="Mention gating">Filtrage des mentions (`requireMention`, `/activation`).</Step>
</Steps>

## Filtrage des mentions (par défaut)

Les messages de groupe nécessitent une mention, sauf si cela est remplacé pour chaque groupe. Les valeurs par défaut résident par sous-système sous `*.groups."*"`.

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

## Portée des modèles de mention configurés

Les `mentionPatterns` configurés sont des déclencheurs de secours par regex. Utilisez-los lorsque la plateforme n'expose pas de mention native de bot, ou lorsque vous souhaitez que du texte brut tel que `openclaw:` compte comme une mention. Les mentions natives de la plateforme sont séparées : lorsque Discord, Slack, Telegram, Matrix ou un autre canal peut prouver que le message mentionnait explicitement le bot, cette mention native déclenche toujours l'action, même si les modèles regex configurés sont refusés.

Par défaut, les modèles de mention configurés s'appliquent partout où le canal transmet les faits du fournisseur et de la conversation à la détection de mention. Pour empêcher les modèles larges de réveiller l'agent dans chaque groupe, délimitez-les par canal avec `channels.<channel>.mentionPatterns`.

Utilisez `mode: "deny"` lorsque les modèles de mention par regex doivent être désactivés par défaut pour un canal, puis activez-les dans des salles spécifiques avec `allowIn` :

```json5
{
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b", "\\bops bot\\b"],
    },
  },
  channels: {
    slack: {
      mentionPatterns: {
        mode: "deny",
        allowIn: ["C0123OPS"],
      },
    },
  },
}
```

Utilisez la valeur par défaut `mode: "allow"` (ou omettez `mode`) lorsque les modèles de mention par regex doivent s'appliquer largement, puis désactivez-les dans les salons bruyants avec `denyIn` :

```json5
{
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b"],
    },
  },
  channels: {
    telegram: {
      mentionPatterns: {
        denyIn: ["-1001234567890", "-1001234567890:topic:42"],
      },
    },
  },
}
```

Résolution de la stratégie :

| Champ           | Effet                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode: "allow"` | Les modèles de mention par regex sont activés sauf si l'ID de conversation se trouve dans `denyIn`. Il s'agit de la valeur par défaut.           |
| `mode: "deny"`  | Les modèles de mention par regex sont désactivés sauf si l'ID de conversation se trouve dans `allowIn`.                                          |
| `allowIn`       | ID de conversation pour lesquels les modèles de mention par regex sont activés en mode refus.                                                    |
| `denyIn`        | ID de conversation pour lesquels les modèles de mention par regex sont désactivés. `denyIn` prime sur `allowIn` si les deux incluent le même ID. |

Stratégie de regex à portée prise en charge aujourd'hui :

| Channel  | ID utilisés dans `allowIn` / `denyIn`                                      |
| -------- | -------------------------------------------------------------------------- |
| Discord  | Discord channel IDs.                                                       |
| Matrix   | Matrix room IDs.                                                           |
| Slack    | Slack channel IDs.                                                         |
| Telegram | ID de chat de groupe, ou `chatId:topic:threadId` pour les sujets de forum. |
| WhatsApp | WhatsApp conversation IDs such as `123@g.us`.                              |

Les configurations de canal au niveau du compte peuvent définir la même stratégie sous `channels.<channel>.accounts.<accountId>.mentionPatterns` lorsque ce canal prend en charge plusieurs comptes. La stratégie du compte prime sur la stratégie de canal de niveau supérieur pour ce compte.

<AccordionGroup>
  <Accordion title="Notes sur le filtrage des mentions">
    - Les `mentionPatterns` sont des motifs regex sécurisés insensibles à la casse ; les motifs invalides et les formes de répétition imbriquées non sécurisées sont ignorés.
    - Les surfaces qui fournissent des mentions explicites passent toujours ; les motifs regex configurés servent de solution de repli.
    - `channels.<channel>.mentionPatterns.mode: "deny"` désactive les motifs de mention configurés par défaut pour ce channel ; réactivez les conversations sélectionnées avec `allowIn`.
    - `channels.<channel>.mentionPatterns.denyIn` désactive les motifs de mention configurés pour des ID de conversation spécifiques, tandis que les @mentions natives de la plateforme passent toujours.
    - Remplacement par agent : `agents.list[].groupChat.mentionPatterns` (utile lorsque plusieurs agents partagent un groupe).
    - Le filtrage des mentions n'est appliqué que lorsque la détection de mentions est possible (mentions natives ou `mentionPatterns` configurés).
    - L'ajout à la liste autorisée d'un groupe ou d'un expéditeur ne désactive pas le filtrage des mentions ; définissez le `requireMention` de ce groupe sur `false` lorsque tous les messages doivent déclencher une action.
    - Le contexte de prompt automatique de chat de groupe transporte l'instruction de réponse silencieuse résolue à chaque tour ; les fichiers de l'espace de travail ne doivent pas dupliquer la mécanique `NO_REPLY`.
    - Les groupes où les réponses silencieuses automatiques sont autorisées traitent les tours de modèle vides et propres ou constitués uniquement de raisonnement comme silencieux, équivalent à `NO_REPLY`. Les chats directs ne reçoivent jamais la consigne `NO_REPLY`, et les réponses de groupe avec outil de message uniquement restent silencieuses en n'appelant pas `message(action=send)`.
    - Les bavardages de groupe permanents ambiants utilisent par défaut la sémantique de requête utilisateur. Définissez `messages.groupChat.unmentionedInbound: "room_event"` pour les soumettre en tant que contexte silencieux à la place. Voir [Ambient room events](/fr/channels/ambient-room-events) pour des exemples de configuration.
    - Les événements de salle ne sont pas stockés en tant que fausses requêtes utilisateur, et le texte de l'assistant privé provenant d'événements de salle sans outil de message n'est pas rejoué dans l'historique de chat.
    - Les valeurs par défaut Discord se trouvent dans `channels.discord.guilds."*"` (surchargeables par guilde/channel).
    - Le contexte de l'historique de groupe est enveloppé uniformément sur les channels. Les groupes avec filtrage de mentions conservent les messages en attente ignorés ; les groupes permanents peuvent également conserver les messages de salle récents traités lorsque le channel le prend en charge. Utilisez `messages.groupChat.historyLimit` pour la valeur par défaut globale et `channels.<channel>.historyLimit` (ou `channels.<channel>.accounts.*.historyLimit`) pour les surcharges. Définissez `0` pour désactiver.

  </Accordion>
</AccordionGroup>

## Restrictions d'outils de groupe/canal (facultatif)

Certaines configurations de canal prennent en charge la restriction des outils disponibles **dans un groupe/salle/canal spécifique**.

- `tools` : autoriser/refuser les outils pour l'ensemble du groupe.
- `toolsBySender` : remplacements par expéditeur au sein du groupe. Utilisez des préfixes de clés explicites : `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` et le caractère générique `"*"`. Les identifiants de canal utilisent les identifiants de canal canoniques OpenClaw ; les alias tels que `teams` sont normalisés en `msteams`. Les clés sans préfixe héritées sont toujours acceptées et mises en correspondance uniquement en tant que `id:`.

Ordre de résolution (le plus spécifique l'emporte) :

<Steps>
  <Step title="Group toolsBySender">Correspondance du groupe/canal `toolsBySender`.</Step>
  <Step title="Group tools">Outils du groupe/canal `tools`.</Step>
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

<Note>Les restrictions d'outils de groupe/canal sont appliquées en plus de la stratégie d'outils globale/par agent (le refus l'emporte toujours). Certains canaux utilisent une imbrication différente pour les salaux/canaux (par exemple, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listes d'autorisation de groupe

Lorsque `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` est configuré, les clés agissent comme une liste d'autorisation de groupe. Utilisez `"*"` pour autoriser tous les groupes tout en définissant toujours le comportement de mention par défaut.

<Warning>
  Confusion courante : l'approbation de l'appariement DM n'est pas la même chose que l'autorisation de groupe. Pour les channels qui prennent en charge l'appariement DM, le magasin d'appariements déverrouille uniquement les DMs. Les commandes de groupe nécessitent toujours une autorisation explicite de l'expéditeur du groupe via les listes d'autorisation de configuration telles que
  `groupAllowFrom` ou le secours de configuration documenté pour ce channel.
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
  <Tab title="Déclencheurs propriétaire uniquement (WhatsApp)">
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

Les propriétaires de groupe peuvent activer ou désactiver chaque groupe individuellement :

- `/activation mention`
- `/activation always`

Le propriétaire est déterminé par `channels.whatsapp.allowFrom` (ou l'E.164 propre du bot si non défini). Envoyez la commande sous forme de message autonome. Les autres surfaces ignorent actuellement `/activation`.

## Champs de contexte

Les payloads entrants de groupe définissent :

- `ChatType=group`
- `GroupSubject` (si connu)
- `GroupMembers` (si connu)
- `WasMentioned` (résultat du filtrage par mention)
- Les sujets de forum Telegram incluent également `MessageThreadId` et `IsForum`.

Le système de prompt de l'agent inclut une introduction de groupe au premier tour d'une nouvelle session de groupe. Il rappelle au model de répondre comme un humain, d'éviter les tableaux Markdown, de minimiser les lignes vides et de respecter l'espacement normal de la discussion, et d'éviter de taper des séquences littérales `\n`. Les noms de groupe et les étiquettes des participants provenant du channel sont rendus sous forme de métadonnées non fiables clôturées, et non d'instructions système en ligne.

## Spécificités iMessage

- Préférez `chat_id:<id>` lors du routage ou de la mise sur liste blanche.
- Lister les discussions : `imsg chats --limit 20`.
- Les réponses de groupe reviennent toujours au même `chat_id`.

## Prompts système WhatsApp

Voir [WhatsApp](/fr/channels/whatsapp#system-prompts) pour les règles officielles des prompts système WhatsApp, y compris la résolution des prompts de groupe et directs, le comportement des caractères génériques et la sémantique de priorité du compte.

## Spécificités WhatsApp

Voir [Group messages](/fr/channels/group-messages) pour les comportements spécifiques à WhatsApp (injection d'historique, détails de gestion des mentions).

## Connexes

- [Broadcast groups](/fr/channels/broadcast-groups)
- [Channel routing](/fr/channels/channel-routing)
- [Group messages](/fr/channels/group-messages)
- [Pairing](/fr/channels/pairing)
