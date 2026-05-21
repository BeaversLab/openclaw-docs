---
summary: "Skills：托管 vs 工作区，准入规则，代理允许列表以及配置连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw 使用与 **[AgentSkills](https://agentskills.io)** 兼容的技能文件夹来教代理如何使用工具。每个技能是一个目录，其中包含一个 `SKILL.md`，其中包含 YAML frontmatter 和说明。OpenClaw 加载捆绑技能以及可选的本地覆盖项，并在加载时根据环境、配置和二进制文件的存在对其进行过滤。

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

请参阅 [Plugins](/zh/tools/plugin) 了解发现/配置，并参阅 [Tools](/zh/tools) 了解这些技能所教授的工具表面。

## 技能车间

可选的实验性 **Skill Workshop** 插件可以根据代理在操作中观察到的可重用过程，创建或更新工作区技能。默认情况下它是禁用的，必须通过 `plugins.entries.skill-workshop` 显式启用。

Skill Workshop 仅写入 `<workspace>/skills`，扫描生成的内容，支持待批准或自动安全写入，隔离不安全的建议，并在成功写入后刷新技能快照，以便新技能无需重启 Gateway(网关) 即可使用。

将其用于更正，例如 _“下次，验证 GIF 归属”_，或来之不易的工作流程，例如媒体 QA 检查清单。从待批准开始；仅在审查其提案后在受信任的工作空间中使用自动写入。完整指南：[Skill Workshop plugin](/zh/plugins/skill-workshop)。

## ClawHub（安装和同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公共技能注册表。
使用原生 `openclaw skills` 命令进行发现/安装/更新，或使用
独立的 `clawhub` CLI 进行发布/同步工作流。完整指南：
[ClawHub](/zh/clawhub)。

| 操作                      | 命令                                            |
| ------------------------- | ----------------------------------------------- |
| 将技能安装到工作空间      | `openclaw skills install <skill-slug>`          |
| 为所有本地代理安装技能    | `openclaw skills install <skill-slug> --global` |
| 更新所有工作区安装的技能  | `openclaw skills update --all`                  |
| 更新单个共享托管技能      | `openclaw skills update <skill-slug> --global`  |
| 更新所有共享托管/本地技能 | `openclaw skills update --all --global`         |
| 同步（扫描 + 发布更新）   | `clawhub sync --all`                            |

Native `openclaw skills install` 默认安装到活动工作区的 `skills/` 目录。添加 `--global` 以安装到共享托管/本地目录（默认为 `~/.openclaw/skills`），除非代理技能允许列表限制了可见性，否则所有本地代理都可见。单独的 `clawhub`CLI CLI 也会安装到当前工作目录下的 `./skills`OpenClawOpenClaw（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其作为 `<workspace>/skills` 拾取。配置的技能根目录还支持一级分组，例如 `skills/<group>/<skill>/SKILL.md`，这样相关的第三方技能可以保存在共享文件夹下，而无需进行广泛的递归扫描。

