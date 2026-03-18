---
title: "組態參考"
description: "~/.openclaw/openclaw. 的完整欄位參考"
summary: "每個 OpenClaw 組態金鑰、預設值和通道設定的完整參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

# 組態參考

`~/.openclaw/openclaw.json` 中可用的每個欄位。如需任務導向的概覽，請參閱[組態](/zh-Hant/gateway/configuration)。

組態格式為 **JSON5**（允許註解與結尾逗號）。所有欄位皆為選用 — 若省略，OpenClaw 將使用安全的預設值。

---

## 通道

當組態區段存在時，每個通道會自動啟動（除非 `enabled: false`）。

### DM 與群組存取

所有通道都支援 DM 政策與群組政策：

| DM 政策           | 行為                                              |
| ----------------- | ------------------------------------------------- |
| `pairing`（預設） | 未知發送者將收到一次性配對代碼；擁有者必須核可    |
| `allowlist`       | 僅限 `allowFrom` 中（或已配對的允許儲存）的發送者 |
| `open`            | 允許所有傳入 DM（需要 `allowFrom: ["*"]`）        |
| `disabled`        | 忽略所有傳入 DM                                   |

| 群組政策            | 行為                               |
| ------------------- | ---------------------------------- |
| `allowlist`（預設） | 僅限符合已設定允許清單的群組       |
| `open`              | 略過群組允許清單（提及閘門仍適用） |
| `disabled`          | 封鎖所有群組/房間訊息              |

<Note>
`channels.defaults.groupPolicy` 當提供者的 `groupPolicy` 未設定時，會設定預設值。
配對代碼在 1 小時後過期。待處理的 DM 配對請求上限為每個通道 **3 個**。
如果提供者區段完全遺失（`channels.<provider>` 不存在），執行時期群組政策將回退至 `allowlist`（失敗關閉），並在啟動時顯示警告。
</Note>

### 通道模型覆寫

使用 `channels.modelByChannel` 將特定通道 ID 固定至模型。數值接受 `provider/model` 或已設定的模型別名。當工作階段尚未擁有模型覆寫時（例如透過 `/model` 設定），會套用通道對應。

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

### 通道預設值與心跳

使用 `channels.defaults` 來設定跨提供者的共用群組原則與心跳行為：

```json5
{
  channels: {
    defaults: {
      groupPolicy: "allowlist", // open | allowlist | disabled
      heartbeat: {
        showOk: false,
        showAlerts: true,
        useIndicator: true,
      },
    },
  },
}
```

- `channels.defaults.groupPolicy`：當未設定提供者層級的 `groupPolicy` 時，使用的後備群組原則。
- `channels.defaults.heartbeat.showOk`：在心跳輸出中包含健康的通道狀態。
- `channels.defaults.heartbeat.showAlerts`：在心跳輸出中包含降級/錯誤狀態。
- `channels.defaults.heartbeat.useIndicator`：呈現緊湊的指示器樣式心跳輸出。

### WhatsApp

WhatsApp 透過閘道的 web 通道 (Baileys Web) 執行。當存在連結的會話時，它會自動啟動。

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

- 如果帳號 `default` 存在，則輸出指令預設使用該帳號；否則使用第一個設定的帳號 ID（已排序）。
- 可選的 `channels.whatsapp.defaultAccount` 當符合已設定的帳號 ID 時，會覆寫該後備預設帳號的選擇。
- 舊版單一帳號 Baileys 認證目錄會由 `openclaw doctor` 遷移至 `whatsapp/default`。
- 各帳號覆寫項目：`channels.whatsapp.accounts.<id>.sendReadReceipts`、`channels.whatsapp.accounts.<id>.dmPolicy`、`channels.whatsapp.accounts.<id>.allowFrom`。

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
      replyToMode: "first", // off | first | all
      linkPreview: true,
      streaming: "partial", // off | partial | block | progress (default: off)
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

- Bot 權杖：`channels.telegram.botToken` 或 `channels.telegram.tokenFile`（僅限一般檔案；拒絕符號連結），其中 `TELEGRAM_BOT_TOKEN` 作為預設帳號的後援。
- 可選的 `channels.telegram.defaultAccount` 當符合已設定的帳號 ID 時，會覆寫預設帳號的選擇。
- 在多帳號設定中（2 個以上帳號 ID），請設定明確的預設值（`channels.telegram.defaultAccount` 或 `channels.telegram.accounts.default`）以避免後援路由；若缺少此設定或無效，`openclaw doctor` 會發出警告。
- `configWrites: false` 會封鎖由 Telegram 發起的設定寫入（超級群組 ID 遷移、`/config set|unset`）。
- 具有 `type: "acp"` 的頂層 `bindings[]` 條目會為論壇主題設定持久的 ACP 繫結（在 `match.peer.id` 中使用規範的 `chatId:topic:topicId`）。字段語義共用於 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。
- Telegram 串流預覽使用 `sendMessage` + `editMessageText`（適用於直接和群組聊天）。
- 重試政策：請參閱 [Retry policy](/zh-Hant/concepts/retry)。

### Discord

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "your-bot-token",
      mediaMaxMb: 8,
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
      replyToMode: "off", // off | first | all
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
- 提供明確 Discord `token` 的直接 outbound 呼叫會使用該 token 進行呼叫；帳戶重試/政策設定仍來自於有效運行時快照中選取的帳戶。
- 可選的 `channels.discord.defaultAccount` 當符合設定的帳戶 id 時，會覆寫預設帳戶選擇。
- 使用 `user:<id>`（DM）或 `channel:<id>`（公會頻道）作為傳遞目標；純數字 ID 會被拒絕。
- 公會 slug 為小寫，並將空格替換為 `-`；頻道金鑰使用 slug 名稱（無 `#`）。建議優先使用公會 ID。
- 預設會忽略 Bot 發送的訊息。`allowBots: true` 可啟用此功能；使用 `allowBots: "mentions"` 僅接受提及該 bot 的 bot 訊息（自己的訊息仍會被過濾）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（以及頻道覆寫）會捨棄提及其他使用者或角色但未提及該 bot 的訊息（不包括 @everyone/@here）。
- `maxLinesPerMessage`（預設 17）會分割長訊息，即使字數低於 2000 也一樣。
- `channels.discord.threadBindings` 控制 Discord 執行緒繫結路由：
  - `enabled`：執行緒繫結會話功能的 Discord 覆寫（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及繫結傳遞/路由）
  - `idleHours`：Discord 的非活動自動取消焦點的小時數覆寫（`0` 則停用）
  - `maxAgeHours`：Discord 的絕對最大存在時間的小時數覆寫（`0` 則停用）
  - `spawnSubagentSessions`：`sessions_spawn({ thread: true })` 自動建立/綁定執行緒的啟用開關
- 頂層 `bindings[]` 項目若含有 `type: "acp"`，則可為頻道與執行緒設定持久的 ACP 綁定（在 `match.peer.id` 中使用頻道/執行緒 ID）。欄位語義詳見 [ACP Agents](/zh-Hant/tools/acp-agents#channel-specific-settings)。
- `channels.discord.ui.components.accentColor` 用於設定 Discord 元件 v2 容器的強調色。
- `channels.discord.voice` 可啟用 Discord 語音頻道對話，以及選用的自動加入與 TTS 覆寫。
- `channels.discord.voice.daveEncryption` 與 `channels.discord.voice.decryptionFailureTolerance` 會傳遞至 `@discordjs/voice` 的 DAVE 選項（預設為 `true` 與 `24`）。
- 若發生重複解密失敗，OpenClaw 還會嘗試透過離開並重新加入語音工作階段來進行語音接收修復。
- `channels.discord.streaming` 為標準的串流模式金鑰。舊版的 `streamMode` 與布林值 `streaming` 會自動遷移。
- `channels.discord.autoPresence` 將執行時可用性對應至機器人狀態（健康 => 上線，降級 => 閒置，耗盡 => 請勿打擾），並允許選用的狀態文字覆寫。
- `channels.discord.dangerouslyAllowNameMatching` 可重新啟用可變名稱/標籤比對（破玻璃相容模式）。

**反應通知模式：**`off`（無）、`own`（僅機器人的訊息，預設）、`all`（所有訊息）、`allowlist`（在所有訊息上僅來自 `guilds.<id>.users`）。

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

- 服務帳戶 JSON：內嵌（`serviceAccount`）或檔案式（`serviceAccountFile`）。
- 亦支援服務帳戶 SecretRef（`serviceAccountRef`）。
- 環境變數備援：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作為傳遞目標。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新啟用可變電子郵件主體匹配（緊急相容模式）。

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
      replyToMode: "off", // off | first | all
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
      streaming: "partial", // off | partial | block | progress (preview mode)
      nativeStreaming: true, // use Slack native streaming API when streaming=partial
      mediaMaxMb: 20,
    },
  },
}
```

- **Socket 模式**需要同時具備 `botToken` 和 `appToken`（預設帳號環境變數備援為 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`）。
- **HTTP 模式**需要 `botToken` 加上 `signingSecret`（於根層級或每個帳號）。
- `configWrites: false` 封鎖 Slack 發起的配置寫入。
- 當符合已設定的帳號 ID 時，可選的 `channels.slack.defaultAccount` 會覆蓋預設帳號選擇。
- `channels.slack.streaming` 是標準的串流模式金鑰。舊版 `streamMode` 和布林值 `streaming` 會自動遷移。
- 使用 `user:<id>` (DM) 或 `channel:<id>` 作為傳遞目標。

