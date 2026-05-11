---
summary: "Aperçu du bot Feishu, fonctionnalités et configuration"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# Feishu / Lark

Feishu/Lark est une plateforme de collaboration tout-en-un où les équipes discutent, partagent des documents, gèrent des calendriers et travaillent ensemble.

**Statut :** prêt pour la production pour les DMs de bot + discussions de groupe. WebSocket est le mode par défaut ; le mode webhook est facultatif.

---

## Quick start

<Note>Nécessite OpenClaw 2026.4.25 ou supérieur. Exécutez `openclaw --version` pour vérifier. Mettez à niveau avec `openclaw update`.</Note>

<Steps>
  <Step title="Exécutez l'assistant de configuration du channel">```bash openclaw channels login --channel feishu ``` Scannez le code QR avec votre application mobile Feishu/Lark pour créer automatiquement un bot Feishu/Lark.</Step>

  <Step title="Une fois la configuration terminée, redémarrez la passerelle pour appliquer les modifications">```bash openclaw gateway restart ```</Step>
</Steps>

---

## Contrôle d'accès

### Messages directs

Configurez `dmPolicy` pour contrôler qui peut envoyer un DM au bot :

- `"pairing"` — les utilisateurs inconnus reçoivent un code de couplage ; approuvez via CLI
- `"allowlist"` — seuls les utilisateurs répertoriés dans `allowFrom` peuvent discuter (par défaut : uniquement le propriétaire du bot)
- `"open"` — autoriser tous les utilisateurs
- `"disabled"` — désactiver tous les DMs

**Approuver une demande de couplage :**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### Discussions de groupe

**Stratégie de groupe** (`channels.feishu.groupPolicy`) :

| Valeur        | Comportement                                          |
| ------------- | ----------------------------------------------------- |
| `"open"`      | Répondre à tous les messages dans les groupes         |
| `"allowlist"` | Répondre uniquement aux groupes dans `groupAllowFrom` |
| `"disabled"`  | Désactiver tous les messages de groupe                |

Par défaut : `allowlist`

**Exigence de mention** (`channels.feishu.requireMention`) :

- `true` — exiger @mention (par défaut)
- `false` — répondre sans @mention
- Remplacement par groupe : `channels.feishu.groups.<chat_id>.requireMention`
- Les `@all` et `@_all` uniquement diffusion ne sont pas traités comme des mentions de bot. Un message qui mentionne à la fois `@all` et le bot directement compte toujours comme une mention de bot.

---

## Exemples de configuration de groupe

### Autoriser tous les groupes, pas de @mention requise

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

### IDs de groupe (`chat_id`, format : `oc_xxx`)

Ouvrez le groupe dans Feishu/Lark, cliquez sur l'icône de menu dans le coin supérieur droit et allez dans **Paramètres**. L'ID de groupe (`chat_id`) est listé sur la page des paramètres.

