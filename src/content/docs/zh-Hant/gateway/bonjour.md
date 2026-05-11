---
summary: "Bonjour/mDNS 發現與除錯（Gateway 信標、客戶端及常見故障模式）"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Bonjour 發現"
---

# Bonjour / mDNS 探索

OpenClaw 使用 Bonjour (mDNS / DNS‑SD) 來發現作用中的 Gateway (WebSocket 端點)。
多播 `local.` 瀏覽僅是一種 **僅限區域網路 (LAN) 的便利功能**。內建的 `bonjour`
外掛程式擁有 LAN 廣告功能並預設啟用。若要進行跨網路發現，
同一個信標也可以透過設定的廣域 DNS-SD 網域發佈。
發現仍然屬於盡力而為，並且 **不會** 取代 SSH 或基於 Tailnet 的連線。

## 透過 Tailscale 實現廣域 Bonjour (Unicast DNS-SD)

如果節點與 Gateway 位於不同的網路，多播 mDNS 將無法跨越
邊界。您可以透過在 Tailscale 上切換至**單播 DNS‑SD**
（「廣域 Bonjour」）來保持相同的探索體驗。

高階步驟：

1. 在 Gateway 主機上執行 DNS 伺服器（可透過 Tailnet 存取）。
2. 在專用區域下發佈 `_openclaw-gw._tcp` 的 DNS‑SD 記錄
   (例如：`openclaw.internal.`)。
3. 設定 Tailscale **分割 DNS**，讓您選擇的網域在客戶端（包括 iOS）透過該
   DNS 伺服器解析。

OpenClaw 支援任何發現網域；`openclaw.internal.` 只是一個範例。
iOS/Android 節點會同時瀏覽 `local.` 和您設定的廣域網域。

### Gateway 設定（建議）

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### 一次性 DNS 伺服器設定（Gateway 主機）

```bash
openclaw dns setup --apply
```

這將安裝 CoreDNS 並將其設定為：

- 僅在 Gateway 的 Tailscale 介面上監聽連接埠 53
- 從 `~/.openclaw/dns/<domain>.db` 提供您選擇的網域 (例如：`openclaw.internal.`)

從一台連線至 tailnet 的機器進行驗證：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 設定

在 Tailscale 管理主控台中：

- 新增一個指向 Gateway tailnet IP 的名稱伺服器 (UDP/TCP 53)。
- 新增分割 DNS，讓您的探索網域使用該名稱伺服器。

一旦客戶端接受 tailnet DNS，iOS 節點和 CLI 發現即可
在不使用多播的情況下，瀏覽您發現網域中的 `_openclaw-gw._tcp`。

### Gateway 監聽器安全性（建議）

Gateway WS 連接埠 (預設 `18789`) 預設綁定至 loopback。若要進行 LAN/tailnet
存取，請明確綁定並保持啟用驗證。

對於僅限 tailnet 的設定：

- 在 `~/.openclaw/openclaw.json` 中設定 `gateway.bind: "tailnet"`。
- 重新啟動 Gateway（或重新啟動 macOS 選單列應用程式）。

## 什麼會發布廣告

只有 Gateway 會廣告 `_openclaw-gw._tcp`。LAN 多播廣告
由內建的 `bonjour` 外掛程式提供；廣域 DNS-SD 發佈則
維持由 Gateway 擁有。

## 服務類型

- `_openclaw-gw._tcp` — gateway 傳輸信標 (由 macOS/iOS/Android 節點使用)。

## TXT 金鑰（非機密提示）

Gateway 會廣播一些非機密的小提示，以方便 UI 流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (僅當啟用 TLS 時)
- `gatewayTlsSha256=<sha256>` (僅當啟用 TLS 且指紋可用時)
- `canvasPort=<port>` (僅當啟用 canvas host 時；目前與 `gatewayPort` 相同)
- `transport=gateway`
- `tailnetDns=<magicdns>` (僅限 mDNS 完整模式，當 Tailnet 可用時為可選提示)
- `sshPort=<port>` (僅限 mDNS 完整模式；廣域 DNS-SD 可能會省略它)
- `cliPath=<path>` (僅限 mDNS 完整模式；廣域 DNS-SD 仍會將其寫入作為遠端安裝提示)