需要私有、非 ClawHub 分发的 Gateway(网关) 客户端可以使用 Gateway(网关)ClawHub`skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 暂存 zip 技能归档，然后使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安装已提交的上传内容。这是针对受信任客户端的显式管理员上传路径，而非正常的 `openclaw skills install <slug>`ClawHub 或 ClawHub 安装流程。默认情况下此功能处于关闭状态，并且仅在 `openclaw.json` 中设置了 `skills.install.allowUploadedArchives: true` 时才有效。上传模式仍然会安装到默认代理工作区 `skills/<slug>` 目录；归档的内部文件夹名称对于最终安装目标将被忽略。

ClawHub 技能页面在安装前会显示最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的扫描详情页面。`openclaw skills install <slug>` 仍然只是安装路径；发布者可以通过 ClawHub 仪表板或 `clawhub skill rescan <slug>` 解决误报问题。

## 安全

<Warning>请将第三方技能视为**不受信任的代码**。在启用之前请仔细阅读。对于不受信任的输入和有风险的工具，首选沙箱隔离运行。请参阅 [沙箱隔离](/zh/gateway/sandboxing) 了解代理端控制措施。</Warning>

- 工作区、项目代理和额外目录的技能发现仅接受解析后的真实路径保持在配置根目录内的技能根目录，除非 `skills.load.allowSymlinkTargets` 显式信任目标根目录。捆绑的技能始终保持在内部。托管的 `~/.openclaw/skills` 和个人的 `~/.agents/skills` 根目录可能包含由 ClawHub 或其他本地技能管理器安装的符号链接技能文件夹，但每个 `SKILL.md` 的真实路径必须仍保持在其解析后的技能目录内。
- Gateway(网关) 私有归档安装默认是关闭的。当显式启用时，它们需要一个包含 Gateway(网关)`SKILL.md`ClawHub 的已提交 zip 上传，并复用与 ClawHub skill 安装相同的归档提取、路径遍历、符号链接、强制和回滚保护措施。它们受 `skills.install.allowUploadedArchives`ClawHub 限制；正常的 ClawHub 安装不需要该设置。
- Gateway(网关) 支持的技能依赖安装（Gateway(网关)`skills.install`、新手引导和 Skills 设置 UI）在执行安装程序元数据之前运行内置的恶意代码扫描器。`critical` 发现默认会阻止，除非调用者显式设置了危险覆盖；可疑发现仍然仅发出警告。
- `openclaw skills install <slug>` 不同——它将 ClawHub 技能文件夹下载到工作区，或通过 `--global` 下载到共享的托管/本地技能中，并且不使用上述的安装程序元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将机密信息注入该代理轮次的 **主机** 进程（而非沙箱）。请确保机密信息不会出现在提示和日志中。

有关更广泛的威胁模型和检查清单，请参阅 [安全性](/zh/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 规范进行布局/意图设计。嵌入式代理使用的解析器仅支持**单行** frontmatter 键；OpenClaw`metadata` 应该是一个**单行 JSON 对象**。在指令中使用 `{baseDir}` 来引用技能文件夹路径。

### 可选的 frontmatter 键

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的 URL。也通过 `metadata.openclaw.homepage` 支持。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  当为 `true` 时，该技能作为用户斜杠命令暴露。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  当为 `true` 时，OpenClaw 会将该技能的指令排除在模型的正常提示词之外。该技能仍会被安装，并且当 `user-invocable` 也为 `true` 时，仍可作为斜杠命令显式运行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令绕过模型并直接分发给工具。
</ParamField>
<ParamField path="command-tool" type="string">
  当设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具分发，将原始参数字符串转发给工具（无核心解析）。工具使用 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 调用。
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
  当为 `true` 时，始终包含该技能（跳过其他门控）。
</ParamField>
<ParamField path="emoji" type="string">
  由 macOS Skills UI 使用的可选表情符号。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“网站”的可选 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  平台的可选列表。如果已设置，该技能仅适用于这些操作系统。
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
  由 macOS Skills UI 使用的可选安装程序规范（brew/node/go/uv/download）。
</ParamField>

如果不存在 `metadata.openclaw`，则该技能始终符合资格（除非在配置中被禁用或对于捆绑技能被 `skills.allowBundled` 阻止）。

<Note>当缺少 `metadata.openclaw` 时，仍然接受旧的 `metadata.clawdbot` 块，因此较早安装的技能保留其依赖门槛和安装程序提示。新技能和更新的技能应使用 `metadata.openclaw`。</Note>

### 沙箱隔离说明

- `requires.bins` 是在技能加载时在 **宿主机** 上检查的。
- 如果代理处于沙箱隔离状态，则二进制文件也必须存在于 **容器内部**。通过 `agents.defaults.sandbox.docker.setupCommand` （或自定义映像）安装它。`setupCommand` 在创建容器后运行一次。软件包安装还需要网络出口、可写的根 FS 以及沙箱中的 root 用户。
- 例如：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要在沙箱容器中安装 `summarize` CLI 才能在其中运行。

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
    - 如果列出了多个安装程序，网关会选择一个首选选项（如果有 brew 则选择 brew，否则选择 node）。
    - 如果所有安装程序都是 `download`OpenClaw，OpenClaw 将列出每个条目，以便您查看可用的构件。
    - 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台过滤选项。
    - Node 安装遵循 `openclaw.json`npmnpmGateway(网关)BunWhatsAppTelegramGateway(网关)OpenClaw 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。这仅影响技能安装；Gateway(网关) 运行时仍应为 Node - 不建议将 Bun 用于 WhatsApp/Telegram。
    - 由 Gateway(网关) 支持的安装程序选择是首选项驱动的：当安装规范混合了多种类型时，如果 `skills.install.preferBrew` 已启用且 `brew` 存在，OpenClaw 优先选择 Homebrew，然后是 `uv`，接着是配置的 node 管理器，最后是 `go` 或 `download` 等其他后备选项。
    - 如果每个安装规范都是 `download`OpenClaw，OpenClaw 将显示所有下载选项，而不是折叠为一个首选安装程序。

  </Accordion>
  <Accordion title="Per-installer details"OpenClawLinux>
    - **Homebrew 安装：** OpenClaw 不会自动安装 Homebrew，也不会将 brew 公式转换为系统包管理器命令。在没有 `brew` 的 Linux 容器中，新手引导会隐藏仅限 brew 的依赖项安装程序；请使用自定义镜像或在启用该技能之前手动安装依赖项。
    - **Go 安装：** 如果缺少 `go` 且存在 `brew`，网关会首先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **下载安装：** `url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到归档时为 auto），`stripComponents`，`targetDir`（默认 `~/.openclaw/tools/<skillKey>`）。

  </Accordion>
</AccordionGroup>

## 配置覆盖

可以在 `skills.entries` 中的 `~/.openclaw/openclaw.json` 下切换和提供捆绑及托管技能的环境变量值：

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
  `false` 即使该技能是内置或已安装的，也会将其禁用。 内置的 `coding-agent` 技能是可选启用的：在将其暴露给代理之前设置 `skills.entries.coding-agent.enabled: true`，然后确保 `claude`、`codex`、`opencode` 或 `pi` 之一已安装并为其自身的 CLI 进行了身份验证。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  便捷功能，适用于声明 `metadata.openclaw.primaryEnv` 的技能。支持纯文本或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  仅当变量尚未在进程中设置时才注入。
