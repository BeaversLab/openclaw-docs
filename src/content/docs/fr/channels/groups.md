---
summary: "Comportement des discussions de groupe sur toutes les surfaces (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
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

Traduction : les expéditeurs autorisés peuvent déclencher OpenClaw en le mentionnant.

<Note>
**En résumé**

- L'accès par **DM** est contrôlé par `*.allowFrom`.
- L'accès par **groupe** est contrôlé par `*.groupPolicy` + des listes d'autorisation (`*.groups`, `*.groupAllowFrom`).
- Le déclenchement des réponses est contrôlé par le filtrage des mentions (`requireMention`, `/activation`).
  </Note>

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

<AccordionGroup>
  <Accordion title="Le comportement actuel est spécifique au channel">
    - Certains canaux appliquent déjà un filtrage basé sur l'expéditeur pour le contexte supplémentaire dans des chemins spécifiques (par exemple, l'amorçage de fils de discussion Slack, les recherches de réponse/fil sur Matrix).
    - D'autres canaux transmettent toujours le contexte de citation/réponse/transfert tel qu'il est reçu.
  </Accordion>
  <Accordion title="Direction de durcissement (prévu)">
    - `contextVisibility: "all"` (par défaut) conserve le comportement actuel tel que reçu.
    - `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés.
    - `contextVisibility: "allowlist_quote"` est `allowlist` plus une exception explicite pour citation/réponse.

    Tant que ce modèle de durcissement n'est pas implémenté de manière cohérente sur tous les canaux, attendez-vous à des différences selon la surface.

  </Accordion>
</AccordionGroup>

![Flux de messages de groupe](/images/groups-flow.svg)

Si vous souhaitez...

| Objectif                                                           | Ce qu'il faut définir                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------- |
| Autoriser tous les groupes mais ne répondre que lors des @mentions | `groups: { "*": { requireMention: true } }`                |
| Désactiver toutes les réponses de groupe                           | `groupPolicy: "disabled"`                                  |
| Seulement des groupes spécifiques                                  | `groups: { "<group-id>": { ... } }` (pas de clé `"*"`)     |
| Uniquement vous pouvez déclencher dans les groupes                 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## Clés de session

- Les sessions de groupe utilisent `agent:<agentId>:<channel>:group:<id>` clés de session (les salons/canaux utilisent `agent:<agentId>:<channel>:channel:<id>`).
- Les sujets de forum Telegram ajoutent `:topic:<threadId>` à l'identifiant du groupe, de sorte que chaque sujet possède sa propre session.
- Les discussions directes utilisent la session principale (ou par expéditeur si configuré).
- Les signaux de présence (heartbeats) sont ignorés pour les sessions de groupe.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Modèle : DMs personnels + groupes publics (agent unique)

Oui — cela fonctionne bien si votre trafic "personnel" se compose de **DMs** et votre trafic "public" de **groupes**.

Pourquoi : en mode agent unique, les DMs atterrissent généralement dans la clé de session **principale** (`agent:main:main`), tandis que les groupes utilisent toujours des clés de session **non principales** (`agent:main:<channel>:group:<id>`). Si vous activez l'isolation (sandboxing) avec `mode: "non-main"`, ces sessions de groupe s'exécutent dans le backend d'isolation configuré, tandis que votre session principale de DM reste sur l'hôte. Docker est le backend par défaut si vous n'en choisissez pas un.

Cela vous offre un "cerveau" d'agent unique (espace de travail partagé + mémoire), mais deux postures d'exécution :

- **DMs** : outils complets (hôte)
- **Groupes** : isolation + outils restreints

<Note>Si vous avez besoin d'espaces de travail ou de personas vraiment séparés (les parties "personnelle" et "publique" ne doivent jamais être mélangées), utilisez un second agent + liaisons. Voir [Routage Multi-Agent](/fr/concepts/multi-agent).</Note>

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
    Vous préférez "les groupes ne peuvent voir que le dossier X" plutôt que "pas d'accès à l'hôte" ? Gardez `workspaceAccess: "none"` et montez uniquement les chemins autorisés dans l'isolation (sandbox) :

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

- Clés de configuration et valeurs par défaut : [configuration Gateway](/fr/gateway/config-agents#agentsdefaultssandbox)
- Débogage du blocage d'un outil : [Sandbox vs Politique d'outil vs Élevé](/fr/gateway/sandbox-vs-tool-policy-vs-elevated)
- Détails des montages de liaison : [Isolation (Sandboxing)](/fr/gateway/sandboxing#custom-bind-mounts)

## Libellés d'affichage

- Les libellés de l'interface utilisent `displayName` lorsqu'ils sont disponibles, formatés comme `<channel>:<token>`.
- `#room` est réservé aux salons/canaux ; les chats de groupe utilisent `g-<slug>` (minuscules, espaces -> `-`, conserver `#@+._-`).

