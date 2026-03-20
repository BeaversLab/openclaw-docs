---
summary: "OpenClaw 可連接的訊息平台"
read_when:
  - 您想為 OpenClaw 選擇一個聊天頻道
  - 您需要快速了解支援的訊息平台
title: "聊天頻道"
---

# 聊天頻道

OpenClaw 可以在您已經使用的任何聊天應用程式上與您對話。每個頻道都透過閘道器連線。
到處都支援文字；媒體和反應則因頻道而異。

## 支援的頻道

- [BlueBubbles](/zh-Hant/channels/bluebubbles) — **建議用於 iMessage**；使用 BlueBubbles macOS 伺服器 REST API，具有完整功能支援（編輯、取消傳送、特效、反應、群組管理 — 編輯功能在 macOS 26 Tahoe 上目前損壞）。
- [Discord](/zh-Hant/channels/discord) — Discord Bot API + Gateway；支援伺服器、頻道和私訊。
- [Feishu](/zh-Hant/channels/feishu) — 透過 WebSocket 的 Feishu/Lark 機器人（外掛，單獨安裝）。
- [Google Chat](/zh-Hant/channels/googlechat) — 透過 HTTP webhook 的 Google Chat API 應用程式。
- [iMessage (legacy)](/zh-Hant/channels/imessage) — 透過 imsg CLI 的舊版 macOS 整合（已棄用，新設置請使用 BlueBubbles）。
- [IRC](/zh-Hant/channels/irc) — 經典 IRC 伺服器；具備配對/允許清單控制的頻道 + 私訊。
- [LINE](/zh-Hant/channels/line) — LINE Messaging API 機器人（外掛，單獨安裝）。
- [Matrix](/zh-Hant/channels/matrix) — Matrix 通訊協定（外掛，單獨安裝）。
- [Mattermost](/zh-Hant/channels/mattermost) — Bot API + WebSocket；頻道、群組、私訊（外掛，單獨安裝）。
- [Microsoft Teams](/zh-Hant/channels/msteams) — Bot Framework；企業支援（外掛，單獨安裝）。
- [Nextcloud Talk](/zh-Hant/channels/nextcloud-talk) — 透過 Nextcloud Talk 的自託管聊天（外掛，單獨安裝）。
- [Nostr](/zh-Hant/channels/nostr) — 透過 NIP-04 的去中心化私訊（外掛，單獨安裝）。
- [Signal](/zh-Hant/channels/signal) — signal-cli；注重隱私。
- [Synology Chat](/zh-Hant/channels/synology-chat) — 透過 outgoing+incoming webhooks 的 Synology NAS Chat（外掛，單獨安裝）。
- [Slack](/zh-Hant/channels/slack) — Bolt SDK；工作區應用程式。
- [Telegram](/zh-Hant/channels/telegram) — 透過 grammY 的 Bot API；支援群組。
- [Tlon](/zh-Hant/channels/tlon) — Urbit-based messenger (plugin, installed separately).
- [Twitch](/zh-Hant/channels/twitch) — Twitch chat via IRC connection (plugin, installed separately).
- [WebChat](/zh-Hant/web/webchat) — Gateway WebChat UI over WebSocket.
- [WhatsApp](/zh-Hant/channels/whatsapp) — Most popular; uses Baileys and requires QR pairing.
- [Zalo](/zh-Hant/channels/zalo) — Zalo Bot API; Vietnam's popular messenger (plugin, installed separately).
- [Zalo Personal](/zh-Hant/channels/zalouser) — Zalo personal account via QR login (plugin, installed separately).

## 備註

- 頻道可以同時運行；配置多個頻道後，OpenClaw 將根據聊天進行路由。
- 最快的設置通常是 **Telegram**（簡單的機器人令牌）。WhatsApp 需要 QR 配對並且在磁盤上存儲更多狀態。
- 群組行為因頻道而異；請參見 [Groups](/zh-Hant/channels/groups)。
- DM 配對和允許列表出於安全原因被強制執行；請參見 [Security](/zh-Hant/gateway/security)。
- 故障排除：[Channel troubleshooting](/zh-Hant/channels/troubleshooting)。
- 模型提供商另有文檔說明；請參見 [Model Providers](/zh-Hant/providers/models)。

import en from "/components/footer/en.mdx";

<en />
