---
summary: "Skills 配置模式和示例"
read_when:
  - 添加或修改 Skills 配置
  - 调整捆绑的允许列表或安装行为
title: "Skills Config"
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
加上核心 `image_generate` 工具。`skills.entries.*` 仅适用于自定义或
第三方 Skills 工作流。

示例：

- 原生 Nano Banana 风格设置：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 设置：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## 字段

- `allowBundled`：仅针对**捆绑** Skills 的可选允许列表。设置后，只有
  列表中的捆绑 Skills 才符合条件（托管/工作区 Skills 不受影响）。
- `load.extraDirs`：要扫描的其他 Skills 目录（优先级最低）。
- `load.watch`：监视 Skills 文件夹并刷新 Skills 快照（默认值：true）。
- `load.watchDebounceMs`：Skills 监视器事件的防抖时间，以毫秒为单位（默认值：250）。
- `install.preferBrew`：在可用时首选 brew 安装程序（默认值：true）。
- `install.nodeManager`：节点安装程序首选项（`npm` | `pnpm` | `yarn` | `bun`，默认值：npm）。
  这仅影响 **Skills 安装**；Gateway(网关) 运行时仍应为 Node
  （不建议对 Gateway(网关)/Bun 使用 WhatsApp）。
- `entries.<skillKey>`：针对每个 Skill 的覆盖设置。

针对每个 Skill 的字段：

- `enabled`：设置 `false` 以禁用某个 Skill，即使它已被捆绑/安装。
- `env`：为代理运行注入的环境变量（仅当尚未设置时）。
- `apiKey`：针对声明了主要环境变量的 Skills 的可选便捷设置。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 注意事项

- 默认情况下，`entries` 下的键映射到 Skill 名称。如果 Skill 定义了
  `metadata.openclaw.skillKey`，请改用该键。
- 当启用监视器时，对技能的更改将在下一个代理轮次中被检测到。

### 沙箱隔离的技能 + 环境变量

当会话是**沙箱隔离**时，技能进程在 Docker 内运行。沙箱**不**继承主机的 `process.env`。

使用以下选项之一：

- `agents.defaults.sandbox.docker.env`（或每个代理的 `agents.list[].sandbox.docker.env`）
- 将环境变量（env）烘焙到您的自定义沙箱镜像中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于**主机**运行。

import zh from "/components/footer/zh.mdx";

<zh />
