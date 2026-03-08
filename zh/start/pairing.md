---
summary: “配对概述：批准谁可以给您发送私信 + 哪些节点可以加入”
read_when:
  - “设置私信访问控制”
  - “配对新的 iOS/Android 节点”
  - “审查 OpenClaw 安全态势”
title: “配对”
---

# 配对

“配对”是 OpenClaw 的明确**所有者批准**步骤。
它在两个地方使用：

1. **私信配对**（谁被允许与机器人对话）
2. **节点配对**（哪些设备/节点被允许加入网关网络）

安全背景：[安全](/zh/gateway/security)

## 1) 私信配对（入站聊天访问）

当渠道使用私信策略 `pairing` 配置时，未知发送者会收到一个短代码，并且他们的消息在您批准之前**不会被处理**。

默认私信策略在以下文档中有说明：[安全](/zh/gateway/security)

配对代码：

- 8 个字符，大写，无歧义字符（`0O1I`）。
- **1 小时后过期**。机器人仅在新请求创建时发送配对消息（每个发送者大约每小时一次）。
- 待处理的私信配对请求默认限制为**每个渠道 3 个**；额外的请求将被忽略，直到一个过期或被批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支持的渠道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`。

### 状态存储位置

存储在 `~/.openclaw/credentials/` 下：

- 待处理请求：`<channel>-pairing.json`
- 已批准的允许列表存储：`<channel>-allowFrom.json`

将这些视为敏感信息（它们控制对您助手的访问）。

## 2) 节点设备配对（iOS/Android/macOS/headless 节点）

节点作为**设备**使用 `role: node` 连接到网关。网关创建必须批准的设备配对请求。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 状态存储位置

存储在 `~/.openclaw/devices/` 下：

- `pending.json`（短生命周期；待处理请求会过期）
- `paired.json`（已配对的设备 + 令牌）

### 备注

- 旧版 `node.pair.*` API（CLI：`openclaw nodes pending/approve`）是一个单独的网关拥有的配对存储。WS 节点仍需要设备配对。

## 相关文档

- 安全模型 + 提示注入：[安全](/zh/gateway/security)
- 安全更新（运行诊断工具）：[更新](/zh/install/updating)
- 渠道配置：
  - Telegram：[Telegram](/zh/channels/telegram)
  - WhatsApp：[WhatsApp](/zh/channels/whatsapp)
  - Signal：[Signal](/zh/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh/channels/bluebubbles)
  - iMessage（旧版）：[iMessage](/zh/channels/imessage)
  - Discord：[Discord](/zh/channels/discord)
  - Slack：[Slack](/zh/channels/slack)
