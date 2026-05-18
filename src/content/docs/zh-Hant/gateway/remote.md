---
summary: "使用 Gateway WebSocket、SSH 隧道和 tailnets 進行遠端存取"
read_when:
  - Running or troubleshooting remote gateway setups
title: "遠端存取"
---

此儲存庫支援遠端閘道存取，方式是在專用主機（桌面/伺服器）上保持單一 Gateway（主控）運行，並將客戶端連線至該閘道。

- 對於 **操作員（您 / macOS 應用程式）**：當閘道可連線時，直接的 LAN/Tailnet WebSocket 最簡單；SSH 隧道則是通用的備援方案。
- 對於**節點（iOS/Android 和未來的裝置）**：連線至 Gateway **WebSocket**（根據需要透過 LAN/tailnet 或 SSH 隧道）。

## 核心概念

- Gateway WebSocket 通常會綁定到您設定的連接埠上的 **loopback**（預設為 18789）。
- 若要進行遠端使用，請透過 Tailscale Serve 或信任的 LAN/Tailnet 綁定來公開它，或透過 SSH 轉發 loopback 連接埠。

## 常見的 VPN 和 tailnet 設定

請將 **Gateway 主機**視為代理程式所在之處。它擁有工作階段、身分設定檔、頻道和狀態。您的筆記型電腦、桌上型電腦和節點會連線至該主機。

### 在您的 tailnet 中執行 Always-on Gateway

在持續運作的主機（VPS 或家庭伺服器）上執行 Gateway，並透過 **Tailscale** 或 SSH 存取它。

- **最佳體驗：** 保持 `gateway.bind: "loopback"` 並為控制介面使用 **Tailscale Serve**。
- **信任的 LAN/Tailnet：** 將閘道綁定到私有介面，並直接使用 `gateway.remote.transport: "direct"` 連線。
- **備援方案：** 保持 loopback 並從任何需要存取的機器進行 SSH 隧道連線。
- **範例：** [exe.dev](/zh-Hant/install/exe-dev) (簡易 VM) 或 [Hetzner](/zh-Hant/install/hetzner) (生產環境 VPS)。

當您的筆記型電腦經常進入睡眠狀態，但您希望代理程式保持運作時，這是最理想的方案。

### 家用桌面電腦執行 Gateway

筆記型電腦 **不** 執行 agent。它會遠端連線：

- 使用 macOS 應用程式的遠端模式（Settings → General → OpenClaw runs）。
- 當閘道可透過 LAN/Tailnet 存取時，應用程式會直接連線；當您選擇 SSH 時，則會開啟並管理 SSH 隧道。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

### 筆記型電腦執行 Gateway

將 Gateway 保留在本地，但安全地加以公開：

- 從其他機器建立到筆記型電腦的 SSH 通道，或
- 使用 Tailscale Serve 針對控制 UI，並將 Gateway 保持為僅限 loopback。

指南：[Tailscale](/zh-Hant/gateway/tailscale) 與 [Web 概覽](/zh-Hant/web)。

## 指令流程 (什麼在哪裡執行)

一個閘道服務擁有狀態和通道。節點是外圍設備。

流程範例（Telegram → 節點）：

- Telegram 訊息抵達 **Gateway**。
- Gateway 執行 **agent** 並決定是否呼叫節點工具。
- Gateway 透過 Gateway WebSocket (`node.*` RPC) 呼叫 **節點**。
- 節點傳回結果；Gateway 回覆至 Telegram。

備註：

- **節點不執行 gateway service。** 除非您有意執行獨立的設定檔（請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways)），否則每台主機應僅執行一個 gateway。
- macOS 應用程式的「節點模式」只是一個透過 Gateway WebSocket 連線的節點客戶端。

## SSH 隧道 (CLI + 工具)

建立通往遠端 Gateway WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

啟用隧道後：

- `openclaw health` 和 `openclaw status --deep` 現在透過 `ws://127.0.0.1:18789` 到達遠端閘道。
- 如有需要，`openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 也可以透過 `--url` 指向轉發的 URL。

<Note>請將 `18789` 替換為您設定的 `gateway.port`（或 `--port` 或 `OPENCLAW_GATEWAY_PORT`）。</Note>

<Warning>當您傳入 `--url` 時，CLI 不會回退到組態或環境憑證。請明確包含 `--token` 或 `--password`。缺少明確憑證會導致錯誤。</Warning>

## CLI 遠端預設值

您可以持續儲存一個遠端目標，讓 CLI 指令預設使用它：

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

當 Gateway 僅限回環存取時，請將 URL 保持在 `ws://127.0.0.1:18789` 並先開啟 SSH 隧道。
在 macOS 應用程式的 SSH 隧道傳輸中，探索到的 Gateway 主機名稱應屬於
`gateway.remote.sshTarget`；`gateway.remote.url` 則保持為本機隧道 URL。
如果這些連接埠不同，請將 `gateway.remote.remotePort` 設定為 SSH 主機上的 Gateway 連接埠。

對於已可在信任的 LAN 或 Tailnet 上存取的 Gateway，請使用直接模式：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      transport: "direct",
      url: "ws://192.168.0.202:18789",
      token: "your-token",
    },
  },
}
```

## 憑證優先順序

Gateway 憑證解析在 call/probe/status 路徑和 Discord 執行核准監控之間遵循一個共用的契約。Node-host 使用相同的基礎契約，但有一個本機模式例外（它會刻意忽略 `gateway.remote.*`）：

- 明確憑證（`--token`、`--password` 或工具 `gatewayToken`）在接受明確驗證的呼叫路徑中始終優先。
- URL 覆寫安全性：
  - CLI URL 覆寫（`--url`）絕不重用隱含的組態/環境憑證。
  - 環境 URL 覆寫（`OPENCLAW_GATEWAY_URL`）僅可使用環境憑證（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本機模式預設值：
  - token：`OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token`（遠端回退僅在本機驗證 token 輸入未設定時套用）
  - 密碼：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` （僅當未設定本地驗證密碼輸入時，才套用遠端後備機制）
