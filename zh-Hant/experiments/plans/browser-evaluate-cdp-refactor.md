---
summary: "計畫：使用 CDP 將瀏覽器 act:evaluate 與 Playwright 佇列隔離，具備端對端期限與更安全的 ref 解析"
read_when:
  - Working on browser `act:evaluate` timeout, abort, or queue blocking issues
  - Planning CDP based isolation for evaluate execution
owner: "openclaw"
status: "draft"
last_updated: "2026-02-10"
title: "Browser 評估 CDP 重構"
---

# Browser 評估 CDP 重構計畫

## 背景

`act:evaluate` 在頁面中執行使用者提供的 JavaScript。目前它透過 Playwright 執行
(`page.evaluate` 或 `locator.evaluate`)。Playwright 會對每個頁面序列化 CDP 指令，因此
卡住或長時間執行的評估可能會阻擋頁面指令佇列，並使該分頁上後續的每個操作看起來都「卡住」。

PR #13498 增加了一個實用的安全網（有邊界的執行、中止傳播以及盡力而為的恢復）。本文檔描述了一個更大的重構，使 `act:evaluate` 與 Playwright 本質上隔離，這樣卡住的執行就不會卡住正常的 Playwright 操作。

## 目標

- `act:evaluate` 不能永久阻擋同一標籤頁上後續的瀏覽器操作。
- 逾時是端到端的唯一事實來源，因此呼叫者可以依賴預算。
- 中止與逾時在 HTTP 和進程內分派中的處理方式相同。
- 支援評估的元素目標定位，而無需將所有內容從 Playwright 切換開。
- 為現有呼叫者和負載維持向後相容性。

## 非目標

- 用 CDP 實作取代所有瀏覽器動作（點擊、輸入、等待等）。
- 移除 PR #13498 中引入的現有安全網（它仍然是一個有用的備選方案）。
- 在現有的 `browser.evaluateEnabled` 閘道之外引入新的不安全功能。
- 為 evaluate 新增程序隔離（工作程序/執行緒）。如果在此次重構後我們仍然看到難以恢復的卡住狀態，那將是一個後續的構想。

## 現有架構（為什麼會卡住）

概況：

- 呼叫者將 `act:evaluate` 發送到瀏覽器控制服務。
- 路由處理程序呼叫 Playwright 來執行 JavaScript。
- Playwright 會序列化頁面指令，因此一個永不結束的 evaluate 會阻塞佇列。
- 佇列阻塞意味著該分頁上後續的點擊/輸入/等待操作可能會出現掛起現象。

## 提議的架構

### 1. 截止時間傳遞

引入單一預算概念並從中衍生出所有內容：

- 呼叫者設定 `timeoutMs`（或未來的截止期限）。
- 外部請求逾時、路由處理邏輯以及頁面內的執行預算全都使用同一個預算，並在需要的地方針對序列化 overhead 保留少量緩衝。
- 中止作為 `AbortSignal` 傳播到各處，以確保取消的一致性。

實作方向：

- 加入一個小輔助函數（例如 `createBudget({ timeoutMs, signal })`），它會傳回：
  - `signal`：連結的 AbortSignal
  - `deadlineAtMs`：絕對截止時間 (absolute deadline)
  - `remainingMs()`：子作業剩餘預算
- 於下列位置使用此輔助程式：
  - `src/browser/client-fetch.ts` (HTTP 和行程內分派)
  - `src/node-host/runner.ts` (代理路徑)
  - 瀏覽器動作實作 (Playwright 和 CDP)

### 2. 獨立的評估引擎 (CDP 路徑)

新增基於 CDP 的 evaluate 實作，不共用 Playwright 的每頁指令佇列。關鍵特性是 evaluate 的傳輸層是獨立的 WebSocket 連線，以及附加至目標的獨立 CDP 工作階段。

實作方向：