**反應通知模式：** `off`、`own` (預設)、`all`、`allowlist` (來自 `reactionAllowlist`)。

**串執行緒會話隔離：** `thread.historyScope` 為每個串執行緒 (預設) 或跨頻道共享。`thread.inheritParent` 會將父頻道記錄複製到新串執行緒。

- `typingReaction` 會在回覆執行時，對傳入的 Slack 訊息新增暫時性的反應，然後在完成時移除它。使用 Slack emoji shortcode，例如 `"hourglass_flowing_sand"`。

| 動作群組   | 預設    | 備註                   |
| ---------- | ------- | ---------------------- |
| reactions  | enabled | React + list reactions |
| messages   | enabled | Read/send/edit/delete  |
| pins       | enabled | Pin/unpin/list         |
| memberInfo | enabled | Member info            |
| emojiList  | enabled | Custom emoji list      |

### Mattermost

Mattermost 以外掛形式提供：`openclaw plugins install @openclaw/mattermost`。

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

聊天模式：`oncall`（回應 @提及，預設）、`onmessage`（每則訊息）、`onchar`（以觸發前綴開頭的訊息）。

當啟用 Mattermost 原生命令時：

- `commands.callbackPath` 必須是路徑（例如 `/api/channels/mattermost/command`），而不是完整的 URL。
- `commands.callbackUrl` 必須解析為 OpenClaw 閘道端點，並且可從 Mattermost 伺服器存取。
- 對於私人/tailnet/內部回調主機，Mattermost 可能需要
  `ServiceSettings.AllowedUntrustedInternalConnections` 來包含回調主機/網域。
  請使用主機/網域值，而非完整的 URL。
- `channels.mattermost.configWrites`：允許或拒絕由 Mattermost 發起的設定寫入。
- `channels.mattermost.requireMention`：在頻道中回覆前要求 `@mention`。
- 選用的 `channels.mattermost.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設帳戶選擇。

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

- `channels.signal.account`：將頻道啟動固定到特定的 Signal 帳戶身分。
- `channels.signal.configWrites`：允許或拒絕由 Signal 發起的設定寫入。
- 選用的 `channels.signal.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設帳戶選擇。

### BlueBubbles

BlueBubbles 是推薦的 iMessage 路徑（由外掛程式支援，設定於 `channels.bluebubbles` 之下）。

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
- 選用的 `channels.bluebubbles.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設帳戶選擇。
- 完整的 BlueBubbles 頻道設定記載於 [BlueBubbles](/zh-Hant/channels/bluebubbles)。

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

- 選用的 `channels.imessage.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設帳戶選擇。

- 需要對訊息資料庫進行完全磁碟存取。
- 偏好 `chat_id:<id>` 目標。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包裝器；設定 `remoteHost` (`host` 或 `user@host`) 以進行 SCP 附件擷取。
- `attachmentRoots` 和 `remoteAttachmentRoots` 限制傳入附件路徑（預設值：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用嚴格的主機金鑰檢查，因此請確保轉送主機金鑰已存在於 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允許或拒絕由 iMessage 發起的寫入設定。

<Accordion title="iMessage SSH 包裝器範例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

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
- 完整的 Teams 設定（憑證、Webhook、DM/群組原則、每團隊/每頻道覆寫）記載於 [Microsoft Teams](/zh-Hant/channels/msteams) 中。

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
- 可選的 `channels.irc.defaultAccount` 會在符合已設定的帳戶 ID 時覆寫預設帳戶選取。
- 完整的 IRC 頻道設定（主機/連接埠/TLS/頻道/允許清單/提及閘道）記載於 [IRC](/zh-Hant/channels/irc) 中。

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

- 當省略 `accountId` 時，會使用 `default` (CLI + 路由)。
- 環境變數符記僅適用於**預設**帳戶。
- 基礎頻道設定適用於所有帳戶，除非按帳戶覆寫。
- 使用 `bindings[].match.accountId` 將每個帳戶路由到不同的代理程式。
- 如果您在仍處於單一帳戶頂層通道配置時，透過 `openclaw channels add`（或通道上線）新增非預設帳戶，OpenClaw 會先將帳戶範圍的頂層單一帳戶值移至 `channels.<channel>.accounts.default`，以便原始帳戶繼續運作。
- 現有的僅通道綁定（無 `accountId`）會繼續符合預設帳戶；帳戶範圍的綁定則保持為選用。
- `openclaw doctor --fix` 也會修復混合形狀，方法是在存在命名帳戶但缺少 `default` 時，將帳戶範圍的頂層單一帳戶值移至 `accounts.default`。

### 其他擴充通道

許多擴充通道被配置為 `channels.<id>`，並在其專屬通道頁面中記錄（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
請參閱完整的通道索引：[Channels](/zh-Hant/channels)。

### 群組聊天提及閘道

群組訊息預設為 **需要提及**（中繼資料提及或安全的正規表示式模式）。適用於 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群組聊天。

**提及類型：**

- **中繼資料提及**：原生平台 @-mentions。在 WhatsApp 自我聊天模式中會被忽略。
- **文字模式**：`agents.list[].groupChat.mentionPatterns` 中的安全正規表示式模式。無效的模式和不安全的巢狀重複會被忽略。
- 僅在可以進行偵測時（原生提及或至少一個模式）才會強制執行提及閘道。

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

解析優先順序：每個 DM 覆寫 → 提供者預設值 → 無限制（全部保留）。

支援的通道：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自我聊天模式

在 `allowFrom` 中包含您自己的號碼以啟用自我聊天模式（忽略原生 @-mentions，僅回應文字模式）：

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
    text: true, // parse /commands in chat messages
    bash: false, // allow ! (alias: /bash)
    bashForegroundMs: 2000,
    config: false, // allow /config
    debug: false, // allow /debug
    restart: false, // allow /restart + gateway restart tool
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

<Accordion title="指令詳細資訊">

- 文字指令必須是帶有前綴 `/` 的**獨立**訊息。
- `native: "auto"` 會為 Discord/Telegram 開啟原生指令，並讓 Slack 保持關閉。
- 依通道覆寫：`channels.discord.commands.native`（布林值或 `"auto"`）。`false` 會清除先前註冊的指令。
- `channels.telegram.customCommands` 新增額外的 Telegram 機器人選單項目。
- `bash: true` 針對主機 Shell 啟用 `! <cmd>`。需要 `tools.elevated.enabled` 且發送者位於 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 啟用 `/config`（讀取/寫入 `openclaw.json`）。對於 Gateway `chat.send` 用戶端，持久性 `/config set|unset` 寫入也需要 `operator.admin`；唯讀 `/config show` 對一般具寫入權限的操作員用戶端保持可用。
- `channels.<provider>.configWrites` 限制各通道的設定變更（預設：true）。
- 對於多重帳號通道，`channels.<provider>.accounts.<id>.configWrites` 也會限制目標為該帳號的寫入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `allowFrom` 是依供應商而定。設定後，它將是**唯一**的授權來源（通道允許清單/配對和 `useAccessGroups` 將被忽略）。
- 當未設定 `allowFrom` 時，`useAccessGroups: false` 允許指令繞過存取群組原則。

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

顯示於系統提示詞 Runtime 行中的選用儲存庫根目錄。若未設定，OpenClaw 會透過從工作區向上遍歷自動偵測。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skipBootstrap`

停用工作區引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自動建立。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.bootstrapMaxChars`

