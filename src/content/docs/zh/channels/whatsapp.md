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
- 稳定版/Beta版：使用当前正式发布标签中的 npm 包 npm`@openclaw/whatsapp`。

手动安装仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

使用裸包以跟随当前的正式发布标签。仅在需要可重现的安装时固定确切的版本。

在 Windows 上，WhatsApp 插件在 npm install 期间需要 WindowsWhatsApp`PATH`npmBaileysWindows 上的 Git，因为其 Baileys/libsignal 依赖项之一是从 git URL 获取的。安装 Git for Windows，然后重启 shell 并重新运行安装：

```powershell
winget install --id Git.Git -e
```

如果便携版 Git 的 `bin` 目录位于 `PATH` 上，则也可以使用。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    默认私信策略是对未知发件人进行配对。
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

  <Step title="关联 WhatsApp (二维码)">

```bash
openclaw channels login --channel whatsapp
```

    针对特定账号：

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

    配对请求会在 1 小时后过期。每个渠道的待处理请求上限为 3 个。

  </Step>
</Steps>

<Note>OpenClaw 建议在可能的情况下在单独的号码上运行 WhatsApp。（该渠道的元数据和设置流程已针对该设置进行了优化，但也支持个人号码设置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最整洁的运营模式：

    - 为 WhatsApp 提供单独的 OpenClaw 身份
    - 更清晰的 （此处应指代DM私信，为保持上下文一致暂不强制替换为‘私信’）白名单和路由边界
    - 降低自聊混淆的可能性

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

  <Accordion title="个人号码回退模式">
    新手引导支持个人号码模式，并写入一个对自聊友好的基准配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护依赖于关联的自我号码和 `allowFrom`。

  </Accordion>

  <Accordion title="WhatsApp Web 仅限渠道范围">
    在当前的 WhatsApp 渠道架构中，消息平台渠道是基于 OpenClaw Web 的 (`Baileys`)。

    在内置的聊天渠道注册表中没有单独的 Twilio WhatsApp 消息渠道。

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

## 插件挂钩和隐私

WhatsApp 入站消息可能包含个人消息内容、电话号码、群组标识符、发送者名称和会话关联字段。因此，除非您明确选择加入，否则 WhatsApp 不会将入站 WhatsAppWhatsApp`message_received` 挂钩负载广播给插件：

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

您可以将选择加入范围限定为一个帐户：

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

仅对您信任可以接收入站 WhatsApp 消息内容和标识符的插件启用此功能。

## 访问控制和激活

<Tabs>
  <Tab title="私信 policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问权限：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码（在内部进行规范化）。

    `allowFrom` 是一个私信发送者访问控制列表。它不会限制发送到 WhatsApp 群组 JID 或 `@newsletter` 渠道 JID 的显式出站发送。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（以及 `allowFrom`）优先于该账户的渠道级默认值。

    运行时行为详情：

    - 配对持久保存在渠道允许存储中，并与已配置的 `allowFrom` 合并
    - 计划自动化和心跳接收者回退使用显式传递目标或已配置的 `allowFrom`；私信配对批准不是隐式的 cron 或心跳接收者
    - 如果未配置允许列表，则默认允许关联的自身号码
    - OpenClaw 永远不会自动配对出站 `fromMe` 私信（您从关联设备发送给自己的消息）

  </Tab>

  <Tab title="Group policy + allowlists">
    群组访问分为两层：

    1. **群组成员白名单** (`channels.whatsapp.groups`)
       - 如果省略了 `groups`，则所有群组均符合条件
       - 如果存在 `groups`，它将作为群组白名单（`"*"` 已允许）

    2. **群组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：绕过发送者白名单
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站消息

    发送者白名单回退机制：

    - 如果未设置 `groupAllowFrom`，运行时在可用时将回退到 `allowFrom`
    - 发送者白名单在提及/回复激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 块，即使设置了 `channels.defaults.groupPolicy`，运行时群组策略回退也是 `allowlist`（并带有警告日志）。

  </Tab>

  <Tab title="Mentions + /activation">
    默认情况下，群组回复需要提及。

    提及检测包括：

    - 对机器人身份的显式 WhatsApp 提及
    - 配置的提及正则表达式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 已授权群组消息的入站语音笔记转录
    - 隐式回复机器人检测（回复发送者与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及门槛；它**不**授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，非白名单发送者即使回复白名单用户的消息，仍会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者限制。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的个人号码也存在于 `allowFrom` 中时，WhatsApp 自聊保护机制将激活：

