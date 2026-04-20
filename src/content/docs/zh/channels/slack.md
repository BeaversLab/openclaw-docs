---
summary: "Slack 设置和运行时行为（Socket 模式 + HTTP 请求 URL）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

状态：通过 Slack 应用集成支持私信和渠道的生产环境就绪。默认模式为 Socket 模式；也支持 HTTP 请求 URL。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    Slack 私信默认为配对模式。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/en/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create a new Slack app">
        在 Slack 应用设置中点击 **[Create New App](https://api.slack.com/apps/new)** 按钮：

        - 选择 **from a manifest** 并为你的应用选择一个工作区
        - 从下方粘贴 [示例 manifest](#manifest-and-scope-checklist) 并继续创建
        - 生成一个具有 `connections:write` 的 **App-Level Token** (`xapp-...`)
        - 安装应用并复制显示的 **Bot Token** (`xoxb-...`)
      </Step>

      <Step title="Configure OpenClaw">

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

        环境变量回退（仅限默认账户）：

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
        在 Slack 应用设置中，点击 **[Create New App](https://api.slack.com/apps/new)** 按钮：

        - 选择 **from a manifest**（从清单）并为您的应用选择一个工作区
        - 粘贴 [示例清单](#manifest-and-scope-checklist) 并在创建前更新 URL
        - 保存 **Signing Secret**（签名密钥）以用于请求验证
        - 安装应用并复制显示的 **Bot Token**（机器人令牌）(`xoxb-...`)

      </Step>

      <Step title="配置 OpenClaw">

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
        为多账户 HTTP 使用唯一的 Webhook 路径

        为每个账户分配一个不同的 `webhookPath`（默认为 `/slack/events`），以避免注册冲突。
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

## 清单和权限范围检查表

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

  <Tab title="HTTP 请求 URL">

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

### 其他清单设置

展示扩展上述默认设置的不同功能。

<AccordionGroup>
  <Accordion title="可选的原生斜杠命令">

    可以使用多个 [原生斜杠命令](#commands-and-slash-behavior) 来代替单个具有细微差别的配置命令：

    - 使用 `/agentstatus` 而不是 `/status`，因为 `/status` 命令已被保留。
    - 最多只能同时提供 25 个斜杠命令。

    使用[可用命令](/en/tools/slash-commands#command-list)的子集替换您现有的 `features.slash_commands` 部分：

    <Tabs>
      <Tab title="Socket 模式（默认）">

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
      <Tab title="HTTP 请求 URL">

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
  <Accordion title="Optional authorship scopes (write operations)">
    如果您希望传出消息使用活动代理身份（自定义用户名和图标）而不是默认 Slack 应用身份，请添加 `chat:write.customize` bot scope。

    如果您使用 emoji 图标，Slack 期望 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="Optional user-token scopes (read operations)">
    如果您配置 `channels.slack.userToken`，典型的读取范围为：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` （如果您依赖于 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## 令牌模型

- `botToken` + `appToken` 是 Socket 模式所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受纯文本
  字符串或 SecretRef 对象。
- 配置令牌覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken` (`xoxp-...`) 仅限配置（无环境变量回退），并且默认为只读行为 (`userTokenReadOnly: true`)。

状态快照行为：

- Slack 账户检查会跟踪每个凭据的 `*Source` 和 `*Status`
  字段 (`botToken`, `appToken`, `signingSecret`, `userToken`)。
- 状态为 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示账户是通过 SecretRef 或其他非内联密钥源配置的，但当前的命令/运行时路径无法解析实际值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket 模式下，必需的组合是 `botTokenStatus` + `appTokenStatus`。

<Tip>对于操作/目录读取，配置后可以使用用户令牌 (user token)。对于写入，首选机器人令牌 (bot token)；仅当 `userTokenReadOnly: false` 且机器人令牌不可用时，才允许使用用户令牌写入。</Tip>

## 操作和门控 (Actions and gates)

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组         | 默认    |
| ---------- | ------- |
| messages   | 已启用  |
| reactions  | 已启用  |
| pins       | 已启用  |
| memberInfo | enabled |
| emojiList  | enabled |

当前 Slack 消息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。

## 访问控制和路由

<Tabs>
  <Tab title="私信 policy">
    `channels.slack.dmPolicy` 控制私信访问（旧版：`channels.slack.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；旧版：`channels.slack.dm.allowFrom`）
    - `disabled`

    私信标志：

    - `dm.enabled`（默认为 true）
    - `channels.slack.allowFrom`（推荐）
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组私信默认为 false）
    - `dm.groupChannels`（可选的 MPIM 允许列表）

    多账户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在其自身的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 命名账户不继承 `channels.slack.accounts.default.allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制渠道处理：

    - `open`
    - `allowlist`
    - `disabled`

    渠道允许列表位于 `channels.slack.channels` 之下，并应使用稳定的渠道 ID。

    运行时说明：如果 `channels.slack` 完全缺失（仅环境设置），运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 当令牌访问允许时，渠道允许列表条目和私信允许列表条目在启动时解析
    - 未解析的渠道名称条目将按配置保留，但默认情况下在路由中被忽略
    - 入站授权和渠道路由默认优先使用 ID；直接的用户名/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及和渠道用户">
    渠道消息默认受提及限制。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - 提及正则模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为 (当 `thread.requireExplicitMention` 为 `true` 时禁用)

    每个渠道的控制 (`channels.slack.channels.<id>`；仅通过启动解析或 `dangerouslyAllowNameMatching` 获取名称)：

    - `requireMention`
    - `users` (允许列表)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`，`toolsBySender`
    - `toolsBySender` 键格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 通配符
      (旧式无前缀键仍仅映射到 `id:`)

  </Tab>
</Tabs>

## 线程、会话和回复标签

- 私信路由为 `direct`；渠道路由为 `channel`；MPIM 路由为 `group`。
- 使用默认 `session.dmScope=main` 时，Slack 私信会合并到 Agent 主会话。
- 渠道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可以在适用时创建线程会话后缀 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 默认值为 `thread`；`thread.inheritParent` 默认值为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制启动新线程会话时获取多少条现有线程消息（默认 `20`；设置为 `0` 以禁用）。
- `channels.slack.thread.requireExplicitMention` (默认 `false`)：当 `true` 时，抑制隐式的线程提及，以便机器人仅响应线程内的显式 `@bot` 提及，即使机器人已经参与了该线程。如果没有此设置，在机器人参与的线程中的回复将绕过 `requireMention` 门控。

回复线程控制：

- `channels.slack.replyToMode`: `off|first|all|batched` (默认 `off`)
- `channels.slack.replyToModeByChatType`: 每个 `direct|group|channel`
- 直接聊天的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 中的**所有**回复线程，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，在 Slack 中，显式标签在 `"off"` 模式下仍然有效。这种差异反映了平台的线程模型：Telegram 线程会向渠道隐藏消息，而 Telegram 回复在主聊天流中仍然可见。

## 确认反应

当 OpenClaw 正在处理传入消息时，`ackReaction` 会发送一个确认表情符号。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退 (`agents.list[].identity.emoji`，否则为 "👀")

备注：

- Slack 期望使用短代码（例如 `"eyes"`）。
- 使用 `""` 为 Slack 账户或全局禁用该反应。

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流。
- `partial` (默认)：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：生成时显示进度状态文本，然后发送最终文本。

`channels.slack.streaming.nativeTransport` 控制当 `channels.slack.streaming.mode` 为 `partial` 时的 Slack 原生文本流式传输（默认：`true`）。

- 必须存在一个回复线程，原生文本流式传输和 Slack 助手线程状态才会显示。线程选择仍然遵循 `replyToMode`。
- 当原生流式传输不可用时，频道和群聊的根消息仍然可以使用正常的草稿预览。
- 顶层 Slack 私信默认保持在线程外，因此它们不显示线程样式的预览；如果您希望在那里显示可见进度，请使用线程回复或 `typingReaction`。
- 媒体和非文本有效负载会回退到正常投递。
- 如果在回复中途流式传输失败，OpenClaw 将对其余有效负载回退到正常投递。

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

- `channels.slack.streamMode` (`replace | status_final | append`) 会自动迁移到 `channels.slack.streaming.mode`。
- 布尔值 `channels.slack.streaming` 会自动迁移到 `channels.slack.streaming.mode` 和 `channels.slack.streaming.nativeTransport`。
- 旧版 `channels.slack.nativeStreaming` 会自动迁移到 `channels.slack.streaming.nativeTransport`。

## 正在输入反应回退

当 Slack 处理回复时，`typingReaction` 会在传入的 OpenClaw 消息上添加一个临时反应，然后在运行完成时将其移除。这在线程回复之外最有用，线程回复使用默认的“正在输入...”状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意：

- Slack 期望使用短代码（例如 `"hourglass_flowing_sand"`）。
- 反应功能是尽力而为的，并在回复或失败路径完成后自动尝试清理。

## 媒体、分块和投递

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 文件附件是从 Slack 托管的私有 URL（令牌认证请求流）下载的，并在获取成功且大小限制允许时写入媒体存储。

    运行时传入大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

<Accordion title="Outbound text and files">- 文本块使用 `channels.slack.textChunkLimit`（默认 4000） - `channels.slack.chunkMode="newline"` 启用以段落优先的分割 - 文件发送使用 Slack 上传 API 并且可以包含线程回复（`thread_ts`） - 出站媒体上限在配置时遵循 `channels.slack.mediaMaxMb`；否则渠道发送使用媒体管道的 MIME 类型默认值</Accordion>

  <Accordion title="Delivery targets">
    首选显式目标：

    - 用于私信的 `user:<id>`
    - 用于渠道的 `channel:<id>`

    发送到用户目标时，Slack 私信是通过 Slack 对话 API 打开的。

  </Accordion>
</AccordionGroup>

## Commands and slash behavior

Slash commands appear in Slack as either a single configured command or multiple native commands. Configure `channels.slack.slashCommand` to change command defaults:

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

Native commands require [additional manifest settings](#additional-manifest-settings) in your Slack app and are enabled with `channels.slack.commands.native: true` or `commands.native: true` in global configurations instead.

- Native command auto-mode is **off** for Slack so `commands.native: "auto"` does not enable Slack native commands.

```txt
/help
```

Native argument menus use an adaptive rendering strategy that shows a confirmation modal before dispatching a selected option value:

- up to 5 options: button blocks
- 6-100 options: static select menu
- more than 100 options: external select with async option filtering when interactivity options handlers are available
- exceeded Slack limits: encoded option values fall back to buttons

```txt
/think
```

Slash sessions use isolated keys like `agent:<agentId>:slack:slash:<userId>` and still route command executions to the target conversation 会话 using `CommandTargetSessionKey`.

## Interactive replies

Slack can render agent-authored interactive reply controls, but this feature is disabled by default.

Enable it globally:

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

Or enable it for one Slack account only:

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

这些指令编译为 Slack Block Kit，并将点击或选择通过现有的 Slack 交互事件路径路由回来。

注意：

- 这是 Slack 特有的 UI。其他渠道不会将 Slack Block Kit 指令转换为其自身的按钮系统。
- 交互回调值是 OpenClaw 生成的不透明令牌，而不是代理编写的原始值。
- 如果生成的交互块超出 Slack Block Kit 限制，OpenClaw 将回退到原始文本回复，而不是发送无效的块负载。

## Slack 中的执行审批

Slack 可以充当带有交互按钮和交互的原生审批客户端，而不是回退到 Web UI 或终端。

- 执行审批使用 `channels.slack.execApprovals.*` 进行原生私信/渠道路由。
- 当请求已经到达 Slack 且审批 id 类型为 `plugin:` 时，插件审批仍然可以通过同一个 Slack 原生按钮界面解决。
- 审批者授权仍然强制执行：只有被识别为审批者的用户才能通过 Slack 批准或拒绝请求。

这与其他渠道使用相同的共享审批按钮界面。当在您的 Slack 应用设置中启用了 `interactivity` 时，审批提示将直接在对话中呈现为 Block Kit 按钮。
当存在这些按钮时，它们是主要的审批用户体验；仅当工具结果显示聊天审批不可用或手动审批是唯一途径时，OpenClaw 才应包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` （可选；可能时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target` （`dm` | `channel` | `both`，默认： `dm`）
- `agentFilter`， `sessionFilter`

当 `enabled` 未设置或为 `"auto"` 且至少有一个审批人解决时，Slack 会自动启用原生执行审批。设置 `enabled: false` 以显式禁用 Slack 作为原生审批客户端。设置 `enabled: true` 以在审批人解决时强制启用原生审批。

没有显式 Slack 执行审批配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

仅当您想要覆盖审批人、添加过滤器或选择加入原始聊天传递时，才需要显式的 Slack 原生配置：

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

共享 `approvals.exec` 转发是分开的。仅当执行审批提示也必须路由到其他聊天或显式的带外目标时才使用它。共享 `approvals.plugin` 转发也是分开的；当这些请求已经到达 Slack 时，Slack 原生按钮仍然可以解决插件审批。

同聊 `/approve` 也适用于已经支持命令的 Slack 渠道和私信。请参阅 [Exec approvals](/en/tools/exec-approvals) 了解完整的审批转发模型。

## 事件和操作行为

- 消息编辑/删除/线程广播被映射到系统事件。
- 表情符号添加/移除事件被映射到系统事件。
- 成员加入/离开、频道创建/重命名以及固定/取消固定事件被映射到系统事件。
- 当启用 `configWrites` 时，`channel_id_changed` 可以迁移频道配置键。
- 频道主题/用途元数据被视为不受信任的上下文，并且可以注入到路由上下文中。
- 线程启动者和初始线程历史上下文种子在适用时由配置的发件人允许列表进行过滤。
- 块操作和模态交互发出带有丰富负载字段的结构化 `Slack interaction: ...` 系统事件：
  - 块操作：选定的值、标签、选择器值和 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，包含路由频道元数据和表单输入

## 配置参考指针

主要参考：

- [配置参考 - Slack](/en/gateway/configuration-reference#slack)

  高信号 Slack 字段：
  - mode/auth: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - 私信 access: `dm.enabled`, `dmPolicy`, `allowFrom` (legacy: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - compatibility toggle: `dangerouslyAllowNameMatching` (break-glass; keep off unless needed)
  - 渠道 access: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - threading/history: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 故障排除

<AccordionGroup>
  <Accordion title="渠道中无回复">
    按顺序检查：

    - `groupPolicy`
    - 渠道允许列表 (`channels.slack.channels`)
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

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    在 Slack 应用设置中验证 bot + app 令牌和 Socket Mode 是否已启用。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，则说明 Slack 账户已配置，但当前运行时无法解析 SecretRef 支持的
    值。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    验证：

    - 签名密钥
    - webhook 路径
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每个 HTTP 账户唯一的 `webhookPath`

    如果 `signingSecretStatus: "configured_unavailable"` 出现在账户
    快照中，则 HTTP 账户已配置，但当前运行时无法
    解析 SecretRef 支持的签名密钥。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    验证您的意图是：

    - 原生命令模式 (`channels.slack.commands.native: true`)，并在 Slack 中注册了匹配的斜杠命令
    - 还是单斜杠命令模式 (`channels.slack.slashCommand.enabled: true`)

    还要检查 `commands.useAccessGroups` 和渠道/用户白名单。

  </Accordion>
</AccordionGroup>

## 相关

- [配对](/en/channels/pairing)
- [组](/en/channels/groups)
- [安全](/en/gateway/security)
- [渠道路由](/en/channels/channel-routing)
- [故障排除](/en/channels/troubleshooting)
- [配置](/en/gateway/configuration)
- [斜杠命令](/en/tools/slash-commands)
