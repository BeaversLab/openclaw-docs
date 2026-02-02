---
summary: "`openclaw nodes` 的 CLI 参考（list/status/approve/invoke、camera/canvas/screen）"
read_when:
  - 你在管理已配对节点（摄像头、屏幕、画布）
  - 需要批准请求或调用节点命令
title: "`openclaw nodes`"
---

# `openclaw nodes`

管理已配对节点（设备）并调用节点能力。

相关：
- Nodes 概览：[Nodes](/zh/nodes)
- Camera：[Camera nodes](/zh/nodes/camera)
- Images：[Image nodes](/zh/nodes/images)

常用选项：
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

`nodes list` 会输出 pending/paired 表格。paired 行包含最近连接时间（Last Connect）。
使用 `--connected` 只显示当前已连接节点。使用 `--last-connected <duration>` 过滤
在指定时间内连接过的节点（如 `24h`、`7d`）。

## Invoke / run

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

Invoke 标志：
- `--params <json>`：JSON 对象字符串（默认 `{}`）。
- `--invoke-timeout <ms>`：node invoke 超时（默认 `15000`）。
- `--idempotency-key <key>`：可选幂等键。

### Exec 风格默认

`nodes run` 与模型的 exec 行为一致（默认值 + approvals）：

- 读取 `tools.exec.*`（以及 `agents.list[].tools.exec.*` 覆盖）。
- 在调用 `system.run` 前使用 exec approvals（`exec.approval.request`）。
- 当 `tools.exec.node` 已设置时，可省略 `--node`。
- 需要可提供 `system.run` 的节点（macOS 伴侣应用或无头 node host）。

标志：
- `--cwd <path>`：工作目录。
- `--env <key=val>`：环境变量覆盖（可重复）。
- `--command-timeout <ms>`：命令超时。
- `--invoke-timeout <ms>`：node invoke 超时（默认 `30000`）。
- `--needs-screen-recording`：需要屏幕录制权限。
- `--raw <command>`：运行 shell 字符串（`/bin/sh -lc` 或 `cmd.exe /c`）。
- `--agent <id>`：按 agent 作用域的 approvals/allowlists（默认使用已配置 agent）。
- `--ask <off|on-miss|always>`、`--security <deny|allowlist|full>`：覆盖设置。
