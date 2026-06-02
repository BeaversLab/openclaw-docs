---
summary: "Skills：托管与工作区、准入规则、代理允许列表以及配置连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw 使用与 **[AgentSkills](OpenClawhttps://agentskills.io) 兼容** 的 skill 文件夹来教代理如何使用工具。每个 skill 是一个包含 `SKILL.md`OpenClaw 的目录，其中带有 YAML frontmatter 和指令。OpenClaw 加载捆绑的 skills 以及可选的本地覆盖，并在加载时根据环境、配置和二进制文件的存在对其进行过滤。

## 位置和优先级

OpenClaw 从这些来源加载技能，**优先级从高到低**：

| #   | 来源           | 路径                             |
| --- | -------------- | -------------------------------- |
| 1   | 工作区技能     | `<workspace>/skills`             |
| 2   | 项目代理技能   | `<workspace>/.agents/skills`     |
| 3   | 个人代理技能   | `~/.agents/skills`               |
| 4   | 托管/本地技能  | `~/.openclaw/skills`             |
| 5   | 捆绑技能       | 随安装附带的                     |
| 6   | 额外技能文件夹 | `skills.load.extraDirs` (config) |

如果技能名称冲突，则优先级最高的来源获胜。

Skill 根目录可以使用文件夹进行组织。当在配置的 skills 根目录下出现 `SKILL.md` 时，系统会发现一个 skill，因此以下两种情况均有效：

```text
<workspace>/skills/research/SKILL.md
<workspace>/skills/personal/research/SKILL.md
```

文件夹路径仅用于组织。skill 的可见名称、斜杠命令和允许列表键来自 `SKILL.md` frontmatter `name`（当缺少 `name` 时则来自 skill 目录名称），因此具有 `name: research` 的嵌套 skill 仍然作为 `/research` 调用，而不是 `/personal/research`。

Codex CLI 的原生 CLI`$CODEX_HOME/skills`OpenClaw 目录不是这些 OpenClaw
技能根目录之一。在 Codex harness 模式下，本地应用服务器启动使用隔离的
按代理分组的 Codex 主目录，因此操作员个人 `~/.codex/skills` 中的技能
不会被隐式加载。Codex 原生 `.agents` 发现机制单独使用继承的
`HOME`OpenClaw；上述 OpenClaw 自己的技能根目录已包含
`~/.agents/skills`。使用 `openclaw migrate plan codex` 列出 Codex 主目录中的技能，
然后使用 `openclaw migrate codex`OpenClaw 通过交互式复选框提示选择技能目录，再将它们复制到当前的 OpenClaw 代理工作区中。
对于非交互式运行，为要复制的确切技能重复 `--skill <name>`。

## Per-agent vs shared skills

在 **多代理 (multi-agent)** 设置中，每个代理都有自己的工作区：

| 范围 (Scope)         | 路径 (Path)                           | 可见对象 (Visible to) |
| -------------------- | ------------------------------------- | --------------------- |
| Per-agent            | `<workspace>/skills`                  | 仅该代理              |
| Project-agent        | `<workspace>/.agents/skills`          | 仅该工作区的代理      |
| Personal-agent       | `~/.agents/skills`                    | 该机器上的所有代理    |
| Shared managed/local | `~/.openclaw/skills`                  | 该机器上的所有代理    |
| Shared extra dirs    | `skills.load.extraDirs`（优先级最低） | 该机器上的所有代理    |

同名在多个位置 → 最高来源胜出。Workspace 胜过 project-agent，胜过 personal-agent，胜过 managed/local，胜过 bundled，胜过 extra dirs。

## Agent skill allowlists

