---
summary: "Slack 設定和執行時行為（Socket Mode + HTTP Request URLs）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

透過 Slack 應用程式整合，在 DM 和頻道上具備生產就緒性。預設模式為 Socket Mode；也支援 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack 直接訊息 (DM) 預設為配對模式。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    原生指令行為和指令目錄。
  </Card>
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷和修復手冊。
  </Card>
</CardGroup>

## 選擇 Socket Mode 或 HTTP Request URLs

兩種傳輸方式皆已具備生產環境就緒狀態，並在訊息傳遞、斜線指令、App Home 與互動功能上達到功能對等。請依據部署形狀選擇，而非功能。

| 考量點              | Socket Mode（預設）                                                                                                     | HTTP Request URLs                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 公網閘道 URL        | 不需要                                                                                                                  | 需要（DNS、TLS、反向代理或通道）                                               |
| 對外網路            | 到 `wss-primary.slack.com` 的輸出 WSS 必須可連線                                                                        | 無對外 WS；僅接受對內 HTTPS                                                    |
| 所需權杖            | Bot 權杖 (`xoxb-...`) + 應用程式層級權杖 (`xapp-...`) 並具備 `connections:write`                                        | Bot 權杖 (`xoxb-...`) + 簽署密鑰                                               |
| 開發筆電 / 防火牆後 | 可直接運作                                                                                                              | 需要公網通道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或暫存閘道           |
| 水平擴展            | 每個主機上的每個 App 一個 Socket Mode 連線階段；多個閘道需要分開的 Slack Apps                                           | 無狀態 POST 處理器；多個閘道副本可在負載平衡器後共用一個 App                   |
| 單一閘道上的多帳號  | 支援；每個帳號開啟自己的 WS                                                                                             | 支援；每個帳戶需要唯一的 `webhookPath`（預設為 `/slack/events`），以免註冊衝突 |
| 斜線指令傳輸        | 透過 WS 連線傳送；`slash_commands[].url` 欄位會被忽略                                                                   | Slack 會 POST 到 `slash_commands[].url`；該欄位是指令分派所需的欄位            |
| 請求簽名            | 未使用（驗證是應用層級 Token）                                                                                          | Slack 會對每個請求進行簽署；OpenClaw 會使用 `signingSecret` 進行驗證           |
| 連線中斷後的恢復    | Slack SDK 自動重連已啟用；OpenClaw 也會以受限的退避策略重啟失敗的 Socket Mode 工作階段。Pong-timeout 傳輸調整適用於此。 | 沒有持久連線會中斷；重試由 Slack 端逐個請求進行                                |

<Note>
  針對單一 Gateway 主機、開發筆記型電腦，以及可輸出連線至 `*.slack.com` 但無法接受輸入 HTTPS 的內部部署網路，**請選擇 Socket Mode**。

當在負載平衡器後方執行多個 Gateway 副本、當輸出 WSS 被封鎖但允許輸入 HTTPS，或者當您已經在反向代理終止 Slack webhook 時，**請選擇 HTTP Request URLs**。

</Note>

## 安裝

在設定頻道之前先安裝 Slack：

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` 會註冊並啟用此外掛。此外掛在您設定下方的 Slack 應用程式和頻道設定之前，仍然不會執行任何動作。請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解一般外掛行為和安裝規則。

## 快速設定

<Tabs>
  <Tab title="Socket Mode (預設)">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選擇您的工作區 → 貼上下列其中一個清單 → **Next** → **Create**。

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
          **Recommended** (推薦) 符合 Slack 外掛的完整功能：App Home、斜線指令、檔案、回應 reactions、釘選 pins、群組 DMs，以及表情符號/使用者群組讀取。當工作區政策限制範圍 時，請選擇 **Minimal** (最小) — 它涵蓋 DMs、頻道/群組紀錄、提及和斜線指令，但會捨棄檔案、回應 reactions、釘選 pins、群組-DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各範圍的理由和額外選項，例如額外的斜線指令。
        </Note>

        在 Slack 建立應用程式後：

        - **Basic Information → App-Level Tokens → Generate Token and Scopes**：新增 `connections:write`，儲存，並複製 `xapp-...` 值。
        - **Install App → Install to Workspace**：複製 `xoxb-...` Bot User OAuth Token。

      </Step>

      <Step title="設定 OpenClaw">

        建議的 SecretRef 設定：

```bash
export SLACK_APP_TOKEN=xapp-...
export SLACK_BOT_TOKEN=xoxb-...
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

        Env 後備 (僅限預設帳戶)：

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

  <Tab title="HTTP 要求 URL">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選擇您的工作區 → 貼上下列其中一個清單 → 將 `https://gateway-host.example.com/slack/events` 替換為您的公開 Gateway URL → **Next** → **Create**。

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
          **Recommended** 符合 Slack 外掛的完整功能集；**Minimal** 會移除檔案、回應、釘選、群組 DM (`mpim:*`)、`emoji:read` 和 `usergroups:read` 以適用於嚴格的工作區。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各範圍的設計理據。
        </Note>

        <Info>
          三個 URL 欄位 (`slash_commands[].url`、`event_subscriptions.request_url` 和 `interactivity.request_url` / `message_menu_options_url`) 都指向同一個 OpenClaw 端點。Slack 的清單架構要求它們分別命名，但 OpenClaw 會依 Payload 類型路由，因此單一 `webhookPath` (預設為 `/slack/events`) 即已足夠。沒有 `slash_commands[].url` 的斜線指令在 HTTP 模式下會靜默失效。
        </Info>

        在 Slack 建立應用程式後：

        - **Basic Information → App Credentials**：複製 **Signing Secret** 以用於請求驗證。
        - **Install App → Install to Workspace**：複製 `xoxb-...` Bot User OAuth Token。

      </Step>

      <Step title="設定 OpenClaw">

        建議的 SecretRef 設定：

