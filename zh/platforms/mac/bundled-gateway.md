---
summary: "macOS 上的 Gateway 运行时（外部 launchd 服务）"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "macOS 上的 Gateway"
---

# macOS 上的 Gateway（外部 launchd）

OpenClaw.app 不再打包 Node/Bun 或 Gateway 运行时。该 macOS 应用
需要**外部** `openclaw` CLI 安装，不会将 Gateway 作为
子进程生成，而是管理一个 per‑user launchd 服务以保持 Gateway
运行（如果已有本地 Gateway 在运行，则附加到该现有实例）。

## 安装 CLI（本地模式需要）

Mac 上的默认运行时是 Node 24。Node 22 LTS（目前为 `22.16+`）仍然可用于兼容性。然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用的 **Install CLI** 按钮通过 npm/pnpm 运行相同的流程（不推荐在 Gateway 运行时使用 bun）。

## Launchd（Gateway 作为 LaunchAgent）

标签：

- `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；遗留的 `com.openclaw.*` 可能仍然存在）

Plist 位置（per‑user）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  （或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`）

管理器：

- macOS 应用拥有本地模式下的 LaunchAgent 安装/更新权限。
- CLI 也可以安装它：`openclaw gateway install`。

行为：

- “OpenClaw Active” 启用/禁用 LaunchAgent。
- 退出应用**不会**停止 gateway（launchd 使其保持活动状态）。
- 如果 Gateway 已在配置的端口上运行，应用将附加到
  它而不是启动一个新的。

日志记录：

- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本兼容性

macOS 应用会检查 gateway 版本是否与其自身版本匹配。如果它们
不兼容，请更新全局 CLI 以匹配应用版本。

## 冒烟检查

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
