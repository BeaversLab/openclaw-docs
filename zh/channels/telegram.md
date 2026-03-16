---
summary: "Telegram bot 支持状态、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

状态：通过 grammY 实现的 bot 私信和群组功能已可用于生产环境。默认模式为长轮询；Webhook 模式为可选项。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    Telegram 的默认私信策略是配对。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关) configuration" icon="settings" href="/en/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="Create the bot token in BotFather">
    打开 Telegram 并与 **@BotFather** 聊天（请确认句柄确为 `@BotFather`）。

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
    Telegram **不**使用 `openclaw channels login telegram`；请在配置/环境变量中配置令牌，然后启动 Gateway 网关。

  </Step>

  <Step title="Start gateway and approve first 私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对代码将在 1 小时后过期。

  </Step>

  <Step title="Add the bot to a group">
    将机器人添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>
  令牌解析顺序是感知账户的。实际上，配置值优先于环境变量回退，而 `TELEGRAM_BOT_TOKEN`
  仅适用于默认账户。
</Note>

## Telegram 端设置

<AccordionGroup>
  <Accordion title="隐私模式和群组可见性">
    Telegram 机器人默认处于 **隐私模式**，这限制了它们接收的群组消息。

    如果机器人必须查看所有群组消息，请执行以下操作之一：

    - 通过 `/setprivacy` 禁用隐私模式，或者
    - 将机器人设为群组管理员。

    切换隐私模式时，请在每个群组中移除并重新添加机器人，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="群组权限">
    管理员状态在 Telegram 群组设置中控制。

    管理员机器人会接收所有群组消息，这对于始终开启的群组行为非常有用。

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` 以允许/拒绝添加到群组
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

    `channels.telegram.allowFrom` 接受数值形式的 Telegram 用户 ID。接受并标准化 `telegram:` / `tg:` 前缀。
    如果 `allowFrom` 为空，`dmPolicy: "allowlist"` 将阻止所有私信，并且会被配置验证拒绝。
    新手引导向导接受 `@username` 输入并将其解析为数值 ID。
    如果您升级了配置且其中包含 `@username` 白名单条目，请运行 `openclaw doctor --fix` 进行解析（尽力而为；需要 Telegram 机器人令牌）。
    如果您之前依赖配对存储白名单文件，`openclaw doctor --fix` 可以在白名单流程中将条目恢复到 `channels.telegram.allowFrom`（例如当 `dmPolicy: "allowlist"` 尚无明确 ID 时）。

    对于单人拥有的机器人，建议使用带有明确数值 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以使配置中的访问策略持久化（而不是依赖之前的配对批准）。

    ### 查找您的 Telegram 用户 ID

    更安全（无第三方机器人）：

    1. 向您的机器人发送私信。
    2. 运行 `openclaw logs --follow`。
    3. 阅读 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（私密性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群组策略和允许列表">
    两项控制共同生效：

    1. **允许哪些群组** (`channels.telegram.groups`)
       - 无 `groups` 配置：
         - 配合 `groupPolicy: "open"`：任何群组均可通过群组 ID 检查
         - 配合 `groupPolicy: "allowlist"`（默认）：群组将被阻止，直至您添加 `groups` 条目（或 `"*"`）
       - 已配置 `groups`：作为允许列表使用（显式 ID 或 `"*"`）

    2. **允许群组中的哪些发送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发送者过滤。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被规范化）。
    请勿将 Telegram 群组或超级群组聊天 ID 放入 `groupAllowFrom`。负数聊天 ID 应归入 `channels.telegram.groups`。
    非数字条目在发送者授权时将被忽略。
    安全边界（`2026.2.25+`）：群组发送者身份验证**不**继承私信配对存储的审批。
    配对仅限于私信。对于群组，请设置 `groupAllowFrom` 或针对每个群组/每个话题的 `allowFrom`。
    运行时说明：如果完全缺少 `channels.telegram`，运行时将默认为失败关闭 `groupPolicy="allowlist"`，除非显式设置了 `channels.defaults.groupPolicy`。

    示例：允许一个特定群组中的任何成员：

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

    示例：仅允许一个特定群组内的特定用户：

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
      常见错误：`groupAllowFrom` 不是 Telegram 群组允许列表。

      - 将负数的 Telegram 群组或超级群组聊天 ID（如 `-1001234567890`）放在 `channels.telegram.groups` 下。
      - 当您希望限制允许群组内哪些人可以触发机器人时，将 Telegram 用户 ID（如 `8734062810`）放在 `groupAllowFrom` 下。
      - 仅当您希望允许群组的任何成员都能与机器人对话时，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行为">
    默认情况下，群组回复需要提及。

    提及可以来自：

    - 原生 `@botusername` 提及，或
    - 以下内容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    会话级别的命令切换：

    - `/activation always`
    - `/activation mention`

    这些仅更新会话状态。使用配置以实现持久化。

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

    - 将群组消息转发给 `@userinfobot` / `@getidsbot`
    - 或从 `openclaw logs --follow` 读取 `chat.id`
    - 或检查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 归网关进程所有。
- 路由是确定性的：Telegram 入站回复会回发到 Telegram（模型不选择渠道）。
- 入站消息会被标准化为共享的渠道信封，其中包含回复元数据和媒体占位符。
- 群组会话按群组 ID 隔离。论坛主题会附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`；OpenClaw 使用具有线程感知能力的会话密钥对其进行路由，并保留线程 ID 用于回复。
- 长轮询使用 grammY 运行器，并按每个聊天/每个线程进行排序。总体运行器接收并发使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认值：`partial`）
    - `progress` 在 Telegram 上映射为 `partial`（兼容跨渠道命名）
    - 旧版 `channels.telegram.streamMode` 和布尔 `streaming` 值会自动映射

    对于纯文本回复：

    - 私信：OpenClaw 保持相同的预览消息并执行就地最终编辑（不发送第二条消息）
    - 群组/话题：OpenClaw 保持相同的预览消息并执行就地最终编辑（不发送第二条消息）

    对于复杂回复（例如媒体负载），OpenClaw 会回退到正常最终发送，然后清理预览消息。

    预览流与分块流式传输是分开的。当为 Telegram 显式启用分块流式传输时，OpenClaw 会跳过预览流以避免重复流式传输。

    如果原生草稿传输不可用/被拒绝，OpenClaw 会自动回退到 `sendMessage` + `editMessageText`。

    Telegram 专用推理流：

    - `/reasoning stream` 在生成过程中将推理发送到实时预览
    - 最终回答不包含推理文本

  </Accordion>

  <Accordion title="格式和 HTML 回退">
    出站文本使用 Telegram `parse_mode: "HTML"`。

    - 类似 Markdown 的文本会被渲染为 Telegram 安全的 HTML。
    - 原始模型 HTML 会被转义以减少 Telegram 解析失败的情况。
    - 如果 Telegram 拒绝已解析的 HTML，OpenClaw 将以纯文本形式重试。

    链接预览默认启用，可以通过 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="Native commands and custom commands">
    Telegram 命令菜单注册在启动时通过 `setMyCommands` 处理。

    原生命令默认值：

    - `commands.native: "auto"` 为 Telegram 启用原生命令

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

    - 名称会被规范化（去除前导 `/`，转为小写）
    - 有效模式：`a-z`，`0-9`，`_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复项将被跳过并记录

    注意事项：

    - 自定义命令仅作为菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在输入时仍可工作

    如果禁用了原生命令，内置命令将被移除。如果已配置，自定义/插件命令可能仍会注册。

    常见设置失败：

    - `setMyCommands failed` 并带有 `BOT_COMMANDS_TOO_MUCH` 意味着 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 并带有网络/获取错误通常意味着到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令 (`device-pair` 插件)

    当安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 在 iOS 应用中粘贴代码
    3. `/pair approve` 批准最新的待处理请求

    更多详情：[配对](/en/channels/pairing#pair-via-telegram-recommended-for-ios)。

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

    每账户覆盖：

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
    - `allowlist`（默认）

    旧版 `capabilities: ["inlineButtons"]` 映射到 `inlineButtons: "all"`。

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

    回调点击会作为文本传递给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="适用于代理和自动化的 Telegram 消息操作">
    Telegram 工具操作包括：

    - `sendMessage` (`to`、`content`、可选 `mediaUrl`、`replyToMessageId`、`messageThreadId`)
    - `react` (`chatId`、`messageId`、`emoji`)
    - `deleteMessage` (`chatId`、`messageId`)
    - `editMessage` (`chatId`、`messageId`、`content`)
    - `createForumTopic` (`chatId`、`name`、可选 `iconColor`、`iconCustomEmojiId`)

    频道消息操作提供了符合人体工程学的别名 (`send`、`react`、`delete`、`edit`、`sticker`、`sticker-search`、`topic-create`)。

    门控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认：禁用)

    注意：`edit` 和 `topic-create` 目前默认启用，并且没有单独的 `channels.telegram.actions.*` 切换开关。
    运行时发送使用活动的配置/机密快照（启动/重新加载），因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    反应移除语义：[/tools/reactions](/en/tools/reactions)

  </Accordion>

  <Accordion title="回复线程标签">
    Telegram 支持在生成输出中使用显式回复线程标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    注意：`off` 会禁用隐式回复线程。显式 `[[reply_to_*]]` 标签仍然有效。

  </Accordion>

  <Accordion title="论坛主题和线程行为">
    论坛超级群组：

    - 主题会话键附加 `:topic:<threadId>`
    - 回复和输入状态以主题线程为目标
    - 主题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主题（`threadId=1`）特殊情况：

    - 发送消息时省略 `message_thread_id`（Telegram 拒绝 `sendMessage(...thread_id=1)`）
    - 输入状态动作仍包含 `message_thread_id`

    主题继承：除非被覆盖，主题条目继承群组设置（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 是主题专用的，不从群组默认值继承。

    **按主题的路由代理**：通过在主题配置中设置 `agentId`，每个主题可以路由到不同的代理。这为每个主题提供了其独立的工作区、内存和会话。例如：

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

    然后，每个主题都有自己的会话键：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 主题绑定**：论坛主题可以通过顶级类型的 ACP 绑定来固定 ACP 驱动会话：

    - `bindings[]` 搭配 `type: "acp"` 和 `match.channel: "telegram"`

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

    此功能目前仅适用于群组和超级群组中的论坛主题。

    **从聊天启动线程绑定的 ACP**：

    - `/acp spawn <agent> --thread here|auto` 可以将当前的 Telegram 主题绑定到新的 ACP 会话。
    - 后续主题消息直接路由到绑定的 ACP 会话（无需 `/acp steer`）。
    - 成功绑定后，OpenClaw 会将启动确认消息固定在主题内。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文包括：

    - `MessageThreadId`
    - `IsForum`

    私信线程行为：

    - 带有 `message_thread_id` 的私聊保留私信路由，但使用线程感知的会话键/回复目标。

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 音频消息

    Telegram 区分语音笔记和音频文件。

    - 默认：音频文件行为
    - 在代理回复中标记 `[[audio_as_voice]]` 以强制发送语音笔记

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

    - 静态 WEBP：下载并处理（占位符 `<media:sticker>`）
    - 动画 TGS：跳过
    - 视频 WEBM：跳过

    贴纸上下文字段：

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    贴纸缓存文件：

    - `~/.openclaw/telegram/sticker-cache.json`

    贴纸（尽可能）仅被描述一次并缓存，以减少重复的视觉调用。

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

  <Accordion title="Reaction notifications">
    Telegram 表情反应作为 `message_reaction` 更新到达（与消息负载分开）。

    启用后，OpenClaw 将系统事件排入队列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`： `off | own | all`（默认： `own`）
    - `channels.telegram.reactionLevel`： `off | ack | minimal | extensive`（默认： `minimal`）

    说明：

    - `own` 意味着仅指用户对机器人发送消息的反应（通过已发送消息缓存尽力而为）。
    - 反应事件仍然尊重 Telegram 访问控制（`dmPolicy`， `allowFrom`， `groupPolicy`， `groupAllowFrom`）；未授权的发送者将被丢弃。
    - Telegram 不会在反应更新中提供话题 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组一般话题会话（`:topic:1`），而不是确切的原始话题

    用于轮询/Webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` 在 OpenClaw 处理入站消息时发送确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

    说明：

    - Telegram 期望 unicode 表情符号（例如 "👀"）。
    - 使用 `""` 为渠道或账户禁用该反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    默认情况下启用频道配置写入 (`configWrites !== false`)。

    Telegram 触发的写入包括：

    - 群组迁移事件 (`migrate_to_chat_id`) 以更新 `channels.telegram.groups`
    - `/config set` 和 `/config unset` (需要启用命令)

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
    默认：长轮询。

    Webhook 模式：

    - 设置 `channels.telegram.webhookUrl`
    - 设置 `channels.telegram.webhookSecret`（设置 Webhook URL 时必需）
    - 可选 `channels.telegram.webhookPath`（默认 `/telegram-webhook`）
    - 可选 `channels.telegram.webhookHost`（默认 `127.0.0.1`）
    - 可选 `channels.telegram.webhookPort`（默认 `8787`）

    Webhook 模式的默认本地监听器绑定到 `127.0.0.1:8787`。

    如果您的公共端点不同，请在前面放置一个反向代理并将 `webhookUrl` 指向公共 URL。
    当您故意需要外部入口时，设置 `webhookHost`（例如 `0.0.0.0`）。

  </Accordion>

  <Accordion title="限制、重试和CLI目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度拆分之前优先选择段落边界（空行）。
    - `channels.telegram.mediaMaxMb` （默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram API 客户端超时（如果未设置，则应用 grammY 默认值）。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit` （默认 50）； `0` 禁用。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送助手（CLI/tools/actions），用于可恢复的出站 API 错误。

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

    - `--poll-duration-seconds` （5-600）
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用于论坛主题（或使用 `:topic:` 目标）

    Telegram 发送还支持：

    - `--buttons` 用于内联键盘，当 `channels.telegram.capabilities.inlineButtons` 允许时
    - `--force-document` 将出站图像和 GIF 作为文档发送，而不是压缩照片或动画媒体上传

    操作门控：

    - `channels.telegram.actions.sendMessage=false` 禁用出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 禁用 Telegram 投票创建，同时保留常规发送启用

  </Accordion>

  <Accordion title="在 Telegram 中执行审批">
    Telegram 支持在审批者私信中进行执行审批，并且可以选择在原始聊天或主题中发布审批提示。

    配置路径：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`，默认值：`dm`)
    - `agentFilter`，`sessionFilter`

    审批者必须是数字 Telegram 用户 ID。当 `enabled` 为 false 或 `approvers` 为空时，Telegram 不会充当执行审批客户端。审批请求将回退到其他配置的审批路由或执行审批回退策略。

    投递规则：

    - `target: "dm"` 仅向配置的审批者私信发送审批提示
    - `target: "channel"` 将提示发送回原始 Telegram 聊天/主题
    - `target: "both"` 发送给审批者私信和原始聊天/主题

    只有配置的审批者可以批准或拒绝。非审批者不能使用 `/approve`，也不能使用 Telegram 审批按钮。

    频道投递会在聊天中显示命令文本，因此请仅在受信任的群组/主题中启用 `channel` 或 `both`。当提示落入论坛主题时，OpenClaw 会为审批提示和审批后跟进保留该主题。

    内联审批按钮还取决于 `channels.telegram.capabilities.inlineButtons` 是否允许目标表面 (`dm`、`group` 或 `all`)。

    相关文档：[执行审批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="机器人不响应未@提及的群组消息">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见。
      - BotFather: `/setprivacy` -> Disable（禁用）
      - 然后将机器人从群组中移除并重新添加
    - 当配置期望未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法探测成员资格。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="机器人完全看不到群组消息">

    - 当 `channels.telegram.groups` 存在时，必须列出群组（或包含 `"*"`）
    - 验证机器人是否为群组成员
    - 查看日志：`openclaw logs --follow` 以了解跳过原因

  </Accordion>

  <Accordion title="命令部分或全部失效">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略为 `open`，命令授权仍然适用
    - `setMyCommands failed` 且伴有 `BOT_COMMANDS_TOO_MUCH` 意味着本机菜单条目过多；请减少插件/技能/自定义命令或禁用本机菜单
    - `setMyCommands failed` 且伴有网络/获取错误通常指示存在针对 `api.telegram.org` 的 DNS/HTTPS 连通性问题

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 可能会在 AbortSignal 类型不匹配时触发立即中止行为。
    - 某些主机首先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站可能导致间歇性的 Telegram API 故障。
    - 如果日志中包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将这些作为可恢复的网络错误进行重试。
    - 在直接出站/TLS 不稳定的 VPS 主机上，请通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认使用 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主机是 WSL2 或明确在使用仅 IPv4 行为时效果更好，请强制选择地址族：

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

更多帮助：[渠道故障排除](/en/channels/troubleshooting)。

## Telegram 配置参考指针

主要参考：

- `channels.telegram.enabled`：启用/禁用渠道启动。
- `channels.telegram.botToken`：机器人令牌 (BotFather)。
- `channels.telegram.tokenFile`：从常规文件路径读取令牌。拒绝符号链接。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.telegram.allowFrom`：私信允许列表（数字 Telegram 用户 ID）。`allowlist` 至少需要一个发送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以将旧的 `@username` 条目解析为 ID，并可以在允许列表迁移流程中从配对存储文件中恢复允许列表条目。
- `channels.telegram.actions.poll`：启用或禁用 Telegram 投票创建（默认：启用；仍然需要 `sendMessage`）。
- `channels.telegram.defaultTo`：当未提供显式的 `--reply-to` 时，CLI `--deliver` 使用的默认 Telegram 目标。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.telegram.groupAllowFrom`：群组发送者允许列表（数字 Telegram 用户 ID）。`openclaw doctor --fix` 可以将旧的 `@username` 条目解析为 ID。非数字条目在认证时会被忽略。群组认证不使用私信配对存储回退（`2026.2.25+`）。
- 多账户优先级：
  - 当配置了两个或更多账户 ID 时，请设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明确默认路由。
  - 如果两者均未设置，OpenClaw 将回退到第一个标准化账户 ID 并且 `openclaw doctor` 会发出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 仅适用于 `default` 账户。
  - 当未设置账户级别的值时，命名账户会继承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名账户不会继承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：每群组的默认值 + 允许列表（使用 `"*"` 设置全局默认值）。
  - `channels.telegram.groups.<id>.groupPolicy`：groupPolicy（`open | allowlist | disabled`）的每群组覆盖。
  - `channels.telegram.groups.<id>.requireMention`：提及限制默认值。
  - `channels.telegram.groups.<id>.skills`：技能过滤器（省略 = 所有技能，空 = 无）。
  - `channels.telegram.groups.<id>.allowFrom`：每群组发送者允许列表覆盖。
  - `channels.telegram.groups.<id>.systemPrompt`：针对该群的额外系统提示词。
  - `channels.telegram.groups.<id>.enabled`：当 `false` 时禁用该群组。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：每话题覆盖（群组字段 + 仅话题字段 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：将此话题路由到特定代理（覆盖群组级别和绑定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：groupPolicy（`open | allowlist | disabled`）的每话题覆盖。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：每话题提及限制覆盖。
- 带有 `bindings[]`、`type: "acp"` 和 `match.peer.id` 中规范主题 ID `chatId:topic:topicId` 的顶层 `bindings[]`：持久化 ACP 主题绑定字段（参见 [ACP Agents](/en/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：将私信主题路由到特定的代理（行为与论坛主题相同）。
- `channels.telegram.execApprovals.enabled`：在此账户上将 Telegram 启用为基于聊天会话的执行批准客户端。
- `channels.telegram.execApprovals.approvers`：允许批准或拒绝执行请求的 Telegram 用户 ID。当启用执行批准时为必填项。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（默认值：`dm`）。`channel` 和 `both` 会在存在时保留原始 Telegram 主题。
- `channels.telegram.execApprovals.agentFilter`：用于转发批准提示的可选代理 ID 过滤器。
- `channels.telegram.execApprovals.sessionFilter`：用于转发批准提示的可选会话密钥过滤器（子字符串或正则表达式）。
- `channels.telegram.accounts.<account>.execApprovals`：针对每个账户覆盖 Telegram 执行批准路由和批准者授权。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（默认值：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：每个账户的覆盖设置。
- `channels.telegram.commands.nativeSkills`：启用/禁用 Telegram 原生技能命令。
- `channels.telegram.replyToMode`：`off | first | all`（默认值：`off`）。
- `channels.telegram.textChunkLimit`：出站分块大小（字符数）。
- `channels.telegram.chunkMode`：`length`（默认值）或 `newline`，以便在按长度分块之前按空行（段落边界）拆分。
- `channels.telegram.linkPreview`：切换出站消息的链接预览（默认值：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（实时流预览；默认值：`partial`；`progress` 映射到 `partial`；`block` 是旧版预览模式兼容性）。Telegram 预览流使用单条预览消息并原地编辑。
- `channels.telegram.mediaMaxMb`：入站/出站 Telegram 媒体限制（MB，默认：100）。
- `channels.telegram.retry`：Telegram 发送辅助程序（CLI/工具/操作）在可恢复的出站 API 错误上的重试策略（attempts, minDelayMs, maxDelayMs, jitter）。
- `channels.telegram.network.autoSelectFamily`：覆盖 Node autoSelectFamily（true=启用，false=禁用）。在 Node 22+ 上默认启用，WSL2 默认禁用。
- `channels.telegram.network.dnsResultOrder`：覆盖 DNS 结果顺序（`ipv4first` 或 `verbatim`）。在 Node 22+ 上默认为 `ipv4first`。
- `channels.telegram.proxy`：Bot API 调用的代理 URL（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：启用 webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：webhook 密钥（设置 webhookUrl 时必需）。
- `channels.telegram.webhookPath`：本地 webhook 路径（默认 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本地 webhook 绑定主机（默认 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本地 webhook 绑定端口（默认 `8787`）。
- `channels.telegram.actions.reactions`：门控 Telegram 工具反应。
- `channels.telegram.actions.sendMessage`：门控 Telegram 工具消息发送。
- `channels.telegram.actions.deleteMessage`：门控 Telegram 工具消息删除。
- `channels.telegram.actions.sticker`：门控 Telegram 贴纸操作——发送和搜索（默认：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` —— 控制哪些反应触发系统事件（未设置时默认：`own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` —— 控制代理的反应能力（未设置时默认：`minimal`）。