技能 **位置 (location)** 和技能 **可见性 (visibility)** 是独立的控制项。位置/优先级决定同名技能的哪个副本胜出；代理允许列表 决定代理实际可以使用哪些技能。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="Allowlist rules">- 默认情况下，省略 `agents.defaults.skills` 表示不受限制的技能。 - 省略 `agents.list[].skills` 以继承 `agents.defaults.skills`。 - 设置 `agents.list[].skills: []` 表示不使用任何技能。 - 非空的 `agents.list[].skills` 列表是该代理的 **最终** 集合 - 它不会与默认值合并。 - 有效的允许列表适用于提示构建、技能斜杠命令发现、沙盒同步和技能快照。</Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来提供自己的技能。插件在启用时加载其技能。这是放置工具专用操作指南的合适位置，这些指南对于工具描述来说太长，但应在安装插件时随时可用 - 例如，浏览器插件提供了一个用于多步浏览器控制的 `browser-automation` 技能。

插件技能目录被合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的捆绑、托管、代理或工作区技能会覆盖它们。您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来限制它们。

有关发现/配置，请参阅 [Plugins](/zh/tools/plugin)；有关这些技能所教的工具接口，请参阅 [Tools](/zh/tools)。

## Skill Workshop 提案

Skill Workshop 提案是用于创建或更新工作区技能的持久草稿，无需静默修改活动 `SKILL.md`OpenClaw 文件。OpenClaw 将它们存储在：

```text
<OPENCLAW_STATE_DIR>/skill-workshop/
  proposals.json
  proposals/<proposal-id>/
    proposal.json
    PROPOSAL.md
    references/
    scripts/
    rollback.json
```

默认状态目录是 `~/.openclaw`。

`proposal.json` 是规范的提案记录。`proposals.json` 是快速列表清单，当缺失或陈旧时可以从提案文件夹重建。`PROPOSAL.md` 使用 `status: proposal`、`version: v1` 和 `date` 明确标记草稿内容；这些仅限提案的字段在提案作为活动 `SKILL.md` 应用时会被剥离。

提案正文遵循 `skills.workshop.maxSkillBytes`，提案描述限制为 160 字节，因为它们可能出现在发现和列表输出中。

提案文件夹还可以在 `assets/`、`examples/`、`references/`、`scripts/` 或 `templates/`OpenClaw 下携带支持文件。OpenClaw 在 `proposal.json` 中记录支持文件元数据，将文件内容存储在 `PROPOSAL.md` 旁边，随提案扫描它们，并在应用前验证其哈希值。批准的支持文件将写入 `SKILL.md` 旁边的活动技能目录中。

只有待处理的提案才能被修订或应用。修订会保持相同的提案 ID，递增提案版本，刷新提案日期，重新运行扫描器元数据，并保留现有的支持文件，除非提供了新的支持文件列表。应用操作会将内容写入选定的工作区 `skills/` 根目录，运行技能扫描器，写入回滚元数据，拒绝覆盖现有的创建目标，并在目标技能自提案创建以来发生变化时将更新提案标记为过时。拒绝和隔离仅更新提案元数据；它们不会触及活动技能。

