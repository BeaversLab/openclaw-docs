---
summary: "Aperçu du bot Feishu, fonctionnalités et configuration"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# Feishu / Lark

Feishu/Lark est une plateforme de collaboration tout-en-un où les équipes discutent, partagent des documents, gèrent des calendriers et travaillent ensemble.

**Statut :** prêt pour la production pour les messages directs (DMs) de bot + conversations de groupe. WebSocket est le mode par défaut ; le mode webhook est optionnel.

---

## Quick start

> **Nécessite OpenClaw 2026.4.10 ou supérieur.** Exécutez `openclaw --version` pour vérifier. Mettez à niveau avec `openclaw update`.

<Steps>
  <Step title="Exécutez l'assistant de configuration du canal">```bash openclaw channels login --channel feishu ``` Scannez le code QR avec votre application mobile Feishu/Lark pour créer automatiquement un bot Feishu/Lark.</Step>

  <Step title="Une fois la configuration terminée, redémarrez la passerelle pour appliquer les modifications">```bash openclaw gateway restart ```</Step>
</Steps>

---

## Contrôle d'accès

### Messages directs

Configurez `dmPolicy` pour contrôler qui peut envoyer un message privé au bot :

- `"pairing"` — les utilisateurs inconnus reçoivent un code de jumelage ; approuver via CLI
- `"allowlist"` — seuls les utilisateurs répertoriés dans `allowFrom` peuvent chatter (par défaut : seul le propriétaire du bot)
- `"open"` — autoriser tous les utilisateurs
- `"disabled"` — désactiver tous les messages directs

**Approuver une demande de jumelage :**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### Conversations de groupe

**Stratégie de groupe** (`channels.feishu.groupPolicy`) :

| Valeur        | Comportement                                          |
| ------------- | ----------------------------------------------------- |
| `"open"`      | Répondre à tous les messages dans les groupes         |
| `"allowlist"` | Répondre uniquement aux groupes dans `groupAllowFrom` |
| `"disabled"`  | Désactiver tous les messages de groupe                |

Par défaut : `allowlist`

**Exigence de mention** (`channels.feishu.requireMention`) :

- `true` — exiger une mention (@mention) (par défaut)
- `false` — répondre sans @mention
- Remplacement par groupe : `channels.feishu.groups.<chat_id>.requireMention`

---

## Exemples de configuration de groupe

### Autoriser tous les groupes, aucune @mention requise

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
      // Group IDs look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
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

## Obtenir les ID de groupe/utilisateur

### Identifiants de groupe (`chat_id`, format : `oc_xxx`)

Ouvrez le groupe dans Feishu/Lark, cliquez sur l'icône de menu dans le coin supérieur droit et allez dans **Paramètres**. L'identifiant du groupe (`chat_id`) est répertorié sur la page des paramètres.

