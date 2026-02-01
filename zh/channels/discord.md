---
summary: "Discord 机器人支持状态、能力与配置"
read_when:
  - 开发 Discord 渠道功能
---
# Discord（Bot API）


状态：通过官方 Discord bot gateway 支持 DM 与服务器文本频道。

## 快速设置（新手）
1) 创建 Discord bot 并复制 bot token。
2) 在 Discord 应用设置中启用 **Message Content Intent**（若需 allowlist 或名字查找，也启用 **Server Members Intent**）。
3) 为 OpenClaw 设置 token：
   - 环境变量：`DISCORD_BOT_TOKEN=...`
   - 或配置：`channels.discord.token: "..."`。
   - 两者都设置时，以配置优先（环境变量仅作为默认账号回退）。
4) 以消息权限邀请 bot 进你的服务器（只想用 DM 可建一个私有服务器）。
5) 启动 gateway。
6) DM 默认需要配对；首次联系后批准配对码。

最小配置：
```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN"
    }
  }
}
```

## 目标
- 在 Discord DM 或服务器频道与 OpenClaw 对话。
- 私聊会合并到 agent 的主会话（默认 `agent:main:main`）；服务器频道会隔离为 `agent:<agentId>:discord:channel:<channelId>`（显示名为 `discord:<guildSlug>#<channelSlug>`）。
- 群 DM 默认忽略；可通过 `channels.discord.dm.groupEnabled` 启用，并可用 `channels.discord.dm.groupChannels` 限制。
- 保持路由确定性：回复总是回到消息来源频道。

## 工作原理
1. 创建 Discord 应用 → Bot，启用所需 intents（DM + 服务器消息 + 消息内容），并获取 bot token。
2. 以读/发消息权限邀请 bot 进你的服务器。
3. 在 OpenClaw 中配置 `channels.discord.token`（或用 `DISCORD_BOT_TOKEN` 作为回退）。
4. 运行 gateway；当 token 可用（配置优先，环境变量回退）且 `channels.discord.enabled` 不为 `false` 时会自动启动 Discord 渠道。
   - 若偏好环境变量，设置 `DISCORD_BOT_TOKEN`（配置块可选）。
5. 私聊：投递时使用 `user:<id>`（或 `<@id>` 提及）；所有回合会进入共享 `main` 会话。纯数字 ID 含义不明，会被拒绝。
6. 服务器频道：投递时使用 `channel:<channelId>`。默认需要提及，可按服务器或频道配置。
7. 私聊：默认安全策略为 `channels.discord.dm.policy`（默认 `"pairing"`）。未知发送者会收到配对码（1 小时过期）；使用 `openclaw pairing approve discord <code>` 批准。
   - 维持旧的“任何人可用”行为：设置 `channels.discord.dm.policy="open"` 且 `channels.discord.dm.allowFrom=["*"]`。
   - 强制 allowlist：设置 `channels.discord.dm.policy="allowlist"` 并在 `channels.discord.dm.allowFrom` 中列出发送者。
   - 忽略所有 DM：设置 `channels.discord.dm.enabled=false` 或 `channels.discord.dm.policy="disabled"`。
8. 群 DM 默认忽略；使用 `channels.discord.dm.groupEnabled` 启用，可选 `channels.discord.dm.groupChannels` 限制。
9. 可选服务器规则：设置 `channels.discord.guilds`，以服务器 id（推荐）或 slug 为键，配置按频道规则。
10. 可选原生命令：`commands.native` 默认为 `"auto"`（Discord/Telegram 开启，Slack 关闭）。可用 `channels.discord.commands.native: true|false|"auto"` 覆盖；`false` 会清理已注册命令。文本命令由 `commands.text` 控制，必须以独立 `/...` 消息发送。使用 `commands.useAccessGroups: false` 可绕过命令的 access-group 检查。
    - 完整命令列表与配置见 [Slash commands](/zh/tools/slash-commands)
11. 可选服务器上下文历史：设置 `channels.discord.historyLimit`（默认 20，回退到 `messages.groupChat.historyLimit`），在回复提及时包含最近 N 条消息作为上下文。设置 `0` 禁用。
12. Reactions：agent 可通过 `discord` 工具触发 reactions（受 `channels.discord.actions.*` 控制）。
    - Reaction 移除语义见 [/tools/reactions](/zh/tools/reactions)。
    - `discord` 工具仅在当前频道为 Discord 时暴露。
