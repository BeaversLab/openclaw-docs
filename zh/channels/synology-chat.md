---
summary: "Synology Chat webhook setup and OpenClaw config"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat (plugin)

Status: supported via plugin as a direct-message 渠道 using Synology Chat webhooks.
The plugin accepts inbound messages from Synology Chat outgoing webhooks and sends replies
through a Synology Chat incoming webhook.

## Plugin required

Synology Chat is plugin-based and not part of the default core 渠道 install.

Install from a local checkout:

```bash
openclaw plugins install ./extensions/synology-chat
```

Details: [Plugins](/zh/tools/plugin)

## Quick setup

1. Install and enable the Synology Chat plugin.
   - `openclaw onboard` now shows Synology Chat in the same 渠道 setup list as `openclaw channels add`.
   - Non-interactive setup: `openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. In Synology Chat integrations:
   - Create an incoming webhook and copy its URL.
   - Create an outgoing webhook with your secret token.
3. Point the outgoing webhook URL to your OpenClaw gateway:
   - `https://gateway-host/webhook/synology` by default.
   - Or your custom `channels.synology-chat.webhookPath`.
4. Finish setup in OpenClaw.
   - Guided: `openclaw onboard`
   - Direct: `openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. Restart gateway and send a 私信 to the Synology Chat bot.

Minimal config:

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

## Environment variables

For the default account, you can use 环境变量:

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS` (comma-separated)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

Config values override 环境变量.

## 私信 policy and access control

- `dmPolicy: "allowlist"` is the recommended default.
- `allowedUserIds` accepts a list (or comma-separated string) of Synology user IDs.
- In `allowlist` mode, an empty `allowedUserIds` list is treated as misconfiguration and the webhook route will not start (use `dmPolicy: "open"` for allow-all).
- `dmPolicy: "open"` allows any sender.
- `dmPolicy: "disabled"` blocks 私信.
- Pairing approvals work with:
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## Outbound delivery

使用数字格式的 Synology Chat 用户 ID 作为目标。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

支持通过基于 URL 的文件传送来发送媒体。

## 多账户

`channels.synology-chat.accounts` 下支持多个 Synology Chat 账户。
每个账户可以覆盖 token、入站 URL、webhook 路径、私信策略和限制。

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

- 请妥善保管 `token`，并在发生泄露时轮换更新。
- 请保持 `allowInsecureSsl: false` 开启，除非您明确信任本地的 NAS 自签名证书。
- 入站 webhook 请求会进行 token 验证，并按发送方进行速率限制。
- 生产环境建议使用 `dmPolicy: "allowlist"`。

import en from "/components/footer/en.mdx";

<en />
