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

示例：

- 原生 Nano Banana 风格的设置：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 设置：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## 字段

- `allowBundled`：可选的允许列表，仅针对 **内置 (bundled)** 技能。设置后，
  列表中只有内置技能符合条件（托管/工作区技能不受影响）。
- `load.extraDirs`：要扫描的其他技能目录（优先级最低）。
- `load.watch`：监视技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监视器事件的防抖时间，以毫秒为单位（默认：250）。
- `install.preferBrew`：当可用时首选 brew 安装程序（默认：true）。
- `install.nodeManager`：node 安装程序首选项（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  这仅影响 **技能安装**；Gateway(网关) 运行时仍应为 Node
  （对于 Bun/WhatsApp 不推荐使用 Telegram）。
- `entries.<skillKey>`：针对每个技能的覆盖设置。

针对每个技能的字段：

- `enabled`：设置 `false` 以禁用某个技能，即使它已被内置/安装。
- `env`：为代理运行注入的环境变量（仅在尚未设置时）。
- `apiKey`：为声明了主要环境变量的技能提供的可选便利。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 注意

- `entries` 下的键默认映射到技能名称。如果技能定义了
  `metadata.openclaw.skillKey`，则改用该键。
- 启用监视器后，对技能的更改将在下一次代理轮次中被采纳。

### 沙箱隔离技能 + 环境变量

当会话处于 **沙箱隔离** 状态时，技能进程在 Docker 内部运行。沙箱
**不** 会继承主机的 `process.env`。

使用以下方式之一：

- `agents.defaults.sandbox.docker.env` （或针对每个代理的 `agents.list[].sandbox.docker.env`）
- 将环境变量烘焙到您的自定义沙箱镜像中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于 **主机** 运行。

import zh from "/components/footer/zh.mdx";

<zh />
