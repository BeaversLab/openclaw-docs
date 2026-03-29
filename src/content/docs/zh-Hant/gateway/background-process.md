---
summary: "背景執行執行與程序管理"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "背景執行與程序工具"
---

# 背景執行 + 程序工具

OpenClaw 透過 `exec` 工具執行 shell 指令，並將長時間執行的任務保留在記憶體中。`process` 工具會管理這些背景工作階段。

## exec 工具

關鍵參數：

- `command` (必要)
- `yieldMs` (預設 10000)：在此延遲後自動執行背景作業
- `background` (bool)：立即執行背景作業
- `timeout` (秒，預設 1800)：在此逾時後終止程序
- `elevated` (bool)：若啟用/允許提昇模式，則在主機上執行
- 需要真實 TTY？請設定 `pty: true`。
- `workdir`，`env`

行為：

- 前景執行會直接傳回輸出。
- 當執行背景作業時 (明確或逾時)，工具會傳回 `status: "running"` + `sessionId` 以及簡短的結尾輸出。
- 輸出會保留在記憶體中，直到工作階段被輪詢或清除。
- 若不允許使用 `process` 工具，`exec` 會同步執行並忽略 `yieldMs`/`background`。
- 產生的 exec 指令會接收 `OPENCLAW_SHELL=exec`，以用於具備環境感知能力的 shell/設定檔規則。

## 子程序橋接

當在 exec/process 工具之外產生長時間執行的子程序時 (例如 CLI 重新產生或 gateway 協助程式)，請附加子程序橋接協助程式，以便轉送終止信號，並在結束/錯誤時分離監聽器。這可以避免在 systemd 上出現孤兒程序，並讓各平台的關機行為保持一致。

環境覆寫：

- `PI_BASH_YIELD_MS`：預設產出 (毫秒)
- `PI_BASH_MAX_OUTPUT_CHARS`：記憶體內輸出上限 (字元)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：各串流待處理 stdout/stderr 上限 (字元)
- `PI_BASH_JOB_TTL_MS`：已完成工作階段的 TTL (毫秒，限制在 1 分鐘至 3 小時之間)

組態 (建議)：

- `tools.exec.backgroundMs` (預設 10000)
- `tools.exec.timeoutSec` (預設 1800)
- `tools.exec.cleanupMs` (預設 1800000)
- `tools.exec.notifyOnExit` (預設 true)：當背景執行的 exec 結束時，將系統事件加入佇列並請求心跳。
- `tools.exec.notifyOnExitEmptySuccess` (預設 false)：設為 true 時，也會為未產生任何輸出的成功背景執行加入完成事件。

## process 工具

動作：

- `list`：列出執行中與已結束的階段
- `poll`：提取階段的新輸出（也會回報退出狀態）
- `log`：讀取聚合輸出（支援 `offset` + `limit`）
- `write`：發送 stdin（`data`，可選 `eof`）
- `kill`：終止背景階段
- `clear`：從記憶體中移除已結束的階段
- `remove`：若正在執行則終止，若已結束則清除

備註：

- 僅背景階段會被列出/保存在記憶體中。
- 程序重啟後階段會遺失（無磁碟持久化）。
- 只有當您執行 `process poll/log` 且工具結果被記錄時，階段日誌才會儲存至聊天記錄。
- `process` 的範圍僅限於各自的代理；它只能看到由該代理啟動的階段。
- `process list` 包含衍生的 `name`（指令動詞 + 目標）以便快速掃描。
- `process log` 使用基於行的 `offset`/`limit`。
- 當同時省略 `offset` 和 `limit` 時，它會返回最後 200 行並包含分頁提示。
- 當提供 `offset` 但省略 `limit` 時，它會返回從 `offset` 到結尾的內容（不限於 200 行）。

## 範例

執行長時間任務並稍後輪詢：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

立即在背景開始：

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

發送 stdin：

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```
