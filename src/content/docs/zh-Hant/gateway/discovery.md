---
summary: "Node discovery and transports (Bonjour, Tailscale, SSH) for finding the gateway"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "Discovery and transports"
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
  [Bridge protocol](/zh-Hant/gateway/bridge-protocol)）；不再廣播用於
  探索，也不再是目前版本的組成部分。

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

疑難排解與信標詳細資訊：[Bonjour](/zh-Hant/gateway/bonjour)。

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
- 當 `OPENCLAW_DISABLE_BONJOUR` 未設定時，Bonjour 會在一般主機上廣播
  並在偵測到的容器內自動停用。僅在主機、macvlan
  或其他支援 mDNS 的網路上使用 `0`；使用 `1` 強制停用。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制閘道綁定模式。
- 當發出 `sshPort` 時，`OPENCLAW_SSH_PORT` 會覆寫廣播的 SSH 連接埠。
- `OPENCLAW_TAILNET_DNS` 會發布 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 會覆寫廣播的 CLI 路徑。

### 2) Tailnet (跨網路)

對於倫敦/維也納風格的設定，Bonjour 派不上用場。建議的「直接」目標是：

- Tailscale MagicDNS 名稱（優先）或穩定的 tailnet IP。

如果閘道偵測到自己在 Tailscale 下運行，它會發布 `tailnetDns` 作為客戶端的選用提示（包括廣域信標）。

macOS 應用程式現在偏好使用 MagicDNS 名稱而非原始的 Tailscale IP 來進行閘道探索。當 tailnet IP 變更時（例如節點重新啟動或 CGNAT 重新指派後），這能提高可靠性，因為 MagicDNS 名稱會自動解析為目前的 IP。

對於行動節點配對，探索提示不會放寬 tailnet/公開路由上的傳輸安全性：

- iOS/Android 仍需要安全的首次 tailnet/公開連線路徑 (`wss://` 或 Tailscale Serve/Funnel)。
- 探索到的原始 tailnet IP 是路由提示，而非使用純文字遠端 `ws://` 的許可。
- 私人 LAN 直接連線 `ws://` 仍受支援。
- 如果您想要為移動節點使用最簡單的 Tailscale 路徑，請使用 Tailscale Serve，這樣發現和設定程式碼都會解析到同一個安全的 MagicDNS 端點。

### 3) 手動 / SSH 目標

當沒有直接路由（或直接連線已停用）時，客戶端始終可以透過轉送 loopback 閘道埠來透過 SSH 連線。

請參閱 [遠端存取](/zh-Hant/gateway/remote)。

## 傳輸選擇（客戶端原則）

建議的客戶端行為：

1. 如果已設定且可連線到配對的直接端點，請使用它。
2. 否則，如果發現在 `local.` 或設定的廣域網域上發現了閘道，提供一鍵「使用此閘道」的選項並將其儲存為直接端點。
3. 否則，如果設定了 tailnet DNS/IP，請嘗試直接連線。
   對於 tailnet/公開路由上的移動節點，直接連線是指安全的端點，而非純文字的遠端 `ws://`。
4. 否則，退回到 SSH。

## 配對 + 認證（直接傳輸）

閘道是節點/客戶端准入的唯一事實來源。

- 配對請求是在閘道中建立/核准/拒絕的（請參閱 [閘道配對](/zh-Hant/gateway/pairing)）。
- 閘道執行：
  - 認證 (token / keypair)
  - 範圍/ACL（閘道不是每個方法的原始代理）
  - 速率限制

## 各元件的責任

- **閘道**：廣播發現信標，擁有配對決定權，並且託管 WS 端點。
- **macOS 應用程式**：協助您選擇閘道，顯示配對提示，並僅將 SSH 作為後備方案。
- **iOS/Android 節點**：瀏覽 Bonjour 以便於操作，並連線到配對的閘道 WS。

## 相關

- [遠端存取](/zh-Hant/gateway/remote)
- [Tailscale](/zh-Hant/gateway/tailscale)
- [Bonjour 發現](/zh-Hant/gateway/bonjour)