每個工作區引導檔案在被截斷前的最大字元數。預設值：`20000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 20000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

所有工作區引導檔案中注入的最大總字元數。預設值：`150000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 150000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

控制當引導內容被截斷時，對代理程式可見的警告文字。
預設值：`"once"`。

- `"off"`：切勿將警告文字注入系統提示詞。
- `"once"`：針對每個唯一的截斷簽章注入一次警告（建議）。
- `"always"`：當存在截斷時，在每次執行時都注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### `agents.defaults.imageMaxDimensionPx`

在呼叫提供者之前，對話/工具圖像區塊中圖片最長邊的最大像素尺寸。
預設值：`1200`。

較低的值通常會減少視覺權杖的使用量，並降低包含大量螢幕截圖執行的請求負載大小。
較高的值則會保留更多視覺細節。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系統提示詞內容的時區（非訊息時間戳記）。若未設定則回退至主機時區。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系統提示詞中的時間格式。預設值：`auto`（作業系統偏好設定）。

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
        "minimax/MiniMax-M2.5": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.5"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5-mini"],
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

- `model`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 字串格式僅設定主要模型。
  - 物件格式會設定主要模型以及有序的故障轉移模型。
- `imageModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由 `image` 工具路徑作為其視覺模型設定使用。
  - 當所選/預設模型無法接受圖片輸入時，也會作為故障轉移路由使用。
- `pdfModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由 `pdf` 工具用於模型路由。
  - 如果省略，PDF 工具會回退到 `imageModel`，然後再回退到盡力而為的提供者預設值。
- `pdfMaxBytesMb`：當呼叫時未傳遞 `maxBytesMb` 時，`pdf` 工具的預設 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中擷取回退模式考慮的預設最大頁數。
- `model.primary`：格式 `provider/model`（例如 `anthropic/claude-opus-4-6`）。如果省略提供者，OpenClaw 假設為 `anthropic`（已棄用）。
- `models`：為 `/model` 配置的模型目錄和允許清單。每個條目可以包含 `alias`（捷徑）和 `params`（特定於提供者，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`）。
- `params` 合併優先順序（配置）：`agents.defaults.models["provider/model"].params` 是基礎，然後 `agents.list[].params`（匹配的 agent id）按鍵覆蓋。
- 修改這些欄位的配置編寫器（例如 `/models set`、`/models set-image` 和回退新增/移除指令）會儲存正規物件形式，並在可能時保留現有的回退清單。
- `maxConcurrent`：跨會話的最大並行 agent 執行數（每個會話仍為序列化）。預設值：1。

**內建別名捷徑**（僅當模型在 `agents.defaults.models` 中時適用）：

| 別名                | 模型                                   |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.4`                       |
| `gpt-mini`          | `openai/gpt-5-mini`                    |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

您設定的別名始終優先於預設值。

除非您設定 `--thinking off` 或自行定義 `agents.defaults.models["zai/<model>"].params.thinking`，否則 Z.AI GLM-4.x 模型會自動啟用思考模式。
Z.AI 模型預設會針對工具呼叫串流啟用 `tool_stream`。請將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設定為 `false` 以停用它。
當未設定明確的思考等級時，Anthropic Claude 4.6 模型預設為 `adaptive` 思考。

### `agents.defaults.cliBackends`

用於純文字後援執行（無工具呼叫）的選用 CLI 後端。當 API 提供商失敗時，可作為備份使用。

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
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

- CLI 後端以文字優先；工具一律會停用。
- 當設定 `sessionArg` 時支援 Sessions。
- 當 `imageArg` 接受檔案路徑時，支援圖像直通。

### `agents.defaults.heartbeat`

定期心跳執行。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.2-mini",
        includeReasoning: false,
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
      },
    },
  },
}
```

- `every`：持續時間字串 (ms/s/m/h)。預設值：`30m`。
- `suppressToolErrorWarnings`：當為 true 時，在心跳執行期間隱藏工具錯誤警示 payload。
- `directPolicy`：直接/DM 傳遞原則。`allow` (預設) 允許直接目標傳遞。`block` 隱藏直接目標傳遞並發出 `reason=dm-blocked`。
- `lightContext`：當為 true 時，心跳執行會使用輕量級啟動上下文，並且僅保留工作區啟動檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：當為 true 時，每次心跳都在沒有先前對話記錄的新 session 中執行。隔離模式與 cron `sessionTarget: "isolated"` 相同。將每次心跳的 token 成本從 ~100K 降低到 ~2-5K tokens。
- 每個 Agent：設定 `agents.list[].heartbeat`。當任何 agent 定義了 `heartbeat` 時，**只有那些 agents** 會執行心跳。
- 心跳會執行完整的 agent 回合 — 間隔越短會消耗越多的 tokens。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // used when identifierPolicy=custom
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
        model: "openrouter/anthropic/claude-sonnet-4-5", // optional compaction-only model override
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode`：`default` 或 `safeguard`（針對長歷史的區塊摘要）。參閱 [Compaction](/zh-Hant/concepts/compaction)。
- `timeoutSeconds`：在 OpenClaw 中止單次壓縮操作之前允許的最大秒數。預設值：`900`。
- `identifierPolicy`：`strict`（預設）、`off` 或 `custom`。`strict` 會在壓縮摘要期間前置內建的透明識別碼保留指引。
- `identifierInstructions`：當 `identifierPolicy=custom` 時使用的選用自訂識別碼保留文字。
- `postCompactionSections`：壓縮後要重新注入的選用 AGENTS.md H2/H3 區段名稱。預設為 `["Session Startup", "Red Lines"]`；設定 `[]` 以停用重新注入。當未設定或明確設定為該預設值時，舊版的 `Every Session`/`Safety` 標題也會被接受作為舊版回退機制。
- `model`：僅用於壓縮摘要的選用 `provider/model-id` 覆蓋值。當主工作階段應保留一個模型但壓縮摘要應在另一個模型上執行時，請使用此選項；若未設定，壓縮會使用工作階段的主要模型。
- `memoryFlush`：自動壓縮前的靜默代理轉場，用於儲存持久記憶。當工作區為唯讀時會跳過。

### `agents.defaults.contextPruning`

在發送至 LLM 之前，從記憶體內容中修剪**舊的工具結果\*\***不\*\*會修改磁碟上的工作階段歷史。

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

- `mode: "cache-ttl"` 啟用修剪傳遞。
- `ttl` 控制修剪可以多久再次執行（在最後一次快取接觸之後）。
- 修剪會先軟修剪超大的工具結果，然後在需要時硬清除較舊的工具結果。

**軟修剪** 保留開頭 + 結尾，並在中間插入 `...`。

**硬清除** 將整個工具結果替換為佔位符。

備註：

- 影像區塊絕不會被修剪/清除。
- 比例是基於字元（大約），而不是確切的 token 數量。
- 如果存在的助理訊息少於 `keepLastAssistants` 則會跳過修剪。

</Accordion>

有關行為的詳細資訊，請參閱 [Session Pruning](/zh-Hant/concepts/session-pruning)。

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
- 頻道覆寫：`channels.<channel>.blockStreamingCoalesce`（以及每個帳戶的變體）。Signal/Slack/Discord/Google Chat 預設 `minChars: 1500`。
- `humanDelay`：區塊回覆之間的隨機暫停。`natural` = 800–2500ms。每個代理的覆寫：`agents.list[].humanDelay`。

有關行為 + 分塊的詳細資訊，請參閱 [Streaming](/zh-Hant/concepts/streaming)。

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
- 每個階段的覆寫：`session.typingMode`、`session.typingIntervalSeconds`。

請參閱 [Typing Indicators](/zh-Hant/concepts/typing-indicators)。

### `agents.defaults.sandbox`

內嵌代理的可選沙盒機制。有關完整指南，請參閱 [Sandboxing](/zh-Hant/gateway/sandboxing)。

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
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "apply_patch",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="Sandbox 詳情">

**後端：**

- `docker`：本機 Docker 執行環境（預設）
- `ssh`：通用 SSH 支援的遠端執行環境
- `openshell`：OpenShell 執行環境

當選取 `backend: "openshell"` 時，特定於執行環境的設定會移至
`plugins.entries.openshell.config`。

**SSH 後端設定：**

