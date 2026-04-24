---
summary: "WhatsApp渠道支持、访问控制、传递行为和运维"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Web 渠道)

状态：通过 WhatsApp Web (Baileys) 已可用于生产环境。Gateway(网关) 拥有已关联的会话。

## 按需安装

- 新手引导 (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  会在您首次选择时提示安装 WhatsApp 插件。
- `openclaw channels login --channel whatsapp` 也会在插件尚未安装时提供安装流程。
- Dev 渠道 + git checkout：默认使用本地插件路径。
- Stable/Beta：默认使用 npm 包 `@openclaw/whatsapp`。

手动安装仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh/channels/pairing">
    默认私信策略是对未知发送者进行配对。
  </Card>
  <Card title="Channel 故障排除" icon="wrench" href="/zh/channels/troubleshooting">
    跨渠道诊断和修复手册。
  </Card>
  <Card title="Gateway(网关) configuration" icon="settings" href="/zh/gateway/configuration">
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

    对于特定帐户：

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="Start the gateway">

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

<Note>OpenClaw 建议尽可能在单独的电话号码上运行 WhatsApp。（渠道元数据和设置流程已针对该设置进行了优化，但也支持个人号码设置。）</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最干净的操作模式：

    - 为 WhatsApp 分离的 OpenClaw 身份
    - 更清晰的私信允许列表和路由边界
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
    新手引导支持个人号码模式，并写入对自聊友好的基准配置：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    在运行时，自聊保护机制依赖于关联的自号码和 `allowFrom`。

  </Accordion>

  <Accordion title="WhatsApp Web-only 渠道 scope">
    在当前的 OpenClaw 渠道架构中，消息平台渠道基于 WhatsApp Web (`Baileys`)。

    在内置的聊天渠道注册表中，没有单独的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- Gateway(网关) 拥有 WhatsApp 套接字和重连循环。
- 出站发送需要为目标账户提供活动的 WhatsApp 侦听器。
- 状态和广播聊天会被忽略 (`@status`, `@broadcast`)。
- 直接聊天使用私信会话规则 (`session.dmScope`；默认 `main` 将私信折叠到座席主会话中)。
- 群组会话是隔离的 (`agent:<agentId>:whatsapp:group:<jid>`)。
- WhatsApp Web 传输遵守网关主机上的标准代理环境变量 (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / 小写变体)。相较于特定于渠道的 WhatsApp 代理设置，首选主机级代理配置。

## Access control and activation

<Tabs>
  <Tab title="私信 policy">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问权限：

    - `pairing`（默认）
    - `allowlist`
    - `open`（需要 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受 E.164 格式的号码（内部进行标准化）。

    多账户覆盖：对于该账户，`channels.whatsapp.accounts.<id>.dmPolicy`（和 `allowFrom`）优先于渠道级别的默认设置。

    运行时行为详情：

    - 配对会保存在渠道允许存储中，并与已配置的 `allowFrom` 合并
    - 如果未配置允许列表，默认允许关联的自身号码
    - 发出的 `fromMe` 私信永远不会自动配对

  </Tab>

  <Tab title="Group policy + allowlists">
    群组访问分为两层：

    1. **群组成员允许列表** (`channels.whatsapp.groups`)
       - 如果省略了 `groups`，则所有群组都符合条件
       - 如果存在 `groups`，它将作为群组允许列表（`"*"` 被允许）

    2. **群组发送者策略** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: 绕过发送者允许列表
       - `allowlist`: 发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`: 阻止所有群组入站消息

    发送者允许列表回退：

    - 如果未设置 `groupAllowFrom`，运行时会在可用时回退到 `allowFrom`
    - 发送者允许列表在提及/回复激活之前进行评估

    注意：如果完全不存在 `channels.whatsapp` 块，即使设置了 `channels.defaults.groupPolicy`，运行时群组策略回退也是 `allowlist`（并带有警告日志）。

  </Tab>

  <Tab title="提及 + /activation">
    默认情况下，群组回复需要提及。

    提及检测包括：

    - 显式的 WhatsApp 对机器人身份的提及
    - 配置的提及正则表达式模式（`agents.list[].groupChat.mentionPatterns`，回退 `messages.groupChat.mentionPatterns`）
    - 隐式的回复机器人检测（回复发件人与机器人身份匹配）

    安全说明：

    - 引用/回复仅满足提及限制；它并**不**授予发件人授权
    - 使用 `groupPolicy: "allowlist"` 时，非白名单发件人仍然会被阻止，即使他们回复了白名单用户的消息

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（而非全局配置）。它受所有者限制。

  </Tab>
</Tabs>

## 个人号码和自聊行为

当关联的自身号码也出现在 `allowFrom` 中时，WhatsApp 自聊保护机制将激活：

- 跳过自聊轮次的已读回执
- 忽略提及 JID 的自动触发行为，否则该行为会 ping 你自己
- 如果未设置 `messages.responsePrefix`，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化和上下文

<AccordionGroup>
  <Accordion title="入站信封 + 回复上下文">
    传入的 WhatsApp 消息被封装在共享的入站信封中。

    如果存在引用回复，上下文将以此形式附加：

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    回复元数据字段也会在可用时被填充（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、发送者 JID/E.164）。

  </Accordion>

  <Accordion title="Media placeholders and location/contact extraction">
    仅包含媒体的入站消息会使用如下占位符进行规范化：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置和联系人载荷会在路由之前被规范化为文本上下文。

  </Accordion>

  <Accordion title="待注入的群组历史记录">
    对于群组，未处理的消息可以被缓冲，并在机器人最终被触发时作为上下文注入。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 后备方案：`messages.groupChat.historyLimit`
    - `0` 禁用

    注入标记：

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="已读回执">
    默认情况下，对于接受的入站 WhatsApp 消息，已启用已读回执。

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

    每个账号覆盖：

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

    即使全局已启用，自聊回合也会跳过已读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先选择段落边界（空行），然后回退到基于长度的安全分块
  </Accordion>

<Accordion title="出站媒体行为">- 支持图像、视频、音频（PTT 语音笔记）和文档负载 - `audio/ogg` 被重写为 `audio/ogg; codecs=opus` 以兼容语音笔记 - 通过在视频发送上使用 `gifPlayback: true` 支持动态 GIF 播放 - 发送多媒体回复负载时，标题将应用于第一个媒体项 - 媒体源可以是 HTTP(S)、`file://` 或本地路径</Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站媒体发送上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 每个账户的覆盖设置使用 `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - 图片会自动优化（调整大小/质量扫描）以适应限制
    - 当媒体发送失败时，第一项回退会发送文本警告，而不是静默丢弃响应
  </Accordion>
</AccordionGroup>

## 回复引用

WhatsApp 支持原生回复引用，其中出站回复会明显地引用入站消息。使用 `channels.whatsapp.replyToMode` 对其进行控制。

| 值       | 行为                                               |
| -------- | -------------------------------------------------- |
| `"auto"` | 当提供商支持时引用入站消息；否则跳过引用           |
| `"on"`   | 始终引用传入消息；如果引用被拒绝，则回退到普通发送 |
| `"off"`  | 从不引用；作为普通消息发送                         |

默认为 `"auto"`。每个账户的覆盖设置使用 `channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "on",
    },
  },
}
```

## 反应级别

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情符号反应的广泛程度：

| 级别          | 确认反应 | 代理发起的反应 | 描述                          |
| ------------- | -------- | -------------- | ----------------------------- |
| `"off"`       | 否       | 否             | 完全不反应                    |
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

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站消息进行即时确认反应。
确认反应由 `reactionLevel` 控制 —— 当 `reactionLevel` 为 `"off"` 时，它们会被抑制。

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

- 在入站消息被接受后立即发送（在回复之前）
- 失败会被记录，但不会阻止正常回复的投递
- 群组模式 `mentions` 会对提及触发的轮次做出反应；群组激活 `always` 充当此检查的绕过机制
- WhatsApp 使用 `channels.whatsapp.ackReaction`（此处不使用旧版 `messages.ackReaction`）

## 多账户和凭据

<AccordionGroup>
  <Accordion title="Account selection and defaults">
    - 账户 ID 来自 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在 `default`，则选择它，否则选择第一个配置的账户 ID（已排序）
    - 账户 ID 在内部会被标准化以便查找
  </Accordion>

  <Accordion title="Credential paths and legacy compatibility">
    - 当前认证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - `~/.openclaw/credentials/` 中的旧版默认认证仍然会被识别/迁移，用于默认账户流程
  </Accordion>

  <Accordion title="Logout behavior">
    `openclaw channels logout --channel whatsapp [--account <id>]` 清除该 WhatsApp 账户的认证状态。

    在旧版认证目录中，`oauth.json` 会被保留，而 Baileys 认证文件会被删除。

  </Accordion>
</AccordionGroup>

## 工具、操作和配置写入

- 代理工具支持包括 WhatsApp 反应操作 (`react`)。
- 操作门槛：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 渠道发起的配置写入默认已启用（可通过 `channels.whatsapp.configWrites=false` 禁用）。

## 故障排除

<AccordionGroup>
  <Accordion title="Not linked (QR required)">
    症状：渠道状态报告未链接。

    修复方法：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已链接但断开连接 / 重连循环">
    症状：已链接的帐户出现重复断开连接或尝试重连的情况。

    修复方法：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有必要，请使用 `channels login` 重新链接。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    当目标帐户没有活动的网关监听器时，出站发送会快速失败。

    请确保网关正在运行且帐户已链接。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许名单条目
    - 提及门控（`requireMention` + 提及模式）
    - `openclaw.json` (JSON5) 中的重复键：后面的条目会覆盖前面的条目，因此请确保每个作用域内只有一个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为与稳定的 WhatsApp/Telegram 网关操作不兼容。
  </Accordion>
</AccordionGroup>

## 系统提示

WhatsApp 支持通过 `groups` 和 `direct` 映射为群组和直接聊天提供类似 Telegram 风格的系统提示。

群组消息的解析层次结构：

首先确定有效的 `groups` 映射：如果账户定义了自己的 `groups`，它将完全替换根 `groups` 映射（不进行深度合并）。然后，在生成的单个映射上运行提示查找：

1. **特定群组系统提示** (`groups["<groupId>"].systemPrompt`)：如果特定群组条目定义了 `systemPrompt`，则使用此提示。
2. **群组通配符系统提示** (`groups["*"].systemPrompt`)：当特定群组条目不存在或未定义 `systemPrompt` 时使用。

直接消息的解析层次结构：

首先确定有效的 `direct` 映射：如果账户定义了自己的 `direct`，它将完全替换根 `direct` 映射（不进行深度合并）。然后，提示词查找会在生成的单个映射上运行：

1. **特定直接系统提示** (`direct["<peerId>"].systemPrompt`)：如果特定的对等方条目定义了 `systemPrompt`，则使用此提示。
2. **直接通配符系统提示** (`direct["*"].systemPrompt`)：当特定的对等方条目不存在或未定义 `systemPrompt` 时使用。

注意：`dms` 仍然是轻量级的每私信历史记录覆盖存储桶 (`dms.<id>.historyLimit`)；提示词覆盖位于 `direct` 下。

**与 Telegram 多账户行为的区别：** 在 Telegram 中，在多账户设置中，所有账户有意屏蔽了 root `groups` —— 即使是那些没有定义自己的 `groups` 的账户 —— 以防止机器人接收到其不属于的群组消息。WhatsApp 不应用此保护：对于没有定义账户级覆盖的账户，无论配置了多少个账户，总是会继承 root `groups` 和 root `direct`。在多账户 WhatsApp 设置中，如果您希望每个账户有单独的群组或直接提示，请在每个账户下显式定义完整的映射，而不是依赖根级别的默认值。

重要行为：

- `channels.whatsapp.groups` 既是每个组的配置映射，也是聊天级别的组允许列表。在根范围或账户范围内，`groups["*"]` 意味着该范围“允许所有组”。
- 仅当您希望该范围允许所有组时，才添加通配符组 `systemPrompt`。如果您仍然希望只有固定的组 ID 集合格，请不要对提示默认值使用 `groups["*"]`。相反，应在每个明确列入允许列表的组条目上重复该提示。
- 组准入和发件人授权是单独的检查。`groups["*"]` 扩展了可以进行组处理的组集合，但它本身并不授权这些组中的每个发件人。发件人访问权限仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 单独控制。
- `channels.whatsapp.direct` 对于私信没有相同的副作用。`direct["*"]` 仅在私信已被 `dmPolicy` 加上 `allowFrom` 或 pairing-store 规则接纳后提供默认的直接聊天配置。

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

## 配置参考指南

主要参考：

- [配置参考 - WhatsApp](/zh/gateway/configuration-reference#whatsapp)

高频 WhatsApp 字段：

- 访问: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- 投递: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, 账户级覆盖
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- 会话 behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相关

- [配对](/zh/channels/pairing)
- [群组](/zh/channels/groups)
- [安全](/zh/gateway/security)
- [通道路由](/zh/channels/channel-routing)
- [多代理路由](/zh/concepts/multi-agent)
- [故障排除](/zh/channels/troubleshooting)
