---
summary: "使用 Discord 專屬輸入 Worker 將 Discord 閘道監聽器與長時間執行的 Agent 週期解耦的狀態與後續步驟"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Discord 非同步輸入 Worker 計畫"
---

# Discord 非同步輸入 Worker 計畫

## 目標

透過讓輸入的 Discord 週期變為非同步，來消除 Discord 監聽器逾時這種使用者面臨的失敗模式：

1. 閘道監聽器快速接受並正規化輸入事件。
2. Discord 執行佇列會儲存序列化的任務，並以我們目前使用的相同排序邊界作為鍵值。
3. Worker 會在 Carbon 監聽器生命週期之外執行實際的 Agent 週期。
4. 執行完成後，回覆會傳送回原始頻道或執行緒。

這是當 Agent 本身仍在持續進行時，排除的 Discord 執行在 `channels.discord.eventQueue.listenerTimeout` 逾時的長期解決方案。

## 目前狀態

此計畫已部分實作。

已完成項目：

- Discord 監聽器逾時和 Discord 執行逾時現在是分開的設定。
- 接受的輸入 Discord 週期會加入佇列至 `src/discord/monitor/inbound-worker.ts`。
- Worker 現在擁有長時間執行的週期，而不是 Carbon 監聽器。
- 現有的每個路由排序透過佇列鍵值保留。
- Discord Worker 路徑存在逾時回歸測試覆蓋。

用白話解釋這代表什麼：

- 生產環境的逾時 Bug 已修正
- 長時間執行的週期不會僅因 Discord 監聽器預算耗盡而終止
- Worker 架構尚未完成

尚缺少的部分：

- `DiscordInboundJob` 仍僅部分正規化，且仍包含實際執行時期參考
- 指令語意 (`stop`, `new`, `reset`, 未來的工作階段控制) 尚未完全 Worker 原生化
- Worker 可觀測性和操作員狀態仍然極少
- 仍然沒有重新啟動的持久性

## 為何存在此計畫

目前的行為將完整的 Agent 週期與監聽器生命週期綁定：

- `src/discord/monitor/listeners.ts` 套用逾時和中止邊界。
- `src/discord/monitor/message-handler.ts` 將佇列中的執行保留在該邊界內。
- `src/discord/monitor/message-handler.process.ts` 以同步方式執行媒體載入、路由、分派、輸入、草稿串流以及最終回覆傳遞。

該架構有兩個缺點：

- 冗長但正常的執行可能會被監聽器看門狗中止
- 即使下游執行時會產生回覆，使用者也可能看不到任何回覆

提高逾時時間雖有幫助，但並未改變失敗模式。

## 非目標

- 此階段不重新設計 Discord 以外的通道。
- 在初步實作中，不要將此範圍擴大為通用的全通道 Worker 框架。
- 目前尚不提取共享的跨通道輸入 Worker 抽象；僅在重複情況明顯時共享低級基本元件。
- 在第一輪中，除非安全落地所需，否則不加入持久性當機恢復功能。
- 在此計畫中，不要更改路由選擇、綁定語意或 ACP 原則。

## 目前的限制

目前的 Discord 處理路徑仍依賴部分即時執行時物件，這些物件不應保留在長期任務承載中：

- Carbon `Client`
- 原始 Discord 事件結構
- 記憶體內的公會歷程對應
- 執行緒綁定管理器回呼
- 即時輸入與草稿串流狀態

我們已將執行移至 Worker 佇列，但正規化邊界仍未完成。目前 Worker 是「稍後在同一程序中搭配部分相同的即時物件執行」，而非完全僅限資料的任務邊界。

## 目標架構

### 1. 監聽器階段

`DiscordMessageListener` 仍是入口點，但其職務變為：

- 執行飛行前檢查與原則檢查
- 將接受的輸入正規化為可序列化的 `DiscordInboundJob`
- 將任務加入每個工作階段或每個通道的非同步佇列
- 加入佇列成功後立即返回 Carbon

