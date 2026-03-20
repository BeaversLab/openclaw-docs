---
title: IRC
description: Connecter OpenClaw aux canaux IRC et aux messages privés.
summary: "Configuration du plugin IRC, contrôles d'accès et troubleshooting"
read_when:
  - Vous souhaitez connecter OpenClaw aux canaux IRC ou aux DMs
  - Vous configurez les allowlists IRC, les stratégies de groupe ou le filtrage par mention
---

Utilisez IRC lorsque vous voulez OpenClaw dans des canaux classiques (`#room`) et des messages privés.
IRC est fourni en tant que plugin d'extension, mais il est configuré dans la configuration principale sous `channels.irc`.

## Quick start

1. Activez la configuration IRC dans `~/.openclaw/openclaw.json`.
2. Définissez au moins :

```json
{
  "channels": {
    "irc": {
      "enabled": true,
      "host": "irc.libera.chat",
      "port": 6697,
      "tls": true,
      "nick": "openclaw-bot",
      "channels": ["#openclaw"]
    }
  }
}
```

3. Démarrez/redémarrez la passerelle :

```bash
openclaw gateway run
```

## Security defaults

- `channels.irc.dmPolicy` est `"pairing"` par défaut.
- `channels.irc.groupPolicy` est `"allowlist"` par défaut.
- Avec `groupPolicy="allowlist"`, définissez `channels.irc.groups` pour définir les canaux autorisés.
- Utilisez TLS (`channels.irc.tls=true`) sauf si vous acceptez intentionnellement le transport en texte brut.

## Access control

Il existe deux « barrières » distinctes pour les canaux IRC :

1. **Accès au channel** (`groupPolicy` + `groups`) : si le bot accepte les messages d'un channel.
2. **Accès de l'expéditeur** (`groupAllowFrom` / `groups["#channel"].allowFrom` par channel) : qui est autorisé à déclencher le bot dans ce channel.

Clés de configuration :

- Allowlist des DMs (accès de l'expéditeur DM) : `channels.irc.allowFrom`
- Allowlist des expéditeurs de groupe (accès de l'expéditeur du channel) : `channels.irc.groupAllowFrom`
- Contrôles par channel (channel + expéditeur + règles de mention) : `channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` permet les canaux non configurés (**toujours filtrés par mention par défaut**)

Les entrées de l'allowlist doivent utiliser des identités d'expéditeur stables (`nick!user@host`).
La correspondance par pseudonyme brut est modifiable et uniquement activée lorsque `channels.irc.dangerouslyAllowNameMatching: true`.

### Piège courant : `allowFrom` est pour les DMs, pas pour les channels

Si vous voyez des journaux comme :

- `irc: drop group sender alice!ident@host (policy=allowlist)`

…cela signifie que l'expéditeur n'était pas autorisé pour les messages de **groupe/canal**. Corrigez cela en :

- définir `channels.irc.groupAllowFrom` (global pour tous les channels), ou
- définir des allowlists d'expéditeurs par channel : `channels.irc.groups["#channel"].allowFrom`

Exemple (permettre à n'importe qui dans `#tuirc-dev` de parler au bot) :

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": { allowFrom: ["*"] },
      },
    },
  },
}
```

## Déclenchement de réponse (mentions)

Même si un channel est autorisé (via `groupPolicy` + `groups`) et l'expéditeur est autorisé, OpenClaw utilise par défaut le filtrage par mention (**mention-gating**) dans les contextes de groupe.

Cela signifie que vous pouvez voir des journaux comme `drop channel … (missing-mention)` à moins que le message n'inclue un modèle de mention correspondant au bot.

Pour faire répondre le bot dans un channel IRC **sans avoir besoin d'une mention**, désactivez le filtrage par mention pour ce channel :

```json5
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": {
          requireMention: false,
          allowFrom: ["*"],
        },
      },
    },
  },
}
```

Ou pour autoriser **tous** les channels IRC (pas de liste d'autorisation par channel) et répondre tout de même sans mentions :

```json5
{
  channels: {
    irc: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: false, allowFrom: ["*"] },
      },
    },
  },
}
```

## Note de sécurité (recommandé pour les channels publics)

Si vous autorisez `allowFrom: ["*"]` dans un channel public, n'importe qui peut inviter le bot.
Pour réduire les risques, restreignez les outils pour ce channel.

### Mêmes outils pour tout le monde dans le channel

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          tools: {
            deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
          },
        },
      },
    },
  },
}
```

### Outils différents par expéditeur (le propriétaire obtient plus de pouvoirs)

Utilisez `toolsBySender` pour appliquer une politique plus stricte à `"*"` et une plus souple à votre pseudo :

```json5
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          toolsBySender: {
            "*": {
              deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
            },
            "id:eigen": {
              deny: ["gateway", "nodes", "cron"],
            },
          },
        },
      },
    },
  },
}
```

Notes :

- Les clés `toolsBySender` doivent utiliser `id:` pour les valeurs d'identité d'expéditeur IRC :
  `id:eigen` ou `id:eigen!~eigen@174.127.248.171` pour une correspondance plus forte.
- Les clés héritées sans préfixe sont toujours acceptées et correspondues uniquement comme `id:`.
- La première stratégie d'expéditeur correspondante l'emporte ; `"*"` est le fallback générique (wildcard).

Pour plus d'informations sur l'accès aux groupes par rapport au filtrage par mention (et sur leur interaction), voir : [/channels/groups](/fr/channels/groups).

## NickServ

Pour s'identifier avec NickServ après la connexion :

```json
{
  "channels": {
    "irc": {
      "nickserv": {
        "enabled": true,
        "service": "NickServ",
        "password": "your-nickserv-password"
      }
    }
  }
}
```

Enregistrement unique facultatif à la connexion :

```json
{
  "channels": {
    "irc": {
      "nickserv": {
        "register": true,
        "registerEmail": "bot@example.com"
      }
    }
  }
}
```

Désactivez `register` une fois le pseudo enregistré pour éviter les tentatives répétées de REGISTER.

## Variables d'environnement

Le compte par défaut prend en charge :

- `IRC_HOST`
- `IRC_PORT`
- `IRC_TLS`
- `IRC_NICK`
- `IRC_USERNAME`
- `IRC_REALNAME`
- `IRC_PASSWORD`
- `IRC_CHANNELS` (séparés par des virgules)
- `IRC_NICKSERV_PASSWORD`
- `IRC_NICKSERV_REGISTER_EMAIL`

## Dépannage

- Si le bot se connecte mais ne répond jamais dans les channels, vérifiez `channels.irc.groups` **et** si le filtrage par mention supprime des messages (`missing-mention`). Si vous voulez qu'il réponde sans mentions, définissez `requireMention:false` pour le channel.
- Si la connexion échoue, vérifiez la disponibilité du pseudo et le mot de passe du serveur.
- Si TLS échoue sur un réseau personnalisé, vérifiez l'hôte/le port et la configuration du certificat.

import fr from "/components/footer/fr.mdx";

<fr />
