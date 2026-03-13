---
summary: "WhatsApp 频道支持、访问控制、传递行为和操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web channel)

状态：通过 WhatsApp Web (Baileys) 实现生产就绪。网关拥有链接的会话。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/en/channels/pairing">
    对于未知发送者，默认的私信策略是配对。
  </Card>
  <Card title="频道故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨频道诊断和修复手册。
  </Card>
  <Card title="网关配置" icon="settings" href="/en/gateway/configuration">
    完整的频道配置模式和示例。
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

  <Step title="关联 WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    对于特定账户：

```bash
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

    配对请求会在 1 小时后过期。待处理的请求每个频道最多限制为 3 个。

  </Step>
</Steps>

<Note>
OpenClaw 建议尽可能在单独的号码上运行 WhatsApp。（频道元数据和入门流程针对该设置进行了优化，但也支持个人号码设置。）
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最干净的操作模式：

    - 为 OpenClaw 使用独立的 WhatsApp 身份
    - 更清晰的私信白名单和路由边界
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

  <Accordion title="个人号码回退">
    入门支持个人号码模式，并写入一个自聊友好的基线：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包括您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护依赖于关联的自号码和 `allowFrom`。

  </Accordion>

  <Accordion title="WhatsApp Web-only channel scope">
    在当前的 OpenClaw 通道架构中，消息平台通道是基于 WhatsApp Web 的 (`Baileys`)。

    在内置的聊天通道注册表中，没有单独的 Twilio WhatsApp 消息通道。

  </Accordion>
</AccordionGroup>

## Runtime model

- Gateway owns the WhatsApp socket and reconnect loop.
- Outbound sends require an active WhatsApp listener for the target account.
- 状态和广播聊天会被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用 DM 会话规则 (`session.dmScope`; 默认 `main` 将 DM 折叠到代理主会话中)。
- 群组会话是隔离的 (`agent:<agentId>:whatsapp:group:<jid>`)。

## Access control and activation

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问：

    - `pairing` (默认)
    - `allowlist`
    - `open` (需要 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码 (在内部标准化)。

    多账户覆盖：对于该账户，`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 优先于通道级别的默认设置。

    Runtime behavior details:

    - 配对持久保存在通道允许存储中，并与配置的 `allowFrom` 合并
    - 如果未配置允许列表，则默认允许绑定的自身号码
    - 出站 `fromMe` DM 永远不会自动配对

  </Tab>

  <Tab title="Group policy + allowlists">
    群组访问有两层：

    1. **群组成员资格允许列表** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，则所有群组都符合资格
       - 如果存在 `groups`，它将作为群组允许列表 (允许 `"*"`)

    2. **Group sender policy** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: sender allowlist bypassed
       - `allowlist`: sender must match `groupAllowFrom` (or `*`)
       - `disabled`: block all group inbound

    发送方白名单回退：

    - 如果 `groupAllowFrom` 未设置，运行时在可用时会回退到 `allowFrom`
    - 发送方白名单在提及/回复激活之前进行评估

    注意：如果完全没有 `channels.whatsapp` 块，即使设置了 `channels.defaults.groupPolicy`，运行时组策略回退也是 `allowlist`（并带有警告日志）。

  </Tab>

  <Tab title="Mentions + /activation">
    默认情况下，群组回复需要提及。

    提及检测包括：

    - 对机器人身份的明确 WhatsApp 提及
    - 配置的提及正则表达式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人检测（回复发送者与机器人身份匹配）

    安全提示：

    - 引用/回复仅满足提及门控；它并**不**授予发送方授权
    - 使用 `groupPolicy: "allowlist"` 时，即使非白名单发送者回复了白名单用户的消息，他们仍会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者门控。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的自有号码也存在于 `allowFrom` 中时，WhatsApp 自聊保护机制会激活：

