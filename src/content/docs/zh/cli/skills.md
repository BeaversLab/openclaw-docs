---
summary: "CLI CLI 参考，用于 `openclaw skills` (search/install/update/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from ClawHub
  - You want to debug missing binaries/env/config for skills
title: "技能"
---

# `openclaw skills`

检查本地 Skills 并从 ClawHub 安装/更新 Skills。

相关：

- Skills 系统：[Skills](/en/tools/skills)
- Skills 配置：[Skills config](/en/tools/skills-config)
- ClawHub 安装：[ClawHub](/en/tools/clawhub)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

`search`/`install`/`update` 直接使用 ClawHub 并安装到活动
工作区 `skills/` 目录中。`list`/`info`/`check` 仍然检查当前
工作区和配置可见的本地 Skills。

此 CLI `install` 命令从 ClawHub 下载 skill 文件夹。从新手引导或 Skills 设置触发的 Gateway(网关)支持的 skill 依赖项安装改用单独的 `skills.install` 请求路径。
