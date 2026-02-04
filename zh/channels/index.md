---
summary: "OpenClaw 可连接的消息平台"
read_when:
  - 你想为 OpenClaw 选择聊天渠道
  - 你需要支持平台的快速概览
title: "聊天渠道"
---

# 聊天渠道

OpenClaw 可以在你已使用的任何聊天应用中与你对话。每个渠道都通过 Gateway 连接。
文本在所有渠道均支持；媒体与 reactions 支持因渠道而异。

## 支持的渠道

- [WhatsApp](/zh/channels/whatsapp) — 最常用；使用 Baileys，需要扫码配对。
- [Telegram](/zh/channels/telegram) — Bot API 通过 grammY；支持群聊。
- [Discord](/zh/channels/discord) — Discord Bot API + Gateway；支持服务器、频道与私聊。
- [Slack](/zh/channels/slack) — Bolt SDK；工作区应用。
- [Google Chat](/zh/channels/googlechat) — 通过 HTTP webhook 的 Google Chat API 应用。
- [Mattermost](/zh/channels/mattermost) — Bot API + WebSocket；频道、群组与私聊（插件，需单独安装）。
- [Signal](/zh/channels/signal) — signal-cli；隐私优先。
- [BlueBubbles](/zh/channels/bluebubbles) — **推荐用于 iMessage**；使用 BlueBubbles macOS 服务器 REST API，功能完整（编辑、撤回、特效、reactions、群管理 —— 在 macOS 26 Tahoe 上编辑目前不可用）。
- [iMessage](/zh/channels/imessage) — 仅 macOS；通过 imsg 的原生集成（旧方案，新部署建议用 BlueBubbles）。
- [Microsoft Teams](/zh/channels/msteams) — Bot Framework；企业支持（插件，需单独安装）。
- [LINE](/zh/channels/line) — LINE Messaging API bot（插件，需单独安装）。
- [Nextcloud Talk](/zh/channels/nextcloud-talk) — Nextcloud Talk 自托管聊天（插件，需单独安装）。
- [Matrix](/zh/channels/matrix) — Matrix 协议（插件，需单独安装）。
- [Nostr](/zh/channels/nostr) — NIP-04 的去中心化私信（插件，需单独安装）。
- [Tlon](/zh/channels/tlon) — 基于 Urbit 的聊天（插件，需单独安装）。
- [Twitch](/zh/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（插件，需单独安装）。
- [Zalo](/zh/channels/zalo) — Zalo Bot API；越南流行的消息平台（插件，需单独安装）。
- [Zalo Personal](/zh/channels/zalouser) — Zalo 个人账号扫码登录（插件，需单独安装）。
- [WebChat](/zh/web/webchat) — Gateway WebChat UI（WebSocket）。

## 备注

- 渠道可同时运行；配置多个后，OpenClaw 会按聊天来源进行路由。
- 最快的设置通常是 **Telegram**（只需 bot token）。WhatsApp 需要扫码配对，并在磁盘中保存更多状态。
- 群组行为因渠道而异；见 [Groups](/zh/concepts/groups)。
- DM 配对与 allowlist 会强制执行以保证安全；见 [安全](/zh/gateway/security)。
- Telegram 内部实现：[grammY notes](/zh/channels/grammy)。
- 故障排查：[通道 troubleshooting](/zh/channels/troubleshooting)。
- 模型提供商文档在别处；见 [模型 提供商](/zh/providers/models)。
