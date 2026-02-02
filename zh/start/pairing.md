---
summary: "配对概览：批准谁可以私聊 + 哪些节点可以加入"
read_when:
  - 设置私聊访问控制
  - 配对新的 iOS/Android 节点
  - 回顾 OpenClaw 安全态势
title: "Pairing"
---

# 配对

“配对”是 OpenClaw 的显式 **所有者批准** 步骤。
主要用于两类场景：

1) **私聊配对**（谁可以与机器人对话）
2) **节点配对**（哪些设备/节点可以加入网关网络）

安全背景：[安全](/zh/gateway/security)

## 1) 私聊配对（入站聊天访问）

当某个渠道的私聊策略为 `pairing` 时，未知发送者会收到一个短码，消息在你批准前 **不会处理**。

默认私聊策略参见：[安全](/zh/gateway/security)

配对码规则：
- 8 位字符，大写，不含易混字符（`0O1I`）。
- **1 小时过期**。机器人只会在新请求创建时发送一次配对消息（大致每个发送者每小时一次）。
- 待处理私聊配对默认 **每个渠道最多 3 个**；超出会被忽略，直到有请求过期或被批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支持渠道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`。

### 状态存储位置

存放在 `~/.openclaw/credentials/`：
- 待处理请求：`<channel>-pairing.json`
- 已批准 allowlist：`<channel>-allowFrom.json`

这些文件很敏感（决定谁能访问你的助理）。


## 2) 节点设备配对（iOS/Android/macOS/无头节点）

节点以 **设备** 形式连接到网关，`role: node`。
网关会创建设备配对请求，必须批准才能加入。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 状态存储位置

存放在 `~/.openclaw/devices/`：
- `pending.json`（短期；待处理请求会过期）
- `paired.json`（已配对设备 + token）

### 说明

- 旧版 `node.pair.*` API（CLI：`openclaw nodes pending/approve`）
  是独立的、由网关维护的配对存储。WS 节点仍然需要设备配对。


## 相关文档

- 安全模型 + 提示注入：[安全](/zh/gateway/security)
- 安全更新（运行 doctor）：[更新](/zh/install/updating)
- 渠道配置：
  - Telegram：[Telegram](/zh/channels/telegram)
  - WhatsApp：[WhatsApp](/zh/channels/whatsapp)
  - Signal：[Signal](/zh/channels/signal)
  - iMessage：[iMessage](/zh/channels/imessage)
  - Discord：[Discord](/zh/channels/discord)
  - Slack：[Slack](/zh/channels/slack)
