---
summary: "頻道組態：存取控制、配對、跨 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的各頻道金鑰"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "組態 — 頻道"
---

`channels.*` 下的各頻道組態金鑰。涵蓋 DM 和群組存取、
多重帳號設定、提及閘控，以及 Slack、Discord、
Telegram、WhatsApp、Matrix、iMessage 和其他內建頻道外掛的各頻道金鑰。

關於代理程式、工具、Gateway 執行時和其他頂層金鑰，請參閱
[組態參考](/zh-Hant/gateway/configuration-reference)。

## 頻道

當其組態區段存在時，每個頻道會自動啟動（除非 `enabled: false`）。

### DM 和群組存取

所有頻道都支援 DM 原則和群組原則：

| DM 原則          | 行為                                                |
| ---------------- | --------------------------------------------------- |
| `pairing` (預設) | 未知傳送者會收到一次性配對碼；擁有者必須核准        |
| `allowlist`      | 僅限 `allowFrom` 中的傳送者（或已配對的允許存放區） |
| `open`           | 允許所有傳入 DM (需要 `allowFrom: ["*"]`)           |
| `disabled`       | 忽略所有傳入 DM                                     |

| 群組原則           | 行為                                 |
| ------------------ | ------------------------------------ |
| `allowlist` (預設) | 僅限符合設定允許清單的群組           |
| `open`             | 略過群組允許清單（提及閘控仍然適用） |
| `disabled`         | 封鎖所有群組/房間訊息                |

<Note>
`channels.defaults.groupPolicy` 當提供者的 `groupPolicy` 未設定時設定預設值。
配對碼在 1 小時後過期。待處理的 DM 配對請求上限為 **每個頻道 3 個**。
如果提供者區塊完全遺失（`channels.<provider>` 不存在），執行時群組原則會回退到 `allowlist` (fail-closed) 並顯示啟動警告。
</Note>

### 頻道模型覆寫

使用 `channels.modelByChannel` 將特定頻道 ID 固定到模型。數值接受 `provider/model` 或已設定的模型別名。當工作階段尚未有模型覆寫時（例如，透過 `/model` 設定），會套用頻道對應。

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

使用 `channels.defaults` 來跨供應商設定共用的群組原則和心跳行為：

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

- `channels.defaults.groupPolicy`：當供應商層級的 `groupPolicy` 未設定時的後備群組原則。
- `channels.defaults.contextVisibility`：所有通道的預設補充內容可見性模式。數值：`all`（預設，包含所有引用/串列/歷史內容）、`allowlist`（僅包含來自白名單發送者的內容）、`allowlist_quote`（與白名單相同但保留明確的引用/回覆內容）。個別通道覆寫：`channels.<channel>.contextVisibility`。
- `channels.defaults.heartbeat.showOk`：在心跳輸出中包含健康的通道狀態。
- `channels.defaults.heartbeat.showAlerts`：在心跳輸出中包含降級/錯誤狀態。
- `channels.defaults.heartbeat.useIndicator`：渲染精簡的指示器風格心跳輸出。

### WhatsApp

WhatsApp 透過 gateway 的網頁通道（Baileys Web）運行。當存在連結的工作階段時，它會自動啟動。

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

- 如果存在，出站指令預設使用帳號 `default`；否則使用第一個設定的帳號 ID（已排序）。
- 可選的 `channels.whatsapp.defaultAccount` 會在符合設定的帳號 ID 時覆寫該後備預設帳號選擇。
- 舊版單帳號 Baileys auth 目錄會由 `openclaw doctor` 遷移至 `whatsapp/default`。
- 每個帳號的覆寫：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

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

- Bot 權杖：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（僅限一般檔案；拒絕符號連結），並以 `TELEGRAM_BOT_TOKEN` 作為預設帳號的後備。
- 可選的 `channels.telegram.defaultAccount` 會在符合設定的帳號 ID 時覆寫預設帳號選擇。
- 在多帳號設置（2 個或更多帳號 ID）中，設定一個明確的預設值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免備援路由；當缺少或無效時，`openclaw doctor` 會發出警告。
- `configWrites: false` 會阻擋由 Telegram 發起的配置寫入（超級群組 ID 遷移、`/config set|unset`）。
- 頂層 `bindings[]` 條目搭配 `type: "acp"` 可為論壇主題設定持續的 ACP 綁定（在 `match.peer.id` 中使用規範的 `chatId:topic:topicId`）。欄位語義詳見 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。
- Telegram 串流預覽使用 `sendMessage` + `editMessageText`（適用於直接和群組聊天）。
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

