---
summary: "Bonjour/mDNS 探索與除錯（Gateway 信標、客戶端與常見失敗模式）"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Bonjour 探索"
---

OpenClaw 可以使用 Bonjour (mDNS / DNS-SD) 來探索作用中的 Gateway (WebSocket 端點)。
多播 `local.` 瀏覽是一種 **僅限區域網路 (LAN) 的便利功能**。內建的 `bonjour`
外掛程式擁有區域網路廣播的權限。它在 macOS 主機上會自動啟動，而在
Linux、Windows 和容器化的 Gateway 部署上則為選用。若要進行跨網路探索，同一個
信標也可以透過設定的廣域 DNS-SD 網域來發布。探索
仍然是盡力而為，並**不**會取代 SSH 或基於 Tailnet 的連線能力。

## 透過 Tailscale 實現廣域 Bonjour (單播 DNS-SD)

如果節點和 Gateway 位於不同的網路，多播 mDNS 將無法跨越
邊界。您可以透過切換到 **單播 DNS-SD**
（「廣域 Bonjour」）來透過 Tailscale 保持相同的探索體驗。

高階步驟：

1. 在 Gateway 主機上執行 DNS 伺服器（可透過 Tailnet 連線）。
2. 在專用區域下發布 `_openclaw-gw._tcp` 的 DNS-SD 記錄
   (範例: `openclaw.internal.`)。
3. 設定 Tailscale **分割 DNS**，讓您選擇的網域透過該
   DNS 伺服器為客戶端（包括 iOS）進行解析。

OpenClaw 支援任何探索網域；`openclaw.internal.` 只是一個範例。
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

這會安裝 CoreDNS 並將其設定為：

- 僅在 Gateway 的 Tailscale 介面上監聽連接埠 53
- 從 `~/.openclaw/dns/<domain>.db` 提供您選擇的網域 (範例: `openclaw.internal.`)

從一台已連線至 tailnet 的機器進行驗證：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 設定

在 Tailscale 管理主控台中：

- 新增一個指向 Gateway tailnet IP 的名稱伺服器 (UDP/TCP 53)。
- 新增分割 DNS，讓您的探索網域使用該名稱伺服器。

一旦客戶端接受 tailnet DNS，iOS 節點和 CLI 探索即可在不使用多播的情況下瀏覽
您探索網域中的 `_openclaw-gw._tcp`。

### Gateway 監聽器安全性（建議）

Gateway WS 連接埠（預設為 `18789`）預設綁定到 loopback。若要從 LAN/tailnet 存取，請明確綁定並保持啟用驗證。

對於僅使用 tailnet 的設定：

- 在 `~/.openclaw/openclaw.json` 中設定 `gateway.bind: "tailnet"`。
- 重新啟動 Gateway（或重新啟動 macOS 選單列應用程式）。

## 廣告內容

只有 Gateway 會廣告 `_openclaw-gw._tcp`。當外掛程式啟用時，LAN 多播廣告由內建的 `bonjour` 外掛程式提供；廣域 DNS-SD 發佈則仍由 Gateway 管理。

## 服務類型

- `_openclaw-gw._tcp` - Gateway 傳輸信標（由 macOS/iOS/Android 節點使用）。

## TXT 金鑰（非秘密提示）

Gateway 會廣告一些小的非秘密提示，以便讓 UI 操作流程更便利：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (僅在啟用 TLS 時)
- `gatewayTlsSha256=<sha256>` (僅在啟用 TLS 且指紋可用時)
- `canvasPort=<port>` (僅在啟用 canvas host 時；目前與 `gatewayPort` 相同)
- `transport=gateway`
- `tailnetDns=<magicdns>` (僅限 mDNS 完整模式，當 Tailnet 可用時的選用提示)
- `sshPort=<port>` (僅限 mDNS 完整模式；廣域 DNS-SD 可能會省略它)
- `cliPath=<path>` (僅限 mDNS 完整模式；廣域 DNS-SD 仍會將其寫入作為遠端安裝提示)

安全性備註：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。用戶端不得將 TXT 視為權威路由。
- 用戶端應使用解析後的服務端點 (SRV + A/AAAA) 進行路由。僅將 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 視為提示。
- SSH 自動目標同樣應使用解析後的服務主機，而非僅限 TXT 的提示。
- TLS 釘選絕不可允許廣告的 `gatewayTlsSha256` 覆蓋先前儲存的釘選。
- iOS/Android 節點應將基於探索的直接連線視為**僅限 TLS**，並且在信任首次見到的指紋前要求明確的使用者確認。

