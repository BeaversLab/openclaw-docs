---
summary: "OpenClaw 可連接的訊息平台"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Chat channels"
---

OpenClaw 可以透過您已經使用的任何聊天應用程式與您交談。每個頻道都透過 Gateway 連接。
到處都支援文字；媒體和反應則因頻道而異。

## 傳遞注意事項

- 包含 markdown 圖片語法的 Telegram 回覆，例如 `![alt](url)`，
  會在最終的 outbound path 上盡可能轉換為媒體回覆。
- Slack 多人 DM 路由為群組聊天，因此群組政策、提及
  行為和群組會話規則適用於 MPIM 對話。
- WhatsApp 設定是隨需安裝的：入站流程可以在
  Baileys 執行時間依賴項佈建之前顯示設定流程，並且 Gateway 僅在頻道實際啟用時載入 WhatsApp
  執行時間。

## 支援的頻道

- [BlueBubbles](/zh-Hant/channels/bluebubbles) — **iMessage 的推薦選項**；使用 BlueBubbles macOS server REST API，具有完整的功能支援（內建外掛；編輯、取消傳送、效果、反應、群組管理 — 編輯功能在 macOS 26 Tahoe 上目前損壞）。
- [Discord](/zh-Hant/channels/discord) — Discord Bot API + Gateway；支援伺服器、頻道和 DM。
- [Feishu](/zh-Hant/channels/feishu) — 透過 WebSocket 的 Feishu/Lark bot（內建外掛）。
- [Google Chat](/zh-Hant/channels/googlechat) — 透過 HTTP webhook 的 Google Chat API 應用程式。
- [iMessage (legacy)](/zh-Hant/channels/imessage) — 透過 imsg CLI 的舊版 macOS 整合（已棄用，新設定請使用 BlueBubbles）。
- [IRC](/zh-Hant/channels/irc) — 經典 IRC 伺服器；頻道 + 具有配對/允許列表控制的 DM。
- [LINE](/zh-Hant/channels/line) — LINE Messaging API bot（內建外掛）。
- [Matrix](/zh-Hant/channels/matrix) — Matrix 協定（內建外掛）。
- [Mattermost](/zh-Hant/channels/mattermost) — Bot API + WebSocket；頻道、群組、DM（內建外掛）。
- [Microsoft Teams](/zh-Hant/channels/msteams) — Bot Framework；企業支援（內建外掛）。
- [Nextcloud Talk](/zh-Hant/channels/nextcloud-talk) — 透過 Nextcloud Talk 的自託管聊天（內建外掛）。
- [Nostr](/zh-Hant/channels/nostr) — 透過 NIP-04 的去中心化 DM（內建外掛）。
- [QQ Bot](/zh-Hant/channels/qqbot) — QQ Bot API；私聊、群聊和富媒體（內建外掛）。
- [Signal](/zh-Hant/channels/signal) — signal-cli；注重隱私。
- [Slack](/zh-Hant/channels/slack) — Bolt SDK；工作區應用程式。
- [Synology Chat](/zh-Hant/channels/synology-chat) — 透過傳出與傳入 Webhook 連接的 Synology NAS Chat（內建外掛）。
- [Telegram](/zh-Hant/channels/telegram) — 透過 grammY 連接的 Bot API；支援群組。
- [Tlon](/zh-Hant/channels/tlon) — 基於 Urbit 的傳訊程式（內建外掛）。
- [Twitch](/zh-Hant/channels/twitch) — 透過 IRC 連接的 Twitch 聊天（內建外掛）。
- [Voice Call](/zh-Hant/plugins/voice-call) — 透過 Plivo 或 Twilio 進行的電話通訊（外掛，需單獨安裝）。
- [WebChat](/zh-Hant/web/webchat) — 透過 WebSocket 連接的 Gateway WebChat UI。
- [WeChat](/zh-Hant/channels/wechat) — 透過 QR 登入的 Tencent iLink Bot 外掛；僅支援私聊（外部外掛）。
- [WhatsApp](/zh-Hant/channels/whatsapp) — 最受歡迎；使用 Baileys 並需要 QR 配對。
- [Zalo](/zh-Hant/channels/zalo) — Zalo Bot API；越南流行的傳訊程式（內建外掛）。
- [Zalo Personal](/zh-Hant/channels/zalouser) — 透過 QR 登入的 Zalo 個人帳號（內建外掛）。

## 備註

- 通道可以同時運行；配置多個通道後，OpenClaw 將根據聊天進行路由。
- 最快的設置通常是 **Telegram**（簡單的 bot token）。WhatsApp 需要 QR 配對並在磁碟上儲存更多狀態。
- 群組行為因通道而異；請參閱 [Groups](/zh-Hant/channels/groups)。
- DM 配對和允許清單為了安全而強制執行；請參閱 [Security](/zh-Hant/gateway/security)。
- 疑難排解：[Channel troubleshooting](/zh-Hant/channels/troubleshooting)。
- 模型提供商另有記載；請參閱 [Model Providers](/zh-Hant/providers/models)。
