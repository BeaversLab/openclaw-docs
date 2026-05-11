---
summary: "使用 SSH 通道 (Gateway WS) 和 tailnet 進行遠端存取"
read_when:
  - Running or troubleshooting remote gateway setups
title: "Remote access"
---

此程式庫透過在專用主機（桌面/伺服器）上維護單一 Gateway（主控端）並將客戶端連線至它，來支援「透過 SSH 的遠端存取」。

- 對於**操作員（您 / macOS 應用程式）**：SSH 隧道是通用的後備方案。
- 對於**節點（iOS/Android 和未來的裝置）**：連線至 Gateway **WebSocket**（根據需要透過 LAN/tailnet 或 SSH 隧道）。

## 核心概念

- Gateway WebSocket 繫結至您設定連接埠上的 **loopback**（預設為 18789）。
- 若要進行遠端使用，您可以透過 SSH 轉發該 loopback 連接埠（或使用 tailnet/VPN 並減少隧道的使用）。

## 常見的 VPN 和 tailnet 設定

請將 **Gateway 主機**視為代理程式所在之處。它擁有工作階段、身分設定檔、頻道和狀態。您的筆記型電腦、桌上型電腦和節點會連線至該主機。

### 在您的 tailnet 中執行 Always-on Gateway

在持續運作的主機（VPS 或家庭伺服器）上執行 Gateway，並透過 **Tailscale** 或 SSH 存取它。

- **最佳體驗：**保留 `gateway.bind: "loopback"` 並使用 **Tailscale Serve** 作為控制 UI。
- **後備方案：**保留 loopback 加上從任何需要存取的機器進行的 SSH 隧道。
- **範例：** [exe.dev](/zh-Hant/install/exe-dev) （輕鬆 VM）或 [Hetzner](/zh-Hant/install/hetzner) （生產環境 VPS）。

當您的筆記型電腦經常休眠，但您希望代理程式保持 always-on 時，這是最理想的選擇。

### 在家庭桌上型電腦上執行 Gateway

筆記型電腦**不**執行代理程式。它會進行遠端連線：

- 使用 macOS 應用程式的 **透過 SSH 遠端**模式（Settings → General → OpenClaw runs）。
- 應用程式會開啟並管理隧道，因此 WebChat 和健康檢查便能正常運作。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

### 在筆記型電腦上執行 Gateway

將 Gateway 保持在本地，但安全地將其公開：

- 從其他機器建立 SSH 隧道到筆記型電腦，或
- 使用 Tailscale Serve 將控制 UI 公開，並讓 Gateway 僅限 loopback 存取。

指南：[Tailscale](/zh-Hant/gateway/tailscale) 和 [Web 總覽](/zh-Hant/web)。

## 指令流程（什麼在何處執行）

一個 Gateway 服務擁有狀態 + 頻道。節點則是周邊裝置。

流程範例（Telegram → 節點）：

- Telegram 訊息抵達 **Gateway**。
- Gateway 執行 **代理程式** 並決定是否呼叫節點工具。
- Gateway 透過 Gateway WebSocket (`node.*` RPC) 呼叫 **節點**。
- Node 回傳結果；Gateway 將回覆發送回 Telegram。

備註：

- **節點不執行 gateway 服務。** 除非您刻意執行隔離的設定檔（請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways)），否則每台主機應只執行一個 gateway。
- macOS 應用程式的「節點模式」只是透過 Gateway WebSocket 運作的節點客戶端。

## SSH 通道 (CLI + 工具)

建立到遠端 Gateway WS 的本機通道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

通道啟動後：

- `openclaw health` 和 `openclaw status --deep` 現在可以透過 `ws://127.0.0.1:18789` 存取遠端 gateway。
- `openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 在需要時，也可以透過 `--url` 指向轉發的 URL。

<Note>將 `18789` 替換為您設定的 `gateway.port`（或 `--port` 或 `OPENCLAW_GATEWAY_PORT`）。</Note>

<Warning>當您傳遞 `--url` 時，CLI 不會回退至設定檔或環境變數的憑證。請明確包含 `--token` 或 `--password`。缺少明確的憑證將會導致錯誤。</Warning>

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

當 gateway 僅限 loopback 時，請將 URL 維持在 `ws://127.0.0.1:18789` 並先開啟 SSH 通道。
在 macOS 應用程式的 SSH 通道傳輸中，探索到的 gateway 主機名稱應置於
`gateway.remote.sshTarget`；`gateway.remote.url` 則保持為本機通道 URL。

## 憑證優先順序

Gateway 憑證解析在 call/probe/status 路徑以及 Discord 執行批准監控中遵循同一個共享契約。Node-host 使用相同的基底契約，但有一個本機模式例外（它會刻意忽略 `gateway.remote.*`）：