安全說明：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。客戶端不得將 TXT 視為授權路由。
- 用戶端應使用解析的服務端點 (SRV + A/AAAA) 進行路由。將 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 僅視為提示。
- SSH 自動目標設定同樣應使用解析出的服務主機，而非僅 TXT 的提示。
- TLS 釘選絕不允許廣告的 `gatewayTlsSha256` 覆蓋先前儲存的釘選。
- iOS/Android 節點應將基於探索的直接連線視為**僅限 TLS**，並在信任初次指紋前要求明確的使用者確認。

## 在 macOS 上偵錯

實用的內建工具：

- 瀏覽實例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析一個執行個體 (替換 `<instance>`)：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果瀏覽正常但解析失敗，通常代表遇到了 LAN 原則或
mDNS 解析器問題。

## 在 Gateway 日誌中偵錯

Gateway 會寫入一個輪替日誌檔案 (在啟動時列印為
`gateway log file: ...`)。尋找 `bonjour:` 行，特別是：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

當系統主機名稱是有效的 DNS 標籤時，Bonjour 會將系統主機名稱用於廣告的 `.local` 主機。如果系統主機名稱包含空格、底線或其他無效的 DNS 標籤字元，OpenClaw 會退回到 `openclaw.local`。當您需要明確的主機標籤時，請在啟動 Gateway 之前設定 `OPENCLAW_MDNS_HOSTNAME=<name>`。

## 在 iOS 節點上進行偵錯

iOS 節點使用 `NWBrowser` 來發現 `_openclaw-gw._tcp`。

若要擷取日誌：

- Settings → Gateway → Advanced → **Discovery Debug Logs**
- Settings → Gateway → Advanced → **Discovery Logs** → reproduce → **Copy**

日誌包含瀏覽器狀態轉換和結果集變更。

## 何時停用 Bonjour

僅在 LAN 多點傳送廣告不可用或有害時停用 Bonjour。常見情況是 Gateway 在 Docker 橋接網路、WSL 或丟棄 mDNS 多點傳送的網路策略後執行。在這些環境中，Gateway 仍可透過其發布的 URL、SSH、Tailnet 或廣域 DNS-SD 存取，但 LAN 自動發現並不可靠。

當問題與部署範圍相關時，請優先使用現有的環境覆寫：

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

這會在不更改外掛程式組態的情況下停用 LAN 多點傳播廣播。對於 Docker 映像檔、服務檔案、啟動腳本和一次性偵錯來說這是安全的，因為當環境不存在時，該設定會隨之消失。

僅當您有意要針對該 OpenClaw 組態關閉內建的 LAN 探索外掛程式時，才使用外掛程式組態：

```bash
openclaw plugins disable bonjour
```

## Docker 注意事項

當未設定 `OPENCLAW_DISABLE_BONJOUR` 時，內建的 Bonjour 外掛程式會在偵測到的容器中自動停用 LAN 多點傳播廣播。Docker 橋接網路通常不會在容器與 LAN 之間轉發 mDNS 多點傳播 (`224.0.0.251:5353`)，因此從容器進行廣播很少能讓探索發揮作用。

重要注意事項：

- 停用 Bonjour 並不會停止 Gateway。它只會停止 LAN 多點傳播廣播。
- 停用 Bonjour 不會改變 `gateway.bind`；Docker 仍然預設為 `OPENCLAW_GATEWAY_BIND=lan`，以便發佈的主機連接埠能夠運作。
- 停用 Bonjour 並不會停用廣域 DNS-SD。當 Gateway 和節點不在同一個 LAN 上時，請使用廣域探索或 Tailnet。
- 在 Docker 之外重複使用相同的 `OPENCLAW_CONFIG_DIR` 並不會持續保留容器自動停用原則。
- 僅針對主機網路、macvlan 或其他已知可傳遞 mDNS 多點傳播的網路設定 `OPENCLAW_DISABLE_BONJOUR=0`；將其設定為 `1` 以強制停用。

