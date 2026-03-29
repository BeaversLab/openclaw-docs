---
summary: "透過 grammY 整合 Telegram Bot API，附設定說明"
read_when:
  - Working on Telegram or grammY pathways
title: grammY
---

# grammY 整合 (Telegram Bot API)

# 為何選擇 grammY

- 以 TypeScript 為優先的 Bot API 客戶端，內建長輪詢 + Webhook 輔助程式、中介軟體、錯誤處理、速率限制器。
- 比手動處理 fetch + FormData 更簡潔的媒體輔助程式；支援所有 Bot API 方法。
- 可擴充：透過自訂 fetch 支援 Proxy、會話中介軟體 (選用)、型別安全的 context。

# 我們發布的內容

- **單一客戶端路徑：** 已移除基於 fetch 的實作；grammY 現在是唯一的 Telegram 客戶端 (發送 + 閘道)，並預設啟用 grammY 節流器。
- **閘道：** `monitorTelegramProvider` 建構 grammY `Bot`，連接提及/允許清單閘門、透過 `getFile`/`download` 下載媒體，並使用 `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument` 傳送回覆。透過 `webhookCallback` 支援長輪詢或 Webhook。
- **Proxy：** 選用的 `channels.telegram.proxy` 透過 grammY 的 `client.baseFetch` 使用 `undici.ProxyAgent`。
- **Webhook 支援：** `webhook-set.ts` 封裝 `setWebhook/deleteWebhook`；`webhook.ts` 託管具有健康檢查與優雅關機功能的回調。當設定 `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret` 時，閘道會啟用 Webhook 模式 (否則會進行長輪詢)。
- **會話：** 私人聊天會合併至 Agent 主會話 (`agent:<agentId>:<mainKey>`)；群組使用 `agent:<agentId>:telegram:group:<chatId>`；回覆會路由回同一個頻道。
- **設定選項：** `channels.telegram.botToken`、`channels.telegram.dmPolicy`、`channels.telegram.groups` (允許清單 + 提及的預設值)、`channels.telegram.allowFrom`、`channels.telegram.groupAllowFrom`、`channels.telegram.groupPolicy`、`channels.telegram.mediaMaxMb`、`channels.telegram.linkPreview`、`channels.telegram.proxy`、`channels.telegram.webhookSecret`、`channels.telegram.webhookUrl`。
- **草稿串流：** 選用的 `channels.telegram.streamMode` 在私人主題聊天中使用 `sendMessageDraft` (Bot API 9.3+)。這與頻道區塊串流是分開的。
- **測試：** grammy mocks 涵蓋了 DM + 群組提及閘門和 outbound send；仍歡迎更多 media/webhook fixtures。

待解決的問題

- 若遇到 Bot API 429s，可選用 grammY 外掛程式（throttler）。
- 新增更多結構化的媒體測試（貼圖、語音訊息）。
- 讓 webhook 監聽連接埠可設定（目前固定為 8787，除非透過 gateway 連接）。
