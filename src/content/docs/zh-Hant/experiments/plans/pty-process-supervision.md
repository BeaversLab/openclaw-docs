---
summary: "生產計畫，用於可靠的互動式進程監督（PTY + 非 PTY），具有明確的所有權、統一的生命週期和確定性的清理"
read_when:
  - Working on exec/process lifecycle ownership and cleanup
  - Debugging PTY and non-PTY supervision behavior
owner: "openclaw"
status: "進行中"
last_updated: "2026-02-15"
title: "PTY 與進程監督計畫"
---

# PTY 與進程監督計畫

## 1. 問題與目標

我們需要一個可靠的長時間執行命令生命週期，涵蓋：

- `exec` 前台執行
- `exec` 背景執行
- `process` 後續動作 (`poll`, `log`, `send-keys`, `paste`, `submit`, `kill`, `remove`)
- CLI agent runner 子進程

目標不僅僅是支援 PTY。目標是可預測的所有權、取消、逾時和清理，且不使用不安全的進程匹配啟發式方法。

## 2. 範圍與邊界

- 將實作保留在 `src/process/supervisor` 內部。
- 不要為此建立一個新的套件。
- 在實務上保持目前行為的相容性。
- 不要將範圍擴大到終端機重播或 tmux 樣式的會話持久性。

## 3. 本分支中已實作的內容

### Supervisor 基準已存在

- Supervisor 模組已置於 `src/process/supervisor/*` 之下。
- Exec runtime 和 CLI runner 已經透過 supervisor spawn 和 wait 進行路由。
- Registry 最終處理是冪等的。

### 此階段已完成

1. 明確的 PTY 命令合約

- `SpawnInput` 現在是 `src/process/supervisor/types.ts` 中的一個可辨識聯集。
- PTY 執行需要 `ptyCommand`，而不是重複使用通用的 `argv`。
- Supervisor 不再在 `src/process/supervisor/supervisor.ts` 中從 argv 連接重建 PTY 命令字串。
- Exec runtime 現在直接在 `src/agents/bash-tools.exec-runtime.ts` 中傳遞 `ptyCommand`。

2. 進程層類型解耦

- Supervisor types no longer import `SessionStdin` from agents.
- Process local stdin contract lives in `src/process/supervisor/types.ts` (`ManagedRunStdin`).
- Adapters now depend only on process level types:
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. Process tool lifecycle ownership improvement

- `src/agents/bash-tools.process.ts` now requests cancellation through supervisor first.
- `process kill/remove` now use process-tree fallback termination when supervisor lookup misses.
- `remove` keeps deterministic remove behavior by dropping running session entries immediately after termination is requested.

4. Single source watchdog defaults

- Added shared defaults in `src/agents/cli-watchdog-defaults.ts`.
- `src/agents/cli-backends.ts` consumes the shared defaults.
- `src/agents/cli-runner/reliability.ts` consumes the same shared defaults.

5. Dead helper cleanup

- Removed unused `killSession` helper path from `src/agents/bash-tools.shared.ts`.

6. Direct supervisor path tests added

- Added `src/agents/bash-tools.process.supervisor.test.ts` to cover kill and remove routing through supervisor cancellation.

7. Reliability gap fixes completed

- `src/agents/bash-tools.process.ts` now falls back to real OS-level process termination when supervisor lookup misses.
- `src/process/supervisor/adapters/child.ts` now uses process-tree termination semantics for default cancel/timeout kill paths.
- Added shared process-tree utility in `src/process/kill-tree.ts`.

8. PTY contract edge-case coverage added

- Added `src/process/supervisor/supervisor.pty-command.test.ts` for verbatim PTY command forwarding and empty-command rejection.
- Added `src/process/supervisor/adapters/child.test.ts` for process-tree kill behavior in child adapter cancellation.

## 4. Remaining gaps and decisions

### Reliability status

The two required reliability gaps for this pass are now closed:

- `process kill/remove` now has a real OS termination fallback when supervisor lookup misses.
- child cancel/timeout now uses process-tree kill semantics for default kill path.
- Regression tests were added for both behaviors.

### Durability and startup reconciliation

Restart behavior is now explicitly defined as in-memory lifecycle only.

