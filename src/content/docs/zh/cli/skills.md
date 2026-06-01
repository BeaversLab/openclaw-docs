---
summary: "CLI 参考文档，用于 `openclaw skills`（搜索/安装/更新/验证/列表/信息/检查）"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You want to verify a ClawHub skill with ClawHub
  - You want to debug missing binaries/env/config for skills
title: "Skills"
---

# `openclaw skills`

检查本地 Skills，搜索 ClawHub，从 ClawHub/Git/本地目录安装 Skills，验证 ClawHub Skills，并更新 ClawHub 跟踪的安装。

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
openclaw skills verify <slug>
openclaw skills verify <slug> --version <version>
openclaw skills verify <slug> --tag <tag>
openclaw skills verify <slug> --card
openclaw skills verify <slug> --global
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

`search`、`update` 和 `verify` 直接使用 ClawHub。`install <slug>` 安装 ClawHub Skill，`install git:owner/repo[@ref]` 克隆 Git Skill，而 `install ./path` 复制本地 Skill 目录。默认情况下，`install`、`update` 和 `verify` 以活动工作区 `skills/` 目录为目标；使用 `--global` 时，它们以共享的受管 Skills 目录为目标。`list`/`info`/`check` 仍然检查当前工作区和配置可见的本地 Skills。工作区支持的命令从 `--agent <id>` 解析目标工作区，然后当当前工作目录位于已配置的代理工作区内时解析当前工作目录，最后解析默认代理。

Git 和本地目录安装要求源根目录下有 `SKILL.md`。当有效时，安装 slug 来自 `SKILL.md` 前置数据 `name`，然后是源目录或存储库名称；使用 `--as <slug>` 覆盖它。`--version` 仅限 ClawHub。Skill 安装不支持 npm 包规范或 zip/归档路径，并且 `openclaw skills update` 仅更新 ClawHub 跟踪的安装。

从新手引导或 Skills 设置触发的、由 Gateway(网关) 支持的技能依赖安装使用单独的 Gateway(网关)`skills.install` 请求路径。

注：

- `search [query...]`ClawHub 接受可选查询；省略它以浏览默认的 ClawHub 搜索源。
- `search --limit <n>` 限制返回的结果数量。
- `install git:owner/repo[@ref]` 安装 Git 技能。分支引用可能包含斜杠，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安装一个根目录包含 `SKILL.md` 的本地目录。
- `install --as <slug>` 覆盖 Git 和本地目录安装推断出的简称。
- `install --version <version>`ClawHub 仅适用于 ClawHub 技能简称。
- `install --force` 覆盖同一简称的现有工作区技能文件夹。
- `--global` 针对共享托管技能目录，且不能与 `--agent <id>` 结合使用。
- `--agent <id>` 针对一个已配置的代理工作区，并覆盖当前工作目录推断。
- `update <slug>` 更新单个已跟踪技能。添加 `--global` 以针对共享托管技能目录而不是工作区。
- `update --all`ClawHub 更新选定工作区中已跟踪的 ClawHub 安装，或者在与 `--global` 结合使用时更新共享托管技能目录中的安装。
- `verify <slug>`ClawHub 默认打印 ClawHub 的 `clawhub.skill.verify.v1` JSON 信封。没有 `--json` 标志，因为 JSON 已经是默认值。
- `verify` 对已安装的 ClawHub 技能使用 `.clawhub/origin.json`ClawHub，因此它会根据其来源的注册表验证已安装的版本。`--version` 和 `--tag` 会覆盖版本选择器，但在存在源元数据时保留该已安装的注册表。
- `verify --card` 打印生成的技能卡 Markdown 而非 JSON。当 ClawHub 返回 `ok: false` 或 `decision: "fail"` 时，命令退出码为非零；除非 ClawHub 策略发生变化，否则未签名的签名仅供参考。
- 已安装的 ClawHub 包可以包含生成的 `skill-card.md`。OpenClaw 将验证视为 ClawHub 服务器的决定，不会仅仅因为生成的卡更改了包指纹而拒绝已安装的技能。
- `check --agent <id>` 检查所选代理的工作区，并报告哪些准备就绪的技能实际可见于该代理的提示或命令界面。
- `list` 是未提供子命令时的默认操作。
- `list`、`info` 和 `check` 将其渲染的输出写入标准输出。对于 `--json`，这意味着机器可读的负载保留在标准输出中，以便用于管道和脚本。

## 相关

- [CLI 参考](/zh/cli)
- [技能](/zh/tools/skills)
