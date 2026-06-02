---
summary: "从 Hermes 迁移到 OpenClaw，提供预览且可撤销的导入"
read_when:
  - You are coming from Hermes and want to keep your model config, prompts, memory, and skills
  - You want to know what OpenClaw imports automatically and what stays archive-only
  - You need a clean, scripted migration path (CI, fresh laptop, automation)
title: "从 Hermes 迁移"
---

OpenClaw 通过捆绑的迁移提供商导入 Hermes 状态。该提供商会在更改状态前预览所有内容，在计划和报告中编辑敏感信息，并在应用前创建已验证的备份。

<Note>导入需要全新的 OpenClaw 设置。如果您已有本地 OpenClaw 状态，请先重置配置、凭据、会话和工作区，或者在查看计划后直接将 `openclaw migrate` 与 `--overwrite` 一起使用。</Note>

## 两种导入方式

<Tabs>
  <Tab title="新手引导向导">
    最快速的路径。向导会检测位于 `~/.hermes` 的 Hermes 并在应用前显示预览。

    ```bash
    openclaw onboard --flow import
    ```

    或者指向特定的源：

    ```bash
    openclaw onboard --import-from hermes --import-source ~/.hermes
    ```

  </Tab>
  <Tab title="CLICLI">
    对于脚本化或可重复运行，请使用 `openclaw migrate`。完整参考请参阅 [`openclaw migrate`](/zh/cli/migrate)。

    ```bash
    openclaw migrate hermes --dry-run    # preview only
    openclaw migrate apply hermes --yes  # apply with confirmation skipped
    ```

    当 Hermes 位于 `~/.hermes` 之外时，请添加 `--from <path>`。

  </Tab>
</Tabs>

## 导入的内容

