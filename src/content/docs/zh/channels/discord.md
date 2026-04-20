---
summary: "Discord 机器人支持状态、功能和配置"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

状态：已准备好通过官方 Discord Gateway 网关支持私信和频道。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    Discord 私信默认为配对模式。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/en/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨渠道诊断和修复流程。
  </Card>
</CardGroup>

## 快速设置

您需要创建一个带有 bot 的新应用程序，将 bot 添加到您的服务器，并将其与 OpenClaw 配对。我们建议将您的 bot 添加到您自己的私人服务器。如果您还没有服务器，请[先创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="创建 Discord 应用程序和 bot">
    前往 [Discord Developer Portal](https://discord.com/developers/applications) 并点击 **New Application**。将其命名为类似 "OpenClaw" 的名称。

    点击侧边栏上的 **Bot**。将 **Username** 设置为您对 OpenClaw 代理的称呼。

  </Step>

  <Step title="Enable privileged intents">
    仍在 **Bot** 页面上，向下滚动到 **Privileged Gateway(网关) Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色白名单和名称到 ID 匹配所需）
    - **Presence Intent**（可选；仅状态更新需要）

  </Step>

  <Step title="Copy your bot token">
    在 **Bot** 页面上向上滚动并点击 **Reset Token**。

    <Note>
    尽管名称如此，但这会生成您的第一个令牌 —— 并未“重置”任何内容。
    </Note>

    复制该令牌并将其保存在某处。这是您的 **Bot Token**，稍后您将需要它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    点击侧边栏上的 **OAuth2**。您将生成一个具有正确权限的邀请 URL，以便将机器人添加到您的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方将出现 **Bot Permissions** 部分。启用：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions（可选）

    复制底部的生成 URL，将其粘贴到浏览器中，选择您的服务器，然后点击 **Continue** 进行连接。您现在应该可以在 Discord 服务器中看到您的机器人了。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 应用程序，你需要启用开发者模式以便复制内部 ID。

    1. 点击 **User Settings**（头像旁边的齿轮图标）→ **Advanced** → 打开 **Developer Mode**
    2. 右键点击侧边栏中的 **server icon** → **Copy Server ID**
    3. 右键点击 **own avatar** → **Copy User ID**

    将你的 **Server ID** 和 **User ID** 与 Bot Token 一起保存 — 你将在下一步中将这三者发送给 OpenClaw。

  </Step>

  <Step title="Allow 私信 from server members">
    为了使配对能够工作，Discord 需要允许您的机器人向您发送私信。右键点击您的 **服务器图标** → **隐私设置** → 开启 **私信** 开关。

    这允许服务器成员（包括机器人）向您发送私信。如果您想在 Discord 中使用 Discord 私信，请保持此设置启用。如果您仅计划使用服务器频道，则可以在配对后禁用私信。

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    您的 Discord 机器人令牌是一个秘密（就像密码一样）。在向您的代理发送消息之前，请在运行 OpenClaw 的机器上设置它。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已经作为后台服务运行，请通过 OpenClaw Mac 应用程序重启它，或者通过停止并重新启动 `openclaw gateway run` 进程来重启。

  </Step>

  <Step title="配置 OpenClaw 并配对">

    <Tabs>
      <Tab title="询问您的代理">
        在任何现有渠道（例如 OpenClaw）上与您的 Telegram 代理聊天并告知它。如果 Discord 是您的第一个渠道，请改用 CLI / config 选项卡。

        > "我已经在配置中设置了我的 Discord bot 令牌。请使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 设置。"
      </Tab>
      <Tab title="CLI / config">
        如果您更喜欢基于文件的配置，请设置：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: {
        source: "env",
        provider: "default",
        id: "DISCORD_BOT_TOKEN",
      },
    },
  },
}
```

        默认账户的环境变量回退：

```bash
DISCORD_BOT_TOKEN=...
```

        支持纯文本 `token` 值。在 env/file/exec 提供程序中也支持 SecretRef 值，用于 `channels.discord.token`。请参阅 [Secrets Management](/en/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approve first 私信 pairing">
    等待网关运行，然后在 Discord 中给你的机器人发私信。它会回复一个配对代码。

    <Tabs>
      <Tab title="Ask your agent">
        将配对代码发送给你现有渠道上的代理：

        > “批准此 Discord 配对代码：`<CODE>`”
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对代码会在 1 小时后过期。

    现在你应该可以通过私信在 Discord 中与你的代理聊天了。

  </Step>
</Steps>

<Note>令牌解析是感知账户的。配置令牌值优先于环境回退。`DISCORD_BOT_TOKEN` 仅用于默认账户。 对于高级出站调用（消息工具/渠道操作），该调用将使用显式的每次调用 `token`。这适用于发送和读取/探测类操作（例如读取/搜索/获取/线程/置顶/权限）。账户策略/重试设置仍来自活动运行时快照中选定的账户。</Note>

## 推荐：设置 guild 工作区

一旦私信开始工作，你就可以将你的 Discord 服务器设置为完整的工作区，其中每个渠道都有自己的 agent 会话和上下文。建议对于只有你和你的机器人的私有服务器使用此设置。

<Steps>
  <Step title="将您的服务器添加到公会允许列表">
    这将启用您的代理在服务器上的任何渠道中进行响应，而不仅仅是私信。

    <Tabs>
      <Tab title="询问您的代理">
        > “将我的 Discord 服务器 ID `<server_id>` 添加到公会允许列表”
      </Tab>
      <Tab title="配置">

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="允许在未 @提及的情况下响应">
    默认情况下，您的代理仅在服务器频道中被 @提及 时才会响应。对于私人服务器，您可能希望它响应每条消息。

    <Tabs>
      <Tab title="询问您的代理">
        > “允许我的代理在此服务器上响应而无需 @提及”
      </Tab>
      <Tab title="配置">
        在您的服务器配置中设置 `requireMention: false`：

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="在公会频道中规划记忆">
    默认情况下，长期记忆 (MEMORY.md) 仅在私信会话中加载。公会频道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="询问你的代理">
        > “当我在 Discord 频道中提问时，如果你需要来自 MEMORY.md 的长期上下文，请使用 memory_search 或 memory_get。”
      </Tab>
      <Tab title="手动">
        如果你需要在每个频道中共享上下文，请将稳定的指令放在 `AGENTS.md` 或 `USER.md` 中（它们会为每个会话注入）。将长期笔记保存在 `MEMORY.md` 中，并使用记忆工具按需访问。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在在您的 Discord 服务器上创建一些渠道并开始聊天。您的智能体可以看到渠道名称，并且每个渠道都有自己独立的会话——因此您可以设置 `#coding`、`#home`、`#research`，或任何适合您工作流程的设置。

