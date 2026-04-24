---
title: "Configuration Reference"
summary: "Gateway config reference for core OpenClaw keys, defaults, and links to dedicated subsystem references"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

# 設定參考

`~/.openclaw/openclaw.json` 的核心配置參考。若要了解以任務為導向的概述，請參閱 [Configuration](/zh-Hant/gateway/configuration)。

此頁面涵蓋主要的 OpenClaw 設定介面，當子系統有自己更深入的參考資料時會提供連結。它**不**會試圖在單一頁面中內嵌每個通道/外掛擁有的指令目錄或每個深度記憶體/QMD 旋鈕。

程式碼真相：

- `openclaw config schema` 列印用於驗證和控制 UI 的即時 JSON 架構，並在可用時合併捆綁/外掛/通道中繼資料
- `config.schema.lookup` 傳回一個路徑範圍的架構節點，用於鑽取工具
- `pnpm config:docs:check` / `pnpm config:docs:gen` 會根據目前的架構表面驗證配置文件基線雜湊

專屬深度參考資料：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 和 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置之 [Memory configuration reference](/zh-Hant/reference/memory-config)
- 目前內建 + 捆綁命令目錄的 [Slash Commands](/zh-Hant/tools/slash-commands)
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和尾隨逗號）。所有欄位都是選填的 — 省略時 OpenClaw 會使用安全的預設值。

---

## 通道

當配置區段存在時，每個通道會自動啟動（除非 `enabled: false`）。

### 私訊和群組存取

所有通道都支援私訊原則和群組原則：

| 私訊原則           | 行為                                                |
| ------------------ | --------------------------------------------------- |
| `pairing` (預設值) | 未知發送者會收到一次性配對碼；擁有者必須核准        |
| `allowlist`        | 僅限 `allowFrom` 中的寄件者（或已配對的允許存放區） |
| `open`             | 允許所有傳入 DM（需要 `allowFrom: ["*"]`）          |
| `disabled`         | 忽略所有傳入的私訊                                  |

| 群組原則             | 行為                                |
| -------------------- | ----------------------------------- |
| `allowlist` (預設值) | 僅符合已配置允許清單的群組          |
| `open`               | 繞過群組允許清單 (提及閘道仍然適用) |
| `disabled`           | 封鎖所有群組/房間訊息               |

<Note>
`channels.defaults.groupPolicy` 會在提供者的 `groupPolicy` 未設定時設定預設值。
配對碼會在 1 小時後過期。待處理的 DM 配對請求上限為 **每個通道 3 個**。
如果完全缺少提供者區塊（缺少 `channels.<provider>`），執行階段群組原則會回退到 `allowlist` (fail-closed)，並顯示啟動警告。
</Note>

### 頻道模型覆寫

使用 `channels.modelByChannel` 將特定頻道 ID 固定到模型。數值接受 `provider/model` 或已設定的模型別名。當工作階段尚未有模型覆寫（例如，透過 `/model` 設定）時，套用頻道對應。

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

使用 `channels.defaults` 設定跨供應商的共用群組原則與心跳行為：

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

- `channels.defaults.groupPolicy`：當未設定供應商層級的 `groupPolicy` 時的後備群組原則。
- `channels.defaults.contextVisibility`：所有頻道的預設補充內容可見性模式。數值：`all`（預設，包含所有引用/執行緒/歷史內容）、`allowlist`（僅包含來自允許清單發送者的內容）、`allowlist_quote`（與允許清單相同，但保留明確的引用/回覆內容）。各頻道覆寫：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在心跳輸出中包含健康的頻道狀態。
- `channels.defaults.heartbeat.showAlerts`：在心跳輸出中包含降級/錯誤狀態。
- `channels.defaults.heartbeat.useIndicator`：呈現精簡的指示器樣式心跳輸出。

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

<Accordion title="多重帳號 WhatsApp">

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

- 外送指令預設使用帳號 `default`（如果存在）；否則使用第一個設定的帳號 ID（經排序）。
- 可選的 `channels.whatsapp.defaultAccount` 會在符合已設定的帳號 ID 時，覆寫該後備預設帳號選擇。
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
      proxy: "socks5://localhost:9050",
      webhookUrl: "https://example.com/telegram-webhook",
      webhookSecret: "secret",
      webhookPath: "/telegram-webhook",
    },
  },
}
```

- Bot 權杖：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（僅限一般檔案；拒絕符號連結），並以 `TELEGRAM_BOT_TOKEN` 作為預設帳號的後援。
- 可選的 `channels.telegram.defaultAccount` 會在符合已設定的帳號 ID 時，覆寫預設帳號選擇。
- 在多帳號設置（2 個或更多帳號 ID）中，請設定明確的預設值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免備援路由；當此設定缺失或無效時，`openclaw doctor` 會發出警告。
- `configWrites: false` 會封鎖由 Telegram 發起的配置寫入（超級群組 ID 遷移、`/config set|unset`）。
- 具有 `type: "acp"` 的頂層 `bindings[]` 項目會配置論壇主題的持續性 ACP 綁定（在 `match.peer.id` 中使用標準的 `chatId:topic:topicId`）。欄位語義在 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings) 中共用。
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

- 權杖：`channels.discord.token`，其中 `DISCORD_BOT_TOKEN` 作為預設帳號的備援。
- 提供明確 Discord `token` 的直接外撥呼叫會使用該權杖進行呼叫；帳號重試/政策設定仍來自活動執行時段快照中所選的帳號。
- 當符合已設定的帳號 ID 時，選用的 `channels.discord.defaultAccount` 會覆蓋預設帳號選擇。
- 請使用 `user:<id>` (DM) 或 `channel:<id>` (伺服器頻道) 作為傳送目標；不接受純數字 ID。
- 伺服器別名為小寫，並將空格取代為 `-`；頻道金鑰使用別名名稱（無 `#`）。建議優先使用伺服器 ID。
- 機器人發送的訊息預設會被忽略。`allowBots: true` 可啟用此類訊息；使用 `allowBots: "mentions"` 可僅接受提及該機器人的機器人訊息（自身訊息仍會被過濾）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（及頻道覆寫）會捨棄提及其他使用者或角色但未提及該機器人的訊息（不包括 @everyone/@here）。
- `maxLinesPerMessage`（預設值為 17）會分割長訊息，即使字數低於 2000 字。
- `channels.discord.threadBindings` 控制 Discord 執行緒綁定路由：
  - `enabled`：Discord 對於綁定會話功能的覆寫（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及綁定的傳送/路由）
  - `idleHours`：Discord 對於非活動自動取消聚焦（小時）的覆寫（`0` 表示停用）
  - `maxAgeHours`：Discord 對於強制最大存留時間（小時）的覆寫（`0` 表示停用）
  - `spawnSubagentSessions`：`sessions_spawn({ thread: true })` 自動建立/綁定執行緒的選用開關
- 頂層 `bindings[]` 項目若包含 `type: "acp"`，則會設定頻道與執行緒的持續性 ACP 綁定（在 `match.peer.id` 中使用頻道/執行緒 ID）。欄位語義請參閱 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。
- `channels.discord.ui.components.accentColor` 設定 Discord 元件 v2 容器的強調色。
- `channels.discord.voice` 啟用 Discord 語音頻道交談及選用的自動加入 + TTS 覆寫。
- `channels.discord.voice.daveEncryption` 與 `channels.discord.voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` DAVE 選項（預設為 `true` 與 `24`）。
- OpenClaw 還會在重複解密失敗後，通過離開/重新加入語音會話來嘗試語音接收恢復。
- `channels.discord.streaming` 是標準的串流模式金鑰。舊版 `streamMode` 與布林值 `streaming` 會自動遷移。
- `channels.discord.autoPresence` 將執行時期可用性對應至機器人狀態（healthy => online、degraded => idle、exhausted => dnd），並允許選用的狀態文字覆寫。
- `channels.discord.dangerouslyAllowNameMatching` 重新啟用可變名稱/標籤匹配（緊急相容模式）。
- `channels.discord.execApprovals`：Discord 原生執行核准傳送與核准者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在自動模式下，當可從 `approvers` 或 `commands.ownerAllowFrom` 解析出審批者時，執行審批會啟用。
  - `approvers`：獲准批准執行請求的 Discord 使用者 ID。若省略則回退至 `commands.ownerAllowFrom`。
  - `agentFilter`：可選的代理程式 ID 允許清單。省略以轉發所有代理程式的審批。
  - `sessionFilter`：可選的 Session Key 模式（子字串或 Regex）。
  - `target`：傳送審批提示的位置。`"dm"`（預設）傳送至審批者的 DM，`"channel"` 傳送至原始頻道，`"both"` 傳送至兩者。當目標包含 `"channel"` 時，按鈕僅可由解析出的審批者使用。
  - `cleanupAfterResolve`：當 `true` 時，在批准、拒絕或逾時後刪除審批 DM。

