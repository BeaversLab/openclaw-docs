---
summary: "Menu bar status logic and what is surfaced to users"
read_when:
  - Tweaking mac menu UI or status logic
title: "Menu Bar"
---

# Menu Bar Status Logic

## What is shown

- We surface the current agent work state in the menu bar icon and in the first status row of the menu.
- Health status is hidden while work is active; it returns when all sessions are idle.
- The “Nodes” block in the menu lists **devices** only (paired nodes via `node.list`), not client/presence entries.
- A “Usage” section appears under Context when provider usage snapshots are available.

## State model

- Sessions: events arrive with `runId` (per-run) plus `sessionKey` in the payload. The “main” session is the key `main`; if absent, we fall back to the most recently updated session.
- Priority: main always wins. If main is active, its state is shown immediately. If main is idle, the most recently active non‑main session is shown. We do not flip‑flop mid‑activity; we only switch when the current session goes idle or main becomes active.
- Activity kinds:
  - `job`: high‑level command execution (`state: started|streaming|done|error`).
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
- `workingMain`: badge with glyph, full tint, leg “working” animation.
- `workingOther`: badge with glyph, muted tint, no scurry.
- `overridden`: uses the chosen glyph/tint regardless of activity.

## Status row text (menu)

- While work is active: `<Session role> · <activity label>`
  - 範例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 閒置時：回退到健康摘要。

## 事件接收

- 來源：control‑channel `agent` 事件（`ControlChannel.handleAgentEvent`）。
- 解析欄位：
  - 帶有 `data.state` 的 `stream: "job"`，用於開始/停止。
  - 帶有 `data.phase`、`name`、可選 `meta`/`args` 的 `stream: "tool"`。
- 標籤：
  - `exec`：`args.command` 的第一行。
  - `read`/`write`：縮短的路徑。
  - `edit`：路徑加上來自 `meta`/diff 計數的推斷變更類型。
  - 回退：工具名稱。

## 偵錯覆寫

- Settings ▸ Debug ▸ “Icon override” 選擇器：
  - `System (auto)`（預設）
  - `Working: main`（依工具種類）
  - `Working: other`（依工具種類）
  - `Idle`
- 透過 `@AppStorage("iconOverride")` 儲存；對應到 `IconState.overridden`。

## 測試檢查清單

- 觸發主要 session 工作：驗證圖示立即切換，且狀態列顯示主要標籤。
- 在主要 session 閒置時觸發非主要 session 工作：圖示/狀態顯示非主要；保持穩定直到完成。
- 在其他作用中時啟動主要 session：圖示立即切換到主要。
- 快速工具爆發：確保徽章不會閃爍（工具結果上的 TTL 寬限期）。
- 所有 session 閒置後，健康列會重新出現。
