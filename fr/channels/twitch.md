---
summary: "Configuration et configuration du bot de chat Twitch"
read_when:
  - Configuration de l'intégration du chat Twitch pour OpenClaw
title: "Twitch"
---

# Twitch (plugin)

Prise en charge du chat Twitch via une connexion IRC. OpenClaw se connecte en tant qu'utilisateur Twitch (compte bot) pour recevoir et envoyer des messages dans les channels.

## Plugin requis

Twitch est fourni en tant que plugin et n'est pas inclus avec l'installation de base.

Installer via CLI (registre npm) :

```bash
openclaw plugins install @openclaw/twitch
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./extensions/twitch
```

Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide (débutant)

1. Créez un compte Twitch dédié pour le bot (ou utilisez un compte existant).
2. Générer les identifiants : [Twitch Token Generator](https://twitchtokengenerator.com/)
   - Sélectionnez **Bot Token**
   - Vérifier que les portées `chat:read` et `chat:write` sont sélectionnées
   - Copiez le **Client ID** et le **Access Token**
3. Trouvez votre identifiant utilisateur Twitch : [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)
4. Configurez le token :
   - Env : `OPENCLAW_TWITCH_ACCESS_TOKEN=...` (compte par défaut uniquement)
   - Ou config : `channels.twitch.accessToken`
   - Si les deux sont définis, la configuration prend le pas (le repli env concerne uniquement le compte par défaut).
5. Démarrez le Gateway.

**⚠️ Important :** Ajoutez un contrôle d'accès (`allowFrom` ou `allowedRoles`) pour empêcher les utilisateurs non autorisés de déclencher le bot. `requireMention` est par défaut `true`.

Configuration minimale :

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw", // Bot's Twitch account
      accessToken: "oauth:abc123...", // OAuth Access Token (or use OPENCLAW_TWITCH_ACCESS_TOKEN env var)
      clientId: "xyz789...", // Client ID from Token Generator
      channel: "vevisk", // Which Twitch channel's chat to join (required)
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only - get it from https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
    },
  },
}
```

## Présentation

- Un channel Twitch appartenant au Gateway.
- Routage déterministe : les réponses reviennent toujours sur Twitch.
- Chaque compte correspond à une clé de session isolée `agent:<agentId>:twitch:<accountName>`.
- `username` est le compte du bot (qui s'authentifie), `channel` est le salon de chat à rejoindre.

## Configuration (détaillée)

### Générer les identifiants

Utiliser [Twitch Token Generator](https://twitchtokengenerator.com/) :

- Sélectionnez **Bot Token**
- Vérifier que les portées `chat:read` et `chat:write` sont sélectionnées
- Copiez le **Client ID** et le **Access Token**

Aucune inscription manuelle d'application requise. Les jetons expirent après plusieurs heures.

### Configurer le bot

**Variable d'environnement (compte par défaut uniquement) :**

```bash
OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
```

**Ou config :**

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
    },
  },
}
```

Si la variable d'environnement et la configuration sont définies, la configuration prévaut.

### Contrôle d'accès (recommandé)

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}
```

Privilégiez `allowFrom` pour une liste d'autorisation stricte. Utilisez plutôt `allowedRoles` si vous souhaitez un accès basé sur les rôles.

**Rôles disponibles :** `"moderator"`, `"owner"`, `"vip"`, `"subscriber"`, `"all"`.

**Pourquoi les IDs utilisateur ?** Les noms d'utilisateur peuvent changer, ce qui permet l'usurpation d'identité. Les IDs utilisateur sont permanents.

Trouvez votre identifiant utilisateur Twitch : [https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/) (Convertissez votre nom d'utilisateur Twitch en ID)

## Actualisation du jeton (optionnelle)

Les jetons de [Twitch Token Generator](https://twitchtokengenerator.com/) ne peuvent pas être actualisés automatiquement - régénérez-les lorsqu'ils expirent.

Pour l'actualisation automatique du jeton, créez votre propre application Twitch sur [Twitch Developer Console](https://dev.twitch.tv/console) et ajoutez à la configuration :

```json5
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token",
    },
  },
}
```

Le bot actualise automatiquement les jetons avant leur expiration et enregistre les événements d'actualisation.

## Prise en charge multi-comptes

Utilisez `channels.twitch.accounts` avec des jetons par compte. Voir [`gateway/configuration`](/fr/gateway/configuration) pour le modèle partagé.

Exemple (un compte bot dans deux channels) :

```json5
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
        channel2: {
          username: "openclaw",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel",
        },
      },
    },
  },
}
```

**Note :** Chaque compte a besoin de son propre jeton (un jeton par channel).

## Contrôle d'accès

### Restrictions basées sur les rôles

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator", "vip"],
        },
      },
    },
  },
}
```

