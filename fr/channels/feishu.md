---
summary: "Vue d'ensemble, fonctionnalités et configuration du bot Feishu"
read_when:
  - Vous souhaitez connecter un bot Feishu/Lark
  - Vous configurez le channel Feishu
title: Feishu
---

# Bot Feishu

Feishu (Lark) est une plateforme de discussion d'équipe utilisée par les entreprises pour la messagerie et la collaboration. Ce plugin connecte OpenClaw à un bot Feishu/Lark en utilisant l'abonnement aux événements WebSocket de la plateforme, afin que les messages puissent être reçus sans exposer d'URL de webhook publique.

---

## Plugin inclus

Feishu est fourni avec les versions actuelles de OpenClaw, aucune installation de plugin séparée
n'est requise.

Si vous utilisez une version antérieure ou une installation personnalisée qui n'inclut pas Feishu
intégré, installez-le manuellement :

```bash
openclaw plugins install @openclaw/feishu
```

---

## Démarrage rapide

Il existe deux méthodes pour ajouter le channel Feishu :

### Méthode 1 : onboarding (recommandé)

Si vous venez d'installer OpenClaw, exécutez l'onboarding :

```bash
openclaw onboard
```

L'assistant vous guide à travers :

1. La création d'une application Feishu et la collecte des identifiants
2. La configuration des identifiants de l'application dans OpenClaw
3. Le démarrage de la passerelle

✅ **Après configuration**, vérifiez l'état de la passerelle :

- `openclaw gateway status`
- `openclaw logs --follow`

### Méthode 2 : Configuration CLI

Si vous avez déjà terminé l'installation initiale, ajoutez le channel via CLI :

```bash
openclaw channels add
```

Choisissez **Feishu**, puis entrez l'ID d'application (App ID) et le secret de l'application (App Secret).

✅ **Après configuration**, gérez la passerelle :

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## Étape 1 : Créer une application Feishu

### 1. Ouvrir la plateforme ouverte Feishu

Visitez [Feishu Open Platform](https://open.feishu.cn/app) et connectez-vous.

Les locataires Lark (mondial) doivent utiliser [https://open.larksuite.com/app](https://open.larksuite.com/app) et définir `domain: "lark"` dans la configuration Feishu.

### 2. Créer une application

1. Cliquez sur **Créer une application d'entreprise**
2. Remplissez le nom de l'application + description
3. Choisissez une icône d'application

![Créer une application d'entreprise](../images/feishu-step2-create-app.png)

### 3. Copier les identifiants

À partir de **Identifiants et informations de base**, copiez :

- **App ID** (format : `cli_xxx`)
- **App Secret**

❗ **Important :** gardez l'App Secret privé.

![Obtenir les identifiants](../images/feishu-step3-credentials.png)

### 4. Configurer les autorisations

Dans **Autorisations**, cliquez sur **Importation par lot** et collez :

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "cardkit:card:read",
      "cardkit:card:write",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "event:ip_list",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ],
    "user": ["aily:file:read", "aily:file:write", "im:chat.access_event.bot_p2p_chat:read"]
  }
}
```

![Configurer les autorisations](../images/feishu-step4-permissions.png)

### 5. Activer la capacité de bot

Dans **Capacité de l'application** > **Bot** :

1. Activer la capacité de bot
2. Définir le nom du bot

![Enable bot capability](../images/feishu-step5-bot-capability.png)

### 6. Configure event subscription

⚠️ **Important:** before setting event subscription, make sure:

1. You already ran `openclaw channels add` for Feishu
2. The gateway is running (`openclaw gateway status`)

In **Event Subscription**:

1. Choose **Use long connection to receive events** (WebSocket)
2. Add the event: `im.message.receive_v1`

⚠️ If the gateway is not running, the long-connection setup may fail to save.

![Configure event subscription](../images/feishu-step6-event-subscription.png)

### 7. Publish the app

1. Create a version in **Version Management & Release**
2. Submit for review and publish
3. Wait for admin approval (enterprise apps usually auto-approve)

---

## Step 2: Configure OpenClaw

### Configure with the wizard (recommended)

```bash
openclaw channels add
```

Choose **Feishu** and paste your App ID + App Secret.

### Configure via config file

Edit `~/.openclaw/openclaw.json`:

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          botName: "My AI assistant",
        },
      },
    },
  },
}
```

