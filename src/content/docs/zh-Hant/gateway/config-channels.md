---
summary: "頻道設定：存取控制、配對，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每個頻道金鑰"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "設定 — 頻道"
---

`channels.*` 下的每個頻道設定金鑰。涵蓋 DM 與群組存取、多帳號設定、提及閘控，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他內建頻道外掛的每個頻道金鑰。

如需了解代理、工具、Gateway 運行時及其他頂級金鑰，請參閱
[配置參考](/zh-Hant/gateway/configuration-reference)。

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
- 包含 `type: "acp"` 的頂層 `bindings[]` 項目可配置論壇主題的持久化 ACP 綁定（在 `match.peer.id` 中使用標準 `chatId:topic:topicId`）。欄位語義說明請參閱 [ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。
- Telegram 串流預覽使用 `sendMessage` + `editMessageText`（適用於直接與群組聊天）。
- 重試政策：請參閱 [重試政策](/zh-Hant/concepts/retry)。

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
- 支援機器人撰寫傳入訊息的頻道可以使用共用的 [機器人迴圈保護](/zh-Hant/channels/bot-loop-protection)。設定 `channels.defaults.botLoopProtection` 以作為基準配對預算，然後僅在特定介面需要不同限制時針對頻道或帳戶進行覆寫。
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
- 包含 `type: "acp"` 的頂層 `bindings[]` 項目可配置頻道和執行緒的持久化 ACP 綁定（在 `match.peer.id` 中使用 channel/thread id）。欄位語義說明請參閱 [ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。
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

Mattermost 在目前的 OpenClaw 版本中作為捆綁外掛提供。舊版或
自訂建置版本可以透過
`openclaw plugins install @openclaw/mattermost` 安裝目前的 npm 套件。
在鎖定版本之前，請檢查
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

BlueBubbles 支援已移除。`channels.bluebubbles` 在目前的 OpenClaw 上不是受支援的運行時配置介面。請將舊配置遷移至 `channels.imessage`；簡短版本請使用 [BlueBubbles 移除與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage)，完整對照表請參閱 [從 BlueBubbles 遷移](/zh-Hant/channels/imessage-from-bluebubbles)。

如果 Gateway 沒有在登入的 Messages Mac 上執行，請保留 `channels.imessage.enabled=true` 並將 `channels.imessage.cliPath` 設定為該 Mac 上執行 `imsg "$@"` 的 SSH 包裝程式。預設的本地 `imsg` 路徑僅適用於 macOS。

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

- 需要對 Messages 資料庫的完整磁碟存取權。
- 偏好使用 `chat_id:<id>` 目標。使用 `imsg chats --limit 20` 來列出聊天。
- `cliPath` 可以指向 SSH 包裝程式；設定 `remoteHost` (`host` 或 `user@host`) 以進行 SCP 附件擷取。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制傳入附件路徑 (預設：`/Users/*/Library/Messages/Attachments`)。
- SCP 使用嚴格的主機金鑰檢查，因此請確保中繼主機金鑰已存在於 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允許或拒絕由 iMessage 發起的設定寫入。
- `channels.imessage.actions.*`：啟用同樣受 `imsg status` / `openclaw channels status --probe` 限制的私人 API 動作。
- `channels.imessage.includeAttachments` 預設為關閉；在預期 agent 輪次中有傳入媒體之前，將其設定為 `true`。
- `channels.imessage.catchup.enabled`：選擇重新播放 Gateway 停機期間送達的傳入訊息。
- `channels.imessage.groups`：群組註冊表及各群組設定。使用 `groupPolicy: "allowlist"`，設定明確的 `chat_id` 金鑰或 `"*"` 萬用字元條目，以便群組訊息能通過註冊表閘門。
- 包含 `type: "acp"` 的頂層 `bindings[]` 項目可將 iMessage 對話綁定至持久化 ACP 工作階段。請在 `match.peer.id` 中使用標準化的 handle 或明確的聊天目標 (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`)。共用欄位語義說明：[ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。

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

- Token 認證使用 `accessToken`；密碼認證使用 `userId` + `password`。
- `channels.matrix.proxy` 會將 Matrix HTTP 流量透過指定的 HTTP(S) 代理伺服器進行路由。命名帳號可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫此設定。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允許私人/內部 homeserver。`proxy` 與此網路選用設定是獨立的控制項。
- `channels.matrix.defaultAccount` 在多帳號設定中選擇首選帳號。
- `channels.matrix.autoJoin` 預設為 `off`，因此被邀請的房間和新的 DM 式邀請會被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 設定 `autoJoin: "allowlist"` 為止。
- `channels.matrix.execApprovals`：Matrix 原生的執行核准傳送與核准者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在自動模式下，當可以從 `approvers` 或 `commands.ownerAllowFrom` 解析出核准者時，執行核准會啟動。
  - `approvers`：獲准核准執行請求的 Matrix 使用者 ID（例如 `@owner:example.org`）。
  - `agentFilter`：可選的代理程式 ID 允許清單。若省略，則轉發所有代理程式的核准。
  - `sessionFilter`：可選的 session 金鑰模式（子字串或正則表達式）。
  - `target`：將核准提示傳送至何處。`"dm"`（預設）、`"channel"`（原始房間）或 `"both"`。
  - 每個帳號的覆寫：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制如何將 Matrix DM 群組為 session：`per-user`（預設）依路由對等方共享，而 `per-room` 則隔離每個 DM 房間。
- Matrix 狀態探測和即時目錄查詢使用與運行時流量相同的代理策略。
- 完整的 Matrix 配置、定位規則和設定範例記錄於 [Matrix](/zh-Hant/channels/matrix)。

### Microsoft Teams

Microsoft Teams 由外掛支援，並在 `channels.msteams` 下進行配置。

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
- 完整的 Teams 配置（憑證、webhook、DM/群組原則、每團隊/每頻道覆寫）記錄於 [Microsoft Teams](/zh-Hant/channels/msteams)。

### IRC

IRC 由外掛支援，並在 `channels.irc` 下進行配置。

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
- 可選的 `channels.irc.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設的帳戶選擇。
- 完整的 IRC 頻道配置（主機/連接埠/TLS/頻道/允許清單/提及閘門）記錄於 [IRC](/zh-Hant/channels/irc)。

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

- 當省略 `accountId` 時會使用 `default`（CLI + 路由）。
- 環境變數僅適用於 **預設** 帳戶。
- 基礎頻道設定適用於所有帳戶，除非針對個別帳戶進行覆寫。
- 使用 `bindings[].match.accountId` 將每個帳戶路由至不同的代理程式。
- 如果您仍在使用單一帳戶頂層頻道配置時透過 `openclaw channels add`（或頻道上線）新增非預設帳戶，OpenClaw 會先將帳戶範圍的頂層單一帳戶值提升至頻道帳戶對應表中，以便原始帳戶繼續運作。大多數頻道會將它們移至 `channels.<channel>.accounts.default`；Matrix 則可以改為保留現有的相符命名/預設目標。
- 現有的僅限頻道綁定（沒有 `accountId`）會持續符合預設帳戶；帳戶範圍的綁定保持可選。
- `openclaw doctor --fix` 也會透過將帳號範圍的頂層單一帳號值移入為該頻道選取的升級帳號來修復混合形狀。大多數頻道使用 `accounts.default`；Matrix 則可以保留現有的相符命名/預設目標。

### 其他外掛頻道

許多外掛程式頻道配置為 `channels.<id>` 並記錄在其專用頻道頁面中（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整的頻道索引：[Channels](/zh-Hant/channels)。

### 群組提及閘控

群組訊息預設為 **要求提及**（metadata mention 或安全的 regex 模式）。適用於 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群組聊天。

可見回覆是單獨控制的。一般的群組、頻道和內部 WebChat 直接請求預設為自動最終傳送：最終助理文字透過舊版可見回覆路徑發布。當可見輸出應僅在代理程式呼叫 `message(action=send)` 後發布時，請選擇 `messages.visibleReplies: "message_tool"` 或 `messages.groupChat.visibleReplies: "message_tool"`。如果在已選擇的僅工具模式下，模型在未呼叫訊息工具的情況下傳回最終文字，該最終文字將保持私密，並且 gateway 詳細日誌會記錄被隱藏的負載元資料。

僅工具可見回覆需要能可靠呼叫工具的模型/執行時，並推薦用於最新世代模型（如 GPT 5.5）的共享環境室。如果會話日誌顯示帶有 `didSendViaMessagingTool: false` 的助理文字，則模型產生了私有的最終文字，而不是呼叫訊息工具。請切換至該頻道更強大的工具呼叫模型，檢查 gateway 詳細日誌中的被隱藏負載摘要，或設定 `messages.groupChat.visibleReplies: "automatic"` 以對每個群組/頻道請求使用可見的最終回覆。

如果訊息工具在現行工具原則下無法使用，OpenClaw 將退回到自動可見回覆，而不是靜靜地隱藏回應。`openclaw doctor` 會警告這種不匹配。

**疑難排解：群組 @mention 觸發輸入後隨即沈默（無錯誤）**

症狀：群組/頻道 @提及顯示輸入指示器，且 gateway 日誌報告 `dispatch complete (queuedFinal=false, replies=0)`，但沒有訊息發送至聊天室。傳送給同一代理程式的私訊回覆正常。

原因：群組/頻道的可見回覆模式解析為 `"message_tool"`，因此 OpenClaw 會執行該輪次，但會隱藏最終的助理文字，除非代理程式呼叫 `message(action=send)`。沒有錯誤是因為隱藏是設定的行為。一般的群組和頻道輪次預設為 `"automatic"`，所以這個症狀只有在 `messages.groupChat.visibleReplies`（或全域 `messages.visibleReplies`）被明確設定為 `"message_tool"` 時才會出現。`defaultVisibleReplies` 套件在此不適用 — 群組/頻道解析器會忽略它；它只影響直接/來源聊天（Codex 套件以那種方式隱藏直接聊天的最終訊息）。

解決方法：選擇一個更強的工具呼叫模型、移除明確的 `"message_tool"` 覆蓋以回復到 `"automatic"` 預設值，或者設定 `messages.groupChat.visibleReplies: "automatic"` 以強制每個群組/頻道請求都顯示回覆。網關會在檔案儲存後熱重新載入 `messages` 設定；只有在部署中停用檔案監看或設定重新載入時，才需要重新啟動網關。

**提及類型：**

- **中繼資料提及**：原生平台 @-提及。在 WhatsApp 自我聊天模式中會被忽略。
- **文字模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正規表達式模式。無效的模式和不安全的巢狀重複會被忽略。
- 只有在可以進行偵測時（原生提及或至少一個模式），才會執行提及閘道控制。

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

`messages.groupChat.historyLimit` 設定全域預設值。頻道可以使用 `channels.<channel>.historyLimit` 覆蓋（或每個帳戶）。設定 `0` 以停用。

`messages.groupChat.unmentionedInbound: "room_event"` 將未提及的常時開啟群組/頻道訊息作為安靜的房間上下文提交到支援的頻道。提及的訊息、指令和直接訊息仍會維持為使用者請求。完整的 Discord、Slack 和 Telegram 範例，請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events)。

`messages.visibleReplies` 是全域來源事件預設值；`messages.groupChat.visibleReplies` 會針對群組/頻道來源事件覆寫它。當 `messages.visibleReplies` 未設定時，直接/來源聊天會使用選定的執行階段或機具預設值，但內部 WebChat 直接回合會使用自動最終傳遞，以達成 Pi/Codex 提示的一致性。設定 `messages.visibleReplies: "message_tool"` 以刻意要求 `message(action=send)` 來顯示輸出。頻道允許清單和提及閘門仍會決定是否處理事件。

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

解析順序：各 DM 覆寫 → 提供者預設 → 無限制（全部保留）。

支援：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自聊模式

在 `allowFrom` 中包含您自己的號碼以啟用自聊模式（忽略原生 @ 提及，僅回應文字模式）：

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

<Accordion title="指令詳情">

- 此區塊配置指令介面。有關當前的內建 + 捆綁指令目錄，請參閱 [Slash Commands](/zh-Hant/tools/slash-commands)。
- 此頁面是 **config-key reference**（配置鍵參考），而非完整的指令目錄。通道/外掛擁有的指令，例如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、device-pair `/pair`、memory `/dreaming`、phone-control `/phone` 和 Talk `/voice`，記錄在其各自的通道/外掛頁面以及 [Slash Commands](/zh-Hant/tools/slash-commands) 中。
- 文字指令必須是以前導 `/` 開頭的 **獨立** 訊息。
- `native: "auto"` 會為 Discord/Telegram 啟用原生指令，並關閉 Slack 的此功能。
- `nativeSkills: "auto"` 會為 Discord/Telegram 啟用原生技能指令，並關閉 Slack 的此功能。
- 逐個通道覆寫：`channels.discord.commands.native`（布林值或 `"auto"`）。對於 Discord，`false` 會跳過啟動期間的原生指令註冊和清理。
- 使用 `channels.<provider>.commands.nativeSkills` 逐個通道覆寫原生技能註冊。
- `channels.telegram.customCommands` 會新增額外的 Telegram 機器人選單項目。
- `bash: true` 啟用主機 Shell 的 `! <cmd>`。需要 `tools.elevated.enabled` 且發送者在 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 啟用 `/config`（讀取/寫入 `openclaw.json`）。對於 gateway `chat.send` 客戶端，持久 `/config set|unset` 寫入還需要 `operator.admin`；唯讀 `/config show` 對普通寫入範圍的操作員客戶端仍然可用。
- `mcp: true` 啟用 `mcp.servers` 下 OpenClaw 管理的 MCP 伺服器配置的 `/mcp`。
- `plugins: true` 啟用外掛發現、安裝和啟用/停用控制的 `/plugins`。
- `channels.<provider>.configWrites` 限制每個通道的配置變更（預設值：true）。
- 對於多帳戶通道，`channels.<provider>.accounts.<id>.configWrites` 還會限制針對該帳戶的寫入（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 停用 `/restart` 和 gateway 重新啟動工具動作。預設值：`true`。
- `ownerAllowFrom` 是僅限擁有者指令和擁有者限制通道動作的明確擁有者允許清單。它與 `allowFrom` 是分開的。
- `ownerDisplay: "hash"` 對系統提示中的擁有者 ID 進行雜湊處理。設定 `ownerDisplaySecret` 以控制雜湊處理。
- `allowFrom` 是每個提供者特有的。設定後，它是 **唯一** 的授權來源（通道允許清單/配對和 `useAccessGroups` 將被忽略）。
- 當未設定 `allowFrom` 時，`useAccessGroups: false` 允許指令繞過存取群組原則。
- 指令文件地圖：
  - 內建 + 捆綁目錄：[Slash Commands](/zh-Hant/tools/slash-commands)
  - 特定通道的指令介面：[Channels](/zh-Hant/channels)
  - QQ Bot 指令：[QQ Bot](/zh-Hant/channels/qqbot)
  - 配對指令：[Pairing](/zh-Hant/channels/pairing)
  - LINE 卡片指令：[LINE](/zh-Hant/channels/line)
  - 記憶夢境：[Dreaming](/zh-Hant/concepts/dreaming)

</Accordion>

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 頂層金鑰
- [Configuration — agents](/zh-Hant/gateway/config-agents)
- [Channels overview](/zh-Hant/channels)
