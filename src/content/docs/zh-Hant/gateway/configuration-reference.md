---
title: "設定參考"
summary: "核心 OpenClaw 金鑰、預設值的 Gateway 設定參考，以及連結至專屬子系統參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

# 設定參考

`~/.openclaw/openclaw.json` 的核心設定參考。如需以任務為導向的概述，請參閱 [Configuration](/zh-Hant/gateway/configuration)。

此頁面涵蓋主要的 OpenClaw 設定介面，當子系統有自己更深入的參考資料時會提供連結。它**不**會試圖在單一頁面中內嵌每個通道/外掛擁有的指令目錄或每個深度記憶體/QMD 旋鈕。

程式碼真相：

- `openclaw config schema` 會列印用於驗證和控制 UI 的即時 JSON Schema，並在可用時合併套件/外掛/通道中繼資料
- `config.schema.lookup` 會傳回一個路徑範圍的 schema 節點，用於向下鑽研工具
- `pnpm config:docs:check` / `pnpm config:docs:gen` 會驗證設定文件基準雜湊與當前 schema 介面

專屬深度參考資料：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 的 [Memory configuration reference](/zh-Hant/reference/memory-config)，以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 設定
- 目前內建 + 打包指令目錄的 [Slash Commands](/zh-Hant/tools/slash-commands)
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和尾隨逗號）。所有欄位都是選填的 — 省略時 OpenClaw 會使用安全的預設值。

---

## 通道

每個通道在其設定區段存在時會自動啟動（除非 `enabled: false`）。

### 私訊和群組存取

所有通道都支援私訊原則和群組原則：

| 私訊原則          | 行為                                               |
| ----------------- | -------------------------------------------------- |
| `pairing`（預設） | 未知發送者會收到一次性配對碼；擁有者必須核准       |
| `allowlist`       | 僅限 `allowFrom`（或已配對的允許存放區）中的傳送者 |
| `open`            | 允許所有傳入 DM（需要 `allowFrom: ["*"]`）         |
| `disabled`        | 忽略所有傳入的私訊                                 |

| 群組原則            | 行為                                |
| ------------------- | ----------------------------------- |
| `allowlist`（預設） | 僅符合已配置允許清單的群組          |
| `open`              | 繞過群組允許清單 (提及閘道仍然適用) |
| `disabled`          | 封鎖所有群組/房間訊息               |

<Note>
`channels.defaults.groupPolicy` 會在提供者的 `groupPolicy` 未設定時設定預設值。
配對碼會在 1 小時後過期。待處理的 DM 配對請求上限為每個通道 **3 個**。
如果完全缺少提供者區塊（缺少 `channels.<provider>`），執行時期群組原則會回退至 `allowlist`（失效關閉），並顯示啟動警告。
</Note>

### 頻道模型覆寫

使用 `channels.modelByChannel` 將特定頻道 ID 固定到某個模型。值接受 `provider/model` 或已設定的模型別名。當工作階段尚未有模型覆寫時（例如，透過 `/model` 設定），會套用頻道對應。

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

### 頻道預設值與心跳

使用 `channels.defaults` 來設定跨提供者的共用群組原則與心跳行為：

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

- `channels.defaults.groupPolicy`：當未設定提供者層級的 `groupPolicy` 時的備用群組原則。
- `channels.defaults.contextVisibility`：所有頻道的預設補充上下文可見性模式。數值：`all`（預設，包含所有引用/串列/歷史上下文）、`allowlist`（僅包含來自白名單發送者的上下文）、`allowlist_quote`（與白名單相同，但保留明確的引用/回覆上下文）。各頻道覆寫：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在心跳輸出中包含健康的頻道狀態。
- `channels.defaults.heartbeat.showAlerts`：在心跳輸出中包含降級/錯誤狀態。
- `channels.defaults.heartbeat.useIndicator`：呈現精簡的指標樣式心跳輸出。

### WhatsApp

WhatsApp 透過閘道的網頁頻道 (Baileys Web) 執行。當連結的工作階段存在時，它會自動啟動。

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

- 外送指令預設使用帳號 `default`（若存在）；否則使用第一個已設定的帳號 ID（已排序）。
- 選用的 `channels.whatsapp.defaultAccount` 會在符合已設定的帳號 ID 時覆寫該備用預設帳號選擇。
- 舊版單一帳號 Baileys 驗證目錄會由 `openclaw doctor` 遷移至 `whatsapp/default`。
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
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Bot 權杖：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（僅限一般檔案；拒絕符號連結），並以 `TELEGRAM_BOT_TOKEN` 作為預設帳號的備選。
- 選用的 `channels.telegram.defaultAccount` 會在符合已設定的帳號 ID 時覆寫預設帳號選擇。
- 在多帳號設置（2 個或更多帳號 ID）中，設定一個明確的預設值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免備援路由；`openclaw doctor` 會在缺失或無效時發出警告。
- `configWrites: false` 封鎖 Telegram 發起的配置寫入（超級群組 ID 遷移、`/config set|unset`）。
- 頂層帶有 `type: "acp"` 的 `bindings[]` 項目設定論壇主題的持續性 ACP 繫結（在 `match.peer.id` 中使用標準 `chatId:topic:topicId`）。欄位語義在 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings) 中共享。
- Telegram 串流預覽使用 `sendMessage` + `editMessageText`（適用於直接訊息和群組聊天）。
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

- Token：`channels.discord.token`，並以 `DISCORD_BOT_TOKEN` 作為預設帳號的備援。
- 提供明確 Discord `token` 的直接外送呼叫會使用該 token 進行呼叫；帳號重試/政策設定仍來自於作用中執行時段快照中所選的帳號。
- 選用的 `channels.discord.defaultAccount` 會在與設定的帳號 ID 匹配時，覆寫預設帳號選擇。
- 請使用 `user:<id>` (DM) 或 `channel:<id>` (公會頻道) 作為傳送目標；不接受純數字 ID。
- Guild slug 為小寫，並以 `-` 取代空格；頻道金鑰使用 slug 化名稱（無 `#`）。建議優先使用 Guild ID。
- Bot 撰寫的訊息預設會被忽略。`allowBots: true` 可啟用它們；使用 `allowBots: "mentions"` 可僅接受提及該 bot 的 bot 訊息（自己的訊息仍會被過濾）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及頻道覆寫）會捨棄提及其他使用者或角色但未提及該 bot 的訊息（@everyone/@here 除外）。
- `maxLinesPerMessage`（預設值為 17）會分割長訊息，即使字數在 2000 字以下亦然。
- `channels.discord.threadBindings` 控制與 Discord 執行緒綁定的路由：
  - `enabled`: Discord 覆蓋設定，用於綁定執行緒的會話功能（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及綁定的傳送/路由）
  - `idleHours`: Discord 覆蓋設定，用於非活動自動取消聚焦的小時數（`0` 表示停用）
  - `maxAgeHours`: Discord 覆蓋設定，用於絕對最大存留時間的小時數（`0` 表示停用）
  - `spawnSubagentSessions`: 用於 `sessions_spawn({ thread: true })` 自動建立/綁定執緒的選用開關
- 頂層帶有 `type: "acp"` 的 `bindings[]` 項目設定頻道和執行緒的持續性 ACP 繫結（在 `match.peer.id` 中使用頻道/執行緒 ID）。欄位語義在 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings) 中共享。
- `channels.discord.ui.components.accentColor` 設定 Discord 組件 v2 容器的強調色。
- `channels.discord.voice` 啟用 Discord 語音頻道對話以及選用的自動加入 + TTS 覆蓋設定。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 會傳遞給 `@discordjs/voice` DAVE 選項（預設為 `true` 和 `24`）。
- OpenClaw 還會在重複解密失敗後，通過離開/重新加入語音會話來嘗試語音接收恢復。
- `channels.discord.streaming` 是標準的串流模式金鑰。舊版的 `streamMode` 和布林值 `streaming` 會自動遷移。
- `channels.discord.autoPresence` 將執行時期可用性對應至 Bot 狀態（healthy => online, degraded => idle, exhausted => dnd），並允許選用的狀態文字覆蓋設定。
- `channels.discord.dangerouslyAllowNameMatching` 重新啟用可變的名稱/標籤匹配（緊急相容模式）。
- `channels.discord.execApprovals`: Discord 原生的執行核准傳送與核准者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在自動模式下，當可以從 `approvers` 或 `commands.ownerAllowFrom` 解析出審核者時，執行審核會啟用。
  - `approvers`：允許批准執行請求的 Discord 使用者 ID。省略時會回退到 `commands.ownerAllowFrom`。
  - `agentFilter`：可選的代理程式 ID 允許清單。省略以轉發所有代理程式的審核。
  - `sessionFilter`：可選的 Session Key 模式（子字串或正則表示式）。
  - `target`：傳送審核提示的目標位置。`"dm"`（預設）傳送到審核者的 DM，`"channel"` 傳送到原始頻道，`"both"` 傳送到兩者。當目標包含 `"channel"` 時，按鈕僅可供解析出的審核者使用。
  - `cleanupAfterResolve`：當 `true` 時，在批准、拒絕或逾時後刪除審核 DM。

**反應通知模式：** `off`（無），`own`（機器人的訊息，預設），`all`（所有訊息），`allowlist`（來自 `guilds.<id>.users`，針對所有訊息）。

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

- 服務帳戶 JSON：內嵌（`serviceAccount`）或基於檔案（`serviceAccountFile`）。
- 也支援服務帳戶 SecretRef（`serviceAccountRef`）。
- 環境變數回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作為傳送目標。
- `channels.googlechat.dangerouslyAllowNameMatching` 會重新啟用可變的電子郵件主體匹配（緊急玻璃相容性模式）。

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

