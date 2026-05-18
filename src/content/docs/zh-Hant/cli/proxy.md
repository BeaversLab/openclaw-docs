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
openclaw proxy validate [--json] [--proxy-url <url>] [--proxy-ca-file <path>] [--allowed-url <url>] [--denied-url <url>] [--apns-reachable] [--apns-authority <url>] [--timeout-ms <ms>]
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## 驗證

`openclaw proxy validate` 會檢查來自 `--proxy-url`、配置或 `OPENCLAW_PROXY_URL` 的有效操作員管理代理 URL。受管理的代理 URL 可以對於普通的轉發代理監聽器使用 `http://`，或者在 OpenClaw 必須在發送代理請求之前向代理端點開啟 TLS 時使用 `https://`。當未啟用且未配置代理時，它會報告配置問題；請在更改配置之前使用 `--proxy-url` 進行一次性預檢。新增 `--proxy-ca-file` 以信任用於 HTTPS 代理端點之 TLS 連線的私人 CA。預設情況下，它會驗證公用目的地透過代理成功，且代理無法到達臨時回環 canary。自訂拒絕的目的地是失敗關閉的 (fail-closed)：HTTP 回應和模稜兩可的傳輸失敗都會失敗，除非您可以單獨驗證特定於部署的拒絕訊號。新增 `--apns-reachable` 以透過代理同時開啟 APNs HTTP/2 CONNECT 通道並確認沙盒 APNs 有回應；探測使用故意無效的提供者權杖，因此 APNs `403 InvalidProviderToken` 回應是成功的連線訊號。

選項：

- `--json`：列印機器可讀取的 JSON。
- `--proxy-url <url>`：驗證此 `http://` 或 `https://` 代理 URL，而不是配置或環境變數。
- `--proxy-ca-file <path>`：信任此 PEM CA 檔案以進行 HTTPS 代理端點的 TLS 驗證。
- `--allowed-url <url>`：新增預期透過代理成功的目的地。重複以檢查多個目的地。
- `--denied-url <url>`：新增預期被代理封鎖的目的地。重複以檢查多個目的地。
- `--apns-reachable`：同時驗證沙盒 APNs HTTP/2 是否可透過代理到達。
- `--apns-authority <url>`：要使用 `--apns-reachable` 探測的 APNs 授權單位 (預設為 `https://api.sandbox.push.apple.com`；生產環境為 `https://api.push.apple.com`)。
- `--timeout-ms <ms>`：每次請求的逾時時間（毫秒）。

請參閱 [Network Proxy](/zh-Hant/security/network-proxy) 以了解部署指引和拒絕語意。

## 查詢預設

`openclaw proxy query --preset <name>` 接受：

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## 注意事項

- 除非設定了 `--host`，否則 `start` 預設為 `127.0.0.1`。
- `run` 會啟動本機偵錯 Proxy，然後執行 `--` 之後的指令。
- 偵錯 Proxy 的直接上游轉發會開啟上游 Socket 以進行診斷。當 OpenClaw 受管 Proxy 模式處於啟用狀態時，Proxy 要求和 CONNECT 通道的直接轉發預設為停用；僅針對已核准的本機診斷設定 `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1`。
- 當 Proxy 組態或目的地檢查失敗時，`validate` 會以程式碼 1 結束。
- 擷取資料屬於本機偵錯資料；完成時請使用 `openclaw proxy purge`。

## 相關主題

- [CLI 參考資料](/zh-Hant/cli)
- [網路 Proxy](/zh-Hant/security/network-proxy)
- [受信任 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)