## 运行时模型

- Gateway(网关) 网关拥有 Discord 连接。
- 回复路由是确定性的：Discord 的入站消息会回复到 Discord。
- 默认情况下（`session.dmScope=main`），直接聊天共享智能体主会话（`agent:main:main`）。
- 公会渠道是隔离的会话密钥（`agent:<agentId>:discord:channel:<channelId>`）。
- 默认情况下会忽略群组私信（`channels.discord.dm.groupEnabled=false`）。
- 原生斜杠命令在隔离的命令会话（`agent:<agentId>:discord:slash:<userId>`）中运行，同时仍将 `CommandTargetSessionKey` 传递到路由的对话会话。

## 论坛频道

Discord 论坛和媒体频道只接受帖子。OpenClaw 支持两种创建方式：

- 向论坛父频道（`channel:<forumId>`）发送消息以自动创建主题串。主题串标题使用您消息的第一个非空行。
- 使用 `openclaw message thread create` 直接创建主题串。对于论坛频道，请勿传递 `--message-id`。

示例：发送到论坛父频道以创建帖子

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

示例：显式创建论坛帖子

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

论坛父频道不接受 Discord 组件。如果您需要组件，请直接发送到主题串（`channel:<threadId>`）。

## 交互式组件

OpenClaw 支持针对代理消息的 Discord 组件 v2 容器。使用带有 `components` 载荷的消息工具。交互结果将作为普通入站消息路由回代理，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮或单个选择菜单
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件是一次性的。设置 `components.reusable=true` 以允许按钮、选择器和表单在过期前多次使用。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户将收到临时拒绝消息。

`/model` 和 `/models` 斜杠命令会打开一个交互式模型选择器，其中包含提供商和模型下拉菜单以及一个提交步骤。选择器的回复是临时的，只有调用的用户可以使用它。

文件附件：

- `file` 块必须指向附件引用 (`attachment://<filename>`)
- 通过 `media`/`path`/`filePath` 提供附件（单个文件）；对于多个文件，请使用 `media-gallery`
- 当上传名称应与附件引用匹配时，请使用 `filename` 覆盖上传名称

