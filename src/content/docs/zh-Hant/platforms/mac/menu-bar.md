---
summary: "選單列狀態邏輯與向使用者顯示的內容"
read_when:
  - Tweaking mac menu UI or status logic
title: "選單列"
---

# 選單列狀態邏輯

## 顯示內容

- 我們會在選單列圖示和選單的第一個狀態列中顯示目前的代理程式工作狀態。
- 工作進行中時會隱藏健康狀態；當所有工作階段都處於閒置狀態時會再次顯示。
- 選單中的「節點」 區塊僅列出**裝置**（透過 `node.list` 配對的節點），不列出客戶端/在線條目。
- 當提供者使用量快照可用時，「使用量」 區塊會出現在「內容」 下。

## 狀態模型

- 工作階段：事件隨附 `runId`（每次執行）以及 Payload 中的 `sessionKey` 到達。「主要」 工作階段的鍵為 `main`；如果不存在，我們會回退到最近更新的工作階段。
- 優先順序：main 總是優先。如果 main 處於活躍狀態，則會立即顯示其狀態。如果 main 處於閒置狀態，則會顯示最近活躍的非 main 工作階段。我們不會在活動中途反覆切換；僅當目前工作階段進入閒置狀態或 main 變為活躍時才會切換。
- 活動種類：
  - `job`：高階命令執行 (`state: started|streaming|done|error`)。
  - `tool`：具有 `toolName` 和 `meta/args` 的 `phase: start|result`。

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
- 預設 → 🛠️

### 視覺對應

- `idle`：正常的小生物。
- `workingMain`：帶有圖示的徽章、完整色調、腿部「工作中」動畫。
- `workingOther`：帶有圖示的徽章、柔色調、無奔忙動畫。
- `overridden`：無論活動狀態如何，均使用所選的圖示/色調。

## 狀態列文字 (選單)

- 工作中時：`<Session role> · <activity label>`
  - 範例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 閒置時：回退至健康摘要。

## 事件攝取

- 來源：控制通道 (control‑channel) `agent` 事件 (`ControlChannel.handleAgentEvent`)。
- 解析欄位：
  - `stream: "job"` 搭配 `data.state` 用於開始/停止。
  - `stream: "tool"` 附帶 `data.phase`、`name`，可選的 `meta`/`args`。
- 標籤：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：縮短的路徑。
  - `edit`：路徑加上從 `meta`/diff 推斷的變更類型。
  - fallback：工具名稱。

## 偵錯覆寫

- Settings ▸ Debug ▸ “Icon override” 選擇器：
  - `System (auto)` (預設)
  - `Working: main` (依工具類型)
  - `Working: other` (依工具類型)
  - `Idle`
- 透過 `@AppStorage("iconOverride")` 儲存；對應至 `IconState.overridden`。

## 測試檢查清單

- 觸發主會話工作：驗證圖示立即切換，且狀態列顯示主要標籤。
- 在主會話閒置時觸發非主會話工作：圖示/狀態顯示非主會話；在完成前保持穩定。
- 在其他作用中時啟動主會話：圖示立即切換為主會話。
- 快速工具連續呼叫：確保徽章不會閃爍（工具結果的 TTL 寬限期）。
- 一旦所有會話閒置，健康狀態列會重新出現。