If you use `connectionMode: "webhook"`, set both `verificationToken` and `encryptKey`. The Feishu webhook server binds to `127.0.0.1` by default; set `webhookHost` only if you intentionally need a different bind address.

#### Verification Token and Encrypt Key (webhook mode)

When using webhook mode, set both `channels.feishu.verificationToken` and `channels.feishu.encryptKey` in your config. To get the values:

1. In Feishu Open Platform, open your app
2. Go to **Development** → **Events & Callbacks** (开发配置 → 事件与回调)
3. Open the **Encryption** tab (加密策略)
4. Copy **Verification Token** and **Encrypt Key**

The screenshot below shows where to find the **Verification Token**. The **Encrypt Key** is listed in the same **Encryption** section.

![Verification Token location](../images/feishu-verification-token.png)

### Configure via environment variables

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark (global) domain

If your tenant is on Lark (international), set the domain to `lark` (or a full domain string). You can set it at `channels.feishu.domain` or per account (`channels.feishu.accounts.<id>.domain`).

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

### Quota optimization flags

You can reduce Feishu API usage with two optional flags:

- `typingIndicator` (défaut `true`) : quand `false`, ignore les appels de réaction de frappe.
- `resolveSenderNames` (défaut `true`) : quand `false`, ignore les appels de recherche de profil de l'expéditeur.

Définissez-les au niveau supérieur ou par compte :

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          typingIndicator: true,
          resolveSenderNames: false,
        },
      },
    },
  },
}
```

---

## Étape 3 : Démarrer + tester

### 1. Démarrer la passerelle

```bash
openclaw gateway
```

### 2. Envoyer un message de test

Dans Feishu, trouvez votre bot et envoyez un message.

### 3. Approuver le jumelage

Par défaut, le bot répond avec un code de jumelage. Approuvez-le :

```bash
openclaw pairing approve feishu <CODE>
```

Après approbation, vous pouvez discuter normalement.

---

## Vue d'ensemble

- **Channel du bot Feishu** : bot Feishu géré par la passerelle
- **Routage déterministe** : les réponses retournent toujours à Feishu
- **Isolation de session** : les DMs partagent une session principale ; les groupes sont isolés
- **Connexion WebSocket** : connexion longue via le SDK Feishu, aucune URL publique nécessaire

---

## Contrôle d'accès

### Messages directs

- **Par défaut** : `dmPolicy: "pairing"` (les utilisateurs inconnus reçoivent un code de jumelage)
- **Approuver le jumelage** :

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **Mode liste blanche** : définissez `channels.feishu.allowFrom` avec les Open ID autorisés

### Discussions de groupe

**1. Politique de groupe** (`channels.feishu.groupPolicy`) :

- `"open"` = autoriser tout le monde dans les groupes (défaut)
- `"allowlist"` = autoriser uniquement `groupAllowFrom`
- `"disabled"` = désactiver les messages de groupe

**2. Exigence de mention** (`channels.feishu.groups.<chat_id>.requireMention`) :

- `true` = exiger @mention (défaut)
- `false` = répondre sans mentions

---

## Exemples de configuration de groupe

### Autoriser tous les groupes, exiger @mention (défaut)

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      // Default requireMention: true
    },
  },
}
```

### Autoriser tous les groupes, pas d'@mention requise

