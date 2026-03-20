---
summary: "用于 `openclaw system` 的 CLI 参考（系统事件、心跳、在线状态）"
read_when:
  - 您希望在无需创建 cron 作业的情况下将系统事件加入队列
  - 您需要启用或禁用心跳
  - 您希望检查系统在线状态条目
title: "system"
---

# `openclaw system`

Gateway 的系统级辅助工具：将系统事件加入队列、控制心跳
以及查看在线状态。

## 常用命令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **主** 会话中将系统事件加入队列。下一次心跳将会
将其作为 `System:` 行注入提示中。使用 `--mode now` 立即触发心跳；
`next-heartbeat` 则等待下一次计划滴答。

标志：

- `--text <text>`：必需的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读的输出。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示最后一次心跳事件。
- `enable`：重新开启心跳（如果之前已被禁用，请使用此项）。
- `disable`：暂停心跳。

标志：

- `--json`：机器可读的输出。

## `system presence`

列出 Gateway 当前已知的系统在线状态条目（节点、
实例和类似的状态行）。

标志：

- `--json`：机器可读的输出。

## 注意

- 需要通过您的当前配置（本地或远程）连接到一个正在运行的 Gateway。
- 系统事件是临时的，不会在重启后持久保存。

import zh from "/components/footer/zh.mdx";

<zh />
