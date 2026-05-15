---
summary: "DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZaloComportement des discussions de groupe sur différentes plateformes (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Groupes"
sidebarTitle: "Groupes"
---

OpenClaw traite les discussions de groupe de manière cohérente sur toutes les surfaces : Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

## Introduction pour débutants (2 minutes)

OpenClaw « vit » sur vos propres comptes de messagerie. Il n'y a pas d'utilisateur bot WhatsApp séparé. Si **vous** êtes dans un groupe, OpenClaw peut voir ce groupe et y répondre.

Comportement par défaut :

- Les groupes sont restreints (`groupPolicy: "allowlist"`).
- Les réponses nécessitent une mention, sauf si vous désactivez explicitement le filtrage par mention.
- Les réponses finales normales dans les groupes/canaux sont privées par défaut. La sortie visible dans la salle utilise l'outil `message`.

Traduction : les expéditeurs sur la liste d'autorisation peuvent déclencher OpenClaw en le mentionnant.

<Note>
**En résumé**

- **L'accès par DM** est contrôlé par `*.allowFrom`.
- **L'accès aux groupes** est contrôlé par `*.groupPolicy` + les listes d'autorisation (`*.groups`, `*.groupAllowFrom`).
- **Le déclenchement des réponses** est contrôlé par le filtrage des mentions (`requireMention`, `/activation`).

</Note>

Flux rapide (ce qui arrive à un message de groupe) :

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

## Réponses visibles

Pour les salles de groupe/canal, OpenClaw est par défaut réglé sur OpenClaw`messages.groupChat.visibleReplies: "message_tool"`.
`openclaw doctor --fix` écrit cette valeur par défaut dans les configurations de canal configuré qui l'omettent.
Cela signifie que l'agent traite toujours le tour et peut mettre à jour l'état de la mémoire/session, mais sa réponse finale normale n'est pas automatiquement renvoyée dans la salle. Pour parler de manière visible, l'agent utilise `message(action=send)`.

Ce comportement par défaut dépend d'un modèle/runtime qui appelle les outils de manière fiable. Si les journaux montrent du texte d'assistant mais `didSendViaMessagingTool: false`DiscordSlackTelegram, le modèle a répondu en privé au lieu d'appeler l'outil de message. Ce n'est pas un échec d'envoi Discord/Slack/Telegram. Utilisez un modèle fiable pour les appels d'outils pour les sessions de groupe/canal, ou définissez `messages.groupChat.visibleReplies: "automatic"` pour restaurer les anciennes réponses finales visibles.

Si l'outil de message n'est pas disponible sous la stratégie d'outil active, OpenClaw revient aux réponses visibles automatiques au lieu de supprimer silencieusement la réponse.
`openclaw doctor` avertit de cette inadéquation.

Pour les conversations directes et tout autre tour de source, utilisez `messages.visibleReplies: "message_tool"` pour appliquer globalement le même comportement de réponse visible « outil uniquement ». Les harnais peuvent également choisir cela comme valeur par défaut non définie ; le harnais Codex le fait pour les conversations directes en mode Codex. `messages.groupChat.visibleReplies` reste la substitution plus spécifique pour les salles de groupe/canal.

Cela remplace l'ancien modèle qui consistait à forcer le modèle à répondre `NO_REPLY` pour la plupart des tours en mode « lurk ». En mode « outil uniquement », ne rien faire de visible signifie simplement ne pas appeler l'outil de message.

Les indicateurs de frappe sont toujours envoyés pendant que l'agent fonctionne en mode « outil uniquement ». Le mode de frappe de groupe par défaut est mis à niveau de « message » à « instantané » pour ces tours, car il peut n'y avoir jamais de texte de message d'assistant normal avant que l'agent ne décide d'appeler l'outil de message. La configuration explicite du mode de frappe l'emporte toujours.

Pour restaurer les réponses finales automatiques héritées pour les salles de groupe/canal :

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

La passerelle recharge à chaud la configuration `messages` après l'enregistrement du fichier. Redémarrez uniquement
lorsque la surveillance des fichiers ou le rechargement de la configuration est désactivé dans le déploiement.

Pour exiger que la sortie visible passe par l'outil de message pour chaque conversation source :

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

Les commandes barre oblique natives (Discord, Telegram et autres surfaces avec prise en charge native des commandes) contournent `visibleReplies: "message_tool"` et répondent toujours visiblement afin que l'interface utilisateur de commande native du canal obtienne la réponse attendue. Cela s'applique uniquement aux tours de commande native validés ; les commandes `/...` saisies sous forme de texte et les tours de conversation ordinaires suivent toujours la valeur par défaut du groupe configurée.

## Visibilité du contexte et listes d'autorisation

Deux contrôles différents sont impliqués dans la sécurité des groupes :

