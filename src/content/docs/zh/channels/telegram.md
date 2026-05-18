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
    打开 Telegram 并与 **@BotFather** 聊天（确认句柄确认为 `@BotFather`）。

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
    Telegram **不**使用 `openclaw channels login telegram`；在配置/环境变量中配置令牌，然后启动网关。

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
    将机器人添加到您的群组，然后获取群组访问所需的两个 ID：

    - 您的 Telegram 用户 ID，用于 `allowFrom` / `groupAllowFrom`Telegram 中
    - Telegram 群组聊天 ID，用作 `channels.telegram.groups` 下的键

    对于首次设置，请从 `openclaw logs --follow`API、转发 ID 机器人或 Bot API `getUpdates` 获取群组聊天 ID。允许群组后，`/whoami@<bot_username>`Telegram 可以确认用户和群组 ID。

    以 `-100` 开头的负数 Telegram 超级群组 ID 是群组聊天 ID。请将它们放在 `channels.telegram.groups` 下，而不是 `groupAllowFrom` 下。

  </Step>
</Steps>

<Note>Token 解析顺序是感知账户的。实际上，配置值优先于环境变量回退，且 `TELEGRAM_BOT_TOKEN`OpenClawTelegram 仅适用于默认账户。 成功启动后，OpenClaw 会将机器人身份缓存在状态目录中长达 24 小时，以便重启时可以避免额外的 Telegram `getMe` 调用；更改或删除 token 会清除该缓存。</Note>

## Telegram 侧设置

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility"Telegram>
    Telegram 机器人默认处于 **隐私模式**，这限制了它们接收的群组消息。

    如果机器人必须查看所有群组消息，请执行以下操作之一：

    - 通过 `/setprivacy`Telegram 禁用隐私模式，或
    - 将机器人设为群组管理员。

    切换隐私模式时，请在每个群组中移除并重新添加机器人，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="Group permissions"Telegram>
    管理员状态在 Telegram 群组设置中控制。

    管理员机器人会接收所有群组消息，这对于始终开启的群组行为很有用。

  </Accordion>

  <Accordion title="有用的 BotFather 开关">

    - `/setjoingroups` 用于允许/拒绝添加到群组
    - `/setprivacy` 用于群组可见性行为

  </Accordion>
