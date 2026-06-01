---
summary: "Background exec execution and process management"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "背景執行與行程工具"
---

OpenClaw 透過 `exec` 工具執行 Shell 指令，並將長時間執行的任務保留在記憶體中。`process` 工具則負責管理這些背景工作階段。

## exec 工具

關鍵參數：

- `command` (必要)
- `yieldMs` (預設 10000)：在此延遲後自動背景化
- `background` (bool)：立即背景化
- `timeout` (秒，預設 `tools.exec.timeoutSec`)：在此逾時後終止行程；僅設定 `timeout: 0` 以停用該次呼叫的 exec 行程逾時
- `elevated` (bool)：若啟用/允許提昇模式，則在沙箱外執行 (預設為 `gateway`，或當 exec 目標為 `node` 時為 `node`)
- 需要真正的 TTY 嗎？請設定 `pty: true`。
- `workdir`, `env`

行為：

- 前景執行會直接傳回輸出。
- 當進入背景時 (明確指定或逾時)，工具會回傳 `status: "running"` + `sessionId` 以及簡短的結尾。
- 背景與 `yieldMs` 執行會繼承 `tools.exec.timeoutSec`，除非呼叫提供了明確的 `timeout`。
- 輸出會保留在記憶體中，直到工作階段被輪詢或清除。
- 若不允許 `process` 工具，`exec` 將同步執行並忽略 `yieldMs`/`background`。
- 產生的 exec 指令會收到 `OPENCLAW_SHELL=exec`，用於情境感知的 Shell/個人檔案規則。
- 對於現在開始的長時間工作，只需啟動一次，並在啟用自動完成喚醒 且指令輸出或失敗時依賴該功能。
- 若無法使用自動完成喚醒，或是您需要針對乾淨結束且無輸出的指令進行靜音成功確認，請使用 `process`
  以確認完成。
- 請勿使用 `sleep` 迴圈或重複輪詢來模擬提醒或延遲後續動作；未來的工作請使用 cron。

## 子程序橋接

在 exec/process 工具之外生長期執行的子進程（例如，CLI 重生或 gateway 輔助程式）時，請附加子進程橋接輔助程式，以便轉發終止信號並在退出/錯誤時分離監聽器。這可以避免在 systemd 上出現孤兒進程，並使關閉行為在各平台間保持一致。

環境變數覆寫：

- `OPENCLAW_BASH_YIELD_MS`：預設產出（毫秒）
- `OPENCLAW_BASH_MAX_OUTPUT_CHARS`：記憶體輸出上限（字元）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每個資料流的待處理 stdout/stderr 上限（字元）
- `OPENCLAW_BASH_JOB_TTL_MS`：已結束會話的 TTL（毫秒，限制在 1 分鐘至 3 小時之間）
- `OPENCLAW_PROCESS_INPUT_WAIT_IDLE_MS`：在可寫入的背景會話被標記為可能正在等待輸入之前的閒置輸出閾值（預設 15000 毫秒）

設定（建議）：

- `tools.exec.backgroundMs`（預設 10000）
- `tools.exec.timeoutSec`（預設 1800）
- `tools.exec.cleanupMs`（預設 1800000）
- `tools.exec.notifyOnExit`（預設 true）：當背景 exec 結束時，將系統事件加入佇列並請求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（預設 false）：當為 true 時，也為未產生任何輸出的成功背景執行將完成事件加入佇列。

## 程序工具

動作：

- `list`：正在執行 + 已結束的會話
- `poll`：提取會話的新輸出（同時報告退出狀態）
- `log`：讀取聚合輸出並顯示輸入恢復提示（支援 `offset` + `limit`）
- `write`：發送 stdin（`data`，選用 `eof`）
- `send-keys`：將明確的鍵值權杖或位元組發送到 PTY 支援的會話
- `submit`：將 Enter / 歸車字元發送到 PTY 支援的會話
- `paste`：發送字面文字，選用括號貼上模式包裹
- `kill`：終止背景會話
- `clear`：從記憶體中移除已結束的會話
- `remove`：如果正在執行則終止，否則如果已結束則清除

備註：

- 僅背景工作階段會被列出/保存在記憶體中。
- 程序重新啟動時工作階段會遺失（無磁碟持久性）。
- 只有當您執行 `process poll/log` 且工具結果被記錄時，會話記錄才會儲存到聊天記錄中。
- `process` 的範圍是每個代理程式；它只能看到由該代理程式啟動的會話。
- 當自動完成喚醒不可用時，使用 `poll` / `log` 來獲取狀態、記錄、安靜成功確認或完成確認。
- 在復原互動式 CLI 之前使用 `log`，以便當前記錄、stdin 狀態和輸入等待提示可一起顯示。
- 當您需要輸入或介入時，請使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 包含衍生自（command verb + target）的 `name` 以便快速掃描。
- `process list`、`poll` 和 `log` 僅在工作階段仍有可寫入的 stdin 且閒置時間超過輸入等待閾值時，才會回報 `waitingForInput`。
- `process log` 使用基於行的 `offset`/`limit`。
- 當同時省略 `offset` 和 `limit` 時，它會返回最後 200 行並包含分頁提示。
- 當提供 `offset` 但省略 `limit` 時，它會返回從 `offset` 到結尾的內容（不限制為 200 行）。
- 輪詢是用於按需狀態，而非等待循環排程。如果工作應該稍後執行，請改用 cron。

## 範例

執行長時間任務並稍後輪詢：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

在發送輸入之前檢查互動式工作階段：

```json
{ "tool": "process", "action": "log", "sessionId": "<id>" }
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

提交當前行：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

貼上純文字：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## 相關連結

- [Exec 工具](/zh-Hant/tools/exec)
- [Exec 核准](/zh-Hant/tools/exec-approvals)
