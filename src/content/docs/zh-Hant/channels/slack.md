---
summary: "Slack 設定和執行時期行為（Socket Mode + HTTP Request URLs）"
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
  <Card title="頻道疑難排解" icon="wrench" href="/zh-Hant/channels/troubleshooting">
    跨頻道診斷與修復手冊。
  </Card>
</CardGroup>

## 選擇 Socket Mode 或 HTTP Request URLs

兩種傳輸方式皆已具備生產環境就緒狀態，並在訊息傳遞、斜線指令、App Home 與互動功能上達到功能對等。請依據部署形狀選擇，而非功能。

| 考量點              | Socket Mode（預設）                                                            | HTTP Request URLs                                                                  |
| ------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 公網閘道 URL        | 不需要                                                                         | 需要（DNS、TLS、反向代理或通道）                                                   |
| 對外網路            | 到 `wss-primary.slack.com` 的出站 WSS 必須可連線                               | 無對外 WS；僅接受對內 HTTPS                                                        |
| 所需權杖            | Bot 權杖（`xoxb-...`）+ 應用層級權杖（`xapp-...`），並具備 `connections:write` | Bot 權杖（`xoxb-...`）+ 簽署金鑰                                                   |
| 開發筆電 / 防火牆後 | 可直接運作                                                                     | 需要公網通道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或暫存閘道               |
| 水平擴展            | 每個主機上的每個 App 一個 Socket Mode 連線階段；多個閘道需要分開的 Slack Apps  | 無狀態 POST 處理器；多個閘道副本可在負載平衡器後共用一個 App                       |
| 單一閘道上的多帳號  | 支援；每個帳號開啟自己的 WS                                                    | 支援；每個帳戶需要唯一的 `webhookPath`（預設為 `/slack/events`），以免註冊發生衝突 |
| 斜線指令傳輸        | 透過 WS 連線傳送；`slash_commands[].url` 會被忽略                              | Slack POST 到 `slash_commands[].url`；此欄位是指令分派所必需                       |
| 請求簽名            | 未使用（驗證是應用層級 Token）                                                 | Slack 會簽署每個請求；OpenClaw 使用 `signingSecret` 進行驗證                       |
| 連線中斷後的恢復    | Slack SDK 會自動重新連線；閘道的 pong-timeout 傳輸微調適用                     | 沒有持久連線會中斷；重試由 Slack 端逐個請求進行                                    |

<Note>
  針對單一 Gateway 主機、開發筆電，以及可連線到出站 `*.slack.com` 但無法接受入站 HTTPS 的內部部署網路，**請選擇 Socket Mode**。

當在負載平衡器後方執行多個 Gateway 副本、當出站 WSS 受到阻擋但允許入站 HTTPS，或當您已經在反向代理終止 Slack Webhook 時，**請選擇 HTTP Request URLs**。

</Note>

## 安裝

在設定頻道之前先安裝 Slack：

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` 會註冊並啟用此外掛。此外掛在您於下方設定 Slack 應用程式和頻道設定前仍然不會執行任何動作。請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解一般外掛行為與安裝規則。

## 快速設定

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create a new Slack app">
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選擇您的工作區 → 貼上下列其中一個設定檔 → **Next** → **Create**。

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
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
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
      "bot_events": ["app_home_opened", "app_mention", "message.channels", "message.groups", "message.im"]
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** 符合 Slack 外掛的完整功能集：App Home、斜線指令、檔案、回應反應、釘選、群組 DM，以及 emoji/使用者群組讀取。當工作區政策限制了權限範圍 (scopes) 時，請選擇 **Minimal** — 它涵蓋 DM、頻道/群組歷史記錄、提及和斜線指令，但會捨棄檔案、回應反應、釘選、群組-DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各個權限範圍的原理以及額外科線指令等附加選項。
        </Note>

        當 Slack 建立應用程式後：

        - **Basic Information → App-Level Tokens → Generate Token and Scopes**：新增 `connections:write`，儲存，然後複製 `xapp-...` 數值。
        - **Install App → Install to Workspace**：複製 `xoxb-...` Bot User OAuth Token。

      </Step>

      <Step title="Configure OpenClaw">

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

        Env 後備方案 (僅限預設帳戶)：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
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
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選擇您的工作區 → 貼上下列其中一份清單 → 將 `https://gateway-host.example.com/slack/events` 替換為您的公開 Gateway URL → **Next** → **Create**。

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
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
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
      "bot_events": ["app_home_opened", "app_mention", "message.channels", "message.groups", "message.im"]
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
          **Recommended** 符合 Slack 外掛的完整功能集；**Minimal** 則針對受限的工作區移除了檔案、表情回應、釘選、群組 DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各範圍的設計理由。
        </Note>

        <Info>
          三個 URL 欄位 (`slash_commands[].url`、`event_subscriptions.request_url` 和 `interactivity.request_url` / `message_menu_options_url`) 都指向同一個 OpenClaw 端點。Slack 的 manifest 結構描述要求它們必須分別命名，但 OpenClaw 是根據 payload 類型進行路由，因此只需一個 `webhookPath` (預設為 `/slack/events`) 即可。在 HTTP 模式下，沒有 `slash_commands[].url` 的斜線指令將會靜默無效。
        </Info>

        Slack 建立應用程式後：

        - **Basic Information → App Credentials**：複製 **Signing Secret** 以驗證請求。
        - **Install App → Install to Workspace**：複製 `xoxb-...` Bot User OAuth Token。

      </Step>

      <Step title="Configure OpenClaw">

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
        在多帳號 HTTP 中使用唯一的 webhook 路徑

        為每個帳號指定不同的 `webhookPath` (預設為 `/slack/events`)，以免註冊發生衝突。
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