### Liste d'autorisation par ID utilisateur (la plus sécurisée)

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowFrom: ["123456789", "987654321"],
        },
      },
    },
  },
}
```

### Accès basé sur les rôles (alternative)

`allowFrom` est une liste d'autorisation stricte. Lorsqu'elle est définie, seuls ces identifiants utilisateur sont autorisés.
Si vous souhaitez un accès basé sur les rôles, laissez `allowFrom` non défini et configurez `allowedRoles` à la place :

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

### Désactiver la condition de @mention

Par défaut, `requireMention` est `true`. Pour désactiver et répondre à tous les messages :

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          requireMention: false,
        },
      },
    },
  },
}
```

## Dépannage

Tout d'abord, exécutez les commandes de diagnostic :

```bash
openclaw doctor
openclaw channels status --probe
```

### Le bot ne répond pas aux messages

**Vérifiez le contrôle d'accès :** Assurez-vous que votre ID utilisateur est dans `allowFrom`, ou supprimez temporairement
`allowFrom` et définissez `allowedRoles: ["all"]` pour tester.

**Vérifiez que le bot est dans le channel :** Le bot doit rejoindre le channel spécifié dans `channel`.

### Problèmes de jeton

**« Échec de la connexion » ou erreurs d'authentification :**

- Vérifiez que `accessToken` est la valeur du OAuth d'accès (commence généralement par le préfixe `oauth:`)
- Vérifiez que le jeton a les portées `chat:read` et `chat:write`
- Si vous utilisez l'actualisation du jeton, vérifiez que `clientSecret` et `refreshToken` sont définis

### L'actualisation du jeton ne fonctionne pas

**Vérifiez les journaux pour les événements d'actualisation :**

```
Using env token source for mybot
Access token refreshed for user 123456 (expires in 14400s)
```

Si vous voyez « token refresh disabled (no refresh token) » :

- Assurez-vous que `clientSecret` est fourni
- Assurez-vous que `refreshToken` est fourni

## Configuration

**Configuration du compte :**

- `username` - Nom d'utilisateur du bot
- `accessToken` - OAuth d'accès avec `chat:read` et `chat:write`
- `clientId` - Twitch Client ID (depuis le générateur de jeton ou votre application)
- `channel` - Channel à rejoindre (requis)
- `enabled` - Activer ce compte (par défaut : `true`)
- `clientSecret` - Optionnel : Pour l'actualisation automatique du jeton
- `refreshToken` - Optionnel : Pour l'actualisation automatique du jeton
- `expiresIn` - Expiration du jeton en secondes
- `obtainmentTimestamp` - Horodatage d'obtention du jeton
- `allowFrom` - Liste d'autorisation des ID utilisateur
- `allowedRoles` - Contrôle d'accès basé sur les rôles (`"moderator" | "owner" | "vip" | "subscriber" | "all"`)
- `requireMention` - Exiger @mention (par défaut : `true`)

**Options du fournisseur :**

- `channels.twitch.enabled` - Activer/désactiver le démarrage du channel
- `channels.twitch.username` - Nom d'utilisateur du bot (configuration simplifiée pour compte unique)
- `channels.twitch.accessToken` - OAuth d'accès (configuration simplifiée pour compte unique)
- `channels.twitch.clientId` - Twitch Client ID (configuration simplifiée pour compte unique)
- `channels.twitch.channel` - Channel à rejoindre (config simplifiée à compte unique)
- `channels.twitch.accounts.<accountName>` - Configuration multi-compte (tous les champs de compte ci-dessus)

Exemple complet :

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      allowedRoles: ["moderator", "vip"],
      accounts: {
        default: {
          username: "mybot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "your_channel",
          enabled: true,
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowFrom: ["123456789", "987654321"],
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

## Actions de l'outil

L'agent peut appeler `twitch` avec l'action :

- `send` - Envoyer un message à un channel

Exemple :

```json5
{
  action: "twitch",
  params: {
    message: "Hello Twitch!",
    to: "#mychannel",
  },
}
```

## Sécurité et opérations

- **Traitez les jetons comme des mots de passe** - Ne commettez jamais de jetons dans git
- **Utilisez l'actualisation automatique des jetons** pour les bots de longue durée
- **Utilisez les listes d'autorisation d'ID utilisateur** au lieu des noms d'utilisateur pour le contrôle d'accès
- **Surveillez les journaux** pour les événements d'actualisation des jetons et l'état de la connexion
- **Limiter la portée des jetons** - Ne demander que `chat:read` et `chat:write`
- **En cas de blocage** : Redémarrez la passerelle après avoir confirmé qu'aucun autre processus ne possède la session

## Limites

- **500 caractères** par message (découpé automatiquement aux limites des mots)
- Le Markdown est supprimé avant le découpage
- Aucune limitation de débit (utilise les limitations de débit intégrées de Twitch)

import en from "/components/footer/en.mdx";

<en />
