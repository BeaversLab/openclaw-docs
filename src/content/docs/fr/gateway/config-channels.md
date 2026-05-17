---
summary: "Configuration de channel : contrôle d'accès, appairage, clés par channel pour Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, et plus"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "Configuration — channels"
---

Clés de configuration par channel sous `channels.*`. Couvre l'accès aux DM et aux groupes, les configurations multi-comptes, le filtrage des mentions, et les clés par channel pour Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, et les autres plugins de channel inclus.

Pour les agents, les outils, l'exécution de la passerelle et d'autres clés de niveau supérieur, voir
[Référence de configuration](/fr/gateway/configuration-reference).

## Channels

Chaque channel démarre automatiquement lorsque sa section de configuration existe (sauf `enabled: false`).

### Accès DM et de groupe

Tous les channels prennent en charge les stratégies DM et les stratégies de groupe :

| Stratégie DM           | Comportement                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `pairing` (par défaut) | Les expéditeurs inconnus reçoivent un code d'appariement à usage unique ; le propriétaire doit approuver |
| `allowlist`            | Seuls les expéditeurs dans `allowFrom` (ou le magasin d'autorisation apparié)                            |
| `open`                 | Autoriser tous les DM entrants (nécessite `allowFrom: ["*"]`)                                            |
| `disabled`             | Ignorer tous les DM entrants                                                                             |

| Stratégie de groupe      | Comportement                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `allowlist` (par défaut) | Uniquement les groupes correspondant à la liste d'autorisation configurée                    |
| `open`                   | Contourner les listes d'autorisation de groupe (le filtrage par mention s'applique toujours) |
| `disabled`               | Bloquer tous les messages de groupe/salle                                                    |

<Note>
`channels.defaults.groupPolicy` définit la valeur par défaut lorsque le `groupPolicy` d'un provider n'est pas défini.
Les codes d'appairage expirent après 1 heure. Les demandes d'appairage DM en attente sont limitées à **3 par channel**.
Si un bloc de provider est entièrement manquant (`channels.<provider>` absent), la stratégie de groupe du runtime revient à `allowlist` (fermeture par échec) avec un avertissement au démarrage.
</Note>

### Remplacements de modèle de channel

Utilisez `channels.modelByChannel` pour associer des ID de channel spécifiques à un model. Les valeurs acceptent `provider/model` ou des alias de model configurés. Le mapping de channel s'applique lorsqu'une session n'a pas déjà de substitution de model (par exemple, définie via `/model`).

```json5
{
  channels: {
    modelByChannel: {
      discord: {
        "123456789012345678": "anthropic/claude-opus-4-6",
      },
      slack: {
        C1234567890: "openai/gpt-4.1",
      },
      telegram: {
        "-1001234567890": "openai/gpt-4.1-mini",
        "-1001234567890:topic:99": "anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

### Paramètres par défaut du canal et pulsation

Utilisez `channels.defaults` pour le comportement de stratégie de groupe et de battement de cœur (heartbeat) partagé entre les providers :

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      contextVisibility: "all", // all | allowlist | allowlist_quote
      heartbeat: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy` : stratégie de groupe de repli lorsqu'un `groupPolicy` de niveau provider n'est pas défini.
