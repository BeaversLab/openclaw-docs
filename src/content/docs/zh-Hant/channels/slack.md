---
summary: "Slack 設定與執行時行為 (Socket Mode + HTTP Request URLs)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

透過 Slack 應用程式整合，在 DM 和頻道上具備生產就緒性。預設模式為 Socket Mode；也支援 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack DM 預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為與指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
</CardGroup>

## 選擇 Socket Mode 或 HTTP Request URLs

兩種傳輸方式皆已具備生產環境就緒狀態，並在訊息傳遞、斜線指令、App Home 與互動功能上達到功能對等。請依據部署形狀選擇，而非功能。

| 考量點              | Socket Mode（預設）                                                                                                     | HTTP Request URLs                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 公網閘道 URL        | 不需要                                                                                                                  | 需要（DNS、TLS、反向代理或通道）                                              |
| 對外網路            | 到 `wss-primary.slack.com` 的連出 WSS 必須可連線                                                                        | 無對外 WS；僅接受對內 HTTPS                                                   |
| 所需權杖            | Bot 權杖 + 具有 `connections:write` 的應用程式層級權杖                                                                  | Bot 權杖 + Signing Secret                                                     |
| 開發筆電 / 防火牆後 | 可直接運作                                                                                                              | 需要公網通道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或暫存閘道          |
| 水平擴展            | 每個主機上的每個 App 一個 Socket Mode 連線階段；多個閘道需要分開的 Slack Apps                                           | 無狀態 POST 處理器；多個閘道副本可在負載平衡器後共用一個 App                  |
| 單一閘道上的多帳號  | 支援；每個帳號開啟自己的 WS                                                                                             | 支援；每個帳戶需要唯一的 `webhookPath` (預設為 `/slack/events`)，以免註冊衝突 |
| 斜線指令傳輸        | 透過 WS 連線傳遞；`slash_commands[].url` 會被忽略                                                                       | Slack 會 POST 到 `slash_commands[].url`；此欄位為指令發派所必需               |
| 請求簽名            | 未使用（驗證是應用層級 Token）                                                                                          | Slack 會簽署每個請求；OpenClaw 會使用 `signingSecret` 進行驗證                |
| 連線中斷後的恢復    | Slack SDK 自動重連已啟用；OpenClaw 也會以受限的退避策略重啟失敗的 Socket Mode 工作階段。Pong-timeout 傳輸調整適用於此。 | 沒有持久連線會中斷；重試由 Slack 端逐個請求進行                               |

<Note>
  **選擇 Socket Mode** 適用於單一 Gateway 主機、開發筆記型電腦，以及可連線至 `*.slack.com` 但無法接受連入 HTTPS 的內部部署網路。

**選擇 HTTP Request URLs** 適用於在負載平衡器後方執行多個 Gateway 副本、連出 WSS 遭到封鎖但允許連入 HTTPS，或您已在反向 Proxy 終止 Slack webhook 的情況。

</Note>

## 安裝

在設定頻道之前先安裝 Slack：

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` 會註冊並啟用外掛。在您設定下方的 Slack 應用程式與頻道設定之前，該外掛仍不會執行任何動作。請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解一般外掛行為與安裝規則。

## 快速設定

<Tabs>
  <Tab title="Socket Mode (預設)">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選取您的工作區 → 貼上以下任一 manifest → **Next** → **Create**。

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
          **Recommended** 符合 Slack 外掛的完整功能集：App Home、斜線指令、檔案、回應、釘選、群組 DM，以及表情符號/使用者群組讀取。當工作區政策限制權限範圍時，請選擇 **Minimal** — 它涵蓋 DM、頻道/群組紀錄、提及和斜線指令，但會捨棄檔案、回應、釘選、群組 DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各權限範圍的原理以及額外斜線指令等附加選項。
        </Note>

        在 Slack 建立應用程式後：

        - **Basic Information -> App-Level Tokens -> Generate Token and Scopes**：新增 `connections:write`，儲存，並複製 App-Level Token。
        - **Install App -> Install to Workspace**：複製 Bot User OAuth Token。

      </Step>

      <Step title="設定 OpenClaw">

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

      <Step title="啟動閘道">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="Create a new Slack app">
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選擇您的工作區 → 貼上以下其中一個 Manifest → 將 `https://gateway-host.example.com/slack/events` 替換為您的公開 Gateway URL → **Next** → **Create**。

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
          **Recommended**（推薦）符合 Slack 插件的完整功能集；**Minimal**（最小化）則針對受限制的工作區移除了檔案、反應、釘選、群組 DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各 Scope 的理由。
        </Note>

        <Info>
          這三個 URL 欄位（`slash_commands[].url`、`event_subscriptions.request_url` 和 `interactivity.request_url` / `message_menu_options_url`）都指向同一個 OpenClaw 端點。Slack 的 Manifest Schema 要求它們分開命名，但 OpenClaw 是根據 Payload 類型進行路由，因此單一 `webhookPath`（預設為 `/slack/events`）就足夠了。在 HTTP 模式下，沒有 `slash_commands[].url` 的斜線指令將會靜默失效。
        </Info>

        Slack 建立應用程式後：

        - **Basic Information → App Credentials**：複製 **Signing Secret** 以供請求驗證。
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
        為多帳號 HTTP 使用唯一的 Webhook 路徑

        為每個帳號指定不同的 `webhookPath`（預設為 `/slack/events`），以免註冊發生衝突。
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

