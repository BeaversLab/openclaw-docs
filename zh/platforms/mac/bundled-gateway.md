---
summary: "macOS 上的 Gateway 运行时（外部 launchd 服务）"
read_when:
  - "Packaging OpenClaw.app"
  - "Debugging the macOS gateway launchd service"
  - "Installing the gateway CLI for macOS"
title: "macOS 上的 Gateway"
---

# macOS 上的 Gateway（外部 launchd）

OpenClaw.app 不再捆绑 Node/Bun 或 Gateway 运行时。macOS 应用
期望**外部** `openclaw` CLI 安装，不会将 Gateway 作为子进程生成，
并管理每个用户的 launchd 服务以保持 Gateway 运行
（如果已有 Gateway 在运行，则附加到现有的本地 Gateway）。

## 安装 CLI（本地模式需要）

Mac 上需要 Node 22+，然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用的 **安装 CLI** 按钮通过 npm/pnpm 运行相同的流程（不建议将 bun 用于 Gateway 运行时）。

## Launchd（作为 LaunchAgent 的 Gateway）

标签：

- `bot.molt.gateway`（或 `bot.molt.<profile>`；旧版 `com.openclaw.*` 可能仍然存在）

Plist 位置（每个用户）：

- `~/Library/LaunchAgents/bot.molt.gateway.plist`
  （或 `~/Library/LaunchAgents/bot.molt.<profile>.plist`）

管理：

- macOS 应用在本地模式下负责 LaunchAgent 的安装/更新。
- CLI 也可以安装它：`openclaw gateway install`。

行为：

- “OpenClaw Active” 启用/禁用 LaunchAgent。
- 应用退出**不会**停止 gateway（launchd 保持其运行）。
- 如果 Gateway 已在配置的端口上运行，应用将附加到
  该 Gateway，而不是启动新的。

日志记录：

- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本兼容性

macOS 应用会检查 gateway 版本与其自身版本的兼容性。如果版本
不兼容，请更新全局 CLI 以匹配应用版本。

## 快速检查

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

然后：

```bash
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```
