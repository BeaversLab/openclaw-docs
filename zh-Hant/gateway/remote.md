---
summary: "使用 SSH tunnel (Gateway WS) 和 tailnets 進行遠端存取"
read_when:
  - 正在執行或對遠端 gateway 設定進行故障排除
title: "Remote Access"
---

# 遠端存取 (SSH、通道與 tailnet)

此程式庫支援「透過 SSH 遠端操作」，做法是在專用主機（桌面/伺服器）上維持單一 Gateway（主控端）運行，並讓客戶端連線至該 Gateway。

- 對於**操作者（您 / macOS 應用程式）**：SSH 通道是通用的備援方案。
- 對於**節點 (iOS/Android 和未來的裝置)**：連線至 Gateway **WebSocket**（視需要使用 LAN/tailnet 或 SSH 通道）。

## 核心概念

- Gateway WebSocket 會綁定至您設定連接埠上的 **loopback**（預設為 18789）。
- 若要進行遠端使用，您可以透過 SSH 轉發該 loopback 連接埠（或是使用 tailnet/VPN 以減少通道的使用）。

## 常見的 VPN/tailnet 設定（Agent 所在位置）

可以將 **Gateway host** 視為「agent 所在的位置」。它擁有 sessions、auth profiles、channels 和 state。
您的筆記型電腦/桌上型電腦（以及 nodes）會連接到該主機。

### 1) 您 tailnet 中隨時運作的 Gateway (VPS 或家用伺服器)

在永久主機上執行 Gateway，並透過 **Tailscale** 或 SSH 存取它。

- **最佳體驗：** 保持 `gateway.bind: "loopback"` 並使用 **Tailscale Serve** 來存取控制 UI。
- **備援方案：** 保持 loopback + 從任何需要存取的機器建立 SSH 通道。
- **範例：** [exe.dev](/zh-Hant/install/exe-dev) (簡易 VM) 或 [Hetzner](/zh-Hant/install/hetzner) (正式環境 VPS)。

當您的筆記型電腦經常進入睡眠狀態，但您希望 Agent 隨時保持運作時，這是最理想的選擇。

### 2) 家用桌面電腦執行 Gateway，筆記型電腦為遠端控制

筆記型電腦**不會**執行 Agent。它會進行遠端連線：

- 使用 macOS 應用程式的 **透過 SSH 遠端操作** 模式（設定 → 一般 → 「OpenClaw 執行位置」）。
- 應用程式會開啟並管理通道，因此 WebChat + 健康檢查會「直接運作」。

操作手冊：[macOS remote access](/zh-Hant/platforms/mac/remote)。

### 3) 筆記型電腦執行 Gateway，從其他機器進行遠端存取

將 Gateway 保留在本地，但安全地將其暴露：

- 從其他機器建立至筆記型電腦的 SSH 通道，或
- 使用 Tailscale Serve 對外提供控制 UI，並將 Gateway 保持在僅限 loopback 存取。

指南：[Tailscale](/zh-Hant/gateway/tailscale) 與 [Web overview](/zh-Hant/web)。

## 指令流程（什麼在哪裡執行）

一個 gateway 服務擁有狀態 + 通道。節點是外設。

流程範例 (Telegram → node)：

- Telegram 訊息到達 **Gateway**。
- Gateway 執行 **agent** 並決定是否呼叫節點工具。
- Gateway 透過 Gateway WebSocket (`node.*` RPC) 呼叫 **node**。
- 節點傳回結果；Gateway 回覆回傳給 Telegram。

備註：

- **Nodes 不執行 gateway service。** 除非您刻意執行獨立的設定檔（請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways)），否則每個主機應該只執行一個 gateway。
- macOS 應用程式的「node mode」只是透過 Gateway WebSocket 運作的節點客戶端。

## SSH tunnel (CLI + tools)

建立通往遠端 Gateway WS 的本地通道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

建立通道後：

