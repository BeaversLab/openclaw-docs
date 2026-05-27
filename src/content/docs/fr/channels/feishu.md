---
summary: "Vue d'ensemble du bot Feishu, fonctionnalités et configuration"
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
    ```bash openclaw channels login --channel feishu ``` Choisissez la configuration manuelle pour coller un App ID et un App Secret provenant de la Feishu Open Platform, ou choisissez la configuration QR pour créer un bot automatiquement. Si l'application mobile nationale Feishu ne réagit pas au code QR, relancez la configuration et choisissez la configuration manuelle.
  </Step>

  <Step title="Une fois la configuration terminée, redémarrez la passerelle pour appliquer les modifications">```bash openclaw gateway restart ```</Step>
</Steps>

---

## Contrôle d'accès

### Messages directs

Configurez `dmPolicy` pour contrôler qui peut envoyer un DM au bot :

- `"pairing"` - les utilisateurs inconnus reçoivent un code d'appariement ; approuvez via CLI
- `"allowlist"` - seuls les utilisateurs listés dans `allowFrom` peuvent chatter (par défaut : uniquement le propriétaire du bot)
- `"open"` - autoriser les DM publics uniquement lorsque `allowFrom` inclut `"*"` ; avec des entrées restrictives, seuls les utilisateurs correspondants peuvent chatter
- `"disabled"` - désactiver tous les DMs

**Approuver une demande d'appariement :**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### Discussions de groupe

**Stratégie de groupe** (`channels.feishu.groupPolicy`) :

| Valeur        | Comportement                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `"open"`      | Répondre à tous les messages dans les groupes                                                                     |
| `"allowlist"` | Répondre uniquement aux groupes de `groupAllowFrom` ou explicitement configurés sous `groups.<chat_id>`           |
| `"disabled"`  | Désactiver tous les messages de groupe ; les entrées explicites `groups.<chat_id>` ne remplacent pas ce paramètre |

Par défaut : `allowlist`

**Exigence de mention** (`channels.feishu.requireMention`) :

- `true` - nécessiter une @mention (par défaut)
- `false` - répondre sans @mention
- Remplacement par groupe : `channels.feishu.groups.<chat_id>.requireMention`
- Les `@all` et `@_all` en diffusion seule ne sont pas traités comme des mentions de bot. Un message qui mentionne à la fois `@all` et le bot directement compte toujours comme une mention de bot.

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

En mode `allowlist`, vous pouvez également autoriser un groupe en ajoutant une entrée explicite `groups.<chat_id>`. Les entrées explicites ne remplacent pas `groupPolicy: "disabled"`. Les valeurs par défaut avec caractères génériques sous `groups.*` configurent les groupes correspondants, mais elles n'autorisent pas les groupes par elles-mêmes.

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

Recherchez `open_id` dans la sortie du journal. Vous pouvez également vérifier les demandes d'appariement en attente :

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
5. Assurez-vous que la passerelle fonctionne : `openclaw gateway status`
6. Vérifiez les journaux : `openclaw logs --follow`

### La configuration QR ne réagit pas dans l'application mobile Feishu

1. Réexécutez la configuration : `openclaw channels login --channel feishu`
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

`defaultAccount` contrôle le compte utilisé lorsque les API sortantes ne spécifient pas `accountId`.
`accounts.<id>.tts` utilise la même structure que `messages.tts` et fusionne en profondeur avec
la configuration TTS globale, ce qui permet aux configurations Feishu multi-bots de conserver des informations d'identification de fournisseur partagées
globalement tout en remplaçant uniquement la voix, le model, la persona ou le mode automatique
par compte.

### Limites de messages

- `textChunkLimit` - taille du bloc de texte sortant (par défaut : `2000` caractères)
- `mediaMaxMb` - limite de téléchargement/téléchargement de médias (par défaut : `30` Mo)

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

Feishu/Lark prend en charge l'ACP pour les DMs et les messages de fils de groupe. L'ACP Feishu/Lark est basée sur des commandes texte - il n'y a pas de menus de commandes slash natifs, utilisez donc des messages `/acp ...` directement dans la conversation.

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

`--thread here` fonctionne pour les DMs et les messages de fils Feishu/Lark. Les messages de suivi dans la conversation liée sont acheminés directement vers cette session ACP.

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