**反應通知模式：**`off`（無）、`own`（機器人的訊息，預設）、`all`（所有訊息）、`allowlist`（來自 `guilds.<id>.users` 於所有訊息上）。

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
- 環境變數回退：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作為傳送目標。
- `channels.googlechat.dangerouslyAllowNameMatching` 會重新啟用可變的電子郵件主體匹配（緊急兼容模式）。

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
- **HTTP 模式**需要 `botToken` 加上 `signingSecret`（位於根層級或每個帳戶）。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文本字串或 SecretRef 物件。
- Slack 帳號快照會公開每個憑證的來源/狀態欄位，例如 `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示帳號是透過 SecretRef 配置的，但目前的指令/執行時路徑無法解析秘密值。
- `configWrites: false` 會阻擋 Slack 發起的配置寫入。
- 可選的 `channels.slack.defaultAccount` 會在符合已配置的帳號 ID 時覆寫預設的帳號選擇。
- `channels.slack.streaming.mode` 是標準的 Slack 串流模式金鑰。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生串流傳輸。舊版的 `streamMode`、布林值 `streaming` 和 `nativeStreaming` 值會自動遷移。
- 使用 `user:<id>` (DM) 或 `channel:<id>` 作為傳遞目標。

**反應通知模式：** `off`、`own` (預設)、`all`、`allowlist` (來自 `reactionAllowlist`)。

**討論串會話隔離：** `thread.historyScope` 是每個討論串獨立 (預設) 或在頻道間共用。`thread.inheritParent` 會將父頻道紀錄複製到新討論串。

- Slack 原生串流以及 Slack 助理風格的「正在輸入...」討論串狀態需要一個回覆討論串目標。頂層 DM 預設保持非討論串，因此它們使用 `typingReaction` 或一般傳遞，而不是討論串風格的預覽。
- `typingReaction` 會在回覆執行時對傳入的 Slack 訊息新增暫時性的反應，然後在完成時將其移除。使用 Slack emoji 簡碼，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生執行審批傳遞與審批者授權。架構與 Discord 相同：`enabled` (`true`/`false`/`"auto"`)、`approvers` (Slack 使用者 ID)、`agentFilter`、`sessionFilter` 與 `target` (`"dm"`、`"channel"` 或 `"both"`)。

| 動作群組   | 預設    | 備註                |
| ---------- | ------- | ------------------- |
| reactions  | enabled | 反應 + 列出反應     |
| messages   | enabled | 讀取/發送/編輯/刪除 |
| pins       | enabled | 釘選/取消釘選/列表  |
| memberInfo | enabled | 成員資訊            |
| emojiList  | enabled | 自訂 emoji 列表     |

### Mattermost

Mattermost 以外掛程式形式提供：`openclaw plugins install @openclaw/mattermost`。

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

- `commands.callbackPath` 必須是路徑 (例如 `/api/channels/mattermost/command`)，而非完整的 URL。
- `commands.callbackUrl` 必須解析至 OpenClaw gateway 端點，且必須能從 Mattermost 伺服器存取。
- 原生斜線回呼會使用 Mattermost 在斜線指令註冊期間回傳的各指令權杖進行驗證。如果註冊失敗或未啟用任何指令，OpenClaw 會以 `Unauthorized: invalid command token.` 拒絕回呼
- 對於私有/tailnet/內部回呼主機，Mattermost 可能需要 `ServiceSettings.AllowedUntrustedInternalConnections` 包含回呼主機/網域。
  請使用主機/網域值，而非完整 URL。
- `channels.mattermost.configWrites`：允許或拒絕由 Mattermost 發起的設定寫入。
- `channels.mattermost.requireMention`：在頻道中回覆前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：各頻道提及閘門覆寫 (`"*"` 表示預設)。
- 選用的 `channels.mattermost.defaultAccount` 會在符合已設定的帳戶 ID 時，覆寫預設的帳戶選取。

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

**反應通知模式：**`off`、`own` (預設)、`all`、`allowlist` (來自 `reactionAllowlist`)。

- `channels.signal.account`：將頻道啟動鎖定至特定的 Signal 帳戶身分。
- `channels.signal.configWrites`：允許或拒絕由 Signal 發起的配置寫入。
- 可選的 `channels.signal.defaultAccount` 會在符合已設定的帳戶 ID 時覆寫預設的帳戶選擇。

### BlueBubbles

BlueBubbles 是推薦的 iMessage 路徑（由插件支援，在 `channels.bluebubbles` 下設定）。

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
- 可選的 `channels.bluebubbles.defaultAccount` 會在符合已設定的帳戶 ID 時覆寫預設的帳戶選擇。
- 頂層 `bindings[]` 條目若帶有 `type: "acp"`，可將 BlueBubbles 對話綁定至持續性的 ACP 工作階段。請在 `match.peer.id` 中使用 BlueBubbles 的代碼 或目標字串（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共用欄位語意：[ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。
- 完整的 BlueBubbles 頻道設定記載於 [BlueBubbles](/zh-Hant/channels/bluebubbles)。

### iMessage

OpenClaw 會產生 `imsg rpc`（透過 stdio 的 JSON-RPC）。不需要背景程式或連接埠。

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

- 可選的 `channels.imessage.defaultAccount` 會在符合已設定的帳戶 ID 時覆寫預設的帳戶選擇。

- 需要對訊息資料庫 擁有完全磁碟存取權限。
- 優先使用 `chat_id:<id>` 目標。使用 `imsg chats --limit 20` 以列出聊天。
- `cliPath` 可指向 SSH 包裝程式；設定 `remoteHost`（`host` 或 `user@host`）以進行 SCP 附件擷取。
- `attachmentRoots` 與 `remoteAttachmentRoots` 會限制傳入附件的路徑（預設：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用嚴格的主機金鑰檢查，因此請確確保轉送主機金鑰已存在於 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允許或拒絕由 iMessage 發起的配置寫入。
- 頂層 `bindings[]` 條目若包含 `type: "acp"`，可將 iMessage 對話綁定至持續的 ACP 工作階段。請在 `match.peer.id` 中使用標準化的 handle 或明確的聊天目標（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共用欄位語意：[ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。

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
- `channels.matrix.proxy` 會將 Matrix HTTP 流量路由透過指定的 HTTP(S) 代理伺服器。具名帳號可使用 `channels.matrix.accounts.<id>.proxy` 覆寫此設定。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允許使用私有/內部住宅伺服器。`proxy` 與此網路選項是獨立的控制項。
- `channels.matrix.defaultAccount` 可在多重帳號設定中選取偏好的帳號。
- `channels.matrix.autoJoin` 預設為 `off`，因此受邀的房間和新的 DM 式邀請會被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 設定 `autoJoin: "allowlist"`。
- `channels.matrix.execApprovals`：Matrix 原生的執行核准傳遞與核准者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在自動模式下，當可從 `approvers` 或 `commands.ownerAllowFrom` 解析出核准者時，執行核准會啟用。
  - `approvers`：獲准核准執行請求的 Matrix 使用者 ID（例如 `@owner:example.org`）。
  - `agentFilter`：選用的代理程式 ID 允許清單。省略此項以轉發所有代理程式的核准。
  - `sessionFilter`：選用的工作階段金鑰模式（子字串或正規表示式）。
  - `target`：傳送核准提示的位置。`"dm"`（預設）、`"channel"`（原始聊天室），或 `"both"`。
  - 每個帳號的覆寫：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix 私訊 (DM) 如何分組為工作階段：`per-user`（預設）按路由對方共用，而 `per-room` 將每個 DM 聊天室隔離。
- Matrix 狀態探測和即時目錄查詢使用與執行時流量相同的代理政策。
- 完整的 Matrix 設定、目標規則和設定範例記載於 [Matrix](/zh-Hant/channels/matrix)。

### Microsoft Teams

Microsoft Teams 由外掛程式支援，並在 `channels.msteams` 下進行設定。

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
- 完整的 Teams 設定（憑證、Webhook、DM/群組原則、每團隊/每頻道覆寫）記載於 [Microsoft Teams](/zh-Hant/channels/msteams)。

### IRC

IRC 由外掛程式支援，並在 `channels.irc` 下進行設定。

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
- 當符合設定的帳號 ID 時，可選的 `channels.irc.defaultAccount` 會覆寫預設的帳號選擇。
- 完整的 IRC 頻道設定（主機/連接埠/TLS/頻道/允許清單/提及閘道）記載於 [IRC](/zh-Hant/channels/irc)。

### 多重帳戶（所有頻道）

每個頻道執行多個帳號（每個都有自己的 `accountId`）：

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

- 當省略 `accountId` 時（CLI + 路由），會使用 `default`。
- 環境變數僅適用於 **預設** 帳戶。
- 除非依帳戶覆寫，否則基本頻道設定適用於所有帳戶。
- 使用 `bindings[].match.accountId` 將每個帳號路由到不同的代理程式。
- 如果您在仍處於單一帳號頂層頻道設定的情況下，透過 `openclaw channels add`（或頻道上架）新增非預設帳號，OpenClaw 會先將帳號範圍的頂層單一帳號值提升至頻道帳號對應中，以便原始帳號繼續運作。大多數頻道會將其移至 `channels.<channel>.accounts.default`；Matrix 則可以改為保留現有的相符命名/預設目標。
- 現有的僅限通道的綁定（無 `accountId`）繼續符合預設帳戶；帳戶範圍綁定仍為可選。
- `openclaw doctor --fix` 也會透過將帳戶範圍的頂層單一帳戶值移至為該通道選擇的提升帳戶，來修復混合形狀。大多數通道使用 `accounts.default`；Matrix 可以改為保留現有的符合命名/預設目標。

### 其他外掛通道

許多外掛通道被設定為 `channels.<id>` 並在其專屬的通道頁面中記錄（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
請查看完整的通道索引：[通道](/zh-Hant/channels)。

### 群組聊天提及閘控

群組訊息預設為**需要提及**（metadata mention 或安全的 regex 模式）。適用於 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群組聊天。

**提及類型：**

- **Metadata mentions**：原生平台 @-mentions。在 WhatsApp 自我聊天模式中會被忽略。
- **文字模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正則表達式模式。無效的模式和不安全的巢狀重複會被忽略。
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

`messages.groupChat.historyLimit` 設定全域預設值。通道可以使用 `channels.<channel>.historyLimit`（或每個帳戶）進行覆寫。設定 `0` 以停用。

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

在 `allowFrom` 中包含您自己的號碼以啟用自聊天模式（忽略原生 @-提及，僅回應文字模式）：

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

<Accordion title="命令詳情">

- 此區塊用於設定命令介面。若要查看目前的內建 + 捆綁命令目錄，請參閱 [Slash Commands](/zh-Hant/tools/slash-commands)。
- 此頁面是 **配置鍵參考**，而非完整的命令目錄。頻道/外掛擁有的命令，例如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、device-pair `/pair`、memory `/dreaming`、phone-control `/phone` 和 Talk `/voice`，皆記錄在其各自的頻道/外掛頁面以及 [Slash Commands](/zh-Hant/tools/slash-commands) 中。
- 文字命令必須是帶有前導 `/` 的 **獨立** 訊息。
- `native: "auto"` 會為 Discord/Telegram 開啟原生命令，並保持 Slack 關閉。
- `nativeSkills: "auto"` 會為 Discord/Telegram 開啟原生技能命令，並保持 Slack 關閉。
- 逐頻道覆寫：`channels.discord.commands.native` (布林值或 `"auto"`)。`false` 會清除先前註冊的命令。
- 使用 `channels.<provider>.commands.nativeSkills` 逐頻道覆寫原生技能註冊。
- `channels.telegram.customCommands` 新增額外的 Telegram 機器人選單項目。
- `bash: true` 為主機 Shell 啟用 `! <cmd>`。需要 `tools.elevated.enabled` 且發送者在 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 啟用 `/config` (讀取/寫入 `openclaw.json`)。對於 Gateway `chat.send` 客戶端，持久性 `/config set|unset` 寫入還需要 `operator.admin`；唯讀 `/config show` 則保持可供一般寫入範圍的操作員客戶端使用。
- `mcp: true` 為 `mcp.servers` 下的 OpenClaw 管理 MCP 伺服器配置啟用 `/mcp`。
- `plugins: true` 啟用 `/plugins` 以進行外掛探索、安裝和啟用/停用控制。
- `channels.<provider>.configWrites` 限制各頻道的配置變更 (預設：true)。
- 對於多帳號頻道，`channels.<provider>.accounts.<id>.configWrites` 還會限制針對該帳號的寫入操作 (例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`)。
- `restart: false` 停用 `/restart` 和 Gateway 重新啟動工具動作。預設值：`true`。
- `ownerAllowFrom` 是僅限擁有者命令/工具的明確擁有者允許清單。它與 `allowFrom` 分開。
- `ownerDisplay: "hash"` 對系統提示詞中的擁有者 ID 進行雜湊處理。設定 `ownerDisplaySecret` 以控制雜湊處理。
- `allowFrom` 是各提供者專屬的。設定後，它將是 **唯一** 的授權來源 (頻道允許清單/配對和 `useAccessGroups` 將被忽略)。
- 當未設定 `allowFrom` 時，`useAccessGroups: false` 允許命令繞過存取群組原則。
- 命令文件地圖：
  - 內建 + 捆綁目錄：[Slash Commands](/zh-Hant/tools/slash-commands)
  - 特定頻道的命令介面：[Channels](/zh-Hant/channels)
  - QQ Bot 命令：[QQ Bot](/zh-Hant/channels/qqbot)
  - 配對命令：[Pairing](/zh-Hant/channels/pairing)
  - LINE 卡片命令：[LINE](/zh-Hant/channels/line)
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

針對未設定
`agents.list[].skills` 的代理程式，可選用的預設技能允許清單。

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
- 設定 `agents.list[].skills: []` 表示不使用任何技能。
- 非空的 `agents.list[].skills` 清單是該代理程式的最終設定；它
  不會與預設值合併。

### `agents.defaults.skipBootstrap`

停用工作區啟動檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自動建立。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.contextInjection`

控制何時將工作區啟動檔案注入系統提示詞。預設值：`"always"`。

- `"continuation-skip"`：安全延續輪次（在完成助理回應後）會跳過工作區啟動檔案的重新注入，以減少提示詞大小。心跳執行和壓縮後的重試仍會重建上下文。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

每個工作區啟動檔案在截斷前的最大字元數。預設值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

所有工作區啟動檔案中注入的最大總字元數。預設值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

當啟動上下文被截斷時，控制代理程式可見的警告文字。
預設值：`"once"`。

- `"off"`：絕不將警告文字注入系統提示詞。
- `"once"`：針對每個唯一的截斷簽章注入一次警告（建議）。
- `"always"`：當存在截斷時，在每次執行時都注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### 上下文預算所有權對應

OpenClaw 擁有多個高容量的提示/上下文預算，且它們是刻意按子系統進行拆分，而不是全部透過一個通用旋鈕流動。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`：
  正常的工作區啟動注入。
