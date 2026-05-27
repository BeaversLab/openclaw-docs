---
summary: "SlackSlack 设置和运行时行为（Socket Mode + HTTP 请求 URL）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "SlackSlack"
---

通过 Slack 应用集成支持私信和渠道的生产环境使用。默认模式为 Socket 模式；同时也支持 HTTP 请求 URL。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing" Slack>
    Slack 私信默认为配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## 选择 Socket Mode 或 HTTP Request URLs

两种传输方式均已可用于生产环境，并在消息传递、斜杠命令、App 主页和交互功能方面达到功能对等。请根据部署形态进行选择，而非基于功能。

| 关注点                            | Socket Mode（默认）                                                                                           | HTTP Request URLs                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 公共 Gateway(网关) URL            | 不需要                                                                                                        | 需要（DNS、TLS、反向代理或隧道）                                                       |
| 出站网络                          | 到 `wss-primary.slack.com` 的出站 WSS 必须可达                                                                | 无出站 WS；仅入站 HTTPS                                                                |
| 所需的令牌                        | Bot 令牌 + 具有 `connections:write` 的应用级令牌                                                              | Bot 令牌 + 签名密钥                                                                    |
| 开发笔记本电脑 / 防火墙后         | 按原样工作                                                                                                    | 需要公共隧道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或暂存 Gateway(网关)         |
| 横向扩容                          | 每个主机上的每个应用一个 Socket Mode 会话；多个 Slack 需要单独的 Slack 应用                                   | 无状态 POST 处理程序；多个 Gateway(网关) 副本可以在负载均衡器后共享一个应用            |
| 在一个 Gateway(网关) 上支持多账户 | 支持；每个账户打开自己的 WS                                                                                   | 支持；每个账户需要一个唯一的 `webhookPath`（默认为 `/slack/events`），以免注册发生冲突 |
| 斜杠命令传输                      | 通过 WS 连接传递；`slash_commands[].url` 被忽略                                                               | Slack POST 请求发送至 Slack`slash_commands[].url`；该字段是命令分发所必需的            |
| 请求签名                          | 未使用（身份验证为 App-Level Token）                                                                          | Slack 对每个请求进行签名；OpenClaw 使用 SlackOpenClaw`signingSecret` 进行验证          |
| 连接断开时的恢复                  | Slack SDK 自动重连已启用；OpenClaw 还会以有界退避策略重启失败的 Socket Mode 会话。Pong-timeout 传输调优适用。 | 没有持久的连接会断开；重试由 Slack 对每个请求进行                                      |

<Note>
  对于单 Gateway(网关) 主机、开发笔记本电脑以及可以出站访问 Gateway(网关)`*.slack.com`Gateway(网关)Slack 但无法接受入站 HTTPS 的本地网络，**请选择 Socket Mode**。

当在负载均衡器后运行多个 Gateway(网关) 副本、出站 WSS 被阻止但允许入站 HTTPS，或者您已经在反向代理处终止 Slack webhooks 时，**请选择 HTTP Request URLs**。

</Note>

## 安装

在配置渠道之前先安装 Slack：

```bash
openclaw plugins install @openclaw/slack
```

`plugins install`Slack 注册并启用该插件。在您配置下方的 Slack 应用和渠道设置之前，该插件仍然没有任何作用。有关常规插件行为和安装规则，请参阅[插件](/zh/tools/plugin)。

## 快速设置