</AccordionGroup>

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.telegram.dmPolicy` 控制直接消息（私信）的访问权限：

    - `pairing`（默认）
    - `allowlist`（要求 `allowFrom` 中至少有一个发送者 ID）
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `dmPolicy: "open"` 配合 `allowFrom: ["*"]`Telegram 允许任何发现或猜到机器人用户名的 Telegram 账号控制该机器人。请仅将其用于工具受到严格限制的故意公开的机器人；单一所有者的机器人应配合数字用户 ID 使用 `allowlist`。

    `channels.telegram.allowFrom`Telegram 接受数字格式的 Telegram 用户 ID。接受并标准化 `telegram:` / `tg:` 前缀。
    在多账户配置中，限制性的顶级 `channels.telegram.allowFrom` 被视为安全边界：除非合并后的有效账户允许列表仍包含显式通配符，否则账户级别的 `allowFrom: ["*"]` 条目不会使该账户公开。
    `dmPolicy: "allowlist"` 若 `allowFrom` 为空，将阻止所有私信，并且会被配置验证拒绝。
    设置仅要求提供数字用户 ID。
    如果您进行了升级且配置包含 `@username` 允许列表条目，请运行 `openclaw doctor --fix`Telegram 来解析它们（尽力而为；需要 Telegram 机器人令牌）。
    如果您之前依赖配对存储允许列表文件，`openclaw doctor --fix` 可以在允许列表流程中将条目恢复到 `channels.telegram.allowFrom` 中（例如当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单一所有者的机器人，建议使用带有显式数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以在配置中保持访问策略的持久性（而不是依赖之前的配对批准）。

    常见误解：私信配对批准并不意味着“此发送者在任何地方都已授权”。
    配对仅授予私信访问权限。如果尚无命令所有者，第一个批准的配对还将设置 `commands.ownerAllowFrom`Telegram，以便仅限所有者的命令和执行批准具有明确的操作员账户。
    群组发送者授权仍来自显式的配置允许列表。
    如果您希望“我被授权一次后，私信和群组命令均能正常工作”，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom` 中；对于仅限所有者的命令，请确保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`Telegram。

    ### 查找您的 Telegram 用户 ID

    更安全的方法（无第三方机器人）：

    1. 私信您的机器人。
    2. 运行 `openclaw logs --follow`。
    3. 读取 `from.id`API。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（私密性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="群组策略和允许列表">
    两个控制项协同工作：

    1. **允许哪些群组** (`channels.telegram.groups`)
       - 没有 `groups` 配置：
         - 使用 `groupPolicy: "open"`：任何群组都可以通过群组 ID 检查
         - 使用 `groupPolicy: "allowlist"`（默认）：群组将被阻止，直到你添加 `groups` 条目（或 `"*"`）
       - 配置了 `groups`：作为允许列表（显式 ID 或 `"*"`）

    2. **允许群组中的哪些发送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发送者过滤。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应该是数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被规范化）。
    请勿将 Telegram 群组或超级群组聊天 ID 放在 `groupAllowFrom` 中。负数聊天 ID 属于 `channels.telegram.groups`。
    非数字条目在发送者授权时会被忽略。
    安全边界（`2026.2.25+`）：群组发送者授权**不**继承 私信配对存储的批准。
    配对仅限于私信。对于群组，请设置 `groupAllowFrom` 或每个群组/每个话题的 `allowFrom`。
    如果未设置 `groupAllowFrom`，Telegram 将回退到配置 `allowFrom`，而不是配对存储。
    单一所有者机器人的实用模式：在 `channels.telegram.allowFrom` 中设置你的用户 ID，保留 `groupAllowFrom` 未设置，并在 `channels.telegram.groups` 下允许目标群组。
    运行时说明：如果 `channels.telegram` 完全缺失，运行时默认为故障封闭 `groupPolicy="allowlist"`，除非显式设置了 `channels.defaults.groupPolicy`。

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

    使用 `@<bot_username> ping` 从群组中进行测试。普通的群组消息不会触发机器人，而 `requireMention: true` 会。

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
      - 当你想限制允许群组内哪些人可以触发机器人时，将 Telegram 用户 ID（如 `8734062810`）放在 `groupAllowFrom` 下。
      - 仅当你希望允许群组的任何成员都能与机器人交谈时，才使用 `groupAllowFrom: ["*"]`。

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
    - 群组获准后，如果启用了原生命令，请运行 `/whoami@<bot_username>`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 归网关进程所有。
- 路由是确定性的：Telegram 入站回复会发回 Telegram（模型不选择渠道）。
- 传入消息会规范化为共享的渠道信封，其中包含回复元数据、媒体占位符以及网关观察到的 Telegram 回复的持久化回复链上下文。
- 群组会话按群组 ID 隔离。论坛话题附加 `:topic:<threadId>` 以保持话题隔离。
- 私信消息可以携带 `message_thread_id`OpenClaw；OpenClaw 会在回复时保留话题 ID，但默认情况下将私信保留在扁平会话中。当您有意进行私信话题会话隔离时，请配置 `channels.telegram.dm.threadReplies: "inbound"`、`channels.telegram.direct.<chatId>.threadReplies: "inbound"`、`requireTopic: true` 或匹配的话题配置。
- 长轮询使用 grammY 运行器进行逐聊天/逐话题排序。整体运行器接收器并发性使用 grammY`agents.defaults.maxConcurrent`。
- 多账户启动限制了并发的 Telegram Telegram`getMe` 探测，因此大型机器人队列不会一次性展开每个账户的探测。
- 长轮询在每个网关进程内受到保护，因此一次只有一个活动的轮询器可以使用机器人令牌。如果您仍然看到 `getUpdates`OpenClaw 409 冲突，则可能是另一个 OpenClaw 网关、脚本或外部轮询器正在使用相同的令牌。
- 默认情况下，长轮询看门狗会在 120 秒内未完成 `getUpdates` 存活检查时触发重启。仅当您的部署在长时间运行的工作期间仍然出现错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围从 `30000` 到 `600000`；支持逐账户覆盖。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 为工具进度保留一个可编辑的状态草稿，完成时清除它，并将最终答案作为普通消息发送
    - `streaming.preview.toolProgress` 控制工具/进度更新是否重用同一条已编辑的预览消息（当预览流式传输激活时默认：`true`）
    - `streaming.preview.commandText` 控制这些工具进度行内的命令/exec 详情：`raw`（默认，保留发布的行为）或 `status`（仅工具标签）
    - 检测到旧版 `channels.telegram.streamMode` 和布尔 `streaming` 值；运行 `openclaw doctor --fix` 将其迁移到 `channels.telegram.streaming.mode`

    工具进度预览更新是在工具运行时显示的简短状态行，例如命令执行、文件读取、规划更新、补丁摘要或 Codex 应用服务器模式下的 Codex 前言/评论文本。Telegram 默认启用这些功能以匹配 OpenClaw 从 `v2026.4.22` 及更高版本的发布行为。要保留答案文本的已编辑预览但隐藏工具进度行，请设置：

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

    要保持工具进度可见但隐藏命令/exec 文本，请设置：

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

    当您希望看到可见的工具进度而不将最终答案编辑到同一条消息中时，请使用 `progress` 模式。将命令文本策略放在 `streaming.progress` 下：

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

    仅当您想要仅最终内容的交付时才使用 `streaming.mode: "off"`：Telegram 预览编辑被禁用，并且通用的工具/进度闲聊被抑制，而不是作为独立状态消息发送。批准提示、媒体负载和错误仍通过正常的最终交付路由。当您只想保留答案预览编辑而隐藏工具进度状态行时，请使用 `streaming.preview.toolProgress: false`。

    <Note>
      Telegram 选定的引用回复是例外。当 `replyToMode` 为 `"first"`、`"all"` 或 `"batched"` 并且入站消息包含选定的引用文本时，OpenClaw 通过 Telegram 的原生引用回复路径发送最终答案，而不是编辑答案预览，因此 `streaming.preview.toolProgress` 无法显示该轮次的简短状态行。没有选定引用文本的当前消息回复仍保留预览流式传输。当工具进度可见性比原生引用回复更重要时，设置 `replyToMode: "off"`，或设置 `streaming.preview.toolProgress: false` 以确认权衡。
    </Note>

    对于仅文本回复：

    - 短 OpenClaw/群组/话题预览：Telegram 保留同一条预览消息并就地执行最终编辑
    - 分裂为多条 OpenClaw 消息的长文本最终结果，在可能的情况下重用现有预览作为第一个最终块，然后仅发送剩余的块
    - 进度模式的最终结果清除状态草稿并使用正常的最终交付，而不是将草稿编辑为答案
    - 如果在确认完成文本之前最终编辑失败，OpenClaw 使用正常的最终交付并清除过时的预览

    对于复杂回复（例如媒体负载），Telegram 回退到正常的最终交付，然后清除预览消息。

    预览流式传输与分块流式传输是分开的。当为 OpenClaw 显式启用分块流式传输时，Telegram 跳过预览流以避免双重流式传输。

    Telegram 专属推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 推理预览在最终交付后删除；当推理应保持可见时使用 `/reasoning on`
    - 最终答案不包含推理文本发送

  </Accordion>

  <Accordion title="格式化与 HTML 回退"Telegram>
    出站文本使用 Telegram `parse_mode: "HTML"`TelegramTelegramTelegramOpenClaw。

    - 类 Markdown 文本会被渲染为 Telegram 安全的 HTML。
    - 支持的 Telegram HTML 标签会被保留；不支持的 HTML 会被转义。
    - 如果 Telegram 拒绝解析后的 HTML，OpenClaw 将重试为纯文本。

    链接预览默认启用，可以通过 `channels.telegram.linkPreview: false` 禁用。

  </Accordion>

  <Accordion title="本机命令和自定义命令"Telegram>
    Telegram 命令菜单注册在启动时通过 `setMyCommands` 处理。

    本机命令默认值：

    - `commands.native: "auto"`Telegram 启用 Telegram 的本机命令

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
    - 自定义命令不能覆盖本机命令
    - 冲突/重复项将被跳过并记录日志

    注意事项：

    - 自定义命令仅作为菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在输入时仍然可以工作

    如果禁用了本机命令，内置命令将被移除。如果已配置，自定义/插件命令可能仍会注册。

    常见设置失败：

    - `setMyCommands failed` 伴随 `BOT_COMMANDS_TOO_MUCH`Telegram 表示 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - 当直接的 Bot API curl 命令正常工作时，`deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失败并伴随 `404: Not Found`，可能意味着 `channels.telegram.apiRoot` 被设置为完整的 `/bot<TOKEN>` 端点。`apiRoot` 必须仅是 Bot API 根目录，而 `openclaw doctor --fix` 会移除意外添加的尾部 `/bot<TOKEN>`。
    - `getMe returned 401`Telegram 表示 Telegram 拒绝了配置的 bot 令牌。请使用当前的 BotFather 令牌更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；由于 OpenClaw 在轮询前停止，因此这不会被报告为 webhook 清理失败。
    - `setMyCommands failed` 伴随网络/fetch 错误通常意味着到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令 (`device-pair` 插件)

    当安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 将代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理的请求（包括 role/scopes）
    4. 批准请求：
       - `/pair approve <requestId>` 用于显式批准
       - `/pair approve` 当只有一个待处理请求时
       - `/pair approve latest` 用于最近的请求

    设置代码包含一个短期引导令牌。内置设置代码引导仅适用于节点：首次连接会创建一个待处理的节点请求，批准后，Gateway(网关) 会返回一个带有 `scopes: []` 的持久节点令牌。它不会返回移交的操作员令牌；操作员访问需要单独批准的操作员配对或令牌流。

    如果设备使用更改的身份验证详细信息（例如 role/scopes/public key）重试，之前的待处理请求将被取代，新请求使用不同的 `requestId`。请在批准之前重新运行 `/pair pending`。

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

    旧版 `capabilities: ["inlineButtons"]` 映射为 `inlineButtons: "all"`。

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

    Mini App 按钮示例：

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Open app:",
  presentation: {
    blocks: [
      {
        type: "buttons",
        buttons: [{ label: "Launch", web_app: { url: "https://example.com/app" } }],
      },
    ],
  },
}
```

    Telegram `web_app` 按钮仅在用户和机器人之间的私聊中有效。

    回调点击将作为文本传递给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="TelegramTelegram 消息操作（适用于代理和自动化）"Telegram>
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`)

    渠道消息操作提供了符合人体工程学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    门控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认：禁用)

    注意：`edit` 和 `topic-create` 目前默认处于启用状态，并且没有单独的 `channels.telegram.actions.*` 切换开关。
    运行时发送使用活动的配置/机密快照（启动/重新加载），因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

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

    当启用回复线程且原始 Telegram 文本或说明文字可用时，OpenClaw 会自动包含原生的 Telegram 引用摘录。Telegram 将原生引用文本限制为 1024 个 UTF-16 代码单元，因此较长的消息会从头开始引用，如果 Telegram 拒绝该引用，则会回退到普通回复。

    注意：`off` 会禁用隐式回复线程。显式的 `[[reply_to_*]]` 标签仍然有效。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    Forum supergroups:

    - topic 会话 keys append `:topic:<threadId>`
    - replies and typing target the topic thread
    - topic config path:
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    General topic (`threadId=1`) special-case:

    - message sends omit `message_thread_id` (Telegram 拒绝 `sendMessage(...thread_id=1)`)
    - typing actions still include `message_thread_id`

    Topic inheritance: topic entries inherit group settings unless overridden (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` is topic-only and does not inherit from group defaults.

    **Per-topic agent routing**: Each topic can route to a different agent by setting `agentId` in the topic config. This gives each topic its own isolated workspace, memory, and 会话. Example:

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

    Each topic then has its own 会话 key: `agent:zu:telegram:group:-1001234567890:topic:3`

    **Persistent ACP topic binding**: Forum topics can pin ACP harness sessions through top-level typed ACP bindings (`bindings[]` with `type: "acp"` and `match.channel: "telegram"`, `peer.kind: "group"`, and a topic-qualified id like `-1001234567890:topic:42`). Currently scoped to forum topics in groups/supergroups. See [ACP Agents](/zh/tools/acp-agents).

    **Thread-bound ACP spawn from chat**: `/acp spawn <agent> --thread here|auto` binds the current topic to a new ACP 会话; follow-ups route there directly. OpenClaw pins the spawn confirmation in-topic. Requires `channels.telegram.threadBindings.spawnSessions` to remain enabled (default: `true`).

    Template context exposes `MessageThreadId` and `IsForum`. 私信 chats with `message_thread_id` keep 私信 routing and reply metadata on flat sessions by default; they only use thread-aware 会话 keys when configured with `threadReplies: "inbound"`, `threadReplies: "always"`, `requireTopic: true`, or a matching topic config. Use top-level `channels.telegram.dm.threadReplies` for the account default, or `direct.<chatId>.threadReplies` for one 私信.

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 语音消息

    Telegram 区分语音留言和音频文件。

    - 默认：音频文件行为
    - 在 Agent 回复中使用标签 `[[audio_as_voice]]` 强制发送语音留言
    - 接收到的语音留言转录在 Agent 上下文中被标记为机器生成且不受信任的文本；提及检测仍使用原始转录，因此提及门控的语音消息可以继续工作。

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

    Telegram 区分视频文件和视频留言。

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

    视频留言不支持字幕；提供的消息文本会单独发送。

    ### 贴纸

    接收到的贴纸处理：

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
    Telegram 反应以 `message_reaction`OpenClaw 更新的形式到达（与消息负载分开）。

    启用后，OpenClaw 会将系统事件加入队列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`: `off | own | all` (默认: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (默认: `minimal`)

    注意事项：

    - `own`Telegram 意味着仅限用户对机器人发送的消息做出反应（通过已发送消息缓存尽力而为）。
    - 反应事件仍然遵循 Telegram 访问控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`Telegram)；未授权的发送者将被丢弃。
    - Telegram 不在反应更新中提供话题 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组一般话题会话 (`:topic:1`)，而非确切的原始话题

    用于轮询/Webhook 的 `allowed_updates` 会自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 正在处理入站消息时，`ackReaction`OpenClaw 会发送一个确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退 (`agents.list[].identity.emoji`Telegram，否则为 "👀")

    注意事项：

    - Telegram 期望使用 unicode 表情符号（例如 "👀"）。
    - 使用 `""` 来禁用渠道或帐户的反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    默认启用通道配置写入 (`configWrites !== false`)。

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
    默认为长轮询。若要使用 Webhook 模式，请设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选 `webhookPath`、`webhookHost`、`webhookPort` (默认值分别为 `/telegram-webhook`、`127.0.0.1`、`8787`)。

    在长轮询模式下，OpenClaw 仅在更新成功分发后才持久化其重启水位线。如果处理程序失败，该更新在同一进程中仍可重试，且不会被标记为已完成以用于重启去重。

    本地监听器绑定到 `127.0.0.1:8787`。对于外部入口，可以在本地端口前放置反向代理，或者有意设置 `webhookHost: "0.0.0.0"`。

    Webhook 模式会在向 Telegram 返回 `200` 之前验证请求守卫、Telegram 密钥令牌和 JSON 正文。
    然后 OpenClaw 通过与长轮询相同的每个聊天/每个主题机器人通道异步处理更新，因此缓慢的 Agent 轮次不会占用 Telegram 的送达 ACK。

  </Accordion>

  <Accordion title="CLI限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度拆分之前优先选择段落边界（空行）。
    - `channels.telegram.mediaMaxMb`Telegram（默认 100）限制 Telegram 入站和出站媒体的大小。
    - `channels.telegram.mediaGroupFlushMs`TelegramOpenClaw（默认 500）控制在 OpenClaw 将 Telegram 专辑/媒体组作为一条入站消息分发之前的缓冲时间。如果专辑部分到达较晚，请增加此值；若要减少专辑回复延迟，请减小此值。
    - `channels.telegram.timeoutSeconds`TelegramAPIgrammYgrammYOpenClaw 覆盖 Telegram API 客户端超时（如果未设置，则应用 grammY 默认值）。机器人客户端会将配置的值限制在 60 秒出站文本/输入请求保护之下，以便 grammY 不会在 OpenClaw 的传输保护和回退运行之前中止可见回复的传递。长轮询仍然使用 45 秒的 `getUpdates` 请求保护，因此空闲轮询不会被无限期放弃。
    - `channels.telegram.pollingStallThresholdMs` 默认为 `120000`；仅在发生误报的轮询停滞重启时才在 `30000` 和 `600000` 之间进行调整。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0`Telegram 则禁用。
    - 当网关观察到父消息时，回复/引用/转发的补充上下文会被规范化为一个选定的对话上下文窗口；观察到的消息缓与会话存储一起持久化。Telegram 在更新中仅包含一个浅层的 `reply_to_message`TelegramTelegram，因此早于缓存的链仅限于 Telegram 当前的更新负载。
    - Telegram 允许列表主要限制谁可以触发代理，而不是完整的补充上下文编辑边界。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry`TelegramCLIAPITelegramCLI 配置适用于 Telegram 发送辅助程序（CLI/工具/操作），用于可恢复的出站 API 错误。入站最终回复传递也对 Telegram 连接前失败使用有界的安全发送重试，但不会重试可能复制可见消息的不明确的发送后网络信封。

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

    Telegram 发送也支持：

    - `--presentation` 在 `channels.telegram.capabilities.inlineButtons` 允许时使用 `buttons` 块作为内联键盘
    - `--pin` 或 `--delivery '{"pin":true}'` 以在机器人可以在该聊天中置顶时请求置顶传递
    - `--force-document` 将出站图像、GIF 和视频作为文档发送，而不是压缩照片、动画媒体或视频上传

    操作门控：

    - `channels.telegram.actions.sendMessage=false`Telegram 禁用出站 Telegram 消息，包括轮询
    - `channels.telegram.actions.poll=false`Telegram 禁用 Telegram 轮询创建，同时保留常规发送启用

  </Accordion>

  <Accordion title="Telegram在 Telegram 中进行 Exec 批准"TelegramTelegram>
    Telegram 支持在批准者的私信中进行 exec 批准，并可以选择在原始聊天或主题中发布提示。批准者必须是数字形式的 Telegram 用户 ID。

    配置路径：

    - `channels.telegram.execApprovals.enabled` （当至少有一个批准者可解析时自动启用）
    - `channels.telegram.execApprovals.approvers` （回退到 `commands.ownerAllowFrom` 中的数字所有者 ID）
    - `channels.telegram.execApprovals.target`： `dm` （默认） | `channel` | `both`
    - `agentFilter`， `sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制谁可以与机器人对话及其发送普通回复的位置。它们不会将某人设为 exec 批准者。当尚不存在命令所有者时，第一个批准的私信配对会引导 `commands.ownerAllowFrom`，因此在 `execApprovals.approvers` 下不重复 ID 也能使用单一所有者设置。

    Channel 投递会在聊天中显示命令文本；仅在受信任的群组/主题中启用 `channel` 或 `both`OpenClaw。当提示进入论坛主题时，OpenClaw 会为主题和后续回复保留该主题。Exec 批准默认在 30 分钟后过期。

    内联批准按钮还需要 `channels.telegram.capabilities.inlineButtons` 来允许目标界面（`dm`、`group` 或 `all`）。带有 `plugin:` 前缀的批准 ID 通过插件批准解析；其他优先通过 exec 批准解析。

    参见 [Exec 批准](/en/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到投递或提供商错误时，Telegram 可以回复错误文本或抑制该错误。两个配置键控制此行为：

| 键                                 | 值            | 默认值 | 描述                                                                                     |
| ----------------------------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 向聊天发送友好的错误消息。`silent` 完全禁止错误回复。 |
| `channels.telegram.errorCooldownMs` | number (ms)       | `60000` | 向同一聊天发送错误回复之间的最小时间间隔。防止在故障期间出现错误消息刷屏。        |

支持按账户、按群组和按主题的覆盖（与其他 Telegram 配置键的继承规则相同）。

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

## 故障排查

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见。
      - BotFather: `/setprivacy` -> Disable
      - 然后将机器人从群组中移除并重新添加
    - `openclaw channels status` 会在配置预期接收非提及群组消息时发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法用于探测成员身份。
    - 快速会话测试：`/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 当存在 `channels.telegram.groups` 时，群组必须被列出（或包含 `"*"`）
    - 验证机器人在群组中的成员身份
    - 查看日志：`openclaw logs --follow` 以了解跳过的原因

  </Accordion>

  <Accordion title="命令部分有效或完全无效">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使组策略为 `open`，命令授权仍然适用
    - 带有 `BOT_COMMANDS_TOO_MUCH` 的 `setMyCommands failed` 表示原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - `deleteMyCommands` / `setMyCommands` 启动调用和 `sendChatAction` 类型调用是有界的，并在请求超时时通过 Telegram 的传输回退重试一次。持续的网络/获取错误通常表示对 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="启动报告令牌未授权">

    - `getMe returned 401` 是配置的机器人令牌的 Telegram 身份验证失败。
    - 在 BotFather 中重新复制或重新生成机器人令牌，然后为默认帐户更新 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 启动期间的 `deleteWebhook 401 Unauthorized` 也是身份验证失败；将其视为“不存在 webhook”只会将同样的令牌错误延迟到后续的 API 调用中。

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 如果 AbortSignal 类型不匹配，可能会触发立即中止行为。
    - 某些主机首先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站可能会导致间歇性的 Telegram API 失败。
    - 如果日志中包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将这些作为可恢复的网络错误重试。
    - 在轮询启动期间，OpenClaw 重用成功的启动 `getMe` 探测（用于 grammY），因此运行器在第一次 `getUpdates` 之前不需要第二次 `getMe`。
    - 如果 `deleteWebhook` 在轮询启动期间因瞬态网络错误而失败，OpenClaw 将继续进入长轮询，而不是进行另一次轮询前控制面调用。仍然活动的 webhook 会表现为 `getUpdates` 冲突；然后 OpenClaw 重建 Telegram 传输并重试 webhook 清理。
    - 如果 Telegram 套接字以短暂的固定周期回收，请检查 `channels.telegram.timeoutSeconds` 是否过低；Bot 客户端会将配置值限制在出站和 `getUpdates` 请求守卫之下，但如果该值设置在这些守卫之下，旧版本可能会中止每次轮询或回复。
    - 如果日志中包含 `Polling stall detected`，默认情况下，OpenClaw 会在 120 秒内未完成长轮询活跃度后重启轮询并重建 Telegram 传输。
    - `openclaw channels status --probe` 和 `openclaw doctor` 会在以下情况发出警告：正在运行的轮询账户在启动宽限期后未完成 `getUpdates`，正在运行的 webhook 账户在启动宽限期后未完成 `setWebhook`，或者上次成功的轮询传输活动已过期。
    - 仅当长时间运行的 `getUpdates` 调用健康，但您的主机仍报告虚假的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。持续的停滞通常指向主机与 `api.telegram.org` 之间的代理、DNS、IPv6 或 TLS 出站问题。
    - Telegram 也尊重 Bot API 传输的进程代理环境变量，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍然可以绕过 `api.telegram.org`。
    - 如果 OpenClaw 托管代理通过 `OPENCLAW_PROXY_URL` 为服务环境配置，并且不存在标准代理环境变量，则 Telegram 也会使用该 URL 进行 Bot API 传输。
    - 在直接出站/TLS 不稳定的 VPS 主机上，通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`（WSL2 除外）。Telegram DNS 结果顺序遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然后是 `channels.telegram.network.dnsResultOrder`，然后是进程默认值（如 `NODE_OPTIONS=--dns-result-order=ipv4first`）；如果都不适用，Node 22+ 将回退到 `ipv4first`。
    - 如果您的主机是 WSL2 或明确在仅 IPv4 行为下工作得更好，请强制选择系列：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准范围答案（`198.18.0.0/15`）默认情况下已允许
      用于 Telegram 媒体下载。如果在媒体下载期间，受信任的假 IP 或
      透明代理将 `api.telegram.org` 重写为其他
      私有/内部/特殊用途地址，您可以选择
      加入 Telegram 专用绕过：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每个帐户都可以在 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 获得相同的选择加入选项。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`，请首先
      关闭危险标志。Telegram 媒体默认已允许 RFC 2544
      基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 削弱 Telegram
      媒体 SSRF 保护。仅当它们在 RFC 2544 基准
      范围之外合成私有或特殊用途答案时，才将其用于受信任的运营商控制的代理
      环境（例如 Clash、Mihomo 或 Surge 假 IP 路由）。
      对于正常的公共互联网 Telegram 访问，请保持关闭。
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

更多帮助：[Channel 故障排除](/zh/channels/troubleshooting)。

## 配置参考

主要参考：[Configuration reference - Telegram](/zh/gateway/config-channels#telegram)。

<Accordion title="Telegram重要 Telegram 字段">

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` 必须指向常规文件；拒绝符号链接)
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, 顶级 `bindings[]` (`type: "acp"`)
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`, `dm.threadReplies`, `direct.*.threadReplies`
- streaming: `streaming` (预览), `streaming.preview.toolProgress`, `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`API
- custom API root: `apiRoot`API (仅 Bot API root；不要包含 `/bot<TOKEN>`)
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- errors: `errorPolicy`, `errorCooldownMs`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>多账号优先级：当配置了两个或更多账号 ID 时，请设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明确默认路由。否则 OpenClaw 将回退到第一个标准化的账号 ID 且 `openclaw doctor` 会发出警告。命名账号会继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不会继承 `accounts.default.*` 的值。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    将 Telegram 用户与网关配对。
  </Card>
  <Card title="Groups" icon="users" href="/zh/channels/groups">
    群组和话题的允许列表行为。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh/channels/channel-routing">
    将传入消息路由到代理。
  </Card>
  <Card title="Security" icon="shield" href="/zh/gateway/security">
    威胁模型和加固。
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/zh/concepts/multi-agent">
    将群组和话题映射到代理。
  </Card>
  <Card title="Troubleshooting" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断。
  </Card>
</CardGroup>
