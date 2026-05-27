---
summary: "WhatsAppWhatsApp 渠道支持、访问控制、传递行为和运维"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsAppWhatsApp"
---

状态：通过 WhatsApp Web (Baileys) 已可用于生产环境。Gateway(网关) 拥有已链接的会话。

## 安装（按需）

- 新手引导（`openclaw onboard`）和 `openclaw channels add --channel whatsapp`WhatsApp
  会在您首次选择时提示安装 WhatsApp 插件。
- `openclaw channels login --channel whatsapp` 也在插件尚未安装时
  提供安装流程。
- Dev 渠道 + git checkout：默认为本地插件路径。
- 稳定版/Beta版：首先从 ClawHub 安装官方 `@openclaw/whatsapp`ClawHubnpm 插件，
  并将 npm 作为备选方案。
- WhatsApp 运行时分发在核心 OpenClaw npm 包之外，以便 WhatsApp 特定的运行时依赖保留在外部插件中。

手动安装仍然可用：

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

仅在需要注册表备选方案时才使用裸 npm 包（npm`@openclaw/whatsapp`）。仅在需要可重现的安装时固定确切版本。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    对于未知发送者，默认私信策略为配对。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关)Gateway(网关) 配置" icon="settings" href="/zh/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="WhatsApp配置 WhatsApp 访问策略">

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

  <Step title="WhatsApp关联 WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    当前的登录方式基于二维码。在远程或无头环境中，请确保
    您有可靠的途径在开始登录前将实时二维码传递到将要扫描它的手机上。

    对于特定账户：

````bash
openclaw channels login --channel whatsapp --account work
```WhatsApp

    要在登录之前附加现有的/自定义的 WhatsApp Web 认证目录：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
````

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

    配对请求会在 1 小时后过期。每个渠道最多允许 3 个待处理的请求。

  </Step>
</Steps>

<Note>OpenClaw 建议尽可能在单独的号码上运行 WhatsApp。（渠道元数据和设置流程已针对该设置进行了优化，但也支持个人号码设置。）</Note>

<Warning>当前的 WhatsApp 设置流程仅支持 QR 码。从远程机器中继时，终端渲染的 QR 码、屏幕截图、 PDF 或聊天附件可能会过期或变得不可读。对于远程/无头主机，建议优先使用直接的 QR 码图像 交接路径，而非手动终端捕获。</Warning>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最清晰的操作模式：

    - 为 WhatsApp 分离 OpenClaw 身份
    - 更清晰的私信允许列表和路由边界
    - 降低自聊混淆的几率

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

  <Accordion title="个人号码回退方案">
    新手引导支持个人号码模式，并会写入一个对自聊友好的基准配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包括您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护基于关联的自号码和 `allowFrom` 启用。

  </Accordion>

  <Accordion title="WhatsApp Web 仅限渠道范围">
    消息平台渠道基于 WhatsApp Web（`Baileys`），这是当前 OpenClaw 渠道架构中的实现。

    在内置聊天渠道注册表中，没有单独的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp socket 并负责重连循环。
- 重连看门狗使用 WhatsApp Web 传输活动，而不仅仅是入站应用消息量，因此安静的链接设备会话不会仅仅因为最近没有人发送消息而重启。如果传输帧持续到达但在看门狗窗口内没有处理应用消息，更长的应用静默上限仍会强制重连；对于最近活动的会话，在瞬态重连后，该应用静默检查在第一个恢复窗口内使用正常的消息超时。
- Baileys socket 计时在 Baileys`web.whatsapp.*` 下是显式的：`keepAliveIntervalMs`WhatsApp 控制 WhatsApp Web 应用 ping，`connectTimeoutMs` 控制打开握手超时，`defaultQueryTimeoutMs`Baileys 控制 Baileys 查询超时。
- 出站发送需要目标帐户有一个活动的 WhatsApp 监听器。
- 当令牌匹配当前 WhatsApp 参与者元数据（包括 LID 支持的群组）时，群组发送会为文本和媒体标题中的 `@+<digits>` 和 `@<digits>`WhatsApp 令牌附加原生提及元数据。
- 状态和广播聊天将被忽略 (`@status`, `@broadcast`)。
- 重连看门狗遵循 WhatsApp Web 传输活动，而不仅仅是入站应用消息量：只要传输帧继续，安静的链接设备会话就会保持活动，但传输停滞会强制重连，远早于随后的远程断开连接路径。
- 直接聊天使用私信会话规则 (`session.dmScope`；默认的 `main` 会将私信折叠到代理主会话中)。
- 群组会话是隔离的 (`agent:<agentId>:whatsapp:group:<jid>`)。
- WhatsApp 频道/新闻通讯可以以其原生 WhatsApp`@newsletter` JID 作为显式出站目标。出站新闻通讯发送使用频道会话元数据 (`agent:<agentId>:whatsapp:channel:<jid>`) 而不是私信会话语义。
- WhatsApp Web 传输遵守网关主机上的标准代理环境变量（WhatsApp`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY`WhatsApp / 小写变体）。与特定于渠道的 WhatsApp 代理设置相比，首选主机级别的代理配置。
- 当启用 `messages.removeAckAfterReply`OpenClawWhatsApp 时，OpenClaw 会在发送可见回复后清除 WhatsApp 确认反应。

## 批准提示

WhatsApp 可以使用 `👍` / `👎` 反应来呈现执行和插件批准提示。投递由
顶层批准转发配置控制：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session",
    },
    plugin: {
      enabled: true,
      mode: "targets",
      targets: [{ channel: "whatsapp", to: "+15551234567" }],
    },
  },
}
```

