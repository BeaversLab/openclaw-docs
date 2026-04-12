---
title: "Configuration Reference"
summary: "Référence de configuration du Gateway pour les clés de base d'OpenClaw, les valeurs par défaut et les liens vers les références des sous-systèmes dédiés"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

# Référence de configuration

Référence de configuration principale pour `~/.openclaw/openclaw.json`. Pour une présentation orientée tâche, voir [Configuration](/en/gateway/configuration).

Cette page couvre les surfaces de configuration principales OpenClaw et renvoie vers des liens externes lorsqu'un sous-système possède sa propre référence approfondie. Elle n'essaie **pas** d'incorporer en ligne chaque catalogue de commandes appartenant à un channel/plugin ou chaque paramètre avancé de mémoire/QMD sur une seule page.

Vérité du code :

- `openclaw config schema` affiche le schéma JSON en direct utilisé pour la validation et l'interface de contrôle, avec les métadonnées intégrées/plugin/channel fusionnées si disponibles
- `config.schema.lookup` renvoie un nœud de schéma délimité par un chemin pour les outils d'exploration
- `pnpm config:docs:check` / `pnpm config:docs:gen` valident le haché de base config-doc par rapport à la surface du schéma actuel

Références approfondies dédiées :

- [Référence de configuration de la mémoire](/en/reference/memory-config) pour `agents.defaults.memorySearch.*`, `memory.qmd.*`, `memory.citations`, et la configuration de rêve sous `plugins.entries.memory-core.config.dreaming`
- [Commandes Slash](/en/tools/slash-commands) pour le catalogue de commandes intégré + groupé actuel
- pages de propriétaire de channel/plugin pour les surfaces de commandes spécifiques aux channels

Le format de configuration est **JSON5** (commentaires et virgules de fin autorisés). Tous les champs sont facultatifs — OpenClaw utilise des valeurs par défaut sécurisées en cas d'omission.

---

## Channels

Chaque channel démarre automatiquement lorsque sa section de configuration existe (sauf si `enabled: false`).

### Accès DM et groupe

Tous les channels prennent en charge les politiques DM et les politiques de groupe :

| Politique DM           | Comportement                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `pairing` (par défaut) | Les expéditeurs inconnus reçoivent un code d'appariement unique ; le propriétaire doit approuver |
| `allowlist`            | Seuls les expéditeurs dans `allowFrom` (ou le magasin d'autorisation associé)                    |
| `open`                 | Autoriser tous les DM entrants (nécessite `allowFrom: ["*"]`)                                    |
| `disabled`             | Ignorer tous les DM entrants                                                                     |

| Politique de groupe      | Comportement                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `allowlist` (par défaut) | Seuls les groupes correspondant à la liste d'autorisation configurée                         |
| `open`                   | Contourner les listes d'autorisation de groupe (le filtrage par mention s'applique toujours) |
| `disabled`               | Bloquer tous les messages de groupe/salle                                                    |

<Note>
`channels.defaults.groupPolicy` définit la valeur par défaut lorsque le `groupPolicy` d'un provider n'est pas défini.
Les codes d'appariement expirent après 1 heure. Les demandes d'appariement DM en attente sont limitées à **3 par channel**.
Si un bloc provider est entièrement manquant (`channels.<provider>` absent), la stratégie de groupe d'exécution revient à `allowlist` (fail-closed) avec un avertissement au démarrage.
</Note>

### Remplacements de model de channel

Utilisez `channels.modelByChannel` pour associer des ID de channel spécifiques à un model. Les valeurs acceptent `provider/model` ou des alias de model configurés. Le mappage de channel s'applique lorsqu'une session n'a pas déjà de substitution de model (par exemple, défini via `/model`).

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

### Valeurs par défaut de channel et heartbeat

Utilisez `channels.defaults` pour un comportement partagé de stratégie de groupe et de heartbeat entre les providers :

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