- 跳过自聊对话的已读回执
- 忽略提及 JID 的自动触发行为，否则会 ping 到你自己
- 如果 `messages.responsePrefix` 未设置，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化和上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文"WhatsApp>
    传入的 WhatsApp 消息被封装在共享的入站信封中。

    如果存在引用回复，上下文将以以下形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也会被填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`OpenClaw、发送方 JID/E.164）。
    当引用回复目标是可下载的媒体时，OpenClaw 会通过
    普通入站媒体存储保存该媒体，并将其作为 `MediaPath`/`MediaType` 暴露出来，以便
    代理可以检查引用的图像，而不仅仅是看到
    `<media:image>`。

  </Accordion>

  <Accordion title="媒体占位符以及位置/联系人提取">
    纯媒体入站消息使用如下占位符进行规范化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    当正文仅为 `<media:audio>` 时，已授权的群组语音笔记会在提及过滤之前进行转录，因此在语音笔记中说出机器人提及可以触发回复。如果转录内容仍未提及机器人，则转录内容会保留在待处理的群组历史记录中，而不是原始占位符。

    位置正文使用简短的坐标文本。位置标签/评论和联系人/vCard 详细信息被呈现为受围栏限制的不受信任的元数据，而不是内联提示文本。

  </Accordion>

  <Accordion title="待处理的群组历史记录注入">
    对于群组，未处理的消息可以缓冲并在机器人最终触发时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 后备方案：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已读回执"WhatsApp>
    默认情况下，对于接受的入站 WhatsApp 消息，已读回执已启用。

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

    每个帐户覆盖：

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

    即使全局启用，自聊也会跳过已读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先选择段落边界（空行），然后回退到长度安全的分块

  </Accordion>

  <Accordion title="出站媒体行为">
    - 支持图片、视频、音频（PTT 语音笔记）和文档负载
    - 音频媒体通过带有 `ptt: true` 的 Baileys `audio` 负载发送，因此 WhatsApp 客户端会将其渲染为按住通话（PTT）语音笔记
    - 回复负载会保留 `audioAsVoice`；WhatsApp 的 TTS 语音笔记输出即使提供商返回 MP3 或 WebM，也会保持在此 PTT 路径上
    - 原生 Ogg/Opus 音频作为 `audio/ogg; codecs=opus` 发送，以确保语音笔记兼容性
    - 非-Ogg 音频（包括 Microsoft Edge TTS MP3/WebM 输出）会在 PTT 传送前使用 `ffmpeg` 转码为 48 kHz 单声道 Ogg/Opus
    - `/tts latest` 将最新的助手回复作为一个语音笔记发送，并抑制对同一回复的重复发送；`/tts chat on|off|default` 控制当前 WhatsApp 聊天的自动 TTS
    - 支持通过视频发送上的 `gifPlayback: true` 播放动画 GIF
    - 发送多媒体回复负载时，字幕会应用于第一个媒体项，但 PTT 语音笔记会先发送音频，然后单独发送可见文本，因为 WhatsApp 客户端渲染语音笔记字幕的方式不一致
    - 媒体源可以是 HTTP(S)、`file://` 或本地路径

  </Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整大小/质量扫描）以适应限制
    - 媒体发送失败时，首项回退会发送文本警告，而不是静默丢弃响应

  </Accordion>
</AccordionGroup>

## 回复引用

WhatsApp 支持原生回复引用，即出站回复会显式引用入站消息。使用 `channels.whatsapp.replyToMode` 进行控制。

| 值          | 行为                                     |
| ----------- | ---------------------------------------- |
| `"off"`     | 从不引用；作为普通消息发送               |
| `"first"`   | 仅引用第一个出站回复分块                 |
| `"all"`     | 引用每个出站回复分块                     |
| `"batched"` | 引用排队批量回复，同时保留即时回复不引用 |