`approvals.exec` 和 `approvals.plugin` 是独立的。启用 WhatsApp 作为渠道只会链接
传输层；除非启用了匹配的审批系列并路由到 WhatsApp，否则它不会发送审批提示。会话模式仅为源自 WhatsApp 的审批
提供原生表情符号审批。目标模式针对明确的 WhatsApp 目标使用共享转发管道，
并且不会创建单独的审批人-私信分发。

WhatsApp 审批反应需要来自 `allowFrom` 或 `"*"` 的明确 WhatsApp 审批人。
`defaultTo` 控制普通的默认消息目标；它不是审批审批人。手动的
`/approve` 命令在审批解决之前，仍需经过正常的 WhatsApp 发送人授权路径。

## 插件钩子和隐私

WhatsApp 入站消息可能包含个人消息内容、电话号码、
群组标识符、发件人姓名和会话相关字段。因此，
除非您明确选择加入，否则 WhatsApp 不会向插件广播入站 `message_received` 钩子负载：

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

您可以将选择加入的范围限定为一个帐户：

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

仅对您信任能够接收入站 WhatsApp 消息
内容和标识符的插件启用此功能。

## 访问控制和激活

<Tabs>
  <Tab title="私信 policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问权限：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码（内部标准化）。

    `allowFrom` 是私信发送者访问控制列表。它不会限制对 WhatsApp 群组 JID 或 `@newsletter` 渠道 JID 的显式出站发送。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（以及 `allowFrom`）优先于该账户的渠道级别默认值。

    运行时行为详情：

    - 配对数据保留在渠道允许存储中，并与已配置的 `allowFrom` 合并
    - 定时自动化和心跳接收者回退使用显式传递目标或已配置的 `allowFrom`；私信配对批准不是隐式的 cron 或心跳接收者
    - 如果未配置允许列表，则默认允许关联的自身号码
    - OpenClaw 永远不会自动配对出站 `fromMe` 私信（您从关联设备发送给自己的消息）

  </Tab>

  <Tab title="Group policy + allowlists">
    群组访问权限有两层：

    1. **群组成员白名单** (`channels.whatsapp.groups`)
       - 如果省略了 `groups`，则所有群组都符合条件
       - 如果存在 `groups`，则它充当群组白名单（`"*"` 个允许）

    2. **群组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：绕过发送者白名单
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站消息

    发送者白名单回退：

    - 如果 `groupAllowFrom` 未设置，运行时在可用时会回退到 `allowFrom`
    - 发送者白名单在提及/回复激活之前被评估

    注意：如果根本不存在 `channels.whatsapp` 块，即使设置了 `channels.defaults.groupPolicy`，运行时群组策略回退也是 `allowlist`（并带有警告日志）。

  </Tab>

  <Tab title="Mentions + /activation">
    默认情况下，群组回复需要提及。

    提及检测包括：

    - 针对机器人身份的明确 WhatsApp 提及
    - 配置的提及正则模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 针对已授权群组消息的入站语音笔记转录
    - 隐式回复机器人检测（回复发送者与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及关卡；它**不**授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，非白名单发送者仍然会被阻止，即使他们回复了白名单用户的消息

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者限制。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的个人号码也存在于 `allowFrom` 中时，WhatsApp 自聊安全保护会激活：

