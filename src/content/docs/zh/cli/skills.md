---
summary: "CLICLI 参考文档，用于 `openclaw skills`（search/install/update/verify/list/info/check/workshop）"
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
- Skill Workshop：[Skill Workshop](/zh/tools/skill-workshop)
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

`search`、`update` 和 `verify`ClawHub 直接使用 ClawHub。`install <slug>`ClawHub 安装 ClawHub Skill，`install git:owner/repo[@ref]` 克隆 Git Skill，而 `install ./path` 复制本地 Skill 目录。默认情况下，`install`、`update` 和 `verify` 以活动工作区 `skills/` 目录为目标；使用 `--global` 时，它们以共享托管 Skills 目录为目标。`list`/`info`/`check` 仍然会检查当前工作区和配置可见的本地 Skills。工作区支持的命令从 `--agent <id>` 解析目标工作区，然后是当前工作目录（当其位于已配置的代理工作区内时），最后是默认代理。

Git 和本地目录安装要求源根目录存在 `SKILL.md`。当 `SKILL.md` frontmatter `name` 有效时，安装名称（slug）来源于该字段，否则来源于源目录或仓库名称；请使用 `--as <slug>` 覆盖它。`--version`ClawHubnpm 仅限 ClawHub。Skill 安装不支持 npm 包规范或 zip/归档路径，且 `openclaw skills update`ClawHub 仅更新 ClawHub 跟踪的安装。

从新手引导或 Skills 设置触发的由 Gateway(网关) 支持的技能依赖安装，将改用单独的 Gateway(网关)`skills.install` 请求路径。

注：

- `search [query...]`ClawHub 接受一个可选查询；省略它以浏览默认的 ClawHub 搜索源。
- `search --limit <n>` 限制返回的结果数量。
- `install git:owner/repo[@ref]` 安装一个 Git 技能。分支引用可能包含斜杠，例如 `git:owner/repo@feature/foo`。
- `install ./path/to/skill` 安装一个本地目录，其根目录包含 `SKILL.md`。
- `install --as <slug>` 覆盖 Git 和本地目录安装中推断出的 slug。
- `install --version <version>`ClawHub 仅适用于 ClawHub 技能 slug。
- `install --force` 覆盖同一 slug 的现有工作区技能文件夹。
- `--global` 针对共享的管理技能目录，不能与 `--agent <id>` 结合使用。
- `--agent <id>` 针对一个配置的代理工作区，并覆盖当前工作区推断。
- `update <slug>` 更新单个跟踪的技能。添加 `--global` 以针对共享管理技能目录而非工作区。
- `update --all`ClawHub 更新选定工作区中跟踪的 ClawHub 安装，或在结合 `--global` 时更新共享管理技能目录中的安装。
- `verify <slug>`ClawHub 默认打印 ClawHub 的 `clawhub.skill.verify.v1` JSON 信封。没有 `--json` 标志，因为 JSON 已经是默认值。
- `verify` 对已安装的 ClawHub 技能使用 `.clawhub/origin.json`ClawHub，因此它会根据其来源注册表验证已安装的版本。`--version` 和 `--tag` 会覆盖版本选择器，但在存在源元数据时保留该已安装的注册表。
- `verify --card` 打印生成的 Skill Card Markdown 而不是 JSON。当 ClawHub 返回 `ok: false` 或 `decision: "fail"` 时，该命令以非零状态退出；除非 ClawHub 策略发生变化，否则未签名的签名仅供参考。
- 已安装的 ClawHub 捆绑包可以包含生成的 `skill-card.md`。OpenClaw 将验证视为 ClawHub 服务器的决定，并且不会仅仅因为生成的卡更改了捆绑包指纹而拒绝已安装的 skill。
- `check --agent <id>` 检查所选代理的工作区，并报告哪些就绪的 skills 实际上对该代理的提示或命令界面可见。
- 当未提供子命令时，`list` 是默认操作。
- `list`、`info` 和 `check` 将其渲染的输出写入 stdout。对于 `--json`，这意味着机器可读的有效载荷保留在 stdout 上，以便通过管道和脚本处理。

## Skill Workshop

`openclaw skills workshop` 管理所选工作区中的待处理 skill 提案。提案在被应用之前不是活动的 skills。有关提案存储、支持文件保护措施、Gateway(网关) 方法和批准策略，请参阅 [Skill Workshop](/zh/tools/skill-workshop)。

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal ./PROPOSAL.md
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal-dir ./qa-check-proposal
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Duplicate"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

## Related

- [CLI 参考](/zh/cli)
- [Skills](/zh/tools/skills)
