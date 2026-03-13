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
2. **节点配对**（允许哪些设备/节点加入网关网络）

安全上下文：[安全](/zh/en/gateway/security)

## 1) 私信配对（入站聊天访问）

当频道配置了私信策略 `pairing` 时，未知发送者将获得一个短代码，在您批准之前，他们的消息**不会被处理**。

默认私信策略记录在：[安全](/zh/en/gateway/security)

配对代码：

- 8 个字符，大写，无歧义字符（`0O1I`）。
- **1 小时后过期**。机器人仅在创建新请求时发送配对消息（每个发送者大约每小时一次）。
- 默认情况下，待处理的私信配对请求上限为每个频道 **3 个**；额外的请求将被忽略，直到其中一个过期或被批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支持的频道：`telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`。

### 状态存储位置

存储在 `~/.openclaw/credentials/` 下：

- 待处理请求：`<channel>-pairing.json`
- 已批准的白名单存储：`<channel>-allowFrom.json`

请将这些视为敏感信息（因为它们控制着对您助手的访问权限）。

## 2) 节点设备配对（iOS/Android/macOS/headless 节点）

节点通过 `role: node` 作为**设备**连接到网关。网关
会创建一个设备配对请求，该请求必须被批准。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 状态存储位置

存储在 `~/.openclaw/devices/` 下：

- `pending.json`（短期存在；待处理的请求会过期）
- `paired.json`（已配对的设备 + 令牌）

### 注意事项

- 旧的 `node.pair.*` API（CLI：`openclaw nodes pending/approve`) 是一个
  单独的网关拥有的配对存储。WS 节点仍需要设备配对。

## 相关文档

- 安全模型 + 提示注入：[安全](/zh/en/gateway/security)
- 安全更新（运行 doctor）：[更新](/zh/en/install/updating)
- 频道配置：
  - Telegram: [Telegram](/zh/en/channels/telegram)
  - WhatsApp: [WhatsApp](/zh/en/channels/whatsapp)
  - Signal: [Signal](/zh/en/channels/signal)
  - BlueBubbles (iMessage): [BlueBubbles](/zh/en/channels/bluebubbles)
  - iMessage (legacy): [iMessage](/zh/en/channels/imessage)
  - Discord: [Discord](/zh/en/channels/discord)
  - Slack: [Slack](/zh/en/channels/slack)

import zh from '/components/footer/zh.mdx';

<zh />
