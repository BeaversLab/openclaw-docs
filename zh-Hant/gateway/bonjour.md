---
summary: "Bonjour/mDNS 探索與除錯（Gateway 信標、客戶端與常見故障模式）"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Bonjour 探索"
---

# Bonjour / mDNS 探索

OpenClaw 使用 Bonjour (mDNS / DNS‑SD) 作為一種**僅限區域網路 (LAN) 的便利功能**來探索
作用中的 Gateway（WebSocket 端點）。這是盡力而為的，並**不會**取代 SSH 或
基於 Tailnet 的連線。

## 透過 Tailscale 的廣域 Bonjour (Unicast DNS‑SD)

如果節點和 Gateway 位於不同的網路上，多播 mDNS 將無法跨越
邊界。您可以透過切換到 Tailscale 上的**單播 DNS‑SD**
（「廣域 Bonjour」）來保持相同的探索體驗。

高層級步驟：

1. 在 Gateway 主機上執行 DNS 伺服器（可透過 Tailnet 存取）。
2. 在專用區域下發布 `_openclaw-gw._tcp` 的 DNS‑SD 記錄
   （例如：`openclaw.internal.`）。
3. 設定 Tailscale **分流 DNS (split DNS)**，以便您選擇的網域對客戶端
   （包括 iOS）透過該 DNS 伺服器進行解析。

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

這將安裝 CoreDNS 並將其設定為：

- 僅在 Gateway 的 Tailscale 介面上監聽 53 埠
- 從 `~/.openclaw/dns/<domain>.db` 提供您選擇的網域（例如：`openclaw.internal.`）

從連接到 tailnet 的機器進行驗證：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 設定

在 Tailscale 管理主控台中：

- 新增一個指向 Gateway tailnet IP 的名稱伺服器 (UDP/TCP 53)。
- 新增分流 DNS，讓您的探索網域使用該名稱伺服器。

一旦客戶端接受 tailnet DNS，iOS 節點即可在無需多播的情況下
瀏覽您探索網域中的 `_openclaw-gw._tcp`。

### Gateway 監聽器安全性（建議）

Gateway WS 埠（預設 `18789`）預設綁定至 loopback。若要進行區域網路/tailnet
存取，請明確綁定並保持啟用驗證。

對於僅限 tailnet 的設定：

- 在 `~/.openclaw/openclaw.json` 中設定 `gateway.bind: "tailnet"`。
- 重新啟動 Gateway（或重新啟動 macOS 選單列應用程式）。

## 發佈內容

只有 Gateway 廣播 `_openclaw-gw._tcp`。

## 服務類型

- `_openclaw-gw._tcp` — gateway transport 信標（由 macOS/iOS/Android 節點使用）。

## TXT 金鑰（非機密提示）

Gateway 廣播一些非機密的小提示，以方便 UI 流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (僅當啟用 TLS 時)
- `gatewayTlsSha256=<sha256>` (僅當啟用 TLS 且指紋可用時)
- `canvasPort=<port>` (僅當啟用 canvas 主機時；目前與 `gatewayPort` 相同)
- `sshPort=<port>` (若未覆蓋，預設為 22)
- `transport=gateway`
- `cliPath=<path>` (選用；可執行 `openclaw` 進入點的絕對路徑)
- `tailnetDns=<magicdns>` (當 Tailnet 可用時的選用提示)

安全注意事項：

- Bonjour/mDNS TXT 記錄是 **未經驗證的**。客戶端不得將 TXT 視為權威路由。
- 客戶端應使用解析後的服務端點 (SRV + A/AAAA) 進行路由。將 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 僅視為提示。
- TLS 釘選絕不可允許廣播的 `gatewayTlsSha256` 覆蓋先前儲存的釘選。
- iOS/Android 節點應將基於探索的直接連線視為 **僅限 TLS**，並在信任初次指紋前要求明確的使用者確認。

## 在 macOS 上進行偵錯

實用的內建工具：

- 瀏覽執行個體：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析單一執行個體 (替換 `<instance>`)：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果瀏覽正常但解析失敗，通常是遇到了 LAN 政策或 mDNS 解析器問題。

## 在 Gateway 記錄中偵錯

Gateway 會寫入一個滾動記錄檔 (啟動時顯示為
`gateway log file: ...`)。尋找 `bonjour:` 行，特別是：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## 在 iOS 節點上偵錯

iOS 節點使用 `NWBrowser` 來探索 `_openclaw-gw._tcp`。

若要擷取日誌：

- Settings → Gateway → Advanced → **Discovery Debug Logs**
- Settings → Gateway → Advanced → **Discovery Logs** → reproduce → **Copy**

日誌包含瀏覽器狀態轉換和結果集變更。

## 常見的失敗模式

- **Bonjour 無法跨越網路**：請使用 Tailnet 或 SSH。
- **多播被封鎖**：某些 Wi‑Fi 網路會停用 mDNS。
- **睡眠 / 介面變動**：macOS 可能會暫時捨棄 mDNS 結果；請重試。
- **瀏覽正常但解析失敗**：請保持機器名稱簡單（避免表情符號或
  標點符號），然後重新啟動 Gateway。服務實例名稱衍生自
  主機名稱，因此過於複雜的名稱可能會導致某些解析器混淆。

## 轉義的實例名稱 (`\032`)

Bonjour/DNS‑SD 通常會將服務實例名稱中的位元組轉義為十進位 `\DDD`
序列（例如空格變成 `\032`）。

- 這在協定層級是正常的。
- 使用者介面應進行解碼以供顯示（iOS 使用 `BonjourEscapes.decode`）。

## 停用 / 設定

- `OPENCLAW_DISABLE_BONJOUR=1` 會停用廣告（舊版：`OPENCLAW_DISABLE_BONJOUR`）。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制 Gateway 繫結模式。
- `OPENCLAW_SSH_PORT` 會覆寫 TXT 中廣告的 SSH 連接埠（舊版：`OPENCLAW_SSH_PORT`）。
- `OPENCLAW_TAILNET_DNS` 會在 TXT 中發佈 MagicDNS 提示（舊版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 會覆寫廣告的 CLI 路徑（舊版：`OPENCLAW_CLI_PATH`）。

## 相關文件

- 探索原則和傳輸選取：[Discovery](/zh-Hant/gateway/discovery)
- 節點配對 + 核准：[Gateway pairing](/zh-Hant/gateway/pairing)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
