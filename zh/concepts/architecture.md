---
summary: "WebSocket gateway 架构、组件与客户端流程"
read_when:
  - 在处理 gateway 协议、客户端或传输层工作
title: "Gateway Architecture"
---
# Gateway 架构

最后更新：2026-01-22

## 概览

- 单个长生命周期 **Gateway** 负责所有消息面（WhatsApp via
  Baileys、Telegram via grammY、Slack、Discord、Signal、iMessage、WebChat）。
- 控制面客户端（macOS app、CLI、web UI、自动化）通过 **WebSocket** 连接到
  配置的 bind host（默认 `127.0.0.1:18789`）。
- **Nodes**（macOS/iOS/Android/无头）同样通过 **WebSocket** 连接，但在 `connect` 中声明
  `role: node` 以及明确的 caps/commands。
- 每台主机一个 Gateway；它是唯一打开 WhatsApp 会话的地方。
- **Canvas host**（默认 `18793`）提供 agent 可编辑的 HTML 与 A2UI。

## 组件与流程

### Gateway（daemon）
- 维护 provider 连接。
- 暴露类型化 WS API（请求、响应、服务端推送事件）。
- 使用 JSON Schema 校验入站帧。
- 发出 `agent`、`chat`、`presence`、`health`、`heartbeat`、`cron` 等事件。

### Clients（mac app / CLI / web admin）
- 每个客户端一个 WS 连接。
- 发送请求（`health`、`status`、`send`、`agent`、`system-presence`）。
- 订阅事件（`tick`、`agent`、`presence`、`shutdown`）。

### Nodes（macOS / iOS / Android / headless）
- 使用 `role: node` 连接到 **同一个 WS server**。
- 在 `connect` 中提供设备身份；配对是 **设备级**（role `node`），审批存于设备配对存储。
- 暴露 `canvas.*`、`camera.*`、`screen.record`、`location.get` 等命令。

协议细节：
- [Gateway protocol](/zh/gateway/protocol)

### WebChat
- 静态 UI，使用 Gateway WS API 获取聊天历史并发送消息。
- 远程部署时，通过与其他客户端相同的 SSH/Tailscale 隧道连接。

## 连接生命周期（单客户端）

```
Client                    Gateway
  |                          |
  |---- req:connect -------->|
  |<------ res (ok) ---------|   (or res error + close)
  |   (payload=hello-ok carries snapshot: presence + health)
  |                          |
  |<------ event:presence ---|
  |<------ event:tick -------|
  |                          |
  |------- req:agent ------->|
  |<------ res:agent --------|   (ack: {runId,status:"accepted"})
  |<------ event:agent ------|   (streaming)
  |<------ res:agent --------|   (final: {runId,status,summary})
  |                          |
```

## Wire protocol（摘要）

- 传输：WebSocket，文本帧携带 JSON payload。
- 第一帧 **必须** 为 `connect`。
- 握手后：
  - Requests：`{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Events：`{type:"event", event, payload, seq?, stateVersion?}`
- 若设置了 `OPENCLAW_GATEWAY_TOKEN`（或 `--token`），`connect.params.auth.token`
  必须匹配，否则连接关闭。
- 对具有副作用的方法（`send`、`agent`）必须提供幂等键以便安全重试；服务端会保留短期去重缓存。
- Nodes 必须在 `connect` 中包含 `role: "node"` 以及 caps/commands/permissions。

## 配对 + 本地信任

- 所有 WS 客户端（操作者 + nodes）在 `connect` 中包含 **设备身份**。
- 新设备 ID 需要配对审批；Gateway 会签发 **device token** 供后续连接使用。
- **本地** 连接（loopback 或 gateway 主机自己的 tailnet 地址）可自动批准，以保证同机体验。
- **非本地** 连接必须签名 `connect.challenge` nonce 并需要显式批准。
- Gateway 认证（`gateway.auth.*`）仍适用于 **所有** 连接，无论本地或远程。

详情： [Gateway protocol](/zh/gateway/protocol)、[Pairing](/zh/start/pairing)、
[Security](/zh/gateway/security)。

## 协议类型与代码生成

- TypeBox schema 定义协议。
- 从 schema 生成 JSON Schema。
- 从 JSON Schema 生成 Swift models。

## 远程访问

- 推荐：Tailscale 或 VPN。
- 备选：SSH 隧道
  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```
- 隧道中也适用相同的握手与 auth token。
- 远程场景可启用 WS 的 TLS + 可选 pinning。

## 运维速览

- 启动：`openclaw gateway`（前台，日志输出到 stdout）。
- 健康：通过 WS 调用 `health`（也包含在 `hello-ok` 中）。
- 守护：launchd/systemd 自动重启。

## 不变量

- 每台主机只有一个 Gateway 控制单个 Baileys 会话。
- 握手是必需的；任何非 JSON 或非 connect 的首帧都会硬关闭。
- 事件不重放；客户端必须在缺口时自行刷新。
