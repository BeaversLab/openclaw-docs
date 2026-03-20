---
summary: "計畫：使用 CDP 將瀏覽器 act:evaluate 從 Playwright 佇列中隔離，具備端對端截止時間 (deadline) 且 ref 解析更安全"
read_when:
  - 正在處理瀏覽器 `act:evaluate` 逾時、中止或佇列阻塞問題
  - 正在規劃基於 CDP 的執行隔離以進行 evaluate
owner: "openclaw"
status: "draft"
last_updated: "2026-02-10"
title: "Browser Evaluate CDP Refactor"
---

# Browser Evaluate CDP 重構計畫

## 背景

`act:evaluate` 在頁面中執行使用者提供的 JavaScript。目前它透過 Playwright
(`page.evaluate` 或 `locator.evaluate`) 執行。Playwright 會序列化每個頁面的 CDP 指令，因此
卡住或長時間執行的 evaluate 可能會阻塞頁面指令佇列，並導致該分頁上的每個後續操作
看起來像是「卡住」了。

PR #13498 增加了一個實用的安全網 (有界的 evaluate、中止傳播以及盡力而為的
恢復)。本文件描述了一個更大的重構，使 `act:evaluate` 本質上
與 Playwright 隔離，因此卡住的 evaluate 無法卡住正常的 Playwright 操作。

## 目標

- `act:evaluate` 無法永久阻塞同一分頁上後續的瀏覽器操作。
- 逾時 (Timeouts) 是端對端的單一事實來源 (single source of truth)，因此呼叫者可以依賴預算 (budget)。
- 中止 和逾時在 HTTP 和進程內分派 中被同等對待。
- 支援用於 evaluate 的元素目標定位 (element targeting)，而無需將所有內容從 Playwright 切換開來。
- 維持現有呼叫者和負載 的向後相容性。

## 非目標

- 用 CDP 實作取代所有瀏覽器操作 (點擊、輸入、等待等)。
- 移除 PR #13498 中引入的現有安全網 (它仍然是一個有用的後備方案)。
- 引進超出現有 `browser.evaluateEnabled` 閘門 的新不安全功能。
- 為 evaluate 新增程序隔離 (工作程序/執行緒)。如果在此次重構後我們仍然看到難以
  恢復的卡住狀態，那將是後續的想法。

## 目前架構 (為什麼會卡住)

概略來說：

- 呼叫者將 `act:evaluate` 發送至瀏覽器控制服務。
- 路由處理程序 呼叫 Playwright 以執行 JavaScript。
- Playwright 會序列化頁面指令，因此永不結束的 evaluate 會阻塞佇列。
- 卡住的佇列意味著該分頁上後續的點擊/輸入/等待操作可能會出現掛起。

## 建議架構

### 1. 截止時間傳遞

引入單一的預算概念並據此推導一切：

- 呼叫者設定 `timeoutMs`（或未來的截止時間）。
- 外部請求逾時、路由處理邏輯以及頁面內的執行預算全部使用同一個預算，並在需要序列化開銷的地方保留少量餘量。
- 中止作為 `AbortSignal` 到處傳遞，以確保取消操作的一致性。

實作方向：

- 新增一個小輔助函式（例如 `createBudget({ timeoutMs, signal })`），它會傳回：
  - `signal`：連結的 AbortSignal
  - `deadlineAtMs`：絕對截止時間
  - `remainingMs()`：子操作的剩餘預算
- 在以下位置使用此輔助函式：
  - `src/browser/client-fetch.ts`（HTTP 和進程內分派）
  - `src/node-host/runner.ts`（代理路徑）
  - 瀏覽器動作實作（Playwright 和 CDP）

### 2. 獨立的評估引擎（CDP 路徑）

新增基於 CDP 的評估實作，它不共用 Playwright 的每頁命令佇列。關鍵特性在於評估傳輸是一個獨立的 WebSocket 連線以及一個附加到目標的獨立 CDP 會話。

實作方向：

