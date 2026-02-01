---
summary: "WebSocket Gateway 架构、组件与客户端流程"
read_when:
  - 在处理 Gateway 协议、客户端或传输层时
---
# Gateway 架构

最后更新：2026-01-22

## 概览

- 单一、长期存活的 **Gateway** 拥有全部消息入口（WhatsApp via
  Baileys、Telegram via grammY、Slack、Discord、Signal、iMessage、WebChat）。
- 控制平面客户端（macOS app、CLI、web UI、自动化）通过配置的绑定主机上的
  **WebSocket** 连接到 Gateway（默认 `127.0.0.1:18789`）。
- **Nodes**（macOS/iOS/Android/headless）也通过 **WebSocket** 连接，但在
  `role: node` 中声明明确的能力/命令。
- 每台主机仅一个 Gateway；它是唯一会打开 WhatsApp 会话的地方。
- **canvas host**（默认 `18793`）提供可由 agent 编辑的 HTML 与 A2UI。

## 组件与流程

### Gateway（daemon）
- 维护各 provider 连接。
- 暴露类型化的 WS API（请求、响应、服务端推送事件）。
- 基于 JSON Schema 校验入站帧。
- 发送如 `agent`、`chat`、`presence`、`health`、`heartbeat`、`cron` 等事件。

### Clients（mac app / CLI / web admin）
- 每个客户端一条 WS 连接。
- 发送请求（`health`、`status`、`send`、`agent`、`system-presence`）。
- 订阅事件（`tick`、`agent`、`presence`、`shutdown`）。

### Nodes（macOS / iOS / Android / headless）
- 用 `role: node` 连接**同一个 WS server**。
- 在 `connect` 中提供设备身份；配对以**设备为单位**（`role node`），审批存放在设备配对存储中。
- 暴露如 `canvas.*`、`camera.*`、`screen.record`、`location.get` 等命令。

协议详情：
- [Gateway protocol](/zh/gateway/protocol)

### WebChat
- 静态 UI，使用 Gateway WS API 获取聊天历史并发送消息。
- 在远程部署中，通过与其他客户端相同的 SSH/Tailscale 隧道连接。

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

- 传输：WebSocket，文本帧承载 JSON。
- 第一帧**必须**是 `connect`。
- 握手后：
  - Requests: `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Events: `{type:"event", event, payload, seq?, stateVersion?}`
- 若设置了 `OPENCLAW_GATEWAY_TOKEN`（或 `--token`），`connect.params.auth.token`
  必须匹配，否则 socket 关闭。
- 具有副作用的方法（`send`、`agent`）要求幂等键以安全重试；服务端维护短期去重缓存。
- Nodes 必须在 `connect` 中包含 `role: "node"` 以及 caps/commands/permissions。

## 配对与本地信任

- 所有 WS 客户端（操作端 + nodes）在 `connect` 中都包含**设备身份**。
- 新设备 ID 需要配对审批；Gateway 会发放**设备 token**供后续连接使用。
- **本地**连接（loopback 或 Gateway 主机自身的 tailnet 地址）可自动审批以保持同机 UX 顺滑。
- **非本地**连接必须对 `connect.challenge` 的 nonce 进行签名并需要显式审批。
- Gateway auth（`gateway.auth.*`）仍适用于**所有**连接，无论本地或远程。

更多细节：[Gateway protocol](/zh/gateway/protocol)、[Pairing](/zh/start/pairing)、
[Security](/zh/gateway/security)。

## 协议类型与代码生成

- TypeBox schema 定义协议。
- JSON Schema 由这些 schema 生成。
- Swift 模型由 JSON Schema 生成。

## 远程访问

- 推荐：Tailscale 或 VPN。
- 备选：SSH 隧道
  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```
- 隧道中仍使用同样的握手 + auth token。
- 远程环境可启用 WS 的 TLS + 可选 pinning。

## 运维快照

- 启动：`openclaw gateway`（前台运行，日志输出到 stdout）。
- 健康：通过 WS 的 `health`（也包含在 `hello-ok`）。
- 监控：launchd/systemd 自动重启。

## 不变量

- 每台主机恰好一个 Gateway 控制单一 Baileys 会话。
- 握手是强制的；任何非 JSON 或非 connect 的首帧都会被硬关闭。
- 事件不重放；客户端在断档时必须刷新。
