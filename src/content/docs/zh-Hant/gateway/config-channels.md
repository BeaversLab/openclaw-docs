---
summary: "頻道設定：存取控制、配對，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每個頻道金鑰"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "設定 — 頻道"
---

`channels.*` 下的每個頻道設定金鑰。涵蓋 DM 與群組存取、多帳號設定、提及閘控，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他內建頻道外掛的每個頻道金鑰。

如需代理、工具、gateway runtime 和其他頂層鍵的相關資訊，請參閱
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
- 具有 `type: "acp"` 的頂層 `bindings[]` 項目會為論壇主題設定持久的 ACP 繫結（在 `match.peer.id` 中使用標準的 `chatId:topic:topicId`）。欄位語義在 [ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings) 中共用。
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
- 支援機器人撰寫入站訊息的頻道可以使用共用的 [bot loop protection](/zh-Hant/channels/bot-loop-protection)。設定 `channels.defaults.botLoopProtection` 作為基準配對預算，然後僅在單一介面需要不同限制時覆寫頻道或帳戶設定。
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
- 頂層 `bindings[]` 項目搭配 `type: "acp"` 可為頻道和執行緒設定持久的 ACP 綁定（在 `match.peer.id` 中使用頻道/執行緒 ID）。欄位語義共用於 [ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。
- `channels.discord.ui.components.accentColor` 設定 Discord 元件 v2 容器的強調色。
- `channels.discord.voice` 啟用 Discord 語音頻道對話以及可選的自動加入 + LLM + TTS 覆寫。純文字 Discord 設定預設關閉語音功能；設定 `channels.discord.voice.enabled=true` 以啟用。
- `channels.discord.voice.model` 可選擇性覆寫用於 Discord 語音頻道回應的 LLM 模型。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` DAVE 選項（預設值分別為 `true` 和 `24`）。
- `channels.discord.voice.connectTimeoutMs` 控制 `@discordjs/voice` Ready 的初始等待時間，用於 `/vc join` 和自動加入嘗試（預設值為 `30000`）。
- `channels.discord.voice.reconnectGraceMs` 控制斷線的語音工作階段在 OpenClaw 銷毀它之前，可以花多久時間進入重新連線信號（預設值為 `15000`）。
- Discord 語音播放不會因其他使用者的開始說話事件而中斷。為了避免回授迴路，OpenClaw 在播放 TTS 時會忽略新的語音擷取。
- OpenClaw 還會在多次解密失敗後，透過離開/重新加入語音工作階段來嘗試語音接收恢復。
- `channels.discord.streaming` 是標準的串流模式金鑰。Discord 預設為 `streaming.mode: "progress"`，以便工具/工作進度顯示在一條經編輯的預覽訊息中；設定 `streaming.mode: "off"` 即可停用。舊版 `streamMode` 和布林值 `streaming` 仍為執行時別名；請執行 `openclaw doctor --fix` 以重寫已持久化的設定。
- `channels.discord.autoPresence` 將執行時可用性對應至機器人狀態（healthy => online、degraded => idle、exhausted => dnd），並允許選擇性的狀態文字覆寫。
- `channels.discord.dangerouslyAllowNameMatching` 重新啟用可變名稱/標籤匹配（緊急相容模式）。
- `channels.discord.execApprovals`：Discord 原生的 exec 審核傳遞與審核者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在 auto 模式下，當可從 `approvers` 或 `commands.ownerAllowFrom` 解析出審核者時，exec 審核會啟用。
  - `approvers`：獲准批准 exec 請求的 Discord 使用者 ID。若省略則退回至 `commands.ownerAllowFrom`。
  - `agentFilter`：選用性的代理程式 ID 白名單。省略以轉發所有代理程式的審核。
  - `sessionFilter`：選用性的 session 金鑰模式（子字串或 regex）。
  - `target`：審核提示的傳送位置。`"dm"`（預設）傳送至審核者 DM，`"channel"` 傳送至原始頻道，`"both"` 傳送至兩者。當目標包含 `"channel"` 時，按鈕僅可供已解析的審核者使用。
  - `cleanupAfterResolve`：當 `true` 時，會在批准、拒絕或逾時後刪除審核 DM。

**反應通知模式：** `off`（無）、`own`（機器人的訊息，預設）、`all`（所有訊息）、`allowlist`（來自 `guilds.<id>.users`，限所有訊息）。

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

- 服務帳戶 JSON：內嵌 (`serviceAccount`) 或基於檔案 (`serviceAccountFile`)。
- 也支援服務帳戶 SecretRef (`serviceAccountRef`)。
- 環境變數備援：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作為傳送目標。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新啟用可變動電子郵件主體匹配（緊急相容模式）。

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

- **Socket 模式** 需要同時具備 `botToken` 和 `appToken`（預設帳戶環境變數備援為 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式** 需要 `botToken` 加上 `signingSecret`（在根層級或每個帳戶設定）。
- `socketMode` 將 Slack SDK Socket 模式傳輸微調設定傳遞給公開的 Bolt 接收器 API。僅在調查 ping/pong 逾時或過時的 WebSocket 行為時使用。`clientPingTimeout` 預設為 `15000`；僅在設定時才會傳遞 `serverPingTimeout` 和 `pingPongLoggingEnabled`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- Slack 帳戶快照會公開每個憑證的來源/狀態欄位，例如 `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示該帳戶是透過 SecretRef 設定的，但目前的指令/執行路徑無法解析秘密值。
- `configWrites: false` 會封鎖由 Slack 發起的設定寫入。
- 選用的 `channels.slack.defaultAccount` 會在符合已設定的帳戶 ID 時覆寫預設的帳戶選擇。
- `channels.slack.streaming.mode` 是標準的 Slack 串流模式金鑰。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生串流傳輸。舊版的 `streamMode`、布林值 `streaming` 和 `nativeStreaming` 值仍為執行時期的別名；請執行 `openclaw doctor --fix` 以重寫已持續化的設定。
- `unfurlLinks` 和 `unfurlMedia` 會將 Slack 的 `chat.postMessage` 連結和媒體展開布林值傳遞給機器人回覆。`unfurlLinks` 預設為 `false`，因此除非啟用，否則傳出的機器人連結不會在行內展開；除非經過設定，否則會省略 `unfurlMedia`。在 `channels.slack.accounts.<accountId>` 設定任一值，以覆寫單一帳戶的頂層值。
- 使用 `user:<id>` (DM) 或 `channel:<id>` 作為傳送目標。

**反應通知模式：** `off`、`own` (預設)、`all`、`allowlist` (來自 `reactionAllowlist`)。

**主題會話隔離：** `thread.historyScope` 為每個主題獨立 (預設) 或在頻道間共享。`thread.inheritParent` 會將父頻道的記錄複製到新主題。

- Slack 原生串流加上 Slack 助理風格的「正在輸入...」主題狀態需要一個回覆主題目標。頂層 DM 預設保持非主題狀態，因此它們仍然可以透過 Slack 草稿發佈和編輯預覽進行串流，而不是顯示主題風格的原生串流/狀態預覽。
- `typingReaction` 會在回覆執行時，對傳入的 Slack 訊息新增暫時性的反應，然後在完成時將其移除。使用 Slack 表情符號短代碼，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生 exec 執行批准傳遞與批准者授權。架構與 Discord 相同：`enabled` (`true`/`false`/`"auto"`)、`approvers` (Slack 使用者 IDs)、`agentFilter`、`sessionFilter` 以及 `target` (`"dm"`、`"channel"` 或 `"both"`)。

| 動作群組   | 預設值  | 備註                |
| ---------- | ------- | ------------------- |
| reactions  | enabled | React + 列出反應    |
| messages   | enabled | 讀取/發送/編輯/刪除 |
| pins       | enabled | 釘選/取消釘選/列出  |
| memberInfo | enabled | 成員資訊            |
| emojiList  | enabled | 自訂表情清單        |

### Mattermost

Mattermost 在目前的 OpenClaw 版本中作為內建插件發布。較舊或自訂的版本可以使用 `openclaw plugins install @openclaw/mattermost` 安裝目前的 npm 套件。在釘選版本之前，請檢查 [npmjs.com/package/@openclaw/mattermost](https://www.npmjs.com/package/@openclaw/mattermost) 以取得目前的 dist-tags。

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

聊天模式：`oncall` (回應 @-提及，預設)、`onmessage` (每則訊息)、`onchar` (以觸發前綴開頭的訊息)。

當啟用 Mattermost 原生命令時：

- `commands.callbackPath` 必須是路徑 (例如 `/api/channels/mattermost/command`)，而不是完整的 URL。
- `commands.callbackUrl` 必須解析為 OpenClaw gateway 端點，且必須能從 Mattermost 伺服器存取。
- 原生斜線回調會使用 Mattermost 在斜線命令註冊期間傳回的各個命令 tokens 進行驗證。如果註冊失敗或未啟用任何命令，OpenClaw 會以 `Unauthorized: invalid command token.` 拒絕回調
- 對於私有/tailnet/內部回調主機，Mattermost 可能需要 `ServiceSettings.AllowedUntrustedInternalConnections` 包含回調主機/網域。請使用主機/網域值，而非完整的 URL。
- `channels.mattermost.configWrites`：允許或拒絕由 Mattermost 發起的設定寫入。
- `channels.mattermost.requireMention`：在頻道中回覆前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：每頻道的提及閘門覆寫（預設為 `"*"`）。
- 可選的 `channels.mattermost.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設的帳戶選擇。

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

- `channels.signal.account`：將頻道啟動綁定至特定的 Signal 帳戶身分。
- `channels.signal.configWrites`：允許或拒絕 Signal 發起的設定寫入。
- 可選的 `channels.signal.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設的帳戶選擇。

### iMessage

OpenClaw 會生成 `imsg rpc`（透過 stdio 的 JSON-RPC）。不需要常駐程式或連接埠。當主機可以授予訊息資料庫和自動化權限時，這是新的 OpenClaw iMessage 設定的首選路徑。

BlueBubbles 支援已被移除。`channels.bluebubbles` 在目前的 OpenClaw 上不是受支援的執行時期設定介面。將舊設定遷移至 `channels.imessage`；簡短版本請使用 [BlueBubbles 移除與 imsg iMessage 路徑](/zh-Hant/announcements/bluebubbles-imessage)，完整對照表請使用 [從 BlueBubbles 轉移](/zh-Hant/channels/imessage-from-bluebubbles)。

如果 Gateway 未在已登入的 Messages Mac 上執行，請保留 `channels.imessage.enabled=true` 並將 `channels.imessage.cliPath` 設定為 SSH 包裝程式，該程式會在該 Mac 上執行 `imsg "$@"`。預設的本機 `imsg` 路徑僅適用於 macOS。

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

- 可選的 `channels.imessage.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設的帳戶選擇。

- 需要對 Messages 資料庫的完全磁碟存取權。
- 建議優先使用 `chat_id:<id>` 目標。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包裝程式；為 SCP 附件擷取設定 `remoteHost`（`host` 或 `user@host`）。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制傳入附件路徑（預設值：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用嚴格的主機金鑰檢查，因此請確保中繼主機金鑰已存在於 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允許或拒絕由 iMessage 發起的寫入設定。
- `channels.imessage.actions.*`：啟用同樣受 `imsg status` / `openclaw channels status --probe` 管制的私有 API 操作。
- `channels.imessage.includeAttachments` 預設為關閉；在預期 Agent 回合中有傳入媒體之前，請將其設為 `true`。
- `channels.imessage.catchup.enabled`：選擇重新播放 Gateway 停機期間送達的傳入訊息。
- `channels.imessage.groups`：群組註冊表和每個群組的設定。使用 `groupPolicy: "allowlist"` 時，請設定明確的 `chat_id` 金鑰或 `"*"` 萬用字元項目，以便群組訊息通過註冊表閘門。
- 頂層 `bindings[]` 項目若包含 `type: "acp"`，可將 iMessage 對話綁定至持久的 ACP 會話。在 `match.peer.id` 中使用經過正規化處理的控制代碼或明確的聊天目標（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共用欄位語意：[ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。

<Accordion title="iMessage SSH 包裝器範例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 由外掛程式支援，並在 `channels.matrix` 下進行設定。

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

- 權杖驗證使用 `accessToken`；密碼驗證使用 `userId` + `password`。
- `channels.matrix.proxy` 將 Matrix HTTP 流量路由透過指定的 HTTP(S) 代理伺服器。具名帳戶可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫此設定。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允許私用/內部主伺服器。`proxy` 與此網路選用設定是獨立的控制項。
- `channels.matrix.defaultAccount` 選擇多重帳戶設定中的偏好帳戶。
- `channels.matrix.autoJoin` 預設為 `off`，因此受邀的房間和新的直接訊息 (DM) 風格邀請會被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 設定 `autoJoin: "allowlist"`。
- `channels.matrix.execApprovals`：Matrix 原生的 exec 審批傳遞與審批者授權。
  - `enabled`：`true`、`false` 或 `"auto"` (預設)。在自動模式下，當可以從 `approvers` 或 `commands.ownerAllowFrom` 解析出審批者時，exec 審批會啟動。
  - `approvers`：獲准批准 exec 請求的 Matrix 使用者 ID (例如 `@owner:example.org`)。
  - `agentFilter`：可選的 agent ID 允許清單。若要為所有 agents 轉發審批，請省略。
  - `sessionFilter`：可選的 session key 模式 (子字串或 regex)。
  - `target`：傳送審批提示的位置。`"dm"` (預設)、`"channel"` (原始房間)，或 `"both"`。
  - 帳號特定覆寫：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制直接訊息 (DM) 如何群組為 sessions：`per-user` (預設) 依路由對等方分享，而 `per-room` 則隔離每個 DM 房間。
- Matrix 狀態探測即時目錄查詢使用與執行時流量相同的 proxy 原則。
- 完整的 Matrix 設定、定位規則和設定範例記錄於 [Matrix](/zh-Hant/channels/matrix)。

### Microsoft Teams

Microsoft Teams 由 plugin 支援，並在 `channels.msteams` 下進行設定。

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

- 此處涵蓋的核心 key paths：`channels.msteams`、`channels.msteams.configWrites`。
- 完整的 Teams 設定 (憑證、webhook、DM/群組原則、每團隊/每頻道覆寫) 記錄於 [Microsoft Teams](/zh-Hant/channels/msteams)。

### IRC

IRC 由 plugin 支援，並在 `channels.irc` 下進行設定。

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
- 完整的 IRC 頻道設定（host/port/TLS/channels/allowlists/mention gating）記載於 [IRC](/zh-Hant/channels/irc)。

### 多帳戶（所有頻道）

為每個頻道執行多個帳戶（每個都有自己的 `accountId`）：

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
- 環境變數 token 僅適用於 **預設** 帳戶。
- 基礎頻道設定適用於所有帳戶，除非被各別帳戶覆寫。
- 使用 `bindings[].match.accountId` 將每個帳戶路由至不同的代理程式。
- 如果您在仍使用單一帳戶頂層頻道設定的情況下透過 `openclaw channels add`（或頻道上線）新增非預設帳戶，OpenClaw 會先將帳戶範圍的頂層單一帳戶值提升至頻道帳戶映射，讓原始帳戶繼續運作。大多數頻道會將它們移至 `channels.<channel>.accounts.default`；Matrix 可以改為保留現有的相符命名/預設目標。
- 現有的僅頻道綁定（無 `accountId`）會繼續符合預設帳戶；帳戶範圍的綁定保持可選。
- `openclaw doctor --fix` 也會透過將帳戶範圍的頂層單一帳戶值移入為該頻道選擇的提升帳戶來修復混合形狀。大多數頻道使用 `accounts.default`；Matrix 可以改為保留現有的相符命名/預設目標。

### 其他外掛程式頻道

許多外掛程式頻道設定為 `channels.<id>` 並記載於其專屬頻道頁面（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
請參閱完整的頻道索引：[Channels](/zh-Hant/channels)。

### 群組聊天提及閘控

群組訊息預設為 **需要提及**（元資料提及或安全的 regex 模式）。適用於 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群組聊天。

可見回覆是分開控制的。一般的群組/頻道請求預設為 `messages.groupChat.visibleReplies: "automatic"`：最終的助手文字透過舊版可見回覆路徑發佈。當共用房間應該只在代理程式呼叫 `message(action=send)` 之後才發佈可見輸出時，請設定 `"message_tool"`。如果模型返回最終文字而未呼叫訊息工具，該最終文字將保持私密，且閘道詳細記錄會記錄被隱藏的負載元資料。若要對直接聊天也套用相同的僅工具可見回覆行為，請設定 `messages.visibleReplies: "message_tool"`；Codex 測試線束也將該僅工具行用作其未設定的直接聊天預設值。

僅工具的可見回覆需要一個可靠呼叫工具的模型/執行時，且建議用於 GPT 5.5 等最新世代模型的共用氛圍房間。如果
會話記錄顯示帶有 `didSendViaMessagingTool: false` 的助手文字，這表示
模型產生了私密的最終文字，而不是呼叫訊息工具。請
為該頻道切換到更強的工具呼叫模型，檢查閘道詳細
記錄中的被隱藏負載摘要，或是設定
`messages.groupChat.visibleReplies: "automatic"` 以對每個
群組/頻道請求使用可見的最終回覆。

如果在現行工具原則下無法使用訊息工具，OpenClaw 將會回退為自動可見回覆，而不是靜靜地隱藏回應。`openclaw doctor` 會針對此不匹配發出警告。

Gateway 會在檔案儲存後熱重新載入 `messages` 設定。僅在部署中停用檔案監看或設定重新載入時才需要重新啟動。

**提及類型：**

- **元資料提及**：原生平台的 @-提及。在 WhatsApp 自我聊天模式中會被忽略。
- **文字模式**：`agents.list[].groupChat.mentionPatterns` 中的安全 regex 模式。無效的模式和不安全的巢狀重複會被忽略。
- 僅在偵測可行時（原生提及或至少一種模式）才會執行提及把關。

```json5
{
  messages: {
    visibleReplies: "automatic", // global default for direct/source chats; Codex harness defaults unset direct chats to message_tool
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

`messages.groupChat.historyLimit` 設定全域預設值。頻道可以使用 `channels.<channel>.historyLimit`（或每個帳戶）進行覆寫。設定 `0` 以停用。

`messages.groupChat.unmentionedInbound: "room_event"` 在支援的頻道上將未被提及的常開群組/頻道訊息作為安靜房間背景提交。被提及的訊息、指令和直接訊息仍屬於使用者請求。請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events) 以取得完整的 Discord、Slack 和 Telegram 範例。

`messages.visibleReplies` 是全域來源事件預設值；`messages.groupChat.visibleReplies` 會針對群組/頻道來源事件覆寫它。當未設定 `messages.visibleReplies` 時，韁體可以提供自己的直接/來源預設值；Codex 韁體預設為 `message_tool`。頻道允許清單和提及閘控仍會決定是否處理事件。

#### DM 歷史紀錄限制

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

解析方式：個別 DM 覆寫 → 提供者預設值 → 無限制（全部保留）。

支援：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自聊模式

將您自己的號碼包含在 `allowFrom` 中以啟用自聊模式（忽略原生 @ 提及，僅回應文字模式）：

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

- 此區塊設定指令介面。如需目前的內建 + 附帶指令目錄，請參閱 [Slash Commands](/zh-Hant/tools/slash-commands)。
- 此頁面是一個 **設定鍵值參考**，並非完整的指令目錄。通道/外掛擁有的指令（例如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、device-pair `/pair`、memory `/dreaming`、phone-control `/phone` 和 Talk `/voice`）記錄在其各自的通道/外掛頁面以及 [Slash Commands](/zh-Hant/tools/slash-commands) 中。
- 文字指令必須是以前導 `/` 開頭的 **獨立** 訊息。
- `native: "auto"` 為 Discord/Telegram 開啟原生指令，並關閉 Slack。
- `nativeSkills: "auto"` 為 Discord/Telegram 開啟原生技能指令，並關閉 Slack。
- 依通道覆寫：`channels.discord.commands.native` (布林值或 `"auto"`)。對於 Discord，`false` 會在啟動期間跳過原生指令註冊和清理。
- 使用 `channels.<provider>.commands.nativeSkills` 依通道覆寫原生技能註冊。
- `channels.telegram.customCommands` 新增額外的 Telegram Bot 選單項目。
- `bash: true` 啟用主機 Shell 的 `! <cmd>`。需要 `tools.elevated.enabled` 且發送者在 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 啟用 `/config` (讀取/寫入 `openclaw.json`)。對於 Gateway `chat.send` 客戶端，持續性 `/config set|unset` 寫入也需要 `operator.admin`；唯讀 `/config show` 保持可供一般寫入範圍的操作員客戶端使用。
- `mcp: true` 為 `mcp.servers` 下的 OpenClaw 管理之 MCP 伺服器設定啟用 `/mcp`。
- `plugins: true` 為外掛探索、安裝和啟用/停用控制啟用 `/plugins`。
- `channels.<provider>.configWrites` 限制每個通道的設定變更 (預設值：true)。
- 對於多帳戶通道，`channels.<provider>.accounts.<id>.configWrites` 也會限制針對該帳戶的寫入 (例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`)。
- `restart: false` 停用 `/restart` 和 Gateway 重新啟動工具動作。預設值：`true`。
- `ownerAllowFrom` 是僅限擁有者指令/工具的明確擁有者允許清單。它與 `allowFrom` 分開。
- `ownerDisplay: "hash"` 雜湊系統提示中的擁有者 ID。設定 `ownerDisplaySecret` 以控制雜湊。
- `allowFrom` 是依提供者而定。設定後，它是 **唯一** 的授權來源 (通道允許清單/配對和 `useAccessGroups` 將被忽略)。
- `useAccessGroups: false` 允許指令在未設定 `allowFrom` 時繞過存取群組原則。
- 指令文件地圖：
  - 內建 + 附帶目錄：[Slash Commands](/zh-Hant/tools/slash-commands)
  - 通道特定指令介面：[Channels](/zh-Hant/channels)
  - QQ Bot 指令：[QQ Bot](/zh-Hant/channels/qqbot)
  - 配對指令：[Pairing](/zh-Hant/channels/pairing)
  - LINE 卡片指令：[LINE](/zh-Hant/channels/line)
  - 記憶體做夢：[Dreaming](/zh-Hant/concepts/dreaming)

</Accordion>

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 頂層配置鍵
- [Configuration — agents](/zh-Hant/gateway/config-agents)
- [Channels overview](/zh-Hant/channels)
