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

- 节点概述：[Nodes](/zh/nodes)
- Camera：[Camera nodes](/zh/nodes/camera)
- Images：[Image nodes](/zh/nodes/images)

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
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` 打印待处理/已配对表。已配对的行包括最近一次连接时长（Last Connect）。
使用 `--connected` 仅显示当前已连接的节点。使用 `--last-connected <duration>` 过滤
在特定时长内连接的节点（例如 `24h`、`7d`）。
使用 `nodes remove --node <id|name|ip>` 删除过时的网关拥有的节点配对记录。

批准说明：

- `openclaw nodes pending` 仅需要配对范围。
- `gateway.nodes.pairing.autoApproveCidrs` 仅对显式信任的、首次 `role: node` 设备配对跳过待处理步骤。
  默认情况下它是关闭的，并且不批准升级。
- `openclaw nodes approve <requestId>` 继承待处理请求中的额外范围要求：
  - 无命令请求：仅配对
  - 非执行节点命令：配对 + 写入
  - `system.run` / `system.run.prepare` / `system.which`：配对 + 管理

## 调用

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

调用标志：

- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时（默认 `15000`）。
- `--idempotency-key <key>`：可选的幂等性密钥。
- 此处阻止 `system.run` 和 `system.run.prepare`；对于 Shell 执行，请将 `exec` 工具与 `host=node` 一起使用。

若要在节点上执行 Shell，请使用带有 `host=node` 的 `exec` 工具，而不是 `openclaw nodes run`。
`nodes` CLI 现在专注于功能：通过 `nodes invoke` 进行直接 RPC，以及配对、camera、
screen、location、canvas 和通知。

## 相关

- [CLI reference](/zh/cli)
- [Nodes](/zh/nodes)
