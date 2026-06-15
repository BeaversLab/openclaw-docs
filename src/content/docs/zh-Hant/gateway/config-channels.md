---
summary: "頻道設定：存取控制、配對，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每個頻道金鑰"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "設定 — 頻道"
---

`channels.*` 下的每個頻道設定金鑰。涵蓋 DM 與群組存取、多帳號設定、提及閘控，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他內建頻道外掛的每個頻道金鑰。

有關代理程式、工具、Gateway 執行時期和其他頂層配置鍵，請參閱
[Configuration reference](/zh-Hant/gateway/configuration-reference)。

## 頻道

每個頻道在其設定區段存在時會自動啟動（除非 `enabled: false`）。

### DM 和群組存取

所有頻道都支援 DM 原則和群組原則：

| DM 原則             | 行為                                                |
| ------------------- | --------------------------------------------------- |
| `pairing`（預設值） | 未知傳送者會收到一次性配對碼；擁有者必須核准        |
| `allowlist`         | 僅限 `allowFrom` 中的傳送者（或已配對的允許存放區） |
| `open`              | 允許所有傳入 DM（需要 `allowFrom: ["*"]`）          |
| `disabled`          | 忽略所有傳入 DM                                     |

| 群組原則              | 行為                                 |
| --------------------- | ------------------------------------ |
| `allowlist`（預設值） | 僅限符合設定允許清單的群組           |
| `open`                | 略過群組允許清單（提及閘控仍然適用） |
| `disabled`            | 封鎖所有群組/房間訊息                |

<Note>
當提供者的 `groupPolicy` 未設定時，`channels.defaults.groupPolicy` 會設定預設值。
配對碼會在 1 小時後過期。待處理的 DM 配對請求限制為 **每個頻道 3 個**。
如果完全缺少提供者區塊（`channels.<provider>` 不存在），執行時期群組原則會回退至 `allowlist`（失效關閉），並顯示啟動警告。
</Note>

### 頻道模型覆寫

使用 `channels.modelByChannel` 將特定頻道 ID 指定給模型。值接受 `provider/model` 或已設定的模型別名。當工作階段尚未有模型覆寫時（例如透過 `/model` 設定），會套用頻道對應。

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

### 通道預設與心跳

使用 `channels.defaults` 來跨提供者設定共用的群組原則和心跳行為：

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

- `channels.defaults.groupPolicy`：當提供者層級的 `groupPolicy` 未設定時的後備群組原則。
- `channels.defaults.contextVisibility`：所有通道的預設補充上下文可見性模式。值：`all`（預設，包含所有引用/討論串/歷史上下文）、`allowlist`（僅包含來自允許清單發送者的上下文）、`allowlist_quote`（與 allowlist 相同，但保留明確的引用/回覆上下文）。各通道覆寫：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在心跳輸出中包含健康的通道狀態。
- `channels.defaults.heartbeat.showAlerts`：在心跳輸出中包含降級/錯誤狀態。
- `channels.defaults.heartbeat.useIndicator`：呈現精簡的指示器樣式心跳輸出。

### WhatsApp

WhatsApp 透過 gateway 的網頁通道（Baileys Web）運行。當存在連結的工作階段時，它會自動啟動。

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

<Accordion title="多帳號 WhatsApp">

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

- 如果帳號 `default` 存在，出站指令預設使用該帳號；否則使用第一個設定的帳號 ID（排序後）。
- 可選的 `channels.whatsapp.defaultAccount` 會在符合已設定的帳號 ID 時覆寫該備用的預設帳號選擇。
- 舊版單一帳號 Baileys 認證目錄會由 `openclaw doctor` 遷移至 `whatsapp/default`。
- 各帳號覆寫：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

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

