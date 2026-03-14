---
summary: "Slack 设置和运行时行为（Socket Mode + HTTP Events API）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

状态：通过 Slack 应用集成支持私信和渠道的生产环境。默认模式为 Socket Mode；同时也支持 HTTP Events API 模式。

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
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create Slack app and tokens">
        在 Slack 应用设置中：

        - 启用 **Socket Mode**
        - 使用 `connections:write` 创建 **App Token** (`xapp-...`)
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

        Env fallback (default account only):

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Subscribe app events">
        为以下内容订阅 bot 事件：

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
        - 复制 Slack **Signing Secret**
        - 将 Event Subscriptions + Interactivity + Slash command Request URL 设置为同一个 webhook 路径（默认为 `/slack/events`）

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

      <Step title="为多账号 HTTP 使用唯一的 webhook 路径">
        支持每个账号的 HTTP 模式。

        为每个账号指定一个不同的 `webhookPath`，以免注册发生冲突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- 配置 token 会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken` (`xoxp-...`) 仅限配置（无环境变量回退），默认为只读行为 (`userTokenReadOnly: true`)。
- 可选：如果希望发出的消息使用当前代理身份（自定义 `username` 和图标），请添加 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 语法。

<Tip>
  对于操作/目录读取，如果在配置中设置了用户 token，则优先使用它。对于写入，优先使用 bot token；仅当
  `userTokenReadOnly: false` 且 bot token 不可用时，才允许使用用户 token 进行写入。
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
    - 指定账户在其自己的 `allowFrom` 未设置时继承 `channels.slack.allowFrom`。
    - 指定账户不继承 `channels.slack.accounts.default.allowFrom`。

    私信中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` 控制渠道处理：

    - `open`
    - `allowlist`
    - `disabled`

    渠道允许列表位于 `channels.slack.channels` 之下，应使用稳定的渠道 ID。

    运行时说明：如果完全缺少 `channels.slack`（仅环境变量设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy`）。

    名称/ID 解析：

    - 当令牌访问允许时，渠道允许列表条目和私信允许列表条目会在启动时解析
    - 未解析的渠道名称条目将按配置保留，但默认情况下会忽略路由
    - 入站授权和渠道路由默认以 ID 为先；直接用户名/别名匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及和渠道用户">
    渠道消息默认通过提及进行访问控制。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - 提及正则表达式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程行为

    每个渠道的控制 (`channels.slack.channels.<id>`；仅通过启动解析或 `dangerouslyAllowNameMatching` 获取名称)：

    - `requireMention`
    - `users` (允许列表)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 键格式：`id:`, `e164:`, `username:`, `name:`，或 `"*"` 通配符
      (旧的无前缀键仍然仅映射到 `id:`)

  </Tab>
</Tabs>

## 命令和斜杠行为

- 对于 Slack，本机命令自动模式为 **关闭** (`commands.native: "auto"` 不启用 Slack 本机命令)。
- 使用 `channels.slack.commands.native: true` (或全局 `commands.native: true`) 启用 Slack 本机命令处理程序。
- 启用本机命令后，在 Slack 中注册匹配的斜杠命令 (`/<command>` 名称)，但有一个例外：
  - 为状态命令注册 `/agentstatus` (Slack 保留了 `/status`)
- 如果未启用本机命令，您可以通过 `channels.slack.slashCommand` 运行单个已配置的斜杠命令。
- 本机参数菜单现在会调整其渲染策略：
  - 最多 5 个选项：按钮块
  - 6-100 个选项：静态选择菜单
  - 超过 100 个选项：外部选择菜单，当交互选项处理程序可用时进行异步选项过滤
  - 如果编码的选项值超过 Slack 限制，流程将回退到按钮
- 对于较长的选项载荷，斜杠命令参数菜单在分发选定的值之前会使用确认对话框。

默认斜杠命令设置：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

斜杠会话使用隔离的密钥：

- `agent:<agentId>:slack:slash:<userId>`

并且仍然根据目标对话会话（`CommandTargetSessionKey`）路由命令执行。

## 线程、会话和回复标签

- 私信路由为 `direct`；频道路由为 `channel`；MPIM 路由为 `group`。
- 使用默认的 `session.dmScope=main` 时，Slack 私信会折叠到 Agent 主会话。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可以在适用时创建线程会话后缀（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话开始时获取多少现有的线程消息（默认为 `20`；设置为 `0` 以禁用）。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all`（默认为 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 中**所有**回复串线，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，后者在 `"off"` 模式下仍然会遵守显式标签。这种差异反映了平台的串线模型：Slack 串线会将消息从渠道中隐藏，而 Telegram 回复则在主聊天流程中保持可见。

## 媒体、分块和投递

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Slack 文件附件从 Slack 托管的私有 URL（令牌认证请求流）下载，并在获取成功且大小限制允许时写入媒体存储。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