```bash
export SLACK_BOT_TOKEN=xoxb-...
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
        在多帳戶 HTTP 中使用唯一的 Webhook 路徑

        為每個帳戶指定不同的 `webhookPath` (預設為 `/slack/events`)，以免註冊衝突。
        </Note>

      </Step>

      <Step title="啟動 Gateway">

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

僅對記錄 Slack WebSocket pong/server-ping 逾時或在已知事件循環飢餓的主機上運行的 Socket Mode 工作區使用此設定。`clientPingTimeout` 是 SDK 發送 client ping 後等待 pong 的時間；`serverPingTimeout` 是等待 Slack server pings 的時間。App 訊息和事件仍屬於應用程式狀態，而非傳輸活躍信號。

注意：

- 在 HTTP Request URL 模式下會忽略 `socketMode`。
- 基礎 `channels.slack.socketMode` 設定適用於所有 Slack 帳戶，除非被覆寫。各帳戶的覆寫使用 `channels.slack.accounts.<accountId>.socketMode`；由於這是物件覆寫，請包含您想要該帳戶使用的每個 socket 調整欄位。
- 只有 `clientPingTimeout` 有 OpenClaw 預設值 (`15000`)。`serverPingTimeout` 和 `pingPongLoggingEnabled` 僅在設定時才會傳遞給 Slack SDK。
- Socket Mode 重新啟動的退避時間從約 2 秒開始，上限約為 30 秒。連續的可復原 start/start-wait 失敗會在 12 次嘗試後停止；成功連線後，後續的可復原中斷會開始新的重試週期。無法復原的 Slack 驗證錯誤（例如 `invalid_auth`、已撤銷的 token 或缺少範圍）會快速失敗，而不是無限期重試。

## Manifest 和範圍檢查清單

基礎 Slack app manifest 對於 Socket Mode 和 HTTP Request URLs 是相同的。只有 `settings` 區塊（以及斜線指令 `url`）有所不同。

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

對於 **HTTP Request URLs 模式**，請將 `settings` 替換為 HTTP 變體，並將 `url` 新增到每個斜線指令。需要公開 URL：

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

預設的 Manifest 啟用了 Slack App Home 的 **Home** 分頁並訂閱了 `app_home_opened`。當工作區成員開啟 Home 分頁時，OpenClaw 會發佈一個安全的預設 Home 檢視，其中包含 `views.publish`；不包含任何對話負載或私人設定。**Messages** 分頁保持啟用狀態以供 Slack DMs 使用。Manifest 也啟用了 Slack 助手執行緒，支援 `features.assistant_view`、`assistant:write`、`assistant_thread_started` 和 `assistant_thread_context_changed`；助手執行緒會路由到它們自己的 OpenClaw 執行緒會話，並讓 Slack 提供的執行緒語境保持供代理程式使用。

<AccordionGroup>
  <Accordion title="選用原生斜線指令">

    您可以使用多個 [native slash commands](#commands-and-slash-behavior) 來取代單一具細微差別的設定指令：

    - 請使用 `/agentstatus` 而非 `/status`，因為 `/status` 指令已被保留。
    - 一次最多可提供 25 個斜線指令。

    將您現有的 `features.slash_commands` 區段替換為 [available commands](/zh-Hant/tools/slash-commands#command-list) 的子集：

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
        使用與上述 Socket Mode 相同的 `slash_commands` 清單，並在每個項目中新增 `"url": "https://gateway-host.example.com/slack/events"`。範例：

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

        在清單中的每個指令上重複該 `url` 值。

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="選用作權範圍 (寫入作業)">
    如果您希望傳出訊息使用作用中的代理程式身分 (自訂使用者名稱和圖示) 而非預設的 Slack App 身分，請新增 `chat:write.customize` Bot 範圍。

    如果您使用 emoji 圖示，Slack 期望使用 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="Optional user-token scopes (read operations)">
    如果您設定 `channels.slack.userToken`，典型的讀取權限為：

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
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` env fallback 僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限設定使用 (無 env fallback)，且預設為唯讀行為 (`userTokenReadOnly: true`)。

