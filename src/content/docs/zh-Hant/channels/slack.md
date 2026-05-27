---
summary: "Slack 設定與執行時期行為（Socket Mode + HTTP Request URLs）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

透過 Slack 應用程式整合，在 DM 和頻道上具備生產就緒性。預設模式為 Socket Mode；也支援 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack 私訊預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="管道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨管道診斷與修復手冊。
  </Card>
</CardGroup>

## 選擇 Socket Mode 或 HTTP Request URLs

兩種傳輸方式皆已具備生產環境就緒狀態，並在訊息傳遞、斜線指令、App Home 與互動功能上達到功能對等。請依據部署形狀選擇，而非功能。

| 考量點              | Socket Mode（預設）                                                                                                     | HTTP Request URLs                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 公網閘道 URL        | 不需要                                                                                                                  | 需要（DNS、TLS、反向代理或通道）                                                   |
| 對外網路            | 必須能連線到 `wss-primary.slack.com` 的輸出 WSS                                                                         | 無對外 WS；僅接受對內 HTTPS                                                        |
| 所需權杖            | Bot 權杖 + 具有 `connections:write` 的 App-Level Token                                                                  | Bot 權杖 + Signing Secret                                                          |
| 開發筆電 / 防火牆後 | 可直接運作                                                                                                              | 需要公網通道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或暫存閘道               |
| 水平擴展            | 每個主機上的每個 App 一個 Socket Mode 連線階段；多個閘道需要分開的 Slack Apps                                           | 無狀態 POST 處理器；多個閘道副本可在負載平衡器後共用一個 App                       |
| 單一閘道上的多帳號  | 支援；每個帳號開啟自己的 WS                                                                                             | 支援；每個帳戶需要唯一的 `webhookPath`（預設為 `/slack/events`），以免註冊發生衝突 |
| 斜線指令傳輸        | 透過 WS 連線傳送；`slash_commands[].url` 會被忽略                                                                       | Slack POST 到 `slash_commands[].url`；此欄位是指派指令所必需的                     |
| 請求簽名            | 未使用（驗證是應用層級 Token）                                                                                          | Slack 會簽署每個請求；OpenClaw 會使用 `signingSecret` 進行驗證                     |
| 連線中斷後的恢復    | Slack SDK 自動重連已啟用；OpenClaw 也會以受限的退避策略重啟失敗的 Socket Mode 工作階段。Pong-timeout 傳輸調整適用於此。 | 沒有持久連線會中斷；重試由 Slack 端逐個請求進行                                    |

<Note>
  針對單一 Gateway 主機、開發筆記型電腦，以及可以從輸出端連線到 `*.slack.com` 但無法接受輸入 HTTPS 的內部部署網路，**請選擇 Socket Mode**。

當在負載平衡器後方執行多個 Gateway 副本、當輸出 WSS 受到封鎖但允許輸入 HTTPS，或是當您已經在反向 Proxy 端終止 Slack webhooks 時，**請選擇 HTTP Request URLs**。

</Note>

## 安裝

在設定頻道之前先安裝 Slack：

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` 會註冊並啟用此外掛。在您設定下方的 Slack 應用程式和管道設定之前，外掛仍然不會執行任何動作。如需一般外掛行為和安裝規則，請參閱 [Plugins](/zh-Hant/tools/plugin)。

## 快速設定

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create a new Slack app">
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選擇您的工作區 → 貼上下列其中一個資訊清單 → **Next** → **Create**。

        <CodeGroup>

```json Recommended
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

```json Minimal
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "groups:history", "groups:read", "im:history", "im:read", "im:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "message.channels", "message.groups", "message.im"]
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** 符合 Slack 外掛程式的完整功能：App Home、斜線指令、檔案、回應 reactions、釘選 pins、群組 DMs 以及 emoji/usergroup 讀取。當工作區政策限制範圍時，請選擇 **Minimal** — 它涵蓋 DMs、頻道/群組歷史記錄、提及以及斜線指令，但會移除檔案、回應 reactions、釘選 pins、群組-DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各個範圍的理由，以及額外斜線指令等附加選項。
        </Note>

        在 Slack 建立應用程式之後：

        - **Basic Information -> App-Level Tokens -> Generate Token and Scopes**：新增 `connections:write`，儲存，然後複製 App-Level Token。
        - **Install App -> Install to Workspace**：複製 Bot User OAuth Token。

      </Step>

      <Step title="Configure OpenClaw">

        建議的 SecretRef 設定：

```bash
export SLACK_APP_TOKEN=slack-app-token-example
export SLACK_BOT_TOKEN=slack-bot-token-example
cat > slack.socket.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./slack.socket.patch.json5 --dry-run
openclaw config patch --file ./slack.socket.patch.json5
```

        Env 後援 (僅限預設帳戶)：

```bash
SLACK_APP_TOKEN=slack-app-token-example
SLACK_BOT_TOKEN=slack-bot-token-example
```

      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="Create a new Slack app">
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選擇您的工作區 → 貼上下列其中一個 Manifest → 將 `https://gateway-host.example.com/slack/events` 替換為您的公開 Gateway URL → **Next** → **Create**。

        <CodeGroup>