默认为 `"off"`。每个账户的覆盖项使用 `channels.whatsapp.accounts.<id>.replyToMode`。

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

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符号反应的广泛程度：

| 级别          | 确认反应 | 代理发起的反应 | 描述                          |
| ------------- | -------- | -------------- | ----------------------------- |
| `"off"`       | 否       | 否             | 完全没有反应                  |
| `"ack"`       | 是       | 否             | 仅确认反应（回复前回执）      |
| `"minimal"`   | 是       | 是（保守）     | 确认 + 代理反应，附带保守指导 |
| `"extensive"` | 是       | 是（鼓励）     | 确认 + 代理反应，附带鼓励指导 |

默认值：`"minimal"`。

每个账户的覆盖项使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

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

- 在接收入站后立即发送（回复前）
- 失败会被记录，但不会阻止正常回复的投递
- 群组模式 `mentions` 对提及触发的轮次进行反应；群组激活 `always` 充当此检查的绕过机制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧版 `messages.ackReaction`）

## 多账户和凭据

<AccordionGroup>
  <Accordion title="账户选择和默认值">
    - 账户 ID 来自 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在则选择 `default`，否则选择第一个配置的账户 ID（已排序）
    - 账户 ID 在内部进行规范化以便查找

  </Accordion>

  <Accordion title="凭据路径与旧版兼容性">
    - 当前认证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - 仍会识别/迁移 `~/.openclaw/credentials/` 中的旧版默认认证，用于默认帐户流程

  </Accordion>

  <Accordion title="登出行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该帐户的 WhatsApp 认证状态。

    当 Gateway(网关) 可达时，登出会首先停止所选帐户的实时 WhatsApp 监听器，以便关联的会话不会在下次重启之前继续接收消息。`openclaw channels remove --channel whatsapp` 在禁用或删除帐户配置之前也会停止实时监听器。

    在旧版认证目录中，`oauth.json` 会被保留，而 Baileys 认证文件会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- Agent 工具支持包括 WhatsApp 表情反应操作 (`react`)。
- 操作门控：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 渠道发起的配置写入默认已启用（可通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排除

<AccordionGroup>
  <Accordion title="未链接（需要 QR 码）">
    症状：渠道状态报告未链接。

    修复方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已连接但断开连接 / 重连循环">
    症状：已连接的帐户反复断开连接或尝试重新连接。

    不活跃的帐户可以保持连接超过正常的消息超时时间；当 WhatsApp Web 传输活动停止、套接字关闭或应用级活动在更长的安全窗口内保持静默时，看门狗会重启。

    如果日志显示重复的 `status=408 Request Time-out Connection was lost`，请调整 `web.whatsapp` 下的 Baileys 套接字计时。首先将 `keepAliveIntervalMs` 缩短到低于您网络的空闲超时时间，并在缓慢或易丢包的链路上增加 `connectTimeoutMs`：

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

    如果 `~/.openclaw/logs/whatsapp-health.log` 显示 `Gateway inactive` 但 `openclaw gateway status` 和 `openclaw channels status --probe` 显示网关和 WhatsApp 状态正常，请运行 `openclaw doctor`。在 Linux 上，doctor 会警告遗留的 crontab 条目仍然调用 `~/.openclaw/bin/ensure-whatsapp.sh`；请使用 `crontab -e` 删除那些过时的条目，因为 cron 可能缺少 systemd 用户总线环境，导致该旧脚本错误报告网关运行状况。

    如果需要，请使用 `channels login` 重新连接。

  </Accordion>

  <Accordion title="代理后 QR 登录超时">
    症状：在显示可用的 QR 码之前 `openclaw channels login --channel whatsapp` 失败，并出现 `status=408 Request Time-out` 或 TLS 套接字断开连接。

    WhatsApp Web 登录使用网关主机的标准代理环境（`HTTPS_PROXY`、`HTTP_PROXY`、小写变体以及 `NO_PROXY`）。请验证网关进程是否继承了代理环境，以及 `NO_PROXY` 是否不匹配 `mmg.whatsapp.net`。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    当目标帐户不存在活动网关监听器时，出站发送会快速失败。

    请确保网关正在运行且帐户已链接。

  </Accordion>

  <Accordion title="回复出现在对话记录中但未出现在WhatsApp中">
    对话记录行记录了生成器生成的内容。WhatsApp投递状态是单独检查的：OpenClaw 仅在Baileys为至少一次可见文本或媒体发送返回出站消息 ID 后，才将自动回复视为已发送。

    Ack 反应是独立于预回复的回执。成功的反应并不能证明后续的文本或媒体回复已被WhatsApp接受。

    检查网关日志中是否有 `auto-reply delivery failed` 或 `auto-reply was not accepted by WhatsApp provider`。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    请按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许列表条目
    - 提及限制（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重复键：后者的条目会覆盖前者，因此请在每个作用域内保持单个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 系统提示词

