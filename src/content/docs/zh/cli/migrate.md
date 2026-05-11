---
summary: "CLI 参考文档，用于 `openclaw migrate`（从另一个代理系统导入状态）"
read_when:
  - You want to migrate from Hermes or another agent system into OpenClaw
  - You are adding a plugin-owned migration provider
title: "迁移"
---

# `openclaw migrate`

通过插件拥有的迁移提供商从另一个代理系统导入状态。捆绑的提供商涵盖 [Claude](/zh/install/migrating-claude) 和 [Hermes](/zh/install/migrating-hermes)；第三方插件可以注册其他提供商。

<Tip>面向用户的操作指南，请参阅 [从 Claude 迁移](/zh/install/migrating-claude) 和 [从 Hermes 迁移](/zh/install/migrating-hermes)。[迁移中心](/zh/install/migrating) 列出了所有路径。</Tip>

## 命令

```bash
openclaw migrate list
openclaw migrate claude --dry-run
openclaw migrate hermes --dry-run
openclaw migrate hermes
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
  构建计划并退出，不更改状态。
</ParamField>
<ParamField path="--from <path>" type="string">
  覆盖源状态目录。Hermes 默认为 `~/.hermes`。
</ParamField>
<ParamField path="--include-secrets" type="boolean">
  导入支持的凭据。默认关闭。
</ParamField>
<ParamField path="--overwrite" type="boolean">
  允许在计划报告冲突时，应用操作替换现有目标。
</ParamField>
<ParamField path="--yes" type="boolean">
  跳过确认提示。在非交互模式下为必需项。
</ParamField>
<ParamField path="--no-backup" type="boolean">
  跳过应用前备份。当存在本地 OpenClaw 状态时需要 `--force`。
</ParamField>
<ParamField path="--force" type="boolean">
  当应用操作否则会拒绝跳过备份时，需与 `--no-backup` 一起使用。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式打印计划或应用结果。配合 `--json` 且没有 `--yes` 时，apply 会打印计划且不会更改状态。
</ParamField>

## 安全模型

`openclaw migrate` 采用预览优先模式。

<AccordionGroup>
  <Accordion title="应用前预览">
    在进行任何更改之前，提供商会返回一份详细的计划，其中包括冲突、跳过的项目和敏感项目。JSON 计划、应用输出和迁移报告会编辑嵌套的类密钥（例如 API 密钥、令牌、授权标头、Cookie 和密码）。

    `openclaw migrate apply <provider>` 会在更改状态之前预览计划并提示，除非设置了 `--yes`。在非交互模式下，应用需要 `--yes`。

  </Accordion>
  <Accordion title="备份">
    应用会在应用迁移之前创建并验证 OpenClaw 备份。如果尚不存在本地 OpenClaw 状态，则会跳过备份步骤，迁移可以继续。要在状态存在时跳过备份，请同时传递 `--no-backup` 和 `--force`。
  </Accordion>
  <Accordion title="冲突">
    当计划存在冲突时，应用将拒绝继续。查看计划，然后如果是有意替换现有目标，请使用 `--overwrite` 重新运行。提供商仍可能在迁移报告目录中为被覆盖的文件写入项目级备份。
  </Accordion>
  <Accordion title="机密">
    默认情况下从不导入机密。使用 `--include-secrets` 导入支持的凭据。
  </Accordion>
</AccordionGroup>

## Claude 提供商

捆绑的 Claude 提供商默认在 `~/.claude` 检测 Claude Code 状态。使用 `--from <path>` 导入特定的 Claude Code 主目录或项目根目录。

<Tip>如需面向用户的演练，请参阅[从 Claude 迁移](/zh/install/migrating-claude)。</Tip>

### Claude 导入的内容

- 将项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 导入到 OpenClaw 代理工作区。
- 用户 `~/.claude/CLAUDE.md` 附加到工作区 `USER.md`。
- 来自项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 的 MCP 服务器定义。
- 包含 `SKILL.md` 的 Claude 技能目录。
- 已转换为 OpenClaw 技能的 Claude 命令 Markdown 文件，仅限手动调用。

### 归档和人工审查状态

Claude 钩子、权限、环境默认值、本地内存、路径范围规则、子代理、缓存、计划和项目历史会保留在迁移报告中，或作为需要人工审查的项目进行报告。OpenClaw 不会执行钩子、复制广泛的允许列表，或自动导入 OAuth/Desktop 凭据状态。

## Hermes 提供商

内置的 Hermes 提供商默认在 `~/.hermes` 处检测状态。当 Hermes 位于其他位置时，请使用 `--from <path>`。

### Hermes 导入的内容

- 来自 `config.yaml` 的默认模型配置。
- 来自 `providers` 和 `custom_providers` 的已配置模型提供商和自定义 OpenAI 兼容端点。
- 来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
- `SOUL.md` 和 `AGENTS.md` 到 OpenClaw 代理工作区。
- `memories/MEMORY.md` 和 `memories/USER.md` 附加到工作区内存文件。
- OpenClaw 文件内存的内存配置默认值，以及针对 Honcho 等外部内存提供商的归档或人工审查项目。
- 在 `skills/<name>/` 下包含 `SKILL.md` 文件的技能。
- 来自 `skills.config` 的每个技能的配置值。
- 来自 `.env` 的受支持 API 密钥，仅限使用 `--include-secrets` 时。

### 支持的 `.env` 密钥

`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。

### 仅限归档的状态

OpenClaw 无法安全解释的 Hermes 状态会被复制到迁移报告中以供人工审查，但它不会被加载到实际的 OpenClaw 配置或凭据中。这保留了不透明或不安全的状态，而不会假装 OpenClaw 可以自动执行或信任它：

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

## 插件合约

迁移源是插件。插件在 `openclaw.plugin.json` 中声明其提供商 ID：

```json
{
  "contracts": {
    "migrationProviders": ["hermes"]
  }
}
```

在运行时，插件调用 `api.registerMigrationProvider(...)`。提供商实现 `detect`、`plan` 和 `apply`。Core 负责 CLI 编排、备份策略、提示、JSON 输出和冲突预检。Core 将审查后的计划传递给 `apply(ctx, plan)`，并且为了兼容性，提供商只能在该参数不存在时重建计划。

提供商插件可以使用 `openclaw/plugin-sdk/migration` 进行项目构建和摘要计数，以及使用 `openclaw/plugin-sdk/migration-runtime` 进行具有冲突感知的文件复制、仅归档报告复制和迁移报告。

## 新手引导集成

当提供商检测到已知源时，新手引导可以提供迁移。`openclaw onboard --flow import` 和 `openclaw setup --wizard --import-from hermes` 都使用相同的插件迁移提供商，并且在应用前仍会显示预览。

<Note>新手引导导入需要全新的 OpenClaw 设置。如果您已有本地状态，请首先重置配置、凭据、会话和工作区。对于现有设置，备份加覆盖或合并导入是功能受限的。</Note>

## 相关

- [从 Hermes 迁移](/zh/install/migrating-hermes)：面向用户的演练。
- [从 Claude 迁移](/zh/install/migrating-claude)：面向用户的演练。
- [迁移](/zh/install/migrating)：将 OpenClaw 移动到新机器。
- [Doctor](/zh/gateway/doctor)：应用迁移后的健康检查。
- [插件](/zh/tools/plugin)：插件安装和注册。
