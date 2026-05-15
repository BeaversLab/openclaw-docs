---
summary: "历史桥接协议（传统节点）：TCP JSONL、配对、作用域内 RPC"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "Bridge 协议"
---

<Warning>TCP 桥接已被 **移除**。当前的 OpenClaw 构建版本不包含桥接监听器，并且 OpenClaw`bridge.*`Gateway(网关) 配置键也不再存在于架构中。此页面仅作历史参考保留。请将 [Gateway Protocol](/zh/gateway/protocol) 用于所有节点/操作员客户端。</Warning>

## 存在原因

- **安全边界**：桥接暴露了一个小型允许列表，而不是完整的 gateway API 表面。
- **配对 + 节点身份**：节点准入由 gateway 拥有，并与每个节点的令牌绑定。
- **设备发现体验**：节点可以通过局域网上的 Bonjour 发现 gateway，或者通过 tailnet 直接连接。
- **Loopback WS**：完整的 WS 控制平面保持本地状态，除非通过 SSH 隧道传输。

## 传输

- TCP，每行一个 JSON 对象 (JSONL)。
- 可选 TLS（当 `bridge.tls.enabled` 为 true 时）。
- 历史上的默认监听端口是 `18790`（当前构建版本不会启动 TCP 桥接）。

启用 TLS 后，设备发现 TXT 记录包含 `bridgeTls=1` 加上 `bridgeTlsSha256` 作为非机密提示。请注意，Bonjour/mDNS TXT 记录是未经身份验证的；在未经明确的用户意图或其他带外验证的情况下，客户端不得将公布的指纹视为权威 pin。

## 握手 + 配对

1. 客户端发送 `hello`，其中包含节点元数据 + 令牌（如果已配对）。
2. 如果未配对，gateway 回复 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客户端发送 `pair-request`。
4. Gateway 等待批准，然后发送 `pair-ok` 和 `hello-ok`。

历史上，`hello-ok` 返回 `serverName`；托管插件表面现在通过 `pluginSurfaceUrls`Canvas 进行通告。Canvas/A2UI 使用
`pluginSurfaceUrls.canvas`；已弃用的 `canvasHostUrl` 别名不是重构后协议的一部分。

## 帧

客户端 → Gateway：

- `req` / `res`RPC: 作用域 Gateway RPC（聊天、会话、配置、健康、语音唤醒、skills.bins）
- `event`: 节点信号（语音转录、代理请求、聊天订阅、exec 生命周期）

Gateway → 客户端：

- `invoke` / `invoke-res`: 节点命令（`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`）
- `event`: 已订阅会话的聊天更新
- `ping` / `pong`: 保活

旧的允许列表强制执行位于 `src/gateway/server-bridge.ts`（已移除）中。

## Exec 生命周期事件

节点可以发出 `exec.finished` 或 `exec.denied` 事件来展示 system.run 活动。
这些事件被映射到网关中的系统事件。（旧节点可能仍会发出 `exec.started`。）

有效载荷字段（除非另有说明，否则均为可选）：

- `sessionKey`（必需）：用于接收系统事件的代理会话。
- `runId`：用于分组的唯一 exec id。
- `command`：原始或格式化的命令字符串。
- `exitCode`, `timedOut`, `success`, `output`：完成详情（仅限已完成）。
- `reason`：拒绝原因（仅限已拒绝）。

## 历史 tailnet 用法

- 将桥接绑定到 tailnet IP：`bridge.bind: "tailnet"` 在
  `~/.openclaw/openclaw.json` 中（仅限历史记录；`bridge.*` 不再有效）。
- 客户端通过 MagicDNS 名称或 tailnet IP 进行连接。
- Bonjour **不**跨越网络；必要时请使用手动主机/端口或广域 DNS-SD。

## 版本控制

桥接是**隐式 v1**（无最小/最大协商）。本节仅供参考；当前的节点/操作员客户端使用 WebSocket
[Gateway(网关) 协议](<Gateway(网关)/en/gateway/protocol>)。

## 相关

- [Gateway(网关) 协议](<Gateway(网关)/en/gateway/protocol>)
- [节点](/zh/nodes)
