---
summary: "仓库脚本：用途、范围和安全说明"
read_when:
  - "Running scripts from the repo"
  - "Adding or changing scripts under ./scripts"
title: "脚本"
---

# 脚本

`scripts/` 目录包含用于本地工作流和运维任务的辅助脚本。
当任务明确与某个脚本相关时使用这些脚本；否则优先使用 CLI。

## 约定

- 除非文档或发布检查清单中引用，否则脚本是**可选的**。
- 当存在 CLI 时优先使用 CLI（例如：身份验证监控使用 `openclaw models status --check`）。
- 假定脚本是特定于主机的；在新机器上运行之前请先阅读脚本。

## 身份验证监控脚本

身份验证监控脚本的文档位于：
[/automation/auth-monitoring](/zh/automation/auth-monitoring)

## 添加脚本时

- 保持脚本专注且有文档记录。
- 在相关文档中添加简短的条目（如果缺失则创建一个）。