13. 原生命令使用隔离会话 key（`agent:<agentId>:discord:slash:<userId>`），而不是共享 `main` 会话。

注意：名称 → id 解析使用服务器成员搜索，需要 Server Members Intent；若 bot 无法搜索成员，请使用 id 或 `<@id>`。
注意：slug 为小写且空格替换为 `-`。频道名称 slug 化时不带 `#`。
注意：服务器上下文中的 `[from:]` 行包含 `author.tag` + `id`，便于回复时直接 ping。

## 配置写入
默认允许 Discord 触发 `/config set|unset` 写入配置（需 `commands.config: true`）。

禁用：
```json5
{
  channels: { discord: { configWrites: false } }
}
```

## 如何创建自己的 bot

以下是通过 “Discord Developer Portal” 在服务器频道（如 `#help`）中运行 OpenClaw 的设置。

### 1) 创建 Discord 应用 + bot 用户
1. Discord Developer Portal → **Applications** → **New Application**
2. 在应用中：
   - **Bot** → **Add Bot**
   - 复制 **Bot Token**（即 `DISCORD_BOT_TOKEN`）

### 2) 启用 OpenClaw 需要的 gateway intents
Discord 会阻止“特权 intents”，除非你显式启用。

在 **Bot** → **Privileged Gateway Intents** 中启用：
- **Message Content Intent**（在多数服务器中读取消息文本必须；否则会出现 “Used disallowed intents” 或 bot 连接但不回应）
- **Server Members Intent**（推荐；某些用户查找与 allowlist 匹配需要）

一般**不需要** **Presence Intent**。

### 3) 生成邀请 URL（OAuth2 URL Generator）
在应用中：**OAuth2** → **URL Generator**

**Scopes**
- ✅ `bot`
- ✅ `applications.commands`（原生命令必需）

**Bot 权限**（最小基线）
- ✅ View Channels
- ✅ Send Messages
- ✅ Read Message History
- ✅ Embed Links
- ✅ Attach Files
- ✅ Add Reactions（可选但推荐）
- ✅ Use External Emojis / Stickers（可选；只有需要时）

除非在调试且完全信任 bot，否则避免 **Administrator**。

复制生成的 URL，打开后选择服务器并安装 bot。

### 4) 获取 ids（服务器/用户/频道）
Discord 处处使用数字 id；OpenClaw 配置也偏好 id。

1. Discord（桌面/网页）→ **User Settings** → **Advanced** → 启用 **Developer Mode**
2. 右键：
   - 服务器名 → **Copy Server ID**（guild id）
   - 频道（如 `#help`）→ **Copy Channel ID**
   - 你的用户 → **Copy User ID**

### 5) 配置 OpenClaw

#### Token
通过环境变量设置 bot token（服务器推荐）：
- `DISCORD_BOT_TOKEN=...`

