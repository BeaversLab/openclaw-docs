---
summary: "Discord 机器人支持状态、功能和配置"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

状态：已准备好通过官方 Discord 网关处理私信和频道消息。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/en/channels/pairing">
    Discord 私信默认采用配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/zh/en/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="频道故障排除" icon="wrench" href="/zh/en/channels/troubleshooting">
    跨频道诊断和修复流程。
  </Card>
</CardGroup>

## 快速设置

您需要创建一个带有机器人的新应用程序，将机器人添加到您的服务器，并将其与 OpenClaw 配对。我们建议将您的机器人添加到您自己的私人服务器中。如果您还没有私人服务器，请[先创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="创建 Discord 应用程序和机器人">
    前往 [Discord 开发者门户](https://discord.com/developers/applications) 并点击 **New Application**。将其命名为类似“OpenClaw”的名字。

    点击侧边栏上的 **Bot**。将 **Username** 设置为您称呼 OpenClaw 智能体的名称。

  </Step>

  <Step title="启用特权意图">
    仍在 **Bot** 页面上，向下滚动到 **Privileged Gateway Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；基于角色的允许列表和名称到 ID 匹配所必需）
    - **Presence Intent**（可选；仅在需要状态更新时需要）

  </Step>

  <Step title="复制您的机器人令牌">
    在 **Bot** 页面上向上滚动并点击 **Reset Token**。

    <Note>
    顾名思义，这会生成您的第一个令牌 —— 并没有发生任何“重置”。
    </Note>

    复制令牌并将其保存在某处。这就是您的 **Bot Token**，稍后您将需要它。

  </Step>

  <Step title="生成邀请 URL 并将机器人添加到您的服务器">
    点击侧边栏上的 **OAuth2**。您将生成一个具有正确权限的邀请 URL，以便将机器人添加到您的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方将出现一个 **Bot Permissions** 部分。启用：

    - 查看频道
    - 发送消息
    - 阅读消息历史
    - 嵌入链接
    - 附加文件
    - 添加表情符号 (可选)

    复制底部生成的 URL，将其粘贴到浏览器中，选择您的服务器，然后点击 **Continue**（继续）进行连接。您现在应该在 Discord 服务器中看到您的机器人。

  </Step>

  <Step title="启用开发者模式并收集您的 ID">
    回到 Discord 应用程序，您需要启用开发者模式，以便复制内部 ID。

    1. 点击 **User Settings**（用户设置，即头像旁边的齿轮图标）→ **Advanced**（高级）→ 打开 **Developer Mode**（开发者模式）
    2. 右键点击侧边栏中的 **server icon**（服务器图标）→ **Copy Server ID**（复制服务器 ID）
    3. 右键点击您 **own avatar**（自己的头像）→ **Copy User ID**（复制用户 ID）

    将您的 **Server ID**（服务器 ID）和 **User ID**（用户 ID）与您的 Bot Token（机器人令牌）一起保存 — 您将在下一步中将这三者都发送给 OpenClaw。

  </Step>

  <Step title="允许服务器成员发送私信">
    为了使配对工作，Discord 需要允许您的机器人向您发送私信。右键点击您的 **server icon**（服务器图标）→ **Privacy Settings**（隐私设置）→ 打开 **Direct Messages**（直接消息）。

    这允许服务器成员（包括机器人）向您发送私信。如果您想通过 OpenClaw 使用 Discord 私信，请保持此功能启用。如果您仅计划使用频道，可以在配对后禁用私信。

  </Step>

  <Step title="步骤 0：安全设置您的机器人令牌（不要在聊天中发送它）">
    您的 Discord 机器人令牌是一个秘密（就像密码一样）。在向您的代理发送消息之前，请在运行 OpenClaw 的机器上设置它。

```bash
openclaw config set channels.discord.token '"YOUR_BOT_TOKEN"' --json
openclaw config set channels.discord.enabled true --json
openclaw gateway
```

    如果 OpenClaw 已经作为后台服务运行，请改用 `openclaw gateway restart`。

  </Step>

  <Step title="配置 OpenClaw 并配对">

    <Tabs>
      <Tab title="询问您的代理">
        在任何现有频道（例如 Telegram）上与您的 OpenClaw 代理聊天并告知它。如果 Discord 是您的第一个频道，请改用 CLI / config 选项卡。

        > "我已在配置中设置了我的 Discord 机器人令牌。请使用用户 ID `<user_id>` 和服务器 ID `<server_id>` 完成 Discord 设置。"
      </Tab>
      <Tab title="CLI / config">
        如果您更喜欢基于文件的配置，请设置：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN",
    },
  },
}
```

        默认账户的环境变量回退：

```bash
DISCORD_BOT_TOKEN=...
```

        `channels.discord.token` 也支持 SecretRef 值（env/file/exec 提供程序）。请参阅[机密管理](/zh/en/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="批准首次 DM 配对">
    等到网关运行，然后在 Discord 中私信您的机器人。它将回复一个配对代码。

    <Tabs>
      <Tab title="询问您的代理">
        将配对代码发送给您现有频道上的代理：

        > "批准此 Discord 配对代码： `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对代码会在 1 小时后过期。

    您现在应该能够通过 Discord 的 DM 与您的代理聊天。

  </Step>
