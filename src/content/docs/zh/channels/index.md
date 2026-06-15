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
- 接受机器人发起的入站消息的频道可以使用共享
  [bot loop protection](/zh/channels/bot-loop-protection) 来防止机器人对
  彼此无限循环回复。
- 支持的常驻房间可以使用 [ambient room events](/zh/channels/ambient-room-events)
  这样未被提及的房间闲聊会变为静默上下文，除非代理使用
  `message` 工具发送消息。

## 支持的频道

- [Discord](/zh/channels/discord) - Discord 机器人 API + Gateway(网关)；支持服务器、频道和私信。
- [Feishu](/zh/channels/feishu) - 通过 WebSocket 连接的 Feishu/Lark 机器人（内置插件）。
- [Google Chat](/zh/channels/googlechat) - 通过 HTTP webhook 连接的 Google Chat API 应用（可下载插件）。
- [iMessage](/zh/channels/imessage) - 通过已登录 Mac 上的 `imsg` 网桥实现的原生 macOS 集成（或当 Gateway(网关) 运行在其他地方时使用 SSH 封装器），包括用于回复、轻点、效果、附件和群组管理的私有 API 操作。当主机权限和 Messages 访问权限匹配时，推荐用于新的 OpenClaw iMessage 设置。
- [IRC](/zh/channels/irc) - 经典 IRC 服务器；具有配对/白名单控制的频道 + 私信。
- [LINE](/zh/channels/line) - LINE 消息 API 机器人（可下载插件）。
- [Matrix](/zh/channels/matrix) - Matrix 协议（可下载插件）。
- [Mattermost](/zh/channels/mattermost) - 机器人 API + WebSocket；频道、群组、私信（可下载插件）。
- [Microsoft Teams](/zh/channels/msteams) - Bot Framework；企业支持（内置插件）。
- [Nextcloud Talk](/zh/channels/nextcloud-talk) - 通过 Nextcloud Talk 实现的自托管聊天（内置插件）。
- [Nostr](/zh/channels/nostr) - 通过 NIP-04 实现的去中心化私信（附带插件）。
- [QQ Bot](/zh/channels/qqbot) - QQ Bot API；支持私聊、群聊和富媒体（附带插件）。
- [Signal](/zh/channels/signal) - signal-cli；注重隐私。
- [Slack](/zh/channels/slack) - Bolt SDK；工作区应用。
- [SMS](</en/channels/smsGateway(网关)>) - 通过 Gateway(网关) webhook 由 Twilio 支持的 SMS（捆绑插件）。
- [Synology Chat](/zh/channels/synology-chat) - 通过传出和传入 webhook 连接的 Synology NAS Chat（捆绑插件）。
- [Telegram](Telegram/en/channels/telegramAPIgrammY) - 通过 grammY 使用 Bot API；支持群组。
- [Tlon](Tlon/en/channels/tlon) - 基于 Urbit 的信使（捆绑插件）。
- [Twitch](Twitch/en/channels/twitchTwitch) - 通过 IRC 连接的 Twitch 聊天（捆绑插件）。
- [Voice Call](/zh/plugins/voice-call) - 通过 Plivo 或 Twilio 实现的电话通话（插件，需单独安装）。
- [WebChat](<WebChat/en/web/webchatGateway(网关)WebChat>) - 基于 WebSocket 的 Gateway(网关) WebChat UI。
- [WeChat](/zh/channels/wechat) - 通过 QR 登录的腾讯 iLink Bot 插件；仅支持私聊（外部插件）。
- [WhatsApp](WhatsApp/en/channels/whatsappBaileys) - 最受欢迎；使用 Baileys 并需要 QR 配对。
- [Yuanbao](/zh/channels/yuanbao) - 腾讯元宝机器人（外部插件）。
- [Zalo](Zalo/en/channels/zaloZaloAPI) - Zalo Bot API；越南流行的信使（捆绑插件）。
- [Zalo Personal](Zalo/en/channels/zalouserZalo) - 通过 QR 登录的 Zalo 个人账号（捆绑插件）。

## 注意事项

- 渠道可以同时运行；配置多个渠道后，OpenClaw 将根据聊天进行路由。
- 最快的设置通常是 **Telegram**（简单的 Bot 令牌）。WhatsApp 需要 QR 配对，并且在磁盘上存储更多状态。
- 群组行为因渠道而异；请参阅 [Groups](/zh/channels/groups)。
- 为了安全起见，强制执行私信配对和允许列表；请参阅 [Security](/zh/gateway/security)。
- 故障排除：[Channel 故障排除](/zh/channels/troubleshooting)。
- 模型提供商单独记录在案；请参阅 [模型提供商](/zh/providers/models)。
