---
title: "脚本"
summary: "仓库脚本：用途、范围与安全说明"
read_when:
  - 运行仓库中的脚本
  - 在 ./scripts 下新增或修改脚本
---
# 脚本

`scripts/` 目录包含本地工作流与运维任务的辅助脚本。任务明确对应脚本时使用，否则优先使用 CLI。

## 约定

- 除非文档或发布清单引用，脚本 **可选**。
- 若已有 CLI 接口，优先使用（例如认证监控使用 `openclaw models status --check`）。
- 假定脚本与主机相关；在新机器上运行前先阅读。

## Git hooks

- `scripts/setup-git-hooks.js`：在 git 仓库内尽力设置 `core.hooksPath`。
- `scripts/format-staged.js`：对已暂存的 `src/` 与 `test/` 文件进行 pre-commit 格式化。

## 认证监控脚本

认证监控脚本文档见：
[/automation/auth-monitoring](/zh/automation/auth-monitoring)

## 新增脚本时

- 保持脚本聚焦并有文档说明。
- 在相关文档中添加简短条目（如无则创建）。
