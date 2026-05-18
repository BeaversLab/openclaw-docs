---
summary: "Skills：托管 vs 工作区，准入规则，代理允许列表以及配置连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw 使用与 **[AgentSkills](https://agentskills.io) 兼容**的技能
文件夹来教智能体如何使用工具。每个技能是一个目录，
包含一个带有 YAML 前置数据和指令的 `SKILL.md`。OpenClaw
加载捆绑的技能以及可选的本地覆盖，并在加载时
根据环境、配置和二进制文件存在情况对其进行过滤。

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

Codex CLI 的原生 `$CODEX_HOME/skills` 目录不是这些 OpenClaw 技能根目录之一。在 Codex 模式下，本地应用服务器启动使用隔离的每个代理 Codex 主目录，因此操作员个人 `~/.codex/skills` 中的技能不会被隐式加载。Codex 原生 `.agents` 发现单独使用继承的 `HOME`；OpenClaw 自己的上述技能根目录已经包含 `~/.agents/skills`。使用 `openclaw migrate codex --dry-run` 从 Codex 主目录清单技能，然后 `openclaw migrate codex` 使用交互式复选框提示选择技能目录，再将它们复制到当前的 OpenClaw 代理工作区。对于非交互式运行，请对要复制的确切技能重复 `--skill <name>`。

## 每代理与共享技能

在**多代理**设置中，每个代理都有自己的工作区：

| 范围          | 路径                                 | 可见对象           |
| ------------- | ------------------------------------ | ------------------ |
| 每代理        | `<workspace>/skills`                 | 仅该代理           |
| 项目代理      | `<workspace>/.agents/skills`         | 仅该工作区的代理   |
| 个人代理      | `~/.agents/skills`                   | 该机器上的所有代理 |
| 共享托管/本地 | `~/.openclaw/skills`                 | 该机器上的所有代理 |
| 共享额外目录  | `skills.load.extraDirs` (最低优先级) | 该机器上的所有代理 |

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
  <Accordion title="Allowlist rules">- 默认情况下省略 `agents.defaults.skills` 表示无限制的技能。 - 省略 `agents.list[].skills` 以继承 `agents.defaults.skills`。 - 设置 `agents.list[].skills: []` 表示没有任何技能。 - 非空的 `agents.list[].skills` 列表是该代理的 **最终** 集合 - 它不会与默认值合并。 - 生成的允许列表适用于提示构建、技能斜杠命令发现、沙盒同步和技能快照。</Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来提供其自身的技能。当插件启用时，插件技能即会被加载。这是放置特定于工具的操作指南的理想位置，这些指南对于工具描述来说太长，但应在插件安装后随时可用——例如，浏览器插件附带了一个 `browser-automation` 技能，用于多步浏览器控制。

插件技能目录被合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的内置、托管、代理或工作区技能会覆盖它们。您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来限制它们。

有关发现/配置，请参阅 [插件](/zh/tools/plugin)；有关这些技能所教授的工具界面，请参阅 [工具](/zh/tools)。

## 技能车间

可选的实验性 **Skill Workshop** 插件可以根据代理在操作中观察到的可重用过程，创建或更新工作区技能。默认情况下它是禁用的，必须通过 `plugins.entries.skill-workshop` 显式启用。

Skill Workshop 仅写入 `<workspace>/skills`，扫描生成的内容，支持待批准或自动安全写入，隔离不安全的建议，并在成功写入后刷新技能快照，以便新技能无需重启 Gateway(网关) 即可使用。

用于诸如 _"下次验证 GIF 归属"_ 的更正，或来之不易的工作流（如媒体 QA 检查清单）。从待批准开始；仅在审查其提议后，在受信任的工作区中使用自动写入。完整指南：[Skill Workshop 插件](/zh/plugins/skill-workshop)。

## ClawHub（安装和同步）

ClawHubhttps://clawhub.ai 是 OpenClaw 的公共技能注册表。
使用原生的 `openclaw skills` 命令进行发现/安装/更新，或者使用
独立的 `clawhub` CLI 进行发布/同步工作流。完整指南：
[ClawHub](/zh/clawhub)。

| 操作                    | 命令                                   |
| ----------------------- | -------------------------------------- |
| 将技能安装到工作空间    | `openclaw skills install <skill-slug>` |
| 更新所有已安装的技能    | `openclaw skills update --all`         |
| 同步（扫描 + 发布更新） | `clawhub sync --all`                   |