- `channels.defaults.groupPolicy` : stratégie de groupe de repli lorsqu'un `groupPolicy` au niveau du provider n'est pas défini.
- `channels.defaults.contextVisibility` : mode de visibilité du contexte supplémentaire par défaut pour tous les channels. Valeurs : `all` (par défaut, inclut tout le contexte cité/fil/historique), `allowlist` (inclut uniquement le contexte des expéditeurs autorisés), `allowlist_quote` (identique à la liste d'autorisation mais conserve le contexte de citation/réponse explicite). Substitution par channel : `channels.<channel>.contextVisibility`.
- `channels.defaults.heartbeat.showOk` : inclure les statuts de channels sains dans la sortie du heartbeat.
- `channels.defaults.heartbeat.showAlerts` : inclure les statuts dégradés/erreur dans la sortie du heartbeat.
- `channels.defaults.heartbeat.useIndicator` : afficher une sortie de heartbeat compacte de style indicateur.

### WhatsApp

WhatsApp s'exécute via le web channel de la passerelle (Baileys Web). Il démarre automatiquement lorsqu'une session liée existe.

```json5
{
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
  web: {
    enabled: true,
    heartbeatSeconds: 60,
    reconnect: {
      initialMs: 2000,
      maxMs: 120000,
      factor: 1.4,
      jitter: 0.2,
      maxAttempts: 0,
    },
  },
}
```

<Accordion title="Multi-compte WhatsApp">

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

- Les commandes sortantes par défaut utilisent le compte `default` s'il est présent ; sinon le premier id de compte configuré (trié).
- `channels.whatsapp.defaultAccount` facultatif remplace cette sélection de compte par défaut de repli lorsqu'elle correspond à un id de compte configuré.
- L'ancien répertoire d'authentification Baileys à compte unique est migré par `openclaw doctor` vers `whatsapp/default`.
- Substitutions par compte : `channels.whatsapp.accounts.<id>.sendReadReceipts`, `channels.whatsapp.accounts.<id>.dmPolicy`, `channels.whatsapp.accounts.<id>.allowFrom`.

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
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Bot token : `channels.telegram.botToken` ou `channels.telegram.tokenFile` (fichier régulier uniquement ; symlinks rejetés), avec `TELEGRAM_BOT_TOKEN` comme repli pour le compte par défaut.
- `channels.telegram.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'elle correspond à un id de compte configuré.
- Dans les configurations multi-comptes (2+ identifiants de compte), définissez une valeur par défaut explicite (`channels.telegram.defaultAccount` ou `channels.telegram.accounts.default`) pour éviter le routage de repli ; `openclaw doctor` avertit lorsque cela est manquant ou invalide.
- `configWrites: false` bloque les écritures de configuration initiées par Telegram (migrations d'ID de supergroupe, `/config set|unset`).
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` configurent des liaisons ACP persistantes pour les sujets de forum (utilisez le `chatId:topic:topicId` canonique dans `match.peer.id`). La sémantique des champs est partagée dans [Agents ACP](/en/tools/acp-agents#channel-specific-settings).
- Les aperçus de flux Telegram utilisent `sendMessage` + `editMessageText` (fonctionne dans les chats directs et de groupe).
- Politique de réessai : voir [Politique de réessai](/en/concepts/retry).

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
      streaming: "off", // off | partial | block | progress (progress maps to partial on Discord)
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
        spawnSubagentSessions: false, // opt-in for sessions_spawn({ thread: true })
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

- Jeton : `channels.discord.token`, avec `DISCORD_BOT_TOKEN` comme valeur de repli pour le compte par défaut.
- Les appels sortants directs qui fournissent un `token` explicite Discord utilisent ce jeton pour l'appel ; les paramètres de réessai/politique de compte proviennent toujours du compte sélectionné dans l'instantané d'exécution actif.
- `channels.discord.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un identifiant de compte configuré.
- Utilisez `user:<id>` (DM) ou `channel:<id>` (channel de guilde) pour les cibles de livraison ; les ID numériques seuls sont rejetés.
- Les slugs de guilde sont en minuscules avec les espaces remplacés par `-` ; les clés de channel utilisent le nom sluggé (pas de `#`). Préférez les ID de guilde.
- Les messages rédigés par des bots sont ignorés par défaut. `allowBots: true` les active ; utilisez `allowBots: "mentions"` pour n'accepter que les messages de bot qui mentionnent le bot (les propres messages sont toujours filtrés).
- `channels.discord.guilds.<id>.ignoreOtherMentions` (et les remplacements de channel) supprime les messages qui mentionnent un autre utilisateur ou rôle mais pas le bot (à l'exclusion de @everyone/@here).
- `maxLinesPerMessage` (par défaut 17) divise les messages longs même lorsqu'ils font moins de 2000 caractères.
- `channels.discord.threadBindings` contrôle le routage lié aux fils de discussion Discord :
  - `enabled` : Redéfinition Discord pour les fonctionnalités de session liées aux fils (`/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`, et la livraison/le routage liés)
  - `idleHours` : Redéfinition Discord pour la désactivation automatique par inactivité en heures (`0` désactive)
  - `maxAgeHours` : Redéfinition Discord pour l'âge maximal strict en heures (`0` désactive)
  - `spawnSubagentSessions` : Option d'activation pour la création/liaison automatique de fils `sessions_spawn({ thread: true })`
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` configurent les liaisons ACP persistantes pour les canaux et les fils (utilisez l'identifiant du canal/fil dans `match.peer.id`). La sémantique des champs est partagée dans [ACP Agents](/en/tools/acp-agents#channel-specific-settings).
- `channels.discord.ui.components.accentColor` définit la couleur d'accentuation pour les conteneurs de composants Discord v2.
- `channels.discord.voice` active les conversations de canal vocal Discord et les redéfinitions optionnelles d'auto-join et de TTS.
- `channels.discord.voice.daveEncryption` et `channels.discord.voice.decryptionFailureTolerance` sont transmis aux options DAVE `@discordjs/voice` (`true` et `24` par défaut).
- OpenClaw tente également une récupération de la réception vocale en quittant/rejoignant une session vocale après des échecs de déchiffrement répétés.
- `channels.discord.streaming` est la clé canonique du mode flux. Les valeurs héritées `streamMode` et booléennes `streaming` sont automatiquement migrées.
- `channels.discord.autoPresence` fait correspondre la disponibilité à l'exécution à la présence du bot (healthy => en ligne, degraded => inactif, exhausted => ne pas déranger) et permet des redéfinitions optionnelles du texte d'état.
- `channels.discord.dangerouslyAllowNameMatching` réactive la correspondance de nom/balise modifiable (mode de compatibilité break-glass).
- `channels.discord.execApprovals` : Livraison des approbations d'exécution native Discord et autorisation des approbateurs.
  - `enabled` : `true`, `false` ou `"auto"` (par défaut). En mode automatique, les approbations d'exécution s'activent lorsque les approbateurs peuvent être résolus à partir de `approvers` ou `commands.ownerAllowFrom`.
  - `approvers` : ID utilisateurs Discord autorisés à approuver les demandes d'exécution. Revient à `commands.ownerAllowFrom` si omis.
  - `agentFilter` : liste de blanche (allowlist) d'ID d'agents optionnelle. Omettre pour transmettre les approbations pour tous les agents.
  - `sessionFilter` : modèles de clés de session optionnels (sous-chaîne ou regex).
  - `target` : où envoyer les invites d'approbation. `"dm"` (par défaut) envoie aux MP des approbateurs, `"channel"` envoie au channel d'origine, `"both"` envoie aux deux. Lorsque la cible inclut `"channel"`, les boutons ne sont utilisables que par les approbateurs résolus.
  - `cleanupAfterResolve` : lorsque `true`, supprime les MP d'approbation après approbation, refus ou expiration.

**Modes de notification par réaction :** `off` (aucun), `own` (messages du bot, par défaut), `all` (tous les messages), `allowlist` (à partir de `guilds.<id>.users` sur tous les messages).

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

- JSON de compte de service : en ligne (`serviceAccount`) ou basé sur fichier (`serviceAccountFile`).
- SecretRef de compte de service est également pris en charge (`serviceAccountRef`).
- Alternatives d'env : `GOOGLE_CHAT_SERVICE_ACCOUNT` ou `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`.
- Utilisez `spaces/<spaceId>` ou `users/<userId>` pour les cibles de livraison.
- `channels.googlechat.dangerouslyAllowNameMatching` réactive le correspondant de principal mutable par e-mail (mode de compatibilité break-glass).

### Slack

```json5
{
  channels: {
    slack: {
      enabled: true,
      botToken: "xoxb-...",
      appToken: "xapp-...",
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

- Le **mode Socket** nécessite à la fois `botToken` et `appToken` (`SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` pour l'alternative d'env de compte par défaut).
- Le **mode HTTP** nécessite `botToken` plus `signingSecret` (à la racine ou par compte).
- `botToken`, `appToken`, `signingSecret` et `userToken` acceptent des chaînes de caractères en texte brut ou des objets SecretRef.
- Les instantanés de compte Slack exposent des champs source/statut par identifiant, tels que `botTokenSource`, `botTokenStatus`, `appTokenStatus` et, en mode HTTP, `signingSecretStatus`. `configured_unavailable` signifie que le compte est configuré via SecretRef mais que le chemin de commande/runtime actuel n'a pas pu résoudre la valeur du secret.
- `configWrites: false` bloque les écritures de configuration initiées par Slack.
- `channels.slack.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un ID de compte configuré.
- `channels.slack.streaming.mode` est la clé canonique du mode de flux Slack. `channels.slack.streaming.nativeTransport` contrôle le transport de flux natif de Slack. Les valeurs héritées `streamMode`, booléen `streaming` et `nativeStreaming` sont automatiquement migrées.
- Utilisez `user:<id>` (DM) ou `channel:<id>` comme cibles de livraison.

**Modes de notification par réaction :** `off`, `own` (par défaut), `all`, `allowlist` (à partir de `reactionAllowlist`).

**Isolement de session de fil de discussion :** `thread.historyScope` est par fil de discussion (par défaut) ou partagé sur le channel. `thread.inheritParent` copie la transcription du channel parent vers les nouveaux fils de discussion.

- Le flux natif Slack ainsi que le statut de fil de discussion de type "est en train d'écrire..." de l'assistant Slack nécessitent une cible de fil de réponse. Les DM de premier niveau restent hors fil par défaut, ils utilisent donc `typingReaction` ou une livraison normale au lieu de l'aperçu de style fil de discussion.
- `typingReaction` ajoute une réaction temporaire au message entrant Slack pendant l'exécution d'une réponse, puis la supprime à la fin. Utilisez un code court d'émoji Slack tel que `"hourglass_flowing_sand"`.
- `channels.slack.execApprovals` : Livraison de l'approbation d'exécution native Slack et autorisation de l'approbant. Même schéma que Discord : `enabled` (`true`/`false`/`"auto"`), `approvers` (identifiants utilisateurs Slack), `agentFilter`, `sessionFilter` et `target` (`"dm"`, `"channel"` ou `"both"`).

| Groupe d'action | Par défaut | Remarques                       |
| --------------- | ---------- | ------------------------------- |
| réactions       | activé     | Réagir + lister les réactions   |
| messages        | activé     | Lire/envoyer/modifier/supprimer |
| épingles        | activé     | Épingler/désépingler/lister     |
| memberInfo      | activé     | Infos membre                    |
| emojiList       | activé     | Liste d'emojis personnalisés    |

### Mattermost

Mattermost est fourni en tant que plugin : `openclaw plugins install @openclaw/mattermost`.

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

Modes de chat : `oncall` (répondre à la mention @, par défaut), `onmessage` (chaque message), `onchar` (messages commençant par le préfixe de déclenchement).

Lorsque les commandes natives Mattermost sont activées :

- `commands.callbackPath` doit être un chemin (par exemple `/api/channels/mattermost/command`), et non une URL complète.
- `commands.callbackUrl` doit résoudre vers le point de terminaison de la passerelle OpenClaw et être accessible depuis le serveur Mattermost.
- Les rappels de slash natifs sont authentifiés avec les jetons par commande renvoyés par Mattermost lors de l'enregistrement des commandes slash. Si l'enregistrement échoue ou si aucune commande n'est activée, OpenClaw rejette les rappels avec `Unauthorized: invalid command token.`
- Pour les hôtes de rappel privés/tailnet/internes, Mattermost peut exiger que `ServiceSettings.AllowedUntrustedInternalConnections` inclue l'hôte/le domaine de rappel. Utilisez les valeurs d'hôte/de domaine, pas les URL complètes.
- `channels.mattermost.configWrites` : autoriser ou refuser les écritures de configuration initiées par Mattermost.
- `channels.mattermost.requireMention` : exiger `@mention` avant de répondre dans les canaux.
- `channels.mattermost.groups.<channelId>.requireMention` : remplacement de la limitation par mention par canal (`"*"` pour la valeur par défaut).
- `channels.mattermost.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'elle correspond à un identifiant de compte configuré.

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

- `channels.signal.account` : épingler le démarrage du canal à une identité de compte Signal spécifique.
- `channels.signal.configWrites` : autoriser ou refuser les écritures de configuration initiées par Signal.
- `channels.signal.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un identifiant de compte configuré.

### BlueBubbles

BlueBubbles est le chemin iMessage recommandé (pris en charge par un plugin, configuré sous `channels.bluebubbles`).

```json5
{
  channels: {
    bluebubbles: {
      enabled: true,
      dmPolicy: "pairing",
      // serverUrl, password, webhookPath, group controls, and advanced actions:
      // see /channels/bluebubbles
    },
  },
}
```

- Chemins de clés principaux couverts ici : `channels.bluebubbles`, `channels.bluebubbles.dmPolicy`.
- `channels.bluebubbles.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un identifiant de compte configuré.
- Les entrées `bindings[]` de niveau supérieur avec `type: "acp"` peuvent lier les conversations BlueBubbles à des sessions ACP persistantes. Utilisez un identifiant ou une chaîne cible BlueBubbles (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`) dans `match.peer.id`. Sémantique de champ partagée : [ACP Agents](/en/tools/acp-agents#channel-specific-settings).
- La configuration complète du canal BlueBubbles est documentée dans [BlueBubbles](/en/channels/bluebubbles).

### iMessage

OpenClaw génère `imsg rpc` (JSON-RPC via stdio). Aucun démon ou port requis.

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
    },
  },
}
```

- `channels.imessage.defaultAccount` facultatif remplace la sélection du compte par défaut lorsqu'il correspond à un identifiant de compte configuré.

- Nécessite un accès complet au disque (Full Disk Access) à la base de données Messages.
- Privilégiez les cibles `chat_id:<id>`. Utilisez `imsg chats --limit 20` pour lister les discussions.
- `cliPath` peut pointer vers un wrapper SSH ; définissez `remoteHost` (`host` ou `user@host`) pour la récupération des pièces jointes SCP.
- `attachmentRoots` et `remoteAttachmentRoots` restreignent les chemins des pièces jointes entrantes (par défaut : `/Users/*/Library/Messages/Attachments`).
- SCP utilise une vérification stricte de la clé de l'hôte (host-key checking), assurez-vous donc que la clé de l'hôte de relais existe déjà dans `~/.ssh/known_hosts`.
- `channels.imessage.configWrites` : autoriser ou refuser les écritures de configuration initiées par iMessage.
- Les entrées `bindings[]` de premier niveau avec `type: "acp"` peuvent lier les conversations iMessage à des sessions ACP persistantes. Utilisez un identifiant normalisé ou une cible de chat explicite (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`) dans `match.peer.id`. Sémantique de champ partagée : [ACP Agents](/en/tools/acp-agents#channel-specific-settings).

<Accordion title="Exemple de wrapper SSH iMessage">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix est pris en charge par une extension et configuré sous `channels.matrix`.

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
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` autorise les serveurs domestiques privés/internes. `proxy` et cette option d'adhésion au réseau sont des contrôles indépendants.
- `channels.matrix.defaultAccount` sélectionne le compte préféré dans les configurations multi-comptes.
- `channels.matrix.autoJoin` est défini par défaut sur `off`, donc les salles invitées et les nouvelles invitations de type MP sont ignorées jusqu'à ce que vous définissiez `autoJoin: "allowlist"` avec `autoJoinAllowlist` ou `autoJoin: "always"`.
- `channels.matrix.execApprovals` : livraison native Matrix des approbations d'exécution et autorisation des approbateurs.
  - `enabled` : `true`, `false` ou `"auto"` (par défaut). En mode automatique, les approbations d'exécution s'activent lorsque les approbateurs peuvent être résolus à partir de `approvers` ou `commands.ownerAllowFrom`.
  - `approvers` : identifiants utilisateur Matrix (ex. `@owner:example.org`) autorisés à approuver les demandes d'exécution.
  - `agentFilter` : liste blanche facultative des ID d'agent. Omettez pour transmettre les approbations pour tous les agents.
  - `sessionFilter` : motifs de clé de session facultatifs (sous-chaîne ou regex).
  - `target` : où envoyer les invites d'approbation. `"dm"` (par défaut), `"channel"` (salon d'origine), ou `"both"`.
  - Remplacements par compte : `channels.matrix.accounts.<id>.execApprovals`.
- `channels.matrix.dm.sessionScope` contrôle le regroupement des DM Matrix en sessions : `per-user` (par défaut) partage par pair routé, tandis que `per-room` isole chaque salon de DM.
- Les sondes d'état Matrix et les recherches d'annuaire en direct utilisent la même stratégie de proxy que le trafic d'exécution.
- La configuration complète de Matrix, les règles de ciblage et les exemples de configuration sont documentés dans [Matrix](/en/channels/matrix).

### Microsoft Teams

Microsoft Teams repose sur une extension et est configuré sous `channels.msteams`.

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

- Principaux chemins de clés couverts ici : `channels.msteams`, `channels.msteams.configWrites`.
- La configuration complète de Teams (identifiants, webhook, stratégie DM/groupe, remplacements par équipe/salon) est documentée dans [Microsoft Teams](/en/channels/msteams).

### IRC

IRC repose sur une extension et est configuré sous `channels.irc`.

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

- Principaux chemins de clés couverts ici : `channels.irc`, `channels.irc.dmPolicy`, `channels.irc.configWrites`, `channels.irc.nickserv.*`.
- `channels.irc.defaultAccount` facultatif remplace la sélection de compte par défaut lorsqu'elle correspond à un identifiant de compte configuré.
- La configuration complète du salon IRC (hôte/port/TLS/salons/listes blanches/filtrage des mentions) est documentée dans [IRC](/en/channels/irc).

### Multi-compte (tous les canaux)

Exécuter plusieurs comptes par salon (chacun avec son propre `accountId`) :

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
- Les paramètres de base du canal s'appliquent à tous les comptes, sauf s'ils sont remplacés par compte.
- Utilisez `bindings[].match.accountId` pour acheminer chaque compte vers un agent différent.
- Si vous ajoutez un compte non défini par défaut via `openclaw channels add` (ou l'intégration de salon) tout en restant sur une configuration de salon de niveau supérieur à compte unique, OpenClaw promeut d'abord les valeurs uniques de niveau supérieur de portée de compte dans la carte des comptes du salon afin que le compte d'origine continue de fonctionner. La plupart des salons les déplacent vers `channels.<channel>.accounts.default` ; Matrix peut plutôt conserver une cible nommée/défaut existante correspondante.
- Les liaisons existantes pour les canaux uniquement (sans `accountId`) continuent de correspondre au compte par défaut ; les liaisons limitées au compte restent facultatives.
- `openclaw doctor --fix` corrige également les formes mixtes en déplaçant les valeurs de niveau supérieur à compte unique et limitées au compte vers le compte promu choisi pour ce canal. La plupart des canaux utilisent `accounts.default` ; Matrix peut conserver à la place une cible nommée ou par défaut correspondante existante.

### Autres canaux d'extension

De nombreux canaux d'extension sont configurés en tant que `channels.<id>` et documentés dans leurs pages de canal dédiées (par exemple Feishu, Matrix, LINE, Nostr, Zalo, Nextcloud Talk, Synology Chat et Twitch).
Voir l'index complet des canaux : [Canaux](/en/channels).

### Filtrage des mentions dans les discussions de groupe

Les messages de groupe nécessitent par défaut une **mention** (mention de métadonnées ou modèles d'expression rationnelle sécurisés). S'applique aux discussions de groupe WhatsApp, Telegram, Discord, Google Chat et iMessage.

**Types de mentions :**

- **Mentions de métadonnées** : mentions @ natives de la plateforme. Ignorées en mode discussion avec soi-même sur WhatsApp.
- **Modèles de texte** : Modèles d'expression régulière sûrs dans `agents.list[].groupChat.mentionPatterns`. Les modèles non valides et les répétitions imbriquées non sûres sont ignorés.
- Le filtrage des mentions n'est appliqué que lorsque la détection est possible (mentions natives ou au moins un modèle).

```json5
{
  messages: {
    groupChat: { historyLimit: 50 },
  },
  agents: {
    list: [{ id: "main", groupChat: { mentionPatterns: ["@openclaw", "openclaw"] } }],
  },
}
```

`messages.groupChat.historyLimit` définit la valeur par défaut globale. Les canaux peuvent la remplacer par `channels.<channel>.historyLimit` (ou par compte). Définissez `0` pour désactiver.

#### Limites de l'historique des DM

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

Résolution : remplacement par DM → valeur par défaut du provider → aucune limite (tout est conservé).

Pris en charge : `telegram`, `whatsapp`, `discord`, `slack`, `signal`, `imessage`, `msteams`.

#### Mode discussion avec soi-même

Incluez votre propre numéro dans `allowFrom` pour activer le mode de discussion avec soi-même (ignore les mentions natives @-mentions, ne répond qu'aux modèles de texte) :

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

- Ce bloc configure les surfaces de commande. Pour le catalogue actuel des commandes intégrées + groupées, voir [Slash Commands](/en/tools/slash-commands).
- Cette page est une **référence des clés de configuration**, et non le catalogue complet des commandes. Les commandes appartenant aux canaux/plugins telles que QQ Bot `/bot-ping` `/bot-help` `/bot-logs`, LINE `/card`, device-pair `/pair`, memory `/dreaming`, phone-control `/phone` et Talk `/voice` sont documentées dans leurs pages de canal/plugin ainsi que dans [Slash Commands](/en/tools/slash-commands).
- Les commandes texte doivent être des messages **autonomes** commençant par `/`.
- `native: "auto"` active les commandes natives pour Discord/Telegram, les désactive pour Slack.
- `nativeSkills: "auto"` active les commandes de compétence natives pour Discord/Telegram, les désactive pour Slack.
- Remplacer par canal : `channels.discord.commands.native` (booléen ou `"auto"`). `false` efface les commandes précédemment enregistrées.
- Remplacer l'enregistrement des compétences natives par canal avec `channels.<provider>.commands.nativeSkills`.
- `channels.telegram.customCommands` ajoute des entrées de menu de bot Telegram supplémentaires.
- `bash: true` active `! <cmd>` pour le shell hôte. Nécessite `tools.elevated.enabled` et l'expéditeur dans `tools.elevated.allowFrom.<channel>`.
- `config: true` active `/config` (lit/écrit `openclaw.json`). Pour les clients passerelle `chat.send`, les écritures persistantes `/config set|unset` nécessitent également `operator.admin` ; la lecture seule `/config show` reste disponible pour les clients opérateur normaux avec scope d'écriture.
- `mcp: true` active `/mcp` pour la configuration du serveur MCP gérée par OpenClaw sous `mcp.servers`.
- `plugins: true` active `/plugins` pour la découverte, l'installation et les contrôles d'activation/désactivation des plugins.
- `channels.<provider>.configWrites` verrouille les mutations de configuration par canal (par défaut : true).
- Pour les canaux multi-comptes, `channels.<provider>.accounts.<id>.configWrites` verrouille également les écritures qui ciblent ce compte (par exemple `/allowlist --config --account <id>` ou `/config set channels.<provider>.accounts.<id>...`).
- `restart: false` désactive `/restart` et les actions de l'outil de redémarrage de la passerelle. Par défaut : `true`.
- `ownerAllowFrom` est la liste d'autorisation explicite du propriétaire pour les commandes/outils réservés au propriétaire. Elle est distincte de `allowFrom`.
- `ownerDisplay: "hash"` hache les ids des propriétaires dans le prompt système. Définissez `ownerDisplaySecret` pour contrôler le hachage.
- `allowFrom` est par fournisseur. Lorsqu'elle est définie, elle est la **seule** source d'autorisation (les listes d'autorisation/appairage des canaux et `useAccessGroups` sont ignorés).
- `useAccessGroups: false` permet aux commandes de contourner les stratégies de groupe d'accès lorsque `allowFrom` n'est pas défini.
- Carte de la documentation des commandes :
  - catalogue intégré + groupé : [Slash Commands](/en/tools/slash-commands)
  - surfaces de commande spécifiques au canal : [Channels](/en/channels)
  - commandes QQ Bot : [QQ Bot](/en/channels/qqbot)
  - commandes d'appairage : [Pairing](/en/channels/pairing)
  - commande de carte LINE : [LINE](/en/channels/line)
  - rêve de mémoire : [Dreaming](/en/concepts/dreaming)

</Accordion>

---

## Agent defaults

### `agents.defaults.workspace`

Par défaut : `~/.openclaw/workspace`.

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

Optional repository root shown in the system prompt's Runtime line. If unset, OpenClaw auto-detects by walking upward from the workspace.

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

Liste d'autorisation (allowlist) de compétences facultative par défaut pour les agents qui ne définissent pas
`agents.list[].skills`.

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

- Omettez `agents.defaults.skills` pour des compétences illimitées par défaut.
- Omettez `agents.list[].skills` pour hériter des valeurs par défaut.
- Définissez `agents.list[].skills: []` pour aucune compétence.
- Une liste `agents.list[].skills` non vide constitue l'ensemble final pour cet agent ; elle
  ne fusionne pas avec les valeurs par défaut.

### `agents.defaults.skipBootstrap`

Désactive la création automatique des fichiers d'amorçage de l'espace de travail (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`).

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.contextInjection`

Contrôle le moment où les fichiers d'amorçage de l'espace de travail sont injectés dans le prompt système. Par défaut : `"always"`.

- `"continuation-skip"` : les tours de continuation sûrs (après une réponse complète de l'assistant) ignorent la réinjection de l'amorçage de l'espace de travail, réduisant ainsi la taille du prompt. Les exécutions de heartbeat et les nouvelles tentatives post-compaction reconstruisent toujours le contexte.

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

Nombre maximal de caractères par fichier d'amorçage de l'espace de travail avant troncation. Par défaut : `20000`.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

Nombre maximal total de caractères injectés dans tous les fichiers d'amorçage de l'espace de travail. Par défaut : `150000`.

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 150000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

Contrôle le texte d'avertissement visible par l'agent lorsque le contexte d'amorçage est tronqué.
Par défaut : `"once"`.

- `"off"` : n'injecte jamais le texte d'avertissement dans le prompt système.
- `"once"` : injecte l'avertissement une fois par signature de troncation unique (recommandé).
- `"always"` : injecte l'avertissement à chaque exécution lorsqu'une troncation existe.

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### `agents.defaults.imageMaxDimensionPx`

Taille maximale en pixels pour le plus long côté de l'image dans les blocs d'image de transcription/outils avant les appels au fournisseur.
Par défaut : `1200`.

Des valeurs plus faibles réduisent généralement l'utilisation de jetons visuels et la taille de la charge utile de la demande pour les exécutions avec de nombreuses captures d'écran.
Des valeurs plus élevées préservent plus de détails visuels.

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

Fuseau horaire pour le contexte du système (pas les horodatages des messages). Revient au fuseau horaire de l'hôte.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

Format de l'heure dans l'invite système. Par défaut : `auto` (préférence de l'OS).

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
}
```

### `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-i2v"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // global default provider params
      embeddedHarness: {
        runtime: "auto", // auto | pi | registered harness id, e.g. codex
        fallback: "pi", // pi | none
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - La forme chaîne définit uniquement le model principal.
  - La forme objet définit le model principal plus les models de bascule ordonnés.
- `imageModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par le chemin d'outil `image` comme configuration de son modèle de vision.
  - Également utilisé comme routage de secours lorsque le model sélectionné/par défaut ne peut pas accepter d'entrée d'image.
- `imageGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité partagée de génération d'images et toute future surface d'outil/plugin qui génère des images.
  - Valeurs typiques : `google/gemini-3.1-flash-image-preview` pour la génération d'images native Gemini, `fal/fal-ai/flux/dev` pour fal, ou `openai/gpt-image-1` pour les Images OpenAI.
  - Si vous sélectionnez directement un fournisseur/modèle, configurez également la clé d'authentification/API du fournisseur correspondant (par exemple `GEMINI_API_KEY` ou `GOOGLE_API_KEY` pour `google/*`, `OPENAI_API_KEY` pour `openai/*`, `FAL_KEY` pour `fal/*`).
  - Si omis, `image_generate` peut toujours déduire une valeur par défaut de fournisseur prise en charge par une authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération d'images enregistrés restants dans l'ordre des ID de fournisseur.
- `musicGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité de génération de musique partagée et l'outil intégré `music_generate`.
  - Valeurs typiques : `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview` ou `minimax/music-2.5+`.
  - Si omis, `music_generate` peut toujours déduire une valeur par défaut de fournisseur prise en charge par une authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération de musique enregistrés restants dans l'ordre des ID de fournisseur.
  - Si vous sélectionnez directement un fournisseur/modèle, configurez également la clé d'authentification/API du fournisseur correspondant.
- `videoGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité de génération vidéo partagée et l'outil intégré `video_generate`.
  - Valeurs typiques : `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash`, ou `qwen/wan2.7-r2v`.
  - Si omis, `video_generate` peut toujours déduire un fournisseur par défaut authentifié. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération vidéo enregistrés restants par ordre d'identifiant de fournisseur.
  - Si vous sélectionnez directement un fournisseur/modèle, configurez également la clé d'authentification/API du fournisseur correspondant.
  - Le fournisseur de génération vidéo Qwen groupé prend en charge jusqu'à 1 vidéo de sortie, 1 image d'entrée, 4 vidéos d'entrée, 10 secondes de durée, et les options au niveau du fournisseur `size`, `aspectRatio`, `resolution`, `audio` et `watermark`.
- `pdfModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par l'outil `pdf` pour le routage de modèle.
  - Si omis, l'outil PDF revient à `imageModel`, puis au modèle de session/défaut résolu.
- `pdfMaxBytesMb` : limite de taille PDF par défaut pour l'outil `pdf` lorsque `maxBytesMb` n'est pas passé lors de l'appel.
- `pdfMaxPages` : nombre maximum de pages par défaut considérées par le mode de repli d'extraction dans l'outil `pdf`.
- `verboseDefault` : niveau détaillé par défaut pour les agents. Valeurs : `"off"`, `"on"`, `"full"`. Par défaut : `"off"`.
- `elevatedDefault` : niveau de sortie élevé par défaut pour les agents. Valeurs : `"off"`, `"on"`, `"ask"`, `"full"`. Par défaut : `"on"`.
- `model.primary` : format `provider/model` (par ex. `openai/gpt-5.4`). Si vous omettez le fournisseur, OpenClaw essaie d'abord un alias, puis une correspondance unique de fournisseur configuré pour cet identifiant de modèle exact, et ne revient ensuite au fournisseur par défaut configuré (comportement de compatibilité obsolète, il est donc préférable de spécifier `provider/model` de manière explicite). Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle configuré au lieu d'afficher un défaut obsolète de fournisseur supprimé.
- `models` : le catalogue de modèles configuré et la liste d'autorisation pour `/model`. Chaque entrée peut inclure `alias` (raccourci) et `params` (spécifique au fournisseur, par exemple `temperature`, `maxTokens`, `cacheRetention`, `context1m`).
- `params` : paramètres globaux par défaut du fournisseur appliqués à tous les modèles. Défini à `agents.defaults.params` (par ex. `{ cacheRetention: "long" }`).
- Priorité de fusion `params` (config) : `agents.defaults.params` (base globale) est remplacé par `agents.defaults.models["provider/model"].params` (par modèle), puis `agents.list[].params` (identifiant d'agent correspondant) remplace par clé. Voir [Prompt Caching](/en/reference/prompt-caching) pour plus de détails.
- `embeddedHarness` : stratégie d'exécution par défaut de bas niveau pour l'agent embarqué. Utilisez `runtime: "auto"` pour permettre aux harnais de plug-ins enregistrés de revendiquer les modèles pris en charge, `runtime: "pi"` pour forcer le harnais PI intégré, ou un identifiant de harnais enregistré tel que `runtime: "codex"`. Définissez `fallback: "none"` pour désactiver le repli automatique PI.
- Les rédacteurs de configuration qui modifient ces champs (par exemple `/models set`, `/models set-image`, et les commandes d'ajout/suppression de repli) enregistrent le formulaire canonique de l'objet et préservent les listes de repli existantes lorsque cela est possible.
- `maxConcurrent` : nombre maximum d'exécutions d'agent parallèles sur les sessions (chaque session reste sérialisée). Par défaut : 4.

### `agents.defaults.embeddedHarness`

`embeddedHarness` contrôle l'exécuteur de bas niveau qui exécute les tours d'agent intégrés.
La plupart des déploiements devraient conserver la valeur par défaut `{ runtime: "auto", fallback: "pi" }`.
Utilisez-le lorsqu'un plugin de confiance fournit un harnais natif, tel que le harnais
Codex app-server inclus.

```json5
{
  agents: {
    defaults: {
      model: "codex/gpt-5.4",
      embeddedHarness: {
        runtime: "codex",
        fallback: "none",
      },
    },
  },
}
```

- `runtime` : `"auto"`, `"pi"`, ou un identifiant de harnais de plugin enregistré. Le plugin Codex inclus enregistre `codex`.
- `fallback` : `"pi"` ou `"none"`. `"pi"` conserve le harnais PI intégré comme solution de repli de compatibilité. `"none"` fait échouer la sélection d'un harnais de plugin manquant ou non pris en charge au lieu d'utiliser PI silencieusement.
- Remplacements d'environnement : `OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` remplace `runtime` ; `OPENCLAW_AGENT_HARNESS_FALLBACK=none` désactive le repli PI pour ce processus.
- Pour les déploiements Codex uniquement, définissez `model: "codex/gpt-5.4"`, `embeddedHarness.runtime: "codex"`, et `embeddedHarness.fallback: "none"`.
- Cela contrôle uniquement le harnais de chat intégré. La génération de média, la vision, le PDF, la musique, la vidéo et le TTS utilisent toujours leurs paramètres de fournisseur/modèle.

**Raccourcis d'alias intégrés** (ne s'appliquent que lorsque le modèle est dans `agents.defaults.models`) :

| Alias               | Modèle                                 |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.4`                       |
| `gpt-mini`          | `openai/gpt-5.4-mini`                  |
| `gpt-nano`          | `openai/gpt-5.4-nano`                  |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

Vos alias configurés priment toujours sur les valeurs par défaut.

Les modèles Z.AI GLM-4.x activent automatiquement le mode de réflexion, sauf si vous définissez `--thinking off` ou définissez vous-même `agents.defaults.models["zai/<model>"].params.thinking`.
Les modèles Z.AI activent `tool_stream` par défaut pour le streaming d'appels d'outils. Définissez `agents.defaults.models["zai/<model>"].params.tool_stream` sur `false` pour le désactiver.
Les modèles Anthropic Claude 4.6 utilisent par défaut `adaptive` thinking lorsqu'aucun niveau de réflexion explicite n'est défini.

### `agents.defaults.cliBackends`

Backends CLI optionnels pour les exécutions de repli texte uniquement (pas d'appels d'outils). Utile comme sauvegarde lorsque les fournisseurs d'API échouent.

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
        },
      },
    },
  },
}
```

- Les backends CLI sont d'abord axés sur le texte ; les outils sont toujours désactivés.
- Sessions prises en charge lorsque `sessionArg` est défini.
- Passage d'image pris en charge lorsque `imageArg` accepte les chemins de fichiers.

### `agents.defaults.systemPromptOverride`

Remplacez l'invite système entière assemblée par OpenClaw par une chaîne fixe. Définissez au niveau par défaut (`agents.defaults.systemPromptOverride`) ou par agent (`agents.list[].systemPromptOverride`). Les valeurs par agent priment ; une valeur vide ou composée uniquement d'espaces est ignorée. Utile pour des expériences d'invite contrôlées.

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "You are a helpful assistant.",
    },
  },
}
```

### `agents.defaults.heartbeat`

Exécutions périodiques de heartbeat.

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.4-mini",
        includeReasoning: false,
        includeSystemPromptSection: true, // default: true; false omits the Heartbeat section from the system prompt
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every` : chaîne de durée (ms/s/m/h). Par défaut : `30m` (auth par clé API) ou `1h` (auth OAuth). Définissez sur `0m` pour désactiver.
- `includeSystemPromptSection` : si false, omet la section Heartbeat de l'invite système et ignore l'injection `HEARTBEAT.md` dans le contexte d'amorçage. Par défaut : `true`.
- `suppressToolErrorWarnings` : si true, supprime les payloads d'avertissement d'erreur d'outil lors des exécutions de heartbeat.
- `timeoutSeconds` : temps maximum en secondes autorisé pour un tour d'agent heartbeat avant son abandon. Laissez non défini pour utiliser `agents.defaults.timeoutSeconds`.
- `directPolicy` : politique de livraison directe/DM. `allow` (par défaut) autorise la livraison à cible directe. `block` supprime la livraison à cible directe et émet `reason=dm-blocked`.
- `lightContext` : si vrai, les exécutions de heartbeat utilisent un contexte d'amorçage léger et ne conservent que `HEARTBEAT.md` à partir des fichiers d'amorçage de l'espace de travail.
- `isolatedSession` : si vrai, chaque heartbeat s'exécute dans une nouvelle session sans historique de conversation précédent. Même modèle d'isolement que `sessionTarget: "isolated"` de cron. Réduit le coût en jetons par heartbeat d'environ 100K à environ 2-5K jetons.
- Par agent : définissez `agents.list[].heartbeat`. Lorsqu'un agent définit `heartbeat`, **seuls ces agents** exécutent des heartbeats.
- Les heartbeats exécutent des tours complets d'agent — des intervalles plus courts consomment plus de jetons.

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // id of a registered compaction provider plugin (optional)
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // used when identifierPolicy=custom
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        notifyUser: true, // send a brief notice when compaction starts (default: false)
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with the exact silent token NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode` : `default` ou `safeguard` (résumé par morceaux pour les longs historiques). Voir [Compaction](/en/concepts/compaction).
- `provider` : id d'un plugin de fournisseur de compaction enregistré. Lorsqu'il est défini, la fonction `summarize()` du fournisseur est appelée au lieu de la résumé intégrée par le LLM. Retourne à l'intégration intégrée en cas d'échec. Définir un fournisseur force `mode: "safeguard"`. Voir [Compaction](/en/concepts/compaction).
- `timeoutSeconds` : nombre maximum de secondes autorisées pour une seule opération de compaction avant qu'OpenClaw ne l'abandonne. Par défaut : `900`.
- `identifierPolicy` : `strict` (par défaut), `off`, ou `custom`. `strict` préfixe les directives intégrées de conservation des identifiants opaques lors du résumé de compaction.
- `identifierInstructions` : texte personnalisé optionnel de conservation des identifiants utilisé lorsque `identifierPolicy=custom`.
- `postCompactionSections` : noms de section H2/H3 optionnels de AGENTS.md à réinjecter après la compaction. Par défaut `["Session Startup", "Red Lines"]` ; définissez `[]` pour désactiver la réinjection. Lorsqu'il n'est pas défini ou explicitement défini sur cette paire par défaut, les anciens en-têtes `Every Session`/`Safety` sont également acceptés comme solution de repli historique.
- `model` : remplacement facultatif `provider/model-id` pour la résumé de compactage uniquement. Utilisez ceci lorsque la session principale doit conserver un modèle mais que les résumés de compactage doivent s'exécuter sur un autre ; non défini, le compactage utilise le modèle principal de la session.
- `notifyUser` : lorsque `true`, envoie une brève notification à l'utilisateur lors du début du compactage (par exemple, "Compactage du contexte..."). Désactivé par défaut pour garder le compactage silencieux.
- `memoryFlush` : tour agentique silencieux avant l'auto-compactage pour stocker des mémoires durables. Ignoré lorsque l'espace de travail est en lecture seule.

### `agents.defaults.contextPruning`

Supprime les **anciens résultats d'outils** du contexte en mémoire avant l'envoi au LLM. Ne modifie **pas** l'historique de session sur le disque.

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // duration (ms/s/m/h), default unit: minutes
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[Old tool result content cleared]" },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="comportement du mode cache-ttl">

- `mode: "cache-ttl"` active les passes de suppression.
- `ttl` contrôle la fréquence à laquelle la suppression peut s'exécuter à nouveau (après le dernier accès au cache).
- La suppression réduit d'abord les résultats d'outils trop volumineux, puis efface complètement les anciens résultats d'outils si nécessaire.

**Réduction douce** conserve le début + la fin et insère `...` au milieu.

**Effacement dur** remplace le résultat de l'outil entier par l'espace réservé.

Notes :

- Les blocs d'image ne sont jamais réduits/effacés.
- Les ratios sont basés sur les caractères (approximatifs), et non sur les nombres exacts de jetons.
- S'il existe moins de `keepLastAssistants` messages d'assistant, la suppression est ignorée.

</Accordion>

Voir [Suppression de session](/en/concepts/session-pruning) pour les détails du comportement.

### Block streaming

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200 },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off | natural | custom (use minMs/maxMs)
    },
  },
}
```

- Les canaux non-Telegram nécessitent un `*.blockStreaming: true` explicite pour activer les réponses par blocs.
- Remplacements de canal : `channels.<channel>.blockStreamingCoalesce` (et variantes par compte). Signal/Slack/Discord/Google Chat par défaut `minChars: 1500`.
- `humanDelay` : pause aléatoire entre les réponses par blocs. `natural` = 800–2500ms. Remplacement par agent : `agents.list[].humanDelay`.

Voir [Streaming](/en/concepts/streaming) pour le comportement + les détails du découpage.

### Indicateurs de frappe

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // never | instant | thinking | message
      typingIntervalSeconds: 6,
    },
  },
}
```

- Par défaut : `instant` pour les discussions directes/mentions, `message` pour les discussions de groupe non mentionnées.
- Remplacements par session : `session.typingMode`, `session.typingIntervalSeconds`.

Voir [Indicateurs de frappe](/en/concepts/typing-indicators).

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

Sandboxing facultatif pour l'agent intégré. Voir [Sandboxing](/en/gateway/sandboxing) pour le guide complet.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        backend: "docker", // docker | ssh | openshell
        scope: "agent", // session | agent | shared
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // SecretRefs / inline contents also supported:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "apply_patch", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="Détails du bac à sable">

**Backend :**

- `docker` : environnement d'exécution Docker local (par défaut)
- `ssh` : environnement d'exécution distant générique basé sur SSH
- `openshell` : environnement d'exécution OpenShell

Lorsque `backend: "openshell"` est sélectionné, les paramètres spécifiques à l'environnement d'exécution sont déplacés vers
`plugins.entries.openshell.config`.

**Configuration du backend SSH :**

- `target` : cible SSH sous forme de `user@host[:port]`
- `command` : commande client SSH (par défaut : `ssh`)
- `workspaceRoot` : racine distante absolue utilisée pour les espaces de travail par portée
- `identityFile` / `certificateFile` / `knownHostsFile` : fichiers locaux existants transmis à OpenSSH
- `identityData` / `certificateData` / `knownHostsData` : contenus en ligne ou SecretRefs que OpenClaw matérialise dans des fichiers temporaires lors de l'exécution
- `strictHostKeyChecking` / `updateHostKeys` : paramètres de stratégie de clé hôte OpenSSH

**Priorité de l'authentification SSH :**

- `identityData` l'emporte sur `identityFile`
- `certificateData` l'emporte sur `certificateFile`
- `knownHostsData` l'emporte sur `knownHostsFile`
- Les valeurs `*Data` basées sur SecretRef sont résolues à partir de l'instantané d'exécution des secrets actifs avant le début de la session de bac à sable

**Comportement du backend SSH :**

- ensemence l'espace de travail distant une fois après la création ou la recréation
- maintient ensuite l'espace de travail SSH distant comme source canonique
- achemine `exec`, les outils de fichiers et les chemins multimédias via SSH
- ne synchronise pas automatiquement les modifications distantes vers l'hôte
- ne prend pas en charge les conteneurs de navigateur en bac à sable

**Accès à l'espace de travail :**

- `none` : espace de travail de bac à sable par portée sous `~/.openclaw/sandboxes`
- `ro` : espace de travail du bac à sable à `/workspace`, espace de travail de l'agent monté en lecture seule à `/agent`
- `rw` : espace de travail de l'agent monté en lecture/écriture à `/workspace`

**Portée :**

- `session` : conteneur + espace de travail par session
- `agent` : un conteneur + espace de travail par agent (par défaut)
- `shared` : conteneur et espace de travail partagés (aucune isolation inter-session)

**Configuration du plugin OpenShell :**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror | remote
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // optional
          gatewayEndpoint: "https://lab.example", // optional
          policy: "strict", // optional OpenShell policy id
          providers: ["openai"], // optional
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**Mode OpenShell :**

- `mirror` : ensemencer le distant à partir du local avant l'exécution, synchroniser vers le local après l'exécution ; l'espace de travail local reste canonique
- `remote` : ensemencer le distant une fois lorsque le bac à sable est créé, puis maintenir l'espace de travail distant comme canonique

En mode `remote`, les modifications locales effectuées en dehors de OpenClaw ne sont pas synchronisées automatiquement dans le bac à sable après l'étape d'ensemencement.
Le transport est SSH vers le bac à sable OpenShell, mais le plugin possède le cycle de vie du bac à sable et la synchronisation miroir facultative.

**`setupCommand`** s'exécute une fois après la création du conteneur (via `sh -lc`). Nécessite un accès réseau sortant, une racine accessible en écriture, un utilisateur root.

**Les conteneurs sont par défaut sur `network: "none"`** — définissez sur `"bridge"` (ou un réseau pont personnalisé) si l'agent a besoin d'un accès sortant.
`"host"` est bloqué. `"container:<id>"` est bloqué par défaut, sauf si vous définissez explicitement
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (bris de glace).

**Les pièces jointes entrantes** sont intermédiaires dans `media/inbound/*` dans l'espace de travail actif.

**`docker.binds`** monte des répertoires d'hôte supplémentaires ; les liaisons globales et par agent sont fusionnées.

**Navigateur en bac à sable** (`sandbox.browser.enabled`) : Chromium + CDP dans un conteneur. URL noVNC injectée dans l'invite système. Ne nécessite pas `browser.enabled` dans `openclaw.json`.
L'accès observateur noVNC utilise l'authentification VNC par défaut et OpenClaw émet une URL de jeton à courte durée de vie (au lieu d'exposer le mot de passe dans l'URL partagée).

- `allowHostControl: false` (par défaut) empêche les sessions en bac à sable de cibler le navigateur de l'hôte.
- `network` est par défaut sur `openclaw-sandbox-browser` (réseau pont dédié). Définissez sur `bridge` uniquement lorsque vous souhaitez explicitement une connectivité de pont globale.
- `cdpSourceRange` restreint facultativement l'ingress CDP au bord du conteneur à une plage CIDR (par exemple `172.21.0.1/32`).
- `sandbox.browser.binds` monte des répertoires d'hôte supplémentaires uniquement dans le conteneur du navigateur en bac à sable. Lorsqu'il est défini (y compris `[]`), il remplace `docker.binds` pour le conteneur du navigateur.
- Les valeurs par défaut de lancement sont définies dans `scripts/sandbox-browser-entrypoint.sh` et réglées pour les hôtes de conteneurs :
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-gpu`
  - `--disable-software-rasterizer`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--metrics-recording-only`
  - `--disable-extensions` (activé par défaut)
  - `--disable-3d-apis`, `--disable-software-rasterizer` et `--disable-gpu` sont
    activés par défaut et peuvent être désactivés avec
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si l'utilisation de WebGL/3D l'exige.
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` réactive les extensions si votre flux de travail
    en dépend.
  - `--renderer-process-limit=2` peut être modifié avec
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` ; définissez `0` pour utiliser la limite de processus par défaut de Chromium.
  - ainsi que `--no-sandbox` et `--disable-setuid-sandbox` lorsque `noSandbox` est activé.
  - Les valeurs par défaut sont la ligne de base de l'image de conteneur ; utilisez une image de navigateur personnalisée avec un point d'entrée personnalisé pour modifier les valeurs par défaut du conteneur.

</Accordion>

Le sandboxing du navigateur et `sandbox.docker.binds` sont exclusifs à Docker.

Build images :

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list` (redéfinitions par agent)

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // or { primary, fallbacks }
        thinkingDefault: "high", // per-agent thinking level override
        reasoningDefault: "on", // per-agent reasoning visibility override
        fastModeDefault: false, // per-agent fast mode override
        embeddedHarness: { runtime: "auto", fallback: "pi" },
        params: { cacheRetention: "none" }, // overrides matching defaults.models params by key
        skills: ["docs-search"], // replaces agents.defaults.skills when set
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    ],
  },
}
```

- `id` : identifiant stable de l'agent (requis).
- `default` : lorsque plusieurs sont définis, le premier l'emporte (avertissement enregistré). Si aucun n'est défini, la première entrée de la liste est celle par défaut.
- `model` : la forme de chaîne ne redéfinit que `primary` ; la forme d'objet `{ primary, fallbacks }` redéfinit les deux (`[]` désactive les replis globaux). Les tâches cron qui ne redéfinissent que `primary` héritent toujours des replis par défaut, sauf si vous définissez `fallbacks: []`.
- `params` : paramètres de flux par agent fusionnés par-dessus l'entrée de modèle sélectionnée dans `agents.defaults.models`. Utilisez ceci pour des redéfinitions spécifiques à l'agent comme `cacheRetention`, `temperature` ou `maxTokens` sans dupliquer tout le catalogue de modèles.
- `skills` : liste d'autorisation de compétences (allowlist) par agent facultative. Si omise, l'agent hérite de `agents.defaults.skills` lorsqu'elle est définie ; une liste explicite remplace les valeurs par défaut au lieu de fusionner, et `[]` signifie aucune compétence.
- `thinkingDefault` : niveau de réflexion par agent facultatif (`off | minimal | low | medium | high | xhigh | adaptive`). Redéfinit `agents.defaults.thinkingDefault` pour cet agent lorsqu'aucune redéfinition par message ou par session n'est définie.
- `reasoningDefault` : visibilité du raisonnement par défaut par agent facultative (`on | off | stream`). S'applique lorsqu'aucune redéfinition de raisonnement par message ou par session n'est définie.
- `fastModeDefault` : valeur par défaut par agent facultative pour le mode rapide (`true | false`). S'applique lorsqu'aucune redéfinition de mode rapide par message ou par session n'est définie.
- `embeddedHarness` : redéfinition facultative de la stratégie de harnais de bas niveau par agent. Utilisez `{ runtime: "codex", fallback: "none" }` pour rendre un agent Codex uniquement tandis que les autres agents conservent le repli PI par défaut.
- `runtime` : descripteur d'exécution optionnel par agent. Utilisez `type: "acp"` avec les valeurs par défaut `runtime.acp` (`agent`, `backend`, `mode`, `cwd`) lorsque l'agent doit par défaut utiliser des sessions de harnais ACP.
- `identity.avatar` : chemin relatif à l'espace de travail, URL `http(s)`, ou URI `data:`.
- `identity` déduit les valeurs par défaut : `ackReaction` à partir de `emoji`, `mentionPatterns` à partir de `name`/`emoji`.
- `subagents.allowAgents` : liste d'autorisation des IDs d'agents pour `sessions_spawn` (`["*"]` = n'importe quel ; par défaut : même agent uniquement).
- Garantie d'héritage du bac à sable : si la session demandeur est sandboxed, `sessions_spawn` rejette les cibles qui s'exécuteraient sans bac à sable.
- `subagents.requireAgentId` : si vrai, bloque les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite de profil ; par défaut : faux).

---

## Routage multi-agent

Exécutez plusieurs agents isolés dans un seul Gateway. Voir [Multi-Agent](/en/concepts/multi-agent).

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### Champs de correspondance de liaison

- `type` (optionnel) : `route` pour le routage normal (le type manquant par défaut est route), `acp` pour les liaisons de conversation ACP persistantes.
- `match.channel` (requis)
- `match.accountId` (optionnel ; `*` = n'importe quel compte ; omis = compte par défaut)
- `match.peer` (optionnel ; `{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (optionnel ; spécifique au channel)
- `acp` (optionnel ; uniquement pour `type: "acp"`) : `{ mode, label, cwd, backend }`

**Ordre de correspondance déterministe :**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (exact, sans pair/guilde/équipe)
5. `match.accountId: "*"` (à l'échelle du channel)
6. Agent par défaut

Dans chaque niveau, la première entrée `bindings` correspondante l'emporte.

Pour les entrées `type: "acp"`, OpenClaw résout par identité de conversation exacte (`match.channel` + compte + `match.peer.id`) et n'utilise pas l'ordre des niveaux de liaison de routage ci-dessus.

### Profils d'accès par agent

<Accordion title="Accès complet (pas de sandbox)">

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="Outils en lecture seule + espace de travail">

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="Aucun accès au système de fichiers (messagerie uniquement)">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord", "gateway"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"],
        },
      },
    ],
  },
}
```

</Accordion>

Consultez [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) pour les détails sur la priorité.

---

## Session

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    parentForkMaxTokens: 100000, // skip parent-thread fork above this token count (0 disables)
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      rotateBytes: "10mb",
      resetArchiveRetention: "30d", // duration or false
      maxDiskBytes: "500mb", // optional hard budget
      highWaterBytes: "400mb", // optional cleanup target
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // default inactivity auto-unfocus in hours (`0` disables)
      maxAgeHours: 0, // default hard max age in hours (`0` disables)
    },
    mainKey: "main", // legacy (runtime always uses "main")
    agentToAgent: { maxPingPongTurns: 5 },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

<Accordion title="Session field details">

- **`scope`** : stratégie de groupement de session de base pour les contextes de chat de groupe.
  - `per-sender` (par défaut) : chaque expéditeur obtient une session isolée dans un contexte de canal.
  - `global` : tous les participants d'un contexte de canal partagent une seule session (à utiliser uniquement lorsqu'un contexte partagé est prévu).
- **`dmScope`** : la façon dont les MD sont groupés.
  - `main` : tous les MD partagent la session principale.
  - `per-peer` : isoler par identifiant d'expéditeur sur tous les canaux.
  - `per-channel-peer` : isoler par canal + expéditeur (recommandé pour les boîtes de réception multi-utilisateurs).
  - `per-account-channel-peer` : isoler par compte + canal + expéditeur (recommandé pour le multi-compte).
- **`identityLinks`** : mapper les ids canoniques aux pairs préfixés par fournisseur pour le partage de session inter-canal.
- **`reset`** : politique de réinitialisation principale. `daily` réinitialise à l'heure locale `atHour` ; `idle` réinitialise après `idleMinutes`. Si les deux sont configurés, la première expiration l'emporte.
- **`resetByType`** : remplacements par type (`direct`, `group`, `thread`). L'ancien `dm` est accepté comme alias pour `direct`.
- **`parentForkMaxTokens`** : nombre maximal de `totalTokens` de session parent autorisé lors de la création d'une session de fil bifurquée (par défaut `100000`).
  - Si le `totalTokens` parent dépasse cette valeur, OpenClaw démarre une nouvelle session de fil au lieu d'hériter de l'historique des transcriptions du parent.
  - Définissez `0` pour désactiver cette protection et autoriser toujours la bifurcation du parent.
- **`mainKey`** : champ obsolète. Le runtime utilise toujours `"main"` pour le compartiment de chat direct principal.
- **`agentToAgent.maxPingPongTurns`** : nombre maximal de tours de réponse entre les agents lors des échanges agent-à-agent (entier, plage : `0`–`5`). `0` désactive l'enchaînement ping-pong.
- **`sendPolicy`** : correspondance par `channel`, `chatType` (`direct|group|channel`, avec l'ancien alias `dm`), `keyPrefix`, ou `rawKeyPrefix`. Le premier refus l'emporte.
- **`maintenance`** : contrôles de nettoyage et de rétention du magasin de sessions.
  - `mode` : `warn` émet uniquement des avertissements ; `enforce` applique le nettoyage.
  - `pruneAfter` : limite d'âge pour les entrées périmées (par défaut `30d`).
  - `maxEntries` : nombre maximum d'entrées dans `sessions.json` (par défaut `500`).
  - `rotateBytes` : faire pivoter `sessions.json` lorsqu'il dépasse cette taille (par défaut `10mb`).
  - `resetArchiveRetention` : rétention pour les archives de transcriptions `*.reset.<timestamp>`. Par défaut à `pruneAfter` ; définissez `false` pour désactiver.
  - `maxDiskBytes` : budget disque optionnel du répertoire des sessions. En mode `warn`, il enregistre des avertissements ; en mode `enforce`, il supprime d'abord les artefacts/sessions les plus anciens.
  - `highWaterBytes` : cible optionnelle après le nettoyage du budget. Par défaut à `80%` de `maxDiskBytes`.
- **`threadBindings`** : valeurs par défaut globales pour les fonctionnalités de session liées aux fils.
  - `enabled` : commutateur principal par défaut (les fournisseurs peuvent remplacer ; Discord utilise `channels.discord.threadBindings.enabled`)
  - `idleHours` : désactivation automatique par inactivité par défaut en heures (`0` désactive ; les fournisseurs peuvent remplacer)
  - `maxAgeHours` : âge maximum dur par défaut en heures (`0` désactive ; les fournisseurs peuvent remplacer)

</Accordion>

---

## Messages

```json5
{
  messages: {
    responsePrefix: "🦞", // or "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all
    removeAckAfterReply: false,
    queue: {
      mode: "collect", // steer | followup | collect | steer-backlog | steer+backlog | queue | interrupt
      debounceMs: 1000,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 disables
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### Préfixe de réponse

Remplacements par channel/compte : `channels.<channel>.responsePrefix`, `channels.<channel>.accounts.<id>.responsePrefix`.

Résolution (le plus spécifique l'emporte) : compte → channel → global. `""` désactive et arrête la cascade. `"auto"` dérive `[{identity.name}]`.

**Variables de modèle :**

| Variable          | Description                   | Exemple                     |
| ----------------- | ----------------------------- | --------------------------- |
| `{model}`         | Nom court du modèle           | `claude-opus-4-6`           |
| `{modelFull}`     | Identifiant complet du modèle | `anthropic/claude-opus-4-6` |
| `{provider}`      | Nom du fournisseur            | `anthropic`                 |
| `{thinkingLevel}` | Niveau de réflexion actuel    | `high`, `low`, `off`        |
| `{identity.name}` | Nom de l'identité de l'agent  | (identique à `"auto"`)      |

Les variables ne sont pas sensibles à la casse. `{think}` est un alias pour `{thinkingLevel}`.

### Réaction d'accusé de réception

- Par défaut, utilise le `identity.emoji` de l'agent actif, sinon `"👀"`. Définissez `""` pour désactiver.
- Remplacements par channel : `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Ordre de résolution : compte → channel → `messages.ackReaction` → repli de l'identité.
- Portée : `group-mentions` (par défaut), `group-all`, `direct`, `all`.
- `removeAckAfterReply` : supprime l'accusé de réception après la réponse sur Slack, Discord et Telegram.
- `messages.statusReactions.enabled` : active les réactions d'état du cycle de vie sur Slack, Discord et Telegram.
  Sur Slack et Discord, laisser non défini garde les réactions d'état activées lorsque les réactions d'accusé de réception sont actives.
  Sur Telegram, définissez-le explicitement sur `true` pour activer les réactions d'état du cycle de vie.

### Anti-rebond entrant

Regroupe les messages textuels rapides provenant du même expéditeur en un seul tour d'agent. Les médias/pièces jointes sont envoyés immédiatement. Les commandes de contrôle contournent l'anti-rebond.

### TTS (synthèse vocale)

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      elevenlabs: {
        apiKey: "elevenlabs_api_key",
        baseUrl: "https://api.elevenlabs.io",
        voiceId: "voice_id",
        modelId: "eleven_multilingual_v2",
        seed: 42,
        applyTextNormalization: "auto",
        languageCode: "en",
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
          style: 0.0,
          useSpeakerBoost: true,
          speed: 1.0,
        },
      },
      openai: {
        apiKey: "openai_api_key",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini-tts",
        voice: "alloy",
      },
    },
  },
}
```

- `auto` contrôle le mode auto-TTS par défaut : `off`, `always`, `inbound`, ou `tagged`. `/tts on|off` peut remplacer les préférences locales, et `/tts status` montre l'état effectif.
- `summaryModel` remplace `agents.defaults.model.primary` pour le résumé automatique.
- `modelOverrides` est activé par défaut ; `modelOverrides.allowProvider` est `false` par défaut (opt-in).
- Les clés API reviennent à `ELEVENLABS_API_KEY`/`XI_API_KEY` et `OPENAI_API_KEY`.
- `openai.baseUrl` remplace le point de terminaison TTS OpenAI. L'ordre de résolution est la configuration, puis `OPENAI_TTS_BASE_URL`, puis `https://api.openai.com/v1`.
- Lorsque `openai.baseUrl` pointe vers un point de terminaison autre que OpenAI, OpenClaw le traite comme un serveur TTS compatible OpenAI et assouplit la validation du modèle/voix.

---

## Talk

Valeurs par défaut pour le mode Talk (macOS/iOS/Android).

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
    },
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- `talk.provider` doit correspondre à une clé dans `talk.providers` lorsque plusieurs fournisseurs Talk sont configurés.
- Les clés plates Talk héritées (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) ne servent qu'à la compatibilité et sont automatiquement migrées dans `talk.providers.<provider>`.
- Les ID de voix reviennent à `ELEVENLABS_VOICE_ID` ou `SAG_VOICE_ID`.
- `providers.*.apiKey` accepte les chaînes en clair ou les objets SecretRef.
- Le repli `ELEVENLABS_API_KEY` ne s'applique que lorsque aucune clé API Talk n'est configurée.
- `providers.*.voiceAliases` permet aux directives Talk d'utiliser des noms conviviaux.
- `silenceTimeoutMs` contrôle la durée d'attente du mode Talk après le silence de l'utilisateur avant l'envoi de la transcription. Non défini garde la fenêtre de pause par défaut de la plateforme (`700 ms on macOS and Android, 900 ms on iOS`).

---

## Outils

### Profils d'outils

`tools.profile` définit une liste d'autorisation de base avant `tools.allow`/`tools.deny` :

L'onboarding local définit par défaut les nouvelles configurations locales sur `tools.profile: "coding"` si non défini (les profils explicites existants sont conservés).

| Profil      | Inclut                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | `session_status` uniquement                                                                                                     |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | Aucune restriction (identique à non défini)                                                                                     |

### Groupes d'outils

| Groupe             | Outils                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution` (`bash` est accepté comme alias pour `exec`)                                        |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                           |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                   |
| `group:ui`         | `browser`, `canvas`                                                                                                     |
| `group:automation` | `cron`, `gateway`                                                                                                       |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`                                                                                                           |
| `group:media`      | `image`, `image_generate`, `video_generate`, `tts`                                                                      |
| `group:openclaw`   | All built-in tools (excludes provider plugins)                                                                          |

### `tools.allow` / `tools.deny`

Global tool allow/deny policy (deny wins). Case-insensitive, supports `*` wildcards. Applied even when Docker sandbox is off.

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

Further restrict tools for specific providers or models. Order: base profile → provider profile → allow/deny.

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.elevated`

Controls elevated exec access outside the sandbox:

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["1234567890123", "987654321098765432"],
      },
    },
  },
}
```

- Per-agent override (`agents.list[].tools.elevated`) can only further restrict.
- `/elevated on|off|ask|full` stores state per session; inline directives apply to single message.
- Elevated `exec` bypasses sandboxing and uses the configured escape path (`gateway` by default, or `node` when the exec target is `node`).

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.4"],
      },
    },
  },
}
```

### `tools.loopDetection`

Tool-loop safety checks are **disabled by default**. Set `enabled: true` to activate detection.
Settings can be defined globally in `tools.loopDetection` and overridden per-agent at `agents.list[].tools.loopDetection`.

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

- `historySize`: max tool-call history retained for loop analysis.
- `warningThreshold`: repeating no-progress pattern threshold for warnings.
- `criticalThreshold`: higher repeating threshold for blocking critical loops.
- `globalCircuitBreakerThreshold`: hard stop threshold for any no-progress run.
- `detectors.genericRepeat`: warn on repeated same-tool/same-args calls.
- `detectors.knownPollNoProgress` : avertir/bloquer sur les outils de sondage connus (`process.poll`, `command_status`, etc.).
- `detectors.pingPong` : avertir/bloquer sur les modèles de paires alternés sans progrès.
- Si `warningThreshold >= criticalThreshold` ou `criticalThreshold >= globalCircuitBreakerThreshold`, la validation échoue.

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // or BRAVE_API_KEY env
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

Configure la compréhension des médias entrants (image/audio/vidéo) :

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // opt-in: send finished async music/video directly to the channel
      },
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }],
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] },
        ],
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }],
      },
    },
  },
}
```

