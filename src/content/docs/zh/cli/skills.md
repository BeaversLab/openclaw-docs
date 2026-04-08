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

- Skills system: [Skills](/en/tools/skills)
- Skills config: [Skills config](/en/tools/skills-config)
- ClawHub installs: [ClawHub](/en/tools/clawhub)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills check
openclaw skills check --json
```

`search`/`install`/`update` 直接使用 ClawHub 并安装到活动
工作区 `skills/` 目录中。`list`/`info`/`check` 仍然检查当前
工作区和配置可见的本地 Skills。

此 CLI `install` 命令从 ClawHub 下载 skill 文件夹。从新手引导或 Skills 设置触发的 Gateway(网关)支持的 skill 依赖项安装改用单独的 `skills.install` 请求路径。

注意：

- `search [query...]` 接受一个可选查询；省略它以浏览默认
  ClawHub 搜索源。
- `search --limit <n>` 限制返回的结果数量。
- `install --force` 会覆盖同一 slug 的现有工作区技能文件夹。
- `update --all` 仅更新活动工作区中已跟踪的 ClawHub 安装。
- 当未提供子命令时，`list` 是默认操作。
- `list`、`info` 和 `check` 将其渲染输出写入 stdout。使用
  `--json` 时，这意味着机器可读的负载保留在 stdout 上，以便通过管道和脚本使用。
