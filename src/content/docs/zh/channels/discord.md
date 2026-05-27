---
summary: "DiscordDiscord 机器人支持状态、功能和配置"
read_when:
  - Working on Discord channel features
title: "DiscordDiscord"
---

通过官方 Discord Gateway 准备好接收私信和频道消息。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    Discord Discord默认为配对模式。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复流程。
  </Card>
</CardGroup>

## 快速设置

您需要创建一个带有机器人（bot）的新应用程序，将该机器人添加到您的服务器，并将其与 OpenClaw 配对。我们建议将您的机器人添加到您自己的私人服务器中。如果您还没有私人服务器，请先[创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="创建一个 Discord 应用程序和机器人">
    前往 [Discord 开发者门户](https://discord.com/developers/applications) 并点击 **New Application**（新建应用程序）。将其命名为类似 "OpenClaw" 的名称。

    点击侧边栏上的 **Bot**。将 **Username**（用户名）设置为您称呼 OpenClaw 代理的名称。

  </Step>

  <Step title="启用特权意图"Gateway(网关)>
    仍在 **Bot** 页面上，向下滚动到 **Privileged Gateway(网关) Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色白名单和名称到 ID 匹配所必需）
    - **Presence Intent**（可选；仅在需要状态更新时使用）

  </Step>

  <Step title="复制你的机器人令牌">
    回到 **Bot** 页面并点击 **Reset Token**。

    <Note>
    顾名思义，这将生成你的第一个令牌——并没有任何东西被“重置”。
    </Note>

    复制该令牌并将其保存在某处。这是你的 **Bot Token**，稍后你将需要它。

  </Step>

  <Step title="生成邀请链接并将机器人添加到您的服务器">
    点击侧边栏上的 **OAuth2**。您将生成一个具有适当权限的邀请链接，以便将机器人添加到您的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方将出现 **Bot Permissions** 部分。至少启用：

    **General Permissions**
      - View Channels（查看渠道）
    **Text Permissions**
      - Send Messages（发送消息）
      - Read Message History（读取消息历史）
      - Embed Links（嵌入链接）
      - Attach Files（附加文件）
      - Add Reactions（添加表情，可选）

    这是普通文本渠道的基础设置。如果您计划在 Discord 主题中发布，包括创建或继续主题的论坛或媒体渠道工作流，请同时启用 **Send Messages in Threads**（在主题中发送消息）。
    复制底部生成的链接，将其粘贴到浏览器中，选择您的服务器，然后点击 **Continue**（继续）进行连接。您现在应该能在 Discord 服务器中看到您的机器人了。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 应用，你需要启用开发者模式才能复制内部 ID。

    1. 点击 **User Settings**（头像旁的齿轮图标）→ **Advanced** → 打开 **Developer Mode**
    2. 右键点击侧边栏中的 **server icon** → **Copy Server ID**
    3. 右键点击 **own avatar** → **Copy User ID**

    保存你的 **Server ID** 和 **User ID**，以及你的 Bot Token —— 下一步你将把这三者都发送给 OpenClaw。

  </Step>

  <Step title="Allow 私信 from server members">
    为了使配对功能正常工作，Discord 需要允许您的机器人向您发送私信。右键点击您的 **服务器图标** → **隐私设置** → 开启 **私信**。

    这允许服务器成员（包括机器人）向您发送私信。如果您想通过 Discord 使用 OpenClaw 私信，请保持此设置启用。如果您只计划使用频道，可以在配对后禁用私信。

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    您的 Discord 机器人令牌是一个机密信息（类似于密码）。在向您的代理发送消息之前，请在运行 OpenClaw 的机器上对其进行设置。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
cat > discord.patch.json5 <<'JSON5'
{
  channels: {
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./discord.patch.json5 --dry-run
openclaw config patch --file ./discord.patch.json5
openclaw gateway
```

    如果 OpenClaw 已作为后台服务运行，请通过 OpenClaw Mac 应用程序重启它，或者通过停止并重新启动 `openclaw gateway run` 进程来重启。
    对于托管服务安装，请在存在 `DISCORD_BOT_TOKEN` 的 shell 中运行 `openclaw gateway install`，或者将该变量存储在 `~/.openclaw/.env` 中，以便服务在重启后可以解析 env SecretRef。
    如果您的主机被 Discord 的启动应用程序查找阻止或速率限制，请从开发者门户设置 Discord 应用程序/客户端 ID，以便启动时跳过该 REST 调用。对于默认帐户，请使用 `channels.discord.applicationId`；当您运行多个 Discord 机器人时，请使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="OpenClaw配置 OpenClaw 并配对">

    <Tabs>
      <Tab title="询问您的 Agent">
        在任何现有渠道（例如 OpenClaw）上与您的 Telegram agent 聊天并告诉它。如果 Discord 是您的第一个渠道，请改用 CLI / config 选项卡。

        > “我已经在配置中设置了我的 Discord bot 令牌。请使用用户 ID `<user_id>` 和服务器 ID `<server_id>` 完成 Discord 设置。”
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

        默认账户的环境变量后备：

```bash
DISCORD_BOT_TOKEN=...
```

        对于脚本化或远程设置，请使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 编写相同的 JSON5 块，然后在无 `--dry-run` 的情况下重新运行。支持纯文本 `token` 值。也支持跨 env/file/exec 提供程序的 `channels.discord.token` 的 SecretRef 值。请参阅[机密管理](/zh/gateway/secrets)。

        对于多个 Discord bot，请将每个 bot 令牌和应用程序 ID 保留在其账户下。顶层 `channels.discord.applicationId` 由账户继承，因此仅当每个账户应使用相同的应用程序 ID 时才在此处设置它。

```json5
{
  channels: {
    discord: {
      enabled: true,
      accounts: {
        personal: {
          token: { source: "env", provider: "default", id: "DISCORD_PERSONAL_TOKEN" },
          applicationId: "111111111111111111",
        },
        work: {
          token: { source: "env", provider: "default", id: "DISCORD_WORK_TOKEN" },
          applicationId: "222222222222222222",
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approve first 私信 pairing">
    等待网关运行，然后在 Discord 中向你的机器人发送私信。它将回复一个配对码。

    <Tabs>
      <Tab title="Ask your agent">
        将配对码发送到你现有渠道上的智能体：

        > "Approve this Discord pairing code: `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对码会在 1 小时后过期。

    你现在应该能够通过私信在 Discord 中与你的智能体聊天了。

  </Step>
</Steps>

<Note>
  Token 解析是感知账户的。配置中的 token 值优先于环境变量回退。`DISCORD_BOT_TOKEN`DiscordOpenClaw 仅用于默认账户。 如果两个启用的 Discord 账户解析为同一个 bot token，OpenClaw 将仅为该 token 启动一个网关监视器。来源于配置的 token 优先于默认环境变量回退；否则，第一个启用的账户生效，重复的账户将被报告为已禁用。 对于高级出站调用（消息工具/渠道操作），该调用将使用显式的每次调用
  `token`。这适用于发送和读取/探测类操作（例如 read/search/fetch/thread/pins/permissions）。账户策略/重试设置仍来自活动运行时快照中的选定账户。
</Note>

## 推荐：设置一个服务器工作区

一旦 Discord 能够正常工作，您就可以将您的 Discord 服务器设置为一个完整的工作区，其中每个渠道都有自己的代理会话及其上下文。这对于只有您和您的机器人的私人服务器来说是推荐的。

<Steps>
  <Step title="将您的服务器添加到公会允许列表">
    这将启用您的代理在您服务器的任何渠道中进行响应，而不仅仅是私信。

    <Tabs>
      <Tab title="询问您的代理">
        > "将我的 Discord 服务器 ID `<server_id>` 添加到公会允许列表"
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

  <Step title="Allow responses without @mention">
    默认情况下，您的代理仅在收到 @提及 时才会响应频道消息。对于私人服务器，您可能希望它响应每条消息。

    在频道中，普通回复默认会自动发布。对于共享的常驻房间，选择启用 `messages.groupChat.visibleReplies: "message_tool"`，以便代理可以潜伏，仅在其认为频道回复有用时才发布。这对于最新一代、工具可靠的模型（如 GPT 5.5）效果最佳。除非工具发送消息，否则环境房间事件将保持静默。有关完整的潜伏模式配置，请参阅 [环境房间事件](/zh/channels/ambient-room-events)。

    如果 Discord 显示正在输入且日志显示有 token 使用情况，但没有发布消息，请检查该轮次是否被配置为环境房间事件，或者是否选择了消息工具可见回复。

    <Tabs>
      <Tab title="Ask your agent">
        > "允许我的代理在此服务器上响应而无需 @mentioned"
      </Tab>
      <Tab title="Config">
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

        若要求对可见的群组/频道回复必须通过消息工具发送，请设置 `messages.groupChat.visibleReplies: "message_tool"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    默认情况下，长期记忆 (MEMORY.md) 仅在私信会话中加载。公会渠道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="Ask your agent">
        > “当我在 Discord 渠道中提问时，如果你需要来自 MEMORY.md 的长期上下文，请使用 memory_search 或 memory_get。”
      </Tab>
      <Tab title="Manual">
        如果你需要在每个渠道中使用共享上下文，请将稳定的指令放在 `AGENTS.md` 或 `USER.md` 中（它们会在每次会话时注入）。将长期笔记保存在 `MEMORY.md` 中，并使用记忆工具按需访问。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在在您的 Discord 服务器上创建一些渠道并开始聊天。您的代理可以看到渠道名称，并且每个渠道都有自己的独立会话——因此您可以设置 `#coding`、`#home`、`#research` 或任何适合您工作流程的内容。

## 运行时模型

- Gateway(网关) 拥有 Discord 连接。
- 回复路由是确定性的：Discord 入站回复回传给 Discord。
- Discord 公会/渠道元数据作为不受信任的上下文添加到模型提示中，而不是作为用户可见的回复前缀。如果模型复制了该信封，OpenClaw 会从出站回复和未来的重放上下文中剥离复制的元数据。
- 默认情况下（`session.dmScope=main`），直接聊天共享代理主会话（`agent:main:main`）。
- 群组频道是隔离的会话密钥 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群组私信默认情况下会被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜杠命令在隔离的命令会话 (`agent:<agentId>:discord:slash:<userId>`) 中运行，同时仍将 `CommandTargetSessionKey` 传递到路由到的对话会话。
- 仅文本的 cron/heartbeat 公告投递到 Discord 仅使用一次最终助理可见的答案。当智能体发出多个可投递的有效载荷时，媒体和结构化组件有效载荷仍保持多消息形式。

## 论坛渠道

Discord 论坛和媒体渠道仅接受线程帖子。OpenClaw 支持两种创建它们的方式：

- 向论坛父频道 (`channel:<forumId>`) 发送消息以自动创建子帖。子帖标题使用消息的第一行非空内容。
- 使用 `openclaw message thread create` 直接创建子帖。对于论坛频道，不要传递 `--message-id`。

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

论坛父频道不接受 Discord 组件。如果您需要组件，请直接发送到子帖 (`channel:<threadId>`)。

## 交互组件

OpenClaw 支持用于代理消息的 Discord 组件 v2 容器。使用带有 `components` 载荷的消息工具。交互结果将作为普通入站消息路由回代理，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮或一个选择菜单
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件是单次使用的。设置 `components.reusable=true` 以允许按钮、选择器和表单在过期前被多次使用。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`Discord（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户将收到临时拒绝消息。

组件回调默认在 30 分钟后过期。设置 `channels.discord.agentComponents.ttlMs` 可更改默认 Discord 账户的回调注册表生存时间，或在多账户设置中使用 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 覆盖单个账户的设置。该值的单位为毫秒，必须为正整数，且上限为 `86400000`（24 小时）。较长的 TTL 适用于需要按钮保持可用状态以便进行审查或批准的工作流，但它们也会延长旧的 Discord 消息仍可触发操作的时间窗口。尽可能选择符合工作流要求的最短 TTL，当过期的回调会产生意外情况时，请保持默认设置。

`/model` 和 `/models` 斜杠命令会打开一个交互式模型选择器，其中包含提供商、模型和兼容的运行时下拉菜单，以及一个提交步骤。`/models add` 已被弃用，现在返回弃用消息而不是从聊天中注册模型。选择器的回复是临时的，只有调用的用户可以看到它。Discord 选择菜单限制为 25 个选项，因此当你希望选择器仅显示所选提供商（例如 `openai-codex` 或 `vllm`）的动态发现的模型时，请将 `provider/*` 条目添加到 `agents.defaults.models` 中。

文件附件：

- `file` 块必须指向附件引用 (`attachment://<filename>`)
- 通过 `media`/`path`/`filePath` 提供附件（单个文件）；如需上传多个文件，请使用 `media-gallery`
- 当上传名称应与附件引用匹配时，请使用 `filename` 来覆盖上传名称

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
  <Tab title="私信 policy">
    `channels.discord.dmPolicy` 控制 私信 访问。`channels.discord.allowFrom` 是标准的 私信 允许列表。

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    如果 私信 策略未开启，未知用户将被阻止（或在 `pairing` 模式下被提示进行配对）。

    多账户优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 对于单个账户，`allowFrom` 优先于旧版 `dm.allowFrom`。
    - 当指定账户自己的 `allowFrom` 和旧版 `dm.allowFrom` 未设置时，它们将继承 `channels.discord.allowFrom`。
    - 指定账户不继承 `channels.discord.accounts.default.allowFrom`。

    为了保持兼容性，仍会读取旧版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom`。`openclaw doctor --fix` 会在不改变访问权限的情况下，将它们迁移到 `dmPolicy` 和 `allowFrom`。

    用于发送的 私信 目标格式：

    - `user:<id>`
    - `<@id>` 提及

    当存在 渠道 默认值时，纯数字 ID 通常解析为 渠道 ID，但为了兼容性，账户有效 私信 `allowFrom` 中列出的 ID 将被视为用户 私信 目标。

  </Tab>

  <Tab title="访问组"Discord>
    Discord 私信和文本命令授权可以使用 `accessGroup:<name>` 中的动态 `channels.discord.allowFrom` 条目。

    访问组名称在消息渠道之间共享。对于成员在每个渠道的常规 `allowFrom` 语法中表示的静态组，请使用 `type: "message.senders"`；当 Discord 渠道的当前 `ViewChannel` 受众应动态定义成员资格时，请使用 `type: "discord.channelAudience"`Discord。共享访问组行为在此处有详细记录：[访问组](/zh/channels/access-groups)。

````json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```Discord

    Discord 文本渠道没有单独的成员列表。`type: "discord.channelAudience"` 将成员资格建模为：私信发送者是配置的服务器成员，并且在应用角色和渠道覆盖设置后，当前对配置的渠道拥有有效的 `ViewChannel` 权限。

    示例：允许任何可以看到 `#maintainers` 的人向机器人发送私信，同时阻止其他人发送私信。

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
````

    您可以混合使用动态和静态条目：

````json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers", "discord:123456789012345678"],
    },
  },
}
```Discord

    查询失败即视为拒绝。如果 Discord 返回 `Missing Access`DiscordOpenClawDiscord、成员查询失败，或者该渠道属于不同的服务器，则该私信发送者将被视为未授权。

    在使用渠道受众访问组时，请在 Discord 开发者门户中为机器人启用 **Server Members Intent**。私信不包含服务器成员状态，因此 OpenClaw 会在授权时通过 Discord REST 来解析成员。

  </Tab>

  <Tab title="Guild policy">
    公会处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当 `channels.discord` 存在时的安全基线是 `allowlist`。

    `allowlist` 行为：

    - 公会必须匹配 `channels.discord.guilds`（首选 `id`，接受 slug）
    - 可选的发送者白名单：`users`（推荐使用稳定 ID）和 `roles`（仅限角色 ID）；如果配置了其中任何一个，当发送者匹配 `users` 或 `roles` 时，则允许发送
    - 默认禁用直接名称/标签匹配；仅将 `channels.discord.dangerouslyAllowNameMatching: true` 作为紧急兼容模式启用
    - `users` 支持名称/标签，但 ID 更安全；使用名称/标签条目时 `openclaw security audit` 会发出警告
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
````

    如果您仅设置 `DISCORD_BOT_TOKEN` 而未创建 `channels.discord` 块，运行时回退为 `groupPolicy="allowlist"`（并在日志中发出警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及和群组私信">
    公会消息默认受提及限制。

    提及检测包括：

    - 显式提及机器人
    - 配置的提及模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 支持的情况下的隐式回复机器人行为

    当撰写出站 Discord 消息时，请使用规范提及语法：`<@USER_ID>` 用于用户，`<#CHANNEL_ID>` 用于渠道，`<@&ROLE_ID>` 用于角色。请勿使用旧式的 `<@!USER_ID>` 昵称提及形式。

    `requireMention` 按公会/渠道（`channels.discord.guilds...`）进行配置。
    `ignoreOtherMentions` 可选择丢弃提及其他用户/角色但未提及机器人的消息（不包括 @everyone/@here）。

    群组私信：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 通过 `dm.groupChannels` 的可选允许列表（渠道 ID 或 slugs）

  </Tab>
</Tabs>

### 基于角色的智能体路由

使用 `bindings[].match.roles` 根据 ID 将 Discord 公会成员路由到不同的 代理。基于角色的绑定仅接受角色 ID，并在同级或父级同级绑定之后、仅公会绑定之前进行评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有配置的字段都必须匹配。

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

## 原生命令和命令认证

- `commands.native` 默认为 `"auto"`，并且已针对 Discord 启用。
- 按渠道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 在启动期间跳过 Discord 斜杠命令注册和清理。之前注册的命令可能会在 Discord 中保持可见，直到您从 Discord 应用程序中将其删除。
- 原生命令身份验证使用与普通消息处理相同的 Discord 允许列表/策略。
- 对于未授权的用户，命令在 Discord 界面中仍然可见；执行仍然会强制执行 OpenClaw 授权并返回“未授权”。

请参阅 [Slash commands](/zh/tools/slash-commands) 以了解命令目录和行为。

默认斜杠命令设置：

- `ephemeral: true`

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持在 Agent 输出中使用回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`
    - `batched`

    注意：`off` 会禁用隐式回复串接。明确的 `[[reply_to_*]]` 标签仍然有效。
    `first` 总是将隐式原生回复引用附加到该回合的第一条发出的 Discord 消息。
    `batched` 仅当入站事件是去抖动的多条消息批次时，才附加 Discord 的隐式原生回复引用。这主要适用于您希望原生回复仅用于模糊的突发聊天，而不是每个单消息回合的情况。

    消息 ID 会暴露在上下文/历史记录中，以便 Agent 能够定位特定消息。

  </Accordion>

  <Accordion title="Link previews"DiscordOpenClawDiscord>
    Discord 默认会为 URL 生成富媒体链接嵌入。OpenClaw 默认会在发出的 Discord 消息中抑制这些生成的嵌入，因此除非你选择启用，否则代理发送的 URL 将保持为纯链接：

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    设置 `channels.discord.accounts.<id>.suppressEmbeds` 可覆盖单个账户的设置。代理消息-工具发送也可以为单条消息传递 `suppressEmbeds: false`Discord。显式的 Discord `embeds` 有效载荷不会受到默认链接预览设置的抑制。

  </Accordion>

  <Accordion title="实时流预览">
    OpenClaw 可以通过发送临时消息并在文本到达时进行编辑来流式传输草稿回复。`channels.discord.streaming` 接受 `off` | `partial` | `block` | `progress`（默认）。`progress` 保留一个可编辑的状态草稿，并使用工具进度更新它，直到最终交付；共享的起始标签是一个滚动行，因此一旦出现足够的工作，它就会像其余部分一样滚动消失。`streamMode` 是一个遗留的运行时别名。运行 `openclaw doctor --fix` 将持久化配置重写为规范键。

    将 `channels.discord.streaming.mode` 设置为 `off` 以禁用 Discord 预览编辑。如果明确启用了 Discord 分块流式传输，OpenClaw 将跳过预览流以避免重复流式传输。

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: true,
        },
      },
    },
  },
}
```

    - `partial` 随着标记的到来编辑单个预览消息。
    - `block` 发出草稿大小的块（使用 `draftChunk` 调整大小和断点，限制为 `textChunkLimit`）。
    - 媒体、错误和显式回复的最终结果会取消待处理的预览编辑。
    - `streaming.preview.toolProgress`（默认为 `true`）控制工具/进度更新是否重用预览消息。
    - 工具/进度行在可用时呈现为紧凑的表情符号 + 标题 + 详情，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.progress.maxLineChars` 控制每行进度预览的预算。散文在单词边界处缩短；命令和路径详情保留有用的后缀。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制紧凑进度行中的命令/执行详情：`raw`（默认）或 `status`（仅工具标签）。

    隐藏原始命令/执行文本，同时保留紧凑进度行：

    ```json
    {
      "channels": {
        "discord": {
          "streaming": {
            "mode": "progress",
            "progress": {
              "toolProgress": true,
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    预览流式传输仅为文本；媒体回复回退到正常交付。当明确启用 `block` 流式传输时，OpenClaw 将跳过预览流以避免重复流式传输。

  </Accordion>

  <Accordion title="历史记录、上下文和线程行为">
    公会历史记录上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退： `messages.groupChat.historyLimit`
    - `0` 禁用

    私信历史记录控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`Discord

    线程行为：

    - Discord 线程作为渠道会话进行路由，并继承父渠道配置，除非被覆盖。
    - 线程会话继承父渠道的会话级 `/model` 选择作为仅模型回退；线程本地的 `/model` 选择仍然优先，并且除非启用了逐字稿继承，否则不会复制父逐字稿历史记录。
    - `channels.discord.thread.inheritParent`（默认 `false`）选择从父逐字稿进行种子设定的新自动线程。每个账户的覆盖设置位于 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 消息工具反应可以解析 `user:<id>` 私信目标。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 在回复阶段激活回退期间被保留。

    渠道主题作为 **不受信任的** 上下文被注入。允许列表控制谁可以触发代理，而不是完整的补充上下文编辑边界。

  </Accordion>

  <Accordion title="Thread-bound sessions for subagents">
    Discord 可以将线程绑定到会话目标，以便该线程中的后续消息继续路由到同一会话（包括子代理会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子代理/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活动运行和绑定状态
    - `/session idle <duration|off>` 检查/更新聚焦绑定的非活动自动取消聚焦
    - `/session max-age <duration|off>` 检查/更新聚焦绑定的硬性最大使用时长

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
        spawnSessions: true,
        defaultSpawnContext: "fork",
      },
    },
  },
}
```

    注意：

    - `session.threadBindings.*` 设置全局默认值。
    - `channels.discord.threadBindings.*` 覆盖 Discord 行为。
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 线程生成的自动创建/绑定线程。默认值：`true`。
    - `defaultSpawnContext` 控制线程绑定生成的原生子代理上下文。默认值：`"fork"`。
    - 已弃用的 `spawnSubagentSessions`/`spawnAcpSessions` 键由 `openclaw doctor --fix` 迁移。
    - 如果某个账户禁用了线程绑定，`/focus` 和相关的线程绑定操作将不可用。

    请参阅 [Sub-agents](/zh/tools/subagents)、[ACP Agents](/zh/tools/acp-agents) 和 [Configuration Reference](/zh/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持久化 ACP 渠道绑定">
    对于稳定的“常驻”ACP 工作区，请配置针对 Discord 对话的顶层类型化 ACP 绑定。

    配置路径：

    - `bindings[]` 包含 `type: "acp"` 和 `match.channel: "discord"`

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

    说明：

    - `/acp spawn codex --bind here` 将当前渠道或线程原地绑定，并将后续消息保留在同一 ACP 会话中。线程消息继承父渠道的绑定。
    - 在已绑定的渠道或线程中，`/new` 和 `/reset` 会原地重置同一 ACP 会话。临时的线程绑定在激活期间可以覆盖目标解析。
    - `spawnSessions` 通过 `--thread auto|here` 限制子线程的创建/绑定。

    有关绑定行为的详细信息，请参阅 [ACP Agents](/zh/tools/acp-agents)。

  </Accordion>

  <Accordion title="Reaction notifications">
    每个服务器的反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`Discord）

    反应事件会转换为系统事件，并附加到路由到的 Discord 会话。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 正在处理传入消息时，`ackReaction` 会发送一个确认表情符号。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

    注意事项：

    - Discord 接受 Unicode 表情符号或自定义表情符号名称。
    - 使用 `""` 为渠道或账户禁用该反应。

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

  <Accordion title="Gateway(网关)Gateway(网关) 代理"Discord>
    通过 HTTP(S) 代理使用 `channels.discord.proxy` 路由 Discord Gateway WebSocket 流量和启动 REST 查找（应用程序 ID + 允许列表解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每个账户覆盖：

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

    注意：

    - allowlists 可以使用 `pk:<memberId>`
    - 仅当 `channels.discord.dangerouslyAllowNameMatching: true` 时，才会按名称/slug 匹配成员显示名称
    - 查找使用原始消息 ID，并且受时间窗口限制
    - 如果查找失败，代理消息将被视为机器人消息并被丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    当代理需要为已知的 Discord 用户确定性地发送提及（mentions）时，请使用 `mentionAliases`Discord。键是不带前缀 `@`Discord 的用户名；值为 Discord 用户 ID。未知的用户名、`@everyone`、`@here` 以及 Markdown 代码范围内的提及将保持不变。

```json5
{
  channels: {
    discord: {
      mentionAliases: {
        Vladislava: "123456789012345678",
      },
      accounts: {
        ops: {
          mentionAliases: {
            OpsLead: "234567890123456789",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Presence configuration">
    当您设置状态或活动字段，或启用自动状态时，将应用状态更新。

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

    - 0：正在游戏
    - 1：正在直播（需要 `activityUrl`）
    - 2：正在聆听
    - 3：正在观看
    - 4：自定义（将活动文本用作状态状态；表情符号是可选的）
    - 5：正在竞技

    自动状态示例（运行时健康信号）：

````json5
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
```Discord

    自动状态将运行时可用性映射到 Discord 状态：健康 => 在线，降级或未知 => 空闲，耗尽或不可用 => 请勿打扰。可选文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支持 `{reason}` 占位符）

  </Accordion>

  <Accordion title="DiscordDiscord 中的审批"Discord>
    Discord 支持在私信中基于按钮的审批处理，并可以选择在原渠道发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可选；尽可能回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`Discord

    当 `enabled` 未设置或为 `"auto"` 并且至少可以解析到一个审批者（无论是从 `execApprovals.approvers` 还是从 `commands.ownerAllowFrom`Discord）时，Discord 会自动启用原生执行审批。Discord 不会从渠道 `allowFrom`、旧版 `dm.allowFrom` 或直接消息 `defaultTo` 推断执行审批者。设置 `enabled: false`Discord 可明确禁用 Discord 作为原生审批客户端。

    对于仅限所有者的敏感群组命令（例如 `/diagnostics` 和 `/export-trajectory`OpenClawDiscordDiscord），OpenClaw 会私下发送审批提示和最终结果。如果调用的所有者拥有 Discord 所有者路由，它会先尝试 Discord 私信；如果不可用，它会回退到 `commands.ownerAllowFrom`Telegram 中第一个可用的所有者路由，例如 Telegram。

    当 `target` 为 `channel` 或 `both`OpenClawDiscordDiscordOpenClaw 时，审批提示在渠道中可见。只有已解析的审批者可以使用这些按钮；其他用户会收到临时拒绝通知。审批提示包含命令文本，因此请仅在受信任的渠道中启用渠道传递。如果无法从会话密钥派生渠道 ID，OpenClaw 会回退到私信传递。

    Discord 还会呈现其他聊天渠道使用的共享审批按钮。原生 Discord 适配器主要添加审批者私信路由和渠道分发。
    当存在这些按钮时，它们是主要的审批用户体验；只有当工具结果表明
    聊天审批不可用或手动审批是唯一途径时，OpenClau
    才应包含手动的 `/approve`DiscordOpenClaw 命令。
    如果 Discord 原生审批运行时未激活，OpenClaw 会保持
    本地确定性 `/approve <id> <decision>`OpenClaw 提示可见。如果
    运行时处于激活状态但无法向任何目标传递原生卡片，
    OpenClaw 会发送一个包含来自待审批项的确切 `/approve`Gateway(网关)Gateway(网关)
    命令的同聊回退通知。

    Gateway 身份验证和审批解析遵循共享的 Gateway 客户端契约（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve`）。审批默认在 30 分钟后过期。

    参见 [Exec approvals](/en/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具和操作闸门

Discord 消息操作包括消息发送、渠道管理、审核、状态和元数据操作。

核心示例：

- 消息传递：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- reactions: `react`, `reactions`, `emojiList`
- moderation: `timeout`, `kick`, `ban`
- presence: `setPresence`

`event-create` 操作接受可选的 `image` 参数（URL 或本地文件路径）来设置预定活动的封面图片。

操作门控位于 `channels.discord.actions.*` 之下。

默认门控行为：

| 操作组                                                                                                                                                             | 默认  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已启用  |
| 角色                                                                                                                                                                    | 已禁用 |
| 审核                                                                                                                                                               | 已禁用 |
| 状态                                                                                                                                                                 | 已禁用 |

## 组件 v2 UI

OpenClaw 使用 Discord 组件 v2 进行执行审批和跨上下文标记。Discord 消息操作也可以接受 `components` 用于自定义 UI（高级；需要通过 discord 工具构造组件负载），而旧版 `embeds` 仍然可用，但不推荐使用。

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器所使用的强调色（十六进制）。
- 使用 `channels.discord.accounts.<id>.ui.components.accentColor` 为每个账户设置。
- `channels.discord.agentComponents.ttlMs`Discord 控制已发送的 Discord 组件回调保持注册状态的时长（默认为 `1800000`，最大为 `86400000`）。使用 `channels.discord.accounts.<id>.agentComponents.ttlMs` 为每个账户进行设置。
- 当存在组件 v2 时，`embeds` 会被忽略。
- 默认情况下会抑制纯 URL 预览。当单个出站链接应该展开时，在消息操作上设置 `suppressEmbeds: false`。

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
````

## 语音

Discord 有两个截然不同的语音界面：实时 **语音频道**（连续对话）和 **语音消息附件**（波形预览格式）。网关支持两者。

### 语音频道

设置清单：

1. 在 Discord 开发者门户中启用消息内容意图。
2. 当使用角色/用户白名单时，启用服务器成员意图。
3. 使用 `bot` 和 `applications.commands` 范围邀请机器人。
4. 在目标语音渠道中授予连接、发言、发送消息和读取消息历史的权限。
5. 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
6. 配置 `channels.discord.voice`。

使用 `/vc join|leave|status` 控制会话。该命令使用账户默认代理，并遵循与其他 Discord 命令相同的允许列表和组策略规则。

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

要在加入之前检查机器人的有效权限，请运行：

```bash
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
```

自动加入示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

注意：

- `voice.tts` 覆盖 `messages.tts` 仅用于 `stt-tts` 语音播放。实时模式使用 `voice.realtime.voice`。
- `voice.mode` 控制对话路径。默认为 `agent-proxy`：实时语音前端处理轮次计时、中断和播放，将实质性工作通过 `openclaw_agent_consult` 委派给路由的 OpenClaw 代理，并将结果视为来自该发言者的键入 Discord 提示。`stt-tts` 保留旧的批量 STT 加 TTS 流程。`bidi` 允许实时模型直接对话，同时为 OpenClaw 大脑暴露 `openclaw_agent_consult`。
- `voice.agentSession` 控制哪个 OpenClaw 会话接收语音轮次。如果不设置，则使用语音渠道自己的会话；或者设置 `{ mode: "target", target: "channel:<text-channel-id>" }` 以使语音渠道充当现有 Discord 文本渠道会话（例如 `#maintainers`）的麦克风/扬声器扩展。
- `voice.model` 覆盖 OpenClaw 代理大脑以处理 Discord 语音响应和实时咨询。如果不设置，则继承路由代理模型。它与 `voice.realtime.model` 是分开的。
- `voice.followUsers` 允许机器人与选定用户一起加入、移动和离开 Discord 语音。有关行为规则和示例，请参阅 [Follow users in voice](#follow-users-in-voice)。
- `agent-proxy` 通过 `discord-voice` 路由语音，这为发言者和目标会话保留了正常的所有者/工具授权，但由于 Discord 语音拥有播放控制权，因此隐藏了代理 `tts` 工具。默认情况下，`agent-proxy` 为所有者发言者（`voice.realtime.toolPolicy: "owner"`）提供完全等同于所有者的工具访问权限，并强烈倾向于在给出实质性答案之前咨询 OpenClaw 代理（`voice.realtime.consultPolicy: "always"`）。在该默认 `always` 模式下，实时层不会在咨询答案之前自动说填充语；它会捕获并转录语音，然后说出路由后的 OpenClaw 答案。如果在 Discord 仍在播放第一个答案时完成了多个强制咨询答案，则后续的精确语音答案将被排队，直到播放空闲，而不是在句子中间替换语音。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不影响转录。
- 在实时模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.voice` 用于配置实时音频会话。对于 OpenAI Realtime 2 加上 Codex 大脑，请使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai-codex/gpt-5.5"`。
- 实时语音模式默认在实时提供商指令中包含小的 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 配置文件，以便快速直接轮次保持与路由的 OpenClaw 代理相同的身份、用户基础和角色。将 `voice.realtime.bootstrapContextFiles` 设置为子集以自定义此行为，或设置为 `[]` 以禁用它。支持的实时引导文件仅限于那些配置文件；`AGENTS.md` 保留在正常的代理上下文中。注入的配置文件上下文不会替代 `openclaw_agent_consult` 用于工作区工作、当前事实、内存查找或工具支持的操作。
- 在 OpenAI OpenAI`agent-proxy` 实时模式下，设置 `voice.realtime.requireWakeName: true`Discord 以保持 Discord 实时语音静音，直到转录包含唤醒名称。如果 `voice.realtime.wakeNames`OpenClaw 未设置，OpenClaw 将使用路由代理的 `name` 加上 `OpenClaw`，回退到代理 ID 加上 `OpenClaw`OpenClaw。唤醒名称门禁会禁用实时提供商自动响应，并通过 OpenClaw 代理咨询路径路由接受的轮次。
- OpenAI 实时提供商接受当前的 Realtime 2 事件名称以及旧的 Codex 兼容别名，用于输出音频和转录事件，因此兼容的提供商快照可以在不丢失助手音频的情况下发生偏移。
- `voice.realtime.bargeIn` 控制是否允许 Discord 发言人开始事件中断活跃的实时播放。如果未设置，则遵循实时提供商的输入音频中断设置。
- `voice.realtime.minBargeInAudioEndMs` 控制在 OpenAI 实时插话截断音频之前的最小助手播放时长。默认值：`250`。在低回声房间中设置为 `0` 可实现立即中断，或在回声较大的扬声器设置中调高该值。
- 对于 OpenAI 语音在 Discord 上的播放，请设置 `voice.tts.provider: "openai"` 并在 `voice.tts.openai.voice` 或 `voice.tts.providers.openai.voice` 下选择一个文本转语音语音。在当前的 OpenAI TTS 模型中，`cedar` 是一个不错的男性声音选择。
- 每个 Discord `systemPrompt` 覆盖适用于该语音渠道的语音转录轮次。
- 语音转录轮次从 Discord `allowFrom` （或 `dm.allowFrom`）派生所有者状态，用于所有者门控命令和渠道操作。Agent 工具可见性遵循路由会话的配置工具策略。
- Discord 语音功能在仅文本配置中是可选的；设置 Discord`channels.discord.voice.enabled=true`（或保留现有的 `channels.discord.voice` 块）以启用 `/vc` 命令、语音运行时和 `GuildVoiceStates` 网关意图。
- `channels.discord.intents.voiceStates` 可以显式覆盖语音状态意图订阅。如果不设置该参数，意图将遵循有效的语音启用状态。
- 如果 `voice.autoJoin`OpenClaw 对同一公会有多个条目，OpenClaw 将加入该公会的最后配置的渠道。
- `voice.allowedChannels` 是一个可选的驻留允许列表。保持未设置以允许 `/vc join`Discord 进入任何已授权的 Discord 语音频道。设置后，`/vc join`、启动自动加入和机器人语音状态移动将限制为列出的 `{ guildId, channelId }`DiscordDiscordOpenClaw 条目。将其设置为空数组以拒绝所有 Discord 语音加入。如果 Discord 将机器人移出允许列表，OpenClaw 将离开该频道，并在存在配置的自动加入目标时重新加入该目标。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 会传递给 `@discordjs/voice` 加入选项。
- 如果未设置，`@discordjs/voice` 的默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 默认使用纯 JS OpenClaw`opusscript`Discord 解码器来接收 Discord 语音。可选的原生 `@discordjs/opus`Docker 包会被仓库的 pnpm 安装策略忽略，因此常规安装、Docker 车道和不相关的测试不会编译原生插件。专用的语音性能主机可以在安装原生插件后选择通过 `OPENCLAW_DISCORD_OPUS_DECODER=native` 启用。
- `voice.connectTimeoutMs` 控制 `@discordjs/voice` 对 `/vc join` 的初始 Ready 等待和自动加入尝试。默认值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在销毁断开的语音会话之前等待其开始重新连接的时长。默认值：`15000`。
- 在 `stt-tts` 模式下，仅仅因为另一个用户开始说话，语音播放并不会停止。为了避免反馈回路，当 TTS 正在播放时，OpenClaw 会忽略新的语音采集；请在播放结束后再说话以进行下一轮对话。实时模式会将说话者开始作为插话信号转发给实时提供商。
- 在实时模式下，扬声器声音进入开放麦克风可能看起来像插话并中断播放。对于回声严重的 Discord 房间，设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防止 OpenAI 在输入音频时自动中断。如果您仍然希望 Discord 扬声器启动事件中断活动播放，请添加 `voice.realtime.bargeIn: true`。OpenAI 实时桥会忽略短于 `voice.realtime.minBargeInAudioEndMs` 的播放截断，将其视为可能的回声/噪声，并将其记录为已跳过，而不是清除 Discord 播放。
- `voice.captureSilenceGraceMs` 控制 OpenClaw 在 Discord 报告说话人停止后，在将该音频片段定稿以进行 STT 之前等待的时间。默认值：`2500`；如果 Discord 将正常停顿分割成支离破碎的部分转录，请提高此值。
- 当选择 ElevenLabs 作为 TTS 提供商时，Discord 语音播放使用流式 TTS 并从提供商响应流开始。不支持流式的提供商会回退到合成的临时文件路径。
- 如果在短时间内反复出现接收解密失败，OpenClaw 也会进行监听并通过离开/重新加入语音渠道来自动恢复。
- 如果在更新后接收日志中反复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，请收集依赖报告和日志。捆绑的 `@discordjs/voice` 行包含了来自 discord.js PR #11449 的上游填充修复，该修复关闭了 discord.js issue #11419。
- 当 OpenClaw 完成捕获的说话人片段时，预计会出现 `The operation was aborted` 接收事件；它们是详细的诊断信息，而非警告。
- 详细的 Discord 语音日志包含每个接受的说话人片段的单行 STT 转录预览，因此调试会同时显示用户端和代理回复端，而无需倾倒无限制的转录文本。
- 在 `agent-proxy` 模式下，强制咨询回退会跳过可能不完整的转录片段，例如以 `...` 结尾的文本或像 `and` 这样的尾随连接词，以及明显的不可操作结束语，如“马上回来”或“再见”。当这阻止了过时的排队回答时，日志会显示 `forced agent consult skipped reason=...`。

### 在语音中跟随用户

当您希望 Discord 语音机器人跟随一个或多个已知的 Discord 用户，而不是在启动时加入固定渠道或等待 `/vc join` 时，请使用 `voice.followUsers`。

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        followUsersEnabled: true,
        followUsers: ["discord:123456789012345678"],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
      },
    },
  },
}
```

行为：

- `followUsers`Discord 接受原始 Discord 用户 ID 和 `discord:<id>`OpenClaw 值。OpenClaw 在匹配语音状态事件之前会规范化这两种形式。
- 当配置了 `followUsers` 时，`followUsersEnabled` 默认为 `true`。将其设置为 `false` 以保留已保存的列表，但停止自动语音跟随。
- 当被关注的用户加入允许的语音频道时，OpenClaw 会加入该频道。当用户移动时，OpenClaw 会跟随移动。当当前被关注的用户断开连接时，OpenClaw 会离开。
- 如果多个被关注的用户在同一个公会中，且当前活跃的被关注用户离开，OpenClaw 会在离开公会之前移动到另一个被追踪的被关注用户的渠道。如果几个被关注的用户同时移动，则以最新观察到的语音状态事件为准。
- `allowedChannels` 仍然适用。处于不允许渠道中的被关注用户将被忽略，并且跟随拥有的会话将移动到另一个被关注的用户或离开。
- OpenClaw 会在启动时以及以一定的间隔对遗漏的语音状态事件进行协调。协调过程会对已配置的服务器进行采样，并限制每次运行的 REST 查询次数，因此非常大的 `followUsers` 列表可能需要一个以上的间隔才能完成同步。
- 如果 Discord 或管理员在机器人跟随用户时移动了机器人，当目标被允许时，OpenClaw 会重建语音会话并保留跟随所有权。如果机器人被移出 `allowedChannels`，当存在配置的目标时，OpenClaw 会离开并重新加入该目标。
- DAVE 接收恢复可能会在重复解密失败后离开并重新加入同一渠道。跟随拥有的会话通过该恢复路径保持其跟随所有权，因此后续被跟随用户的断开连接仍会离开该渠道。

在加入模式之间选择：

- 对于机器人应在您处于语音状态时自动加入的个人或操作员设置，请使用 `followUsers`。
- 对即使没有被追踪用户在语音中也应保持存在的固定房间机器人，请使用 `autoJoin`。
- 对于一次性加入或自动语音状态会令人意外的房间，请使用 `/vc join`。

源码检出时的原生 opus 设置：

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

当您需要上游 macOS arm64 预构建原生插件时，请使用 Node 22 作为 Gateway(网关)。如果您使用其他 Node 运行时，选择性安装程序可能需要本地 macOS`node-gyp` 源代码构建工具链。

安装原生插件后，使用以下命令启动 Gateway(网关)：

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

详细的语音日志应显示 `discord voice: opus decoder: @discordjs/opus`。如果未选择启用环境变量，或者缺少本机插件或在主机上无法加载，OpenClaw 将记录 `discord voice: opus decoder: opusscript` 并继续通过纯 JS 后备方案接收语音。

STT 加 TTS 流程：

- Discord PCM 捕获被转换为 WAV 临时文件。
- `tools.media.audio` 处理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 在响应 LLM 运行语音输出策略（该策略隐藏代理 DiscordLLM`tts`Discord 工具并请求返回文本）的同时，转录文本通过 Discord 接入和路由发送，因为 Discord 语音拥有最终的 TTS 播放权。
- `voice.model`LLM，如果设置，则仅覆盖此语音频道回合的响应 LLM。
- `voice.tts` 合并到 `messages.tts` 之上；支持流式传输的提供商会直接向播放器提供数据，否则会在加入的频道中播放生成的音频文件。

默认代理语音频道会话示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        followUsersEnabled: true,
        followUsers: ["123456789012345678"],
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

如果没有 `voice.agentSession` 块，每个语音渠道都会获得自己的路由 OpenClaw 会话。例如，`/vc join channel:234567890123456789` 与该 Discord 语音渠道的会话进行对话。实时模型仅是语音前端；实质性请求会被传递给配置的 OpenClaw 代理。如果实时模型生成了最终转录但未调用 consult 工具，OpenClaw 将强制调用 consult 作为回退方案，以使默认行为仍像与代理对话一样。

传统 STT 加 TTS 示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "stt-tts",
        model: "openai/gpt-5.4-mini",
        tts: {
          provider: "openai",
          openai: {
            model: "gpt-4o-mini-tts",
            voice: "cedar",
          },
        },
      },
    },
  },
}
```

实时双向示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
          toolPolicy: "safe-read-only",
          consultPolicy: "always",
        },
      },
    },
  },
}
```

语音作为现有 Discord 渠道会话的扩展：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "agent-proxy",
        model: "openai-codex/gpt-5.5",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

在 `agent-proxy`OpenClawDiscord 模式下，机器人会加入配置的语音频道，但 OpenClaw 代理轮次使用目标频道的正常路由会话和代理。实时语音会话会将返回的结果读回语音频道。主管代理仍可根据其工具策略使用正常的消息工具，包括在适当时发送单独的 Discord 消息。

当委托的 OpenClaw 运行处于活动状态时，新的 Discord 语音转录在开始另一个代理回合之前被视为实时运行控制。诸如“状态”、“取消那个”、“使用较小的修复”或“完成后也检查测试”之类的短语被分类为活动会话的状态、取消、引导或后续输入。状态、取消、已接受的引导和后续结果会被反馈到语音渠道中，以便呼叫者知道 OpenClaw 是否处理了该请求。

有用的目标形式：

- `target: "channel:123456789012345678"` 通过一个 Discord 文本渠道会话进行路由。
- `target: "123456789012345678"` 被视为一个渠道目标。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 通过该直接消息会话进行路由。

重度回声 OpenAI 实时示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
          bargeIn: true,
          minBargeInAudioEndMs: 500,
          consultPolicy: "always",
          providers: {
            openai: {
              interruptResponseOnInputAudio: false,
            },
          },
        },
      },
    },
  },
}
```

当模型通过开启的麦克风听到自己的 Discord 播放声音，但您仍希望通过说话打断它时，请使用此选项。OpenClaw 可以防止 OpenAI 在原始输入音频上自动中断，而 `bargeIn: true` 允许 Discord 的说话人开始事件和当前活动的说话人音频在下一个捕获的轮次到达 OpenAI 之前取消活动的实时响应。低于 `minBargeInAudioEndMs` 的 `audioEndMs` 的非常早的抢先信号被视为可能是回声/噪音并被忽略，以免模型在第一个播放帧处切断。

预期的语音日志：

- 加入时：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- 实时开始时：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 当有说话者语音时：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` 和 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 跳过过期语音时：`discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` 或 `reason=non-actionable-closing ...`
- 实时响应完成时：`discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- 播放停止/重置时：`discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- 实时咨询时：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- 代理应答时：`discord voice: agent turn answer ...`
- 排队精确语音时：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，随后是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 检测到插话时：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，随后是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- 关于实时中断：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，随后是 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- 关于被忽略的回声/噪音：`discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 关于禁用的插话功能：`discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- 关于空闲播放：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

要调试音频中断问题，请将实时语音日志作为时间线来阅读：

1. `realtime audio playback started`DiscordDiscord 表示 Discord 已开始播放助手音频。从此时起，网桥开始统计助手输出块、Discord PCM 字节、提供商实时字节以及合成音频的持续时间。
2. `realtime speaker turn opened`Discord 标记 Discord 说话者变为活跃状态。如果播放已处于活跃状态且 `bargeIn` 已启用，随后可以跟随 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 标记为该轮次说话者接收到的第一个实际音频帧。如果此处的 `outputActive=true` 或 `outputAudioMs` 非零，则表示麦克风正在发送输入，而助手回放仍处于活动状态。
4. `barge-in detected source=active-speaker-audio` 表示 OpenClaw 在助手回放处于活动状态时检测到了实时说话人音频。这对于区分真正的中断与没有有用音频的 Discord 说话人开始事件非常有用。
5. `barge-in requested reason=...` 表示 OpenClaw 要求实时提供商取消或截断活动响应。它包含 `outputAudioMs`、`outputActive` 和 `playbackChunks`，以便您可以看到在打断之前实际播放了多少助手音频。
6. `realtime audio playback stopped reason=...`Discord 是本地 Discord 播放重置点。reason 表示谁停止了播放：`barge-in`、`player-idle`、`provider-clear-audio`、`forced-agent-consult`、`stream-close` 或 `session-close`。
7. `realtime speaker turn closed` 概括了捕获的输入轮次。`chunks=0` 或 `hasAudio=false` 表示说话者轮次已开启，但没有可用的音频到达实时桥接。`interruptedPlayback=true` 表示输入轮次与助手输出重叠，并触发了插话逻辑。

有用字段：

- `outputAudioMs`：在日志行之前由实时提供商生成的助手音频时长。
- `audioMs`OpenClaw：OpenClaw 在播放停止前计算的助手音频时长。
- `elapsedMs`：打开和关闭播放流或发言人轮次之间的挂钟时间。
- `discordBytes`：发送到或从 Discord 语音接收的 48 kHz 立体声 PCM 字节。
- `realtimeBytes`：发送到或从实时提供商接收的提供商格式 PCM 字节。
- `playbackChunks`：转发给 Discord 以生成当前响应的助手音频块。
- `sinceLastAudioMs`：最后一个捕获的说话者音频帧与说话者轮次结束之间的间隔。

常见模式：

- 如果出现 `source=active-speaker-audio` 立即切断、`outputAudioMs` 较小，且附近有同一用户，通常表示扬声器回声进入了麦克风。请提高 `voice.realtime.minBargeInAudioEndMs`，降低扬声器音量，使用耳机，或设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 后跟 `speaker turn closed ... hasAudio=false` 意味着 Discord 报告了说话人开始，但没有音频到达 OpenClaw。这可能是临时的 Discord 语音事件、噪声门行为，或者客户端短暂开启了麦克风。
- `audio playback stopped reason=stream-close` 附近没有 barge-in 或 `provider-clear-audio` 意味着本地 Discord 播放流意外结束。请检查前置提供商和 Discord 播放器日志。
- `capture ignored during playback (barge-in disabled)` 表示当助手音频处于活动状态时，OpenClaw 故意丢弃了输入。如果您希望语音打断播放，请启用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或提供商 VAD 检测到语音，但 OpenClaw 没有活动的播放可中断。这不应切断音频。

凭据按组件解析：LLM 路由鉴权用于 `voice.model`，STT 鉴权用于 `tools.media.audio`，TTS 鉴权用于 `messages.tts`/`voice.tts`，以及实时提供商鉴权用于 `voice.realtime.providers` 或提供商的常规鉴权配置。

### 语音消息

Discord 语音消息显示波形预览，并且需要 OGG/Opus 音频。OpenClaw 会自动生成波形，但需要网关主机上安装 `ffmpeg` 和 `ffprobe` 来进行检查和转换。

- 提供**本地文件路径**（URL 会被拒绝）。
- 省略文本内容（Discord 会拒绝在同一负载中包含文本和语音消息）。
- 接受任何音频格式；OpenClaw 会根据需要将其转换为 OGG/Opus 格式。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排除

<AccordionGroup>
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - 启用消息内容意图 (Message Content Intent)
    - 如果依赖用户/成员解析，请启用服务器成员意图 (Server Members Intent)
    - 更改意图后重启网关

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的公会允许列表
    - 如果存在公会 `channels` 映射，则仅允许列出的频道
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

    - `groupPolicy="allowlist"` 没有匹配的频道/渠道允许列表
    - `requireMention` 配置位置错误（必须位于 `channels.discord.guilds` 或渠道条目下）
    - 发送者被频道/渠道 `users` 允许列表阻止

  </Accordion>

  <Accordion title="Discord长时间运行的 Discord 轮次或重复回复">

    典型日志：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`Discord

    Discord 网关队列调节旋钮：

    - 单账号：`channels.discord.eventQueue.listenerTimeout`
    - 多账号：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`DiscordDiscordDiscord
    - 这仅控制 Discord 网关监听器的工作，而非 Agent 轮次的生存期

    Discord 不会对已排队的 Agent 轮次应用渠道拥有的超时机制。消息监听器会立即移交，已排队的 Discord 运行会保留每个会话的顺序，直到会话/工具/运行时生命周期完成或中止该工作。

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Gateway(网关)Gateway(网关) 元数据查找超时警告"OpenClawDiscord>
    OpenClaw 在连接之前会获取 Discord `/gateway/bot`Discord 元数据。瞬态故障将回退到 Discord 的默认 Gateway(网关) URL，并在日志中受到速率限制。

    元数据超时控制项：

    - 单账号：`channels.discord.gatewayInfoTimeoutMs`
    - 多账号：`channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 未设置配置时的环境变量回退：`OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 默认值：`30000`（30 秒），最大值：`120000`

  </Accordion>

  <Accordion title="Gateway(网关)Gateway READY timeout restarts"OpenClawDiscord>
    OpenClaw 在启动期间以及运行时重连后，会等待 Discord 的网关 `READY` 事件。带有启动延迟的多账号设置可能需要比默认值更长的启动 READY 窗口。

    READY 超时配置项：

    - startup single-account: `channels.discord.gatewayReadyTimeoutMs`
    - startup multi-account: `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - startup env fallback when config is unset: `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - startup default: `15000` (15 seconds), max: `120000`
    - runtime single-account: `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - runtime multi-account: `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - runtime env fallback when config is unset: `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - runtime default: `30000` (30 seconds), max: `120000`

  </Accordion>

  <Accordion title="权限审核不匹配">
    `channels status --probe` 权限检查仅适用于数字渠道 ID。

    如果您使用 slug 键，运行时匹配仍然可以工作，但 probe 无法完全验证权限。

  </Accordion>

  <Accordion title="私信和配对问题">

    - 私信已禁用： `channels.discord.dm.enabled=false`
    - 私信策略已禁用： `channels.discord.dmPolicy="disabled"` (旧版： `channels.discord.dm.policy`)
    - 正在等待 `pairing` 模式下的配对批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    默认情况下，机器人生成的消息会被忽略。

    如果你设置了 `channels.discord.allowBots=true`，请使用严格的提及和白名单规则以避免循环行为。
    最好使用 `channels.discord.allowBots="mentions"` 来仅接受提及该机器人的机器人消息。

    OpenClaw 还附带了共享的 [bot loop protection](/zh/channels/bot-loop-protection)。每当 `allowBots` 允许机器人生成的消息到达分发时，Discord 会将入站事件映射到 `(account, channel, bot pair)` 事实，并且通用配对守卫在超出配置的事件预算后会抑制该配对。该守卫可防止以前必须由 Discord 速率限制来阻止的失控双机器人循环；它不会影响单机器人部署或保持在预算内的一次性机器人回复。

    默认设置（设置 `allowBots` 时激活）：

    - `maxEventsPerWindow: 20` -- 机器人配对可以在滑动窗口内交换 20 条消息
    - `windowSeconds: 60` -- 滑动窗口长度
    - `cooldownSeconds: 60` -- 一旦预算耗尽，任一方向的每条额外的机器人到机器人消息都将被丢弃一分钟

    在 `channels.defaults.botLoopProtection` 下配置一次共享默认值，然后当合法的工作流需要更多余量时覆盖 Discord。优先级为：

    - `channels.discord.accounts.<account>.botLoopProtection`
    - `channels.discord.botLoopProtection`
    - `channels.defaults.botLoopProtection`
    - 内置默认值

    Discord 使用通用的 `maxEventsPerWindow`、`windowSeconds` 和 `cooldownSeconds` 键。

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
    discord: {
      // Optional Discord-wide override. Account blocks override individual
      // fields and inherit omitted fields from here.
      botLoopProtection: {
        maxEventsPerWindow: 4,
      },
      accounts: {
        mantis: {
          // Mantis listens to other bots only when they mention her.
          allowBots: "mentions",
        },
        molty: {
          // Molty listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Molty write a Mantis Discord mention with the configured user id.
            Mantis: "MANTIS_DISCORD_USER_ID",
          },
          botLoopProtection: {
            // Allow up to five messages per minute before suppressing the pair.
            maxEventsPerWindow: 5,
            windowSeconds: 60,
            cooldownSeconds: 90,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 为最新版本 (`openclaw update`)，以确保存在 Discord 语音接收恢复逻辑
    - 确认 `channels.discord.voice.daveEncryption=true`（默认）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认）开始，仅在必要时进行调整
    - 观察日志中的以下内容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果在自动重新加入后故障仍然持续，请收集日志，并与上游 DAVE 接收历史记录进行对比，参见 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## 配置参考

主要参考：[Configuration reference - Discord](/zh/gateway/config-channels#discord)。

<Accordion title="高优先级 Discord 字段">

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- gateway: `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (legacy alias: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb` (caps outbound Discord uploads, default `100MB`), `retry`
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `heartbeat`, `responsePrefix`

</Accordion>

## 安全与操作

- 将 bot 令牌视为机密（在受监督环境中`DISCORD_BOT_TOKEN`为首选）。
- 授予最小特权Discord权限。
- 如果命令部署/状态过时，请重启网关并使用 `openclaw channels status --probe` 重新检查。

## 相关内容

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    将 Discord 用户与网关配对。
  </Card>
  <Card title="群组" icon="users" href="/zh/channels/groups">
    群组聊天和允许列表行为。
  </Card>
  <Card title="频道路由" icon="route" href="/zh/channels/channel-routing">
    将传入消息路由到代理。
  </Card>
  <Card title="安全性" icon="shield" href="/zh/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="多代理路由" icon="sitemap" href="/zh/concepts/multi-agent">
    将服务器和频道映射到代理。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为。
  </Card>
</CardGroup>
