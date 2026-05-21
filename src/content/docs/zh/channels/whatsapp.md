---
summary: "WhatsAppWhatsApp渠道支持、访问控制、送达行为和运维"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsAppWhatsApp"
---

状态：通过 WhatsApp Web (Baileys) 已可用于生产环境。Gateway(网关) 拥有已链接的会话。

## 安装（按需）

- 新手引导 (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`WhatsApp
  会在您首次选择 WhatsApp 插件时提示安装。
- `openclaw channels login --channel whatsapp` 也会在插件尚未存在时提供安装流程。
- Dev 渠道 + git checkout：默认为本地插件路径。
- Stable/Beta：首先从 ClawHub 安装官方 `@openclaw/whatsapp`ClawHub 插件，并将 npm 作为后备。
- WhatsApp 运行时分发在核心 OpenClaw npm 包之外，以便 WhatsApp 特定的运行时依赖保留在外部插件中。

手动安装仍然可用：

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

仅当需要注册表后备时，才使用裸 npm 包 (`@openclaw/whatsapp`)。仅在需要可重现安装时才固定确切的版本。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    对于未知发件人，默认私信策略为配对。
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

  <Step title="关联 WhatsApp (二维码)">

```bash
openclaw channels login --channel whatsapp
```

    对于特定账户：

```bash
openclaw channels login --channel whatsapp --account work
```

    要在登录之前附加现有/自定义的 WhatsApp Web 身份验证目录：

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

    配对请求会在 1 小时后过期。待处理的请求每个渠道最多限 3 个。

  </Step>
</Steps>

<Note>OpenClaw 建议尽可能在单独的号码上运行 WhatsApp。（渠道元数据和设置流程已针对该设置进行了优化，但也支持个人号码设置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最干净的操作模式：

    - OpenClaw 使用独立的 WhatsAppOpenClaw 身份
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

  <Accordion title="个人号码回退">
    新手引导支持个人号码模式，并写入对自聊友好的基线配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护依赖于关联的自身号码和 `allowFrom`。

  </Accordion>

  <Accordion title="仅 WhatsApp Web 的渠道范围">
    在当前的 OpenClaw 渠道架构中，消息平台渠道是基于 WhatsApp Web 的（`Baileys`OpenClaw）。

    在内置的聊天渠道注册表中没有单独的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp socket 并负责重连循环。
- 重连看门狗使用 WhatsApp Web 传输活动，而不仅仅是入站应用消息量，因此一个安静的链接设备会话不会仅仅因为最近没有人发送消息而重启。一个更长的应用静默上限仍会强制重连，如果传输帧不断到达但在看门狗窗口内没有处理任何应用消息；在最近活动的会话经历短暂重连后，该应用静默检查在第一个恢复窗口使用正常的消息超时。
- Baileys 套接字计时在 `web.whatsapp.*` 下是显式的：`keepAliveIntervalMs` 控制 WhatsApp Web 应用程序 ping，`connectTimeoutMs` 控制打开握手超时，而 `defaultQueryTimeoutMs` 控制 Baileys 查询超时。
- 出站发送需要目标帐户有一个活动的 WhatsApp 监听器。
- 当令牌与当前的 WhatsApp 参与者元数据匹配时（包括 LID 支持的群组），群组发送会为文本和媒体标题中的 `@+<digits>` 和 `@<digits>` 令牌附加原生提及元数据。
- 状态和广播聊天会被忽略（`@status`，`@broadcast`）。
- 重连看门狗跟随 WhatsApp Web 传输活动，而不仅仅是入站应用消息量：安静的链接设备会话在传输帧继续时会保持活动，但传输停滞会强制重连，远早于后来的远程断开路径。
- 直接聊天使用私信会话规则（`session.dmScope`；默认的 `main` 将私信合并到代理主会话中）。
- 群组会话是隔离的（`agent:<agentId>:whatsapp:group:<jid>`）。
- WhatsApp 频道/时事通讯可以作为具有其原生 `@newsletter` JID 的显式出站目标。出站时事通讯发送使用频道会话元数据（`agent:<agentId>:whatsapp:channel:<jid>`），而不是私信会话语义。
- WhatsApp Web 传输遵循网关主机上的标准代理环境变量（`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY` / 小写变体）。优先使用主机级代理配置，而不是特定于 WhatsApp 渠道的代理设置。
- 当启用 `messages.removeAckAfterReply` 时，OpenClaw 会在传递可见回复后清除 WhatsApp 确认反应。

## 插件挂钩与隐私

WhatsApp 入站消息可以包含个人消息内容、电话号码、群组标识符、发送者名称和会话关联字段。因此，除非您明确选择加入，否则 WhatsApp 不会向插件广播入站 `message_received` 挂钩负载：

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

仅为您信任的插件启用此功能，以接收入站 WhatsApp 消息内容和标识符。

## 访问控制和激活

<Tabs>
  <Tab title="私信 policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问权限：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码（内部进行规范化）。

    `allowFrom` 是私信发送者访问控制列表。它不会限制向 WhatsApp 群组 JID 或 `@newsletter` 渠道 JID 的显式出站发送。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（以及 `allowFrom`）优先于该账户的渠道级默认设置。

    运行时行为详情：

    - 配对会持久化存储在渠道允许存储中，并与配置的 `allowFrom` 合并
    - 定时自动化和心跳接收者回退使用显式传递目标或配置的 `allowFrom`；私信配对批准并非隐式的 cron 或心跳接收者
    - 如果未配置允许列表，则默认允许关联的自有号码
    - OpenClaw 永远不会自动配对出站 `fromMe` 私信（您从关联设备发送给自己的消息）

  </Tab>

  <Tab title="Group policy + allowlists">
    群组访问权限分为两层：

    1. **群组成员允许列表** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，则所有群组都符合资格
       - 如果存在 `groups`，它将作为群组允许列表（`"*"` 已允许）

    2. **群组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：绕过发送者允许列表
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站消息

    发送者允许列表回退机制：

    - 如果未设置 `groupAllowFrom`，运行时会在可用时回退到 `allowFrom`
    - 发送者允许列表在提及/回复激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 块，则运行时群组策略回退为 `allowlist`（并带有警告日志），即使 `channels.defaults.groupPolicy` 已设置也是如此。

  </Tab>

  <Tab title="Mentions + /activation">
    默认情况下，群组回复需要提及。

    提及检测包括：

    - 对机器人身份的明确 WhatsApp 提及
    - 配置的提及正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 已授权群组消息的入站语音笔记转录
    - 隐式回复机器人检测（回复发送者与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及门控；它**不**授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，即使非允许列表的发送者回复了允许列表用户的消息，他们仍会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而不是全局配置）。它受所有者限制。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的自有号码也存在于 `allowFrom` 中时，WhatsApp 自聊安全保护机制会激活：

- 跳过自聊轮次的已读回执
- 忽略提及-JID 自动触发行为，否则会 ping 自己
- 如果未设置 `messages.responsePrefix`，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化和上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息被包装在共享的入站信封中。

    如果存在引用回复，上下文会以以下形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段也会在可用时填充（`ReplyToId`，`ReplyToBody`，`ReplyToSender`，发送者 JID/E.164）。
    当引用回复目标是可下载的媒体时，OpenClaw 会通过
    正常的入站媒体存储保存它，并将其作为 `MediaPath`/`MediaType` 暴露出来，以便
    代理可以检查引用的图像，而不仅仅是看到
    `<media:image>`。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅媒体的入站消息使用以下占位符进行规范化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    当正文仅为 `<media:audio>` 时，已授权的群组语音笔记会在提及过滤之前进行转录，因此在语音笔记中说出提及机器人可以触发回复。如果转录内容仍然未提及机器人，则转录内容将保留在待处理的群组历史记录中，而不是原始占位符。

    位置正文使用简略的坐标文本。位置标签/评论和联系人/vCard详细信息作为围栏的不受信任的元数据呈现，而不是内联提示文本。

  </Accordion>

  <Accordion title="待注入的群组历史记录">
    对于群组，未处理的消息可以缓冲，并在机器人最终被触发时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已读回执">
    对于已接受的入站 WhatsApp 消息，默认启用已读回执。

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

    每个账户覆盖：

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

    即使全局启用，自聊回合也会跳过已读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先考虑段落边界（空行），然后回退到长度安全的分块

  </Accordion>

  <Accordion title="Outbound media behavior">
    - 支持图像、视频、音频（PTT 语音笔记）和文档负载
    - 音频媒体通过 Baileys `audio` 负载并带有 `ptt: true` 发送，因此 WhatsApp 客户端将其呈现为按讲语音笔记
    - 回复负载保留 `audioAsVoice`；WhatsApp 的 TTS 语音笔记输出即使当提供商返回 MP3 或 WebM 时也保留在此 PTT 路径上
    - 原生 Ogg/Opus 音频作为 `audio/ogg; codecs=opus` 发送以兼容语音笔记
    - 非 Ogg 音频（包括 Microsoft Edge TTS MP3/WebM 输出）在 PTT 传送之前使用 `ffmpeg` 转码为 48 kHz 单声道 Ogg/Opus
    - `/tts latest` 将最新的助手回复作为一个语音笔记发送，并抑制对同一回复的重复发送；`/tts chat on|off|default` 控制当前 WhatsApp 聊天的自动 TTS
    - 通过视频发送上的 `gifPlayback: true` 支持动画 GIF 播放
    - `forceDocument` / `asDocument` 通过 Baileys 文档负载发送出站图像、GIF 和视频，以避免 WhatsApp 媒体压缩，同时保留解析后的文件名和 MIME 类型
    - 发送多媒体回复负载时，标题应用于第一个媒体项，但 PTT 语音笔记先发送音频，然后单独发送可见文本，因为 WhatsApp 客户端不能一致地呈现语音笔记标题
    - 媒体源可以是 HTTP(S)、`file://` 或本地路径

  </Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整尺寸/质量扫描）以适应限制，除非 `forceDocument` / `asDocument` 请求文档投递
    - 当媒体发送失败时，首项回退会发送文本警告，而不是静默丢弃响应

  </Accordion>
</AccordionGroup>

## 回复引用

WhatsApp 支持原生回复引用，其中出站回复会显式引用入站消息。使用 `channels.whatsapp.replyToMode` 控制此功能。

| 值          | 行为                                           |
| ----------- | ---------------------------------------------- |
| `"off"`     | 从不引用；作为普通消息发送                     |
| `"first"`   | 仅引用第一条出站回复片段                       |
| `"all"`     | 引用每一条出站回复片段                         |
| `"batched"` | 引用排队中的批量回复，同时保持即时回复不被引用 |

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

## 反应级别

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符号反应的范围：

| 级别          | 确认反应 | 代理发起的反应 | 描述                          |
| ------------- | -------- | -------------- | ----------------------------- |
| `"off"`       | 否       | 否             | 完全没有任何反应              |
| `"ack"`       | 是       | 否             | 仅确认反应（回复前回执）      |
| `"minimal"`   | 是       | 是（保守）     | 确认 + 代理反应，采用保守指导 |
| `"extensive"` | 是       | 是（鼓励）     | 确认 + 代理反应，采用鼓励指导 |

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

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站收据进行即时确认反应。
确认反应受 `reactionLevel` 限制——当 `reactionLevel` 为 `"off"` 时，它们将被抑制。

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

- 在接收入站消息后立即发送（回复前）
- 失败会被记录，但不会阻止正常回复的传递
- 群组模式 `mentions` 会在提及触发的回合中做出反应；群组激活 `always` 充当此检查的旁路
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧版 `messages.ackReaction`）

## 生命周期状态反应

设置 `messages.statusReactions.enabled: true`WhatsAppOpenClaw 以便 WhatsApp 在一轮对话中替换确认反应，而不是留下静态的回执表情符号。启用后，OpenClaw 使用相同的入站消息反应槽来表示已排队、思考中、工具活动、压缩、完成和错误等生命周期状态。

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
- WhatsApp 每条消息只有一个机器人反应槽，因此生命周期更新会就地替换当前的反应。
- `messages.removeAckAfterReply: true` 在配置的完成/错误保持时间后清除最终状态反应。
- 工具表情符号类别包括 `tool`、`coding`、`web`、`deploy`、`build` 和 `concierge`。

## 多账户和凭据

<AccordionGroup>
  <Accordion title="帐户选择和默认值">
    - 帐户 ID 来自 `channels.whatsapp.accounts`
    - 默认帐户选择：如果存在 `default`，则选择它，否则选择第一个配置的帐户 ID（已排序）
    - 帐户 ID 在内部进行规范化以供查找

  </Accordion>

  <Accordion title="凭据路径和旧版兼容性">
    - 当前身份验证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认身份验证仍被默认帐户流程识别/迁移

  </Accordion>

  <Accordion title="Logout behavior">
    `openclaw channels logout --channel whatsapp [--account <id>]`WhatsAppGateway(网关)WhatsApp 会清除该账户的 WhatsApp 认证状态。

    当 Gateway(网关) 可达时，注销会首先停止所选账户的实时 WhatsApp 监听器，以便关联会话在下次重启之前不再接收消息。`openclaw channels remove --channel whatsapp` 在禁用或删除账户配置之前也会停止实时监听器。

    在旧版认证目录中，`oauth.json`Baileys 会被保留，而 Baileys 认证文件则会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- Agent 工具 支持包括 WhatsApp 表情回应操作 (WhatsApp`react`)。
- 操作门控：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 默认启用渠道发起的配置写入（通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排除

<AccordionGroup>
  <Accordion title="Not linked (QR required)">
    症状：渠道状态报告显示未关联。

    修复方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Linked but disconnected / reconnect loop">
    症状：已关联的账户出现反复断开连接或尝试重新连接。

    安静的账户可以保持连接超过正常的消息超时时间；当 WhatsApp Web 传输活动停止、套接字关闭或应用层活动在更长的安全窗口内保持静默时，看门狗会重新启动。

    如果日志显示重复的 `status=408 Request Time-out Connection was lost`，请在 `web.whatsapp` 下调整 Baileys 套接字计时。首先将 `keepAliveIntervalMs` 缩短到低于您网络的空闲超时时间，并在缓慢或易丢包的链路上增加 `connectTimeoutMs`：

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
    openclaw doctor
    openclaw logs --follow
    ```

    如果 `~/.openclaw/logs/whatsapp-health.log` 显示 `Gateway inactive` 但 `openclaw gateway status` 和 `openclaw channels status --probe` 显示网关和 WhatsApp 均运行正常，请运行 `openclaw doctor`。在 Linux 上，doctor 会警告遗留的 crontab 条目仍然在调用 `~/.openclaw/bin/ensure-whatsapp.sh`；请使用 `crontab -e` 删除那些过时的条目，因为 cron 可能缺少 systemd 用户总线环境，从而导致该旧脚本错误报告网关健康状况。

    如果需要，请使用 `channels login` 重新关联。

  </Accordion>

  <Accordion title="QR login times out behind a proxy">
    症状：`openclaw channels login --channel whatsapp` 失败，未显示可用的 QR 码，并出现 `status=408 Request Time-out` 或 TLS 套接字断开连接。

    WhatsApp Web 登录使用网关主机的标准代理环境（`HTTPS_PROXY`、`HTTP_PROXY`、小写变体以及 `NO_PROXY`）。请验证网关进程是否继承了代理环境变量，并且 `NO_PROXY` 不匹配 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    当目标帐户不存在活动网关监听器时，出站发送将快速失败。

    请确保网关正在运行且帐户已关联。

  </Accordion>

  <Accordion title="回复出现在记录中但未出现在 WhatsApp 中">
    记录行记录了代理生成的内容。WhatsApp 的投递是单独检查的：OpenClaw 只有在 Baileys 为至少一次可见文本或媒体发送返回出站消息 ID 后，才将自动回复视为已发送。

    Ack 反应是独立于回复之前的回执。成功的反应并不能证明后续的文本或媒体回复已被 WhatsApp 接受。

    检查网关日志中的 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="Group messages unexpectedly ignored">
    按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许条目
    - 提及限制（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的，因此每个作用域保持单一的 `groupPolicy`

    如果存在 `channels.whatsapp.groups`WhatsAppOpenClaw，WhatsApp 仍然可以观察来自其他群组的信息，但 OpenClaw 会在会话路由之前丢弃它们。将群组 JID 添加到 `channels.whatsapp.groups` 或添加 `groups["*"]` 以允许所有群组，同时在 `groupPolicy` 和 `groupAllowFrom` 下保持发送者授权。

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 系统提示

WhatsApp 通过 WhatsAppTelegram`groups` 和 `direct` 映射支持群组和直接聊天的 Telegram 风格系统提示。

群组消息的解析层次结构：

首先确定有效的 `groups` 映射：如果账户定义了自己的 `groups`，它将完全替换根 `groups` 映射（不进行深度合并）。然后对生成的单个映射运行提示查找：

1. **群组特定系统提示**（`groups["<groupId>"].systemPrompt`）：当映射中存在特定群组条目**并**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 是空字符串（`""`），则通配符被抑制，并且不应用系统提示。
2. **群组通配符系统提示**（`groups["*"].systemPrompt`）：当映射中完全没有特定群组条目，或者条目存在但未定义 `systemPrompt` 键时使用。

私信的解析层级：

首先确定有效的 `direct` 映射：如果账户定义了自己的 `direct`，它将完全替换根 `direct` 映射（不进行深度合并）。然后对生成的单个映射运行提示查找：

1. **特定私聊系统提示** (`direct["<peerId>"].systemPrompt`)：当映射中存在特定的对等条目**且**定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 为空字符串 (`""`)，则通配符被抑制，且不应用系统提示。
2. **直接通配符系统提示** (`direct["*"].systemPrompt`)：当映射中完全不存在特定的对等条目，或者该条目存在但未定义 `systemPrompt` 键时使用。

<Note>
`dms` 仍然是轻量级的每条私信历史记录覆盖桶 (`dms.<id>.historyLimit`)。提示覆盖位于 `direct` 下。
</Note>

**与 Telegram 多账号行为的区别：** 在 Telegram 中，根 TelegramTelegram`groups` 在多账号设置中被有意针对所有账号进行抑制——甚至包括那些未定义自己的 `groups`WhatsApp 的账号——以防止机器人接收到其不属于的群组消息。WhatsApp 不应用此保护措施：根 `groups` 和根 `direct`WhatsApp 始终被未定义账号级覆盖的账号继承，而无论配置了多少个账号。在多账号 WhatsApp 设置中，如果您想要每个账号的群组或直接提示，请在每个账号下明确定义完整的映射，而不是依赖根级别的默认值。

重要行为：

- `channels.whatsapp.groups` 既是每个群组的配置映射，也是聊天级别的群组允许列表。无论是在根范围还是账号范围内，`groups["*"]` 都意味着该范围“允许所有群组”。
- 仅当您已经希望该范围允许所有群组时，才添加通配符群组 `systemPrompt`。如果您仍然希望只有一组固定的群组 ID 有资格，请不要使用 `groups["*"]` 作为提示默认值。相反，请在每个明确列入允许列表的群组条目上重复提示。
- 群组准入和发送方授权是分开的检查。`groups["*"]` 扩大了可以进行群组处理的群组范围，但它本身并不授权这些群组中的每个发送方。发送方的访问权限仍然由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 单独控制。
- `channels.whatsapp.direct` 对私信没有相同的副作用。`direct["*"]` 仅在私信已被 `dmPolicy` 加上 `allowFrom` 或配对存储（pairing-store）规则准入后，提供默认的直接聊天配置。

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

高优先级的 WhatsApp 字段：

- 访问控制：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`
- 投递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`sendReadReceipts`、`ackReaction`、`reactionLevel`
- 多账户：`accounts.<id>.enabled`、`accounts.<id>.authDir`、账户级别的覆盖
- 操作：`configWrites`、`debounceMs`、`web.enabled`、`web.heartbeatSeconds`、`web.reconnect.*`、`web.whatsapp.*`
- 会话行为：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`
- 提示词：`groups.<id>.systemPrompt`、`groups["*"].systemPrompt`、`direct.<id>.systemPrompt`、`direct["*"].systemPrompt`

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [安全](/zh/gateway/security)
- [渠道路由](/zh/channels/channel-routing)
- [多智能体路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)