</Steps>

<Note>
令牌解析是识别账户的。配置令牌值优先于环境变量回退。`DISCORD_BOT_TOKEN` 仅用于默认账户。
对于高级出站调用（消息工具/频道操作），该调用将使用显式的每次调用 `token`。账户策略/重试设置仍来自活动运行时快照中选定的账户。
</Note>

## 推荐：设置公会工作区

一旦 DM 开始工作，您就可以将您的 Discord 服务器设置为一个完整的工作区，其中每个频道都有自己的代理会话和自己的上下文。这对于只有您和您的机器人的私人服务器是推荐的。

<Steps>
  <Step title="将您的服务器添加到公会允许列表">
    这使您的代理能够在您服务器的任何频道中响应，而不仅仅是 DM。

    <Tabs>
      <Tab title="询问您的 Agent">
        > "将我的 Discord 服务器 ID `<server_id>` 添加到公会允许列表中"
      </Tab>
      <Tab title="Config">

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

  <Step title="允许不使用 @提及 进行回复">
    默认情况下，您的 Agent 仅在收到 @提及时才会在公会频道中回复。对于私人服务器，您可能希望它回复每条消息。

    <Tabs>
      <Tab title="询问您的 Agent">
        > "允许我的 Agent 在此服务器上回复而无需 @提及"
      </Tab>
      <Tab title="Config">
        在您的公会配置中设置 `requireMention: false`：

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

  <Step title="规划公会频道中的记忆">
    默认情况下，长期记忆 (MEMORY.md) 仅在 DM 会话中加载。公会频道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="询问您的 Agent">
        > "当我在 Discord 频道中提问时，如果您需要来自 MEMORY.md 的长期上下文，请使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手动操作">
        如果您在每个频道中都需要共享上下文，请将稳定的指令放在 `AGENTS.md` 或 `USER.md` 中（它们会在每次会话时注入）。将长期笔记保留在 `MEMORY.md` 中，并使用记忆工具按需访问。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在在您的 Discord 服务器上创建一些频道并开始聊天。您的 Agent 可以看到频道名称，并且每个频道都有自己的独立会话——因此您可以设置 `#coding`、`#home`、`#research` 或任何适合您工作流程的内容。

## 运行时模型

- Gateway 拥有 Discord 连接。
- 回复路由是确定性的：Discord 入站消息会回复到 Discord。
- 默认情况下 (`session.dmScope=main`)，直接聊天共享 Agent 主会话 (`agent:main:main`)。
- 公会频道是隔离的会话密钥 (`agent:<agentId>:discord:channel:<channelId>`)。
- 默认情况下忽略群组 DM (`channels.discord.dm.groupEnabled=false`)。
- 原生斜杠命令在隔离的命令会话 (`agent:<agentId>:discord:slash:<userId>`) 中运行，同时仍将 `CommandTargetSessionKey` 传递到路由到的对话会话。

## 论坛频道

Discord 论坛和媒体频道仅接受帖子。OpenClaw 支持两种创建方式：

- 向论坛父频道 (`channel:<forumId>`) 发送消息以自动创建帖子。帖子标题使用消息的第一个非空行。
- 使用 `openclaw message thread create` 直接创建帖子。对于论坛频道，不要传递 `--message-id`。

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

论坛父频道不接受 Discord 组件。如果需要组件，请发送到帖子本身 (`channel:<threadId>`)。

## 交互式组件

OpenClaw 支持用于代理消息的 Discord 组件 v2 容器。将消息工具与 `components` 有效负载一起使用。交互结果作为普通入站消息路由回代理，并遵循现有的 Discord `replyToMode` 设置。

