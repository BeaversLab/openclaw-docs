---
summary: "Node discovery and transports (Bonjour, Tailscale, SSH) for finding the gateway"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "Discovery and Transports"
---

# Discovery & transports

OpenClaw 有兩個截然不同但表面上看起來相似的問題：

1. **操作員遠端控制**：macOS 選單列應用程式控制在其他地方運行的閘道。
2. **節點配對**：iOS/Android（以及未來的節點）尋找閘道並安全地進行配對。

設計目標是將所有網路探索/廣播保留在 **Node Gateway** (`openclaw gateway`) 中，並讓客戶端（mac app、iOS）作為消費者。

## 術語

- **Gateway**：單一長期運行的閘道程序，擁有狀態（sessions、pairing、node registry）並運行通道。大多數設置每個主機使用一個；隔離的多閘道設置也是可能的。
- **Gateway WS (control plane)**：預設位於 `127.0.0.1:18789` 上的 WebSocket 端點；可以透過 `gateway.bind` 綁定到 LAN/tailnet。
- **Direct WS transport**：面向 LAN/tailnet 的 Gateway WS 端點（無 SSH）。
- **SSH transport (fallback)**：透過 SSH 轉發 `127.0.0.1:18789` 進行遠端控制。
- **Legacy TCP bridge (removed)**：較舊的節點傳輸方式（請參閱
  [Bridge protocol](/zh-Hant/gateway/bridge-protocol)）；不再廣播以供
  探索，也不再包含在目前的建置版本中。

協議詳情：

- [Gateway protocol](/zh-Hant/gateway/protocol)
- [Bridge protocol (legacy)](/zh-Hant/gateway/bridge-protocol)

## 為什麼我們同時保留「direct」和 SSH

- **Direct WS** 在同一網路和 tailnet 內提供最佳的使用者體驗：
  - 透過 Bonjour 在 LAN 上自動探索
  - 由閘道擁有的配對權杖 + ACL
  - 不需要 shell 存取權限；協議介面可以保持緊密且可稽核
- **SSH** 仍然是通用的後備方案：
  - 只要有 SSH 存取權限的任何地方都可以運作（甚至跨不相關的網路）
  - 不受多播/mDNS 問題的影響
  - 除了 SSH 之外不需要新的連入埠

## Discovery inputs (how clients learn where the gateway is)

### 1) Bonjour / DNS-SD 探索

多播 Bonjour 是盡力而為的，且無法跨網路。OpenClaw 也可以透過設定的廣域 DNS-SD 網域瀏覽
相同的 gateway beacon，因此探索範圍可涵蓋：

- `local.` 在同一個 LAN 上
- 一個設定的單播 DNS-SD 網域，用於跨網路探索

目標方向：

- **gateway** 會透過 Bonjour 廣播其 WS 端點。
- 用戶端會瀏覽並顯示「選擇一個 gateway」清單，然後儲存選擇的端點。

疑難排解與 beacon 詳細資訊：[Bonjour](/zh-Hant/gateway/bonjour)。

#### 服務 beacon 詳細資訊

- 服務類型：
  - `_openclaw-gw._tcp` (gateway transport beacon)
- TXT 金鑰（非機密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (操作員設定的顯示名稱)
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (僅在啟用 TLS 時)
  - `gatewayTlsSha256=<sha256>` (僅在啟用 TLS 且可使用指紋時)
  - `canvasPort=<port>` (canvas host port；當 canvas host 啟用時，目前與 `gatewayPort` 相同)
  - `tailnetDns=<magicdns>` (選用提示；當 Tailscale 可用時會自動偵測)
  - `sshPort=<port>` (僅限 mDNS 完整模式；廣域 DNS-SD 可能會省略它，在此情況下 SSH 預設值保持為 `22`)
  - `cliPath=<path>` (僅限 mDNS 完整模式；廣域 DNS-SD 仍會將其寫入為遠端安裝提示)

