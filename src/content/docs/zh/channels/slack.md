---
summary: "Slack 设置和运行时行为（Socket Mode + HTTP Events API）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

状态：通过 Slack 应用集成支持私信和渠道的生产环境。默认模式为 Socket Mode；同时也支持 HTTP Events API 模式。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/en/channels/pairing">
    Slack 私信默认采用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/en/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket 模式（默认）">
    <Steps>
      <Step title="创建 Slack 应用和令牌">
        在 Slack 应用设置中：

        - 启用 **Socket Mode**
        - 创建具有 `connections:write` 的 **App Token** (`xapp-...`)
        - 安装应用并复制 **Bot Token** (`xoxb-...`)
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

        环境变量回退（仅默认账户）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="订阅应用事件">
        订阅机器人事件以用于：

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        同时为私信启用应用主页 **Messages Tab**。
      </Step>

      <Step title="启动网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Events API mode">
    <Steps>
      <Step title="Configure Slack app for HTTP">

        - 将模式设置为 HTTP (`channels.slack.mode="http"`)
        - 复制 Slack **Signing Secret**
        - 将 Event Subscriptions + Interactivity + Slash command Request URL 设置为相同的 webhook 路径（默认为 `/slack/events`）

      </Step>

      <Step title="Configure OpenClaw HTTP mode">

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

      <Step title="Use unique webhook paths for multi-account HTTP">
        支持每个账户的 HTTP 模式。

        为每个账户分配一个不同的 `webhookPath` 以避免注册冲突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 清单和权限范围检查表

<AccordionGroup>
  <Accordion title="Slack app manifest example" defaultOpen>

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

  </Accordion>

  <Accordion title="Optional user-token scopes (read operations)">
    如果您配置了 `channels.slack.userToken`，典型的读取权限范围包括：

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

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文
  字符串或 SecretRef 对象。
- 配置中的令牌会覆盖环境变量回退值。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退值仅适用于默认账户。
- `userToken` (`xoxp-...`) 仅限配置（无环境变量回退），默认为只读行为（`userTokenReadOnly: true`）。
- 可选：添加 `chat:write.customize`，如果你希望外发消息使用当前代理身份（自定义 `username` 和图标）。`icon_emoji` 使用 `:emoji_name:` 语法。

状态快照行为：

- Slack 账户检查会跟踪每个凭据的 `*Source` 和 `*Status`
  字段（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 状态为 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 意味着账户是通过 SecretRef
  或其他非内联密钥源配置的，但当前命令/运行时路径
  无法解析实际值。
- 在 HTTP 模式下，包含 `signingSecretStatus`；在 Socket 模式下，
  必需的组合为 `botTokenStatus` + `appTokenStatus`。

<Tip>对于操作/目录读取，配置后可优先使用用户令牌。对于写入，仍优先使用机器人令牌；仅当配置了 `userTokenReadOnly: false` 且机器人令牌不可用时，才允许使用用户令牌写入。</Tip>

