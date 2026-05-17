---
summary: "TelegramTelegram bot 支持状态、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "TelegramTelegram"
---

通过 grammY 支持机器人私信和群组的生产环境使用。长轮询是默认模式；Webhook 模式是可选的。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing" Telegram>
    Telegram 的默认私信策略为配对。
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
    打开 Telegram 并与 **@BotFather** 对话（确认句柄确切为 `@BotFather`）。

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

    Env 回退：`TELEGRAM_BOT_TOKEN=...`Telegram（仅默认账户）。
    Telegram **不**使用 `openclaw channels login telegram`；请在配置/环境变量中配置令牌，然后启动网关。

  </Step>

  <Step title="Start gateway and approve first 私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码将在 1 小时后过期。

  </Step>

  <Step title="Add the bot to a group"Telegram>
    将 Bot 添加到您的群组，然后获取群组访问所需的两个 ID：

    - 您的 Telegram 用户 ID，用于 `allowFrom` / `groupAllowFrom`Telegram
    - Telegram 群组聊天 ID，用作 `channels.telegram.groups` 下的键

    首次设置时，请从 `openclaw logs --follow`API、转发 ID Bot 或 Bot API `getUpdates` 获取群组聊天 ID。允许群组后，`/whoami@<bot_username>`Telegram 可以确认用户和群组 ID。

    以 `-100` 开头的负数 Telegram 超级群组 ID 是群组聊天 ID。请将它们放在 `channels.telegram.groups` 下，而不是 `groupAllowFrom` 下。

  </Step>
</Steps>

<Note>Token 解析顺序是感知账户的。实际上，配置值优先于环境变量回退，且 `TELEGRAM_BOT_TOKEN` 仅适用于默认账户。</Note>

