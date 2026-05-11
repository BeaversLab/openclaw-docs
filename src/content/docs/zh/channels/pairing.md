---
summary: "配对概览：批准谁可以给您发送私信 + 哪些节点可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配对"
---

“配对”是 OpenClaw 明确的**所有者批准**步骤。
它用于两个地方：

1. **私信配对**（谁被允许与机器人对话）
2. **节点配对**（哪些设备/节点被允许加入网关网络）

安全背景：[安全](/zh/gateway/security)

## 1) 私信配对（入站聊天访问）

当渠道配置了私信策略 `pairing` 时，未知发送者会收到一个短代码，并且在他们获得您批准之前，其消息**不会被处理**。

默认私信策略记录于：[安全](/zh/gateway/security)

配对代码：

- 8个字符，大写，无歧义字符（`0O1I`）。
- **1小时后过期**。机器人仅在新请求创建时发送配对消息（大约每个发送者每小时一次）。
- 待处理的私信配对请求默认限制为每个渠道**3个**；额外的请求将被忽略，直到其中一个过期或获得批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支持的渠道：`bluebubbles`、`discord`、`feishu`、`googlechat`、`imessage`、`irc`、`line`、`matrix`、`mattermost`、`msteams`、`nextcloud-talk`、`nostr`、`openclaw-weixin`、`signal`、`slack`、`synology-chat`、`telegram`、`twitch`、`whatsapp`、`zalo`、`zalouser`。

### 状态存储位置

存储在 `~/.openclaw/credentials/` 下：

- 待处理的请求：`<channel>-pairing.json`
- 已批准的允许列表存储：
  - 默认账户：`<channel>-allowFrom.json`
  - 非默认账户：`<channel>-<accountId>-allowFrom.json`

账户范围行为：

- 非默认账户仅读取/写入其作用域内的允许列表文件。
- 默认账户使用作用于渠道范围的未限定范围允许列表文件。

请将这些视为敏感信息（因为它们决定了谁能访问您的助手）。

<Note>此存储用于DM（私信）访问。群组授权是分开的。批准DM配对代码不会自动允许该发送者运行群组命令或在群组中控制机器人。如需群组访问权限，请配置渠道的显式群组允许列表（例如 `groupAllowFrom`、`groups`，或根据渠道配置的特定群组或特定主题的覆盖设置）。</Note>

## 2) 节点设备配对 (iOS/Android/macOS/无头节点)

节点通过 `role: node` 作为**设备**连接到Gateway(网关)。Gateway(网关)
会创建一个必须批准的设备配对请求。

### 通过 Telegram 配对（推荐用于 iOS）

如果您使用 `device-pair` 插件，您可以完全通过 Telegram 进行首次设备配对：

1. 在 Telegram 中，向您的机器人发送消息：`/pair`
2. 机器人会回复两条消息：一条说明消息和一条单独的**设置代码**消息（在 Telegram 中易于复制/粘贴）。
3. 在您的手机上，打开 OpenClaw iOS 应用 → 设置 → Gateway(网关)。
4. 粘贴设置代码并连接。
5. 回到 Telegram 中：`/pair pending`（审查请求 ID、角色和范围），然后批准。

设置代码是一个包含以下内容的 Base64 编码 JSON 载荷：

- `url`：Gateway(网关) WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：用于初始配对握手的短期单设备引导令牌

该引导令牌带有内置的配对引导配置文件：

- 主要移交的 `node` 令牌保持 `scopes: []`
- 任何移交的 `operator` 令牌都受限于引导允许列表：
  `operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`
- 引导范围检查是带有角色前缀的，而不是一个扁平的范围池：
  操作员范围条目仅满足操作员请求，非操作员角色
  仍必须在其自己的角色前缀下请求范围
- 后续的令牌轮换/撤销仍受设备的已批准
  角色合约以及调用者会话的操作员范围的限制

在设置代码有效期间，请将其视为密码。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

如果同一设备使用不同的身份验证详细信息（例如不同的
角色/范围/公钥）重试，则先前的待处理请求将被取代，并创建一个新的
`requestId`。

<Note>已配对的设备不会静默获得更广泛的访问权限。如果它重新连接并请求更多范围或更广泛的权限，OpenClaw 将保持现有的批准不变，并创建一个新的待处理升级请求。在批准之前，请使用 `openclaw devices list` 比较当前批准的访问权限与新请求的访问权限。</Note>

### 可选的受信任 CIDR 节点自动批准

默认情况下，设备配对仍需手动进行。对于严格控制节点网络，
您可以选择通过显式 CIDR 或确切 IP 启用首次节点自动批准：

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

这仅适用于没有请求范围的全新 `role: node` 配对请求。操作员、浏览器、控制 UI 和 WebChat 客户端仍需手动
批准。角色、范围、元数据和公钥更改仍需手动批准。

### 节点配对状态存储

存储于 `~/.openclaw/devices/`：

- `pending.json`（短期；待处理请求会过期）
- `paired.json`（已配对设备 + 令牌）

### 注意事项

- 传统的 `node.pair.*` API（CLI：`openclaw nodes pending|approve|reject|remove|rename`）是
  一个单独的网关拥有的配对存储。WS 节点仍需要设备配对。
- 配对记录是已批准角色的持久真实来源。活动的
  设备令牌始终受限于该已批准角色集；在批准角色之外的孤立令牌条目
  不会创建新的访问权限。

## 相关文档

- 安全模型 + 提示词注入：[安全](/zh/gateway/security)
- 安全更新（运行医生）：[更新](/zh/install/updating)
- 通道配置：
  - Telegram：[Telegram](/zh/channels/telegram)
  - WhatsApp：[WhatsApp](/zh/channels/whatsapp)
  - Signal：[Signal](/zh/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh/channels/bluebubbles)
  - iMessage (legacy)：[iMessage](/zh/channels/imessage)
  - Discord: [Discord](/zh/channels/discord)
  - Slack: [Slack](/zh/channels/slack)
