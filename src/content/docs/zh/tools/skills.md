---
summary: "Skills: 托管与工作区、过滤规则、代理允许列表以及配置连接"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
title: "Skills"
sidebarTitle: "Skills"
---

OpenClaw 使用兼容 **[AgentSkills](OpenClawhttps://agentskills.io)** 的技能文件夹来教代理如何使用工具。每个技能都是一个包含带有 YAML frontmatter 和指令的 `SKILL.md`OpenClaw 的目录。OpenClaw 加载捆绑的技能以及可选的本地覆盖内容，并在加载时根据环境、配置和二进制文件的存在对其进行过滤。

## 位置和优先级

OpenClaw 从这些来源加载技能，**优先级从高到低**：

| #   | 来源           | 路径                           |
| --- | -------------- | ------------------------------ |
| 1   | 工作区技能     | `<workspace>/skills`           |
| 2   | 项目代理技能   | `<workspace>/.agents/skills`   |
| 3   | 个人代理技能   | `~/.agents/skills`             |
| 4   | 托管/本地技能  | `~/.openclaw/skills`           |
| 5   | 捆绑技能       | 随安装附带的                   |
| 6   | 额外技能文件夹 | `skills.load.extraDirs` (配置) |

如果技能名称冲突，则优先级最高的来源获胜。

技能根目录可以使用文件夹进行组织。当在配置的技能根目录下出现 `SKILL.md` 时，就会发现一个技能，因此以下两种情况都是有效的：

```text
<workspace>/skills/research/SKILL.md
<workspace>/skills/personal/research/SKILL.md
```

文件夹路径仅用于组织。技能的可见名称、斜杠命令和允许列表键来自于 `SKILL.md` frontmatter `name`（或者当缺少 `name` 时，来自技能目录名称），因此具有 `name: research` 的嵌套技能仍被调用为 `/research`，而不是 `/personal/research`。

Codex CLI 的本机 `$CODEX_HOME/skills` 目录不是这些 OpenClaw 技能根目录之一。在 Codex 驱动模式下，本地应用服务器启动使用隔离的按代理 Codex 主目录，因此操作员个人 `~/.codex/skills` 中的技能不会被隐式加载。Codex 本机 `.agents` 发现单独使用继承的 `HOME`；上述 OpenClaw 自身的技能根目录已包含 `~/.agents/skills`。使用 `openclaw migrate plan codex` 来清点 Codex 主目录中的技能，然后使用 `openclaw migrate codex` 通过交互式复选框提示选择技能目录，再将它们复制到当前的 OpenClaw 代理工作区中。对于非交互式运行，请为要复制的确切技能重复 `--skill <name>`。

## Per-agent vs shared skills

在 **多代理 (multi-agent)** 设置中，每个代理都有自己的工作区：

| 范围 (Scope)         | 路径 (Path)                          | 可见对象 (Visible to) |
| -------------------- | ------------------------------------ | --------------------- |
| Per-agent            | `<workspace>/skills`                 | 仅该代理              |
| Project-agent        | `<workspace>/.agents/skills`         | 仅该工作区的代理      |
| Personal-agent       | `~/.agents/skills`                   | 该机器上的所有代理    |
| Shared managed/local | `~/.openclaw/skills`                 | 该机器上的所有代理    |
| Shared extra dirs    | `skills.load.extraDirs` (最低优先级) | 该机器上的所有代理    |

同名在多个位置 → 最高来源胜出。Workspace 胜过 project-agent，胜过 personal-agent，胜过 managed/local，胜过 bundled，胜过 extra dirs。

## Agent skill allowlists

技能 **位置 (location)** 和技能 **可见性 (visibility)** 是独立的控制项。位置/优先级决定同名技能的哪个副本胜出；代理允许列表 决定代理实际可以使用哪些技能。

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
  <Accordion title="Allowlist rules">- 默认情况下，省略 `agents.defaults.skills` 以允许无限制的技能。 - 省略 `agents.list[].skills` 以继承 `agents.defaults.skills`。 - 设置 `agents.list[].skills: []` 以表示没有技能。 - 非空的 `agents.list[].skills` 列表是该代理的**最终**集合——它不会与默认值合并。 - 有效的允许列表适用于提示词构建、技能斜杠命令发现、沙箱同步和技能快照。</Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来附带自己的技能。当插件被启用时，插件技能就会被加载。这是放置特定于工具的操作指南的正确位置，这些指南对于工具描述来说太长，但应该在插件安装时可用——例如，浏览器插件附带了一个用于多步骤浏览器控制的 `browser-automation` 技能。

插件技能目录被合并到与 `skills.load.extraDirs` 相同的低优先级路径中，因此同名的捆绑、托管、代理或工作区技能会覆盖它们。您可以通过插件配置条目上的 `metadata.openclaw.requires.config` 来控制它们。

有关发现/配置，请参阅 [Plugins](/zh/tools/plugin)；有关这些技能所教授的工具表面，请参阅 [Tools](/zh/tools)。

## 技能工作坊

可选的实验性 **Skill Workshop** 插件可以根据在代理工作期间观察到的可重用过程来创建或更新工作区技能。它默认情况下是禁用的，必须通过 `plugins.entries.skill-workshop` 显式启用。

技能工作坊仅写入 `<workspace>/skills`，扫描生成的内容，支持待批准或自动安全写入，隔离不安全的建议，并在成功写入后刷新技能快照，以便新技能在无需重启 Gateway(网关) 的情况下即可使用。

将其用于诸如 _"下次请验证 GIF 归属"_ 之类的更正，或用于来之不易的工作流程，例如媒体 QA 检查清单。开始时待批准；仅在审查过其建议后在受信任的工作区中使用自动写入。完整指南：[Skill Workshop 插件](/zh/plugins/skill-workshop)。

## ClawHub （安装和同步）

[ClawHub](https://clawhub.ai) 是 OpenClaw 的公共技能注册表。使用原生 `openclaw skills` 命令进行发现/安装/更新，或使用单独的 `clawhub` CLI 进行发布/同步工作流程。完整指南：[ClawHub](/zh/clawhub)。

| 操作                         | 命令                                                   |
| ---------------------------- | ------------------------------------------------------ |
| 将 ClawHub 技能安装到工作区  | `openclaw skills install <skill-slug>`                 |
| 将 Git 技能安装到工作区      | `openclaw skills install git:owner/repo@ref`           |
| 将本地技能安装到工作区       | `openclaw skills install ./path/to/skill --as my-tool` |
| 为所有本地代理安装技能       | `openclaw skills install <skill-slug> --global`        |
| 更新所有已安装到工作区的技能 | `openclaw skills update --all`                         |
| 更新单个共享托管技能         | `openclaw skills update <skill-slug> --global`         |
| 更新所有共享托管/本地技能    | `openclaw skills update --all --global`                |
| 验证 ClawHub 技能            | `openclaw skills verify <skill-slug>`                  |
| 打印生成的技能卡片           | `openclaw skills verify <skill-slug> --card`           |
| 同步（扫描 + 发布更新）      | `clawhub sync --all`                                   |

原生 `openclaw skills install` 默认安装到活动工作区的
`skills/` 目录。添加 `--global` 可安装到共享的
托管/本地目录（默认为 `~/.openclaw/skills`），除非代理技能允许列表限制可见性，否则所有本地代理
均可看到该目录。独立的 `clawhub`CLI CLI 也会安装到当前工作
目录下的 `./skills`OpenClawOpenClaw 中（或回退到配置的 OpenClaw 工作区）。OpenClaw 会在下一个
会话将其作为 `<workspace>/skills` 拾取。
配置的技能根目录也支持分组布局，例如
`skills/<group>/<skill>/SKILL.md`，这样相关的第三方技能可以
保留在共享文件夹下，而无需进行广泛的递归扫描。分组时使用扁平的 frontmatter
名称，例如 `skills/imported/research/SKILL.md` 配合
`name: research`。

Git 和本地目录安装期望在源根目录有一个 `SKILL.md`。安装
slug 来自 `SKILL.md` frontmatter `name`（当它是有效的 slug 时），
然后回退到源目录或存储库名称。使用 `--as <slug>` 覆盖
推断出的 slug。`--version`ClawHubnpmClawHub 仅适用于 ClawHub 安装。技能
安装不支持 npm 包规范或 zip/归档路径。`openclaw skills
update` 仅更新 ClawHub 跟踪的安装；重新安装 Git 或本地源以
刷新它们。

使用 `openclaw skills verify <slug>` 向 ClawHub 请求该技能的 `clawhub.skill.verify.v1` 信任范围。默认输出为 JSON；使用 `--card` 可打印生成的技能卡片 Markdown。已安装的 ClawHub 技能会根据 `.clawhub/origin.json` 中记录的版本和注册表进行验证；`--version` 和 `--tag` 仅覆盖版本选择器。当 ClawHub 将验证标记为失败时，该命令会返回非零退出码。生成的 `skill-card.md` 可能存在于已安装的包中，但 OpenClaw 将其视为 ClawHub 提供的元数据，不会将其用作本地模型指令或本地哈希门控。

需要私有且非 Gateway(网关) 分发的 ClawHub 客户端可以使用 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit` 准备 zip 技能归档，然后使用 `skills.install({ source: "upload", uploadId, slug, force?, sha256? })` 安装已提交的上传内容。这是受信任客户端的显式管理员上传路径，而非正常的 `openclaw skills install <slug>` 或 ClawHub 安装流程。默认情况下此功能处于关闭状态，只有在 `openclaw.json` 中设置了 `skills.install.allowUploadedArchives: true` 时才能使用。上传模式仍会安装到默认的代理工作区 `skills/<slug>` 目录；归档的内部文件夹名称在最终安装目标时会被忽略。

ClawHub 技能页面在安装前会展示最新的安全扫描状态，并提供 VirusTotal、ClawScan 和静态分析的扫描详情页面。`openclaw skills install <slug>` 仍然是唯一的安装路径；发布者可以通过 ClawHub 仪表板或 `clawhub skill rescan <slug>` 解决误报问题。

## 安全

<Warning>请将第三方技能视为**不受信任的代码**。在启用前请仔细阅读。对于不受信任的输入和有风险的工具，首选沙箱隔离运行。有关代理端的控制措施，请参阅 [沙箱隔离](/zh/gateway/sandboxing)。</Warning>

- 工作区、项目代理和额外目录的 Skills 发现仅接受解析后的真实路径保留在已配置根目录内的 Skills 根目录，除非 `skills.load.allowSymlinkTargets` 显式信任目标根目录。捆绑的 Skills 始终保持在内部。托管的 `~/.openclaw/skills` 和个人的 `~/.agents/skills`ClawHub 根目录可能包含由 ClawHub 或其他本地 Skill 管理器安装的符号链接 Skill 文件夹，但每个 `SKILL.md` 的真实路径仍必须保留在其解析后的 Skill 目录内。
- 嵌套发现是受限的。OpenClaw 扫描 Skills 根目录下的分组 Skill 文件夹，例如 OpenClaw`<workspace>/skills`、`<workspace>/.agents/skills`、`~/.agents/skills` 和 `~/.openclaw/skills`，但会跳过隐藏目录、`node_modules`、过大的 `SKILL.md` 文件、已转义的符号链接以及异常大的目录树。
- Gateway(网关) 私有归档安装默认处于关闭状态。显式启用时，它们需要包含 Gateway(网关)`SKILL.md`ClawHub 的已提交 zip 上传，并复用与 ClawHub Skill 安装相同的归档提取、路径遍历、符号链接、强制和回滚保护。它们受 `skills.install.allowUploadedArchives`ClawHub 限制；正常的 ClawHub 安装不需要该设置。
- Gateway(网关) 支持的 Skill 依赖安装（Gateway(网关)`skills.install`、新手引导和 Skills 设置 UI）在执行安装程序元数据之前运行内置的危险代码扫描器。`critical` 发现默认会阻止，除非调用方显式设置了危险覆盖；可疑的发现仍然仅发出警告。
- `openclaw skills install <slug>`ClawHub 不同——它将 ClawHub Skill 文件夹下载到工作区，或者通过 `--global` 下载到共享的托管/本地 Skills 中，并且不使用上述的安装程序元数据路径。Git 和本地目录安装将受信任的 `SKILL.md` 目录复制到同一个 Skills 根目录，但不受 `openclaw skills update` 跟踪。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将密钥注入到该次智能体轮次的 **宿主** 进程中（而非沙箱）。请勿将密钥包含在提示词和日志中。

有关更广泛的威胁模型和检查清单，请参阅 [Security](/zh/gateway/security)。

## SKILL.md 格式

`SKILL.md` 必须至少包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

OpenClaw 遵循 AgentSkills 规范来定义布局/意图。嵌入式智能体使用的解析器仅支持 **单行** 前置元数据键；`metadata` 应该是一个 **单行 JSON 对象**。在指令中使用 `{baseDir}` 来引用技能文件夹路径。

### 可选的前置元数据键

<ParamField path="homepage" type="string">
  在 macOS Skills UI 中显示为“Website”的 URL。也可以通过 `metadata.openclaw.homepage` 支持。
</ParamField>
<ParamField path="user-invocable" type="boolean" default="true">
  当 `true` 时，该技能会作为用户斜杠命令公开。
</ParamField>
<ParamField path="disable-model-invocation" type="boolean" default="false">
  当 `true` 时，OpenClaw 会将该技能的指令排除在智能体的正常提示词之外。该技能仍然会被安装，并且当 `user-invocable` 也为 `true` 时，仍然可以作为斜杠命令显式运行。
</ParamField>
<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令将绕过模型，直接调度到工具。
</ParamField>
<ParamField path="command-tool" type="string">
  当设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>
<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具调度，将原始参数字符串转发给工具（无核心解析）。使用 `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }` 调用工具。
</ParamField>

## 筛选（加载时过滤器）

OpenClaw 在加载时使用 OpenClaw`metadata`（单行 JSON）过滤 Skills：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

`metadata.openclaw` 下的字段：

<ParamField path="always" type="boolean">
  当 `true` 时，始终包含该 Skill（跳过其他关卡）。
</ParamField>
<ParamField path="emoji" type="string"macOS>
  macOS Skills UI 使用的可选表情符号。
</ParamField>
<ParamField path="homepage" type="string"macOS>
  在 macOS Skills UI 中显示为“网站”的可选 URL。
</ParamField>
<ParamField path="os" type='"darwin" | "linux" | "win32"' >
  可选平台列表。如果设置，该 Skill 仅在这些操作系统上可用。
</ParamField>
<ParamField path="requires.bins" type="string[]">
  每一个都必须存在于 `PATH` 上。
</ParamField>
<ParamField path="requires.anyBins" type="string[]">
  至少有一个必须存在于 `PATH` 上。
</ParamField>
<ParamField path="requires.env" type="string[]">
  环境变量必须存在或在配置中提供。
</ParamField>
<ParamField path="requires.config" type="string[]">
  必须为真的 `openclaw.json` 路径列表。
</ParamField>
<ParamField path="primaryEnv" type="string">
  与 `skills.entries.<name>.apiKey` 关联的环境变量名称。
</ParamField>
<ParamField path="install" type="object[]"macOS>
  macOS Skills UI 使用的可选安装程序规格（brew/node/go/uv/download）。
</ParamField>

如果不存在 `metadata.openclaw`，则该 Skill 始终符合条件（除非在配置中禁用或被捆绑 Skills 的 `skills.allowBundled` 阻止）。

<Note>当 `metadata.openclaw` 缺失时，仍接受旧版 `metadata.clawdbot` 块，因此较旧的已安装 Skills 可保留其依赖关卡和安装程序提示。新 Skills 和已更新的 Skills 应使用 `metadata.openclaw`。</Note>

### 沙箱隔离说明

- 在技能加载时，会在**主机**上检查 `requires.bins`。
- 如果代理处于沙箱隔离状态，二进制文件也必须存在于**容器内部**。可以通过 `agents.defaults.sandbox.docker.setupCommand` 安装它（或使用自定义镜像）。`setupCommand` 在容器创建后运行一次。软件包安装还需要网络出口、可写的根文件系统以及沙箱中的 root 用户。
- 示例：`summarize` 技能 (`skills/summarize/SKILL.md`) 需要在沙箱容器中拥有 `summarize` CLI 才能在其中运行。

### 安装程序规范

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="安装程序选择规则">
    - 如果列出了多个安装程序，网关会选择一个首选选项（如果有 brew 则选 brew，否则选 node）。
    - 如果所有安装程序都是 `download`，OpenClaw 会列出每个条目，以便您可以查看可用的构件。
    - 安装程序规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台筛选选项。
    - Node 安装会遵守 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；选项：npm/pnpm/yarn/bun）。这仅影响技能安装；Gateway(网关) 运行时仍应为 Node - 不推荐将 Bun 用于 WhatsApp/Telegram。
    - Gateway(网关) 支持的安装程序选择是首选项驱动的：当安装规范混合了类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 会首选 Homebrew，然后是 `uv`，接着是配置的 node 管理器，最后是其他回退选项，如 `go` 或 `download`。
    - 如果每个安装规范都是 `download`，OpenClaw 将显示所有下载选项，而不是折叠为一个首选安装程序。

  </Accordion>
  <Accordion title="Per-installer details"OpenClawLinux>
    - **Homebrew installs:** OpenClaw 不会自动安装 Homebrew 或将
      brew 公式转换为系统包管理器命令。在没有 `brew` 的 Linux 容器中，新手引导会隐藏仅限 brew 的依赖项安装程序；请使用
      自定义镜像或在启用该技能之前手动安装依赖项。
    - **Go installs:** 如果 `go` 缺失且 `brew` 可用，网关会首先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **Download installs:** `url` （必需），`archive` （`tar.gz` | `tar.bz2` | `zip`），`extract` （默认：检测到存档时为 auto），`stripComponents`，`targetDir` （默认： `~/.openclaw/tools/<skillKey>`）。

  </Accordion>
</AccordionGroup>

## Config overrides

可以在 `~/.openclaw/openclaw.json` 中的 `skills.entries` 下切换并设置打包和托管技能的 env 值：

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
  `false` 禁用该技能，即使它是捆绑或已安装的。 捆绑的 `coding-agent` 技能是可选加入的：在将其暴露给代理之前设置 `skills.entries.coding-agent.enabled: true`，然后确保安装并验证了 `claude`、`codex`、`opencode`CLICLI 或其他支持的 CLI 及其自己的 CLI 身份。
</ParamField>
<ParamField path="apiKey" type="string | { source, provider, id }">
  用于声明 `metadata.openclaw.primaryEnv` 的技能的便捷设置。支持纯文本或 SecretRef。
</ParamField>
<ParamField path="env" type="Record<string, string>">
  仅当进程中尚未设置该变量时才会注入。
</ParamField>
<ParamField path="config" type="object">
  用于自定义每项技能字段的可选包。自定义键必须位于此处。
</ParamField>
<ParamField path="allowBundled" type="string[]">
  仅针对 **bundled**（捆绑）技能的可选允许列表。如果设置，则仅列表中的捆绑技能符合条件（托管/工作区技能不受影响）。
</ParamField>

如果技能名称包含连字符，请给键加上引号（JSON5 允许使用带引号的键）。配置键默认匹配 **skill name**（技能名称） - 如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。

<Note>对于 OpenClaw 内部的通用图像生成/编辑，请使用核心 `image_generate` 工具配合 `agents.defaults.imageGenerationModel`，而不是捆绑技能。此处的技能示例用于自定义或第三方工作流。对于原生图像分析，请使用 `image` 工具配合 `agents.defaults.imageModel`。如果您选择 `openai/*`、`google/*`、 `fal/*` 或其他特定于提供商的图像模型，请同时添加该提供商的 auth/API 密钥。</Note>

## 环境变量注入

当代理运行开始时，OpenClaw：

1. 读取技能元数据。
2. 将 `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 应用于 `process.env`。
3. 使用**符合条件**的 Skills 构建系统提示。
4. 运行结束后恢复原始环境。

环境注入的**作用域限定为 Agent 运行期间**，而非全局 Shell 环境。

对于捆绑的 `claude-cli`OpenClaw 后端，OpenClaw 还将相同的符合条件的快照实例化为临时的 Claude Code 插件，并通过 `--plugin-dir`OpenClaw 传递它。Claude Code 随后可以使用其原生 Skills 解析器，而 OpenClaw 仍拥有优先权、按 Agent 列表、许可控制以及 `skills.entries.*`APICLI env/API 密钥注入。其他 CLI 后端仅使用提示目录。

## 快照与刷新

OpenClaw 在**会话开始时**对符合条件的 Skills 进行快照，并在同一会话的后续轮次中重用该列表。对 Skills 或配置的更改将在下一次新会话中生效。

Skills 可以在以下两种情况下于会话中途刷新：

- 启用了 Skills 监视器。
- 出现了新的符合条件的远程节点。

可以将其视为**热重载**：刷新后的列表将在下一次 Agent 轮次中被拾取。如果该会话的有效 Agent Skills 允许列表发生变化，OpenClaw 会刷新快照，以便可见的 Skills 与当前 Agent 保持一致。

### Skills 监视器

默认情况下，OpenClaw 会监视 Skills 文件夹，并在 OpenClaw`SKILL.md` 文件更改时更新 Skills 快照。在 `skills.load` 下进行配置：

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

对于有意设计的工作区、项目 Agent 或额外目录布局，如果 Skills 根目录包含符号链接（例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`），请使用 `allowSymlinkTargets`。托管的 `~/.openclaw/skills` 和个人的 `~/.agents/skills` 默认情况下可以遵循来自本地 Skills 管理器的 Skills 目录符号链接，但在解析 realpath 后仍会匹配目标列表，并且在配置时应保持狭窄范围。

监视器覆盖分组技能根目录下的嵌套 `SKILL.md` 文件。添加或
编辑 `skills/personal/foo/SKILL.md` 会刷新快照，其方式与
编辑 `skills/foo/SKILL.md` 相同。

### 远程 macOS 节点（Linux 网关）

如果 Gateway(网关) 在 Linux 上运行，但连接了一个 **macOS 节点**
并允许 `system.run`（Exec 审批安全未设置为 `deny`），
当该节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为可用。代理应通过 `exec` 工具
并使用 `host=node` 来执行这些技能。

这依赖于节点报告其命令支持以及通过 `system.which` 或
`system.run` 进行的 bin 探测。离线节点**不会**
使仅限远程的技能可见。如果连接的节点停止响应 bin
探测，OpenClaw 将清除其缓存的 bin 匹配项，以便代理不再看到
目前无法在该处运行的技能。

## Token 影响

当技能符合条件时，OpenClaw 会将可用技能的精简 XML 列表注入
系统提示（通过 `session runtime` 中的 `formatSkillsForPrompt`）。成本是确定性的：

- **基础开销**（仅在 ≥1 个技能时）：195 个字符。
- **每个技能：** 97 个字符 + 经过 XML 转义的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符）：

```text
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

XML 转义将 `& < > " '` 扩展为实体（`&amp;`、`&lt;` 等），
从而增加长度。Token 计数因模型分词器而异。粗略的
OpenAI 风格估算约为每 token 4 个字符，因此每个技能 **97 个字符 ≈ 24 个 token**
加上您的实际字段长度。

## 托管技能生命周期

OpenClaw 随安装包（npm 包或 OpenClaw.app）附带了一套作为 **bundled skills** 的基准 Skills。`~/.openclaw/skills` 用于本地覆盖——例如，在不更改 bundled 副本的情况下固定或修补 skill。Workspace Skills 归用户所有，在名称冲突时覆盖两者。

## 想要更多 Skills？

浏览 [https://clawhub.ai](https://clawhub.ai)。完整配置架构：[Skills config](/zh/tools/skills-config)。

## 相关

- [ClawHub](/zh/clawhub) - 公共 Skills 注册表
- [Creating skills](/zh/tools/creating-skills) - 构建自定义 Skills
- [Plugins](/zh/tools/plugin) - 插件系统概览
- [Skill Workshop plugin](/zh/plugins/skill-workshop) - 从代理工作中生成 Skills
- [Skills config](/zh/tools/skills-config) - Skills 配置参考
- [Slash commands](/zh/tools/slash-commands) - 所有可用的斜杠命令
