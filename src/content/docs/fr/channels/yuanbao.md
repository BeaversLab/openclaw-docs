---
summary: "Aperçu du bot Yuanbao, fonctionnalités et configuration"
read_when:
  - You want to connect a Yuanbao bot
  - You are configuring the Yuanbao channel
title: Yuanbao
---

Tencent Yuanbao est la plateforme d'assistant IA de Tencent. Le plugin de channel OpenClaw
connecte les bots Yuanbao à OpenClaw via WebSocket afin qu'ils puissent interagir avec les utilisateurs
par messages directs et discussions de groupe.

**Statut :** prêt pour la production pour les DMs de bot + discussions de groupe. WebSocket est le seul mode de connexion pris en charge.

---

## Quick start

> **Nécessite OpenClaw 2026.4.10 ou supérieur.** Exécutez `openclaw --version` pour vérifier. Effectuez une mise à niveau avec `openclaw update`.

<Steps>
  <Step title="Ajoutez le channel Yuanbao avec vos identifiants">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  La valeur `--token` utilise le format `appKey:appSecret` séparé par des deux-points. Vous pouvez les obtenir depuis l'application Yuanbao en créant un robot dans vos paramètres d'application.
  </Step>

  <Step title="Une fois la configuration terminée, redémarrez la passerelle pour appliquer les modifications">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

### Configuration interactive (alternative)

Vous pouvez également utiliser l'assistant interactif :

```bash
openclaw channels login --channel yuanbao
```

Suivez les invites pour entrer votre ID d'application et votre secret d'application.

---

## Contrôle d'accès

### Messages directs

Configurez `dmPolicy` pour contrôler qui peut envoyer un DM au bot :

- `"pairing"` - les utilisateurs inconnus reçoivent un code d'appariement ; approuver via le CLI
- `"allowlist"` - seuls les utilisateurs listés dans `allowFrom` peuvent chatter
- `"open"` - autoriser tous les utilisateurs (par défaut)
- `"disabled"` - désactiver tous les DMs

**Approuver une demande d'appariement :**

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### Discussions de groupe

**Exigence de mention** (`channels.yuanbao.requireMention`) :

- `true` - exiger @mention (par défaut)
- `false` - répondre sans @mention

Répondre au message du bot dans une discussion de groupe est considéré comme une mention implicite.

---

## Exemples de configuration

### Configuration de base avec une stratégie de DM ouverte

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "open",
      },
    },
  },
}
```

### Restreindre les DMs à des utilisateurs spécifiques

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "allowlist",
        allowFrom: ["user_id_1", "user_id_2"],
      },
    },
  },
}
```

### Désactiver l'exigence de @mention dans les groupes

```json5
{
  channels: {
    yuanbao: {
      requireMention: false,
    },
  },
}
```

### Optimiser la livraison des messages sortants

```json5
{
  channels: {
    yuanbao: {
      // Send each chunk immediately without buffering
      outboundQueueStrategy: "immediate",
    },
  },
}
```

### Ajuster la stratégie de fusion de texte

```json5
{
  channels: {
    yuanbao: {
      outboundQueueStrategy: "merge-text",
      minChars: 2800, // buffer until this many chars
      maxChars: 3000, // force split above this limit
      idleMs: 5000, // auto-flush after idle timeout (ms)
    },
  },
}
```

---

## Commandes courantes

| Commande   | Description                         |
| ---------- | ----------------------------------- |
| `/help`    | Afficher les commandes disponibles  |
| `/status`  | Afficher l'état du bot              |
| `/new`     | Démarrer une nouvelle session       |
| `/stop`    | Arrêter l'exécution en cours        |
| `/restart` | Redémarrer OpenClaw                 |
| `/compact` | Compacter le contexte de la session |

> Yuanbao prend en charge les menus de commandes natives (slash). Les commandes sont synchronisées automatiquement avec la plateforme au démarrage de la passerelle.

---

## Dépannage

### Le bot ne répond pas dans les discussions de groupe

1. Vérifiez que le bot est ajouté au groupe
2. Assurez-vous de @mentionner le bot (requis par défaut)
3. Vérifiez les journaux : `openclaw logs --follow`

### Le bot ne reçoit pas de messages

1. Assurez-vous que le bot est créé et approuvé dans l'application Yuanbao
2. Assurez-vous que `appKey` et `appSecret` sont correctement configurés
3. Assurez-vous que la passerelle est en cours d'exécution : `openclaw gateway status`
4. Vérifiez les journaux : `openclaw logs --follow`

### Le bot envoie des réponses vides ou de repli

1. Vérifiez si le modèle d'IA renvoie du contenu valide
2. La réponse de repli par défaut est : "暂时无法解答，你可以换个问题问问我哦"
3. Personnalisez-la via `channels.yuanbao.fallbackReply`

### Fuite de la clé secrète de l'application (App Secret)

1. Réinitialisez la clé secrète de l'application dans l'application YuanBao
2. Mettez à jour la valeur dans votre configuration
3. Redémarrez la passerelle : `openclaw gateway restart`

---

## Configuration avancée

### Comptes multiples

```json5
{
  channels: {
    yuanbao: {
      defaultAccount: "main",
      accounts: {
        main: {
          appKey: "key_xxx",
          appSecret: "secret_xxx",
          name: "Primary bot",
        },
        backup: {
          appKey: "key_yyy",
          appSecret: "secret_yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` contrôle le compte utilisé lorsque les API sortantes ne spécifient pas de `accountId`.

### Limites de messages

- `maxChars` - nombre maximum de caractères par message (par défaut : `3000` caractères)
- `mediaMaxMb` - limite de téléchargement/téléchargement de médias (par défaut : `20` Mo)
- `overflowPolicy` - comportement lorsque le message dépasse la limite : `"split"` (par défaut) ou `"stop"`