- `openclaw health` 和 `openclaw status --deep` 現在可以透過 `ws://127.0.0.1:18789` 存取遠端 gateway。
- 需要時，`openclaw gateway {status,health,send,agent,call}` 也可以透過 `--url` 指向轉發的 URL。

備註：將 `18789` 替換為您設定的 `gateway.port` (或 `--port`/`OPENCLAW_GATEWAY_PORT`)。
備註：當您傳入 `--url` 時，CLI 不會回退到設定檔或環境變數憑證。
請明確包含 `--token` 或 `--password`。缺少明確憑證會導致錯誤。

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

當 gateway 僅限 loopback 時，請將 URL 維持在 `ws://127.0.0.1:18789` 並先開啟 SSH tunnel。

## 認證優先順序

Gateway 憑證解析在 call/probe/status 路徑以及 Discord exec-approval 監控之間遵循一個共用約定。Node-host 使用相同的基底約定，但有一個 local-mode 例外（它會刻意忽略 `gateway.remote.*`）：

- 明確憑證 (`--token`、`--password` 或工具 `gatewayToken`) 在接受明確認證的 call 路徑中一律優先。
- URL 覆寫安全性：
  - CLI URL 覆寫 (`--url`) 永不重複使用隱含的設定/環境變數憑證。
  - 環境變數 URL 覆寫 (`OPENCLAW_GATEWAY_URL`) 只能使用環境變數憑證 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)。
- 本地模式預設值：
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (遠端後備僅在本機 auth token 輸入未設定時套用)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (遠端後備僅在本機 auth password 輸入未設定時套用)
- 遠端模式預設值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- 節點主機 local-mode 例外：`gateway.remote.token` / `gateway.remote.password` 會被忽略。
- 遠端探測/狀態 token 檢查預設為嚴格模式：當目標為遠端模式時，僅使用 `gateway.remote.token` (無本機 token 後備)。
- 舊版 `CLAWDBOT_GATEWAY_*` 環境變數僅供相容性呼叫路徑使用；探測/狀態/認證解析僅使用 `OPENCLAW_GATEWAY_*`。

## 透過 SSH 存取 Chat UI

WebChat 不再使用獨立的 HTTP 連接埠。SwiftUI 聊天 UI 直接連線至 Gateway WebSocket。

- 透過 SSH 轉發 `18789` (見上文)，然後將客戶端連線至 `ws://127.0.0.1:18789`。
- 在 macOS 上，建議優先使用應用程式的「透過 SSH 遠端」模式，該模式會自動管理隧道。

## macOS 應用程式「透過 SSH 遠端」

macOS 選單列應用程式可以端對端驅動相同的設定 (遠端狀態檢查、WebChat 和 Voice Wake 轉發)。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

## 安全性規則 (遠端/VPN)

簡易版：**保持 Gateway 僅限回送**，除非您確定需要綁定 (bind)。

- **回送 + SSH/Tailscale Serve** 是最安全的預設值 (無公開暴露)。
- 明文 `ws://` 預設僅限回送位址。對於受信任的私人網路，
  請在客戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為緊急存取手段。
- **非回送位址綁定** (`lan`/`tailnet`/`custom`，或當回送位址無法使用時的 `auto`) 必須使用 auth token/password。
- `gateway.remote.token` / `.password` 是客戶端憑證來源。它們**不**會自行設定伺服器認證。
- 本機呼叫路徑僅在 `gateway.auth.*` 未設定時，才能使用 `gateway.remote.*` 作為後備。
- 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確配置且無法解析，解析將會失敗（沒有遠端回退掩蔽）。
- 當使用 `wss://` 時，`gateway.remote.tlsFingerprint` 會固定遠端 TLS 憑證。
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 時透過身分標頭驗證 Control UI/WebSocket 流量；HTTP API 端點仍需要權杖/密碼驗證。此無權杖流程假設閘道主機是受信任的。如果您希望在所有地方都使用權杖/密碼，請將其設定為 `false`。
- 將瀏覽器控制視為操作員存取：僅限 tailnet + 刻意的節點配對。

深入探討：[安全性](/zh-Hant/gateway/security)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
