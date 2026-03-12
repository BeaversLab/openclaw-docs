---
summary: "存储库脚本：目的、范围和安全说明"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "脚本"
---

# 脚本

`scripts/` 目录包含用于本地工作流程和运维任务的辅助脚本。
当任务明确与脚本相关时使用这些脚本；否则优先使用 CLI。

## 约定

- 除非在文档或发布检查清单中引用，否则脚本是**可选**的。
- 如果存在 CLI 界面，请优先使用它们（例如：身份验证监控使用 `openclaw models status --check`）。
- 假设脚本是特定于主机的；在新机器上运行之前请先阅读它们。

## 身份验证监控脚本

身份验证监控脚本在此处有文档说明：
[/automation/auth-monitoring](/zh/en/automation/auth-monitoring)

## 添加脚本时

- 保持脚本的专注性和文档化。
- 在相关文档中添加一个简短的条目（如果缺失则创建一个）。