- `target`：`user@host[:port]` 格式的 SSH 目標
- `command`：SSH 客戶端指令（預設：`ssh`）
- `workspaceRoot`：用於各範圍工作區的絕對遠端根目錄
- `identityFile` / `certificateFile` / `knownHostsFile`：傳遞給 OpenSSH 的現有本機檔案
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在執行時具象化為暫存檔案的內聯內容或 SecretRefs
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主機金鑰策略控制項

**SSH 認證優先順序：**

- `identityData` 優於 `identityFile`
- `certificateData` 優於 `certificateFile`
- `knownHostsData` 優於 `knownHostsFile`
- SecretRef 支援的 `*Data` 值會在沙箱工作階段開始之前，從使用中的 secrets 執行環境快照中解析

**SSH 後端行為：**

- 在建立或重建之後，將遠端工作區植種一次
- 然後保持遠端 SSH 工作區為權威
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

- `mirror`：在執行前從本機植種遠端，在執行後同步回來；本機工作區保持權威
- `remote`：在建立沙箱時植種遠端一次，然後保持遠端工作區為權威

在 `remote` 模式下，在 OpenClaw 之外進行的本機主機編輯不會在植種步驟後自動同步到沙箱中。
傳輸方式是 SSH 進入 OpenShell 沙箱，但外掛程式擁有沙箱生命週期和可選的鏡像同步。

**`setupCommand`** 在容器建立後執行一次（透過 `sh -lc`）。需要網路出口、可寫入根目錄、root 使用者。

**容器預設為 `network: "none"`** — 如果代理程式需要出口存取權，請設定為 `"bridge"`（或自訂橋接網路）。
`"host"` 已被封鎖。`"container:<id>"` 預設已被封鎖，除非您明確設定
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（緊急開關）。

**傳入附件** 會暫存到使用中工作區的 `media/inbound/*` 中。

**`docker.binds`** 掛載額外的主機目錄；全域和各代理程式的繫結會合併。

**沙箱化瀏覽器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 注入到系統提示中。不需要 `browser.enabled` 於 `openclaw.json` 中。
noVNC 觀察者存取權預設使用 VNC 認證，OpenClaw 會發出短期有效的權杖 URL（而不是在共享 URL 中公開密碼）。

- `allowHostControl: false`（預設）會封鎖沙箱化工作階段以主機瀏覽器為目標。
- `network` 預設為 `openclaw-sandbox-browser`（專用橋接網路）。僅當您明確需要全域橋接連線時，才設定為 `bridge`。
- `cdpSourceRange` 可選地在容器邊緣將 CDP 入站限制為 CIDR 範圍（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 僅將額外的主機目錄掛載到沙箱瀏覽器容器中。當設定時（包括 `[]`），它會取代瀏覽器容器的 `docker.binds`。
- 啟動預設值定義在 `scripts/sandbox-browser-entrypoint.sh` 中，並針對容器主機進行了微調：
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
    為啟用狀態，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 停用。
  - 如果您的工作流程依賴擴充功能，`OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 會重新啟用它們。
  - `--renderer-process-limit=2` 可以使用
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 進行變更；設定 `0` 以使用 Chromium 的
    預設程序限制。
  - 當啟用 `noSandbox` 時，再加上 `--no-sandbox` 和 `--disable-setuid-sandbox`。
  - 預設值是容器映像檔基準；使用具有自訂進入點的自訂瀏覽器映像檔來變更容器預設值。

</Accordion>

瀏覽器沙盒與 `sandbox.docker.binds` 目前僅支援 Docker。

建置映像檔：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list` (個別代理程式覆寫)

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
        params: { cacheRetention: "none" }, // overrides matching defaults.models params by key
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
- `default`：當設置多個時，第一個優先 (會記錄警告)。若皆未設置，列表第一項為預設值。
- `model`：字串形式僅覆寫 `primary`；物件形式 `{ primary, fallbacks }` 則同時覆寫兩者 (`[]` 會停用全域備援)。僅覆寫 `primary` 的 cron 排程工作仍會繼承預設備援，除非您設置了 `fallbacks: []`。
- `params`：與 `agents.defaults.models` 中選定模型項目合併的個別代理程式串流參數。請使用此設定進行代理程式特定的覆寫 (例如 `cacheRetention`、`temperature` 或 `maxTokens`)，無需重複整個模型目錄。
- `runtime`：選用的個別代理程式執行時期描述符。當代理程式應預設使用 ACP harness 會話時，請使用 `type: "acp"` 搭配 `runtime.acp` 預設值 (`agent`、`backend`、`mode`、`cwd`)。
- `identity.avatar`：相對於工作區的路徑、`http(s)` URL 或 `data:` URI。
- `identity` 推導預設值：`ackReaction` 來自 `emoji`，`mentionPatterns` 來自 `name`/`emoji`。
- `subagents.allowAgents`：用於 `sessions_spawn` 的代理程式 ID 允許清單 (`["*"]` = 任意；預設值：僅限相同代理程式)。
- 沙盒繼承防護：若要求者會話處於沙盒中，`sessions_spawn` 將拒絕以非沙盒模式執行的目標。

---

## 多代理程式路由

在一個 Gateway 中執行多個獨立的代理程式。請參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent)。

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

- `type`（選用）：正常路由使用 `route`（缺少 type 時預設為 route），持續性 ACP 對話綁定使用 `acp`。
- `match.channel`（必填）
- `match.accountId`（選用；`*` = 任何帳戶；省略 = 預設帳戶）
- `match.peer`（選用；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（選用；特定頻道）
- `acp`（選用；僅限 `type: "acp"`）：`{ mode, label, cwd, backend }`

**確定性匹配順序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精確，無 peer/guild/team）
5. `match.accountId: "*"`（全頻道）
6. 預設代理程式

在每個層級中，第一個匹配的 `bindings` 項目獲勝。

對於 `type: "acp"` 項目，OpenClaw 根據精確的對話身分（`match.channel` + account + `match.peer.id`）進行解析，且不使用上述路由綁定層級順序。

### 各代理程式的存取設定檔

<Accordion title="完整存取（無沙箱）">

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
          allow: [
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="無檔案系統存取（僅傳訊）">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "whatsapp",
            "telegram",
            "slack",
            "discord",
            "gateway",
          ],
          deny: [
            "read",
            "write",
            "edit",
            "apply_patch",
            "exec",
            "process",
            "browser",
            "canvas",
            "nodes",
            "cron",
            "gateway",
            "image",
          ],
        },
      },
    ],
  },
}
```

</Accordion>

關於優先順序的詳細資訊，請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools)。

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

<Accordion title="Session field details">

- **`dmScope`**: 如何分組私訊。
  - `main`: 所有私訊共享主會話。
  - `per-peer`: 跨頻道依發送者 ID 隔離。
  - `per-channel-peer`: 依頻道 + 發送者隔離（建議用於多用戶收件匣）。
  - `per-account-channel-peer`: 依帳號 + 頻道 + 發送者隔離（建議用於多帳號）。
- **`identityLinks`**: 將 canonical ID 對應到提供者前綴的 peer，以實現跨頻道會話共享。
- **`reset`**: 主要重設策略。`daily` 在 `atHour` 當地時間重設；`idle` 在 `idleMinutes` 後重設。若同時配置，以先過期者為準。
- **`resetByType`**: 各類型覆寫（`direct`、`group`、`thread`）。舊版 `dm` 可作為 `direct` 的別名使用。
- **`parentForkMaxTokens`**: 建立分叉執行緒會話時允許的最大父會話 `totalTokens`（預設 `100000`）。
  - 如果父 `totalTokens` 超過此值，OpenClaw 將啟動新的執行緒會話，而不是繼承父級對話紀錄。
  - 設定 `0` 可停用此防護並一律允許父級分叉。
- **`mainKey`**: 舊版欄位。執行時現在總是對主要直接聊天儲存區使用 `"main"`。
- **`sendPolicy`**: 依 `channel`、`chatType`（`direct|group|channel`，含舊版 `dm` 別名）、`keyPrefix` 或 `rawKeyPrefix` 進行比對。優先套用拒絕規則。
- **`maintenance`**: 會話儲存區清理與保留控制。
  - `mode`: `warn` 僅發出警告；`enforce` 執行清理。
  - `pruneAfter`: 逾期項目的年限上限（預設 `30d`）。
  - `maxEntries`: `sessions.json` 中的項目數量上限（預設 `500`）。
  - `rotateBytes`: 當 `sessions.json` 超過此大小時進行輪替（預設 `10mb`）。
  - `resetArchiveRetention`: `*.reset.<timestamp>` 對話紀錄封存的保留時間。預設為 `pruneAfter`；設定 `false` 可停用。
  - `maxDiskBytes`: 選用的會話目錄磁碟預算。在 `warn` 模式下會記錄警告；在 `enforce` 模式下會先移除最舊的成品/會話。
  - `highWaterBytes`: 預算清理後的選用目標。預設為 `80%` 的 `maxDiskBytes`。
- **`threadBindings`**: 執行緒綁定會話功能的全域預設值。
  - `enabled`: 主預設開關（提供者可覆寫；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`: 預設非活動自動取消聚焦的小時數（`0` 停用；提供者可覆寫）
  - `maxAgeHours`: 預設強制最大存活時間的小時數（`0` 停用；提供者可覆寫）

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

