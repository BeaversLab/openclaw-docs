---
summary: "Aperçu du bot Feishu, fonctionnalités et configuration"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# Bot Feishu

Feishu (Lark) est une plateforme de discussion d'équipe utilisée par les entreprises pour la messagerie et la collaboration. Ce plugin connecte OpenClaw à un bot Feishu/Lark en utilisant l'abonnement aux événements WebSocket de la plateforme, afin que les messages puissent être reçus sans exposer d'URL webhook publique.

---

## Plugin inclus

Feishu est fourni inclus avec les versions actuelles de OpenClaw, aucune installation de plugin séparée n'est requise.

Si vous utilisez une version ancienne ou une installation personnalisée qui n'inclut pas Feishu par défaut, installez-le manuellement :

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

1. La création d'une application Feishu et la collecte des informations d'identification
2. La configuration des identifiants de l'application dans OpenClaw
3. Le démarrage de la passerelle

✅ **Après configuration**, vérifiez l'état de la passerelle :

- `openclaw gateway status`
- `openclaw logs --follow`

### Méthode 2 : configuration CLI

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

Les clients Lark (mondial) doivent utiliser [https://open.larksuite.com/app](https://open.larksuite.com/app) et définir `domain: "lark"` dans la configuration Feishu.

### 2. Créer une application

1. Cliquez sur **Create enterprise app**
2. Remplissez le nom de l'application + la description
3. Choisissez une icône d'application

![Create enterprise app](/images/feishu-step2-create-app.png)

### 3. Copier les identifiants

Depuis **Credentials & Basic Info**, copiez :

- **App ID** (format : `cli_xxx`)
- **App Secret**

❗ **Important :** gardez l'App Secret privé.

![Get credentials](/images/feishu-step3-credentials.png)

### 4. Configurer les autorisations

Sous **Permissions** (Autorisations), cliquez sur **Batch import** (Importation par lot) et collez :

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

![Configure permissions](/images/feishu-step4-permissions.png)

### 5. Activer la capacité du bot

Dans **App Capability** (Capacité de l'application) > **Bot** :

1. Activer la capacité du bot
2. Définir le nom du bot

![Enable bot capability](/images/feishu-step5-bot-capability.png)

### 6. Configurer l'abonnement aux événements

⚠️ **Important :** avant de configurer l'abonnement aux événements, assurez-vous que :

1. Vous avez déjà exécuté `openclaw channels add` pour Feishu
2. La passerelle est en cours d'exécution (`openclaw gateway status`)

Dans **Event Subscription** (Abonnement aux événements) :

1. Choisissez **Use long connection to receive events** (Utiliser une connexion longue pour recevoir les événements) (WebSocket)
2. Ajoutez l'événement : `im.message.receive_v1`
3. (Optionnel) Pour les workflows de commentaires Drive, ajoutez également : `drive.notice.comment_add_v1`

⚠️ Si la passerelle n'est pas en cours d'exécution, la configuration de la connexion longue peut échouer lors de la sauvegarde.

![Configure event subscription](/images/feishu-step6-event-subscription.png)

### 7. Publier l'application

1. Créez une version dans **Version Management & Release**
2. Soumettez pour révision et publication
3. Attendez l'approbation de l'administrateur (les applications d'entreprise sont généralement approuvées automatiquement)

---

## Étape 2 : Configurer OpenClaw

### Configurer avec l'assistant (recommandé)

```bash
openclaw channels add
```

Choisissez **Feishu** et collez votre App ID + App Secret.

### Configurer via le fichier de configuration

Modifiez `~/.openclaw/openclaw.json` :

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
          name: "My AI assistant",
        },
      },
    },
  },
}
```

Si vous utilisez `connectionMode: "webhook"`, définissez `verificationToken` et `encryptKey`. Le serveur webhook Feishu se lie à `127.0.0.1` par défaut ; ne définissez `webhookHost` que si vous avez intentionnellement besoin d'une adresse de liaison différente.

#### Jeton de vérification et clé de chiffrement (mode webhook)

Lorsque vous utilisez le mode webhook, définissez `channels.feishu.verificationToken` et `channels.feishu.encryptKey` dans votre configuration. Pour obtenir les valeurs :

1. Sur Feishu Open Platform, ouvrez votre application
2. Allez dans **Development** → **Events & Callbacks** (开发配置 → 事件与回调)
3. Ouvrez l'onglet **Encryption** (加密策略)
4. Copiez le **Verification Token** et la **Encrypt Key**

La capture d'écran ci-dessous indique où trouver le **Jeton de vérification**. La **Clé de chiffrement** est répertoriée dans la même section **Chiffrement**.

![Verification Token location](/images/feishu-verification-token.png)

### Configurer via des variables d'environnement

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Domaine Lark (mondial)

Si votre client utilise Lark (international), définissez le domaine sur `lark` (ou une chaîne de domaine complète). Vous pouvez le définir au niveau `channels.feishu.domain` ou par compte (`channels.feishu.accounts.<id>.domain`).

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

### Indicateurs d'optimisation du quota

Vous pouvez réduire l'utilisation de l'API Feishu avec deux indicateurs optionnels :

- `typingIndicator` (par défaut `true`) : lorsque `false`, ignore les appels de réaction de frappe.
- `resolveSenderNames` (par défaut `true`) : lorsque `false`, ignore les appels de recherche de profil de l'expéditeur.

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

### 3. Approuver l'appariement

Par défaut, le bot répond avec un code d'appariement. Approuvez-le :

```bash
openclaw pairing approve feishu <CODE>
```

Après approbation, vous pouvez chatter normalement.

---

## Vue d'ensemble

- **Channel de bot Feishu** : Bot Feishu géré par la passerelle
- **Routage déterministe** : les réponses retournent toujours à Feishu
- **Isolation de session** : les DMs partagent une session principale ; les groupes sont isolés
- **Connexion WebSocket** : connexion longue via le SDK Feishu, aucune URL publique nécessaire

---

## Contrôle d'accès

### Messages directs

- **Par défaut** : `dmPolicy: "pairing"` (les utilisateurs inconnus reçoivent un code d'appariement)
- **Approuver l'appariement** :

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **Mode liste blanche** : définissez `channels.feishu.allowFrom` avec les Open ID autorisés

### Discussions de groupe

**1. Stratégie de groupe** (`channels.feishu.groupPolicy`) :

- `"open"` = autoriser tout le monde dans les groupes
- `"allowlist"` = autoriser uniquement `groupAllowFrom`
- `"disabled"` = désactiver les messages de groupe

Par défaut : `allowlist`

**2. Exigence de mention** (`channels.feishu.requireMention`, remplaçable via `channels.feishu.groups.<chat_id>.requireMention`) :

- `true` explicite = nécessite une @mention
- `false` explicite = répondre sans mentions
- lorsque non défini et `groupPolicy: "open"` = valeur par défaut `false`
- lorsque non défini et `groupPolicy` n'est pas `"open"` = valeur par défaut `true`

---

## Exemples de configuration de groupe

### Autoriser tous les groupes, aucune @mention requise (par défaut pour les groupes ouverts)

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### Autoriser tous les groupes, mais exiger tout de même une @mention

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
      // Feishu group IDs (chat_id) look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### Restreindre les expéditeurs pouvant envoyer des messages dans un groupe (liste d'autorisation des expéditeurs)

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

<a id="get-groupuser-ids"></a>

## Obtenir les IDs de groupe/utilisateur

### IDs de groupe (chat_id)

Les IDs de groupe ressemblent à `oc_xxx`.

**Méthode 1 (recommandée)**

1. Démarrez la passerelle et @mentionnez le bot dans le groupe
2. Exécutez `openclaw logs --follow` et recherchez `chat_id`

**Méthode 2**

Utilisez le débogueur d'API Feishu pour lister les discussions de groupe.

### IDs utilisateur (open_id)

Les IDs utilisateur ressemblent à `ou_xxx`.

**Méthode 1 (recommandée)**

1. Démarrez la passerelle et envoyez un message privé (DM) au bot
2. Exécutez `openclaw logs --follow` et recherchez `open_id`

**Méthode 2**

Vérifiez les demandes d'appariement pour les Open ID des utilisateurs :

```bash
openclaw pairing list feishu
```

---

## Commandes courantes

| Commande  | Description                |
| --------- | -------------------------- |
| `/status` | Afficher le statut du bot  |
| `/reset`  | Réinitialiser la session   |
| `/model`  | Afficher/changer de modèle |

> Remarque : Feishu ne prend pas encore en charge les menus de commandes natifs, les commandes doivent donc être envoyées sous forme de texte.

## Commandes de gestion de la passerelle

| Commande                   | Description                                 |
| -------------------------- | ------------------------------------------- |
| `openclaw gateway status`  | Afficher le statut de la passerelle         |
| `openclaw gateway install` | Installer/démarrer le service de passerelle |
| `openclaw gateway stop`    | Arrêter le service de passerelle            |
| `openclaw gateway restart` | Redémarrer le service de passerelle         |
| `openclaw logs --follow`   | Suivre les journaux de la passerelle        |

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
4. Assurez-vous que les permissions de l'application sont complètes
5. Assurez-vous que la passerelle fonctionne : `openclaw gateway status`
6. Vérifiez les journaux : `openclaw logs --follow`

### Fuite de la clé secrète de l'application

1. Réinitialisez la clé secrète de l'application dans la Feishu Open Platform
2. Mettez à jour la clé secrète de l'application dans votre configuration
3. Redémarrez la passerelle

### Échecs d'envoi de messages

1. Assurez-vous que l'application dispose de la permission `im:message:send_as_bot`
2. Assurez-vous que l'application est publiée
3. Consultez les journaux pour obtenir des erreurs détaillées

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

`defaultAccount` contrôle le compte Feishu utilisé lorsque les API sortantes ne spécifient pas explicitement un `accountId`.

### Limites de messages

- `textChunkLimit` : taille du bloc de texte sortant (par défaut : 2000 caractères)
- `mediaMaxMb` : limite de téléchargement/téléchargement de médias (par défaut : 30 Mo)

### Streaming

Feishu prend en charge les réponses en streaming via des cartes interactives. Lorsque cette fonction est activée, le bot met à jour une carte au fur et à mesure qu'il génère du texte.

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

Feishu prend en charge l'ACP pour :

- DMs
- conversations par sujet de groupe

L'ACP Feishu est piloté par des commandes texte. Il n'y a pas de menus de commandes slash natifs, utilisez donc les messages `/acp ...` directement dans la conversation.

#### Liaisons ACP persistantes

Utilisez des liaisons ACP typées de premier niveau pour épingler un DM ou une conversation par sujet Feishu à une session ACP persistante.

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

#### Génération d'ACP liée à un fil depuis le chat

Dans un DM ou une conversation par sujet Feishu, vous pouvez générer et lier une session ACP sur place :

```text
/acp spawn codex --thread here
```

Notes :

- `--thread here` fonctionne pour les DMs et les sujets Feishu.
- Les messages de suivi dans le DM/sujet lié sont routés directement vers cette session ACP.
- La v1 ne cible pas les conversations de groupe génériques sans sujet.

### Routage multi-agent

Utilisez `bindings` pour router les DMs ou groupes Feishu vers différents agents.

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

Champs de routage :

- `match.channel` : `"feishu"`
- `match.peer.kind` : `"direct"` ou `"group"`
- `match.peer.id` : identifiant utilisateur Open ID (`ou_xxx`) ou identifiant de groupe (`oc_xxx`)

Voir [Get group/user IDs](#get-groupuser-ids) pour des conseils de recherche.

---

## Référence de configuration

Configuration complète : [Gateway configuration](/en/gateway/configuration)

Options clés :

| Paramètre                                         | Description                                              | Par défaut       |
| ------------------------------------------------- | -------------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Activer/désactiver le channel                            | `true`           |
| `channels.feishu.domain`                          | Domaine API (`feishu` ou `lark`)                         | `feishu`         |
| `channels.feishu.connectionMode`                  | Mode de transport des événements                         | `websocket`      |
| `channels.feishu.defaultAccount`                  | Identifiant de compte par défaut pour le routage sortant | `default`        |
| `channels.feishu.verificationToken`               | Requis pour le mode webhook                              | -                |
| `channels.feishu.encryptKey`                      | Requis pour le mode webhook                              | -                |
| `channels.feishu.webhookPath`                     | Chemin de la route du webhook                            | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Hôte de liaison du webhook                               | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Port de liaison du webhook                               | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | ID de l'application                                      | -                |
| `channels.feishu.accounts.<id>.appSecret`         | Secret de l'application                                  | -                |
| `channels.feishu.accounts.<id>.domain`            | Remplacement du domaine API par compte                   | `feishu`         |
| `channels.feishu.dmPolicy`                        | Stratégie DM                                             | `pairing`        |
| `channels.feishu.allowFrom`                       | Liste blanche DM (liste open_id)                         | -                |
| `channels.feishu.groupPolicy`                     | Stratégie de groupe                                      | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | Liste blanche de groupe                                  | -                |
| `channels.feishu.requireMention`                  | Exiger @mention par défaut                               | conditionnel     |
| `channels.feishu.groups.<chat_id>.requireMention` | Remplacement de l'exigence @mention par groupe           | hérité           |
| `channels.feishu.groups.<chat_id>.enabled`        | Activer le groupe                                        | `true`           |
| `channels.feishu.textChunkLimit`                  | Taille du bloc de message                                | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Limite de taille du média                                | `30`             |
| `channels.feishu.streaming`                       | Activer la sortie de carte en continu                    | `true`           |
| `channels.feishu.blockStreaming`                  | Activer le block streaming                               | `true`           |

---

## Référence de dmPolicy

| Valeur        | Comportement                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `"pairing"`   | **Par défaut.** Les utilisateurs inconnus reçoivent un code d'appariement ; doivent être approuvés |
| `"allowlist"` | Seuls les utilisateurs dans `allowFrom` peuvent chatter                                            |
| `"open"`      | Autoriser tous les utilisateurs (nécessite `"*"` dans allowFrom)                                   |
| `"disabled"`  | Désactiver les DMs                                                                                 |

---

## Types de messages pris en charge

### Recevoir

- ✅ Text
- ✅ Texte enrichi (post)
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo/médias
- ✅ Autocollants

### Envoyer

- ✅ Texte
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo/médias
- ✅ Cartes interactives
- ⚠️ Texte enrichi (formatage de style post et cartes, pas les fonctionnalités d'édition arbitraires de Feishu)

### Fils de discussion et réponses

- ✅ Réponses en ligne
- ✅ Réponses aux fils de discussion par sujet lorsque Feishu expose `reply_in_thread`
- ✅ Les réponses média gardent le fil en tête lors d'une réponse à un message de fil/sujet

## Commentaires Drive

Feishu peut déclencher l'agent lorsque quelqu'un ajoute un commentaire sur un document Feishu Drive (Docs, Sheets,
etc.). L'agent reçoit le texte du commentaire, le contexte du document et le fil de commentaires afin qu'il puisse
répondre dans le fil ou apporter des modifications au document.

Exigences :

- S'abonner à `drive.notice.comment_add_v1` dans les paramètres d'abonnement aux événements de votre application Feishu
  (en plus de l'`im.message.receive_v1` existant)
- Le tool Drive est activé par défaut ; désactivez-le avec `channels.feishu.tools.drive: false`

Le tool `feishu_drive` expose ces actions de commentaire :

| Action                 | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `list_comments`        | Lister les commentaires sur un document          |
| `list_comment_replies` | Lister les réponses dans un fil de commentaires  |
| `add_comment`          | Ajouter un nouveau commentaire de premier niveau |
| `reply_comment`        | Répondre à un fil de commentaires existant       |

Lorsque l'agent gère un événement de commentaire Drive, il reçoit :

- le texte du commentaire et l'expéditeur
- les métadonnées du document (titre, type, URL)
- le contexte du fil de commentaires pour les réponses dans le fil

Après avoir apporté des modifications au document, l'agent est guidé pour utiliser `feishu_drive.reply_comment` pour notifier le
commentateur, puis produire le jeton silencieux exact `NO_REPLY` / `no_reply` pour
éviter les envois en double.

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
- `feishu_drive` actions de commentaire : `list_comments`, `list_comment_replies`, `add_comment`, `reply_comment`

## Connexes

- [Channels Overview](/en/channels) — tous les canaux pris en charge
- [Pairing](/en/channels/pairing) — authentification par DM et processus d'appairage
- [Groups](/en/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Channel Routing](/en/channels/channel-routing) — routage de session pour les messages
- [Security](/en/gateway/security) — modèle d'accès et durcissement
