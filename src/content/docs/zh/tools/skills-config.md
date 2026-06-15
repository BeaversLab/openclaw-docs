---
title: "Skills config"
sidebarTitle: "Skills config"
summary: "skills.* 配置架构、Agent 允许列表、Workshop 设置以及沙箱环境变量处理的完整参考。"
read_when:
  - Configuring skill loading, install, or gating behavior
  - Setting per-agent skill visibility
  - Adjusting Skill Workshop limits or approval policy
---

大多数 Skills 配置位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。特定于 Agent 的可见性位于 `agents.defaults.skills` 和 `agents.list[].skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm",
      allowUploadedArchives: false,
    },
    workshop: {
      autonomous: { enabled: false },
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" },
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

<Note>对于内置图像生成，请使用 `agents.defaults.imageGenerationModel` 加上核心 `image_generate` 工具，而不是 `skills.entries`。Skill 条目仅适用于自定义或第三方 Skill 工作流。</Note>

## 加载 (`skills.load`)

<ParamField path="skills.load.extraDirs" type="string[]">
  要扫描的其他 Skill 目录，优先级最低（在捆绑和 插件 Skills 之后）。路径扩展支持 `~`。
</ParamField>

<ParamField path="skills.load.allowSymlinkTargets" type="string[]">
  受信任的实际目标目录，符号链接的 Skill 文件夹可以解析到这些目录，
  即使符号链接位于配置的根目录之外。将此用于
  故意的同级存储库布局，例如
  `<workspace>/skills/manager -> ~/Projects/manager/skills`。请将此列表保持
   狭窄 — 不要指向广泛的根目录，如 `~` 或 `~/Projects`。
</ParamField>

<ParamField path="skills.load.watch" type="boolean" default="true">
  监视 Skill 文件夹并在 `SKILL.md` 文件 更改时刷新 Skills 快照。覆盖分组 Skill 根目录下的嵌套文件。
</ParamField>

<ParamField path="skills.load.watchDebounceMs" type="number" default="250">
  Skill 监视器事件的防抖窗口，以毫秒为单位。
</ParamField>

## 安装 (`skills.install`)

<ParamField path="skills.install.preferBrew" type="boolean" default="true">
  当 `brew` 可用时，首选 Homebrew 安装程序。
</ParamField>

<ParamField path="skills.install.nodeManager" type='"npm" | "pnpm" | "yarn" | "bun"' default='"npm"'Gateway(网关)BunWhatsAppTelegram>
  用于技能安装的 Node 包管理器首选项。这仅影响技能
  安装 —— Gateway(网关) 运行时仍应使用 Node（不推荐
  在 WhatsApp/Telegram 中使用 Bun）。使用 `openclaw setup --node-manager`npm 指定 npm、pnpm
  或 bun；对于基于 Yarn 的技能安装，需手动设置 `"yarn"`。
</ParamField>

<ParamField path="skills.install.allowUploadedArchives" type="boolean" default="false">
  允许受信任的 `operator.admin`Gateway(网关) Gateway(网关) 客户端安装通过 `skills.upload.*`ClawHub 暂存的私有 zip 归档。普通的 ClawHub 安装 不需要此设置。
</ParamField>

## 捆绑技能允许列表

<ParamField path="skills.allowBundled" type="string[]">
  仅针对 **bundled**（捆绑）技能的可选允许列表。设置后，列表中只有捆绑技能 符合条件。托管、代理级别和工作区技能 不受影响。
</ParamField>

## 逐技能条目 (`skills.entries`)

`entries` 下的键默认匹配技能 `name`。如果技能定义了
`metadata.openclaw.skillKey`，请改用该键。用引号括起带连字符的名称
（JSON5 允许带引号的键）。

<ParamField path="skills.entries.<key>.enabled" type="boolean">
  即使技能已捆绑或安装，`false` 也会将其禁用。`coding-agent` 捆绑技能是可选加入的 —— 将其设置为 `true` 并确保已安装并验证 `claude`、 `codex`、`opencode`CLI 或其他受支持的 CLI。
</ParamField>

<ParamField path="skills.entries.<key>.apiKey" type='string | { source, provider, id }'>
  用于声明 `metadata.openclaw.primaryEnv` 的技能的便捷字段。
  支持纯文本字符串或 SecretRef：`{ source: "env", provider: "default", id: "VAR_NAME" }`。
</ParamField>

<ParamField path="skills.entries.<key>.env" type="Record<string, string>">
  为代理运行注入的环境变量。仅当进程尚未设置该变量时才注入。
</ParamField>

<ParamField path="skills.entries.<key>.config" type="object">
  用于自定义每个技能配置字段的可选包。
</ParamField>

## 代理允许列表 (`agents`)

当您希望拥有相同的机器/工作区技能根目录但每个代理具有不同的可见技能集时，请使用代理配置。

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

<ParamField path="agents.defaults.skills" type="string[]">
  由省略 `agents.list[].skills` 的代理继承的共享基线允许列表。完全省略以使技能默认不受限制。
</ParamField>

<ParamField path="agents.list[].skills" type="string[]">
  该代理的显式最终技能集。显式列表将**替换**继承的默认值——它们不会合并。设置为 `[]` 以使该代理不暴露任何技能。
</ParamField>

## 技能工坊 (`skills.workshop`)

<ParamField path="skills.workshop.autonomous.enabled" type="boolean" default="false">
  当 `true` 时，代理可以在成功的轮次之后从持久对话信号创建待处理的提案。无论此设置如何，用户提示的技能创建始终通过技能工坊进行。
</ParamField>

<ParamField path="skills.workshop.approvalPolicy" type='"pending" | "auto"' default='"pending"'>
  `pending` 要求在代理发起的应用、拒绝或隔离之前获得操作员批准。`auto` 允许在没有批准的情况下执行这些操作。
</ParamField>

<ParamField path="skills.workshop.maxPending" type="number" default="50">
  每个工作区保留的最大待处理和隔离提案数。
</ParamField>

<ParamField path="skills.workshop.maxSkillBytes" type="number" default="40000">
  提案正文的最大大小（以字节为单位）。提案描述的硬上限为 160 字节，因为它们出现在发现和列表输出中。
</ParamField>

## 符号链接的技能根目录

默认情况下，workspace、project-agent、extra-dir 和 bundled skill 根目录是
隔离边界。解析到根目录外部的 `<workspace>/skills` 下的符号链接
skill 文件夹将被跳过并输出一条日志消息。

要允许有意的符号链接布局，请声明受信任的目标：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

使用此配置后，`<workspace>/skills/manager -> ~/Projects/manager/skills` 在
realpath 解析后会被接受。`extraDirs` 直接扫描同级仓库；
`allowSymlinkTargets` 为现有布局保留符号链接路径。

托管 `~/.openclaw/skills` 和个人 `~/.agents/skills` 目录
已经接受 skill 目录符号链接（每个 skill 的 `SKILL.md` 隔离仍然
适用）。

## 沙箱隔离 Skills 和环境变量

<Warning>
  `skills.entries.<skill>.env` 和 `apiKey` 仅适用于 **host** 运行。在
  沙箱内部它们无效 —— 依赖于 `GEMINI_API_KEY` 的 skill 将
  因 `apiKey not configured` 而失败，除非单独为沙箱提供该
  变量。
</Warning>

使用以下方法将密钥传递到 Docker 沙箱：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          env: { GEMINI_API_KEY: "your-key-here" },
        },
      },
    },
  },
}
```

