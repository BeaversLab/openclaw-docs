---
summary: "Telegram bot 支持状态、功能和配置"
read_when:
  - Working on Telegram features or webhooks
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
  <Step title="在 BotFather 中创建 bot token">
    打开 Telegram 并与 **@BotFather** 聊天（确认句柄确认为 `@BotFather`）。

    运行 `/newbot`，按照提示操作，并保存 token。

  </Step>

  <Step title="配置 token 和私信策略">

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
    Telegram **不**使用 `openclaw channels login telegram`；请在 config/env 中配置 token，然后启动网关。

  </Step>

  <Step title="Start gateway and approve first 私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码在 1 小时后过期。

  </Step>

  <Step title="将 bot 添加到群组">
    将 bot 添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>Token 解析顺序与账户相关。实际上，配置值优先于环境变量回退，且 `TELEGRAM_BOT_TOKEN` 仅适用于默认账户。</Note>

## Telegram 端设置

<AccordionGroup>
  <Accordion title="隐私模式和群组可见性">
    Telegram bot 默认处于 **隐私模式**，这限制了它们能收到的群组消息。

    如果 bot 必须查看所有群组消息，请执行以下操作之一：

    - 通过 `/setprivacy` 禁用隐私模式，或者
    - 将 bot 设为群组管理员。

    切换隐私模式时，请在每个群组中移除并重新添加 bot，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="群组权限">
    管理员状态在 Telegram 群组设置中控制。

    管理员机器人接收所有群组消息，这对于始终开启的群组行为非常有用。

  </Accordion>

  <Accordion title="有用的 BotFather 开关">

    - `/setjoingroups` 以允许/拒绝添加到群组
    - `/setprivacy` 用于群组可见性行为

  </Accordion>
</AccordionGroup>

## 访问控制和激活

