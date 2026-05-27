---
summary: "CLI CLI 参考，用于 `openclaw skills` (search/install/update/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You want to debug missing binaries/env/config for skills
title: "Skills"
---

# `openclaw skills`

检查本地 Skills，搜索 ClawHub，从 ClawHub/Git/本地目录安装 Skills，并更新 ClawHub 跟踪的安装。

相关：

- Skills 系统：[Skills](/zh/tools/skills)
- Skills 配置：[Skills config](/zh/tools/skills-config)
- ClawHub 安装：[ClawHub](/zh/clawhub/cli)

## 命令

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
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

`search` 和 `update` 直接使用 ClawHub。`install <slug>` 安装 ClawHub skill，`install git:owner/repo[@ref]` 克隆 Git skill，而 `install ./path` 复制本地 skill 目录。默认情况下，`install` 和 `update` 的目标是活动工作区 `skills/` 目录；使用 `--global` 时，它们的目标是共享的托管 skills 目录。`list`/`info`/`check` 仍然检查当前工作区和配置可见的本地 skills。基于工作区的命令首先从 `--agent <id>` 解析目标工作区，然后是当其位于已配置的代理工作区内时的当前工作目录，最后是默认代理。

Git 和本地目录安装要求在源根目录下有 `SKILL.md`。安装的 slug 来源于 `SKILL.md` frontmatter `name`（当其有效时），然后是源目录或仓库名称；使用 `--as <slug>` 覆盖它。`--version` 仅限 ClawHub。Skill 安装不支持 npm 包规范或 zip/归档路径，且 `openclaw skills update` 仅更新 ClawHub 跟踪的安装。

从新手引导或 Skills 设置触发的 Gateway(网关) 支持的 skill 依赖项安装，改用单独的 `skills.install` 请求路径。

注：

- `search [query...]` 接受一个可选的查询；省略它以浏览默认的
  ClawHub 搜索源。
- `search --limit <n>` 限制返回的结果。
- `install git:owner/repo[@ref]` 安装 Git 技能。分支引用可能包含
  斜杠，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安装一个根目录包含
  `SKILL.md` 的本地目录。
- `install --as <slug>` 覆盖 Git 和本地目录
  安装的推断 slug。
- `install --version <version>` 仅适用于 ClawHub 技能 slug。
- `install --force` 覆盖同一 slug 的现有工作区技能文件夹。
- `--global` 针对共享管理技能目录，不能与
  `--agent <id>` 结合使用。
- `--agent <id>` 针对一个配置的代理工作区，并覆盖当前
  工作目录推断。
- `update <slug>` 更新单个跟踪的技能。添加 `--global` 以针对
  共享管理技能目录而不是工作区。
- `update --all` 更新所选工作区中跟踪的 ClawHub 安装，或者
  当与 `--global` 结合使用时，更新共享管理技能目录中的安装。
- `check --agent <id>` 检查所选代理的工作区，并报告哪些
  就绪的技能实际对该代理的提示或命令界面可见。
- 当未提供子命令时，`list` 是默认操作。
- `list`、`info` 和 `check` 将其渲染的输出写入 stdout。对于
  `--json`，这意味着机器可读的负载保留在 stdout 上，以便通过管道
  和脚本处理。

## 相关

- [CLI 参考](/zh/cli)
- [Skills](/zh/tools/skills)
