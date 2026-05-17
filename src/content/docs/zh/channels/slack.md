---
summary: "Slack 设置和运行时行为 (Socket Mode + HTTP 请求 URL)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

通过 Slack 应用集成支持私信和渠道的生产环境使用。默认模式为 Socket 模式；同时也支持 HTTP 请求 URL。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
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

| 关注点                            | Socket Mode（默认）                                                           | HTTP Request URLs                                                              |
| --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 公共 Gateway(网关) URL            | 不需要                                                                        | 需要（DNS、TLS、反向代理或隧道）                                               |
| 出站网络                          | 到 `wss-primary.slack.com` 的出站 WSS 必须可达                                | 无出站 WS；仅入站 HTTPS                                                        |
| 所需的令牌                        | Bot 令牌 (`xoxb-...`) + 应用级令牌 (`xapp-...`)，且需具有 `connections:write` | Bot 令牌 (`xoxb-...`) + 签名密钥                                               |
| 开发笔记本电脑 / 防火墙后         | 按原样工作                                                                    | 需要公共隧道（ngrok、Cloudflare Tunnel、Tailscale Funnel）或暂存 Gateway(网关) |
| 横向扩容                          | 每个主机上的每个应用一个 Socket Mode 会话；多个 Slack 需要单独的 Slack 应用   | 无状态 POST 处理程序；多个 Gateway(网关) 副本可以在负载均衡器后共享一个应用    |
| 在一个 Gateway(网关) 上支持多账户 | 支持；每个账户打开自己的 WS                                                   | 支持；每个账户需要唯一的 `webhookPath` (默认为 `/slack/events`)，以免注册冲突  |
| 斜杠命令传输                      | 通过 WS 连接传递；`slash_commands[].url` 被忽略                               | Slack 向 `slash_commands[].url` 发送 POST 请求；该字段是命令分发所必需的       |
| 请求签名                          | 未使用（身份验证为 App-Level Token）                                          | Slack 对每个请求签名；OpenClaw 使用 `signingSecret` 进行验证                   |
| 连接断开时的恢复                  | Slack SDK 会自动重新连接；网关的 pong-timeout 传输调优设置适用                | 没有持久的连接会断开；重试由 Slack 对每个请求进行                              |

<Note>
  对于单 Gateway(网关) 主机、开发笔记本电脑以及可以出站访问 `*.slack.com` 但无法接受入站 HTTPS 的本地网络，**请选择 Socket Mode**。

**请选择 HTTP 请求 URL** 的情况：当负载均衡器后运行多个 Gateway(网关) 副本时；当出站 WSS 被阻止但允许入站 HTTPS 时；或者当您已经在反向代理处终止 Slack Webhook 时。

</Note>

## 安装

在配置渠道之前先安装 Slack：

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` 会注册并启用该插件。但在您配置下方的 Slack 应用和渠道设置之前，该插件仍然不起作用。有关插件的一般行为和安装规则，请参阅 [插件](/zh/tools/plugin)。

## 快速设置

<Tabs>
  <Tab title="Socket 模式（默认）">
    <Steps>
      <Step title="创建新的 Slack 应用">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择您的工作区 → 粘贴以下清单之一 → **Next** → **Create**。

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
          **推荐（Recommended）** 匹配 Slack 插件的完整功能集：应用主页、斜杠命令、文件、回应、固定消息、群组私信以及表情符号/用户组读取。当工作区策略限制范围时，请选择 **最小（Minimal）** —— 它涵盖私信、渠道/群组历史记录、提及和斜杠命令，但会放弃文件、回应、固定消息、群组私信 (`mpim:*`)、`emoji:read` 和 `usergroups:read`。有关每个范围的原理和附加选项（如额外的斜杠命令），请参阅 [清单和范围检查清单](#manifest-and-scope-checklist)。
        </Note>

        Slack 创建应用后：

        - **Basic Information → App-Level Tokens → Generate Token and Scopes**：添加 `connections:write`，保存，然后复制 `xapp-...` 值。
        - **Install App → Install to Workspace**：复制 `xoxb-...` Bot User OAuth Token。

      </Step>

      <Step title="配置 OpenClaw">

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

        环境变量回退（仅限默认账户）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP 请求 URL">
    <Steps>
      <Step title="Slack创建新的 Slack 应用">
        打开 [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → 选择你的工作区 → 粘贴以下某个清单 → 将 `https://gateway-host.example.com/slack/events`Gateway(网关) 替换为你的公共 Gateway(网关) URL → **Next** → **Create**。

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

