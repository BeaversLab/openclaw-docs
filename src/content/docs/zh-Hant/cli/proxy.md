---
summary: "本地除錯 Proxy 與擷取檢查器 `openclaw proxy` 的 CLI 參考資料"
read_when:
  - You need to capture OpenClaw transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "Proxy"
---

# `openclaw proxy`

執行本地明確的除錯 Proxy 並檢查擷取的流量。

這是一個用於傳輸層級調查的除錯指令。它可以啟動本地 Proxy、在啟用擷取的情況下執行子指令、列出擷取工作階段、查詢常見流量模式、讀取擷取的二進位大型物件，以及清除本地擷取資料。

## 指令

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## 查詢預設集

`openclaw proxy query --preset <name>` 接受：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## 備註

- 除非設定了 `--host`，否則 `start` 預設為 `127.0.0.1`。
- `run` 會啟動本地除錯 Proxy，然後執行 `--` 之後的指令。
- 擷取內容是本地除錯資料；完成後請使用 `openclaw proxy purge`。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [受信任 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)
