---
summary: "Telegram 机器人支持状态、功能和配置"
read_when:
  - "Working on Telegram features or webhooks"
title: "Telegram"
---

# Telegram (Bot API)

状态：通过 grammY 实现的机器人私信和群组支持已可用于生产环境。默认使用长轮询；webhook 可选。

## 快速设置（初学者）

1. 使用 **@BotFather** 创建机器人（[直接链接](https://t.me/BotFather)）。确认账号确为 `@BotFather`，然后复制令牌。
2. 设置令牌：
   - 环境变量：`TELEGRAM_BOT_TOKEN=...`
   - 或配置文件：`channels.telegram.botToken: "..."`。
   - 如果两者都设置了，配置文件优先（环境变量回退仅适用于默认账户）。
3. 启动 Gateway。
4. 私信访问默认为配对模式；首次联系时批准配对码。

最小配置：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
    },
  },
}
```

## 功能介绍

- 由 Gateway 管理的 Telegram Bot API 通道。
- 确定性路由：回复返回到 Telegram；模型从不选择通道。
- 私信与 agent 的主会话共享；群组保持隔离（`agent:<agentId>:telegram:group:<chatId>`）。

## 设置（快速路径）

### 1) 创建机器人令牌（BotFather）

1. 打开 Telegram 并与 **@BotFather** 聊天（[直接链接](https://t.me/BotFather)）。确认账号确为 `@BotFather`。
2. 运行 `/newbot`，然后按照提示操作（名称 + 以 `bot` 结尾的用户名）。
3. 复制令牌并妥善保管。

可选的 BotFather 设置：

- `/setjoingroups` — 允许/拒绝将机器人添加到群组。
- `/setprivacy` — 控制机器人是否看到所有群组消息。

### 2) 配置令牌（环境变量或配置文件）

示例：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

环境变量选项：`TELEGRAM_BOT_TOKEN=...`（适用于默认账户）。
如果同时设置了环境变量和配置文件，配置文件优先。

多账户支持：使用 `channels.telegram.accounts` 配置每个账户的令牌和可选的 `name`。参阅 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 了解通用模式。

3. 启动 Gateway。当解析到令牌时 Telegram 启动（配置文件优先，环境变量回退）。
4. 私信访问默认为配对模式。首次联系机器人时批准配对码。
5. 对于群组：添加机器人，确定隐私/管理员行为（见下文），然后设置 `channels.telegram.groups` 以控制提及门槛和允许列表。

## 令牌 + 隐私 + 权限（Telegram 侧）

### 令牌创建（BotFather）

- `/newbot` 创建机器人并返回令牌（请妥善保管）。
- 如果令牌泄露，通过 @BotFather 撤销/重新生成并更新配置。

### 群组消息可见性（隐私模式）

Telegram 机器人默认使用**隐私模式**，限制接收群组消息。
如果机器人必须看到_所有_群组消息，有两种选择：

- 使用 `/setprivacy` 禁用隐私模式**或**
- 将机器人添加为群组**管理员**（管理员机器人接收所有消息）。

**注意：**切换隐私模式后，Telegram 要求将机器人从群组移除并重新添加才能使更改生效。

### 群组权限（管理员权限）

管理员状态在群组内设置（Telegram UI）。管理员机器人始终接收所有群组消息，因此如需完整可见性请使用管理员。

## 工作原理（行为）

- 入站消息被规范化为共享通道信封，包含回复上下文和媒体占位符。
- 群组回复默认需要提及（原生 @提及或 `agents.list[].groupChat.mentionPatterns` / `messages.groupChat.mentionPatterns`）。
- 多 agent 覆盖：在 `agents.list[].groupChat.mentionPatterns` 上设置每个 agent 的模式。
- 回复始终路由回同一 Telegram 聊天。
- 长轮询使用 grammY runner 进行逐聊 sequencing；整体并发受 `agents.defaults.maxConcurrent` 限制。
- Telegram Bot API 不支持已读回执；没有 `sendReadReceipts` 选项。

## 草稿流式传输

OpenClaw 可以使用 `sendMessageDraft` 在 Telegram 私信中流式传输部分回复。

要求：

- 在 @BotFather 中为机器人启用线程模式（论坛主题模式）。
- 仅私信线程（Telegram 在入站消息中包含 `message_thread_id`）。
- `channels.telegram.streamMode` 未设置为 `"off"`（默认：`"partial"`，`"block"` 启用分块草稿更新）。

草稿流式传输仅适用于私信；Telegram 在群组或频道中不支持此功能。

## 格式化（Telegram HTML）

- 出站 Telegram 文本使用 `parse_mode: "HTML"`（Telegram 支持的标签子集）。
- 类 Markdown 输入被渲染为**Telegram 安全的 HTML**（粗体/斜体/删除线/代码/链接）；块元素被扁平化为带换行符/项目符号的文本。
- 来自模型的原始 HTML 被转义以避免 Telegram 解析错误。
- 如果 Telegram 拒绝 HTML 载荷，OpenClaw 将重试同一条消息为纯文本。

## 命令（原生 + 自定义）

OpenClaw 在启动时向 Telegram 机器人菜单注册原生命令（如 `/status`、`/reset`、`/model`）。
您可以通过配置向菜单添加自定义命令：

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
    },
  },
}
```

