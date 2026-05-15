---
summary: "使用 WebSocket 侦听器绑定的 Gateway(网关) 网关 单例守护"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Gateway(网关) 锁"
---

## 为什么

- 确保同一主机上每个基础端口只运行一个网关实例；其他网关必须使用隔离的配置文件和唯一的端口。
- 在崩溃或收到 SIGKILL 信号后仍能正常运行，不会留下过时的锁文件。
- 当控制端口已被占用时，快速失败并给出明确的错误信息。

## 机制

- 网关首先在状态锁目录下获取针对每个配置的锁文件，并探测配置的端口以查找现有的侦听器。
- 如果记录的锁所有者已消失，端口空闲，或者锁已过期，启动过程将回收该锁并继续。
- 然后，网关使用独占 TCP 侦听器绑定 HTTP/WebSocket 侦听器（默认为 `ws://127.0.0.1:18789`）。
- 如果绑定失败并出现 `EADDRINUSE`，启动过程将抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 关闭时，网关会关闭 HTTP/WebSocket 服务器并删除锁文件。

## 错误面

- 如果另一个进程占用了该端口，启动过程将抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他绑定失败将显示为 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作说明

- 如果该端口被*另一个*进程占用，错误是一样的；请释放该端口或使用 `openclaw gateway --port <port>` 选择另一个端口。
- 在服务监督器下，如果新的网关进程发现现有的运行状况良好的 `/healthz` 响应程序，它将保留该进程的控制权。在 systemd 上，重复的启动器将以代码 78 退出，以便默认的 `RestartPreventExitStatus=78` 停止 `Restart=always` 在锁或 `EADDRINUSE` 冲突上循环。如果现有进程从未变为运行状况良好，则重试将受到限制，并且启动过程将以明确的锁错误失败，而不是无限循环。
- macOS 应用程序在生成网关之前仍然维护自己的轻量级 PID 保护；运行时锁由锁文件和 HTTP/WebSocket 绑定强制执行。

## 相关

- [多个网关](/zh/gateway/multiple-gateways) — 使用唯一端口运行多个实例
- [故障排除](/zh/gateway/troubleshooting) — 诊断 `EADDRINUSE` 和端口冲突
