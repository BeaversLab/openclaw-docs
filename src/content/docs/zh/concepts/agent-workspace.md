---
summary: "Agent workspace: location, layout, and backup strategy"
read_when:
  - You need to explain the agent workspace or its file layout
  - You want to back up or migrate an agent workspace
title: "Agent 的工作区"
sidebarTitle: "Agent 的工作区"
---

工作区是 Agent 的主目录。它是用于文件工具和工作区上下文的唯一工作目录。请保持其私密性，并将其视为记忆。

这与 `~/.openclaw/` 分开，后者存储配置、凭据和会话。

<Warning>
工作区是**默认 cwd**，而非严格的沙箱。工具会基于工作区解析相对路径，但除非启用了沙箱隔离，否则绝对路径仍可访问主机上的其他位置。如果需要隔离，请使用 [`agents.defaults.sandbox`](/zh/gateway/sandboxing)（和/或针对每个代理的沙箱配置）。

当启用沙箱隔离且 `workspaceAccess` 不为 `"rw"` 时，工具将在 `~/.openclaw/sandboxes` 下的沙箱工作区内运行，而不是在您的主机工作区中。

</Warning>

## 默认位置

- 默认值：`~/.openclaw/workspace`
- 如果设置了 `OPENCLAW_PROFILE` 且不为 `"default"`，则默认值变为 `~/.openclaw/workspace-<profile>`。
- 在 `~/.openclaw/openclaw.json` 中覆盖：

```json5
{
  agents: {
    defaults: {
      workspace: "~/.openclaw/workspace",
    },
  },
}
```

`openclaw onboard`、`openclaw configure` 或 `openclaw setup` 将创建工作区并在缺少时植入引导文件。

<Note>沙箱种子副本仅接受工作区内的常规文件；解析到源工作区之外的符号链接/硬链接别名将被忽略。</Note>

如果您已经自己管理工作区文件，则可以禁用引导文件的创建：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 额外的工作区文件夹

较旧的安装可能创建了 `~/openclaw`。保留多个工作区目录可能会导致身份验证或状态漂移的混淆，因为同一时间只有一个工作区是活动的。

<Note>
**建议：** 保持一个活动的工作区。如果您不再使用额外的文件夹，请将其归档或移至废纸篓（例如 `trash ~/openclaw`）。如果您有意保留多个工作区，请确保 `agents.defaults.workspace` 指向活动的工作区。

当检测到额外的工作区目录时，`openclaw doctor` 会发出警告。

</Note>

## 工作区文件映射

这些是 OpenClaw 在工作区内期望的标准文件：

<AccordionGroup>
  <Accordion title="AGENTS.md - operating instructions">代理的操作说明及其应如何使用记忆。在每次会话开始时加载。适合用于放置规则、优先级和“如何表现”的细节。</Accordion>
  <Accordion title="SOUL.md - persona and tone">个性、语调和边界。每个会话加载。指南：[SOUL.md personality guide](/zh/concepts/soul)。</Accordion>
  <Accordion title="USER.md - who the user is">用户是谁以及如何称呼他们。每个会话加载。</Accordion>
  <Accordion title="IDENTITY.md - name, vibe, emoji">代理的名称、氛围和表情符号。在启动仪式期间创建/更新。</Accordion>
  <Accordion title="TOOLS.md - local 工具 conventions">关于您的本地工具和约定的说明。这不控制工具的可用性；它仅作为指导。</Accordion>
  <Accordion title="HEARTBEAT.md - heartbeat checklist">用于心跳运行的可选微型检查清单。保持简短以避免消耗 token。</Accordion>
  <Accordion title="BOOT.md - startup checklist">在网关重启时自动运行的可选启动检查清单（当启用 [internal hooks](/zh/automation/hooks) 时）。保持简短；使用消息工具进行对外发送。</Accordion>
  <Accordion title="BOOTSTRAP.md - 首次运行仪式">一次性首次运行仪式。仅为全新的工作区创建。仪式完成后将其删除。</Accordion>
  <Accordion title="memory/YYYY-MM-DD.md - 每日记忆日志">每日记忆日志（每天一个文件）。建议在会话开始时阅读今天和昨天的日志。</Accordion>
  <Accordion title="MEMORY.md - 精选长期记忆（可选）">精选长期记忆：持久化的事实、偏好、决策和简短摘要。将详细日志保存在 `memory/YYYY-MM-DD.md` 中，以便记忆工具可以按需检索它们，而无需将它们注入到每个提示中。仅应在主要的私人会话（而非共享/群组上下文）中加载 `MEMORY.md`。有关工作流程和自动内存刷新，请参阅 [Memory](/zh/concepts/memory)。</Accordion>
  <Accordion title="skills/ - 工作区技能（可选）">特定于工作区的技能。该工作区的最高优先级技能位置。当名称冲突时，覆盖项目代理技能、个人代理技能、托管技能、捆绑技能和 `skills.load.extraDirs`。</Accordion>
  <Accordion title="Canvascanvas/ - Canvas UI 文件（可选）" Canvas>
    用于节点显示的 Canvas UI 文件（例如 `canvas/index.html`）。
  </Accordion>