使用 CLI 进行操作员审查：

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id>
openclaw skills workshop quarantine <proposal-id>
```

当 Agent 识别到值得重用的工作时，可以通过 `skill_workshop` 工具起草提案，并可以在审查期间修订待处理的提案。当用户明确要求批准/使用/应用、拒绝或隔离特定提案时，该工具可以通过 Skill Workshop 执行该生命周期操作，而不是通过 shell 或直接更改文件系统。

## ClawHub（安装和同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公共技能注册表。使用原生 `openclaw skills` 命令进行发现/安装/更新，或使用单独的 `clawhub` CLI 进行发布/同步工作流。完整指南：[ClawHub](/zh/clawhub)。

| 操作                        | 命令                                                   |
| --------------------------- | ------------------------------------------------------ |
| 将 ClawHub 技能安装到工作区 | `openclaw skills install <skill-slug>`                 |
| 将 Git 技能安装到工作区     | `openclaw skills install git:owner/repo@ref`           |
| 将本地技能安装到工作区      | `openclaw skills install ./path/to/skill --as my-tool` |
| 为所有本地 Agent 安装技能   | `openclaw skills install <skill-slug> --global`        |
| 更新所有工作区安装的技能    | `openclaw skills update --all`                         |
| 更新单个共享托管技能        | `openclaw skills update <skill-slug> --global`         |
| 更新所有共享托管/本地技能   | `openclaw skills update --all --global`                |
| 验证 ClawHub 技能           | `openclaw skills verify <skill-slug>`                  |
| 打印生成的技能卡片          | `openclaw skills verify <skill-slug> --card`           |
| 同步（扫描 + 发布更新）     | `clawhub sync --all`                                   |

原生 `openclaw skills install` 默认安装到活动工作区
`skills/` 目录中。添加 `--global` 以安装到共享
托管/本地目录（默认为 `~/.openclaw/skills`），除非代理技能允许列表限制了可见性，否则
所有本地代理都可以看到该目录。独立的
`clawhub`CLI CLI 也会安装到当前工作目录下的
`./skills` 中（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次
会话时将其作为 `<workspace>/skills` 获取。
配置的技能根目录也支持分组布局，例如
`skills/<group>/<skill>/SKILL.md`，因此相关的第三方技能可以
保留在共享文件夹下，而无需进行广泛的递归扫描。分组时使用平坦的 frontmatter
名称，例如 `skills/imported/research/SKILL.md` 配合
`name: research`。

Git 和本地目录安装期望在源根目录有一个 `SKILL.md`。
安装 slug 来自 `SKILL.md` frontmatter `name`（当它是有效的 slug 时），
然后回退到源目录或存储库名称。使用 `--as <slug>` 来
覆盖推断出的 slug。`--version` 仅适用于 ClawHub 安装。技能
安装不支持 npm 包规范或 zip/归档路径。`openclaw skills
update` 仅更新 ClawHub 跟踪的安装；重新安装 Git 或本地源以
刷新它们。

使用 `openclaw skills verify <slug>`ClawHub 向 ClawHub 请求该技能的 `clawhub.skill.verify.v1` 信任包络。默认输出为 JSON；使用 `--card`ClawHub 打印生成的技能卡片 Markdown。已安装的 ClawHub 技能会根据 `.clawhub/origin.json` 中记录的版本和注册表进行验证；`--version` 和 `--tag`ClawHub 仅覆盖版本选择器。当 ClawHub 将验证标记为失败时，该命令以非零状态退出。生成的 `skill-card.md`OpenClawClawHub 可能存在于已安装的包中，但 OpenClaw 将其视为 ClawHub 提供的元数据，不将其用作本地模型指令或本地哈希门控。

需要私有、非 ClawHub 交付的 Gateway(网关) 客户端可以使用 Gateway(网关)ClawHub`skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 暂存 zip 技能存档，然后使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安装提交的上传内容。这是受信任客户端的显式管理员上传路径，而不是正常的 `openclaw skills install <slug>`ClawHub 或 ClawHub 安装流程。默认情况下它是关闭的，并且仅在 `openclaw.json` 中设置了 `skills.install.allowUploadedArchives: true` 时才有效。上传模式仍然安装到默认的代理工作区 `skills/<slug>` 目录中；存档的内部文件夹名称对于最终安装目标将被忽略。

ClawHub 技能页面在安装前会公开最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的扫描器详细信息页面。ClawHub`openclaw skills install <slug>`ClawHub 仍然只是安装路径；发布者通过 ClawHub 仪表板或 `clawhub skill rescan <slug>` 恢复误报。

## 安全

<Warning>将第三方技能视为**不受信任的代码**。在启用之前请阅读它们。对于不受信任的输入和有风险的工具，请优先使用沙箱隔离运行。有关代理端控制，请参阅[沙箱隔离](/zh/gateway/sandboxing)。</Warning>

