---
summary: "Skills：托管与工作区、筛选规则以及配置/环境连接"
read_when:
  - 添加或修改 Skills
  - 更改 Skill 筛选或加载规则
title: "Skills"
---

# Skills (OpenClaw)

OpenClaw 使用 **[AgentSkills](https://agentskills.io)-兼容**的 skill 文件夹来教代理如何使用工具。每个 skill 是一个包含 `SKILL.md` 的目录，其中包含 YAML frontmatter 和指令。OpenClaw 加载 **bundled skills** 以及可选的本地覆盖，并在加载时根据环境、配置和二进制文件的存在对其进行筛选。

## 位置和优先级

Skills 从 **三个** 地方加载：

1. **Bundled skills**：随安装附送（npm 包或 OpenClaw.app）
2. **托管/本地 skills**：`~/.openclaw/skills`
3. **工作区 skills**：`<workspace>/skills`

如果 skill 名称冲突，优先级为：

`<workspace>/skills`（最高）→ `~/.openclaw/skills` → bundled skills（最低）

此外，您可以通过 `~/.openclaw/openclaw.json` 中的
`skills.load.extraDirs` 配置额外的 skill 文件夹（最低优先级）。

## 每个代理与共享 Skills

在 **多代理** 设置中，每个代理都有自己的工作区。这意味着：

- **每个代理的 skills** 仅位于该代理的 `<workspace>/skills` 中。
- **共享 skills** 位于 `~/.openclaw/skills`（托管/本地）中，并对同一台机器上的 **所有代理** 可见。
- 如果您希望多个代理使用通用的 skills 包，也可以通过 `skills.load.extraDirs`（最低优先级）添加 **共享文件夹**。

如果同一 skill 名称存在于多个位置，则适用常规优先级：工作区优先，然后是托管/本地，最后是附带。

## 插件 + Skills

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来附带自己的 skills。插件 skills 在启用插件时加载，并参与正常的 skill 优先级规则。您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 对其进行筛选。有关发现/配置，请参阅 [Plugins](/zh/tools/plugin)；有关这些 skills 所教授的工具界面，请参阅 [Tools](/zh/tools)。

## ClawHub（安装 + 同步）

ClawHub 是 OpenClaw 的公共 Skills 注册表。在 [https://clawhub.com](https://clawhub.com) 浏览。使用它来发现、安装、更新和备份 Skills。完整指南：[ClawHub](/zh/tools/clawhub)。

常用流程：

- 将 Skill 安装到您的工作区：
  - `clawhub install <skill-slug>`
- 更新所有已安装的 Skills：
  - `clawhub update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

默认情况下，`clawhub` 会安装到当前工作目录下的 `./skills` 中（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其作为 `<workspace>/skills` 加载。

## 安全说明

- 将第三方 Skills 视为**不受信任的代码**。在启用之前请阅读它们。
- 对于不受信任的输入和有风险的工具，首选沙箱隔离运行。参见 [沙箱隔离](/zh/gateway/sandboxing)。
- 工作区和额外目录的 Skills 发现仅接受其解析的真实路径保持在配置根目录内的 Skills 根目录和 `SKILL.md` 文件。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会将密钥注入到该 Agent 轮次的**宿主**进程（而非沙箱）中。请勿将密钥泄露在提示和日志中。
- 有关更广泛的威胁模型和检查清单，请参见 [Security](/zh/gateway/security)。

## 格式（AgentSkills + Pi 兼容）

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

注意：

- 我们遵循 AgentSkills 规范来进行布局/意图定义。
- 嵌入式 Agent 使用的解析器仅支持**单行**前置元数据键。
- `metadata` 应该是一个**单行 JSON 对象**。
- 在指令中使用 `{baseDir}` 来引用 Skill 文件夹路径。
- 可选前置元数据键：
  - `homepage` — 在 macOS Skills UI 中显示为“Website”的 URL（也通过 `metadata.openclaw.homepage` 支持）。
  - `user-invocable` — `true|false`（默认值：`true`）。当为 `true` 时，该 Skill 将作为用户斜杠命令公开。
  - `disable-model-invocation` — `true|false`（默认：`false`）。当 `true` 时，该技能将从模型提示词中排除（仍可通过用户调用使用）。
  - `command-dispatch` — `tool`（可选）。当设置为 `tool` 时，斜杠命令将绕过模型，直接分发给工具。
  - `command-tool` — 当设置 `command-dispatch: tool` 时要调用的工具名称。
  - `command-arg-mode` — `raw`（默认）。对于工具分发，将原始参数字符串转发给工具（无核心解析）。

    工具使用以下参数调用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 筛选（加载时过滤器）

OpenClaw 在加载时使用 `metadata`（单行 JSON）筛选技能：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
      },
  }
---
```

`metadata.openclaw` 下的字段：

- `always: true` — 始终包含该技能（跳过其他筛选条件）。
- `emoji` — macOS Skills UI 使用的可选表情符号。
- `homepage` — 在 macOS Skills UI 中显示为“Website”的可选 URL。
- `os` — 平台的可选列表（`darwin`、`linux`、`win32`）。如果设置，该技能仅在这些操作系统上可用。
- `requires.bins` — 列表；每个都必须存在于 `PATH` 上。
- `requires.anyBins` — 列表；至少有一个必须存在于 `PATH` 上。
- `requires.env` — 列表；环境变量必须存在**或**在配置中提供。
- `requires.config` — 必须为真值的 `openclaw.json` 路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
- `install` — macOS Skills UI 使用的安装程序规范的可选数组（brew/node/go/uv/download）。

关于沙箱隔离的说明：

- `requires.bins` 在技能加载时于**主机**上进行检查。
- 如果 Agent 处于沙箱隔离状态，二进制文件也必须存在于**容器内部**。
  通过 `agents.defaults.sandbox.docker.setupCommand` 安装（或使用自定义镜像）。
  `setupCommand` 在容器创建后运行一次。
  软件包安装还需要网络出站、可写的根文件系统以及沙箱中的 root 用户。
  例如：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要 `summarize` CLI
  在沙箱容器中才能在那里运行。

安装程序示例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---
```

注意事项：

- 如果列出了多个安装程序，Gateway 会选择一个**单一**的首选选项（如果可用则选择 brew，否则选择 node）。
- 如果所有安装程序都是 `download`，OpenClaw 将列出每个条目，以便您可查看可用的构建产物。
- 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
- Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。
  这仅影响**技能安装**；Gateway(网关) 运行时仍应为 Node
  （对于 Bun/WhatsApp，不建议使用 Telegram）。
- Go 安装：如果 `go` 缺失且 `brew` 可用，Gateway 会先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必需）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认：检测到存档时为自动）、`stripComponents`、`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，则该技能始终符合条件（除非
在配置中禁用或被 `skills.allowBundled` 阻止，针对捆绑技能）。

## 配置覆盖 (`~/.openclaw/openclaw.json`)

可以切换捆绑/托管的技能并为其提供环境变量值：

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

如果您希望在 OpenClaw 内部进行内置图像生成/编辑，请使用带有 `agents.defaults.imageGenerationModel` 的核心 `image_generate` 工具，而不是捆绑的 Skill。这里的 Skill 示例适用于自定义或第三方工作流。

默认情况下，配置键与 **skill name** 匹配。如果 Skill 定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

规则：

- `enabled: false`：即使 Skill 已捆绑/安装，也会将其禁用。
- `env`：仅当进程中尚未设置该变量时才注入。
- `apiKey`：为声明了 `metadata.openclaw.primaryEnv` 的 Skill 提供便利。
  支持纯文本字符串或 SecretRef 对象 (`{ source, provider, id }`)。
- `config`：用于自定义 per-skill 字段的可选容器；自定义键必须位于此处。
- `allowBundled`：仅适用于 **bundled** Skill 的可选允许列表。如果设置，则只有列表中的捆绑 Skill 符合条件（托管/工作区 Skill 不受影响）。

## Environment injection (per agent run)

当 agent run 开始时，OpenClaw：

1. 读取 Skill 元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用于
   `process.env`。
3. 使用 **eligible** skills 构建系统提示。
4. 运行结束后恢复原始环境。

此范围仅限于 **agent run**，而不是全局 shell 环境。

## Session snapshot (performance)

OpenClaw 在 **会话开始时** 对符合条件的 Skills 进行快照，并在同一会话的后续轮次中重用该列表。对 Skills 或配置的更改将在下一个新会话中生效。

当启用 Skills 监视程序或出现新的符合条件的远程节点时（见下文），Skills 也可以在会话中途刷新。可以将此视为 **热重新加载**：刷新后的列表将在下一个 agent 轮次中被采用。

## Remote macOS nodes (Linux gateway)

如果 Gateway(网关) 在 Linux 上运行，但连接了一个 **macOS 节点** 并**允许 `system.run`**（执行批准安全性未设置为 `deny`），则当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。代理应通过 `nodes` 工具（通常是 `nodes.run`）执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.run` 进行的二进制探测。如果 macOS 节点稍后下线，技能仍然可见；调用可能会失败，直到节点重新连接。

## Skills watcher (auto-refresh)

默认情况下，OpenClaw 会监视技能文件夹，并在 `SKILL.md` 文件更改时更新技能快照。可以在 `skills.load` 下配置此功能：

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

## Token impact (skills list)

当技能符合条件时，OpenClaw 会将可用技能的紧凑 XML 列表注入到系统提示中（通过 `formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是确定性的：

- **Base overhead (only when ≥1 skill):** 195 个字符。
- **Per skill:** 97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

Formula (characters):

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

Notes:

- XML 转义将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），从而增加长度。
- Token 计数因模型分词器而异。粗略估计 OpenAI 风格约为每 token 4 个字符，因此每个技能加上实际字段长度，**97 个字符 ≈ 24 个 token**。

## Managed skills lifecycle

OpenClaw 随附了一套作为 **bundled skills** 的基线技能集，作为安装（npm 包或 OpenClaw.app）的一部分。存在 `~/.openclaw/skills` 用于本地覆盖（例如，固定/修补技能而不更改捆绑副本）。工作区技能是用户拥有的，在名称冲突时会覆盖两者。

## Config reference

有关完整的配置架构，请参阅 [Skills config](/zh/tools/skills-config)。

## Looking for more skills?

浏览 [https://clawhub.com](https://clawhub.com)。

---

import en from "/components/footer/en.mdx";

<en />
