---
summary: "Skills 配置架构和示例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills 配置"
---

大多数 Skills 加载器/安装配置位于 `skills` 中的
`~/.openclaw/openclaw.json` 下。特定于 Agent 的 Skills 可见性位于
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

对于内置的图像生成/编辑，首选 `agents.defaults.imageGenerationModel`
加上核心 `image_generate` 工具。`skills.entries.*` 仅用于自定义或
第三方 Skills 工作流。

如果您选择了特定的图像提供商/模型，还要配置该提供商的
auth/API 密钥。典型示例：针对 `google/*` 的 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，
针对 `openai/*` 的 `OPENAI_API_KEY`，以及针对 `fal/*` 的 `FAL_KEY`。

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

- `agents.defaults.skills`：对于省略
  `agents.list[].skills` 的 Agents，这是共享的基线允许列表。
- 省略 `agents.defaults.skills` 以保持默认情况下 Skills 不受限制。
- `agents.list[].skills`：该 Agent 的显式最终 Skills 集；它不会
  与默认值合并。
- `agents.list[].skills: []`：不向该 Agent 暴露任何 Skills。

## 字段

- 内置 Skills 根目录始终包括 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：可选的允许列表，仅适用于 **bundled**（附带） Skills。设置后，只有
  列表中的附带 Skills 符合条件（托管、Agent 和工作区 Skills 不受影响）。
- `load.extraDirs`：要扫描的其他 Skills 目录（优先级最低）。
- `load.watch`：监视 Skills 文件夹并刷新 Skills 快照（默认：true）。
- `load.watchDebounceMs`：Skills 监视器事件的防抖时间，以毫秒为单位（默认：250）。
- `install.preferBrew`: 如有可用，首选 brew 安装程序（默认：true）。
- `install.nodeManager`: node 安装程序首选项（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  这仅影响 **技能安装**；Gateway(网关) 运行时仍应为 Node
  （对于 Gateway(网关)/Bun 不建议使用 WhatsApp）。
  - `openclaw setup --node-manager` 限制更严格，目前接受 `npm`、
    `pnpm` 或 `bun`。如果您
    想要由 Yarn 支持的技能安装，请手动设置 `skills.install.nodeManager: "yarn"`。
- `entries.<skillKey>`: 每个技能的覆盖设置。
- `agents.defaults.skills`: 可选的默认技能允许列表，由省略
  `agents.list[].skills` 的代理继承。
- `agents.list[].skills`: 可选的每个代理的最终技能允许列表；显式
  列表将替换继承的默认值，而不是合并。

每个技能的字段：

- `enabled`: 设置 `false` 以禁用技能，即使该技能已捆绑/已安装。
- `env`: 为代理运行注入的环境变量（仅当尚未设置时）。
- `apiKey`: 对于声明主要环境变量的技能，这是一个可选的便捷设置。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 注意事项

- `entries` 下的键默认映射到技能名称。如果技能定义了
  `metadata.openclaw.skillKey`，请改用该键。
- 加载优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → 捆绑的技能 →
  `skills.load.extraDirs`。
- 当启用监视器时，技能的更改将在下一个代理轮次中生效。

### 沙箱隔离 技能 + 环境变量

当会话处于**沙箱隔离**状态时，技能进程在配置的
沙箱后端内运行。沙箱**不**继承主机的 `process.env`。

使用以下之一：

- `agents.defaults.sandbox.docker.env` 用于 Docker 后端（或每个代理的 `agents.list[].sandbox.docker.env`）
- 将环境变量烘焙到您的自定义沙箱镜像或远程沙箱环境中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于 **host** 运行。

## 相关

- [Skills](/zh/tools/skills)
- [创建 Skills](/zh/tools/creating-skills)
- [斜杠命令](/zh/tools/slash-commands)