````json Minimal
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
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im"
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```Slack

        </CodeGroup>

        <Note>
          **Recommended（推荐）** 匹配 Slack 插件的完整功能集；**Minimal（最小）** 移除了文件、表情反应、固定项、群组私信 (`mpim:*`)、`emoji:read` 和 `usergroups:read`，以适应受限的工作区。有关每个范围的详细理由，请参阅 [Manifest and scope checklist](#manifest-and-scope-checklist)。
        </Note>

        <Info>
          三个 URL 字段（`slash_commands[].url`、`event_subscriptions.request_url` 和 `interactivity.request_url` / `message_menu_options_url`OpenClawSlackOpenClaw）都指向同一个 OpenClaw 端点。Slack 的清单架构要求它们分别命名，但 OpenClaw 根据负载类型进行路由，因此单个 `webhookPath`（默认 `/slack/events`）就足够了。没有 `slash_commands[].url`Slack 的斜杠命令将在 HTTP 模式下静默失效。
        </Info>

        在 Slack 创建应用后：

        - **Basic Information → App Credentials**：复制 **Signing Secret** 用于请求验证。
        - **Install App → Install to Workspace**：复制 `xoxb-...`OAuth Bot User OAuth Token。

      </Step>

      <Step title="OpenClaw配置 OpenClaw">

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
````

        <Note>
        为多账户 HTTP 使用唯一的 webhook 路径

        为每个帐户分配不同的 `webhookPath`（默认 `/slack/events`），以免注册冲突。
        </Note>

      </Step>

      <Step title="启动 gateway">

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

仅针对记录 Slack websocket pong/服务器 ping 超时或在已知存在事件循环饥饿（event-loop starvation）的主机上运行的 Socket Mode 工作区使用此设置。`clientPingTimeout` 是 SDK 发送客户端 ping 后的 pong 等待时间；`serverPingTimeout` 是等待 Slack 服务器 ping 的时间。应用消息和事件保留为应用程序状态，而非传输活跃信号。

## 清单和范围检查清单

基础 Slack 应用清单对于 Socket Mode 和 HTTP Request URLs 是相同的。只有 `settings` 块（以及斜杠命令 `url`）有所不同。

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

默认清单启用了 Slack App Home 的 **Home** 标签页并订阅了 `app_home_opened`。当工作区成员打开 Home 标签页时，OpenClaw 会发布一个安全的默认 Home 视图，其中包含 `views.publish`；不包含对话负载或私有配置。**Messages** 标签页保持为 Slack 私信启用状态。

<AccordionGroup>
  <Accordion title="可选的原生斜杠命令">

    可以使用多个[原生斜杠命令](#commands-and-slash-behavior)来代替带有细微差别的单个配置命令：

    - 使用 `/agentstatus` 而不是 `/status`，因为 `/status` 命令已被保留。
    - 一次可提供的斜杠命令不能超过 25 个。

    用[可用命令](/zh/tools/slash-commands#command-list)的子集替换您现有的 `features.slash_commands` 部分：

    <Tabs>
      <Tab title="Socket Mode (默认)">

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
        使用与上述 Socket Mode 相同的 `slash_commands` 列表，并为每个条目添加 `"url": "https://gateway-host.example.com/slack/events"`。例如：

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
    如果您希望传出消息使用活动代理身份（自定义用户名和图标）而不是默认的 Slack 应用身份，请添加 `chat:write.customize` 机器人范围。

    如果您使用表情符号图标，Slack 期望使用 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="可选的用户令牌范围（读取操作）">
    如果配置了 `channels.slack.userToken`，典型的读取范围有：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`Slack（如果您依赖于 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## 令牌模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受纯文本
  字符串或 SecretRef 对象。
