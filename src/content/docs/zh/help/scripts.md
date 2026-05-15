---
summary: "仓库脚本：用途、范围和安全注意事项"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "脚本"
---

`scripts/` 目录包含用于本地工作流和运维任务的辅助脚本。
当任务明确与脚本相关时使用这些脚本；否则优先使用 CLI。

## 约定

- 除非在文档或发布检查清单中引用，否则脚本是**可选**的。
- 当存在 CLI 接口时，优先使用它们（例如：身份验证监控使用 `openclaw models status --check`）。
- 假定脚本是特定于主机的；在新机器上运行之前，请先阅读这些脚本。

## 身份验证监控脚本

身份验证监控在 [身份验证](/zh/gateway/authentication) 中有介绍。`scripts/` 下的脚本是用于 systemd/Termux 手机工作流的可选附加项。

## GitHub 读取辅助工具

当您希望 `gh` 使用 GitHub App 安装令牌进行仓库范围的读取调用，同时将正常的 `gh` 保留在您的个人登录上以进行写入操作时，请使用 `scripts/gh-read`。

必需的环境变量：

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

可选的环境变量：

- `OPENCLAW_GH_READ_INSTALLATION_ID` 当您想跳过基于仓库的安装查找时
- `OPENCLAW_GH_READ_PERMISSIONS` 作为请求的读取权限子集的逗号分隔覆盖项

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
- 在相关文档中添加一个简短的条目（如果缺少，则创建一个）。

## 相关

- [测试](/zh/help/testing)
- [实时测试](/zh/help/testing-live)
