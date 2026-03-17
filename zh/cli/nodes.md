---
summary: "`openclaw nodes`（列表/状态/批准/调用，camera/canvas/screen）的 CLI 参考"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "节点"
---

# `openclaw nodes`

管理已配对的节点（设备）并调用节点功能。

相关：

- 节点概述：[节点](/zh/nodes)
- 相机：[相机节点](/zh/nodes/camera)
- 图像：[图像节点](/zh/nodes/images)

通用选项：

- `--url`、`--token`、`--timeout`、`--json`

## 通用命令

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

`nodes list` 打印待配对/已配对表格。已配对的行包括最近的连接时长（Last Connect）。
使用 `--connected` 仅显示当前连接的节点。使用 `--last-connected <duration>` 过滤
在特定时长内连接的节点（例如 `24h`、`7d`）。

## 调用 / 运行

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

调用标志：

- `--params <json>`：JSON 对象字符串（默认为 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时时间（默认为 `15000`）。
- `--idempotency-key <key>`：可选的幂等密钥（idempotency key）。

### Exec 风格默认值

`nodes run` 镜像了模型的 exec 行为（默认值 + 批准）：

- 读取 `tools.exec.*`（加上 `agents.list[].tools.exec.*` 覆盖项）。
- 在调用 `system.run` 之前使用 exec 批准（`exec.approval.request`）。
- 当设置了 `tools.exec.node` 时，可以省略 `--node`。
- 需要一个通告 `system.run` 的节点（macOS 伴侣应用或无头节点主机）。

标志：

- `--cwd <path>`：工作目录。
- `--env <key=val>`：环境变量覆盖（可重复）。注意：节点主机忽略 `PATH` 覆盖（并且 `tools.exec.pathPrepend` 不会应用于节点主机）。
- `--command-timeout <ms>`：命令超时时间。
- `--invoke-timeout <ms>`：节点调用超时时间（默认为 `30000`）。
- `--needs-screen-recording`：需要屏幕录制权限。
- `--raw <command>`: 运行 shell 字符串（`/bin/sh -lc` 或 `cmd.exe /c`）。
  在 Windows 节点主机上的 allowlist 模式下，`cmd.exe /c` shell-wrapper 运行需要批准
  （仅 allowlist 条目不会自动允许 wrapper 形式）。
- `--agent <id>`：agent-scoped 批准/allowlists（默认为配置的 agent）。
- `--ask <off|on-miss|always>`，`--security <deny|allowlist|full>`：overrides。

import zh from "/components/footer/zh.mdx";

<zh />
