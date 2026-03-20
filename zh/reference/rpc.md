---
summary: "用于外部 CLI (signal-cli, 旧版 imsg) 和 Gateway(网关) 模式的 RPC 适配器"
read_when:
  - 添加或更改外部 CLI 集成
  - 调试 RPC 适配器 (signal-cli, imsg)
title: "RPC 适配器"
---

# RPC 适配器

OpenClaw 通过 JSON-RPC 集成外部 CLI。目前使用两种模式。

## 模式 A：HTTP 守护进程 (signal-cli)

- `signal-cli` 作为守护进程运行，并通过 HTTP 使用 JSON-RPC。
- 事件流为 SSE (`/api/v1/events`)。
- 健康检查：`/api/v1/check`。
- 当 `channels.signal.autoStart=true` 时，OpenClaw 拥有生命周期控制权。

有关设置和端点，请参阅 [Signal](/zh/channels/signal)。

## 模式 B：stdio 子进程 (旧版：imsg)

> **注意：** 对于新的 iMessage 设置，请改用 [BlueBubbles](/zh/channels/bluebubbles)。

- OpenClaw 生成 `imsg rpc` 作为子进程 (旧版 iMessage 集成)。
- JSON-RPC 通过 stdin/stdout 进行行分隔（每行一个 JSON 对象）。
- 不需要 TCP 端口，不需要守护进程。

使用的核心方法：

- `watch.subscribe` → 通知 (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (探针/诊断)

有关旧版设置和寻址，请参阅 [iMessage](/zh/channels/imessage) (首选 `chat_id`)。

## 适配器指南

- Gateway(网关) 拥有进程控制权 (启动/停止与提供商生命周期绑定)。
- 保持 RPC 客户端的弹性：超时，退出时重启。
- 优先使用稳定的 ID (例如 `chat_id`) 而非显示字符串。

import zh from "/components/footer/zh.mdx";

<zh />