- **Autorisation de déclenchement** : qui peut déclencher l'agent (`groupPolicy`, `groups`, `groupAllowFrom`, listes d'autorisation spécifiques au canal).
- **Visibilité du contexte** : quel contexte supplémentaire est injecté dans le modèle (texte de réponse, citations, historique des fils, métadonnées transférées).

Par défaut, OpenClaw privilégie le comportement de chat normal et conserve le contexte tel qu'il est principalement reçu. Cela signifie que les listes d'autorisation décident principalement de qui peut déclencher des actions, et non une limite de rétractation universelle pour chaque extrait cité ou historique.

<AccordionGroup>
  <Accordion title="Le comportement actuel est spécifique au canal">
    - Certains canaux appliquent déjà un filtrage basé sur l'expéditeur pour le contexte supplémentaire dans des chemins spécifiques (par exemple, l'amorçage de fils Slack, les recherches de réponses/fils Matrix).
    - D'autres canaux transmettent toujours le contexte de citation/réponse/transfert tel quel.

  </Accordion>
  <Accordion title="Direction de durcissement (prévu)">
    - `contextVisibility: "all"` (par défaut) conserve le comportement actuel tel que reçu.
    - `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés.
    - `contextVisibility: "allowlist_quote"` est `allowlist` plus une exception explicite de citation/réponse.

    Jusqu'à ce que ce modèle de durcissement soit implémenté de manière cohérente sur tous les canaux, attendez-vous à des différences selon la surface.

  </Accordion>
</AccordionGroup>

![Group message flow](/images/groups-flow.svg)

Si vous souhaitez...

| Objectif                                                                     | Ce qu'il faut définir                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Autoriser tous les groupes mais ne répondre que sur les mentions (@mentions) | `groups: { "*": { requireMention: true } }`                |
| Désactiver toutes les réponses de groupe                                     | `groupPolicy: "disabled"`                                  |
| Seuls des groupes spécifiques                                                | `groups: { "<group-id>": { ... } }` (pas de clé `"*"`)     |
| Seul vous pouvez déclencher dans les groupes                                 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| Réutiliser un ensemble d'expéditeurs de confiance sur plusieurs canaux       | `groupAllowFrom: ["accessGroup:operators"]`                |

Pour les listes d'autorisation d'expéditeurs réutilisables, consultez [Groupes d'accès](/fr/channels/access-groups).

## Clés de session

- Les sessions de groupe utilisent des clés de session `agent:<agentId>:<channel>:group:<id>` (les salons/canaux utilisent `agent:<agentId>:<channel>:channel:<id>`).
- Les sujets de forum Telegram ajoutent `:topic:<threadId>` à l'identifiant du groupe afin que chaque sujet ait sa propre session.
- Les chats directs utilisent la session principale (ou par expéditeur si configuré).
- Les signaux de présence (heartbeats) sont ignorés pour les sessions de groupe.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Modèle : MDs personnels + groupes publics (agent unique)

Oui — cela fonctionne bien si votre trafic "personnel" se fait via des **DMs** et votre trafic "public" via des **groupes**.

Pourquoi : en mode mono-agent, les DMs atterrissent généralement dans la clé de session **principale** (`agent:main:main`), tandis que les groupes utilisent toujours des clés de session **non principales** (`agent:main:<channel>:group:<id>`). Si vous activez le sandboxing avec `mode: "non-main"`Docker, ces sessions de groupe s'exécutent dans le backend de sandbox configuré tandis que votre session principale de DM reste sur l'hôte. Docker est le backend par défaut si vous n'en choisissez pas un.

Cela vous offre un "cerveau" d'agent unique (espace de travail partagé + mémoire), mais deux postures d'exécution :

- **DMs** : outils complets (hôte)
- **Groupes** : sandbox + outils restreints

<Note>Si vous avez besoin d'espaces de travail ou de personna véritablement séparés (les parties "personnelle" et "publique" ne doivent jamais être mélangées), utilisez un deuxième agent + liaisons. Voir [Routage Multi-Agent](/fr/concepts/multi-agent).</Note>

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
    Vous préférez "les groupes ne peuvent voir que le dossier X" plutôt que "pas d'accès à l'hôte" ? Gardez `workspaceAccess: "none"` et montez uniquement les chemins autorisés dans la sandbox :

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

- Clés de configuration et valeurs par défaut : [Configuration du Gateway](Gateway/en/gateway/config-agents#agentsdefaultssandbox)
- Débogage du blocage d'un outil : [Sandbox vs Stratégie d'outil vs Élevé](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)
- Détails des montages de liaison : [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts)

## Libellés d'affichage

- Les libellés de l'interface utilisateur utilisent `displayName` lorsque disponible, formatés comme `<channel>:<token>`.
- `#room` est réservé aux salons/canaux ; les chats de groupe utilisent `g-<slug>` (minuscules, espaces -> `-`, gardez `#@+._-`).

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