```json Recommended
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

```json Minimal
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "groups:history", "groups:read", "im:history", "im:read", "im:write", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "message.channels", "message.groups", "message.im"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** 符合 Slack 外掛的完整功能集；**Minimal** 則針對權限較嚴格的工作區移除了檔案、回應 reactions、釘選 pins、群組 DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各個範圍的設定理由。
        </Note>

        <Info>
          這三個 URL 欄位 (`slash_commands[].url`、`event_subscriptions.request_url` 和 `interactivity.request_url` / `message_menu_options_url`) 都指向同一個 OpenClaw 端點。Slack 的 manifest 結構描述要求它們分別命名，但 OpenClaw 是根據 payload 類型進行路由，因此單一 `webhookPath` (預設為 `/slack/events`) 即足夠。在 HTTP 模式下，沒有 `slash_commands[].url` 的斜線指令將會靜默失效 (no-op)。
        </Info>

        在 Slack 建立應用程式之後：

        - **Basic Information → App Credentials**：複製 **Signing Secret** 以用於請求驗證。
        - **Install App -> Install to Workspace**：複製 Bot User OAuth Token。

      </Step>

      <Step title="Configure OpenClaw">

        建議的 SecretRef 設定：

```bash
export SLACK_BOT_TOKEN=slack-bot-token-example
export SLACK_SIGNING_SECRET=...
cat > slack.http.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      signingSecret: { source: "env", provider: "default", id: "SLACK_SIGNING_SECRET" },
      webhookPath: "/slack/events",
    },
  },
}
JSON5
openclaw config patch --file ./slack.http.patch.json5 --dry-run
openclaw config patch --file ./slack.http.patch.json5
```

        <Note>
        在多帳號 HTTP 模式下使用唯一的 Webhook 路徑

        給每個帳號一個不同的 `webhookPath` (預設為 `/slack/events`)，以免註冊時發生衝突。
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

## Socket Mode 傳輸調整

OpenClaw 預設將 Slack SDK 客戶端的 pong 逾時設定為 15 秒以用於 Socket Mode。僅在您需要針對特定工作區或主機進行調整時，才覆寫傳輸設定：

```json5
{
  channels: {
    slack: {
      mode: "socket",
      socketMode: {
        clientPingTimeout: 20000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
    },
  },
}
```

此選項僅適用於記錄 Slack websocket pong/server-ping 逾時或在已知會發生事件迴圈饑餓的主機上執行的 Socket Mode 工作區。`clientPingTimeout` 是 SDK 傳送 client ping 後的 pong 等待時間；`serverPingTimeout` 是等待 Slack server pings 的時間。應用程式訊息和事件維持應用程式狀態，而非傳輸存活訊號。

注意：

- `socketMode` 在 HTTP Request URL 模式下會被忽略。
- 基礎 `channels.slack.socketMode` 設定適用於所有 Slack 帳戶，除非被覆寫。各帳戶的覆寫使用 `channels.slack.accounts.<accountId>.socketMode`；因為這是物件覆寫，請包含您希望該帳戶使用的每個 socket 調整欄位。
- 只有 `clientPingTimeout` 具有 OpenClaw 預設值 (`15000`)。`serverPingTimeout` 和 `pingPongLoggingEnabled` 僅在設定時才會傳遞給 Slack SDK。
- Socket Mode 重新啟動的退避時間大約從 2 秒開始，上限約為 30 秒。連續的可復原 start/start-wait 失敗會在 12 次嘗試後停止；成功連線後，稍後的可復原中斷會開始新的重試週期。無法復原的 Slack 驗證錯誤（例如 `invalid_auth`、已撤銷的權杖或缺少權限）會快速失敗，而不是無限期重試。

## Manifest 和範圍檢查清單

基礎 Slack app manifest 對於 Socket Mode 和 HTTP Request URLs 是相同的。只有 `settings` 區塊（以及斜線指令 `url`）不同。

基礎 manifest (Socket Mode 預設)：

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

對於 **HTTP Request URLs 模式**，請將 `settings` 替換為 HTTP 變體，並將 `url` 新增至每個斜線指令。需要公開 URL：