或使用配置：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN"
    }
  }
}
```

多账号支持：使用 `channels.discord.accounts` 指定各账号 token 与可选 `name`。参见 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 的通用模式。

#### Allowlist + 频道路由
示例：“单服务器、只允许我、只允许 #help”：

```json5
{
  channels: {
    discord: {
      enabled: true,
      dm: { enabled: false },
      guilds: {
        "YOUR_GUILD_ID": {
          users: ["YOUR_USER_ID"],
          requireMention: true,
          channels: {
            help: { allow: true, requireMention: true }
          }
        }
      },
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1
      }
    }
  }
}
```

说明：
- `requireMention: true` 表示只有被提及时才回复（推荐用于公共频道）。
- `agents.list[].groupChat.mentionPatterns`（或 `messages.groupChat.mentionPatterns`）也会被视为服务器消息的提及。
- 多 agent 覆盖：在 `agents.list[].groupChat.mentionPatterns` 中设置每个 agent 的模式。
- 若存在 `channels`，未列出的频道默认拒绝。
- 用 `"*"` 频道项可应用到所有频道；显式频道条目会覆盖通配。
- 线程继承父频道配置（allowlist、`requireMention`、skills、prompts 等），除非你显式添加该线程的频道 id。
- bot 自己的消息默认忽略；设置 `channels.discord.allowBots=true` 可允许其他 bot（自己的消息仍会过滤）。
- 警告：若允许回复其他 bot（`channels.discord.allowBots=true`），请用 `requireMention`、`channels.discord.guilds.*.channels.<id>.users` allowlist，及 `AGENTS.md`/`SOUL.md` 的 guardrails 防止 bot-to-bot 循环。

### 6) 验证是否可用
1. 启动 gateway。
2. 在服务器频道发送：`@Krill hello`（或你的 bot 名称）。
3. 如果无响应，查看**故障排查**。

### 故障排查
- 首先运行：`openclaw doctor` 与 `openclaw channels status --probe`（可操作警告 + 快速审计）。
- **“Used disallowed intents”**：在 Developer Portal 中启用 **Message Content Intent**（通常还需要 **Server Members Intent**），然后重启 gateway。
- **Bot 连接但服务器频道不回复**：
  - 缺少 **Message Content Intent**，或
  - bot 缺少频道权限（View/Send/Read History），或
  - 配置要求提及但未提及，或
  - 服务器/频道 allowlist 拒绝该频道/用户。
- **`requireMention: false` 但仍不回复**：
- `channels.discord.groupPolicy` 默认是 **allowlist**；将其设为 `"open"` 或在 `channels.discord.guilds` 中添加服务器条目（可选在 `channels.discord.guilds.<id>.channels` 中限制频道）。
  - 若你只设置了 `DISCORD_BOT_TOKEN` 而未创建 `channels.discord` 配置块，运行时会把 `groupPolicy` 默认为 `open`。添加 `channels.discord.groupPolicy`、`channels.defaults.groupPolicy` 或服务器/频道 allowlist 以锁定。
- `requireMention` 必须在 `channels.discord.guilds`（或具体频道）中设置。顶层 `channels.discord.requireMention` 会被忽略。
- **权限审计**（`channels status --probe`）只检查数字频道 ID。若你用 slug/名称作为 `channels.discord.guilds.*.channels` 的 key，审计无法验证权限。
- **DM 不可用**：`channels.discord.dm.enabled=false`、`channels.discord.dm.policy="disabled"`，或尚未被批准（`channels.discord.dm.policy="pairing"`）。

## 能力与限制
- 支持 DM 与服务器文本频道（线程视作独立频道；不支持语音）。
- 输入中指示尽力发送；消息分块使用 `channels.discord.textChunkLimit`（默认 2000），并按行数限制拆分（`channels.discord.maxLinesPerMessage`，默认 17）。
- 可选按段落分块：设置 `channels.discord.chunkMode="newline"`，先按空行分段再做长度分块。
- 支持文件上传，大小上限为 `channels.discord.mediaMaxMb`（默认 8 MB）。
- 服务器回复默认提及门控，避免机器人刷屏。
- 当消息引用另一个消息时，会注入回复上下文（引用内容 + ids）。
- 原生回复线程默认**关闭**；可通过 `channels.discord.replyToMode` 与回复标签启用。

## 重试策略
Discord API 出站调用在 429 限流时重试，优先使用 Discord 的 `retry_after`，并配合指数退避与抖动。通过 `channels.discord.retry` 配置。参见 [Retry policy](/zh/concepts/retry)。

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
            general: { allow: true }
          }
        }
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
        moderation: false
      },
      replyToMode: "off",
      dm: {
        enabled: true,
        policy: "pairing", // pairing | allowlist | open | disabled
        allowFrom: ["123456789012345678", "steipete"],
        groupEnabled: false,
        groupChannels: ["openclaw-dm"]
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
              systemPrompt: "Keep answers short."
            }
          }
        }
      }
    }
  }
}
```

Ack reaction 由 `messages.ackReaction` + `messages.ackReactionScope` 全局控制。
使用 `messages.removeAckAfterReply` 在回复后清除 ack reaction。

