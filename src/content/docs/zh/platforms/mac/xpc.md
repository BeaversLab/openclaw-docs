---
summary: "OpenClaw 应用、网关节点传输和 PeekabooBridge 的 macOS IPC 架构"
read_when:
  - Editing IPC contracts or menu bar app IPC
title: "macOS IPC"
---

# OpenClaw macOS IPC 架构

**当前模型：** 一个本地 Unix 套接字将 **节点主机服务 (node host service)** 连接到 **macOS 应用**，用于执行审批 + `system.run`。存在一个 `openclaw-mac` 调试 CLI 用于发现/连接检查；代理操作仍然通过 Gateway(网关) 网关 WebSocket 和 `node.invoke` 流式传输。UI 自动化使用 PeekabooBridge。

## 目标

- 单一 GUI 应用实例，拥有所有面向 TCC 的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 小范围的自动化表面：Gateway(网关) 网关 + 节点命令，加上用于 UI 自动化的 PeekabooBridge。
- 可预测的权限：始终是相同的已签名 Bundle ID，由 launchd 启动，因此 TCC 授权会保持。

## 工作原理

### Gateway(网关) 网关 + 节点传输

- 该应用运行 Gateway(网关) 网关（本地模式）并作为节点连接到它。
- 代理操作通过 `node.invoke` 执行（例如 `system.run`、`system.notify`、`canvas.*`）。

### 节点服务 + 应用 IPC

- 无头节点主机服务连接到 Gateway(网关) 网关 WebSocket。
- `system.run` 请求通过本地 Unix 套接字转发到 macOS 应用。
- 该应用在 UI 上下文中执行 exec，根据需要提示，并返回输出。

图表 (SCI)：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge (UI 自动化)

- UI 自动化使用一个名为 `bridge.sock` 的独立 UNIX 套接字和 PeekabooBridge JSON 协议。
- 主机首选项顺序（客户端）：Peekaboo.app → Claude.app → OpenClaw.app → 本地执行。
- 安全性：网桥主机需要允许的 TeamID；仅限 DEBUG 的同 UID 逃生舱由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 保护（Peekaboo 约定）。
- 详情请参阅：[PeekabooBridge 使用指南](/zh/platforms/mac/peekaboo)。

## 操作流程

- 重启/重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 终止现有实例
  - Swift 构建与打包
  - 写入/引导/启动 LaunchAgent
- 单实例：如果具有相同 Bundle ID 的另一个实例正在运行，应用将提前退出。

## 加固说明

- 对于所有特权接口，优先要求 TeamID 匹配。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅限 DEBUG）可能出于本地开发目的允许具有相同 UID 的调用者。
- 所有通信保持仅限本地；不暴露任何网络套接字。
- TCC 提示仅源自 GUI app 包；在重新构建期间保持签名 Bundle ID 的稳定。
- IPC 加固：socket 模式 `0600`、令牌、对等 UID 检查、HMAC 质询/响应、短 TTL。