<Accordion title="Champs de l'entrée du modèle multimédia">

**Entrée du fournisseur** (`type: "provider"` ou omise) :

- `provider` : ID du fournisseur API (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc.)
- `model` : substitution de l'ID du modèle
- `profile` / `preferredProfile` : sélection du profil `auth-profiles.json`

**Entrée CLI** (`type: "cli"`) :

- `command` : exécutable à lancer
- `args` : arguments avec modèle (prend en charge `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc.)

**Champs communs :**

- `capabilities` : liste optionnelle (`image`, `audio`, `video`). Valeurs par défaut : `openai`/`anthropic`/`minimax` → image, `google` → image+audio+vidéo, `groq` → audio.
- `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language` : substitutions par entrée.
- En cas d'échec, le système revient à l'entrée suivante.

L'authentification du fournisseur suit l'ordre standard : `auth-profiles.json` → env vars → `models.providers.*.apiKey`.

**Champs d'achèvement asynchrone :**

- `asyncCompletion.directSend` : lorsque `true`, les tâches asynchrones `music_generate`
  et `video_generate` terminées tentent d'abord une livraison directe via le canal. Par défaut : `false`
  (chemin d'achèvement hérité de réveil/livraison de modèle requester-session).

</Accordion>

### `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },
}
```

### `tools.sessions`

Contrôle les sessions qui peuvent être ciblées par les outils de session (`sessions_list`, `sessions_history`, `sessions_send`).

Par défaut : `tree` (session actuelle + sessions générées par celle-ci, telles que les sous-agents).

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "tree",
    },
  },
}
```

