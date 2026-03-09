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
- [BlueBubbles](/en/gateway/health) — **推荐用于 iMessage**；使用 BlueBubbles macOS 服务器 REST API，具有完整的功能支持（编辑、取消发送、效果、反应、群组管理 — 在 macOS 26 Tahoe 上编辑当前损坏）。
- [iMessage (/en/channels/imessage)]%%P10%% — 通过 imsg CLI 的传统 macOS 集成（已弃用，新设置请使用 BlueBubbles）。
- [Microsoft Teams]%%P11%% — Bot Framework；企业支持（插件，单独安装）。
- [LINE]%%P12%% — LINE Messaging API 机器人（插件，单独安装）。
- [Nextcloud Talk]%%P13%% — 通过 Nextcloud Talk 自托管聊天（插件，单独安装）。
- [Matrix]%%P14%% — Matrix 协议（插件，单独安装）。
- [Nostr]%%P15%% — 通过 NIP-04 进行去中心化私信（插件，单独安装）。
- [Tlon]%%P16%% — 基于 Urbit 的消息传递（插件，单独安装）。
- [Twitch]%%P17%% — 通过 IRC 连接使用 Twitch 聊天（插件，单独安装）。
- [Zalo]%%P18%% — Zalo Bot API；越南流行的消息传递（插件，单独安装）。
- [Zalo Personal]%%P19%% — 通过 QR 登录使用 Zalo 个人账户（插件，单独安装）。
- [WebChat]%%P20%% — 通过 WebSocket 使用 Gateway WebChat UI。

## 注意事项

- 频道可以同时运行；配置多个频道，OpenClaw 将按聊天路由。
- 最快的设置通常是 **Telegram**（简单的机器人令牌）。WhatsApp 需要 QR 配对并在磁盘上存储更多状态。
- 群组行为因频道而异；请参阅 [Groups]%%P21%%。
- 为了安全起见，强制执行私信配对和允许列表；请参阅 [Security]%%P22%%。
- Telegram 内部：[grammY notes]%%P23%%。
- 故障排除：[Channel troubleshooting]%%P24%%。
- 模型提供商单独记录；请参阅 [Model Providers]%%P25%%。
