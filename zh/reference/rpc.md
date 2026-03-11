---
summary: "用于外部 CLI（signal-cli、legacy imsg）的 RPC 适配器和 Gateway 模式"
read_when:
  - "Adding or changing external CLI integrations"
  - "Debugging RPC adapters (signal-cli, imsg)"
title: "RPC 适配器"
---

# RPC 适配器

OpenClaw 通过 JSON-RPC 集成外部 CLI。目前使用两种模式。

## 模式 A：HTTP 守护进程（signal-cli）

- `signal-cli` 作为通过 HTTP 提供 JSON-RPC 的守护进程运行。
- 事件流是 SSE（`/api/v1/events`）。
- 健康探测：`/api/v1/check`。
- 当 `channels.signal.autoStart=true` 时，OpenClaw 拥有生命周期。

参阅 [Signal](/zh/channels/signal) 了解设置和端点。

## 模式 B：stdio 子进程（legacy：imsg）

> **注意：** 对于新的 iMessage 设置，请改用 [BlueBubbles](/zh/channels/bluebubbles)。

- OpenClaw 将 `imsg rpc` 作为子进程生成（legacy iMessage 集成）。
- JSON-RPC 通过 stdin/stdout 进行行分隔（每行一个 JSON 对象）。
- 无需 TCP 端口，无需守护进程。

使用的核心方法：

- `watch.subscribe` → 通知（`method: "message"`）
- `watch.unsubscribe`
- `send`
- `chats.list`（探测/诊断）

参阅 [iMessage](/zh/channels/imessage) 了解 legacy 设置和寻址（首选 `chat_id`）。

## 适配器指南

- Gateway 拥有进程（启动/停止与提供商生命周期绑定）。
- 保持 RPC 客户端弹性：超时，退出时重启。
- 首选稳定的 ID（例如 `chat_id`）而不是显示字符串。
