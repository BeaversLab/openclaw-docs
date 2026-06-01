---
summary: "如何透過操作員管理的篩選代理伺服器路由 OpenClaw 執行階段 HTTP 和 WebSocket 流量"
title: "網路代理伺服器"
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
- 更廣泛的 JavaScript 涵蓋範圍：將一般的 `fetch`、`node:http`、`node:https`、WebSocket、axios、got、node-fetch 和類似用戶端透過相同路徑進行路由。
- 可稽核性：在出口邊界記錄允許和拒絕的目的地。
- 操作控制：執行目的地規則、網路分段、速率限制或出站允許清單，而無需重建 OpenClaw。

Proxy 路由是正常 HTTP 和 WebSocket 出口的程序層級防護。它為操作員提供了一個「預設封閉 (fail-closed)」路徑，用於將受支援的 JavaScript HTTP 用戶端透過自己的過濾 Proxy 進行路由，但它不是作業系統層級的網路沙盒，也不會使 OpenClaw 認證 Proxy 的目的地原則。

## OpenClaw 如何路由流量

當設定 `proxy.enabled=true` 且已設定代理伺服器 URL 時，受保護的執行階段程序（如 `openclaw gateway run`、`openclaw node run` 和 `openclaw agent --local`）會將一般的 HTTP 和 WebSocket 傳出流量透過已設定的代理伺服器進行路由：

```text
OpenClaw process
  fetch                  -> operator-managed filtering proxy -> public internet
  node:http and https    -> operator-managed filtering proxy -> public internet
  WebSocket clients      -> operator-managed filtering proxy -> public internet
```

公開契約是路由行為，而不是用於實作它的內部 Node 掛鉤。當 Gateway URL 使用 `localhost` 或字面迴路 IP（如 `127.0.0.1` 或 `[::1]`）時，OpenClaw Gateway 控制平面 WebSocket 用戶端會使用狹窄的直接路徑來處理本機迴路 Gateway RPC 流量。即使操作員代理伺服器封鎖了迴路目的地，該控制平面路徑也必須能夠到達迴路 Gateway。一般的執行階段 HTTP 和 WebSocket 要求仍會使用已設定的代理伺服器。

在內部，OpenClaw 安裝 Proxyline 作為此功能的程序級路由執行階段。Proxyline 涵蓋了 `fetch`、支援 undici 的用戶端、Node 核心 `node:http` / `node:https` 呼叫端、常見的 WebSocket 用戶端以及協助程式建立的 CONNECT 通道。受控代理模式會取代呼叫端提供的 Node HTTP 代理程式，因此明確的代理程式不會意外繞過操作員代理伺服器。

某些外掛程式擁有自訂傳輸，即使存在程序級路由，也需要明確的代理佈線。例如，Telegram 的 Bot API 傳輸使用其自己的 HTTP/1 undici 調度程式，因此在該擁有者特定的傳輸路徑中會遵循程序代理環境變數加上受控 `OPENCLAW_PROXY_URL` 後備機制。

代理伺服器 URL 本身可以使用 `http://` 或 `https://`。這些配置描述了從 OpenClaw 到代理端點的連線：

- `http://proxy.example:3128`：OpenClaw 開啟到正向代理的純 TCP 連線，並發送 HTTP 代理請求，包括針對 HTTPS 目標的 `CONNECT`。
- `https://proxy.example:8443`：OpenClaw 開啟到代理端點的 TLS，驗證代理憑證，然後在該 TLS 會話內發送 HTTP 代理請求。

目標 HTTPS 與代理端點 TLS 是分開的。對於 HTTPS 目標，OpenClaw 仍然會向代理請求 HTTP `CONNECT` 通道，然後透過該通道啟動目標 TLS。

當代理處於啟用狀態時，OpenClaw 會清除 `no_proxy` 和 `NO_PROXY`。這些略過清單是基於目標的，因此在其中保留 `localhost` 或 `127.0.0.1` 會導致高風險的 SSRF 目標略過過濾代理。

關閉時，OpenClaw 會還先前的代理環境並重設快取的程序路由狀態。

## 相關代理術語

