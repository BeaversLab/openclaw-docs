---
summary: "CLICLI 参考 for `openclaw skills` (搜索/安装/更新/验证/列表/信息/检查/研讨会)"
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
- ClawHub 安装：[ClawHub](ClawHubClawHub/en/clawhub/cli)

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
openclaw skills workshop propose-create --name "qa-check" --description "QA checklist" --proposal ./PROPOSAL.md
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Not reusable"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

`search`、`update` 和 `verify`ClawHub 直接使用 ClawHub。`install <slug>`ClawHub 安装
ClawHub skill，`install git:owner/repo[@ref]` 克隆 Git skill，
`install ./path` 复制本地 skill 目录。默认情况下，`install`、`update`
和 `verify` 以活动工作区 `skills/` 目录为目标；使用 `--global` 时，
它们以共享托管 skills 目录为目标。`list`/`info`/`check` 仍然
检查当前工作区和配置可见的本地 skills。
工作区支持的命令从 `--agent <id>` 解析目标工作区，然后
当其位于配置的代理工作区内时解析当前工作目录，
然后是默认代理。

Git 和本地目录安装要求在源根目录有 `SKILL.md`。
安装 slug 来自 `SKILL.md` frontmatter `name`（当其有效时），然后是
源目录或仓库名称；使用 `--as <slug>` 覆盖它。`--version`ClawHubnpm
仅限 ClawHub。Skill 安装不支持 npm 包规范或 zip/归档
路径，并且 `openclaw skills update`ClawHub 仅更新 ClawHub 跟踪的安装。

从新手引导或 Skills 设置触发的 Gateway(网关) 支持的技能依赖项安装，改用单独的 Gateway(网关)`skills.install` 请求路径。

注：

- `search [query...]`ClawHub 接受可选查询；省略该查询以浏览默认的 ClawHub 搜索源。
- `search --limit <n>` 限制返回的结果数量。
- `install git:owner/repo[@ref]` 安装 Git 技能。分支引用可能包含斜杠，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安装本地目录，其根目录包含 `SKILL.md`。
- `install --as <slug>` 覆盖 Git 和本地目录安装推断出的别名。
- `install --version <version>`ClawHub 仅适用于 ClawHub 技能别名。
- `install --force` 覆盖同一别名的现有工作区技能文件夹。
- `--global` 针对共享托管技能目录，不能与 `--agent <id>` 组合使用。
- `--agent <id>` 针对一个已配置的代理工作区，并覆盖当前工作目录推断。
- `update <slug>` 更新单个已跟踪的技能。添加 `--global` 以针对共享托管技能目录而非工作区。
- `update --all`ClawHub 更新所选工作区中已跟踪的 ClawHub 安装项，或在与 `--global` 组合时，更新共享托管技能目录中的安装项。
- `verify <slug>`ClawHub 默认打印 ClawHub 的 `clawhub.skill.verify.v1` JSON 信封。没有 `--json` 标志，因为 JSON 已经是默认值。
- `verify` 对已安装的 ClawHub 技能使用 `.clawhub/origin.json`ClawHub，因此它会根据来源注册表验证已安装的版本。`--version` 和 `--tag` 覆盖版本选择器，但在存在源元数据时保留该已安装的注册表。
- `verify --card` 打印生成的技能卡 Markdown 而不是 JSON。当 ClawHub 返回 `ok: false` 或 `decision: "fail"` 时，该命令以非零状态退出；除非 ClawHub 策略更改，否则未签名的签名仅供参考。
- 已安装的 ClawHub 捆绑包可以包含生成的 `skill-card.md`。OpenClaw 将验证视为 ClawHub 服务器的决定，并且不会仅仅因为该生成的卡片更改了捆绑包指纹而拒绝已安装的技能。
- `check --agent <id>` 检查所选代理的工作区并报告哪些就绪的技能实际上对该代理的提示或命令界面可见。
- 当未提供子命令时，`list` 是默认操作。
- `list`、`info` 和 `check` 将其渲染后的输出写入 stdout。对于 `--json`，这意味着机器可读的有效负载保留在 stdout 上，以便通过管道和脚本使用。

## 技能工坊提案

`openclaw skills workshop` 管理所选工作区中的待处理技能提案。提案是位于 `<OPENCLAW_STATE_DIR>/skill-workshop/proposals/` 下的持久 OpenClaw 状态；在应用之前，它们不是活动技能。默认状态目录是 `~/.openclaw`。提案正文遵循 `skills.workshop.maxSkillBytes`，提案描述上限为 160 字节，因为它们可以出现在发现和列表输出中。

从草稿 markdown 文件创建提案：

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal ./PROPOSAL.md
```

或者从完整的草稿技能目录创建提案：

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal-dir ./qa-check-proposal
```

通过相同的待处理路径更新现有的工作区技能：

```bash
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
```

在批准之前修改待处理的提案：

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
```

提供的草稿存储为 `PROPOSAL.md`，并带有仅限提案的前置元数据：

```markdown
---
name: qa-check
description: Repeatable QA checklist
status: proposal
version: v1
date: "2026-05-30T00:00:00.000Z"
---
```

应用提案会将活动的 `SKILL.md` 写入工作区 `skills/` 根目录，从 frontmatter 中移除 `status`、提案 `version` 和提案 `date`，扫描草稿，写入回滚元数据，并在目标技能在提案创建后被更改时拒绝过时的更新。

当使用 `--proposal-dir` 时，该目录必须包含 `PROPOSAL.md`。支持文件可以包含在 `assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下。OpenClaw 会将支持文件与提案一起存储，扫描它们，在应用前验证其哈希值，并仅在提案应用后将它们写入活动的 `SKILL.md` 旁边。

当用户要求捕获可复用工作时，Agent 可以通过 `skill_workshop` 工具创建、修订、列出和检查待处理的提案。来自持久对话信号的自主提案捕获默认关闭，可以通过 `skills.workshop.autonomous.enabled` 启用。如果用户明确要求批准/使用/应用、拒绝或隔离特定提案，`skill_workshop` 也可以通过相同的 Skill Workshop 保护措施执行该提案生命周期操作。

## 相关

- [CLI 参考](/zh/cli)
- [Skills](/zh/tools/skills)
