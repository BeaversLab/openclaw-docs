---
summary: "使用 Discord 特定的入站工作器將 Discord 閘道監聽器與長時間執行的代理回合解耦的狀態與後續步驟"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Discord Async Inbound Worker Plan"
---

# Discord Async Inbound Worker Plan

## 目標

透過將入站 Discord 回合設為非同步，消除 Discord 監聽器逾時這種使用者可見的失敗模式：

1. Gateway 監聽器快速接受並正規化入站事件。
2. Discord 執行佇列儲存序列化的工作，並以我們目前使用的相同排序邊界作為鍵值。
3. Worker 會在 Carbon listener 生命週期之外執行實際的 agent 輪次。
4. 執行完成後，回覆會被傳送回原始頻道或討論串。

這是針對排隊中的 Discord 執行在 `channels.discord.eventQueue.listenerTimeout` 超時的長期解決方案，當時 agent 執行本身仍在進行中。

## 目前狀態

此計畫已部分實施。

已完成：

- Discord listener 逾時和 Discord 執行逾時現在是分開的設定。
- 已接受的 Discord 傳入輪次會進入佇列 `src/discord/monitor/inbound-worker.ts`。
- Worker 現在擁有長時間執行的輪次，而不是 Carbon 監聽器。
- 現有的每個路由排序透過佇列金鑰來保留。
- Discord worker 路徑存在超時回歸測試覆蓋。

用白話文來說，這意味著：

- 生產環境的超時錯誤已修復
- 長時間執行的輪次不會再僅因為 Discord 監聽器預算過期而終止
- Worker 架構尚未完成

仍然缺少：

- `DiscordInboundJob` 仍然僅部分標準化，並且仍帶有實時運行時引用
- 指令語意（`stop`、`new`、`reset` 以及未來的 session controls）尚未完全適用於 worker
- worker 的可觀測性和操作員狀態仍然很少
- 仍然沒有重新啟動的持久性

## 為何存在

目前的行為將完整的代理回合與監聽器的生命週期綁定在一起：

- `src/discord/monitor/listeners.ts` 套用逾時和中止邊界。
- `src/discord/monitor/message-handler.ts` 將佇列中的執行保持在該邊界內。
- `src/discord/monitor/message-handler.process.ts` 同步執行媒體載入、路由、分派、輸入中、草稿串流以及最終回覆傳遞。

該架構有兩個不良特性：

- 長時間但正常的回合可能會被監聽器看門狗中止
- 即使下游運行時會產生回覆，使用者也可能看不到任何回應

增加逾時時間有幫助，但並不會改變失敗模式。

## 非目標

- 在此階段不要重新設計 Discord 以外的頻道。
- 在第一次實作中，不要將此範圍擴大為通用的全頻道 Worker 架構。
- 暫時不要提取跨頻道的共用入站工作者抽象；只有當重複顯而易見時，才共用底層基本元件。
- 除非為了安全落地所需，否則不要在第一階段加入持久的崩潰恢復機制。
- 請勿在此計畫中變更路由選擇、綁定語意或 ACP 原則。

## 目前的限制

目前的 Discord 處理路徑仍然依賴一些不應保留在長期工作負載中的即時執行時期物件：

- Carbon `Client`
- 原始 Discord 事件形狀
- 記憶體中的公會歷史映射
- 執行緒繫結管理器回呼
- 即時輸入和草稿串流狀態

我們已經將執行移至工作佇列，但正規化邊界仍然不完整。目前工作器是「稍後在同一程序中與部分相同的即時物件一起執行」，而非完全僅限資料的工作邊界。

## 目標架構

### 1. 監聽器階段

`DiscordMessageListener` 仍然作為入口點，但其職責變為：

- 執行預檢和策略檢查
- 將接受的輸入正規化為可序列化的 `DiscordInboundJob`
- 將工作放入每個會話或每個頻道的非同步佇列中
- 入佇列成功後立即返回給 Carbon

