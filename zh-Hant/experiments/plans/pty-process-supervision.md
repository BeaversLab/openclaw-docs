---
summary: "可靠互動式程序監督（PTY 與非 PTY）的生產計畫，具備明確所有權、統一生命週期與確定性清理機制"
read_when:
  - Working on exec/process lifecycle ownership and cleanup
  - Debugging PTY and non-PTY supervision behavior
owner: "openclaw"
status: "進行中"
last_updated: "2026-02-15"
title: "PTY 與程序監督計畫"
---

# PTY 與程序監督計畫

## 1. 問題與目標

我們需要一個可靠的生命週期，以適用於以下長時間執行的命令執行：

- `exec` 前景執行
- `exec` 背景執行
- `process` 後續動作 (`poll`、`log`、`send-keys`、`paste`、`submit`、`kill`、`remove`)
- CLI agent runner 子程序

目標不僅僅是支援 PTY。目標是實現可預測的所有權、取消、逾時和清理，而不使用不安全的程序匹配啟發式方法。

## 2. 範圍與邊界

- 將實作保留在 `src/process/supervisor` 內部。
- 請勿為此建立新的套件。
- 在實務可行的情況下，保持與目前行為的相容性。
- 請勿將範圍擴大至終端機重播或 tmux 風格的工作階段持久化。

## 3. 此分支中已實作

### Supervisor 基線已存在

- Supervisor 模組已置於 `src/process/supervisor/*` 下。
- Exec runtime 與 CLI runner 已透過 supervisor spawn 與 wait 進行路由。
- Registry 最終處理具冪等性。

### 此階段已完成

1. 明確的 PTY 命令合約

- `SpawnInput` 現在是 `src/process/supervisor/types.ts` 中的辨別聯集。
- PTY 執行需要 `ptyCommand`，而非重複使用通用的 `argv`。
- Supervisor 不再於 `src/process/supervisor/supervisor.ts` 中從 argv 連接重建 PTY 命令字串。
- Exec runtime 現在直接在 `src/agents/bash-tools.exec-runtime.ts` 中傳遞 `ptyCommand`。

2. 程序層級類型解耦

- Supervisor 類型不再從 agents 導入 `SessionStdin`。
- Process 本地 stdin 合約位於 `src/process/supervisor/types.ts` (`ManagedRunStdin`)。
- Adapters 現在僅依賴 process 層級的類型：
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. Process 工具生命週期所有權改進

- `src/agents/bash-tools.process.ts` 現在首先通過 supervisor 請求取消。
- `process kill/remove` 現在在 supervisor 查找失敗時使用 process-tree 後備終止。
- `remove` 通過在請求終止後立即刪除正在運行的會話條目，保持了確定性的刪除行為。

4. 單一來源看門預設值

- 在 `src/agents/cli-watchdog-defaults.ts` 中添加了共享預設值。
- `src/agents/cli-backends.ts` 使用共享預設值。
- `src/agents/cli-runner/reliability.ts` 使用相同的共享預設值。

5. 失效的 helper 清理

- 從 `src/agents/bash-tools.shared.ts` 中移除了未使用的 `killSession` helper 路徑。

6. 添加了直接的 supervisor 路徑測試

- 添加了 `src/agents/bash-tools.process.supervisor.test.ts` 以涵蓋通過 supervisor 取消進行的 kill 和 remove 路由。

7. 可靠性缺口修復已完成

- `src/agents/bash-tools.process.ts` 現在在 supervisor 查找失敗時回退到真實的 OS 層級進程終止。
- `src/process/supervisor/adapters/child.ts` 現在對預設的 cancel/timeout kill 路徑使用 process-tree 終止語義。
- 在 `src/process/kill-tree.ts` 中添加了共享的 process-tree 工具程式。

8. 添加了 PTY 合約邊緣情況覆蓋

- 添加了 `src/process/supervisor/supervisor.pty-command.test.ts` 用於逐字的 PTY 指令轉發和空指令拒絕。
- 添加了 `src/process/supervisor/adapters/child.test.ts` 用於子 adapter 取消中的 process-tree kill 行為。