各通道/帳號覆寫：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析順序（最優先者勝）：帳號 → 通道 → 全域。`""` 會停用並停止層疊。`"auto"` 推導 `[{identity.name}]`。

**樣板變數：**

| 變數              | 說明             | 範例                        |
| ----------------- | ---------------- | --------------------------- |
| `{model}`         | 簡短模型名稱     | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型識別碼   | `anthropic/claude-opus-4-6` |
| `{provider}`      | 供應商名稱       | `anthropic`                 |
| `{thinkingLevel}` | 當前思考層級     | `high`、`low`、`off`        |
| `{identity.name}` | 代理程式身分名稱 | （同 `"auto"`）             |

變數不區分大小寫。`{think}` 是 `{thinkingLevel}` 的別名。

### Ack 回應

- 預設為使用中代理程式的 `identity.emoji`，否則為 `"👀"`。設定 `""` 以停用。
- 各通道覆寫：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析順序：帳號 → 通道 → `messages.ackReaction` → 身分後備。
- 範圍：`group-mentions`（預設）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在回覆後移除 ack（僅限 Slack/Discord/Telegram/Google Chat）。

### 輸入防抖

將同一傳送者快速發送的純文字訊息批次處理為單一代理程式輪次。媒體/附件會立即排程發送。控制指令會略過防抖。

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

- `auto` 控制自動 TTS。`/tts off|always|inbound|tagged` 依工作階段覆寫。
- `summaryModel` 覆寫自動摘要的 `agents.defaults.model.primary`。
- `modelOverrides` 預設為啟用；`modelOverrides.allowProvider` 預設為 `false`（選擇加入）。
- API 金鑰會回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- `openai.baseUrl` 會覆寫 OpenAI TTS 端點。解析順序為：設定、然後是 `OPENAI_TTS_BASE_URL`、然後是 `https://api.openai.com/v1`。
- 當 `openai.baseUrl` 指向非 OpenAI 端點時，OpenClaw 會將其視為 OpenAI 相容的 TTS 伺服器，並放寬模型/語音驗證。

---

## Talk

Talk 模式的預設值。

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    voiceAliases: {
      Clawd: "EXAVITQu4vr4xnSDxMaL",
      Roger: "CwhRBWXzGAHq8TQ4Fs17",
    },
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- 語音 ID 會回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `apiKey` 和 `providers.*.apiKey` 接受純文字字串或 SecretRef 物件。
- `ELEVENLABS_API_KEY` 回退僅在未設定 Talk API 金鑰時套用。
- `voiceAliases` 允許 Talk 指令使用易記名稱。
- `silenceTimeoutMs` 控制在使用者停止說話後，Talk 模式在發送逐字稿前等待的時間。未設定時將保留平台預設的暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)。

---

## 工具

### 工具設定檔

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定一個基礎允許清單：

本機上架在未設定時會將新的本機設定預設為 `tools.profile: "coding"` (既有的明確設定檔會被保留)。

| 設定檔      | 包含                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------- |
| `minimal`   | 僅限 `session_status`                                                                     |
| `coding`    | `group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`                    |
| `messaging` | `group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status` |
| `full`      | 無限制 (與未設定相同)                                                                     |

### 工具群組

| 群組               | 工具                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`、`process` (`bash` 被接受為 `exec` 的別名)                                        |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                   |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                            |
| `group:web`        | `web_search`, `web_fetch`                                                                |
| `group:ui`         | `browser`, `canvas`                                                                      |
| `group:automation` | `cron`, `gateway`                                                                        |
| `group:messaging`  | `message`                                                                                |
| `group:nodes`      | `nodes`                                                                                  |
| `group:openclaw`   | 所有內建工具（不包括供應商插件）                                                         |

### `tools.allow` / `tools.deny`

全域工具允許/拒絕策略（拒絕優先）。不區分大小寫，支援 `*` 萬用字元。即使關閉 Docker 沙盒也會套用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

### `tools.byProvider`

進一步針對特定供應商或模型限制工具。順序：基本設定檔 → 供應商設定檔 → 允許/拒絕。

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.elevated`

控制提升（主機）執行存取權限：

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

- 個別代理覆寫（`agents.list[].tools.elevated`）只能進一步限制。
- `/elevated on|off|ask|full` 依階段儲存狀態；內嵌指令則適用於單一訊息。
- 提升的 `exec` 在主機上執行，會繞過沙盒機制。

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
        allowModels: ["gpt-5.2"],
      },
    },
  },
}
```

### `tools.loopDetection`

工具迴圈安全檢查**預設為停用**。設定 `enabled: true` 以啟動偵測。
設定可在 `tools.loopDetection` 中全域定義，並在 `agents.list[].tools.loopDetection` 中針對個別代理進行覆寫。

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
- `warningThreshold`：重複無進度模式的警告閾值。
- `criticalThreshold`：更高的重複閾值，用於阻擋關鍵循環。
- `globalCircuitBreakerThreshold`：任何無進度運行的硬性停止閾值。
- `detectors.genericRepeat`：對重複相同工具/相同參數的調用發出警告。
- `detectors.knownPollNoProgress`：對已知輪詢工具（`process.poll`、`command_status` 等）發出警告/阻擋。
- `detectors.pingPong`：對交替無進度配對模式發出警告/阻擋。
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
        maxChars: 50000,
        maxCharsCap: 50000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

配置入站媒體理解（圖片/音訊/視訊）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
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

<Accordion title="Media model entry fields">

**Provider entry** (`type: "provider"` 或省略):

- `provider`：API 提供商 ID (`openai`、`anthropic`、`google`/`gemini`、`groq` 等)
- `model`：模型 ID 覆蓋
- `profile` / `preferredProfile`：`auth-profiles.json` 設定檔選擇

**CLI entry** (`type: "cli"`):

- `command`：要執行的可執行檔
- `args`：模板化引數 (支援 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等)

**Common fields:**

- `capabilities`：選用清單 (`image`、`audio`、`video`)。預設值：`openai`/`anthropic`/`minimax` → image，`google` → image+audio+video，`groq` → audio。
- `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：各項目覆蓋。
- 失敗時會退回至下一個項目。

Provider auth 遵循標準順序：`auth-profiles.json` → env vars → `models.providers.*.apiKey`。

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

控制哪些 session 可以被 session tools (`sessions_list`、`sessions_history`、`sessions_send`) 鎖定。

預設值：`tree` (目前 session + 由其產生的 session，例如 subagents)。

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

- `self`：僅限目前的 session 金鑰。
- `tree`：目前 session + 由目前 session 產生的 session (subagents)。
- `agent`：屬於目前代理程式 ID 的任何工作階段（如果您在相同代理程式 ID 下執行個別寄件者的工作階段，可能包含其他使用者）。
- `all`：任何工作階段。跨代理程式鎖定仍然需要 `tools.agentToAgent`。
- Sandbox clamp：當目前工作階段處於沙盒模式且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 時，即使 `tools.sessions.visibility="all"`，可見性也會被強制設為 `tree`。

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

注意：

- 附件僅支援 `runtime: "subagent"`。ACP 執行時期會拒絕它們。
- 檔案會以 `.manifest.json` 具體化到子工作區的 `.openclaw/attachments/<uuid>/` 中。
- 附件內容會從對話紀錄持久性中自動編修。
- Base64 輸入會經過嚴格的字元集/填補檢查以及解碼前大小防護來驗證。
- 檔案權限為目錄 `0700` 與檔案 `0600`。
- 清理遵循 `cleanup` 原則：`delete` 總是會移除附件；`keep` 僅在 `retainOnSessionKeep: true` 時保留它們。

