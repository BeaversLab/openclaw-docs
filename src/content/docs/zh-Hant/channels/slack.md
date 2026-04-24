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
  <Tab title="Socket Mode (預設)">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        在 Slack 應用程式設定中按下 **[Create New App](https://api.slack.com/apps/new)** 按鈕：

        - 選擇 **from a manifest** 並為您的應用程式選擇一個工作區
        - 貼上下方的 [example manifest](#manifest-and-scope-checklist) 並繼續建立
        - 使用 `connections:write` 產生 **App-Level Token** (`xapp-...`)
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
      <Step title="建立新的 Slack 應用程式">
        在 Slack 應用程式設定中按下 **[Create New App](https://api.slack.com/apps/new)** 按鈕：

        - 選擇 **from a manifest** 並為您的應用程式選擇一個工作區
        - 貼上 [example manifest](#manifest-and-scope-checklist) 並在建立前更新 URL
        - 儲存 **Signing Secret** 以用於請求驗證
        - 安裝應用程式並複製顯示的 **Bot Token** (`xoxb-...`)

      </Step>

      <Step title="設定 OpenClaw">

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
        在多帳號 HTTP 中使用唯一的 webhook 路徑

        為每個帳號指定不同的 `webhookPath` (預設為 `/slack/events`)，以免註冊時發生衝突。
        </Note>

      </Step>

      <Step title="啟動 gateway">

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
  <Accordion title="可選的原生斜線指令">

    您可以使用多個 [原生斜線指令](#commands-and-slash-behavior) 來取代單一配置的指令以提供更細緻的功能：

    - 請使用 `/agentstatus` 而非 `/status`，因為 `/status` 指令已被保留。
    - 一次最多只能提供 25 個斜線指令。

    請使用 [可用指令](/zh-Hant/tools/slash-commands#command-list) 的子集來取代您現有的 `features.slash_commands` 區塊：

    <Tabs>
      <Tab title="Socket Mode (預設)">

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
        "usage_hint": "<level>"
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
        "description": "List providers/models or add a model",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all] | add <provider> <modelId>"
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
        "usage_hint": "<level>",
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
  <Accordion title="可選的作者身分權限 (寫入操作)">
    如果您希望傳出訊息使用啟用中的代理程式身分 (自訂使用者名稱和圖示) 而非預設的 Slack 應用程式身分，請新增 `chat:write.customize` bot 權限。

    如果您使用 emoji 圖示，Slack 會預期使用 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="可選的使用者 Token 權限 (讀取操作)">
    如果您配置 `channels.slack.userToken`，典型的讀取權限為：

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

- Socket Mode 必須具備 `botToken` + `appToken`。
- HTTP 模式必須具備 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- Config tokens 會覆蓋 env fallback。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數後備機制僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限設定（無環境變數後備機制），且預設為唯讀行為 (`userTokenReadOnly: true`)。

狀態快照行為：

- Slack 帳戶檢查會追蹤每個憑證的 `*Source` 和 `*Status` 欄位 (`botToken`、`appToken`、`signingSecret`、`userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳戶是透過 SecretRef 或其他非行內祕密來源進行設定，但目前的指令/執行路徑無法解析實際值。
- 在 HTTP 模式中包含 `signingSecretStatus`；在 Socket 模式中，必要的配對是 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，若已設定，可優先使用使用者權杖。對於寫入，Bot 權杖保持優先；僅在 `userTokenReadOnly: false` 且 Bot 權杖不可用時，才允許使用者權杖寫入。</Tip>

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
    `channels.slack.dmPolicy` 控制 DM 存取權限（舊版：`channels.slack.dm.policy`）：

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `channels.slack.allowFrom` 包含 `"*"`；舊版：`channels.slack.dm.allowFrom`)
    - `disabled`

    DM 標誌：

    - `dm.enabled` (預設為 true)
    - `channels.slack.allowFrom` (建議)
    - `dm.allowFrom` (舊版)
    - `dm.groupEnabled` (群組 DM 預設為 false)
    - `dm.groupChannels` (選用的 MPIM 允許清單)

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 具名帳號在其自身的 `allowFrom` 未設定時會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理方式：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，且應使用穩定的頻道 ID。

    執行時期備註：如果 `channels.slack` 完全遺失（僅使用環境變數的設定），執行時期會回退到 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 頻道允許清單項目和 DM 允許清單項目會在啟動時於 Token 存取權限允許的情況下進行解析
    - 未解析的頻道名稱項目會保留為設定值，但預設會在路由時被忽略
    - 傳入授權和頻道路由預設以 ID 為優先；直接的使用者名稱/slug 比對需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設為提及觸發。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`, 後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人行為緒行為 (當 `thread.requireExplicitMention` 為 `true` 時停用)

    逐頻道控制 (`channels.slack.channels.<id>`; 僅名稱透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`, `e164:`, `username:`, `name:`, 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應到 `id:`)

  </Tab>
</Tabs>

## 執行緒、會話和回覆標籤

- DMs 路由為 `direct`；頻道為 `channel`；MPIM 為 `group`。
- 使用預設的 `session.dmScope=main`，Slack DMs 會收斂至 Agent 主工作階段。
- 頻道工作階段：`agent:<agentId>:slack:channel:<channelId>`。
- 回覆可以視情況建立回覆工作階段後綴 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新的回覆工作階段開始時擷取多少個現有回覆訊息 (預設 `20`；設定 `0` 以停用)。
- `channels.slack.thread.requireExplicitMention` （預設 `false`）：當 `true` 時，抑制隱含的執行緒提及，使機器人僅回應執行緒內的明確 `@bot` 提及，即使機器人已參與該執行緒。若無此設定，機器人參與的執行緒中的回覆將繞過 `requireMention` 閘道控制。

回覆執行緒控制：

- `channels.slack.replyToMode`：`off|first|all|batched` （預設 `off`）
- `channels.slack.replyToModeByChatType`：每 `direct|group|channel`
- 直接聊天的舊版後援：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 會停用 Slack 中**所有**回覆執行緒功能，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。此差異反映了平台執行緒模型的不同：Slack 執行緒會將訊息從頻道中隱藏，而 Telegram 回覆則會保留在主要聊天流程中。

當存在綁定的 ACP 會話時，專注的 Slack 執行緒回覆會透過該會話進行路由，而非對預設代理程式外殼準備回覆。這樣可讓 `/focus` 和 `/acp spawn ... --bind here` 綁定在執行緒的後續訊息中保持完整。

## 確認反應

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送一個確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理程式身分表情符號後援（`agents.list[].identity.emoji`，否則為「👀」）

備註：

- Slack 預期使用簡碼（例如 `"eyes"`）。
- 使用 `""` 來停用 Slack 帳戶或全域的反應功能。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` （預設）：以最新的部分輸出取代預覽文字。
- `block`：附加分塊的預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後發送最終文字。
- `streaming.preview.toolProgress`：當草稿預覽啟用時，將工具/進度更新路由到同一個編輯過的預覽訊息中（預設值：`true`）。設定 `false` 以保持獨立的工具/進度訊息。

當 `channels.slack.streaming.mode` 為 `partial` 時，`channels.slack.streaming.nativeTransport` 控制 Slack 原生文字串流（預設值：`true`）。

- 必須提供回覆串才能顯示原生文字串流和 Slack 助手串流狀態。串流的選擇仍然遵循 `replyToMode`。
- 當無法使用原生串流時，頻道和群組聊天根節點仍可使用正常的草稿預覽。
- 頂層 Slack DM 預設保持非串流狀態，因此它們不會顯示串流風格的預覽；如果您希望在那裡看到可見的進度，請使用串流回覆或 `typingReaction`。
- 媒體和非文字酬載會回退到正常遞送。
- 媒體/錯誤的最終狀態會取消待處理的預覽編輯，而不會清除暫時草稿；符合條件的文字/區塊最終狀態僅在能就地編輯預覽時才會清除。
- 如果在回覆中途串流失敗，OpenClaw 會對剩餘的酬載回退到正常遞送。
- 如果 Slack Connect 頻道在 SDK 清空其本地緩衝區之前拒絕串流，它會回退到正常的 Slack 回覆，因此短回覆不會在 Slack 確認之前被靜靜丟棄或被報告為已遞送。

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

- `channels.slack.streamMode`（`replace | status_final | append`）會自動遷移到 `channels.slack.streaming.mode`。
- 布林值 `channels.slack.streaming` 會自動遷移到 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport`。
- 舊版 `channels.slack.nativeStreaming` 會自動遷移到 `channels.slack.streaming.nativeTransport`。

## 輸入中表情回退

當 OpenClaw 處理回覆時，`typingReaction` 會對傳入的 Slack 訊息新增一個暫時表情，然後在執行完成時將其移除。這在串流回覆之外最有用，串流回覆使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期使用短代碼（例如 `"hourglass_flowing_sand"`）。
- 反應為「盡力而為」，並會在回覆或失敗路徑完成後自動嘗試清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件會從 Slack 託管的私人 URL（經過 Token 認證的請求流程）下載，並在擷取成功且大小限制允許的情況下寫入媒體存放區。

    執行時的入站大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

<Accordion title="Outbound text and files">- 文字區塊使用 `channels.slack.textChunkLimit`（預設 4000） - `channels.slack.chunkMode="newline"` 啟用「段落優先」分割 - 檔案傳送使用 Slack 上傳 API，且可以包含執行緒回覆（`thread_ts`） - 出站媒體上限在設定時遵循 `channels.slack.mediaMaxMb`；否則頻道傳送會使用媒體管線中的 MIME 類型預設值</Accordion>

  <Accordion title="Delivery targets">
    偏好的明確目標：

    - `user:<id>` 用於 DM
    - `channel:<id>` 用於頻道

    當傳送至使用者目標時，Slack DM 會透過 Slack 對話 API 開啟。

  </Accordion>
</AccordionGroup>

## 指令與斜線行為

斜線指令在 Slack 中以單一設定指令或多個原生指令的形式出現。設定 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要在您的 Slack 應用程式中進行[額外的 manifest 設定](#additional-manifest-settings)，並改為在全域設定中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 來啟用。

- Slack 的原生指令自動模式為**關閉**，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生參數選單使用自適應渲染策略，在發送選定的選項值之前顯示確認模式：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選擇選單
- 超過 100 個選項：當有可用的互動選項處理程序時，使用外部選擇搭配非同步選項篩選
- 超出 Slack 限制：編碼的選項值會回退至按鈕

```txt
/think
```

Slash 工作階段使用像 `agent:<agentId>:slack:slash:<userId>` 這樣的獨立金鑰，並且仍然使用 `CommandTargetSessionKey` 將指令執行路由到目標對話工作階段。

## 互動式回覆

Slack 可以呈現代理程式建立的互動式回覆控制項，但此功能預設為停用。

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

或僅對一個 Slack 帳戶啟用它：

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

這些指令會編譯成 Slack Block Kit，並透過現有的 Slack 互動事件路徑將點擊或選擇路由回來。

注意事項：

- 這是 Slack 專用 UI。其他管道不會將 Slack Block Kit 指令轉換為它們自己的按鈕系統。
- 互動式回呼值是 OpenClaw 產生的不透明權杖，而不是代理程式建立的原始值。
- 如果產生的互動區塊會超出 Slack Block Kit 限制，OpenClaw 會回退到原始文字回覆，而不是傳送無效的區塊負載。

## Slack 中的 Exec 核准

Slack 可以充當原生核准客戶端，提供互動式按鈕和互動，而不是回退到 Web UI 或終端機。

- Exec 核准使用 `channels.slack.execApprovals.*` 進行原生 DM/頻道路由。
- 當請求已經抵達 Slack 且核准 ID 類型為 `plugin:` 時，外掛程式核准仍然可以透過相同的 Slack 原生按鈕介面來解析。
- 仍然會執行核准者授權：只有被識別為核准者的使用者才能透過 Slack 核准或拒絕請求。

這與其他頻道使用相同的共用核准按鈕介面。當在您的 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中以 Block Kit 按鈕呈現。
當存在這些按鈕時，它們是主要的核准使用者體驗 (UX)；當工具結果指出聊天核准不可用或手動核准是唯一途徑時，OpenClaw 應僅包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (選用；盡可能時會回退至 `commands.ownerAllowFrom`)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
- `agentFilter`、`sessionFilter`

當 `enabled` 未設定或為 `"auto"` 且至少有一位
核准者解析時，Slack 會自動啟用原生執行核准。設定 `enabled: false` 以明確停用 Slack 作為原生核准用戶端。
設定 `enabled: true` 以在核准者解析時強制開啟原生核准。

無明確 Slack 執行核准設定時的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

僅當您想要覆寫核准者、新增過濾器，或選擇加入來源聊天傳遞時，才需要明確的 Slack 原生設定：

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

共用 `approvals.exec` 轉發是分開的。僅當執行核准提示也必須
路由至其他聊天或明確的非頻帶目標時才使用它。共用 `approvals.plugin` 轉發也是
分開的；當這些請求已經抵達 Slack 時，Slack 原生按鈕仍然可以解析外掛程式核准。

同聊天 `/approve` 也可以在已支援指令的 Slack 頻道和 DM 中運作。請參閱 [執行核准](/zh-Hant/tools/exec-approvals) 以了解完整的核准轉發模型。

## 事件與操作行為

- 訊息編輯/刪除/執行緒廣播會對應到系統事件。
- 表情符號新增/移除事件會對應到系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應到系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移通道配置金鑰。
- 通道主題/目的元資料被視為不受信任的上下文，並可以被注入到路由上下文中。
- 討論串啟動器和初始討論串歷史上下文播種會在適用時根據設定的發送者允許清單進行過濾。
- 區塊操作和模態互動會發出結構化的 `Slack interaction: ...` 系統事件，其中包含豐富的負載欄位：
  - 區塊操作：選取值、標籤、選擇器值和 `workflow_*` 元資料
  - 模態 `view_submission` 和 `view_closed` 事件，包含路由通道元資料和表單輸入

## 配置參考指標

主要參考：

- [配置參考 - Slack](/zh-Hant/gateway/configuration-reference#slack)

  高信號 Slack 欄位：
  - 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom`（舊版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 相容性切換：`dangerouslyAllowNameMatching`（緊急情況使用；除非需要，否則請保持關閉）
  - 通道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 討論串/歷史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 疑難排解

<AccordionGroup>
  <Accordion title="No replies in channels">
    依序檢查：

    - `groupPolicy`
    - 頻道許可清單 (`channels.slack.channels`)
    - `requireMention`
    - 依頻道 `users` 許可清單

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
    - 配對核准 / 許可清單項目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    在 Slack 應用程式設定中驗證機器人 + 應用程式權杖，以及是否已啟用 Socket 模式。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳戶已
    設定，但目前的執行環境無法解析 SecretRef 支援的
    數值。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - 簽署金鑰
    - webhook 路徑
    - Slack 要求 URL (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`

    如果帳戶快照中出現 `signingSecretStatus: "configured_unavailable"`，表示 HTTP 帳戶已設定，但目前的執行環境無法
    解析 SecretRef 支援的簽署金鑰。

    已註冊的要求 URL webhook 會透過 Slack 監視器設置所使用的同一個共用處理程式註冊表進行分派，因此 HTTP 模式的 Slack 事件會繼續透過已註冊的路徑進行路由，而不會在成功註冊路由後傳回 404 錯誤。

  </Accordion>

<Accordion title="File downloads with custom bot tokens">當呼叫端未傳遞明確的 `token` 或預先建置的用戶端而傳遞 `cfg` 時，`downloadFile` 輔助函式會從執行時期設定解析其 bot 權杖，藉此在動作執行時期路徑之外保留僅設定的檔案下載。</Accordion>

  <Accordion title="Native/slash commands not firing">
    確認您原本的意圖是：

    - 原生命令模式 (`channels.slack.commands.native: true`) 搭配在 Slack 中註冊的相符斜線命令
    - 或是單一斜線命令模式 (`channels.slack.slashCommand.enabled: true`)

    另外也請檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 相關

- [配對](/zh-Hant/channels/pairing)
- [群組](/zh-Hant/channels/groups)
- [安全性](/zh-Hant/gateway/security)
- [通道路由](/zh-Hant/channels/channel-routing)
- [疑難排解](/zh-Hant/channels/troubleshooting)
- [設定](/zh-Hant/gateway/configuration)
- [斜線命令](/zh-Hant/tools/slash-commands)