- 遠端模式預設值：
  - 權杖：`gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - 密碼：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- 節點主機本地模式例外：`gateway.remote.token` / `gateway.remote.password` 會被忽略。
- 遠端探測/狀態權杖檢查預設為嚴格模式：當目標為遠端模式時，僅使用 `gateway.remote.token` （不後備至本地權杖）。
- Gateway 環境變數覆寫僅使用 `OPENCLAW_GATEWAY_*`。

## Chat UI 遠端存取

WebChat 不再使用單獨的 HTTP 連接埠。SwiftUI 聊天 UI 直接連線到 Gateway WebSocket。

- 透過 SSH 轉發 `18789` （見上方），然後將用戶端連線到 `ws://127.0.0.1:18789`。
- 對於 LAN/Tailnet 直接模式，將用戶端連線至已設定的私密 `ws://` 或安全 `wss://` URL。
- 在 macOS 上，建議優先使用應用程式的遠端模式，該模式會自動管理選定的傳輸方式。

## macOS 應用程式遠端模式

macOS 選單列應用程式可以端到端地驅動相同的設定（遠端狀態檢查、WebChat 和 Voice Wake 轉發）。

操作手冊：[macOS 遠端存取](/zh-Hant/platforms/mac/remote)。

## 安全性規則（遠端/VPN）

簡單來說：**保持 Gateway 僅限回環（loopback-only）**，除非您確定需要綁定（bind）。

- **回環 + SSH/Tailscale Serve** 是最安全的預設設定（無公網暴露）。
- 對於回環、LAN、連結本機、`.local`、`.ts.net` 和 Tailscale CGNAT 主機，會接受純文字 `ws://`。公網遠端主機必須使用 `wss://`。
- **非回環綁定**（`lan`/`tailnet`/`custom`，或當回環不可用時的 `auto`）必須使用 gateway 驗證：權杖、密碼，或具備 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理伺服器。
- `gateway.remote.token` / `.password` 是客戶端憑證來源。它們**不會**單獨設定伺服器驗證。
- 僅當未設定 `gateway.auth.*` 時，本機呼叫路徑才能將 `gateway.remote.*` 作為後備方案。
- 如果透過 SecretRef 明確設定了 `gateway.auth.token` / `gateway.auth.password` 且未解析，解析將以封閉方式失敗（無遠端後備遮罩）。
- 當使用 `wss://` 時（包括 macOS 直接模式），`gateway.remote.tlsFingerprint` 會鎖定遠端 TLS 憑證。如果沒有設定或先前儲存的鎖定值，macOS 只會在正常系統信任通過後鎖定首次使用的憑證；macOS 尚不信任的自簽或私有 CA 閘道需要明確的指紋或透過 SSH 的 Remote 存取。
- 當 `gateway.auth.allowTailscale: true` 時，**Tailscale Serve** 可以透過身分標頭對 Control UI/WebSocket 流量進行驗證；HTTP API 端點不會使用該 Tailscale 標頭驗證，而是遵循閘道的正常 HTTP 驗證模式。此無權杖流程假設閘道主機是受信任的。如果您希望在任何地方都使用共用金鑰驗證，請將其設定為 `false`。
- **Trusted-proxy** 驗證預設期望非迴路的身分感知 Proxy 設定。同主機迴路反向 Proxy 需要明確的 `gateway.auth.trustedProxy.allowLoopback = true`。
- 將瀏覽器控制視為操作員存取：僅限 tailnet + 刻意的節點配對。

深入瞭解：[安全性](/zh-Hant/gateway/security)。

### macOS：透過 LaunchAgent 建立持續的 SSH 通道

對於連線到遠端閘道的 macOS 客戶端，最簡單的持久設定是使用 SSH `LocalForward` 設定項目加上 LaunchAgent，以在重新啟動和當機時保持通道暢通。

#### 步驟 1：新增 SSH 設定

編輯 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

將 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替換為您的值。

#### 步驟 2：複製 SSH 金鑰（一次性）

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### 步驟 3：設定閘道權杖

將權杖儲存在設定中，以便在重新啟動後持續存在：

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

通道將在登入時自動啟動，當機時重新啟動，並保持轉送連接埠暢通。

<Note>如果您有舊設置殘留的 `com.openclaw.ssh-tunnel` LaunchAgent，請將其卸載並刪除。</Note>

#### 疑難排解

檢查通道是否正在運行：

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

| 配置條目                             | 作用                                      |
| ------------------------------------ | ----------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | 將本地連接埠 18789 轉發到遠端連接埠 18789 |
| `ssh -N`                             | SSH 不執行遠端指令（僅連接埠轉發）        |
| `KeepAlive`                          | 如果通道崩潰則自動重新啟動                |
| `RunAtLoad`                          | 當 LaunchAgent 在登入時加載後啟動通道     |

## 相關

- [Tailscale](/zh-Hant/gateway/tailscale)
- [驗證](/zh-Hant/gateway/authentication)
- [遠端閘道設置](/zh-Hant/gateway/remote-gateway-readme)
