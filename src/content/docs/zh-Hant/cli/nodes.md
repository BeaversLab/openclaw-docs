---
summary: "CLI 參考指南 for `openclaw nodes` (status, pairing, invoke, camera/canvas/screen)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "節點"
---

# `openclaw nodes`

管理配對的節點 (裝置) 並叫用節點功能。

相關：

- 節點概覽：[節點](/zh-Hant/nodes)
- 相機：[相機節點](/zh-Hant/nodes/camera)
- 影像：[影像節點](/zh-Hant/nodes/images)

常用選項：

- `--url`, `--token`, `--timeout`, `--json`

## 常用指令

```bash
openclaw nodes list
openclaw nodes list --connected
openclaw nodes list --last-connected 24h
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` 會列印待處理/已配對表格。已配對列包含最近一次連線時間（最後連線）。
使用 `--connected` 僅顯示目前連線的節點。使用 `--last-connected <duration>` 篩選
在特定持續時間內連線的節點（例如 `24h`、`7d`）。
使用 `nodes remove --node <id|name|ip>` 刪除過期的閘道擁有節點配對記錄。

Approval note：

- `openclaw nodes pending` 僅需要配對範圍。
- `gateway.nodes.pairing.autoApproveCidrs` 僅能針對明確信任、首次 `role: node` 裝置配對
  跳過待處理步驟。此功能預設為關閉，且不會核准升級。
- `openclaw nodes approve <requestId>` 繼承來自待處理要求的額外範圍需求：
  - 無指令要求：僅配對
  - 非執行節點指令：配對 + 寫入
  - `system.run` / `system.run.prepare` / `system.which`：配對 + 管理員

## 叫用

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

叫用旗標：

- `--params <json>`：JSON 物件字串（預設 `{}`）。
- `--invoke-timeout <ms>`：節點叫用逾時（預設 `15000`）。
- `--idempotency-key <key>`：選用的等冪性金鑰。
- 此處封鎖 `system.run` 和 `system.run.prepare`；請使用 `exec` 工具搭配 `host=node` 進行 Shell 執行。

若要在節點上執行 Shell，請使用 `exec` 工具搭配 `host=node`，而不要使用 `openclaw nodes run`。
`nodes` CLI 現已著重於功能：透過 `nodes invoke` 進行直接 RPC，以及配對、相機、
螢幕、位置、畫布和通知。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [節點](/zh-Hant/nodes)
