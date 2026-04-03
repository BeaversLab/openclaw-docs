---
summary: "技能：托管与工作区、筛选规则以及配置/环境连线"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能 (OpenClaw)

OpenClaw 使用与 **[AgentSkills](https://agentskills.io)** 兼容的 skills 文件夹来教代理如何使用工具。每个 skill 是一个包含 `SKILL.md` 的目录，其中带有 YAML frontmatter 和说明。OpenClaw 加载 **bundled skills** 以及可选的本地覆盖，并根据环境、配置和二进制文件的存在在加载时进行过滤。

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

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来提供自己的 skills。当插件启用时，插件 skills 会被加载。目前，这些目录被合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的 bundled、managed、agent 或 workspace skill 会覆盖它们。
您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来限制它们。有关发现/配置，请参阅 [Plugins](/en/tools/plugin)；有关这些 skills 教授的工具界面，请参阅 [Tools](/en/tools)。

## ClawHub（安装 + 同步）

ClawHub 是 OpenClaw 的公共 skills 注册表。请访问 [https://clawhub.com](https://clawhub.com) 进行浏览。使用原生 `openclaw skills` 命令来发现/安装/更新 skills，或者在需要发布/同步工作流时使用单独的 `clawhub` CLI。
完整指南：[ClawHub](/en/tools/clawhub)。

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
- 对于不受信任的输入和风险工具，首选沙箱隔离运行。请参阅 [沙箱隔离](/en/gateway/sandboxing)。
- 工作区和额外目录技能发现仅接受其解析后的真实路径保持在配置根目录内的技能根目录和 `SKILL.md` 文件。
- 由 Gateway(网关) 支持的 skill 依赖安装（`skills.install`、新手引导 和 Skills 设置 UI）在执行安装程序元数据之前会运行内置的危险代码扫描器。默认情况下，`critical` 的发现会阻止安装，除非调用者显式设置了危险覆盖；可疑的发现仍然只会发出警告。
- `openclaw skills install <slug>` 不同：它将 ClawHub skill 文件夹下载到工作区中，并且不使用上述的安装程序元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将机密信息注入到该代理轮次的 **host** 进程中（而非沙箱）。请勿将机密信息放入提示和日志中。
- 有关更广泛的威胁模型和检查清单，请参阅 [Security](/en/gateway/security)。

## 格式 (AgentSkills + Pi 兼容)

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

备注：

- 我们在布局/意图方面遵循 AgentSkills 规范。
- 嵌入式代理使用的解析器仅支持**单行** frontmatter 键。
- `metadata` 应该是一个**单行 JSON 对象**。
- 在指令中使用 `{baseDir}` 来引用技能文件夹路径。
- 可选的 frontmatter 键：
  - `homepage` — 在 macOS Skills UI 中显示为“Website”的 URL（也可通过 `metadata.openclaw.homepage` 支持）。
  - `user-invocable` — `true|false`（默认值：`true`）。当为 `true` 时，该技能作为用户斜杠命令公开。
  - `disable-model-invocation` — `true|false`（默认值：`false`）。当为 `true` 时，该技能将从模型提示词中排除（仍可通过用户调用使用）。
  - `command-dispatch` — `tool`（可选）。当设置为 `tool` 时，斜杠命令将绕过模型并直接分派到工具。
  - `command-tool` — 当设置了 `command-dispatch: tool` 时要调用的工具名称。
  - `command-arg-mode` — `raw`（默认值）。对于工具分派，将原始参数字符串转发给工具（无核心解析）。

    工具通过以下参数调用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 筛选（加载时过滤器）

OpenClaw **在加载时筛选技能**，使用 `metadata`（单行 JSON）：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的字段：

- `always: true` — 始终包含该技能（跳过其他筛选）。
- `emoji` — 由 macOS Skills UI 使用的可选表情符号。
- `homepage` — 在 macOS Skills UI 中显示为“Website”的可选 URL。
- `os` — 平台的可选列表（`darwin`、`linux`、`win32`）。如果设置，该技能仅在这些操作系统上可用。
- `requires.bins` — 列表；每一项都必须存在于 `PATH` 上。
- `requires.anyBins` — 列表；至少有一项必须存在于 `PATH` 上。
- `requires.env` — 列表；环境变量必须存在**或者**在配置中提供。
- `requires.config` — 必须为真值的 `openclaw.json` 路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
- `install` — 可选的安装程序规范数组，供 macOS Skills UI 使用 (brew/node/go/uv/download)。

关于沙箱隔离的说明：

- 在技能加载时，会在 **主机** 上检查 `requires.bins`。
- 如果代理处于沙箱隔离状态，二进制文件也必须存在于**容器内部**。
  通过 `agents.defaults.sandbox.docker.setupCommand` 安装（或使用自定义镜像）。
  `setupCommand` 在容器创建后运行一次。
  软件包安装还需要网络出站访问、可写的根文件系统以及沙箱中的 root 用户。
  示例：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要在沙箱容器中运行 `summarize` CLI

安装程序示例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

说明：

- 如果列出了多个安装程序，网关会选择**一个**首选选项（如果有 brew 则优先 brew，否则选择 node）。
- 如果所有安装程序都是 `download`，OpenClaw 会列出每个条目，以便您查看可用的构建产物。
- 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
- Node 安装会遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。
  这仅影响**技能安装**；Gateway(网关) 运行时仍应为 Node
  (对于 Gateway(网关)/Bun，不建议使用 WhatsApp)。
- Go 安装：如果缺少 `go` 且有 `brew`，网关会先通过 Homebrew 安装 Go，并尽可能将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到归档文件时自动设置），`stripComponents`，`targetDir`（默认 `~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，则该技能始终符合条件（除非在配置中禁用或被 `skills.allowBundled` 针对捆绑技能阻止）。

## 配置覆盖（`~/.openclaw/openclaw.json`）

捆绑/托管技能可以切换并提供环境变量值：

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

注意：如果技能名称包含连字符，请对键加引号（JSON5 允许带引号的键）。

如果你想在 OpenClaw 内部进行常规图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不是使用捆绑技能。此处的技能示例用于自定义或第三方工作流。

对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。
对于原生图像生成/编辑，请使用 `image_generate` 配合
`agents.defaults.imageGenerationModel`。如果你选择 `openai/*`、`google/*`、
`fal/*` 或其他特定于提供商的图像模型，也请添加该提供商的 auth/API 密钥。

默认情况下，配置键与 **技能名称** 匹配。如果技能定义了
`metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

规则：

- `enabled: false` 禁用该技能，即使它已被捆绑/安装。
- `env`：仅当变量尚未在进程中设置时才注入。
- `apiKey`：为声明 `metadata.openclaw.primaryEnv` 的技能提供的便利。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。
- `config`：用于自定义每个技能字段的可选包；自定义键必须位于此处。
- `allowBundled`：仅针对 **bundled** Skills 的可选允许列表。如果设置，则仅
  列表中的 bundled Skills 符合条件（managed/workspace Skills 不受影响）。

## Environment injection（per agent run）

当 agent run 开始时，OpenClaw：

1. 读取 skill 元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用于
   `process.env`。
3. 使用 **eligible** Skills 构建系统提示词。
4. 在 run 结束后恢复原始环境。

此范围**仅限于 agent run**，而非全局 shell 环境。

## Session snapshot (performance)

OpenClaw 会在**会话开始时**对符合条件的 Skills 创建快照，并在同一会话的后续轮次中重用该列表。对 Skills 或配置的更改将在下一个新会话中生效。

当启用 Skills 监视程序或出现新的符合条件的远程节点时（见下文），Skills 也可以在会话期间刷新。可以将这视为 **hot reload**（热重载）：刷新后的列表将在下一个 agent 轮次中被采用。

## Remote macOS nodes (Linux gateway)

如果 Gateway(网关) 运行在 Linux 上，但连接了一个 **macOS node** 且**允许 `system.run`**（Exec approvals 安全未设置为 `deny`），当该节点上存在所需的二进制文件时，%%PH:GLOSSARY:201:99438cfb\*\* 可以将仅限 OpenClaw 的 Skills 视为符合条件的。Agent 应通过带有 `host=node` 的 `exec` 工具执行这些 Skills。

这依赖于节点报告其命令支持以及通过 `system.run` 进行二进制探测。如果 macOS 节点随后离线，Skills 仍然可见；调用可能会失败，直到节点重新连接。

## Skills watcher (auto-refresh)

默认情况下，OpenClaw 会监视 Skills 文件夹，并在 `SKILL.md` 文件更改时更新 Skills 快照。可以在 `skills.load` 下进行配置：

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

当 Skills 符合条件时，OpenClaw 会将可用 Skills 的紧凑 XML 列表注入到系统提示词中（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是确定的：

- **Base overhead（仅当 ≥1 skill 时）：** 195 个字符。
- **每个技能：** 97 个字符加上经过 XML 转义的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

备注：

- XML 转义会将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），从而增加长度。
- Token 计数因模型分词器而异。粗略估计 OpenAI 风格约为每 token 4 个字符，因此除实际字段长度外，**97 个字符 ≈ 24 个 token**。

## 托管技能生命周期

OpenClaw 附带一组基线技能作为 **打包技能** 的一部分
安装（npm 包或 OpenClaw.app）。`~/.openclaw/skills` 用于本地
覆盖（例如，固定/修补技能而不更改打包
副本）。工作区技能归用户所有，并在名称冲突时覆盖两者。

## 配置参考

有关完整的配置架构，请参阅 [Skills 配置](/en/tools/skills-config)。

## 寻找更多技能？

浏览 [https://clawhub.com](https://clawhub.com)。

---

## 相关

- [创建 Skills](/en/tools/creating-skills) — 构建自定义技能
- [Skills 配置](/en/tools/skills-config) — 技能配置参考
- [斜杠命令](/en/tools/slash-commands) — 所有可用的斜杠命令
- [插件](/en/tools/plugin) — 插件系统概述