- 跳过自聊轮次的已读回执
- 忽略提及 JID 的自动触发行为，否则会 ping 到你自己
- 如果 `messages.responsePrefix` 未设置，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化与上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息被封装在共享的入站信封中。

    如果存在引用回复，上下文将以以下形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也会被填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、发送者 JID/E.164）。
    当引用回复目标是可下载媒体时，OpenClaw 会通过常规入站媒体存储对其进行保存，并将其作为 `MediaPath`/`MediaType` 暴露出来，以便代理可以检查引用的图像，而不仅仅是看到 `<media:image>`。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅包含媒体的入站消息会被使用以下占位符进行规范化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    当正文仅为 `<media:audio>` 时，已授权的群组语音笔记会在提及门控之前进行转录，因此在语音笔记中说出机器人提及内容可以触发回复。如果转录文本仍未提及机器人，则转录文本将保留在待处理的群组历史记录中，而不是原始占位符。

    位置正文使用简洁的坐标文本。位置标签/注释和联系人/vCard 详细信息呈现为受围栏保护的不受信任元数据，而不是内联提示文本。

  </Accordion>

  <Accordion title="待注入的群组历史记录">
    对于群组，未处理的消息可以被缓存，并在机器人最终被触发时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已读回执"WhatsApp>
    默认情况下，对于接受的传入 WhatsApp 消息，已读回执处于启用状态。

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

    自聊回合会跳过已读回执，即使在全局启用的情况下也是如此。

  </Accordion>
</AccordionGroup>

## 发送、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先使用段落边界（空行），然后回退到长度安全的分块

  </Accordion>

  <Accordion title="Outbound media behavior">
    - 支持图片、视频、音频（PTT 语音笔记）和文档有效载荷
    - 音频媒体通过 Baileys `audio` 有效载荷并带有 `ptt: true` 发送，因此 WhatsApp 客户端将其渲染为按住说话（PTT）的语音笔记
    - 回复有效载荷会保留 `audioAsVoice`；针对 WhatsApp 的 TTS 语音笔记输出即使当提供商返回 MP3 或 WebM 时也会保持在此 PTT 路径上
    - 原生 Ogg/Opus 音频作为 `audio/ogg; codecs=opus` 发送以兼容语音笔记
    - 非 Ogg 音频，包括 Microsoft Edge TTS MP3/WebM 输出，会在 PTT 传输前使用 `ffmpeg` 转码为 48 kHz 单声道 Ogg/Opus
    - `/tts latest` 将最新的助手回复作为一个语音笔记发送，并抑制对同一回复的重复发送；`/tts chat on|off|default` 控制当前 WhatsApp 聊天的自动 TTS
    - 通过 `gifPlayback: true` 在发送视频时支持动态 GIF 播放
    - `forceDocument` / `asDocument` 通过 Baileys 文档有效载荷发送出站图片、GIF 和视频，以避免 WhatsApp 媒体压缩，同时保留解析的文件名和 MIME 类型
    - 发送多媒体回复有效载荷时，字幕会应用于第一个媒体项，但 PTT 语音笔记会先发送音频并单独发送可见文本，因为 WhatsApp 客户端对语音笔记字幕的渲染不一致
    - 媒体源可以是 HTTP(S)、`file://` 或本地路径

  </Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整大小/质量扫描）以适应限制，除非 `forceDocument` / `asDocument` 请求以文档形式交付
    - 当媒体发送失败时，首项回退会发送文本警告，而不是静默丢弃响应

  </Accordion>
