---
summary: "Présentation du bot YuanBao, fonctionnalités et configuration"
read_when:
  - You want to connect a YuanBao bot
  - You are configuring the YuanBao channel
title: YuanBao
---

# YuanBao

YuanBao est la plateforme d'assistant IA de Tencent qui prend en charge l'intégration de bots via la messagerie instantanée. Les bots peuvent interagir avec les utilisateurs via des messages directs et des discussions de groupe.

**Statut :** prêt pour la production pour les DM de bot + discussions de groupe. WebSocket est le seul mode de connexion pris en charge.

---

## Quick start

> **Nécessite OpenClaw 2026.4.10 ou supérieur.** Exécutez `openclaw --version` pour vérifier. Mettez à niveau avec `openclaw update`.

<Steps>
  <Step title="Ajoutez le channel YuanBao avec vos identifiants">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  La valeur `--token` utilise le format `appKey:appSecret` séparé par des deux-points. Vous pouvez les obtenir à partir de l'application YuanBao en créant un robot dans les paramètres de votre application.
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

- `"pairing"` — les utilisateurs inconnus reçoivent un code d'appariement ; approuver via CLI
- `"allowlist"` — seuls les utilisateurs répertoriés dans `allowFrom` peuvent discuter
- `"open"` — autoriser tous les utilisateurs (par défaut)
- `"disabled"` — désactiver tous les DM

**Approuver une demande d'appariement :**

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### Discussions de groupe

**Exigence de mention** (`channels.yuanbao.requireMention`) :

- `true` — exiger @mention (par défaut)
- `false` — répondre sans @mention

Répondre au message du bot dans une discussion de groupe est considéré comme une mention implicite.

---

## Exemples de configuration

### Configuration de base avec une politique DM ouverte

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

### Restreindre les DM à des utilisateurs spécifiques

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

### Désactiver l'exigence @mention dans les groupes

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

### Régler la stratégie de fusion de texte

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

| Commande   | Description                        |
| ---------- | ---------------------------------- |
| `/help`    | Afficher les commandes disponibles |
| `/status`  | Afficher l'état du bot             |
| `/new`     | Démarrer une nouvelle session      |
| `/stop`    | Arrêter l'exécution actuelle       |
| `/restart` | Redémarrer OpenClaw                |
| `/compact` | Compacter le contexte de session   |

> YuanBao prend en charge les menus de commandes natifs. Les commandes sont synchronisées automatiquement avec la plateforme au démarrage de la passerelle.

---

## Dépannage

### Le bot ne répond pas dans les discussions de groupe

1. Assurez-vous que le bot est ajouté au groupe
2. Assurez-vous de @mentionner le bot (requis par défaut)
3. Vérifiez les journaux : `openclaw logs --follow`

### Le bot ne reçoit pas de messages

1. Assurez-vous que le bot est créé et approuvé dans l'application YuanBao
2. Assurez-vous que `appKey` et `appSecret` sont correctement configurés
3. Assurez-vous que la passerelle est en cours d'exécution : `openclaw gateway status`
4. Vérifiez les journaux : `openclaw logs --follow`

### Le bot envoie des réponses vides ou de repli

1. Vérifiez si le modèle IA renvoie du contenu valide
2. La réponse de repli par défaut est : "暂时无法解答，你可以换个问题问问我哦"
3. Personnalisez-la via `channels.yuanbao.fallbackReply`

### Fuite de la clé secrète de l'application

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

`defaultAccount` contrôle quel compte est utilisé lorsque les API sortantes ne spécifient pas de `accountId`.

### Limites de messages

- `maxChars` — nombre maximum de caractères pour un seul message (par défaut : `3000` caractères)
- `mediaMaxMb` — limite de téléchargement/téléchargement de médias (par défaut : `20` Mo)
- `overflowPolicy` — comportement lorsque le message dépasse la limite : `"split"` (par défaut) ou `"stop"`

### Streaming

YuanBao prend en charge le flux de sortie au niveau du bloc. Lorsqu'elle est activée, le bot envoie le texte par morceaux au fur et à mesure de sa génération.

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

Contrôlez combien de messages historiques sont inclus dans le contexte de l'IA pour les discussions de groupe :

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

Contrôlez comment le bot cite les messages lorsqu'il répond dans les discussions de groupe :

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

### Injection d'indicateurs Markdown

Par défaut, le bot injecte des instructions dans le prompt système pour empêcher le modèle d'IA d'envelopper la totalité de la réponse dans des blocs de code markdown.

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

Utilisez `bindings` pour router les DMs ou groupes YuanBao vers différents agents.

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
- `match.peer.kind` : `"direct"` (DM) ou `"group"` (chat de groupe)
- `match.peer.id` : ID utilisateur ou code de groupe

---

## Référence de configuration

Configuration complète : [Configuration du Gateway](/fr/gateway/configuration)

| Paramètre                                  | Description                                                               | Par défaut                             |
| ------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | Activer/désactiver le channel                                             | `true`                                 |
| `channels.yuanbao.defaultAccount`          | Compte par défaut pour le routage sortant                                 | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | Clé d'application (utilisée pour la signature et la génération de ticket) | —                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | Secret d'application (utilisé pour la signature)                          | —                                      |
| `channels.yuanbao.accounts.<id>.token`     | Jeton pré-signé (ignore la signature automatique du ticket)               | —                                      |
| `channels.yuanbao.accounts.<id>.name`      | Nom d'affichage du compte                                                 | —                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | Activer/désactiver un compte spécifique                                   | `true`                                 |
| `channels.yuanbao.dm.policy`               | Politique de DM                                                           | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | Liste d'autorisation de DM (liste des ID utilisateur)                     | —                                      |
| `channels.yuanbao.requireMention`          | Exiger @mention dans les groupes                                          | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | Gestion des messages longs (`split` ou `stop`)                            | `split`                                |
| `channels.yuanbao.replyToMode`             | Stratégie de réponse de groupe (`off`, `first`, `all`)                    | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | Stratégie sortante (`merge-text` ou `immediate`)                          | `merge-text`                           |
| `channels.yuanbao.minChars`                | Merge-text : min caractères pour déclencher l'envoi                       | `2800`                                 |
| `channels.yuanbao.maxChars`                | Merge-text : max caractères par message                                   | `3000`                                 |
| `channels.yuanbao.idleMs`                  | Merge-text : délai d'inactivité avant vidage automatique (ms)             | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | Limite de taille des médias (Mo)                                          | `20`                                   |
| `channels.yuanbao.historyLimit`            | Entrées de contexte d'historique de groupe                                | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | Désactiver la sortie en streaming au niveau bloc                          | `false`                                |
| `channels.yuanbao.fallbackReply`           | Réponse de repli si l'IA ne renvoie aucun contenu                         | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | Injecter les instructions anti-retour à la ligne markdown                 | `true`                                 |
| `channels.yuanbao.debugBotIds`             | Liste blanche de IDs de bot de débogage (journaux non assainis)           | `[]`                                   |

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

- ✅ Texte (avec support markdown)
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo
- ✅ Autocollants

### Fils de discussion et réponses

- ✅ Réponses en citation (configurable via `replyToMode`)
- ❌ Réponses dans un fil (non pris en charge par la plateforme)

---

## Connexes

- [Aperçu des canaux](/fr/channels) — tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) — comportement de discussion de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