- `channels.defaults.contextVisibility` : mode de visibilité du contexte supplémentaire par défaut pour tous les canaux. Valeurs : `all` (par défaut, inclut tout le contexte cité/fil/historique), `allowlist` (inclut uniquement le contexte des expéditeurs autorisés), `allowlist_quote` (identique à la liste d'autorisation mais conserve le contexte de citation/réponse explicite). Remplacement par canal : `channels.<channel>.contextVisibility`.
- `channels.defaults.heartbeat.showOk` : inclure les statuts de canaux sains dans la sortie du battement de cœur.
- `channels.defaults.heartbeat.showAlerts` : inclure les statuts dégradés/erreur dans la sortie du battement de cœur.
- `channels.defaults.heartbeat.useIndicator` : afficher une sortie de battement de cœur compacte de style indicateur.

### WhatsApp

WhatsApp s'exécute via le canal Web de la passerelle (Baileys Web). Il démarre automatiquement lorsqu'une session liée existe.

```json5
{
  web: {
    enabled: true,
    heartbeatSeconds: 60,
    whatsapp: {
      keepAliveIntervalMs: 25000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    },
    reconnect: {
      initialMs: 2000,
      maxMs: 120000,
      factor: 1.4,
      jitter: 0.2,
      maxAttempts: 0,
    },
  },
  channels: {
    whatsapp: {
      dmPolicy: "pairing", // pairing | allowlist | open | disabled
      allowFrom: ["+15555550123", "+447700900123"],
      textChunkLimit: 4000,
      chunkMode: "length", // length | newline
      mediaMaxMb: 50,
      sendReadReceipts: true, // blue ticks (false in self-chat mode)
      groups: {
        "*": { requireMention: true },
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

<Accordion title="WhatsAppWhatsApp multi-compte">

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        default: {},
        personal: {},
        biz: {
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

- Les commandes sortantes par défaut vont vers le compte `default` s'il est présent ; sinon, le premier id de compte configuré (trié).
- `channels.whatsapp.defaultAccount`Baileys facultatif remplace cette sélection de compte par défaut de repli lorsqu'il correspond à un id de compte configuré.
- L'ancien répertoire d'authentification Baileys à compte unique est migré par `openclaw doctor` dans `whatsapp/default`.
- Remplacements par compte : `channels.whatsapp.accounts.<id>.sendReadReceipts`, `channels.whatsapp.accounts.<id>.dmPolicy`, `channels.whatsapp.accounts.<id>.allowFrom`.

</Accordion>

### Telegram

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "your-bot-token",
      dmPolicy: "pairing",
      allowFrom: ["tg:123456789"],
      groups: {
        "*": { requireMention: true },
        "-1001234567890": {
          allowFrom: ["@admin"],
          systemPrompt: "Keep answers brief.",
          topics: {
            "99": {
              requireMention: false,
              skills: ["search"],
              systemPrompt: "Stay on topic.",
            },
          },
        },
      },
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
      historyLimit: 50,
      replyToMode: "first", // off | first | all | batched
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress (default: off; opt in explicitly to avoid preview-edit rate limits)
      actions: { reactions: true, sendMessage: true },
      reactionNotifications: "own", // off | own | all
      mediaMaxMb: 100,
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
      network: {
        autoSelectFamily: true,
        dnsResultOrder: "ipv4first",
      },
      apiRoot: "https://api.telegram.org",
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Jeton du bot : `channels.telegram.botToken` ou `channels.telegram.tokenFile` (fichier régulier uniquement ; les liens symboliques sont rejetés), avec `TELEGRAM_BOT_TOKEN` comme repli pour le compte par défaut.
- `apiRoot`TelegramAPI est uniquement la racine de l'API Bot de Telegram. Utilisez `https://api.telegram.org` ou votre propre racine auto-hébergée/proxy, et non `https://api.telegram.org/bot<TOKEN>` ; `openclaw doctor --fix` supprime un suffixe `/bot<TOKEN>` final accidentel.
- Le `channels.telegram.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un ID de compte configuré.
- Dans les configurations multi-comptes (2+ ID de compte), définissez une valeur par défaut explicite (`channels.telegram.defaultAccount` ou `channels.telegram.accounts.default`) pour éviter le routage de repli ; `openclaw doctor` avertit lorsque cela est manquant ou invalide.
- `configWrites: false` bloque les écritures de configuration initiées par Telegram (migrations d'ID de supergroupe, `/config set|unset`).
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` configurent les liaisons ACP persistantes pour les sujets de forum (utilisez `chatId:topic:topicId` canonique dans `match.peer.id`). La sémantique des champs est partagée dans [Agents ACP](/fr/tools/acp-agents#persistent-channel-bindings).
- Les aperçus de flux Telegram utilisent `sendMessage` + `editMessageText` (fonctionne dans les chats directs et de groupe).
- Politique de réessai : voir [Politique de réessai](/fr/concepts/retry).

### Discord

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 100,
      allowBots: false,
      actions: {
        reactions: true,
        stickers: true,
        polls: true,
        permissions: true,
        messages: true,
        threads: true,
        pins: true,
        search: true,
        memberInfo: true,
        roleInfo: true,
        roles: false,
        channelInfo: true,
        voiceStatus: true,
        events: true,
        moderation: false,
      },
      replyToMode: "off", // off | first | all | batched
      dmPolicy: "pairing",
      allowFrom: ["1234567890", "123456789012345678"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["openclaw-dm"] },
      guilds: {
        "123456789012345678": {
          slug: "friends-of-openclaw",
          requireMention: false,
          ignoreOtherMentions: true,
          reactionNotifications: "own",
          users: ["987654321098765432"],
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["docs"],
              systemPrompt: "Short answers only.",
            },
          },
        },
      },
      historyLimit: 20,
      textChunkLimit: 2000,
      chunkMode: "length", // length | newline
      streaming: {
        mode: "progress", // off | partial | block | progress (Discord default: progress)
        progress: {
          label: "auto",
          maxLines: 8,
          toolProgress: true,
        },
      },
      maxLinesPerMessage: 17,
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSessions: true,
        defaultSpawnContext: "fork",
      },
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["987654321098765432"],
        agentFilter: ["default"],
        sessionFilter: ["discord:"],
        target: "dm", // dm | channel | both
        cleanupAfterResolve: false,
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