監聽器不應再擁有端對端 LLM 執行生命週期。

### 2. 正規化任務承載

引進一個僅包含稍後執行該執行所需資料的可序列化任務描述元。

最低結構：

- 路由身分
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- 傳遞身分
  - 目的地通道 ID
  - 回覆目標訊息 ID
  - 執行緒 ID（如果存在）
- 傳送者身分
  - 傳送者 ID、標籤、使用者名稱、標籤
- 頻道上下文
  - 伺服器 ID
  - 頻道名稱或 slug
  - 執行緒元資料
  - 已解析的系統提示詞覆寫
- 標準化訊息主體
  - 基礎文字
  - 有效訊息文字
  - 附件描述符或已解析的媒體參考
- 閘道決策
  - 提及要求結果
  - 指令授權結果
  - 綁定的會話或代理程式元資料（如果適用）

工作負載不得包含即時 Carbon 物件或可變閉包。

目前實作狀態：

- 部分完成
- `src/discord/monitor/inbound-job.ts` 存在並定義了工作傳接
- 負載仍包含即時 Discord 執行時上下文，應進一步精簡

### 3. Worker 階段

新增特定於 Discord 的 worker 執行器，負責：

- 從 `DiscordInboundJob` 重建輪次上下文
- 載入執行所需的媒體及任何額外的頻道元資料
- 分派代理程式輪次
- 傳遞最終回覆負載
- 更新狀態與診斷

建議位置：

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. 排序模型

對於給定的路由邊界，排序必須保持與現在等效。

建議索引鍵：

- 使用與 `resolveDiscordRunQueueKey(...)` 相同的佇列索引鍵邏輯

這保留了現有行為：

- 一個綁定的代理程式對話不會與自身交錯
- 不同的 Discord 頻道仍可獨立進行

### 5. 逾時模型

切換後，會有兩個獨立的逾時類別：

- 監聽器逾時
  - 僅涵蓋標準化與入列
  - 應為較短時間
- 執行逾時
  - 選用、Worker 擁有、明確，且對使用者可見
  - 不應意外繼承自 Carbon 監聽器設定

這消除了目前「Discord 閘道監聽器保持運作」與「代理程式執行健康」之間的意外耦合。

## 建議實作階段

### 階段 1：標準化邊界

- 狀態：部分實作
- 已完成：
  - 已提取 `buildDiscordInboundJob(...)`
  - 已新增 worker 傳接測試
- 待辦事項：
  - 將 `DiscordInboundJob` 改為僅包含純資料
  - 將即時執行時相依性移至 worker 擁有的服務，而非每個工作的負載
  - 停止透過將即時監聽器參考縫合回工作中來重建程序上下文

### 第 2 階段：記憶體內部工作佇列

- 狀態：已實作
- 完成事項：
  - 新增 `DiscordInboundWorkerQueue`，並以解析後的執行佇列鍵作為索引
  - 監聽器將工作加入佇列，而不是直接等待 `processDiscordMessage(...)`
  - Worker 在程序內僅於記憶體中執行工作

這是首次功能切換。

### 第 3 階段：程序拆分

- 狀態：未開始
- 將傳遞、輸入和草稿串流的處理權移至面向 worker 的介面卡後方。
- 以 worker 上下文重建取代直接使用即時預檢上下文。
- 如有需要，暫時將 `processDiscordMessage(...)` 保留為外觀，然後再進行拆分。

### 第 4 階段：指令語義

- 狀態：未開始
  確保原生 Discord 指令在工作加入佇列時仍能正確運作：

- `stop`
- `new`
- `reset`
- 任何未來的會話控制指令

Worker 佇列必須公開足夠的執行狀態，讓指令能夠鎖定作用中或已排隊的輪次。

### 第 5 階段：可觀測性與操作者體驗

