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
openclaw skills update <slug>
openclaw skills update --all
openclaw skills update --all --agent <id>
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

`search`/`install`/`update`ClawHub 直接使用 ClawHub 并安装到活动
工作区 `skills/` 目录。`list`/`info`/`check` 仍然检查当前
工作区和配置可见的本地 Skills。工作区支持的命令
首先从 `--agent <id>` 解析目标工作区，然后当它位于已配置的 agent 工作区内时从当前工作
directory 解析，最后是默认
agent。

此 CLI CLI`install`ClawHubGateway(网关) 命令从 ClawHub 下载 skill 文件夹。从新手引导或 Skills 设置触发的 Gateway(网关) 支持
的 skill 依赖安装使用
单独的 `skills.install` 请求路径。

注意：

- `search [query...]`ClawHub 接受可选查询；省略它以浏览默认
  ClawHub 搜索源。
- `search --limit <n>` 限制返回的结果数量。
- `install --force` 覆盖相同
  slug 的现有工作区 skill 文件夹。
- `--agent <id>` 指定一个已配置的 agent 工作区并覆盖当前
  工作目录推断。
- `update --all`ClawHub 仅更新活动工作区中已跟踪的 ClawHub 安装。
- `check --agent <id>` 检查所选 agent 的工作区并报告哪些
  就绪的 Skills 实际上对该 agent 的提示或命令界面可见。
- 当未提供子命令时，`list` 是默认操作。
- `list`、`info` 和 `check` 将其渲染输出写入 stdout。使用
  `--json` 时，这意味着机器可读的负载保留在 stdout 上，以便用于管道
  和脚本。

## 相关

- [CLI 参考](CLI/en/cli)
- [Skills](/zh/tools/skills)