WhatsApp 支持通过 `groups` 和 `direct` 映射为群组和直接聊天提供类似 Telegram 风格的系统提示词。

群组消息的解析层级：

首先确定有效的 `groups` 映射：如果账户定义了自己的 `groups`，它将完全替换根 `groups` 映射（不进行深度合并）。然后对生成的单一映射运行提示词查找：

1. **群组特定系统提示词** (`groups["<groupId>"].systemPrompt`)：当映射中存在特定群组条目 **且** 定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 为空字符串 (`""`)，则通配符被抑制，不应用任何系统提示词。
2. **群组通配符系统提示词** (`groups["*"].systemPrompt`)：当映射中完全不存在特定群组条目，或者条目存在但未定义 `systemPrompt` 键时使用。

私信的解析层级：

首先确定有效的 `direct` 映射：如果账户定义了自己的 `direct`，它将完全替换根 `direct` 映射（不进行深度合并）。然后对生成的单一映射运行提示词查找：

1. **私信特定系统提示词** (`direct["<peerId>"].systemPrompt`)：当映射中存在特定对等条目 **且** 定义了其 `systemPrompt` 键时使用。如果 `systemPrompt` 为空字符串 (`""`)，则通配符被抑制，不应用任何系统提示词。
2. **私信通配符系统提示词** (`direct["*"].systemPrompt`)：当映射中完全不存在特定对等条目，或者条目存在但未定义 `systemPrompt` 键时使用。

<Note>
`dms` 仍然是轻量级的每条私信历史记录覆盖存储桶 (`dms.<id>.historyLimit`)。提示词覆盖位于 `direct` 下。
</Note>

**与 Telegram 多账号行为的区别：** 在 Telegram 中，在多账号设置中会刻意为所有账号抑制根 TelegramTelegram`groups` —— 即使是那些没有定义自己的 `groups`WhatsApp 的账号 —— 以防止机器人接收到其不属于的群组的消息。WhatsApp 不应用此防护措施：对于未定义账号级覆盖的账号，总是会继承根 `groups` 和根 `direct`WhatsApp，而不管配置了多少个账号。在多账号 WhatsApp 设置中，如果您希望针对每个账号使用不同的群组或直接提示，请在每个账号下明确定义完整的映射，而不是依赖根级别的默认值。

重要行为：

- `channels.whatsapp.groups` 既是按群组配置的映射，也是聊天级别的群组允许列表。无论是在根作用域还是账号作用域，`groups["*"]` 都意味着该作用域“允许所有群组”。
- 仅当您已经希望该作用域允许所有群组时，才添加通配符群组 `systemPrompt`。如果您仍然只希望有一组固定的群组 ID 符合条件，请不要将 `groups["*"]` 用作提示默认值。相反，请在每个明确允许列出的群组条目上重复该提示。
- 群组准入和发送者授权是独立的检查。`groups["*"]` 扩展了可以到达群组处理的群组集合，但它本身并不授权这些群组中的每个发送者。发送者访问权限仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 单独控制。
- `channels.whatsapp.direct` 对私信没有相同的副作用。`direct["*"]` 仅在私信已通过 `dmPolicy` 加上 `allowFrom` 或配对存储规则被允许后，提供默认的直接聊天配置。

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

- [配置参考 - WhatsApp](WhatsApp/en/gateway/config-channels#whatsapp)

高价值的 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- 会话 behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [安全性](/zh/gateway/security)
- [渠道路由](/zh/channels/channel-routing)
- [多座席路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)
