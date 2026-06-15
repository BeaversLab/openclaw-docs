---
title: "Skills"
sidebarTitle: "Skills"
summary: "Skills 教导你的代理如何使用工具。了解它们的加载方式、优先级如何工作，以及如何配置准入控制、允许列表和环境注入。"
read_when:
  - Adding or modifying skills
  - Changing skill gating, allowlists, or load rules
  - Understanding skill precedence and snapshot behavior
---

Skills 是 Markdown 指令文件，用于教导代理如何以及何时使用工具。每个 Skill 位于一个包含 `SKILL.md` 文件的目录中，该文件具有 YAML frontmatter 和 Markdown 正文。OpenClaw 加载捆绑的 Skills 以及任何本地覆盖项，并根据环境、配置和二进制文件的存在在加载时进行过滤。

<CardGroup cols={2}>
  <Card title="Creating skills" href="/zh/tools/creating-skills" icon="hammer">
    从零开始构建和测试自定义 Skill。
  </Card>
  <Card title="Skill Workshop" href="/zh/tools/skill-workshop" icon="flask">
    审查和批准代理起草的 Skill 提案。
  </Card>
  <Card title="Skills config" href="/zh/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置架构和代理允许列表。
  </Card>
  <Card title="ClawHub" href="/zh/clawhub" icon="cloud">
    浏览和安装社区 Skills。
  </Card>
</CardGroup>

## 加载顺序

OpenClaw 从这些来源加载，**优先级从高到低**。当相同的 Skill 名称出现在多个位置时，优先级最高的来源获胜。

| 优先级   | 来源                   | 路径                               |
| -------- | ---------------------- | ---------------------------------- |
| 1 — 最高 | Workspace skills       | `<workspace>/skills`               |
| 2        | Project agent skills   | `<workspace>/.agents/skills`       |
| 3        | Personal agent skills  | `~/.agents/skills`                 |
| 4        | Managed / local skills | `~/.openclaw/skills`               |
| 5        | Bundled skills         | 随安装附带                         |
| 6 — 最低 | 额外目录               | `skills.load.extraDirs` + 插件技能 |

技能根目录支持分组布局。只要在配置的根目录下的任何位置出现 `SKILL.md`，OpenClaw 就会发现一个技能：

```text
<workspace>/skills/research/SKILL.md          ✓ found as "research"
<workspace>/skills/personal/research/SKILL.md ✓ also found as "research"
```

文件夹路径仅用于组织。技能的名称、斜杠命令和允许列表键均来自 `name` frontmatter 字段（当缺少 `name` 时则来自目录名称）。

<Note>Codex CLI 的原生 `$CODEX_HOME/skills` 目录**不是** OpenClaw 技能根目录。使用 `openclaw migrate plan codex` 清点这些技能，然后 使用 `openclaw migrate codex` 将它们复制到您的 OpenClaw 工作区中。</Note>

## 每个代理与共享技能

在多代理设置中，每个代理都有自己的工作区。使用符合您所需可见性的路径：

| 作用域   | 路径                         | 对...可见          |
| -------- | ---------------------------- | ------------------ |
| 每个代理 | `<workspace>/skills`         | 仅该代理           |
| 项目代理 | `<workspace>/.agents/skills` | 仅该工作区的代理   |
| 个人代理 | `~/.agents/skills`           | 此机器上的所有代理 |
| 共享管理 | `~/.openclaw/skills`         | 此机器上的所有代理 |
| 额外目录 | `skills.load.extraDirs`      | 此机器上的所有代理 |

## 代理允许列表

技能**位置**（优先级）和技能**可见性**（哪个代理可以使用它）是独立的控制项。使用允许列表来限制代理可以看到哪些技能，无论它们是从哪里加载的。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"], // shared baseline
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults entirely
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

<AccordionGroup>
  <Accordion title="Allowlist rules">- 省略 `agents.defaults.skills` 以默认情况下对所有技能不加限制。 - 省略 `agents.list[].skills` 以继承 `agents.defaults.skills`。 - 设置 `agents.list[].skills: []` 以便为该代理不公开任何技能。 - 非空的 `agents.list[].skills` 列表是**最终**集合——它不会与默认值合并。 - 有效的允许列表适用于提示词构建、斜杠命令发现、沙盒同步和技能快照。</Accordion>
</AccordionGroup>

## 插件和技能