</AccordionGroup>

## 回复引用

WhatsApp 支持原生回复引用，即出站回复会显式引用入站消息。使用 `channels.whatsapp.replyToMode` 对其进行控制。

| 值          | 行为                                         |
| ----------- | -------------------------------------------- |
| `"off"`     | 从不引用；作为普通消息发送                   |
| `"first"`   | 仅引用第一个出站回复分块                     |
| `"all"`     | 引用每个出站回复分块                         |
| `"batched"` | 引用排队的批量回复，同时保持即时回复不被引用 |

默认值为 `"off"`。每个账户的覆盖设置使用 `channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "first",
    },
  },
}
```

## 表情反应级别

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情反应的广泛程度：

| 级别          | 确认反应 | 代理发起的反应 | 描述                            |
| ------------- | -------- | -------------- | ------------------------------- |
| `"off"`       | 否       | 否             | 完全不反应                      |
| `"ack"`       | 是       | 否             | 仅确认反应（回复前回执）        |
| `"minimal"`   | 是       | 是（保守）     | 确认 + 代理反应，并提供保守指导 |
| `"extensive"` | 是       | 是（鼓励）     | 确认 + 代理反应，并提供鼓励指导 |

默认值：`"minimal"`。

每个账户的覆盖设置使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

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

WhatsApp 支持通过 WhatsApp`channels.whatsapp.ackReaction` 在接收入站消息时立即发送确认反应。
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
- 群组模式 `mentions` 会在提及触发的轮次中做出反应；群组激活 `always` 充当此检查的绕过条件
- WhatsApp 使用 WhatsApp`channels.whatsapp.ackReaction`（此处不使用旧版 `messages.ackReaction`）

## 生命周期状态反应

设置 `messages.statusReactions.enabled: true`WhatsAppOpenClaw 以让 WhatsApp 在一轮对话中替换确认反应，而不是保留静态的已回执表情符号。启用后，OpenClaw 使用相同的入站消息反应位槽来显示排队、思考、工具活动、压缩、完成和错误等生命周期状态。

```json5
{
  messages: {
    statusReactions: {
      enabled: true,
      emojis: {
        deploy: "🛫",
        build: "🏗️",
        concierge: "💁",
      },
    },
  },
}
```

行为说明：

- `channels.whatsapp.ackReaction` 仍然控制状态反应是否适用于直接消息和群组。
- WhatsApp 每条消息只有一个机器人反应位槽，因此生命周期更新会就地替换当前反应。
- `messages.removeAckAfterReply: true` 会在配置的完成/错误保留时间后清除最终状态反应。
- 工具表情符号类别包括 `tool`、`coding`、`web`、`deploy`、`build` 和 `concierge`。

## 多账户和凭据

