---
summary: "WhatsApp渠道支持、访问控制、传递行为和操作"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 渠道)

状态：通过 WhatsApp Web (Baileys) 已可用于生产环境。Gateway(网关) 拥有已关联的会话。

## 按需安装

- 新手引导(`openclaw onboard`)和`openclaw channels add --channel whatsapp`
  会在您首次选择时提示安装WhatsApp插件。
- `openclaw channels login --channel whatsapp`也提供安装流程，当
  插件尚未存在时。
- Dev 渠道 + git checkout：默认使用本地插件路径。
- 稳定版/测试版：默认使用npm包`@openclaw/whatsapp`。

手动安装仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh/channels/pairing">
    针对未知发送者的默认私信策略为配对。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway配置" icon="settings" href="/zh/gateway/configuration">
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

  <Step title="链接 WhatsApp (二维码)">

```bash
openclaw channels login --channel whatsapp
```

    针对特定账户：

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

    配对请求会在 1 小时后过期。待处理的请求每个渠道最多限制为 3 个。

  </Step>
</Steps>

<Note>OpenClaw 建议尽可能在单独的电话号码上运行 WhatsApp。（渠道元数据和设置流程已针对该设置进行了优化，但也支持个人号码设置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最干净的操作模式：

    - 为 WhatsApp 提供独立的 OpenClaw 身份
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
    新手引导支持个人号码模式，并写入对自聊友好的基线配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护措施基于关联的自身号码和 `allowFrom` 进行。

  </Accordion>

  <Accordion title="WhatsApp Web 仅限渠道范围">
    在当前的 WhatsApp 渠道架构中，消息平台渠道基于 OpenClaw Web (`Baileys`)。

    在内置的聊天渠道注册表中，没有单独的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp 套接字和重连循环。
- 出站发送需要为目标账户提供活动的 WhatsApp 侦听器。
- 状态和广播聊天将被忽略 (`@status`, `@broadcast`)。
- Direct chats use 私信 会话 rules (`session.dmScope`; default `main` collapses 私信 to the agent main 会话).
- Group sessions are isolated (`agent:<agentId>:whatsapp:group:<jid>`).
- WhatsApp Web transport honors standard proxy 环境变量 on the gateway host (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / lowercase variants). Prefer host-level proxy config over 渠道-specific WhatsApp proxy settings.

## Access control and activation

<Tabs>
  <Tab title="私信 policy">
    `channels.whatsapp.dmPolicy` controls direct chat access:

    - `pairing` (default)
    - `allowlist`
    - `open` (requires `allowFrom` to include `"*"`)
    - `disabled`

    `allowFrom` accepts E.164-style numbers (normalized internally).

    Multi-account override: `channels.whatsapp.accounts.<id>.dmPolicy` (and `allowFrom`) take precedence over 渠道-level defaults for that account.

    Runtime behavior details:

    - pairings are persisted in 渠道 allow-store and merged with configured `allowFrom`
    - if no allowlist is configured, the linked self number is allowed by default
    - outbound `fromMe` 私信 are never auto-paired

  </Tab>

  <Tab title="群组策略 + 允许列表">
    群组访问分为两层：

    1. **群组成员允许列表** (`channels.whatsapp.groups`)
       - 如果省略 `groups`，则所有群组都符合条件
       - 如果存在 `groups`，它将作为群组允许列表（仅 `"*"` 允许）

    2. **群组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`：绕过发送者允许列表
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站消息

    发送者允许列表回退：

    - 如果未设置 `groupAllowFrom`，运行时在可用时将回退到 `allowFrom`
    - 发送者允许列表在提及/回复激活之前进行评估

    注意：如果根本不存在 `channels.whatsapp` 块，即使设置了 `channels.defaults.groupPolicy`，运行时群组策略回退也是 `allowlist`（并带有警告日志）。

  </Tab>

  <Tab title="提及 + /activation">
    群组回复默认需要提及。

    提及检测包括：

    - 机器人身份的明确 WhatsApp 提及
    - 配置的提及正则表达式模式 (`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`)
    - 隐式回复机器人检测（回复发送者与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及门控；它并**不**授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，即使非允许列表中的发送者回复了允许列表用户的消息，他们仍会被阻止

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者门控。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的自身号码也存在于 `allowFrom` 中时，WhatsApp 自聊保护机制会激活：

- 跳过自聊轮次的已读回执
- 忽略提及 JID 的自动触发行为，否则该行为会 ping 你自己
- 如果未设置 `messages.responsePrefix`，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化和上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息被封装在共享的入站信封中。

    如果存在引用回复，上下文会以这种形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段在可用时也会被填充 (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, sender JID/E.164)。

  </Accordion>

  <Accordion title="媒体占位符和位置/联系人提取">
    仅包含媒体的入站消息会使用如下占位符进行规范化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和联系人负载会在路由之前被规范化为文本上下文。

  </Accordion>

  <Accordion title="待处理的群组历史记录注入">
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

<Accordion title="出站媒体行为">- 支持图像、视频、音频（PTT 语音笔记）和文档有效负载 - 为了与语音笔记兼容，`audio/ogg` 会被重写为 `audio/ogg; codecs=opus` - 通过发送视频时的 `gifPlayback: true` 支持动态 GIF 播放 - 发送多媒体回复有效负载时，字幕会应用于第一个媒体项 - 媒体源可以是 HTTP(S)、`file://` 或本地路径</Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图像会自动优化（调整大小/质量扫描）以适应限制
    - 媒体发送失败时，首项回退会发送文本警告，而不是静默放弃响应
  </Accordion>