## 故障排除

- 日志中的 `setMyCommands failed` 通常表示到 `api.telegram.org` 的出站 HTTPS/DNS 被阻止。
- 如果看到 `sendMessage` 或 `sendChatAction` 失败，请检查 IPv6 路由和 DNS。

更多帮助：[通道故障排除](/zh/channels/troubleshooting)。

注意事项：

- 自定义命令**仅是菜单条目**；除非您在其他地方处理它们，否则 OpenClaw 不会实现它们。
- 命令名称被规范化（去掉前导 `/`，小写），必须匹配 `a-z`、`0-9`、`_`（1-32 个字符）。
- 自定义命令**无法覆盖原生命令**。冲突将被忽略并记录。
- 如果禁用 `commands.native`，则只注册自定义命令（如果没有则清除）。

## 限制

- 出站文本分块为 `channels.telegram.textChunkLimit`（默认 4000）。
- 可选换行符分块：设置 `channels.telegram.chunkMode="newline"` 在长度分块之前按空行（段落边界）分割。
- 媒体下载/上传受 `channels.telegram.mediaMaxMb` 限制（默认 5）。
- Telegram Bot API 请求在 `channels.telegram.timeoutSeconds` 后超时（通过 grammY 默认 500）。设置更低的值以避免长时间挂起。
- 群组历史上下文使用 `channels.telegram.historyLimit`（或 `channels.telegram.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设置 `0` 禁用（默认 50）。
- 私信历史可以用 `channels.telegram.dmHistoryLimit`（用户轮次）限制。每个用户的覆盖：`channels.telegram.dms["<user_id>"].historyLimit`。

## 群组激活模式

默认情况下，机器人仅在群组中响应提及（`@botname` 或 `agents.list[].groupChat.mentionPatterns` 中的模式）。要更改此行为：

### 通过配置（推荐）

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": { requireMention: false }, // always respond in this group
      },
    },
  },
}
```

**重要：**设置 `channels.telegram.groups` 会创建一个**允许列表**——仅接受列出的群组（或 `"*"`）。
论坛主题继承其父群组配置（allowFrom、requireMention、skills、prompts），除非您在 `channels.telegram.groups.<groupId>.topics.<topicId>` 下添加每个主题的覆盖。

要允许所有群组始终响应：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false }, // all groups, always respond
      },
    },
  },
}
```

要保持所有群组仅提及（默认行为）：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: true }, // or omit groups entirely
      },
    },
  },
}
```

### 通过命令（会话级别）

在群组中发送：

- `/activation always` - 响应所有消息
- `/activation mention` - 需要提及（默认）

**注意：**命令仅更新会话状态。对于重启后的持久行为，请使用配置。

### 获取群组聊天 ID

将群组中的任何消息转发到 Telegram 上的 `@userinfobot` 或 `@getidsbot` 以查看聊天 ID（类似 `-1001234567890` 的负数）。

**提示：**对于您自己的用户 ID，私信机器人，它会回复您的用户 ID（配对消息），或在启用命令后使用 `/whoami`。

