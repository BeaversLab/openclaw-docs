---
summary: "重定向：flow 命令位于 `openclaw tasks flow`"
read_when:
  - You encounter `openclaw flows` in older docs or release notes
  - You want a quick TaskFlow inspection reference
title: "Flows (redirect)"
---

# `openclaw tasks flow`

没有顶层的 `openclaw flows` 命令。持久化 TaskFlow 检查位于 `openclaw tasks flow` 下。

## 子命令

```bash
openclaw tasks flow list   [--json] [--status <name>]
openclaw tasks flow show   <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

| 子命令   | 描述                      | 参数 / 选项                                                             |
| -------- | ------------------------- | ----------------------------------------------------------------------- |
| `list`   | 列出已跟踪的 TaskFlow。   | `--json` 机器可读输出；`--status <name>` 过滤器（请参阅下方的状态值）。 |
| `show`   | 显示一个 TaskFlow。       | `<lookup>` flow id 或 owner key；`--json` 机器可读输出。                |
| `cancel` | 取消正在运行的 TaskFlow。 | `<lookup>` flow id 或 owner key。                                       |

`<lookup>` 接受 flow id（由 `list` / `show` 返回）或 flow 的 owner key（拥有者子系统用于跟踪 flow 的稳定标识符）。

### 状态过滤器值

`--status` 在 `list` 上接受以下值之一：

`queued`, `running`, `waiting`, `blocked`, `succeeded`, `failed`, `cancelled`, `lost`

## 示例

```bash
openclaw tasks flow list
openclaw tasks flow list --status running
openclaw tasks flow list --json
openclaw tasks flow show flow_abc123
openclaw tasks flow show flow_abc123 --json
openclaw tasks flow cancel flow_abc123
```

有关完整的 TaskFlow 概念和创作，请参阅 [TaskFlow](/zh/automation/taskflow)。有关父级 `tasks`CLI 命令，请参阅 [tasks CLI 参考](/zh/cli/tasks)。

## 相关

- [CLI 参考](CLI/en/cli)
- [自动化](/zh/automation)
- [TaskFlow](/zh/automation/taskflow)