## 操作和门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组       | 默认   |
| -------- | ------ |
| 消息     | 已启用 |
| 表情反应 | 已启用 |
| 固定项   | 已启用 |
| 成员信息 | 已启用 |
| 表情列表 | 已启用 |

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
    - `channels.slack.allowFrom`（首选）
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组私信默认为 false）
    - `dm.groupChannels`（可选的 MPIM 允许列表）

    多账号优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账号。
    - 命名账号在其自身的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 命名账号不继承 `channels.slack.accounts.default.allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制渠道处理：

    - `open`
    - `allowlist`
    - `disabled`

    渠道允许列表位于 `channels.slack.channels` 之下，应使用稳定的渠道 ID。

    运行时说明：如果 `channels.slack` 完全缺失（仅限环境变量的设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 当令牌访问允许时，渠道允许列表条目和私信允许列表条目在启动时解析
    - 未解析的渠道名称条目将保留为配置状态，但默认在路由中被忽略
    - 入站授权和渠道路由默认优先使用 ID；直接的用户名/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及和渠道用户">
    渠道消息默认受到提及限制。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - 提及正则模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为

    每渠道控制 (`channels.slack.channels.<id>`；名称仅通过启动解析或 `dangerouslyAllowNameMatching`) :

    - `requireMention`
    - `users` (白名单)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 键格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 通配符
      (旧式无前缀键仍仅映射到 `id:`)

  </Tab>
</Tabs>

## 线程、会话和回复标签

- 私信按 `direct` 路由；渠道按 `channel`；MPIM 按 `group`。
- 使用默认 `session.dmScope=main` 时，Slack 私信会折叠到代理主会话。
- 渠道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可以在适当时创建线程会话后缀 (`:thread:<threadTs>`)。
- `channels.slack.thread.historyScope` 默认值为 `thread`；`thread.inheritParent` 默认值为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话开始时获取多少现有线程消息（默认 `20`；设置 `0` 以禁用）。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧式回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 中**所有**回复线程，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，在 Telegram 中，显式标签在 `"off"` 模式下仍然有效。这种差异反映了平台的线程模型：Slack 线程会从渠道中隐藏消息，而 Telegram 回复在主聊天流中仍然可见。

## 确认反应

`ackReaction` 在 OpenClaw 处理传入消息时发送一个确认表情符号。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

备注：

- Slack 期望使用短代码（例如 `"eyes"`）。
- 使用 `""` 可针对 Slack 账户或全局禁用该反应。

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：生成时显示进度状态文本，然后发送最终文本。

当 `streaming` 为 `partial` 时，`channels.slack.nativeStreaming` 控制 Slack 原生文本流式传输（默认：`true`）。

- 必须有回复线程才能显示原生文本流式传输。线程选择仍遵循 `replyToMode`。如果没有，则使用正常的草稿预览。
- 媒体和非文本负载会回退到正常传递。
- 如果流式传输在回复中途失败，OpenClaw 会对其余负载回退到正常传递。

使用草稿预览代替 Slack 原生文本流式传输：

```json5
{
  channels: {
    slack: {
      streaming: "partial",
      nativeStreaming: false,
    },
  },
}
```

旧键：

- `channels.slack.streamMode`（`replace | status_final | append`）会自动迁移到 `channels.slack.streaming`。
- 布尔值 `channels.slack.streaming` 会自动迁移到 `channels.slack.nativeStreaming`。

## 正在输入反应回退

`typingReaction` 会在 OpenClaw 处理回复时向传入的 Slack 消息添加临时反应，然后在运行完成时将其移除。这在线程回复之外最有用，因为线程回复使用默认的“正在输入...”状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意事项：

- Slack 期望使用短代码（例如 `"hourglass_flowing_sand"`）。
- 反应是尽力而为的，并在回复或失败路径完成后自动尝试清理。

## 媒体、分块和传递

<AccordionGroup>
  <Accordion title="传入附件">
    Slack 文件附件会从 Slack 托管的私有 URL（令牌认证请求流程）下载，并在获取成功且大小限制允许时写入媒体存储。

    运行时传入大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

<Accordion title="出站文本和文件">- 文本块使用 `channels.slack.textChunkLimit`（默认为 4000） - `channels.slack.chunkMode="newline"` 启用以段落优先的分割 - 文件发送使用 Slack 上传 API，并且可以包含线程回复（`thread_ts`） - 出站媒体上限在配置时遵循 `channels.slack.mediaMaxMb`；否则渠道发送使用媒体管道的 MIME 类型默认值</Accordion>

  <Accordion title="传递目标">
    首选显式目标：

    - `user:<id>` 用于私信
    - `channel:<id>` 用于渠道

    发送到用户目标时，Slack 私信通过 Slack 对话 API 打开。

  </Accordion>
</AccordionGroup>

## 命令和斜杠行为

- 对于 Slack，本机命令自动模式为**关闭**（`commands.native: "auto"` 不会启用 Slack 本机命令）。
- 使用 `channels.slack.commands.native: true`（或全局 `commands.native: true`）启用本机 Slack 命令处理程序。
- 启用本机命令后，在 Slack 中注册匹配的斜杠命令（`/<command>` 名称），但有一个例外：
  - 注册 `/agentstatus` 用于状态命令（Slack 保留了 `/status`）
- 如果未启用原生命令，你可以通过 `channels.slack.slashCommand` 运行单个配置的斜杠命令。
- 原生参数菜单现在会调整其渲染策略：
  - 最多 5 个选项：按钮块
  - 6-100 个选项：静态选择菜单
  - 超过 100 个选项：当提供交互选项处理程序时，使用带有异步选项过滤的外部选择
  - 如果编码后的选项值超过 Slack 限制，该流程将回退到按钮
- 对于较长的选项有效载荷，斜杠命令参数菜单在发送选定值之前会使用确认对话框。

默认斜杠命令设置：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

斜杠会话使用隔离的密钥：

- `agent:<agentId>:slack:slash:<userId>`

并且仍然针对目标会话语境路由命令执行（`CommandTargetSessionKey`）。

## 交互式回复

Slack 可以渲染代理编写的交互式回复控件，但默认情况下禁用此功能。

全局启用它：

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

或者仅为一个 Slack 账户启用它：

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

这些指令会编译成 Slack Block Kit，并通过现有的 Slack 交互事件路径将点击或选择路由回来。

注意：

- 这是 Slack 特有的 UI。其他渠道不会将 Slack Block Kit 指令转换成它们自己的按钮系统。
- 交互式回调值是 OpenClaw 生成的不透明令牌，而不是原始的代理编写的值。
- 如果生成的交互式块超过 Slack Block Kit 限制，OpenClaw 将回退到原始文本回复，而不是发送无效的块有效载荷。

## Slack 中的执行审批

Slack 可以充当具有交互式按钮和交互的原生审批客户端，而不是回退到 Web UI 或终端。

- 执行审批使用 `channels.slack.execApprovals.*` 进行原生私信/渠道路由。
- 当请求已经到达 Slack 且审批 ID 类型为 `plugin:` 时，插件审批仍可通过相同的 Slack 原生按钮界面解决。
- 审批者授权仍然有效：只有被识别为审批者的用户才能通过 Slack 批准或拒绝请求。

这与其他渠道使用相同的共享审批按钮界面。当在您的 Slack 应用设置中启用 `interactivity` 时，审批提示会直接在对话中以 Block Kit 按钮的形式呈现。
当这些按钮存在时，它们是主要的审批用户体验；仅当工具结果指示聊天审批不可用或手动审批是唯一途径时，OpenClaw 才应包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；尽可能回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
- `agentFilter`，`sessionFilter`

当 `enabled` 未设置或为 `"auto"` 且至少有一位审批者解决时，Slack 会自动启用原生执行审批。设置 `enabled: false` 可明确禁用 Slack 作为原生审批客户端。设置 `enabled: true` 可在审批者解决时强制开启原生审批。

在没有明确 Slack 执行审批配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有当您想要覆盖审批者、添加过滤器或选择加入原始聊天传递时，才需要明确的 Slack 原生配置：

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

共享 `approvals.exec` 转发是独立的。仅当执行审批提示必须路由到其他聊天或显式带外目标时才使用它。共享 `approvals.plugin` 转发也是独立的；当这些请求已经到达 Slack 时，Slack 原生按钮仍然可以解决插件审批。

同聊天 `/approve` 也适用于已经支持命令的 Slack 频道和私信。有关完整的审批转发模型，请参阅 [执行审批](/en/tools/exec-approvals)。

## 事件和操作行为

- 消息编辑/删除/线程广播被映射为系统事件。
- 表情符号添加/移除事件被映射为系统事件。
- 成员加入/离开、渠道创建/重命名和固定消息添加/移除事件被映射为系统事件。
- 当启用 `configWrites` 时，`channel_id_changed` 可以迁移渠道配置键。
- 渠道主题/目的元数据被视为不受信任的上下文，并且可以被注入到路由上下文中。
- 线程启动器和初始线程历史上下文填充会在适用时根据配置的发件人允许列表进行过滤。
- 块操作和模态交互会发出具有丰富负载字段的结构化 `Slack interaction: ...` 系统事件：
  - 块操作：选定的值、标签、选择器值和 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，带有路由的渠道元数据和表单输入

## 配置参考指针

主要参考：

- [配置参考 - Slack](/en/gateway/configuration-reference#slack)

  高信号 Slack 字段：
  - 模式/身份验证：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - 私信访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 兼容性开关：`dangerouslyAllowNameMatching`（应急措施；除非需要，否则保持关闭）
  - 渠道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 线程/历史记录：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 故障排除

<AccordionGroup>
  <Accordion title="渠道内无回复">
    按顺序检查：

    - `groupPolicy`
    - 渠道 allowlist (`channels.slack.channels`)
    - `requireMention`
    - 每个渠道 `users` allowlist

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
    - `channels.slack.dmPolicy` (或旧的 `channels.slack.dm.policy`)
    - 配对批准 / allowlist 条目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式未连接">
    验证 Slack 应用设置中的 bot + app tokens 和 Socket Mode 是否已启用。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，则说明 Slack 账户
    已配置，但当前运行时无法解析 SecretRef-backed
    的值。

  </Accordion>

  <Accordion title="HTTP 模式未接收到事件">
    验证：

    - signing secret
    - webhook path
    - Slack 请求 URL（Events + Interactivity + Slash Commands）
    - 每个 HTTP 账户唯一的 `webhookPath`

    如果账户快照中出现 `signingSecretStatus: "configured_unavailable"`，则说明 HTTP 账户
    已配置，但当前运行时无法解析 SecretRef-backed 的签名密钥。

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    验证您是否想要：

    - 原生命令模式（`channels.slack.commands.native: true`），并在 Slack 中注册了匹配的斜杠命令
    - 或单一斜杠命令模式（`channels.slack.slashCommand.enabled: true`）

    还要检查 `commands.useAccessGroups` 和 渠道/用户允许列表。

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