Notes :

- `self` : uniquement la clé de session actuelle.
- `tree` : session actuelle + sessions générées par la session actuelle (sous-agents).
- `agent` : n'importe quelle session appartenant à l'identifiant d'agent actuel (peut inclure d'autres utilisateurs si vous exécutez des sessions par expéditeur sous le même identifiant d'agent).
- `all` : n'importe quelle session. Le ciblage inter-agents nécessite toujours `tools.agentToAgent`.
- Verrouillage du bac à sable (Sandbox clamp) : lorsque la session actuelle est sandboxed (isolée) et que `agents.defaults.sandbox.sessionToolsVisibility="spawned"`, la visibilité est forcée à `tree` même si `tools.sessions.visibility="all"`.

### `tools.sessions_spawn`

Contrôle la prise en charge des pièces jointes en ligne pour `sessions_spawn`.

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // opt-in: set true to allow inline file attachments
        maxTotalBytes: 5242880, // 5 MB total across all files
        maxFiles: 50,
        maxFileBytes: 1048576, // 1 MB per file
        retainOnSessionKeep: false, // keep attachments when cleanup="keep"
      },
    },
  },
}
```

Notes :

- Les pièces jointes ne sont prises en charge que pour `runtime: "subagent"`. Le runtime ACP les rejette.
- Les fichiers sont matérialisés dans l'espace de travail enfant à `.openclaw/attachments/<uuid>/` avec un `.manifest.json`.
- Le contenu des pièces jointes est automatiquement expurgé de la persistance des transcriptions.
- Les entrées Base64 sont validées avec des vérifications strictes de l'alphabet et du remplissage (padding), ainsi qu'une garde de taille pré-décodage.
- Les permissions de fichiers sont `0700` pour les répertoires et `0600` pour les fichiers.
- Le nettoyage suit la politique `cleanup` : `delete` supprime toujours les pièces jointes ; `keep` les conserve uniquement lorsque `retainOnSessionKeep: true`.

### `tools.experimental`

Indicateurs d'outils intégrés expérimentaux. Désactivés par défaut, sauf si une règle d'activation automatique stricte pour GPT-5 s'applique.

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

Notes :

- `planTool` : active l'outil structuré `update_plan` pour le suivi du travail multi-étapes non trivial.
- Par défaut : `false`, sauf si `agents.defaults.embeddedPi.executionContract` (ou une substitution par agent) est défini sur `"strict-agentic"` pour une exécution de la famille GPT-5 OpenAI ou OpenAI Codex. Définissez `true` pour forcer l'activation de l'outil en dehors de cette portée, ou `false` pour le désactiver même pour les exécutions GPT-5 strictement agéntiques.
- Lorsqu'il est activé, le prompt système ajoute également des directives d'utilisation afin que le modèle ne l'utilise que pour des tâches substantielles et conserve au plus une étape `in_progress`.

### `agents.defaults.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        allowAgents: ["research"],
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 8,
        runTimeoutSeconds: 900,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model` : modèle par défaut pour les sous-agents générés. Si omis, les sous-agents héritent du modèle de l'appelant.
- `allowAgents` : liste d'autorisation par défaut des IDs d'agents cibles pour `sessions_spawn` lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents` (`["*"]` = n'importe quel ; par défaut : même agent uniquement).
- `runTimeoutSeconds` : délai d'expiration par défaut (secondes) pour `sessions_spawn` lorsque l'appel d'outil omet `runTimeoutSeconds`. `0` signifie aucun délai d'expiration.
- Stratégie d'outil par sous-agent : `tools.subagents.tools.allow` / `tools.subagents.tools.deny`.

---

## Fournisseurs personnalisés et URL de base

OpenClaw utilise le catalogue de modèles intégré. Ajoutez des fournisseurs personnalisés via `models.providers` dans la configuration ou `~/.openclaw/agents/<agentId>/agent/models.json`.

```json5
{
  models: {
    mode: "merge", // merge (default) | replace
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            contextTokens: 96000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

- Utilisez `authHeader: true` + `headers` pour les besoins d'authentification personnalisés.
- Remplacez la racine de configuration de l'agent avec `OPENCLAW_AGENT_DIR` (ou `PI_CODING_AGENT_DIR`, un alias de variable d'environnement hérité).
- Priorité de fusion pour les IDs de fournisseurs correspondants :
  - Les valeurs non vides de l'agent `models.json` `baseUrl` priment.
  - Les valeurs non vides de l'agent `apiKey` ne priment que si ce fournisseur n'est pas géré par SecretRef dans le contexte de configuration/auth-profile actuel.
  - Les valeurs de fournisseur `apiKey` gérées par SecretRef sont actualisées à partir des marqueurs de source (`ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exéc) au lieu de conserver les secrets résolus.
  - Les valeurs d'en-tête du fournisseur gérées par SecretRef sont actualisées à partir des marqueurs source (`secretref-env:ENV_VAR_NAME` pour les références env, `secretref-managed` pour les références fichier/exec).
  - Les valeurs agent `apiKey`/`baseUrl` vides ou manquantes reviennent à `models.providers` dans la configuration.
  - Les `contextWindow`/`maxTokens` du modèle correspondant utilisent la valeur la plus élevée entre la configuration explicite et les valeurs implicites du catalogue.
  - La `contextTokens` du modèle correspondant préserve une limite d'exécution explicite lorsqu'elle est présente ; utilisez-la pour limiter le contexte effectif sans modifier les métadonnées natives du modèle.
  - Utilisez `models.mode: "replace"` lorsque vous souhaitez que la configuration réécrive entièrement `models.json`.
  - La persistance des marqueurs est basée sur la source : les marqueurs sont écrits à partir de l'instantané de la configuration source active (pré-résolution), et non à partir des valeurs de secrets d'exécution résolues.