- Token：`channels.discord.token`，並以 `DISCORD_BOT_TOKEN` 作為預設帳號的備選。
- 提供明確 Discord `token` 的直接 outbound 呼叫會使用該 token；帳號重試/政策設定仍來自作用中 runtime 快照內所選的帳號。
- 當符合設定的帳號 ID 時，可選的 `channels.discord.defaultAccount` 會覆寫預設帳號選擇。
- 請使用 `user:<id>`（DM）或 `channel:<id>`（伺服器頻道）作為傳送目標；不接受純數字 ID。
- Guild slug 為小寫，空格會以 `-` 取代；頻道金鑰使用 slug 名稱（無 `#`）。建議優先使用 Guild ID。
- 預設會忽略由 Bot 撰寫的訊息。`allowBots: true` 可啟用它們；使用 `allowBots: "mentions"` 僅接受提及該 Bot 的 Bot 訊息（自己的訊息仍會被過濾）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及頻道覆寫）會捨棄提及其他使用者或角色但未提及該 Bot 的訊息（排除 @everyone/@here）。
- `maxLinesPerMessage`（預設 17）會分割長訊息，即使字數低於 2000 字。
- `channels.discord.threadBindings` 控制 Discord 綁定執行緒的路由：
  - `enabled`:針對執行緒繫結會話功能的 Discord 覆寫（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及繫結的傳遞/路由）
  - `idleHours`: Discord 針對非活動自動取消聚焦的覆寫（小時）（`0` 表示停用）
  - `maxAgeHours`: Discord 針對強制最大存留時間的覆寫（小時）（`0` 表示停用）
  - `spawnSubagentSessions`: `sessions_spawn({ thread: true })` 自動建立/繫結執行緒的選用開關
- 頂層 `bindings[]` 項目若帶有 `type: "acp"`，則會設定頻道和執行緒的永久 ACP 繫結（在 `match.peer.id` 中使用頻道/執行緒 ID）。欄位語義在 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings) 中共用。
- `channels.discord.ui.components.accentColor` 設定 Discord 組件 v2 容器的強調色。
- `channels.discord.voice` 啟用 Discord 語音頻道對話，以及選用的自動加入 + LLM + TTS 覆寫。
- `channels.discord.voice.model` 選用性地覆寫用於 Discord 語音頻道回應的 LLM 模型。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` DAVE 選項（預設為 `true` 和 `24`）。
- OpenClaw 會在重複解密失敗後，嘗試透過離開並重新加入語音階段來恢復語音接收。
- `channels.discord.streaming` 是正式的串流模式鍵。舊版 `streamMode` 和布林值 `streaming` 會自動遷移。
- `channels.discord.autoPresence` 將執行時期可用性對應至 Bot 上線狀態（healthy => online、degraded => idle、exhausted => dnd），並允許選用的狀態文字覆寫。
- `channels.discord.dangerouslyAllowNameMatching` 重新啟用可變名稱/標籤比對（應急玻璃相容模式）。
- `channels.discord.execApprovals`: Discord 原生執行核准傳遞與核准者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設值）。在自動模式下，當可以從 `approvers` 或 `commands.ownerAllowFrom` 解析出審核者時，exec 核准才會啟動。
  - `approvers`：被允許核准 exec 請求的 Discord 使用者 ID。如果省略，則回退至 `commands.ownerAllowFrom`。
  - `agentFilter`：選用的代理程式 ID 允許清單。省略此項以轉發所有代理程式的核准。
  - `sessionFilter`：選用的會話金鑰模式（子字串或正規表示式）。
  - `target`：傳送核准提示的目標位置。`"dm"`（預設值）傳送到審核者的 DM，`"channel"` 傳送到原始頻道，`"both"` 傳送到這兩者。當目標包含 `"channel"` 時，按鈕僅供已解析的審核者使用。
  - `cleanupAfterResolve`：當 `true` 時，會在核准、拒絕或逾時後刪除核准 DM。

**反應通知模式**：`off`（無）、`own`（機器人的訊息，預設值）、`all`（所有訊息）、`allowlist`（從 `guilds.<id>.users` 對所有訊息）。

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
- `channels.googlechat.dangerouslyAllowNameMatching` 會重新啟用可變動郵件主體匹配（緊急相容性模式）。

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

- **Socket 模式**需要同時具備 `botToken` 和 `appToken`（預設帳戶環境變數回退則為 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式**需要 `botToken` 以及 `signingSecret`（在根目錄或每個帳號層級）。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- Slack 帳號快照會公開每個憑證來源/狀態欄位，例如 `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的 `signingSecretStatus`。`configured_unavailable` 表示帳號透過 SecretRef 設定，但目前的指令/執行時路徑無法解析 secret 值。
- `configWrites: false` 會阻擋 Slack 發起的設定寫入。
- 可選的 `channels.slack.defaultAccount` 會在符合已設定的帳號 ID 時覆寫預設的帳號選擇。
- `channels.slack.streaming.mode` 是正式的 Slack 串流模式金鑰。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生串流傳輸。舊版的 `streamMode`、布林值 `streaming` 和 `nativeStreaming` 值會自動遷移。
- 使用 `user:<id>` (DM) 或 `channel:<id>` 作為傳遞目標。

