---
summary: "可靠的互動式程序監督（PTY 與非 PTY）生產計畫，具備明確的擁有權、統一的生命週期以及確定性的清理機制"
read_when:
  - Working on exec/process lifecycle ownership and cleanup
  - Debugging PTY and non-PTY supervision behavior
owner: "openclaw"
status: "in-progress"
last_updated: "2026-02-15"
title: "PTY 和程序監督計畫"
---

# PTY 和程序監督計畫

## 1. 問題與目標

我們需要一個可靠的長時間執行指令生命週期，適用於：

- `exec` 前台執行
- `exec` 背景執行
- `process` 後續行動 (`poll`、`log`、`send-keys`、`paste`、`submit`、`kill`、`remove`)
- CLI agent runner 子程序

目標不僅僅是支援 PTY。目標是實現可預測的所有權、取消、逾時和清理，而不使用不安全的程序匹配啟發式方法。

## 2. 範圍與邊界

- 將實作保留在 `src/process/supervisor` 內部。
- 不要為此建立新的套件。
- 在實務上保持目前的行為相容性。
- 不要將範圍擴大到終端機重播或 tmux 風格的工作階段持續性。

## 3. 此分支中已實作的內容

### Supervisor 基線已存在

- Supervisor 模組已置於 `src/process/supervisor/*` 之下。
- Exec runtime 和 CLI runner 已經透過 supervisor spawn 和 wait 進行路由。
- Registry finalization 是具冪等性的。

### 此階段已完成

1. 明確的 PTY 指令合約

- `SpawnInput` 現在是 `src/process/supervisor/types.ts` 中的可識別聯集型別。
- PTY 執行需要 `ptyCommand`，而不是重複使用通用的 `argv`。
- Supervisor 不再在 `src/process/supervisor/supervisor.ts` 中從 argv 連接重建 PTY 指令字串。
- Exec runtime 現在直接在 `src/agents/bash-tools.exec-runtime.ts` 中傳遞 `ptyCommand`。

2. 程序層級類型解耦

- Supervisor 類型不再從 agents 匯入 `SessionStdin`。
- 程序本機 stdin 合約位於 `src/process/supervisor/types.ts` (`ManagedRunStdin`)。
- Adapters 現在僅依賴程序層級類型：
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. 程序工具生命週期所有權改進

- `src/agents/bash-tools.process.ts` 現在會先透過監督器請求取消。
- 當監督器查找失敗時，`process kill/remove` 現在會使用程序樹後備終止。
- `remove` 透過在請求終止後立即刪除正在執行的會話條目，來保持確定性移除行為。

4. 單一看門狗預設來源

- 在 `src/agents/cli-watchdog-defaults.ts` 中新增了共用預設值。
- `src/agents/cli-backends.ts` 使用這些共用預設值。
- `src/agents/cli-runner/reliability.ts` 使用相同的共用預設值。

5. 失效輔助程序清理

- 已從 `src/agents/bash-tools.shared.ts` 中移除未使用的 `killSession` 輔助程序路徑。

6. 新增直接監督器路徑測試

- 新增 `src/agents/bash-tools.process.supervisor.test.ts`，以涵蓋透過監督器取消進行的 kill 和 remove 路由。

7. 可靠性缺口修復已完成

- `src/agents/bash-tools.process.ts` 現在在監督器查找失敗時，會回退到真實的作業系統層級程序終止。
- `src/process/supervisor/adapters/child.ts` 現在對預設的取消/逾時 kill 路徑使用程序樹終止語義。
- 在 `src/process/kill-tree.ts` 中新增了共用的程序樹工具程式。

8. 新增了 PTY 合約邊緣案例的覆蓋

- 新增 `src/process/supervisor/supervisor.pty-command.test.ts`，用於逐字的 PTY 指令轉發和空指令拒絕。
- 新增 `src/process/supervisor/adapters/child.test.ts`，用於子介面卡取消中的程序樹 kill 行為。

