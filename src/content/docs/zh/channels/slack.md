---
summary: "Slack 设置和运行时行为（Socket Mode + HTTP Events API）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

状态：通过 Slack 应用集成支持私信和渠道的生产环境。默认模式为 Socket Mode；同时也支持 HTTP Events API 模式。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    Slack 私信默认为配对模式。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/en/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨渠道诊断和修复操作手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create Slack app and tokens">
        在 Slack 应用设置中：

        - 启用 **Socket Mode**
        - 创建具有 `connections:write` 的 **App Token** (`xapp-...`)
        - 安装应用并复制 **Bot Token** (`xoxb-...`)
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

        环境回退（仅限默认账户）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Subscribe app events">
        订阅以下机器人事件：

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        同时为私信启用 App Home **Messages Tab**。
      </Step>

      <Step title="Start gateway">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Events API 模式">
    <Steps>
      <Step title="为 HTTP 配置 Slack 应用">

        - 将模式设置为 HTTP (`channels.slack.mode="http"`)
        - 复制 %%PH:GLOSSARY:339:64343346**** 签名密钥 (Signing Secret)**
        - 将事件订阅 (Event Subscriptions) + 交互性 (Interactivity) + 斜杠命令 (Slash command) 请求 URL 设置为相同的 webhook 路径（默认为 `/slack/events`）

      </Step>

      <Step title="配置 Slack HTTP 模式">

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

      </Step>

      <Step title="为多账号 HTTP 使用唯一的 webhook 路径">
        支持按账号的 HTTP 模式。

        为每个帐户提供不同的 `webhookPath`，以免注册冲突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Token 模型

- Socket 模式需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- 配置 token 会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` env 回退仅适用于默认帐户。
- `userToken` (`xoxp-...`) 仅限配置（无 env 回退），并且默认为只读行为 (`userTokenReadOnly: true`)。
- 可选：如果您希望传出消息使用活动代理身份（自定义 `username` 和图标），请添加 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 语法。

<Tip>对于操作/目录读取，配置后可以优先使用用户令牌 (user token)。对于写入，机器人令牌 (bot token) 仍然是首选；仅当 `userTokenReadOnly: false` 且机器人令牌不可用时，才允许用户令牌写入。</Tip>

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
    - `channels.slack.allowFrom`（首选）
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组私信默认为 false）
    - `dm.groupChannels`（可选的 MPIM 允许列表）

    多账户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在其自己的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 命名账户不继承 `channels.slack.accounts.default.allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制渠道处理：

    - `open`
    - `allowlist`
    - `disabled`

    渠道允许列表位于 `channels.slack.channels` 下，应使用稳定的渠道 ID。

    运行时说明：如果 `channels.slack` 完全缺失（仅环境设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 当令牌访问允许时，渠道允许列表条目和私信允许列表条目在启动时解析
    - 未解析的渠道名称条目将按配置保留，但默认在路由中被忽略
    - 入站授权和渠道路由默认优先使用 ID；直接的用户名/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及和渠道用户">
    渠道消息默认由提及控制。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - 提及正则模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为

    每渠道控制 (`channels.slack.channels.<id>`；仅通过启动解析或 `dangerouslyAllowNameMatching` 获取名称)：

    - `requireMention`
    - `users` (白名单)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 键格式：`id:`, `e164:`, `username:`, `name:`, 或 `"*"` 通配符
      (旧版无前缀键仍仅映射到 `id:`)

  </Tab>
</Tabs>

## 命令和斜杠行为

- Slack 的原生命令自动模式为**关闭** (`commands.native: "auto"` 不会启用 Slack 原生命令)。
- 使用 `channels.slack.commands.native: true` (或全局 `commands.native: true`) 启用 Slack 原生命令处理程序。
- 启用原生命令后，在 Slack 中注册匹配的斜杠命令 (`/<command>` 名称)，但有一个例外：
  - 为 status 命令注册 `/agentstatus` (Slack 保留了 `/status`)
- 如果未启用原生命令，您可以通过 `channels.slack.slashCommand` 运行单个配置的斜杠命令。
- 本机参数菜单现在会调整其渲染策略：
  - 最多 5 个选项：按钮块
  - 6-100 个选项：静态选择菜单
  - 超过 100 个选项：外部选择菜单，当交互选项处理程序可用时进行异步选项过滤
  - 如果编码的选项值超过 Slack 限制，流程将回退到按钮
- 对于较长的选项载荷，斜杠命令参数菜单在分发选定的值之前会使用确认对话框。

