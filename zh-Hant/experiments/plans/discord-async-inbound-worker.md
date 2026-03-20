---
summary: "Status and next steps for decoupling Discord gateway listeners from long-running agent turns with a Discord-specific inbound worker"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Discord Async Inbound Worker Plan"
---

# Discord Async Inbound Worker Plan

## Objective

Remove Discord listener timeout as a user-facing failure mode by making inbound Discord turns asynchronous:

1. Gateway listener accepts and normalizes inbound events quickly.
2. A Discord run queue stores serialized jobs keyed by the same ordering boundary we use today.
3. A worker executes the actual agent turn outside the Carbon listener lifetime.
4. Replies are delivered back to the originating channel or thread after the run completes.

This is the long-term fix for queued Discord runs timing out at `channels.discord.eventQueue.listenerTimeout` while the agent run itself is still making progress.

## Current status

This plan is partially implemented.

Already done:

- Discord listener timeout and Discord run timeout are now separate settings.
- Accepted inbound Discord turns are enqueued into `src/discord/monitor/inbound-worker.ts`.
- The worker now owns the long-running turn instead of the Carbon listener.
- Existing per-route ordering is preserved by queue key.
- Timeout regression coverage exists for the Discord worker path.

What this means in plain language:

- the production timeout bug is fixed
- the long-running turn no longer dies just because the Discord listener budget expires
- the worker architecture is not finished yet

What is still missing:

- `DiscordInboundJob` is still only partially normalized and still carries live runtime references
- command semantics (`stop`, `new`, `reset`, future session controls) are not yet fully worker-native
- worker observability and operator status are still minimal
- there is still no restart durability

## Why this exists

Current behavior ties the full agent turn to the listener lifetime:

- `src/discord/monitor/listeners.ts` applies the timeout and abort boundary.
- `src/discord/monitor/message-handler.ts` keeps the queued run inside that boundary.
- `src/discord/monitor/message-handler.process.ts` 執行媒體載入、路由、分派、輸入中、草稿串流，以及最終回覆的線上交付。

該架構有兩個不良的屬性：

- 漫長但正常的運作可能會被監聽器看門狗中止
- 即使下游執行時本來會產生回覆，使用者也可能看不到任何回覆

增加逾時時間有幫助，但並未改變失敗模式。

## 非目標

- 在此階段不要重新設計非 Discord 頻道。
- 在首次實作中，不要將此範圍擴大為通用的全頻道 Worker 框架。
- 暫時不要提取跨頻道的共享輸入 Worker 抽象；僅在重複顯而易見時共享低階原語。
- 在首次實作中，除非需要安全落地，否則不要增加持久的崩潰恢復功能。
- 在此計畫中，不要變更路由選擇、繫結語意或 ACP 原則。

## 目前的限制

目前的 Discord 處理路徑仍然依賴一些不應保留在長期工作承載中的即時執行時物件：

- Carbon `Client`
- 原始 Discord 事件形狀
- 記憶體內的公會歷史記錄映射
- 執行緒繫結管理器回呼
- 即時輸入中和草稿串流狀態

我們已經將執行移至 Worker 佇列，但標準化邊界仍然不完整。目前 Worker 是「稍後在相同的程序中，使用部分相同的即時物件執行」，而非完全僅含資料的工作邊界。

## 目標架構

### 1. 監聽器階段

`DiscordMessageListener` 仍然是入口點，但其工作變為：

- 執行飛行前檢查和原則檢查
- 將接受的輸入標準化為可序列化的 `DiscordInboundJob`
- 將工作加入每個工作階段或每個頻道的非同步佇列中
- 一旦加入佇列成功，立即返回 Carbon

監聽器不應再擁有端對端 LLM 運作生命週期。

### 2. 標準化的工作承載

引入一個可序列化的工作描述符，其中僅包含稍後執行運作所需的資料。

最小形狀：

- 路由身分
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- 傳送身分
  - 目的地頻道 ID
  - 回覆目標訊息 ID
  - 執行緒 ID（如果存在）
