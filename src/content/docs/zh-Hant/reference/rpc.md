---
summary: "外部 CLI (signal-cli、舊版 imsg) 及閘道模式的 RPC 配接器"
read_when:
  - Adding or changing external CLI integrations
  - Debugging RPC adapters (signal-cli, imsg)
title: "RPC 配接器"
---

# RPC 配接器

OpenClaw 透過 JSON-RPC 整合外部 CLI。目前使用兩種模式。

## 模式 A：HTTP 守護程序 (signal-cli)

- `signal-cli` 作為守護程序執行，並透過 HTTP 使用 JSON-RPC。
- 事件串流為 SSE (`/api/v1/events`)。
- 健康探測：`/api/v1/check`。
- 當 `channels.signal.autoStart=true` 時，OpenClaw 掌管生命週期。

請參閱 [Signal](/zh-Hant/channels/signal) 以了解設定與端點。

## 模式 B：stdion 子程序 (舊版：imsg)

> **注意：** 對於新的 iMessage 設定，請改用 [BlueBubbles](/zh-Hant/channels/bluebubbles)。

- OpenClaw 將 `imsg rpc` 作為子程序生成 (舊版 iMessage 整合)。
- JSON-RPC 在 stdin/stdout 上使用行分隔（每行一個 JSON 物件）。
- 不需要 TCP 連接埠，也不需要守護行程。

使用的核心方法：

- `watch.subscribe` → 通知 (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (探查/診斷)

關於舊版設定和定址，請參閱 [iMessage](/zh-Hant/channels/imessage)（建議使用 `chat_id`）。

## 配接器指南

- 閘道器擁有該行程（啟動/停止與提供者生命週期綁定）。
- 保持 RPC 用戶端強健：設定逾時，退出時重啟。
- 優先使用穩定的 ID（例如 `chat_id`），而非顯示字串。
