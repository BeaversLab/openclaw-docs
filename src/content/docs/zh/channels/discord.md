---
summary: "Discord 机器人支持状态、功能和配置"
read_when:
  - Working on Discord channel features
title: "Discord"
---

通过官方 Discord Gateway 准备好接收私信和频道消息。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    Discord 私信默认为配对模式。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复流程。
  </Card>
</CardGroup>

## 快速设置

你需要创建一个带有 bot 的新应用程序，将 bot 添加到你的服务器，并将其与 OpenClaw 配对。我们建议将 bot 添加到你自己的私人服务器。如果你还没有，请[先创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="Create a Discord application and bot">
    前往 [Discord 开发者门户](https://discord.com/developers/applications) 并点击 **New Application**。将其命名为类似 "OpenClaw" 的名称。

    点击侧边栏上的 **Bot**。将 **Username** 设置为你称呼 OpenClaw agent 的任何名称。

  </Step>

  <Step title="Enable privileged intents">
    仍在 **Bot** 页面上，向下滚动到 **Privileged Gateway Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色允许列表和名称到 ID 匹配所必需）
    - **Presence Intent**（可选；仅需要状态更新）

  </Step>

  <Step title="Copy your bot token">
    在 **Bot** 页面上向上滚动并点击 **Reset Token**。

    <Note>
    尽管名称如此，但这会生成你的第一个令牌——没有任何东西被“重置”。
    </Note>

    复制令牌并将其保存在某处。这是你的 **Bot Token**，稍后你将需要它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    点击侧边栏上的 **OAuth2**。您将生成一个具有正确权限的邀请 URL，以便将机器人添加到您的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方将出现 **Bot Permissions** 部分。至少启用：

    **General Permissions**（通用权限）
      - View Channels（查看渠道）
    **Text Permissions**（文本权限）
      - Send Messages（发送消息）
      - Read Message History（读取消息历史）
      - Embed Links（嵌入链接）
      - Attach Files（附加文件）
      - Add Reactions (optional)（添加表情 [可选]）

    这是普通文本渠道的基准权限集。如果您计划在 Discord 线程中发帖，包括创建或继续线程的论坛或媒体渠道工作流，请同时启用 **Send Messages in Threads**（在线程中发送消息）。
    复制底部生成的 URL，将其粘贴到浏览器中，选择您的服务器，然后点击 **Continue**（继续）进行连接。您现在应该能在 Discord 服务器中看到您的机器人了。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 应用程序，您需要启用开发者模式以便复制内部 ID。

    1. 点击 **User Settings**（用户设置，头像旁边的齿轮图标）→ **Advanced**（高级）→ 打开 **Developer Mode**（开发者模式）
    2. 右键点击侧边栏中的 **server icon**（服务器图标）→ **Copy Server ID**（复制服务器 ID）
    3. 右键点击 **your own avatar**（您自己的头像）→ **Copy User ID**（复制用户 ID）

    将您的 **Server ID**（服务器 ID）和 **User ID**（用户 ID）与 Bot Token（机器人令牌）一起保存——您将在下一步中将这三者发送给 OpenClaw。

  </Step>

  <Step title="Allow 私信 from server members">
    为了使配对正常工作，Discord 需要允许您的机器人向您发送私信。右键点击 **server icon**（服务器图标）→ **Privacy Settings**（隐私设置）→ 打开 **Direct Messages**（私信）。

    这允许服务器成员（包括机器人）向您发送私信。如果您想通过 Discord 使用 OpenClaw 私信，请保持此设置启用。如果您仅计划使用公會渠道，则可以在配对后禁用私信。

  </Step>

  <Step title="安全设置您的机器人令牌（不要在聊天中发送）">
    您的 Discord 机器人令牌是一个秘密（就像密码一样）。在向您的代理发送消息之前，请在运行 OpenClaw 的机器上进行设置。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已作为后台服务运行，请通过 OpenClaw Mac 应用程序或通过停止并重新启动 `openclaw gateway run` 进程来重新启动它。

  </Step>

  <Step title="配置 OpenClaw 并配对">

    <Tabs>
      <Tab title="询问您的代理">
        在任何现有渠道（例如 Telegram）上与您的 OpenClaw 代理聊天并告知它。如果 Discord 是您的第一个渠道，请改用 CLI / 配置选项卡。

        > "我已经在配置中设置了 Discord 机器人令牌。请使用用户 ID `<user_id>` 和服务器 ID `<server_id>` 完成 Discord 设置。"
      </Tab>
      <Tab title="CLI / 配置">
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

        默认帐户的环境变量回退：

```bash
DISCORD_BOT_TOKEN=...
```

        支持纯文本 `token` 值。跨 env/file/exec 提供程序也支持 SecretRef 值，用于 `channels.discord.token`。请参阅[密钥管理](/zh/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="批准首次私信配对">
    等待网关运行，然后在 Discord 中私信您的机器人。它将回复一个配对码。

    <Tabs>
      <Tab title="询问您的代理">
        将配对码发送给您现有渠道上的代理：

        > "批准此 Discord 配对码： `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对码会在 1 小时后过期。

    您现在应该能够通过 Discord 中的私信与您的代理聊天。

  </Step>
</Steps>

<Note>Token 解析支持账户感知。配置的 token 值优先于环境变量回退值。`DISCORD_BOT_TOKEN` 仅用于默认账户。 对于高级出站调用（消息工具/渠道操作），会为该调用使用显式的每次调用 `token`。这适用于发送和读取/探测类操作（例如读取/搜索/获取/线程/置顶/权限）。账户策略/重试设置仍来自活动运行时快照中选定的账户。</Note>

## 推荐：设置一个服务器工作区

一旦 Discord 能够正常工作，您就可以将您的 Discord 服务器设置为一个完整的工作区，其中每个渠道都有自己的代理会话及其上下文。这对于只有您和您的机器人的私人服务器来说是推荐的。

<Steps>
  <Step title="将您的服务器添加到服务器允许列表">
    这将启用您的代理在您服务器的任何渠道中响应，而不仅仅是 Discord。

    <Tabs>
      <Tab title="询问您的代理">
        > "将我的 Discord Server ID `<server_id>` 添加到服务器允许列表中"
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

  <Step title="允许在没有 @mention 的情况下响应">
    默认情况下，您的代理只有在服务器渠道中被 @mentioned 时才会响应。对于私人服务器，您可能希望它响应每一条消息。

    <Tabs>
      <Tab title="询问您的代理">
        > "允许我的代理在此服务器上响应而无需 @mentioned"
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

  <Step title="Plan for memory in guild channels">
    默认情况下，长期记忆 (MEMORY.md) 仅在私信会话中加载。公会渠道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="Ask your agent">
        > “当我在 Discord 渠道中提问时，如果需要 MEMORY.md 中的长期上下文，请使用 memory_search 或 memory_get。”
      </Tab>
      <Tab title="Manual">
        如果您需要在每个渠道中共享上下文，请将稳定的指令放在 `AGENTS.md` 或 `USER.md` 中（它们会为每个会话注入）。将长期笔记保留在 `MEMORY.md` 中，并使用记忆工具按需访问。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在在您的 Discord 服务器上创建一些渠道并开始聊天。您的智能体可以看到渠道名称，并且每个渠道都有自己的独立会话——因此您可以设置 `#coding`、`#home`、`#research` 或适合您工作流程的任何内容。

## 运行时模型

- Gateway(网关) 拥有 Discord 连接。
- 回复路由是确定性的：Discord 入站回复回传给 Discord。
- Discord 公会/渠道元数据作为不受信任的上下文添加到模型提示中，而不是作为用户可见的回复前缀。如果模型复制了该信封，OpenClaw 会从出站回复和未来的重放上下文中剥离复制的元数据。
- 默认情况下 (`session.dmScope=main`)，直接聊天共享智能体主会话 (`agent:main:main`)。
- 公会渠道是独立的会话密钥 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群组私信默认被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜杠命令在独立的命令会话中运行 (`agent:<agentId>:discord:slash:<userId>`)，同时仍将 `CommandTargetSessionKey` 传递到路由的对话会话。
- 仅文本的 cron/heartbeat 公告投递到 Discord 仅使用一次最终助理可见的答案。当智能体发出多个可投递的有效载荷时，媒体和结构化组件有效载荷仍保持多消息形式。

## 论坛渠道

Discord 论坛和媒体渠道仅接受线程帖子。OpenClaw 支持两种创建它们的方式：

- 向论坛父频道 (`channel:<forumId>`) 发送消息以自动创建一个帖子。帖子标题使用您消息的第一个非空行。
- 使用 `openclaw message thread create` 直接创建帖子。请勿为论坛频道传递 `--message-id`。

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

论坛父频道不接受 Discord 组件。如果您需要组件，请直接发送到帖子 (`channel:<threadId>`)。

## 交互组件

OpenClaw 支持用于代理消息的 Discord 组件 v2 容器。使用带有 `components` 载荷的消息工具。交互结果作为普通入站消息被路由回代理，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- 操作行最多允许 5 个按钮或一个选择菜单
- 选择类型：`string`, `user`, `role`, `mentionable`, `channel`

默认情况下，组件为一次性使用。设置 `components.reusable=true` 以允许按钮、选择和表单被多次使用，直到它们过期。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户将收到一条临时拒绝通知。

`/model` 和 `/models` 斜杠命令会打开一个交互式模型选择器，其中包含提供商、模型和兼容的运行时下拉菜单以及一个提交步骤。`/models add` 已被弃用，现在返回弃用消息，而不是从聊天中注册模型。选择器回复是临时的，只有调用的用户可以使用它。

文件附件：

- `file` 块必须指向附件引用 (`attachment://<filename>`)
- 通过 `media`/`path`/`filePath` 提供附件（单个文件）；使用 `media-gallery` 传递多个文件
- 当上传名称应与附件引用匹配时，使用 `filename` 覆盖上传名称

模态表单：

- 添加 `components.modal`，最多包含 5 个字段
- 字段类型：`text`、`checkbox`、`radio`、`select`、`role-select`、`user-select`
- OpenClaw 会自动添加触发按钮

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
  <Tab title="私信策略">
    `channels.discord.dmPolicy` 控制私信访问（旧版：`channels.discord.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`；旧版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果私信策略未开放，未知用户将被阻止（或在 `pairing` 模式下被提示配对）。

    多账号优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账号。
    - 当命名账号自身的 `allowFrom` 未设置时，它们继承 `channels.discord.allowFrom`。
    - 命名账号不继承 `channels.discord.accounts.default.allowFrom`。

    用于投递的私信目标格式：

    - `user:<id>`
    - `<@id>` 提及

    除非提供明确的用户/渠道目标类型，否则纯数字 ID 存在歧义并被拒绝。

  </Tab>

  <Tab title="Guild policy">
    公会处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当存在 `channels.discord` 时，安全基线是 `allowlist`。

    `allowlist` 行为：

    - 公会必须匹配 `channels.discord.guilds`（首选 `id`，接受 slug）
    - 可选的发送方白名单：`users`（推荐使用稳定 ID）和 `roles`（仅限角色 ID）；如果配置了其中任何一个，当发送方匹配 `users` 或 `roles` 时即被允许
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

    如果您仅设置 `DISCORD_BOT_TOKEN` 而不创建 `channels.discord` 块，运行时回退为 `groupPolicy="allowlist"`（并在日志中发出警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及和群组私信">
    服务器消息默认受提及限制。

    提及检测包括：

    - 显式提及机器人
    - 配置的提及模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 支持情况下的隐式回复机器人行为

    `requireMention` 按服务器/渠道 (`channels.discord.guilds...`) 配置。
    `ignoreOtherMentions` 可选择丢弃提及其他用户/角色但未提及机器人的消息（不包括 @everyone/@here）。

    群组私信：

    - 默认：忽略 (`dm.groupEnabled=false`)
    - 通过 `dm.groupChannels` 可选允许列表（渠道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的代理路由

使用 `bindings[].match.roles` 根据 ID 将 Discord 服务器成员路由到不同的代理。基于角色的绑定仅接受角色 ID，并在对等或父级对等绑定之后、仅服务器绑定之前进行评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有配置的字段都必须匹配。

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

## 原生命令和命令授权

- `commands.native` 默认为 `"auto"`，并且已为 Discord 启用。
- 按渠道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 会显式清除先前注册的 Discord 原生命令。
- 原生命令授权使用与普通消息处理相同的 Discord 允许列表/策略。
- 对于未获授权的用户，命令在 Discord UI 中仍然可见；执行仍会强制执行 OpenClaw 授权并返回“未授权”。

请参阅 [Slash commands](/zh/tools/slash-commands) 以了解命令目录和行为。

默认斜杠命令设置：

- `ephemeral: true`

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持在智能体输出中使用回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`
    - `batched`

    注意：`off` 会禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍然有效。
    `first` 始终将隐式原生回复引用附加到该回合的第一条出站 Discord 消息。
    `batched` 仅在入站回合是包含多条消息的去抖动批次时，才附加 Discord 的隐式原生回复引用。当您主要希望针对模棱两可的突发聊天（而不是每一个单消息回合）使用原生回复时，这非常有用。

    消息 ID 会出现在上下文/历史记录中，以便智能体可以定位特定消息。

  </Accordion>

  <Accordion title="实时流预览">
    OpenClaw 可以通过发送临时消息并在文本到达时编辑该消息来流式传输草稿回复。`channels.discord.streaming` 接受 `off`（默认） | `partial` | `block` | `progress`。`progress` 在 Discord 上映射到 `partial`；`streamMode` 是旧版别名，会自动迁移。

    默认保持 `off`，因为当多个机器人或网关共享一个帐户时，Discord 预览编辑会很快达到速率限制。

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

    - `partial` 随着令牌的到达编辑单个预览消息。
    - `block` 发送草稿大小的块（使用 `draftChunk` 调整大小和断点，限制为 `textChunkLimit`）。
    - 媒体、错误和显式回复最终结果会取消待处理的预览编辑。
    - `streaming.preview.toolProgress`（默认 `true`）控制工具/进度更新是否复用预览消息。

    预览流式传输仅限文本；媒体回复回退到正常传递。当显式启用 `block` 流式传输时，OpenClaw 会跳过预览流以避免重复流式传输。

  </Accordion>

  <Accordion title="历史、上下文和线程行为">
    服务器历史上下文：

    - `channels.discord.historyLimit` default `20`
    - fallback: `messages.groupChat.historyLimit`
    - `0` disables

    私信历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    线程行为：

    - Discord 线程作为渠道会话进行路由，并继承父渠道配置，除非被覆盖。
    - 线程会话继承父渠道的会话级 `/model` 选择作为仅模型回退；线程本地的 `/model` 选择仍然优先，并且除非启用了脚本继承，否则不会复制父脚本历史。
    - `channels.discord.thread.inheritParent` (default `false`) 选择让新的自动线程从父脚本中进行种子填充。每个账户的覆盖设置位于 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 消息工具反应可以解析 `user:<id>` 私信目标。
    - 在回复阶段激活回退期间，`guilds.<guild>.channels.<channel>.requireMention: false` 会被保留。

    渠道主题作为**不受信任的**上下文注入。允许列表控制谁可以触发代理，而不是完整的补充上下文编辑边界。

  </Accordion>

  <Accordion title="Thread-bound sessions for subagents">
    Discord 可以将一个会话目标绑定到线程，以便该线程中的后续消息继续路由到同一个会话（包括子代理会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子代理/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活跃运行和绑定状态
    - `/session idle <duration|off>` 检查/更新聚焦绑定的非活动自动解除聚焦设置
    - `/session max-age <duration|off>` 检查/更新聚焦绑定的硬性最大时长

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
    - `channels.discord.threadBindings.*` 覆盖 Discord 的行为。
    - `spawnSubagentSessions` 必须为 true 才能为 `sessions_spawn({ thread: true })` 自动创建/绑定线程。
    - `spawnAcpSessions` 必须为 true 才能为 ACP（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`）自动创建/绑定线程。
    - 如果某个帐户禁用了线程绑定，`/focus` 及相关的线程绑定操作将不可用。

    请参阅 [子代理](/zh/tools/subagents)、[ACP 代理](/zh/tools/acp-agents) 和 [配置参考](/zh/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP 渠道 bindings">
    对于稳定的“常驻”ACP 工作区，请配置针对 Discord 对话的顶级类型化 ACP 绑定。

    配置路径：

    - `bindings[]` 与 `type: "acp"` 和 `match.channel: "discord"`

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

    - `/acp spawn codex --bind here` 将当前渠道或线程就地绑定，并将未来的消息保留在同一 ACP 会话中。线程消息继承父渠道绑定。
    - 在已绑定的渠道或线程中，`/new` 和 `/reset` 会就地重置同一 ACP 会话。临时线程绑定在激活期间可以覆盖目标解析。
    - 仅当 OpenClaw 需要通过 `--thread auto|here` 创建/绑定子线程时，才需要 `spawnAcpSessions`。

    有关绑定行为的详细信息，请参阅 [ACP Agents](/zh/tools/acp-agents)。

  </Accordion>

  <Accordion title="Reaction notifications">
    每个服务器的反应通知模式：

    - `off`
    - `own` （默认）
    - `all`
    - `allowlist` （使用 `guilds.<id>.users`）

    反应事件被转换为系统事件，并附加到路由的 Discord 会话。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 处理传入消息时，`ackReaction` 会发送一个确认表情符号。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为“👀”）

    注意事项：

    - Discord 接受 Unicode 表情符号或自定义表情符号名称。
    - 使用 `""` 为渠道或帐户禁用该反应。

  </Accordion>

  <Accordion title="Config writes">
    默认启用通道发起的配置写入。

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
    使用 `channels.discord.proxy` 通过 HTTP(S) 代理路由 Discord Gateway WebSocket 流量和启动 REST 查找（应用程序 ID + 允许列表解析）。

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
    - 查找使用原始消息 ID 并受时间窗口限制
    - 如果查找失败，代理消息将被视为机器人消息并被丢弃，除非 `allowBots=true`

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
    - 1: 正在直播（需要 `activityUrl`）
    - 2: 正在听
    - 3: 正在观看
    - 4: 自定义（使用活动文本作为状态状态；表情符号可选）
    - 5: 正在竞赛

    自动状态示例（运行状况运行时信号）：

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

    自动状态将运行时可用性映射到 Discord 状态：健康 => 在线，降级或未知 => 闲置，耗尽或不可用 => 请勿打扰。可选文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支持 `{reason}` 占位符）

  </Accordion>

  <Accordion title="Discord 中的批准">
    Discord 支持在私信中基于按钮的批准处理，并且可以选择在原始渠道中发布批准提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (可选；如果可能，则回退到 `commands.ownerAllowFrom`)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`，默认值：`dm`)
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    当 `enabled` 未设置或为 `"auto"` 并且至少可以解析出一个批准人（从 `execApprovals.approvers` 或 `commands.ownerAllowFrom`）时，Discord 会自动启用本机执行批准。Discord 不会从渠道 `allowFrom`、旧版 `dm.allowFrom` 或直接消息 `defaultTo` 推断执行批准人。设置 `enabled: false` 可显式禁用 Discord 作为本机批准客户端。

    当 `target` 为 `channel` 或 `both` 时，批准提示在渠道中可见。只有已解析的批准人可以使用这些按钮；其他用户会收到临时的拒绝消息。批准提示包含命令文本，因此请仅在受信任的渠道中启用渠道传递。如果无法从会话密钥导出渠道 ID，OpenClaw 将回退到私信传递。

    Discord 还会呈现其他聊天渠道使用的共享批准按钮。Discord 本机适配器主要增加了批准人私信路由和渠道分发。
    当存在这些按钮时，它们是主要的批准用户体验；仅当工具结果
    指出聊天批准不可用或手动批准是唯一途径时，OpenClaw
    才应包含手动 `/approve` 命令。

    Gateway(网关) 身份验证和批准解析遵循共享的 Gateway(网关) 客户端合约（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve` 解析）。批准默认在 30 分钟后过期。

    请参阅 [Exec approvals](/zh/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具和操作门控

Discord 消息操作包括消息发送、渠道管理、内容审核、在线状态和元数据操作。

核心示例：

- 消息传递：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 回应：`react`、`reactions`、`emojiList`
- 审核：`timeout`、`kick`、`ban`
- 在线状态：`setPresence`

`event-create` 操作接受一个可选的 `image` 参数（URL 或本地文件路径）来设置预定活动的封面图片。

操作门控位于 `channels.discord.actions.*` 之下。

默认门级行为：

| 操作组                                                                                                                                                                   | 默认   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已启用 |
| roles                                                                                                                                                                    | 已禁用 |
| 审核                                                                                                                                                                     | 已禁用 |
| 在线状态                                                                                                                                                                 | 已禁用 |

## 组件 v2 UI

OpenClaw 使用 Discord 组件 v2 进行执行审批和跨上下文标记。Discord 消息操作也可以接受 `components` 用于自定义 UI（高级；需要通过 discord 工具构建组件负载），而旧的 `embeds` 仍然可用，但不推荐使用。

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

## 语音

Discord 有两个不同的语音界面：实时 **语音渠道**（连续对话）和 **语音消息附件**（波形预览格式）。网关支持这两种方式。

### 语音渠道

设置清单：

1. 在 Discord 开发者门户中启用消息内容意图。
2. 使用角色/用户白名单时启用服务器成员意图。
3. 使用 `bot` 和 `applications.commands` 范围邀请机器人。
4. 在目标语音频道中授予 Connect、Speak、Send Messages 和 Read Message History 权限。
5. 启用本机命令（`commands.native` 或 `channels.discord.commands.native`）。
6. 配置 `channels.discord.voice`。

使用 `/vc join|leave|status` 控制会话。该命令使用账户默认代理，并遵循与其他 Discord 命令相同的允许列表和组策略规则。

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

自动加入示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-5.4-mini",
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
          openai: { voice: "onyx" },
        },
      },
    },
  },
}
```

注意：

- `voice.tts` 仅针对语音播放覆盖 `messages.tts`。
- `voice.model` 仅覆盖用于 Discord 语音频道响应的 LLM。保留其未设置状态以继承路由代理模型。
- STT 使用 `tools.media.audio`；`voice.model` 不影响转录。
- 语音转录轮次从 Discord `allowFrom`（或 `dm.allowFrom`）派生所有者状态；非所有者发言者无法访问仅所有者工具（例如 `gateway` 和 `cron`）。
- 语音默认已启用；设置 `channels.discord.voice.enabled=false` 以将其禁用。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 传递给 `@discordjs/voice` 加入选项。
- 如果未设置，`@discordjs/voice` 默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 还会监视接收解密失败，并在短时间内反复失败后通过退出/重新加入语音频道来自动恢复。
- 如果更新后接收日志反复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，请收集依赖项报告和日志。捆绑的 `@discordjs/voice` 行包含来自 discord.js PR #11449 的上游填充修复，该修复关闭了 discord.js issue #11419。

语音频道流程：

- Discord PCM 捕获被转换为 WAV 临时文件。
- `tools.media.audio` 处理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 转录通过正常的 Discord 入口和路由发送。
- `voice.model` 在设置时，仅覆盖此语音频道轮次的响应 LLM。
- `voice.tts` 被混合到 `messages.tts` 之上；生成的音频在加入的频道中播放。

凭据按组件解析：LLM 路由鉴权用于 `voice.model`，STT 鉴权用于 `tools.media.audio`，以及 TTS 鉴权用于 `messages.tts`/`voice.tts`。

### 语音消息

Discord 语音消息显示波形预览，并且需要 OGG/Opus 音频。OpenClaw 会自动生成波形，但需要在网关主机上安装 `ffmpeg` 和 `ffprobe` 以进行检查和转换。

- 提供 **本地文件路径**（拒绝 URL）。
- 省略文本内容（Discord 拒绝在同一负载中包含文本和语音消息）。
- 接受任何音频格式；OpenClaw 会根据需要将其转换为 OGG/Opus。

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
    - 验证 `channels.discord.guilds` 下的服务器允许列表
    - 如果存在服务器 `channels` 映射，则仅允许列出的频道
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

    - `groupPolicy="allowlist"` 没有匹配的服务器/频道允许列表
    - `requireMention` 配置位置错误（必须在 `channels.discord.guilds` 或频道条目下）
    - 发送者被服务器/频道 `users` 允许列表阻止

  </Accordion>

  <Accordion title="长时间运行的处理程序超时或重复回复">

    典型日志：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    监听器预算控制：

    - 单账户: `channels.discord.eventQueue.listenerTimeout`
    - 多账户: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 运行超时控制：

    - 单账户: `channels.discord.inboundWorker.runTimeoutMs`
    - 多账户: `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 默认: `1800000` (30 分钟); 设置 `0` 以禁用

    推荐基准配置：

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

    对于缓慢的监听器设置，使用 `eventQueue.listenerTimeout`，并且仅在您希望为排队的代理轮次设置单独的安全阀时使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="权限审计不匹配">
    `channels status --probe` 权限检查仅对数字渠道 ID 有效。

    如果您使用 slug 键，运行时匹配仍然可以工作，但 probe 无法完全验证权限。

  </Accordion>

  <Accordion title="私信和配对问题">

    - 私信已禁用: `channels.discord.dm.enabled=false`
    - 私信策略已禁用: `channels.discord.dmPolicy="disabled"` (旧版: `channels.discord.dm.policy`)
    - 在 `pairing` 模式下等待配对批准

  </Accordion>

  <Accordion title="机器人到机器人的循环">
    默认情况下，忽略机器人发送的消息。

    如果您设置了 `channels.discord.allowBots=true`，请使用严格的提及和允许列表规则以避免循环行为。
    优先使用 `channels.discord.allowBots="mentions"` 以仅接受提及该机器人的机器人消息。

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 为最新版本 (`openclaw update`)，以便存在 Discord 语音接收恢复逻辑
    - 确认 `channels.discord.voice.daveEncryption=true`（默认）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认值）开始，仅在必要时进行调整
    - 观察日志中的以下内容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后故障仍然存在，请收集日志并对照上游 DAVE 接收历史记录进行比较，参考 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## 配置参考

主要参考：[配置参考 - Discord](/zh/gateway/config-channels#discord)。

<Accordion title="Discord 关键字段">

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (legacy alias: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb` (caps outbound Discord uploads, default `100MB`), `retry`
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

</Accordion>

## 安全与运营

- 将机器人令牌视为机密信息（在受监管环境中首选 `DISCORD_BOT_TOKEN`）。
- 授予最小权限的 Discord 权限。
- 如果命令部署/状态已过期，请重启网关并使用 `openclaw channels status --probe` 重新检查。

## 相关内容

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    将 Discord 用户与网关配对。
  </Card>
  <Card title="Groups" icon="users" href="/zh/channels/groups">
    群聊和允许列表行为。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh/channels/channel-routing">
    将传入消息路由到代理。
  </Card>
  <Card title="Security" icon="shield" href="/zh/gateway/security">
    威胁模型和加固。
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/zh/concepts/multi-agent">
    将频道和频道映射到代理。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为。
  </Card>
</CardGroup>