支持的模块：

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- 操作行允许最多 5 个按钮或一个选择菜单
- 选择类型：`string`, `user`, `role`, `mentionable`, `channel`

默认情况下，组件是一次性的。设置 `components.reusable=true` 以允许按钮、选择和表单多次使用，直到它们过期。

要限制谁可以点击按钮，请在按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户将收到临时拒绝消息。

`/model` 和 `/models` 斜杠命令会打开一个交互式模型选择器，其中包含提供商和模型下拉菜单以及一个提交步骤。选择器回复是临时的，只有调用的用户可以使用它。

文件附件：

- `file` 模块必须指向附件引用 (`attachment://<filename>`)
- 通过 `media`/`path`/`filePath` 提供附件（单个文件）；多个文件使用 `media-gallery`
- 当上传名称应与附件引用匹配时，使用 `filename` 覆盖上传名称

模态表单：

- 添加最多包含 5 个字段的 `components.modal`
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
  <Tab title="DM 策略">
    `channels.discord.dmPolicy` 控制 DM 访问（旧版：`channels.discord.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`；旧版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果 DM 策略未开启，未知用户将被阻止（或在 `pairing` 模式下被提示配对）。

    多账户优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在其自己的 `allowFrom` 未设置时继承 `channels.discord.allowFrom`。
    - 命名账户不继承 `channels.discord.accounts.default.allowFrom`。

    用于投递的 DM 目标格式：

    - `user:<id>`
    - `<@id>` 提及

    纯数字 ID 具有歧义并被拒绝，除非提供了明确的用户/频道目标类型。

  </Tab>

  <Tab title="Guild 策略">
    Guild 处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当存在 `channels.discord` 时，安全基线是 `allowlist`。

    `allowlist` 行为：

    - guild 必须匹配 `channels.discord.guilds`（首选 `id`，也接受 slug）
    - 可选的发送方白名单：`users`（推荐使用稳定的 ID）和 `roles`（仅限角色 ID）；如果配置了其中任意一个，当发送方匹配 `users` 或 `roles` 时即被允许
    - 默认情况下禁用直接名称/标签匹配；请仅将 `channels.discord.dangerouslyAllowNameMatching: true` 作为紧急兼容模式启用
    - `users` 支持名称/标签，但 ID 更安全；使用名称/条目时 `openclaw security audit` 会发出警告
    - 如果 guild 配置了 `channels`，则拒绝未列出的频道
    - 如果 guild 没有 `channels` 块，则该白名单 guild 中的所有频道均被允许

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

    如果您仅设置了 `DISCORD_BOT_TOKEN` 而未创建 `channels.discord` 块，即使 `channels.defaults.groupPolicy` 为 `open`，运行时回退机制仍为 `groupPolicy="allowlist"`（并在日志中发出警告）。

  </Tab>

  <Tab title="提及和群组私信">
    Guild 消息默认受提及限制。

    提及检测包括：

    - 显式提及机器人
    - 配置的提及模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 受支持情况下的隐式回复机器人行为

    `requireMention` 是按 guild/频道配置的（`channels.discord.guilds...`）。
    `ignoreOtherMentions` 可选择丢弃提及了其他用户/角色但未提及机器人的消息（不包括 @everyone/@here）。

    群组私信：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 通过 `dm.groupChannels` 进行可选白名单设置（频道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的智能体路由

使用 `bindings[].match.roles` 根据 Discord guild 成员的角色 ID 将其路由到不同的智能体。基于角色的绑定仅接受角色 ID，在同级或父级同级绑定之后、仅 guild 绑定之前进行评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有配置的字段都必须匹配。

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
  <Accordion title="创建应用和 Bot">

    1. Discord 开发者门户 -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. 复制 bot token

  </Accordion>

  <Accordion title="特权 Intents">
    在 **Bot -> Privileged Gateway Intents** 中，启用：

    - Message Content Intent
    - Server Members Intent（推荐）

    Presence intent 是可选的，仅当您希望接收状态更新时才需要。设置 bot 状态 (`setPresence`) 不需要为成员启用状态更新。

  </Accordion>

  <Accordion title="OAuth 范围和基本权限">
    OAuth URL 生成器：

    - scopes: `bot`, `applications.commands`

    典型的基本权限：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions（可选）

    除非明确需要，否则请避免使用 `Administrator`。

  </Accordion>

  <Accordion title="复制 ID">
    启用 Discord 开发者模式，然后复制：

    - server ID
    - channel ID
    - user ID

    在 OpenClaw 配置中优先使用数字 ID，以实现可靠的审计和探测。

  </Accordion>