狀態快照行為：

- Slack 帳戶檢查會追蹤每個認證 `*Source` 和 `*Status`
  欄位 (`botToken`、`appToken`、`signingSecret`、`userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示該帳戶是透過 SecretRef
  或其他非內嵌秘密來源設定，但目前的命令/執行時路徑
  無法解析實際值。
- 在 HTTP 模式下，會包含 `signingSecretStatus`；在 Socket Mode 下，
  必需的配對為 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，經過配置後可以優先使用使用者權杖。對於寫入，Bot 權杖仍為優先；只有在 `userTokenReadOnly: false` 且無法使用 Bot 權杖時，才允許使用者權杖寫入。</Tip>

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

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受傳入檔案預留位置中顯示的 Slack 檔案 ID，並針對圖片傳回圖片預覽，或針對其他檔案類型傳回本機檔案中繼資料。

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.slack.dmPolicy` 控制 DM 存取權。`channels.slack.allowFrom` 是標準的 DM 允許清單。

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `channels.slack.allowFrom` 包含 `"*"`)
    - `disabled`

    DM 旗標:

    - `dm.enabled` (預設為 true)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (舊版)
    - `dm.groupEnabled` (群組 DM 預設為 false)
    - `dm.groupChannels` (選用 MPIM 允許清單)

    多帳號優先順序:

    - `channels.slack.accounts.default.allowFrom` 僅適用於 `default` 帳號。
    - 具名帳號在其自己的 `allowFrom` 未設定時，會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    為了相容性，仍會讀取舊版 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom`。`openclaw doctor --fix` 會在可能的情況下將其遷移至 `dmPolicy` 和 `allowFrom` 且不改變存取權。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="頻道政策">
    `channels.slack.groupPolicy` 控制頻道處理方式：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，並且**必須使用穩定的 Slack 頻道 ID**（例如 `C12345678`）作為配置鍵。

    執行時注意事項：如果完全缺少 `channels.slack`（僅環境變數設定），執行時會回退至 `groupPolicy="allowlist"` 並記錄警告（即使設定了 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設定狀態，但在預設情況下會被路由忽略
    - 進入授權和頻道路由預設以 ID 為優先；直接的使用者名稱/slug 配對需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基於名稱的鍵（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不會**比對成功。頻道查詢預設以 ID 為優先，因此基於名稱的鍵將永遠無法成功路由，且該頻道中的所有訊息都將被靜默封鎖。這與 `groupPolicy: "open"` 不同，後者不需要頻道鍵即可進行路由，且基於名稱的鍵似乎可以運作。

    始終使用 Slack 頻道 ID 作為鍵。尋找方法：在 Slack 中右鍵點擊該頻道 → **複製連結** — ID（`C...`）會顯示在 URL 的末尾。

    正確做法：

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

    錯誤做法（在 `groupPolicy: "allowlist"` 下會被靜默封鎖）：

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
    頻道訊息預設會受到提及限制 (mention-gated)。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - Slack 使用者群組提及 (`<!subteam^S...>`)，當機器人使用者是該使用者群組的成員時；需要 `usergroups:read`
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為 (當 `thread.requireExplicitMention` 為 `true` 時停用)

    每個頻道的控制項 (`channels.slack.channels.<id>`；僅透過啟動解析或 `dangerouslyAllowNameMatching` 提供名稱)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 金鑰格式：`channel:`、`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍然僅對應到 `id:`)

    `allowBots` 對於頻道和私人頻道採取保守策略：僅當發送的機器人在該房間的 `users` 允許清單中被明確列出，或者當 `channels.slack.allowFrom` 中至少有一個明確的 Slack 擁有者 ID 目前是房間成員時，才會接受由機器人發送的房間訊息。萬用字元和顯示名稱的擁有者項目不滿足擁有者在場的條件。擁有者在場檢查使用 Slack `conversations.members`；請確保應用程式具有該房間類型的對應讀取權限範圍 (公開頻道為 `channels:read`，私人頻道為 `groups:read`)。如果成員查詢失敗，OpenClaw 將捨棄由機器人發送的房間訊息。

    已接受的機器人發送 Slack 訊息使用共享的 [機器人迴圈保護](/zh-Hant/channels/bot-loop-protection)。設定 `channels.defaults.botLoopProtection` 作為預算預設值，然後當工作區或頻道需要不同的限制時，使用 `channels.slack.botLoopProtection` 或 `channels.slack.channels.<id>.botLoopProtection` 覆寫。

  </Tab>
