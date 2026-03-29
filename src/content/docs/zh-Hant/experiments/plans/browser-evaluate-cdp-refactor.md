---
summary: "計畫：使用 CDP 將瀏覽器 act:evaluate 與 Playwright 佇列隔離，並具備端對端截止時間 (deadline) 與更安全的參照解析"
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

`act:evaluate` 在頁面中執行使用者提供的 JavaScript。目前它透過 Playwright 運行
(`page.evaluate` 或 `locator.evaluate`)。Playwright 會對每個頁面的 CDP 指令進行序列化，因此
卡住或長時間執行的 evaluate 可能會阻擋頁面指令佇列，並導致該分頁上後續的每個操作
看起來都「卡住」了。

PR #13498 增加了一個務實的安全網（有界 evaluate、中止傳播 (abort propagation) 和盡力恢復
(best-effort recovery)）。本文檔描述了一個更大的重構，使 `act:evaluate` 本質上
與 Playwright 隔離，因此卡住的 evaluate 無法卡住正常的 Playwright 操作。

## 目標

- `act:evaluate` 無法永久阻擋同一分頁上後續的瀏覽器操作。
- 逾時 (Timeouts) 是端對端的唯一真實來源 (single source of truth)，以便呼叫者能依賴預算。
- 中止 (Abort) 和逾時在 HTTP 和程序內 (in-process) 分派中被以相同方式處理。
- 支援針對 evaluate 的元素目標定位，而無需將所有內容從 Playwright 切換。
- 為現有的呼叫者和負載維持向後相容性。

## 非目標

- 使用 CDP 實作取代所有瀏覽器操作（點擊、輸入、等待等）。
- 移除 PR #13498 中引進的現有安全網（它仍然是一個有用的備援方案）。
- 引進超出現有 `browser.evaluateEnabled` 閘門 的新不安全功能。
- 為 evaluate 新增程序隔離（工作行程/執行緒）。如果在此次重構後我們仍看到難以恢復
  的卡住狀態，那將是一個後續的構想。

## 目前的架構（為什麼會卡住）

高層次來說：

- 呼叫者將 `act:evaluate` 發送到瀏覽器控制服務。
- 路由處理程序呼叫 Playwright 來執行 JavaScript。
- Playwright 會序列化頁面指令，因此一個永不結束的 evaluate 會阻塞佇列。
- 阻塞的佇列意味著分頁上後續的點擊/輸入/等待操作可能會出現停滯。

## 建議架構

### 1. 截止時間傳遞

引入單一的預算概念並從中衍生出一切：

- 呼叫者設定 `timeoutMs`（或未來的截止時間）。
- 外部請求逾時、路由處理程序邏輯以及頁面內的執行預算都使用相同的預算，並在需要序列化開銷的地方保留少量的緩衝空間。
- 中止作為 `AbortSignal` 到處傳播，以確保取消操作的一致性。

實作方向：

- 新增一個小輔助程式（例如 `createBudget({ timeoutMs, signal })`），它會傳回：
  - `signal`：連結的 AbortSignal
  - `deadlineAtMs`：絕對截止時間
  - `remainingMs()`：子作業的剩餘預算
- 在以下位置使用此輔助程式：
  - `src/browser/client-fetch.ts`（HTTP 和行程內分發）
  - `src/node-host/runner.ts`（代理路徑）
  - 瀏覽器動作實作（Playwright 和 CDP）

### 2. 獨立 Evaluate 引擎（CDP 路徑）

新增一個不與 Playwright 的每頁指令佇列共用的 CDP evaluate 實作。關鍵特性是 evaluate 傳輸是一個獨立的 WebSocket 連線以及附加到目標的獨立 CDP 工作階段。

實作方向：

