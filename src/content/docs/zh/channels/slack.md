---
summary: "SlackSlack 设置和运行时行为（Socket Mode + HTTP Request URLs）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "SlackSlack"
---

通过 Slack 应用集成支持私信和渠道的生产环境使用。默认模式为 Socket 模式；同时也支持 HTTP 请求 URL。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing" Slack>
    Slack 私信默认为配对模式。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## 选择 Socket Mode 或 HTTP Request URLs

两种传输方式均已可用于生产环境，并在消息传递、斜杠命令、App 主页和交互功能方面达到功能对等。请根据部署形态进行选择，而非基于功能。

| 关注点                            | Socket Mode（默认）                                                         | HTTP Request URLs                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 公共 Gateway(网关) URL            | 不需要                                                                      | 需要（DNS、TLS、反向代理或隧道）                                                       |
| 出站网络                          | 必须能访问到 `wss-primary.slack.com` 的出站 WSS                             | 无出站 WS；仅入站 HTTPS                                                                |
| 所需的令牌                        | Bot 令牌 (`xoxb-...`) + 具有 `connections:write` 的应用级令牌 (`xapp-...`)  | Bot 令牌 (`xoxb-...`) + 签名密钥                                                       |
| 开发笔记本电脑 / 防火墙后         | 按原样工作                                                                  | 需要公共隧道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或暂存 Gateway(网关)         |
| 横向扩容                          | 每个主机上的每个应用一个 Socket Mode 会话；多个 Slack 需要单独的 Slack 应用 | 无状态 POST 处理程序；多个 Gateway(网关) 副本可以在负载均衡器后共享一个应用            |
| 在一个 Gateway(网关) 上支持多账户 | 支持；每个账户打开自己的 WS                                                 | 支持；每个账户需要一个唯一的 `webhookPath`（默认为 `/slack/events`），以免注册发生冲突 |
| 斜杠命令传输                      | 通过 WS 连接传递；`slash_commands[].url` 被忽略                             | Slack POST 请求发送至 Slack`slash_commands[].url`；该字段是命令分发所必需的            |
| 请求签名                          | 未使用（身份验证为 App-Level Token）                                        | Slack 对每个请求进行签名；OpenClaw 使用 SlackOpenClaw`signingSecret` 进行验证          |
| 连接断开时的恢复                  | Slack SDK 会自动重新连接；网关的 pong-timeout 传输调优设置适用              | 没有持久的连接会断开；重试由 Slack 对每个请求进行                                      |

<Note>
  对于单 Gateway(网关) 主机、开发笔记本电脑以及可以出站访问 Gateway(网关)`*.slack.com`Gateway(网关)Slack 但无法接受入站 HTTPS 的本地网络，**请选择 Socket Mode**。

当在负载均衡器后运行多个 Gateway(网关) 副本、出站 WSS 被阻止但允许入站 HTTPS，或者您已经在反向代理处终止 Slack webhooks 时，**请选择 HTTP Request URLs**。

</Note>

