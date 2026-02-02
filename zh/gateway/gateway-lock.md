---
summary: "使用 WebSocket 监听绑定实现 Gateway 单例保护"
read_when:
  - 运行或调试 gateway 进程
  - 调查单实例强制机制
title: "网关锁"
---
# 网关锁

最后更新：2025-12-11

## 为什么
- 确保同一主机上同一基础端口仅运行一个 gateway 实例；额外网关必须使用隔离 profile 与唯一端口。
- 发生崩溃/SIGKILL 时不遗留陈旧锁文件。
- 当控制端口已被占用时快速失败并给出清晰错误。

## 机制
- gateway 在启动时立即绑定 WebSocket 监听（默认 `ws://127.0.0.1:18789`），使用独占 TCP 监听。
- 若绑定失败并返回 `EADDRINUSE`，启动抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- OS 会在进程退出时自动释放监听（包括崩溃与 SIGKILL）；无需单独锁文件或清理步骤。
- 关闭时 gateway 会关闭 WebSocket 服务器及底层 HTTP 服务器，迅速释放端口。

## 错误呈现
- 若端口被其他进程占用，启动会抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他绑定失败则抛出 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 运维说明
- 若端口被*其他*进程占用，错误相同；释放端口或用 `openclaw gateway --port <port>` 选择其他端口。
- macOS app 在启动 gateway 前仍有轻量 PID guard；运行时锁由 WebSocket 绑定强制。
