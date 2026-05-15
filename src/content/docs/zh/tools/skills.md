---
summary: "Skills：托管 vs 工作区，准入规则，代理允许列表以及配置连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw 使用与 **[AgentSkills](OpenClawhttps://agentskills.io) 兼容**的技能文件夹来教代理如何使用工具。每个技能都是一个包含 `SKILL.md`OpenClaw 的目录，其中包含 YAML 前置数据和指令。OpenClaw 加载捆绑的技能以及可选的本地覆盖项，并根据环境、配置和二进制文件的存在情况在加载时进行过滤。

## 位置和优先级

OpenClaw 从这些来源加载技能，**优先级从高到低**：

| #   | 来源           | 路径                            |
| --- | -------------- | ------------------------------- |
| 1   | 工作区技能     | `<workspace>/skills`            |
| 2   | 项目代理技能   | `<workspace>/.agents/skills`    |
| 3   | 个人代理技能   | `~/.agents/skills`              |
| 4   | 托管/本地技能  | `~/.openclaw/skills`            |
| 5   | 捆绑技能       | 随安装附带的                    |
| 6   | 额外技能文件夹 | `skills.load.extraDirs`（配置） |

如果技能名称冲突，则优先级最高的来源获胜。

Codex CLI 的原生 CLI`$CODEX_HOME/skills`OpenClawCLI 目录不是这些 OpenClaw 技能根目录之一。在 Codex harness 模式下，本地应用服务器启动使用隔离的每代理 Codex 主目录，因此不会隐式加载个人 Codex CLI 技能。使用 `openclaw migrate codex --dry-run` 列出它们，并使用 `openclaw migrate codex`OpenClaw 通过交互式复选框提示选择技能目录，然后再将其复制到当前的 OpenClaw 代理工作区。对于非交互式运行，请为要复制的确切技能重复 `--skill <name>`。

## 每代理与共享技能

在**多代理**设置中，每个代理都有自己的工作区：

| 范围          | 路径                                  | 可见对象           |
| ------------- | ------------------------------------- | ------------------ |
| 每代理        | `<workspace>/skills`                  | 仅该代理           |
| 项目代理      | `<workspace>/.agents/skills`          | 仅该工作区的代理   |
| 个人代理      | `~/.agents/skills`                    | 该机器上的所有代理 |
| 共享托管/本地 | `~/.openclaw/skills`                  | 该机器上的所有代理 |
| 共享额外目录  | `skills.load.extraDirs`（优先级最低） | 该机器上的所有代理 |

在多个位置存在同名 → 最高源获胜。工作区胜过项目代理，胜过个人代理，胜过托管/本地，胜过捆绑，胜过额外目录。

## 代理技能允许列表

技能**位置**和技能**可见性**是单独的控制项。位置/优先级决定同名技能的哪个副本获胜；代理允许列表决定代理实际可以使用哪些技能。

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
  <Accordion title="Allowlist rules">- 默认情况下省略 `agents.defaults.skills` 以获取不受限的技能。 - 省略 `agents.list[].skills` 以继承 `agents.defaults.skills`。 - 设置 `agents.list[].skills: []` 表示无技能。 - 非空的 `agents.list[].skills` 列表是该智能体的**最终**集合 —— 它不会与默认值合并。 - 生成的允许列表适用于提示构建、技能斜杠命令发现、沙盒同步和技能快照。</Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来附带自己的技能。插件技能会在插件启用时加载。这是放置特定工具操作指南的合适位置，这些指南对于工具描述来说太长，但只要安装了插件就应该可用 —— 例如，浏览器插件附带了一个用于多步浏览器控制的 `browser-automation` 技能。

插件技能目录被合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的捆绑、托管、智能体或工作区技能会覆盖它们。你可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来控制它们。

有关发现/配置，请参阅 [插件](/zh/tools/plugin)；有关这些技能所教授的工具界面，请参阅 [工具](/zh/tools)。

## 技能车间

可选的实验性 **技能车间 (Skill Workshop)** 插件可以根据智能体工作期间观察到的可重用过程来创建或更新工作区技能。它默认处于禁用状态，必须通过 `plugins.entries.skill-workshop` 显式启用。

技能车间仅写入 `<workspace>/skills`，扫描生成的内容，支持待审批或自动安全写入，隔离不安全的提议，并在成功写入后刷新技能快照，以便新技能在无需重启 Gateway(网关) 的情况下变为可用。

