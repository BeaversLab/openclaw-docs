---
summary: "使用 SSH 通道（Gateway WS）和 tailnet 進行遠端存取"
read_when:
  - Running or troubleshooting remote gateway setups
title: "遠端存取"
---

# 遠端存取（SSH、通道和 tailnet）

此儲存庫支援「透過 SSH 遠端操作」，方式是在專用主機（桌面/伺服器）上執行單一 Gateway（主控端），並將客戶端連線至該 Gateway。

- 對於**操作員（您 / macOS 應用程式）**：SSH 通道是通用的後備方案。
- 對於**節點（iOS/Android 和未來的裝置）**：連線至 Gateway **WebSocket**（視需要透過 LAN/tailnet 或 SSH 通道）。

## 核心概念

- Gateway WebSocket 會繫結至您設定的連接埠上的 **loopback**（預設為 18789）。
- 若要進行遠端使用，您可以透過 SSH 轉送該 loopback 連接埠（或是使用 tailnet/VPN，減少通道的使用）。

## 常見的 VPN/tailnet 設定（代理程式所在位置）

將 **Gateway 主機** 視為「代理程式駐留的位置」。它擁有工作階段、認證設定檔、通道和狀態。
您的筆記型電腦/桌上型電腦（以及節點）會連接到該主機。

### 1) 您的 tailnet 中（VPS 或家用伺服器）的常駐 Gateway

在永久主機上執行 Gateway，並透過 **Tailscale** 或 SSH 連接它。

- **最佳體驗：** 保留 `gateway.bind: "loopback"` 並使用 **Tailscale Serve** 來存取控制 UI。
- **備案：** 保留 loopback + 從任何需要存取的機器建立 SSH 通道。
- **範例：** [exe.dev](/zh-Hant/install/exe-dev) (簡易 VM) 或 [Hetzner](/zh-Hant/install/hetzner) (生產環境 VPS)。

當您的筆記型電腦經常進入休眠，但您希望代理程式保持運作時，這是最理想的方案。

### 2) 家用桌上型電腦執行 Gateway，筆記型電腦作為遠端控制

筆記型電腦**不**執行代理程式。它會進行遠端連接：

- 使用 macOS 應用程式的 **Remote over SSH** 模式（Settings → General → “OpenClaw runs”）。
- 應用程式會開啟並管理通道，因此 WebChat + 健康檢查「直接可用」。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

### 3) 筆記型電腦執行 Gateway，從其他機器進行遠端存取

將 Gateway 保持在本地，但安全地將其公開：

- 從其他機器 SSH 通道連線到筆記型電腦，或
- 使用 Tailscale Serve 提供 Control UI，並將 Gateway 設定為僅限 loopback。

指南：[Tailscale](/zh-Hant/gateway/tailscale) 和 [Web 概覽](/zh-Hant/web)。

## 指令流程（什麼在哪裡執行）

一個 gateway 服務擁有狀態 + 通道。節點是外圍設備。

流程範例（Telegram → 節點）：

- Telegram 訊息抵達 **Gateway**。
- Gateway 執行 **agent** 並決定是否呼叫節點工具。
- Gateway 透過 Gateway WebSocket (`node.*` RPC) 呼叫 **node**。
- 節點傳回結果；Gateway 回覆至 Telegram。

備註：

- **節點不會運行 gateway service。** 除非您有意執行獨立的設定檔（請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways)），否則每個主機應該只運行一個 gateway。
- macOS 應用程式的「node mode」只是透過 Gateway WebSocket 執行的 node 客戶端。

## SSH tunnel (CLI + tools)

建立通往遠端 Gateway WS 的本地通道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

通道建立後：

- `openclaw health` 和 `openclaw status --deep` 現在透過 `ws://127.0.0.1:18789` 存取遠端 gateway。
- 如有需要，`openclaw gateway {status,health,send,agent,call}` 也可以透過 `--url` 指向轉發的 URL。

