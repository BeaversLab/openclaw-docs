---
summary: "用於 `openclaw nodes` 的 CLI 參考（list/status/approve/invoke、camera/canvas/screen）"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "nodes"
---

# `openclaw nodes`

管理配對的節點（裝置）並叫用節點功能。

相關：

- 節點概覽：[節點](/zh-Hant/nodes)
- 相機：[相機節點](/zh-Hant/nodes/camera)
- 影像：[影像節點](/zh-Hant/nodes/images)

通用選項：

- `--url`、`--token`、`--timeout`、`--json`

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

`nodes list` 會列印待處理/已配對的表格。已配對的列包含最近一次連線時間（Last Connect）。
使用 `--connected` 僅顯示目前已連線的節點。使用 `--last-connected <duration>` 篩選在特定時間內連線的節點（例如 `24h`、`7d`）。

## 叫用 / 執行

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

叫用旗標：

- `--params <json>`：JSON 物件字串（預設為 `{}`）。
- `--invoke-timeout <ms>`：節點叫用逾時（預設為 `15000`）。
- `--idempotency-key <key>`：選用的等冪性金鑰。

### Exec 樣式預設值

`nodes run` 會鏡像模型的 exec 行為（預設值 + 核准）：

- 讀取 `tools.exec.*`（加上 `agents.list[].tools.exec.*` 覆寫）。
- 在叫用 `system.run` 之前使用 exec 核准（`exec.approval.request`）。
- 當設定 `tools.exec.node` 時，可以省略 `--node`。
- 需要一個宣佈支援 `system.run` 的節點（macOS 伴隨程式或無外掛節點主機）。

旗標：

- `--cwd <path>`：工作目錄。
- `--env <key=val>`：環境變數覆寫（可重複）。注意：節點主機會忽略 `PATH` 覆寫（且不會將 `tools.exec.pathPrepend` 套用至節點主機）。
- `--command-timeout <ms>`：指令逾時。
- `--invoke-timeout <ms>`：節點調用超時（預設 `30000`）。
- `--needs-screen-recording`：需要螢幕錄製權限。
- `--raw <command>`：執行 shell 字串（`/bin/sh -lc` 或 `cmd.exe /c`）。
  在 Windows 節點主機的允許清單模式下，`cmd.exe /c` shell 包裝器執行需要核准
  （僅有允許清單條目不會自動允許包裝器形式）。
- `--agent <id>`：代理範圍的核准/允許清單（預設為已設定的代理）。
- `--ask <off|on-miss|always>`, `--security <deny|allowlist|full>`：覆寫。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
