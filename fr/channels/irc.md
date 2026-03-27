---
title: IRC
summary: "Configuration du plugin IRC, contrôles d'accès et troubleshooting"
read_when:
  - You want to connect OpenClaw to IRC channels or DMs
  - You are configuring IRC allowlists, group policy, or mention gating
---

# IRC

Utilisez IRC lorsque vous voulez OpenClaw dans les canaux classiques (`#room`) et les messages directs.
IRC est fourni en tant que plugin d'extension, mais il est configuré dans la configuration principale sous `channels.irc`.

## Quick start

1. Activez la configuration IRC dans `~/.openclaw/openclaw.json`.
2. Définissez au moins :

```json5
{
  channels: {
    irc: {
      enabled: true,
      host: "irc.libera.chat",
      port: 6697,
      tls: true,
      nick: "openclaw-bot",
      channels: ["#openclaw"],
    },
  },
}
```

3. Démarrez/redémarrez la passerelle :

```bash
openclaw gateway run
```

## Security defaults

- `channels.irc.dmPolicy` est défini par défaut sur `"pairing"`.
- `channels.irc.groupPolicy` est défini par défaut sur `"allowlist"`.
- Avec `groupPolicy="allowlist"`, définissez `channels.irc.groups` pour spécifier les canaux autorisés.
- Utilisez TLS (`channels.irc.tls=true`) sauf si vous acceptez intentionnellement le transport en texte clair.

## Access control

Il existe deux « barrières » distinctes pour les canaux IRC :

1. **Accès au canal** (`groupPolicy` + `groups`) : si le bot accepte les messages d'un canal.
2. **Accès de l'expéditeur** (`groupAllowFrom` / `groups["#channel"].allowFrom` par canal) : qui est autorisé à déclencher le bot dans ce canal.

Clés de configuration :

- Liste d'autorisation DM (accès expéditeur DM) : `channels.irc.allowFrom`
- Liste d'autorisation des expéditeurs de groupe (accès expéditeur canal) : `channels.irc.groupAllowFrom`
- Contrôles par canal (canal + expéditeur + règles de mention) : `channels.irc.groups["#channel"]`
- `channels.irc.groupPolicy="open"` autorise les canaux non configurés (**toujours soumis aux mentions par défaut**)

Les entrées de la liste d'autorisation doivent utiliser des identités d'expéditeur stables (`nick!user@host`).
La correspondance simple de pseudo est modifiable et n'est activée que lorsque `channels.irc.dangerouslyAllowNameMatching: true`.

### Common gotcha: `allowFrom` is for DMs, not channels

Si vous voyez des journaux comme :

- `irc: drop group sender alice!ident@host (policy=allowlist)`

…cela signifie que l'expéditeur n'était pas autorisé pour les messages de **groupe/canal**. Corrigez cela en :

- le réglage de `channels.irc.groupAllowFrom` (global pour tous les channels), ou
- le réglage des listes d'autorisation d'expéditeur par channel : `channels.irc.groups["#channel"].allowFrom`

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

Même si un channel est autorisé (via `groupPolicy` + `groups`) et l'expéditeur est autorisé, OpenClaw utilise par défaut le **filtrage par mention** dans les contextes de groupe.

Cela signifie que vous pouvez voir des journaux comme `drop channel … (missing-mention)` à moins que le message n'inclue un motif de mention correspondant au bot.

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

Si vous autorisez `allowFrom: ["*"]` dans un channel public, n'importe qui peut interroger le bot.
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

- Les clés `toolsBySender` devraient utiliser `id:` pour les valeurs d'identité d'expéditeur IRC :
  `id:eigen` ou `id:eigen!~eigen@174.127.248.171` pour une correspondance plus forte.
- Les clés héritées sans préfixe sont toujours acceptées et mises en correspondance uniquement en tant que `id:`.
- La première politique d'expéditeur correspondante l'emporte ; `"*"` est le repli générique.

Pour plus d'informations sur l'accès aux groupes par rapport au filtrage par mention (et sur leur interaction), voir : [/channels/groups](/fr/channels/groups).

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

Enregistrement unique facultatif à la connexion :

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

Désactivez `register` après l'enregistrement du pseudo pour éviter les tentatives répétées de REGISTER.

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

- Si le bot se connecte mais ne répond jamais dans les channels, vérifiez `channels.irc.groups` **et** si le filtrage par mention supprime des messages (`missing-mention`). Si vous souhaitez qu'il réponde sans mentions, définissez `requireMention:false` pour le channel.
- Si la connexion échoue, vérifiez la disponibilité du pseudo et le mot de passe du serveur.
- Si TLS échoue sur un réseau personnalisé, vérifiez l'hôte/le port et la configuration du certificat.

import fr from "/components/footer/fr.mdx";

<fr />