<Tabs>
  <Tab title="Socket Mode (默认)">
    <Steps>
      <Step title="创建新的 Slack 应用">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择你的工作区 → 粘贴以下任一 manifest → **Next** → **Create**。

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
          **Recommended（推荐）** 匹配 Slack 插件的完整功能集：App Home、斜杠命令、文件、表情回应、固定消息、群组私信以及表情符号/用户组读取。当工作区策略限制范围时，请选择 **Minimal（最小化）** —— 它覆盖私信、渠道/群组历史记录、提及和斜杠命令，但会移除文件、表情回应、固定消息、群组私信 (`mpim:*`)、`emoji:read` 和 `usergroups:read`。有关每个范围的理由和额外斜杠命令等附加选项，请参阅 [Manifest and scope checklist](#manifest-and-scope-checklist)。
        </Note>

        当 Slack 创建应用后：

        - **Basic Information -> App-Level Tokens -> Generate Token and Scopes**：添加 `connections:write`，保存，然后复制 App-Level Token。
        - **Install App -> Install to Workspace**：复制 Bot User OAuth Token。

      </Step>

      <Step title="配置 OpenClaw">

        推荐的 SecretRef 设置：

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

        环境变量回退（仅限默认账户）：

```bash
SLACK_APP_TOKEN=slack-app-token-example
SLACK_BOT_TOKEN=slack-bot-token-example
```

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="Create a new Slack app">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择你的工作区 → 粘贴下面的清单之一 → 将 `https://gateway-host.example.com/slack/events` 替换为你的公共 Gateway(网关) URL → **Next** → **Create**。

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
          **Recommended（推荐）** 匹配 Slack 插件的完整功能集；**Minimal（最小化）** 针对受限工作区去掉了文件、表情符号反应、固定消息、群组私信（`mpim:*`）、`emoji:read` 和 `usergroups:read`。有关每个作用域的理由，请参阅 [Manifest and scope checklist](#manifest-and-scope-checklist)。
        </Note>

        <Info>
          三个 URL 字段（`slash_commands[].url`、`event_subscriptions.request_url` 和 `interactivity.request_url` / `message_menu_options_url`）都指向同一个 OpenClaw 端点。Slack 的清单架构要求它们分别命名，但 OpenClaw 根据负载类型进行路由，因此一个 `webhookPath`（默认 `/slack/events`）就足够了。在 HTTP 模式下，没有 `slash_commands[].url` 的斜杠命令将静默无操作。
        </Info>

        Slack 创建应用后：

        - **Basic Information → App Credentials（基本信息 → 应用凭据）**：复制 **Signing Secret（签名密钥）** 用于请求验证。
        - **Install App -> Install to Workspace（安装应用 -> 安装到工作区）**：复制 Bot User OAuth Token（Bot 用户 OAuth 令牌）。

      </Step>

      <Step title="Configure OpenClaw">

        推荐的 SecretRef 设置：

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
        为多账户 HTTP 使用唯一的 Webhook 路径

        为每个账户指定不同的 `webhookPath`（默认 `/slack/events`），以免注册发生冲突。
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

## Socket Mode 传输调优

OpenClaw 默认将 Slack SDK 客户端的 pong 超时时间设置为 15 秒（针对 Socket Mode）。仅在需要针对特定工作区或主机进行调优时才覆盖传输设置：

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

仅将其用于记录 Slack websocket pong/server-ping 超时或在存在已知事件循环阻塞的主机上运行的 Socket Mode 工作区。Slack`clientPingTimeout` 是 SDK 发送 client ping 后的 pong 等待时间；`serverPingTimeout`Slack 是等待 Slack server pings 的时间。应用消息和事件保持应用程序状态，而非传输活动信号。

注意事项：

- `socketMode` 在 HTTP Request URL 模式下会被忽略。
- 基础 `channels.slack.socketMode`Slack 设置适用于所有 Slack 账户，除非被覆盖。针对每个账户的覆盖使用 `channels.slack.accounts.<accountId>.socketMode`；由于这是对象覆盖，请包含该账户所需的每个 socket 调优字段。
- 只有 `clientPingTimeout`OpenClaw 具有默认值 (`15000`)。`serverPingTimeout` 和 `pingPongLoggingEnabled`Slack 仅在配置时才传递给 Slack SDK。
- Socket Mode 重启退避（backoff）从大约 2 秒开始，上限约为 30 秒。连续的可恢复的 start/start-wait 失败在 12 次尝试后停止；成功连接后，随后的可恢复断开连接将开始新的重试周期。不可恢复的 Slack 认证错误（如 Slack`invalid_auth`、已撤销的令牌或缺失的作用域）将快速失败，而不是无限重试。

## 清单和范围检查表

基础 Slack 应用清单对于 Socket Mode 和 HTTP Request URLs 是相同的。只有 Slack`settings` 块（以及斜杠命令 `url`）有所不同。

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

对于 **HTTP Request URLs 模式**，请用 HTTP 变体替换 `settings` 并将 `url` 添加到每个斜杠命令。需要公共 URL：

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

### 其他清单设置

展示扩展上述默认配置的不同功能。

默认清单启用了 Slack App 主页 **Home** 选项卡，并订阅了 Slack`app_home_opened`OpenClaw。当工作区成员打开 Home 选项卡时，OpenClaw 会发布一个安全的默认主页视图，其中包含 `views.publish`SlackSlack；不包含对话负载或私有配置。**Messages** 选项卡仍为 Slack 私信启用。清单还通过 `features.assistant_view`、`assistant:write`、`assistant_thread_started` 和 `assistant_thread_context_changed`OpenClawSlack 启用 Slack 助手线程；助手线程会路由到其各自的 OpenClaw 线程会话，并使 Slack 提供的线程上下文可供代理使用。

<AccordionGroup>
  <Accordion title="Optional native slash commands">

    可以使用多个[原生斜杠命令](#commands-and-slash-behavior)来代替单个配置的细微差别命令：

    - 使用 `/agentstatus` 代替 `/status`，因为 `/status` 命令已被保留。
    - 一次可用的斜杠命令不得超过 25 个。

    将您现有的 `features.slash_commands` 部分替换为[可用命令](/zh/tools/slash-commands#command-list)的子集：

    <Tabs>
      <Tab title="Socket Mode (default)">

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
        使用与上述 Socket Mode 相同的 `slash_commands` 列表，并向每个条目添加 `"url": "https://gateway-host.example.com/slack/events"`。示例：

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

        在列表中的每个命令上重复该 `url` 值。

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="可选的作者身份范围（写入操作）">
    如果您希望传出消息使用活跃代理身份（自定义用户名和图标）而不是默认的 Slack 应用身份，请添加 `chat:write.customize` bot 作用域。

    如果您使用表情符号图标，Slack 期望使用 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="可选的用户令牌范围（读取操作）">
    如果您配置 `channels.slack.userToken`，典型的读取作用域包括：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果您依赖于 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受纯文本
  字符串或 SecretRef 对象。
- 配置令牌会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken` 仅限配置（无环境变量回退），并且默认为只读行为（`userTokenReadOnly: true`）。

状态快照行为：

- Slack 账户检查会跟踪每个凭据的 `*Source` 和 `*Status`
  字段（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 状态为 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示账户是通过 SecretRef 或其他非内联密钥源配置的，但当前的命令/运行时路径无法解析实际值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket Mode 下，必需的配对是 `botTokenStatus` + `appTokenStatus`。

<Tip>对于操作/目录读取，配置后可以首选用户令牌。对于写入，机器人令牌仍然是首选；仅当 `userTokenReadOnly: false` 且机器人令牌不可用时，才允许用户令牌写入。</Tip>

## 操作和门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组         | 默认值 |
| ---------- | ------ |
| messages   | 已启用 |
| reactions  | 已启用 |
| pins       | 已启用 |
| memberInfo | 已启用 |
| emojiList  | 已启用 |

当前的 Slack 消息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接收入站文件占位符中显示的 Slack 文件 ID，并为图像返回图像预览，或为其他文件类型返回本地文件元数据。

## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
    `channels.slack.dmPolicy` 控制私信访问。`channels.slack.allowFrom` 是规范的私信允许列表。

    - `pairing` (默认)
    - `allowlist`
    - `open` (要求 `channels.slack.allowFrom` 包含 `"*"`)
    - `disabled`

    私信标志：

    - `dm.enabled` (默认为 true)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (旧版)
    - `dm.groupEnabled` (群组私信默认为 false)
    - `dm.groupChannels` (可选的 MPIM 允许列表)

    多账户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在其自己的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 命名账户不继承 `channels.slack.accounts.default.allowFrom`。

    旧版的 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom` 仍会被读取以保持兼容性。`openclaw doctor --fix` 会在不改变访问权限的情况下将它们迁移到 `dmPolicy` 和 `allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制渠道处理：

    - `open`
    - `allowlist`
    - `disabled`

    渠道允许列表位于 `channels.slack.channels` 下，并且**必须使用稳定的 Slack 渠道 ID**（例如 `C12345678`）作为配置键。

    运行时说明：如果完全缺少 `channels.slack`（仅环境变量设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 当令牌访问允许时，渠道允许列表条目和私信允许列表条目在启动时解析
    - 未解析的渠道名称条目将按配置保留，但默认情况下在路由中被忽略
    - 入站授权和渠道路由默认以 ID 为先；直接的用户名/别名匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基于名称的键（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不**匹配。渠道查找默认以 ID 为先，因此基于名称的键永远不会成功路由，并且该渠道中的所有消息都将被静默阻止。这与 `groupPolicy: "open"` 不同，后者不需要渠道密钥即可路由，并且基于名称的键似乎可以工作。

    始终使用 Slack 渠道 ID 作为键。要查找它：在 Slack 中右键单击该渠道 → **Copy link** — ID（`C...`）出现在 URL 的末尾。

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

    - 显式应用提及 (`<@botId>`Slack)
    - Slack 用户组提及 (`<!subteam^S...>`)，当机器人用户是该用户组的成员时；需要 `usergroups:read`
    - 提及正则表达式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为（当 `thread.requireExplicitMention` 为 `true` 时禁用）

    每个渠道的控制 (`channels.slack.channels.<id>`；名称仅通过启动解析或 `dangerouslyAllowNameMatching` 获取)：

    - `requireMention`
    - `users` (白名单)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`，`toolsBySender`
    - `toolsBySender` 键格式：`channel:`、`id:`、`e164:`、`username:`、`name:` 或 `"*"` 通配符
      （旧的无前缀键仍然仅映射到 `id:`）

    对于渠道和私有渠道，`allowBots` 采用保守策略：仅当发送机器人在该房间的 `users`Slack 白名单中被明确列出，或者当 `channels.slack.allowFrom`Slack 中至少有一个明确的 Slack 所有者 ID 当前是房间成员时，才会接受机器人撰写的房间消息。通配符和显示名称所有者条目不满足所有者存在的要求。所有者存在使用 Slack `conversations.members`；请确保应用具有针对房间类型的匹配读取范围（公共渠道为 `channels:read`，私有渠道为 `groups:read`OpenClawSlack）。如果成员查找失败，OpenClaw 将丢弃机器人撰写的房间消息。

    接受的机器人撰写的 Slack 消息使用共享的 [机器人循环保护](/zh/channels/bot-loop-protection)。配置 `channels.defaults.botLoopProtection` 以设置默认预算，然后当工作区或渠道需要不同的限制时，使用 `channels.slack.botLoopProtection` 或 `channels.slack.channels.<id>.botLoopProtection` 进行覆盖。

  </Tab>
</Tabs>

## 线程、会话和回复标签

- 私信路由为 `direct`；渠道路由为 `channel`；MPIM 路由为 `group`。
- Slack 路由绑定接受原始对等 ID 以及 Slack 目标格式，例如 SlackSlack`channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用默认的 `session.dmScope=main`Slack 时，Slack 私信会合并到代理主会话。
- 渠道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 普通的顶级渠道消息保留在每个渠道的会话中，即使 `replyToMode` 为非 `off`。
- Slack 线程回复使用父级 Slack SlackSlack`thread_ts` 作为会话后缀（`:thread:<threadTs>`），即使使用 `replyToMode="off"` 禁用了出站回复线程。
- 当预期某个符合条件的顶级渠道根节点将启动一个可见的 Slack 线程时，OpenClaw 会将其种子植入 OpenClaw`agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`SlackOpenClaw 中，以便该根节点和随后的线程回复共享一个 OpenClaw 会话。这适用于 `app_mention` 事件、显式机器人或配置的提及模式匹配，以及具有非 `off` `replyToMode` 的 `requireMention: false` 渠道。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制启动新线程会话时获取多少现有线程消息（默认为 `20`；设置为 `0` 以禁用）。
- `channels.slack.thread.requireExplicitMention`（默认 `false`）：当 `true` 时，抑制隐式线程提及，以便机器人仅响应线程内的显式 `@bot` 提及，即使机器人已参与该线程。如果没有此设置，在机器人参与的线程中的回复将绕过 `requireMention` 门控。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

对于来自 `message` 工具的显式 Slack 线程回复，请设置带有 `action: "send"` 和 `threadId` 或 `replyTo` 的 `replyBroadcast: true`，以请求 Slack 将线程回复也广播到父渠道。这映射到 Slack 的 `chat.postMessage` `reply_broadcast` 标志，并且仅支持文本或 Block Kit 发送，不支持媒体上传。

当 `message` 工具调用在 Slack 线程内运行并针对同一渠道时，OpenClaw 通常根据 `replyToMode` 继承当前的 Slack 线程。在 `action: "send"` 或 `action: "upload-file"` 上设置 `topLevel: true` 以强制改为发送新的父渠道消息。`threadId: null` 被视为相同的顶级退出选项。

<Note>
`replyToMode="off"`Slack 禁用出站 Slack 回复串接，包括显式的 `[[reply_to_*]]`SlackSlack 标签。它不会扁平化入站 Slack 串接会话：已发布在 Slack 串接内的消息仍会路由到 `:thread:<threadTs>`Telegram 会话。这与 Telegram 不同，在 Telegram 中，显式标签在 `"off"`SlackTelegram 模式下仍然受到尊重。Slack 串接会向渠道隐藏消息，而 Telegram 回复则保持内联可见。
</Note>

## 确认反应

`ackReaction`OpenClaw 在 OpenClaw 处理入站消息时发送一个确认表情符号。`ackReactionScope` 决定该表情符号的实际发送时间。

### 表情符号 (`ackReaction`)

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退 (`agents.list[].identity.emoji`，否则 `"eyes"` / 👀)

注意：

- Slack 期望使用短代码（例如 Slack`"eyes"`）。
- 使用 `""`Slack 为 Slack 账户或全局禁用该反应。

### 范围 (`messages.ackReactionScope`)

Slack 提供商从 Slack`messages.ackReactionScope` 读取范围（默认为 `"group-mentions"`SlackSlack）。目前没有 Slack 账户或 Slack 渠道级别的覆盖；该值对于网关是全局的。

值：

- `"all"`：在私信和群组中做出反应。
- `"direct"`：仅在私信中做出反应。
- `"group-all"`：对每条群组消息做出反应（无私信）。
- `"group-mentions"` （默认）：在群组中做出反应，但仅当机器人被提及时（或在选择加入的可提及群组中）。**私信被排除。**
- `"off"` / `"none"`：从不做出反应。

<Note>The default scope (`"group-mentions"`) does not fire ack reactions in direct messages. To see the configured `ackReaction` (for example `"eyes"`Slack) on inbound Slack 私信, set `messages.ackReactionScope` to `"direct"` or `"all"`. `messages.ackReactionScope`Slack is read at Slack 提供商 startup, so a gateway restart is needed for the change to take effect.</Note>

```json5
{
  messages: {
    ackReaction: "eyes",
    ackReactionScope: "all", // react in DMs and groups
  },
}
```

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：生成时显示进度状态文本，然后发送最终文本。
- `streaming.preview.toolProgress`：当草稿预览处于活动状态时，将工具/进度更新路由到同一条编辑过的预览消息中（默认：`true`）。设置 `false` 以保持独立的工具/进度消息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：设置为 `status` 以在隐藏原始命令/执行文本的同时保留紧凑的工具进度行（默认：`raw`）。

隐藏原始命令/执行文本，同时保留紧凑的进度行：

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

`channels.slack.streaming.nativeTransport`Slack 控制 Slack 原生文本流式传输（当 `channels.slack.streaming.mode` 为 `partial` 时）（默认：`true`）。

- 要显示原生文本流式传输和 Slack 助手线程状态，必须提供回复线程。线程选择仍遵循 Slack`replyToMode`。
- 当无法使用原生流式传输或不存在回复线程时，频道、群聊和顶级私信根节点仍可使用正常的草稿预览。
- 顶层 Slack 私信默认保持在线程外，因此它们不显示 Slack 的线程式原生流/状态预览；相反，OpenClaw 会在私信中发布并编辑草稿预览。
- 媒体和非文本负载会回退到正常交付方式。
- 媒体/错误最终结果会取消待处理的预览编辑；符合条件的文本/块最终结果只有在能够就地编辑预览时才会刷新。
- 如果在回复中途流式传输失败，OpenClaw 将对剩余的负载回退到正常交付方式。

使用草稿预览代替 Slack 原生文本流式传输：

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

旧版键：

- `channels.slack.streamMode` (`replace | status_final | append`) 是 `channels.slack.streaming.mode` 的旧版运行时别名。
- 布尔值 `channels.slack.streaming` 是 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport` 的旧版运行时别名。
- legacy `channels.slack.nativeStreaming` 是 `channels.slack.streaming.nativeTransport` 的运行时别名。
- 运行 `openclaw doctor --fix` 以将持久化的 Slack 流式传输配置重写为规范键。

## 正在输入反应回退

`typingReaction` 会在 Slack 处理回复时向传入的 OpenClaw 消息添加临时反应，然后在运行完成时将其移除。这在线程回复之外最有用，线程回复使用默认的“正在输入...”状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注：

- Slack 期望使用短代码（例如 `"hourglass_flowing_sand"`）。
- 该反应是尽力而为的，并且会在回复或失败路径完成后尝试自动清理。

## 媒体、分块和交付

<AccordionGroup>
  <Accordion title="入站附件"SlackSlackSlack>
    Slack 文件附件会从 Slack 托管的私有 URL（经过令牌认证的请求流程）下载，并在获取成功且大小限制允许的情况下写入媒体存储。文件占位符包含 Slack `fileId`，以便代理可以使用 `download-file`SlackOpenClaw 获取原始文件。

    下载使用受限的空闲和总超时时间。如果 Slack 文件检索停滞或失败，OpenClaw 将继续处理该消息并回退到文件占位符。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="出站文本和文件">
    - 文本块使用 `channels.slack.textChunkLimit`（默认为 4000）
    - `channels.slack.chunkMode="newline"`Slack 启用段落优先的拆分
    - 文件发送使用 Slack 上传 API，并且可以包含线程回复（`thread_ts`）
    - 出站媒体上限在配置时遵循 `channels.slack.mediaMaxMb`；否则，渠道发送使用来自媒体流水线的 MIME 类型默认值

  </Accordion>

  <Accordion title="投递目标">
    首选的显式目标：

    - `user:<id>` 用于私信
    - `channel:<id>`SlackSlack 用于渠道

    仅含文本/块的 Slack 私信可以直接发布到用户 ID；文件上传和线程发送会先通过 Slack 会话 API 打开私信，因为这些路径需要具体的会话 ID。

  </Accordion>
</AccordionGroup>

## 命令和斜杠行为

斜杠命令在 Slack 中显示为单个已配置命令或多个本机命令。配置 Slack`channels.slack.slashCommand` 以更改命令默认值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生命令需要在您的 Slack 应用中进行[额外的清单设置](#additional-manifest-settingsSlack)，并改为在全局配置中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 启用。

- 对于 Slack，原生命令自动模式默认为**关闭**，因此 Slack`commands.native: "auto"`Slack 不会启用 Slack 原生命令。

```txt
/help
```

原生参数菜单使用自适应渲染策略，在分发选定的选项值之前显示确认模态框：

- 最多 5 个选项：按钮块
- 6-100 个选项：静态选择菜单
- 超过 100 个选项：外部选择菜单，并在提供交互选项处理程序时进行异步选项筛选
- 超过 Slack 限制：编码的选项值将回退到按钮

```txt
/think
```

斜杠会话使用像 `agent:<agentId>:slack:slash:<userId>` 这样的隔离键，并仍然使用 `CommandTargetSessionKey` 将命令执行路由到目标对话会话。

## 交互式回复

Slack 可以呈现代理创作的交互式回复控件，但此功能默认处于禁用状态。
对于新的代理、CLI 和插件输出，首选共享的
SlackCLI`presentation`Slack 按钮或选择块。它们使用相同的 Slack 交互
路径，同时也能在其他渠道上降级显示。

在全局范围内启用它：

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

或者仅为一个 Slack 帐户启用它：

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

启用后，代理仍然可以发出已弃用的 Slack 专用回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令会编译成 Slack Block Kit，并将点击或选择
通过现有的 Slack 交互事件路径路由回来。请将它们保留用于旧的
提示词和 Slack 专用应急手段；对于新的
可移植控件，请使用共享的呈现方式。

指令编译器 API 对于新的生产者代码也已弃用：

- `compileSlackInteractiveReplies(...)`
- `parseSlackOptionsLine(...)`
- `isSlackInteractiveRepliesEnabled(...)`
- `buildSlackInteractiveBlocks(...)`

对 Slack 渲染的控件使用 `presentation` 载荷和 `buildSlackPresentationBlocks(...)`Slack。

注意：

- 这是 Slack 特有的旧版 UI。其他通道不会将 Slack Block Kit 指令转换为其自己的按钮系统。
- 交互式回调值是 OpenClaw 生成的不透明令牌，而不是代理编写的原始值。
- 如果生成的交互式块超出 Slack Block Kit 限制，OpenClaw 将回退到原始文本回复，而不是发送无效的块载荷。

### 插件拥有的模态提交

注册交互式处理程序的 Slack 插件还可以在 OpenClaw 为代理可见的系统事件压缩载荷之前，接收模态 Slack`view_submission` 和 `view_closed`OpenClawSlack 生命周期事件。打开 Slack 模态时，请使用以下路由模式之一：

- 将 `callback_id` 设置为 `openclaw:<namespace>:<payload>`。
- 或者保留现有的 `callback_id` 并将 `pluginInteractiveData:
"<namespace>:<payload>"` in the modal `private_metadata`。

处理程序接收 `ctx.interaction.kind` 作为 `view_submission` 或 `view_closed`、规范化的 `inputs`，以及来自 Slack 的完整原始 `stateValues`Slack 对象。仅基于回调 ID 的路由足以调用插件处理程序；当模态还应生成代理可见的系统事件时，包含现有的模态 `private_metadata` 用户/会话路由字段。代理接收一个压缩的、已编辑的 `Slack interaction: ...` 系统事件。如果处理程序返回 `systemEvent.summary`、`systemEvent.reference` 或 `systemEvent.data`，这些字段将包含在该压缩事件中，以便代理可以引用插件拥有的存储，而无需查看完整的表单载荷。

## Slack 中的原生审批

Slack 可以作为原生审批客户端，具有交互式按钮和交互功能，而无需回退到 Web UI 或终端。

- Exec 和插件审批可以呈现为 Slack 原生 Block Kit 提示。
- `channels.slack.execApprovals.*` 仍然是原生 exec 审批客户端启用功能以及私信/渠道路由配置。
- Exec 审批私信使用 `channels.slack.execApprovals.approvers` 或 `commands.ownerAllowFrom`。
- 当 Slack 作为发起会话的原生审批客户端被启用时，或者当 `approvals.plugin` 路由到发起的 Slack 会话或 Slack 目标时，插件审批使用 Slack 原生按钮。
- 插件审批私信使用来自 `channels.slack.allowFrom`、命名账号 `allowFrom` 或账号默认路由的 Slack 插件审批者。
- 审批者授权仍然强制执行：仅限 exec 的审批者无法批准插件请求，除非他们同时也是插件审批者。

这与其他渠道使用相同的共享审批按钮界面。当在您的 Slack 应用设置中启用 `interactivity` 时，审批提示将直接在对话中呈现为 Block Kit 按钮。
当这些按钮存在时，它们是主要的审批 UX；仅当工具结果指示聊天审批不可用或手动审批是唯一途径时，OpenClaw 才应包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` （可选；可能时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target` （`dm` | `channel` | `both`，默认值： `dm`）
- `agentFilter`， `sessionFilter`

当 `enabled` 未设置或为 `"auto"` 且至少有一个执行审批者解决时，Slack 会自动启用原生执行审批。当 Slack 插件审批者解决且请求匹配原生客户端过滤器时，Slack 还可以通过此原生客户端路径处理原生插件审批。设置 `enabled: false` 可显式禁用 Slack 作为原生审批客户端。设置 `enabled: true` 可在审批者解决时强制启用原生审批。禁用 Slack 执行审批不会禁用通过 `approvals.plugin` 启用的原生 Slack 插件审批传递；插件审批传递改用 Slack 插件审批者。

没有显式 Slack 执行审批配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

仅当您想要覆盖审批者、添加过滤器或选择启用源聊天传递时，才需要显式的 Slack-native 配置：

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

共享 `approvals.exec` 转发是分开的。仅当执行审批提示也必须路由到其他聊天或显式的带外目标时才使用它。共享 `approvals.plugin` 转发也是分开的；仅当 Slack 能够原生处理插件审批请求时，Slack 原生传递才会抑制该回退。

同聊天 `/approve` 也适用于已支持命令的 Slack 渠道和私信。有关完整的审批转发模型，请参阅 [Exec approvals](/zh/tools/exec-approvals)。

## 事件和操作行为

- 消息编辑/删除被映射为系统事件。
- 线程广播（“Also send to 渠道”[同时发送到频道] 线程回复）被作为正常用户消息处理。
- 表情符号添加/移除事件被映射为系统事件。
- 成员加入/离开、频道创建/重命名以及固定项添加/移除事件被映射为系统事件。
- `channel_id_changed` 可以在启用 `configWrites` 时迁移频道配置键。
- 渠道主题/用途元数据被视为不受信任的上下文，可以注入到路由上下文中。
- 线程发起者和初始线程历史上下文种子会在适用时根据配置的发送者允许列表进行过滤。
- 块操作和模态交互会发出带有丰富负载字段的 `Slack interaction: ...` 结构化系统事件：
  - 块操作：选定的值、标签、选择器值和 `workflow_*` 元数据
  - 带有路由渠道元数据和表单输入的模态 `view_submission` 和 `view_closed` 事件

## 配置参考

主要参考：[配置参考 - Slack](/zh/gateway/config-channels#slack)。

<Accordion title="Slack高价值 Slack 字段">

- 模式/认证： `mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
- 私信访问： `dm.enabled`、`dmPolicy`、`allowFrom`（旧版： `dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
- 兼容性开关： `dangerouslyAllowNameMatching`（应急使用；除非需要否则保持关闭）
- 渠道访问： `groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
- 穿梭/历史记录： `replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 传递： `textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
- 链接预展开： `unfurlLinks`（默认： `false`）， `unfurlMedia` 用于 `chat.postMessage` 链接/媒体预览控制；设置 `unfurlLinks: true` 以重新启用链接预览
- 运维/功能： `configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

</Accordion>

## 故障排除

<AccordionGroup>
  <Accordion title="渠道中无回复">
    按顺序检查：

    - `groupPolicy`
    - 渠道白名单 (`channels.slack.channels`) — **键必须是渠道 ID** (`C12345678`)，而不是名称 (`#channel-name`)。在 `groupPolicy: "allowlist"`Slack 下，基于名称的键会静默失败，因为渠道路由默认优先使用 ID。要查找 ID：在 Slack 中右键点击渠道 → **复制链接** — URL 末尾的 `C...` 值即为渠道 ID。
    - `requireMention`
    - 每个渠道的 `users` 白名单
    - `messages.groupChat.visibleReplies`：普通群组/渠道请求默认为 `"automatic"`。如果您选择了 `"message_tool"` 且日志显示助手文本但没有 `message(action=send)` 调用，则模型错过了可见的消息工具路径。在此模式下，最终文本保持私密；检查网关详细日志以查看被抑制的负载元数据，或者如果您希望每个普通助手最终回复都通过旧路径发布，请将其设置为 `"automatic"`。
    - `messages.groupChat.unmentionedInbound`：如果为 `"room_event"`，未提及的允许渠道闲聊将成为环境上下文并保持静默，除非代理调用 `message` 工具。请参阅 [环境房间事件](/zh/channels/ambient-room-events)。

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

    有用的命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="私信消息被忽略">
    检查以下内容：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - 配对批准 / 允许列表条目（`dmPolicy: "open"` 仍然需要 `channels.slack.allowFrom: ["*"]`）
    - 群组私信使用 MPIM 处理；启用 `channels.slack.dm.groupEnabled`，如果已配置，请在 `channels.slack.dm.groupChannels`Slack 中包含 MPIM
    - Slack 助手私信事件：提及 `drop message_changed`Slack 的详细日志
      通常表示 Slack 发送了编辑后的助手线程事件，但消息元数据中没有
      可恢复的人类发送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式无法连接"Slack>
    在 Slack 应用设置中验证 bot + app tokens 和 Socket Mode 是否已启用。
    App-Level Token 需要 `connections:write`OAuthSlack，并且 Bot User OAuth Token
    bot token 必须属于与 app token 相同的 Slack app/workspace。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`Slack，则说明 Slack 账户
    已配置，但当前运行时无法解析 SecretRef 支持的
    值。

    诸如 `slack socket mode failed to start; retry ...` 之类的日志是可恢复的
    启动失败。缺少 scopes、撤销的 token 和无效的 auth 会快速失败。
    `slack token mismatch ...`SlackSlack 日志意味着 bot token 和 app token
    似乎属于不同的 Slack 应用；请修复 Slack 应用凭据。

  </Accordion>

  <Accordion title="HTTP 模式未接收事件"Slack>
    验证：

    - 签名密钥
    - Webhook 路径
    - Slack 请求 URL（事件 + 交互 + 斜杠命令）
    - 每个 HTTP 账户唯一的 `webhookPath`Gateway(网关)Slack
    - 公共 URL 终止 TLS 并将请求转发到 Gateway(网关) 路径
    - Slack 应用 `request_url` 路径与 `channels.slack.webhookPath` 完全匹配（默认为 `/slack/events`）

    如果账户快照中出现 `signingSecretStatus: "configured_unavailable"`，说明 HTTP 账户已配置，但当前运行时无法解析由 SecretRef 支持的签名密钥。

    重复出现 `slack: webhook path ... already registered` 日志意味着两个 HTTP 账户使用了相同的 `webhookPath`；请为每个账户指定不同的路径。

  </Accordion>

  <Accordion title="原生/斜杠命令未触发">
    验证您是否打算：

    - 使用原生命令模式（`channels.slack.commands.native: true`Slack），并在 Slack 中注册了匹配的斜杠命令
    - 还是使用单一斜杠命令模式（`channels.slack.slashCommand.enabled: true`Slack）

    Slack 不会自动创建或移除斜杠命令。`commands.native: "auto"`Slack 不会启用 Slack 原生命令；请使用 `true`SlackSlackGateway(网关)Slack 并在 Slack 应用中创建匹配的命令。在 HTTP 模式下，每个 Slack 斜杠命令都必须包含 Gateway URL。在 Socket 模式下，命令负载通过 WebSocket 传递，Slack 会忽略 `slash_commands[].url`。

    同时检查 `commands.useAccessGroups`、私信授权、渠道允许列表以及每个渠道的 `users`Slack 允许列表。对于被阻止的斜杠命令发送者，Slack 会返回临时错误，包括：

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>

## 附件视觉参考

当 Slack 文件下载成功且大小限制允许时，Slack 可以将下载的媒体附加到智能体轮次中。图像文件可以通过媒体理解路径传递，或直接传递给具有视觉功能的回复模型；其他文件将作为可下载的文件上下文保留，而不作为图像输入处理。

### 支持的媒体类型

| 媒体类型                     | 来源            | 当前行为                                                          | 备注                                                      |
| ---------------------------- | --------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| JPEG / PNG / GIF / WebP 图像 | Slack 文件 URL  | 已下载并附加到轮次以进行具有视觉功能的处理                        | 每个文件的上限：`channels.slack.mediaMaxMb`（默认 20 MB） |
| PDF 文件                     | Slack 文件 URL  | 已下载并作为工具（例如 `download-file` 或 `pdf`）的文件上下文公开 | Slack 入站不会自动将 PDF 转换为图像视觉输入               |
| 其他文件                     | Slack 文件 URL  | 尽可能下载并作为文件上下文公开                                    | 二进制文件不作为图像输入处理                              |
| 线程回复                     | 线程启动文件    | 当回复没有直接媒体时，根消息文件可以作为上下文被加载              | 仅包含文件的启动项使用附件占位符                          |
| 多图像消息                   | 多个 Slack 文件 | 每个文件独立评估                                                  | Slack 处理上限为每条消息八个文件                          |

### 入站管道

当带有文件附件的 Slack 消息到达时：

1. OpenClaw 使用 bot 令牌从 Slack 的私有 URL 下载文件。
2. 成功时，文件会被写入媒体存储。
3. 下载的媒体路径和内容类型被添加到入站上下文中。
4. 具有图像功能的模型/工具路径可以使用该上下文中的图像附件。
5. 非图像文件仍作为文件元数据或媒体引用保留，可供能够处理它们的工具使用。

### 线程根附件继承

当消息在线程中到达（具有 `thread_ts` 父级）时：

- 如果回复本身没有直接媒体，且包含的根消息有文件，Slack 可以将根文件作为线程启动上下文加载。
- 直接回复附件优先于根消息附件。
- 仅包含文件且不包含文本的根消息会表示为附件占位符，以便回退消息仍能包含这些文件。

### 多附件处理

当单条 Slack 消息包含多个文件附件时：

- 每个附件都会通过媒体管道独立处理。
- 下载的媒体引用会被汇总到消息上下文中。
- 处理顺序遵循事件负载中 Slack 的文件顺序。
- 单个附件下载失败不会阻塞其他附件。

### 大小、下载和模型限制

- **大小上限**：默认每个文件 20 MB。可通过 `channels.slack.mediaMaxMb` 配置。
- **下载失败**：Slack 无法提供的文件、过期 URL、无法访问的文件、超大文件以及 Slack 身份验证/登录 HTML 响应将被跳过，而不会作为不支持的格式进行报告。
- **视觉模型**：当激活的回复模型支持视觉功能时，图像分析将使用该模型；否则使用在 `agents.defaults.imageModel` 配置的图像模型。

### 已知限制

| 场景                         | 当前行为                                       | 变通方法                                                            |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Slack 文件 URL 已过期        | 文件已跳过；未显示错误                         | 在 Slack 中重新上传文件                                             |
| 未配置视觉模型               | 图像附件作为媒体引用存储，但不作为图像进行分析 | 配置 `agents.defaults.imageModel` 或使用具备视觉功能的回复模型      |
| 非常大的图像（默认 > 20 MB） | 因大小上限而被跳过                             | 如果 Slack 允许，则增加 `channels.slack.mediaMaxMb`                 |
| 转发/共享的附件              | 文本和 Slack 托管的图像/文件媒体尽力而为       | 直接在 OpenClaw 主题中重新共享                                      |
| PDF 附件                     | 存储为文件/媒体上下文，不自动通过图像视觉路由  | 使用 `download-file` 获取文件元数据，或使用 `pdf` 工具进行 PDF 分析 |

### 相关文档

- [媒体理解管道](/zh/nodes/media-understanding)
- [PDF 工具](/zh/tools/pdf)
- Epic: [#51349](https://github.com/openclaw/openclaw/issues/51349) — Slack 附件视觉功能启用
- 回归测试：[#51353](https://github.com/openclaw/openclaw/issues/51353)
- 实时验证：[#51354](https://github.com/openclaw/openclaw/issues/51354)

## 相关

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    将 Slack 用户与网关配对。
  </Card>
  <Card title="Groups" icon="users" href="/zh/channels/groups">
    频道和群组私信行为。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh/channels/channel-routing">
    将入站消息路由到代理。
  </Card>
  <Card title="Security" icon="shield" href="/zh/gateway/security">
    威胁模型和加固。
  </Card>
  <Card title="Configuration" icon="sliders" href="/zh/gateway/configuration">
    配置布局和优先级。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/zh/tools/slash-commands">
    命令目录和行为。
  </Card>
</CardGroup>
