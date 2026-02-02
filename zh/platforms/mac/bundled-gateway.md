---
title: "Gateway on macOS"
summary: "macOS 上的 Gateway 运行时（外部 launchd 服务）"
read_when:
  - 打包 OpenClaw.app
  - 调试 macOS Gateway 的 launchd 服务
  - 安装 macOS 的 Gateway CLI
---

# macOS 上的 Gateway（外部 launchd）

OpenClaw.app 不再内置 Node/Bun 或 Gateway 运行时。macOS 应用
期望外部安装 **`openclaw` CLI**，不会将 Gateway 作为子进程启动，
而是管理一个按用户的 launchd 服务来保持 Gateway 运行（或在本地已有
Gateway 运行时直接附加）。

## 安装 CLI（本地模式必需）

Mac 上需要 Node 22+，然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用的 **Install CLI** 按钮会通过 npm/pnpm 执行相同流程（不推荐用 bun 作为 Gateway 运行时）。

## Launchd（Gateway 作为 LaunchAgent）

Label：
- `bot.molt.gateway`（或 `bot.molt.<profile>`；可能保留旧的 `com.openclaw.*`）

Plist 位置（按用户）：
- `~/Library/LaunchAgents/bot.molt.gateway.plist`
  （或 `~/Library/LaunchAgents/bot.molt.<profile>.plist`）

管理：
- macOS 应用在本地模式下负责安装/更新 LaunchAgent。
- CLI 也可以安装：`openclaw gateway install`。

行为：
- “OpenClaw Active” 启用/禁用 LaunchAgent。
- 退出应用 **不会** 停止 Gateway（launchd 会保持其运行）。
- 如果配置端口上已有 Gateway 在运行，应用会附加而不是启动新的。

日志：
- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本兼容性

macOS 应用会检查 Gateway 版本与自身版本是否兼容。若不兼容，请更新全局 CLI 以匹配应用版本。

## 冒烟检查

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 OPENCLAW_SKIP_CANVAS_HOST=1 openclaw gateway --port 18999 --bind loopback
```

然后：

```bash
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```
