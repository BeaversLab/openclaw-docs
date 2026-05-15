---
summary: "CLICLI reference for `openclaw migrate` (import state from another agent system)"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "迁移"
---

# `openclaw migrate`

通过插件拥有的迁移提供商从另一个代理系统导入状态。内置提供商涵盖 Codex CLI 状态、[Claude](CLI/en/install/migrating-claude) 和 [Hermes](/zh/install/migrating-hermes)；第三方插件可以注册其他提供商。

<Tip>如需面向用户的演练，请参阅[从 Claude 迁移](/zh/install/migrating-claude)和[从 Hermes 迁移](/zh/install/migrating-hermes)。[迁移中心](/zh/install/migrating)列出了所有路径。</Tip>

## 命令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate codex --plugin google-calendar --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --plugin google-calendar
openclaw migrate apply codex --yes
openclaw migrate apply claude --yes
openclaw migrate apply hermes --yes
openclaw migrate apply hermes --include-secrets --yes
openclaw onboard --flow import
openclaw onboard --import-from claude --import-source ~/.claude
openclaw onboard --import-from hermes --import-source ~/.hermes
```

<ParamField path="<provider>" type="string">
  已注册迁移提供商的名称，例如 `hermes`。运行 `openclaw migrate list` 查看已安装的提供商。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  构建计划并退出，不更改状态。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆盖源状态目录。Hermes 默认为 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  导入支持的凭据。默认关闭。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  当计划报告冲突时，允许应用替换现有目标。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳过确认提示。在非交互模式下是必需的。
</ParamField>
<ParamField path="--skill <name>" type="string">
  按技能名称或项目 ID 选择一个技能副本项。重复此标志可迁移多个技能。如果省略，交互式 Codex 迁移将显示复选框选择器，非交互式迁移将保留所有计划的技能。
</ParamField>
<ParamField path="--plugin <name>" type="string">
  按插件名称或项目 ID 选择一个 Codex 插件安装项。重复此标志可迁移多个 Codex 插件。如果省略，交互式 Codex 迁移将显示原生 Codex 插件复选框选择器，非交互式迁移将保留所有计划的插件。这仅适用于 Codex 应用服务器清单发现的源安装 `openai-curated` Codex 插件。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳过应用前备份。当本地 OpenClaw 状态存在时，需要 `--force`。
</ParamField>
<ParamField path="--force" type="boolean">
  当应用否则会拒绝跳过备份时，需与 `--no-backup` 一起使用。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式打印计划或应用结果。使用 `--json` 且没有 `--yes` 时，应用会打印计划且不改变状态。
</ParamField>

## 安全模型

`openclaw migrate` 优先预览。

<AccordionGroup>
  <Accordion title="应用前预览"API>
    提供商会在进行任何更改之前返回详细计划，包括冲突、跳过的项目和敏感项目。JSON 计划、应用输出和迁移报告会对嵌套的类机密键进行编辑，例如 API 键、令牌、授权标头、Cookie 和密码。

    除非设置了 `--yes`，否则 `openclaw migrate apply <provider>` 会预览计划并在更改状态前提示。在非交互模式下，应用需要 `--yes`。

  </Accordion>
  <Accordion title="备份"OpenClawOpenClaw>
    Apply 会在应用迁移之前创建并验证 OpenClaw 备份。如果本地尚不存在 OpenClaw 状态，则跳过备份步骤，迁移可以继续。若要在状态存在时跳过备份，请同时传递 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="冲突">
    当计划存在冲突时，Apply 将拒绝继续。查看计划，如果是有意替换现有目标，请使用 `--overwrite` 重新运行。提供商仍可能会在迁移报告目录中为被覆盖的文件写入项目级备份。
  </Accordion>
  <Accordion title="机密">
    默认情况下绝不导入机密。使用 `--include-secrets` 导入支持的凭据。
  </Accordion>
</AccordionGroup>

## Claude 提供商

内置的 Claude 提供商默认在 `~/.claude` 检测 Claude Code 状态。使用 `--from <path>` 导入特定的 Claude Code 主目录或项目根目录。

<Tip>如需面向用户的演练，请参阅[从 Claude 迁移](/zh/install/migrating-claude)。</Tip>

### Claude 导入的内容

- 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md`OpenClaw 进入 OpenClaw 代理工作区。
- 用户 `~/.claude/CLAUDE.md` 附加到工作区 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude 技能目录。
- 已转换为 OpenClaw 技能的 Claude 命令 Markdown 文件，仅限手动调用。

### 归档和人工审查状态

Claude 钩子、权限、环境默认值、本地内存、路径范围规则、子代理、缓存、计划和项目历史会保留在迁移报告中，或作为需要人工审查的项目进行报告。OpenClaw 不会执行钩子、复制广泛的允许列表，或自动导入 OAuth/Desktop 凭据状态。

## Codex 提供商

捆绑的 Codex 提供商默认在 CLI`~/.codex` 检测 Codex CLI 状态，或者在该环境变量设置时在 `CODEX_HOME` 检测。使用 `--from <path>` 来清点特定的 Codex 主目录。

在迁移到 OpenClaw Codex 驱动程序（harness）且您想要刻意提升有用的个人 Codex CLI 资产时，请使用此提供商。本地 Codex 应用服务器启动使用每个代理的 OpenClawCLI`CODEX_HOME` 和 `HOME`CLI 目录，因此它们默认不会读取您的个人 Codex CLI 状态。

