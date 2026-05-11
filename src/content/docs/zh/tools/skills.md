---
summary: "Skills：托管 vs 工作区，准入规则，代理允许列表以及配置连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw 使用与 **[AgentSkills](https://agentskills.io)** 兼容的技能文件夹来教代理如何使用工具。每个技能是一个目录，其中包含一个带有 YAML frontmatter 和说明的 `SKILL.md`。OpenClaw 加载捆绑的技能以及可选的本地覆盖，并根据环境、配置和二进制文件的存在在加载时进行筛选。

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

## 每代理 vs 共享技能

在 **多代理** 设置中，每个代理都有自己的工作区：

| 范围          | 路径                                  | 可见于             |
| ------------- | ------------------------------------- | ------------------ |
| 每代理        | `<workspace>/skills`                  | 仅限该代理         |
| 项目代理      | `<workspace>/.agents/skills`          | 仅限该工作区的代理 |
| 个人代理      | `~/.agents/skills`                    | 该机器上的所有代理 |
| 共享托管/本地 | `~/.openclaw/skills`                  | 该机器上的所有代理 |
| 共享额外目录  | `skills.load.extraDirs`（最低优先级） | 该机器上的所有代理 |

在多个位置存在同名 → 最高来源获胜。工作区覆盖项目代理，覆盖个人代理，覆盖托管/本地，覆盖捆绑，覆盖额外目录。

## 代理技能允许列表

技能**位置**和技能**可见性**是独立的控制。位置/优先级决定同名技能的哪个副本获胜；代理允许列表决定代理实际可以使用哪些技能。

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
  <Accordion title="Allowlist rules">- 默认情况下省略 `agents.defaults.skills` 以允许不受限制的技能。 - 省略 `agents.list[].skills` 以继承 `agents.defaults.skills`。 - 设置 `agents.list[].skills: []` 表示无技能。 - 非空的 `agents.list[].skills` 列表是该智能体的**最终**集合——它不会与默认值合并。 - 有效的允许列表适用于提示构建、技能斜杠命令发现、沙盒同步和技能快照。</Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来附带自己的技能。插件技能在启用插件时加载。这是特定于工具的操作指南的正确位置，这些指南对于工具描述来说太长，但只要安装了插件就应该可用——例如，浏览器插件附带了一个 `browser-automation` 技能，用于多步骤浏览器控制。

插件技能目录被合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的捆绑、托管、智能体或工作区技能会覆盖它们。您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来限制它们。

有关发现/配置，请参阅 [插件](/zh/tools/plugin)；有关这些技能教授的工具接口，请参阅 [工具](/zh/tools)。

## 技能工坊

可选的实验性 **技能工坊** 插件可以根据在智能体工作期间观察到的可重用过程来创建或更新工作区技能。它默认情况下处于禁用状态，必须通过 `plugins.entries.skill-workshop` 显式启用。

技能工坊仅写入 `<workspace>/skills`，扫描生成的内容，支持待批准或自动安全写入，隔离不安全的提案，并在成功写入后刷新技能快照，以便新技能在无需重启 Gateway(网关) 的情况下即可用。

将其用于诸如*“下次验证 GIF 归属”*之类的更正，或者来之不易的工作流（如媒体 QA 检查清单）。从待批准开始；仅在审查其建议后，在受信任的工作区中使用自动写入。完整指南：[Skill Workshop 插件](/zh/plugins/skill-workshop)。

## ClawHub（安装和同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公共 Skills 注册表。使用原生 `openclaw skills` 命令进行发现/安装/更新，或使用单独的 `clawhub` CLI 进行发布/同步工作流。完整指南：[ClawHub](/zh/tools/clawhub)。

| 操作                    | 命令                                   |
| ----------------------- | -------------------------------------- |
| 将 skill 安装到工作区   | `openclaw skills install <skill-slug>` |
| 更新所有已安装的 skills | `openclaw skills update --all`         |
| 同步（扫描 + 发布更新） | `clawhub sync --all`                   |

原生 `openclaw skills install` 安装到活动工作区的 `skills/` 目录中。单独的 `clawhub` CLI 也会安装到当前工作目录下的 `./skills` 中（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下次会话中将其作为 `<workspace>/skills` 拾取。

## 安全性

<Warning>将第三方 skills 视为**不受信任的代码**。在启用之前请阅读它们。对于不受信任的输入和风险工具，首选沙箱隔离运行。有关代理端控件，请参阅[沙箱隔离](/zh/gateway/sandboxing)。</Warning>

