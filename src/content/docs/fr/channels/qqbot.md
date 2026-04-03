---
summary: "Configuration et utilisation du QQ Bot"
read_when:
  - You want to connect OpenClaw to QQ
  - You need QQ Bot credential setup
  - You want QQ Bot group or private chat support
title: QQ Bot
---

# QQ Bot

QQ Bot se connecte à OpenClaw via l'API officiel de QQ Bot (passerelle WebSocket). Le
plugin prend en charge le chat privé C2C, les messages de groupe @messages, et les messages de canal de guilde avec
des médias riches (images, voix, vidéo, fichiers).

Statut : plugin de canal intégré. Les messages directs, les chats de groupe, les canaux de guilde et
les médias sont pris en charge. Les réactions et les fils de discussion ne sont pas pris en charge.

## Intégré avec OpenClaw

Les installations actuelles de OpenClaw intègrent QQ Bot. Vous n'avez pas besoin d'une étape
`openclaw plugins install` séparée pour une configuration normale.

## Configuration

1. Allez sur la [Plateforme Ouverte QQ](https://q.qq.com/) et scannez le code QR avec votre
   téléphone QQ pour vous enregistrer / vous connecter.
2. Cliquez sur **Create Bot** pour créer un nouveau QQ bot.
3. Trouvez **AppID** et **AppSecret** sur la page des paramètres du bot et copiez-les.

> AppSecret n'est pas stocké en clair — si vous quittez la page sans l'enregistrer,
> vous devrez en en générer un nouveau.

4. Ajoutez le canal :

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. Redémarrez le Gateway.

Chemins de configuration interactifs :

```bash
openclaw channels add
openclaw configure --section channels
```

## Configurer

Configuration minimale :

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: "YOUR_APP_SECRET",
    },
  },
}
```

Variables d'environnement du compte par défaut :

- `QQBOT_APP_ID`
- `QQBOT_CLIENT_SECRET`

AppSecret basé sur un fichier :

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecretFile: "/path/to/qqbot-secret.txt",
    },
  },
}
```

Notes :

- La repli d'env (fallback) s'applique uniquement au compte QQ Bot par défaut.
- `openclaw channels add --channel qqbot --token-file ...` fournit uniquement
  l'AppSecret ; l'AppID doit déjà être défini dans la configuration ou `QQBOT_APP_ID`.
- `clientSecret` accepte également les entrées SecretRef, et pas seulement une chaîne en clair.

### Configuration multi-compte

Exécutez plusieurs QQ bots sous une seule instance OpenClaw :

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "111111111",
      clientSecret: "secret-of-bot-1",
      accounts: {
        bot2: {
          enabled: true,
          appId: "222222222",
          clientSecret: "secret-of-bot-2",
        },
      },
    },
  },
}
```

Chaque compte lance sa propre connexion WebSocket et maintient un cache
de tokens indépendant (isolé par `appId`).

Ajoutez un deuxième bot via CLI :

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### Voix (STT / TTS)

STT et TTS prennent en charge une configuration à deux niveaux avec repli prioritaire :

| Paramètre | Spécifique au plugin | Repli du framework            |
| --------- | -------------------- | ----------------------------- |
| STT       | `channels.qqbot.stt` | `tools.media.audio.models[0]` |
| TTS       | `channels.qqbot.tts` | `messages.tts`                |

```json5
{
  channels: {
    qqbot: {
      stt: {
        provider: "your-provider",
        model: "your-stt-model",
      },
      tts: {
        provider: "your-provider",
        model: "your-tts-model",
        voice: "your-voice",
      },
    },
  },
}
```

Définissez `enabled: false` sur l'un ou l'autre pour désactiver.

Le comportement de téléchargement/transcodage audio sortant peut également être ajusté avec
`channels.qqbot.audioFormatPolicy` :

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## Formats cibles

| Format                     | Description               |
| -------------------------- | ------------------------- |
| `qqbot:c2c:OPENID`         | Conversation privée (C2C) |
| `qqbot:group:GROUP_OPENID` | Chat de groupe            |
| `qqbot:channel:CHANNEL_ID` | Canal de guilde           |

> Chaque bot possède son propre ensemble d'OpenID utilisateur. Un OpenID reçu par le Bot A **ne peut pas**
> être utilisé pour envoyer des messages via le Bot B.

## Commandes slash

Commandes intégrées interceptées avant la file d'attente IA :

| Commande       | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| `/bot-ping`    | Test de latence                                                |
| `/bot-version` | Afficher la version du framework OpenClaw                      |
| `/bot-help`    | Lister toutes les commandes                                    |
| `/bot-upgrade` | Afficher le lien du guide de mise à jour de QQBot              |
| `/bot-logs`    | Exporter les journaux de la passerelle récents dans un fichier |

Ajoutez `?` à n'importe quelle commande pour obtenir de l'aide (par exemple `/bot-upgrade ?`).

## Dépannage

- **Le bot répond "parti sur Mars" :** informations d'identification non configurées ou Gateway non démarré.
- **Aucun message entrant :** vérifiez que `appId` et `clientSecret` sont corrects, et que
  le bot est activé sur la plateforme ouverte QQ.
- **La configuration avec `--token-file` affiche toujours non configuré :** `--token-file` définit uniquement
  l'AppSecret. Vous avez toujours besoin de `appId` dans la configuration ou de `QQBOT_APP_ID`.
- **Messages proactifs non arrivés :** QQ peut intercepter les messages initiés par le bot si
  l'utilisateur n'a pas interagi récemment.
- **Voix non transcrite :** assurez-vous que la STT est configurée et que le fournisseur est joignable.
