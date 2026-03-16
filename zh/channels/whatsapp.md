---
summary: "WhatsApp 渠道支持、访问控制、传递行为和运维"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 渠道)

状态：通过 WhatsApp Web (Baileys) 已可用于生产环境。Gateway(网关) 拥有已关联的会话。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    对于未知发送者，默认私信策略为配对。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关) configuration" icon="settings" href="/en/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="Configure WhatsApp access policy">

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

  <Step title="Link WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    对于特定账户：

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="Start the gateway">

```bash
openclaw gateway
```

  </Step>

  <Step title="Approve first pairing request (if using pairing mode)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求会在 1 小时后过期。待处理的请求每个渠道上限为 3 个。

  </Step>
</Steps>

<Note>
  OpenClaw 建议尽可能在单独的号码上运行 WhatsApp。（该渠道的元数据和
  新手引导流程针对该设置进行了优化，但也支持个人号码设置。）
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated number (recommended)">
    这是最干净的操作模式：

    - 为 OpenClaw 分离 WhatsApp 身份
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

  <Accordion title="Personal-number fallback">
    新手引导支持个人号码模式，并写入对自聊友好的基线配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护基于关联的自号码和 `allowFrom` 生效。

  </Accordion>

  <Accordion title="WhatsApp Web-only 渠道 scope">
    The messaging platform 渠道 is WhatsApp Web-based (`Baileys`) in current WhatsApp 渠道 architecture.

    There is no separate Twilio OpenClaw messaging 渠道 in the built-in chat-渠道 registry.

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp 套接字和重连循环。
- 发送出站消息需要目标账户有一个活跃的 WhatsApp 监听器。
- 状态和广播群聊会被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用私信会话规则 (`session.dmScope`；默认的 `main` 会将私信合并到座席主会话中)。
- 群组会话是隔离的 (`agent:<agentId>:whatsapp:group:<jid>`)。

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问权限：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码（在内部进行规范化）。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（和 `allowFrom`）优先于该账户的渠道级默认设置。

    运行时行为详细信息：

    - 配对持久保存在渠道允许存储中，并与已配置的 `allowFrom` 合并
    - 如果未配置允许列表，则默认允许关联的自主号码
    - 出站 `fromMe` 私信永远不会自动配对

  </Tab>

  <Tab title="群组策略 + 允许列表">
    群组访问有两个层级：

    1. **群组成员允许列表** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，则所有群组均符合条件
       - 如果存在 `groups`，它将作为群组允许列表（`"*"` 已获准）

    2. **群组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：绕过发送者允许列表
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站消息

    发送者允许列表回退机制：

    - 如果未设置 `groupAllowFrom`，运行时在可用时回退到 `allowFrom`
    - 发送者允许列表在提及/回复激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 代码块，即使设置了 `channels.defaults.groupPolicy`，运行时群组策略回退也是 `allowlist`（并附带警告日志）。

  </Tab>

  <Tab title="Mentions + /activation">
    默认情况下，群组回复需要提及。

    提及检测包括：

    - 针对 bot 身份的显式 WhatsApp 提及
    - 配置的提及正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 隐式回复-bot 检测（回复发送者与 bot 身份匹配）

    安全说明：

    - 引用/回复仅满足提及门控；它**不**授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，即使非白名单发送者回复了白名单用户的消息，他们仍将被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者门控。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的自我号码也存在于 `allowFrom` 中时，WhatsApp 自聊保护措施将激活：

- 跳过自聊轮次的已读回执
- 忽略提及 JID 自动触发行为，否则它会ping你自己
- 如果未设置 `messages.responsePrefix`，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化与上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息被封装在共享的入站信封中。

    如果存在引用回复，上下文会以这种形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段也会在可用时被填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、发送者 JID/E.164）。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅包含媒体的入站消息会使用占位符进行规范化，例如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和联系人载荷会在路由之前被规范化为文本上下文。

  </Accordion>

  <Accordion title="待处理的群组历史记录注入">
    对于群组，未处理的消息可以被缓存，并在机器人最终被触发时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Read receipts">
    默认情况下，针对已接受的入站 WhatsApp 消息启用已读回执。

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

    自聊天回合跳过已读回执，即使全局已启用。

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
  - 支持图像、视频、音频（PTT 语音笔记）和文档负载 - `audio/ogg` 被重写 为 `audio/ogg; codecs=opus`
  以兼容语音笔记 - 支持通过 `gifPlayback: true` 在视频发送时播放动态 GIF -
  发送多媒体回复负载时，字幕将应用于第一个媒体项 - 媒体源可以是 HTTP(S)、`file://` 或本地路径
</Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整大小/质量扫描）以适应限制
    - 媒体发送失败时，第一项回退会发送文本警告，而不是静默丢弃响应
  </Accordion>
</AccordionGroup>

## 确认反应

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站接收进行即时 ack 反应。

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
- 失败会被记录，但不会阻止正常回复的发送
- 群组模式 `mentions` 会在提及触发的轮次中做出反应；群组激活 `always` 可用作此检查的绕过方式
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用传统的 `messages.ackReaction`）

## 多账户和凭据

<AccordionGroup>
  <Accordion title="Account selection and defaults">
    - 帐户 ID 来自 `channels.whatsapp.accounts`
    - 默认帐户选择：如果存在 `default`，则选择它，否则选择第一个配置的帐户 ID（已排序）
    - 帐户 ID 在内部进行规范化以用于查找
  </Accordion>

  <Accordion title="凭证路径与旧版兼容性">
    - 当前的身份验证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认身份验证仍会被识别/迁移，用于默认账户流程
  </Accordion>

  <Accordion title="登出行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该账户的 WhatsApp 身份验证状态。

    在旧版身份验证目录中，`oauth.json` 会被保留，而 Baileys 身份验证文件则会被移除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- 代理工具支持包括 WhatsApp 反应操作 (`react`)。
- 操作门控：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 渠道发起的配置写入默认已启用（通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排除

<AccordionGroup>
  <Accordion title="未链接（需要 QR 码）">
    症状：渠道状态报告显示未链接。

    修复方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已链接但已断开连接 / 重连循环">
    症状：已链接的账户反复断开连接或尝试重连。

    修复方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有必要，请使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="发送时没有活动的监听器">
    当目标帐户不存在活动的网关监听器时，出站发送会快速失败。

    请确保网关正在运行且帐户已链接。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许列表条目
    - 提及门控 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的条目，因此在每个作用域内保持单个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 配置参考指南

主要参考：

- [配置参考 - WhatsApp](/en/gateway/configuration-reference#whatsapp)

高优先级的 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, 帐户级覆盖
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 会话 behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## 相关

- [配对](/en/channels/pairing)
- [通道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [故障排除](/en/channels/troubleshooting)

import zh from "/components/footer/zh.mdx";

<zh />
