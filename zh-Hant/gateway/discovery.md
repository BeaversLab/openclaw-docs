---
summary: "節點探索與傳輸（Bonjour、Tailscale、SSH）用於尋找閘道"
read_when:
  - 實作或變更 Bonjour 探索/廣播
  - 調整遠端連線模式（直接 vs SSH）
  - 設計遠端節點的節點探索 + 配對
title: "探索與傳輸"
---

# 探索與傳輸

OpenClaw 有兩個截然不同的問題，表面上看起來很相似：

1. **操作員遠端控制**：macOS 選單列應用程式控制著在別處執行的閘道。
2. **節點配對**：iOS/Android（以及未來的節點）尋找閘道並進行安全配對。

設計目標是將所有網路探索/廣播保留在 **Node Gateway** (`openclaw gateway`) 中，並讓客戶端（mac app、iOS）作為消費者。

## 術語

- **Gateway (閘道)**：一個單一長期執行的閘道程序，擁有狀態（會話、配對、節點註冊表）並執行通道。大多數設置每台主機使用一個；可以進行隔離的多閘道設置。
- **Gateway WS (控制平面)**：預設位於 `127.0.0.1:18789` 的 WebSocket 端點；可以透過 `gateway.bind` 繫結到 LAN/tailnet。
- **Direct WS transport (直接 WS 傳輸)**：面向 LAN/tailnet 的 Gateway WS 端點（無 SSH）。
- **SSH transport (fallback) (SSH 傳輸 (後備))**：透過 SSH 轉發 `127.0.0.1:18789` 進行遠端控制。
- **Legacy TCP bridge (deprecated/removed) (舊版 TCP 橋接器 (已棄用/移除))**：較舊的節點傳輸（請參閱 [Bridge protocol](/zh-Hant/gateway/bridge-protocol)）；不再用於探索廣播。

協議詳情：

- [Gateway protocol](/zh-Hant/gateway/protocol)
- [Bridge protocol (legacy)](/zh-Hant/gateway/bridge-protocol)

## 為什麼我們同時保留「直接」和 SSH

- **Direct WS** 在同一網路和 tailnet 內提供最佳的使用者體驗：
  - 透過 Bonjour 在 LAN 上自動探索
  - 由閘道擁有的配對權杖 + ACL
  - 不需要 shell 存取權；協議介面可以保持嚴格且可稽核
- **SSH** 仍然是通用的後備方案：
  - 可在任何有 SSH 存取權的地方運作（甚至在跨不相關網路的情況下）
  - 可克服多播/mDNS 問題
  - 除了 SSH 之外，不需要新的輸入連接埠

## 探索輸入（客戶端如何得知閘道位置）

### 1) Bonjour / mDNS (僅限 LAN)

Bonjour 是盡力而為的，且無法跨越網路。它僅用於「相同 LAN」的便利性。

目標方向：

- **閘道** 會透過 Bonjour 廣播其 WS 端點。
- 用戶端會瀏覽並顯示「選擇閘道」清單，然後儲存所選的端點。

疑難排解與信標詳細資訊：[Bonjour](/zh-Hant/gateway/bonjour)。

#### 服務信標詳細資訊

- 服務類型：
  - `_openclaw-gw._tcp` (閘道傳輸信標)
- TXT 金鑰 (非機密)：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (或任何正在廣播的值)
  - `gatewayPort=18789` (閘道 WS + HTTP)
  - `gatewayTls=1` (僅在啟用 TLS 時)
  - `gatewayTlsSha256=<sha256>` (僅在啟用 TLS 且指紋可用時)
  - `canvasPort=<port>` (canvas host 埠；當啟用 canvas host 時，目前與 `gatewayPort` 相同)
  - `cliPath=<path>` (選用；可執行 `openclaw` 進入點或二進位檔案的絕對路徑)
  - `tailnetDns=<magicdns>` (選用提示；當 Tailscale 可用時會自動偵測)

安全性備註：

- Bonjour/mDNS TXT 記錄是**未經驗證的**。用戶端必須將 TXT 值僅視為 UX 提示。
- 路由 (主機/埠) 應優先使用**已解析的服務端點** (SRV + A/AAAA)，而非 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 釘選決不允許廣播的 `gatewayTlsSha256` 覆寫先前儲存的釘選。
- iOS/Android 節點應將基於探索的直接連接視為**僅限 TLS**，並且在儲存首次釘選 (帶外驗證) 之前，需要明確的「信任此指紋」確認。

停用/覆寫：

- `OPENCLAW_DISABLE_BONJOUR=1` 停用廣播。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制閘道綁定模式。
- `OPENCLAW_SSH_PORT` 覆寫 TXT 中廣播的 SSH 埠 (預設為 22)。
- `OPENCLAW_TAILNET_DNS` 發佈 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 覆寫廣播的 CLI 路徑。

### 2) Tailnet (跨網路)

對於 London/Vienna 風格的設定，Bonjour 沒有幫助。建議的「直接」目標是：

- Tailscale MagicDNS 名稱（首選）或穩定的 tailnet IP。

如果閘道偵測到它正在 Tailscale 下運行，它會發布 `tailnetDns` 作為給用戶端的可選提示（包括廣域網信標）。

### 3) 手動 / SSH 目標

當沒有直接路由（或直接連線已停用）時，用戶端始終可以透過轉送 loopback 閘道連接埠，透過 SSH 進行連接。

請參閱[遠端存取](/zh-Hant/gateway/remote)。

## 傳輸選擇（用戶端原則）

建議的用戶端行為：

1. 如果已設定且可連線到配對的直接端點，請使用它。
2. 否則，如果 Bonjour 在區域網路上找到閘道，提供一鍵「使用此閘道」的選項並將其儲存為直接端點。
3. 否則，如果已設定 tailnet DNS/IP，請嘗試直接連線。
4. 否則，退回至 SSH。

## 配對 + 授權（直接傳輸）

閘道是節點/用戶端准入的來源事實。

- 配對請求是在閘道中建立/核准/拒絕的（請參閱[閘道配對](/zh-Hant/gateway/pairing)）。
- 閘道執行：
  - 授權（token / 金鑰對）
  - 範圍/ACL（閘道不是對每個方法的原始代理）
  - 速率限制

## 各元件的職責

- **閘道**：發布探索信標，擁有配對決策，並託管 WS 端點。
- **macOS 應用程式**：協助您選擇閘道，顯示配對提示，並僅將 SSH 作為備案使用。
- **iOS/Android 節點**：瀏覽 Bonjour 作為便利措施，並連線到配對的閘道 WS。

import en from "/components/footer/en.mdx";

<en />
