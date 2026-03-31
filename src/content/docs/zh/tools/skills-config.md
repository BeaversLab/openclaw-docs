---
summary: "Skills 配置架构和示例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills 配置"
---

# Skills 配置

所有与 Skills 相关的配置都位于 `skills` 下的 `~/.openclaw/openclaw.json` 中。

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
加上核心的 `image_generate` 工具。`skills.entries.*` 仅用于自定义或
第三方技能工作流。

如果选择特定的图像提供商/模型，还需配置该提供商的 auth/API 密钥。典型示例：`google/*` 的 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/*` 的 `OPENAI_API_KEY`，以及 `fal/*` 的 `FAL_KEY`。

示例：

- 原生 Nano Banana 风格设置：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 设置：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## 字段

- 内置技能根目录始终包括 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：仅适用于**内置**技能的可选允许列表。设置后，
  只有列表中的内置技能符合条件（受管技能、代理技能和工作区技能不受影响）。
- `load.extraDirs`：要扫描的其他技能目录（优先级最低）。
- `load.watch`：监视技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监视器事件的去抖动时间（毫秒）（默认：250）。
- `install.preferBrew`：在可用时首选 brew 安装程序（默认：true）。
- `install.nodeManager`：Node 安装程序首选（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  这仅影响**技能安装**；Gateway(网关) 运行时仍应为 Node
  （不建议将 Bun 用于 WhatsApp/Telegram）。
- `entries.<skillKey>`：按技能覆盖。

按技能字段：

- `enabled`：将 `false` 设置为禁用技能，即使其已内置/已安装。
- `env`：为代理运行注入的环境变量（仅在尚未设置时）。
- `apiKey`：为声明主要环境变量的技能提供的可选便利。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 注意事项

- 默认情况下，`entries` 下的键映射到技能名称。如果技能定义了
  `metadata.openclaw.skillKey`，请改用该键。
- 加载优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → 内置技能 →
  `skills.load.extraDirs`。
- 启用监视器后，技能的更改将在下一个代理轮次中被拾取。

### 沙箱隔离技能 + 环境变量

当会话处于**沙箱隔离**状态时，技能进程在 Docker 内运行。沙箱
**不**继承主机 `process.env`。

使用以下方法之一：

- `agents.defaults.sandbox.docker.env`（或每个代理 `agents.list[].sandbox.docker.env`）
- 将环境变量 baked 到你的自定义沙箱镜像中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于 **host** 运行。
