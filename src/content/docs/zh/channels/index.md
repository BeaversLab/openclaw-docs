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
- WhatsApp 设置是按需安装的：在插件包安装之前，新手引导就可以显示设置流程，并且 Gateway 仅在渠道实际处于活动状态时才会加载外部的 ClawHub/npm 插件。

## 支持的渠道

- [Discord](/zh/channels/discord) - Discord Bot API + Gateway(网关)；支持服务器、渠道和私信。
- [Feishu](/zh/channels/feishu) - 通过 WebSocket 连接的 Feishu/Lark 机器人（捆绑插件）。
- [Google Chat](/zh/channels/googlechat) - 通过 HTTP webhook 连接的 Google Chat API 应用（可下载插件）。
- [iMessage](/zh/channels/imessage) - 通过已登录 Mac 上的 `imsg` 网桥进行原生 macOS 集成（当 Gateway(网关) 在其他地方运行时则为 SSH 包装器），包括用于回复、轻点、效果、附件和群组管理的私有 API 操作。当主机权限和“信息”访问权限适用时，这是新的 OpenClaw iMessage 设置的首选方案。
- [IRC](/zh/channels/irc) - 经典 IRC 服务器；带有配对/允许列表控制的渠道 + 私信。
- [LINE](/zh/channels/line) - LINE Messaging API 机器人（可下载插件）。
- [Matrix](/zh/channels/matrix) - Matrix 协议（可下载插件）。
- [Mattermost](/zh/channels/mattermost) - Bot API + WebSocket；渠道、群组、私信（可下载插件）。
- [Microsoft Teams](/zh/channels/msteams) - Bot Framework；企业支持（捆绑插件）。
- [Nextcloud Talk](/zh/channels/nextcloud-talk) - 通过 Nextcloud Talk 进行自托管聊天（捆绑插件）。
- [Nostr](/zh/channels/nostr) - 通过 NIP-04 进行去中心化私信（捆绑插件）。
- [QQ Bot](/zh/channels/qqbotAPI) - QQ Bot API；私聊、群聊和富媒体（附带插件）。
- [Signal](/zh/channels/signal) - signal-cli；注重隐私。
- [Slack](/zh/channels/slack) - Bolt SDK；工作区应用。
- [Synology Chat](/zh/channels/synology-chat) - 通过传出+传入 Webhook 连接的 Synology NAS Chat（附带插件）。
- [Telegram](/zh/channels/telegram) - 通过 grammY 连接的 Bot APIgrammY；支持群组。
- [Tlon](/zh/channels/tlon) - 基于 Urbit 的消息应用（附带插件）。
- [Twitch](/zh/channels/twitch) - 通过 IRC 连接的 Twitch 聊天（附带插件）。
- [Voice Call](/zh/plugins/voice-call) - 通过 Plivo 或 Twilio 实现的电话功能（插件，需单独安装）。
- [WebChat](/zh/web/webchat) - 通过 WebSocket 连接的 Gateway(网关) WebChat UI。
- [WeChat](/zh/channels/wechat) - 通过 QR 登录的腾讯 iLink Bot 插件；仅支持私聊（外部插件）。
- [WhatsApp](/zh/channels/whatsapp) - 最受欢迎；使用 Baileys 并需要扫码配对。
- [Yuanbao](/zh/channels/yuanbao) - 腾讯元宝机器人（外部插件）。
- [Zalo](/zh/channels/zalo) - Zalo Bot API；越南流行的消息应用（附带插件）。
- [Zalo Personal](/zh/channels/zalouser) - 通过 QR 登录的 Zalo 个人账户（附带插件）。

## 备注

- 渠道可以同时运行；配置多个，OpenClaw 将按聊天进行路由。
- 最快的设置通常是 **Telegram**（简单的 Bot 令牌）。WhatsApp 需要二维码配对，并在磁盘上存储更多状态。
- 群组行为因渠道而异；请参阅 [Groups](/zh/channels/groups)。
- 出于安全考虑，强制执行私聊配对和允许列表；请参阅 [Security](/zh/gateway/security)。
- 故障排除：[Channel 故障排除](/zh/channels/troubleshooting)。
- 模型提供商单独记录在案；请参阅 [Model Providers](/zh/providers/models)。