模态表单：

- 添加 `components.modal`，最多包含 5 个字段
- 字段类型：`text`、`checkbox`、`radio`、`select`、`role-select`、`user-select`
- OpenClaw 会自动添加一个触发按钮

示例：

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## 访问控制和路由

<Tabs>
  <Tab title="私信 policy">
    `channels.discord.dmPolicy` 控制私信访问（旧版：`channels.discord.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`；旧版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果私信策略未开放，未知用户将被阻止（或在 `pairing` 模式下被提示进行配对）。

    多账户优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 当自己的 `allowFrom` 未设置时，命名账户继承 `channels.discord.allowFrom`。
    - 命名账户不继承 `channels.discord.accounts.default.allowFrom`。

    用于投递的私信目标格式：

    - `user:<id>`
    - `<@id>` 提及

    除非提供明确的用户/渠道目标类型，否则纯数字 ID 是有歧义的，将被拒绝。

  </Tab>

  <Tab title="Guild policy">
    公会处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当存在 `channels.discord` 时，安全基线是 `allowlist`。

    `allowlist` 行为：

    - 公会必须匹配 `channels.discord.guilds`（首选 `id`，接受 slug）
    - 可选的发送者白名单：`users`（推荐使用稳定 ID）和 `roles`（仅角色 ID）；如果配置了其中任何一个，则当发送者匹配 `users` 或 `roles` 时，即被允许
    - 默认情况下禁用直接名称/标签匹配；仅将 `channels.discord.dangerouslyAllowNameMatching: true` 作为紧急兼容模式启用
    - `users` 支持名称/标签，但 ID 更安全；当使用名称/标签条目时，`openclaw security audit` 会发出警告
    - 如果公会配置了 `channels`，则拒绝未列出的频道
    - 如果公会没有 `channels` 块，则允许该白名单公会中的所有频道

    示例：

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          ignoreOtherMentions: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    如果您仅设置了 `DISCORD_BOT_TOKEN` 且未创建 `channels.discord` 块，则运行时回退为 `groupPolicy="allowlist"`（日志中有警告），即使 `channels.defaults.groupPolicy` 为 `open`。

  </Tab>

  <Tab title="提及和群组私信">
    服务器消息默认受到提及限制。

    提及检测包括：

    - 显式提及机器人
    - 配置的提及模式 (`agents.list[].groupChat.mentionPatterns`, 备用 `messages.groupChat.mentionPatterns`)
    - 支持情况下的隐式回复机器人行为

    `requireMention` 是按服务器/渠道 (`channels.discord.guilds...`) 配置的。
    `ignoreOtherMentions` 可选择丢弃提及其他用户/角色但不提及机器人的消息（不包括 @everyone/@here）。

    群组私信：

    - 默认：忽略 (`dm.groupEnabled=false`)
    - 通过 `dm.groupChannels` 进行可选的允许列表设置（渠道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的代理路由

使用 `bindings[].match.roles` 根据角色 ID 将 Discord 服务器成员路由到不同的代理。基于角色的绑定仅接受角色 ID，并在对等或父对等绑定之后、仅服务器绑定之前进行评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有配置的字段都必须匹配。

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

## 开发者门户设置

<AccordionGroup>
  <Accordion title="创建应用和机器人">

    1. Discord 开发者门户 -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. 复制机器人令牌

  </Accordion>

  <Accordion title="特权意图">
    在 **Bot -> Privileged Gateway(网关) Intents** 中，启用：

    - Message Content Intent
    - Server Members Intent（推荐）

    Presence intent 是可选的，仅当您希望接收在线状态更新时才需要。设置机器人在线状态（`setPresence`）不需要为成员启用在线状态更新。

  </Accordion>

  <Accordion title="OAuth 作用域和基准权限">
    OAuth URL 生成器：

    - scopes: `bot`, `applications.commands`

    典型的基准权限：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions（可选）

    除非明确需要，否则避免使用 `Administrator`。

  </Accordion>

  <Accordion title="Copy IDs">
    启用 Discord 开发者模式，然后复制：

    - 服务器 ID
    - 频道 ID
    - 用户 ID

    在 OpenClaw 配置中首选数字 ID，以便进行可靠的审核和探测。

  </Accordion>
</AccordionGroup>

## 原生命令和命令身份验证

