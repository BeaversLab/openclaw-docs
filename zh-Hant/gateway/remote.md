---
summary: "使用 SSH 通道 (Gateway WS) 和 tailnet 進行遠端存取"
read_when:
  - Running or troubleshooting remote gateway setups
title: "遠端存取"
---

# 遠端存取 (SSH、通道與 tailnet)

此程式庫支援「透過 SSH 遠端操作」，做法是在專用主機（桌面/伺服器）上維持單一 Gateway（主控端）運行，並讓客戶端連線至該 Gateway。

- 對於**操作者（您 / macOS 應用程式）**：SSH 通道是通用的備援方案。
- 對於**節點 (iOS/Android 和未來的裝置)**：連線至 Gateway **WebSocket**（視需要使用 LAN/tailnet 或 SSH 通道）。

## 核心概念

- Gateway WebSocket 會綁定至您設定連接埠上的 **loopback**（預設為 18789）。
- 若要進行遠端使用，您可以透過 SSH 轉發該 loopback 連接埠（或是使用 tailnet/VPN 以減少通道的使用）。

## 常見的 VPN/tailnet 設定（Agent 所在位置）

請將 **Gateway 主機** 視為「Agent 所在的位置」。它擁有工作階段、認證設定檔、通道和狀態。
您的筆記型電腦/桌上型電腦（以及節點）會連線至該主機。

### 1) 您 tailnet 中隨時運作的 Gateway (VPS 或家用伺服器)

在永久主機上執行 Gateway，並透過 **Tailscale** 或 SSH 存取它。

- **最佳使用者體驗：** 保持 `gateway.bind: "loopback"` 並對控制 UI 使用 **Tailscale Serve**。
- **備援方案：** 保持 loopback + 從任何需要存取的機器建立 SSH 通道。
- **範例：** [exe.dev](/zh-Hant/install/exe-dev) (輕鬆建置 VM) 或 [Hetzner](/zh-Hant/install/hetzner) (生產環境 VPS)。

當您的筆記型電腦經常進入睡眠狀態，但您希望 Agent 隨時保持運作時，這是最理想的選擇。

### 2) 家用桌面電腦執行 Gateway，筆記型電腦為遠端控制

筆記型電腦**不會**執行 Agent。它會進行遠端連線：

- 使用 macOS 應用程式的 **透過 SSH 遠端操作** 模式（設定 → 一般 → 「OpenClaw 執行位置」）。
- 應用程式會開啟並管理通道，因此 WebChat + 健康檢查會「直接運作」。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

### 3) 筆記型電腦執行 Gateway，從其他機器進行遠端存取

將 Gateway 保留在本地，但安全地將其暴露：

- 從其他機器建立至筆記型電腦的 SSH 通道，或
- 使用 Tailscale Serve 對外提供控制 UI，並將 Gateway 保持在僅限 loopback 存取。

指南：[Tailscale](/zh-Hant/gateway/tailscale) 與 [Web 概覽](/zh-Hant/web)。

## 指令流程（什麼在哪裡執行）

一個 gateway 服務擁有狀態 + 通道。節點是外設。

流程範例 (Telegram → node)：

- Telegram 訊息到達 **Gateway**。
- Gateway 執行 **agent** 並決定是否呼叫節點工具。
- Gateway 透過 Gateway WebSocket (`node.*` RPC) 呼叫 **node**。
- 節點傳回結果；Gateway 回覆回傳給 Telegram。

備註：

- **節點不執行 gateway 服務。** 除非您故意執行獨立的設定檔 (profile)，否則每台主機應只執行一個 gateway (請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways))。
- macOS 應用程式的「node mode」只是透過 Gateway WebSocket 運作的節點客戶端。

## SSH tunnel (CLI + tools)

建立通往遠端 Gateway WS 的本地通道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

建立通道後：

- `openclaw health` 和 `openclaw status --deep` 現在透過 `ws://127.0.0.1:18789` 存取遠端 gateway。
- 必要時，`openclaw gateway {status,health,send,agent,call}` 也可以透過 `--url` 指向轉發的 URL。

