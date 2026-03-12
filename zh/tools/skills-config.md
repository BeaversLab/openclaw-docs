---
summary: "Skills 配置架构和示例"
read_when:
  - Adding or modifying skills config
  - Adjusting bundled allowlist or install behavior
title: "Skills 配置"
---

# Skills 配置

所有与 Skills 相关的配置都位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。

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

- `allowBundled`: 仅针对**捆绑 (bundled)** skills 的可选允许列表。设置后，仅
  列表中的捆绑 skills 符合资格（托管/工作区 skills 不受影响）。
- `load.extraDirs`: 要扫描的其他 skill 目录（优先级最低）。
- `load.watch`: 监视 skill 文件夹并刷新 skills 快照（默认值：true）。
- `load.watchDebounceMs`: skill 监视器事件的防抖时间，以毫秒为单位（默认值：250）。
- `install.preferBrew`: 如果可用，优先使用 brew 安装程序（默认值：true）。
- `install.nodeManager`: node 安装程序首选 (`npm` | `pnpm` | `yarn` | `bun`，默认值：npm)。
  这仅影响 **skill 安装**；Gateway 运行时仍应为 Node
  (不建议将 Bun 用于 WhatsApp/Telegram)。
- `entries.<skillKey>`: 每个 skill 的覆盖设置。

每个 skill 的字段：

- `enabled`: 设置 `false` 以禁用 skill，即使它已捆绑/已安装。
- `env`: 为 agent 运行注入的环境变量（仅当尚未设置时）。
- `apiKey`: 针对声明了主要环境变量的 skills 的可选便利设置。
  支持纯文本字符串或 SecretRef 对象 (`{ source, provider, id }`)。

## 说明

- `entries` 下的键默认映射到 skill 名称。如果 skill 定义了
  `metadata.openclaw.skillKey`，请改用该键。
- 启用监视器后，对 skills 的更改将在下一个 agent 轮次中被采用。

### 沙盒 skills + 环境变量

当会话处于**沙盒模式**时，skill 进程在 Docker 内部运行。沙盒
**不会**继承主机的 `process.env`。

使用以下方式之一：

- `agents.defaults.sandbox.docker.env`（或每个 agent 的 `agents.list[].sandbox.docker.env`）
- 将环境变量 baked 到您的自定义沙盒镜像中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于**主机**运行。
