---
summary: "Slack 设置和运行时行为（Socket Mode + HTTP Events API）"
read_when:
  - 设置 Slack 或调试 Slack socket/HTTP 模式
title: "Slack"
---

# Slack

状态：通过 Slack 应用集成支持私信和渠道的生产环境。默认模式为 Socket Mode；同时也支持 HTTP Events API 模式。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    Slack 私信默认为配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket Mode（默认）">
    <Steps>
      <Step title="创建 Slack 应用和令牌">
        在 Slack 应用设置中：

        - 启用 **Socket Mode**
        - 使用 `connections:write` 创建 **App Token** (`xapp-...`)
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
        为以下内容订阅机器人事件：

        - `app_mention`
        - `message.channels`、`message.groups`、`message.im`、`message.mpim`
        - `reaction_added`、`reaction_removed`
        - `member_joined_channel`、`member_left_channel`
        - `channel_rename`
        - `pin_added`、`pin_removed`

        同时为私信启用 App Home **Messages Tab**。
      </Step>

      <Step title="启动网关">

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
        - 复制 Slack **Signing Secret**
        - 将 Event Subscriptions（事件订阅）、Interactivity（交互）和 Slash command Request URL（斜杠命令请求 URL）设置为相同的 webhook 路径（默认为 `/slack/events`）

      </Step>

      <Step title="配置 OpenClaw HTTP 模式">

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

      <Step title="为多账户 HTTP 使用唯一的 webhook 路径">
        支持按账户的 HTTP 模式。

        为每个帐户提供不同的 `webhookPath`，以免注册冲突。
      </Step>
    </Steps>

  </Tab>

</Tabs>

## Token 模型

