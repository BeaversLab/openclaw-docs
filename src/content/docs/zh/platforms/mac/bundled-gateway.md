---
summary: "Gateway(网关) 网关 runtime on macOS (external launchd service)"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "Gateway(网关) 网关 on macOS"
---

OpenClaw.app 不再捆绑 Node/Bun 或 Gateway(网关) 运行时。macOS 应用
需要一个 **外部** OpenClawBunGateway(网关)macOS`openclaw`CLIGateway(网关)Gateway(网关)Gateway(网关) CLI 安装，不会将 Gateway(网关) 作为
子进程生成，而是管理一个每用户 launchd 服务以保持 Gateway(网关)
运行（或者如果已有本地 Gateway(网关) 在运行，则连接到它）。

## 安装 CLI（本地模式必需）

Mac 上的默认运行时是 Node 24。Node 22 LTS，目前是 `22.19+`，仍然可以兼容使用。然后全局安装 `openclaw`：

```bash
npm install -g openclaw@<version>
```

macOS 应用中的 **安装 CLI** 按钮运行与应用内部使用的相同的全局安装流程：它优先使用 npm，然后是 pnpm，如果只检测到 bun，则使用 bun。Node 仍然是推荐的 Gateway(网关) 运行时。

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

- “OpenClaw 活跃”启用/禁用 LaunchAgent。
- 退出应用程序**不会**停止 gateway(网关)（launchd 会使其保持活动状态）。
- 如果 Gateway(网关) 已在配置的端口上运行，应用程序将附加到
  它，而不是启动一个新的。

日志记录：

- launchd stdout: `~/Library/Logs/openclaw/gateway.log`（配置文件使用 `gateway-<profile>.log`）
- launchd stderr：已屏蔽

## 版本兼容性

macOS 应用会检查 Gateway 版本与其自身版本是否匹配。如果不兼容，请更新全局 CLI 以匹配应用版本。

## 冒烟测试"

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

- [macOS 应用](macOS/en/platforms/macos)
- [Gateway 运维手册](<Gateway(网关)/en/gateway>)
