---
summary: "用於外部 CLI (signal-cli, 舊版 imsg) 的 RPC 配接器與閘道模式"
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

## 模式 B：std IO 子進程

> **注意：** 對於新的 iMessage 設定，請改用 [BlueBubbles](/zh-Hant/channels/bluebubbles)。

- OpenClaw 將 `imsg rpc` 作為子進程生成
- JSON-RPC 在 stdin/stdout 上以換行分隔 (每行一個 JSON 物件)。
- 不需要 TCP 連接埠，也不需要守護進程。

使用的核心方法：

- `watch.subscribe` → 通知 (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (探測/診斷)

有關舊版設定和定址，請參閱 [iMessage](/zh-Hant/channels/imessage) (建議使用 `chat_id`)。

## 轉接器準則

- 閘道擁有該程序 (啟動/停止與提供者生命週期綁定)。
- 保持 RPC 客戶端具韌性：設定逾時，退出時重啟。
- 優先使用穩定的 ID (例如 `chat_id`)，而非顯示字串。

## 相關

- [閘道協定](/zh-Hant/gateway/protocol)
