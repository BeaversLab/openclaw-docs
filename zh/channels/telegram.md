---
summary: "Telegram bot 支持状态、功能和配置"
read_when:
  - 正在处理 Telegram 功能或 webhooks
title: "Telegram"
---

# Telegram (Bot API)

状态：通过 grammY 实现的机器人私信和群组功能已可用于生产环境。长轮询是默认模式；Webhook 模式是可选的。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    Telegram 的默认私信策略是配对。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关) configuration" icon="settings" href="/zh/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="Create the bot token in BotFather">
    打开 Telegram 并与 **@BotFather** 对话（确认句柄确为 `@BotFather`）。

    运行 `/newbot`，按照提示操作，并保存令牌。

  </Step>

  <Step title="Configure token and 私信 policy">

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

    环境变量回退：`TELEGRAM_BOT_TOKEN=...`（仅限默认账户）。
    Telegram **不**使用 `openclaw channels login telegram`；在配置/环境中配置令牌，然后启动 Gateway。

  </Step>

  <Step title="Start gateway and approve first 私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码在 1 小时后过期。

  </Step>

  <Step title="Add the bot to a group">
    将 bot 添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>
令牌解析顺序具有账户感知能力。实际上，配置值优先于环境变量回退，并且 `TELEGRAM_BOT_TOKEN` 仅适用于默认账户。
</Note>

## Telegram 端设置

<AccordionGroup>
  <Accordion title="隐私模式和群组可见性">
    Telegram 机器人默认处于 **隐私模式**，这限制了它们能接收的群组消息。

    如果机器人必须查看所有群组消息，请执行以下任一操作：

    - 通过 `/setprivacy` 禁用隐私模式，或
    - 将机器人设为群组管理员。

    切换隐私模式时，请从每个群组中移除并重新添加机器人，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="群组权限">
    管理员状态是在 Telegram 群组设置中控制的。

    管理员机器人会接收所有群组消息，这对于始终开启的群组行为非常有用。

  </Accordion>

  <Accordion title="有用的 BotFather 开关">

    - `/setjoingroups` 用于允许/禁止添加到群组
    - `/setprivacy` 用于群组可见性行为

  </Accordion>
</AccordionGroup>

## 访问控制和激活

<Tabs>
  <Tab title="私信 policy">
    `channels.telegram.dmPolicy` 控制私信访问权限：

    - `pairing`（默认）
    - `allowlist`（要求 `allowFrom` 中至少有一个发送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。接受并标准化 `telegram:` / `tg:` 前缀。
    `dmPolicy: "allowlist"` 如果 `allowFrom` 为空，则会阻止所有私信，并且配置验证会拒绝该设置。
    新手引导接受 `@username` 输入并将其解析为数字 ID。
    如果您已升级且配置包含 `@username` 允许列表条目，请运行 `openclaw doctor --fix` 来解析它们（尽力而为；需要 Telegram bot token）。
    如果您之前依赖配对存储（pairing-store）允许列表文件，`openclaw doctor --fix` 可以在允许列表流程中将条目恢复到 `channels.telegram.allowFrom`（例如，当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单一所有者的机器人，建议使用带有显式数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以保持配置中的访问策略持久化（而不是依赖于先前的配对批准）。

    ### 查找您的 Telegram 用户 ID

    更安全的方法（不使用第三方机器人）：

    1. 向您的机器人发送私信。
    2. 运行 `openclaw logs --follow`。
    3. 读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隐私性较低）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="组策略和允许列表">
    两个控件协同应用：

    1. **允许哪些组** (`channels.telegram.groups`)
       - 无 `groups` 配置：
         - 使用 `groupPolicy: "open"`：任何组都可以通过组 ID 检查
         - 使用 `groupPolicy: "allowlist"`（默认）：组将被阻止，直到您添加 `groups` 条目（或 `"*"`）
       - 已配置 `groups`：作为允许列表（显式 ID 或 `"*"`）

    2. **组内允许哪些发送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于组发送者筛选。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被标准化）。
    请勿将 Telegram 组或超级组聊天 ID 放入 `groupAllowFrom` 中。负数聊天 ID 属于 `channels.telegram.groups`。
    非数字条目将被忽略，不用于发送者授权。
    安全边界 (`2026.2.25+`)：组发送者授权 **不** 继承私信配对存储的批准。
    配对仅限私信。对于组，请设置 `groupAllowFrom` 或每个组/每个主题的 `allowFrom`。
    运行时说明：如果完全缺少 `channels.telegram`，除非明确设置 `channels.defaults.groupPolicy`，否则运行时默认为 `groupPolicy="allowlist"` 的失效关闭策略。

    示例：允许一个特定组中的任何成员：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

    示例：仅允许一个特定组内的特定用户：

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          requireMention: true,
          allowFrom: ["8734062810", "745123456"],
        },
      },
    },
  },
}
```

    <Warning>
      常见错误：`groupAllowFrom` 不是 Telegram 组允许列表。

      - 请将像 `-1001234567890` 这样的负数 Telegram 组或超级组聊天 ID 放在 `channels.telegram.groups` 下。
      - 当您想限制允许组内哪些人可以触发机器人时，请将像 `8734062810` 这样的 Telegram 用户 ID 放在 `groupAllowFrom` 下。
      - 仅当您希望允许组的任何成员都能与机器人交谈时，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行为">
    默认情况下，群组回复需要提及。

    提及可以来自：

    - 原生 `@botusername` 提及，或
    - 以下内容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    会话级命令开关：

    - `/activation always`
    - `/activation mention`

    这些仅更新会话状态。请使用配置以实现持久化。

    持久化配置示例：

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false },
      },
    },
  },
}
```

    获取群组聊天 ID：

    - 将群组消息转发到 `@userinfobot` / `@getidsbot`
    - 或从 `openclaw logs --follow` 读取 `chat.id`
    - 或检查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 归网关进程所有。
