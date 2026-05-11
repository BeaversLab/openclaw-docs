---
summary: "Telegram bot 支持状态、功能和配置"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

通过 grammY 支持机器人私信和群组的生产环境使用。长轮询是默认模式；Webhook 模式是可选的。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    Telegram 的默认私信策略是配对。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关)配置" icon="settings" href="/zh/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="在 BotFather 中创建机器人令牌">
    打开 Telegram 并与 **@BotFather** 聊天（确认句柄确认为 `@BotFather`）。

    运行 `/newbot`，按照提示操作，并保存令牌。

  </Step>

  <Step title="配置令牌和私信策略">

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
    Telegram **不**使用 `openclaw channels login telegram`；请在配置/环境变量中配置令牌，然后启动网关。

  </Step>

  <Step title="启动网关并批准第一条私信">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    配对码会在 1 小时后过期。

  </Step>

  <Step title="将机器人添加到群组">
    将机器人添加到您的群组，然后设置 `channels.telegram.groups` 和 `groupPolicy` 以匹配您的访问模型。
  </Step>
</Steps>

<Note>令牌解析顺序是感知账户的。实际上，配置值优先于环境变量回退，且 `TELEGRAM_BOT_TOKEN` 仅适用于默认账户。</Note>

## Telegram 侧设置

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility">
    Telegram 机器人默认处于 **隐私模式**，这限制了它们能接收到的群组消息。

    如果机器人必须查看所有群组消息，请执行以下操作之一：

    - 通过 `/setprivacy` 禁用隐私模式，或者
    - 将机器人设为群组管理员。

    切换隐私模式时，请在每个群组中移除并重新添加机器人，以便 Telegram 应用更改。

  </Accordion>

  <Accordion title="Group permissions">
    管理员状态在 Telegram 群组设置中控制。

    管理员机器人会接收所有群组消息，这对于始终开启的群组行为非常有用。

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` 以允许/禁止添加到群组
    - `/setprivacy` 用于群组可见性行为

  </Accordion>
</AccordionGroup>

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.telegram.dmPolicy` 控制私信访问权限：

    - `pairing` （默认）
    - `allowlist` （`allowFrom` 中至少需要一个发送者 ID）
    - `open` （`allowFrom` 必须包含 `"*"`）
    - `disabled`

    `channels.telegram.allowFrom` 接受数字形式的 Telegram 用户 ID。`telegram:` / `tg:` 前缀会被接受并标准化。
    如果 `dmPolicy: "allowlist"` 的 `allowFrom` 为空，则会阻止所有私信，并且会被配置验证拒绝。
    设置仅要求提供数字用户 ID。
    如果您进行了升级，并且您的配置包含 `@username` 允许列表条目，请运行 `openclaw doctor --fix` 来解析它们（尽力而为；需要一个 Telegram bot 令牌）。
    如果您之前依赖配对存储（pairing-store）允许列表文件，`openclaw doctor --fix` 可以在允许列表流程中将条目恢复到 `channels.telegram.allowFrom` 中（例如，当 `dmPolicy: "allowlist"` 尚无显式 ID 时）。

    对于单一所有者的 bot，首选使用带有显式数字 `allowFrom` ID 的 `dmPolicy: "allowlist"`，以使配置中的访问策略持久化（而不是依赖之前的配对批准）。

    常见误区：私信配对批准并不意味着“该发送者在任何地方都已获授权”。
    配对仅授予私信访问权限。群组发送者的授权仍来自显式的配置允许列表。
    如果您希望“只需授权一次，私信和群组命令均可工作”，请将您的数字 Telegram 用户 ID 放入 `channels.telegram.allowFrom` 中。

    ### 查找您的 Telegram 用户 ID

    更安全的方法（无需第三方 bot）：

    1. 私信您的 bot。
    2. 运行 `openclaw logs --follow`。
    3. 读取 `from.id`。

    官方 Bot API 方法：

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    第三方方法（隐私性较差）：`@userinfobot` 或 `@getidsbot`。

  </Tab>

  <Tab title="组策略和允许列表">
    两项控制措施共同生效：

    1. **允许哪些组** (`channels.telegram.groups`)
       - 未配置 `groups`：
         - 启用 `groupPolicy: "open"` 时：任何组都可以通过组 ID 检查
         - 启用 `groupPolicy: "allowlist"` 时（默认）：组将被阻止，直到您添加 `groups` 条目（或 `"*"`）
       - 已配置 `groups`：作为允许列表生效（显式 ID 或 `"*"`）

    2. **组内允许哪些发送者** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist`（默认）
       - `disabled`

    `groupAllowFrom` 用于组发送者筛选。如果未设置，Telegram 将回退到 `allowFrom`。
    `groupAllowFrom` 条目应为数字 Telegram 用户 ID（`telegram:` / `tg:` 前缀会被标准化）。
    请勿将 Telegram 组或超级组聊天 ID 放入 `groupAllowFrom` 中。负数聊天 ID 应归入 `channels.telegram.groups` 下。
    非数字条目在发送者授权时会被忽略。
    安全边界（`2026.2.25+`）：组发送者授权**不**继承 私信 配对存储中的批准。
    配对仅限 私信。对于组，请设置 `groupAllowFrom` 或每组/每主题的 `allowFrom`。
    如果未设置 `groupAllowFrom`，Telegram 将回退到配置 `allowFrom`，而非配对存储。
    单一所有者机器人的实用模式：在 `channels.telegram.allowFrom` 中设置您的用户 ID，保持 `groupAllowFrom` 未设置，并在 `channels.telegram.groups` 下允许目标组。
    运行时说明：如果完全缺少 `channels.telegram`，除非显式设置 `channels.defaults.groupPolicy`，否则运行时默认为 `groupPolicy="allowlist"` 失败关闭模式。

    示例：允许特定组中的任何成员：

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

    示例：仅允许特定组内的特定用户：

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
      常见错误：`groupAllowFrom` 不是 Telegram 组的允许列表。

      - 将负数的 Telegram 组或超级组聊天 ID（如 `-1001234567890`）放在 `channels.telegram.groups` 下。
      - 当您想限制允许组内哪些人可以触发机器人时，将 Telegram 用户 ID（如 `8734062810`）放在 `groupAllowFrom` 下。
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
- 路由是确定性的：Telegram 入站回复会发回 Telegram（模型不选择渠道）。
- 入站消息会规范化为共享渠道信封，其中包含回复元数据和媒体占位符。
- 群组会话按群组 ID 隔离。论坛主题附加 `:topic:<threadId>` 以保持主题隔离。
- 私信消息可以携带 `message_thread_id`；OpenClaw 使用感知线程的会话密钥进行路由，并保留线程 ID 以供回复。
- 长轮询使用 grammY 运行器进行每聊天/每线程排序。整体运行器接收器并发使用 `agents.defaults.maxConcurrent`。
- 长轮询在每个网关进程内部受到保护，因此一次只能有一个活跃的轮询器使用机器人令牌。如果您仍然看到 `getUpdates` 409 冲突，则另一个 OpenClaw 网关、脚本或外部轮询器可能正在使用相同的令牌。
- 默认情况下，长轮询看门狗重启触发器会在 120 秒没有完成 `getUpdates` 活动检查后启动。仅当您的部署在长时间运行的工作期间仍然出现虚假的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。该值以毫秒为单位，允许范围从 `30000` 到 `600000`；支持按账户覆盖。
- Telegram Bot API 不支持已读回执（`sendReadReceipts` 不适用）。

## 功能参考

<AccordionGroup>
  <Accordion title="实时流预览（消息编辑）">
    OpenClaw 可以实时流式传输部分回复：

    - 直接聊天：预览消息 + `editMessageText`
    - 群组/话题：预览消息 + `editMessageText`

    要求：

    - `channels.telegram.streaming` 为 `off | partial | block | progress`（默认：`partial`）
    - `progress` 在 Telegram 上映射为 `partial`（与跨渠道命名兼容）
    - `streaming.preview.toolProgress` 控制 工具/进度更新是否复用同一条编辑过的预览消息（当预览流处于活动状态时，默认：`true`）
    - 会检测旧版 `channels.telegram.streamMode` 和布尔 `streaming` 值；运行 `openclaw doctor --fix` 将其迁移到 `channels.telegram.streaming.mode`

    工具进度预览更新是指在 工具运行时显示的简短“Working...”行，例如命令执行、文件读取、规划更新或补丁摘要。Telegram 默认保持启用状态，以匹配 `v2026.4.22` 及更高版本中发布的 OpenClaw 行为。要保留答案文本的编辑预览但隐藏工具进度行，请设置：

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

    仅当您想完全禁用 Telegram 预览编辑时才使用 `streaming.mode: "off"`。当您只想禁用工具进度状态行时，请使用 `streaming.preview.toolProgress: false`。

    对于纯文本回复：

    - 短暂的 私信/群组/话题预览：OpenClaw 会保留同一条预览消息并执行原地最终编辑
    - 超过约一分钟的预览：OpenClaw 会将完成的回复作为一条新的最终消息发送，然后清理预览，因此 Telegram 的可见时间戳反映的是完成时间而不是预览创建时间

    对于复杂回复（例如媒体负载），OpenClaw 会回退到正常最终传递，然后清理预览消息。

    预览流式传输与 分块流式传输是分开的。当为 Telegram 显式启用分块流式传输时，OpenClaw 会跳过预览流以避免双重流式传输。

    如果原生草稿传输不可用/被拒绝，OpenClaw 会自动回退到 `sendMessage` + `editMessageText`。

    Telegram 专用推理流：

    - `/reasoning stream` 在生成时将推理发送到实时预览
    - 最终答案不包含推理文本

  </Accordion>

  <Accordion title="格式化与 HTML 回退">
    出站文本使用 Telegram `parse_mode: "HTML"`。

    - 类 Markdown 文本会被渲染为安全的 Telegram HTML。
    - 原始模型 HTML 会被转义，以减少 Telegram 解析失败的情况。
    - 如果 Telegram 拒绝已解析的 HTML，OpenClaw 将重试为纯文本。

    默认启用链接预览，可以通过 `channels.telegram.linkPreview: false` 禁用。

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
    - 有效模式：`a-z`、`0-9`、`_`，长度 `1..32`
    - 自定义命令不能覆盖原生命令
    - 冲突/重复项将被跳过并记录

    注意事项：

    - 自定义命令仅作为菜单条目；它们不会自动实现行为
    - 即使未在 Telegram 菜单中显示，插件/技能命令在输入时仍可能工作

    如果禁用了原生命令，内置命令将被移除。如果已配置，自定义/插件命令仍可能注册。

    常见设置失败：

    - 带有 `BOT_COMMANDS_TOO_MUCH` 的 `setMyCommands failed` 表示 Telegram 菜单在修剪后仍然溢出；请减少插件/技能/自定义命令或禁用 `channels.telegram.commands.native`。
    - 带有网络/获取错误的 `setMyCommands failed` 通常表示到 `api.telegram.org` 的出站 DNS/HTTPS 被阻止。

    ### 设备配对命令（`device-pair` 插件）

    安装 `device-pair` 插件后：

    1. `/pair` 生成设置代码
    2. 将代码粘贴到 iOS 应用中
    3. `/pair pending` 列出待处理请求（包括角色/scopes）
    4. 批准请求：
       - `/pair approve <requestId>` 用于明确批准
       - 当只有一个待处理请求时使用 `/pair approve`
       - `/pair approve latest` 用于最近的一个

    设置代码携带一个短期引导令牌。内置引导交接将主节点令牌保留在 `scopes: []`；任何交接的操作员令牌都保持受限于 `operator.approvals`、`operator.read`、`operator.talk.secrets` 和 `operator.write`。引导范围检查带有角色前缀，因此操作员白名单仅满足操作员请求；非操作员角色仍需要在其自己的角色前缀下拥有范围。

    如果设备使用更改的身份验证详细信息（例如角色/scopes/公钥）重试，则先前的待处理请求将被取代，新请求使用不同的 `requestId`。批准前请重新运行 `/pair pending`。

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

    回调查询点击作为文本传递给代理：
    `callback_data: <value>`

  </Accordion>

  <Accordion title="适用于代理和自动化的 Telegram 消息操作">
    Telegram 工具操作包括：

    - `sendMessage` (`to`, `content`, 可选 `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, 可选 `iconColor`, `iconCustomEmojiId`)

    频道消息操作公开符合人体工程学的别名 (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`)。

    控制开关：

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (默认：禁用)

    注意：`edit` 和 `topic-create` 目前默认已启用，并且没有单独的 `channels.telegram.actions.*` 切换开关。
    运行时发送使用活动的配置/密钥快照 (启动/重新加载)，因此操作路径不会在每次发送时执行临时的 SecretRef 重新解析。

    表情符号移除语义：[/tools/reactions](/zh/tools/reactions)

  </Accordion>

  <Accordion title="回复线索标记">
    Telegram 支持在生成输出中使用显式回复线索标记：

    - `[[reply_to_current]]` 回复触发消息
    - `[[reply_to:<id>]]` 回复特定的 Telegram 消息 ID

    `channels.telegram.replyToMode` 控制处理方式：

    - `off`（默认）
    - `first`
    - `all`

    当启用回复线索且原始 Telegram 文本或说明可用时，OpenClaw 会自动包含原生 Telegram 引用摘录。Telegram 将原生引用文本限制为 1024 个 UTF-16 代码单位，因此较长的消息会从开头开始引用；如果 Telegram 拒绝该引用，则会回退到普通回复。

    注意：`off` 会禁用隐式回复线索。显式的 `[[reply_to_*]]` 标记仍然有效。

  </Accordion>

  <Accordion title="Forum topics and thread behavior">
    论坛超级群组：

    - 话题会话键附加 `:topic:<threadId>`
    - 回复和输入状态的目标是话题串
    - 话题配置路径：
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    常规话题 (`threadId=1`) 特殊情况：

    - 发送消息时省略 `message_thread_id` (Telegram 拒绝 `sendMessage(...thread_id=1)`)
    - 输入动作仍包含 `message_thread_id`

    话题继承：除非被覆盖，话题条目继承群组设置 (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`)。
    `agentId` 仅限于话题，不从群组默认值继承。

    **按话题代理路由**：每个话题可以通过在话题配置中设置 `agentId` 来路由到不同的代理。这为每个话题提供了其独立的隔离工作区、内存和会话。例如：

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

    然后每个话题都有自己的会话键：`agent:zu:telegram:group:-1001234567890:topic:3`

    **持久化 ACP 话题绑定**：论坛话题可以通过顶层类型的 ACP 绑定（`bindings[]` 具有 `type: "acp"` 和 `match.channel: "telegram"`，`peer.kind: "group"`，以及类似 `-1001234567890:topic:42` 的话题限定 ID）来固定 ACP 驾驭会话。目前范围限于群组/超级群组中的论坛话题。参见 [ACP Agents](/zh/tools/acp-agents)。

    **从聊天启动的线程绑定 ACP**：`/acp spawn <agent> --thread here|auto` 将当前话题绑定到新的 ACP 会话；后续回复直接路由到那里。OpenClaw 将启动确认固定在话题内。需要 `channels.telegram.threadBindings.spawnAcpSessions=true`。

    模板上下文公开 `MessageThreadId` 和 `IsForum`。带有 `message_thread_id` 的私信 聊天保持私信路由，但使用线程感知的会话键。

  </Accordion>

  <Accordion title="音频、视频和贴纸">
    ### 音频消息

    Telegram 区分语音笔记和音频文件。

    - 默认：音频文件行为
    - 在代理回复中标记 `[[audio_as_voice]]` 以强制发送语音笔记
    - 传入的语音笔记转录文本在代理上下文中被构造成机器生成的、不受信任的文本；提及检测仍然使用原始转录文本，因此通过提及筛选的语音消息可以继续工作。

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

    传入贴纸的处理：

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

    贴纸仅描述一次（如果可能）并被缓存，以减少重复的视觉调用。

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
    Telegram 的表情反应作为 `message_reaction` 更新到达（与消息负载分离）。

    启用后，OpenClaw 会将系统事件加入队列，例如：

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    配置：

    - `channels.telegram.reactionNotifications`: `off | own | all` (默认: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (默认: `minimal`)

    注意事项：

    - `own` 意味着仅限用户对机器人发送的消息的反应（通过已发送消息缓存尽力而为）。
    - 反应事件仍需遵守 Telegram 访问控制 (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`)；未授权的发送者将被丢弃。
    - Telegram 不在反应更新中提供话题 ID。
      - 非论坛群组路由到群组聊天会话
      - 论坛群组路由到群组的一般话题会话 (`:topic:1`)，而不是确切的原始话题

    用于轮询/Webhook 的 `allowed_updates` 自动包含 `message_reaction`。

  </Accordion>

  <Accordion title="Ack reactions">
    当 OpenClaw 正在处理入站消息时，`ackReaction` 会发送一个确认表情符号。

    解析顺序：

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - 代理身份表情符号回退 (`agents.list[].identity.emoji`，否则为 "👀")

    注意事项：

    - Telegram 期望 unicode 表情符号 (例如 "👀")。
    - 使用 `""` 为渠道或帐户禁用此反应。

  </Accordion>

  <Accordion title="来自 Telegram 事件和命令的配置写入">
    通道配置写入默认处于启用状态 (`configWrites !== false`)。

    由 Telegram 触发的写入包括：

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
    默认使用长轮询。要使用 Webhook 模式，请设置 `channels.telegram.webhookUrl` 和 `channels.telegram.webhookSecret`；可选 `webhookPath`、`webhookHost`、`webhookPort` (默认值分别为 `/telegram-webhook`、`127.0.0.1`、`8787`)。

    本地监听器绑定到 `127.0.0.1:8787`。对于公共入口，可以在本地端口前放置反向代理，或者有意设置 `webhookHost: "0.0.0.0"`。

    Webhook 模式会在向 Telegram 返回 `200` 之前验证请求守卫、Telegram 密钥令牌和 JSON 正文。
    OpenClaw 随后通过与长轮询相同的每会话/每主题机器人通道异步处理更新，因此缓慢的代理轮次不会阻塞 Telegram 的传递确认 (ACK)。

  </Accordion>

  <Accordion title="限制、重试和 CLI 目标">
    - `channels.telegram.textChunkLimit` 默认为 4000。
    - `channels.telegram.chunkMode="newline"` 优先在段落边界（空行）处进行长度分割。
    - `channels.telegram.mediaMaxMb`（默认 100）限制了入站和出站的 CLI 媒体大小。
    - `channels.telegram.timeoutSeconds` 会覆盖 Telegram Telegram 客户端的超时时间（如果未设置，则应用 API 的默认值）。
    - `channels.telegram.pollingStallThresholdMs` 默认为 `120000`；仅在出现误报导致的轮询停滞重启时，才在 `30000` 和 `600000` 之间进行调整。
    - 群组上下文历史记录使用 `channels.telegram.historyLimit` 或 `messages.groupChat.historyLimit`（默认 50）；`0` 表示禁用。
    - 回复/引用/转发的补充上下文目前按接收到的原样传递。
    - grammY 白名单主要用于控制谁能触发 Agent，而不是作为完整的补充上下文编辑边界。
    - 私信历史记录控制：
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - `channels.telegram.retry` 配置适用于 Telegram 发送辅助工具（Telegram/tools/actions），用于处理可恢复的出站 CLI 错误。

    CLI 发送目标可以是数字聊天 ID 或用户名：

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    API 投票使用 `openclaw message poll` 并支持论坛主题：

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    CLI 专用的投票标志：

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` 用于论坛主题（或使用 `:topic:` 目标）

    Telegram 发送还支持：

    - `--presentation`，当 `channels.telegram.capabilities.inlineButtons` 允许时，带有 `buttons` 块用于内联键盘
    - `--pin` 或 `--delivery '{"pin":true}'`，当机器人可以在该聊天中置顶消息时，请求置顶投递
    - `--force-document`，将出站图片和 GIF 作为文档发送，而不是压缩的照片或动画媒体上传

    动作门控：

    - `channels.telegram.actions.sendMessage=false` 禁用出站 Telegram 消息，包括投票
    - `channels.telegram.actions.poll=false` 禁用 Telegram 投票创建，但保留常规发送功能

  </Accordion>

  <Accordion title="在 Telegram 中执行审批">
    Telegram 支持在审批人私信中进行执行审批，并可以选择在原始聊天或话题中发布提示。审批人必须是数字形式的 Telegram 用户 ID。

    配置路径：

    - `channels.telegram.execApprovals.enabled` （当至少有一个审批人可解析时自动启用）
    - `channels.telegram.execApprovals.approvers` （回退到来自 `allowFrom` / `defaultTo` 的数字所有者 ID）
    - `channels.telegram.execApprovals.target`: `dm` （默认） | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    频道投递会在聊天中显示命令文本；仅在受信任的群组/话题中启用 `channel` 或 `both`。当提示进入论坛话题时，Telegram 会为审批提示及后续跟进保留该话题。执行审批默认在 30 分钟后过期。

    内联审批按钮还需要 `channels.telegram.capabilities.inlineButtons` 以允许目标界面（`dm`、`group` 或 `all`）。带有 `plugin:` 前缀的审批 ID 通过插件审批解析；其他则优先通过执行审批解析。

    请参阅 [执行审批](/zh/tools/exec-approvals)。

  </Accordion>
</AccordionGroup>

## 错误回复控制

当代理遇到投递或提供商错误时，Telegram 可以回复错误文本或将其抑制。两个配置键控制此行为：

| 键                                  | 值                | 默认值  | 描述                                                          |
| ----------------------------------- | ----------------- | ------- | ------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` 向聊天发送友好的错误消息。`silent` 完全禁止错误回复。 |
| `channels.telegram.errorCooldownMs` | 数字（毫秒）      | `60000` | 向同一聊天的错误回复之间的最短时间。防止故障期间错误刷屏。    |

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
```

## 故障排除

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - 如果 `requireMention=false`，Telegram 隐私模式必须允许完全可见。
      - BotFather: `/setprivacy` -> Disable
      - 然后将机器人从群组中移除并重新添加
    - 当配置期望非提及的群组消息时，`openclaw channels status` 会发出警告。
    - `openclaw channels status --probe` 可以检查显式的数字群组 ID；通配符 `"*"` 无法探测成员身份。
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
    - `setMyCommands failed` 并伴有 `BOT_COMMANDS_TOO_MUCH` 意味着原生菜单条目过多；请减少插件/技能/自定义命令或禁用原生菜单
    - `setMyCommands failed` 并伴有网络/获取错误通常表示对 `api.telegram.org` 的 DNS/HTTPS 访问问题

  </Accordion>

  <Accordion title="轮询或网络不稳定">

    - Node 22+ + 自定义 fetch/proxy 如果 AbortSignal 类型不匹配，可能会触发立即中止行为。
    - 某些主机优先将 `api.telegram.org` 解析为 IPv6；损坏的 IPv6 出口可能会导致间歇性的 Telegram API 故障。
    - 如果日志包含 `TypeError: fetch failed` 或 `Network request for 'getUpdates' failed!`，OpenClaw 现在会将这些作为可恢复的网络错误进行重试。
    - 如果日志包含 `Polling stall detected`，默认情况下，OpenClaw 会在 120 秒内未完成长轮询存活检查时重启轮询并重建 Telegram 传输。
    - 仅当长时间运行的 `getUpdates` 调用健康但您的主机仍报告虚假的轮询停滞重启时，才增加 `channels.telegram.pollingStallThresholdMs`。持续的停滞通常指向主机与 `api.telegram.org` 之间的代理、DNS、IPv6 或 TLS 出口问题。
    - 在直接出口/TLS 不稳定的 VPS 主机上，通过 `channels.telegram.proxy` 路由 Telegram API 调用：

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ 默认为 `autoSelectFamily=true`（WSL2 除外）和 `dnsResultOrder=ipv4first`。
    - 如果您的主机是 WSL2 或明确在仅 IPv4 行为下工作得更好，请强制系列选择：

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - 默认情况下，RFC 2544 基准范围答案 (`198.18.0.0/15`) 已被允许用于 Telegram 媒体下载。如果在媒体下载期间，受信任的虚假 IP 或透明代理将 `api.telegram.org` 重写为其他私有/内部/特殊用途地址，您可以选择加入 Telegram 专用绕过：

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - 每个帐户也可以在 `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork` 处获得相同的选择加入选项。
    - 如果您的代理将 Telegram 媒体主机解析为 `198.18.x.x`，请首先关闭危险标志。Telegram 媒体默认已允许 RFC 2544 基准范围。

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` 会削弱 Telegram
      媒体 SSRF 保护。仅当它们在 RFC 2544 基准范围之外合成私有或特殊用途答案时，才将其用于受信任的操作员控制的代理环境（如 Clash、Mihomo 或 Surge 虚假 IP 路由）。对于正常的公共互联网 Telegram 访问，请将其关闭。
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

主要参考：[配置参考 - Telegram](/zh/gateway/config-channels#telegram)。

<Accordion title="高优先级 Telegram 字段">

- startup/auth: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` 必须指向常规文件；符号链接会被拒绝)
- access control: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, 顶级 `bindings[]` (`type: "acp"`)
- exec approvals: `execApprovals`, `accounts.*.execApprovals`
- command/menu: `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/replies: `replyToMode`
- streaming: `streaming` (预览), `streaming.preview.toolProgress`, `blockStreaming`
- formatting/delivery: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network: `mediaMaxMb`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions: `reactionNotifications`, `reactionLevel`
- errors: `errorPolicy`, `errorCooldownMs`
- writes/history: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>多账户优先级：当配置了两个或更多账户 ID 时，请设置 `channels.telegram.defaultAccount`（或包含 `channels.telegram.accounts.default`）以明确默认路由。否则 OpenClaw 将回退到第一个标准化的账户 ID，并且 `openclaw doctor` 会发出警告。命名账户继承 `channels.telegram.allowFrom` / `groupAllowFrom`，但不继承 `accounts.default.*` 值。</Note>

## 相关

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    将 Telegram 用户与网关配对。
  </Card>
  <Card title="Groups" icon="users" href="/zh/channels/groups">
    群组和主题允许列表行为。
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
