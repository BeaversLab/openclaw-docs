---
summary: "Gateway(网关) 网关 runtime on macOS (external launchd service)"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "Gateway(网关) 网关 on macOS"
---

OpenClaw.app 不再捆绑 Node/Bun 或 Gateway(网关) 运行时。macOS 应用程序
需要一个**外部** `openclaw` CLI 安装，不会将 Gateway(网关) 作为
子进程生成，而是管理一个每用户 launchd 服务以保持 Gateway(网关)
运行（如果已经有一个本地 Gateway(网关) 在运行，则附加到该实例）。

## 安装 CLI（本地模式必需）

Mac 上的默认运行时是 Node 24。Node 22 LTS，目前是 `22.14+`，出于兼容性考虑仍然有效。然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用程序的 **Install CLI** 按钮运行与应用程序内部使用的相同的全局安装流程：它首先首选 npm，然后是 pnpm，如果那是唯一检测到的包管理器，则使用 bun。Node 仍然是推荐的 Gateway(网关) 运行时。

## Launchd (Gateway(网关) 作为 LaunchAgent)

标签：

- `ai.openclaw.gateway` (或 `ai.openclaw.<profile>`；旧的 `com.openclaw.*` 可能仍存在)

Plist 位置（每用户）：

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  (或 `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`)

管理器：

- macOS 应用程序在本地模式下拥有 LaunchAgent 安装/更新的权限。
- CLI 也可以安装它：`openclaw gateway install`。

行为：

- “OpenClow Active” 启用/禁用 LaunchAgent。
- 退出应用程序**不会**停止 gateway(网关)（launchd 会使其保持活动状态）。
- 如果 Gateway(网关) 已在配置的端口上运行，应用程序将附加到
  它，而不是启动一个新的。

日志记录：

- launchd stdout/err：`/tmp/openclaw/openclaw-gateway.log`

## 版本兼容性

macOS 应用程序会根据其自身版本检查 Gateway(网关) 版本。如果它们
不兼容，请更新全局 CLI 以匹配应用程序版本。

## 冒烟测试

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

## 相关

- [macOS 应用](/zh/platforms/macos)
- [Gateway(网关) 运维手册](/zh/gateway)