- 狀態：未開始
- 將佇列深度和作用中 worker 數量輸出至監控狀態
- 記錄加入佇列時間、開始時間、結束時間，以及逾時或取消原因
- 在日誌中清楚呈現 worker 擁有的逾時或傳遞失敗

### 第 6 階段：選用的持久性後續追蹤

- 狀態：未開始
  僅在記憶體內版本穩定後：

- 決定已排隊的 Discord 工作是否應在閘道重啟後繼續存在
- 如果是，則保存工作描述項和傳遞檢查點
- 如果否，則記錄明確的記憶體內部邊界

除非需要重啟恢復功能才能落地，否則這應該是一個單獨的後續追蹤。

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

可能的下一步接觸點：

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## 接下來的步驟

下一步是將 worker 邊界變為完整而非部分。

接下來請執行：

1. 將即時運行時依賴項從 `DiscordInboundJob` 中移出
2. 改為將這些依賴項保留在 Discord worker 實例上
3. 將排隊的任務簡化為僅包含 Discord 專用的純數據：
   - 路由身份
   - 傳遞目標
   - 發送者資訊
   - 標準化的訊息快照
   - 閘控和綁定決策
4. 在 worker 內部根據這些純數據重建 worker 執行環境

實際上，這意味著：

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- 以及其他僅運行時的可變控制代碼

應該停止存在於每個排隊的任務上，改為存在於 worker 本身或 worker 擁有的適配器之後。

完成該項工作後，下一個後續步驟應該是針對 `stop`、`new` 和 `reset` 進行 command-state 清理。

## 測試計劃

在以下位置保留現有的逾時重現覆蓋範圍：

- `src/discord/monitor/message-handler.queue.test.ts`

為以下內容新增測試：

1. listener 在入隊後返回，而無需等待完整的輪次
2. 保持了每個路由的順序
3. 不同的頻道仍然並發運行
4. 回覆會傳遞到原始訊息的目的地
5. `stop` 取消當前 worker 擁有的運行
6. worker 失敗會產生可見的診斷資訊，而不會阻塞後續任務
7. 綁定 ACP 的 Discord 頻道在 worker 執行下仍能正確路由

## 風險與緩解措施

- 風險：指令語義偏離當前的同步行為
  緩解措施：在同一個切換中實作 command-state 管道，而不是稍後

- 風險：回覆傳遞丟失了執行緒或回覆至上下文
  緩解措施：將傳遞身份在 `DiscordInboundJob` 中設為一等公民

- 風險：在重試或佇列重啟期間重複發送
  緩解措施：將第一次傳遞僅保留在記憶體中，或在持久化之前新增顯式的傳遞冪等性

- 風險：`message-handler.process.ts` 在遷移期間變得更難以理解
  緩解措施：在 worker 切換之前或期間，將其拆分為標準化、執行和傳遞輔助程式

## 驗收標準

當滿足以下條件時，計劃即為完成：

1. Discord listener 逾時不再中斷健康的長時間運行的輪次。
2. Listener 存活期和 agent-turn 存活期在代碼中是分開的概念。
3. 保留現有的每個會話排序。
4. ACP 綁定的 Discord 頻道透過相同的 worker 路徑運作。
5. `stop` 的目標是 worker 擁有的 run，而不是舊的 listener 擁有的呼叫堆疊。
6. 逾時和傳遞失敗成為明確的 worker 結果，而不是靜默的 listener 丟棄。

## 剩餘的落地方案

在後續的 PR 中完成這項工作：

1. 讓 `DiscordInboundJob` 僅包含純數據，並將實時運行時參照移至 worker
2. 清理 `stop`、`new` 和 `reset` 的指令狀態擁有權
3. 新增 worker 可觀測性和操作員狀態
4. 決定是否需要持久性，或明確記錄記憶體邊界

如果僅限於 Discord 且繼續避免不成熟的跨通道 worker 抽象，這仍然是一個有範圍的後續工作。
