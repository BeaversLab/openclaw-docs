---
summary: "OpenClaw 可以连接的通讯平台"
read_when:
  - You want to choose a chat 渠道 for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Chat Channels"
---

# Chat Channels

OpenClaw 可以与您在您已经使用的任何聊天应用程序上交谈。每个渠道都通过 Gateway(网关) 连接。
到处都支持文本；媒体和反应因渠道而异。

## Supported channels

- [BlueBubbles](/zh/channels/bluebubbles) — **Recommended for iMessage**；使用 BlueBubbles macOS 服务器 REST API 并提供完整功能支持（编辑、取消发送、效果、反应、群组管理 —— 编辑目前在 macOS 26 Tahoe 上损坏）。
- [Discord](/zh/channels/discord) — Discord Bot API + Gateway(网关)；支持服务器、渠道和私信。
- [Feishu](/zh/channels/feishu) — Feishu/Lark bot via WebSocket (plugin, installed separately).
- [Google Chat](/zh/channels/googlechat) — Google Chat API app via HTTP webhook.
- [iMessage (legacy)](/zh/channels/imessage) — Legacy macOS integration via imsg CLI (deprecated, use BlueBubbles for new setups).
- [IRC](/zh/channels/irc) — Classic IRC servers; channels + 私信 with pairing/allowlist controls.
- [LINE](/zh/channels/line) — LINE Messaging API bot (plugin, installed separately).
- [Matrix](/zh/channels/matrix) — Matrix protocol (plugin, installed separately).
- [Mattermost](/zh/channels/mattermost) — Bot API + WebSocket; channels, groups, 私信 (plugin, installed separately).
- [Microsoft Teams](/zh/channels/msteams) — Bot Framework; enterprise support (plugin, installed separately).
- [Nextcloud Talk](/zh/channels/nextcloud-talk) — Self-hosted chat via Nextcloud Talk (plugin, installed separately).
- [Nostr](/zh/channels/nostr) — Decentralized 私信 via NIP-04 (plugin, installed separately).
- [Signal](/zh/channels/signal) — signal-cli; privacy-focused.
- [Synology Chat](/zh/channels/synology-chat) — Synology NAS Chat via outgoing+incoming webhooks (plugin, installed separately).
- [Slack](/zh/channels/slack) — Bolt SDK; workspace apps.
- [Telegram](/zh/channels/telegram) — Bot API via grammY; supports groups.
- [Tlon](/zh/channels/tlon) — 基于 Urbit 的消息传递应用（插件，需单独安装）。
- [Twitch](/zh/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（插件，需单独安装）。
- [WebChat](/zh/web/webchat) — 通过 WebSocket 连接的 Gateway(网关) WebChat UI。
- [WhatsApp](/zh/channels/whatsapp) — 最受欢迎；使用 Baileys 且需要 QR 配对。
- [Zalo](/zh/channels/zalo) — Zalo Bot API；越南流行的消息传递应用（插件，需单独安装）。
- [Zalo Personal](/zh/channels/zalouser) — 通过 QR 登录的 Zalo 个人账号（插件，需单独安装）。

## 备注

- 渠道可以同时运行；配置多个渠道，OpenClaw 将按聊天进行路由。
- 最快的设置通常是 **Telegram**（简单的 Bot 令牌）。WhatsApp 需要 QR 配对，
  并在磁盘上存储更多状态。
- 群组行为因渠道而异；请参阅 [群组](/zh/channels/groups)。
- 出于安全考虑，会强制执行私信配对和允许列表；请参阅 [安全性](/zh/gateway/security)。
- 故障排除：[渠道故障排除](/zh/channels/troubleshooting)。
- 模型提供商另有单独文档；请参阅 [模型提供商](/zh/providers/models)。

import zh from "/components/footer/zh.mdx";

<zh />
