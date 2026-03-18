---
summary: "OpenClaw 可連接的訊息平台"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "聊天頻道"
---

# 聊天頻道

OpenClaw 可以透過您目前已使用的任何聊天應用程式與您對話。每個頻道都透過 Gateway 連線。
到處都支援文字功能；媒體和反應則因頻道而異。

## 支援的頻道

- [BlueBubbles](/zh-Hant/channels/bluebubbles) — **iMessage 推薦選項**；使用 BlueBubbles macOS 伺服器 REST API，具備完整功能支援 (編輯、取消傳送、特效、反應、群組管理 — 編輯功能在 macOS 26 Tahoe 上目前無法使用)。
- [Discord](/zh-Hant/channels/discord) — Discord Bot API + Gateway；支援伺服器、頻道和私人訊息 (DM)。
- [Feishu](/zh-Hant/channels/feishu) — 透過 WebSocket 的 Feishu/Lark 機器人 (外掛，需單獨安裝)。
- [Google Chat](/zh-Hant/channels/googlechat) — 透過 HTTP webhook 的 Google Chat API 應用程式。
- [iMessage (舊版)](/zh-Hant/channels/imessage) — 透過 imsg CLI 的舊版 macOS 整合 (已棄用，新設定請使用 BlueBubbles)。
- [IRC](/zh-Hant/channels/irc) — 經典 IRC 伺服器；具備配對/允許清單控制的頻道 + 私人訊息 (DM)。
- [LINE](/zh-Hant/channels/line) — LINE Messaging API 機器人 (外掛，需單獨安裝)。
- [Matrix](/zh-Hant/channels/matrix) — Matrix 通訊協定 (外掛，需單獨安裝)。
- [Mattermost](/zh-Hant/channels/mattermost) — Bot API + WebSocket；頻道、群組、私人訊息 (外掛，需單獨安裝)。
- [Microsoft Teams](/zh-Hant/channels/msteams) — Bot Framework；企業支援 (外掛，需單獨安裝)。
- [Nextcloud Talk](/zh-Hant/channels/nextcloud-talk) — 透過 Nextcloud Talk 的自架聊天 (外掛，需單獨安裝)。
- [Nostr](/zh-Hant/channels/nostr) — 透過 NIP-04 的去中心化私人訊息 (外掛，需單獨安裝)。
- [Signal](/zh-Hant/channels/signal) — signal-cli；注重隱私。
- [Synology Chat](/zh-Hant/channels/synology-chat) — 透過傳出與傳入 webhook 的 Synology NAS 聊天 (外掛，需單獨安裝)。
- [Slack](/zh-Hant/channels/slack) — Bolt SDK；工作區應用程式。
- [Telegram](/zh-Hant/channels/telegram) — 透過 grammY 的 Bot API；支援群組。
- [Tlon](/zh-Hant/channels/tlon) — 基於 Urbit 的傳訊應用程式（外掛程式，需單獨安裝）。
- [Twitch](/zh-Hant/channels/twitch) — 透過 IRC 連線的 Twitch 聊天（外掛程式，需單獨安裝）。
- [WebChat](/zh-Hant/web/webchat) — 透過 WebSocket 的 Gateway WebChat UI。
- [WhatsApp](/zh-Hant/channels/whatsapp) — 最受歡迎；使用 Baileys 且需要 QR 配對。
- [Zalo](/zh-Hant/channels/zalo) — Zalo Bot API；越南受歡迎的傳訊應用程式（外掛程式，需單獨安裝）。
- [Zalo Personal](/zh-Hant/channels/zalouser) — 透過 QR 登入的 Zalo 個人帳號（外掛程式，需單獨安裝）。

## 注意事項

- 頻道可以同時執行；設定多個頻道後，OpenClaw 會依聊天進行路由。
- 最快的設定通常是 **Telegram**（簡單的 Bot Token）。WhatsApp 需要 QR 配對並在磁碟上儲存更多狀態。
- 群組行為因頻道而異；請參閱 [群組](/zh-Hant/channels/groups)。
- 出於安全考量，會執行 DM 配對與允許清單；請參閱 [安全性](/zh-Hant/gateway/security)。
- 疑難排解：[頻道疑難排解](/zh-Hant/channels/troubleshooting)。
- 模型供應商另有說明文件；請參閱 [模型供應商](/zh-Hant/providers/models)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
