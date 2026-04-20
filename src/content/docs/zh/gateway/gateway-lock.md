---
summary: "使用 WebSocket 侦听器绑定的 Gateway(网关) 网关 单例守护"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Gateway(网关) 网关 锁"
---

# Gateway(网关) 网关 锁

## 原因

- 确保同一主机上每个基础端口只运行一个网关实例；其他网关必须使用隔离的配置文件和唯一的端口。
- 在崩溃或 SIGKILL 后恢复运行，不留下过时的锁文件。
- 当控制端口已被占用时，快速失败并给出明确的错误信息。

## 机制

- 网关在启动时立即使用独占 TCP 监听器绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`）。
- 如果绑定失败并出现 `EADDRINUSE`，启动时会抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 操作系统会在任何进程退出时自动释放监听器，包括崩溃和 SIGKILL 的情况——不需要单独的锁文件或清理步骤。
- 关闭时，网关会关闭 WebSocket 服务器和底层的 HTTP 服务器，以迅速释放端口。

## 错误情况

- 如果另一个进程占用了该端口，启动时会抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他绑定错误会显示为 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作说明

- 如果该端口被*另一个*进程占用，错误信息是一样的；请释放该端口或使用 `openclaw gateway --port <port>` 选择另一个端口。
- macOS 应用程序在生成网关之前仍然维护自己的轻量级 PID 守护；运行时锁由 WebSocket 绑定强制执行。

## 相关内容

- [多个网关](/zh/gateway/multiple-gateways) — 使用唯一端口运行多个实例
- [故障排除](/zh/gateway/troubleshooting) — 诊断 `EADDRINUSE` 和端口冲突