僅針對記錄 Slack websocket pong/server-ping 逾時或在已知會發生事件迴圈飢餓的主機上執行的 Socket Mode 工作區使用此設定。`clientPingTimeout` 是 SDK 發送 client ping 後的 pong 等待時間；`serverPingTimeout` 是等待 Slack server pings 的時間。App 訊息和事件保持為應用程式狀態，而非傳輸活躍訊號。

## Manifest 和範圍檢查清單

基礎 Slack app manifest 對於 Socket Mode 和 HTTP Request URLs 是相同的。只有 `settings` 區塊（以及斜線指令 `url`）不同。

基礎 manifest（Socket Mode 預設）：

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
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

對於 **HTTP Request URLs 模式**，請將 `settings` 替換為 HTTP 變體，並將 `url` 加入每個斜線指令。需要公開 URL：

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
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

### 其他 manifest 設定

展示擴充上述預設值的不同功能。

預設 manifest 會啟用 Slack App Home **Home** 分頁並訂閱 `app_home_opened`。當工作區成員開啟 Home 分頁時，OpenClaw 會發佈一個安全的預設 Home 檢視，其中包含 `views.publish`；不包含對話 payload 或私人設定。**Messages** 分頁對於 Slack DMs 保持啟用狀態。

<AccordionGroup>
  <Accordion title="選用的原生斜線指令">

    可以使用多個 [原生斜線指令](#commands-and-slash-behavior) 來代替單一配置的指令，以提供更細緻的差異：

    - 使用 `/agentstatus` 而不是 `/status`，因為 `/status` 指令已被保留。
    - 最多只能同時提供 25 個斜線指令。

    將您現有的 `features.slash_commands` 區段替換為 [可用指令](/zh-Hant/tools/slash-commands#command-list) 的子集：

    <Tabs>
      <Tab title="Socket 模式 (預設)">

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
        使用與上述 Socket 模式相同的 `slash_commands` 列表，並在每個項目中加入 `"url": "https://gateway-host.example.com/slack/events"`。範例：

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
  <Accordion title="選用的作者身分範圍 (寫入操作)">
    如果您希望外傳訊息使用作用中的代理程式身分 (自訂使用者名稱和圖示) 而非預設的 Slack 應用程式身分，請新增 `chat:write.customize` bot 範圍。

    如果您使用 emoji 圖示，Slack 預期 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="選用的使用者權杖範圍 (讀取操作)">
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

## 權杖模型

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP mode 需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字字串或 SecretRef 物件。
- Config tokens 會覆蓋 env fallback。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` env fallback 僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅適用於 config (無 env fallback)，且預設為唯讀行為 (`userTokenReadOnly: true`)。

Status snapshot 行為：

- Slack 帳戶檢查會追蹤各個認證的 `*Source` 和 `*Status` 欄位 (`botToken`、`appToken`、`signingSecret`、`userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳戶透過 SecretRef 或其他非內嵌 secret 來源進行配置，但目前的指令/執行路徑無法解析實際值。
- 在 HTTP mode 中包含 `signingSecretStatus`；在 Socket Mode 中，必需的配對為 `botTokenStatus` + `appTokenStatus`。

<Tip>對於 actions/directory 讀取，若已配置可優先使用 user token。對於寫入，bot token 仍為優先；僅當設定 `userTokenReadOnly: false` 且無 bot token 時，才允許 user-token 寫入。</Tip>

## Actions 和 gates

Slack actions 由 `channels.slack.actions.*` 控制。

目前 Slack 工具中可用的 action groups：

| Group      | Default |
| ---------- | ------- |
| messages   | enabled |
| reactions  | enabled |
| pins       | enabled |
| memberInfo | enabled |
| emojiList  | enabled |

目前的 Slack 訊息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受顯示於傳入檔案佔位符中的 Slack 檔案 ID，並針對圖片傳回圖片預覽，或針對其他檔案類型傳回本機檔案中繼資料。

## 存取控制與路由

<Tabs>
  <Tab title="DM 政策">
    `channels.slack.dmPolicy` 控制存取權。`channels.slack.allowFrom` 是正式的 DM 允許清單。

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
    - 當具名帳號自身的 `allowFrom` 未設定時，會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    為了相容性，仍會讀取舊版 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom`。當可以在不變更存取權的情況下進行時，`openclaw doctor --fix` 會將其遷移至 `dmPolicy` 和 `allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，且**必須使用穩定的 Slack 頻道 ID**（例如 `C12345678`）作為設定鍵值。

    執行時期注意事項：如果 `channels.slack` 完全遺失（僅環境變數設定），執行時期會回退至 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 存取權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設定值，但預設會在路由時被忽略
    - 連入授權和頻道路由預設以 ID 為優先；直接的使用者名稱/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基於名稱的鍵值（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不會**匹配。頻道查找預設以 ID 為優先，因此基於名稱的鍵值將永遠無法成功路由，且該頻道中的所有訊息都會被靜默阻擋。這與 `groupPolicy: "open"` 不同，後者不需要頻道鍵值即可進行路由，且基於名稱的鍵值似乎可以運作。

    請務必使用 Slack 頻道 ID 作為鍵值。若要尋找它：在 Slack 中對該頻道按一下滑鼠右鍵 → **複製連結** — ID (`C...`) 會出現在 URL 的結尾。

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

    錯誤（在 `groupPolicy: "allowlist"` 下會被靜默阻擋）：

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

  <Tab title="提及與頻道用戶">
    頻道訊息預設由提及控制。

    提及來源：

    - 明確的應用程式提及 (`<@botId>`)
    - Slack 使用者群組提及 (`<!subteam^S...>`)，當機器人使用者是該使用者群組的成員時；需要 `usergroups:read`
    - 提及正則表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人串續行為 (當 `thread.requireExplicitMention` 為 `true` 時停用)

    每個頻道的控制項 (`channels.slack.channels.<id>`；名稱僅透過啟動解析或 `dangerouslyAllowNameMatching`)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`，`toolsBySender`
    - `toolsBySender` 金鑰格式：`channel:`、`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

    `allowBots` 對頻道和私人頻道採取保守策略：僅當傳送的機器人在該房間的 `users` 允許清單中被明確列出，或當來自 `channels.slack.allowFrom` 的至少一個明確 Slack 擁有者 ID 目前是房間成員時，才會接受由機器人建立的房間訊息。萬用字元和顯示名稱的擁有者項目不滿足擁有者在場的要求。擁有者在場檢查使用 Slack `conversations.members`；請確保應用程式具有該房間類型的相符讀取範圍 (公開頻道為 `channels:read`，私人頻道為 `groups:read`)。如果成員查詢失敗，OpenClaw 將捨棄由機器人建立的房間訊息。

  </Tab>
</Tabs>

## 串續、會話和回覆標籤

- DM 路由為 `direct`；頻道路由為 `channel`；MPIM 路由為 `group`。
- Slack 路由綁定接受原始 peer ID 以及 Slack 目標形式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用預設的 `session.dmScope=main`，Slack 私訊會合併至 agent 主要 session。
- Channel sessions：`agent:<agentId>:slack:channel:<channelId>`。
- Thread 回覆可以在適用時建立 thread session 後綴（`:thread:<threadTs>`）。
- 在 OpenClaw 處理頂層訊息而不需要明確提及的 channels 中，非 `off` `replyToMode` 會將每個處理過的根節點路由到 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`，因此可見的 Slack thread 會從第一個回合開始對應到一個 OpenClaw session。
- `channels.slack.thread.historyScope` 預設為 `thread`；`thread.inheritParent` 預設為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新 thread session 開始時擷取多少現有的 thread 訊息（預設 `20`；設為 `0` 以停用）。
- `channels.slack.thread.requireExplicitMention`（預設 `false`）：當 `true` 時，抑制隱含的 thread 提及，因此 bot 僅回覆 thread 內明確的 `@bot` 提及，即使 bot 已經參與該 thread。若無此設定，在 bot 參與的 thread 中的回覆將繞過 `requireMention` 閘道。

回覆 thread 控制項：

- `channels.slack.replyToMode`：`off|first|all|batched`（預設 `off`）
- `channels.slack.replyToModeByChatType`：每個 `direct|group|channel`
- 直接聊天（direct chats）的舊版回退：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

若要從 `message` 工具發出明確的 Slack 執行緒回覆，請使用 `action: "send"` 和 `threadId` 或 `replyTo` 設定 `replyBroadcast: true`，以要求 Slack 一併將執行緒回覆廣播至父頻道。這對應至 Slack 的 `chat.postMessage` `reply_broadcast` 標誌，且僅支援文字或 Block Kit 傳送，不支援媒體上傳。

當 `message` 工具呼叫在 Slack 執行緒內執行並目標指向同一頻道時，OpenClaw 通常會根據 `replyToMode` 繼承目前的 Slack 執行緒。請在 `action: "send"` 或 `action: "upload-file"` 上設定 `topLevel: true` 以強制改為傳送新的父頻道訊息。`threadId: null` 被接受為同等的頂層退出選項。

<Note>`replyToMode="off"` 會停用 Slack 中 **所有** 回覆執行緒，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，在 Telegram 中，明確的標籤在 `"off"` 模式下仍會被遵守。Slack 執行緒會從頻道中隱藏訊息，而 Telegram 回覆則會保持可見的內嵌狀態。</Note>

## Ack 回應

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送一個確認 emoji。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身分 emoji 後備機制 (`agents.list[].identity.emoji`，否則為 "👀")

備註：

- Slack 期望使用簡碼 (例如 `"eyes"`)。
- 使用 `""` 以針對 Slack 帳號或全域停用回應。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：以最新的部分輸出取代預覽文字。
- `block`：附加分塊的預覽更新。
- `progress`：在產生時顯示進度狀態文字，然後傳送最終文字。
- `streaming.preview.toolProgress`：當草稿預覽啟用時，將工具/進度更新導向至同一個已編輯的預覽訊息（預設：`true`）。設定 `false` 以保留個別的工具/進度訊息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：設定為 `status` 以保留精簡的工具進度行，同時隱藏原始指令/exec 文字（預設：`raw`）。

隱藏原始指令/exec 文字並保留精簡進度行：

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

- 必須有回覆串才能顯示原生文字串流和 Slack 助理串狀態。串的選擇仍遵循 `replyToMode`。
- 當原生串流無法使用或不存在回覆串時，頻道、群組聊天和頂層 DM 根訊息仍可使用一般草稿預覽。
- 頂層 Slack DM 預設保持非串模式，因此不會顯示 Slack 的串狀原生串流/狀態預覽；OpenClaw 會改為在 DM 中張貼並編輯草稿預覽。
- 媒體和非文字酬載會回退至正常傳遞。
- 媒體/錯誤的最終訊息會取消待處理的預覽編輯；合资格的文字/區塊最終訊息僅在能就地編輯預覽時才會排送。
- 如果串流在回覆中途失敗，OpenClaw 會將剩餘酬載回退至正常傳遞。

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
- 舊版 `channels.slack.nativeStreaming` 是 `channels.slack.streaming.nativeTransport` 的執行時別名。
- 執行 `openclaw doctor --fix` 以將持續性 Slack 串流設定重寫為標準金鑰。

## 輸入中反應回退

`typingReaction` 會在 OpenClaw 處理回覆時，對傳入的 Slack 訊息新增一個暫時性的回應，並在執行完成時將其移除。這在執行緒回覆之外最為有用，因為執行緒回覆會使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

備註：

- Slack 預期使用短代碼（例如 `"hourglass_flowing_sand"`）。
- 回應採用盡力而為 的方式，並會在回覆或失敗路徑完成後嘗試自動清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 檔案附件會從 Slack 託管的私有 URL 下載（經過 Token 認證的請求流程），並在擷取成功且大小限制允許時寫入媒體儲存庫。檔案預留位置包含 Slack `fileId`，以便代理程式可以使用 `download-file` 擷取原始檔案。

    下載會使用受限的閒置和總計逾時時間。如果 Slack 檔案擷取停滯或失敗，OpenClaw 會繼續處理訊息並回退至檔案預留位置。

    執行時傳入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

  <Accordion title="Outbound text and files">
    - 文字區塊使用 `channels.slack.textChunkLimit`（預設 4000）
    - `channels.slack.chunkMode="newline"` 啟用段落優先分割
    - 檔案傳送使用 Slack 上傳 API，並可包含執行緒回覆（`thread_ts`）
    - 傳出媒體上限在設定時遵循 `channels.slack.mediaMaxMb`；否則頻道傳送使用媒體管線的 MIME 類型預設值

  </Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - `user:<id>` 用於 DM
    - `channel:<id>` 用於頻道

    僅包含文字/區塊的 Slack DM 可以直接發佈到使用者 ID；由於檔案上傳和執行緒傳送需要具體的對話 ID，因此會先透過 Slack 對話 API 開啟 DM。

  </Accordion>
</AccordionGroup>

## 指令與斜線行為

Slash 指令在 Slack 中顯示為單一已配置指令或多個原生指令。配置 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要您 Slack 應用程式中的 [額外清單設定](#additional-manifest-settings)，並且是在全域設定中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 來啟用。

- Slack 的原生指令自動模式為「關閉」，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生參數選單使用自適應渲染策略，在發送所選選項值之前顯示確認對話方塊：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選擇選單
- 超過 100 個選項：當有互動選項處理程式可用時，使用外部選擇搭配非同步選項篩選
- 超過 Slack 限制：編碼的選項值會回退至按鈕

```txt
/think
```

Slash 工作階段使用像 `agent:<agentId>:slack:slash:<userId>` 這樣的隔離金鑰，並且仍然使用 `CommandTargetSessionKey` 將指令執行路由傳送至目標對話工作階段。

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

啟用後，代理程式可以發出 Slack 專用的回覆指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

這些指令會編譯成 Slack Block Kit，並透過現有的 Slack 互動事件路徑將點擊或選擇路由傳回。

備註：

- 這是 Slack 專用的 UI。其他通道不會將 Slack Block Kit 指令轉換為其自己的按鈕系統。
- 互動式回呼值是 OpenClaw 產生的不透明權杖，而非原始代理程式建立的值。
- 如果產生的互動區塊會超過 Slack Block Kit 限制，OpenClaw 會回退至原始文字回覆，而不是傳送無效的區塊負載。

## Slack 中的執行核准

Slack 可作為具有互動式按鈕和互動的原生核准用戶端，而不必回退至 Web UI 或終端機。

- Exec approvals 使用 `channels.slack.execApprovals.*` 進行原生 DM/頻道路由。
- 當請求已抵達 Slack 且核准 ID 類型為 `plugin:` 時，Plugin approvals 仍可透過相同的 Slack 原生按鈕介面進行解析。
- 仍會執行核准者授權：只有被識別為核准者的使用者才能透過 Slack 核准或拒絕請求。

這與其他通道使用相同的共用核准按鈕介面。當您在 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中呈現為 Block Kit 按鈕。
當這些按鈕存在時，它們是主要的核准使用者體驗 (UX)；當工具結果顯示聊天核准無法使用或手動核准是唯一途徑時，OpenClaw
才應包含手動 `/approve` 指令。

Config 路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (選用；若可能則回退至 `commands.ownerAllowFrom`)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設值：`dm`)
- `agentFilter`、`sessionFilter`

當 `enabled` 未設定或為 `"auto"` 且至少有一名
核准者解析時，Slack 會自動啟用原生 exec approvals。設定 `enabled: false` 可明確停用 Slack 作為原生核准用戶端。
設定 `enabled: true` 可在核准者解析時強制開啟原生核准。

無明確 Slack exec approval 設定時的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有在您想要覆寫核准者、新增篩選器或
選擇啟用 origin-chat 傳遞時，才需要明確的 Slack 原生設定：

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

共用 `approvals.exec` 轉發是分開的。僅當 exec approval 提示也必須
路由至其他聊天或明確的頻外 (out-of-band) 目標時才使用。共用 `approvals.plugin` 轉發也是
分開的；當這些請求已抵達
Slack 時，Slack 原生按鈕仍可解析 plugin approvals。

Same-chat `/approve` 也適用於已支援指令的 Slack 頻道和 DM。有關完整的核准轉送模型，請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals)。

## 事件和操作行為

- 訊息編輯/刪除會對應到系統事件。
- 串播（「同時傳送至頻道」的串列回覆）會被處理為一般使用者訊息。
- 反應新增/移除事件會對應到系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會對應到系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道配置金鑰。
- 頻道主題/用途中繼資料被視為不受信任的上下文，並且可以注入到路由上下文中。
- Thread starter 和初始 thread-history 上下文播種會在適用時根據設定的發送者允許清單進行篩選。
- 區塊動作和模式互動會發出具有豐富 payload 欄位的結構化 `Slack interaction: ...` 系統事件：
  - 區塊動作：選定的值、標籤、選擇器值，以及 `workflow_*` 中繼資料
  - 帶有路由頻道中繼資料和表單輸入的模式 `view_submission` 和 `view_closed` 事件

## 設定參考

主要參考：[Configuration reference - Slack](/zh-Hant/gateway/config-channels#slack)。

<Accordion title="關鍵 Slack 欄位">

- mode/auth：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
- DM 存取：`dm.enabled`、`dmPolicy`、`allowFrom`（舊版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
- 相容性切換：`dangerouslyAllowNameMatching`（緊急情況使用；除非必要請保持關閉）
- 頻道存取：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
- 執行緒/歷史記錄：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 傳遞：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
- 展開連結：`unfurlLinks`、`unfurlMedia`，用於 `chat.postMessage` 連結/媒體預覽控制
- 運作/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

</Accordion>

## 疑難排解

<AccordionGroup>
  <Accordion title="No replies in channels">
    請依序檢查：

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`) — **金鑰必須是頻道 ID** (`C12345678`)，而非名稱 (`#channel-name`)。在 `groupPolicy: "allowlist"` 中，基於名稱的金鑰會靜默失敗，因為頻道路由預設以 ID 為優先。若要尋找 ID：在 Slack 中對頻道按右鍵 → **Copy link** — 網址末尾的 `C...` 值即為頻道 ID。
    - `requireMention`
    - 每個頻道的 `users` 允許清單

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
    - `channels.slack.dmPolicy` (或舊版的 `channels.slack.dm.policy`)
    - 配對核准 / 允許清單項目
    - Slack Assistant DM 事件：提及 `drop message_changed` 的詳細記錄
      通常代表 Slack 發送了一個編輯過的 Assistant-thread 事件，且在訊息中繼資料中
      沒有可復原的人類傳送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    在 Slack 應用程式設定中驗證 bot + app 權杖以及 Socket Mode 是否已啟用。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳號
    已設定，但目前的執行階段無法解析 SecretRef 支援的
    數值。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    驗證：

    - 簽署金鑰
    - webhook 路徑
    - Slack Request URLs (事件 + 互動 + 斜線指令)
    - 每個 HTTP 帳號唯一的 `webhookPath`

    如果帳號
    快照中出現 `signingSecretStatus: "configured_unavailable"`，表示 HTTP 帳號已設定，但目前的執行階段無法
    解析 SecretRef 支援的簽署金鑰。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    請驗證您原本的意圖：

    - 原生命令模式 (`channels.slack.commands.native: true`)，並搭配已在 Slack 中註冊的相符斜線命令
    - 或是單一斜線命令模式 (`channels.slack.slashCommand.enabled: true`)

    同時也請檢查 `commands.useAccessGroups` 以及頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 附件視覺參考

當 Slack 檔案下載成功且符合大小限制時，Slack 可以將下載的媒體附加至代理人輪次。圖片檔案可以透過媒體理解路徑傳遞，或直接傳送至具備視覺能力的回覆模型；其他檔案則會保留為可下載的檔案上下文，而不會被視為圖片輸入。

### 支援的媒體類型

| 媒體類型                     | 來源            | 目前行為                                                             | 備註                                                   |
| ---------------------------- | --------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| JPEG / PNG / GIF / WebP 圖片 | Slack 檔案 URL  | 已下載並附加至輪次以進行具備視覺能力的處理                           | 每個檔案上限：`channels.slack.mediaMaxMb` (預設 20 MB) |
| PDF 檔案                     | Slack 檔案 URL  | 已下載並公開為檔案上下文，供諸如 `download-file` 或 `pdf` 等工具使用 | Slack 傳入不會自動將 PDF 轉換為圖片視覺輸入            |
| 其他檔案                     | Slack 檔案 URL  | 盡可能下載並公開為檔案上下文                                         | 二進位檔案不會被視為圖片輸入                           |
| 執行緒回覆                   | 執行緒啟動檔案  | 當回覆沒有直接媒體時，根訊息 檔案可以補充為上下文                    | 僅含檔案的啟動會使用附件預留位置                       |
| 多圖片訊息                   | 多個 Slack 檔案 | 每個檔案都會獨立評估                                                 | Slack 處理限制為每則訊息八個檔案                       |

### 傳入管線

當包含附件檔案的 Slack 訊息到達時：

1. OpenClaw 會使用 Bot 權杖 (`xoxb-...`) 從 Slack 的私有 URL 下載檔案。
2. 成功後，檔案會寫入媒體存放區。
3. 下載的媒體路徑和內容類型會加入至傳入上下文。
4. 具備圖片功能的模型/工具路徑可以使用該上下文中的圖片附件。
5. 非圖片檔案仍會保留為檔案元資料或媒體參考，供能處理這些檔案的工具使用。

### 執行緒根附件繼承

當訊息到達執行緒時 (具有 `thread_ts` 父層)：

- 如果回覆本身沒有直接媒體，且包含的根訊息有檔案，Slack 可以將根檔案作為執行緒啟動上下文進行補充。
- 直接回覆附件優先於根訊息附件。
- 僅包含檔案而沒有文字的根訊息會以附件佔位符表示，以便後備選項仍能包含其檔案。

### 多附件處理

當單一 Slack 訊息包含多個檔案附件時：

- 每個附件會透過媒體管線獨立處理。
- 下載的媒體參照會被聚合到訊息上下文中。
- 處理順序遵循事件負載中 Slack 的檔案順序。
- 單一附件下載失敗不會阻擋其他附件。

### 大小、下載與模型限制

- **大小上限**：預設每個檔案 20 MB。可透過 `channels.slack.mediaMaxMb` 設定。
- **下載失敗**：無法由 Slack 提供的檔案、過期的 URL、無法存取的檔案、過大的檔案以及 Slack auth/login HTML 回應會被跳過，而不是回報為不支援的格式。
- **視覺模型**：圖片分析會在主動回覆模型支援視覺時使用該模型，或是使用在 `agents.defaults.imageModel` 設定的圖片模型。

### 已知限制

| 情境                         | 目前行為                                         | 解決方法                                                              |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| 過期的 Slack 檔案 URL        | 檔案已跳過；未顯示錯誤                           | 在 Slack 中重新上傳檔案                                               |
| 未設定視覺模型               | 圖片附件會儲存為媒體參照，但不會作為圖片進行分析 | 設定 `agents.defaults.imageModel` 或使用具備視覺能力的回覆模型        |
| 非常大的圖片（預設 > 20 MB） | 因大小上限而跳過                                 | 如果 Slack 允許，請增加 `channels.slack.mediaMaxMb`                   |
| 轉傳/共用的附件              | 文字和 Slack 託管的圖片/檔案媒體為盡力而為       | 直接在 OpenClaw 執行緒中重新分享                                      |
| PDF 附件                     | 儲存為檔案/媒體上下文，不會自動透過圖片視覺路由  | 使用 `download-file` 取得檔案中繼資料，或使用 `pdf` 工具進行 PDF 分析 |

### 相關文件

- [媒體理解管線](/zh-Hant/nodes/media-understanding)
- [PDF 工具](/zh-Hant/tools/pdf)
- Epic：[#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件視覺啟用
- 回歸測試：[#51353](https://github.com/openclaw/openclaw/issues/51353)
- 即時驗證：[#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Slack 使用者與閘道配對。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    頻道和群組私訊的行為。
  </Card>
  <Card title="頻道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理商。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與強化防護。
  </Card>
  <Card title="設定" icon="sliders" href="/zh-Hant/gateway/configuration">
    設定佈局與優先順序。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    指令目錄與行為。
  </Card>
</CardGroup>
