---
summary: "Bridge protocol (legacy nodes): TCP JSONL, pairing, scoped RPC"
read_when:
  - 构建或调试节点客户端 (iOS/Android/macOS 节点模式)
  - 调查配对或网桥身份验证失败
  - 审核网关暴露的节点表面
title: "Bridge Protocol"
---

# Bridge protocol (legacy node transport)

Bridge 协议是一种 **legacy** 节点传输方式 (TCP JSONL)。新的节点客户端
应改用统一的 Gateway(网关) WebSocket 协议。

如果您正在构建 Operator 或节点客户端，请使用
[Gateway(网关) 协议](/zh/gateway/protocol)。

**注意：** 当前的 OpenClaw 版本不再附带 TCP 网桥监听器；保留本文档仅供参考。
旧版 `bridge.*` 配置键不再是配置架构的一部分。

## Why we have both

- **安全边界**：网桥暴露了一个小型允许列表，而不是
  完整的 Gateway(网关) API 表面。
- **配对 + 节点身份**：节点准入由网关拥有，并绑定
  到特定于节点的令牌。
- **发现 UX**：节点可以通过局域网上的 Bonjour 发现网关，或者通过 tailnet
  直接连接。
- **Loopback WS**：除非通过 SSH 隧道传输，否则完整的 WS 控制平面保持本地状态。

## Transport

- TCP，每行一个 JSON 对象 (JSONL)。
- 可选 TLS (当 `bridge.tls.enabled` 为 true 时)。
- 旧版默认监听端口为 `18790` (当前版本不启动 TCP 网桥)。

启用 TLS 后，发现 TXT 记录包含 `bridgeTls=1` 加上
`bridgeTlsSha256` 作为非机密提示。请注意，Bonjour/mDNS TXT 记录是
未经身份验证的；在没有明确的用户意图或其他带外验证的情况下，客户端绝不能将通告的指纹视为
权威固定值。

## Handshake + pairing

1. 客户端发送 `hello`，其中包含节点元数据 + 令牌 (如果已配对)。
2. 如果未配对，网桥回复 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客户端发送 `pair-request`。
4. 网桥等待批准，然后发送 `pair-ok` 和 `hello-ok`。

`hello-ok` 返回 `serverName` 并可能包含 `canvasHostUrl`。

## Frames

客户端 → Gateway(网关)：

- `req` / `res`: 作用域网关 RPC (chat, sessions, config, health, voicewake, skills.bins)
- `event`: 节点信号 (voice transcript, agent request, chat subscribe, exec lifecycle)

Gateway(网关) → 客户端：

- `invoke` / `invoke-res`: 节点命令 (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event`: 已订阅会话的聊天更新
- `ping` / `pong`: 保活

旧版允许列表强制执行位于 `src/gateway/server-bridge.ts` (已移除)。

## 执行生命周期事件

节点可以发出 `exec.finished` 或 `exec.denied` 事件来呈现 system.run 活动。
这些在网关中映射到系统事件。(旧版节点可能仍会发出 `exec.started`。)

Payload 字段 (除非另有说明，否则均为可选)：

- `sessionKey` (必需)：接收系统事件的代理会话。
- `runId`: 用于分组的唯一执行 ID。
- `command`: 原始或格式化的命令字符串。
- `exitCode`, `timedOut`, `success`, `output`: 完成详情 (仅限完成)。
- `reason`: 拒绝原因 (仅限拒绝)。

## Tailnet 使用

- 将桥接绑定到 tailnet IP: `bridge.bind: "tailnet"` 在
  `~/.openclaw/openclaw.json` 中。
- 客户端通过 MagicDNS 名称或 tailnet IP 连接。
- Bonjour **不会**跨越网络；必要时请使用手动主机/端口或广域 DNS‑SD
  。

## 版本控制

桥接目前是 **隐式 v1** (无最小/最大协商)。预期具有向后兼容性
；在进行任何重大更改之前添加桥接协议版本字段。

import zh from "/components/footer/zh.mdx";

<zh />
