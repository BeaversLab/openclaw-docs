---
summary: "CLICLI 参考文档 `openclaw migrate` （从另一个代理系统导入状态）"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "迁移"
---

# `openclaw migrate`

通过插件拥有的迁移提供商从另一个代理系统导入状态。捆绑的提供商涵盖 Codex CLI 状态、[Claude](CLI/en/install/migrating-claude) 和 [Hermes](/zh/install/migrating-hermes)；第三方插件可以注册其他提供商。

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
  注册的迁移提供商名称，例如 `hermes`。运行 `openclaw migrate list` 以查看已安装的提供商。
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
  按技能名称或项目 ID 选择一个技能复制项。重复该标志以迁移多个技能。当省略时，交互式 Codex 迁移显示复选框选择器，而非交互式迁移保留所有计划的技能。
</ParamField>
<ParamField path="--plugin <name>" type="string">
  按插件名称或项目 ID 选择一个 Codex 插件安装项。重复该标志以迁移多个 Codex 插件。当省略时，交互式 Codex 迁移显示原生 Codex 插件复选框选择器，而非交互式迁移保留所有计划的插件。这仅适用于由 Codex 应用服务器清单发现的源安装 `openai-curated` Codex 插件。
</ParamField>
<ParamField path="--verify-plugin-apps" type="boolean">
  仅限 Codex。在规划原生插件激活之前，强制对源 Codex 应用服务器 `app/list` 进行全新的遍历。默认关闭以保持迁移规划快速。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳过应用前备份。当本地 OpenClaw 状态存在时，需要 `--force`OpenClaw。
</ParamField>
<ParamField path="--force" type="boolean">
  当应用否则会拒绝跳过备份时，需与 `--no-backup` 一起使用。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式打印计划或应用结果。使用 `--json` 且没有 `--yes` 时，应用将打印计划且不会改变状态。
</ParamField>

## 安全模型

`openclaw migrate` 优先使用预览。

<AccordionGroup>
  <Accordion title="应用前预览">
    在任何更改发生之前，提供商会返回一个详细计划，包括冲突、跳过的项目和敏感项目。JSON 计划、应用输出和迁移报告会编辑嵌套的类秘密键，如 API 密钥、令牌、授权标头、Cookie 和密码。

    `openclaw migrate apply <provider>` 会预览计划并在更改状态前提示，除非设置了 `--yes`。在非交互模式下，应用需要 `--yes`。

  </Accordion>
  <Accordion title="备份">
    Apply 在应用迁移之前会创建并验证 OpenClaw 备份。如果尚不存在本地 OpenClaw 状态，则跳过备份步骤，迁移可以继续。若要在状态存在时跳过备份，请同时传递 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="冲突">
    当计划存在冲突时，Apply 会拒绝继续。查看计划，如果是有意替换现有目标，请使用 `--overwrite` 重新运行。提供商仍可在迁移报告目录中为覆盖的文件写入项目级备份。
  </Accordion>
  <Accordion title="机密">
    默认情况下从不导入机密。使用 `--include-secrets` 导入支持的凭据。
  </Accordion>
</AccordionGroup>

## Claude 提供商

捆绑的 Claude 提供商默认在 `~/.claude` 检测 Claude Code 状态。使用 `--from <path>` 导入特定的 Claude Code 主目录或项目根目录。

<Tip>有关面向用户的演练，请参阅[从 Claude 迁移](/zh/install/migrating-claude)。</Tip>

### Claude 导入的内容

- 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 到 OpenClaw 代理工作区。
- 用户 `~/.claude/CLAUDE.md` 附加到工作区 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude 技能目录。
- 已转换为 OpenClaw 技能的 Claude 命令 Markdown 文件，仅限手动调用。

### 归档和人工审查状态

