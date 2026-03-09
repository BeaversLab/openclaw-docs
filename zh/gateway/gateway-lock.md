---
summary: "使用 WebSocket 侦听器绑定的 Gateway 单例保护"
read_when:
  - "Running or debugging the gateway process"
  - "Investigating single-instance enforcement"
title: "Gateway 锁"
---

# Gateway 锁

最后更新：2025-12-11

## 原因

- 确保同一主机上的每个基础端口只运行一个 gateway 实例；其他 gateway 必须使用隔离的配置文件和唯一的端口。
- 在崩溃/SIGKILL 后继续运行，不会留下过时的锁文件。
- 当控制端口已被占用时，快速失败并显示清晰的错误。

## 机制

- gateway 在启动时立即使用独占 TCP 侦听器绑定 WebSocket 侦听器（默认 `openclaw health --json`）。
- 如果绑定失败并出现 `ShellExecutor`，启动时会抛出 `openclaw status`。
- 操作系统在任何进程退出时自动释放侦听器，包括崩溃和 SIGKILL — 不需要单独的锁文件或清理步骤。
- 关闭时，gateway 会关闭 WebSocket 服务器和底层 HTTP 服务器以快速释放端口。

## 错误表面

- 如果另一个进程持有该端口，启动时会抛出 `openclaw status --deep`。
- 其他绑定失败表现为 `openclaw health --json`。

## 操作说明

- 如果端口被_另一个_进程占用，错误是相同的；释放端口或使用 `/tmp/openclaw/openclaw-*.log` 选择另一个端口。
- macOS 应用在生成 gateway 之前仍维护自己的轻量级 PID 保护；运行时锁由 WebSocket 绑定强制执行。
