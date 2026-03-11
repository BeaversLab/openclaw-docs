---
summary: "Discord 机器人支持状态、功能和配置"
read_when:
  - "Working on Discord channel features"
title: "Discord"
---

# Discord (机器人 API)

状态：可通过官方 Discord 机器人 Gateway 在私聊和服务器文本频道中使用。

## 快速设置（初学者）

1. 创建 Discord 机器人并复制机器人令牌。
2. 在 Discord 应用设置中，启用**消息内容意图**（如果你计划使用白名单或名称查找，还需要**服务器成员意图**）。
3. 为 OpenClaw 设置令牌：
   - 环境变量：`DISCORD_BOT_TOKEN=...`
   - 或配置：`channels.discord.token: "..."`
   - 如果两者都设置了，配置优先（环境变量回退仅适用于默认账户）
4. 使用消息权限将机器人邀请到你的服务器（如果只需要私聊，请创建一个私人服务器）。
5. 启动Gateway。
6. 私聊访问默认为配对模式；在首次联系时批准配对代码。

最小配置：

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

## 目标

- 通过 Discord 私聊或服务器频道与 OpenClaw 交谈。
- 私聊会话合并到 agent 的主会话（默认 `agent:main:main`）；服务器频道保持隔离为 `agent:<agentId>:discord:channel:<channelId>`（显示名称使用 `discord:<guildSlug>#<channelSlug>`）
- 群组私聊默认被忽略；通过 `channels.discord.dm.groupEnabled` 启用，可选择通过 `channels.discord.dm.groupChannels` 限制
- 保持路由确定性：回复始终返回到它们到达的频道。

## 工作原理

1. 创建一个 Discord 应用 → 机器人，启用你需要的意图（私聊 + 服务器消息 + 消息内容），并获取机器人令牌。
2. 使用所需的权限将机器人邀请到你的服务器，以在你想要使用的地方读/发送消息。
3. 使用 `channels.discord.token` 配置 OpenClaw（或使用 `DISCORD_BOT_TOKEN` 作为回退）
4. 运行 gateway；当令牌可用时它会自动启动 Discord 频道（配置优先，环境变量回退）并且 `channels.discord.enabled` 不是 `false`。
   - 如果您更喜欢环境变量，设置 `DISCORD_BOT_TOKEN`（配置块是可选的）
5. 私聊：发送时使用 `user:<id>`（或 `<@id>` 提及）；所有对话都进入共享的 `main` 会话。纯数字 ID 存在歧义，将被拒绝
6. 服务器频道：使用 `channel:<channelId>` 进行发送。默认需要提及，可以按服务器或按频道设置
7. 私聊：默认通过 `channels.discord.dm.policy` 启用安全模式（默认：`"pairing"`）。未知发送者会收到配对代码（1小时后过期）；通过 `openclaw pairing approve discord <code>` 批准。
   - 要保持旧的”对外开放”行为：设置 `channels.discord.dm.policy="open"` 和 `channels.discord.dm.allowFrom=["*"]`。
   - 要启用严格白名单：设置 `channels.discord.dm.policy="allowlist"` 并在 `channels.discord.dm.allowFrom` 中列出发送者。
   - 要忽略所有私聊：设置 `channels.discord.dm.enabled=false` 或 `channels.discord.dm.policy="disabled"`。
8. 群组私聊默认被忽略；通过 `channels.discord.dm.groupEnabled` 启用，可选择通过 `channels.discord.dm.groupChannels` 限制
9. 可选的服务器规则：设置 `channels.discord.guilds`，以服务器 id（首选）或 slug 为键，包含每频道规则
10. 可选的原生命令：`commands.native` 默认为 `"auto"`（Discord/Telegram 启用，Slack 禁用）。通过 `channels.discord.commands.native: true|false|"auto"` 覆盖；`false` 清除先前注册的命令。文本命令由 `commands.text` 控制，必须作为独立的 `/...` 消息发送。使用 `commands.useAccessGroups: false` 绕过命令的访问组检查
    - 完整命令列表 + 配置：[斜杠命令](/zh/tools/slash-commands)
