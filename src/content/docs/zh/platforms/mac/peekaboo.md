---
summary: "用于 macOS UI 自动化的 PeekabooBridge 集成"
read_when:
  - Hosting PeekabooBridge in OpenClaw.app
  - Integrating Peekaboo via Swift Package Manager
  - Changing PeekabooBridge protocol/paths
title: "Peekaboo 桥接"
---

OpenClaw 可以托管 **PeekabooBridge** 作为本地、具有权限感知的 UI 自动化代理。这使得 `peekaboo` CLI 可以驱动 UI 自动化，同时重用 macOS 应用的 TCC 权限。

## 这是什么（以及不是什么）

- **主机**：OpenClaw.app 可以充当 PeekabooBridge 主机。
- **客户端**：使用 `peekaboo` CLI（没有单独的 `openclaw ui ...` 界面）。
- **界面**：视觉覆盖层保留在 Peekaboo.app 中；OpenClaw 是一个轻量级的代理主机。

## 启用桥接

在 macOS 应用中：

- 设置 → **启用 Peekaboo 桥接**

启用后，OpenClaw 会启动一个本地 UNIX 套接字服务器。如果禁用，主机将停止，`peekaboo` 将回退到其他可用的主机。

## 客户端发现顺序

Peekaboo 客户端通常按以下顺序尝试主机：

1. Peekaboo.app（完整体验）
2. Claude.app（如果已安装）
3. OpenClaw.app（轻量级代理）

使用 `peekaboo bridge status --verbose` 查看哪个主机处于活动状态以及正在使用哪个套接字路径。你可以通过以下方式覆盖：

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## 安全与权限

- 桥接验证 **调用者代码签名**；强制执行 TeamID 白名单（Peekaboo 主机 TeamID + OpenClaw 应用 TeamID）。
- 请求在大约 10 秒后超时。
- 如果缺少所需的权限，桥接将返回明确的错误消息，而不是启动系统设置。

## 快照行为（自动化）

快照存储在内存中，并在短时间内自动过期。如果需要更长时间的保留，请从客户端重新捕获。

## 故障排除

- 如果 `peekaboo` 报告“桥接客户端未获得授权”，请确保客户端已正确签名，或者仅在 **调试** 模式下使用 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 运行主机。
- 如果未找到主机，请打开其中一个主机应用（Peekaboo.app 或 OpenClaw.app）并确认已授予权限。

## 相关

- [macOS 应用](/zh/platforms/macos)
- [macOS 权限](/zh/platforms/mac/permissions)