- `commands.native` 默认为 `"auto"` 并且已针对 Discord 启用。
- 每个频道的覆盖设置：`channels.discord.commands.native`。
- `commands.native=false` 会明确清除先前注册的 Discord 原生命令。
- 原生命令身份验证使用与普通消息处理相同的 Discord 允许列表/策略。
- 对于未获授权的用户，命令在 Discord UI 中可能仍然可见；执行时仍会强制执行 OpenClaw 身份验证并返回“未授权”。

有关命令目录和行为，请参阅 [Slash commands](/en/tools/slash-commands)。

默认斜杠命令设置：

- `ephemeral: true`

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持在代理输出中使用回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`
    - `batched`

    注意：`off` 会禁用隐式回复串接。显式的 `[[reply_to_*]]` 标签仍然有效。
    `first` 始终将隐式原生回复引用附加到该轮次的第一个出站 Discord 消息。
    `batched` 仅在入站轮次是多个消息的去抖动批量时，才附加 Discord 的隐式原生回复引用。这主要适用于希望原生回复仅用于模糊的突发聊天，而非每条单消息轮次的情况。

    消息 ID 会显示在上下文/历史记录中，以便代理能够定位特定消息。

  </Accordion>

  <Accordion title="实时流预览">
    OpenClaw 可以通过发送临时消息并在文本到达时进行编辑来流式传输草稿回复。

    - `channels.discord.streaming` 控制预览流式传输（`off` | `partial` | `block` | `progress`，默认值：`off`）。
    - 默认值保持为 `off`，因为 Discord 预览编辑可能会很快触及速率限制，尤其是当多个机器人或网关共享同一账户或服务器流量时。
    - `progress` 为了跨渠道一致性而被接受，并且映射到 Discord 上的 `partial`。
    - `channels.discord.streamMode` 是一个传统别名，会自动迁移。
    - `partial` 随着令牌的到来编辑单个预览消息。
    - `block` 发送草稿大小的块（使用 `draftChunk` 调整大小和断点）。

    示例：

```json5
{
  channels: {
    discord: {
      streaming: "partial",
    },
  },
}
```

    `block` 模式分块默认值（限制为 `channels.discord.textChunkLimit`）：

```json5
{
  channels: {
    discord: {
      streaming: "block",
      draftChunk: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
      },
    },
  },
}
```

    预览流式传输仅限文本；媒体回复回退到正常投递。

    注意：预览流式传输与 Discord 是分开的。当为 OpenClaw 明确启用 OpenClaw 时，OpenClaw 会跳过预览流以避免双重流式传输。

  </Accordion>

  <Accordion title="历史记录、上下文和线程行为">
    服务器历史记录上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    私信历史记录控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    线程行为：

    - Discord 线程作为渠道会话进行路由
    - 父线程元数据可用于父会话链接
    - 线程配置继承父渠道配置，除非存在特定于线程的条目

    渠道主题作为**不受信任的**上下文注入（而非作为系统提示）。
    回复和引用消息上下文当前保持原样。
    Discord 白名单主要限制谁可以触发代理，而不是完整的补充上下文编辑边界。

  </Accordion>

  <Accordion title="Thread-bound sessions for subagents">
    Discord 可以将线程绑定到会话目标，以便该线程中的后续消息继续路由到同一会话（包括子代理会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子代理/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活跃运行和绑定状态
    - `/session idle <duration|off>` 检查/更新聚焦绑定的非活动自动取消聚焦
    - `/session max-age <duration|off>` 检查/更新聚焦绑定的硬最大使用时长

    配置：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSubagentSessions: false, // opt-in
      },
    },
  },
}
```

    注意事项：

    - `session.threadBindings.*` 设置全局默认值。
    - `channels.discord.threadBindings.*` 覆盖 Discord 行为。
    - `spawnSubagentSessions` 必须为 true 才能为 `sessions_spawn({ thread: true })` 自动创建/绑定线程。
    - `spawnAcpSessions` 必须为 true 才能为 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自动创建/绑定线程。
    - 如果某个帐户禁用了线程绑定，`/focus` 和相关线程绑定操作将不可用。

    参见 [Sub-agents](/en/tools/subagents)、[ACP Agents](/en/tools/acp-agents) 和 [Configuration Reference](/en/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP 渠道 bindings">
    对于稳定的“常开”ACP 工作区，请配置针对 Discord 会话的顶级类型化 ACP 绑定。

    配置路径：

    - `bindings[]`，其中包含 `type: "acp"` 和 `match.channel: "discord"`

    示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": {
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

    注意事项：

    - `/acp spawn codex --bind here` 会将当前的 Discord 渠道或线程就地绑定，并将未来的消息路由到同一个 ACP 会话。
    - 这仍然可能意味着“启动一个新的 Codex ACP 会话”，但它本身不会创建新的 Discord 线程。现有渠道保持为聊天界面。
    - Codex 可能仍在磁盘上自己的 `cwd` 或后端工作区中运行。该工作区是运行时状态，而不是 Discord 线程。
    - 线程消息可以继承父渠道的 ACP 绑定。
    - 在绑定的渠道或线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。
    - 临时线程绑定仍然有效，并在活动期间可以覆盖目标解析。
    - 仅当 OpenClaw 需要通过 `--thread auto|here` 创建/绑定子线程时，才需要 `spawnAcpSessions`。对于当前渠道中的 `/acp spawn ... --bind here` 则不需要。

    有关绑定行为的详细信息，请参阅 [ACP Agents](/en/tools/acp-agents)。

  </Accordion>

  <Accordion title="Reaction notifications">
    每个服务器的反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件会被转换为系统事件，并附加到路由后的Discord会话中。

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` 在 OpenClaw 处理入站消息时会发送一个确认表情符号。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - agent 身份表情符号回退 (`agents.list[].identity.emoji`，否则为 "👀")

    注意事项：

    - Discord 接受 Unicode 表情符号或自定义表情符号名称。
    - 使用 `""` 来禁用某个渠道或帐户的反应。

  </Accordion>

  <Accordion title="Config writes">
    渠道发起的配置写入默认已启用。

    这会影响 `/config set|unset` 流程（当启用命令功能时）。

    禁用方式：

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Gateway(网关) proxy">
    使用 `channels.discord.proxy` 通过 HTTP(S) 代理路由 Discord Gateway(网关) WebSocket 流量和启动 REST 查询（应用程序 ID + 允许列表解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每个帐户的覆盖设置：

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="PluralKit support">
    启用 PluralKit 解析以将代理消息映射到系统成员身份：

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // optional; needed for private systems
      },
    },
  },
}
```

    注意事项：

    - 允许列表可以使用 `pk:<memberId>`
    - 仅当 `channels.discord.dangerouslyAllowNameMatching: true` 时，才会按名称/slug 匹配成员显示名称
    - 查询使用原始消息 ID 并受时间窗口限制
    - 如果查询失败，代理消息将被视为机器人消息并被丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Presence configuration">
    当您设置状态或活动字段，或者启用自动状态时，Presence 更新将会生效。

    仅状态示例：

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    活动示例（自定义状态是默认的活动类型）：

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    直播示例：

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    活动类型映射：

    - 0: 正在游戏
    - 1: 正在直播 (requires `activityUrl`)
    - 2: 正在听
    - 3: 正在看
    - 4: 自定义 (将活动文本用作状态；表情符号可选)
    - 5: 正在竞赛

    自动状态示例（运行时健康信号）：

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
        exhaustedText: "token exhausted",
      },
    },
  },
}
```

    自动状态将运行时可用性映射到 Discord 状态：healthy => online，degraded 或 unknown => idle，exhausted 或 unavailable => dnd。可选的文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (supports `{reason}` placeholder)

  </Accordion>

  <Accordion title="Discord 中的审批">
    Discord 支持在私信中基于按钮的审批处理，并可选择在原始渠道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可选；尽可能回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，默认值：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    当 `enabled` 未设置或为 `"auto"`，并且可以解析出至少一个审批人（从 `execApprovals.approvers` 或 `commands.ownerAllowFrom`）时，Discord 会自动启用原生执行审批。Discord 不会从渠道 `allowFrom`、旧版 `dm.allowFrom` 或私信 `defaultTo` 推断执行审批人。设置 `enabled: false` 可显式禁用 Discord 作为原生审批客户端。

    当 `target` 为 `channel` 或 `both` 时，审批提示在渠道中可见。只有已解析的审批人可以使用这些按钮；其他用户会收到临时拒绝消息。审批提示包含命令文本，因此请仅在受信任的渠道中启用渠道传递。如果无法从会话密钥派生渠道 ID，OpenClaw 将回退到私信传递。

    Discord 还会渲染其他聊天渠道使用的共享审批按钮。Discord 原生适配器主要增加了审批人私信路由和渠道分发。
    当这些按钮存在时，它们是主要的审批用户体验；仅当工具结果表示
    聊天审批不可用或手动审批是唯一路径时，OpenClaw
    才应包含手动 `/approve` 命令。

    此处理程序使用的 Gateway(网关) 身份验证与其他 Gateway(网关) 客户端使用相同的共享凭证解析协议：

    - 环境优先的本地身份验证（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然后 `gateway.auth.*`）
    - 在本地模式下，仅在 `gateway.auth.*` 未设置时，`gateway.remote.*` 才能用作回退；已配置但未解析的本地 SecretRefs 将失败关闭
    - 通过 `gateway.remote.*` 进行远程模式支持（如适用）
    - URL 覆盖是覆盖安全的：CLI 覆盖不重用隐式凭证，环境覆盖仅使用环境凭证

    审批解析行为：

    - 带有 `plugin:` 前缀的 ID 通过 `plugin.approval.resolve` 解析。
    - 其他 ID 通过 `exec.approval.resolve` 解析。
    - Discord 在此处不执行额外的执行到插件回退跳转；ID
      前缀决定它调用哪个 Gateway(网关) 方法。

    执行审批默认在 30 分钟后过期。如果审批失败并显示
    未知的审批 ID，请验证审批人解析、功能启用，
    以及传递的审批 ID 类型是否与待处理请求匹配。

    相关文档：[执行审批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和操作门控

Discord 消息操作包括消息传递、渠道管理、审核、在线状态和元数据操作。

核心示例：

- 消息传递：`sendMessage`，`readMessages`，`editMessage`，`deleteMessage`，`threadReply`
- 反应：`react`，`reactions`，`emojiList`
- 管理：`timeout`，`kick`，`ban`
- 状态：`setPresence`

`event-create` 操作接受一个可选的 `image` 参数（URL 或本地文件路径）来设置预定活动的封面图片。

操作网关位于 `channels.discord.actions.*` 下。

默认网关行为：

| 操作组                                                                                                                                                                   | 默认   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已启用 |
| roles                                                                                                                                                                    | 已禁用 |
| moderation                                                                                                                                                               | 已禁用 |
| presence                                                                                                                                                                 | 已禁用 |

## 组件 v2 UI

OpenClaw 使用 Discord 组件 v2 进行执行审批和跨上下文标记。Discord 消息操作也可以接受 `components` 用于自定义 UI（高级；需要通过 discord 工具构造组件有效负载），而旧版 `embeds` 仍然可用但不推荐使用。

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器使用的强调色（十六进制）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 为每个账户设置。
- 当存在组件 v2 时，`embeds` 会被忽略。

示例：

```json5
{
  channels: {
    discord: {
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
    },
  },
}
```

## 语音频道

OpenClaw 可以加入 Discord 语音频道进行实时、连续的对话。这与语音消息附件是分开的。

要求：

- 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
- 配置 `channels.discord.voice`。
- 机器人需要在目标语音频道中拥有 Connect + Speak 权限。

使用 Discord 专用的原生命令 `/vc join|leave|status` 来控制会话。该命令使用账户默认代理，并遵循与其他 Discord 命令相同的允许列表和组策略规则。

自动加入示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

注意：

- `voice.tts` 仅针对语音播放覆盖 `messages.tts`。
- 语音转录轮次从 Discord `allowFrom`（或 `dm.allowFrom`）派生所有者状态；非所有者发言者无法访问仅限所有者的工具（例如 `gateway` 和 `cron`）。
- 语音默认已启用；设置 `channels.discord.voice.enabled=false` 可将其禁用。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 传递给 `@discordjs/voice` 加入选项。
- 如果未设置，`@discordjs/voice` 默认为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 还会监听接收解密失败，并在短时间内多次失败后通过离开并重新加入语音渠道来自动恢复。
- 如果接收日志反复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，这可能是 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 中跟踪的上游 `@discordjs/voice` 接收错误。

## 语音消息

Discord 语音消息显示波形预览，并且需要 OGG/Opus 音频加上元数据。OpenClaw 会自动生成波形，但它需要网关主机上可用 `ffmpeg` 和 `ffprobe` 来检查和转换音频文件。

要求和限制：

- 提供**本地文件路径**（拒绝 URL）。
- 省略文本内容（Discord 不允许在同一负载中包含文本 + 语音消息）。
- 接受任何音频格式；OpenClaw 会在需要时转换为 OGG/Opus。

示例：

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排除

<AccordionGroup>
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - 启用消息内容意图 (Message Content Intent)
    - 当您依赖用户/成员解析时，启用服务器成员意图 (Server Members Intent)
    - 更改意图后重启网关

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的 guild 允许列表
    - 如果存在 guild `channels` 映射，则仅允许列出的渠道
    - 验证 `requireMention` 行为和提及模式

    有用的检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention false but still blocked">
    常见原因：

    - `groupPolicy="allowlist"` 没有匹配的服务器/渠道白名单
    - `requireMention` 配置位置错误（必须在 `channels.discord.guilds` 或渠道条目下）
    - 发送者被服务器/渠道 `users` 白名单阻止

  </Accordion>

  <Accordion title="Long-running handlers time out or duplicate replies">

    典型日志：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    监听器预算调节：

    - 单账户：`channels.discord.eventQueue.listenerTimeout`
    - 多账户：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 运行超时调节：

    - 单账户：`channels.discord.inboundWorker.runTimeoutMs`
    - 多账户：`channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 默认值：`1800000` (30 分钟)；设置 `0` 以禁用

    推荐基线：

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
          inboundWorker: {
            runTimeoutMs: 1800000,
          },
        },
      },
    },
  },
}
```

    对于慢速监听器设置使用 `eventQueue.listenerTimeout`，仅当您希望为排队的代理轮次设置单独的安全阀时才使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` 权限检查仅对数字频道 ID 有效。

    如果您使用 slug 键，运行时匹配仍然可以工作，但 probe 无法完全验证权限。

  </Accordion>

  <Accordion title="私信 and pairing issues">

    - 私信已禁用：`channels.discord.dm.enabled=false`
    - 私信策略已禁用：`channels.discord.dmPolicy="disabled"` (旧版：`channels.discord.dm.policy`)
    - 正在 `pairing` 模式下等待配对批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    默认情况下，忽略由机器人撰写的消息。

    如果您设置了 `channels.discord.allowBots=true`，请使用严格的提及和白名单规则以避免循环行为。
    优先使用 `channels.discord.allowBots="mentions"` 以仅接受提及该机器人的机器人消息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 为最新版本 (`openclaw update`)，以确保存在 Discord 语音接收恢复逻辑
    - 确认 `channels.discord.voice.daveEncryption=true`（默认）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认值）开始，仅在必要时进行调整
    - 观察日志中的以下内容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自动重新加入后故障仍然存在，请收集日志并与 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 进行对比

  </Accordion>
