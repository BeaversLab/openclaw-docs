---
summary: "CLICLI reference for `openclaw migrate` (从另一个代理系统导入状态)"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "迁移"
---

# `openclaw migrate`

通过插件拥有的迁移提供商从另一个代理系统导入状态。内置提供商涵盖 Codex CLI 状态、[Claude](/zh/install/migrating-claude) 和 [Hermes](/zh/install/migrating-hermes)；第三方插件可以注册其他提供商。

<Tip>有关面向用户的演练，请参阅[从 Claude 迁移](/zh/install/migrating-claude)和[从 Hermes 迁移](/zh/install/migrating-hermes)。[迁移中心](/zh/install/migrating)列出了所有路径。</Tip>

## 命令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate codex --dry-run
openclaw migrate codex --skill gog-vault77-google-workspace
openclaw migrate codex --plugin google-calendar --dry-run
openclaw migrate codex --plugin google-calendar --verify-plugin-apps --dry-run
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
  已注册迁移提供商的名称，例如 `hermes`。运行 `openclaw migrate list` 以查看已安装的提供商。
</ParamField>
<ParamField path="--dry-run" type="boolean">
  构建计划并退出而不更改状态。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆盖源状态目录。Hermes 默认为 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  在不提示的情况下导入支持的凭据。交互式应用会在导入检测到的身份验证凭据之前询问，默认选择“是”；非交互式 `--yes` 需要 `--include-secrets` 才能导入它们。
</ParamField>
<ParamField path="--no-auth-credentials" type="boolean">
  跳过身份验证凭据导入，包括交互式提示。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  当计划报告冲突时，允许应用替换现有目标。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳过确认提示。在非交互模式下是必需的。
</ParamField>
<ParamField path="--skill <name>" type="string">
  通过技能名称或项目 ID 选择一个技能复制项目。重复该标志以迁移多个技能。如果省略，交互式 Codex 迁移会显示一个复选框选择器，而非交互式迁移将保留所有计划的技能。
</ParamField>
<ParamField path="--plugin <name>" type="string">
  通过插件名称或项目 ID 选择一个 Codex 插件安装项目。重复该标志以迁移多个 Codex 插件。如果省略，交互式 Codex 迁移会显示一个原生 Codex 插件复选框选择器，而非交互式迁移将保留所有计划的插件。这仅适用于由 Codex 应用服务器清单发现的源安装的 `openai-curated` Codex 插件。
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  仅限 Codex。在规划原生插件激活之前，强制对源 Codex 应用服务器 `app/list` 进行全新的遍历。默认关闭以保持迁移规划快速。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳过应用前备份。当存在本地 OpenClaw 状态时需要 `--force`。
</ParamField>
<ParamField path="--force" type="boolean">
  当应用本来会拒绝跳过备份时，需要与 `--no-backup` 一起使用。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式打印计划或应用结果。使用 `--json` 且没有 `--yes` 时，应用打印计划且不改变状态。
</ParamField>

## 安全模型

`openclaw migrate` 优先预览。

<AccordionGroup>
  <Accordion title="应用前预览"API>
    在任何更改发生之前，提供商会返回一个详细计划，包括冲突、跳过的项和敏感项。JSON 计划、应用输出和迁移报告会编辑嵌套的类似机密的密钥，例如 API 密钥、令牌、授权标头、Cookie 和密码。

    除非设置了 `--yes`，否则 `openclaw migrate apply <provider>` 会在更改状态前预览计划并提示。在非交互模式下，应用需要 `--yes`。

  </Accordion>
  <Accordion title="备份"OpenClawOpenClaw>
    Apply 在应用迁移之前会创建并验证 OpenClaw 备份。如果尚不存在本地 OpenClaw 状态，则跳过备份步骤，迁移可以继续。若要在状态存在时跳过备份，请同时传递 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="冲突">
    当计划存在冲突时，Apply 拒绝继续。查看计划，如果替换现有目标是有意的，请使用 `--overwrite` 重新运行。提供商仍可能为迁移报告目录中被覆盖的文件写入项目级备份。
  </Accordion>
  <Accordion title="机密">
    交互式应用会询问是否导入检测到的身份验证凭据，默认选择“是”。使用 `--no-auth-credentials` 跳过它们，或使用 `--include-secrets` 配合 `--yes` 进行无人值守的凭据导入。
  </Accordion>
