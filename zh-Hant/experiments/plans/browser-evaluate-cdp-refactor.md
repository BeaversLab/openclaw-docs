---
summary: "Plan: isolate browser act:evaluate from Playwright queue using CDP, with end-to-end deadlines and safer ref resolution"
read_when:
  - Working on browser `act:evaluate` timeout, abort, or queue blocking issues
  - Planning CDP based isolation for evaluate execution
owner: "openclaw"
status: "draft"
last_updated: "2026-02-10"
title: "Browser Evaluate CDP Refactor"
---

# Browser Evaluate CDP 重構計畫

## 背景

`act:evaluate` 在頁面中執行使用者提供的 JavaScript。目前它透過 Playwright
（`page.evaluate` 或 `locator.evaluate`）運行。Playwright 會對每個頁面的 CDP 指令進行序列化，因此
卡住或長時間運行的 evaluate 可能會阻塞頁面指令佇列，並導致該分頁上後續的每個操作
看起來像是「卡住」了。

PR #13498 增加了一個務實的安全網（有邊界的 evaluate、中止傳播，以及盡力
恢復）。本文件描述了一個更大的重構，使 `act:evaluate` 本質上
與 Playwright 隔離，因此卡住的 evaluate 不會卡住正常的 Playwright 操作。

## 目標

- `act:evaluate` 不能永久阻擋同一分頁上後續的瀏覽器操作。
- 超時是端到端唯一的真實來源，因此呼叫者可以依賴預算。
- 中止和超時在 HTTP 和行程內分發中被同等對待。
- 支援 evaluate 的元素目標定位，而無需將所有內容切換出 Playwright。
- 維持現有呼叫者和負載的向後相容性。

## 非目標

- 用 CDP 實作取代所有瀏覽器操作（點擊、輸入、等待等）。
- 移除 PR #13498 中引入的現有安全網（它仍然是有用的後備方案）。
- 引入超出現有 `browser.evaluateEnabled` 閘門的新不安全功能。
- 為 evaluate 增加程序隔離（worker 程序/執行緒）。如果在此重構之後我們仍然看到難以恢復
  的卡住狀態，那是一個後續的構想。

## 目前的架構（為什麼會卡住）

高層次來說：

- 呼叫者將 `act:evaluate` 發送到瀏覽器控制服務。
- 路由處理程序呼叫 Playwright 來執行 JavaScript。
- Playwright 會序列化頁面指令，因此一個永不結束的 evaluate 會阻塞佇列。
- 阻塞的佇列意味著該分頁上後續的點擊/輸入/等待操作可能會出現掛起狀況。

## 擬議架構

### 1. 截止時間傳遞

引入單一預算概念並由此衍生一切：

- 呼叫者設定 `timeoutMs`（或未來的截止時間）。
- 外部請求逾時、路由處理邏輯以及頁面內的執行預算皆使用相同的預算，並在需要時為序列化開銷保留少量餘量。
- 中止作為 `AbortSignal` 到處傳遞，以便取消操作保持一致。

實作方向：

- 新增一個小型輔助程式（例如 `createBudget({ timeoutMs, signal })`），該程式會傳回：
  - `signal`：連結的 AbortSignal
  - `deadlineAtMs`：絕對截止時間
  - `remainingMs()`：子作業的剩餘預算
- 在以下位置使用此輔助程式：
  - `src/browser/client-fetch.ts`（HTTP 和程序內分派）
  - `src/node-host/runner.ts`（代理路徑）
  - 瀏覽器動作實作（Playwright 和 CDP）

### 2. 獨立評估引擎（CDP 路徑）

新增基於 CDP 的評估實作，不共用 Playwright 的每個頁面指令佇列。關鍵特性是評估傳輸是單獨的 WebSocket 連線，以及附加至目標的單獨 CDP 工作階段。

實作方向：

