---
summary: "Slack 設定與執行時期行為（Socket Mode + HTTP Request URLs）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

狀態：透過 Slack 應用程式整合，已支援 DMs + 頻道的正式環境版本。預設模式為 Socket Mode；同時也支援 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack 私訊預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
</CardGroup>

## 快速設定

<Tabs>
  <Tab title="Socket Mode（預設）">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        在 Slack 應用程式設定中按下 **[Create New App](https://api.slack.com/apps/new)** 按鈕：

        - 選擇 **from a manifest** 並為您的應用程式選取一個工作區
        - 貼上下方的 [範例 manifest](#manifest-and-scope-checklist) 並繼續建立
        - 產生一個具有 `connections:write` 的 **App-Level Token** (`xapp-...`)
        - 安裝應用程式並複製顯示的 **Bot Token** (`xoxb-...`)
      </Step>

      <Step title="設定 OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        Env fallback (default account only):

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="啟動 gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="Create a new Slack app">
        在 Slack 應用程式設定中按下 **[Create New App](https://api.slack.com/apps/new)** 按鈕：

        - 選擇 **from a manifest** 並為您的應用程式選擇一個工作區
        - 貼上 [example manifest](#manifest-and-scope-checklist) 並在建立前更新 URL
        - 儲存 **Signing Secret** 以用於請求驗證
        - 安裝應用程式並複製顯示的 **Bot Token** (`xoxb-...`)

      </Step>

      <Step title="Configure OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

        <Note>
        Use unique webhook paths for multi-account HTTP

        給每個帳戶一個唯一的 `webhookPath` (預設為 `/slack/events`)，以免註冊時發生衝突。
        </Note>

      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Manifest 與範圍檢查清單

<Tabs>
  <Tab title="Socket 模式（預設）">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

  </Tab>

  <Tab title="HTTP 請求 URL">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

  </Tab>
</Tabs>

### 額外的 Manifest 設定

展現擴充上述預設值的不同功能。

<AccordionGroup>
  <Accordion title="選用的原生斜線指令">

    可以使用多個 [原生斜線指令](#commands-and-slash-behavior) 來取代單一設定且有細微差別的指令：

    - 使用 `/agentstatus` 而非 `/status`，因為 `/status` 指令已被保留。
    - 最多只能同時提供 25 個斜線指令。

    將您現有的 `features.slash_commands` 區段替換為 [可用指令](/zh-Hant/tools/slash-commands#command-list) 的子集：

    <Tabs>
      <Tab title="Socket 模式（預設）">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "Start a new session",
        "usage_hint": "[model]"
      },
      {
        "command": "/reset",
        "description": "Reset the current session"
      },
      {
        "command": "/compact",
        "description": "Compact the session context",
        "usage_hint": "[instructions]"
      },
      {
        "command": "/stop",
        "description": "Stop the current run"
      },
      {
        "command": "/session",
        "description": "Manage thread-binding expiry",
        "usage_hint": "idle <duration|off> or max-age <duration|off>"
      },
      {
        "command": "/think",
        "description": "Set the thinking level",
        "usage_hint": "<off|minimal|low|medium|high|xhigh>"
      },
      {
        "command": "/verbose",
        "description": "Toggle verbose output",
        "usage_hint": "on|off|full"
      },
      {
        "command": "/fast",
        "description": "Show or set fast mode",
        "usage_hint": "[status|on|off]"
      },
      {
        "command": "/reasoning",
        "description": "Toggle reasoning visibility",
        "usage_hint": "[on|off|stream]"
      },
      {
        "command": "/elevated",
        "description": "Toggle elevated mode",
        "usage_hint": "[on|off|ask|full]"
      },
      {
        "command": "/exec",
        "description": "Show or set exec defaults",
        "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>"
      },
      {
        "command": "/model",
        "description": "Show or set the model",
        "usage_hint": "[name|#|status]"
      },
      {
        "command": "/models",
        "description": "List providers or models for a provider",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]"
      },
      {
        "command": "/help",
        "description": "Show the short help summary"
      },
      {
        "command": "/commands",
        "description": "Show the generated command catalog"
      },
      {
        "command": "/tools",
        "description": "Show what the current agent can use right now",
        "usage_hint": "[compact|verbose]"
      },
      {
        "command": "/agentstatus",
        "description": "Show runtime status, including provider usage/quota when available"
      },
      {
        "command": "/tasks",
        "description": "List active/recent background tasks for the current session"
      },
      {
        "command": "/context",
        "description": "Explain how context is assembled",
        "usage_hint": "[list|detail|json]"
      },
      {
        "command": "/whoami",
        "description": "Show your sender identity"
      },
      {
        "command": "/skill",
        "description": "Run a skill by name",
        "usage_hint": "<name> [input]"
      },
      {
        "command": "/btw",
        "description": "Ask a side question without changing session context",
        "usage_hint": "<question>"
      },
      {
        "command": "/usage",
        "description": "Control the usage footer or show cost summary",
        "usage_hint": "off|tokens|full|cost"
      }
    ]
```

      </Tab>
      <Tab title="HTTP 請求 URL">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "Start a new session",
        "usage_hint": "[model]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/reset",
        "description": "Reset the current session",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/compact",
        "description": "Compact the session context",
        "usage_hint": "[instructions]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/stop",
        "description": "Stop the current run",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/session",
        "description": "Manage thread-binding expiry",
        "usage_hint": "idle <duration|off> or max-age <duration|off>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/think",
        "description": "Set the thinking level",
        "usage_hint": "<off|minimal|low|medium|high|xhigh>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/verbose",
        "description": "Toggle verbose output",
        "usage_hint": "on|off|full",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/fast",
        "description": "Show or set fast mode",
        "usage_hint": "[status|on|off]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/reasoning",
        "description": "Toggle reasoning visibility",
        "usage_hint": "[on|off|stream]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/elevated",
        "description": "Toggle elevated mode",
        "usage_hint": "[on|off|ask|full]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/exec",
        "description": "Show or set exec defaults",
        "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/model",
        "description": "Show or set the model",
        "usage_hint": "[name|#|status]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/models",
        "description": "List providers or models for a provider",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/help",
        "description": "Show the short help summary",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/commands",
        "description": "Show the generated command catalog",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/tools",
        "description": "Show what the current agent can use right now",
        "usage_hint": "[compact|verbose]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/agentstatus",
        "description": "Show runtime status, including provider usage/quota when available",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/tasks",
        "description": "List active/recent background tasks for the current session",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/context",
        "description": "Explain how context is assembled",
        "usage_hint": "[list|detail|json]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/whoami",
        "description": "Show your sender identity",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/skill",
        "description": "Run a skill by name",
        "usage_hint": "<name> [input]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/btw",
        "description": "Ask a side question without changing session context",
        "usage_hint": "<question>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/usage",
        "description": "Control the usage footer or show cost summary",
        "usage_hint": "off|tokens|full|cost",
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
```

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="選用的作者身分範圍（寫入操作）">
    如果您希望傳出訊息使用作用中的代理程式身分（自訂使用者名稱和圖示）而非預設的 Slack 應用程式身分，請新增 `chat:write.customize` Bot 範圍。

    如果您使用 Emoji 圖示，Slack 會預期 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="選用的使用者權杖範圍（讀取操作）">
    如果您設定 `channels.slack.userToken`，典型的讀取範圍為：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (如果您依賴 Slack 搜尋讀取功能)

  </Accordion>
</AccordionGroup>

## 權杖模型

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- Config tokens 會覆蓋 env fallback。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` env fallback 僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限 config（無 env fallback），且預設為唯讀行為 (`userTokenReadOnly: true`)。

狀態快照行為：

- Slack 帳戶檢查會追蹤每個憑證的 `*Source` 和 `*Status` 欄位 (`botToken`、`appToken`、`signingSecret`、`userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳戶是透過 SecretRef 或其他非內嵌 secret 來源配置的，但目前的指令/執行路徑無法解析實際值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket Mode 下，必需的配對是 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，配置時可優先使用使用者 token。對於寫入，bot token 仍是優先選項；僅在 `userTokenReadOnly: false` 且無 bot token 時才允許使用使用者 token 寫入。</Tip>

## 動作與閘道

Slack 動作由 `channels.slack.actions.*` 控制。

目前 Slack 工具中可用的動作群組：

| 群組       | 預設    |
| ---------- | ------- |
| messages   | 已啟用  |
| reactions  | 已啟用  |
| pins       | 已啟用  |
| memberInfo | enabled |
| emojiList  | enabled |

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制 DM 存取（舊版：`channels.slack.dm.policy`）：

    - `pairing`（預設值）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`）
    - `disabled`

    DM 旗標：

    - `dm.enabled`（預設為 true）
    - `channels.slack.allowFrom`（建議使用）
    - `dm.allowFrom`（舊版）
    - `dm.groupEnabled`（群組 DM 預設為 false）
    - `dm.groupChannels`（選用的 MPIM 允許清單）

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 當具名帳號本身的 `allowFrom` 未設定時，會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="頻道政策">
    `channels.slack.groupPolicy` 控制頻道處理方式：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，應使用穩定的頻道 ID。

    執行時注意：如果 `channels.slack` 完全缺失（僅環境變數設定），執行時會回退到 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 存取權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設定的值，但預設會在路由時被忽略
    - 傳入授權和頻道路由預設以 ID 為優先；直接的使用者名稱/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設受到提及閘門控制。

    提及來源：

    - 明確的 App 提及 (`<@botId>`)
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為（當 `thread.requireExplicitMention` 為 `true` 時停用）

    逐頻道控制 (`channels.slack.channels.<id>`；僅名稱透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`，`toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      （舊版無前綴的金鑰仍僅映射到 `id:`）

  </Tab>
</Tabs>

## 執行緒、會話和回覆標籤

- DM 以 `direct` 方式路由；頻道為 `channel`；MPIM 為 `group`。
- 預設使用 `session.dmScope=main` 時，Slack 私訊會折疊至 Agent 主工作階段。
- 頻道工作階段：`agent:<agentId>:slack:channel:<channelId>`。
- 執行緒回覆可在適用時建立執行緒工作階段後綴（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新的執行緒工作階段開始時，會取得多少既有的執行緒訊息（預設 `20`；設定 `0` 以停用）。
- `channels.slack.thread.requireExplicitMention`（預設 `false`）：當設為 `true` 時，隱藏隱含的執行緒提及，使 Bot 僅回應執行緒內明確的 `@bot` 提及，即使 Bot 已參與該執行緒。若無此設定，Bot 參與執行緒中的回覆將繞過 `requireMention` 閘道控制。

回覆執行緒控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（預設 `off`）
- `channels.slack.replyToModeByChatType`：依 `direct|group|channel` 而定
- 直接聊天的舊版後援：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 會停用 Slack 中**所有**回覆執行緒功能，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵循明確標籤。此差異反映了平台的執行緒模型：Slack 執行緒會將訊息從頻道中隱藏，而 Telegram 回覆則會顯示在主要聊天流程中。

## Ack 反應

`ackReaction` 會在 OpenClaw 處理傳入訊息時傳送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- agent 身份表情符號後援（`agents.list[].identity.emoji`，否則為 "👀"）

備註：

- Slack 預期使用短代碼（例如 `"eyes"`）。
- 使用 `""` 以針對 Slack 帳號或全域停用該反應。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial`（預設值）：將預覽文字替換為最新的部分輸出。
- `block`：附加區塊化的預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後傳送最終文字。

當 `channels.slack.streaming.mode` 為 `partial` 時，`channels.slack.streaming.nativeTransport` 控制 Slack 原生文字串流（預設值：`true`）。

- 必須有可用的回覆串流才能顯示原生文字串流和 Slack 助理串流狀態。串流選擇仍遵循 `replyToMode`。
- 當無法使用原生串流時，頻道和群組聊天根節點仍可使用一般草稿預覽。
- 頂層 Slack DM 預設保持非串流狀態，因此不會顯示串流樣式的預覽；如果您想要在那裡顯示可見進度，請使用串流回覆或 `typingReaction`。
- 媒體和非文字載荷會回退為一般傳遞。
- 如果串流在回覆中途失敗，OpenClaw 會對剩餘的載荷回退為一般傳遞。

使用草稿預覽而非 Slack 原生文字串流：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "partial",
        nativeTransport: false,
      },
    },
  },
}
```

舊版金鑰：

- `channels.slack.streamMode` (`replace | status_final | append`) 會自動遷移至 `channels.slack.streaming.mode`。
- 布林值 `channels.slack.streaming` 會自動遷移至 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport`。
- 舊版 `channels.slack.nativeStreaming` 會自動遷移至 `channels.slack.streaming.nativeTransport`。

