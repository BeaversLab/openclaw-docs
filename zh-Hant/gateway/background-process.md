---
summary: "背景執行執行與行程管理"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "背景執行與行程工具"
---

# 背景執行與行程工具

OpenClaw 透過 `exec` 工具執行 shell 指令，並將長時間執行的任務保存在記憶體中。`process` 工具用來管理這些背景工作階段。

## exec 工具

關鍵參數：

- `command` （必填）
- `yieldMs` （預設 10000）：經過此延遲後自動背景化
- `background` （bool）：立即背景化
- `timeout` （秒，預設 1800）：在此逾時後終止程序
- `elevated` （bool）：如果啟用/允許提升模式，在主機上執行
- 需要真正的 TTY？請設定 `pty: true`。
- `workdir`, `env`

行為：

- 前景執行會直接回傳輸出。
- 當於背景執行（明確指定或逾時）時，工具會回傳 `status: "running"` + `sessionId` 以及短暫的尾部輸出。
- 輸出會保留在記憶體中，直到該工作階段被輪詢或清除。
- 如果不允許 `process` 工具，`exec` 將同步執行並忽略 `yieldMs`/`background`。
- 產生的 exec 指令會接收 `OPENCLAW_SHELL=exec` 以套用具有情境感知的 shell/profile 規則。

## 子程序橋接

在 exec/process 工具之外衍生長時間執行的子進程（例如，CLI 重新衍生或 gateway 協助程式）時，請附加 child-process bridge 協助程式，以便轉發終止信號並在退出/錯誤時分離監聽器。這可以避免在 systemd 上出現孤兒進程，並使各平台的關閉行為保持一致。

環境覆寫：

- `PI_BASH_YIELD_MS`：預設讓出（毫秒）
- `PI_BASH_MAX_OUTPUT_CHARS`: 記憶體輸出上限 (字元)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`: 每個串流的待處理 stdout/stderr 上限 (字元)
- `PI_BASH_JOB_TTL_MS`: 已完成工作階段的 TTL (毫秒，範圍限制為 1m–3h)

組態 (首選)：

- `tools.exec.backgroundMs` (預設 10000)
- `tools.exec.timeoutSec` (預設 1800)
- `tools.exec.cleanupMs` (預設 1800000)
- `tools.exec.notifyOnExit`（預設為 true）：當背景執行的 exec 結束時，將系統事件加入佇列並請求心跳。
- `tools.exec.notifyOnExitEmptySuccess`（預設為 false）：當為 true 時，也會為未產生任何輸出的成功背景執行將完成事件加入佇列。

## process 工具

動作：

- `list`：正在執行 + 已完成的作業階段
- `poll`：排空作業階段的新輸出（也會回報退出狀態）
- `log`: 讀取聚合輸出（支援 `offset` + `limit`）
- `write`: 發送 stdin（`data`，可選 `eof`）
- `kill`: 終止背景會話
- `clear`: 從記憶體中移除已完成的會話
- `remove`：如果正在運行則終止，否則如果已完成則清除

備註：

- 只有後台會話會被列出/保存在記憶體中。
- 程序重新啟動時會話將會遺失（無磁碟持久化）。
- 只有當您執行 `process poll/log` 且工具結果被記錄時，會話日誌才會儲存至聊天記錄。
- `process` 的範圍限於各個代理；它只能看到由該代理啟動的會話。
- `process list` 包含衍生的 `name`（指令動詞 + 目標）以便快速掃描。
- `process log` 使用基於行的 `offset`/`limit`。
- 當同時省略 `offset` 和 `limit` 時，它會返回最後 200 行並包含分頁提示。
- 當提供 `offset` 且省略 `limit` 時，它會從 `offset` 返回直到結尾（不限制為 200）。

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
