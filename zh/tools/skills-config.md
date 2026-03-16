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
      "nano-banana-pro": {
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

## 字段

- `allowBundled`：仅适用于**打包 (bundled)** 技能的可选允许列表。设置后，只有列表中包含的打包技能才符合条件（托管/工作区技能不受影响）。
- `load.extraDirs`：要扫描的其他技能目录（优先级最低）。
- `load.watch`：监视技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监视器事件的防抖时间，以毫秒为单位（默认：250）。
- `install.preferBrew`：尽可能使用 brew 安装程序（默认：true）。
- `install.nodeManager`：node 安装程序首选项（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  这仅影响 **skill installs**；Gateway(网关) 运行时仍应为 Node
  （不建议将 Bun 用于 WhatsApp/Telegram）。
- `entries.<skillKey>`：针对单个技能的覆盖设置。

针对单个技能的字段：

- `enabled`：将 `false` 设置为可禁用某个技能，即使它已被打包/安装。
- `env`：为代理运行注入的环境变量（仅当尚未设置时）。
- `apiKey`：针对声明了主要环境变量的技能的可选便捷设置。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 注意事项

- 默认情况下，`entries` 下的键映射到技能名称。如果技能定义了
  `metadata.openclaw.skillKey`，请改为使用该键。
- 当启用监视器时，对技能的更改将在下一次代理轮次中被采用。

### 沙箱隔离技能 + 环境变量

当会话处于**沙箱隔离**状态时，技能进程将在 Docker 内部运行。沙箱**不会**继承主机的 `process.env`。

使用以下方式之一：

- `agents.defaults.sandbox.docker.env`（或针对每个代理的 `agents.list[].sandbox.docker.env`）
- 将环境变量烘焙到您的自定义沙箱镜像中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于 **host** 运行。

import zh from "/components/footer/zh.mdx";

<zh />
