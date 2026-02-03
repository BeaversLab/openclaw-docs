---
summary: "Bridge 协议（旧版节点）：TCP JSONL、配对与作用域 RPC"
read_when:
  - 构建或调试 node 客户端（iOS/Android/macOS node 模式）
  - 调查配对或 bridge 认证失败
  - 审计 gateway 暴露的 node 面
title: "Bridge 协议"
---

# Bridge 协议（旧版 node 传输）

Bridge 协议是**旧版** node 传输（TCP JSONL）。新的 node 客户端应使用统一的 Gateway WebSocket 协议。

如果你在构建 operator 或 node 客户端，请使用
[Gateway protocol](/zh/gateway/protocol)。

**注意：**当前 OpenClaw 构建已不再提供 TCP bridge listener；此文仅作历史参考。
旧版 `bridge.*` 配置键也不再属于配置 schema。

## 为什么同时存在两套

- **安全边界**：bridge 只暴露小型 allowlist，而非完整 gateway API 面。
- **配对 + node 身份**：node 接纳由 gateway 管理，并与 per-node token 绑定。
- **发现 UX**：nodes 可通过 LAN 的 Bonjour 发现 gateway，或通过 tailnet 直连。
- **Loopback WS**：完整 WS 控制平面保持本地，除非通过 SSH 隧道。

## 传输

- TCP，每行一个 JSON 对象（JSONL）。
- 可选 TLS（当 `bridge.tls.enabled` 为 true）。
- 旧默认监听端口为 `18790`（当前构建不再启动 TCP bridge）。

启用 TLS 时，发现 TXT 记录包含 `bridgeTls=1` 与
`bridgeTlsSha256`，便于 nodes 固定证书。

## 握手 + 配对

1. 客户端发送 `hello`（node 元数据 + token，若已配对）。
2. 未配对时 gateway 返回 `error`（`NOT_PAIRED`/`UNAUTHORIZED`）。
3. 客户端发送 `pair-request`。
4. Gateway 等待审批，然后发送 `pair-ok` 与 `hello-ok`。

`hello-ok` 返回 `serverName`，并可能包含 `canvasHostUrl`。

## Frames

Client → Gateway：

- `req` / `res`：作用域 gateway RPC（chat、sessions、config、health、voicewake、skills.bins）
- `event`：node 信号（语音转写、agent 请求、chat 订阅、exec 生命周期）

Gateway → Client：

- `invoke` / `invoke-res`：node 命令（`canvas.*`、`camera.*`、`screen.record`、
  `location.get`、`sms.send`）
- `event`：已订阅会话的 chat 更新
- `ping` / `pong`：保活

旧版 allowlist 执行位于 `src/gateway/server-bridge.ts`（已移除）。

## Exec 生命周期事件

Nodes 可发送 `exec.finished` 或 `exec.denied` 事件以呈现 system.run 活动。
这些会映射为 gateway 的系统事件。（旧版 nodes 可能仍发送 `exec.started`。）

Payload 字段（除注明外均为可选）：
- `sessionKey`（必填）：接收系统事件的 agent 会话。
- `runId`：用于分组的唯一 exec id。
- `command`：原始或格式化命令字符串。
- `exitCode`、`timedOut`、`success`、`output`：完成详情（仅 finished）。
- `reason`：拒绝原因（仅 denied）。

## Tailnet 使用

- 将 bridge 绑定到 tailnet IP：在 `~/.openclaw/openclaw.json` 中设置 `bridge.bind: "tailnet"`。
- 客户端通过 MagicDNS 名称或 tailnet IP 连接。
- Bonjour **不**跨网络；必要时使用手动 host/port 或广域 DNS‑SD。

## 版本

Bridge 目前为**隐式 v1**（无 min/max 协商）。需向后兼容；若有破坏性变更应先添加 bridge 协议版本字段。