Claude 钩子、权限、环境默认值、本地内存、路径范围规则、子代理、缓存、计划和项目历史会保留在迁移报告中，或作为需要人工审查的项目进行报告。OpenClaw 不会执行钩子、复制广泛的允许列表，或自动导入 OAuth/Desktop 凭据状态。

## Codex 提供商

捆绑的 Codex 提供商默认在 `~/.codex` 检测 Codex CLI 状态，或者当设置了该环境变量时在 `CODEX_HOME` 检测。使用 `--from <path>` 来盘点特定的 Codex 主目录。

当迁移到 OpenClaw Codex 驱动程序并且您想要有意识地提升有用的个人 Codex CLI 资源时，请使用此提供商。本地 Codex 应用服务器启动使用每个代理的 `CODEX_HOME`，因此默认情况下它们不会读取您的个人 Codex CLI 状态，而子进程仍然继承正常的进程 `HOME`，除非应用服务器启动明确覆盖它。

在交互式终端中运行 `openclaw migrate codex` 会预览完整计划，然后在最终应用确认之前打开复选框选择器。首先提示技能复制项。使用 `Toggle all on` 或 `Toggle all off` 进行批量选择。按空格键切换行，或按回车键激活高亮显示的行并继续。计划的技能默认处于选中状态，冲突的技能默认处于未选中状态，而 `Skip for now` 跳过此次运行的技能复制，同时继续进行插件选择。当源安装的精选 Codex 插件可迁移且未提供 `--plugin` 时，迁移随后会提示按插件名称激活本机 Codex 插件。除非目标 OpenClaw Codex 插件配置已有该插件，否则插件项默认处于选中状态。现有的目标插件默认处于未选中状态，并显示冲突提示，例如 `conflict: plugin exists`；选择 `Toggle all off` 在该运行中不迁移任何本机 Codex 插件，或选择 `Skip for now` 在应用前停止。对于脚本化或精确运行，请为每个技能传递一次 `--skill <name>`，例如：

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

- `$CODEX_HOME/skills` 下的 Codex CLI 技能目录，不包括 Codex 的 `.system` 缓存。
- `$HOME/.agents/skills` 下的个人 AgentSkills，在您需要每个代理的所有权时，会复制到当前的 OpenClaw 代理工作区。
- 通过 Codex 应用服务器 `plugin/list` 发现的源安装 `openai-curated` Codex 插件。规划阶段会读取每个已启用已安装插件的 `plugin/read`。应用支持的插件要求源 Codex 应用服务器的账户响应必须是 ChatGPT 订阅账户；非 ChatGPT 或缺失的账户响应将使用 `codex_subscription_required` 跳过。默认情况下，迁移不会调用源 `app/list`，因此通过账户检查的应用支持的插件会在不验证源应用可访问性的情况下进行规划，并且账户查找传输失败将使用 `codex_account_unavailable` 跳过。当您希望迁移强制获取新的源 `app/list` 快照，并要求每个拥有的应用在规划本地激活之前都存在、已启用且可访问时，请传递 `--verify-plugin-apps`。在该模式下，账户查找传输失败将进入源应用清单验证。源应用清单快照保存在当前进程的内存中；它不会写入迁移输出或目标配置。已禁用的插件、无法读取的插件详情、订阅受限的源账户，以及当请求验证时，缺失的应用、禁用的应用、无法访问的应用或源应用清单失败，都将变为带有类型化原因的手动跳过项，而不是目标配置条目。Apply 会为每个选定的符合条件的插件调用应用服务器 `plugin/install`，即使目标应用服务器已经报告该插件已安装并已启用。迁移的 Codex 插件仅在选择了本机 Codex 框架的会话中可用；它们不会暴露给 Pi、普通的 OpenAI 提供商运行、ACP 会话绑定或其他框架。

### 手动审查 Codex 状态

Codex `config.toml`、原生 `hooks/hooks.json`、非精选市场、非源安装精选插件的缓存插件包，以及未通过源订阅门的源安装插件不会自动激活。当设置了 `--verify-plugin-apps` 时，未通过源应用清单门的插件也会被跳过。它们会被复制或在迁移报告中报告以供手动审查。

