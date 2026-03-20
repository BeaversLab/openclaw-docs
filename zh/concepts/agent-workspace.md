---
summary: "Agent workspace：位置、布局和备份策略"
read_when:
  - 您需要解释 Agent 工作区或其文件布局
  - 您想要备份或迁移 Agent 工作区
title: "Agent Workspace"
---

# Agent 工作区

工作区是 Agent 的主目录。它是文件工具和工作区上下文使用的唯一工作目录。请保持其私密性并将其视为记忆。

这与 `~/.openclaw/` 不同，后者用于存储配置、凭据和会话。

**重要提示：** 工作区是**默认 cwd**，而不是硬性沙箱。工具根据工作区解析相对路径，但绝对路径仍然可以到达主机上的其他位置，除非启用了沙箱隔离。如果您需要隔离，请使用 [`agents.defaults.sandbox`](/zh/gateway/sandboxing)（和/或每个 Agent 的沙箱配置）。
当启用沙箱隔离且 `workspaceAccess` 不为 `"rw"` 时，工具将在 `~/.openclaw/sandboxes` 下的沙箱工作区内操作，而不是在您的主机工作区内。

## 默认位置

- 默认值：`~/.openclaw/workspace`
- 如果设置了 `OPENCLAW_PROFILE` 且不为 `"default"`，默认值将变为
  `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆盖：

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace",
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 将创建工作区并在缺失时植入引导文件。
沙箱种子副本仅接受工作区内的常规文件；解析到源工作区之外的符号链接/硬链接别名将被忽略。

如果您自己管理工作区文件，可以禁用引导文件创建：

```json5
{ agent: { skipBootstrap: true } }
```

## 额外的工作区文件夹

较早的安装可能创建了 `~/openclaw`。保留多个工作区目录可能会导致身份验证或状态漂移混乱，因为同一时间只有一个工作区处于活动状态。

**建议：** 保持单个活动工作区。如果您不再使用额外文件夹，请将其存档或移至废纸篓（例如 `trash ~/openclaw`）。
如果您有意保留多个工作区，请确保 `agents.defaults.workspace` 指向活动的工作区。

`openclaw doctor` 在检测到额外的工作区目录时会发出警告。

## 工作区文件映射（每个文件的含义）

这些是 OpenClaw 在工作区内期望的标准文件：

- `AGENTS.md`
  - 代理的操作指令以及它应如何使用记忆。
  - 在每个会话开始时加载。
  - 存放规则、优先级和“行为准则”细节的好地方。

- `SOUL.md`
  - 人设、语气和界限。
  - 在每个会话中加载。

- `USER.md`
  - 用户是谁以及如何称呼他们。
  - 在每个会话中加载。

- `IDENTITY.md`
  - 代理的名称、氛围和表情符号。
  - 在引导仪式期间创建/更新。

- `TOOLS.md`
  - 关于本地工具和约定的说明。
  - 不控制工具的可用性；它只是指导性信息。

- `HEARTBEAT.md`
  - 用于心跳运行的可选微型检查清单。
  - 保持简短以避免令牌消耗。

- `BOOT.md`
  - 当启用内部钩子时，在网关重启时执行的可选启动检查清单。
  - 保持简短；使用消息工具进行对外发送。

- `BOOTSTRAP.md`
  - 一次性首次运行仪式。
  - 仅为全新的工作区创建。
  - 仪式完成后将其删除。

- `memory/YYYY-MM-DD.md`
  - 每日记忆日志（每天一个文件）。
  - 建议在会话开始时阅读今天 + 昨天的日志。

- `MEMORY.md`（可选）
  - 精心策划的长期记忆。
  - 仅在主要的私人会话中加载（不在共享/群组上下文中）。

有关工作流程和自动记忆刷新的信息，请参阅 [Memory](/zh/concepts/memory)。

- `skills/`（可选）
  - 特定于工作区的技能。
  - 当名称冲突时，覆盖托管/捆绑的技能。

- `canvas/`（可选）
  - 用于节点显示的 Canvas UI 文件（例如 `canvas/index.html`）。

如果缺少任何引导文件，OpenClaw 会向会话中注入一个“缺失文件”标记并继续。注入时会截断大型引导文件；可以通过 `agents.defaults.bootstrapMaxChars`（默认：20000）和 `agents.defaults.bootstrapTotalMaxChars`（默认：150000）调整限制。`openclaw setup` 可以重新创建缺失的默认文件，而不会覆盖现有文件。

## 工作区中没有的内容

这些内容位于 `~/.openclaw/` 下，不应提交到工作区仓库：

- `~/.openclaw/openclaw.json`（配置）
- `~/.openclaw/credentials/`（OAuth 令牌、API 密钥）
- `~/.openclaw/agents/<agentId>/sessions/`（会话记录 + 元数据）
- `~/.openclaw/skills/`（托管技能）

如果需要迁移会话或配置，请单独复制它们，并将其保持在版本控制之外。

## Git 备份（推荐，私有）

将工作区视为私有内存。将其放入一个**私有** git 仓库中，以便进行备份和恢复。

在运行 Gateway 的机器上运行这些步骤（那是工作区所在的位置）。

### 1) 初始化仓库

如果安装了 git，全新的工作区将自动初始化。如果该工作区还不是仓库，请运行：

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 添加私有远程仓库（对新手友好的选项）

选项 A：GitHub Web UI

1. 在 GitHub 上创建一个新的**私有**仓库。
2. 不要用 README 初始化（以避免合并冲突）。
3. 复制 HTTPS 远程 URL。
4. 添加远程仓库并推送：

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

选项 B：GitHub CLI（`gh`）

```bash
gh auth login
gh repo create openclaw-workspace --private --source . --remote origin --push
```

选项 C：GitLab Web UI

1. 在 GitLab 上创建一个新的**私有**仓库。
2. 不要用 README 初始化（以避免合并冲突）。
3. 复制 HTTPS 远程 URL。
4. 添加远程仓库并推送：

```bash
git branch -M main
git remote add origin <https-url>
git push -u origin main
```

### 3) 持续更新

```bash
git status
git add .
git commit -m "Update memory"
git push
```

## 请勿提交机密信息

即使在私有仓库中，也要避免在工作区存储机密信息：

- API 密钥、OAuth 令牌、密码或私有凭证。
- `~/.openclaw/` 下的任何内容。
- 聊天的原始转储或敏感附件。

如果必须存储敏感引用，请使用占位符，并将真正的机密信息保存在别处（密码管理器、环境变量或 `~/.openclaw/`）。

建议的 `.gitignore` 入门内容：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 将工作区移动到新机器

1. 将仓库克隆到所需路径（默认 `~/.openclaw/workspace`）。
2. 在 `~/.openclaw/openclaw.json` 中将 `agents.defaults.workspace` 设置为该路径。
3. 运行 `openclaw setup --workspace <path>` 以生成任何缺失的文件。
4. 如果您需要会话，请从旧机器单独复制 `~/.openclaw/agents/<agentId>/sessions/`。

## 高级说明

- 多代理路由可以为每个代理使用不同的工作空间。有关路由配置，请参阅 [Channel routing](/zh/channels/channel-routing)。
- 如果启用了 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot` 下的逐会话沙箱工作空间。

import zh from "/components/footer/zh.mdx";

<zh />