- 配置令牌会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken` (`xoxp-...`) 仅限配置（无环境变量回退），并且默认为只读行为（`userTokenReadOnly: true`）。

状态快照行为：

- Slack 账户检查会跟踪每个凭证的 Slack`*Source` 和 `*Status`
  字段（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 状态为 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示账户是通过 SecretRef
  或其他非内联机密源配置的，但当前的命令/运行时路径
  无法解析实际值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket 模式下，必需的组合是 `botTokenStatus` + `appTokenStatus`。

<Tip>对于操作/目录读取，配置后可以首选用户令牌。对于写入，bot 令牌仍然是首选；仅当 `userTokenReadOnly: false` 且 bot 令牌不可用时，才允许用户令牌写入。</Tip>

## 操作和门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组       | 默认   |
| -------- | ------ |
| 消息     | 已启用 |
| 表情回应 | 已启用 |
| 固定     | 已启用 |
| 成员信息 | 已启用 |
| 表情列表 | 已启用 |

当前 Slack 消息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。`download-file` 接受入站文件占位符中显示的 Slack 文件 ID，并为图像返回图像预览，或为其他文件类型返回本地文件元数据。

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

    为了兼容性，仍会读取旧版的 `channels.slack.dm.policy` 和 `channels.slack.dm.allowFrom`。当可以在不改变访问权限的情况下进行迁移时，`openclaw doctor --fix` 会将它们迁移到 `dmPolicy` 和 `allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制渠道处理：

    - `open`
    - `allowlist`
    - `disabled`

    渠道允许列表位于 `channels.slack.channels` 之下，并且**必须使用稳定的 Slack 渠道 ID**（例如 `C12345678`）作为配置键。

    运行时说明：如果完全缺少 `channels.slack`（仅限环境变量的设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 当令牌访问允许时，渠道允许列表条目和私信允许列表条目在启动时解析
    - 未解析的渠道名称条目将按配置保留，但默认情况下在路由中被忽略
    - 入站授权和渠道路由默认优先使用 ID；直接的用户名/别名匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    基于名称的键（`#channel-name` 或 `channel-name`）在 `groupPolicy: "allowlist"` 下**不**匹配。渠道查找默认优先使用 ID，因此基于名称的键将永远不会成功路由，并且该渠道中的所有消息都将被静默阻止。这与 `groupPolicy: "open"` 不同，后者路由不需要渠道键，基于名称的键似乎可以工作。

    始终使用 Slack 渠道 ID 作为键。查找方法：在 Slack 中右键单击该渠道 → **Copy link** — ID（`C...`）出现在 URL 的末尾。

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
    - Slack 用户组提及 (`<!subteam^S...>`)，当机器人用户是该用户组的成员时；需要 `usergroups:read`
    - 提及正则表达式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为（当 `thread.requireExplicitMention` 为 `true` 时禁用）

    每个渠道的控件 (`channels.slack.channels.<id>`；名称仅通过启动解析或 `dangerouslyAllowNameMatching`) ：

    - `requireMention`
    - `users` (allowlist)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 键格式：`channel:`, `id:`, `e164:`, `username:`, `name:`，或 `"*"` 通配符
      （旧的无前缀键仍然仅映射到 `id:`）

    `allowBots` 对渠道和私有渠道是保守的：只有当发送机器人明确列在该房间的 `users` 允许列表中，或者当 `channels.slack.allowFrom` 中至少有一个显式的 Slack 所有者 ID 当前是房间成员时，才会接受机器人编写的房间消息。通配符和显示名称所有者条目不满足所有者存在条件。所有者存在使用 Slack `conversations.members`；确保应用程序具有该房间类型的匹配读取范围（公共渠道为 `channels:read`，私有渠道为 `groups:read`）。如果成员查找失败，OpenClaw 将丢弃机器人编写的房间消息。

  </Tab>
</Tabs>

## 线程、会话和回复标签

- 私信路由为 `direct`；频道路由为 `channel`；MPIM 路由为 `group`。
- Slack 路由绑定接受原始对等 ID 以及 Slack 目标形式，例如 `channel:C12345678`、`user:U12345678` 和 `<@U12345678>`。
- 使用默认 `session.dmScope=main` 时，Slack 私信会折叠到代理主会话中。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可以在适用时创建线程会话后缀（`:thread:<threadTs>`）。
- 在 OpenClaw 无需明确提及即可处理顶层消息的频道中，非 `off` `replyToMode` 会将每个已处理的根消息路由到 `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>`，以便可见的 Slack 线程从第一轮开始映射到一个 OpenClaw 会话。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制当新线程会话开始时获取多少现有线程消息（默认 `20`；设置为 `0` 以禁用）。
- `channels.slack.thread.requireExplicitMention`（默认 `false`）：当 `true` 时，抑制隐式线程提及，以便机器人仅响应线程内的明确 `@bot` 提及，即使机器人已参与该线程。如果没有此设置，机器人参与线程中的回复将绕过 `requireMention` 门控。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

