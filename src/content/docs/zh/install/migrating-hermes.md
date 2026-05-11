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
  <Tab title="CLI">
    使用 `openclaw migrate` 进行脚本化或可重复的运行。有关完整参考，请参阅 [`openclaw migrate`](/zh/cli/migrate)。

    ```bash
    openclaw migrate hermes --dry-run    # preview only
    openclaw migrate apply hermes --yes  # apply with confirmation skipped
    ```

    当 Hermes 位于 `~/.hermes` 之外时，添加 `--from <path>`。

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
  <Accordion title="Workspace files">
    - `SOUL.md` 和 `AGENTS.md` 会被复制到 OpenClaw 代理工作区中。
    - `memories/MEMORY.md` 和 `memories/USER.md` 将被**附加**到匹配的 OpenClaw 记忆文件中，而不是覆盖它们。
  </Accordion>
  <Accordion title="Memory configuration">
    OpenClaw 文件记忆的默认记忆配置。外部记忆提供商（如 Honcho）会被记录为归档或人工审核项，以便您有意识地迁移它们。
  </Accordion>
  <Accordion title="Skills">
    在 `skills/<name>/` 下带有 `SKILL.md` 文件的 Skills 会被复制，同时包括来自 `skills.config` 的每个技能的配置值。
  </Accordion>
  <Accordion title="API 密钥（可选）">
    设置 `--include-secrets` 以导入受支持的 `.env` 密钥：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`OPENROUTER_API_KEY`、`GOOGLE_API_KEY`、`GEMINI_API_KEY`、`GROQ_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`DEEPSEEK_API_KEY`。如果没有设置该标志，则永远不会复制密钥。
  </Accordion>
</AccordionGroup>

## 仅保留在归档中的内容

提供商会将这些内容复制到迁移报告目录中供人工审核，但**不会**将它们加载到实际的 OpenClaw 配置或凭据中：

- `plugins/`
- `sessions/`
- `logs/`
- `cron/`
- `mcp-tokens/`
- `auth.json`
- `state.db`

OpenClaw 拒绝自动执行或信任此状态，因为格式和信任假设可能会在系统之间产生偏差。在查看归档后，请手动移动您需要的内容。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate hermes --dry-run
    ```

    该计划列出了将要更改的所有内容，包括冲突、跳过的项目以及任何敏感项目。计划输出会隐藏嵌套的类似密钥的键。

  </Step>
  <Step title="备份并应用">
    ```bash
    openclaw migrate apply hermes --yes
    ```

    OpenClaw 会在应用之前创建并验证备份。如果您需要导入 API 密钥，请添加 `--include-secrets`。

  </Step>
  <Step title="运行诊断">
    ```bash
    openclaw doctor
    ```

    [Doctor](/zh/gateway/doctor) 会重新应用所有待处理的配置迁移，并检查导入期间引入的问题。

  </Step>
  <Step title="重启并验证">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认网关运行正常，并且您导入的模型、记忆和技能已加载。

  </Step>
</Steps>

## 冲突处理

当计划报告冲突（目标位置已存在文件或配置值）时，Apply 将拒绝继续。

<Warning>仅当有意替换现有目标时，才使用 `--overwrite` 重新运行。提供程序可能仍会在迁移报告目录中为被覆盖的文件写入项目级备份。</Warning>

对于全新的 OpenClaw 安装，冲突是很少见的。它们通常出现在您在已有用户编辑的设置上重新运行导入时。

如果在应用过程中出现冲突（例如，配置文件发生意外的竞态条件），Hermes 会将其余的依赖配置项标记为 `skipped`，原因为 `blocked by earlier apply conflict`，而不是部分写入。迁移报告会记录每个被阻止的项目，以便您可以解决原始冲突并重新运行导入。

## 机密

默认情况下从不导入机密。

- 首先运行 `openclaw migrate apply hermes --yes` 以导入非机密状态。
- 如果您还希望复制受支持的 `.env` 密钥，请使用 `--include-secrets` 重新运行。
- 对于 SecretRef 管理的凭据，请在导入完成后配置 SecretRef 源。

## 用于自动化的 JSON 输出

```bash
openclaw migrate hermes --dry-run --json
openclaw migrate apply hermes --json --yes
```

使用 `--json` 且不使用 `--yes` 时，apply 会打印计划且不会修改状态。这是 CI 和共享脚本最安全的模式。

## 故障排除

<AccordionGroup>
  <Accordion title="Apply 由于冲突而拒绝执行">检查计划输出。每个冲突都会标明源路径和现有目标。针对每一项决定是跳过、编辑目标，还是使用 `--overwrite` 重新运行。</Accordion>
  <Accordion title="Hermes 位于 ~/.hermes 之外">传递 `--from /actual/path` (CLI) 或 `--import-source /actual/path` (新手引导)。</Accordion>
  <Accordion title="新手引导拒绝在现有设置上导入">新手引导导入需要全新的设置。请重置状态并重新进行新手引导，或者直接使用 `openclaw migrate apply hermes`，它支持 `--overwrite` 和显式备份控制。</Accordion>
  <Accordion title="API 密钥未导入">需要使用 `--include-secrets`，并且仅识别上面列出的密钥。`.env` 中的其他变量将被忽略。</Accordion>
</AccordionGroup>

## 相关内容

- [`openclaw migrate`](/zh/cli/migrate)：完整的 CLI 参考、插件合约和 JSON 结构。
- [新手引导](/zh/cli/onboard)：向导流程和非交互式标志。
- [Migrating](/zh/install/migrating)：在机器之间移动 OpenClaw 安装。
- [Doctor](/zh/gateway/doctor)：迁移后健康检查。
- [Agent workspace](/zh/concepts/agent-workspace)：`SOUL.md`、`AGENTS.md` 和内存文件所在的目录。
