---
summary: "OpenClaw 可以连接的消息平台"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "聊天渠道"
---

OpenClaw 可以在您 already 使用的任何聊天应用上与您对话。每个渠道都通过 Gateway(网关) 连接。
各地均支持文本；媒体和反应因渠道而异。

## 投递说明

- 包含 markdown 图像语法的 Telegram 回复（例如 `![alt](url)`），
  在最终出站路径上会被尽可能转换为媒体回复。
- Slack 多人私信作为群组聊天路由，因此群组策略、提及
  行为和群组会话规则适用于 MPIM 会话。
- WhatsApp 设置是按需安装的：新手引导可以在 Baileys 运行时依赖项暂存之前显示设置流程，并且 Gateway(网关) 仅在该渠道实际激活时才加载 WhatsApp
  运行时。

## 支持的渠道

- [BlueBubbles](/zh/channels/bluebubbles) — **推荐用于 iMessage**；使用 BlueBubbles macOS 服务器 REST API 并具有完整的功能支持（捆绑插件；编辑、取消发送、效果、反应、群组管理 — 编辑在 macOS 26 Tahoe 上目前损坏）。
- [Discord](/zh/channels/discord) — Discord Bot API + Gateway(网关)；支持服务器、渠道和私信。
- [Feishu](/zh/channels/feishu) — 通过 WebSocket 连接的 Feishu/Lark bot（捆绑插件）。
- [Google Chat](/zh/channels/googlechat) — 通过 HTTP webhook 连接的 Google Chat API 应用程序。
- [iMessage (legacy)](/zh/channels/imessage) — 通过 imsg macOS 的旧版 CLI 集成（已弃用，新设置请使用 BlueBubbles）。
- [IRC](/zh/channels/irc) — 经典 IRC 服务器；具有配对/允许列表控制的渠道 + 私信。
- [LINE](/zh/channels/line) — LINE Messaging API bot（捆绑插件）。
- [Matrix](/zh/channels/matrix) — Matrix 协议（捆绑插件）。
- [Mattermost](/zh/channels/mattermost) — Bot API + WebSocket；渠道、群组、私信（捆绑插件）。
- [Microsoft Teams](/zh/channels/msteams) — Bot Framework；企业支持（捆绑插件）。
- [Nextcloud Talk](/zh/channels/nextcloud-talk) — 通过 Nextcloud Talk 进行自托管聊天（捆绑插件）。
- [Nostr](/zh/channels/nostr) — 通过 NIP-04 进行去中心化私信（捆绑插件）。
- [QQ Bot](/zh/channels/qqbot) — QQ Bot API；私聊、群聊和富媒体（捆绑插件）。
- [Signal](/zh/channels/signal) — signal-cli；注重隐私。
- [Slack](/zh/channels/slack) — Bolt SDK；工作区应用。
- [Synology Chat](/zh/channels/synology-chat) — 通过传出和传入 Webhook 实现的 Synology NAS 聊天（捆绑插件）。
- [Telegram](/zh/channels/telegram) — 通过 grammY 实现的 Bot API；支持群组。
- [Tlon](/zh/channels/tlon) — 基于 Urbit 的通讯工具（捆绑插件）。
- [Twitch](/zh/channels/twitch) — 通过 IRC 连接实现的 Twitch 聊天（捆绑插件）。
- [Voice Call](/zh/plugins/voice-call) — 通过 Plivo 或 Twilio 实现的语音通话（插件，需单独安装）。
- [WebChat](/zh/web/webchat) — 通过 WebSocket 实现的 Gateway(网关) WebChat UI。
- [WeChat](/zh/channels/wechat) — 腾讯 iLink Bot 插件，通过二维码登录；仅支持私聊（外部插件）。
- [WhatsApp](/zh/channels/whatsapp) — 最受欢迎；使用 Baileys 并需要二维码配对。
- [Zalo](/zh/channels/zalo) — Zalo Bot API；越南流行的通讯工具（捆绑插件）。
- [Zalo Personal](/zh/channels/zalouser) — 通过二维码登录的 Zalo 个人账号（捆绑插件）。

## 备注

- 渠道可以同时运行；配置多个，OpenClaw 将按聊天进行路由。
- 最快的设置通常是 **Telegram**（简单的 Bot 令牌）。WhatsApp 需要二维码配对，并在磁盘上存储更多状态。
- 群组行为因渠道而异；请参阅 [Groups](/zh/channels/groups)。
- 私信 配对和允许列表出于安全考虑被强制执行；请参阅 [Security](/zh/gateway/security)。
- 故障排除：[渠道故障排除](/zh/channels/troubleshooting)。
- 模型提供商有单独的文档；请参阅 [Model Providers](/zh/providers/models)。