監聽器不應再擁有端到端 LLM 迴圈的生命週期。

### 2. 正規化工作負載

引進一個可序列化的工作描述符，其中僅包含稍後執行回合所需的資料。

最小結構：

- 路由身分
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- 傳遞身分
  - 目標頻道 ID
  - 回覆目標訊息 ID
  - 執行緒 ID（如果存在）
- 發送者身分
  - 發送者 ID、標籤、使用者名稱、標記
- 頻道語境
  - 公會 ID
  - 頻道名稱或 slug
  - 執行緒元數據
  - 已解析的系統提示覆寫
- 標準化訊息內容
  - 基礎文字
  - 有效訊息文字
  - 附件描述符或已解析的媒體參照
- 閘道決策
  - 提及要求結果
  - 指令授權結果
  - 適用時的綁定工作階段或代理程式元數據

工作負載不得包含活躍的 Carbon 物件或可變的閉包。

目前實作狀態：

- 部分完成
- `src/discord/monitor/inbound-job.ts` 已存在並定義了 worker 交接
- payload 仍然包含實時 Discord 運行時上下文，應進一步精簡

### 3. Worker 階段

新增一個 Discord 專屬的 worker runner，負責：

- 從 `DiscordInboundJob` 重建回合上下文
- 載入媒體以及執行所需的其他頻道元數據
- 分發 agent 回合
- 傳遞最終回覆 payload
- 更新狀態與診斷

建議位置：

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. 排序模型

對於給定的路由邊界，排序必須保持與今天等效。

建議的金鑰：

- 使用與 `resolveDiscordRunQueueKey(...)` 相同的佇列金鑰邏輯

這保留了現有行為：

- 一個綁定的代理程式交談不會與其自身交錯
- 不同的 Discord 頻道仍然可以獨立進行

### 5. 逾時模型

切換後，會有兩個獨立的逾時類別：

- 監聽器逾時
  - 僅涵蓋正規化和入隊
  - 應該很短
- 執行逾時
  - 可選、由 Worker 擁有、明確且使用者可見
  - 不應意外繼承自 Carbon 監聽器設定

這移除了目前「Discord gateway 監聽器保持運作」與「Agent 執行健康」之間的意外耦合。

## 建議的實作階段

### 第 1 階段：正規化邊界

- 狀態：部分實作
- 已完成：
  - 已提取 `buildDiscordInboundJob(...)`
  - 新增了 worker 交接測試
- 待辦：
  - 讓 `DiscordInboundJob` 僅包含純資料
  - 將執行時期依賴項移至 worker 擁有的服務，而非每個工作的 payload
  - 停止透過將即時監聽器引用縫合回工作中來重建處理程序上下文

### 第 2 階段：記憶體內 worker 佇列

- 狀態：已實作
- 已完成：
  - 新增以解析後的執行佇列鍵為鍵的 `DiscordInboundWorkerQueue`
  - 監聽器將工作加入佇列，而非直接等待 `processDiscordMessage(...)`
  - 工作程序在程序內執行工作，僅存在於記憶體中

這是首次功能切換。

### 階段 3：程序拆分

- 狀態：尚未開始
- 將遞送、輸入中以及草稿串流的所有權移至工作程序專用的介面卡之後。
- 替換直接使用即時 preflight 上下文的方式，改用 worker 上下文重建。
- 如有需要，暫時保留 `processDiscordMessage(...)` 作為外觀，然後再將其拆分。

### 第 4 階段：指令語意

- 狀態：尚未開始
  確保當工作已排入佇列時，原生 Discord 指令仍能正確運作：

- `stop`
- `new`
- `reset`
- 任何未來的工作階段控制指令

工作佇列必須公開足夠的執行狀態，以便指令能夠以作用中或已排隊的輪次為目標。

### 第 5 階段：可觀測性與操作員體驗