```json5
{
  channels: {
    feishu: {
      groups: {
        oc_xxx: { requireMention: false },
      },
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
      // Feishu group IDs (chat_id) look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### Limiter les expéditeurs pouvant envoyer des messages dans un groupe (liste blanche d'expéditeurs)

En plus d'autoriser le groupe lui-même, **tous les messages** de ce groupe sont filtrés par l'open_id de l'expéditeur : seuls les utilisateurs listés dans `groups.<chat_id>.allowFrom` voient leurs messages traités ; les messages des autres membres sont ignorés (il s'agit d'un filtrage complet au niveau de l'expéditeur, et pas seulement pour les commandes de contrôle comme /reset ou /new).

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // Feishu user IDs (open_id) look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

## Obtenir les IDs de groupe/utilisateur

### IDs de groupe (chat_id)

Les IDs de groupe ressemblent à `oc_xxx`.

**Méthode 1 (recommandée)**

1. Démarrez la passerelle et @mentionnez le bot dans le groupe
2. Exécutez `openclaw logs --follow` et recherchez `chat_id`

**Méthode 2**

Utilisez le débogueur API de Feishu pour lister les discussions de groupe.

### ID utilisateur (open_id)

Les ID utilisateur ressemblent à `ou_xxx`.

**Méthode 1 (recommandée)**

1. Démarrez la passerelle et envoyez un DM au bot
2. Exécutez `openclaw logs --follow` et recherchez `open_id`

**Méthode 2**

Vérifiez les demandes d'appariement pour les ID Open utilisateur :

```bash
openclaw pairing list feishu
```

---

## Commandes courantes

| Commande  | Description               |
| --------- | ------------------------- |
| `/status` | Afficher l'état du bot    |
| `/reset`  | Réinitialiser la session  |
| `/model`  | Afficher/changer de model |

> Remarque : Feishu ne prend pas encore en charge les menus de commandes natifs, les commandes doivent donc être envoyées sous forme de texte.

## Commandes de gestion du Gateway

| Commande                   | Description                                   |
| -------------------------- | --------------------------------------------- |
| `openclaw gateway status`  | Afficher l'état de la passerelle              |
| `openclaw gateway install` | Installer/démarrer le service de passerelle   |
| `openclaw gateway stop`    | Arrêter le service de passerelle              |
| `openclaw gateway restart` | Redémarrer le service de passerelle           |
| `openclaw logs --follow`   | Afficher les journaux de la passerelle (tail) |

---

## Dépannage

### Le bot ne répond pas dans les discussions de groupe

1. Assurez-vous que le bot est ajouté au groupe
2. Assurez-vous de @mentionner le bot (comportement par défaut)
3. Vérifiez que `groupPolicy` n'est pas défini sur `"disabled"`
4. Vérifiez les journaux : `openclaw logs --follow`

### Le bot ne reçoit pas de messages

1. Assurez-vous que l'application est publiée et approuvée
2. Assurez-vous que l'abonnement aux événements inclut `im.message.receive_v1`
3. Assurez-vous que la **connexion longue** est activée
4. Assurez-vous que les autorisations de l'application sont complètes
5. Assurez-vous que la passerelle est en cours d'exécution : `openclaw gateway status`
6. Vérifiez les journaux : `openclaw logs --follow`

### Fuite de la clé secrète de l'application

1. Réinitialisez la clé secrète de l'application (App Secret) sur la plateforme ouverte Feishu
2. Mettez à jour la clé secrète de l'application (App Secret) dans votre configuration
3. Redémarrez la passerelle

### Échecs de l'envoi de messages

1. Assurez-vous que l'application dispose de l'autorisation `im:message:send_as_bot`
2. Assurez-vous que l'application est publiée
3. Vérifiez les journaux pour des erreurs détaillées

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
          botName: "Primary bot",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          botName: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` contrôle quel compte Feishu est utilisé lorsque les API sortantes ne spécifient pas explicitement un `accountId`.

### Limites de messages

- `textChunkLimit` : taille du bloc de texte sortant (par défaut : 2000 caractères)
- `mediaMaxMb` : limite de téléchargement/téléchargement de médias (par défaut : 30 Mo)

### Streaming

