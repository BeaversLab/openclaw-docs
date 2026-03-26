---
summary: "用於尋找閘道的節點發現與傳輸（Bonjour、Tailscale、SSH）"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "發現與傳輸"
---

# 發現與傳輸

OpenClaw 有兩個截然不同的問題，表面上看似相似：

1. **操作員遠端控制**：macOS 選單列 App 控制在別處執行的閘道。
2. **節點配對**：iOS/Android（以及未來的節點）尋找閘道並安全配對。

設計目標是將所有網路發現/廣播保留在 **節點閘道**（`openclaw gateway`）中，並讓客戶端（mac app、iOS）作為消費者。

## 術語

- **閘道**：單一長時間執行的閘道程序，擁有狀態（會話、配對、節點註冊表）並執行通道。大多數設定每台主機使用一個；也可以進行隔離的多閘道設定。
- **Gateway WS (control plane)**：預設為 `127.0.0.1:18789` 上的 WebSocket 端點；可透過 `gateway.bind` 綁定至 LAN/tailnet。
- **Direct WS transport**：面相 LAN/tailnet 的 Gateway WS 端點 (無 SSH)。
- **SSH transport (fallback)**：透過 SSH 轉發 `127.0.0.1:18789` 進行遠端控制。
- **Legacy TCP bridge (deprecated/removed)**：舊版節點傳輸 (參見 [Bridge protocol](/zh-Hant/gateway/bridge-protocol))；不再發佈於探索中。

Protocol details:

- [Gateway protocol](/zh-Hant/gateway/protocol)
- [Bridge protocol (legacy)](/zh-Hant/gateway/bridge-protocol)

## Why we keep both "direct" and SSH

- **Direct WS** 在同一網路及 tailnet 內能提供最佳的使用者體驗：
  - auto-discovery on LAN via Bonjour
  - pairing tokens + ACLs owned by the gateway
  - no shell access required; protocol surface can stay tight and auditable
- **SSH** 仍是通用的後備方案：
  - 適用於任何擁有 SSH 存取權限的地方（即使跨越不相關的網路）
  - 不受多播/mDNS 問題的影響
  - 除了 SSH 之外，不需要開啟新的連入連接埠

## 探索輸入（客戶端如何得知閘道位置）

### 1) Bonjour / mDNS（僅限 LAN）

Bonjour 是盡力而為的，不會跨越網路。它僅用於「同一個區域網路」的便利性。

目標方向：

- **閘道**會透過 Bonjour 廣播其 WS 端點。
- 客戶端會進行瀏覽並顯示「選擇一個閘道」清單，然後儲存選擇的端點。

故障排除與訊號細節：[Bonjour](/zh-Hant/gateway/bonjour)。

#### 服務訊號細節

- 服務類型：
  - `_openclaw-gw._tcp`（閘道傳輸訊號）
- TXT 金鑰（非機密）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22`（或任何被廣播的內容）
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (only when TLS is enabled)
  - `gatewayTlsSha256=<sha256>` (only when TLS is enabled and fingerprint is available)
  - `canvasPort=<port>` (canvas host port; currently the same as `gatewayPort` when the canvas host is enabled)
  - `cliPath=<path>` (optional; absolute path to a runnable `openclaw` entrypoint or binary)
  - `tailnetDns=<magicdns>` (optional hint; auto-detected when Tailscale is available)

Security notes:

- Bonjour/mDNS TXT records are **unauthenticated**. Clients must treat TXT values as UX hints only.
- Routing (host/port) should prefer the **resolved service endpoint** (SRV + A/AAAA) over TXT-provided `lanHost`, `tailnetDns`, or `gatewayPort`.
- TLS pinning 必絕不允許廣告的 `gatewayTlsSha256` 覆蓋先前儲存的 pin。
- iOS/Android 節點應將基於探索的直接連接視為 **僅限 TLS**，並在儲存首次 pin（頻外驗證）前要求明確的「信任此指紋」確認。

停用/覆蓋：

- `OPENCLAW_DISABLE_BONJOUR=1` 會停用廣告。
- `gateway.bind` 於 `~/.openclaw/openclaw.json` 中控制 Gateway 繫結模式。
- `OPENCLAW_SSH_PORT` 會覆蓋於 TXT 中廣告的 SSH 連接埠（預設為 22）。
- `OPENCLAW_TAILNET_DNS` 會發布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 會覆蓋廣告的 CLI 路徑。

### 2) Tailnet（跨網路）

對於 London/Vienna 風格的設定，Bonjour 派不上用場。建議的「直接」目標為：

- Tailscale MagicDNS 名稱（首選）或穩定的 tailnet IP。

如果閘道可以偵測到它正在 Tailscale 下運作，它會發布 `tailnetDns` 作為給客戶端的選用提示（包括廣域信標）。

### 3) 手動 / SSH 目標

當沒有直接路由（或直接連線已停用）時，客戶端始終可以透過轉發 loopback 閘道連接埠，透過 SSH 進行連線。

請參閱 [遠端存取](/zh-Hant/gateway/remote)。

## 傳輸選擇（客戶端策略）

建議的客戶端行為：

1. 如果已設定且可連接到已配對的直接端點，請使用它。
2. 否則，如果 Bonjour 在區域網路 (LAN) 上找到閘道，提供一鍵「使用此閘道」的選項並將其儲存為直接端點。
3. 否則，如果已設定 tailnet DNS/IP，請嘗試直接連線。
4. 否則，回退到 SSH。

## 配對 + 驗證（直接傳輸）

閘道是節點/客戶端接入的準確來源。

- 配對請求是在閘道中建立/核准/拒絕的（請參閱 [Gateway pairing](/zh-Hant/gateway/pairing)）。
- 閘道強制執行：
  - auth (token / keypair)
  - scopes/ACLs (閘道並非每個方法的原始 proxy)
  - 速率限制

## 各組件的職責

- **Gateway**：廣播 discovery beacons，擁有配對決定權，並託管 WS 端點。
- **macOS app**：協助您選擇閘道，顯示配對提示，並僅將 SSH 作為後備方案。
- **iOS/Android nodes**：瀏覽 Bonjour 以求便利，並連接至已配對的 Gateway WS。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
