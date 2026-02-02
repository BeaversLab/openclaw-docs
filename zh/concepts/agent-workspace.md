---
summary: "Agent workspace：位置、布局与备份策略"
read_when:
  - 需要解释 agent workspace 或其文件结构
  - 需要备份或迁移 agent workspace
title: "Agent workspace"
---
# Agent workspace

Workspace 是 agent 的家。它是文件工具与工作区上下文所使用的唯一工作目录。
请保持私密，并将其视为记忆。

它与 `~/.openclaw/` 分离，后者存放配置、凭据与会话。

**重要：** workspace 是 **默认 cwd**，不是硬性 sandbox。工具会以 workspace 解析相对路径，
但在未启用 sandbox 的情况下，绝对路径仍可访问主机其他位置。如需隔离，请使用
[`agents.defaults.sandbox`](/zh/gateway/sandboxing)（或每 agent 的 sandbox 配置）。
当启用 sandbox 且 `workspaceAccess` 不是 `"rw"` 时，工具会在 `~/.openclaw/sandboxes`
下的 sandbox workspace 内运行，而不是主机上的 workspace。

## 默认位置

- 默认：`~/.openclaw/workspace`
- 如果设置了 `OPENCLAW_PROFILE` 且不为 `"default"`，默认变为
  `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆盖：

```json5
{
  agent: {
    workspace: "~/.openclaw/workspace"
  }
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 会创建 workspace 并在缺失时
初始化 bootstrap 文件。

如果你已经自行管理 workspace 文件，可禁用 bootstrap 文件创建：

```json5
{ agent: { skipBootstrap: true } }
```

## 额外的 workspace 文件夹

较旧的安装可能创建了 `~/openclaw`。保留多个 workspace 目录可能引发混乱的认证或状态漂移，
因为同时只有一个 workspace 处于激活状态。

**建议：** 保持一个活跃 workspace。如果不再使用其他目录，可归档或移入废纸篓（例如 `trash ~/openclaw`）。
如果刻意保留多个 workspace，请确保 `agents.defaults.workspace` 指向当前活跃目录。

`openclaw doctor` 在检测到额外 workspace 目录时会发出警告。

## Workspace 文件映射（各文件含义）

以下是 OpenClaw 期望出现在 workspace 中的标准文件：

- `AGENTS.md`
  - Agent 的操作说明及如何使用记忆。
  - 每个会话开始时加载。
  - 适合作为规则、优先级与行为细节的载体。

- `SOUL.md`
  - Persona、语气与边界。
  - 每个会话加载。

- `USER.md`
  - 用户是谁以及如何称呼。
  - 每个会话加载。

- `IDENTITY.md`
  - Agent 的名称、风格与 emoji。
  - 在 bootstrap 仪式中创建/更新。

- `TOOLS.md`
  - 本地工具与约定的说明。
  - 不控制工具可用性，仅作指导。

- `HEARTBEAT.md`
  - 心跳运行的可选小清单。
  - 尽量短，避免消耗 token。

- `BOOT.md`
  - 在 gateway 重启且启用内部 hooks 时执行的可选启动清单。
  - 保持简短；外发请使用消息工具。

- `BOOTSTRAP.md`
  - 一次性的首次运行仪式。
  - 仅在全新 workspace 中创建。
  - 仪式完成后可删除。

- `memory/YYYY-MM-DD.md`
  - 每日记忆日志（每天一个文件）。
  - 建议会话开始时读取今天 + 昨天。

- `MEMORY.md`（可选）
  - 经过整理的长期记忆。
  - 仅在主私密会话中加载（非共享/群组上下文）。

记忆流程与自动 flush 见 [Memory](/zh/concepts/memory)。

- `skills/`（可选）
  - Workspace 专属技能。
  - 名称冲突时覆盖托管/内置技能。

- `canvas/`（可选）
  - 节点显示的 Canvas UI 文件（例如 `canvas/index.html`）。

若 bootstrap 文件缺失，OpenClaw 会向会话注入“missing file”标记后继续。
大型 bootstrap 文件在注入时会被截断；可通过 `agents.defaults.bootstrapMaxChars` 调整上限（默认：20000）。
`openclaw setup` 可在不覆盖现有文件的情况下重建缺失默认值。

## Workspace 中不包含的内容

以下内容位于 `~/.openclaw/`，**不应** 提交到 workspace 仓库：

- `~/.openclaw/openclaw.json`（配置）
- `~/.openclaw/credentials/`（OAuth tokens、API keys）
- `~/.openclaw/agents/<agentId>/sessions/`（会话转录 + 元数据）
- `~/.openclaw/skills/`（托管技能）

若需迁移会话或配置，请单独复制并避免版本控制。

## Git 备份（推荐，私有）

把 workspace 当作私密记忆。将其放入 **私有** git 仓库以便备份与恢复。

在运行 Gateway 的机器上执行以下步骤（workspace 位于该机器）。

### 1) 初始化仓库

若已安装 git，全新 workspace 会自动初始化。如果当前 workspace 尚不是仓库，请执行：

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
git commit -m "Add agent workspace"
```

### 2) 添加私有远程（新手友好选项）

选项 A：GitHub 网页端

1. 在 GitHub 创建新的 **私有** 仓库。
2. 不要初始化 README（避免合并冲突）。
3. 复制 HTTPS 远程地址。
4. 添加远程并推送：

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

选项 C：GitLab 网页端

1. 在 GitLab 创建新的 **私有** 仓库。
2. 不要初始化 README（避免合并冲突）。
3. 复制 HTTPS 远程地址。
4. 添加远程并推送：

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

## 不要提交密钥

即便是私有仓库，也应避免存储敏感信息：

- API keys、OAuth tokens、密码或私密凭据。
- `~/.openclaw/` 下的任何内容。
- 聊天记录或敏感附件的原始转储。

若必须存放敏感引用，请使用占位符，并将真实密钥保存在其他位置
（密码管理器、环境变量或 `~/.openclaw/`）。

建议 `.gitignore` 起始模板：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 将 workspace 迁移到新机器

1. 将仓库克隆到目标路径（默认 `~/.openclaw/workspace`）。
2. 在 `~/.openclaw/openclaw.json` 中将 `agents.defaults.workspace` 指向该路径。
3. 运行 `openclaw setup --workspace <path>` 补齐缺失文件。
4. 若需迁移会话，请单独复制旧机器的 `~/.openclaw/agents/<agentId>/sessions/`。

## 高级说明

- 多 agent 路由可为不同 agent 使用不同 workspace。见
  [Channel routing](/zh/concepts/channel-routing) 的路由配置。
- 若启用了 `agents.defaults.sandbox`，非主会话可使用 `agents.defaults.sandbox.workspaceRoot`
  下的按会话 sandbox workspace。
