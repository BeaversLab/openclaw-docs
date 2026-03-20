---
summary: "CLI 参考文档 `openclaw nodes` (list/status/approve/invoke、camera/canvas/screen)"
read_when:
  - 您正在管理已配对的节点（相机、屏幕、画布）
  - 您需要批准请求或调用节点命令
title: "nodes"
---

# `openclaw nodes`

管理已配对的节点（设备）并调用节点功能。

相关：

- 节点概述：[节点](/zh/nodes)
- 相机：[相机节点](/zh/nodes/camera)
- 图像：[图像节点](/zh/nodes/images)

通用选项：

- `--url`、`--token`、`--timeout`、`--json`

## 常用命令

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

`nodes list` 打印待配对/已配对的表格。已配对的行包含最近的连接时长（最后连接时间）。
使用 `--connected` 仅显示当前已连接的节点。使用 `--last-connected <duration>` 筛选
在特定时长内连接的节点（例如 `24h`、`7d`）。

## 调用 / 运行

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

调用标志：

- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：节点调用超时（默认 `15000`）。
- `--idempotency-key <key>`：可选的幂等性密钥。

### Exec 风格默认值

`nodes run` 镜像了模型的 exec 行为（默认值 + 批准）：

- 读取 `tools.exec.*`（加上 `agents.list[].tools.exec.*` 覆盖项）。
- 在调用 `system.run` 之前使用 exec 批准（`exec.approval.request`）。
- 当设置了 `tools.exec.node` 时，可以省略 `--node`。
- 需要一个通告 `system.run` 的节点（macOS 伴侣应用或无头节点主机）。

标志：

- `--cwd <path>`：工作目录。
- `--env <key=val>`：环境变量覆盖（可重复）。注意：节点主机忽略 `PATH` 覆盖（并且 `tools.exec.pathPrepend` 不应用于节点主机）。
- `--command-timeout <ms>`：命令超时。
- `--invoke-timeout <ms>`：节点调用超时（默认 `30000`）。
- `--needs-screen-recording`：需要屏幕录制权限。
- `--raw <command>`：运行 shell 字符串（`/bin/sh -lc` 或 `cmd.exe /c`）。
  在 Windows 节点主机的允许列表模式下，`cmd.exe /c` shell 包装器运行需要批准
  （单独的允许列表条目不会自动允许包装器形式）。
- `--agent <id>`：代理范围的批准/允许列表（默认为已配置的代理）。
- `--ask <off|on-miss|always>`，`--security <deny|allowlist|full>`：覆盖设置。

import zh from "/components/footer/zh.mdx";

<zh />