若要从 `message` 工具获取明确的 Slack 线程回复，请使用 `action: "send"` 和 `threadId` 或 `replyTo` 设置 `replyBroadcast: true`，以请求 Slack 同时将线程回复广播到父渠道。这对应于 Slack 的 `chat.postMessage` `reply_broadcast` 标志，且仅支持文本或 Block Kit 发送，不支持媒体上传。

当 `message` 工具调用在 Slack 线程内运行并目标指向同一渠道时，OpenClaw 通常根据 `replyToMode` 继承当前的 Slack 线程。可以在 `action: "send"` 或 `action: "upload-file"` 上设置 `topLevel: true` 以强制改为发送新的父渠道消息。`threadId: null` 被视为相同的顶级退出选项。

<Note>`replyToMode="off"` 会禁用 Slack 中的**所有**回复线程，包括明确的 `[[reply_to_*]]` 标签。这与 Telegram 不同，在 Slack 中，明确标签在 `"off"` 模式下仍受支持。Telegram 线程会向渠道隐藏消息，而 Telegram 回复则保持内联可见。</Note>

## Ack 反应

当 OpenClaw 处理入站消息时，`ackReaction` 会发送一个确认表情符号。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

注意事项：

- Slack 期望使用短代码（例如 `"eyes"`）。
- 使用 `""` 可为 Slack 账户或全局禁用该反应。

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial` (默认)：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：生成时显示进度状态文本，然后发送最终文本。
- `streaming.preview.toolProgress`：当草稿预览处于活动状态时，将工具/进度更新路由到同一条编辑过的预览消息中（默认：`true`）。设置 `false` 以保持独立的工具/进度消息。
- `streaming.preview.commandText` / `streaming.progress.commandText`：设置为 `status` 以在隐藏原始命令/执行文本的同时保持紧凑的工具进度行（默认：`raw`）。

隐藏原始命令/执行文本，同时保持紧凑的进度行：

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

当 `channels.slack.streaming.mode` 为 `partial` 时（默认：`true`），`channels.slack.streaming.nativeTransport`Slack 控制 Slack 的原生文本流传输。

- 必须存在回复线程才能显示原生文本流传输和 Slack 助手线程状态。线程选择仍然遵循 Slack`replyToMode`。
- 当原生流传输不可用或不存在回复线程时，频道、群聊和顶级私信根节点仍然可以使用正常的草稿预览。
- 顶级 Slack 私信默认保持在主题之外，因此它们不显示 Slack 的线程式原生流/状态预览；相反，OpenClaw 在私信中发布并编辑草稿预览。
- 媒体和非文本负载回退到正常传递。
- 媒体/错误最终结果会取消待处理的预览编辑；符合条件的文本/块最终结果仅当它们可以就地编辑预览时才会刷新。
- 如果在回复中途流传输失败，OpenClaw 将回退到对剩余负载的正常传递。

使用草稿预览代替 Slack 原生文本流传输：

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
- 旧版 `channels.slack.nativeStreaming` 是 `channels.slack.streaming.nativeTransport` 的运行时别名。
- 运行 `openclaw doctor --fix` 以将持久化的 Slack 流配置重写为规范键。

## 正在输入反应回退

当 Slack 正在处理回复时，`typingReaction` 会向传入的 OpenClaw 消息添加一个临时反应，然后在运行结束时将其移除。这在非线程回复中最有用，后者使用默认的“正在输入...”状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意：

- Slack 需要短代码（例如 `"hourglass_flowing_sand"`）。
- 该反应是尽力而为的，并在回复或失败路径完成后自动尝试清理。

## 媒体、分块和传递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件会从 Slack 托管的私有 URL（令牌认证请求流）下载，并在获取成功且大小限制允许时写入媒体存储。文件占位符包含 Slack `fileId`，因此代理可以使用 `download-file` 获取原始文件。

    下载使用受限的空闲和总超时时间。如果 Slack 文件检索停滞或失败，OpenClaw 会继续处理该消息并回退到文件占位符。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="Outbound text and files">
    - 文本块使用 `channels.slack.textChunkLimit`（默认为 4000）
    - `channels.slack.chunkMode="newline"`Slack 启用以段落优先的分割
    - 文件发送使用 Slack 上传 API，并且可以包含线程回复（`thread_ts`）
    - 出站媒体上限在配置时遵循 `channels.slack.mediaMaxMb`；否则，渠道发送使用媒体流水线的 MIME 类型默认值

  </Accordion>

  <Accordion title="Delivery targets">
    首选显式目标：

    - `user:<id>` 用于私信
    - `channel:<id>`SlackSlack 用于渠道

    仅文本/区块的 Slack 私信可以直接发布到用户 ID；文件上传和线程发送首先通过 Slack conversation API 打开私信，因为这些路径需要具体的对话 ID。

  </Accordion>
</AccordionGroup>

## 命令和斜杠行为

斜杠命令在 Slack 中显示为单个配置的命令或多个本机命令。配置 Slack`channels.slack.slashCommand` 以更改命令默认值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

本机命令需要您的 Slack 应用中的[其他清单设置](#additional-manifest-settingsSlack)，并且在全局配置中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 启用。

- 对于 Slack，本机命令自动模式为**关闭**，因此 Slack`commands.native: "auto"`Slack 不会启用 Slack 本机命令。

```txt
/help
```

本机参数菜单使用自适应渲染策略，在调度所选选项值之前显示确认模态框：

- 最多 5 个选项：按钮块
- 6-100 个选项：静态选择菜单
- 超过 100 个选项：外部选择，并在有交互选项处理程序时进行异步选项筛选
- 超过 Slack 限制：编码的选项值将回退到按钮

```txt
/think
```

Slash 会话使用像 `agent:<agentId>:slack:slash:<userId>` 这样的隔离密钥，并仍使用 `CommandTargetSessionKey` 将命令执行路由到目标会话会话。

## 交互式回复

Slack 可以呈现由代理创作的交互式回复控件，但此功能默认处于禁用状态。

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

或仅为一个 Slack 账户启用：

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

启用后，代理可以发出仅限 Slack 的回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令会编译为 Slack Block Kit，并将点击或选择通过现有的 Slack 交互事件路径回传。

注意：

- 这是 Slack 特有的 UI。其他渠道不会将 Slack Block Kit 指令转换为其各自的按钮系统。
- 交互式回调值是由 OpenClaw 生成的 opaque 令牌，而不是原始的代理创作值。
- 如果生成的交互式块将超过 Slack Block Kit 限制，OpenClaw 将回退到原始文本回复，而不是发送无效的块负载。

## 在 Slack 中进行执行批准

Slack 可以充当具有交互式按钮和交互的原生批准客户端，而不必回退到 Web UI 或终端。

- 执行批准使用 `channels.slack.execApprovals.*` 进行原生私信/渠道路由。
- 当请求已经到达 Slack 且批准 ID 类型为 `plugin:` 时，插件批准仍可通过同一个 Slack 原生按钮界面完成。
- 批准者授权仍然有效：只有被识别为批准者的用户才能通过 Slack 批准或拒绝请求。

这与其他渠道使用相同的共享审批按钮界面。当在您的 Slack 应用设置中启用 `interactivity`SlackOpenClaw 时，审批提示将直接在对话中以 Block Kit 按钮的形式呈现。
当这些按钮存在时，它们是主要的审批用户体验；仅当工具结果指出聊天审批不可用或手动审批是唯一途径时，OpenClaw
才应包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；可能的情况下回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认值：`dm`）
- `agentFilter`，`sessionFilter`

当 Slack`enabled` 未设置或为 `"auto"` 且至少有一位审批人解决时，Slack 会自动启用原生 exec 审批。设置 `enabled: false`Slack 可明确禁用 Slack 作为原生审批客户端。
设置 `enabled: true` 可在审批人解决时强制启用原生审批。

没有明确 Slack exec 审批配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有在您想要覆盖审批人、添加过滤器或选择启用 origin-chat 传递时，才需要明确的 Slack 原生配置：

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

共享 `approvals.exec` 转发是独立的。仅当 exec 审批提示也必须路由到其他聊天或明确的带外目标时才使用它。共享 `approvals.plugin`SlackSlack 转发也是独立的；当这些请求已经到达 Slack 时，Slack 原生按钮仍然可以解决插件审批。

同聊 `/approve`Slack 在已经支持命令的 Slack 频道和私信中也有效。有关完整的审批转发模型，请参阅 [Exec approvals](/zh/tools/exec-approvals)。

## 事件和操作行为

- 消息编辑/删除被映射为系统事件。
- Thread broadcasts ("Also send to 渠道" thread replies) are processed as normal user messages.
- Reaction add/remove events are mapped into system events.
- Member join/leave, 渠道 created/renamed, and pin add/remove events are mapped into system events.
- `channel_id_changed` can migrate 渠道 config keys when `configWrites` is enabled.
- Channel topic/purpose metadata is treated as untrusted context and can be injected into routing context.
- Thread starter and initial thread-history context seeding are filtered by configured sender allowlists when applicable.
- Block actions and modal interactions emit structured `Slack interaction: ...` system events with rich payload fields:
  - block actions: selected values, labels, picker values, and `workflow_*` metadata
  - modal `view_submission` and `view_closed` events with routed 渠道 metadata and form inputs

## Configuration reference

Primary reference: [Configuration reference - Slack](/zh/gateway/config-channels#slack).

<Accordion title="高信号 Slack 字段">

- 模式/认证： `mode`， `botToken`， `appToken`， `signingSecret`， `webhookPath`， `accounts.*`
- 私信访问： `dm.enabled`， `dmPolicy`， `allowFrom` (旧版： `dm.policy`， `dm.allowFrom`)， `dm.groupEnabled`， `dm.groupChannels`
- 兼容性切换： `dangerouslyAllowNameMatching` (break-glass；除非需要否则保持关闭)
- 渠道访问： `groupPolicy`， `channels.*`， `channels.*.users`， `channels.*.requireMention`
- 线程/历史： `replyToMode`， `replyToModeByChatType`， `thread.*`， `historyLimit`， `dmHistoryLimit`， `dms.*.historyLimit`
- 投递： `textChunkLimit`， `chunkMode`， `mediaMaxMb`， `streaming`， `streaming.nativeTransport`， `streaming.preview.toolProgress`
- 链接展开： `unfurlLinks`， `unfurlMedia` 用于 `chat.postMessage` 链接/媒体预览控制
- 操作/功能： `configWrites`， `commands.native`， `slashCommand.*`， `actions.*`， `userToken`， `userTokenReadOnly`

</Accordion>

## 故障排除

<AccordionGroup>
  <Accordion title="渠道中没有回复">
    按顺序检查：

    - `groupPolicy`
    - 渠道允许列表 (`channels.slack.channels`) — **键必须是渠道 ID** (`C12345678`)，而不是名称 (`#channel-name`)。在 `groupPolicy: "allowlist"`Slack 中，基于名称的键会静默失败，因为渠道路由默认优先使用 ID。要查找 ID：在 Slack 中右键单击渠道 → **复制链接** — URL 末尾的 `C...` 值即为渠道 ID。
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
    - `channels.slack.dmPolicy` (或旧版 `channels.slack.dm.policy`Slack)
    - 配对批准 / 允许列表条目
    - Slack 助手私信事件：提及 `drop message_changed`Slack 的详细日志
      通常意味着 Slack 发送了一个经过编辑的助手线程事件，但在消息元数据中
      没有可恢复的人类发送者

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式无法连接"Slack>
    在 Slack 应用设置中验证 bot + app 令牌以及 Socket 模式是否已启用。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`Slack，则说明 Slack 账户
    已配置，但当前运行时无法解析 SecretRef 支持的
    值。

  </Accordion>

  <Accordion title="HTTP 模式未收到事件"Slack>
    验证：

    - 签名密钥
    - webhook 路径
    - Slack 请求 URL (事件 + 交互 + 斜杠命令)
    - 每个 HTTP 账户唯一的 `webhookPath`

    如果账户快照中出现了 `signingSecretStatus: "configured_unavailable"`，则说明 HTTP 账户
    已配置，但当前运行时无法
    解析 SecretRef 支持的签名密钥。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    验证您是否想要：

    - 本地命令模式 (`channels.slack.commands.native: true`)，并在 Slack 中注册了匹配的斜杠命令
    - 或单一斜杠命令模式 (`channels.slack.slashCommand.enabled: true`)

    另外请检查 `commands.useAccessGroups` 和 渠道/用户 允许列表。

  </Accordion>
</AccordionGroup>

## 附件视觉参考

当 Slack 文件下载成功且大小限制允许时，Slack 可以将下载的媒体附加到 代理 轮次中。图像文件可以传递到媒体理解路径，或者直接传递给支持视觉的回复模型；其他文件将作为可下载的文件上下文保留，而不是作为图像输入处理。

### 支持的媒体类型

| 媒体类型                     | 来源            | 当前行为                                                           | 备注                                                  |
| ---------------------------- | --------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| JPEG / PNG / GIF / WebP 图像 | Slack 文件 URL  | 已下载并附加到轮次，以进行视觉处理                                 | 单文件上限：`channels.slack.mediaMaxMb`（默认 20 MB） |
| PDF 文件                     | Slack 文件 URL  | 已下载并作为文件上下文公开，供 `download-file` 或 `pdf` 等工具使用 | Slack 入站不会自动将 PDF 转换为图像视觉输入           |
| 其他文件                     | Slack 文件 URL  | 尽可能下载并作为文件上下文公开                                     | 二进制文件不被视为图像输入                            |
| 线程回复                     | 线程起始文件    | 当回复没有直接媒体时，根消息文件可以作为上下文被加载               | 仅文件起始者使用附件占位符                            |
| 多图像消息                   | 多个 Slack 文件 | 每个文件独立评估                                                   | Slack 处理每条消息最多限制为八个文件                  |

### 入站管道

当带有文件附件的 Slack 消息到达时：

1. OpenClaw 使用 bot 令牌 (`xoxb-...`) 从 Slack 的私有 URL 下载文件。
2. 成功时，文件会被写入媒体存储。
3. 下载的媒体路径和内容类型会被添加到入站上下文中。
4. 支持图像的模型/工具路径可以使用该上下文中的图像附件。
5. 非图像文件仍作为文件元数据或媒体引用供能够处理它们的工具使用。

### 线程根附件继承

当消息在线程中到达（具有 `thread_ts` 父级）时：

- 如果回复本身没有直接媒体且包含的根消息有文件，Slack 可以将根文件作为线程启动上下文进行水合。
- 直接回复附件优先于根消息附件。
- 仅包含文件而不包含文本的根消息会以附件占位符表示，以便回退仍能包含其文件。

### 多附件处理

当单条 Slack 消息包含多个文件附件时：

- 每个附件通过媒体管道独立处理。
- 下载的媒体引用被聚合并到消息上下文中。
- 处理顺序遵循 Slack 在事件负载中的文件顺序。
- 一个附件下载失败不会阻止其他附件。

### 大小、下载和模型限制

- **大小上限**：默认每个文件 20 MB。可通过 `channels.slack.mediaMaxMb` 配置。
- **下载失败**：Slack 无法提供的文件、过期的 URL、无法访问的文件、超大文件以及 Slack auth/login HTML 响应将被跳过，而不会报告为不受支持的格式。
- **视觉模型**：图像分析使用支持视觉的活跃回复模型，或使用在 `agents.defaults.imageModel` 配置的图像模型。

### 已知限制

| 场景                         | 当前行为                                          | 变通方法                                                            |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| 过期的 Slack 文件 URL        | 文件已跳过；未显示错误                            | 在 Slack 中重新上传文件                                             |
| 未配置视觉模型               | 图像附件被存储为媒体引用，但未被分析为图像        | 配置 `agents.defaults.imageModel` 或使用支持视觉的回复模型          |
| 非常大的图像（默认 > 20 MB） | 因大小上限被跳过                                  | 如果 Slack 允许，增加 `channels.slack.mediaMaxMb`                   |
| 转发/共享的附件              | 文本和 Slack 托管的图像/文件媒体尽力而为          | 直接在 OpenClaw 主题中重新分享                                      |
| PDF 附件                     | 作为文件/媒体上下文存储，不会自动通过图像视觉路由 | 使用 `download-file` 获取文件元数据，或使用 `pdf` 工具进行 PDF 分析 |

### 相关文档

- [媒体理解管道](/zh/nodes/media-understanding)
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
