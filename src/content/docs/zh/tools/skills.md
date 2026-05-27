---
summary: "Skills：托管 vs 工作区，准入规则，代理允许列表以及配置连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw 使用与 **[AgentSkills](OpenClawhttps://agentskills.io) 兼容**的技能文件夹来教代理如何使用工具。每个技能是一个包含 `SKILL.md`OpenClaw 的目录，其中包含 YAML frontmatter 和说明。OpenClaw 加载捆绑的技能以及可选的本地覆盖内容，并在加载时根据环境、配置和二进制文件的存在情况对其进行筛选。

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

Codex CLI 的原生 `$CODEX_HOME/skills` 目录不是这些 OpenClaw
技能根目录之一。在 Codex 约束模式下，本地应用服务器启动使用隔离的
每代理 Codex 主目录，因此操作员个人 `~/.codex/skills`
中的技能不会被隐式加载。Codex 原生 `.agents` 发现机制单独使用继承的
`HOME`；上文提到的 OpenClaw 自身技能根目录已包含
`~/.agents/skills`。使用 `openclaw migrate plan codex` 清点 Codex 主目录中的技能，
然后使用 `openclaw migrate codex` 通过交互式复选框提示选择技能目录，再将它们复制到当前的 OpenClaw 代理工作区中。
对于非交互式运行，请为要复制的确切技能重复 `--skill <name>`。

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

请参阅[插件](/zh/tools/plugin)了解发现/配置，参阅[工具](/zh/tools)了解这些技能所教授的工具界面。

## 技能车间

可选的实验性 **Skill Workshop** 插件可以根据代理在操作中观察到的可重用过程，创建或更新工作区技能。默认情况下它是禁用的，必须通过 `plugins.entries.skill-workshop` 显式启用。

Skill Workshop 仅写入 `<workspace>/skills`，扫描生成的内容，支持待批准或自动安全写入，隔离不安全的建议，并在成功写入后刷新技能快照，以便新技能无需重启 Gateway(网关) 即可使用。

将其用于诸如*“下次验证 GIF 来源”*之类的更正，或用于媒体 QA 检查清单等来之不易的工作流。从待批准开始；仅在审查其建议后，在受信任的工作空间中使用自动写入。完整指南：[Skill Workshop 插件](/zh/plugins/skill-workshop)。

## ClawHub（安装和同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公共技能注册表。使用原生的 `openclaw skills` 命令进行发现/安装/更新，或使用单独的 `clawhub` CLI 进行发布/同步工作流。完整指南：[ClawHub](/zh/clawhub)。

| 操作                        | 命令                                                   |
| --------------------------- | ------------------------------------------------------ |
| 将 ClawHub 技能安装到工作区 | `openclaw skills install <skill-slug>`                 |
| 将 Git 技能安装到工作区     | `openclaw skills install git:owner/repo@ref`           |
| 将本地技能安装到工作区      | `openclaw skills install ./path/to/skill --as my-tool` |
| 为所有本地代理安装技能      | `openclaw skills install <skill-slug> --global`        |
| 更新所有工作区安装的技能    | `openclaw skills update --all`                         |
| 更新单个共享托管技能        | `openclaw skills update <skill-slug> --global`         |
| 更新所有共享托管/本地技能   | `openclaw skills update --all --global`                |
| 同步（扫描 + 发布更新）     | `clawhub sync --all`                                   |

原生 `openclaw skills install` 默认安装到活动工作区的 `skills/` 目录中。添加 `--global` 以安装到共享的 managed/local 目录（默认为 `~/.openclaw/skills`），除非代理技能允许列表限制了可见性，否则所有本地代理都能看到该目录。独立的 `clawhub`CLI CLI 也会安装到当前工作目录下的 `./skills`OpenClawOpenClaw 中（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其作为 `<workspace>/skills` 拾取。配置的技能根目录还支持一个分组级别，例如 `skills/<group>/<skill>/SKILL.md`，这样相关的第三方技能可以保存在共享文件夹中，而无需进行广泛的递归扫描。

