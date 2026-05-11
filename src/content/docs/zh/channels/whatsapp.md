---
summary: "WhatsApp 渠道支持、访问控制、传递行为和操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

状态：通过 WhatsApp Web (Baileys) 已可用于生产环境。Gateway(网关) 拥有已链接的会话。

## 安装（按需）

- 当您首次选择 WhatsApp 插件时，新手引导 (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  会提示您安装该插件。
- 当插件尚不存在时，`openclaw channels login --channel whatsapp` 也提供安装流程。
- Dev 渠道 + git checkout：默认为本地插件路径。
- Stable/Beta：默认为 npm 包 `@openclaw/whatsapp`。

手动安装仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    对于未知发件人，默认的私信 策略是配对。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关) 配置" icon="settings" href="/zh/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="配置 WhatsApp 访问策略">

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

  </Step>

  <Step title="链接 WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    对于特定账户：

```bash
openclaw channels login --channel whatsapp --account work
```

    要在登录之前附加现有/自定义 WhatsApp Web 认证目录：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="启动网关">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配对请求（如果使用配对模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求将在 1 小时后过期。每个渠道的待处理请求上限为 3 个。

  </Step>
</Steps>

<Note>OpenClaw 建议尽可能在单独的电话号码上运行 WhatsApp。（渠道元数据和设置流程已针对该设置进行了优化，但也支持个人号码设置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated number (recommended)">
    这是最干净的操作模式：

    - WhatsApp 为 OpenClaw 提供单独的身份
    - 更清晰的 私信 白名单和路由边界
    - 更低的自聊混淆风险

    最小策略模式：

    ```json5
    {
      channels: {
        whatsapp: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Personal-number fallback">
    新手引导 支持个人号码模式，并写入一个对自聊友好的基准：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护取决于关联的自身号码和 `allowFrom`。

  </Accordion>

  <Accordion title="WhatsApp Web-only 渠道 scope">
    消息平台 渠道基于 WhatsApp Web（`Baileys`），位于当前的 OpenClaw 渠道架构中。

    在内置的 chat-渠道 注册表中，没有单独的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp 套接字和重连循环。
- 重连监视器使用 WhatsApp Web 传输活动，而不仅仅是入站应用消息量，因此如果最近没有人发送消息，安静的关联设备 会话不会仅仅因此而被重启。如果传输帧持续到达但在监视器窗口内没有处理任何应用消息，更长的应用静默上限仍会强制重新连接。
- 出站发送需要为目标账户提供活动的 WhatsApp 侦听器。
- 状态和广播聊天会被忽略（`@status`、`@broadcast`）。
- 直接聊天使用 私信 会话 规则（`session.dmScope`；默认 `main` 会将 私信 折叠到代理主 会话）。
- 群组 会话是隔离的（`agent:<agentId>:whatsapp:group:<jid>`）。
- WhatsApp Web 传输遵守网关主机上的标准代理 环境变量（`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` / 小写变体）。优先使用主机级代理配置，而不是特定于渠道的 WhatsApp 代理设置。
- 当启用 `messages.removeAckAfterReply` 时，OpenClaw 会在传递可见回复后清除 WhatsApp ack 反应。

## 插件挂钩和隐私

WhatsApp 入站消息可能包含个人消息内容、电话号码、组标识符、发件人名称和会话关联字段。因此，除非您明确选择加入，否则 WhatsApp 不会向插件广播入站 `message_received` 挂钩负载：

```json5
{
  channels: {
    whatsapp: {
      pluginHooks: {
        messageReceived: true,
      },
    },
  },
}
```

您可以将选择加入范围限定为一个账户：

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        work: {
          pluginHooks: {
            messageReceived: true,
          },
        },
      },
    },
  },
}
```

仅为您信任的能够接收入站 WhatsApp 消息内容和标识符的插件启用此功能。

## 访问控制和激活