插件可以通过在 `openclaw.plugin.json` 中列出 `skills` 目录来携带自己的技能（路径相对于插件根目录）。当插件启用时，插件技能会被加载——例如，浏览器插件附带了一个用于多步骤浏览器控制的 `browser-automation` 技能。

插件技能目录与 `skills.load.extraDirs` 在相同的低优先级级别合并，因此同名的内置、托管、代理或工作区技能会覆盖它们。可以通过插件配置条目上的 `metadata.openclaw.requires.config` 对它们进行控制。

有关完整的插件系统，请参阅 [插件](/zh/tools/plugin) 和 [工具](/zh/tools)。

## 技能工作坊

[技能工作坊](/zh/tools/skill-workshop) 是代理与您的活动技能文件之间的提案队列。当代理发现可复用的工作时，它会草拟提案而不是直接写入 `SKILL.md`。在任何更改发生之前，您需要审查并批准。

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop apply <proposal-id>
```

有关完整生命周期、CLI 参考和配置，请参阅 [技能工作坊](/zh/tools/skill-workshop)。

## 从 ClawHub 安装

[ClawHub](https://clawhub.ai) 是公共技能注册表。使用 `openclaw skills` 命令进行安装和更新，或使用 `clawhub` CLI 进行发布和同步。

| 动作                       | 命令                                                   |
| -------------------------- | ------------------------------------------------------ |
| 将技能安装到工作区         | `openclaw skills install <slug>`                       |
| 从 Git 仓库安装            | `openclaw skills install git:owner/repo@ref`           |
| 安装本地技能目录           | `openclaw skills install ./path/to/skill --as my-tool` |
| 为所有本地代理安装         | `openclaw skills install <slug> --global`              |
| 更新所有工作区技能         | `openclaw skills update --all`                         |
| 更新共享托管技能           | `openclaw skills update <slug> --global`               |
| 更新所有共享托管技能       | `openclaw skills update --all --global`                |
| 验证技能的信任包络         | `openclaw skills verify <slug>`                        |
| 打印生成的技能卡           | `openclaw skills verify <slug> --card`                 |
| 通过 ClawHub CLI 发布/同步 | `clawhub sync --all`                                   |

<AccordionGroup>
  <Accordion title="Install details">
    `openclaw skills install` 默认安装到活动工作区 `skills/`
    目录。添加 `--global` 以安装到共享
    `~/.openclaw/skills` 目录，除非代理
    允许列表限制了其范围，否则所有本地代理都可见。

    Git 和本地安装要求源根目录下有 `SKILL.md`。当有效时，slug 来自
    `SKILL.md` frontmatter `name`，否则回退到
    目录或仓库名称。使用 `--as <slug>` 覆盖。
    `openclaw skills update` 仅跟踪 ClawHub 安装 —— 重新安装 Git 或
    本地源以刷新它们。

  </Accordion>
  <Accordion title="Verification and security scanning">
    `openclaw skills verify <slug>` 向 ClawHub 请求该技能的
    `clawhub.skill.verify.v1` 信任包络。已安装的 ClawHub 技能会根据
    `.clawhub/origin.json` 中记录的版本和注册表进行验证。

    ClawHub 技能页面在安装前会公开最新的安全扫描状态，
    并提供 VirusTotal、ClawScan 和静态分析的详情页面。当
    ClawHub 将验证标记为失败时，该命令将以非零状态退出。发布者
    可以通过 ClawHub 仪表板或
    `clawhub skill rescan <slug>` 恢复误报。

  </Accordion>
  <Accordion title="Private archive installs">
    需要 非-Gateway(网关) 交付方式的 ClawHub 客户端
    可以暂存包含 `skills.upload.begin`、`skills.upload.chunk` 和 `skills.upload.commit`
    的 zip 技能存档，然后使用 `skills.install({ source: "upload", ... })` 进行安装。此路径
    默认关闭，并且需要在 `openclaw.json` 中
    设置 `skills.install.allowUploadedArchives: true`。正常的 ClawHub 安装从不需要该设置。
  </Accordion>
</AccordionGroup>

## 安全

<Warning>将第三方 Skills 视为**不受信任的代码**。在启用之前请阅读它们。 对于不受信任的输入和有风险的工具，请优先使用沙箱隔离运行。请参阅 [沙箱隔离](/zh/gateway/sandboxing) 了解代理端控制措施。</Warning>

<AccordionGroup>
  <Accordion title="路径限制">
    工作区、项目代理和额外目录的 Skills 发现仅接受其解析后的真实路径位于配置根目录内的 Skills 根目录，除非
    `skills.load.allowSymlinkTargets` 明确信任目标根目录。
    托管的 `~/.openclaw/skills` 和个人的 `~/.agents/skills` 可能包含
    符号链接的 Skills 文件夹，但每个 `SKILL.md` 的真实路径必须仍位于
    其解析后的 Skills 目录内。
  </Accordion>
  <Accordion title="扫描和扫描覆盖"Gateway(网关)>
    Gateway 支持的 Skills 安装（新手引导、Skills 设置 UI）在执行安装程序元数据之前运行
    内置的危险代码扫描器。
    `critical` 发现结果默认阻止；`suspicious` 发现结果仅警告。
    `openclaw skills install <slug>`ClawHub 直接下载 ClawHub Skills 文件夹，
    并且不使用安装程序元数据扫描器。
  </Accordion>
  <Accordion title="密钥注入范围">
    `skills.entries.*.env` 和 `skills.entries.*.apiKey` 将密钥注入到
    该代理轮次的**主机**进程中——而不是注入到沙箱中。请勿
    在提示和日志中包含密钥。
  </Accordion>
</AccordionGroup>

有关更广泛的威胁模型和安全清单，请参阅
[Security](/zh/gateway/security)。

## SKILL.md 格式

每个 Skill 至少需要在 frontmatter 中包含 `name` 和 `description`：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---

When the user asks to generate an image, use the `image_generate` tool...
```