将其用于更正，例如*“下次验证 GIF 来源”*，或来之不易的工作流程，例如媒体 QA 检查清单。先以待审批开始；仅在审查其建议后在受信任的工作空间中使用自动写入。完整指南：[Skill Workshop 插件](/zh/plugins/skill-workshop)。

## ClawHub（安装和同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公共技能注册表。使用原生 `openclaw skills` 命令进行发现/安装/更新，或使用单独的 `clawhub` CLI 进行发布/同步工作流。完整指南：[ClawHub](/zh/clawhub)。

| 操作                    | 命令                                   |
| ----------------------- | -------------------------------------- |
| 将技能安装到工作空间    | `openclaw skills install <skill-slug>` |
| 更新所有已安装的技能    | `openclaw skills update --all`         |
| 同步（扫描 + 发布更新） | `clawhub sync --all`                   |

原生 `openclaw skills install` 安装到活动工作空间
`skills/` 目录中。单独的 `clawhub` CLI 也会安装到
当前工作目录下的 `./skills` 中（或者回退到
配置的 OpenClaw 工作空间）。OpenClaw 会将其作为
`<workspace>/skills` 在下一次会话中拾取。
配置的技能根目录也支持一个分组级别，例如
`skills/<group>/<skill>/SKILL.md`，因此相关的第三方技能可以
保存在共享文件夹下，而无需进行广泛的递归扫描。

