---
summary: "通过 Skill Workshop 审核来创建和更新工作区技能"
read_when:
  - You want the agent to create or update a skill from chat
  - You need to review, apply, reject, or quarantine a generated skill draft
  - You are configuring Skill Workshop approval, autonomy, storage, or limits
title: "Skill Workshop"
sidebarTitle: "Skill Workshop"
---

Skill Workshop 是 OpenClaw 创建和更新工作区技能的受控路径。

代理和操作员不通过此路径直接写入活动的 `SKILL.md` 文件。他们首先创建一个 **proposal**。提案是一个待处理的草稿，其中包含建议的技能内容、目标绑定、扫描器状态、哈希值、支持文件元数据和回滚元数据。只有应用后，它才会变成实时技能。

Skill Workshop 仅写入工作区技能。它不会修改 bundled、plugin、ClawHub、extra-root、managed、personal-agent 或 system 技能。

## 工作原理

- **提案优先：** 生成的技能内容存储为 `PROPOSAL.md`，而不是
  `SKILL.md`。
- **应用是唯一的实时写入：** 创建、更新和修订不会改变
  活动技能。
- **工作区范围：** 创建以工作区 `skills/` 根目录为目标。更新
  仅允许对可写的工作区技能进行。
- **无覆盖：** 如果目标技能已存在，则创建失败。
- **哈希绑定：** 更新提案绑定到当前目标哈希，如果在应用前实时技能发生变化，则会变得过时。
- **扫描器门控：** 应用在写入之前重新运行扫描。
- **可恢复：** 应用在更改实时文件之前写入回滚元数据。
- **一致的界面：** 聊天、CLI 和 Gateway(网关) 都调用相同的 Skill
  Workshop 服务。

## 生命周期

```text
create/update -> pending
revise        -> pending
apply         -> applied
reject        -> rejected
quarantine    -> quarantined
target change -> stale
```

只有 `pending` 提案才可以被修订、应用、拒绝或隔离。

## 聊天

向代理询问您想要的技能。代理调用 `skill_workshop` 并
返回一个提案 ID。

创建：

```text
Make a skill called morning-catchup that runs my Monday inbox routine.
```

更新现有的工作区技能：

```text
Update trip-planning to also check seat maps before booking.
```

迭代待处理的提案：

```text
Show me the morning-catchup proposal.
Revise it to also flag anything marked urgent.
Apply the morning-catchup proposal.
```

默认情况下，代理发起的 `apply`、`reject` 和 `quarantine` 在运行前会显示批准提示。将 `skills.workshop.approvalPolicy` 设置为 `"auto"` 可以在受信任的环境中跳过该提示。

## CLI

创建新的技能提案：

```bash
openclaw skills workshop propose-create \
  --name morning-catchup \
  --description "Daily inbox catch-up: triage, archive, surface, draft, plan" \
  --proposal ./PROPOSAL.md
```

为现有的工作区技能创建更新提案：

```bash
openclaw skills workshop propose-update trip-planning --proposal ./PROPOSAL.md
```

列出并检查：

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
```

在批准前修订：

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
```

关闭提案：

```bash
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Duplicate"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

## 提案内容

在待处理期间，提案作为 `PROPOSAL.md` 存储，并带有仅限提案的 frontmatter：

```markdown
---
name: "morning-catchup"
description: "Daily inbox catch-up: triage, archive, surface, draft, plan"
status: proposal
version: "v1"
date: "2026-05-30T00:00:00.000Z"
---
```

应用时，Skill Workshop 会写入活动的 `SKILL.md` 并移除仅限提案的字段：`status`、提案 `version` 和提案 `date`。

## 支持文件

当提议的技能需要 `PROPOSAL.md` 旁边的文件时，请使用 `--proposal-dir`：

```bash
openclaw skills workshop propose-create \
  --name weekly-update \
  --description "Friday wrap-up: stats, highlights, next week's top three" \
  --proposal-dir ./weekly-update-proposal