</Tabs>

## 串接、會話和回覆標籤

- DMs 路由為 `direct`；channels 路由為 `channel`；MPIMs 路由為 `group`。
- Slack 路由綁定接受原始的 peer ID 以及 Slack 目標形式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用預設的 `session.dmScope=main`，Slack DMs 會折疊至 agent 主會話。
- Channel 會話：`agent:<agentId>:slack:channel:<channelId>`。
- 一般的頂層 channel 訊息會保留在各自的 channel 會話中，即使當 `replyToMode` 為 non-`off` 時。
- Slack 串接回覆會使用父級 Slack `thread_ts` 作為會話後綴（`:thread:<threadTs>`），即使當使用 `replyToMode="off"` 停用了出站回覆串接時。
- 當預期某個合格的頂層 channel 根訊息將啟動可見的 Slack 串接時，OpenClaw 會將該根訊息植入 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`，使根訊息和後續的串接回覆共用同一個 OpenClaw 會話。這適用於 `app_mention` 事件、明確的 bot 或已配置的提及模式匹配，以及具有 non-`off` `replyToMode` 的 `requireMention: false` channels。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新的串接會話開始時，擷取多少個現有的串接訊息（預設 `20`；設定 `0` 以停用）。
- `channels.slack.thread.requireExplicitMention`（預設 `false`）：當 `true` 時，抑制隱含的串接提及，使 bot 僅回應串接內明確的 `@bot` 提及，即使 bot 已經參與該串接。若沒有此設定，bot 參與的串接中的回覆將會繞過 `requireMention` 閘道控制。

回覆串接控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（預設 `off`）
- `channels.slack.replyToModeByChatType`：每 `direct|group|channel`
- 直接聊天 的傳統備用方案：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

針對來自 `message` 工具的明確 Slack 執行緒回覆，請將 `replyBroadcast: true` 設定為包含 `action: "send"` 和 `threadId` 或 `replyTo`，以要求 Slack 也將執行緒回覆廣播到父頻道。這對應至 Slack 的 `chat.postMessage` `reply_broadcast` 標誌，且僅支援文字或 Block Kit 傳送，不支援媒體上傳。

當 `message` 工具呼叫在 Slack 執行緒內執行並以同一頻道為目標時，OpenClaw 通常會根據 `replyToMode` 繼承目前的 Slack 執行緒。請在 `action: "send"` 或 `action: "upload-file"` 上設定 `topLevel: true` 以強制改為傳送新的父頻道訊息。`threadId: null` 被視為相同的頂層退出選項。

<Note>
`replyToMode="off"` 會停用外連 Slack 回覆執行緒，包括明確的 `[[reply_to_*]]` 標籤。它不會扁平化內連 Slack 執行緒會話：已發布在 Slack 執行緒內的訊息仍會路由至 `:thread:<threadTs>` 會話。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。Slack 執行緒會對頻道隱藏訊息，而 Telegram 回覆則保持內嵌可見。
</Note>

## Ack 反應

`ackReaction` 會在 OpenClaw 處理內連訊息時發送確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分表情符號備用 (`agents.list[].identity.emoji`，否則為 "👀")

備註：

- Slack 預期使用短代碼 (例如 `"eyes"`)。
- 使用 `""` 針對 Slack 帳號或全域停用該反應。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`: 停用即時預覽串流。
- `partial` (預設值): 以最新的部分輸出取代預覽文字。
- `block`: 附加區塊化的預覽更新。
- `progress`: 在產生時顯示進度狀態文字，然後發送最終文字。
- `streaming.preview.toolProgress`: 當草稿預覽啟用時，將工具/進度更新傳送至同一個已編輯的預覽訊息 (預設值: `true`)。設定 `false` 以保持分離的工具/進度訊息。
- `streaming.preview.commandText` / `streaming.progress.commandText`: 設定為 `status` 以在隱藏原始命令/執行文字的同時保留精簡的工具進度行 (預設值: `raw`)。

隱藏原始命令/執行文字，同時保留精簡的進度行：

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

當 `channels.slack.streaming.mode` 為 `partial` 時，`channels.slack.streaming.nativeTransport` 控制 Slack 原生文字串流 (預設值: `true`)。

- 必須有回覆執行緒才能顯示原生文字串流和 Slack 助手執行緒狀態。執行緒選取仍遵循 `replyToMode`。
- 當原生串流無法使用或不存在回覆執行緒時，頻道、群組聊天和頂層 DM 根目錄仍可使用一般的草稿預覽。
- 頂層 Slack DM 預設保持在執行緒之外，因此它們不會顯示 Slack 的執行緒式原生串流/狀態預覽；OpenClaw 會改為在 DM 中發佈和編輯草稿預覽。
- 媒體和非文字酬載會回退至一般傳遞方式。
- 媒體/錯誤的最終結果會取消待處理的預覽編輯；合適的文字/區塊最終結果僅在能就地編輯預覽時才會排入。
- 如果串流在回覆中途失敗，OpenClaw 會將剩餘酬載回退至一般傳遞方式。

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

