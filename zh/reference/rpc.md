---
title: "RPC 适配器"
summary: "外部 CLI（signal-cli、imsg）的 RPC 适配器与网关模式"
read_when:
  - 添加或修改外部 CLI 集成
  - 调试 RPC 适配器（signal-cli、imsg）
---
# RPC 适配器

OpenClaw 通过 JSON-RPC 集成外部 CLI。目前使用两种模式。

## 模式 A：HTTP daemon（signal-cli）
- `signal-cli` 以 daemon 运行，通过 HTTP 提供 JSON-RPC。
- 事件流为 SSE（`/api/v1/events`）。
- 健康探测：`/api/v1/check`。
- 当 `channels.signal.autoStart=true` 时，OpenClaw 管理其生命周期。

安装与端点参见 [Signal](/zh/channels/signal)。

## 模式 B：stdio 子进程（imsg）
- OpenClaw 启动 `imsg rpc` 作为子进程。
- JSON-RPC 通过 stdin/stdout 行分隔传输（每行一个 JSON 对象）。
- 无需 TCP 端口或 daemon。

使用的核心方法：
- `watch.subscribe` → 通知（`method: "message"`）
- `watch.unsubscribe`
- `send`
- `chats.list`（探测/诊断）

安装与地址说明参见 [iMessage](/zh/channels/imessage)（推荐 `chat_id`）。

## 适配器指南
- Gateway 管理进程（启动/停止与 provider 生命周期绑定）。
- RPC 客户端要具备韧性：超时、进程退出重启。
- 优先使用稳定 ID（如 `chat_id`）而非显示字符串。
