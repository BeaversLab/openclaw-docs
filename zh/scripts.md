---
summary: "仓库脚本：用途、范围和安全说明"
read_when:
  - 从仓库运行脚本
  - 在 ./scripts 下添加或更改脚本
title: "脚本"
---

# 脚本

`scripts/` 目录包含用于本地工作流和运维任务的辅助脚本。
当任务明确与脚本相关时使用这些脚本；否则首选 CLI。

## 约定

- 除非在文档或发布检查清单中引用，否则脚本是 **可选的**。
- 如果存在 CLI 接口，请优先使用（例如：身份验证监控使用 `openclaw models status --check`）。
- 假设脚本是特定于主机的；在新机器上运行之前请先阅读它们。

## 身份验证监控脚本

身份验证监控脚本在此处有文档记录：
[/automation/auth-monitoring](/zh/automation/auth-monitoring)

## 添加脚本时

- 保持脚本的专注性和文档化。
- 在相关文档中添加一个简短的条目（如果缺失则创建一个）。

import zh from "/components/footer/zh.mdx";

<zh />
