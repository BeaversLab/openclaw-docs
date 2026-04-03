---
summary: "关于错误记录的 `openclaw flows` 命令的兼容性说明"
read_when:
  - You encounter openclaw flows in older release notes, issue threads, or search results
  - You want to know what command replaced openclaw flows
title: "flows"
---

# `openclaw flows`

`openclaw flows` **不是** 当前的 OpenClaw CLI 命令。

一些较早的发行说明和文档错误地记录了 `flows` 命令界面。支持的操作员界面是 [`openclaw tasks`](/en/automation/tasks)。

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## 改用

- `openclaw tasks list` — 列出已跟踪的后台任务
- `openclaw tasks show <lookup>` — 通过任务 ID、运行 ID 或会话密钥检查单个任务
- `openclaw tasks cancel <lookup>` — 取消正在运行的后台任务
- `openclaw tasks notify <lookup> <policy>` — 更改任务通知行为
- `openclaw tasks audit` — 显示过时或损坏的任务运行

## 存在此页面的原因

保留此页面是为了使来自较早更新日志条目、问题帖子和搜索结果的现有链接能够得到明确的更正，而不是进入死胡同。

## 相关

- [后台任务](/en/automation/tasks) — 独立的工作台账
- [CLI 参考](/en/cli/index) — 完整的命令树