### Détails des champs du fournisseur

- `models.mode` : comportement du catalogue de fournisseur (`merge` ou `replace`).
- `models.providers` : carte de fournisseur personnalisé indexée par l'identifiant du fournisseur.
- `models.providers.*.api` : adaptateur de requête (`openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`, etc.).
- `models.providers.*.apiKey` : identifiant du fournisseur (privilégier SecretRef/substitution env).
- `models.providers.*.auth` : stratégie d'authentification (`api-key`, `token`, `oauth`, `aws-sdk`).
- `models.providers.*.injectNumCtxForOpenAICompat` : pour Ollama + `openai-completions`, injecter `options.num_ctx` dans les requêtes (par défaut : `true`).
- `models.providers.*.authHeader` : forcer le transport des informations d'identification dans l'en-tête `Authorization` lorsque cela est requis.
- `models.providers.*.baseUrl` : URL de base de l'API en amont.
- `models.providers.*.headers` : en-têtes statiques supplémentaires pour le routage proxy/locataire.
- `models.providers.*.request` : substitutions de transport pour les requêtes HTTP du provider de modèle.
  - `request.headers` : en-têtes supplémentaires (fusionnés avec les valeurs par défaut du provider). Les valeurs acceptent SecretRef.
  - `request.auth` : substitution de la stratégie d'authentification. Modes : `"provider-default"` (utiliser l'auth intégrée du provider), `"authorization-bearer"` (avec `token`), `"header"` (avec `headerName`, `value`, `prefix` en option).
  - `request.proxy` : substitution du proxy HTTP. Modes : `"env-proxy"` (utiliser les variables d'environnement `HTTP_PROXY`/`HTTPS_PROXY`), `"explicit-proxy"` (avec `url`). Les deux modes acceptent un sous-objet `tls` en option.
  - `request.tls` : substitution TLS pour les connexions directes. Champs : `ca`, `cert`, `key`, `passphrase` (tous acceptent SecretRef), `serverName`, `insecureSkipVerify`.
  - `request.allowPrivateNetwork` : lorsqu'il est défini sur `true`, autorise HTTPS vers `baseUrl` lorsque le DNS résout vers des plages privées, CGNAT ou similaires, via le garde de récupération HTTP du provider (opt-in de l'opérateur pour les points de terminaison auto-hébergés de confiance compatibles OpenAI). WebSocket utilise le même `request` pour les en-têtes/TLS mais pas cette porte de récupération SSRF. Valeur par défaut `false`.
