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
- **Legacy TCP bridge (已棄用/已移除)**：舊版節點傳輸（請參閱 [橋接協定](/en/gateway/bridge-protocol)）；不再對發現進行廣播。

協議詳情：

- [Gateway 協定](/en/gateway/protocol)
- [橋接協定 (舊版)](/en/gateway/bridge-protocol)

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

### 1) Bonjour / mDNS (LAN only)

Bonjour 是盡力而為的，並且不會跨越網路。它僅用於「同一 LAN」的便利性。

Target direction:

- **Gateway** 透過 Bonjour 廣播其 WS 端點。
- 客戶端瀏覽並顯示「選擇閘道」清單，然後儲存選定的端點。

疑難排解與信標詳細資訊：[Bonjour](/en/gateway/bonjour)。

#### 服務信標詳細資訊

- 服務類型：
  - `_openclaw-gw._tcp` (閘道傳輸信標)
- TXT 金鑰（非機密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (操作員設定的顯示名稱)
  - `lanHost=<hostname>.local`
  - `sshPort=22` (或是任何廣播的內容)
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (僅在啟用 TLS 時)
  - `gatewayTlsSha256=<sha256>` (僅在啟用 TLS 且指紋可用時)
  - `canvasPort=<port>` (canvas host 連接埠；當啟用 canvas host 時，目前與 `gatewayPort` 相同)
  - `cliPath=<path>` (可選；可執行 `openclaw` 進入點或二進位檔的絕對路徑)
  - `tailnetDns=<magicdns>` (可選提示；當 Tailscale 可用時自動偵測)

安全備註：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。客戶端必須將 TXT 值僅視為 UX 提示。
- 路由 (主機/連接埠) 應優先考慮 **已解析的服務端點** (SRV + A/AAAA)，而非 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 釘選絕不允許廣播的 `gatewayTlsSha256` 覆蓋先前儲存的釘選。
- iOS/Android 節點應將基於發現的直接連線視為 **僅限 TLS**，並在儲存首次釘選 (頻外驗證) 之前，要求明確的「信任此指紋」確認。

停用/覆寫：

- `OPENCLAW_DISABLE_BONJOUR=1` 停用廣播。
- `gateway.bind` 中的 `~/.openclaw/openclaw.json` 控制 Gateway 繫結模式。
- `OPENCLAW_SSH_PORT` 覆寫 TXT 中廣播的 SSH 連接埠 (預設為 22)。
- `OPENCLAW_TAILNET_DNS` 發布 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 覆寫廣播的 CLI 路徑。

### 2) Tailnet (跨網路)

對於倫敦/維也納風格的設置，Bonjour 沒有幫助。推薦的「direct」目標是：

- Tailscale MagicDNS 名稱（首選）或穩定的 tailnet IP。

如果閘道偵測到它正在 Tailscale 下運行，它會發布 `tailnetDns` 作為給用戶端的可選提示（包括廣域信標）。

macOS 應用程式現在偏好使用 MagicDNS 名稱而非原始 Tailscale IP 來進行閘道探索。這能提高在 tailnet IP 變更時（例如在節點重新啟動或 CGNAT 重新分配後）的可靠性，因為 MagicDNS 名稱會自動解析為目前的 IP。

### 3) 手動 / SSH 目標

當沒有直接路由（或直接連線已停用）時，用戶端始終可以透過轉送 loopback 閘道埠來透過 SSH 連線。

請參閱[遠端存取](/en/gateway/remote)。

## 傳輸選擇（用戶端策略）

建議的用戶端行為：

1. 如果已設定且可連線到配對的直接端點，請使用它。
2. 否則，如果 Bonjour 在 LAN 上找到閘道，提供一鍵「使用此閘道」的選項並將其儲存為直接端點。
3. 否則，如果已設定 tailnet DNS/IP，請嘗試直接連線。
4. 否則，退回到 SSH。

## 配對 + 身分驗證（直接傳輸）

閘道是節點/用戶端准入的權威來源。

- 配對請求是在閘道中建立/核准/拒絕的（請參閱[閘道配對](/en/gateway/pairing)）。
- 閘道強制執行：
  - 身分驗證 (token / keypair)
  - 範圍/ACL（閘道並非每個方法的原始代理伺服器）
  - 速率限制

## 各元件的職責

- **閘道**：發布探索信標，擁有配對決策權，並託管 WS 端點。
- **macOS 應用程式**：協助您選擇閘道，顯示配對提示，並僅將 SSH 作為備案使用。
- **iOS/Android 節點**：瀏覽 Bonjour 以求方便，並連線到已配對的 Gateway WS。
