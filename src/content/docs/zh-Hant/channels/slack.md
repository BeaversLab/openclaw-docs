---
summary: "Slack 設定與執行時行為（Socket Mode + HTTP Request URLs）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

透過 Slack 應用程式整合，在 DM 和頻道上具備生產就緒性。預設模式為 Socket Mode；也支援 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    Slack 直訊預設為配對模式。
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

| 考量點              | Socket Mode（預設）                                                               | HTTP Request URLs                                                                |
| ------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 公網閘道 URL        | 不需要                                                                            | 需要（DNS、TLS、反向代理或通道）                                                 |
| 對外網路            | 對 `wss-primary.slack.com` 的對外 WSS 必須可連線                                  | 無對外 WS；僅接受對內 HTTPS                                                      |
| 所需權杖            | Bot 權杖（`xoxb-...`）+ 具有 `connections:write` 的 App-Level Token（`xapp-...`） | Bot 權杖（`xoxb-...`）+ 簽署金鑰                                                 |
| 開發筆電 / 防火牆後 | 可直接運作                                                                        | 需要公網通道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或暫存閘道             |
| 水平擴展            | 每個主機上的每個 App 一個 Socket Mode 連線階段；多個閘道需要分開的 Slack Apps     | 無狀態 POST 處理器；多個閘道副本可在負載平衡器後共用一個 App                     |
| 單一閘道上的多帳號  | 支援；每個帳號開啟自己的 WS                                                       | 支援；每個帳號需要唯一的 `webhookPath`（預設為 `/slack/events`），以避免註冊衝突 |
| 斜線指令傳輸        | 透過 WS 連線傳遞；`slash_commands[].url` 會被忽略                                 | Slack POST 到 `slash_commands[].url`；該欄位是命令分發所必需的                   |
| 請求簽名            | 未使用（驗證是應用層級 Token）                                                    | Slack 會對每個請求進行簽名；OpenClaw 使用 `signingSecret` 進行驗證               |
| 連線中斷後的恢復    | Slack SDK 會自動重新連線；閘道的 pong-timeout 傳輸微調適用                        | 沒有持久連線會中斷；重試由 Slack 端逐個請求進行                                  |

<Note>
  針對單一閘道主機、開發筆電，以及可以向外連線到 `*.slack.com` 但無法接受傳入 HTTPS 的內部部署網路，**請選擇 Socket Mode**。

當在負載平衡器後方執行多個 Gateway 副本、當向外 WSS 被封鎖但允許傳入 HTTPS，或者當您已經在反向代理終止 Slack webhooks 時，**請選擇 HTTP Request URLs**。

</Note>

## 快速設定

