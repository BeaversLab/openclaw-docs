---
summary: "外部 CLI（signal-cli、imsg）的 RPC 配接器與閘道模式"
read_when:
  - Adding or changing external CLI integrations
  - Debugging RPC adapters (signal-cli, imsg)
title: "RPC adapters"
---

OpenClaw 透過 JSON-RPC 整合外部 CLI。目前使用兩種模式。

## 模式 A：HTTP 守護進程

- `signal-cli` 作為守護進程運行，透過 HTTP 使用 JSON-RPC。
- 事件流採用 SSE (`/api/v1/events`)。
- 健康探測：`/api/v1/check`。
- 當 `channels.signal.autoStart=true` 時，OpenClaw 掌管生命週期。

有關設定和端點，請參閱 [Signal](/zh-Hant/channels/signal)。

## 模式 B：stdio 子行程 (imsg)

- OpenClaw 產生 `imsg rpc` 作為 [iMessage](/zh-Hant/channels/imessage) 的子行程。
- JSON-RPC 透過 stdin/stdout 進行行分隔（每行一個 JSON 物件）。
- 不需要 TCP 通訊埠，不需要常駐程式。

使用的核心方法：

- `watch.subscribe` → 通知 (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (探測/診斷)

參閱 [iMessage](/zh-Hant/channels/imessage) 以了解舊版設定與定址（建議使用 `chat_id`）。

## 配接器指南

- 閘道擁有該行程（啟動/停止與提供者生命週期綁定）。
- 保持 RPC 用戶端強韌：設定逾時、退出時重啟。
- 優先使用穩定的 ID（例如 `chat_id`）而非顯示字串。

## 相關

- [閘道通訊協定](/zh-Hant/gateway/protocol)
