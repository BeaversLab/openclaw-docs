---
summary: "Configuration et configuration du bot de chat Twitch"
read_when:
  - Setting up Twitch chat integration for OpenClaw
title: "Twitch"
sidebarTitle: "Twitch"
---

Prise en charge du chat Twitch via une connexion IRC. OpenClaw se connecte en tant qu'utilisateur Twitch (compte bot) pour recevoir et envoyer des messages dans les channels.

## Plugin intégré

<Note>Twitch est fourni en tant que plugin intégré dans les versions actuelles d'OpenClaw, les builds empaquetés normaux n'ont donc pas besoin d'une installation séparée.</Note>

Si vous utilisez une version ancienne ou une installation personnalisée qui exclut Twitch, installez-le manuellement :

<Tabs>
  <Tab title="Registre npm">```bash openclaw plugins install @openclaw/twitch ```</Tab>
  <Tab title="Extraction locale">```bash openclaw plugins install ./path/to/local/twitch-plugin ```</Tab>
</Tabs>

Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide (débutant)

<Steps>
  <Step title="Vérifier que le plugin est disponible">
    Les versions packagées actuelles d'OpenClaw l'incluent déjà. Les installations plus anciennes ou personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
  </Step>
  <Step title="Créer un compte bot Twitch">
    Créez un compte Twitch dédié pour le bot (ou utilisez un compte existant).
  </Step>
  <Step title="Générer les identifiants">
    Utilisez [Twitch Token Generator](https://twitchtokengenerator.com/) :

    - Sélectionnez **Bot Token**
    - Vérifiez que les étendues `chat:read` et `chat:write` sont sélectionnées
    - Copiez l'**ID Client** et le **Jeton d'accès**

  </Step>
  <Step title="Trouver votre ID utilisateur Twitch">
    Utilisez [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) pour convertir un nom d'utilisateur en ID utilisateur Twitch.
  </Step>
  <Step title="Configure the token">
    - Env : `OPENCLAW_TWITCH_ACCESS_TOKEN=...` (compte par défaut uniquement)
    - Ou config : `channels.twitch.accessToken`

    Si les deux sont définis, la config prend la priorité (le repli sur env concerne uniquement le compte par défaut).

  </Step>
  <Step title="Start the gateway">
    Démarrez la passerelle avec le channel configuré.
  </Step>
</Steps>

<Warning>Ajoutez un contrôle d'accès (`allowFrom` ou `allowedRoles`) pour empêcher les utilisateurs non autorisés de déclencher le bot. `requireMention` est par défaut `true`.</Warning>

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

## Ce que c'est

- Un channel Twitch appartenant au Gateway.
- Routage déterministe : les réponses retournent toujours vers Twitch.
- Chaque compte correspond à une clé de session isolée `agent:<agentId>:twitch:<accountName>`.
- `username` est le compte du bot (qui s'authentifie), `channel` est le salon de chat à rejoindre.

## Configuration (détaillée)

### Générer les identifiants

Utilisez [Twitch Token Generator](https://twitchtokengenerator.com/) :

- Sélectionnez **Bot Token**
- Vérifiez que les portées `chat:read` et `chat:write` sont sélectionnées
- Copiez le **Client ID** et le **Access Token**

<Note>Aucune inscription manuelle d'application n'est nécessaire. Les jetons expirent après plusieurs heures.</Note>

### Configurer le bot

<Tabs>
  <Tab title="Variable d'environnement (compte par défaut uniquement)">
    ```bash
    OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
    ```
  </Tab>
  <Tab title="Configuration">
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
  </Tab>
</Tabs>

Si les variables d'environnement et la configuration sont définies, la configuration prévaut.

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

<Note>
**Pourquoi les ID utilisateur ?** Les noms d'utilisateur peuvent changer, ce qui permet l'usurpation d'identité. Les ID utilisateur sont permanents.

Trouvez votre ID utilisateur Twitch : [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) (Convertissez votre nom d'utilisateur Twitch en ID)

</Note>

## Actualisation du jeton (optionnel)

Les jetons de [Twitch Token Generator](https://twitchtokengenerator.com/) ne peuvent pas être actualisés automatiquement - régénérez-les une fois expirés.

Pour une actualisation automatique du jeton, créez votre propre application Twitch sur [Twitch Developer Console](https://dev.twitch.tv/console) et ajoutez-la à la configuration :

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

## Prise en charge multi-compte

Utilisez `channels.twitch.accounts` avec des jetons par compte. Voir [Configuration](/fr/gateway/configuration) pour le modèle partagé.

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

<Note>Chaque compte a besoin de son propre jeton (un jeton par channel).</Note>

## Contrôle d'accès

<Tabs>
  <Tab title="Liste d'autorisation par ID utilisateur (le plus sécurisé)">
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
  </Tab>
  <Tab title="Basé sur les rôles">
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

    `allowFrom` est une liste d'autorisation stricte. Lorsqu'il est défini, seuls ces ID utilisateur sont autorisés. Si vous souhaitez un accès basé sur les rôles, laissez `allowFrom` non défini et configurez `allowedRoles` à la place.

  </Tab>
  <Tab title="Désactiver l'exigence @mention">
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

  </Tab>
</Tabs>

## Dépannage

Premièrement, exécutez les commandes de diagnostic :

```bash
openclaw doctor
openclaw channels status --probe
```

<AccordionGroup>
  <Accordion title="Le bot ne répond pas aux messages">
    - **Vérifiez le contrôle d'accès :** Assurez-vous que votre ID utilisateur est dans `allowFrom`, ou supprimez temporairement `allowFrom` et définissez `allowedRoles: ["all"]` pour tester.
    - **Vérifiez que le bot est dans le channel :** Le bot doit rejoindre le channel spécifié dans `channel`.
  </Accordion>
  <Accordion title="Problèmes de jeton">
    "Échec de la connexion" ou erreurs d'authentification :

    - Vérifiez que `accessToken` est la valeur du jeton d'accès OAuth (commence généralement par le préfixe `oauth:`)
    - Vérifiez que le jeton possède les portées `chat:read` et `chat:write`
    - Si vous utilisez l'actualisation du jeton, vérifiez que `clientSecret` et `refreshToken` sont définis

  </Accordion>
  <Accordion title="Le rafraîchissement du jeton ne fonctionne pas">
    Vérifiez les journaux pour les événements de rafraîchissement :

    ```
    Using env token source for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    Si vous voyez "token refresh disabled (no refresh token)":

    - Assurez-vous que `clientSecret` est fourni
    - Assurez-vous que `refreshToken` est fourni

  </Accordion>
</AccordionGroup>

## Config

### Configuration du compte

<ParamField path="username" type="string">
  Nom d'utilisateur du bot.
</ParamField>
<ParamField path="accessToken" type="string">
  Jeton d'accès OAuth avec `chat:read` et `chat:write`.
</ParamField>
<ParamField path="clientId" type="string">
  Twitch Client ID (à partir du générateur de jeton ou de votre application).
</ParamField>
<ParamField path="channel" type="string" required>
  Channel à rejoindre.
</ParamField>
<ParamField path="enabled" type="boolean" default="true">
  Activer ce compte.
</ParamField>
<ParamField path="clientSecret" type="string">
  Optionnel : pour le rafraîchissement automatique du jeton.
</ParamField>
<ParamField path="refreshToken" type="string">
  Optionnel : pour le rafraîchissement automatique du jeton.
</ParamField>
<ParamField path="expiresIn" type="number">
  Expiration du jeton en secondes.
</ParamField>
<ParamField path="obtainmentTimestamp" type="number">
  Horodatage d'obtention du jeton.
</ParamField>
<ParamField path="allowFrom" type="string[]">
  Liste autorisée des ID utilisateur.
</ParamField>
<ParamField path="allowedRoles" type='Array<"moderator" | "owner" | "vip" | "subscriber" | "all">'>
  Contrôle d'accès basé sur les rôles.
</ParamField>
<ParamField path="requireMention" type="boolean" default="true">
  Exiger @mention.
</ParamField>

### Options du fournisseur

- `channels.twitch.enabled` - Activer/désactiver le démarrage du channel
- `channels.twitch.username` - Nom d'utilisateur du bot (configuration simplifiée à compte unique)
- `channels.twitch.accessToken` - Jeton d'accès OAuth (configuration simplifiée à compte unique)
- `channels.twitch.clientId` - Twitch Client ID (configuration simplifiée à compte unique)
- `channels.twitch.channel` - Channel à rejoindre (configuration à compte unique simplifiée)
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

- **Traitez les jetons comme des mots de passe** — Ne commettez jamais de jetons dans git.
- **Utilisez l'actualisation automatique des jetons** pour les bots de longue durée.
- **Utilisez les listes d'autorisation d'ID utilisateur** au lieu des noms d'utilisateur pour le contrôle d'accès.
- **Surveillez les journaux** pour les événements d'actualisation des jetons et l'état de la connexion.
- **Limitez la portée des jetons au minimum** — Ne demandez que `chat:read` et `chat:write`.
- **En cas de blocage** : Redémarrez la passerelle après avoir confirmé qu'aucun autre processus ne possède la session.

## Limites

- **500 caractères** par message (découpé automatiquement aux limites des mots).
- Le Markdown est supprimé avant le découpage.
- Pas de limitation de débit (utilise les limitations de débit intégrées de Twitch).

## Connexes

- [Channel Routing](/fr/channels/channel-routing) — routage de session pour les messages
- [Channels Overview](/fr/channels) — tous les channels pris en charge
- [Groups](/fr/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Pairing](/fr/channels/pairing) — authentification par DM et flux d'appairage
- [Security](/fr/gateway/security) — modèle d'accès et durcissement
