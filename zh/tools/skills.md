---
summary: "技能：托管与工作区、筛选规则以及配置/环境连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能 (OpenClaw)

OpenClaw 使用与 **[AgentSkills](https://agentskills.io)** 兼容的技能文件夹来教代理如何使用工具。每个技能是一个包含带有 YAML frontmatter 和指令的 `SKILL.md` 的目录。OpenClaw 加载**内置技能**以及可选的本地覆盖项，并根据环境、配置和二进制文件的存在在加载时进行筛选。

## 位置和优先级

技能从**三个**位置加载：

1. **内置技能**：随安装包（npm 包或 OpenClaw.app）一起提供
2. **托管/本地技能**：`~/.openclaw/skills`
3. **工作区技能**：`<workspace>/skills`

如果技能名称冲突，优先级为：

`<workspace>/skills`（最高）→ `~/.openclaw/skills` → 内置技能（最低）

此外，您可以通过 `~/.openclaw/openclaw.json` 中的
`skills.load.extraDirs` 配置额外的技能文件夹（最低优先级）。

## 每代理与共享技能

在**多代理**设置中，每个代理都有自己的工作区。这意味着：

- **每代理技能**仅位于该代理的 `<workspace>/skills` 中。
- **共享技能**位于 `~/.openclaw/skills`（托管/本地）中，并对
  同一台机器上的**所有代理**可见。
- **共享文件夹**也可以通过 `skills.load.extraDirs` 添加（最低
  优先级），如果您希望多个代理使用通用的技能包。

如果相同的技能名称存在于多个位置，则适用通常的优先级
规则：工作区优先，然后是托管/本地，最后是内置。

## 插件 + 技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来附带自己的技能。插件技能在插件启用时加载，并参与正常的技能优先级规则。
您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来筛选它们。有关发现/配置，请参阅 [插件](/zh/en/tools/plugin)；有关这些技能所教的工具表面，请参阅 [工具](/zh/en/tools)。

## ClawHub（安装 + 同步）

ClawHub 是 OpenClaw 的公共技能注册表。在 [https://clawhub.com](https://clawhub.com) 浏览。使用它来发现、安装、更新和备份技能。
完整指南：[ClawHub](/zh/en/tools/clawhub)。

常见流程：

- 将技能安装到您的工作区：
  - `clawhub install <skill-slug>`
- 更新所有已安装的技能：
  - `clawhub update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

默认情况下，`clawhub` 会安装到当前工作目录下的 `./skills` 中（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其作为 `<workspace>/skills` 加载。

## 安全说明

- 将第三方技能视为**不受信任的代码**。在启用之前请阅读它们。
- 对于不受信任的输入和有风险的工具，首选沙箱运行。参见 [沙箱](/zh/en/gateway/sandboxing)。
- 工作区和额外目录（extra-dir）技能发现仅接受其解析的真实路径（realpath）保持在配置根目录内的技能根目录和 `SKILL.md` 文件。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将密钥注入到该代理回合的**主机**进程中（而非沙箱）。
  请勿在提示词和日志中包含密钥。
- 有关更广泛的威胁模型和检查清单，请参阅 [安全性](/zh/en/gateway/security)。

## 格式（AgentSkills + Pi 兼容）

`SKILL.md` 必须至少包含：

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
---
```

说明：

- 我们遵循 AgentSkills 规范进行布局/意图设计。
- 嵌入式代理使用的解析器仅支持**单行** frontmatter 键。
- `metadata` 应该是一个**单行 JSON 对象**。
- 在指令中使用 `{baseDir}` 来引用技能文件夹路径。
- 可选的 frontmatter 键：
  - `homepage` — 在 macOS 技能 UI 中显示为“Website”的 URL（也支持通过 `metadata.openclaw.homepage`）。
  - `user-invocable` — `true|false`（默认：`true`）。当为 `true` 时，该技能作为用户斜杠命令公开。
  - `disable-model-invocation` — `true|false`（默认：`false`）。当为 `true` 时，该技能从模型提示词中排除（但仍可通过用户调用使用）。
  - `command-dispatch` — `tool`（可选）。当设置为 `tool` 时，斜杠命令将绕过模型并直接调度到工具。
  - `command-tool` — 当设置了 `command-dispatch: tool` 时要调用的工具名称。
  - `command-arg-mode` — `raw`（默认）。对于工具调度，将原始参数字符串转发给工具（无核心解析）。

    工具使用以下参数调用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 筛选（加载时过滤器）

OpenClaw 使用 `metadata`（单行 JSON）**在加载时筛选技能**：

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
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
- `emoji` — macOS 技能 UI 使用的可选表情符号。
- `homepage` — 在 macOS 技能 UI 中显示为“Website”的可选 URL。
- `os` — 可选的平台列表（`darwin`、`linux`、`win32`）。如果设置，该技能仅在这些操作系统上可用。
- `requires.bins` — 列表；每一项都必须存在于 `PATH` 上。
- `requires.anyBins` — 列表；至少有一项必须存在于 `PATH` 上。
- `requires.env` — 列表；环境变量必须存在**或**在配置中提供。
- `requires.config` — 必须为真值的 `openclaw.json` 路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
- `install` — macOS 技能 UI 使用的可选安装程序规范数组（brew/node/go/uv/download）。

关于沙盒的说明：

- `requires.bins` 在技能加载时在**主机**上检查。
- 如果代理处于沙盒中，二进制文件也必须存在于**容器内部**。
  通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）安装它。
  `setupCommand` 在容器创建后运行一次。
  包安装还需要网络出口、可写的根文件系统以及沙箱中的 root 用户。
  例如：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙箱容器中运行 `summarize` CLI。

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

- 如果列出了多个安装程序，网关会选择一个**单一**的首选项（如果有 brew 则选 brew，否则选 node）。
- 如果所有安装程序都是 `download`，OpenClaw 将列出每个条目，以便您查看可用的构件。
- 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
- Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。
  这仅影响**技能安装**；网关运行时仍应为 Node
  （不建议将 Bun 用于 WhatsApp/Telegram）。
- Go 安装：如果缺少 `go` 且可用 `brew`，网关会先通过 Homebrew 安装 Go，并尽可能将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），`extract`（默认：检测到归档时自动），`stripComponents`，`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，则该技能始终符合资格（除非
在配置中被禁用或对于捆绑技能被 `skills.allowBundled` 阻止）。

## 配置覆盖（`~/.openclaw/openclaw.json`）

可以切换捆绑/托管的技能并为其提供环境值：

```json5
{
  skills: {
    entries: {
      "nano-banana-pro": {
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

默认情况下，配置键与**技能名称**匹配。如果技能定义了
`metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

规则：

- `enabled: false` 禁用该技能，即使它是捆绑/已安装的。
- `env`：**仅当**进程中尚未设置该变量时才注入。
- `apiKey`：为声明了 `metadata.openclaw.primaryEnv` 的技能提供的便利。
  支持纯文本字符串或 SecretRef 对象 (`{ source, provider, id }`)。
- `config`：用于自定义按技能字段的可选包；自定义键必须位于此处。
- `allowBundled`：仅针对 **内置** 技能的可选允许列表。如果设置，则只有
  列表中的内置技能符合条件（托管/工作区技能不受影响）。

## 环境注入（每次 Agent 运行）

当 Agent 运行开始时，OpenClaw 会：

1. 读取技能元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用到
   `process.env`。
3. 使用 **符合条件的** 技能构建系统提示。
4. 在运行结束后恢复原始环境。

这是 **限定在 Agent 运行范围内** 的，而非全局 Shell 环境。

## 会话快照（性能）

OpenClaw 会在 **会话开始时** 对符合条件的技能进行快照，并在同一会话的后续轮次中重用该列表。对技能或配置的更改将在下一个新会话中生效。

当启用技能监视器或出现新的符合条件的远程节点时（见下文），技能也可以在会话中途刷新。可以将此视为 **热重载**：刷新后的列表将在下一个 Agent 轮次中被采用。

## 远程 macOS 节点（Linux 网关）

如果网关运行在 Linux 上，但连接了一个 **允许 `system.run` 的 macOS 节点**（Exec approvals 安全未设置为 `deny`），则当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为符合条件。Agent 应通过 `nodes` 工具（通常是 `nodes.run`）执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.run` 进行的二进制探测。如果 macOS 节点随后离线，这些技能仍然可见；在节点重新连接之前，调用可能会失败。

## 技能监视器（自动刷新）

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

当技能符合条件时，OpenClaw 会将可用技能的精简 XML 列表注入到系统提示词中（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。该成本是确定性的：

- **基础开销（仅当 ≥1 个技能时）：** 195 个字符。
- **每个技能：** 97 个字符 + 经过 XML 转义的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

备注：

- XML 转义会将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），从而增加长度。
- Token 计数因模型的分词器而异。粗略的 OpenAI 风格估算约为每 token 4 个字符，因此每个技能 **97 个字符 ≈ 24 tokens**，再加上您实际字段的长度。

## 托管技能生命周期

OpenClaw 作为安装（npm 包或 OpenClaw.app）的一部分，提供了一组基准技能作为 **bundled skills**（捆绑技能）。`~/.openclaw/skills` 用于本地覆盖（例如，在不更改捆绑副本的情况下固定/修补技能）。工作区技能归用户所有，并且在名称冲突时会覆盖前两者。

## 配置参考

有关完整的配置架构，请参阅 [技能配置](/zh/en/tools/skills-config)。

## 寻找更多技能？

浏览 [https://clawhub.com](https://clawhub.com)。

---

import zh from '/components/footer/zh.mdx';

<zh />
