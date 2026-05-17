---
summary: "Aperçu du bot Feishu, fonctionnalités et configuration"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

Feishu/Lark est une plateforme de collaboration tout-en-un où les équipes discutent, partagent des documents, gèrent des calendriers et travaillent ensemble.

**Statut :** prêt pour la production pour les DMs de bot + discussions de groupe. WebSocket est le mode par défaut ; le mode webhook est facultatif.

---

## Quick start

<Note>Nécessite OpenClaw 2026.4.25 ou supérieur. Exécutez `openclaw --version` pour vérifier. Mettez à niveau avec `openclaw update`.</Note>

<Steps>
  <Step title="Exécutez l'assistant de configuration du canal">
    ```bash openclaw channels login --channel feishu ``` Choisissez la configuration manuelle pour coller un App ID et un App Secret depuis la plateforme ouverte Feishu, ou choisissez la configuration QR pour créer un bot automatiquement. Si l'application mobile Feishu domestique ne réagit pas au code QR, relancez la configuration et choisissez la configuration manuelle.
  </Step>

  <Step title="Une fois la configuration terminée, redémarrez la passerelle pour appliquer les modifications">```bash openclaw gateway restart ```</Step>
</Steps>

---

## Contrôle d'accès

### Messages directs

Configurez `dmPolicy` pour contrôler qui peut envoyer un DM au bot :

- `"pairing"` - les utilisateurs inconnus reçoivent un code d'appariement ; approuvez via le CLI
- `"allowlist"` - seuls les utilisateurs listés dans `allowFrom` peuvent chatter (par défaut : seul le propriétaire du bot)
- `"open"` - autoriser les DMs publics uniquement lorsque `allowFrom` inclut `"*"` ; avec des entrées restrictives, seuls les utilisateurs correspondants peuvent chatter
- `"disabled"` - désactiver tous les DMs

**Approuver une demande d'appariement :**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### Discussions de groupe

**Stratégie de groupe** (`channels.feishu.groupPolicy`) :

| Valeur        | Comportement                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `"open"`      | Répondre à tous les messages dans les groupes                                                             |
| `"allowlist"` | Répondre uniquement aux groupes dans `groupAllowFrom` ou explicitement configurés sous `groups.<chat_id>` |
| `"disabled"`  | Désactiver tous les messages de groupe ; les entrées explicites `groups.<chat_id>` ne remplacent pas cela |

Par défaut : `allowlist`

**Exigence de mention** (`channels.feishu.requireMention`) :

- `true` - exiger une @mention (par défaut)
- `false` - répondre sans @mention
- Remplacement par groupe : `channels.feishu.groups.<chat_id>.requireMention`
- Les `@all` et `@_all` de diffusion uniquement ne sont pas traités comme des mentions de bot. Un message qui mentionne à la fois `@all` et le bot directement compte toujours comme une mention de bot.

---

## Exemples de configuration de groupe

### Autoriser tous les groupes, sans @mention requise

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### Autoriser tous les groupes, @mention toujours requise

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### Autoriser uniquement des groupes spécifiques

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // Group IDs look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