**隐私说明：**`@userinfobot` 是第三方机器人。如果您愿意，可以将机器人添加到群组，发送消息，并使用 `openclaw logs --follow` 读取 `chat.id`，或使用 Bot API `getUpdates`。

## 配置写入

默认情况下，允许 Telegram 写入由通道事件或 `/config set|unset` 触发的配置更新。

这发生在：

- 群组升级为超级群组，Telegram 发出 `migrate_to_chat_id`（聊天 ID 变更）。OpenClaw 可以自动迁移 `channels.telegram.groups`。
- 您在 Telegram 聊天中运行 `/config set` 或 `/config unset`（需要 `commands.config: true`）。

禁用方式：

```json5
{
  channels: { telegram: { configWrites: false } },
}
```

## 主题（论坛超级群组）

Telegram 论坛主题每条消息包含一个 `message_thread_id`。OpenClaw：

- 将 `:topic:<threadId>` 附加到 Telegram 群组会话密钥，使每个主题隔离。
- 使用 `message_thread_id` 发送正在输入指示器和回复，使响应保持在主题中。
- 常规主题（线程 id `1`）是特殊的：消息发送省略 `message_thread_id`（Telegram 拒绝它），但正在输入指示器仍包含它。
- 在模板上下文中暴露 `MessageThreadId` + `IsForum` 用于路由/模板化。
- 特定主题的配置在 `channels.telegram.groups.<chatId>.topics.<threadId>` 下可用（skills、allowlists、auto-reply、system prompts、disable）。
- 主题配置继承群组设置（requireMention、allowlists、skills、prompts、enabled），除非每个主题覆盖。

私信在某些边缘情况下可能包含 `message_thread_id`。OpenClaw 保持私信会话密钥不变，但在存在时仍使用线程 id 进行回复/草稿流式传输。

## 内联按钮

Telegram 支持带有回调按钮的内联键盘。

```json5
{
  channels: {
    telegram: {
      capabilities: {
        inlineButtons: "allowlist",
      },
    },
  },
}
```

每个账户的配置：

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          capabilities: {
            inlineButtons: "allowlist",
          },
        },
      },
    },
  },
}
```

范围：

- `off` — 禁用内联按钮
- `dm` — 仅私信（群组目标被阻止）
- `group` — 仅群组（私信目标被阻止）
- `all` — 私信 + 群组
- `allowlist` — 私信 + 群组，但仅限 `allowFrom`/`groupAllowFrom` 允许的发送者（与控制命令相同的规则）

默认：`allowlist`。
传统：`capabilities: ["inlineButtons"]` = `inlineButtons: "all"`。

### 发送按钮

使用带有 `buttons` 参数的消息工具：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Choose an option:",
  buttons: [
    [
      { text: "Yes", callback_data: "yes" },
      { text: "No", callback_data: "no" },
    ],
    [{ text: "Cancel", callback_data: "cancel" }],
  ],
}
```

当用户点击按钮时，回调数据以 `callback_data: value` 格式作为消息发送回 agent：

### 配置选项

Telegram 功能可以在两个级别配置（上面显示的对象形式；仍支持传统字符串数组）：

- `channels.telegram.capabilities`：应用于所有 Telegram 账户的全局默认功能配置，除非被覆盖。
- `channels.telegram.accounts.<account>.capabilities`：每个账户的功能，覆盖该特定账户的全局默认值。

当所有 Telegram 机器人/账户应该表现相同时，使用全局设置。当不同的机器人需要不同的行为时，使用每个账户的配置（例如，一个账户仅处理私信，而另一个允许在群组中）。

## 访问控制（私信 + 群组）

### 私信访问

- 默认：`channels.telegram.dmPolicy = "pairing"`。未知发送者收到配对码；消息在批准前被忽略（配对码在 1 小时后过期）。
- 批准方式：
  - `openclaw pairing list telegram`
  - `openclaw pairing approve telegram <CODE>`
- 配对是用于 Telegram 私信的默认令牌交换。详情：[配对](/zh/start/pairing)
- `channels.telegram.allowFrom` 接受数字用户 ID（推荐）或 `@username` 条目。它**不是**机器人用户名；使用人类发送者的 ID。向导接受 `@username` 并在可能时将其解析为数字 ID。