```

目录必须包含 `PROPOSAL.md`。支持文件必须位于：

- `assets/`
- `examples/`
- `references/`
- `scripts/`
- `templates/`

Skill Workshop 会扫描、哈希处理并与提案一起存储支持文件。它们仅在应用时才会被写入到活动的 `SKILL.md` 旁边。

被拒绝的支持文件路径包括绝对路径、隐藏路径段、路径遍历、重叠路径、提案目录中的可执行文件、非 UTF-8 文本、空字节以及标准支持文件夹之外的文件。

## 代理工具

模型使用 `skill_workshop`：

```text
action: create | update | revise | list | inspect | apply | reject | quarantine
```

代理必须使用 `skill_workshop` 来进行生成的技能工作。它们不得通过 `write`、`edit`、`exec`、shell 命令或直接文件系统操作来创建或更改提案文件。

## 批准和自主权

```json5
{
  skills: {
    workshop: {
      autonomous: {
        enabled: false,
      },
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
  },
}
```

- `autonomous.enabled`：允许 OpenClaw 在成功的回合后从持久的对话信号创建待处理的提案。默认值：`false`。
- `approvalPolicy: "pending"`：在代理发起的 `apply`、`reject` 或 `quarantine` 之前需要批准提示。
- `approvalPolicy: "auto"`：跳过该批准提示。代理仍必须调用该操作。
- `maxPending`：限制每个工作区的待处理和隔离的提案。
- `maxSkillBytes`：限制提案正文大小。默认值：`40000`。

提案描述始终限制为 160 字节。

## Gateway(网关) 方法

```text
skills.proposals.list
skills.proposals.inspect
skills.proposals.create
skills.proposals.update
skills.proposals.revise
skills.proposals.apply
skills.proposals.reject
skills.proposals.quarantine
```

只读方法需要 `operator.read`。变更方法需要 `operator.admin`。

## 存储

```text
<OPENCLAW_STATE_DIR>/skill-workshop/
  proposals.json
  proposals/<proposal-id>/
    proposal.json
    PROPOSAL.md
    rollback.json
    assets/
    examples/
    references/
    scripts/
    templates/
```

默认状态目录：`~/.openclaw`。

- `proposal.json`：规范提案记录。
- `proposals.json`：快速列表索引，可从提案文件夹重建。
- `PROPOSAL.md`：待处理的技能提案。
- `rollback.json`：在应用更改实时文件之前写入的恢复元数据。

## 限制

- 描述：160 字节。
- 提案正文：`skills.workshop.maxSkillBytes`（默认 40,000）。
- 支持文件：每个提案 64 个。
- 支持文件大小：每个 256 KB，总共 2 MB。
- 待处理和隔离的提案：每个工作区 `skills.workshop.maxPending` 个
  （默认 50）。

## 故障排除

| 问题                                           | 解决方案                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Skill proposal description is too large`      | 将 `description` 缩短至 160 字节或更少。                                              |
| `Skill proposal content is too large`          | 缩短提案正文或提高 `skills.workshop.maxSkillBytes`。                                  |
| `Target skill changed after proposal creation` | 针对当前目标修改提案，或创建一个新提案。                                              |
| `Proposal scan failed`                         | 检查扫描器发现，然后修改或隔离该提案。                                                |
| `Support file paths must be under one of...`   | 将支持文件移至 `assets/`、`examples/`、`references/`、`scripts/` 或 `templates/` 下。 |
| 提案未显示在列表中                             | 检查所选的 `--agent` 工作区和 `OPENCLAW_STATE_DIR`。                                  |

## 相关

- [Skills](/zh/tools/skills) 的加载顺序、优先级和可见性
- [Creating skills](/zh/tools/creating-skills) 用于手写 `SKILL.md`
  基础知识
- [Skills config](/zh/tools/skills-config) 用于完整的 `skills.workshop` 架构
- [Skills CLI](CLI/en/cli/skills) 用于 `openclaw skills` 命令