- `agents.defaults.startupContext.*`:
  一次性 `/new` 與 `/reset` 啟動序言，包括最近的每日
  `memory/*.md` 檔案。
- `skills.limits.*`:
  注入系統提示中的精簡技能清單。
- `agents.defaults.contextLimits.*`:
  受限的執行時摘錄與注入的執行時區塊。
- `memory.qmd.limits.*`:
  索引記憶體搜尋摘錄與注入大小設定。

僅當一個代理需要不同的預算時，才使用相符的個別代理覆寫：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在純 `/new` 和 `/reset` 執行時注入的第一輪啟動序言。

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

- `memoryGetMaxChars`：預設 `memory_get` 摘錄上限，之後會加入截斷中繼資料與續行通知。
- `memoryGetDefaultLines`：省略 `lines` 時，預設的 `memory_get` 行數視窗。
- `toolResultMaxChars`：用於持續化結果與溢出恢復的即時工具結果上限。
- `postCompactionMaxChars`：用於壓縮後重新整理注入的 AGENTS.md 摘錄上限。

#### `agents.list[].contextLimits`

共享 `contextLimits` 設定值的個別代理覆寫。省略欄位將繼承自 `agents.defaults.contextLimits`。

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

注入系統提示中的精簡技能清單之全域上限。這不會影響按需讀取 `SKILL.md` 檔案。

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

在呼叫提供者之前，對話記錄/工具圖像區塊中最長圖像邊的最大像素尺寸。
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