### `tools.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        model: "minimax/MiniMax-M2.5",
        maxConcurrent: 1,
        runTimeoutSeconds: 900,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`：產生子代理程式的預設模型。如果省略，子代理程式會繼承呼叫者的模型。
- `runTimeoutSeconds`：當工具呼叫省略 `runTimeoutSeconds` 時，`sessions_spawn` 的預設逾時（秒）。`0` 表示沒有逾時。
- 個別子代理程式工具原則：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自訂提供者和基礎 URL

OpenClaw 使用 pi-coding-agent 模型目錄。透過設定中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 新增自訂提供者。

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
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

- 使用 `authHeader: true` + `headers` 來處理自訂驗證需求。
- 使用 `OPENCLAW_AGENT_DIR`（或 `PI_CODING_AGENT_DIR`）覆寫代理程式設定根目錄。
- 相符提供者 ID 的合併優先順序：
  - 非空的代理 `models.json` `baseUrl` 值優先。
  - 非空的代理 `apiKey` 值僅在該提供者未在當前 config/auth-profile 上下文中由 SecretRef 管理時優先。
  - 由 SecretRef 管理的提供者 `apiKey` 值會從源標記（env 引用為 `ENV_VAR_NAME`，file/exec 引用為 `secretref-managed`）重新整理，而不是持續化解析後的秘密值。
  - 由 SecretRef 管理的提供者標頭值會從源標記（env 引用為 `secretref-env:ENV_VAR_NAME`，file/exec 引用為 `secretref-managed`）重新整理。
  - 空白或缺失的代理 `apiKey`/`baseUrl` 會回退到 config 中的 `models.providers`。
  - 匹配的模型 `contextWindow`/`maxTokens` 會在顯式配置與隱式目錄值之間使用較高的值。
  - 當您希望配置完全覆寫 `models.json` 時，請使用 `models.mode: "replace"`。
  - 標記持續化以源為準：標記是從活動源配置快照（解析前）寫入的，而非來自解析後的運行時秘密值。

### 提供者欄位詳情

- `models.mode`：提供者目錄行為（`merge` 或 `replace`）。
- `models.providers`：以提供者 id 為鍵的自訂提供者映射。
- `models.providers.*.api`：請求介接卡（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。
- `models.providers.*.apiKey`：提供者憑證（優先使用 SecretRef/env 替換）。
- `models.providers.*.auth`：認證策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
- `models.providers.*.injectNumCtxForOpenAICompat`：針對 Ollama + `openai-completions`，將 `options.num_ctx` 注入請求中（預設：`true`）。
- `models.providers.*.authHeader`：當需要時，強制在 `Authorization` 標頭中傳輸憑證。
- `models.providers.*.baseUrl`：上游 API 基礎 URL。
- `models.providers.*.headers`：用於代理/租戶路由的額外靜態標頭。
- `models.providers.*.models`：明確的提供者模型目錄項目。
- `models.providers.*.models.*.compat.supportsDeveloperRole`：可選的相容性提示。對於具有非空非原生 `baseUrl` (主機不是 `api.openai.com`) 的 `api: "openai-completions"`，OpenClaw 會在執行時強制將其設為 `false`。空白或省略的 `baseUrl` 將保留預設的 OpenAI 行為。
- `models.bedrockDiscovery`：Bedrock 自動探索設定根目錄。
- `models.bedrockDiscovery.enabled`：開啟或關閉探索輪詢。
- `models.bedrockDiscovery.region`：用於探索的 AWS 區域。
- `models.bedrockDiscovery.providerFilter`：用於定向探索的可選提供者 ID 篩選器。
- `models.bedrockDiscovery.refreshInterval`：探索重新整理的輪詢間隔。
- `models.bedrockDiscovery.defaultContextWindow`：探索到之模型的後備上下文視窗。
- `models.bedrockDiscovery.defaultMaxTokens`：探索到之模型的後備最大輸出 Token 數。

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

Cerebras 請使用 `cerebras/zai-glm-4.7`；Z.AI direct 請使用 `zai/glm-4.7`。

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

設定 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)。針對 Zen 目錄請使用 `opencode/...` 參照，針對 Go 目錄請使用 `opencode-go/...` 參照。捷徑：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

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

- 一般端點：`https://api.z.ai/api/paas/v4`
- 程式設計端點（預設）：`https://api.z.ai/api/coding/paas/v4`
- 對於一般端點，請使用基礎 URL 覆寫來定義自訂提供者。

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
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

對於中國端點：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

</Accordion>

