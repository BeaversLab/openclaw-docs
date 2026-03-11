---
summary: "Bridge 协议（传统节点）：TCP JSONL、配对、作用域 RPC"
read_when:
  - "Building or debugging node clients (iOS/Android/macOS node mode)"
  - "Investigating pairing or bridge auth failures"
  - "Auditing the node surface exposed by the gateway"
title: "Bridge 协议"
---

# Bridge 协议（传统节点传输）

Bridge 协议是一种**传统**节点传输（TCP JSONL）。新的节点客户端
应该使用统一的 Gateway WebSocket 协议。

如果你正在构建 operator 或节点客户端，请使用
[Gateway protocol](/zh/gateway/protocol)。

**注意：**当前的 OpenClaw 构建版本不再附带 TCP bridge 监听器；本文档保留供历史参考。
传统的 `bridge.*` 配置键不再是配置架构的一部分。

## 为什么我们两者都有

- **安全边界**：bridge 暴露了一个小型允许列表，而不是完整的
  gateway API 表面。
- **配对 + 节点身份**：节点准入由 gateway 拥有，并与
  每个节点的 token 绑定。
- **发现用户体验**：节点可以通过 LAN 上的 Bonjour 发现 gateway，或通过
  tailnet 直接连接。
- **Loopback WS**：完整的 WS 控制平面保持本地，除非通过 SSH 隧道传输。

## 传输

- TCP，每行一个 JSON 对象（JSONL）。
- 可选 TLS（当 `bridge.tls.enabled` 为 true 时）。
- 传统默认监听器端口是 `18790`（当前构建版本不启动 TCP bridge）。

启用 TLS 时，发现 TXT 记录包含 `bridgeTls=1` 加上
`bridgeTlsSha256`，以便节点可以固定证书。

## 握手 + 配对

1. 客户端发送 `hello`，其中包含节点元数据 + token（如果已配对）。
2. 如果未配对，gateway 回复 `error`（`NOT_PAIRED`/`UNAUTHORIZED`）。
3. 客户端发送 `pair-request`。
4. Gateway 等待批准，然后发送 `pair-ok` 和 `hello-ok`。

`hello-ok` 返回 `serverName` 并且可能包含 `canvasHostUrl`。

## 帧

客户端 → Gateway：

- `req` / `res`：作用域 gateway RPC（聊天、会话、配置、健康、语音唤醒、skills.bins）
- `event`：节点信号（语音转录、代理请求、聊天订阅、exec 生命周期）

Gateway → 客户端：

- `invoke` / `invoke-res`：节点命令（`canvas.*`、`camera.*`、`screen.record`、
  `location.get`、`sms.send`）
- `event`：已订阅会话的聊天更新
- `ping` / `pong`：保活

传统的允许列表强制执行位于 `src/gateway/server-bridge.ts`（已删除）。

## Exec 生命周期事件

节点可以发出 `exec.finished` 或 `exec.denied` 事件来显示 system.run 活动。
这些被映射到 gateway 中的系统事件。（传统节点可能仍会发出 `exec.started`。）

负载字段（除非注明，否则都是可选的）：

- `sessionKey`（必需）：接收系统事件的代理会话。
- `runId`：用于分组的唯一 exec id。
- `command`：原始或格式化的命令字符串。
- `exitCode`、`timedOut`、`success`、`output`：完成详细信息（仅已完成）。
- `reason`：拒绝原因（仅被拒绝）。

## Tailnet 使用

- 将 bridge 绑定到 tailnet IP：`~/.openclaw/openclaw.json` 中的
  `bridge.bind: "tailnet"`。
- 客户端通过 MagicDNS 名称或 tailnet IP 连接。
- Bonjour **不**跨网络；在需要时使用手动主机/端口或广域 DNS‑SD。

## 版本控制

Bridge 目前是**隐式 v1**（没有最小/最大协商）。期望向后兼容；
在任何重大更改之前添加 bridge 协议版本字段。
