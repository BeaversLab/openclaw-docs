---
summary: "TelegramTelegram 机器人支持状态、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "TelegramTelegram"
---

通过 grammY 支持机器人私信和群组的生产环境使用。长轮询是默认模式；Webhook 模式是可选的。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing" Telegram>
    Telegram 的默认私信策略是配对。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关)Gateway configuration" icon="settings" href="/zh/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="Create the bot token in BotFather"Telegram>
    打开 Telegram 并与 **@BotFather** 聊天（确认确切的句柄是 `@BotFather`）。

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

    环境变量回退：`TELEGRAM_BOT_TOKEN=...`Telegram（仅限默认账户）。
    Telegram **不**使用 `openclaw channels login telegram`；请在配置/环境变量中配置令牌，然后启动网关。

  </Step>

  <Step title="Start gateway and approve first 私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码会在 1 小时后过期。

  </Step>

  <Step title="Add the bot to a group">
    将机器人添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>令牌解析顺序是感知账户的。实际上，配置值优先于环境变量回退，并且 `TELEGRAM_BOT_TOKEN` 仅适用于默认账户。</Note>

## Telegram 侧设置

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility"Telegram>
    Telegram 机器人默认启用 **隐私模式**，这会限制它们接收到的群组消息。

    如果机器人必须查看所有群组消息，请执行以下操作之一：

    - 通过 `/setprivacy`Telegram 禁用隐私模式，或
    - 将机器人设为群组管理员。

    切换隐私模式时，请在每个群组中移除并重新添加机器人，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="Group permissions"Telegram>
    管理员状态在 Telegram 群组设置中控制。

    管理员机器人会接收所有群组消息，这对于始终开启的群组行为非常有用。

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - 使用 `/setjoingroups` 以允许/拒绝将其添加到群组
    - 使用 `/setprivacy` 以控制群组可见性行为

  </Accordion>
</AccordionGroup>

## 访问控制和激活