- 新增一個模組，例如 `src/browser/cdp-evaluate.ts`，該模組會：
  - 連線至設定的 CDP 端點（瀏覽器層級 socket）。
  - 使用 `Target.attachToTarget({ targetId, flatten: true })` 取得 `sessionId`。
  - 執行其中之一：
    - `Runtime.evaluate` 用於頁面層級評估，或
    - `DOM.resolveNode` 加上 `Runtime.callFunctionOn` 用於元素評估。
  - 在逾時或中止時：
    - 盡最大努力對工作階段發送 `Runtime.terminateExecution`。
    - 關閉 WebSocket 並傳回明確的錯誤。

注意事項：

- 這仍然會在頁面中執行 JavaScript，因此終止可能會產生副作用。好處在於它不會卡住 Playwright 佇列，並且可以透過終止 CDP 工作階段在傳輸層級進行取消。

### 3. Ref Story（無需完全重寫的元素定位）

困難的部分在於元素定位。CDN 需要 DOM 句柄或 `backendDOMNodeId`，而目前大多數瀏覽器動作使用基於快照中 refs 的 Playwright 定位器。

建議的方法：保留現有的 refs，但附加一個可選的 CDP 可解析 ID。

#### 3.1 擴展儲存的 Ref 資訊

擴展儲存的 role ref 元數據以可選地包含一個 CDP ID：

- 目前：`{ role, name, nth }`
- 提議：`{ role, name, nth, backendDOMNodeId?: number }`

這保持了所有現有基於 Playwright 的動作正常運作，並允許 CDP evaluate 在 `backendDOMNodeId` 可用時接受相同的 `ref` 值。

#### 3.2 在快照時填入 backendDOMNodeId

在產生 role 快照時：

1. 像今天一樣產生現有的 role ref map (role, name, nth)。
2. 透過 CDP (`Accessibility.getFullAXTree`) 取得 AX 樹並使用相同的重複處理規則計算 `(role, name, nth) -> backendDOMNodeId` 的平行 map。
3. 將 ID 合併回目前標籤頁的儲存 ref 資訊中。

如果 ref 的映射失敗，將 `backendDOMNodeId` 保留為未定義。這使得該功能為盡力而為且可以安全地推出。

#### 3.3 使用 Ref 的 Evaluate 行為

在 `act:evaluate` 中：

- 如果 `ref` 存在且有 `backendDOMNodeId`，則透過 CDP 執行元素 evaluate。
- 如果 `ref` 存在但沒有 `backendDOMNodeId`，則退回到 Playwright 路徑（並帶有安全網）。

可選的逃逸手段：

- 擴展請求形狀以直接接受 `backendDOMNodeId` 供高級呼叫者使用（以及用於調試），同時將 `ref` 作為主要介面。

### 4. 保留最後手段的恢復路徑

即使有 CDP evaluate，還是有其他方法會卡住標籤頁或連線。保留現有的恢復機制（終止執行 + 中斷 Playwright 連線）作為以下情況的最後手段：

- 舊版呼叫者
- CDN attach 被阻擋的環境
- 意外 的 Playwright 邊緣情況

## 實施計劃（單次迭代）

### 交付成果

- 一個基於 CDP 的 evaluate 引擎，在 Playwright 每頁命令隊列之外運行。
- 一個單一的端到端逾時/中止預算，由呼叫者和處理程式一致地使用。
- 可以選擇攜帶 `backendDOMNodeId` 用於元素求值的 Ref 元數據。
- `act:evaluate` 盡可能優先使用 CDP 引擎，若無法使用則退回到 Playwright。
- 證明卡住的求值不會卡住後續操作的測試。
- 使失敗和退回可見的日誌/指標。

### 實作檢查清單

1. 新增一個共用的「預算」輔助程式，將 `timeoutMs` + 上游 `AbortSignal` 連結至：
   - 單一 `AbortSignal`
   - 絕對截止時間
   - 給下游作業使用的 `remainingMs()` 輔助程式
