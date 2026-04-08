---
summary: "Skills 配置架构和示例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills Config"
---

# Skills 配置

大多数 Skills 加载器/安装配置位于 `skills` 中的
`~/.openclaw/openclaw.json` 下。特定于 Agent 的 Skill 可见性位于
`agents.defaults.skills` 和 `agents.list[].skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun (Gateway runtime still Node; bun not recommended)
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

对于内置图像生成/编辑，首选 `agents.defaults.imageGenerationModel`
加上核心 `image_generate` 工具。`skills.entries.*` 仅用于自定义或
第三方 Skill 工作流。

如果您选择特定的图像提供商/模型，还要配置该提供商的
auth/API 密钥。典型示例：`GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用于
`google/*`，`OPENAI_API_KEY` 用于 `openai/*`，以及 `FAL_KEY` 用于 `fal/*`。

示例：

- 原生 Nano Banana 风格设置：`agents.defaults.imageGenerationModel.primary: "google/gemini-3.1-flash-image-preview"`
- 原生 fal 设置：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Agent Skills 允许列表

当您希望拥有相同的机器/工作区 Skills 根目录，但每个 Agent
拥有不同的可见 Skill 集时，请使用 Agent 配置。

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

- `agents.defaults.skills`: 省略
  `agents.list[].skills` 的 Agents 共享基线允许列表。
- 省略 `agents.defaults.skills` 以默认保留不受限制的 Skills。
- `agents.list[].skills`: 该 Agent 的显式最终 Skill 集；它不会
  与默认值合并。
- `agents.list[].skills: []`: 为该 Agent 不暴露任何 Skills。

## 字段

- 内置 Skill 根目录始终包括 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`: 仅用于 **bundled** Skills 的可选允许列表。设置后，仅
  列表中的 bundled Skills 符合条件（托管的、agent 和 workspace Skills 不受影响）。
- `load.extraDirs`: 要扫描的其他 Skills 目录（优先级最低）。
- `load.watch`: 监视 Skill 文件夹并刷新 Skills 快照（默认值：true）。
- `load.watchDebounceMs`：技能监视器事件的防抖时间，以毫秒为单位（默认值：250）。
- `install.preferBrew`：在可用时优先使用 brew 安装程序（默认值：true）。
- `install.nodeManager`：Node 安装程序首选（`npm` | `pnpm` | `yarn` | `bun`，默认值：npm）。
  这仅影响 **技能安装**；Gateway(网关) 运行时仍应为 Node
  （不建议将 Gateway(网关) 用于 Bun/WhatsApp）。
  - `openclaw setup --node-manager` 范围更窄，目前接受 `npm`、
    `pnpm` 或 `bun`。如果希望
    使用 Yarn 支持的技能安装，请手动设置 `skills.install.nodeManager: "yarn"`。
- `entries.<skillKey>`：按技能覆盖。
- `agents.defaults.skills`：可选的默认技能允许列表，由省略
  `agents.list[].skills` 的代理继承。
- `agents.list[].skills`：可选的按代理最终技能允许列表；显式
  列表将替换继承的默认值，而不是合并。

按技能字段：

- `enabled`：将 `false` 设置为禁用技能，即使它已被打包/安装。
- `env`：为代理运行注入的环境变量（仅当尚未设置时）。
- `apiKey`：为声明了主要环境变量的技能提供的可选便利。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 注意

- `entries` 下的键默认映射到技能名称。如果技能定义了
  `metadata.openclaw.skillKey`，请改用该键。
- 加载优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → 打包技能 →
  `skills.load.extraDirs`。
- 当启用监视器时，技能的更改将在下一次代理轮次中被拾取。

### 沙箱隔离技能 + 环境变量

当会话处于 **沙箱隔离** 状态时，技能进程在 Docker 内部运行。沙箱
**不** 继承主机的 `process.env`。

使用以下之一：

- `agents.defaults.sandbox.docker.env` (或按代理的 `agents.list[].sandbox.docker.env`)
- 将环境变量烘焙到您的自定义沙箱镜像中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于 **host** 运行。