## 在 macOS 上進行偵錯

實用的內建工具：

- 瀏覽實例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析一個實例（替換 `<instance>`）：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果瀏覽正常但解析失敗，通常是由於 LAN 政策或
mDNS 解析器問題。

## 在 Gateway 日誌中偵錯

Gateway 會寫入一個滾動日誌檔案（啟動時會列印為
`gateway log file: ...`）。請尋找 `bonjour:` 行，特別是：

- `bonjour: advertise failed ...`
- `bonjour: suppressing ciao cancellation ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

Bonjour 使用系統主機名稱作為廣播 `.local` 主機，前提是它是
有效的 DNS 標籤。如果系統主機名稱包含空格、底線或其他
無效的 DNS 標籤字元，OpenClaw 會回退到 `openclaw.local`。當您需要
明確的主機標籤時，請在啟動 Gateway 之前設定
`OPENCLAW_MDNS_HOSTNAME=<name>`。

## 在 iOS 節點上進行偵錯

iOS 節點使用 `NWBrowser` 來發現 `_openclaw-gw._tcp`。

若要擷取日誌：

- Settings → Gateway → Advanced → **Discovery Debug Logs**
- Settings → Gateway → Advanced → **Discovery Logs** → reproduce → **Copy**

日誌包含瀏覽器狀態轉換和結果集變更。

## 何時啟用 Bonjour

Bonjour 會在 macOS 主機上以空設定啟動 Gateway 時自動啟動，因為
本機 App 和附近的 iOS/Android 節點通常依賴同 LAN 發現。

當同 LAN 自動發現在 Linux、
Windows 或其他非 macOS 主機上有用時，請明確啟用 Bonjour：

```bash
openclaw plugins enable bonjour
```

啟用後，Bonjour 會使用 `discovery.mdns.mode` 來決定要發布多少 TXT 中繼資料。
預設模式是 `minimal`；僅當本機用戶端需要
`cliPath` 或 `sshPort` 提示時才使用 `full`，並使用 `off` 來抑制 LAN 多播而不
變更外掛程式啟用狀態。

## 何時停用 Bonjour

當 LAN 多播廣告是不必要、無法使用
或有害時，請讓 Bonjour 保持停用狀態。常見情況包括非 macOS 伺服器、Docker 橋接網路、
WSL，或捨棄 mDNS 多播的網路政策。在這些環境中，
Gateway 仍可透過其發布的 URL、SSH、Tailnet 或廣域
DNS-SD 存取，但 LAN 自動發現並不可靠。

當問題僅限於部署範圍時，優先使用現有的環境變數覆寫：

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

這會停用 LAN 多播廣告，而無需變更外掛程式組態。它對於 Docker 映像檔、服務檔案、啟動腳本和一次性偵錯是安全的，因為當環境消失時該設定也會隨之消失。

當您有意針對該 OpenClaw 組態關閉隨附的 LAN 探索外掛程式時，請使用外掛程式組態：

```bash
openclaw plugins disable bonjour
```

## Docker 注意事項

當 `OPENCLAW_DISABLE_BONJOUR` 未設定時，隨附的 Bonjour 外掛程式會在偵測到的容器中自動停用 LAN 多播廣告。Docker 橋接網路通常不會在容器與 LAN 之間轉發 mDNS 多播 (`224.0.0.251:5353`)，因此從容器發出的廣告很少能實現探索功能。

重要注意事項：

- Bonjour 在 macOS 主機上會自動啟動，而在其他地方則是選擇加入。讓它保持停用並不會停止 Gateway；它只是跳過 LAN 多播廣告。
- 停用 Bonjour 不會變更 `gateway.bind`；Docker 仍然預設為 `OPENCLAW_GATEWAY_BIND=lan`，以便發布的主機連接埠可以正常運作。
- 停用 Bonjour 不會停用廣域 DNS-SD。當 Gateway 和節點不在同一個 LAN 上時，請使用廣域探索或 Tailnet。
- 在 Docker 之外重複使用相同的 `OPENCLAW_CONFIG_DIR` 並不會保留容器自動停用策略。
- 僅對主機網路、macvlan 或已知可傳遞 mDNS 多播的其他網路設定 `OPENCLAW_DISABLE_BONJOUR=0`；將其設定為 `1` 以強制停用。

## 針對已停用 Bonjour 的疑難排解

如果在 Docker 設定後，節點無法自動探索到 Gateway：

1. 確認 Gateway 是處於自動、強制開啟還是強制關閉模式：

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. 確認 Gateway 本身可透過發布的連接埠連線：

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. 當 Bonjour 停用時，請使用直接目標：
   - 控制 UI 或本機工具：`http://127.0.0.1:18789`
   - LAN 用戶端：`http://<gateway-host>:18789`
   - 跨網路用戶端：Tailnet MagicDNS、Tailnet IP、SSH 隧道或廣域 DNS-SD

