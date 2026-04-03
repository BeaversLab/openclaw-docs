---
summary: "关于发行说明和文档中旧版 ClawFlow 引用的兼容性说明"
read_when:
  - You encounter ClawFlow or openclaw flows in older release notes or docs
  - You want to understand what ClawFlow terminology maps to in the current CLI
  - You want to translate older flow references into the supported task commands
title: "ClawFlow"
---

# ClawFlow

`ClawFlow` 出现在一些较旧的 OpenClaw 发行说明和文档中，就好像它是一个面向用户的运行时，拥有自己的 `openclaw flows` 命令界面。

这并不是本仓库中当前面向操作员的界面。

如今，用于检查和管理分离工作的支持 CLI 界面是 [`openclaw tasks`](/en/automation/tasks)。

## 今天使用什么

- `openclaw tasks list` 显示已跟踪的分离运行
- `openclaw tasks show <lookup>` 通过任务 ID、运行 ID 或会话键显示一个任务
- `openclaw tasks cancel <lookup>` 取消正在运行的任务
- `openclaw tasks audit` 列出陈旧或损坏的任务运行

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## 这对旧版引用意味着什么

如果您在以下位置看到 `ClawFlow` 或 `openclaw flows`：

- 旧的发行说明
- 问题讨论串
- 陈旧的搜索结果
- 过时的本地笔记

请将这些说明转换为当前的任务 CLI：

- `openclaw flows list` -> `openclaw tasks list`
- `openclaw flows show <lookup>` -> `openclaw tasks show <lookup>`
- `openclaw flows cancel <lookup>` -> `openclaw tasks cancel <lookup>`

## 相关

- [后台任务](/en/automation/tasks) — 分离工作账本
- [CLI: flows](/en/cli/flows) — 关于错误命令名称的兼容性说明
- [Cron Jobs](/en/automation/cron-jobs) — 可能创建任务的计划作业
