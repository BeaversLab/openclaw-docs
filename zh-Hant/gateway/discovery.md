---
summary: "節點探索與傳輸（Bonjour、Tailscale、SSH），用於尋找閘道"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "探索與傳輸"
---

# 探索與傳輸

OpenClaw 有兩個截然不同的問題，表面上看似相似：

1. **操作員遠端控制**：macOS 功能表列應用程式控制別處執行的閘道。
2. **節點配對**：iOS/Android（及未來的節點）尋找閘道並安全配對。

設計目標是將所有網路探索/廣播保留在 **Node Gateway** (`openclaw gateway`) 中，並讓客戶端（mac 應用程式、iOS）作為使用者。

## 術語

- **Gateway (閘道)**：單一長期執行的閘道程序，擁有狀態（工作階段、配對、節點註冊表）並執行通道。大多數設定每台主機使用一個；可進行隔離的多閘道設定。
- **Gateway WS (control plane)**：預設在 `127.0.0.1:18789` 上的 WebSocket 端點；可以透過 `gateway.bind` 綁定到 LAN/tailnet。
- **Direct WS transport (直接 WS 傳輸)**：面向 LAN/tailnet 的 Gateway WS 端點（無 SSH）。
- **SSH transport (fallback) (SSH 傳輸（後備）)**：透過 SSH 轉發 `127.0.0.1:18789` 進行遠端控制。
- **Legacy TCP bridge (deprecated/removed) (舊版 TCP 橋接器（已棄用/移除）)**：舊版節點傳輸（參閱 [Bridge protocol](/zh-Hant/gateway/bridge-protocol)）；不再用於探索廣播。

協定詳情：

- [Gateway protocol](/zh-Hant/gateway/protocol)
- [Bridge protocol (legacy)](/zh-Hant/gateway/bridge-protocol)

## 為什麼我們同時保留「直接」和 SSH

- **Direct WS (直接 WS)** 在同一個網路和 tailnet 內提供最佳的使用者體驗：
  - 透過 Bonjour 在 LAN 上自動探索
  - 由閘道擁有的配對權杖 + ACL
  - 不需要 shell 存取權；協定介面可以保持緊密且可稽核
- **SSH** 仍然是通用的後備方案：
  - 適用於任何擁有 SSH 存取權的地方（甚至跨不相關的網路）
  - 可解決多播/mDNS 問題
  - 除了 SSH 之外不需要新的連入埠

## 探索輸入（客戶端如何得知閘道位置）

### 1) Bonjour / mDNS (LAN only) (僅限 LAN)

Bonjour 是盡力而為的，並且不會跨網路。它僅用於「同一個 LAN」的便利性。

目標方向：

- **閘道** 透過 Bonjour 廣播其 WS 端點。
- 用戶端瀏覽並顯示「選擇閘道」列表，然後儲存選擇的端點。

故障排除與訊標詳細資訊：[Bonjour](/zh-Hant/gateway/bonjour)。

#### 服務訊標詳細資訊

- 服務類型：
  - `_openclaw-gw._tcp` (閘道傳輸訊標)
- TXT 金鑰 (非機密)：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (或任何廣播的內容)
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (僅在啟用 TLS 時)
  - `gatewayTlsSha256=<sha256>` (僅在啟用 TLS 且指紋可用時)
  - `canvasPort=<port>` (canvas host 連接埠；當 canvas host 啟用時，目前與 `gatewayPort` 相同)
  - `cliPath=<path>` (選用；可執行 `openclaw` 進入點或二進位檔的絕對路徑)
  - `tailnetDns=<magicdns>` (選用提示；當 Tailscale 可用時自動偵測)

安全性備註：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。用戶端必須將 TXT 值僅視為 UX 提示。
- 路由 (主機/連接埠) 應優先考慮**已解析的服務端點** (SRV + A/AAAA)，而非 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 釘選絕不得允許廣播的 `gatewayTlsSha256` 覆寫先前儲存的釘選。
- iOS/Android 節點應將基於探索的直接連線視為**僅限 TLS**，並且在儲存首次釘選 (頻外驗證) 之前，要求明確的「信任此指紋」確認。

停用/覆寫：

- `OPENCLAW_DISABLE_BONJOUR=1` 會停用廣播。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制 Gateway 繫結模式。
- `OPENCLAW_SSH_PORT` 會覆寫 TXT 中廣播的 SSH 連接埠 (預設為 22)。
- `OPENCLAW_TAILNET_DNS` 會發布 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 會覆寫廣播的 CLI 路徑。

### 2) Tailnet (跨網路)

對於倫敦/維也納風格的設定，Bonjour 將無濟於事。建議的「直接」目標是：

- Tailscale MagicDNS 名稱 (優先) 或穩定的 tailnet IP。

如果閘道偵測到它正在 Tailscale 下運作，它會發布 `tailnetDns` 作為給用戶端的可選提示（包括廣域網信標）。

### 3) 手動 / SSH 目標

當沒有直接路由（或直接連線已停用）時，用戶端始終可以透過轉送 loopback 閘道連接埠，透過 SSH 進行連接。

請參閱 [遠端存取](/zh-Hant/gateway/remote)。

## 傳輸選擇（用戶端原則）

建議的用戶端行為：

1. 如果已設定且可連線到已配對的直接端點，請使用它。
2. 否則，如果 Bonjour 在區域網路上找到閘道，請提供一鍵「使用此閘道」的選擇，並將其儲存為直接端點。
3. 否則，如果已設定 tailnet DNS/IP，請嘗試直接連線。
4. 否則，回退到 SSH。

## 配對 + 授權（直接傳輸）

閘道是節點/用戶端准入的單一資料來源。

- 配對請求是在閘道中建立/核准/拒絕的（請參閱 [閘道配對](/zh-Hant/gateway/pairing)）。
- 閘道會強制執行：
  - 授權 (token / keypair)
  - 範圍/ACL（閘道並非對每個方法的原始代理程式）
  - 速率限制

## 各元件職責

- **閘道 (Gateway)**：發布探索信標，擁有配對決策權，並託管 WS 端點。
- **macOS 應用程式**：協助您挑選閘道，顯示配對提示，並僅將 SSH 作為備案。
- **iOS/Android 節點**：瀏覽 Bonjour 以獲得便利，並連線至已配對的 Gateway WS。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
