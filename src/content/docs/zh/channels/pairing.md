---
summary: "配对概览：批准谁可以向您发送私信以及哪些节点可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配对"
---

“配对”是 OpenClaw 的显式访问批准步骤。
它用于两个地方：

1. **私信配对**（谁被允许与机器人对话）
2. **节点配对**（哪些设备/节点被允许加入网关网络）

安全上下文：[安全](/zh/gateway/security)

## 1) 私信配对（入站聊天访问）

当渠道配置了私信策略 `pairing` 时，未知发送者会收到一个短代码，并且在您批准之前，他们的消息**不会被处理**。

默认的私信策略记录在：[安全](/zh/gateway/security)

`dmPolicy: "open"` 只有在有效的私信允许列表包含 `"*"` 时才是公开的。
设置和验证要求公开开放配置必须包含该通配符。如果现有
状态包含具有具体 `allowFrom` 条目的 `open`，运行时仍然只
允许这些发送者，并且配对存储中的批准不会扩大 `open` 访问权限。

配对代码：

- 8 个字符，大写，无歧义字符 (`0O1I`)。
- **1 小时后过期**。机器人仅在创建新请求时发送配对消息（每个发送者大约每小时一次）。
- 待处理的私信配对请求默认限制为每个渠道 **3 个**；额外的请求将被忽略，直到其中一个过期或被批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

如果尚未配置命令所有者，批准私信配对代码还会将
`commands.ownerAllowFrom` 引导至已批准的发送者，例如 `telegram:123456789`。
这为首次设置提供了特权命令和执行
批准提示的显式所有者。所有者存在后，后续的配对批准仅授予私信
访问权限；它们不会添加更多所有者。

支持的渠道：`discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`。

### 可重用的发送者组

当同一组受信任的发送者应用于多个消息渠道，或同时应用于私信和群组白名单时，请使用顶层 `accessGroups`。

静态组使用 `type: "message.senders"` 定义，并通过 `accessGroup:<name>` 在渠道白名单中引用：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
  channels: {
    telegram: { dmPolicy: "allowlist", allowFrom: ["accessGroup:operators"] },
    whatsapp: { groupPolicy: "allowlist", groupAllowFrom: ["accessGroup:operators"] },
  },
}
```

访问组在此处有详细文档：[访问组](/zh/channels/access-groups)

### 状态存储位置

存储在 `~/.openclaw/credentials/` 下：

- 待处理的请求：`<channel>-pairing.json`
- 已批准的白名单存储：
  - 默认账户：`<channel>-allowFrom.json`
  - 非默认账户：`<channel>-<accountId>-allowFrom.json`

账户范围行为：

- 非默认账户仅读写其范围内的白名单文件。
- 默认账户使用渠道范围内的无范围白名单文件。

请将这些视为敏感信息（它们控制着对您助手的访问）。

<Note>配对白名单存储用于私信访问。群组授权是分开的。 批准私信配对代码并不会自动允许该发送者在群组中运行群组命令或控制机器人。所有者引导（First-owner bootstrap）是 `commands.ownerAllowFrom` 中单独的配置状态，并且群组消息投递仍遵循渠道的群组白名单（例如 `groupAllowFrom`, `groups`，或根据渠道而定的按群组或按主题覆盖设置）。</Note>

## 2) 节点设备配对 (iOS/Android/macOS/headless 节点)

节点作为 **设备** 使用 `role: node` 连接到 Gateway(网关)。Gateway(网关)
会创建一个设备配对请求，该请求必须被批准。

### 通过 Telegram 配对（推荐用于 iOS）

如果您使用 `device-pair` 插件，则可以完全通过 Telegram 进行首次设备配对：

1. 在 Telegram 中，给您的机器人发送消息：`/pair`
2. 机器人会回复两条消息：一条说明消息和一条单独的 **设置代码** 消息（在 Telegram 中易于复制/粘贴）。
3. 在您的手机上，打开 OpenClaw iOS 应用 → 设置 → Gateway(网关)。
4. 扫描二维码或粘贴设置代码并连接。
5. 回到 Telegram：`/pair pending`（检查请求 ID、角色和范围），然后批准。

设置代码是一个 base64 编码的 JSON 载荷，包含：

- `url`：Gateway(网关) WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：用于初始配对握手的短期单设备引导令牌

该引导令牌携带内置的配对引导配置文件：

- 主要的移交 `node` 令牌保持 `scopes: []`
- 任何移交的 `operator` 令牌都保持在引导允许列表的范围内：
  `operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`
- 引导范围检查是按角色前缀进行的，而不是一个扁平的范围池：
  操作员范围条目仅满足操作员请求，而非操作员角色
  仍必须在其自己的角色前缀下请求范围
- 后续的令牌轮换/撤销仍受设备批准的
  角色合同和调用者会话的操作员范围限制

在设置代码有效期内，请像对待密码一样对待它。

对于 Tailscale、公用或其他远程移动设备配对，请使用 Tailscale Serve/Funnel 或其他 TailscaleTailscale`wss://`Gateway(网关) Gateway(网关) URL。纯文本 `ws://` 设置代码仅接受环回地址、专用 LAN 地址、`.local`BonjourAndroid Bonjour 主机和 Android 模拟器主机。Tailnet CGNAT 地址、`.ts.net` 名称和公用主机在生成 QR/设置代码之前仍然会失败关闭。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

