---
summary: "後台 exec 執行與程序管理"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "背景執行與進程工具"
---

# 背景執行 + 程序工具

OpenClaw 透過 `exec` 工具執行 shell 指令，並將長時間執行的任務保留在記憶體中。`process` 工具負責管理那些後台工作階段。

## exec 工具

關鍵參數：

- `command` (必填)
- `yieldMs` (預設 10000)：在此延遲後自動切換至後台
- `background` (bool)：立即切換至後台
- `timeout`（秒，預設 `tools.exec.timeoutSec`）：在此逾時後終止程序；僅設定 `timeout: 0` 以停用該次呼叫的 exec 程序逾時
- `elevated`（布林值）：如果啟用或允許提昇模式，則在沙箱外執行（預設為 `gateway`，當 exec 目標為 `node` 時則為 `node`）
- 需要真實的 TTY？設定 `pty: true`。
- `workdir`，`env`

行為：

- 前景執行會直接傳回輸出。
- 當處於背景（明確指定或逾時）時，工具會傳回 `status: "running"` + `sessionId` 以及簡短的結尾。
- 背景和 `yieldMs` 執行會繼承 `tools.exec.timeoutSec`，除非該次呼叫提供了明確的 `timeout`。
- 輸出會保留在記憶體中，直到工作階段被輪詢或清除。
- 如果不允許使用 `process` 工具，`exec` 將會同步執行並忽略 `yieldMs`/`background`。
- 產生的 exec 指令會收到 `OPENCLAW_SHELL=exec`，以用於具備環境感知能力的 shell/profile 規則。
- 對於從現在開始的長時間工作，啟動一次後，當啟用自動完成喚醒且指令輸出內容或失敗時，依賴自動完成喚醒。
- 如果無法使用自動完成喚醒，或者您需要對乾淨退出且沒有輸出的指令進行安靜成功確認，請使用 `process` 來確認完成。
- 不要使用 `sleep` 迴圈或重複輪詢來模擬提醒或延遲的後續處理；請使用 cron 來處理未來的工作。

## 子程序橋接

當在 exec/process 工具之外產生長時間執行的子程序時（例如，CLI 重新生成或 gateway 輔助程式），請附加子程序橋接輔助程式，以便轉發終止信號並在退出/錯誤時分離監聽器。這可以避免 systemd 上出現孤兒程序，並使各平台的關機行為保持一致。

環境覆寫：

- `PI_BASH_YIELD_MS`：預設讓步（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`：記憶體輸出上限（字元）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每個串流的待處理 stdout/stderr 上限（字元）
- `PI_BASH_JOB_TTL_MS`：已結束工作階段的 TTL（毫秒，限制在 1m–3h 之間）

設定（建議）：

- `tools.exec.backgroundMs`（預設值 10000）
- `tools.exec.timeoutSec`（預設值 1800）
- `tools.exec.cleanupMs`（預設值 1800000）
- `tools.exec.notifyOnExit`（預設值 true）：當背景執行的 exec 結束時，將系統事件加入佇列並請求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（預設值 false）：若為 true，對未產生輸出的成功背景執行，也會將完成事件加入佇列。

## 程序工具

動作：

- `list`：正在執行 + 已結束的工作階段
- `poll`：排空工作階段的新輸出（同時回報退出狀態）
- `log`：讀取聚合輸出（支援 `offset` + `limit`）
- `write`：傳送 stdin（`data`，選用的 `eof`）
- `send-keys`：傳送明確的 key token 或位元組至 PTY 支援的工作階段
- `submit`：傳送 Enter / carriage return 至 PTY 支援的工作階段
- `paste`：傳送字面文字，選用括號貼上模式包裝
- `kill`：終止背景工作階段
- `clear`：從記憶體中移除已結束的工作階段
- `remove`：如果正在執行則終止，如果已結束則清除

備註：

- 僅背景工作階段會被列出/保存在記憶體中。
- 程序重新啟動時工作階段會遺失（無磁碟持久性）。
- 只有當您執行 `process poll/log` 並記錄工具結果時，工作階段日誌才會儲存至聊天記錄。
- `process` 的範圍限定於各個代理程式；它只能看到由該代理程式啟動的工作階段。
- 當無法使用自動完成喚醒時，使用 `poll` / `log` 來取得狀態、日誌、靜默成功確認或完成確認。
- 當您需要輸入或干預時，請使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 包含一個衍生的 `name` (command verb + target) 以便快速掃描。
- `process log` 使用基於行的 `offset`/`limit`。
- 當同時省略 `offset` 和 `limit` 時，它會返回最後 200 行並包含分頁提示。
- 當提供 `offset` 但省略 `limit` 時，它會返回從 `offset` 到結尾的內容 (不限於 200 行)。
- 輪詢 是用於按需狀態，而非等待循環排程。如果工作應該在稍後進行，請改用 cron。

## 範例

執行長時間任務並稍後輪詢：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

立即在後台啟動：

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

貼上文字字面量：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## 相關

- [Exec 工具](/zh-Hant/tools/exec)
- [Exec 核准](/zh-Hant/tools/exec-approvals)