- [配置参考 - Telegram](/en/gateway/configuration-reference#telegram)

Telegram 特有的高信噪比字段：

- 启动/认证：`enabled`，`botToken`，`tokenFile`，`accounts.*`（`tokenFile` 必须指向常规文件；不接受符号链接）
- 访问控制：`dmPolicy`，`allowFrom`，`groupPolicy`，`groupAllowFrom`，`groups`，`groups.*.topics.*`，顶级 `bindings[]`（`type: "acp"`）
- 执行审批：`execApprovals`，`accounts.*.execApprovals`
- 命令/菜单：`commands.native`，`commands.nativeSkills`，`customCommands`
- 会话/回复：`replyToMode`
- 流式传输：`streaming`（预览版），`blockStreaming`
- 格式化/投递：`textChunkLimit`，`chunkMode`，`linkPreview`，`responsePrefix`
- 媒体/网络：`mediaMaxMb`，`timeoutSeconds`，`retry`，`network.autoSelectFamily`，`proxy`
- Webhook：`webhookUrl`，`webhookSecret`，`webhookPath`，`webhookHost`
- 操作/能力：`capabilities.inlineButtons`，`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应：`reactionNotifications`，`reactionLevel`
- 写入/历史记录：`configWrites`，`historyLimit`，`dmHistoryLimit`，`dms.*.historyLimit`

## 相关

- [配对](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [故障排除](/en/channels/troubleshooting)

import zh from "/components/footer/zh.mdx";

<zh />
