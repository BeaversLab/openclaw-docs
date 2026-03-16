---
summary: "仓库脚本：用途、范围和安全注意事项"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "脚本"
---

# 脚本

`scripts/` 目录包含用于本地工作流和运维任务的辅助脚本。
当任务明确与脚本相关时，请使用这些脚本；否则，首选 CLI。

## 约定

- 除非文档或发布检查清单中引用，否则脚本是**可选的**。
- 如果存在 CLI 界面，请优先使用它们（例如：身份监控使用 `openclaw models status --check`）。
- 假设脚本特定于主机；在新机器上运行前请阅读它们。

## 身份验证监控脚本

身份监控脚本记录在此处：
[/automation/auth-monitoring](/en/automation/auth-monitoring)

## 添加脚本时

- 保持脚本专注且有文档记录。
- 在相关文档中添加简短的条目（如果缺失则创建一个）。

import zh from "/components/footer/zh.mdx";

<zh />
