---
summary: "Configuration de channel : contrôle d'accès, appairage, clés par channel pour Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, et plus"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "Configuration — channels"
---

Clés de configuration par channel sous `channels.*`. Couvre l'accès aux DM et aux groupes, les configurations multi-comptes, le filtrage des mentions, et les clés par channel pour Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, et les autres plugins de channel inclus.

Pour les agents, les outils, le runtime de la passerelle et d'autres clés de niveau supérieur, voir
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
        C1234567890: "openai/gpt-5.5",
      },
      telegram: {
        "-1001234567890": "openai/gpt-5.4-mini",
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
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` configurent des liaisons ACP persistantes pour les sujets de forum (utilisez `chatId:topic:topicId` canonique dans `match.peer.id`). La sémantique des champs est partagée dans [Agents ACP](/fr/tools/acp-agents#persistent-channel-bindings).
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
      suppressEmbeds: true,
      chunkMode: "length", // length | newline
      streaming: {
        mode: "progress", // off | partial | block | progress (Discord default: progress)
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
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
- Les channels qui prennent en charge les messages entrants créés par des bots peuvent utiliser une [protection commune contre les boucles de bots](/fr/channels/bot-loop-protection). Définissez `channels.defaults.botLoopProtection` pour les budgets de paires de base, puis substituez le channel ou le compte uniquement lorsqu'une surface a besoin de limites différentes.
- `channels.discord.guilds.<id>.ignoreOtherMentions` (et les remplacements de channel) supprime les messages qui mentionnent un autre utilisateur ou rôle mais pas le bot (à l'exclusion de @everyone/@here).
- `channels.discord.mentionAliases` mappe le texte stable `@handle` sortant aux ID utilisateur Discord avant l'envoi, afin que les coéquipiers connus puissent être mentionnés de manière déterministe même lorsque le cache transitoire du répertoire est vide. Les remplacements par compte se trouvent sous `channels.discord.accounts.<accountId>.mentionAliases`.
- `maxLinesPerMessage` (par défaut 17) divise les messages longs même s'ils font moins de 2000 caractères.
- `channels.discord.suppressEmbeds` est par défaut `true`, afin que les URL sortantes ne se développent pas en aperçus de liens Discord sauf si désactivé. Les charges utiles `embeds` explicites s'envoient toujours normalement ; les appels d'outil par message peuvent être remplacés avec `suppressEmbeds`.
- `channels.discord.threadBindings` contrôle le routage lié aux fils Discord :
  - `enabled` : Remplacement Discord pour les fonctionnalités de session liées aux fils (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`, et livraison/routage lié)
  - `idleHours` : Remplacement Discord pour la défocus automatique par inactivité en heures (`0` désactive)
  - `maxAgeHours`Discord : remplacement Discord pour l'âge maximal absolu en heures (`0` désactive)
  - `spawnSessions` : interrupteur pour la création et la liaison automatiques de fils de discussion `sessions_spawn({ thread: true })` et ACP (par défaut : `true`)
  - `defaultSpawnContext` : contexte de sous-agent natif pour les créations liées aux fils de discussion (`"fork"` par défaut)
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` configurent des liaisons ACP persistantes pour les channels et les fils de discussion (utilisez l'id du channel/fil dans `match.peer.id`). La sémantique des champs est partagée dans [Agents ACP](/fr/tools/acp-agents#persistent-channel-bindings).
- `channels.discord.ui.components.accentColor`Discord définit la couleur d'accentuation pour les conteneurs de composants Discord v2.
- `channels.discord.agentComponents.ttlMs` contrôle la durée pendant laquelle les rappels de composants Discord envoyés restent enregistrés. La valeur par défaut est `1800000` (30 minutes), le maximum est `86400000` (24 heures), et les remplacements par compte se trouvent sous `channels.discord.accounts.<accountId>.agentComponents.ttlMs`. Des valeurs plus longues gardent les anciens boutons/sélections/formulaires utilisables plus longtemps, il est donc préférable d'utiliser le TTL le plus court qui convient au workflow.
- `channels.discord.voice` active les conversations vocales du channel Discord et les remplacements facultatifs d'auto-join + LLM + TTS. Les configurations texte uniquement Discord désactivent la voix par défaut ; définissez `channels.discord.voice.enabled=true` pour activer.
- `channels.discord.voice.model` remplace facultativement le model LLM utilisé pour les réponses du channel vocal Discord.
- `channels.discord.voice.daveEncryption` et `channels.discord.voice.decryptionFailureTolerance` sont transmis aux options DAVE `@discordjs/voice` (`true` et `24` par défaut).
- `channels.discord.voice.connectTimeoutMs` contrôle l'attente initiale de `@discordjs/voice` Ready pour `/vc join` et les tentatives de jointure automatique (`30000` par défaut).
- `channels.discord.voice.reconnectGraceMs` contrôle la durée pendant laquelle une session vocale déconnectée peut prendre pour entrer dans la signalisation de reconnexion avant qu'OpenClaw ne la détruise (`15000` par défaut).
- La lecture vocale Discord n'est pas interrompue par l'événement de début de parole d'un autre utilisateur. Pour éviter les boucles de rétroaction, OpenClaw ignore la nouvelle capture vocale pendant que le TTS est en cours de lecture.
- OpenClaw tente également une récupération de la réception vocale en quittant/rejoignant une session vocale après des échecs répétés de déchiffrement.
- `channels.discord.streaming` est la clé canonique du mode de flux. Discord est par défaut réglé sur `streaming.mode: "progress"` pour que la progression de l'outil/travail apparaisse dans un message d'aperçu édité ; définissez `streaming.mode: "off"` pour le désactiver. Les valeurs héritées `streamMode` et booléennes `streaming` restent des alias d'exécution ; exécutez `openclaw doctor --fix` pour réécrire la configuration persistante.
- `channels.discord.autoPresence` mappe la disponibilité d'exécution à la présence du bot (sain => en ligne, dégradé => inactif, épuisé => ne pas déranger) et permet des remplacements optionnels du texte de statut.
- `channels.discord.dangerouslyAllowNameMatching` réactive la correspondance de nom/balise modifiable (mode de compatibilité brise-glace).
- `channels.discord.execApprovals` : Livraison d'approbation d'exécution native Discord et autorisation de l'approbant.
  - `enabled` : `true`, `false`, ou `"auto"` (par défaut). En mode automatique, les approbations d'exécution s'activent lorsque les approbants peuvent être résolus à partir de `approvers` ou `commands.ownerAllowFrom`.
  - `approvers` : IDs des utilisateurs Discord autorisés à approuver les requêtes d'exécution. Revient à `commands.ownerAllowFrom` en cas d'omission.
  - `agentFilter` : liste d'autorisation optionnelle des IDs d'agent. Omettez pour transmettre les approbations pour tous les agents.
  - `sessionFilter` : modèles de clé de session optionnels (sous-chaîne ou regex).
  - `target` : où envoyer les invites d'approbation. `"dm"` (par défaut) envoie aux DMs de l'approbant, `"channel"` envoie au channel d'origine, `"both"` envoie aux deux. Lorsque la cible inclut `"channel"`, les boutons ne sont utilisables que par les approbants résolus.
  - `cleanupAfterResolve` : lorsque `true`, supprime les DMs d'approbation après l'approbation, le refus ou l'expiration.

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

- JSON du compte de service : en ligne (`serviceAccount`) ou basé sur un fichier (`serviceAccountFile`).
- SecretRef de compte de service est également pris en charge (`serviceAccountRef`).
- Variables d'environnement de secours : `GOOGLE_CHAT_SERVICE_ACCOUNT` ou `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`.
- Utilisez `spaces/<spaceId>` ou `users/<userId>` pour les cibles de livraison.
- `channels.googlechat.dangerouslyAllowNameMatching` réactive la correspondance de principal de courtier d'e-mail mutable (mode de compatibilité break-glass).

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

- **Le mode Socket** nécessite à la fois `botToken` et `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` pour la variable d'environnement de secours du compte par défaut).
- **Le mode HTTP** nécessite `botToken` ainsi que `signingSecret` (à la racine ou par compte).
- `socketMode` transmet les réglages de transport du mode Socket du Slack SDK à l'Bolt du récepteur API public. À n'utiliser que lors de l'investigation des délais d'expiration ping/pong ou des comportements de websocket obsolètes. `clientPingTimeout` est par défaut `15000` ; `serverPingTimeout` et `pingPongLoggingEnabled` ne sont transmis que lorsqu'ils sont configurés.
- `botToken`, `appToken`, `signingSecret` et `userToken` acceptent des chaînes en texte brut ou des objets SecretRef.
- Les instantanés de compte Slack exposent des champs source/statut par identifiant, tels que `botTokenSource`, `botTokenStatus`, `appTokenStatus` et, en mode HTTP, `signingSecretStatus`. `configured_unavailable` signifie que le compte est configuré via SecretRef mais que le chemin de commande/runtime actuel n'a pas pu résoudre la valeur du secret.
- `configWrites: false` bloque les écritures de configuration initiées par Slack.
- Le `channels.slack.defaultAccount` facultatif remplace la sélection de compte par défaut lorsqu'il correspond à un ID de compte configuré.
- `channels.slack.streaming.mode` est la clé canonique du mode de flux Slack. `channels.slack.streaming.nativeTransport` contrôle le transport de flux natif de Slack. Les valeurs héritées `streamMode`, booléen `streaming` et `nativeStreaming` restent des alias de runtime ; exécutez `openclaw doctor --fix` pour réécrire la configuration persistante.
- `unfurlLinks` et `unfurlMedia` transmettent les booléens de lien et de déploiement média `chat.postMessage` de Slack pour les réponses des bots. `unfurlLinks` est défini par défaut sur `false` afin que les liens sortants des bots ne se développent pas en ligne, sauf s'ils sont activés ; `unfurlMedia` est omis sauf s'il est configuré. Définissez l'une ou l'autre valeur à `channels.slack.accounts.<accountId>` pour remplacer la valeur de premier niveau pour un compte.
- Utilisez `user:<id>` (DM) ou `channel:<id>` comme cibles de livraison.

**Modes de notification de réaction :** `off`, `own` (par défaut), `all`, `allowlist` (à partir de `reactionAllowlist`).

**Isolement de session de fil :** `thread.historyScope` est par fil (par défaut) ou partagé sur le channel. `thread.inheritParent` copie la transcription du channel parent vers les nouveaux fils.

- Le streaming natif Slack ainsi que le statut de fil "est en train d'écrire..." de type assistant Slack nécessitent une cible de fil de réponse. Les DMs de premier niveau restent hors fil par défaut, ils peuvent donc toujours diffuser via les aperçus de publication et de modification de brouillon Slack au lieu d'afficher l'aperçu de flux/statut natif de type fil.
- `typingReaction` ajoute une réaction temporaire au message entrant Slack pendant qu'une réponse est en cours, puis la supprime à la fin. Utilisez un code court d'émoji Slack tel que `"hourglass_flowing_sand"`.
- `channels.slack.execApprovals` : livraison native du client d'approbation Slack et autorisation de l'approbant de l'exécutif. Même schéma que Discord : `enabled` (`true`/`false`/`"auto"`), `approvers` (identifiants utilisateur Slack), `agentFilter`, `sessionFilter` et `target` (`"dm"`, `"channel"` ou `"both"`). Les approbations de plugin peuvent utiliser ce chemin natif-client pour les requêtes d'origine Slack lorsque les approbants de plugin Slack sont résolus ; la livraison native de l'approbation de plugin Slack peut également être activée via `approvals.plugin` pour les sessions d'origine Slack ou les cibles Slack. Les approbations de plugin utilisent les approbants de plugin Slack à partir de `allowFrom` et le routage par défaut, et non les approbants de l'exécutif.

| Groupe d'actions | Par défaut | Remarques                       |
| ---------------- | ---------- | ------------------------------- |
| réactions        | activé     | Réagir + lister les réactions   |
| messages         | activé     | Lire/envoyer/modifier/supprimer |
| épingles         | activé     | Épingler/désépingler/lister     |
| memberInfo       | activé     | Infos membre                    |
| emojiList        | activé     | Liste d'émojis personnalisée    |

### Mattermost

Mattermost est fourni en tant que plugin groupé dans les versions actuelles d'OpenClaw. Les versions plus anciennes ou les constructions personnalisées peuvent installer un package MattermostOpenClawnpm actuel avec
`openclaw plugins install @openclaw/mattermost`. Vérifiez
[npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost)
pour les balises de distribution (dist-tags) actuelles avant d'épingler une version.

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

Modes de chat : `oncall` (répondre aux @-mentions, par défaut), `onmessage` (chaque message), `onchar` (messages commençant par le préfixe de déclenchement).

Lorsque les commandes natives Mattermost sont activées :

- `commands.callbackPath` doit être un chemin (par exemple `/api/channels/mattermost/command`), et non une URL complète.
- `commands.callbackUrl`OpenClawMattermost doit résoudre vers le point de terminaison de la passerelle OpenClaw et être accessible depuis le serveur Mattermost.
- Les rappels de barre oblique (slash) natifs sont authentifiés avec les jetons par commande renvoyés par Mattermost lors de l'enregistrement de la commande slash. Si l'enregistrement échoue ou si aucune commande n'est activée, OpenClaw rejette les rappels avec MattermostOpenClaw`Unauthorized: invalid command token.`
- Pour les hôtes de rappel privés/tailnet/internes, Mattermost peut exiger que Mattermost`ServiceSettings.AllowedUntrustedInternalConnections` inclue l'hôte/domaine de rappel. Utilisez les valeurs d'hôte/domaine, et non les URL complètes.
- `channels.mattermost.configWrites`Mattermost : autoriser ou refuser les écritures de configuration initiées par Mattermost.
- `channels.mattermost.requireMention` : exiger `@mention` avant de répondre dans les channels.
- `channels.mattermost.groups.<channelId>.requireMention` : remplacement de la restriction de mention par channel (`"*"` pour la valeur par défaut).
- `channels.mattermost.defaultAccount` facultatif remplace la sélection de compte par défaut lorsqu'elle correspond à un identifiant de compte configuré.

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

- `channels.signal.account`Signal : épingler le démarrage du channel à une identité de compte Signal spécifique.
- `channels.signal.configWrites` : autorise ou refuse les écritures de configuration initiées par Signal.
- `channels.signal.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un identifiant de compte configuré.