2. 更新所有呼叫者路徑以使用該輔助程式，讓 `timeoutMs` 在任何地方都代表相同的含義：
   - `src/browser/client-fetch.ts` (HTTP 和程序內分派)
   - `src/node-host/runner.ts` (節點代理路徑)
   - 呼叫 `/act` 的 CLI 包裝器 (將 `--timeout-ms` 新增至 `browser evaluate`)
3. 實作 `src/browser/cdp-evaluate.ts`：
   - 連線到瀏覽器層級的 CDP socket
   - `Target.attachToTarget` 以取得 `sessionId`
   - 針對頁面求值執行 `Runtime.evaluate`
   - 針對元素求值執行 `DOM.resolveNode` + `Runtime.callFunctionOn`
   - 在逾時/中止時：盡力 `Runtime.terminateExecution` 然後關閉 socket
4. 擴充儲存的 role ref 元數據以選擇性包含 `backendDOMNodeId`：
   - 針對 Playwright 操作保留現有的 `{ role, name, nth }` 行為
   - 新增 `backendDOMNodeId?: number` 用於 CDP 元素定位
5. 在建立快照時填入 `backendDOMNodeId` (盡力而為)：
   - 透過 CDP 擷取 AX 樹狀結構 (`Accessibility.getFullAXTree`)
   - 計算 `(role, name, nth) -> backendDOMNodeId` 並合併至儲存的 ref 對應中
   - 如果對應不明確或遺失，則將 id 保留為未定義
6. 更新 `act:evaluate` 路由：
   - 如果沒有 `ref`：一律使用 CDP 求值
   - 如果 `ref` 解析為 `backendDOMNodeId`：使用 CDP 元素求值
   - 否則：退回到 Playwright 求值 (仍有界限且可中止)
7. 保留現有的「最後手段」復原路徑作為退回選項，而非預設路徑。
8. 新增測試：
   - 卡住的 evaluate 會在預算內超時，且後續的點擊/輸入會成功
   - 中止會取消 evaluate（客戶端斷線或超時）並解除後續動作的阻塞
   - 映射失敗會乾淨地回退到 Playwright
9. 新增可觀測性：
   - evaluate 持續時間與超時計數器
   - terminateExecution 的使用情況
   - 回退率（CDP -> Playwright）及其原因

### 驗收標準

- 故意造成掛起的 `act:evaluate` 會在呼叫者的預算內返回，且不會造成
  分頁在後續動作時卡住。
- `timeoutMs` 在 CLI、agent 工具、node proxy 和 process 內呼叫之間的
  行為保持一致。
- 如果 `ref` 可以映射到 `backendDOMNodeId`，元素 evaluate 會使用 CDP；
  否則回退路徑仍然是有界且可恢復的。

## 測試計畫

- 單元測試：
  - `(role, name, nth)` 角色引用與 AX 樹節點之間的匹配邏輯。
  - 預算輔助器的行為（餘量、剩餘時間計算）。
- 整合測試：
  - CDP evaluate 超時會在預算內返回，且不會阻塞下一個動作。
  - 中止會取消 evaluate 並盡力觸發終止。
- 合約測試：
  - 確保 `BrowserActRequest` 和 `BrowserActResponse` 保持相容。

## 風險與緩解措施

- 映射並不完美：
  - 緩解措施：盡力映射，回退到 Playwright evaluate，並加入除錯工具。
- `Runtime.terminateExecution` 有副作用：
  - 緩解措施：僅在超時/中止時使用，並在錯誤中記錄此行為。
- 額外負載：
  - 緩解措施：僅在請求快照時擷取 AX 樹，每個目標進行快取，並保持
    CDP session 為短暫存活。
- 擴充功能中繼限制：
  - 緩解措施：當無法使用每頁 socket 時使用瀏覽器層級的附加 API，並
    將目前的 Playwright 路徑保留為回退方案。

## 待解決問題

- 新引擎應設計為可設定的 `playwright`、`cdp` 還是 `auto`？
- 我們是否要為進階使用者公開新的「nodeRef」格式，還是僅保留 `ref`？
- frame 快照與選擇器範圍快照應如何參與 AX 映射？

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