## Politique de groupe

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
| `"allowlist"` | Autoriser uniquement les groupes/salons correspondant à la liste d'autorisation configurée.      |

<AccordionGroup>
  <Accordion title="Notes par canal">
    - `groupPolicy` est distinct du filtrage par mention (qui nécessite des @mentions).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo : utilisez `groupAllowFrom` (alternative : `allowFrom` explicite).
    - Les approbations d'appariement DM (entrées du magasin `*-allowFrom`) s'appliquent uniquement à l'accès DM ; l'autorisation de l'expéditeur de groupe reste explicite aux listes d'autorisation de groupe.
    - Discord : la liste d'autorisation utilise `channels.discord.guilds.<id>.channels`.
    - Slack : la liste d'autorisation utilise `channels.slack.channels`.
    - Matrix : la liste d'autorisation utilise `channels.matrix.groups`. Préférez les ID de salle ou les alias ; la recherche par nom de salon rejoint est effectuée au mieux, et les noms non résolus sont ignorés lors de l'exécution. Utilisez `channels.matrix.groupAllowFrom` pour restreindre les expéditeurs ; les listes d'autorisation `users` par salon sont également prises en charge.
    - Les DM de groupe sont contrôlés séparément (`channels.discord.dm.*`, `channels.slack.dm.*`).
    - La liste d'autorisation Telegram peut correspondre aux ID utilisateur (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) ou aux noms d'utilisateur (`"@alice"` ou `"alice"`) ; les préfixes ne sont pas sensibles à la casse.
    - La valeur par défaut est `groupPolicy: "allowlist"` ; si votre liste d'autorisation de groupe est vide, les messages de groupe sont bloqués.
    - Sécurité à l'exécution : lorsqu'un bloc de fournisseur est complètement manquant (`channels.<provider>` absent), la politique de groupe revient à un mode fermé par défaut (généralement `allowlist`) au lieu d'hériter de `channels.defaults.groupPolicy`.
  </Accordion>
</AccordionGroup>