```json
{
  "features": {
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

### 額外的 manifest 設定

展現擴充上述預設值的不同功能。

預設清單啟用 Slack App Home 的 **Home** 分頁並訂閱 `app_home_opened`。當工作區成員開啟 Home 分頁時，OpenClaw 會發佈一個包含 `views.publish` 的安全預設 Home 檢視；不包含任何對話有效負載或私人設定。**Messages** 分頁仍保持啟用狀態，以供 Slack DM 使用。此清單也啟用了具備 `features.assistant_view`、`assistant:write`、`assistant_thread_started` 和 `assistant_thread_context_changed` 的 Slack 助理執行緒；助理執行緒會路由至其專屬的 OpenClaw 執行緒會話，並讓 Slack 提供的執行緒脈絡可供代理程式使用。

<AccordionGroup>
  <Accordion title="選用原生斜線指令">

    您可以使用多個 [原生斜線指令](#commands-and-slash-behavior)，來取代單一具細微差別的已設定指令：

    - 使用 `/agentstatus` 而非 `/status`，因為 `/status` 指令是保留的。
    - 一次可提供的斜線指令不得超過 25 個。

    將您現有的 `features.slash_commands` 區段替換為 [可用指令](/zh-Hant/tools/slash-commands#command-list) 的子集：

    <Tabs>
      <Tab title="Socket Mode (預設)">

```json
{
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
      "command": "/approve",
      "description": "Approve or deny pending approval requests",
      "usage_hint": "<id> <decision>"
    },
    {
      "command": "/model",
      "description": "Show or set the model",
      "usage_hint": "[name|#|status]"
    },
    {
      "command": "/models",
      "description": "List providers/models",
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
      "command": "/side",
      "description": "Ask a side question without changing session context",
      "usage_hint": "<question>"
    },
    {
      "command": "/usage",
      "description": "Control the usage footer or show cost summary",
      "usage_hint": "off|tokens|full|cost"
    }
  ]
}
```

      </Tab>
      <Tab title="HTTP Request URLs">
        使用與上述 Socket Mode 相同的 `slash_commands` 清單，並為每個項目新增 `"url": "https://gateway-host.example.com/slack/events"`。範例：

```json
{
  "slash_commands": [
    {
      "command": "/new",
      "description": "Start a new session",
      "usage_hint": "[model]",
      "url": "https://gateway-host.example.com/slack/events"
    },
    {
      "command": "/help",
      "description": "Show the short help summary",
      "url": "https://gateway-host.example.com/slack/events"
    }
  ]
}
```

        請在清單中的每個指令上重複該 `url` 值。

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="選用作著身分範圍 (寫入作業)">
    如果您希望傳出訊息使用啟用的代理程式身分 (自訂使用者名稱和圖示) 而非預設的 Slack 應用程式身分，請新增 `chat:write.customize` bot 範圍。

    如果您使用 emoji 圖示，Slack 會預期 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="Optional user-token scopes (read operations)">
    如果您設定 `channels.slack.userToken`，典型的讀取範圍為：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (如果您依賴 Slack 搜尋讀取)

  </Accordion>
</AccordionGroup>

## Token 模型

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字
  字串或 SecretRef 物件。
- Config tokens 會覆寫 env fallback。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數後備僅適用於預設帳戶。
- `userToken` 僅限設定 (無環境變數後備)，且預設為唯讀行為 (`userTokenReadOnly: true`)。

狀態快照行為：

- Slack 帳戶檢查會追蹤每個憑證的 `*Source` 和 `*Status`
  欄位 (`botToken`、`appToken`、`signingSecret`、`userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳戶是透過 SecretRef
  或其他非內嵌秘密來源設定，但目前指令/執行階段路徑
  無法解析實際值。
- 在 HTTP 模式中，包含 `signingSecretStatus`；在 Socket Mode 中，
  必需的配對是 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，設定後可以優先使用使用者 token。對於寫入，bot token 仍為優先；僅當 `userTokenReadOnly: false` 且無法使用 bot token 時，才允許使用使用者 token 進行寫入。</Tip>

## 動作與閘門

Slack 動作由 `channels.slack.actions.*` 控制。

目前 Slack 工具中可用的動作群組：

