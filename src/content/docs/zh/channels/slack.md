---
summary: "Slack 设置和运行时行为（Socket 模式 + HTTP 请求 URL）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

状态：通过 Slack 应用集成支持私信和渠道的生产环境就绪。默认模式为 Socket 模式；也支持 HTTP 请求 URL。

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

## 快速设置

<Tabs>
  <Tab title="Socket Mode（默认）">
    <Steps>
      <Step title="创建新的 Slack 应用">
        在 Slack 应用设置中，点击 **[Create New App](https://api.slack.com/apps/new)** 按钮：

        - 选择 **from a manifest** 并为你的应用选择一个工作区
        - 粘贴下面的 [example manifest](#manifest-and-scope-checklist) 并继续创建
        - 生成具有 `connections:write` 的 **App-Level Token**（`xapp-...`）
        - 安装应用并复制显示的 **Bot Token**（`xoxb-...`）
      </Step>

      <Step title="配置 OpenClaw">

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

      <Step title="启动网关">

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

        - 选择 **from a manifest** 并为你的应用选择一个工作区
        - 粘贴 [example manifest](#manifest-and-scope-checklist) 并在创建前更新 URL
        - 保存 **Signing Secret** 用于请求验证
        - 安装应用并复制显示的 **Bot Token**（`xoxb-...`）

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
        为多账户 HTTP 使用唯一的 webhook 路径

        为每个账户分配一个不同的 `webhookPath`（默认 `/slack/events`），以防止注册冲突。
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
  <Tab title="Socket 模式（默认）">

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

    可以使用多个[原生斜杠命令](#commands-and-slash-behavior)来代替单个配置的命令，以便进行细微区分：

    - 使用 `/agentstatus` 代替 `/status`，因为 `/status` 命令已被保留。
    - 一次最多可以提供 25 个斜杠命令。

    将现有的 `features.slash_commands` 部分替换为[可用命令](/zh/tools/slash-commands#command-list)的一个子集：

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
  <Accordion title="可选的作者身份范围（写入操作）">
    如果您希望传出消息使用活动的代理身份（自定义用户名和图标）而不是默认的 Slack 应用身份，请添加 `chat:write.customize` 机器人范围。

    如果使用表情符号图标，Slack 期望 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="可选的用户令牌范围（读取操作）">
    如果您配置 `channels.slack.userToken`，典型的读取范围包括：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果您依赖于 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## 令牌模型

- Socket 模式需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受纯文本字符串或 SecretRef 对象。
- 配置令牌会覆盖环境变量回退值。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken` (`xoxp-...`) 仅限配置（无环境变量回退），并且默认为只读行为 (`userTokenReadOnly: true`)。

状态快照行为：

- Slack 账户检查会跟踪每个凭据的 `*Source` 和 `*Status` 字段 (`botToken`、`appToken`、`signingSecret`、`userToken`)。
- 状态为 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示账户是通过 SecretRef 或其他非内联密钥源配置的，但当前的命令/运行时路径无法解析实际值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket 模式下，必需的一对是 `botTokenStatus` + `appTokenStatus`。

<Tip>对于操作/目录读取，配置用户令牌时，用户令牌可能优先。对于写入，bot 令牌保持优先；仅当 `userTokenReadOnly: false` 且 bot 令牌不可用时，才允许使用用户令牌写入。</Tip>

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

当前的 Slack 消息操作包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。

## 访问控制和路由

<Tabs>
  <Tab title="私信 policy">
    `channels.slack.dmPolicy` 控制 私信 访问（旧版：`channels.slack.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；旧版：`channels.slack.dm.allowFrom`）
    - `disabled`

    私信 标志：

    - `dm.enabled`（默认为 true）
    - `channels.slack.allowFrom`（首选）
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组 私信 默认为 false）
    - `dm.groupChannels`（可选的 MPIM 允许列表）

    多账户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在其自己的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 命名账户不继承 `channels.slack.accounts.default.allowFrom`。

    私信 中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制 渠道 处理：

    - `open`
    - `allowlist`
    - `disabled`

    渠道 允许列表位于 `channels.slack.channels` 之下，应使用稳定的 渠道 ID。

    运行时说明：如果 `channels.slack` 完全缺失（仅限环境设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 渠道 允许列表条目和 私信 允许列表条目在令牌访问允许时在启动时解析
    - 未解析的 渠道 名称条目将按配置保留，但默认情况下在路由中被忽略
    - 入站授权和 渠道 路由默认以 ID 为先；直接的用户名/匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及和渠道用户">
    渠道消息默认受提及限制。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - 提及正则模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为 (当 `thread.requireExplicitMention` 为 `true` 时禁用)

    每渠道控制 (`channels.slack.channels.<id>`；仅通过启动解析或 `dangerouslyAllowNameMatching` 使用名称)：

    - `requireMention`
    - `users` (允许列表)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 键格式：`id:`, `e164:`, `username:`, `name:`, 或 `"*"` 通配符
      (旧式无前缀键仍仅映射到 `id:`)

  </Tab>
</Tabs>

## 线程、会话和回复标签

- 私信路由为 `direct`；渠道为 `channel`；MPIM 为 `group`。
- 使用默认 `session.dmScope=main`，Slack 私信会折叠到代理主会话。
- 渠道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复在适用时可以创建线程会话后缀 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话开始时获取多少现有线程消息 (默认 `20`；设置 `0` 以禁用)。
- `channels.slack.thread.requireExplicitMention`（默认 `false`）：当 `true` 时，抑制隐式的线索提及，以便机器人仅响应线索中的显式 `@bot` 提及，即使机器人已经参与了该线索。如果没有此设置，在机器人参与的线索中的回复将绕过 `requireMention` 限制。

回复线程控制：

- `channels.slack.replyToMode`： `off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧版回退： `channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 中 **所有** 回复线索，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，后者在 `"off"` 模式下仍然遵守显式标签。这种差异反映了平台的线索模型：Slack 线索会从渠道中隐藏消息，而 Telegram 回复则在主聊天流中保持可见。

聚焦的 Slack 线索回复在存在绑定的 ACP 会话时通过该会话路由，而不是针对默认代理 shell 准备回复。这使得 `/focus` 和 `/acp spawn ... --bind here` 绑定在线索的后续消息中保持完整。

## 确认回应

当 OpenClaw 处理传入消息时，`ackReaction` 会发送一个确认表情符号。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

注意：

- Slack 需要使用短代码（例如 `"eyes"`）。
- 使用 `""` 为 Slack 账户或全局禁用该回应。

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：在生成时显示进度状态文本，然后发送最终文本。
- `streaming.preview.toolProgress`：当草稿预览处于活动状态时，将工具/进度更新路由到同一条已编辑的预览消息中（默认：`true`）。设置 `false` 以保留独立的工具/进度消息。

`channels.slack.streaming.nativeTransport` 控制当 `channels.slack.streaming.mode` 为 `partial` 时的 Slack 原生文本流式传输（默认：`true`）。

- 必须存在回复线程，才能显示原生文本流式传输和 Slack 助手线程状态。线程选择仍然遵循 `replyToMode`。
- 当原生流式传输不可用时，频道和群聊的根消息仍然可以使用普通的草稿预览。
- 顶层的 Slack 私信默认保持在主线程外，因此它们不显示线程样式的预览；如果您希望在那里看到可见的进度，请使用线程回复或 `typingReaction`。
- 媒体和非文本负载会回退到正常投递。
- 媒体/错误最终结果会取消挂起的预览编辑，而不会刷新临时草稿；符合条件的文本/块最终结果只有在能够就地编辑预览时才会刷新。
- 如果在回复中途流式传输失败，OpenClaw 将对其余负载回退到正常投递。
- 如果 Slack Connect 频道在 SDK 刷新其本地缓冲区之前拒绝流式传输，则会回退到正常的 Slack 回复，因此短回复不会在 Slack 确认之前被静默丢弃或报告为已投递。

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

`typingReaction` 会在 OpenClaw 处理回复时向传入的 Slack 消息添加一个临时的反应，然后在运行完成时将其移除。这在线程回复之外最有用，后者使用默认的“正在输入...”状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意：

- Slack 期望使用短代码（例如 `"hourglass_flowing_sand"`）。
- 该反应为尽力而为（best-effort），并在回复或失败路径完成后自动尝试清理。

## 媒体、分块与投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件是从 Slack 托管的私有 URL（令牌认证请求流程）下载的，当获取成功且大小限制允许时，将写入媒体存储。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

<Accordion title="出站文本和文件">- 文本块使用 `channels.slack.textChunkLimit`（默认 4000） - `channels.slack.chunkMode="newline"` 启用段落优先（paragraph-first）拆分 - 文件发送使用 Slack 上传 API，并且可以包含线程回复（`thread_ts`） - 出站媒体上限在配置后遵循 `channels.slack.mediaMaxMb`；否则渠道发送使用媒体管道的 MIME 类型默认值</Accordion>

  <Accordion title="投递目标">
    首选显式目标：

    - 私信使用 `user:<id>`
    - 渠道使用 `channel:<id>`

    当发送给用户目标时，Slack 私信通过 Slack 对话 API 打开。

  </Accordion>
</AccordionGroup>

## 命令和斜杠行为

斜杠命令在 Slack 中显示为单个配置的命令或多个原生命令。配置 `channels.slack.slashCommand` 以更改命令默认值：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

原生命令需要在您的 Slack 应用中配置[额外的清单设置](#additional-manifest-settings)，并在全局配置中使用 `channels.slack.commands.native: true` 或 `commands.native: true` 启用。

- 对于 Slack，原生命令自动模式为**关闭**，因此 `commands.native: "auto"` 不会启用 Slack 原生命令。

```txt
/help
```

原生参数菜单使用自适应渲染策略，在发送选定的选项值之前显示确认模态框：

- 最多 5 个选项：按钮块
- 6-100 个选项：静态选择菜单
- 超过 100 个选项：当有交互选项处理程序可用时，使用带异步选项过滤的外部选择
- 超出 Slack 限制：编码的选项值回退到按钮

```txt
/think
```

Slash 会话使用像 `agent:<agentId>:slack:slash:<userId>` 这样的隔离键，并仍然使用 `CommandTargetSessionKey` 将命令执行路由到目标对话会话。

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

或仅为一个 Slack 帐户启用：

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

这些指令会编译成 Slack Block Kit，并将点击或选择通过现有的 Slack 交互事件路径路由回来。

注意：

- 这是 Slack 特有的 UI。其他渠道不会将 Slack Block Kit 指令转换为其自己的按钮系统。
- 交互式回调值是 OpenClaw 生成的透明令牌，而不是原始的代理创作值。
- 如果生成的交互式块超出 Slack Block Kit 限制，OpenClaw 将回退到原始文本回复，而不是发送无效的块负载。

## 在 Slack 中进行 Exec 批准

Slack 可以充当具有交互按钮和交互的原生批准客户端，而不必回退到 Web UI 或终端。

- Exec 批准使用 `channels.slack.execApprovals.*` 进行原生私信/渠道路由。
- 当请求已到达 Slack 且批准 ID 种类为 `plugin:` 时，插件批准仍可通过同一 Slack 原生按钮界面解决。
- 批准人授权仍然强制执行：只有被识别为批准人的用户才能通过 Slack 批准或拒绝请求。

此功能与其他渠道使用相同的共享审批按钮界面。当在您的 Slack 应用设置中启用了 `interactivity` 时，审批提示会以 Block Kit 按钮的形式直接呈现在对话中。
当这些按钮存在时，它们是主要的审批用户体验；仅当工具结果指出聊天审批不可用或手动审批是唯一途径时，OpenClaw
才应包含手动的 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；可能时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认值：`dm`）
- `agentFilter`，`sessionFilter`

当 `enabled` 未设置或为 `"auto"` 且至少有一位
审批人解决时，Slack 会自动启用原生执行审批。设置 `enabled: false` 可明确禁用 Slack 作为原生审批客户端。
设置 `enabled: true` 可在审批人解决时强制启用原生审批。

没有明确 Slack 执行审批配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

仅当您想要覆盖审批人、添加过滤器或
选择加入源聊天交付时，才需要明确的 Slack 原生配置：

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

共享的 `approvals.exec` 转发是独立的。仅当执行审批提示还必须
路由到其他聊天或明确的带外目标时才使用它。共享的 `approvals.plugin` 转发也是
独立的；当这些请求已经
到达 Slack 时，Slack 原生按钮仍然可以解决插件审批。

同聊天 `/approve` 在已经支持命令的 Slack 渠道和私信中也有效。有关完整的审批转发模型，请参阅 [Exec approvals](/zh/tools/exec-approvals)。

## 事件和操作行为

- 消息编辑/删除/线程广播被映射到系统事件。
- 表情回应添加/移除事件被映射到系统事件。
- 成员加入/离开、创建/重命名频道以及添加/移除固定项的事件被映射到系统事件。
- 当启用 `configWrites` 时，`channel_id_changed` 可以迁移渠道配置键。
- 渠道主题/用途元数据被视为不受信任的上下文，并可以注入到路由上下文中。
- 对话发起者和初始对话历史上下文种子（在适用时）会根据配置的发件人允许列表进行过滤。
- 块操作和模态交互会发出具有丰富负载字段的结构化 `Slack interaction: ...` 系统事件：
  - 块操作：选定的值、标签、选择器值和 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，包含路由的渠道元数据和表单输入

## 配置参考指针

主要参考：

- [配置参考 - Slack](/zh/gateway/configuration-reference#slack)

  高信号 Slack 字段：
  - 模式/身份验证：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - 私信访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 兼容性切换开关：`dangerouslyAllowNameMatching`（紧急备用；除非需要，否则请关闭）
  - 渠道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 对话/历史记录：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 投递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`streaming.nativeTransport`、`streaming.preview.toolProgress`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 故障排除

<AccordionGroup>
  <Accordion title="No replies in channels">
    按顺序检查：

    - `groupPolicy`
    - 渠道允许列表（`channels.slack.channels`）
    - `requireMention`
    - 每个渠道的 `users` 允许列表

    有用的命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="私信 messages ignored">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - 配对批准 / 允许列表条目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    在 Slack 应用设置中验证 bot + app tokens 和 Socket Mode 是否已启用。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，说明 Slack 账户
    已配置，但当前运行时无法解析 SecretRef 支持的值。

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    验证：

    - signing secret
    - webhook 路径
    - Slack Request URLs（Events + Interactivity + Slash Commands）
    - 每个 HTTP 账户唯一的 `webhookPath`

    如果 `signingSecretStatus: "configured_unavailable"` 出现在账户
    快照中，说明 HTTP 账户已配置，但当前运行时无法
    解析 SecretRef 支持的 signing secret。

    注册的 Request URL webhooks 通过与 Slack 监控器设置相同的共享处理程序注册表进行调度，因此 HTTP 模式 Slack 事件会在成功注册路由后继续通过注册路径路由，而不是返回 404。

  </Accordion>

<Accordion title="使用自定义 bot 令牌下载文件">当调用者传递 `cfg` 而未提供显式的 `token` 或预构建的客户端时，`downloadFile` 辅助函数会从运行时配置中解析其 bot 令牌，从而保留仅通过配置下载文件的机制，使其位于动作运行时路径之外。</Accordion>

  <Accordion title="原生/斜杠命令未触发">
    验证您是否打算使用：

    - 原生命令模式 (`channels.slack.commands.native: true`)，并在 Slack 中注册了匹配的斜杠命令
    - 或单一斜杠命令模式 (`channels.slack.slashCommand.enabled: true`)

    同时检查 `commands.useAccessGroups` 和渠道/用户白名单。

  </Accordion>
</AccordionGroup>

## 相关

- [配对](/zh/channels/pairing)
- [组](/zh/channels/groups)
- [安全性](/zh/gateway/security)
- [渠道路由](/zh/channels/channel-routing)
- [故障排除](/zh/channels/troubleshooting)
- [配置](/zh/gateway/configuration)
- [斜杠命令](/zh/tools/slash-commands)