- 傳送者身分
  - 傳送者 ID、標籤、使用者名稱、標籤
- 頻道內容
  - 公會 ID
  - 頻道名稱或代碼
  - 執行緒元資料
  - 已解析的系統提示詞覆寫
- 標準化訊息主體
  - 基礎文字
  - 有效訊息文字
  - 附件描述符或已解析的媒體參考
- 閘道決策
  - 提及要求結果
  - 指令授權結果
  - 適用時的綁定階段或代理程式元資料

工作承載不得包含即時 Carbon 物件或可變閉包。

目前實作狀態：

- 部分完成
- `src/discord/monitor/inbound-job.ts` 已存在並定義了 Worker 移交
- 承載仍然包含即時 Discord 執行階段上下文，應該進一步精簡

### 3. Worker 階段

新增一個特定於 Discord 的 Worker 執行器，負責：

- 從 `DiscordInboundJob` 重建回合上下文
- 載入執行所需的媒體及任何額外頻道元資料
- 分派代理程式回合
- 傳送最終回覆承載
- 更新狀態與診斷資訊

建議位置：

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. 排序模型

對於給定的路由邊界，排序必須保持與目前相當。

建議金鑰：

- 使用與 `resolveDiscordRunQueueKey(...)` 相同的佇列金鑰邏輯

這保留了現有行為：

- 一個綁定的代理程式對話不會與其自身交錯執行
- 不同的 Discord 頻道仍可獨立進行

### 5. 逾時模型

切換後，會有兩個獨立的逾時類別：

- 監聽器逾時
  - 僅涵蓋標準化與加入佇列
  - 應該很短
- 執行逾時
  - 選用、Worker 擁有、明確且使用者可見
  - 不應意外繼承自 Carbon 監聽器設定

這移除了目前「Discord 閘道監聽器保持運作」與「代理程式執行健康」之間的意外耦合。

## 建議實作階段

### 階段 1：標準化邊界

- 狀態：部分實作
- 已完成：
  - 已提取 `buildDiscordInboundJob(...)`
  - 新增 Worker 移交測試
- 待辦事項：
  - 讓 `DiscordInboundJob` 僅包含純資料
  - 將即時執行階段相依性移至 Worker 擁有的服務，而非每個工作的承載
  - 停止將即時監聽器參考縫合回工作中來重建程序上下文

### 階段 2：記憶體內 Worker 佇列

- 狀態：已實作
- 已完成：
  - 已新增 `DiscordInboundWorkerQueue` 以已解析的執行佇列金鑰進行鍵結
  - 監聽器將工作加入佇列，而不是直接等待 `processDiscordMessage(...)`
  - worker 在程序內執行工作，僅存在於記憶體中

這是第一次功能切換。

### 階段 3：程序分離

- 狀態：尚未開始
- 將傳遞、輸入中以及草稿串流的所有權移至 worker 面向的配接器後方。
- 以 worker 上下文重建取代直接使用即時預檢上下文。
- 如有需要，暫時將 `processDiscordMessage(...)` 保持為外觀，然後將其拆分。

### 階段 4：指令語義

- 狀態：尚未開始
  確保當工作進入佇列時，原生 Discord 指令仍能正確運作：

- `stop`
- `new`
- `reset`
- 任何未來的會話控制指令

Worker 佇列必須暴露足夠的執行狀態，以便指令鎖定作用中或已佇列的輪次。

### 階段 5：可觀測性與操作員體驗

- 狀態：尚未開始
- 將佇列深度和作用中 worker 數量輸出至監控狀態
- 記錄入佇列時間、開始時間、完成時間，以及逾時或取消原因
- 在日誌中清楚顯示 worker 擁有的逾時或傳遞失敗

### 階段 6：選用的持久性後續工作

- 狀態：尚未開始
  僅在記憶體內版本穩定後：

- 決定已佇列的 Discord 工作是否應在網關重新啟動後繼續存在
- 如果是，請保存工作描述元和傳遞檢查點
- 如果否，請記錄明確的記憶體內邊界

