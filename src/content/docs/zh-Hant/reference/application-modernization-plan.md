---
summary: "包含前端交付技能更新的綜合應用程式現代化計畫"
title: "應用程式現代化計畫"
read_when:
  - Planning a broad OpenClaw application modernization pass
  - Updating frontend implementation standards for app or Control UI work
  - Turning a broad product quality review into phased engineering work
---

## 目標

將應用程式推向更乾淨、更快速、更易於維護的產品，而不破壞現有的工作流程或在廣泛的重構中隱藏風險。這項工作應作為小的、可審查的片段落地，並對每個接觸到的層面提供證明。

## 原則

- 除非邊界被證明會導致變動、效能成本或使用者可見的錯誤，否則保留現有架構。
- 優先為每個問題採用最小的正確補丁，然後重複。
- 將必要的修復與可選的潤飾分開，以便維護人員可以落地高價值的工作，而無需等待主觀決策。
- 保持面向外掛程式的行為有文件記錄且向後相容。
- 在聲稱修復回歸之前，先驗證已發布的行為、依賴契約和測試。
- 首先改善主要使用者路徑：入門、驗證、聊天、提供者設定、外掛程式管理和診斷。

## 第 1 階段：基準審查

在變更應用程式之前，先對其進行盤點。

- 識別頂級使用者工作流程及其擁有的程式碼層面。
- 列出失效的功能、重複的設定、不清楚的錯誤狀態以及昂貴的渲染路徑。
- 擷取每個層面的當前驗證指令。
- 將問題標記為必要、建議或可選。
- 記錄已知需要所有者審查的阻礙因素，特別是 API、安全性、發布和外掛程式契約變更。

完成定義：

- 一份包含 repo-root 檔案參照的問題清單。
- 每個問題都有嚴重性、所有者層面、預期的使用者影響以及建議的驗證路徑。
- 沒有推測性的清理項目混合在必要的修復中。

## 第 2 階段：產品和 UX 清理

優先考慮可見的工作流程並消除混亂。

- 加強模型驗證、閘道狀態和外掛程式設定周圍的入門說明文字和空白狀態。
- 移除或停用無法採取任何動作之處的失效功能。
- 在響應式寬度中保持重要操作可見，而不是將其隱藏在脆弱的版面假設後面。
- 合併重複的狀態語言，使錯誤只有一個真實來源。
- 為進階設定增加漸進式披露，同時保持核心設定快速。

建議的驗證方式：

- 針對首次執行設定和現有使用者啟動進行手動快樂路徑測試。
- 針對任何路由、組態持久性或狀態推導邏輯進行專注測試。
- 針對變更的響應式層面提供瀏覽器截圖。

## Phase 3: Frontend architecture tightening

在不進行大規模重寫的情況下提高可維護性。

- 將重複的 UI 狀態轉換移至狹窄的類型化輔助函式中。
- 保持資料獲取、持久化和展示職責分離。
- 優先使用現有的 hooks、stores 和元件模式，而不是新的抽象層。
- 僅當拆分能減少耦合或使測試更清晰時，才拆分過大的元件。
- 避免為區域性面板互動引入廣泛的全域狀態。

必要的防護措施：

- 不要將檔案拆分作為改變公開行為的副作用。
- 保持選單、對話方塊、索引標籤和鍵盤導覽的無障礙行為完整。
- 驗證載入中、空、錯誤和樂觀狀態是否仍能正常呈現。

## Phase 4: Performance and reliability

針對經過測量的痛點，而不是廣泛的理論優化。

- 測量啟動、路由轉換、大型清單和聊天記錄的成本。
- 在分析證明有價值的地方，使用記憶化的選擇器或快取的輔助函式替換重複的昂貴衍生資料。
- 在熱路徑上減少可避免的網路或檔案系統掃描。
- 在建構模型 Payload 之前，保持提示詞、註冊表、檔案、外掛和網路輸入的確定性順序。
- 為熱門輔助函式和合約邊界添加輕量級回歸測試。

完成的定義：

