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

> **Nécessite OpenClaw 2026.4.10 ou supérieur.** Exécutez `openclaw --version` pour vérifier. Effectuez une mise à niveau avec `openclaw update`.

<Steps>
  <Step title="Exécutez l'assistant de configuration du canal">```bash openclaw channels login --channel feishu ``` Scannez le code QR avec votre application mobile Feishu/Lark pour créer automatiquement un bot Feishu/Lark.</Step>

  <Step title="Une fois la configuration terminée, redémarrez la passerelle pour appliquer les modifications">```bash openclaw gateway restart ```</Step>
</Steps>

---

## Contrôle d'accès

### Messages directs

Configurez `dmPolicy` pour contrôler qui peut envoyer un DM au bot :

- `"pairing"` — les utilisateurs inconnus reçoivent un code d'appariement ; approuvez via CLI
- `"allowlist"` — seuls les utilisateurs répertoriés dans `allowFrom` peuvent chatter (par défaut : seul le propriétaire du bot)
- `"open"` — autoriser tous les utilisateurs
- `"disabled"` — désactiver tous les DMs

**Approuver une demande de jumelage :**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### Conversations de groupe

**Stratégie de groupe** (`channels.feishu.groupPolicy`) :

| Valeur        | Comportement                                        |
| ------------- | --------------------------------------------------- |
| `"open"`      | Répondre à tous les messages dans les groupes       |
| `"allowlist"` | Répondre uniquement aux groupes de `groupAllowFrom` |
| `"disabled"`  | Désactiver tous les messages de groupe              |

Par défaut : `allowlist`

**Condition de mention** (`channels.feishu.requireMention`) :

- `true` — nécessite @mention (par défaut)
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

<a id="get-groupuser-ids"></a>

## Obtenir les identifiants de groupe/utilisateur

### Identifiants de groupe (`chat_id`, format : `oc_xxx`)

Ouvrez le groupe dans Feishu/Lark, cliquez sur l'icône de menu dans le coin supérieur droit et accédez à **Paramètres**. L'identifiant du groupe (`chat_id`) est répertorié sur la page des paramètres.

![Obtenir l'identifiant de groupe](/images/feishu-get-group-id.png)

### Identifiants utilisateur (`open_id`, format : `ou_xxx`)

Démarrez la passerelle, envoyez un DM au bot, puis vérifiez les journaux :

```bash
openclaw logs --follow
```

Recherchez `open_id` dans la sortie du journal. Vous pouvez également vérifier les demandes d'appariement en attente :

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

> Feishu/Lark ne prend pas en charge les menus de commandes slash natifs, envoyez-les donc sous forme de messages texte brut.

---

## Dépannage

### Le bot ne répond pas dans les discussions de groupe

1. Assurez-vous que le bot est ajouté au groupe
2. Assurez-vous de faire @mention au bot (requis par défaut)
3. Vérifiez que `groupPolicy` n'est pas `"disabled"`
4. Vérifiez les journaux : `openclaw logs --follow`

### Le bot ne reçoit pas de messages

1. Assurez-vous que le bot est publié et approuvé dans Feishu Open Platform / Lark Developer
2. Assurez-vous que l'abonnement aux événements inclut `im.message.receive_v1`
3. Assurez-vous que la **connexion persistante** (WebSocket) est sélectionnée
4. Assurez-vous que toutes les étendues de permission requises sont accordées
5. Assurez-vous que la passerelle est en cours d'exécution : `openclaw gateway status`
6. Vérifiez les journaux : `openclaw logs --follow`

### App Secret divulgué

1. Réinitialisez l'App Secret dans Feishu Open Platform / Lark Developer
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

Feishu/Lark prend en charge les réponses en streaming via des cartes interactives. Lorsqu'elle est activée, le bot met à jour la carte en temps réel lors de la génération du texte.

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

Réduisez le nombre d'appels à l'API Feishu/Lark avec deux indicateurs optionnels :

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

`--thread here` fonctionne pour les DMs et les messages de fil Feishu/Lark. Les messages de suivi dans la conversation liée sont routés directement vers cette session ACP.

### Routage multi-agent

Utilisez `bindings` pour router les DMs ou groupes Feishu/Lark vers différents agents.

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
- `match.peer.kind` : `"direct"` (DM) ou `"group"` (discussion de groupe)
- `match.peer.id` : identifiant Open ID de l'utilisateur (`ou_xxx`) ou identifiant de groupe (`oc_xxx`)

Voir [Obtenir les identifiants de groupe/d'utilisateur](#get-groupuser-ids) pour des conseils de recherche.

---

## Référence de configuration

Configuration complète : [Configuration du Gateway](/fr/gateway/configuration)

| Paramètre                                         | Description                                       | Par défaut       |
| ------------------------------------------------- | ------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Activer/désactiver le channel                     | `true`           |
| `channels.feishu.domain`                          | Domaine API (`feishu` ou `lark`)                  | `feishu`         |
| `channels.feishu.connectionMode`                  | Transport d'événements (`websocket` ou `webhook`) | `websocket`      |
| `channels.feishu.defaultAccount`                  | Compte par défaut pour le routage sortant         | `default`        |
| `channels.feishu.verificationToken`               | Requis pour le mode webhook                       | —                |
| `channels.feishu.encryptKey`                      | Requis pour le mode webhook                       | —                |
| `channels.feishu.webhookPath`                     | Chemin de route webhook                           | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Hôte de liaison webhook                           | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Port de liaison webhook                           | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | ID d'application                                  | —                |
| `channels.feishu.accounts.<id>.appSecret`         | Secret d'application                              | —                |
| `channels.feishu.accounts.<id>.domain`            | Remplacement de domaine par compte                | `feishu`         |
| `channels.feishu.dmPolicy`                        | Stratégie DM                                      | `allowlist`      |
| `channels.feishu.allowFrom`                       | Liste d'autorisation DM (liste des open_id)       | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | Stratégie de groupe                               | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | Liste d'autorisation de groupe                    | —                |
| `channels.feishu.requireMention`                  | Exiger une @mention dans les groupes              | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | Remplacement d'@mention par groupe                | hérité           |
| `channels.feishu.groups.<chat_id>.enabled`        | Activer/désactiver un groupe spécifique           | `true`           |
| `channels.feishu.textChunkLimit`                  | Taille du bloc de message                         | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Limite de taille des médias                       | `30`             |
| `channels.feishu.streaming`                       | Sortie de carte en continu                        | `true`           |
| `channels.feishu.blockStreaming`                  | Continu au niveau bloc                            | `true`           |
| `channels.feishu.typingIndicator`                 | Envoyer les réactions de frappe                   | `true`           |
| `channels.feishu.resolveSenderNames`              | Résoudre les noms d'affichage de l'expéditeur     | `true`           |

---

## Types de messages pris en charge

### Recevoir

- ✅ Texte
- ✅ Texte riche (post)
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
- ⚠️ Texte riche (formatage de style post ; ne prend pas en charge toutes les fonctionnalités de création Feishu/Lark)

### Fils de discussion et réponses

- ✅ Réponses en ligne
- ✅ Réponses dans le fil
- ✅ Les réponses média conservent le contexte du fil lors d'une réponse à un message de fil

---

## Connexes

- [Présentation des canaux](/fr/channels) — tous les canaux pris en charge
- [Appairage](/fr/channels/pairing) — flux d'authentification et d'appairage DM
- [Groupes](/fr/channels/groups) — comportement de la conversation de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
