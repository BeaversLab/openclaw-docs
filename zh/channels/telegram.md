---
summary: "Telegram bot 支持状态、能力与配置"
read_when:
  - 开发 Telegram 功能或 webhook
title: "Telegram"
---

# Telegram（Bot API）

状态：通过 grammY 支持 bot 私聊与群聊，已可用于生产。默认长轮询；可选 webhook。

## 快速设置（新手）

1. 用 **@BotFather** 创建 bot 并复制 token。
2. 设置 token：
   - 环境变量：`TELEGRAM_BOT_TOKEN=...`
   - 或配置：`channels.telegram.botToken: "..."`。
   - 两者都设置时以配置优先（环境变量仅用于默认账号回退）。
3. 启动 gateway。
4. 私聊默认需要配对；首次联系时批准配对码。

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

## 这是什么

- 由 Gateway 持有的 Telegram Bot API 渠道。
- 路由确定性：回复回到 Telegram；模型不会选择渠道。
- 私聊共享 agent 主会话；群聊隔离（`agent:<agentId>:telegram:group:<chatId>`）。

## 设置（快捷路径）

### 1) 创建 bot token（BotFather）

1. 打开 Telegram 并与 **@BotFather** 对话。
2. 运行 `/newbot`，按提示设置（名称 + 以 `bot` 结尾的用户名）。
3. 复制 token 并妥善保存。

可选 BotFather 设置：

- `/setjoingroups` — 允许/禁止将 bot 加入群组。
- `/setprivacy` — 控制 bot 是否能看到所有群消息。

### 2) 配置 token（环境变量或配置）

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

环境变量：`TELEGRAM_BOT_TOKEN=...`（仅适用于默认账号）。
配置与环境变量同时设置时，以配置优先。

多账号支持：使用 `channels.telegram.accounts` 配置各账号 token 与可选 `name`。参见 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 的通用模式。

3. 启动 gateway。只要解析到 token（配置优先，环境变量回退）就会启动 Telegram。
4. 私聊默认需要配对。首次联系时批准配对码。
5. 群聊：添加 bot，决定隐私/管理员行为（见下文），并设置 `channels.telegram.groups` 以控制提及门控 + allowlist。

## Token + 隐私 + 权限（Telegram 端）

### Token 创建（BotFather）

- `/newbot` 创建 bot 并返回 token（务必保密）。
- 若 token 泄露，请在 @BotFather 撤销/重生成并更新配置。

### 群消息可见性（Privacy Mode）

Telegram bot 默认启用 **Privacy Mode**，会限制其收到的群消息。
若 bot 需要看到*所有*群消息，有两种方式：

- 用 `/setprivacy` **关闭**隐私模式，或
- 将 bot 设为群 **管理员**（管理员 bot 能收到所有消息）。

**注意：** 切换隐私模式后需将 bot 从群中移除并重新添加，设置才生效。

### 群权限（管理员）

管理员身份在群内设置（Telegram UI）。管理员 bot 会收到所有群消息，若需全量可见性可使用管理员。

## 工作方式（行为）

- 入站消息会被规范化为共享渠道 envelope，并包含回复上下文与媒体占位。
- 群聊默认需要提及（原生 @mention 或 `agents.list[].groupChat.mentionPatterns` / `messages.groupChat.mentionPatterns`）。
- 多 agent 覆盖：在 `agents.list[].groupChat.mentionPatterns` 中设置每个 agent 的模式。
- 回复始终回到相同 Telegram chat。
- 长轮询使用 grammY runner，并按聊天顺序处理；总体并发受 `agents.defaults.maxConcurrent` 限制。
- Telegram Bot API 不支持已读回执，因此没有 `sendReadReceipts` 选项。

## 格式化（Telegram HTML）

- 出站文本使用 `parse_mode: "HTML"`（Telegram 支持的标签子集）。
- 类 Markdown 输入会被渲染为 **Telegram 安全 HTML**（粗体/斜体/删除线/代码/链接）；块级元素会被压平成带换行/项目符号的文本。
- 模型输出的原始 HTML 会被转义，避免 Telegram 解析错误。
- 若 Telegram 拒绝 HTML payload，OpenClaw 会将同一消息以纯文本重试。

## 命令（原生 + 自定义）

OpenClaw 启动时会向 Telegram bot 菜单注册原生命令（如 `/status`、`/reset`、`/model`）。
可通过配置添加自定义菜单命令：

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

