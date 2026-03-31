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
  会在您首次选择 WhatsApp 插件时提示您进行安装。
- 当插件尚未安装时，`openclaw channels login --channel whatsapp` 也会提供安装流程。
- Dev 渠道 + git checkout：默认使用本地插件路径。
- Stable/Beta：默认使用 npm 包 `@openclaw/whatsapp`。

手动安装仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/en/channels/pairing">
    对于未知发件人，默认的私信策略为配对。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/en/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关) 配置" icon="settings" href="/en/gateway/configuration">
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

  <Step title="链接 WhatsApp (二维码)">

```bash
openclaw channels login --channel whatsapp
```

    对于特定账户：

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="启动 Gateway">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首个配对请求（如果使用配对模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求会在 1 小时后过期。每个渠道的待处理请求上限为 3 个。

  </Step>
</Steps>

<Note>OpenClaw 建议尽可能在单独的电话号码上运行 WhatsApp。（渠道元数据和设置流程已针对该设置进行了优化，但也支持个人号码设置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最干净的操作模式：

    - 为 WhatsApp 提供单独的 OpenClaw 身份
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
    新手引导支持个人号码模式，并写入适合自聊的基准配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包括您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护机制基于关联的自身号码和 `allowFrom` 生效。

  </Accordion>

  <Accordion title="仅 WhatsApp Web 渠道范围">
    在当前的 OpenClaw 渠道架构中，消息平台渠道基于 WhatsApp Web (`Baileys`)。

    内置的聊天渠道注册表中没有单独的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp 套接字和重连循环。
- 出站发送需要目标帐户有活动的 WhatsApp 监听器。
- 状态和广播聊天会被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用私信会话规则 (`session.dmScope`; 默认 `main` 会将私信合并到代理主会话中)。
- 群组会话是隔离的 (`agent:<agentId>:whatsapp:group:<jid>`)。

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问权限：

    - `pairing` (默认)
    - `allowlist`
    - `open` (要求 `allowFrom` 包括 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码 (内部标准化)。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy` (和 `allowFrom`) 的优先级高于该账户的渠道级默认设置。

    运行时行为详情：

    - 配对信息保存在渠道允许存储中，并与已配置的 `allowFrom` 合并
    - 如果未配置允许列表，默认允许关联的自身号码
    - 出站 `fromMe` 私信绝不会自动配对

  </Tab>

  <Tab title="组策略 + 允许列表">
    组访问有两个层级：

    1. **组成员资格允许列表** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，则所有组都有资格
       - 如果存在 `groups`，它将作为组允许列表（仅允许 `"*"`）

    2. **组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：绕过发送者允许列表
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有组入站消息

    发送者允许列表回退：

    - 如果未设置 `groupAllowFrom`，运行时会在可用时回退到 `allowFrom`
    - 发送者允许列表在提及/回复激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 块，即使设置了 `channels.defaults.groupPolicy`，运行时组策略回退也是 `allowlist`（并带有警告日志）。

  </Tab>

  <Tab title="提及 + /activation">
    默认情况下，组回复需要提及。

    提及检测包括：

    - 对机器人身份的明确 WhatsApp 提及
    - 配置的提及正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 隐式“回复机器人”检测（回复发送者与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及限制；它并**不**授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，非允许列表中的发送者即使回复允许列表用户的消息，仍会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者限制。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的自助号码也出现在 `allowFrom` 中时，WhatsApp 自聊安全保护机制会激活：

- 跳过自聊回合的已读回执
- 忽略提及 JID 自动触发行为，否则这将会 @ 提醒你自己
- 如果未设置 `messages.responsePrefix`，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化和上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息被封装在共享的入站信封中。

    如果存在引用回复，上下文将以以下形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也会被填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、发送方 JID/E.164）。

  </Accordion>

  <Accordion title="媒体占位符以及位置/联系人提取">
    仅包含媒体的入站消息会使用以下占位符进行标准化：

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
    默认为接受的入站 WhatsApp 消息启用已读回执。

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

## 发送、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先考虑段落边界（空行），然后回退到长度安全的分块
  </Accordion>

<Accordion title="出站媒体行为">- 支持图片、视频、音频（PTT 语音笔记）和文档负载 - 为了兼容语音笔记，`audio/ogg` 会被重写为 `audio/ogg; codecs=opus` - 支持通过 `gifPlayback: true` 在视频发送时播放动画 GIF - 发送多媒体回复负载时，字幕会应用于第一个媒体项 - 媒体源可以是 HTTP(S)、`file://` 或本地路径</Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整大小/质量扫描）以适应限制
    - 媒体发送失败时，首项回退会发送文本警告，而不是静默放弃响应
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
- 群组模式 `mentions` 对提及触发的轮次做出反应；群组激活 `always` 作为此检查的绕过方式
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧版 `messages.ackReaction`）

## 多账号和凭据

<AccordionGroup>
  <Accordion title="帐户选择和默认值">
    - 帐户 ID 来自 `channels.whatsapp.accounts`
    - 默认帐户选择：如果存在 `default` 则使用，否则使用第一个配置的帐户 ID（已排序）
    - 帐户 ID 在内部进行规范化以便查找
  </Accordion>

  <Accordion title="凭据路径和旧版兼容性">
    - 当前身份验证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认身份验证仍被识别/迁移用于默认帐户流程
  </Accordion>

  <Accordion title="Logout behavior">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该帐户的 WhatsApp 认证状态。

    在旧版认证目录中，`oauth.json` 会被保留，但 Baileys 认证文件会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- 代理工具支持包括 WhatsApp 表情反应操作 (`react`)。
- 操作门槛：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 默认启用渠道发起的配置写入（可通过 `channels.whatsapp.configWrites=false` 禁用）。

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

  <Accordion title="Linked but disconnected / reconnect loop">
    症状：已链接的帐户出现重复断开连接或重新连接尝试。

    修复方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有必要，请使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="No active listener when sending">
    当目标帐户不存在活动的网关监听器时，出站发送会快速失败。

    确保网关正在运行且帐户已链接。

  </Accordion>

  <Accordion title="Group messages unexpectedly ignored">
    请按以下顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 白名单条目
    - 提及筛选 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的条目，因此每个作用域请仅保留一个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun runtime warning">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 配置参考指针

主要参考：

- [配置参考 - WhatsApp](/en/gateway/configuration-reference#whatsapp)

高优先级 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 会话 behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## 相关

- [配对](/en/channels/pairing)
- [渠道路由](/en/channels/channel-routing)
- [多代理路由](/en/concepts/multi-agent)
- [故障排除](/en/channels/troubleshooting)
