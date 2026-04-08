---
summary: "CLI 参考 `openclaw system` (系统事件、心跳、在线)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "系统"
---

# `openclaw system`

Gateway(网关) 网关 的系统级辅助工具：将系统事件加入队列、控制心跳
以及查看在线状态。

所有 `system` 子命令都使用 Gateway RPC 并接受共享的客户端标志：

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--expect-final`

## 常用命令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system event --text "Check for urgent follow-ups" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **主** 会话中排队一个系统事件。下一次心跳将其作为 `System:` 行注入到提示符中。使用 `--mode now` 立即触发心跳；`next-heartbeat` 等待下一次计划的刻度。

标志：

- `--text <text>`：必需的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读的输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示最后一次心跳事件。
- `enable`：重新开启心跳（如果它们被禁用，请使用此命令）。
- `disable`：暂停心跳。

标志：

- `--json`：机器可读的输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## `system presence`

列出 Gateway 当前知道的系统在线条目（节点、实例和类似的状态行）。

标志：

- `--json`：机器可读的输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway RPC 标志。

## 注意事项

- 需要一个正在运行的 Gateway，且该 Gateway 可通过您当前的配置（本地或远程）访问。
- 系统事件是暂时的，不会在重启后持久保留。
