---
summary: "网桥协议（旧版节点）：TCP JSONL、配对、作用域 RPC"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "网桥协议"
---

# 网桥协议（旧版节点传输）

网桥协议是一种**旧版**节点传输 (TCP JSONL)。新的节点客户端
应改用统一的网关 WebSocket 协议。

如果您正在构建运营商或节点客户端，请使用
[网关协议](/zh/en/gateway/protocol)。

**注意：** 当前的 OpenClaw 版本不再包含 TCP 网桥监听器；本文档仅供参考。
旧版 `bridge.*` 配置键已不再是配置架构的一部分。

## 为何两者并存

- **安全边界**：网桥公开一个小的允许列表，而不是
  完整的网关 API 表面。
- **配对 + 节点身份**：节点准入由网关拥有并绑定
  到每个节点的令牌。
- **发现体验**：节点可以通过 LAN 上的 Bonjour 发现网关，或者连接
  直连到 tailnet。
- **回环 WS**：完整的 WS 控制平面保持本地状态，除非通过 SSH 隧道传输。

## 传输

- TCP，每行一个 JSON 对象 (JSONL)。
- 可选 TLS（当 `bridge.tls.enabled` 为 true 时）。
- 旧版默认监听端口是 `18790`（当前版本不启动 TCP 网桥）。

启用 TLS 时，发现 TXT 记录包含 `bridgeTls=1` 加上
`bridgeTlsSha256` 作为非机密提示。请注意，Bonjour/mDNS TXT 记录是
未经身份验证的；在没有明确用户意图或其他带外验证的情况下，客户端不得将公布的指纹视为
权威固定值。

## 握手 + 配对

1. 客户端发送 `hello`，其中包含节点元数据和令牌（如果已配对）。
2. 如果未配对，网桥回复 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客户端发送 `pair-request`。
4. 网桥等待批准，然后发送 `pair-ok` 和 `hello-ok`。

`hello-ok` 返回 `serverName` 并且可能包含 `canvasHostUrl`。

## 帧

客户端 → 网桥：

- `req` / `res`：作用域网关 RPC (chat, sessions, config, health, voicewake, skills.bins)
- `event`: 节点信号（语音转录、代理请求、聊天订阅、执行生命周期）

网关 → 客户端：

- `invoke` / `invoke-res`: 节点命令（`canvas.*`、 `camera.*`、 `screen.record`、
  `location.get`、 `sms.send`）
- `event`: 已订阅会话的聊天更新
- `ping` / `pong`: 保活

旧的允许列表强制执行位于 `src/gateway/server-bridge.ts` 中（已移除）。

## 执行生命周期事件

节点可以发出 `exec.finished` 或 `exec.denied` 事件来呈现 system.run 活动。
这些事件会映射到网关中的系统事件。（旧版节点可能仍会发出 `exec.started`。）

负载字段（除非另有说明，均为可选）：

- `sessionKey`（必需）：接收系统事件的代理会话。
- `runId`: 用于分组的唯一执行 ID。
- `command`: 原始或格式化的命令字符串。
- `exitCode`、 `timedOut`、 `success`、 `output`: 完成详情（仅限已完成）。
- `reason`: 拒绝原因（仅限已拒绝）。

## Tailnet 使用

- 将桥接绑定到 Tailnet IP：`bridge.bind: "tailnet"` 在
  `~/.openclaw/openclaw.json` 中。
- 客户端通过 MagicDNS 名称或 Tailnet IP 连接。
- Bonjour **不**跨网络工作；必要时请使用手动主机/端口或广域 DNS‑SD
  。

## 版本控制

桥接目前是**隐式 v1**（无最小/最大协商）。预期具有向后兼容性；
在任何重大更改之前，添加一个桥接协议版本字段。
