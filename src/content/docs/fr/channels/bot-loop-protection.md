---
summary: "Valeurs par défaut et substitutions par channel pour la protection de boucle bot-à-bot"
read_when:
  - Configuring bot-authored channel messages
  - Tuning bot-to-bot loop protection
title: "Protection de boucle bot"
sidebarTitle: "Protection de boucle bot"
---

# Protection de boucle bot

OpenClaw peut accepter des messages écrits par d'autres bots sur des channels qui prennent en charge `allowBots`.
Lorsque ce chemin est activé, la protection de boucle par paire empêche deux identités de bot de
se répondre indéfiniment.

Le garde est appliqué par le moteur de réponses entrant du noyau. Chaque channel pris en charge mappe son propre événement entrant en faits génériques : compte ou portée, identifiant de conversation, identifiant du bot émetteur et identifiant du bot récepteur. Le noyau suit ensuite la paire de participants dans les deux sens, applique un budget à fenêtre glissante et supprime la paire pendant une période de refroidissement une fois le budget dépassé.

## Valeurs par défaut

La protection de boucle par paire est active lorsqu'un channel laisse les messages écrits par des bots atteindre
la répartition (dispatch). Les valeurs par défaut intégrées sont :

- `maxEventsPerWindow: 20` - une paire de bots peut échanger 20 événements dans la fenêtre
- `windowSeconds: 60` - longueur de la fenêtre glissante
- `cooldownSeconds: 60` - temps de suppression après que la paire a dépassé le budget

Le garde-fou n'affecte pas les messages normaux écrits par des humains, les déploiements à bot unique,
le filtrage des auto-messages, ou les réponses ponctuelles de bots qui restent sous le budget.

## Configurer les valeurs par défaut partagées

Définissez `channels.defaults.botLoopProtection` une fois pour donner à chaque channel prenant en charge
la même base de référence. Les substitutions par channel et compte peuvent toujours ajuster les
surfaces individuelles.

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
  },
}
```

Définissez `enabled: false` uniquement lorsque votre stratégie de channel autorise intentionnellement
les conversations bot-à-bot sans suppression automatique.

## Substituer par channel ou par compte

Les channels prenant en charge superposent leur propre configuration aux valeurs par défaut partagées. La priorité est :

- `channels.<channel>.<room-or-space>.botLoopProtection`, lorsque le channel prend en charge les substitutions par conversation
- `channels.<channel>.accounts.<account>.botLoopProtection`, lorsque le channel prend en charge les comptes
- `channels.<channel>.botLoopProtection`, lorsque le channel prend en charge les valeurs par défaut de niveau supérieur
- `channels.defaults.botLoopProtection`
- valeurs par défaut intégrées

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
      },
    },
    discord: {
      botLoopProtection: {
        maxEventsPerWindow: 8,
      },
      accounts: {
        molty: {
          allowBots: "mentions",
          botLoopProtection: {
            maxEventsPerWindow: 5,
            cooldownSeconds: 90,
          },
        },
      },
    },
    slack: {
      allowBots: "mentions",
      botLoopProtection: {
        maxEventsPerWindow: 8,
      },
    },
    matrix: {
      allowBots: "mentions",
      groups: {
        "!roomid:example.org": {
          botLoopProtection: {
            maxEventsPerWindow: 5,
          },
        },
      },
    },
    googlechat: {
      allowBots: true,
      groups: {
        "spaces/AAAA": {
          botLoopProtection: {
            maxEventsPerWindow: 5,
          },
        },
      },
    },
  },
}
```

## Prise en charge du channel

- Discord : faits Discord`author.bot`Discord natifs, indexés par compte Discord, channel et paire de bots.
- Slack : faits Slack`bot_id`Slack natifs pour les messages acceptés rédigés par des bots, indexés par compte Slack, channel et paire de bots.
- Matrix : comptes de bot Matrix configurés, indexés par compte Matrix, salle et paire de bots configurée.
- Google Chat : faits Google Chat`sender.type=BOT` natifs pour les messages acceptés rédigés par des bots, indexés par compte, espace et paire de bots.

Les channels qui n'exposent pas d'identité de bot entrante fiable continuent d'utiliser
leurs filtres normaux de auto-message et de politique d'accès. Ils ne devraient pas activer cette
protection tant qu'ils ne peuvent pas identifier les deux participants de la paire de bots.

Voir [SDK runtime](/fr/plugins/sdk-runtime#reusable-runtime-utilities) pour les détails
d'implémentation du plugin.