<Note>拥有 Docker 守护进程访问权限的用户可以通过 Docker 元数据检查 `sandbox.docker.env` 值。 如果这种暴露是不可接受的，请使用挂载的密钥文件、自定义镜像或 其他传递路径。</Note>

## 加载顺序提醒

```text
workspace/skills      (highest)
workspace/.agents/skills
~/.agents/skills
~/.openclaw/skills
bundled skills
skills.load.extraDirs (lowest)
```

当启用监视器时，对 skills 和配置的更改将在下一个新会话中生效；或者当监视器检测到更改时，在下一个 agent 轮次中生效。

## 相关内容

<CardGroup cols={2}>
  <Card title="Skills 参考" href="/zh/tools/skills" icon="puzzle-piece">
    什么是 skills、加载顺序、门控以及 SKILL.md 格式。
  </Card>
  <Card title="创建 Skills" href="/zh/tools/creating-skills" icon="hammer">
    编写自定义 workspace skills。
  </Card>
  <Card title="技能工作坊" href="/zh/tools/skill-workshop" icon="flask">
    代理起草技能的提案队列。
  </Card>
  <Card title="斜杠命令" href="/zh/tools/slash-commands" icon="terminal">
    原生斜杠命令目录和聊天指令。
  </Card>
</CardGroup>