| Stratégie     | Comportement                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `"open"`      | Les groupes contournent les listes d'autorisation ; le filtrage par mention s'applique toujours. |
| `"disabled"`  | Bloquer tous les messages de groupe entièrement.                                                 |
| `"allowlist"` | Autoriser uniquement les groupes/salons qui correspondent à la liste d'autorisation configurée.  |

<AccordionGroup>
  <Accordion title="Notes par channel">
    - `groupPolicy`WhatsAppTelegramSignaliMessageMicrosoft TeamsZalo est distinct du filtrage par mention (qui nécessite des @mentions).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo : utilisez `groupAllowFrom` (solution de repli : `allowFrom`Signal explicite).
    - Signal : `groupAllowFrom`Signal peut correspondre à l'ID de groupe Signal entrant ou au téléphone/UUID de l'expéditeur.
    - Les approbations d'appariement DM (entrées du magasin `*-allowFrom`Discord) s'appliquent uniquement à l'accès DM ; l'autorisation de l'expéditeur de groupe reste explicite aux listes d'autorisation de groupe.
    - Discord : la liste d'autorisation utilise `channels.discord.guilds.<id>.channels`Slack.
    - Slack : la liste d'autorisation utilise `channels.slack.channels`Matrix.
    - Matrix : la liste d'autorisation utilise `channels.matrix.groups`. Privilégiez les ID de salon ou les alias ; la recherche par nom de salon rejoint est un best-effort, et les noms non résolus sont ignorés à l'exécution. Utilisez `channels.matrix.groupAllowFrom` pour restreindre les expéditeurs ; les listes d'autorisation `users` par salon sont également prises en charge.
    - Les DM de groupe sont contrôlés séparément (`channels.discord.dm.*`, `channels.slack.dm.*`Telegram).
    - La liste d'autorisation Telegram peut correspondre aux ID utilisateur (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou aux noms d'utilisateur (`"@alice"` ou `"alice"`) ; les préfixes ne sont pas sensibles à la casse.
    - La valeur par défaut est `groupPolicy: "allowlist"` ; si votre liste d'autorisation de groupe est vide, les messages de groupe sont bloqués.
    - Sécurité à l'exécution : lorsqu'un bloc de fournisseur est complètement manquant (`channels.<provider>` absent), la stratégie de groupe revient à un mode échec-fermé (typiquement `allowlist`) au lieu d'hériter de `channels.defaults.groupPolicy`.

  </Accordion>
</AccordionGroup>