## 故障排查

- 日志中出现 `setMyCommands failed` 通常意味着无法访问 `api.telegram.org`（HTTPS/DNS 被阻断）。
- 若出现 `sendMessage` 或 `sendChatAction` 失败，请检查 IPv6 路由与 DNS。

更多帮助：[通道 troubleshooting](/zh/channels/troubleshooting)。

注意：

- 自定义命令**仅是菜单入口**；OpenClaw 不会自动实现它们（除非你另行处理）。
- 命令名称会被规范化（去掉 `/`、小写），仅允许 `a-z`、`0-9`、`_`（1–32 字符）。
- 自定义命令**不能覆盖原生命令**。冲突会被忽略并记录日志。
- 若禁用 `commands.native`，只会注册自定义命令（或清空命令）。

## 限制

- 出站文本按 `channels.telegram.textChunkLimit` 分块（默认 4000）。
- 可选按段落分块：设置 `channels.telegram.chunkMode="newline"`，先按空行分段再分块。
- 媒体下载/上传上限为 `channels.telegram.mediaMaxMb`（默认 5）。
- Telegram Bot API 请求超时由 `channels.telegram.timeoutSeconds` 控制（grammY 默认 500）。设置更低以避免长时间挂起。
- 群聊历史上下文使用 `channels.telegram.historyLimit`（或 `channels.telegram.accounts.*.historyLimit`），回退到 `messages.groupChat.historyLimit`。设为 `0` 禁用（默认 50）。
- 私聊历史可用 `channels.telegram.dmHistoryLimit` 限制（用户 turn）。每用户覆盖：`channels.telegram.dms["<user_id>"].historyLimit`。

## 群组激活模式

默认情况下，bot 仅在群里被提及时回复（`@botname` 或 `agents.list[].groupChat.mentionPatterns` 中的模式）。如需更改：

### 通过配置（推荐）

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": { requireMention: false }, // 该群始终回复
      },
    },
  },
}
```

**重要：** 设置 `channels.telegram.groups` 会创建**allowlist** —— 只允许列出的群（或 `"*"`）。
论坛话题会继承其父群配置（allowFrom、requireMention、skills、prompts），除非你在 `channels.telegram.groups.<groupId>.topics.<topicId>` 中设置覆盖。

允许所有群且总是回复：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false }, // 所有群，始终回复
      },
    },
  },
}
```

