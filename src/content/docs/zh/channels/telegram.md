---
summary: "Telegram bot 支持状态、功能和配置"
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
    打开 Telegram 并与 **@BotFather** 聊天（确认句柄确为 `@BotFather`）。

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

    配对码在 1 小时后过期。

  </Step>

  <Step title="Add the bot to a group">
    将 bot 添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>令牌解析顺序支持账户感知。实际上，配置值优先于环境变量回退，且 `TELEGRAM_BOT_TOKEN` 仅适用于默认账户。</Note>

## Telegram 端设置

<AccordionGroup>
  <Accordion title="隐私模式和群组可见性">
    Telegram 机器人默认处于 **隐私模式**，这限制了它们能接收的群组消息。

    如果机器人必须查看所有群组消息，请执行以下操作之一：

    - 通过 `/setprivacy` 禁用隐私模式，或
    - 将机器人设为群组管理员。

    切换隐私模式时，请在每个群组中移除并重新添加机器人，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="群组权限">
    管理员状态在 Telegram 群组设置中控制。

    管理员机器人接收所有群组消息，这对于始终开启的群组行为非常有用。

  </Accordion>

  <Accordion title="有用的 BotFather 开关">

    - `/setjoingroups` 以允许/禁止添加到群组
    - `/setprivacy` 用于群组可见性行为

  </Accordion>
