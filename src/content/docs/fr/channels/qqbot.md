---
summary: "Configuration, configuration et utilisation du bot QQ"
read_when:
  - You want to connect OpenClaw to QQ
  - You need QQ Bot credential setup
  - You want QQ Bot group or private chat support
title: Bot QQ
---

Le Bot QQ se connecte à OpenClaw via l'API officielle du Bot QQ (passerelle WebSocket). Le
plugin prend en charge le chat privé C2C, les messages de groupe @messages, et les messages des channel de guilde avec
des médias riches (images, voix, vidéo, fichiers).

Statut : plugin téléchargeable. Les messages directs, les discussions de groupe, les canaux de guilde et
les médias sont pris en charge. Les réactions et les fils de discussion ne sont pas pris en charge.

## Installer

Installez le bot QQ avant la configuration :

```bash
openclaw plugins install @openclaw/qqbot
```

## Configuration

1. Allez sur la [plateforme ouverte QQ](https://q.qq.com/) et scannez le code QR avec votre
   téléphone QQ pour vous inscrire / vous connecter.
2. Cliquez sur **Créer un Bot** pour créer un nouveau bot QQ.
3. Trouvez **AppID** et **AppSecret** sur la page des paramètres du bot et copiez-les.

> L'AppSecret n'est pas stocké en clair — si vous quittez la page sans l'enregistrer,
> vous devrez en régénérer un nouveau.

4. Ajoutez le channel :

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

AppSecret sauvegardé dans un fichier :

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

SecretRef d'environnement AppSecret :

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: { source: "env", provider: "default", id: "QQBOT_CLIENT_SECRET" },
    },
  },
}
```

Notes :

- La repli d'env (fallback) s'applique uniquement au compte QQ Bot par défaut.
- `openclaw channels add --channel qqbot --token-file ...` fournit uniquement
  l'AppSecret ; l'AppID doit déjà être défini dans la configuration ou `QQBOT_APP_ID`.
- `clientSecret` accepte également les entrées SecretRef, et pas seulement les chaînes en texte brut.
- Les anciennes chaînes de marqueur `secretref:/...` ne sont pas des valeurs `clientSecret` valides ;
  utilisez des objets SecretRef structurés comme dans l'exemple ci-dessus.

### Configuration multi-compte

Exécutez plusieurs bots QQ sous une seule instance OpenClaw :

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
de jetons indépendant (isolé par `appId`).

Ajoutez un deuxième bot via CLI :

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### Discussions de groupe

La prise en charge des discussions de groupe par le bot QQ utilise les OpenIDs de groupe QQ, et non les noms d'affichage. Ajoutez le bot
à un groupe, puis mentionnez-le ou configurez le groupe pour qu'il fonctionne sans mention.

```json5
{
  channels: {
    qqbot: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["member_openid"],
      groups: {
        "*": {
          requireMention: true,
          historyLimit: 50,
          toolPolicy: "restricted",
        },
        GROUP_OPENID: {
          name: "Release room",
          requireMention: false,
          ignoreOtherMentions: true,
          historyLimit: 20,
          prompt: "Keep replies short and operational.",
        },
      },
    },
  },
}
```

`groups["*"]` définit les valeurs par défaut pour chaque groupe, et une entrée
`groups.GROUP_OPENID` concrète remplace ces valeurs par défaut pour un groupe. Les paramètres
de groupe incluent :

- `requireMention` : exiger une @mention avant que le bot ne réponde. Par défaut : `true`.
- `ignoreOtherMentions` : ignorer les messages qui mentionnent quelqu'un d'autre mais pas le bot.
- `historyLimit` : conserver les messages de groupe récents sans mention comme contexte pour le prochain tour mentionné. Définissez `0` pour désactiver.
- `toolPolicy` : `full`, `restricted` ou `none` pour les outils portés sur le groupe.
- `name` : libellé convivial utilisé dans les journaux et le contexte de groupe.
- `prompt` : invite de comportement par groupe ajoutée au contexte de l'agent.

Les modes d'activation sont `mention` et `always`. `requireMention: true` correspond à
`mention` ; `requireMention: false` correspond à `always`. Une substitution d'activation au niveau de la session,
si elle est présente, prévaut sur la configuration.

La file d'attente entrante est par pair. Les pairs de groupe bénéficient d'une limite de file d'attente plus élevée, gardent les messages humains en tête des bavardages du bot lorsqu'elle est pleine, et fusionnent les rafales de messages de groupe normaux en un tour attribué. Les commandes slash s'exécutent toujours une par une.

### Voix (STT / TTS)

Le STT et le TTS prennent en charge une configuration à deux niveaux avec repli prioritaire :

| Paramètre | Spécifique au plugin                                     | Repli du framework            |
| --------- | -------------------------------------------------------- | ----------------------------- |
| STT       | `channels.qqbot.stt`                                     | `tools.media.audio.models[0]` |
| TTS       | `channels.qqbot.tts`, `channels.qqbot.accounts.<id>.tts` | `messages.tts`                |

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
      accounts: {
        "qq-main": {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

Définissez `enabled: false` sur l'un ou l'autre pour désactiver.
Les substitutions TTS au niveau du compte utilisent la même structure que `messages.tts` et fusionnent en profondeur
avec la configuration TTS du channel/globale.

Les pièces jointes vocales entrantes de QQ sont exposées aux agents en tant que métadonnées de média audio tout en
maintenant les fichiers vocaux bruts hors du `MediaPaths` générique. `[[audio_as_voice]]` les réponses en
texte brut synthétisent le TTS et envoient un message vocal natif QQ lorsque le TTS est
configuré.

Le comportement de téléchargement/transcodage audio sortant peut également être ajusté avec
`channels.qqbot.audioFormatPolicy` :

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## Formats cibles

| Format                     | Description       |
| -------------------------- | ----------------- |
| `qqbot:c2c:OPENID`         | Chat privé (C2C)  |
| `qqbot:group:GROUP_OPENID` | Chat de groupe    |
| `qqbot:channel:CHANNEL_ID` | Channel de guilde |

> Chaque bot possède son propre ensemble d'OpenIDs utilisateur. Un OpenID reçu par le Bot A **ne peut** pas
> être utilisé pour envoyer des messages via le Bot B.

## Commandes slash

Commandes intégrées interceptées avant la file d'attente IA :

| Commande       | Description                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/bot-ping`    | Test de latence                                                                                                       |
| `/bot-version` | Afficher la version du framework OpenClaw                                                                             |
| `/bot-help`    | Lister toutes les commandes                                                                                           |
| `/bot-me`      | Afficher l'identifiant utilisateur QQ (openid) de l'expéditeur pour la configuration `allowFrom`/`groupAllowFrom`     |
| `/bot-upgrade` | Afficher le lien du guide de mise à niveau QQBot                                                                      |
| `/bot-logs`    | Exporter les journaux de passerelle récents sous forme de fichier                                                     |
| `/bot-approve` | Approuver une action QQ Bot en attente (par exemple, confirmer un téléchargement C2C ou de groupe) via le flux natif. |

