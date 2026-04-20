---
summary: "用于 `openclaw nodes`（状态、配对、调用、camera/canvas/screen）的 CLI 参考"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "节点"
---

# `openclaw nodes`

管理已配对的节点（设备）并调用节点功能。

相关：

- 节点概述：[节点](/zh/nodes)
- Camera：[Camera 节点](/zh/nodes/camera)
- Images：[Image 节点](/zh/nodes/images)

通用选项：

- `--url`、`--token`、`--timeout`、`--json`

## 通用命令

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

`nodes list` 打印待配对/已配对表格。已配对的行包括最近的连接时长（Last Connect）。
使用 `--connected` 仅显示当前连接的节点。使用 `--last-connected <duration>` 过滤
在特定时长内连接的节点（例如 `24h`、`7d`）。

批准说明：

- `openclaw nodes pending` 仅需要配对范围。
- `openclaw nodes approve <requestId>` 继承待处理请求的额外范围要求：
  - 无命令请求：仅配对
  - 非 exec 节点命令：配对 + 写入
  - `system.run` / `system.run.prepare` / `system.which`：配对 + 管理员

## 调用

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

调用标志：

- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时（默认 `15000`）。
- `--idempotency-key <key>`：可选的幂等性密钥。
- 此处阻止 `system.run` 和 `system.run.prepare`；请使用带有 `host=node` 的 `exec` 工具进行 shell 执行。

若要在节点上执行 shell，请使用带有 `host=node` 的 `exec` 工具，而不是 `openclaw nodes run`。
`nodes` CLI 现在专注于功能：通过 `nodes invoke` 进行直接 RPC，以及配对、camera、screen、location、canvas 和通知。