在交互式终端中运行 `openclaw migrate codex` 会预览完整计划，然后在最终应用确认之前打开复选框选择器。首先会提示技能复制项。使用 `Toggle all on` 或 `Toggle all off` 进行批量选择；计划中的技能默认选中，冲突的技能默认不选中，而 `Skip for now` 会在本次运行中跳过技能复制，同时继续进行插件选择。当源安装的精选 Codex 插件可迁移且未提供 `--plugin`OpenClaw 时，迁移随后会提示按插件名称激活原生 Codex 插件。除非目标 OpenClaw Codex 插件配置已有该插件，否则插件项默认选中。现有的目标插件默认不选中，并显示冲突提示，例如 `conflict: plugin exists`；请选择 `Toggle all off` 在该次运行中不迁移任何原生 Codex 插件，或选择 `Skip for now` 在应用前停止。对于脚本化或精确运行，请为每个技能传递一次 `--skill <name>`，例如：

```bash
openclaw migrate codex --dry-run --skill gog-vault77-google-workspace
openclaw migrate apply codex --yes --skill gog-vault77-google-workspace
```

使用 `--plugin <name>` 以非交互方式将原生 Codex 插件迁移限制为一个或多个源安装的精选插件：

```bash
openclaw migrate codex --dry-run --plugin google-calendar
openclaw migrate apply codex --yes --plugin google-calendar
```

### Codex 导入的内容

- `$CODEX_HOME/skills` 下的 Codex CLI 技能目录，不包括 Codex 的
  `.system` 缓存。
- `$HOME/.agents/skills` 下的个人 AgentSkills，在您需要按代理拥有权时，复制到当前的
  OpenClaw 代理工作区。
- 通过 Codex 应用服务器 `plugin/list` 发现的源安装 `openai-curated` Codex 插件。Apply 会为每个
  选定的插件调用应用服务器 `plugin/install`，即使目标应用服务器已经报告该插件为
  已安装并已启用。迁移的 Codex 插件仅在选择原生 Codex 驱动程序的会话中可用；
  它们不暴露给 Pi、普通 OpenAI 提供程序运行、ACP 对话绑定或其他驱动程序。

### 手动审查 Codex 状态

Codex `config.toml`、原生 `hooks/hooks.json`、非精选市场以及
不是源安装精选插件的缓存插件捆绑包不会
自动激活。它们会被复制或在迁移报告中报告以
供手动审查。

对于迁移的源安装精选插件，apply 会写入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: false`
- 每个选定插件都有一个带有 `marketplaceName: "openai-curated"` 和
  `pluginName` 的显式插件条目

迁移永远不会写入 `plugins["*"]`，也永远不会存储本地市场缓存
路径。需要身份验证的安装会在受影响的插件项上使用
`status: "skipped"`、`reason: "auth_required"` 和经过清理的应用标识符进行报告。
它们的显式配置条目在您重新授权并
启用它们之前会被写入为禁用状态。其他安装失败是项范围内的 `error` 结果。

如果在规划期间 Codex 应用服务器插件清单不可用，迁移
将回退到缓存捆绑包建议项，而不是导致整个
迁移失败。

## Hermes 提供商

捆绑的 Hermes 提供商默认检测 `~/.hermes` 处的状态。当 Hermes 位于其他位置时，请使用 `--from <path>`。

### Hermes 导入的内容

- 来自 `config.yaml` 的默认模型配置。
- 来自 `providers` 和 `custom_providers` 的已配置模型提供商和自定义 OpenAI 兼容端点。
- 来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
- `SOUL.md` 和 `AGENTS.md` 到 OpenClaw 代理工作区。
- `memories/MEMORY.md` 和 `memories/USER.md` 附加到工作区内存文件。
- OpenClaw 文件内存的内存配置默认值，以及 Honcho 等外部内存提供商的存档或人工审查项。
- 在 `skills/<name>/` 下包含 `SKILL.md` 文件的 Skills。
- 来自 `skills.config` 的每个 Skill 配置值。
- 来自 `.env` 的受支持 API 密钥，仅限 `--include-secrets`。

### 受支持的 `.env` 密钥

`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。

### 仅存档状态

OpenClaw 无法安全解释的 Hermes 状态会被复制到迁移报告中以供人工审查，但不会加载到实时 OpenClaw 配置或凭据中。这保留了不透明或 unsafe 状态，而不会假装 OpenClaw 可以自动执行或信任它：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

### 应用后

```bash
openclaw doctor
```

## 插件契约

迁移源是插件。插件在 `openclaw.plugin.json` 中声明其提供商 ID：

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

在运行时，插件会调用 `api.registerMigrationProvider(...)`。提供商实现了 `detect`、`plan` 和 `apply`CLI。Core 拥有 CLI 编排、备份策略、提示、JSON 输出和冲突预检的权限。Core 将经过审查的计划传递给 `apply(ctx, plan)`，为了兼容性，提供商仅在该参数不存在时才重建计划。

提供商插件可以使用 `openclaw/plugin-sdk/migration` 来构建项目和统计摘要，并使用 `openclaw/plugin-sdk/migration-runtime` 进行感知冲突的文件复制、仅存档报告复制、缓存的配置运行时包装器以及迁移报告。

## 新手引导集成

当提供商检测到已知来源时，新手引导可以提供迁移。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供商，并且在应用之前仍会显示预览。

<Note>新手引导导入需要全新的 OpenClaw 设置。如果您已有本地状态，请先重置配置、凭据、会话和工作区。对于现有设置，备份加覆盖或合并导入是受功能限制的。</Note>

## 相关

- [从 Hermes 迁移](/zh/install/migrating-hermes)：面向用户的演练。
- [从 Claude 迁移](/zh/install/migrating-claude)：面向用户的演练。
- [迁移](/zh/install/migratingOpenClaw)：将 OpenClaw 移动到新机器。
- [Doctor](/zh/gateway/doctor)：应用迁移后的健康检查。
- [插件](/zh/tools/plugin)：插件安装和注册。
