---
summary: "使用 WebSocket 监听器绑定的 Gateway(网关) 单例守护进程"
read_when:
  - 运行或调试 gateway 进程
  - 调查单实例执行
title: "Gateway(网关) 锁"
---

# Gateway(网关) 锁

最后更新：2025-12-11

## 原因

- 确保同一主机上每个基础端口只运行一个 gateway 实例；额外的 gateway 必须使用隔离的配置文件和唯一的端口。
- 在崩溃/SIGKILL 后幸存而不留下过时的锁文件。
- 当控制端口已被占用时，以清晰的错误快速失败。

## 机制

- Gateway 在启动时立即使用独占 TCP 监听器绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`）。
- 如果绑定失败并返回 `EADDRINUSE`，启动时将抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 操作系统在任何进程退出（包括崩溃和 SIGKILL）时自动释放监听器——无需单独的锁文件或清理步骤。
- 关闭时，Gateway 会关闭 WebSocket 服务器和底层的 HTTP 服务器，以便及时释放端口。

## 错误面

- 如果另一个进程持有该端口，启动将抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他绑定失败将显示为 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作说明

- 如果端口被*另一个*进程占用，错误是一样的；请释放端口或使用 `openclaw gateway --port <port>` 选择另一个端口。
- macOS 应用程序在生成 gateway 之前仍然维护自己的轻量级 PID 守护进程；运行时锁由 WebSocket 绑定强制执行。

import zh from "/components/footer/zh.mdx";

<zh />