安全性備註：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。用戶端必須將 TXT 值僅視為 UX 提示。
- 路由 (host/port) 應優先使用**解析的服務端點** (SRV + A/AAAA)，而非 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 鎖定絕不能允許廣告的 `gatewayTlsSha256` 覆寫先前儲存的鎖定。
- iOS/Android 節點在儲存首次鎖定（帶外驗證）之前，應要求明確的「信任此指紋」確認，無論何時所選路由是安全/基於 TLS 的。

停用/覆寫：

- `OPENCLAW_DISABLE_BONJOUR=1` 停用廣告。
- `gateway.bind` in `~/.openclaw/openclaw.json` 控制 Gateway 綁定模式。
- `OPENCLAW_SSH_PORT` 覆寫發出 `sshPort` 時廣告的 SSH 連接埠。
- `OPENCLAW_TAILNET_DNS` 發佈 `tailnetDns` 提示。
- `OPENCLAW_CLI_PATH` 覆寫廣告的 CLI 路徑。

### 2) Tailnet (跨網路)

對於倫敦/維也納風格的設置，Bonjour 沒有幫助。建議的「直接」目標是：

- Tailscale MagicDNS 名稱（首選）或穩定的 tailnet IP。

如果 Gateway 可以偵測到它正在 Tailscale 下運行，它會發佈 `tailnetDns` 作為給用戶端的可選提示（包括廣域網路信標）。

macOS 應用程式現在在 Gateway 探索時優先使用 MagicDNS 名稱而非原始 Tailscale IP。當 tailnet IP 變更時（例如節點重新啟動或 CGNAT 重新分配後），這會提高可靠性，因為 MagicDNS 名稱會自動解析為目前的 IP。

對於行動節點配對，探索提示不會放鬆 tailnet/公開路由上的傳輸安全性：

- iOS/Android 仍然需要安全的首次 tailnet/公開連接路徑 (`wss://` 或 Tailscale Serve/Funnel)。
- 探索到的原始 tailnet IP 是路由提示，並非使用純文字遠端 `ws://` 的許可。
- 私人 LAN 直接連線 `ws://` 仍然受支援。
- 如果您想要行動節點最簡單的 Tailscale 路徑，請使用 Tailscale Serve，這樣探索和設置程式碼都會解析到同一個安全的 MagicDNS 端點。

### 3) 手動 / SSH 目標

當沒有直接路由（或直接連線被停用）時，用戶端可以透過轉送 loopback Gateway 連接埠，隨時透過 SSH 連線。

請參閱 [Remote access](/zh-Hant/gateway/remote)。

## 傳輸選擇（用戶端原則）

建議的用戶端行為：

1. 如果已配置並可存取配對的直接端點，則使用它。
2. 否則，如果在 `local.` 或設定的廣域網域上發現了閘道，則提供一鍵「使用此閘道」的選項並將其儲存為直接端點。
3. 否則，如果設定了 tailnet DNS/IP，請嘗試直接連線。
   對於 tailnet/公網路由上的行動節點，直接連線意指安全端點，而非明文遠端 `ws://`。
4. 否則，退回使用 SSH。

## 配對 + 驗證 (直接傳輸)

閘道是節點/客戶端准入的準確來源。

- 配對請求是在閘道中建立/核准/拒絕的 (請參閱 [Gateway pairing](/zh-Hant/gateway/pairing))。
- 閘道強制執行：
  - 驗證 (token / keypair)
  - 範圍/ACL (閘道並非所有方法的原始代理伺服器)
  - 速率限制

## 各組件的職責

- **閘道**：廣播發現訊標，擁有配對決策權，並託管 WS 端點。
- **macOS app**：協助您挑選閘道，顯示配對提示，並僅將 SSH 作為備案使用。
- **iOS/Android 節點**：瀏覽 Bonjour 以方便操作並連線至已配對的 Gateway WS。