<Tabs>
  <Tab title="私信 策略">
    `channels.telegram.dmPolicy` 控制私信访问权限：

    - `pairing`（默认）
    - `allowlist`（需要在 `allowFrom` 中至少有一个发送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    带有 `allowFrom: ["*"]` 的 `dmPolicy: "open"` 允许任何发现或猜到机器人用户名的 Telegram 账户控制该机器人。仅将其用于工具受限严格的故意公开机器人；单一所有者的机器人应使用带有数字用户 ID 的 `allowlist`。

    `channels.telegram.allowFrom` 接受数字 Telegram 用户 ID。`telegram:` / `tg:` 前缀会被接受并标准化。
    在多账户配置中，限制性的顶层 `channels.telegram.allowFrom` 被视为安全边界：除非合并后的有效账户白名单仍包含显式通配符，否则账户级别的 `allowFrom: ["*"]` 条目不会使该账户公开。
    带有空的 `allowFrom` 的 `dmPolicy: "allowlist"` 会阻止所有私信，并且会被配置验证拒绝。
    设置仅要求数字用户 ID。
    如果您已升级且配置包含 `@username` 白名单条目，请运行 `openclaw doctor --fix` 来解析它们（尽力而为；需要 Telegram 机器人令牌）。
    如果您之前依赖配对存储白名单文件，`openclaw doctor --fix` 可以在白名单流程中将条目恢复到 `channels.telegram.allowFrom` 中（例如，当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单一所有者的机器人，建议使用带有显式数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以使访问策略在配置中持久化（而不是依赖之前的配对批准）。

    常见误解：私信配对批准并不意味着“此发送者在任何地方都已获授权”。
    配对授予私信访问权限。如果尚无命令所有者，首次批准的配对还会设置 `commands.ownerAllowFrom`，以便仅限所有者的命令和执行批准具有显式操作员账户。
    群组发送者授权仍来自显式配置白名单。
    如果您希望“我被授权一次后，私信和群组命令都能工作”，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom` 中；对于仅限所有者的命令，请确保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`。

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
    两个控制项同时生效：

    1. **允许哪些群组** (`channels.telegram.groups`)
       - 没有 `groups` 配置：
         - 使用 `groupPolicy: "open"`：任何群组都可以通过群组 ID 检查
         - 使用 `groupPolicy: "allowlist"`（默认）：群组将被阻止，直到您添加 `groups` 条目（或 `"*"`）
       - 已配置 `groups`：作为允许列表（显式 ID 或 `"*"`）

    2. **群组中允许哪些发送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发送者过滤。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被标准化）。
    请勿将 Telegram 群组或超级群组聊天 ID 放入 `groupAllowFrom`。负数聊天 ID 属于 `channels.telegram.groups`。
    非数字条目在发送者授权时会被忽略。
    安全边界 (`2026.2.25+`)：群组发送者认证**不会**继承私信配对存储中的批准。
    配对仅限于私信。对于群组，请设置 `groupAllowFrom` 或按群组/按主题设置 `allowFrom`。
    如果未设置 `groupAllowFrom`，Telegram 将回退到配置 `allowFrom`，而不是配对存储。
    单所有者机器人的实用模式：在 `channels.telegram.allowFrom` 中设置您的用户 ID，保持 `groupAllowFrom` 未设置，并在 `channels.telegram.groups` 中允许目标群组。
    运行时说明：如果完全缺少 `channels.telegram`，运行时默认为失效关闭 `groupPolicy="allowlist"`，除非显式设置了 `channels.defaults.groupPolicy`。

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
      - 当您想限制允许群组内的哪些人可以触发机器人时，将 Telegram 用户 ID（如 `8734062810`）放在 `groupAllowFrom` 下。
      - 仅当您希望允许群组的任何成员都能与机器人交谈时，才使用 `groupAllowFrom: ["*"]`。

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

    这些仅更新会话状态。请使用配置进行持久化。

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
- 路由是确定性的：Telegram 入站回复会发回 Telegram（模型不选择渠道）。
- 传入消息会规范化为共享的渠道信封，其中包含回复元数据、媒体占位符以及网关观察到的 Telegram 回复的持久化回复链上下文。
- 群组会话按群组 ID 隔离。论坛主题会附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`OpenClaw；OpenClaw 会为回复保留主题 ID，但默认情况下将私信保持在扁平会话中。当您有意希望私信主题会话隔离时，请配置 `channels.telegram.dm.threadReplies: "inbound"`、`channels.telegram.direct.<chatId>.threadReplies: "inbound"`、`requireTopic: true` 或匹配的主题配置。
- 长轮询使用 grammY 运行器进行按聊天/按线程的排序。整体运行器接收器并发使用 grammY`agents.defaults.maxConcurrent`。
- 长轮询在每个网关进程内部受到保护，因此一次只有一个活跃的轮询器可以使用 bot 令牌。如果您仍然看到 `getUpdates`OpenClaw 409 冲突，则可能是另一个 OpenClaw 网关、脚本或外部轮询器正在使用相同的令牌。
- 默认情况下，长轮询监视程序重启会在 120 秒内未完成 `getUpdates` 活跃检查时触发。仅当您的部署在长时间运行的工作期间仍然出现错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围为 `30000` 到 `600000`；支持按帐户覆盖。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/主题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 为工具进度保留一个可编辑的状态草稿，完成时清除它，并将最终答案作为普通消息发送
    - `streaming.preview.toolProgress` 控制工具/进度更新是否重用同一条已编辑的预览消息（当预览流式传输处于活动状态时默认为 `true`）
    - `streaming.preview.commandText` 控制这些工具进度行内的命令/执行详细信息：`raw`（默认，保留已发布的行为）或 `status`（仅工具标签）
    - 会检测旧的 `channels.telegram.streamMode` 和布尔值 `streaming` 值；运行 `openclaw doctor --fix` 将它们迁移到 `channels.telegram.streaming.mode`

    工具进度预览更新是在工具运行时显示的简短状态行，例如命令执行、文件读取、规划更新或补丁摘要。Telegram 默认保持这些更新启用，以匹配 OpenClaw 在 `v2026.4.22` 及更高版本中发布的已发布行为。要保留答案文本的已编辑预览但隐藏工具进度行，请设置：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": false
            }
          }
        }
      }
    }
    ```

    要保持工具进度可见但隐藏命令/执行文本，请设置：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    当您希望可见的工具进度而不将最终答案编辑到同一条消息中时，请使用 `progress` 模式。将命令文本策略放在 `streaming.progress` 下：

    ```json
    {
      "channels": {
        "telegram": {
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

    仅当您希望仅发送最终结果时才使用 `streaming.mode: "off"`：Telegram 预览编辑被禁用，并且通用工具/进度闲聊被抑制，而不是作为独立状态消息发送。批准提示、媒体负载和错误仍然通过正常的最终交付路由。当您只想保留答案预览编辑而隐藏工具进度状态行时，请使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 选定的引用回复是例外情况。当 `replyToMode` 为 `"first"`、`"all"` 或 `"batched"` 并且入站消息包含选定的引用文本时，OpenClaw 会通过 Telegram 的原生引用回复路径发送最终答案，而不是编辑答案预览，因此 `streaming.preview.toolProgress` 无法显示该轮次的简短状态行。没有选定引用文本的当前消息回复仍然保持预览流式传输。当工具进度可见性比原生引用回复更重要时，请设置 `replyToMode: "off"`，或者设置 `streaming.preview.toolProgress: false` 以确认这种权衡。
    </Note>

    对于仅文本回复：

    - 简短的私信/群组/主题预览：OpenClaw 保持同一条预览消息并就地执行最终编辑
    - 分拆为多条 Telegram 消息的长文本最终结果会尽可能重用现有预览作为第一个最终块，然后仅发送剩余的块
    - 进度模式的最终结果会清除状态草稿，并使用正常的最终交付，而不是将草稿编辑为答案
    - 如果在确认完成的文本之前最终编辑失败，OpenClaw 会使用正常的最终交付并清理过时的预览

    对于复杂回复（例如媒体负载），OpenClaw 会回退到正常的最终交付，然后清理预览消息。

    预览流式传输与分块流式传输是分开的。当为 Telegram 显式启用分块流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

    Telegram 专用推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 推理预览在最终交付后被删除；当推理应保持可见时，请使用 `/reasoning on`
    - 最终答案在不包含推理文本的情况下发送

  </Accordion>

  <Accordion title="格式设置与 HTML 回退">
    出站文本使用 Telegram Telegram `parse_mode: "HTML"`TelegramTelegramTelegramOpenClaw。

    - 类似 Markdown 的文本会被渲染为 Telegram 安全的 HTML。
    - 原始模型 HTML 会被转义，以减少 Telegram 解析失败的情况。
    - 如果 Telegram 拒绝解析后的 HTML，OpenClaw 将以纯文本重试。

    链接预览默认启用，可以通过 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="Native commands and custom commands"Telegram>
    Telegram 命令菜单注册在启动时通过 `setMyCommands` 处理。

    原生命令默认设置：

    - `commands.native: "auto"`Telegram 为 Telegram 启用原生命令

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
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`Telegram
    - 自定义命令不能覆盖原生命令
    - 冲突/重复的条目将被跳过并记录

    注意事项：

    - 自定义命令仅作为菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在手动输入时仍然可以工作

    如果禁用了原生命令，内置命令将被移除。如果已配置，自定义/插件命令仍可能注册。

    常见设置失败：

    - `setMyCommands failed` 搭配 `BOT_COMMANDS_TOO_MUCH`Telegram 表示 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - 当直接的 Bot API curl 命令可以工作时，`deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失败并显示 `404: Not Found`API，可能意味着 `channels.telegram.apiRoot` 被设置为了完整的 `/bot<TOKEN>` 端点。`apiRoot`API 必须仅是 Bot API 根目录，而 `openclaw doctor --fix` 会移除意外添加的尾部 `/bot<TOKEN>`。
    - `getMe returned 401`Telegram 表示 Telegram 拒绝了配置的 bot 令牌。请使用当前的 BotFather 令牌更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`OpenClaw；OpenClaw 会在轮询前停止，因此这不会作为 webhook 清理失败被报告。
    - `setMyCommands failed` 搭配网络/fetch 错误通常表示到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    当安装了 `device-pair` 插件时：

    1. `/pair`iOS 生成设置代码
    2. 将代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理的请求（包括角色/作用域）
    4. 批准请求：
       - `/pair approve <requestId>` 用于显式批准
       - `/pair approve` 当只有一个待处理请求时
       - `/pair approve latest` 用于最新的请求

    设置代码携带一个短期引导令牌。内置引导移交将主节点令牌保留在 `scopes: []`；任何移交的操作员令牌都受限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。引导作用域检查带有角色前缀，因此操作员允许列表仅满足操作员请求；非操作员角色仍需要在其自己的角色前缀下的作用域。

    如果设备使用更改的身份验证详细信息（例如角色/作用域/公钥）重试，则先前的待处理请求被取代，新请求使用不同的 `requestId`。请在批准之前重新运行 `/pair pending`。

    更多详情：[配对](/zh/channels/pairing#pair-via-telegram-recommended-for-ios)。

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

    回调点击会作为文本传递给 Agent：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="TelegramTelegram 代理和自动化的消息操作"Telegram>
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`)

    渠道消息操作提供符合人体工程学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    控制开关：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认：禁用)

    注意：`edit` 和 `topic-create` 目前默认启用，且没有单独的 `channels.telegram.actions.*` 开关。
    运行时发送使用活动的配置/机密快照（启动/重新加载时），因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    反应移除语义：[/tools/reactions](/zh/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags"Telegram>
    Telegram 支持在生成输出中使用显式回复线程标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]`Telegram 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off` （默认）
    - `first`
    - `all`TelegramOpenClawTelegramTelegramTelegram

    当启用回复线程且原始 Telegram 文本或说明文字可用时，OpenClaw 会自动包含原生的 Telegram 引用摘录。Telegram 将原生引用文本限制为 1024 个 UTF-16 代码单元，因此较长的消息会从开头开始引用，如果 Telegram 拒绝该引用，则会回退到普通回复。

    注意：`off` 会禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍然有效。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    论坛超级群组：

    - 主题会话键会附加 `:topic:<threadId>`
    - 回复和输入状态以主题串为目标
    - 主题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    一般主题（`threadId=1`）特殊情况：

    - 发送消息时会省略 `message_thread_id`（Telegram 会拒绝 `sendMessage(...thread_id=1)`）
    - 输入动作仍然包含 `message_thread_id`

    主题继承：除非被覆盖，主题条目会继承群组设置（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 仅适用于主题，不会继承群组默认值。

    **按主题的代理路由**：每个主题可以通过在主题配置中设置 `agentId` 来路由到不同的代理。这为每个主题提供了独立的隔离工作区、记忆和会话。示例：

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

    **持久的 ACP 主题绑定**：论坛主题可以通过顶层的类型化 ACP 绑定来固定 ACP harness 会话（`bindings[]` 配合 `type: "acp"` 和 `match.channel: "telegram"`、`peer.kind: "group"`，以及类似 `-1001234567890:topic:42` 的主题限定 id）。目前仅限于群组/超级群组中的论坛主题。请参阅 [ACP Agents](/zh/tools/acp-agents)。

    **从聊天发起的线程绑定 ACP 生成**：`/acp spawn <agent> --thread here|auto` 会将当前主题绑定到一个新的 ACP 会话；后续回复将直接路由到那里。OpenClaw 会将生成确认消息固定在主题内。需要 `channels.telegram.threadBindings.spawnSessions` 保持启用状态（默认值：`true`）。

    模板上下文会暴露 `MessageThreadId` 和 `IsForum`。带有 `message_thread_id` 的私信聊天默认会在扁平会话上保留私信路由和回复元数据；只有在配置了 `threadReplies: "inbound"`、`threadReplies: "always"`、`requireTopic: true` 或匹配的主题配置时，它们才会使用线程感知的会话键。使用顶层的 `channels.telegram.dm.threadReplies` 作为账户默认值，或使用 `direct.<chatId>.threadReplies` 针对单个私信。

  </Accordion>

  <Accordion title="音频、视频和贴纸"Telegram>
    ### 音频消息

    Telegram 区分语音讯息与音频文件。

    - 默认：音频文件行为
    - 在代理回复中使用标签 `[[audio_as_voice]]` 强制发送语音讯息
    - 传入的语音讯息转录内容在代理上下文中被标记为机器生成的、不可信的文本；提及检测仍使用原始转录内容，因此受提及限制的语音消息可继续正常工作。

    消息操作示例：

````json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```Telegram

    ### 视频消息

    Telegram 区分视频文件与视频讯息。

    消息操作示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
````

    视频讯息不支持字幕；提供的消息文本将单独发送。

    ### 贴纸

    传入贴纸的处理方式：

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

    贴纸仅描述一次（尽可能）并进行缓存，以减少重复的视觉调用。

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

    搜索缓存贴纸：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="Reaction notifications"Telegram>
    Telegram 反应以 `message_reaction`OpenClaw 更新的形式到达（与消息载荷分开）。

    启用后，OpenClaw 将排队系统事件，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`: `off | own | all` (默认值: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (默认值: `minimal`)

    注意事项：

    - `own`Telegram 表示仅针对机器人发送消息的用户反应（通过已发送消息缓存尽力而为）。
    - 反应事件仍遵循 Telegram 访问控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`Telegram)；未经授权的发送者将被丢弃。
    - Telegram 不会在反应更新中提供话题 ID。
      - 非论坛群组路由到群聊会话
      - 论坛群组路由到群组通用话题会话 (`:topic:1`)，而不是确切的原始话题

    用于轮询/Webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 处理入站消息时，`ackReaction`OpenClaw 会发送一个确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退 (`agents.list[].identity.emoji`Telegram，否则为 "👀")

    注意事项：

    - Telegram 期望使用 unicode 表情符号（例如 "👀"）。
    - 使用 `""` 为渠道或账户禁用此反应。

  </Accordion>

  <Accordion title="Telegram来自 Telegram 事件和命令的配置写入">
    默认启用通道配置写入 (`configWrites !== false`Telegram)。

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
    默认为长轮询。如需使用 Webhook 模式，请设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选 `webhookPath`、`webhookHost`、`webhookPort` (默认值分别为 `/telegram-webhook`、`127.0.0.1`、`8787`OpenClaw)。

    在长轮询模式下，OpenClaw 仅在更新成功分派后才持久化其重启水印。如果处理程序失败，该更新在同一进程中仍可重试，并且不会被标记为已完成以用于重启去重。

    本地监听器绑定到 `127.0.0.1:8787`。对于公网入口，可以在本地端口前放置反向代理，或者有意设置 `webhookHost: "0.0.0.0"`Telegram。

    Webhook 模式会在向 Telegram 返回 `200`TelegramOpenClawTelegram 之前验证请求守卫、Telegram 密钥令牌和 JSON 正文。
    OpenClaw 随后通过与长轮询相同的每会话/每主题机器人通道异步处理更新，因此缓慢的 Agent 轮次不会占用 Telegram 的交付确认 (ACK)。

  </Accordion>

  <Accordion title="CLI限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度拆分之前优先考虑段落边界（空行）。
    - `channels.telegram.mediaMaxMb`Telegram（默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.mediaGroupFlushMs`TelegramOpenClaw（默认 500）控制 Telegram 相册/媒体组在被 OpenClaw 作为一条入站消息分发之前的缓冲时间。如果相册部分到达较晚，请增加此值；若要减少相册回复延迟，请减小此值。
    - `channels.telegram.timeoutSeconds`TelegramAPIgrammYgrammYOpenClaw 覆盖 Telegram API 客户端超时（如果未设置，则应用 grammY 默认值）。Bot 客户端会将配置的值限制在 60 秒的出站文本/输入请求保护之下，以便 grammY 不会在 OpenClaw 的传输保护和后备机制运行之前中止可见回复的传递。长轮询仍使用 45 秒的 `getUpdates` 请求保护，因此空闲轮询不会被无限期放弃。
    - `channels.telegram.pollingStallThresholdMs` 默认为 `120000`；仅在出现误报的轮询停滞重启时，才在 `30000` 和 `600000` 之间进行调整。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0`Telegram 表示禁用。
    - 当网关观察到父消息时，回复/引用/转发的补充上下文会被规范化为最近的优先回复链；观察到的消息缓存与会话存储一起持久化。Telegram 在更新中仅包含一个浅层的 `reply_to_message`TelegramTelegram，因此早于缓存的链受限于 Telegram 当前的更新载荷。
    - Telegram 白名单主要控制谁可以触发代理，而不是完整的补充上下文编辑边界。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry`TelegramCLIAPITelegramCLI 配置适用于 Telegram 发送助手（CLI/工具/操作）的可恢复出站 API 错误。入站最终回复传递也对 Telegram 连接前失败使用了有界的安全发送重试，但它不会重试可能导致重复可见消息的模棱两可的发送后网络封包。

    CLI 和消息工具发送目标可以是数字聊天 ID、用户名或论坛主题目标：

````bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
```Telegram

    Telegram 轮询使用 `openclaw message poll` 并支持论坛主题：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```Telegram

    Telegram 专用轮询标志：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用于论坛主题（或使用 `:topic:`Telegram 目标）

    Telegram 发送还支持：

    - `--presentation` 配合 `buttons` 块，用于当 `channels.telegram.capabilities.inlineButtons` 允许时的内联键盘
    - `--pin` 或 `--delivery '{"pin":true}'` 以在机器人可以在该聊天中置顶时请求置顶传递
    - `--force-document` 将出站图片和 GIF 作为文档发送，而不是压缩的照片或动画媒体上传

    操作门控：

    - `channels.telegram.actions.sendMessage=false`Telegram 禁用出站 Telegram 消息，包括轮询
    - `channels.telegram.actions.poll=false`Telegram 禁用 Telegram 轮询创建，同时保留常规发送功能

  </Accordion>

  <Accordion title="Telegram在 Telegram 中进行执行审批"TelegramTelegram>
    Telegram 支持在审批人私信中进行执行审批，并且可以选择在发起聊天的群组或话题中发布提示。审批人必须是 Telegram 的数字用户 ID。

    配置路径：

    - `channels.telegram.execApprovals.enabled`（当至少有一个审批人可解析时自动启用）
    - `channels.telegram.execApprovals.approvers`（回退到 `commands.ownerAllowFrom` 中的数字所有者 ID）
    - `channels.telegram.execApprovals.target`：`dm`（默认）| `channel` | `both`
    - `agentFilter`，`sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制谁可以与机器人对话以及它将普通回复发送到哪里。它们不会使人成为执行审批人。当尚不存在命令所有者时，第一个经过审批的私信配对会引导 `commands.ownerAllowFrom`，因此单一所有者设置仍然有效，而无需在 `execApprovals.approvers` 下重复 ID。

    通道投递会在聊天中显示命令文本；仅在受信任的群组/话题中启用 `channel` 或 `both`OpenClaw。当提示进入论坛话题时，OpenClaw 会保留审批提示和后续回复的话题。执行审批默认在 30 分钟后过期。

    内联审批按钮还需要 `channels.telegram.capabilities.inlineButtons` 来允许目标表面（`dm`、`group` 或 `all`）。带有 `plugin:` 前缀的审批 ID 通过插件审批解析；其他则首先通过执行审批解析。

    参见 [执行审批](/en/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到投递或提供商错误时，Telegram 可以回复错误文本或将其抑制。两个配置键控制此行为：

| 键                                 | 值            | 默认值 | 描述                                                                                     |
| ----------------------------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`，`silent` | `reply` | `reply` 会向聊天发送友好的错误消息。`silent` 会完全抑制错误回复。 |
| `channels.telegram.errorCooldownMs` | 数字（毫秒）       | `60000` | 向同一聊天的错误回复之间的最短时间。防止故障期间错误刷屏。        |

支持按账户、按群组和按主题的覆盖（继承方式与其他 Telegram 配置键相同）。

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
````

## 故障排除

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见。
      - BotFather: `/setprivacy` -> Disable
      - 然后将机器人从群组中移除并重新添加
    - 当配置期望未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法探测成员身份。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 当存在 `channels.telegram.groups` 时，群组必须被列出（或包含 `"*"`）
    - 验证机器人在群组中的成员身份
    - 查看日志：`openclaw logs --follow` 以了解跳过原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略是 `open`，命令授权仍然适用
    - 带有 `BOT_COMMANDS_TOO_MUCH` 的 `setMyCommands failed` 意味着原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - `deleteMyCommands` / `setMyCommands` 启动调用和 `sendChatAction` 输入调用是受限的，并在请求超时时通过 Telegram 的传输回退重试一次。持续的网络/获取错误通常表明对 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="启动报告未授权令牌">

    - `getMe returned 401` 是针对配置的机器人令牌的 Telegram 身份验证失败。
    - 在 BotFather 中重新复制或重新生成机器人令牌，然后为默认账户更新 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 启动期间的 `deleteWebhook 401 Unauthorized` 也是身份验证失败；将其视为“不存在 webhook”只会将同样的坏令牌失败推迟到后续的 API 调用。

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 如果 AbortSignal 类型不匹配，可能会触发立即中止行为。
    - 某些主机优先将 `api.telegram.org`TelegramAPI 解析为 IPv6；损坏的 IPv6 出站可能导致间歇性的 Telegram API 故障。
    - 如果日志包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`OpenClawOpenClaw，OpenClaw 现在会将这些作为可恢复的网络错误进行重试。
    - 在轮询启动期间，OpenClaw 会为 grammY 复用成功的启动 `getMe`grammY 探测，因此运行器在第一个 `getUpdates` 之前不需要进行第二次 `getMe`。
    - 如果 `deleteWebhook`OpenClaw 在轮询启动期间因瞬态网络错误而失败，OpenClaw 将继续进入长轮询，而不是进行另一次轮询前控制平面调用。仍处于活动状态的 webhook 会表现为 `getUpdates`OpenClawTelegramTelegram 冲突；OpenClaw 随后将重建 Telegram 传输并重试 webhook 清理。
    - 如果 Telegram 套接字以短时间的固定周期循环，请检查 `channels.telegram.timeoutSeconds` 是否过低；Bot 客户端会将配置值限制在出站和 `getUpdates` 请求守卫之下，但在旧版本中，如果此设置低于这些守卫值，可能会导致每次轮询或回复都中止。
    - 如果日志包含 `Polling stall detected`OpenClawTelegram，OpenClaw 默认会在 120 秒内未完成长轮询活动时重启轮询并重建 Telegram 传输。
    - `openclaw channels status --probe` 和 `openclaw doctor` 会在以下情况下发出警告：正在运行的轮询账户在启动宽限期后未完成 `getUpdates`，正在运行的 webhook 账户在启动宽限期后未完成 `setWebhook`，或者最后一次成功的轮询传输活动已过期。
    - 仅当长时间运行的 `getUpdates` 调用正常，但您的主机仍报告错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。持续的停滞通常指向主机与 `api.telegram.org`TelegramAPI 之间的代理、DNS、IPv6 或 TLS 出站问题。
    - Telegram 也尊重 Bot API 传输的进程代理环境变量，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍然可以绕过 `api.telegram.org`OpenClaw。
    - 如果 OpenClaw 托管代理通过 `OPENCLAW_PROXY_URL`TelegramAPITelegramAPI 为服务环境配置，且不存在标准代理环境变量，Telegram 也会使用该 URL 进行 Bot API 传输。
    - 在具有不稳定直接出站/TLS 的 VPS 主机上，通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`WSL2Telegram（WSL2 除外）。Telegram DNS 结果顺序遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然后是 `channels.telegram.network.dnsResultOrder`，接着是进程默认值（如 `NODE_OPTIONS=--dns-result-order=ipv4first`）；如果都不适用，Node 22+ 将回退到 `ipv4first`WSL2。
    - 如果您的主机是 WSL2 或明确在仅使用 IPv4 的环境下工作效果更好，请强制选择地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准范围内的地址（`198.18.0.0/15`Telegram）默认已允许
      用于 Telegram 媒体下载。如果在媒体下载期间，受信任的 fake-IP
      或透明代理将 `api.telegram.org`Telegram 重写为其他
      私有/内部/专用地址，您可以选择加入
      Telegram 专用绕过：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每个账户也可以在 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`Telegram 处使用相同的选项。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`Telegram，请首先
      关闭此危险标志。Telegram 媒体默认已允许 RFC 2544
      基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork`TelegramTelegram 会削弱 Telegram
      媒体 SSRF 保护。仅当它们在 RFC 2544 基准
      范围之外合成私有或专用地址时，才将其用于受信任的运营方控制的代理
      环境，例如 Clash、Mihomo 或 Surge fake-IP 路由。
      对于正常的公共互联网 Telegram 访问，请将其关闭。
    </Warning>

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

更多帮助：[Channel 故障排除](/zh/channels/troubleshooting)。

## 配置参考

主要参考：[配置参考 - Telegram](/zh/gateway/config-channels#telegram)。

<Accordion title="重要的 Telegram 字段">

- 启动/身份验证： `enabled`， `botToken`， `tokenFile`， `accounts.*`（ `tokenFile` 必须指向常规文件；不接受符号链接）
- 访问控制： `dmPolicy`， `allowFrom`， `groupPolicy`， `groupAllowFrom`， `groups`， `groups.*.topics.*`， 顶层 `bindings[]`（ `type: "acp"`）
- 执行审批： `execApprovals`， `accounts.*.execApprovals`
- 命令/菜单： `commands.native`， `commands.nativeSkills`， `customCommands`
- 线程/回复： `replyToMode`， `dm.threadReplies`， `direct.*.threadReplies`
- 流式传输： `streaming`（预览）， `streaming.preview.toolProgress`， `blockStreaming`
- 格式化/投递： `textChunkLimit`， `chunkMode`， `linkPreview`， `responsePrefix`
- 媒体/网络： `mediaMaxMb`， `mediaGroupFlushMs`， `timeoutSeconds`， `pollingStallThresholdMs`， `retry`， `network.autoSelectFamily`， `network.dangerouslyAllowPrivateNetwork`， `proxy`
- 自定义 API 根： `apiRoot`（仅限 Bot API 根；请勿包含 `/bot<TOKEN>`）
- Webhook： `webhookUrl`， `webhookSecret`， `webhookPath`， `webhookHost`
- 动作/能力： `capabilities.inlineButtons`， `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应： `reactionNotifications`， `reactionLevel`
- 错误： `errorPolicy`， `errorCooldownMs`
- 写入/历史记录： `configWrites`， `historyLimit`， `dmHistoryLimit`， `dms.*.historyLimit`

</Accordion>

<Note>多账号优先级：当配置了两个或更多账号 ID 时，设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明确默认路由。否则 OpenClaw 将回退到第一个标准化的账号 ID 并且 `openclaw doctor` 会发出警告。命名账号继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不继承 `accounts.default.*` 值。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    将 Telegram 用户与网关配对。
  </Card>
  <Card title="Groups" icon="users" href="/zh/channels/groups">
    群组和主题允许列表的行为。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh/channels/channel-routing">
    将传入消息路由到代理。
  </Card>
  <Card title="Security" icon="shield" href="/zh/gateway/security">
    威胁模型和加固。
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/zh/concepts/multi-agent">
    将群组和主题映射到代理。
  </Card>
  <Card title="Troubleshooting" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断。
  </Card>
</CardGroup>
