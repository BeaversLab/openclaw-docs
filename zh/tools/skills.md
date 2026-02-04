---
summary: "技能：托管 vs 工作区、门控规则与配置/环境注入"
read_when:
  - 添加或修改技能
  - 修改技能门控或加载规则
title: "Skills"
---

# 技能（OpenClaw）

OpenClaw 使用 **[AgentSkills](https://agentskills.io) 兼容** 的技能文件夹来教 agent 如何使用工具。每个技能是一个包含 `SKILL.md`（带 YAML frontmatter 与说明）的目录。OpenClaw 加载 **内置技能** 与可选本地覆盖，并在加载时依据环境、配置与二进制存在性进行过滤。

## 位置与优先级

技能从 **三** 个位置加载：

1. **内置技能**：随安装包（npm 包或 OpenClaw.app）一起提供
2. **托管/本地技能**：`~/.openclaw/skills`
3. **工作区技能**：`<workspace>/skills`

若技能名冲突，优先级为：

`<workspace>/skills`（最高）→ `~/.openclaw/skills` → 内置技能（最低）

此外，你可在 `~/.openclaw/openclaw.json` 中用
`skills.load.extraDirs` 配置额外技能目录（最低优先级）。

## 按 agent 与共享技能

在 **多 agent** 环境中，每个 agent 有自己的工作区，因此：

- **按 agent 技能** 仅存在于该 agent 的 `<workspace>/skills`。
- **共享技能** 存在于 `~/.openclaw/skills`（托管/本地），对 **同一台机器上的所有 agent** 可见。
- **共享文件夹** 也可通过 `skills.load.extraDirs` 添加（最低优先级），用于多个 agent 共用技能包。

若同名技能存在于多个位置，依然遵循优先级：工作区优先，其次托管/本地，再是内置。

## 插件 + 技能

插件可在 `openclaw.plugin.json` 中列出 `skills` 目录（相对插件根路径）来提供自己的技能。插件启用后，插件技能会按常规优先级参与加载。你可通过插件配置项的 `metadata.openclaw.requires.config` 对其门控。插件发现/配置见 [插件](/zh/plugin)，这些技能所教授的工具面见 [工具](/zh/tools)。

## ClawHub（安装 + 同步）

ClawHub 是 OpenClaw 的公共技能注册表。浏览：
https://clawhub.com。你可以用它发现、安装、更新和备份技能。
完整指南：[ClawHub](/zh/tools/clawhub)。

常见流程：

- 安装技能到工作区：
  - `clawhub install <skill-slug>`
- 更新所有已安装技能：
  - `clawhub update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

默认情况下，`clawhub` 安装到当前工作目录下的 `./skills`
（或回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一次会话中将其作为 `<workspace>/skills` 加载。

## 安全说明

- 将第三方技能视为 **不可信代码**。启用前请先阅读。
- 对不可信输入或高风险工具，优先使用沙箱。见 [沙箱](/zh/gateway/sandboxing)。
- `skills.entries.*.env` 与 `skills.entries.*.apiKey` 会把密钥注入到 **宿主机** 进程中（而不是沙箱）。避免把密钥写入提示与日志。
- 更完整的威胁模型与清单见 [安全](/zh/gateway/security)。

## 格式（AgentSkills + Pi 兼容）

`SKILL.md` 至少需要：

```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
---
```

说明：

- 我们遵循 AgentSkills 的布局/意图规范。
- 内置 agent 使用的解析器仅支持 **单行** frontmatter key。
- `metadata` 应为 **单行 JSON 对象**。
- 在指令中使用 `{baseDir}` 引用技能目录路径。
- 可选 frontmatter key：
  - `homepage` — URL，会显示为 macOS Skills UI 的“Website”（也可用 `metadata.openclaw.homepage`）。
  - `user-invocable` — `true|false`（默认：`true`）。为 `true` 时，技能以用户斜杠命令暴露。
  - `disable-model-invocation` — `true|false`（默认：`false`）。为 `true` 时，技能不注入模型提示（仍可用户调用）。
  - `command-dispatch` — `tool`（可选）。当设为 `tool` 时，斜杠命令绕过模型，直接派发到工具。
  - `command-tool` — 当 `command-dispatch: tool` 时要调用的工具名。
  - `command-arg-mode` — `raw`（默认）。对工具派发，直接转发原始参数字符串（不做核心解析）。

    工具调用参数：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## 门控（加载时过滤）

OpenClaw 在加载时使用 `metadata`（单行 JSON）过滤技能：

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

- `always: true` — 总是包含该技能（跳过其他门控）。
- `emoji` — 可选 emoji，用于 macOS Skills UI。
- `homepage` — 可选 URL，显示为 macOS Skills UI 的 “Website”。
- `os` — 可选平台列表（`darwin`、`linux`、`win32`）。设置后仅在这些 OS 上可用。
- `requires.bins` — 列表；每项必须存在于 `PATH`。
- `requires.anyBins` — 列表；至少一个存在于 `PATH`。
- `requires.env` — 列表；环境变量必须存在 **或** 在配置中提供。
- `requires.config` — `openclaw.json` 中必须为真值的路径列表。
- `primaryEnv` — 与 `skills.entries.<name>.apiKey` 关联的环境变量名。
- `install` — 可选安装器规范数组，用于 macOS Skills UI（brew/node/go/uv/download）。

关于沙箱：

- `requires.bins` 在技能加载时于 **宿主机** 检查。
- 若 agent 处于沙箱，二进制也必须 **在容器内**。
  可通过 `agents.defaults.sandbox.docker.setupCommand` 安装（或自定义镜像）。
  `setupCommand` 会在容器创建后运行一次。
  包安装还需要网络出站、可写根文件系统以及沙箱中的 root 用户。
  示例：`summarize` 技能（`skills/summarize/SKILL.md`）需要在沙箱容器内安装 `summarize` CLI。

安装器示例：

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

- 若列出多个安装器，gateway 会选择 **单个** 首选项（有 brew 时优先，否则 node）。
- 若全部安装器为 `download`，OpenClaw 会列出每个条目以展示可用 artifacts。
- 安装器可包含 `os: ["darwin"|"linux"|"win32"]` 以按平台过滤。
- Node 安装遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认 npm；可选 npm/pnpm/yarn/bun）。
  这仅影响 **技能安装**；Gateway 运行时仍应为 Node（WhatsApp/Telegram 不推荐 Bun）。
- Go 安装：若缺少 `go` 且可用 `brew`，gateway 会先通过 Homebrew 安装 Go，并尽可能将 `GOBIN` 设为 Homebrew 的 `bin`。
- Download 安装：`url`（必填）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认：检测到 archive 时自动）、`stripComponents`、`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

若不存在 `metadata.openclaw`，技能始终可用（除非在配置中禁用或被 `skills.allowBundled` 阻止内置技能）。

## 配置覆盖（`~/.openclaw/openclaw.json`）

内置/托管技能可通过配置开关与注入 env：

```json5
{
  skills: {
    entries: {
      "nano-banana-pro": {
        enabled: true,
        apiKey: "GEMINI_KEY_HERE",
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

注意：若技能名包含连字符，请用引号包裹 key（JSON5 允许）。

配置 key 默认匹配 **技能名**。若技能定义了
`metadata.openclaw.skillKey`，则使用该 key 于 `skills.entries` 下。

规则：

- `enabled: false` 即使已内置/已安装也会禁用技能。
- `env`：仅当变量未在进程中设置时才注入。
- `apiKey`：对声明了 `metadata.openclaw.primaryEnv` 的技能的便捷字段。
- `config`：可选的技能自定义字段容器；自定义 key 必须放在此处。
- `allowBundled`：仅对 **内置** 技能的可选 allowlist。设置后仅列表内技能可用（不影响托管/工作区技能）。

## 环境注入（按 agent 运行）

当 agent 开始一次运行时，OpenClaw：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 注入到 `process.env`。
3. 使用 **符合条件** 的技能构建系统提示。
4. 运行结束后恢复原始环境。

这是 **按 agent 运行范围** 生效，而非全局 shell 环境。

## 会话快照（性能）

OpenClaw 在 **会话启动时** 对符合条件的技能做快照，并在同一会话的后续回合复用该列表。技能或配置的变更将在下一次新会话中生效。

当技能 watcher 启用或出现新的可用远程节点时，技能也可在会话中途刷新（见下）。可视作 **热重载**：刷新列表在下一次 agent 回合中生效。

## 远程 macOS 节点（Linux gateway）

如果 Gateway 运行在 Linux，而有 **macOS node** 连接且 **允许 `system.run`**（Exec approvals security 未设为 `deny`），OpenClaw 可在该节点上检测到必需二进制时，将仅 macOS 的技能视为可用。agent 应通过 `nodes` 工具（通常是 `nodes.run`）执行这些技能。

这依赖节点上报其命令支持并通过 `system.run` 探测二进制。若 macOS 节点后续离线，技能仍可见；调用可能失败，直到节点重连。

## Skills watcher（自动刷新）

默认情况下，OpenClaw 会监视技能文件夹，并在 `SKILL.md` 变更时更新技能快照。可在 `skills.load` 下配置：

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

当技能可用时，OpenClaw 会通过 `formatSkillsForPrompt`（在 `pi-coding-agent`）向系统提示注入一个紧凑的 XML 列表。成本是确定的：

- **基础开销（仅当 ≥1 技能时）：** 195 个字符。
- **每个技能：** 97 个字符 + XML 转义后的 `<name>`、`<description>`、`<location>` 长度。

公式（字符）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

说明：

- XML 转义会将 `& < > " '` 展开为实体（`&amp;`、`&lt;` 等），长度会增加。
- Token 数因模型 tokenizer 而异。粗略的 OpenAI 风格估算为 ~4 字符/token，因此 **97 字符 ≈ 24 tokens** 加上实际字段长度。

## 托管技能生命周期

OpenClaw 随安装包提供一组 **内置技能**（npm 包或 OpenClaw.app）。`~/.openclaw/skills` 用于本地覆盖（例如不改动内置副本而对技能进行 pin/patch）。工作区技能由用户管理，若同名则覆盖前两者。

## 配置参考

完整配置 schema 见 [技能配置](/zh/tools/skills-config)。

## 想要更多技能？

浏览 https://clawdhub.com。

---