## Telegram 侧设置

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility"Telegram>
    Telegram Bot 默认处于 **隐私模式**，这限制了它们接收到的群组消息。

    如果 Bot 必须查看所有群组消息，请执行以下任一操作：

    - 通过 `/setprivacy`Telegram 禁用隐私模式，或
    - 将 Bot 设为群组管理员。

    切换隐私模式时，请在每个群组中移除并重新添加 Bot，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="Group permissions"Telegram>
    管理员状态在 Telegram 群组设置中控制。

    管理员 Bot 会接收所有群组消息，这对于始终开启的群组行为很有用。

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` 以允许/禁止群组添加
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

    `dmPolicy: "open"` 配合 `allowFrom: ["*"]`Telegram 允许任何发现或猜到机器人用户名的 Telegram 账户控制机器人。仅将其用于工具受到严格限制的故意公开机器人；单一所有者机器人应配合数字用户 ID 使用 `allowlist`。

    `channels.telegram.allowFrom`Telegram 接受数字 Telegram 用户 ID。接受并标准化 `telegram:` / `tg:` 前缀。
    在多账户配置中，限制性的顶级 `channels.telegram.allowFrom` 被视为安全边界：除非合并后的有效账户白名单仍包含显式通配符，否则账户级别的 `allowFrom: ["*"]` 条目不会使该账户公开。
    带有空 `allowFrom` 的 `dmPolicy: "allowlist"` 会阻止所有私信，并且会被配置验证拒绝。
    设置仅要求提供数字用户 ID。
    如果您已升级且配置包含 `@username` 白名单条目，请运行 `openclaw doctor --fix`Telegram 来解析它们（尽力而为；需要 Telegram 机器人令牌）。
    如果您之前依赖配对存储白名单文件，`openclaw doctor --fix` 可以在白名单流程中将条目恢复到 `channels.telegram.allowFrom`（例如，当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单一所有者机器人，建议配合显式数字 `allowFrom` ID 使用 `dmPolicy: "allowlist"`，以使访问策略在配置中持久化（而不是依赖之前的配对批准）。

    常见误解：私信配对批准并不意味着“此发送者到处都已获得授权”。
    配对授予私信访问权限。如果尚不存在命令所有者，则第一个批准的配对也会设置 `commands.ownerAllowFrom`Telegram，以便仅限所有者的命令和 exec 批准具有显式操作员账户。
    群组发送者授权仍然来自显式配置白名单。
    如果您希望“获得一次授权，私聊和群组命令均可用”，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom` 中；对于仅限所有者的命令，请确保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`Telegram。

    ### 查找您的 Telegram 用户 ID

    更安全的方法（无第三方机器人）：

    1. 给您的机器人发私信。
    2. 运行 `openclaw logs --follow`。
    3. 阅读 `from.id`API。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（私密性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="Group policy and allowlists">
    两项控制协同生效：

    1. **允许哪些群组** (`channels.telegram.groups`)
       - 未配置 `groups`：
         - 开启 `groupPolicy: "open"`：任何群组都可以通过群组 ID 检查
         - 使用 `groupPolicy: "allowlist"`（默认）：群组会被阻止，直到您添加 `groups` 条目（或 `"*"`）
       - 已配置 `groups`：作为允许列表（明确的 ID 或 `"*"`）

    2. **允许哪些发送者在群组中** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发送者筛选。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被规范化）。
    请勿将 Telegram 群组或超级群组聊天 ID 放入 `groupAllowFrom` 中。负数聊天 ID 应归入 `channels.telegram.groups`。
    非数字条目在发送者授权时会被忽略。
    安全边界 (`2026.2.25+`)：群组发送者身份验证**不**继承私信配对存储中的批准。
    配对仅适用于私信。对于群组，请设置 `groupAllowFrom` 或每个群组/每个话题的 `allowFrom`。
    如果未设置 `groupAllowFrom`，Telegram 将回退到配置 `allowFrom`，而不是配对存储。
    适用于单一所有者机器人的实用模式：在 `channels.telegram.allowFrom` 中设置您的用户 ID，保留 `groupAllowFrom` 为未设置，并在 `channels.telegram.groups` 中允许目标群组。
    运行时说明：如果 `channels.telegram` 完全缺失，除非显式设置 `channels.defaults.groupPolicy`，否则运行时默认为故障封闭 `groupPolicy="allowlist"`。

    仅限所有者的群组设置：

```json5
{
  channels: {
    telegram: {
      enabled: true,
      dmPolicy: "pairing",
      allowFrom: ["<YOUR_TELEGRAM_USER_ID>"],
      groupPolicy: "allowlist",
      groups: {
        "<GROUP_CHAT_ID>": {
          requireMention: true,
        },
      },
    },
  },
}
```

    在群组中使用 `@<bot_username> ping` 进行测试。普通群组消息在 `requireMention: true` 时不会触发机器人。

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

    示例：仅允许一个特定群组中的特定用户：

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
      - 当您想限制允许群组内的人员可以触发机器人时，将 Telegram 用户 ID（如 `8734062810`）放在 `groupAllowFrom` 下。
      - 仅当您希望允许群组的任何成员都能与机器人交谈时，才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab title="提及行为">
    群组回复默认需要提及。

    提及可以来自：

    - 原生 `@botusername` 提及，或
    - 以下内容中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    会话级命令开关：

    - `/activation always`
    - `/activation mention`

    这些仅更新会话状态。如需持久化请使用配置。

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
    - 或从 `openclaw logs --follow`API 中读取 `chat.id`
    - 或检查 Bot API `getUpdates`
    - 群组被允许后，如果启用了原生命令，请运行 `/whoami@<bot_username>`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 归网关进程所有。
- 路由是确定性的：Telegram 入站回复会发回 Telegram（模型不选择渠道）。
- 传入消息会规范化为共享的渠道信封，其中包含回复元数据、媒体占位符以及网关观察到的 Telegram 回复的持久化回复链上下文。
- 群组会话按群组 ID 隔离。论坛主题会附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`OpenClaw；OpenClaw 在回复时会保留主题 ID，但默认情况下将私信保持在扁平会话中。当您有意想要私信主题会话隔离时，请配置 `channels.telegram.dm.threadReplies: "inbound"`、`channels.telegram.direct.<chatId>.threadReplies: "inbound"`、`requireTopic: true` 或匹配的主题配置。
- 长轮询使用带有逐聊天/逐线程排序的 grammY 运行器。整体运行器接收器并发性使用 grammY`agents.defaults.maxConcurrent`。
- 长轮询在每个网关进程内部受到保护，因此一次只有一个活动轮询器可以使用机器人令牌。如果您仍然看到 `getUpdates`OpenClaw 409 冲突，则另一个 OpenClaw 网关、脚本或外部轮询器可能正在使用相同的令牌。
- 长轮询看门狗重启触发器默认在 120 秒内没有完成 `getUpdates` 活跃检查时启动。仅当您的部署在长时间运行的工作期间仍然出现错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围从 `30000` 到 `600000`；支持逐账户覆盖。
- Telegram Bot API 不支持已读回执（TelegramAPI`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 为工具进度保留一个可编辑的状态草稿，完成后将其清除，并将最终答案作为普通消息发送
    - `streaming.preview.toolProgress` 控制工具/进度更新是否重用同一条已编辑的预览消息（当预览流式传输处于活动状态时，默认为 `true`）
    - `streaming.preview.commandText` 控制这些工具进度行内的命令/执行详细信息：`raw`（默认，保留已发布的行为）或 `status`（仅工具标签）
    - 会检测旧版 `channels.telegram.streamMode` 和布尔 `streaming` 值；运行 `openclaw doctor --fix` 将其迁移到 `channels.telegram.streaming.mode`

    工具进度预览更新是在工具运行时显示的简短状态行，例如命令执行、文件读取、计划更新或补丁摘要。Telegram 默认保持这些更新处于启用状态，以匹配 OpenClaw `v2026.4.22` 及更高版本的已发布行为。若要保留答案文本的已编辑预览但隐藏工具进度行，请设置：

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

    若要保持工具进度可见但隐藏命令/执行文本，请设置：

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

    当您希望显示工具进度而不将最终答案编辑到同一条消息中时，请使用 `progress` 模式。将命令文本策略放在 `streaming.progress` 下：

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

    仅当您希望仅发送最终结果时才使用 `streaming.mode: "off"`：Telegram 预览编辑被禁用，并且通用工具/进度闲聊将被抑制，而不是作为独立状态消息发送。批准提示、媒体负载和错误仍通过正常的最终结果传递路由。当您只想保留答案预览编辑而隐藏工具进度状态行时，请使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 选定引用回复是例外情况。当 `replyToMode` 为 `"first"`、`"all"` 或 `"batched"` 且传入消息包含选定引用文本时，OpenClaw 会通过 Telegram 的原生引用回复路径发送最终答案，而不是编辑答案预览，因此 `streaming.preview.toolProgress` 无法显示该轮次的简短状态行。没有选定引用文本的当前消息回复仍保持预览流式传输。当工具进度的可见性比原生引用回复更重要时，设置 `replyToMode: "off"`，或设置 `streaming.preview.toolProgress: false` 以接受此权衡。
    </Note>

    对于纯文本回复：

    - 简短的私信/群组/话题预览：OpenClaw 保持同一条预览消息并就地执行最终编辑
    - 分割成多条 Telegram 消息的长文本最终结果，会在可能的情况下重用现有预览作为第一个最终块，然后仅发送剩余的块
    - 进度模式的最终结果会清除状态草稿，并使用正常的最终结果传递，而不是将草稿编辑为答案
    - 如果在确认完成文本之前最终编辑失败，OpenClaw 将使用正常的最终结果传递并清理过时的预览

    对于复杂回复（例如媒体负载），OpenClaw 将回退到正常的最终结果传递，然后清理预览消息。

    预览流式传输与块流式传输是分开的。当为 Telegram 显式启用块流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

    Telegram 专用推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 推理预览在最终结果传递后被删除；当推理应保持可见时，请使用 `/reasoning on`
    - 最终答案在发送时不包含推理文本

  </Accordion>

  <Accordion title="格式设置与 HTML 回退"Telegram>
    出站文本使用 Telegram `parse_mode: "HTML"`TelegramTelegramTelegramOpenClaw。

    - 类似 Markdown 的文本会被渲染为 Telegram 安全的 HTML。
    - 支持的 Telegram HTML 标签会被保留；不支持的 HTML 会被转义。
    - 如果 Telegram 拒绝解析后的 HTML，OpenClaw 会重试为纯文本。

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

    - 名称会被标准化（去除开头的 `/`，转为小写）
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复项会被跳过并记录

    注意事项：

    - 自定义命令仅作为菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在被输入时仍然可以工作

    如果禁用了原生命令，内置命令将被移除。如果已配置，自定义/插件命令仍可能注册。

    常见设置失败：

    - 出现 `setMyCommands failed` 和 `BOT_COMMANDS_TOO_MUCH` 意味着 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - `deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失败并显示 `404: Not Found`，而直接的 Bot API curl 命令有效，可能是因为 `channels.telegram.apiRoot` 被设置为完整的 `/bot<TOKEN>` 端点。`apiRoot` 必须仅是 Bot API 根目录，而 `openclaw doctor --fix` 会移除意外添加的尾部 `/bot<TOKEN>`。
    - `getMe returned 401` 意味着 Telegram 拒绝了配置的 bot 令牌。请使用当前的 BotFather 令牌更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 会在轮询前停止，因此这不会作为 webhook 清理失败被报告。
    - 出现 `setMyCommands failed` 并伴有网络/获取错误，通常意味着到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    当安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 将代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理请求（包括角色/范围）
    4. 批准请求：
       - `/pair approve <requestId>` 用于明确批准
       - `/pair approve` 当只有一个待处理请求时
       - `/pair approve latest` 用于最近的一个

    设置代码携带一个短期引导令牌。内置引导移交将主节点令牌保留在 `scopes: []`；任何移交的操作员令牌都受限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。引导范围检查带有角色前缀，因此操作员允许列表仅满足操作员请求；非操作员角色仍需要在其自己的角色前缀下的范围。

    如果设备使用更改的身份验证详细信息（例如角色/范围/公钥）重试，之前的待处理请求将被取代，新请求使用不同的 `requestId`。在批准之前重新运行 `/pair pending`。

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

    回调点击会作为文本传递给 Agent：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="TelegramTelegram 消息操作（适用于代理和自动化）"Telegram>
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`)

    渠道消息操作提供符合人体工程学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    闸控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认: 禁用)

    注意: `edit` 和 `topic-create` 目前默认已启用，并且没有单独的 `channels.telegram.actions.*` 开关。
    运行时发送使用活动的配置/机密快照（启动/重新加载），因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    反应移除语义: [/tools/reactions](/zh/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram 支持在生成的输出中使用显式回复线程标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    当启用回复线程且原始 Telegram 文本或字幕可用时，OpenClaw 会自动包含原生 Telegram 引用摘录。Telegram 将原生引用文本限制为 1024 个 UTF-16 代码单元，因此较长的消息会从头开始引用，如果 Telegram 拒绝引用，则会回退到普通回复。

    注意：`off` 会禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍然有效。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    论坛超级群组：

    - 话题会话密钥附加 `:topic:<threadId>`
    - 回复和输入状态以话题串为目标
    - 话题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    常规话题 (`threadId=1`) 特殊情况：

    - 消息发送省略 `message_thread_id`Telegram（Telegram 拒绝 `sendMessage(...thread_id=1)`）
    - 输入状态操作仍包含 `message_thread_id`

    话题继承：话题条目继承群组设置，除非被覆盖（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 仅限话题，不继承群组默认值。

    **按话题的代理路由**：每个话题可以通过在话题配置中设置 `agentId` 来路由到不同的代理。这为每个话题提供了自己独立的工作区、内存和会话。例如：

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

    然后每个话题都有自己的会话密钥：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 话题绑定**：论坛话题可以通过顶层类型的 ACP 绑定（`bindings[]` 配合 `type: "acp"` 和 `match.channel: "telegram"`、`peer.kind: "group"`，以及类似 `-1001234567890:topic:42` 的话题限定 ID）来固定 ACP 约束会话。目前范围限于群组/超级群组中的论坛话题。参见 [ACP Agents](/zh/tools/acp-agents)。

    **从聊天发起的线程绑定 ACP 生成**：`/acp spawn <agent> --thread here|auto`OpenClaw 将当前话题绑定到新的 ACP 会话；后续回复直接路由到那里。OpenClaw 将生成确认消息固定在话题内。要求 `channels.telegram.threadBindings.spawnSessions` 保持启用状态（默认：`true`）。

    模板上下文暴露 `MessageThreadId` 和 `IsForum`。带有 `message_thread_id` 的私信会话默认在扁平会话上保留私信路由和回复元数据；它们仅在配置了 `threadReplies: "inbound"`、`threadReplies: "always"`、`requireTopic: true` 或匹配的话题配置时才使用线程感知的会话密钥。对帐户默认值使用顶层 `channels.telegram.dm.threadReplies`，或对单个私信使用 `direct.<chatId>.threadReplies`。

  </Accordion>

  <Accordion title="Audio, video, and stickers"Telegram>
    ### 音频消息

    Telegram 区分语音笔记和音频文件。

    - 默认：音频文件行为
    - 在 agent 回复中标记 `[[audio_as_voice]]` 以强制发送语音笔记
    - 入站语音笔记的转录在 agent 上下文中被构造成机器生成的、不受信任的文本；提及检测仍然使用原始转录，因此提及门控的语音消息可以继续工作。

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
````

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

  <Accordion title="Reaction notifications"Telegram>
    Telegram 表情回应以 `message_reaction`OpenClaw 更新的形式到达（与消息负载分开）。

    启用后，OpenClaw 会将如下系统事件加入队列：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`：`off | own | all`（默认：`own`）
    - `channels.telegram.reactionLevel`：`off | ack | minimal | extensive`（默认：`minimal`）

    注意事项：

    - `own`Telegram 表示仅针对用户对机器人发送的消息做出的回应（通过已发送消息缓存尽力而为）。
    - 表情回应事件仍遵循 Telegram 访问控制（`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`Telegram）；未授权的发送者将被丢弃。
    - Telegram 不在表情回应更新中提供主题 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组常规主题会话（`:topic:1`），而非确切来源主题

    轮询/Webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 正在处理传入消息时，`ackReaction`OpenClaw 会发送一个确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退（`agents.list[].identity.emoji`Telegram，否则为 "👀"）

    注意事项：

    - Telegram 期望使用 unicode 表情符号（例如 "👀"）。
    - 使用 `""` 可为渠道或账户禁用该表情回应。

  </Accordion>

  <Accordion title="Telegram来自 Telegram 事件和命令的配置写入">
    默认情况下启用通道配置写入 (`configWrites !== false`Telegram)。

    Telegram 触发的写入包括：

    - 用于更新 `channels.telegram.groups` 的群组迁移事件 (`migrate_to_chat_id`)
    - `/config set` 和 `/config unset` （需要启用命令）

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
    默认为长轮询。如需使用 Webhook 模式，请设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选 `webhookPath`、`webhookHost`、`webhookPort` （默认值 `/telegram-webhook`、`127.0.0.1`、`8787`OpenClaw）。

    在长轮询模式下，OpenClaw 仅在更新成功调度后才持久化其重启标记。如果处理程序失败，该更新在同一进程中仍可重试，且不会被标记为已完成以进行重启去重。

    本地监听器绑定到 `127.0.0.1:8787`。对于外部入口，可以在本地端口前放置反向代理，或者有意设置 `webhookHost: "0.0.0.0"`Telegram。

    Webhook 模式在向 Telegram 返回 `200`TelegramOpenClawTelegram 之前，会验证请求守卫、Telegram 密钥令牌和 JSON 正文。
    然后，OpenClaw 通过长轮询使用的相同每聊天/每主题机器人通道异步处理更新，因此缓慢的代理回合不会占用 Telegram 的交付确认（ACK）。

  </Accordion>

  <Accordion title="CLI限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度分割之前优先考虑段落边界（空行）。
    - `channels.telegram.mediaMaxMb`Telegram（默认 100）限制入站和出站 Telegram 媒体大小。
    - `channels.telegram.mediaGroupFlushMs`TelegramOpenClaw（默认 500）控制在 OpenClaw 将 Telegram 专辑/媒体组作为一条入站消息分发之前的缓冲时间。如果专辑部分到达较晚，请增加此值；若要减少专辑回复延迟，则减小此值。
    - `channels.telegram.timeoutSeconds`TelegramAPIgrammYgrammYOpenClaw 覆盖 Telegram API 客户端超时（如果未设置，则应用 grammY 默认值）。Bot 客户端将配置的值限制在 60 秒出站文本/输入请求保护之下，因此 grammY 不会在 OpenClaw 的传输保护和回退运行之前中止可见回复的传递。长轮询仍使用 45 秒的 `getUpdates` 请求保护，因此空闲轮询不会被无限期放弃。
    - `channels.telegram.pollingStallThresholdMs` 默认为 `120000`；仅在出现误报的轮询停滞重启时才在 `30000` 和 `600000` 之间调整。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0`Telegram 禁用此功能。
    - 当网关已观察到父消息时，回复/引用/转发的补充上下文会被归一化为一个选定的对话上下文窗口；观察到的消息缓存与会话存储一起持久化。Telegram 在更新中仅包含一个浅层的 `reply_to_message`TelegramTelegram，因此早于缓存的链条受限于 Telegram 当前的更新负载。
    - Telegram 允许列表主要限制谁可以触发代理，而不是完整的补充上下文编辑边界。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry`TelegramCLIAPITelegramCLI 配置适用于 Telegram 发送助手（CLI/工具/操作），用于可恢复的出站 API 错误。入站最终回复传递也对 Telegram 预连接失败使用有界的安全发送重试，但它不会重试可能导致重复可见消息的模棱两可的发送后网络信封。

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

    Telegram 专用的轮询标志：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用于论坛主题（或使用 `:topic:`Telegram 目标）

    Telegram 发送还支持：

    - 当 `channels.telegram.capabilities.inlineButtons` 允许时，使用带有 `buttons` 块的 `--presentation` 用于内联键盘
    - `--pin` 或 `--delivery '{"pin":true}'` 请求固定传递，当机器人可以在该聊天中固定消息时
    - `--force-document` 将出站图像、GIF 和视频作为文档发送，而不是压缩照片、动画媒体或视频上传

    操作门控：

    - `channels.telegram.actions.sendMessage=false`Telegram 禁用出站 Telegram 消息，包括轮询
    - `channels.telegram.actions.poll=false`Telegram 禁用 Telegram 轮询创建，同时保留常规发送功能

  </Accordion>

  <Accordion title="Telegram在 Telegram 中进行执行批准"TelegramTelegram>
    Telegram 支持在批准人的私信中进行执行批准，并可选择在原始聊天或话题中发布提示。批准人必须是 Telegram 数字用户 ID。

    配置路径：

    - `channels.telegram.execApprovals.enabled` (当至少有一个批准人是可解析时自动启用)
    - `channels.telegram.execApprovals.approvers` (回退到来自 `commands.ownerAllowFrom` 的数字所有者 ID)
    - `channels.telegram.execApprovals.target`: `dm` (默认) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`, `groupAllowFrom`, 和 `defaultTo` 控制谁可以与机器人对话及其发送普通回复的位置。它们不会使某人成为执行批准人。当尚不存在命令所有者时，第一个批准的私信配对会引导 `commands.ownerAllowFrom`，因此单一所有者设置仍然有效，无需在 `execApprovals.approvers` 下重复 ID。

    频道投递会在聊天中显示命令文本；请仅在受信任的群组/话题中启用 `channel` 或 `both`OpenClaw。当提示落入论坛话题时，OpenClaw 会为批准提示及后续操作保留该话题。执行批准默认在 30 分钟后过期。

    内联批准按钮还需要 `channels.telegram.capabilities.inlineButtons` 来允许目标表面 (`dm`, `group`, 或 `all`)。带有 `plugin:` 前缀的批准 ID 通过插件批准解析；其他的则首先通过执行批准解析。

    参见 [执行批准](/en/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到投递或提供商错误时，Telegram 可以回复错误文本或将其抑制。两个配置键控制此行为：

| 键                                 | 值            | 默认值 | 描述                                                                                     |
| ----------------------------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 向聊天发送友好的错误消息。`silent` 完全抑制错误回复。 |
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

    - 如果设置了 `requireMention=false`Telegram，Telegram 隐私模式必须允许完全可见。
      - BotFather： `/setprivacy` -> Disable
      - 然后从群组中移除并重新添加机器人
    - 当配置期望未被提及的群组消息时， `openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法探测成员身份。
    - 快速会话测试： `/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 当存在 `channels.telegram.groups` 时，群组必须被列出（或包含 `"*"`）
    - 验证机器人在群组中的成员身份
    - 查看日志： `openclaw logs --follow` 了解跳过原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略为 `open`，命令授权仍然适用
    - 出现 `setMyCommands failed` 且带有 `BOT_COMMANDS_TOO_MUCH` 意味着原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - `deleteMyCommands` / `setMyCommands` 启动调用和 `sendChatAction`Telegram 键入调用有界限限制，并在请求超时时通过 Telegram 的传输回退机制重试一次。持续的网络/fetch 错误通常表明到 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401`Telegram 是已配置 bot token 的 Telegram 身份验证失败。
    - 在 BotFather 中重新复制或重新生成 bot token，然后更新默认帐户的 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 启动期间的 `deleteWebhook 401 Unauthorized`API 也是身份验证失败；将其视为“不存在 webhook”只会将相同的 token 错误推迟到后续 API 调用中。

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 如果 AbortSignal 类型不匹配，可能会触发立即中止行为。
    - 某些主机优先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站可能会导致间歇性的 Telegram API 故障。
    - 如果日志中包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将这些作为可恢复的网络错误进行重试。
    - 在轮询启动期间，OpenClaw 会重用针对 grammY 的成功启动 `getMe` 探测，因此运行程序在第一次 `getUpdates` 之前不需要第二次 `getMe`。
    - 如果 `deleteWebhook` 在轮询启动期间因瞬时网络错误而失败，OpenClaw 将继续进入长轮询，而不是进行另一次轮询前控制面调用。仍然活跃的 webhook 会表现为 `getUpdates` 冲突；随后 OpenClaw 会重建 Telegram 传输并重试 webhook 清理。
    - 如果 Telegram 套接字以短时间固定节奏回收，请检查 `channels.telegram.timeoutSeconds` 是否过低；Bot 客户端会将配置值限制在出站和 `getUpdates` 请求守卫之下，但在旧版本中，如果此值设置低于这些守卫，可能会导致每次轮询或回复中止。
    - 如果日志中包含 `Polling stall detected`，默认情况下，OpenClaw 会在 120 秒内未完成长轮询活动后重启轮询并重建 Telegram 传输。
    - `openclaw channels status --probe` 和 `openclaw doctor` 会在以下情况下发出警告：正在运行的轮询帐户在启动宽限期后未完成 `getUpdates`，正在运行的 webhook 帐户在启动宽限期后未完成 `setWebhook`，或者最后一次成功的轮询传输活动已过期。
    - 仅当长时间运行的 `getUpdates` 调用健康但您的主机仍报告错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。持续的停滞通常指向主机与 `api.telegram.org` 之间的代理、DNS、IPv6 或 TLS 出站问题。
    - Telegram 也尊重 Bot API 传输的进程代理环境变量，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍可绕过 `api.telegram.org`。
    - 如果 OpenClaw 托管代理通过 `OPENCLAW_PROXY_URL` 针对服务环境进行配置且不存在标准代理环境变量，Telegram 也会使用该 URL 进行 Bot API 传输。
    - 在直接出站/TLS 不稳定的 VPS 主机上，请通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`（WSL2 除外）。Telegram DNS 结果顺序遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然后是 `channels.telegram.network.dnsResultOrder`，接着是进程默认值（如 `NODE_OPTIONS=--dns-result-order=ipv4first`）；如果均不适用，Node 22+ 将回退到 `ipv4first`。
    - 如果您的主机是 WSL2 或明确在仅 IPv4 行为下效果更好，请强制选择地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准范围内的答案（`198.18.0.0/15`）默认已允许
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

    - 每个帐户都可以在
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 处使用相同的选择加入功能。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`，请首先关闭
      危险标志。Telegram 媒体默认已允许 RFC 2544
      基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram
      媒体 SSRF 保护。仅当它们合成 RFC 2544 基准
      范围之外的私有或特殊用途答案时，才将其用于受信任的运营商控制代理环境（如 Clash、Mihomo 或 Surge fake-IP 路由）。
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