<Accordion title="Kimi Coding">

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-coding/k2p5" },
      models: { "kimi-coding/k2p5": { alias: "Kimi K2.5" } },
    },
  },
}
```

相容 Anthropic 的內建提供者。捷徑：`openclaw onboard --auth-choice kimi-code-api-key`。

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

<Accordion title="MiniMax M2.5 (direct)">

```json5
{
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.5" },
      models: {
        "minimax/MiniMax-M2.5": { alias: "Minimax" },
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
            id: "MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: true,
            input: ["text"],
            cost: { input: 15, output: 60, cacheRead: 2, cacheWrite: 10 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

設定 `MINIMAX_API_KEY`。捷徑：`openclaw onboard --auth-choice minimax-api`。

</Accordion>

<Accordion title="Local models (LM Studio)">

請參閱 [Local Models](/zh-Hant/gateway/local-models)。TL;DR：在強硬體上透過 LM Studio Responses API 執行 MiniMax M2.5；保留託管模型合併以進行後援。

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
      nodeManager: "npm", // npm | pnpm | yarn
    },
    entries: {
      "nano-banana-pro": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`：僅針對捆綁技能的可選允許清單（受管理/工作區技能不受影響）。
- `entries.<skillKey>.enabled: false` 會停用技能，即使已捆綁/安裝。
- `entries.<skillKey>.apiKey`：針對宣告主要環境變數的技能提供便利（純文字字串或 SecretRef 物件）。

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
- 探索（Discovery）接受原生 OpenClaw 外掛程式，以及相容的 Codex 套件和 Claude 套件，包括無清單（manifestless）的 Claude 預設佈局套件。
- **變更設定需要重新啟動閘道。**
- `allow`：可選的允許清單（僅載入列出的外掛程式）。`deny` 優先。
- `plugins.entries.<id>.apiKey`：外掛程式層級的 API 金鑰便利欄位（當外掛程式支援時）。
- `plugins.entries.<id>.env`：外掛程式範圍的環境變數對映。
- `plugins.entries.<id>.hooks.allowPromptInjection`：當 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示詞變異欄位，同時保留舊版 `modelOverride` 和 `providerOverride`。適用於原生外掛程式掛鉤和支援的套件提供掛鉤目錄。
- `plugins.entries.<id>.config`：外掛程式定義的設定物件（當可用時由原生 OpenClaw 外掛程式架構驗證）。
- 已啟用的 Claude 套件外掛程式也可以從 `settings.json` 貢獻嵌入的 Pi 預設值；OpenClaw 會將其作為清理後的代理程式設定套用，而不是作為原始的 OpenClaw 設定補丁。
- `plugins.slots.memory`：選擇作用中的記憶體外掛程式 ID，或使用 `"none"` 停用記憶體外掛程式。
- `plugins.slots.contextEngine`：選擇作用中的內容引擎外掛程式 ID；除非您安裝並選擇其他引擎，否則預設為 `"legacy"`。
- `plugins.installs`：由 `openclaw plugins update` 使用的 CLI 管理安裝中繼資料。
  - 包括 `source`、`spec`、`sourcePath`、`installPath`、`version`、`resolvedName`、`resolvedVersion`、`resolvedSpec`、`integrity`、`shasum`、`resolvedAt`、`installedAt`。
  - 將 `plugins.installs.*` 視為受管理的狀態；優先使用 CLI 指令而非手動編輯。

請參閱 [外掛程式](/zh-Hant/tools/plugin)。

---

## 瀏覽器

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // default trusted-network mode
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

- `evaluateEnabled: false` 停用 `act:evaluate` 和 `wait --fn`。
- 未設定時，`ssrfPolicy.dangerouslyAllowPrivateNetwork` 預設為 `true`（信任網路模型）。
- 設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: false` 以啟用嚴格的僅限公開瀏覽器瀏覽。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在連線能力/探索檢查期間會受到相同的私人網路封鎖。
- `ssrfPolicy.allowPrivateNetwork` 作為舊版別名仍受支援。
- 在嚴格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 進行明確的例外處理。
- 遠端設定檔僅支援附加（停用 start/stop/reset）。
- `existing-session` 設定檔僅限主機並使用 Chrome MCP 而非 CDP。
- `existing-session` 設定檔可以設定 `userDataDir` 以目標指向特定的
  Chromium 瀏覽器設定檔，例如 Brave 或 Edge。
- 自動偵測順序：預設瀏覽器（如果是 Chromium 架構）→ Chrome → Brave → Edge → Chromium → Chrome Canary。
- 控制服務：僅限回環（連接埠衍生自 `gateway.port`，預設 `18791`）。
- `extraArgs` 將額外的啟動標誌附加到本地 Chromium 啟動（例如
  `--disable-gpu`、視窗大小或除錯標誌）。

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

- `seamColor`：原生應用程式 UI chrome 的強調色（對話模式氣泡色調等）。
- `assistant`：控制 UI 身分覆寫。回退到作用中的代理程式身分。

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

- `mode`: `local` (執行 gateway) 或 `remote` (連線到遠端 gateway)。除非為 `local`，否則 Gateway 將拒絕啟動。
- `port`: WS + HTTP 的單一多工連接埠。優先順序：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`: `auto`、`loopback` (預設)、`lan` (`0.0.0.0`)、`tailnet` (僅限 Tailscale IP)，或 `custom`。
- **舊版綁定別名**：在 `gateway.bind` 中使用綁定模式值 (`auto`、`loopback`、`lan`、`tailnet`、`custom`)，而非主機別名 (`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`)。
- **Docker 說明**：預設的 `loopback` 綁定會在容器內監聽 `127.0.0.1`。使用 Docker 橋接網路 (`-p 18789:18789`) 時，流量會抵達 `eth0`，導致無法連線到 gateway。請使用 `--network host`，或設定 `bind: "lan"` (或搭配 `customBindHost: "0.0.0.0"` 使用 `bind: "custom"`) 以監聽所有介面。
- **Auth**：預設為必填。非 loopback 綁定需要共用的 token/password。上線精靈預設會產生 token。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` (包括 SecretRefs)，請明確將 `gateway.auth.mode` 設為 `token` 或 `password`。如果同時設定了兩者但未設定模式，啟動和服務安裝/修復流程將會失敗。
- `gateway.auth.mode: "none"`: 明確的無 auth 模式。僅用於受信任的本機 loopback 設定；上線提示刻意不提供此選項。
- `gateway.auth.mode: "trusted-proxy"`: 將 auth 委派給具備身分感知能力的反向 Proxy，並信任來自 `gateway.trustedProxies` 的身分標頭 (請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth))。
- `gateway.auth.allowTailscale`: 當 `true` 時，Tailscale Serve 身分標頭可以滿足控制 UI/WebSocket 的 auth (透過 `tailscale whois` 驗證)；HTTP API 端點仍需要 token/password auth。此無 token 流程假設 gateway 主機受信任。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`: 可選的失敗 auth 限制器。套用於每個用戶端 IP 和每個 auth 範圍 (shared-secret 和 device-token 獨立追蹤)。被封鎖的嘗試會回傳 `429` + `Retry-After`。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；如果您刻意希望也對 localhost 流量進行速率限制 (針對測試環境或嚴格的 Proxy 部署)，請設定 `false`。
- 瀏覽器來源的 WS auth 嘗試一律會受到節流，並停用 loopback 例外 (針對瀏覽器本機 localhost 暴力破解的縱深防禦)。
- `tailscale.mode`: `serve` (僅限 tailnet，loopback 綁定) 或 `funnel` (公開，需要 auth)。
- `controlUi.allowedOrigins`: Gateway WebSocket 連線的明確瀏覽器來源白名單。當預期來自非 loopback 來源的瀏覽器用戶端時，此為必填。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: 危險模式，針對刻意依賴 Host 標頭來源原則的部署，啟用 Host 標頭來源後援。
- `remote.transport`: `ssh` (預設) 或 `direct` (ws/wss)。對於 `direct`，`remote.url` 必須是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`: 用戶端緊急覆寫，允許對受信任的私人網路 IP 進行純文字 `ws://`；純文字的預設值仍僅限 loopback。
- `gateway.remote.token` / `.password` 是遠端用戶端憑證欄位。它們本身不設定 gateway auth。
- `gateway.push.apns.relay.baseUrl`: 官方/TestFlight iOS 版本在將支援中繼的註冊發佈到 gateway 後，所使用的外部 APNs 中繼基底 HTTPS URL。此 URL 必須符合編譯至 iOS 版本中的中繼 URL。
- `gateway.push.apns.relay.timeoutMs`: gateway 到中繼的傳送逾時 (毫秒)。預設為 `10000`。
- 支援中繼的註冊會委派給特定的 gateway 身分。配對的 iOS App 會擷取 `gateway.identity.get`，在該中繼註冊中包含該身分，並將註冊範圍的傳送授權轉發給 gateway。另一個 gateway 無法重複使用該已儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: 上述中繼組態的臨時環境變數覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: 僅限開發用途的權宜方案，用於 loopback HTTP 中繼 URL。正式環境中繼 URL 應維持使用 HTTPS。
- `gateway.channelHealthCheckMinutes`: 頻道健康監控間隔 (分鐘)。設定 `0` 以全域停用健康監控重新啟動。預設值：`5`。
- `gateway.channelStaleEventThresholdMinutes`: 陳舊 socket 臨界值 (分鐘)。請將此值維持為大於或等於 `gateway.channelHealthCheckMinutes`。預設值：`30`。
- `gateway.channelMaxRestartsPerHour`: 每個頻道/帳戶在滾動一小時內的最大健康監控重新啟動次數。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`: 健康監控重新啟動的每個頻道選擇退出設定，同時維持全域監控啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: 多帳戶頻道的每個帳戶覆寫。設定後，其優先順序高於頻道層級覆寫。
- 本機 gateway 呼叫路徑只有在未設定 `gateway.auth.*` 時，才能將 `gateway.remote.*` 作為後援。
- 如果透過 SecretRef 明確設定 `gateway.auth.token` / `gateway.auth.password` 但未解析，解析會以封閉式失敗 (無遠端後援遮罩)。
- `trustedProxies`: 終止 TLS 的反向 Proxy IP。僅列出您控制的 Proxy。
- `allowRealIpFallback`: 當 `true` 時，如果缺少 `X-Forwarded-For`，gateway 會接受 `X-Real-IP`。預設 `false` 以採取封閉式失敗行為。
- `gateway.tools.deny`: 針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱 (延伸預設拒絕清單)。
- `gateway.tools.allow`: 從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- Chat Completions：預設為停用。請使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入加固：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
- 選用的回應加固標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` （僅針對您控制的 HTTPS 來源設定；請參閱[受信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多實例隔離

在同一個主機上使用唯一的連接埠和狀態目錄執行多個閘道：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便利旗標：`--dev` （使用 `~/.openclaw-dev` + 連接埠 `19001`）、`--profile <name>` （使用 `~/.openclaw-<name>`）。

請參閱[多個閘道](/zh-Hant/gateway/multiple-gateways)。

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
        model: "openai/gpt-5.2-mini",
      },
    ],
  },
}
```

驗證：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅在 `hooks.allowRequestSessionKey=true` 時（預設：`false`）才會接受要求載荷中的 `sessionKey`。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析

<Accordion title="對應詳細資訊">

- `match.path` 符合 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 符合通用路徑的 payload 欄位。
- 像 `{{messages[0].subject}}` 這類的樣板會從 payload 讀取。
- `transform` 可以指向一個返回 hook 動作的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，並且必須位於 `hooks.transformsDir` 內（絕對路徑和路徑遍歷將會被拒絕）。
- `agentId` 將路線發送到特定的代理；未知的 ID 會回退到預設值。
- `allowedAgentIds`：限制明確路由（`*` 或省略 = 允許所有，`[]` = 拒絕所有）。
- `defaultSessionKey`：可選的固定會話金鑰，用於沒有明確 `sessionKey` 的 hook 代理執行。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：明確 `sessionKey` 值（請求 + 對應）的可選前綴允許清單，例如 `["hook:"]`。
- `deliver: true` 將最終回覆發送到頻道；`channel` 預設為 `last`。
- `model` 針對此 hook 執行覆寫 LLM（如果設定了模型目錄，必須被允許）。

</Accordion>

### Gmail 整合

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

- 設定後，Gateway 會在啟動時自動啟動 `gog gmail watch serve`。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用。
- 不要在 Gateway 旁邊單獨執行 `gog gmail watch serve`。

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

- 在 Gateway 埠下透過 HTTP 提供可由代理編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本機：保持 `gateway.bind: "loopback"`（預設值）。
- 非回環綁定：Canvas 路由需要 Gateway 驗證 (token/password/trusted-proxy)，與其他 Gateway HTTP 介面相同。
- Node WebView 通常不發送驗證標頭；在節點配對並連線後，Gateway 會為 Canvas/A2UI 存取發布節點範圍的功能 URL。
- 功能 URL 綁定到作用中的節點 WS 會話並很快過期。不使用基於 IP 的後備機制。
- 將熱重載客戶端注入到提供的 HTML 中。
- 當為空時自動建立初始 `index.html`。
- 同時在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 gateway。
- 對於大型目錄或 `EMFILE` 錯誤，請停用熱重載。

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

- `minimal` (預設)：從 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`。
- 主機名稱預設為 `openclaw`。使用 `OPENCLAW_MDNS_HOSTNAME` 覆寫。