<Tabs>
  <Tab title="私信 policy">
    `channels.telegram.dmPolicy` 控制私信访问权限：

    - `pairing`（默认）
    - `allowlist`（需要在 `allowFrom` 中至少包含一个发送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。接受并标准化 `telegram:` / `tg:` 前缀。
    如果 `dmPolicy: "allowlist"` 的 `allowFrom` 为空，则会阻止所有私信，并且会被配置验证拒绝。
    设置仅要求输入数字用户 ID。
    如果您进行了升级且配置中包含 `@username` 允许列表条目，请运行 `openclaw doctor --fix` 来解析它们（尽力而为；需要 Telegram 机器人令牌）。
    如果您之前依赖配对存储允许列表文件，`openclaw doctor --fix` 可以在允许列表流程中将条目恢复到 `channels.telegram.allowFrom`（例如，当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单人所有者的机器人，建议优先使用带有显式数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以使配置中的访问策略持久化（而不是依赖于之前的配对批准）。

    常见误区：私信配对批准并不意味着“此发送者在任何地方都已获得授权”。
    配对仅授予私信访问权限。群组发送者授权仍需来自显式的配置允许列表。
    如果您希望“授权一次后，私信和群组命令均可用”，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom` 中。

    ### 查找您的 Telegram 用户 ID

    更安全的方法（无第三方机器人）：

    1. 私信您的机器人。
    2. 运行 `openclaw logs --follow`。
    3. 读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隐私性较低）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="Group policy and allowlists">
    Two controls apply together:

    1. **Which groups are allowed** (`channels.telegram.groups`)
       - no `groups` config:
         - with `groupPolicy: "open"`: any group can pass group-ID checks
         - with `groupPolicy: "allowlist"` (default): groups are blocked until you add `groups` entries (or `"*"`)
       - `groups` configured: acts as allowlist (explicit IDs or `"*"`)

    2. **Which senders are allowed in groups** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (default)
       - `disabled`

    `groupAllowFrom` is used for group sender filtering. If not set, Telegram falls back to `allowFrom`.
    `groupAllowFrom` entries should be numeric Telegram user IDs (`telegram:` / `tg:` prefixes are normalized).
    Do not put Telegram group or supergroup chat IDs in `groupAllowFrom`. Negative chat IDs belong under `channels.telegram.groups`.
    Non-numeric entries are ignored for sender authorization.
    Security boundary (`2026.2.25+`): group sender auth does **not** inherit 私信 pairing-store approvals.
    Pairing stays 私信-only. For groups, set `groupAllowFrom` or per-group/per-topic `allowFrom`.
    If `groupAllowFrom` is unset, Telegram falls back to config `allowFrom`, not the pairing store.
    Practical pattern for one-owner bots: set your user ID in `channels.telegram.allowFrom`, leave `groupAllowFrom` unset, and allow the target groups under `channels.telegram.groups`.
    Runtime note: if `channels.telegram` is completely missing, runtime defaults to fail-closed `groupPolicy="allowlist"` unless `channels.defaults.groupPolicy` is explicitly set.

    Example: allow any member in one specific group:

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

    Example: allow only specific users inside one specific group:

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
      Common mistake: `groupAllowFrom` is not a Telegram group allowlist.

      - Put negative Telegram group or supergroup chat IDs like `-1001234567890` under `channels.telegram.groups`.
      - Put Telegram user IDs like `8734062810` under `groupAllowFrom` when you want to limit which people inside an allowed group can trigger the bot.
      - Use `groupAllowFrom: ["*"]` only when you want any member of an allowed group to be able to talk to the bot.
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

    - 将一条群组消息转发给 `@userinfobot` / `@getidsbot`
    - 或从 `openclaw logs --follow` 读取 `chat.id`
    - 或检查 Bot API `getUpdates`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 归网关进程所有。
- 路由是确定性的：Telegram 入站回复会回发到 Telegram（模型不选择渠道）。
- 入站消息会规范化为包含回复元数据和媒体占位符的共享渠道信封。
- 群组会话按群组 ID 隔离。论坛主题附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`；OpenClaw 使用线程感知的会话键路由它们，并保留线程 ID 用于回复。
- 长轮询使用 grammY 运行器，并按聊天/按线程进行排序。整体运行器接收器并发性使用 `agents.defaults.maxConcurrent`。
- 默认情况下，如果在 120 秒内未完成 `getUpdates` 存活检查，长轮询看门狗会触发重启。仅当您的部署在长时间运行的工作期间仍然出现错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围为 `30000` 到 `600000`；支持按账户覆盖。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 映射到 Telegram 上的 `partial`（兼容跨渠道命名）
    - `streaming.preview.toolProgress` 控制工具/进度更新是否重用同一条编辑后的预览消息（默认：`true`）。设置 `false` 以保留单独的工具/进度消息。
    - 旧的 `channels.telegram.streamMode` 和布尔 `streaming` 值会自动映射

    对于纯文本回复：

    - 私信：OpenClaw 保持同一条预览消息并执行就地最终编辑（无第二条消息）
    - 群组/话题：OpenClaw 保持同一条预览消息并执行就地最终编辑（无第二条消息）

    对于复杂回复（例如媒体载荷），OpenClaw 会回退到正常的最终交付，然后清理预览消息。

    预览流与分块流式传输是分开的。当为 Telegram 明确启用分块流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

    如果原生草稿传输不可用/被拒绝，OpenClaw 会自动回退到 `sendMessage` + `editMessageText`。

    Telegram 专属推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 最终答案不包含推理文本

  </Accordion>

  <Accordion title="格式化与 HTML 回退">
    出站文本使用 Telegram `parse_mode: "HTML"`。

    - 类 Markdown 文本被渲染为 Telegram 安全 HTML。
    - 原始模型 HTML 被转义以减少 Telegram 解析失败。
    - 如果 Telegram 拒绝解析后的 HTML，OpenClaw 将重试为纯文本。

    链接预览默认启用，可以使用 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="原生命令和自定义命令">
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

    - 名称会被规范化（去除前导 `/`，转为小写）
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复项将被跳过并记录

    说明：

    - 自定义命令仅作为菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在输入时仍然可以工作

    如果禁用了原生命令，内置命令将被移除。如果配置了自定义/插件命令，它们仍可能注册。

    常见设置失败：

    - `setMyCommands failed` 且伴随 `BOT_COMMANDS_TOO_MUCH` 表示 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - `setMyCommands failed` 且伴随网络/获取错误通常表示到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    当安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 在 iOS 应用中粘贴代码
    3. `/pair pending` 列出待处理请求（包括角色/作用域）
    4. 批准请求：
       - `/pair approve <requestId>` 用于明确批准
       - `/pair approve` 当只有一个待处理请求时
       - `/pair approve latest` 用于最近的请求

    设置代码携带一个短期引导令牌。内置引导交接将主节点令牌保留在 `scopes: []`；任何交接的操作员令牌将保持受限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。引导作用域检查带有角色前缀，因此操作员允许列表仅满足操作员请求；非操作员角色仍需要在其自己的角色前缀下拥有作用域。

    如果设备使用更改的身份验证详细信息（例如角色/作用域/公钥）重试，则先前的待处理请求将被取代，新请求使用不同的 `requestId`。在批准之前重新运行 `/pair pending`。

    更多详情：[配对](/zh/channels/pairing#pair-via-telegram-recommended-for-ios)。

  </Accordion>

  <Accordion title="内联按钮">
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

    回调点击作为文本传递给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="面向代理和自动化的 Telegram 消息操作">
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`)

    Channel message actions 揭示了符合人体工学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    门控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认：禁用)

    注意：`edit` 和 `topic-create` 目前默认启用，并且没有单独的 `channels.telegram.actions.*` 开关。
    运行时发送使用活动的配置/机密快照（启动/重新加载），因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    反应移除语义：[/tools/reactions](/zh/tools/reactions)

  </Accordion>

  <Accordion title="回复线程标签">
    Telegram 在生成的输出中支持显式的回复线程标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    注意：`off` 会禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍会被遵守。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    论坛超级群组：

    - 主题会话键附加 `:topic:<threadId>`
    - 回复和输入状态以主题串为目标
    - 主题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主题（`threadId=1`）特殊情况：

    - 消息发送省略 `message_thread_id`（Telegram 拒绝 `sendMessage(...thread_id=1)`）
    - 输入动作仍包含 `message_thread_id`

    主题继承：主题条目继承群组设置，除非被覆盖（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 是主题专用的，不从群组默认值继承。

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

    然后，每个主题都有自己的会话键：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 主题绑定**：论坛主题可以通过顶级类型化 ACP 绑定固定 ACP 约束会话：

    - `bindings[]` 带有 `type: "acp"` 和 `match.channel: "telegram"`

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

    **从聊天发起的线程绑定 ACP 生成**：

    - `/acp spawn <agent> --thread here|auto` 可以将当前 Telegram 主题绑定到新的 ACP 会话。
    - 后续主题消息直接路由到绑定的 ACP 会话（无需 `/acp steer`）。
    - 成功绑定后，OpenClaw 会将生成确认消息固定在主题中。
    - 需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文包括：

    - `MessageThreadId`
    - `IsForum`

    私信线程行为：

    - 带有 `message_thread_id` 的私人聊天保留私信路由，但使用线程感知的会话键/回复目标。

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

    视频笔记不支持说明文字；提供的消息文本将单独发送。

    ### 贴纸

    传入贴纸处理：

    - 静态 WEBP：已下载并处理（占位符 `<media:sticker>`）
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

    贴纸仅描述一次（尽可能）并缓存以减少重复的视觉调用。

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

    启用后，OpenClaw 会将系统事件（如以下内容）加入队列：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`: `off | own | all` (默认: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (默认: `minimal`)

    注意事项：

    - `own` 表示仅限对机器人发送的消息的用户反应（通过已发送消息缓存尽力而为）。
    - 表情反应事件仍然遵守 Telegram 访问控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`）；未经授权的发送者将被丢弃。
    - Telegram 不在表情反应更新中提供话题 ID。
      - 非群组论坛路由到群组聊天会话
      - 群组论坛路由到群组综合话题会话（`:topic:1`），而非确切的原始话题

    用于轮询/Webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 在 OpenClaw 处理入站消息时会发送一个确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退（`agents.list[].identity.emoji`，否则为 "👀"）

    注意事项：

    - Telegram 期望使用 Unicode 表情符号（例如 "👀"）。
    - 使用 `""` 可针对渠道或帐户禁用该反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    渠道配置写入默认已启用 (`configWrites !== false`)。

    Telegram 触发的写入包括：

    - 群组迁移事件 (`migrate_to_chat_id`) 以更新 `channels.telegram.groups`
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

<Accordion title="群组中的模型选择器授权">群组模型选择器内联按钮需要与 `/models` 相同的授权。未经授权的参与者可以浏览并点击按钮，但 OpenClaw 会在更改会话模型之前拒绝回调。</Accordion>

  <Accordion title="Long polling vs webhook">
    默认：长轮询 (long polling)。

    Webhook 模式：

    - 设置 `channels.telegram.webhookUrl`
    - 设置 `channels.telegram.webhookSecret` (设置 webhook URL 时必需)
    - 可选 `channels.telegram.webhookPath` (默认 `/telegram-webhook`)
    - 可选 `channels.telegram.webhookHost` (默认 `127.0.0.1`)
    - 可选 `channels.telegram.webhookPort` (默认 `8787`)

    Webhook 模式的默认本地监听器绑定到 `127.0.0.1:8787`。

    如果您的公共端点不同，请在前面放置反向代理，并将 `webhookUrl` 指向公共 URL。
    当您有意需要外部入口时，设置 `webhookHost` (例如 `0.0.0.0`)。

    grammY webhook 回调会在 5 秒内返回 200，因此 Telegram 不会因读取超时而重试长时间运行的更新；较长的工作会在后台继续。轮询会在 `getUpdates` 次 409 冲突后重建 HTTP 传输，因此重试使用的是新的 TCP 连接，而不是在 Telegram 终止的 keep-alive 套接字上循环。

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度分割之前优先考虑段落边界（空行）。
    - `channels.telegram.mediaMaxMb`（默认 100）限制传入和传出的 CLI 媒体大小。
    - `channels.telegram.timeoutSeconds` 覆盖 Telegram Telegram 客户端超时（如果未设置，则应用 API 默认值）。
    - `channels.telegram.pollingStallThresholdMs` 默认为 `120000`；仅在因误报导致的轮询停滞重启时才在 `30000` 和 `600000` 之间调整。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 表示禁用。
    - 回复/引用/转发的补充上下文目前按接收到的原样传递。
    - grammY 白名单主要限制谁可以触发代理，而不是完整的补充上下文编辑边界。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送辅助函数（Telegram/tools/actions），用于可恢复的出站 CLI 错误。

    API 发送目标可以是数字聊天 ID 或用户名：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    CLI 投票使用 `openclaw message poll` 并支持论坛主题：

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

    - `--presentation` 与 `buttons` 块用于内联键盘，当 `channels.telegram.capabilities.inlineButtons` 允许时
    - `--pin` 或 `--delivery '{"pin":true}'` 请求置顶发送，当机器人可以在该聊天中置顶时
    - `--force-document` 将出站图像和 GIF 作为文档发送，而不是压缩的照片或动画媒体上传

    动作限制：

    - `channels.telegram.actions.sendMessage=false` 禁用出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 禁用 Telegram 投票创建，同时保留常规发送功能

  </Accordion>

  <Accordion title="在 Telegram 中进行执行审批">
    Telegram 支持在审批人的私信中进行执行审批，并可以选择在原始聊天或主题中发布审批提示。

    配置路径：

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`（可选；在可能时回退到从 `allowFrom` 和直接 `defaultTo` 推断出的数字所有者 ID）
    - `channels.telegram.execApprovals.target`（`dm` | `channel` | `both`，默认值：`dm`）
    - `agentFilter`、`sessionFilter`

    审批人必须是 Telegram 数字用户 ID。当 `enabled` 未设置或设置为 `"auto"` 且至少能解析到一个审批人（无论是来自 `execApprovals.approvers` 还是账户的数字所有者配置 `allowFrom` 和直接消息 `defaultTo`）时，Telegram 会自动启用原生执行审批。设置 `enabled: false` 可显式禁用 Telegram 作为原生审批客户端。否则，审批请求将回退到其他已配置的审批路由或执行审批回退策略。

    Telegram 还会呈现其他聊天渠道使用的共享审批按钮。Telegram 原生适配器主要增加了审批人私信路由、渠道/主题分发以及传递前的输入提示。
    当存在这些按钮时，它们是主要的审批用户体验；OpenClaw
    应仅在工具结果指出聊天审批不可用或手动审批是唯一途径时，才包含手动 `/approve` 命令。

    传递规则：

    - `target: "dm"` 仅向已解析的审批人私信发送审批提示
    - `target: "channel"` 将提示发回原始 Telegram 聊天/主题
    - `target: "both"` 同时发送给审批人私信和原始聊天/主题

    只有已解析的审批人才能批准或拒绝。非审批人无法使用 `/approve`，也无法使用 Telegram 审批按钮。

    审批解析行为：

    - 前缀为 `plugin:` 的 ID 始终通过插件审批进行解析。
    - 其他审批 ID 首先尝试 `exec.approval.resolve`。
    - 如果 Telegram 也被授权进行插件审批，且网关指出执行审批未知/已过期，Telegram 将通过 `plugin.approval.resolve` 重试一次。
    - 真实的执行审批拒绝/错误不会静默回退到插件审批解析。

    渠道传递会在聊天中显示命令文本，因此仅在受信任的群组/主题中启用 `channel` 或 `both`。当提示发布到论坛主题时，OpenClaw 会为主题保留审批提示和审批后后续跟进。执行审批默认在 30 分钟后过期。

    内联审批按钮还取决于 `channels.telegram.capabilities.inlineButtons` 允许的目标界面（`dm`、`group` 或 `all`）。

    相关文档：[执行审批](/zh/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到传递或提供商错误时，Telegram 可以回复错误文本或禁止显示。两个配置键控制此行为：

| 键                                  | 值                | 默认    | 描述                                                                   |
| ----------------------------------- | ----------------- | ------- | ---------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`，`silent` | `reply` | `reply` 向聊天发送友好的错误消息。`silent` 完全禁止错误回复。          |
| `channels.telegram.errorCooldownMs` | 数字 (毫秒)       | `60000` | 向同一聊天发送错误回复之间的最短时间。防止在故障期间发送垃圾错误消息。 |

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
      - BotFather：`/setprivacy` -> Disable
      - 然后将机器人从群组中移除并重新添加
    - 当配置期望未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法探测成员身份。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="Bot 完全看不到群组消息">

    - 当 `channels.telegram.groups` 存在时，群组必须被列出（或包含 `"*"`）
    - 验证 Bot 在群组中的成员资格
    - 检查日志：`openclaw logs --follow` 了解跳过原因

  </Accordion>

  <Accordion title="命令部分工作或完全不工作">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使组策略是 `open`，命令授权仍然适用
    - 带有 `BOT_COMMANDS_TOO_MUCH` 的 `setMyCommands failed` 意味着原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - 带有网络/获取错误的 `setMyCommands failed` 通常表示到 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="Polling or network instability">

    - Node 22+ + 自定义 fetch/proxy 如果 AbortSignal 类型不匹配，可能会触发立即中止行为。
    - 某些主机首先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站可能会导致间歇性的 Telegram API 故障。
    - 如果日志包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将其作为可恢复的网络错误进行重试。
    - 如果日志包含 `Polling stall detected`，OpenClaw 会在默认 120 秒未完成长轮询活跃度后重启轮询并重建 Telegram 传输。
    - 仅当长时间运行的 `getUpdates` 调用正常但您的主机仍报告错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。持续的停滞通常指向主机与 `api.telegram.org` 之间的代理、DNS、IPv6 或 TLS 出站问题。
    - 在直接出站/TLS 不稳定的 VPS 主机上，请通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主机是 WSL2 或明确在仅使用 IPv4 的行为下工作得更好，请强制选择地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准范围答案 (`198.18.0.0/15`) 默认情况下已允许
      用于 Telegram 媒体下载。如果在媒体下载期间，受信任的伪 IP 或
      透明代理将 `api.telegram.org` 重写为其他
      私有/内部/特殊用途地址，您可以选择
      加入仅限 Telegram 的绕过规则：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每个帐户都可以在 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 处获得相同的选择加入选项。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`，请首先
      关闭此危险标志。Telegram 媒体默认已允许 RFC 2544
      基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram
      媒体 SSRF 保护。请仅对受信任的操作员控制的代理
      环境（如 Clash、Mihomo 或 Surge 伪 IP 路由）使用它，
      因为它们可能会在 RFC 2544 基准
      范围之外合成私有或特殊用途的答案。对于正常的公共互联网 Telegram 访问，请将其关闭。
    </Warning>

    - 环境覆盖（临时）：
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

更多帮助：[渠道故障排除](/zh/channels/troubleshooting)。

## Telegram 配置参考指针

主要参考：

- `channels.telegram.enabled`：启用/禁用渠道启动。
- `channels.telegram.botToken`：Bot 令牌 (BotFather)。
- `channels.telegram.tokenFile`：从常规文件路径读取令牌。拒绝符号链接。
- `channels.telegram.dmPolicy`：`pairing | allowlist | open | disabled` (默认：pairing)。
- `channels.telegram.allowFrom`：私信允许列表（数字 Telegram 用户 ID）。`allowlist` 至少需要一个发送者 ID。`open` 需要 `"*"`。`openclaw doctor --fix` 可以将旧的 `@username` 条目解析为 ID，并可以在允许列表迁移流程中从 pairing-store 文件恢复允许列表条目。
- `channels.telegram.actions.poll`：启用或禁用 Telegram 投票创建（默认：启用；仍需 `sendMessage`）。
- `channels.telegram.defaultTo`：当未提供显式的 `--reply-to` 时，Telegram `--deliver` 使用的默认 CLI 目标。
- `channels.telegram.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。
- `channels.telegram.groupAllowFrom`：群组发送者白名单（数字 Telegram 用户 ID）。`openclaw doctor --fix` 可以将遗留的 `@username` 条目解析为 ID。非数字条目在认证时将被忽略。群组认证不使用私信配对存储回退（`2026.2.25+`）。
- 多帐户优先级：
  - 当配置了两个或更多账户 ID 时，设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明确默认路由。
  - 如果两者均未设置，OpenClaw 将回退到第一个标准化的账户 ID，并且 `openclaw doctor` 会发出警告。
  - `channels.telegram.accounts.default.allowFrom` 和 `channels.telegram.accounts.default.groupAllowFrom` 仅适用于 `default` 账户。
  - 当未设置账户级别的值时，命名账户会继承 `channels.telegram.allowFrom` 和 `channels.telegram.groupAllowFrom`。
  - 命名账户不会继承 `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`。
- `channels.telegram.groups`：每群组默认值 + 允许列表（使用 `"*"` 设置全局默认值）。
  - `channels.telegram.groups.<id>.groupPolicy`：groupPolicy (`open | allowlist | disabled`) 的每群组覆盖设置。
  - `channels.telegram.groups.<id>.requireMention`：提及限制默认值。
  - `channels.telegram.groups.<id>.skills`：技能筛选（省略 = 所有技能，空 = 无）。
  - `channels.telegram.groups.<id>.allowFrom`：按群组覆盖的发送者白名单。
  - `channels.telegram.groups.<id>.systemPrompt`：群组的额外系统提示。
  - `channels.telegram.groups.<id>.enabled`：当 `false` 时禁用群组。
  - `channels.telegram.groups.<id>.topics.<threadId>.*`：按主题覆盖（群组字段 + 仅限主题的 `agentId`）。
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`：将此主题路由到特定代理（覆盖群组级别和绑定路由）。
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`：groupPolicy 的按主题覆盖（`open | allowlist | disabled`）。
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`：按主题覆盖的提及限制。
- `match.peer.id` 中的顶级 `bindings[]`，带有 `type: "acp"` 和规范主题 ID `chatId:topic:topicId`：持久的 ACP 主题绑定字段（参见 [ACP Agents](/zh/tools/acp-agents#channel-specific-settings)）。
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`：将私信主题路由到特定代理（行为与论坛主题相同）。
- `channels.telegram.execApprovals.enabled`：为此账户启用 Telegram 作为基于聊天的执行审批客户端。
- `channels.telegram.execApprovals.approvers`：允许批准或拒绝执行请求的 Telegram 用户 ID。当 `channels.telegram.allowFrom` 或直接的 `channels.telegram.defaultTo` 已标识所有者时为可选。
- `channels.telegram.execApprovals.target`: `dm | channel | both`（默认：`dm`）。`channel` 和 `both` 在存在时会保留原始的 Telegram 主题。
- `channels.telegram.execApprovals.agentFilter`：用于转发的审批提示的可选代理 ID 过滤器。
- `channels.telegram.execApprovals.sessionFilter`：用于转发的审批提示的可选会话密钥过滤器（子字符串或正则表达式）。
- `channels.telegram.accounts.<account>.execApprovals`：针对每个帐户的 Telegram 执行审批路由和审批人授权的覆盖设置。
- `channels.telegram.capabilities.inlineButtons`: `off | dm | group | all | allowlist`（默认：allowlist）。
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`：针对每个帐户的覆盖设置。
- `channels.telegram.commands.nativeSkills`：启用/禁用 Telegram 原生技能命令。
- `channels.telegram.replyToMode`：`off | first | all`（默认：`off`）。
- `channels.telegram.textChunkLimit`：出站分块大小（字符）。
- `channels.telegram.chunkMode`：`length`（默认）或 `newline`，在按长度分块之前在空行（段落边界）处分割。
- `channels.telegram.linkPreview`：切换出站消息的链接预览（默认：true）。
- `channels.telegram.streaming`：`off | partial | block | progress`（实时流预览；默认：`partial`；`progress` 映射到 `partial`；`block` 是旧版预览模式兼容性）。Telegram 预览流使用在原位编辑的单条预览消息。
- `channels.telegram.streaming.preview.toolProgress`：当预览流式传输处于活动状态时，重用实时预览消息进行工具/进度更新（默认：`true`）。设置 `false` 以保持单独的工具/进度消息。
- `channels.telegram.mediaMaxMb`：入站/出站 Telegram 媒体上限（MB，默认：100）。
- `channels.telegram.retry`：针对可恢复的出站 Telegram 错误的 CLI 发送辅助程序（API/工具/操作）的重试策略（attempts、minDelayMs、maxDelayMs、jitter）。
- `channels.telegram.network.autoSelectFamily`：覆盖 Node autoSelectFamily（true=启用，false=禁用）。在 Node 22+ 上默认为启用，WSL2 默认为禁用。
- `channels.telegram.network.dnsResultOrder`：覆盖 DNS 结果顺序（`ipv4first` 或 `verbatim`）。在 Node 22+ 上默认为 `ipv4first`。
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`：适用于受信任的虚假 IP 或透明代理环境的危险选择性加入，其中 Telegram 媒体下载将 `api.telegram.org` 解析为默认 RFC 2544 基准范围允许之外的私有/内部/专用地址。
- `channels.telegram.proxy`：Bot API 调用的代理 URL (SOCKS/HTTP)。
- `channels.telegram.webhookUrl`：启用 webhook 模式（需要 `channels.telegram.webhookSecret`）。
- `channels.telegram.webhookSecret`：webhook 密钥（设置 webhookUrl 时必需）。
- `channels.telegram.webhookPath`：本地 webhook 路径（默认为 `/telegram-webhook`）。
- `channels.telegram.webhookHost`：本地 webhook 绑定主机（默认为 `127.0.0.1`）。
- `channels.telegram.webhookPort`：本地 webhook 绑定端口（默认为 `8787`）。
- `channels.telegram.actions.reactions`：屏蔽 Telegram 工具的反应。
- `channels.telegram.actions.sendMessage`：屏蔽 Telegram 工具消息发送。
- `channels.telegram.actions.deleteMessage`：屏蔽 Telegram 工具消息删除。
- `channels.telegram.actions.sticker`：屏蔽 Telegram 贴纸操作——发送和搜索（默认值：false）。
- `channels.telegram.reactionNotifications`：`off | own | all` — 控制哪些反应会触发系统事件（如果未设置，默认为 `own`）。
- `channels.telegram.reactionLevel`：`off | ack | minimal | extensive` — 控制 Agent 的反应能力（如果未设置，默认为 `minimal`）。
- `channels.telegram.errorPolicy`：`reply | silent` — 控制错误回复行为（默认值：`reply`）。支持按账户/群组/主题进行覆盖。
- `channels.telegram.errorCooldownMs`: 同一聊天之间错误回复的最小毫秒数（默认：`60000`）。防止中断期间出现错误垃圾信息。

- [配置参考 - Telegram](/zh/gateway/configuration-reference#telegram)

Telegram 特有的高信噪度字段：

- 启动/认证：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必须指向常规文件；不接受符号链接）
- 访问控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、顶级 `bindings[]`（`type: "acp"`）
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`
- streaming: `streaming` (预览), `streaming.preview.toolProgress`, `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- actions/capabilities：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions：`reactionNotifications`、`reactionLevel`
- errors：`errorPolicy`、`errorCooldownMs`
- writes/history：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [安全性](/zh/gateway/security)
- [通道路由](/zh/channels/channel-routing)
- [多智能体路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)