## 4. 剩餘的缺口和決策

### 可靠性狀態

此階段所需的兩個可靠性缺口現已關閉：

- `process kill/remove` 現在在 supervisor 查找失敗時具有真實的 OS 終止後備方案。
- 子 cancel/timeout 現在對預設 kill 路徑使用 process-tree kill 語義。
- 為這兩種行為添加了回歸測試。

### 持久性和啟動協調

重新啟動行為現在被明確定義為僅記憶體內生命週期。

- `reconcileOrphans()` 依設計在 `src/process/supervisor/supervisor.ts` 中仍為無操作。
- 程序重啟後不會恢復執行中的運行。
- 此邊界對於此實作階段是刻意的，以避免部分持久化的風險。

### 可維護性後續跟進

1. `runExecProcess` 在 `src/agents/bash-tools.exec-runtime.ts` 中仍處理多項職責，可在後續跟進中拆分為專注的輔助程式。

## 5. 實作計畫

所需可靠性和合約項目的實作階段已完成。

已完成：

- `process kill/remove` 後備真實終止
- 子介面卡預設殺出路徑的程序樹取消
- 後備殺死和子介面卡殺出路徑的回歸測試
- 明確 `ptyCommand` 下的 PTY 指令邊緣情況測試
- 明確的記憶體重啟邊界，依設計 `reconcileOrphans()` 為無操作

可選後續跟進：

- 將 `runExecProcess` 拆分為專注的輔助程式，且行為無變異

## 6. 檔案對照表

### 程序監督器

- `src/process/supervisor/types.ts` 已更新，包含可辨別的生成輸入和程序本地 stdin 合約。
- `src/process/supervisor/supervisor.ts` 已更新以使用明確的 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 和 `src/process/supervisor/adapters/pty.ts` 從代理程式類型解耦。
- `src/process/supervisor/registry.ts` 幾等最終處理保持不變並予以保留。

### 執行和程序整合

- `src/agents/bash-tools.exec-runtime.ts` 已更新以明確傳遞 PTY 指令並保留後備路徑。
- `src/agents/bash-tools.process.ts` 已更新以透過監督器取消，並使用真實程序樹後備終止。
- `src/agents/bash-tools.shared.ts` 移除了直接殺死輔助路徑。

### CLI 可靠性

- `src/agents/cli-watchdog-defaults.ts` 已新增為共用基準。
- `src/agents/cli-backends.ts` 和 `src/agents/cli-runner/reliability.ts` 現在使用相同的預設值。

## 7. 本階段驗證運行

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

型別檢查說明：

- 在此 repo 中使用 `pnpm build`（以及 `pnpm check` 以進行完整的 lint/docs 檢查）。提及 `pnpm tsgo` 的舊說明已過時。

## 8. 保留的運作保證

- Exec env 加固行為保持不變。
- 核准與允許清單流程保持不變。
- 輸出清理與輸出上限保持不變。
- PTY 配接器仍然保證在強制終止和監聽器處置時等待結算。

## 9. 完成定義

1. Supervisor 是受控執行的生命週期擁有者。
2. PTY 產生使用明確的命令契約，不進行 argv 重構。
3. Process 層對於 agent 層的 supervisor stdin 契約沒有型別相依性。
4. Watchdog 預設值為單一來源。
5. 目標單元測試和 e2e 測試保持綠燈（通過）。
6. 重新啟動持久性邊界已明確記錄或完全實作。

## 10. 總結

此分支現具有連貫且更安全的監督形狀：

- 明確的 PTY 契約
- 更乾淨的程序分層
- supervisor 驅動的程序操作取消路徑
- 當 supervisor 查找失敗時的真實後備終止
- 子執行預設終止路徑的程序樹取消
- 統一的 watchdog 預設值
- 明確的記憶體內重新啟動邊界（此階段不進行跨重新啟動的孤兒調解）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