</AccordionGroup>

## 反应级别

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符号反应的范围：

| 级别          | 确认反应 | 代理发起的反应 | 描述                          |
| ------------- | -------- | -------------- | ----------------------------- |
| `"off"`       | 否       | 否             | 完全没有反应                  |
| `"ack"`       | 是       | 否             | 仅确认反应（回复前回执）      |
| `"minimal"`   | 是       | 是（保守）     | 确认 + 带有保守指导的代理反应 |
| `"extensive"` | 是       | 是（鼓励）     | 确认 + 带有鼓励指导的代理反应 |

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

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站接收消息进行即时确认（ack）反应。
确认反应受 `reactionLevel` 控制 —— 当 `reactionLevel` 为 `"off"` 时，它们将被抑制。

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
- 失败会被记录下来，但不会阻止正常回复的发送
- 群组模式 `mentions` 会对提及触发的轮次做出反应；群组激活 `always` 可作为此项检查的旁路
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧版 `messages.ackReaction`）

## 多账户和凭证

<AccordionGroup>
  <Accordion title="账户选择和默认值">
    - 账户 ID 来自 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在 `default` 则使用它，否则使用第一个配置的账户 ID（已排序）
    - 账户 ID 在内部进行规范化以便查找
  </Accordion>

  <Accordion title="凭证路径和旧版兼容性">
    - 当前身份验证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认身份验证对于默认账户流程仍然会被识别/迁移
  </Accordion>

  <Accordion title="登出行为">
    `openclaw channels logout --channel whatsapp [--account <id>]` 会清除该账户的 WhatsApp 身份验证状态。

    在旧版身份验证目录中，`oauth.json` 会被保留，而 Baileys 身份验证文件则会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- Agent 工具支持包括 WhatsApp 反应操作（`react`）。
- 操作控制：
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

  <Accordion title="已连接但断开 / 重连循环">
    症状：已连接的账户出现反复断开或重连尝试。

    修复方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有必要，请使用 `channels login` 重新连接。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    当目标账户不存在活动的网关监听器时，出站发送会快速失败。

    请确保网关正在运行且账户已连接。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    请按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许列表条目
    - 提及限制（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的条目，因此请在每个作用域内保持单个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 配置参考指针

主要参考：

- [配置参考 - WhatsApp](/zh/gateway/configuration-reference#whatsapp)

高优先级的 WhatsApp 字段：

- 访问： `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- 投递： `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- 多账户： `accounts.<id>.enabled`, `accounts.<id>.authDir`, 账户级覆盖
- 操作： `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 会话行为：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [安全](/zh/gateway/security)
- [通道路由](/zh/channels/channel-routing)
- [多座席路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)
