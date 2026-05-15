---
summary: "如何透過操作員管理的過濾 Proxy 路由 OpenClaw 執行時 HTTP 和 WebSocket 流量"
title: "網路 Proxy"
read_when:
  - You want defense-in-depth against SSRF and DNS rebinding attacks
  - Configuring an external forward proxy for OpenClaw runtime traffic
---

OpenClaw 可以透過操作員管理的轉送 Proxy 路由執行時 HTTP 和 WebSocket 流量。這是可選的縱深防禦，適用於需要集中式出口控制、更強 SSRF 保護和更好網路可稽核性的部署。

OpenClaw 不提供、下載、啟動、設定或認證 Proxy。您執行適合您環境的 Proxy 技術，OpenClaw 則透過它路由正常的本機程序 HTTP 和 WebSocket 用戶端。

## 為何使用 Proxy

Proxy 為操作員提供了一個用於出站 HTTP 和 WebSocket 流量的網路控制點。即使在 SSRF 加固之外，這也可能很有用：

- 集中式原則：維護一個出口原則，而不是依賴每個應用程式 HTTP 呼叫站點來正確設定網路規則。
- 連線時檢查：在 DNS 解析之後以及 Proxy 開啟上游連線之前立即評估目的地。
- DNS 重新綁定防禦：縮小應用程式層級 DNS 檢查與實際出站連線之間的差距。
- 更廣泛的 JavaScript 涵蓋範圍：透過相同路徑路由普通的 `fetch`、`node:http`、`node:https`、WebSocket、axios、got、node-fetch 和類似用戶端。
- 可稽核性：在出口邊界記錄允許和拒絕的目的地。
- 操作控制：執行目的地規則、網路分段、速率限制或出站允許清單，而無需重建 OpenClaw。

Proxy 路由是正常 HTTP 和 WebSocket 出口的程序層級防護。它為操作員提供了一個「預設封閉 (fail-closed)」路徑，用於將受支援的 JavaScript HTTP 用戶端透過自己的過濾 Proxy 進行路由，但它不是作業系統層級的網路沙盒，也不會使 OpenClaw 認證 Proxy 的目的地原則。

## OpenClaw 如何路由流量

當設定 `proxy.enabled=true` 和 Proxy URL 時，受保護的執行時程序（例如 `openclaw gateway run`、`openclaw node run` 和 `openclaw agent --local`）會透過設定的 Proxy 路由正常的 HTTP 和 WebSocket 出口流量：

```text
OpenClaw process
  fetch                  -> operator-managed filtering proxy -> public internet
  node:http and https    -> operator-managed filtering proxy -> public internet
  WebSocket clients      -> operator-managed filtering proxy -> public internet
```

公開合約是指路由行為，而非用於實作它的內部 Node 掛鉤。當 Gateway URL 使用 `localhost` 或如 `127.0.0.1` 或 `[::1]` 等字面迴路 IP 時，OpenClaw Gateway 控制平面 WebSocket 客戶端會使用一個狹窄的直接路徑來傳輸本機迴路 Gateway RPC 流量。即使操作員代理封鎖了迴路目的地，該控制平面路徑也必須能夠到達迴路 Gateway。正常的執行時期 HTTP 和 WebSocket 請求仍然會使用設定的代理。

在內部，OpenClaw 使用兩個進程級別的路由掛鉤來實作此功能：

- Undici 分派器路由涵蓋了 `fetch`、由 undici 支援的客戶端，以及提供其自身 undici 分派器的傳輸層。
- `global-agent` 路由涵蓋了 Node 核心 `node:http` 和 `node:https` 呼叫者，包括許多建構在 `http.request`、`https.request`、`http.get` 和 `https.get` 之上的程式庫。受控代理模式會強制使用該全域代理，因此明確的 Node HTTP 代理不會意外繞過操作員代理。

部分外掛程式擁有自訂傳輸層，即使存在進程級別的路由，也需要明確的代理連線。例如，Telegram 的 Bot API 傳輸層使用自己的 HTTP/1 undici 分派器，因此會遵循進程代理環境變數，以及該擁有者特定傳輸路徑中受控的 `OPENCLAW_PROXY_URL` 備援機制。

代理 URL 本身必須使用 `http://`。透過代理仍可使用 HTTP `CONNECT` 來支援 HTTPS 目的地；這僅表示 OpenClaw 預期的是純 HTTP 轉送代理監聽器，例如 `http://127.0.0.1:3128`。

