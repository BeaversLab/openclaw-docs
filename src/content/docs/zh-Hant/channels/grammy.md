---
summary: "透過 grammY 整合 Telegram Bot API 並附上設定說明"
read_when:
  - Working on Telegram or grammY pathways
title: grammY
---

# grammY 整合 (Telegram Bot API)

# 為什麼選擇 grammY

- 以 TypeScript 為優先的 Bot API 客戶端，內建長輪詢 + Webhook 輔助函式、中介軟體、錯誤處理、速率限制器。
- 比手動處理 fetch + FormData 更簡潔的媒體輔助函式；支援所有 Bot API 方法。
- 可擴充：透過自訂 fetch 支援 Proxy、Session 中介軟體（選用）、型別安全的 Context。

# 我們發布的內容

- **單一客戶端路徑：** 移除基於 fetch 的實作；grammY 現在是唯一的 Telegram 客戶端（發送 + 閘道），並預設啟用 grammY 節流器。
- **Gateway:** `monitorTelegramProvider` 建立一個 grammY `Bot`，連接提及/許可清單閘門、透過 `getFile`/`download` 下載媒體，並使用 `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument` 傳遞回覆。透過 `webhookCallback` 支援長輪詢或 webhook。
- **Proxy:** 選用的 `channels.telegram.proxy` 透過 grammY 的 `client.baseFetch` 使用 `undici.ProxyAgent`。
- **Webhook support:** `webhook-set.ts` 封裝 `setWebhook/deleteWebhook`；`webhook.ts` 託管回調並具備健康檢查與優雅關機功能。當設定了 `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret` 時，Gateway 會啟用 webhook 模式（否則會進行長輪詢）。
- **會話：** 直接對話會合併至代理的主要會話 (`agent:<agentId>:<mainKey>`)；群組使用 `agent:<agentId>:telegram:group:<chatId>`；回覆會路由回同一頻道。
- **設定選項：** `channels.telegram.botToken`、`channels.telegram.dmPolicy`、`channels.telegram.groups` (allowlist + mention 預設值)、`channels.telegram.allowFrom`、`channels.telegram.groupAllowFrom`、`channels.telegram.groupPolicy`、`channels.telegram.mediaMaxMb`、`channels.telegram.linkPreview`、`channels.telegram.proxy`、`channels.telegram.webhookSecret`、`channels.telegram.webhookUrl`。
- **草稿串流：** 可選的 `channels.telegram.streamMode` 在私人主題對話中使用 `sendMessageDraft` (Bot API 9.3+)。這與頻道區塊串流是分開的。
- **測試：** grammy 模擬涵蓋了 DM + 群組提及閘門和出站發送；更多媒體/webhook 固定裝置仍然歡迎。

未解決的問題

- 可選的 grammY 外掛 (throttler)，如果我們遇到 Bot API 429 錯誤。
- 增加更多結構化媒體測試（貼圖、語音訊息）。
- 讓 webhook 監聽埠可設置（目前固定為 8787，除非透過網關連線）。