- 每次效能變更都會記錄基線、預期影響、實際影響和剩餘差距。
- 當有廉價的測量方法可用時，不僅憑直覺發布效能修補程式。

## Phase 5: Type, contract, and test hardening

提高使用者和外掛作者所依賴的邊界點的正確性。

- 使用可辨別聯合或封閉程式碼清單替換鬆散的執行時字串。
- 使用現有的 Schema 輔助函式或 zod 驗證外部輸入。
- 圍繞外掛清單、提供者目錄、閘道通訊協定訊息和設定遷移行為新增合約測試。
- 將相容性路徑保留在診斷或修復流程中，而不是啟動時的隱藏遷移中。
- 避免僅測試與外掛內部的耦合；使用 SDK 外觀和記載的桶檔案。

建議的驗證方式：

- `pnpm check:changed`
- 針對每個變更的邊界進行目標測試。
- `pnpm build` 當惰性邊界、封裝或已發布的介面發生變化時。

## Phase 6: Documentation and release readiness

保持使用者面對的文件與行為一致。

- 隨行為、API、配置、入門或外掛程式的變更新文件。
- 僅針對使用者可見的變更新增變更紀錄條目。
- 保持外掛程式術語對使用者可見；僅在對貢獻者必要時
  使用內部套件名稱。
- 確認發布和安裝說明仍符合目前的指令
  介面。

完成定義：

- 相關文件在與行為變更相同的分支中更新。
- 當觸及時，產生的文件或 API 偏移檢查通過。
- 移交文件需指出任何跳過的驗證及其跳過原因。

## 建議的第一個部分

從範圍明確的 Control UI 和入門流程開始：

- 審查首次執行設定、提供者驗證準備度、閘道狀態和外掛程式
  設定介面。
- 移除無效操作並釐清失敗狀態。
- 為狀態推導和配置持久化新增或更新專注的測試。
- 執行 `pnpm check:changed`。

這能以有限的架構風險提供高使用者價值。

## 前端技能更新

使用此區段更新隨現代化任務提供的以前端為重點的 `SKILL.md`。如果將此指引採用為本機 OpenClaw 技能，
請先建立 `.agents/skills/openclaw-frontend/SKILL.md`，保留屬於該目標技能的前置資料，
然後使用以下內容新增或取代正文指引。

```markdown
# Frontend Delivery Standards

Use this skill when implementing or reviewing user-facing React, Next.js,
desktop webview, or app UI work.

## Operating rules

- Start from the existing product workflow and code conventions.
- Prefer the smallest correct patch that improves the current user path.
- Separate required fixes from optional polish in the handoff.
- Do not build marketing pages when the request is for an application surface.
- Keep actions visible and usable across supported viewport sizes.
- Remove dead affordances instead of leaving controls that cannot act.
- Preserve loading, empty, error, success, and permission states.
- Use existing design-system components, hooks, stores, and icons before adding
  new primitives.

## Implementation checklist

1. Identify the primary user task and the component or route that owns it.
2. Read the local component patterns before editing.
3. Patch the narrowest surface that solves the issue.
4. Add responsive constraints for fixed-format controls, toolbars, grids, and
   counters so text and hover states cannot resize the layout unexpectedly.
5. Keep data loading, state derivation, and rendering responsibilities clear.
6. Add tests when logic, persistence, routing, permissions, or shared helpers
   change.
7. Verify the main happy path and the most relevant edge case.

## Visual quality gates

- Text must fit inside its container on mobile and desktop.
- Toolbars may wrap, but controls must remain reachable.
- Buttons should use familiar icons when the icon is clearer than text.
- Cards should be used for repeated items, modals, and framed tools, not for
  every page section.
- Avoid one-note color palettes and decorative backgrounds that compete with
  operational content.
- Dense product surfaces should optimize for scanning, comparison, and repeated
  use.

## Handoff format

Report:

- What changed.
- What user behavior changed.
- Required validation that passed.
- Any validation skipped and the concrete reason.
- Optional follow-up work, clearly separated from required fixes.
```