注意：將 `18789` 替換為您配置的 `gateway.port`（或 `--port`/`OPENCLAW_GATEWAY_PORT`）。
注意：當您傳遞 `--url` 時，CLI 不會回退到配置或環境憑證。
明確包含 `--token` 或 `--password`。缺少明確的憑證是一個錯誤。

## CLI 遠端預設值

您可以保存一個遠端目標，以便 CLI 指令預設使用它：

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

## 憑證優先順序

Gateway 憑證解析在 call/probe/status 路徑和 Discord 執行核准監控之間遵循一個共享的契約。Node-host 使用相同的基礎契約，但有一個本地模式例外（它會有意忽略 `gateway.remote.*`）：

- 在支援明確驗證的呼叫路徑中，明確憑證（`--token`、`--password` 或工具 `gatewayToken`）始終優先。
- URL 覆蓋安全性：
  - CLI URL 覆蓋（`--url`）絕不會重用隱含的設定檔/環境變數憑證。
  - 環境變數 URL 覆蓋（`OPENCLAW_GATEWAY_URL`）僅可使用環境變數憑證（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式預設值：
  - token：`OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token`（僅當未設定本地驗證 token 輸入時，才套用遠端後備）
  - password：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password`（僅當未設定本地驗證密碼輸入時，才套用遠端後備）
- 遠端模式預設值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- 節點主機本機模式例外：`gateway.remote.token` / `gateway.remote.password` 會被忽略。
- 遠端探測/狀態 token 檢查預設為嚴格模式：當以遠端模式為目標時，它們僅使用 `gateway.remote.token`（不會回退到本機 token）。
- 舊版 `CLAWDBOT_GATEWAY_*` 環境變數僅供相容性呼叫路徑使用；探測/狀態/驗證解析僅使用 `OPENCLAW_GATEWAY_*`。

## 透過 SSH 的聊天 UI

WebChat 不再使用單獨的 HTTP 連接埠。SwiftUI 聊天 UI 直接連接到 Gateway WebSocket。

- 透過 SSH 轉發 `18789`（見上文），然後將客戶端連線至 `ws://127.0.0.1:18789`。
- 在 macOS 上，建議使用應用程式的「Remote over SSH」模式，它會自動管理通道。

## macOS 應用程式「Remote over SSH」

macOS 選單列應用程式可以端對端驅動相同的設定（遠端狀態檢查、WebChat 和 Voice Wake 轉發）。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

## 安全規則（遠端/VPN）

簡單來說：**保持 Gateway 僅限 loopback**，除非您確定需要綁定。

- **Loopback + SSH/Tailscale Serve** 是最安全的預設選項（無公開暴露）。
- 純文字 `ws://` 預設僅限 loopback。對於受信任的私人網路，
  在客戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為緊急措施。
- **非回環綁定**（`lan`/`tailnet`/`custom`，或當無法使用回環時的 `auto`）必須使用驗證令牌/密碼。
- `gateway.remote.token` / `.password` 是客戶端憑證來源。它們**不**會單獨配置伺服器驗證。
- 僅當未設定 `gateway.auth.*` 時，本機呼叫路徑才能將 `gateway.remote.*` 作為後備。
- 如果透過 SecretRef 明確配置了 `gateway.auth.token` / `gateway.auth.password` 但未解析，解析將失敗並關閉（不會有遠端後備遮罩）。
- 使用 `wss://` 時，`gateway.remote.tlsFingerprint` 會鎖定遠端 TLS 憑證。
- **Tailscale Serve** 可以透過識別標頭驗證控制 UI/WebSocket 流量，當 `gateway.auth.allowTailscale: true`；HTTP API 端點仍需令牌/密碼驗證。這個無令牌流程假設閘道主機是受信任的。如果您希望處處都需要令牌/密碼，請將其設為 `false`。
- 將瀏覽器控制視為操作員存取：僅限 tailnet + 刻意節點配對。

深入探討：[安全性](/zh-Hant/gateway/security)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