![Obtenir l'identifiant du groupe](/images/feishu-get-group-id.png)

### Identifiants utilisateur (`open_id`, format : `ou_xxx`)

Démarrez la passerelle, envoyez un DM au bot, puis vérifiez les logs :

```bash
openclaw logs --follow
```

Recherchez `open_id` dans la sortie des logs. Vous pouvez également vérifier les demandes d'appariement en attente :

```bash
openclaw pairing list feishu
```

---

## Commandes courantes

| Commande  | Description                       |
| --------- | --------------------------------- |
| `/status` | Afficher l'état du bot            |
| `/reset`  | Réinitialiser la session actuelle |
| `/model`  | Afficher ou changer le model IA   |

> Feishu/Lark ne prend pas en charge les menus natifs de commandes slash, envoyez-les donc sous forme de messages texte brut.

---

## Dépannage

### Le bot ne répond pas dans les discussions de groupe

1. Assurez-vous que le bot est ajouté au groupe
2. Assurez-vous de @mentionner le bot (requis par défaut)
3. Vérifiez que `groupPolicy` n'est pas `"disabled"`
4. Vérifiez les logs : `openclaw logs --follow`

### Le bot ne reçoit pas de messages

1. Assurez-vous que le bot est publié et approuvé dans la Feishu Open Platform / Lark Developer
2. Assurez-vous que l'abonnement aux événements inclut `im.message.receive_v1`
3. Assurez-vous que la **connexion persistante** (WebSocket) est sélectionnée
4. Assurez-vous que toutes les étendues d'autorisation requises sont accordées
5. Assurez-vous que la passerelle est en cours d'exécution : `openclaw gateway status`
6. Vérifiez les logs : `openclaw logs --follow`

### Fuite de la clé secrète de l'application (App Secret)

1. Réinitialisez la clé secrète de l'application (App Secret) dans la Feishu Open Platform / Lark Developer
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

`defaultAccount` contrôle le compte utilisé lorsque les API sortantes ne spécifient pas `accountId`.

### Limites de messages

- `textChunkLimit` — taille du bloc de texte sortant (par défaut : `2000` caractères)
- `mediaMaxMb` — limite de téléchargement/téléchargement de médias (par défaut : `30` Mo)

### Streaming

Feishu/Lark prend en charge les réponses en continu via des cartes interactives. Lorsque cette fonctionnalité est activée, le bot met à jour la carte en temps réel lors de la génération du texte.

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default: true)
      blockStreaming: true, // enable block-level streaming (default: true)
    },
  },
}
```

Définissez `streaming: false` pour envoyer la réponse complète en un seul message.

### Optimisation du quota

Réduisez le nombre d'appels à l'API Feishu/Lark avec deux indicateurs facultatifs :

- `typingIndicator` (par défaut `true`) : définissez `false` pour ignorer les appels de réaction de frappe
- `resolveSenderNames` (par défaut `true`) : définissez `false` pour ignorer les recherches de profil d'expéditeur

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

Feishu/Lark prend en charge l'ACP pour les DMs et les messages de fil de groupe. L'ACP Feishu/Lark est piloté par des commandes texte — il n'y a pas de menus de commandes slash natifs, utilisez donc directement les messages `/acp ...` dans la conversation.

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

#### Lancer une session ACP depuis le chat

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
- `match.peer.kind` : `"direct"` (DM) ou `"group"` (chat de groupe)
- `match.peer.id` : Open ID de l'utilisateur (`ou_xxx`) ou ID de groupe (`oc_xxx`)

Voir [Obtenir les IDs de groupe/utilisateur](#get-groupuser-ids) pour des conseils de recherche.

---

## Référence de configuration

Configuration complète : [Configuration du Gateway](/en/gateway/configuration)

| Paramètre                                         | Description                                       | Par défaut       |
| ------------------------------------------------- | ------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Activer/désactiver le channel                     | `true`           |
| `channels.feishu.domain`                          | Domaine API (`feishu` ou `lark`)                  | `feishu`         |
| `channels.feishu.connectionMode`                  | Transport d'événements (`websocket` ou `webhook`) | `websocket`      |
| `channels.feishu.defaultAccount`                  | Compte par défaut pour le routage sortant         | `default`        |
| `channels.feishu.verificationToken`               | Requis pour le mode webhook                       | —                |
| `channels.feishu.encryptKey`                      | Requis pour le mode webhook                       | —                |
| `channels.feishu.webhookPath`                     | Chemin de routage du webhook                      | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Hôte de liaison du webhook                        | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Port de liaison du webhook                        | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | ID de l'application                               | —                |
| `channels.feishu.accounts.<id>.appSecret`         | Secret de l'application                           | —                |
| `channels.feishu.accounts.<id>.domain`            | Remplacement de domaine par compte                | `feishu`         |
| `channels.feishu.dmPolicy`                        | Stratégie de DM                                   | `allowlist`      |
| `channels.feishu.allowFrom`                       | Liste blanche de DM (liste open_id)               | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | Stratégie de groupe                               | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | Liste blanche de groupe                           | —                |
| `channels.feishu.requireMention`                  | Exiger @mention dans les groupes                  | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | Remplacement de @mention par groupe               | hérité           |
| `channels.feishu.groups.<chat_id>.enabled`        | Activer/désactiver un groupe spécifique           | `true`           |
| `channels.feishu.textChunkLimit`                  | Taille des blocs de message                       | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Limite de taille des médias                       | `30`             |
| `channels.feishu.streaming`                       | Sortie de carte en continu                        | `true`           |
| `channels.feishu.blockStreaming`                  | Flux continu au niveau du bloc                    | `true`           |
| `channels.feishu.typingIndicator`                 | Envoyer des réactions de frappe                   | `true`           |
| `channels.feishu.resolveSenderNames`              | Résoudre les noms d'affichage de l'expéditeur     | `true`           |

---

## Types de messages pris en charge

### Recevoir

- ✅ Texte
- ✅ Texte riche (publication)
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
- ✅ Cartes interactives (y compris les mises à jour en continu)
- ⚠️ Texte riche (formatage de style publication; ne prend pas en charge toutes les fonctionnalités d'édition Feishu/Lark)

### Fils de discussion et réponses

- ✅ Réponses en ligne
- ✅ Réponses dans les fils
- ✅ Les réponses médias restent conscientes du fil lors d'une réponse à un message de fil

---

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appairage](/en/channels/pairing) — flux d'authentification et d'appariement DM
- [Groupes](/en/channels/groups) — comportement des discussions de groupe et filtrage par mention
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