- `proxy.enabled` / `proxy.proxyUrl`：用於 OpenClaw 執行時間出口的輸出正向代理路由。本頁面記錄了該功能。
- `gateway.auth.mode: "trusted-proxy"`：用於存取 Gateway 的輸入具備身分感知的反向代理驗證。請參閱[受信任的代理驗證](/zh-Hant/gateway/trusted-proxy-auth)。
- `openclaw proxy`：用於開發和技術支援的本機偵錯代理和擷取檢查器。請參閱[openclaw proxy](/zh-Hant/cli/proxy)。
- `tools.web.fetch.useTrustedEnvProxy`：`web_fetch` 的選用功能，允許操作員控制的 HTTP(S) 環境代理解析 DNS，同時保持預設的嚴格 DNS 釘選和主機名稱原則。請參閱[Web 擷取](/zh-Hant/tools/web-fetch#trusted-env-proxy)。
- 通道或供應商特定的代理設定：特定傳輸的擁有者特定覆寫。如果目標是跨執行時間的集中出口控制，建議優先使用受控網路代理。

## 組態

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

對於具有私密代理 CA 的 HTTPS 代理端點：

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

您也可以透過環境提供 URL，同時在組態中保留 `proxy.enabled=true`：

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` 的優先順序高於 `OPENCLAW_PROXY_URL`。

### Gateway 回送模式

本機 Gateway 控制平面用戶端通常會連接到回送 WebSocket，例如 `ws://127.0.0.1:18789`。使用 `proxy.loopbackMode` 來選擇當受控代理處於啟用狀態時，回送受控代理例外的行為方式：

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
  loopbackMode: gateway-only # gateway-only, proxy, or block
```

- `gateway-only` (預設值)：OpenClaw 在 Proxyline 的受控略過原則中註冊 Gateway 回送授權，以便本機 WebSocket 流量可以直接連接。自訂回送 Gateway 連接埠可以運作，因為使用中 Gateway URL 的主機和連接埠已經註冊。隨附的瀏覽器外掛程式也可以為 OpenClaw 啟動的受控瀏覽器註冊確切的本機 CDP 準備度和 DevTools WebSocket 端點，隨附的 Ollama 記憶體嵌入提供者可以針對確切設定好的主機本機回送嵌入來源，使用自己更狹隘且受防護的直接路徑。
- `proxy`：OpenClaw 不註冊 Gateway 或 Ollama 回送略過，因此回送流量會透過受控代理傳送。如果代理是遠端的，它必須為 OpenClaw 主機的回送服務提供特殊路由，例如將其對應到可透過代理到達的主機名稱、IP 或通道。標準遠端代理會從代理主機解析 `127.0.0.1` 和 `localhost`，而不是從 OpenClaw 主機。
- `block`：OpenClaw 會在開啟 socket 之前拒絕 Gateway 回送控制平面連線和受防護的 Ollama 主機本機嵌入回送連線。

如果設定了 `enabled=true` 但未設定有效的代理 URL，受保護的指令將無法啟動，而不是退而求其次使用直接網路存取。

對於使用 `openclaw gateway start` 啟動的受管理 gateway 服務，建議將 URL 儲存在設定中：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

環境變數後援最適合前景執行。如果您將其與已安裝的服務一起使用，請將 `OPENCLAW_PROXY_URL` 放入服務的持久環境中，例如 `$OPENCLAW_STATE_DIR/.env` 或 `~/.openclaw/.env`，然後重新安裝服務，以便 launchd、systemd 或工作排程器 使用該值啟動 gateway。

對於 `openclaw --container ...` 指令，OpenClaw 會在設定時將 `OPENCLAW_PROXY_URL` 轉送到以容器為目標的子 CLI。URL 必須可以從容器內部存取；`127.0.0.1` 指的是容器本身，而非主機。除非您明確覆寫該安全檢查，否則 OpenClaw 會拒絕以容器為目標的指令的回送代理 URL。

## Proxy Requirements

Proxy 策略是安全邊界。OpenClaw 無法驗證 proxy 是否封鎖了正確的目標。

將 proxy 設定為：

- 僅繫結至回送或私有的受信任介面。
- 限制存取權，僅允許 OpenClaw 處理程序、主機、容器或服務帳戶使用它。
- 自行解析目的地，並在 DNS 解析後封鎖目的地 IP。
- 在連線時對純 HTTP 請求和 HTTPS `CONNECT` 通道套用政策。
- 拒絕基於目的地的繞過，針對回送、私人、連結本機、中繼資料、多播、保留或文件範圍。
- 除非您完全信任 DNS 解析路徑，否則請避免使用主機名稱允許清單。
- 記錄目的地、決策、狀態和原因，而不記錄請求主體、授權標頭、Cookie 或其他秘密。
- 將代理政策置於版本控制之下，並像審查敏感性安全配置一樣審查變更。

## 建議封鎖的目的地

使用此拒絕清單作為任何轉送代理、防火牆或出口政策的起點。

OpenClaw 應用程式層級分類器邏輯位於 `src/infra/net/ssrf.ts` 和 `packages/net-policy/src/ip.ts` 中。相關的 parity hooks 為 `BLOCKED_HOSTNAMES`、`BLOCKED_IPV4_SPECIAL_USE_RANGES`、`BLOCKED_IPV6_SPECIAL_USE_RANGES`、`RFC2544_BENCHMARK_PREFIX`，以及針對 NAT64、6to4、Teredo、ISATAP 和 IPv4 對映形式的內嵌 IPv4 sentinel 處理。這些檔案是在維護外部 Proxy 原則時的有用參考，但 OpenClaw 不會自動匯出或在您的 Proxy 中強制執行這些規則。

| 範圍或主機                                                                           | 封鎖原因                             |
| ------------------------------------------------------------------------------------ | ------------------------------------ |
| `127.0.0.0/8`、`localhost`、`localhost.localdomain`                                  | IPv4 回送                            |
| `::1/128`                                                                            | IPv6 回送                            |
| `0.0.0.0/8`、`::/128`                                                                | 未指定和本機網路位址                 |
| `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`                                      | RFC1918 私人網路                     |
| `169.254.0.0/16`、`fe80::/10`                                                        | 連結本機位址和常見的雲端中繼資料路徑 |
| `169.254.169.254`、`metadata.google.internal`                                        | 雲端中繼資料服務                     |
| `100.64.0.0/10`                                                                      | 電信級 NAT 共用位址空間              |
| `198.18.0.0/15`、`2001:2::/48`                                                       | 基準測試範圍                         |
| `192.0.0.0/24`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | 特殊用途和文件範圍                   |
| `224.0.0.0/4`, `ff00::/8`                                                            | 多播                                 |
| `240.0.0.0/4`                                                                        | 保留的 IPv4                          |
| `fc00::/7`, `fec0::/10`                                                              | IPv6 本機/私人範圍                   |
| `100::/64`, `2001:20::/28`                                                           | IPv6 捨棄和 ORCHIDv2 範圍            |
| `64:ff9b::/96`, `64:ff9b:1::/48`                                                     | 內嵌 IPv4 的 NAT64 前綴              |
| `2002::/16`, `2001::/32`                                                             | 內嵌 IPv4 的 6to4 和 Teredo          |
| `::/96`, `::ffff:0:0/96`                                                             | IPv4 相容和 IPv4 對映的 IPv6         |

如果您的雲端供應商或網路平台記載了額外的中繼資料主機或保留範圍，也請一併新增。

## 驗證

請從執行 OpenClaw 的相同主機、容器或服務帳戶驗證代理伺服器：

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

對於由私人 CA 簽署的 HTTPS 代理端點：

```bash
openclaw proxy validate --proxy-url https://proxy.corp.example:8443 --proxy-ca-file /etc/openclaw/proxy-ca.pem
```

根據預設，當未提供自訂目的地時，指令會檢查 `https://example.com/` 是否成功，並啟動一個暫時的回送 Canary，Proxy 必須無法連線至該 Canary。當 Proxy 傳回非 2xx 的拒絕回應或以傳輸失敗封鎖該 Canary 時，預設的拒絕檢查即通過；如果 Canary 接收到成功的回應，則檢查失敗。如果未啟用且未設定 Proxy，驗證會回報設定問題；在變更設定之前，請使用 `--proxy-url` 進行一次性預檢。使用 `--allowed-url` 和 `--denied-url` 來測試特定於部署的預期。新增 `--apns-reachable` 以同時驗證直接 APNs HTTP/2 傳輸能否透過 Proxy 開啟 CONNECT 通道並接收沙箱 APNs 回應；此探測使用刻意無效的提供者 Token，因此預期會出現 `403 InvalidProviderToken` 並計為可連線。自訂的拒絕目的地採取「失敗即關閉」策略：任何 HTTP 回應都代表該目的地可透過 Proxy 連線，而任何傳輸錯誤都會被回報為結果不明，因為 OpenClaw 無法證明 Proxy 確實封鎖了可連線的來源。當驗證失敗時，指令會以代碼 1 結束。

請使用 `--json` 進行自動化。JSON 輸出包含整體結果、有效的 Proxy 設定來源、任何設定錯誤，以及每個目的地檢查。Proxy URL 憑證會在文字和 JSON 輸出中被遮蔽：

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

公開請求應該會成功。回送和中繼資料請求應該會被 Proxy 封鎖。對於 `openclaw proxy validate`，內建的回送 Canary 可以區分 Proxy 拒絕與可連線的來源。自訂 `--denied-url` 檢查沒有該 Canary，因此除非您的 Proxy 公開了您可以另行驗證的特定部署拒絕訊號，否則請將 HTTP 回應和不明確的傳輸失敗都視為驗證失敗。

## Proxy CA 信任

當 Proxy 端點本身使用由私人 CA 簽署的憑證時，請使用受管理的 `proxy.tls.caFile`：

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

該 CA 用於代理端點的 TLS 驗證。它不是目標 MITM 信任設定、用戶端憑證，也不是代理目標政策的替代品。

僅當整個 Node 程序必須從程序啟動時信任額外的 CA 時，才使用 `NODE_EXTRA_CA_CERTS`，例如當企業 TLS 檢查系統為程序中的每個 HTTPS 用戶端重新簽署目標憑證時。`NODE_EXTRA_CA_CERTS` 是程序全域的，且必須在 Node 啟動前存在。對於 HTTPS 代理端點信任，偏好使用 `proxy.tls.caFile`，因為它的範圍僅限於受控代理路由。

然後啟用 OpenClaw 代理路由：

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl https://proxy.corp.example:8443
openclaw config set proxy.tls.caFile /etc/openclaw/proxy-ca.pem
openclaw gateway run
```

或設定：

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

## 限制

- 該代理改善了對程序本機 JavaScript HTTP 和 WebSocket 用戶端的覆蓋範圍，但它不是作業系統層級的網路沙箱。
- Gateway loopback 控制平面流量預設透過 `proxy.loopbackMode: "gateway-only"` 進行直接本地旁路。OpenClaw 通過在 Proxyline 的受管旁路策略中註冊現用的 Gateway loopback 權威來實現該旁路。操作員可以設定 `proxy.loopbackMode: "proxy"` 將 Gateway loopback 流量透過受管代理傳送，或設定 `proxy.loopbackMode: "block"` 拒絕 loopback Gateway 連線。請參閱 [Gateway Loopback Mode](#gateway-loopback-mode) 以了解有關遠端代理的注意事項。
- 原始 `net`、`tls` 和 `http2` socket、原生附加元件和非 OpenClaw 子程序可能會繞過 Node 層級的代理路由，除非它們繼承並遵守代理環境變數。分叉的 OpenClaw 子 CLI 會繼承受控代理 URL 和 `proxy.loopbackMode` 狀態。
- IRC 是操作員管理之轉送代理路由之外的原始 TCP/TLS 通道。在要求所有輸出流量都透過該轉送代理的部署中，除非明確批准直接 IRC 輸出，否則請設定 `channels.irc.enabled=false`。
- 本機除錯代理是診斷工具，當受控代理模式處於活動狀態時，其對代理請求和 CONNECT 隧道的直接上游轉發預設為停用；僅對已批准的本機診斷啟用直接轉發。
- 如有需要，應在操作員代理策略中將用戶本地 WebUI 和本地模型伺服器加入允許清單；OpenClaw 不會為它們公開一般的本地網路旁路。隨附的 Ollama 記憶體嵌入提供者範圍更窄：它僅能對從設定的 `baseUrl` 衍生的確切主機本地 loopback 嵌入來源使用受保護的直接路徑，因此當受管代理無法連線至主機 loopback 時，主機本地嵌入仍能正常運作。LAN、tailnet、私人網路和公開 Ollama 嵌入主機仍會使用受管代理路徑。`proxy.loopbackMode: "proxy"` 會將此 Ollama loopback 流量透過受管代理傳送，而 `proxy.loopbackMode: "block"` 會在建立連線之前將其拒絕。
- Gateway 控制平面代理旁路有意侷限於 `localhost` 和字面意義的 loopback IP URL。請使用 `ws://127.0.0.1:18789`、`ws://[::1]:18789` 或 `ws://localhost:18789` 進行本地直接 Gateway 控制平面連線；其他主機名稱則像一般基於主機名稱的流量一樣路由。
- OpenClaw 不會檢查、測試或認證您的代理原則。
- 應將代理原則變更視為安全敏感的操作變更。

| 層面                                                        | 受管理代理狀態                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `fetch`、`node:http`、`node:https`、常見的 WebSocket 用戶端 | 設定時透過受管理代理掛鉤進行路由。                                                |
| APNs 直接 HTTP/2                                            | 透過 APNs 受管理 CONNECT 協助程式進行路由。                                       |
| 閘道控制平面迴路                                            | 僅針對已設定的本機迴路閘道 URL 直接連線。                                         |
| 除錯代理上游轉送                                            | 當受管理代理模式啟用時停用，除非為了本機診斷明確啟用。                            |
| IRC                                                         | 原始 TCP/TLS；不受受管理 HTTP 代理模式代理。除非已核准直接 IRC 輸出，否則請停用。 |
| 其他原始 `net`、`tls` 或 `http2` 用戶端呼叫                 | 必須在落地前由原始通訊端防護程式進行分類。                                        |
