---
doc-schema-version: 1
summary: "Session goals: durable per-session objectives, /goal controls, model goal tools, token budgets, and TUI status"
read_when:
  - You want OpenClaw to keep one objective visible across a long session
  - You need to pause, resume, block, complete, or clear a session goal
  - You want to understand the get_goal, create_goal, and update_goal tools
  - You want to see how goals appear in the TUI
title: "Goal"
---

# 目標

一個 **目標 (goal)** 是附屬於當前 OpenClaw 會話的持久目標。它為代理和操作員提供一個長期工作的共同目標，而無需將該目標轉化為背景任務、提醒、定時任務或常駐指令。

目標是會話狀態。它們隨會話金鑰移動，在進程重啟後保留，出現在 `/goal` 中，可透過目標工具供模型使用，並且當活動會話有目標時會顯示在 TUI 頁尾。

## 快速開始

設定目標：

```text
/goal start get CI green for PR 87469 and push the fix
```

查看它：

```text
/goal
```

當工作刻意等待時暫停它：

```text
/goal pause waiting for CI
```

恢復它：

```text
/goal resume
```

標記為完成：

```text
/goal complete pushed and verified
```

清除它：

```text
/goal clear
```

## 目標的用途

當會話有一個具體的結果且該結果應在多輪對話中保持可見時，請使用目標：

- PR 收尾：修復、驗證、自動審查、推送，以及開啟或更新 PR。
- 除錯運行：重現錯誤、識別負責的介面、修補並證明修復有效。
- 文件修訂：閱讀相關文件、撰寫新頁面、交叉連結，並驗證文件建置。
- 維護任務：檢查當前狀態、進行有限制的變更、執行正確的檢查，並報告變更內容。

目標不是任務佇列。當工作應分離運行、按計畫重複、分散到受管理的子工作中，或作為策略持久存在時，請使用 [Task Flow](/zh-Hant/automation/taskflow)、[tasks](/zh-Hant/automation/tasks)、[cron jobs](/zh-Hant/automation/cron-jobs) 或 [standing orders](/zh-Hant/automation/standing-orders)。

## 指令參考

不帶參數的 `/goal` 會列印當前目標摘要：

```text
Goal
Status: active
Objective: get CI green for PR 87469 and push the fix
Tokens used: 12k
Token budget: 12k/50k

Commands: /goal pause, /goal complete, /goal clear
```

指令：

- `/goal` 或 `/goal status` 顯示當前目標。
- `/goal start <objective>` 為當前會話建立一個新目標。
- `/goal set <objective>` 和 `/goal create <objective>` 是 `start` 的別名。
- `/goal pause [note]` 暫停活動目標。
- `/goal resume [note]` 恢復已暫停、封鎖、使用受限或預算受限的目標。
- `/goal complete [note]` 將目標標記為已達成。
- `/goal done [note]` 是 `complete` 的別名。
- `/goal block [note]` 將目標標記為受阻。
- `/goal blocked [note]` 是 `block` 的別名。
- `/goal clear` 從會話中移除目標。

一次只能存在一個會話目標。啟動第二個目標將會失敗，直到清除當前目標為止。

## 狀態

目標使用一個小型狀態集：

- `active`：會話正在追求該目標。
- `paused`：操作員暫停了該目標；`/goal resume` 將其重新啟用。
- `blocked`：代理或操作員報告了實際阻礙；`/goal resume` 會在取得新資訊或狀態時將其重新啟用。
- `budget_limited`：已達到設定的 token 預算；`/goal resume` 會從相同目標重新開始追求。
- `usage_limited`：保留給使用限制停止狀態；`/goal resume` 在允許時重新開始追求。
- `complete`：目標已達成。完成的目標是終結狀態；在開始另一個目標前請使用 `/goal clear`。

`/new` 和 `/reset` 會清除當前會話目標，因為它們會刻意啟動新的會話上下文。

## Token 預算

目標可以選擇設定正數的 token 預算。預算與目標一起儲存，並從建立時會話的新鮮 token 計數開始測量。如果在目標開始時，當前會話只有過期或未知的 token 使用量，OpenClaw 會等待下一次新鮮的會話 token 快照並將其作為基準，因此目標存在之前消耗的 token 不會計入該目標。

當 token 使用量達到預算時，目標會變更為 `budget_limited`。這不會刪除目標或清除目標內容。它告知操作員和代理，在恢復或清除之前，該目標將不再被主動追求。

Token 預算是會話目標的防護措施，而非計費上限。提供者配額、成本報告和上下文視窗行為仍使用正常的 OpenClaw 使用量和模型控制。

## 模型工具

OpenClaw 向 agent harness 公開了三個核心目標工具：

- `get_goal`：讀取目前的工作階段目標，包括狀態、目標、token 使用量和 token 預算。
- `create_goal`：僅當使用者、系統或開發者指示明確請求時才建立目標。如果工作階段已經有目標，它會失敗。
- `update_goal`：將目標標記為 `complete` 或 `blocked`。

模型不能靜默地暫停、恢復、清除或替換目標。這些是操作員/工作階段透過 `/goal` 和重置命令進行的控制。這可以防止代理在不移動目標的情況下悄悄移動目標，同時為代理報告成就或真正的阻礙保留一條乾淨的路徑。

`update_goal` 工具應僅在目標實際達成時將目標標記為 `complete`。應僅在相同的阻礙條件重複且代理在沒有新的使用者輸入或外部狀態變更的情況下無法取得有意義的進展時，將目標標記為 `blocked`。

## TUI

TUI 會讓目前工作階段的目標顯示在頁尾中，位於 agent、工作階段、模型、執行控制和 token 計數旁邊。

頁尾範例：

- `Pursuing goal (12k/50k)` 表示具有 token 預算的進行中目標。
- `Goal paused (/goal resume)` 表示已暫停的目標。
- `Goal blocked (/goal resume)` 表示已阻礙的目標。
- `Goal hit usage limits (/goal resume)` 表示受限於使用量的目標。
- `Goal unmet (50k/50k)` 表示受限於預算的目標。
- `Goal achieved (42k)` 表示已完成的目標。

頁尾經過特意設計以求簡潔。請使用 `/goal` 來查看完整的目標、備註、token 預算和可用指令。

## 通道行為

`/goal` 指令可在支援指令的 OpenClaw 工作階段中使用，包括允許文字指令的 TUI 和聊天介面。目標狀態附加於工作階段金鑰，而非傳輸方式。如果兩個介面使用相同的工作階段，它們會看到相同的目標。

目標狀態不是傳送指示。它不會強制透過通道回覆、變更佇列行為、核准工具或排程工作。

## 疑難排解

`Goal error: goal already exists` 表示該會話已經有一個目標。使用
`/goal` 來檢視它，如果已完成則使用 `/goal complete`，或在開始不同的目標前使用 `/goal clear`。

`Goal error: goal not found` 表示該會話尚無目標。使用
`/goal start <objective>` 來開始一個目標。

`Goal error: goal is already complete` 表示目標已終止。在開始或恢復另一個目標之前將其清除。

如果 Token 使用量看起來像 `0` 或陳舊，則作用中的會話可能尚未有最新的 Token 快照。使用量會隨著 OpenClaw 記錄會話使用量和從對話記錄衍生的總計而重新整理。

## 相關

- [斜線指令](/zh-Hant/tools/slash-commands)
- [TUI](/zh-Hant/web/tui)
- [Session 工具](/zh-Hant/concepts/session-tool)
- [壓縮](/zh-Hant/concepts/compaction)
- [任務流程](/zh-Hant/automation/taskflow)
- [常駐指令](/zh-Hant/automation/standing-orders)