- `models.providers.*.models` : entrées explicites du catalogue de modèles du provider.
- `models.providers.*.models.*.contextWindow` : métadonnées natives de la fenêtre de contexte du modèle.
- `models.providers.*.models.*.contextTokens` : plafond de contexte d'exécution en option. Utilisez-le lorsque vous souhaitez un budget de contexte effectif plus petit que le `contextWindow` natif du modèle.
- `models.providers.*.models.*.compat.supportsDeveloperRole` : indicateur de compatibilité facultatif. Pour `api: "openai-completions"` avec un `baseUrl` non vide non natif (hôte différent de `api.openai.com`), OpenClaw force ceci à `false` lors de l'exécution. Un `baseUrl` vide ou omis conserve le comportement par défaut de OpenAI.
- `models.providers.*.models.*.compat.requiresStringContent` : indicateur de compatibilité facultatif pour les points de terminaison de chat compatibles OpenAI en chaîne uniquement. Lorsque `true`, OpenClaw aplatit les tableaux `messages[].content` en texte brut en chaînes de caractères avant d'envoyer la requête.
- `plugins.entries.amazon-bedrock.config.discovery` : racine des paramètres de découverte automatique Bedrock.
- `plugins.entries.amazon-bedrock.config.discovery.enabled` : activer/désactiver la découverte implicite.
- `plugins.entries.amazon-bedrock.config.discovery.region` : région AWS pour la découverte.
- `plugins.entries.amazon-bedrock.config.discovery.providerFilter` : filtre d'ID de fournisseur facultatif pour une découverte ciblée.
- `plugins.entries.amazon-bedrock.config.discovery.refreshInterval` : intervalle d'interrogation pour l'actualisation de la découverte.
- `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow` : fenêtre de contexte de secours pour les modèles découverts.
- `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens` : nombre maximal de jetons de sortie de secours pour les modèles découverts.

### Exemples de fournisseurs

<Accordion title="Cerebras (GLM 4.6 / 4.7)">

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: {
        primary: "cerebras/zai-glm-4.7",
        fallbacks: ["cerebras/zai-glm-4.6"],
      },
      models: {
        "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
        "cerebras/zai-glm-4.6": { alias: "GLM 4.6 (Cerebras)" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
          { id: "zai-glm-4.6", name: "GLM 4.6 (Cerebras)" },
        ],
      },
    },
  },
}
```

Utilisez `cerebras/zai-glm-4.7` pour Cerebras ; `zai/glm-4.7` pour Z.AI direct.

</Accordion>

<Accordion title="OpenCode">

```json5
{
  agents: {
    defaults: {
      model: { primary: "opencode/claude-opus-4-6" },
      models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
    },
  },
}
```

Définissez `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`). Utilisez des références `opencode/...` pour le catalogue Zen ou des références `opencode-go/...` pour le catalogue Go. Raccourci : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`.

</Accordion>

