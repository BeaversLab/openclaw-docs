---
summary: "用于 macOS UI 自动化的 PeekabooBridge 集成"
read_when:
  - Hosting PeekabooBridge in OpenClaw.app
  - Integrating Peekaboo via Swift Package Manager
  - Changing PeekabooBridge protocol/paths
  - Deciding between PeekabooBridge, Codex Computer Use, and cua-driver MCP
title: "Peekaboo 桥接"
---

OpenClaw 可以托管 **PeekabooBridge** 作为本地、具有权限感知的 UI 自动化
代理。这让 OpenClaw`peekaboo`CLImacOS CLI 能够驱动 UI 自动化，同时复用
macOS 应用程序的 TCC 权限。

## 这是什么（以及不是什么）

- **主机**：OpenClaw.app 可以充当 PeekabooBridge 主机。
- **客户端**：使用 `peekaboo` CLI（没有单独的 `openclaw ui ...` 界面）。
- **界面**：视觉覆盖层保留在 Peekaboo.app 中；OpenClaw 是一个轻量级的代理主机。

## 与计算机使用的关系

OpenClaw 有三种桌面控制路径，它们有意保持独立：

- **PeekabooBridge 主机**：OpenClaw.app 可以托管本地 PeekabooBridge 套接字。
  OpenClaw`peekaboo`CLIOpenClawmacOSPeekaboo CLI 保持为客户端，并使用 OpenClaw.app 的 macOS
  权限来执行 Peekaboo 自动化原语，例如截图、点击、
  菜单、对话框、Dock 操作和窗口管理。
- **Codex Computer Use**：捆绑的 `codex` 插件会准备 Codex 应用服务器，
  验证 Codex 的 `computer-use`OpenClaw MCP 服务器是否可用，然后让
  Codex 在 Codex 模式轮次中拥有本机桌面控制工具调用。OpenClaw
  不会通过 PeekabooBridge 代理这些操作。
- **直接 `cua-driver`OpenClaw MCP**：OpenClaw 可以将 TryCua 的上游
  `cua-driver mcp` 服务器注册为普通 MCP 服务器。这为代理提供了 CUA
  驱动程序自己的架构以及 pid/window/element-index 工作流，而无需通过
  Codex 市场或 PeekabooBridge 套接字进行路由。

当您需要广泛的 macOS 自动化表面和 OpenClaw.app 的
权限感知桥接主机时，请使用 Peekaboo。当 Codex 模式代理
应依赖 Codex 的本机计算机使用插件时，请使用 Codex Computer Use。当您希望将 CUA 驱动程序作为普通
MCP 服务器暴露给任何由 OpenClaw 管理的运行时时，请使用直接 PeekaboomacOSOpenClaw`cua-driver mcp`OpenClaw。

## 启用桥接

在 macOS 应用中：

- 设置 → **启用 Peekaboo Bridge**

启用后，OpenClaw 会启动一个本地 UNIX 套接字服务器。如果禁用，主机
将停止，并且 OpenClaw`peekaboo` 将回退到其他可用的主机。

## 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试主机：

1. Peekaboo.app（完整 UX）
2. Claude.app（如果已安装）
3. OpenClaw.app（精简代理）

使用 `peekaboo bridge status --verbose` 查看哪个主机处于活动状态以及正在使用哪个套接字路径。您可以通过以下方式覆盖：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全性和权限

- 该网桥会验证 **调用方代码签名**；强制执行 TeamID 白名单
  （Peekaboo 主机 TeamID + OpenClaw 应用 TeamID）。
- 对于辅助功能，优先使用签名的桥接/应用身份，而不是通用的 `node` 运行时。向 `node` 授予辅助功能权限后，由该 Node 可执行文件启动的任何包都将继承 GUI 自动化访问权限；请参阅 [macOS permissions](/zh/platforms/mac/permissions#accessibility-grants-for-node-and-cli-runtimes)。
- 请求在大约 10 秒后超时。
- 如果缺少所需权限，桥接会返回明确的错误消息，而不会打开系统设置。

## 快照行为（自动化）

快照存储在内存中，并在短时间内自动过期。如果您需要更长的保留时间，请从客户端重新捕获。

## 故障排除

- 如果 `peekaboo` 报告“bridge client is not authorized”（桥接客户端未授权），请确保客户端已正确签名，或仅在 **debug** 模式下运行带有 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 的主机。
- 如果未找到主机，请打开其中一个主机应用（Peekaboo.app 或 OpenClaw.app）并确认已授予权限。

## 相关

- [macOS app](/zh/platforms/macos)
- [macOS permissions](/zh/platforms/mac/permissions)
