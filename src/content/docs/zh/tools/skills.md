---
summary: "Skills：托管与工作区、筛选规则以及配置/环境连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "Skills"
---

# 技能 (OpenClaw)

OpenClaw 使用与 **[AgentSkills](https://agentskills.io)-compatible** 兼容的技能文件夹来教代理如何使用工具。每个技能都是一个包含 `SKILL.md` 的目录，其中包含 YAML 前置数据和说明。OpenClaw 会加载 **bundled skills** 以及可选的本地覆盖，并在加载时根据环境、配置和二进制文件是否存在对其进行过滤。

## 位置和优先级

OpenClaw 从以下来源加载技能：

1. **额外的技能文件夹**：通过 `skills.load.extraDirs` 配置
2. **内置技能**：随安装包一起提供（npm 包或 OpenClaw.app）
3. **托管/本地技能**：`~/.openclaw/skills`
4. **个人代理技能**：`~/.agents/skills`
5. **项目代理技能**：`<workspace>/.agents/skills`
6. **工作区技能**：`<workspace>/skills`

如果技能名称发生冲突，优先级如下：

`<workspace>/skills` (最高) → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 捆绑技能 → `skills.load.extraDirs` (最低)

## 每代理 vs 共享技能

在 **多代理** 设置中，每个代理都有自己的工作区。这意味着：

- **按代理分类的技能** 位于 `<workspace>/skills` 中，仅适用于该代理。
- **项目代理技能** 位于 `<workspace>/.agents/skills` 中，并在正常的工作区 `skills/` 文件夹之前应用于该工作区。
- **个人代理技能** 位于 `~/.agents/skills` 中，并适用于该机器上的所有工作区。
- **共享技能** 位于 `~/.openclaw/skills` (托管/本地) 中，对同一机器上的 **所有代理** 可见。
- 如果您希望使用由多个代理使用的通用技能包，也可以通过 `skills.load.extraDirs` (最低优先级) 添加 **共享文件夹**。

如果相同的技能名称存在于多个位置，则适用常规的优先级：工作区优先，然后是项目代理技能，然后是个人代理技能，然后是托管/本地，然后是内置，最后是额外目录。

## 代理技能允许列表

技能 **位置** 和技能 **可见性** 是独立的控制项。

- 位置/优先级决定同名技能的哪个副本获胜。
- 代理允许列表决定代理可以使用哪些可见技能。

使用 `agents.defaults.skills` 作为共享基线，然后通过 `agents.list[].skills` 针对每个代理进行覆盖：

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

规则：

- 默认情况下省略 `agents.defaults.skills` 以允许无限制的技能。
- 省略 `agents.list[].skills` 以继承 `agents.defaults.skills`。
- 设置 `agents.list[].skills: []` 表示不使用任何技能。
- 非空的 `agents.list[].skills` 列表是该代理的最终集合；它
  不会与默认值合并。

OpenClaw 在提示词构建、技能
斜杠命令发现、沙箱同步和技能快照中应用有效的代理技能集。

## 插件 + 技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录来附带其自己的技能（路径相对于插件根目录）。插件技能在插件启用时加载。目前，这些目录被合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的捆绑、托管、代理或工作区技能会覆盖它们。你可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来控制它们。请参阅 [Plugins](/zh/tools/plugin) 了解发现/配置，并参阅 [Tools](/zh/tools) 了解这些技能所教授的工具表面。

## 技能工作坊

可选的实验性技能工作坊插件可以根据在代理工作期间观察到的可重用过程来创建或更新工作区技能。它默认处于禁用状态，必须通过 `plugins.entries.skill-workshop` 显式启用。

Skill Workshop 仅写入 `<workspace>/skills`，扫描生成的内容，支持待批准或自动安全写入，隔离不安全的提案，并在成功写入后刷新技能快照，以便新技能在无需重启 Gateway(网关) 的情况下即可生效。

当您希望将“下次验证 GIF 来源”等更正意见或媒体 QA 检查表等来之不易的工作流程转化为持久的程序指令时，请使用它。首先从待批准开始；仅在审查其提案后在受信任的工作空间中使用自动写入。完整指南：[Skill Workshop Plugin](/zh/plugins/skill-workshop)。

## ClawHub (install + sync)

ClawHub 是 OpenClaw 的公共技能注册表。在
[https://clawhub.ai](https://clawhub.ai) 浏览。使用原生 `openclaw skills`
命令来发现/安装/更新技能，或者在需要发布/同步工作流时使用单独的 `clawhub` CLI。
完整指南：[ClawHub](/zh/tools/clawhub)。

常见流程：

- 将技能安装到您的工作区：
  - `openclaw skills install <skill-slug>`
- 更新所有已安装的技能：
  - `openclaw skills update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

原生 `openclaw skills install` 安装到活动工作区的 `skills/`
目录中。独立的 `clawhub` CLI 也会安装到您当前工作目录下的 `./skills` 中（或者回退到已配置的 OpenClaw 工作区）。
OpenClaw 会在下一次会话中将其作为 `<workspace>/skills` 选取。

## 安全说明

- 将第三方技能视为**不受信任的代码**。在启用之前请阅读它们。
- 对于不受信任的输入和风险工具，首选沙箱隔离运行。请参阅 [沙箱隔离](/zh/gateway/sandboxing)。
- 工作区和额外目录的技能发现仅接受解析后的真实路径位于已配置根目录之内的技能根目录和 `SKILL.md` 文件。
- Gateway(网关) 支持的 skill 依赖安装（`skills.install`、新手引导和 Skills 设置 UI）在执行安装程序元数据之前运行内置的危险代码扫描器。`critical` 的发现默认会阻止操作，除非调用方显式设置了危险覆盖；可疑的发现仍然只会发出警告。
- `openclaw skills install <slug>` 的情况不同：它会将 ClawHub skill 文件夹下载到工作区中，并且不使用上述的安装程序元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会将密钥注入到该 agent 轮次的 **host** 进程中（而非沙箱）。请勿将密钥放入提示词和日志中。
- 有关更广泛的威胁模型和检查清单，请参阅 [Security](/zh/gateway/security)。

## 格式（AgentSkills + Pi 兼容）

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

说明：

- 我们遵循 AgentSkills 规范进行布局/意图定义。
- 嵌入式代理使用的解析器仅支持**单行**前置元数据键。
- `metadata` 应为一个**单行 JSON 对象**。
- 在指令中使用 `{baseDir}` 来引用技能文件夹路径。
- 可选前置元数据键：
  - `homepage` — 在 macOS Skills UI 中显示为“Website”的 URL（也通过 `metadata.openclaw.homepage` 支持）。
  - `user-invocable` — `true|false`（默认值：`true`）。当 `true` 时，该技能将作为用户斜杠命令公开。
  - `disable-model-invocation` — `true|false`（默认值：`false`）。当 `true` 时，该技能将从模型提示中排除（但仍可通过用户调用使用）。
  - `command-dispatch` — `tool`（可选）。当设置为 `tool` 时，斜杠命令将绕过模型并直接分发给工具。
  - `command-tool` — 当设置了 `command-dispatch: tool` 时要调用的工具名称。
  - `command-arg-mode` — `raw`（默认）。对于工具分发，将原始参数字符串转发给工具（不进行核心解析）。

    该工具使用以下参数调用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## Gating（加载时筛选器）

OpenClaw **在加载时筛选技能**，使用 `metadata`（单行 JSON）：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的字段：

- `always: true` — 始终包含该技能（跳过其他筛选条件）。
- `emoji` — macOS Skills UI 使用的可选表情符号。
- `homepage` — 可选的 URL，在 macOS Skills UI 中显示为“Website”。
- `os` — 可选的平台列表 (`darwin`, `linux`, `win32`)。如果已设置，则该技能仅适用于这些操作系统。
- `requires.bins` — 列表；每个都必须存在于 `PATH` 上。
- `requires.anyBins` — 列表；至少有一个必须存在于 `PATH` 上。
- `requires.env` — 列表；环境变量必须存在**或**在配置中提供。
- `requires.config` — 必须为真值的 `openclaw.json` 路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
- `install` — 由 macOS Skills UI 使用的安装程序规范的可选数组 (brew/node/go/uv/download)。

关于沙箱隔离的说明：

- `requires.bins` 在技能加载时于 **主机** 上进行检查。
- 如果代理处于沙箱隔离状态，二进制文件也必须存在于 **容器内部**。
  通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）安装它。
  `setupCommand` 在容器创建后运行一次。
  软件包安装还需要网络出口、可写的根文件系统和沙箱中的 root 用户。
  例如：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要在沙箱容器中运行 `summarize` CLI。

安装程序示例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

说明：

- 如果列出了多个安装程序，网关会选择 **一个** 首选选项（可用时为 brew，否则为 node）。
- 如果所有安装程序都是 `download`，OpenClaw 将列出每个条目，以便您查看可用的构件。
- 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
- Node 安装遵循 `skills.install.nodeManager` 中的 `openclaw.json`（默认：npm；选项：npm/pnpm/yarn/bun）。
  这仅影响 **技能安装**；Gateway(网关) 运行时仍应为 Node
  （不建议用于 WhatsApp/Telegram 使用 Bun）。
- Gateway(网关) 支持的安装程序选择是偏好驱动的，而不仅仅是 node：
  当安装规范混合了类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 优先选择 Homebrew，然后是 `uv`，
  然后是配置的 node 管理器，最后是 `go` 或 `download` 等其他后备方案。
- 如果每个安装规范都是 `download`，OpenClaw 会显示所有下载选项
  而不是折叠为一个首选安装程序。
- Go 安装：如果缺少 `go` 且 `brew` 可用，网关会先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到归档文件时为自动），`stripComponents`，`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，则该技能始终符合条件（除非在配置中被禁用或对于捆绑技能被 `skills.allowBundled` 阻止）。

## 配置覆盖 (`~/.openclaw/openclaw.json`)

可以切换捆绑/管理的技能并提供环境值：

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

注意：如果技能名称包含连字符，请用引号将键括起来（JSON5 允许带引号的键）。

如果您想要在 OpenClaw 内部进行标准的图像生成/编辑，请使用带有 `agents.defaults.imageGenerationModel` 的核心 `image_generate` 工具，而不是捆绑的技能。此处的技能示例用于自定义或第三方工作流。

对于原生图像分析，请结合使用 `agents.defaults.imageModel` 和 `image` 工具。
对于原生图像生成/编辑，请结合使用 `image_generate` 和
`agents.defaults.imageGenerationModel`。如果您选择 `openai/*`、`google/*`、
`fal/*` 或其他特定于提供商的图像模型，请同时添加该提供商的 auth/API 密钥。

默认情况下，配置键与 **技能名称** 匹配。如果技能定义了
`metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

规则：

- `enabled: false` 会禁用该技能，即使它已被打包/安装。
- `env`：仅当该变量尚未在进程中设置时才注入。
- `apiKey`：为声明了 `metadata.openclaw.primaryEnv` 的技能提供便利。
  支持纯文本字符串或 SecretRef 对象 (`{ source, provider, id }`)。
- `config`：用于自定义每项技能字段的可选容器；自定义键必须位于此处。
- `allowBundled`：**仅限**内置技能的可选允许列表。如果设置，
  列表中只有内置技能符合条件（托管/工作区技能不受影响）。

## 环境注入（每次代理运行）

当代理运行开始时，OpenClaw：

1. 读取技能元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用到
   `process.env`。
3. 使用**符合条件**的技能构建系统提示。
4. 运行结束后恢复原始环境。

这的作用范围是**代理运行**，而不是全局 shell 环境。

对于内置的 `claude-cli` 后端，OpenClaw 还将同一符合条件的快照具体化为临时 Claude Code 插件，并通过 `--plugin-dir` 传递。Claude Code 随后可以使用其原生技能解析器，而 OpenClaw 仍拥有优先级、每代理允许列表、筛选以及 `skills.entries.*` env/API 密钥注入的控制权。其他 CLI 后端仅使用提示目录。

## 会话快照（性能）

OpenClaw 在**会话开始时**对符合条件的技能进行快照，并在同一会话的后续轮次中重用该列表。对技能或配置的更改将在下一个新会话中生效。

当启用技能监视器或出现新的符合条件的远程节点时（见下文），技能也可以在会话中途刷新。可以将其视为**热重载**：刷新后的列表将在下一次代理轮次中被采纳。

如果该会话的有效代理 Skills 允许列表发生变化，OpenClaw 会刷新快照，以便可见的 Skills 与当前代理保持一致。

## 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 运行在 Linux 上，但连接了 **macOS 节点** **且允许 `system.run`**（执行批准安全性未设置为 `deny`），则当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的 Skills 视为可用。代理应使用带有 `host=node` 的 `exec` 工具来执行这些 Skills。

这依赖于节点报告其命令支持以及通过 `system.run` 进行的二进制探测。如果 macOS 节点随后离线，Skills 仍然可见；在节点重新连接之前，调用可能会失败。

## Skills 监视器（自动刷新）

默认情况下，OpenClaw 会监视技能文件夹，并在 `SKILL.md` 文件更改时更新技能快照。可以在 `skills.load` 下进行配置：

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

## Token 影响（技能列表）

当技能符合条件时，OpenClaw 会将可用技能的紧凑 XML 列表注入到系统提示中（通过 `formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是确定的：

- **基础开销（仅当 ≥1 个技能时）：** 195 个字符。
- **每个技能：** 97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

备注：

- XML 转义会将 `& < > " '` 扩展为实体（如 `&amp;`、`&lt;` 等），从而增加长度。
- Token 计数因模型分词器而异。粗略的 OpenAI 风格估计是约 4 个字符/token，因此每个技能约为 **97 个字符 ≈ 24 个 token**，加上您的实际字段长度。

## 托管的生命周期

OpenClaw 在安装（npm 包或 OpenClaw.app）的一部分中，将一组基准技能作为 **bundled skills（捆绑技能）** 提供。`~/.openclaw/skills` 用于本地覆盖（例如，在固定/修补技能时不更改捆绑副本）。工作区技能归用户所有，并且在名称冲突时会覆盖两者。

## 配置参考

有关完整的配置架构，请参阅 [Skills config](/zh/tools/skills-config)。

## 寻找更多技能？

浏览 [https://clawhub.ai](https://clawhub.ai)。

---

## 相关

- [Creating Skills](/zh/tools/creating-skills) — 构建自定义技能
- [Skills Config](/zh/tools/skills-config) — 技能配置参考
- [斜杠命令](/zh/tools/slash-commands) — 所有可用的斜杠命令
- [插件](/zh/tools/plugin) — 插件系统概述