## 快速设置

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create a new Slack app">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择您的工作区 → 粘贴下方任一 manifest → **Next** → **Create**。

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
          **Recommended（推荐）** 匹配捆绑的 Slack 插件的完整功能集：App Home、斜杠命令、文件、表情回应、固定消息、群组私信以及表情符号/用户组读取。当工作区策略限制范围（scopes）时，选择 **Minimal（最小）** —— 它覆盖私信、渠道/群组历史记录、提及和斜杠命令，但会移除文件、表情回应、固定消息、群组私信 (`mpim:*`)、`emoji:read` 和 `usergroups:read`。有关每个范围的原理和附加选项（例如额外的斜杠命令），请参阅 [Manifest and scope checklist](#manifest-and-scope-checklist)。
        </Note>

        在 Slack 创建应用后：

        - **Basic Information → App-Level Tokens → Generate Token and Scopes**：添加 `connections:write`，保存，然后复制 `xapp-...` 值。
        - **Install App → Install to Workspace**：复制 `xoxb-...` Bot User OAuth Token。

      </Step>

      <Step title="Configure OpenClaw">

        推荐的 SecretRef 设置：

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

        环境变量回退（仅默认账户）：

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

  <Tab title="HTTP 请求 URL">
    <Steps>
      <Step title="创建新的 Slack 应用">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择您的工作区 → 粘贴以下清单之一 → 将 `https://gateway-host.example.com/slack/events` 替换为您的公共 Gateway(网关) URL → **Next** → **Create**。

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
          **Recommended**（推荐）与内置的 Slack 插件的完整功能集相匹配；**Minimal**（最小）针对受限工作区移除了文件、表情反应、固定项、群组 OpenClaw (`mpim:*`)、`emoji:read` 和 `usergroups:read`。有关每个范围的详细理由，请参阅 [Manifest and scope checklist](#manifest-and-scope-checklist)。
        </Note>

        <Info>
          三个 URL 字段（`slash_commands[].url`、`event_subscriptions.request_url` 和 `interactivity.request_url` / `message_menu_options_url`）都指向同一个 Slack 端点。OpenClaw 的清单架构要求分别命名它们，但 Slack 根据负载类型进行路由，因此只需一个 `webhookPath`（默认为 `/slack/events`）就足够了。在 HTTP 模式下，没有 `slash_commands[].url` 的斜杠命令将静默无操作 (no-op)。
        </Info>

        在 OAuth 创建应用后：

        - **Basic Information → App Credentials**：复制 **Signing Secret** 用于请求验证。
        - **Install App → Install to Workspace**：复制 `xoxb-...` Bot User OpenClaw Token。

      </Step>

      <Step title="配置 OpenClaw">

        推荐的 SecretRef 设置：

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
        为多账户 HTTP 使用唯一的 webhook 路径

        为每个账户指定不同的 `webhookPath`（默认为 `/slack/events`），以免注册时发生冲突。
        </Note>

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Socket Mode 传输调优

对于 Socket Mode，OpenClaw 默认将 Slack SDK 客户端的 pong 超时设置为 15 秒。仅当您需要针对特定工作区或主机进行调优时，才覆盖传输设置：

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

仅针对记录了 Slack websocket pong/服务器 ping 超时或在已知存在事件循环阻塞的主机上运行的 Socket Mode 工作区使用此设置。`clientPingTimeout` 是 SDK 发送客户端 ping 后的 pong 等待时间；`serverPingTimeout` 是等待 Slack 服务器 ping 的时间。应用消息和事件仍保持应用状态，而非传输活跃信号。

## 清单和权限范围检查清单

基础 Slack 应用清单对于 Socket Mode 和 HTTP 请求 URL 是相同的。只有 `settings` 块（以及斜杠命令 `url`）有所不同。

基础清单（Socket Mode 默认）：

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

对于 **HTTP 请求 URL 模式**，请将 `settings` 替换为 HTTP 变体，并将 `url` 添加到每个斜杠命令中。需要公开 URL：

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

### 其他清单设置

展示扩展上述默认设置的不同功能。

默认清单启用了 Slack 应用主页的 **Home（主页）** 标签页，并订阅了 `app_home_opened`。当工作区成员打开主页标签页时，OpenClaw 会发布一个安全的默认主页视图，其中包含 `views.publish`；不包含对话负载或私有配置。**Messages（消息）** 标签页仍对 Slack 私信保持启用状态。

<AccordionGroup>
  <Accordion title="可选的原生斜杠命令">

    可以使用多个[原生斜杠命令](#commands-and-slash-behavior)来代替单个配置的细微差别命令：

    - 使用 `/agentstatus` 而不是 `/status`，因为 `/status` 命令已被保留。
    - 一次可用的斜杠命令不能超过 25 个。

    将您现有的 `features.slash_commands` 部分替换为[可用命令](/zh/tools/slash-commands#command-list)的子集：

    <Tabs>
      <Tab title="Socket 模式（默认）">

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
      <Tab title="HTTP 请求 URL">
        使用与上述 Socket 模式相同的 `slash_commands` 列表，并为每个条目添加 `"url": "https://gateway-host.example.com/slack/events"`。示例：

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

        对列表中的每个命令重复该 `url` 值。

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="可选的作者权限范围（写入操作）">
    如果您希望传出消息使用活动代理身份（自定义用户名和图标）而不是默认的 Slack 应用身份，请添加 `chat:write.customize` 机器人权限范围。

    如果您使用 emoji 图标，Slack 期望使用 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="Optional user-token scopes (read operations)">
    如果您配置了 `channels.slack.userToken`，典型的读取作用域包括：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (如果您依赖 Slack 搜索读取)

  </Accordion>
</AccordionGroup>

## 令牌模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受纯文本字符串或 SecretRef 对象。
- 配置令牌会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken` (`xoxp-...`) 仅限配置（无环境变量回退），默认为只读行为 (`userTokenReadOnly: true`)。

状态快照行为：

- Slack 账户检查会跟踪每个凭据的 `*Source` 和 `*Status` 字段 (`botToken`, `appToken`, `signingSecret`, `userToken`)。
- 状态为 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示账户是通过 SecretRef 或其他非内联密钥源配置的，但当前的命令/运行时路径无法解析实际值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket 模式下，所需的组合是 `botTokenStatus` + `appTokenStatus`。

<Tip>对于操作/目录读取，在配置时可以优先使用用户令牌。对于写入，机器人令牌仍然优先；仅当 `userTokenReadOnly: false` 且机器人令牌不可用时，才允许使用用户令牌进行写入。</Tip>

## 操作和门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组       | 默认   |
| -------- | ------ |
| 消息     | 已启用 |
| 表情回应 | 已启用 |
| 固定消息 | 已启用 |
| 成员信息 | 已启用 |
| 表情列表 | 已启用 |

当前的 Slack 消息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受入站文件占位符中显示的 Slack 文件 ID，并返回图像的预览或其它文件类型的本地文件元数据。

## 访问控制和路由

<Tabs>
  <Tab title="私信 policy">
    `channels.slack.dmPolicy` 控制私信访问。`channels.slack.allowFrom` 是标准的私信允许列表。

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`）
    - `disabled`

    私信标志：

    - `dm.enabled`（默认为 true）
    - `channels.slack.allowFrom`
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组私信默认为 false）
    - `dm.groupChannels`（可选的 MPIM 允许列表）

    多账户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在其自己的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 命名账户不继承 `channels.slack.accounts.default.allowFrom`。

    旧版 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom` 出于兼容性考虑仍会读取。`openclaw doctor --fix` 会在不改变访问权限的情况下将其迁移到 `dmPolicy` 和 `allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制渠道处理方式：

    - `open`
    - `allowlist`
    - `disabled`

    渠道允许列表位于 `channels.slack.channels`Slack 下，并且**必须使用稳定的 Slack 渠道 ID**（例如 `C12345678`）作为配置键。

    运行时说明：如果完全缺少 `channels.slack`（仅环境变量设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 当令牌访问允许时，渠道允许列表条目和私信允许列表条目在启动时解析
    - 未解析的渠道名称条目将按配置保留，但默认在路由时被忽略
    - 入站授权和渠道路由默认优先使用 ID；直接匹配用户名/slug 需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基于名称的键（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不**匹配。渠道查找默认优先使用 ID，因此基于名称的键永远不会成功路由，并且该渠道中的所有消息都将被静默阻止。这与 `groupPolicy: "open"`SlackSlack 不同，后者不需要渠道键即可进行路由，且基于名称的键似乎可以工作。

    始终使用 Slack 渠道 ID 作为键。要查找它：在 Slack 中右键单击渠道 → **复制链接** — ID (`C...`) 出现在 URL 的末尾。

    正确：

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

    不正确（在 `groupPolicy: "allowlist"` 下被静默阻止）：

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

  <Tab title="提及和渠道用户">
    渠道消息默认受提及限制。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - Slack 用户组提及 (`<!subteam^S...>`)，当机器人用户是该用户组成员时；需要 `usergroups:read`
    - 提及正则表达式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为（当 `thread.requireExplicitMention` 为 `true` 时禁用）

    每个渠道的控制 (`channels.slack.channels.<id>`；名称仅通过启动解析或 `dangerouslyAllowNameMatching`) ：

    - `requireMention`
    - `users` (允许列表)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 键格式：`id:`, `e164:`, `username:`, `name:`, 或 `"*"` 通配符
      （旧的无前缀键仍然仅映射到 `id:`）

    `allowBots` 对于渠道和私有渠道是保守的：仅当发送机器人在该房间的 `users` 允许列表中被明确列出，或者当 Slack`channels.slack.allowFrom` 所有者 ID 中至少有一个显式 ID 目前是房间成员时，才接受机器人发送的房间消息。通配符和显示名称所有者条目不满足所有者存在条件。所有者存在使用 Slack `conversations.members`；确保应用具有与房间类型匹配的读取范围（公共渠道为 `channels:read`，私有渠道为 `groups:read`）。如果成员查找失败，OpenClaw 将丢弃机器人发送的房间消息。

  </Tab>
</Tabs>

## 线程、会话和回复标签

- 私信路由为 `direct`；频道为 `channel`；MPIM 为 `group`。
- Slack 路由绑定接受原始对等 ID 以及 Slack 目标格式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用默认的 `session.dmScope=main`，Slack 私信会合并到代理主会话中。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可以在适用时创建线程会话后缀（`:thread:<threadTs>`）。
- 在 OpenClaw 处理顶层消息而无需显式提及的频道中，非 `off` `replyToMode` 会将每个已处理的根消息路由到 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`，以便可见的 Slack 线程从第一轮对话开始映射到一个 OpenClaw 会话。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话开始时获取多少现有线程消息（默认 `20`；设置为 `0` 以禁用）。
- `channels.slack.thread.requireExplicitMention`（默认 `false`）：当为 `true` 时，抑制隐式线程提及，以便机器人仅响应线程内部的显式 `@bot` 提及，即使机器人已经参与了该线程。否则，在机器人参与的线程中的回复将绕过 `requireMention` 门控。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

<Note>`replyToMode="off"`Slack 禁用 Slack 中**所有**回复串接，包括显式的 `[[reply_to_*]]`Telegram 标签。这与 Telegram 不同，在 Telegram 中，显式标签在 `"off"`SlackTelegram 模式下仍然有效。Slack 串接会从渠道中隐藏消息，而 Telegram 回复则保持内联可见。</Note>

## 确认反应

当 OpenClaw 处理入站消息时，`ackReaction`OpenClaw 会发送一个确认表情符号。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退 (`agents.list[].identity.emoji`，否则为 "👀")

备注：

- Slack 期望使用短代码（例如 Slack`"eyes"`）。
- 使用 `""`Slack 为 Slack 账户或全局禁用该反应。

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：在生成时显示进度状态文本，然后发送最终文本。
- `streaming.preview.toolProgress`：当草稿预览处于活动状态时，将工具/进度更新路由到同一条已编辑的预览消息中（默认：`true`）。设置 `false` 以保持单独的工具/进度消息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：设置为 `status` 以在隐藏原始命令/执行文本的同时保持紧凑的工具进度行（默认：`raw`）。

在隐藏原始命令/执行文本的同时保持紧凑的进度行：

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

`channels.slack.streaming.nativeTransport`Slack 控制 Slack 原生文本流式传输，当 `channels.slack.streaming.mode` 为 `partial` 时（默认：`true`）。

- 回复线程必须可用，才能显示原生文本流和 Slack 助手线程状态。线程选择仍遵循 Slack`replyToMode`。
- 当原生流传输不可用或不存在回复线程时，频道、群聊和顶级私信根节点仍可使用正常的草稿预览。
- 顶级 Slack 私信默认保持在线程外，因此它们不显示 Slack 的线程式原生流/状态预览；OpenClaw 会在私信中发布并编辑草稿预览。
- 媒体和非文本负载将回退到正常投递。
- 媒体/错误最终结果会取消待处理的预览编辑；符合条件的文本/块最终结果仅在可以就地编辑预览时才刷新。
- 如果在回复过程中流传输失败，OpenClaw 将对剩余负载回退到正常投递。

使用草稿预览代替 Slack 原生文本流：

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

旧版密钥：

- `channels.slack.streamMode` (`replace | status_final | append`) 是 `channels.slack.streaming.mode` 的旧版运行时别名。
- 布尔值 `channels.slack.streaming` 是 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport` 的旧版运行时别名。
- 旧版 `channels.slack.nativeStreaming` 是 `channels.slack.streaming.nativeTransport` 的运行时别名。
- 运行 `openclaw doctor --fix`Slack 以将持久化的 Slack 流传输配置重写为规范密钥。

## 正在输入反应回退

当 OpenClaw 处理回复时，`typingReaction`SlackOpenClaw 会向传入的 Slack 消息添加一个临时反应，然后在运行完成时将其移除。这在线程回复之外最有用，因为线程回复使用默认的“正在输入...”状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

备注：

- Slack 预期使用短代码（例如 Slack`"hourglass_flowing_sand"`）。
- 反应是尽力而为的，并在回复或失败路径完成后自动尝试清理。

## 媒体、分块和投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件从 Slack 托管的私有 URL（令牌认证请求流程）下载，并在获取成功且大小限制允许时写入媒体存储。文件占位符包含 Slack `fileId`，以便代理可以使用 `download-file` 获取原始文件。

    下载使用有界的空闲和总超时。如果 Slack 文件检索停滞或失败，OpenClaw 会继续处理该消息并回退到文件占位符。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="出站文本和文件">
    - 文本块使用 `channels.slack.textChunkLimit`（默认 4000）
    - `channels.slack.chunkMode="newline"` 启用以段落优先的分割
    - 文件发送使用 Slack 上传 API 并且可以包含线程回复（`thread_ts`）
    - 出站媒体上限遵循配置的 `channels.slack.mediaMaxMb`；否则渠道发送使用媒体管道中的 MIME 类型默认值

  </Accordion>

  <Accordion title="传送目标">
    首选的显式目标：

    - 用于私信的 `user:<id>`
    - 用于渠道的 `channel:<id>`

    仅文本/块的 Slack 私信可以直接发布到用户 ID；文件上传和线程发送首先通过 Slack 会话 API 打开私信，因为这些路径需要具体的会话 ID。

  </Accordion>
</AccordionGroup>

## 命令和斜杠行为

斜杠命令在 Slack 中显示为单个配置的命令或多个本机命令。配置 `channels.slack.slashCommand` 以更改命令默认值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生命令需要在您的 Slack 应用中进行[其他清单设置](#additional-manifest-settings)，并在全局配置中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 启用。

- 对于 Slack，原生命令自动模式默认为**关闭**，因此 `commands.native: "auto"` 不会启用 Slack 原生命令。

```txt
/help
```

原生参数菜单使用自适应渲染策略，在发送选定的选项值之前显示确认模态框：

- 最多 5 个选项：按钮块
- 6-100 个选项：静态选择菜单
- 超过 100 个选项：当有交互选项处理程序可用时，使用具有异步选项过滤的外部选择
- 超过 Slack 限制：编码的选项值将回退到按钮

```txt
/think
```

斜杠会话（Slash sessions）使用像 `agent:<agentId>:slack:slash:<userId>` 这样的隔离键，并且仍然使用 `CommandTargetSessionKey` 将命令执行路由到目标对话会话。

## 交互式回复

Slack 可以呈现代理创建的交互式回复控件，但此功能默认处于禁用状态。

全局启用：

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

或者仅为一个 Slack 账户启用：

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

启用后，代理可以发出 Slack 专用的回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令会编译为 Slack Block Kit，并通过现有的 Slack 交互事件路径将点击或选择路由回来。

注意：

- 这是 Slack 特有的 UI。其他通道不会将 Slack Block Kit 指令转换为其自己的按钮系统。
- 交互式回调值是由 OpenClaw 生成的不透明令牌，而不是代理创建的原始值。
- 如果生成的交互块超过 Slack Block Kit 限制，OpenClaw 将回退到原始文本回复，而不是发送无效的块有效载荷。

## Slack 中的执行批准

Slack 可以充当原生审批客户端，具备交互式按钮和交互功能，而不必回退到 Web UI 或终端。

- Exec 批准使用 `channels.slack.execApprovals.*` 进行原生私信/渠道路由。
- 当请求已经到达 Slack 且批准 id 类型为 `plugin:` 时，插件批准仍可通过同一个 Slack 原生按钮界面解决。
- 批准者授权仍然有效：只有被识别为批准者的用户才能通过 Slack 批准或拒绝请求。

这与其他渠道使用相同的共享批准按钮界面。当在您的 Slack 应用设置中启用了 `interactivity` 时，批准提示将直接在对话中呈现为 Block Kit 按钮。
当存在这些按钮时，它们是主要的批准用户体验；OpenClaw
仅应在工具结果指示聊天批准不可用或手动批准是唯一途径时，包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；尽可能回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认值：`dm`）
- `agentFilter`、`sessionFilter`

当 `enabled` 未设置或为 `"auto"` 并且至少有一个
批准者解析时，Slack 会自动启用原生 Exec 批准。设置 `enabled: false` 以明确禁用 Slack 作为原生批准客户端。
设置 `enabled: true` 以在批准者解析时强制启用原生批准。

没有明确 Slack Exec 批准配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有当您想要覆盖批准者、添加过滤器或
选择启用原始聊天传递时，才需要明确的 Slack 原生配置：

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

共享 `approvals.exec` 转发是独立的。仅当执行审批提示也必须
路由到其他聊天或显式的带外目标时，才使用它。共享 `approvals.plugin` 转发也是
独立的；当这些请求已经到达 Slack 时，Slack 原生按钮仍然可以解决插件审批。

同聊天 `/approve` 也适用于已经支持命令的 Slack 渠道和私信。有关完整的审批转发模型，请参阅 [Exec approvals](/zh/tools/exec-approvals)。

## 事件和操作行为

- 消息编辑/删除被映射为系统事件。
- 线程广播（“Also send to 渠道”线程回复）作为普通用户消息处理。
- Reaction 添加/移除事件被映射为系统事件。
- 成员加入/离开、渠道创建/重命名以及固定项添加/移除事件被映射为系统事件。
- 当启用 `configWrites` 时，`channel_id_changed` 可以迁移渠道配置键。
- 渠道主题/用途元数据被视为不受信任的上下文，可以注入到路由上下文中。
- 线程发起者和初始线程历史上下文种子会在适用时根据配置的发送者允许列表进行过滤。
- Block 操作和模态交互会发出带有丰富负载字段的结构化 `Slack interaction: ...` 系统事件：
  - block 操作：选定的值、标签、选择器值和 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，包含路由的渠道元数据和表单输入

## 配置参考

主要参考：[Configuration reference - Slack](/zh/gateway/config-channels#slack)。

<Accordion title="高信噪比 Slack 字段">

- 模式/认证：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
- 私信访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
- 兼容性切换：`dangerouslyAllowNameMatching`（应急措施；除非需要，否则保持关闭）
- 渠道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
- 线程/历史记录：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 传递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
- 运维/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

</Accordion>

## 故障排除

<AccordionGroup>
  <Accordion title="渠道中无回复">
    按顺序检查：

    - `groupPolicy`
    - 渠道允许列表 (`channels.slack.channels`) — **键必须是渠道 ID** (`C12345678`)，而非名称 (`#channel-name`)。在 `groupPolicy: "allowlist"` 下，基于名称的键会静默失败，因为默认情况下渠道路由优先使用 ID。要查找 ID：在 Slack 中右键点击该渠道 → **复制链接** — URL 末尾的 `C...` 值即为渠道 ID。
    - `requireMention`
    - 每个渠道的 `users` 允许列表

    有用的命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="私信消息被忽略">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (或旧版 `channels.slack.dm.policy`)
    - 配对批准 / 允许列表条目
    - Slack 助手私信事件：提及 `drop message_changed` 的详细日志
      通常意味着 Slack 发送了一个已编辑的助手线程事件，但在消息元数据中
      没有可恢复的人类发送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式无法连接">
    在 Slack 应用设置中验证 bot + app 令牌以及 Socket 模式是否已启用。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，则说明 Slack 账户
    已配置，但当前运行时无法解析由 SecretRef 支持的
    值。

  </Accordion>

  <Accordion title="HTTP 模式未收到事件">
    验证：

    - 签名密钥
    - webhook 路径
    - Slack 请求 URL (事件 + 交互 + 斜杠命令)
    - 每个 HTTP 账户唯一的 `webhookPath`

    如果账户快照中出现 `signingSecretStatus: "configured_unavailable"`，则说明 HTTP 账户
    已配置，但当前运行时无法
    解析由 SecretRef 支持的签名密钥。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    请确认您是否打算：

    - 原生命令模式 (`channels.slack.commands.native: true`)，并已在 Slack 中注册了匹配的斜杠命令
    - 或者单一斜杠命令模式 (`channels.slack.slashCommand.enabled: true`)

    同时检查 `commands.useAccessGroups` 和 渠道/用户 白名单。

  </Accordion>
</AccordionGroup>

## 附件视觉参考

当 Slack 文件下载成功且符合大小限制时，Slack 可以将下载的媒体附加到 Agent 的轮次中。图像文件可以通过媒体理解路径传递，也可以直接传递给具有视觉能力的回复模型；其他文件则作为可下载的文件上下文保留，而不作为图像输入处理。

### 支持的媒体类型

| 媒体类型                     | 来源            | 当前行为                                                           | 备注                                                    |
| ---------------------------- | --------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| JPEG / PNG / GIF / WebP 图像 | Slack 文件 URL  | 已下载并附加到轮次中，以进行具有视觉能力的处理                     | 每个文件上限：`channels.slack.mediaMaxMb`（默认 20 MB） |
| PDF 文件                     | Slack 文件 URL  | 已下载并作为文件上下文公开，供 `download-file` 或 `pdf` 等工具使用 | Slack 入站不会自动将 PDF 转换为图像视觉输入             |
| 其他文件                     | Slack 文件 URL  | 尽可能下载并作为文件上下文公开                                     | 二进制文件不被视为图像输入                              |
| 线程回复                     | 线程起始文件    | 当回复没有直接媒体时，根消息文件可以作为上下文被加载               | 仅包含文件的起始消息使用附件占位符                      |
| 多图消息                     | 多个 Slack 文件 | 每个文件都被独立评估                                               | Slack 处理限制为每条消息八个文件                        |

### 入站管道

当带有文件附件的 Slack 消息到达时：

1. OpenClaw 使用 bot 令牌 (`xoxb-...`) 从 Slack 的私有 URL 下载文件。
2. 成功后，文件将被写入媒体存储。
3. 下载的媒体路径和内容类型被添加到入站上下文中。
4. 支持图像的模型/工具路径可以使用该上下文中的图像附件。
5. 非图像文件仍可作为文件元数据或媒体引用供能够处理它们的工具使用。

### 线程根附件继承

当消息在线程中到达（具有 `thread_ts` 父级）时：

- 如果回复本身没有直接媒体且包含的根消息有文件，Slack 可以将根文件作为线程启动上下文进行填充。
- 直接回复附件优先于根消息附件。
- 只有文件而没有文本的根消息用附件占位符表示，以便回退仍能包含其文件。

### 多附件处理

当单条 Slack 消息包含多个文件附件时：

- 每个附件通过媒体管道独立处理。
- 下载的媒体引用被聚合到消息上下文中。
- 处理顺序遵循事件负载中 Slack 的文件顺序。
- 一个附件下载失败不会阻止其他附件。

### 大小、下载和模型限制

- **大小上限**：默认每个文件 20 MB。可通过 `channels.slack.mediaMaxMb` 配置。
- **下载失败**：Slack 无法提供的文件、过期的 URL、无法访问的文件、超大文件以及 Slack 身份验证/登录 HTML 响应将被跳过，而不会报告为不支持的格式。
- **视觉模型**：当激活的回复模型支持视觉时，图像分析使用该模型，或者使用在 `agents.defaults.imageModel` 配置的图像模型。

### 已知限制

| 场景                         | 当前行为                                        | 变通方法                                                            |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Slack 文件 URL 已过期        | 文件已跳过；未显示错误                          | 在 Slack 中重新上传文件                                             |
| 未配置视觉模型               | 图像附件存储为媒体引用，但未作为图像进行分析    | 配置 `agents.defaults.imageModel` 或使用支持视觉的回复模型          |
| 非常大的图像（默认 > 20 MB） | 因大小上限而被跳过                              | 如果 Slack 允许，增加 `channels.slack.mediaMaxMb`                   |
| 转发/共享附件                | 文本和 Slack 托管的图像/文件媒体尽力而为        | 直接在 OpenClaw 线程中重新分享                                      |
| PDF 附件                     | 存储为文件/媒体上下文，不会自动通过图像视觉路由 | 使用 `download-file` 获取文件元数据，或使用 `pdf` 工具进行 PDF 分析 |

### 相关文档

- [媒体理解流程](/zh/nodes/media-understanding)
- [PDF 工具](/zh/tools/pdf)
- Epic: [#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件视觉功能启用
- 回归测试: [#51353](https://github.com/openclaw/openclaw/issues/51353)
- 实时验证: [#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相关

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    将 Slack 用户与网关配对。
  </Card>
  <Card title="群组" icon="users" href="/zh/channels/groups">
    频道和群组私信行为。
  </Card>
  <Card title="频道路由" icon="route" href="/zh/channels/channel-routing">
    将传入消息路由到代理。
  </Card>
  <Card title="安全" icon="shield" href="/zh/gateway/security">
    威胁模型和加固。
  </Card>
  <Card title="配置" icon="sliders" href="/zh/gateway/configuration">
    配置布局和优先级。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/zh/tools/slash-commands">
    命令目录和行为。
  </Card>
</CardGroup>
