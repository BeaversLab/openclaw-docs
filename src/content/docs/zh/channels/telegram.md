---
summary: "TelegramTelegram 机器人支持状态、功能和配置"
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

    环境变量回退：`TELEGRAM_BOT_TOKEN=...`Telegram（仅默认账户）。
    Telegram **不**使用 `openclaw channels login telegram`；请在配置/环境中配置令牌，然后启动网关。

  </Step>

  <Step title="Start gateway and approve first 私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码会在 1 小时后过期。

  </Step>

  <Step title="将机器人添加到群组">
    将机器人添加到您的群组，然后获取群组访问所需的两个 ID：

    - 您的 Telegram 用户 ID，用于 `allowFrom` / `groupAllowFrom`
    - Telegram 群组聊天 ID，用作 `channels.telegram.groups` 下的键

    对于首次设置，请从 `openclaw logs --follow`、转发 ID 机器人或 Bot API `getUpdates` 获取群组聊天 ID。允许群组后，`/whoami@<bot_username>` 可以确认用户和群组 ID。

    以 `-100` 开头的负数 Telegram 超级群组 ID 是群组聊天 ID。请将它们放在 `channels.telegram.groups` 下，而不是 `groupAllowFrom` 下。

  </Step>
</Steps>

<Note>令牌解析顺序是感知账户的。实际上，配置值优先于环境变量回退，并且 `TELEGRAM_BOT_TOKEN` 仅适用于默认账户。 成功启动后，OpenClaw 会在状态目录中缓存机器人身份长达 24 小时，以便重启时可以避免额外的 Telegram `getMe` 调用；更改或移除令牌将清除该缓存。</Note>

## Telegram 侧设置

