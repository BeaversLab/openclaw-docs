---
summary: "Telegram Bot API integration via grammY with setup notes"
read_when:
  - Working on Telegram or grammY pathways
title: grammY
---

# grammY 整合 (Telegram Bot API)

# 為什麼選擇 grammY

- TypeScript 優先的 Bot API 客戶端，內建長輪詢與 Webhook 輔助功能、中介軟體、錯誤處理、速率限制器。
- 比手動處理 fetch + FormData 更乾淨的媒體輔助函式；支援所有 Bot API 方法。
- 可擴充：透過自訂 fetch 支援代理、Session 中介軟體（選用）、型別安全的 Context。

# 我們發布了什麼

- **單一客戶端路徑：** 移除基於 fetch 的實作；grammY 現在是唯一的 Telegram 客戶端（發送 + 閘道），並預設啟用 grammY 節流器。
- **Gateway:** `monitorTelegramProvider` builds a grammY `Bot`, wires mention/allowlist gating, media download via `getFile`/`download`, and delivers replies with `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument`. Supports long-poll or webhook via `webhookCallback`.
- **Proxy:** optional `channels.telegram.proxy` uses `undici.ProxyAgent` through grammY’s `client.baseFetch`.
- **Webhook support:** `webhook-set.ts` wraps `setWebhook/deleteWebhook`; `webhook.ts` hosts the callback with health + graceful shutdown. Gateway enables webhook mode when `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret` are set (otherwise it long-polls).
- **Sessions:** direct chats collapse into the agent main session (`agent:<agentId>:<mainKey>`); groups use `agent:<agentId>:telegram:group:<chatId>`; replies route back to the same channel.
- **Config knobs:** `channels.telegram.botToken`, `channels.telegram.dmPolicy`, `channels.telegram.groups` (allowlist + mention defaults), `channels.telegram.allowFrom`, `channels.telegram.groupAllowFrom`, `channels.telegram.groupPolicy`, `channels.telegram.mediaMaxMb`, `channels.telegram.linkPreview`, `channels.telegram.proxy`, `channels.telegram.webhookSecret`, `channels.telegram.webhookUrl`.
- **Draft streaming:** optional `channels.telegram.streamMode` uses `sendMessageDraft` in private topic chats (Bot API 9.3+). This is separate from channel block streaming.
- **測試：** grammy mocks 涵蓋了 DM + 群組提及閘門以及出站發送；歡迎提供更多媒體/webhook 固件。

未解決的問題

- 如果遇到 Bot API 429 錯誤，可選的 grammY 插件。
- 新增更多結構化的媒體測試（貼圖、語音訊息）。
- 讓 webhook 監聽連接埠可設置（目前固定為 8787，除非透過 gateway 連接）。

import en from "/components/footer/en.mdx";

<en />
