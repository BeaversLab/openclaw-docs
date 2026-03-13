---
summary: "Slack 设置和运行时行为（Socket 模式 + HTTP Events API）"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

状态：通过 Slack 应用集成，已准备好支持私信（DM）和频道。默认模式为 Socket 模式；同时也支持 HTTP Events API 模式。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/en/channels/pairing">
    Slack 私信默认为配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/zh/en/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="频道故障排除" icon="wrench" href="/zh/en/channels/troubleshooting">
    跨频道诊断和修复手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket 模式（默认）">
    <Steps>
      <Step title="创建 Slack 应用和令牌">
        在 Slack 应用设置中：

        - 启用 **Socket 模式 (Socket Mode)**
        - 创建 **应用令牌 (App Token)** (`xapp-...`) 并具有 `connections:write`
        - 安装应用并复制 **机器人令牌 (Bot Token)** (`xoxb-...`)
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
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        同时为私信启用应用主页的 **消息选项卡 (Messages Tab)**。
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
        - 复制 Slack **签名密钥 (Signing Secret)**
        - 将事件订阅 + 交互 + 斜杠命令请求 URL 设置为相同的 Webhook 路径（默认为 `/slack/events`）

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

      <Step title="为多账户 HTTP 模式使用唯一的 Webhook 路径">
        支持按账户的 HTTP 模式。

        为每个帐户分配一个独特的 `webhookPath`，以避免注册冲突。
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Token 模型

- Socket 模式需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- 配置令牌覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认帐户。
- `userToken` (`xoxp-...`) 仅限配置（无环境变量回退），默认为只读行为 (`userTokenReadOnly: true`)。
- 可选：如果您希望传出消息使用活跃代理身份（自定义 `username` 和图标），请添加 `chat:write.customize`。`icon_emoji` 使用 `:emoji_name:` 语法。

<Tip>
对于操作/目录读取，配置后可以优先使用用户令牌。对于写入，仍然优先使用机器人令牌；仅当 `userTokenReadOnly: false` 且机器人令牌不可用时，才允许用户令牌写入。
</Tip>

## 访问控制和路由

<Tabs>
  <Tab title="DM 策略">
    `channels.slack.dmPolicy` 控制 DM 访问（旧版：`channels.slack.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；旧版：`channels.slack.dm.allowFrom`）
    - `disabled`

    DM 标志：

    - `dm.enabled`（默认为 true）
    - `channels.slack.allowFrom`（首选）
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群组 DM 默认为 false）
    - `dm.groupChannels`（可选 MPIM 允许列表）

    多帐户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 帐户。
    - 当命名帐户自己的 `allowFrom` 未设置时，它们继承 `channels.slack.allowFrom`。
    - 命名帐户不继承 `channels.slack.accounts.default.allowFrom`。

    DM 中的配对使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="频道策略">
    `channels.slack.groupPolicy` 控制频道处理：

    - `open`
    - `allowlist`
    - `disabled`

    频道允许列表位于 `channels.slack.channels` 之下，并且应使用稳定的频道 ID。

    运行时说明：如果 `channels.slack` 完全缺失（仅环境变量设置），运行时将回退到 `groupPolicy="allowlist"` 并记录警告（即使 `channels.defaults.groupPolicy` 已设置）。

    名称/ID 解析：

    - 当令牌访问允许时，频道允许列表条目和 DM 允许列表条目会在启动时解析
    - 未解析的频道名称条目将按配置保留，但在默认情况下会被路由忽略
    - 传入授权和频道路由默认优先使用 ID；直接的用户名/别名匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Mentions and channel users">
    频道消息默认受提及限制。

    提及来源：

    - 显式应用提及 (`<@botId>`)
    - 提及正则模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人线程的行为

    每个频道的控制（`channels.slack.channels.<id>`；名称仅通过启动时解析或 `dangerouslyAllowNameMatching`）：

    - `requireMention`
    - `users` (allowlist)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` 密钥格式：`id:`, `e164:`, `username:`, `name:`, 或 `"*"` 通配符
      (旧的无前缀密钥仍然仅映射到 `id:`)

  </Tab>
</Tabs>

## 命令和斜杠行为

