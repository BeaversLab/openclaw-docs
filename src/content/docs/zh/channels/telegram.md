---
summary: "Telegram 机器人支持状态、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

状态：通过 grammY 实现的机器人私信和群组功能已可用于生产环境。长轮询是默认模式；Webhook 模式是可选的。

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
    打开 Telegram 并与 **@BotFather** 聊天（确认句柄确切为 `@BotFather`）。

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

    环境变量回退：`TELEGRAM_BOT_TOKEN=...`（仅默认账户）。
    Telegram **不**使用 `openclaw channels login telegram`；在配置/环境中配置令牌，然后启动网关。

  </Step>

  <Step title="Start gateway and approve first 私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码将在 1 小时后过期。

  </Step>

  <Step title="Add the bot to a group">
    将机器人添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>令牌解析顺序是感知账户的。实际上，配置值优先于环境变量回退，并且 `TELEGRAM_BOT_TOKEN` 仅适用于默认账户。</Note>

## Telegram 端设置

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility">
    Telegram 机器人默认处于 **隐私模式**，这限制了它们能接收的群组消息。

    如果机器人必须查看所有群组消息，则需要：

    - 通过 `/setprivacy` 禁用隐私模式，或
    - 将机器人设为群组管理员。

    切换隐私模式时，请在每个群组中移除并重新添加机器人，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="Group permissions">
    管理员状态在 Telegram 群组设置中控制。

    管理员机器人会接收所有群组消息，这对于始终开启的群组行为非常有用。

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

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

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。`telegram:` / `tg:` 前缀会被接受并规范化。
    如果 `dmPolicy: "allowlist"` 的 `allowFrom` 为空，则会阻止所有私信，且配置验证会拒绝该设置。
    新手引导接受 `@username` 输入并将其解析为数字 ID。
    如果您已升级且配置中包含 `@username` 允许条目，请运行 `openclaw doctor --fix` 来解析它们（尽力而为；需要 Telegram bot 令牌）。
    如果您之前依赖于配对存储允许列表文件，`openclaw doctor --fix` 可以在允许列表流程中将条目恢复到 `channels.telegram.allowFrom` 中（例如，当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单一所有者的 bot，建议使用带有显式数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以在配置中保持访问策略持久化（而不是依赖于先前的配对批准）。

    ### 查找您的 Telegram 用户 ID

    更安全（无第三方 bot）的方法：

    1. 给您的 bot 发私信。
    2. 运行 `openclaw logs --follow`。
    3. 读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隐私性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="组策略和允许列表">
    两项控制共同适用：

    1. **允许哪些群组** (`channels.telegram.groups`)
       - 没有配置 `groups`：
         - 使用 `groupPolicy: "open"`：任何群组都可以通过群组 ID 检查
         - 使用 `groupPolicy: "allowlist"`（默认）：群组将被阻止，直到添加 `groups` 条目（或 `"*"`）
       - 配置了 `groups`：作为允许列表（显式 ID 或 `"*"`）

    2. **允许群组中的哪些发送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发送者过滤。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被标准化）。
    请不要将 Telegram 群组或超级群组聊天 ID 放入 `groupAllowFrom` 中。负数聊天 ID 应归于 `channels.telegram.groups` 下。
    非数字条目在发送者授权时会被忽略。
    安全边界 (`2026.2.25+`)：群组发送者授权**不会**继承私信配对存储的批准。
    配对仅限于私信。对于群组，请设置 `groupAllowFrom` 或按群组/按主题的 `allowFrom`。
    运行时注意：如果完全缺少 `channels.telegram`，运行时默认为 fail-closed `groupPolicy="allowlist"`，除非显式设置了 `channels.defaults.groupPolicy`。

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

      - 将像 `-1001234567890` 这样的负数 Telegram 群组或超级群组聊天 ID 放在 `channels.telegram.groups` 下。
      - 当你想限制允许的群组中哪些人可以触发机器人时，将像 `8734062810` 这样的 Telegram 用户 ID 放在 `groupAllowFrom` 下。
      - 仅当你希望允许的群组中的任何成员都能与机器人交谈时，才使用 `groupAllowFrom: ["*"]`。
    </Warning>

  </Tab>

  <Tab title="提及行为">
    群组回复默认需要提及。

    提及可以来自：

    - 原生 `@botusername` 提及，或
    - 以下内容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    会话级命令切换：

    - `/activation always`
    - `/activation mention`

    这些仅更新会话状态。如需持久化，请使用配置。

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
    - 或从 `openclaw logs --follow` 中读取 `chat.id`
    - 或检查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 归网关进程所有。
