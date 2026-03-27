---
summary: "技能：托管与工作区、筛选规则以及配置/环境连线"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能 (OpenClaw)

OpenClaw 使用与 **[AgentSkills](https://agentskills.io)** 兼容的技能文件夹来教代理如何使用工具。每个技能都是一个目录，其中包含一个带有 YAML frontmatter 和说明的 `SKILL.md` 文件。OpenClaw 会加载**捆绑的技能**以及可选的本地覆盖，并根据环境、配置和二进制文件的存在情况在加载时对其进行筛选。

## 位置和优先级

技能从**三个**位置加载：

1. **内置技能**：随安装包（npm 包或 OpenClaw.app）一起提供
2. **托管/本地技能**：`~/.openclaw/skills`
3. **工作区技能**：`<workspace>/skills`

如果技能名称冲突，优先级为：

`<workspace>/skills`（最高优先级）→ `~/.openclaw/skills` → 内置技能（最低优先级）

此外，您可以通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 配置额外的技能文件夹（最低优先级）。

## 每代理与共享技能

在**多代理**设置中，每个代理都有自己的工作区。这意味着：

- **每个智能体的技能** 位于该智能体专用的 `<workspace>/skills` 中。
- **共享技能** 位于 `~/.openclaw/skills`（托管/本地）中，对同一台机器上的 **所有代理** 可见。
- **共享文件夹** 也可以通过 `skills.load.extraDirs` 添加（优先级最低），如果您想要一个由多个代理使用的通用技能包。

如果相同的技能名称存在于多个位置，则适用通常的优先级：工作区优先，然后是托管/本地，最后是捆绑。

## 插件 + 技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录来附带自己的技能（路径相对于插件根目录）。插件技能在插件启用时加载，并参与正常的技能优先级规则。您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 对其进行筛选。请参阅 [Plugins](/zh/tools/plugin) 了解发现/配置，并参阅 [Tools](/zh/tools) 了解这些技能所教授的工具界面。

## ClawHub (安装 + 同步)

ClawHub 是 OpenClaw 的公共技能注册表。请在 [https://clawhub.com](https://clawhub.com) 浏览。使用原生的 `openclaw skills` 命令来发现/安装/更新技能，或者在需要发布/同步工作流时使用单独的 `clawhub` CLI。
完整指南：[ClawHub](/zh/tools/clawhub)。

常用流程：

- 将技能安装到您的工作区：
  - `openclaw skills install <skill-slug>`
- 更新所有已安装的技能：
  - `openclaw skills update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

原生的 `openclaw skills install` 会安装到活动工作区的 `skills/` 目录中。单独的 `clawhub` CLI 也会安装到当前工作目录下的 `./skills` 中（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其作为 `<workspace>/skills` 拾取。

## 安全说明

- 将第三方 Skills 视为**不受信任的代码**。在启用前请阅读它们。
- 对于不受信任的输入和有风险的工具，首选沙箱隔离运行。请参阅 [沙箱隔离](/zh/gateway/sandboxing)。
- 工作区和额外目录技能发现仅接受其解析的 realpath 保留在配置根目录内的技能根目录和 `SKILL.md` 文件。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将机密信息注入到该代理轮次的**宿主**进程中（而不是沙箱中）。请勿将机密信息放入提示和日志中。
- 有关更广泛的威胁模型和清单，请参阅 [Security](/zh/gateway/security)。

## 格式（AgentSkills + Pi 兼容）

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

注意事项：

- 我们遵循 AgentSkills 规范进行布局/意图设计。
- 嵌入式 Agent 使用的解析器仅支持**单行** frontmatter 键。
- `metadata` 应该是一个**单行 JSON 对象**。
- 在指令中使用 `{baseDir}` 来引用技能文件夹路径。
- 可选的 frontmatter 键：
  - `homepage` — 在 macOS Skills UI 中显示为“Website”的 URL（也支持通过 `metadata.openclaw.homepage`）。
  - `user-invocable` — `true|false`（默认：`true`）。当设置为 `true` 时，该技能将作为用户斜杠命令公开。
  - `disable-model-invocation` — `true|false`（默认：`false`）。当设置为 `true` 时，该技能将从模型提示中排除（仍可通过用户调用使用）。
  - `command-dispatch` — `tool`（可选）。当设置为 `tool` 时，斜杠命令将绕过模型并直接分派到工具。
  - `command-tool` — 设置 `command-dispatch: tool` 时要调用的工具名称。
  - `command-arg-mode` — `raw`（默认）。对于工具分派，将原始参数字符串转发给工具（无核心解析）。

    工具使用以下参数调用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 筛选（加载时过滤器）

OpenClaw **在加载时过滤技能**，使用 `metadata`（单行 JSON）：

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

- `always: true` — 始终包含该技能（跳过其他关卡）。
- `emoji` — macOS Skills UI 使用的可选表情符号。
- `homepage` — 在 macOS Skills UI 中显示为“Website”的可选 URL。
- `os` — 平台的可选列表（`darwin`、`linux`、`win32`）。如果设置，该技能仅在这些操作系统上可用。
- `requires.bins` — 列表；每个都必须存在于 `PATH` 上。
- `requires.anyBins` — 列表；至少有一个必须存在于 `PATH` 上。
- `requires.env` — 列表；环境变量必须存在**或**在配置中提供。
- `requires.config` — 必须为真值的 `openclaw.json` 路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
- `install` — 由 macOS Skills UI 使用的安装程序规范的可选数组 (brew/node/go/uv/download)。

关于沙箱隔离的说明：

- `requires.bins` 在技能加载时于 **主机** 上进行检查。
- 如果代理处于沙箱隔离状态，二进制文件也必须存在于**容器内部**。
  通过 `agents.defaults.sandbox.docker.setupCommand` 安装它（或使用自定义镜像）。
  `setupCommand` 在容器创建后运行一次。
  软件包安装还需要网络出站、可写的根文件系统以及沙箱中的 root 用户。
  例如：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要 `summarize` CLI
  在沙箱容器中才能运行。

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

说明：

- 如果列出了多个安装程序，网关会选择**一个**首选选项（优先 brew，否则为 node）。
- 如果所有安装程序都是 `download`，OpenClaw 会列出每个条目，以便您查看可用的产物。
- 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
- Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。
  这仅影响 **技能安装**；Gateway 运行时仍应为 Node
  （不建议将 Bun 用于 WhatsApp/Telegram）。
- Go 安装：如果缺少 `go` 且 `brew` 可用，网关会首先通过 Homebrew 安装 Go，并尽可能将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必需），`archive` (`tar.gz` | `tar.bz2` | `zip`)，`extract`（默认：检测到归档文件时为自动），`stripComponents`，`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，该技能始终符合条件（除非在配置中被禁用或对于内置技能被 `skills.allowBundled` 阻止）。

## 配置覆盖 (`~/.openclaw/openclaw.json`)

可以切换捆绑/托管的技能并为其提供环境值：

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

如果你想要在 OpenClaw 内部进行原生图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不要使用内置技能。此处的技能示例适用于自定义或第三方工作流。

对于原生图像分析，请使用带有 `agents.defaults.imageModel` 的 `image` 工具。
对于原生图像生成/编辑，请使用带有 `agents.defaults.imageGenerationModel` 的 `image_generate`。如果你选择 `openai/*`、`google/*`、
`fal/*` 或其他提供商特定的图像模型，请添加该提供商的 auth/API 密钥。

默认情况下，配置键与 **技能名称** 匹配。如果技能定义了
`metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

规则：

- `enabled: false` 禁用该技能，即使它是内置/已安装的。
- `env`：**仅当** 变量尚未在进程中设置时才注入。
- `apiKey`：为声明了 `metadata.openclaw.primaryEnv` 的技能提供便利。
  支持纯文本字符串或 SecretRef 对象 (`{ source, provider, id }`)。
- `config`：用于自定义每技能字段的可选包；自定义键必须位于此处。
- `allowBundled`：仅针对 **内置** 技能的可选允许列表。如果设置，则只有
  列表中的内置技能符合条件（托管/工作区技能不受影响）。

## 环境注入（每次代理运行）

当代理运行开始时，OpenClaw 会：

1. 读取技能元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用到
   `process.env`。
3. 使用 **符合条件的** 技能构建系统提示。
4. 运行结束后恢复原始环境。

这是 **仅限于代理运行** 的范围，而不是全局 Shell 环境。

## 会话快照（性能）

OpenClaw 会在**会话开始时**捕获符合条件的 Skills 列表，并在同一会话的后续轮次中复用该列表。对 Skills 或配置的更改将在下一个新会话中生效。

当启用 Skills 监视器或出现新的符合条件的远程节点时（见下文），Skills 也可以在会话中途刷新。可以将其视为**热重新加载**：刷新后的列表将在下一个代理轮次中被采用。

## 远程 macOS 节点 (Linux 网关)

如果 Gateway 在 Linux 上运行，但连接了一个**macOS 节点**且**允许 `system.run`**（执行批准安全性未设置为 `deny`），只要该节点上存在所需的二进制文件，OpenClaw 就可以将仅限 macOS 的 Skills 视为符合条件。代理应通过 `nodes` 工具（通常是 `nodes.run`）执行这些 Skills。

这依赖于节点报告其命令支持以及通过 `system.run` 进行的二进制探测。如果 macOS 节点随后离线，Skills 仍然可见；在节点重新连接之前，调用可能会失败。

## Skills 监视器（自动刷新）

默认情况下，OpenClaw 会监视 Skills 文件夹，并在 `SKILL.md` 文件更改时更新 Skills 快照。可以在 `skills.load` 下配置此项：

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

当 Skills 符合条件时，OpenClaw 会将可用 Skills 的紧凑 XML 列表注入到系统提示中（通过 `formatSkillsForPrompt` 中的 `pi-coding-agent`）。成本是确定的：

- **基础开销（仅当 ≥1 个 Skills 时）：** 195 个字符。
- **每个 Skills：** 97 个字符 + 经过 XML 转义的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

备注：

- XML 转义会将 `& < > " '` 扩展为实体（如 `&amp;`、`&lt;` 等），从而增加长度。
- Token 计数因模型分词器而异。粗略的 OpenAI 风格估算约为每 4 个字符对应 1 个 token，因此除实际字段长度外，**97 个字符 ≈ 每个 Skills 24 个 token**。

## 托管 Skills 生命周期

OpenClaw 在安装过程中（npm 包或 OpenClaw.app）附带了作为 **bundled skills** 的基准技能集。`~/.openclaw/skills` 用于本地覆盖（例如，固定/修补技能而不更改捆绑副本）。工作区技能由用户拥有，并且在名称冲突时会覆盖两者。

## 配置参考

有关完整的配置架构，请参阅 [Skills config](/zh/tools/skills-config)。

## 寻找更多技能？

浏览 [https://clawhub.com](https://clawhub.com)。

---

import zh from "/components/footer/zh.mdx";

<zh />