- 路由是确定性的：Telegram 入站回复会回发到 Telegram（模型不选择渠道）。
- 入站消息会规范化为包含回复元数据和媒体占位符的共享渠道信封。
- 群组会话按群组 ID 隔离。论坛主题附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`；OpenClaw 使用感知线程的会话键路由它们，并保留线程 ID 以供回复。
- 长轮询使用 grammY 运行器，进行每个聊天/每个线程的排序。整体运行器接收器并发性使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/主题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 映射到 Telegram 上的 `partial`（与跨渠道命名兼容）
    - 旧版 `channels.telegram.streamMode` 和布尔 `streaming` 值会自动映射

    对于仅文本回复：

    - 私信：OpenClaw 保持相同的预览消息并就地执行最终编辑（没有第二条消息）
    - 群组/主题：OpenClaw 保持相同的预览消息并就地执行最终编辑（没有第二条消息）

    对于复杂回复（例如媒体负载），OpenClaw 会回退到正常的最终传递，然后清理预览消息。

    预览流与分块流式传输是分开的。当明确为 Telegram 启用分块流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

    如果原生草稿传输不可用/被拒绝，OpenClaw 会自动回退到 `sendMessage` + `editMessageText`。

    Telegram 独有的推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 最终答案在不包含推理文本的情况下发送

  </Accordion>

  <Accordion title="格式化和 HTML 回退">
    出站文本使用 Telegram `parse_mode: "HTML"`。

    - 类 Markdown 文本会被渲染为 Telegram 安全的 HTML。
    - 原始模型 HTML 会被转义以减少 Telegram 解析失败。
    - 如果 Telegram 拒绝解析后的 HTML，OpenClaw 会以纯文本重试。

    链接预览默认启用，可以通过 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="本机命令和自定义命令">
    Telegram 命令菜单注册在启动时通过 `setMyCommands` 处理。

    本机命令默认设置：

    - `commands.native: "auto"` 为 Telegram 启用本机命令

    添加自定义命令菜单条目：

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

    规则：

    - 名称会被标准化（去除前导 `/`，转为小写）
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令不能覆盖本机命令
    - 冲突/重复项将被跳过并记录日志

    注意事项：

    - 自定义命令仅为菜单条目；它们不会自动实现行为逻辑
    - 即使未在 Telegram 菜单中显示，插件/技能命令在输入时仍然可以工作

    如果禁用了本机命令，内置命令将被移除。如果已配置，自定义/插件命令可能仍会注册。

    常见设置失败：

    - `setMyCommands failed` 且伴有 `BOT_COMMANDS_TOO_MUCH`，表示 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 且伴有网络/获取错误，通常表示到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    当安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 将代码粘贴到 iOS 应用中
    3. `/pair approve` 批准最新的待处理请求

    更多详情：[配对](/zh/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="内联按钮">
    配置内联键盘作用域：

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

    按账户覆盖：

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

    作用域：

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist` (默认)

    旧的 `capabilities: ["inlineButtons"]` 映射到 `inlineButtons: "all"`。

    消息操作示例：

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

    回调点击作为文本传递给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="适用于代理和自动化的 Telegram 消息操作">
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选的 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选的 `iconColor`, `iconCustomEmojiId`)

    渠道消息操作提供了符合人体工程学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    闸控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认：禁用)

    注意：`edit` 和 `topic-create` 目前默认已启用，并且没有单独的 `channels.telegram.actions.*` 切换开关。
    运行时发送使用活动的配置/密钥快照 (启动/重新加载)，因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    反应移除语义：[/tools/reactions](/zh/tools/reactions)

  </Accordion>

  <Accordion title="回复线程标签">
    Telegram 支持在生成的输出中使用显式回复线程标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    注意：`off` 会禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍然有效。

  </Accordion>

  <Accordion title="论坛主题和线程行为">
    论坛超级群组：

    - 主题会话键附加 `:topic:<threadId>`
    - 回复和输入指示针对主题线程
    - 主题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主题（`threadId=1`）特殊情况：

    - 发送消息时省略 `message_thread_id`（Telegram 拒绝 `sendMessage(...thread_id=1)`）
    - 输入动作仍包含 `message_thread_id`

    主题继承：主题条目继承群组设置，除非被覆盖（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 仅限于主题，不从群组默认值继承。

    **按主题的代理路由**：每个主题都可以通过在主题配置中设置 `agentId` 来路由到不同的代理。这为每个主题提供了自己独立的工作区、内存和会话。例如：

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // General topic → main agent
                "3": { agentId: "zu" },        // Dev topic → zu agent
                "5": { agentId: "coder" }      // Code review → coder agent
              }
            }
          }
        }
      }
    }
    ```

    每个主题随后都有自己的会话键：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 主题绑定**：论坛主题可以通过顶层类型的 ACP 绑定来固定 ACP harness 会话：

    - `bindings[]`，带有 `type: "acp"` 和 `match.channel: "telegram"`

    例如：

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
            channel: "telegram",
            accountId: "default",
            peer: { kind: "group", id: "-1001234567890:topic:42" },
          },
        },
      ],
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "42": {
                  requireMention: false,
                },
              },
            },
          },
        },
      },
    }
    ```

    这目前仅适用于群组和超级群组中的论坛主题。

    **从聊天生成的线程绑定 ACP 衍生**：

    - `/acp spawn <agent> --thread here|auto` 可以将当前 Telegram 主题绑定到新的 ACP 会话。
    - 后续主题消息直接路由到绑定的 ACP 会话（不需要 `/acp steer`）。
    - OpenClaw 在成功绑定后将生成确认消息置顶于主题内。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文包括：

    - `MessageThreadId`
    - `IsForum`

    私信 线程行为：

    - 带有 `message_thread_id` 的私聊保留私信路由，但使用线程感知的会话键/回复目标。

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 语音消息

    Telegram 区分语音笔记和音频文件。

    - 默认：音频文件行为
    - 在 agent 回复中标记 `[[audio_as_voice]]` 以强制发送语音笔记

    消息操作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

    ### 视频消息

    Telegram 区分视频文件和视频笔记。

    消息操作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    视频笔记不支持字幕；提供的消息文本将单独发送。

    ### 贴纸

    传入贴纸处理：

    - 静态 WEBP：已下载并处理（占位符 `<media:sticker>`）
    - 动画 TGS：已跳过
    - 视频 WEBM：已跳过

    贴纸上下文字段：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    贴纸缓存文件：

    - `~/.openclaw/telegram/sticker-cache.json`

    贴纸仅描述一次（尽可能）并缓存，以减少重复的视觉调用。

    启用贴纸操作：

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

    发送贴纸操作：

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    搜索缓存的贴纸：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="反应通知">
    Telegram 反应以 `message_reaction` 更新的形式到达（与消息载荷分离）。

    启用后，OpenClaw 会将系统事件（如下所示）加入队列：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`: `off | own | all` (默认: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (默认: `minimal`)

    注意：

    - `own` 指仅用户对机器人发送的消息的反应（通过已发送消息缓存尽力而为）。
    - 反应事件仍遵循 Telegram 访问控制（`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`）；未授权的发送者会被丢弃。
    - Telegram 不在反应更新中提供主题 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组常规主题会话（`:topic:1`），而不是确切的原始主题

    用于轮询/Webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="确认反应">
    当 OpenClaw 正在处理入站消息时，`ackReaction` 会发送一个确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 坐席身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

    注意：

    - Telegram 期望 unicode 表情符号（例如 "👀"）。
    - 使用 `""` 可禁用某个渠道或账户的反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    默认情况下启用频道配置写入 (`configWrites !== false`)。

    Telegram 触发的写入包括：

    - 组迁移事件 (`migrate_to_chat_id`)，用于更新 `channels.telegram.groups`
    - `/config set` 和 `/config unset`（需要启用命令）

    禁用方法：

```json5
{
  channels: {
    telegram: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="长轮询与 Webhook">
    默认值：长轮询。

    Webhook 模式：

    - 设置 `channels.telegram.webhookUrl`
    - 设置 `channels.telegram.webhookSecret`（设置 webhook URL 时必需）
    - 可选 `channels.telegram.webhookPath`（默认为 `/telegram-webhook`）
    - 可选 `channels.telegram.webhookHost`（默认为 `127.0.0.1`）
    - 可选 `channels.telegram.webhookPort`（默认为 `8787`）

    Webhook 模式的默认本地监听器绑定到 `127.0.0.1:8787`。

    如果您的公共端点不同，请在前方放置一个反向代理，并将 `webhookUrl` 指向公共 URL。
    当您有意需要外部入口时，请设置 `webhookHost`（例如 `0.0.0.0`）。

  </Accordion>

  <Accordion title="限制、重试和CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度分割之前优先考虑段落边界（空行）。
    - `channels.telegram.mediaMaxMb`（默认为 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram API 客户端超时（如果未设置，则应用 grammY 默认值）。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认为 50）；`0` 将其禁用。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于可恢复的出站 Telegram 错误的 CLI 发送辅助工具（API/工具/操作）。

    CLI 发送目标可以是数字聊天 ID 或用户名：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    Telegram 投票使用 `openclaw message poll` 并支持论坛主题：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Telegram 专用投票标志：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用于论坛主题（或使用 `:topic:` 目标）

    Telegram 发送还支持：

    - `--buttons` 用于内联键盘，当 `channels.telegram.capabilities.inlineButtons` 允许时
    - `--force-document` 将出站图像和 GIF 作为文档发送，而不是压缩的照片或动画媒体上传

    操作控制：

    - `channels.telegram.actions.sendMessage=false` 禁用出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 禁用 Telegram 投票创建，同时保留常规发送启用

  </Accordion>


  <Accordion title="Telegram 中的执行审批">
    Telegram 支持在审批人的私信中进行执行审批，并且可以选择在原始聊天或话题中发布审批提示。

    配置路径：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, 默认值: `dm`)
    - `agentFilter`, `sessionFilter`

    审批人必须是数字格式的 Telegram 用户 ID。当 `enabled` 为 false 或 `approvers` 为空时，Telegram 不会充当执行审批客户端。审批请求将回退到其他已配置的审批路由或执行审批回退策略。

    传递规则：

    - `target: "dm"` 仅将审批提示发送到已配置的审批人私信
    - `target: "channel"` 将提示发回原始 Telegram 聊天/话题
    - `target: "both"` 发送到审批人私信和原始聊天/话题

    只有已配置的审批人才能批准或拒绝。非审批人无法使用 `/approve`，也无法使用 Telegram 审批按钮。

    频道传递会在聊天中显示命令文本，因此请仅在受信任的群组/话题中启用 `channel` 或 `both`。当提示发送到论坛话题时，OpenClaw 会为审批提示和审批后的后续消息保留该话题。

    内联审批按钮还取决于 `channels.telegram.capabilities.inlineButtons` 是否允许目标界面 (`dm`、`group` 或 `all`)。

    相关文档：[执行审批](/zh/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见。
      - BotFather: `/setprivacy` -> Disable
      - 然后将机器人从群组中移除并重新添加
    - 当配置预期未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法进行成员资格探测。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 当存在 `channels.telegram.groups` 时，必须列出群组（或包含 `"*"`）
    - 验证机器人在群组中的成员身份
    - 查看日志：`openclaw logs --follow` 以了解跳过原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略为 `open`，命令授权仍然适用
    - `setMyCommands failed` 且带有 `BOT_COMMANDS_TOO_MUCH` 意味着原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - 带有网络/获取错误的 `setMyCommands failed` 通常表明存在到 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 可能会在 AbortSignal 类型不匹配时触发立即中止行为。
    - 某些主机首先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站流量可能会导致间歇性的 Telegram API 故障。
    - 如果日志包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将这些作为可恢复的网络错误进行重试。
    - 在具有不稳定直接出站/TLS 的 VPS 主机上，通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主机是 WSL2 或明确使用仅 IPv4 行为效果更好，请强制选择地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - 环境变量覆盖（临时）：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 验证 DNS 应答：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多帮助：[渠道故障排除](/zh/channels/troubleshooting)。

## Telegram 配置参考指针

主要参考：

- `channels.telegram.enabled`：启用/禁用渠道启动。
- `channels.telegram.botToken`：机器人令牌（BotFather）。
- `channels.telegram.tokenFile`：从常规文件路径读取令牌。符号链接将被拒绝。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.telegram.allowFrom`：私信允许列表（数字 Telegram 用户 ID）。`allowlist` 至少需要一个发送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以将旧的 `@username` 条目解析为 ID，并且可以在允许列表迁移流程中从配对存储文件中恢复允许列表条目。
- `channels.telegram.actions.poll`：启用或禁用 Telegram 投票创建（默认：已启用；仍然需要 `sendMessage`）。
- `channels.telegram.defaultTo`：当没有提供显式 `--reply-to` 时，由 Telegram `--deliver` 使用的默认 CLI 目标。
- `channels.telegram.groupPolicy`: `open | allowlist | disabled` (默认值：allowlist)。
- `channels.telegram.groupAllowFrom`: 群组发送者白名单（Telegram 用户 ID 数字）。`openclaw doctor --fix` 可以将旧版 `@username` 条目解析为 ID。非数字条目在认证时会被忽略。群组认证不使用 私信 配对存储回退 (`2026.2.25+`)。
- 多账户优先级：
  - 当配置了两个或更多账户 ID 时，请设置 `channels.telegram.defaultAccount` (或包含 `channels.telegram.accounts.default`) 以明确默认路由。
  - 如果两者均未设置，OpenClaw 将回退到第一个标准化的账户 ID，并且 `openclaw doctor` 会发出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 仅适用于 `default` 账户。
  - 当未设置账户级值时，命名账户会继承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名账户不继承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`: 每个群组的默认值 + 白名单（使用 `"*"` 设置全局默认值）。
  - `channels.telegram.groups.<id>.groupPolicy`: groupPolicy (`open | allowlist | disabled`) 的每个群组覆盖。
  - `channels.telegram.groups.<id>.requireMention`: 提及门控默认值。
  - `channels.telegram.groups.<id>.skills`: 技能筛选器（省略 = 所有技能，空 = 无）。
  - `channels.telegram.groups.<id>.allowFrom`: 每个群组的发送者白名单覆盖。
  - `channels.telegram.groups.<id>.systemPrompt`: 群组的额外系统提示词。
  - `channels.telegram.groups.<id>.enabled`: 当 `false` 时禁用该群组。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`: 每个主题的覆盖（群组字段 + 仅限主题的 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`: 将此主题路由到特定代理（覆盖群组级别和绑定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`: groupPolicy (`open | allowlist | disabled`) 的每个主题覆盖。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`: 每个主题的提及门控覆盖。
- 具有 `type: "acp"` 和规范主题 ID `chatId:topic:topicId` 的顶级 `bindings[]` 位于 `match.peer.id` 中：持久 ACP 主题绑定字段（参见 [ACP Agents](/zh/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：将私信主题路由到特定代理（与论坛主题行为相同）。
- `channels.telegram.execApprovals.enabled`：为此帐户启用 Telegram 作为基于聊天的 exec 审批客户端。
- `channels.telegram.execApprovals.approvers`：允许批准或拒绝 exec 请求的 Telegram 用户 ID。启用 exec 审批时必填。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（默认值：`dm`）。`channel` 和 `both` 在存在时保留原始 Telegram 主题。
- `channels.telegram.execApprovals.agentFilter`：转发的审批提示的可选代理 ID 筛选器。
- `channels.telegram.execApprovals.sessionFilter`：转发的审批提示的可选会话密钥筛选器（子字符串或正则表达式）。
- `channels.telegram.accounts.<account>.execApprovals`：Telegram exec 审批路由和审批人授权的每个帐户覆盖。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（默认值：允许列表）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每个帐户覆盖。
- `channels.telegram.commands.nativeSkills`：启用/禁用 Telegram 原生技能命令。
- `channels.telegram.replyToMode`：`off | first | all`（默认值：`off`）。
- `channels.telegram.textChunkLimit`：出站块大小（字符）。
- `channels.telegram.chunkMode`：`length`（默认值）或 `newline` 在长度分块之前按空行（段落边界）分割。
- `channels.telegram.linkPreview`：切换出站消息的链接预览（默认值：true）。
- `channels.telegram.streaming`: `off | partial | block | progress` (live stream preview; default: `partial`; `progress` maps to `partial`; `block` is legacy preview mode compatibility). Telegram preview streaming uses a single preview message that is edited in place.
- `channels.telegram.mediaMaxMb`: inbound/outbound Telegram media cap (MB, default: 100).
- `channels.telegram.retry`: retry policy for Telegram send helpers (CLI/tools/actions) on recoverable outbound API errors (attempts, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily`: override Node autoSelectFamily (true=enable, false=disable). Defaults to enabled on Node 22+, with WSL2 defaulting to disabled.
- `channels.telegram.network.dnsResultOrder`: override DNS result order (`ipv4first` or `verbatim`). Defaults to `ipv4first` on Node 22+.
- `channels.telegram.proxy`: proxy URL for Bot API calls (SOCKS/HTTP).
- `channels.telegram.webhookUrl`: enable webhook mode (requires `channels.telegram.webhookSecret`).
- `channels.telegram.webhookSecret`: webhook secret (required when webhookUrl is set).
- `channels.telegram.webhookPath`: local webhook path (default `/telegram-webhook`).
- `channels.telegram.webhookHost`: local webhook bind host (default `127.0.0.1`).
- `channels.telegram.webhookPort`: local webhook bind port (default `8787`).
- `channels.telegram.actions.reactions`: gate Telegram 工具 reactions.
- `channels.telegram.actions.sendMessage`: gate Telegram 工具 message sends.
- `channels.telegram.actions.deleteMessage`: gate Telegram 工具 message deletes.
- `channels.telegram.actions.sticker`: gate Telegram sticker actions — send and search (default: false).
- `channels.telegram.reactionNotifications`: `off | own | all` — control which reactions trigger system events (default: `own` when not set).
- `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` — control agent's reaction capability (default: `minimal` when not set).

- [配置参考 - Telegram](/zh/gateway/configuration-reference#telegram)

Telegram 特有的高信噪比字段：

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` 必须指向常规文件；拒绝使用符号链接)
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, top-level `bindings[]` (`type: "acp"`)
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`
- streaming: `streaming` (预览), `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `proxy`
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## 相关

- [配对](/zh/channels/pairing)
- [通道路由](/zh/channels/channel-routing)
- [多代理路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)

import en from "/components/footer/en.mdx";

<en />
