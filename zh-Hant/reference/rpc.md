---
summary: "用於外部 CLI（signal-cli、舊版 imsg）和閘道模式的 RPC 配接器"
read_when:
  - 新增或變更外部 CLI 整合
  - 除錯 RPC 配接器（signal-cli、imsg）
title: "RPC 配接器"
---

# RPC 配接器

OpenClaw 透過 JSON-RPC 整合外部 CLI。目前使用兩種模式。

## 模式 A：HTTP 守護程序（signal-cli）

- `signal-cli` 作為守護程序運行，並透過 HTTP 使用 JSON-RPC。
- 事件串流為 SSE（`/api/v1/events`）。
- 健康探測：`/api/v1/check`。
- 當 `channels.signal.autoStart=true` 時，OpenClaw 擁有生命週期控制權。

請參閱 [Signal](/zh-Hant/channels/signal) 以了解設定和端點。

## 模式 B：stdio 子行程（舊版：imsg）

> **注意：** 對於新的 iMessage 設定，請改用 [BlueBubbles](/zh-Hant/channels/bluebubbles)。

- OpenClaw 將 `imsg rpc` 作為子行程生成（舊版 iMessage 整合）。
- JSON-RPC 透過 stdin/stdout 以行分隔（每行一個 JSON 物件）。
- 不需要 TCP 連接埠，也不需要守護程序。

使用的核心方法：

- `watch.subscribe` → 通知（`method: "message"`）
- `watch.unsubscribe`
- `send`
- `chats.list`（探測/診斷）

請參閱 [iMessage](/zh-Hant/channels/imessage) 以了解舊版設定和定址（建議使用 `chat_id`）。

## 配接器準則

- 閘道擁有該行程（啟動/停止與提供者生命週期綁定）。
- 保持 RPC 用戶端強韌：設定逾時，退出時重新啟動。
- 優先使用穩定的 ID（例如 `chat_id`）而非顯示字串。

import en from "/components/footer/en.mdx";

<en />
