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

身份验证监控在 [身份验证](/zh/gateway/authentication) 中进行了介绍。`scripts/` 下的脚本是针对 systemd/Termux 手机工作流的可选附加工具。

## GitHub read helper

当你希望 `gh` 使用 GitHub App 安装令牌进行仓库范围的读取调用，同时保留个人登录的正常 `gh` 用于写入操作时，请使用 `scripts/gh-read`。

必需环境变量：

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

可选环境变量：

- `OPENCLAW_GH_READ_INSTALLATION_ID` 当你想跳过基于仓库的安装查找时
- `OPENCLAW_GH_READ_PERMISSIONS` 作为请求读取权限子集的逗号分隔覆盖值

仓库解析顺序：

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

示例：

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## 添加脚本时

- 保持脚本的专注性和文档化。
- 在相关文档中添加简短的条目（如果缺失则创建一个）。