- 新模組，例如 `src/browser/cdp-evaluate.ts`，該模組會：
  - 連線到設定的 CDP 端點（瀏覽器層級 socket）。
  - 使用 `Target.attachToTarget({ targetId, flatten: true })` 取得 `sessionId`。
  - 執行下列任一項：
    - 用於頁面層級 evaluate 的 `Runtime.evaluate`，或
    - 用於元素 evaluate 的 `DOM.resolveNode` 加上 `Runtime.callFunctionOn`。
  - 逾時或中止時：
    - 盡力為該工作階段發送 `Runtime.terminateExecution`。
    - 關閉 WebSocket 並傳回明確的錯誤。

註記：

- 這仍然會在頁面中執行 JavaScript，因此終止可能會產生副作用。好處在於它不會卡住 Playwright 佇列，並且可以透過終止 CDP 工作階段在傳輸層級進行取消。

### 3. Ref Story（無需完整重寫的元素定位）

困難的部分在於元素定位。CDN 需要一個 DOM 控制代碼或 `backendDOMNodeId`，而目前大多數瀏覽器動作使用的是基於快照中參照的 Playwright 定位器。

建議的方法：保留現有的參照，但附加一個可選的 CDP 可解析 ID。

#### 3.1 擴展儲存的參照資訊

擴展儲存的 role 參照元資料以可選地包含 CDP ID：

- 目前：`{ role, name, nth }`
- 建議：`{ role, name, nth, backendDOMNodeId?: number }`

這保持了所有現有基於 Playwright 的動作正常運作，並允許 CDP evaluate 在 `backendDOMNodeId` 可用時接受相同的 `ref` 值。

#### 3.2 在快照時填入 backendDOMNodeId

當產生 role 快照時：

1. 像今天一樣產生現有的 role 參照映射（role、name、nth）。
2. 透過 CDP (`Accessibility.getFullAXTree`) 獲取 AX 樹，並使用相同的重複處理規則計算 `(role, name, nth) -> backendDOMNodeId` 的平行映射。
3. 將 ID 合併回目前分頁的儲存參照資訊中。

如果參照的映射失敗，將 `backendDOMNodeId` 保留為未定義。這使得該功能為盡力而為，並且安全地推出。

#### 3.3 使用參照的 Evaluate 行為

在 `act:evaluate` 中：

- 如果 `ref` 存在並且有 `backendDOMNodeId`，則透過 CDP 執行元素 evaluate。
- 如果 `ref` 存在但沒有 `backendDOMNodeId`，則回退到 Playwright 路徑（並帶有安全網）。

可選的應急機制：

- 擴展請求形狀以直接接受 `backendDOMNodeId` 供進階呼叫者使用（以及用於偵錯），同時保持 `ref` 作為主要介面。

### 4. 保留最後手段的恢復路徑

即使有 CDP evaluate，仍有其他方法會卡住分頁或連線。保留現有的恢復機制（終止執行 + 中斷 Playwright 連線）作為最後手段，用於：

- 舊版呼叫者
- 封鎖 CDP 附加的環境
- 意外 的 Playwright 邊緣情況

## 實作計畫（單次迭代）

### 交付成果

- 一個基於 CDP 的 evaluate 引擎，在 Playwright 每頁命令佇列之外執行。
- 一個單一的端到端逾時/中止預算，由呼叫者和處理程式一致使用。
- 可選攜帶 `backendDOMNodeId` 進行元素求值的 Ref 元數據。
- `act:evaluate` 盡可能優先使用 CDP 引擎，並在無法使用時回退到 Playwright。
- 證明卡住的求值不會阻塞後續操作的測試。
- 讓失敗和回退可見的日誌/指標。

### 實作檢查清單

1. 新增一個共用的「預算」輔助程式，將 `timeoutMs` + 上游 `AbortSignal` 連結為：
   - 單一 `AbortSignal`
   - 絕對截止時間
   - 用於下游作業的 `remainingMs()` 輔助程式