<Note>OpenClaw 遵循 [AgentSkills](OpenClawhttps://agentskills.io) 规范。 frontmatter 解析器仅支持**单行键**—— `metadata` 必须是 单行 JSON 对象。在正文中使用 `{baseDir}` 来引用 Skill 文件夹路径。</Note>

### 可选的 frontmatter 键

<ParamField path="homepage" type="string" macOS>
  在 macOS Skills UI 中显示为“Website”的 URL。也通过 `metadata.openclaw.homepage` 支持。
</ParamField>

<ParamField path="user-invocable" type="boolean" default="true">
  当为 `true` 时，该技能作为用户可调用的斜杠命令公开。
</ParamField>

<ParamField path="disable-model-invocation" type="boolean" default="false">
  当为 `true`OpenClaw 时，OpenClaw 会将该技能的指令排除在代理的常规 提示之外。只要 `user-invocable` 也为 `true`，该技能仍可作为斜杠命令使用。
</ParamField>

<ParamField path="command-dispatch" type='"tool"'>
  当设置为 `tool` 时，斜杠命令将绕过模型并直接 分派给已注册的工具。
</ParamField>

<ParamField path="command-tool" type="string">
  当设置 `command-dispatch: tool` 时要调用的工具名称。
</ParamField>

<ParamField path="command-arg-mode" type='"raw"' default="raw">
  对于工具分派，将原始参数字符串无
  核心解析地转发给工具。该工具接收
  `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。
</ParamField>

## Gating

OpenClaw 在加载时使用 OpenClaw`metadata.openclaw`（frontmatter 中的单行
JSON）过滤技能。没有 `metadata.openclaw` 块的技能始终
有资格被使用，除非被明确禁用。

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata: { "openclaw": { "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] }, "primaryEnv": "GEMINI_API_KEY" } }
---
```

<ParamField path="always" type="boolean">
  当为 `true` 时，始终包含该技能并跳过所有其他限制。
</ParamField>

<ParamField path="emoji" type="string" macOS>
  在 macOS Skills UI 中显示的可选表情符号。
</ParamField>

<ParamField path="homepage" type="string" macOS>
  在 macOS Skills UI 中显示为“Website”的可选 URL。
</ParamField>

<ParamField path="os" type='"darwin" | "linux" | "win32"'>
  平台筛选器。设置后，该 Skill 仅在列出的操作系统上可用。
</ParamField>

<ParamField path="requires.bins" type="string[]">
  每个二进制文件都必须存在于 `PATH` 上。
</ParamField>

<ParamField path="requires.anyBins" type="string[]">
  至少有一个二进制文件必须存在于 `PATH` 上。
</ParamField>

<ParamField path="requires.env" type="string[]">
  每个 环境变量（环境变量）必须存在于进程中或通过配置提供。
</ParamField>

<ParamField path="requires.config" type="string[]">
  每个 `openclaw.json` 路径都必须为真值。
</ParamField>

<ParamField path="primaryEnv" type="string">
  与 `skills.entries.<name>.apiKey` 关联的 env var（环境变量）名称。
</ParamField>

<ParamField path="install" type="object[]">
  由 macOS Skills UI 使用的可选安装程序规范（brew / node / go / uv / download）。
</ParamField>

<Note>当缺少 `metadata.openclaw` 时，仍接受旧的 `metadata.clawdbot` 块，以便已安装的旧版 Skills 保留其依赖项限制和安装程序提示。新的 Skills 应使用 `metadata.openclaw`。</Note>

### 安装程序规范

安装程序规范告诉 macOS Skills UI 如何安装依赖项：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata: { "openclaw": { "emoji": "♊️", "requires": { "bins": ["gemini"] }, "install": [{ "id": "brew", "kind": "brew", "formula": "gemini-cli", "bins": ["gemini"], "label": "Install Gemini CLI (brew)" }] } }
---
```

<AccordionGroup>
  <Accordion title="安装程序选择规则">
    - 当列出多个安装程序时，网关会选择一个首选
      选项（如果有 brew 则使用它，否则使用 node）。
    - 如果所有安装程序都是 `download`OpenClaw，OpenClaw 会列出每个条目，以便您可以
      查看所有可用的构建产物。
    - 规范可以包含 `os: ["darwin"|"linux"|"win32"]` 以按平台进行筛选。
    - Node 安装会遵循 `openclaw.json`npmnpmGateway(网关)Gateway(网关) 中的 `skills.install.nodeManager`
      （默认：npm；选项：npm / pnpm / yarn / bun）。这仅影响技能
      安装；Gateway(网关) 运行时仍应为 Node。
    - Gateway(网关) 安装程序首选项：Homebrew → uv → 配置的 node 管理器 →
      go → 下载。
  </Accordion>
  <Accordion title="各安装程序详情"OpenClawLinux>
    - **Homebrew：** OpenClaw 不会自动安装 Homebrew 或将 brew
      公式转换为系统包命令。在没有
      `brew` 的 Linux 容器中，仅限 brew 的安装程序将被隐藏；请使用自定义镜像或
      手动安装依赖项。
    - **Go：** 如果缺少 `go` 且有 `brew` 可用，网关将
      首先通过 Homebrew 安装 Go，并将 `GOBIN` 设置为 Homebrew 的 `bin`。
    - **Download：** `url`（必需），`archive`（`tar.gz` | `tar.bz2` | `zip`），
      `extract`（默认：检测到压缩包时为自动），`stripComponents`，
      `targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。
  </Accordion>
  <Accordion title="沙箱隔离说明">
    `requires.bins` 在技能加载时于 **主机** 上进行检查。如果代理在沙箱中运行，二进制文件也必须存在于 **容器内部**。请通过 `agents.defaults.sandbox.docker.setupCommand` 或自定义镜像进行安装。`setupCommand` 在容器创建后运行一次，并且需要网络出站、可写的根文件系统以及沙箱中的 root 用户。
  </Accordion>
</AccordionGroup>

## 配置覆盖

在 `skills.entries``~/.openclaw/openclaw.json` 中切换和配置捆绑或托管技能：

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
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
  即使是捆绑或安装的技能，`false` 也会将其禁用。`coding-agent` 捆绑技能是可选加入的 —— 设置 `skills.entries.coding-agent.enabled: true` 并确保已安装并验证了 `claude`、`codex`、`opencode` 或其他受支持的 CLI。
</ParamField>

<ParamField path="apiKey" type="string | { source, provider, id }">
  用于声明 `metadata.openclaw.primaryEnv` 的技能的便捷字段。支持纯文本字符串或 SecretRef 对象。
</ParamField>

<ParamField path="env" type="Record<string, string>">
  为代理运行注入的环境变量。仅当进程中尚未设置该变量时才会注入。
</ParamField>

<ParamField path="config" type="object">
  用于自定义每个技能配置字段的可选包。
</ParamField>

<ParamField path="allowBundled" type="string[]">
  仅针对 **捆绑** 技能的可选允许列表。设置后，只有列表中的捆绑技能符合条件。托管和工作区技能不受影响。
</ParamField>

<Note>配置键默认匹配 **技能名称**。如果技能定义了 `metadata.openclaw.skillKey`，请在 `skills.entries` 下使用该键。对带连字符的名称加引号：JSON5 允许使用带引号的键。</Note>

## 环境变量注入

当代理运行开始时，OpenClaw：

<Steps>
  <Step title="Reads skill metadata">
    OpenClaw 解析代理的有效技能列表，应用
    限制规则、允许列表和配置覆盖。
  </Step>
  <Step title="Injects env and API keys">
    `skills.entries.<key>.env` 和 `skills.entries.<key>.apiKey` 被应用
    到 `process.env`，仅在该次运行期间有效。
  </Step>
  <Step title="Builds the system prompt">
    符合条件的技能被编译为一个紧凑的 XML 块，并注入到
    系统提示词中。
  </Step>
  <Step title="Restores the environment">
    运行结束后，原始环境将恢复。
  </Step>
</Steps>

<Warning>环境注入的范围限定于 **主机** 代理运行，而非沙箱。在沙箱内部， `env` 和 `apiKey` 无效。请参阅 [Skills config](/zh/tools/skills-config#sandboxed-skills-and-env-vars) 了解如何 将密钥传递到沙箱隔离运行中。</Warning>

对于内置的 `claude-cli` 后端，OpenClaw 还会将相同的有效技能快照生成为临时 Claude Code 插件，并通过
`--plugin-dir` 传递。其他 CLI 后端仅使用提示词目录。

## 快照与刷新

OpenClaw 在 **会话开始时** 对符合条件的技能创建快照，并在该会话的所有后续轮次中重用该列表。
对技能或配置的更改将在下一个新会话中生效。

技能在会话中途刷新的情况有两种：

- 技能监视器检测到 `SKILL.md` 发生更改。
- 连接了一个新的符合条件的远程节点。

刷新后的列表将在下一次代理轮次中被采用。如果有效的代理允许列表发生变化，
OpenClaw 将刷新快照以保持可见技能的一致性。

<AccordionGroup>
  <Accordion title="Skills watcher"OpenClaw>
    默认情况下，OpenClaw 会监视 Skills 文件夹，并在 `SKILL.md` 文件更改时更新快照。在 `skills.load` 下进行配置：

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

    对于 Skills 根目录符号链接指向配置根目录之外的有意符号链接布局，请使用 `allowSymlinkTargets`，例如 `<workspace>/skills/manager -> ~/Projects/manager/skills`。

  </Accordion>
  <Accordion title="macOSLinuxRemote macOS nodes (Linux gateway)"Gateway(网关)LinuxmacOS>
    如果 Gateway(网关) 在 Linux 上运行，但连接了允许 `system.run`OpenClawmacOS 的 **macOS 节点**，只要该节点上存在所需的二进制文件，OpenClaw 就可以将仅限 macOS 的 Skills 视为可用。Agent 应使用带有 `host=node`OpenClaw 的 `exec` 工具来运行这些 Skills。

    离线节点**不会**使仅限远程的 Skills 可见。如果节点停止响应二进制探测，OpenClaw 将清除其缓存的二进制匹配项。

  </Accordion>
</AccordionGroup>

## Token 影响

当 Skills 符合条件时，OpenClaw 会向系统提示中注入一个紧凑的 XML 块。成本是确定的：

```text
total = 195 + Σ (97 + len(name) + len(description) + len(filepath))
```

- **基本开销**（仅当 ≥ 1 个 Skill 时）：约 195 个字符
- **每个 Skill**：约 97 个字符 + 您的 `name`、`description` 和 `location` 字段长度
- XML 转义将 `& < > " '` 扩展为实体，每次出现会增加几个字符
- 按 ~4 个字符/token 计算，在不计算字段长度的情况下，97 个字符 ≈ 每个 Skill 24 个 token

保持描述简短且具有描述性，以最大限度地减少提示开销。

## 相关

<CardGroup cols={2}>
  <Card title="Creating skills" href="/zh/tools/creating-skills" icon="hammer">
    编写自定义 Skill 的分步指南。
  </Card>
  <Card title="Skill Workshop" href="/zh/tools/skill-workshop" icon="flask">
    代理起草技能的提案队列。
  </Card>
  <Card title="Skills config" href="/zh/tools/skills-config" icon="gear">
    完整的 `skills.*` 配置架构和代理允许列表。
  </Card>
  <Card title="Slash commands" href="/zh/tools/slash-commands" icon="terminal">
    技能斜杠命令的注册和路由方式。
  </Card>
  <Card title="ClawHubClawHub" href="/zh/clawhub" icon="cloud">
    在公共注册表上浏览和发布技能。
  </Card>
  <Card title="Plugins" href="/zh/tools/plugin" icon="plug">
    插件可以随其记录的工具一起提供技能。
  </Card>
</CardGroup>