- 明確的憑證（`--token`、`--password` 或工具 `gatewayToken`）在接受明確驗證的呼叫路徑中始終優先。
- URL 覆寫安全性：
  - CLI URL 覆蓋（`--url`）絕不會重用隱含的設定檔/環境變數憑證。
  - Env URL 覆蓋（`OPENCLAW_GATEWAY_URL`）僅能使用環境變數憑證（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本機模式預設值：
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (僅當未設定本地 auth token 輸入時，遠端後備才會生效)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (僅當未設定本地 auth password 輸入時，遠端後備才會生效)
- 遠端模式預設值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host 本地模式例外：`gateway.remote.token` / `gateway.remote.password` 會被忽略。
- 預設情況下，遠端探測/狀態 token 檢查是嚴格的：當目標為遠端模式時，它們僅使用 `gateway.remote.token` (無本地 token 後備)。
- Gateway 環境變數覆蓋僅使用 `OPENCLAW_GATEWAY_*`。

## 透過 SSH 傳輸 Chat UI

WebChat 不再使用單獨的 HTTP 連接埠。SwiftUI 聊天 UI 直接連接到 Gateway WebSocket。

- 透過 SSH 轉發 `18789` (見上方)，然後將客戶端連接到 `ws://127.0.0.1:18789`。
- 在 macOS 上，建議優先使用應用程式的「透過 SSH 遠端」模式，該模式會自動管理通道。

## macOS 應用程式透過 SSH 進行遠端存取

macOS 選單列應用程式可以端到端驅動相同的設定 (遠端狀態檢查、WebChat 和 Voice Wake 轉發)。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

## 安全規則 (遠端/VPN)

簡易版：除非您確定需要綁定，否則 **讓 Gateway 僅限回環 (loopback-only)**。

- **Loopback + SSH/Tailscale Serve** 是最安全的預設選項 (無公開暴露)。
- 純文字 `ws://` 預設僅限 loopback。對於受信任的私人網路，
  在客戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為
  緊急應變措施。沒有 `openclaw.json` 的同等功能；這必須是
  建立 WebSocket 連線的客戶端的程序環境。
- **非 loopback 綁定** (`lan`/`tailnet`/`custom`，或當 loopback 不可用時的 `auto`) 必須使用 gateway 驗證：token、password，或具備 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理。
- `gateway.remote.token` / `.password` 是客戶端憑證來源。它們本身並**不**設定伺服器驗證。
- 本機呼叫路徑僅當 `gateway.auth.*` 未設定時，才能使用 `gateway.remote.*` 作為後備。
- 如果 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確設定但未解析，解析將失敗並關閉 (無遠端後備遮罩)。
- `gateway.remote.tlsFingerprint` 會在使用 `wss://` 時釘選遠端 TLS 憑證。
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 時透過身份標頭驗證 Control UI/WebSocket 流量；HTTP API 端點不使用該 Tailscale 標頭驗證，而是遵循 Gateway 的正常 HTTP 驗證模式。這個無 Token 流程假設 Gateway 主機是受信任的。如果您希望在任何地方都使用共享金鑰驗證，請將其設定為 `false`。
- **Trusted-proxy** 驗證僅適用於非本機回環的身份感知代理設定。同主機的回環反向代理不符合 `gateway.auth.mode: "trusted-proxy"` 的要求。
- 將瀏覽器控制視為操作員存取：僅限 tailnet + 故意的節點配對。

深入探討：[安全性](/zh-Hant/gateway/security)。

### macOS：透過 LaunchAgent 建立持續性 SSH 通道

對於連線到遠端 Gateway 的 macOS 客戶端，最簡單的持久化設定是使用 SSH `LocalForward` 設定條目，再加上 LaunchAgent 以在重新啟動和當機時保持隧道暢通。

#### 步驟 1：新增 SSH 設定

編輯 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

請將 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替換為您的值。

#### 步驟 2：複製 SSH 金鑰（一次性）

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### 步驟 3：設定閘道權杖

將權杖儲存在設定中，以便在重新啟動後仍能持續存在：

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### 步驟 4：建立 LaunchAgent

將此儲存為 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

#### 步驟 5：載入 LaunchAgent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

通道將在登入時自動啟動，當機時重新啟動，並保持轉發連接埠運作。

<Note>如果您有來自較舊設定的殘留 `com.openclaw.ssh-tunnel` LaunchAgent，請將其卸載並刪除。</Note>

#### 疑難排解

檢查通道是否正在運作：

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

重新啟動通道：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

停止通道：

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| 設定項目                             | 作用                                             |
| ------------------------------------ | ------------------------------------------------ |
| `LocalForward 18789 127.0.0.1:18789` | 將本機連接埠 18789 轉發到遠端連接埠 18789        |
| `ssh -N`                             | 在不執行遠端指令的情況下使用 SSH（僅連接埠轉發） |
| `KeepAlive`                          | 如果通道當機，會自動重新啟動                     |
| `RunAtLoad`                          | 當 LaunchAgent 在登入時載入時啟動通道            |

## 相關

- [Tailscale](/zh-Hant/gateway/tailscale)
- [驗證](/zh-Hant/gateway/authentication)
- [遠端 Gateway 設定](/zh-Hant/gateway/remote-gateway-readme)