2. 更新所有呼叫者路徑以使用該輔助程式，使 `timeoutMs` 在任何地方都代表相同含義：
   - `src/browser/client-fetch.ts`（HTTP 和進程內分發）
   - `src/node-host/runner.ts`（節點代理路徑）
   - 呼叫 `/act` 的 CLI 包裝器（將 `--timeout-ms` 新增到 `browser evaluate`）
3. 實作 `src/browser/cdp-evaluate.ts`：
   - 連接到瀏覽器層級的 CDP socket
   - `Target.attachToTarget` 以取得 `sessionId`
   - 執行 `Runtime.evaluate` 進行頁面求值
   - 執行 `DOM.resolveNode` + `Runtime.callFunctionOn` 進行元素求值
   - 超時/中止時：盡力 `Runtime.terminateExecution` 然後關閉 socket
4. 擴充儲存的角色參照元數據以選擇性包含 `backendDOMNodeId`：
   - 為 Playwright 動作保留現有的 `{ role, name, nth }` 行為
   - 為 CDP 元素定位新增 `backendDOMNodeId?: number`
5. 在建立快照時填入 `backendDOMNodeId`（盡力而為）：
   - 透過 CDP 取得 AX 樹狀結構（`Accessibility.getFullAXTree`）
   - 計算 `(role, name, nth) -> backendDOMNodeId` 並合併到儲存的參照映射中
   - 如果映射不明確或缺失，請將 id 保持未定義
6. 更新 `act:evaluate` 路由：
   - 如果沒有 `ref`：一律使用 CDP 求值
   - 如果 `ref` 解析為 `backendDOMNodeId`：使用 CDP 元素求值
   - 否則：回退到 Playwright 求值（仍然有邊界且可中止）
7. 將現有的「最後手段」恢復路徑保留為備用方案，而非預設路徑。
8. 新增測試：
   - 卡住的評估在預算範圍內逾時，且下一次點擊/輸入成功
   - 中止會取消評估（用戶端中斷連線或逾時）並解除對後續動作的阻擋
   - 映射失敗會乾淨地退回至 Playwright
9. 新增可觀測性：
   - 評估持續時間與逾時計數器
   - terminateExecution 的使用情況
   - 退回率（CDP -> Playwright）與原因

### 驗收標準

- 故意掛起的 `act:evaluate` 會在呼叫者的預算範圍內返回，並不會卡住分頁導致後續動作無法執行。
- `timeoutMs` 在 CLI、代理工具、node proxy 和程序內呼叫中的行為保持一致。
- 如果 `ref` 可以映射到 `backendDOMNodeId`，元素評估會使用 CDP；否則，退回路徑仍然受限且可恢復。

## 測試計劃

- 單元測試：
  - `(role, name, nth)` 角色參照與 AX 樹節點之間的匹配邏輯。
  - 預算輔助工具的行為（餘量、剩餘時間計算）。
- 整合測試：
  - CDP 評估逾時會在預算範圍內返回，並不會阻擋下一個動作。
  - 中止會取消評估並盡力觸發終止程序。
- 合約測試：
  - 確保 `BrowserActRequest` 和 `BrowserActResponse` 保持相容。

## 風險與緩解措施

- 映射並不完美：
  - 緩解措施：盡力映射，退回至 Playwright 評估，並加入除錯工具。
- `Runtime.terminateExecution` 具有副作用：
  - 緩解措施：僅在逾時/中止時使用，並在錯誤中記錄該行為。
- 額外負擔：
  - 緩解措施：僅在要求快照時擷取 AX 樹，針對每個目標進行快取，並保持 CDP 會話短暫。
- 擴充功能中繼限制：
  - 緩解措施：當無法使用每個分頁的 socket 時，使用瀏覽器層級的連線 API，並將當前的 Playwright 路徑保留為退回選項。

## 未解決的問題

- 新引擎應設定為 `playwright`、`cdp` 還是 `auto`？
- 我們是否要為進階使用者公開新的「nodeRef」格式，還是僅保留 `ref`？
- 框架快照和選取器範圍快照應如何參與 AX 映射？