- 路由是确定性的：Telegram 入站回复会回发到 Telegram（模型不选择渠道）。
- 入站消息会规范化为包含回复元数据和媒体占位符的共享渠道信封。
- 群组会话按群组 ID 隔离。论坛主题附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`；OpenClaw 使用感知线程的会话密钥路由它们，并保留线程 ID 以便回复。
- 长轮询使用 grammY 运行器，并按每聊天/每线程顺序排列。整体运行器接收器并发性使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 在 Telegram 上映射到 `partial`（与跨渠道命名兼容）
    - 传统的 `channels.telegram.streamMode` 和布尔 `streaming` 值会自动映射

    对于纯文本回复：

    - 私信：OpenClaw 保持相同的预览消息并就地执行最终编辑（无第二条消息）
    - 群组/话题：OpenClaw 保持相同的预览消息并就地执行最终编辑（无第二条消息）

    对于复杂回复（例如媒体负载），OpenClaw 会回退到正常的最终交付，然后清理预览消息。

    预览流式传输与分块流式传输是分开的。当为 Telegram 显式启用分块流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

    如果原生草稿传输不可用/被拒绝，OpenClaw 会自动回退到 `sendMessage` + `editMessageText`。

    Telegram 专用推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 最终答案不带推理文本发送

  </Accordion>

  <Accordion title="格式化和 HTML 回退">
    出站文本使用 Telegram `parse_mode: "HTML"`。

    - 类 Markdown 文本被渲染为 Telegram 安全的 HTML。
    - 原始模型 HTML 被转义以减少 Telegram 解析失败。
    - 如果 Telegram 拒绝解析后的 HTML，OpenClaw 会重试为纯文本。

    链接预览默认启用，可以使用 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="Native commands and custom commands">
    Telegram 命令菜单注册在启动时通过 `setMyCommands` 处理。

    原生命令默认设置：

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

    - 名称会被标准化（去除前导 `/`，转为小写）
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复项将被跳过并记录日志

    注意事项：

    - 自定义命令只是菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在输入时仍然可以工作

    如果禁用了原生命令，内置命令将被移除。如果进行了配置，自定义/插件命令可能仍会注册。

    常见设置失败：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 搭配网络/获取错误通常表示到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    当安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 在 iOS 应用中粘贴代码
    3. `/pair pending` 列出待处理的请求（包括角色/范围）
    4. 批准请求：
       - `/pair approve <requestId>` 用于明确批准
       - `/pair approve` 当只有一个待处理请求时
       - `/pair approve latest` 用于最新的请求

    如果设备使用更改的身份验证详细信息（例如角色/范围/公钥）重试，先前的待处理请求将被取代，新请求使用不同的 `requestId`。请在批准之前重新运行 `/pair pending`。

    更多详情：[配对](/en/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="Inline buttons">
    配置内联键盘范围：

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

    每个账户的覆盖设置：

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

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist`（默认）

    传统的 `capabilities: ["inlineButtons"]` 映射到 `inlineButtons: "all"`。

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

    回调点击会以文本形式传递给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="用于代理和自动化的 Telegram 消息操作">
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`)

    频道消息操作公开了符合人体工程学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    门控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认：禁用)

    注意：`edit` 和 `topic-create` 目前默认已启用，并且没有单独的 `channels.telegram.actions.*` 开关。
    运行时发送使用活动的配置/机密快照（启动/重新加载），因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    反应移除语义：[/tools/reactions](/en/tools/reactions)

  </Accordion>

  <Accordion title="回复串接标签">
    Telegram 支持在生成输出中使用显式回复串接标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    注意：`off` 会禁用隐式回复串接。显式的 `[[reply_to_*]]` 标签仍然有效。

  </Accordion>

  <Accordion title="论坛主题和线程行为">
    论坛超级群组：

    - 主题会话密钥附加 `:topic:<threadId>`
    - 回复和打字以主题线程为目标
    - 主题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    通用主题 (`threadId=1`) 特殊情况：

    - 消息发送省略 `message_thread_id` (Telegram 拒绝 `sendMessage(...thread_id=1)`)
    - 打字动作仍包含 `message_thread_id`

    主题继承：主题条目继承群组设置，除非被覆盖 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 仅适用于主题，不继承群组默认值。

    **按主题的代理路由**：每个主题可以通过在主题配置中设置 `agentId` 来路由到不同的代理。这为每个主题提供了自己独立的工作区、内存和会话。例如：

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

    然后，每个主题都有自己的会话密钥：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 主题绑定**：论坛主题可以通过顶层类型的 ACP 绑定来固定 ACP 控制会话：

    - `bindings[]` 配合 `type: "acp"` 和 `match.channel: "telegram"`

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

    此功能目前仅适用于群组和超级群组中的论坛主题。

    **从聊天发起的线程绑定 ACP 生成**：

    - `/acp spawn <agent> --thread here|auto` 可以将当前的 Telegram 主题绑定到新的 ACP 会话。
    - 后续主题消息直接路由到绑定的 ACP 会话（无需 `/acp steer`）。
    - OpenClaw 在成功绑定后会在主题内置顶生成确认消息。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文包括：

    - `MessageThreadId`
    - `IsForum`

    私信线程行为：

    - 带有 `message_thread_id` 的私人聊天保留私信路由，但使用线程感知的会话密钥/回复目标。

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 语音消息

    Telegram 区分语音笔记与音频文件。

    - 默认：音频文件行为
    - 在 Agent 回复中标记 `[[audio_as_voice]]` 以强制发送语音笔记

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

    Telegram 区分视频文件与视频笔记。

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

    入站贴纸处理：

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

    贴纸会被描述一次（如果可能）并缓存，以减少重复的视觉调用。

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
    Telegram 反应以 `message_reaction` 更新形式到达（与消息负载分开）。

    启用后，OpenClaw 会将系统事件排队，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`： `off | own | all`（默认值： `own`）
    - `channels.telegram.reactionLevel`： `off | ack | minimal | extensive`（默认值： `minimal`）

    注意：

    - `own` 意味着仅对机器人发送的消息的用户反应（通过已发送消息缓存尽力而为）。
    - 反应事件仍遵守 Telegram 访问控制（`dmPolicy`、 `allowFrom`、 `groupPolicy`、 `groupAllowFrom`）；未授权的发送者将被丢弃。
    - Telegram 不在反应更新中提供会话线程 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组常规主题会话（`:topic:1`），而不是确切的原始主题

    用于轮询/Webhook 的 `allowed_updates` 自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 正在处理传入消息时， `ackReaction` 会发送一个确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

    注意：

    - Telegram 期望 unicode 表情符号（例如 "👀"）。
    - 使用 `""` 来禁用渠道或账户的反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    默认启用通道配置写入 (`configWrites !== false`)。

    Telegram 触发的写入包括：

    - 组迁移事件 (`migrate_to_chat_id`) 以更新 `channels.telegram.groups`
    - `/config set` 和 `/config unset` (需要启用命令)

    禁用：

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
    - 设置 `channels.telegram.webhookSecret` (设置 Webhook URL 时必需)
    - 可选 `channels.telegram.webhookPath` (默认 `/telegram-webhook`)
    - 可选 `channels.telegram.webhookHost` (默认 `127.0.0.1`)
    - 可选 `channels.telegram.webhookPort` (默认 `8787`)

    Webhook 模式的默认本地监听器绑定到 `127.0.0.1:8787`。

    如果您的公共端点不同，请在前面放置反向代理并将 `webhookUrl` 指向公共 URL。
    当您有意需要外部入口时，设置 `webhookHost` (例如 `0.0.0.0`)。

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 优先选择段落边界（空行）进行长度拆分。
    - `channels.telegram.mediaMaxMb`（默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram API 客户端超时（如果未设置，则应用 grammY 默认值）。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 禁用。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送辅助工具（CLI/工具/操作），用于可恢复的出站 API 错误。

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

    - 当 `channels.telegram.capabilities.inlineButtons` 允许时，`--buttons` 用于内联键盘
    - `--force-document` 将出站图像和 GIF 作为文档发送，而不是压缩的照片或动画媒体上传

    操作门控：

    - `channels.telegram.actions.sendMessage=false` 禁用出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 禁用 Telegram 投票创建，同时保留常规发送功能

  </Accordion>

  <Accordion title="在 Telegram 中进行执行审批">
    Telegram 支持在审批人的私信中进行执行审批，并且可以选择在发起聊天的群组或主题中发布审批提示。

    配置路径：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`，默认：`dm`)
    - `agentFilter`，`sessionFilter`

    审批人必须是数字格式的 Telegram 用户 ID。当 `enabled` 为 false 或 `approvers` 为空时，Telegram 将不会充当执行审批客户端。审批请求将回退到其他已配置的审批路由或执行审批回退策略。

    发送规则：

    - `target: "dm"` 仅将审批提示发送给已配置的审批人私信
    - `target: "channel"` 将提示发回发起的 Telegram 聊天/主题
    - `target: "both"` 同时发送给审批人私信和发起的聊天/主题

    只有已配置的审批人才能批准或拒绝。非审批人无法使用 `/approve`，也无法使用 Telegram 审批按钮。

    频道发送会在聊天中显示命令文本，因此请仅在受信任的群组/主题中启用 `channel` 或 `both`。当提示进入论坛主题时，OpenClaw 会为主题保留审批提示和审批后后续消息的上下文。

    内联审批按钮也取决于 `channels.telegram.capabilities.inlineButtons` 是否允许目标界面 (`dm`、`group` 或 `all`)。

    相关文档：[执行审批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见。
      - BotFather: `/setprivacy` -> Disable
      - 然后将机器人移出群组并重新添加
    - 当配置期望未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法探测成员身份。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 当存在 `channels.telegram.groups` 时，必须列出群组（或包含 `"*"`）
    - 验证机器人在群组中的成员身份
    - 查看日志：`openclaw logs --follow` 了解跳过原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略是 `open`，命令授权仍然适用
    - 出现 `setMyCommands failed` 且伴随 `BOT_COMMANDS_TOO_MUCH` 意味着原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - 出现 `setMyCommands failed` 且伴随网络/获取错误通常表示存在到 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 如果 AbortSignal 类型不匹配，可能会触发立即中止行为。
    - 某些主机首先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站会导致间歇性的 Telegram API 失败。
    - 如果日志中包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将这些作为可恢复的网络错误进行重试。
    - 在具有不稳定直接出站/TLS 的 VPS 主机上，通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主机是 WSL2 或者明确在使用仅 IPv4 行为时效果更好，请强制选择系列：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - 环境覆盖（临时）：
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
- `channels.telegram.botToken`：机器人令牌（BotFather）。
- `channels.telegram.tokenFile`：从常规文件路径读取令牌。拒绝符号链接。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.telegram.allowFrom`：私信允许列表（数字 Telegram 用户 ID）。`allowlist` 至少需要一个发送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以将旧版 `@username` 条目解析为 ID，并可以在允许列表迁移流程中从配对存储文件中恢复允许列表条目。
- `channels.telegram.actions.poll`：启用或禁用 Telegram 投票创建（默认：启用；仍需 `sendMessage`）。
- `channels.telegram.defaultTo`：当未提供显式的 `--reply-to` 时，Telegram `--deliver` 使用的默认 CLI 目标。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.telegram.groupAllowFrom`：群组发送者白名单（数字 Telegram 用户 ID）。`openclaw doctor --fix` 可以将旧的 `@username` 条目解析为 ID。非数字条目在认证时将被忽略。群组认证不使用私信配对存储回退（`2026.2.25+`）。
- 多账户优先级：
  - 当配置了两个或更多账户 ID 时，设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明确默认路由。
  - 如果两者均未设置，OpenClaw 将回退到第一个规范化帐户 ID 并且 `openclaw doctor` 发出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 仅适用于 `default` 帐户。
  - 命名帐户在未设置帐户级值时会继承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名帐户不继承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：每群组默认值 + 允许列表（使用 `"*"` 设置全局默认值）。
  - `channels.telegram.groups.<id>.groupPolicy`：每群组对 groupPolicy 的覆盖（`open | allowlist | disabled`）。
  - `channels.telegram.groups.<id>.requireMention`：提及过滤默认值。
  - `channels.telegram.groups.<id>.skills`：技能筛选（省略 = 所有技能，空 = 无）。
  - `channels.telegram.groups.<id>.allowFrom`：针对每个群组的发送者白名单覆盖设置。
  - `channels.telegram.groups.<id>.systemPrompt`：针对该群组的额外系统提示词。
  - `channels.telegram.groups.<id>.enabled`：当 `false` 时禁用该群组。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：针对每个话题的覆盖设置（群组字段 + 仅限话题的 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：将此话题路由到特定代理（覆盖群组级别和绑定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：针对 groupPolicy（`open | allowlist | disabled`）的每个话题覆盖设置。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：针对每个话题的提及门控覆盖设置。
- `bindings[]`（包含 `type: "acp"` 和正题主题 ID `chatId:topic:topicId`，位于 `match.peer.id` 中）：持久的 ACP 主题绑定字段（请参阅 [ACP Agents](/en/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：将私信主题路由到特定的 Agent（与论坛主题的行为相同）。
- `channels.telegram.execApprovals.enabled`：为该账户启用 Telegram 作为基于聊天的执行审批客户端。
- `channels.telegram.execApprovals.approvers`：被允许批准或拒绝执行请求的 Telegram 用户 ID。启用执行审批时为必填项。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（默认值：`dm`）。`channel` 和 `both` 会在存在时保留原始 Telegram 主题。
- `channels.telegram.execApprovals.agentFilter`:用于转发的审批提示的可选代理 ID 过滤器。
- `channels.telegram.execApprovals.sessionFilter`:用于转发的审批提示的可选会话键过滤器（子字符串或正则表达式）。
- `channels.telegram.accounts.<account>.execApprovals`:每个账号的 Telegram exec 审批路由和审批人授权覆盖。
- `channels.telegram.capabilities.inlineButtons`: `off | dm | group | all | allowlist`（默认值：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`:每个账号的覆盖。
- `channels.telegram.commands.nativeSkills`:启用/禁用 Telegram 原生技能命令。
- `channels.telegram.replyToMode`: `off | first | all`（默认值：`off`）。
- `channels.telegram.textChunkLimit`:出站块大小（字符）。
- `channels.telegram.chunkMode`：`length`（默认）或 `newline`，在按长度分块之前按空行（段落边界）拆分。
- `channels.telegram.linkPreview`：切换出站消息的链接预览（默认：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（实时流预览；默认：`partial`；`progress` 映射到 `partial`；`block` 是旧版预览模式兼容性）。Telegram 预览流使用单条预览消息进行原地编辑。
- `channels.telegram.mediaMaxMb`：Telegram 入站/出站媒体限制（MB，默认：100）。
- `channels.telegram.retry`：Telegram 发送助手（CLI/工具/操作）在可恢复的出站 API 错误上的重试策略（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆盖 Node autoSelectFamily（true=启用，false=禁用）。在 Node 22+ 上默认启用，WSL2 默认禁用。
- `channels.telegram.network.dnsResultOrder`：覆盖 DNS 结果顺序（`ipv4first` 或 `verbatim`）。在 Node 22+ 上默认为 `ipv4first`。
- `channels.telegram.proxy`：Bot API 调用的代理 URL（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：启用 webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：webhook 密钥（设置 webhookUrl 时必需）。
- `channels.telegram.webhookPath`：本地 webhook 路径（默认 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本地 webhook 绑定主机（默认 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本地 webhook 绑定端口（默认 `8787`）。
- `channels.telegram.actions.reactions`：Telegram 工具反应的开关。
- `channels.telegram.actions.sendMessage`：Telegram 工具消息发送的开关。
- `channels.telegram.actions.deleteMessage`：Telegram 工具消息删除的开关。
- `channels.telegram.actions.sticker`：Telegram 贴纸操作的开关——发送和搜索（默认：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` —— 控制哪些反应会触发系统事件（未设置时默认：`own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` —— 控制 Agent 的反应能力（未设置时默认：`minimal`）。

- [配置参考 - Telegram](/en/gateway/configuration-reference#telegram)

Telegram 特有的高信噪比字段：

- 启动/认证：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必须指向常规文件；拒绝符号链接）
- 访问控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、顶层 `bindings[]`（`type: "acp"`）
- 执行审批：`execApprovals`、`accounts.*.execApprovals`
- 命令/菜单：`commands.native`、`commands.nativeSkills`、`customCommands`
- 线程/回复：`replyToMode`
- 流式传输：`streaming`（预览版）、`blockStreaming`
- 格式/投递：`textChunkLimit`、`chunkMode`、`linkPreview`、`responsePrefix`
- 媒体/网络：`mediaMaxMb`、`timeoutSeconds`、`retry`、`network.autoSelectFamily`、`proxy`
- Webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- 操作/能力：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应：`reactionNotifications`、`reactionLevel`
- 写入/历史：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

## 相关

- [配对](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [故障排除](/en/channels/troubleshooting)