对于迁移的源安装精选插件，apply 会写入：

- `plugins.entries.codex.enabled: true`
- `plugins.entries.codex.config.codexPlugins.enabled: true`
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions: true`
- 针对每个选定的插件，提供一个包含 `marketplaceName: "openai-curated"` 和
  `pluginName` 的显式插件条目

迁移永远不会写入 `plugins["*"]`，也永远不会存储本地市场缓存路径。源端订阅失败会在手动项目上报告，并带有诸如 `codex_subscription_required`、`codex_account_unavailable`、
`plugin_disabled` 或 `plugin_read_unavailable` 之类的具体原因。使用 `--verify-plugin-apps` 时，
源端应用清单失败也可能显示为 `app_inaccessible`、
`app_disabled`、`app_missing` 或 `app_inventory_unavailable`。被跳过的插件
不会写入目标配置。
目标端需要身份验证的安装会在受影响的插件项目上报告，并附带
`status: "skipped"`、`reason: "auth_required"` 和经过净化的应用标识符。
它们的显式配置条目在您重新授权并
启用它们之前将被写入为禁用状态。其他安装失败则是项目范围的 `error` 结果。

如果在规划期间 Codex 应用服务器插件清单不可用，迁移
将回退到缓存捆绑包建议项，而不是导致整个
迁移失败。

## Hermes 提供商

捆绑的 Hermes 提供商默认检测 `~/.hermes` 处的状态。当 Hermes 位于其他位置时，请使用 `--from <path>`。

### Hermes 导入的内容

- 来自 `config.yaml` 的默认模型配置。
- 来自 `providers` 和 `custom_providers` 的配置模型提供商和自定义 OpenAI 兼容端点。
- 来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
- `SOUL.md` 和 `AGENTS.md`OpenClaw 到 OpenClaw 代理工作区。
- `memories/MEMORY.md` 和 `memories/USER.md` 附加到工作区内存文件。
- OpenClaw 文件内存的内存配置默认值，以及 Honcho 等外部内存提供商的存档或人工审查项。
- 在 `skills/<name>/` 下包含 `SKILL.md` 文件的 Skills。
- 来自 `skills.config` 的每个 Skill 配置值。
- 来自 API`.env` 的受支持 API 密钥，仅限使用 `--include-secrets`。

### 支持的 `.env` 密钥

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

在运行时，插件调用 `api.registerMigrationProvider(...)`。提供商实现 `detect`、`plan` 和 `apply`CLI。Core 拥有 CLI 编排、备份策略、提示词、JSON 输出和冲突预检。Core 将审核后的计划传递给 `apply(ctx, plan)`，并且提供商仅在该参数不存在时才能重建计划以确保兼容性。

提供商插件可以使用 `openclaw/plugin-sdk/migration` 进行项目构建和摘要计数，以及使用 `openclaw/plugin-sdk/migration-runtime` 进行感知冲突的文件复制、仅存档报告复制、缓存的配置运行时包装器和迁移报告。

## 新手引导集成

当提供商检测到已知源时，新手引导可以提供迁移。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供商，并在应用之前仍显示预览。

<Note>新手引导导入需要全新的 OpenClaw 设置。如果您已有本地状态，请先重置配置、凭据、会话和工作区。对于现有设置，备份加覆盖或合并导入是受功能限制的。</Note>

## 相关

- [从 Hermes 迁移](/zh/install/migrating-hermes)：面向用户的演练指南。
- [从 Claude 迁移](/zh/install/migrating-claude)：面向用户的演练指南。
- [迁移](/zh/install/migratingOpenClaw)：将 OpenClaw 移动到新机器。
- [Doctor](/zh/gateway/doctor)：应用迁移后的健康检查。
- [插件](/zh/tools/plugin)：插件安装和注册。
