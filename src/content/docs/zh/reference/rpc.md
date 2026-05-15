---
summary: "RPC外部 CLI（signal-cli、imsg）的 RPC 适配器和网关模式"
read_when:
  - Adding or changing external CLI integrations
  - Debugging RPC adapters (signal-cli, imsg)
title: "RPC 适配器"
---

OpenClaw 通过 JSON-RPC 集成外部 CLI。目前使用两种模式。

## 模式 A：HTTP 守护进程 (signal-cli)

- `signal-cli` 作为通过 HTTP 使用 JSON-RPC 的守护进程运行。
- 事件流是 SSE (`/api/v1/events`)。
- 健康探测：`/api/v1/check`。
- 当 `channels.signal.autoStart=true` 时，OpenClaw 拥有生命周期。

有关设置和端点，请参阅 [Signal](/zh/channels/signal)。

## 模式 B：stdio 子进程

- OpenClaw 将 OpenClaw`imsg rpc`iMessage 作为子进程生成，用于 [iMessage](/zh/channels/imessage)。
- JSON-RPC 通过 stdin/stdout 进行行分隔（每行一个 JSON 对象）。
- 不需要 TCP 端口，不需要守护进程。

使用的核心方法：

- `watch.subscribe` → 通知 (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (探针/诊断)

有关旧版设置和寻址，请参阅 [iMessage](iMessage/en/channels/imessage)（首选 `chat_id`）。

## 适配器指南

- Gateway(网关) 拥有该进程（启动/停止与提供商生命周期绑定）。
- 保持 RPC 客户端弹性：设置超时，退出时重启。
- 优先使用稳定的 ID（例如 `chat_id`），而不是显示字符串。

## 相关

- [Gateway(网关) 协议](<Gateway(网关)/en/gateway/protocol>)
