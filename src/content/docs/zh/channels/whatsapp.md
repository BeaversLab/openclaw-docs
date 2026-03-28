---
summary: "WhatsApp 渠道支持、访问控制、投递行为和运维"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 渠道)

状态：通过 WhatsApp Web (Baileys) 已可用于生产环境。Gateway(网关) 拥有已关联的会话。

## 按需安装

- 新手引导 (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  会在您首次选择时提示安装 WhatsApp 插件。
- 当插件尚未安装时，`openclaw channels login --channel whatsapp` 也会提供安装流程。
- Dev 渠道 + git checkout：默认使用本地插件路径。
- Stable/Beta：默认使用 npm 包 `@openclaw/whatsapp`。

手动安装仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    对于未知发送者，默认私信策略为配对。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复操作手册。
  </Card>
  <Card title="Gateway(网关) 配置" icon="settings" href="/zh/gateway/configuration">
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

  <Step title="关联 WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    对于特定账户：

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="启动 Gateway(网关)">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配对请求（如果使用配对模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求在 1 小时后过期。每个渠道的待处理请求上限为 3 个。

  </Step>
</Steps>

<Note>OpenClaw 建议尽可能在单独的号码上运行 WhatsApp。（渠道元数据和 设置流程已针对该设置进行了优化，但也支持个人号码设置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="Dedicated number (recommended)">
    这是最干净的操作模式：

    - 为 OpenClaw 提供独立的 WhatsApp 身份
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
    新手引导支持个人号码模式，并写入对自聊友好的基准配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护机制基于关联的自身号码和 `allowFrom`。

  </Accordion>

  <Accordion title="WhatsApp Web-only 渠道 scope">
    在当前的 WhatsApp 渠道架构中，消息平台渠道是基于 OpenClaw Web (`Baileys`) 的。

    在内置的聊天渠道注册表中，没有单独的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp 套接字和重连循环。
- 出站发送需要目标帐户有活动的 WhatsApp 监听器。
- 状态和广播聊天会被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用私信会话规则 (`session.dmScope`；默认 `main` 将私信合并到代理主会话)。
- 群组会话是隔离的 (`agent:<agentId>:whatsapp:group:<jid>`)。

## 访问控制和激活

<Tabs>
  <Tab title="私信 policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问权限：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码（内部标准化）。

    多账户覆盖：对于该账户，`channels.whatsapp.accounts.<id>.dmPolicy`（和 `allowFrom`）优先于渠道级别的默认设置。

    运行时行为详情：

    - 配对持久化保存在渠道允许存储中，并与已配置的 `allowFrom` 合并
    - 如果未配置允许列表，默认允许关联的自有号码
    - 出站 `fromMe` 私信永远不会自动配对

  </Tab>

  <Tab title="Group policy + allowlists">
    群组访问权限分为两层：

    1. **群组成员允许列表**（`channels.whatsapp.groups`）
       - 如果省略 `groups`，则所有群组都符合条件
       - 如果存在 `groups`，它将作为群组允许列表（允许 `"*"`）

    2. **群组发送者策略**（`channels.whatsapp.groupPolicy` + `groupAllowFrom`）
       - `open`：绕过发送者允许列表
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站消息

    发送者允许列表回退机制：

    - 如果未设置 `groupAllowFrom`，运行时会在可用时回退到 `allowFrom`
    - 发送者允许列表在提及/回复激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 代码块，即使设置了 `channels.defaults.groupPolicy`，运行时群组策略回退也是 `allowlist`（并带有警告日志）。

  </Tab>

  <Tab title="提及 + /activation">
    群组回复默认需要提及。

    提及检测包括：

    - 针对机器人身份的明确 WhatsApp 提及
    - 已配置的提及正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 隐式的回复机器人检测（回复发送者与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及门控；它并**不**授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，即使非白名单发送者回复了白名单用户的消息，他们仍会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者门控控制。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的自身号码也存在于 `allowFrom` 中时，WhatsApp 自聊保护措施会被激活：

- 跳过自聊回合的已读回执
- 忽略提及 JID 自动触发行为，否则这将会 @ 提醒你自己
- 如果 `messages.responsePrefix` 未设置，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化和上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息被封装在共享的入站信封中。

    如果存在引用回复，上下文将按以下形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也会被填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、发送者 JID/E.164）。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅包含媒体的入站消息将使用诸如以下的占位符进行规范化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和联系人负载会在路由之前被规范化为文本上下文。

  </Accordion>

  <Accordion title="待处理群组历史记录注入">
    对于群组，未处理的消息可以被缓冲，并在机器人最终被触发时作为上下文注入。

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

    自聊回合会跳过已读回执，即使已全局启用。

  </Accordion>
</AccordionGroup>

## 发送、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先考虑段落边界（空行），然后回退到长度安全的分块
  </Accordion>

<Accordion title="出站媒体行为">- 支持图片、视频、音频（PTT 语音笔记）和文档负载 - `audio/ogg` 被重写 为 `audio/ogg; codecs=opus` 以兼容语音笔记 - 支持通过 `gifPlayback: true` 在发送视频时播放动态 GIF - 发送多媒体回复负载时，标题会应用于第一个媒体项 - 媒体源可以是 HTTP(S)、`file://` 或本地路径</Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账号的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整大小/质量扫描）以符合限制
    - 当媒体发送失败时，首项回退会发送文本警告，而不是静默放弃响应
  </Accordion>
</AccordionGroup>

## 确认反应

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站接收进行即时确认反应。

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
- 失败会被记录，但不会阻止正常回复的投递
- 群组模式 `mentions` 仅对提及触发的轮次做出反应；群组激活 `always` 可绕过此检查
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧版的 `messages.ackReaction`）

## 多账号和凭据

<AccordionGroup>
  <Accordion title="Account selection and defaults">
    - 账号 ID 来自 `channels.whatsapp.accounts`
    - 默认账号选择：如果存在 `default` 则使用它，否则使用第一个配置的账号 ID（已排序）
    - 账号 ID 会在内部进行规范化以便查找
  </Accordion>

  <Accordion title="Credential paths and legacy compatibility">
    - 当前认证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认认证仍会被识别/迁移以用于默认账号流程
  </Accordion>

  <Accordion title="Logout behavior">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该账号的 WhatsApp 认证状态。

    在旧版认证目录中，`oauth.json` 会被保留，而 Baileys 认证文件会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- 代理工具支持包括 WhatsApp 反应操作 (`react`)。
- 操作门槛：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 渠道发起的配置写入默认已启用（通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排除

<AccordionGroup>
  <Accordion title="未链接（需要 QR）">
    症状：渠道状态报告未链接。

    修复：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已链接但断开连接 / 重连循环">
    症状：已链接账户出现反复断开或尝试重连。

    修复：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有必要，请使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="发送时无活跃监听器">
    当目标账户不存在活跃的网关监听器时，出站发送会快速失败。

    确保网关正在运行且账户已链接。

  </Accordion>

  <Accordion title="群组消息被意外忽略">
    请按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许列表条目
    - 提及筛选 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重复键：后条目会覆盖前条目，因此请在每个作用域内保留单个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 配置参考指针

主要参考：

- [配置参考 - WhatsApp](/zh/gateway/configuration-reference#whatsapp)

高优先级 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- 多账号：`accounts.<id>.enabled`，`accounts.<id>.authDir`，账号级覆盖
- 操作：`configWrites`，`debounceMs`，`web.enabled`，`web.heartbeatSeconds`，`web.reconnect.*`
- 会话行为：`session.dmScope`，`historyLimit`，`dmHistoryLimit`，`dms.<id>.historyLimit`

## 相关

- [配对](/zh/channels/pairing)
- [通道路由](/zh/channels/channel-routing)
- [多代理路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)