<Tabs>
  <Tab title="私信 policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问权限：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 样式的号码（在内部进行规范化）。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（和 `allowFrom`）优先于该账户的渠道级别默认值。

    运行时行为详情：

    - 配对会保存在渠道允许存储中，并与已配置的 `allowFrom` 合并
    - 如果未配置允许列表，则默认允许关联的自有号码
    - OpenClaw 永远不会自动配对出站 `fromMe` 私信（您从关联设备发送给自己的消息）

  </Tab>

  <Tab title="Group policy + allowlists">
    群组访问权限分为两层：

    1. **群组成员允许列表** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，则所有群组都符合资格
       - 如果存在 `groups`，则它作为群组允许列表 (`"*"` 已允许)

    2. **群组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: 绕过发送者允许列表
       - `allowlist`: 发送者必须匹配 `groupAllowFrom` (或 `*`)
       - `disabled`: 阻止所有群组入站消息

    发送者允许列表回退机制：

    - 如果未设置 `groupAllowFrom`，运行时会在可用时回退到 `allowFrom`
    - 发送者允许列表在提及/回复激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 块，运行时群组策略回退为 `allowlist` (并带有警告日志)，即使设置了 `channels.defaults.groupPolicy` 也是如此。

  </Tab>

  <Tab title="Mentions + /activation">
    默认情况下，群组回复需要提及。

    提及检测包括：

    - 对机器人身份的明确 WhatsApp 提及
    - 配置的提及正则表达式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 已授权群组消息的入站语音笔记转录
    - 隐式回复机器人检测（回复发送者与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及门槛；它**不**授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，即使非允许列表中的发送者回复了允许列表用户的消息，他们仍会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者限制。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的个人号码也存在于 `allowFrom` 中时，WhatsApp 自聊安全保护功能会激活：

- 跳过自聊回合的已读回执
- 忽略提及-JID 自动触发行为，否则会通知你自己
- 如果 `messages.responsePrefix` 未设置，自聊天回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息标准化和上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息封装在共享的入站信封中。

    如果存在引用回复，上下文将以这种形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也会被填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、发送者 JID/E.164）。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅媒体的入站消息使用占位符进行标准化，例如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    当正文仅为 `<media:audio>` 时，授权的群组语音笔记会在提及门控之前进行转录，因此在语音笔记中说机器人提及可以触发回复。如果转录文本仍然未提及机器人，则转录文本将保留在待处理的群组历史记录中，而不是原始占位符。

    位置正文使用简短的坐标文本。位置标签/评论和联系人/vCard 详细信息呈现为围栏不受信任的元数据，而不是内联提示文本。

  </Accordion>

  <Accordion title="待处理群组历史记录注入">
    对于群组，未处理的消息可以被缓存并作为上下文注入，当机器人最终被触发时。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Read receipts">
    对于已接受的入站 WhatsApp 消息，默认已启用阅读回执。

    全局禁用：

    ```json5
    {
      channels: {
        whatsapp: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    按账户覆盖：

    ```json5
    {
      channels: {
        whatsapp: {
          accounts: {
            work: {
              sendReadReceipts: false,
            },
          },
        },
      },
    }
    ```

    即使全局已启用，自聊也会跳过阅读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块和媒体

<AccordionGroup>
  <Accordion title="Text chunking">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先采用段落边界（空行），然后回退到长度安全的分块方式
  </Accordion>

<Accordion title="Outbound media behavior">
  - 支持图片、视频、音频（PTT 语音笔记）和文档负载 - 音频媒体通过 Baileys `audio` 负载并带有 `ptt: true` 发送，因此 WhatsApp 客户端将其渲染为按住即讲（PTT）语音笔记 - 回复负载保留 `audioAsVoice`；WhatsApp 的 TTS 语音笔记输出即使提供商返回 MP3 或 WebM 也保持在此 PTT 路径上 - 原生 Ogg/Opus 音频作为 `audio/ogg; codecs=opus` 发送，以实现语音笔记兼容性 - 非 Ogg 音频（包括 Microsoft Edge TTS MP3/WebM
  输出）会在 PTT 投递前使用 `ffmpeg` 转码为 48 kHz 单声道 Ogg/Opus - `/tts latest` 将最新的助手回复作为一个语音笔记发送，并抑制同一回复的重复发送；`/tts chat on|off|default` 控制当前 WhatsApp 聊天的自动 TTS - 通过视频发送上的 `gifPlayback: true` 支持动画 GIF 播放 - 发送多媒体回复负载时，字幕将应用于第一个媒体项，但 PTT 语音笔记会先发送音频，然后单独发送可见文本，因为 WhatsApp
  客户端渲染语音笔记字幕的方式不一致 - 媒体来源可以是 HTTP(S)、`file://` 或本地路径
</Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图像会自动优化（调整大小/质量扫描）以适应限制
    - 媒体发送失败时，第一项回退会发送文本警告，而不是静默丢弃响应
  </Accordion>
</AccordionGroup>

## 回复引用

WhatsApp 支持原生回复引用，其中出站回复会显式引用入站消息。通过 `channels.whatsapp.replyToMode` 进行控制。

| 值          | 行为                                         |
| ----------- | -------------------------------------------- |
| `"off"`     | 从不引用；作为普通消息发送                   |
| `"first"`   | 仅引用第一个出站回复块                       |
| `"all"`     | 引用每个出站回复块                           |
| `"batched"` | 引用排队的批量回复，同时保持即时回复不被引用 |

默认为 `"off"`。每个账户的覆盖使用 `channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "first",
    },
  },
}
```

## 反应级别

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上广泛使用表情符号反应的程度：

| 级别          | 确认反应 | 代理发起的反应 | 描述                      |
| ------------- | -------- | -------------- | ------------------------- |
| `"off"`       | 否       | 否             | 完全没有反应              |
| `"ack"`       | 是       | 否             | 仅确认反应（回复前回执）  |
| `"minimal"`   | 是       | 是（保守）     | 确认 + 保守指导的代理反应 |
| `"extensive"` | 是       | 是（鼓励）     | 确认 + 鼓励指导的代理反应 |

默认值：`"minimal"`。

每个账户的覆盖使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

```json5
{
  channels: {
    whatsapp: {
      reactionLevel: "ack",
    },
  },
}
```