4. 如果您在 Docker 中故意啟用了 Bonjour 外掛程式並使用 `OPENCLAW_DISABLE_BONJOUR=0` 強制廣告，請從主機測試多播：

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   如果瀏覽結果為空，或 Gateway 日誌顯示重複的 ciao 看門狗取消操作，請還原 `OPENCLAW_DISABLE_BONJOUR=1` 並使用直接連線或 Tailnet 路由。

## 常見失敗模式

- **Bonjour 無法跨越網路**：請使用 Tailnet 或 SSH。
- **多播被封鎖**：部分 Wi-Fi 網路會停用 mDNS。
- **廣告端卡在探測/宣告階段**：封鎖多播的主機、容器橋接網路、WSL 或介面頻繁變動可能會導致 ciao 廣告端處於未宣告狀態。OpenClaw 會重試幾次，然後停用目前 Gateway 程序的 Bonjour 功能，而不是無限期地重啟廣告端。
- **Docker 橋接網路**：Bonjour 會在偵測到的容器中自動停用。僅針對 host、macvlan 或其他支援 mDNS 的網路設定 `OPENCLAW_DISABLE_BONJOUR=0`。
- **睡眠 / 介面頻繁變動**：macOS 可能會暫時丟失 mDNS 結果；請重試。
- **瀏覽正常但解析失敗**：請保持機器名稱簡單（避免表情符號或標點符號），然後重新啟動 Gateway。服務實例名稱源自主機名稱，因此過於複雜的名稱可能會混淆某些解析器。

## 轉義的實例名稱 (`\032`)

Bonjour/DNS-SD 經常將服務實例名稱中的位元組轉義為十進位 `\DDD` 序列（例如，空格變為 `\032`）。

- 這在協定層級是正常的。
- 使用者介面應該解碼後再顯示（iOS 使用 `BonjourEscapes.decode`）。

## 啟用 / 停用 / 設定

- macOS 主機預設會自動啟動內建的 LAN 探索外掛程式。
- `openclaw plugins enable bonjour` 可在未預設啟用的主機上啟用內建的 LAN 探索外掛程式。
- `openclaw plugins disable bonjour` 透過停用內建外掛程式來停用 LAN 多播廣告。
- `OPENCLAW_DISABLE_BONJOUR=1` 停用 LAN 多播廣告，而不變更外掛程式設定；可接受的真值包括 `1`、`true`、`yes` 和 `on`（舊版：`OPENCLAW_DISABLE_BONJOUR`）。
- `OPENCLAW_DISABLE_BONJOUR=0` 強制開啟 LAN 多播廣告，包括在偵測到的容器內；可接受的假值為 `0`、`false`、`no` 和 `off`。
- 當啟用 Bonjour 外掛且未設定 `OPENCLAW_DISABLE_BONJOUR` 時，Bonjour 會在一般主機上進行廣告，並在偵測到的容器內自動停用。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制 Gateway 綁定模式。
- 當廣告 `sshPort` 時，`OPENCLAW_SSH_PORT` 會覆寫 SSH 連接埠（舊版：`OPENCLAW_SSH_PORT`）。
- 當啟用 mDNS 完整模式時，`OPENCLAW_TAILNET_DNS` 會在 TXT 中發佈 MagicDNS 提示（舊版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 會覆寫廣告的 CLI 路徑（舊版：`OPENCLAW_CLI_PATH`）。

## 相關文件

- 探索策略與傳輸選擇：[Discovery](/zh-Hant/gateway/discovery)
- 節點配對 + 核准：[Gateway pairing](/zh-Hant/gateway/pairing)