</AccordionGroup>

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.telegram.dmPolicy` 控制私信访问权限：

    - `pairing`（默认）
    - `allowlist`（要求 `allowFrom` 中至少有一个发送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。接受并标准化 `telegram:` / `tg:` 前缀。
    `dmPolicy: "allowlist"` 若带有空的 `allowFrom`，则会阻止所有私信，且会被配置验证拒绝。
    新手引导接受 `@username` 输入并将其解析为数字 ID。
    如果您已升级且配置包含 `@username` 白名单条目，请运行 `openclaw doctor --fix` 进行解析（尽力而为；需要 Telegram bot 令牌）。
    如果您以前依赖配对存储白名单文件，`openclaw doctor --fix` 可以在白名单流程中将条目恢复到 `channels.telegram.allowFrom`（例如，当 `dmPolicy: "allowlist"` 尚无明确 ID 时）。

    对于单一所有者的机器人，建议使用带有明确数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以保持配置中的访问策略持久有效（而不是依赖于先前的配对批准）。

    常见误解：私信配对批准并不意味着“此发送者在任何地方都获得了授权”。
    配对仅授予私信访问权限。群组发送者授权仍来自显式的配置白名单。
    如果您希望“一次授权，私信和群组命令均可使用”，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom` 中。

    ### 查找您的 Telegram 用户 ID

    更安全的方法（无第三方机器人）：

    1. 向您的机器人发送私信。
    2. 运行 `openclaw logs --follow`。
    3. 读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隐私性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群组策略和允许列表">
    两个控制项协同应用：

    1. **允许哪些群组** (`channels.telegram.groups`)
       - 没有 `groups` 配置：
         - 使用 `groupPolicy: "open"`：任何群组都可以通过群组 ID 检查
         - 使用 `groupPolicy: "allowlist"`（默认）：群组被阻止，直到您添加 `groups` 条目（或 `"*"`）
       - 已配置 `groups`：作为允许列表（显式 ID 或 `"*"`）

    2. **群组中允许哪些发送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发送者过滤。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数值 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被标准化）。
    请勿将 Telegram 群组或超级群组聊天 ID 放入 `groupAllowFrom`。负数聊天 ID 属于 `channels.telegram.groups`。
    非数值条目在发送者授权时会被忽略。
    安全边界（`2026.2.25+`）：群组发送者授权**不**继承私信配对存储的批准。
    配对仅限于私信。对于群组，请设置 `groupAllowFrom` 或针对每个群组/每个主题的 `allowFrom`。
    如果未设置 `groupAllowFrom`，Telegram 将回退到配置 `allowFrom`，而不是配对存储。
    单一所有者机器人的实用模式：将您的用户 ID 设置在 `channels.telegram.allowFrom` 中，保留 `groupAllowFrom` 未设置，并在 `channels.telegram.groups` 下允许目标群组。
    运行时说明：如果 `channels.telegram` 完全缺失，运行时默认为 fail-closed `groupPolicy="allowlist"`，除非明确设置了 `channels.defaults.groupPolicy`。

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
      - 当您想限制允许群组中的哪些人可以触发机器人时，请将 Telegram 用户 ID（如 `8734062810`）放在 `groupAllowFrom` 下。
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

    会话级命令切换：

    - `/activation always`
    - `/activation mention`

    这些仅更新会话状态。使用配置以持久化。

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
- 入站消息会规范化为包含回复元数据和媒体占位符的共享渠道信封。
- 群组会话按群组 ID 隔离。论坛主题附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`；OpenClaw 使用具有线程感知能力的会话键路由它们，并保留线程 ID 以用于回复。
- 长轮询使用 grammY 运行器，具有每聊天/每线程排序。整体运行器接收器并发性使用 `agents.defaults.maxConcurrent`。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 在 Telegram 上映射到 `partial`（兼容跨渠道命名）
    - 旧版 `channels.telegram.streamMode` 和布尔 `streaming` 值会自动映射

    对于纯文本回复：

    - 私信：OpenClaw 保留相同的预览消息并就地执行最终编辑（不发送第二条消息）
    - 群组/话题：OpenClaw 保留相同的预览消息并就地执行最终编辑（不发送第二条消息）

    对于复杂回复（例如媒体载荷），OpenClaw 会回退到正常的最终传递，然后清理预览消息。

    预览流式传输与分块流式传输是分开的。当为 Telegram 明确启用分块流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

    如果原生草稿传输不可用/被拒绝，OpenClaw 会自动回退到 `sendMessage` + `editMessageText`。

    Telegram 专用推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 最终答案不包含推理文本

  </Accordion>

  <Accordion title="格式化和 HTML 回退">
    出站文本使用 Telegram `parse_mode: "HTML"`。

    - 类似 Markdown 的文本会被渲染为 Telegram 安全的 HTML。
    - 原始模型 HTML 会被转义以减少 Telegram 解析失败。
    - 如果 Telegram 拒绝已解析的 HTML，OpenClaw 会以纯文本形式重试。

    链接预览默认启用，可以通过 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="原生命令和自定义命令">
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

    - 名称会被规范化（去除前导 `/`，转换为小写）
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令无法覆盖原生命令
    - 冲突/重复项会被跳过并记录

    注意事项：

    - 自定义命令仅作为菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在手动输入时仍然可以工作

    如果禁用了原生命令，内置命令将被移除。如果已配置，自定义/插件命令可能仍会注册。

    常见设置失败：

    - 伴随 `BOT_COMMANDS_TOO_MUCH` 的 `setMyCommands failed` 表示 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - 伴随网络/获取错误的 `setMyCommands failed` 通常表示到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    当安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 将代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理的请求（包括角色/范围）
    4. 批准请求：
       - `/pair approve <requestId>` 用于明确批准
       - `/pair approve` 当只有一个待处理请求时
       - `/pair approve latest` 用于最近的一个

    设置代码包含一个短期有效的引导令牌 (bootstrap token)。内置的引导交接将主节点令牌保留在 `scopes: []`；任何被交接的操作员令牌都将受限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。引导范围检查带有角色前缀，因此操作员白名单仅满足操作员请求；非操作员角色仍需要在其自己的角色前缀下拥有范围。

    如果设备使用更改的身份验证详细信息（例如角色/范围/公钥）重试，则先前的待处理请求将被取代，新请求使用不同的 `requestId`。在批准之前重新运行 `/pair pending`。

    更多详情：[配对](/en/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="Inline buttons">
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

    作用域：

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist` (默认)

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

  <Accordion title="用于代理和自动化的 Telegram 消息操作">
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`)

    频道消息操作公开符合人体工学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    门控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认：禁用)

    注意：`edit` 和 `topic-create` 目前默认启用，并且没有单独的 `channels.telegram.actions.*` 开关。
    运行时发送使用活动的配置/机密快照（启动/重新加载），因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    表情符号删除语义：[/tools/reactions](/en/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支持在生成的输出中使用显式回复主题标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    注意：`off` 会禁用隐式回复主题。显式的 `[[reply_to_*]]` 标签仍然有效。

  </Accordion>

  <Accordion title="论坛主题和话题行为">
    论坛超级群组：

    - 主题会话键附加 `:topic:<threadId>`
    - 回复和输入状态指向话题线程
    - 主题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    常规主题 (`threadId=1`) 特殊情况：

    - 消息发送省略 `message_thread_id` (Telegram 拒绝 `sendMessage(...thread_id=1)`)
    - 输入操作仍然包含 `message_thread_id`

    主题继承：主题条目继承群组设置，除非被覆盖 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 是主题专用的，不从群组默认值继承。

    **按主题的路由代理**：每个主题可以通过在主题配置中设置 `agentId` 来路由到不同的代理。这为每个主题提供了自己独立的工作区、内存和会话。例如：

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

    - `bindings[]` 配合 `type: "acp"` 和 `match.channel: "telegram"`

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

    这目前仅限于群组和超级群组中的论坛主题。

    **从聊天生成线程绑定的 ACP**：

    - `/acp spawn <agent> --thread here|auto` 可以将当前的 Telegram 主题绑定到新的 ACP 会话。
    - 后续主题消息直接路由到绑定的 ACP 会话（无需 `/acp steer`）。
    - 绑定成功后，OpenClaw 会在话题中置顶生成确认消息。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文包括：

    - `MessageThreadId`
    - `IsForum`

    私信话题行为：

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

    传入贴纸的处理方式：

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

  <Accordion title="Reaction notifications">
    Telegram 表情反应作为 `message_reaction` 更新到达（与消息负载分离）。

    启用后，OpenClaw 会将系统事件排队，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`: `off | own | all` (默认：`own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (默认：`minimal`)

    注意：

    - `own` 意味着仅限用户对机器人发送的消息做出反应（通过已发送消息缓存尽力而为）。
    - 表情反应事件仍然遵守 Telegram 访问控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)；未经授权的发送者将被丢弃。
    - Telegram 不在表情反应更新中提供话题 ID。
      - 非论坛群组路由到群组会话
      - 论坛群组路由到群组常规话题会话 (`:topic:1`)，而不是确切的原始话题

    用于轮询/Webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 处理传入消息时，`ackReaction` 会发送一个确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退 (`agents.list[].identity.emoji`，否则为 "👀")

    注意：

    - Telegram 期望使用 unicode 表情符号（例如 "👀"）。
    - 使用 `""` 可禁用某个渠道或账户的表情反应。

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
    默认模式：长轮询。

    Webhook 模式：

    - 设置 `channels.telegram.webhookUrl`
    - 设置 `channels.telegram.webhookSecret`（设置 Webhook URL 时必需）
    - 可选 `channels.telegram.webhookPath`（默认为 `/telegram-webhook`）
    - 可选 `channels.telegram.webhookHost`（默认为 `127.0.0.1`）
    - 可选 `channels.telegram.webhookPort`（默认为 `8787`）

    Webhook 模式的默认本地侦听器绑定到 `127.0.0.1:8787`。

    如果您的公共端点不同，请在前面放置反向代理，并将 `webhookUrl` 指向公共 URL。
    当您有意需要外部入口时，请设置 `webhookHost`（例如 `0.0.0.0`）。

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 优先在段落边界（空行）之前进行长度分割。
    - `channels.telegram.mediaMaxMb`（默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram API 客户端超时（如果未设置，则应用 grammY 默认值）。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 禁用。
    - 回复/引用/转发补充上下文当前按接收到的原样传递。
    - Telegram 白名单主要控制谁可以触发 Agent，而不是完整的补充上下文编辑边界。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送辅助程序（CLI/tools/actions），用于可恢复的出站 API 错误。

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
    - `--force-document` 将出站图片和 GIF 作为文档发送，而不是压缩照片或动画媒体上传

    操作控制：

    - `channels.telegram.actions.sendMessage=false` 禁用出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 禁用 Telegram 投票创建，同时保留常规发送功能

  </Accordion>

  <Accordion title="在 Telegram 中执行审批">
    Telegram 支持在审批人私信中执行审批，并且可以选择在原始聊天或话题中发布审批提示。

    配置路径：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`（可选；如果可能，回退到从 `allowFrom` 和直接 `defaultTo` 推断出的数字所有者 ID）
    - `channels.telegram.execApprovals.target`（`dm` | `channel` | `both`，默认值：`dm`）
    - `agentFilter`、`sessionFilter`

    审批人必须是 Telegram 数字用户 ID。当未设置 `enabled` 或设置为 `"auto"` 并且至少可以解析一个审批人（从 `execApprovals.approvers` 或帐户的数字所有者配置 `allowFrom` 和直接消息 `defaultTo`）时，Telegram 会自动启用原生执行审批。设置 `enabled: false` 可显式禁用 Telegram 作为原生审批客户端。否则，审批请求将回退到其他配置的审批路由或执行审批回退策略。

    Telegram 还呈现其他聊天渠道使用的共享审批按钮。原生 Telegram 适配器主要添加审批人私信路由、渠道/话题分发以及传递之前的输入提示。
    当存在这些按钮时，它们是主要的审批用户体验；Telegram 应仅在工具结果指出聊天审批不可用或手动审批是唯一途径时才包含手动 `/approve` 命令。

    传递规则：

    - `target: "dm"` 仅向已解析的审批人私信发送审批提示
    - `target: "channel"` 将提示发送回原始 Telegram 聊天/话题
    - `target: "both"` 发送给审批人私信和原始聊天/话题

    只有已解析的审批人可以批准或拒绝。非审批人不能使用 `/approve`，也不能使用 Telegram 审批按钮。

    审批解析行为：

    - 以 `plugin:` 为前缀的 ID 始终通过插件审批解析。
    - 其他审批 ID 首先尝试 `exec.approval.resolve`。
    - 如果 OpenClaw 也被授权进行插件审批，并且网关表示执行审批未知/已过期，Telegram 将通过 `plugin.approval.resolve` 重试一次。
    - 真正的执行审批拒绝/错误不会静默回退到插件审批解析。

    渠道传递会在聊天中显示命令文本，因此仅应在受信任的群组/话题中启用 `channel` 或 `both`。当提示进入论坛话题时，Telegram 会为审批提示和审批后跟进保留该话题。执行审批默认在 30 分钟后过期。

    内联审批按钮还取决于 `channels.telegram.capabilities.inlineButtons` 是否允许目标界面（`dm`、`group` 或 `all`）。

    相关文档：[执行审批](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到传递或提供商错误时，Telegram 可以回复错误文本或抑制该错误。两个配置键控制此行为：

| 键                                  | 值                | 默认    | 描述                                                              |
| ----------------------------------- | ----------------- | ------- | ----------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 会向聊天发送友好的错误消息。`silent` 会完全抑制错误回复。 |
| `channels.telegram.errorCooldownMs` | 数字 (毫秒)       | `60000` | 向同一聊天发送错误回复之间的最短时间。防止中断期间错误刷屏。      |

支持按账户、按组和按主题的覆盖（与其他 Telegram 配置键的继承规则相同）。

```json5
{
  channels: {
    telegram: {
      errorPolicy: "reply",
      errorCooldownMs: 120000,
      groups: {
        "-1001234567890": {
          errorPolicy: "silent", // suppress errors in this group
        },
      },
    },
  },
}
```

## 故障排除

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见。
      - BotFather：`/setprivacy` -> 禁用
      - 然后从群组中移除并重新添加机器人
    - 当配置预期未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法探测成员身份。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 当 `channels.telegram.groups` 存在时，必须列出群组（或包含 `"*"`）
    - 验证机器人在群组中的成员身份
    - 查看日志：`openclaw logs --follow` 以了解跳过原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略是 `open`，命令授权仍然适用
    - `setMyCommands failed` 并带有 `BOT_COMMANDS_TOO_MUCH` 意味着原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - 带有网络/获取错误的 `setMyCommands failed` 通常指示到 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 如果 AbortSignal 类型不匹配，可能会触发立即中止行为。
    - 某些主机优先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站可能会导致间歇性的 Telegram API 故障。
    - 如果日志包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将这些作为可恢复的网络错误进行重试。
    - 在具有不稳定直接出站/TLS 的 VPS 主机上，通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认使用 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主机是 WSL2 或明确在仅限 IPv4 的行为下工作得更好，请强制选择协议族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准范围答案（`198.18.0.0/15`）默认已允许
      用于 Telegram 媒体下载。如果在媒体下载期间，受信任的 fake-IP 或
      透明代理将 `api.telegram.org` 重写为其他
      私有/内部/特殊用途地址，您可以选择加入
      Telegram 专用绕过：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每个账户都可以在
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 选择相同的选项。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`，请首先
      保持关闭此危险标志。Telegram 媒体默认已允许 RFC 2544
      基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram
      媒体 SSRF 保护。请仅对受信任的操作员控制的代理
      环境（如 Clash、Mihomo 或 Surge fake-IP 路由）使用它，当它们
      综合出 RFC 2544 基准范围之外的私有或特殊用途答案时。
      对于正常的公共互联网 Telegram 访问，请保持关闭。
    </Warning>

    - 环境变量覆盖（临时）：
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - 验证 DNS 答案：

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

更多帮助：[Telegram grammY](/en/channels/troubleshooting)。

## Telegram 配置参考指针

主要参考：

- `channels.telegram.enabled`：启用/禁用 Telegram 启动。
- `channels.telegram.botToken`：bot token (BotFather)。
- `channels.telegram.tokenFile`：从常规文件路径读取令牌。符号链接将被拒绝。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled`（默认值：pairing）。
- `channels.telegram.allowFrom`：私信允许列表（数字 Telegram 用户 ID）。`allowlist` 需要至少一个发送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以将旧版 `@username` 条目解析为 ID，并可在允许列表迁移流程中从 pairing-store 文件恢复允许列表条目。
- `channels.telegram.actions.poll`：启用或禁用 Telegram 投票创建（默认值：已启用；仍需要 `sendMessage`）。
- `channels.telegram.defaultTo`：当未提供显式的 `--reply-to` 时，Telegram `--deliver` 使用的默认 CLI 目标。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认值：allowlist）。
- `channels.telegram.groupAllowFrom`：群组发送者允许列表（数字 Telegram 用户 ID）。`openclaw doctor --fix` 可以将旧版 `@username` 条目解析为 ID。非数字条目在验证时将被忽略。群组验证不使用私信 pairing-store 回退（`2026.2.25+`）。
- 多账户优先级：
  - 配置了两个或更多账户 ID 时，设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明确默认路由。
  - 如果两者均未设置，OpenClaw 将回退到第一个规范化账户 ID，并且 `openclaw doctor` 会发出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 仅适用于 `default` 账户。
  - 当未设置账户级值时，命名账户将继承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名账户不继承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：每组默认值 + 允许列表（使用 `"*"` 进行全局默认设置）。
  - `channels.telegram.groups.<id>.groupPolicy`：groupPolicy（`open | allowlist | disabled`）的每组覆盖。
  - `channels.telegram.groups.<id>.requireMention`：提及拦截默认值。
  - `channels.telegram.groups.<id>.skills`：技能过滤器（省略 = 所有技能，空 = 无技能）。
  - `channels.telegram.groups.<id>.allowFrom`：针对每个群的发件人允许列表覆盖。
  - `channels.telegram.groups.<id>.systemPrompt`：针对该组的额外系统提示词。
  - `channels.telegram.groups.<id>.enabled`：当 `false` 时禁用该组。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：针对每个主题的覆盖（群组字段 + 仅主题字段 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：将此主题路由到特定代理（覆盖群组级别和绑定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：针对 groupPolicy 的每个主题覆盖（`open | allowlist | disabled`）。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：针对每个主题的提及拦截覆盖。
- `match.peer.id` 中的顶级 `bindings[]`，包含 `type: "acp"` 和规范主题 ID `chatId:topic:topicId`：持久化 ACP 主题绑定字段（参见 [ACP Agents](/en/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：将私信主题路由到特定代理（行为与论坛主题相同）。
- `channels.telegram.execApprovals.enabled`：为此帐户启用 Telegram 作为基于聊天的 exec 批准客户端。
- `channels.telegram.execApprovals.approvers`：获准批准或拒绝 exec 请求的 Telegram 用户 ID。当 `channels.telegram.allowFrom` 或直接的 `channels.telegram.defaultTo` 已识别所有者时为可选。
- `channels.telegram.execApprovals.target`：`dm | channel | both`（默认值：`dm`）。`channel` 和 `both` 在存在时保留源 Telegram 主题。
- `channels.telegram.execApprovals.agentFilter`：用于转发的批准提示的可选代理 ID 过滤器。
- `channels.telegram.execApprovals.sessionFilter`：用于转发的批准提示的可选会话密钥过滤器（子字符串或正则表达式）。
- `channels.telegram.accounts.<account>.execApprovals`：针对每个帐户覆盖的 Telegram exec 批准路由和批准者授权。
- `channels.telegram.capabilities.inlineButtons`：`off | dm | group | all | allowlist`（默认值：允许列表）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：针对每个帐户的覆盖。
- `channels.telegram.commands.nativeSkills`：启用/禁用 Telegram 原生技能命令。
- `channels.telegram.replyToMode`：`off | first | all`（默认：`off`）。
- `channels.telegram.textChunkLimit`：出站块大小（字符）。
- `channels.telegram.chunkMode`：`length`（默认）或 `newline`，在按长度分块之前按空行（段落边界）分割。
- `channels.telegram.linkPreview`：切换出站消息的链接预览（默认：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（实时流预览；默认：`partial`；`progress` 映射到 `partial`；`block` 是旧版预览模式兼容性）。Telegram 预览流式传输使用单条预览消息进行原位编辑。
- `channels.telegram.mediaMaxMb`：入站/出站 Telegram 媒体上限（MB，默认：100）。
- `channels.telegram.retry`：Telegram 发送帮助程序（CLI/工具/操作）在可恢复的出站 API 错误上的重试策略（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆盖 Node autoSelectFamily（true=启用，false=禁用）。默认在 Node 22+ 上启用，WSL2 默认禁用。
- `channels.telegram.network.dnsResultOrder`：覆盖 DNS 结果顺序（`ipv4first` 或 `verbatim`）。默认在 Node 22+ 上为 `ipv4first`。
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`：用于受信任的伪造 IP 或透明代理环境的危险选择加入功能，其中 Telegram 媒体下载将 `api.telegram.org` 解析为默认 RFC 2544 基准范围允许范围之外的私有/内部/特殊用途地址。
- `channels.telegram.proxy`：Bot API 调用的代理 URL（SOCKS/HTTP）。
- `channels.telegram.webhookUrl`：启用 Webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：Webhook 密钥（设置 webhookUrl 时必需）。
- `channels.telegram.webhookPath`：本地 Webhook 路径（默认 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本地 webhook 绑定主机（默认为 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本地 webhook 绑定端口（默认为 `8787`）。
- `channels.telegram.actions.reactions`：控制 Telegram Telegram 工具反应。
- `channels.telegram.actions.sendMessage`：控制 Telegram Telegram 工具消息发送。
- `channels.telegram.actions.deleteMessage`：控制 Telegram Telegram 工具消息删除。
- `channels.telegram.actions.sticker`：控制 Telegram Telegram 贴纸操作——发送和搜索（默认：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` —— 控制哪些反应会触发系统事件（默认：未设置时为 `own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` —— 控制代理的反应能力（默认：未设置时为 `minimal`）。
- `channels.telegram.errorPolicy`：`reply | silent` —— 控制错误回复行为（默认：`reply`）。支持按账户/群组/主题覆盖。
- `channels.telegram.errorCooldownMs`：向同一聊天发送错误回复之间的最小毫秒数（默认：`60000`）。防止中断期间的错误垃圾信息。

- [配置参考 - Telegram](/en/gateway/configuration-reference#telegram)

Telegram 特有的高信号字段：

- 启动/身份验证：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必须指向常规文件；拒绝符号链接）
- 访问控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`，顶级 `bindings[]`（`type: "acp"`）
- 执行批准：`execApprovals`、`accounts.*.execApprovals`
- 命令/菜单：`commands.native`、`commands.nativeSkills`、`customCommands`
- 线程/回复：`replyToMode`
- streaming（流式传输）：`streaming`（预览版），`blockStreaming`
- formatting/delivery（格式/投递）：`textChunkLimit`，`chunkMode`，`linkPreview`，`responsePrefix`
- media/network（媒体/网络）：`mediaMaxMb`，`timeoutSeconds`，`retry`，`network.autoSelectFamily`，`network.dangerouslyAllowPrivateNetwork`，`proxy`
- webhook（网络钩子）：`webhookUrl`，`webhookSecret`，`webhookPath`，`webhookHost`
- actions/capabilities（操作/功能）：`capabilities.inlineButtons`，`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions（反应）：`reactionNotifications`，`reactionLevel`
- errors（错误）：`errorPolicy`，`errorCooldownMs`
- writes/history（写入/历史）：`configWrites`，`historyLimit`，`dmHistoryLimit`，`dms.*.historyLimit`

## 相关内容

- [配对](/en/channels/pairing)
- [群组](/en/channels/groups)
- [安全性](/en/gateway/security)
- [渠道路由](/en/channels/channel-routing)
- [多智能体路由](/en/concepts/multi-agent)
- [故障排除](/en/channels/troubleshooting)
