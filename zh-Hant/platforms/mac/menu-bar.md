---
summary: "Menu bar status logic and what is surfaced to users"
read_when:
  - Tweaking mac menu UI or status logic
title: "Menu Bar"
---

# 選單列狀態邏輯

## 顯示內容

- 我們會在選單列圖示以及選單的第一個狀態列中顯示目前的代理程式工作狀態。
- 當工作進行中時，健康狀態會隱藏；當所有工作階段閒置時，健康狀態會恢復顯示。
- 選單中的「Nodes」區塊僅列出 **devices**（裝置）（透過 `node.list` 配對的節點），而不列出客戶端/狀態條目。
- 當有提供者使用量快照可用時，會在 Context 下方顯示「Usage」區段。

## 狀態模型

- Sessions：事件隨附 `runId`（每次執行）以及 Payload 中的 `sessionKey` 到達。「主要」Session 是鍵值 `main`；若不存在，我們則回退至最近更新的 Session。
- 優先順序：main 永遠優先。如果 main 處於作用中狀態，會立即顯示其狀態。如果 main 處於閒置狀態，則會顯示最近作用中的非 main 工作階段。我們不會在活動中途反覆切換；僅在當前工作階段變為閒置或 main 變為作用中時才會切換。
- 活動種類：
  - `job`：高層級指令執行 (`state: started|streaming|done|error`)。
  - `tool`：帶有 `toolName` 和 `meta/args` 的 `phase: start|result`。

## IconState 列舉 (Swift)

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（debug override，除錯覆寫）

### ActivityKind → 圖示

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- 預設 → 🛠️

### 視覺對應

- `idle`：正常的小生物。
- `workingMain`：帶有符號的標記、完整著色、腿部「工作」動畫。
- `workingOther`：帶有符號的標記、靜音著色、無快速移動。
- `overridden`：無論活動狀態如何，皆使用選定的符號/著色。

## 狀態列文字 (選單)

- 當工作進行中時：`<Session role> · <activity label>`
  - 範例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 閒置時：回退到健康摘要。

## 事件攝取

- 來源：控制通道 `agent` 事件 (`ControlChannel.handleAgentEvent`)。
- 解析欄位：
  - 帶有 `data.state` 的 `stream: "job"`，用於開始/停止。
  - 帶有 `data.phase`、`name`、選用 `meta`/`args` 的 `stream: "tool"`。
- 標籤：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：縮短的路徑。
  - `edit`：路徑加上從 `meta`/diff counts 推斷的變更種類。
  - 回退：工具名稱。

## Debug 覆寫

- Settings ▸ Debug ▸ “Icon override” 選擇器：
  - `System (auto)` (預設)
  - `Working: main` (依工具種類)
  - `Working: other` (依工具種類)
  - `Idle`
- 透過 `@AppStorage("iconOverride")` 儲存；對應至 `IconState.overridden`。

## 測試檢查清單

- 觸發主要工作階段工作：驗證圖示是否立即切換，以及狀態列是否顯示主要標籤。
- 當主要工作階段閒置時觸發非主要工作階段工作：圖示/狀態顯示非主要；保持穩定直到完成。
- 當其他工作進行中時啟動主要工作：圖示立即翻轉為主要。
- 快速工具連發：確保徽章不會閃爍 (工具結果上的 TTL 寬限期)。
- 一旦所有工作階段閒置，健康列就會重新出現。

import en from "/components/footer/en.mdx";

<en />