Voir [Get group/user IDs](#get-groupuser-ids) pour des conseils de recherche.

---

## Isolation d'agent par utilisateur (Création dynamique d'agent)

Activez `dynamicAgentCreation` pour créer automatiquement des **instances d'agent isolées** pour chaque utilisateur en DM. Chaque utilisateur obtient son propre :

- Répertoire de l'espace de travail indépendant
- Séparé `USER.md` / `SOUL.md` / `MEMORY.md`
- Historique des conversations privé
- Compétences et état isolés

Ceci est essentiel pour les bots publics où vous souhaitez que chaque utilisateur ait sa propre expérience d'assistant IA privée.

<Note>
  **Limitation du compte** : `dynamicAgentCreation` fonctionne actuellement uniquement avec le **compte Feishu par défaut**. Les configurations nommées/multi-comptes ne sont pas encore entièrement prises en charge — les liaisons dynamiques sont créées sans `accountId`, les messages destinés aux comptes nommés peuvent donc toujours être acheminés vers `agent:main`. Suivez les progrès dans le [Issue
  #42837](https://github.com/openclaw/openclaw/issues/42837).
</Note>

### Configuration rapide

```json5
{
  channels: {
    feishu: {
      dmPolicy: "open",
      allowFrom: ["*"],
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // Critical: makes each user's DM their "main session"
    // Automatically loads USER.md / SOUL.md / MEMORY.md
    // For stronger isolation, use "per-channel-peer" instead
    dmScope: "main",
  },
}
```

### Fonctionnement

Lorsqu'un nouvel utilisateur envoie son premier DM :

1. Le channel génère un `agentId` unique = `feishu-{user_open_id}`
2. Crée un nouvel espace de travail dans le chemin `workspaceTemplate`
3. Enregistre l'agent et crée une liaison pour cet utilisateur
4. L'assistant d'espace de travail assure la présence des fichiers d'amorçage (`AGENTS.md`, `SOUL.md`, `USER.md`, etc.) lors du premier accès
5. Achemine tous les messages futurs de cet utilisateur vers son agent dédié

### Options de configuration

| Paramètre                                                | Description                                                      | Par défaut                           |
| -------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `channels.feishu.dynamicAgentCreation.enabled`           | Activer la création automatique d'agents par utilisateur         | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | Modèle de chemin pour les espaces de travail d'agents dynamiques | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | Modèle de nom de répertoire de l'agent                           | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | Nombre maximum d'agents dynamiques à créer                       | illimité                             |

Variables de modèle :

- `{agentId}` - l'ID de l'agent généré (par exemple, `feishu-ou_xxxxxx`)
- `{userId}` - l'open_id Feishu de l'expéditeur (par exemple, `ou_xxxxxx`)

### Portée de la session

`session.dmScope` contrôle la manière dont les messages directs sont mappés aux sessions d'agent. Il s'agit d'un **paramètre global** qui affecte tous les channels.

| Valeur               | Comportement                                                                | Idéal pour                                                                                        |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `"main"`             | Le DM de chaque utilisateur correspond à la session principale de son agent | Bots à utilisateur unique où vous souhaitez que `USER.md` / `SOUL.md` se chargent automatiquement |
| `"per-channel-peer"` | Chaque combinaison (channel + utilisateur) obtient une session distincte    | Bots publics multi-utilisateurs nécessitant un isolement plus fort                                |

**Compromis** : L'utilisation de `"main"` permet le chargement automatique des fichiers d'amorçage (`USER.md`, `SOUL.md`, `MEMORY.md`), mais implique que tous les DMs sur tous les canaux partagent le même modèle de clé de session. Pour les bots multi-utilisateurs publics où l'isolement prime sur le chargement automatique de l'amorçage, envisagez `"per-channel-peer"` et gérez les fichiers d'amorçage manuellement.

<Note>`"per-account-channel-peer"` n'est pas recommandé avec `dynamicAgentCreation` car les liaisons dynamiques sont créées sans `accountId`. À utiliser uniquement avec des liaisons manuelles.</Note>

```json5
{
  session: {
    // For single-user personal bots: enables auto bootstrap loading
    dmScope: "main",

    // For public multi-user bots: stronger isolation
    // dmScope: "per-channel-peer",
  },
}
```

### Déploiement multi-utilisateurs typique

```json5
{
  channels: {
    feishu: {
      appId: "cli_xxx",
      appSecret: "xxx",
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "open",
      requireMention: true,
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // Choose dmScope based on your isolation needs:
    // "main" for bootstrap auto-loading, "per-channel-peer" for stronger isolation
    dmScope: "main",
  },
  bindings: [], // Empty - dynamic agents auto-bind
}
```

### Vérification

Vérifiez les journaux de la passerelle pour confirmer que la création dynamique fonctionne :

```
feishu: creating dynamic agent "feishu-ou_xxxxxx" for user ou_xxxxxx
workspace: /Users/you/.openclaw/workspace-feishu-ou_xxxxxx
feishu: dynamic agent created, new route: agent:feishu-ou_xxxxxx:main
```

Lister tous les espaces de travail créés :

```bash
ls -la ~/.openclaw/workspace-*
```

### Remarques

- **Isolation de l'espace de travail** : Chaque utilisateur obtient son propre répertoire d'espace de travail et son instance d'agent. Les utilisateurs ne peuvent pas voir l'historique des conversations ni les fichiers des autres dans le flux de messagerie normal.
- **Limite de sécurité** : Il s'agit d'un mécanisme d'isolement du contexte de messagerie, et non d'une limite de sécurité contre des co-locataires hostiles. Le processus de l'agent et l'environnement hôte sont partagés.
- **`bindings` doit être vide** : Les agents dynamiques enregistrent automatiquement leurs propres liaisons
- **Chemin de mise à niveau** : Les liaisons manuelles existantes continuent de fonctionner parallèlement aux agents dynamiques
- **`session.dmScope` est global** : Cela affecte tous les canaux, pas seulement Feishu

---

## Référence de configuration

Configuration complète : [Configuration Gateway](/fr/gateway/configuration)

| Paramètre                                                | Description                                                                                              | Par défaut                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `channels.feishu.enabled`                                | Activer/désactiver le canal                                                                              | `true`                               |
| `channels.feishu.domain`                                 | Domaine API (`feishu` ou `lark`)                                                                         | `feishu`                             |
| `channels.feishu.connectionMode`                         | Transport d'événements (`websocket` ou `webhook`)                                                        | `websocket`                          |
| `channels.feishu.defaultAccount`                         | Compte par défaut pour le routage sortant                                                                | `default`                            |
| `channels.feishu.verificationToken`                      | Requis pour le mode webhook                                                                              | -                                    |
| `channels.feishu.encryptKey`                             | Requis pour le mode webhook                                                                              | -                                    |
| `channels.feishu.webhookPath`                            | Chemin de routage du webhook                                                                             | `/feishu/events`                     |
| `channels.feishu.webhookHost`                            | Hôte de liaison du webhook                                                                               | `127.0.0.1`                          |
| `channels.feishu.webhookPort`                            | Port de liaison du webhook                                                                               | `3000`                               |
| `channels.feishu.accounts.<id>.appId`                    | ID de l'application                                                                                      | -                                    |
| `channels.feishu.accounts.<id>.appSecret`                | Secret de l'application                                                                                  | -                                    |
| `channels.feishu.accounts.<id>.domain`                   | Remplacement du domaine par compte                                                                       | `feishu`                             |
| `channels.feishu.accounts.<id>.tts`                      | Remplacement du TTS par compte                                                                           | `messages.tts`                       |
| `channels.feishu.dmPolicy`                               | Stratégie de DM                                                                                          | `allowlist`                          |
| `channels.feishu.allowFrom`                              | Liste blanche de DM (liste open_id)                                                                      | [BotOwnerId]                         |
| `channels.feishu.groupPolicy`                            | Stratégie de groupe                                                                                      | `allowlist`                          |
| `channels.feishu.groupAllowFrom`                         | Liste blanche de groupes                                                                                 | -                                    |
| `channels.feishu.requireMention`                         | Exiger @mention dans les groupes                                                                         | `true`                               |
| `channels.feishu.groups.<chat_id>.requireMention`        | Remplacement @mention par groupe ; les ID explicites admettent également le groupe en mode liste blanche | hérité                               |
| `channels.feishu.groups.<chat_id>.enabled`               | Activer/désactiver un groupe spécifique                                                                  | `true`                               |
| `channels.feishu.dynamicAgentCreation.enabled`           | Activer la création automatique d'agents par utilisateur                                                 | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | Modèle de chemin pour les espaces de travail d'agents dynamiques                                         | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | Modèle de nom de répertoire d'agent                                                                      | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | Nombre maximum d'agents dynamiques à créer                                                               | illimité                             |
| `channels.feishu.textChunkLimit`                         | Taille des blocs de messages                                                                             | `2000`                               |
| `channels.feishu.mediaMaxMb`                             | Limite de taille des médias                                                                              | `30`                                 |
| `channels.feishu.streaming`                              | Sortie de carte en continu                                                                               | `true`                               |
| `channels.feishu.blockStreaming`                         | Flux continu des réponses aux blocs terminés                                                             | `false`                              |
| `channels.feishu.typingIndicator`                        | Envoyer des réactions de frappe                                                                          | `true`                               |
| `channels.feishu.resolveSenderNames`                     | Résoudre les noms d'affichage des expéditeurs                                                            | `true`                               |

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

Les messages audio entrants Feishu/Lark sont normalisés sous forme de substituants de média plutôt
que de JSON brut `file_key`. Lorsque `tools.media.audio` est configuré, OpenClaw
télécharge la ressource de la note vocale et exécute une transcription audio partagée avant le tour
de l'agent, afin que l'agent reçoive la transcription parlée. Si Feishu inclut directement
le texte de la transcription dans la charge utile audio, ce texte est utilisé sans nouvel appel
ASR. Sans fournisseur de transcription audio, l'agent reçoit toujours un
substituant `<media:audio>` ainsi que la pièce jointe enregistrée, et non la charge utile brute de la
ressource Feishu.

### Envoi

- ✅ Texte
- ✅ Images
- ✅ Fichiers
- ✅ Audio
- ✅ Vidéo/médias
- ✅ Cartes interactives (y compris les mises à jour en continu)
- ⚠️ Texte enrichi (formatage style post ; ne prend pas en charge toutes les capacités d'édition Feishu/Lark)

Les bulles audio natives Feishu/Lark utilisent le type de message Feishu `audio` et nécessitent
un média de téléchargement Ogg/Opus (`file_type: "opus"`). Les médias `.opus` et `.ogg` existants
sont envoyés directement en tant qu'audio natif. Les formats audio probables MP3/WAV/M4A et autres
sont transcodés en Ogg/Opus 48kHz avec `ffmpeg` uniquement lorsque la réponse demande une livraison vocale
(`audioAsVoice` / outil de message `asVoice`, y compris les réponses en notes vocales TTS).
Les pièces jointes MP3 ordinaires restent des fichiers standards. Si `ffmpeg` est manquant ou
si la conversion échoue, OpenClaw revient à une pièce jointe de fichier et enregistre la raison.

### Fil de discussion et réponses

- ✅ Réponses en ligne
- ✅ Réponses dans le fil
- ✅ Les réponses média restent conscientes du fil lors d'une réponse à un message de fil

Pour `groupSessionScope: "group_topic"` et `"group_topic_sender"`, les groupes de sujets natifs Feishu/Lark utilisent l'événement `thread_id` (`omt_*`) comme clé de session de sujet canonique. Si un événement de démarrage de sujet natif omet `thread_id`OpenClawOpenClaw, OpenClaw le réhydrate à partir de Feishu avant d'acheminer le tour. Les réponses de groupe normales qu'OpenClaw transforme en fils de discussion continuent d'utiliser l'ID du message racine de la réponse (`om_*`) afin que le premier tour et les tours suivants restent dans la même session.

---

## Connexes

- [Aperçu des canaux](/fr/channels) - tous les canaux pris en charge
- [Appairage](/fr/channels/pairing) - authentification DM et flux d'appairage
- [Groupes](/fr/channels/groups) - comportement des discussions de groupe et filtrage par mention
- [Routage de canal](/fr/channels/channel-routing) - routage de session pour les messages
- [Sécurité](/fr/gateway/security) - modèle d'accès et durcissement