- 新模組，例如 `src/browser/cdp-evaluate.ts`，它：
  - 連接到已設定的 CDP 端點（瀏覽器層級 socket）。
  - 使用 `Target.attachToTarget({ targetId, flatten: true })` 取得 `sessionId`。
  - 執行以下任一項：
    - `Runtime.evaluate` 用於頁面層級評估，或
    - `DOM.resolveNode` 加上 `Runtime.callFunctionOn` 用於元素評估。
  - 發生逾時或中止時：
    - 盡最大努力為該會話發送 `Runtime.terminateExecution`。
    - 關閉 WebSocket 並傳回明確的錯誤。

注意事項：

- 這仍然會在頁面中執行 JavaScript，因此終止可能會產生副作用。其優點在於它不會卡住 Playwright 佇列，並且可以透過終止 CDP 會話在傳輸層級取消它。

### 3. Ref 故事（無需完整重寫的元素定位）

困難的部分是元素定位。CDP 需要 DOM 處理程序或 `backendDOMNodeId`，而目前大多數瀏覽器動作使用基於快照中 ref 的 Playwright 定位器。

建議的方法：保留現有的 ref，但附加一個可選的 CDP 可解析 ID。

#### 3.1 擴充儲存的 Ref 資訊

擴充儲存的 role ref 元資料，以選擇性包含 CDP id：

- 目前：`{ role, name, nth }`
- 提議：`{ role, name, nth, backendDOMNodeId?: number }`

這讓所有現有的基於 Playwright 的動作都能正常運作，並允許 CDP evaluate 在 `backendDOMNodeId` 可用時接受相同的 `ref` 值。

#### 3.2 在快照時間填入 backendDOMNodeId

當產生 role 快照時：

1. 產生像今天一樣的現有 role ref map (role、name、nth)。
2. 透過 CDP (`Accessibility.getFullAXTree`) 取得 AX 樹狀結構，並使用相同的重複處理規則計算 `(role, name, nth) -> backendDOMNodeId` 的平行 map。
3. 將 id 合併回目前分頁儲存的 ref 資訊中。

如果 ref 的對應失敗，請保留 `backendDOMNodeId` 未定義。這使得該功能屬於盡力而為且可安全推出。

#### 3.3 使用 Ref 的 Evaluate 行為

在 `act:evaluate` 中：

- 如果 `ref` 存在且有 `backendDOMNodeId`，則透過 CDP 執行元素 evaluate。
- 如果 `ref` 存在但沒有 `backendDOMNodeId`，則退回到 Playwright 路徑（並搭配安全網）。

選用的緊急應變辦法：

- 擴充請求形狀以允許進階呼叫者（以及偵錯）直接接受 `backendDOMNodeId`，同時將 `ref` 保留為主要介面。

### 4. 保留最後手段的復原路徑

即使有 CDP evaluate，還是有其他方法會卡住分頁或連線。將現有的復原機制（終止執行 + 中斷 Playwright 連線）保留作為以下情況的最後手段：

- 舊版呼叫者
- CDP attach 被阻擋的環境
- 未預期的 Playwright 邊緣案例

## 實作計畫（單次迭代）

### 交付成果

- 一個基於 CDP 的 evaluate 引擎，在 Playwright 逐頁命令佇列之外運作。
- 由呼叫者和處理程序一致使用的單一端對端逾時/中止預算。
- Ref 元資料可以選擇性攜帶 `backendDOMNodeId` 進行元素 evaluate。
- `act:evaluate` 在可能時偏好 CDP 引擎，而在不可能時退回到 Playwright。
- 證明卡住的 evaluate 不會卡住後續動作的測試。
- 讓失敗和退回可見的記錄/指標。

### 實施檢查清單

1. 新增一個共享的「預算」輔助程式，將 `timeoutMs` + 上游 `AbortSignal` 連結為：
   - 單一 `AbortSignal`
   - 絕對截止時間
   - 給下游作業使用的 `remainingMs()` 輔助程式