Modèle mental rapide (ordre d'évaluation pour les messages de groupe) :

<Steps>
  <Step title="groupPolicy">`groupPolicy` (ouvert/désactivé/liste d'autorisation).</Step>
  <Step title="Group allowlists">Listes d'autorisation de groupe (`*.groups`, `*.groupAllowFrom`, liste d'autorisation spécifique au canal).</Step>
  <Step title="Mention gating">Filtrage par mention (`requireMention`, `/activation`).</Step>
</Steps>

## Filtrage par mention (par défaut)

Les messages de groupe nécessitent une mention, sauf s'ils sont remplacés pour chaque groupe. Les valeurs par défaut résident par sous-système sous `*.groups."*"`.

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
  <Accordion title="Mention gating notes">
    - Les `mentionPatterns` sont des motifs d'expression régulière sécurisés insensibles à la casse ; les motifs non valides et les formes de répétition imbriquées non sécurisées sont ignorés.
    - Les surfaces qui fournissent des mentions explicites passent toujours ; les motifs constituent une solution de secours.
    - Remplacement par agent : `agents.list[].groupChat.mentionPatterns` (utile lorsque plusieurs agents partagent un groupe).
    - Le filtrage par mention n'est appliqué que lorsque la détection de mention est possible (les mentions natives ou `mentionPatterns` sont configurées).
    - Les groupes où les réponses silencieuses sont autorisées traitent les tours de modèle vides ou de raisonnement uniquement comme silencieux, équivalant à `NO_REPLY`. Les chats directs traitent toujours les réponses vides comme un échec de tour d'agent.
    - Les valeurs par défaut Discord se trouvent dans `channels.discord.guilds."*"` (remplaçables par guilde/canal).
    - Le contexte de l'historique de groupe est encapsulé de manière uniforme sur tous les canaux et est **en attente uniquement** (messages ignorés en raison du filtrage par mention) ; utilisez `messages.groupChat.historyLimit` pour la valeur par défaut globale et `channels.<channel>.historyLimit` (ou `channels.<channel>.accounts.*.historyLimit`) pour les remplacements. Définissez `0` pour désactiver.
  </Accordion>
</AccordionGroup>

## Restrictions d'outils de groupe/channel (facultatif)

Certaines configurations de channel prennent en charge la restriction des outils disponibles **à l'intérieur d'un groupe/room/channel spécifique**.

- `tools` : autoriser/refuser les outils pour l'ensemble du groupe.
- `toolsBySender` : substitutions par expéditeur au sein du groupe. Utilisez des préfixes de clé explicites : `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` et le caractère générique `"*"`. Les clés héritées sans préfixe sont toujours acceptées et correspondantes en tant que `id:` uniquement.

Ordre de résolution (le plus spécifique l'emporte) :

<Steps>
  <Step title="Group toolsBySender">Correspondance `toolsBySender` de groupe/channel.</Step>
  <Step title="Group tools">`tools` de groupe/channel.</Step>
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

<Note>Les restrictions d'outils de groupe/channel sont appliquées en plus de la stratégie d'outils globale/agent (le refus l'emporte toujours). Certains canaux utilisent une imbrication différente pour les rooms/channels (par exemple, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listes d'autorisation de groupe

Lorsque `channels.whatsapp.groups`, `channels.telegram.groups` ou `channels.imessage.groups` est configuré, les clés agissent comme une liste d'autorisation de groupe. Utilisez `"*"` pour autoriser tous les groupes tout en définissant le comportement de mention par défaut.

<Warning>
  Confusion courante : l'approbation de l'appariement DM n'est pas la même que l'autorisation de groupe. Pour les channels qui prennent en charge l'appariement DM, le magasin d'appariement déverrouille uniquement les DMs. Les commandes de groupe nécessitent toujours une autorisation explicite de l'expéditeur du groupe à partir des listes d'autorisation de configuration telles que `groupAllowFrom`
  ou du repli de configuration documenté pour ce channel.
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
  <Tab title="Autoriser uniquement des groupes spécifiques (WhatsApp)">
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

## Activation (propriétaire uniquement)

Les propriétaires de groupe peuvent activer/désactiver l'activation par groupe :

- `/activation mention`
- `/activation always`

Le propriétaire est déterminé par `channels.whatsapp.allowFrom` (ou par l'E.164 propre du bot s'il n'est pas défini). Envoyez la commande sous forme de message autonome. D'autres surfaces ignorent actuellement `/activation`.

## Champs de contexte

Les charges utiles entrantes de groupe définissent :

- `ChatType=group`
- `GroupSubject` (si connu)
- `GroupMembers` (si connu)
- `WasMentioned` (résultat du filtrage par mention)
- Les sujets de forum Telegram incluent également `MessageThreadId` et `IsForum`.

Notes spécifiques au channel :

- BlueBubbles peut optionnellement enrichir les participants de groupe macOS sans nom à partir de la base de données Contacts locale avant de remplir `GroupMembers`. Ceci est désactivé par défaut et ne s'exécute qu'après réussite du filtrage de groupe normal.

Le prompt système de l'agent inclut une introduction de groupe lors du premier tour d'une nouvelle session de groupe. Il rappelle au model de répondre comme un humain, d'éviter les tableaux Markdown, de minimiser les lignes vides et de suivre l'espacement de chat normal, et d'éviter de taper des séquences littérales `\n`. Les noms de groupe et les étiquettes des participants provenant du channel sont rendus en tant que métadonnées non fiables clôturées, et non en tant qu'instructions système en ligne.

## Spécificités d'iMessage

- Privilégiez `chat_id:<id>` lors du routage ou de la création de listes d'autorisation.
- Lister les chats : `imsg chats --limit 20`.
- Les réponses de groupe reviennent toujours au même `chat_id`.

## Invites système WhatsApp

Voir [WhatsApp](/fr/channels/whatsapp#system-prompts) pour les règles officielles des invites système WhatsApp, incluant la résolution des invites de groupe et directes, le comportement des caractères génériques et la sémantique de remplacement du compte.

## Spécificités de WhatsApp

Voir [Group messages](/fr/channels/group-messages) pour les comportements propres à WhatsApp (injection de l'historique, détails de la gestion des mentions).

## Connexes

- [Broadcast groups](/fr/channels/broadcast-groups)
- [Channel routing](/fr/channels/channel-routing)
- [Group messages](/fr/channels/group-messages)
- [Pairing](/fr/channels/pairing)
