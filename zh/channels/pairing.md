---
summary: "配对概览：批准谁可以向您发送私信 + 哪些节点可以加入"
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

安全背景：[安全](/zh/en/gateway/security)

## 1) 私信配对（入站聊天访问权限）

当频道配置了 DM 策略 `pairing` 时，未知发送者将获得一个短代码，并且在您批准之前其消息**不会被处理**。

默认的 DM 策略记录在：[安全](/zh/en/gateway/security)

配对代码：

- 8 个字符，大写，无歧义字符 (`0O1I`)。
- **1 小时后过期**。机器人仅在新请求创建时（大约每个发送者每小时一次）发送配对消息。
- 待处理的 DM 配对请求默认限制为**每个频道 3 个**；额外的请求将被忽略，直到其中一个过期或被批准。

### 批准发送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支持的频道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`、`feishu`。

### 状态存储位置

存储在 `~/.openclaw/credentials/` 下：

- 待处理的请求：`<channel>-pairing.json`
- 已批准的允许列表存储：
  - 默认账户：`<channel>-allowFrom.json`
  - 非默认账户：`<channel>-<accountId>-allowFrom.json`

账户范围行为：

- 非默认账户仅读/写其范围内的允许列表文件。
- 默认账户使用频道范围的未限定范围允许列表文件。

将这些视为敏感信息（因为它们控制着对您助手的访问权限）。

## 2) 节点设备配对（iOS/Android/macOS/headless 节点）

节点使用 `role: node` 作为**设备**连接到网关。网关
创建一个必须批准的设备配对请求。

### 通过 Telegram 配对（推荐用于 iOS）

如果您使用 `device-pair` 插件，您可以完全通过 Telegram 进行首次设备配对：

1. 在 Telegram 中，向您的机器人发送消息：`/pair`
2. 机器人会回复两条消息：一条说明消息和一条单独的 **setup code** 消息（在 Telegram 中易于复制/粘贴）。
3. 在您的手机上，打开 OpenClaw iOS 应用 → 设置 → Gateway。
4. 粘贴 setup code 并连接。
5. 回到 Telegram：`/pair approve`

setup code 是一个包含以下内容的 base64 编码 JSON 载荷：

- `url`：Gateway WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：用于初始配对握手的短期单设备引导令牌

在 setup code 有效期间，请将其视为密码一样妥善保管。

### 批准节点设备

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 节点配对状态存储

存储在 `~/.openclaw/devices/` 下：

- `pending.json`（短期；待处理的请求会过期）
- `paired.json`（已配对的设备 + 令牌）

### 注意事项

- 旧版 `node.pair.*` API（CLI：`openclaw nodes pending/approve`）是一个
  独立的 Gateway 所有的配对存储。WS 节点仍然需要设备配对。

## 相关文档

- 安全模型 + 提示词注入：[Security](/zh/en/gateway/security)
- 安全更新（运行 doctor）：[Updating](/zh/en/install/updating)
- 通道配置：
  - Telegram: [Telegram](/zh/en/channels/telegram)
  - WhatsApp: [WhatsApp](/zh/en/channels/whatsapp)
  - Signal: [Signal](/zh/en/channels/signal)
  - BlueBubbles (iMessage): [BlueBubbles](/zh/en/channels/bluebubbles)
  - iMessage (legacy): [iMessage](/zh/en/channels/imessage)
  - Discord: [Discord](/zh/en/channels/discord)
  - Slack: [Slack](/zh/en/channels/slack)

import zh from '/components/footer/zh.mdx';

<zh />