所有群保持仅提及（默认）：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: true }, // 或干脆不设置 groups
      },
    },
  },
}
```

### 通过命令（会话级）

在群里发送：

- `/activation always` - 回复所有消息
- `/activation mention` - 仅提及回复（默认）

**注意：** 命令只更新会话状态。要在重启后保持，请使用配置。

### 获取群聊 ID

将群里任意消息转发给 Telegram 的 `@userinfobot` 或 `@getidsbot`，即可看到 chat ID（形如 `-1001234567890` 的负数）。

**提示：** 获取自己用户 ID：可私聊 bot（配对消息会回复你的 user ID），或启用命令后使用 `/whoami`。

**隐私提示：** `@userinfobot` 是第三方 bot。若不想使用第三方，可将 bot 加入群并发送一条消息，随后用 `openclaw logs --follow` 查 `chat.id`，或使用 Bot API `getUpdates`。

## 配置写入

默认允许 Telegram 通过渠道事件或 `/config set|unset` 写入配置。

发生于：

- 群升级为超级群并触发 `migrate_to_chat_id`（chat ID 改变）。OpenClaw 可自动迁移 `channels.telegram.groups`。
- 你在 Telegram 聊天中运行 `/config set` 或 `/config unset`（需 `commands.config: true`）。

禁用：

```json5
{
  channels: { telegram: { configWrites: false } },
}
```

## 话题（论坛超级群）

Telegram forum 话题每条消息带 `message_thread_id`。OpenClaw 会：

- 在 Telegram 群会话 key 后追加 `:topic:<threadId>`，使每个话题隔离。
- 发送 typing 与回复时使用 `message_thread_id`，保证回复留在话题内。
- 通用话题（thread id 为 `1`）特殊：发送消息时不带 `message_thread_id`（Telegram 会拒绝），但 typing 仍包含它。
- 在模板上下文暴露 `MessageThreadId` + `IsForum` 用于路由/模板。
- 话题级配置位于 `channels.telegram.groups.<chatId>.topics.<threadId>`（skills、allowlists、自动回复、system prompts、禁用）。
- 话题配置继承群设置（requireMention、allowlists、skills、prompts、enabled），除非单独覆盖。

私聊在少数边缘情况也会包含 `message_thread_id`。OpenClaw 保持 DM 会话 key 不变，但在存在 thread id 时仍会用于回复/草稿流式。

## Inline Buttons

Telegram 支持带回调按钮的 inline keyboard。

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

按账号配置：

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

- `off` — 禁用按钮
- `dm` — 仅私聊（群聊目标禁止）
- `group` — 仅群聊（私聊目标禁止）
- `all` — 私聊 + 群聊
- `allowlist` — 私聊 + 群聊，但仅允许 `allowFrom`/`groupAllowFrom` 中的发送者（同控制命令规则）

默认：`allowlist`。
旧版：`capabilities: ["inlineButtons"]` = `inlineButtons: "all"`。

### 发送按钮

使用 message 工具的 `buttons` 参数：

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

当用户点击按钮，回调数据会以消息形式回传给 agent，格式为：
`callback_data: value`

### 配置选项

Telegram capabilities 可配置两层（上面展示对象形式；旧字符串数组仍支持）：

- `channels.telegram.capabilities`：全局默认能力配置，适用于所有 Telegram 账号（除非被覆盖）。
- `channels.telegram.accounts.<account>.capabilities`：按账号覆盖全局默认。

如果所有 Telegram bot 行为一致，用全局设置。若不同 bot 需要不同策略，使用按账号设置（例如一个账号只处理私聊，另一个允许群聊）。

## 访问控制（私聊 + 群聊）

### 私聊访问

- 默认：`channels.telegram.dmPolicy = "pairing"`。未知发送者会收到配对码；未批准前消息被忽略（配对码 1 小时过期）。
- 批准命令：
  - `openclaw pairing list telegram`
  - `openclaw pairing approve telegram <CODE>`
- 配对是 Telegram 私聊的默认 token 交换机制。详情见 [配对](/zh/start/pairing)
- `channels.telegram.allowFrom` 接受数字用户 ID（推荐）或 `@username`。这**不是** bot 用户名，而是人的用户 ID。向导接受 `@username` 并在可能时解析为数字 ID。

#### 查找你的 Telegram 用户 ID

更安全（不用第三方 bot）：

1. 启动 gateway 并私聊你的 bot。
2. 运行 `openclaw logs --follow` 查找 `from.id`。

替代方案（官方 Bot API）：

1. 私聊你的 bot。
2. 用 bot token 拉取 updates 并读取 `message.from.id`：
   ```bash
   curl "https://api.telegram.org/bot<bot_token>/getUpdates"
   ```

第三方（隐私较弱）：

- 私聊 `@userinfobot` 或 `@getidsbot` 并使用返回的 user id。

### 群聊访问

两个独立控制：

**1. 允许哪些群**（`channels.telegram.groups` 的群 allowlist）：

- 未配置 `groups` = 所有群允许
- 配置了 `groups` = 仅允许列出群或 `"*"`
- 示例：`"groups": { "-1001234567890": {}, "*": {} }` 允许所有群

**2. 允许哪些发送者**（`channels.telegram.groupPolicy` 的发送者过滤）：

- `"open"` = 允许群内所有发送者
- `"allowlist"` = 仅允许 `channels.telegram.groupAllowFrom` 中的发送者
- `"disabled"` = 不接受任何群消息
  默认 `groupPolicy: "allowlist"`（未添加 `groupAllowFrom` 则阻止）。

多数用户希望：`groupPolicy: "allowlist"` + `groupAllowFrom` + `channels.telegram.groups` 中列出特定群

## 长轮询 vs webhook

- 默认：长轮询（无需公网 URL）。
- Webhook 模式：设置 `channels.telegram.webhookUrl`（可选 `channels.telegram.webhookSecret` + `channels.telegram.webhookPath`）。
  - 本地监听默认绑定 `0.0.0.0:8787`，并提供 `POST /telegram-webhook`。
  - 若公网 URL 不同，请用反向代理并将 `channels.telegram.webhookUrl` 指向公网端点。

## 回复线程

Telegram 支持通过标签指定线程回复：

- `[[reply_to_current]]` -- 回复触发消息。
- `[[reply_to:<id>]]` -- 回复指定消息 id。

由 `channels.telegram.replyToMode` 控制：

- `first`（默认）、`all`、`off`。

## 音频消息（语音 vs 文件）

Telegram 区分**语音消息**（圆形气泡）与**音频文件**（带元数据卡片）。
OpenClaw 为兼容默认发送音频文件。

若要在 agent 回复中强制语音气泡，加入标签：

- `[[audio_as_voice]]` — 将音频作为语音消息发送，而非文件。

该标签会从最终文本中移除；其他渠道会忽略。

若使用 message 工具发送，设置 `asVoice: true` 并提供语音兼容的音频 `media` URL
（若提供媒体，可省略 `message`）：

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

OpenClaw 支持接收与发送 Telegram 贴纸，并带有智能缓存。

### 接收贴纸

用户发送贴纸时，OpenClaw 按类型处理：

- **静态贴纸（WEBP）：** 下载并通过视觉处理。贴纸在消息内容中以 `<media:sticker>` 占位。
- **动画贴纸（TGS）：** 跳过（不支持 Lottie 格式处理）。
- **视频贴纸（WEBM）：** 跳过（不支持视频格式处理）。

接收贴纸时的模板上下文字段：

- `Sticker` — 对象包含：
  - `emoji` — 贴纸对应 emoji
  - `setName` — 贴纸集名称
  - `fileId` — Telegram 文件 ID（可用于发送同款贴纸）
  - `fileUniqueId` — 稳定 ID，用于缓存查找
  - `cachedDescription` — 有缓存时的视觉描述

### 贴纸缓存

贴纸会经过 AI 视觉分析生成描述。由于贴纸常被重复发送，OpenClaw 会缓存描述以避免重复调用。

**工作方式：**

1. **首次遇到：** 将贴纸图片发送到 AI 进行视觉分析，生成描述（如“挥手的卡通猫”）。
2. **缓存存储：** 保存描述以及贴纸 file ID、emoji 与 set name。
3. **再次遇到：** 直接使用缓存描述，不再发送图片给 AI。

**缓存位置：** `~/.openclaw/telegram/sticker-cache.json`

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

**好处：**

- 减少重复视觉调用，降低 API 成本
- 缓存贴纸响应更快（无需视觉处理）
- 支持基于缓存描述的贴纸搜索

缓存会随着贴纸接收自动填充，无需手动管理。

### 发送贴纸

agent 可使用 `sticker` 与 `sticker-search` 动作发送/搜索贴纸。默认禁用，需要在配置中开启：

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

- `fileId`（必填）— 贴纸的 Telegram 文件 ID，可从接收贴纸的 `Sticker.fileId` 获取，或来自 `sticker-search` 结果。
- `replyTo`（可选）— 回复的消息 ID。
- `threadId`（可选）— 论坛话题的消息线程 ID。

**搜索贴纸：**

可按描述、emoji 或 set name 搜索缓存贴纸：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

返回匹配贴纸：

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

搜索使用模糊匹配，覆盖描述文本、emoji 字符与 set 名称。

**带线程示例：**

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

## 流式（草稿）

Telegram 可以在 agent 生成回复期间流式显示**草稿气泡**。
OpenClaw 使用 Bot API `sendMessageDraft`（非真实消息），最终再发送普通消息。

要求（Telegram Bot API 9.3+）：

- **启用话题的私聊**（bot 的论坛话题模式）。
- 入站消息必须包含 `message_thread_id`（私聊话题线程）。
- 群组/超级群/频道将忽略草稿流式。

配置：

- `channels.telegram.streamMode: "off" | "partial" | "block"`（默认：`partial`）
  - `partial`：用最新流式文本更新草稿气泡。
  - `block`：更大块（分块）更新草稿气泡。
  - `off`：禁用草稿流式。
- 可选（仅 `streamMode: "block"`）：
  - `channels.telegram.draftChunk: { minChars?, maxChars?, breakPreference? }`
    - 默认：`minChars: 200`、`maxChars: 800`、`breakPreference: "paragraph"`（被 `channels.telegram.textChunkLimit` 限制）。

注意：草稿流式与**分块流式**（频道消息）不同。分块流式默认关闭，若需提前发送 Telegram 消息请设置 `channels.telegram.blockStreaming: true`。

推理流（仅 Telegram）：

- `/reasoning stream` 会在草稿气泡中流式输出推理，然后发送不含推理的最终答案。
- 若 `channels.telegram.streamMode` 为 `off`，推理流会被禁用。
  更多： [流式 + 分块](/zh/concepts/streaming)。

## 重试策略

Telegram API 出站调用在临时网络/429 错误时会指数退避并带抖动重试。通过 `channels.telegram.retry` 配置。参见 [重试策略](/zh/concepts/retry)。

## Agent 工具（消息 + reactions）

- 工具：`telegram` 的 `sendMessage` 动作（`to`、`content`，可选 `mediaUrl`、`replyToMessageId`、`messageThreadId`）。
- 工具：`telegram` 的 `react` 动作（`chatId`、`messageId`、`emoji`）。
- 工具：`telegram` 的 `deleteMessage` 动作（`chatId`、`messageId`）。
- Reaction 移除语义见 [/tools/reactions](/zh/tools/reactions)。
- 工具门控：`channels.telegram.actions.reactions`、`channels.telegram.actions.sendMessage`、`channels.telegram.actions.deleteMessage`（默认启用），以及 `channels.telegram.actions.sticker`（默认禁用）。

## Reaction 通知

**反应机制：**
Telegram reactions 作为**独立的 `message_reaction` 事件**到达，不在消息 payload 中。当用户添加 reaction 时，OpenClaw：

1. 从 Telegram API 接收 `message_reaction` 更新
2. 将其转换为**系统事件**：`"Telegram reaction added: {emoji} by {user} on msg {id}"`
3. 使用**同一会话 key**入队系统事件
4. 下一条消息到达时，会将系统事件出队并前置到 agent 上下文

agent 在会话历史中看到的是**系统通知**，而非消息元数据。

**配置：**

- `channels.telegram.reactionNotifications`：控制哪些 reactions 触发通知
  - `"off"` — 忽略所有 reactions
  - `"own"` — 仅通知用户对 bot 消息的 reactions（尽力；内存判断）（默认）
  - `"all"` — 通知所有 reactions

- `channels.telegram.reactionLevel`：控制 agent 反应能力
  - `"off"` — agent 不可反应
  - `"ack"` — bot 发送确认 reactions（处理中 👀）（默认）
  - `"minimal"` — agent 可适度反应（建议每 5-10 轮 1 次）
  - `"extensive"` — agent 可更频繁反应

**论坛群组：** 论坛群组中的 reactions 包含 `message_thread_id`，会使用 `agent:main:telegram:group:{chatId}:topic:{threadId}` 这样的会话 key，确保同一话题内的 reactions 与消息聚合。

**示例配置：**

```json5
{
  channels: {
    telegram: {
      reactionNotifications: "all", // 看到所有 reactions
      reactionLevel: "minimal", // agent 可适度反应
    },
  },
}
```

**要求：**

- Telegram bot 必须在 `allowed_updates` 中显式请求 `message_reaction`（OpenClaw 自动配置）
- Webhook 模式下，reactions 会包含在 webhook 的 `allowed_updates`
- 轮询模式下，reactions 会包含在 `getUpdates` 的 `allowed_updates`

## 投递目标（CLI/cron）

- 使用 chat id（`123456789`）或用户名（`@name`）作为 target。
- 示例：`openclaw message send --channel telegram --target 123456789 --message "hi"`。

## 故障排查

**Bot 在群里不回应非提及消息：**

- 若设置了 `channels.telegram.groups.*.requireMention=false`，必须关闭 Telegram Bot API **privacy mode**。
  - BotFather：`/setprivacy` → **Disable**（然后将 bot 从群中移除并重新添加）
- `openclaw channels status` 会在配置期望非提及消息时给出警告。
- `openclaw channels status --probe` 可额外检查显式数字群 ID 的成员关系（无法审计通配 `"*"` 规则）。
- 快速测试：`/activation always`（会话级；用配置持久化）

**Bot 完全看不到群消息：**

- 若设置了 `channels.telegram.groups`，必须列出群或使用 `"*"`
- 检查 @BotFather 的 Privacy Settings → "Group Privacy" 应为 **OFF**
- 确认 bot 实际是群成员（不是管理员但没有读权限）
- 查看 gateway 日志：`openclaw logs --follow`（查找 "skipping group message"）

**Bot 对提及回复，但 `/activation always` 不生效：**

- `/activation` 命令只更新会话状态，不写入配置
- 若需持久化，请在 `channels.telegram.groups` 中将该群 `requireMention: false`

**`/status` 等命令无效：**

- 确保你的 Telegram 用户 ID 已被授权（配对或 `channels.telegram.allowFrom`）
- 即使群 `groupPolicy: "open"`，命令也需要授权

**Node 22+ 上长轮询立即中止（常见于代理/自定义 fetch）：**

- Node 22+ 对 `AbortSignal` 更严格；外部 signal 可能立即中止 `fetch`。
- 升级到修复 abort signal 归一化的 OpenClaw 版本，或暂用 Node 20。

**Bot 启动后静默不响应（或日志 `HttpError: Network request ... failed`）：**

- 部分主机会优先解析 `api.telegram.org` 为 IPv6。若服务器无 IPv6 出网，grammY 可能卡在 IPv6 请求上。
- 解决：启用 IPv6 出网 **或** 强制 IPv4 解析 `api.telegram.org`（例如在 `/etc/hosts` 添加 IPv4 A 记录，或在系统 DNS 栈中优先 IPv4），然后重启 gateway。
- 快速检查：`dig +short api.telegram.org A` 与 `dig +short api.telegram.org AAAA` 查看 DNS 返回。

## 配置参考（Telegram）

完整配置见：[配置](/zh/gateway/configuration)

Provider 选项：

- `channels.telegram.enabled`：启用/禁用渠道启动。
- `channels.telegram.botToken`：bot token（BotFather）。
- `channels.telegram.tokenFile`：从文件读取 token。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.telegram.allowFrom`：DM allowlist（ids/usernames）。`open` 需要 `"*"`。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.telegram.groupAllowFrom`：群发送者 allowlist（ids/usernames）。
- `channels.telegram.groups`：按群默认 + allowlist（`"*"` 为全局默认）。
  - `channels.telegram.groups.<id>.requireMention`：提及门控默认。
  - `channels.telegram.groups.<id>.skills`：技能过滤（省略=所有技能，空=无技能）。
  - `channels.telegram.groups.<id>.allowFrom`：按群发送者 allowlist 覆盖。
  - `channels.telegram.groups.<id>.systemPrompt`：群聊额外系统提示。
  - `channels.telegram.groups.<id>.enabled`：`false` 时禁用该群。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：按话题覆盖（字段同 group）。
  - `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：按话题提及门控覆盖。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（默认：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：按账号覆盖。