### iMessage

OpenClaw génère `imsg rpc` (JSON-RPC via stdio). Aucun démon ou port requis. C'est la méthode recommandée pour les nouvelles configurations OpenClaw iMessage lorsque l'hôte peut accorder des autorisations pour la base de données Messages et l'Automatisation.

La prise en charge de BlueBubbles a été supprimée. BlueBubbles`channels.bluebubbles`OpenClaw n'est pas une surface de configuration d'exécution prise en charge sur OpenClaw actuel. Migrez les anciennes configurations vers `channels.imessage`BlueBubblesiMessage ; utilisez [Suppression de BlueBubbles et le chemin imsg iMessage](/fr/announcements/bluebubbles-imessageBlueBubbles) pour la version courte et [Venant de BlueBubbles](/fr/channels/imessage-from-bluebubbles) pour le tableau de traduction complet.

Si le Gateway ne fonctionne pas sur le Mac Messages connecté, conservez `channels.imessage.enabled=true` et définissez `channels.imessage.cliPath` sur un wrapper SSH qui exécute `imsg "$@"` sur ce Mac. Le chemin local par défaut `imsg` est réservé à macOS.

Avant de vous fier à un wrapper SSH pour les envois en production, vérifiez un `imsg send` sortant via ce wrapper exact. Certains états TCC de macOS assignent l'automatisation des messages à `/usr/libexec/sshd-keygen-wrapper`, ce qui peut permettre aux lectures et aux sondages de fonctionner tandis que les envois échouent avec `-1743` AppleEvents ; voir [SSH wrapper sends fail with AppleEvents -1743](/fr/channels/imessage#ssh-wrapper-sends-fail-with-appleevents-1743).

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

