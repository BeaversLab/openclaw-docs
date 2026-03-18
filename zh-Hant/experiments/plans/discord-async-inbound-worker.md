---
summary: "使用 Discord 專用輸入 Worker 將 Discord 閘道監聽器與長時間執行的 Agent 輪次解耦的狀態與下一步"
owner: "openclaw"
status: "in_progress"
last_updated: "2026-03-05"
title: "Discord Async Inbound Worker Plan"
---

# Discord Async Inbound Worker Plan

## 目標

透過讓輸入 Discord 輪次變成非同步，將 Discord 監聽器逾時移除作為一種使用者面向的失敗模式：

1. 閘道監聽器快速接受並正規化輸入事件。
2. Discord 執行佇列會儲存序列化的作業，並以我們目前使用的相同排序邊界作為鍵值。
3. Worker 會在 Carbon 監聽器生命週期之外執行實際的 Agent 輪次。
4. 執行完成後，回覆會傳送回原始頻道或執行緒。

這是針對排隊中的 Discord 執行在 Agent 本身仍在持續進行時於 `channels.discord.eventQueue.listenerTimeout` 逾時的長期修復方案。

## 目前狀態

此計畫已部分實作。

已完成項目：

- Discord 監聽器逾時和 Discord 執行逾時現在是分開的設定。
- 已接受的輸入 Discord 輪次會加入佇列至 `src/discord/monitor/inbound-worker.ts`。
- Worker 現在擁有長時間執行的輪次，而非 Carbon 監聽器。
- 現有的每個路由排序會透過佇列鍵值來保留。
- Discord Worker 路徑已存在逾時回歸測試覆蓋率。

白話文解釋：

- 生產環境的逾時錯誤已修復
- 長時間執行的輪次不會僅因 Discord 監聽器預算耗盡而終止
- Worker 架構尚未完成

仍缺少的項目：

- `DiscordInboundJob` 仍僅部分正規化，且仍帶有活躍的執行時期參照
- 指令語意 (`stop`、`new`、`reset`、未來的工作階段控制) 尚未完全原生於 Worker
- Worker 可觀測性和操作員狀態仍然極少
- 仍然沒有重新啟動持久性

## 存在原因

目前的行為將完整的 Agent 輪次與監聽器生命週期綁定在一起：

- `src/discord/monitor/listeners.ts` 應用逾時和中止邊界。
- `src/discord/monitor/message-handler.ts` 將佇列中的執行保持在該邊界內。
- `src/discord/monitor/message-handler.process.ts` 以同步方式執行媒體載入、路由、分派、輸入指示、草稿串流以及最終回覆傳遞。

該架構有兩個不良特性：

- 漫長但正常的回合可能會被監聽器看門狗中止
- 即使下游執行時本應產生回覆，使用者也可能看不到任何回覆

增加逾時間隔有所幫助，但並不會改變失敗模式。

## 非目標

- 請勿在此階段重新設計非 Discord 頻道。
- 請勿在初次實作中將此範圍擴大為通用的全頻道 Worker 架構。
- 請勿現在就提取共用的跨頻道入站 Worker 抽象層；僅在重複情況明顯時共用低階原語。
- 除非為了安全落地所需，否則請勿在第一階段加入持久化的當機恢復功能。
- 請勿在此計畫中變更路由選擇、繫結語意或 ACP 原則。

## 目前限制

目前的 Discord 處理路徑仍然依賴一些不應保留在長期工作負載中的即時執行時物件：

- Carbon `Client`
- 原始 Discord 事件結構
- 記憶體中的公會歷程對應
- 執行緒繫結管理器回呼
- 即時輸入指示和草稿串流狀態

我們已將執行移至 Worker 佇列，但正規化邊界仍然不完整。目前的 Worker 是「稍後在同一程序中使用部分相同即時物件執行」，而非完全僅含資料的工作邊界。

## 目標架構

### 1. 監聽器階段

`DiscordMessageListener` 仍為入口點，但其職責變為：

- 執行預檢與原則檢查
- 將接受的輸入正規化為可序列化的 `DiscordInboundJob`
- 將工作加入至每個工作階段或每個頻道的非同步佇列
- 在成功加入佇列後立即返回 Carbon

監聽器不應再擁有端對端 LLM 回合的生命週期。