#### 查找您的 Telegram 用户 ID

更安全（无第三方机器人）：

1. 启动 Gateway 并私信您的机器人。
2. 运行 `openclaw logs --follow` 并查找 `from.id`。

替代方案（官方 Bot API）：

1. 私信您的机器人。
2. 使用您的机器人令牌获取更新并读取 `message.from.id`：
   ```bash
   curl "https://api.telegram.org/bot<bot_token>/getUpdates"
   ```

第三方（隐私较少）：

- 私信 `@userinfobot` 或 `@getidsbot` 并使用返回的用户 ID。

### 群组访问

两个独立的控制：

**1. 允许哪些群组**（通过 `channels.telegram.groups` 进行群组允许列表）：

- 没有 `groups` 配置 = 允许所有群组
- 有 `groups` 配置 = 仅允许列出的群组或 `"*"`
- 示例：`"groups": { "-1001234567890": {}, "*": {} }` 允许所有群组

**2. 允许哪些发送者**（通过 `channels.telegram.groupPolicy` 进行发送者过滤）：

- `"open"` = 允许群组中的所有发送者可以发送消息
- `"allowlist"` = 仅 `channels.telegram.groupAllowFrom` 中的发送者可以发送消息
- `"disabled"` = 完全不接受群组消息
  默认是 `groupPolicy: "allowlist"`（被阻止，除非您添加 `groupAllowFrom`）。

大多数用户想要：`groupPolicy: "allowlist"` + `groupAllowFrom` + `channels.telegram.groups` 中列出的特定群组

## 长轮询 vs webhook

- 默认：长轮询（不需要公共 URL）。
- Webhook 模式：设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`（可选 `channels.telegram.webhookPath`）。
  - 本地侦听器默认绑定到 `0.0.0.0:8787` 并服务 `POST /telegram-webhook`。
  - 如果您的公共 URL 不同，请使用反向代理并将 `channels.telegram.webhookUrl` 指向公共端点。

## 回复线程化

Telegram 通过标签支持可选的线程化回复：

- `[[reply_to_current]]` -- 回复触发消息。
- `[[reply_to:<id>]]` -- 回复特定的消息 ID。

由 `channels.telegram.replyToMode` 控制：

- `first`（默认）、`all`、`off`。

## 音频消息（语音 vs 文件）

Telegram 区分**语音笔记**（圆形气泡）和**音频文件**（元数据卡片）。
OpenClaw 默认使用音频文件以保持向后兼容性。

要在 agent 回复中强制语音笔记气泡，请在回复的任何位置包含此标签：

- `[[audio_as_voice]]` — 将音频作为语音笔记而不是文件发送。

该标签从传送的文本中剥离。其他通道忽略此标签。

对于消息工具发送，请使用语音兼容的音频 `media` URL 设置 `asVoice: true`
（当存在媒体时 `message` 是可选的）：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

## 贴纸

OpenClaw 支持接收和发送 Telegram 贴纸，具有智能缓存功能。

### 接收贴纸

当用户发送贴纸时，OpenClaw 根据贴纸类型处理它：

- **静态贴纸（WEBP）：**下载并通过视觉处理。贴纸在消息内容中显示为 `<media:sticker>` 占位符。
- **动画贴纸（TGS）：**跳过（不支持处理 Lottie 格式）。
- **视频贴纸（WEBM）：**跳过（不支持处理视频格式）。

接收贴纸时可用的模板上下文字段：

- `Sticker` — 包含以下内容的对象：
  - `emoji` — 与贴纸关联的表情符号
  - `setName` — 贴纸集的名称
  - `fileId` — Telegram 文件 ID（发回相同的贴纸）
  - `fileUniqueId` — 用于缓存查找的稳定 ID
  - `cachedDescription` — 可用时的缓存视觉描述

### 贴纸缓存

贴纸通过 AI 的视觉功能处理以生成描述。由于相同的贴纸经常重复发送，OpenClaw 会缓存这些描述以避免冗余的 API 调用。

**工作原理：**

1. **首次遇到：**贴纸图像被发送到 AI 进行视觉分析。AI 生成描述（例如，"一只热情地挥手的卡通猫"）。
2. **缓存存储：**描述与贴纸的文件 ID、表情符号和集名称一起保存。
3. **后续遇到：**当再次看到相同的贴纸时，直接使用缓存的描述。图像不会发送到 AI。

**缓存位置：**`~/.openclaw/telegram/sticker-cache.json`

**缓存条目格式：**

```json
{
  "fileId": "CAACAgIAAxkBAAI...",
  "fileUniqueId": "AgADBAADb6cxG2Y",
  "emoji": "👋",
  "setName": "CoolCats",
  "description": "A cartoon cat waving enthusiastically",
  "cachedAt": "2026-01-15T10:30:00.000Z"
}
```

**优势：**

- 通过避免对相同贴纸的重复视觉调用来降低 API 成本
- 缓存贴纸的响应时间更快（无视觉处理延迟）
- 启用基于缓存描述的贴纸搜索功能

缓存在接收贴纸时自动填充。无需手动缓存管理。

### 发送贴纸

Agent 可以使用 `sticker` 和 `sticker-search` 操作发送和搜索贴纸。这些功能默认禁用，必须在配置中启用：

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true,
      },
    },
  },
}
```

