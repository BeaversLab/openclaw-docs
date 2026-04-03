---
summary: "CLI 參考資料，用於 `openclaw nodes` (list/status/approve/invoke, camera/canvas/screen)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "nodes"
---

# `openclaw nodes`

管理配對的節點 (裝置) 並叫用節點功能。

相關：

- 節點概覽：[節點](/en/nodes)
- 相機：[相機節點](/en/nodes/camera)
- 影像：[影像節點](/en/nodes/images)

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

`nodes list` 會列印待處理/已配對的表格。已配對的列包含最近的連線時間 (Last Connect)。
使用 `--connected` 僅顯示目前已連線的節點。使用 `--last-connected <duration>` 篩選
在持續時間內連線的節點 (例如 `24h`, `7d`)。

## 調用

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

叫用旗標：

- `--params <json>`: JSON 物件字串 (預設為 `{}`)。
- `--invoke-timeout <ms>`: 節點叫用逾時 (預設為 `15000`)。
- `--idempotency-key <key>`: 選用的等冪性金鑰。
- `system.run` 和 `system.run.prepare` 在此處被封鎖；請使用帶有 `host=node` 的 `exec` 工具來執行 Shell。

若要在節點上執行 Shell，請使用帶有 `host=node` 的 `exec` 工具，而不是 `openclaw nodes run`。
`nodes` CLI 現在專注於功能：透過 `nodes invoke` 直接進行 RPC，以及配對、相機、螢幕、位置、畫布和通知。