## 4. 剩餘的缺口與決策

### 可靠性狀態

此階段所需的兩個可靠性缺口現已關閉：

- `process kill/remove` 現在在監督器查找失敗時，具備真正的 OS 終止後備機制。
- 子程序取消/逾時現在對於預設的終止路徑使用行程樹終止語意。
- 已為這兩種行為新增回歸測試。

### 持久性與啟動協調

重新啟動行為現已明確定義為僅限記憶體內生命週期。

- 依設計，`reconcileOrphans()` 在 `src/process/supervisor/supervisor.ts` 中仍為空操作。
- 程序重新啟動後不會復原正在執行的執行個體。
- 此界限是此實作階段有意為之的，以避免部分持久化的風險。

### 可維護性後續事項

1. `src/agents/bash-tools.exec-runtime.ts` 中的 `runExecProcess` 仍處理多項職責，並可在後續工作中拆分為專注的輔助程式。

## 5. 實作計畫

所需可靠性與合約項目的實作階段已完成。

已完成：

- `process kill/remove` 後備真實終止
- 子配接器預設終止路徑的程序樹取消
- 後備終止和子配接器終止路徑的迴歸測試
- 在明確的 `ptyCommand` 下進行的 PTY 指令邊緣情況測試
- 明確的記憶體內重啟邊界，且 `reconcileOrphans()` 設計上為空操作

可選的後續工作：

- 將 `runExecProcess` 拆分為專用的輔助函式，且不造成行為偏移

## 6. 檔案對應

### 程序監督器

- `src/process/supervisor/types.ts` 已更新，包含可辨別的生成輸入和程序本地 stdin 合約。
- `src/process/supervisor/supervisor.ts` 已更新，以使用明確的 `ptyCommand`。
- `src/process/supervisor/adapters/child.ts` 和 `src/process/supervisor/adapters/pty.ts` 已與代理程式類型解耦。
- `src/process/supervisor/registry.ts` 的等幂最終化保持不變並予以保留。

### Exec 和進程整合

- `src/agents/bash-tools.exec-runtime.ts` 已更新為顯式傳遞 PTY 指令並保留備用路徑。
- `src/agents/bash-tools.process.ts` 已更新為透過監督者取消，並包含真實進程樹備用終止。
- `src/agents/bash-tools.shared.ts` 已移除直接 kill 輔助路徑。

### CLI 可靠性

- `src/agents/cli-watchdog-defaults.ts` 已新增為共享基線。
- `src/agents/cli-backends.ts` 和 `src/agents/cli-runner/reliability.ts` 現在使用相同的預設值。

## 7. 本輪驗證運行

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

類型檢查註記：

- 在此 repo 中使用 `pnpm build`（以及用於完整 lint/docs gate 的 `pnpm check`）。提及 `pnpm tsgo` 的較舊註記已過時。

## 8. 保留的操作保證

- Exec 環境強化行為保持不變。
- 批准與允許清單流程保持不變。
- 輸出清理與輸出上限保持不變。
- PTY 配接器仍保證在強制終止與監聽器處置時完成等待等待定案。

## 9. 完成定義

1. 監督器是受控執行的生命週期擁有者。
2. PTY 產生使用明確的命令合約，不進行 argv 重建。
3. Process 層在 supervisor stdin 合約上無依賴於 agent 層的類型依賴。
4. Watchdog 預設值為單一來源。
5. 目標單元與 e2e 測試保持通過。
6. 重新啟動持久性邊界已明確記錄或完全實作。

## 10. 總結

此分支現在擁有一個更連貫且更安全的監督架構：

- 明確的 PTY 合約
- 更乾淨的進程分層
- 由監督器驅動的程序操作取消路徑
- 當監督器查找失敗時的真正備用終止
- 用於子執行預設終止路徑的程序樹取消
- 統一的看門狗預設值
- 明確的記憶體內重啟邊界（此階段不進行跨重啟的孤兒程序協調）

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
