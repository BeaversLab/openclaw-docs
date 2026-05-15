---
summary: "頻道設定：存取控制、配對，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 等的每個頻道金鑰"
read_when:
  - Configuring a channel plugin (auth, access control, multi-account)
  - Troubleshooting per-channel config keys
  - Auditing DM policy, group policy, or mention gating
title: "設定 — 頻道"
---

`channels.*` 下的每個頻道設定金鑰。涵蓋 DM 與群組存取、多帳號設定、提及閘控，以及 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他內建頻道外掛的每個頻道金鑰。

關於代理人、工具、Gateway 執行時期和其他頂層金鑰，請參閱[設定參考](/zh-Hant/gateway/configuration-reference)。

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
- 頂層 `bindings[]` 條目若包含 `type: "acp"`，則為論壇主題配置持久化的 ACP 綁定（請在 `match.peer.id` 中使用規範的 `chatId:topic:topicId`）。欄位語義請參閱 [ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。
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

- Token：`channels.discord.token`，並以 `DISCORD_BOT_TOKEN` 作為預設帳戶的後備。
- 提供明確 Discord `token` 的直接外撥呼叫會使用該 token；帳戶重試/政策設定仍來自使用中執行時快照中的所選帳戶。
- 可選的 `channels.discord.defaultAccount` 在符合已配置的帳戶 ID 時，會覆寫預設的帳戶選擇。
- 請使用 `user:<id>` (DM) 或 `channel:<id>` (群組頻道) 作為傳遞目標；不接受純數字 ID。
- Guild slugs 為小寫，空格以 `-` 取代；頻道鍵使用 slug 化名稱（無 `#`）。建議優先使用 Guild ID。
- 預設會忽略由 Bot 發送的訊息。`allowBots: true` 可啟用它們；使用 `allowBots: "mentions"` 則僅接受提及該 Bot 的 Bot 訊息（自身的訊息仍會被過濾）。
- `channels.discord.guilds.<id>.ignoreOtherMentions`（與頻道覆寫）會捨棄提及其他使用者或角色但未提及該 Bot 的訊息（排除 @everyone/@here）。
- `channels.discord.mentionAliases` 會在發送前將穩定的外送 `@handle` 文字對應至 Discord 使用者 ID，因此即使暫時的目錄快取為空，也能確保提及已知的隊友。個別帳戶的覆寫位於 `channels.discord.accounts.<accountId>.mentionAliases` 之下。
- `maxLinesPerMessage`（預設值 17）會分割長訊息，即使字數低於 2000 字元也一樣。
- `channels.discord.threadBindings` 控制與 Discord 執行緒綁定的路由：
  - `enabled`：針對執行緒綁定會話功能的 Discord 覆寫（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及綁定的傳遞/路由）
  - `idleHours`：針對非活動自動取消專注的 Discord 覆寫，單位為小時（`0` 表示停用）
  - `maxAgeHours`：針對強制最大存活時間的 Discord 覆寫，單位為小時（`0` 表示停用）
  - `spawnSessions`：用於 `sessions_spawn({ thread: true })` 和 ACP 執行緒產生自動執行緒建立/綁定的開關（預設值：`true`）
  - `defaultSpawnContext`：針對執行緒綁定產生的原生子代理程式上下文（預設為 `"fork"`）
- 頂層 `bindings[]` 項目若包含 `type: "acp"`，則會針對頻道和執行緒設定持續性 ACP 綁定（在 `match.peer.id` 中使用頻道/執行緒 ID）。欄位語義在 [ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings) 中共用。
- `channels.discord.ui.components.accentColor` 設定 Discord 元件 v2 容器的強調色彩。
- `channels.discord.voice` 啟用 Discord 語音頻道對話以及選用的自動加入 + LLM + TTS 覆寫。僅限文字的 Discord 設定預設會關閉語音功能；請設定 `channels.discord.voice.enabled=true` 以選擇加入。
- `channels.discord.voice.model` 可選擇性地覆寫用於 Discord 語音頻道回應的 LLM 模型。
- `channels.discord.voice.daveEncryption` 和 `channels.discord.voice.decryptionFailureTolerance` 會傳遞給 `@discordjs/voice` DAVE 選項（預設為 `true` 和 `24`）。
- `channels.discord.voice.connectTimeoutMs` 控制針對 `@discordjs/voice` Ready 的初始等待時間，以及 `/vc join` 和自動加入嘗試的等待時間（預設為 `30000`）。
- `channels.discord.voice.reconnectGraceMs` 控制斷線的語音會話在 OpenClaw 將其終結前，進入重連信號所需的時間（預設為 `15000`）。
- Discord 語音播放不會被其他使用者的說話開始事件中斷。為了避免回饋迴路，OpenClaw 會在 TTS 播放時忽略新的語音擷取。
- OpenClaw 還會嘗試透過在重複解密失敗後離開/重新加入語音階段來恢復語音接收。
- `channels.discord.streaming` 是正規的串流模式金鑰。Discord 預設為 `streaming.mode: "progress"`，以便工具/工作進度顯示在一個編輯過的預覽訊息中；設定 `streaming.mode: "off"` 可停用它。舊版 `streamMode` 和布林值 `streaming` 仍是執行時期別名；執行 `openclaw doctor --fix` 以重寫持久化設定。
- `channels.discord.autoPresence` 將執行時期可用性對應至機器人狀態（健康 => 線上，降級 => 閒置，耗盡 => 請勿打擾），並允許選用的狀態文字覆寫。
- `channels.discord.dangerouslyAllowNameMatching` 重新啟用可變名稱/標籤匹配（緊急相容模式）。
- `channels.discord.execApprovals`：Discord 原生執行核准傳遞與核准者授權。
  - `enabled`：`true`、`false` 或 `"auto"`（預設）。在自動模式下，當可從 `approvers` 或 `commands.ownerAllowFrom` 解析出核准者時，執行核准會啟用。
  - `approvers`：獲准核准執行請求的 Discord 使用者 ID。省略時會回退至 `commands.ownerAllowFrom`。
  - `agentFilter`：選用的代理程式 ID 允許清單。省略以轉發所有代理程式的核准。
  - `sessionFilter`：選用的會話金鑰模式（子字串或正規表達式）。
  - `target`：傳送核准提示的位置。`"dm"`（預設）傳送至核准者 DM，`"channel"` 傳送至原始頻道，`"both"` 傳送至兩者。當目標包含 `"channel"` 時，按鈕僅可供已解析的核准者使用。
  - `cleanupAfterResolve`：當為 `true` 時，在核准、拒絕或逾時後刪除核准 DM。

**反應通知模式：** `off` (無)，`own` (機器人的訊息，預設值)，`all` (所有訊息)，`allowlist` (在所有訊息上 `guilds.<id>.users`)。

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

- 服務帳戶 JSON：內聯 (`serviceAccount`) 或基於檔案 (`serviceAccountFile`)。
- 亦支援服務帳戶 SecretRef (`serviceAccountRef`)。
- 環境變數後備：`GOOGLE_CHAT_SERVICE_ACCOUNT` 或 `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE`。
- 使用 `spaces/<spaceId>` 或 `users/<userId>` 作為傳遞目標。
- `channels.googlechat.dangerouslyAllowNameMatching` 重新啟用可變的電子郵件主體匹配 (緊急玻璃相容模式)。

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

- **Socket 模式** 同時需要 `botToken` 和 `appToken` (預設帳戶環境變數後備為 `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN`)。
- **HTTP 模式** 需要 `botToken` 加上 `signingSecret` (在根層級或每個帳戶)。
- `socketMode` 將 Slack SDK Socket 模式傳輸調參傳遞給公開的 Bolt 接收器 API。僅在調查 ping/pong 逾時或過時的 websocket 行為時使用。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字
  字串或 SecretRef 物件。
- Slack 帳戶快照會公開每個憑證的來源/狀態欄位，例如
  `botTokenSource`、`botTokenStatus`、`appTokenStatus`，以及在 HTTP 模式下的
  `signingSecretStatus`。`configured_unavailable` 表示該帳戶是
  透過 SecretRef 配置的，但目前的指令/執行時路徑無法
  解析祕密值。
- `configWrites: false` 會阻擋 Slack 發起的配置寫入。
- 當符合設定的帳戶 ID 時，可選的 `channels.slack.defaultAccount` 會覆寫預設帳戶選擇。
- `channels.slack.streaming.mode` 是 Slack 串流模式的正規金鑰。`channels.slack.streaming.nativeTransport` 控制 Slack 的原生串流傳輸。舊版的 `streamMode`、布林值 `streaming` 和 `nativeStreaming` 數值仍為執行時期別名；請執行 `openclaw doctor --fix` 以重寫已儲存的設定。
- 使用 `user:<id>` (DM) 或 `channel:<id>` 作為傳送目標。

**反應通知模式：** `off`、`own` (預設)、`all`、`allowlist` (來自 `reactionAllowlist`)。

**執行緒工作階段隔離：** `thread.historyScope` 為每個執行緒隔離 (預設) 或在頻道間共用。`thread.inheritParent` 會將父頻道的紀錄複製到新執行緒。

- Slack 原生串流加上 Slack 助理風格的「正在輸入...」執行緒狀態需要一個回覆執行緒目標。頂層 DM 預設保持在執行緒之外，以便它們仍可透過 Slack 草稿發布與編輯預覽進行串流，而不是顯示執行緒風格的原生串流/狀態預覽。
- `typingReaction` 會在回覆執行時，對傳入的 Slack 訊息新增暫時性的反應，並在完成時將其移除。請使用 Slack emoji 簡碼，例如 `"hourglass_flowing_sand"`。
- `channels.slack.execApprovals`：Slack 原生 exec 執行傳遞與審核者授權。架構與 Discord 相同：`enabled` (`true`/`false`/`"auto"`)、`approvers` (Slack 使用者 ID)、`agentFilter`、`sessionFilter` 和 `target` (`"dm"`、`"channel"` 或 `"both"`)。

| 動作群組   | 預設    | 備註                   |
| ---------- | ------- | ---------------------- |
| reactions  | enabled | React + list reactions |
| messages   | enabled | Read/send/edit/delete  |
| pins       | enabled | Pin/unpin/list         |
| memberInfo | enabled | Member info            |
| emojiList  | enabled | Custom emoji list      |

### Mattermost

Mattermost 在目前的 OpenClaw 版本中作為內附插件提供。舊版或
自訂組建可以使用 `openclaw plugins install @openclaw/mattermost` 安裝目前的 npm 套件。
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

聊天模式：`oncall`（在 @-mention 時回應，預設）、`onmessage`（每則訊息）、`onchar`（以觸發前綴開頭的訊息）。

當啟用 Mattermost 原生命令時：

- `commands.callbackPath` 必須是路徑（例如 `/api/channels/mattermost/command`），而不是完整的 URL。
- `commands.callbackUrl` 必須解析為 OpenClaw gateway 端點，且必須可從 Mattermost 伺服器存取。
- 原生的斜線回呼會使用 Mattermost 在斜線命令註冊期間傳回的
  個別命令 token 進行驗證。如果註冊失敗或未
  啟用任何命令，OpenClaw 會使用 `Unauthorized: invalid command token.` 拒絕回呼
- 對於私人/tailnet/內部回呼主機，Mattermost 可能需要
  `ServiceSettings.AllowedUntrustedInternalConnections` 包含回呼主機/網域。
  請使用主機/網域值，而非完整的 URL。
- `channels.mattermost.configWrites`：允許或拒絕由 Mattermost 發起的設定寫入。
- `channels.mattermost.requireMention`：在頻道中回覆前需要 `@mention`。
- `channels.mattermost.groups.<channelId>.requireMention`：各頻道的 mention-gating 覆蓋設定（預設為 `"*"`）。
- 可選的 `channels.mattermost.defaultAccount` 會在符合已設定的帳戶 ID 時覆蓋預設的帳戶選擇。

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

- `channels.signal.account`：將頻道啟動鎖定至特定的 Signal 帳戶身分。
- `channels.signal.configWrites`：允許或拒絕由 Signal 發起的設定寫入。
- 可選的 `channels.signal.defaultAccount` 會在符合已設定的帳戶 ID 時覆蓋預設的帳戶選擇。

### iMessage

OpenClaw 會產生 `imsg rpc`（透過 stdio 的 JSON-RPC）。不需要守護程序或連接埠。當主機能夠授予訊息資料庫和自動化權限時，這是新的 OpenClaw iMessage 設定的首選路徑。

已移除 BlueBubbles 支援。請將 `channels.bluebubbles` 設定遷移至 `channels.imessage`；OpenClaw 僅透過 `imsg` 支援 iMessage。

如果 Gateway 未在已登入的訊息 Mac 上執行，請保留 `channels.imessage.enabled=true` 並將 `channels.imessage.cliPath` 設定為在該 Mac 上執行 `imsg "$@"` 的 SSH 包裝器。預設的本地 `imsg` 路徑僅適用於 macOS。

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

- 可選的 `channels.imessage.defaultAccount` 會在符合設定的帳戶 ID 時覆寫預設的帳戶選擇。

- 需要對訊息資料庫的完全磁碟存取權。
- 偏好使用 `chat_id:<id>` 目標。使用 `imsg chats --limit 20` 列出聊天。
- `cliPath` 可以指向 SSH 包裝器；設定 `remoteHost`（`host` 或 `user@host`）以進行 SCP 附件擷取。
- `attachmentRoots` 和 `remoteAttachmentRoots` 會限制傳入附件路徑（預設：`/Users/*/Library/Messages/Attachments`）。
- SCP 使用嚴格的主機金鑰檢查，因此請確保轉送主機金鑰已存在於 `~/.ssh/known_hosts` 中。
- `channels.imessage.configWrites`：允許或拒絕由 iMessage 發起的設定寫入。
- 具有 `type: "acp"` 的頂層 `bindings[]` 項目可以將 iMessage 對話綁定到持續的 ACP 會話。請在 `match.peer.id` 中使用標準化的處理程序或明確的聊天目標（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。共用欄位語意：[ACP Agents](/zh-Hant/tools/acp-agents#persistent-channel-bindings)。

<Accordion title="iMessage SSH 包裝器範例">

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

</Accordion>

### Matrix

Matrix 是基於外掛程式的，並在 `channels.matrix` 下進行設定。

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
- `channels.matrix.proxy` 將 Matrix HTTP 流量路由透過明確的 HTTP(S) 代理伺服器。命名帳戶可以使用 `channels.matrix.accounts.<id>.proxy` 覆寫此設定。
- `channels.matrix.network.dangerouslyAllowPrivateNetwork` 允許私用/內部 homeserver。`proxy` 和此網路選擇加入是獨立的控制項。
- `channels.matrix.defaultAccount` 在多帳戶設定中選擇首選帳戶。
- `channels.matrix.autoJoin` 預設為 `off`，因此受邀請的房間和新的 DM 式邀請將被忽略，直到您使用 `autoJoinAllowlist` 或 `autoJoin: "always"` 設定 `autoJoin: "allowlist"`。
- `channels.matrix.execApprovals`：Matrix 原生 exec 傳遞和審核者授權。
  - `enabled`：`true`、`false` 或 `"auto"` (預設)。在自動模式下，當可以從 `approvers` 或 `commands.ownerAllowFrom` 解析出審核者時，exec 審核會啟用。
  - `approvers`：允許批准 exec 請求的 Matrix 使用者 ID (例如 `@owner:example.org`)。
  - `agentFilter`：可選的代理程式 ID 允許清單。省略此項以轉發所有代理程式的審核。
  - `sessionFilter`：可選的工作階段金鑰模式 (子字串或正則表達式)。
  - `target`：傳送審核提示的位置。`"dm"` (預設)、`"channel"` (原始房間) 或 `"both"`。
  - 每個帳戶的覆寫：`channels.matrix.accounts.<id>.execApprovals`。
- `channels.matrix.dm.sessionScope` 控制 Matrix DM 如何分組為工作階段：`per-user` (預設) 依路由對等方共用，而 `per-room` 則隔離每個 DM 房間。
- Matrix 狀態探測和即時目錄查詢使用與執行時流量相同的代理原則。
- 完整的 Matrix 設定、目標規則和設定範例記錄在 [Matrix](/zh-Hant/channels/matrix) 中。

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
- 完整的 Teams 設定（憑證、Webhook、DM/群組原則、每個團隊/頻道的覆寫）記錄在 [Microsoft Teams](/zh-Hant/channels/msteams) 中。

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
- 當符合設定的帳戶 ID 時，選用的 `channels.irc.defaultAccount` 會覆寫預設的帳戶選擇。
- 完整的 IRC 頻道設定（主機/連接埠/TLS/頻道/允許清單/提及閘道）記錄在 [IRC](/zh-Hant/channels/irc) 中。

### 多帳戶（所有頻道）

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

- 當省略 `accountId` 時（CLI + 路由），會使用 `default`。
- 環境變數 Token 僅適用於**預設**帳戶。
- 除非每個帳戶單獨覆寫，否則基本頻道設定適用於所有帳戶。
- 使用 `bindings[].match.accountId` 將每個帳戶路由到不同的代理程式。
- 如果您透過 `openclaw channels add`（或頻道上架）在仍使用單一帳戶頂層頻道設定的情況下新增非預設帳戶，OpenClaw 會先將帳戶範圍的頂層單一帳戶值提升至頻道帳戶對應中，以確保原始帳戶繼續運作。大多數頻道會將其移至 `channels.<channel>.accounts.default`；Matrix 則可以改為保留現有的符合命名/預設目標。
- 現有的僅頻道綁定（沒有 `accountId`）會繼續符合預設帳戶；帳戶範圍的綁定則保持選用。
- `openclaw doctor --fix` 也會透過將帳戶範圍的頂層單一帳戶值移至為該頻道選擇的提升帳戶中，來修復混合形狀。大多數頻道使用 `accounts.default`；Matrix 則可以改為保留現有的符合命名/預設目標。

### 其他外掛程式頻道

許多外掛頻道被配置為 `channels.<id>` 並記錄在其專用的頻道頁面中（例如 Feishu、Matrix、LINE、Nostr、Zalo、Nextcloud Talk、Synology Chat 和 Twitch）。
查看完整的頻道索引：[Channels](/zh-Hant/channels)。

### 群組聊天提及閘道

群組訊息預設為**需要提及**（metadata mention 或安全的正規表示式模式）。適用於 WhatsApp、Telegram、Discord、Google Chat 和 iMessage 群組聊天。

可見回覆是分開控制的。群組/頻道聊天室預設為 `messages.groupChat.visibleReplies: "message_tool"`：OpenClaw 仍會處理該輪次，但一般的最終回覆會保持私密，而可見的聊天室輸出則需要 `message(action=send)`。僅當您想要舊版行為（即將一般回覆發布回聊天室）時，才設定 `"automatic"`。若要將相同的「僅限工具」可見回覆行為也應用於直接聊天，請設定 `messages.visibleReplies: "message_tool"`；Codex harness 也將該僅限工具的行為作為其未設定的直接聊天預設值。

僅限工具的可見回覆需要一個能可靠呼叫工具的模型/執行時。如果會話日誌顯示助手的文字帶有 `didSendViaMessagingTool: false`，這表示模型產生了私有的最終答案，而不是呼叫訊息工具。請切換到該頻道更強大的工具呼叫模型，或者設定 `messages.groupChat.visibleReplies: "automatic"` 以恢復舊版可見的最終回覆。

如果在啟用的工具原則下無法使用訊息工具，OpenClaw 將回退為自動可見回覆，而不是靜默抑制回應。`openclaw doctor` 會針對此不匹配發出警告。

檔案儲存後，閘道會熱重載 `messages` 設定。僅當在部署中停用了檔案監看或設定重載時才需要重新啟動。

**提及類型：**

- **Metadata mentions**：原生平台 @-mentions。在 WhatsApp 自我聊天模式中會被忽略。
- **Text patterns**：`agents.list[].groupChat.mentionPatterns` 中的安全正規表示式模式。無效的模式和不安全的巢狀重複會被忽略。
- 僅當可以進行偵測時（原生提及或至少一種模式），才會強制執行提及閘道。

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

`messages.groupChat.historyLimit` 設定了全域預設值。頻道可以使用 `channels.<channel>.historyLimit`（或每個帳號）進行覆寫。設定 `0` 以停用。

`messages.visibleReplies` 是全域來源輪次預設值；`messages.groupChat.visibleReplies` 會針對群組/頻道來源輪次覆寫它。當未設定 `messages.visibleReplies` 時，駝鳥腳本 可以提供自己的直接/來源預設值；Codex 駝鳥腳本預設為 `message_tool`。頻道允許清單和提及閘門仍會決定是否處理輪次。

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

解析順序：個別 DM 覆寫 → 提供者預設值 → 無限制（全部保留）。

支援：`telegram`、`whatsapp`、`discord`、`slack`、`signal`、`imessage`、`msteams`。

#### 自我聊天模式

將您自己的號碼包含在 `allowFrom` 中以啟用自我聊天模式（忽略原生的 @-mentions，僅回應文字模式）：

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

- 此區塊用於配置指令介面。若要查看目前的內建 + 附錄指令目錄，請參閱 [斜線指令](/zh-Hant/tools/slash-commands)。
- 此頁面是 **配置鍵值參考**，並非完整的指令目錄。通道/外掛擁有的指令，例如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、裝置配對 `/pair`、記憶體 `/dreaming`、手機控制 `/phone` 和 Talk `/voice`，則記錄在其各自的通道/外掛頁面以及 [斜線指令](/zh-Hant/tools/slash-commands) 中。
- 文字指令必須是 **獨立** 的訊息，並以 `/` 開頭。
- `native: "auto"` 會開啟 Discord/Telegram 的原生指令，並關閉 Slack。
- `nativeSkills: "auto"` 會開啟 Discord/Telegram 的原生技能指令，並關閉 Slack。
- 每個通道的覆寫設定：`channels.discord.commands.native` (布林值或 `"auto"`)。對於 Discord，`false` 會在啟動期間跳過原生指令註冊和清理。
- 使用 `channels.<provider>.commands.nativeSkills` 覆寫每個通道的原生技能註冊。
- `channels.telegram.customCommands` 會新增額外的 Telegram 機器人選單項目。
- `bash: true` 為主機 shell 啟用 `! <cmd>`。需要 `tools.elevated.enabled` 且發送者在 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 啟用 `/config` (讀取/寫入 `openclaw.json`)。對於 Gateway `chat.send` 用戶端，持久化 `/config set|unset` 寫入也需要 `operator.admin`；唯讀 `/config show` 則對一般寫入範圍的操作員用戶端保持可用。
- `mcp: true` 為 `mcp.servers` 下的 OpenClaw 管理之 MCP 伺服器配置啟用 `/mcp`。
- `plugins: true` 為外掛探索、安裝和啟用/停用控制啟用 `/plugins`。
- `channels.<provider>.configWrites` 對每個通道的配置變更進行閘道控制 (預設：true)。
- 對於多帳號通道，`channels.<provider>.accounts.<id>.configWrites` 也會對針對該帳號的寫入進行閘道控制 (例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`)。
- `restart: false` 停用 `/restart` 和 Gateway 重啟工具動作。預設值：`true`。
- `ownerAllowFrom` 是僅限擁有者之指令/工具的明確擁有者允許清單。它與 `allowFrom` 分開。
- `ownerDisplay: "hash"` 會在系統提示詞中雜湊擁有者 ID。設定 `ownerDisplaySecret` 以控制雜湊。
- `allowFrom` 是針對每個提供者。設定後，它是 **唯一** 的授權來源 (通道允許清單/配對和 `useAccessGroups` 將被忽略)。
- 當未設定 `allowFrom` 時，`useAccessGroups: false` 允許指令繞過存取群組原則。
- 指令文件地圖：
  - 內建 + 附錄目錄：[斜線指令](/zh-Hant/tools/slash-commands)
  - 特定通道的指令介面：[通道](/zh-Hant/channels)
  - QQ Bot 指令：[QQ Bot](/zh-Hant/channels/qqbot)
  - 配對指令：[配對](/zh-Hant/channels/pairing)
  - LINE 卡片指令：[LINE](/zh-Hant/channels/line)
  - 記憶體夢境：[夢境](/zh-Hant/concepts/dreaming)

</Accordion>

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 頂層鍵值
- [Configuration — agents](/zh-Hant/gateway/config-agents)
- [Channels overview](/zh-Hant/channels)