### 廣域 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下寫入單播 DNS-SD 區域。對於跨網路探索，需搭配 DNS 伺服器 (建議使用 CoreDNS) + Tailscale 分割 DNS。

設定：`openclaw dns setup --apply`。

---

## 環境

### `env` (內聯環境變數)

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

- 僅當程序環境缺少該鍵時，才會套用內聯環境變數。
- `.env` 檔案：CWD `.env` + `~/.openclaw/.env` (兩者都不會覆寫現有的變數)。
- `shellEnv`：從您的登入 shell 設定檔匯入缺少的預期鍵。
- 有關完整優先順序，請參閱 [Environment](/zh-Hant/help/environment)。

### 環境變數替換

使用 `${VAR_NAME}` 在任何設定字串中引用環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 缺少/空的變數會在載入設定時拋出錯誤。
- 使用 `$${VAR}` 跳脫以取得字面 `${VAR}`。
- 適用於 `$include`。

---

## 密鑰

密鑰引用是累加的：純文字值仍然有效。

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
- `source: "exec"` ids 不得包含 `.` 或 `..` 斜線分隔的路徑片段（例如 `a/../b` 會被拒絕）

### 支援的憑證表面

- 標準矩陣：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 目標支援 `openclaw.json` 憑證路徑。
- `auth-profiles.json` refs 包含在執行時期解析和稽核覆蓋範圍內。

### Secret 提供者設定

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

- `file` 提供者支援 `mode: "json"` 和 `mode: "singleValue"`（在單一值模式下，`id` 必須是 `"value"`）。
- `exec` 提供者需要絕對 `command` 路徑，並在 stdin/stdout 上使用協定酬載。
- 預設情況下，符號連結指令路徑會被拒絕。設定 `allowSymlinkCommand: true` 以在驗證解析後的目標路徑時允許符號連結路徑。
- 如果設定了 `trustedDirs`，信任目錄檢查會套用至解析後的目標路徑。
- `exec` 子環境預設為最小化；使用 `passEnv` 明確傳遞所需變數。
- Secret refs 在啟用時解析為記憶體內部快照，然後請求路徑僅讀取快照。
- 啟用表面過濾在啟用期間套用：啟用表面上的未解析 refs 會導致啟動/重新載入失敗，而非啟用表面則會被略過並輸出診斷資訊。

---

## Auth 儲存

```json5
{
  auth: {
    profiles: {
      "anthropic:me@example.com": { provider: "anthropic", mode: "oauth", email: "me@example.com" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
    },
    order: {
      anthropic: ["anthropic:me@example.com", "anthropic:work"],
    },
  },
}
```

- 個別代理程式設定檔儲存在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 支援值層級參照 (`keyRef` 用於 `api_key`，`tokenRef` 用於 `token`)。
- 靜態執行時憑證來自記憶體中解析的快照；一旦發現舊的靜態 `auth.json` 項目就會被清除。
- 從 `~/.openclaw/credentials/oauth.json` 匯入舊版 OAuth。
- 參閱 [OAuth](/zh-Hant/concepts/oauth)。
- Secrets 執行時行為與 `audit/configure/apply` 工具：[Secrets Management](/zh-Hant/gateway/secrets)。

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
- 設定 `logging.file` 以指定穩定的路徑。
- 當 `--verbose` 時，`consoleLevel` 會提升至 `debug`。

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
  - `"random"` (預設值)：輪換的有趣/季節性標語。
  - `"default"`：固定的中性標語 (`All your chats, one OpenClaw.`)。
  - `"off"`：無標語文字 (橫幅標題/版本仍會顯示)。
- 若要隱藏整個橫幅 (而不只是標語)，請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

---

## 精靈

由 CLI 引導式設定流程寫入的中繼資料 (`onboard`, `configure`, `doctor`)：

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

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
      },
    ],
  },
}
```

由 macOS 入門助理寫入。衍生預設值：

- `messages.ackReaction` 來自 `identity.emoji` (後備為 👀)
- `mentionPatterns` 來自 `identity.name`/`identity.emoji`
- `avatar` 接受：工作區相對路徑、`http(s)` URL，或 `data:` URI

---

## 橋接器 (舊版，已移除)

目前的版本不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 鍵不再屬於設定綱要的一部分 (移除前驗證會失敗；`openclaw doctor --fix` 可移除未知鍵)。

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

- `sessionRetention`: 在從 `sessions.json` 清理之前，保留已完成的隔離 cron 執行階段的時間長度。同時也控制已封存已刪除 cron 腳本的清理。預設值：`24h`；設定 `false` 以停用。
- `runLog.maxBytes`: 清理前每次執行記錄檔（`cron/runs/<jobId>.jsonl`）的大小上限。預設值：`2_000_000` 位元組。
- `runLog.keepLines`: 觸發執行記錄清理時保留的最新行數。預設值：`2000`。
- `webhookToken`: 用於 cron webhook POST 傳遞（`delivery.mode = "webhook"`）的 bearer token，如果省略則不發送授權標頭。
- `webhook`: 已棄用的舊版後備 webhook URL (http/https)，僅用於仍有 `notify: true` 的已儲存工作。

請參閱 [Cron 工作](/zh-Hant/automation/cron-jobs)。

---

## 媒體模型模板變數

在 `tools.media.models[].args` 中展開的模板佔位符：

| 變數               | 說明                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整傳入訊息主體                             |
| `{{RawBody}}`      | 原始主體（無歷史記錄/發送者包裝器）          |
| `{{BodyStripped}}` | 已移除群組提及的主體                         |
| `{{From}}`         | 發送者識別碼                                 |
| `{{To}}`           | 目的地識別碼                                 |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前階段 UUID                                |
| `{{IsNewSession}}` | 建立新階段時為 `"true"`                      |
| `{{MediaUrl}}`     | 傳入媒體虛擬 URL                             |
| `{{MediaPath}}`    | 本機媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（圖片/音訊/文件/…）                 |
| `{{Transcript}}`   | 音訊逐字稿                                   |
| `{{Prompt}}`       | 為 CLI 條目解析的媒體提示                    |
| `{{MaxChars}}`     | 為 CLI 條目解析的最大輸出字元數              |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群組主題（盡最大努力）                       |
| `{{GroupMembers}}` | 群組成員預覽（盡最大努力）                   |
| `{{SenderName}}`   | 發送者顯示名稱（盡最大努力）                 |
| `{{SenderE164}}`   | 發送者電話號碼（盡最大努力）                 |
| `{{Provider}}`     | 提供者提示（whatsapp、telegram、discord 等） |

---

## 配置包含（`$include`）

將配置拆分為多個檔案：

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

- 單一檔案：替換包含的物件。
- 檔案陣列：按順序深度合併（後面的覆蓋前面的）。
- 同級鍵：在包含之後合併（覆蓋包含的值）。
- 巢狀包含：最多深 10 層。
- 路徑：相對於包含檔案解析，但必須保持在頂層配置目錄內（`dirname` 的 `openclaw.json`）。僅當絕對/`../` 形式仍在該邊界內解析時才允許。
- 錯誤：針對缺失檔案、解析錯誤和循環包含的清晰訊息。

---

_相關：[配置](/zh-Hant/gateway/configuration) · [配置範例](/zh-Hant/gateway/configuration-examples) · [診斷](/zh-Hant/gateway/doctor)_

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