| 群組       | 預設   |
| ---------- | ------ |
| 訊息       | 已啟用 |
| reactions  | 已啟用 |
| pins       | 已啟用 |
| memberInfo | 已啟用 |
| emojiList  | 已啟用 |

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受傳入檔案預留位置中顯示的 Slack 檔案 ID，並傳回圖片的預覽，或其他檔案類型的本機檔案中繼資料。

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.slack.dmPolicy` 控制 DM 存取。`channels.slack.allowFrom` 是正式的 DM 允許清單。

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `channels.slack.allowFrom` 包含 `"*"`)
    - `disabled`

    DM 旗標：

    - `dm.enabled` (預設為 true)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (舊版)
    - `dm.groupEnabled` (群組 DM 預設為 false)
    - `dm.groupChannels` (選用的 MPIM 允許清單)

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅套用至 `default` 帳號。
    - 具名帳號會在未設定自己的 `allowFrom` 時繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    舊版 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom` 仍為了相容性而讀取。`openclaw doctor --fix` 會在不變更存取權的情況下將其遷移至 `dmPolicy` 和 `allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理方式：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 下方，且**必須使用穩定的 Slack 頻道 ID**（例如 `C12345678`）作為配置鍵值。

    執行時期注意事項：如果 `channels.slack` 完全缺失（僅使用環境變數設定），執行時期將回退至 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 存取權限允許時，頻道允許清單項目與 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設定值，但預設會在路由時被忽略
    - 傳入授權與頻道路由預設優先使用 ID；直接的使用者名稱/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基於名稱的鍵值（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**無法**匹配。頻道查詢預設優先使用 ID，因此基於名稱的鍵值將永遠無法成功路由，且該頻道內的所有訊息都會被無聲封鎖。這與 `groupPolicy: "open"` 不同，後者不需要頻道鍵值即可進行路由，且基於名稱的鍵值看似可以運作。

    始終使用 Slack 頻道 ID 作為鍵值。尋找方法：在 Slack 中對頻道按右鍵 → **Copy link**（複製連結） — ID（`C...`）會顯示在 URL 結尾。

    正確：

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            C12345678: { allow: true, requireMention: true },
          },
        },
      },
    }
    ```

    錯誤（在 `groupPolicy: "allowlist"` 下會被無聲封鎖）：

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            "#eng-my-channel": { allow: true, requireMention: true },
          },
        },
      },
    }
    ```
    </Warning>

  </Tab>

  <Tab title="提及與頻道使用者">
    頻道訊息預設會受到提及限制。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - Slack 使用者群組提及 (`<!subteam^S...>`)，當機器人使用者是該使用者群組的成員時；需要 `usergroups:read`
    - 提及正規表示式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為 (當 `thread.requireExplicitMention` 為 `true` 時停用)

    各頻道控制項 (`channels.slack.channels.<id>`；名稱僅透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`、`toolsBySender`
    - `toolsBySender` 金鑰格式：`channel:`、`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

    `allowBots` 對頻道和私人頻道採取保守策略：只有在傳送機器人明確列於該房間的 `users` 允許清單中，或當 `channels.slack.allowFrom` 中至少有一個明確的 Slack 擁有者 ID 目前是房間成員時，才會接受機器人建立的房間訊息。萬用字元和顯示名稱擁有者項目不符合擁有者在場的條件。擁有者存在性使用 Slack `conversations.members`；請確保應用程式具備該房間類型的相符讀取權限 (公開頻道為 `channels:read`，私人頻道為 `groups:read`)。如果成員查詢失敗，OpenClaw 將捨棄該機器人建立的房間訊息。

    已接受的機器人建立 Slack 訊息會使用共用的 [機器人迴圈保護](/zh-Hant/channels/bot-loop-protection)。請設定 `channels.defaults.botLoopProtection` 作為預設預算，然後當工作區或頻道需要不同限制時，使用 `channels.slack.botLoopProtection` 或 `channels.slack.channels.<id>.botLoopProtection` 覆寫。

  </Tab>
</Tabs>

## 串接、會話和回覆標籤

- DMs 路由為 `direct`；頻道路由為 `channel`；MPIMs 路由為 `group`。
- Slack 路由綁定接受原始對等 ID 以及 Slack 目標格式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用預設的 `session.dmScope=main` 時，Slack DMs 會合併至代理的主會話。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 一般的頂層頻道訊息會保留在各頻道的會話中，即使當 `replyToMode` 為非 `off` 時。
- Slack 執行緒回覆會使用父級 Slack `thread_ts` 作為會話後綴（`:thread:<threadTs>`），即使當出站回覆執行緒功能已透過 `replyToMode="off"` 停用時。
- 當預期的頂層頻道根訊息將啟動可見的 Slack 執行緒時，OpenClaw 會將其植入 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`，使該根訊息與後續的執行緒回覆共用一個 OpenClaw 會話。這適用於 `app_mention` 事件、明確的 bot 或已配置的提及模式匹配，以及具有非 `off` `replyToMode` 的 `requireMention: false` 頻道。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新執行緒會話開始時擷取多少現有的執行緒訊息（預設 `20`；設定為 `0` 以停用）。
- `channels.slack.thread.requireExplicitMention`（預設 `false`）：當設為 `true` 時，隱含隱含的執行緒提及，使 bot 僅回應執行緒內明確的 `@bot` 提及，即使 bot 已參與該執行緒。若無此設定，bot 已參與執行緒中的回覆將繞過 `requireMention` 閘道控制。

回覆串接控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（預設 `off`）
- `channels.slack.replyToModeByChatType`：每個 `direct|group|channel`
- 直接聊天 的舊版回退：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

若要從 `message` 工具發出明確的 Slack 執行緒回覆，請在 `replyBroadcast: true` 中設定 `action: "send"` 和 `threadId` 或 `replyTo`，以要求 Slack 一併將執行緒回覆廣播到父頻道。這對應至 Slack 的 `chat.postMessage` `reply_broadcast` 標記，且僅支援文字或 Block Kit 傳送，不支援媒體上傳。

當 `message` 工具呼叫在 Slack 執行緒內執行並目標指向同一個頻道時，OpenClaw 通常會根據 `replyToMode` 繼承目前的 Slack 執行緒。請在 `action: "send"` 或 `action: "upload-file"` 上設定 `topLevel: true` 以改為強制發送新的父頻道訊息。`threadId: null` 被接受為同樣的頂層選擇退出。

<Note>
`replyToMode="off"` 會停用傳出 Slack 回覆執行緒功能，包括明確的 `[[reply_to_*]]` 標籤。它不會扁平化傳入 Slack 執行緒工作階段：已經張貼在 Slack 執行緒內的訊息仍會路由到 `:thread:<threadTs>` 工作階段。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。Slack 執行緒會將訊息從頻道中隱藏，而 Telegram 回覆則會保持行內可見。
</Note>

## Ack 反應

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會發送確認表情符號。`ackReactionScope` 決定實際發送該表情符號的「時間」。

### 表情符號 (`ackReaction`)

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號回退 (`agents.list[].identity.emoji`，否則為 `"eyes"` / 👀)

備註：

- Slack 預期使用簡碼 (例如 `"eyes"`)。
- 使用 `""` 針對 Slack 帳號或全域停用回應反應。

### 範圍 (`messages.ackReactionScope`)

Slack 提供者從 `messages.ackReactionScope` 讀取範圍 (預設為 `"group-mentions"`)。目前沒有 Slack 帳號或 Slack 頻道層級的覆寫設定；該值對閘道是全域的。

數值：

- `"all"`：在私人訊息 (DM) 和群組中回應。
- `"direct"`：僅在私人訊息中回應。
- `"group-all"`：對每則群組訊息回應 (無私人訊息)。
- `"group-mentions"` (預設)：在群組中回應，但僅在機器人被提及時 (或是在選擇加入的群組提及對象中)。**私人訊息被排除。**
- `"off"` / `"none"`：從不回應。

