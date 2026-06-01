---
summary: "DiscordDiscord 机器人支持状态、功能和配置"
read_when:
  - Working on Discord channel features
title: "DiscordDiscord"
---

通过官方 Discord Gateway 准备好接收私信和频道消息。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing" Discord>
    Discord 私信默认为配对模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复流程。
  </Card>
</CardGroup>

## 快速设置

您需要创建一个带有 bot 的新应用程序，将该 bot 添加到您的服务器，并将其与 OpenClaw 配对。我们建议将您的 bot 添加到您自己的私人服务器。如果您还没有，请先[创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="Discord创建 Discord 应用程序和 bot">
    前往 [Discord Developer Portal](https://discord.com/developers/applications) 并点击 **New Application**。将其命名为类似“OpenClaw”的名称。

    点击侧边栏上的 **Bot**。将 **Username** 设置为您为 OpenClaw 代理选择的名称。

  </Step>

  <Step title="Enable privileged intents">
    仍在 **Bot** 页面上，向下滚动到 **Privileged Gateway(网关) Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色允许列表和名称到 ID 匹配所必需）
    - **Presence Intent**（可选；仅在需要状态更新时需要）

  </Step>

  <Step title="复制你的机器人令牌">
    在 **Bot** 页面上向上滚动并点击 **Reset Token**。

    <Note>
    尽管名字叫“重置”，但这会生成你的第一个令牌——并没有任何东西被“重置”。
    </Note>

    复制该令牌并将其保存在某处。这是你的 **Bot Token**，稍后你会用到它。

  </Step>

  <Step title="生成邀请 URL 并将 bot 添加到您的服务器">
    点击侧边栏上的 **OAuth2**。您将生成一个具有正确权限的邀请 URL，以便将 bot 添加到您的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方将出现 **Bot Permissions** 部分。至少启用：

    **General Permissions**
      - View Channels
    **Text Permissions**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions（可选）

    这是普通文本渠道的基准设置。如果您计划在 Discord 主题中发布，包括创建或继续主题的论坛或媒体渠道工作流，请同时启用 **Send Messages in Threads**。
    复制底部的生成 URL，将其粘贴到您的浏览器中，选择您的服务器，然后点击 **Continue** 进行连接。您现在应该可以在 Discord 服务器中看到您的 bot 了。

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    回到 Discord 应用程序，你需要启用开发者模式以便复制内部 ID。

    1. 点击 **User Settings**（头像旁边的齿轮图标）→ **Advanced** → 打开 **Developer Mode**
    2. 右键点击侧边栏中的 **server icon** → **Copy Server ID**
    3. 右键点击 **own avatar** → **Copy User ID**

    将你的 **Server ID** 和 **User ID** 连同你的 Bot Token 一起保存——你将在下一步把这三者都发送给 OpenClaw。

  </Step>

  <Step title="Allow 私信 from server members">
    为了使配对能够正常工作，DiscordDiscord 需要允许您的机器人向您发送私信。右键单击您的 **服务器图标** → **隐私设置** → 打开 **直接消息** 开关。

    这将允许服务器成员（包括机器人）向您发送私信。如果您想通过 OpenClaw 使用 Discord 私信，请保持此设置开启。如果您仅打算使用频道，可以在配对后禁用私信。

  </Step>

  <Step title="安全设置您的机器人令牌（不要在聊天中发送）">
    您的 Discord 机器人令牌是一个秘密（就像密码一样）。在向您的代理发送消息之前，请在运行 OpenClaw 的机器上设置它。

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

    如果 OpenClaw 已经作为后台服务运行，请通过 OpenClaw Mac 应用程序或通过停止并重新启动 `openclaw gateway run` 进程来重启它。
    对于托管服务安装，请在存在 `DISCORD_BOT_TOKEN` 的 shell 中运行 `openclaw gateway install`，或者将该变量存储在 `~/.openclaw/.env` 中，以便服务在重启后可以解析 env SecretRef。
    如果您的主机被 Discord 的启动应用程序查找阻止或速率限制，请从开发者门户设置 Discord 应用程序/客户端 ID，以便启动可以跳过该 REST 调用。对于默认帐户，请使用 `channels.discord.applicationId`；当您运行多个 Discord 机器人时，请使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="配置 OpenClaw 并配对">

    <Tabs>
      <Tab title="询问您的代理">
        在任何现有渠道（例如 OpenClaw）上与您的 Telegram 代理聊天并告诉它。如果 Discord 是您的第一个渠道，请改用 CLI / 配置选项卡。

        > "我已在配置中设置了 Discord 机器人令牌。请使用用户 ID `<user_id>` 和服务器 ID `<server_id>` 完成 Discord 设置。"
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

        默认账户的环境变量回退：

```bash
DISCORD_BOT_TOKEN=...
```

        对于脚本化或远程设置，请使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 编写相同的 JSON5 块，然后在无 `--dry-run` 的情况下重新运行。支持明文 `token` 值。也支持跨 env/file/exec 提供程序的 `channels.discord.token` 的 SecretRef 值。请参阅[机密管理](/zh/gateway/secrets)。

        对于多个 Discord 机器人，请将每个机器人令牌和应用程序 ID 保留在其账户下。顶层 `channels.discord.applicationId` 由账户继承，因此仅当每个账户都应使用相同的应用程序 ID 时才在那里设置它。

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

  <Step title="Approve first 私信 pairing"Discord>
    等待网关运行，然后在 Discord 中私信你的机器人。它将回复一个配对码。

    <Tabs>
      <Tab title="Ask your agent"Discord>
        将配对码发送到你现有渠道上的 agent：

        > “批准此 Discord 配对码：`<CODE>`”
      </Tab>
      <Tab title="CLICLI">

````bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```Discord

      </Tab>
    </Tabs>

    配对码在 1 小时后过期。

    你现在应该能够通过 Discord 的私信与你的 agent 聊天。

  </Step>
</Steps>

<Note>
Token 解析是感知账户的。配置中的 Token 值优先于环境变量回退值。`DISCORD_BOT_TOKEN`DiscordOpenClaw 仅用于默认账户。
如果两个启用的 Discord 账户解析到同一个机器人 Token，OpenClaw 将只为该 Token 启动一个网关监视器。来自配置的 Token 优先于默认环境变量回退值；否则，第一个启用的账户获胜，重复的账户将被报告为已禁用。
对于高级出站调用（消息工具/渠道操作），将使用针对该调用的显式 `token`。这适用于发送和读取/探测类操作（例如读取/搜索/获取/线程/置顶/权限）。账户策略/重试设置仍来自活动运行时快照中选定的账户。
</Note>

## 推荐：设置一个服务器工作区

一旦 Discord 能够正常工作，您就可以将您的 Discord 服务器设置为一个完整的工作区，其中每个渠道都有自己的代理会话及其上下文。这对于只有您和您的机器人的私人服务器来说是推荐的。

<Steps>
  <Step title="Add your server to the guild allowlist">
    这使你的 agent 能够在你服务器的任何渠道中响应，而不仅仅是私信。

    <Tabs>
      <Tab title="Ask your agent"Discord>
        > “将我的 Discord 服务器 ID `<server_id>` 添加到 guild allowlist”
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
````

      </Tab>
    </Tabs>

  </Step>

  <Step title="Allow responses without @mention">
    默认情况下，您的代理仅在公会渠道中被 @提及 时才会响应。对于私人服务器，您可能希望它响应每条消息。

    在公会渠道中，普通回复默认会自动发布。对于共享的常驻房间，请选择加入 `messages.groupChat.visibleReplies: "message_tool"`，以便代理可以潜伏，并仅在确定渠道回复有用时才发布。这与最新一代的、可靠的工具模型（如 GPT 5.5）配合使用效果最佳。除非工具发送，否则环境房间事件保持静默。有关完整的潜伏模式配置，请参阅 [环境房间事件](/zh/channels/ambient-room-events)。

    如果 Discord 显示正在输入且日志显示使用了令牌，但没有发布消息，请检查该回合是否配置为环境房间事件或选择了加入消息工具可见回复。

    <Tabs>
      <Tab title="Ask your agent">
        > "允许我的代理在此服务器上响应而无需被 @提及"
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

        若要求消息工具发送以实现可见的群组/渠道回复，请设置 `messages.groupChat.visibleReplies: "message_tool"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="规划公会渠道中的记忆">
    默认情况下，长期记忆 (MEMORY.md) 仅在私信会话中加载。公会渠道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="询问你的代理">
        > "当我在 Discord 渠道中提问时，如果你需要 MEMORY.md 中的长期上下文，请使用 memory_search 或 memory_get。"
      </Tab>
      <Tab title="手动">
        如果你需要在每个渠道中共享上下文，请将稳定的指令放在 `AGENTS.md` 或 `USER.md` 中（它们会在每次会话时注入）。将长期笔记保留在 `MEMORY.md` 中，并使用记忆工具按需访问。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在，在您的 Discord 服务器上创建一些渠道并开始聊天。您的代理可以看到渠道名称，并且每个渠道都有自己的独立会话——因此您可以根据工作流设置 `#coding`、`#home`、`#research` 或其他合适的配置。

## 运行时模型

- Gateway(网关) 拥有 Discord 连接。
- 回复路由是确定性的：Discord 入站回复回传给 Discord。
- Discord 公会/渠道元数据作为不受信任的上下文添加到模型提示中，而不是作为用户可见的回复前缀。如果模型复制了该信封，OpenClaw 会从出站回复和未来的重放上下文中剥离复制的元数据。
- 默认情况下 (`session.dmScope=main`)，直接聊天共享代理主会话 (`agent:main:main`)。
- 频道渠道是独立的会话密钥 (`agent:<agentId>:discord:channel:<channelId>`)。
- 默认情况下会忽略群组私信 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜杠命令在独立的命令会话 (`agent:<agentId>:discord:slash:<userId>`) 中运行，同时仍将 `CommandTargetSessionKey` 传递到路由到的对话会话。
- 仅文本的 cron/heartbeat 公告投递到 Discord 仅使用一次最终助理可见的答案。当智能体发出多个可投递的有效载荷时，媒体和结构化组件有效载荷仍保持多消息形式。

## 论坛渠道

Discord 论坛和媒体渠道仅接受线程帖子。OpenClaw 支持两种创建它们的方式：

- 向论坛父频道发送消息（`channel:<forumId>`）以自动创建帖子。帖子标题使用你消息的第一行非空内容。
- 使用 `openclaw message thread create` 直接创建帖子。不要为论坛频道传递 `--message-id`。

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

论坛父频道不接受 Discord 组件。如果你需要组件，请直接发送到帖子中（`channel:<threadId>`）。

## 交互组件

OpenClaw 支持用于代理消息的 Discord 组件 v2 容器。使用消息工具时附带 `components` 载荷。交互结果将作为普通入站消息路由回代理，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮或一个选择菜单
- Select 类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，组件为一次性使用。设置 `components.reusable=true` 以允许按钮、选择和表单在过期前被多次使用。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户将收到临时拒绝通知。

组件回调默认在 30 分钟后过期。设置 `channels.discord.agentComponents.ttlMs` 以更改默认 Discord 账户的回调注册表生存时间，或设置 `channels.discord.accounts.<accountId>.agentComponents.ttlMs` 以在多账户设置中覆盖单个账户。该值以毫秒为单位，必须为正整数，且上限为 `86400000`（24 小时）。较长的 TTL 适用于需要按钮保持可用的审查或批准工作流，但它们也会延长旧 Discord 消息仍可触发操作的时间窗口。首选适合工作流的最短 TTL，并在过期的回调会令人惊讶时保持默认值。

`/model` 和 `/models` 斜杠命令会打开一个交互式模型选择器，其中包含提供商、模型和兼容的运行时下拉菜单，以及一个提交步骤。`/models add`Discord 已被弃用，现在返回弃用消息，而不是从聊天中注册模型。选择器回复是临时的，只有调用的用户可以使用它。Discord 选择菜单最多支持 25 个选项，因此当您希望选择器仅显示选定提供商（例如 `openai-codex` 或 `vllm`）的动态发现的模型时，请将 `provider/*` 条目添加到 `agents.defaults.models`。

文件附件：

- `file` 块必须指向附件引用（`attachment://<filename>`）
- 通过 `media`/`path`/`filePath` 提供附件（单个文件）；使用 `media-gallery` 处理多个文件
- 当上传名称应与附件引用匹配时，使用 `filename` 覆盖上传名称

模态表单：

- 添加最多包含 5 个字段的 `components.modal`
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
    `channels.discord.dmPolicy` 控制私信访问。`channels.discord.allowFrom` 是标准的私信允许列表。

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    如果私信策略未开放，未知用户将被阻止（或在 `pairing` 模式下被提示进行配对）。

    多账户优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 对于单个账户，`allowFrom` 优先于旧版 `dm.allowFrom`。
    - 当命名账户自己的 `allowFrom` 和旧版 `dm.allowFrom` 未设置时，它们将继承 `channels.discord.allowFrom`。
    - 命名账户不继承 `channels.discord.accounts.default.allowFrom`。

    出于兼容性原因，仍会读取旧版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom`。当 `openclaw doctor --fix` 可以在不更改访问权限的情况下进行迁移时，会将它们迁移到 `dmPolicy` 和 `allowFrom`。

    用于投递的私信目标格式：

    - `user:<id>`
    - `<@id>` 提及

    当存在默认渠道时，纯数字 ID 通常解析为渠道 ID，但为了兼容性，列在账户有效私信 `allowFrom` 中的 ID 将被视为用户私信目标。

  </Tab>

  <Tab title="Access groups"Discord>
    Discord 私信和文本命令授权可以在 `channels.discord.allowFrom` 中使用动态 `accessGroup:<name>` 条目。

    访问组名称在消息渠道之间共享。对于成员在每个渠道的常规 `allowFrom` 语法中表达的静态组，请使用 `type: "message.senders"`；当 Discord 渠道的当前 `ViewChannel` 受众应动态定义成员资格时，请使用 `type: "discord.channelAudience"`Discord。共享访问组行为在此处记录：[Access groups](/zh/channels/access-groups)。

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

    Discord 文本渠道没有单独的成员列表。`type: "discord.channelAudience"` 将成员资格建模为：在应用角色和渠道覆盖设置之后，私信发送者是配置的服务器成员，并且当前对配置的渠道拥有有效的 `ViewChannel` 权限。

    示例：允许任何可以看到 `#maintainers` 的人私信机器人，同时关闭对其他所有人的私信。

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

    查询在失败时默认拒绝。如果 Discord 返回 `Missing Access`DiscordOpenClawDiscord、成员查询失败，或者该渠道属于不同的服务器，则私信发送者将被视为未经授权。

    在使用渠道受众访问组时，请在 Discord 开发者门户中为机器人启用 **Server Members Intent**。私信不包含服务器成员状态，因此 OpenClaw 会在授权时通过 Discord REST 解析成员。

  </Tab>

  <Tab title="Guild policy">
    公会处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当存在 `channels.discord` 时，安全基线是 `allowlist`。

    `allowlist` 行为：

    - 公会必须匹配 `channels.discord.guilds`（首选 `id`，接受 slug）
    - 可选的发送者白名单：`users`（推荐使用稳定 ID）和 `roles`（仅限角色 ID）；如果配置了其中任何一个，当发送者匹配 `users` 或 `roles` 时将被允许
    - 默认情况下禁用直接名称/标签匹配；仅将 `channels.discord.dangerouslyAllowNameMatching: true` 作为应急兼容模式启用
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
````

    如果您仅设置 `DISCORD_BOT_TOKEN` 而未创建 `channels.discord` 块，运行时回退将是 `groupPolicy="allowlist"`（并在日志中发出警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="Mentions and group 私信">
    公会消息默认受提及限制。

    提及检测包括：

    - 显式机器人提及
    - 配置的提及模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`Discord)
    - 支持情况下的隐式回复机器人行为

    在编写出站 Discord 消息时，请使用规范提及语法：用户使用 `<@USER_ID>`，渠道使用 `<#CHANNEL_ID>`，角色使用 `<@&ROLE_ID>`。不要使用旧的 `<@!USER_ID>` 昵称提及形式。

    `requireMention` 按公会/渠道 (`channels.discord.guilds...`) 配置。
    `ignoreOtherMentions` 可选择丢弃提及了其他用户/角色但未提及机器人的消息（不包括 @everyone/@here）。

    群组私信：

    - 默认：忽略 (`dm.groupEnabled=false`)
    - 通过 `dm.groupChannels` 进行可选允许（渠道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的智能体路由

使用 `bindings[].match.roles`Discord 根据角色 ID 将 Discord 公会成员路由到不同的代理。基于角色的绑定仅接受角色 ID，并在对等或父对等绑定之后、仅公会绑定之前进行评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有配置的字段都必须匹配。

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

- `commands.native` 默认为 `"auto"`Discord 并且已针对 Discord 启用。
- 每个渠道的覆盖设置：`channels.discord.commands.native`。
- `commands.native=false`DiscordDiscordDiscord 跳过启动期间的 Discord 斜杠命令注册和清理。之前注册的命令可能在 Discord 中仍然可见，直到您从 Discord 应用中将其删除。
- 原生命令身份验证使用与普通消息处理相同的 Discord 允许列表/策略。
- 对于未授权的用户，命令在 Discord 界面中仍然可见；执行仍然会强制执行 OpenClaw 授权并返回“未授权”。

有关命令目录和行为，请参阅 [斜杠命令](/zh/tools/slash-commands)。

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
    `first` 始终将隐式原生回复引用附加到该轮次的第一个发出的 Discord 消息。
    `batched` 仅当传入事件是去抖动的多消息批次时，才附加 Discord 的隐式原生回复引用。这很有用
    当您主要希望原生回复用于模棱两可的突发聊天，而不是每
    个单消息轮次时。

    消息 ID 会显示在上下文/历史记录中，以便代理可以定位特定消息。

  </Accordion>

  <Accordion title="链接预览">
    Discord 默认为 URL 生成丰富的链接嵌入。OpenClaw 默认会在发出的 Discord 消息上抑制这些生成的嵌入，因此代理发送的 URL 保持为纯链接，除非您选择启用：

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    设置 `channels.discord.accounts.<id>.suppressEmbeds` 可以覆盖单个账户。代理消息工具发送也可以为单条消息传递 `suppressEmbeds: false`。显式的 Discord `embeds` 有效载荷不会受到默认链接预览设置的抑制。

  </Accordion>

  <Accordion title="实时流预览">
    OpenClaw 可以通过发送临时消息并在文本到达时编辑它来流式传输草稿回复。`channels.discord.streaming` 接受 `off` | `partial` | `block` | `progress`（默认值）。`progress` 保留一个可编辑的状态草稿，并使用工具进度更新它，直到最终交付；共享的起始标签是一个滚动行，因此一旦出现足够的工作，它就会像其余部分一样滚动消失。`streamMode` 是一个遗留的运行时别名。运行 `openclaw doctor --fix` 将持久化的配置重写为规范键。

    将 `channels.discord.streaming.mode` 设置为 `off` 以禁用 Discord 预览编辑。如果明确启用了 Discord 分块流式传输，OpenClaw 将跳过预览流以避免双重流式传输。

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
          commentary: false,
        },
      },
    },
  },
}
```

    - `partial` 在 token 到达时编辑单个预览消息。
    - `block` 发出草稿大小的块（使用 `draftChunk` 调整大小和断点，限制为 `textChunkLimit`）。
    - 媒体、错误和显式回复最终结果会取消挂起的预览编辑。
    - `streaming.preview.toolProgress`（默认为 `true`）控制工具/进度更新是否重用预览消息。
    - 工具/进度行在可用时渲染为紧凑的表情符号 + 标题 + 细节，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.progress.commentary`（默认为 `false`） 选择在临时进度草稿中包含助手评论/前言文本。评论在显示前会被清理，保持瞬态，并且不会改变最终答案的交付。
    - `streaming.progress.maxLineChars` 控制每行进度预览的预算。散文在单词边界处被缩短；命令和路径细节保留有用的后缀。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制紧凑进度行中的命令/exec细节：`raw`（默认）或 `status`（仅工具标签）。

    在保留紧凑进度行的同时隐藏原始命令/exec文本：

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

    预览流式传输仅限文本；媒体回复回退到正常交付。当明确启用 `block` 流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

  </Accordion>

  <Accordion title="历史记录、上下文和线程行为">
    公会历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    私信历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`Discord

    线程行为：

    - Discord 线程作为渠道会话进行路由，并继承父渠道配置，除非被覆盖。
    - 线程会话将父渠道的会话级 `/model` 选择作为仅模型回退继承；线程本地的 `/model` 选择仍然优先，并且除非启用了抄本继承，否则不会复制父渠道的抄本历史。
    - `channels.discord.thread.inheritParent`（默认 `false`）选择从父渠道抄本中为新的自动线程提供种子。按账户的覆盖设置位于 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 消息工具反应可以解析 `user:<id>` 私信目标。
    - `guilds.<guild>.channels.<channel>.requireMention: false` 在回复阶段激活回退期间被保留。

    渠道主题作为**不受信任**的上下文被注入。允许列表控制谁可以触发代理，而不是完整的补充上下文编辑边界。

  </Accordion>

  <Accordion title="子代理的线程绑定会话"Discord>
    Discord 可以将线程绑定到会话目标，以便该线程中的后续消息继续路由到同一会话（包括子代理会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子代理/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活跃运行和绑定状态
    - `/session idle <duration|off>` 检查/更新聚焦绑定的非活动自动取消聚焦
    - `/session max-age <duration|off>` 检查/更新聚焦绑定的硬性最大存在时间

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
    - `channels.discord.threadBindings.*`Discord 覆盖 Discord 行为。
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 线程生成的自动创建/绑定线程。默认值：`true`。
    - `defaultSpawnContext` 控制线程绑定生成的原生子代理上下文。默认值：`"fork"`。
    - 已弃用的 `spawnSubagentSessions`/`spawnAcpSessions` 键已由 `openclaw doctor --fix` 迁移。
    - 如果为帐户禁用了线程绑定，则 `/focus` 和相关的线程绑定操作将不可用。

    参见 [Sub-agents](/zh/tools/subagents)、[ACP Agents](/zh/tools/acp-agents) 和 [Configuration Reference](/zh/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP 渠道 bindings"Discord>
    对于稳定的“常驻”ACP 工作区，请配置针对 Discord 会话的顶级类型化 ACP 绑定。

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

    - `/acp spawn codex --bind here` 会就地绑定当前渠道或子线程，并将未来的消息保留在同一个 ACP 会话中。子线程消息会继承父渠道的绑定。
    - 在已绑定的渠道或子线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。临时的子线程绑定在激活期间可以覆盖目标解析。
    - `spawnSessions` 通过 `--thread auto|here` 限制子线程的创建/绑定。

    有关绑定行为的详细信息，请参阅 [ACP Agents](/zh/tools/acp-agents)。

  </Accordion>

  <Accordion title="Reaction notifications">
    每个服务器的反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`Discord）

    反应事件会被转换为系统事件，并附加到路由后的 Discord 会话中。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 处理传入消息时，`ackReaction`OpenClaw 会发送一个确认表情符号。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - Agent 身份表情符号回退（`agents.list[].identity.emoji`Discord，否则为“👀”）

    注意事项：

    - Discord 接受 Unicode 表情符号或自定义表情符号名称。
    - 使用 `""` 可禁用某个渠道或帐户的反应。

  </Accordion>

  <Accordion title="Config writes">
    默认启用频道发起的配置写入。

    这会影响 `/config set|unset` 流程（当启用命令功能时）。

    如需禁用：

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
    通过带有 `channels.discord.proxy` 的 HTTP(S) 代理路由 Discord 网关 WebSocket 流量和启动 REST 查找（应用程序 ID + allowlist 解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    每帐户覆盖：

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

    注意：

    - allowlists 可以使用 `pk:<memberId>`
    - 仅在 `channels.discord.dangerouslyAllowNameMatching: true` 时按名称/slug 匹配成员显示名称
    - 查找使用原始消息 ID 并受时间窗口限制
    - 如果查找失败，代理消息将被视为机器人消息并被丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    当代理需要对已知 Discord 用户进行确定性出站提及（mentions）时，请使用 `mentionAliases`。键是不带前缀 `@` 的句柄（handles）；值为 Discord 用户 ID。未知的句柄、`@everyone`、`@here` 以及 Markdown 代码跨度内的提及将保持不变。

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

    - 0: 正在游戏
    - 1: 正在直播 (requires `activityUrl`)
    - 2: 正在聆听
    - 3: 正在观看
    - 4: 自定义 (使用活动文本作为状态状态；表情符号是可选的)
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

    自动状态将运行时可用性映射到 Discord 状态：健康 => 在线，降级或未知 => 空闲，耗尽或不可用 => 请勿打扰。可选文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (supports `{reason}` placeholder)

  </Accordion>

  <Accordion title="DiscordDiscord 中的审批"Discord>
    Discord 支持在私信中基于按钮的审批处理，并可以选择在原始渠道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可选；尽可能回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`Discord

    当 `enabled` 未设置或为 `"auto"` 且至少能解析到一个审批者（无论是从 `execApprovals.approvers` 还是从 `commands.ownerAllowFrom`Discord）时，Discord 会自动启用原生执行审批。Discord 不会从渠道 `allowFrom`、旧版 `dm.allowFrom` 或直接消息 `defaultTo` 推断执行审批者。设置 `enabled: false`Discord 可明确禁用 Discord 作为原生审批客户端。

    对于敏感的仅限所有者的组命令（如 `/diagnostics` 和 `/export-trajectory`OpenClawDiscordDiscord），OpenClaw 会私下发送审批提示和最终结果。如果调用的所有者拥有 Discord 所有者路由，它会首先尝试 Discord 私信；如果不可用，则回退到 `commands.ownerAllowFrom`Telegram 中的第一个可用所有者路由，例如 Telegram。

    当 `target` 为 `channel` 或 `both`OpenClawDiscordDiscordOpenClaw 时，审批提示在渠道中可见。只有已解析的审批者可以使用这些按钮；其他用户会收到临时的拒绝通知。审批提示包含命令文本，因此请仅在可信渠道中启用渠道传递。如果无法从会话密钥派生渠道 ID，OpenClaw 将回退到私信传递。

    Discord 还会呈现其他聊天渠道使用的共享审批按钮。Discord 原生适配器主要增加了审批者私信路由和渠道分发。
    当这些按钮存在时，它们是主要的审批用户体验；OpenClaw
    应仅在工具结果表明聊天审批不可用或手动审批是唯一途径时，才包含手动 `/approve`DiscordOpenClaw 命令。
    如果 Discord 原生审批运行时未激活，OpenClaw 会保持
    本地确定性 `/approve <id> <decision>`OpenClaw 提示可见。如果
    运行时处于活动状态但无法向任何目标传递原生卡片，
    OpenClaw 将发送同聊回退通知，并附带来自待处理审批的精确 `/approve`Gateway(网关)Gateway(网关)
    命令。

    Gateway(网关) 身份验证和审批解析遵循共享的 Gateway 客户端合约（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve` 解析）。审批默认在 30 分钟后过期。

    参见 [Exec approvals](/zh/tools/exec-approvals)。

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

