---
summary: "針對可靠互動式程序監督（PTY + 非 PTY）的生產計劃，具有明確的所有權、統一的生命週期以及確定性清理"
read_when:
  - 正在處理 exec/process 生命週期所有權與清理
  - 除錯 PTY 與非 PTY 監督行為
owner: "openclaw"
status: "in-progress"
last_updated: "2026-02-15"
title: "PTY 與程序監督計劃"
---

# PTY 與程序監督計劃

## 1. 問題與目標

我們需要一個可靠的生命週期來處理跨以下情境的長期命令執行：

- `exec` 前景執行
- `exec` 背景執行
- `process` 後續動作（`poll`、`log`、`send-keys`、`paste`、`submit`、`kill`、`remove`）
- CLI agent runner 子程序

目標不僅僅是支援 PTY。目標是實現可預測的所有權、取消、逾時和清理，且不使用不安全的程序匹配啟發式方法。

## 2. 範圍與邊界

- 將實作保留在 `src/process/supervisor` 內部。
- 不要为此創建新的套件。
- 在實際可行的情況下，保持目前行為的相容性。
- 不要將範圍擴大到終端機重播或 tmux 風格的會話持久性。

## 3. 本分支已實作內容

### 監督器基準已存在

- 監督器模組已置於 `src/process/supervisor/*` 之下。
- Exec 執行時與 CLI runner 已經透過監督器產生 (spawn) 與等待 (wait) 進行路由。
- 註冊表的最終處理具備等冪性。

### 此階段已完成

1. 明確的 PTY 命令合約

- `SpawnInput` 現在是 `src/process/supervisor/types.ts` 中的一個辨別聯集。
- PTY 執行需要 `ptyCommand`，而不是重用通用的 `argv`。
- 監督器不再在 `src/process/supervisor/supervisor.ts` 中從 argv 連接重新建構 PTY 命令字串。
- Exec 執行時現在會在 `src/agents/bash-tools.exec-runtime.ts` 中直接傳遞 `ptyCommand`。

2. 程序層級類型解耦

- 監督器類型不再從 agents 匯入 `SessionStdin`。
- Process local stdin contract lives in `src/process/supervisor/types.ts` (`ManagedRunStdin`)。
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

- `reconcileOrphans()` remains a no-op in `src/process/supervisor/supervisor.ts` by design.
- 程序重新啟動後，不會復原活躍的執行（run）。
- 對此實作階段而言，此邊界是有意為之的，以避免部分持久化的風險。

### 後續維護事項

1. `runExecProcess` 在 `src/agents/bash-tools.exec-runtime.ts` 中仍處理多項職責，且可在後續工作中拆分為專注的輔助函式。

## 5. 實作計畫

所需可靠性與合約項目的實作階段已完成。

已完成項目：

- `process kill/remove` 備援真實終止
- 用於子配接器預設終止路徑的程序樹取消
- 備援終止與子配接器終止路徑的回歸測試
- 明確 `ptyCommand` 下的 PTY 指令邊緣案例測試
- 明確的記憶體內重新啟動邊界，其中 `reconcileOrphans()` 依設計為無操作

選用後續事項：

- 將 `runExecProcess` 拆分為專注的輔助函式且無行為差異

## 6. 檔案對應

### 程序監督器

- `src/process/supervisor/types.ts` 已更新，具備可辨別的生成輸入與程序本地 stdin 合約。
- `src/process/supervisor/supervisor.ts` 已更新，以使用明確的 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 與 `src/process/supervisor/adapters/pty.ts` 已與代理程式類型解耦。
- `src/process/supervisor/registry.ts` 的等幂最終化保持不變並予以保留。

### Exec 與程序整合

- `src/agents/bash-tools.exec-runtime.ts` 已更新，以明確傳遞 PTY 指令並保留備援路徑。
- `src/agents/bash-tools.process.ts` 已更新，透過監督器取消，並具備真實程序樹備援終止。
- `src/agents/bash-tools.shared.ts` 已移除直接終止輔助路徑。

### CLI 可靠性

- `src/agents/cli-watchdog-defaults.ts` 已新增作為共用基準。
- `src/agents/cli-backends.ts` 與 `src/agents/cli-runner/reliability.ts` 現在使用相同的預設值。

## 7. 本階段的驗證執行

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

Typecheck 註記：

- 在本 repo 中使用 `pnpm build`（以及 `pnpm check` 進行完整的 lint/docs 檢查）。提及 `pnpm tsgo` 的較舊註記已過時。

## 8. 保留的操作保證

- Exec env 硬化行為保持不變。
- 核准與允許清單流程保持不變。
- 輸出清理與輸出上限保持不變。
- PTY 配接器仍保證在強制終止與監聽器處置時等待結算。

## 9. 完成定義

1. Supervisor 是受管理執行的生命週期擁有者。
2. PTY spawn 使用明確的命令合約，不進行 argv 重建。
3. Process 層對於 supervisor stdin 合約在型別上不依賴 agent 層。
4. Watchdog 預設值是單一來源。
5. 目標的 unit 與 e2e 測試保持綠燈。
6. 重新啟動的持久性邊界已明確記載或完整實作。

## 10. 總結

此分支現在具備連貫且更安全的監督架構：

- 明確的 PTY 合約
- 更乾淨的 process 分層
- 由 supervisor 驅動的程序操作取消路徑
- 當 supervisor 查詢落空時的真正備援終止
- 用於 child-run 預設 kill 路徑的程序樹取消
- 統一的 watchdog 預設值
- 明確的記憶體內重新啟動邊界（此階段不進行跨重新啟動的孤立程序協調）

import en from "/components/footer/en.mdx";

<en />