更多帮助：[Channel 故障排除](/zh/channels/troubleshooting)。

## 配置参考

主要参考：[Configuration reference - Telegram](/zh/gateway/config-channels#telegram)。

<Accordion title="高信号 Telegram 字段">

- 启动/认证：`enabled`、`botToken`、`tokenFile`、`accounts.*`（`tokenFile` 必须指向常规文件；拒绝符号链接）
- 访问控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`、`groups.*.topics.*`、顶级 `bindings[]`（`type: "acp"`）
- 执行批准：`execApprovals`、`accounts.*.execApprovals`
- 命令/菜单：`commands.native`、`commands.nativeSkills`、`customCommands`
- 线程/回复：`replyToMode`、`dm.threadReplies`、`direct.*.threadReplies`
- 流式传输：`streaming`（预览）、`streaming.preview.toolProgress`、`blockStreaming`
- 格式化/投递：`textChunkLimit`、`chunkMode`、`linkPreview`、`responsePrefix`
- 媒体/网络：`mediaMaxMb`、`mediaGroupFlushMs`、`timeoutSeconds`、`pollingStallThresholdMs`、`retry`、`network.autoSelectFamily`、`network.dangerouslyAllowPrivateNetwork`、`proxy`
- 自定义 API 根地址：`apiRoot`（仅限 Bot API 根地址；请勿包含 `/bot<TOKEN>`）
- Webhook：`webhookUrl`、`webhookSecret`、`webhookPath`、`webhookHost`
- 操作/能力：`capabilities.inlineButtons`、`actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- 反应：`reactionNotifications`、`reactionLevel`
- 错误：`errorPolicy`、`errorCooldownMs`
- 写入/历史：`configWrites`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`

</Accordion>

<Note>多账号优先级：当配置了两个或更多账号 ID 时，请设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`OpenClaw）以明确默认路由。否则 OpenClaw 将回退到第一个标准化的账号 ID，并且 `openclaw doctor` 会发出警告。命名账号继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不继承 `accounts.default.*` 值。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing" Telegram>
    将 Telegram 用户与网关配对。
  </Card>
  <Card title="Groups" icon="users" href="/zh/channels/groups">
    群组和主题白名单行为。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh/channels/channel-routing">
    将入站消息路由到代理。
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