- **Socket 模式**需要同時具備 `botToken` 和 `appToken`（預設帳戶環境變數回退需 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式**需要 `botToken` 加上 `signingSecret`（在根層級或每個帳戶）。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- Slack 帳號快照會公開每個憑證的來源/狀態欄位，例如 `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示該帳號是透過 SecretRef 設定的，但目前的指令/執行路徑無法解析秘密值。
- `configWrites: false` 會封鎖由 Slack 發起的設定寫入。
- 選用的 `channels.slack.defaultAccount` 會在符合已設定的帳號 ID 時，覆寫預設的帳號選擇。
- `channels.slack.streaming.mode` 是 Slack 資料流模式的標準金鑰。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生串流傳輸。舊版的 `streamMode`、布林值 `streaming` 和 `nativeStreaming` 值會自動遷移。
- 請使用 `user:<id>` (DM) 或 `channel:<id>` 作為傳送目標。

**反應通知模式：** `off`、`own` (預設)、`all`、`allowlist` (來自 `reactionAllowlist`)。

**執行緒會話隔離：** `thread.historyScope` 是每個執行緒 (預設) 或跨頻道共享。`thread.inheritParent` 會將父頻道紀錄複製到新執行緒。

- Slack 原生串流以及 Slack 助理風格的「is typing...」執行緒狀態需要一個回覆執行緒目標。頂層 DM 預設保持非執行緒狀態，因此它們會使用 `typingReaction` 或一般傳送方式，而不是執行緒風格的預覽。
- `typingReaction` 會在執行回覆時，對傳入的 Slack 訊息新增暫時性的反應，然後在完成時將其移除。請使用 Slack 表情符號短代碼，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生執行審批傳遞與審批者授權。架構與 Discord 相同：`enabled` (`true`/`false`/`"auto"`)、`approvers` (Slack 使用者 IDs)、`agentFilter`、`sessionFilter` 與 `target` (`"dm"`、`"channel"` 或 `"both"`)。

| 動作群組   | 預設    | 備註                |
| ---------- | ------- | ------------------- |
| reactions  | enabled | 反應 + 列出反應     |
| messages   | enabled | 讀取/發送/編輯/刪除 |
| pins       | enabled | 釘選/取消釘選/列表  |
| memberInfo | enabled | 成員資訊            |
| emojiList  | enabled | 自訂 emoji 列表     |

### Mattermost

Mattermost 作為外掛程式提供：`openclaw plugins install @openclaw/mattermost`。

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

聊天模式：`oncall`（回應 @-提及，預設）、`onmessage`（每則訊息）、`onchar`（以觸發前綴開頭的訊息）。

當啟用 Mattermost 原生命令時：

- `commands.callbackPath` 必須是路徑（例如 `/api/channels/mattermost/command`），而非完整的 URL。
- `commands.callbackUrl` 必須解析為 OpenClaw gateway 端點，且可從 Mattermost 伺服器存取。
- 原生斜線回呼會透過 Mattermost 在斜線指令註冊期間回傳的每個指令 Token 進行驗證。如果註冊失敗或未啟用任何指令，OpenClaw 會以 `Unauthorized: invalid command token.` 拒絕回呼。
- 對於私有/tailnet/內部回呼主機，Mattermost 可能需要 `ServiceSettings.AllowedUntrustedInternalConnections` 包含回呼主機/網域。請使用主機/網域值，而非完整 URLs。
- `channels.mattermost.configWrites`：允許或拒絕 Mattermost 發起的設定寫入。
- `channels.mattermost.requireMention`：在頻道中回覆前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：各頻道的提及閘門覆寫（預設為 `"*"`）。
- 可選的 `channels.mattermost.defaultAccount` 會在符合已設定的帳號 ID 時覆寫預設的帳號選擇。

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

**反應通知模式：**`off`、`own`（預設）、`all`、`allowlist`（來自 `reactionAllowlist`）。

- `channels.signal.account`：將頻道啟動固定至特定的 Signal 帳號身分。
- `channels.signal.configWrites`: 允許或拒絕由 Signal 發起的設定寫入。
- 可選的 `channels.signal.defaultAccount` 會在符合設定的帳號 ID 時覆寫預設的帳號選擇。

### BlueBubbles

BlueBubbles 是建議的 iMessage 路徑（由外掛程式支援，在 `channels.bluebubbles` 下設定）。

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

- 此處涵蓋的核心金鑰路徑：`channels.bluebubbles`、`channels.bluebubbles.dmPolicy`。
- 可選的 `channels.bluebubbles.defaultAccount` 會在符合設定的帳號 ID 時覆寫預設的帳號選擇。
- 頂層帶有 `type: "acp"` 的 `bindings[]` 項目可以將 BlueBubbles 對話繫結至持續性 ACP 工作階段。在 `match.peer.id` 中使用 BlueBubbles handle 或目標字串 (`chat_id:*`、`chat_guid:*`、`chat_identifier:*`)。共享欄位語義：[ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。
- 完整的 BlueBubbles 頻道設定記錄於 [BlueBubbles](/zh-Hant/channels/bluebubbles)。

### iMessage

OpenClaw 會產生 `imsg rpc`（透過 stdio 的 JSON-RPC）。不需要常駐程式或連接埠。

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

- 可選的 `channels.imessage.defaultAccount` 會在符合設定的帳號 ID 時覆寫預設的帳號選擇。

- 需要對訊息資料庫 擁有完全磁碟存取權限。
- 優先使用 `chat_id:<id>` 目標。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可指向 SSH 包裝程式；設定 `remoteHost`（`host` 或 `user@host`）以透過 SCP 擷取附件。
- `attachmentRoots` 和 `remoteAttachmentRoots` 會限制傳入附件的路徑（預設：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用嚴格的主機金鑰檢查，因此請確保中繼主機金鑰已存在於 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`: 允許或拒絕由 iMessage 發起的設定寫入。
- 頂層帶有 `type: "acp"` 的 `bindings[]` 項目可以將 iMessage 對話繫結至持續性 ACP 工作階段。在 `match.peer.id` 中使用正規化的 handle 或明確的聊天目標 (`chat_id:*`、`chat_guid:*`、`chat_identifier:*`)。共享欄位語義：[ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。

<Accordion title="iMessage SSH 包裝器範例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 是由擴充功能支援的，並在 `channels.matrix` 下進行配置。

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
- `channels.matrix.proxy` 透過明確的 HTTP(S) 代理伺服器路由 Matrix HTTP 流量。命名帳號可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫此設定。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允許私人/內部 homeserver。`proxy` 與此網路選擇加入是獨立的控制項。
- `channels.matrix.defaultAccount` 用於在多帳號設定中選擇首選帳號。
- `channels.matrix.autoJoin` 預設為 `off`，因此被邀請的房間和全新的 DM 風格邀請會被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 設定 `autoJoin: "allowlist"`。
- `channels.matrix.execApprovals`：Matrix 原生的執行核准傳遞與核准者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在自動模式下，當可以從 `approvers` 或 `commands.ownerAllowFrom` 解析出核准者時，執行核准會啟動。
  - `approvers`：獲准核准執行請求的 Matrix 使用者 ID（例如 `@owner:example.org`）。
  - `agentFilter`：選用性的代理程式 ID 允許清單。省略以轉發所有代理程式的核准。
  - `sessionFilter`：選用性的會話金鑰模式（子字串或正規表示式）。
  - `target`：將核准提示傳送至何處。`"dm"`（預設）、`"channel"`（來源房間），或 `"both"`。
  - 每個帳戶的覆寫：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix 私訊如何分組為會話：`per-user`（預設）依路由對象共享，而 `per-room` 則隔離每個私訊房間。
- Matrix 狀態探測和即時目錄查詢使用與執行時流量相同的代理政策。
- 完整的 Matrix 設定、目標規則和設定範例已記錄在 [Matrix](/zh-Hant/channels/matrix) 中。

### Microsoft Teams

Microsoft Teams 基於擴充功能，並在 `channels.msteams` 下進行設定。

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
- 完整的 Teams 設定（憑證、webhook、DM/群組原則、每團隊/每頻道覆寫）已記錄在 [Microsoft Teams](/zh-Hant/channels/msteams) 中。

### IRC

IRC 基於擴充功能，並在 `channels.irc` 下進行設定。

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
- 可選的 `channels.irc.defaultAccount` 當符合已設定的帳戶 ID 時，會覆寫預設的帳戶選擇。
- 完整的 IRC 頻道設定（主機/連接埠/TLS/頻道/允許清單/提及閘門）已記錄在 [IRC](/zh-Hant/channels/irc) 中。

### 多重帳戶（所有頻道）

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

- 當省略 `accountId` 時使用 `default`（CLI + 路由）。
- 環境變數僅適用於 **預設** 帳戶。
- 除非依帳戶覆寫，否則基本頻道設定適用於所有帳戶。
- 使用 `bindings[].match.accountId` 將每個帳戶路由到不同的代理程式。
- 如果您仍處於單一帳戶頂層頻道設定的同時，透過 `openclaw channels add`（或頻道上線）新增非預設帳戶，OpenClaw 會先將帳戶範圍的頂層單一帳戶值提升至頻道帳戶映射，以便原始帳戶繼續運作。大多數頻道會將這些值移至 `channels.<channel>.accounts.default`；Matrix 則可以改為保留現有的相符命名/預設目標。
- 現有的僅通道綁定（沒有 `accountId`）保持匹配預設帳戶；帳戶範圍綁定保持可選。
- `openclaw doctor --fix` 還會透過將帳戶範圍的頂層單一帳戶值移動至為該通道選擇的提升帳戶來修復混合形狀。大多數通道使用 `accounts.default`；Matrix 則可以改為保留現有的匹配命名/預設目標。

### 其他擴充功能頻道

許多擴充頻道都設定為 `channels.<id>`，並記錄在其專屬的頻道頁面中（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整的頻道索引：[Channels](/zh-Hant/channels)。

### 群組聊天提及閘控

群組訊息預設為**需要提及**（metadata mention 或安全的 regex 模式）。適用於 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群組聊天。

**提及類型：**

- **Metadata mentions**：原生平台 @-mentions。在 WhatsApp 自我聊天模式中會被忽略。
- **文字模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正規表示式模式。無效的模式和不安全的巢狀重複會被忽略。
- 提及閘控僅在偵測可行時（原生 mentions 或至少一個模式）才會強制執行。

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

`messages.groupChat.historyLimit` 設定全域預設值。通道可以使用 `channels.<channel>.historyLimit` 覆寫（或每個帳戶）。設定 `0` 以停用。

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

將您自己的號碼包含在 `allowFrom` 中以啟用自訊息模式（忽略原生 @提及，僅回應文字模式）：

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

- 此區塊配置指令介面。如需目前的內建 + 捆綁指令目錄，請參閱 [Slash Commands](/zh-Hant/tools/slash-commands)。
- 此頁面是 **config-key reference**，而非完整的指令目錄。頻道/外掛擁有的指令（如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、device-pair `/pair`、memory `/dreaming`、phone-control `/phone` 和 Talk `/voice`）記錄在其各自的頻道/外掛頁面以及 [Slash Commands](/zh-Hant/tools/slash-commands) 中。
- 文字指令必須是 **standalone** 訊息，並以 `/` 開頭。
- `native: "auto"` 會為 Discord/Telegram 開啟原生指令，保持 Slack 關閉。
- `nativeSkills: "auto"` 會為 Discord/Telegram 開啟原生技能指令，保持 Slack 關閉。
- 依頻道覆寫：`channels.discord.commands.native` (bool 或 `"auto"`)。`false` 會清除先前註冊的指令。
- 使用 `channels.<provider>.commands.nativeSkills` 依頻道覆寫原生技能註冊。
- `channels.telegram.customCommands` 會新增額外的 Telegram bot 選單項目。
- `bash: true` 會為主機 Shell 啟用 `! <cmd>`。需要 `tools.elevated.enabled` 且發送者位於 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 會啟用 `/config` (讀取/寫入 `openclaw.json`)。對於 gateway `chat.send` 客戶端，永續 `/config set|unset` 寫入也需要 `operator.admin`；唯讀 `/config show` 對一般寫入範圍的操作員客戶端保持可用。
- `mcp: true` 會針對 `mcp.servers` 下的 OpenClaw 管理之 MCP 伺服器配置啟用 `/mcp`。
- `plugins: true` 會為外掛探索、安裝及啟用/停用控制啟用 `/plugins`。
- `channels.<provider>.configWrites` 會限制各頻道的配置變更 (預設：true)。
- 對於多帳號頻道，`channels.<provider>.accounts.<id>.configWrites` 也會限制以該帳號為目標的寫入操作 (例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`)。
- `restart: false` 會停用 `/restart` 和 gateway 重啟工具動作。預設：`true`。
- `ownerAllowFrom` 是僅限擁有者之指令/工具的明確擁有者允許清單。它與 `allowFrom` 分開。
- `ownerDisplay: "hash"` 會對系統提示詞中的擁有者 ID 進行雜湊處理。設定 `ownerDisplaySecret` 以控制雜湊處理。
- `allowFrom` 是依提供者而定。設定後，它將是 **唯一** 的授權來源 (頻道允許清單/配對和 `useAccessGroups` 會被忽略)。
- 當未設定 `allowFrom` 時，`useAccessGroups: false` 允許指令繞過存取群組原則。
- 指令文件地圖：
  - 內建 + 捆綁目錄：[Slash Commands](/zh-Hant/tools/slash-commands)
  - 特定頻道的指令介面：[Channels](/zh-Hant/channels)
  - QQ Bot 指令：[QQ Bot](/zh-Hant/channels/qqbot)
  - 配對指令：[Pairing](/zh-Hant/channels/pairing)
  - LINE 卡片指令：[LINE](/zh-Hant/channels/line)
  - 記憶體夢境：[Dreaming](/zh-Hant/concepts/dreaming)

</Accordion>

---

## Agent 預設值

### `agents.defaults.workspace`

預設值：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

顯示在系統提示詞 Runtime 行中的可選儲存庫根路徑。如果未設定，OpenClaw 會透過從工作區向上遍歷自動偵測。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

針對未設定 `agents.list[].skills` 的代理程式，選用的預設技能允許清單。

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

- 省略 `agents.defaults.skills` 以預設允許無限制的技能。
- 省略 `agents.list[].skills` 以繼承預設值。
- 將 `agents.list[].skills: []` 設定為空以不使用任何技能。
- 非空白的 `agents.list[].skills` 清單是該代理程式的最終集合；它不會與預設值合併。

### `agents.defaults.skipBootstrap`

停用工作區啟動檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自動建立。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.contextInjection`

控制何時將工作區啟動檔案注入系統提示。預設值：`"always"`。

- `"continuation-skip"`：安全的接續輪次（在完成助手回應後）會跳過工作區啟動檔案的重新注入，以減少提示大小。心跳執行和壓縮後的重試仍會重建上下文。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

工作區引導檔案截斷前的最大字元數。預設值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

所有工作區引導檔案中注入的最大總字元數。預設值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

當啟動上下文被截斷時，控制代理程式可見的警告文字。預設值：`"once"`。

- `"off"`：絕不將警告文字注入系統提示。
- `"once"`：針對每個唯一的截斷簽章注入一次警告（建議）。
- `"always"`：當存在截斷時，每次執行都注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### 上下文預算所有權對應

OpenClaw 擁有多個高容量的提示/上下文預算，且它們是刻意按子系統進行拆分，而不是全部透過一個通用旋鈕流動。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`:
  一般工作區啟動注入。
- `agents.defaults.startupContext.*`:
  單次 `/new` 和 `/reset` 啟動前導，包括最近的每日
  `memory/*.md` 檔案。
- `skills.limits.*`:
  注入到系統提示中的精簡技能列表。
- `agents.defaults.contextLimits.*`:
  有界的執行時摘錄和注入的執行時擁有的區塊。
- `memory.qmd.limits.*`:
  索引的記憶體搜尋片段和注入大小。

僅當一個代理需要不同的預算時，才使用相符的個別代理覆寫：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在純 `/new` 和 `/reset` 執行上注入的首輪啟動前導。

```json5
{
  agents: {
    defaults: {
      startupContext: {
        enabled: true,
        applyOn: ["new", "reset"],
        dailyMemoryDays: 2,
        maxFileBytes: 16384,
        maxFileChars: 1200,
        maxTotalChars: 2800,
      },
    },
  },
}
```

#### `agents.defaults.contextLimits`

有界執行時內容表面的共用預設值。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        memoryGetDefaultLines: 120,
        toolResultMaxChars: 16000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`：在新增截斷中繼資料和續行通知之前的預設 `memory_get` 摘錄上限。
- `memoryGetDefaultLines`：當省略 `lines` 時的預設 `memory_get` 行視窗。
- `toolResultMaxChars`：用於持久化結果和溢出恢復的即時工具結果上限。
- `postCompactionMaxChars`：在壓縮後重新整理注入期間使用的 AGENTS.md 摘錄上限。

#### `agents.list[].contextLimits`

共用 `contextLimits` 設定的個別代理覆寫。省略的欄位繼承自 `agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        toolResultMaxChars: 16000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000,
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

注入到系統提示中的精簡技能列表的全域上限。這不會影響按需讀取 `SKILL.md` 檔案。

```json5
{
  skills: {
    limits: {
      maxSkillsPromptChars: 18000,
    },
  },
}
```

#### `agents.list[].skillsLimits.maxSkillsPromptChars`

技能提示預算的個別代理覆寫。

```json5
{
  agents: {
    list: [
      {
        id: "tiny-local",
        skillsLimits: {
          maxSkillsPromptChars: 6000,
        },
      },
    ],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

在提供者呼叫之前，逐字稿/工具圖像區塊中最長圖像邊的最大像素大小。
預設值：`1200`。

較低的值通常會減少視覺 token 使用量，並減少包含大量螢幕截圖執行的請求負載大小。較高的值會保留更多視覺細節。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系統提示上下文的時區（非訊息時間戳記）。若未設定則回退至主機時區。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系統提示中的時間格式。預設值：`auto` (作業系統偏好設定)。

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

- `model`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 字串形式僅設定主要模型。
  - 物件形式設定主要模型以及有序的故障轉移模型。
- `imageModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由 `image` 工具路徑用作其視覺模型配置。
  - 當選取/預設的模型無法接受圖片輸入時，也會用作故障轉移路由。
- `imageGenerationModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由共享的圖片生成功能及任何未來會產生圖片的工具/外掛介面使用。
  - 典型值：原生 Gemini 圖片生成使用 `google/gemini-3.1-flash-image-preview`，fal 使用 `fal/fal-ai/flux/dev`，或是 OpenAI Images 使用 `openai/gpt-image-1`。
  - 若您直接選擇供應商/模型，請同時設定相符的供應商驗證/API 金鑰（例如 `google/*` 的 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/*` 的 `OPENAI_API_KEY`，`fal/*` 的 `FAL_KEY`）。
  - 若省略，`image_generate` 仍可推斷出具備驗證支援的供應商預設值。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試剩餘已註冊的圖片生成供應商。
- `musicGenerationModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由共享的音樂生成功能及內建的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.5+`。
  - 如果省略，`music_generate` 仍可推斷出一個基於驗證的預設供應商。它會先嘗試當前的預設供應商，然後按照供應商 ID 的順序嘗試其餘已註冊的音樂生成供應商。
  - 如果您直接選擇了供應商/模型，請同時配置匹配的供應商驗證/API 金鑰。
- `videoGenerationModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由共享影片生成功能和內建 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍可推斷出一個基於驗證的預設供應商。它會先嘗試當前的預設供應商，然後按照供應商 ID 的順序嘗試其餘已註冊的影片生成供應商。
  - 如果您直接選擇了供應商/模型，請同時配置匹配的供應商驗證/API 金鑰。
  - 隨附的 Qwen 影片生成供應商支援最多 1 個輸出影片、1 個輸入圖片、4 個輸入影片、10 秒持續時間，以及供應商層級的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 選項。
- `pdfModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由 `pdf` 工具用於模型路由。
  - 如果省略，PDF 工具會回退到 `imageModel`，然後再回退到解析後的會話/預設模型。
- `pdfMaxBytesMb`：當呼叫時未傳遞 `maxBytesMb` 時，`pdf` 工具的預設 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式預設考慮的最大頁數。
- `verboseDefault`：代理的預設詳細程度層級。值：`"off"`、`"on"`、`"full"`。預設值：`"off"`。
- `elevatedDefault`：代理的預設提升輸出層級。值：`"off"`、`"on"`、`"ask"`、`"full"`。預設值：`"on"`。
- `model.primary`：格式 `provider/model`（例如 `openai/gpt-5.4`）。如果您省略提供商，OpenClaw 會先嘗試別名，然後是該特定模型 ID 的唯一配置提供商匹配項，最後才回退到配置的預設提供商（已棄用的相容性行為，因此建議明確指定 `provider/model`）。如果該提供商不再公開配置的預設模型，OpenClaw 將回退到第一個配置的提供商/模型，而不是顯示過時的已移除提供商預設值。
- `models`：`/model` 的配置模型目錄與允許清單。每個條目可以包含 `alias`（快捷方式）和 `params`（特定於提供商，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`）。
- `params`：套用於所有模型的全域預設提供商參數。在 `agents.defaults.params` 設定（例如 `{ cacheRetention: "long" }`）。
- `params` 合併優先順序（配置）：`agents.defaults.params`（全域基底）會被 `agents.defaults.models["provider/model"].params`（每個模型）覆寫，然後 `agents.list[].params`（相符的代理程式 ID）會依鍵值進行覆寫。詳情請參閱 [提示快取](/zh-Hant/reference/prompt-caching)。
- `embeddedHarness`：預設的低階嵌入式代理程式執行階段原則。使用 `runtime: "auto"` 讓註冊的外掛程式 harness 宣告支援的模型，`runtime: "pi"` 強制使用內建的 PI harness，或是已註冊的 harness ID 例如 `runtime: "codex"`。設定 `fallback: "none"` 以停用自動 PI 後備。
- 變更這些欄位的設定寫入器（例如 `/models set`、`/models set-image` 以及後備新增/移除指令）會儲存標準物件格式，並在可能時保留現有的後備清單。
- `maxConcurrent`：跨會話的最大並行代理程式執行數（每個會話仍為序列化處理）。預設值：4。

### `agents.defaults.embeddedHarness`

`embeddedHarness` 控制執行嵌入式代理程式回合的低階執行器。
大多數部署應保持預設的 `{ runtime: "auto", fallback: "pi" }`。
當受信任的外掛程式提供原生 harness 時使用它，例如隨附的
Codex app-server harness。

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

- `runtime`：`"auto"`、`"pi"` 或已註冊的外掛程式 harness ID。隨附的 Codex 外掛程式註冊了 `codex`。
- `fallback`：`"pi"` 或 `"none"`。`"pi"` 將內建的 PI harness 保留為相容性後備。`"none"` 會使遺失或不支援的外掛程式 harness 選擇失敗，而不是無聲地使用 PI。
- 環境變數覆寫：`OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` 會覆寫 `runtime`；`OPENCLAW_AGENT_HARNESS_FALLBACK=none` 會停用該處理程序的 PI 後備。
- 對於僅有 Codex 的部署，請設定 `model: "codex/gpt-5.4"`、`embeddedHarness.runtime: "codex"` 和 `embeddedHarness.fallback: "none"`。
- 這僅控制嵌入式聊天 harness。媒體生成、視覺、PDF、音樂、影片和 TTS 仍使用其提供者/模型設定。

**內建別名簡寫**（僅在模型位於 `agents.defaults.models` 時適用）：

| 別名                | 模型                                   |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.4`                       |
| `gpt-mini`          | `openai/gpt-5.4-mini`                  |
| `gpt-nano`          | `openai/gpt-5.4-nano`                  |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

您設定的別名始終優先於預設值。

除非您設定了 `--thinking off` 或自行定義了 `agents.defaults.models["zai/<model>"].params.thinking`，否則 Z.AI GLM-4.x 模型會自動啟用思考模式。
Z.AI 模型預設對工具呼叫串流啟用 `tool_stream`。將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設定為 `false` 即可停用。
若未設定明確的思考等級，Anthropic Claude 4.6 模型預設為 `adaptive` 思考。

### `agents.defaults.cliBackends`

僅文字後備執行（無工具呼叫）的選用 CLI 後端。當 API 提供者失敗時，可作為備援。

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

- CLI 後端以文字優先；工具一律停用。
- 當設定 `sessionArg` 時支援 Sessions。
- 當 `imageArg` 接受檔案路徑時，支援圖像直通。

### `agents.defaults.systemPromptOverride`

用固定字串取代整個 OpenClaw 組裝的系統提示詞。在預設層級 (`agents.defaults.systemPromptOverride`) 或個別代理程式 (`agents.list[].systemPromptOverride`) 設定。個別代理程式的值優先；空白或僅含空白字元的值會被忽略。適用於受控的提示詞實驗。

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

定期心跳執行。

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

- `every`：持續時間字串 (ms/s/m/h)。預設值：`30m` (API 金鑰驗證) 或 `1h` (OAuth 驗證)。設定為 `0m` 可停用。
- `includeSystemPromptSection`：若為 false，則從系統提示詞中省略 Heartbeat 區段，並跳過將 `HEARTBEAT.md` 注入啟動上下文。預設值：`true`。
- `suppressToolErrorWarnings`：若為 true，則在心跳執行期間隱藏工具錯誤警告承載。
- `timeoutSeconds`：中止前允許心跳代理輪次的最大時間（秒）。保持未設置以使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/DM 傳遞策略。`allow`（預設）允許直接目標傳遞。`block` 隱藏直接目標傳遞並發出 `reason=dm-blocked`。
- `lightContext`：若為 true，心跳執行會使用輕量級啟動上下文，並且僅保留工作區啟動檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：若為 true，每次心跳都在沒有先前對話歷史的新會話中執行。與 cron `sessionTarget: "isolated"` 的隔離模式相同。將每次心跳的 token 成本從約 100K 降低到約 2-5K token。
- 每個代理：設定 `agents.list[].heartbeat`。當任何代理定義了 `heartbeat` 時，**僅這些代理** 執行心跳。
- 心跳執行完整的代理輪次 — 較短的間隔會消耗更多的 token。

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
        notifyUser: true, // send brief notices when compaction starts and completes (default: false)
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

- `mode`：`default` 或 `safeguard`（針對長歷史紀錄的分塊摘要）。詳情請參閱 [壓縮](/zh-Hant/concepts/compaction)。
- `provider`：已註冊壓縮提供者外掛程式的 ID。設定後，會呼叫提供者的 `summarize()` 而非內建的 LLM 摘要。失敗時會回退至內建功能。設定提供者會強制啟用 `mode: "safeguard"`。詳情請參閱 [壓縮](/zh-Hant/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 中止單一壓縮操作前允許的最大秒數。預設值：`900`。
- `identifierPolicy`：`strict`（預設）、`off` 或 `custom`。`strict` 會在壓縮摘要期間前置內建的不透明識別碼保留指導。
- `identifierInstructions`：當使用 `identifierPolicy=custom` 時使用的可選自訂識別碼保留文字。
- `postCompactionSections`：壓縮後重新注入的可選 AGENTS.md H2/H3 區段名稱。預設為 `["Session Startup", "Red Lines"]`；設定 `[]` 以停用重新注入。當未設定或明確設定為該預設對時，較舊的 `Every Session`/`Safety` 標題也會被接受作為舊版後備方案。
- `model`：僅用於壓縮摘要的可選 `provider/model-id` 覆寫。當主工作階段應保留一個模型但壓縮摘要應在另一個模型上執行時，請使用此選項；未設定時，壓縮會使用工作階段的主要模型。
- `notifyUser`：當設為 `true` 時，會在壓縮開始和完成時向使用者發送簡短通知（例如「正在壓縮上下文...」和「壓縮完成」）。預設為停用，以讓壓縮過程保持靜默。
- `memoryFlush`：自動壓縮前的靜默代理回合，用於儲存持久記憶。當工作區為唯讀時將跳過。

### `agents.defaults.contextPruning`

在發送給 LLM 之前，從記憶體上下文中修剪**舊的工具結果**。**不**會修改磁碟上的工作階段歷史記錄。

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

<Accordion title="cache-ttl 模式行為">

- `mode: "cache-ttl"` 啟用修剪通道。
- `ttl` 控制修剪可以再次執行的頻率（在最後一次快取觸控之後）。
- 修剪首先軟修剪過大的工具結果，然後在需要時硬清除較舊的工具結果。

**軟修剪**保留開頭 + 結尾，並在中間插入 `...`。

**硬清除**會將整個工具結果替換為預留位置。

註記：

- 影像區塊從不會被修剪/清除。
- 比率是基於字元（大約），而非精確的 token 數量。
- 如果存在的助理訊息少於 `keepLastAssistants` 則會跳過修剪。

</Accordion>

行為詳情請參閱 [會話修剪](/zh-Hant/concepts/session-pruning)。

### 區塊串流

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

- 非 Telegram 頻道需要明確的 `*.blockStreaming: true` 才能啟用區塊回覆。
- 通道覆寫：`channels.<channel>.blockStreamingCoalesce`（以及每個帳號的變體）。Signal/Slack/Discord/Google Chat 預設 `minChars: 1500`。
- `humanDelay`：區塊回覆之間的隨機暫停。`natural` = 800–2500ms。每個代理的覆寫：`agents.list[].humanDelay`。

行為與分塊詳情請參閱 [串流](/zh-Hant/concepts/streaming)。

### 輸入指示器

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

- 預設值：`instant` 用於直接聊天/提及，`message` 用於未提及的群組聊天。
- 每個會話的覆寫：`session.typingMode`，`session.typingIntervalSeconds`。

詳情請參閱 [輸入指示器](/zh-Hant/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

內嵌代理程式的可選沙箱機制。完整指南請參閱 [沙箱](/zh-Hant/gateway/sandboxing)。

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

<Accordion title="沙箱詳細資訊">

**後端：**

- `docker`：本機 Docker 執行環境（預設）
- `ssh`：通用 SSH 支援的遠端執行環境
- `openshell`：OpenShell 執行環境

當選擇 `backend: "openshell"` 時，特定於執行環境的設定會移至
`plugins.entries.openshell.config`。

**SSH 後端設定：**

- `target`：`user@host[:port]` 格式的 SSH 目標
- `command`：SSH 用戶端指令（預設：`ssh`）
- `workspaceRoot`：用於各範圍工作區的絕對遠端根目錄
- `identityFile` / `certificateFile` / `knownHostsFile`：傳遞給 OpenSSH 的現有本機檔案
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在執行時具體化為暫存檔案的內嵌內容或 SecretRefs
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主機金鑰政策控制項

**SSH 認證優先順序：**

- `identityData` 優先於 `identityFile`
- `certificateData` 優先於 `certificateFile`
- `knownHostsData` 優先於 `knownHostsFile`
- SecretRef 支援的 `*Data` 值會在沙箱工作階段開始前從現有的 secrets 執行時快照中解析

**SSH 後端行為：**

- 在建立或重建後將遠端工作區初始化一次
- 然後保持遠端 SSH 工作區為基準
- 透過 SSH 路由 `exec`、檔案工具和媒體路徑
- 不會自動將遠端變更同步回主機
- 不支援沙箱瀏覽器容器

**工作區存取權：**

- `none`：`~/.openclaw/sandboxes` 下的各範圍沙箱工作區
- `ro`：位於 `/workspace` 的沙箱工作區，代理程式工作區以唯讀方式掛載於 `/agent`
- `rw`：代理程式工作區以讀寫方式掛載於 `/workspace`

**範圍：**

- `session`：各工作階段容器 + 工作區
- `agent`：每個代理程式一個容器 + 工作區（預設）
- `shared`：共用容器和工作區（無跨工作階段隔離）

**OpenShell 外掛設定：**

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

**OpenShell 模式：**

- `mirror`：在執行前從本機初始化遠端，在執行後同步回來；本機工作區保持為基準
- `remote`：在建立沙箱時初始化遠端一次，然後保持遠端工作區為基準

在 `remote` 模式下，在 OpenClaw 之外進行的本機編輯不會在初始化步驟後自動同步到沙箱中。
傳輸方式是 SSH 進入 OpenShell 沙箱，但外掛擁有沙箱生命週期和可選的鏡像同步。

**`setupCommand`** 在容器建立後執行一次（透過 `sh -lc`）。需要網路出口、可寫入根目錄、root 使用者。

**容器預設為 `network: "none"`** — 如果代理程式需要出站存取權，請設定為 `"bridge"`（或自訂橋接網路）。
`"host"` 已被封鎖。`"container:<id>"` 預設已封鎖，除非您明確設定
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（緊急情況）。

**傳入附件** 會被暫存至作用中工作區的 `media/inbound/*` 中。

**`docker.binds`** 會掛載額外的主機目錄；全域和各代理程式的綁定會合併。

**沙箱瀏覽器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 已注入系統提示。不需要 `openclaw.json` 中的 `browser.enabled`。
noVNC 觀察者存取權預設使用 VNC 認證，且 OpenClaw 會發出一個短期有效的 Token URL（而不是在共用 URL 中暴露密碼）。

- `allowHostControl: false`（預設）會封鎖沙箱工作階段將主機瀏覽器作為目標。
- `network` 預設為 `openclaw-sandbox-browser`（專用橋接網路）。僅當您明確需要全域橋接連線時才設定為 `bridge`。
- `cdpSourceRange` 可選地將容器邊緣的 CDP 入站限制為 CIDR 範圍（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 僅將額外的主機目錄掛載到沙箱瀏覽器容器中。設定時（包括 `[]`），它會取代瀏覽器容器的 `docker.binds`。
- 啟動預設定義於 `scripts/sandbox-browser-entrypoint.sh` 中，並針對容器主機進行了調整：
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
  - `--disable-extensions`（預設啟用）
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 預設
    已啟用，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 停用。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 如果您的工作流程
    依賴擴充功能，則會重新啟用它們。
  - `--renderer-process-limit=2` 可以透過
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 變更；設定 `0` 以使用 Chromium 的
    預設程序限制。
  - 加上當啟用 `noSandbox` 時的 `--no-sandbox` 和 `--disable-setuid-sandbox`。
  - 預設值是容器映像檔基準；使用自訂瀏覽器映像檔搭配自訂
    進入點以變更容器預設值。

</Accordion>

瀏覽器沙盒和 `sandbox.docker.binds` 僅限 Docker 使用。

建置映像檔：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list` (每個代理程式的覆寫)

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

- `id`：穩定的代理程式 ID (必要)。
- `default`：當設定多個時，以第一個為準 (會記錄警告)。若未設定，預設為列表中的第一個項目。
- `model`：字串形式僅覆寫 `primary`；物件形式 `{ primary, fallbacks }` 則覆寫兩者 (`[]` 會停用全域後備)。若排程工作僅覆寫 `primary`，除非您設定 `fallbacks: []`，否則仍會繼承預設後備。
- `params`：每個代理程式的串流參數，會與 `agents.defaults.models` 中選定的模型項目合併。使用此設定可進行特定代理程式的覆寫，例如 `cacheRetention`、`temperature` 或 `maxTokens`，而無需複製整個模型目錄。
- `skills`：選用的每個代理程式技能允許清單。若省略，當設定 `agents.defaults.skills` 時，代理程式會繼承它；明確的清單會取代預設值而不是合併，而 `[]` 表示沒有技能。
- `thinkingDefault`：可選的每個代理程式預設思考層級（`off | minimal | low | medium | high | xhigh | adaptive | max`）。當未設定每個訊息或會話覆寫時，會覆寫此代理程式的 `agents.defaults.thinkingDefault`。
- `reasoningDefault`：選用的每個代理程式預設推理可見性 (`on | off | stream`)。當未設定每個訊息或工作階段的推理覆寫時適用。
- `fastModeDefault`：選用的每個代理程式快速模式 (`true | false`) 預設值。當未設定每個訊息或工作階段的快速模式覆寫時適用。
- `embeddedHarness`：選用的每個代理程式低層級配接器原則覆寫。使用 `{ runtime: "codex", fallback: "none" }` 讓某個代理程式僅使用 Codex，同時讓其他代理程式保留預設的 PI 後備。
- `runtime`：可選的每個代理執行時描述符。當代理應預設為 ACP 韁體會話時，請使用 `type: "acp"` 搭配 `runtime.acp` 預設值（`agent`、`backend`、`mode`、`cwd`）。
- `identity.avatar`：工作區相對路徑、`http(s)` URL 或 `data:` URI。
- `identity` 推導預設值：`ackReaction` 來自 `emoji`，`mentionPatterns` 來自 `name`/`emoji`。
- `subagents.allowAgents`：用於 `sessions_spawn` 的代理 ID 允許清單（`["*"]` = 任何；預設值：僅限相同代理）。
- Sandbox 繼承防護：如果請求者會話位於 sandbox 中，`sessions_spawn` 將拒絕將在非 sandbox 環境中執行的目標。
- `subagents.requireAgentId`：若為 true，則封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔；預設值：false）。

---

## 多重代理路由

在單一閘道內執行多個隔離的代理程式。詳情請參閱 [多代理程式](/zh-Hant/concepts/multi-agent)。

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

### 綁定匹配欄位

- `type` (可選)：`route` 用於正常路由（缺少類型則預設為路由），`acp` 用於持久 ACP 對話綁定。
- `match.channel` (必填)
- `match.accountId` (可選；`*` = 任何帳戶；省略 = 預設帳戶)
- `match.peer` (可選；`{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (可選；通道特定)
- `acp` (可選；僅限用於 `type: "acp"`)：`{ mode, label, cwd, backend }`

**確定性匹配順序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` （精確，無 peer/guild/team）
5. `match.accountId: "*"` （整個頻道）
6. 預設代理程式

在每個層級中，第一個匹配的 `bindings` 項目獲勝。

對於 `type: "acp"` 項目，OpenClaw 根據精確的對話身分（`match.channel` + account + `match.peer.id`）進行解析，並且不使用上述的路由綁定層級順序。

### 各代理程式的存取設定檔

<Accordion title="完全存取（無沙箱）">

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

<Accordion title="唯讀工具 + 工作區">

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

<Accordion title="無檔案系統存取權（僅限訊息傳遞）">

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

優先順序詳情請參閱 [多代理程式沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools)。

---

## 工作階段

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

<Accordion title="Session 欄位詳情">

- **`scope`**: 群組聊天情境的基礎會話分組策略。
  - `per-sender` (預設值): 每個傳送者在頻道情境內都會獲得一個獨立的會話。
  - `global`: 頻道情境中的所有參與者共享單一會話 (僅在意圖共用情境時使用)。
- **`dmScope`**: 如何將訊息 (DM) 分組。
  - `main`: 所有訊息共用主會話。
  - `per-peer`: 依據跨頻道的傳送者 ID 進行隔離。
  - `per-channel-peer`: 依據頻道 + 傳送者進行隔離 (建議用於多使用者收件匣)。
  - `per-account-channel-peer`: 依據帳號 + 頻道 + 傳送者進行隔離 (建議用於多帳號)。
- **`identityLinks`**: 將標準 ID 映射至提供者前綴的對等節點，以便進行跨頻道會話共用。
- **`reset`**: 主要重置策略。`daily` 在 `atHour` 當地時間重置；`idle` 在 `idleMinutes` 之後重置。當兩者都設定時，以先到期者為準。
- **`resetByType`**: 各類型的覆寫 (`direct`、`group`、`thread`)。舊版 `dm` 被接受為 `direct` 的別名。
- **`parentForkMaxTokens`**: 建立分叉執行緒會話時允許的最大父會話 `totalTokens` (預設值 `100000`)。
  - 如果父 `totalTokens` 超過此值，OpenClaw 將啟動新的執行緒會話，而不是繼承父會話紀錄。
  - 將 `0` 設為停用此保護並始終允許父會話分叉。
- **`mainKey`**: 舊版欄位。執行階段始終對主要直接聊天區塊使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**: 代理程式之間交換期間的最大回傳輪次 (整數，範圍：`0`–`5`)。`0` 會停用乒乓球鏈結。
- **`sendPolicy`**: 依據 `channel`、`chatType` (`direct|group|channel`，帶有舊版 `dm` 別名)、`keyPrefix` 或 `rawKeyPrefix` 進行匹配。優先套用第一個拒絕規則。
- **`maintenance`**: 會話儲存 (session-store) 清理與保留控制。
  - `mode`: `warn` 僅發出警告；`enforce` 套用清理。
  - `pruneAfter`: 陳舊項目的年限截止 (預設值 `30d`)。
  - `maxEntries`: `sessions.json` 中的最大項目數 (預設值 `500`)。
  - `rotateBytes`: 當 `sessions.json` 超過此大小時進行輪替 (預設值 `10mb`)。
  - `resetArchiveRetention`: `*.reset.<timestamp>` 轉錄檔案的保留設定。預設為 `pruneAfter`；設定 `false` 以停用。
  - `maxDiskBytes`: 可選的會話目錄磁碟預算。在 `warn` 模式下，它會記錄警告；在 `enforce` 模式下，它會優先移除最舊的成品/會話。
  - `highWaterBytes`: 預算清理後的選用目標。預設為 `80%` 的 `maxDiskBytes`。
- **`threadBindings`**: 執行緒綁定會話功能的全域預設值。
  - `enabled`: 主預設開關 (提供者可以覆寫；Discord 使用 `channels.discord.threadBindings.enabled`)。
  - `idleHours`: 預設的非活動自動取消聚焦時間 (小時) (`0` 表示停用；提供者可以覆寫)。
  - `maxAgeHours`: 預設的硬性最大年限 (小時) (`0` 表示停用；提供者可以覆寫)。

</Accordion>

---

## 訊息

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

### 回應前綴

個別頻道/帳號覆寫：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析優先順序（越具體越優先）：帳號 → 頻道 → 全域。`""` 會停用並停止串聯。`"auto"` 會推導 `[{identity.name}]`。

**範本變數：**

| 變數              | 描述           | 範例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 短模型名稱     | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型識別碼 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 供應商名稱     | `anthropic`                 |
| `{thinkingLevel}` | 當前思考層級   | `high`、`low`、`off`        |
| `{identity.name}` | Agent 身份名稱 | （同 `"auto"`）             |

變數不區分大小寫。`{think}` 是 `{thinkingLevel}` 的別名。

### Ack 反應

- 預設為啟用代理的 `identity.emoji`，否則為 `"👀"`。設定 `""` 以停用。
- 個別頻道覆寫：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析順序：帳號 → 頻道 → `messages.ackReaction` → 身份後備。
- 範圍：`group-mentions`（預設）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在 Slack、Discord 和 Telegram 上於回覆後移除 ack。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上啟用生命週期狀態反應。
  在 Slack 和 Discord 上，若未設定，當啟用 ack 反應時，會保持狀態反應啟用。
  在 Telegram 上，需明確設定為 `true` 以啟用生命週期狀態反應。

### 輸入防抖

將來自同一發送者的快速純文字訊息批次處理為單一輪次。媒體/附件會立即排空。控制指令會略過防抖。

### TTS (文字轉語音)

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

- `auto` 控制預設的自動 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆寫本地首選項，而 `/tts status` 則顯示有效狀態。
- `summaryModel` 會針對自動摘要覆寫 `agents.defaults.model.primary`。
- `modelOverrides` 預設為啟用；`modelOverrides.allowProvider` 預設為 `false` (選用)。
- API 金鑰會回退至 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `openai.baseUrl` 會覆寫 OpenAI TTS 端點。解析順序為設定檔，然後是 `OPENAI_TTS_BASE_URL`，接著是 `https://api.openai.com/v1`。
- 當 `openai.baseUrl` 指向非 OpenAI 端點時，OpenClaw 會將其視為 OpenAI 相容的 TTS 伺服器，並放寬模型/語音驗證。

---

## 對話

對話模式的預設值。

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

- 當配置了多個 Talk 提供者時，`talk.provider` 必須符合 `talk.providers` 中的其中一個鍵。
- 舊版扁平 Talk 金鑰 (`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`) 僅供相容性使用，並會自動遷移至 `talk.providers.<provider>`。
- 語音 ID 會回退至 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受純文字字串或 SecretRef 物件。
- `ELEVENLABS_API_KEY` 回退僅在未配置 Talk API 金鑰時套用。
- `providers.*.voiceAliases` 讓 Talk 指令可以使用易記名稱。
- `silenceTimeoutMs` 控制對話模式在使用者停止說話後多久才會發送文字記錄。未設定則保持平台預設的暫停時間視窗 (`700 ms on macOS and Android, 900 ms on iOS`)。

---

## 工具

### 工具設定檔

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定了一個基本允許清單：

本機入門設定會在未設定時將新的本機設定預設為 `tools.profile: "coding"`（保留現有的明確設定檔）。

| 設定檔      | 包含                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 僅限 `session_status`                                                                                                           |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | 無限制（等同於未設定）                                                                                                          |

### 工具群組

| 群組               | 工具                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution`（`bash` 被接受為 `exec` 的別名）                                                    |
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
| `group:openclaw`   | 所有內建工具（不包含提供者插件）                                                                                        |

### `tools.allow` / `tools.deny`

全域工具允許/拒絕原則（拒絕優先）。不區分大小寫，支援 `*` 萬用字元。即使關閉 Docker 沙盒也會套用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

針對特定提供者或模型進一步限制工具。順序：基本設定檔 → 提供者設定檔 → 允許/拒絕。

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

控制沙盒之外的提權執行存取：

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

- 各 Agent 的覆寫（`agents.list[].tools.elevated`）只能進行更進一步的限制。
- `/elevated on|off|ask|full` 依會話儲存狀態；內聯指令則套用於單一訊息。
- 提權的 `exec` 會繞過沙盒並使用設定的逃逸路徑（預設為 `gateway`，當執行目標為 `node` 時則為 `node`）。

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

工具循環安全檢查**預設為停用**。設定 `enabled: true` 以啟動偵測。
設定可以在 `tools.loopDetection` 中全域定義，並在 `agents.list[].tools.loopDetection` 中針對各 Agent 進行覆寫。

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

- `historySize`：為循環分析保留的最大工具呼叫記錄。
- `warningThreshold`：重複無進度模式的警告閾值。
- `criticalThreshold`：封鎖關鍵循環的更高重複閾值。
- `globalCircuitBreakerThreshold`：任何無進度執行的硬體停止閾值。
- `detectors.genericRepeat`：對重複相同工具/相同參數的呼叫發出警告。
- `detectors.knownPollNoProgress`: 對已知的投票工具（`process.poll`、`command_status` 等）發出警告/阻止。
- `detectors.pingPong`: 對交替的無進度對模式發出警告/阻止。
- 如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，驗證將失敗。

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

設定傳入媒體理解（圖像/音訊/視訊）：

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

<Accordion title="媒體模型條目欄位">

**Provider entry** (`type: "provider"` 或省略):

- `provider`：API 提供者 ID（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）
- `model`：模型 ID 覆寫
- `profile` / `preferredProfile`：`auth-profiles.json` 設定檔選擇

**CLI entry** (`type: "cli"`):

- `command`：要執行的可執行檔
- `args`：模板化參數（支援 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等）

**Common fields:**

- `capabilities`：可選列表（`image`、`audio`、`video`）。預設值：`openai`/`anthropic`/`minimax` → 影像，`google` → 影像+音訊+視訊，`groq` → 音訊。
- `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：各條目覆寫。
- 失敗時會退回至下一個條目。

Provider 認證遵循標準順序：`auth-profiles.json` → 環境變數 → `models.providers.*.apiKey`。

**Async completion fields:**

- `asyncCompletion.directSend`：當 `true` 時，已完成的異步 `music_generate`
  與 `video_generate` 任務會先嘗試直接通道傳送。預設值：`false`
  （舊版 requester-session wake/model-delivery 路徑）。

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

控制哪些工作階段可作為工作階段工具（`sessions_list`、`sessions_history`、`sessions_send`）的目標。

預設值：`tree`（目前工作階段 + 其產生的工作階段，例如子代理程式）。

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

備註：

- `self`：僅限目前工作階段金鑰。
- `tree`：目前工作階段 + 由目前工作階段產生的工作階段（子代理程式）。
- `agent`：屬於目前代理程式 ID 的任何工作階段（如果您在同一個代理程式 ID 下執行個別傳送者的工作階段，可能會包含其他使用者）。
- `all`：任何工作階段。跨代理程式鎖定目標仍需 `tools.agentToAgent`。
- 沙盒限制：當目前工作階段受到沙盒限制且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 時，即使 `tools.sessions.visibility="all"`，可見性也會被強制設為 `tree`。

### `tools.sessions_spawn`

控制 `sessions_spawn` 的內嵌附件支援。

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

備註：

- 附件僅支援 `runtime: "subagent"`。ACP 執行時會拒絕它們。
- 檔案會在 `.openclaw/attachments/<uuid>/` 處以 `.manifest.json` 形式具體化到子工作區中。
- 附件內容會從文字記錄持久性中自動編修。
- Base64 輸入會經過嚴格的字元集/填充檢查和解碼前大小保護進行驗證。
- 目錄的檔案權限為 `0700`，檔案則為 `0600`。
- 清理遵循 `cleanup` 原則：`delete` 總是會移除附件；`keep` 僅在 `retainOnSessionKeep: true` 時保留它們。

### `tools.experimental`

實驗性內建工具旗標。除非適用嚴格代理 GPT-5 自動啟用規則，否則預設為關閉。

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

備註：

- `planTool`：啟用結構化的 `update_plan` 工具，用於追蹤非平凡的多步驟工作。
- 預設值為 `false`，除非針對 OpenAI 或 OpenAI Codex GPT-5 系列的執行，將 `agents.defaults.embeddedPi.executionContract`（或每個代理程式的覆寫）設為 `"strict-agentic"`。設定 `true` 以在此範圍之外強制啟用該工具，或設定 `false` 以即使對於嚴格代理式 GPT-5 執行也保持關閉。
- 啟用時，系統提示詞也會新增使用指引，以便模型僅將其用於實質性工作，並且最多保持一個步驟 `in_progress`。

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

- `model`：產生的子代理程式的預設模型。如果省略，子代理程式將繼承呼叫者的模型。
- `allowAgents`：當請求者代理程式未設定其自己的 `subagents.allowAgents` 時，`sessions_spawn` 的目標代理程式 ID 預設允許清單（`["*"]` = 任意；預設值：僅限相同代理程式）。
- `runTimeoutSeconds`：當工具呼叫省略 `runTimeoutSeconds` 時，`sessions_spawn` 的預設逾時（秒）。`0` 表示沒有逾時。
- 每個子代理程式的工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自訂提供者和基本 URL

OpenClaw 使用內建模型目錄。透過設定中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 新增自訂提供者。

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

- 使用 `authHeader: true` + `headers` 進行自訂驗證需求。
- 使用 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`，一個舊版環境變數別名）覆寫代理程式設定根目錄。
- 匹配提供者 ID 的合併優先順序：
  - 非空的代理程式 `models.json` `baseUrl` 值優先採用。
  - 非空的代理程式 `apiKey` 值僅在該提供者未於當前設定/驗證設定檔上下文中由 SecretRef 管理時優先採用。
  - SecretRef 管理的提供者 `apiKey` 值是從來源標記（環境變數參考為 `ENV_VAR_NAME`，檔案/執行參考為 `secretref-managed`）重新整理，而不是持續保存解析後的機密。
  - SecretRef 管理的供應商標頭值會從來源標記重新整理（env refs 為 `secretref-env:ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`）。
  - 空白或缺失的 agent `apiKey`/`baseUrl` 會回退到 config 中的 `models.providers`。
  - 匹配的 model `contextWindow`/`maxTokens` 會使用明確配置與隱式目錄值之間較高的數值。
  - 匹配的 model `contextTokens` 會保留現有的明確執行時間上限；使用它來限制有效上下文，而不變更原生 model 元數據。
  - 當您希望配置完全覆寫 `models.json` 時，請使用 `models.mode: "replace"`。
  - 標記持久性以來源為準：標記是從作用中來源配置快照（解析前）寫入的，而非來自已解析的執行時間 secret 值。

### 供應商欄位詳細資訊

- `models.mode`：供應商目錄行為（`merge` 或 `replace`）。
- `models.providers`：依供應商 ID 鍵入的自訂供應商映射。
- `models.providers.*.api`：請求配接器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。
- `models.providers.*.apiKey`：供應商憑證（建議優先使用 SecretRef/env 代換）。
- `models.providers.*.auth`：驗證策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
- `models.providers.*.injectNumCtxForOpenAICompat`：對於 Ollama + `openai-completions`，將 `options.num_ctx` 注入請求中（預設：`true`）。
- `models.providers.*.authHeader`：在需要時，於 `Authorization` 標頭中強制傳輸憑證。
- `models.providers.*.baseUrl`：上游 API 基礎 URL。
- `models.providers.*.headers`：用於 Proxy/租戶路由的額外靜態標頭。
- `models.providers.*.request`: 模型供應商 HTTP 請求的傳輸覆寫。
  - `request.headers`: 額外的標頭（與供應商預設值合併）。數值接受 SecretRef。
  - `request.auth`: 驗證策略覆寫。模式：`"provider-default"`（使用供應商的內建驗證）、`"authorization-bearer"`（帶 `token`）、`"header"`（帶 `headerName`、`value`，選用 `prefix`）。
  - `request.proxy`: HTTP 代理覆寫。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 環境變數）、`"explicit-proxy"`（帶 `url`）。兩種模式都接受選用的 `tls` 子物件。
  - `request.tls`: 直接連線的 TLS 覆寫。欄位：`ca`、`cert`、`key`、`passphrase`（皆接受 SecretRef）、`serverName`、`insecureSkipVerify`。
  - `request.allowPrivateNetwork`: 當 `true` 時，若 DNS 解析為私人、CGNAT 或類似範圍，允許透過供應商 HTTP 擷取防護存取 `baseUrl` 的 HTTPS（操作員針對受信任的自託管 OpenAI 相容端點選擇加入）。WebSocket 使用相同的 `request` 進行標頭/TLS 處理，但不使用該擷取 SSRF 閘道。預設為 `false`。
- `models.providers.*.models`: 明確的供應商模型目錄項目。
- `models.providers.*.models.*.contextWindow`: 原生模型內容視窗中繼資料。
- `models.providers.*.models.*.contextTokens`: 選用的執行時期內容上限。當您想要比模型原生 `contextWindow` 更小的有效內容預算時使用。
- `models.providers.*.models.*.compat.supportsDeveloperRole`：可選的相容性提示。對於具有非空非原生 `baseUrl`（主機非 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 會在執行時將其強制設定為 `false`。空/省略的 `baseUrl` 保持預設的 OpenAI 行為。
- `models.providers.*.models.*.compat.requiresStringContent`：僅限字串的 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求之前將純文字 `messages[].content` 陣列扁平化為純字串。
- `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自動探索設定根目錄。
- `plugins.entries.amazon-bedrock.config.discovery.enabled`：開啟/關閉隱式探索。
- `plugins.entries.amazon-bedrock.config.discovery.region`：用於探索的 AWS 區域。
- `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用於定向探索的可選 provider-id 篩選器。
- `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：探索重新整理的輪詢間隔。
- `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：探索模型的後備上下文視窗。
- `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：探索模型的後備最大輸出 token。

### 提供者範例

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

對 Cerebras 使用 `cerebras/zai-glm-4.7`；對 Z.AI direct 使用 `zai/glm-4.7`。

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

設定 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。對 Zen 目錄使用 `opencode/...` 引用，或對 Go 目錄使用 `opencode-go/...` 引用。捷徑：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

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

設定 `ZAI_API_KEY`。`z.ai/*` 和 `z-ai/*` 是可接受的別名。捷徑：`openclaw onboard --auth-choice zai-api-key`。

- 一般端點：`https://api.z.ai/api/paas/v4`
- 編碼端點（預設）：`https://api.z.ai/api/coding/paas/v4`
- 對於一般端點，請使用基底 URL 覆蓋定義自訂提供者。

</Accordion>

<Accordion title="Moonshot AI (Kimi)">

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.6" },
      models: { "moonshot/kimi-k2.6": { alias: "Kimi K2.6" } },
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
            id: "kimi-k2.6",
            name: "Kimi K2.6",
            reasoning: false,
            input: ["text", "image"],
            cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
        ],
      },
    },
  },
}
```

對於中國端點：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

原生 Moonshot 端點在共享的 `openai-completions` 傳輸上宣佈支援流式使用，並且 OpenClaw 金鑰依賴端點能力，而不僅僅是內建的提供者 ID。

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

Anthropic 相容的內建提供者。捷徑：`openclaw onboard --auth-choice kimi-code-api-key`。

</Accordion>

<Accordion title="Synthetic (Anthropic-compatible)">

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

基底 URL 應省略 `/v1`（Anthropic 客戶端會附加它）。捷徑：`openclaw onboard --auth-choice synthetic-api-key`。

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

設定 `MINIMAX_API_KEY`。捷徑：
`openclaw onboard --auth-choice minimax-global-api` 或
`openclaw onboard --auth-choice minimax-cn-api`。
模型目錄預設僅為 M2.7。
在 Anthropic 相容的串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考功能。`/fast on` 或
`params.fastMode: true` 會將 `MiniMax-M2.7` 重寫為
`MiniMax-M2.7-highspeed`。

</Accordion>

<Accordion title="Local models (LM Studio)">

請參閱 [Local Models](/zh-Hant/gateway/local-models)。TL;DR：在強大的硬體上透過 LM Studio Responses API 執行大型本地模型；保留合併的託管模型作為後備。

</Accordion>

---

## 技能

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

- `allowBundled`：僅針對內建技能的可選允許清單（受管理的/工作區技能不受影響）。
- `load.extraDirs`：額外的共享技能根目錄（優先順序最低）。
- `install.preferBrew`：當為 true 時，如果 `brew` 可用，
  在回退到其他安裝程式類型之前，優先使用 Homebrew 安裝程式。
- `install.nodeManager`：`metadata.openclaw.install`
  規格的節點安裝程式偏好設定（`npm` | `pnpm` | `yarn` | `bun`）。
- `entries.<skillKey>.enabled: false` 會停用技能，即使已內建或安裝。
- `entries.<skillKey>.apiKey`：宣告主要環境變數之技能的便利欄位（純文字字串或 SecretRef 物件）。

---

## 外掛程式

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

- 從 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及 `plugins.load.paths` 載入。
- 探索功能接受原生 OpenClaw 外掛程式，以及相容的 Codex 套件組合和 Claude 套件組合，包括無清單檔案的 Claude 預設佈局套件組合。
- **變更設定需要重新啟動閘道。**
- `allow`：可選的允許清單（僅載入列出的外掛程式）。`deny` 優先。
- `plugins.entries.<id>.apiKey`：外掛程式層級的 API 金鑰便利欄位（當外掛程式支援時）。
- `plugins.entries.<id>.env`：外掛程式範圍的環境變數對應。
- `plugins.entries.<id>.hooks.allowPromptInjection`：當 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示變異欄位，同時保留舊版 `modelOverride` 和 `providerOverride`。適用於原生外掛程式勾點和支援的套件組合提供的勾點目錄。
- `plugins.entries.<id>.subagent.allowModelOverride`：明確信任此外掛程式請求針對背景子代理程式執行的每次執行 `provider` 和 `model` 覆蓋。
- `plugins.entries.<id>.subagent.allowedModels`：用於受信任子代理程式覆蓋的正規 `provider/model` 目標的可選允許清單。僅在您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.config`：外掛程式定義的配置物件（當可用時由原生 OpenClaw 外掛程式架構驗證）。
- `plugins.entries.firecrawl.config.webFetch`：Firecrawl 網頁擷取提供者設定。
  - `apiKey`：Firecrawl API 金鑰（接受 SecretRef）。如果失敗，則回退到 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`：Firecrawl API 基礎 URL（預設值：`https://api.firecrawl.dev`）。
  - `onlyMainContent`：僅從頁面擷取主要內容（預設值：`true`）。
  - `maxAgeMs`：最大快取期限（以毫秒為單位）（預設值：`172800000` / 2 天）。
  - `timeoutSeconds`：擷取請求逾時時間（以秒為單位）（預設值：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 網頁搜尋) 設定。
  - `enabled`：啟用 X Search 提供者。
  - `model`：用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：記憶體夢境設定。請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以了解階段和閾值。
  - `enabled`：主夢境開關（預設值 `false`）。
  - `frequency`：每次完整夢境掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - 階段策略和閾值屬於實作細節（非使用者面向的配置金鑰）。
- 完整的記憶體設定位於 [Memory configuration reference](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude 套件外掛程式也可以從 `settings.json` 提供內嵌的 Pi 預設值；OpenClaw 會將這些套用為經過清理的代理程式設定，而非原始的 OpenClaw 設定檔補丁。
- `plugins.slots.memory`：選擇啟用的記憶體外掛程式 ID，或設為 `"none"` 以停用記憶體外掛程式。
- `plugins.slots.contextEngine`：選擇啟用的內容引擎外掛程式 ID；除非您安裝並選擇了其他引擎，否則預設為 `"legacy"`。
- `plugins.installs`：由 `openclaw plugins update` 使用的 CLI 管理安裝中介資料。
  - 包含 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。
  - 將 `plugins.installs.*` 視為受管理狀態；優先使用 CLI 指令而非手動編輯。

請參閱 [Plugins](/zh-Hant/tools/plugin)。

---

## 瀏覽器

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

- `evaluateEnabled: false` 會停用 `act:evaluate` 和 `wait --fn`。
- 若未設定則停用 `ssrfPolicy.dangerouslyAllowPrivateNetwork`，因此瀏覽器瀏覽預設保持嚴格模式。
- 僅當您有意信任私人網路瀏覽器瀏覽時，才設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在連線能力/探索檢查期間也會受到相同的私人網路封鎖。
- `ssrfPolicy.allowPrivateNetwork` 作為舊版別名仍受支援。
- 在嚴格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 進行明確的例外設定。
- 遠端設定檔僅支援連線 (attach) (已停用 start/stop/reset)。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  當您希望 OpenClaw 自動發現 `/json/version` 時，請使用 HTTP(S)；當您的提供者提供直接的 DevTools WebSocket URL 時，請使用 WS(S)。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，並且可以在選定的主機上或透過連線的瀏覽器節點進行附加。
- `existing-session` 設定檔可以設定 `userDataDir` 以指定特定的
  基於 Chromium 的瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔保持目前的 Chrome MCP 路由限制：
  使用快照/ref 驅動的操作而非 CSS 選擇器定位、單一檔案上傳
  攔截、無對話方塊逾時覆寫、無 `wait --load networkidle`，且無
  `responsebody`、PDF 匯出、下載攔截或批次操作。
- 本機管理的 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅
  針對遠端 CDP 明確設定 `cdpUrl`。
- 自動偵測順序：預設瀏覽器 (若基於 Chromium) → Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服務：僅限回環 (port 由 `gateway.port` 推導，預設為 `18791`)。
- `extraArgs` 會將額外的啟動參數附加到本機 Chromium 啟動程序中 (例如
  `--disable-gpu`、視窗大小調整或除錯旗標)。

---

## UI

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

- `seamColor`：原生應用程式 UI chrome 的強調色 (對話模式氣泡色彩等)。
- `assistant`：控制 UI 身分覆寫。預設為使用中的代理程式身分。

---

## 閘道

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
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // dangerous: allow absolute external http(s) embed URLs
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

<Accordion title="Gateway 欄位詳情">

- `mode`：`local`（執行閘道）或 `remote`（連線至遠端閘道）。除非是 `local`，否則閘道會拒絕啟動。
- `port`：WS + HTTP 的單一多工連接埠。優先順序：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback`（預設）、`lan`（`0.0.0.0`）、`tailnet`（僅限 Tailscale IP），或 `custom`。
- **舊版綁定別名**：請在 `gateway.bind` 中使用綁定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），而不是主機別名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 注意事項**：預設的 `loopback` 綁定會接聽容器內的 `127.0.0.1`。使用 Docker 橋接網路（`-p 18789:18789`）時，流量會到達 `eth0`，因此無法連線至閘道。請使用 `--network host`，或是設定 `bind: "lan"`（或搭配 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`）以接聽所有介面。
- **驗證**：預設為必填。非回環綁定需要閘道驗證。實務上這代表共用權杖/密碼，或是具備 `gateway.auth.mode: "trusted-proxy"` 的身分識別感知反向代理。入門精靈預設會產生權杖。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），請將 `gateway.auth.mode` 明確設定為 `token` 或 `password`。當同時設定兩者且模式未設定時，啟動和服務安裝/修復流程會失敗。
- `gateway.auth.mode: "none"`：明確的無驗證模式。僅適用於受信任的本機回環設定；入門提示刻意未提供此選項。
- `gateway.auth.mode: "trusted-proxy"`：將驗證委派給身分識別感知反向 Proxy，並信任來自 `gateway.trustedProxies` 的身分標頭（請參閱[受信任 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)）。此模式預期來自**非回環**的 Proxy 來源；同主機回環反向 Proxy 不符合受信任 Proxy 驗證的條件。
- `gateway.auth.allowTailscale`：當 `true` 時，Tailscale Serve 身分標頭可以滿足 Control UI/WebSocket 驗證（透過 `tailscale whois` 驗證）。HTTP API 端點**不會**使用該 Tailscale 標頭驗證；它們會改為遵循閘道的正常 HTTP 驗證模式。這個無權杖流程假設閘道主機是受信任的。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：選用的失敗驗證限制器。會針對每個客戶端 IP 和每個驗證範圍套用（shared-secret 和 device-token 會獨立追蹤）。被封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve Control UI 路徑上，相同 `{scope, clientIp}` 的失敗嘗試會在寫入失敗之前序列化。因此，來自同一個客戶端的併發錯誤嘗試可能會在第二個請求時觸發限制器，而不是兩者皆作為單純的不符而競爭通過。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；當您刻意想要對 localhost 流量也進行速率限制時（例如測試設定或嚴格的 Proxy 部署），請設定 `false`。
- 來自瀏覽器來源的 WS 驗證嘗試一律會進行節流，並停用回環豁免（針對瀏覽器式 localhost 暴力攻擊的縱深防禦）。
- 在回環上，這些瀏覽器來源鎖定會依據標準化的 `Origin`
  值區隔，因此來自一個 localhost 來源的重複失敗並不會自動
  鎖定不同的來源。
- `tailscale.mode`：`serve`（僅限 tailnet，回環綁定）或 `funnel`（公開，需要驗證）。
- `controlUi.allowedOrigins`：Gateway WebSocket 連線的明確瀏覽器來源允許清單。當預期來自非回環來源的瀏覽器用戶端時，此為必填。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危險模式，會針對刻意依賴 Host 標頭來源原則的部署啟用 Host 標頭來源後援。
- `remote.transport`：`ssh`（預設）或 `direct` (ws/wss)。若為 `direct`，`remote.url` 必須是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：用戶端緊急覆寫，允許對受信任的私人網路 IP 使用純文字 `ws://`；純文字的預設值仍維持僅限回環。
- `gateway.remote.token` / `.password` 是遠端用戶端認證欄位。它們本身不會設定閘道驗證。
- `gateway.push.apns.relay.baseUrl`：外部 APNs 中繼的基礎 HTTPS URL，供官方/TestFlight iOS 版本在將中繼支援的註冊發佈至閘道後使用。此 URL 必須符合編譯至 iOS 版本中的中繼 URL。
- `gateway.push.apns.relay.timeoutMs`：閘道至中繼的傳送逾時（以毫秒為單位）。預設為 `10000`。
- 中繼支援的註冊會委派給特定的閘道身分。配對的 iOS 應用程式會取得 `gateway.identity.get`，在該身分包含在中繼註冊中，並將註冊範圍的傳送授權轉發至閘道。另一個閘道無法重複使用該儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中繼設定的暫時環境變數覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：僅供開發使用的回環 HTTP 中繼 URL 逃生門。生產環境中繼 URL 應維持使用 HTTPS。
- `gateway.channelHealthCheckMinutes`：通道健康監控間隔（以分鐘為單位）。設定 `0` 以全域停用健康監控重新啟動。預設值：`5`。
- `gateway.channelStaleEventThresholdMinutes`：過時 Socket 臨界值（以分鐘為單位）。請將此值保持大於或等於 `gateway.channelHealthCheckMinutes`。預設值：`30`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶在滾動一小時內的最大健康監控重新啟動次數。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全域監控啟用的情況下，針對健康監控重新啟動的各通道退出選項。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多帳戶通道的各帳戶覆寫。設定後，其優先順序高於通道層級覆寫。
- 本機閘道呼叫路徑只有在 `gateway.auth.*` 未設定時，才能使用 `gateway.remote.*` 作為後援。
- 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定且未解析，解析會失敗封閉（不會遮蔽遠端後援）。
- `trustedProxies`：終止 TLS 或插入轉送用戶端標頭的反向 Proxy IP。請僅列出您控制的 Proxy。回環項目在同主機 Proxy/本機偵測設定（例如 Tailscale Serve 或本機反向 Proxy）中仍然有效，但它們**不會**讓回環要求符合 `gateway.auth.mode: "trusted-proxy"` 的條件。
- `allowRealIpFallback`：當 `true` 時，如果缺少 `X-Forwarded-For`，閘道會接受 `X-Real-IP`。預設為 `false` 以採取失敗封閉行為。
- `gateway.tools.deny`：針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱（延伸預設拒絕清單）。
- `gateway.tools.allow`：從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- Chat Completions：預設停用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入強化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空白允許清單將視為未設定；請使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    及/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用回應強化標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` （僅針對您控制的 HTTPS 來源設置；請參閱[受信任的代理驗證](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多執行個體隔離

在單一主機上使用唯一連接埠和狀態目錄執行多個閘道：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便便旗標：`--dev` (使用 `~/.openclaw-dev` + 連接埠 `19001`)，`--profile <name>` (使用 `~/.openclaw-<name>`)。

請參閱[多個閘道](/zh-Hant/gateway/multiple-gateways)。

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

- `enabled`：啟用閘道監聽器 (HTTPS/WSS) 處的 TLS 終止 (預設：`false`)。
- `autoGenerate`：若未設定明確的檔案，則自動產生本機的自我簽署憑證/金鑰組；僅供本機/開發用途。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私鑰檔案的檔案系統路徑；請保持權限限制。
- `caPath`：選用的 CA 捆綁路徑，用於用戶端驗證或自訂信任鏈。

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

- `mode`：控制如何在執行時期套用設定編輯。
  - `"off"`：忽略即時編輯；變更需要明確重新啟動。
  - `"restart"`：設定變更時一律重新啟動閘道程序。
  - `"hot"`：在程序內套用變更而不重新啟動。
  - `"hybrid"` (預設)：先嘗試熱重載；若需要則退回重新啟動。
- `debounceMs`：在套用設定變更前的防彈跳視窗 (毫秒) (非負整數)。
- `deferralTimeoutMs`：在強制重新啟動前等待進行中操作的最大毫秒時間（預設值：`300000` = 5 分鐘）。

---

## 鉤子 (Hooks)

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:", "hook:gmail:"],
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

驗證：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
查詢字串 (Query-string) 鉤子令牌將被拒絕。

驗證與安全注意事項：

- `hooks.enabled=true` 需要一個非空的 `hooks.token`。
- `hooks.token` 必須與 `gateway.auth.token` **不同**；重複使用 Gateway 令牌將被拒絕。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果映射或預設使用範本化的 `sessionKey`，請設置 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態映射鍵不需要該選擇加入。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅當 `hooks.allowRequestSessionKey=true` 時，才接受來自請求負載的 `sessionKey`（預設值：`false`）。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 範本渲染的映射 `sessionKey` 值被視為外部提供，並且還需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應詳情">

- `match.path` 匹配 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路徑的 payload 欄位。
- 像 `{{messages[0].subject}}` 這樣的樣板會從 payload 中讀取。
- `transform` 可以指向返回 hook 動作的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，且必須保持在 `hooks.transformsDir` 內（絕對路徑和遍歷路徑會被拒絕）。
- `agentId` 路由到特定的代理程式；未知的 ID 會退回到預設值。
- `allowedAgentIds`：限制明確路由（`*` 或省略 = 允許所有，`[]` = 拒絕所有）。
- `defaultSessionKey`：可選的固定會話金鑰，用於沒有明確 `sessionKey` 的 hook 代理程式執行。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和樣板驅動的對應會話金鑰來設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：明確 `sessionKey` 值（請求 + 對應）的可選前綴允許清單，例如 `["hook:"]`。當任何對應或預設集使用樣板化的 `sessionKey` 時，它將變為必要項目。
- `deliver: true` 將最終回覆發送到頻道；`channel` 預設為 `last`。
- `model` 覆寫此 hook 執行的 LLM（如果設定了模型目錄，則必須被允許）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設集使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該每封訊息路由，請設定 `hooks.allowRequestSessionKey: true` 並限制 `hooks.allowedSessionKeyPrefixes` 以符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態的 `sessionKey` 覆蓋預設，而不是使用預設的模板。

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

- 在配置後，Gateway 會在啟動時自動啟動 `gog gmail watch serve`。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用。
- 請勿在 Gateway 旁邊單獨運行 `gog gmail watch serve`。

---

## Canvas 主機

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
  },
}
```

- 在 Gateway 連接埠下透過 HTTP 提供可由 Agent 編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本機：保持 `gateway.bind: "loopback"`（預設）。
- 非回環綁定：Canvas 路由需要 Gateway 驗證（token/password/trusted-proxy），與其他 Gateway HTTP 介面相同。
- Node WebViews 通常不發送驗證標頭；在節點配對並連接後，Gateway 會通告節點範圍的 capability URL 用於 Canvas/A2UI 存取。
- Capability URL 綁定到活動的節點 WS 會話並會很快過期。不使用基於 IP 的後備方案。
- 將即時重載客戶端注入到提供的 HTML 中。
- 當為空時，自動建立初始的 `index.html`。
- 同時在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 gateway。
- 對於大型目錄或 `EMFILE` 錯誤，請停用即時重載。

---

## 探索

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

- `minimal`（預設）：在 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`。
- 主機名稱預設為 `openclaw`。使用 `OPENCLAW_MDNS_HOSTNAME` 覆蓋。

### 廣域 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下寫入單播 DNS-SD 區域。對於跨網路探索，請搭配 DNS 伺服器（建議使用 CoreDNS）+ Tailscale 分割 DNS。

設定：`openclaw dns setup --apply`。

---

## 環境

### `env`（內聯環境變數）

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

- 僅當進程環境中缺少該鍵時，才會套用內聯環境變數。
- `.env` 檔案：CWD `.env` + `~/.openclaw/.env`（兩者都不會覆蓋現有的變數）。
- `shellEnv`: 從您的登入 shell 設定檔匯入時缺少預期的金鑰。
- 請參閱 [環境變數](/zh-Hant/help/environment) 以了解完整的優先順序。

### 環境變數替換

使用 `${VAR_NAME}` 在任何設定字串中參照環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅符合大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 缺失/空的變數會在載入設定時拋出錯誤。
- 使用 `$${VAR}` 逸出以表示字面 `${VAR}`。
- 適用於 `$include`。

---

## 機密

機密參照是累加的：純文字值仍然有效。

### `SecretRef`

使用一種物件形狀：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

驗證：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：絕對 JSON 指標（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `source: "exec"` id 不得包含 `.` 或 `..` 斜線分隔路徑區段（例如 `a/../b` 會被拒絕）

### 支援的憑證介面

- 標準矩陣：[SecretRef 憑證介面](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 目標支援 `openclaw.json` 憑證路徑。
- `auth-profiles.json` 參照包含在執行階段解析和稽核覆蓋範圍中。

### 機密提供者設定

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

備註：

- `file` 提供者支援 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下，`id` 必須為 `"value"`）。
- `exec` 提供者需要絕對 `command` 路徑，並在 stdin/stdout 上使用通訊協定承載。
- 根據預設，符號連結指令路徑會被拒絕。設定 `allowSymlinkCommand: true` 以在驗證解析後的目標路徑時允許符號連結路徑。
- 如果配置了 `trustedDirs`，信任目錄檢查將套用於解析後的目標路徑。
- `exec` 子環境預設為最小化；請使用 `passEnv` 明確傳遞所需的變數。
- Secret 參照會在啟動時解析為記憶體內的快照，然後請求路徑僅讀取該快照。
- 啟動期間會套用啟用介面過濾：已啟用介面上未解析的參照會導致啟動/重新載入失敗，而非啟用介面則會被跳過並輸出診斷資訊。

---

## Auth storage

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

- 每個 Agent 的設定檔儲存在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 針對靜態憑證模式支援值級別的參照（對於 `api_key` 為 `keyRef`，對於 `token` 為 `tokenRef`）。
- OAuth 模式設定檔 (`auth.profiles.<id>.mode = "oauth"`) 不支援由 SecretRef 支援的 auth-profile 憑證。
- 靜態執行時憑證來自記憶體內解析的快照；當發現舊版靜態 `auth.json` 項目時會將其清除。
- 來自 `~/.openclaw/credentials/oauth.json` 的舊版 OAuth 匯入。
- 請參閱 [OAuth](/zh-Hant/concepts/oauth)。
- Secrets 執行時行為和 `audit/configure/apply` 工具：[Secrets Management](/zh-Hant/gateway/secrets)。

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

- `billingBackoffHours`：當設定檔因真正的帳單/餘額不足錯誤而失敗時，以小時為單位的基本退避時間 (預設：`5`)。即使是在 `401`/`403` 回應上，明確的帳單文字仍然可能落入此處，但供應商特定的文字匹配器仍限制在擁有它們的供應商範圍內 (例如 OpenRouter `Key limit exceeded`)。可重試的 HTTP `402` 使用量視窗或組織/工作區支出限制訊息則會改走 `rate_limit` 路徑。
- `billingBackoffHoursByProvider`：可選的各供應商覆寫，用於設定帳單退避小時數。
- `billingMaxHours`：計費退避指數增長的小時上限（預設：`24`）。
- `authPermanentBackoffMinutes`：高置信度 `auth_permanent` 失敗的基礎退避時間（分鐘）（預設：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增長的分鐘上限（預設：`60`）。
- `failureWindowHours`：用於退避計數器的滾動視窗（小時）（預設：`24`）。
- `overloadedProfileRotations`：在切換到模型回退之前，針對過載錯誤的最大相同提供商 auth-profile 輪換次數（預設：`1`）。提供商忙碌的形狀，例如 `ModelNotReadyException` 會落在這裡。
- `overloadedBackoffMs`：在重試過載的提供商/個人檔案輪換之前的固定延遲（預設：`0`）。
- `rateLimitedProfileRotations`：在切換到模型回退之前，針對速率限制錯誤的最大相同提供商 auth-profile 輪換次數（預設：`1`）。該速率限制儲存桶包括提供商形狀的文字，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

---

## 日誌記錄

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

- 預設日誌檔案：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`。
- 設定 `logging.file` 以獲得穩定的路徑。
- 當 `--verbose` 時，`consoleLevel` 會跳升至 `debug`。
- `maxFileBytes`：禁止寫入前的最大日誌檔案大小（位元組）（正整數；預設：`524288000` = 500 MB）。對於生產環境部署，請使用外部日誌輪換。

---

## 診斷

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

- `enabled`：檢測儀輸出的主切換開關（預設：`true`）。
- `flags`：啟用目標日誌輸出的旗標字串陣列（支援萬用字元，例如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：當會話保持處理狀態時，發出卡住會示警的時間閾值（毫秒）。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設值：`false`）。
- `otel.endpoint`：OTel 匯出的收集器 URL。
- `otel.protocol`：`"http/protobuf"`（預設值）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出請求發送的額外 HTTP/gRPC 元資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或日誌匯出。
- `otel.sampleRate`：追蹤採樣率 `0`–`1`。
- `otel.flushIntervalMs`：定期遙測排清間隔（毫秒）。
- `cacheTrace.enabled`：記錄嵌入式執行的快取追蹤快照（預設值：`false`）。
- `cacheTrace.filePath`：快取追蹤 JSONL 的輸出路徑（預設值：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制快取追蹤輸出中包含的內容（全部預設值為 `true`）。

---

## 更新

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

- `channel`：npm/git 安裝的發布通道 — `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：閘道啟動時檢查 npm 更新（預設值：`true`）。
- `auto.enabled`：為套件安裝啟用背景自動更新（預設值：`false`）。
- `auto.stableDelayHours`：穩定通道自動套用前的最小延遲小時數（預設值：`6`；最大值：`168`）。
- `auto.stableJitterHours`：額外的穩定版通道推出分佈視窗，單位為小時（預設：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：Beta 通道檢查的運行頻率，單位為小時（預設：`1`；最大值：`24`）。

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

- `enabled`：全域 ACP 功能開關（預設：`false`）。
- `dispatch.enabled`：ACP 會話回合調度的獨立開關（預設：`true`）。設定 `false` 可在保留 ACP 指令可用的同時阻擋執行。
- `backend`：預設的 ACP 執行後端 ID（必須符合已註冊的 ACP 執行插件）。
- `defaultAgent`：當產生未指定明確目標時，使用的備用 ACP 目標代理 ID。
- `allowedAgents`：允許進行 ACP 執行階段會話的代理 ID 白名單；留空表示沒有額外限制。
- `maxConcurrentSessions`：最大同時活躍 ACP 會話數。
- `stream.coalesceIdleMs`：串流文字的閒置排清視窗，單位為毫秒。
- `stream.maxChunkChars`：分割串流區塊投射前的最大區塊大小。
- `stream.repeatSuppression`：抑制每回合重複的狀態/工具行（預設：`true`）。
- `stream.deliveryMode`：`"live"` 累加式串流；`"final_only"` 緩衝直到回合終端事件。
- `stream.hiddenBoundarySeparator`：隱藏工具事件後可見文字之前的分隔符（預設：`"paragraph"`）。
- `stream.maxOutputChars`：每個 ACP 回合投射的助理最大輸出字元數。
- `stream.maxSessionUpdateChars`：投射 ACP 狀態/更新行的最大字元數。
- `stream.tagVisibility`：標籤名稱至串流事件布林值可見性覆寫的記錄。
- `runtime.ttlMinutes`：ACP 會話工作者的閒置 TTL，單位為分鐘，之後可進行清理。
- `runtime.installCommand`：在引導 ACP 執行時環境時執行的可選安裝指令。

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

- `cli.banner.taglineMode` 控制橫幅標語樣式：
  - `"random"`（預設值）：輪換顯示有趣/季節性標語。
  - `"default"`：固定的中性標語（`All your chats, one OpenClaw.`）。
  - `"off"`：無標語文字（仍會顯示橫幅標題/版本）。
- 若要隱藏整個橫幅（不僅僅是標語），請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

---

## 精靈

由 CLI 引導設定流程寫入的元資料（`onboard`、`configure`、`doctor`）：

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

## 身分

請參閱 [Agent 預設值](#agent-defaults) 下的 `agents.list` 身分欄位。

---

## 橋接器（舊版，已移除）

目前版本不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 金鑰不再是配置架構的一部分（移除前驗證會失敗；`openclaw doctor --fix` 可剔除未知金鑰）。

<Accordion title="舊版橋接器配置（歷史參考）">

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

- `sessionRetention`：在從 `sessions.json` 修剪之前保留已完成獨立 cron 執行階段的時間長度。同時也控制已封存刪除 cron 腳本的清理。預設值：`24h`；設定 `false` 以停用。
- `runLog.maxBytes`：修剪前每個執行日誌檔案的最大大小（`cron/runs/<jobId>.jsonl`）。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：觸發執行日誌修剪時保留的最新行數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 傳遞（`delivery.mode = "webhook"`）的持有人令牌，如果省略則不發送驗證標頭。
- `webhook`：已棄用的舊版後援 webhook URL (http/https)，僅用於仍具有 `notify: true` 的已儲存作業。

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

- `maxAttempts`：單次任務在暫時性錯誤上的最大重試次數（預設：`3`；範圍：`0`–`10`）。
- `backoffMs`：每次重試嘗試的退避延遲陣列，單位為毫秒（預設：`[30000, 60000, 300000]`；1–10 個項目）。
- `retryOn`：觸發重試的錯誤類型 — `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略以重試所有暫時性類型。

僅適用於單次 cron 任務。週期性任務使用獨立的失敗處理機制。

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

- `enabled`：啟用 cron 任務的失敗警示（預設：`false`）。
- `after`：觸發警示前的連續失敗次數（正整數，最小值：`1`）。
- `cooldownMs`：同一任務重複警示之間的最小毫秒數（非負整數）。
- `mode`：傳遞模式 — `"announce"` 透過頻道訊息發送；`"webhook"` 發布至設定的 webhook。
- `accountId`：用於限定警示傳遞範圍的選用帳號或頻道 ID。

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

- 所有任務的 cron 失敗通知的預設目的地。
- `mode`：`"announce"` 或 `"webhook"`；當存在足夠的目標資料時，預設為 `"announce"`。
- `channel`：公告傳遞的頻道覆寫。`"last"` 會重用最後已知的傳遞頻道。
- `to`：明確的公告目標或 webhook URL。Webhook 模式必填。
- `accountId`：傳遞的選用帳號覆寫。
- 各任務的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當未設定全域或每個任務的失敗目標時，已透過 `announce` 傳送的任務在失敗時會回退到該主要通告目標。
- `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 任務，除非該任務的主要 `delivery.mode` 是 `"webhook"`。

請參閱 [Cron Jobs](/zh-Hant/automation/cron-jobs)。隔離的 cron 執行會被追蹤為 [背景任務](/zh-Hant/automation/tasks)。

---

## 媒體模型模板變數

在 `tools.media.models[].args` 中展開的模板佔位符：

| 變數               | 描述                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的訊息內文                               |
| `{{RawBody}}`      | 原始內文（無歷史記錄/發送者包裝器）          |
| `{{BodyStripped}}` | 已移除群組提及的內文                         |
| `{{From}}`         | 發送者識別碼                                 |
| `{{To}}`           | 目標識別碼                                   |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前的工作階段 UUID                          |
| `{{IsNewSession}}` | 建立新工作階段時的 `"true"`                  |
| `{{MediaUrl}}`     | 傳入媒體虛擬 URL                             |
| `{{MediaPath}}`    | 本地媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（image/audio/document/…）           |
| `{{Transcript}}`   | 音訊逐字稿                                   |
| `{{Prompt}}`       | 針對 CLI 項目解析的媒體提示                  |
| `{{MaxChars}}`     | 針對 CLI 項目解析的最大輸出字元數            |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群組主旨（盡最大努力）                       |
| `{{GroupMembers}}` | 群組成員預覽（盡最大努力）                   |
| `{{SenderName}}`   | 發送者顯示名稱（盡最大努力）                 |
| `{{SenderE164}}`   | 發送者電話號碼（盡最大努力）                 |
| `{{Provider}}`     | 提供者提示（whatsapp, telegram, discord 等） |

---

## 組態包含（`$include`）

將組態拆分為多個檔案：

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

**合併行為：**

- 單一檔案：取代包含的物件。
- 檔案陣列：按順序深度合併（後者覆蓋前者）。
- 同層級鍵：在包含項之後合併（覆蓋包含的值）。
- 巢狀包含：最多深達 10 層。
- 路徑：相對於包含檔案解析，但必須保持在頂層設定目錄（`dirname` of `openclaw.json`）內。僅當絕對/`../` 形式仍在該邊界內解析時才允許。
- 錯誤：針對缺失檔案、解析錯誤和循環包含的清晰訊息。

---

_相關：[Configuration](/zh-Hant/gateway/configuration) · [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_