11. 可选的服务器上下文历史：设置 `channels.discord.historyLimit`（默认 20，回退到 `messages.groupChat.historyLimit`）在回复提及时包含最后 N 条服务器消息作为上下文。设置 `0` 禁用
12. 表情反应：agent 可以通过 `discord` 工具触发表情反应（受 `channels.discord.actions.*` 限制）
    - 表情反应移除语义：参见 [/tools/reactions](/zh/tools/reactions)
    - `discord` 工具仅在当前频道是 Discord 时暴露
13. 原生命令使用隔离的会话键（`agent:<agentId>:discord:slash:<userId>`），而不是共享的 `main` 会话

注意：名称 → id 解析使用服务器成员搜索，需要服务器成员意图；如果机器人无法搜索成员，请使用 id 或 `<@id>` 提及
注意：Slug 是小写，空格替换为 `-`。频道名称是 slug 化的，不带前缀 `#`
注意：服务器上下文 `[from:]` 行包含 `author.tag` + `id`，以便轻松生成可回复的内容

## 配置写入

默认情况下，Discord 被允许写入由 `/config set|unset` 触发的配置更新（需要 `commands.config: true`）

禁用方法：

```json5
{
  channels: { discord: { configWrites: false } },
}
```

## 如何创建你自己的机器人

这是在服务器频道中运行 OpenClaw 的”Discord 开发者门户”设置，例如 `#help`

### 1) 创建 Discord 应用 + 机器人用户

1. Discord 开发者门户 → **应用程序** → **新建应用程序**
2. 在您的应用中：
   - **机器人** → **添加机器人**
   - 复制**机器人令牌**（这是您放入 `DISCORD_BOT_TOKEN` 的内容）

### 2) 启用 OpenClaw 需要的Gateway意图

Discord 会阻止”特权意图”，除非你明确启用它们。

在 **机器人** → **特权Gateway意图**中，启用：

- **消息内容意图**（在大多数服务器中读取消息文本所必需；没有它你会看到”使用了不允许的意图”或机器人会连接但不对消息做出反应）
- **服务器成员意图**（推荐；某些成员/用户查找和服务器中的白名单匹配所必需）

您通常**不**需要**在线状态意图**。设置机器人自己的在线状态（`setPresence` 操作）使用 gateway OP3，不需要此意图；只有在您想要接收其他服务器成员的在线状态更新时才需要

### 3) 生成邀请 URL（OAuth2 URL 生成器）

在你的应用程序中：**OAuth2** → **URL 生成器**

**作用域**

- ✅ `bot`
- ✅ `applications.commands`（原生命令所需）

**机器人权限**（最低基准）

- ✅ 查看频道
- ✅ 发送消息
- ✅ 读取消息历史
- ✅ 嵌入链接
- ✅ 附加文件
- ✅ 添加反应（可选但推荐）
- ✅ 使用外部表情符号/贴纸（可选；仅在需要时）

避免使用 **Administrator**，除非你在调试并且完全信任机器人。

复制生成的 URL，打开它，选择你的服务器，然后安装机器人。

### 4) 获取 ID（服务器/用户/频道）

Discord 在任何地方都使用数字 ID；OpenClaw 配置首选 ID。

1. Discord（桌面/网页版）→ **用户设置** → **高级** → 启用 **开发者模式**
2. 右键点击：
   - 服务器名称 → **复制服务器 ID**（服务器 id）
   - 频道（例如 `#help`）→ **复制频道 ID**
   - 您的用户 → **复制用户 ID**

### 5) 配置 OpenClaw

#### 令牌

通过环境变量设置机器人令牌（在服务器上推荐）：

- `DISCORD_BOT_TOKEN=...`

或通过配置：

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

多账户支持：使用 `channels.discord.accounts` 配合每账户令牌和可选的 `name`。参见 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 了解共享模式

#### 白名单 + 频道路由

示例”单服务器，仅允许我，仅允许 #help”：