## 針對已停用 Bonjour 的疑難排解

如果在 Docker 設定後節點無法自動探索 Gateway：

1. 確認 Gateway 是以自動、強制開啟還是強制關閉模式執行：

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. 確認 Gateway 本身可透過已發佈的連接埠連線：

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. 當 Bonjour 停用時，請使用直接目標：
   - 控制 UI 或本機工具：`http://127.0.0.1:18789`
   - LAN 用戶端：`http://<gateway-host>:18789`
   - 跨網路用戶端：Tailnet MagicDNS、Tailnet IP、 SSH 隧道或廣域 DNS-SD

4. 如果您在 Docker 中使用 `OPENCLAW_DISABLE_BONJOUR=0` 故意啟用了 Bonjour，請從主機測試多點傳播：

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   如果瀏覽結果為空白，或 Gateway 日誌顯示重複的 ciao 看門狗 取消，請恢復 `OPENCLAW_DISABLE_BONJOUR=1` 並使用直接或 Tailnet 路由。

## 常見的失敗模式

- **Bonjour 無法跨越網路**：請使用 Tailnet 或 SSH。
- **多播被阻擋**：某些 Wi‑Fi 網路會停用 mDNS。
- **廣告端卡在探測/公告階段**：多播被阻擋的主機、
  容器橋接、WSL 或介面變動可能會導致 ciao 廣告端處於
  未公告狀態。OpenClaw 會重試幾次，然後對目前的 Gateway
  程序停用 Bonjour，而不是無限期地重新啟動廣告端。
- **Docker 橋接網路**：Bonjour 會在偵測到的容器中自動停用。
  僅針對 host、macvlan 或其他支援 mDNS 的網路設定
  `OPENCLAW_DISABLE_BONJOUR=0`。
- **睡眠 / 介面變動**：macOS 可能會暫時遺失 mDNS 結果；請重試。
- **瀏覽正常但解析失敗**：請保持機器名稱簡單（避免表情符號或
  標點符號），然後重新啟動 Gateway。服務執行個體名稱衍生自
  主機名稱，因此過於複雜的名稱可能會導致某些解析器混淆。

## 轉義的執行個體名稱 (`\032`)

Bonjour/DNS‑SD 經常將服務執行個體名稱中的位元組轉義為十進位 `\DDD`
序列（例如空格會變成 `\032`）。

- 這在通訊協定層級是正常的。
- 使用者介面應解碼後再顯示（iOS 使用 `BonjourEscapes.decode`）。

## 停用 / 設定

- `openclaw plugins disable bonjour` 會透過停用內建外掛程式來停用 LAN 多播廣告。
- `openclaw plugins enable bonjour` 會還原預設的 LAN 探索外掛程式。
- `OPENCLAW_DISABLE_BONJOUR=1` 會在不變更外掛程式設定的情況下停用 LAN 多播廣告；接受的真值為 `1`、`true`、`yes` 和 `on`（舊版：`OPENCLAW_DISABLE_BONJOUR`）。
- `OPENCLAW_DISABLE_BONJOUR=0` 會強制開啟 LAN 多播廣告，包括在偵測到的容器內；接受的假值為 `0`、`false`、`no` 和 `off`。
- 當未設定 `OPENCLAW_DISABLE_BONJOUR` 時，Bonjour 會在一般主機上進行廣告，並在偵測到的容器內自動停用。
- `gateway.bind` 中的 `~/.openclaw/openclaw.json` 控制 Gateway 繫結模式。
- 當通告 `sshPort` 時，`OPENCLAW_SSH_PORT` 會覆寫 SSH 連接埠（舊版：`OPENCLAW_SSH_PORT`）。
- 當啟用 mDNS 完整模式時，`OPENCLAW_TAILNET_DNS` 會在 TXT 中發布 MagicDNS 提示（舊版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 會覆寫通告的 CLI 路徑（舊版：`OPENCLAW_CLI_PATH`）。

## 相關文件

- 探索策略與傳輸選擇：[探索](/zh-Hant/gateway/discovery)
- 節點配對與核准：[Gateway 配對](/zh-Hant/gateway/pairing)
