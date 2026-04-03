---
summary: "Bridge protocol (legacy nodes): TCP JSONL, pairing, scoped RPC"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "Bridge Protocol"
---

# 网桥协议（旧版节点传输）

<Warning>TCP 桥接已被**移除**。当前的 OpenClaw 构建版本不附带桥接监听器，且 `bridge.*` 配置键已不再架构中。此页面仅供历史参考。对于所有节点/运营商客户端，请使用 [Gateway(网关) 协议](/en/gateway/protocol)。</Warning>

## 为什么我们两者都有

- **安全边界**：桥接暴露的是一个小型的允许列表，而不是
  完整的 gateway API 表面。
- **配对 + 节点身份**：节点准入由 gateway 管理，并绑定
  到特定于节点的令牌。
- **设备发现用户体验**：节点可以通过局域网上的 Bonjour 发现 gateway，或通过 tailnet
  直接连接。
- **Loopback WS**：完整的 WS 控制平面保持本地，除非通过 SSH 隧道传输。

## 传输

- TCP，每行一个 JSON 对象 (JSONL)。
- 可选 TLS （当 `bridge.tls.enabled` 为 true 时）。
- 旧版默认监听端口为 `18790` （当前构建版本不会启动 TCP 桥接）。

当启用 TLS 时，设备发现 TXT 记录包含 `bridgeTls=1` 以及
`bridgeTlsSha256` 作为非机密提示。请注意，Bonjour/mDNS TXT 记录是
未经身份验证的；在没有明确的用户意图或其他带外验证的情况下，客户端
不得将通告的指纹视为权威的固定值。

## 握手 + 配对

1. 客户端发送 `hello`，其中包含节点元数据 + 令牌（如果已配对）。
2. 如果未配对，gateway 回复 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客户端发送 `pair-request`。
4. Gateway(网关) 等待批准，然后发送 `pair-ok` 和 `hello-ok`。

`hello-ok` 返回 `serverName` 并且可能包含 `canvasHostUrl`。

## 帧

客户端 → Gateway(网关)：

- `req` / `res`：作用域内 gateway RPC （聊天、会话、配置、健康、语音唤醒、skills.bins）
- `event`：节点信号（语音转录、代理请求、聊天订阅、exec 生命周期）

Gateway(网关) → 客户端：

- `invoke` / `invoke-res`: 节点命令 (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event`: 已订阅会话的聊天更新
- `ping` / `pong`: 保活

旧版允许列表强制执行位于 `src/gateway/server-bridge.ts`（已移除）中。

## 执行生命周期事件

节点可以发出 `exec.finished` 或 `exec.denied` 事件以展示 system.run 活动。
这些事件会在网关中映射到系统事件。（旧版节点可能仍会发出 `exec.started`。）

Payload 字段（除非另有说明，均为可选）：

- `sessionKey`（必需）：接收系统事件的代理会话。
- `runId`：用于分组的唯一执行 ID。
- `command`：原始或格式化的命令字符串。
- `exitCode`, `timedOut`, `success`, `output`：完成详细信息（仅限已完成）。
- `reason`：拒绝原因（仅限已拒绝）。

## Tailnet 使用

- 将桥接绑定到 Tailnet IP：`bridge.bind: "tailnet"` 在
  `~/.openclaw/openclaw.json` 中。
- 客户端通过 MagicDNS 名称或 Tailnet IP 进行连接。
- Bonjour **不**跨网络工作；需要时请使用手动主机/端口或广域 DNS‑SD
  。

## 版本控制

桥接目前为 **隐式 v1**（无最小/最大协商）。预期向后兼容；
在任何重大更改之前添加一个桥接协议版本字段。