<Accordion title="Outbound text and files">
  - 文本块使用 `channels.slack.textChunkLimit`（默认 4000） - `channels.slack.chunkMode="newline"`
  启用段落优先拆分 - 文件发送使用 Slack 上传 API，并且可以包含线程回复 (`thread_ts`) -
  出站媒体上限遵循配置的 `channels.slack.mediaMaxMb`；否则，渠道发送使用媒体管道的 MIME 类型默认值
</Accordion>

  <Accordion title="传递目标">
    首选显式目标：

    - `user:<id>` 用于私信
    - `channel:<id>` 用于渠道

    发送给用户目标时，Slack 私信是通过 Slack 对话 API 打开的。

  </Accordion>
</AccordionGroup>

## 操作和门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组         | 默认    |
| ---------- | ------- |
| messages   | enabled |
| reactions  | enabled |
| pins       | enabled |
| memberInfo | enabled |
| emojiList  | enabled |

## 事件和操作行为

- 消息编辑/删除/线程广播被映射到系统事件。
- 表情回应添加/移除事件被映射到系统事件。
- 成员加入/离开、渠道创建/重命名以及固定添加/移除事件被映射到系统事件。
- 助手线程状态更新（用于线程中的“正在输入...”指示器）使用 `assistant.threads.setStatus` 并且需要 bot 作用域 `assistant:write`。
- 当启用 `configWrites` 时，`channel_id_changed` 可以迁移渠道配置键。
- 渠道主题/目的元数据被视为不受信任的上下文，并且可以被注入到路由上下文中。
- 块操作和模态交互发出带有丰富负载字段的结构化 `Slack interaction: ...` 系统事件：
  - 块操作：选定的值、标签、选择器值以及 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，带有路由的渠道元数据和表单输入

## 确认回应

当 OpenClaw 正在处理传入消息时，`ackReaction` 会发送一个确认表情符号。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为“👀”）

备注：

- Slack 期望使用短代码（例如 `"eyes"`）。
- 使用 `""` 来为 Slack 账户或全局禁用该回应。

## 正在输入回应回退

`typingReaction` 会在 OpenClaw 处理回复时向传入的 Slack 消息添加一个临时回应，然后在运行完成时将其移除。当 Slack 原生助手输入功能不可用时，这是一个有用的回退方案，尤其是在私信中。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

备注：

- Slack 期望使用短代码（例如 `"hourglass_flowing_sand"`）。
- 反应是尽力而为的，在回复或失败路径完成后会尝试自动清理。

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
    请按顺序检查：

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

  <Accordion title="私信消息被忽略">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - 配对批准 / 允许列表条目

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Socket 模式未连接">
  在 Slack 应用设置中验证 bot + app 令牌以及 Socket 模式的启用状态。
</Accordion>

  <Accordion title="HTTP mode not receiving events">
    验证：

    - 签名密钥 (signing secret)
    - webhook 路径 (webhook path)
    - Slack 请求 URL（事件 + 交互 + 斜杠命令）
    - 每个 HTTP 账户唯一的 `webhookPath`

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    验证您是否打算使用：

    - 原生命令模式 (`channels.slack.commands.native: true`)，并在 Slack 中注册了匹配的斜杠命令
    - 或单斜杠命令模式 (`channels.slack.slashCommand.enabled: true`)

    同时检查 `commands.useAccessGroups` 和渠道/用户允许列表。

  </Accordion>
</AccordionGroup>

## 文本流式传输

OpenClaw 通过 Agents and AI Apps API 支持 Slack 原生文本流式传输。

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial` （默认）：用最新的部分输出替换预览文本。
- `block`：追加分块预览更新。
- `progress`：在生成时显示进度状态文本，然后发送最终文本。

当 `streaming` 为 `partial` 时（默认：`true`），`channels.slack.nativeStreaming` 控制 Slack 的原生流式 API (`chat.startStream` / `chat.appendStream` / `chat.stopStream`)。

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

1. 在您的 Slack 应用设置中启用 **Agents and AI Apps**。
2. 确保应用具有 `assistant:write` scope。
3. 该消息必须有一个可用的回复串。串的选择仍然遵循 `replyToMode`。

### 行为

- 第一个文本块启动流 (`chat.startStream`)。
- 随后的文本块追加到同一个流 (`chat.appendStream`)。
- 回复结束时完成流 (`chat.stopStream`)。
- 媒体和非文本负载回退到正常传递。
- 如果在回复中途流式传输失败，OpenClaw 将对剩余负载回退到正常传递。

## 配置参考指针

主要参考：

- [配置参考 - Slack](/zh/gateway/configuration-reference#slack)

  高优先级 Slack 字段：
  - 模式/认证：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - 私信访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 兼容性切换：`dangerouslyAllowNameMatching`（应急保留；除非需要，否则保持关闭）
  - 渠道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 串/历史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 传递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`nativeStreaming`
  - 操作/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

## 相关

- [配对](/zh/channels/pairing)
- [通道路由](/zh/channels/channel-routing)
- [故障排除](/zh/channels/troubleshooting)
- [配置](/zh/gateway/configuration)
- [斜杠命令](/zh/tools/slash-commands)

import zh from '/components/footer/zh.mdx';

<zh />
