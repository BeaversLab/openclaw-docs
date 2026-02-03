---
summary: "`openclaw system` 的 CLI 参考（系统事件、heartbeat、presence）"
read_when:
  - 需要在不创建 cron 的情况下入队系统事件
  - 需要启用或禁用心跳
  - 需要查看 system presence 条目
title: "system"
---

# `openclaw system`

Gateway 的系统级辅助：入队系统事件、控制心跳、查看 presence。

## 常用命令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **主** 会话上入队系统事件。下一个心跳会将其作为 `System:` 行注入提示。
使用 `--mode now` 立即触发心跳；`next-heartbeat` 等待下一次定时心跳。

标志：

- `--text <text>`：必需的系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读输出。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：显示上一次心跳事件。
- `enable`：重新开启心跳（若被禁用时使用）。
- `disable`：暂停心跳。

标志：

- `--json`：机器可读输出。

## `system presence`

列出 Gateway 当前已知的系统 presence 条目（节点、实例等状态行）。

标志：

- `--json`：机器可读输出。

## 备注

- 需要当前配置可达的运行中 Gateway（本地或远程）。
- 系统事件是临时的，重启后不会持久化。
