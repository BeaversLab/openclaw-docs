---
summary: "Bonjour/mDNS 探索 + 除錯（Gateway 信標、客戶端和常見失敗模式）"
read_when:
  - 在 macOS/iOS 上對 Bonjour 探索問題進行除錯
  - 變更 mDNS 服務類型、TXT 記錄或探索 UX
title: "Bonjour Discovery"
---

# Bonjour / mDNS 探索

OpenClaw 使用 Bonjour (mDNS / DNS‑SD) 作為一種 **僅限區域網路 (LAN) 的便利功能** 來探索
作用中的 Gateway（WebSocket 端點）。這屬於盡力而為，並**不**會取代 SSH 或
基於 Tailnet 的連線。

## 透過 Tailscale 進行廣域 Bonjour (Unicast DNS-SD)

如果節點和 Gateway 位於不同的網路上，多播 mDNS 將無法跨越
邊界。您可以透過 Tailscale 切換至 **單播 DNS‑SD**
（「廣域 Bonjour」）來保持相同的探索 UX。

高階步驟：

1. 在 Gateway 主機上執行 DNS 伺服器（可透過 Tailnet 存取）。
2. 在專用區域下發佈 `_openclaw-gw._tcp` 的 DNS‑SD 記錄
   （例如：`openclaw.internal.`）。
3. 設定 Tailscale **split DNS**，讓您選擇的網域透過該
   DNS 伺服器為客戶端（包括 iOS）進行解析。

OpenClaw 支援任何探索網域；`openclaw.internal.` 僅為範例。
iOS/Android 節點會同時瀏覽 `local.` 和您設定的廣域網域。

### Gateway 設定（建議）

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### 一次性 DNS 伺服器設定（gateway 主機）

```bash
openclaw dns setup --apply
```

這會安裝 CoreDNS 並將其設定為：

- 僅在 Gateway 的 Tailscale 介面上監聽連接埠 53
- 從 `~/.openclaw/dns/<domain>.db` 提供您選擇的網域（例如：`openclaw.internal.`）

從一台連線至 tailnet 的機器進行驗證：

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS 設定

在 Tailscale 管理主控台中：

- 新增一個指向 Gateway 之 tailnet IP (UDP/TCP 53) 的名稱伺服器。
- 新增 split DNS，讓您的探索網域使用該名稱伺服器。

一旦客戶端接受 tailnet DNS，iOS 節點即可在無需多播的情況下瀏覽
您探索網域中的 `_openclaw-gw._tcp`。

### Gateway 監聽器安全性（建議）

Gateway WS 連接埠（預設 `18789`）預設綁定至 loopback。若要進行 LAN/tailnet
存取，請明確綁定並保持啟用驗證。

對於僅限 tailnet 的設定：

- 在 `~/.openclaw/openclaw.json` 中設定 `gateway.bind: "tailnet"`。
- 重新啟動 Gateway（或重新啟動 macOS 功能表列應用程式）。

## 會發布什麼

只有 Gateway 會廣告 `_openclaw-gw._tcp`。

## 服務類型

- `_openclaw-gw._tcp` — gateway 傳輸信標（由 macOS/iOS/Android 節點使用）。

## TXT 金鑰（非機密提示）

Gateway 會廣告一些非機密的小提示以方便 UI 操作流程：

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (僅當啟用 TLS 時)
- `gatewayTlsSha256=<sha256>` (僅當啟用 TLS 且指紋可用時)
- `canvasPort=<port>` (僅當啟用 canvas host 時；目前與 `gatewayPort` 相同)
- `sshPort=<port>` (若未覆寫則預設為 22)
- `transport=gateway`
- `cliPath=<path>` (選用；可執行 `openclaw` 進入點的絕對路徑)
- `tailnetDns=<magicdns>` (當 Tailnet 可用時的選用提示)

安全備註：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。用戶端不得將 TXT 視為權威路由。
- 用戶端應使用解析出的服務端點 (SRV + A/AAAA) 進行路由。僅將 `lanHost`、`tailnetDns`、`gatewayPort` 和 `gatewayTlsSha256` 視為提示。
- TLS 釘選絕不允許廣告的 `gatewayTlsSha256` 覆寫先前儲存的釘選。
- iOS/Android 節點應將基於探索的直接連線視為**僅限 TLS**，並在信任首次指紋前要求明確的使用者確認。

## 在 macOS 上偵錯

實用的內建工具：

- 瀏覽實例：

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- 解析其中一個實例（請替換 `<instance>`）：

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

如果瀏覽正常但解析失敗，通常是因為 LAN 原則或
mDNS 解析器問題。

## 在 Gateway 日誌中偵錯

Gateway 會寫入一個輪替日誌檔案（啟動時會印出為
`gateway log file: ...`）。請尋找 `bonjour:` 行，特別是：

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## 在 iOS 節點上偵錯

iOS 節點使用 `NWBrowser` 來探索 `_openclaw-gw._tcp`。

若要擷取記錄：

- Settings → Gateway → Advanced → **Discovery Debug Logs**
- Settings → Gateway → Advanced → **Discovery Logs** → reproduce → **Copy**

記錄包含瀏覽器狀態轉換和結果集變更。

## 常見的失敗模式

- **Bonjour 無法跨網路運作**：請使用 Tailnet 或 SSH。
- **多播被封鎖**：部分 Wi‑Fi 網路會停用 mDNS。
- **休眠 / 介面變動**：macOS 可能會暫時捨棄 mDNS 結果；請重試。
- **瀏覽運作但解析失敗**：請保持機器名稱簡單（避免表情符號或
  標點符號），然後重新啟動 Gateway。服務執行個體名稱衍生自
  主機名稱，因此過於複雜的名稱可能會混淆某些解析器。

## 轉義的執行個體名稱 (`\032`)

Bonjour/DNS‑SD 經常將服務執行個體名稱中的位元組轉義為十進位 `\DDD`
序列（例如空格會變成 `\032`）。

- 這在協定層級屬於正常現象。
- UI 應進行解碼以供顯示（iOS 使用 `BonjourEscapes.decode`）。

## 停用 / 設定

- `OPENCLAW_DISABLE_BONJOUR=1` 會停用廣告（舊版：`OPENCLAW_DISABLE_BONJOUR`）。
- `gateway.bind` 在 `~/.openclaw/openclaw.json` 中控制 Gateway 繫結模式。
- `OPENCLAW_SSH_PORT` 會覆寫 TXT 中廣告的 SSH 連接埠（舊版：`OPENCLAW_SSH_PORT`）。
- `OPENCLAW_TAILNET_DNS` 會在 TXT 中發佈 MagicDNS 提示（舊版：`OPENCLAW_TAILNET_DNS`）。
- `OPENCLAW_CLI_PATH` 會覆寫廣告的 CLI 路徑（舊版：`OPENCLAW_CLI_PATH`）。

## 相關文件

- 探索原則與傳輸選取：[探索](/zh-Hant/gateway/discovery)
- 節點配對 + 核准：[Gateway 配對](/zh-Hant/gateway/pairing)

import en from "/components/footer/en.mdx";

<en />