<Note>預設範圍 (`"group-mentions"`) 不會在私人訊息中觸發 ack 反應。若要在傳入的 Slack 私人訊息中看到設定的 `ackReaction` (例如 `"eyes"`)，請將 `messages.ackReactionScope` 設定為 `"direct"` 或 `"all"`。`messages.ackReactionScope` 是在 Slack 提供者啟動時讀取的，因此需要重新啟動閘道才能讓變更生效。</Note>

```json5
{
  messages: {
    ackReaction: "eyes",
    ackReactionScope: "all", // react in DMs and groups
  },
}
```

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：以最新的部分輸出取代預覽文字。
- `block`：附加區塊化的預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後發送最終文字。
- `streaming.preview.toolProgress`：當草稿預覽啟用時，將工具/進度更新路由至同一個編輯過的預覽訊息 (預設：`true`)。設定 `false` 以保持分開的工具/進度訊息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：設為 `status` 以在隱藏原始指令/執行文字的同時保持精簡的工具進度列 (預設：`raw`)。

隱藏原始指令/執行文字，同時保持精簡的進度列：

```json
{
  "channels": {
    "slack": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

當 `channels.slack.streaming.mode` 為 `partial` 時（預設值：`true`），`channels.slack.streaming.nativeTransport` 控制 Slack 原生文字串流。

- 必須有回覆串流才能使用原生文字串流並顯示 Slack 助理串流狀態。串流選取仍遵循 `replyToMode`。
- 當無法使用原生串流或不存在回覆串流時，頻道、群組聊天和頂層私訊根目錄仍可使用正常的草稿預覽。
- 頂層 Slack 私訊預設保持離開串流，因此它們不會顯示 Slack 的串流式原生串流/狀態預覽；相反，OpenClaw 會在私訊中發布並編輯草稿預覽。
- 媒體和非文字酬載會回退為正常傳遞。
- 媒體/錯誤最終結果會取消待處理的預覽編輯；符合條件的文字/區塊最終結果僅在能就地編輯預覽時才會排清。
- 如果串流在回覆中途失敗，OpenClaw 會將剩餘酬載回退為正常傳遞。

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

- `channels.slack.streamMode` (`replace | status_final | append`) 是 `channels.slack.streaming.mode` 的舊版執行時期別名。
- 布林值 `channels.slack.streaming` 是 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport` 的舊版執行時期別名。
- 舊版 `channels.slack.nativeStreaming` 是 `channels.slack.streaming.nativeTransport` 的執行時期別名。
- 執行 `openclaw doctor --fix` 將持久的 Slack 串流設定重寫為標準金鑰。

## 輸入反應回退

當 OpenClaw 正在處理回覆時，`typingReaction` 會對傳入的 Slack 訊息新增暫時性反應，然後在執行完成時將其移除。這在串流回覆之外最有用，串流回覆會使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期使用短代碼（例如 `"hourglass_flowing_sand"`）。
- 反應是盡力而為的，並會在回覆或失敗路徑完成後自動嘗試清理。

## 媒體、分塊和傳遞

<AccordionGroup>
  <Accordion title="傳入附件">
    Slack 檔案附件是從 Slack 託管的私人 URL（經過權杖驗證的要求流程）下載的，並在擷取成功且大小限制允許時寫入媒體存放區。檔案預留位置包含 Slack `fileId`，以便代理程式可以使用 `download-file` 擷取原始檔案。

    下載使用有限的閒置和總計逾時時間。如果 Slack 檔案擷取停滯或失敗，OpenClaw 會繼續處理訊息並退回到檔案預留位置。

    執行時期傳入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

  <Accordion title="傳出文字和檔案">
    - 文字區塊使用 `channels.slack.textChunkLimit`（預設為 4000）
    - `channels.slack.chunkMode="newline"` 啟用段落優先分割
    - 檔案傳送使用 Slack 上傳 API，並可包含執行緒回覆（`thread_ts`）
    - 傳出媒體上限在設定時遵循 `channels.slack.mediaMaxMb`；否則，頻道傳送會使用媒體管線中的 MIME 類型預設值

  </Accordion>

  <Accordion title="傳遞目標">
    首選的明確目標：

    - `user:<id>` 用於 DM
    - `channel:<id>` 用於頻道

    僅包含文字/區塊的 Slack DM 可以直接發佈到使用者 ID；檔案上傳和執行緒傳送會先透過 Slack 對話 API 開啟 DM，因為這些路徑需要具體的對話 ID。

  </Accordion>
</AccordionGroup>

## 指令和斜線行為

