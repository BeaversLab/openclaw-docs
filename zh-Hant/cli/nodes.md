---
summary: "CLI 參考手冊，用於 `openclaw nodes` (list/status/approve/invoke, camera/canvas/screen)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "nodes"
---

# `openclaw nodes`

管理配對節點（裝置）並叫用節點功能。

相關連結：

- 節點概覽：[Nodes](/zh-Hant/nodes)
- 相機：[Camera nodes](/zh-Hant/nodes/camera)
- 圖片：[Image nodes](/zh-Hant/nodes/images)

常用選項：

- `--url`, `--token`, `--timeout`, `--json`

## 常用指令

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

`nodes list` 會列印待配對/已配對的表格。已配對的列包含最近一次連線的時間（Last Connect）。
使用 `--connected` 僅顯示當前已連線的節點。使用 `--last-connected <duration>` 來篩選在特定時間內連線的節點（例如 `24h`、`7d`）。

## 調用 / 執行

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

調用標誌：

- `--params <json>`：JSON 物件字串（預設為 `{}`）。
- `--invoke-timeout <ms>`：節點調用逾時時間（預設為 `15000`）。
- `--idempotency-key <key>`：可選的等冪性金鑰。

### Exec 風格的預設值

`nodes run` 反映了模型的 exec 行為（預設值 + 審批）：

- 讀取 `tools.exec.*`（加上 `agents.list[].tools.exec.*` 覆蓋設定）。
- 在調用 `system.run` 之前使用執行核准 (`exec.approval.request`)。
- 當設定 `tools.exec.node` 時，可以省略 `--node`。
- 需要一個宣佈支援 `system.run` 的節點（macOS 伴隨程式或無頭節點主機）。

旗標：

- `--cwd <path>`：工作目錄。
- `--env <key=val>`：環境變數覆寫（可重複）。注意：節點主機會忽略 `PATH` 覆寫（且 `tools.exec.pathPrepend` 不會套用於節點主機）。
- `--command-timeout <ms>`：指令逾時。
- `--invoke-timeout <ms>`：節點調用逾時（預設 `30000`）。
- `--needs-screen-recording`：需要螢幕錄製權限。
- `--raw <command>`：執行 shell 字串（`/bin/sh -lc` 或 `cmd.exe /c`）。
  在 Windows 節點主機上的允許清單模式下，`cmd.exe /c` shell 包裝器執行需要核准
  （單獨的允許清單項目不會自動允許包裝器形式）。
- `--agent <id>`：代理範圍的核准/允許清單（預設為已配置的代理）。
- `--ask <off|on-miss|always>`、`--security <deny|allowlist|full>`：覆寫。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
