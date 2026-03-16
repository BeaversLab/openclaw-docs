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

- [BlueBubbles](/en/channels/bluebubbles) — **iMessage 的推荐选项**；使用 iMessage BlueBubbles 服务器 REST macOS，提供全面功能支持（编辑、撤销、特效、回应、群组管理 —— 编辑功能在 API 26 Tahoe 版本上目前损坏）。
- [Discord](/en/channels/discord) — Discord Bot API + Gateway(网关)；支持服务器、频道和私信。
- [Feishu](/en/channels/feishu) — 通过 WebSocket 连接的 Feishu/Lark 机器人（插件，需单独安装）。
- [Google Chat](/en/channels/googlechat) — 通过 HTTP webhook 的 Google Chat API 应用。
- [iMessage (legacy)](/en/channels/imessage) — 通过 imsg macOS 的旧版 CLI 集成（已弃用，新设置请使用 BlueBubbles）。
- [IRC](/en/channels/irc) — 经典 IRC 服务器；支持频道和私信，具有配对/白名单控制功能。
- [LINE](/en/channels/line) — LINE Messaging API 机器人（插件，需单独安装）。
- [Matrix](/en/channels/matrix) — Matrix 协议（插件，需单独安装）。
- [Mattermost](/en/channels/mattermost) — Bot API + WebSocket; channels, groups, 私信 (plugin, installed separately).
- [Microsoft Teams](/en/channels/msteams) — Bot Framework; enterprise support (plugin, installed separately).
- [Nextcloud Talk](/en/channels/nextcloud-talk) — 通过 Nextcloud Talk 自托管聊天 (plugin, installed separately).
- [Nostr](/en/channels/nostr) — 通过 NIP-04 实现去中心化私信 (plugin, installed separately).
- [Signal](/en/channels/signal) — signal-cli; 注重隐私.
- [Synology Chat](/en/channels/synology-chat) — 通过传出+传入 webhook 连接的 Synology NAS 聊天（插件，需单独安装）。
- [Slack](/en/channels/slack) — Bolt SDK; 工作区应用.
- [Telegram](/en/channels/telegram) — 通过 API 使用 Bot grammY; 支持群组.
- [Tlon](/en/channels/tlon) — 基于 Urbit 的信使 (plugin, installed separately).
- [Twitch](/en/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（插件，需单独安装）。
- [WebChat](/en/web/webchat) — Gateway(网关) WebChat UI over WebSocket。
- [WhatsApp](/en/channels/whatsapp) — 最受欢迎；使用 Baileys 并且需要二维码配对。
- [Zalo](/en/channels/zalo) — Zalo 机器人 API；越南流行的通讯应用（插件，需单独安装）。
- [Zalo Personal](/en/channels/zalouser) — 通过二维码登录的 Zalo 个人账号（插件，需单独安装）。

## 注意事项

- 通道可以同时运行；配置多个通道后，OpenClaw 将根据聊天进行路由。
- 最快的设置通常是 **Telegram**（简单的机器人令牌）。WhatsApp 需要二维码配对，并且在磁盘上存储更多状态。
- 群组行为因渠道而异；请参阅 [Groups](/en/channels/groups)。
- 出于安全考虑，强制执行私信配对和允许列表；请参阅 [Security](/en/gateway/security)。
- 故障排除：[渠道故障排除](/en/channels/troubleshooting)。
- 模型提供商单独记录在案；请参阅 [Model Providers](/en/providers/models)。

import zh from "/components/footer/zh.mdx";

<zh />