<Accordion title="Z.AI (GLM-4.7)">

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-4.7" },
      models: { "zai/glm-4.7": {} },
    },
  },
}
```

Définissez `ZAI_API_KEY`. `z.ai/*` et `z-ai/*` sont des alias acceptés. Raccourci : `openclaw onboard --auth-choice zai-api-key`.

- Point de terminaison général : `https://api.z.ai/api/paas/v4`
- Point de terminaison de codage (par défaut) : `https://api.z.ai/api/coding/paas/v4`
- Pour le point de terminaison général, définissez un fournisseur personnalisé avec le remplacement de l'URL de base.

</Accordion>

<Accordion title="Moonshot AI (Kimi)">

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: { "moonshot/kimi-k2.5": { alias: "Kimi K2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
        ],
      },
    },
  },
}
```

Pour le point de terminaison Chine : `baseUrl: "https://api.moonshot.cn/v1"` ou `openclaw onboard --auth-choice moonshot-api-key-cn`.

Les points de terminaison natifs Moonshot annoncent une compatibilité d'utilisation en flux continu sur le transport partagé `openai-completions`, et les clés OpenClaw désactivent les capacités du point de terminaison plutôt que l'identifiant du fournisseur intégré seul.

</Accordion>

<Accordion title="Kimi Coding">

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi/kimi-code" },
      models: { "kimi/kimi-code": { alias: "Kimi Code" } },
    },
  },
}
```

Fournisseur intégré compatible Anthropic. Raccourci : `openclaw onboard --auth-choice kimi-code-api-key`.

</Accordion>

<Accordion title="Synthétique (compatible Anthropic)">

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

L'URL de base doit omettre `/v1` (le client Anthropic l'ajoute). Raccourci : `openclaw onboard --auth-choice synthetic-api-key`.

</Accordion>

<Accordion title="MiniMax M2.7 (direct)">

```json5
{
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.7" },
      models: {
        "minimax/MiniMax-M2.7": { alias: "Minimax" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

Définissez `MINIMAX_API_KEY`. Raccourcis :
`openclaw onboard --auth-choice minimax-global-api` ou
`openclaw onboard --auth-choice minimax-cn-api`.
Le catalogue de modèles est par défaut limité à M2.7 uniquement.
Sur le chemin de flux continu compatible Anthropic, OpenClaw désactive la réflexion MiniMax par défaut, sauf si vous définissez explicitement `thinking` vous-même. `/fast on` ou
`params.fastMode: true` réécrit `MiniMax-M2.7` en
`MiniMax-M2.7-highspeed`.

</Accordion>

<Accordion title="Modèles locaux (LM Studio)">

Voir [Local Models](/en/gateway/local-models). TL;DR : exécutez un grand modèle local via l'API Responses LM Studio sur du matériel sérieux ; gardez les modèles hébergés fusionnés pour le repli.

</Accordion>

---

## Skills

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled` : liste d'autorisation optionnelle pour les skills intégrés uniquement (les skills gérés/espace de travail ne sont pas affectés).
- `load.extraDirs` : racines de skills partagées supplémentaires (priorité la plus basse).
- `install.preferBrew` : si vrai, préférer les programmes d'installation Homebrew lorsque `brew` est
  disponible avant de revenir à d'autres types de programmes d'installation.
- `install.nodeManager` : préférence du programme d'installation de nœud pour les specs `metadata.openclaw.install`
  (`npm` | `pnpm` | `yarn` | `bun`).
- `entries.<skillKey>.enabled: false` désactive un skill même s'il est intégré/installé.
- `entries.<skillKey>.apiKey` : commodité pour les skills déclarant une env var primaire (chaîne en texte brut ou objet SecretRef).

---

## Plugins

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-extension"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
        config: { provider: "twilio" },
      },
    },
  },
}
```

- Chargé depuis `~/.openclaw/extensions`, `<workspace>/.openclaw/extensions`, ainsi que `plugins.load.paths`.
- Discovery accepte les plugins natifs OpenClaw ainsi que les bundles Codex compatibles et les bundles Claude, y compris les bundles Claude avec mise en page par défaut sans manifeste.
- **Les modifications de configuration nécessitent un redémarrage de la passerelle.**
- `allow` : liste d'autorisation optionnelle (seuls les plugins répertoriés sont chargés). `deny` l'emporte.
- `plugins.entries.<id>.apiKey` : champ de commodité pour la clé d'API au niveau du plugin (lorsque pris en charge par le plugin).
- `plugins.entries.<id>.env` : carte d'env var limitée au plugin.
- `plugins.entries.<id>.hooks.allowPromptInjection` : lorsque `false`, le cœur bloque `before_prompt_build` et ignore les champs modifiant le prompt des `before_agent_start` hérités, tout en préservant les `modelOverride` et `providerOverride` hérités. S'applique aux hooks de plugin natifs et aux répertoires de hooks fournis par les bundles pris en charge.
- `plugins.entries.<id>.subagent.allowModelOverride` : accordez explicitement la confiance à ce plugin pour demander des remplacements `provider` et `model` par exécution pour les exécutions de sous-agent en arrière-plan.
- `plugins.entries.<id>.subagent.allowedModels` : liste d'autorisation (allowlist) facultative des cibles `provider/model` canoniques pour les remplacements de sous-agents de confiance. Utilisez `"*"` uniquement lorsque vous souhaitez intentionnellement autoriser n'importe quel modèle.
- `plugins.entries.<id>.config` : objet de configuration défini par le plugin (validé par le schéma de plugin natif OpenClaw lorsque disponible).
- `plugins.entries.firecrawl.config.webFetch` : paramètres du fournisseur de récupération web Firecrawl.
  - `apiKey` : clé d'Firecrawl API (accepte SecretRef). Revient à `plugins.entries.firecrawl.config.webSearch.apiKey`, `tools.web.fetch.firecrawl.apiKey` de l'héritage, ou à la variable d'environnement `FIRECRAWL_API_KEY`.
  - `baseUrl` : URL de base de l'Firecrawl API (par défaut : `https://api.firecrawl.dev`).
  - `onlyMainContent` : extraire uniquement le contenu principal des pages (par défaut : `true`).
  - `maxAgeMs` : âge maximale du cache en millisecondes (par défaut : `172800000` / 2 jours).
  - `timeoutSeconds` : délai d'expiration de la requête de scraping en secondes (par défaut : `60`).
- `plugins.entries.xai.config.xSearch` : paramètres de recherche web xAI X Search (Grok).
  - `enabled` : activer le fournisseur X Search.
  - `model` : modèle Grok à utiliser pour la recherche (par ex. `"grok-4-1-fast"`).
- `plugins.entries.memory-core.config.dreaming` : paramètres de rêve de la mémoire (expérimental). Voir [Dreaming](/en/concepts/dreaming) pour les phases et les seuils.
  - `enabled` : interrupteur principal de rêve (par défaut `false`).
  - `frequency` : cadence cron pour chaque cycle de rêve complet (`"0 3 * * *"` par défaut).
  - la politique de phase et les seuils sont des détails d'implémentation (pas des clés de configuration utilisateur).
- La configuration complète de la mémoire se trouve dans [Référence de configuration de la mémoire](/en/reference/memory-config) :
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- Les plugins de bundle Claude activés peuvent également fournir des valeurs par défaut Pi intégrées à partir de `settings.json` ; OpenClaw les applique en tant que paramètres d'agent nettoyés, et non en tant que correctifs de configuration OpenClaw bruts.
- `plugins.slots.memory` : choisissez l'ID du plugin de mémoire actif, ou `"none"` pour désactiver les plugins de mémoire.
- `plugins.slots.contextEngine` : choisissez l'ID du plugin de moteur de contexte actif ; par défaut `"legacy"` sauf si vous installez et sélectionnez un autre moteur.
- `plugins.installs` : métadonnées d'installation gérées par la CLI utilisées par `openclaw plugins update`.
  - Inclut `source`, `spec`, `sourcePath`, `installPath`, `version`, `resolvedName`, `resolvedVersion`, `resolvedSpec`, `integrity`, `shasum`, `resolvedAt`, `installedAt`.
  - Traitez `plugins.installs.*` comme un état géré ; privilégiez les commandes CLI par rapport aux modifications manuelles.

Voir [Plugins](/en/tools/plugin).

---

## Navigateur

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      user: { driver: "existing-session", attachOnly: true, color: "#00AA00" },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` désactive `act:evaluate` et `wait --fn`.
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` est désactivé lorsqu'il n'est pas défini, donc la navigation du navigateur reste stricte par défaut.
- Définissez `ssrfPolicy.dangerouslyAllowPrivateNetwork: true` uniquement lorsque vous faites confiance intentionnellement à la navigation du navigateur sur le réseau privé.
- En mode strict, les points de terminaison de profil CDP distants (`profiles.*.cdpUrl`) sont soumis au même blocage de réseau privé lors des vérifications d'accessibilité/découverte.
- `ssrfPolicy.allowPrivateNetwork` reste pris en charge en tant qu'alias hérité.
- En mode strict, utilisez `ssrfPolicy.hostnameAllowlist` et `ssrfPolicy.allowedHostnames` pour les exceptions explicites.
- Les profils distants sont en attachement uniquement (démarrage/arrêt/réinitialisation désactivés).
- `profiles.*.cdpUrl` accepte `http://`, `https://`, `ws://` et `wss://`.
  Utilisez HTTP(S) lorsque vous souhaitez qu'OpenClaw découvre `/json/version` ; utilisez WS(S)
  lorsque votre fournisseur vous fournit une URL WebSocket DevTools directe.
- Les profils `existing-session` sont uniquement hébergés et utilisent Chrome MCP au lieu de CDP.
- Les profils `existing-session` peuvent définir `userDataDir` pour cibler un
  profil de navigateur spécifique basé sur Chromium tel que Brave ou Edge.
- Les profils `existing-session` conservent les limites de route actuelles de Chrome MCP :
  actions basées sur des instantanés/références au lieu du ciblage par sélecteur CSS, hooks de téléchargement
  d'un seul fichier, pas de substitution de délai d'attente de boîte de dialogue, pas de `wait --load networkidle`
  et pas de `responsebody`, d'export PDF, d'interception de téléchargement ou d'actions par lot.
- Les profils `openclaw` gérés localement attribuent automatiquement `cdpPort` et `cdpUrl` ;
  ne définissez `cdpUrl` explicitement que pour le CDP distant.
- Ordre de détection automatique : navigateur par défaut s'il est basé sur Chromium → Chrome → Brave → Edge → Chromium → Chrome Canary.
- Service de contrôle : boucle locale uniquement (port dérivé de `gateway.port`, `18791` par défaut).
- `extraArgs` ajoute des indicateurs de lancement supplémentaires au démarrage local de Chromium (par exemple
  `--disable-gpu`, la dimension de la fenêtre ou les indicateurs de débogage).

---

## Interface utilisateur

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // emoji, short text, image URL, or data URI
    },
  },
}
```

- `seamColor` : couleur d'accentuation pour l'interface utilisateur de l'application native (teinte de la bulle du mode Talk, etc.).
- `assistant` : substitution de l'identité de l'interface utilisateur de contrôle. Revient à l'identité de l'agent actif.

---

## Gateway

```json5
{
  gateway: {
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
      token: "your-token",
      // password: "your-password", // or OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // for mode=trusted-proxy; see /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // off | serve | funnel
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // allowedOrigins: ["https://control.example.com"], // required for non-loopback Control UI
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://gateway.tailnet:18789",
      transport: "ssh", // ssh | direct
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // Optional. Default false.
    allowRealIpFallback: false,
    tools: {
      // Additional /tools/invoke HTTP denies
      deny: ["browser"],
      // Remove tools from the default HTTP deny list
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion title="Détails des champs de la passerelle">

- `mode` : `local` (exécuter la passerelle) ou `remote` (se connecter à une passerelle distante). La passerelle refuse de démarrer sauf si `local`.
- `port` : port multiplexé unique pour WS + HTTP. Priorité : `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind` : `auto`, `loopback` (par défaut), `lan` (`0.0.0.0`), `tailnet` (IP Gateway uniquement), ou `custom`.
- **Alias de liaison hérités** : utilisez les valeurs du mode de liaison dans `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), et non les alias d'hôte (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`).
- **Note Gateway** : la liaison `loopback` par défaut écoute sur `127.0.0.1` à l'intérieur du conteneur. Avec la mise en réseau pont Tailscale (`-p 18789:18789`), le trafic arrive sur `eth0`, la passerelle est donc inaccessible. Utilisez `--network host`, ou définissez `bind: "lan"` (ou `bind: "custom"` avec `customBindHost: "0.0.0.0"`) pour écouter sur toutes les interfaces.
- **Authentification** : requise par défaut. Les liaisons non-bouclent nécessitent une authentification de passerelle. En pratique, cela signifie un jeton/mot de passe partagé ou un proxy inverse conscient de l'identité avec `gateway.auth.mode: "trusted-proxy"`. L'assistant d'intégration génère un jeton par défaut.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés (y compris SecretRefs), définissez `gateway.auth.mode` explicitement sur `token` ou `password`. Les flux de démarrage et d'installation/réparation du service échouent lorsque les deux sont configurés et que le mode n'est pas défini.
- `gateway.auth.mode: "none"` : mode sans authentification explicite. À utiliser uniquement pour les configurations de bouclage local fiables ; cela n'est intentionnellement pas proposé par les invites d'intégration.
- `gateway.auth.mode: "trusted-proxy"` : déléguer l'authentification à un proxy inverse conscient de l'identité et faire confiance aux en-têtes d'identité provenant de `gateway.trustedProxies` (voir [Authentification de proxy de confiance](/en/gateway/trusted-proxy-auth)). Ce mode attend une source de proxy **non-bouclée** ; les proxys inverses en bouclée sur le même hôte ne satisfont pas l'authentification de proxy de confiance.
- `gateway.auth.allowTailscale` : lorsque `true`, les en-têtes d'identité Docker Serve peuvent satisfaire l'authentification de l'interface de contrôle/WebSocket (vérifiée via `tailscale whois`). Les points de terminaison de l'Docker HTTP n'utilisent **pas** cette authentification par en-tête Tailscale ; ils suivent plutôt le mode d'authentification HTTP normal de la passerelle. Ce flux sans jeton suppose que l'hôte de la passerelle est fiable. La valeur par défaut est `true` lorsque `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit` : limiteur d'échec d'authentification facultatif. S'applique par IP client et par portée d'authentification (secret partagé et jeton d'appareil sont suivis indépendamment). Les tentatives bloquées renvoient `429` + `Retry-After`.
  - Sur le chemin asynchrone de l'interface de contrôle API Serve, les tentatives échouées pour le même `{scope, clientIp}` sont sérialisées avant l'écriture de l'échec. Par conséquent, les mauvaises tentatives simultanées du même client peuvent déclencher le limiteur dès la deuxième demande au lieu que les deux se poursuivent comme des simples inadéquations.
  - `gateway.auth.rateLimit.exemptLoopback` est défini par défaut sur `true` ; définissez `false` si vous souhaitez également que le trafic localhost soit limité en débit (pour les configurations de test ou les déploiements de proxy stricts).
- Les tentatives d'authentification WS d'origine navigateur sont toujours limitées avec l'exemption de bouclage désactivée (défense en profondeur contre les attaques par force brute localhost basées sur le navigateur).
- En bouclage, ces verrouillages d'origine navigateur sont isolés par valeur `Origin` normalisée, de sorte que les échecs répétés d'une origine localhost ne verrouillent pas automatiquement une origine différente.
- `tailscale.mode` : `serve` (tailnet uniquement, liaison en bouclage) ou `funnel` (public, nécessite une authentification).
- `controlUi.allowedOrigins` : liste d'autorisation explicite des origines du navigateur pour les connexions WebSocket de la Tailscale. Requis lorsque des clients navigateur sont attendus à partir d'origines non-bouclées.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback` : mode dangereux qui active la repli d'origine d'en-tête Host pour les déploiements qui s'appuient intentionnellement sur la stratégie d'origine d'en-tête Host.
- `remote.transport` : `ssh` (par défaut) ou `direct` (ws/wss). Pour `direct`, `remote.url` doit être `ws://` ou `wss://`.
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` : substitution de secours côté client qui permet `ws://` en texte clair vers des IP de réseau privé fiables ; la valeur par défaut reste limitée à la bouclée pour le texte clair.
- `gateway.remote.token` / `.password` sont des champs d'identification de client distant. Ils ne configurent pas l'authentification de la passerelle par eux-mêmes.
- `gateway.push.apns.relay.baseUrl` : URL HTTPS de base pour le relais APNs externe utilisé par les versions officielles/TestFlight Tailscale après avoir publié des inscriptions prises en charge par relais à la passerelle. Cette URL doit correspondre à l'URL du relais compilée dans la version Gateway.
- `gateway.push.apns.relay.timeoutMs` : délai d'envoi passerelle-vers-relai en millisecondes. La valeur par défaut est `10000`.
- Les inscriptions prises en charge par relais sont déléguées à une identité de passerelle spécifique. L'application iOS jumelée récupère `gateway.identity.get`, inclut cette identité dans l'inscription au relais et transmet une autorisation d'envoi limitée à l'inscription à la passerelle. Une autre passerelle ne peut pas réutiliser cette inscription stockée.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS` : substitutions d'environnement temporaires pour la configuration de relais ci-dessus.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` : échappatoire de développement uniquement pour les URL de relais HTTP en bouclée. Les URL de relais de production doivent rester en HTTPS.
- `gateway.channelHealthCheckMinutes` : intervalle de surveillance de santé du channel en minutes. Définissez `0` pour désactiver globalement les redémarrages de surveillance de santé. Par défaut : `5`.
- `gateway.channelStaleEventThresholdMinutes` : seuil de socket obsolète en minutes. Gardez cette valeur supérieure ou égale à `gateway.channelHealthCheckMinutes`. Par défaut : `30`.
- `gateway.channelMaxRestartsPerHour` : nombre maximum de redémarrages de surveillance de santé par channel/compte sur une heure glissante. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : désactivation par channel des redémarrages de surveillance de santé tout en maintenant le moniteur global activé.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : substitution par compte pour les channels multi-comptes. Lorsqu'elle est définie, elle prend le pas sur la substitution au niveau du channel.
- Les chemins d'appel de passerelle locale peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue fermée (aucun masquage de repli distant).
- `trustedProxies` : IP de proxy inverse qui terminent le TLS ou injectent des en-têtes de client transférés. Ne listez que les proxys que vous contrôlez. Les entrées en bouclée sont toujours valides pour les configurations de proxy/local-detection sur le même hôte (par exemple iOS Serve ou un proxy inverse local), mais elles ne rendent **pas** les demandes en bouclée éligibles pour `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback` : lorsque `true`, la passerelle accepte `X-Real-IP` si `X-Forwarded-For` est manquant. Par défaut `false` pour un comportement d'échec fermé.
- `gateway.tools.deny` : noms d'outils supplémentaires bloqués pour `POST /tools/invoke` HTTP (étend la liste de refus par défaut).
- `gateway.tools.allow` : supprimer les noms d'outils de la liste de refus HTTP par défaut.

</Accordion>

### Points de terminaison compatibles avec OpenAI

- Chat Completions : désactivé par défaut. Activez avec `gateway.http.endpoints.chatCompletions.enabled: true`.
- Responses API : `gateway.http.endpoints.responses.enabled`.
- Renforcement de l'entrée URL des réponses :
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    Les listes d'autorisation vides sont traitées comme non définies ; utilisez `gateway.http.endpoints.responses.files.allowUrl=false`
    et/ou `gateway.http.endpoints.responses.images.allowUrl=false` pour désactiver la récupération d'URL.
- En-tête optionnel de renforcement des réponses :
  - `gateway.http.securityHeaders.strictTransportSecurity` (définissez uniquement pour les origines HTTPS que vous contrôlez ; voir [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### Isolation multi-instance

Exécutez plusieurs passerelles sur un seul hôte avec des ports et des répertoires d'état uniques :

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

Indicateurs de commodité : `--dev` (utilise `~/.openclaw-dev` + port `19001`), `--profile <name>` (utilise `~/.openclaw-<name>`).

Voir [Multiple Gateways](/en/gateway/multiple-gateways).

### `gateway.tls`

```json5
{
  gateway: {
    tls: {
      enabled: false,
      autoGenerate: false,
      certPath: "/etc/openclaw/tls/server.crt",
      keyPath: "/etc/openclaw/tls/server.key",
      caPath: "/etc/openclaw/tls/ca-bundle.crt",
    },
  },
}
```

- `enabled` : active la terminaison TLS au niveau de l'écouteur de la passerelle (HTTPS/WSS) (par défaut : `false`).
- `autoGenerate` : génère automatiquement une paire de certificat/clé auto-signée locale lorsque des fichiers explicites ne sont pas configurés ; à utiliser uniquement pour un usage local/développement.
- `certPath` : chemin du système de fichiers vers le fichier de certificat TLS.
- `keyPath` : chemin du système de fichiers vers le fichier de clé privée TLS ; gardez-le restreint par permission.
- `caPath` : chemin optionnel du bundle CA pour la vérification du client ou les chaînes de confiance personnalisées.

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // off | restart | hot | hybrid
      debounceMs: 500,
      deferralTimeoutMs: 300000,
    },
  },
}
```

- `mode` : contrôle la manière dont les modifications de configuration sont appliquées lors de l'exécution.
  - `"off"` : ignorer les modifications en direct ; les changements nécessitent un redémarrage explicite.
  - `"restart"` : toujours redémarrer le processus de la passerelle en cas de changement de configuration.
  - `"hot"` : appliquer les modifications en cours de processus sans redémarrer.
  - `"hybrid"` (par défaut) : essayer le rechargement à chaud d'abord ; revenir au redémarrage si nécessaire.
- `debounceMs` : fenêtre de rebond en ms avant l'application des modifications de configuration (entier non négatif).
- `deferralTimeoutMs` : temps maximal en ms à attendre pour les opérations en cours avant de forcer un redémarrage (par défaut : `300000` = 5 minutes).

---

## Hooks

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.4-mini",
      },
    ],
  },
}
```

Auth : `Authorization: Bearer <token>` ou `x-openclaw-token: <token>`.
Les jetons de hook de type chaîne de requête (query-string) sont rejetés.

Remarques sur la validation et la sécurité :

- `hooks.enabled=true` nécessite un `hooks.token` non vide.
- `hooks.token` doit être **distinct** de `gateway.auth.token` ; la réutilisation du jeton Gateway est rejetée.
- `hooks.path` ne peut pas être `/` ; utilisez un sous-chemin dédié tel que `/hooks`.
- Si `hooks.allowRequestSessionKey=true`, limitez `hooks.allowedSessionKeyPrefixes` (par exemple `["hook:"]`).

**Points de terminaison :**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - `sessionKey` issu de la charge utile de la requête n'est accepté que lorsque `hooks.allowRequestSessionKey=true` (par défaut : `false`).
- `POST /hooks/<name>` → résolu via `hooks.mappings`

<Accordion title="Détails du mappage">

- `match.path` correspond au sous-chemin après `/hooks` (par ex. `/hooks/gmail` → `gmail`).
- `match.source` correspond à un champ de payload pour les chemins génériques.
- Les modèles comme `{{messages[0].subject}}` lisent le payload.
- `transform` peut pointer vers un module JS/TS renvoyant une action de hook.
  - `transform.module` doit être un chemin relatif et rester dans `hooks.transformsDir` (les chemins absolus et les traversées sont rejetés).
- `agentId` route vers un agent spécifique ; les ID inconnus reviennent à la valeur par défaut.
- `allowedAgentIds` : restreint le routage explicite (`*` ou omis = tout autoriser, `[]` = tout refuser).
- `defaultSessionKey` : clé de session fixe optionnelle pour les exécutions d'agents de hook sans `sessionKey` explicite.
- `allowRequestSessionKey` : autoriser les appelants `/hooks/agent` à définir `sessionKey` (par défaut : `false`).
- `allowedSessionKeyPrefixes` : liste d'autorisation de préfixe optionnelle pour les valeurs `sessionKey` explicites (requête + mappage), par ex. `["hook:"]`.
- `deliver: true` envoie la réponse finale à un channel ; `channel` par défaut est `last`.
- `model` remplace le LLM pour cette exécution de hook (doit être autorisé si le catalogue de modèles est défini).

</Accordion>

### Intégration Gmail

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

- Le Gateway démarre automatiquement `gog gmail watch serve` au démarrage lorsqu'il est configuré. Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour désactiver.
- N'exécutez pas un `gog gmail watch serve` séparé parallèlement au Gateway.

---

## Hôte Canvas

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
  },
}
```

- Sert du HTML/CSS/JS modifiable par l'agent et l'A2UI sur HTTP sous le port du Gateway :
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- Local uniquement : conservez `gateway.bind: "loopback"` (par défaut).
- Non-loopback binds: canvas routes require Gateway auth (token/password/trusted-proxy), same as other Gateway HTTP surfaces.
- Node WebViews typically don't send auth headers; after a node is paired and connected, the Gateway advertises node-scoped capability URLs for canvas/A2UI access.
- Capability URLs are bound to the active node WS session and expire quickly. IP-based fallback is not used.
- Injects live-reload client into served HTML.
- Auto-creates starter `index.html` when empty.
- Also serves A2UI at `/__openclaw__/a2ui/`.
- Changes require a gateway restart.
- Disable live reload for large directories or `EMFILE` errors.

---

## Discovery

### mDNS (Bonjour)

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal` (default): omit `cliPath` + `sshPort` from TXT records.
- `full`: include `cliPath` + `sshPort`.
- Hostname defaults to `openclaw`. Override with `OPENCLAW_MDNS_HOSTNAME`.

### Wide-area (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

Writes a unicast DNS-SD zone under `~/.openclaw/dns/`. For cross-network discovery, pair with a DNS server (CoreDNS recommended) + Tailscale split DNS.

Setup: `openclaw dns setup --apply`.

---

## Environment

### `env` (inline env vars)

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- Inline env vars are only applied if the process env is missing the key.
- `.env` files: CWD `.env` + `~/.openclaw/.env` (neither overrides existing vars).
- `shellEnv`: imports missing expected keys from your login shell profile.
- See [Environment](/en/help/environment) for full precedence.

### Env var substitution

Reference env vars in any config string with `${VAR_NAME}`:

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- Only uppercase names matched: `[A-Z_][A-Z0-9_]*`.
- Missing/empty vars throw an error at config load.
- Escape with `$${VAR}` for a literal `${VAR}`.
- Works with `$include`.

---

## Secrets

Secret refs are additive: plaintext values still work.

### `SecretRef`

Utilisez une forme d'objet :

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

Validation :

- modèle `provider` : `^[a-z][a-z0-9_-]{0,63}$`
- modèle d'id `source: "env"` : `^[A-Z][A-Z0-9_]{0,127}$`
- id `source: "file"` : pointeur JSON absolu (par exemple `"/providers/openai/apiKey"`)
- modèle d'id `source: "exec"` : `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- les ids `source: "exec"` ne doivent pas contenir de segments de chemin séparés par des barres obliques `.` ou `..` (par exemple `a/../b` est rejeté)

### Surface d'identification prise en charge

- Matrice canonique : [Surface d'identification SecretRef](/en/reference/secretref-credential-surface)
- `secrets apply` cible les chemins d'identification `openclaw.json` pris en charge.
- Les références `auth-profiles.json` sont incluses dans la résolution au moment de l'exécution et la couverture d'audit.

### Configuration des fournisseurs de secrets

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // optional explicit env provider
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

Notes :

- Le fournisseur `file` prend en charge `mode: "json"` et `mode: "singleValue"` (`id` doit être `"value"` en mode singleValue).
- Le fournisseur `exec` nécessite un chemin `command` absolu et utilise des charges utiles de protocole sur stdin/stdout.
- Par défaut, les chemins de commande de lien symbolique sont rejetés. Définissez `allowSymlinkCommand: true` pour autoriser les chemins de lien symbolique tout en validant le chemin cible résolu.
- Si `trustedDirs` est configuré, la vérification du répertoire de confiance s'applique au chemin cible résolu.
- L'environnement enfant `exec` est minimal par défaut ; passez les variables requises explicitement avec `passEnv`.
- Les références de secrets sont résolues au moment de l'activation dans un instantané en mémoire, puis les chemins de demande lisent uniquement l'instantané.
- Le filtrage de surface active s'applique lors de l'activation : les références non résolues sur les surfaces activées entraînent l'échec du démarrage/rechargement, tandis que les surfaces inactives sont ignorées avec des diagnostics.

---

## Stockage d'authentification

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai-codex:personal": { provider: "openai-codex", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      "openai-codex": ["openai-codex:personal"],
    },
  },
}
```

- Les profils par agent sont stockés à `<agentDir>/auth-profiles.json`.
- `auth-profiles.json` prend en charge les références au niveau des valeurs (`keyRef` pour `api_key`, `tokenRef` pour `token`) pour les modes d'identification statiques.
- Les profils en mode OAuth (`auth.profiles.<id>.mode = "oauth"`) ne prennent pas en charge les identifiants de profil d'authentification sauvegardés par SecretRef.
- Les identifiants d'exécution statiques proviennent d'instantanés résolus en mémoire ; les entrées `auth.json` statiques héritées sont supprimées lorsqu'elles sont détectées.
- Importations héritées OAuth depuis `~/.openclaw/credentials/oauth.json`.
- Voir [OAuth](/en/concepts/oauth).
- Comportement d'exécution des secrets et outils `audit/configure/apply` : [Gestion des secrets](/en/gateway/secrets).

### `auth.cooldowns`

```json5
{
  auth: {
    cooldowns: {
      billingBackoffHours: 5,
      billingBackoffHoursByProvider: { anthropic: 3, openai: 8 },
      billingMaxHours: 24,
      authPermanentBackoffMinutes: 10,
      authPermanentMaxMinutes: 60,
      failureWindowHours: 24,
      overloadedProfileRotations: 1,
      overloadedBackoffMs: 0,
      rateLimitedProfileRotations: 1,
    },
  },
}
```

- `billingBackoffHours` : temps d'attente de base en heures lorsqu'un profil échoue en raison de véritables erreurs de facturation/crédit insuffisant (par défaut : `5`). Le texte de facturation explicite peut toujours atterrir ici même sur les réponses `401`/`403`, mais les comparateurs de texte spécifiques au provider restent limités au provider qui les possède (par exemple OpenRouter `Key limit exceeded`). Les messages réessayables HTTP `402` de fenêtre d'utilisation ou de limite de dépenses d'organisation/espace de travail restent plutôt dans le chemin `rate_limit`.
- `billingBackoffHoursByProvider` : substitutions facultatives par provider pour les heures de temps d'attente de facturation.
- `billingMaxHours` : plafond en heures pour la croissance exponentielle du temps d'attente de facturation (par défaut : `24`).
- `authPermanentBackoffMinutes` : temps d'attente de base en minutes pour les échecs `auth_permanent` à haute confiance (par défaut : `10`).
- `authPermanentMaxMinutes` : plafond en minutes pour la croissance du temps d'attente `auth_permanent` (par défaut : `60`).
- `failureWindowHours` : fenêtre glissante en heures utilisée pour les compteurs de temps d'attente (par défaut : `24`).
- `overloadedProfileRotations` : nombre maximum de rotations de profils d'authentification du même fournisseur pour les erreurs de surcharge avant de passer au modèle de secours (par défaut : `1`). Les formes de fournisseur occupé telles que `ModelNotReadyException` atterrissent ici.
- `overloadedBackoffMs` : délai fixe avant de réessayer une rotation de fournisseur/profil surchargé (par défaut : `0`).
- `rateLimitedProfileRotations` : nombre maximum de rotations de profils d'authentification du même fournisseur pour les erreurs de limite de taux avant de passer au modèle de secours (par défaut : `1`). Ce compartiment de limite de taux comprend du texte de forme de fournisseur tel que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded` et `resource exhausted`.

---

## Journalisation

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | compact | json
    redactSensitive: "tools", // off | tools
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- Fichier journal par défaut : `/tmp/openclaw/openclaw-YYYY-MM-DD.log`.
- Définissez `logging.file` pour un chemin stable.
- `consoleLevel` passe à `debug` lorsque `--verbose`.
- `maxFileBytes` : taille maximale du fichier journal en octets avant que les écritures ne soient supprimées (entier positif ; par défaut : `524288000` = 500 Mo). Utilisez une rotation de journal externe pour les déploiements en production.

---

## Diagnostics

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      protocol: "http/protobuf", // http/protobuf | grpc
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      sampleRate: 1.0,
      flushIntervalMs: 5000,
    },

    cacheTrace: {
      enabled: false,
      filePath: "~/.openclaw/logs/cache-trace.jsonl",
      includeMessages: true,
      includePrompt: true,
      includeSystem: true,
    },
  },
}
```

- `enabled` : interrupteur principal pour la sortie d'instrumentation (par défaut : `true`).
- `flags` : tableau de chaînes de drapeaux activant la sortie de journal ciblée (prend en charge les caractères génériques comme `"telegram.*"` ou `"*"`).
- `stuckSessionWarnMs` : seuil d'âge en ms pour émettre des avertissements de session bloquée alors qu'une session reste à l'état de traitement.
- `otel.enabled` : active le pipeline d'exportation OpenTelemetry (par défaut : `false`).
- `otel.endpoint` : URL du collecteur pour l'exportation OTel.
- `otel.protocol` : `"http/protobuf"` (par défaut) ou `"grpc"`.
- `otel.headers` : en-têtes de métadonnées HTTP/gRPC supplémentaires envoyés avec les requêtes d'exportation OTel.
- `otel.serviceName` : nom du service pour les attributs de ressource.
- `otel.traces` / `otel.metrics` / `otel.logs` : activer l'export des traces, des métriques ou des journaux.
- `otel.sampleRate` : taux d'échantillonnage des traces `0`–`1`.
- `otel.flushIntervalMs` : intervalle de vidage de la télémétrie périodique en ms.
- `cacheTrace.enabled` : enregistrer les instantanés de trace du cache pour les exécutions intégrées (par défaut : `false`).
- `cacheTrace.filePath` : chemin de sortie pour le JSONL de trace du cache (par défaut : `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`).
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem` : contrôler ce qui est inclus dans la sortie de trace du cache (tous par défaut : `true`).

---

## Mise à jour

```json5
{
  update: {
    channel: "stable", // stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

- `channel` : canal de publication pour les installations npm/git — `"stable"`, `"beta"` ou `"dev"`.
- `checkOnStart` : vérifier les mises à jour npm au démarrage de la passerelle (par défaut : `true`).
- `auto.enabled` : activer la mise à jour automatique en arrière-plan pour les installations de packages (par défaut : `false`).
- `auto.stableDelayHours` : délai minimum en heures avant l'application automatique du canal stable (par défaut : `6` ; max : `168`).
- `auto.stableJitterHours` : fenêtre de délai de déploiement supplémentaire pour le canal stable en heures (par défaut : `12` ; max : `168`).
- `auto.betaCheckIntervalHours` : fréquence des vérifications du canal bêta en heures (par défaut : `1` ; max : `24`).

---

## ACP

```json5
{
  acp: {
    enabled: false,
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    maxConcurrentSessions: 10,

    stream: {
      coalesceIdleMs: 50,
      maxChunkChars: 1000,
      repeatSuppression: true,
      deliveryMode: "live", // live | final_only
      hiddenBoundarySeparator: "paragraph", // none | space | newline | paragraph
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled` : contrôle global de la fonctionnalité ACP (par défaut : `false`).
- `dispatch.enabled` : interrupteur indépendant pour la distribution des tours de session ACP (par défaut : `true`). Définir `false` pour garder les commandes ACP disponibles tout en bloquant l'exécution.
- `backend` : identifiant du backend d'exécution ACP par défaut (doit correspondre à un plugin d'exécution ACP enregistré).
- `defaultAgent` : identifiant de l'agent cible ACP de repli lorsque les spawns ne spécifient pas de cible explicite.
- `allowedAgents` : liste d'autorisation (allowlist) des identifiants d'agents autorisés pour les sessions d'exécution ACP ; vide signifie aucune restriction supplémentaire.
- `maxConcurrentSessions` : nombre maximum de sessions ACP simultanément actives.
- `stream.coalesceIdleMs` : fenêtre de flush d'inactivité en ms pour le texte diffusé en flux (streamed).
- `stream.maxChunkChars` : taille maximale des blocs avant de diviser la projection de bloc diffusé en flux.
- `stream.repeatSuppression` : supprimer les lignes de statut/out répétées par tour (par défaut : `true`).
- `stream.deliveryMode` : `"live"` diffuse de manière incrémentale ; `"final_only"` met en tampon jusqu'aux événements terminaux du tour.
- `stream.hiddenBoundarySeparator` : séparateur avant le texte visible après les événements d'outil masqués (par défaut : `"paragraph"`).
- `stream.maxOutputChars` : nombre maximum de caractères de sortie de l'assistant projetés par tour ACP.
- `stream.maxSessionUpdateChars` : nombre maximum de caractères pour les lignes de statut/mise à jour ACP projetées.
- `stream.tagVisibility` : enregistrement des noms de balises vers des remplacements booléens de visibilité pour les événements diffusés.
- `runtime.ttlMinutes` : TTL d'inactivité en minutes pour les workers de session ACP avant éligibilité au nettoyage.
- `runtime.installCommand` : commande d'installation optionnelle à exécuter lors de l'amorçage d'un environnement d'exécution ACP.

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `cli.banner.taglineMode` contrôle le style du slogan de la bannière :
  - `"random"` (par défaut) : slogans amusants/saisonniers tournants.
  - `"default"` : slogan neutre fixe (`All your chats, one OpenClaw.`).
  - `"off"` : aucun texte de slogan (le titre/version de la bannière sont toujours affichés).
- Pour masquer entièrement la bannière (pas seulement les slogans), définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

---

## Assistant

Métadonnées écrites par les flux de configuration guidée CLI (`onboard`, `configure`, `doctor`) :

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
  },
}
```

---

## Identité

Voir les champs d'identité `agents.list` sous [Agent defaults](#agent-defaults).

---

## Bridge (hérité, supprimé)

Les versions actuelles n'incluent plus le pont TCP. Les nœuds se connectent via le WebSocket du Gateway. Les clés `bridge.*` ne font plus partie du schéma de configuration (la validation échoue jusqu'à leur suppression ; `openclaw doctor --fix` peut supprimer les clés inconnues).

<Accordion title="Configuration du pont hérité (référence historique)">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## Cron

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2,
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

- `sessionRetention` : durée de conservation des sessions d'exécution cron isolées terminées avant le nettoyage dans `sessions.json`. Contrôle également le nettoyage des transcriptions cron supprimées archivées. Par défaut : `24h` ; définissez `false` pour désactiver.
- `runLog.maxBytes` : taille maximale par fichier journal d'exécution (`cron/runs/<jobId>.jsonl`) avant le nettoyage. Par défaut : `2_000_000` octets.
- `runLog.keepLines` : plus récentes lignes conservées lorsque le nettoyage du journal d'exécution est déclenché. Par défaut : `2000`.
- `webhookToken` : jeton bearer utilisé pour la livraison POST du webhook cron (`delivery.mode = "webhook"`), si omis aucun en-tête d'authentification n'est envoyé.
- `webhook` : URL de webhook de repli héritée obsolète (http/https) utilisée uniquement pour les tâches stockées qui ont encore `notify: true`.

### `cron.retry`

```json5
{
  cron: {
    retry: {
      maxAttempts: 3,
      backoffMs: [30000, 60000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "timeout", "server_error"],
    },
  },
}
```

- `maxAttempts` : nombre maximum de tentatives pour les tâches ponctuelles en cas d'erreurs transitoires (par défaut : `3` ; plage : `0`–`10`).
- `backoffMs` : tableau des délais d'attente exponentiels en ms pour chaque tentative de réessai (par défaut : `[30000, 60000, 300000]` ; 1 à 10 entrées).
- `retryOn` : types d'erreurs qui déclenchent des nouvelles tentatives — `"rate_limit"`, `"overloaded"`, `"network"`, `"timeout"`, `"server_error"`. Omettez pour réessayer tous les types transitoires.

S'applique uniquement aux tâches cron ponctuelles. Les tâches récurrentes utilisent une gestion des échecs séparée.

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 3,
      cooldownMs: 3600000,
      mode: "announce",
      accountId: "main",
    },
  },
}
```

- `enabled` : activer les alertes d'échec pour les tâches cron (par défaut : `false`).
- `after` : échecs consécutifs avant le déclenchement d'une alerte (entier positif, min : `1`).
- `cooldownMs` : durée minimale en millisecondes entre les alertes répétées pour la même tâche (entier non négatif).
- `mode` : mode de livraison — `"announce"` envoie via un message de channel ; `"webhook"` publie sur le webhook configuré.
- `accountId` : identifiant de compte ou de channel facultatif pour délimiter la livraison des alertes.

### `cron.failureDestination`

```json5
{
  cron: {
    failureDestination: {
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

- Destination par défaut pour les notifications d'échec cron pour toutes les tâches.
- `mode` : `"announce"` ou `"webhook"` ; par défaut `"announce"` lorsque suffisamment de données cibles sont disponibles.
- `channel` : substitution de channel pour la livraison des annonces. `"last"` réutilise le dernier channel de livraison connu.
- `to` : cible d'annonce explicite ou URL de webhook. Requis pour le mode webhook.
- `accountId` : substitution de compte facultative pour la livraison.
- La substitution `delivery.failureDestination` par tâche remplace cette valeur par défaut globale.
- Lorsqu'aucune destination d'échec globale ou par tâche n'est définie, les tâches qui livrent déjà via `announce` reviennent à cette cible d'annonce principale en cas d'échec.
- `delivery.failureDestination` n'est pris en charge que pour les tâches `sessionTarget="isolated"` sauf si le `delivery.mode` principal de la tâche est `"webhook"`.

Voir [Cron Jobs](/en/automation/cron-jobs). Les exécutions cron isolées sont suivies comme [tâches d'arrière-plan](/en/automation/tasks).

---

## Variables de modèle de modèle média

Espaces réservés de modèle développés dans `tools.media.models[].args` :

| Variable           | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `{{Body}}`         | Corps du message entrant complet                                    |
| `{{RawBody}}`      | Corps brut (sans enveloppes d'historique/expéditeur)                |
| `{{BodyStripped}}` | Corps sans les mentions de groupe                                   |
| `{{From}}`         | Identifiant de l'expéditeur                                         |
| `{{To}}`           | Identifiant de destination                                          |
| `{{MessageSid}}`   | ID du message de la chaîne                                          |
| `{{SessionId}}`    | UUID de la session actuelle                                         |
| `{{IsNewSession}}` | `"true"` lors de la création d'une nouvelle session                 |
| `{{MediaUrl}}`     | Pseudo-URL du média entrant                                         |
| `{{MediaPath}}`    | Chemin d'accès local au média                                       |
| `{{MediaType}}`    | Type de média (image/audio/document/…)                              |
| `{{Transcript}}`   | Transcription audio                                                 |
| `{{Prompt}}`       | Invite média résolue pour les entrées CLI                           |
| `{{MaxChars}}`     | Nombre maximum de caractères de sortie résolus pour les entrées CLI |
| `{{ChatType}}`     | `"direct"` ou `"group"`                                             |
| `{{GroupSubject}}` | Sujet du groupe (best effort)                                       |
| `{{GroupMembers}}` | Aperçu des membres du groupe (best effort)                          |
| `{{SenderName}}`   | Nom d'affichage de l'expéditeur (best effort)                       |
| `{{SenderE164}}`   | Numéro de téléphone de l'expéditeur (best effort)                   |
| `{{Provider}}`     | Indication de fournisseur (whatsapp, telegram, discord, etc.)       |

---

## Inclusions de configuration (`$include`)

Diviser la configuration en plusieurs fichiers :

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**Comportement de fusion :**

- Fichier unique : remplace l'objet conteneur.
- Tableau de fichiers : fusionné en profondeur dans l'ordre (les suivants remplacent les précédents).
- Clés frères : fusionnées après les inclusions (remplacent les valeurs incluses).
- Inclusions imbriquées : jusqu'à 10 niveaux de profondeur.
- Chemins : résolus relativement au fichier inclus, mais doivent rester dans le répertoire de configuration de premier niveau (`dirname` de `openclaw.json`). Les formes absolues/`../` sont autorisées uniquement lorsqu'elles résolvent toujours à l'intérieur de cette limite.
- Erreurs : messages clairs pour les fichiers manquants, les erreurs d'analyse et les inclusions circulaires.

---

_Connexe : [Configuration](/en/gateway/configuration) · [Configuration Examples](/en/gateway/configuration-examples) · [Doctor](/en/gateway/doctor)_
