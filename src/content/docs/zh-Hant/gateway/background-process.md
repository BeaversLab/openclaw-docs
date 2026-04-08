---
summary: "後台 exec 執行與程序管理"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "後台 Exec 與程序工具"
---

# 背景執行 + 程序工具

OpenClaw 透過 `exec` 工具執行 shell 指令，並將長時間執行的任務保留在記憶體中。`process` 工具負責管理那些後台工作階段。

## exec 工具

關鍵參數：

- `command` (必填)
- `yieldMs` (預設 10000)：在此延遲後自動切換至後台
- `background` (bool)：立即切換至後台
- `timeout` (秒，預設 1800)：在此逾時後終止程序
- `elevated` (bool)：若啟用/允許提升權限模式，則在沙箱外執行 (預設為 `gateway`，當 exec 目標為 `node` 時則為 `node`)
- 需要真正的 TTY 嗎？請設定 `pty: true`。
- `workdir`, `env`

行為：

- 前景執行會直接傳回輸出。
- 當切換至後台時 (明確指定或逾時)，工具會回傳 `status: "running"` + `sessionId` 以及一小段結尾輸出。
- 輸出會保留在記憶體中，直到工作階段被輪詢或清除。
- 若 `process` 工具被禁止，`exec` 將同步執行並忽略 `yieldMs`/`background`。
- 產生的 exec 指令會接收 `OPENCLAW_SHELL=exec` 以便套用具備情境感知能力的 shell/profile 規則。
- 對於現在開始的長時間工作，只需啟動一次，並在啟用自動完成喚醒 且指令輸出或失敗時依賴該功能。
- 若無法使用自動完成喚醒，或者您需要針對乾淨結束且無輸出的指令取得安靜成功 的確認，請使用 `process` 來確認完成狀態。
- 請勿使用 `sleep` 迴圈或重複輪詢 來模擬提醒或延遲後續動作；請改用 cron 來處理未來的工作。

## 子程序橋接

在 exec/process 工具之外生長期執行的子進程（例如，CLI 重生或 gateway 輔助程式）時，請附加子進程橋接輔助程式，以便轉發終止信號並在退出/錯誤時分離監聽器。這可以避免在 systemd 上出現孤兒進程，並使關閉行為在各平台間保持一致。

環境變數覆寫：

- `PI_BASH_YIELD_MS`：預設讓出時間（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`：記憶體內輸出上限（字元數）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每個串流的待處理 stdout/stderr 上限（字元數）
- `PI_BASH_JOB_TTL_MS`：已完成會話的 TTL（毫秒，限制在 1 分鐘至 3 小時之間）

配置（首選）：

- `tools.exec.backgroundMs`（預設值 10000）
- `tools.exec.timeoutSec`（預設值 1800）
- `tools.exec.cleanupMs`（預設值 1800000）
- `tools.exec.notifyOnExit`（預設為 true）：當後台 exec 退出時，將系統事件加入佇列並請求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（預設為 false）：當設為 true 時，也會為未產生輸出的成功後台執行將完成事件加入佇列。

## process 工具

動作：

- `list`：列出正在執行 + 已完成的會話
- `poll`：提取會話的新輸出（也會回報退出狀態）
- `log`：讀取聚合輸出（支援 `offset` + `limit`）
- `write`：發送 stdin（`data`，可選 `eof`）
- `send-keys`：將明確的金鑰 token 或位元組發送到由 PTY 支援的會話
- `submit`：將 Enter / 輸入鍵發送到由 PTY 支援的會話
- `paste`：發送純文字，可選擇以括號貼上模式包裝
- `kill`：終止後台會話
- `clear`：從記憶體中移除已完成的會話
- `remove`：如果正在執行則終止，如果已完成則清除

備註：

- 只有後台會話會被列出/保留在記憶體中。
- 程序重啟後會話會遺失（無磁碟持久化）。
- 只有在您執行 `process poll/log` 並且記錄了工具結果時，工作階段日誌才會儲存至聊天記錄。
- `process` 的範圍是以每個代理程式為單位；它只能看見由該代理程式啟動的工作階段。
- 當無法使用自動完成喚醒時，請使用 `poll` / `log` 來取得狀態、日誌、靜音成功確認或
  完成確認。
- 當您需要輸入或介入時，請使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 包含一個衍生的 `name` （指令動詞 + 目標）以便快速掃描。
- `process log` 使用基於行的 `offset`/`limit`。
- 當同時省略 `offset` 和 `limit` 時，它會傳回最後 200 行並包含分頁提示。
- 當提供了 `offset` 但省略 `limit` 時，它會傳回從 `offset` 到結尾的內容（不限制為 200 行）。
- 輪詢是為了按需狀態檢查，而非等待迴圈排程。如果工作應該在稍後執行，請改用 cron。

## 範例

執行長時間任務並稍後輪詢：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

立即在背景啟動：

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

發送 stdin：

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

發送 PTY 按鍵：

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

提交目前行：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

貼上純文字：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```
