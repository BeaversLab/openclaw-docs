---
summary: "DiscordDiscord 机器人支持状态、功能和配置"
read_when:
  - Working on Discord channel features
title: "DiscordDiscord"
---

通过官方 Discord Gateway 准备好接收私信和频道消息。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing" Discord>
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

您需要创建一个带有机器人的新应用程序，将机器人添加到您的服务器，并将其与 OpenClaw 配对。我们建议将您的机器人添加到您自己的私人服务器。如果您还没有私人服务器，请[先创建一个](OpenClawhttps://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="创建一个 Discord 应用程序和机器人">
    前往 [Discord 开发者门户](https://discord.com/developers/applications) 并点击 **New Application**。将其命名为类似“OpenClaw”的名称。

    点击侧边栏上的 **Bot**。将 **Username** 设置为您为 OpenClaw 代理指定的名称。

  </Step>

  <Step title="启用特权意图">
    仍然在 **Bot** 页面上，向下滚动到 **Privileged Gateway(网关) Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色白名单和名称到 ID 的匹配所必需）
    - **Presence Intent**（可选；仅在需要状态更新时需要）

  </Step>

  <Step title="复制你的 Bot 令牌">
    在 **Bot** 页面上向上滚动，点击 **Reset Token**。

    <Note>
    尽管名称如此，但这会生成你的第一个令牌——并没有任何东西被“重置”。
    </Note>

    复制该令牌并将其保存在某处。这是你的 **Bot Token**，稍后你将需要它。

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    点击侧边栏上的 **OAuth2**。您将生成一个具有正确权限的邀请 URL，以便将机器人添加到您的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方将出现一个 **Bot Permissions** 部分。至少启用：

    **General Permissions**
      - 查看渠道
    **Text Permissions**
      - 发送消息
      - 读取消息历史
      - 嵌入链接
      - 附加文件
      - 添加表情（可选）

    这是普通文本渠道的基准设置。如果您计划在 Discord 线程中发布，包括创建或继续线程的论坛或媒体渠道工作流，还要启用 **在线程中发送消息**。
    复制底部生成的 URL，将其粘贴到浏览器中，选择您的服务器，然后点击 **Continue** 进行连接。您现在应该可以在 Discord 服务器中看到您的机器人了。

  </Step>

  <Step title="启用开发者模式并收集你的 ID">
    回到 Discord 应用，你需要启用开发者模式以便复制内部 ID。

    1. 点击 **User Settings**（头像旁边的齿轮图标）→ **Advanced** → 打开 **Developer Mode**
    2. 右键点击侧边栏中的你的 **server icon** → **Copy Server ID**
    3. 右键点击你的 **own avatar** → **Copy User ID**

    将你的 **Server ID** 和 **User ID** 与你的 Bot Token 一起保存 —— 你将在下一步把这三者都发送给 OpenClaw。

  </Step>

  <Step title="Allow 私信 from server members">
    为了使配对正常工作，Discord 需要允许你的机器人向你发送私信。右键单击你的 **服务器图标** → **隐私设置** → 开启 **私信**。

    这允许服务器成员（包括机器人）向你发送私信。如果你想使用 Discord 私信和 OpenClaw，请保持此选项启用。如果你只打算使用频道，可以在配对后禁用私信。

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

    如果 OpenClaw 已作为后台服务运行，请通过 OpenClaw Mac 应用程序重新启动它，或者通过停止并重新启动 `openclaw gateway run` 进程来重新启动。
    对于托管服务安装，请在存在 `DISCORD_BOT_TOKEN` 的 Shell 中运行 `openclaw gateway install`，或者将该变量存储在 `~/.openclaw/.env` 中，以便服务在重新启动后可以解析 env SecretRef。
    如果您的主机被 Discord 的启动应用程序查找阻止或速率限制，请从开发者门户设置 Discord 应用程序/客户端 ID，以便启动可以跳过该 REST 调用。对于默认帐户，请使用 `channels.discord.applicationId`；当您运行多个 Discord 机器人时，请使用 `channels.discord.accounts.<accountId>.applicationId`。

  </Step>

  <Step title="配置 OpenClaw 并配对">

    <Tabs>
      <Tab title="询问您的代理">
        在任何现有渠道（例如 OpenClaw）上与您的 Telegram 代理聊天并告诉它。如果 Discord 是您的第一个渠道，请改用 CLI / 配置选项卡。

        > "我已经在配置中设置了我的 Discord 机器人令牌。请使用用户 ID `<user_id>` 和服务器 ID `<server_id>` 完成 Discord 设置。"
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

        对于脚本化或远程设置，请使用 `openclaw config patch --file ./discord.patch.json5 --dry-run` 编写相同的 JSON5 块，然后在不含 `--dry-run` 的情况下重新运行。支持纯文本 `token` 值。跨 env/file/exec 提供程序也支持 `channels.discord.token` 的 SecretRef 值。请参阅[机密管理](/zh/gateway/secrets)。

        对于多个 Discord 机器人，请将每个机器人令牌和应用程序 ID 保留在其账户下。顶级 `channels.discord.applicationId` 由账户继承，因此仅当每个账户都应使用相同的应用程序 ID 时才在那里设置它。

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
    等待网关运行，然后在 Discord 中向你的机器人发送私信。它会回复一个配对码。

    <Tabs>
      <Tab title="Ask your agent"Discord>
        将配对码发送到你现有渠道上的代理：

        > “批准此 Discord 配对码：`<CODE>`”
      </Tab>
      <Tab title="CLICLI">

````bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```Discord

      </Tab>
    </Tabs>

    配对码将在 1 小时后过期。

    你现在应该能够通过私信在 Discord 中与你的代理聊天。

  </Step>
</Steps>

<Note>
Token 解析是感知账户的。配置 Token 值优先于环境变量回退。`DISCORD_BOT_TOKEN` 仅用于默认账户。
如果两个启用的 Discord 账户解析到同一个 bot token，OpenClaw 将只为该 token 启动一个网关监视器。配置源 token 优先于默认环境变量回退；否则，第一个启用的账户获胜，并报告重复账户已禁用。
对于高级出站调用（消息工具/渠道操作），该调用使用显式的每次调用 `token`。这适用于发送和读取/探测式操作（例如读取/搜索/获取/线程/置顶/权限）。账户策略/重试设置仍来自活动运行时快照中选定的账户。
</Note>

## 推荐：设置一个服务器工作区

一旦 Discord 能够正常工作，您就可以将您的 Discord 服务器设置为一个完整的工作区，其中每个渠道都有自己的代理会话及其上下文。这对于只有您和您的机器人的私人服务器来说是推荐的。

<Steps>
  <Step title="将您的服务器添加到公会允许列表">
    这将使您的代理能够在您服务器的任何渠道中响应，而不仅仅是私信。

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
````

      </Tab>
    </Tabs>

  </Step>

  <Step title="允许在不 @提及 的情况下回复"Discord>
    默认情况下，您的代理仅在服务器渠道中被 @提及时才会回复。对于私人服务器，您可能希望它回复每条消息。

    在服务器渠道中，正常的助手最终回复默认保持私密。可见的 Discord 输出必须使用 `message`Discord 工具显式发送，因此代理默认可以“潜水”，仅当认为渠道回复有用时才发布。

    这意味着所选模型必须可靠地调用工具。如果 Discord 显示正在输入且日志显示有 token 使用情况但没有发布消息，请检查会话日志中是否有带有 `didSendViaMessagingTool: false` 的助手文本。这意味着模型产生了私密的最终答案，而不是调用 `message(action=send)`。请切换到更强的工具调用模型，或使用下面的配置来恢复旧的自动最终回复。

    <Tabs>
      <Tab title="询问您的代理">
        > "允许我的代理在此服务器上响应而无需被 @提及"
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

        要为群组/渠道房间恢复旧的自动最终回复，请设置 `messages.groupChat.visibleReplies: "automatic"`。

      </Tab>
    </Tabs>

  </Step>

  <Step title="规划服务器渠道中的记忆">
    默认情况下，长期记忆（MEMORY.md）仅在私信会话中加载。服务器渠道不会自动加载 MEMORY.md。

    <Tabs>
      <Tab title="询问您的智能体">
        > “当我在 Discord 渠道中提问时，如果您需要来自 MEMORY.md 的长期上下文，请使用 memory_search 或 memory_get。”
      </Tab>
      <Tab title="手动">
        如果您需要在每个渠道中共享上下文，请将稳定指令放入 `AGENTS.md` 或 `USER.md` 中（它们会在每次会话时注入）。将长期笔记保留在 `MEMORY.md` 中，并使用记忆工具按需访问它们。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在在您的 Discord 服务器上创建一些渠道并开始聊天。您的代理可以看到渠道名称，并且每个渠道都有自己的独立会话——因此您可以设置 `#coding`、`#home`、`#research` 或任何适合您工作流程的渠道。

## 运行时模型

- Gateway(网关) 拥有 Discord 连接。
- 回复路由是确定性的：Discord 入站回复回传给 Discord。
- Discord 公会/渠道元数据作为不受信任的上下文添加到模型提示中，而不是作为用户可见的回复前缀。如果模型复制了该信封，OpenClaw 会从出站回复和未来的重放上下文中剥离复制的元数据。
- 默认情况下 (`session.dmScope=main`)，直接聊天共享代理主会话 (`agent:main:main`)。
- 公会渠道是独立的会话密钥 (`agent:<agentId>:discord:channel:<channelId>`)。
- 群组私信默认被忽略 (`channels.discord.dm.groupEnabled=false`)。
- 原生斜杠命令在隔离的命令会话（`agent:<agentId>:discord:slash:<userId>`）中运行，同时仍将 `CommandTargetSessionKey` 传递给路由到的对话会话。
- 仅文本的 cron/heartbeat 公告投递到 Discord 仅使用一次最终助理可见的答案。当智能体发出多个可投递的有效载荷时，媒体和结构化组件有效载荷仍保持多消息形式。

## 论坛渠道

Discord 论坛和媒体渠道仅接受线程帖子。OpenClaw 支持两种创建它们的方式：

- 向论坛父频道（`channel:<forumId>`）发送消息以自动创建帖子。帖子标题使用消息的第一行非空内容。
- 使用 `openclaw message thread create` 直接创建帖子。对于论坛频道，请勿传递 `--message-id`。

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

论坛父频道不接受 Discord 组件。如果需要组件，请直接发送到帖子（Discord`channel:<threadId>`）。

## 交互组件

OpenClaw 支持用于代理消息的 Discord 组件 v2 容器。使用消息工具并附带 `components` 载荷。交互结果作为普通入站消息路由回代理，并遵循现有的 Discord `replyToMode` 设置。

支持的块：

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- 操作行最多允许 5 个按钮或一个选择菜单
- 选择类型：`string`, `user`, `role`, `mentionable`, `channel`

默认情况下，组件是一次性的。设置 `components.reusable=true` 以允许按钮、选择器和表单在过期前多次使用。

要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户将收到一条临时拒绝消息。

`/model` 和 `/models` 斜杠命令会打开一个交互式模型选择器，其中包含提供商、模型和兼容的运行时下拉菜单以及一个提交步骤。`/models add` 已被弃用，现在不再从聊天中注册模型，而是返回弃用消息。选择器回复是临时的，只有调用的用户可以使用它。Discord 选择菜单限制为 25 个选项，因此当您希望选择器仅显示选定提供商（例如 `openai-codex` 或 `vllm`）的动态发现的模型时，请将 `provider/*` 条目添加到 `agents.defaults.models` 中。

文件附件：

- `file` 块必须指向附件引用 (`attachment://<filename>`)
- 通过 `media`/`path`/`filePath` 提供附件（单个文件）；如果是多个文件，请使用 `media-gallery`
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
    `channels.discord.dmPolicy` 控制私信访问。`channels.discord.allowFrom` 是规范的私信允许列表。

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`）
    - `disabled`

    如果私信策略未开放，未知用户将被阻止（或在 `pairing` 模式下被提示配对）。

    多账户优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 对于单个账户，`allowFrom` 优先于旧版 `dm.allowFrom`。
    - 当命名账户自己的 `allowFrom` 和旧版 `dm.allowFrom` 未设置时，它们会继承 `channels.discord.allowFrom`。
    - 命名账户不继承 `channels.discord.accounts.default.allowFrom`。

    为了兼容性，仍会读取旧版 `channels.discord.dm.policy` 和 `channels.discord.dm.allowFrom`。当 `openclaw doctor --fix` 可以在不改变访问权限的情况下，会将它们迁移到 `dmPolicy` 和 `allowFrom`。

    用于投递的私信目标格式：

    - `user:<id>`
    - `<@id>` 提及

    当存在频道默认设置时，纯数字 ID 通常解析为频道 ID，但为了兼容性，列在账户有效私信 `allowFrom` 中的 ID 会被视为用户私信目标。

  </Tab>

  <Tab title="Access groups">
    Discord 私信和文本命令授权可以在 `channels.discord.allowFrom` 中使用动态 `accessGroup:<name>` 条目。

    访问组名称在消息渠道间共享。对于其成员以每个渠道的常规 `allowFrom` 语法表示的静态组，请使用 `type: "message.senders"`；或者当 Discord 渠道的当前 `ViewChannel` 受众应动态定义成员资格时，请使用 `type: "discord.channelAudience"`。共享访问组行为在此处记录：[Access groups](/zh/channels/access-groups)。

```json5
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
```

    Discord 文本渠道没有单独的成员列表。`type: "discord.channelAudience"` 将成员资格建模为：私信发送者是配置的服务器成员，并且在应用角色和渠道覆盖设置后，当前对配置的渠道拥有有效的 `ViewChannel` 权限。

    示例：允许任何可以看到 `#maintainers` 的人向机器人发送私信，同时将私信对其他所有人关闭。

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
```

    您可以混合动态和静态条目：

```json5
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
```

    查找默认失败（拒绝访问）。如果 Discord 返回 `Missing Access`、成员查找失败，或者该渠道属于不同的服务器，则私信发送者将被视为未授权。

    使用渠道受众访问组时，请为机器人启用 Discord 开发者门户中的 **Server Members Intent**。私信不包含服务器成员状态，因此 OpenClaw 会在授权时通过 Discord REST 解析成员。

  </Tab>

  <Tab title="Guild policy">
    服务器处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当存在 `channels.discord` 时，安全基线是 `allowlist`。

    `allowlist` 的行为：

    - 服务器必须匹配 `channels.discord.guilds`（首选 `id`，接受别名）
    - 可选的发送者白名单：`users`（推荐使用稳定的 ID）和 `roles`（仅角色 ID）；如果配置了其中任何一个，则当发送者匹配 `users` 或 `roles` 时即被允许
    - 直接名称/标签匹配默认是禁用的；请仅将 `channels.discord.dangerouslyAllowNameMatching: true` 作为应急兼容模式启用
    - `users` 支持名称/标签，但 ID 更安全；当使用名称/标签条目时，`openclaw security audit` 会发出警告
    - 如果服务器配置了 `channels`，则拒绝未列出的频道
    - 如果服务器没有 `channels` 块，则允许该列入白名单的服务器中的所有频道

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

    如果您仅设置了 `DISCORD_BOT_TOKEN` 而未创建 `channels.discord` 块，则运行时回退为 `groupPolicy="allowlist"`（并在日志中发出警告），即使 `channels.defaults.groupPolicy` 是 `open`。

  </Tab>

  <Tab title="提及和群组私信">
    服务器消息默认受提及限制。

    提及检测包括：

    - 显式提及机器人
    - 配置的提及模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 支持情况下的隐式回复机器人行为

    在编写出站 Discord 消息时，请使用标准提及语法：用户使用 `<@USER_ID>`，渠道使用 `<#CHANNEL_ID>`，角色使用 `<@&ROLE_ID>`。请勿使用旧版的 `<@!USER_ID>` 昵称提及形式。

    `requireMention` 是按服务器/渠道（`channels.discord.guilds...`）配置的。
    `ignoreOtherMentions` 可选择丢弃提及了其他用户/角色但未提及机器人的消息（不包括 @everyone/@here）。

    群组私信：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 通过 `dm.groupChannels` 进行可选允许列表设置（渠道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的代理路由

使用 `bindings[].match.roles` 根据 ID 将 Discord 公会成员路由到不同的代理。基于角色的绑定仅接受角色 ID，并在对等或父对等绑定之后、仅限公会的绑定之前进行评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有配置的字段都必须匹配。

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

- `commands.native` 默认为 `"auto"`，并且已针对 Discord 启用。
- 每渠道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 跳过启动期间的 Discord 斜杠命令注册和清理。先前注册的命令可能在 Discord 中仍然可见，直到您从 Discord 应用中将其移除。
- 原生命令认证使用与普通消息处理相同的 Discord 允许列表/策略。
- 对于未获授权的用户，命令可能仍在 Discord UI 中可见；执行仍然强制执行 OpenClaw 认证并返回“未授权”。

有关命令目录和行为，请参阅 [Slash commands](/zh/tools/slash-commands)。

默认斜杠命令设置：

- `ephemeral: true`

## 功能详情

<AccordionGroup>
  <Accordion title="Reply tags and native replies">
    Discord 支持在代理输出中使用回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`
    - `batched`

    注意：`off` 会禁用隐式回复串接。显式的 `[[reply_to_*]]` 标签仍然有效。
    `first` 始终将隐式本机回复引用附加到该轮次的第一个出站 Discord 消息。
    `batched` 仅在入站轮次是多个消息的去抖动批次时，才附加 Discord 的隐式本机回复引用。这主要用于处理模棱两可的突发聊天，而不是每一个单消息轮次。

    消息 ID 会在上下文/历史记录中显示，以便代理可以定位特定消息。

  </Accordion>

  <Accordion title="实时流预览">
    OpenClaw 可以通过发送临时消息并在文本到达时进行编辑来流式传输草稿回复。`channels.discord.streaming` 接受 `off` | `partial` | `block` | `progress`（默认）。`progress` 保留一个可编辑的状态草稿，并用工具进度更新它，直到最终交付；共享的起始标签是一个滚动行，因此一旦出现足够的工作，它就会像其余部分一样滚动消失。`streamMode` 是一个遗留的运行时别名。运行 `openclaw doctor --fix` 将持久化的配置重写为规范键。

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
          toolProgress: true,
        },
      },
    },
  },
}
```

    - `partial` 在 token 到达时编辑单个预览消息。
    - `block` 发出草稿大小的块（使用 `draftChunk` 调整大小和断点，限制为 `textChunkLimit`）。
    - 媒体、错误和显式回复的最终结果会取消挂起的预览编辑。
    - `streaming.preview.toolProgress`（默认 `true`）控制工具/进度更新是否重用预览消息。
    - 工具/进度行在可用时呈现为紧凑的表情符号 + 标题 + 详细信息，例如 `🛠️ Bash: run tests` 或 `🔎 Web Search: for "query"`。
    - `streaming.preview.commandText` / `streaming.progress.commandText` 控制紧凑进度行中的命令/执行详细信息：`raw`（默认）或 `status`（仅工具标签）。

    隐藏原始命令/执行文本，同时保持紧凑的进度行：

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

  <Accordion title="History, context, and thread behavior">
    公会历史上下文：

    - `channels.discord.historyLimit` 默认 `20`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    私信历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`Discord

    主题行为：

    - Discord 主题作为渠道会话进行路由，并继承父渠道配置，除非被覆盖。
    - 主题会话继承父渠道的会话级 `/model` 选择作为仅模型回退；主题本地的 `/model` 选择仍然优先，并且除非启用了转录继承，否则不会复制父转录历史。
    - `channels.discord.thread.inheritParent`（默认 `false`）选择从父转录播种新的自动主题。每个账户的覆盖位于 `channels.discord.accounts.<id>.thread.inheritParent` 下。
    - 消息工具反应可以解析 `user:<id>` 私信目标。
    - 在回复阶段激活回退期间，`guilds.<guild>.channels.<channel>.requireMention: false` 会被保留。

    渠道主题作为**不可信**上下文注入。允许列表控制谁可以触发代理，而不是完整的补充上下文编辑边界。

  </Accordion>

  <Accordion title="子代理的线程绑定会话">
    Discord 可以将线程绑定到会话目标，以便该线程中的后续消息继续路由到同一会话（包括子代理会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子代理/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活跃运行和绑定状态
    - `/session idle <duration|off>` 检查/更新聚焦绑定的非活动自动取消焦点
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

    注意事项：

    - `session.threadBindings.*` 设置全局默认值。
    - `channels.discord.threadBindings.*` 覆盖 Discord 行为。
    - `spawnSessions` 控制 `sessions_spawn({ thread: true })` 和 ACP 线程生成的自动创建/绑定线程。默认值：`true`。
    - `defaultSpawnContext` 控制线程绑定生成的原生子代理上下文。默认值：`"fork"`。
    - 已弃用的 `spawnSubagentSessions`/`spawnAcpSessions` 键由 `openclaw doctor --fix` 迁移。
    - 如果某个帐户禁用了线程绑定，则 `/focus` 和相关的线程绑定操作不可用。

    参见 [子代理](/zh/tools/subagents)、[ACP 代理](/zh/tools/acp-agents) 和 [配置参考](/zh/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="Persistent ACP 渠道 bindings">
    对于稳定的“常开”ACP 工作区，请配置针对 Discord 对话的顶级类型化 ACP 绑定。

    配置路径：

    - `bindings[]` 搭配 `type: "acp"` 和 `match.channel: "discord"`

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

    - `/acp spawn codex --bind here` 将当前渠道或线程原位绑定，并使后续消息保持在同一个 ACP 会话中。线程消息会继承父渠道的绑定。
    - 在已绑定的渠道或线程中，`/new` 和 `/reset` 会原位重置同一个 ACP 会话。激活时的临时线程绑定可以覆盖目标解析。
    - `spawnSessions` 通过 `--thread auto|here` 限制子线程的创建/绑定。

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

  <Accordion title="确认反应">
    当 OpenClaw 正在处理传入消息时，`ackReaction` 会发送一个确认表情符号。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退 (`agents.list[].identity.emoji`，否则为 "👀")

    注意：

    - Discord 接受 Unicode 表情符号或自定义表情符号名称。
    - 使用 `""` 来禁用渠道或账户的反应。

  </Accordion>

  <Accordion title="配置写入">
    默认启用频道发起的配置写入。

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

  <Accordion title="Gateway(网关) 代理">
    通过 HTTP(S) 代理使用 `channels.discord.proxy` 路由 Discord Gateway WebSocket 流量和启动 REST 查询（应用程序 ID + 允列表解析）。

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

  <Accordion title="PluralKit 支持">
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

    - 允许列表可以使用 `pk:<memberId>`
    - 仅当 `channels.discord.dangerouslyAllowNameMatching: true` 时，才会按名称/slug 匹配成员显示名称
    - 查询使用原始消息 ID 并受时间窗口限制
    - 如果查询失败，除非 `allowBots=true`，否则代理消息将被视为机器人消息并被丢弃

  </Accordion>

  <Accordion title="Outbound mention aliases">
    当代理需要为已知的 Discord 用户确定性的出站提及（mentions）时，请使用 `mentionAliases`Discord。键（Keys）是不带前缀 `@`Discord 的用户名（handles）；值是 Discord 用户 ID。未知的用户名、`@everyone`、`@here` 以及 Markdown 代码范围内的提及将保持不变。

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
    当您设置状态或活动字段，或启用自动在线状态时，会应用在线状态更新。

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

    - 0: 正在玩
    - 1: 正在直播（需要 `activityUrl`）
    - 2: 正在听
    - 3: 正在看
    - 4: 自定义（使用活动文本作为状态状态；表情符号是可选的）
    - 5: 正在竞赛

    自动在线状态示例（运行时健康信号）：

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

    自动在线状态将运行时可用性映射到 Discord 状态：健康 => 在线，降级或未知 => 闲置，耗尽或不可用 => 请勿打扰。可选的文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支持 `{reason}` 占位符）

  </Accordion>

  <Accordion title="DiscordDiscord 中的审批"Discord>
    Discord 支持在私信中通过基于按钮的方式处理审批，并可选择在发起渠道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` （可选；如果可能，回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target` （`dm` | `channel` | `both`，默认值： `dm`）
    - `agentFilter`， `sessionFilter`， `cleanupAfterResolve`Discord

    当 `enabled` 未设置或为 `"auto"`，并且至少能解析出一个审批人（无论是从 `execApprovals.approvers` 还是从 `commands.ownerAllowFrom`Discord）时，Discord 会自动启用原生执行审批。Discord 不会从渠道 `allowFrom`、传统 `dm.allowFrom` 或直接消息 `defaultTo` 推断执行审批人。设置 `enabled: false`Discord 可明确禁用 Discord 作为原生审批客户端。

    对于敏感的仅限所有者群组命令（例如 `/diagnostics` 和 `/export-trajectory`OpenClawDiscordDiscord），OpenClaw 会私下发送审批提示和最终结果。如果调用的所有者拥有 Discord 所有者路由，它会首先尝试 Discord 私信；如果不可用，则回退到 `commands.ownerAllowFrom`Telegram 中的第一个可用所有者路由，例如 Telegram。

    当 `target` 为 `channel` 或 `both`OpenClawDiscordDiscordOpenClaw 时，审批提示在渠道中可见。只有已解析的审批人可以使用这些按钮；其他用户会收到临时的拒绝消息。审批提示包含命令文本，因此请仅在可信渠道中启用渠道投递。如果无法从会话密钥派生渠道 ID，OpenClaw 将回退到私信投递。

    Discord 还会渲染其他聊天渠道使用的共享审批按钮。原生 Discord 适配器主要增加了审批人私信路由和渠道分发。
    当这些按钮存在时，它们是主要的审批用户体验；OpenClaw
    仅应在工具结果指出聊天审批不可用或手动审批是唯一途径时，才包含手动 `/approve`DiscordOpenClaw 命令。
    如果 Discord 原生审批运行时未激活，OpenClaw 会保持
    本地确定性 `/approve <id> <decision>`OpenClaw 提示可见。如果
    运行时处于活动状态但无法向任何目标投递原生卡片，
    OpenClaw 将发送一条同聊回退通知，其中包含来自待处理审批的确切 `/approve`Gateway(网关)Gateway(网关)
    命令。

    Gateway 认证和审批解析遵循共享 Gateway 客户端合约（`plugin:` ID 通过 `plugin.approval.resolve` 解析；其他 ID 通过 `exec.approval.resolve`）。审批默认在 30 分钟后过期。

    参见 [Exec approvals](/zh/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 工具和操作门控

Discord 消息操作包括消息发送、渠道管理、审核、在线状态和元数据操作。

核心示例：

- 消息传递： `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- 反应： `react`, `reactions`, `emojiList`
- 审核： `timeout`, `kick`, `ban`
- 在线状态： `setPresence`

`event-create` 操作接受一个可选的 `image` 参数（URL 或本地文件路径）来设置预定活动的封面图片。

动作门控位于 `channels.discord.actions.*` 之下。

默认门控行为：

| 动作组                                                                                                                                                                   | 默认   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | 已启用 |
| roles                                                                                                                                                                    | 已禁用 |
| moderation                                                                                                                                                               | 已禁用 |
| presence                                                                                                                                                                 | 已禁用 |

## 组件 v2 UI

OpenClaw 使用 Discord 组件 v2 进行执行审批和跨上下文标记。Discord 消息操作也可以接受 OpenClawDiscordDiscord`components` 用于自定义 UI（高级；需要通过 discord 工具构建组件负载），而旧的 `embeds` 仍然可用，但不推荐使用。

- `channels.discord.ui.components.accentColor`Discord 设置 Discord 组件容器使用的强调色（十六进制）。
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

Discord 有两个独特的语音界面：实时**语音渠道**（持续对话）和**语音消息附件**（波形预览格式）。网关支持这两种形式。

### 语音渠道

设置检查清单：

1. 在 Discord 开发者门户中启用消息内容意图（Message Content Intent）。
2. 当使用角色/用户允许列表时，启用服务器成员意图（Server Members Intent）。
3. 使用 `bot` 和 `applications.commands` 范围邀请机器人。
4. 在目标语音渠道中授予连接、发言、发送消息和读取消息历史的权限。
5. 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
6. 配置 `channels.discord.voice`。

使用 `/vc join|leave|status` 来控制会话。该命令使用账户默认代理，并遵循与其他 Discord 命令相同的允许列表和组策略规则。

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

- `voice.tts` 仅针对 `stt-tts` 语音播放覆盖 `messages.tts`。实时模式使用 `voice.realtime.voice`。
- `voice.mode` 控制对话路径。默认为 `agent-proxy`：实时语音前端处理轮次计时、中断和播放，通过 `openclaw_agent_consult` 将实质性工作委托给路由到的 OpenClaw 代理，并将结果视为来自该说话者的键入 Discord 提示。`stt-tts` 保持较旧的批处理 STT 加 TTS 流程。`bidi` 让实时模型直接对话，同时为 OpenClaw 大脑暴露 `openclaw_agent_consult`。
- `voice.agentSession`OpenClaw 控制哪个 OpenClaw 会话接收语音轮次。保留为未设置以使用语音频道自己的会话，或设置 `{ mode: "target", target: "channel:<text-channel-id>" }`Discord 使语音频道充当现有 Discord 文本频道会话（例如 `#maintainers`）的麦克风/扬声器扩展。
- `voice.model`OpenClawDiscord 覆盖用于 Discord 语音响应和实时咨询的 OpenClaw 代理大脑。保留为未设置以继承路由到的代理模型。它与 `voice.realtime.model` 是分开的。
- `agent-proxy` 通过 `discord-voice` 路由语音，该功能为发言者和目标会话保留正常的所有者/工具授权，但由于 Discord 语音拥有播放控制权，因此隐藏了代理 `tts` 工具。默认情况下，`agent-proxy` 为所有者发言者（`voice.realtime.toolPolicy: "owner"`）提供完整的所有者等效工具访问权限，并在提供实质性答案（`voice.realtime.consultPolicy: "always"`）之前强烈优先咨询 OpenClaw 代理。在该默认 `always` 模式下，实时层不会在咨询答案之前自动说填充词；它会捕获并转录语音，然后说出路由的 OpenClaw 答案。如果多个强制咨询答案在 Discord 仍在播放第一个答案时完成，则随后的精确语音答案将被排队，直到播放空闲，而不是替换句中语音。
- 在 `stt-tts` 模式下，STT 使用 `tools.media.audio`；`voice.model` 不影响转录。
- 在实时模式下，`voice.realtime.provider`、`voice.realtime.model` 和 `voice.realtime.voice` 配置实时音频会话。对于 OpenAI Realtime 2 加上 Codex 大脑，请使用 `voice.realtime.model: "gpt-realtime-2"` 和 `voice.model: "openai-codex/gpt-5.5"`。
- OpenAI 实时提供商接受当前的 Realtime 2 事件名称以及用于输出音频和转录事件的旧版 Codex 兼容别名，因此兼容的提供商快照可以在不中断助手音频的情况下发生漂移。
- `voice.realtime.bargeIn`Discord 控制是否由 Discord speaker-start 事件中断活跃的实时播放。如果未设置，则遵循实时提供商的输入音频中断设置。
- `voice.realtime.minBargeInAudioEndMs`OpenAI 控制在 OpenAI 实时插话截断音频之前的助手最小播放时长。默认值：`250`。在低回声房间中设置 `0` 可立即中断，或针对回声较重的扬声器设置提高该值。
- 要在 OpenAI 上播放 Discord 语音，请设置 `voice.tts.provider: "openai"`，并在 `voice.tts.openai.voice` 或 `voice.tts.providers.openai.voice` 下选择一个文本转语音语音。在当前的 OpenAI TTS 模型上，`cedar` 是一个不错的男性声音选择。
- 针对每个 Discord 渠道的 `systemPrompt` 覆盖设置适用于该语音频道的语音转录轮次。
- 语音转录轮次从 Discord `allowFrom`（或 `dm.allowFrom`）获取所有者状态；非所有者发言者无法访问仅限所有者的工具（例如 `gateway` 和 `cron`）。
- 对于仅文本配置，Discord 语音是可选启用的；请设置 `channels.discord.voice.enabled=true`（或保留现有的 `channels.discord.voice` 代码块）以启用 `/vc` 命令、语音运行时以及 `GuildVoiceStates` 网关意图。
- `channels.discord.intents.voiceStates` 可以显式覆盖语音状态意图订阅。如果不设置该选项，意图将遵循有效的语音启用设置。
- 如果 `voice.autoJoin`OpenClaw 对同一公会有多个条目，OpenClaw 将加入为该公会最后配置的渠道。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 会传递给 `@discordjs/voice` 加入选项。
- 如果未设置，`@discordjs/voice` 默认为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 默认使用纯 JS 的 `opusscript` 解码器来接收 Discord 语音。可选的原生 `@discordjs/opus` 包会被仓库的 pnpm install 策略忽略，因此正常的安装和测试不会编译原生插件；仅在专用的语音性能或实时环境中选择启用原生 opus 构建。
- `voice.connectTimeoutMs` 控制 `/vc join` 的初始 `@discordjs/voice` Ready 等待和自动加入尝试。默认值：`30000`。
- `voice.reconnectGraceMs`OpenClaw 控制在销毁断开连接的语音会话之前，OpenClaw 等待其开始重新连接的时长。默认值：`15000`。
- 在 `stt-tts`OpenClaw 模式下，仅仅因为另一个用户开始说话，语音播放并不会停止。为了避免反馈回路，OpenClaw 在 TTS 播放时会忽略新的语音捕获；请在播放结束后说话以进行下一轮。实时模式将说话者开始作为插话信号转发给实时提供商。
- 在实时模式下，扬声器进入开放麦克风的回声看起来像插话并中断播放。对于回声严重的 Discord 房间，设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` 以防止 OpenAI 在输入音频上自动中断。如果您仍然希望 Discord 扬声器启动事件中断活动播放，请添加 `voice.realtime.bargeIn: true`。OpenAI 实时桥接器会忽略短于 `voice.realtime.minBargeInAudioEndMs` 的播放截断，将其视为可能的回声/噪音，并将其记录为已跳过，而不是清除 Discord 播放。
- `voice.captureSilenceGraceMs` 控制在 OpenClaw 报告发言者停止后，Discord 等待多长时间才将该音频段定稿以进行 STT。默认值：`2500`；如果 Discord 将正常停顿分割成不连贯的部分转录，请调高此值。
- 当选择 ElevenLabs 作为 TTS 提供商时，Discord 语音播放使用流式 TTS 并从提供商响应流开始。不支持流式传输的提供商将回退到合成临时文件路径。
- OpenClaw 还会监视接收解密失败，并在短时间内出现连续失败后通过退出/重新加入语音渠道来自动恢复。
- 如果在更新后接收日志中重复显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，请收集依赖项报告和日志。捆绑的 `@discordjs/voice` 行包含了来自 discord.js PR #11449 的上游填充修复，该修复关闭了 discord.js issue #11419。
- 当 OpenClaw 完成捕获的说话者片段时，预期会出现 `The operation was aborted` 接收事件；它们是详细的诊断信息，而非警告。
- 详细的 Discord 语音日志包含每个接受的说话者片段的单行 STT 转录预览，因此调试时会显示用户端和代理回复端，而不会转储无限的转录文本。

STT 加 TTS 流程：

- Discord PCM 捕获会被转换为 WAV 临时文件。
- `tools.media.audio` 处理 STT，例如 `openai/gpt-4o-mini-transcribe`。
- 转录文本通过 Discord 入口和路由发送，同时响应 LLM 运行在语音输出策略下，该策略隐藏代理 DiscordLLM`tts`Discord 工具并要求返回文本，因为 Discord 语音拥有最终的 TTS 播放权。
- `voice.model`LLM 如果设置，仅针对此语音渠道轮次覆盖响应 LLM。
- `voice.tts` 通过 `messages.tts` 合并；支持流式传输的提供商会直接向播放器提供数据，否则将在加入的频道中播放生成的音频文件。

默认的代理语音频道会话示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
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

如果没有 `voice.agentSession` 块，每个语音渠道都会获得自己的路由 OpenClaw 会话。例如，`/vc join channel:234567890123456789` 与该 Discord 语音渠道的会话进行对话。实时模型仅仅是语音前端；实质性请求会被移交给配置好的 OpenClaw 代理。如果实时模型生成了最终转录文本但未调用 consult 工具，OpenClaw 会强制调用 consult 作为后备，以便默认行为仍像与代理对话一样。

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

在 `agent-proxy` 模式下，机器人会加入配置的语音频道，但 OpenClaw 代理轮次使用目标频道的常规路由会话和代理。实时语音会话会将返回的结果读回到语音频道中。主管代理仍可根据其工具策略使用常规消息工具，包括如果这是正确的操作，则发送单独的 Discord 消息。

有用的目标格式：

- `target: "channel:123456789012345678"` 通过 Discord 文本频道会话进行路由。
- `target: "123456789012345678"` 被视为频道目标。
- `target: "dm:123456789012345678"` 或 `target: "user:123456789012345678"` 通过该直接消息会话进行路由。

重回声 OpenAI 实时示例：

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

当模型通过开启的麦克风听到其自己的 Discord 播放，但您仍想通过说话来打断它时，请使用此选项。OpenClaw 可防止 OpenAI 在原始输入音频上自动中断，而 `bargeIn: true` 允许 DiscordOpenAI 的扬声器启动事件和活动中的扬声器音频在下一个捕获的回合到达 %%PH:GLOSSARY:939:e0b8dd627%% 之前取消活动的实时响应。低于 `minBargeInAudioEndMs` 的 `audioEndMs` 极早抢入信号被视为可能是回声/噪声并被忽略，以免模型在第一个播放帧处被切断。

预期语音日志：

- 加入时：`discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- 实时开始时：`discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- 发言者音频时：`discord voice: realtime speaker turn opened ...`、`discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` 和 `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- 实时响应完成时：`discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- 播放停止/重置时：`discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- 实时咨询时：`discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- 代理应答时：`discord voice: agent turn answer ...`
- 排队精确语音时：`discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`，随后是 `discord voice: realtime exact speech dequeued reason=player-idle ...`
- 检测到插话时：`discord voice: realtime barge-in detected source=speaker-start ...` 或 `discord voice: realtime barge-in detected source=active-speaker-audio ...`，随后是 `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- 关于实时中断：`discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`，随后是 `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` 或 `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- 关于被忽略的回声/噪音：`discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- 关于禁用插话：`discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- 关于空闲播放：`discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

要调试音频截断问题，请将实时语音日志作为时间轴来阅读：

1. `realtime audio playback started` 表示 Discord 已开始播放助手音频。网桥从此时开始计算助手输出块、Discord PCM 字节、提供商实时字节和合成音频持续时间。
2. `realtime speaker turn opened`Discord 标记 Discord 发言者变为活跃状态。如果播放已处于活跃状态且启用了 `bargeIn`，则随后可能会出现 `barge-in detected source=speaker-start`。
3. `realtime input audio started` 标记为该发言者轮次接收到的第一个实际音频帧。如果此处的 `outputActive=true` 或非零的 `outputAudioMs`，意味着在助手播放仍处于活跃状态时，麦克风正在发送输入。
4. `barge-in detected source=active-speaker-audio`OpenClawDiscord 表示 OpenClaw 在助手播放处于活跃状态时检测到了实时发言者音频。这对于区分真正的中断与没有有效音频的 Discord 发言者开始事件非常有用。
5. `barge-in requested reason=...`OpenClaw 表示 OpenClaw 要求实时提供商取消或截断活动响应。它包括 `outputAudioMs`、`outputActive` 和 `playbackChunks`，以便您可以看到在打断之前实际播放了多少助手音频。
6. `realtime audio playback stopped reason=...`Discord 是本地 Discord 播放重置点。原因说明了是谁停止了播放：`barge-in`、`player-idle`、`provider-clear-audio`、`forced-agent-consult`、`stream-close` 或 `session-close`。
7. `realtime speaker turn closed` 汇总了捕获到的输入轮次。`chunks=0` 或 `hasAudio=false` 表示说话者轮次已开启，但没有可用的音频传达到实时桥接。`interruptedPlayback=true` 表示输入轮次与助手输出重叠，并触发了插话逻辑。

有用字段：

- `outputAudioMs`：实时提供商在该日志行之前生成的助手音频时长。
- `audioMs`OpenClaw：在播放停止之前，OpenClaw 统计的助手音频时长。
- `elapsedMs`：打开和关闭播放流或说话者轮次之间的挂钟时间。
- `discordBytes`：发送到或从 Discord 语音接收的 48 kHz 立体声 PCM 字节。
- `realtimeBytes`：发送到或从实时提供商接收的提供商格式 PCM 字节。
- `playbackChunks`：转发到 Discord 用于当前响应的助手音频块。
- `sinceLastAudioMs`：最后捕获的说话者音频帧与说话者轮次结束之间的间隔。

常见模式：

- 出现 `source=active-speaker-audio` 立即中断、很小的 `outputAudioMs` 且同一用户就在附近，通常表明扬声器回声进入了麦克风。请提高 `voice.realtime.minBargeInAudioEndMs`，降低扬声器音量，使用耳机，或设置 `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`。
- `source=speaker-start` 后紧跟着 `speaker turn closed ... hasAudio=false` 表示 Discord 报告了语音开始，但 OpenClaw 未收到音频。这可能是暂时的 Discord 语音事件、噪声门行为，或者是客户端短暂开启了麦克风。
- `audio playback stopped reason=stream-close` 附近没有 barge-in 或 `provider-clear-audio` 表示本地 Discord 播放流意外结束。请检查前面的提供商和 Discord 播放器日志。
- `capture ignored during playback (barge-in disabled)` 表示当助手音频处于活动状态时，OpenClaw 故意丢弃了输入。如果您希望语音打断播放，请启用 `voice.realtime.bargeIn`。
- `barge-in ignored ... outputActive=false` 表示 Discord 或提供商 VAD 检测到语音，但 OpenClaw 没有活动播放可以打断。这不应该切断音频。

凭据按每个组件进行解析：LLM 路由身份验证用于 `voice.model`，STT 身份验证用于 `tools.media.audio`，TTS 身份验证用于 `messages.tts`/`voice.tts`，实时提供商身份验证用于 `voice.realtime.providers` 或提供商的常规身份验证配置。

### 语音消息

Discord 语音消息显示波形预览并需要 OGG/Opus 音频。OpenClaw 会自动生成波形，但需要网关主机上安装 `ffmpeg` 和 `ffprobe` 来进行检查和转换。

- 提供**本地文件路径**（URL 会被拒绝）。
- 省略文本内容（Discord 拒绝在同一负载中包含文本和语音消息）。
- 接受任何音频格式；OpenClaw 会根据需要将其转换为 OGG/Opus。

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排除

<AccordionGroup>
  <Accordion title="使用了不允许的 intents 或机器人看不到频道消息">

    - 启用消息内容意图 (Message Content Intent)
    - 当您依赖用户/成员解析时，启用服务器成员意图 (Server Members Intent)
    - 更改 intents 后重启网关

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - 验证 `groupPolicy`
    - 验证 `channels.discord.guilds` 下的公会允许列表
    - 如果存在 guild `channels` 映射，则仅允许列出的频道
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

  <Accordion title="长时间的 Discord 轮次或重复回复">

    典型日志：

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Discord 网关队列控制：

    - 单账号： `channels.discord.eventQueue.listenerTimeout`
    - 多账号： `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - 这仅控制 Discord 网关监听器的工作，而不控制代理轮次的生存期

    Discord 不会对已排队代理轮次应用渠道拥有的超时。消息监听器会立即移交，已排队的 Discord 运行会保留每会话的顺序，直到会话/工具/运行时生命周期完成或中止工作。

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
    OpenClaw 在连接之前获取 Discord `/gateway/bot`Discord 元数据。瞬态故障会回退到 Discord 的默认 Gateway(网关) URL，并在日志中进行限流记录。

    元数据超时控制项：

    - 单账号：`channels.discord.gatewayInfoTimeoutMs`
    - 多账号：`channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - 配置未设置时的环境回退：`OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - 默认值：`30000`（30 秒），最大值：`120000`

  </Accordion>

  <Accordion title="Gateway(网关)Gateway READY 超时重启"OpenClawDiscord>
    OpenClaw 在启动期间和运行时重连后等待 Discord 的 Gateway(网关) `READY` 事件。具有启动延迟的多账户设置可能需要比默认值更长的启动 READY 窗口。

    READY 超时控制项：

    - 启动单账户：`channels.discord.gatewayReadyTimeoutMs`
    - 启动多账户：`channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - 配置未设置时的启动环境变量回退：`OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - 启动默认值：`15000`（15 秒），最大值：`120000`
    - 运行时单账户：`channels.discord.gatewayRuntimeReadyTimeoutMs`
    - 运行时多账户：`channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - 配置未设置时的运行时环境变量回退：`OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - 运行时默认值：`30000`（30 秒），最大值：`120000`

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` 权限检查仅适用于数字渠道 ID。

    如果您使用 slug 键，运行时匹配仍然可以工作，但 probe 无法完全验证权限。

  </Accordion>

  <Accordion title="私信 and pairing issues">

    - 私信已禁用：`channels.discord.dm.enabled=false`
    - 私信策略已禁用：`channels.discord.dmPolicy="disabled"`（旧版：`channels.discord.dm.policy`）
    - 正在等待 `pairing` 模式下的配对批准

  </Accordion>

  <Accordion title="Bot to bot loops">
    默认情况下，会忽略由机器人发送的消息。

    如果您设置了 `channels.discord.allowBots=true`，请使用严格的提及和允许列表规则来避免循环行为。
    建议优先使用 `channels.discord.allowBots="mentions"`，以仅接受提及该机器人的机器人消息。

```json5
{
  channels: {
    discord: {
      accounts: {
        mantis: {
          // Mantis listens to other bots only when they mention her.
          allowBots: "mentions",
        },
        molty: {
          // Molty listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Molty write "@Mantis" and send a real Discord mention.
            Mantis: "MANTIS_DISCORD_USER_ID",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - 保持 OpenClaw 为最新版本 (`openclaw update`)，以便存在 Discord 语音接收恢复逻辑
    - 确认 `channels.discord.voice.daveEncryption=true`（默认）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认值）开始，仅在必要时进行调整
    - 观察日志中是否出现：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后故障仍然持续，请收集日志，并与 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 和 [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449) 中的上游 DAVE 接收历史记录进行比较

  </Accordion>
</AccordionGroup>

## 配置参考

主要参考：[Configuration reference - Discord](Discord/en/gateway/config-channels#discord)。

<Accordion title="Discord高信号 Discord 字段">

- 启动/认证： `enabled`、 `token`、 `accounts.*`、 `allowBots`
- 策略： `groupPolicy`、 `dm.*`、 `guilds.*`、 `guilds.*.channels.*`
- 命令： `commands.native`、 `commands.useAccessGroups`、 `configWrites`、 `slashCommand.*`
- 事件队列： `eventQueue.listenerTimeout`（监听器预算）、 `eventQueue.maxQueueSize`、 `eventQueue.maxConcurrency`
- 网关： `gatewayInfoTimeoutMs`、 `gatewayReadyTimeoutMs`、 `gatewayRuntimeReadyTimeoutMs`
- 回复/历史： `replyToMode`、 `historyLimit`、 `dmHistoryLimit`、 `dms.*.historyLimit`
- 投递： `textChunkLimit`、 `chunkMode`、 `maxLinesPerMessage`
- 流式传输： `streaming`（旧别名： `streamMode`）、 `streaming.preview.toolProgress`、 `draftChunk`、 `blockStreaming`、 `blockStreamingCoalesce`
- 媒体/重试： `mediaMaxMb`Discord（限制出站 Discord 上传，默认 `100MB`）、 `retry`
- 操作： `actions.*`
- 在线状态： `activity`、 `status`、 `activityType`、 `activityUrl`
- UI： `ui.components.accentColor`
- 功能： `threadBindings`、顶层 `bindings[]`（ `type: "acp"`）、 `pluralkit`、 `execApprovals`、 `intents`、 `agentComponents`、 `heartbeat`、 `responsePrefix`

</Accordion>

## 安全与操作

- 将 bot 令牌视为机密（`DISCORD_BOT_TOKEN` 在受监督的环境中首选）。
- 授予 Discord 最小权限。
- 如果命令部署/状态过期，请重启网关并使用 `openclaw channels status --probe` 重新检查。

## 相关

<CardGroup cols={2}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    将 Discord 用户与网关配对。
  </Card>
  <Card title="Groups" icon="users" href="/zh/channels/groups">
    群聊和允许列表行为。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh/channels/channel-routing">
    将入站消息路由到智能体。
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