### Diffusion en continu (Streaming)

Yuanbao prend en charge la diffusion en continu au niveau des blocs. Lorsqu'elle est activée, le bot envoie le texte par morceaux au fur et à mesure de sa génération.

```json5
{
  channels: {
    yuanbao: {
      disableBlockStreaming: false, // block streaming enabled (default)
    },
  },
}
```

Définissez `disableBlockStreaming: true` pour envoyer la réponse complète en un seul message.

### Contexte de l'historique des discussions de groupe

Contrôlez le nombre de messages historiques inclus dans le contexte de l'IA pour les discussions de groupe :

```json5
{
  channels: {
    yuanbao: {
      historyLimit: 100, // default: 100, set 0 to disable
    },
  },
}
```

### Mode de réponse

Contrôlez la façon dont le bot cite les messages lorsqu'il répond dans les conversations de groupe :

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all" (default: "first")
    },
  },
}
```

| Valeur    | Comportement                                                          |
| --------- | --------------------------------------------------------------------- |
| `"off"`   | Pas de réponse citée                                                  |
| `"first"` | Citer uniquement la première réponse par message entrant (par défaut) |
| `"all"`   | Citer chaque réponse                                                  |

### Injection d'indices Markdown

Par défaut, le bot injecte des instructions dans le prompt système pour empêcher le modèle IA d'envelopper la réponse entière dans des blocs de code markdown.

```json5
{
  channels: {
    yuanbao: {
      markdownHintEnabled: true, // default: true
    },
  },
}
```

### Mode de débogage

Activer la sortie de journal non nettoyée pour des ID de bot spécifiques :

```json5
{
  channels: {
    yuanbao: {
      debugBotIds: ["bot_user_id_1", "bot_user_id_2"],
    },
  },
}
```

### Routage multi-agent

Utilisez `bindings` pour router les DM ou groupes Yuanbao vers différents agents.

```json5
{
  agents: {
    list: [{ id: "main" }, { id: "agent-a", workspace: "/home/user/agent-a" }, { id: "agent-b", workspace: "/home/user/agent-b" }],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "yuanbao",
        peer: { kind: "direct", id: "user_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "yuanbao",
        peer: { kind: "group", id: "group_zzz" },
      },
    },
  ],
}
```

Champs de routage :

- `match.channel` : `"yuanbao"`
- `match.peer.kind` : `"direct"` (DM) ou `"group"` (conversation de groupe)
- `match.peer.id` : ID d'utilisateur ou code de groupe

---

## Référence de configuration

Configuration complète : [configuration Gateway](/fr/gateway/configuration)

| Paramètre                                  | Description                                                                | Par défaut                             |
| ------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | Activer/désactiver le channel                                              | `true`                                 |
| `channels.yuanbao.defaultAccount`          | Compte par défaut pour le routage sortant                                  | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | Clé d'application (utilisée pour la signature et la génération de tickets) | -                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | Secret d'application (utilisé pour la signature)                           | -                                      |
| `channels.yuanbao.accounts.<id>.token`     | Jeton pré-signé (ignore la signature automatique des tickets)              | -                                      |
| `channels.yuanbao.accounts.<id>.name`      | Nom d'affichage du compte                                                  | -                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | Activer/désactiver un compte spécifique                                    | `true`                                 |
| `channels.yuanbao.dm.policy`               | Stratégie de DM                                                            | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | Liste d'autorisation de DM (liste des ID utilisateur)                      | -                                      |
| `channels.yuanbao.requireMention`          | Exiger @mention dans les groupes                                           | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | Gestion des messages longs (`split` ou `stop`)                             | `split`                                |
| `channels.yuanbao.replyToMode`             | Stratégie de réponse de groupe (`off`, `first`, `all`)                     | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | Stratégie de sortie (`merge-text` ou `immediate`)                          | `merge-text`                           |
| `channels.yuanbao.minChars`                | Fusion de texte : nombre min. de caractères pour déclencher l'envoi        | `2800`                                 |
| `channels.yuanbao.maxChars`                | Fusion de texte : nombre max. de caractères par message                    | `3000`                                 |
| `channels.yuanbao.idleMs`                  | Fusion de texte : délai d'inactivité avant le vidage automatique (ms)      | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | Limite de taille des médias (Mo)                                           | `20`                                   |
| `channels.yuanbao.historyLimit`            | Entrées de contexte d'historique de groupe                                 | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | Désactiver la sortie en continu au niveau du bloc                          | `false`                                |
| `channels.yuanbao.fallbackReply`           | Réponse de repli lorsque l'IA ne renvoie aucun contenu                     | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | Injecter les instructions anti-retour à la ligne Markdown                  | `true`                                 |
| `channels.yuanbao.debugBotIds`             | Liste blanche des IDs de bot de débogage (journaux non nettoyés)           | `[]`                                   |

---

## Types de messages pris en charge

### Réception

- ✅ Texte
- ✅ Images
- ✅ Fichiers
- ✅ Audio / Voix
- ✅ Vidéo
- ✅ Autocollants / Émojis personnalisés
- ✅ Éléments personnalisés (cartes de lien, etc.)

### Envoi

- ✅ Texte (avec support du markdown)
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo
- ✅ Autocollants

### Fils de discussion et réponses

- ✅ Réponses citées (configurable via `replyToMode`)
- ❌ Réponses en fil (non prises en charge par la plateforme)

---

## Connexes

- [Aperçu des canaux](/fr/channels) - tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) - authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) - comportement des discussions de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) - routage de session pour les messages
- [Sécurité](/fr/gateway/security) - modèle d'accès et durcissement