<AccordionGroup>
  <Accordion title="模型配置">
    - 来自 Hermes `config.yaml` 的默认模型选择。
    - 来自 `providers` 和 `custom_providers` 的已配置模型提供商和自定义 OpenAI 兼容端点。

  </Accordion>
  <Accordion title="MCP 服务器">
    来自 `mcp_servers` 或 `mcp.servers` 的 MCP 服务器定义。
  </Accordion>
  <Accordion title="工作区文件">
    - `SOUL.md` 和 `AGENTS.md` 会被复制到 OpenClaw 代理工作区中。
    - `memories/MEMORY.md` 和 `memories/USER.md` 将被**追加**到匹配的 OpenClaw 记忆文件中，而不是覆盖它们。

  </Accordion>
  <Accordion title="Memory configuration">
    OpenClaw 文件记忆的默认记忆配置。外部记忆提供商（如 Honcho）会被记录为归档或人工审核项，以便您有意识地迁移它们。
  </Accordion>
  <Accordion title="Skills">
    在 `skills/<name>/` 下带有 `SKILL.md` 文件的 Skills 会被复制，同时包括来自 `skills.config` 的每个技能的配置值。
  </Accordion>
  <Accordion title="Auth credentials">
    交互式 `openclaw migrate` 会在导入身份验证凭据之前进行询问，默认选择“是”。接受的导入内容包括来自 OpenCode `auth.json` 的 OpenCode OpenAI OAuth 凭据、来自 OpenCode `auth.json` 的 OpenCode 和 GitHub Copilot 条目，以及[受支持的 `.env` 密钥](/zh/cli/migrate#supported-env-keys)。Hermes `auth.json` OAuth 条目属于旧有状态，会显示为手动重新认证/诊断修复工作，而不会导入到实时身份验证中。请使用 `--include-secrets` 进行非交互式 `openclaw migrate` 凭据导入，使用 `--no-auth-credentials` 跳过它，或在从新手引导向导导入时使用新手引导 `--import-secrets`。
  </Accordion>
</AccordionGroup>

## 仅保留在归档中的内容

提供商会将这些内容复制到迁移报告目录中供人工审核，但**不会**将它们加载到实际的 OpenClaw 配置或凭据中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `state.db`

由于格式和信任假设可能在系统之间发生漂移，OpenClaw 拒绝自动执行或信任此状态。在查看存档后，请手动移动您需要的内容。

## 推荐流程

<Steps>
  <Step title="Preview the plan">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    计划列出了将要更改的所有内容，包括冲突、跳过的项目以及任何敏感项目。计划输出会隐藏嵌套的看起来像秘密的密钥。

  </Step>
  <Step title="Apply with backup">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 在应用之前会创建并验证备份。此非交互式示例导入非机密状态。运行时不带 `--yes` 以回答凭证提示，或在无人值守运行中添加 `--include-secrets` 以包含支持的凭证。

  </Step>
  <Step title="Run doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/zh/gateway/doctor) 会重新应用任何待处理的配置迁移，并检查导入期间引入的问题。

  </Step>
  <Step title="Restart and verify">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认网关健康状况良好，并且您导入的模型、记忆和技能已加载。

  </Step>
</Steps>

## 冲突处理

当计划报告冲突（目标位置已存在文件或配置值）时，Apply 将拒绝继续。

<Warning>仅在有意替换现有目标时才使用 `--overwrite` 重新运行。提供商仍可能为迁移报告目录中被覆盖的文件写入项目级备份。</Warning>

对于全新安装的 OpenClaw，冲突是很少见的。它们通常出现在您对已有用户编辑的设置重新运行导入时。

如果在应用过程中出现冲突（例如，配置文件发生意外的竞争），Hermes 会将其余依赖的配置项标记为 `skipped`，原因为 `blocked by earlier apply conflict`，而不是部分写入它们。迁移报告会记录每个被阻止的项目，以便您解决原始冲突并重新运行导入。

## 机密

交互式 `openclaw migrate` 会询问是否导入检测到的身份验证凭据，默认选择“是”。

- 接受提示将导入来自 OpenCode `auth.json` 的 OpenCode OpenAI OAuth 凭据、来自 OpenCode `auth.json` 的 OpenCode 和 GitHub Copilot 条目，以及[受支持的 `.env` 密钥](/zh/cli/migrate#supported-env-keys)。Hermes `auth.json` OAuth 条目将报告为手动 OpenAI 重新认证或诊断修复。
- 使用 `--no-auth-credentials` 或在提示时选择 no 以仅导入非机密状态。
- 使用 `--yes` 在无人值守运行时使用 `--include-secrets`。
- 从新手引导向导导入凭据时，使用新手引导 `--import-secrets`。
- 对于由 SecretRef 管理的凭据，请在导入完成后配置 SecretRef 源。

## 用于自动化的 JSON 输出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

使用 `--json` 且不使用 `--yes` 时，apply 会打印计划且不会更改状态。这是 CI 和共享脚本最安全模式。

## 故障排除

<AccordionGroup>
  <Accordion title="Apply refuses with conflicts">检查计划输出。每个冲突都会标识源路径和现有目标。请逐项决定是跳过、编辑目标，还是使用 `--overwrite` 重新运行。</Accordion>
  <Accordion title="Hermes lives outside ~/.hermes">传递 `--from /actual/path`CLI (CLI) 或 `--import-source /actual/path` (新手引导)。</Accordion>
  <Accordion title="新手引导 refuses to import on an existing setup">新手引导导入需要全新的设置。您可以重置状态并重新进行新手引导，或者直接使用 `openclaw migrate apply hermes`，它支持 `--overwrite` 和显式备份控制。</Accordion>
  <Accordion title="APIAPI keys did not import">交互式 `openclaw migrate`API 仅在您接受凭据提示时才导入 API 密钥。非交互式 `--yes` 运行需要 `--include-secrets`；新手引导导入需要 `--import-secrets`。只有[支持的 `.env` 密钥](/zh/cli/migrate#supported-env-keys) 会被识别；`.env` 中的其他变量将被忽略。</Accordion>
</AccordionGroup>

## 相关

- [`openclaw migrate`](/zh/cli/migrateCLI)：完整的 CLI 参考、插件契约和 JSON 形状。
- [新手引导](/zh/cli/onboard)：向导流程和非交互式标志。
- [迁移](/zh/install/migratingOpenClaw)：在机器之间移动 OpenClaw 安装。
- [检查](/zh/gateway/doctor)：迁移后的健康检查。
- [代理工作区](/zh/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和内存文件所在的目录。
