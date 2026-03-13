---
summary: "CLI 参考 `openclaw system` (系统事件、心跳、在线)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "系统"
---

# `openclaw system`

网关的系统级辅助工具：将系统事件加入队列、控制心跳
以及查看在线状态。

## 常用命令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **主** 会话中排队一个系统事件。下一次心跳将在提示中将其注入为 `System:` 行。使用 `--mode now` 立即触发心跳；`next-heartbeat` 则等待下一次计划的计时。

标志：

- `--text <text>`：必需的系统事件文本。
- `--mode <mode>`： `now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读的输出。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示最后一次心跳事件。
- `enable`：重新开启心跳（如果之前被禁用，请使用此项）。
- `disable`：暂停心跳。

标志：

- `--json`：机器可读的输出。

## `system presence`

列出网关已知的当前系统在线状态条目（节点、
实例和类似的状态行）。

标志：

- `--json`：机器可读的输出。

## 注意事项

- 需要一个可通过当前配置（本地或远程）访问的运行中的网关。
- 系统事件是临时的，不会在重启后保留。

import zh from '/components/footer/zh.mdx';

<zh />