- `channels.slack.streamMode` (`replace | status_final | append`) 是 `channels.slack.streaming.mode` 的舊版執行時別名。
- 布林值 `channels.slack.streaming` 是 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport` 的舊版執行時別名。
- legacy `channels.slack.nativeStreaming` 是 `channels.slack.streaming.nativeTransport` 的執行時別名。
- 執行 `openclaw doctor --fix` 以將持續性 Slack 串流設定重寫為標準金鑰。

## 輸入反應後援

`typingReaction` 會在 OpenClaw 處理回覆時，於傳入的 Slack 訊息上新增暫時性反應，然後在執行完成時將其移除。這在執行緒回覆之外最為有用，因為執行緒回覆會使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期短代碼 (例如 `"hourglass_flowing_sand"`)。
- 反應屬於盡力而為 (best-effort)，且會在回覆或失敗路徑完成後自動嘗試清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件會從 Slack 託管的私人 URL (經過權杖驗證的要求流程) 下載，並在擷取成功且大小限制允許時寫入至媒體存放區。檔案預留位置包含 Slack `fileId`，因此代理程式可以使用 `download-file` 擷取原始檔案。

    下載使用受限的閒置與總逾時時間。如果 Slack 檔案擷取停滯或失敗，OpenClaw 會繼續處理訊息並退回至檔案預留位置。

    執行時傳入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

  <Accordion title="Outbound text and files">
    - 文字區塊使用 `channels.slack.textChunkLimit` (預設 4000)
    - `channels.slack.chunkMode="newline"` 啟用段落優先分割
    - 檔案傳送使用 Slack 上傳 API，且可包含執行緒回覆 (`thread_ts`)
    - 傳出媒體上限在設定時遵循 `channels.slack.mediaMaxMb`；否則通道傳送會使用媒體管線的 MIME 類型預設值

  </Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - `user:<id>` 用於私訊 (DM)
    - `channel:<id>` 用於頻道

    純文字/區塊的 Slack 私訊可以直接發送至使用者 ID；檔案上傳和執行緒發送會先透過 Slack 對話 API 開啟私訊，因為這些路徑需要具體的對話 ID。

  </Accordion>
</AccordionGroup>

## 指令和斜線行為

斜線指令在 Slack 中會以單一已設定指令或多個原生指令的形式呈現。請設定 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要在您的 Slack 應用程式中進行[額外的 manifest 設定](#additional-manifest-settings)，並改為在全域設定中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 來啟用。

- 原生指令的自動模式對 Slack 來說是**關閉** 的，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生參數選單使用自適應渲染策略，在發送所選的選項值之前會顯示確認模態視窗：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選擇選單
- 超過 100 個選項：當有互動選項處理程序可用時，使用外部選擇搭配非同步選項篩選
- 超出 Slack 限制：編碼的選項值會降級為按鈕

```txt
/think
```

斜線工作階段使用隔離的金鑰，例如 `agent:<agentId>:slack:slash:<userId>`，並仍然使用 `CommandTargetSessionKey` 將指令執行路由至目標對話工作階段。

## 互動式回覆

Slack 可以呈現由 Agent 撰寫的互動式回覆控制項，但此功能預設為停用。
對於新的 Agent、CLI 和外掛輸出，建議優先使用共用的
`presentation` 按鈕或選擇區塊。它們使用相同的 Slack 互動
路徑，同時也能在其他頻道上降級運作。

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

或僅針對一個 Slack 帳號啟用它：

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

啟用後，Agent 仍然可以發出已棄用的 Slack 專用回覆指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

這些指令會編譯成 Slack Block Kit，並透過既有的 Slack 互動事件路徑將點擊或選擇傳回。請將它們保留用於舊的提示詞和 Slack 特定的應急方案；對於新的可移植控制項，請使用共享的呈現方式。

對於新的生產者程式碼，指令編譯器 API 也已棄用：

- `compileSlackInteractiveReplies(...)`
- `parseSlackOptionsLine(...)`
- `isSlackInteractiveRepliesEnabled(...)`
- `buildSlackInteractiveBlocks(...)`

對於新的 Slack 渲染控制項，請使用 `presentation` payload 和 `buildSlackPresentationBlocks(...)`。

備註：

- 這是 Slack 特有的舊版 UI。其他頻道不會將 Slack Block Kit 指令轉換為它們自己的按鈕系統。
- 互動回調值是由 OpenClaw 產生的不透明 token，而非原始的 agent 撰寫值。
- 如果產生的互動區塊會超過 Slack Block Kit 的限制，OpenClaw 將會改用原始的文字回覆，而不是傳送無效的區塊 payload。

### 外掛擁有的模態框提交

註冊了互動處理常式的 Slack 外掛，也可以在 OpenClaw 將 payload 壓縮為 agent 可見的系統事件之前，接收模態 `view_submission` 和 `view_closed` 生命週期事件。當開啟 Slack 模態框時，請使用下列其中一種路由模式：

- 將 `callback_id` 設定為 `openclaw:<namespace>:<payload>`。
- 或者保留現有的 `callback_id`，並將 `pluginInteractiveData:
"<namespace>:<payload>"` in the modal `private_metadata`。

處理程序會接收 `ctx.interaction.kind` 作為 `view_submission` 或
`view_closed`、標準化的 `inputs`，以及來自
Slack 的完整原始 `stateValues` 物件。僅使用 callback-id 的路由足以叫用外掛程式處理程序；當
模態視窗也應產生代理人可見的系統事件時，請包含現有的模態視窗 `private_metadata` 使用者/工作階段路由欄位。代理人會收到
一個精簡、編輯過的 `Slack interaction: ...` 系統事件。如果處理程序傳回
`systemEvent.summary`、`systemEvent.reference` 或 `systemEvent.data`，那些
欄位會包含在該精簡事件中，讓代理人在不查看完整表單負載的情況下參考
外掛程式擁有的儲存空間。

## Slack 中的執行核准

Slack 可以作為具有互動式按鈕和互動的原生核准用戶端，而不是退而求其次使用 Web UI 或終端機。

- 執行核准使用 `channels.slack.execApprovals.*` 進行原生 DM/頻道路由。
- 當請求已經傳送到 Slack 且核准 ID 類型為 `plugin:` 時，外掛程式核准仍然可以透過相同的 Slack 原生按鈕介面來解決。
- 核准者授權仍然會被強制執行：只有被識別為核准者的使用者可以透過 Slack 核准或拒絕請求。

這使用與其他通道相同的共用核准按鈕介面。當在您的 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中呈現為 Block Kit 按鈕。
當出現這些按鈕時，它們是主要的核准使用者體驗；僅當工具結果指出聊天
核准無法使用或手動核准是唯一途徑時，OpenClaw
才應包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (選用；盡可能退回至 `commands.ownerAllowFrom`)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
- `agentFilter`、`sessionFilter`

當 `enabled` 未設定或為 `"auto"` 且至少有一位審核者解決時，Slack 會自動啟用原生執行審核。設定 `enabled: false` 以明確停用 Slack 作為原生審核用戶端。設定 `enabled: true` 以在審核者解決時強制開啟原生審核。

未設定明確 Slack 執行審核組態時的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有在您想要覆寫審核者、新增篩選器或選擇加入原始聊天傳遞時，才需要明確的 Slack 原生組態：

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

共用 `approvals.exec` 轉發是分開的。僅在執行審核提示也必須路由到其他聊天或明確的非頻段目標時使用。共用 `approvals.plugin` 轉發也是分開的；當這些請求已經抵達 Slack 時，Slack 原生按鈕仍然可以解決外掛程式審核。

同聊天 `/approve` 也適用於已支援指令的 Slack 頻道和 DM。請參閱 [執行審核](/zh-Hant/tools/exec-approvals) 以了解完整的審核轉發模型。

## 事件和操作行為

- 訊息編輯/刪除會對應到系統事件。
- 執行緒廣播（「同時傳送到頻道」的執行緒回覆）會被處理為一般使用者訊息。
- 表情符號新增/移除事件會對應到系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應到系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道組態金鑰。
- 頻道主題/用途元資料被視為不受信任的上下文，並可以注入到路由上下文中。
- 執行緒啟動者和初始執行緒歷史上下文播種會在適用時根據設定的寄件者允許清單進行篩選。
- 區塊動作和模態互動會發出結構化的 `Slack interaction: ...` 系統事件，並包含豐富的負載欄位：
  - 區塊動作：選定的值、標籤、選擇器值和 `workflow_*` 元資料
  - 模態 `view_submission` 和 `view_closed` 事件，包含路由頻道元資料和表單輸入

## 組態參考

主要參考：[組態參考 - Slack](/zh-Hant/gateway/config-channels#slack)。

<Accordion title="高訊號 Slack 欄位">

- 模式/驗證：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
- DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom`（舊版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
- 相容性切換開關：`dangerouslyAllowNameMatching`（緊急應變；除非否則需要，否則請保持關閉）
- 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
- 執行緒/歷史記錄：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
- 取消展開：`unfurlLinks`（預設值：`false`），用於 `chat.postMessage` 連結/媒體預覽控制的 `unfurlMedia`；設定 `unfurlLinks: true` 以重新選擇加入連結預覽
- 運作/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