Git 和本地目录安装要求在源根目录有一个 `SKILL.md`。安装 slug 来自 `SKILL.md` frontmatter `name`，如果它是有效的 slug，则回退到源目录或存储库名称。使用 `--as <slug>` 来覆盖推断出的 slug。`--version` 仅适用于 ClawHub 安装。技能安装不支持 npm 包规范或 zip/归档路径。`openclaw skills update` 仅更新 ClawHub 跟踪的安装；重新安装 Git 或本地源以刷新它们。

需要私有、非 ClawHub 交付的 Gateway(网关)ClawHub 客户端可以使用 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 暂存 zip 技能归档，然后使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安装已提交的上传内容。这是一条供受信任客户端使用的显式管理员上传路径，而非正常的 `openclaw skills install <slug>` 或 ClawHub 安装流程。默认情况下此功能处于关闭状态，只有在 `openclaw.json` 中设置了 `skills.install.allowUploadedArchives: true` 时才能工作。上传模式仍然会安装到默认的代理工作区 `skills/<slug>` 目录；对于最终的安装目标，将忽略归档的内部文件夹名称。

ClawHub 技能页面在安装前会公开最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的扫描详情页面。ClawHub`openclaw skills install <slug>`ClawHub 仍然只是安装路径；发布者可以通过 ClawHub 仪表板或 `clawhub skill rescan <slug>` 恢复误报。

## 安全

<Warning>请将第三方技能视为**不受信任的代码**。在启用之前请阅读它们。对于不受信任的输入和有风险的工具，请首选沙箱隔离运行。有关代理端控件的信息，请参阅[沙箱隔离](/zh/gateway/sandboxing)。</Warning>

- 工作区、项目代理和额外目录的技能发现仅接受已解析的真实路径保持在配置根目录内的技能根目录，除非 `skills.load.allowSymlinkTargets` 显式信任目标根目录。捆绑的技能始终保持在内部。托管的 `~/.openclaw/skills` 和个人 `~/.agents/skills` 根目录可能包含由 ClawHub 或其他本地技能管理器安装的符号链接技能文件夹，但每个 `SKILL.md` 的真实路径必须仍保持在其已解析的技能目录内。
- Gateway(网关) 私有归档安装默认是关闭的。在明确启用时，它们需要提交一个包含 Gateway(网关)`SKILL.md`ClawHub 的 zip 上传文件，并复用与 ClawHub skill 安装相同的归档提取、路径遍历、符号链接、强制和回滚保护措施。它们受 `skills.install.allowUploadedArchives`ClawHub 的限制；正常的 ClawHub 安装不需要该设置。
- 由 Gateway(网关) 支持的 skill 依赖项安装（Gateway(网关)`skills.install`、新手引导和 Skills 设置 UI）在执行安装程序元数据之前运行内置的危险代码扫描器。除非调用者明确设置危险覆盖，否则 `critical` 发现默认会阻止；可疑的发现仍然只会发出警告。
- `openclaw skills install <slug>` 是不同的 —— 它将 ClawHub 技能文件夹下载到工作区，或者通过 `--global` 下载到共享的托管/本地技能中，并且不使用上述的 installer-metadata 路径。Git 和本地目录安装会将受信任的 `SKILL.md` 目录复制到同一个技能根目录，但不会被 `openclaw skills update` 跟踪。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将机密信息注入到该 agent 回合的 **主机** 进程中（而不是沙箱中）。请勿将机密信息包含在提示和日志中。