- 工作区和额外目录的 skill 发现仅接受其解析后的真实路径保持在配置根目录内的 skill 根目录和 `SKILL.md` 文件。
- Gateway(网关) 支持的 skill 依赖项安装（`skills.install`、新手引导和 Skills 设置 UI）在执行安装程序元数据之前运行内置的危险代码扫描器。`critical` 发现结果默认会被阻止，除非调用方显式设置危险覆盖；可疑发现仍然仅发出警告。
- `openclaw skills install <slug>` 不同——它将 ClawHub skill 文件夹下载到工作区，并且不使用上述安装程序元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将机密信息注入到该 Agent 轮次的 **host** 进程中（而非沙箱）。请确保机密信息不会出现在提示词和日志中。

有关更广泛的威胁模型和检查清单，请参阅 [安全性](/zh/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClow 遵循 AgentSkills 规范来定义布局/意图。嵌入式 Agent 使用的解析器仅支持**单行** frontmatter 键；`metadata` 应为**单行 JSON 对象**。在指令中使用 `{baseDir}` 来引用 Skills 文件夹路径。

### 可选 frontmatter 键

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的 URL。也可通过 `metadata.openclaw.homepage` 支持。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  当 `true` 时，该 Skill 作为用户斜杠命令暴露。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  当 `true` 时，该 Skill 将从模型提示词中排除（仍可通过用户调用使用）。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令将绕过模型并直接分发给工具。
</ParamField>
<ParamField path="command-tool" type="string">
  设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具分发，将原始参数字符串转发给工具（无核心解析）。该工具使用 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 调用。
</ParamField>

## 筛选（加载时过滤器）

OpenClow 在加载时使用 `metadata`（单行 JSON）筛选 Skills：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的字段：

<ParamField path="always" type="boolean">
  当 `true` 时，始终包含该技能（跳过其他门控）。
</ParamField>
<ParamField path="emoji" type="string">
  macOS Skills UI 使用的可选表情符号。
</ParamField>
<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的可选 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  可选的平台列表。如果设置，该技能仅在这些操作系统上可用。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每一个都必须存在于 `PATH` 中。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少有一个必须存在于 `PATH` 中。
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
  macOS Skills UI 使用的可选安装程序规范（brew/node/go/uv/download）。
</ParamField>

如果不存在 `metadata.openclaw`，该技能始终可用（除非在配置中被禁用或对于捆绑技能被 `skills.allowBundled` 阻止）。

<Note>当 `metadata.openclaw` 不存在时，仍接受旧的 `metadata.clawdbot` 块，以便较早安装的技能保留其依赖门控和安装程序提示。新技能和更新的技能应使用 `metadata.openclaw`。</Note>

### 沙箱隔离说明

- 在技能加载时，会在 **宿主机** 上检查 `requires.bins`。
- 如果代理处于沙箱隔离状态，二进制文件也必须位于**容器内部**。可以通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）进行安装。`setupCommand` 在容器创建后运行一次。软件包安装还需要网络出口、可写的根文件系统以及沙箱中的 root 用户。
- 示例：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要在沙箱容器中安装 `summarize` CLI 才能在其中运行。

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
    - 如果列出了多个安装程序，Gateway 会选择一个首选选项（如果有 brew 则选 brew，否则选 node）。
    - 如果所有安装程序都是 `download`，OpenClaw 会列出每个条目，以便您查看可用的构件。
    - 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
    - Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。这仅影响技能安装；Gateway 运行时仍应为 Node — 不建议将 Gateway(网关) 用于 Bun/WhatsApp。
    - Telegram 支持的安装程序选择是偏好驱动的：当安装规范混合类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，Gateway(网关) 优先选择 Homebrew，然后是 `uv`，然后是配置的 node 管理器，最后是 `go` 或 `download` 等其他回退选项。
    - 如果每个安装规范都是 `download`，OpenClaw 将显示所有下载选项，而不是折叠为一个首选安装程序。
  </Accordion>
  <Accordion title="Per-installer details">
    - **Go installs:** if `go` is missing and `brew` is available, the gateway installs Go via Homebrew first and sets `GOBIN` to Homebrew's `bin` when possible.
    - **Download installs:** `url` (required), `archive` (`tar.gz` | `tar.bz2` | `zip`), `extract` (default: auto when archive detected), `stripComponents`, `targetDir` (default: `~/.openclaw/tools/<skillKey>`).
  </Accordion>
</AccordionGroup>

## Config overrides

Bundled and managed skills can be toggled and supplied with env values
under `skills.entries` in `~/.openclaw/openclaw.json`:

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
  `false` disables the skill even if it is bundled or installed.
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  Convenience for skills that declare `metadata.openclaw.primaryEnv`. Supports plaintext or SecretRef.
</ParamField>
<ParamField path="env" type="Record<string, string>">
  Injected only if the variable is not already set in the process.
</ParamField>
<ParamField path="config" type="object">
  Optional bag for custom per-skill fields. Custom keys must live here.
</ParamField>
<ParamField path="allowBundled" type="string[]">
  Optional allowlist for **bundled** skills only. If set, only bundled skills in the list are eligible (managed/workspace skills unaffected).
</ParamField>

If the skill name contains hyphens, quote the key (JSON5 allows quoted
keys). Config keys match the **skill name** by default — if a skill
defines `metadata.openclaw.skillKey`, use that key under `skills.entries`.

<Note>对于 OpenClaw 内置的图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不是 捆绑的 skill。此处的 skill 示例用于自定义或第三方 工作流。对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。如果您选择 `openai/*`、`google/*`、 `fal/*` 或其他特定提供商的图像模型，请同时添加该提供商的 auth/OpenClaw 密钥。</Note>

## 环境变量注入

当 agent 运行开始时，OpenClaw：

1. 读取 skill 元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用于 `process.env`。
3. 使用**符合条件**的 skills 构建系统提示词。
4. 运行结束后恢复原始环境。

环境变量注入**仅限于 agent 运行期间**，而非全局 shell
环境。

对于捆绑的 `claude-cli` 后端，OpenClaw 还会将相同的符合条件的快照生成为临时的 Claude Code 插件，并通过 `--plugin-dir` 传递。这样 Claude Code 可以使用其原生 skill 解析器，而 OpenClaw 仍然拥有优先级、per-agent 允许列表、门控以及
`skills.entries.*` env/API 密钥注入权。其他 CLI 后端仅使用提示词目录。

## 快照与刷新

OpenClaw 会在**会话开始时**对符合条件的 skills 进行快照，
并在同一会话的后续轮次中复用该列表。对 skills 或配置的更改将在下一次新会话中生效。

Skills 可以在会话中间通过以下两种情况刷新：

- Skills 监视器已启用。
- 出现新的符合条件的远程节点。

可以将其视为**热重载**：刷新后的列表将在下一个 agent 轮次中被拾取。如果该会话的有效 agent skill 允许列表发生变化，OpenClaw 会刷新快照，以确保可见的 skills 与当前 agent 保持一致。

### Skills 监视器

默认情况下，OpenClaw 会监视 skill 文件夹，并在 `SKILL.md` 文件更改时更新 skills 快照。
在 `skills.load` 下进行配置：

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

### 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 在 Linux 上运行，但连接了一个 **macOS 节点** 且允许 `system.run`（未将 Exec approvals 安全性设置为 `deny`），当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为可用。代理应通过 `exec` 工具并带有 `host=node` 来执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.which` 或 `system.run` 进行的二进制探测。离线节点**不会**使仅限远程的技能可见。如果已连接的节点停止响应二进制探测，OpenClaw 将清除其缓存的二进制匹配项，以便代理不再看到当前无法在该处运行的技能。

## Token 影响

当技能符合条件时，OpenClaw 会将可用技能的紧凑 XML 列表注入系统提示中（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是确定性的：

- **基础开销**（仅当有 ≥1 个技能时）：195 个字符。
- **每个技能：** 97 个字符 + 经过 XML 转义的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义将 `& < > " '` 扩展为实体（如 `&amp;`、`&lt;` 等），从而增加长度。Token 计数因模型分词器而异。粗略的 OpenAI 风格估算约为每 token 4 个字符，因此每个技能 **97 个字符 ≈ 24 个 token**，外加您实际的字段长度。

## 托管技能生命周期

OpenClaw 随安装程序（npm 包或 OpenClaw.app）附带了一套基准技能集，作为 **bundled skills**（捆绑技能）。`~/.openclaw/skills` 旨在用于本地覆盖——例如，在不更改捆绑副本的情况下固定或修补技能。工作区技能属于用户所有，在名称冲突时会覆盖前两者。

## 寻找更多技能？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置架构：[Skills config](/zh/tools/skills-config)。

## 相关

- [ClawHub](/zh/tools/clawhub) — 公共技能注册表
- [Creating skills](/zh/tools/creating-skills) — 构建自定义技能
- [Plugins](/zh/tools/plugin) — 插件系统概览
- [Skill Workshop plugin](/zh/plugins/skill-workshop) — 根据代理工作生成技能
- [Skills config](/zh/tools/skills-config) — 技能配置参考
- [Slash commands](/zh/tools/slash-commands) — 所有可用的斜杠命令