En mode `allowlist`, vous pouvez également admettre un groupe en ajoutant une entrée `groups.<chat_id>` explicite. Les entrées explicites ne remplacent pas `groupPolicy: "disabled"`. Les valeurs par défaut avec caractères génériques sous `groups.*` configurent les groupes correspondants, mais ils n'admettent pas les groupes par eux-mêmes.

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groups: {
        oc_xxx: {
          requireMention: false,
        },
      },
    },
  },
}
```

### Restreindre les expéditeurs dans un groupe

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // User open_ids look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

<a id="get-groupuser-ids"></a>

## Obtenir les IDs de groupe/utilisateur

### ID de groupe (`chat_id`, format : `oc_xxx`)

Ouvrez le groupe dans Feishu/Lark, cliquez sur l'icône de menu dans le coin supérieur droit et allez dans **Paramètres**. L'ID de groupe (`chat_id`) est répertorié sur la page des paramètres.

![Obtenir l'ID de groupe](/images/feishu-get-group-id.png)

### ID utilisateur (`open_id`, format : `ou_xxx`)

Démarrez la passerelle, envoyez un DM au bot, puis vérifiez les logs :

```bash
openclaw logs --follow
```

Recherchez `open_id` dans la sortie des journaux. Vous pouvez également vérifier les demandes d'appariement en attente :

```bash
openclaw pairing list feishu
```

---

## Commandes courantes

| Commande  | Description                       |
| --------- | --------------------------------- |
| `/status` | Afficher le statut du bot         |
| `/reset`  | Réinitialiser la session actuelle |
| `/model`  | Afficher ou changer le model d'IA |

<Note>Feishu/Lark ne prend pas en charge les menus de commandes slash natifs, envoyez-les donc sous forme de messages texte simples.</Note>

---

## Dépannage

### Le bot ne répond pas dans les chats de groupe

1. Assurez-vous que le bot est ajouté au groupe
2. Assurez-vous de @mentionner le bot (requis par défaut)
3. Vérifiez que `groupPolicy` n'est pas `"disabled"`
4. Vérifiez les journaux : `openclaw logs --follow`

### Le bot ne reçoit pas de messages

1. Assurez-vous que le bot est publié et approuvé dans Feishu Open Platform / Lark Developer
2. Assurez-vous que l'abonnement aux événements inclut `im.message.receive_v1`
3. Assurez-vous que la **connexion persistante** (WebSocket) est sélectionnée
4. Assurez-vous que toutes les portées d'autorisation requises sont accordées
5. Assurez-vous que la passerelle est en cours d'exécution : `openclaw gateway status`
6. Vérifiez les journaux : `openclaw logs --follow`

### La configuration QR ne réagit pas dans l'application mobile Feishu

1. Relancez la configuration : `openclaw channels login --channel feishu`
2. Choisissez la configuration manuelle
3. Sur la plateforme ouverte Feishu, créez une application auto-construite et copiez son App ID et son App Secret
4. Collez ces identifiants dans l'assistant de configuration

### App Secret fuite

1. Réinitialisez l'App Secret sur la plateforme ouverte Feishu / Lark Developer
2. Mettez à jour la valeur dans votre configuration
3. Redémarrez la passerelle : `openclaw gateway restart`

---

## Configuration avancée

### Comptes multiples

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "Primary bot",
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` contrôle quel compte est utilisé lorsque les API sortantes ne spécifient pas `accountId`.
`accounts.<id>.tts` utilise la même structure que `messages.tts` et fusionne en profondeur avec
la configuration TTS globale, ce qui permet aux configurations Feishu multi-bots de conserver des identifiants de fournisseur partagés
globalement tout en remplaçant uniquement la voix, le model, la persona ou le mode automatique
par compte.

### Limites de messages

- `textChunkLimit` - taille du bloc de texte sortant (par défaut : `2000` caractères)
- `mediaMaxMb` - limite de téléchargement/téléchargement de média (par défaut : `30` Mo)

### Streaming

Feishu/Lark prend en charge les réponses en streaming via des cartes interactives. Lorsqu'il est activé, le bot met à jour la carte en temps réel pendant qu'il génère le texte.

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default: true)
      blockStreaming: true, // opt into completed-block streaming
    },
  },
}
```

Définissez `streaming: false` pour envoyer la réponse complète en un seul message. `blockStreaming` est désactivé par défaut ; activez-le uniquement lorsque vous souhaitez que les blocs d'assistant terminés soient envoyés avant la réponse finale.

### Optimisation du quota

Réduisez le nombre d'appels API Feishu/Lark avec deux indicateurs optionnels :

- `typingIndicator` (par défaut `true`) : définissez `false` pour ignorer les appels de réaction de frappe
- `resolveSenderNames` (par défaut `true`) : définissez `false` pour ignorer les recherches de profil de l'expéditeur

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
    },
  },
}
```

### Sessions ACP

Feishu/Lark prend en charge l'ACP pour les DMs et les messages de fil de groupe. L'ACP Feishu/Lark est basée sur des commandes textuelles — il n'y a pas de menus de commandes slash natifs, utilisez donc les messages `/acp ...` directement dans la conversation.

#### Liaison ACP persistante

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### Lancer une ACP depuis le chat

Dans un DM ou un fil Feishu/Lark :

```text
/acp spawn codex --thread here
```

`--thread here` fonctionne pour les DMs et les messages de fil Feishu/Lark. Les messages de suivi dans la conversation liée sont acheminés directement vers cette session ACP.

### Routage multi-agent

Utilisez `bindings` pour acheminer les DMs ou groupes Feishu/Lark vers différents agents.