```json5
{
  channels: {
    discord: {
      enabled: true,
      dm: { enabled: false },
      guilds: {
        YOUR_GUILD_ID: {
          users: ["YOUR_USER_ID"],
          requireMention: true,
          channels: {
            help: { allow: true, requireMention: true },
          },
        },
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

注意事项：

- `requireMention: true` 表示机器人仅在被提及时回复（推荐用于共享频道）
- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）也算作服务器消息的提及
- 多 agent 覆盖：在 `agents.list[].groupChat.mentionPatterns` 上设置每 agent 的模式
- 如果存在 `channels`，默认情况下任何未列出的频道都会被拒绝
- 使用 `"*"` 频道条目在所有频道上应用默认值；显式频道条目会覆盖通配符
- 线程继承父频道配置（白名单、`requireMention`、技能、提示等），除非您显式添加线程频道 id
- 机器人发送的消息默认被忽略；设置 `channels.discord.allowBots=true` 以允许它们（自己的消息仍会被过滤）
- 警告：如果您允许回复其他机器人（`channels.discord.allowBots=true`），请使用 `requireMention`、`channels.discord.guilds.*.channels.<id>.users` 白名单和/或 `AGENTS.md` 和 `SOUL.md` 中的清晰防护措施来防止机器人之间的回复循环

### 6) 验证其工作正常

1. 启动Gateway。
2. 在您的服务器频道中，发送：`@Krill hello`（或任何您的机器人名称）
3. 如果没有任何反应：检查下面的**故障排除**。

### 故障排除

- 首先：运行 `openclaw doctor` 和 `openclaw channels status --probe`（可操作的警告 + 快速审计）
- **”使用了不允许的意图”**：在开发者门户中启用 **消息内容意图**（可能还需要 **服务器成员意图**），然后重启Gateway。
- **机器人连接但在服务器频道中从不回复**：
  - 缺少 **消息内容意图**，或
  - 机器人缺少频道权限（查看/发送/读取历史），或
  - 你的配置需要提及而你没有提及它，或
  - 你的服务器/频道白名单拒绝了频道/用户。
- **`requireMention: false` 但仍然没有回复**：
- `channels.discord.groupPolicy` 默认为**白名单**；将其设置为 `"open"` 或在 `channels.discord.guilds` 下添加服务器条目（可选择在 `channels.discord.guilds.<id>.channels` 下列出频道以限制）
  - 如果您仅设置 `DISCORD_BOT_TOKEN` 而从不创建 `channels.discord` 部分，运行时
    会将 `groupPolicy` 默认为 `open`。添加 `channels.discord.groupPolicy`、
    `channels.defaults.groupPolicy` 或服务器/频道白名单以锁定它
- `requireMention` 必须位于 `channels.discord.guilds` 下（或特定频道）。顶层的 `channels.discord.requireMention` 会被忽略
- **权限审计**（`channels status --probe`）仅检查数字频道 ID。如果您使用 slug/名称作为 `channels.discord.guilds.*.channels` 键，审计无法验证权限
- **私聊不工作**：`channels.discord.dm.enabled=false`、`channels.discord.dm.policy="disabled"`，或者您尚未被批准（`channels.discord.dm.policy="pairing"`）
- **Discord 中的执行批准**：Discord 支持私聊中执行批准的**按钮 UI**（允许一次 / 始终允许 / 拒绝）。`/approve <id> ...` 仅用于转发的批准，不会解决 Discord 的按钮提示。如果您看到 `❌ Failed to submit approval: Error: unknown approval id` 或 UI 从未显示，请检查：
  - 您的配置中的 `channels.discord.execApprovals.enabled: true`
  - 您的 Discord 用户 ID 列在 `channels.discord.execApprovals.approvers` 中（UI 仅发送给批准者）
  - 使用私聊提示中的按钮（**允许一次**、**始终允许**、**拒绝**）
  - 参见 [Exec approvals](/zh/tools/exec-approvals) 和 [Slash commands](/zh/tools/slash-commands) 了解更广泛的批准和命令流程

## 功能和限制

- 私聊和服务器文本频道（线程被视为单独的频道；不支持语音）。
- 输入指示符尽力发送；消息分块使用 `channels.discord.textChunkLimit`（默认 2000），并按行数拆分长回复（`channels.discord.maxLinesPerMessage`，默认 17）
- 可选的换行符分块：设置 `channels.discord.chunkMode="newline"` 在长度分块之前按空行（段落边界）拆分
- 支持文件上传，最大为配置的 `channels.discord.mediaMaxMb`（默认 8 MB）
- 默认情况下，服务器回复需要提及门控以避免嘈杂的机器人。
- 当消息引用另一条消息时，会注入回复上下文（引用内容 + ID）。
- 原生回复线程**默认关闭**；通过 `channels.discord.replyToMode` 和回复标签启用

## 重试策略

出站 Discord API 调用在遇到速率限制（429）时重试，尽可能使用 Discord `retry_after`，采用指数退避和抖动。通过 `channels.discord.retry` 配置。参见 [Retry policy](/zh/concepts/retry)

## 配置

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "abc.123",
      groupPolicy: "allowlist",
      guilds: {
        "*": {
          channels: {
            general: { allow: true },
          },
        },
      },
      mediaMaxMb: 8,
      actions: {
        reactions: true,
        stickers: true,
        emojiUploads: true,
        stickerUploads: true,
        polls: true,
        permissions: true,
        messages: true,
        threads: true,
        pins: true,
        search: true,
        memberInfo: true,
        roleInfo: true,
        roles: false,
        channelInfo: true,
        channels: true,
        voiceStatus: true,
        events: true,
        moderation: false,
        presence: false,
      },
      replyToMode: "off",
      dm: {
        enabled: true,
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["123456789012345678", "steipete"],
        groupEnabled: false,
        groupChannels: ["openclaw-dm"],
      },
      guilds: {
        "*": { requireMention: true },
        "123456789012345678": {
          slug: "friends-of-openclaw",
          requireMention: false,
          reactionNotifications: "own",
          users: ["987654321098765432", "steipete"],
          channels: {
            general: { allow: true },
            help: {
              allow: true,
              requireMention: true,
              users: ["987654321098765432"],
              skills: ["search", "docs"],
              systemPrompt: "Keep answers short.",
            },
          },
        },
      },
    },
  },
}
```

