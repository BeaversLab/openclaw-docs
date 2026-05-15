---
summary: "Menu bar status logic and what is surfaced to users"
read_when:
  - Tweaking mac menu UI or status logic
title: "選單列"
---

## 顯示內容

- 我們會在選單列圖示及選單的第一個狀態列中顯示目前的代理工作狀態。
- 當工作進行時，健康狀態會隱藏；當所有工作階段處於閒置狀態時，健康狀態會恢復顯示。
- 根層級的「Context」子選單包含最近的工作階段，而不是直接在根選單中展開它們。
- 根選單中的「Nodes」區塊僅列出 **裝置**（透過 `node.list` 配對的節點），不列出用戶端/在線項目。
- 當提供者使用情況快照可用時，根層級會在 Context 下方出現「Usage」區段，接著是使用費用的詳細資訊（如果有）。

## State model

- Sessions：事件隨 `runId`（每次執行）以及 Payload 中的 `sessionKey` 一起到達。「main」工作階段是鍵值 `main`；如果不存在，我們會回退到最近更新的工作階段。
- 優先順序：main 永遠優先。如果 main 處於活動狀態，其狀態會立即顯示。如果 main 處於閒置狀態，則會顯示最近活動的非 main 工作階段。我們不會在活動中途反覆切換；只有當前工作階段變為閒置或 main 變為活動時才會切換。
- Activity kinds:
  - `job`：高階指令執行 (`state: started|streaming|done|error`)。
  - `tool`: `phase: start|result` with `toolName` and `meta/args`.

## IconState enum (Swift)

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)` (debug override)

### ActivityKind → glyph

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- default → 🛠️

### Visual mapping

- `idle`: normal critter.
- `workingMain`：帶有圖示的徽章、完全著色、腿部「working」動畫。
- `workingOther`: badge with glyph, muted tint, no scurry.
- `overridden`: uses the chosen glyph/tint regardless of activity.

## Context 子選單

- 根選單顯示一個帶有工作階段計數/狀態的「Context」列，並開啟一個子選單。
- Context 子選單標頭顯示過去 24 小時內的活動工作階段數量。
- 每個工作階段列都保留了其 Token 列、存留時間、預覽、思考/詳細、重設、精簡和刪除動作。
- 載入中、已斷線和工作階段載入錯誤訊息會出現在 Context 子選單內。
- 提供者使用情況和使用費用詳細資訊保留在 Context 下方根層級，以便無需開啟子選單即可瀏覽。

## 狀態列文字（選單）

- 當工作進行時：`<Session role> · <activity label>`
  - 範例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 當閒置時：回退到健康摘要。

## 事件攝入

- 來源：control-channel `agent` 事件 (`ControlChannel.handleAgentEvent`)。
- 解析欄位：
  - `stream: "job"` 搭配 `data.state` 用於開始/停止。
  - `stream: "tool"` 搭配 `data.phase`、`name`、選用的 `meta`/`args`。
- 標籤：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：縮短的路徑。
  - `edit`：路徑加上來自 `meta`/diff 計數推斷的變更類型。
  - 備案：工具名稱。

## 除錯覆寫

- Settings ▸ Debug ▸ "Icon override" 選擇器：
  - `System (auto)` (預設)
  - `Working: main` (根據工具類型)
  - `Working: other` (根據工具類型)
  - `Idle`
- 透過 `@AppStorage("iconOverride")` 儲存；對應至 `IconState.overridden`。

## 測試檢查清單

- 觸發主要 session 工作：確認圖示立即切換，且狀態列顯示主要標籤。
- 當主要 session 閒置時觸發非主要 session 工作：圖示/狀態顯示非主要；直到完成前保持穩定。
- 當其他活動正在進行時啟動主要 session：圖示立即翻轉至主要 session。
- 快速工具爆發：確保徽章不會閃爍 (工具結果的 TTL 寬限期)。
- 一旦所有 session 閒置，健康狀態列會重新出現。

## 相關

- [macOS app](/zh-Hant/platforms/macos)
- [Menu bar icon](/zh-Hant/platforms/mac/icon)