</AccordionGroup>

<Note>如果缺少任何引导文件，OpenClaw 会向会话中注入一个“缺失文件”标记并继续。注入大型引导文件时会被截断；可以使用 OpenClaw`agents.defaults.bootstrapMaxChars`（默认：12000）和 `agents.defaults.bootstrapTotalMaxChars`（默认：60000）调整限制。`openclaw setup` 可以重新创建缺失的默认文件，而不会覆盖现有文件。</Note>

## 工作区中不存在的内容

这些文件位于 `~/.openclaw/` 下，不应提交到工作区仓库：

- `~/.openclaw/openclaw.json`（配置）
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (模型身份验证配置：OAuth + API 密钥)
- `~/.openclaw/agents/<agentId>/agent/codex-home/` (每个代理的 Codex 运行时账户、配置、技能、插件和原生线程状态)
- `~/.openclaw/credentials/` (渠道/提供商状态以及旧版 OAuth 导入数据)
- `~/.openclaw/agents/<agentId>/sessions/` (会话记录 + 元数据)
- `~/.openclaw/skills/` (托管技能)

如果您需要迁移会话或配置，请单独复制它们，并将其保留在版本控制之外。

## Git 备份（推荐，私有）

将工作区视为私有内存。将其放在一个 **私有** git 仓库中，以便进行备份和恢复。

在运行 Gateway(网关) 的机器上运行这些步骤（那是工作区所在的位置）。

<Steps>
  <Step title="初始化仓库">
    如果安装了 git，全新的工作区将自动初始化。如果此工作区尚不是仓库，请运行：

    ```bash
    cd ~/.openclaw/workspace
    git init
    git add AGENTS.md SOUL.md TOOLS.md IDENTITY.md USER.md HEARTBEAT.md memory/
    git commit -m "Add agent workspace"
    ```

  </Step>
  <Step title="添加私有远程仓库">
    <Tabs>
      <Tab title="GitHub Web UI">
        1. 在 GitHub 上创建一个新的 **私有** 仓库。
        2. 不要使用 README 初始化（避免合并冲突）。
        3. 复制 HTTPS 远程 URL。
        4. 添加远程仓库并推送：

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
      <Tab title="GitHub CLI (gh)">
        ```bash
        gh auth login
        gh repo create openclaw-workspace --private --source . --remote origin --push
        ```
      </Tab>
      <Tab title="GitLab Web UI">
        1. 在 GitLab 上创建一个新的 **私有** 仓库。
        2. 不要使用 README 初始化（避免合并冲突）。
        3. 复制 HTTPS 远程 URL。
        4. 添加远程仓库并推送：

        ```bash
        git branch -M main
        git remote add origin <https-url>
        git push -u origin main
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="后续更新">
    ```bash
    git status
    git add .
    git commit -m "Update memory"
    git push
    ```
  </Step>
</Steps>

## 不要提交机密信息

<Warning>
即使在私有仓库中，也应避免在工作区中存储机密信息：

- API 密钥、OAuth 令牌、密码或私有凭证。
- APIOAuth`~/.openclaw/` 下的任何内容。
- 聊天记录或敏感附件的原始转储。

如果必须存储敏感引用，请使用占位符，并将真实的机密信息存放在别处（密码管理器、环境变量或 `~/.openclaw/`）。

</Warning>

建议的 `.gitignore` 入门文件：

```gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
```

## 将工作区移动到新机器

<Steps>
  <Step title="克隆仓库">
    将仓库克隆到所需路径（默认为 `~/.openclaw/workspace`）。
  </Step>
  <Step title="更新配置">
    在 `~/.openclaw/openclaw.json` 中将 `agents.defaults.workspace` 设置为该路径。
  </Step>
  <Step title="补充缺失文件">
    运行 `openclaw setup --workspace <path>` 以补充任何缺失的文件。
  </Step>
  <Step title="复制会话（可选）">
    如果您需要会话，请单独从旧机器复制 `~/.openclaw/agents/<agentId>/sessions/`。
  </Step>
</Steps>

## 高级说明

- 多代理路由可以为每个代理使用不同的工作区。有关路由配置，请参阅[通道路由](/zh/channels/channel-routing)。
- 如果启用了 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每会话沙箱工作区。

## 相关内容

- [Heartbeat](/zh/gateway/heartbeat) - HEARTBEAT.md 工作区文件
- [沙箱隔离](/zh/gateway/sandboxing) - 沙箱环境中的工作区访问
- [会话](/zh/concepts/session) - 会话存储路径
- [长期指令](/zh/automation/standing-orders) - 工作区文件中的持久指令