- Nécessite un accès complet au disque (Full Disk Access) à la base de données Messages.
- Privilégiez les cibles `chat_id:<id>`. Utilisez `imsg chats --limit 20` pour lister les discussions.
- `cliPath` peut pointer vers un wrapper SSH ; définissez `remoteHost` (`host` ou `user@host`) pour la récupération des pièces jointes SCP.
- `attachmentRoots` et `remoteAttachmentRoots` restreignent les chemins des pièces jointes entrantes (par défaut : `/Users/*/Library/Messages/Attachments`).
- SCP utilise une vérification stricte de la clé de l'hôte, assurez-vous donc que la clé de l'hôte de relais existe déjà dans `~/.ssh/known_hosts`.
- `channels.imessage.configWrites` : autoriser ou interdire les écritures de configuration initiées par iMessage.
- `channels.imessage.actions.*` : activer les actions de l'API privé qui sont également contrôlées par `imsg status` / `openclaw channels status --probe`.
- `channels.imessage.includeAttachments` est désactivé par défaut ; définissez-le sur `true` avant d'attendre des médias entrants lors des tours de l'agent.
- `channels.imessage.catchup.enabled` : accepter de relire les messages entrants qui sont arrivés alors que le Gateway était hors ligne.
- `channels.imessage.groups` : registre des groupes et paramètres par groupe. Avec `groupPolicy: "allowlist"`, configurez soit des clés `chat_id` explicites soit une entrée générique `"*"` afin que les messages de groupe puissent passer la porte du registre.
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` peuvent lier des conversations iMessage à des sessions ACP persistantes. Utilisez un identifiant normalisé ou une cible de discussion explicite (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`) dans `match.peer.id`. Sémantique de champ partagée : [ACP Agents](/fr/tools/acp-agents#persistent-channel-bindings).

<Accordion title="Exemple de wrapper SSH iMessage">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix est basé sur un plugin et configuré sous `channels.matrix`.

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
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` permet les serveurs domestiques privés/internes. `proxy` et cette option d'adhésion au réseau sont des contrôles indépendants.
- `channels.matrix.defaultAccount` sélectionne le compte préféré dans les configurations multi-comptes.
- `channels.matrix.autoJoin` par défaut est `off`, donc les salles invitées et les nouvelles invitations de style DM sont ignorées jusqu'à ce que vous définissiez `autoJoin: "allowlist"` avec `autoJoinAllowlist` ou `autoJoin: "always"`.
- `channels.matrix.execApprovals` : livraison des approbations d'exécution native Matrix et autorisation des approbateurs.
  - `enabled` : `true`, `false`, ou `"auto"` (par défaut). En mode automatique, les approbations d'exécution s'activent lorsque les approbateurs peuvent être résolus depuis `approvers` ou `commands.ownerAllowFrom`.
  - `approvers` : IDs utilisateur Matrix (ex. `@owner:example.org`) autorisés à approuver les demandes d'exécution.
  - `agentFilter` : liste d'autorisation d'ID d'agent optionnelle. Omettez pour transférer les approbations pour tous les agents.
  - `sessionFilter` : modèles de clés de session optionnels (sous-chaîne ou regex).
  - `target` : où envoyer les invites d'approbation. `"dm"` (par défaut), `"channel"` (salon d'origine), ou `"both"`.
  - Remplacements par compte : `channels.matrix.accounts.<id>.execApprovals`.
- `channels.matrix.dm.sessionScope`Matrix contrôle le regroupement des DMs Matrix en sessions : `per-user` (par défaut) partage par pair routé, tandis que `per-room` isole chaque salon de DM.
- Les sondages de statut Matrix et les recherches d'annuaire en temps réel utilisent la même stratégie de proxy que le trafic d'exécution.
- La configuration complète de Matrix, les règles de ciblage et les exemples de configuration sont documentés dans [Matrix](MatrixMatrix/en/channels/matrix).

### Microsoft Teams

Microsoft Teams est pris en charge par un plugin et configuré sous Microsoft Teams`channels.msteams`.

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

- Chemins de clés principaux couverts ici : `channels.msteams`, `channels.msteams.configWrites`.
- La configuration complète de Teams (identifiants, webhook, stratégie DM/groupe, remplacements par équipe/par canal) est documentée dans [Microsoft Teams](Microsoft Teams/en/channels/msteams).

### IRC

IRC est pris en charge par un plugin et configuré sous `channels.irc`.

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

- Chemins de clés principaux couverts ici : `channels.irc`, `channels.irc.dmPolicy`, `channels.irc.configWrites`, `channels.irc.nickserv.*`.
- `channels.irc.defaultAccount` optionnel remplace la sélection de compte par défaut lorsqu'il correspond à un ID de compte configuré.
- La configuration complète du canal IRC (hôte/port/TLS/canaux/listes autorisées/gestion des mentions) est documentée dans [IRC](/fr/channels/irc).

### Multi-compte (tous les canaux)

Exécuter plusieurs comptes par canal (chacun avec son propre `accountId`) :

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

- `default` est utilisé lorsque `accountId`CLI est omis (CLI + routage).
- Les jetons d'environnement ne s'appliquent qu'au compte **par défaut**.
- Les paramètres de canal de base s'appliquent à tous les comptes, sauf s'ils sont remplacés par compte.
- Utilisez `bindings[].match.accountId` pour router chaque compte vers un agent différent.
- Si vous ajoutez un compte non défini par défaut via `openclaw channels add` (ou l'onboarding de canal) tout en restant sur une configuration de canal de premier niveau à compte unique, OpenClaw promeut d'abord les valeurs de premier niveau à compte unique délimitées au compte dans la carte des comptes de canal afin que le compte d'origine continue de fonctionner. La plupart des canaux les déplacent vers `channels.<channel>.accounts.default` ; Matrix peut à la place préserver une cible par défaut ou nommée correspondante existante.
- Les liaisons existantes propres au canal (sans `accountId`) continuent de correspondre au compte par défaut ; les liaisons délimitées au compte restent facultatives.
- `openclaw doctor --fix` répare également les formes mixtes en déplaçant les valeurs de premier niveau à compte unique délimitées au compte vers le compte promu choisi pour ce canal. La plupart des canaux utilisent `accounts.default` ; Matrix peut à la place préserver une cible par défaut ou nommée correspondante existante.

### Autres canaux de plugin

De nombreux canaux de plugin sont configurés en tant que `channels.<id>` et documentés dans leurs pages de canal dédiées (par exemple Feishu, Matrix, LINE, Nostr, Zalo, Nextcloud Talk, Synology Chat et Twitch).
Voir l'index complet des canaux : [Channels](/fr/channels).

### Filtrage des mentions dans les discussions de groupe

Les messages de groupe requièrent par défaut une **mention** (mention de métadonnées ou motifs d'expression régulière sûrs). S'applique aux discussions de groupe WhatsApp, Telegram, Discord, Google Chat et iMessage.

Les réponses visibles sont contrôlées séparément. Les demandes directes de groupe normales, de canal et de WebChat interne sont par défaut livrées automatiquement de manière finale : le texte final de l'assistant est publié via le chemin de réponse visible hérité. Optez pour WebChat`messages.visibleReplies: "message_tool"` ou `messages.groupChat.visibleReplies: "message_tool"` lorsque la sortie visible ne doit être publiée qu'après que l'agent a appelé `message(action=send)`. Si le modèle renvoie du texte final sans appeler l'outil de message dans un mode outil uniquement activé, ce texte final reste privé et le journal détaillé de la passerelle enregistre les métadonnées de la charge utile supprimée.

Les réponses visibles en mode outil uniquement nécessitent un modèle/exécution qui appelle les outils de manière fiable et sont recommandées pour les salons ambiants partagés sur les modèles de dernière génération tels que GPT 5.5. Certains modèles plus faibles peuvent répondre avec un texte final mais échouent à comprendre que la sortie visible par la source doit être envoyée avec `message(action=send)`. Pour ces modèles, utilisez `"automatic"` afin que le tour final de l'assistant soit le chemin de réponse visible. Si le journal de session affiche du texte d'assistant avec `didSendViaMessagingTool: false`, le modèle a produit un texte final privé au lieu d'appeler l'outil de message. Passez à un modèle d'appel d'outil plus robuste pour ce canal, inspectez le journal détaillé de la passerelle pour le résumé de la charge utile supprimée, ou définissez `messages.groupChat.visibleReplies: "automatic"` pour utiliser des réponses finales visibles pour chaque demande de groupe/canal.

Si l'outil de message n'est pas disponible sous la stratégie d'outil active, OpenClaw revient aux réponses visibles automatiques au lieu de supprimer silencieusement la réponse. `openclaw doctor` avertit concernant cette inadéquation.

Cette règle s'applique au texte final de l'agent normal. Les liaisons de conversation détenues par un plugin utilisent la réponse renvoyée par le plugin propriétaire comme réponse visible pour les tours de fil liés réclamés ; le plugin n'a pas besoin d'appeler `message(action=send)` pour ces réponses de liaison.

**Dépannage : une @mention de groupe déclenche la saisie puis le silence (pas d'erreur)**

Symptôme : une @mention de groupe/canal affiche l'indicateur de saisie et le journal de la passerelle rapporte `dispatch complete (queuedFinal=false, replies=0)`, mais aucun message n'arrive dans le salon. Les DMs au même agent répondent normalement.

Cause : le mode de réponse visible du groupe/channel est résolu en `"message_tool"`OpenClaw, donc OpenClaw exécute le tour mais supprime le texte final de l'assistant, sauf si l'agent appelle `message(action=send)`. Il n'y a pas de contrat `NO_REPLY` dans ce mode ; aucun appel de message-tool signifie aucune réponse source. Il n'y a pas d'erreur car la suppression est le comportement configuré. Les tours normaux de groupe et de channel sont par défaut `"automatic"`, ce symptôme n'apparaît donc que lorsque `messages.groupChat.visibleReplies` (ou le `messages.visibleReplies` global) est explicitement défini sur `"message_tool"`. Le harnais `defaultVisibleReplies` ne s'applique pas ici — le résolveur de groupe/channel l'ignore ; il n'affecte que les chats directs/source (le harnais Codex supprime les finaux de chat direct de cette manière).

Fix : choisissez soit un modèle d'appel d'outil plus performant, supprimez la substitution explicite `"message_tool"` pour revenir à la valeur par défaut `"automatic"`, ou définissez `messages.groupChat.visibleReplies: "automatic"` pour forcer les réponses visibles pour chaque demande de groupe/channel. La passerelle recharge à chaud la configuration `messages` après l'enregistrement du fichier ; ne redémarrez la passerelle que lorsque la surveillance des fichiers ou le rechargement de la configuration est désactivé dans le déploiement.

**Types de mention :**

- **Mentions de métadonnées** : @-mentions natives de la plateforme. Ignorées en mode self-chat WhatsApp.
- **Modèles de texte** : Modèles d'expressions rationnelles sécurisés dans `agents.list[].groupChat.mentionPatterns`. Les modèles non valides et les répétitions imbriquées non sécurisées sont ignorés.
- Le filtrage par mention n'est appliqué que lorsque la détection est possible (mentions natives ou au moins un modèle).

```json5
{
  messages: {
    visibleReplies: "automatic", // force old automatic final replies for direct/source chats
    groupChat: {
      historyLimit: 50,
      unmentionedInbound: "room_event", // always-on unmentioned room chatter becomes quiet context
      visibleReplies: "message_tool", // opt-in; require message(action=send) for visible room replies
    },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` définit la valeur par défaut globale. Les channels peuvent la remplacer avec `channels.<channel>.historyLimit` (ou par compte). Définissez `0` pour désactiver.

`messages.groupChat.unmentionedInbound: "room_event"` soumet les messages de groupe/channel toujours actifs sans mention en tant que contexte de salon silencieux sur les channels pris en charge. Les messages mentionnés, les commandes et les messages directs restent des demandes utilisateur. Voir [Ambient room events](/fr/channels/ambient-room-events) pour des exemples complets sur Discord, Slack et Telegram.

`messages.visibleReplies` est la valeur par défaut globale pour les événements source ; `messages.groupChat.visibleReplies` la remplace pour les événements source de groupe/canal. Lorsque `messages.visibleReplies`WebChat n'est pas défini, les discussions directes/source utilisent le runtime sélectionné ou le harnais par défaut, mais les tours directs WebChat internes utilisent la livraison finale automatique pour la parité des invites Pi/Codex. Définissez `messages.visibleReplies: "message_tool"` pour exiger intentionnellement `message(action=send)` pour la sortie visible. Les listes d'autorisation de canal et le filtrage des mentions décident toujours si un événement est traité.

#### Limites d'historique DM

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

Résolution : remplacement par DM → valeur par défaut du fournisseur → aucune limite (tout conservé).

Pris en charge : `telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `msteams`.

#### Mode auto-discussion

Incluez votre propre numéro dans `allowFrom` pour activer le mode auto-discussion (ignore les mentions @ natives, répond uniquement aux modèles de texte) :

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

### Commandes (gestion des commandes de discussion)

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

- Ce bloc configure les surfaces de commande. Pour le catalogue actuel des commandes intégrées + groupées, voir [Slash Commands](/fr/tools/slash-commands).
- Cette page est une **référence de clés de configuration**, et non le catalogue complet des commandes. Les commandes détenues par le canal/plugin telles que QQ Bot `/bot-ping` `/bot-help` `/bot-logs`, LINE `/card`, device-pair `/pair`, memory `/dreaming`, phone-control `/phone` et Talk `/voice` sont documentées dans leurs pages de canal/plugin ainsi que dans [Slash Commands](/fr/tools/slash-commands).
- Les commandes textuelles doivent être des messages **autonomes** commençant par `/`.
- `native: "auto"` active les commandes natives pour Discord/Telegram, les désactive pour Slack.
- `nativeSkills: "auto"` active les commandes natives de compétences pour Discord/Telegram, les désactive pour Slack.
- Remplacement par canal : `channels.discord.commands.native` (booléen ou `"auto"`). Pour Discord, `false` ignore l'enregistrement et le nettoyage des commandes natives lors du démarrage.
- Remplace l'enregistrement des compétences natives par canal avec `channels.<provider>.commands.nativeSkills`.
- `channels.telegram.customCommands` ajoute des entrées supplémentaires au menu du bot Telegram.
- `bash: true` active `! <cmd>` pour le shell hôte. Nécessite `tools.elevated.enabled` et l'expéditeur dans `tools.elevated.allowFrom.<channel>`.
- `config: true` active `/config` (lit/écrit `openclaw.json`). Pour les clients gateway `chat.send`, les écritures persistantes `/config set|unset` nécessitent également `operator.admin` ; la lecture seule `/config show` reste disponible pour les clients opérateurs avec scope d'écriture normal.
- `mcp: true` active `/mcp` pour la configuration du serveur MCP gérée par OpenClaw sous `mcp.servers`.
- `plugins: true` active `/plugins` pour la découverte de plugins, l'installation et les contrôles d'activation/désactivation.
- `channels.<provider>.configWrites` verrouille les mutations de configuration par canal (par défaut : true).
- Pour les canaux multi-comptes, `channels.<provider>.accounts.<id>.configWrites` verrouille également les écritures qui ciblent ce compte (par exemple `/allowlist --config --account <id>` ou `/config set channels.<provider>.accounts.<id>...`).
- `restart: false` désactive `/restart` et les actions de l'outil de redémarrage de la passerelle. Par défaut : `true`.
- `ownerAllowFrom` est la liste d'autorisation explicite des propriétaires pour les commandes réservées aux propriétaires et les actions de canal limitées aux propriétaires. Elle est distincte de `allowFrom`.
- `ownerDisplay: "hash"` hache les identifiants des propriétaires dans le système d'invite. Définissez `ownerDisplaySecret` pour contrôler le hachage.
- `allowFrom` est par fournisseur. Lorsqu'il est défini, c'est la **seule** source d'autorisation (les listes d'autorisation de canal/appairage et `useAccessGroups` sont ignorées).
- `useAccessGroups: false` permet aux commandes de contourner les stratégies de groupe d'accès lorsque `allowFrom` n'est pas défini.
- Carte de documentation des commandes :
  - catalogue intégré + groupé : [Slash Commands](/fr/tools/slash-commands)
  - surfaces de commande spécifiques au canal : [Channels](/fr/channels)
  - commandes QQ Bot : [QQ Bot](/fr/channels/qqbot)
  - commandes d'appairage : [Pairing](/fr/channels/pairing)
  - commande de carte LINE : [LINE](/fr/channels/line)
  - rêverie mémoire : [Dreaming](/fr/concepts/dreaming)

</Accordion>

---

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference) — clés de premier niveau
- [Configuration — agents](/fr/gateway/config-agents)
- [Vue d'ensemble des canaux](/fr/channels)