- 工作区、项目代理和额外目录的技能发现仅接受其解析后的真实路径位于配置根目录内的技能根目录，除非 `skills.load.allowSymlinkTargets` 显式信任目标根目录。捆绑技能始终保持在内部。托管 `~/.openclaw/skills` 和个人 `~/.agents/skills`ClawHub 根目录可能包含由 ClawHub 或其他本地技能管理器安装的符号链接技能文件夹，但每个 `SKILL.md` 的真实路径仍必须保留在其解析后的技能目录内。
- 嵌套发现是有界的。OpenClaw 扫描技能根目录下的分组技能文件夹，例如 OpenClaw`<workspace>/skills`、`<workspace>/.agents/skills`、`~/.agents/skills` 和 `~/.openclaw/skills`，但会跳过隐藏目录、`node_modules`、过大的 `SKILL.md` 文件、已转义的符号链接以及异常大的目录树。
- Gateway 私有归档安装默认处于关闭状态。显式启用时，它们要求上传包含 Gateway(网关)`SKILL.md`ClawHub 的已提交 zip 包，并复用与 ClawHub 技能安装相同的归档提取、路径遍历、符号链接、强制执行和回滚保护机制。它们受 `skills.install.allowUploadedArchives`ClawHub 限制；正常的 ClawHub 安装不需要该设置。
- Gateway 支持的技能依赖安装（Gateway(网关)`skills.install`、新手引导和 Skills 设置 UI）在执行安装程序元数据之前运行内置的危险代码扫描器。`critical` 发现默认会阻止安装，除非调用方显式设置了危险覆盖；可疑发现仅会发出警告。
- `openclaw skills install <slug>`ClawHub 则不同 — 它将 ClawHub 技能文件夹下载到工作区，或者使用 `--global` 下载到共享的托管/本地技能中，并且不使用上述安装程序元数据路径。Git 和本地目录安装将受信任的 `SKILL.md` 目录复制到同一技能根目录，但不由 `openclaw skills update` 跟踪。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将密钥注入到该代理轮次的 **主机** 进程中（而非沙盒）。请勿在提示词和日志中包含密钥。