## 輸入反應回退

`typingReaction` 會在 OpenClaw 處理回覆時，在傳入的 Slack 訊息上新增暫時性反應，然後在執行完成時將其移除。這在串流回覆之外最為有用，後者使用預設的「輸入中...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期使用短代碼（例如 `"hourglass_flowing_sand"`）。
- 此回應為盡力而為，且會在回覆或失敗路徑完成後嘗試自動清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="傳入附件">
    Slack 檔案附件會從 Slack 託管的私人 URL（經過 Token 認證的請求流程）下載，並在擷取成功且大小限制允許時寫入媒體存放區。

    執行時傳入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

<Accordion title="傳出文字與檔案">- 文字區塊使用 `channels.slack.textChunkLimit`（預設 4000） - `channels.slack.chunkMode="newline"` 啟用以段落為先的分割 - 檔案傳送使用 Slack 上傳 API，且可包含執行緒回覆（`thread_ts`） - 傳出媒體上限在有設定時遵循 `channels.slack.mediaMaxMb`；否則頻道傳送使用媒體管線中基於 MIME 類型的預設值</Accordion>

  <Accordion title="傳遞目標">
    首選的明確目標：

    - DM 使用 `user:<id>`
    - 頻道使用 `channel:<id>`

    當傳送至使用者目標時，Slack DM 會透過 Slack 對話 API 開啟。

  </Accordion>
