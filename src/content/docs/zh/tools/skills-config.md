---
summary: "Skills 配置模式和示例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills 配置"
---

大多数 Skills 加载器/安装配置位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。特定于 Agent 的 Skills 可见性位于 `agents.defaults.skills` 和 `agents.list[].skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
      allowUploadedArchives: false,
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

对于内置图像生成/编辑，请优先使用 `agents.defaults.imageGenerationModel` 以及核心 `image_generate` 工具。`skills.entries.*` 仅适用于自定义或第三方 Skills 工作流。

如果您选择了特定的图像提供商/模型，还请配置该提供商的 auth/API 密钥。典型示例：用于 `google/*` 的 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，用于 `openai/*` 的 `OPENAI_API_KEY`，以及用于 `fal/*` 的 `FAL_KEY`。

示例：

- 原生 Nano Banana Pro 风格设置：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 设置：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Agent Skills 允许列表

当您希望拥有相同的机器/工作区 Skills 根目录，但每个 Agent 具有不同的
可见 Skills 集时，请使用 Agent 配置。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits defaults -> github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

规则：

- `agents.defaults.skills`：针对省略 `agents.list[].skills` 的 agents 共享的基准允许列表。
- 省略 `agents.defaults.skills` 以保持默认情况下 Skills 不受限制。
- `agents.list[].skills`：该 agent 的显式最终技能集；它不与默认值合并。
- `agents.list[].skills: []`：不向该 agent 暴露任何 skills。

## 字段

- 内置技能根目录始终包括 `~/.openclaw/skills`、`~/.agents/skills`、`<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：仅适用于 **bundled**（内置）skills 的可选允许列表。设置后，只有列表中的内置 skills 符合条件（托管、agent 和工作区 skills 不受影响）。
- `load.extraDirs`：要扫描的其他技能目录（优先级最低）。
- `load.allowSymlinkTargets`：受信任的真实目标目录，符号链接的
  workspace、project-agent 或 extra-dir 技能文件夹可能会解析到这些目录，
  即使符号链接位于该目标根目录之外。将其用于有意的
  同级仓库布局，例如
  `<workspace>/skills/manager -> ~/Projects/manager/skills`。托管的
  `~/.openclaw/skills` 和个人 `~/.agents/skills` 根目录默认情况下
  可以遵循来自本地技能管理器的技能目录符号链接，但每个
  `SKILL.md` 仍必须在其自己的技能目录内解析。
- `load.watch`：监视技能文件夹并刷新技能快照（默认值：true）。
- `load.watchDebounceMs`：技能监视器事件的防抖时间，以毫秒为单位（默认值：250）。
- `install.preferBrew`：在可用时首选 brew 安装程序（默认值：true）。
- `install.nodeManager`：节点安装程序首选项（`npm` | `pnpm` | `yarn` | `bun`，默认值：npm）。
  这仅影响 **技能安装**；Gateway(网关) 运行时仍应为 Node
  （对于 Bun/WhatsApp，不建议使用 Telegram）。
  - `openclaw setup --node-manager` 范围更窄，目前接受 `npm`、
    `pnpm` 或 `bun`。如果您
    想要由 Yarn 支持的技能安装，请手动设置 `skills.install.nodeManager: "yarn"`。
- `install.allowUploadedArchives`：允许受信任的 `operator.admin` Gateway(网关)
  客户端安装通过 `skills.upload.*` 暂存的私有 zip 档案
  （默认值：false）。这仅启用上传的档案路径；普通的 ClawHub
  安装不需要它。
- `entries.<skillKey>`：按技能覆盖设置。
- `agents.defaults.skills`：可选的默认技能允许列表，由省略
  `agents.list[].skills` 的代理继承。
- `agents.list[].skills`：可选的按代理最终技能允许列表；显式
  列表将替换继承的默认值，而不是合并。

## 符号链接的兄弟仓库

默认情况下，workspace、project-agent、extra-dir 和 bundled skill 根目录是
包含边界。如果 `<workspace>/skills` 下的技能文件夹是
解析到 `<workspace>/skills` 之外的符号链接，OpenClaw 将跳过它并记录
`Skipping escaped skill path outside its configured root`。

保留符号链接布局并仅允许受信任的目标根目录：

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

使用此配置后，诸如
`<workspace>/skills/manager -> ~/Projects/manager/skills` 之类的符号链接将在
realpath 解析后被接受。`extraDirs` 也会直接扫描同级仓库，而
`allowSymlinkTargets` 会为现有 workspace-skill 布局保留符号链接路径。托管 `~/.openclaw/skills` 和个人 `~/.agents/skills`
目录已接受技能目录符号链接，因为这些根目录是
用户拥有的本地 skill-manager 界面；每个技能的 `SKILL.md` 包含仍然
适用。请保持目标条目狭窄；不要指向 `~` 或
`~/Projects` 等广泛根目录，除非该根目录下的每个技能树都是受信任的。

逐个技能字段：

- `enabled`：设置 `false` 以禁用技能，即使它已被打包/安装。
- `env`：为代理运行注入的环境变量（仅当尚未设置时）。
- `apiKey`：对于声明主环境变量的技能的可选便捷方式。
  支持纯文本字符串或 SecretRef 对象 (`{ source, provider, id }`)。

## 注意事项

- 默认情况下，`entries` 下的键映射到技能名称。如果技能定义了
  `metadata.openclaw.skillKey`，请改用该键。
- 加载优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → bundled skills →
  `skills.load.extraDirs`。
- 当启用监视器时，对技能的更改将在下一次代理轮次中被获取。

### 沙箱隔离技能和环境变量

当会话处于 **沙箱隔离** 状态时，技能进程在配置的沙箱后端内运行。沙箱 **不会** 继承主机 `process.env`。

<Warning>
  全局 `env` 和 `skills.entries.<skill>.env`/`apiKey` 仅适用于 **host** 运行。在沙盒中它们无效，因此依赖 `GEMINI_API_KEY` 的技能将因 `apiKey not configured` 而失败，除非单独为沙盒提供该变量。
</Warning>

使用以下方法之一：

- `agents.defaults.sandbox.docker.env` 用于 Docker 后端（或每个 `agents.list[].sandbox.docker.env`）。
- 将环境变量嵌入到您的自定义沙箱镜像或远程沙箱环境中。

对于 Docker 沙盒，配置的 `sandbox.docker.env` 值将成为显式的容器环境变量。拥有 Docker 守护进程访问权限的用户可以通过 Docker 元数据检查它们，因此当这种暴露不可接受时，请使用挂载的机密文件、自定义镜像或其他传递路径。

## 相关

<CardGroup cols={2}>
  <Card title="Skills" href="/zh/tools/skills" icon="puzzle-piece">
    什么是 Skills 以及它们如何加载。
  </Card>
  <Card title="Creating skills" href="/zh/tools/creating-skills" icon="hammer">
    编写自定义技能包。
  </Card>
  <Card title="Slash commands" href="/zh/tools/slash-commands" icon="terminal">
    原生命令目录和聊天指令。
  </Card>
  <Card title="Configuration reference" href="/zh/gateway/configuration-reference" icon="gear">
    完整的 `skills` 和 `agents.skills` 模式。
  </Card>
</CardGroup>
