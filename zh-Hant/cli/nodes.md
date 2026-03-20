---
summary: "CLI 參考手冊：`openclaw nodes` (list/status/approve/invoke、camera/canvas/screen)"
read_when:
  - 您正在管理配對的節點（相機、螢幕、畫布）
  - 您需要批准請求或叫用節點指令
title: "nodes"
---

# `openclaw nodes`

管理配對的節點（裝置）並叫用節點功能。

相關連結：

- 節點概覽：[節點](/zh-Hant/nodes)
- 相機：[相機節點](/zh-Hant/nodes/camera)
- 影像：[影像節點](/zh-Hant/nodes/images)

通用選項：

- `--url`, `--token`, `--timeout`, `--json`

## 通用指令

```bash
openclaw nodes list
openclaw nodes list --connected
openclaw nodes list --last-connected 24h
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` 會列出待配對/已配對的表格。已配對的列包含最近的連線時間（Last Connect）。
使用 `--connected` 只顯示目前已連線的節點。使用 `--last-connected <duration>` 過濾出在一段時間內連線的節點（例如 `24h`、`7d`）。

## 叫用 / 執行

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

叫用旗標：

- `--params <json>`：JSON 物件字串（預設值 `{}`）。
- `--invoke-timeout <ms>`：節點叫用逾時（預設值 `15000`）。
- `--idempotency-key <key>`：選用的等冪性金鑰。

### Exec 樣式的預設值

`nodes run` 鏡像模型的 exec 行為（預設值 + 核准）：

- 讀取 `tools.exec.*`（加上 `agents.list[].tools.exec.*` 覆寫）。
- 在呼叫 `system.run` 之前使用執行核准 (`exec.approval.request`)。
- 當設定 `tools.exec.node` 時，可以省略 `--node`。
- 需要一個廣告 `system.run` 的節點（macOS 伴隨應用程式或無頭節點主機）。

標誌：

- `--cwd <path>`：工作目錄。
- `--env <key=val>`：環境變數覆寫（可重複）。注意：節點主機會忽略 `PATH` 覆寫（並且 `tools.exec.pathPrepend` 不會套用至節點主機）。
- `--command-timeout <ms>`：指令逾時。
- `--invoke-timeout <ms>`：節點呼叫逾時（預設 `30000`）。
- `--needs-screen-recording`：要求螢幕錄製權限。
- `--raw <command>`：執行 shell 字串（`/bin/sh -lc` 或 `cmd.exe /c`）。
  在 Windows 節點主機的允許清單模式下，`cmd.exe /c` shell-wrapper 執行需要核准
 （僅允許清單條目不會自動允許 wrapper 形式）。
- `--agent <id>`：代理人範圍的核准/允許清單（預設為已配置的代理人）。
- `--ask <off|on-miss|always>`、`--security <deny|allowlist|full>`：覆寫值。

import en from "/components/footer/en.mdx";

<en />
