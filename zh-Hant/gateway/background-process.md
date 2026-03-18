---
summary: "Background exec execution and process management"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Background Exec and Process Tool"
---

# Background Exec + Process Tool

OpenClaw 透過 `exec` 工具執行 shell 指令，並將長時間執行的任務保留在記憶體中。`process` 工具會管理這些背景工作階段。

## exec 工具

關鍵參數：

- `command` (必填)
- `yieldMs` (預設 10000)：在此延遲後自動切換至背景
- `background` (bool)：立即切換至背景
- `timeout` (秒，預設 1800)：在此逾時後終止程序
- `elevated` (bool)：若啟用/允許提權模式則在主機上執行
- 需要真正的 TTY？請設定 `pty: true`。
- `workdir`、`env`

行為：

- 前景執行會直接回傳輸出。
- 當切換至背景時 (明確指定或逾時)，工具會回傳 `status: "running"` + `sessionId` 以及簡短的尾部輸出。
- 輸出會保留在記憶體中，直到工作階段被輪詢或清除。
- 若不允許使用 `process` 工具，`exec` 將會同步執行並忽略 `yieldMs`/`background`。
- 衍生的 exec 指令會接收 `OPENCLAW_SHELL=exec`，以套用具備情境感知能力的 shell/profile 規則。

## 子程序橋接

當在 exec/process 工具之外衍生長時間執行的子程序時 (例如 CLI 重新衍生或 gateway 輔助程式)，請附加子程序橋接輔助程式，以便轉發終止信號，並在退出/錯誤時分離監聽器。這可以避免在 systemd 上出現孤兒程序，並讓各平台的關閉行為保持一致。

環境變數覆寫：

- `PI_BASH_YIELD_MS`：預設產出時間 (毫秒)
- `PI_BASH_MAX_OUTPUT_CHARS`：記憶體內輸出上限 (字元)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：各串流的待處理 stdout/stderr 上限 (字元)
- `PI_BASH_JOB_TTL_MS`：已完成工作階段的 TTL (毫秒，限制在 1m–3h)

設定 (建議)：

- `tools.exec.backgroundMs` (預設 10000)
- `tools.exec.timeoutSec` (預設 1800)
- `tools.exec.cleanupMs` (預設 1800000)
- `tools.exec.notifyOnExit` (預設 true)：當背景執行結束時，將系統事件加入佇列並請求心跳。
- `tools.exec.notifyOnExitEmptySuccess` (預設 false)：若為 true，也會為未產生輸出的成功背景執行將完成事件加入佇列。

## process tool

動作：

- `list`：正在執行與已完成的會話
- `poll`：排出會話的新輸出 (也會回報結束狀態)
- `log`：讀取聚合輸出 (支援 `offset` + `limit`)
- `write`：發送 stdin (`data`，選用 `eof`)
- `kill`：終止背景會話
- `clear`：從記憶體中移除已完成的會話
- `remove`：若正在執行則終止，若已完成則清除

備註：

- 只有背景會話會被列出 / 保留在記憶體中。
- 程序重新啟動後會話將會遺失 (無磁碟持久性)。
- 只有當您執行 `process poll/log` 且工具結果被記錄時，會話日誌才會儲存至聊天記錄。
- `process` 的範圍僅限於個別代理；它只能看到由該代理啟動的會話。
- `process list` 包含衍生出的 `name` (指令動詞 + 目標) 以便快速瀏覽。
- `process log` 使用基於行的 `offset`/`limit`。
- 當同時省略 `offset` 與 `limit` 時，它會傳回最後 200 行並包含分頁提示。
- 當提供 `offset` 且省略 `limit` 時，它會從 `offset` 傳回至結尾 (不限制為 200 行)。

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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