<AccordionGroup>
  <Accordion title="隐私模式和群组可见性">
    Telegram 机器人默认处于 **隐私模式**，这限制了它们能收到的群组消息。

    如果机器人必须查看所有群组消息，请执行以下操作之一：

    - 通过 `/setprivacy` 禁用隐私模式，或
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

    `dmPolicy: "open"` 结合 `allowFrom: ["*"]`Telegram 允许任何发现或猜到机器人用户名的 Telegram 账号控制该机器人。请仅将此用于工具受到严格限制的故意公开的机器人；单一所有者的机器人应使用 `allowlist` 并配合数字用户 ID。

    `channels.telegram.allowFrom`Telegram 接受数字 Telegram 用户 ID。`telegram:` / `tg:` 前缀会被接受并标准化。
    在多账号配置中，严格限制的顶级 `channels.telegram.allowFrom` 被视为安全边界：除非合并后的有效账号白名单仍包含显式通配符，否则账号级别的 `allowFrom: ["*"]` 条目不会使该账号公开。
    `dmPolicy: "allowlist"` 若使用空的 `allowFrom` 将阻止所有私信，并且会被配置验证拒绝。
    设置仅要求提供数字用户 ID。
    如果您已升级且配置包含 `@username` 白名单条目，请运行 `openclaw doctor --fix`Telegram 来解析它们（尽最大努力；需要 Telegram 机器人令牌）。
    如果您之前依赖 pairing-store 白名单文件，`openclaw doctor --fix` 可以在白名单流程中将条目恢复到 `channels.telegram.allowFrom` 中（例如当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单一所有者的机器人，建议优先使用 `dmPolicy: "allowlist"` 并配合显式的数字 `allowFrom` ID，以使访问策略在配置中持久化（而不是依赖于之前的配对批准）。

    常见误区：私信配对批准并不意味着“此发送者在任何地方都已获授权”。
    配对仅授予私信访问权限。如果尚无命令所有者，首次批准的配对还将设置 `commands.ownerAllowFrom`Telegram，以便仅限所有者的命令和执行批准具有明确的操作员账号。
    群组发送者授权仍来自显式的配置白名单。
    如果您希望“一次授权，私信和群组命令均可用”，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom` 中；对于仅限所有者的命令，请确保 `commands.ownerAllowFrom` 包含 `telegram:<your user id>`Telegram。

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
    两个控制条件同时生效：

    1. **允许哪些群组** (`channels.telegram.groups`)
       - 没有 `groups` 配置：
         - 如果启用了 `groupPolicy: "open"`：任何群组都可以通过群组 ID 检查
         - 如果启用了 `groupPolicy: "allowlist"`（默认）：群组将被阻止，直到你添加 `groups` 条目（或 `"*"`）
       - 配置了 `groups`：作为允许列表（显式 ID 或 `"*"`）

    2. **允许群组中的哪些发送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于群组发送者过滤。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应该是数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被标准化）。
    不要将 Telegram 群组或超级群组聊天 ID 放入 `groupAllowFrom`。负数聊天 ID 属于 `channels.telegram.groups`。
    非数字条目在发送者授权时会被忽略。
    安全边界 (`2026.2.25+`)：群组发送者授权**不**继承私信配对存储中的批准。
    配对仅适用于私信。对于群组，请设置 `groupAllowFrom` 或针对每个群组/每个话题设置 `allowFrom`。
    如果 `groupAllowFrom` 未设置，Telegram 将回退到配置 `allowFrom`，而不是配对存储。
    单一所有者机器人的实用模式：在 `channels.telegram.allowFrom` 中设置你的用户 ID，保留 `groupAllowFrom` 为未设置，并在 `channels.telegram.groups` 下允许目标群组。
    运行时说明：如果 `channels.telegram` 完全缺失，运行时默认为故障关闭 (fail-closed) `groupPolicy="allowlist"`，除非明确设置了 `channels.defaults.groupPolicy`。

    仅所有者群组设置：

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

    使用 `@<bot_username> ping` 从群组中进行测试。当 `requireMention: true` 时，普通群组消息不会触发机器人。

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

      - 将负数 Telegram 群组或超级群组聊天 ID（例如 `-1001234567890`）放在 `channels.telegram.groups` 下。
      - 当你想限制允许群组内哪些人可以触发机器人时，将 Telegram 用户 ID（例如 `8734062810`）放在 `groupAllowFrom` 下。
      - 仅当你希望允许群组的任何成员都能与机器人交谈时，才使用 `groupAllowFrom: ["*"]`。

    </Warning>

  </Tab>

  <Tab title="提及行为">
    默认情况下，群组回复需要提及。

    提及可以来自：

    - 原生 `@botusername` 提及，或
    - 以下位置中的提及模式：
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    会话级命令开关：

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

    - 将群组消息转发给 `@userinfobot` / `@getidsbot`
    - 或从 `openclaw logs --follow` 中读取 `chat.id`
    - 或检查 Bot API `getUpdates`
    - 群组获准后，如果启用了原生命令，请运行 `/whoami@<bot_username>`

  </Tab>
</Tabs>

## 运行时行为

- Telegram 归网关进程所有。
- 路由是确定性的：Telegram 入站回复会发回 Telegram（模型不选择渠道）。
- 传入消息会规范化为共享的渠道信封，其中包含回复元数据、媒体占位符以及网关观察到的 Telegram 回复的持久化回复链上下文。
- 群组会话按群组 ID 隔离。论坛主题附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`；OpenClaw 在回复时会保留主题 ID，但默认情况下将私信保留在扁平会话中。当您有意实现私信主题会话隔离时，请配置 `channels.telegram.dm.threadReplies: "inbound"`、`channels.telegram.direct.<chatId>.threadReplies: "inbound"`、`requireTopic: true` 或匹配的主题配置。
- 长轮询使用 grammY 运行器，并按聊天/按主题进行排序。整体运行器接收并发使用 `agents.defaults.maxConcurrent`。
- 多账号启动限制了并发的 Telegram `getMe` 探测，这样大型机器人群组不会立即扩散每个账号的探测。
- 长轮询在每个网关进程内部受到保护，因此一次只有一个活跃的轮询器可以使用 bot 令牌。如果您仍然看到 `getUpdates` 409 冲突，则另一个 OpenClaw 网关、脚本或外部轮询器可能正在使用相同的令牌。
- 默认情况下，如果在 120 秒内未完成 `getUpdates` 存活检查，将触发长轮询看门狗重启。仅当您的部署在长时间运行的工作期间仍然出现误判的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围从 `30000` 到 `600000`；支持每个账户的覆盖设置。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）"OpenClaw>
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/主题：预览消息 + `editMessageText`
    - 直接聊天工具进度：在启用并支持时，可选的原生 `sendMessageDraft` 状态预览

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 为工具进度保留一个可编辑的状态草稿，在完成时将其清除，并将最终答案作为普通消息发送
    - `streaming.preview.toolProgress` 控制工具/进度更新是否重用同一条已编辑的预览消息（当预览流式传输激活时默认为 `true`）
    - `streaming.preview.commandText` 控制这些工具进度行内的命令/执行细节：`raw`（默认，保留已发布的行为）或 `status`（仅工具标签）
    - 会检测旧版 `channels.telegram.streamMode` 和布尔 `streaming` 值；运行 `openclaw doctor --fix` 将其迁移为 `channels.telegram.streaming.mode`TelegramOpenClaw

    工具进度预览更新是工具运行时显示的短状态行，例如命令执行、文件读取、规划更新、补丁摘要，或 Codex 应用服务器模式下的 Codex 前言/评论文本。Telegram 默认启用这些功能以匹配 `v2026.4.22`Telegram 及更高版本中发布的 OpenClaw 行为。

    直接聊天可以使用原生 Telegram 草稿来处理这些工具进度行，而不会将工具闲聊保留到聊天记录中。原生草稿在答案文本开始前停止；最终答案保持在正常的持久交付路径上。此通道默认处于关闭状态，应首先限制为受信任的私信 ID：

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": true,
              "nativeToolProgress": true,
              "nativeToolProgressAllowFrom": ["123456789"]
            }
          }
        }
      }
    }
    ```

    要保留答案文本的已编辑预览但隐藏工具进度行，请设置：

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

    当您希望可见的工具进度而不将最终答案编辑到同一条消息中时，请使用 `progress` 模式。将命令文本策略置于 `streaming.progress` 下：

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

    仅当您想要仅最终交付时才使用 `streaming.mode: "off"`Telegram：Telegram 预览编辑被禁用，通用工具/进度闲聊被抑制，而不是作为独立状态消息发送。批准提示、媒体负载和错误仍通过正常的最终交付路由。当您只想保留答案预览编辑并隐藏工具进度状态行时，请使用 `streaming.preview.toolProgress: false`Telegram。

    <Note>
      Telegram 选定的引用回复是例外情况。当 `replyToMode` 为 `"first"`、`"all"` 或 `"batched"`OpenClawTelegram 且入站消息包含选定的引用文本时，OpenClaw 通过 Telegram 的原生引用回复路径发送最终答案，而不是编辑答案预览，因此 `streaming.preview.toolProgress` 无法显示该轮次的短状态行。没有选定引用文本的当前消息回复仍保持预览流式传输。当工具进度的可见性比原生引用回复更重要时，设置 `replyToMode: "off"`，或设置 `streaming.preview.toolProgress: false`OpenClawTelegramOpenClawOpenClawTelegramOpenClawTelegram 以确认权衡。
    </Note>

    对于仅文本回复：

    - 短私信/群组/主题预览：OpenClaw 保留同一条预览消息并就地执行最终编辑
    - 分割为多条 Telegram 消息的长文本最终结果在可能的情况下将现有预览重用为第一个最终分块，然后仅发送剩余的分块
    - 进度模式的最终结果会清除状态草稿并使用正常的最终交付，而不是将草稿编辑为答案
    - 如果在确认完成文本之前最终编辑失败，OpenClaw 使用正常的最终交付并清除过时的预览

    对于复杂回复（例如媒体负载），OpenClaw 回退到正常的最终交付，然后清除预览消息。

    预览流式传输与分块流式传输是分开的。当为 Telegram 显式启用分块流式传输时，OpenClaw 跳过预览流以避免双重流式传输。

    Telegram 仅推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 推理预览在最终交付后被删除；当推理应保持可见时，请使用 `/reasoning on`
    - 最终答案不包含推理文本

  </Accordion>

  <Accordion title="Formatting and HTML fallback"Telegram>
    Outbound text uses Telegram `parse_mode: "HTML"`TelegramTelegramTelegramOpenClaw.

    - Markdown-ish text is rendered to Telegram-safe HTML.
    - Supported Telegram HTML tags are preserved; unsupported HTML is escaped.
    - If Telegram rejects parsed HTML, OpenClaw retries as plain text.

    Link previews are enabled by default and can be disabled with `channels.telegram.linkPreview: false`.

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

    - 名称会被规范化（去除前导 `/`，转为小写）
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复项将被跳过并记录

    注意事项：

    - 自定义命令仅作为菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在输入时仍可工作

    如果禁用了原生命令，内置命令将被移除。如果配置了，自定义/插件命令仍可能注册。

    常见设置失败：

    - 带有 `BOT_COMMANDS_TOO_MUCH` 的 `setMyCommands failed` 表示 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - 当直接的 Bot API curl 命令可以工作，但 `deleteWebhook`、`deleteMyCommands` 或 `setMyCommands` 失败并提示 `404: Not Found` 时，可能意味着 `channels.telegram.apiRoot` 被设置为了完整的 `/bot<TOKEN>` 端点。`apiRoot` 必须仅是 Bot API 根目录，而 `openclaw doctor --fix` 会移除意外附加的 `/bot<TOKEN>`。
    - `getMe returned 401` 表示 Telegram 拒绝了配置的 bot 令牌。请使用当前的 BotFather 令牌更新 `botToken`、`tokenFile` 或 `TELEGRAM_BOT_TOKEN`；OpenClaw 会在轮询之前停止，因此这不会作为 webhook 清理失败被报告。
    - 带有网络/获取错误的 `setMyCommands failed` 通常意味着到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    当安装了 `device-pair` 插件时：

    1. `/pair` 生成设置代码
    2. 将代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理的请求（包括角色/作用域）
    4. 批准请求：
       - `/pair approve <requestId>` 用于显式批准
       - `/pair approve` 当只有一个待处理的请求时
       - `/pair approve latest` 用于最近的请求

    设置代码携带一个短期引导令牌。内置的设置代码引导仅适用于节点：首次连接会创建一个待处理的节点请求，批准后，Gateway(网关) 会返回一个带有 `scopes: []` 的持久节点令牌。它不返回移交的操作员令牌；操作员访问需要单独的已批准操作员配对或令牌流。

    如果设备使用更改的身份验证详细信息（例如角色/作用域/公钥）重试，先前的待处理请求将被取代，新请求将使用不同的 `requestId`。在批准之前请重新运行 `/pair pending`。

    更多详情：[配对](/zh/channels/pairing#pair-via-telegram-recommended-for-ios)。

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

    Telegram `web_app` 按钮仅在用户与机器人之间的私聊中有效。

    回调点击作为文本传递给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="TelegramTelegram 消息操作（用于代理和自动化）"Telegram>
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`)

    渠道消息操作提供符合人体工学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    门控控制：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认: disabled)

    注意：`edit` 和 `topic-create` 目前默认已启用，并且没有单独的 `channels.telegram.actions.*` 开关。
    运行时发送使用活动配置/机密快照（启动/重新加载），因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    反应移除语义: [/tools/reactions](/zh/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags"Telegram>
    Telegram 支持在生成的输出中使用显式回复串行标签：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]`Telegram 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`TelegramOpenClawTelegramTelegramTelegram

    当启用回复串行功能且原始 Telegram 文本或字幕可用时，OpenClaw 会自动包含原生的 Telegram 引用摘录。Telegram 将原生引用文本限制为 1024 个 UTF-16 代码单位，因此较长的消息会从开头开始引用，如果 Telegram 拒绝该引用，则会回退到普通回复。

    注意：`off` 会禁用隐式回复串行。显式的 `[[reply_to_*]]` 标签仍然有效。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    论坛超级群组：

    - 主题会话键附加 `:topic:<threadId>`
    - 回复和打字以主题串为目标
    - 主题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    常规主题（`threadId=1`）特殊情况：

    - 消息发送省略 `message_thread_id`Telegram（Telegram 拒绝 `sendMessage(...thread_id=1)`）
    - 打字操作仍包含 `message_thread_id`

    主题继承：除非被覆盖，否则主题条目继承群组设置（`requireMention`、`allowFrom`、`skills`、`systemPrompt`、`enabled`、`groupPolicy`）。
    `agentId` 是主题专属的，不继承群组默认值。
    `topics."*"` 为该群组中的每个主题设置默认值；精确的主题 ID 仍优先于 `"*"`。

    **按主题的代理路由**：每个主题可以通过在主题配置中设置 `agentId` 来路由到不同的代理。这为每个主题提供了独立的隔离工作空间、内存和会话。示例：

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

    **持久化 ACP 主题绑定**：论坛主题可以通过顶级类型化 ACP 绑定固定 ACP harness 会话（`bindings[]` 具有 `type: "acp"` 和 `match.channel: "telegram"`、`peer.kind: "group"`，以及类似 `-1001234567890:topic:42` 的主题限定 ID）。目前仅限于群组/超级群组中的论坛主题。请参阅 [ACP 代理](/zh/tools/acp-agents)。

    **从聊天中生成线程绑定的 ACP**：`/acp spawn <agent> --thread here|auto`OpenClaw 将当前主题绑定到新的 ACP 会话；后续回复直接路由到那里。OpenClaw 会将生成确认固定在主题内。要求 `channels.telegram.threadBindings.spawnSessions` 保持启用状态（默认值：`true`）。

    模板上下文公开 `MessageThreadId` 和 `IsForum`。具有 `message_thread_id` 的私聊聊天默认情况下在扁平会话上保持私聊路由和回复元数据；只有在使用 `threadReplies: "inbound"`、`threadReplies: "always"`、`requireTopic: true` 或匹配的主题主题配置时，它们才使用线程感知的会话键。使用顶级 `channels.telegram.dm.threadReplies` 作为帐户默认值，或使用 `direct.<chatId>.threadReplies` 针对单个私聊。

  </Accordion>

  <Accordion title="Audio, video, and stickers">
    ### 音频消息

    Telegram 区分语音笔记和音频文件。

    - 默认：音频文件行为
    - 在 Agent 回复中使用标签 `[[audio_as_voice]]` 以强制发送语音笔记
    - 接收到的语音笔记转录内容在 Agent 上下文中被标记为机器生成且不受信任的文本；提及检测仍使用原始转录文本，因此受提及限制的语音消息将继续正常工作。

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

    接收贴纸的处理：

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

    贴纸仅被描述一次（在可能的情况下）并进行缓存，以减少重复的视觉调用。

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
    Telegram 反应以 `message_reaction`OpenClaw 更新形式到达（与消息负载分开）。

    启用后，OpenClaw 会将系统事件排队，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`: `off | own | all` (默认: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (默认: `minimal`)

    注意：

    - `own`Telegram 表示仅限用户对机器人发送的消息的反应（通过已发送消息缓存尽力而为）。
    - 反应事件仍然遵守 Telegram 访问控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`Telegram)；未经授权的发送者将被丢弃。
    - Telegram 不在反应更新中提供话题 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组一般话题会话 (`:topic:1`)，而非确切来源话题

    轮询/Webhook 的 `allowed_updates` 自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` 在 OpenClaw 处理传入消息时发送一个确认表情符号。`ackReactionScope` 决定了*何时*实际发送该表情符号。

    **表情符号 (`ackReaction`) 解析顺序：**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退 (`agents.list[].identity.emoji`，否则为 "👀")

    注意：

    - Telegram 需要 unicode 表情符号（例如 "👀"）。
    - 使用 `""` 为渠道或帐户禁用该反应。

    **作用域 (`messages.ackReactionScope`)：**

    Telegram 提供商从 `messages.ackReactionScope` 读取作用域（默认 `"group-mentions"`）。目前没有 Telegram 帐户或 Telegram 渠道级别的覆盖设置。

    取值：`"all"` (私信 + 群组)、`"direct"` (仅私信)、`"group-all"` (每条群组消息，无私信)、`"group-mentions"` (当机器人被提及时的群组；**无私信** — 这是默认值)、`"off"` / `"none"` (已禁用)。

    <Note>
    默认作用域 (`"group-mentions"`) 不会在私信中触发确认反应。若要在传入的 Telegram 私信中获得确认反应，请将 `messages.ackReactionScope` 设置为 `"direct"` 或 `"all"`。该值在 Telegram 提供商启动时读取，因此需要重启网关才能使更改生效。
    </Note>

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    默认启用频道配置写入 (`configWrites !== false`Telegram)。

    Telegram 触发的写入包括：

    - 群组迁移事件 (`migrate_to_chat_id`) 以更新 `channels.telegram.groups`
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

  <Accordion title="Long polling vs webhook">
    默认为长轮询。如需使用 Webhook 模式，请设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选 `webhookPath`、`webhookHost`、`webhookPort`（默认值分别为 `/telegram-webhook`、`127.0.0.1`、`8787`）。

    在长轮询模式下，OpenClaw 仅在更新成功分发后持久化其重启水位线。如果处理程序失败，该更新在同一进程中保持可重试状态，并且不会标记为已完成以进行重启去重。

    本地侦听器绑定到 `127.0.0.1:8787`。对于外部入口，可以在本地端口前放置反向代理，或有意设置 `webhookHost: "0.0.0.0"`Telegram。

    Webhook 模式会在向 Telegram 返回 `200` 之前验证请求保护、Telegram 密钥令牌和 JSON 正文。
    OpenClawTelegram 随后通过长轮询使用的相同每聊天/每主题机器人通道异步处理更新，因此缓慢的代理轮次不会占用 Telegram 的交付 ACK。

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 在按长度拆分前优先选择段落边界（空行）。
    - `channels.telegram.mediaMaxMb`（默认 100）限制了入站和出站 Telegram 媒体的大小。
    - `channels.telegram.mediaGroupFlushMs`（默认 500）控制在 Telegram 将 OpenClaw 相册/媒体组作为一条入站消息分发之前的缓冲时长。如果相册部分延迟到达，请增加此值；若要减少相册回复延迟，请减小此值。
    - `channels.telegram.timeoutSeconds` 会覆盖 Telegram API 客户端的超时时间（如果未设置，则应用 grammY 的默认值）。Bot 客户端会将配置值限制在 60 秒的出站文本/输入请求保护之下，以确保 grammY 不会在 OpenClaw 的传输保护和回退机制运行之前中止可见回复的传递。长轮询仍然使用 45 秒的 `getUpdates` 请求保护，以免空闲轮询被无限期放弃。
    - `channels.telegram.pollingStallThresholdMs` 默认为 `120000`；仅针对误报的轮询停滞重启时，才在 `30000` 和 `600000` 之间进行调整。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 表示禁用。
    - 当网关已观察到父消息时，回复/引用/转发的补充上下文会被归一化为一个选定的对话上下文窗口；观察到的消息缓存与会话存储一起持久化。Telegram 在更新中仅包含一个浅层 `reply_to_message`，因此早于缓存的链式消息受限于 Telegram 当前的更新负载。
    - Telegram 许可列表主要控制谁可以触发代理，而非完整的补充上下文编辑边界。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送助手（CLI/工具/操作）以处理可恢复的出站 API 错误。入站的最终回复传递也对 Telegram 预连接失败使用有界的安全发送重试，但它不会重试那些可能导致重复可见消息的模棱两可的发送后网络信封。

    CLI 和消息工具发送目标可以是数字聊天 ID、用户名或论坛主题目标：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
```

    Telegram 轮询使用 `openclaw message poll` 并支持论坛主题：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Telegram 专用的轮询标志：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用于论坛主题（或使用 `:topic:` 目标）

    Telegram 发送还支持：

    - `--presentation` 结合 `buttons` 块，用于在 `channels.telegram.capabilities.inlineButtons` 允许时显示内联键盘
    - `--pin` 或 `--delivery '{"pin":true}'` 用于请求置顶传递，当机器人可以在该聊天中置顶消息时
    - `--force-document` 用于将出站图片、GIF 和视频作为文档发送，而不是压缩的照片、动画媒体或视频上传

    动作控制：

    - `channels.telegram.actions.sendMessage=false` 禁用出站 Telegram 消息，包括轮询
    - `channels.telegram.actions.poll=false` 禁用 Telegram 轮询创建，同时保留常规发送功能

  </Accordion>

  <Accordion title="在 Telegram 中进行执行审批">
    Telegram 支持在审批人的私信中进行执行审批，并可以选择在原始聊天或话题中发布提示。审批人必须是 Telegram 数字用户 ID。

    配置路径：

    - `channels.telegram.execApprovals.enabled` （当至少有一个审批人可解析时自动启用）
    - `channels.telegram.execApprovals.approvers` （回退到来自 `commands.ownerAllowFrom` 的数字所有者 ID）
    - `channels.telegram.execApprovals.target`: `dm` （默认）| `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`、`groupAllowFrom` 和 `defaultTo` 控制谁可以与机器人对话以及它在哪里发送普通回复。它们不会使人成为执行审批人。当尚不存在命令所有者时，第一个批准的私信配对会引导 `commands.ownerAllowFrom`，因此单所有者设置仍然有效，而无需在 `execApprovals.approvers` 下复制 ID。

    频道投递会在聊天中显示命令文本；仅在受信任的群组/话题中启用 `channel` 或 `both`。当提示进入论坛话题时，OpenClaw 会保留该话题用于审批提示和后续跟进。执行审批默认在 30 分钟后过期。

    内联审批按钮还需要 `channels.telegram.capabilities.inlineButtons` 来允许目标界面（`dm`、`group` 或 `all`）。带有 `plugin:` 前缀的审批 ID 通过插件审批解析；其他则首先通过执行审批解析。

    参见 [Exec approvals](/zh/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到投递或提供商错误时，Telegram 可以回复错误文本或抑制该错误。两个配置键控制此行为：

| 键                                  | 值                | 默认值  | 描述                                                                       |
| ----------------------------------- | ----------------- | ------- | -------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 向聊天发送友好的错误消息。`silent` 完全禁止错误回复。              |
| `channels.telegram.errorCooldownMs` | number (ms)       | `60000` | 向同一聊天发送错误回复之间的最小时间间隔。防止在故障期间出现错误消息刷屏。 |

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
```

## 故障排查

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果是 `requireMention=false`Telegram，Telegram 隐私模式必须允许完全可见。
      - BotFather: `/setprivacy` -> Disable
      - 然后将机器人从群组中移除并重新添加
    - 当配置期望未提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查明确的数字群组 ID；通配符 `"*"` 无法探测成员身份。
    - 快速会话测试: `/activation always`。

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - 当存在 `channels.telegram.groups` 时，群组必须被列出（或包含 `"*"`）
    - 验证机器人在群组中的成员身份
    - 检查日志: `openclaw logs --follow` 了解跳过原因

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - 授权您的发送者身份（配对和/或数字 `allowFrom`）
    - 即使群组策略是 `open`，命令授权仍然适用
    - 带有 `BOT_COMMANDS_TOO_MUCH` 的 `setMyCommands failed` 表示原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - `deleteMyCommands` / `setMyCommands` 启动调用和 `sendChatAction`Telegram 输入调用是有界的，并且在请求超时时通过 Telegram 的传输回退重试一次。持续的网络/fetch 错误通常表明对 `api.telegram.org` 的 DNS/HTTPS 可达性问题

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401`Telegram 是已配置机器人令牌的 Telegram 身份验证失败。
    - 在 BotFather 中重新复制或重新生成机器人令牌，然后为默认帐户更新 `channels.telegram.botToken`、`channels.telegram.tokenFile`、`channels.telegram.accounts.<id>.botToken` 或 `TELEGRAM_BOT_TOKEN`。
    - 启动期间的 `deleteWebhook 401 Unauthorized`API 也是身份验证失败；将其视为“不存在 webhook”只会将同样的令牌错误失败推迟到后续的 API 调用中。

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 如果 AbortSignal 类型不匹配，可能会触发立即中止行为。
    - 某些主机优先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出站可能导致间歇性的 Telegram API 故障。
    - 如果日志中包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将其作为可恢复的网络错误进行重试。
    - 在轮询启动期间，OpenClaw 会重用成功的启动 `getMe` 探针供 grammY 使用，因此运行器在第一次 `getUpdates` 之前不需要第二次 `getMe`。
    - 如果 `deleteWebhook` 在轮询启动期间因短暂网络错误而失败，OpenClaw 将继续进行长轮询，而不是发起另一次轮询前控制平面调用。仍然活跃的 webhook 会表现为 `getUpdates` 冲突；OpenClaw 随后重建 Telegram 传输并重试 webhook 清理。
    - 如果 Telegram 套接字按短间隔定期回收，请检查 `channels.telegram.timeoutSeconds` 是否过低；Bot 客户端会将配置值限制在出站和 `getUpdates` 请求保护值之下，但在旧版本中，如果此值设置低于保护值，可能会导致每次轮询或回复都中止。
    - 如果日志中包含 `Polling stall detected`，默认情况下，OpenClaw 会在 120 秒内未完成长轮询存活检测后重启轮询并重建 Telegram 传输。
    - `openclaw channels status --probe` 和 `openclaw doctor` 会在以下情况发出警告：正在运行的轮询账户在启动宽限期内未完成 `getUpdates`；正在运行的 webhook 账户在启动宽限期内未完成 `setWebhook`；或者上次成功的轮询传输活动已过时。
    - 仅当长期运行的 `getUpdates` 调用健康但主机仍报告错误的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。持续停滞通常指向主机与 `api.telegram.org` 之间的代理、DNS、IPv6 或 TLS 出站问题。
    - Telegram 也会为 Bot API 传输遵循进程代理环境变量，包括 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 及其小写变体。`NO_PROXY` / `no_proxy` 仍可绕过 `api.telegram.org`。
    - 如果 OpenClaw 托管代理通过 `OPENCLAW_PROXY_URL` 为服务环境配置，且不存在标准代理环境变量，则 Telegram 也会使用该 URL 进行 Bot API 传输。
    - 在直接出站/TLS 不稳定的 VPS 主机上，请通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`（WSL2 除外）。Telegram DNS 结果顺序遵循 `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`，然后 `channels.telegram.network.dnsResultOrder`，接着是进程默认值（如 `NODE_OPTIONS=--dns-result-order=ipv4first`）；如果均不适用，Node 22+ 将回退到 `ipv4first`。
    - 如果您的主机是 WSL2 或明确在仅 IPv4 行为下效果更好，请强制选择地址族：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 基准范围地址（`198.18.0.0/15`）默认已允许用于 Telegram 媒体下载。如果在媒体下载期间，受信任的 fake-IP 或透明代理将 `api.telegram.org` 重写为其他私有/内部/专用地址，您可以选择加入 Telegram 专用绕过：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每个账户在 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 处也可使用相同的选择加入选项。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`，请先关闭危险标志。Telegram 媒体默认已允许 RFC 2544 基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram 媒体 SSRF 保护。仅当受信任的运营方控制代理环境（如 Clash、Mihomo 或 Surge fake-IP 路由）合成 RFC 2544 基准范围之外的私有或专用地址时才使用它。对于正常的公共互联网 Telegram 访问，请保持关闭。
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

主要参考：[Configuration reference - Telegram](Telegram/en/gateway/config-channels#telegram)。

<Accordion title="关键 Telegram 字段">

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` 必须指向常规文件；不支持符号链接)
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, 顶级 `bindings[]` (`type: "acp"`)
- topic defaults: `groups.<chatId>.topics."*"` 适用于未匹配的论坛主题；精确的主题 ID 会覆盖它
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`, `dm.threadReplies`, `direct.*.threadReplies`
- streaming: `streaming` (预览), `streaming.preview.toolProgress`, `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- custom API root: `apiRoot` (仅 Bot API root；不要包含 `/bot<TOKEN>`)
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- errors: `errorPolicy`, `errorCooldownMs`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>多账号优先级：当配置了两个或更多账号 ID 时，请设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明确默认路由。否则 OpenClaw 将回退到第一个标准化账号 ID 并且 `openclaw doctor` 会发出警告。命名账号继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不继承 `accounts.default.*` 值。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    将 Telegram 用户与网关配对。
  </Card>
  <Card title="Groups" icon="users" href="/zh/channels/groups">
    群组和话题允许列表行为。
  </Card>
  <Card title="Channel routing" icon="route" href="/zh/channels/channel-routing">
    将入站消息路由至代理。
  </Card>
  <Card title="Security" icon="shield" href="/zh/gateway/security">
    威胁模型与加固。
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/zh/concepts/multi-agent">
    将群组和话题映射到代理。
  </Card>
  <Card title="Troubleshooting" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断。
  </Card>
</CardGroup>