- 跳过自聊轮次的已读回执
- 忽略否则会ping你自己的提及 JID 自动触发行为
- 如果 `messages.responsePrefix` 未设置，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化和上下文

<AccordionGroup>
  <Accordion title="Inbound envelope + reply context">
    传入的 WhatsApp 消息被封装在共享的入站信封中。

    如果存在引用回复，上下文将按此格式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    如果可用，回复元数据字段也会被填充（`ReplyToId`，`ReplyToBody`，`ReplyToSender`，发送者 JID/E.164）。

  </Accordion>

  <Accordion title="媒体占位符以及位置/联系人提取">
    仅包含媒体的入站消息会通过如下占位符进行标准化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和联系人载荷会在路由之前被标准化为文本上下文。

  </Accordion>

  <Accordion title="待处理群组历史记录注入">
    对于群组，未处理的消息可以被缓冲，并在最终触发机器人时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已读回执">
    对于已接受的入站 WhatsApp 消息，已读回执默认处于启用状态。

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

    即使全局已启用，自聊轮次也会跳过已读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先使用段落边界（空行），然后回退到长度安全的分块
  </Accordion>

  <Accordion title="Outbound media behavior">
    - 支持图像、视频、音频（PTT 语音笔记）和文档负载
    - 为了语音笔记兼容性，`audio/ogg` 会被重写为 `audio/ogg; codecs=opus`
    - 通过视频发送时的 `gifPlayback: true` 支持动态 GIF 播放
    - 发送多媒体回复负载时，字幕会应用于第一个媒体项
    - 媒体源可以是 HTTP(S)、`file://` 或本地路径
  </Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图像会自动优化（调整大小/质量扫描）以适应限制
    - 媒体发送失败时，首项回退会发送文本警告，而不是静默丢弃响应
  </Accordion>
</AccordionGroup>

## Acknowledgment reactions

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站回执进行即时确认反应。

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

Behavior notes:

- sent immediately after inbound is accepted (pre-reply)
- failures are logged but do not block normal reply delivery
- 群组模式 `mentions` 对提及触发的轮次做出反应；群组激活 `always` 充当此检查的绕过方式
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧的 `messages.ackReaction`）

## Multi-account and credentials

<AccordionGroup>
  <Accordion title="Account selection and defaults">
    - 账户 ID 来自 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在 `default` 则使用它，否则使用第一个配置的账户 ID（已排序）
    - 账户 ID 在内部进行规范化以供查找
  </Accordion>

  <Accordion title="凭据路径和旧版兼容性">
    - 当前身份验证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认身份验证仍会被识别/迁移，用于默认账户流程
  </Accordion>

  <Accordion title="登出行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该账户的 WhatsApp 身份验证状态。

    在旧版身份验证目录中，`oauth.json` 会被保留，而 Baileys 身份验证文件会被删除。

  </Accordion>
</AccordionGroup>

## Tools, actions, and config writes

- Agent 工具支持包括 WhatsApp 反应操作 (`react`)。
- Action gates:
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 通道发起的配置写入默认处于启用状态（可通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排除

<AccordionGroup>
  <Accordion title="未链接（需要二维码）">
    症状：通道状态报告未链接。

    修复方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已链接但断开连接 / 重连循环">
    症状：已链接的账户出现反复断开连接或尝试重连的情况。

    修复方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如果需要，请使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    当目标账户不存在活动的网关监听器时，出站发送会快速失败。

    确保网关正在运行且账户已链接。

  </Accordion>

  <Accordion title="群消息被意外忽略">
    请按以下顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 白名单条目
    - 提及限制 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的，因此每个作用域请保持单个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 配置参考指针

主要参考：

- [配置参考 - WhatsApp](/en/gateway/configuration-reference#whatsapp)

高价值 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, 账户级覆盖
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- session behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## 相关

- [配对](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [故障排除](/en/channels/troubleshooting)

import zh from '/components/footer/zh.mdx';

<zh />
