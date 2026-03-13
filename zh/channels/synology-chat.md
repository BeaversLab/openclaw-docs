---
summary: "Synology Chat webhook 设置和 OpenClaw 配置"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat（插件）

状态：通过插件作为使用 Synology Chat webhooks 的直接消息频道获得支持。
该插件接收来自 Synology Chat 传出 webhook 的入站消息，并通过
Synology Chat 传入 webhook 发送回复。

## 需要插件

Synology Chat 基于插件，不属于默认核心频道安装的一部分。

从本地检出安装：

```bash
openclaw plugins install ./extensions/synology-chat
```

详情：[插件](/zh/en/tools/plugin)

## 快速设置

1. 安装并启用 Synology Chat 插件。
2. 在 Synology Chat 集成中：
   - 创建一个传入 webhook 并复制其 URL。
   - 使用您的密令创建一个传出 webhook。
3. 将传出 webhook URL 指向您的 OpenClaw 网关：
   - 默认为 `https://gateway-host/webhook/synology`。
   - 或者您的自定义 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中配置 `channels.synology-chat`。
5. 重启网关并向 Synology Chat 机器人发送私信。

最小配置：

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      token: "synology-outgoing-token",
      incomingUrl: "https://nas.example.com/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=...",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## 环境变量

对于默认账户，您可以使用环境变量：

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS`（逗号分隔）
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

配置值会覆盖环境变量。

## 私信策略和访问控制

- `dmPolicy: "allowlist"` 是推荐的默认设置。
- `allowedUserIds` 接受 Synology 用户 ID 列表（或逗号分隔的字符串）。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表被视为配置错误，webhook 路由将不会启动（使用 `dmPolicy: "open"` 以允许所有人）。
- `dmPolicy: "open"` 允许任何发送者。
- `dmPolicy: "disabled"` 阻止私信。
- 配对批准适用于：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 出站投递

使用数字 Synology Chat 用户 ID 作为目标。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

媒体发送通过基于 URL 的文件传输获得支持。

## 多账户

在 `channels.synology-chat.accounts` 下支持多个 Synology Chat 账户。
每个账户可以覆盖令牌、传入 URL、webhook 路径、私信策略和限制。

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## 安全说明

- 请妥善保管 `token`，如果泄露请轮换它。
- 除非您明确信任自签名的本地 NAS 证书，否则请保留 `allowInsecureSsl: false`。
- 入站 Webhook 请求已通过令牌验证，并按发送方进行了速率限制。
- 生产环境中建议使用 `dmPolicy: "allowlist"`。

import zh from '/components/footer/zh.mdx';

<zh />
