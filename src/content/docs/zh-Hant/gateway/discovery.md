---
summary: "Node discovery and transports (Bonjour, Tailscale, SSH) for finding the gateway"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "Discovery and transports"
---

OpenClaw 有兩個截然不同的問題，表面上看起来很相似：

1. **操作員遠端控制**：macOS 選單列應用程式控制運行在其他地方的閘道。
2. **節點配對**：iOS/Android（以及未來的節點）尋找閘道並安全地進行配對。

設計目標是將所有網路探索/廣播保留在 **節點閘道** (`openclaw gateway`) 中，並讓客戶端（mac 應用程式、iOS）作為使用者。

## 術語

- **閘道**：單一長期運行的閘道進程，擁有狀態（會話、配對、節點註冊表）並運行通道。大多數設置每台主機使用一個；也可以進行隔離的多閘道設置。
- **閘道 WS (控制平面)**：預設在 `127.0.0.1:18789` 上的 WebSocket 端點；可以透過 `gateway.bind` 綁定到區域網路/tailnet。
- **直接 WS 傳輸**：面向區域網路/tailnet 的閘道 WS 端點（無 SSH）。
- **SSH 傳輸 (備用)**：透過 SSH 轉發 `127.0.0.1:18789` 進行遠端控制。
- **舊版 TCP 橋接器 (已移除)**：較舊的節點傳輸方式（請參閱
  [橋接器協定](/zh-Hant/gateway/bridge-protocol))；不再廣播用於
  探索，也不再是當前構建的一部分。

協定細節：

- [閘道協定](/zh-Hant/gateway/protocol)
- [橋接器協定 (舊版)](/zh-Hant/gateway/bridge-protocol)

## 為什麼我們同時保留直接和 SSH

- **直接 WS** 在同一網路和 tailnet 中提供最佳的使用者體驗：
  - 透過 Bonjour 在區域網路上自動探索
  - 配對權杖 + 由閘道擁有的 ACL
  - 不需要 shell 存取權；協定表面可以保持嚴格且可稽核
- **SSH** 仍然是通用的備用方案：
  - 適用於任何擁有 SSH 存取權的地方（甚至在跨不相關網路的情況下）
  - 可以解決 multicast/mDNS 問題
  - 除了 SSH 之外，不需要開啟新的連入埠

## 探索輸入 (客戶端如何得知閘道的位置)

### 1) Bonjour / DNS-SD 探索

多播 Bonjour 是盡力而為的，且無法跨越網路。OpenClaw 也可以透過配置的廣域 DNS-SD 網域瀏覽相同的閘道信標，因此探索可以覆蓋：

- 同一區域網路上的 `local.`
- 用於跨網路探索的已配置單播 DNS-SD 網域

目標方向：

- 當啟用隨附的
  `bonjour` 外掛程式時，**gateway** 會透過 Bonjour 公告其 WS 端點。此外掛程式在 macOS 主機上會自動啟動，而在其他地方則為選用。
- 用戶端會瀏覽並顯示「選擇一個 gateway」清單，然後儲存所選的端點。

疑難排解與信標詳細資訊：[Bonjour](/zh-Hant/gateway/bonjour)。

#### 服務信標詳細資訊

- 服務類型：
  - `_openclaw-gw._tcp` (gateway 傳輸信標)
- TXT 金鑰 (非機密)：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (操作員設定的顯示名稱)
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (僅在啟用 TLS 時)
  - `gatewayTlsSha256=<sha256>` (僅在啟用 TLS 且可用指紋時)
  - `canvasPort=<port>` (canvas 主機連接埠；目前當啟用 canvas 主機時與 `gatewayPort` 相同)
  - `tailnetDns=<magicdns>` (選用提示；當 Tailscale 可用時會自動偵測)
  - `sshPort=<port>` (僅限 mDNS 完整模式；廣域 DNS-SD 可能會省略它，在這種情況下 SSH 預設值保持為 `22`)
  - `cliPath=<path>` (僅限 mDNS 完整模式；廣域 DNS-SD 仍會將其寫入為遠端安裝提示)