- `dm.enabled`：设为 `false` 可忽略所有 DM（默认 `true`）。
- `dm.policy`：DM 访问控制（推荐 `pairing`）。`"open"` 需要 `dm.allowFrom=["*"]`。
- `dm.allowFrom`：DM allowlist（用户 id 或名称）。用于 `dm.policy="allowlist"` 与 `dm.policy="open"` 的验证。向导接受用户名并在 bot 可搜索成员时解析为 id。
- `dm.groupEnabled`：启用群 DM（默认 `false`）。
- `dm.groupChannels`：群 DM 频道 id 或 slug 的可选 allowlist。
- `groupPolicy`：控制服务器频道处理（`open|disabled|allowlist`）；`allowlist` 需要频道 allowlist。
- `guilds`：按服务器配置，键为 guild id（推荐）或 slug。
- `guilds."*"`：默认服务器设置，无显式条目时应用。
- `guilds.<id>.slug`：可选友好 slug，用于显示名。
- `guilds.<id>.users`：可选服务器级用户 allowlist（ids 或 names）。
- `guilds.<id>.tools`：可选服务器级工具策略覆盖（`allow`/`deny`/`alsoAllow`），用于缺少频道覆盖时。
- `guilds.<id>.toolsBySender`：可选发送者级工具策略覆盖（服务器级；无频道覆盖时生效，支持 `"*"` 通配）。
- `guilds.<id>.channels.<channel>.allow`：当 `groupPolicy="allowlist"` 时允许/拒绝频道。
- `guilds.<id>.channels.<channel>.requireMention`：频道提及门控。
- `guilds.<id>.channels.<channel>.tools`：可选频道级工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `guilds.<id>.channels.<channel>.toolsBySender`：频道内发送者级工具策略覆盖（支持 `"*"` 通配）。
- `guilds.<id>.channels.<channel>.users`：可选频道级用户 allowlist。
- `guilds.<id>.channels.<channel>.skills`：技能过滤（省略=所有技能，空=无技能）。
- `guilds.<id>.channels.<channel>.systemPrompt`：频道额外系统提示（与频道主题合并）。
- `guilds.<id>.channels.<channel>.enabled`：设为 `false` 禁用频道。
- `guilds.<id>.channels`：频道规则（key 为频道 slug 或 id）。
- `guilds.<id>.requireMention`：服务器级提及要求（可被频道覆盖）。
- `guilds.<id>.reactionNotifications`：reaction 系统事件模式（`off`、`own`、`all`、`allowlist`）。
- `textChunkLimit`：出站文本分块大小（字符）。默认 2000。
- `chunkMode`：`length`（默认）仅在超出 `textChunkLimit` 时分块；`newline` 先按空行分段再分块。
- `maxLinesPerMessage`：每条消息的软行数上限。默认 17。
- `mediaMaxMb`：入站媒体保存到磁盘时的上限。
- `historyLimit`：在回复提及时，作为上下文包含的最近服务器消息数（默认 20，回退到 `messages.groupChat.historyLimit`；`0` 禁用）。
- `dmHistoryLimit`：私聊历史上限（按用户 turn）。每用户覆盖：`dms["<user_id>"].historyLimit`。
- `retry`：出站 Discord API 调用的重试策略（attempts、minDelayMs、maxDelayMs、jitter）。
- `actions`：动作级工具开关；省略则允许所有（设 `false` 禁用）。
  - `reactions`（包括 react + read reactions）
  - `stickers`、`emojiUploads`、`stickerUploads`、`polls`、`permissions`、`messages`、`threads`、`pins`、`search`
  - `memberInfo`、`roleInfo`、`channelInfo`、`voiceStatus`、`events`
  - `channels`（创建/编辑/删除频道 + 分类 + 权限）
  - `roles`（角色添加/移除，默认 `false`）
  - `moderation`（timeout/kick/ban，默认 `false`）

Reaction 通知使用 `guilds.<id>.reactionNotifications`：
- `off`：不发送 reaction 事件。
- `own`：仅 bot 自己消息上的 reactions（默认）。
- `all`：所有消息上的所有 reactions。
- `allowlist`：来自 `guilds.<id>.users` 的 reactions（空列表禁用）。

### 工具动作默认值