有关更广泛的威胁模型和检查清单，请参阅 [Security](/zh/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 规范进行布局/意图设计。嵌入式代理使用的解析器仅支持**单行** frontmatter 键；`metadata` 应该是一个**单行 JSON 对象**。在指令中使用 `{baseDir}` 来引用技能文件夹路径。

### 可选 frontmatter 键

<ParamField path="homepage" type="string"macOS>
  在 macOS Skills UI 中显示为“Website”的 URL。也通过 `metadata.openclaw.homepage` 支持。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  当 `true` 时，该技能作为用户斜杠命令公开。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  当 `true`OpenClaw 时，OpenClaw 会将该技能的指令排除在代理的普通提示之外。该技能仍然被安装，并且当 `user-invocable` 也为 `true` 时，仍然可以作为斜杠命令显式运行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令绕过模型直接调度到工具。
</ParamField>
<ParamField path="command-tool" type="string">
  当设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具调度，将原始参数字符串转发给工具（无核心解析）。该工具通过 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 调用。
</ParamField>

## 筛选（加载时过滤器）

OpenClaw 在加载时使用 `metadata`（单行 JSON）筛选技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的字段：

<ParamField path="always" type="boolean">
  当 `true` 时，始终包含该技能（跳过其他检查）。
</ParamField>
<ParamField path="emoji" type="string"macOS>
  macOS Skills UI 使用的可选表情符号。
</ParamField>
<ParamField path="homepage" type="string"macOS>
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
<ParamField path="install" type="object[]"macOS>
  macOS Skills UI 使用的可选安装程序规范（brew/node/go/uv/download）。
</ParamField>

如果不存在 `metadata.openclaw`，则该技能始终符合条件（除非在配置中被禁用或被捆绑技能的 `skills.allowBundled` 阻止）。

<Note>当缺少 `metadata.openclaw` 时，仍接受传统的 `metadata.clawdbot` 块，因此旧版已安装的技能保留其依赖性门槛和安装程序提示。新技能和更新的技能应使用 `metadata.openclaw`。</Note>

### 沙箱隔离注意事项

- `requires.bins` 在技能加载时于 **主机** 上进行检查。
- 如果代理处于沙箱隔离状态，则二进制文件必须也存在于 **容器内部**。请通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）进行安装。`setupCommand` 在容器创建后运行一次。软件包安装还需要网络出口、可写的根文件系统以及沙箱中的 root 用户。
- 示例：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要在沙盒容器中运行 `summarize` CLI。

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
    - If multiple installers are listed, the gateway picks a single preferred option (brew when available, otherwise node).
    - If all installers are `download`OpenClaw, OpenClaw lists each entry so you can see the available artifacts.
    - Installer specs can include `os: ["darwin"|"linux"|"win32"]` to filter options by platform.
    - Node installs honor `skills.install.nodeManager` in `openclaw.json`npmnpmGateway(网关)BunWhatsAppTelegramGateway(网关)OpenClaw (default: npm; options: npm/pnpm/yarn/bun). This only affects skill installs; the Gateway runtime should still be Node - Bun is not recommended for WhatsApp/Telegram.
    - Gateway-backed installer selection is preference-driven: when install specs mix kinds, OpenClaw prefers Homebrew when `skills.install.preferBrew` is enabled and `brew` exists, then `uv`, then the configured node manager, then other fallbacks like `go` or `download`.
    - If every install spec is `download`OpenClaw, OpenClaw surfaces all download options instead of collapsing to one preferred installer.

  </Accordion>
  <Accordion title="Per-installer details"OpenClawLinux>
    - **Homebrew 安装：** OpenClaw 不会自动安装 Homebrew 或将
      brew 公式翻译为系统包管理器命令。在没有 `brew` 的 Linux 容器中，
      新手引导 会隐藏仅限 brew 的依赖项安装程序；请使用
      自定义镜像或在启用该技能之前手动安装依赖项。
    - **Go 安装：** 如果缺少 `go` 且 `brew` 可用，网关会先通过 Homebrew 安装 Go，并在可能的情况下将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **下载安装：** `url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到归档文件时为 auto），`stripComponents`，`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

  </Accordion>
</AccordionGroup>

## 配置覆盖

可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切换并使用环境变量来配置捆绑和托管的技能：

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
  `false` 禁用该技能，即使它是内置或已安装的。 内置的 `coding-agent` 技能是可选启用的：在将其暴露给代理之前设置 `skills.entries.coding-agent.enabled: true`，然后确保安装并验证了 `claude`、`codex`、`opencode` 或 `pi` 之一以用于其自己的 CLI。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  用于声明 `metadata.openclaw.primaryEnv` 的技能的便捷方式。支持纯文本或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  仅当该变量尚未在进程中设置时才注入。
</ParamField>
<ParamField path="config" type="object">
  用于自定义每项技能字段的可选包。自定义键必须位于此处。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  仅适用于 **内置** 技能的可选允许列表。如果设置，则只有列表中的内置技能符合条件（托管/工作区技能不受影响）。
</ParamField>

如果技能名称包含连字符，请给键加上引号（JSON5 允许带引号的键）。配置键默认匹配 **技能名称** - 如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

<Note>对于 OpenClaw 内部的常规图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不是内置技能。此处的技能示例用于自定义或第三方工作流。对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。如果您选择 `openai/*`、`google/*`、`fal/*` 或其他特定于提供商的图像模型，请同时添加该提供商的 auth/API 密钥。</Note>

## 环境变量注入

当代理运行开始时，OpenClaw 会执行以下操作：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用于 `process.env`。
3. 使用符合条件的技能构建系统提示词。
4. 运行结束后恢复原始环境。

环境注入的作用域限定于代理运行，而非全局 Shell 环境。

对于捆绑的 `claude-cli` 后端，OpenClaw 还会将相同的合格快照具象化为临时 Claude Code 插件，并通过 `--plugin-dir` 传递。Claude Code 随后可以使用其原生技能解析器，而 OpenClaw 仍然拥有优先级、每代理允许列表、门控以及 `skills.entries.*` env/API 密钥注入权。其他 CLI 后端仅使用提示目录。

## 快照与刷新

OpenClaw 会在**会话开始时**对合格的 Skills 进行快照，并在同一会话的后续轮次中重用该列表。对 Skills 或配置的更改将在下一个新会话中生效。

Skills 可以在会话期间通过以下两种情况刷新：

- 启用了 Skills 监视器。
- 出现了新的合格远程节点。

将此视为**热重载**：更新后的列表将在下一次代理轮次中被选取。如果该会话的有效代理技能允许列表发生变化，OpenClaw 会刷新快照，以确保可见技能与当前代理保持一致。

### Skills 监视器

默认情况下，OpenClaw 会监视技能文件夹，并在 `SKILL.md` 文件发生变化时更新技能快照。在 `skills.load` 下进行配置：

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

对于技能根目录包含符号链接（例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`）的有意为之的工作区、项目代理或额外目录布局，请使用 `allowSymlinkTargets`。托管 `~/.openclaw/skills` 和个人 `~/.agents/skills` 默认情况下可以跟随来自本地技能管理器的技能目录符号链接，但在 realpath 解析后仍会匹配目标列表，因此在配置时应保持范围狭窄。

### 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 在 Linux 上运行，但连接了一个 **macOS 节点** 并允许 `system.run`（Exec 审批安全性未设置为 `deny`），那么当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为可用。代理应通过 `exec` 工具并使用 `host=node` 来执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.which` 或 `system.run` 进行 bin 探测。离线节点**不会**使仅限远程的技能可见。如果已连接的节点停止响应 bin 探测，OpenClaw 将清除其缓存的 bin 匹配项，以便代理不再看到当前无法在那里运行的技能。

## Token 影响

当技能符合条件时，OpenClaw 会将可用技能的紧凑 XML 列表注入系统提示（通过 OpenClaw`formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是确定性的：

- **基础开销**（仅当有 ≥1 个技能时）：195 个字符。
- **每个技能：** 97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义会将 `& < > " '` 扩展为实体（`&amp;`、`&lt;`OpenAI 等），
从而增加长度。Token 计数因模型分词器而异。粗略的
OpenAI 风格估算约为每 4 个字符/token，因此 **97 字符 ≈ 24 tokens** 每
个技能加上您实际的字段长度。

## 托管的技能生命周期

OpenClaw 在安装（npm 包或 OpenClaw.app）时附带了一组作为“捆绑 Skills”的基准 Skills。OpenClawnpmOpenClaw`~/.openclaw/skills` 用于本地覆盖——例如，固定或修补某个 Skill 而不修改捆绑副本。工作区 Skills 归用户所有，在名称冲突时会覆盖前两者。

## 寻找更多 Skills？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置架构：[Skills config](/zh/tools/skills-config)。

## 相关

- [ClawHub](ClawHub/en/clawhub) - 公共 Skills 注册表
- [创建 Skills](/zh/tools/creating-skills) - 构建自定义 Skills
- [插件](/zh/tools/plugin) - 插件系统概述
- [Skill Workshop 插件](/zh/plugins/skill-workshop) - 从 Agent 工作生成 Skills
- [Skills 配置](/zh/tools/skills-config) - 技能配置参考
- [斜杠命令](/zh/tools/slash-commands) - 所有可用的斜杠命令
