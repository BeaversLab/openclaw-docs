---
summary: "Laissez les salles de groupe prises en charge fournir un contexte silencieux, sauf si l'agent envoie avec l'outil message"
read_when:
  - Configuring always-on group or channel rooms
  - You want the agent to watch room chatter without posting final text automatically
  - Debugging typing and token usage with no visible room message
title: "Événements ambiants de salle"
sidebarTitle: "Événements ambiants de salle"
---

Les événements ambiants de salle permettent à OpenClaw de traiter les discussions de groupe ou de canal non mentionnées comme un contexte silencieux. L'agent peut mettre à jour la mémoire et l'état de la session, mais la salle reste silencieuse à moins que l'agent n'appelle explicitement l'outil OpenClaw`message`.

Pour les discussions de groupe toujours actives, c'est le mode recommandé : combinez `messages.groupChat.unmentionedInbound: "room_event"` avec `messages.groupChat.visibleReplies: "message_tool"`. Utilisez-le lorsque l'agent doit écouter, décider quand une réponse est utile et éviter l'ancien modèle d'invite consistant à répondre à `NO_REPLY`.

Pris en charge aujourd'hui : les canaux de guilde Discord, les canaux et canaux privés Slack, les DM multipersonnes Slack, et les groupes ou supergroupes Telegram. Les autres canaux de groupe conservent leur comportement de groupe existant, sauf si leur page de canal indique qu'ils prennent en charge les événements ambiants de salle.

## Configuration recommandée

Définissez le comportement global des discussions de groupe :

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
}
```

Ensuite, configurez la salle elle-même comme toujours active en désactivant le filtrage par mention pour cette salle. Le canal doit toujours être autorisé par son `groupPolicy` normal, sa liste d'autorisation de salle et sa liste d'autorisation d'expéditeur.

Après avoir enregistré la configuration, la Gateway recharge à chaud les paramètres Gateway`messages`. Redémarrez uniquement lorsque la surveillance des fichiers ou le rechargement de la configuration est désactivé.

## Ce qui change

Avec `messages.groupChat.unmentionedInbound: "room_event"` :

- les messages autorisés de groupe ou de canal non mentionnés deviennent des événements silencieux de salle
- les messages mentionnés restent des demandes des utilisateurs
- les commandes textuelles et les commandes natives restent des demandes des utilisateurs
- les demandes d'abandon ou d'arrêt restent des demandes des utilisateurs
- les messages directs restent des demandes des utilisateurs

Les événements de salle utilisent une livraison visible stricte. Le texte final de l'assistant est privé. L'agent doit appeler `message(action=send)` pour publier dans la salle.

## Exemple Discord

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "<DISCORD_SERVER_ID>": {
          requireMention: false,
          users: ["<YOUR_DISCORD_USER_ID>"],
        },
      },
    },
  },
}
```

Utilisez la configuration Discord par canal lorsqu'un seul canal doit être ambiant :

```json5
{
  channels: {
    discord: {
      guilds: {
        "<DISCORD_SERVER_ID>": {
          channels: {
            "<DISCORD_CHANNEL_ID_OR_NAME>": {
              allow: true,
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

## Exemple Slack

Les listes d'autorisation de canaux Slack sont basées sur l'ID en premier. Utilisez des ID de canal tels que `C12345678`, et non `#channel-name`.

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    slack: {
      groupPolicy: "allowlist",
      channels: {
        "<SLACK_CHANNEL_ID>": {
          allow: true,
          requireMention: false,
        },
      },
    },
  },
}
```

## Exemple Telegram

Pour les groupes Telegram, le bot doit être capable de voir les messages de groupe normaux. Si `requireMention: false`, désactivez le mode de confidentialité de BotFather ou utilisez une autre configuration Telegram qui envoie tout le trafic de groupe au bot.

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    telegram: {
      groups: {
        "<TELEGRAM_GROUP_CHAT_ID>": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

Les ID de groupe Telegram sont généralement des nombres négatifs tels que `-1001234567890`. Lisez `chat.id` à partir de `openclaw logs --follow`, transférez un message de groupe à un bot d'aide ID, ou inspectez `getUpdates` de Bot API.

## Stratégie spécifique à l'agent

Utilisez une substitution d'agent lorsque plusieurs agents partagent la même salle, mais qu'un seul doit traiter les bavardages non mentionnés comme contexte ambiant :

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          unmentionedInbound: "room_event",
          mentionPatterns: ["@openclaw", "openclaw"],
        },
      },
    ],
  },
}
```

La valeur `agents.list[].groupChat.unmentionedInbound` spécifique à l'agent remplace `messages.groupChat.unmentionedInbound` pour cet agent.

## Modes de réponse visibles

`messages.groupChat.visibleReplies: "message_tool"` est la valeur par défaut recommandée pour les groupes et les canaux. Elle permet à l'agent de décider quand parler en appelant l'outil de message. Si le modèle renvoie du texte final sans appeler l'outil, OpenClaw garde ce texte final privé et enregistre les métadonnées de livraison supprimées.

Utilisez `messages.groupChat.visibleReplies: "automatic"` uniquement lorsque vous souhaitez un comportement hérité où les requêtes de groupe normales publient automatiquement le texte final de l'assistant.

Les événements de salle restent stricts même lorsque d'autres requêtes de groupe utilisent des réponses automatiques. Les événements de salle ambiants non mentionnés nécessitent toujours `message(action=send)` pour une sortie visible.

## Historique

`messages.groupChat.historyLimit` contrôle la valeur par défaut de l'historique des groupes globaux. Les canaux peuvent la remplacer avec `channels.<channel>.historyLimit`, et certains canaux prennent également en charge les limites d'historique par compte.

Définissez `historyLimit: 0` pour désactiver le contexte de l'historique des groupes.

Les canaux d'événements de salle pris en charge conservent les messages ambiants récents de la salle comme contexte. Discord conserve l'historique des événements de salle jusqu'à ce qu'un envoi Discord visible réussisse, afin que le contexte silencieux ne soit pas perdu avant la livraison par l'outil de message.

## Dépannage

Si la salle affiche une frappe ou une utilisation de jetons mais aucun message visible :

1. Confirmez que la salle est autorisée par la liste d'autorisation des canaux et la liste d'autorisation des expéditeurs.
2. Confirmez que `requireMention: false` est défini au niveau de salle que vous attendez.
3. Vérifiez si `messages.groupChat.unmentionedInbound` ou la priorité de l'agent est `"room_event"`.
4. Inspectez les journaux pour les métadonnées de charge utile finale supprimées ou `didSendViaMessagingTool: false`.
5. Utilisez un modèle/runtime qui appelle de manière fiable les outils, ou définissez `messages.groupChat.visibleReplies: "automatic"` pour les réponses finales héritées sur les demandes de groupe normales.

Si les salles ambiantes Telegram ne se déclenchent pas du tout, vérifiez le mode de confidentialité de BotFather et vérifiez que le Gateway reçoit les messages de groupe normaux.

Si les salles ambiantes Slack ne se déclenchent pas, vérifiez que la clé du canal est l'ID du canal Slack et que l'application dispose de la portée `channels:history` ou `groups:history` requise pour ce type de salle.

## Connexes

- [Groupes](/fr/channels/groups)
- [Discord](/fr/channels/discord)
- [Slack](/fr/channels/slack)
- [Telegram](/fr/channels/telegram)
- [Dépannage des canaux](/fr/channels/troubleshooting)
- [Référence de configuration des canaux](/fr/gateway/config-channels)