| 动作组 | 默认 | 说明 |
| --- | --- | --- |
| reactions | enabled | React + list reactions + emojiList |
| stickers | enabled | 发送贴纸 |
| emojiUploads | enabled | 上传 emoji |
| stickerUploads | enabled | 上传贴纸 |
| polls | enabled | 创建投票 |
| permissions | enabled | 频道权限快照 |
| messages | enabled | 读/发/编辑/删除 |
| threads | enabled | 创建/列表/回复 |
| pins | enabled | 置顶/取消置顶/列表 |
| search | enabled | 消息搜索（预览功能） |
| memberInfo | enabled | 成员信息 |
| roleInfo | enabled | 角色列表 |
| channelInfo | enabled | 频道信息 + 列表 |
| channels | enabled | 频道/分类管理 |
| voiceStatus | enabled | 语音状态查询 |
| events | enabled | 列出/创建日程事件 |
| roles | disabled | 角色添加/移除 |
| moderation | disabled | 超时/踢出/封禁 |
- `replyToMode`：`off`（默认）、`first` 或 `all`。仅在模型输出包含 reply tag 时生效。

## Reply tags
模型可在输出中包含一个 tag 来请求线程回复：
- `[[reply_to_current]]` — 回复触发该轮的 Discord 消息。
- `[[reply_to:<id>]]` — 回复上下文/历史中的指定消息 id。
当前消息 id 会作为 `[message_id: …]` 附加到提示中；历史条目已包含 ids。

行为由 `channels.discord.replyToMode` 控制：
- `off`：忽略 tags。
- `first`：只有第一个出站分块/附件会作为回复。
- `all`：所有出站分块/附件都会作为回复。

Allowlist 匹配说明：
- `allowFrom`/`users`/`groupChannels` 支持 ids、names、tags 或 `<@id>` 形式的提及。
- 支持前缀 `discord:`/`user:`（用户）与 `channel:`（群 DM）。
- 使用 `*` 允许任意发送者/频道。
- 当存在 `guilds.<id>.channels` 时，未列出的频道默认拒绝。
- 当 `guilds.<id>.channels` 缺省时，allowlist 服务器内的所有频道均允许。
- 若要**禁止所有频道**，设置 `channels.discord.groupPolicy: "disabled"`（或保持空 allowlist）。
- 配置向导接受 `Guild/Channel` 名称（公有与私有），并在可能时解析为 IDs。
- 启动时，OpenClaw 会在 bot 可搜索成员时将 allowlist 中的频道/用户名称解析为 IDs，并记录映射；无法解析的条目会保留原样。

原生命令说明：
- 注册的命令与 OpenClaw 的聊天命令一致。
- 原生命令与 DM/服务器消息共用相同 allowlist（`channels.discord.dm.allowFrom`、`channels.discord.guilds`、按频道规则）。
- Slash 命令可能仍会显示在未 allowlist 用户的 Discord UI 中；OpenClaw 在执行时强制 allowlist，并回复 “not authorized”。

## 工具动作
agent 可调用 `discord` 执行动作，例如：
- `react` / `reactions`（添加或列出 reactions）
- `sticker`、`poll`、`permissions`
- `readMessages`、`sendMessage`、`editMessage`、`deleteMessage`
- 读/搜/置顶的工具 payload 会包含标准化时间戳 `timestampMs`（UTC epoch ms）与 `timestampUtc`，以及原始 Discord `timestamp`。
- `threadCreate`、`threadList`、`threadReply`
- `pinMessage`、`unpinMessage`、`listPins`
- `searchMessages`、`memberInfo`、`roleInfo`、`roleAdd`、`roleRemove`、`emojiList`
- `channelInfo`、`channelList`、`voiceStatus`、`eventList`、`eventCreate`
- `timeout`、`kick`、`ban`

Discord 消息 id 会注入到上下文（`[discord message id: …]` 与历史行），以便 agent 定位。
Emoji 可以是 unicode（如 `✅`）或自定义格式 `<:party_blob:1234567890>`。

## Safety & ops
- 将 bot token 当作密码对待；在受控主机上优先使用 `DISCORD_BOT_TOKEN`，或限制配置文件权限。
- 只授予 bot 必需权限（通常是读/发消息）。
- 若 bot 卡住或限流，在确认没有其他进程占用 Discord 会话后，重启 gateway（`openclaw gateway --force`）。
