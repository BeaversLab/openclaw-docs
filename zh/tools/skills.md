---
summary: "技能：托管与工作区、筛选规则以及配置/环境连线"
read_when:
  - Adding or modifying skills
  - Changing skill gating or load rules
title: "技能"
---

# 技能 (OpenClaw)

OpenClaw 使用 **[AgentSkills](https://agentskills.io)-兼容** 的技能文件夹来教导代理如何使用工具。每个技能是一个包含 `SKILL.md` 的目录，其中包含 YAML frontmatter 和指令。OpenClaw 加载 **捆绑技能** 以及可选的本地覆盖项，并在加载时根据环境、配置和二进制文件的存在对其进行过滤。

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

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来附带自己的技能。插件技能在启用插件时加载，并参与正常的技能优先级规则。您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 对其进行筛选。有关发现/配置，请参阅 [Plugins](/zh/tools/plugin)；有关这些技能教授的工具表面，请参阅 [Tools](/zh/tools)。

## ClawHub (安装 + 同步)

ClawHub 是 OpenClaw 的公共技能注册表。在 [https://clawhub.com](https://clawhub.com) 上浏览。使用它来发现、安装、更新和备份技能。完整指南：[ClawHub](/zh/tools/clawhub)。

常用流程：

- 将技能安装到您的工作区：
  - `clawhub install <skill-slug>`
- 更新所有已安装的技能：
  - `clawhub update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

默认情况下，`clawhub` 会安装到当前工作目录下的 `./skills` 中（或者回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其拾取为 `<workspace>/skills`。

## 安全说明

- 将第三方 Skills 视为**不受信任的代码**。在启用前请阅读它们。
- 对于不受信任的输入和有风险的工具，首选沙箱隔离运行。参见 [沙箱隔离](/zh/gateway/sandboxing)。
- 工作区和额外目录的 Skills 发现仅接受其解析后的真实路径保持在配置根目录内的 Skills 根目录和 `SKILL.md` 文件。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会将密钥注入到该 Agent 轮次的**宿主**进程中（而非沙箱）。请勿将密钥放入提示词和日志中。
- 有关更广泛的威胁模型和检查清单，请参阅 [Security](/zh/gateway/security)。

## 格式（AgentSkills + Pi 兼容）

`SKILL.md` 必须至少包含：

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
---
```

注意事项：

- 我们遵循 AgentSkills 规范进行布局/意图设计。
- 嵌入式 Agent 使用的解析器仅支持**单行** frontmatter 键。
- `metadata` 应该是一个**单行 JSON 对象**。
- 在指令中使用 `{baseDir}` 来引用 Skills 文件夹路径。
- 可选的 frontmatter 键：
  - `homepage` — 在 macOS Skills UI 中显示为“Website”的 URL（也可通过 `metadata.openclaw.homepage` 支持）。
  - `user-invocable` — `true|false`（默认值：`true`）。当为 `true` 时，该 Skill 将作为用户斜杠命令公开。
  - `disable-model-invocation` — `true|false`（默认值：`false`）。当为 `true` 时，该 Skill 将从模型提示词中排除（仍可通过用户调用使用）。
  - `command-dispatch` — `tool`（可选）。当设置为 `tool` 时，斜杠命令将绕过模型并直接分派给工具。
  - `command-tool` — 当设置了 `command-dispatch: tool` 时要调用的工具名称。
  - `command-arg-mode` — `raw`（默认）。对于工具分派，将原始参数字符串转发给工具（无核心解析）。

    该工具使用以下参数调用：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 筛选（加载时过滤器）

OpenClaw **在加载时过滤技能**，使用 `metadata`（单行 JSON）：

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

- `always: true` — 始终包含该技能（跳过其他检查）。
- `emoji` — 可选的表情符号，由 macOS Skills UI 使用。
- `homepage` — 可选的 URL，在 macOS Skills UI 中显示为“网站”。
- `os` — 平台的可选列表（`darwin`、`linux`、`win32`）。如果设置，该技能仅在这些操作系统上可用。
- `requires.bins` — 列表；每个都必须存在于 `PATH` 上。
- `requires.anyBins` — 列表；至少有一个必须存在于 `PATH` 上。
- `requires.env` — 列表；环境变量必须存在**或**在配置中提供。
- `requires.config` — 必须为真的 `openclaw.json` 路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
- `install` — 可选的安装程序规范数组，由 macOS Skills UI 使用（brew/node/go/uv/download）。

关于沙箱隔离的说明：

- 在技能加载时，会在 **主机** 上检查 `requires.bins`。
- 如果代理处于沙箱隔离状态，二进制文件也必须存在于**容器内部**。
  通过 `agents.defaults.sandbox.docker.setupCommand` 安装它（或使用自定义镜像）。
  `setupCommand` 在容器创建后运行一次。
  包安装还需要网络出口、可写的根文件系统以及沙箱中的 root 用户。
  例如：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙箱容器中拥有 `summarize` CLI
  才能在此处运行。

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
- 如果所有安装程序都是 `download`，OpenClaw 将列出每个条目，以便您查看可用的构件。
- 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
- Node 安装遵循 `skills.install.nodeManager` 中的 `openclaw.json`（默认：npm；选项：npm/pnpm/yarn/bun）。
  这仅影响 **技能安装**；Gateway(网关) 运行时仍应为 Node
  （不建议将 Bun 用于 WhatsApp/Telegram）。
- Go 安装：如果缺少 `go` 且有 `brew`，网关会先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必需）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认：检测到压缩包时自动）、`stripComponents`、`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，该技能始终符合条件（除非在配置中禁用或对于内置技能被 `skills.allowBundled` 阻止）。

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

配置键默认匹配 **技能名称**。如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

规则：

- `enabled: false` 禁用该技能，即使它是内置/已安装的。
- `env`：**仅当** 进程中尚未设置该变量时才注入。
- `apiKey`：为声明了 `metadata.openclaw.primaryEnv` 的技能提供的便利设置。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。
- `config`：用于自定义按技能字段的可选容器；自定义键必须位于此处。
- `allowBundled`：仅适用于**捆绑**技能的可选允许列表。如果设置，则仅
  列表中的捆绑技能符合条件（托管/工作区技能不受影响）。

## 环境注入（每次代理运行）

当代理运行开始时，OpenClaw：

1. 读取技能元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用于
   `process.env`。
3. 使用**符合条件的**技能构建系统提示。
4. 在运行结束后恢复原始环境。

此操作**仅限于代理运行**，而非全局 Shell 环境。

## 会话快照（性能）

OpenClaw 会在**会话开始时**对符合条件的 Skills 进行快照，并在同一会话的后续轮次中重用该列表。对 Skills 或配置的更改将在下一个新会话中生效。

当启用 Skills 监视器或出现新的符合条件的远程节点时（见下文），Skills 也可以在会话中间刷新。将其视为**热重载**：刷新后的列表将在下一次代理轮次中被采用。

## 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 在 Linux 上运行，但连接了 **macOS 节点** **且 `system.run` 被允许**（Exec approvals 安全设置未设为 `deny`），OpenClaw 可以在该节点上存在所需的二进制文件时，将仅限 macOS 的技能视为符合资格。代理应通过 `nodes` 工具（通常为 `nodes.run`）执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.run` 进行二进制探测。如果 macOS 节点随后离线，Skills 仍然可见；调用可能会失败，直到节点重新连接。

## Skills 监视器（自动刷新）

默认情况下，OpenClaw 会监视 Skills 文件夹，并在 `SKILL.md` 文件更改时更新 Skills 快照。可以在 `skills.load` 下配置此功能：

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

当 Skills 符合条件时，OpenClaw 会将可用 Skills 的紧凑 XML 列表注入系统提示（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。成本是确定的：

- **基本开销（仅当有 ≥1 个 Skills 时）：** 195 个字符。
- **每个 Skill：** 97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

说明：

- XML 转义会将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），从而增加长度。
- Token 计数因模型分词器而异。粗略的 OpenAI 风格估算为 ~4 个字符/token，因此每个技能约为 **97 个字符 ≈ 24 个 token**，加上您的实际字段长度。

## 托管的 Skills 生命周期

OpenClaw 附带了一套作为 **bundled skills**（捆绑技能）的基准技能集，作为安装过程（npm 包或 OpenClaw.app）的一部分。`~/.openclaw/skills` 用于本地覆盖（例如，在不更改捆绑副本的情况下固定/修补技能）。Workspace skills（工作区技能）归用户所有，并且在名称冲突时覆盖这两者。

## 配置参考

有关完整的配置架构，请参阅 [Skills 配置](/zh/tools/skills-config)。

## 寻找更多 Skills？

浏览 [https://clawhub.com](https://clawhub.com)。

---

import zh from '/components/footer/zh.mdx';

<zh />