有关更广泛的威胁模型和检查清单，请参阅[安全](/zh/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 规范进行布局/意图定义。嵌入式代理使用的解析器仅支持**单行** frontmatter 键；`metadata` 应为**单行 JSON 对象**。在指令中使用 `{baseDir}` 来引用技能文件夹路径。

### 可选 frontmatter 键

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的 URL。也可以通过 `metadata.openclaw.homepage` 支持。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  当 `true` 时，该技能将作为用户斜杠命令公开。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  当 `true` 时，OpenClaw 会将该技能的指令排除在代理的正常
  提示词之外。该技能仍会被安装，并且当 `user-invocable` 也为 `true` 时，
  仍可作为斜杠命令显式运行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令将绕过模型并直接调度到工具。
</ParamField>
<ParamField path="command-tool" type="string">
  当设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具调度，将原始参数字符串转发给工具（无核心解析）。该工具使用 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 调用。
</ParamField>

## 门控（加载时过滤器）

OpenClaw 在加载时使用 OpenClaw`metadata`（单行 JSON）过滤 Skills：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的字段：

<ParamField path="always" type="boolean">
  当为 `true` 时，始终包含该 skill（跳过其他条件）。
</ParamField>
<ParamField path="emoji" type="string"macOS>
  由 macOS Skills UI 使用的可选表情符号。
</ParamField>
<ParamField path="homepage" type="string"macOS>
  在 macOS Skills UI 中显示为“Website”的可选 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  可选的平台列表。如果设置，该 skill 仅在这些操作系统上可用。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每一个都必须存在于 `PATH` 上。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少有一个必须存在于 `PATH` 上。
</ParamField>
<ParamField path="requires.env" type="string[]">
  环境变量必须存在或在配置中提供。
</ParamField>
<ParamField path="requires.config" type="string[]">
  必须为真值的 `openclaw.json` 路径列表。
</ParamField>
<ParamField path="primaryEnv" type="string">
  与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
</ParamField>
<ParamField path="install" type="object[]"macOS>
  由 macOS Skills UI 使用的可选安装程序规格（brew/node/go/uv/download）。
</ParamField>

如果不存在 `metadata.openclaw`，该 skill 始终可用（除非
在配置中禁用或对于内置 skill 被 `skills.allowBundled` 阻止）。

<Note>当 `metadata.openclaw` 缺失时，仍然接受旧版 `metadata.clawdbot` 块，因此较早安装的 skills 会保留其 依赖条件和安装程序提示。新Skills和更新的 skills 应使用 `metadata.openclaw`。</Note>

### 沙箱隔离说明

- 在技能加载时，会在 **主机** 上检查 `requires.bins`。
- 如果代理是沙箱隔离的，则二进制文件也必须存在于 **容器内部**。通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）进行安装。`setupCommand` 在容器创建后运行一次。软件包安装还需要网络出站访问、可写的根文件系统以及沙箱中的 root 用户。
- 例如：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要在沙箱容器中拥有 `summarize` CLI 才能在此运行。

### 安装程序规范

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="Installer selection rules">
    - 如果列出了多个安装程序，网关会选择一个首选选项（如果可用则为 brew，否则为 node）。
    - 如果所有安装程序都是 `download`OpenClaw，OpenClaw 会列出每个条目，以便您查看可用的构件。
    - 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
    - Node 安装遵循 `openclaw.json`npmnpmGateway(网关)BunWhatsAppTelegramGateway(网关)OpenClaw 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。这仅影响技能安装；Gateway(网关) 运行时仍应为 Node - 不建议在 WhatsApp/Telegram 上使用 Bun。
    - Gateway(网关) 支持的安装程序选择是偏好驱动的：当安装规范混合类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 优先选择 Homebrew，然后是 `uv`，接着是配置的 node 管理器，最后是其他回退选项，如 `go` 或 `download`。
    - 如果每个安装规范都是 `download`OpenClaw，OpenClaw 将显示所有下载选项，而不是合并为一个首选安装程序。

  </Accordion>
  <Accordion title="Per-installer details"OpenClawLinux>
    - **Homebrew 安装：** OpenClaw 不会自动安装 Homebrew，也不会将
      brew formulas 转换为系统包管理器命令。在没有 `brew` 的 Linux 容器中，
      新手引导会隐藏仅限 brew 的依赖项安装程序；请使用
      自定义镜像或在启用该技能之前手动安装依赖项。
    - **Go 安装：** 如果缺少 `go` 且有 `brew`，
      网关会先通过 Homebrew 安装 Go，并尽可能将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **下载安装：** `url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），
      `extract`（默认：检测到归档文件时为 auto），`stripComponents`，
      `targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

  </Accordion>
</AccordionGroup>

## 配置覆盖

可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切换内置和托管技能，并为其提供环境变量值：

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<ParamField path="enabled" type="boolean">
  `false` 禁用该技能，即使它是捆绑或已安装的。 捆绑的 `coding-agent` 技能是可选加入的：在将其暴露给代理之前设置 `skills.entries.coding-agent.enabled: true`，然后确保已安装并认证 `claude`、`codex`、`opencode` 或其他受支持的 CLI 以用于其自己的 CLI。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  为声明 `metadata.openclaw.primaryEnv` 的技能提供的便利。支持纯文本或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  仅当该变量尚未在进程中设置时才注入。
</ParamField>
<ParamField path="config" type="object">
  用于自定义每技能字段的可选包。自定义键必须位于此处。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  仅限 **bundled**（捆绑）技能的可选允许列表。如果设置，则列表中只有捆绑的技能符合条件（托管/工作区技能不受影响）。
</ParamField>

如果技能名称包含连字符，请用引号将该键括起来（JSON5 允许带引号的键）。配置键默认与 **skill name**（技能名称）匹配 - 如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

<Note>对于 OpenClaw 内部的常规图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不是捆绑的技能。此处的技能示例适用于自定义或第三方工作流。对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。如果您选择 `openai/*`、`google/*`、`fal/*` 或其他提供商特定的图像模型，请同时添加该提供商的 auth/API 密钥。</Note>

## 环境注入

当代理运行开始时，OpenClaw 会：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用于 `process.env`。
3. 使用**符合条件的**技能构建系统提示词。
4. 运行结束后恢复原始环境。

环境注入**仅限于代理运行**，而非全局 Shell 环境。

对于捆绑的 `claude-cli`OpenClaw 后端，OpenClaw 还将相同符合条件的快照实例化为临时 Claude Code 插件，并通过 `--plugin-dir`OpenClaw 传递它。Claude Code 随后可以使用其原生技能解析器，而 OpenClaw 仍拥有优先级、每个代理的允许列表、门控以及 `skills.entries.*`APICLI env/API 密钥注入的控制权。其他 CLI 后端仅使用提示词目录。

## 快照和刷新

OpenClaw 在**会话开始时**对符合条件的技能进行快照，并在同一会话的后续轮次中重用该列表。对技能或配置的更改将在下一个新会话中生效。

技能可以在以下两种情况下在会话中途刷新：

- 启用了技能监视器。
- 出现了新的符合条件的远程节点。

可以将此视为**热重载**：刷新后的列表将在下一个代理轮次中被获取。如果该会话的有效代理技能允许列表发生变化，OpenClaw 会刷新快照，以使可见技能与当前代理保持一致。

### 技能监视器

默认情况下，OpenClaw 会监视技能文件夹，并在 OpenClaw`SKILL.md` 文件更改时更新技能快照。在 `skills.load` 下进行配置：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

对于有意设计的工作区、项目代理或额外目录布局（其中技能根目录包含符号链接，例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`），请使用 `allowSymlinkTargets`。默认情况下，托管的 `~/.openclaw/skills` 和个人的 `~/.agents/skills` 可以遵循来自本地技能管理器的技能目录符号链接，但在 realpath 解析后仍会匹配目标列表，并且在配置时应保持范围狭窄。

监视器覆盖分组技能根目录下的嵌套 `SKILL.md` 文件。添加或
编辑 `skills/personal/foo/SKILL.md` 会刷新快照，其方式与
编辑 `skills/foo/SKILL.md` 相同。

### 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 运行在 Linux 上，但连接了一个 **macOS 节点**
并允许 `system.run`（未将 Exec approvals 安全设置为 `deny`），
当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。
代理应通过带有 `host=node` 的 `exec` 工具执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.which` 或
`system.run` 进行的二进制探测。离线节点**不会**
使仅限远程的技能可见。如果已连接的节点停止响应二进制
探测，OpenClaw 将清除其缓存的二进制匹配项，以便代理不再看到
当前无法在那里运行的技能。

## Token 影响

当技能符合条件时，OpenClaw 会将可用技能的紧凑 XML 列表注入到
系统提示中（通过 `session runtime` 中的
`formatSkillsForPrompt`）。成本是确定性的：

- **基本开销**（仅当 ≥1 个技能时）：195 个字符。
- **每个技能：**97 个字符 + XML 转义后的 `<name>`、`<description>` 和
  `<location>` 值的长度。

公式（字符）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），
从而增加了长度。Token 计数因模型分词器而异。一个粗略的
OpenAI 风格估计约为每 4 个字符/token，因此每个技能
**97 个字符 ≈ 24 个 token**，加上您的实际字段长度。

## 托管技能生命周期

OpenClaw 附带了一套基准 Skills 作为安装（npm 包或 OpenClaw.app）时的 **bundled skills**。OpenClawnpmOpenClaw`~/.openclaw/skills` 用于本地覆盖——例如，固定或修补某个 skill 而不更改捆绑的副本。Workspace skills 归用户所有，在名称冲突时会覆盖前两者。

## 想要更多 Skills？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置架构：[Skills config](/zh/tools/skills-config)。

## 相关

- [ClawHub](ClawHub/en/clawhub) - 公共 Skills 注册表
- [Creating skills](/zh/tools/creating-skills) - 构建自定义 Skills
- [Plugins](/zh/tools/plugin) - 插件系统概述
- [Skills config](/zh/tools/skills-config) - Skills 配置参考
- [Slash commands](/zh/tools/slash-commands) - 所有可用的斜杠命令