備註：將 `18789` 替換為您設定的 `gateway.port` (或 `--port`/`OPENCLAW_GATEWAY_PORT`)。
備註：當您傳遞 `--url` 時，CLI 不會回退至設定或環境變數的認證資訊。
明確包含 `--token` 或 `--password`。缺少明確的認證資訊會造成錯誤。

## CLI 遠端預設值

您可以保留遠端目標，讓 CLI 指令預設使用它：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token",
    },
  },
}
```

當 gateway 僅限 loopback 時，請將 URL 保持在 `ws://127.0.0.1:18789` 並先開啟 SSH tunnel。

## 認證優先順序

Gateway 認證解析在 call/probe/status 路徑和 Discord 執行核准監控之間遵循一個共同的合約。Node-host 使用相同的基礎合約，但有一個本地模式的例外 (它會故意忽略 `gateway.remote.*`)：

- 明確的認證資訊 (`--token`、`--password` 或工具 `gatewayToken`) 在接受明確驗證的呼叫路徑中永遠優先。
- URL 覆寫安全性：
  - CLI URL 覆寫 (`--url`) 絕不會重用隱含的 config/env 認證資訊。
  - 環境 URL 覆蓋 (`OPENCLAW_GATEWAY_URL`) 可能僅使用環境憑證 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)。
- 本地模式預設值：
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (僅在未設定本機 auth token 輸入時套用遠端後援)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (僅在未設定本機 auth password 輸入時套用遠端後援)
- 遠端模式預設值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host 本地模式例外：`gateway.remote.token` / `gateway.remote.password` 會被忽略。
- 遠端探查/狀態 token 檢查預設為嚴格模式：當以遠端模式為目標時，僅使用 `gateway.remote.token` (無本機 token 後援)。
- 舊版 `CLAWDBOT_GATEWAY_*` 環境變數僅供相容性呼叫路徑使用；探查/狀態/認證解析僅使用 `OPENCLAW_GATEWAY_*`。

## 透過 SSH 存取 Chat UI

WebChat 不再使用獨立的 HTTP 連接埠。SwiftUI 聊天 UI 直接連線至 Gateway WebSocket。

- 透過 SSH 轉發 `18789` (見上文)，然後將用戶端連線至 `ws://127.0.0.1:18789`。
- 在 macOS 上，建議優先使用應用程式的「透過 SSH 遠端」模式，該模式會自動管理隧道。

## macOS 應用程式「透過 SSH 遠端」

macOS 選單列應用程式可以端對端驅動相同的設定 (遠端狀態檢查、WebChat 和 Voice Wake 轉發)。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

## 安全性規則 (遠端/VPN)

簡易版：**保持 Gateway 僅限回送**，除非您確定需要綁定 (bind)。

- **回送 + SSH/Tailscale Serve** 是最安全的預設值 (無公開暴露)。
- 純文字 `ws://` 預設為僅限回送。對於受信任的私人網路，
  在用戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為緊急應變措施。
- **非回環綁定**（`lan`/`tailnet`/`custom`，或當無法使用回環時的 `auto`）必須使用認證令牌/密碼。
- `gateway.remote.token` / `.password` 是客戶端憑證來源。它們本身**不會**配置伺服器認證。
- 僅當 `gateway.auth.*` 未設定時，本機呼叫路徑才能將 `gateway.remote.*` 作為後備選項。
- 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確配置但未解析，則解析會失敗並關閉（沒有遠端後備遮罩）。
- 當使用 `wss://` 時，`gateway.remote.tlsFingerprint` 會鎖定遠端 TLS 憑證。
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 時透過身份標頭對 Control UI/WebSocket 流量進行認證；HTTP API 端點仍需令牌/密碼認證。此無令牌流程假設閘道主機是受信任的。如果您希望任何地方都使用令牌/密碼，請將其設定為 `false`。
- 將瀏覽器控制視為操作員存取：僅限 tailnet + 刻意的節點配對。

深入探討：[安全性](/zh-Hant/gateway/security)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