```json5
{
  agents: {
    list: [{ id: "main" }, { id: "agent-a", workspace: "/home/user/agent-a" }, { id: "agent-b", workspace: "/home/user/agent-b" }],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

Champs de routage :

- `match.channel` : `"feishu"`
- `match.peer.kind` : `"direct"` (DM) ou `"group"` (groupe)
- `match.peer.id` : Open ID utilisateur (`ou_xxx`) ou ID de groupe (`oc_xxx`)

Voir [Obtenir les IDs de groupe/utilisateur](#get-groupuser-ids) pour des conseils de recherche.

---

## Référence de configuration

Configuration complète : [configuration du Gateway](/fr/gateway/configuration)

| Paramètre                                         | Description                                                                      | Par défaut       |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Activer/désactiver le channel                                                    | `true`           |
| `channels.feishu.domain`                          | Domaine API (`feishu` ou `lark`)                                                 | `feishu`         |
| `channels.feishu.connectionMode`                  | Transport d'événements (`websocket` ou `webhook`)                                | `websocket`      |
| `channels.feishu.defaultAccount`                  | Compte par défaut pour le routage sortant                                        | `default`        |
| `channels.feishu.verificationToken`               | Requis pour le mode webhook                                                      | -                |
| `channels.feishu.encryptKey`                      | Requis pour le mode webhook                                                      | -                |
| `channels.feishu.webhookPath`                     | Chemin de routage du webhook                                                     | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Hôte de liaison du webhook                                                       | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Port de liaison du webhook                                                       | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | App ID                                                                           | -                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                                                                       | -                |
| `channels.feishu.accounts.<id>.domain`            | Per-account domain override                                                      | `feishu`         |
| `channels.feishu.accounts.<id>.tts`               | Per-account TTS override                                                         | `messages.tts`   |
| `channels.feishu.dmPolicy`                        | DM policy                                                                        | `allowlist`      |
| `channels.feishu.allowFrom`                       | DM allowlist (open_id list)                                                      | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | Group policy                                                                     | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | Group allowlist                                                                  | -                |
| `channels.feishu.requireMention`                  | Require @mention in groups                                                       | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | Per-group @mention override; explicit IDs also admit the group in allowlist mode | inherited        |
| `channels.feishu.groups.<chat_id>.enabled`        | Enable/disable a specific group                                                  | `true`           |
| `channels.feishu.textChunkLimit`                  | Message chunk size                                                               | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Media size limit                                                                 | `30`             |
| `channels.feishu.streaming`                       | Streaming card output                                                            | `true`           |
| `channels.feishu.blockStreaming`                  | Completed-block reply streaming                                                  | `false`          |
| `channels.feishu.typingIndicator`                 | Send typing reactions                                                            | `true`           |
| `channels.feishu.resolveSenderNames`              | Resolve sender display names                                                     | `true`           |

---

## Supported message types

### Receive

- ✅ Text
- ✅ Rich text (post)
- ✅ Images
- ✅ Files
- ✅ Audio
- ✅ Video/media
- ✅ Stickers

Les messages audio entrants Feishu/Lark sont normalisés sous forme de substituants média au lieu de JSON brut `file_key`. Lorsque `tools.media.audio` est configuré, OpenClaw télécharge la ressource de note vocale et exécute la transcription audio partagée avant le tour de l'agent, afin que l'agent reçoive la transcription parlée. Si Feishu inclut directement le texte de la transcription dans la charge utile audio, ce texte est utilisé sans nouvel appel ASR. Sans fournisseur de transcription audio, l'agent reçoit toujours un substituant `<media:audio>` ainsi que la pièce jointe sauvegardée, et non la charge utile de ressource brute Feishu.

### Envoyer

- ✅ Texte
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo/média
- ✅ Cartes interactives (y compris les mises à jour en streaming)
- ⚠️ Texte enrichi (formatage de style publication ; ne prend pas en charge toutes les capacités d'édition Feishu/Lark)

Les bulles audio natives Feishu/Lark utilisent le type de message Feishu `audio` et nécessitent un média de téléchargement Ogg/Opus (`file_type: "opus"`). Les médias `.opus` et `.ogg` existants sont envoyés directement sous forme d'audio natif. Les MP3/WAV/M4A et autres formats audio probables sont transcodés en Ogg/Opus 48kHz avec `ffmpeg` uniquement lorsque la réponse demande une livraison vocale (`audioAsVoice` / outil de message `asVoice`, y compris les réponses de notes vocales TTS). Les pièces jointes MP3 ordinaires restent des fichiers normaux. Si `ffmpeg` est manquant ou si la conversion échoue, OpenClaw revient à une pièce jointe de fichier et consigne la raison.

### Fils de discussion et réponses

- ✅ Réponses en ligne
- ✅ Réponses dans les fils
- ✅ Les réponses média restent conscientes du fil lors d'une réponse à un message de fil

Pour `groupSessionScope: "group_topic"` et `"group_topic_sender"`, les groupes de sujets natifs Feishu/Lark utilisent l'événement `thread_id` (`omt_*`) comme clé de session de sujet canonique. Si un événement de démarrage de sujet natif omet `thread_id`, OpenClaw le complète à partir de Feishu avant d'acheminer le tour. Les réponses de groupe normales que OpenClaw transforme en fils de discussion continuent d'utiliser l'ID du message racine de réponse (`om_*`) afin que le premier tour et les tours suivants restent dans la même session.

---

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) - tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) - authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) - comportement des discussions de groupe et filtrage par mention
- [Acheminement de canal](/fr/channels/channel-routing) - acheminement de session pour les messages
- [Sécurité](/fr/gateway/security) - modèle d'accès et durcissement