- `botToken` + `appToken` 是 Socket Mode 所必需的。
- HTTP 模式需要 `botToken` + `signingSecret`。
- 配置 token 会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` env 回退仅适用于默认帐户。
- `userToken` (`xoxp-...`) 仅限配置（无 env 回退），并且默认为只读行为 (`userTokenReadOnly: true`)。
- 可选：如果您希望传出消息使用活动代理身份（自定义 `username` 和图标），请添加 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 语法。

<Tip>
对于操作/目录读取，配置后可以优先使用用户令牌。对于写入，机器人令牌仍然是首选；只有当 `userTokenReadOnly: false` 且机器人令牌不可用时，才允许使用用户令牌进行写入。
</Tip>


## 访问控制和路由

<Tabs>
  <Tab title="私信策略">
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
    - 命名账户在未设置自己的 `allowFrom` 时会继承 `channels.slack.allowFrom`。
    - 命名账户不继承 `channels.slack.accounts.default.allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="渠道策略">
    `channels.slack.groupPolicy` 控制渠道处理：

    - `open`
    - `allowlist`
    - `disabled`

    渠道允许列表位于 `channels.slack.channels` 下，应使用稳定的渠道 ID。

    运行时说明：如果 `channels.slack` 完全缺失（仅限环境变量的设置），运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 渠道允许列表条目和私信允许列表条目在令牌访问允许的情况下在启动时解析
    - 未解析的渠道名称条目将按配置保留，但默认情况下在路由中被忽略
    - 入站授权和渠道路由默认以 ID 为先；直接的用户名/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及和渠道用户">
    渠道消息默认受提及限制。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - 提及正则模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为

    每个渠道的控件 (`channels.slack.channels.<id>`；仅名称通过启动解析或 `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (允许列表)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 密钥格式：`id:`、`e164:`、`username:`、`name:` 或 `"*"` 通配符
      (旧的无前缀密钥仍然仅映射到 `id:`)

  </Tab>
</Tabs>

## 命令和斜杠行为

- 针对 Slack，本机命令自动模式默认为 **关闭** (`commands.native: "auto"` 不启用 Slack 本机命令)。
- 使用 `channels.slack.commands.native: true`（或全局 `commands.native: true`）启用原生 Slack 命令处理程序。
- 启用本机命令后，请在 Slack 中注册匹配的斜杠命令 (`/<command>` 名称)，但有一个例外：
  - 为状态命令注册 `/agentstatus` (Slack 保留了 `/status`)
- 如果未启用本机命令，您可以通过 `channels.slack.slashCommand` 运行单个已配置的斜杠命令。
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

并且仍然针对目标会话会话 (`CommandTargetSessionKey`) 路由命令执行。

## 主题串、会话和回复标签

- 私信路由为 `direct`；渠道路由为 `channel`；MPIM 路由为 `group`。
- 使用默认的 `session.dmScope=main`，Slack 私信会合并到 Agent 主会话中。
- 渠道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 适用时，主题回复可以创建主题会话后缀（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 默认值为 `thread`；`thread.inheritParent` 默认值为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新主题会话开始时获取多少现有的主题消息（默认 `20`；设置为 `0` 以禁用）。

回复主题控制：

- `channels.slack.replyToMode`：`off|first|all`（默认 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 中 **所有** 回复主题，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，在 Telegram 中，显式标签在 `"off"` 模式下仍然有效。这种差异反映了平台的主题模型：Slack 主题将消息从渠道中隐藏，而 Telegram 回复在主聊天流程中仍然可见。

## 媒体、分块和投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件从 Slack 托管的私有 URL（令牌认证请求流程）下载，并在获取成功且大小限制允许时写入媒体存储。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="Outbound text and files">
    - text chunks use `channels.slack.textChunkLimit` (default 4000)
    - `channels.slack.chunkMode="newline"` enables paragraph-first splitting
    - file sends use Slack upload APIs and can include thread replies (`thread_ts`)
    - outbound media cap follows `channels.slack.mediaMaxMb` when configured; otherwise 渠道 sends use MIME-kind defaults from media pipeline
  </Accordion>

  <Accordion title="Delivery targets">
    Preferred explicit targets:

    - `user:<id>` for 私信
    - `channel:<id>` for channels

    Slack 私信 are opened via Slack conversation APIs when sending to user targets.

  </Accordion>
</AccordionGroup>

## 操作和门控

Slack actions are controlled by `channels.slack.actions.*`.

当前 Slack 工具中可用的操作组：

| 组      | 默认 |
| ---------- | ------- |
| 消息   | 已启用 |
| 表情回应  | 已启用 |
| 固定       | 已启用 |
| 成员信息 | 已启用 |
| 表情列表  | 已启用 |

## 事件和操作行为

- 消息编辑/删除/线程广播被映射到系统事件。
- 表情回应添加/移除事件被映射到系统事件。
- 成员加入/离开、渠道创建/重命名和固定添加/移除事件被映射到系统事件。
- Assistant thread status updates (for "is typing..." indicators in threads) use `assistant.threads.setStatus` and require bot scope `assistant:write`.
- `channel_id_changed` can migrate 渠道 config keys when `configWrites` is enabled.
- 渠道主题/目的元数据被视为不受信任的上下文，可以注入到路由上下文中。
- Block actions and modal interactions emit structured `Slack interaction: ...` system events with rich payload fields:
  - block actions: selected values, labels, picker values, and `workflow_*` metadata
  - modal `view_submission` and `view_closed` events with routed 渠道 metadata and form inputs

## 确认表情回应

`ackReaction` sends an acknowledgement emoji while OpenClaw is processing an inbound message.

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- agent identity emoji fallback (`agents.list[].identity.emoji`, else "👀")

注意：

- Slack expects shortcodes (for example `"eyes"`).
- Use `""` to disable the reaction for the Slack account or globally.

## 正在输入表情回应回退

`typingReaction` adds a temporary reaction to the inbound Slack message while OpenClaw is processing a reply, then removes it when the run finishes. This is a useful fallback when Slack native assistant typing is unavailable, especially in 私信.

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

注意：

- Slack 期望使用短代码（例如 `"hourglass_flowing_sand"`）。
- 反应采用尽力而为的方式，并在回复或失败路径完成后尝试自动清理。

## 清单和范围检查清单

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
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "assistant:write",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

  </Accordion>

  <Accordion title="可选的用户令牌范围（读取操作）">
    如果您配置了 `channels.slack.userToken`，典型的读取范围包括：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果您依赖于 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="渠道中无回复">
    按顺序检查：

    - `groupPolicy`
    - 渠道 allowlist (`channels.slack.channels`)
    - `requireMention`
    - 每个渠道的 `users` allowlist

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
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - 配对批准/allowlist 条目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式未连接">
    在 Slack 应用设置中验证 bot + app 令牌以及 Socket 模式是否已启用。
  </Accordion>

  <Accordion title="HTTP 模式未接收事件">
    验证：

    - signing secret
    - webhook path
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - 每个 HTTP 账户唯一的 `webhookPath`

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    验证您是否打算：

    - 本机命令模式（`channels.slack.commands.native: true`），并在 Slack 中注册了匹配的斜杠命令
    - 或单斜杠命令模式（`channels.slack.slashCommand.enabled: true`）

    还要检查 `commands.useAccessGroups` 和渠道/用户白名单。

  </Accordion>
</AccordionGroup>

## 文本流式传输

OpenClaw 通过 Agents and AI Apps Slack 支持 API 原生文本流式传输。

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流。
- `partial`（默认值）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：在生成时显示进度状态文本，然后发送最终文本。

当 `streaming` 为 `partial` 时（默认值：`true`），`channels.slack.nativeStreaming` 控制 Slack 的原生流式 API（`chat.startStream` / `chat.appendStream` / `chat.stopStream`）。

禁用原生 Slack 流式传输（保持草稿预览行为）：

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

旧版密钥：

- `channels.slack.streamMode`（`replace | status_final | append`）会自动迁移到 `channels.slack.streaming`。
- 布尔 `channels.slack.streaming` 会自动迁移到 `channels.slack.nativeStreaming`。

### 要求

1. 在您的 Slack 应用设置中启用 **Agents and AI Apps**。
2. 确保该应用具有 `assistant:write` 作用域。
3. 该消息必须具有可用的回复线程。线程选择仍遵循 `replyToMode`。

### 行为

- 第一个文本块启动流（`chat.startStream`）。
- 随后的文本块追加到同一个流（`chat.appendStream`）。
- 回复结束即完成流（`chat.stopStream`）。
- 媒体和非文本负载将回退到正常投递。
- 如果流传输在回复中途失败，OpenClaw 将对其余负载回退到正常投递。

## 配置参考指针

主要参考：

- [配置参考 - Slack](/zh/gateway/configuration-reference#slack)

  高信号 Slack 字段：
  - 模式/认证：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - 私信访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 兼容性切换：`dangerouslyAllowNameMatching`（紧急情况使用；除非需要否则保持关闭）
  - 渠道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 线程/历史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 投递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`nativeStreaming`
  - 运维/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

## 相关

- [配对](/zh/channels/pairing)
- [渠道路由](/zh/channels/channel-routing)
- [故障排除](/zh/channels/troubleshooting)
- [配置](/zh/gateway/configuration)
- [斜杠命令](/zh/tools/slash-commands)

import en from "/components/footer/en.mdx";

<en />