确认反应通过 `messages.ackReaction` +
`messages.ackReactionScope` 全局控制。使用 `messages.removeAckAfterReply` 在机器人回复后清除
确认反应

- `dm.enabled`：设置 `false` 忽略所有私聊（默认 `true`）
- `dm.policy`：私聊访问控制（推荐 `pairing`）。`"open"` 需要 `dm.allowFrom=["*"]`
- `dm.allowFrom`：私聊白名单（用户 id 或名称）。由 `dm.policy="allowlist"` 使用，用于 `dm.policy="open"` 验证。向导接受用户名，当机器人可以搜索成员时将其解析为 id
- `dm.groupEnabled`：启用群组私聊（默认 `false`）
- `dm.groupChannels`：群组私聊频道 id 或 slug 的可选白名单
- `groupPolicy`：控制服务器频道处理（`open|disabled|allowlist`）；`allowlist` 需要频道白名单
- `guilds`：按服务器的规则，以服务器 id（首选）或 slug 为键
- `guilds."*"`：当没有显式条目时应用的默认每服务器设置
- `guilds.<id>.slug`：用于显示名称的可选友好 slug
- `guilds.<id>.users`：可选的每服务器用户白名单（id 或名称）
- `guilds.<id>.tools`：可选的每服务器工具策略覆盖（`allow`/`deny`/`alsoAllow`），在频道覆盖缺失时使用
- `guilds.<id>.toolsBySender`：服务器级别的可选每发送者工具策略覆盖（在频道覆盖缺失时应用；支持 `"*"` 通配符）
- `guilds.<id>.channels.<channel>.allow`：当 `groupPolicy="allowlist"` 时允许/拒绝频道
- `guilds.<id>.channels.<channel>.requireMention`：频道的提及门控
- `guilds.<id>.channels.<channel>.tools`：可选的每频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）
- `guilds.<id>.channels.<channel>.toolsBySender`：频道内可选的每发送者工具策略覆盖（支持 `"*"` 通配符）
- `guilds.<id>.channels.<channel>.users`：可选的每频道用户白名单
- `guilds.<id>.channels.<channel>.skills`：技能过滤器（省略 = 所有技能，空 = 无）
- `guilds.<id>.channels.<channel>.systemPrompt`：频道的额外系统提示（与频道主题结合）
- `guilds.<id>.channels.<channel>.enabled`：设置 `false` 禁用频道
- `guilds.<id>.channels`：频道规则（键是频道 slug 或 id）
- `guilds.<id>.requireMention`：每服务器提及要求（可按频道覆盖）
- `guilds.<id>.reactionNotifications`：反应系统事件模式（`off`、`own`、`all`、`allowlist`）
- `textChunkLimit`：出站文本块大小（字符）。默认：2000
- `chunkMode`：`length`（默认）仅在超过 `textChunkLimit` 时拆分；`newline` 在长度分块之前按空行（段落边界）拆分
- `maxLinesPerMessage`：每条消息的软最大行数。默认：17
- `mediaMaxMb`：限制保存到磁盘的入站媒体
- `historyLimit`：回复提及时包含的最近服务器消息数量（默认 20；回退到 `messages.groupChat.historyLimit`；`0` 禁用）
- `dmHistoryLimit`：私聊历史限制（用户轮次）。每用户覆盖：`dms["<user_id>"].historyLimit`
- `retry`：出站 Discord API 调用的重试策略（attempts、minDelayMs、maxDelayMs、jitter）
- `pluralkit`：解析 PluralKit 代理消息，使系统成员显示为不同的发送者
- `actions`：每操作工具门控；省略以允许所有（设置 `false` 禁用）
  - `reactions`（涵盖 react + read reactions）
  - `stickers`、`emojiUploads`、`stickerUploads`、`polls`、`permissions`、`messages`、`threads`、`pins`、`search`
  - `memberInfo`、`roleInfo`、`channelInfo`、`voiceStatus`、`events`
  - `channels`（创建/编辑/删除频道 + 分类 + 权限）
  - `roles`（角色添加/删除，默认 `false`）
  - `moderation`（超时/踢出/封禁，默认 `false`）
  - `presence`（机器人状态/活动，默认 `false`）
