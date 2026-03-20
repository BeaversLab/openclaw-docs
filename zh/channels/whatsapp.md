---
summary: "WhatsApp 渠道支持、访问控制、投递行为和操作"
read_when:
  - 正在处理 WhatsApp/web 渠道行为或收件箱路由
title: "WhatsApp"
---

# WhatsApp (Web 渠道)

状态：通过 WhatsApp Web (Baileys) 已可用于生产环境。Gateway(网关) 拥有已关联的会话。

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

  <Step title="链接 WhatsApp (QR)">

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

  <Step title="批准第一个配对请求（如果使用配对模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求将在 1 小时后过期。每个渠道的待处理请求限制为 3 个。

  </Step>
</Steps>

<Note>
  OpenClaw 建议尽可能在单独的号码上运行
  WhatsApp。（渠道元数据和设置流程已针对该设置进行了优化，但也支持个人号码设置。）
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最干净的操作模式：

    - 为 OpenClaw 使用单独的 WhatsApp 身份
    - 更清晰的私信允许列表和路由边界
    - 自聊混淆的几率更低

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

  <Accordion title="个人号码备用">
    新手引导支持个人号码模式，并写入支持自聊的基准配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护依赖于关联的自号码和 `allowFrom`。

  </Accordion>

  <Accordion title="WhatsApp Web 专用渠道范围">
    在当前的 OpenClaw 渠道架构中，消息平台渠道是基于 WhatsApp Web 的 (`Baileys`)。

    内置的 chat-渠道 注册表中没有单独的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp 套接字和重连循环。
- 发送出站消息需要目标账户有一个活跃的 WhatsApp 监听器。
- 状态和广播聊天会被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用私信会话规则 (`session.dmScope`；默认 `main` 将私信折叠到座席主会话)。
- 群组会话是隔离的 (`agent:<agentId>:whatsapp:group:<jid>`)。

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.whatsapp.dmPolicy` 控制直接聊天的访问权限：

    - `pairing` (默认)
    - `allowlist`
    - `open` (要求 `allowFrom` 包含 `"*"`)
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码 (内部进行标准化)。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy` (以及 `allowFrom`) 优先于该账户的渠道级别默认设置。

    运行时行为详情：

    - 配对会持久化保存在渠道允许存储中，并与已配置的 `allowFrom` 合并
    - 如果未配置允许列表，则默认允许关联的自我号码
    - 出站 `fromMe` 私信绝不会自动配对

  </Tab>

  <Tab title="组策略 + 允许列表">
    组访问有两个层级：

    1. **组成员资格允许列表** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，则所有组都符合资格
       - 如果存在 `groups`，则它作为组允许列表（允许 `"*"`）

    2. **组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：绕过发送者允许列表
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有组入站消息

    发送者允许列表回退：

    - 如果未设置 `groupAllowFrom`，运行时在可用时回退到 `allowFrom`
    - 发送者允许列表在提及/回复激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 块，即使设置了 `channels.defaults.groupPolicy`，运行时组策略回退也是 `allowlist`（并带有警告日志）。

  </Tab>

  <Tab title="提及 + /activation">
    默认情况下，组回复需要提及。

    提及检测包括：

    - 对机器人身份的明确 WhatsApp 提及
    - 配置的提及正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 隐式回复机器人检测（回复发送者与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及限制；它并**不**授予发送者权限
    - 使用 `groupPolicy: "allowlist"` 时，非允许列表中的发送者即使回复允许列表用户的消息也会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者限制。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的自有号码也出现在 `allowFrom` 中时，WhatsApp 自聊保护机制将激活：

- 跳过自聊轮次的已读回执
- 忽略提及 JID 自动触发行为，否则它会ping你自己
- 如果未设置 `messages.responsePrefix`，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化与上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息封装在共享的入站信封中。

    如果存在引用回复，上下文将以以下形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也会被填充（`ReplyToId`，`ReplyToBody`，`ReplyToSender`，sender JID/E.164）。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅包含媒体的入站消息会使用如下占位符进行规范化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和联系人载荷会在路由之前规范化为文本上下文。

  </Accordion>

  <Accordion title="待处理群组历史记录注入">
    对于群组，未处理的消息可以被缓存，并在最终触发机器人时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已读回执">
    对于接受的入站 WhatsApp 消息，默认启用已读回执。

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

    自聊回合会跳过已读回执，即使在全局启用的情况下。

  </Accordion>
</AccordionGroup>

## 投递、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先使用段落边界（空行），然后回退到长度安全的分块
  </Accordion>

<Accordion title="出站媒体行为">
  - 支持图片、视频、音频（PTT 语音笔记）和文档有效载荷 - `audio/ogg` 被重写为 `audio/ogg;
  codecs=opus` 以兼容语音笔记 - 支持通过 `gifPlayback: true` 在视频发送时播放动画 GIF -
  发送多媒体回复有效载荷时，标题字幕应用于第一个媒体项 - 媒体来源可以是 HTTP(S)、`file://`
  或本地路径
</Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整大小/质量扫描）以适应限制
    - 媒体发送失败时，首项回退机制会发送文本警告，而不是静默丢弃响应
  </Accordion>
</AccordionGroup>

## 确认反应

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站接收进行立即确认反应。

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
- 群组模式 `mentions` 对提及触发的轮次做出反应；群组激活 `always` 充当此检查的绕过机制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用传统的 `messages.ackReaction`）

## 多账户和凭据

<AccordionGroup>
  <Accordion title="账户选择和默认值">
    - 账户 ID 来自 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在则选择 `default`，否则选择第一个配置的账户 ID（已排序）
    - 账户 ID 在内部进行规范化以便查找
  </Accordion>

  <Accordion title="凭证路径和传统兼容性">
    - 当前身份验证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的传统默认身份验证仍会被识别/迁移以用于默认账户流程
  </Accordion>

  <Accordion title="注销行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该帐户的 WhatsApp 身份验证状态。

    在旧版身份验证目录中，`oauth.json` 会被保留，而 Baileys 身份验证文件会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- Agent WhatsApp 支持包括 WhatsApp 反应操作 (`react`)。
- 操作门控：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 渠道发起的配置写入默认处于启用状态（可通过 `channels.whatsapp.configWrites=false` 禁用）。

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

  <Accordion title="已链接但断开连接 / 重连循环">
    症状：已链接的帐户出现反复断开连接或尝试重连的情况。

    修复方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有必要，请使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    当目标帐户不存在活动网关监听器时，出站发送会快速失败。

    请确保网关正在运行且帐户已链接。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    请按以下顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许列表条目
    - 提及门控 (`requireMention` + 提及模式)
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的条目，因此请为每个作用域保持单个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 配置参考指南

主要参考：

- [配置参考 - WhatsApp](/zh/gateway/configuration-reference#whatsapp)

高优先级的 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 会话 behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## 相关

- [配对](/zh/channels/pairing)
- [通道路由](/zh/channels/channel-routing)
- [多座席路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)

import zh from "/components/footer/zh.mdx";

<zh />
