---
summary: "透過 grammY 整合 Telegram Bot API 並附上設定說明"
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
- **閘道：** `monitorTelegramProvider` 建構一個 grammY `Bot`，串接提及/白名單閘門、透過 `getFile`/`download` 下載媒體，並使用 `sendMessage/sendPhoto/sendVideo/sendAudio/sendDocument` 傳遞回覆。透過 `webhookCallback` 支援長輪詢或 Webhook。
- **代理：** 選用的 `channels.telegram.proxy` 透過 grammY 的 `client.baseFetch` 使用 `undici.ProxyAgent`。
- **Webhook 支援：** `webhook-set.ts` 封裝 `setWebhook/deleteWebhook`；`webhook.ts` 託管回呼並提供健康檢查與優雅關機。當設定 `channels.telegram.webhookUrl` + `channels.telegram.webhookSecret` 時，閘道會啟用 Webhook 模式（否則會使用長輪詢）。
- **Sessions：** 直接聊天會合併至代理主 Session (`agent:<agentId>:<mainKey>`)；群組使用 `agent:<agentId>:telegram:group:<chatId>`；回覆會路由回同一個頻道。
- **Config knobs：** `channels.telegram.botToken`、`channels.telegram.dmPolicy`、`channels.telegram.groups` (allowlist + mention defaults)、`channels.telegram.allowFrom`、`channels.telegram.groupAllowFrom`、`channels.telegram.groupPolicy`、`channels.telegram.mediaMaxMb`、`channels.telegram.linkPreview`、`channels.telegram.proxy`、`channels.telegram.webhookSecret`、`channels.telegram.webhookUrl`。
- **草稿串流：** 選用的 `channels.telegram.streamMode` 在私人主題聊天中使用 `sendMessageDraft` (Bot API 9.3+)。這與頻道區塊串流是分開的。
- **測試：** grammy mocks 涵蓋了 DM + 群組提及閘門以及出站發送；歡迎提供更多媒體/webhook 固件。

未解決的問題

- 如果遇到 Bot API 429 錯誤，可選的 grammY 插件。
- 新增更多結構化的媒體測試（貼圖、語音訊息）。
- 讓 webhook 監聽連接埠可設置（目前固定為 8787，除非透過 gateway 連接）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