</ParamField>
<ParamField path="config" type="object">
  用于自定义每技能字段的可选容器。自定义键必须位于此处。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  仅适用于 **内置** 技能的可选允许列表。如果设置，则仅列表中的内置技能符合条件（受管理/工作区技能不受影响）。
</ParamField>

如果技能名称包含连字符，请给键加上引号（JSON5 允许带引号的键）。默认情况下，配置键与**技能名称**匹配——如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

<Note>要在 OpenClaw 内进行标准的图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不要使用捆绑的技能。此处的技能示例适用于自定义或第三方工作流。要进行原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。如果您选择了 `openai/*`、`google/*`、`fal/*` 或其他特定于提供商的图像模型，也请添加该提供商的 auth/API 密钥。</Note>

## 环境变量注入

当代理运行开始时，OpenClaw：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用于 `process.env`。
3. 使用**符合条件的**技能构建系统提示词。
4. 运行结束后恢复原始环境。

环境注入的**作用域限定为代理运行**，而非全局 Shell
环境。

对于内置的 `claude-cli` 后端，OpenClaw 还会将相同的合格快照实例化为临时的 Claude Code 插件，并通过 `--plugin-dir` 传递。Claude Code 可以随后使用其原生技能解析器，而 OpenClaw 仍拥有优先级、每代理允许列表、门控以及 `skills.entries.*` env/API 密钥注入的控制权。其他 CLI 后端仅使用提示目录。

## 快照与刷新

OpenClaw 会在**会话开始时**对合格的 Skills 进行快照，并在同一会话的后续轮次中重复使用该列表。对 Skills 或配置的更改将在下一个新会话中生效。

Skills 可以在会话期间刷新，有两种情况：

- Skills 监视器已启用。
- 出现了一个新的合格远程节点。

将此视为一种**热重载**：刷新后的列表将在下一次代理轮次中被获取。如果该会话的有效代理技能允许列表发生变化，OpenClaw 会刷新快照，以便可见的技能与当前代理保持一致。

### Skills 监视器

默认情况下，OpenClaw 会监视技能文件夹，并在 `SKILL.md` 文件发生变化时更新技能快照。可以在 `skills.load` 下进行配置：

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

对于有意的 workspace、project-agent 或 extra-dir 布局，如果技能根目录包含符号链接（例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`），请使用 `allowSymlinkTargets`。默认情况下，受管理的 `~/.openclaw/skills` 和个人的 `~/.agents/skills` 可以遵循来自本地技能管理器的技能目录符号链接，但目标列表仍在 realpath 解析后进行匹配，因此在配置时应保持狭窄。

### 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 在 Linux 上运行，但连接了一个 **macOS 节点** 且允许 Gateway(网关)LinuxmacOS`system.run`（未将 Exec 批准安全性设置为 `deny`OpenClawmacOS），OpenClaw 可以将仅限 macOS 的技能视为符合条件，前提是该节点上存在所需的二进制文件。代理应通过 `exec` 工具并使用 `host=node` 执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.which` 或 `system.run`OpenClaw 进行的 bin 探测。离线节点**不会**使仅限远程的技能可见。如果已连接的节点停止响应 bin 探测，OpenClaw 将清除其缓存的 bin 匹配项，以便代理不再看到当前无法在那里运行的技能。

## Token 影响

当技能符合条件时，OpenClaw 会将一个包含可用技能的精简 XML 列表注入到系统提示词中（通过 `pi-coding-agent` 中的 OpenClaw`formatSkillsForPrompt`）。成本是确定的：

- **基础开销**（仅当 ≥1 个技能时）：195 个字符。
- **每个技能：**97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义会将 `& < > " '` 扩展为实体（`&amp;`、`&lt;`OpenAI 等），从而增加长度。Token 计数因模型分词器而异。粗略的 OpenAI 风格估算约为每 Token 4 个字符，因此除实际字段长度外，每个技能约为 **97 字符 ≈ 24 tokens**。

## 托管技能生命周期

OpenClaw 附带了一组作为 **bundled skills** 的基准技能，包含在安装（npm 包或 OpenClaw.app）中。`~/.openclaw/skills` 用于本地覆盖——例如，在无需更改内置副本的情况下固定或修补技能。Workspace 技能归用户所有，在名称冲突时会覆盖前两者。

## 想要更多技能？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置架构：[Skills config](/zh/tools/skills-config)。

## 相关

- [ClawHub](/zh/clawhub) - 公共技能注册表
- [Creating skills](/zh/tools/creating-skills) - 构建自定义技能
- [Plugins](/zh/tools/plugin) - 插件系统概述
- [Skill Workshop plugin](/zh/plugins/skill-workshop) - 从代理工作中生成技能
- [Skills config](/zh/tools/skills-config) - 技能配置参考
- [Slash commands](/zh/tools/slash-commands) - 所有可用的斜杠命令
