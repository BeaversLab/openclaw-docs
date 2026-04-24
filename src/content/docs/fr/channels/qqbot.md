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

Statut : plugin intégré. Les messages directs, les discussions de groupe, les canaux de guilde et
les médias sont pris en charge. Les réactions et les fils de discussion ne sont pas pris en charge.

## Plugin intégré

Les versions actuelles d'OpenClaw incluent QQ Bot, les versions empaquetées standard n'ont donc pas besoin
d'une étape de `openclaw plugins install` séparée.

## Configuration

1. Rendez-vous sur la [QQ Open Platform](https://q.qq.com/) et scannez le code QR avec votre
   téléphone QQ pour vous inscrire / vous connecter.
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

| Commande       | Description                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/bot-ping`    | Test de latence                                                                                                       |
| `/bot-version` | Afficher la version du framework OpenClaw                                                                             |
| `/bot-help`    | Lister toutes les commandes                                                                                           |
| `/bot-upgrade` | Afficher le lien du guide de mise à jour de QQBot                                                                     |
| `/bot-logs`    | Exporter les journaux de la passerelle récents dans un fichier                                                        |
| `/bot-approve` | Approuvez une action QQ Bot en attente (par exemple, confirmer un téléchargement C2C ou de groupe) via le flux natif. |

Ajoutez `?` à n'importe quelle commande pour obtenir de l'aide sur l'utilisation (par exemple `/bot-upgrade ?`).

## Architecture du moteur

QQ Bot est fourni en tant que moteur autonome dans le plugin :

- Chaque compte possède une pile de ressources isolée (connexion WebSocket, client API, cache de jetons, racine de stockage média) indexée par `appId`. Les comptes ne partagent jamais d'état entrant/sortant.
- Le logger multi-compte étiquette les lignes de journal avec le compte propriétaire afin que les diagnostics restent séparables lorsque vous faites fonctionner plusieurs bots sous une seule passerelle.
- Les chemins de pont entrant, sortant et de passerelle partagent une racine unique de payload média sous `~/.openclaw/media`, de sorte que les téléchargements, les téléversements et les caches de transcodage atterrissent dans un seul répertoire protégé au lieu d'une arborescence par sous-système.
- Les identifiants peuvent être sauvegardés et restaurés dans le cadre des instantanés d'identifiants standard OpenClaw ; le moteur rattache la pile de ressources de chaque compte lors de la restauration sans nécessiter un nouveau jumelage par code QR.

## Onboarding par code QR

Comme alternative au collage manuel de `AppID:AppSecret`, le moteur prend en charge un flux d'onboarding par code QR pour lier un QQ Bot à OpenClaw :

1. Exécutez le chemin de configuration QQ Bot (par exemple `openclaw channels add --channel qqbot`) et choisissez le flux par code QR lorsqu'on vous le demande.
2. Scannez le code QR généré avec l'application mobile liée au QQ Bot cible.
3. Approuvez le jumelage sur le téléphone. OpenClaw enregistre les identifiants renvoyés dans `credentials/` sous la bonne étendue de compte.

Les invites d'approbation générées par le bot lui-même (par exemple, les flux « autoriser cette action ? » exposés par la API QQ Bot) apparaissent sous forme d'invites natives OpenClaw que vous pouvez accepter avec `/bot-approve` plutôt que de répondre via le client QQ brut.

## Dépannage

- **Le bot répond « gone to Mars » (parti sur Mars) :** identifiants non configurés ou Gateway non démarrée.
- **Aucun message entrant :** vérifiez que `appId` et `clientSecret` sont corrects, et que le
  bot est activé sur la QQ Open Platform.
- **La configuration avec `--token-file` affiche toujours non configuré :** `--token-file` définit uniquement l'AppSecret. Vous avez toujours besoin de `appId` dans la configuration ou de `QQBOT_APP_ID`.
- **Messages proactifs non reçus :** QQ peut intercepter les messages initiés par le bot si l'utilisateur n'a pas interagi récemment.
- **Voix non transcrite :** assurez-vous que la STT est configurée et que le provider est accessible.