**反應通知模式：** `off`、`own` (預設)、`all`、`allowlist` (來自 `reactionAllowlist`)。

**執行緒會話隔離：** `thread.historyScope` 為每個執行緒 (預設) 或在頻道間共用。`thread.inheritParent` 會將父頻道紀錄複製到新執行緒。

- Slack 原生串流加上 Slack 助理風格的「正在輸入...」執行緒狀態需要一個回覆執行緒目標。頂層 DM 預設會保持在執行緒之外，因此它們會使用 `typingReaction` 或一般傳遞，而不是執行緒風格的預覽。
- `typingReaction` 會在執行回覆時，在傳入的 Slack 訊息上新增暫時性的反應，然後在完成時將其移除。使用 Slack emoji 短代碼，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生 exec 傳遞審批與審批者授權。架構與 Discord 相同：`enabled` (`true`/`false`/`"auto"`)、`approvers` (Slack 使用者 ID)、`agentFilter`、`sessionFilter` 與 `target` (`"dm"`、`"channel"` 或 `"both"`)。

| Action group | 預設    | 備註                   |
| ------------ | ------- | ---------------------- |
| reactions    | enabled | React + list reactions |
| messages     | enabled | Read/send/edit/delete  |
| pins         | enabled | Pin/unpin/list         |
| memberInfo   | enabled | Member info            |
| emojiList    | enabled | Custom emoji list      |

### Mattermost

Mattermost 以插件形式提供：`openclaw plugins install @openclaw/mattermost`。

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
- `commands.callbackUrl` 必須解析至 OpenClaw gateway 端點，且能從 Mattermost 伺服器存取。
- 原生斜線回呼 (slash callback) 使用 Mattermost 在斜線命令註冊期間傳回的每個命令 token 進行驗證。如果註冊失敗或未啟用任何命令，OpenClaw 會以 `Unauthorized: invalid command token.` 拒絕回呼。
- 對於私密/tailnet/內部回呼主機，Mattermost 可能需要 `ServiceSettings.AllowedUntrustedInternalConnections` 包含回呼主機/網域。
  請使用主機/網域值，而非完整的 URL。
- `channels.mattermost.configWrites`：允許或拒絕 Mattermost 發起的設定寫入。
- `channels.mattermost.requireMention`：在頻道中回覆前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：每頻道的提及閘門覆寫 (`"*"` 代表預設值)。
- 選用的 `channels.mattermost.defaultAccount` 當符合已設定的帳戶 ID 時，會覆寫預設的帳戶選擇。

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

- `channels.signal.account`：將頻道啟動鎖定至特定的 Signal 帳號身分。
- `channels.signal.configWrites`：允許或拒絕 Signal 發起的設定寫入。
- 選用的 `channels.signal.defaultAccount` 會在符合已設定的帳號 ID 時覆寫預設的帳號選擇。

### BlueBubbles

BlueBubbles 是推薦的 iMessage 路徑（由外掛程式支援，在 `channels.bluebubbles` 下設定）。

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