- Jeton : `channels.discord.token`, avec `DISCORD_BOT_TOKEN` comme solution de repli pour le compte par défaut.
- Les appels sortants directs qui fournissent un Discord `token` explicite utilisent ce jeton pour l'appel ; les paramètres de réessai/de politique de compte proviennent toujours du compte sélectionné dans l'instantané d'exécution actif.
- Le `channels.discord.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un ID de compte configuré.
- Utilisez `user:<id>` (DM) ou `channel:<id>` (salon de guilde) pour les cibles de livraison ; les ID numériques seuls sont rejetés.
- Les slugs de guilde sont en minuscules avec les espaces remplacés par `-` ; les clés de salon utilisent le nom en slug (pas de `#`). Préférez les ID de guilde.
- Les messages rédigés par le bot sont ignorés par défaut. `allowBots: true` les active ; utilisez `allowBots: "mentions"` pour n'accepter que les messages de bot qui mentionnent le bot (les propres messages sont toujours filtrés).
- `channels.discord.guilds.<id>.ignoreOtherMentions` (et les substitutions de canal) supprime les messages qui mentionnent un autre utilisateur ou rôle mais pas le bot (à l'exclusion de @everyone/@here).
- `channels.discord.mentionAliases`Discord mappe le texte `@handle` sortant stable aux ID utilisateur Discord avant l'envoi, afin que les coéquipiers connus puissent être mentionnés de manière déterministe, même lorsque le cache de répertoire transitoire est vide. Les substitutions par compte se trouvent sous `channels.discord.accounts.<accountId>.mentionAliases`.
- `maxLinesPerMessage` (par défaut 17) divise les messages longs même s'ils sont sous 2000 caractères.
- `channels.discord.threadBindings`Discord contrôle le routage lié aux fils Discord :
  - `enabled`Discord : substitution Discord pour les fonctionnalités de session liées aux fils (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`, et livraison/routage lié)
  - `idleHours`Discord : substitution Discord pour la désactivation automatique due à l'inactivité en heures (`0` désactive)
  - `maxAgeHours`Discord : substitution Discord pour l'âge maximal strict en heures (`0` désactive)
  - `spawnSessions` : interrupteur pour `sessions_spawn({ thread: true })` et la création/liaison automatique de fils ACP (par défaut : `true`)
  - `defaultSpawnContext` : contexte de sous-agent natif pour les créations liées aux fils (`"fork"` par défaut)
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` configurent les liaisons ACP persistantes pour les channels et les fils de discussion (utilisez l'id du channel/fil dans `match.peer.id`). La sémantique des champs est partagée dans [Agents ACP](/fr/tools/acp-agents#persistent-channel-bindings).
- `channels.discord.ui.components.accentColor`Discord définit la couleur d'accentuation pour les conteneurs de composants Discord v2.
- `channels.discord.voice`DiscordLLMDiscord active les conversations de canal vocal Discord et les substitutions facultatives d'auto-join + LLM + TTS. Les configurations Discord texte-only laissent la voix désactivée par défaut ; définissez `channels.discord.voice.enabled=true` pour activer.
- `channels.discord.voice.model` remplace facultativement le model LLM utilisé pour les réponses du canal vocal Discord.
- `channels.discord.voice.daveEncryption` et `channels.discord.voice.decryptionFailureTolerance` sont transmis aux options DAVE `@discordjs/voice` (`true` et `24` par défaut).
- `channels.discord.voice.connectTimeoutMs` contrôle l'attente initiale de `@discordjs/voice` Ready pour `/vc join` et les tentatives de jointure automatique (`30000` par défaut).
- `channels.discord.voice.reconnectGraceMs` contrôle la durée pendant laquelle une session vocale déconnectée peut prendre pour entrer dans la signalisation de reconnexion avant que OpenClaw ne la détruise (`15000` par défaut).
- La lecture vocale Discord n'est pas interrompue par l'événement de début de parole d'un autre utilisateur. Pour éviter les boucles de rétroaction, OpenClaw ignore la nouvelle capture vocale pendant la lecture du TTS.
- OpenClaw tente également une récupération de la réception vocale en quittant/rejoignant une session vocale après des échecs de déchiffrement répétés.
- `channels.discord.streaming` est la clé canonique du mode flux. Discord est réglé par défaut sur `streaming.mode: "progress"` afin que la progression des outils/travail apparaisse dans un seul message d'aperçu modifié ; définissez `streaming.mode: "off"` pour le désactiver. Les valeurs `streamMode` héritées et booléennes `streaming` restent des alias d'exécution ; exécutez `openclaw doctor --fix` pour réécrire la configuration persistante.
- `channels.discord.autoPresence` mappe la disponibilité de l'exécution à la présence du bot (healthy => online, degraded => idle, exhausted => dnd) et permet des remplacements facultatifs du texte d'état.
- `channels.discord.dangerouslyAllowNameMatching` réactive la correspondance nom/balise modifiable (mode de compatibilité break-glass).
- `channels.discord.execApprovals` : Livraison native Discord de l'approbation d'exécution et autorisation de l'approbant.
  - `enabled` : `true`, `false` ou `"auto"` (par défaut). En mode automatique, les approbations d'exécution s'activent lorsque les approbateurs peuvent être résolus depuis `approvers` ou `commands.ownerAllowFrom`.
  - `approvers` : IDs d'utilisateurs Discord autorisés à approuver les demandes d'exécution. Revient à `commands.ownerAllowFrom` si omis.
  - `agentFilter` : liste d'autorisation (allowlist) optionnelle d'IDs d'agents. Omettre pour transmettre les approbations pour tous les agents.
  - `sessionFilter` : motifs de clés de session optionnels (sous-chaîne ou regex).
  - `target` : où envoyer les invites d'approbation. `"dm"` (par défaut) envoie aux DMs des approbateurs, `"channel"` envoie au channel d'origine, `"both"` envoie aux deux. Lorsque la cible inclut `"channel"`, les boutons ne sont utilisables que par les approbateurs résolus.
  - `cleanupAfterResolve` : lorsque `true`, supprime les DMs d'approbation après approbation, refus ou expiration.

**Modes de notification de réaction :** `off` (aucun), `own` (messages du bot, par défaut), `all` (tous les messages), `allowlist` (à partir de `guilds.<id>.users` sur tous les messages).

### Google Chat

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      audienceType: "app-url", // app-url | project-number
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890",
      dm: {
        enabled: true,
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": { allow: true, requireMention: true },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

- JSON de compte de service : en ligne (`serviceAccount`) ou basé sur un fichier (`serviceAccountFile`).
- SecretRef de compte de service est également pris en charge (`serviceAccountRef`).
- Alternatives d'environnement (Env fallbacks) : `GOOGLE_CHAT_SERVICE_ACCOUNT` ou `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`.
- Utilisez `spaces/<spaceId>` ou `users/<userId>` pour les cibles de livraison.
- `channels.googlechat.dangerouslyAllowNameMatching` réactive la correspondance de principal d'e-mail modifiable (mode de compatibilité break-glass).

### Slack

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
      socketMode: {
        clientPingTimeout: 15000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
      dmPolicy: "pairing",
      allowFrom: ["U123", "U456", "*"],
      dm: { enabled: true, groupEnabled: false, groupChannels: ["G123"] },
      channels: {
        C123: { allow: true, requireMention: true, allowBots: false },
        "#general": {
          allow: true,
          requireMention: true,
          allowBots: false,
          users: ["U123"],
          skills: ["docs"],
          systemPrompt: "Short answers only.",
        },
      },
      historyLimit: 50,
      allowBots: false,
      reactionNotifications: "own",
      reactionAllowlist: ["U123"],
      replyToMode: "off", // off | first | all | batched
      thread: {
        historyScope: "thread", // thread | channel
        inheritParent: false,
      },
      actions: {
        reactions: true,
        messages: true,
        pins: true,
        memberInfo: true,
        emojiList: true,
      },
      slashCommand: {
        enabled: true,
        name: "openclaw",
        sessionPrefix: "slack:slash",
        ephemeral: true,
      },
      typingReaction: "hourglass_flowing_sand",
      unfurlLinks: false,
      unfurlMedia: false,
      textChunkLimit: 4000,
      chunkMode: "length",
      streaming: {
        mode: "partial", // off | partial | block | progress
        nativeTransport: true, // use Slack native streaming API when mode=partial
      },
      mediaMaxMb: 20,
      execApprovals: {
        enabled: "auto", // true | false | "auto"
        approvers: ["U123"],
        agentFilter: ["default"],
        sessionFilter: ["slack:"],
        target: "dm", // dm | channel | both
      },
    },
  },
}
```

- Le **mode Socket** nécessite à la fois `botToken` et `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` pour l'alternative d'environnement du compte par défaut).
- **HTTP mode** nécessite `botToken` ainsi que `signingSecret` (à la racine ou par compte).
- `socketMode` transmet les réglages du transport Socket Mode du SDK Slack à l'API de réception publique Bolt API. À n'utiliser que lors de l'investigation de délais d'expiration ping/pong ou de comportements de websocket périmés.
- `botToken`, `appToken`, `signingSecret` et `userToken` acceptent des chaînes en clair ou des objets SecretRef.
- Les instantanés de compte Slack exposent des champs de source/statut par identifiant tels que `botTokenSource`, `botTokenStatus`, `appTokenStatus` et, en mode HTTP, `signingSecretStatus`. `configured_unavailable` signifie que le compte est configuré via SecretRef mais que le chemin de commande/runtime actuel n'a pas pu résoudre la valeur du secret.
- `configWrites: false` bloque les écritures de configuration initiées par Slack.
- `channels.slack.defaultAccount` facultatif remplace la sélection de compte par défaut lorsqu'il correspond à un identifiant de compte configuré.
- `channels.slack.streaming.mode` est la clé canonique du mode de flux Slack. `channels.slack.streaming.nativeTransport` contrôle le transport de flux natif de Slack. Les valeurs héritées `streamMode`, booléen `streaming` et `nativeStreaming` restent des alias d'exécution ; exécutez `openclaw doctor --fix` pour réécrire la configuration persistante.
- `unfurlLinks` et `unfurlMedia` font passer les booléens de développement de lien et de média `chat.postMessage` de Slack pour les réponses du bot. Omettez-les pour conserver le comportement par défaut de Slack ; définissez-les au niveau `channels.slack.accounts.<accountId>` pour remplacer la valeur par défaut de niveau supérieur pour un compte.
- Utilisez `user:<id>` (DM) ou `channel:<id>` pour les cibles de livraison.

**Modes de notification de réaction :** `off`, `own` (par défaut), `all`, `allowlist` (depuis `reactionAllowlist`).

**Isolement de session de fil :** `thread.historyScope` est par fil (par défaut) ou partagé sur le channel. `thread.inheritParent` copie la transcription du channel parent vers les nouveaux fils.

- Le streaming natif Slack ainsi que le statut de fil de style assistant Slack "is typing..." nécessitent une cible de fil de réponse. Les DMs de niveau supérieur restent hors fil par défaut, ils peuvent donc toujours diffuser via les prévisualisations de publication et de modification de brouillon Slack au lieu d'afficher la prévisualisation de flux/statut native de style fil.
- `typingReaction` ajoute une réaction temporaire au message Slack entrant pendant qu'une réponse est en cours, puis la supprime à la fin. Utilisez un code court d'émoji Slack tel que `"hourglass_flowing_sand"`.
- `channels.slack.execApprovals` : Livraison native d'approbation d'exécution et autorisation de l'approbateur sur Slack. Même schéma que Discord : `enabled` (`true`/`false`/`"auto"`), `approvers` (IDs utilisateur Slack), `agentFilter`, `sessionFilter` et `target` (`"dm"`, `"channel"` ou `"both"`).

| Groupe d'action | Par défaut | Notes                           |
| --------------- | ---------- | ------------------------------- |
| réactions       | activé     | Réagir + lister les réactions   |
| messages        | activé     | Lire/envoyer/modifier/supprimer |
| épingles        | activé     | Épingler/désépingler/lister     |
| memberInfo      | activé     | Informations sur le membre      |
| emojiList       | activé     | Liste d'émojis personnalisée    |

### Mattermost

Mattermost est fourni en tant que plugin groupé dans les versions actuelles de OpenClaw. Les versions plus anciennes ou les constructions personnalisées peuvent installer un package npm actuel avec `openclaw plugins install @openclaw/mattermost`. Vérifiez les dist-tags actuels sur [npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost) avant d'épingler une version.

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
      chatmode: "oncall", // oncall | onmessage | onchar
      oncharPrefixes: [">", "!"],
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
      commands: {
        native: true, // opt-in
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // Optional explicit URL for reverse-proxy/public deployments
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
      textChunkLimit: 4000,
      chunkMode: "length",
    },
  },
}
```

Modes de discussion : `oncall` (répondre à la mention @, par défaut), `onmessage` (chaque message), `onchar` (messages commençant par le préfixe de déclencheur).

Lorsque les commandes natives Mattermost sont activées :

- `commands.callbackPath` doit être un chemin (par exemple `/api/channels/mattermost/command`), et non une URL complète.
- `commands.callbackUrl` doit résoudre vers le point de terminaison de la passerelle OpenClaw et être accessible depuis le serveur Mattermost.
- Les callbacks de slash natifs sont authentifiés avec les jetons par commande renvoyés
  par Mattermost lors de l'enregistrement des commandes slash. Si l'enregistrement échoue ou si aucune
  commande n'est activée, OpenClaw rejette les callbacks avec
  `Unauthorized: invalid command token.`
- Pour les hôtes de callback privés/tailnet/internes, Mattermost peut exiger
  `ServiceSettings.AllowedUntrustedInternalConnections` pour inclure l'hôte/le domaine de callback.
  Utilisez les valeurs d'hôte/de domaine, pas les URL complètes.
- `channels.mattermost.configWrites` : autoriser ou refuser les écritures de configuration initiées par Mattermost.
- `channels.mattermost.requireMention` : exiger `@mention` avant de répondre dans les channels.
- `channels.mattermost.groups.<channelId>.requireMention` : redéfinition par channel du filtrage des mentions (`"*"` par défaut).
- `channels.mattermost.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un identifiant de compte configuré.

### Signal

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15555550123", // optional account binding
      dmPolicy: "pairing",
      allowFrom: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      configWrites: true,
      reactionNotifications: "own", // off | own | all | allowlist
      reactionAllowlist: ["+15551234567", "uuid:123e4567-e89b-12d3-a456-426614174000"],
      historyLimit: 50,
    },
  },
}
```

**Modes de notification de réaction :** `off`, `own` (par défaut), `all`, `allowlist` (à partir de `reactionAllowlist`).

- `channels.signal.account` : épingler le démarrage du channel à une identité de compte Signal spécifique.
- `channels.signal.configWrites` : autoriser ou refuser les écritures de configuration initiées par Signal.
- `channels.signal.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un identifiant de compte configuré.

### iMessage

OpenClaw lance `imsg rpc` (JSON-RPC sur stdio). Aucun démon ou port requis. C'est la méthode recommandée pour les nouvelles configurations OpenClaw iMessage lorsque l'hôte peut accorder les permissions de base de données Messages et d'Automatisation.

La prise en charge de BlueBubbles a été supprimée. `channels.bluebubbles` n'est pas une surface de configuration d'exécution prise en charge sur OpenClaw actuel. Migrez les anciennes configurations vers `channels.imessage` ; utilisez [Suppression de BlueBubbles et le chemin imsg iMessage](/fr/announcements/bluebubbles-imessage) pour la version courte et [Migration depuis BlueBubbles](/fr/channels/imessage-from-bluebubbles) pour le tableau de traduction complet.

Si le Gateway ne fonctionne pas sur le Mac Messages connecté, conservez `channels.imessage.enabled=true` et définissez `channels.imessage.cliPath` sur un wrapper SSH qui exécute `imsg "$@"` sur ce Mac. Le chemin local par défaut `imsg` est réservé à macOS.

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "imsg",
      dbPath: "~/Library/Messages/chat.db",
      remoteHost: "user@gateway-host",
      dmPolicy: "pairing",
      allowFrom: ["+15555550123", "user@example.com", "chat_id:123"],
      historyLimit: 50,
      includeAttachments: false,
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      mediaMaxMb: 16,
      service: "auto",
      region: "US",
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
      },
      catchup: {
        enabled: false,
      },
    },
  },
}
```

- `channels.imessage.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un id de compte configuré.

- Nécessite un accès complet au disque à la base de données Messages.
- Privilégiez les cibles `chat_id:<id>`. Utilisez `imsg chats --limit 20` pour lister les discussions.
- `cliPath` peut pointer vers un wrapper SSH ; définissez `remoteHost` (`host` ou `user@host`) pour la récupération des pièces jointes via SCP.
- `attachmentRoots` et `remoteAttachmentRoots` restreignent les chemins des pièces jointes entrantes (par défaut : `/Users/*/Library/Messages/Attachments`).
- SCP utilise une vérification stricte de la clé de l'hôte, assurez-vous donc que la clé de l'hôte de relais existe déjà dans `~/.ssh/known_hosts`.
- `channels.imessage.configWrites` : autoriser ou refuser les écritures de configuration initiées par iMessage.
- `channels.imessage.actions.*` : activer les actions de l'API privée qui sont également contrôlées par `imsg status` / `openclaw channels status --probe`.
- `channels.imessage.includeAttachments` est désactivé par défaut ; définissez-le sur `true` avant d'attendre des médias entrants dans les tours de l'agent.
- `channels.imessage.catchup.enabled` : accepter de relire les messages entrants qui sont arrivés pendant que le Gateway était hors ligne.
- `channels.imessage.groups` : registre des groupes et paramètres par groupe. Avec `groupPolicy: "allowlist"`, configurez soit des clés `chat_id` explicites, soit une entrée générique `"*"` afin que les messages de groupe puissent franchir la barrière du registre.
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` peuvent lier des conversations iMessage à des sessions ACP persistantes. Utilisez un identifiant normalisé ou une cible de discussion explicite (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`) dans `match.peer.id`. Sémantique des champs partagés : [ACP Agents](/fr/tools/acp-agents#persistent-channel-bindings).

<Accordion title="Exemple de wrapper SSH iMessage">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix est pris en charge par un plugin et configuré sous `channels.matrix`.

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
      encryption: true,
      initialSyncLimit: 20,
      defaultAccount: "ops",
      accounts: {
        ops: {
          name: "Ops",
          userId: "@ops:example.org",
          accessToken: "syt_ops_xxx",
        },
        alerts: {
          userId: "@alerts:example.org",
          password: "secret",
          proxy: "http://127.0.0.1:7891",
        },
      },
    },
  },
}
```

- L'authentification par jeton utilise `accessToken` ; l'authentification par mot de passe utilise `userId` + `password`.
- `channels.matrix.proxy` achemine le trafic HTTP Matrix via un proxy HTTP(S) explicite. Les comptes nommés peuvent le remplacer par `channels.matrix.accounts.<id>.proxy`.
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` autorise les serveurs domestiques privés/internes. `proxy` et cette adhésion réseau sont des contrôles indépendants.
- `channels.matrix.defaultAccount` sélectionne le compte préféré dans les configurations multi-comptes.
- `channels.matrix.autoJoin` par défaut est `off`, donc les salles invitées et les nouvelles invitations de type DM sont ignorées jusqu'à ce que vous définissiez `autoJoin: "allowlist"` avec `autoJoinAllowlist` ou `autoJoin: "always"`.
- `channels.matrix.execApprovals` : livraison des approbations d'exécution native Matrix et autorisation des approbateurs.
  - `enabled` : `true`, `false` ou `"auto"` (par défaut). En mode auto, les approbations d'exécution s'activent lorsque les approbateurs peuvent être résolus depuis `approvers` ou `commands.ownerAllowFrom`.
  - `approvers`Matrix : identifiants utilisateur Matrix (ex. : `@owner:example.org`) autorisés à approuver les demandes d'exécution.
  - `agentFilter` : liste d'autorisation (allowlist) facultative des identifiants d'agents. Omettre pour transmettre les approbations pour tous les agents.
  - `sessionFilter` : motifs de clés de session facultatifs (sous-chaîne ou expression régulière).
  - `target` : où envoyer les invites d'approbation. `"dm"` (par défaut), `"channel"` (salon d'origine) ou `"both"`.
  - Remplacements par compte : `channels.matrix.accounts.<id>.execApprovals`.
- `channels.matrix.dm.sessionScope`Matrix contrôle le regroupement des DM Matrix en sessions : `per-user` (par défaut) partage par pair routé, tandis que `per-room` isole chaque salon de DM.
- Les sondes de statut Matrix et les recherches en direct dans l'annuaire utilisent la même stratégie de proxy que le trafic d'exécution.
- La configuration complète de Matrix, les règles de ciblage et les exemples de configuration sont documentés dans [Matrix](MatrixMatrix/en/channels/matrix).

### Microsoft Teams

Microsoft Teams est basé sur un plugin (plugin-backed) et configuré sous Microsoft Teams`channels.msteams`.

```json5
{
  channels: {
    msteams: {
      enabled: true,
      configWrites: true,
      // appId, appPassword, tenantId, webhook, team/channel policies:
      // see /channels/msteams
    },
  },
}
```

- Chemins de clé principaux couverts ici : `channels.msteams`, `channels.msteams.configWrites`.
- La configuration complète de Teams (identifiants, webhook, stratégie DM/groupe, remplacements par équipe/par channel) est documentée dans [Microsoft Teams](Microsoft Teams/en/channels/msteams).

### IRC

IRC est basé sur un plugin et configuré sous `channels.irc`.

```json5
{
  channels: {
    irc: {
      enabled: true,
      dmPolicy: "pairing",
      configWrites: true,
      nickserv: {
        enabled: true,
        service: "NickServ",
        password: "${IRC_NICKSERV_PASSWORD}",
        register: false,
        registerEmail: "bot@example.com",
      },
    },
  },
}
```

- Chemins de clé principaux couverts ici : `channels.irc`, `channels.irc.dmPolicy`, `channels.irc.configWrites`, `channels.irc.nickserv.*`.
- Le `channels.irc.defaultAccount` facultatif remplace la sélection de compte par défaut lorsqu'il correspond à un identifiant de compte configuré.
- La configuration complète du canal IRC (hôte/port/TLS/canaux/listes blanches/filtrage des mentions) est documentée dans [IRC](/fr/channels/irc).

### Multi-compte (tous les canaux)

Exécutez plusieurs comptes par canal (chacun avec son propre `accountId`) :

```json5
{
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "123456:ABC...",
        },
        alerts: {
          name: "Alerts bot",
          botToken: "987654:XYZ...",
        },
      },
    },
  },
}
```

- `default` est utilisé lorsque `accountId` est omis (CLI + routage).
- Les jetons d'environnement ne s'appliquent qu'au compte par **défaut**.
- Les paramètres de base du canal s'appliquent à tous les comptes, sauf s'ils sont redéfinis par compte.
- Utilisez `bindings[].match.accountId` pour acheminer chaque compte vers un agent différent.
- Si vous ajoutez un compte non défini par défaut via `openclaw channels add` (ou l'intégration du canal) tout en étant encore sur une configuration de canal de premier niveau à compte unique, OpenClaw promeut d'abord les valeurs de premier niveau à compte unique dans la carte des comptes du canal afin que le compte original continue de fonctionner. La plupart des canaux les déplacent vers `channels.<channel>.accounts.default` ; Matrix peut plutôt conserver une cible nommée/défaut existante correspondante.
- Les liaisons existantes uniquement pour le canal (sans `accountId`) continuent de correspondre au compte par défaut ; les liaisons délimitées au compte restent facultatives.
- `openclaw doctor --fix` répare également les formes mixtes en déplaçant les valeurs de premier niveau à compte unique dans le compte promu choisi pour ce canal. La plupart des canaux utilisent `accounts.default` ; Matrix peut plutôt conserver une cible nommée/défaut existante correspondante.

### Autres canaux de plugins

De nombreux canaux de plugins sont configurés comme `channels.<id>` et documentés dans leurs pages de canal dédiées (par exemple Feishu, Matrix, LINE, Nostr, Zalo, Nextcloud Talk, Synology Chat et Twitch).
Voir l'index complet des canaux : [Channels](/fr/channels).

### Filtrage des mentions dans les discussions de groupe

Les messages de groupe exigent par défaut une **mention requise** (mention de métadonnées ou motifs regex sûrs). S'applique aux discussions de groupe WhatsApp, Telegram, Discord, Google Chat et iMessage.

Les réponses visibles sont contrôlées séparément. Les salons de groupe/channel utilisent par défaut `messages.groupChat.visibleReplies: "message_tool"` : OpenClaw traite toujours le tour, mais les réponses finales normales restent privées et la sortie visible dans le salon nécessite `message(action=send)`. Définissez `"automatic"` uniquement si vous souhaitez l'ancien comportement où les réponses normales sont renvoyées dans le salon. Pour appliquer le même comportement de réponse visible "outils uniquement" aux discussions directes également, définissez `messages.visibleReplies: "message_tool"` ; le harnais Codex utilise également ce comportement "outils uniquement" comme valeur par défaut non définie pour les discussions directes.

Les réponses visibles "outils uniquement" nécessitent un modèle/runtime qui appelle les outils de manière fiable. Si le journal de session affiche du texte d'assistant avec `didSendViaMessagingTool: false`, le modèle a produit une réponse finale privée au lieu d'appeler l'outil de message. Passez à un modèle d'appel d'outils plus robuste pour ce channel, ou définissez `messages.groupChat.visibleReplies: "automatic"` pour rétablir les réponses finales visibles de l'ancienne version.

Si l'outil de message n'est pas disponible sous la politique d'outil active, OpenClaw revient par défaut à des réponses visibles automatiques au lieu de supprimer silencieusement la réponse. `openclaw doctor` avertit de cette incohérence.

La passerelle recharge à chaud (hot-reloads) la configuration `messages` après sauvegarde du fichier. Redémarrez uniquement lorsque la surveillance des fichiers ou le rechargement de la configuration est désactivé dans le déploiement.

**Types de mentions :**

- **Mentions de métadonnées** : Mentions @ natives de la plateforme. Ignorées en mode self-chat WhatsApp.
- **Motifs de texte** : Motifs regex sûrs dans `agents.list[].groupChat.mentionPatterns`. Les motifs non valides et les répétitions imbriquées non sécurisées sont ignorés.
- Le filtrage par mention (mention gating) n'est appliqué que lorsque la détection est possible (mentions natives ou au moins un motif).

```json5
{
  messages: {
    visibleReplies: "automatic", // global default for direct/source chats; Codex harness defaults unset direct chats to message_tool
    groupChat: {
      historyLimit: 50,
      visibleReplies: "message_tool", // default; use "automatic" for legacy final replies
    },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` définit la valeur par défaut globale. Les channels peuvent la remplacer avec `channels.<channel>.historyLimit` (ou par compte). Définissez `0` pour désactiver.

`messages.visibleReplies` est la valeur par défaut globale pour les tours source ; `messages.groupChat.visibleReplies` la remplace pour les tours source de groupe/channel. Lorsque `messages.visibleReplies` n'est pas défini, un harnais peut fournir sa propre valeur par défaut directe/source ; le harnais Codex utilise `message_tool` par défaut. Les listes d'autorisation de channel et le filtrage par mention décident toujours si un tour est traité.

#### Limites de l'historique DM

```json5
{
  channels: {
    telegram: {
      dmHistoryLimit: 30,
      dms: {
        "123456789": { historyLimit: 50 },
      },
    },
  },
}
```

Résolution : remplacement par DM → valeur par défaut du provider → aucune limite (tout conservé).

Pris en charge : `telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `msteams`.

#### Mode self-chat

Incluez votre propre numéro dans `allowFrom` pour activer le mode self-chat (ignore les mentions @ natives, répond uniquement aux modèles de texte) :

```json5
{
  channels: {
    whatsapp: {
      allowFrom: ["+15555550123"],
      groups: { "*": { requireMention: true } },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: { mentionPatterns: ["reisponde", "@openclaw"] },
      },
    ],
  },
}
```

### Commandes (gestion des commandes de chat)

```json5
{
  commands: {
    native: "auto", // register native commands when supported
    nativeSkills: "auto", // register native skill commands when supported
    text: true, // parse /commands in chat messages
    bash: false, // allow ! (alias: /bash)
    bashForegroundMs: 2000,
    config: false, // allow /config
    mcp: false, // allow /mcp
    plugins: false, // allow /plugins
    debug: false, // allow /debug
    restart: true, // allow /restart + gateway restart tool
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw", // raw | hash
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<Accordion title="Détails de la commande">

- Ce bloc configure les surfaces de commande. Pour le catalogue de commandes intégré actuel + groupé, voir [Slash Commands](/fr/tools/slash-commands).
- Cette page est une **référence des clés de configuration**, et non le catalogue complet des commandes. Les commandes détenues par le channel/plugin telles que QQ Bot `/bot-ping` `/bot-help` `/bot-logs`, LINE `/card`, device-pair `/pair`, memory `/dreaming`, phone-control `/phone` et Talk `/voice` sont documentées dans leurs pages de channel/plugin ainsi que dans [Slash Commands](/fr/tools/slash-commands).
- Les commandes texte doivent être des messages **autonomes** commençant par `/`.
- `native: "auto"`DiscordTelegramSlack active les commandes natives pour Discord/Telegram, et les désactive pour Slack.
- `nativeSkills: "auto"`DiscordTelegramSlack active les commandes natives de compétences pour Discord/Telegram, et les désactive pour Slack.
- Remplacer par channel : `channels.discord.commands.native` (booléen ou `"auto"`Discord). Pour Discord, `false` ignore l'enregistrement et le nettoyage des commandes natives lors du démarrage.
- Remplacer l'enregistrement des compétences natives par channel avec `channels.<provider>.commands.nativeSkills`.
- `channels.telegram.customCommands`Telegram ajoute des entrées de menu de bot Telegram supplémentaires.
- `bash: true` active `! <cmd>` pour le shell hôte. Nécessite `tools.elevated.enabled` et l'expéditeur dans `tools.elevated.allowFrom.<channel>`.
- `config: true` active `/config` (lit/écrit `openclaw.json`). Pour les clients gateway `chat.send`, les écritures persistantes `/config set|unset` nécessitent également `operator.admin` ; la lecture seule `/config show` reste disponible pour les clients opérateurs normaux avec accès en écriture.
- `mcp: true` active `/mcp`OpenClaw pour la configuration du serveur MCP gérée par OpenClaw sous `mcp.servers`.
- `plugins: true` active `/plugins` pour la découverte, l'installation et les contrôles d'activation/désactivation des plugins.
- `channels.<provider>.configWrites` limite les mutations de configuration par channel (par défaut : true).
- Pour les channels multi-comptes, `channels.<provider>.accounts.<id>.configWrites` limite également les écritures ciblant ce compte (par exemple `/allowlist --config --account <id>` ou `/config set channels.<provider>.accounts.<id>...`).
- `restart: false` désactive `/restart` et les actions de l'outil de redémarrage de la passerelle. Par défaut : `true`.
- `ownerAllowFrom` est la liste d'autorisation explicite des propriétaires pour les commandes/outils réservés aux propriétaires. Elle est distincte de `allowFrom`.
- `ownerDisplay: "hash"` hache les identifiants des propriétaires dans le prompt système. Définissez `ownerDisplaySecret` pour contrôler le hachage.
- `allowFrom` est par fournisseur. Lorsqu'il est défini, c'est la **seule** source d'autorisation (les listes d'autorisation de channel/appairage et `useAccessGroups` sont ignorées).
- `useAccessGroups: false` permet aux commandes de contourner les stratégies de groupe d'accès lorsque `allowFrom` n'est pas défini.
- Carte de la documentation des commandes :
  - catalogue intégré + groupé : [Slash Commands](/fr/tools/slash-commands)
  - surfaces de commande spécifiques au channel : [Channels](/fr/channels)
  - commandes QQ Bot : [QQ Bot](/fr/channels/qqbot)
  - commandes d'appairage : [Pairing](/fr/channels/pairing)
  - commande de carte LINE : [LINE](/fr/channels/line)
  - mémoire rêveuse : [Dreaming](/fr/concepts/dreaming)

</Accordion>

---

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference) — clés de niveau supérieur
- [Configuration — agents](/fr/gateway/config-agents)
- [Vue d'ensemble des canaux](/fr/channels)