<Tabs>
  <Tab title="Socket Mode (預設)">
    <Steps>
      <Step title="建立新的 Slack 應用程式">
        開啟 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 選擇您的工作區 → 貼上下列其中一份清單 → **Next** → **Create**。

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
          **Recommended (建議)** 符合內建 Slack 插件的完整功能集：App Home、斜線指令、檔案、回應反應、釘選、群組 DM，以及 emoji/usergroup 讀取。當工作區政策限制範圍 (scopes) 時，請選擇 **Minimal (最低限度)** —— 它涵蓋了 DM、頻道/群組歷史記錄、提及和斜線指令，但會捨棄檔案、回應反應、釘選、群組-DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解各範圍的詳細理由和附加選項（例如額外的斜線指令）。
        </Note>

        在 Slack 建立應用程式後：

        - **Basic Information → App-Level Tokens → Generate Token and Scopes**：新增 `connections:write`，儲存，然後複製 `xapp-...` 的值。
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

        Env 備援方案（僅限預設帳戶）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
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
          **Recommended**（推薦）符合內建 Slack 外掛的完整功能集；**Minimal**（最小）會針對限制較嚴格的工作區移除檔案、反應、釘選、群組 DM (`mpim:*`)、`emoji:read` 和 `usergroups:read`。請參閱 [Manifest and scope checklist](#manifest-and-scope-checklist) 以了解每個範圍的理由。
        </Note>

        <Info>
          三個 URL 欄位（`slash_commands[].url`、`event_subscriptions.request_url` 和 `interactivity.request_url` / `message_menu_options_url`）都指向同一個 OpenClaw 端點。Slack 的清單架構要求它們分別命名，但 OpenClaw 會依 payload 類型路由，因此單一 `webhookPath`（預設為 `/slack/events`）就足夠了。在 HTTP 模式下，沒有 `slash_commands[].url` 的斜線指令將會靜默無效 (no-op)。
        </Info>

        Slack 建立應用程式後：

        - **Basic Information → App Credentials**：複製 **Signing Secret** 以用於請求驗證。
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
        多帳戶 HTTP 請使用唯一的 webhook 路徑

        為每個帳戶指定不同的 `webhookPath`（預設為 `/slack/events`），以免註冊發生衝突。
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

針對 Socket Mode，OpenClaw 預設將 Slack SDK 客戶端的 pong 逾時設定為 15 秒。僅在您需要針對特定工作區或主機進行調整時，才覆寫傳輸設定：

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

僅對記錄 Slack websocket pong/server-ping 逾時或在已知存在事件迴圈飢餓的主機上執行的 Socket Mode 工作區使用此功能。`clientPingTimeout` 是 SDK 發送客戶端 ping 後的 pong 等待時間；`serverPingTimeout` 是等待 Slack server ping 的時間。應用程式訊息和事件維持應用程式狀態，而非傳輸活躍度訊號。

## Manifest 和範圍檢查清單

基礎 Slack 應用程式 manifest 在 Socket Mode 和 HTTP Request URLs 模式下是相同的。只有 `settings` 區塊（以及斜線指令 `url`）有所不同。

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

預設 manifest 會啟用 Slack App Home 的 **Home** 分頁並訂閱 `app_home_opened`。當工作區成員開啟 Home 分頁時，OpenClaw 會使用 `views.publish` 發布安全的預設 Home 檢視；不包含對話 payload 或私人設定。**Messages** 分頁仍對 Slack DM 保持啟用狀態。

<AccordionGroup>
  <Accordion title="選用的原生斜線指令">

    可以使用多個 [原生斜線指令](#commands-and-slash-behavior) 來取代單一已設定指令，以增加細微差異：

    - 使用 `/agentstatus` 而非 `/status`，因為 `/status` 指令已被保留。
    - 一次最多提供 25 個斜線指令。

    將您現有的 `features.slash_commands` 區塊替換為 [可用指令](/zh-Hant/tools/slash-commands#command-list) 的子集：

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
        使用與上述 Socket 模式相同的 `slash_commands` 清單，並為每個項目新增 `"url": "https://gateway-host.example.com/slack/events"`。範例：

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
  <Accordion title="選用的作者身分範圍（寫入操作）">
    如果您希望傳出訊息使用 active agent 身分（自訂使用者名稱和圖示）而非預設的 Slack 應用程式身分，請新增 `chat:write.customize` bot 範圍。

    如果您使用 emoji 圖示，Slack 預期 `:emoji_name:` 語法。

  </Accordion>
  <Accordion title="選用的使用者權杖範圍（讀取操作）">
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

## 權杖模型

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受純文字
  字串或 SecretRef 物件。
- Config 權杖會覆蓋 env 後備。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` env 後備僅適用於預設帳戶。
- `userToken` (`xoxp-...`) 僅限 config（無 env 後備），且預設為唯讀行為 (`userTokenReadOnly: true`)。

狀態快照行為：

- Slack 帳戶檢查會追蹤每個認證 `*Source` 和 `*Status`
  欄位 (`botToken`, `appToken`, `signingSecret`, `userToken`)。
- 狀態為 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示帳戶是透過 SecretRef
  或其他非行內秘密來源配置的，但目前的指令/執行路徑
  無法解析實際值。
- 在 HTTP 模式下，會包含 `signingSecretStatus`；在 Socket Mode 下，
  必需的配對是 `botTokenStatus` + `appTokenStatus`。

<Tip>對於動作/目錄讀取，配置後可以優先使用使用者權杖。對於寫入，bot 權杖仍然是首選；僅當設定 `userTokenReadOnly: false` 且無法使用 bot 權杖時，才允許使用使用者權杖寫入。</Tip>

## 動作與閘門

Slack 動作由 `channels.slack.actions.*` 控制。

目前 Slack 工具中可用的動作群組：

| 群組     | 預設   |
| -------- | ------ |
| 訊息     | 已啟用 |
| 反應     | 已啟用 |
| 釘選     | 已啟用 |
| 成員資訊 | 已啟用 |
| 表情清單 | 已啟用 |

目前的 Slack 訊息動作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受傳入檔案預留位置中顯示的 Slack 檔案 ID，並針對圖片傳回圖片預覽，或針對其他檔案類型傳回本機檔案中繼資料。

## 存取控制與路由

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` 控制 DM 存取權。`channels.slack.allowFrom` 是標準的 DM 允許清單。

    - `pairing` (預設)
    - `allowlist`
    - `open` (要求 `channels.slack.allowFrom` 包含 `"*"`)
    - `disabled`

    DM 旗標：

    - `dm.enabled` (預設為 true)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (舊版)
    - `dm.groupEnabled` (群組 DM 預設為 false)
    - `dm.groupChannels` (選用 MPIM 允許清單)

    多帳號優先順序：

    - `channels.slack.accounts.default.allowFrom` 僅套用於 `default` 帳號。
    - 具名帳號在其自身的 `allowFrom` 未設定時，會繼承 `channels.slack.allowFrom`。
    - 具名帳號不會繼承 `channels.slack.accounts.default.allowFrom`。

    舊版 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom` 仍會讀取以維持相容性。`openclaw doctor --fix` 會在能夠不變更存取權的情況下，將它們遷移至 `dmPolicy` 和 `allowFrom`。

    DM 中的配對使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制頻道處理方式：

    - `open`
    - `allowlist`
    - `disabled`

    頻道允許清單位於 `channels.slack.channels` 之下，並且**必須使用穩定的 Slack 頻道 ID**（例如 `C12345678`）作為配置鍵。

    執行時期注意事項：如果 `channels.slack` 完全缺失（僅使用環境變數設置），執行時期會回退至 `groupPolicy="allowlist"` 並記錄警告（即使已設定 `channels.defaults.groupPolicy`）。

    名稱/ID 解析：

    - 當 Token 權限允許時，頻道允許清單項目和 DM 允許清單項目會在啟動時解析
    - 未解析的頻道名稱項目會保留為設置的值，但預設會在路由時被忽略
    - 傳入授權和頻道路由預設以 ID 為優先；直接的使用者名稱/slug 比對需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基於名稱的鍵（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不會**比對成功。頻道查詢預設以 ID 為優先，因此基於名稱的鍵將永遠無法成功路由，且該頻道中的所有訊息都將被靜默封鎖。這與 `groupPolicy: "open"` 不同，後者不需要頻道鍵即可進行路由，且基於名稱的鍵似乎可以運作。

    請務必使用 Slack 頻道 ID 作為鍵。尋找方法：在 Slack 中右鍵點擊該頻道 → **Copy link** — ID（`C...`）會出現在 URL 的末端。

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

    錯誤（在 `groupPolicy: "allowlist"` 下會被靜默封鎖）：

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
    頻道訊息預設為提及閘控。

    提及來源：

    - 明確的應用提及 (`<@botId>`)
    - Slack 使用者群組提及 (`<!subteam^S...>`)，當機器人使用者是該使用者群組的成員時；需要 `usergroups:read`
    - 提及正規表達式模式 (`agents.list[].groupChat.mentionPatterns`，後備 `messages.groupChat.mentionPatterns`)
    - 隱含的回覆機器人執行緒行為 (當 `thread.requireExplicitMention` 為 `true` 時停用)

    每個頻道的控制項 (`channels.slack.channels.<id>`；僅透過啟動解析度或 `dangerouslyAllowNameMatching` 使用名稱)：

    - `requireMention`
    - `users` (允許清單)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`，`toolsBySender`
    - `toolsBySender` 金鑰格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 萬用字元
      (舊版無前綴金鑰仍僅對應至 `id:`)

    `allowBots` 對頻道和私人頻道採取保守策略：僅當傳送的機器人在該房間的 `users` 允許清單中被明確列出，或者當來自 `channels.slack.allowFrom` 的至少一個明確 Slack 擁有者 ID 目前是房間成員時，才接受機器人撰寫的房間訊息。萬用字元和顯示名稱擁有者項目不滿足擁有者在場的要求。擁有者在場檢查使用 Slack `conversations.members`；請確保應用程式具有針對該房間類型的相符讀取範圍 (公開頻道為 `channels:read`，私人頻道為 `groups:read`)。如果成員查詢失敗，OpenClaw 將捨棄機器人撰寫的房間訊息。

  </Tab>
</Tabs>

## 執行緒、工作階段與回覆標籤

- DM 路由為 `direct`；頻道路由為 `channel`；MPIM 路由為 `group`。
- Slack 路由綁定接受原始對等 ID 以及 Slack 目標格式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用預設的 `session.dmScope=main`，Slack 直接訊息 (DM) 會合併到代理的主會話中。
- 頻道會話：`agent:<agentId>:slack:channel:<channelId>`。
- 執行緒回覆可以在適用時建立執行緒會話後綴 (`:thread:<threadTs>`)。
- 在 OpenClaw 處理頂層訊息而不需要明確提及的頻道中，非 `off` 的 `replyToMode` 會將每個已處理的根路由到 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`，以便可見的 Slack 執行緒從第一輪開始映射到一個 OpenClaw 會話。
- `channels.slack.thread.historyScope` 的預設值為 `thread`；`thread.inheritParent` 的預設值為 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制當新執行緒會話開始時獲取多少現有的執行緒訊息 (預設為 `20`；設定 `0` 以停用)。
- `channels.slack.thread.requireExplicitMention` (預設值為 `false`)：當設定為 `true` 時，隱含的執行緒提及會被抑制，因此機器人僅回應執行緒內明確的 `@bot` 提及，即使機器人已參與該執行緒。若沒有此設定，在機器人參與的執行緒中的回覆將繞過 `requireMention` 閘道控制。

回覆執行緒控制：

- `channels.slack.replyToMode`：`off|first|all|batched` (預設值為 `off`)
- `channels.slack.replyToModeByChatType`：每個 `direct|group|channel`
- 直接聊天的舊版後援：`channels.slack.dm.replyToMode`

支援手動回覆標籤：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

<Note>`replyToMode="off"` 會停用 Slack 中 **所有** 回覆執行緒功能，包括明確的 `[[reply_to_*]]` 標籤。這與 Telegram 不同，後者在 `"off"` 模式下仍會遵守明確標籤。Slack 執行緒會從頻道中隱藏訊息，而 Telegram 回覆則會保持行內可見。</Note>

## 確認反應

當 OpenClaw 正在處理傳入訊息時，`ackReaction` 會傳送一個確認表情符號。

解析順序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符號後備機制 (`agents.list[].identity.emoji`，否則為 "👀")

備註：

- Slack 預期短代碼 (shortcodes) (例如 `"eyes"`)。
- 使用 `""` 以針對 Slack 帳號或全域停用該反應。

## 文字串流

`channels.slack.streaming` 控制即時預覽行為：

- `off`：停用即時預覽串流。
- `partial` (預設)：以最新的部分輸出取代預覽文字。
- `block`：附加分塊預覽更新。
- `progress`：在生成時顯示進度狀態文字，然後傳送最終文字。
- `streaming.preview.toolProgress`：當草稿預覽啟用時，將工具/進度更新導向同一個已編輯的預覽訊息 (預設：`true`)。設定 `false` 以保持分開的工具/進度訊息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：設定為 `status` 以在隱藏原始指令/執行文字的同時保持精簡的工具進度行 (預設：`raw`)。

在保持精簡進度行的同時隱藏原始指令/執行文字：

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

當 `channels.slack.streaming.mode` 為 `partial` 時，`channels.slack.streaming.nativeTransport` 控制 Slack 原生文字串流 (預設：`true`)。

- 必須要有回覆執行緒才能顯示原生文字串流和 Slack 助理執行緒狀態。執行緒選擇仍然遵循 `replyToMode`。
- 當無法使用原生串流或不存在回覆執行緒時，頻道、群組聊天和頂層 DM 根目錄仍然可以使用正常的草稿預覽。
- 頂層 Slack DM 預設保持在執行緒之外，因此它們不會顯示 Slack 的執行緒樣式原生串流/狀態預覽；OpenClaw 改為在 DM 中發佈並編輯草稿預覽。
- 媒體和非文字酬載會回退到正常傳遞。
- 媒體/錯誤最終結果會取消擱置中的預覽編輯；符合條件的文字/區塊最終結果僅在能就地編輯預覽時才會沖刷。
- 如果在回覆中途串流失敗，OpenClaw 會對其餘的載荷回退為正常傳遞。

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

- `channels.slack.streamMode` (`replace | status_final | append`) 是 `channels.slack.streaming.mode` 的舊版執行時別名。
- boolean `channels.slack.streaming` 是 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport` 的舊版執行時別名。
- legacy `channels.slack.nativeStreaming` 是 `channels.slack.streaming.nativeTransport` 的執行時別名。
- 執行 `openclaw doctor --fix` 以將保存的 Slack 串流設定重寫為標準金鑰。

## 輸入反應回退機制

`typingReaction` 會在 OpenClaw 處理回覆時，對傳入的 Slack 訊息新增暫時性的反應，然後在執行完成後將其移除。這在執行緒回覆之外最有用，因為執行緒回覆會使用預設的「正在輸入...」狀態指示器。

解析順序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意事項：

- Slack 預期使用短代碼（例如 `"hourglass_flowing_sand"`）。
- 該反應為盡力而為，並會在回覆或失敗路徑完成後自動嘗試清理。

## 媒體、分塊與傳遞

<AccordionGroup>
  <Accordion title="傳入附件">
    Slack 檔案附件會從 Slack 託管的私人 URL（權杖驗證請求流程）下載，並在擷取成功且大小限制允許時寫入媒體存放區。檔案佔位符包含 Slack `fileId`，因此代理程式可以使用 `download-file` 擷取原始檔案。

    下載使用有限的閒置和總計逾時。如果 Slack 檔案擷取停滯或失敗，OpenClaw 會繼續處理訊息並回退到檔案佔位符。

    執行時傳入大小上限預設為 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆寫。

  </Accordion>

  <Accordion title="Outbound text and files">
    - 文字區塊使用 `channels.slack.textChunkLimit`（預設為 4000）
    - `channels.slack.chunkMode="newline"` 啟用段落優先分割
    - 檔案傳送使用 Slack 上傳 API，並可包含執行緒回覆 (`thread_ts`)
    - 已設定時，出站媒體上限遵循 `channels.slack.mediaMaxMb`；否則頻道傳送使用媒體管線中的 MIME 類型預設值

  </Accordion>

  <Accordion title="Delivery targets">
    首選的明確目標：

    - `user:<id>` 用於私訊 (DM)
    - `channel:<id>` 用於頻道

    僅包含文字/區塊的 Slack 私訊可以直接發布到使用者 ID；檔案上傳和執行緒傳送會先透過 Slack 對話 API 開啟私訊，因為這些路徑需要具體的對話 ID。

  </Accordion>
</AccordionGroup>

## 指令與斜線行為

斜線指令在 Slack 中會以單一設定指令或多個原生指令的形式出現。設定 `channels.slack.slashCommand` 以變更指令預設值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生指令需要在您的 Slack 應用程式中進行[額外的 Manifest 設定](#additional-manifest-settings)，並透過全域設定中的 `channels.slack.commands.native: true` 或 `commands.native: true` 來啟用。

- Slack 的原生指令自動模式為**關閉**，因此 `commands.native: "auto"` 不會啟用 Slack 原生指令。

```txt
/help
```

原生引數選單使用自適應呈現策略，在分派選取的選項值之前會顯示確認模態視窗：

- 最多 5 個選項：按鈕區塊
- 6-100 個選項：靜態選擇選單
- 超過 100 個選項：外部選擇，並在提供互動選項處理器時進行非同步選項篩選
- 超過 Slack 限制：編碼的選項值會退回至按鈕

```txt
/think
```

斜線工作階段使用隔離金鑰（例如 `agent:<agentId>:slack:slash:<userId>`），並且仍會使用 `CommandTargetSessionKey` 將指令執行路由傳送至目標對話工作階段。

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

這些指令會編譯成 Slack Block Kit，並將點擊或選取透過現有的 Slack 互動事件路徑傳回。

備註：

- 這是 Slack 專用的 UI。其他頻道不會將 Slack Block Kit 指令轉換為它們自己的按鈕系統。
- 互動式回調值是 OpenClaw 產生的不透明權杖，而不是代理程式建立的原始值。
- 如果產生的互動區塊超過 Slack Block Kit 的限制，OpenClaw 將回退為原始文字回覆，而不是傳送無效的區塊內容。

## Slack 中的執行核准

Slack 可以充當具有互動式按鈕和互動的原生核准用戶端，而不是回退到 Web UI 或終端機。

- 執行核准使用 `channels.slack.execApprovals.*` 進行原生 DM/頻道路由。
- 當請求已經抵達 Slack 且核准 ID 類型為 `plugin:` 時，外掛程式核准仍然可以透過同一個 Slack 原生按鈕介面來解析。
- 仍然會強制執行核准者授權：只有被識別為核准者的使用者可以透過 Slack 核准或拒絕請求。

這使用與其他頻道相同的共用核准按鈕介面。當在您的 Slack 應用程式設定中啟用 `interactivity` 時，核准提示會直接在對話中呈現為 Block Kit 按鈕。
當這些按鈕存在時，它們是主要的核准 UX；OpenClaw
應僅在工具結果顯示聊天核准不可用或手動核准是唯一路徑時，才包含手動 `/approve` 指令。

設定路徑：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (選用；盡可能回退至 `commands.ownerAllowFrom`)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`，預設：`dm`)
- `agentFilter`, `sessionFilter`

當 `enabled` 未設定或設為 `"auto"` 且至少有一位
審批者解決時，Slack 會自動啟用原生 exec 審批。設定 `enabled: false` 以明確停用 Slack 作為原生審批客戶端。
設定 `enabled: true` 以在審批者解決時強制啟用原生審批。

沒有明確 Slack exec 審批設定的預設行為：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有當您想要覆寫審批者、新增篩選器，或
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

共用的 `approvals.exec` 轉發是分開的。僅當 exec 審批提示也必須
路由至其他聊天或明確的頻外目標時才使用它。共用的 `approvals.plugin` 轉發也是
分開的；當這些請求已經抵達
Slack 時，Slack 原生按鈕仍可以解決外掛程式審批。

同聊天室 `/approve` 也適用於已經支援指令的 Slack 頻道和 DM。請參閱 [Exec approvals](/zh-Hant/tools/exec-approvals) 以了解完整的審批轉發模型。

## 事件和操作行為

- 訊息編輯/刪除會被對應到系統事件。
- 執行緒廣播（「同時傳送至頻道」的執行緒回覆）會被當作一般使用者訊息處理。
- 反應新增/移除事件會被對應到系統事件。
- 成員加入/離開、頻道建立/重新命名，以及釘選新增/移除事件會被對應到系統事件。
- 當啟用 `configWrites` 時，`channel_id_changed` 可以遷移頻道設定金鑰。
- 頻道主題/用途中繼資料會被視為不受信任的上下文，並可以注入到路由上下文中。
- 執行緒發起者和初始執行緒歷史上下文種子會在適用時根據設定的發送者允許清單進行篩選。
- 區塊動作和模態互動會發出結構化的 `Slack interaction: ...` 系統事件，其中包含豐富的 Payload 欄位：
  - 區塊動作：選定的值、標籤、選擇器值，以及 `workflow_*` 中繼資料
  - 具有路由頻道中繼資料和表單輸入的模態 `view_submission` 和 `view_closed` 事件

## 設定參考

主要參考：[Configuration reference - Slack](/zh-Hant/gateway/config-channels#slack)。

<Accordion title="高訊號 Slack 欄位">

- 模式/驗證 (mode/auth)：`mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- 存取權 (DM access)：`dm.enabled`, `dmPolicy`, `allowFrom` (舊版：`dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- 相容性切換開關 (compatibility toggle)：`dangerouslyAllowNameMatching` (緊急使用；除非必要請保持關閉)
- 頻道存取權 (channel access)：`groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- 執行緒/歷史記錄 (threading/history)：`replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- 傳遞 (delivery)：`textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- 操作/功能 (ops/features)：`configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## 疑難排解

<AccordionGroup>
  <Accordion title="頻道中沒有回覆">
    依序檢查：

    - `groupPolicy`
    - 頻道允許清單 (`channels.slack.channels`) — **金鑰必須是頻道 ID** (`C12345678`)，而不是名稱 (`#channel-name`)。在 `groupPolicy: "allowlist"` 下，基於名稱的金鑰會靜默失敗，因為頻道路由預設優先使用 ID。若要尋找 ID：在 Slack 中對頻道按一下滑鼠右鍵 → **複製連結** — 網址末端的 `C...` 值即為頻道 ID。
    - `requireMention`
    - 每個頻道的 `users` 允許清單

    實用指令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM 訊息被忽略">
    檢查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或舊版 `channels.slack.dm.policy`)
    - 配對核准 / 允許清單項目
    - Slack Assistant DM 事件：提及 `drop message_changed` 的詳細記錄
      通常表示 Slack 傳送了一個經過編輯的 Assistant-thread 事件，但訊息中沒有
      可復原的真人發送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式無法連線">
    驗證 Slack 應用程式設定中的 bot + 應用程式權杖以及 Socket Mode 是否已啟用。

    如果 `openclaw channels status --probe --json` 顯示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，表示 Slack 帳戶
    已設定，但目前的執行階段無法解析 SecretRef 支援的
    數值。

  </Accordion>

  <Accordion title="HTTP 模式未收到事件">
    驗證：

    - 簽署金鑰
    - webhook 路徑
    - Slack Request URLs (事件 + 互動 + 斜線指令)
    - 每個 HTTP 帳戶的唯一 `webhookPath`

    如果 `signingSecretStatus: "configured_unavailable"` 出現在帳戶
    快照中，表示 HTTP 帳戶已設定，但目前的執行階段無法
    解析 SecretRef 支援的簽署金鑰。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    請確認您是否打算使用：

    - 原生指令模式 (`channels.slack.commands.native: true`) 並在 Slack 中註冊了對應的斜線指令
    - 或是單一斜線指令模式 (`channels.slack.slashCommand.enabled: true`)

    同時也請檢查 `commands.useAccessGroups` 和頻道/使用者允許清單。

  </Accordion>
</AccordionGroup>

## 附件視覺參考

當 Slack 檔案下載成功且大小限制允許時，Slack 可以將下載的媒體附加到代理的輪次中。圖片檔案可以透過媒體理解路徑傳遞，或直接傳遞給具備視覺能力的回覆模型；其他檔案則會作為可下載的檔案上下文保留，而不會被視為圖片輸入。

### 支援的媒體類型

| 媒體類型                     | 來源            | 目前行為                                                           | 備註                                                   |
| ---------------------------- | --------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| JPEG / PNG / GIF / WebP 圖片 | Slack 檔案 URL  | 已下載並附加至輪次以進行具備視覺能力的處理                         | 單一檔案上限：`channels.slack.mediaMaxMb` (預設 20 MB) |
| PDF 檔案                     | Slack 檔案 URL  | 已下載並作為檔案上下文公開，供 `download-file` 或 `pdf` 等工具使用 | Slack 入站不會自動將 PDF 轉換為圖像視覺輸入            |
| 其他檔案                     | Slack 檔案 URL  | 盡可能下載並作為檔案上下文公開                                     | 二進位檔案不會被視為圖片輸入                           |
| 執行緒回覆                   | 執行緒起始檔案  | 當回覆沒有直接媒體時，根訊息檔案可以作為上下文注入                 | 僅包含檔案的起始訊息會使用附件預留位置                 |
| 多圖片訊息                   | 多個 Slack 檔案 | 每個檔案會被獨立評估                                               | Slack 處理限制為每則訊息八個檔案                       |

### 入站管線

當包含檔案附件的 Slack 訊息到達時：

1. OpenClaw 會使用 bot token (`xoxb-...`) 從 Slack 的私人 URL 下載檔案。
2. 成功時，檔案會被寫入媒體儲存庫。
3. 下載的媒體路徑和內容類型會被新增到入站上下文中。
4. 具備圖片能力的模型/工具路徑可以使用該上下文中的圖片附件。
5. 非圖片檔案仍會作為檔案中繼資料或媒體參考提供給能處理它們的工具使用。

### 執行緒根附件繼承

當訊息到達執行緒時 (具有 `thread_ts` 父層)：

- 如果回覆本身沒有直接媒體，且包含的根訊息有檔案，Slack 可以將根檔案作為執行緒起始上下文進行載入。
- 直接回覆附件優先於根訊息附件。
- 如果根訊息僅包含檔案而沒有文字，則會以附件佔位符表示，以便回退仍可包含其檔案。

### 多附件處理

當單一 Slack 訊息包含多個檔案附件時：

- 每個附件會透過媒體管線獨立處理。
- 下載的媒體參照會被匯總到訊息上下文中。
- 處理順序遵循事件載荷中 Slack 的檔案順序。
- 單一附件下載失敗不會阻斷其他附件。

### 大小、下載和模型限制

- **大小上限**：預設每個檔案 20 MB。可透過 `channels.slack.mediaMaxMb` 進行設定。
- **下載失敗**：Slack 無法提供的檔案、過期的 URL、無法存取的檔案、過大的檔案以及 Slack auth/login HTML 回應會被跳過，而不會被回報為不支援的格式。
- **視覺模型**：圖片分析會使用支援視覺功能的現有回覆模型，或是 `agents.defaults.imageModel` 中設定的圖片模型。

### 已知限制

| 場景                           | 目前行為                                                | 解決方法                                                              |
| ------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Slack 檔案 URL 已過期          | 檔案已跳過；未顯示錯誤                                  | 在 Slack 中重新上傳檔案                                               |
| 未設定視覺模型                 | 圖片附件會儲存為媒體參照，但不會作為圖片進行分析        | 設定 `agents.defaults.imageModel` 或使用具有視覺功能的回覆模型        |
| 非常大的圖片（預設大於 20 MB） | 因大小上限而跳過                                        | 如果 Slack 允許，請增加 `channels.slack.mediaMaxMb`                   |
| 轉發/分享的附件                | 文字和 Slack 託管的圖片/檔案媒體皆為盡力而為            | 直接在 OpenClow 執行緒中重新分享                                      |
| PDF 附件                       | 儲存為檔案/媒體上下文，不會自動透過圖片視覺功能進行路由 | 使用 `download-file` 取得檔案中繼資料，或使用 `pdf` 工具進行 PDF 分析 |

### 相關文件

- [媒體理解管線](/zh-Hant/nodes/media-understanding)
- [PDF 工具](/zh-Hant/tools/pdf)
- Epic: [#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件視覺功能啟用
- 迴歸測試: [#51353](https://github.com/openclaw/openclaw/issues/51353)
- 即時驗證：[#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相關

<CardGroup cols={2}>
  <Card title="配對" icon="link" href="/zh-Hant/channels/pairing">
    將 Slack 使用者配對至閘道。
  </Card>
  <Card title="群組" icon="users" href="/zh-Hant/channels/groups">
    頻道和群組 DM 的行為。
  </Card>
  <Card title="頻道路由" icon="route" href="/zh-Hant/channels/channel-routing">
    將傳入訊息路由至代理人。
  </Card>
  <Card title="安全性" icon="shield" href="/zh-Hant/gateway/security">
    威脅模型與防護加固。
  </Card>
  <Card title="組態" icon="sliders" href="/zh-Hant/gateway/configuration">
    組態佈局與優先順序。
  </Card>
  <Card title="斜線指令" icon="terminal" href="/zh-Hant/tools/slash-commands">
    指令目錄與行為。
  </Card>
</CardGroup>
