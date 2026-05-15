---
summary: "Listes d'autorisation d'expéditeurs réutilisables pour les channels de messages"
read_when:
  - Configuring the same allowlist across multiple message channels
  - Sharing DM and group sender access rules
  - Reviewing message-channel access control
title: "Groupes d'accès"
---

Les groupes d'accès sont des listes d'expéditeurs nommées que vous définissez une seule fois et que vous référencez depuis les listes d'autorisation de channel avec `accessGroup:<name>`.

Utilisez-les lorsque les mêmes personnes doivent être autorisées sur plusieurs channels de messages, ou lorsqu'un ensemble de confiance doit s'appliquer à la fois aux DMs et à l'autorisation des expéditeurs de groupe.

Les groupes d'accès n'accordent pas d'accès par eux-mêmes. Un groupe n'a d'importance que lorsqu'un champ de liste d'autorisation le référence.

## Groupes d'expéditeurs de messages statiques

Les groupes d'expéditeurs statiques utilisent `type: "message.senders"`.

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
}
```

Les listes de membres sont indexées par l'id du channel de message :

| Clé        | Signification                                                                         |
| ---------- | ------------------------------------------------------------------------------------- |
| `"*"`      | Entrées partagées vérifiées pour chaque channel de message qui référence le groupe.   |
| `discord`  | Entrées vérifiées uniquement pour la correspondance de liste d'autorisation Discord.  |
| `telegram` | Entrées vérifiées uniquement pour la correspondance de liste d'autorisation Telegram. |
| `whatsapp` | Entrées vérifiées uniquement pour la correspondance de liste d'autorisation WhatsApp. |

Les entrées sont mises en correspondance avec les règles normales `allowFrom` du channel de destination. OpenClaw ne traduit pas les identifiants d'expéditeur entre les channels. Si Alice a un id Telegram et un id Discord, listez les deux identifiants sous les clés appropriées.

## Référencer des groupes depuis des listes d'autorisation

Référencez un groupe avec `accessGroup:<name>` partout où le chemin du channel de message prend en charge les listes d'autorisation d'expéditeurs.

Exemple de liste d'autorisation DM :

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
    telegram: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

Exemple de liste d'autorisation d'expéditeur de groupe :

```json5
{
  accessGroups: {
    oncall: {
      type: "message.senders",
      members: {
        whatsapp: ["+15551234567"],
        googlechat: ["users/1234567890"],
      },
    },
  },
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["accessGroup:oncall"],
    },
    googlechat: {
      spaces: {
        "spaces/AAA": {
          users: ["accessGroup:oncall"],
        },
      },
    },
  },
}
```

Vous pouvez mélanger des groupes et des entrées directes :

```json5
{
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators", "discord:123456789012345678"],
    },
  },
}
```

## Chemins de channel de message pris en charge

Les groupes d'accès sont disponibles dans les chemins d'autorisation de channel de message partagés, notamment :

- listes d'autorisation d'expéditeurs DM telles que `channels.<channel>.allowFrom`
- listes d'autorisation d'expéditeurs de groupe telles que `channels.<channel>.groupAllowFrom`
- listes d'autorisation d'expéditeurs par salon spécifiques au channel qui utilisent les mêmes règles de correspondance d'expéditeur
- chemins d'autorisation de commande qui réutilisent les listes d'autorisation d'expéditeurs de channel de message

La prise en charge des canaux dépend de si ce canal est connecté via les assistants d'autorisation d'envoi partagés OpenClaw. La prise en charge groupée actuelle inclut Discord, Feishu, Google Chat, iMessage, LINE, Mattermost, Microsoft Teams, Nextcloud Talk, Nostr, QQBot, Signal, WhatsApp, Zalo et Zalo Personal. Les groupes `message.senders` statiques sont conçus pour être agnostiques au canal, de sorte que les nouveaux canaux de messagerie devraient les prendre en charge en utilisant les assistants SDK du plugin partagé au lieu d'une expansion de liste d'autorisation personnalisée.

## Diagnostics du plugin

Les auteurs de plugins peuvent inspecter l'état structuré du groupe d'accès sans le réétendre en une liste d'autorisation plate :

```typescript
import { resolveAccessGroupAllowFromState } from "openclaw/plugin-sdk/security-runtime";

const state = await resolveAccessGroupAllowFromState({
  accessGroups: cfg.accessGroups,
  allowFrom: channelConfig.allowFrom,
  channel: "my-channel",
  accountId: "default",
  senderId,
  isSenderAllowed,
});
```

Le résultat signale les groupes référencés, correspondants, manquants, non pris en charge et ayant échoué. Utilisez ceci lorsque vous avez besoin de diagnostics ou de tests de conformité. Utilisez `expandAllowFromWithAccessGroups(...)` uniquement pour les chemins de compatibilité qui attendent encore un tableau `allowFrom` plat.

## Audiences de canal Discord

Discord prend également en charge un type de groupe d'accès dynamique :

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

`discord.channelAudience` signifie "autoriser les expéditeurs de DM Discord qui peuvent actuellement visualiser ce canal de guilde." OpenClaw résout l'expéditeur via Discord au moment de l'autorisation et applique les règles de permission `ViewChannel` de Discord.

Utilisez ceci lorsqu'un canal Discord est déjà la source de vérité pour une équipe, telle que `#maintainers` ou `#on-call`.

Exigences et comportement en cas d'échec :

- Le bot a besoin d'un accès à la guilde et au canal.
- Le bot a besoin de l'**intention des membres du serveur** (Server Members Intent) du portail des développeurs Discord.
- Le groupe d'accès échoue en mode fermé lorsque Discord renvoie `Missing Access`, que l'expéditeur ne peut pas être résolu en tant que membre de la guilde, ou que le canal appartient à une autre guilde.

Plus d'exemples spécifiques à Discord : [contrôle d'accès Discord](/fr/channels/discord#access-control-and-routing)

## Notes de sécurité

- Les groupes d'accès sont des alias de liste d'autorisation (allowlist), et non des rôles. Ils ne créent pas de propriétaires, n'approuvent pas les demandes d'appariement et n'accordent pas d'autorisations d'outil par eux-mêmes.
- `dmPolicy: "open"` nécessite toujours `"*"` dans la liste d'autorisation DM effective. Référencer un groupe d'accès n'équivaut pas à un accès public.
- Les noms de groupe manquants entraînent un échec sécurisé (fail closed). Si `allowFrom` contient `accessGroup:operators` et que `accessGroups.operators` est absent, cette entrée n'autorise personne.
- Gardez les identifiants de canal stables. Préférez les identifiants numériques/utilisateur aux noms d'affichage lorsque le canal prend en charge les deux.

## Dépannage

Si un expéditeur devrait correspondre mais est bloqué :

1. Confirmez que le champ de la liste d'autorisation contient la référence exacte `accessGroup:<name>`.
2. Confirmez que `accessGroups.<name>.type` est correct.
3. Confirmez que l'identifiant de l'expéditeur est répertorié sous la clé de canal correspondante, ou sous `"*"`.
4. Confirmez que l'entrée utilise la syntaxe normale de la liste d'autorisation de ce canal.
5. Pour les audiences de canal Discord, confirmez que le bot peut voir le canal de guilde (guild channel) et que l'intention des membres du serveur (Server Members Intent) est activée.

Exécutez `openclaw doctor` après avoir modifié la configuration du contrôle d'accès. Cela permet de détecter de nombreuses combinaisons invalides de listes d'autorisation et de stratégies avant l'exécution.