![Obtenir l'ID de groupe](/images/feishu-get-group-id.png)

### IDs utilisateur (`open_id`, format : `ou_xxx`)

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
4. Vérifiez les logs : `openclaw logs --follow`

### Le bot ne reçoit pas de messages

1. Assurez-vous que le bot est publié et approuvé dans Feishu Open Platform / Lark Developer
2. Assurez-vous que l'abonnement aux événements inclut `im.message.receive_v1`
3. Assurez-vous que la **connexion persistante** (WebSocket) est sélectionnée
4. Assurez-vous que toutes les portées d'autorisation requises sont accordées
5. Assurez-vous que la passerelle est en cours d'exécution : `openclaw gateway status`
6. Vérifiez les logs : `openclaw logs --follow`

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

`defaultAccount` contrôle le compte utilisé lorsque les API sortantes ne spécifient pas de `accountId`.
`accounts.<id>.tts` utilise la même structure que `messages.tts` et fusionne profondément avec la
cconfiguration TTS globale, permettant aux configurations multi-bots Feishu de conserver des informations d'identification de fournisseur partagées globalement tout en remplaçant uniquement la voix, le modèle, le personnage ou le mode automatique
par compte.

### Limites de messages

- `textChunkLimit` — taille du bloc de texte sortant (par défaut : `2000` caractères)
- `mediaMaxMb` — limite de téléchargement/téléversement de médias (par défaut : `30` Mo)

### Streaming

Feishu/Lark prend en charge les réponses en streaming via des cartes interactives. Lorsqu'elle est activée, le bot met à jour la carte en temps réel pendant qu'il génère le texte.

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

Feishu/Lark prend en charge l'ACP pour les DMs et les messages de fil de discussion de groupe. L'ACP Feishu/Lark est pilotée par des commandes textuelles — il n'y a pas de menus de commandes slash natifs, utilisez donc des messages `/acp ...` directement dans la conversation.

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

#### Lancer une ACP depuis la conversation

Dans un DM ou un fil de discussion Feishu/Lark :

```text
/acp spawn codex --thread here
```

`--thread here` fonctionne pour les DMs et les messages de fil de discussion Feishu/Lark. Les messages de suivi dans la conversation liée sont acheminés directement vers cette session ACP.

### Routage multi-agent

Utilisez `bindings` pour acheminer les DMs ou les groupes Feishu/Lark vers différents agents.

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
- `match.peer.id` : identifiant Open ID de l'utilisateur (`ou_xxx`) ou identifiant du groupe (`oc_xxx`)

Consultez [Obtenir les identifiants de groupe/utilisateur](#get-groupuser-ids) pour des conseils de recherche.

---

## Référence de configuration

Configuration complète : [Gateway configuration](/fr/gateway/configuration)

| Paramètre                                         | Description                                       | Par défaut       |
| ------------------------------------------------- | ------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Activer/désactiver le channel                     | `true`           |
| `channels.feishu.domain`                          | API domain (`feishu` ou `lark`)                   | `feishu`         |
| `channels.feishu.connectionMode`                  | Transport d'événements (`websocket` ou `webhook`) | `websocket`      |
| `channels.feishu.defaultAccount`                  | Compte par défaut pour le routage sortant         | `default`        |
| `channels.feishu.verificationToken`               | Requis pour le mode webhook                       | —                |
| `channels.feishu.encryptKey`                      | Requis pour le mode webhook                       | —                |
| `channels.feishu.webhookPath`                     | Chemin d'accès de la route du webhook             | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Hôte de liaison du webhook                        | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Port de liaison du webhook                        | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | ID de l'application                               | —                |
| `channels.feishu.accounts.<id>.appSecret`         | Secret de l'application                           | —                |
| `channels.feishu.accounts.<id>.domain`            | Remplacement du domaine par compte                | `feishu`         |
| `channels.feishu.accounts.<id>.tts`               | Remplacement TTS par compte                       | `messages.tts`   |
| `channels.feishu.dmPolicy`                        | Stratégie DM                                      | `allowlist`      |
| `channels.feishu.allowFrom`                       | Liste blanche DM (liste open_id)                  | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | Stratégie de groupe                               | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | Liste blanche de groupe                           | —                |
| `channels.feishu.requireMention`                  | Exiger @mention dans les groupes                  | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | Remplacement @mention par groupe                  | hérité           |
| `channels.feishu.groups.<chat_id>.enabled`        | Activer/désactiver un groupe spécifique           | `true`           |
| `channels.feishu.textChunkLimit`                  | Taille du bloc de message                         | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Limite de taille des médias                       | `30`             |
| `channels.feishu.streaming`                       | Sortie de carte en continu                        | `true`           |
| `channels.feishu.blockStreaming`                  | Flux en continu par bloc                          | `true`           |
| `channels.feishu.typingIndicator`                 | Envoyer des réactions de frappe                   | `true`           |
| `channels.feishu.resolveSenderNames`              | Résoudre les noms d'affichage des expéditeurs     | `true`           |

---

## Types de messages pris en charge

### Réception

- ✅ Texte
- ✅ Texte enrichi (post)
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo/média
- ✅ Autocollants

Les messages audio entrants Feishu/Lark sont normalisés sous forme de substitutions média au lieu du JSON brut `file_key`. Lorsque `tools.media.audio` est configuré, OpenClaw télécharge la ressource de note vocale et exécute la transcription audio partagée avant le tour de l'agent, afin que l'agent reçoive la transcription parlée. Si Feishu inclut directement le texte de la transcription dans la charge utile audio, ce texte est utilisé sans appel ASR supplémentaire. Sans fournisseur de transcription audio, l'agent reçoit toujours une substitution `<media:audio>` ainsi que la pièce jointe sauvegardée, et non la charge utile de ressource brute Feishu.

### Envoi

- ✅ Texte
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo/média
- ✅ Cartes interactives (y compris les mises à jour en continu)
- ⚠️ Texte enrichi (formatage style post ; ne prend pas en charge toutes les capacités d'édition Feishu/Lark)

Les bulles audio natives Feishu/Lark utilisent le type de message `audio` de Feishu et nécessitent un média de chargement Ogg/Opus (`file_type: "opus"`). Les médias existants `.opus` et `.ogg` sont envoyés directement en tant qu'audio natif. Les MP3/WAV/M4A et autres formats audio probables sont transcodés en Ogg/Opus 48kHz avec `ffmpeg` uniquement lorsque la réponse demande une livraison vocale (`audioAsVoice` / outil de message `asVoice`, y compris les réponses de notes vocales TTS). Les pièces jointes MP3 ordinaires restent des fichiers standard. Si `ffmpeg` est manquant ou si la conversion échoue, OpenClaw revient à une pièce jointe de fichier et enregistre la raison.

### Fils et réponses

- ✅ Réponses en ligne
- ✅ Réponses dans un fil
- ✅ Les réponses média gardent le contexte du fil lors de la réponse à un message de fil

Pour `groupSessionScope: "group_topic"` et `"group_topic_sender"`, les groupes de sujets natifs Feishu/Lark utilisent l'événement `thread_id` (`omt_*`) comme clé de session de sujet canonique. Les réponses de groupe normales que OpenClaw transforme en fils continuent d'utiliser l'ID du message racine de réponse (`om_*`) afin que le premier tour et les tours suivants restent dans la même session.

---

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) — tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) — comportement du chat de groupe et filtrage par mention
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