- 狀態：尚未開始
- 將佇列深度和作用中工作程序計數輸出到監控狀態
- 記錄加入佇列時間、開始時間、完成時間，以及逾時或取消原因
- 在日誌中清楚地呈現工作程序擁有的逾時或傳遞失敗

### 第 6 階段：選用的永續性後續工作

- 狀態：尚未開始
  僅在記憶體版本穩定之後：

- 決定排入佇列的 Discord 作業是否應在閘道重啟後繼續存在
- 如果是，請保存作業描述符和傳遞檢查點
- 如果否，請記錄明確的記憶體邊界

這應該是一個單獨的後續跟進，除非需要重啟恢復才能落地。

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

## 下一步現在

下一步是讓 worker 邊界變成真實的，而不是部分的。

接下來執行：

1. 將運行時依賴項移出 `DiscordInboundJob`
2. 將這些依賴項保留在 Discord worker 實例上
3. 將排隊的作業簡化為純 Discord 特定數據：
   - 路由身分
   - 傳遞目標
   - 發送者資訊
   - 標準化訊息快照
   - 閘控和綁定決策
4. 在 Worker 內部從該純資料重建 Worker 執行上下文

實際上，這意味著：

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- 其他可變的僅運行時處理程式

應停止存在於每個排程任務中，而是存在於 Worker 本身或 Worker 擁有的介面卡之後。

在此完成之後，下一步應該是針對 `stop`、`new` 和 `reset` 進行指令狀態清理。

## 測試計畫

保留現有的逾時重現覆蓋範圍於：

- `src/discord/monitor/message-handler.queue.test.ts`

新增以下測試：

1. listener 在入列後返回，不等待完整回合
2. 保留每個路由的順序
3. 不同頻道仍並行執行
4. 回覆會傳送到原始訊息的目的地
5. `stop` 會取消現行 worker 擁有的執行
6. worker 失敗會產生可見的診斷資訊，而不會阻擋後續的工作
7. 連結至 ACP 的 Discord 頻道在 worker 執行下仍可正確路由

## 風險與緩解措施

- 風險：指令語意可能偏離目前的同步行為
  緩解措施：在相同的切換中導入指令狀態連線，而非延後

- 風險：回覆傳遞會遺失執行緒或回覆對象的上下文
  緩解措施：在 `DiscordInboundJob` 中將傳遞身分設為一級物件

- 風險：在重試或佇列重新啟動期間的重複傳送
  緩解措施：僅將第一階段保留在記憶體中，或在持久化之前加入明確的傳遞等冪性

- 風險：在遷移過程中，`message-handler.process.ts` 變得更難以推斷
  緩解措施：在 worker 切換之前或期間，將其拆分為正規化、執行和傳遞輔助程式

## 驗收標準

當滿足以下條件時，計畫即為完成：

1. Discord 監聽器逾時不再中斷正常的長時間執行輪次。
2. 監聽器生命週期和代理輪次生命週期在程式碼中是分開的概念。
3. 保留現有的每個工作階段排序。
4. ACP 綁定的 Discord 頻道透過相同的 worker 路徑運作。
5. `stop` 以 worker 擁有的 run 為目標，而不是舊的 listener 擁有的 call stack。
6. 逾時和傳遞失敗會變成明確的 worker 結果，而不是靜默的 listener 丟棄。

## 剩餘的落地方案

在後續的 PR 中完成這項工作：

1. 將 `DiscordInboundJob` 設為僅包含純資料（plain-data），並將即時 runtime refs 移至 worker
2. 清理 `stop`、`new` 和 `reset` 的指令狀態所有權
3. 新增 Worker 可觀測性與操作員狀態
4. 決定是否需要持久性，或明確記錄記憶體邊界

如果僅保留在 Discord 中，並且我們繼續避免過早的跨通道 Worker 抽象，這仍然是一個範圍有限的後續工作。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