僅對記錄 Slack websocket pong/server-ping 逾時或執行於已知事件循環飢餓主機的 Socket Mode 工作區使用此項。`clientPingTimeout` 是 SDK 發送 client ping 後的等待 pong 時間；`serverPingTimeout` 是等待 Slack server ping 的時間。應用程式訊息和事件仍屬應用程式狀態，而非傳輸活躍訊號。

注意：

- `socketMode` 在 HTTP Request URL 模式下會被忽略。
- 基礎 `channels.slack.socketMode` 設定適用於所有 Slack 帳戶，除非被覆寫。各帳戶的覆寫使用 `channels.slack.accounts.<accountId>.socketMode`；因為這是物件覆寫，請包含您希望該帳戶使用的每一個 socket 調校欄位。
- 只有 `clientPingTimeout` 具有 OpenClaw 預設值 (`15000`)。`serverPingTimeout` 和 `pingPongLoggingEnabled` 僅在設定時才會傳遞給 Slack SDK。
- Socket Mode 重啟退避從約 2 秒開始，上限約為 30 秒。連續可復原的 start/start-wait 失敗在 12 次嘗試後停止；在成功連線後，後續的可復原中斷會開始新的重試循環。不可復原的 Slack 驗證錯誤（例如 `invalid_auth`、已撤銷的 token 或缺少權限）會快速失敗，而不是無限期重試。

## Manifest 和範圍檢查清單

基礎 Slack app manifest 對於 Socket Mode 和 HTTP Request URLs 是相同的。只有 `settings` 區塊（以及 slash command 的 `url`）不同。

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

對於 **HTTP Request URLs 模式**，請將 `settings` 替換為 HTTP 變體，並將 `url` 新增至每個 slash command。需要公開 URL：

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

預設資訊清單會啟用 Slack App Home 的 **Home** 分頁並訂閱 `app_home_opened`。當工作區成員開啟 Home 分頁時，OpenClaw 會發佈一個安全的預設 Home 檢視，其中包含 `views.publish`；不包含任何對話承載或私人設定。**Messages** 分頁保持啟用狀態以供 Slack DM 使用。該資訊清單也會啟用 Slack 助手執行緒，使用 `features.assistant_view`、`assistant:write`、`assistant_thread_started` 和 `assistant_thread_context_changed`；助手執行緒會路由至其自己的 OpenClaw 執行緒階段，並讓 Slack 提供的執行緒語境可供代理程式使用。

