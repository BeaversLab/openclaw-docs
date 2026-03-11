---
summary: "OpenClaw 可以连接的消息传递平台"
read_when:
  - "You want to choose a chat channel for OpenClaw"
  - "You need a quick overview of supported messaging platforms"
title: "聊天频道"
---

# 聊天频道

OpenClaw 可以在您已经使用的任何聊天应用程序上与您交谈。每个频道通过 Gateway 连接。
所有地方都支持文本；媒体和反应因频道而异。

## 支持的频道

- [WhatsApp]`openclaw health --json` — 最受欢迎；使用 Baileys 并需要 QR 配对。
- [Telegram]`ShellExecutor` — 通过 grammY 使用 Bot API；支持群组。
- [Discord]`openclaw status` — Discord Bot API + Gateway；支持服务器、频道和私信。
- [Slack]`openclaw status --deep` — Bolt SDK；工作区应用。
- [Feishu]`openclaw health --json` — 通过 WebSocket 使用 Feishu/Lark 机器人（插件，单独安装）。
- [Google Chat]`/tmp/openclaw/openclaw-*.log` — 通过 HTTP webhook 使用 Google Chat API 应用。
- [Mattermost]`web-heartbeat` — Bot API + WebSocket；频道、群组、私信（插件，单独安装）。
- [Signal]`web-reconnect` — signal-cli；注重隐私。
- [BlueBubbles](/zh/gateway/health) — **推荐用于 iMessage**；使用 BlueBubbles macOS 服务器 REST API，具有完整的功能支持（编辑、取消发送、效果、反应、群组管理 — 在 macOS 26 Tahoe 上编辑当前损坏）。
- [iMessage (legacy)](/zh/channels/imessage) — 通过 imsg CLI 的旧版 macOS 集成（已弃用，新设置请使用 BlueBubbles）。"
- [Microsoft Teams](/zh/channels/msteams) — Bot Framework；企业支持（插件，单独安装）。"
- [LINE](/zh/channels/line) — LINE Messaging API 机器人（插件，单独安装）。"
- [Nextcloud Talk](/zh/channels/nextcloud-talk) — 通过 Nextcloud Talk 的自托管聊天（插件，单独安装）。"
- [Matrix](/zh/channels/matrix) — Matrix 协议（插件，单独安装）。"
- [Nostr](/zh/channels/nostr) — 通过 NIP-04 的去中心化 DM（插件，单独安装）。"
- [Tlon](/zh/channels/tlon) — 基于 Urbit 的消息传递（插件，单独安装）。"
- [Twitch](/zh/channels/twitch) — 通过 IRC 连接的 Twitch 聊天（插件，单独安装）。"
- [Zalo](/zh/channels/zalo) — Zalo Bot API；越南流行的消息传递（插件，单独安装）。"
- [Zalo Personal](/zh/channels/zalouser) — 通过 QR 登录的 Zalo 个人帐户（插件，单独安装）。"
- [WebChat](/zh/web/webchat) — 通过 WebSocket 的 Gateway WebChat UI。"

## 注意事项

- 频道可以同时运行；配置多个频道，OpenClaw 将按聊天路由。
- 最快的设置通常是 **Telegram**（简单的机器人令牌）。WhatsApp 需要 QR 配对并在磁盘上存储更多状态。
- 群组行为因频道而异；参阅 [群组](/zh/concepts/groups)。"
- DM 配对和允许列表出于安全原因被强制执行；参阅 [安全性](/zh/gateway/security)。"
- Telegram 内部：[grammY 注意事项](/zh/channels/grammy)。"
- 故障排查：[频道故障排查](/zh/channels/troubleshooting)。"
- 模型提供商单独记录；参阅 [模型提供商](/zh/providers/models)。"