</AccordionGroup>

## 配置参考指针

主要参考：

- [配置参考 - Discord](/en/gateway/configuration-reference#discord)

高优先级 Discord 字段：

- 启动/认证：`enabled`、`token`、`accounts.*`、`allowBots`
- 策略：`groupPolicy`、`dm.*`、`guilds.*`、`guilds.*.channels.*`
- 命令：`commands.native`、`commands.useAccessGroups`、`configWrites`、`slashCommand.*`
- 事件队列：`eventQueue.listenerTimeout`（监听器预算）、`eventQueue.maxQueueSize`、`eventQueue.maxConcurrency`
- 入站工作线程：`inboundWorker.runTimeoutMs`
- 回复/历史：`replyToMode`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 传递：`textChunkLimit`、`chunkMode`、`maxLinesPerMessage`
- 流式传输：`streaming`（旧别名：`streamMode`）、`draftChunk`、`blockStreaming`、`blockStreamingCoalesce`
- 媒体/重试：`mediaMaxMb`、`retry`
  - `mediaMaxMb` 限制出站 Discord 上传（默认：`100MB`）
- 操作：`actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, 顶级 `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## 安全与运维

- 将 bot 令牌视为机密（在受监管环境中首选 `DISCORD_BOT_TOKEN`）。
- 授予 Discord 最小权限。
- 如果命令部署/状态过时，请重启网关并使用 `openclaw channels status --probe` 重新检查。

## 相关

- [配对](/en/channels/pairing)
- [组](/en/channels/groups)
- [通道路由](/en/channels/channel-routing)
- [安全性](/en/gateway/security)
- [多代理路由](/en/concepts/multi-agent)
- [故障排除](/en/channels/troubleshooting)
- [斜杠命令](/en/tools/slash-commands)