<AccordionGroup>
  <Accordion title="可選的原生斜線指令">

    可以使用多個 [原生斜線指令](#commands-and-slash-behavior) 來代替單一配置的有細微差別的指令：

    - 使用 `/agentstatus` 而非 `/status`，因為 `/status` 指令是被保留的。
    - 一次可使用的斜線指令不得超過 25 個。

    將您現有的 `features.slash_commands` 部分替換為 [可用指令](/zh-Hant/tools/slash-commands#command-list) 的子集：

    <Tabs>
      <Tab title="Socket 模式（預設）">

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
      <Tab title="HTTP 請求 URLs">
        使用與上述 Socket 模式相同的 `slash_commands` 列表，並在每個條目中新增 `"url": "https://gateway-host.example.com/slack/events"`。範例：

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

        在列表中的每個指令上重複該 `url` 值。

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="可選的作者權限範圍（寫入操作）">
    如果您希望傳出訊息使用使用中的代理程式身分（自訂使用者名稱和圖示）而不是預設的 Slack 應用程式身分，請新增 `chat:write.customize` bot 範圍。

    如果您使用 emoji 圖示，Slack 會預期使用 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="選用性的使用者 token 範圍（讀取操作）">
    如果您設定 `channels.slack.userToken`，典型的讀取範圍為：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果您依賴 Slack 搜尋讀取）

  </Accordion>
</AccordionGroup>

## Token 模型

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字
  字串或 SecretRef 物件。
- Config tokens 會覆寫 env fallback。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 環境變數後備僅適用於預設帳戶。
- `userToken` 僅限於設定（無環境變數後備），且預設為唯讀行為（`userTokenReadOnly: true`）。

狀態快照行為：

- Slack 帳戶檢查會追蹤各個憑證的 `*Source` 和 `*Status`
  欄位（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳戶是透過 SecretRef
  或其他非內嵌秘密來源設定，但目前的指令/執行路徑
  無法解析實際值。
- 在 HTTP 模式中，包含 `signingSecretStatus`；在 Socket Mode 中，
  必需的配對是 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，如果已配置，則優先使用使用者 Token。對於寫入，Bot Token 仍然優先；僅當 `userTokenReadOnly: false` 且無法使用 Bot Token 時，才允許使用者 Token 寫入。</Tip>

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

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受傳入檔案佔位符中顯示的 Slack 檔案 ID，並針對圖片傳回圖片預覽，或針對其他檔案類型傳回本機檔案元資料。

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制 DM 存取權。`channels.slack.allowFrom` 是正式的 DM 允許清單。

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

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 當具名帳號自己的 `allowFrom` 未設定時，會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    為了相容性，仍會讀取舊版的 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom`。當 `openclaw doctor --fix` 能在不變更存取權的情況下遷移時，會將它們遷移至 `dmPolicy` 和 `allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="頻道政策">
    `channels.slack.groupPolicy` 控制頻道處理方式：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 下，且**必須使用穩定的 Slack 頻道 ID**（例如 `C12345678`）作為配置鍵。

    執行時注意：如果完全缺少 `channels.slack`（僅環境變數設定），執行時會回退至 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當權杖存取權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設定的值，但預設會在路由時被忽略
    - 傳入授權和頻道路由預設優先使用 ID；直接的使用者名稱/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基於名稱的鍵（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不**會匹配。頻道查詢預設優先使用 ID，因此基於名稱的鍵將永遠無法成功路由，並且該頻道中的所有訊息都將被靜靜封鎖。這與 `groupPolicy: "open"` 不同，後者不需要頻道鍵即可進行路由，且基於名稱的鍵似乎可以運作。

    請務必使用 Slack 頻道 ID 作為鍵。若要尋找它：在 Slack 中以右鍵按一下頻道 → **複製連結** — ID（`C...`）會出現在 URL 的末尾。

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

    不正確（在 `groupPolicy: "allowlist"` 下會被靜靜封鎖）：

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

  <Tab title="Mentions and channel users">
    頻道訊息預設會透過提及進行存取控制。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - Slack 使用者群組提及 (`<!subteam^S...>`)，當機器人使用者是該使用者群組的成員時；需要 `usergroups:read`
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為 (當 `thread.requireExplicitMention` 為 `true` 時停用)

    每個頻道的控制項 (`channels.slack.channels.<id>`；僅透過啟動解析或 `dangerouslyAllowNameMatching` 取得名稱)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`、`toolsBySender`
    - `toolsBySender` 金鑰格式：`channel:`、`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

    對於頻道和私人頻道，`allowBots` 採用保守策略：僅在傳送機器人明確列於該房間的 `users` 允許清單中，或當來自 `channels.slack.allowFrom` 的至少一個明確 Slack 擁有者 ID 目前是房間成員時，才會接受機器人建立的房間訊息。萬用字元和顯示名稱擁有者項目不符合擁有者存在的條件。擁有者存在檢查使用 Slack `conversations.members`；請確保應用程式具有該房間類型的相符讀取範圍 (公開頻道為 `channels:read`，私人頻道為 `groups:read`)。如果成員查詢失敗，OpenClaw 將捨棄機器人建立的房間訊息。

    已接受的機器人建立 Slack 訊息使用共用的 [bot loop protection](/zh-Hant/channels/bot-loop-protection)。設定 `channels.defaults.botLoopProtection` 作為預設預算，然後當工作區或頻道需要不同的限制時，使用 `channels.slack.botLoopProtection` 或 `channels.slack.channels.<id>.botLoopProtection` 覆寫。

  </Tab>
</Tabs>

## 串接、會話和回覆標籤

- DMs 路由為 `direct`；頻道路由為 `channel`；MPIMs 路由為 `group`。
- Slack 路由綁定接受原始對等 ID 以及 Slack 目標格式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用預設的 `session.dmScope=main`，Slack DMs 會合併到代理主會話。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 一般的頂層頻道訊息會停留在各別頻道的會話中，即使當 `replyToMode` 為 non-`off` 時。
- Slack 串列回覆使用父 Slack `thread_ts` 作為會話後綴 (`:thread:<threadTs>`)，即使當使用 `replyToMode="off"` 停用出站回覆串列功能時也是如此。
- 當預期的頂層頻道根訊息將開始可見的 Slack 串列時，OpenClaw 會將該根訊息植入 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`，使得根訊息與後續的串列回覆共用同一個 OpenClaw 會話。這適用於 `app_mention` 事件、明確的機器人或設定的提及模式匹配，以及具有 non-`off` `replyToMode` 的 `requireMention: false` 頻道。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新串列會話開始時擷取多少現有的串列訊息 (預設 `20`；設定為 `0` 以停用)。
- `channels.slack.thread.requireExplicitMention` (預設 `false`)：當設為 `true` 時，隱含的隱式串列提及會被抑制，因此機器人僅回應串列內明確的 `@bot` 提及，即使機器人已參與該串列。若無此設定，機器人參與之串列中的回覆將繞過 `requireMention` 閘道控制。

回覆串接控制：

- `channels.slack.replyToMode`：`off|first|all|batched` (預設 `off`)
- `channels.slack.replyToModeByChatType`：每 `direct|group|channel`
- 直接聊天的舊版後備方案：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

若要從 `message` 工具發出明確的 Slack 執行緒回覆，請將 `replyBroadcast: true` 設定為 `action: "send"` 和 `threadId` 或 `replyTo`，以要求 Slack 也將該執行緒回覆廣播到父頻道。這對應至 Slack 的 `chat.postMessage` `reply_broadcast` 標誌，且僅支援純文字或 Block Kit 發送，不支援媒體上傳。

當 `message` 工具呼叫在 Slack 執行緒內執行並目標指向同一個頻道時，OpenClaw 通常會根據 `replyToMode` 繼承目前的 Slack 執行緒。在 `action: "send"` 或 `action: "upload-file"` 上設定 `topLevel: true` 以改為強制發送新的父頻道訊息。`threadId: null` 被視為相同的頂層選擇退出選項。

<Note>
`replyToMode="off"` 會停用傳出的 Slack 回覆執行緒，包括明確的 `[[reply_to_*]]` 標籤。它不會扁平化傳入的 Slack 執行緒工作階段：已經發布在 Slack 執行緒內的訊息仍然會路由到 `:thread:<threadTs>` 工作階段。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。Slack 執行緒會對頻道隱藏訊息，而 Telegram 回覆則會保持內聯可見。
</Note>

## Ack 反應

`ackReaction` 會在 OpenClaw 處理傳入訊息時傳送確認表情符號。`ackReactionScope` 決定該表情符號的實際傳送*時機*。

### 表情符號 (`ackReaction`)

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號後備方案 (`agents.list[].identity.emoji`，否則為 `"eyes"` / 👀)

備註：

- Slack 預期使用短代碼 (例如 `"eyes"`)。
- 使用 `""` 以針對 Slack 帳號或全域停用該反應。

### 範圍 (`messages.ackReactionScope`)

Slack 提供者從 `messages.ackReactionScope` 讀取範圍（預設 `"group-mentions"`）。目前沒有 Slack 帳戶或 Slack 頻道層級的覆蓋設定；該值對網關全域有效。

數值：

- `"all"`：在私訊和群組中回應。
- `"direct"`：僅在私訊中回應。
- `"group-all"`：在每條群組訊息中回應（無私訊）。
- `"group-mentions"`（預設）：在群組中回應，但僅當機器人被提及時（或在已加入的群組可提及對象中）。**不包含私訊。**
- `"off"` / `"none"`：從不回應。

<Note>預設範圍（`"group-mentions"`）不會在直接訊息中觸發 ack 回應。若要在收到的 Slack 私訊中看到設定的 `ackReaction`（例如 `"eyes"`），請將 `messages.ackReactionScope` 設定為 `"direct"` 或 `"all"`。`messages.ackReactionScope` 是在 Slack 提供者啟動時讀取的，因此變更需要重新啟動網關才能生效。</Note>

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
- `partial`（預設）：以最新的部分輸出取代預覽文字。
- `block`：附加區塊化的預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後傳送最終文字。
- `streaming.preview.toolProgress`：當草稿預覽啟用時，將工具/進度更新路由至同一個編輯後的預覽訊息（預設：`true`）。設定 `false` 以保持分開的工具/進度訊息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：設為 `status` 以在隱藏原始指令/exec 文字的同時保持精簡的工具進度行（預設：`raw`）。

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

`channels.slack.streaming.nativeTransport` 控制當 `channels.slack.streaming.mode` 為 `partial` 時的 Slack 原生文字串流（預設：`true`）。

Slack 原生進度任務卡片在進度模式下為可選功能。將 `channels.slack.streaming.progress.nativeTaskCards` 設定為 `true` 並配合 `channels.slack.streaming.mode="progress"`，可在工作執行時發送 Slack 原生計畫/任務卡片，並在完成時更新同一張任務卡片。若未使用此標誌，進度模式將保持可攜式草稿預覽行為。

- 必須提供回覆執行緒，才能顯示原生文字串流和 Slack 助理執行緒狀態。執行緒選取仍遵循 `replyToMode`。
- 當無法使用原生串流或不存在回覆執行緒時，頻道、群組聊天和頂層 DM 根層級仍可使用標準草稿預覽。
- 頂層 Slack DM 預設保持在執行緒外，因此不會顯示 Slack 的執行緒式原生串流/狀態預覽；相反，OpenClaw 會在 DM 中發布並編輯草稿預覽。
- 媒體和非文字內容會回退至標準傳送方式。
- 媒體/錯誤的最終狀態會取消待處理的預覽編輯；符合條件的文字/區塊最終狀態僅在能就地編輯預覽時才會更新。
- 如果串流在回覆中途失敗，OpenClaw 會將剩餘的內容回退至標準傳送方式。

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

啟用 Slack 原生進度任務卡片：

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          nativeTaskCards: true,
          render: "rich",
        },
      },
    },
  },
}
```

舊版金鑰：

- `channels.slack.streamMode` (`replace | status_final | append`) 是 `channels.slack.streaming.mode` 的舊版執行時別名。
- boolean `channels.slack.streaming` 是 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport` 的舊版執行時別名。
- legacy `channels.slack.nativeStreaming` 是 `channels.slack.streaming.nativeTransport` 的執行時別名。
- 執行 `openclaw doctor --fix` 以將保存的 Slack 串流設定重寫為標準金鑰。

## 正在輸入反應回退

`typingReaction` 會在 OpenClaw 處理回覆時，對傳入的 Slack 訊息新增暫時性反應，並在執行完成時移除。這在回覆執行緒之外最為有用，因為回覆執行緒會使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意事項：

- Slack 預期短代碼（例如 `"hourglass_flowing_sand"`）。
- 表情回應採用盡力而為的方式，並在回應或失敗路徑完成後嘗試自動進行清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 檔案附件是從 Slack 託管的私人 URL（經過令牌驗證的請求流程）下載的，當取得成功且大小限制允許時，會寫入媒體儲存庫。檔案佔位符包含 Slack `fileId`，以便代理可以使用 `download-file` 取得原始檔案。

    下載使用受限的閒置和總逾時時間。如果 Slack 檔案檢索停滯或失敗，OpenClaw 會繼續處理訊息並回退到檔案佔位符。

    執行時入站大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆蓋。

  </Accordion>

  <Accordion title="出站文字與檔案">
    - 文字分塊使用 `channels.slack.textChunkLimit`（預設為 4000）
    - `channels.slack.chunkMode="newline"` 啟用段落優先分割
    - 檔案傳送使用 Slack 上傳 API，並可包含回覆討論串（`thread_ts`）
    - 當已配置時，出站媒體上限遵循 `channels.slack.mediaMaxMb`；否則頻道傳送使用媒體管線中的 MIME 類型預設值

  </Accordion>

  <Accordion title="傳遞目標">
    首選的明確目標：

    - `user:<id>` 用於私訊
    - `channel:<id>` 用於頻道

    僅包含文字/區塊的 Slack 私訊可以直接發送到使用者 ID；檔案上傳和執行緒傳送會先透過 Slack 對話 API 開啟私訊，因為這些路徑需要具體的對話 ID。

  </Accordion>
</AccordionGroup>

## 指令與斜線行為

斜線指令在 Slack 中顯示為單一配置的指令或多個原生指令。配置 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要在您的 Slack 應用程式中進行[額外的資訊清單設定](#additional-manifest-settings)，並且改為在全域設定中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 來啟用。

- Slack 的原生指令自動模式為**關閉**狀態，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生參數選單使用自適應呈現策略，在發送所選選項值之前會顯示確認對話方塊：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選擇選單
- 超過 100 個選項：外部選擇，並在提供互動選項處理程式時進行非同步選項篩選
- 超過 Slack 限制：編碼的選項值會退回到按鈕

```txt
/think
```

Slash 會話使用像 `agent:<agentId>:slack:slash:<userId>` 這樣的隔離金鑰，並且仍然使用 `CommandTargetSessionKey` 將指令執行路由到目標對話會話。

## 互動式回覆

Slack 可以呈現代理程式建立的互動式回覆控制項，但此功能預設為停用。
對於新的代理程式、CLI 和外掛輸出，請優先使用共用的
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

或僅針對一個 Slack 帳號啟用：

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

啟用後，代理程式仍然可以發出已棄用的 Slack 專用回覆指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

這些指令會編譯成 Slack Block Kit，並透過現有的 Slack 互動事件路徑將點擊或選擇
路由回來。將它們保留用於舊的
提示和 Slack 特定的緊急應變措施；對於新的
可攜式控制項，請使用共用呈現方式。

對於新的生產者程式碼，指令編譯器 API 也已被棄用：

- `compileSlackInteractiveReplies(...)`
- `parseSlackOptionsLine(...)`
- `isSlackInteractiveRepliesEnabled(...)`
- `buildSlackInteractiveBlocks(...)`

對於新的
Slack 呈現控制項，請使用 `presentation` 載荷和 `buildSlackPresentationBlocks(...)`。

注意事項：

- 這是 Slack 專用的舊版 UI。其他頻道不會將 Slack Block
  Kit 指令轉換為它們自己的按鈕系統。
- 互動式回呼值是 OpenClaw 產生的不透明權杖，而非原始的代理程式建立值。
- 如果生成的互動區塊超出 Slack Block Kit 的限制，OpenClaw 將回退到原始文字回覆，而不是發送無效的區塊承載。

### 外掛程式擁有的模態提交

註冊互動處理程式的 Slack 外掛程式也可以接收模態
`view_submission` 和 `view_closed` 生命週期事件，在 OpenClaw 為
代理程式可見的系統事件壓縮承載之前。在開啟 Slack 模態時，請使用以下其中一種路由
模式：

- 將 `callback_id` 設為 `openclaw:<namespace>:<payload>`。
- 或者保留現有的 `callback_id` 並將 `pluginInteractiveData:
"<namespace>:<payload>"` in the modal `private_metadata`。

處理程式接收 `ctx.interaction.kind` 作為 `view_submission` 或
`view_closed`、標準化的 `inputs`，以及來自
Slack 的完整原始 `stateValues` 物件。僅使用回呼 ID 路由就足以呼叫外掛處理程式；當
模態也應產生代理程式可見的系統事件時，請包含現有的模態 `private_metadata` 使用者/會話路由欄位。代理程式會收到一個
精簡、已編輯過的 `Slack interaction: ...` 系統事件。如果處理程式返回
`systemEvent.summary`、`systemEvent.reference` 或 `systemEvent.data`，這些
欄位會包含在該精簡事件中，以便代理程式可以參考
外掛程式擁有的儲存空間，而無需查看完整的表單承載。

## Slack 中的原生審核

Slack 可以充當具有互動按鈕和互動的原生審核客戶端，而不是回退到 Web UI 或終端機。

- Exec 和外掛審核可以呈現為 Slack 原生的 Block Kit 提示。
- `channels.slack.execApprovals.*` 仍然是原生 exec 審核客戶端啟用和 DM/頻道路由設定。
- Exec 審核 DM 使用 `channels.slack.execApprovals.approvers` 或 `commands.ownerAllowFrom`。
- 當 Slack 啟用作為來源會話的原生審核客戶端時，或者當 `approvals.plugin` 路由到來源 Slack 會話或 Slack 目標時，外掛審核會使用 Slack 原生按鈕。
- 外掛程式核准訊息使用來自 `channels.slack.allowFrom`、具名帳戶 `allowFrom` 或帳戶預設路由的 Slack 外掛程式核准者。
- 仍然會執行核准者授權：僅限執行的核准者無法核准外掛程式請求，除非他們同時也是外掛程式核准者。

這與其他通道使用相同的共享核准按鈕介面。當在您的 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中呈現為 Block Kit 按鈕。
當這些按鈕存在時，它們是主要的核准使用者體驗 (UX)；OpenClaw
應僅在工具結果顯示聊天
核准無法使用或手動核准是唯一途徑時，才包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (選用；盡可能回退至 `commands.ownerAllowFrom`)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設：`dm`)
- `agentFilter`, `sessionFilter`

當 `enabled` 未設定或 `"auto"` 且至少有一個
執行核准者解析時，Slack 會自動啟用原生執行核准。當 Slack 外掛程式核准者解析且請求符合原生用戶端篩選器時，Slack 也可以透過此原生用戶端
路徑處理原生外掛程式核准。設定
`enabled: false` 可明確停用 Slack 作為原生核准用戶端。設定 `enabled: true` 可
在核准者解析時強制開啟原生核准。停用 Slack 執行核准並不會停用
透過 `approvals.plugin` 啟用的原生 Slack 外掛程式核准傳遞；外掛程式核准
傳遞會改用 Slack 外掛程式核准者。

沒有明確 Slack 執行核准設定時的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有在您想要覆寫核准者、新增篩選器，或
選擇加入來源聊天傳遞時，才需要明確的 Slack 原生設定：

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

共用 `approvals.exec` 轉發是分開的。僅當執行核准提示也必須路由到其他聊天或明確的帶外目標時才使用它。共用 `approvals.plugin` 轉發也是分開的；僅當 Slack 能原生處理外掛核准請求時，Slack 原生傳遞才會抑制該後備方案。

同聊天 `/approve` 也適用於已支援指令的 Slack 頻道和 DM。有關完整的核准轉發模型，請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals)。

## 事件和運作行為

- 訊息編輯/刪除會對應到系統事件。
- 執緒廣播（「同時傳送到頻道」執緒回覆）會作為一般使用者訊息處理。
- 表情符號新增/移除事件會對應到系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應到系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道配置金鑰。
- 頻道主題/用途元資料會被視為不受信任的上下文，並可注入到路由上下文中。
- 執緒啟動者和初始執緒歷史上下文植入會根據設定的發送者允許清單進行篩選（如適用）。
- 區塊動作和模態互動會發出具有豐富欄位負載的結構化 `Slack interaction: ...` 系統事件：
  - 區塊動作：選取的值、標籤、選擇器值，以及 `workflow_*` 元資料
  - 模態 `view_submission` 和 `view_closed` 事件，具有路由頻道元資料和表單輸入

## 設定參考

主要參考：[Configuration reference - Slack](/zh-Hant/gateway/config-channels#slack)。

<Accordion title="高優先級 Slack 欄位">

- 模式/驗證： `mode`、 `botToken`、 `appToken`、 `signingSecret`、 `webhookPath`、 `accounts.*`
- DM 存取權限： `dm.enabled`、 `dmPolicy`、 `allowFrom` (舊版： `dm.policy`、 `dm.allowFrom`)、 `dm.groupEnabled`、 `dm.groupChannels`
- 相容性切換： `dangerouslyAllowNameMatching` (緊急使用；除非否則請保持關閉)
- 頻道存取權限： `groupPolicy`、 `channels.*`、 `channels.*.users`、 `channels.*.requireMention`
- 串接/歷史記錄： `replyToMode`、 `replyToModeByChatType`、 `thread.*`、 `historyLimit`、 `dmHistoryLimit`、 `dms.*.historyLimit`
- 傳遞： `textChunkLimit`、 `chunkMode`、 `mediaMaxMb`、 `streaming`、 `streaming.nativeTransport`、 `streaming.preview.toolProgress`
- 展開連結： `unfurlLinks` (預設： `false`)、 `unfurlMedia` 用於 `chat.postMessage` 連結/媒體預覽控制；設定 `unfurlLinks: true` 以重新啟用連結預覽
- 運作/功能： `configWrites`、 `commands.native`、 `slashCommand.*`、 `actions.*`、 `userToken`、 `userTokenReadOnly`

</Accordion>

## 疑難排解

<AccordionGroup>
  <Accordion title="No replies in channels">
    請按順序檢查：

    - `groupPolicy`
    - 頻道白名單 (`channels.slack.channels`) — **金鑰必須是頻道 ID** (`C12345678`)，而不是名稱 (`#channel-name`)。由於頻道路由預設以 ID 為優先，在 `groupPolicy: "allowlist"` 下使用基於名稱的金鑰會無聲失敗。若要尋找 ID：在 Slack 中右鍵點擊該頻道 → **Copy link** — URL 結尾的 `C...` 值即為頻道 ID。
    - `requireMention`
    - 每個頻道的 `users` 白名單
    - `messages.groupChat.visibleReplies`：一般群組/頻道請求預設為 `"automatic"`。如果您選擇加入 `"message_tool"` 且日誌顯示助理文字但沒有 `message(action=send)` 呼叫，表示模型錯過了可見的 message-tool 路徑。在此模式下，最終文字保持私密；請檢查 Gateway 詳細日誌中的已隱藏 Payload 中繼資料，或者如果您希望透過舊版路徑發布每一個一般助理的最終回覆，請將其設為 `"automatic"`。
    - `messages.groupChat.unmentionedInbound`：如果為 `"room_event"`，未被提及的允許頻道閒聊將成為環境語境並保持靜默，除非代理呼叫 `message` 工具。請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events)。

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

    有用的指令：

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
    - 配對核准 / 允許清單條目 (`dmPolicy: "open"` 仍然需要 `channels.slack.allowFrom: ["*"]`)
    - 群組 DM 使用 MPIM 處理；啟用 `channels.slack.dm.groupEnabled` 且若已設定，請將 MPIM 包含在 `channels.slack.dm.groupChannels` 中
    - Slack Assistant DM 事件：提及 `drop message_changed` 的詳細記錄
      通常表示 Slack 發送了編輯過的 Assistant-thread 事件，且訊息中繼資料中
      沒有可復原的人類傳送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    驗證 Slack 應用程式設定中的 bot + 應用程式權杖及 Socket Mode 是否已啟用。
    應用程式層級權杖需要 `connections:write`，而 Bot 使用者 OAuth 權杖
    bot 權杖必須屬於與應用程式權杖相同的 Slack 應用程式/工作區。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳戶
    已設定，但目前的執行階段無法解析 SecretRef 支援的
    值。

    諸如 `slack socket mode failed to start; retry ...` 之類的記錄屬於可復原的
    啟動失敗。缺少範圍、權杖遭撤銷及無效的驗證則會快速失敗。
    `slack token mismatch ...` 記錄表示 bot 權杖和應用程式權杖
    似乎屬於不同的 Slack 應用程式；請修正 Slack 應用程式憑證。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - signing secret
    - webhook path
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶唯一的 `webhookPath`
    - 公用 URL 終止 TLS 並將請求轉發至 Gateway 路徑
    - Slack 應用程式 `request_url` 路徑完全符合 `channels.slack.webhookPath` (預設 `/slack/events`)

    如果帳戶快照中出現 `signingSecretStatus: "configured_unavailable"`，表示已設定 HTTP 帳戶，但目前執行環境無法解析 SecretRef 支援的簽署密鑰。

    重複出現 `slack: webhook path ... already registered` 記錄表示兩個 HTTP 帳戶正在使用相同的 `webhookPath`；請為每個帳戶指定不同的路徑。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    驗證您的預期設定：

    - 原生指令模式 (`channels.slack.commands.native: true`)，並在 Slack 中註冊了對應的斜線指令
    - 或是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    Slack 不會自動建立或移除斜線指令。`commands.native: "auto"` 不會啟用 Slack 原生指令；請使用 `true` 並在 Slack 應用程式中建立對應的指令。在 HTTP 模式下，每個 Slack 斜線指令必須包含 Gateway URL。在 Socket 模式下，指令負載透過 websocket 傳送，且 Slack 會忽略 `slash_commands[].url`。

    同時也請檢查 `commands.useAccessGroups`、DM 授權、頻道允許清單，以及各頻道的 `users` 允許清單。對於遭攔截的斜線指令發送者，Slack 會傳回暫時性錯誤，包括：

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>

## 附件視覺參考

當 Slack 檔案下載成功且符合大小限制時，Slack 可以將下載的媒體附加至代理程式的回合。圖片檔案可以透過媒體理解路徑傳遞，或直接傳送至具備視覺能力的回覆模型；其他檔案則會保留為可下載的檔案內容，而不會被視為圖片輸入。

### 支援的媒體類型

| 媒體類型                     | 來源             | 目前行為                                                         | 備註                                                    |
| ---------------------------- | ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| JPEG / PNG / GIF / WebP 圖片 | Slack 檔案 URL   | 已下載並附加至輪次，以進行視覺處理                               | 單一檔案上限：`channels.slack.mediaMaxMb`（預設 20 MB） |
| PDF 檔案                     | Slack 檔案 URL   | 已下載並作為檔案內容公開，供 `download-file` 或 `pdf` 等工具使用 | Slack 傳入不會自動將 PDF 轉換為影像視覺輸入             |
| 其他檔案                     | Slack 檔案 URL   | 盡可能下載並作為檔案內容公開                                     | 二進制檔案不會被視為影像輸入                            |
| 執行緒回覆                   | 執行緒起始者檔案 | 當回覆沒有直接媒體時，根訊息檔案可以作為內容被補充               | 僅包含檔案的起始者會使用附件預留位置                    |
| 多圖片訊息                   | 多個 Slack 檔案  | 每個檔案都會被獨立評估                                           | Slack 處理限制為每則訊息八個檔案                        |

### 傳入管線

當包含檔案附件的 Slack 訊息到達時：

1. OpenClaw 使用 Bot 權杖從 Slack 的私人 URL 下載檔案。
2. 成功後，檔案會被寫入至媒體存放區。
3. 已下載的媒體路徑和內容類型會被加入至傳入內容中。
4. 具備影像功能的模型/工具路徑可以使用來自該內容的影像附件。
5. 非影像檔案仍會作為檔案元資料或媒體參考提供給可處理這些檔案的工具。

### 執行緒根附件繼承

當訊息到達執行緒中（具有 `thread_ts` 父層）：

- 如果回覆本身沒有直接媒體，且包含的根訊息有檔案，Slack 可以將根檔案作為執行緒起始者內容進行補充。
- 直接回覆附件的優先順序高於根訊息附件。
- 僅包含檔案而沒有文字的根訊息會以附件預留位置表示，以便回退仍可包含其檔案。

### 多附件處理

當單一 Slack 訊息包含多個檔案附件時：

- 每個附件都會透過媒體管線獨立處理。
- 已下載的媒體參考會被聚合到訊息內容中。
- 處理順序遵循事件承載中 Slack 的檔案順序。
- 單一附件下載失敗不會阻擋其他附件。

### 大小、下載和模型限制

- **大小上限**：預設每個檔案 20 MB。可透過 `channels.slack.mediaMaxMb` 設定。
- **下載失敗**：Slack 無法提供的檔案、過期的 URL、無法存取的檔案、過大的檔案，以及 Slack auth/login HTML 回應將會被跳過，而不是被回報為不支援的格式。
- **視覺模型**：當圖片分析使用支援視覺功能的現有回覆模型，或是使用在 `agents.defaults.imageModel` 中設定的圖片模型時。

### 已知限制

| 情境                          | 目前行為                                                | 解決方法                                                              |
| ----------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| 過期的 Slack 檔案 URL         | 檔案已跳過；未顯示錯誤                                  | 在 Slack 中重新上傳檔案                                               |
| 未設定視覺模型                | 圖片附件會儲存為媒體參照，但不會作為圖片進行分析        | 設定 `agents.defaults.imageModel` 或使用具備視覺功能的回覆模型        |
| 非常大的圖片 (預設為 > 20 MB) | 因大小上限而跳過                                        | 如果 Slack 允許，請增加 `channels.slack.mediaMaxMb`                   |
| 轉傳/分享的附件               | 文字和 Slack 託管的圖片/檔案媒體皆為盡力而為            | 直接在 OpenClaw 串流中重新分享                                        |
| PDF 附件                      | 儲存為檔案/媒體上下文，不會自動透過圖片視覺功能進行路由 | 使用 `download-file` 取得檔案中繼資料，或使用 `pdf` 工具進行 PDF 分析 |

### 相關文件

- [媒體理解管線](/zh-Hant/nodes/media-understanding)
- [PDF 工具](/zh-Hant/tools/pdf)
- Epic: [#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件視覺功能啟用
- 回歸測試: [#51353](https://github.com/openclaw/openclaw/issues/51353)
- 即時驗證: [#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相關

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh-Hant/channels/pairing">
    將 Slack 使用者配對到閘道。
  </Card>
  <Card title="Groups" icon="users" href="/zh-Hant/channels/groups">
    頻道和群組 DM 行為。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由到代理人。
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