Feishu prend en charge les réponses en continu via des cartes interactives. Lorsqu'il est activé, le bot met à jour une carte au fur et à mesure qu'il génère le texte.

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default true)
      blockStreaming: true, // enable block-level streaming (default true)
    },
  },
}
```

Définissez `streaming: false` pour attendre la réponse complète avant l'envoi.

### Sessions ACP

Feishu prend en charge l'ACP pour :

- DMs
- conversations de sujet de groupe

L'ACP Feishu est basé sur des commandes texte. Il n'y a pas de menus de commandes slash natifs, utilisez donc des messages `/acp ...` directement dans la conversation.

#### Liaisons ACP persistantes

Utilisez des liaisons ACP typées de premier niveau pour épingler un DM ou une conversation de sujet Feishu à une session ACP persistante.

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

#### Génération d'ACP liée à un fil à partir du chat

Dans un DM ou une conversation de sujet Feishu, vous pouvez générer et lier une session ACP sur place :

```text
/acp spawn codex --thread here
```

Notes :

- `--thread here` fonctionne pour les DMs et les sujets Feishu.
- Les messages de suivi dans le DM/sujet lié sont acheminés directement vers cette session ACP.
- La v1 ne cible pas les chats de groupe génériques sans sujet.

### Routage multi-agent

Utilisez `bindings` pour acheminer les DMs ou groupes Feishu vers différents agents.

```json5
{
  agents: {
    list: [
      { id: "main" },
      {
        id: "clawd-fan",
        workspace: "/home/user/clawd-fan",
        agentDir: "/home/user/.openclaw/agents/clawd-fan/agent",
      },
      {
        id: "clawd-xi",
        workspace: "/home/user/clawd-xi",
        agentDir: "/home/user/.openclaw/agents/clawd-xi/agent",
      },
    ],
  },
  bindings: [
    {
      agentId: "main",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "clawd-fan",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_yyy" },
      },
    },
    {
      agentId: "clawd-xi",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

Champs de routage :

- `match.channel` : `"feishu"`
- `match.peer.kind` : `"direct"` ou `"group"`
- `match.peer.id` : Open ID utilisateur (`ou_xxx`) ou ID de groupe (`oc_xxx`)

Voir [Obtenir les IDs de groupe/utilisateur](#get-groupuser-ids) pour des conseils de recherche.

---

## Référence de configuration

Configuration complète : [configuration Gateway](/fr/gateway/configuration)

Options principales :

| Paramètre                                         | Description                                     | Par défaut       |
| ------------------------------------------------- | ----------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Activer/désactiver le channel                   | `true`           |
| `channels.feishu.domain`                          | Domaine API (`feishu` ou `lark`)                | `feishu`         |
| `channels.feishu.connectionMode`                  | Mode de transport des événements                | `websocket`      |
| `channels.feishu.defaultAccount`                  | ID de compte par défaut pour le routage sortant | `default`        |
| `channels.feishu.verificationToken`               | Requis pour le mode webhook                     | -                |
| `channels.feishu.encryptKey`                      | Requis pour le mode webhook                     | -                |
| `channels.feishu.webhookPath`                     | Chemin de la route du Webhook                   | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Hôte de liaison du Webhook                      | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Port de liaison du Webhook                      | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | ID de l'application                             | -                |
| `channels.feishu.accounts.<id>.appSecret`         | Secret de l'application                         | -                |
| `channels.feishu.accounts.<id>.domain`            | Remplacement du domaine API par compte          | `feishu`         |
| `channels.feishu.dmPolicy`                        | Stratégie de DM                                 | `pairing`        |
| `channels.feishu.allowFrom`                       | Liste d'autorisation de DM (liste open_id)      | -                |
| `channels.feishu.groupPolicy`                     | Stratégie de groupe                             | `open`           |
| `channels.feishu.groupAllowFrom`                  | Liste d'autorisation de groupe                  | -                |
| `channels.feishu.groups.<chat_id>.requireMention` | Exiger @mention                                 | `true`           |
| `channels.feishu.groups.<chat_id>.enabled`        | Activer le groupe                               | `true`           |
| `channels.feishu.textChunkLimit`                  | Taille du bloc de message                       | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Limite de taille des médias                     | `30`             |
| `channels.feishu.streaming`                       | Activer la sortie de carte en continu           | `true`           |
| `channels.feishu.blockStreaming`                  | Activer le block streaming                      | `true`           |

---

## Référence dmPolicy

| Valeur        | Comportement                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `"pairing"`   | **Par défaut.** Les utilisateurs inconnus reçoivent un code de couplage ; doivent être approuvés |
| `"allowlist"` | Seuls les utilisateurs dans `allowFrom` peuvent chatter                                          |
| `"open"`      | Autoriser tous les utilisateurs (nécessite `"*"` dans allowFrom)                                 |
| `"disabled"`  | Désactiver les DMs                                                                               |

---

## Types de messages pris en charge

### Réception

- ✅ Texte
- ✅ Texte enrichi (post)
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo/médias
- ✅ Autocollants

### Envoi

- ✅ Texte
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo/médias
- ✅ Cartes interactives
- ⚠️ Texte enrichi (formatage de style post et cartes, pas les fonctionnalités d'édition Feishu arbitraires)

### Fils de discussion et réponses

- ✅ Réponses en ligne
- ✅ Réponses aux fils de sujets lorsque Feishu expose `reply_in_thread`
- ✅ Les réponses média restent conscientes du fil lors de la réponse à un message de fil/sujet

## Surface d'action d'exécution

Feishu expose actuellement ces actions d'exécution :

- `send`
- `read`
- `edit`
- `thread-reply`
- `pin`
- `list-pins`
- `unpin`
- `member-info`
- `channel-info`
- `channel-list`
- `react` et `reactions` lorsque les réactions sont activées dans la configuration

import fr from "/components/footer/fr.mdx";

<fr />