- 新模組，例如 `src/browser/cdp-evaluate.ts`，其功能：
  - 連線至設定的 CDP 端點（瀏覽器層級的 socket）。
  - 使用 `Target.attachToTarget({ targetId, flatten: true })` 取得 `sessionId`。
  - 執行以下任一項：
    - 針對頁面層級的 evaluate 使用 `Runtime.evaluate`，或
    - 針對元素 evaluate 使用 `DOM.resolveNode` 加上 `Runtime.callFunctionOn`。
  - 發生逾時或中止時：
    - 盡力為該 session 發送 `Runtime.terminateExecution`。
    - 關閉 WebSocket 並傳回明確的錯誤。

備註：

- 這仍然在頁面中執行 JavaScript，因此終止可能會產生副作用。好處在於它不會阻塞 Playwright 佇列，並且可以通過終止 CDP 會話在傳輸層級取消。

### 3. Ref Story (Element Targeting Without A Full Rewrite)

困難的部分是元素定位。CDP 需要 DOM 句柄或 `backendDOMNodeId`，而目前大多數瀏覽器操作使用基於快照 refs 的 Playwright 定位器。

建議的方法：保留現有的 refs，但附加一個可選的 CDP 可解析 id。

#### 3.1 擴充已儲存的 Ref 資訊

擴充已儲存的 role ref 元資料以選擇性包含 CDP id：

- 目前：`{ role, name, nth }`
- 提議：`{ role, name, nth, backendDOMNodeId?: number }`

這可以保持所有現有的基於 Playwright 的操作正常運作，並允許 CDP evaluate 在 `backendDOMNodeId` 可用時接受相同的 `ref` 值。

#### 3.2 在快照時填入 backendDOMNodeId

在產生角色快照時：

1. 像現在一樣產生現有的角色參照映射（role、name、nth）。
2. 透過 CDP (`Accessibility.getFullAXTree`) 取得 AX 樹，並使用相同的重複處理規則計算 `(role, name, nth) -> backendDOMNodeId` 的平行映射。
3. 將該 ID 合併回目前分頁的已儲存參照資訊中。

若 ref 的對應失敗，請保留 `backendDOMNodeId` 為 undefined。這使該功能
成為盡力而為且安全可推出的功能。

#### 3.3 使用 Ref 的 Evaluate 行為

在 `act:evaluate` 中：

- 若存在 `ref` 且具有 `backendDOMNodeId`，請透過 CDP 執行元素評估。
- 如果存在 `ref` 但沒有 `backendDOMNodeId`，則回退到 Playwright 路徑（並使用
  安全網）。

可選的應急措施：

- 擴展請求形狀以允許進階呼叫者（以及
  用於除錯）直接接受 `backendDOMNodeId`，同時將 `ref` 作為主要介面。

### 4. 保留最終恢復路徑

即使使用 CDP 評估，仍有可能卡住分頁或連線的其他方式。請將現有的恢復機制（終止執行 + 中斷 Playwright 連線）作為最後手段，以應對：

- 舊版呼叫者
- CDD 連線被封鎖的環境
- 意料之外的 Playwright 邊緣情況

## 實作計劃（單次迭代）

### 交付成果

- 一個基於 CDP 的評估引擎，在 Playwright 逐頁面指令佇列之外執行。
- 由呼叫者和處理程序一致使用的單一端到端逾時/中止預算。
- Ref 元資料，可以選擇性地為元素評估攜帶 `backendDOMNodeId`。
- `act:evaluate` 在可能時偏好使用 CDP 引擎，而在不可行時回退到 Playwright。
- 證明卡住的評估不會造成後續動作停滯的測試。
- 使失敗和回退可見的日誌/指標。

### 實作檢查清單

1. 新增一個共用的「預算」輔助程式，將 `timeoutMs` 與上游 `AbortSignal` 連結為：
   - 單一 `AbortSignal`
   - 絕對期限
   - 用於下游作業的 `remainingMs()` 輔助程式