</Accordion>

## 疑難排解

<AccordionGroup>
  <Accordion title="No replies in channels">
    按順序檢查：

    - `groupPolicy`
    - 頻道允許名單 (`channels.slack.channels`) — **金鑰必須是頻道 ID** (`C12345678`)，而不是名稱 (`#channel-name`)。在 `groupPolicy: "allowlist"` 下，基於名稱的金鑰會無聲失敗，因為頻道路由預設以 ID 為優先。要尋找 ID：在 Slack 中對頻道按右鍵 → **Copy link** — URL 結尾的 `C...` 值即為頻道 ID。
    - `requireMention`
    - 每個頻道的 `users` 允許名單
    - `messages.groupChat.visibleReplies`：如果它是 `"message_tool"` 且日誌顯示助理文字但沒有 `message(action=send)` 呼叫，表示模型錯過了可見訊息工具路徑。在此模式下，最終文字保持私密；請檢查 gateway 詳細日誌中的已隱藏 payload 元資料，或者如果您希望每個正常的助理最終回覆都透過舊版路徑發布，請將其設為 `"automatic"`。
    - `messages.groupChat.unmentionedInbound`：如果它是 `"room_event"`，未提及的允許頻道閒聊將為環境語境並保持靜默，除非代理呼叫 `message` 工具。請參閱 [Ambient room events](/zh-Hant/channels/ambient-room-events)。

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
    - 配對核准 / 允許名單項目 (`dmPolicy: "open"` 仍需要 `channels.slack.allowFrom: ["*"]`)
    - 群組 DM 使用 MPIM 處理；啟用 `channels.slack.dm.groupEnabled` 並且如果有設定的話，請在 `channels.slack.dm.groupChannels` 中包含 MPIM
    - Slack Assistant DM 事件：提及 `drop message_changed` 的詳細日誌通常表示 Slack 發送了一個編輯過的 Assistant-thread 事件，且在訊息元資料中沒有可復原的人類傳送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    驗證 Slack 應用程式設定中的 bot + 應用程式權杖和 Socket Mode 啟用狀態。
    `xapp-...` App-Level Token 需要 `connections:write`，且 `xoxb-...`
    bot 權杖必須屬於與應用程式權杖相同的 Slack 應用程式/工作區。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示已設定
    Slack 帳戶，但目前的執行階段無法解析以 SecretRef 為基礎的
    值。

    諸如 `slack socket mode failed to start; retry ...` 的日誌是可恢復的
    啟動失敗。遺漏範圍、撤銷的權杖和無效的驗證則會快速失敗。
    `slack token mismatch ...` 日誌表示 bot 權杖和應用程式權杖
    似乎屬於不同的 Slack 應用程式；請修正 Slack 應用程式憑證。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - 簽署密鑰
    - webhook 路徑
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每個 HTTP 帳戶的唯一 `webhookPath`
    - 公用 URL 終止 TLS 並將請求轉送至 Gateway 路徑
    - Slack 應用程式 `request_url` 路徑完全符合 `channels.slack.webhookPath` (預設 `/slack/events`)

    如果 `signingSecretStatus: "configured_unavailable"` 出現在帳戶
    快照中，表示已設定 HTTP 帳戶，但目前的執行階段無法
    解析以 SecretRef 為基礎的簽署密鑰。

    重複的 `slack: webhook path ... already registered` 日誌表示有兩個 HTTP
    帳戶使用相同的 `webhookPath`；請為每個帳戶指定不同的路徑。

  </Accordion>

  <Accordion title="原生/斜線指令未觸發">
    請確認您原本的意圖是：

    - 原生指令模式 (`channels.slack.commands.native: true`) 並搭配在 Slack 中註冊的相符斜線指令
    - 或是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    Slack 不會自動建立或移除斜線指令。`commands.native: "auto"` 並不會啟用 Slack 原生指令；請使用 `true` 並在 Slack 應用程式中建立相符的指令。在 HTTP 模式下，每個 Slack 斜線指令都必須包含 Gateway URL。在 Socket Mode 中，指令承載透過 websocket 傳送，而 Slack 會忽略 `slash_commands[].url`。

    此外，請檢查 `commands.useAccessGroups`、DM 授權、頻道允許清單，
    以及各頻道的 `users` 允許清單。對於
    被封鎖的斜線指令發送者，Slack 會傳回暫時性錯誤，包括：

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>