- Slack 的原生命令自动模式默认为 **关闭**（`commands.native: "auto"` 不会启用 Slack 原生命令）。
- 使用 `channels.slack.commands.native: true`（或全局 `commands.native: true`）启用 Slack 原生命令处理程序。
- 启用原生命令后，在 Slack 中注册匹配的斜杠命令（`/<command>` 名称），但有一个例外：
  - 为状态命令注册 `/agentstatus`（Slack 保留了 `/status`）
- 如果未启用原生命令，您可以通过 `channels.slack.slashCommand` 运行单个配置的斜杠命令。
- 原生参数菜单现在会调整其渲染策略：
  - 最多 5 个选项：按钮块
  - 6-100 个选项：静态选择菜单
  - 超过 100 个选项：外部选择，并在提供交互选项处理程序时启用异步选项筛选
  - 如果编码的选项值超过 Slack 限制，流程将回退到按钮
- 对于较长的选项载荷，斜杠命令参数菜单会在发送所选值之前使用确认对话框。

默认斜杠命令设置：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

斜杠会话使用隔离密钥：

- `agent:<agentId>:slack:slash:<userId>`

并且仍然针对目标对话会话路由命令执行（`CommandTargetSessionKey`）。

## 线程、会话和回复标记

- DM 作为 `direct` 路由；频道作为 `channel`；MPIM 作为 `group`。
- 使用默认的 `session.dmScope=main`，Slack DM 会合并到 Agent 主会话。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 线程回复可以在适用时创建线程会话后缀（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 默认为 `thread`；`thread.inheritParent` 默认为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制当新线程会话开始时获取多少条现有线程消息（默认为 `20`；设置 `0` 以禁用）。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all`（默认为 `off`）
- `channels.slack.replyToModeByChatType`：每个 `direct|group|channel`
- 直接聊天的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标记：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 中**所有**回复线程，包括显式的 `[[reply_to_*]]` 标签。这与 Telegram 不同，在 Telegram 中，显式标签在 `"off"` 模式下仍然有效。这种差异反映了平台的线程模型：Slack 线程会将消息从频道中隐藏，而 Telegram 回复在主聊天流程中仍然可见。

## 媒体、分块和投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件会从 Slack 托管的私有 URL 下载（通过令牌认证的请求流程），并在获取成功且大小限制允许时写入媒体存储。

    运行时入站大小上限默认为 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="Outbound text and files">
    - 文本块使用 `channels.slack.textChunkLimit`（默认为 4000）
    - `channels.slack.chunkMode="newline"` 启用段落优先分割
    - 文件发送使用 Slack 上传 API 并且可以包含线程回复（`thread_ts`）
    - 出站媒体上限遵循 `channels.slack.mediaMaxMb`（如果已配置）；否则频道发送使用来自媒体管道的 MIME 类型默认值
  </Accordion>

  <Accordion title="传递目标">
    首选显式目标：

    - `user:<id>` 用于私信
    - `channel:<id>` 用于频道

    当发送给用户目标时，Slack 私信通过 Slack conversation API 打开。

  </Accordion>
</AccordionGroup>

## 操作和门控

Slack 操作由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的操作组：

| 组        | 默认值   |
| --------- | ------ |
| messages  | enabled |
| reactions | enabled |
| pins      | enabled |
| memberInfo| enabled |
| emojiList | enabled |

## 事件和操作行为

- 消息编辑/删除/线程广播被映射到系统事件。
- 表情反应添加/移除事件被映射到系统事件。
- 成员加入/离开、频道创建/重命名以及固定添加/移除事件被映射到系统事件。
- 助手线程状态更新（用于线程中的“正在输入...”指示器）使用 `assistant.threads.setStatus` 并且需要 bot 作用域 `assistant:write`。
- 当启用 `configWrites` 时，`channel_id_changed` 可以迁移频道配置键。
- 频道主题/目的元数据被视为不受信任的上下文，并且可以注入到路由上下文中。
- 块操作和模态交互发出带有丰富负载字段的结构化 `Slack interaction: ...` 系统事件：
  - 块操作：选定的值、标签、选择器值和 `workflow_*` 元数据
  - 模态 `view_submission` 和 `view_closed` 事件，包含路由的渠道元数据和表单输入

## 确认反应

当 OpenClaw 处理入站消息时，`ackReaction` 会发送一个确认表情符号。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

备注：

- Slack 期望使用短代码（例如 `"eyes"`）。
- 使用 `""` 为 Slack 账户或全局禁用该反应。

## 输入反应回退

`typingReaction` 在 OpenClaw 处理回复时向入站 Slack 消息添加一个临时反应，然后在运行完成时将其移除。当 Slack 原生助手输入指示不可用时，这是一个有用的回退方案，尤其是在 DM 中。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

备注：

- Slack 期望使用短代码（例如 `"hourglass_flowing_sand"`）。
- 该反应是尽力而为的，并在回复或失败路径完成后尝试自动清理。

## 清单和权限范围检查表

<AccordionGroup>
  <Accordion title="Slack 应用清单示例">

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

  <Accordion title="可选用户令牌范围（读取操作）">
    如果您配置 `channels.slack.userToken`，典型的读取范围包括：

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (如果您依赖 Slack 搜索读取)

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="频道中无回复">
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
    - 配对批准/允许列表条目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket 模式未连接">
    在 Slack 应用设置中验证 bot + app 令牌以及 Socket 模式是否已启用。
  </Accordion>

  <Accordion title="HTTP 模式未接收到事件">
    验证：

    - 签名密钥
    - webhook 路径
    - Slack 请求 URL (事件 + 交互 + 斜杠命令)
    - 每个 HTTP 账户唯一的 `webhookPath`

  </Accordion>

  <Accordion title="原生/斜杠命令未触发">
    验证您是否原本想要：

    - 原生命令模式 (`channels.slack.commands.native: true`)，需在 Slack 中注册匹配的斜杠命令
    - 或单斜杠命令模式 (`channels.slack.slashCommand.enabled: true`)

    同时检查 `commands.useAccessGroups` 和频道/用户白名单。

  </Accordion>
</AccordionGroup>

## 文本流式传输

OpenClaw 通过 Agents 和 AI Apps API 支持 Slack 原生文本流式传输。

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：将预览文本替换为最新的部分输出。
- `block`：追加分块预览更新。
- `progress`：在生成时显示进度状态文本，然后发送最终文本。

当 `streaming` 为 `partial` 时（默认：`true`），`channels.slack.nativeStreaming` 控制 Slack 的原生流式 API（`chat.startStream` / `chat.appendStream` / `chat.stopStream`）。

禁用原生 Slack 流式传输（保留草稿预览行为）：

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

旧版键：

- `channels.slack.streamMode`（`replace | status_final | append`）会自动迁移到 `channels.slack.streaming`。
- 布尔值 `channels.slack.streaming` 会自动迁移到 `channels.slack.nativeStreaming`。

### 要求

1. 在您的 Slack 应用设置中启用 **Agents and AI Apps**。
2. 确保应用具有 `assistant:write` 范围（scope）。
3. 该消息必须有可用的回复线程。线程选择仍遵循 `replyToMode`。

### 行为

- 第一个文本块启动流（`chat.startStream`）。
- 随后的文本块追加到同一条流（`chat.appendStream`）。
- 回复结束时完成流（`chat.stopStream`）。
- 媒体和非文本负载回退到正常传送。
- 如果在回复中途流式传输失败，OpenClaw 将对剩余的负载回退到正常传送。

## 配置参考指针

主要参考：

- [配置参考 - Slack](/zh/en/gateway/configuration-reference#slack)

  高重要性的 Slack 字段：
  - 模式/认证：`mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - 直连（DM）访问：`dm.enabled`, `dmPolicy`, `allowFrom`（旧版：`dm.policy`, `dm.allowFrom`），`dm.groupEnabled`, `dm.groupChannels`
  - 兼容性切换：`dangerouslyAllowNameMatching`（紧急备用；除非需要否则保持关闭）
  - 频道访问：`groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - 线程/历史：`replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - 交付：`textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - 运维/功能：`configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## 相关内容

- [配对](/zh/en/channels/pairing)
- [频道路由](/zh/en/channels/channel-routing)
- [故障排除](/zh/en/channels/troubleshooting)
- [配置](/zh/en/gateway/configuration)
- [斜杠命令](/zh/en/tools/slash-commands)

import zh from '/components/footer/zh.mdx';

<zh />