### 2. 正規化工作負載

引進一個可序列化的工作描述符，其中僅包含稍後執行回合所需的資料。

最小結構：

- 路由身分識別
  - `agentId`
  - `sessionKey`
  - `accountId`
  - `channel`
- 傳遞身分識別
  - 目的地頻道 ID
  - 回覆目標訊息 ID
  - 執行緒 ID（如有）
- 傳送者身分
  - 傳送者 ID、標籤、使用者名稱、標籤（tag）
- 頻道上下文
  - 伺服器 ID
  - 頻道名稱或 slug
  - 執行緒元資料
  - 已解析的系統提示詞覆寫
- 標準化訊息內容
  - 基礎文字
  - 有效訊息文字
  - 附件描述符或已解析的媒體參照
- 閘控決策
  - 提及要求結果
  - 指令授權結果
  - 綁定的會話或代理程式元資料（如適用）

任務負載不得包含即時 Carbon 物件或可變閉包。

目前實作狀態：

- 部分完成
- `src/discord/monitor/inbound-job.ts` 已存在並定義了 Worker 交接
- 負載仍包含即時 Discord 執行時上下文，應進一步精簡

### 3. Worker 階段

新增一個 Discord 專用的 Worker 執行器，負責：

- 從 `DiscordInboundJob` 重建輪次上下文
- 載入執行所需的媒體及任何其他頻道元資料
- 分派代理程式輪次
- 傳遞最終回覆負載
- 更新狀態與診斷資訊

建議位置：

- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.ts`

### 4. 排序模型

對於給定的路由邊界，排序必須保持與目前相同。

建議的鍵：

- 使用與 `resolveDiscordRunQueueKey(...)` 相同的佇列鍵邏輯

這保留了現有行為：

- 單一綁定的代理程式對話不會與其自身交錯
- 不同的 Discord 頻道仍可獨立進行

### 5. 逾時模型

切換後，有兩個獨立的逾時類別：

- 監聽器逾時
  - 僅涵蓋標準化與佇列加入
  - 應該很短
- 執行逾時
  - 選用、Worker 擁有、明確且使用者可見
  - 不應意外繼承自 Carbon 監聽器設定

這消除了目前「Discord 閘道監聽器保持運作」與「代理程式執行健康」之間的意外耦合。

## 建議實作階段

### 階段 1：標準化邊界

- 狀態：部分實作
- 已完成：
  - 已提取 `buildDiscordInboundJob(...)`
  - 已新增 Worker 交接測試
- 待辦：
  - 將 `DiscordInboundJob` 改為純資料
  - 將即時執行時相依性移至 Worker 擁有的服務，而非每個任務的負載
  - 停止將即時監聽器參照縫合回任務來重建程序上下文

### 第 2 階段：記憶體中的工作佇列

- 狀態：已實作
- 完成項目：
  - 新增了以解析後的執行佇列鍵值 為鍵的 `DiscordInboundWorkerQueue`
  - 監聽器將工作加入佇列，而不是直接等待 `processDiscordMessage(...)`
  - 工作程序在程序內且僅在記憶體中執行工作

這是第一次功能性切換。

### 第 3 階段：程序分割

- 狀態：未開始
- 將傳遞、輸入和草稿串流的處理權轉移至工作程序後的介接器後方。
- 以工作程序內容重建取代直接使用即時 preflight 內容。
- 如有需要，暫時將 `processDiscordMessage(...)` 作為外觀層，然後將其拆分。

### 第 4 階段：指令語意

- 狀態：未開始
  確保原生 Discord 指令在佇列處理工作時仍能正確運作：

- `stop`
- `new`
- `reset`
- 任何未來的工作階段控制指令

工作佇列必須暴露足夠的執行狀態，以便指令能鎖定作用中或已排隊的輪次。

### 第 5 階段：可觀測性和操作員體驗

- 狀態：未開始
- 將佇列深度和作用中工作程序計數輸出到監控狀態
- 記錄加入佇列時間、開始時間、完成時間以及逾時或取消原因
- 在日誌中清楚顯示工作程序擁有的逾時或傳遞失敗

### 第 6 階段：選用的持久性後續工作

- 狀態：未開始
  僅在記憶體內版本穩定後：

- 決定已排隊的 Discord 工作是否應在閘道重啟後保留
- 如果是，請保存工作描述元和傳遞檢查點
- 如果否，請記錄明確的記憶體內邊界

除非需要重新啟動恢復才能落地，否則這應該是一個單獨的後續工作。

## 檔案影響

目前的主要檔案：

- `src/discord/monitor/listeners.ts`
- `src/discord/monitor/message-handler.ts`
- `src/discord/monitor/message-handler.preflight.ts`
- `src/discord/monitor/message-handler.process.ts`
- `src/discord/monitor/status.ts`

目前的工作程序檔案：

- `src/discord/monitor/inbound-job.ts`
- `src/discord/monitor/inbound-worker.ts`
- `src/discord/monitor/inbound-job.test.ts`
- `src/discord/monitor/message-handler.queue.test.ts`

可能的下一個觸及點：

- `src/auto-reply/dispatch.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/monitor/thread-bindings.ts`
- `src/discord/monitor/native-command.ts`

## 現在下一步

下一步是讓工作程序邊界變成完整而非部分。

接下來請執行：

1. 將即時執行時期相依性移出 `DiscordInboundJob`
2. 改為將這些相依性保留在 Discord worker 實例上
3. 將佇列中的工作減少為僅包含純 Discord 特定資料：
   - 路由身分識別
   - 傳遞目標
   - 傳送者資訊
   - 正規化的訊息快照
   - 閘道與綁定決策
4. 在 worker 內部從該純資料重建 worker 執行環境

實務上，這意味著：

- `client`
- `threadBindings`
- `guildHistories`
- `discordRestFetch`
- 其他可變動的僅執行時期控制代碼

應停止存在於每個佇列工作中，改為存在於 worker 本身或 worker 所擁有的介接器後方。

完成該項目後，下一個後續工作應是針對 `stop`、`new` 和 `reset` 的指令狀態清理。

## 測試計畫

保留現有的逾時重現覆蓋率於：

- `src/discord/monitor/message-handler.queue.test.ts`

新增測試項目：

1. listener 在加入佇列後返回，不等待完整輪次完成
2. 保留每個路由的排序
3. 不同頻道仍並行執行
4. 回覆會傳送到原始訊息的目的地
5. `stop` 會取消作用中 worker 所擁有的執行
6. worker 失敗會產生可見的診斷資訊，而不會封鎖後續的工作
7. ACP 繫結的 Discord 頻道在 worker 執行下仍正確路由

## 風險與緩解措施

- 風險：指令語意與目前的同步行為產生偏離
  緩解措施：在同一次切換中導入指令狀態管線，而非之後

- 風險：回覆傳遞遺失執行緒或回覆內容
  緩解措施：在 `DiscordInboundJob` 中將傳遞身分識別設為一等公民

- 風險：重試或佇列重新啟動時的重複傳送
  緩解措施：保持第一階段僅在記憶體中，或在持久化之前加入明確的傳遞等冪性

- 風險：在遷移期間，`message-handler.process.ts` 變得更難以理解
  緩解措施：在 worker 切換之前或期間，將其拆分為正規化、執行和傳遞輔助程式

## 驗收標準

當以下情況達成時，計畫即為完成：

1. Discord listener 逾時不再中斷健康的長時間執行輪次。
2. Listener 生命週期與 agent-turn 生命週期在程式碼中是分開的概念。
3. 保留現有的每個工作階段順序。
4. 繫結至 ACP 的 Discord 頻道會透過相同的工作者路徑運作。
5. `stop` 以工作者擁有的執行為目標，而不是舊的監聽器擁有的呼叫堆疊。
6. 逾時和傳遞失敗會變成明確的工作者結果，而不是無聲的監聽器丟棄。

## 剩餘的落地策略

在後續的 PR 中完成此項工作：

1. 將 `DiscordInboundJob` 設為純資料，並將即時執行時期參照移至工作者
2. 清理 `stop`、`new` 和 `reset` 的指令狀態擁有權
3. 新增工作者可觀測性和操作員狀態
4. 決定是否需要持久性，或明確記錄記憶體內部邊界

如果僅保留給 Discord 使用，且我們繼續避免過早的跨通道工作者抽象，這仍然是一個有範圍的後續工作。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