- 此處涵蓋的核心鍵路徑：`channels.bluebubbles`、`channels.bluebubbles.dmPolicy`。
- 選用的 `channels.bluebubbles.defaultAccount` 會在符合已設定的帳號 ID 時覆寫預設的帳號選擇。
- 頂層的 `bindings[]` 項目若包含 `type: "acp"`，可將 BlueBubbles 對話綁定至持續的 ACP 會話。在 `match.peer.id` 中使用 BlueBubbles handle 或目標字串（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共用欄位語意：[ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。
- 完整的 BlueBubbles 頻道設定文件請參閱 [BlueBubbles](/zh-Hant/channels/bluebubbles)。

### iMessage

OpenClaw 會生成 `imsg rpc`（透過 stdio 的 JSON-RPC）。不需要背景程式或連接埠。

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

- 選用的 `channels.imessage.defaultAccount` 會在符合已設定的帳號 ID 時覆寫預設的帳號選擇。

- 需要對 Messages DB 的完整磁碟存取權。
- 建議使用 `chat_id:<id>` 目標。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包裝程式；設定 `remoteHost`（`host` 或 `user@host`）以進行 SCP 附件擷取。
- `attachmentRoots` 和 `remoteAttachmentRoots` 會限制傳入附件的路徑（預設：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用嚴格的主機金鑰檢查，因此請確保中繼主機金鑰已存在於 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允許或拒絕由 iMessage 發起的配置寫入。
- 頂層 `bindings[]` 項目若包含 `type: "acp"`，可將 iMessage 對話綁定到持續的 ACP 工作階段。請在 `match.peer.id` 中使用正規化的 handle 或明確的聊天目標 (`chat_id:*`、`chat_guid:*`、`chat_identifier:*`)。共用欄位語意：[ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。

<Accordion title="iMessage SSH 包裝器範例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 由外掛程式支援，並在 `channels.matrix` 下進行配置。

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
- `channels.matrix.proxy` 會將 Matrix HTTP 流量路由傳送透過指定的 HTTP(S) 代理伺服器。命名帳戶可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫此設定。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允許私人/內部 Homeserver。`proxy` 與此網路選用機制是獨立的控制項。
- `channels.matrix.defaultAccount` 在多帳戶設定中選擇偏好的帳戶。
- `channels.matrix.autoJoin` 預設為 `off`，因此在您使用 `autoJoin: "allowlist"` 設定 `autoJoinAllowlist` 或 `autoJoin: "always"` 之前，被邀請的房間和新的 DM 式邀請將被忽略。
- `channels.matrix.execApprovals`：Matrix 原生的 exec 審核傳遞與審核者授權。
  - `enabled`：`true`、`false` 或 `"auto"` (預設)。在自動模式下，當可從 `approvers` 或 `commands.ownerAllowFrom` 解析出審核者時，exec 審核會啟用。
  - `approvers`：獲准批准 exec 請求的 Matrix 使用者 ID (例如 `@owner:example.org`)。
  - `agentFilter`：選用的代理程式 ID 允許清單。若省略，則轉送所有代理程式的審核請求。
  - `sessionFilter`：選用的會話金鑰模式（子字串或正規表達式）。
  - `target`：傳送審核提示的位置。`"dm"`（預設）、`"channel"`（原始房間）或 `"both"`。
  - 每個帳戶的覆寫：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix 私訊 (DM) 如何分組為會話：`per-user`（預設）依路由對等方共享，而 `per-room` 則將每個 DM 房間隔離。
- Matrix 狀態探測即時目錄查詢使用與執行時流量相同的代理政策。
- 完整的 Matrix 設定、目標規則和設定範例記錄於 [Matrix](/zh-Hant/channels/matrix)。

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
- 完整的 Teams 設定（憑證、Webhook、DM/群組政策、每團隊/每頻道覆寫）記錄於 [Microsoft Teams](/zh-Hant/channels/msteams)。

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
- 選用的 `channels.irc.defaultAccount` 會在符合設定的帳戶 ID 時，覆寫預設的帳戶選擇。
- 完整的 IRC 頻道設定（主機/連接埠/TLS/頻道/允許清單/提及閘門）記錄於 [IRC](/zh-Hant/channels/irc)。

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
- 基礎頻道設定適用於所有帳戶，除非按帳戶進行覆寫。
- 使用 `bindings[].match.accountId` 將每個帳戶路由到不同的代理程式。
- 如果您在仍處於單一帳號頂層通道配置時透過 `openclaw channels add`（或通道上線）新增非預設帳號，OpenClaw 會先將帳號範圍的頂層單一帳號值提升至通道帳號映射，讓原始帳號繼續運作。大多數通道會將它們移至 `channels.<channel>.accounts.default`；Matrix 可以改為保留現有的相符命名/預設目標。
- 現有的僅通道綁定（無 `accountId`）持續符合預設帳號；帳號範圍的綁定維持選用。
- `openclaw doctor --fix` 也會透過將帳號範圍的頂層單一帳號值移至為該通道選擇的已提升帳號，來修復混合形狀。大多數通道使用 `accounts.default`；Matrix 可以改為保留現有的相符命名/預設目標。

### 其他外掛通道

許多外掛通道被配置為 `channels.<id>` 並於其專屬的通道頁面中記錄（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
請參閱完整的通道索引：[Channels](/zh-Hant/channels)。

### 群組聊天提及限制

群組訊息預設為**需要提及**（中繼資料提及或安全 Regex 模式）。適用於 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群組聊天。

**提及類型：**

- **中繼資料提及**：原生平台 @-提及。在 WhatsApp 自我聊天模式中會被忽略。
- **文字模式**：`agents.list[].groupChat.mentionPatterns` 中的安全 Regex 模式。無效模式和不安全的巢狀重複會被忽略。
- 提及限制僅在可進行偵測時（原生提及或至少一個模式）才會強制執行。

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

`messages.groupChat.historyLimit` 設定全域預設值。通道可以使用 `channels.<channel>.historyLimit`（或每個帳號）覆寫。設定 `0` 以停用。

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

解析：每個 DM 覆寫 → 提供者預設 → 無限制（全部保留）。

支援：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自訊息模式

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

<Accordion title="Command details">

- 此區塊設定指令介面。若要查看目前的內建 + 捆綁指令目錄，請參閱 [Slash Commands](/zh-Hant/tools/slash-commands)。
- 此頁面是 **config-key 參考資料**，而非完整的指令目錄。通道/外掛擁有的指令，例如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、device-pair `/pair`、memory `/dreaming`、phone-control `/phone` 和 Talk `/voice`，會記錄在其對應的通道/外掛頁面以及 [Slash Commands](/zh-Hant/tools/slash-commands) 中。
- 文字指令必須是以 `/` 開頭的 **獨立** 訊息。
- `native: "auto"` 會開啟 Discord/Telegram 的原生指令，並保持 Slack 關閉。
- `nativeSkills: "auto"` 會開啟 Discord/Telegram 的原生技能指令，並保持 Slack 關閉。
- 逐通道覆寫：`channels.discord.commands.native`（布林值或 `"auto"`）。`false` 會清除先前註冊的指令。
- 使用 `channels.<provider>.commands.nativeSkills` 逐通道覆寫原生技能註冊。
- `channels.telegram.customCommands` 新增額外的 Telegram bot 選單項目。
- `bash: true` 啟用主機 shell 的 `! <cmd>`。需要 `tools.elevated.enabled` 且發送者位於 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 啟用 `/config`（讀取/寫入 `openclaw.json`）。對於 gateway `chat.send` 用戶端，持久 `/config set|unset` 寫入也需要 `operator.admin`；唯讀 `/config show` 對一般具有寫入權限的操作員用戶端仍然可用。
- `mcp: true` 啟用 `mcp.servers` 下 OpenClaw 管理的 MCP 伺服器設定的 `/mcp`。
- `plugins: true` 啟用外掛探索、安裝及啟用/停用控制的 `/plugins`。
- `channels.<provider>.configWrites` 閘道逐通道的設定變更（預設值：true）。
- 對於多帳號通道，`channels.<provider>.accounts.<id>.configWrites` 也會閘道針對該帳號的寫入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 停用 `/restart` 和 gateway 重啟工具動作。預設值：`true`。
- `ownerAllowFrom` 是僅限擁有者指令/工具的明確擁有者允許清單。它與 `allowFrom` 分開。
- `ownerDisplay: "hash"` 雜湊系統提示中的擁有者 ID。設定 `ownerDisplaySecret` 以控制雜湊。
- `allowFrom` 是依提供者而定。設定後，它是 **唯一** 的授權來源（通道允許清單/配對和 `useAccessGroups` 將被忽略）。
- `useAccessGroups: false` 允許指令在未設定 `allowFrom` 時繞過存取群組原則。
- 指令文件地圖：
  - built-in + bundled catalog：[Slash Commands](/zh-Hant/tools/slash-commands)
  - channel-specific command surfaces：[Channels](/zh-Hant/channels)
  - QQ Bot commands：[QQ Bot](/zh-Hant/channels/qqbot)
  - pairing commands：[Pairing](/zh-Hant/channels/pairing)
  - LINE card command：[LINE](/zh-Hant/channels/line)
  - memory dreaming：[Dreaming](/zh-Hant/concepts/dreaming)

</Accordion>

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 頂層金鑰
- [Configuration — agents](/zh-Hant/gateway/config-agents)
- [Channels overview](/zh-Hant/channels)
