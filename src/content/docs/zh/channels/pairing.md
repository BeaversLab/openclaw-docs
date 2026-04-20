---
summary: "配对概述：批准谁可以向您发送私信以及哪些节点可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配对"
---

# 配对

“配对”是 OpenClaw 明确的**所有者批准**步骤。
它用于两个地方：

1. **私信配对**（谁被允许与机器人对话）
2. **节点配对**（哪些设备/节点被允许加入网关网络）

安全上下文：[Security](/zh/gateway/security)

## 1) 私信配对（入站聊天访问权限）

当频道配置了 私信 策略 `pairing` 时，未知发送者将获得一个短代码，并且在他们获得批准之前，其消息**不会被处理**。

默认私信策略记录在：[Security](/zh/gateway/security)

配对代码：

- 8 个字符，大写，无歧义字符（`0O1I`）。
- **1 小时后过期**。机器人仅在新请求创建时（大约每个发送者每小时一次）发送配对消息。
- 待处理的 私信 配对请求默认限制为**每个频道 3 个**；额外的请求将被忽略，直到其中一个过期或被批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支持的渠道：`bluebubbles`、`discord`、`feishu`、`googlechat`、`imessage`、`irc`、`line`、`matrix`、`mattermost`、`msteams`、`nextcloud-talk`、`nostr`、`openclaw-weixin`、`signal`、`slack`、`synology-chat`、`telegram`、`twitch`、`whatsapp`、`zalo`、`zalouser`。

### 状态存储位置

存储于 `~/.openclaw/credentials/` 下：

- 待处理的请求：`<channel>-pairing.json`
- 已批准的允许列表存储：
  - 默认账户：`<channel>-allowFrom.json`
  - 非默认账户：`<channel>-<accountId>-allowFrom.json`

账户范围行为：

- 非默认账户仅读/写其范围内的允许列表文件。
- 默认账户使用渠道范围的非范围允许列表文件。

请将这些视为敏感信息（它们控制着对您助手的访问权限）。

重要提示：此存储用于私信访问。群组授权是分开的。
批准私信配对代码并不会自动允许该发送者在群组中运行命令或控制机器人。对于群组访问，请配置渠道的显式群组允许列表（例如 `groupAllowFrom`、`groups`，或根据渠道配置的每组/每主题覆盖设置）。

## 2) 节点设备配对 (iOS/Android/macOS/headless 节点)

节点通过 `role: node` 作为**设备**连接到 Gateway(网关)。Gateway(网关)
会创建一个必须批准的设备配对请求。

### 通过 Telegram 配对（推荐用于 iOS）

如果您使用 `device-pair` 插件，您可以完全通过 Telegram 进行首次设备配对：

1. 在 Telegram 中，向您的机器人发送消息：`/pair`
2. 机器人会回复两条消息：一条指令消息和一条单独的**设置代码**消息（在 Telegram 中易于复制/粘贴）。
3. 在您的手机上，打开 OpenClaw iOS 应用 → 设置 → Gateway(网关)。
4. 粘贴设置代码并连接。
5. 回到 Telegram：`/pair pending`（审查请求 ID、角色和范围），然后批准。

设置代码是一个 base64 编码的 JSON 载荷，包含：

- `url`：Gateway(网关) WebSocket URL (`ws://...` 或 `wss://...`)
- `bootstrapToken`：一个短期的单设备引导令牌，用于初始配对握手

该引导令牌携带内置的配对引导配置文件：

- 主要移交的 `node` 令牌保持 `scopes: []`
- 任何移交的 `operator` 令牌都受限于引导允许列表：
  `operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`
- 引导范围检查是按角色前缀的，而不是一个扁平的范围池：
  操作员范围条目仅满足操作员请求，非操作员角色
  仍必须在其自己的角色前缀下请求范围

在设置代码有效期间，请将其视为密码。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

如果同一设备使用不同的身份验证详细信息（例如不同的角色/范围/公钥）重试，则之前的待处理请求将被取代，并创建一个新的 `requestId`。

### 节点配对状态存储

存储在 `~/.openclaw/devices/` 下：

- `pending.json`（短期存在；待处理的请求会过期）
- `paired.json`（已配对的设备 + 令牌）

### 注意事项

- 传统的 `node.pair.*` API (CLI: `openclaw nodes pending|approve|reject|rename`) 是一个单独的网关拥有的配对存储。WS 节点仍然需要设备配对。
- 配对记录是已批准角色的持久真实来源。活动的设备令牌始终绑定到该已批准的角色集；在已批准角色之外的孤立令牌条目不会创建新的访问权限。

## 相关文档

- 安全模型 + 提示词注入：[安全](/zh/gateway/security)
- 安全更新（运行 doctor）：[更新](/zh/install/updating)
- 频道配置：
  - Telegram：[Telegram](/zh/channels/telegram)
  - WhatsApp：[WhatsApp](/zh/channels/whatsapp)
  - Signal：[Signal](/zh/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh/channels/bluebubbles)
  - iMessage (legacy)：[iMessage](/zh/channels/imessage)
  - Discord：[Discord](/zh/channels/discord)
  - Slack：[Slack](/zh/channels/slack)
