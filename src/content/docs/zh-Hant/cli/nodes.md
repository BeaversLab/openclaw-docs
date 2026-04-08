---
summary: "CLI 參考指南 for `openclaw nodes` (status, pairing, invoke, camera/canvas/screen)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "nodes"
---

# `openclaw nodes`

管理配對的節點 (裝置) 並叫用節點功能。

相關：

- Nodes 概覽： [Nodes](/en/nodes)
- Camera： [Camera nodes](/en/nodes/camera)
- Images： [Image nodes](/en/nodes/images)

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
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` 會列印待處理/已配對的表格。已配對的列包含最近的連線時間 (Last Connect)。
使用 `--connected` 僅顯示目前已連線的節點。使用 `--last-connected <duration>` 篩選
在持續時間內連線的節點 (例如 `24h`, `7d`)。

Approval note：

- `openclaw nodes pending` only needs pairing scope.
- `openclaw nodes approve <requestId>` inherits extra scope requirements from the
  pending request：
  - commandless request： pairing only
  - non-exec node commands： pairing + write
  - `system.run` / `system.run.prepare` / `system.which`： pairing + admin

## Invoke

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

Invoke flags：

- `--params <json>`： JSON object string (default `{}`)。
- `--invoke-timeout <ms>`： node invoke timeout (default `15000`)。
- `--idempotency-key <key>`： optional idempotency key。
- `system.run` and `system.run.prepare` are blocked here； use the `exec` tool with `host=node` for shell execution。

For shell execution on a node, use the `exec` tool with `host=node` instead of `openclaw nodes run`。
The `nodes` CLI is now capability-focused： direct RPC via `nodes invoke`, plus pairing, camera,
screen, location, canvas, and notifications。
