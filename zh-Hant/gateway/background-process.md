---
summary: "背景 exec 執行與進程管理"
read_when:
  - 新增或修改背景 exec 行為
  - 調試長時間執行的 exec 任務
title: "背景 Exec 與進程工具"
---

# 背景 Exec + 進程工具

OpenClaw 透過 `exec` 工具執行 shell 指令，並將長時間執行的任務保留在記憶體中。`process` 工具負責管理這些背景工作階段。

## exec 工具

關鍵參數：

- `command` (必填)
- `yieldMs` (預設值 10000)：經過此延遲後自動轉為背景
- `background` (布林值)：立即轉為背景
- `timeout` (秒，預設值 1800)：在此逾時後終止進程
- `elevated` (布林值)：若啟用/允許提權模式，則在主機上執行
- 需要真實 TTY？請設定 `pty: true`。
- `workdir`，`env`

行為：

- 前景執行會直接回傳輸出。
- 當轉為背景時 (明確指定或逾時)，工具會回傳 `status: "running"` + `sessionId` 以及短暫的尾部輸出。
- 輸出會保留在記憶體中，直到工作階段被輪詢或清除。
- 若 `process` 工具不被允許，`exec` 將同步執行並忽略 `yieldMs`/`background`。
- 產生的 exec 指令會接收 `OPENCLAW_SHELL=exec` 以套用情境感知的 shell/profile 規則。

## 子進程橋接

當在 exec/process 工具之外產生長時間執行的子進程時 (例如 CLI 重新產生或 gateway 輔助程式)，請附加子進程橋接輔助程式，以便轉發終止信號並在退出/錯誤時分離監聽器。這可避免在 systemd 上出現孤兒進程，並讓各平台的關閉行為保持一致。

環境覆寫：

- `PI_BASH_YIELD_MS`：預設產出 (毫秒)
- `PI_BASH_MAX_OUTPUT_CHARS`：記憶體內輸出上限 (字元)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每個串流的待處理 stdout/stderr 上限 (字元)
- `PI_BASH_JOB_TTL_MS`：已結束工作階段的 TTL (毫秒，限制為 1 分鐘 ~ 3 小時)

組態 (建議)：

- `tools.exec.backgroundMs` (預設值 10000)
- `tools.exec.timeoutSec` (預設值 1800)
- `tools.exec.cleanupMs` (預設值 1800000)
- `tools.exec.notifyOnExit` (預設值 true): 當後台執行的 exec 結束時，將系統事件加入佇列並請求心跳。
- `tools.exec.notifyOnExitEmptySuccess` (預設值 false): 當為 true 時，也會為未產生任何輸出的成功後台執行將完成事件加入佇列。

## process tool

Actions:

- `list`: 列出執行中 + 已完成的 sessions
- `poll`: 排空 (drain) session 的新輸出（同時回報退出狀態）
- `log`: 讀取聚合輸出（支援 `offset` + `limit`）
- `write`: 傳送 stdin (`data`，可選的 `eof`)
- `kill`: 終止後台 session
- `clear`: 從記憶體中移除已完成的 session
- `remove`: 如果正在執行則終止，如果已完成則清除

Notes:

- 只有後台 sessions 會被列出/保留在記憶體中。
- 程序重新啟動後 session 將會遺失（無磁碟持久性）。
- 只有在您執行 `process poll/log` 並且記錄了工具結果時，session 記錄才會儲存到聊天記錄中。
- `process` 的範圍是以 agent 為單位；它只能看到由該 agent 啟動的 sessions。
- `process list` 包含一個衍生的 `name` (指令動詞 + 目標)，以便快速掃描。
- `process log` 使用基於行的 `offset`/`limit`。
- 當同時省略 `offset` 和 `limit` 時，它會傳回最後 200 行並包含分頁提示。
- 當提供 `offset` 但省略 `limit` 時，它會從 `offset` 傳回到結尾（不限制為 200 行）。

## Examples

Run a long task and poll later:

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

Start immediately in background:

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

Send stdin:

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

import en from "/components/footer/en.mdx";

<en />