需要私有、非ClawHub交付的Gateway(网关)客户端可以使用 Gateway(网关)ClawHub`skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 准备zip技能归档，然后使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安装已提交的上传内容。这是针对受信任客户端的显式管理员上传路径，而非正常的 `openclaw skills install <slug>`ClawHub 或 ClawHub 安装流程。默认情况下此功能关闭，仅在 `openclaw.json` 中设置了 `skills.install.allowUploadedArchives: true` 时才有效。上传模式仍然会安装到默认的代理工作区 `skills/<slug>` 目录；归档的内部文件夹名称在最终安装目标中被忽略。

ClawHub 技能页面会在安装前暴露最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的扫描器详情页面。ClawHub`openclaw skills install <slug>`ClawHub 仍然只是安装路径；发布者通过 ClawHub 仪表板或 `clawhub skill rescan <slug>` 恢复误报。

## 安全

<Warning>将第三方技能视为**不受信任的代码**。在启用之前请阅读它们。对于不受信任的输入和风险工具，首选沙箱隔离运行。有关代理端控制，请参阅[沙箱隔离](/zh/gateway/sandboxing)。</Warning>

- 工作区和额外目录技能发现仅接受已解析的真实路径保持在配置根目录内的技能根目录和 `SKILL.md` 文件。
- Gateway(网关)私有归档安装默认处于关闭状态。当明确启用时，它们需要包含 Gateway(网关)`SKILL.md`ClawHub 的已提交 zip 上传，并复用与 ClawHub 技能安装相同的归档提取、路径遍历、符号链接、强制和回滚保护。它们受 `skills.install.allowUploadedArchives`ClawHub 限制；正常的 ClawHub 安装不需要该设置。
- Gateway(网关)支持的后端技能依赖安装（Gateway(网关)`skills.install`、新手引导和 Skills 设置 UI）会在执行安装器元数据之前运行内置的危险代码扫描器。默认情况下，`critical` 的发现会阻止操作，除非调用者明确设置了危险覆盖；可疑的发现仍然仅发出警告。
- `openclaw skills install <slug>`ClawHub 则不同——它将 ClawHub 技能文件夹下载到工作区中，并且不使用上述的安装器元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会将该智能体轮次的机密信息注入到 **宿主** 进程中（而非沙盒内）。请勿将机密信息放入提示词和日志中。

有关更广泛的威胁模型和检查清单，请参阅 [Security](/zh/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClow 遵循 AgentSkills 规范以进行布局/意图定义。嵌入式智能体使用的解析器仅支持**单行** frontmatter 键；OpenClaw`metadata` 应该是一个**单行 JSON 对象**。在指令中使用 `{baseDir}` 来引用技能文件夹路径。

### 可选的 frontmatter 键

<ParamField path="homepage" type="string"macOS>
  在 macOS Skills UI 中显示为“Website”的 URL。也支持通过 `metadata.openclaw.homepage` 使用。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  当 `true` 时，该技能作为用户斜杠命令暴露。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  当 `true`OpenClaw 时，OpenClaw 会将技能的指令排除在 agent 的常规提示之外。该技能仍然已安装，并且当 `user-invocable` 也为 `true` 时，仍可以作为斜杠命令显式运行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令将绕过模型并直接分派到工具。
</ParamField>
<ParamField path="command-tool" type="string">
  设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具分派，将原始参数字符串转发给工具（无核心解析）。该工具使用 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 调用。
</ParamField>

## 筛选（加载时过滤器）

OpenClaw 在加载时使用 OpenClaw`metadata`（单行 JSON）筛选技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的字段：

<ParamField path="always" type="boolean">
  当 `true` 时，始终包含该 skill（跳过其他筛选条件）。
</ParamField>
<ParamField path="emoji" type="string"macOS>
  macOS Skills UI 使用的可选 emoji。
</ParamField>
<ParamField path="homepage" type="string"macOS>
  在 macOS Skills UI 中显示为“Website”的可选 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  可选的平台列表。如果设置了，该 skill 仅在这些操作系统上可用。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每一项都必须存在于 `PATH` 中。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少有一项必须存在于 `PATH` 中。
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
  macOS Skills UI 使用的可选安装程序规范（brew/node/go/uv/download）。
</ParamField>

如果不存在 `metadata.openclaw`，则该 skill 始终可用（除非在配置中禁用或被捆绑 skills 的 `skills.allowBundled` 阻止）。

<Note>当缺少 `metadata.openclaw` 时，仍接受旧的 `metadata.clawdbot` 块，因此旧安装的 skills 会保留其依赖筛选条件和安装程序提示。新 skills 和更新的 skills 应使用 `metadata.openclaw`。</Note>

### 沙箱隔离说明

- `requires.bins` 在 skill 加载时于**主机**上进行检查。
- 如果 agent 处于沙箱隔离状态，二进制文件也必须存在于**容器内部**。通过 `agents.defaults.sandbox.docker.setupCommand` （或自定义镜像）安装它。`setupCommand` 在容器创建后运行一次。软件包安装还需要网络出口、可写的根文件系统以及沙箱中的 root 用户。
- 示例：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙箱容器中安装 `summarize` CLI 才能在此运行。

### 安装程序规范

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="安装程序选择规则">
    - 如果列出了多个安装程序，网关会选择一个首选选项（可用时选择 brew，否则选择 node）。
    - 如果所有安装程序都是 `download`，OpenClaw 会列出每个条目，以便您查看可用的构件。
    - 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
    - Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。这仅影响技能安装；Gateway(网关) 运行时仍应为 Node - 不推荐将 Bun 用于 WhatsApp/Telegram。
    - Gateway(网关) 支持的安装程序选择是偏好驱动的：当安装规范混合类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 优先选择 Homebrew，然后是 `uv`，接着是配置的 node 管理器，最后是 `go` 或 `download` 等其他回退选项。
    - 如果每个安装规范都是 `download`，OpenClaw 将显示所有下载选项，而不是折叠为一个首选安装程序。

  </Accordion>
  <Accordion title="Per-installer details">
    - **Go 安装：** 如果 `go` 缺失且 `brew` 可用，网关会首先通过 Homebrew 安装 Go，并在可能的情况下将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **下载安装：** `url`（必需）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认：检测到归档时为 auto）、`stripComponents`、`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

  </Accordion>
</AccordionGroup>

## 配置覆盖

可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切换捆绑和托管的技能，并为它们提供环境变量值：

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
  `false` 会禁用该技能，即使它是捆绑或已安装的。 捆绑的 `coding-agent` 技能是选择加入的：在将其暴露给代理之前 请设置 `skills.entries.coding-agent.enabled: true`，然后确保 `claude`、`codex`、`opencode` 或 `pi` 之一已安装并 通过其自身的 CLI 进行了身份验证。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  针对声明了 `metadata.openclaw.primaryEnv` 的技能的便利设置。支持纯文本或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  仅在进程中尚未设置该变量时才注入。
</ParamField>
<ParamField path="config" type="object">
  用于自定义每个技能字段的可选包。自定义键必须位于此处。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  **仅**针对**捆绑**技能的可选允许列表。如果设置，则只有列表中的捆绑技能符合条件（托管/工作区技能不受影响）。