2. 更新所有呼叫端路徑以使用該輔助程式，讓 `timeoutMs` 在任何地方都代表相同的含義：
   - `src/browser/client-fetch.ts` (HTTP 和行程內分派)
   - `src/node-host/runner.ts` (node proxy path)
   - 呼叫 `/act` 的 CLI 包裝器（將 `--timeout-ms` 新增至 `browser evaluate`）
3. 實作 `src/browser/cdp-evaluate.ts`：
   - 連接到瀏覽器層級的 CDP socket
   - `Target.attachToTarget` 以取得 `sessionId`
   - 執行 `Runtime.evaluate` 以進行頁面評估
   - 針對元素評估執行 `DOM.resolveNode` + `Runtime.callFunctionOn`
   - 逾時/中止時：盡力執行 `Runtime.terminateExecution` 然後關閉 socket
4. 擴充儲存的 role ref 元資料以選擇性包含 `backendDOMNodeId`：
   - 對 Playwright 動作保持現有的 `{ role, name, nth }` 行為
   - 新增 `backendDOMNodeId?: number` 用於 CDP 元素目標定位
5. 在建立快照時填入 `backendDOMNodeId`（盡力而為）：
   - 透過 CDP 擷取 AX 樹（`Accessibility.getFullAXTree`）
   - 計算 `(role, name, nth) -> backendDOMNodeId` 並合併至儲存的 ref map
   - 若對應模稜兩可或遺失，則將 id 留空
6. 更新 `act:evaluate` 路由：
   - 若無 `ref`：一律使用 CDP evaluate
   - 如果 `ref` 解析為 `backendDOMNodeId`：使用 CDP 元素評估
   - 否則：回退到 Playwright 評估（仍然受限制且可中止）
7. 將現有的「最後手段」恢復路徑保留為回退方案，而不是預設路徑。
8. 加入測試：
   - 卡住的評估在預算時間內超時，並且後續的點擊/輸入成功
   - 中止取消評估（客戶端斷線或超時）並解除對後續動作的封鎖
   - 映射失敗會乾淨地退回到 Playwright
9. 新增可觀測性：
   - 評估持續時間和超時計數器
   - terminateExecution 的使用情況
   - 退回率（CDP -> Playwright）及原因

### 驗收標準

- 故意掛起的 `act:evaluate` 會在呼叫者的預算時間內返回，並且不會卡住分頁導致後續動作無法執行。
- `timeoutMs` 在 CLI、agent 工具、node proxy 和進程內呼叫中的表現一致。
- 如果 `ref` 可以映射到 `backendDOMNodeId`，元素評估會使用 CDP；否則
  後備路徑仍然是有界且可恢復的。

## 測試計畫

- 單元測試：
  - `(role, name, nth)` 角色參照與 AX 樹節點之間的匹配邏輯。
  - 預算輔助程式的行為（餘量、剩餘時間計算）。
- 整合測試：
  - CDP 評估逾時會在預算內返回，並且不會阻擋下一個動作。
  - 中止會取消評估並盡力觸發終止。
- 合約測試：
  - 確保 `BrowserActRequest` 和 `BrowserActResponse` 保持相容。

## 風險與緩解措施

- 映射並不完美：
  - 緩解措施：盡力映射，回退到 Playwright 評估，並添加調試工具。
- `Runtime.terminateExecution` 具有副作用：
  - 緩解措施：僅在逾時/中止時使用，並在錯誤中記錄該行為。
- 額外開銷：
  - 緩解措施：僅在請求快照時擷取 AX 樹，按目標進行快取，並讓 CDP 會話保持短暫。
- 擴充功能轉送限制：
  - 緩解措施：當無法使用逐頁面 socket 時，使用瀏覽器層級的附加 API，並保留當前的 Playwright 路徑作為後備。

## 未解決的問題

- 新引擎應可設定為 `playwright`、`cdp` 還是 `auto`？
- 我們是否要為進階用戶公開一種新的 "nodeRef" 格式，還是僅保留 `ref`？
- 框架快照和選擇器範圍快照應如何參與 AX 對應？

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