原生 `openclaw skills install` 会安装到活动工作区的
`skills/` 目录中。独立的 `clawhub` CLI 也会安装到当前工作目录下的
`./skills` 中（或者回退到配置的
OpenClaw 工作区）。OpenClaw 会在下一次会话中将其作为
`<workspace>/skills` 拾取。
配置的技能根目录也支持一层分组，例如
`skills/<group>/<skill>/SKILL.md`，这样相关的第三方技能就可以
保存在共享文件夹下，而无需进行广泛的递归扫描。

需要私有、非 ClawHub 交付方式的 Gateway(网关) 客户端可以使用 Gateway(网关)ClawHub`skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 暂存 zip 技能归档，然后使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安装已提交的上传内容。这是针对受信任客户端的显式管理员上传路径，而非正常的 `openclaw skills install <slug>`ClawHub 或 ClawHub 安装流程。此功能默认关闭，并且仅在 `openclaw.json` 中设置了 `skills.install.allowUploadedArchives: true` 时才有效。上传模式仍然会安装到默认代理工作区 `skills/<slug>` 目录；归档的内部文件夹名称在最终安装目标时会被忽略。

ClawHub 技能页面在安装前会显示最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的详细扫描页面。`openclaw skills install <slug>` 仍然只是安装路径；发布者可以通过 ClawHub 仪表板或 `clawhub skill rescan <slug>` 恢复误报。

## 安全

<Warning>将第三方技能视为**不受信任的代码**。在启用前请仔细阅读。 对于不受信任的输入和有风险的工具，请优先使用沙箱隔离运行。有关代理端控制的信息，请参阅[沙箱隔离](/zh/gateway/sandboxing)。</Warning>

- Workspace、project-agent 和 extra-dir 技能发现仅接受解析后的 realpath 保留在配置根目录内的技能根目录，除非 `skills.load.allowSymlinkTargets` 显式信任目标根目录。捆绑技能始终保持包含状态。受管理的 `~/.openclaw/skills` 和个人 `~/.agents/skills` 根目录可能包含由 ClawHub 或其他本地技能管理器安装的符号链接技能文件夹，但每个 `SKILL.md` 的 realpath 仍必须保留在其解析后的技能目录内。
- Gateway(网关) 私有归档安装默认处于关闭状态。显式启用时，它们需要上传一个包含 Gateway(网关)`SKILL.md`ClawHub 的已提交 zip 文件，并重用与 ClawHub 技能安装相同的归档提取、路径遍历、符号链接、强制和回滚保护措施。它们受 `skills.install.allowUploadedArchives`ClawHub 的限制；正常的 ClawHub 安装不需要该设置。
- Gateway(网关)支持的技能依赖项安装（Gateway(网关)`skills.install`、新手引导和 Skills 设置 UI）在执行安装程序元数据之前运行内置的危险代码扫描器。默认情况下，`critical` 的发现会阻止安装，除非调用者显式设置了危险覆盖；可疑的发现仍只会发出警告。
- `openclaw skills install <slug>` 是不同的 - 它将 ClawHub 技能文件夹下载到工作区中，并且不使用上述的 installer-metadata 路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将机密信息注入到该 agent 轮次的 **host** 进程中（而非沙盒）。请勿将机密信息包含在提示和日志中。

有关更广泛的威胁模型和检查清单，请参阅[安全性](/zh/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 规范来处理布局/意图。嵌入式代理使用的解析器仅支持**单行** frontmatter 键；`metadata` 应为**单行 JSON 对象**。在指令中使用 `{baseDir}` 来引用技能文件夹路径。

### 可选的 frontmatter 键

<ParamField path="homepage" type="string"macOS>
  在 macOS Skills UI 中显示为“Website”的 URL。也可通过 `metadata.openclaw.homepage` 支持。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  当 `true` 时，该技能作为用户斜杠命令公开。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  当 `true`OpenClaw 时，OpenClaw 会将该技能的指令排除在模型的常规提示之外。只要 `user-invocable` 也为 `true`，该技能仍会被安装，并且仍可作为斜杠命令显式运行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令将绕过模型并直接分发给工具。
</ParamField>
<ParamField path="command-tool" type="string">
  当设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具分发，将原始参数字符串转发给工具（无核心解析）。工具将使用 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 进行调用。
</ParamField>

## 筛选（加载时过滤器）

OpenClaw 在加载时使用 OpenClaw`metadata`（单行 JSON）过滤技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的字段：

<ParamField path="always" type="boolean">
  当为 `true` 时，始终包含该技能（跳过其他检查）。
</ParamField>
<ParamField path="emoji" type="string">
  由 macOS Skills UI 使用的可选表情符号。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的可选 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  平台的可选列表。如果设置，该技能仅在这些操作系统上可用。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每个都必须存在于 `PATH` 上。
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
<ParamField path="install" type="object[]">
  由 macOS Skills UI 使用的可选安装程序规范 (brew/node/go/uv/download)。
</ParamField>

如果不存在 `metadata.openclaw`，则该技能始终符合资格（除非在配置中被禁用或因捆绑技能被 `skills.allowBundled` 阻止）。

<Note>当缺少 `metadata.openclaw` 时，仍接受传统的 `metadata.clawdbot` 块，因此较旧的已安装技能会保留其依赖限制和安装提示。新技能和已更新的技能应使用 `metadata.openclaw`。</Note>

### 沙箱隔离说明

- 在技能加载时，会在**主机**上检查 `requires.bins`。
- 如果代理是沙箱隔离的，则二进制文件也必须存在于**容器内部**。可以通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）安装它。`setupCommand` 在容器创建后运行一次。软件包安装还需要网络出口、可写的根文件系统和沙箱中的 root 用户。
- 例如：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要沙箱容器中的 `summarize` CLI 才能在那里运行。

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
    - 如果列出了多个安装程序，Gateway（网关）将选择一个首选选项（如果有 brew 则优先，否则是 node）。
    - 如果所有安装程序都是 `download`OpenClaw，OpenClaw 会列出每个条目，以便您查看可用的构建产物。
    - 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
    - Node 安装会遵守 `skills.install.nodeManager` 在 `openclaw.json`npmnpmGateway(网关)BunWhatsAppTelegramGateway(网关)OpenClaw 中的设置（默认：npm；选项：npm/pnpm/yarn/bun）。这只影响技能的安装；Gateway（网关）运行时仍然应该是 Node —— 不建议对 WhatsApp/Telegram 使用 Bun。
    - 由 Gateway（网关）支持的安装程序选择是偏好驱动的：当安装规范混合了多种类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 会优先选择 Homebrew，然后是 `uv`，然后是配置的 node 管理器，最后是其他回退选项，如 `go` 或 `download`。
    - 如果每个安装规范都是 `download`OpenClaw，OpenClaw 将显示所有下载选项，而不是折叠为一个首选安装程序。

  </Accordion>
  <Accordion title="Per-installer details">
    - **Homebrew installs:** OpenClaw 不会自动安装 Homebrew 或将 brew 公式转换为系统包管理器命令。在没有 `brew` 的 Linux 容器中，新手引导会隐藏仅限 brew 的依赖安装程序；请使用自定义镜像或在启用该技能之前手动安装依赖。
    - **Go installs:** 如果 `go` 缺失且 `brew` 可用，网关会先通过 Homebrew 安装 Go 并尽可能将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **Download installs:** `url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到归档时为 auto），`stripComponents`，`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

  </Accordion>
</AccordionGroup>

## 配置覆盖

可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切换和提供打包及管理技能的环境变量值：

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
  `false` 禁用该技能，即使它是捆绑或已安装的。 捆绑的 `coding-agent` 技能是可选加入的：在将其暴露给 Agent 之前设置 `skills.entries.coding-agent.enabled: true`，然后确保 `claude`、`codex`、`opencode` 或 `pi`CLI 中的至少一个已安装并 为其自身的 CLI 完成身份验证。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  为声明 `metadata.openclaw.primaryEnv` 的技能提供便利。支持纯文本或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  仅当变量尚未在进程中设置时才注入。
</ParamField>
<ParamField path="config" type="object">
  用于自定义每技能字段的容器（可选）。自定义键必须位于此处。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  仅针对 **bundled**（捆绑）技能的可选允许列表。如果设置，则只有列表中的捆绑技能符合条件（托管/工作区技能不受影响）。
</ParamField>

如果技能名称包含连字符，请对键加引号（JSON5 允许加引号的键）。配置键默认匹配 **技能名称** - 如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

<Note>对于 OpenClaw 内的常规图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不要 使用捆绑的技能。此处的技能示例用于自定义或第三方 工作流。对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。如果您选择 `openai/*`、`google/*`、 `fal/*` 或其他特定于提供商的图像模型，请同时添加该提供商的 auth/API 密钥。</Note>

## 环境注入

当代理运行开始时，OpenClaw：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用于 `process.env`。
3. 使用 **符合资格** 的技能构建系统提示。
4. 运行结束后恢复原始环境。

环境注入 **仅限于代理运行**，而不是全局 shell 环境。

对于随附的 `claude-cli` 后端，OpenClaw 还会将相同的合格快照实例化为临时的 Claude Code 插件，并通过 `--plugin-dir` 传递它。Claude Code 随后可以使用其原生技能解析器，而 OpenClaw 仍然拥有优先权、每代理允许列表、门控以及 `skills.entries.*` 环境/API 密钥注入。其他 CLI 后端仅使用提示目录。

## 快照与刷新

OpenClaw 会在 **会话开始时** 对符合条件的技能进行快照，并在同一会话的后续轮次中重用该列表。对技能或配置的更改将在下一个新会话中生效。

技能可以在会话中期通过以下两种情况刷新：

- 启用了技能监视器。
- 出现新的符合条件的远程节点。

可以将此视为一种 **热重载**：刷新后的列表将在下一个代理轮次中被获取。如果该会话的有效代理 Skills 允许列表发生变化，OpenClaw 会刷新快照，以确保可见的 Skills 与当前代理保持一致。

### Skills 监视器

默认情况下，OpenClaw 会监视技能文件夹，并在 `SKILL.md` 文件更改时更新技能快照。在 `skills.load` 下进行配置：

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

对于包含符号链接（例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`）的有意设置的 workspace、project-agent 或 extra-dir 布局，请使用 `allowSymlinkTargets`。托管 `~/.openclaw/skills` 和个人 `~/.agents/skills` 默认可以跟随来自本地技能管理器的技能目录符号链接，但目标列表仍会在解析实际路径（realpath）后进行匹配，因此在配置时应保持狭窄范围。

### 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 运行在 Linux 上，但连接了一个 **macOS 节点** 且允许 `system.run`（执行批准安全性未设置为 `deny`），则当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。代理应通过 `exec` 工具并使用 `host=node` 来执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.which` 或 `system.run` 进行二进制探测。离线节点**不会**使仅限远程的技能可见。如果连接的节点停止响应二进制探测，OpenClaw 将清除其缓存的二进制匹配项，以便代理不再看到当前无法在那里运行的技能。

## Token 影响

当技能符合条件时，OpenClaw 会将可用技能的紧凑 XML 列表注入到系统提示中（通过 OpenClaw`formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是确定的：

- **基本开销**（仅当 ≥1 个 Skills 时）：195 个字符。
- **每个技能：** 97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），
从而增加长度。Token 计数因模型分词器而异。粗略的
OpenAI 风格估计约为每 Token 4 个字符，因此每个技能的 **97 个字符 ≈ 24 个 Token**，
加上您实际字段的长度。

## 受管 Skills 生命周期

OpenClaw 附带了一组基础技能，作为安装（npm 包或 OpenClaw.app）时的 **内置技能**。`~/.openclaw/skills` 用于本地覆盖——例如，固定或修补某个技能而不更改内置副本。工作区技能由用户拥有，在名称冲突时会覆盖两者。

## 寻找更多 Skills？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置架构：[Skills config](/zh/tools/skills-config)。

## 相关

- [ClawHub](ClawHub/en/clawhub) - 公共 Skills 注册表
- [Creating skills](/zh/tools/creating-skills) - 构建自定义 Skills
- [Plugins](/zh/tools/plugin) - 插件系统概述
- [Skill Workshop 插件](/zh/plugins/skill-workshop) - 从代理的工作生成技能
- [Skills 配置](/zh/tools/skills-config) - 技能配置参考
- [斜杠命令](/zh/tools/slash-commands) - 所有可用的斜杠命令
