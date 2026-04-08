---
summary: "OpenClaw 可連接的訊息平台"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "聊天頻道"
---

# 聊天頻道

OpenClaw 可以在您目前使用的任何聊天應用程式上與您對話。每個頻道都透過 Gateway 連接。
到處都支援文字功能；媒體和回應則因頻道而異。

## 支援的頻道

- [BlueBubbles](/en/channels/bluebubbles) — **iMessage 的推薦選項**；使用 BlueBubbles macOS 伺服器 REST API，提供完整功能支援（內建外掛；編輯、取消傳送、特效、反應、群組管理 — 編輯功能在 macOS 26 Tahoe 版本目前無法使用）。
- [Discord](/en/channels/discord) — Discord Bot API + Gateway；支援伺服器、頻道和 DM。
- [Feishu](/en/channels/feishu) — 透過 WebSocket 連線的 Feishu/Lark 機器人（內建外掛）。
- [Google Chat](/en/channels/googlechat) — 透過 HTTP webhook 的 Google Chat API 應用程式。
- [iMessage (legacy)](/en/channels/imessage) — 透過 imsg CLI 的舊版 macOS 整合（已棄用，新設請使用 BlueBubbles）。
- [IRC](/en/channels/irc) — 經典 IRC 伺服器；具備配對/允許清單控制的頻道 + DM。
- [LINE](/en/channels/line) — LINE Messaging API 機器人（內建外掛）。
- [Matrix](/en/channels/matrix) — Matrix 通訊協定（內建外掛）。
- [Mattermost](/en/channels/mattermost) — Bot API + WebSocket；支援頻道、群組、私人訊息（內建外掛）。
- [Microsoft Teams](/en/channels/msteams) — Bot Framework；企業支援（內建外掛）。
- [Nextcloud Talk](/en/channels/nextcloud-talk) — 透過 Nextcloud Talk 的自託管聊天（內建外掛）。
- [Nostr](/en/channels/nostr) — 透過 NIP-04 的去中心化私人訊息（內建外掛）。
- [QQ Bot](/en/channels/qqbot) — QQ Bot API；私人聊天、群組聊天和富媒體（內建外掛）。
- [Signal](/en/channels/signal) — signal-cli；專注於隱私。
- [Slack](/en/channels/slack) — Bolt SDK；工作區應用程式。
- [Synology Chat](/en/channels/synology-chat) — 透過傳出+傳入 Webhook 的 Synology NAS 聊天（內建外掛）。
- [Telegram](/en/channels/telegram) — 透過 grammY 使用的 Bot API；支援群組。
- [Tlon](/en/channels/tlon) — 基於 Urbit 的訊息應用程式（內建外掛）。
- [Twitch](/en/channels/twitch) — 透過 IRC 連線的 Twitch 聊天（內建外掛）。
- [Voice Call](/en/plugins/voice-call) — 透過 Plivo 或 Twilio 提供的電話服務（外掛程式，需單獨安裝）。
- [WebChat](/en/web/webchat) — 透過 WebSocket 的 Gateway WebChat UI。
- [WeChat](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) — 透過 QR 登入的 Tencent iLink Bot 外掛程式；僅限私聊。
- [WhatsApp](/en/channels/whatsapp) — 最受歡迎；使用 Baileys 且需要 QR 配對。
- [Zalo](/en/channels/zalo) — Zalo Bot API；越南受歡迎的訊息應用程式（內建外掛）。
- [Zalo Personal](/en/channels/zalouser) — 透過 QR碼登入的 Zalo 個人帳號（內建外掛）。

## 備註

- 頻道可以同時執行；設定多個頻道後，OpenClaw 將會依據聊天進行路由。
- 最快的設定方式通常是 **Telegram**（簡單的 Bot Token）。WhatsApp 需要 QR 配對，並且會在磁碟上儲存更多狀態。
- 群組行為因頻道而異；請參閱 [Groups](/en/channels/groups)。
- DM 配對和允許列表是為了安全而強制執行的；請參閱 [Security](/en/gateway/security)。
- 疑難排解：[Channel troubleshooting](/en/channels/troubleshooting)。
- 模型供應商有單獨的文件說明；請參閱 [Model Providers](/en/providers/models)。
