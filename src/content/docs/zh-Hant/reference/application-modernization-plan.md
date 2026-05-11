---
summary: "包含前端交付技能更新的綜合應用程式現代化計畫"
title: "應用程式現代化計畫"
read_when:
  - Planning a broad OpenClaw application modernization pass
  - Updating frontend implementation standards for app or Control UI work
  - Turning a broad product quality review into phased engineering work
---

# 應用程式現代化計畫

## 目標

在破壞目前工作流程或將風險隱藏在廣泛重構中的情況下，將應用程式推向更乾淨、更快速、更易於維護的產品。工作應作為小型、可審查的區塊落地，並為每個接觸的表面提供證明。

## 原則

- 除非邊界被證明會導致變動、效能成本或使用者可見的錯誤，否則請保留目前的架構。
- 對於每個問題，請優先選擇最小且正確的修補程式，然後重複執行。
- 將必要的修復與可選的潤飾分開，以便維護人員可以在無需等待主觀決策的情況下落地高價值的工作。
- 保持面向外掛程式的行為已記錄在文件中且向後相容。
- 在聲稱回歸已修復之前，請驗證已發佈的行為、相依性合約和測試。
- 首先改善主要的使用者路徑：入門導覽、驗證、聊天、供應商設定、外掛程式管理和診斷。

## 第 1 階段：基準審查

在變更應用程式之前，先盤點目前的應用程式。

- 識別頂級的使用者工作流程及其擁有的程式碼表面。
- 列出無效的功能、重複的設定、不清楚的錯誤狀態以及昂貴的算繪路徑。
- 擷取每個表面的目前驗證指令。
- 將問題標記為必要、建議或可選。
- 記錄需要擁有者審查的已知阻礙因素，特別是 API、安全性、發佈和外掛程式合約的變更。

完成定義：

- 一個包含儲存庫根目錄檔案參考的問題清單。
- 每個問題都有嚴重性、擁有者表面、預期的使用者影響以及建議的驗證路徑。
- 沒有推測性的清理項目混合在必要的修復中。

## 第 2 階段：產品與 UX 清理

優先考慮可見的工作流程並消除混淆。

- 強化模型驗證、閘道狀態和外掛程式設定周圍的入門導覽文字和空白狀態。
- 移除或停用無法執行任何操作的無效功能。
- 在各種回應寬度下保持重要的操作可見，而不是將其隱藏在脆弱的版面假設後面。
- 合併重複的狀態描述，以便錯誤訊息具有唯一的真實來源。
- 在保持核心設定快速的同時，為進階設定新增漸進式顯示。

建議的驗證方式：

- 針對首次設定與現有使用者啟動進行手動快樂路徑測試。
- 針對任何路由、設定持久化或狀態推導邏輯進行專注測試。
- 針對變更的響應式介面提供瀏覽器擷圖。

## 第 3 階段：前端架構收緊

在無需大規模重寫的情況下提升可維護性。

- 將重複的 UI 狀態轉換移至狹窄的型別輔助函式。
- 保持資料獲取、持久化與展示職責的分離。
- 優先選用既有的 hooks、stores 與元件模式，而非建立新的抽象層。
- 僅當分割元件能降低耦合或讓測試更清晰時，才進行分割。
- 避免為區域性的面板互動引入廣泛的全域狀態。

必要的防護措施：

- 不得將檔案分割作為改變公開行為的副作用。
- 保持選單、對話框、分頁與鍵盤導覽的無障礙行為完整不變。
- 確認載入中、空值、錯誤與樂觀狀態仍能正常渲染。

## 第 4 階段：效能與可靠性

針對可測量的痛點進行優化，而非廣泛的理論性優化。

- 測量啟動、路由切換、大型清單與聊天記錄的成本。
- 在分析證明具效益之處，以記憶化的選擇器或快取輔助函式取代重複且昂貴的衍生資料。
- 在熱門路徑上減少可避免的網路或檔案系統掃描。
- 在建構模型酬載前，保持提示詞、註冊表、檔案、外掛與網路輸入的確定性排序。
- 為熱門輔助函式與契約邊界新增輕量級的回歸測試。

完成定義：

- 每次效能變更皆須記錄基準、預期影響、實際影響與剩餘差距。
- 當可進行低成本測量時，不僅憑直覺提交效能修補。

## 第 5 階段：型別、契約與測試強化

提高使用者與外掛作者依賴的邊界點的正確性。

- 以可辨別聯集或封閉程式碼清單取代鬆散的執行期字串。
- 使用既有的 schema 輔助函式或 zod 驗證外部輸入。
- 在插件清單、提供者目錄、閘道協定訊息與設定遷移行為周圍新增契約測試。
- 將相容性路徑保留在診斷或修復流程中，而非啟動時期的隱藏遷移。
- 避免僅在測試中與外掛內部實作耦合；請使用 SDK 外觀和記載的 barrels。

建議的驗證方式：

- `pnpm check:changed`
- 針對每個變更邊界的專項測試。
- 當延遲邊界、打包或發布介面變更時執行 `pnpm build`。

## 第 6 階段：文件與發布準備

保持使用者面向文件與實際行為一致。

- 根據行為、API、設定、上架或外掛的變更來更新文件。
- 僅針對使用者可見的變更新增變更記錄條目。
- 保持外掛術語對使用者可見；僅在貢獻者需要時使用內部套件名稱。
- 確認發布與安裝說明仍與目前的指令介面相符。

完成的定義：

- 相關文件會在與行為變更相同的分支中更新。
- 產生的文件或 API 偏差檢查在變動時通過。
- 移交內容會指出任何跳過的驗證項目及其跳過原因。

## 建議的首次切分

從限定的 Control UI 與上架流程開始：

- 稽核首次執行設定、提供者驗證就緒狀態、閘道狀態以及外掛設定介面。
- 移除失效的操作並釐清失敗狀態。
- 新增或更新針對狀態推導與設定持久化的專項測試。
- 執行 `pnpm check:changed`。

這能以有限的架構風險提供高使用者價值。

## 前端技能更新

請使用此區段更新現代化任務中提供的面向前端的 `SKILL.md`。若採用此指引作為本機儲存庫的 OpenClaw 技能，請先建立 `.agents/skills/openclaw-frontend/SKILL.md`，保留屬於該目標技能的 frontmatter，然後使用以下內容新增或替換正文指引。

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
