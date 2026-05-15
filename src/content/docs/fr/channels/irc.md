---
summary: "Configuration du plugin IRC, contrôles d'accès et dépannage"
title: IRC
read_when:
  - You want to connect OpenClaw to IRC channels or DMs
  - You are configuring IRC allowlists, group policy, or mention gating
---

Utilisez IRC lorsque vous voulez OpenClaw dans les channels classiques (`#room`) et les messages directs.
IRC est fourni comme plugin intégré, mais il est configuré dans la configuration principale sous `channels.irc`.

## Quick start

1. Activez la configuration IRC dans `~/.openclaw/openclaw.json`.
2. Définissez au moins :

```json5
{
  channels: {
    irc: {
      enabled: true,
      host: "irc.example.com",
      port: 6697,
      tls: true,
      nick: "openclaw-bot",
      channels: ["#openclaw"],
    },
  },
}
```

Préférez un serveur IRC privé pour la coordination des bots. Si vous utilisez intentionnellement un réseau IRC public, les choix courants incluent Libera.Chat, OFTC et Snoonet. Évitez les channels publics prévisibles pour le trafic de bot ou de canal arrière (swarm backchannel).

3. Démarrer/redémarrer la passerelle :

```bash
openclaw gateway run
```

## Security defaults

- IRC utilise des sockets TCP/TLS bruts en dehors du routage du proxy de géré par l'opérateur d'OpenClaw. Dans les déploiements qui nécessitent que tout le trafic sortant passe par ce proxy de, définissez OpenClaw`channels.irc.enabled=false` à moins que la sortie IRC directe ne soit explicitement approuvée.
- `channels.irc.dmPolicy` est par défaut `"pairing"`.
- `channels.irc.groupPolicy` est par défaut `"allowlist"`.
- Avec `groupPolicy="allowlist"`, définissez `channels.irc.groups` pour spécifier les channels autorisés.
- Utilisez TLS (`channels.irc.tls=true`) sauf si vous acceptez intentionnellement le transport en texte clair.

## Contrôle d'accès

Il existe deux « portes » distinctes pour les channels IRC :

1. **Accès au channel** (`groupPolicy` + `groups`) : si le bot accepte ou non les messages d'un channel.
2. **Accès de l'expéditeur** (`groupAllowFrom` / `groups["#channel"].allowFrom` par channel) : qui est autorisé à déclencher le bot dans ce channel.

Clés de configuration :

- Liste d'autorisation DM (accès de l'expéditeur DM) : `channels.irc.allowFrom`
- Liste d'autorisation des expéditeurs de groupe (accès de l'expéditeur de channel) : `channels.irc.groupAllowFrom`
- Contrôles par channel (channel + expéditeur + règles de mention) : `channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` autorise les channels non configurés (**toujours limité par mention par défaut**)

Les entrées de la liste d'autorisation doivent utiliser des identités d'expéditeur stables (`nick!user@host`).
La correspondance de pseudo simple est modifiable et n'est activée que lorsque `channels.irc.dangerouslyAllowNameMatching: true`.

### Piège courant : `allowFrom` est pour les DMs, pas pour les channels

Si vous voyez des journaux comme :

- `irc: drop group sender alice!ident@host (policy=allowlist)`

...cela signifie que l'expéditeur n'était pas autorisé pour les messages de **groupe/channel**. Corrigez cela soit par :

- le paramétrage de `channels.irc.groupAllowFrom` (global pour tous les channels), ou
- le paramétrage de listes d'autorisation d'expéditeurs par channel : `channels.irc.groups["#channel"].allowFrom`

Exemple (autoriser n'importe qui dans `#tuirc-dev` à parler au bot) :

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

Même si un channel est autorisé (via `groupPolicy` + `groups`OpenClaw) et que l'expéditeur est autorisé, OpenClaw utilise par défaut le **mention-gating** dans les contextes de groupe.

Cela signifie que vous pouvez voir des journaux comme `drop channel … (missing-mention)` sauf si le message inclut un motif de mention qui correspond au bot.

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

Ou pour autoriser **tous** les channels IRC (pas de liste d'autorisation par channel) et répondre toujours sans mentions :

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

### Mêmes outils pour tous dans le channel

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

### Outils différents par expéditeur (le propriétaire a plus de pouvoir)

Utilisez `toolsBySender` pour appliquer une politique plus stricte à `"*"` et une politique plus souple à votre pseudo :

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

- Les clés `toolsBySender` doivent utiliser `id:` pour les valeurs d'identité de l'expéditeur IRC :
  `id:eigen` ou `id:eigen!~eigen@174.127.248.171` pour une correspondance plus forte.
- Les anciennes clés sans préfixe sont toujours acceptées et correspondent uniquement en tant que `id:`.
- La première stratégie d'expéditeur correspondante l'emporte ; `"*"` est le fallback de remplacement (wildcard).

Pour plus d'informations sur l'accès par groupe par opposition au filtrage par mention (et sur leur interaction), consultez : [/channels/groups](/fr/channels/groups).

## NickServ

Pour s'identifier avec NickServ après la connexion :

```json5
{
  channels: {
    irc: {
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "your-nickserv-password",
      },
    },
  },
}
```

Enregistrement ponctuel optionnel à la connexion :

```json5
{
  channels: {
    irc: {
      nickserv: {
        register: true,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

Désactivez `register` après l'enregistrement du pseudo pour éviter des tentatives répétées de REGISTER.

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

`IRC_HOST` ne peut pas être défini depuis un `.env` d'espace de travail ; voir [Fichiers `.env` d'espace de travail](/fr/gateway/security).

## Dépannage

- Si le bot se connecte mais ne répond jamais dans les channels, vérifiez `channels.irc.groups` **et** si le filtrage par mention supprime des messages (`missing-mention`). Si vous souhaitez qu'il réponde sans pings, définissez `requireMention:false` pour le channel.
- Si la connexion échoue, vérifiez la disponibilité du pseudo et le mot de passe du serveur.
- Si TLS échoue sur un réseau personnalisé, vérifiez l'hôte/le port et la configuration du certificat.

## Connexes

- [Vue d'ensemble des channels](/fr/channels) — tous les channels pris en charge
- [Jumelage](/fr/channels/pairing) — authentification par DM et flux de jumelage
- [Groupes](/fr/channels/groups) — comportement de chat de groupe et filtrage par mention
- [Routage de channel](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