在 Slack 中，斜線指令會顯示為單一設定指令或多個原生指令。設定 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要在您的 Slack 應用程式中進行[額外的 manifest 設定](#additional-manifest-settings)，並改為在全域設定中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 啟用。

- Slack 的原生指令自動模式為「**關閉**」，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生參數選單使用自適應呈現策略，在發送所選的選項值之前會顯示確認對話框：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選擇選單
- 超過 100 個選項：當提供互動選項處理程式時，使用外部選擇搭配非同步選項篩選
- 超過 Slack 限制：編碼的選項值會降級為按鈕

```txt
/think
```

Slash 會話使用類似 `agent:<agentId>:slack:slash:<userId>` 的隔離鍵，並且仍然使用 `CommandTargetSessionKey` 將指令執行路由到目標對話會話。

## 互動式回覆

Slack 可以呈現 Agent 撰寫的互動式回覆控制項，但此功能預設為停用。
對於新的 Agent、CLI 和外掛輸出，建議優先使用共用的
`presentation` 按鈕或選擇區塊。它們使用相同的 Slack 互動
路徑，同時也能在其他頻道上降級運作。

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

或僅針對單一 Slack 帳號啟用：

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

啟用後，Agent 仍然可以發出已淘汰的僅限 Slack 回覆指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

這些指令會編譯成 Slack Block Kit，並將點擊或選擇
透過現有的 Slack 互動事件路徑路由回來。將它們保留給舊的
提示詞和 Slack 特定的應急方法；對於新的
可攜式控制項，請使用共用的呈現方式。

對於新的生產者程式碼，指令編譯器 API 也已淘汰：

- `compileSlackInteractiveReplies(...)`
- `parseSlackOptionsLine(...)`
- `isSlackInteractiveRepliesEnabled(...)`
- `buildSlackInteractiveBlocks(...)`

對於新的
Slack 呈現控制項，請使用 `presentation` 載荷和 `buildSlackPresentationBlocks(...)`。

備註：

- 這是 Slack 特有的舊版 UI。其他頻道不會將 Slack Block
  Kit 指令轉換為其自己的按鈕系統。
- 互動式回調值是 OpenClaw 產生的不透明權杖，而非原始的 Agent 撰寫值。
- 如果產生的互動區塊會超過 Slack Block Kit 限制，OpenClaw 會降級為原始的文字回覆，而不是發送無效的區塊載荷。

### 外掛擁有的模態提交

註冊了互動處理程式的 Slack 外掛程式也可以在 OpenClaw 為代理程式可見的系統事件壓縮負載之前，接收 modal `view_submission` 和 `view_closed` 生命週期事件。開啟 Slack modal 時，請使用下列其中一種路由模式：

- 將 `callback_id` 設定為 `openclaw:<namespace>:<payload>`。
- 或者保留現有的 `callback_id`，並將 `pluginInteractiveData:
"<namespace>:<payload>"` in the modal `private_metadata`。

處理程式會接收 `ctx.interaction.kind` 為 `view_submission` 或 `view_closed`、正規化的 `inputs`，以及來自 Slack 的完整原始 `stateValues` 物件。僅使用 Callback-id 路由即可叫用外掛程式處理程式；當 modal 也應產生代理程式可見的系統事件時，請包含現有的 modal `private_metadata` 使用者/會話路由欄位。代理程式會收到一個精簡、經過編輯的 `Slack interaction: ...` 系統事件。如果處理程式回傳 `systemEvent.summary`、`systemEvent.reference` 或 `systemEvent.data`，這些欄位會包含在該精簡事件中，讓代理程式可以在不查看完整表單負載的情況下參考外掛程式擁有的儲存空間。

## Slack 中的原生審核

Slack 可以透過互動式按鈕和互動充當原生審核用戶端，而不是退回到 Web UI 或終端機。

- Exec 和外掛程式審核可以呈現為 Slack 原生 Block Kit 提示。
- `channels.slack.execApprovals.*` 仍然是原生 exec 審核用戶端啟用和 DM/通道路由設定。
- Exec 審核 DM 使用 `channels.slack.execApprovals.approvers` 或 `commands.ownerAllowFrom`。
- 當 Slack 針對原始會話啟用為原生審核用戶端，或當 `approvals.plugin` 路由至原始 Slack 會話或 Slack 目標時，外掛程式審核會使用 Slack 原生按鈕。
- 外掛程式審核 DM 使用來自 `channels.slack.allowFrom` 的 Slack 外掛程式審核者、具名帳戶 `allowFrom`，或帳戶預設路由。
- 仍然會執行審核者授權：僅限執行的審核者無法核准外掛程式請求，除非他們同時也是外掛程式審核者。

這與其他管道使用相同的共用核准按鈕介面。當您在 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中以 Block Kit 按鈕呈現。
當這些按鈕出現時，它們是主要的核准 UX；當工具結果顯示聊天核准無法使用或手動核准是唯一途徑時，OpenClaw
應僅包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (選用；盡可能回退至 `commands.ownerAllowFrom`)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
- `agentFilter`、`sessionFilter`

當 `enabled` 未設定或為 `"auto"` 且至少有一個
執行審核者解析時，Slack 會自動啟用原生執行核准。當 Slack 外掛程式審核者解析且請求符合原生客戶端篩選器時，Slack 也可以透過此原生客戶端路徑處理原生外掛程式核准。設定
`enabled: false` 可明確停用 Slack 作為原生核准客戶端。設定 `enabled: true` 可
在審核者解析時強制開啟原生核准。停用 Slack 執行核准不會停用
透過 `approvals.plugin` 啟用的原生 Slack 外掛程式核准傳遞；外掛程式核准
傳遞改用 Slack 外掛程式審核者。

沒有明確 Slack 執行核准設定的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有當您想要覆寫審核者、新增篩選器，或
選擇啟用原始聊天傳遞時，才需要明確的 Slack 原生設定：

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

共用的 `approvals.exec` 轉發是分開的。僅當執行核准提示也必須
路由至其他聊天或明確的頻外目標時才使用它。共用的 `approvals.plugin` 轉發也是
分開的；只有當 Slack 可以原生處理外掛程式
核准請求時，Slack 原生傳遞才會抑制該回退。

相同聊天室的 `/approve` 也適用於已支援指令的 Slack 頻道和 DM。請參閱 [執行核准] (/en/tools/exec-approvals) 以了解完整的核准轉送模型。

## 事件與操作行為

- 訊息編輯/刪除會被對應至系統事件。
- 串迴廣播（「也傳送到頻道」的串迴回覆）會被作為一般使用者訊息處理。
- 表情符號新增/移除事件會被對應至系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會被對應至系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道配置金鑰。
- 頻道主題/用途中繼資料被視為不受信任的上下文，並可被注入至路由上下文中。
- 串迴發起者和初始串迴歷史上下文植入會在適用時透過設定的發送者允許清單進行篩選。
- 區塊操作與模態互動會發出包含豐富 Payload 欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊操作：選定的值、標籤、選擇器值，以及 `workflow_*` 中繼資料
  - 模態 `view_submission` 與 `view_closed` 事件，帶有路由頻道中繼資料與表單輸入

## 組態參考

主要參考資料：[組態參考 - Slack] (/en/gateway/config-channels#slack)。

<Accordion title="高重要性 Slack 欄位">

- 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
- DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom` (舊版：`dm.policy`、`dm.allowFrom`)、`dm.groupEnabled`、`dm.groupChannels`
- 相容性切換：`dangerouslyAllowNameMatching` (緊急使用；除非必要，否則請保持關閉)
- 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
- 執行緒/歷史記錄：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
- 取消展開：`unfurlLinks` (預設：`false`)、`unfurlMedia` 用於 `chat.postMessage` 連結/媒體預覽控制；設定 `unfurlLinks: true` 以重新啟用連結預覽
- 操作/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

</Accordion>

## 疑難排解

<AccordionGroup>
  <Accordion title="No replies in channels">
    請依序檢查：

    - `groupPolicy`
    - 頻道允許清單 (`channels.slack.channels`) — **金鑰必須是頻道 ID** (`C12345678`)，而不是名稱 (`#channel-name`)。在 `groupPolicy: "allowlist"` 下，基於名稱的金鑰會靜默失敗，因為頻道路由預設優先使用 ID。若要尋找 ID：在 Slack 中對頻道按右鍵 → **複製連結** — URL 結尾的 `C...` 值就是頻道 ID。
    - `requireMention`
    - 各頻道的 `users` 允許清單
    - `messages.groupChat.visibleReplies`：一般的群組/頻道請求預設為 `"automatic"`。如果您選擇了 `"message_tool"` 且日誌顯示有助手文字但沒有 `message(action=send)` 呼叫，表示模型錯過了可見訊息工具路徑。在此模式下，最終文字會保持私密；請檢查 gateway 的詳細日誌以查看被隱藏的 payload 中繼資料，或者如果您希望每個一般助手的最終回覆都透過舊版路徑發佈，請將其設為 `"automatic"`。
    - `messages.groupChat.unmentionedInbound`：如果為 `"room_event"`，未提及的允許頻道閒聊將會是環境語境並保持靜默，除非代理程式呼叫 `message` 工具。請參閱 [環境房間事件](/zh-Hant/channels/ambient-room-events)。

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

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
    - 配對核准 / 允許清單項目 (`dmPolicy: "open"` 仍需要 `channels.slack.allowFrom: ["*"]`)
    - 群組 DM 使用 MPIM 處理；啟用 `channels.slack.dm.groupEnabled`，並且如果已設定，請將 MPIM 包含在 `channels.slack.dm.groupChannels` 中
    - Slack Assistant DM 事件：提及 `drop message_changed` 的詳細記錄
      通常表示 Slack 發送了一個已編輯的 Assistant-thread 事件，但在訊息元資料中沒有
      可復原的人類發送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    驗證 Slack 應用程式設定中的 bot + app 權杖及 Socket Mode 是否已啟用。
    應用程式層級權杖 需要 `connections:write`，且 Bot 使用者 OAuth 權杖
    bot 權杖必須屬於與應用程式權杖相同的 Slack 應用程式/工作區。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳號
    已設定，但目前的執行時期無法解析 SecretRef 支援的
    值。

    諸如 `slack socket mode failed to start; retry ...` 的記錄屬於可復原的
    啟動失敗。缺少範圍、撤銷的權杖和無效的身份驗證則會快速失敗。
    `slack token mismatch ...` 記錄表示 bot 權杖和應用程式權杖
    似乎屬於不同的 Slack 應用程式；請修正 Slack 應用程式憑證。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - 簽署金鑰 (signing secret)
    - webhook 路徑
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`
    - 公開 URL 終止 TLS 並將請求轉發至 Gateway 路徑
    - Slack 應用程式 `request_url` 路徑完全符合 `channels.slack.webhookPath` (預設為 `/slack/events`)

    如果帳戶快照中出現 `signingSecretStatus: "configured_unavailable"`，表示 HTTP 帳戶已設定，但目前的執行階段無法解析 SecretRef 支援的簽署金鑰。

    重複出現 `slack: webhook path ... already registered` 日誌表示兩個 HTTP 帳戶正在使用相同的 `webhookPath`；請為每個帳戶指定不同的路徑。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    驗證您是否打算：

    - 使用原生指令模式 (`channels.slack.commands.native: true`)，並在 Slack 中註冊了相符的斜線指令
    - 或是使用單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    Slack 不會自動建立或移除斜線指令。`commands.native: "auto"` 並不會啟用 Slack 原生指令；請使用 `true` 並在 Slack 應用程式中建立相符的指令。在 HTTP 模式下，每個 Slack 斜線指令都必須包含 Gateway URL。在 Socket 模式下，指令載荷透過 websocket 抵達，且 Slack 會忽略 `slash_commands[].url`。

    此外，請檢查 `commands.useAccessGroups`、DM 授權、頻道允許清單，以及各頻道的 `users` 允許清單。對於遭封鎖的斜線指令發送者，Slack 會傳回暫時性錯誤，包括：

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>

## 附件視覺參考

當 Slack 檔案下載成功且大小限制允許時，Slack 可以將下載的媒體附加至 Agent 的輪次。影像檔案可以傳遞至媒體理解路徑或直接傳遞至具備視覺能力的回覆模型；其他檔案則會作為可下載的檔案內容保留，而不會被視為影像輸入。

### 支援的媒體類型

| 媒體類型                     | 來源            | 目前行為                                                           | 備註                                                    |
| ---------------------------- | --------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| JPEG / PNG / GIF / WebP 影像 | Slack 檔案 URL  | 已下載並附加至輪次以進行視覺處理                                   | 單一檔案上限：`channels.slack.mediaMaxMb`（預設 20 MB） |
| PDF 檔案                     | Slack 檔案 URL  | 已下載並公開為檔案內容，供諸如 `download-file` 或 `pdf` 等工具使用 | Slack 傳入不會自動將 PDF 轉換為圖像視覺輸入             |
| 其他檔案                     | Slack 檔案 URL  | 盡可能下載並公開為檔案內容                                         | 二進位檔案不視為圖像輸入                                |
| 串回覆                       | 串起始訊息檔案  | 當回覆沒有直接媒體時，根訊息檔案可以補充為內容                     | 僅含檔案的起始訊息會使用附加檔案預留位置                |
| 多圖像訊息                   | 多個 Slack 檔案 | 每個檔案都會被獨立評估                                             | Slack 處理限制為每則訊息八個檔案                        |

### 傳入管線

當帶有檔案附件的 Slack 訊息到達時：

1. OpenClaw 會使用 Bot 權杖從 Slack 的私人 URL 下載檔案。
2. 成功後，檔案會被寫入媒體存放區。
3. 下載的媒體路徑和內容類型會被加入到傳入內容中。
4. 支援圖像的模型/工具路徑可以使用該內容中的圖像附件。
5. 非圖像檔案仍可作為檔案中繼資料或媒體參照，供能處理它們的工具使用。

### 串根附件繼承

當訊息到達串中（具有 `thread_ts` 父項）時：

- 如果回覆本身沒有直接媒體，且包含的根訊息有檔案，Slack 可以將根檔案補充為串起始訊息內容。
- 直接回覆附件優先於根訊息附件。
- 僅包含檔案而沒有文字的根訊息會以附件預留位置表示，以便備用方案仍能包含其檔案。

### 多重附件處理

當單一 Slack 訊息包含多個檔案附件時：

- 每個附件會透過媒體管線獨立處理。
- 下載的媒體參照會聚合到訊息內容中。
- 處理順序遵循事件承載中 Slack 的檔案順序。
- 單一附件下載失敗不會阻斷其他附件。

### 大小、下載與模型限制

- **大小上限**：預設每個檔案 20 MB。可透過 `channels.slack.mediaMaxMb` 設定。
- **下載失敗**：Slack 無法提供、過期的 URL、無法存取的檔案、過大的檔案，以及 Slack 驗證/登入 HTML 回應都會被跳過，而不會回報為不支援的格式。
- **視覺模型**：圖片分析使用支援視覺功能的啟用回覆模型，或是在 `agents.defaults.imageModel` 中設定的圖片模型。

### 已知限制

| 情境                           | 目前行為                                          | 變通方法                                                              |
| ------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------- |
| Slack 檔案 URL 已過期          | 檔案已跳過；未顯示錯誤                            | 在 Slack 中重新上傳檔案                                               |
| 未設定視覺模型                 | 圖片附件已儲存為媒體參照，但未以圖片形式進行分析  | 設定 `agents.defaults.imageModel` 或使用具備視覺功能的回覆模型        |
| 非常大的圖片（預設大於 20 MB） | 因大小上限而跳過                                  | 如果 Slack 允許，請增加 `channels.slack.mediaMaxMb`                   |
| 轉發/共用的附件                | 文字和 Slack 託管的圖片/檔案媒體為盡力而為        | 直接在 OpenClaw 執行緒中重新分享                                      |
| PDF 附件                       | 儲存為檔案/媒體上下文，未自動透過圖片視覺進行路由 | 使用 `download-file` 取得檔案中繼資料，或使用 `pdf` 工具進行 PDF 分析 |

### 相關文件

- [媒體理解管道](/zh-Hant/nodes/media-understanding)
- [PDF 工具](/zh-Hant/tools/pdf)
- Epic：[#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件視覺功能啟用
- 迴歸測試：[#51353](https://github.com/openclaw/openclaw/issues/51353)
- 即時驗證：[#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Slack 使用者配對到閘道。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    頻道和群組 DM 行為。
  </Card>
  <Card title="頻道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理程式。
  </Card>
  <Card title="Security" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與強化防護。
  </Card>
  <Card title="Configuration" icon="sliders" href="/zh-Hant/gateway/configuration">
    配置佈局與優先順序。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/zh-Hant/tools/slash-commands">
    指令目錄與行為。
  </Card>
</CardGroup>