## 交互式回复

Slack 可以呈现代理创作的交互式回复控件，但默认情况下禁用此功能。

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

启用后，代理可以发出仅限 Slack 的回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令会编译为 Slack Block Kit，并将点击或选择通过现有的 Slack 交互事件路径返回。

注意：

- 这是 Slack 特定的 UI。其他通道不会将 Slack Block Kit 指令转换为其自己的按钮系统。
- 交互式回调值是由 OpenClaw 生成的不透明令牌，而不是原始代理编写的值。
- 如果生成的交互式块超过 Slack Block Kit 限制，OpenClaw 将回退到原始文本回复，而不是发送无效的块负载。

默认斜杠命令设置：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

斜杠会话使用隔离密钥：

- `agent:<agentId>:slack:slash:<userId>`

并且仍然针对目标对话会话 (`CommandTargetSessionKey`) 路由命令执行。

## 主题串、会话和回复标签

- 私信 (私信) 作为 `direct` 路由；渠道作为 `channel`；MPIM 作为 `group`。
- 使用默认 `session.dmScope=main`，Slack 私信会折叠到 Agent 主会话。
- 渠道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可以在适用时创建线程会话后缀（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制当新线程会话开始时获取多少现有的线程消息（默认 `20`；设置 `0` 以禁用）。

回复主题控制：

- `channels.slack.replyToMode`：`off|first|all`（默认 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧版回退机制：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 中**所有**回复线程，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，在 Telegram 中，显式标签在 `"off"` 模式下仍然有效。这种差异反映了平台的线程模型：Slack 线程会从渠道中隐藏消息，而 Telegram 回复在主聊天流中仍然可见。

## 媒体、分块和投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件从 Slack 托管的私有 URL（通过令牌认证的请求流程）下载，并在获取成功且大小限制允许时写入媒体存储。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

<Accordion title="Outbound text and files">- 文本块使用 `channels.slack.textChunkLimit`（默认为 4000） - `channels.slack.chunkMode="newline"` 启用以段落优先的分割 - 文件发送使用 Slack 上传 API，并且可以包含串回复（`thread_ts`） - 出站媒体上限遵循 `channels.slack.mediaMaxMb`（如果已配置）；否则渠道发送使用媒体管道的 MIME 类型默认值</Accordion>

  <Accordion title="Delivery targets">
    首选的显式目标：

    - `user:<id>` 用于私信
    - `channel:<id>` 用于渠道

    当发送给用户目标时，Slack 私信通过 Slack 对话 API 打开。

  </Accordion>
</AccordionGroup>

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

## Events and operational behavior

- Message edits/deletes/thread broadcasts are mapped into system events.
- Reaction add/remove events are mapped into system events.
- Member join/leave, 渠道 created/renamed, and pin add/remove events are mapped into system events.
- 助手串状态更新（用于串中的“正在输入...”指示器）使用 `assistant.threads.setStatus` 并且需要 bot 范围 `assistant:write`。
- 当启用 `configWrites` 时，`channel_id_changed` 可以迁移渠道配置键。
- Channel topic/purpose metadata is treated as untrusted context and can be injected into routing context.
- 块操作和模态交互发出具有丰富负载字段的结构化 `Slack interaction: ...` 系统事件：
  - 块操作：选定的值、标签、选择器值和 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，包含路由渠道元数据和表单输入

## 确认反应

当 OpenClaw 正在处理入站消息时，`ackReaction` 会发送一个确认表情符号。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为“👀”）

注意：

- Slack 期望短代码（例如 `"eyes"`）。
- 使用 `""` 为 Slack 账户或全局禁用该回应。

## 正在输入反应回退

`typingReaction` 会在 Slack 处理回复时，向传入的 OpenClaw 消息添加临时回应，然后在运行结束时将其移除。当 Slack 原生助手输入功能不可用时，这是一个有用的回退方案，尤其是在私信中。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意：

- Slack 期望短代码（例如 `"hourglass_flowing_sand"`）。
- 该反应是尽力而为的，并在回复或失败路径完成后尝试自动清理。

## 清单和范围检查表