## 附件視覺參考

當 Slack 檔案下載成功且大小限制允許時，Slack 可以將下載的媒體附加至代理回合。圖片檔案可以透過媒體理解路徑傳遞，或是直接傳遞給具備視覺能力的回覆模型；其他檔案則會保留為可下載的檔案上下文，而不會被視為圖片輸入。

### 支援的媒體類型

| 媒體類型                     | 來源            | 目前行為                                                             | 備註                                                   |
| ---------------------------- | --------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| JPEG / PNG / GIF / WebP 圖片 | Slack 檔案 URL  | 下載並附加至回合以進行具備視覺能力的處理                             | 單一檔案上限：`channels.slack.mediaMaxMb` (預設 20 MB) |
| PDF 檔案                     | Slack 檔案 URL  | 下載並以檔案上下文形式提供給諸如 `download-file` 或 `pdf` 等工具使用 | Slack 傳入不會自動將 PDF 轉換為圖片視覺輸入            |
| 其他檔案                     | Slack 檔案 URL  | 盡可能下載並以檔案上下文形式提供                                     | 二進位檔案不被視為圖片輸入                             |
| 執行緒回覆                   | 執行緒起始檔案  | 當回覆沒有直接媒體時，根訊息檔案可以作為上下文載入                   | 僅包含檔案的起始訊息會使用附件預留位置                 |
| 多圖片訊息                   | 多個 Slack 檔案 | 每個檔案都會獨立評估                                                 | Slack 處理限制為每則訊息八個檔案                       |

