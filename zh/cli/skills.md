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

- Skills 系统：[Skills](/zh/tools/skills)
- Skills 配置：[Skills 配置](/zh/tools/skills-config)
- ClawHub 安装：[ClawHub](/zh/tools/clawhub)

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

import zh from "/components/footer/zh.mdx";

<zh />
