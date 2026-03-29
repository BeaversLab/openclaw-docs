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
- **Legacy TCP bridge (deprecated/removed)**：舊的節點傳輸（請參閱 [Bridge protocol](/en/gateway/bridge-protocol)）；不再為探索而廣播。

協議詳情：

- [Gateway protocol](/en/gateway/protocol)
- [Bridge protocol (legacy)](/en/gateway/bridge-protocol)

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

疑難排解和信標詳細資訊：[Bonjour](/en/gateway/bonjour)。

#### 服務信標詳細資訊

- 服務類型：
  - `_openclaw-gw._tcp` (閘道傳輸信標)
- TXT 金鑰（非機密）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (或任何廣播的內容)
  - `gatewayPort=18789` (閘道 WS + HTTP)
  - `gatewayTls=1` (僅當啟用 TLS 時)
  - `gatewayTlsSha256=<sha256>` (僅當啟用 TLS 且指紋可用時)
  - `canvasPort=<port>` (canvas host port；當 canvas host 啟用時，目前與 `gatewayPort` 相同)
  - `cliPath=<path>` (選用；可執行 `openclaw` 進入點或二進位檔案的絕對路徑)
  - `tailnetDns=<magicdns>` (選用提示；當 Tailscale 可用時會自動偵測)

安全性備註：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。客戶端必須將 TXT 值僅視為 UX 提示。
- 路由（主機/埠號）應優先考慮**解析後的服務端點**（SRV + A/AAAA），而非 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 釘選絕不可允許廣播的 `gatewayTlsSha256` 覆蓋先前儲存的釘選。
- iOS/Android 節點應將基於探索的直接連接視為**僅限 TLS**，並且在儲存首次釘選（帶外驗證）之前，要求明確的「信任此指紋」確認。

停用/覆寫：

- `OPENCLAW_DISABLE_BONJOUR=1` 會停用廣播。
- `gateway.bind` 中的 `~/.openclaw/openclaw.json` 控制閘道綁定模式。
- `OPENCLAW_SSH_PORT` 會覆寫 TXT 中廣播的 SSH 埠號（預設為 22）。
- `OPENCLAW_TAILNET_DNS` 會發布 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 會覆寫廣播的 CLI 路徑。

### 2) Tailnet (跨網路)

對於倫敦/維也納風格的設定，Bonjour 將無濟於事。建議的「直接」目標是：

- Tailscale MagicDNS 名稱（首選）或穩定的 tailnet IP。

如果閘道偵測到自己在 Tailscale 下運作，它會發布 `tailnetDns` 作為給客戶端的可選提示（包含廣域網路信標）。

### 3) 手動 / SSH 目標

當沒有直接路由（或直接連線已停用）時，客戶端總是可以透過轉送 loopback 閘道連接埠，以 SSH 方式進行連線。

請參閱[遠端存取](/en/gateway/remote)。

## 傳輸選擇（客戶端原則）

建議的客戶端行為：

1. 如果已設定且可連線至配對的直接端點，請使用它。
2. 否則，如果 Bonjour 在 LAN 上找到閘道，請提供一鍵「使用此閘道」的選項並將其儲存為直接端點。
3. 否則，如果已設定 tailnet DNS/IP，請嘗試直接連線。
4. 否則，退回至 SSH。

## 配對 + 驗證（直接傳輸）

閘道是節點/客戶端准入的資料來源。

- 配對請求是在閘道中建立/核准/拒絕的（請參閱[閘道配對](/en/gateway/pairing)）。
- 閘道會執行：
  - 驗證（token / 金鑰對）
  - 範圍/ACL（閘道並非每個方法的原始 Proxy）
  - 速率限制

## 各元件的職責

- **閘道**：發布探索信標，擁有配對決定權，並託管 WS 端點。
- **macOS 應用程式**：協助您選擇閘道，顯示配對提示，並僅將 SSH 作為備案使用。
- **iOS/Android 節點**：瀏覽 Bonjour 以便使用，並連線至已配對的 Gateway WS。