| 操作组                                                                                                                                                                   | 默认   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已启用 |
| 角色                                                                                                                                                                     | 已禁用 |
| 审核                                                                                                                                                                     | 已禁用 |
| 状态                                                                                                                                                                     | 已禁用 |

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
```

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
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

注意：

- `voice.tts` 仅针对 `stt-tts` 语音播放覆盖 `messages.tts`。实时模式使用 `voice.realtime.speakerVoice`。
- `voice.mode` 控制对话路径。默认为 `agent-proxy`：实时语音前端处理轮次计时、中断和播放，将实质性工作通过 `openclaw_agent_consult` 委派给路由的 OpenClaw 代理，并将结果视为来自该发言者的键入 Discord 提示。`stt-tts` 保留旧的批量 STT 加 TTS 流程。`bidi` 允许实时模型直接对话，同时为 OpenClaw 大脑暴露 `openclaw_agent_consult`。
- `voice.agentSession` 控制哪个 OpenClaw 会话接收语音轮次。如果不设置，则使用语音渠道自己的会话；或者设置 `{ mode: "target", target: "channel:<text-channel-id>" }` 以使语音渠道充当现有 Discord 文本渠道会话（例如 `#maintainers`）的麦克风/扬声器扩展。
- `voice.model` 覆盖 OpenClaw 代理大脑以处理 Discord 语音响应和实时咨询。如果不设置，则继承路由代理模型。它与 `voice.realtime.model` 是分开的。
- `voice.followUsers` 允许机器人加入、移动和离开与选定用户的 Discord 语音。有关行为规则和示例，请参阅[在语音中跟随用户](#follow-users-in-voice)。
- `agent-proxy` 通过 `discord-voice` 路由语音，这为发言者和目标会话保留了正常的所有者/工具授权，但由于 Discord 语音拥有播放控制权，因此隐藏了代理 `tts` 工具。默认情况下，`agent-proxy` 为所有者发言者（`voice.realtime.toolPolicy: "owner"`）提供完全等同于所有者的工具访问权限，并强烈倾向于在给出实质性答案之前咨询 OpenClaw 代理（`voice.realtime.consultPolicy: "always"`）。在该默认 `always` 模式下，实时层不会在咨询答案之前自动说填充语；它会捕获并转录语音，然后说出路由后的 OpenClaw 答案。如果在 Discord 仍在播放第一个答案时完成了多个强制咨询答案，则后续的精确语音答案将被排队，直到播放空闲，而不是在句子中间替换语音。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不影响转录。
- 在实时模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.speakerVoice` 配置实时音频会话。对于 OpenAI Realtime 2 加上 Codex 大脑，请使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai-codex/gpt-5.5"`。
- 实时语音模式默认在实时提供商指令中包含小的 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 配置文件，以便快速直接轮次保持与路由的 OpenClaw 代理相同的身份、用户基础和角色。将 `voice.realtime.bootstrapContextFiles` 设置为子集以自定义此行为，或设置为 `[]` 以禁用它。支持的实时引导文件仅限于那些配置文件；`AGENTS.md` 保留在正常的代理上下文中。注入的配置文件上下文不会替代 `openclaw_agent_consult` 用于工作区工作、当前事实、内存查找或工具支持的操作。
- 在 OpenAI `agent-proxy` 实时模式下，设置 `voice.realtime.requireWakeName: true` 以使 Discord 实时语音保持静音，直到转录内容以唤醒名称开始或结束。配置的唤醒名称必须是一个或两个词。如果未设置 `voice.realtime.wakeNames`，OpenClaw 将使用路由代理的 `name` 加上 `OpenClaw`，并回退到代理 id 加上 `OpenClaw`。唤醒名称门禁会禁用实时提供商自动响应，通过 OpenClaw 代理咨询路径路由接受的轮次，并在最终转录到达之前，从部分转录中识别出前导唤醒名称时给予简短的语音确认。
- OpenAI 实时提供商接受当前的 Realtime 2 事件名称以及旧的 Codex 兼容别名，用于输出音频和转录事件，因此兼容的提供商快照可以在不丢失助手音频的情况下发生偏移。
- `voice.realtime.bargeIn` 控制是否允许 Discord 发言人开始事件中断活跃的实时播放。如果未设置，则遵循实时提供商的输入音频中断设置。
- `voice.realtime.minBargeInAudioEndMs` 控制在 OpenAI 实时插话截断音频之前的最小助手播放时长。默认值：`250`。在低回声房间中设置为 `0` 可实现立即中断，或在回声较大的扬声器设置中调高该值。
- 对于 OpenAI 上的 Discord 语音播放，请设置 `voice.tts.provider: "openai"` 并在 `voice.tts.providers.openai.speakerVoice` 下选择一个文本转语音语音。`cedar` 是当前 OpenAI TTS 模型上一个听起来不错的男性声音选择。
- 针对每个 Discord 的 `systemPrompt` 覆盖适用于该语音频道的语音转录轮次。
- 语音转录回合从 Discord Discord`allowFrom` （或 `dm.allowFrom` ）派生所有者状态，用于所有者受限的命令和渠道操作。代理工具可见性遵循路由会话的配置工具策略。
- 对于纯文本配置，Discord 语音是可选的；设置 Discord`channels.discord.voice.enabled=true` （或保留现有的 `channels.discord.voice` 块）以启用 `/vc` 命令、语音运行时以及 `GuildVoiceStates` 网关意图。
- `channels.discord.intents.voiceStates` 可以显式覆盖语音状态意图订阅。如果未设置，该意图将遵循有效的语音启用设置。
- 如果 `voice.autoJoin`OpenClaw 针对同一公会有多个条目，OpenClaw 将加入该公会的最后配置的渠道。
- `voice.allowedChannels` 是一个可选的驻留白名单。如果不设置，允许 `/vc join`Discord 加入任何授权的 Discord 语音渠道。设置后，`/vc join`、启动时自动加入和机器人语音状态移动将仅限于列出的 `{ guildId, channelId }`DiscordDiscordOpenClaw 条目。将其设置为空数组以拒绝所有 Discord 语音加入。如果 Discord 将机器人移出白名单，OpenClaw 将离开该渠道，并在有可用配置时重新加入配置的自动加入目标。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 会传递给 `@discordjs/voice` 加入选项。
- 如果未设置，`@discordjs/voice` 默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 使用捆绑的 OpenClaw`libopus-wasm`Discord 编解码器进行 Discord 语音接收和实时原始 PCM 播放。它附带一个固定的 libopus WebAssembly 构建，不需要原生 opus 插件。
- `voice.connectTimeoutMs` 控制 `/vc join` 和自动加入尝试的初始 `@discordjs/voice` Ready 等待时间。默认值：`30000`。
- `voice.reconnectGraceMs` 控制 OpenClaw 在断开连接的语音会话开始重新连接之前等待多长时间，然后销毁它。默认值：`15000`。
- 在 `stt-tts` 模式下，仅因为另一个用户开始说话并不会停止语音播放。为了避免反馈回路，在 TTS 播放期间 OpenClaw 会忽略新的语音捕捉；请在播放结束后说话以进行下一轮对话。实时模式将说话者开始作为插话信号转发给实时提供商。
- 在实时模式下，扬声器声音进入打开的麦克风可能看起来像插话并中断播放。对于回声严重的 Discord 房间，请设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防止 OpenAI 在输入音频上自动中断。如果您仍然希望 Discord 说话者开始事件中断活动播放，请添加 `voice.realtime.bargeIn: true`。OpenAI 实时网桥会忽略短于 `voice.realtime.minBargeInAudioEndMs` 的播放截断，将其视为可能的回声/噪声，并将其记录为跳过，而不是清除 Discord 播放。
- `voice.captureSilenceGraceMs` 控制 OpenClaw 在 Discord 报告说话者已停止后等待多长时间，然后再为 STT 确定该音频片段。默认值：`2000`；如果 Discord 将正常停顿分割成不连贯的部分转录，请增加此值。
- 当选择 ElevenLabs 作为 TTS 提供商时，Discord 语音播放使用流式 TTS 并从提供商响应流开始。不支持流式的提供商会回退到合成的临时文件路径。
- 如果在短时间内反复出现接收解密失败，OpenClaw 也会进行监听并通过离开/重新加入语音渠道来自动恢复。
- 如果更新后接收日志反复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，请收集依赖项报告和日志。捆绑的 `@discordjs/voice` 行包含来自 discord.js PR #11449 的上游填充修复，该修复关闭了 discord.js 问题 #11419。
- 当 OpenClaw 完成捕获的说话者片段时，预计会出现 `The operation was aborted` 接收事件；它们是详细的诊断信息，而不是警告。
- 详细的 Discord 语音日志包含每个接受的说话人片段的单行 STT 转录预览，因此调试会同时显示用户端和代理回复端，而无需倾倒无限制的转录文本。
- 在 `agent-proxy` 模式下，强制回退会跳过可能不完整的转录片段，例如以 `...` 结尾的文本或像 `and` 这样的尾随连接词，以及明显的非操作性结束语，如“马上回来”或“再见”。当这阻止了过时的排队回答时，日志会显示 `forced agent consult skipped reason=...`。

### 在语音中跟随用户

当您希望 Discord 语音机器人跟随一个或多个已知 Discord 用户，而不是在启动时加入固定渠道或等待 `/vc join` 时，请使用 `voice.followUsers`DiscordDiscord。

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
- 当配置了 `followUsers` 时，`followUsersEnabled` 默认为 `true`。将其设置为 `false` 以保留保存的列表，但停止自动语音跟随。
- 当被关注的用户加入允许的语音频道时，OpenClaw 会加入该频道。当用户移动时，OpenClaw 会跟随移动。当当前被关注的用户断开连接时，OpenClaw 会离开。
- 如果多个被关注的用户在同一个公会中，且当前活跃的被关注用户离开，OpenClaw 会在离开公会之前移动到另一个被追踪的被关注用户的渠道。如果几个被关注的用户同时移动，则以最新观察到的语音状态事件为准。
- `allowedChannels` 仍然适用。处于不允许渠道中的被跟随用户将被忽略，并且属于跟随的会话将移动到另一个被跟随的用户或离开。
- OpenClaw 会在启动时和有界间隔内协调错过的语音状态事件。协调会对配置的公会进行采样，并限制每次运行的 REST 查找次数，因此非常大的 OpenClaw`followUsers` 列表可能需要一个以上的间隔才能完成收敛。
- 如果 Discord 或管理员在机器人跟随用户时移动了机器人，OpenClaw 将在目标允许时重建语音会话并保留跟随所有权。如果机器人被移出 DiscordOpenClaw`allowedChannels`OpenClaw，OpenClaw 将离开并在存在配置的目标时重新加入该目标。
- DAVE 接收恢复可能会在重复解密失败后离开并重新加入同一渠道。跟随拥有的会话通过该恢复路径保持其跟随所有权，因此后续被跟随用户的断开连接仍会离开该渠道。

在加入模式之间选择：

- 对于个人或操作员设置，当您在场时机器人应自动处于语音状态，请使用 `followUsers`。
- 对于固定房间机器人，即使没有跟踪的用户在语音中也应存在，请使用 `autoJoin`。
- 对于一次性加入或自动语音在场会令人惊讶的房间，请使用 `/vc join`。

Discord 语音编解码器：

- 语音接收日志显示 `discord voice: opus decoder: libopus-wasm`。
- 实时播放会将原始 48 kHz 立体声 PCM 编码为 Opus，并在将数据包移交给 `@discordjs/voice` 之前，使用相同的捆绑 `libopus-wasm` 包。
- 文件和提供商流播放会使用 ffmpeg 转码为原始 48 kHz 立体声 PCM，然后使用 `libopus-wasm`Discord 处理发送到 Discord 的 Opus 数据包流。

STT 加 TTS 流程：

- Discord PCM 捕获被转换为 WAV 临时文件。
- `tools.media.audio` 处理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 转录文本通过 Discord 接入和路由发送，同时响应 LLM 运行时采用语音输出策略，该策略隐藏代理 DiscordLLM`tts`Discord 工具并要求返回文本，因为 Discord 语音拥有最终的 TTS 播放权。
- `voice.model`LLM 如果设置，将仅覆盖此语音轮次中的响应 LLM。
- `voice.tts` 会与 `messages.tts` 合并；支持流式传输的提供商会直接向播放器供流，否则生成的音频文件将在已加入的频道中播放。

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
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

如果没有 `voice.agentSession`OpenClaw 块，每个语音渠道都会获得自己的路由 OpenClaw 会话。例如，`/vc join channel:234567890123456789`DiscordOpenClawOpenClaw 与该 Discord 语音渠道的会话对话。实时模型只是语音前端；实质性请求会移交给配置的 OpenClaw 代理。如果实时模型生成的最终转录未调用 consult 工具，OpenClaw 会强制进行 consult 作为回退，以使默认行为仍像与代理对话一样。

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
          providers: {
            openai: {
              model: "gpt-4o-mini-tts",
              speakerVoice: "cedar",
            },
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
          speakerVoice: "cedar",
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
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

在 `agent-proxy`OpenClawDiscord 模式下，机器人会加入配置的语音渠道，但 OpenClaw 代理轮次使用目标渠道的常规路由会话和代理。实时语音会话会将返回的结果说回语音渠道。主管代理仍可根据其工具策略使用常规消息工具，包括在适当情况下发送单独的 Discord 消息。

当委托的 OpenClaw 运行处于活动状态时，新的 Discord 语音转录在开始另一个代理回合之前被视为实时运行控制。诸如“状态”、“取消那个”、“使用较小的修复”或“完成后也检查测试”之类的短语被分类为活动会话的状态、取消、引导或后续输入。状态、取消、已接受的引导和后续结果会被反馈到语音渠道中，以便呼叫者知道 OpenClaw 是否处理了该请求。

有用的目标形式：

- `target: "channel:123456789012345678"`Discord 通过 Discord 文本渠道会话进行路由。
- `target: "123456789012345678"` 被视为渠道目标。
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
          speakerVoice: "cedar",
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

当模型通过打开的麦克风听到自己的 Discord 播放内容，但您仍想通过说话来打断它时，请使用此功能。OpenClaw 可防止 OpenAI 在原始输入音频上自动中断，而 DiscordOpenClawOpenAI`bargeIn: true`DiscordOpenAI 允许 Discord 扬声器启动事件和已活动的扬声器音频在下一个捕获的轮次到达 OpenAI 之前取消活动的实时响应。低于 `minBargeInAudioEndMs` 的 `audioEndMs` 的极早期打断信号被视为可能是回声/噪音并被忽略，因此模型不会在第一个播放帧处截断。

预期的语音日志：

- 加入时：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- 实时开始时：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 扬声器音频播放时：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` 和 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 跳过过时语音时：`discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` 或 `reason=non-actionable-closing ...`
- 实时响应完成时：`discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- 播放停止/重置时：`discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- 实时咨询时：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- 代理应答时：`discord voice: agent turn answer ...`
- 排队精确语音时：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，随后是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 检测到打断时：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，随后是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- 实时中断时：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，随后是 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- 忽略回声/噪音时：`discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 禁用打断时：`discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- 空闲播放时：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

要调试音频中断问题，请将实时语音日志作为时间线来阅读：

1. `realtime audio playback started`DiscordDiscord 表示 Discord 已开始播放助手音频。网桥从此时开始统计助手输出块、Discord PCM 字节、提供商实时字节和合成音频持续时间。
2. `realtime speaker turn opened`Discord 标记 Discord 演讲者变为活跃状态。如果播放已处于活跃状态且启用了 `bargeIn`，随后可能会发生 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 标记针对该演讲轮次收到的首个实际音频帧。此处的 `outputActive=true` 或非零 `outputAudioMs` 表示在助手播放仍处于活跃状态时，麦克风正在发送输入。
4. `barge-in detected source=active-speaker-audio`OpenClawDiscord 表示 OpenClaw 在助手播放处于活跃状态时检测到了实时演讲者音频。这对于区分真正的中断与没有有效音频的 Discord 演讲者开始事件非常有用。
5. `barge-in requested reason=...`OpenClaw 表示 OpenClaw 已请求实时提供商取消或截断当前活跃的响应。它包含 `outputAudioMs`、`outputActive` 和 `playbackChunks`，以便您查看在中断之前实际播放了多少助手音频。
6. `realtime audio playback stopped reason=...`Discord 是本地 Discord 播放重置点。原因指明了谁停止了播放：`barge-in`、`player-idle`、`provider-clear-audio`、`forced-agent-consult`、`stream-close` 或 `session-close`。
7. `realtime speaker turn closed` 汇总了捕获的输入轮次。`chunks=0` 或 `hasAudio=false` 表示演讲轮次已开启但没有有效音频到达实时网桥。`interruptedPlayback=true` 表示输入轮次与助手输出重叠并触发了插话（barge-in）逻辑。

有用字段：

- `outputAudioMs`：实时提供商在日志行之前生成的助手音频持续时间。
- `audioMs`：在播放停止前 OpenClaw 统计的助手音频时长。
- `elapsedMs`：打开和关闭播放流或发言人轮次之间的挂钟时间。
- `discordBytes`：发送到 Discord 语音或从 Discord 语音接收的 48 kHz 立体声 PCM 字节。
- `realtimeBytes`：发送到实时提供商或从实时提供商接收的提供商格式 PCM 字节。
- `playbackChunks`：为当前响应转发给 Discord 的助手音频块。
- `sinceLastAudioMs`：最后捕获的发言人音频帧与发言人轮次结束之间的间隔。

常见模式：

- 如果 `source=active-speaker-audio` 立即中断，`outputAudioMs` 较小，且附近有同一用户，通常表示扬声器回声进入了麦克风。请调高 `voice.realtime.minBargeInAudioEndMs`，降低扬声器音量，使用耳机，或设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 后跟随 `speaker turn closed ... hasAudio=false` 表示 Discord 报告了发言人开始，但没有音频到达 OpenClaw。这可能是暂时的 Discord 语音事件、噪声门行为，或者是客户端短暂按下了麦克风键。
- 如果没有附近的插话或 `provider-clear-audio` 而出现 `audio playback stopped reason=stream-close`，意味着本地 Discord 播放流意外结束。请检查前面的提供商和 Discord 播放器日志。
- `capture ignored during playback (barge-in disabled)` 表示 OpenClaw 在助手音频处于活动状态时故意丢弃了输入。如果您希望语音打断播放，请启用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或提供商 VAD 检测到了语音，但 OpenClaw 没有要中断的活动播放。这不应切断音频。

凭据是按组件解析的：`voice.model` 的 LLM 路由身份验证，`tools.media.audio` 的 STT 身份验证，`messages.tts`/`voice.tts` 的 TTS 身份验证，以及 `voice.realtime.providers` 或提供商的正常身份验证配置的实时提供商身份验证。

### 语音消息

Discord 语音消息显示波形预览并需要 OGG/Opus 音频。OpenClaw 会自动生成波形，但需要网关主机上有 `ffmpeg` 和 `ffprobe` 来进行检查和转换。

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
    - 当您依赖用户/成员解析时，启用服务器成员意图 (Server Members Intent)
    - 更改意图后重启网关

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的 guild 允许列表
    - 如果 guild `channels` 映射存在，则仅允许列出的渠道
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

    - `groupPolicy="allowlist"` 没有匹配的 guild/渠道 允许列表
    - `requireMention` 配置在错误的位置（必须在 `channels.discord.guilds` 或 渠道 条目下）
    - 发送者被 guild/渠道 `users` 允许列表阻止

  </Accordion>

  <Accordion title="Discord长时间运行的 Discord 轮次或重复回复">

    典型日志：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`Discord

    Discord 网关队列控制：

    - 单账户： `channels.discord.eventQueue.listenerTimeout`
    - 多账户： `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`DiscordDiscordDiscord
    - 这仅控制 Discord 网关监听器工作，而非代理轮次生命周期

    Discord 不会对已排队的代理轮次应用渠道拥有的超时。消息监听器立即移交，且排队的 Discord 运行保留每个会话的顺序，直到会话/工具/运行时生命周期完成或中止工作。

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

  <Accordion title="Gateway(网关)网关元数据查找超时警告"OpenClawDiscord>
    OpenClaw 在连接之前获取 Discord `/gateway/bot`Discord 元数据。瞬态故障会回退到 Discord 的默认网关 URL，并在日志中受到速率限制。

    元数据超时控制：

    - 单账户： `channels.discord.gatewayInfoTimeoutMs`
    - 多账户： `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 配置未设置时的环境变量回退： `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 默认值： `30000` (30 秒)，最大值： `120000`

  </Accordion>

  <Accordion title="Gateway(网关)Gateway(网关) READY 超时重启"OpenClawDiscord>
    OpenClaw 在启动期间和运行时重新连接后会等待 Discord 的网关 `READY` 事件。具有启动交错的多账号设置可能需要比默认值更长的启动 READY 窗口。

    READY 超时控制项：

    - 启动单账号：`channels.discord.gatewayReadyTimeoutMs`
    - 启动多账号：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 配置未设置时的启动环境回退：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 启动默认值：`15000`（15 秒），最大值：`120000`
    - 运行时单账号：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 运行时多账号：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 配置未设置时的运行时环境回退：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 运行时默认值：`30000`（30 秒），最大值：`120000`

  </Accordion>

  <Accordion title="权限审核不匹配">
    `channels status --probe` 权限检查仅适用于数字渠道 ID。

    如果您使用 slug 键，运行时匹配可能仍然有效，但探针无法完全验证权限。

  </Accordion>

  <Accordion title="私信和配对问题">

    - 私信已禁用：`channels.discord.dm.enabled=false`
    - 私信策略已禁用：`channels.discord.dmPolicy="disabled"`（旧版：`channels.discord.dm.policy`）
    - 正在等待 `pairing` 模式下的配对批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    默认情况下，机器人发送的消息会被忽略。

    如果您设置了 `channels.discord.allowBots=true`，请使用严格的提及和白名单规则以避免循环行为。
    建议优先使用 `channels.discord.allowBots="mentions"`，以仅接受提及该机器人的机器人消息。

    OpenClaw 还附带了共享的 [bot loop protection](/zh/channels/bot-loop-protection)。每当 `allowBots` 允许机器人发送的消息到达调度时，Discord 会将传入事件映射到 `(account, channel, bot pair)` 事实，并且通用配对守护进程在超出配置的事件预算后会抑制该配对。该守护进程可以防止以前必须由 Discord 速率限制来阻止的失控双机器人循环；它不会影响单机器人部署或保持在预算范围内的一次性机器人回复。

    默认设置（在设置 `allowBots` 时激活）：

    - `maxEventsPerWindow: 20` -- 机器人配对可以在滑动窗口内交换 20 条消息
    - `windowSeconds: 60` -- 滑动窗口长度
    - `cooldownSeconds: 60` -- 一旦预算耗尽，任何一个方向上的每一条额外的机器人对机器人消息都将被丢弃一分钟

    在 `channels.defaults.botLoopProtection` 下配置一次共享默认值，然后在合法工作流需要更多空间时覆盖 Discord。优先顺序如下：

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
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认值）开始，仅在必要时进行调整
    - 观察日志中的以下内容：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后故障仍然持续，请收集日志并与 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449) 中的上游 DAVE 接收历史记录进行比较

  </Accordion>
</AccordionGroup>

## 配置参考

主要参考：[配置参考 - Discord](/zh/gateway/config-channels#discord)。

<Accordion title="重要的 Discord 字段">

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- gateway: `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (legacy alias: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb` (限制对外 Discord 上传，默认为 `100MB`), `retry`
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, 顶级 `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `heartbeat`, `responsePrefix`

</Accordion>

## 安全与操作

- 请将机器人令牌视为机密（在受监督的环境中 `DISCORD_BOT_TOKEN` 为首选）。
- 授予最小特权Discord权限。
- 如果命令部署/状态过时，请重启网关并使用 `openclaw channels status --probe` 重新检查。

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
    将服务器和频道映射到代理。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/zh/tools/slash-commands">
    原生命令行为。
  </Card>
</CardGroup>