当由于批准配对设备的会话是仅使用配对作用域（pairing-only scope）打开的而导致明确批准被拒绝时，CLI 会使用 CLI`operator.admin` 重试相同的请求。这允许现有的具有管理员权限的配对设备恢复新的 Control UI/浏览器配对，而无需手动编辑 `devices/paired.json`Gateway(网关)。Gateway(网关) 仍然会验证重试的连接；无法使用 `operator.admin` 进行身份验证的令牌将保持被阻止状态。

如果同一设备使用不同的身份验证详细信息（例如不同的角色/作用域/公钥）重试，则先前的待处理请求将被取代，并创建一个新的 `requestId`。

<Note>已配对的设备不会静默获得更广泛的访问权限。如果它重新连接并请求更多作用域或更广泛的角色，OpenClaw 将保持现有批准不变，并创建一个新的待处理升级请求。在批准之前，请使用 OpenClaw`openclaw devices list` 比较当前批准的访问权限与新请求的访问权限。</Note>

### 可选的受信任 CIDR 节点自动批准

默认情况下，设备配对保持手动状态。对于严格控制的节点网络，您可以选择通过显式 CIDR 或精确 IP 启用首次节点自动批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

这仅适用于没有请求作用域的全新 `role: node`WebChat 配对请求。Operator、浏览器、Control UI 和 WebChat 客户端仍然需要手动批准。角色、作用域、元数据和公钥更改仍然需要手动批准。

### 节点配对状态存储

存储在 `~/.openclaw/devices/` 下：

- `pending.json`（短期；待处理的请求会过期）
- `paired.json`（已配对设备 + 令牌）

### 注意

- 旧版 `node.pair.*`API API（CLI：`openclaw nodes pending|approve|reject|remove|rename`）是一个单独的网关拥有的配对存储。WS 节点仍需要设备配对。
- 配对记录是已批准角色的持久真实来源。活动设备令牌保持绑定到该已批准角色集；已批准角色之外的孤立令牌条目不会创建新的访问权限。

## 相关文档

- 安全模型 + 提示注入：[安全](/zh/gateway/security)
- 安全更新（运行 doctor）：[更新](/zh/install/updating)
- 频道配置：
  - Telegram：[Telegram](TelegramTelegram/en/channels/telegram)
  - WhatsApp：[WhatsApp](WhatsAppWhatsApp/en/channels/whatsapp)
  - Signal：[Signal](SignalSignal/en/channels/signal)
  - iMessage：[iMessage](iMessageiMessage/en/channels/imessage)
  - Discord：[Discord](DiscordDiscord/en/channels/discord)
  - Slack：[Slack](SlackSlack/en/channels/slack)