**发送贴纸：**

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

参数：

- `fileId`（必需）— 贴纸的 Telegram 文件 ID。在接收贴纸时从 `Sticker.fileId` 获取，或从 `sticker-search` 结果获取。
- `replyTo`（可选）— 要回复的消息 ID。
- `threadId`（可选）— 论坛主题的消息线程 ID。

**搜索贴纸：**

Agent 可以按描述、表情符号或集名称搜索缓存的贴纸：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

从缓存返回匹配的贴纸：

```json5
{
  ok: true,
  count: 2,
  stickers: [
    {
      fileId: "CAACAgIAAxkBAAI...",
      emoji: "👋",
      description: "A cartoon cat waving enthusiastically",
      setName: "CoolCats",
    },
  ],
}
```

搜索在描述文本、表情符号字符和集名称中使用模糊匹配。

**线程化示例：**

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "-1001234567890",
  fileId: "CAACAgIAAxkBAAI...",
  replyTo: 42,
  threadId: 123,
}
```

## 流式传输（草稿）

Telegram 可以在 agent 生成响应时流式传输**草稿气泡**。
OpenClaw 使用 Bot API `sendMessageDraft`（不是真实消息），然后作为普通消息发送最终回复。

要求（Telegram Bot API 9.3+）：

- **启用主题的私聊**（机器人的论坛主题模式）。
- 传入消息必须包含 `message_thread_id`（私聊主题线程）。
- 群组/超级群组/频道忽略流式传输。

配置：

- `channels.telegram.streamMode: "off" | "partial" | "block"`（默认：`partial`）
  - `partial`：使用最新的流式文本更新草稿气泡。
  - `block`：以更大的块更新草稿气泡（分块）。
  - `off`：禁用草稿流式传输。
- 可选（仅适用于 `streamMode: "block"`）：
  - `channels.telegram.draftChunk: { minChars?, maxChars?, breakPreference? }`
    - 默认值：`minChars: 200`、`maxChars: 800`、`breakPreference: "paragraph"`（限制为 `channels.telegram.textChunkLimit`）。

注意：草稿流式传输与**块流式传输**（通道消息）是分开的。
块流式传输默认关闭，如果您希望尽早发送 Telegram 消息而不是草稿更新，则需要 `channels.telegram.blockStreaming: true`。

推理流（仅 Telegram）：

- `/reasoning stream` 在生成回复时将推理流式传输到草稿气泡，然后发送不包含推理的最终答案。
- 如果 `channels.telegram.streamMode` 是 `off`，推理流将被禁用。
  更多上下文：[流式传输 + 分块](/zh/concepts/streaming)。

## 重试策略

出站 Telegram API 调用在瞬态网络/429 错误时重试，具有指数退避和抖动。通过 `channels.telegram.retry` 配置。参阅 [重试策略](/zh/concepts/retry)。

## Agent 工具（消息 + 反应）

- 工具：`telegram`，带有 `sendMessage` 操作（`to`、`content`、可选 `mediaUrl`、`replyToMessageId`、`messageThreadId`）。
- 工具：`telegram`，带有 `react` 操作（`chatId`、`messageId`、`emoji`）。
- 工具：`telegram`，带有 `deleteMessage` 操作（`chatId`、`messageId`）。
- 反应删除语义：参阅 [/tools/reactions](/zh/tools/reactions)。
- 工具门控：`channels.telegram.actions.reactions`、`channels.telegram.actions.sendMessage`、`channels.telegram.actions.deleteMessage`（默认：启用）和 `channels.telegram.actions.sticker`（默认：禁用）。

## 反应通知

**反应如何工作：**
Telegram 反应作为**单独的 `message_reaction` 事件**到达，而不是消息负载中的属性。当用户添加反应时，OpenClaw：

1. 从 Telegram API 接收 `message_reaction` 更新
2. 将其转换为**系统事件**，格式为：`"Telegram reaction added: {emoji} by {user} on msg {id}"`
3. 使用与常规消息**相同的会话密钥**将系统事件排队
4. 当下一条消息到达该对话时，系统事件被排空并前置到 agent 的上下文中

Agent 将反应视为对话历史中的**系统通知**，而不是消息元数据。

**配置：**

- `channels.telegram.reactionNotifications`：控制哪些反应触发通知
  - `"off"` — 忽略所有反应
  - `"own"` — 当用户对机器人消息做出反应时通知（尽力而为；内存中）（默认）
  - `"all"` — 通知所有反应

- `channels.telegram.reactionLevel`：控制 agent 的反应能力
  - `"off"` — agent 不能对消息做出反应
  - `"ack"` — 机器人发送确认反应（处理时 👀）（默认）
  - `"minimal"` — agent 可以少量反应（指南：每 5-10 次交换 1 次）
  - `"extensive"` — agent 可以在适当时自由反应

**论坛群组：**论坛群组中的反应包含 `message_thread_id` 并使用像 `agent:main:telegram:group:{chatId}:topic:{threadId}` 这样的会话密钥。这确保同一主题中的反应和消息保持在一起。

**配置示例：**

```json5
{
  channels: {
    telegram: {
      reactionNotifications: "all", // See all reactions
      reactionLevel: "minimal", // Agent can react sparingly
    },
  },
}
```

**要求：**

- Telegram 机器人必须在 `allowed_updates` 中明确请求 `message_reaction`（由 OpenClaw 自动配置）
- 对于 webhook 模式，反应包含在 webhook `allowed_updates` 中
- 对于轮询模式，反应包含在 `getUpdates` `allowed_updates` 中

## Delivery targets (CLI/cron)

- 使用聊天 ID（`123456789`）或用户名（`@name`）作为目标。
- 示例：`openclaw message send --channel telegram --target 123456789 --message "hi"`。

## 故障排除

**机器人不响应群组中的非提及消息：**

- 如果您设置了 `channels.telegram.groups.*.requireMention=false`，必须禁用 Telegram Bot API 的**隐私模式**。
  - BotFather：`/setprivacy` → **禁用**（然后将机器人从群组移除并重新添加）
- 当配置期望未提及的群组消息时，`openclaw channels status` 显示警告。
- `openclaw channels status --probe` 可以额外检查明确的数字群组成员资格（它无法审计通配符 `"*"` 规则）。
- 快速测试：`/activation always`（仅会话；使用配置进行持久化）

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（提及门控模式）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `commands.native`（默认为 `"auto"` → Telegram/Discord 开启，Slack 关闭），`commands.text`、`commands.useAccessGroups`（命令行为）。使用 `channels.telegram.commands.native` 覆盖。
- `messages.responsePrefix`、`messages.ackReaction`、`messages.ackReactionScope`、`messages.removeAckAfterReply`。

**机器人完全看不到群组消息：**

- 如果设置了 `channels.telegram.groups`，必须列出群组或使用 `"*"`
- 在 @BotFather 中检查隐私设置 → "群组隐私"应为**关闭**
- 验证机器人确实是成员（不仅仅是没有读取权限的管理员）
- 检查 Gateway 日志：`openclaw logs --follow`（查找 "skipping group message"）

**机器人响应提及但不响应 `/activation always`：**

- `/activation` 命令更新会话状态但不会持久化到配置
- 对于持久行为，将群组添加到 `channels.telegram.groups` 并设置 `requireMention: false`

**像 `/status` 这样的命令不起作用：**

- 确保您的 Telegram 用户 ID 已获得授权（通过配对或 `channels.telegram.allowFrom`）
- 即使在具有 `groupPolicy: "open"` 的群组中，命令也需要授权

**长轮询在 Node 22+ 上立即中止（通常使用代理/自定义 fetch）：**

- Node 22+ 对 `AbortSignal` 实例更严格；外部信号可以立即中止 `fetch` 调用。
- 升级到规范化中止信号的 OpenClaw 版本，或在 Node 20 上运行 Gateway 直到可以升级。

**机器人启动，然后静默停止响应（或记录 `HttpError: Network request ... failed`）：**

- 某些主机首先将 `api.telegram.org` 解析为 IPv6。如果您的服务器没有可工作的 IPv6 出站，grammY 可能会卡在仅 IPv6 请求上。
- 通过启用 IPv6 出站**或**强制 `api.telegram.org` 的 IPv4 解析来修复（例如，使用 IPv4 A 记录添加 `/etc/hosts` 条目，或在操作系统 DNS 堆栈中优先使用 IPv4），然后重启 Gateway。
- 快速检查：`dig +short api.telegram.org A` 和 `dig +short api.telegram.org AAAA` 以确认 DNS 返回的内容。

## 配置参考（Telegram）

完整配置：[配置](/zh/gateway/configuration)

提供商选项：

- `channels.telegram.enabled`：启用/禁用通道启动。
- `channels.telegram.botToken`：机器人令牌（BotFather）。
- `channels.telegram.tokenFile`：从文件路径读取令牌。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认：配对）。
- `channels.telegram.allowFrom`：私信允许列表（ids/usernames）。`open` 需要 `"*"`。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认：允许列表）。
- `channels.telegram.groupAllowFrom`：群组发送者允许列表（ids/usernames）。
- `channels.telegram.groups`：每个群组的默认值 + 允许列表（使用 `"*"` 进行全局默认）。
  - `channels.telegram.groups.<id>.requireMention`：提及门控默认值。
  - `channels.telegram.groups.<id>.skills`：技能过滤器（省略 = 所有技能，空 = 无）。
  - `channels.telegram.groups.<id>.allowFrom`：每个群组的发送者允许列表覆盖。
  - `channels.telegram.groups.<id>.systemPrompt`：群组的额外系统提示。
  - `channels.telegram.groups.<id>.enabled`：当 `false` 时禁用群组。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：每个主题的覆盖（与群组相同的字段）。
  - `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：每个主题的提及门控覆盖。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（默认：允许列表）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每个账户的覆盖。
