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
- WhatsApp 設定是隨需安裝的：在安裝外掛程式套件之前，入門流程可以顯示設定流程，而閘道只會在通道實際啟用時載入外部 ClawHub/npm 外掛程式。
- 接受機器人發送的入站訊息的頻道可以使用共享的
  [機器人循環保護](/zh-Hant/channels/bot-loop-protection) 以防止機器人對
  彼此無限回覆。
- 支援的常開房間可以使用 [環境房間事件](/zh-Hant/channels/ambient-room-events)
  因此未被提及的房間閒聊會變成安靜的背景，除非代理使用
  `message` 工具發送。

## 支援的頻道

- [Discord](/zh-Hant/channels/discord) - Discord Bot API + Gateway；支援伺服器、頻道和私訊。
- [Feishu](/zh-Hant/channels/feishu) - 透過 WebSocket 的 Feishu/Lark 機器人（內建外掛程式）。
- [Google Chat](/zh-Hant/channels/googlechat) - 透過 HTTP webhook 的 Google Chat API 應用程式（可下載外掛程式）。
- [iMessage](/zh-Hant/channels/imessage) - 透過已登入 Mac 上的 `imsg` 橋接器進行原生 macOS 整合（或在 Gateway 執行於其他地方時透過 SSH 包裝器），包括回覆、點讚、特效、附件和群組管理的私人 API 動作。當主機權限和訊息存取權限相符時，這是新 OpenClaw iMessage 設定的首選。
- [IRC](/zh-Hant/channels/irc) - 經典 IRC 伺服器；頻道 + 私訊，並具有配對/許可清單控制。
- [LINE](/zh-Hant/channels/line) - LINE Messaging API 機器人（可下載外掛程式）。
- [Matrix](/zh-Hant/channels/matrix) - Matrix 協定（可下載外掛程式）。
- [Mattermost](/zh-Hant/channels/mattermost) - Bot API + WebSocket；頻道、群組、私訊（可下載外掛程式）。
- [Microsoft Teams](/zh-Hant/channels/msteams) - Bot Framework；企業支援（內建外掛程式）。
- [Nextcloud Talk](/zh-Hant/channels/nextcloud-talk) - 透過 Nextcloud Talk 的自託管聊天（內建外掛程式）。
- [Nostr](/zh-Hant/channels/nostr) - 透過 NIP-04 的去中心化私訊（內建外掛程式）。
- [QQ Bot](/zh-Hant/channels/qqbot) - QQ Bot API；私聊、群聊和富媒體（內建外掛程式）。
- [Signal](/zh-Hant/channels/signal) - signal-cli；注重隱私。
- [Slack](/zh-Hant/channels/slack) - Bolt SDK；工作區應用程式。
- [Synology Chat](/zh-Hant/channels/synology-chat) - 透過傳出 + 傳入 webhook 的 Synology NAS Chat（內建外掛程式）。
- [Telegram](/zh-Hant/channels/telegram) - 透過 grammY 使用的 Bot API；支援群組。
- [Tlon](/zh-Hant/channels/tlon) - 基於 Urbit 的訊息應用程式（內建外掛程式）。
- [Twitch](/zh-Hant/channels/twitch) - 透過 IRC 連線的 Twitch 聊天（內建外掛程式）。
- [Voice Call](/zh-Hant/plugins/voice-call) - 透過 Plivo 或 Twilio 的電話服務（外掛程式，需另外安裝）。
- [WebChat](/zh-Hant/web/webchat) - 透過 WebSocket 的 Gateway WebChat UI。
- [WeChat](/zh-Hant/channels/wechat) - 透過 QR 登入的 Tencent iLink Bot 外掛程式；僅支援私人聊天（外部外掛程式）。
- [WhatsApp](/zh-Hant/channels/whatsapp) - 最受歡迎；使用 Baileys 且需要 QR 配對。
- [Yuanbao](/zh-Hant/channels/yuanbao) - Tencent Yuanbao 機器人（外部外掛程式）。
- [Zalo](/zh-Hant/channels/zalo) - Zalo Bot API；越南流行的訊息應用程式（內建外掛程式）。
- [Zalo Personal](/zh-Hant/channels/zalouser) - 透過 QR 登入的 Zalo 個人帳戶（內建外掛程式）。

## 備註

- 頻道可以同時執行；設定多個頻道後，OpenClaw 將依據各個聊天進行路由。
- 最快速的設定通常是 **Telegram**（簡單的機器人 token）。WhatsApp 需要 QR 配對並在磁碟上儲存更多狀態。
- 群組行為依頻道而異；請參閱 [Groups](/zh-Hant/channels/groups)。
- 為了安全起見，會強制執行 DM 配對與允許清單；請參閱 [Security](/zh-Hant/gateway/security)。
- 疑難排解：[Channel troubleshooting](/zh-Hant/channels/troubleshooting)。
- 模型供應商另有說明文件；請參閱 [Model Providers](/zh-Hant/providers/models)。