- `execApprovals`：仅限 Discord 的执行批准私聊（按钮 UI）。支持 `enabled`、`approvers`、`agentFilter`、`sessionFilter`

反应通知使用 `guilds.<id>.reactionNotifications`：

- `off`：无反应事件
- `own`：机器人自己消息上的反应（默认）
- `all`：所有消息上的所有反应
- `allowlist`：来自 `guilds.<id>.users` 在所有消息上的反应（空列表禁用）

### PluralKit (PK) 支持

启用 PK 查找，使代理消息解析为底层系统 + 成员
启用后，OpenClaw 使用成员身份进行白名单检查，并将
发送者标记为 `Member (PK:System)` 以避免意外的 Discord 提及

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // optional; required for private systems
      },
    },
  },
}
```

白名单注意事项（启用 PK）：

- 在 `dm.allowFrom`、`guilds.<id>.users` 或每频道 `users` 中使用 `pk:<memberId>`
- 成员显示名称也按名称/slug 匹配。
- 查找使用**原始** Discord 消息 ID（代理前的消息），因此 PK API 仅在其 30 分钟窗口内解析它。
- 如果 PK 查找失败（例如，没有令牌的私有系统），代理消息
  将被视为机器人消息并被丢弃，除非 `channels.discord.allowBots=true`

### 工具操作默认值

| Action group   | Default  | Notes                              |
| -------------- | -------- | ---------------------------------- |
| reactions      | enabled  | React + list reactions + emojiList |
| stickers       | enabled  | Send stickers                      |
| emojiUploads   | enabled  | Upload emojis                      |
| stickerUploads | enabled  | Upload stickers                    |
| polls          | enabled  | Create polls                       |
| permissions    | enabled  | Channel permission snapshot        |
| messages       | enabled  | Read/send/edit/delete              |
| threads        | enabled  | Create/list/reply                  |
| pins           | enabled  | Pin/unpin/list                     |
| search         | enabled  | Message search (preview feature)   |
| memberInfo     | enabled  | Member info                        |
| roleInfo       | enabled  | Role list                          |
| channelInfo    | enabled  | Channel info + list                |
| channels       | enabled  | Channel/category management        |
| voiceStatus    | enabled  | Voice state lookup                 |
| events         | enabled  | List/create scheduled events       |
| roles          | disabled | Role add/remove                    |
| moderation     | disabled | Timeout/kick/ban                   |
| presence       | disabled | Bot status/activity (setPresence)  |

- `replyToMode`：`off`（默认）、`first` 或 `all`。仅当模型包含回复标签时应用

## 回复标签

要请求线程回复，模型可以在其输出中包含一个标签：

- `[[reply_to_current]]` — 回复触发 Discord 消息
- `[[reply_to:<id>]]` — 回复上下文/历史中的特定消息 id
  当前消息 id 作为 `[message_id: …]` 附加到提示；历史条目已包含 id

行为由 `channels.discord.replyToMode` 控制：

- `off`：忽略标签
- `first`：仅第一个出站块/附件是回复
- `all`：每个出站块/附件都是回复

白名单匹配注意事项：

- `allowFrom`/`users`/`groupChannels` 接受 id、名称、标签或提及，如 `<@id>`
- 支持前缀，如 `discord:`/`user:`（用户）和 `channel:`（群组私聊）
- 使用 `*` 允许任何发送者/频道
- 当存在 `guilds.<id>.channels` 时，默认情况下拒绝未列出的频道
- 当省略 `guilds.<id>.channels` 时，允许白名单服务器中的所有频道
- 要允许**无频道**，设置 `channels.discord.groupPolicy: "disabled"`（或保持空白名单）
- 配置向导接受 `Guild/Channel` 名称（公共 + 私有）并尽可能将它们解析为 ID
- 启动时，OpenClaw 将白名单中的频道/用户名称解析为 ID（当机器人可以搜索成员时）
  并记录映射；未解析的条目保持输入状态。

原生命令注意事项：

- 注册的命令反映 OpenClaw 的聊天命令。
- 原生命令遵循与私聊/服务器消息相同的白名单（`channels.discord.dm.allowFrom`、`channels.discord.guilds`、每频道规则）
- 斜杠命令在 Discord UI 中对未列入白名单的用户仍然可见；OpenClaw 在执行时强制执行白名单并回复”未授权”。

## 工具操作

agent 可以调用 `discord` 执行以下操作：

- `react` / `reactions`（添加或列出反应）
- `sticker`、`poll`、`permissions`
- `readMessages`、`sendMessage`、`editMessage`、`deleteMessage`
- 读取/搜索/固定工具负载包括标准化的 `timestampMs`（UTC 纪元毫秒）和 `timestampUtc` 以及原始 Discord `timestamp`
- `threadCreate`、`threadList`、`threadReply`
- `pinMessage`、`unpinMessage`、`listPins`
- `searchMessages`、`memberInfo`、`roleInfo`、`roleAdd`、`roleRemove`、`emojiList`
- `channelInfo`、`channelList`、`voiceStatus`、`eventList`、`eventCreate`
- `timeout`、`kick`、`ban`
- `setPresence`（机器人活动和在线状态）

Discord 消息 id 在注入的上下文（`[discord message id: …]` 和历史行）中显示，以便 agent 可以定位它们
Emoji 可以是 unicode（例如 `✅`）或自定义 emoji 语法，如 `<:party_blob:1234567890>`

## 安全和运维

- 将机器人令牌视为密码；在受监管的主机上首选 `DISCORD_BOT_TOKEN` 环境变量或锁定配置文件权限
- 仅授予机器人所需的权限（通常是读取/发送消息）。
- 如果机器人卡住或受到速率限制，请在确认没有其他进程拥有 Discord 会话后重启 gateway（`openclaw gateway --force`）
