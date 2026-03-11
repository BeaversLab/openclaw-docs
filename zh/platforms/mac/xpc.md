---
summary: "OpenClaw 应用的 macOS IPC 架构、Gateway 节点传输和 PeekabooBridge"
read_when:
  - "编辑 IPC 契约或菜单栏应用 IPC"
title: "macOS IPC"
---

# OpenClaw macOS IPC 架构

**当前模型：**一个本地 Unix 套接字将**节点主机服务**连接到 **macOS 应用**以进行执行批准 + `system.run`。存在一个 `openclaw-mac` 调试 CLI 用于发现/连接检查；代理操作仍通过 Gateway WebSocket 和 `node.invoke` 流动。UI 自动化使用 PeekabooBridge。

## 目标

- 单个 GUI 应用实例拥有所有面向 TCC 的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 自动化的小型接口：Gateway + 节点命令，以及用于 UI 自动化的 PeekabooBridge。
- 可预测的权限：始终是相同的签名 bundle ID，由 launchd 启动，因此 TCC 授权保持不变。

## 工作原理

### Gateway + 节点传输

- 应用运行 Gateway（本地模式）并作为节点连接到它。
- 代理操作通过 `node.invoke` 执行（例如 `system.run`、`system.notify`、`canvas.*`）。

### 节点服务 + 应用 IPC

- 一个无头节点主机服务连接到 Gateway WebSocket。
- `system.run` 请求通过本地 Unix 套接字转发到 macOS 应用。
- 应用在 UI 上下文中执行 exec，根据需要提示，并返回输出。

图示 (SCI)：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自动化）

- UI 自动化使用名为 `bridge.sock` 的单独 UNIX 套接字和 PeekabooBridge JSON 协议。
- 主机首选项顺序（客户端）：Peekaboo.app → Claude.app → OpenClaw.app → 本地执行。
- 安全性：网桥主机需要允许的 TeamID；仅 DEBUG 的同 UID 逃生舱由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 保护（Peekaboo 约定）。
- 参见：[PeekabooBridge usage](/zh/platforms/mac/peekaboo) 了解详情。

## 操作流程

- 重启/重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 终止现有实例
  - Swift 构建 + 打包
  - 写入/引导/启动 LaunchAgent
- 单实例：如果正在运行另一个具有相同 bundle ID 的实例，应用会提前退出。

## 加固说明

- 优先要求所有特权表面匹配 TeamID。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅 DEBUG）可能允许同 UID 调用者进行本地开发。
- 所有通信保持仅本地；不暴露网络套接字。
- TCC 提示仅来自 GUI 应用 bundle；在重建之间保持签名的 bundle ID 稳定。
- IPC 加固：套接字模式 `0600`、令牌、对等 UID 检查、HMAC 质询/响应、短 TTL。
