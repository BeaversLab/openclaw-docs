---
summary: "OpenClaw 可以连接的消息平台"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "聊天频道"
---

# 聊天频道

OpenClaw 可以在您已经使用的任何聊天应用上与您对话。每个频道都通过 Gateway 网关 连接。
所有频道都支持文本；媒体和反应因频道而异。

## 支持的频道

- [BlueBubbles](/zh/en/channels/bluebubbles) — **推荐用于 iMessage**；使用 BlueBubbles macOS 服务器 REST API，支持完整功能（编辑、撤回、特效、反应、群组管理 —— 编辑功能目前在 macOS 26 Tahoe 上损坏）。
- [Discord](/zh/en/channels/discord) — Discord Bot API + Gateway 网关；支持服务器、频道和私信。
- [Feishu](/zh/en/channels/feishu) — 通过 WebSocket 连接的飞书/Lark 机器人（插件，需单独安装）。
- [Google Chat](/zh/en/channels/googlechat) — 通过 HTTP webhook 的 Google Chat API 应用。
- [iMessage (legacy)](/zh/en/channels/imessage) — 通过 imsg CLI 进行旧版 macOS 集成（已弃用，新设置请使用 BlueBubbles）。
- [IRC](/zh/en/channels/irc) — 经典 IRC 服务器；具有配对/白名单控制的频道和私信。
- [LINE](/zh/en/channels/line) — LINE Messaging API 机器人（插件，需单独安装）。
- [Matrix](/zh/en/channels/matrix) — Matrix 协议（插件，需单独安装）。
- [Mattermost](/zh/en/channels/mattermost) — Bot API + WebSocket；频道、群组、私信（插件，需单独安装）。
- [Microsoft Teams](/zh/en/channels/msteams) — Bot Framework；企业支持（插件，需单独安装）。
- [Nextcloud Talk](/zh/en/channels/nextcloud-talk) — 通过 Nextcloud Talk 进行自托管聊天（插件，需单独安装）。
- [Nostr](/zh/en/channels/nostr) — 通过 NIP-04 进行去中心化私信（插件，需单独安装）。
- [Signal](/zh/en/channels/signal) — signal-cli；注重隐私。
- [Synology Chat](/zh/en/channels/synology-chat) — 通过传出+传入 webhook 连接的 Synology NAS 聊天（插件，需单独安装）。
- [Slack](/zh/en/channels/slack) — Bolt SDK；工作区应用。
- [Telegram](/zh/en/channels/telegram) — 通过 grammY 的 Bot API；支持群组。
- [Tlon](/zh/en/channels/tlon) — 基于 Urbit 的消息应用（插件，需单独安装）。
- [Twitch](/zh/en/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（插件，需单独安装）。
- [WebChat](/zh/en/web/webchat) — 基于 WebSocket 的 Gateway 网关 WebChat UI。
- [WhatsApp](/zh/en/channels/whatsapp) — 最受欢迎；使用 Baileys 并需要二维码配对。
- [Zalo](/zh/en/channels/zalo) — Zalo Bot API；越南流行的消息应用（插件，需单独安装）。
- [Zalo Personal](/zh/en/channels/zalouser) — 通过二维码登录的 Zalo 个人帐号（插件，需单独安装）。

## 注意事项

- 通道可以同时运行；配置多个通道后，OpenClaw 将根据聊天进行路由。
- 最快的设置通常是 **Telegram**（简单的机器人令牌）。WhatsApp 需要二维码配对并且
  在磁盘上存储更多状态。
- 群组行为因通道而异；请参阅 [Groups](/zh/en/channels/groups)。
- 出于安全考虑，会强制执行私信（私信）配对和允许列表；请参阅 [Security](/zh/en/gateway/security)。
- 故障排除：[Channel 故障排除](/zh/en/channels/故障排除)。
- 模型提供商另有单独文档；请参阅 [Model Providers](/zh/en/providers/models)。

import zh from '/components/footer/zh.mdx';

<zh />