- `channels.telegram.replyToMode`：`off | first | all`（默认：`first`）。
- `channels.telegram.textChunkLimit`：出站块大小（字符）。
- `channels.telegram.chunkMode`：`length`（默认）或 `newline` 在长度分块之前按空行（段落边界）分割。
- `channels.telegram.linkPreview`：切换出站消息的链接预览（默认：true）。
- `channels.telegram.streamMode`：`off | partial | block`（草稿流式传输）。
- `channels.telegram.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.telegram.retry`：出站 Telegram API 调用的重试策略（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆盖 Node autoSelectFamily（true=启用，false=禁用）。默认在 Node 22 上禁用以避免 Happy Eyeballs 超时。
- `channels.telegram.proxy`：Bot API 调用的代理 URL（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：启用 webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：webhook 密钥（设置 webhookUrl 时必需）。
- `channels.telegram.webhookPath`：本地 webhook 路径（默认 `/telegram-webhook`）。
- `channels.telegram.actions.reactions`：门控 Telegram 工具反应。
- `channels.telegram.actions.sendMessage`：门控 Telegram 工具消息发送。
- `channels.telegram.actions.deleteMessage`：门控 Telegram 工具消息删除。
- `channels.telegram.actions.sticker`：门控 Telegram 贴纸操作——发送和搜索（默认：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制哪些反应触发系统事件（未设置时默认：`own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制 agent 的反应能力（未设置时默认：`minimal`）。
