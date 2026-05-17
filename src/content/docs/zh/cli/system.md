---
summary: "CLI 参考 `openclaw system` (系统事件、心跳、在线)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "System"
---

# `openclaw system`

Gateway(网关) 网关 的系统级辅助工具：将系统事件加入队列、控制心跳
以及查看在线状态。

所有 `system` 子命令都使用 Gateway(网关) RPC 并接受共享的客户端标志：

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

默认情况下，将系统事件加入 **main** 会话的队列。下一次心跳会将其作为 `System:` 行注入提示中。使用 `--mode now` 立即触发心跳；`next-heartbeat` 则等待下一次计划的周期。

传递 `--session-key` 以定位特定的会话（例如，将异步任务的完成结果中继回启动该任务的渠道）。

> **使用 `--session-key` 时的时序例外：** 当提供了 `--session-key` 时，
> `--mode next-heartbeat` 会折叠为立即定向唤醒，而不是
> 等待下一次计划的定时。定向唤醒使用心跳意图
> `immediate`，因此它们绕过了运行程序的“未到期”门控，否则该门控将
> 延迟（并有效丢弃） `event` 意图唤醒。如果您希望
> 延迟传递，请省略 `--session-key`，以便事件落在主会话上并
> 搭乘下一次定期心跳。

标志：

- `--text <text>`：必需的系统事件文本。
- `--mode <mode>`： `now` 或 `next-heartbeat`（默认）。
- `--session-key <sessionKey>`：可选；指定特定的 agent 会话而不是 agent 的主会话。不属于解析出的 agent 的键将回退到 agent 的主会话。
- `--json`：机器可读的输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享的 Gateway(网关) RPC 标志。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示最后一次心跳事件。
- `enable`：重新打开心跳（如果它们被禁用，请使用此选项）。
- `disable`：暂停心跳。

标志：

- `--json`：机器可读的输出。
- `--url`, `--token`, `--timeout`, `--expect-final`Gateway(网关)RPC: 共享的 Gateway(网关) RPC 标志。

## `system presence`

列出 Gateway(网关) 当前已知的系统在线条目（节点、实例及类似状态行）。

标志：

- `--json`: 机器可读的输出。
- `--url`, `--token`, `--timeout`, `--expect-final`Gateway(网关)RPC: 共享的 Gateway(网关) RPC 标志。

## 注意

- 需要一个正在运行的 Gateway(网关)，并且可通过当前配置（本地或远程）访问。
- 系统事件是临时的，不会在重启后持久化。

## 相关

- [CLI 参考](CLI/en/cli)
