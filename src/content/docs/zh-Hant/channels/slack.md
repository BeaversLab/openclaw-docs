---
summary: "Slack 設定與執行時期行為（Socket Mode + HTTP Request URLs）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

狀態：透過 Slack 應用程式整合，已支援 DMs + 頻道的正式環境版本。預設模式為 Socket Mode；同時也支援 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/en/channels/pairing">
    Slack 私訊預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/en/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/en/channels/troubleshooting">
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
  <Tab title="Socket Mode (default)">

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

  <Tab title="HTTP Request URLs">

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

### Additional manifest settings

Surface different features that extend the above defaults.

<AccordionGroup>
  <Accordion title="Optional native slash commands">

    您可以使用多個 [native slash commands](#commands-and-slash-behavior)，而不是單一配置的指令，以獲得更細緻的功能：

    - 使用 `/agentstatus` 而不是 `/status`，因為 `/status` 指令已被保留。
    - 最多只能同時提供 25 個斜線指令。

    使用 [available commands](/en/tools/slash-commands#command-list) 的子集來取代您現有的 `features.slash_commands` 部分：

    <Tabs>
      <Tab title="Socket Mode (default)">

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
      <Tab title="HTTP Request URLs">

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
  <Accordion title="可選的作者身分範圍（寫入作業）">
    如果您希望外寄訊息使用目前代理人身分（自訂使用者名稱和圖示）而非預設的 Slack 應用程式身分，請新增 `chat:write.customize` bot 範圍。

    如果您使用 emoji 圖示，Slack 會預期 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="可選的使用者權杖範圍（讀取作業）">
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

- `botToken` + `appToken` 為 Socket 模式所需。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字
  字串或 SecretRef 物件。
- 設定權杖會覆寫環境變數後備。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數後備僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅供設定使用（無環境變數後備），並預設為唯讀行為 (`userTokenReadOnly: true`)。

狀態快照行為：

- Slack 帳戶檢查會追蹤各認證的 `*Source` 和 `*Status`
  欄位 (`botToken`, `appToken`, `signingSecret`, `userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳號是透過 SecretRef 或其他非內嵌機密來源配置的，但目前的命令/執行時路徑無法解析實際值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket 模式下，必要的配對是 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，配置後可以優先使用使用者權杖。對於寫入，機器人權杖仍然優先；只有在 `userTokenReadOnly: false` 且無法使用機器人權杖時，才允許使用者權杖寫入。</Tip>

## 動作與閘門

Slack 動作由 `channels.slack.actions.*` 控制。

目前 Slack 工具中可用的動作群組：

| 群組      | 預設   |
| --------- | ------ |
| 訊息      | 已啟用 |
| 反應      | 已啟用 |
| 釘選      | 已啟用 |
| 成員資訊  | 已啟用 |
| emoji清單 | 已啟用 |

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制直接訊息 (DM) 存取（舊版：`channels.slack.dm.policy`）：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`)
    - `disabled`

    DM 標誌：

    - `dm.enabled` (預設為 true)
    - `channels.slack.allowFrom` (首選)
    - `dm.allowFrom` (舊版)
    - `dm.groupEnabled` (群組 DM 預設為 false)
    - `dm.groupChannels` (選用的 MPIM 允許清單)

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 具名帳號會在未設定其 `allowFrom` 時繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，且應使用穩定的頻道 ID。

    執行時期備註：如果完全缺少 `channels.slack` (僅限環境變數的設定)，執行時期會還原為 `groupPolicy="allowlist"` 並記錄警告 (即使已設定 `channels.defaults.groupPolicy`)。

    名稱/ID 解析：

    - 當權杖存取允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為已設定的狀態，但在預設情況下會被路由忽略
    - 連入授權和頻道路由預設優先使用 ID；直接的使用者名稱/slug 比對需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設由提及控管。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為 (當 `thread.requireExplicitMention` 為 `true` 時停用)

    各頻道控制項 (`channels.slack.channels.<id>`；名稱僅透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`、`e164:`、`username:`、`name:`，或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應到 `id:`)

  </Tab>
</Tabs>

## 執行緒、會話與回覆標籤

- DM 以 `direct` 路由；頻道以 `channel`；MPIM 以 `group`。
- 使用預設的 `session.dmScope=main`，Slack DM 會收合至代理主會話。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 執行緒回覆可在適用時建立執行緒會話後綴 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新執行緒會話開始時擷取多少現有的執行緒訊息 (預設 `20`；設定 `0` 以停用)。
- `channels.slack.thread.requireExplicitMention` (預設 `false`)：當 `true` 時，抑制隱含的串流提及，使機器人僅回應串流內明確的 `@bot` 提及，即使機器人已參與該串流。若無此設定，在機器人參與的串流中的回覆將繞過 `requireMention` 閘門。

回覆串流控制：

- `channels.slack.replyToMode`: `off|first|all|batched` (預設 `off`)
- `channels.slack.replyToModeByChatType`: 每 `direct|group|channel`
- 直接聊天的舊版回退機制： `channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意： `replyToMode="off"` 會停用 Slack 中 **所有** 回覆串流功能，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。此差異反映了平台串流模型的區別：Slack 串流會將訊息從頻道中隱藏，而 Telegram 回覆則保留在主要聊天流程中可見。

## 確認反應

當 OpenClaw 正在處理傳入訊息時， `ackReaction` 會傳送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號回退機制 (`agents.list[].identity.emoji`，否則為 "👀")

備註：

- Slack 預期使用短代碼 (例如 `"eyes"`)。
- 使用 `""` 以針對 Slack 帳號或全域停用該反應。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`: 停用即時預覽串流。
- `partial` (預設)：以最新的部分輸出取代預覽文字。
- `block`: 附加區塊化的預覽更新。
- `progress`: 生成時顯示進度狀態文字，然後傳送最終文字。

當 `channels.slack.streaming.mode` 為 `partial` 時（預設值：`true`），`channels.slack.streaming.nativeTransport` 控制 Slack 原生文字串流。

- 必須提供回覆串流才能啟用原生文字串流並顯示 Slack 助手串流狀態。串流選擇仍然遵循 `replyToMode`。
- 當無法使用原生串流時，頻道和群組聊天根節點仍然可以使用正常的草稿預覽。
- 頂層 Slack 私訊預設為非串流模式，因此不會顯示串流樣式的預覽；如果您希望在那裡看到可見的進度，請使用串流回覆或 `typingReaction`。
- 媒體和非文字酬載會回退至正常傳遞。
- 如果在回覆過程中串流失敗，OpenClaw 會對剩餘的酬載回退至正常傳遞。

使用草稿預覽代替 Slack 原生文字串流：

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

## 輸入中反應回退

當 OpenClaw 正在處理回覆時，`typingReaction` 會對傳入的 Slack 訊息新增暫時性的反應，然後在執行完成時將其移除。這在串流回覆之外最有用，因為串流回覆會使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期短代碼（例如 `"hourglass_flowing_sand"`）。
- 該反應為「盡力而為」，並會在回覆或失敗路徑完成後自動嘗試進行清理。

## 媒體、分塊和傳遞

<AccordionGroup>
  <Accordion title="傳入附件">
    Slack 檔案附件會從 Slack 託管的私人 URL 下載（經過權杖驗證的要求流程），並在擷取成功且大小限制允許的情況下寫入媒體存放區。

    執行時傳入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆蓋。

  </Accordion>

<Accordion title="Outbound text and files">- 文字區塊使用 `channels.slack.textChunkLimit`（預設為 4000） - `channels.slack.chunkMode="newline"` 啟用以段落為主的分割 - 檔案傳送使用 Slack 上傳 API，並可包含討論串回覆（`thread_ts`） - 外傳媒體上限在設定時遵循 `channels.slack.mediaMaxMb`；否則頻道傳送會使用媒體管線的 MIME 類型預設值</Accordion>

  <Accordion title="Delivery targets">
    偏好的明確目標：

    - `user:<id>` 用於私訊 (DM)
    - `channel:<id>` 用於頻道

    當傳送至使用者目標時，Slack 私訊會透過 Slack 對話 API 開啟。

  </Accordion>
</AccordionGroup>

## 指令和斜線行為

斜線指令在 Slack 中顯示為單一設定指令或多個原生指令。設定 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要您的 Slack 應用程式中的[額外清單設定](#additional-manifest-settings)，並改為在全域設定中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 來啟用。

- 原生指令自動模式對 Slack 來說是**關閉** 的，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生參數選單使用自適應渲染策略，在分發選取的選項值之前顯示確認模態框：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選單
- 超過 100 個選項：當有互動選項處理程式可用時，使用具有非同步選項過濾的外部選單
- 超過 Slack 限制：編碼的選項值會退回按鈕

```txt
/think
```

斜線工作階段使用像 `agent:<agentId>:slack:slash:<userId>` 這樣的隔離金鑰，並且仍然使用 `CommandTargetSessionKey` 將指令執行路由到目標對話工作階段。

## 互動式回覆

Slack 可以呈現由代理程式撰寫的互動式回覆控制項，但此功能預設為停用。

全域啟用它：

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

或僅針對一個 Slack 帳戶啟用它：

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

啟用後，代理可以發出 Slack 專用的回覆指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

這些指令會編譯成 Slack Block Kit，並透過現有的 Slack 互動事件路徑將點擊或選擇傳回。

備註：

- 這是 Slack 專用的 UI。其他頻道不會將 Slack Block Kit 指令轉換為自己的按鈕系統。
- 互動回調值是 OpenClaw 產生的不透明權杖，而非代理撰寫的原始值。
- 如果產生的互動區塊會超過 Slack Block Kit 的限制，OpenClaw 會改為回復原始文字，而不是傳送無效的區塊載荷。

## Slack 中的執行核准

Slack 可充當原生核准客戶端，提供互動式按鈕和互動，而不是退回到網頁 UI 或終端機。

- 執行核准使用 `channels.slack.execApprovals.*` 進行原生私訊/頻道路由。
- 當請求已進入 Slack 且核准 ID 類型為 `plugin:` 時，外掛程式核准仍可透過同一個 Slack 原生按鈕介面解決。
- 仍然會執行核准者授權：只有被識別為核准者的使用者才能透過 Slack 核准或拒絕請求。

這使用與其他頻道相同的共用核准按鈕介面。當您的 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接以 Block Kit 按鈕的形式呈現在對話中。
當這些按鈕存在時，它們是主要的核准 UX；僅當工具結果指出無法使用聊天核准或手動核准是唯一途徑時，OpenClaw 才應包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (選用；盡可能退回到 `commands.ownerAllowFrom`)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設：`dm`)
- `agentFilter`、`sessionFilter`

當 `enabled` 未設定或為 `"auto"` 且至少有一位
審核者解決時，Slack 會自動啟用原生執行核准。若要明確停用 Slack 作為原生核准客戶端，請設定 `enabled: false`。
若要在審核者解決時強制啟用原生核准，請設定 `enabled: true`。

未設定明確 Slack 執行核准設定時的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有當您想要覆寫審核者、新增過濾器，或
選擇啟用來源聊天傳遞時，才需要明確設定 Slack 原生設定：

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

共用 `approvals.exec` 轉發是分開的。僅當執行核准提示也必須路由
至其他聊天或明確的帶外目標時才使用它。共用 `approvals.plugin` 轉發也是
分開的；當這些請求已經抵達 Slack 時，Slack 原生按鈕仍然可以解決外掛程式核准。

同聊天 `/approve` 也適用於已經支援指令的 Slack 頻道和 DM。有關完整的核准轉發模型，請參閱 [執行核准](/en/tools/exec-approvals)。

## 事件與操作行為

- 訊息編輯/刪除/執行緒廣播會對應至系統事件。
- 反應新增/移除事件會對應至系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應至系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道設定金鑰。
- 頻道主題/用途中繼資料會被視為不受信任的上下文，並且可以被注入到路由上下文中。
- 執行緒啟動器和初始執行緒歷史上下文播種會在適用時根據設定的傳送者允許清單進行過濾。
- 區塊動作和模態互動會發出結構化的 `Slack interaction: ...` 系統事件，其中包含豐富的欄位酬載：
  - 區塊動作：選取的值、標籤、選擇器值以及 `workflow_*` 中繼資料
  - 模態 `view_submission` 和 `view_closed` 事件，包含路由頻道中繼資料和表單輸入

## 設定參考指標

主要參考：

- [設定參考 - Slack](/en/gateway/configuration-reference#slack)

  高信號 Slack 欄位：
  - mode/auth: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - DM access: `dm.enabled`, `dmPolicy`, `allowFrom` (legacy: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - compatibility toggle: `dangerouslyAllowNameMatching` (break-glass; keep off unless needed)
  - channel access: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - threading/history: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 疑難排解

<AccordionGroup>
  <Accordion title="頻道中無回覆">
    請依序檢查：

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`)
    - `requireMention`
    - per-channel `users` allowlist

    Useful commands:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM 訊息被忽略">
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或 legacy `channels.slack.dm.policy`)
    - pairing approvals / allowlist entries

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    在 Slack 應用程式設定中驗證 bot + app 權杖以及 Socket Mode 是否已啟用。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳戶
    已設定，但目前的執行環境無法解析 SecretRef 支援的
    值。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - signing secret
    - webhook path
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`

    如果帳戶快照中出現 `signingSecretStatus: "configured_unavailable"`，表示 HTTP 帳戶
    已設定，但目前的執行環境無法解析 SecretRef 支援的
    signing secret。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    驗證您的意圖為何：

    - 原生指令模式 (`channels.slack.commands.native: true`)，並在 Slack 中註冊了對應的 slash 指令
    - 或是單一 slash 指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時也請檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 相關

- [配對](/en/channels/pairing)
- [群組](/en/channels/groups)
- [安全性](/en/gateway/security)
- [通道路由](/en/channels/channel-routing)
- [疑難排解](/en/channels/troubleshooting)
- [設定](/en/gateway/configuration)
- [Slash 指令](/en/tools/slash-commands)