<AccordionGroup>
  <Accordion title="Slack app manifest example">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": false
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
      "bot": ["chat:write", "channels:history", "channels:read", "groups:history", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "users:read", "app_mentions:read", "assistant:write", "reactions:read", "reactions:write", "pins:read", "pins:write", "emoji:read", "commands", "files:read", "files:write"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "message.channels", "message.groups", "message.im", "message.mpim", "reaction_added", "reaction_removed", "member_joined_channel", "member_left_channel", "channel_rename", "pin_added", "pin_removed"]
    }
  }
}
```

  </Accordion>

  <Accordion title="Optional user-token scopes (read operations)">
    如果您配置了 `channels.slack.userToken`，典型的读取作用域包括：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果您依赖 Slack 搜索读取功能）

  </Accordion>
</AccordionGroup>

## Slack 中的 Exec 批准

Exec 批准提示可以使用交互式按钮和交互在 Slack 中进行原生路由，而不是回退到 Web UI 或终端。批准者授权是强制执行的：只有被识别为批准者的用户才能通过 Slack 批准或拒绝请求。

这使用了与其他渠道相同的共享批准按钮界面。当在您的 Slack 应用设置中启用 `interactivity` 时，批准提示会直接在对话中呈现为 Block Kit 按钮。

配置使用共享的 `approvals.exec` 配置配合 Slack 目标：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

同聊 `/approve` 也可以在已经支持命令的 Slack 频道和私信中使用。有关完整的批准转发模型，请参阅 [Exec 批准](/en/tools/exec-approvals)。

## 故障排除

<AccordionGroup>
  <Accordion title="渠道中无回复">
    按顺序检查：

    - `groupPolicy`
    - 渠道允许列表 (`channels.slack.channels`)
    - `requireMention`
    - 每个渠道 `users` 允许列表

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
    - `channels.slack.dmPolicy` (或传统的 `channels.slack.dm.policy`)
    - 配对批准 / 允许列表条目

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket 模式无法连接">在 Slack 应用设置中验证 bot + 应用令牌以及 Socket 模式是否已启用。</Accordion>

  <Accordion title="HTTP 模式未接收事件">
    验证：

    - 签名密钥
    - webhook 路径
    - Slack 请求 URL (事件 + 交互 + 斜杠命令)
    - 每个 HTTP 账户唯一的 `webhookPath`

  </Accordion>

  <Accordion title="原生/斜杠命令未触发">
    验证您是否原本打算：

    - 使用原生命令模式 (`channels.slack.commands.native: true`) 并在 Slack 中注册了匹配的斜杠命令
    - 或使用单一斜杠命令模式 (`channels.slack.slashCommand.enabled: true`)

    还要检查 `commands.useAccessGroups` 和 渠道/用户 允许列表。

  </Accordion>
</AccordionGroup>

## 文本流式传输

OpenClaw 通过 Agents 和 AI Apps Slack 支持 API 原生文本流式传输。

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial` (默认)：将预览文本替换为最新的部分输出。
- `block`：追加分块的预览更新。
- `progress`：生成时显示进度状态文本，然后发送最终文本。

`channels.slack.nativeStreaming` 控制 Slack 的原生流式 Slack (`chat.startStream` / `chat.appendStream` / `chat.stopStream`)，当 `streaming` 为 `partial` 时（默认：`true`）。

禁用原生 Slack 流式传输（保持草稿预览行为）：

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

旧版键：

- `channels.slack.streamMode` (`replace | status_final | append`) 会自动迁移到 `channels.slack.streaming`。
- 布尔值 `channels.slack.streaming` 会自动迁移到 `channels.slack.nativeStreaming`。

### 要求

1. 在你的 Slack 应用设置中启用 **Agents and AI Apps**。
2. 确保应用具有 `assistant:write` scope。
3. 该消息必须可使用回复线程。线程选择仍遵循 `replyToMode`。

### 行为

- 第一个文本块启动流 (`chat.startStream`)。
- 随后的文本块追加到同一流 (`chat.appendStream`)。
- 回复结束时结束流 (`chat.stopStream`)。
- 媒体和非文本负载回退到正常传送。
- 如果在回复中途流式传输失败，OpenClaw 会对其余负载回退到正常传送。

## 配置参考指针

主要参考：

- [配置参考 - Slack](/en/gateway/configuration-reference#slack)

  高信号 Slack 字段：
  - 模式/认证：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - 私信访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 兼容性切换开关：`dangerouslyAllowNameMatching`（紧急情况使用；除非需要否则保持关闭）
  - 渠道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - threading/history: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 相关

- [配对](/en/channels/pairing)
- [组](/en/channels/groups)
- [安全](/en/gateway/security)
- [通道路由](/en/channels/channel-routing)
- [故障排除](/en/channels/troubleshooting)
- [配置](/en/gateway/configuration)
- [斜杠命令](/en/tools/slash-commands)