Modèle mental rapide (ordre d'évaluation pour les messages de groupe) :

<Steps>
  <Step title="groupPolicy">`groupPolicy` (ouvert/désactivé/liste blanche).</Step>
  <Step title="Listes blanches de groupes">Listes blanches de groupes (`*.groups`, `*.groupAllowFrom`, liste blanche spécifique au canal).</Step>
  <Step title="Filtrage des mentions">Filtrage des mentions (`requireMention`, `/activation`).</Step>
</Steps>

## Filtrage des mentions (par défaut)

Les messages de groupe nécessitent une mention, sauf si la règle est modifiée pour un groupe spécifique. Les valeurs par défaut sont définies par sous-système sous `*.groups."*"`.

Répondre à un message de bot compte comme une mention implicite lorsque le canal prend en charge les métadonnées de réponse. Citer un message de bot peut également compter comme une mention implicite sur les canaux qui exposent les métadonnées de citation. Les cas intégrés actuels incluent Telegram, WhatsApp, Slack, Discord, Microsoft Teams et ZaloUser.

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
    - `mentionPatterns` sont des motifs regex sécurisés insensibles à la casse ; les motifs non valides et les formes de répétition imbriquées non sécurisées sont ignorés.
    - Les surfaces qui fournissent des mentions explicites passent toujours ; les motifs sont un repli.
    - Remplacement par agent : `agents.list[].groupChat.mentionPatterns` (utile lorsque plusieurs agents partagent un groupe).
    - Le filtrage des mentions n'est appliqué que lorsque la détection des mentions est possible (mentions natives ou `mentionPatterns` configurés).
    - Autoriser un groupe ou un expéditeur ne désactive pas le filtrage des mentions ; définissez le `requireMention` de ce groupe sur `false` lorsque tous les messages doivent déclencher une action.
    - Le contexte du prompt de discussion de groupe transporte l'instruction de réponse silencieuse résolue à chaque tour ; les fichiers de l'espace de travail ne doivent pas dupliquer la mécanique de `NO_REPLY`.
    - Les groupes où les réponses silencieuses sont autorisées traitent les tours de modèle vides propres ou composés uniquement de raisonnement comme silencieux, équivalent à `NO_REPLY`. Les discussions directes font de même uniquement lorsque les réponses silencieuses directes sont explicitement autorisées ; sinon, les réponses vides restent des tours d'agent échoués.
    - Les paramètres par défaut Discord se trouvent dans `channels.discord.guilds."*"` (surchargeable par guilde/channel).
    - Le contexte de l'historique de groupe est enveloppé de manière uniforme sur les channels et est **en attente uniquement** (messages ignorés en raison du filtrage des mentions) ; utilisez `messages.groupChat.historyLimit` pour le défaut global et `channels.<channel>.historyLimit` (ou `channels.<channel>.accounts.*.historyLimit`) pour les surcharges. Définissez `0` pour désactiver.

  </Accordion>
</AccordionGroup>

## Restrictions des outils de groupe/channel (optionnel)

Certaines configurations de channel prennent en charge la restriction des outils disponibles **à l'intérieur d'un groupe/salon/channel spécifique**.

- `tools` : autoriser/interdire des outils pour l'ensemble du groupe.
- `toolsBySender` : remplacements par expéditeur au sein du groupe. Utilisez des préfixes de clé explicites : `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` et le caractère générique `"*"`. Les clés héritées sans préfixe sont toujours acceptées et correspondent uniquement à `id:`.

Ordre de résolution (le plus spécifique l'emporte) :

<Steps>
  <Step title="Group toolsBySender">Correspondance de groupe/channel `toolsBySender`.</Step>
  <Step title="Group tools">Groupe/channel `tools`.</Step>
  <Step title="Default toolsBySender">Par défaut (`"*"`) correspondance `toolsBySender`.</Step>
  <Step title="Default tools">Par défaut (`"*"`) `tools`.</Step>
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

<Note>Les restrictions d'outils de groupe/channel sont appliquées en plus de la stratégie d'outils globale/de l'agent (le refus l'emporte toujours). Certains canaux utilisent une imbrication différente pour les salons/canaux (par exemple, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listes blanches de groupes

Lorsque `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` est configuré, les clés agissent comme une liste blanche de groupes. Utilisez `"*"` pour autoriser tous les groupes tout en définissant toujours le comportement de mention par défaut.

<Warning>
  Confusion courante : l'approbation du jumelage DM n'est pas la même que l'autorisation de groupe. Pour les canaux qui prennent en charge le jumelage DM, le stockage de jumelage déverrouille uniquement les DM. Les commandes de groupe nécessitent toujours une autorisation explicite de l'expéditeur du groupe à partir des listes blanches de configuration telles que `groupAllowFrom` ou le repli de
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
  <Tab title="Déclencheurs réservés au propriétaire (WhatsApp)">
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

## Activation (réservée au propriétaire)

Les propriétaires de groupe peuvent activer ou désactiver le groupe par groupe :

- `/activation mention`
- `/activation always`

Le propriétaire est déterminé par `channels.whatsapp.allowFrom` (ou par l'E.164 propre du bot si non défini). Envoyez la commande sous forme de message autonome. Les autres surfaces ignorent actuellement `/activation`.

## Champs de contexte

Les charges utiles entrantes de groupe définissent :

- `ChatType=group` (si connu)
- `GroupSubject` (si connu)
- `GroupMembers` (si connu)
- `WasMentioned` (résultat du filtrage par mention)
- Les sujets de forum Telegram incluent également `MessageThreadId` et `IsForum`.

Le système de prompt de l'agent inclut une introduction de groupe lors du premier tour d'une nouvelle session de groupe. Il rappelle au modèle de répondre comme un humain, d'éviter les tableaux Markdown, de minimiser les lignes vides et de respecter l'espacement normal de la discussion, et d'éviter de taper des séquences `\n` littérales. Les noms de groupe et les étiquettes des participants provenant de la chaîne sont restitués sous forme de métadonnées non fiables clôturées, et non d'instructions système en ligne.

## Spécificités iMessage

- Privilégiez `chat_id:<id>` lors du routage ou de la liste d'autorisation.
- Lister les discussions : `imsg chats --limit 20`.
- Les réponses de groupe reviennent toujours au même `chat_id`.

## Prompts système WhatsApp

Voir [WhatsApp](/fr/channels/whatsapp#system-prompts) pour les règles canoniques des prompts système WhatsApp, y compris la résolution des prompts de groupe et directs, le comportement des caractères génériques et la sémantique de substitution de compte.

## Spécificités de WhatsApp

Voir [Group messages](/fr/channels/group-messages) pour les comportements spécifiques à WhatsApp (injection de l'historique, détails de la gestion des mentions).

## Connexes

- [Broadcast groups](/fr/channels/broadcast-groups)
- [Channel routing](/fr/channels/channel-routing)
- [Group messages](/fr/channels/group-messages)
- [Pairing](/fr/channels/pairing)