2. 更新所有呼叫端路徑以使用該輔助程式，使 `timeoutMs` 在任何地方都代表相同的含義：
   - `src/browser/client-fetch.ts` (HTTP 和程序內調度)
   - `src/node-host/runner.ts` (node proxy 路徑)
   - 呼叫 `/act` 的 CLI 包裝函式 (將 `--timeout-ms` 新增至 `browser evaluate`)
3. 實作 `src/browser/cdp-evaluate.ts`：
   - 連接到瀏覽器層級的 CDP socket
   - `Target.attachToTarget` 以取得 `sessionId`
   - 針對頁面評估執行 `Runtime.evaluate`
   - 針對元素評估執行 `DOM.resolveNode` + `Runtime.callFunctionOn`
   - 逾時/中止時：盡力執行 `Runtime.terminateExecution` 然後關閉 socket
4. 擴充儲存的角色參照中繼資料以選擇性包含 `backendDOMNodeId`：
   - 針對 Playwright 動作保留現有的 `{ role, name, nth }` 行為
   - 為 CDP 元素目標定位新增 `backendDOMNodeId?: number`
5. 在建立快照時填入 `backendDOMNodeId` (盡力而為)：
   - 透過 CDP 擷取 AX 樹 (`Accessibility.getFullAXTree`)
   - 計算 `(role, name, nth) -> backendDOMNodeId` 並合併至儲存的參照對映中
   - 如果對應模稜兩可或遺失，請將 id 保留為未定義
6. 更新 `act:evaluate` 路由：
   - 如果沒有 `ref`：一律使用 CDP 評估
   - 如果 `ref` 解析為 `backendDOMNodeId`：使用 CDP 元素評估
   - 否則：回退到 Playwright 評估 (仍有上限且可中止)
7. 將現有的「最後手段」復原路徑保留為備援，而非預設路徑。
8. 新增測試：
   - 卡住的評估在預算內逾時，且後續的點擊/輸入成功
   - 中止會取消評估 (用戶端中斷連線或逾時) 並解除封鎖後續動作
   - 對應失敗會乾淨地回退到 Playwright
9. 新增可觀測性：
   - 評估持續時間與逾時計數器
   - terminateExecution 使用情況
   - 退回率（CDP -> Playwright）及原因

### 驗收標準

- 故意掛起的 `act:evaluate` 會在呼叫者預算內返回，且不會卡住
  分頁以影響後續操作。
- `timeoutMs` 在 CLI、代理工具、node proxy 和程序內調用中的表現一致。
- 如果 `ref` 可映射至 `backendDOMNodeId`，元素評估會使用 CDP；否則
  退回路徑仍受限制且可恢復。

## 測試計畫

- 單元測試：
  - `(role, name, nth)` 在角色參照與 AX 樹節點之間的比對邏輯。
  - Budget helper 的行為（餘量、剩餘時間計算）。
- 整合測試：
  - CDP 評估逾時會在預算內返回且不會阻擋下一個操作。
  - 中止會取消評估並盡力觸發終止。
- 合約測試：
  - 確保 `BrowserActRequest` 和 `BrowserActResponse` 保持相容。

## 風險與緩解措施

- 映射並不完美：
  - 緩解措施：盡力映射、退回至 Playwright 評估，並加入除錯工具。
- `Runtime.terminateExecution` 有副作用：
  - 緩解措施：僅在逾時/中止時使用，並在錯誤中記錄該行為。
- 額外負擔：
  - 緩解措施：僅在要求快照時取得 AX 樹，按目標快取，並保持
    CDP 會話短暫。
- 擴充功能中繼的限制：
  - 緩解措施：當每頁 socket 不可用時使用瀏覽器層級的附加 API，並
    將現有的 Playwright 路徑作為退回。

## 待解決問題

- 新引擎應設為可配置為 `playwright`、`cdp` 還是 `auto`？
- 我們是否要為進階使用者公開一種新的「nodeRef」格式，還是僅保留 `ref`？
- 框架快照與選取器範圍快照應如何參與 AX 映射？

import en from "/components/footer/en.mdx";

<en />