</ParamField>

如果技能名称包含连字符，请给键加上引号（JSON5 允许带引号的键）。配置键默认匹配 **技能名称** - 如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

<Note>对于 OpenClaw 内置的图像生成/编辑，请使用核心 OpenClaw`image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不是捆绑技能。此处的技能示例适用于自定义或第三方工作流。对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。如果您选择 `openai/*`、`google/*`、`fal/*`API 或其他特定提供商的图像模型，请也添加该提供商的 auth/API 密钥。</Note>

## 环境注入

当代理运行开始时，OpenClaw：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用于 `process.env`。
3. 使用 **符合资格** 的技能构建系统提示。
4. 运行结束后恢复原始环境。

环境注入 **仅限于代理运行**，而不是全局 shell 环境。

对于捆绑的 `claude-cli`OpenClaw 后端，OpenClaw 还会将同一符合条件的快照实例化为临时的 Claude Code 插件，并通过 `--plugin-dir`OpenClaw 传递它。Claude Code 随后可以使用其原生技能解析器，而 OpenClaw 仍然拥有优先权、按代理允许列表、门控和 `skills.entries.*`APICLI env/API 密钥注入。其他 CLI 后端仅使用提示目录。

## 快照与刷新

OpenClaw 会在 **会话开始时** 对符合条件的技能进行快照，并在同一会话的后续轮次中重用该列表。对技能或配置的更改将在下一个新会话中生效。

技能可以在会话中期通过以下两种情况刷新：

- 启用了技能监视器。
- 出现新的符合条件的远程节点。

可以将此视为一种 **热重载**：刷新后的列表将在下一个代理轮次中被获取。如果该会话的有效代理 Skills 允许列表发生变化，OpenClaw 会刷新快照，以确保可见的 Skills 与当前代理保持一致。

### Skills 监视器

默认情况下，OpenClaw 会监视 Skills 文件夹，并在 `SKILL.md` 文件更改时更新 Skills 快照。在 `skills.load` 下进行配置：

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

对于有意的同级仓库布局（其中内置 Skills 根目录包含符号链接），请使用 `allowSymlinkTargets`，例如 `~/.agents/skills/manager -> ~/Projects/manager/skills`。目标列表是在解析 realpath 之后匹配的，并且应保持狭窄。

### 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 运行在 Linux 上，但连接了 **macOS 节点**且允许 `system.run`（Exec 批准安全性未设置为 `deny`），则当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的 Skills 视为可用。代理应通过带有 `host=node` 的 `exec` 工具来执行这些 Skills。

这依赖于节点报告其命令支持以及通过 `system.which` 或 `system.run` 进行的二进制探测。离线节点 **不会** 使仅限远程的 Skills 可见。如果连接的节点停止响应二进制探测，OpenClaw 将清除其缓存的二进制匹配项，以便代理不再看到目前无法在该处运行的 Skills。

## Token 影响

当 Skills 符合条件时，OpenClaw 会将可用 Skills 的紧凑 XML 列表注入系统提示中（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是确定性的：

- **基本开销**（仅当 ≥1 个 Skills 时）：195 个字符。
- **每个 Skill**：97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），
从而增加了长度。Token 计数因模型的分词器而异。粗略的
OpenAI 风格估计约为每 token 4 个字符，因此每个 Skill
加上您的实际字段长度约为 **97 个字符 ≈ 24 个 token**。

## 受管 Skills 生命周期

OpenClaw 在安装时（npm 包或 OpenClaw.app）附带了一组基准 **bundled skills**。
`~/.openclaw/skills` 用于本地覆盖——例如，在不更改 bundled copy 的情况下
固定或修补 skill。Workspace skills 归用户所有，并且在名称冲突时
会覆盖前两者。

## 寻找更多 Skills？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置
架构：[Skills config](/zh/tools/skills-config)。

## 相关

- [ClawHub](/zh/clawhub) - 公共 Skills 注册表
- [Creating skills](/zh/tools/creating-skills) - 构建自定义 Skills
- [Plugins](/zh/tools/plugin) - 插件系统概述
- [Skill Workshop plugin](/zh/plugins/skill-workshop) - 从 Agent 工作中生成 Skills
- [Skills config](/zh/tools/skills-config) - Skills 配置参考
- [Slash commands](/zh/tools/slash-commands) - 所有可用的斜杠命令