### 傳入管線

當包含檔案附件的 Slack 訊息到達時：

1. OpenClaw 使用機器人權杖 (`xoxb-...`) 從 Slack 的私人 URL 下載檔案。
2. 成功時，檔案會被寫入媒體存放區。
3. 下載的媒體路徑和內容類型會被新增到輸入上下文中。
4. 支援圖像的模型/工具路徑可以使用該上下文中的圖像附件。
5. 非圖像檔案仍會作為檔案元資料或媒體參照提供給可處理它們的工具。

### 執行緒根附件繼承

當訊息到達執行緒時（具有 `thread_ts` 父級）：

- 如果回覆本身沒有直接媒體，且包含的根訊息有檔案，Slack 可以將根檔案填充為執行緒起始器上下文。
- 直接回覆附件優先於根訊息附件。
- 僅包含檔案而沒有文字的根訊息會以附件預留位置表示，以便回退仍然可以包含其檔案。

### 多附件處理

當單一 Slack 訊息包含多個檔案附件時：

- 每個附件都會透過媒體管線獨立處理。
- 下載的媒體參照會匯總到訊息上下文中。
- 處理順序遵循事件有效負載中 Slack 的檔案順序。
- 一個附件下載失敗不會阻礙其他附件。

### 大小、下載和模型限制

- **大小上限**：預設每個檔案 20 MB。可透過 `channels.slack.mediaMaxMb` 設定。
- **下載失敗**：Slack 無法提供、過期 URL、無法存取的檔案、過大檔案，以及 Slack auth/login HTML 回應都會被跳過，而不會回報為不支援的格式。
- **視覺模型**：當使用中的回覆模型支援視覺功能時，圖像分析會使用該模型；或是使用在 `agents.defaults.imageModel` 設定的圖像模型。

### 已知限制

| 情境                         | 目前行為                                                  | 解決方法                                                              |
| ---------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Slack 檔案 URL 過期          | 檔案已跳過；未顯示錯誤                                    | 在 Slack 中重新上傳檔案                                               |
| 未設定視覺模型               | 圖像附件會儲存為媒體參照，但不會作為圖像進行分析          | 設定 `agents.defaults.imageModel` 或使用支援視覺功能的回覆模型        |
| 非常大的圖像（預設 > 20 MB） | 因大小上限而跳過                                          | 如果 Slack 允許，請增加 `channels.slack.mediaMaxMb`                   |
| 轉發/共享附件                | 文字和 Slack 託管的圖像/檔案媒體為盡力而為（best-effort） | 直接在 OpenClaw 串流中重新分享                                        |
| PDF 附件                     | 儲存為檔案/媒體上下文，不會自動透過圖片視覺功能進行路由   | 使用 `download-file` 取得檔案中繼資料，或使用 `pdf` 工具進行 PDF 分析 |

### 相關文件

- [媒體理解流程](/zh-Hant/nodes/media-understanding)
- [PDF 工具](/zh-Hant/tools/pdf)
- Epic: [#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件視覺功能啟用
- 回歸測試：[#51353](https://github.com/openclaw/openclaw/issues/51353)
- 即時驗證：[#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Slack 使用者配對至閘道。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    頻道和群組私訊的行為。
  </Card>
  <Card title="頻道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理人。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與強化防護。
  </Card>
  <Card title="設定" icon="sliders" href="/zh-Hant/gateway/configuration">
    設定版面配置與優先順序。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    指令目錄與行為。
  </Card>
</CardGroup>
