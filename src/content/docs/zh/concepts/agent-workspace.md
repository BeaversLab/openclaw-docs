---
summary: "Agent workspace: location, layout, and backup strategy"
read_when:
  - You need to explain the agent workspace or its file layout
  - You want to back up or migrate an agent workspace
title: "Agent Workspace"
---

# 代理工作区

工作区是代理的家。它是用于文件工具和工作区上下文的唯一工作目录。请保持私密并将其视为记忆。

这与 `~/.openclaw/` 不同，后者存储配置、凭据和会话。

**重要提示：**工作区是**默认 cwd**（当前工作目录），而不是严格的沙箱。工具根据工作区解析相对路径，但除非启用了沙箱隔离，否则绝对路径仍可访问主机上的其他位置。如果需要隔离，请使用 [`agents.defaults.sandbox`](/en/gateway/sandboxing)（和/或每个代理的沙箱配置）。
当启用了沙箱隔离且 `workspaceAccess` 不是 `"rw"` 时，工具将在 `~/.openclaw/sandboxes` 下的沙箱工作区内操作，而不是在您的主机工作区内。

## 默认位置

- 默认值： `~/.openclaw/workspace`
- 如果设置了 `OPENCLAW_PROFILE` 且不为 `"default"`，则默认值将变为
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
沙箱种子副本仅接受常规的工作区内文件；解析到源工作区外部的符号链接/硬链接别名将被忽略。

如果您自己管理工作区文件，则可以禁用引导文件创建：

```json5
{ agent: { skipBootstrap: true } }
```

## 额外的工作区文件夹

较旧的安装可能创建了 `~/openclaw`。保留多个工作区目录可能会导致身份验证或状态漂移混乱，因为一次只有一个工作区处于活动状态。

**建议：** 保持单个活动工作区。如果您不再使用额外文件夹，请将其存档或移至废纸篓（例如 `trash ~/openclaw`）。
如果您有意保留多个工作区，请确保 `agents.defaults.workspace` 指向当前活动的工作区。

当 `openclaw doctor` 检测到额外的工作区目录时会发出警告。

## 工作区文件映射（每个文件的含义）

这些是 OpenClaw 在工作区内期望的标准文件：

- `AGENTS.md`
  - 代理的操作说明及其应如何使用内存。
  - 在每个会话开始时加载。
  - 规则、优先级和“如何表现”细节的好去处。

- `SOUL.md`
  - 角色、语气和边界。
  - 每次会话加载。
  - 指南：[SOUL.md 性格指南](/en/concepts/soul)

- `USER.md`
  - 用户是谁以及如何称呼他们。
  - 每次会话加载。

- `IDENTITY.md`
  - 代理的名称、氛围和表情符号。
  - 在启动仪式期间创建/更新。

- `TOOLS.md`
  - 关于本地工具和约定的说明。
  - 不控制工具的可用性；它仅作为指导。

- `HEARTBEAT.md`
  - 心跳运行的可选微型检查清单。
  - 保持简短以避免消耗 Token。

- `BOOT.md`
  - 网关重启时当启用内部挂钩时执行的可选启动检查清单。
  - 保持简短；使用消息工具进行外发。

- `BOOTSTRAP.md`
  - 一次性首次运行仪式。
  - 仅为全新的工作区创建。
  - 仪式完成后将其删除。

- `memory/YYYY-MM-DD.md`
  - 每日记忆日志（每天一个文件）。
  - 建议在会话开始时读取今天 + 昨天的记录。

- `MEMORY.md` (可选)
  - 策划的长期记忆。
  - 仅在主私人会话中加载（不在共享/组上下文中）。

有关工作流程和自动记忆刷新，请参阅 [记忆](/en/concepts/memory)。

- `skills/` (可选)
  - 特定于工作区的技能。
  - 该工作区的最高优先级技能位置。
  - 当名称冲突时，覆盖项目代理技能、个人代理技能、托管技能、捆绑技能和 `skills.load.extraDirs`。

- `canvas/` (可选)
  - 用于节点显示的 Canvas UI 文件（例如 `canvas/index.html`）。

如果缺少任何引导文件，OpenClaw 会在会话中注入一个“缺失文件”标记并继续。注入时，大型引导文件会被截断；使用 `agents.defaults.bootstrapMaxChars`（默认：20000）和 `agents.defaults.bootstrapTotalMaxChars`（默认：150000）调整限制。`openclaw setup` 可以重新创建缺失的默认文件，而不会覆盖现有文件。

## 工作区中有什么

这些位于 `~/.openclaw/` 下，不应提交到工作区仓库：

- `~/.openclaw/openclaw.json`（配置）
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（模型身份验证配置文件：OAuth + API 密钥）
- `~/.openclaw/credentials/`（渠道/提供商状态以及旧版 OAuth 导入数据）
- `~/.openclaw/agents/<agentId>/sessions/`（会话记录 + 元数据）
- `~/.openclaw/skills/`（托管技能）

如果您需要迁移会话或配置，请单独复制它们，并将其排除在版本控制之外。

## Git 备份（推荐，私有）

将工作区视为私有内存。将其放入**私有** git 仓库中，以便进行备份和恢复。

在运行 Gateway 的计算机上运行这些步骤（那是工作区所在的位置）。

### 1) 初始化仓库

如果安装了 git，全新的工作区会自动初始化。如果该工作区还不是仓库，请运行：

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 添加私有远程仓库（适合初学者的选项）

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

选项 B：GitHub CLI (`gh`)

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

## 不要提交机密信息

即使在私有仓库中，也要避免在工作区中存储机密信息：

- API 密钥、OAuth 令牌、密码或私有凭据。
- `~/.openclaw/` 下的任何内容。
- 聊天的原始转储或敏感附件。

如果必须存储敏感引用，请使用占位符，并将真正的机密信息保存在别处（密码管理器、环境变量或 `~/.openclaw/`）。

建议的 `.gitignore` 入门模板：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 将工作区移动到新机器

1. 将仓库克隆到所需路径（默认为 `~/.openclaw/workspace`）。
2. 在 `~/.openclaw/openclaw.json` 中将 `agents.defaults.workspace` 设置为该路径。
3. 运行 `openclaw setup --workspace <path>` 以生成任何缺失的文件。
4. 如果您需要会话，请从旧机器单独复制 `~/.openclaw/agents/<agentId>/sessions/`。

## 高级说明

- 多代理路由可以为每个代理使用不同的工作区。有关路由配置，请参阅
  [Channel routing](/en/channels/channel-routing)。
- 如果启用了 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot` 下的
  每次会话沙箱工作区。

## 相关

- [Standing Orders](/en/automation/standing-orders) — 工作区文件中的持久指令
- [Heartbeat](/en/gateway/heartbeat) — HEARTBEAT.md 工作区文件
- [Session](/en/concepts/session) — 会话存储路径
- [沙箱隔离](/en/gateway/sandboxing) — 沙箱隔离环境中的工作区访问