</AccordionGroup>

## 指令與斜線行為

斜線指令在 Slack 中顯示為單一設定指令或多個原生指令。設定 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要在您的 Slack 應用程式中進行[額外的清單設定](#additional-manifest-settings)，並改為在全域設定中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 啟用。

- Slack 的原生指令自動模式為**關閉**，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生引數選單使用自適應渲染策略，會在發送所選選項值之前顯示確認對話框：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選擇選單
- 超過 100 個選項：當可用互動選項處理程式時，使用帶有非同步選項篩選的外部選擇
- 超過 Slack 限制：編碼的選項值會退回到按鈕

```txt
/think
```

Slash 工作階段使用像 `agent:<agentId>:slack:slash:<userId>` 這樣的隔離金鑰，並且仍然使用 `CommandTargetSessionKey` 將命令執行路由到目標對話工作階段。

## 互動式回覆

Slack 可以呈現代理程式建立的互動式回覆控制項，但此功能預設為停用。

全域啟用：

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

或僅對一個 Slack 帳戶啟用：

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

啟用後，代理程式可以發出 Slack 專用的回覆指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

這些指令會編譯成 Slack Block Kit，並透過現有的 Slack 互動事件路徑將點擊或選擇傳回。

備註：

- 這是 Slack 專用的 UI。其他通道不會將 Slack Block Kit 指令轉換為它們自己的按鈕系統。
- 互動式回呼值是 OpenClaw 產生的不透明權杖，而非原始的代理程式建立值。
- 如果產生的互動區塊會超過 Slack Block Kit 的限制，OpenClaw 將退回到原始的文字回覆，而不是發送無效的區塊 payload。

## Slack 中的執行核准

Slack 可以作為具有互動式按鈕和互動的原生核准客戶端，而不是退回到 Web UI 或終端機。

- 執行核准使用 `channels.slack.execApprovals.*` 進行原生 DM/通道路由。
- 當請求已經傳送至 Slack 且核准 id 種類為 `plugin:` 時，外掛程式核准仍然可以透過相同的 Slack 原生按鈕介面來解決。
- 仍然會執行核准者授權：只有被識別為核准者的使用者才能透過 Slack 核准或拒絕請求。

這使用與其他通道相同的共用核准按鈕介面。當在您的 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中呈現為 Block Kit 按鈕。
當這些按鈕存在時，它們是主要的核准 UX；OpenClaw
應該只在工具結果顯示聊天核准不可用或手動核准是唯一路徑時，才包含手動的 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` （可選；盡可能回退至 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
- `agentFilter`、`sessionFilter`

當 `enabled` 未設定或為 `"auto"`，且至少有一位
審核者解決時，Slack 會自動啟用原生 exec 審核。設定 `enabled: false` 以明確停用 Slack 作為原生審核客戶端。
設定 `enabled: true` 以在審核者解決時強制開啟原生審核。

沒有明確 Slack exec 審核設定的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有在您想要覆寫審核者、新增篩選器，或
選擇加入 origin-chat 傳遞時，才需要明確的 Slack 原生設定：

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

共享 `approvals.exec` 轉發是分開的。僅當 exec 審核提示也必須
路由到其他聊天或明確的 out-of-band 目標時使用。共享 `approvals.plugin` 轉發也是
分開的；當這些請求已經
抵達 Slack 時，Slack 原生按鈕仍可以解決 plugin 審核。

同聊天室 `/approve` 也適用於已支援指令的 Slack 頻道和 DM。請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals) 以了解完整的審核轉發模型。

## 事件與營運行為

- 訊息編輯/刪除/訊息廣播會對應至系統事件。
- 反應新增/移除事件會對應至系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應至系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道設定金鑰。
- 頻道主題/用途元資料會被視為不受信任的上下文，並可以注入到路由上下文中。
- 訊息啟動器和初始訊息歷史上下文種子會在適用時根據設定的發送者允許清單進行篩選。
- 區塊動作和模態互動會發出具有豐富 payload 欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊動作：所選值、標籤、選擇器值以及 `workflow_*` 中繼資料
  - 模態 `view_submission` 與 `view_closed` 事件，包含路由頻道中繼資料與表單輸入

## 設定參考指標

主要參考：

- [設定參考 - Slack](/zh-Hant/gateway/configuration-reference#slack)

  高重要性的 Slack 欄位：
  - 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom` (舊版：`dm.policy`、`dm.allowFrom`)、`dm.groupEnabled`、`dm.groupChannels`
  - 相容性切換：`dangerouslyAllowNameMatching` (緊急措施；除非需要否則保持關閉)
  - 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 串接/歷史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`
  - 作業/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

## 疑難排解

<AccordionGroup>
  <Accordion title="頻道中無回覆">
    請依序檢查：

    - `groupPolicy`
    - 頻道允許清單 (`channels.slack.channels`)
    - `requireMention`
    - 各頻道 `users` 允許清單

    實用指令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM messages ignored">
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或舊版 `channels.slack.dm.policy`)
    - 配對審核 / 允許清單項目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    驗證 Slack 應用程式設定中的 bot + app 權杖和 Socket Mode 啟用狀態。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳號
    已設定，但目前的執行階段無法解析 SecretRef 支援的
    數值。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - 簽署密鑰 (signing secret)
    - webhook 路徑
    - Slack Request URLs (事件 + 互動 + 斜線指令)
    - 每個 HTTP 帳號唯一的 `webhookPath`

    如果 `signingSecretStatus: "configured_unavailable"` 出現在帳號
    快照中，表示 HTTP 帳號已設定，但目前的執行階段無法
    解析 SecretRef 支援的簽署密鑰。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    驗證您原本的意圖是：

    - 原生指令模式 (`channels.slack.commands.native: true`)，並在 Slack 中註冊了相符的斜線指令
    - 還是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時也檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [頻道路由](/zh-Hant/channels/channel-routing)
- [疑難排解](/zh-Hant/channels/troubleshooting)
- [設定](/zh-Hant/gateway/configuration)
- [斜線指令](/zh-Hant/tools/slash-commands)