Ajoutez `?` à n'importe quelle commande pour obtenir de l'aide sur l'utilisation (par exemple `/bot-upgrade ?`).

Les commandes d'administrateur (`/bot-me`, `/bot-upgrade`, `/bot-logs`, `/bot-clear-storage`, `/bot-streaming`, `/bot-approve`) sont réservées aux messages directs et nécessitent l'openid de l'expéditeur dans une liste `allowFrom` explicite sans caractère générique. Un caractère générique `allowFrom: ["*"]` autorise le chat mais n'accorde pas l'accès aux commandes d'administrateur. Les messages de groupe correspondent d'abord à `groupAllowFrom` et reviennent à `allowFrom`. L'exécution d'une commande d'administrateur dans un groupe renvoie un indice plutôt que d'être ignorée silencieusement.

## Architecture du moteur

QQ Bot est fourni en tant que moteur autonome dans le plugin :

- Chaque compte possède une pile de ressources isolée (connexion WebSocket, client API, cache de jetons, racine de stockage multimédia) indexée par `appId`. Les comptes ne partagent jamais l'état entrant/sortant.
- Le journaliseur multi-compte étiquette les lignes de journal avec le compte propriétaire, de sorte que les diagnostics restent séparables lorsque vous exécutez plusieurs bots sous une seule passerelle.
- Les chemins de pont entrant, sortant et de passerelle partagent une racine unique de charge utile multimédia sous `~/.openclaw/media`, de sorte que les téléchargements, les téléversements et les caches de transcodage atterrissent dans un répertoire protégé au lieu d'une arborescence par sous-système.
- La diffusion de média riche passe par un chemin `sendMedia` pour les cibles C2C et de groupe. Les fichiers locaux et les tampons dépassant le seuil des fichiers volumineux utilisent les points de terminaison de téléchargement fragmenté de QQ, tandis que les charges utiles plus petites utilisent l'API multimédia en une seule fois API.
- Les identifiants peuvent être sauvegardés et restaurés dans le cadre des instantanés d'identifiants standard d'OpenClaw ; le moteur rattache la pile de ressources de chaque compte lors de la restauration sans nécessiter de nouvelle paire de codes QR.

## Onboarding par code QR

Comme alternative au collage manuel de `AppID:AppSecret`, le moteur prend en charge un flux d'onboarding par code QR pour lier un bot QQ à OpenClaw :

1. Exécutez le chemin de configuration du bot QQ (par exemple `openclaw channels add --channel qqbot`) et choisissez le flux par code QR lorsqu'il vous est demandé.
2. Scannez le code QR généré avec l'application mobile liée au bot QQ cible.
3. Approuvez le jumelage sur le téléphone. OpenClaw enregistre les identifiants renvoyés dans `credentials/` sous la bonne étendue de compte.

Les invites d'approbation générées par le bot lui-même (par exemple, les flux « autoriser cette action ? » exposés par l'API du bot QQ) s'affichent sous forme d'invites natives OpenClaw que vous pouvez accepter avec `/bot-approve` plutôt que de répondre via le client QQ brut.

## Troubleshooting

- **Le bot répond « gone to Mars »** : identifiants non configurés ou Gateway non démarré.
- **Aucun message entrant** : vérifiez que `appId` et `clientSecret` sont corrects, et que
  le bot est activé sur la plateforme ouverte QQ.
- **Répétitions de réponses automatiques** : OpenClaw enregistre les index de référence sortants QQ comme
  créés par le bot et ignore les événements entrants dont le `msgIdx` actuel correspond à ce
  même compte de bot. Cela empêche les boucles d'écho de la plateforme tout en permettant aux utilisateurs
  de citer ou de répondre aux messages précédents du bot.
- **La configuration avec `--token-file` affiche toujours non configuré** : `--token-file` définit uniquement
  le AppSecret. Vous avez toujours besoin de `appId` dans la configuration ou `QQBOT_APP_ID`.
- **Messages proactifs n'arrivant pas** : QQ peut intercepter les messages initiés par le bot si
  l'utilisateur n'a pas interagi récemment.
- **Voix non transcrite** : assurez-vous que la STT est configurée et que le provider est accessible.

## Connexes

- [Jumelage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Troubleshooting de canal](/fr/channels/troubleshooting)