## 确认反应

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站回执进行即时确认反应。
确认反应受 `reactionLevel` 限制 — 当 `reactionLevel` 为 `"off"` 时，它们将被抑制。

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // always | mentions | never
      },
    },
  },
}
```

行为说明：

- 在接受入站消息后立即发送（回复前）
- 失败会被记录，但不会阻止正常回复的发送
- 群组模式 `mentions` 对提及触发的轮次做出反应；群组激活 `always` 充当此检查的绕过方式
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧版 `messages.ackReaction`）

## 多账户和凭据

<AccordionGroup>
  <Accordion title="Account selection and defaults">
    - 账户 ID 来自 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在则选择 `default`，否则选择第一个配置的账户 ID（已排序）
    - 账户 ID 在内部进行规范化以供查找
  </Accordion>

  <Accordion title="Credential paths and legacy compatibility">
    - 当前身份验证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认身份验证仍会被识别/迁移，用于默认账户流程
  </Accordion>

  <Accordion title="Logout behavior">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该账户的 WhatsApp 身份验证状态。

    在旧版身份验证目录中，`oauth.json` 会被保留，而 Baileys 身份验证文件会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- 代理工具支持包括 WhatsApp 反应操作（`react`）。
- 操作限制：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 渠道发起的配置写入默认已启用（可通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排除

<AccordionGroup>
  <Accordion title="Not linked (QR required)">
    症状：渠道状态报告显示未链接。

    修复方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已链接但断开连接 / 重连循环">
    症状：已链接的账户出现反复断开或尝试重新连接的情况。

    不活跃的账户可能会在正常消息超时后仍保持连接；当 WhatsApp Web 传输活动停止、套接字关闭或应用层活动在更长的安全窗口内保持静默时，看门狗会重启。

    修复方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如果需要，请使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="代理后 QR 登录超时">
    症状：`openclaw channels login --channel whatsapp` 在显示可用的 QR 码之前失败，报错 `status=408 Request Time-out` 或 TLS 套接字断开连接。

    WhatsApp Web 登录使用网关主机的标准代理环境（`HTTPS_PROXY`、`HTTP_PROXY`、小写变体以及 `NO_PROXY`）。请验证网关进程继承了代理环境变量，并且 `NO_PROXY` 不匹配 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    当目标账户不存在活动的网关监听器时，出站发送会快速失败。

    请确保网关正在运行且账户已链接。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许列表条目
    - 提及过滤（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的条目，因此请为每个作用域保留单个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 系统提示

WhatsApp 支持通过 `groups` 和 `direct` 映射，为群组和直接聊天提供 Telegram 风格的系统提示词。

群组消息的解析层级：

首先确定有效的 `groups` 映射：如果账号定义了自己的 `groups`，它将完全替换根 `groups` 映射（不进行深度合并）。然后对生成的单个映射运行提示词查找：

1. **群组特定系统提示词** (`groups["<groupId>"].systemPrompt`)：当映射中存在特定群组条目**并且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串 (`""`)，则通配符被抑制，并且不应用系统提示词。
2. **群组通配符系统提示词** (`groups["*"].systemPrompt`)：当映射中完全缺少特定群组条目，或者当条目存在但未定义 `systemPrompt` 键时使用。

直接消息的解析层级：

首先确定有效的 `direct` 映射：如果账号定义了自己的 `direct`，它将完全替换根 `direct` 映射（不进行深度合并）。然后对生成的单个映射运行提示词查找：

1. **直接特定系统提示词** (`direct["<peerId>"].systemPrompt`)：当映射中存在特定对等条目**并且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串 (`""`)，则通配符被抑制，并且不应用系统提示词。
2. **直接通配符系统提示词** (`direct["*"].systemPrompt`)：当映射中完全缺少特定对等条目，或者当条目存在但未定义 `systemPrompt` 键时使用。

<Note>
`dms` 仍然是轻量级单条私信历史记录覆盖桶 (`dms.<id>.historyLimit`)。提示词覆盖位于 `direct` 下。
</Note>

**与 Telegram 多账号行为的区别：** 在 Telegram 中，在多账号设置中，会故意为所有帐号（甚至是那些没有定义自己的 `groups` 的帐号）抑制根 `groups`，以防止机器人接收它不属于的群组的群组消息。WhatsApp 不应用此保护：对于未定义帐号级别覆盖的帐号，无论配置了多少个帐号，始终会继承根 `groups` 和根 `direct`。在多账号 WhatsApp 设置中，如果您希望每个帐号都有单独的群组或直接提示，请明确在每个帐号下定义完整的映射，而不是依赖根级别的默认值。

重要行为：

- `channels.whatsapp.groups` 既是每个群组的配置映射，也是聊天级别的群组允许列表。在根范围或帐号范围内，`groups["*"]` 意味着“该范围接受所有群组”。
- 仅当您已经希望该范围接受所有群组时，才添加通配符群组 `systemPrompt`。如果您仍然只希望一组固定的群组 ID 符合条件，请不要使用 `groups["*"]` 作为提示默认值。相反，请在每个明确列入允许列表的群组条目上重复该提示。
- 群组准入和发件人授权是分开的检查。`groups["*"]` 扩展了可以到达群组处理的群组集合，但它本身并不授权这些群组中的每个发件人。发件人访问权限仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 单独控制。
- `channels.whatsapp.direct` 对于私信没有相同的副作用。`direct["*"]` 仅在私信已通过 `dmPolicy` 加上 `allowFrom` 或配对存储规则准入后，提供默认的直接聊天配置。

示例：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // Use only if all groups should be admitted at the root scope.
        // Applies to all accounts that do not define their own groups map.
        "*": { systemPrompt: "Default prompt for all groups." },
      },
      direct: {
        // Applies to all accounts that do not define their own direct map.
        "*": { systemPrompt: "Default prompt for all direct chats." },
      },
      accounts: {
        work: {
          groups: {
            // This account defines its own groups, so root groups are fully
            // replaced. To keep a wildcard, define "*" explicitly here too.
            "120363406415684625@g.us": {
              requireMention: false,
              systemPrompt: "Focus on project management.",
            },
            // Use only if all groups should be admitted in this account.
            "*": { systemPrompt: "Default prompt for work groups." },
          },
          direct: {
            // This account defines its own direct map, so root direct entries are
            // fully replaced. To keep a wildcard, define "*" explicitly here too.
            "+15551234567": { systemPrompt: "Prompt for a specific work direct chat." },
            "*": { systemPrompt: "Default prompt for work direct chats." },
          },
        },
      },
    },
  },
}
```

## 配置参考指针

主要参考：

- [配置参考 - WhatsApp](/zh/gateway/config-channels#whatsapp)

高价值的 WhatsApp 字段：

- 访问权限： `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, 账户级覆盖
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 会话 behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [安全](/zh/gateway/security)
- [渠道路由](/zh/channels/channel-routing)
- [多代理路由](/zh/concepts/multi-agent)
- [故障排查](/zh/channels/troubleshooting)