- Bot 權杖：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（僅限一般檔案；拒絕符號連結），並以 `TELEGRAM_BOT_TOKEN` 作為預設帳號的備用。
- `apiRoot` 僅是 Telegram Bot API 根目錄。請使用 `https://api.telegram.org` 或您的自託管/代理根目錄，而不是 `https://api.telegram.org/bot<TOKEN>`；`openclaw doctor --fix` 會移除意外出現在結尾的 `/bot<TOKEN>` 後綴。
- 可選的 `channels.telegram.defaultAccount` 會在符合已設定的帳號 ID 時覆寫預設帳號選擇。
- 在多帳號設定（2 個以上帳號 ID）中，請設定明確的預設值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免備用路由；當此設定遺失或無效時，`openclaw doctor` 會發出警告。
- `configWrites: false` 封鎖 Telegram 發起的配置寫入（超級群組 ID 遷移，`/config set|unset`）。
- 具有 `type: "acp"` 的頂層 `bindings[]` 項目可設定論壇主題的持久 ACP 繫結（在 `match.peer.id` 中使用標準 `chatId:topic:topicId`）。欄位語義共用於 [ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。
- Telegram 串流預覽使用 `sendMessage` + `editMessageText`（適用於直接與群組聊天）。
- 重試政策：請參閱 [Retry policy](/zh-Hant/concepts/retry)。

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

- Token：`channels.discord.token`，並以 `DISCORD_BOT_TOKEN` 作為預設帳戶的後備。
- 提供明確 Discord `token` 的直接外撥呼叫會使用該 token；帳戶重試/政策設定仍來自使用中執行時快照中的所選帳戶。
- 可選的 `channels.discord.defaultAccount` 在符合已配置的帳戶 ID 時，會覆寫預設的帳戶選擇。
- 請使用 `user:<id>` (DM) 或 `channel:<id>` (群組頻道) 作為傳遞目標；不接受純數字 ID。
- Guild slugs 為小寫，空格以 `-` 取代；頻道鍵使用 slug 化名稱（無 `#`）。建議優先使用 Guild ID。
- 預設會忽略由 Bot 發送的訊息。`allowBots: true` 可啟用它們；使用 `allowBots: "mentions"` 則僅接受提及該 Bot 的 Bot 訊息（自身的訊息仍會被過濾）。
- 支援機器人撰寫傳入訊息的頻道可以使用共享的 [bot loop protection](/zh-Hant/channels/bot-loop-protection)。設定 `channels.defaults.botLoopProtection` 作為基線配對預算，然後僅在某一介面需要不同限制時覆寫該頻道或帳戶。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及頻道覆寫）會捨棄提及其他使用者或角色但未提及機器人的訊息（@everyone/@here 除外）。
- `channels.discord.mentionAliases` 會在發送前將穩定的出站 `@handle` 文字對應至 Discord 使用者 ID，因此即使暫時的目錄快取是空的，也能確定地提及已知的隊友。各帳戶的覆寫位於 `channels.discord.accounts.<accountId>.mentionAliases` 下。
- `maxLinesPerMessage`（預設為 17）會分割長訊息，即使字數低於 2000 字元。
- `channels.discord.suppressEmbeds` 預設為 `true`，因此除非停用，否則出站 URL 不會展開為 Discord 連結預覽。明確的 `embeds` 載荷仍會正常發送；每則訊息的工具呼叫可以使用 `suppressEmbeds` 覆寫。
- `channels.discord.threadBindings` 控制 Discord 執行緒繫結路由：
  - `enabled`：執行緒繫結會話功能的 Discord 覆寫（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及繫結傳遞/路由）
  - `idleHours`：以小時為單位的非活動自動取消聚焦的 Discord 覆寫（`0` 表示停用）
  - `maxAgeHours`：以小時為單位的硬性最大年限的 Discord 覆寫（`0` 表示停用）
  - `spawnSessions`：`sessions_spawn({ thread: true })` 和 ACP 生成執行緒自動建立/綁定的開關（預設值：`true`）
  - `defaultSpawnContext`：執行緒綁定生成的原生次代理上下文（預設為 `"fork"`）
- 具有 `type: "acp"` 的頂層 `bindings[]` 項目可設定頻道和執行緒的持久 ACP 繫結（在 `match.peer.id` 中使用頻道/執行緒 ID）。欄位語義共用於 [ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。
- `channels.discord.ui.components.accentColor` 設定 Discord 元件 v2 容器的強調色。
- `channels.discord.agentComponents.ttlMs` 控制已發送的 Discord 元件回註冊的時間長短。預設值為 `1800000`（30 分鐘），最大值為 `86400000`（24 小時），且每個帳戶的覆寫位於 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 之下。較長的值可讓舊的按鈕/選取器/表單保持可用的時間更長，因此建議使用符合工作流程的最短 TTL。
- `channels.discord.voice` 啟用 Discord 語音頻道對話和可選的自動加入 + LLM + TTS 覆寫。僅限文字的 Discord 設定預設會關閉語音功能；請設定 `channels.discord.voice.enabled=true` 以啟用。
- `channels.discord.voice.model` 可選擇性地覆寫用於 Discord 語音頻道回應的 LLM 模型。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 會傳遞給 `@discordjs/voice` DAVE 選項（預設為 `true` 和 `24`）。
- `channels.discord.voice.connectTimeoutMs` 控制 `/vc join` 和自動加入嘗試的初始 `@discordjs/voice` Ready 等待時間（預設為 `30000`）。
- `channels.discord.voice.reconnectGraceMs` 控制斷開連接的語音會話在 OpenClaw 銷毀它之前可能需要多長時間才能進入重新連線信號（預設為 `15000`）。
- Discord 語音播放不會被其他用戶的說話開始事件中斷。為了避免回饋迴路，OpenClaw 在 TTS 播放時會忽略新的語音捕獲。
- 在重複解密失敗後，OpenClaw 還會嘗試通過離開並重新加入語音會話來進行語音接收恢復。
- `channels.discord.streaming` 是正準的流模式鍵。Discord 預設為 `streaming.mode: "progress"`，以便工具/工作進度顯示在一條編輯過的預覽訊息中；設定 `streaming.mode: "off"` 以停用它。舊版的 `streamMode` 和布林值 `streaming` 值仍為執行時別名；執行 `openclaw doctor --fix` 以重寫持久化配置。
- `channels.discord.autoPresence` 將執行時可用性映射到機器人狀態（healthy => online, degraded => idle, exhausted => dnd），並允許可選的狀態文字覆寫。
- `channels.discord.dangerouslyAllowNameMatching` 重新啟用可變名稱/標籤匹配（緊急玻璃兼容模式）。
- `channels.discord.execApprovals`：Discord 原生執行審批傳遞和審批者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在自動模式下，當可以從 `approvers` 或 `commands.ownerAllowFrom` 解析出審批者時，執行審批會啟動。
  - `approvers`：被允許批准執行請求的 Discord 用戶 ID。如果省略，則回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可選的代理 ID 允許清單。如果省略，則轉發所有代理的審批。
  - `sessionFilter`：可選的會話金鑰模式（子字串或正則表達式）。
  - `target`：將審核提示傳送至何處。`"dm"`（預設）傳送至審核者的直接訊息，`"channel"` 傳送至原始頻道，`"both"` 傳送至兩者。當目標包含 `"channel"` 時，按鈕僅可供已解析的審核者使用。
  - `cleanupAfterResolve`：當 `true` 時，在審核通過、拒絕或逾時後刪除審核直接訊息。

**反應通知模式：** `off`（無），`own`（機器人的訊息，預設），`all`（所有訊息），`allowlist`（來自 `guilds.<id>.users` 對所有訊息）。

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

- 服務帳戶 JSON：內聯（`serviceAccount`）或基於檔案（`serviceAccountFile`）。
- 也支援服務帳戶 SecretRef（`serviceAccountRef`）。
- 環境變數備援：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作為傳送目標。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新啟用可變電子郵件主體匹配（應急玻璃相容模式）。

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

- **Socket 模式**需要同時具備 `botToken` 和 `appToken`（針對預設帳戶環境變數備援的 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式**需要 `botToken` 加上 `signingSecret`（在根層級或每個帳戶）。
- `socketMode` 將 Slack SDK Socket 模式傳輸調校傳遞至公開的 Bolt 接收器 API。僅在調查 ping/pong 逾時或過時 websocket 行為時使用。`clientPingTimeout` 預設為 `15000`；僅在已設定時才會傳遞 `serverPingTimeout` 和 `pingPongLoggingEnabled`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- Slack 帳戶快照會顯示每個憑證的來源/狀態欄位，例如 `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示該帳戶是透過 SecretRef 配置的，但目前的指令/執行路徑無法解析秘密值。
- `configWrites: false` 會阻擋 Slack 發起的配置寫入。
- 當符合已配置的帳戶 ID 時，可選的 `channels.slack.defaultAccount` 會覆寫預設的帳戶選取。
- `channels.slack.streaming.mode` 是 Slack 串流模式的標準鍵。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生串流傳輸。舊版的 `streamMode`、布林值 `streaming` 和 `nativeStreaming` 值仍保留為執行時別名；請執行 `openclaw doctor --fix` 以重寫已保存的配置。
- `unfurlLinks` 和 `unfurlMedia` 會將 Slack 的 `chat.postMessage` 連結和媒體展開布林值傳遞給機器人回覆。`unfurlLinks` 預設為 `false`，因此除非啟用，否則傳出的機器人連結不會在行內展開；除非已配置，否則會省略 `unfurlMedia`。請在 `channels.slack.accounts.<accountId>` 設定任一值，以覆寫單一帳戶的頂層值。
- 請使用 `user:<id>` (DM) 或 `channel:<id>` 作為傳遞目標。

**反應通知模式：** `off`、`own` (預設)、`all`、`allowlist` (來自 `reactionAllowlist`)。

**執行緒會話隔離：** `thread.historyScope` 是每個執行緒 (預設) 或在頻道間共用。`thread.inheritParent` 會將父頻道文字記錄複製到新執行緒。

- Slack 原生串流加上 Slack 助理風格的「正在輸入...」執行緒狀態需要一個回覆執行緒目標。頂層 DM 預設會保持在執行緒之外，因此它們仍可透過 Slack 草稿發布和編輯預覽進行串流，而不是顯示執行緒風格的原生串流/狀態預覽。
- `typingReaction` 會在回覆執行時對傳入的 Slack 訊息新增暫時的回應，並在完成後將其移除。使用 Slack emoji 短代碼，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生審批客戶端傳遞和執行審批者授權。架構與 Discord 相同：`enabled` (`true`/`false`/`"auto"`)、`approvers` (Slack 使用者 ID)、`agentFilter`、`sessionFilter` 和 `target` (`"dm"`、`"channel"` 或 `"both"`)。當 Slack 外掛程式審批者解決時，外掛程式審批可以對源自 Slack 的請求使用此原生客戶端路徑；也可以透過 `approvals.plugin` 針對源自 Slack 的工作階段或 Slack 目標啟用 Slack 原生外掛程式審批傳遞。外掛程式審批使用來自 `allowFrom` 的 Slack 外掛程式審批者和預設路由，而非執行審批者。

| 動作群組   | 預設    | 備註                   |
| ---------- | ------- | ---------------------- |
| reactions  | enabled | React + 列出 reactions |
| messages   | enabled | 讀取/傳送/編輯/刪除    |
| pins       | enabled | 釘選/取消釘選/列出     |
| memberInfo | enabled | 成員資訊               |
| emojiList  | enabled | 自訂 emoji 列表        |

### Mattermost

在目前的 OpenClaw 版本中，Mattermost 作為捆綁的插件隨附。較舊或自訂的建構版本可以使用
`openclaw plugins install @openclaw/mattermost` 安裝目前的 npm 套件。
在固定版本之前，請檢查
[npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost)
以取得目前的 dist-tags。

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

聊天模式：`oncall` (在 @-提及時回覆，預設)、`onmessage` (每則訊息)、`onchar` (以觸發前綴開頭的訊息)。

啟用 Mattermost 原生命令時：

- `commands.callbackPath` 必須是路徑 (例如 `/api/channels/mattermost/command`)，而非完整的 URL。
- `commands.callbackUrl` 必須解析為 OpenClaw gateway 端點，且必須可從 Mattermost 伺服器存取。
- 原生斜線回調使用 Mattermost 在斜線命令註冊期間返回的每個命令 token 進行驗證。如果註冊失敗或沒有啟用任何命令，OpenClaw 將拒絕帶有 `Unauthorized: invalid command token.` 的回調。
- 對於私有/tailnet/內部回調主機，Mattermost 可能需要 `ServiceSettings.AllowedUntrustedInternalConnections` 來包含回調主機/網域。
  使用主機/網域值，而不是完整的 URL。
- `channels.mattermost.configWrites`：允許或拒絕由 Mattermost 發起的配置寫入。
- `channels.mattermost.requireMention`：在頻道中回覆之前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：每頻道提及閘門覆蓋（`"*"` 用於預設值）。
- 可選的 `channels.mattermost.defaultAccount` 當符合配置的帳戶 ID 時，會覆蓋預設的帳戶選擇。

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

**反應通知模式：** `off`、`own`（預設）、`all`、`allowlist`（來自 `reactionAllowlist`）。

- `channels.signal.account`：將頻道啟動綁定到特定的 Signal 帳戶身份。
- `channels.signal.configWrites`：允許或拒絕由 Signal 發起的配置寫入。
- 可選的 `channels.signal.defaultAccount` 當符合配置的帳戶 ID 時，會覆蓋預設的帳戶選擇。

### iMessage

OpenClaw 會生成 `imsg rpc`（透過 stdio 的 JSON-RPC）。不需要守護程序或連接埠。當主機可以授予訊息資料庫和自動化權限時，這是新的 OpenClaw iMessage 設定的首選路徑。

BlueBubbles 支援已移除。`channels.bluebubbles` 不是目前 OpenClaw 支援的執行時期設定介面。請將舊版設定遷移至 `channels.imessage`；簡易版本請使用 [BlueBubbles removal and the imsg iMessage path](/zh-Hant/announcements/bluebubbles-imessage)，完整對照表請使用 [Coming from BlueBubbles](/zh-Hant/channels/imessage-from-bluebubbles)。

如果 Gateway 沒有在登入的 Messages Mac 上執行，請保留 `channels.imessage.enabled=true` 並將 `channels.imessage.cliPath` 設定為該 Mac 上執行 `imsg "$@"` 的 SSH 包裝程式。預設的本地 `imsg` 路徑僅適用於 macOS。

在依賴 SSH 包裝器進行生產環境發送之前，請透過該確切的包裝器驗證出站 `imsg send`。某些 macOS TCC 狀態會將 Messages Automation 指派給 `/usr/libexec/sshd-keygen-wrapper`，這可能導致讀取和探測正常運作，但發送因 AppleEvents `-1743` 而失敗；請參閱 [SSH wrapper sends fail with AppleEvents -1743](/zh-Hant/channels/imessage#ssh-wrapper-sends-fail-with-appleevents-1743)。

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

- 可選的 `channels.imessage.defaultAccount` 會在符合已設定的帳戶 ID 時覆寫預設的帳戶選擇。

- 需要對訊息資料庫 (Messages DB) 的完全磁碟存取權。
- 優先使用 `chat_id:<id>` 目標。使用 `imsg chats --limit 20` 來列出聊天。
- `cliPath` 可以指向 SSH 包裝器；為了透過 SCP 抓取附件，請設定 `remoteHost` (`host` 或 `user@host`)。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制傳入附件的路徑 (預設：`/Users/*/Library/Messages/Attachments`)。
- SCP 使用嚴格的主機金鑰檢查，因此請確保中繼主機金鑰已存在於 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允許或拒絕由 iMessage 發起的設定寫入。
- `channels.imessage.actions.*`：啟用私人 API 操作，這些操作也受到 `imsg status` / `openclaw channels status --probe` 的閘道控制。
- `channels.imessage.includeAttachments` 預設為關閉；在預期代理回合中會有傳入媒體之前，請將其設為 `true`。
- `channels.imessage.catchup.enabled`：選擇重播在 Gateway 停機時到達的傳入訊息。
- `channels.imessage.groups`：群組註冊表及各群組設定。使用 `groupPolicy: "allowlist"` 時，請設定明確的 `chat_id` 金鑰或 `"*"` 萬用字元條目，以便群組訊息能通過註冊表閘道。
- 頂層 `bindings[]` 條目搭配 `type: "acp"` 可將 iMessage 對話綁定到持續的 ACP 會話。在 `match.peer.id` 中使用標準化的處理程序或明確的聊天目標 (`chat_id:*`、`chat_guid:*`、`chat_identifier:*`)。共用欄位語義：[ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。

<Accordion title="iMessage SSH 包裝器範例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 由外掛支援，並在 `channels.matrix` 下進行設定。

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

- Token 驗證使用 `accessToken`；密碼驗證使用 `userId` + `password`。
- `channels.matrix.proxy` 將 Matrix HTTP 流量透過指定的 HTTP(S) 代理進行路由。命名帳戶可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫此設定。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允許使用私有的/內部 homeserver。`proxy` 和此網路加入選項是獨立的控制項。
- `channels.matrix.defaultAccount` 在多帳戶設定中選擇首選帳戶。
- `channels.matrix.autoJoin` 預設為 `off`，因此被邀請的房間和新的 DM 式邀請將被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 設定 `autoJoin: "allowlist"`。
- `channels.matrix.execApprovals`：Matrix 原生的 exec 執行核准傳遞與核准者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在自動模式下，當可以從 `approvers` 或 `commands.ownerAllowFrom` 解析出核准者時，exec 執行核准會啟動。
  - `approvers`：獲准核准 exec 執行請求的 Matrix 使用者 ID（例如 `@owner:example.org`）。
  - `agentFilter`：選用的 Agent ID 允許清單。若要轉發所有 Agent 的核准，請省略。
  - `sessionFilter`：選用的 session 金鑰模式（子字串或正規表示式）。
  - `target`：傳送核准提示的位置。`"dm"`（預設）、`"channel"`（原始房間）或 `"both"`。
  - 每個帳戶的覆寫：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix DM 如何分組到 session 中：`per-user`（預設）依路由對等方共享，而 `per-room` 則隔離每個 DM 房間。
- Matrix 狀態探測即時目錄查詢使用與執行時流量相同的代理原則。
- 完整的 Matrix 設定、目標規則和設定範例記錄在 [Matrix](/zh-Hant/channels/matrix) 中。

### Microsoft Teams

Microsoft Teams 是由插件支援的，並且在 `channels.msteams` 下進行配置。

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

- 此處涵蓋的核心金鑰路徑：`channels.msteams`、`channels.msteams.configWrites`。
- 完整的 Teams 配置（憑證、Webhook、DM/群組原則、每個團隊/頻道的覆寫）記載於 [Microsoft Teams](/zh-Hant/channels/msteams)。

### IRC

IRC 是由插件支援的，並且在 `channels.irc` 下進行配置。

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

- 此處涵蓋的核心金鑰路徑：`channels.irc`、`channels.irc.dmPolicy`、`channels.irc.configWrites`、`channels.irc.nickserv.*`。
- 當符合已配置的帳戶 ID 時，可選的 `channels.irc.defaultAccount` 會覆寫預設的帳戶選擇。
- 完整的 IRC 頻道配置（主機/連接埠/TLS/頻道/允許清單/提及閘道）記載於 [IRC](/zh-Hant/channels/irc)。

### 多重帳戶（所有頻道）

每個頻道執行多個帳戶（每個都有自己的 `accountId`）：

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

- 當省略 `accountId` 時，會使用 `default`（CLI + 路由）。
- 環境變數僅適用於 **預設** 帳戶。
- 基礎頻道設定適用於所有帳戶，除非針對特定帳戶進行覆寫。
- 使用 `bindings[].match.accountId` 將每個帳戶路由到不同的代理程式。
- 如果您仍處於單一帳戶的頂層頻道配置時，透過 `openclaw channels add`（或頻道上架）新增非預設帳戶，OpenClaw 會先將帳戶範圍的頂層單一帳戶值提升至頻道帳戶對應中，以便原始帳戶繼續運作。大多數頻道會將這些值移至 `channels.<channel>.accounts.default`；Matrix 可以改為保留現有的相符命名/預設目標。
- 現有的僅限頻道綁定（沒有 `accountId`）會繼續符合預設帳戶；帳戶範圍的綁定保持可選。
- `openclaw doctor --fix` 也會透過將帳戶範圍的頂層單一帳戶值移至為該頻道選擇的提升帳戶，來修復混合形狀。大多數頻道使用 `accounts.default`；Matrix 可以改為保留現有的相符命名/預設目標。

### 其他插件頻道

許多外掛通道設定為 `channels.<id>` 並在其專屬的通道頁面中記錄（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整的通道索引：[Channels](/zh-Hant/channels)。

### 群組聊天提及閘門

群組訊息預設為**需要提及**（metadata mention 或安全的正則表達式模式）。適用於 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群組聊天。

可見回覆是單獨控制的。一般群組、頻道和內部 WebChat 直接請求預設為自動最終傳遞：最終的助理文字透過舊版可見回覆路徑發布。當可見輸出應僅在代理呼叫 `message(action=send)` 後發布時，請選用 `messages.visibleReplies: "message_tool"` 或 `messages.groupChat.visibleReplies: "message_tool"`。如果模型在啟用的僅工具模式下返回最終文字而未呼叫訊息工具，該最終文字將保持私密，且閘道詳細記錄會記錄被隱藏的 payload 中繼資料。

僅工具的可見回覆需要能可靠呼叫工具的模型/執行時，建議用於最新世代模型（如 GPT 5.5）的共享環境房間。某些較弱的模型可以回答最終文字，但無法理解來源可見輸出必須使用 `message(action=send)` 發送。對於這些模型，請使用 `"automatic"`，讓最終助理輪次成為可見回覆路徑。如果工作階段記錄顯示助理文字帶有 `didSendViaMessagingTool: false`，表示模型產生了私密的最終文字而非呼叫訊息工具。請切換該通道為更強的工具呼叫模型，檢查閘道詳細記錄中的被隱藏 payload 摘要，或設定 `messages.groupChat.visibleReplies: "automatic"` 以對每個群組/頻道請求使用可見的最終回覆。

如果在啟用的工具政策下無法使用訊息工具，OpenClaw 將回退到自動可見回覆，而不是靜默隱藏回應。`openclaw doctor` 會針對此不符情況發出警告。

此規則適用於正常的代理程式最終文字。外掛程式擁有的對話綁定使用擁有外掛程式傳回的回覆作為已宣稱的綁定執行緒轉次的可見回應；該外掛程式不需要為那些綁定回覆呼叫 `message(action=send)`。

**故障排除：群組 @提及觸發輸入然後沈默（無錯誤）**

症狀：群組/頻道 @提及顯示正在輸入指示器，且閘道日誌回報 `dispatch complete (queuedFinal=false, replies=0)`，但沒有訊息傳送至聊天室。傳送給同一個代理程式的私訊回覆正常。

原因：群組/頻道可見回覆模式解析為 `"message_tool"`，因此 OpenClaw 會執行該轉次，但會抑制最終助理文字，除非代理程式呼叫 `message(action=send)`。在此模式下沒有 `NO_REPLY` 合約；沒有訊息工具呼叫代表沒有來源回覆。沒有錯誤是因為抑制是已配置的行為。正常的群組和頻道轉次預設為 `"automatic"`，因此此症狀僅在 `messages.groupChat.visibleReplies`（或全域 `messages.visibleReplies`）被明確設定為 `"message_tool"` 時才會出現。`defaultVisibleReplies` 掛載在此不適用 — 群組/頻道解析器會忽略它；它僅影響直接/來源聊天（Codex 掛載會以該方式抑制直接聊天最終結果）。

修復方式：選擇一個更強的工具呼叫模型，移除明確的 `"message_tool"` 覆蓋以還原至 `"automatic"` 預設值，或設定 `messages.groupChat.visibleReplies: "automatic"` 以強制每個群組/頻道請求都顯示可見回覆。閘道會在檔案儲存後熱重新載入 `messages` 設定；僅當部署中停用檔案監看或設定重新載入時，才需要重新啟動閘道。

**提及類型：**

- **中繼資料提及**：原生平台 @提及。在 WhatsApp 自我聊天模式中會被忽略。
- **文字模式**：`agents.list[].groupChat.mentionPatterns` 中的安全 regex 模式。無效的模式和不安全的巢狀重複會被忽略。
- 僅當可進行偵測時（原生提及或至少一個模式），才會強制執行提及閘道。

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

`messages.groupChat.historyLimit` 設定全域預設值。頻道可以使用 `channels.<channel>.historyLimit` 覆寫（或每個帳號）。設定 `0` 以停用。

`messages.groupChat.unmentionedInbound: "room_event"` 將未提及的常開群組/頻道訊息作為安靜房間語境提交到支援的頻道。被提及的訊息、指令和直接訊息仍保持為使用者請求。有關完整的 Discord、Slack 和 Telegram 範例，請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events)。

`messages.visibleReplies` 是全域來源事件預設值；`messages.groupChat.visibleReplies` 會覆寫群組/頻道來源事件的設定。當未設定 `messages.visibleReplies` 時，直接/來源聊天使用選定的執行時期或 harness 預設值，但內部 WebChat 直接輪次會使用自動最終交付以達成 Pi/Codex 提示詞同等性。設定 `messages.visibleReplies: "message_tool"` 以刻意要求 `message(action=send)` 進行可見輸出。頻道允許清單和提及閘控仍決定是否處理事件。

#### DM 歷史記錄限制

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

解析順序：每個 DM 覆寫 → 提供者預設值 → 無限制（全部保留）。

支援：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自我聊天模式

將您自己的號碼包含在 `allowFrom` 中以啟用自我聊天模式（忽略原生 @-提及，僅回應文字模式）：

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

### 指令（聊天指令處理）

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

<Accordion title="Command details">

- 此區塊用於配置命令介面。若要查看目前的內建 + 附綁命令目錄，請參閱 [Slash Commands](/zh-Hant/tools/slash-commands)。
- 此頁面是 **配置鍵參考**，而非完整的命令目錄。通道/外掛擁有的命令，例如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、device-pair `/pair`、memory `/dreaming`、phone-control `/phone` 和 Talk `/voice`，皆記錄在其各自的通道/外掛頁面以及 [Slash Commands](/zh-Hant/tools/slash-commands) 中。
- 文字命令必須是以 `/` 開頭的 **獨立** 訊息。
- `native: "auto"` 為 Discord/Telegram 開啟原生命令，Slack 則保持關閉。
- `nativeSkills: "auto"` 為 Discord/Telegram 開啟原生技能命令，Slack 則保持關閉。
- 覆寫每個通道：`channels.discord.commands.native`（布林值或 `"auto"`）。對於 Discord，`false` 會在啟動期間跳過原生命令註冊和清理。
- 使用 `channels.<provider>.commands.nativeSkills` 覆寫每個通道的原生技能註冊。
- `channels.telegram.customCommands` 新增額外的 Telegram 機器人選單項目。
- `bash: true` 為主機 Shell 啟用 `! <cmd>`。需要 `tools.elevated.enabled` 且發送者位於 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 啟用 `/config`（讀取/寫入 `openclaw.json`）。對於 gateway `chat.send` 用戶端，持續性 `/config set|unset` 寫入也需要 `operator.admin`；唯讀 `/config show` 對一般寫入範圍的操作員用戶端保持可用。
- `mcp: true` 為 `mcp.servers` 下的 OpenClaw 管理的 MCP 伺服器配置啟用 `/mcp`。
- `plugins: true` 啟用 `/plugins` 以進行外掛探索、安裝和啟用/停用控制。
- `channels.<provider>.configWrites` 閘道每個通道的配置變更（預設：true）。
- 對於多帳戶通道，`channels.<provider>.accounts.<id>.configWrites` 也會閘道針對該帳戶的寫入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 停用 `/restart` 和 gateway 重新啟動工具操作。預設：`true`。
- `ownerAllowFrom` 是僅限擁有者命令和擁有者閘道通道操作的明確擁有者允許清單。它與 `allowFrom` 分開。
- `ownerDisplay: "hash"` 雜湊系統提示中的擁有者 ID。設定 `ownerDisplaySecret` 以控制雜湊。
- `allowFrom` 是每個提供者專屬的。設定時，它是 **唯一** 的授權來源（通道允許清單/配對和 `useAccessGroups` 會被忽略）。
- 當未設定 `allowFrom` 時，`useAccessGroups: false` 允許命令繞過存取群組原則。
- 命令文件對應：
  - 內建 + 附綁目錄：[Slash Commands](/zh-Hant/tools/slash-commands)
  - 通道特定命令介面：[Channels](/zh-Hant/channels)
  - QQ Bot 命令：[QQ Bot](/zh-Hant/channels/qqbot)
  - 配對命令：[Pairing](/zh-Hant/channels/pairing)
  - LINE 卡片命令：[LINE](/zh-Hant/channels/line)
  - 記憶夢境：[Dreaming](/zh-Hant/concepts/dreaming)

</Accordion>

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 頂層金鑰
- [Configuration — agents](/zh-Hant/gateway/config-agents)
- [Channels overview](/zh-Hant/channels)