</AccordionGroup>

## 原生命令和命令身份验证

- `commands.native` 默认为 `"auto"` 并且已针对 Discord 启用。
- 按频道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 会显式清除之前注册的 Discord 原生命令。
- 原生命令身份验证使用与正常消息处理相同的 Discord 允许列表/策略。
- 对于未授权的用户，命令在 Discord UI 中仍然可见；执行时仍会强制执行 OpenClaw 身份验证并返回“未授权”。

有关命令目录和行为，请参阅 [Slash 命令](/zh/en/tools/slash-commands)。

默认斜杠命令设置：

- `ephemeral: true`

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持在代理输出中使用回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    受 `channels.discord.replyToMode` 控制：

    - `off` (默认)
    - `first`
    - `all`

    注意：`off` 会禁用隐式回复串接。显式的 `[[reply_to_*]]` 标签仍然有效。

    消息 ID 会显示在上下文/历史记录中，以便代理定位特定消息。

  </Accordion>

  <Accordion title="实时流预览">
    OpenClaw 可以通过发送临时消息并在文本到达时编辑它来流式传输草稿回复。

    - `channels.discord.streaming` 控制预览流式传输 (`off` | `partial` | `block` | `progress`, 默认: `off`)。
    - 接受 `progress` 以保持跨渠道一致性，并在 Discord上映射为 `partial`。
    - `channels.discord.streamMode` 是旧版别名，会自动迁移。
    - `partial` 会在 token 到达时编辑单个预览消息。
    - `block` 会发送草稿大小的块 (使用 `draftChunk` 调整大小和断点)。

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

    `block` 模式分块默认值 (限制为 `channels.discord.textChunkLimit`)：

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

    预览流式传输仅限文本；媒体回复回退到正常发送。

    注意：预览流式传输与块流式传输是分开的。当明确为 Discord 启用块流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

  </Accordion>

  <Accordion title="历史、上下文和串接行为">
    公会历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退: `messages.groupChat.historyLimit`
    - `0` 禁用

    DM 历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    串接行为：

    - Discord 串接作为频道会话被路由
    - 父串接元数据可用于父会话链接
    - 除非存在特定于串接的条目，否则串接配置继承父频道配置

    频道主题作为**不受信任的**上下文注入（而非作为系统提示词）。

  </Accordion>

  <Accordion title="面向子代理的线程绑定会话">
    Discord 可以将线程绑定到会话目标，以便该线程中的后续消息继续路由到同一会话（包括子代理会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子代理/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活跃运行和绑定状态
    - `/session idle <duration|off>` 检查/更新聚焦绑定的非活动自动取消聚焦
    - `/session max-age <duration|off>` 检查/更新聚焦绑定的硬性最大存活时间

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

    注意：

    - `session.threadBindings.*` 设置全局默认值。
    - `channels.discord.threadBindings.*` 覆盖 Discord 行为。
    - `spawnSubagentSessions` 必须为 true 才能为 `sessions_spawn({ thread: true })` 自动创建/绑定线程。
    - `spawnAcpSessions` 必须为 true 才能为 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自动创建/绑定线程。
    - 如果某个帐户禁用了线程绑定，`/focus` 和相关的线程绑定操作将不可用。

    参见 [Sub-agents](/zh/en/tools/subagents)、[ACP Agents](/zh/en/tools/acp-agents) 和 [Configuration Reference](/zh/en/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持久化 ACP 频道绑定">
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

    注意：

    - 线程消息可以继承父频道的 ACP 绑定。
    - 在绑定的频道或线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。
    - 临时线程绑定仍然有效，并且在激活时可以覆盖目标解析。

    有关绑定行为的详细信息，请参阅 [ACP Agents](/zh/en/tools/acp-agents)。

  </Accordion>

  <Accordion title="Reaction notifications">
    每个公会反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件被转换为系统事件，并附加到路由到的 Discord 会话。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 处理入站消息时，`ackReaction` 会发送确认表情符号。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

    注意事项：

    - Discord 接受 unicode 表情符号或自定义表情符号名称。
    - 使用 `""` 为频道或账户禁用此反应。

  </Accordion>

  <Accordion title="Config writes">
    频道发起的配置写入默认已启用。

    这会影响 `/config set|unset` 流程（当启用命令功能时）。

    禁用方法：

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

  <Accordion title="Gateway proxy">
    使用 `channels.discord.proxy` 通过 HTTP(S) 代理路由 Discord 网关 WebSocket 流量和启动 REST 查询（应用程序 ID + 允许列表解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每个账户的覆盖设置：

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
    启用 PluralKit 解析，将代理消息映射到系统成员身份：

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
    - 仅当 `channels.discord.dangerouslyAllowNameMatching: true` 时，才按名称/slug 匹配成员显示名称
    - 查询使用原始消息 ID 并受时间窗口限制
    - 如果查询失败，代理消息将被视为机器人消息并丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Presence configuration">
    当您设置状态或活动字段，或启用自动状态时，会应用状态更新。

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
    - 1: 直播中（需要 `activityUrl`）
    - 2: 正在听
    - 3: 正在观看
    - 4: 自定义（使用活动文本作为状态；表情符号可选）
    - 5: 竞技中

    自动状态示例（运行状况信号）：

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

    自动状态将运行时可用性映射到 Discord 状态：健康 => 在线，降级或未知 => 空闲，耗尽或不可用 => 请勿打扰。可选文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (支持 `{reason}` 占位符)

  </Accordion>

  <Accordion title="Discord 中的执行审批">
    Discord 支持在私信（DM）中通过按钮进行执行审批，并可以选择在发起频道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, 默认值: `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    当 `target` 为 `channel` 或 `both` 时，审批提示在频道中可见。只有配置的审批者可以使用按钮；其他用户会收到临时拒绝消息。审批提示包含命令文本，因此请仅在受信任的频道中启用频道传递。如果无法从会话密钥派生频道 ID，OpenClaw 将回退到私信传递。

    此处理程序的网关身份验证使用与其他网关客户端相同的共享凭据解析合约：

    - 优先使用本地环境身份验证（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` 然后 `gateway.auth.*`）
    - 在本地模式下，仅当 `gateway.auth.*` 未设置时，`gateway.remote.*` 才能作为后备使用；配置但未解析的本地 SecretRefs 将失败关闭
    - 在适用时通过 `gateway.remote.*` 支持远程模式
    - URL 覆盖是覆盖安全的：CLI 覆盖不会重用隐式凭据，环境覆盖仅使用环境凭据

    如果审批因未知的审批 ID 失败，请验证审批者列表和功能是否已启用。

    相关文档：[Exec approvals](/zh/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和操作门控

Discord 消息操作包括消息传递、频道管理、审核、状态和元数据操作。

核心示例：

- 消息传递: `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- 反应: `react`, `reactions`, `emojiList`
- 审核: `timeout`, `kick`, `ban`
- 状态: `setPresence`

操作门控位于 `channels.discord.actions.*` 之下。

默认门控行为：

| 操作组                                                                                                                                                             | 默认值  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | enabled  |
| roles                                                                                                                                                                    | disabled |
| moderation                                                                                                                                                               | disabled |
| presence                                                                                                                                                                 | disabled |

## Components v2 UI

OpenClaw 使用 Discord 组件 v2 进行执行审批和跨上下文标记。Discord 消息操作还可以接受 `components` 以实现自定义 UI（高级；需要 Carbon 组件实例），而传统的 `embeds` 仍然可用，但不建议使用。

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器使用的强调色（十六进制）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 针对每个账户进行设置。
- 当存在组件 v2 时，`embeds` 将被忽略。

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
- 机器人需要在目标语音频道中拥有 连接 + 说话 权限。

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

注意事项：

- `voice.tts` 仅针对语音播放覆盖 `messages.tts`。
- 语音记录轮次从 Discord `allowFrom`（或 `dm.allowFrom`）派生所有者状态；非所有者发言者无法访问仅限所有者的工具（例如 `gateway` 和 `cron`）。
- 默认情况下启用语音；设置 `channels.discord.voice.enabled=false` 以将其禁用。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 传递给 `@discordjs/voice` 加入选项。
- 如果未设置，`@discordjs/voice` 默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 还会监视接收解密失败，并在短时间内反复失败后通过离开/重新加入语音频道来自动恢复。
- 如果接收日志反复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，这可能是 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 中跟踪的上游 `@discordjs/voice` 接收错误。

## 语音消息

Discord 语音消息显示波形预览，并且需要 OGG/Opus 音频以及元数据。OpenClaw 会自动生成波形，但它需要在网关主机上提供 `ffmpeg` 和 `ffprobe` 以检查和转换音频文件。

要求和限制：

- 提供**本地文件路径**（URL 会被拒绝）。
- 省略文本内容（Discord 不允许在同一 payload 中包含文本和语音消息）。
- 接受任何音频格式；OpenClaw 会在需要时将其转换为 OGG/Opus。

示例：

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排除

<AccordionGroup>
  <Accordion title="使用了不允许的 intents 或 bot 看不到公会消息">

    - 启用 Message Content Intent
    - 当您依赖用户/成员解析时，启用 Server Members Intent
    - 更改 intents 后重启网关

  </Accordion>

  <Accordion title="公会消息意外被阻止">

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的公会白名单
    - 如果存在公会 `channels` 映射，则仅允许列出的频道
    - 验证 `requireMention` 行为和提及模式

    有用的检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention 为 false 但仍被阻止">
    常见原因：

    - `groupPolicy="allowlist"` 没有匹配的公会/频道白名单
    - `requireMention` 配置位置错误（必须在 `channels.discord.guilds` 或频道条目下）
    - 发送者被公会/频道 `users` 白名单阻止

  </Accordion>

  <Accordion title="长时间运行的处理器超时或回复重复">

    典型日志：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    监听器预算旋钮：

    - 单帐户：`channels.discord.eventQueue.listenerTimeout`
    - 多帐户：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 运行超时旋钮：

    - 单帐户：`channels.discord.inboundWorker.runTimeoutMs`
    - 多帐户：`channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 默认值：`1800000`（30 分钟）；设置 `0` 以禁用

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

    仅当您希望为排队代理轮次设置单独的安全阀时，才使用 `eventQueue.listenerTimeout` 进行慢速监听器设置，并使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="权限审核不匹配">
    `channels status --probe` 权限检查仅适用于数字频道 ID。

    如果您使用 slug 键，运行时匹配仍然可以工作，但探针无法完全验证权限。

  </Accordion>

  <Accordion title="DM 和配对问题">

    - DM 已禁用：`channels.discord.dm.enabled=false`
    - DM 策略已禁用：`channels.discord.dmPolicy="disabled"` (旧版：`channels.discord.dm.policy`)
    - 在 `pairing` 模式下等待配对批准

  </Accordion>

  <Accordion title="Bot 对 bot 循环">
    默认情况下，忽略由 bot 发送的消息。

    如果您设置了 `channels.discord.allowBots=true`，请使用严格的提及和允许列表规则以避免循环行为。
    最好使用 `channels.discord.allowBots="mentions"` 以仅接受提及该 bot 的 bot 消息。

  </Accordion>

  <Accordion title="语音 STT 因 DecryptionFailed(...) 而丢失">

    - 保持 OpenClaw 为最新版本 (`openclaw update`)，以便存在 Discord 语音接收恢复逻辑
    - 确认 `channels.discord.voice.daveEncryption=true` (默认)
    - 从 `channels.discord.voice.decryptionFailureTolerance=24` (上游默认值) 开始，仅在需要时进行调整
    - 监视日志中的：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后失败仍然存在，请收集日志并与 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 进行比较

  </Accordion>
</AccordionGroup>

## 配置参考指针

主要参考：

- [配置参考 - Discord](/zh/en/gateway/configuration-reference#discord)

高信号 Discord 字段：

- 启动/身份验证： `enabled`, `token`, `accounts.*`, `allowBots`
- 策略： `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- 命令： `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- 事件队列： `eventQueue.listenerTimeout` (监听器预算), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (legacy alias: `streamMode`), `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb`, `retry`
  - `mediaMaxMb` caps outbound Discord uploads (default: `8MB`)
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## 安全与操作

- 将 bot 令牌视为机密（在受监管的环境中首选 `DISCORD_BOT_TOKEN`）。
- 授予 Discord 最小权限。
- 如果命令部署/状态过期，请重启网关并使用 `openclaw channels status --probe` 重新检查。

## 相关

- [配对](/zh/en/channels/pairing)
- [频道路由](/zh/en/channels/channel-routing)
- [多代理路由](/zh/en/concepts/multi-agent)
- [故障排除](/zh/en/channels/troubleshooting)
- [斜杠命令](/zh/en/tools/slash-commands)

import zh from '/components/footer/zh.mdx';

<zh />