系統提示中的時間格式。預設值：`auto` (作業系統偏好)。

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
        primary: "openai/gpt-image-2",
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
- `imageModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由 `image` 工具路徑用作其視覺模型配置。
  - 當選取/預設的模型無法接受圖片輸入時，也會用作故障轉移路由。
- `imageGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的圖片生成功能及任何未來會產生圖片的工具/外掛介面使用。
  - 典型值：原生 Gemini 影像生成使用 `google/gemini-3.1-flash-image-preview`，fal 使用 `fal/fal-ai/flux/dev`，或 OpenAI Images 使用 `openai/gpt-image-2`。
  - 如果您直接選擇供應商/模型，請同時設定相符的供應商驗證/API 金鑰（例如 `google/*` 的 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/*` 的 `OPENAI_API_KEY`，`fal/*` 的 `FAL_KEY`）。
  - 如果省略，`image_generate` 仍可推斷出有驗證支援的供應商預設值。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試其餘已註冊的影像生成供應商。
- `musicGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的音樂生成功能和內建的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.5+`。
  - 如果省略，`music_generate` 仍可推斷出有驗證支援的供應商預設值。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試其餘已註冊的音樂生成供應商。
  - 如果您直接選擇了供應商/模型，請同時配置匹配的供應商驗證/API 金鑰。
- `videoGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的影片生成功能和內建的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍可推斷出基於驗證的提供者預設值。它會先嘗試當前的預設提供者，然後依照提供者 ID 的順序嘗試剩餘已註冊的視訊生成提供者。
  - 如果您直接選擇了供應商/模型，請同時配置匹配的供應商驗證/API 金鑰。
  - 內建的 Qwen 視訊生成提供者支援最多 1 個輸出視訊、1 個輸入圖片、4 個輸入視訊、10 秒持續時間，以及提供者層級的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 選項。
- `pdfModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 供 `pdf` 工具用於模型路由。
  - 如果省略，PDF 工具會退回到 `imageModel`，然後再退回到解析出的會話/預設模型。
- `pdfMaxBytesMb`：當呼叫時未傳遞 `maxBytesMb` 時，`pdf` 工具的預設 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中擷取退回模式所考慮的預設最大頁數。
- `verboseDefault`：代理程式的預設詳細輸出等級。數值：`"off"`、`"on"`、`"full"`。預設值：`"off"`。
- `elevatedDefault`：代理程式的預設提升輸出等級。數值：`"off"`、`"on"`、`"ask"`、`"full"`。預設值：`"on"`。
- `model.primary`：格式 `provider/model`（例如 `openai/gpt-5.4`）。如果省略提供商，OpenClaw 會先嘗試別名，然後尋找該模型 ID 唯一匹配的已設定提供商，最後才回退到設定的預設提供商（已棄用的相容性行為，因此建議明確指定 `provider/model`）。如果該提供商不再公開設定的預設模型，OpenClaw 會回退到第一個設定的提供商/模型，而不會顯示陳舊的已移除提供商預設值。
- `models`：針對 `/model` 的設定模型目錄與允許清單。每個條目可以包含 `alias`（捷徑）與 `params`（特定於提供商，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`）。
  - 安全編輯：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 來新增條目。`config set` 會拒絕會移除現有允許清單條目的替換操作，除非您傳遞 `--replace`。
  - 提供商範圍的設定/上架流程會將選取的提供商模型合併至此對映，並保留已設定的無關提供商。
- `params`：套用至所有模型的全域預設提供商參數。在 `agents.defaults.params` 處設定（例如 `{ cacheRetention: "long" }`）。
- `params` 合併優先順序（設定）：`agents.defaults.params`（全域基底）會被 `agents.defaults.models["provider/model"].params`（個別模型）覆寫，然後 `agents.list[].params`（匹配的代理程式 ID）會依鍵值進行覆寫。詳情請參閱 [提示快取](/zh-Hant/reference/prompt-caching)。
- `embeddedHarness`：預設的低階內嵌代理程式執行時期策略。使用 `runtime: "auto"` 讓已註冊的外掛套件宣告支援的模型，使用 `runtime: "pi"` 強制使用內建 PI 套件，或使用已註冊的套件 ID（例如 `runtime: "codex"`）。設定 `fallback: "none"` 可停用自動 PI 回退。
- 更改這些欄位的配置寫入器（例如 `/models set`、`/models set-image` 以及後備新增/移除指令）會儲存規範的物件形式，並盡可能保留現有的後備清單。
- `maxConcurrent`：跨會話的最大並行代理執行數（每個會話仍為序列化）。預設值：4。

### `agents.defaults.embeddedHarness`

`embeddedHarness` 控制執行內嵌代理轉向的低層級執行器。
大多數部署應保持預設值 `{ runtime: "auto", fallback: "pi" }`。
當受信任的外掛程式提供原生套件時使用它，例如隨附的
Codex app-server 套件。

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

- `runtime`：`"auto"`、`"pi"` 或已註冊的外掛程式套件 ID。隨附的 Codex 外掛程式註冊了 `codex`。
- `fallback`：`"pi"` 或 `"none"`。`"pi"` 會在未選取外掛程式套件時，將內建 PI 套件保留為相容性後備。`"none"` 會導致遺失或不支援的外掛程式套件選擇失敗，而不是無聲地使用 PI。選取的外掛程式套件失敗總是會直接顯示出來。
- 環境覆寫：`OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` 會覆寫 `runtime`；`OPENCLAW_AGENT_HARNESS_FALLBACK=none` 會針對該程序停用 PI 後備。
- 對於僅限 Codex 的部署，請設定 `model: "codex/gpt-5.4"`、`embeddedHarness.runtime: "codex"` 和 `embeddedHarness.fallback: "none"`。
- 這僅控制內嵌聊天套件。媒體生成、視覺、PDF、音樂、影片和 TTS 仍會使用其提供者/模型設定。

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

您設定的別名優先級總是高於預設值。

Z.AI GLM-4.x 模型會自動啟用思考模式，除非您設定 `--thinking off` 或自行定義 `agents.defaults.models["zai/<model>"].params.thinking`。
Z.AI 模型在工具呼叫串流時預設啟用 `tool_stream`。將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設定為 `false` 即可停用它。
Anthropic Claude 4.6 模型在未設定明確的思考等級時，預設為 `adaptive` 思考。

### `agents.defaults.cliBackends`

純文字後備執行（無工具呼叫）的選用 CLI 後端。當 API 提供商失敗時，可作為備用方案。

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

- CLI 後端以文字為優先；工具會始終停用。
- 當設定 `sessionArg` 時，支援 Sessions。
- 當 `imageArg` 接受檔案路徑時，支援圖像直通。

### `agents.defaults.systemPromptOverride`

將整個 OpenClaw 組裝的系統提示詞替換為固定字串。在預設層級 (`agents.defaults.systemPromptOverride`) 或每個代理程式 (`agents.list[].systemPromptOverride`) 設定。每個代理程式的值優先；空值或僅含空白字元的值會被忽略。適用於受控的提示詞實驗。

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "You are a helpful assistant.",
    },
  },
}
```

### `agents.defaults.promptOverlays`

依模型系列套用的與提供者無關的提示詞疊加層。GPT-5 系列模型 ID 會跨提供者接收共享的行為合約；`personality` 僅控制友善的互動風格層。

```json5
{
  agents: {
    defaults: {
      promptOverlays: {
        gpt5: {
          personality: "friendly", // friendly | on | off
        },
      },
    },
  },
}
```

- `"friendly"` (預設) 和 `"on"` 會啟用友善的互動風格層。
- `"off"` 僅停用友善層；已標記的 GPT-5 行為合約仍保持啟用狀態。
- 當未設定此共用設定時，仍會讀取舊版 `plugins.entries.openai.config.personality`。

### `agents.defaults.heartbeat`

週期性心跳執行。

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

- `every`: 持續時間字串 (ms/s/m/h)。預設值: `30m` (API 金鑰驗證) 或 `1h` (OAuth 驗證)。設為 `0m` 以停用。
- `includeSystemPromptSection`: 若為 false，則從系統提示詞中省略 Heartbeat 部分，並跳過將 `HEARTBEAT.md` 注入到引導上下文中。預設值: `true`。
- `suppressToolErrorWarnings`: 若為 true，則在心跳執行期間隱藏工具錯誤警告載荷。
- `timeoutSeconds`: 在心跳代理輪次被中止前允許的最大秒數。若不設定，則使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`: 直訊/DM 傳遞策略。`allow` (預設) 允許直接目標傳遞。`block` 抑制直接目標傳遞並發出 `reason=dm-blocked`。
- `lightContext`: 若為 true，心跳執行使用輕量級引導上下文，並僅保留工作區引導檔案中的 `HEARTBEAT.md`。
- `isolatedSession`: 若為 true，每次心跳都在一個沒有先前對話歷史的新會話中執行。隔離模式與 cron `sessionTarget: "isolated"` 相同。將每次心跳的 token 成本從約 10 萬降低至約 2-5 千 token。
- 每個代理：設定 `agents.list[].heartbeat`。當任何代理定義了 `heartbeat`，**只有那些代理** 會執行心跳。
- 心跳執行完整的代理輪次 — 較短的間隔會消耗更多 token。

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

- `mode`: `default` 或 `safeguard` (針對長歷史的區塊摘要)。請參閱 [Compaction](/zh-Hant/concepts/compaction)。
- `provider`: 已註冊壓縮提供者外掛程式的 ID。設定後，會呼叫提供者的 `summarize()`，而不是內建的 LLM 摘要。失敗時會回退至內建方式。設定提供者會強制啟用 `mode: "safeguard"`。請參閱 [Compaction](/zh-Hant/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 中止單一壓縮操作前允許的最大秒數。預設值：`900`。
- `identifierPolicy`：`strict`（預設）、`off` 或 `custom`。`strict` 會在壓縮摘要期間前置內建的隱碼識別符保留指引。
- `identifierInstructions`：當使用 `identifierPolicy=custom` 時所使用的選用自訂識別符保留文字。
- `postCompactionSections`：用於在壓縮後重新注入的可選 AGENTS.md H2/H3 區段名稱。預設為 `["Session Startup", "Red Lines"]`；設定 `[]` 以停用重新注入。當未設定或明確設定為該預設對時，較舊的 `Every Session`/`Safety` 標題也會被接受作為舊版回退選項。
- `model`：僅用於壓縮摘要的可選 `provider/model-id` 覆蓋。當主會話應保留一個模型但壓縮摘要應在另一個模型上執行時使用此選項；當未設定時，壓縮使用會話的主要模型。
- `notifyUser`：當設為 `true` 時，在壓縮開始和完成時向使用者發送簡短通知（例如，「正在壓縮上下文...」和「壓縮完成」）。預設為停用，以保持壓縮過程靜默。
- `memoryFlush`：在自動壓縮之前進行的靜默代理回合，用於儲存持久化記憶。當工作區為唯讀時將跳過。

### `agents.defaults.contextPruning`

在發送給 LLM 之前，從記憶體上下文中修剪**舊的工具結果**。**不**會修改磁碟上的會話歷史記錄。

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

- `mode: "cache-ttl"` 啟用修剪過程。
- `ttl` 控制修剪再次執行的頻率（在最後一次快取接觸之後）。
- 修剪會先軟修剪過大的工具結果，然後在需要時硬清除較舊的工具結果。

**軟修剪**保留開頭 + 結尾，並在中間插入 `...`。

**硬清除**會用預留位置替換整個工具結果。

註記：

- 影像區塊永遠不會被修剪/清除。
- 比例是基於字元的（大約），而非精確的 token 計數。
- 如果存在的助理訊息少於 `keepLastAssistants` 則跳過修剪。

</Accordion>

有關行為細節，請參閱 [Session Pruning](/zh-Hant/concepts/session-pruning)。

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

- 非 Telegram 頻道需要明確設定 `*.blockStreaming: true` 才能啟用區塊回覆。
- 頻道覆寫：`channels.<channel>.blockStreamingCoalesce` （以及每個帳號的變體）。Signal/Slack/Discord/Google Chat 預設 `minChars: 1500`。
- `humanDelay`：區塊回覆之間的隨機暫停。`natural` = 800–2500ms。每個代理的覆寫：`agents.list[].humanDelay`。

有關行為 + 分塊細節，請參閱 [Streaming](/zh-Hant/concepts/streaming)。

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

- 預設值：直接聊天/提及為 `instant`，未提及的群組聊天為 `message`。
- 每個會話的覆寫：`session.typingMode`、`session.typingIntervalSeconds`。

請參閱 [Typing Indicators](/zh-Hant/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

內嵌代理的可選沙箱機制。如需完整指南，請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。

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

<Accordion title="Sandbox 詳細資訊">

**後端：**

- `docker`：本機 Docker 執行時（預設）
- `ssh`：通用 SSH 支援的遠端執行時
- `openshell`：OpenShell 執行時

當選取 `backend: "openshell"` 時，特定執行時的設定會移至
`plugins.entries.openshell.config`。

**SSH 後端設定：**

- `target`：`user@host[:port]` 格式的 SSH 目標
- `command`：SSH 客戶端指令（預設：`ssh`）
- `workspaceRoot`：用於各範圍工作區的絕對遠端根目錄
- `identityFile` / `certificateFile` / `knownHostsFile`：傳遞給 OpenSSH 的現有本機檔案
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在執行時具現化為暫存檔案的行內內容或 SecretRefs
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主機金鑰原則選項

**SSH 認證優先順序：**

- `identityData` 優先於 `identityFile`
- `certificateData` 優先於 `certificateFile`
- `knownHostsData` 優先於 `knownHostsFile`
- SecretRef 支援的 `*Data` 值會在沙箱工作階段開始前，從使用中的秘密執行時快照中解析

**SSH 後端行為：**

- 在建立或重建後，將遠端工作區播種一次
- 然後保持遠端 SSH 工作區為規範來源
- 透過 SSH 路由 `exec`、檔案工具和媒體路徑
- 不會自動將遠端變更同步回主機
- 不支援沙箱瀏覽器容器

**工作區存取：**

- `none`：`~/.openclaw/sandboxes` 下針對各範圍的沙箱工作區
- `ro`：`/workspace` 處的沙箱工作區，代理人工作區以唯讀方式掛載於 `/agent`
- `rw`：代理人工作區以讀寫方式掛載於 `/workspace`

**範圍：**

- `session`：每工作階段容器 + 工作區
- `agent`：每個代理人一個容器 + 工作區（預設）
- `shared`：共享容器和工作區（無跨工作階段隔離）

**OpenShell 外掛程式設定：**

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

- `mirror`：在執行前從本機將遠端播種，在執行後同步回來；本機工作區保持為規範來源
- `remote`：在建立沙箱時將遠端播種一次，然後保持遠端工作區為規範來源

在 `remote` 模式下，在 OpenClaw 外部進行的本機編輯，不會在播種步驟後自動同步至沙箱中。
傳輸方式是 SSH 進入 OpenShell 沙箱，但外掛程式擁有沙箱生命週期和可選的鏡像同步。

**`setupCommand`** 會在容器建立後執行一次（透過 `sh -lc`）。需要網路出口、可寫入的根目錄、root 使用者。

**容器預設為 `network: "none"`** — 如果代理人需要對外存取，請設為 `"bridge"`（或自訂橋接網路）。
`"host"` 被封鎖。`"container:<id>"` 預設被封鎖，除非您明確設定
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（緊急存取）。

**連入附件** 會暫存至使用中工作區的 `media/inbound/*` 中。

**`docker.binds`** 會掛載額外的主機目錄；全域和每代理人的綁定會合併。

**沙箱化瀏覽器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 會注入至系統提示中。不需要 `browser.enabled` 於 `openclaw.json` 中。
noVNC 觀察者存取預設使用 VNC 認證，且 OpenClaw 會發出短效的權杖 URL（而不是在共享 URL 中暴露密碼）。

- `allowHostControl: false`（預設）會封鎖沙箱工作階段以主機瀏覽器為目標。
- `network` 預設為 `openclaw-sandbox-browser`（專用橋接網路）。僅當您明確需要全域橋接連線時，才設為 `bridge`。
- `cdpSourceRange` 可選擇性地將容器邊緣的 CDP 連入限制為 CIDR 範圍（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 僅將額外的主機目錄掛載至沙箱瀏覽器容器。當設定時（包括 `[]`），它會取代瀏覽器容器的 `docker.binds`。
- 啟動預設值定義於 `scripts/sandbox-browser-entrypoint.sh` 中，並針對容器主機進行調整：
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
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 預設為
    啟用，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 停用。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 如果您的工作流程
    依賴擴充功能，則會重新啟用它們。
  - `--renderer-process-limit=2` 可以使用
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 變更；設定 `0` 以使用 Chromium 的
    預設程序限制。
  - 加上當啟用 `noSandbox` 時的 `--no-sandbox` 和 `--disable-setuid-sandbox`。
  - 預設值是容器映像檔基準；使用具有自訂進入點的自訂瀏覽器映像檔來變更容器預設值。

</Accordion>

瀏覽器沙盒與 `sandbox.docker.binds` 僅限 Docker。

建置映像檔：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list` (每個代理的覆寫)

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

- `id`：穩定的代理 ID（必填）。
- `default`：當設定多個時，優先採用第一個（並記錄警告）。若皆未設定，預設為清單第一個項目。
- `model`：字串形式僅覆寫 `primary`；物件形式 `{ primary, fallbacks }` 會覆寫兩者（`[]` 會停用全域備援）。僅覆寫 `primary` 的 Cron 排程仍會繼承預設備援，除非你設定 `fallbacks: []`。
- `params`：合併至 `agents.defaults.models` 中所選模型項目的每個代理串流參數。以此針對特定代理覆寫參數（如 `cacheRetention`、`temperature` 或 `maxTokens`），無需複製整個模型目錄。
- `skills`：選用的每個代理技能允許清單。若省略，代理會在設定時繼承 `agents.defaults.skills`；明確清單會取代而非合併預設值，而 `[]` 表示無技能。
- `thinkingDefault`：選用的每個代理預設思考層級 (`off | minimal | low | medium | high | xhigh | adaptive | max`)。當未設定每則訊息或工作階段覆寫時，會覆寫此代理的 `agents.defaults.thinkingDefault`。
- `reasoningDefault`：選用的每個代理預設推理顯示設定 (`on | off | stream`)。當未設定每則訊息或工作階段推理覆寫時適用。
- `fastModeDefault`：選用的每個代理快速模式預設 (`true | false`)。當未設定每則訊息或工作階段快速模式覆寫時適用。
- `embeddedHarness`：選用的每個代理低階駕馭原則覆寫。使用 `{ runtime: "codex", fallback: "none" }` 讓其中一個代理僅使用 Codex，而其他代理保留預設的 PI 備援。
- `runtime`：可選的每個代理程式執行時描述符。當代理程式應預設為 ACP 線束階段作業時，請使用帶有 `runtime.acp` 預設值（`agent`、`backend`、`mode`、`cwd`）的 `type: "acp"`。
- `identity.avatar`：工作區相對路徑、`http(s)` URL 或 `data:` URI。
- `identity` 推導預設值：從 `emoji` 推導 `ackReaction`，從 `name`/`emoji` 推導 `mentionPatterns`。
- `subagents.allowAgents`：用於 `sessions_spawn` 的代理程式 ID 允許清單（`["*"]` = 任意；預設值：僅限相同代理程式）。
- Sandbox 繼承防護：如果請求者階段作業已沙盒化，`sessions_spawn` 將拒絕會在未沙盒化狀態下執行的目標。
- `subagents.requireAgentId`：當設為 true 時，封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確設定檔選取；預設值：false）。

---

## 多重代理程式路由

在一個 Gateway 內執行多個隔離的代理程式。請參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent)。

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

### 綁定比對欄位

- `type`（可選）：`route` 用於一般路由（缺少類型預設為 route），`acp` 用於持久化 ACP 對話綁定。
- `match.channel`（必填）
- `match.accountId`（可選；`*` = 任意帳戶；省略 = 預設帳戶）
- `match.peer`（可選；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可選；特定於頻道）
- `acp`（可選；僅限用於 `type: "acp"`）：`{ mode, label, cwd, backend }`

**確定性比對順序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (精確，無 peer/guild/team)
5. `match.accountId: "*"` (頻道範圍)
6. 預設代理程式

在每個層級中，第一個符合的 `bindings` 項目獲勝。

對於 `type: "acp"` 項目，OpenClaw 會根據精確的對話身分 (`match.channel` + account + `match.peer.id`) 進行解析，且不使用上述的路由綁定層級順序。

### 個別代理程式的存取設定檔

<Accordion title="完整存取 (無沙箱)">

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

<Accordion title="無檔案系統存取 (僅訊息傳遞)">

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

有關優先順序的詳細資訊，請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools)。

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

- **`scope`**：群組聊天環境的基礎會話分組策略。
  - `per-sender` (預設值)：每個發送者在頻道環境中獲得獨立的會話。
  - `global`：頻道環境中的所有參與者共享單一會話（僅在預期共享語境時使用）。
- **`dmScope`**：如何分組訊息 (DM)。
  - `main`：所有訊息共享主會話。
  - `per-peer`：跨頻道依發送者 ID 隔離。
  - `per-channel-peer`：依頻道 + 發送者隔離（建議用於多用戶收件匣）。
  - `per-account-channel-peer`：依帳號 + 頻道 + 發送者隔離（建議用於多帳號環境）。
- **`identityLinks`**：將規範 ID 對應到供應商前綴的對等節點，以進行跨頻道會話共享。
- **`reset`**：主要重設策略。`daily` 在 `atHour` 本地時間重設；`idle` 在 `idleMinutes` 之後重設。當兩者皆設定時，以先過期者為準。
- **`resetByType`**：按類型覆寫 (`direct`、`group`、`thread`)。舊版 `dm` 被接受為 `direct` 的別名。
- **`parentForkMaxTokens`**：建立分叉執行緒會話時允許的最大父會話 `totalTokens` (預設 `100000`)。
  - 如果父 `totalTokens` 超過此值，OpenClaw 將啟動新的執行緒會話，而不是繼承父級對話紀錄。
  - 將 `0` 設定為停用此保護，並始終允許父級分叉。
- **`mainKey`**：舊版欄位。執行時期始終針對主要直接聊天貯體使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**：代理之間交換期間代理之間的最大回覆輪數 (整數，範圍：`0`–`5`)。`0` 停用乒乓連鎖。
- **`sendPolicy`**：依 `channel`、`chatType` (`direct|group|channel`，含舊版 `dm` 別名)、`keyPrefix` 或 `rawKeyPrefix` 進行比對。拒絕優先。
- **`maintenance`**：會話儲存清理 + 保留控制項。
  - `mode`：`warn` 僅發出警告；`enforce` 套用清理。
  - `pruneAfter`：過時項目的年限臨界值 (預設 `30d`)。
  - `maxEntries`：`sessions.json` 中的最大項目數量 (預設 `500`)。
  - `rotateBytes`：當 `sessions.json` 超過此大小時進行輪替 (預設 `10mb`)。
  - `resetArchiveRetention`：`*.reset.<timestamp>` 對話紀錄封存的保留期。預設為 `pruneAfter`；設定 `false` 以停用。
  - `maxDiskBytes`：選用的會話目錄磁碟預算。在 `warn` 模式下，它會記錄警告；在 `enforce` 模式下，它會先移除最舊的產物/會話。
  - `highWaterBytes`：預算清理後的選用目標。預設為 `80%` 的 `maxDiskBytes`。
- **`threadBindings`**：執行緒綁定會話功能的全域預設值。
  - `enabled`：主預設開關 (供應商可覆寫；Discord 使用 `channels.discord.threadBindings.enabled`)
  - `idleHours`：預設非活動自動取消聚焦的時間 (小時) (`0` 停用；供應商可覆寫)
  - `maxAgeHours`：預設硬性最大時間 (小時) (`0` 停用；供應商可覆寫)

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

每個通道/帳號的覆寫：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析優先順序（最具體者優先）：帳號 → 通道 → 全域。`""` 會停用並停止層疊傳遞。`"auto"` 會推導 `[{identity.name}]`。

**樣板變數：**

| 變數              | 描述           | 範例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 簡短模型名稱   | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型識別碼 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供者名稱     | `anthropic`                 |
| `{thinkingLevel}` | 當前思考層級   | `high`、`low`、`off`        |
| `{identity.name}` | Agent 身分名稱 | （同 `"auto"`）             |

變數不區分大小寫。`{think}` 是 `{thinkingLevel}` 的別名。

### Ack 回應

- 預設為使用中 Agent 的 `identity.emoji`，否則為 `"👀"`。設定 `""` 以停用。
- 每個通道的覆寫：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析順序：帳號 → 通道 → `messages.ackReaction` → 身分後備。
- 範圍：`group-mentions`（預設）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在 Slack、Discord 和 Telegram 上回覆後移除 Ack 回應。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上啟用生命週期狀態回應。
  在 Slack 和 Discord 上，未設定時會在啟用 Ack 回應時保持啟用狀態回應。
  在 Telegram 上，請明確將其設定為 `true` 以啟用生命週期狀態回應。

### 輸入防抖

將來自同一發送者的連續純文字訊息合併為單一 Agent 輪次。媒體/附件會立即排程。控制指令會略過防抖處理。

### TTS（文字轉語音）

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

- `auto` 控制預設的自動 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆寫本地偏好設定，而 `/tts status` 顯示有效狀態。
- `summaryModel` 會覆寫用於自動摘要的 `agents.defaults.model.primary`。
- `modelOverrides` 預設為啟用；`modelOverrides.allowProvider` 預設為 `false`（選用）。
- API 金鑰會回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `openai.baseUrl` 會覆寫 OpenAI TTS 端點。解析順序依次為配置、`OPENAI_TTS_BASE_URL`，然後是 `https://api.openai.com/v1`。
- 當 `openai.baseUrl` 指向非 OpenAI 端點時，OpenClaw 會將其視為相容 OpenAI 的 TTS 伺服器，並放寬對模型/語音的驗證。

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

- 當配置了多個 Talk 提供者時，`talk.provider` 必須符合 `talk.providers` 中的一個鍵。
- 舊版平面 Talk 金鑰（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）僅用於相容性，並會自動遷移到 `talk.providers.<provider>` 中。
- 語音 ID 會回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受純文字字串或 SecretRef 物件。
- `ELEVENLABS_API_KEY` 回退僅在未設定 Talk API 金鑰時套用。
- `providers.*.voiceAliases` 允許 Talk 指令使用易記名稱。
- `silenceTimeoutMs` 控制對話模式在使用者停止說話後傳送文字記錄前的等待時間。未設定時則保留平台預設的暫停視窗（`700 ms on macOS and Android, 900 ms on iOS`）。

---

## 工具

### 工具設定檔

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設置了基本允許清單：

當未設置時，本地引導會將新的本地配置預設為 `tools.profile: "coding"`（現有的明確配置檔案將被保留）。

| 配置檔案    | 包含                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 僅限 `session_status`                                                                                                           |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | 無限制（與未設置相同）                                                                                                          |

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
| `group:openclaw`   | 所有內建工具（不包括供應商插件）                                                                                        |

### `tools.allow` / `tools.deny`

全域工具允許/拒絕策略（拒絕優先）。不區分大小寫，支援 `*` 萬用字元。即使關閉 Docker 沙盒也會套用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

進一步限制特定供應商或模型的工具。順序：基本設定檔 → 供應商設定檔 → 允許/拒絕。

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

控制沙盒外的提升執行存取權：

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

- 個別代理覆寫（`agents.list[].tools.elevated`）僅能進一步限制。
- `/elevated on|off|ask|full` 依工作階段儲存狀態；內聯指令則套用於單一訊息。
- 提升的 `exec` 會繞過沙盒並使用設定的逃脫路徑（預設為 `gateway`，當執行目標為 `node` 時則為 `node`）。

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

工具迴圈安全性檢查**預設為停用**。設定 `enabled: true` 以啟動偵測。
設定可以在 `tools.loopDetection` 中全域定義，並在 `agents.list[].tools.loopDetection` 處針對各個代理進行覆寫。

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

- `historySize`：為迴圈分析保留的最大工具呼叫歷史記錄。
- `warningThreshold`：發出警告的重複無進度模式閾值。
- `criticalThreshold`：阻擋關鍵迴圈的較高重複閾值。
- `globalCircuitBreakerThreshold`：任何無進行執行的強制停止閾值。
- `detectors.genericRepeat`：針對重複的相同工具/相同參數呼叫發出警告。
- `detectors.knownPollNoProgress`: 對已知的輪詢工具發出警告/阻擋 (`process.poll`, `command_status`, 等)。
- `detectors.pingPong`: 對交替的無進度配對模式發出警告/阻擋。
- 如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，則驗證失敗。

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

設定傳入媒體理解 (圖片/音訊/影片)：

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

**供應商條目** (`type: "provider"` 或省略)：

- `provider`：API 供應商 ID (`openai`、`anthropic`、`google`/`gemini`、`groq` 等)
- `model`：模型 ID 覆寫
- `profile` / `preferredProfile`：`auth-profiles.json` 設定檔選擇

**CLI 條目** (`type: "cli"`)：

- `command`：要執行的可執行檔
- `args`：樣板化參數 (支援 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等)

**通用欄位：**

- `capabilities`：選用清單 (`image`、`audio`、`video`)。預設值：`openai`/`anthropic`/`minimax` → image，`google` → image+audio+video，`groq` → audio。
- `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：各條目覆寫。
- 失敗會退回到下一個條目。

供應商驗證遵循標準順序：`auth-profiles.json` → 環境變數 → `models.providers.*.apiKey`。

**非同步完成欄位：**

- `asyncCompletion.directSend`：當為 `true` 時，完成的非同步 `music_generate`
  與 `video_generate` 任務會先嘗試直接通道傳送。預設值：`false`
  (舊版 requester-session wake/model-delivery 路徑)。

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

控制哪些會話可以被會話工具（`sessions_list`、`sessions_history`、`sessions_send`）作為目標。

預設值：`tree`（當前會話 + 由其產生的會話，例如子代理程式）。

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

- `self`：僅限當前會話金鑰。
- `tree`：當前會話 + 由當前會話產生的會話（子代理程式）。
- `agent`：屬於當前代理程式 ID 的任何會話（如果您在同一個代理程式 ID 下執行每個發送者的會話，可能會包含其他使用者）。
- `all`：任何會話。跨代理程式定目標仍需 `tools.agentToAgent`。
- 沙箱限制：當當前會話位於沙箱中且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 時，即使 `tools.sessions.visibility="all"`，可見性也會被強制設為 `tree`。

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

- 附件僅支援 `runtime: "subagent"`。ACP 執行時期會拒絕它們。
- 檔案會在 `.openclaw/attachments/<uuid>/` 處以 `.manifest.json` 具體化到子工作區中。
- 附件內容會從文字記錄持久性中自動編修。
- Base64 輸入會經過嚴格的字元集/填充檢查和預解碼大小保護驗證。
- 目錄的檔案權限為 `0700`，檔案為 `0600`。
- 清理遵循 `cleanup` 政策：`delete` 總是移除附件；`keep` 僅在 `retainOnSessionKeep: true` 時保留它們。

<a id="toolsexperimental"></a>

### `tools.experimental`

實驗性內建工具標誌。除非適用嚴格代理式 GPT-5 自動啟用規則，否則預設為關閉。

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

- `planTool`：啟用結構化 `update_plan` 工具，用於非平凡的逐步工作追蹤。
- 預設值為 `false`，除非針對 OpenAI 或 OpenAI Codex GPT-5 系列的執行，將 `agents.defaults.embeddedPi.executionContract`（或個別代理的覆寫設定）設為 `"strict-agentic"`。將 `true` 設為強制在該範圍外啟用工具，或設為 `false` 以在嚴格代理的 GPT-5 執行中仍保持關閉。
- 啟用時，系統提示詞也會新增使用指引，讓模型僅在處理實質性工作時使用，並保持最多一個步驟 `in_progress`。

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

- `model`：產生子代理的預設模型。若省略，子代理將繼承呼叫者的模型。
- `allowAgents`：當請求代理未設定自己的 `subagents.allowAgents` 時，`sessions_spawn` 的目標代理 ID 預設允許清單（`["*"]` = 任意；預設：僅限同一代理）。
- `runTimeoutSeconds`：當工具呼叫省略 `runTimeoutSeconds` 時，`sessions_spawn` 的預設逾時（秒）。`0` 表示無逾時。
- 個別子代理的工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自訂提供者和基礎 URL

OpenClaw 使用內建模型目錄。透過配置中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 新增自訂提供者。

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

- 使用 `authHeader: true` + `headers` 來滿足自訂驗證需求。
- 使用 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`，一個舊版環境變數別名）來覆寫代理配置根目錄。
- 匹配提供者 ID 的合併優先順序：
  - 非空白的代理 `models.json` `baseUrl` 值優先。
  - 非空白的代理 `apiKey` 值僅在當前配置/驗證設定檔環境中，該提供者非由 SecretRef 管理時優先。
  - SecretRef 管理的提供者 `apiKey` 值會從來源標記重新整理（環境變數參考為 `ENV_VAR_NAME`，檔案/exec 參考為 `secretref-managed`），而不是持續保存已解析的機密。
  - 由 SecretRef 管理的提供者標頭值會從來源標記重新整理（env 參考使用 `secretref-env:ENV_VAR_NAME`，file/exec 參考使用 `secretref-managed`）。
  - 空白或缺失的代理程式 `apiKey`/`baseUrl` 將回退至設定中的 `models.providers`。
  - 相符的模型 `contextWindow`/`maxTokens` 會使用明確設定與隱含目錄值之間較高者。
  - 相符的模型 `contextTokens` 會在存在時保留明確的執行時間上限；使用它來限制有效上下文而不變更原生模型元數據。
  - 當您希望設定完全覆寫 `models.json` 時，請使用 `models.mode: "replace"`。
  - 標記持久性以來源為準：標記是從使用中的來源設定快照（解析前）寫入，而非從解析後的執行時間秘密值寫入。

### 提供者欄位詳細資訊

- `models.mode`：提供者目錄行為（`merge` 或 `replace`）。
- `models.providers`：以提供者 ID 為鍵的自訂提供者映射。
  - 安全編輯：請使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 進行新增更新。`config set` 會拒絕破壞性的替換，除非您傳遞 `--replace`。
- `models.providers.*.api`：請求配接器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。
- `models.providers.*.apiKey`：提供者憑證（建議使用 SecretRef/env 替代）。
- `models.providers.*.auth`：認證策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
- `models.providers.*.injectNumCtxForOpenAICompat`：針對 Ollama + `openai-completions`，將 `options.num_ctx` 注入請求中（預設：`true`）。
- `models.providers.*.authHeader`：在需要時於 `Authorization` 標頭中強制傳輸憑證。
- `models.providers.*.baseUrl`：上游 API 基礎 URL。
- `models.providers.*.headers`：用於代理/租戶路由的額外靜態標頭。
- `models.providers.*.request`：模型提供者 HTTP 請求的傳輸覆蓋設定。
  - `request.headers`：額外標頭（與提供者預設值合併）。數值接受 SecretRef。
  - `request.auth`：驗證策略覆蓋。模式：`"provider-default"`（使用提供者內建驗證）、`"authorization-bearer"`（搭配 `token`）、`"header"`（搭配 `headerName`、`value`，可選 `prefix`）。
  - `request.proxy`：HTTP 代理覆蓋設定。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 環境變數）、`"explicit-proxy"`（搭配 `url`）。這兩種模式都接受可選的 `tls` 子物件。
  - `request.tls`：直接連線的 TLS 覆蓋設定。欄位：`ca`、`cert`、`key`、`passphrase`（皆接受 SecretRef）、`serverName`、`insecureSkipVerify`。
  - `request.allowPrivateNetwork`：當為 `true` 時，透過提供者 HTTP 擷取防護機制（操作員為受信任的自託管 OpenAI 相容端點選擇加入），允許在 DNS 解析為私有、CGNAT 或類似範圍時對 `baseUrl` 進行 HTTPS 存取。WebSocket 使用相同的 `request` 進行標頭/TLS 設定，但不使用該擷取 SSRF 閘道。預設為 `false`。
- `models.providers.*.models`：明確的提供者模型目錄項目。
- `models.providers.*.models.*.contextWindow`：原生模型上下文視窗元資料。
- `models.providers.*.models.*.contextTokens`：選用性的執行時語境上限。當您希望有效語境預算小於模型原生的 `contextWindow` 時使用此選項。
- `models.providers.*.models.*.compat.supportsDeveloperRole`：選用性的相容性提示。對於具有非空且非原生 `baseUrl`（主機非 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 會在執行時將其強制設為 `false`。留空或省略 `baseUrl` 則保持預設的 OpenAI 行為。
- `models.providers.*.models.*.compat.requiresStringContent`：僅支援字串的 OpenAI 相容聊天端點的選用性相容性提示。當設為 `true` 時，OpenClaw 會在發送請求前將純文字 `messages[].content` 陣列扁平化為純字串。
- `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自動探索設定根目錄。
- `plugins.entries.amazon-bedrock.config.discovery.enabled`：開啟或關閉隱式探索。
- `plugins.entries.amazon-bedrock.config.discovery.region`：用於探索的 AWS 區域。
- `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用於定向探索的選用性提供者 ID 篩選器。
- `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：探索更新的輪詢間隔。
- `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已探索模型的後備語境視窗。
- `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已探索模型的後備最大輸出 Token 數。

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

Cerebras 使用 `cerebras/zai-glm-4.7`；Z.AI direct 使用 `zai/glm-4.7`。

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

設定 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。Zen catalog 使用 `opencode/...` 參照，Go catalog 使用 `opencode-go/...` 參照。捷徑：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

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

設定 `ZAI_API_KEY`。`z.ai/*` 和 `z-ai/*` 是接受的別名。捷徑：`openclaw onboard --auth-choice zai-api-key`。

- 通用端點：`https://api.z.ai/api/paas/v4`
- 編碼端點（預設）：`https://api.z.ai/api/coding/paas/v4`
- 對於通用端點，請使用基礎 URL 覆蓋來定義自訂提供商。

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

原生 Moonshot 端點在共用 `openai-completions` 傳輸上宣佈支援串流使用相容性，且 OpenClaw 金鑰會比對端點功能，而非僅比對內建提供商 id。

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

Anthropic 相容的內建提供商。捷徑：`openclaw onboard --auth-choice kimi-code-api-key`。

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

基礎 URL 應省略 `/v1`（Anthropic 客戶端會附加它）。捷徑：`openclaw onboard --auth-choice synthetic-api-key`。

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
模型目錄預設僅包含 M2.7。
在 Anthropic 相容的串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考。`/fast on` 或
`params.fastMode: true` 會將 `MiniMax-M2.7` 重寫為
`MiniMax-M2.7-highspeed`。

</Accordion>

<Accordion title="本機模型 (LM Studio)">

參閱 [本機模型](/zh-Hant/gateway/local-models)。TL;DR：在強大的硬體上透過 LM Studio Responses API 執行大型本機模型；保留合併的託管模型作為備援。

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

- `allowBundled`：僅針對內建技能的可選允許清單（受管理/工作區技能不受影響）。
- `load.extraDirs`：額外的共享技能根目錄（優先順序最低）。
- `install.preferBrew`：若為 true，當 `brew`
  可用時，優先使用 Homebrew 安裝程式，然後再回退到其他種類的安裝程式。
- `install.nodeManager`：`metadata.openclaw.install`
  規格的節點安裝程式偏好設定（`npm` | `pnpm` | `yarn` | `bun`）。
- `entries.<skillKey>.enabled: false` 會停用技能，即使其已被內建或安裝。
- `entries.<skillKey>.apiKey`：為宣告主要環境變數的技能提供便利（純文字字串或 SecretRef 物件）。

---

## 外掛程式

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-plugin"],
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

- 從 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions`，以及 `plugins.load.paths` 載入。
- 探索功能接受原生 OpenClaw 外掛程式，以及相容的 Codex 套件和 Claude 套件，包括無資訊清單 的 Claude 預設佈局套件。
- **設定變更需要重新啟動閘道。**
- `allow`：可選允許清單（僅載入列出的外掛程式）。`deny` 優先。
- `plugins.entries.<id>.apiKey`：外掛程式層級的 API 金鑰便利欄位（當外掛程式支援時）。
- `plugins.entries.<id>.env`：外掛程式範圍的環境變數對應。
- `plugins.entries.<id>.hooks.allowPromptInjection`：當 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示詞變更欄位，同時保留舊版 `modelOverride` 和 `providerOverride`。適用於原生外掛程式掛鉤和支援的套件提供掛鉤目錄。
- `plugins.entries.<id>.subagent.allowModelOverride`：明確信任此外掛程式能為背景子代理程式執行請求每次執行的 `provider` 和 `model` 覆寫。
- `plugins.entries.<id>.subagent.allowedModels`：受信任子代理程式覆寫的正式 `provider/model` 目標選用允許清單。僅在您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.config`：外掛程式定義的設定物件（當可用時由原生 OpenClaw 外掛程式架構驗證）。
- `plugins.entries.firecrawl.config.webFetch`：Firecrawl 網頁擷取提供者設定。
  - `apiKey`：Firecrawl API 金鑰（接受 SecretRef）。會回退至 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`：Firecrawl API 基礎 URL（預設：`https://api.firecrawl.dev`）。
  - `onlyMainContent`：僅擷取頁面中的主要內容（預設：`true`）。
  - `maxAgeMs`：最大快取有效時間，以毫秒為單位（預設：`172800000` / 2 天）。
  - `timeoutSeconds`：爬蟲請求逾時時間，以秒為單位（預設：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search（Grok 網頁搜尋）設定。
  - `enabled`：啟用 X Search 提供者。
  - `model`：用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：記憶夢境設定。關於階段與閾值，請參閱 [Dreaming](/zh-Hant/concepts/dreaming)。
  - `enabled`：夢境主開關（預設 `false`）。
  - `frequency`：每次完整夢境掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - 階段策略與閾值屬於實作細節（非使用者面向的設定鍵）。
- 完整的記憶設定位於 [Memory configuration reference](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude 捆綁外掛也可以從 `settings.json` 提供內嵌的 Pi 預設值；OpenClaw 會將這些作為清理過的代理設定套用，而不是作為原始 OpenClaw 設定補丁。
- `plugins.slots.memory`：選取活躍的記憶體外掛 ID，或 `"none"` 以停用記憶體外掛。
- `plugins.slots.contextEngine`：選取活躍的情境引擎外掛 ID；除非您安裝並選擇了其他引擎，否則預設為 `"legacy"`。
- `plugins.installs`：由 `openclaw plugins update` 使用的 CLI 管理安裝中繼資料。
  - 包括 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。
  - 將 `plugins.installs.*` 視為受管理狀態；優先使用 CLI 指令而非手動編輯。

參閱 [外掛](/zh-Hant/tools/plugin)。

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
- 未設定時會停用 `ssrfPolicy.dangerouslyAllowPrivateNetwork`，因此瀏覽器導航預設保持嚴格模式。
- 僅當您刻意信任私人網路瀏覽器導航時，才設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在連線能力/探索檢查期間也會受到相同的私人網路封鎖限制。
- `ssrfPolicy.allowPrivateNetwork` 仍作為舊版別名受到支援。
- 在嚴格模式下，請使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 進行明確例外處理。
- 遠端設定檔僅支援連接 (停用啟動/停止/重設)。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  當您希望 OpenClaw 探索 `/json/version` 時，請使用 HTTP(S)；當您的提供者為您提供直接的 DevTools WebSocket URL 時，請使用 WS(S)。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，且可以連線到
  選定的主機或透過已連線的瀏覽器節點進行連接。
- `existing-session` 設定檔可以設定 `userDataDir` 以指定目標
  特定的基於 Chromium 的瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔保持目前的 Chrome MCP 路由限制：
  依賴快照/參照的動作而非 CSS 選擇器定位、單一檔案上傳
  掛鉤、無對話方塊逾時覆寫、無 `wait --load networkidle`，且無
  `responsebody`、PDF 匯出、下載攔截或批次動作。
- 本機管理的 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅
  針對遠端 CDP 明確設定 `cdpUrl`。
- 自動偵測順序：若為基於 Chromium 則為預設瀏覽器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服務：僅限回環 (埠號衍生自 `gateway.port`，預設為 `18791`)。
- `extraArgs` 會將額外的啟動旗標附加到本機 Chromium 啟動程序 (例如
  `--disable-gpu`、視窗大小或除錯旗標)。

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

- `seamColor`：原生應用程式 UI 外框的強調色 (對話模式氣泡色調等)。
- `assistant`：控制 UI 身分識別覆寫。回退至作用中的代理程式身分識別。

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

- `mode`： `local` （執行 gateway）或 `remote` （連線到遠端 gateway）。除非是 `local`，否則 Gateway 會拒絕啟動。
- `port`： WS + HTTP 的單一多工連接埠。優先順序： `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`： `auto`、 `loopback` （預設）、 `lan` （`0.0.0.0`）、 `tailnet` （僅限 Tailscale IP）或 `custom`。
- **舊版 bind 別名**：請在 `gateway.bind` 中使用 bind 模式值（ `auto`、 `loopback`、 `lan`、 `tailnet`、 `custom`），而不是主機別名（ `0.0.0.0`、 `127.0.0.1`、 `localhost`、 `::`、 `::1`）。
- **Docker 說明**：預設的 `loopback` bind 會在容器內監聽 `127.0.0.1`。使用 Docker 橋接網路（`-p 18789:18789`）時，流量會到達 `eth0`，因此無法連線到 gateway。請使用 `--network host`，或設定 `bind: "lan"` （或搭配 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`）以監聽所有介面。
- **驗證 (Auth)**：預設為必填。非 loopback bind 需要 gateway 驗證。實務上這意味著共享 token/密碼，或是具備身分識別感知能力的反向代理並使用 `gateway.auth.mode: "trusted-proxy"`。入門精靈預設會產生 token。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` （包括 SecretRefs），請明確將 `gateway.auth.mode` 設定為 `token` 或 `password`。當兩者皆已設定但未設定模式時，啟動和服務安裝/修復流程將會失敗。
- `gateway.auth.mode: "none"`：明確的無驗證模式。僅適用於受信任的本機 loopback 設定；入門提示刻意不提供此選項。
- `gateway.auth.mode: "trusted-proxy"`：將驗證委派給具備身分識別感知能力的反向代理，並信任來自 `gateway.trustedProxies` 的身分標頭（請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)）。此模式預期來自**非 loopback** 的代理來源；同主機 loopback 反向代理無法滿足 trusted-proxy 驗證。
- `gateway.auth.allowTailscale`：當 `true` 時，Tailscale Serve 身分標頭可以滿足 Control UI/WebSocket 驗證（透過 `tailscale whois` 驗證）。HTTP API 端點**不**會使用該 Tailscale 標頭驗證；它們會改為遵循 gateway 的正常 HTTP 驗證模式。這個無 token 流程假設 gateway 主機是受信任的。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：可選的驗證失敗限制器。針對每個客戶端 IP 和每個驗證範圍（shared-secret 和 device-token 會獨立追蹤）套用。被封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve Control UI 路徑上，相同 `{scope, clientIp}` 的失敗嘗試會在寫入失敗之前先序列化。因此，來自同一客戶端的並發錯誤嘗試會在第二次請求時觸發限制器，而不是兩者都像一般不匹配一樣競爭通過。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；如果您有意希望也對 localhost 流量進行速率限制（例如用於測試設定或嚴格的代理部署），請設定 `false`。
- 瀏覽器來源的 WS 驗證嘗試總是會受到節流並停用 loopback 例外（針對瀏覽器本機暴力破解的縱深防禦）。
- 在 loopback 上，這些瀏覽器來源鎖定是根據標準化的 `Origin`
  值隔離的，因此來自一個 localhost 來源的多次失敗不會自動
  鎖定不同的來源。
- `tailscale.mode`： `serve` （僅限 tailnet，loopback bind）或 `funnel` （公開，需要驗證）。
- `controlUi.allowedOrigins`：Gateway WebSocket 連線的明確瀏覽器來源允許清單。當預期來自非 loopback 來源的瀏覽器客戶端時，此為必填項目。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危險模式，可為刻意依賴 Host 標頭來源原則的部署啟用 Host 標頭來源後援。
- `remote.transport`： `ssh` （預設）或 `direct` （ws/wss）。對於 `direct`， `remote.url` 必須是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：客戶端緊急覆寫，允許純文字 `ws://` 連線到受信任的私人網路 IP；純文字預設仍維持僅限 loopback。
- `gateway.remote.token` / `.password` 是遠端客戶端憑證欄位。它們本身不設定 gateway 驗證。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 版本在將中繼支援的註冊發佈到 gateway 後，所使用之外部 APNs 中繼的基底 HTTPS URL。此 URL 必須符合編譯至 iOS 版本中的中繼 URL。
- `gateway.push.apns.relay.timeoutMs`：gateway 到中繼的傳送逾時（毫秒）。預設為 `10000`。
- 中繼支援的註冊會委派給特定的 gateway 身分。配對的 iOS 應用程式會擷取 `gateway.identity.get`，在該中繼註冊中包含該身分，並將註冊範圍的傳送授權轉送給 gateway。其他 gateway 無法重複使用該儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中繼設定的暫時性環境覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：僅供開發使用的 loopback HTTP 中繼 URL 緊急出口。生產環境中繼 URL 應維持使用 HTTPS。
- `gateway.channelHealthCheckMinutes`：通道健康監控間隔（分鐘）。設定 `0` 以全域停用健康監控重新啟動。預設值： `5`。
- `gateway.channelStaleEventThresholdMinutes`：過時 Socket 臨界值（分鐘）。請將此值保持大於或等於 `gateway.channelHealthCheckMinutes`。預設值： `30`。
- `gateway.channelMaxRestartsPerHour`：每小時滾動計算的每個通道/帳戶最大健康監控重新啟動次數。預設值： `10`。
- `channels.<provider>.healthMonitor.enabled`：針對健康監控重新啟動的每個通道退出選項，同時保持全域監控啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多重帳戶通道的每個帳戶覆寫。設定後，其優先順序高於通道層級的覆寫。
- 本機 gateway 呼叫路徑僅能在未設定 `gateway.auth.*` 時，將 `gateway.remote.*` 作為後援。
- 如果透過 SecretRef 明確設定 `gateway.auth.token` / `gateway.auth.password` 但未解析，解析將以失敗關閉（無遠端後援遮罩）。
- `trustedProxies`：終止 TLS 或插入轉送客戶端標頭的反向代理 IP。請僅列出您控制的代理。Loopback 項目在同主機代理/本機偵測設定（例如 Tailscale Serve 或本機反向代理）中仍然有效，但它們**不**會讓 loopback 要求符合 `gateway.auth.mode: "trusted-proxy"` 的資格。
- `allowRealIpFallback`：當 `true` 時，如果缺少 `X-Forwarded-For`，gateway 會接受 `X-Real-IP`。預設為 `false` 以實施失敗關閉行為。
- `gateway.tools.deny`：針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱（延伸預設拒絕清單）。
- `gateway.tools.allow`：從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- Chat Completions：預設停用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入加固：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空的允許清單視為未設定；請使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用的回應加固標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` (僅針對您控制的 HTTPS 來源設定；請參閱[信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### 多實體隔離

在同一台主機上使用唯一的連接埠和狀態目錄執行多個閘道：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷旗標：`--dev` (使用 `~/.openclaw-dev` + 連接埠 `19001`)、`--profile <name>` (使用 `~/.openclaw-<name>`)。

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

- `enabled`：在閘道監聽器啟用 TLS 終止 (HTTPS/WSS) (預設：`false`)。
- `autoGenerate`：當未設定明確的檔案時，自動產生本機自我簽署的憑證/金鑰對；僅供本機/開發使用。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私鑰檔案的檔案系統路徑；請保持權限限制。
- `caPath`：選用的 CA 套件路徑，用於用戶端驗證或自訂信任鏈。

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

- `mode`：控制設定編輯如何在執行時期套用。
  - `"off"`：忽略即時編輯；變更需要明確重新啟動。
  - `"restart"`：設定變更時總是重新啟動閘道程序。
  - `"hot"`：在程序內套用變更而不重新啟動。
  - `"hybrid"` (預設)：先嘗試熱重新載入；如有需要則回退到重新啟動。
- `debounceMs`：套用設定變更前的防跳動視窗 (毫秒) (非負整數)。
- `deferralTimeoutMs`：在強制重啟之前等待進行中操作的最大時間（毫秒）（預設值：`300000` = 5 分鐘）。

---

## 鉤子

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

身份驗證：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
查詢字串鉤子令牌會被拒絕。

驗證與安全注意事項：

- `hooks.enabled=true` 需要一個非空的 `hooks.token`。
- `hooks.token` 必須與 `gateway.auth.token` **不同**；重複使用 Gateway 令牌會被拒絕。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果映射或預設使用樣板化的 `sessionKey`，請設定 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態映射鍵不需要該選擇加入。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅當 `hooks.allowRequestSessionKey=true` 時（預設值：`false`），才接受來自請求載荷的 `sessionKey`。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 樣板渲染的映射 `sessionKey` 值被視為外部提供，並且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應詳情">

- `match.path` 符合 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 符合通用路徑的 payload 欄位。
- 像 `{{messages[0].subject}}` 這樣的模板會從 payload 讀取。
- `transform` 可以指向一個回傳 hook 動作的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，且保持在 `hooks.transformsDir` 內（絕對路徑和路徑遍歷會被拒絕）。
- `agentId` 路由至特定代理程式；未知的 ID 會回退至預設值。
- `allowedAgentIds`：限制明確路由（`*` 或省略 = 允許全部，`[]` = 拒絕全部）。
- `defaultSessionKey`：針對沒有明確 `sessionKey` 的 hook 代理程式執行，選用的固定 session 金鑰。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和模板驅動的對應 session 金鑰設定 `sessionKey`（預設：`false`）。
- `allowedSessionKeyPrefixes`：針對明確 `sessionKey` 值（請求 + 對應）的選用前綴允許清單，例如 `["hook:"]`。當任何對應或預設集使用模板化的 `sessionKey` 時，此項即為必要。
- `deliver: true` 將最終回覆傳送至頻道；`channel` 預設為 `last`。
- `model` 覆寫此次 hook 執行的 LLM（如果設定了模型目錄，則必須被允許）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設集使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該每封訊息路由，請設定 `hooks.allowRequestSessionKey: true` 並限制 `hooks.allowedSessionKeyPrefixes` 以符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態的 `sessionKey` 覆蓋預設，而不是使用預設的模板化值。

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

- Gateway 在配置時會在啟動時自動啟動 `gog gmail watch serve`。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用。
- 不要在 Gateway 旁邊單獨運行 `gog gmail watch serve`。

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

- 在 Gateway 埠下透過 HTTP 提供可由 Agent 編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本機：保留 `gateway.bind: "loopback"`（預設值）。
- 非回環綁定：canvas 路由需要 Gateway 身份驗證（token/password/trusted-proxy），與其他 Gateway HTTP 介面相同。
- Node WebViews 通常不發送身份驗證標頭；在節點配對並連接後，Gateway 會宣傳用於 canvas/A2UI 訪問的節點範圍功能 URL。
- 功能 URL 綁定到活動的節點 WS 會話並且很快過期。不使用基於 IP 的後備。
- 將即時重新載入客戶端注入到提供的 HTML 中。
- 當空白時自動建立初始 `index.html`。
- 同時在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 gateway。
- 對於大型目錄或 `EMFILE` 錯誤，請停用即時重新載入。

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

- `minimal`（預設值）：從 TXT 記錄中省略 `cliPath` + `sshPort`。
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

在 `~/.openclaw/dns/` 下寫入單播 DNS-SD 區域。對於跨網路探索，請與 DNS 伺服器（推薦 CoreDNS）+ Tailscale 分流 DNS 配合使用。

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

- 僅當進程環境中缺少該鍵時，才會應用內聯環境變數。
- `.env` 文件：CWD `.env` + `~/.openclaw/.env`（兩者都不會覆蓋現有變數）。
- `shellEnv`：從您的登入 shell 設定檔匯入時遺漏了預期的金鑰。
- 有關完整的優先順序，請參閱[環境](/zh-Hant/help/environment)。

### 環境變數替換

使用 `${VAR_NAME}` 在任何設定字串中參照環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅比對大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 遺漏/空的變數會在載入設定時擲回錯誤。
- 使用 `$${VAR}` 來跳脫字面 `${VAR}`。
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
- `source: "exec"` id 不得包含 `.` 或 `..` 斜線分隔的路徑區段（例如 `a/../b` 會被拒絕）

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

- `file` 提供者支援 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下 `id` 必須是 `"value"`）。
- `exec` 提供者需要絕對 `command` 路徑，並在 stdin/stdout 上使用協定負載。
- 預設情況下，符號連結命令路徑會被拒絕。設定 `allowSymlinkCommand: true` 以允許符號連結路徑，同時驗證解析後的目標路徑。
- 如果設定了 `trustedDirs`，trusted-dir 檢查會套用於解析後的目標路徑。
- `exec` 子環境預設為最小化；請使用 `passEnv` 明確傳遞所需的變數。
- Secret 參照會在啟動時解析為記憶體中的快照，之後請求路徑僅讀取該快照。
- 啟動期間會套用啟用介面篩選：啟用介面上未解析的參照會導致啟動/重新載入失敗，而非啟用介面則會跳過並輸出診斷資訊。

---

## 驗證儲存

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
- `auth-profiles.json` 支援靜態憑證模式的值層級參照（對 `api_key` 使用 `keyRef`，對 `token` 使用 `tokenRef`）。
- OAuth 模式設定檔 (`auth.profiles.<id>.mode = "oauth"`) 不支援以 SecretRef 為基礎的 auth-profile 憑證。
- 靜態執行時期憑證來自記憶體中解析的快照；舊版的靜態 `auth.json` 項目在發現時會被清除。
- 來自 `~/.openclaw/credentials/oauth.json` 的舊版 OAuth 匯入。
- 請參閱 [OAuth](/zh-Hant/concepts/oauth)。
- Secrets 執行時期行為和 `audit/configure/apply` 工具：[Secrets Management](/zh-Hant/gateway/secrets)。

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

- `billingBackoffHours`：當設定檔因真正的計費/餘額不足錯誤而失敗時，以小時為單位的基本退避時間（預設值：`5`）。即使在 `401`/`403` 回應上，明確的計費文字仍可能歸類於此，但特定供應商的文字比對器仍僅限於擁有它們的供應商（例如 OpenRouter
  `Key limit exceeded`）。可重試的 HTTP `402` 使用量視窗或
  組織/工作區支出上限訊息則會改走 `rate_limit` 路徑。
- `billingBackoffHoursByProvider`：可選的各供應商計費退避小時數覆寫設定。
- `billingMaxHours`：計費退避指數增長的以小時為單位的上限（預設值：`24`）。
- `authPermanentBackoffMinutes`：高置信度 `auth_permanent` 失敗的基礎退避時間（以分鐘為單位）（預設值：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增長的以分鐘為單位的上限（預設值：`60`）。
- `failureWindowHours`：用於退避計數器的滾動視窗（以小時為單位）（預設值：`24`）。
- `overloadedProfileRotations`：在切換到模型後備之前，針對過載錯誤的最大同提供者 auth-profile 輪換次數（預設值：`1`）。諸如 `ModelNotReadyException` 之類的提供者忙碌形狀歸入此處。
- `overloadedBackoffMs`：在重試過載的提供者/個人資料輪換之前的固定延遲（預設值：`0`）。
- `rateLimitedProfileRotations`：在切換到模型後備之前，針對速率限制錯誤的最大同提供者 auth-profile 輪換次數（預設值：`1`）。該速率限制儲存桶包括提供者形狀的文字，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

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
- 當 `--verbose` 時，`consoleLevel` 會提升至 `debug`。
- `maxFileBytes`：抑制寫入之前的日誌檔案最大大小（以位元組為單位）（正整數；預設值：`524288000` = 500 MB）。對於生產環境部署，請使用外部日誌輪替。

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

- `enabled`：檢測儀表輸出的主開關（預設值：`true`）。
- `flags`：啟用特定日誌輸出的旗標字串陣列（支援萬用字元，如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：當會話保持處理狀態時，發出卡住會話警告的年齡閾值（毫秒）。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設：`false`）。
- `otel.endpoint`：OTel 匯出的收集器 URL。
- `otel.protocol`：`"http/protobuf"`（預設）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出請求發送的額外 HTTP/gRPC 元資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或日誌匯出。
- `otel.sampleRate`：追蹤採樣率 `0`–`1`。
- `otel.flushIntervalMs`：定期遙測清除間隔（毫秒）。
- `cacheTrace.enabled`：記錄嵌入式執行的快取追蹤快照（預設：`false`）。
- `cacheTrace.filePath`：快取追蹤 JSONL 的輸出路徑（預設：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制快取追蹤輸出中包含的內容（全部預設為：`true`）。

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

- `channel`：npm/git 安裝的發行通道 — `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：當閘道啟動時檢查 npm 更新（預設：`true`）。
- `auto.enabled`：啟用套件安裝的背景自動更新（預設：`false`）。
- `auto.stableDelayHours`：穩定版通道自動套用前的最小延遲小時數（預設：`6`；最大值：`168`）。
- `auto.stableJitterHours`：額外的穩定版頻道發布分佈時間視窗，以小時為單位（預設值：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：測試版頻道檢查的運行頻率，以小時為單位（預設值：`1`；最大值：`24`）。

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

- `enabled`：ACP 全域功能閘門（預設值：`false`）。
- `dispatch.enabled`：ACP 會話回合調度的獨立閘門（預設值：`true`）。設定 `false` 以在阻止執行的同時保持 ACP 指令可用。
- `backend`：預設的 ACP 運行後端 ID（必須符合已註冊的 ACP 運行外掛程式）。
- `defaultAgent`：當生成未指定明確目標時，使用的後備 ACP 目標代理程式 ID。
- `allowedAgents`：允許用於 ACP 運行會話的代理程式 ID 白名單；留空表示無額外限制。
- `maxConcurrentSessions`：最大並行活躍 ACP 會話數。
- `stream.coalesceIdleMs`：串流文字的閒置排空時間視窗，以毫秒為單位。
- `stream.maxChunkChars`：分割串流區塊投影前的最大區塊大小。
- `stream.repeatSuppression`：抑制每回合重複的狀態/工具列（預設值：`true`）。
- `stream.deliveryMode`：`"live"` 累加式串流；`"final_only"` 緩衝直到回合終端事件。
- `stream.hiddenBoundarySeparator`：隱藏工具事件後可見文字之前的分隔符號（預設值：`"paragraph"`）。
- `stream.maxOutputChars`：每個 ACP 回合投影的最大助理輸出字元數。
- `stream.maxSessionUpdateChars`：投影的 ACP 狀態/更新列的最大字元數。
- `stream.tagVisibility`：標籤名稱至布林值可見性覆寫的記錄，用於串流事件。
- `runtime.ttlMinutes`：ACP 會話工作程式在符合清理條件前的閒置 TTL，以分鐘為單位。
- `runtime.installCommand`：在初始化 ACP 執行階段環境時執行的可選安裝指令。

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

- `cli.banner.taglineMode` 控制橫幅標語風格：
  - `"random"` (預設值)：輪換顯示有趣的/季節性標語。
  - `"default"`：固定的中性標語 (`All your chats, one OpenClaw.`)。
  - `"off"`：無標語文字 (仍會顯示橫幅標題/版本)。
- 若要隱藏整個橫幅 (而不僅是標語)，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

---

## 精靈

由 CLI 導引設定流程所寫入的中繼資料 (`onboard`, `configure`, `doctor`)：

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

## 身分識別

請參閱 [Agent defaults](#agent-defaults) 下的 `agents.list` 身分識別欄位。

---

## 橋接器 (舊版，已移除)

目前的版本組建不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 金鑰不再是設定架構的一部分 (驗證會失敗直到將其移除；`openclaw doctor --fix` 可移除未知金鑰)。

<Accordion title="舊版橋接器設定 (歷史參考)">

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

- `sessionRetention`：在從 `sessions.json` 修剪之前，保留已完成的隔離 cron 執行階段的時間長度。同時也會控制已刪除 cron 腳本的歸檔清理。預設值：`24h`；設定 `false` 可停用。
- `runLog.maxBytes`：每次執行日誌檔案 (`cron/runs/<jobId>.jsonl`) 在修剪前的最大大小。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：觸發執行日誌修剪時保留的最新行數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 傳遞 (`delivery.mode = "webhook"`) 的 bearer token，如果省略則不發送授權標頭。
- `webhook`：已棄用的舊版後備 webhook URL (http/https)，僅用於仍有 `notify: true` 的已儲存作業。

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
- `retryOn`：觸發重試的錯誤類型 — `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略此項以重試所有暫時性類型。

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

- 所有任務的 cron 失敗通知的預設目標。
- `mode`：`"announce"` 或 `"webhook"`；當有足夠的目標資料時，預設為 `"announce"`。
- `channel`：公告傳遞的頻道覆寫。`"last"` 會重複使用最後已知的傳遞頻道。
- `to`：明確的公告目標或 webhook URL。Webhook 模式必填。
- `accountId`：用於傳遞的選用帳號覆寫。
- 個別任務的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當既未設定全域也未設定個別工作的失敗目標時，已透過 `announce` 傳遞的工作在失敗時會回退至該主要宣佈目標。
- `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 工作，除非該工作的主要 `delivery.mode` 是 `"webhook"`。

請參閱 [Cron 工作](/zh-Hant/automation/cron-jobs)。獨立的 cron 執行會被追蹤為 [背景任務](/zh-Hant/automation/tasks)。

---

## 媒體模型範本變數

在 `tools.media.models[].args` 中展開的範本佔位符：

| 變數               | 說明                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的傳入訊息內文                           |
| `{{RawBody}}`      | 原始內文（無歷史記錄/發送者包裝器）          |
| `{{BodyStripped}}` | 移除群組提及的內文                           |
| `{{From}}`         | 發送者識別碼                                 |
| `{{To}}`           | 目標識別碼                                   |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前工作階段 UUID                            |
| `{{IsNewSession}}` | 建立新工作階段時的 `"true"`                  |
| `{{MediaUrl}}`     | 傳入媒體偽 URL                               |
| `{{MediaPath}}`    | 本機媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（影像/音訊/文件/…）                 |
| `{{Transcript}}`   | 音訊文字紀錄                                 |
| `{{Prompt}}`       | CLI 項目的已解析媒體提示                     |
| `{{MaxChars}}`     | CLI 項目的已解析最大輸出字元數               |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群組主旨（盡力而為）                         |
| `{{GroupMembers}}` | 群組成員預覽（盡力而為）                     |
| `{{SenderName}}`   | 發送者顯示名稱（盡力而為）                   |
| `{{SenderE164}}`   | 發送者電話號碼（盡力而為）                   |
| `{{Provider}}`     | 提供者提示（whatsapp、telegram、discord 等） |

---

## 設定包含（`$include`）

將設定拆分為多個檔案：

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
- 檔案陣列：按順序深度合併（後面的覆蓋前面的）。
- 同層級鍵：在引入之後合併（覆蓋引入的值）。
- 巢狀引入：最多深達 10 層。
- 路徑：相對於引入檔案解析，但必須保持在頂層設定目錄（`dirname` 的 `openclaw.json`）內。只有在仍解析至該邊界內時，才允許使用絕對路徑/`../` 形式。
- 如果 OpenClaw 擁有的寫入僅改變由單一檔案引入支援的一個頂層區段，則這些寫入會直接套用至該引入檔案。例如，`plugins install` 會更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，並保持 `openclaw.json` 不變。
- 根引入、引入陣列以及具有同層級覆蓋的引入，對於 OpenClaw 擁有的寫入是唯讀的；這些寫入會失敗關閉，而不是扁平化設定。
- 錯誤：針對缺少檔案、解析錯誤和循環引入提供清晰的訊息。

---

_相關：[Configuration](/zh-Hant/gateway/configuration) · [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_