- `channels.telegram.replyToMode`：`off | first | all`（默认：`first`）。
- `channels.telegram.textChunkLimit`：出站分块大小（字符）。
- `channels.telegram.chunkMode`：`length`（默认）或 `newline`（按空行分段再分块）。
- `channels.telegram.linkPreview`：出站消息链接预览开关（默认 true）。
- `channels.telegram.streamMode`：`off | partial | block`（草稿流式）。
- `channels.telegram.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.telegram.retry`：Telegram API 出站调用重试策略（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆盖 Node autoSelectFamily（true=启用，false=禁用）。Node 22 默认禁用以避免 Happy Eyeballs 超时。
- `channels.telegram.proxy`：Bot API 调用代理 URL（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：启用 webhook 模式。
- `channels.telegram.webhookSecret`：webhook secret（可选）。
- `channels.telegram.webhookPath`：本地 webhook 路径（默认 `/telegram-webhook`）。
- `channels.telegram.actions.reactions`：控制 Telegram 工具 reactions。
- `channels.telegram.actions.sendMessage`：控制 Telegram 工具消息发送。
- `channels.telegram.actions.deleteMessage`：控制 Telegram 工具消息删除。
- `channels.telegram.actions.sticker`：控制 Telegram 贴纸动作 — 发送与搜索（默认：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制哪些 reactions 触发系统事件（未设置时默认 `own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制 agent 反应能力（未设置时默认 `minimal`）。

相关全局选项：

- `agents.list[].groupChat.mentionPatterns`（提及门控模式）。
- `messages.groupChat.mentionPatterns`（全局回退）。
- `commands.native`（默认 `"auto"` → Telegram/Discord 开启，Slack 关闭）、`commands.text`、`commands.useAccessGroups`（命令行为）。可用 `channels.telegram.commands.native` 覆盖。
- `messages.responsePrefix`、`messages.ackReaction`、`messages.ackReactionScope`、`messages.removeAckAfterReply`。
