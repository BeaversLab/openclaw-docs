---
summary: "CLI CLI 参考，用于 `openclaw skills` (search/install/update/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from ClawHub
  - You want to debug missing binaries/env/config for skills
title: "Skills"
---

# `openclaw skills`

检查本地 Skills 并从 ClawHub 安装/更新 Skills。

相关：

- Skills 系统：[Skills](/zh/tools/skills)
- Skills 配置：[Skills config](/zh/tools/skills-config)
- ClawHub 安装：[ClawHub](ClawHubClawHub/en/clawhub/cli)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills install <slug> --global
openclaw skills update <slug>
openclaw skills update <slug> --global
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills update --all --global
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills list --agent <id>
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills info <name> --agent <id>
openclaw skills check
openclaw skills check --agent <id>
openclaw skills check --json
```

`search`/`install`/`update`ClawHub 直接使用 ClawHub。默认情况下，`install` 和 `update` 针对活动工作区 `skills/` 目录；使用 `--global` 时，它们针对共享管理的 skills 目录。`list`/`info`/`check` 仍然检查当前工作区和配置可见的本地 skills。支持工作区的命令首先从 `--agent <id>` 解析目标工作区，然后在位于配置的代理工作区内时解析当前工作目录，最后解析默认代理。

此 CLI CLI`install`ClawHubGateway(网关) 命令从 ClawHub 下载 skill 文件夹。从新手引导或 Skills 设置触发的 Gateway 支持的 skill 依赖项安装改用单独的 `skills.install` 请求路径。

注意：

- `search [query...]`ClawHub 接受可选查询；省略它以浏览默认的 ClawHub 搜索订阅源。
- `search --limit <n>` 限制返回的结果。
- `install --force` 会覆盖同一 slug 的现有工作区 skill 文件夹。
- `--global` 针对共享管理的 skills 目录，不能与 `--agent <id>` 组合使用。
- `--agent <id>` 针对一个已配置的代理工作区，并覆盖当前工作目录推断。
- `update <slug>` 更新单个已跟踪的 skill。添加 `--global` 以针对共享管理的 skills 目录而不是工作区。
- `update --all`ClawHub 更新选定工作区中已跟踪的 ClawHub 安装，或在与 `--global` 组合时更新共享管理的 skills 目录中的安装。
- `check --agent <id>` 检查所选代理的工作区，并报告哪些
  准备就绪的 Skills 实际上对该代理的提示或命令界面可见。
- 当未提供子命令时，`list` 是默认操作。
- `list`、`info` 和 `check` 将其渲染的输出写入 stdout。对于
  `--json`，这意味着机器可读的有效载荷保留在 stdout 上，以便通过管道
  和脚本使用。

## 相关

- [CLI 参考](CLI/en/cli)
- [Skills](/zh/tools/skills)
