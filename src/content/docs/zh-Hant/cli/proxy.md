---
summary: "`openclaw proxy` 的 CLI 參考資料，包括操作員管理代理驗證和本地調試代理捕獲檢查器"
read_when:
  - You need to validate operator-managed proxy routing before deployment
  - You need to capture OpenClaw transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "Proxy"
---

# `openclaw proxy`

驗證操作員管理的代理路由，或運行本地顯式調試代理並檢查捕獲的流量。

使用 `validate` 在啟用 OpenClaw 代理路由之前對操作員管理的轉發代理進行預檢。其他命令是用於傳輸級別調查的調試工具：它們可以啟動本地代理，運行啟用了捕獲的子命令，列出捕獲會話，查詢常見流量模式，讀取捕獲的 blob，以及清除本地捕獲數據。

## 指令

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy validate [--json] [--proxy-url <url>] [--allowed-url <url>] [--denied-url <url>] [--apns-reachable] [--apns-authority <url>] [--timeout-ms <ms>]
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## 驗證

`openclaw proxy validate` 檢查來自 `--proxy-url`、配置或 `OPENCLAW_PROXY_URL` 的有效操作員管理代理 URL。當未啟用且未配置代理時，它會報告配置問題；在更改配置之前，請使用 `--proxy-url` 進行一次性預檢。默認情況下，它會驗證公共目標可以通過代理成功訪問，並且代理無法到達臨時環回測試點。自定義拒絕目標是故障關閉的：HTTP 響應和不明確的傳輸失敗都會導致失敗，除非您可以單獨驗證特定於部署的拒絕信號。添加 `--apns-reachable` 還可以通過代理打開 APNs HTTP/2 CONNECT 隧道並確認沙盒 APNs 有響應；探測使用故意無效的提供者令牌，因此 APNs `403 InvalidProviderToken` 響應是成功的可達性信號。

選項：

- `--json`：列印機器可讀的 JSON。
- `--proxy-url <url>`：驗證此代理 URL 而不是配置或環境變量。
- `--allowed-url <url>`：添加預期通過代理成功的目標。重複此操作以檢查多個目標。
- `--denied-url <url>`：添加預期被代理阻止的目標。重複此操作以檢查多個目標。
- `--apns-reachable`：還要驗證沙盒 APNs HTTP/2 是否可通過代理訪問。
- `--apns-authority <url>`：使用 `--apns-reachable` 探測的 APNs 權限（預設為 `https://api.sandbox.push.apple.com`；生產環境為 `https://api.push.apple.com`）。
- `--timeout-ms <ms>`：每個請求的逾時時間（以毫秒為單位）。

請參閱 [Network Proxy](/zh-Hant/security/network-proxy) 以了解部署指引和拒絕語意。

## 查詢預設集

`openclaw proxy query --preset <name>` 接受：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## 注意事項

- 除非設定了 `--host`，否則 `start` 預設為 `127.0.0.1`。
- `run` 會啟動本機除錯 Proxy，然後執行 `--` 之後的指令。
- 除錯 Proxy 的直接上游轉送會開啟上游通訊端進行診斷。當啟用 OpenClaw 受控 Proxy 模式時，針對 Proxy 請求和 CONNECT 通道的直接轉送預設為停用；僅針對已核准的本機診斷設定 `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1`。
- 當 Proxy 設定或目的地檢查失敗時，`validate` 會以代碼 1 結束。
- 擷取資料屬於本機除錯資料；完成後請使用 `openclaw proxy purge`。

## 相關連結

- [CLI 參考資料](/zh-Hant/cli)
- [Network Proxy](/zh-Hant/security/network-proxy)
- [受信任 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)
