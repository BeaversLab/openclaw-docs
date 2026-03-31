---
summary: "技能：托管与工作区、筛选规则以及配置/环境连线"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能 (OpenClaw)

OpenClaw 使用与 **[AgentSkills](https://agentskills.io)** 兼容的技能文件夹来教代理如何使用工具。每个技能是一个包含 `SKILL.md` 的目录，其中包含 YAML frontmatter 和说明。OpenClaw 加载 **内置技能** 以及可选的本地覆盖，并根据环境、配置和二进制文件的存在在加载时进行过滤。

## 位置和优先级

OpenClaw 从以下来源加载技能：

1. **额外技能文件夹**：通过 `skills.load.extraDirs` 配置
2. **内置技能**：随安装包一起提供（npm 包或 OpenClaw.app）
3. **托管/本地技能**：`~/.openclaw/skills`
4. **个人代理技能**：`~/.agents/skills`
5. **项目代理技能**：`<workspace>/.agents/skills`
6. **工作区技能**：`<workspace>/skills`

如果技能名称发生冲突，优先级如下：

`<workspace>/skills`（最高）→ `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 内置技能 → `skills.load.extraDirs`（最低）

## 每代理 vs 共享技能

在 **多代理** 设置中，每个代理都有自己的工作区。这意味着：

- **每代理技能** 仅位于该代理的 `<workspace>/skills` 中。
- **项目代理技能** 位于 `<workspace>/.agents/skills` 中，并在普通工作区 `skills/` 文件夹之前应用于该工作区。
- **个人代理技能** 位于 `~/.agents/skills` 中，并应用于该机器上的所有工作区。
- **共享技能** 位于 `~/.openclaw/skills`（托管/本地）中，对同一台机器上的 **所有代理** 可见。
- 如果您想要一个由多个代理使用的通用技能包，也可以通过 `skills.load.extraDirs`（最低优先级）添加 **共享文件夹**。

如果相同的技能名称存在于多个位置，则适用常规的优先级：工作区优先，然后是项目代理技能，然后是个人代理技能，然后是托管/本地，然后是内置，最后是额外目录。

## 插件 + 技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来提供自己的技能。当插件启用时，插件技能会被加载。目前，这些目录被合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的捆绑、托管、代理或工作区技能会覆盖它们。您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来控制它们。有关发现/配置，请参阅 [插件](/en/tools/plugin)；有关这些技能所教授的工具界面，请参阅 [工具](/en/tools)。

## ClawHub（安装 + 同步）

ClawHub 是 OpenClaw 的公共技能注册表。在 [https://clawhub.com](https://clawhub.com) 上浏览。使用原生的 `openclaw skills` 命令来发现/安装/更新技能，或者在需要发布/同步工作流时使用独立的 `clawhub` CLI。完整指南：[ClawHub](/en/tools/clawhub)。

常见流程：

- 将技能安装到您的工作区：
  - `openclaw skills install <skill-slug>`
- 更新所有已安装的技能：
  - `openclaw skills update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

原生的 `openclaw skills install` 会安装到活动工作区的 `skills/` 目录中。独立的 `clawhub` CLI 也会安装到当前工作目录下的 `./skills`（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其作为 `<workspace>/skills` 拾取。

## 安全说明

- 将第三方技能视为 **不受信任的代码**。在启用之前请阅读它们。
- 对于不受信任的输入和有风险的工具，首选沙箱隔离运行。请参阅 [沙箱隔离](/en/gateway/sandboxing)。
- 工作区和额外目录技能发现仅接受其解析后的真实路径保持在配置根目录内的技能根目录和 `SKILL.md` 文件。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将机密信息注入到该代理轮次的 **主机** 进程中（而非沙箱内）。请勿将机密信息包含在提示和日志中。
- 有关更广泛的威胁模型和检查清单，请参阅 [安全](/en/gateway/security)。

## 格式 (AgentSkills + Pi-compatible)

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

注意：

- 我们遵循 AgentSkills 规范来确定布局/意图。
- 嵌入式代理使用的解析器仅支持**单行** frontmatter 键。
- `metadata` 应该是一个**单行 JSON 对象**。
- 在指令中使用 `{baseDir}` 来引用技能文件夹路径。
- 可选的 frontmatter 键：
  - `homepage` — 在 macOS Skills UI 中显示为“Website”的 URL（也可以通过 `metadata.openclaw.homepage` 支持）。
  - `user-invocable` — `true|false`（默认值：`true`）。当为 `true` 时，该技能作为用户斜杠命令暴露。
  - `disable-model-invocation` — `true|false`（默认值：`false`）。当为 `true` 时，该技能将从模型提示词中排除（仍可通过用户调用使用）。
  - `command-dispatch` — `tool`（可选）。当设置为 `tool` 时，斜杠命令将绕过模型并直接分发给工具。
  - `command-tool` — 当设置 `command-dispatch: tool` 时要调用的工具名称。
  - `command-arg-mode` — `raw`（默认值）。对于工具分发，将原始参数字符串转发给工具（无核心解析）。

    工具使用以下参数调用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 筛选（加载时过滤器）

OpenClaw 使用 `metadata`（单行 JSON）**在加载时筛选技能**：

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
- `homepage` — macOS Skills UI 中显示为“Website”的可选 URL。
- `os` — 可选的平台列表（`darwin`、`linux`、`win32`）。如果设置，该技能仅在这些操作系统上可用。
- `requires.bins` — 列表；每一项都必须存在于 `PATH` 上。
- `requires.anyBins` — 列表；至少有一项必须存在于 `PATH` 上。
- `requires.env` — 列表；环境变量必须存在 **或** 在配置中提供。
- `requires.config` — 必须为真值的 `openclaw.json` 路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
- `install` — 可选数组，包含由 macOS Skills UI 使用的安装程序规格 (brew/node/go/uv/download)。

关于沙箱隔离的说明：

- `requires.bins` 在技能加载时于 **主机** 上进行检查。
- 如果代理处于沙箱隔离状态，二进制文件也必须存在于 **容器内部**。
  通过 `agents.defaults.sandbox.docker.setupCommand` 安装（或使用自定义镜像）。
  `setupCommand` 在容器创建后运行一次。
  软件包安装还需要网络出口、可写的根文件系统以及沙箱中的 root 用户。
  示例：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要 `summarize` CLI
  在沙箱容器中才能运行。

安装程序示例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

注意事项：

- 如果列出了多个安装程序，网关会选择 **一个** 首选项（可用时选择 brew，否则选择 node）。
- 如果所有安装程序均为 `download`，OpenClaw 将列出每个条目，以便您查看可用的构件。
- 安装程序规格可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
- Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager` (默认值：npm；选项：npm/pnpm/yarn/bun)。
  这仅影响 **技能安装**；Gateway(网关) 运行时仍应为 Node
  (不建议将 Bun 用于 WhatsApp/Telegram)。
- Go 安装：如果缺少 `go` 且 `brew` 可用，网关会先通过 Homebrew 安装 Go 并在可能的情况下将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到存档时自动），`stripComponents`，`targetDir`（默认 `~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，则该技能始终符合条件（除非在配置中被禁用或对于内置技能被 `skills.allowBundled` 阻止）。

## 配置覆盖（`~/.openclaw/openclaw.json`）

可以切换内置/托管技能并为其提供环境变量值：

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

注意：如果技能名称包含连字符，请用引号将键括起来（JSON5 允许使用带引号的键）。

如果您想在 OpenClaw 内部使用标准的图像生成/编辑功能，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不是使用内置技能。此处的技能示例用于自定义或第三方工作流。

对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。
对于原生图像生成/编辑，请使用 `image_generate` 配合 `agents.defaults.imageGenerationModel`。如果您选择 `openai/*`、`google/*`、
`fal/*` 或其他特定于提供商的图像模型，请同时添加该提供商的 auth/API 密钥。

默认情况下，配置键与 **技能名称** 匹配。如果技能定义了
`metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

规则：

- `enabled: false`：即使该技能是内置/已安装的，也会将其禁用。
- `env`：**仅当**进程中尚未设置该变量时才注入。
- `apiKey`：为声明了 `metadata.openclaw.primaryEnv` 的技能提供便利。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。
- `config`：用于自定义特定技能字段的可选包；自定义键必须位于此处。
- `allowBundled`：仅适用于**捆绑** Skills 的可选允许列表。如果设置，则列表中只有捆绑的 Skills 符合条件（托管/工作区 Skills 不受影响）。

## 环境注入（每次代理运行）

当代理运行开始时，OpenClaw：

1. 读取 Skills 元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用到
   `process.env`。
3. 使用**符合条件的** Skills 构建系统提示词。
4. 在运行结束后恢复原始环境。

这**仅限于代理运行**，而不是全局 Shell 环境。

## 会话快照（性能）

OpenClaw 会在**会话开始时**对符合条件的 Skills 进行快照，并在同一会话的后续轮次中重用该列表。对 Skills 或配置的更改将在下一个新会话中生效。

当启用了 Skills 监视程序或出现新的符合条件的远程节点时（见下文），Skills 也可以在会话中途刷新。可以将其视为**热重载**：刷新后的列表将在下一次代理轮次中被采用。

## 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 运行在 Linux 上，但连接了**macOS 节点**且**允许 `system.run`**（Exec 批准安全性未设置为 `deny`），则当该节点上存在所需的二进制文件时，macOS 可以将仅限 OpenClaw 的 Skills 视为符合条件。代理应通过 `nodes` 工具（通常是 `nodes.run`）执行这些 Skills。

这依赖于节点报告其命令支持以及通过 `system.run` 进行二进制探测。如果 macOS 节点随后脱机，Skills 仍然可见；在节点重新连接之前，调用可能会失败。

## Skills 监视程序（自动刷新）

默认情况下，OpenClaw 会监视 Skills 文件夹，并在 `SKILL.md` 文件更改时更新 Skills 快照。在 `skills.load` 下配置此项：

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

## Token 影响（Skills 列表）

当 Skills 符合条件时，OpenClaw 会将可用 Skills 的紧凑 XML 列表注入到系统提示词中（通过 `formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是确定性的：

- **基本开销（仅当 ≥1 个 Skills 时）：** 195 个字符。
- **每个技能：** 97 个字符 + 经过 XML 转义的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

注意事项：

- XML 转义会将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），从而增加长度。
- Token 计数取决于模型的分词器。粗略的 OpenAI 风格估算约为每 Token 4 个字符，因此除了您的实际字段长度外，每个技能 **97 个字符 ≈ 24 个 Token**。

## 托管技能的生命周期

OpenClaw 作为安装（npm 包或 OpenClaw.app）的一部分，提供了一组作为 **bundled skills**（捆绑技能）的基准技能。`~/.openclaw/skills` 用于本地覆盖（例如，在不更改捆绑副本的情况下固定/修补技能）。工作区技能由用户拥有，并且在名称冲突时会覆盖两者。

## 配置参考

完整的配置架构请参阅 [Skills config](/en/tools/skills-config)。

## 寻找更多技能？

浏览 [https://clawhub.com](https://clawhub.com）。

---