</AccordionGroup>

## Claude 提供商

捆绑的 Claude 提供商默认检测 `~/.claude` 处的 Claude Code 状态。使用 `--from <path>` 导入特定的 Claude Code 主目录或项目根目录。

<Tip>有关面向用户的演练，请参阅[从 Claude 迁移](/zh/install/migrating-claude)。</Tip>

### Claude 导入的内容

- 将项目 `CLAUDE.md` 和 `.claude/CLAUDE.md`OpenClaw 导入到 OpenClaw 代理工作区。
- 用户 `~/.claude/CLAUDE.md` 附加到工作区 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude 技能目录。
- 已转换为 OpenClaw 技能的 Claude 命令 Markdown 文件，仅限手动调用。

### 归档和人工审查状态

Claude 钩子、权限、环境默认值、本地内存、路径范围规则、子代理、缓存、计划和项目历史会保留在迁移报告中，或作为需要人工审查的项目进行报告。OpenClaw 不会执行钩子、复制广泛的允许列表，或自动导入 OAuth/Desktop 凭据状态。

## Codex 提供商

内置的 Codex 提供商默认在 CLI`~/.codex` 检测 Codex CLI 状态，或者当设置了该环境变量时在 `CODEX_HOME` 检测。使用 `--from <path>` 来清点特定的 Codex 主目录。

当迁移到 OpenClaw Codex 驾驭框架（harness）并且您想要有意识地提升有用的个人 Codex CLI 资产时，请使用此提供商。本地 Codex 应用服务器启动使用每个代理（per-agent）的 OpenClawCLI`CODEX_HOME`，因此它们默认不会读取您的个人 `~/.codex`。常规进程 `HOME` 仍然被继承，因此 Codex 可以看到共享的 `$HOME/.agents/*` 技能/插件市场条目，并且子进程可以找到用户主目录配置和令牌。

在交互式终端中运行 `openclaw migrate codex` 会预览完整计划，然后在最终应用确认之前打开复选框选择器。首先会提示技能复制项。使用 `Toggle all on` 或 `Toggle all off` 进行批量选择。按空格键切换行，或按回车键激活高亮显示的行并继续。计划内的技能默认选中，冲突技能默认取消选中，而 `Skip for now` 跳过本次运行的技能复制，但继续进行插件选择。当源安装的精选 Codex 插件可迁移且未提供 `--plugin` 时，迁移随后会提示按插件名称激活原生 Codex 插件。除非目标 OpenClaw Codex 插件配置已包含该插件，否则插件项默认选中。现有的目标插件默认取消选中并显示冲突提示（例如 `conflict: plugin exists`）；请选择 `Toggle all off` 以在此次运行中不迁移任何原生 Codex 插件，或选择 `Skip for now` 在应用前停止。对于脚本化或精确运行，请为每个技能传递一次 `--skill <name>`，例如：

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