<AccordionGroup>
  <Accordion title="Account selection and defaults">
    - 账户 ID 来自 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在 `default`，则选择该 ID，否则选择第一个配置的账户 ID（已排序）
    - 账户 ID 在内部进行规范化以供查找

  </Accordion>

  <Accordion title="凭证路径与旧版兼容性">
    - 当前身份验证路径： `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件： `creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认身份验证仍被识别/迁移用于默认账户流程

  </Accordion>

  <Accordion title="登出行为">
    `openclaw channels logout --channel whatsapp [--account <id>]`WhatsAppGateway(网关)WhatsApp 会清除该账户的 WhatsApp 身份验证状态。

    当 Gateway(网关) 可达时，登出首先会停止所选账户的实时 WhatsApp 监听器，以便关联的会话不会在下次重启前继续接收消息。 `openclaw channels remove --channel whatsapp` 在禁用或删除账户配置之前也会停止实时监听器。

    在旧版身份验证目录中， `oauth.json`Baileys 会保留，而 Baileys 身份验证文件会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- Agent 工具支持包括 WhatsApp 表情反应操作 (WhatsApp`react`)。
- 操作门控：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 默认启用渠道发起的配置写入（通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排除

<AccordionGroup>
  <Accordion title="未关联（需要 QR 码）">
    症状：渠道状态报告未关联。

    修复方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已链接但断开连接 / 重连循环">
    症状：已链接账户出现反复断开连接或重连尝试。

    静默账户的连接状态可能保持超过正常的消息超时时间；看门狗会在 WhatsApp Web 传输活动停止、socket 关闭或应用级活动在更长的安全窗口内保持静默时重启。

    如果日志显示重复的 `status=408 Request Time-out Connection was lost`，请调整 `web.whatsapp` 下的 Baileys socket 计时。首先将 `keepAliveIntervalMs` 缩短到低于网络的空闲超时时间，并在缓慢或易丢包的链路上增加 `connectTimeoutMs`：

    ```json5
    {
      web: {
        whatsapp: {
          keepAliveIntervalMs: 15000,
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 60000,
        },
      },
    }
    ```

    修复方法：

    ```bash
    openclaw channels status --probe
    openclaw doctor
    openclaw logs --follow
    openclaw gateway status
    ```

    如果在修复主机连接和计时问题后循环仍然存在，请备份账户认证目录并重新链接该账户：

    ```bash
    cp -a ~/.openclaw/credentials/whatsapp/<accountId> \
      ~/.openclaw/credentials/whatsapp/<accountId>.bak
    openclaw channels logout --channel whatsapp --account <accountId>
    openclaw channels login --channel whatsapp --account <accountId>
    ```

    如果 `~/.openclaw/logs/whatsapp-health.log` 显示 `Gateway inactive`，但 `openclaw gateway status` 和 `openclaw channels status --probe` 显示网关和 WhatsApp 状态正常，请运行 `openclaw doctor`。在 Linux 上，doctor 会警告遗留的 crontab 条目仍然调用 `~/.openclaw/bin/ensure-whatsapp.sh`；请使用 `crontab -e` 删除这些过时的条目，因为 cron 可能缺少 systemd 用户总线环境，导致该旧脚本错误报告网关健康状况。

    如果需要，请使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="代理后二维码登录超时">
    症状：`openclaw channels login --channel whatsapp` 在显示可用的二维码之前失败，并出现 `status=408 Request Time-out` 或 TLS socket 断开连接。

    WhatsApp Web 登录使用网关主机的标准代理环境（`HTTPS_PROXY`、`HTTP_PROXY`、小写变体和 `NO_PROXY`）。请验证网关进程继承了代理环境，并且 `NO_PROXY` 不匹配 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    当目标帐户不存在活动的网关监听器时，出站发送将快速失败。

    请确保网关正在运行且帐户已链接。

  </Accordion>

  <Accordion title="WhatsApp回复显示在记录中但未显示在 WhatsApp"WhatsAppOpenClawBaileysWhatsApp 中>
    记录行记录了 Agent 生成的内容。WhatsApp 的投递情况是单独检查的：只有当 Baileys 为至少一次可见文本或媒体发送返回出站消息 ID 后，OpenClaw 才会将自动回复视为已发送。

    Ack 反应是独立的回复前回执。成功的反应并不能证明随后的文本或媒体回复已被 WhatsApp 接受。

    检查网关日志中是否存在 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    请按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` allowlist 条目
    - 提及限制 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的条目，因此请为每个作用域保持单一的 `groupPolicy`

    如果存在 `channels.whatsapp.groups`WhatsAppOpenClaw，WhatsApp 仍然可以观察到来自其他群组的消息，但 OpenClaw 会在会话路由之前丢弃它们。将群组 JID 添加到 `channels.whatsapp.groups` 或添加 `groups["*"]` 以允许所有群组，同时在 `groupPolicy` 和 `groupAllowFrom` 下保持发送者授权。

  </Accordion>

  <Accordion title="BunBun 运行时警告"WhatsAppBunWhatsAppTelegram>
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 系统提示

WhatsApp 通过 WhatsAppTelegram`groups` 和 `direct` 映射，支持针对群组和私聊的 Telegram 风格系统提示。

群组消息的解析层级：

首先确定有效的 `groups` 映射：如果账号定义了自己的 `groups`，它将完全替换根 `groups` 映射（不进行深度合并）。然后对生成的单个映射运行提示查找：

1. **群组特定系统提示** (`groups["<groupId>"].systemPrompt`)：当映射中存在特定群组条目**并且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 为空字符串 (`""`)，则通配符被抑制，不应用系统提示。
2. **群组通配符系统提示** (`groups["*"].systemPrompt`)：当映射中完全不存在特定群组条目，或者条目存在但未定义 `systemPrompt` 键时使用。

私聊消息的解析层级：

首先确定有效的 `direct` 映射：如果账号定义了自己的 `direct`，它将完全替换根 `direct` 映射（不进行深度合并）。然后对生成的单个映射运行提示查找：

1. **私聊特定系统提示** (`direct["<peerId>"].systemPrompt`)：当映射中存在特定对等方条目**并且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 为空字符串 (`""`)，则通配符被抑制，不应用系统提示。
2. **私聊通配符系统提示** (`direct["*"].systemPrompt`)：当映射中完全不存在特定对等方条目，或者条目存在但未定义 `systemPrompt` 键时使用。

<Note>
`dms` 仍然是轻量级的每条私信历史记录覆盖桶 (`dms.<id>.historyLimit`)。提示覆盖位于 `direct` 下。
</Note>

**与 Telegram 多账号行为的区别：** 在 Telegram 中，在多账号设置中，根 TelegramTelegram`groups` 会被有意针对所有账号进行抑制 — 即使是那些未定义自身 `groups`WhatsApp 的账号 — 以防止机器人接收其不属于的群组消息。WhatsApp 不应用此保护措施：根 `groups` 和根 `direct`WhatsApp 始终会被未定义账号级覆盖的账号继承，无论配置了多少个账号。在多账号 WhatsApp 设置中，如果您希望针对每个账号设置群组或直接提示，请明确在每个账号下定义完整的映射，而不是依赖根级别的默认值。

重要行为：

- `channels.whatsapp.groups` 既是每个群组的配置映射，也是聊天级别的群组允许列表。无论是在根还是账号范围内，`groups["*"]` 都意味着该范围“接纳所有群组”。
- 仅当您已希望该范围接纳所有群组时，才添加通配符群组 `systemPrompt`。如果您仍然只希望一组固定的群组 ID 符合条件，请不要针对提示默认值使用 `groups["*"]`。相反，请在每个明确列出的允许群组条目上重复该提示。
- 群组准入和发送者授权是分开的检查。`groups["*"]` 扩展了可以到达群组处理的群组集合，但它本身并不授权这些群组中的每个发送者。发送者访问权限仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 单独控制。
- `channels.whatsapp.direct` 对私信（私信）不具有相同的副作用。`direct["*"]` 仅在私信已被 `dmPolicy` 加上 `allowFrom` 或配对存储规则接纳后，提供默认的直接聊天配置。

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

高优先级 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, 账户级覆盖
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- 会话 behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [安全性](/zh/gateway/security)
- [渠道路由](/zh/channels/channel-routing)
- [多代理路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)
