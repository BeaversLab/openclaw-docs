---
summary: "配对概览：批准谁可以向您发送私信 + 哪些节点可以加入"
read_when:
  - 设置私信访问控制
  - 配对新的 iOS/Android 节点
  - 审查 OpenClaw 安全态势
title: "配对"
---

# 配对

“配对”是 OpenClaw 的显式**所有者批准**步骤。
它在两个地方使用：

1. **私信配对**（谁被允许与机器人交谈）
2. **节点配对**（哪些设备/节点被允许加入网关网络）

安全上下文：[安全性](/zh/gateway/security)

## 1) 私信配对（入站聊天访问）

当渠道配置了私信策略 `pairing` 时，未知发送者会收到一个简短的代码，并且在他们得到您批准之前，其消息**不会被处理**。

默认的私信策略记录在：[安全性](/zh/gateway/security)

配对代码：

- 8 个字符，大写，无歧义字符 (`0O1I`)。
- **1 小时后过期**。机器人仅在创建新请求时发送配对消息（每个发送者大约每小时一次）。
- 待处理的私信配对请求默认上限为**每个渠道 3 个**；额外的请求将被忽略，直到其中一个过期或获得批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支持的渠道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`、`feishu`。

### 状态存储位置

存储在 `~/.openclaw/credentials/` 下：

- 待处理的请求：`<channel>-pairing.json`
- 已批准的允许列表存储：
  - 默认帐户：`<channel>-allowFrom.json`
  - 非默认帐户：`<channel>-<accountId>-allowFrom.json`

帐户范围行为：

- 非默认帐户仅读/写其范围内的允许列表文件。
- 默认帐户使用渠道范围的未限定范围允许列表文件。

请将这些视为敏感信息（它们控制对您助手的访问）。

## 2) 节点设备配对 (iOS/Android/macOS/headless 节点)

节点使用 `role: node` 作为**设备**连接到 Gateway(网关)。Gateway(网关)
会创建一个必须获得批准的设备配对请求。

### 通过 Telegram 配对（推荐用于 iOS）

如果您使用 `device-pair` 插件，则可以完全通过 Telegram 进行首次设备配对：

1. 在 Telegram 中，给你的机器人发送消息：`/pair`
2. 机器人会回复两条消息：一条说明消息和一条单独的 **setup code** 消息（在 Telegram 中易于复制/粘贴）。
3. 在手机上，打开 OpenClaw iOS 应用 → 设置 → Gateway(网关)。
4. 粘贴 setup code 并连接。
5. 回到 Telegram：`/pair approve`

Setup code 是一个 base64 编码的 JSON 载荷，包含：

- `url`：Gateway(网关) WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：一个用于初始配对握手的短期单设备引导令牌

在 setup code 有效期内，请像对待密码一样对待它。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 节点配对状态存储

存储在 `~/.openclaw/devices/` 下：

- `pending.json`（短期；挂起的请求会过期）
- `paired.json`（已配对的设备 + 令牌）

### 注意

- 旧的 `node.pair.*` API（CLI：`openclaw nodes pending/approve`）是一个单独的、由网关拥有的配对存储。WS 节点仍需要设备配对。

## 相关文档

- 安全性模型 + 提示词注入：[安全性](/zh/gateway/security)
- 安全更新（运行 doctor）：[更新](/zh/install/updating)
- 频道配置：
  - Telegram：[Telegram](/zh/channels/telegram)
  - WhatsApp：[WhatsApp](/zh/channels/whatsapp)
  - Signal：[Signal](/zh/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh/channels/bluebubbles)
  - iMessage (legacy)：[iMessage](/zh/channels/imessage)
  - Discord：[Discord](/zh/channels/discord)
  - Slack：[Slack](/zh/channels/slack)

import en from "/components/footer/en.mdx";

<en />