- 位于 `$CODEX_HOME/skills` 下的 Codex CLI 技能目录，不包括 Codex 的 `.system` 缓存。
- 位于 `$HOME/.agents/skills` 下的个人 AgentSkills，当您希望每个代理拥有所有权时，将其复制到当前的 OpenClaw 代理工作区中。
- 通过 Codex 应用服务器 `plugin/list` 发现的源安装 `openai-curated` Codex 插件。规划阶段会读取每个已安装启用插件的 `plugin/read`。由应用支持的插件要求源 Codex 应用服务器的账户响应必须是 ChatGPT 订阅账户；非 ChatGPT 或缺失的账户响应将被 `codex_subscription_required` 跳过。默认情况下，迁移不会调用源 `app/list`，因此通过账户门槛的应用支持的插件会在不验证源应用可访问性的情况下被规划，且账户查找传输失败将以 `codex_account_unavailable` 跳过。当您希望迁移强制获取新的源 `app/list` 快照，并要求所有拥有的应用在规划本地激活之前必须存在、已启用且可访问时，请传递 `--verify-plugin-apps`。在该模式下，账户查找传输失败将转至源应用清单验证。源应用清单快照在当前进程中保存在内存中；它不会写入迁移输出或目标配置。已禁用的插件、不可读的插件详细信息、受订阅限制的源账户，以及在请求验证时缺失的应用、已禁用的应用、无法访问的应用或源应用清单失败，都将变为带有类型原因的手动跳过项，而不是目标配置条目。Apply 会为每个选定的合格插件调用应用服务器 `plugin/install`OpenClaw，即使目标应用服务器已经报告该插件已安装并已启用。迁移的 Codex 插件仅在选择本地 Codex 约束的会话中可用；它们不会暴露给 OpenClaw 提供商运行、ACP 会话绑定或其他约束。

### 手动审查 Codex 状态

Codex `config.toml`、本地 `hooks/hooks.json`、非精选市场、不是源安装精选插件的缓存插件包，以及未通过源订阅门槛的源安装插件不会自动激活。当设置了 `--verify-plugin-apps` 时，未通过源应用清单门槛的插件也会被跳过。它们会被复制或报告在迁移报告中以供手动审查。

对于迁移的源安装精选插件，apply 会写入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- 每个选定插件都有一个带有 `marketplaceName: "openai-curated"` 和 `pluginName` 的显式插件条目

迁移从不写入 `plugins["*"]` 也从不存储本地 marketplace 缓存路径。源端的订阅失败会在手动项目上报告，并带有类型化原因，例如 `codex_subscription_required`、`codex_account_unavailable`、`plugin_disabled` 或 `plugin_read_unavailable`。使用 `--verify-plugin-apps` 时，源端应用清单失败也可能显示为 `app_inaccessible`、`app_disabled`、`app_missing` 或 `app_inventory_unavailable`。被跳过的插件不会写入目标配置。
目标端需要身份验证的安装会在受影响的插件项目上报告，并带有 `status: "skipped"`、`reason: "auth_required"` 和经过清理的应用标识符。它们的显式配置条目在写入时处于禁用状态，直到您重新授权并启用它们。其他安装失败是项目范围的 `error` 结果。

原生 Codex 插件配置还接受第一方 `openai-bundled` 和
`openai-primary-runtime` 市场身份，但迁移不会
从源状态自动发现或安装它们。

