---
summary: "Bonjour/mDNS 探索與除錯（Gateway 信標、客戶端與常見失敗模式）"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Bonjour 探索"
---

# Bonjour / mDNS 探索

OpenClaw 使用 Bonjour (mDNS / DNS‑SD) 來探索作用中的 Gateway（WebSocket 端點）。
多播 `local.` 瀏覽僅適用於 **區域網路 (LAN) 的便利用途**。若要進行跨網路探索，
相同的訊標也可以透過設定的廣域 DNS-SD 網域發布。探索機制
仍屬盡力而為，並**不會**取代 SSH 或基於 Tailnet 的連線。

## 透過 Tailscale 實現廣域 Bonjour (Unicast DNS-SD)

如果節點與 Gateway 位於不同的網路，多播 mDNS 將無法跨越
邊界。您可以透過在 Tailscale 上切換至**單播 DNS‑SD**
（「廣域 Bonjour」）來保持相同的探索體驗。

高階步驟：

1. 在 Gateway 主機上執行 DNS 伺服器（可透過 Tailnet 存取）。
2. 在專用區域下發布 `_openclaw-gw._tcp` 的 DNS‑SD 記錄
   （例如：`openclaw.internal.`）。
3. 設定 Tailscale **分割 DNS**，讓您選擇的網域在客戶端（包括 iOS）透過該
   DNS 伺服器解析。

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

- 僅在 Gateway 的 Tailscale 介面上監聽連接埠 53
- 從 `~/.openclaw/dns/<domain>.db` 提供您選擇的網域（例如：`openclaw.internal.`）

從一台連線至 tailnet 的機器進行驗證：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 設定

在 Tailscale 管理主控台中：

- 新增一個指向 Gateway tailnet IP 的名稱伺服器 (UDP/TCP 53)。
- 新增分割 DNS，讓您的探索網域使用該名稱伺服器。

一旦客戶端接受 tailnet DNS，iOS 節點和 CLI 探索就可以
在不需要多播的情況下瀏覽您探索網域中的 `_openclaw-gw._tcp`。

### Gateway 監聽器安全性（建議）

Gateway WS 連接埠（預設為 `18789`）預設綁定至 loopback。若要進行 LAN/tailnet
存取，請明確綁定並保持啟用驗證。

對於僅限 tailnet 的設定：

- 在 `~/.openclaw/openclaw.json` 中設定 `gateway.bind: "tailnet"`。
- 重新啟動 Gateway（或重新啟動 macOS 選單列應用程式）。

## 什麼會發布廣告

只有 Gateway 會發佈 `_openclaw-gw._tcp`。

## 服務類型

- `_openclaw-gw._tcp` — gateway 傳輸訊標（由 macOS/iOS/Android 節點使用）。

## TXT 金鑰（非機密提示）

Gateway 會廣播一些非機密的小提示，以方便 UI 流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (僅在啟用 TLS 時)
- `gatewayTlsSha256=<sha256>` (僅在啟用 TLS 且指紋可用時)
- `canvasPort=<port>` (僅在啟用 canvas host 時；目前與 `gatewayPort` 相同)
- `transport=gateway`
- `tailnetDns=<magicdns>` (當 Tailnet 可用時的選用提示)
- `sshPort=<port>` (僅限 mDNS 完整模式；廣域 DNS-SD 可能會省略)
- `cliPath=<path>` (僅限 mDNS 完整模式；廣域 DNS-SD 仍會將其寫入為遠端安裝提示)

安全說明：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。客戶端不得將 TXT 視為授權路由。
- 客戶端應使用解析出的服務端點 (SRV + A/AAAA) 進行路由。僅將 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 視為提示。
- SSH 自動目標設定同樣應使用解析出的服務主機，而非僅 TXT 的提示。
- TLS 鎖定絕不允許廣播的 `gatewayTlsSha256` 覆寫先前儲存的鎖定值。
- iOS/Android 節點應將基於探索的直接連線視為**僅限 TLS**，並在信任初次指紋前要求明確的使用者確認。

## 在 macOS 上偵錯

實用的內建工具：

- 瀏覽實例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析單一實例（請替換 `<instance>`）：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果瀏覽正常但解析失敗，通常代表遇到了 LAN 原則或
mDNS 解析器問題。

## 在 Gateway 日誌中偵錯

Gateway 會寫入一個輪替日誌檔案（啟動時會顯示為
`gateway log file: ...`）。請尋找 `bonjour:` 行，特別是：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## 在 iOS 節點上偵錯

iOS 節點使用 `NWBrowser` 來探索 `_openclaw-gw._tcp`。

擷取日誌的方法：

- Settings → Gateway → Advanced → **Discovery Debug Logs**
- Settings → Gateway → Advanced → **Discovery Logs** → 重現問題 → **Copy**

該日誌包含瀏覽器狀態轉換和結果集的變更。

## 常見的失敗模式

- **Bonjour 無法跨越網路**：請使用 Tailnet 或 SSH。
- **多播被封鎖**：部分 Wi‑Fi 網路會停用 mDNS。
- **睡眠 / 介面變動**：macOS 可能會暫時丟失 mDNS 結果；請重試。
- **瀏覽正常但解析失敗**：請保持電腦名稱簡單（避免使用表情符號或
  標點符號），然後重新啟動 Gateway。服務實例名稱衍生自主機名稱，因此過於複雜的名稱可能會導致某些解析器混亂。

## 轉義的實例名稱 (`\032`)

Bonjour/DNS‑SD 經常會將服務實例名稱中的位元組轉義為十進制 `\DDD`
序列（例如空格會變成 `\032`）。

- 這在協議層級上是正常的。
- UI 應進行解碼以供顯示（iOS 使用 `BonjourEscapes.decode`）。

## 停用 / 設定

- `OPENCLAW_DISABLE_BONJOUR=1` 可停用廣播（舊版：`OPENCLAW_DISABLE_BONJOUR`）。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制 Gateway 的綁定模式。
- 當廣播 `sshPort` 時，`OPENCLAW_SSH_PORT` 會覆寫 SSH 連接埠（舊版：`OPENCLAW_SSH_PORT`）。
- `OPENCLAW_TAILNET_DNS` 會在 TXT 中發佈 MagicDNS 提示（舊版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 會覆寫廣播的 CLI 路徑（舊版：`OPENCLAW_CLI_PATH`）。

## 相關文件

- 探索原則與傳輸選擇：[Discovery](/zh-Hant/gateway/discovery)
- 節點配對 + 核准：[Gateway pairing](/zh-Hant/gateway/pairing)
