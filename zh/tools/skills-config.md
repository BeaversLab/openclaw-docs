---
title: "技能配置"
summary: "技能配置 schema 与示例"
read_when:
  - 添加或修改技能配置
  - 调整内置 allowlist 或安装行为
---

# 技能配置

所有技能相关配置位于 `~/.openclaw/openclaw.json` 的 `skills` 下。

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
        apiKey: "GEMINI_KEY_HERE",
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

- `allowBundled`：仅对 **内置** 技能的可选 allowlist。设置后，只有列表中的内置技能可用（不影响 managed/workspace 技能）。
- `load.extraDirs`：额外扫描的技能目录（最低优先级）。
- `load.watch`：监听技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监听事件的防抖时间（毫秒，默认：250）。
- `install.preferBrew`：优先使用 brew 安装器（默认：true）。
- `install.nodeManager`：node 安装器偏好（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  仅影响 **技能安装**；Gateway 运行时仍应为 Node（WhatsApp/Telegram 不推荐 Bun）。
- `entries.<skillKey>`：按技能覆写。

单技能字段：

- `enabled`：设为 `false` 可禁用技能，即使已内置/已安装。
- `env`：为 agent 运行注入环境变量（仅当未设置时）。
- `apiKey`：对声明了主环境变量的技能的可选便捷字段。

## 说明

- `entries` 下的 key 默认映射为技能名。若技能定义了
  `metadata.openclaw.skillKey`，请使用该 key。
- 当启用 watcher 时，技能变更会在下一次 agent 回合中生效。

### 沙箱技能 + 环境变量

当会话 **在沙箱中**，技能进程在 Docker 内运行。沙箱 **不会** 继承宿主机的 `process.env`。

可选方式：

- `agents.defaults.sandbox.docker.env`（或按 agent 的 `agents.list[].sandbox.docker.env`）
- 将环境变量烘焙进你的自定义沙箱镜像

全局 `env` 与 `skills.entries.<skill>.env/apiKey` 仅对 **宿主机** 运行生效。