- 根據設計，`reconcileOrphans()` 在 `src/process/supervisor/supervisor.ts` 中仍然是一個空操作。
- 程序重啟後不會恢復正在運行的實例。
- 此邊界是此實現階段有意為之，以避免部分持久化的風險。

### 可維護性後續工作

1. `runExecProcess` 在 `src/agents/bash-tools.exec-runtime.ts` 中仍然處理多種職責，可以在後續工作中拆分為專注的輔助程式。

## 5. 實作計畫

所需可靠性和契約項目的實現階段已完成。

已完成：

- `process kill/remove` 備援真實終止
- 子配接器預設殺死路徑的程序樹取消
- 備援殺死和子配接器殺死路徑的回歸測試
- 在明確的 `ptyCommand` 下進行的 PTY 指令邊緣情況測試
- 明確的記憶體內重啟邊界，根據設計 `reconcileOrphans()` 為空操作

可選後續工作：

- 將 `runExecProcess` 拆分為專注的輔助程式，且不改變行為

## 6. 檔案對應

### 程序監督器

- `src/process/supervisor/types.ts` 已更新，增加了可區分的生成輸入和程序本地 stdin 契約。
- `src/process/supervisor/supervisor.ts` 已更新以使用明確的 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 和 `src/process/supervisor/adapters/pty.ts` 已從代理程式類型解耦。
- `src/process/supervisor/registry.ts` 冪等最終化保持不變並被保留。

### Exec 和程序整合

- `src/agents/bash-tools.exec-runtime.ts` 已更新，以明確傳遞 PTY 指令並保留備援路徑。
- `src/agents/bash-tools.process.ts` 已更新，可透過監督器取消，並透過真實程序樹備援終止。
- `src/agents/bash-tools.shared.ts` 移除了直接殺死輔助路徑。

### CLI 可靠性

- `src/agents/cli-watchdog-defaults.ts` 已新增為共享基準。
- `src/agents/cli-backends.ts` 和 `src/agents/cli-runner/reliability.ts` 現在採用相同的預設值。

## 7. 本階段執行的驗證

單元測試：

- `pnpm vitest src/process/supervisor/registry.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.pty-command.test.ts`
- `pnpm vitest src/process/supervisor/adapters/child.test.ts`
- `pnpm vitest src/agents/cli-backends.test.ts`
- `pnpm vitest src/agents/bash-tools.exec.pty-cleanup.test.ts`
- `pnpm vitest src/agents/bash-tools.process.poll-timeout.test.ts`
- `pnpm vitest src/agents/bash-tools.process.supervisor.test.ts`
- `pnpm vitest src/process/exec.test.ts`

E2E 目標：

- `pnpm vitest src/agents/cli-runner.test.ts`
- `pnpm vitest run src/agents/bash-tools.exec.pty-fallback.test.ts src/agents/bash-tools.exec.background-abort.test.ts src/agents/bash-tools.process.send-keys.test.ts`

Typecheck 備註：

- 在此儲存庫中使用 `pnpm build`（以及 `pnpm check` 進行完整的 lint/docs 檢查）。提及 `pnpm tsgo` 的舊備註已過時。

## 8. 保留的操作保證

- Exec env 加強行為保持不變。
- 審核與許可清單流程保持不變。
- 輸出清理與輸出上限保持不變。
- PTY 配接器仍保證在強制終止和監聽器處置時等待結果。

## 9. 完成的定義

1. Supervisor 是受控執行的生命週期擁有者。
2. PTY 產生使用明確的指令合約，不進行 argv 重建。
3. Process 層對於 supervisor stdin 合約不依賴 agent 層的類型。
4. Watchdog 預設值為單一來源。
5. 目標單元測試與 e2e 測試保持綠燈（通過）。
6. 重新啟動持久性邊界已明確記錄或完整實作。

## 10. 總結

此分支現具備連貫且更安全的監督形狀：

- 明確的 PTY 合約
- 更清晰的 process 分層
- supervisor 驅動的程序操作取消路徑
- supervisor 查找未命中時的真正備用終止
- 子執行預設終止路徑的程序樹取消
- 統一的 watchdog 預設值
- 明確的記憶體內重新啟動邊界（此階段不進行重新啟動期間的孤立協調）