當代理啟用時，OpenClaw 會清除 `no_proxy`、`NO_PROXY` 和 `GLOBAL_AGENT_NO_PROXY`。這些略過清單是基於目的地的，因此將 `localhost` 或 `127.0.0.1` 留在那裡會讓高風險的 SSRF 目標略過過濾代理。

關閉時，OpenClaw 會還原先前的代理環境並重設快取的進程路由狀態。

## 相關代理術語

- `proxy.enabled` / `proxy.proxyUrl`：OpenClaw 執行時間出口流量的輸出前向代理路由。本頁面記錄了該功能。
- `gateway.auth.mode: "trusted-proxy"`：用於存取 Gateway 的輸入身分感知反向代理驗證。請參閱 [Trusted proxy auth](/zh-Hant/gateway/trusted-proxy-auth)。
- `openclaw proxy`：用於開發和支援的本機除錯代理與擷取檢查器。請參閱 [openclaw proxy](/zh-Hant/cli/proxy)。
- `tools.web.fetch.useTrustedEnvProxy`：`web_fetch` 的選用功能，允許操作員控制的 HTTP(S) 環境代理解析 DNS，同時保持預設的嚴格 DNS 釘選和主機名稱原則。請參閱 [Web fetch](/zh-Hant/tools/web-fetch#trusted-env-proxy)。
- 通道或提供者特定的代理設定：特定傳輸的擁有者特定覆寫。若目標是在執行時間內進行集中式出口控制，建議優先使用受控網路代理。

## 組態

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

您也可以透過環境變數提供 URL，同時在組態中保留 `proxy.enabled=true`：

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` 的優先順序高於 `OPENCLAW_PROXY_URL`。

### Gateway 回送模式

本機 Gateway 控制平面用戶端通常會連線到回送 WebSocket，例如 `ws://127.0.0.1:18789`。使用 `proxy.loopbackMode` 來選擇當受控代理處於啟用狀態時，該流量的行為方式：

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
  loopbackMode: gateway-only # gateway-only, proxy, or block
```

- `gateway-only` (預設)：OpenClaw 在作用中的 `global-agent` `NO_PROXY` 控制器中註冊 Gateway 回授權限，以便本機 Gateway WebSocket 流量可以直接連線。自訂回送 Gateway 連接埠之所以有效，是因為作用中的 Gateway URL 主機和連接埠已註冊。
- `proxy`：OpenClaw 不註冊 Gateway 回送 `NO_PROXY` 權限，因此本機 Gateway 流量會透過受控代理傳送。如果代理是遠端的，它必須為 OpenClaw 主機的回送服務提供特殊路由，例如將其對應到代理可到達的主機名稱、IP 或通道。標準遠端代理會從代理主機解析 `127.0.0.1` 和 `localhost`，而非從 OpenClaw 主機。
- `block`：OpenClaw 在開啟 socket 之前會拒絕回傳 Gateway 控制平面的連線。

如果設定了 `enabled=true` 但未設定有效的 proxy URL，受保護的指令將會啟動失敗，而不是退回到直接存取網路。

對於使用 `openclaw gateway start` 啟動的受控 gateway 服務，建議將 URL 儲存在設定中：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

環境變數倒退最適用於前景執行。如果您將其與已安裝的服務搭配使用，請將 `OPENCLAW_PROXY_URL` 放在服務的持久化環境中，例如 `$OPENCLAW_STATE_DIR/.env` 或 `~/.openclaw/.env`，然後重新安裝服務，以便 launchd、systemd 或工作排程器使用該值啟動 gateway。

對於 `openclaw --container ...` 指令，當設定了 `OPENCLAW_PROXY_URL` 時，OpenClaw 會將其轉發到針對 container 的子 CLI。該 URL 必須可從 container 內部存取；`127.0.0.1` 指的是 container 本身，而非主機。除非您明確覆寫該安全檢查，否則 OpenClaw 會拒絕針對 container 指令的回傳 proxy URL。

## Proxy 需求

Proxy 原則是安全邊界。OpenClaw 無法驗證 proxy 是否封鎖了正確的目標。

將 proxy 設定為：

- 僅綁定到回傳或私人信任介面。
- 限制存取，以便只有 OpenClaw 程序、主機、container 或服務帳戶可以使用它。
- 自行解析目的地，並在 DNS 解析後封鎖目的地 IP。
- 在連線時對純 HTTP 請求和 HTTPS `CONNECT` 通道套用原則。
- 拒絕針對回傳、私人、連結本機、中繼資料、多點傳播、保留或文件範圍的基於目的地的繞過。
- 除非您完全信任 DNS 解析路徑，否則請避免使用主機名稱允許清單。
- 記錄目的地、決策、狀態和原因，而不記錄請求內文、授權標頭、Cookie 或其他祕密。
- 將 proxy 原則置於版本控制之下，並像審查敏感設定一樣審查變更。

## 建議封鎖的目的地

使用此拒絕清單作為任何 forward proxy、防火牆或出口原則的起點。

OpenClaw 應用層級分類器邏輯位於 `src/infra/net/ssrf.ts` 和 `src/shared/net/ip.ts`。相關的同位處理鉤子是 `BLOCKED_HOSTNAMES`、`BLOCKED_IPV4_SPECIAL_USE_RANGES`、`BLOCKED_IPV6_SPECIAL_USE_RANGES`、`RFC2544_BENCHMARK_PREFIX`，以及針對 NAT64、6to4、Teredo、ISATAP 和 IPv4 對映形式的內嵌 IPv4 哨兵處理。這些檔案在維護外部代理伺服器策略時是有用的參考，但 OpenClaw 不會自動匯出或在其代理伺服器中強制執行這些規則。

| 範圍或主機                                                                           | 為什麼要封鎖                       |
| ------------------------------------------------------------------------------------ | ---------------------------------- |
| `127.0.0.0/8`, `localhost`, `localhost.localdomain`                                  | IPv4 回送                          |
| `::1/128`                                                                            | IPv6 回送                          |
| `0.0.0.0/8`, `::/128`                                                                | 未指定和本機網路位址               |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`                                      | RFC1918 私有網路                   |
| `169.254.0.0/16`, `fe80::/10`                                                        | 連結本機位址和常見雲端中繼資料路徑 |
| `169.254.169.254`, `metadata.google.internal`                                        | 雲端中繼資料服務                   |
| `100.64.0.0/10`                                                                      | 運營商級 NAT 共用位址空間          |
| `198.18.0.0/15`, `2001:2::/48`                                                       | 基準測試範圍                       |
| `192.0.0.0/24`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | 特殊用途和文件範圍                 |
| `224.0.0.0/4`, `ff00::/8`                                                            | 多播                               |
| `240.0.0.0/4`                                                                        | 保留的 IPv4                        |
| `fc00::/7`, `fec0::/10`                                                              | IPv6 本機/私有範圍                 |
| `100::/64`, `2001:20::/28`                                                           | IPv6 捨棄和 ORCHIDv2 範圍          |
| `64:ff9b::/96`, `64:ff9b:1::/48`                                                     | 內嵌 IPv4 的 NAT64 前綴            |
| `2002::/16`, `2001::/32`                                                             | 內嵌 IPv4 的 6to4 和 Teredo        |
| `::/96`, `::ffff:0:0/96`                                                             | IPv4 相容和 IPv4 對映的 IPv6       |

如果您的雲端供應商或網路平台記載了額外的中繼資料主機或保留範圍，也請一併新增。

## 驗證

從執行 OpenClaw 的相同主機、容器或服務帳戶驗證代理伺服器：

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

根據預設，當未提供自訂目的地時，指令會檢查 `https://example.com/` 是否成功，並啟動一個代理伺服器不得到達的暫時回環金絲雀。當代理伺服器傳回非 2xx 的拒絕回應或因傳輸失敗封鎖金絲雀時，預設的拒絕檢查即算通過；如果成功的回應到達金絲雀，則檢查失敗。如果未啟用並設定代理伺服器，驗證會回報設定問題；請在變更設定前使用 `--proxy-url` 進行一次性預檢。使用 `--allowed-url` 和 `--denied-url` 來測試特定部署的預期事項。新增 `--apns-reachable` 以同時驗證直接 APNs HTTP/2 傳遞能否透過代理伺服器開啟 CONNECT 通道並接收沙盒 APNs 回應；探測使用故意無效的提供者權杖，因此預期會出現 `403 InvalidProviderToken` 並視為可到達。自訂的拒絕目的地採取「失敗即封閉」(fail-closed) 策略：任何 HTTP 回應都代表目的地可透過代理伺服器到達，任何傳輸錯誤則被回報為「無法判定」，因為 OpenClaw 無法證明代理伺服器封鎖了可到達的來源。驗證失敗時，指令會以代碼 1 結束。

使用 `--json` 進行自動化。JSON 輸出包含整體結果、有效的代理設定來源、任何設定錯誤以及每個目的地檢查。代理 URL 憑證會在文字和 JSON 輸出中被編輯：

```json
{
  "ok": true,
  "config": {
    "enabled": true,
    "proxyUrl": "http://127.0.0.1:3128/",
    "source": "override",
    "errors": []
  },
  "checks": [
    {
      "kind": "allowed",
      "url": "https://example.com/",
      "ok": true,
      "status": 200
    },
    {
      "kind": "apns",
      "url": "https://api.sandbox.push.apple.com",
      "ok": true,
      "status": 403
    }
  ]
}
```

您也可以使用 `curl` 手動進行驗證：

```bash
curl -x http://127.0.0.1:3128 https://example.com/
curl -x http://127.0.0.1:3128 http://127.0.0.1/
curl -x http://127.0.0.1:3128 http://169.254.169.254/
```

公開請求應該會成功。回環和中繼資料請求應該會被代理伺服器封鎖。對於 `openclaw proxy validate`，內建的回環金絲雀可以區分代理伺服器的拒絕與可到達的來源。自訂的 `--denied-url` 檢查沒有該金絲雀，因此除非您的代理伺服器公開了您可以另外驗證的特定部署拒絕訊號，否則請將 HTTP 回應和不明確的傳輸失敗都視為驗證失敗。

然後啟用 OpenClaw 代理路由：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway run
```

或設定：

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

## 限制

- 此代理改善了對進程本機 JavaScript HTTP 和 WebSocket 客戶端的覆蓋範圍，但它不是作業系統層級的網路沙箱。
- 閘道迴路控制平面流量預設透過 `proxy.loopbackMode: "gateway-only"` 進行直接本機旁路。OpenClaw 通過在受管理的 `global-agent` `NO_PROXY` 控制器中註冊活動的閘道迴路授權來實現該旁路。操作員可以設定 `proxy.loopbackMode: "proxy"` 以透過受管理的代理傳送閘道迴路流量，或者設定 `proxy.loopbackMode: "block"` 以拒絕迴路閘道連線。有關遠端代理的注意事項，請參閱 [Gateway Loopback Mode](#gateway-loopback-mode)。
- 原始 `net`、`tls` 和 `http2` socket、原生插件和非 OpenClaw 子進程可能會繞過 Node 層級的代理路由，除非它們繼承並遵守代理環境變數。分叉的 OpenClaw 子 CLI 會繼承受管理的代理 URL 和 `proxy.loopbackMode` 狀態。
- IRC 是一個位於操作員管理的轉發代理路由之外的原始 TCP/TLS 通道。在需要所有出口流量都通過該轉發代理的部署中，除非明確批准直接 IRC 出口，否則請設定 `channels.irc.enabled=false`。
- 本機除錯代理是診斷工具，當受管理代理模式處於活動狀態時，其對代理請求和 CONNECT 隧道的直接上游轉發預設為停用；僅對已批准的本機診斷啟用直接轉發。
- 使用者本機 WebUI 和本機模型伺服器應在需要時加入操作員代理策略的允許清單；OpenClaw 不會為它們公開一般本機網路旁路。
- 閘道控制平面代理旁路故意限制為 `localhost` 和字面意義的迴路 IP URL。使用 `ws://127.0.0.1:18789`、`ws://[::1]:18789` 或 `ws://localhost:18789` 進行本機直接閘道控制平面連線；其他主機名稱的路由方式與基於主機名稱的一般流量相同。
- OpenClaw 不會檢查、測試或認證您的代理策略。
- 請將代理策略變更視為敏感的安全性營運變更。

| Surface                                                     | 受管理代理狀態                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `fetch`、`node:http`、`node:https`、常見的 WebSocket 用戶端 | 設定後會透過受管理代理程式掛勾進行路由。                                                    |
| APNs 直接 HTTP/2                                            | 透過 APNs 受管理的 CONNECT 協助程式進行路由。                                               |
| Gateway 控制平面迴路                                        | 僅針對已設定的本機迴路 Gateway URL 使用直接連線。                                           |
| 除錯代理程式上游轉送                                        | 當受管理代理程式模式啟用時會停用，除非為了本機診斷而明確啟用。                              |
| IRC                                                         | 原始 TCP/TLS；不受受管理 HTTP 代理程式模式代理。除非直接 IRC 出站連線獲得核准，否則請停用。 |
| 其他原始 `net`、`tls` 或 `http2` 用戶端呼叫                 | 必須在落地前由原始 socket 防護程式進行分類。                                                |