OpenAI 端的应用/插件可用性仍来自已登录的 Codex
帐户和工作区应用控制。请参阅
[将 Codex 与您的 ChatGPT 计划一起使用](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
以了解 OpenAI 的帐户和工作区控制概述，然后使用
[原生 Codex 插件](/zh/plugins/codex-native-plugins#manual-first-party-marketplace-entries)
进行手动第一方市场条目输入。

如果在规划期间无法获得 Codex 应用服务器插件清单，迁移
将回退到缓存的捆绑包咨询项目，而不是使整个
迁移失败。

## Hermes 提供商

内置的 Hermes 提供商默认在 `~/.hermes` 检测状态。当 Hermes 位于其他位置时，请使用 `--from <path>`。

### Hermes 导入的内容

- 来自 `config.yaml` 的默认模型配置。
- 来自 `providers` 和 `custom_providers` 的已配置模型提供商和自定义 OpenAI 兼容端点。
- 来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
- `SOUL.md` 和 `AGENTS.md` 到 OpenClaw 代理工作区。
- `memories/MEMORY.md` 和 `memories/USER.md` 附加到工作区记忆文件。
- OpenClaw 文件内存的内存配置默认值，以及 Honcho 等外部内存提供程序的存档或手动审查项目。
- 在 `skills/<name>/` 下包含 `SKILL.md` 文件的 Skills。
- 来自 `skills.config` 的每个 Skill 的配置值。
- 当接受交互式凭据迁移或设置了 `--include-secrets` 时，来自 OpenCode `auth.json` 的 OpenCode OpenAI OAuth 凭据。Hermes `auth.json` OAuth 条目是报告用于手动 OpenAI 重新身份验证或医生修复的旧版状态。
- 当接受交互式凭据迁移或设置了 `--include-secrets` 时，来自 Hermes `.env` 和 OpenCode `auth.json` 的受支持的 API 密钥和令牌。

### 支持的 `.env` 密钥

- `AI_GATEWAY_API_KEY`
- `ALIBABA_API_KEY`
- `ANTHROPIC_API_KEY`
- `ARCEEAI_API_KEY`
- `CEREBRAS_API_KEY`
- `CHUTES_API_KEY`
- `CLOUDFLARE_AI_GATEWAY_API_KEY`
- `COPILOT_GITHUB_TOKEN`
- `DASHSCOPE_API_KEY`
- `DEEPINFRA_API_KEY`
- `DEEPSEEK_API_KEY`
- `FIREWORKS_API_KEY`
- `GEMINI_API_KEY`
- `GH_TOKEN`
- `GITHUB_TOKEN`
- `GLM_API_KEY`
- `GOOGLE_API_KEY`
- `GROQ_API_KEY`
- `HF_TOKEN`
- `HUGGINGFACE_HUB_TOKEN`
- `KILOCODE_API_KEY`
- `KIMICODE_API_KEY`
- `KIMI_API_KEY`
- `MINIMAX_API_KEY`
- `MINIMAX_CODING_API_KEY`
- `MISTRAL_API_KEY`
- `MODELSTUDIO_API_KEY`
- `MOONSHOT_API_KEY`
- `NVIDIA_API_KEY`
- `OPENAI_API_KEY`
- `OPENCODE_API_KEY`
- `OPENCODE_GO_API_KEY`
- `OPENCODE_ZEN_API_KEY`
- `OPENROUTER_API_KEY`
- `QIANFAN_API_KEY`
- `QWEN_API_KEY`
- `TOGETHER_API_KEY`
- `VENICE_API_KEY`
- `XAI_API_KEY`
- `XIAOMI_API_KEY`
- `ZAI_API_KEY`
- `Z_AI_API_KEY`

### 仅存档状态

OpenClaw 无法安全解释的 Hermes 状态会被复制到迁移报告中以供人工审查，但不会加载到实际的 OpenClaw 配置或凭据中。这样可以保留不透明或不安全的状态，而无需假装 OpenClaw 可以自动执行或信任它：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `state.db`

### 应用后

```bash
openclaw doctor
```

## 插件合约

迁移源是插件。插件在 `openclaw.plugin.json` 中声明其提供商 ID：

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

在运行时，插件调用 `api.registerMigrationProvider(...)`。提供商实现 `detect`、`plan` 和 `apply`CLI。核心负责 CLI 编排、备份策略、提示、JSON 输出和冲突预检。核心将审核后的计划传递给 `apply(ctx, plan)`，为了兼容性，仅当该参数缺失时，提供商才可能重建计划。

提供商插件可以使用 `openclaw/plugin-sdk/migration` 进行项目构建和汇总计数，以及使用 `openclaw/plugin-sdk/migration-runtime` 进行感知冲突的文件复制、仅存档报告复制、缓存的配置运行时包装器和迁移报告。

## 新手引导集成

当提供商检测到已知源时，新手引导可以提供迁移。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供商，并且在应用之前仍会显示预览。

<Note>新手引导导入需要全新的 OpenClaw 设置。如果您已有本地状态，请先重置配置、凭据、会话和工作区。对于现有设置，备份加覆盖或合并导入属于功能限制。</Note>

## 相关

- [从 Hermes 迁移](/zh/install/migrating-hermes)：面向用户的演练。
- [从 Claude 迁移](/zh/install/migrating-claude)：面向用户的演练。
- [迁移](/zh/install/migratingOpenClaw)：将 OpenClaw 移动到新机器。
- [诊断](/zh/gateway/doctor)：应用迁移后的健康检查。
- [插件](/zh/tools/plugin)：插件安装和注册。