這應該是一個單獨的後續工作，除非需要重新啟動恢復才能合併。

## 檔案影響

目前的主要檔案：

- `src/discord/monitor/listeners.ts`
- `src/discord/monitor/message-handler.ts`
- `src/discord/monitor/message-handler.preflight.ts`
- `src/discord/monitor/message-handler.process.ts`
- `src/discord/monitor/status.ts`

目前的 worker 檔案：

- `src/discord/monitor/inbound-job.ts`
- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.test.ts`
- `src/discord/monitor/message-handler.queue.test.ts`

可能接下來的接觸點：

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## 下一步

下一步是讓 worker 邊界成為真實而非部分的邊界。

接下來執行此操作：

1. 將即時執行時期相依性移出 `DiscordInboundJob`
2. 將這些相依性保留在 Discord worker 執行個體上
3. 將佇列中的工作簡化為純 Discord 特定資料：
   - 路由身分
   - 傳遞目標
   - 傳送者資訊
   - 正規化訊息快照
   - 閘道與綁定決策
4. 在 Worker 內部從該純資料重建 Worker 執行環境

實務上，這意味著：

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- 其他可變的僅限執行時期的處理程式

應停止存在於每個佇列工作中，改為存在於 Worker 本身或 Worker 擁有的介接器後方。

在該項目完成後，下一個後續步驟應該是針對 `stop`、`new` 和 `reset` 進行指令狀態清理。

## 測試計畫

將現有的 timeout 重現測試覆蓋率保留於：

- `src/discord/monitor/message-handler.queue.test.ts`

針對以下項目新增測試：

1. listener 在加入佇列後立即返回，不等待完整的輪次
2. 各路由的排序順序得以保留
3. 不同的頻道仍並行執行
4. 回覆會傳送到原始訊息的目的地
5. `stop` 會取消由 Worker 擁有的作用中執行
6. Worker 失敗會產生可見的診斷資訊，而不會阻塞後續的工作
7. 綁定 ACP 的 Discord 頻道在 Worker 執行下仍能正確路由

## 風險與緩解措施

- 風險：指令語意偏離目前的同步行為
  緩解措施：在相同的切換階段導入指令狀態管線，而非延後

- 風險：回覆傳遞遺失執行緒或回覆目標脈絡
  緩解措施：讓傳遞身分在 `DiscordInboundJob` 中成為一等的公民

- 風險：重試或佇列重新啟動期間發生重複傳送
  緩解措施：讓第一次傳遞僅保留在記憶體中，或在持久化之前新增明確的傳遞等冪性

- 風險：遷移期間 `message-handler.process.ts` 變得更難推斷
  緩解措施：在 Worker 切換之前或期間，將其拆分為正規化、執行和傳遞輔助程式

## 驗收標準

計畫在以下情況完成時：

1. Discord listener timeout 不再中止健康的長時間執行輪次。
2. Listener 生命週期和 agent-turn 生命週期在程式碼中是分開的概念。
3. 現有的各工作階段排序順序得以保留。
4. 綁定 ACP 的 Discord 頻道透過相同的 Worker 路徑運作。
5. `stop` 以工作者擁有的執行為目標，而不是舊的監聽器擁有的呼叫堆疊。
6. 逾時和傳遞失敗會變成明確的工作者結果，而不是靜默的監聽器丟棄。

## 剩餘的落地策略

在後續的 PR 中完成這項工作：

1. 將 `DiscordInboundJob` 設為純資料並將即時執行時期參照移至工作者
2. 清理 `stop`、`new` 和 `reset` 的指令狀態擁有權
3. 新增工作者可觀測性和操作員狀態
4. 決定是否需要持久性，或是明確記錄記憶體內的邊界

如果僅限於 Discord 且我們繼續避免過早的跨通道工作者抽象，這仍然是一個範圍有限後續工作。

import en from "/components/footer/en.mdx";

<en />
