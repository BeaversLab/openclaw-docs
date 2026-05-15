---
summary: "通过预览导入将 Claude Code 和 Claude Desktop 本地状态迁移到 OpenClaw"
read_when:
  - You are coming from Claude Code or Claude Desktop and want to keep instructions, MCP servers, and skills
  - You need to understand what OpenClaw imports automatically and what stays archive-only
title: "从 Claude 迁移"
---

OpenClaw 通过内置的 Claude 迁移提供商导入本地 Claude 状态。该提供商在更改状态前预览每个项目，在计划和报告中编辑敏感信息，并在应用前创建经过验证的备份。

<Note>OpenClaw 导入需要全新的 OpenClaw 设置。如果您已有本地 OpenClaw 状态，请先重置配置、凭据、会话和工作区，或者在查看计划后直接将 `openclaw migrate` 与 `--overwrite` 结合使用。</Note>

## 两种导入方式

<Tabs>
  <Tab title="新手向导">
    当向导检测到本地 Claude 状态时，会提供 Claude 选项。

    ```bash
    openclaw onboard --flow import
    ```

    或者指向特定的源：

    ```bash
    openclaw onboard --import-from claude --import-source ~/.claude
    ```

  </Tab>
  <Tab title="CLI">
    使用 `openclaw migrate` 进行脚本化或可重复运行。有关完整参考，请参阅 [`openclaw migrate`](/zh/cli/migrate)。

    ```bash
    openclaw migrate claude --dry-run
    openclaw migrate apply claude --yes
    ```

    添加 `--from <path>` 以导入特定的 Claude Code 主目录或项目根目录。

  </Tab>
</Tabs>

## 导入的内容

<AccordionGroup>
  <Accordion title="指令和记忆">
    - 项目 `CLAUDE.md` 和 `.claude/CLAUDE.md` 内容被复制或追加到 OpenClaw 代理工作区 `AGENTS.md` 中。
    - 用户 `~/.claude/CLAUDE.md` 内容被追加到工作区 `USER.md` 中。

  </Accordion>
  <Accordion title="MCP 服务器">
    MCP 服务器定义将从项目 `.mcp.json`、Claude Code `~/.claude.json` 和 Claude Desktop `claude_desktop_config.json` 导入（如果存在）。
  </Accordion>
  <Accordion title="Skills 和命令">
    - 带有 `SKILL.md` 文件的 Claude Skills 会被复制到 OpenClaw 工作区 skills 目录中。
    - 位于 `.claude/commands/` 或 `~/.claude/commands/` 下的 Claude 命令 Markdown 文件将被转换为带有 `disable-model-invocation: true` 的 OpenClaw skills。

  </Accordion>
</AccordionGroup>

## 仅保留在存档中的内容

提供商会将这些内容复制到迁移报告中以供人工审核，但**不会**将它们加载到实时的 OpenClaw 配置中：

- Claude hooks
- Claude 权限和广泛的工具允许列表
- Claude 环境默认值
- `CLAUDE.local.md`
- `.claude/rules/`
- 位于 `.claude/agents/` 或 `~/.claude/agents/` 下的 Claude 子代理
- Claude Code 缓存、计划和项目历史目录
- Claude Desktop 扩展和操作系统存储的凭据

OpenClaw 拒绝自动执行 hooks、信任权限允许列表或解码不透明的 OAuth 和 Desktop 凭据状态。在审查存档后，请手动移动您需要的内容。

## 源选择

如果没有指定 `--from`，OpenClaw 会检查位于 `~/.claude` 的默认 Claude Code 主目录、抽样的 Claude Code `~/.claude.json` 状态文件，以及 macOS 上的 Claude Desktop MCP 配置。

当 `--from` 指向项目根目录时，OpenClaw 仅导入该项目的 Claude 文件，例如 `CLAUDE.md`、`.claude/settings.json`、`.claude/commands/`、`.claude/skills/` 和 `.mcp.json`。在项目根目录导入期间，它不会读取您的全局 Claude 主目录。

## 推荐流程

<Steps>
  <Step title="预览计划">
    ```bash
    openclaw migrate claude --dry-run
    ```

    该计划列出了将要更改的所有内容，包括冲突、跳过的项目以及从嵌套的 MCP `env` 或 `headers` 字段中编辑掉的敏感值。

  </Step>
  <Step title="应用并备份">
    ```bash
    openclaw migrate apply claude --yes
    ```

    OpenClaw 在应用之前会创建并验证备份。

  </Step>
  <Step title="Run doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/zh/gateway/doctor) 会检查导入后的配置或状态问题。

  </Step>
  <Step title="Restart and verify">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    确认网关健康，并且您导入的指令、MCP 服务器和技能已加载。

  </Step>
</Steps>

## 冲突处理

当计划报告冲突（目标位置已存在文件或配置值）时，应用将拒绝继续。

<Warning>仅当有意替换现有目标时，才使用 `--overwrite` 重新运行。提供商仍可能在迁移报告目录中为被覆盖的文件写入项目级备份。</Warning>

对于全新的 OpenClaw 安装，冲突很少见。它们通常出现在您在已有用户编辑的设置上重新运行导入时。

## 用于自动化的 JSON 输出

```bash
openclaw migrate claude --dry-run --json
openclaw migrate apply claude --json --yes
```

使用 `--json` 且不使用 `--yes` 时，应用会打印计划而不会改变状态。这是 CI 和共享脚本最安全的模式。

## 故障排除

<AccordionGroup>
  <Accordion title="Claude state lives outside ~/.claude">传递 `--from /actual/path` (CLI) 或 `--import-source /actual/path` (新手引导)。</Accordion>
  <Accordion title="新手引导 refuses to import on an existing setup">新手引导导入需要全新的设置。要么重置状态并重新进行新手引导，要么直接使用 `openclaw migrate apply claude`，它支持 `--overwrite` 和显式备份控制。</Accordion>
  <Accordion title="MCP servers from Claude Desktop did not import">Claude Desktop 从特定于平台的路径读取 `claude_desktop_config.json`。如果 OpenClaw 未自动检测到它，请将 `--from` 指向该文件的目录。</Accordion>
  <Accordion title="Claude commands became skills with 模型 invocation disabled">这是设计如此。Claude 命令由用户触发，因此 OpenClaw 将它们作为带有 `disable-model-invocation: true` 的技能导入。如果您希望代理自动调用这些技能，请编辑每个技能的 frontmatter。</Accordion>
</AccordionGroup>

## 相关

- [`openclaw migrate`](/zh/cli/migrate)：完整的 CLI 参考、插件契约和 JSON 形状。
- [迁移指南](/zh/install/migrating)：所有迁移路径。
- [从 Hermes 迁移](/zh/install/migrating-hermes)：另一种跨系统导入路径。
- [新手引导](/zh/cli/onboard)：向导流程和非交互式标志。
- [Doctor](/zh/gateway/doctor)：迁移后的健康检查。
- [代理工作区](/zh/concepts/agent-workspace)：`AGENTS.md`、`USER.md` 和技能的所在地。
