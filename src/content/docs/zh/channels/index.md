---
summary: "OpenClaw 可以连接的消息平台"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "聊天频道"
---

# 聊天频道

OpenClaw 可以在您已经使用的任何聊天应用上与您对话。每个频道都通过 Gateway(网关) 网关 连接。
所有频道都支持文本；媒体和反应因频道而异。

## 支持的频道

- [BlueBubbles](/zh/channels/bluebubbles) — **推荐用于 iMessage**；使用 BlueBubbles macOS 服务器 REST API 并支持完整功能（内置插件；编辑、撤回、特效、反应、群组管理 —— 目前在 macOS 26 Tahoe 上编辑功能损坏）。
- [Discord](/zh/channels/discord) — Discord Bot API + Gateway(网关)；支持服务器、频道和私信。
- [Feishu](/zh/channels/feishu) — 通过 WebSocket 连接的 Feishu/Lark 机器人（内置插件）。
- [Google Chat](/zh/channels/googlechat) — 通过 HTTP webhook 的 Google Chat API 应用。
- [iMessage (legacy)](/zh/channels/imessage) — 通过 imsg macOS 的旧版 CLI 集成（已弃用，新设置请使用 BlueBubbles）。
- [IRC](/zh/channels/irc) — 经典 IRC 服务器；支持频道和私信，具有配对/白名单控制功能。
- [LINE](/zh/channels/line) — LINE Messaging API 机器人（内置插件）。
- [Matrix](/zh/channels/matrix) — Matrix 协议（内置插件）。
- [Mattermost](/zh/channels/mattermost) — 机器人 API + WebSocket；频道、群组、私信（内置插件）。
- [Microsoft Teams](/zh/channels/msteams) — Bot Framework；企业支持（内置插件）。
- [Nextcloud Talk](/zh/channels/nextcloud-talk) — 通过 Nextcloud Talk 进行自托管聊天（内置插件）。
- [Nostr](/zh/channels/nostr) — 通过 NIP-04 进行去中心化私信（内置插件）。
- [QQ Bot](/zh/channels/qqbot) — QQ 机器人 API；私聊、群聊和富媒体（内置插件）。
- [Signal](/zh/channels/signal) — signal-cli；注重隐私。
- [Slack](/zh/channels/slack) — Bolt SDK; 工作区应用.
- [Synology Chat](/zh/channels/synology-chat) — 通过传出+传入 webhooks 连接的 Synology NAS 聊天（内置插件）。
- [Telegram](/zh/channels/telegram) — 通过 API 实现的 Bot grammY；支持群组。
- [Tlon](/zh/channels/tlon) — 基于 Urbit 的消息应用（内置插件）。
- [Twitch](/zh/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（内置插件）。
- [Voice Call](/zh/plugins/voice-call) — 通过 Plivo 或 Twilio 实现的电话功能（插件，需单独安装）。
- [WebChat](/zh/web/webchat) — 通过 WebSocket 实现的 Gateway(网关) WebChat UI。
- [WeChat](/zh/channels/wechat) — 通过二维码登录的腾讯 iLink Bot 插件；仅支持私聊（外部插件）。
- [WhatsApp](/zh/channels/whatsapp) — 最受欢迎；使用 Baileys 且需要二维码配对。
- [Zalo](/zh/channels/zalo) — Zalo Bot API；越南流行的通讯软件（内置插件）。
- [Zalo Personal](/zh/channels/zalouser) — 通过二维码登录的 Zalo 个人帐号（内置插件）。

## 注

- 渠道可以同时运行；配置多个渠道后，OpenClaw 将根据聊天进行路由。
- 通常最快的设置方式是 **Telegram**（简单的 Bot 令牌）。WhatsApp 需要二维码配对，并在磁盘上存储更多状态。
- 群组行为因渠道而异；请参阅 [Groups](/zh/channels/groups)。
- 出于安全考虑，强制执行私信配对和允许名单；请参阅 [Security](/zh/gateway/security)。
- 故障排除：[Channel 故障排除](/zh/channels/troubleshooting)。
- 模型提供商另有单独文档；请参阅 [Model Providers](/zh/providers/models)。