安全備註：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。用戶端必須將 TXT 值僅視為 UX 提示。
- 路由 (主機/連接埠) 應優先考慮**已解析的服務端點** (SRV + A/AAAA)，而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 釘選絕不允許公告的 `gatewayTlsSha256` 覆寫先前儲存的釘選。
- 當選擇的路由是安全/TLS 基礎時，iOS/Android 節點應要求明確的「信任此指紋」確認，然後再儲存首次釘選 (頻外驗證)。

啟用/停用/覆寫：

- `openclaw plugins enable bonjour` 啟用 LAN 多播公告。
- `OPENCLAW_DISABLE_BONJOUR=1` 停用公告。
- 當啟用 Bonjour 外掛且未設定 `OPENCLAW_DISABLE_BONJOUR` 時，Bonjour 會在一般主機上廣播，並在偵測到的容器內自動停用。使用空設定的 macOS Gateway 啟動會自動啟用此外掛；Linux、Windows 和容器化部署需要明確啟用。僅在 host、macvlan 或其他支援 mDNS 的網路上使用 `0`；使用 `1` 來強制停用。
- `gateway.bind` 在 `~/.openclaw/openclaw.json` 中控制 Gateway 繫結模式。
- 當發出 `sshPort` 時，`OPENCLAW_SSH_PORT` 會覆寫廣播的 SSH 連接埠。
- `OPENCLAW_TAILNET_DNS` 會發布 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 會覆寫廣播的 CLI 路徑。

### 2) Tailnet (跨網路)

對於 London/Vienna 風格的設定，Bonjour 沒有幫助。建議的「直接」目標是：

- Tailscale MagicDNS 名稱（優先）或穩定的 tailnet IP。

如果 Gateway 能偵測到它正在 Tailscale 下運行，它會發布 `tailnetDns` 作為客戶端的選用提示 (包括廣域 beacons)。

macOS 應用程式現在偏好使用 MagicDNS 名稱而非原始的 Tailscale IP 來進行閘道探索。當 tailnet IP 變更時（例如節點重新啟動或 CGNAT 重新指派後），這能提高可靠性，因為 MagicDNS 名稱會自動解析為目前的 IP。

對於行動節點配對，探索提示不會放寬 tailnet/公開路由上的傳輸安全性：

- iOS/Android 仍然需要安全的首次 tailnet/公開連線路徑 (`wss://` 或 Tailscale Serve/Funnel)。
- 發現到的原始 tailnet IP 是路由提示，而非使用明文遠端 `ws://` 的許可。
- 私人 LAN 直接連線 `ws://` 仍然受支援。
- 如果您想要為移動節點使用最簡單的 Tailscale 路徑，請使用 Tailscale Serve，這樣發現和設定程式碼都會解析到同一個安全的 MagicDNS 端點。

### 3) 手動 / SSH 目標

當沒有直接路由（或直接連線已停用）時，客戶端始終可以透過轉送 loopback 閘道埠來透過 SSH 連線。

請參閱 [遠端存取](/zh-Hant/gateway/remote)。

## 傳輸選擇（客戶端原則）

建議的客戶端行為：

1. 如果已設定且可連線到配對的直接端點，請使用它。
2. 否則，如果發現在 `local.` 或設定的廣域網域名稱上發現了 Gateway，則提供一鍵「使用此 Gateway」的選項並將其儲存為直接端點。
3. 否則，如果設定了 tailnet DNS/IP，請嘗試直接連線。
   對於 tailnet/公開路由上的行動節點，直接連線指的是安全端點，而非明文遠端 `ws://`。
4. 否則，退回到 SSH。

## 配對 + 認證（直接傳輸）

閘道是節點/客戶端准入的唯一事實來源。

- 配對請求是在 Gateway 中建立/核准/拒絕的 (請參閱 [Gateway 配對](/zh-Hant/gateway/pairing))。
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
- [Bonjour 探索](/zh-Hant/gateway/bonjour)
