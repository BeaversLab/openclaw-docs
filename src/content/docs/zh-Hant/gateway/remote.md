---
summary: "使用 SSH 通道 (Gateway WS) 和 tailnet 進行遠端存取"
read_when:
  - Running or troubleshooting remote gateway setups
title: "遠端存取"
---

# 遠端存取 (SSH、通道與 tailnet)

此儲存庫透過在專用主機 (桌面/伺服器) 上保持單一 Gateway (master) 執行並將客戶端連線至它，來支援「透過 SSH 遠端」功能。

- 對於 **操作員 (您 / macOS 應用程式)**：SSH 通道傳輸是通用的備用方案。
- 對於 **節點 (iOS/Android 和未來的裝置)**：連線至 Gateway **WebSocket** (根據需要使用 LAN/tailnet 或 SSH 通道)。

## 核心概念

- Gateway WebSocket 繫結至您設定連接埠上的 **loopback** (預設為 18789)。
- 若要進行遠端使用，您可以透過 SSH 轉發該 loopback 連接埠 (或使用 tailnet/VPN 以減少通道傳輸)。

## 常見的 VPN/tailnet 設定 (agent 所在的位置)

將 **Gateway 主機** 視為「agent 所在的位置」。它擁有工作階段、驗證設定檔、通道和狀態。
您的筆記型電腦/桌面電腦 (和節點) 會連線至該主機。

### 1) 您 tailnet 中常時開啟的 Gateway (VPS 或家庭伺服器)

在永久主機上執行 Gateway，並透過 **Tailscale** 或 SSH 存取它。

- **最佳體驗：** 保持 `gateway.bind: "loopback"` 並使用 **Tailscale Serve** 作為控制 UI。
- **備用方案：** 保持 loopback + 從任何需要存取的機器進行 SSH 通道傳輸。
- **範例：** [exe.dev](/en/install/exe-dev) (簡易 VM) 或 [Hetzner](/en/install/hetzner) (生產環境 VPS)。

當您的筆記型電腦經常進入睡眠狀態，但您希望 agent 常時開啟時，這是理想的選擇。

### 2) 家庭桌面電腦執行 Gateway，筆記型電腦作為遠端控制

筆記型電腦 **不** 執行 agent。它會遠端連線：

- 使用 macOS 應用程式的 **透過 SSH 遠端** 模式 (設定 → 一般 → 「OpenClaw runs」)。
- 應用程式會開啟並管理通道，因此 WebChat + 健康檢查「即可運作」。

操作手冊：[macOS 遠端存取](/en/platforms/mac/remote)。

### 3) 筆記型電腦執行 Gateway，從其他機器進行遠端存取

將 Gateway 保留在本地，但安全地加以公開：

- 從其他機器建立到筆記型電腦的 SSH 通道，或
- 使用 Tailscale Serve 針對控制 UI，並將 Gateway 保持為僅限 loopback。

指南：[Tailscale](/en/gateway/tailscale) 和 [Web 概覽](/en/web)。

## 指令流程 (什麼在哪裡執行)

一個閘道服務擁有狀態和通道。節點是外圍設備。

流程範例（Telegram → 節點）：

- Telegram 訊息抵達 **Gateway**。
- Gateway 執行 **agent** 並決定是否呼叫節點工具。
- Gateway 透過 Gateway WebSocket (`node.*` RPC) 呼叫 **節點**。
- 節點傳回結果；Gateway 回覆至 Telegram。

備註：

- **節點不會執行 gateway 服務。** 除非您刻意執行獨立的設定檔 (請參閱 [Multiple gateways](/en/gateway/multiple-gateways))，否則每個主機應該只執行一個 gateway。
- macOS 應用程式的「節點模式」只是一個透過 Gateway WebSocket 的節點客戶端。

## SSH 隧道 (CLI + 工具)

建立通往遠端 Gateway WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

啟用隧道後：

- `openclaw health` 和 `openclaw status --deep` 現在透過 `ws://127.0.0.1:18789` 到達遠端 gateway。
- 如有需要，`openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 也可以透過 `--url` 指向轉發的 URL。

注意：請將 `18789` 取換為您設定的 `gateway.port` (或 `--port`/`OPENCLAW_GATEWAY_PORT`)。
注意：當您傳遞 `--url` 時，CLI 不會退回使用設定檔或環境變數憑證。
明確包含 `--token` 或 `--password`。缺少明確憑證是一種錯誤。

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

當 gateway 僅限 loopback 時，請將 URL 保持在 `ws://127.0.0.1:18789` 並先開啟 SSH 通道。

## 憑證優先順序

Gateway 憑證解析在 call/probe/status 路徑和 Discord 執行核准監控中遵循一個共用契約。節點主機使用相同的基底契約，但有一個本地模式例外 (它會刻意忽略 `gateway.remote.*`)：

- 明確憑證 (`--token`、`--password` 或工具 `gatewayToken`) 在接受明確認證的呼叫路徑中始終優先。
- URL 覆寫安全性：
  - CLI URL 覆蓋 (`--url`) 絕不會重複使用隱含的設定檔/環境變數憑證。
  - Env URL 覆蓋 (`OPENCLAW_GATEWAY_URL`) 只能使用環境變數憑證 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)。
- 本機模式預設值：
  - token：`OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (遠端後援僅在未設定本地認證 token 輸入時套用)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` （遠端後備僅在本機驗證密碼輸入未設定時套用）
- 遠端模式預設值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host 本機模式例外：`gateway.remote.token` / `gateway.remote.password` 會被忽略。
- 遠端探針/狀態 token 檢查預設為嚴格模式：當以遠端模式為目標時，僅使用 `gateway.remote.token`（無本機 token 後備）。
- Gateway 環境變數覆寫僅使用 `OPENCLAW_GATEWAY_*`。

## 透過 SSH 傳輸 Chat UI

WebChat 不再使用單獨的 HTTP 連接埠。SwiftUI 聊天 UI 直接連接到 Gateway WebSocket。

- 透過 SSH 轉發 `18789`（見上文），然後將客戶端連線至 `ws://127.0.0.1:18789`。
- 在 macOS 上，建議優先使用應用程式的「透過 SSH 遠端」模式，該模式會自動管理通道。

## macOS 應用程式「透過 SSH 遠端」

macOS 選單列應用程式可以端到端驅動相同的設定 (遠端狀態檢查、WebChat 和 Voice Wake 轉發)。

手冊：[macOS 遠端存取](/en/platforms/mac/remote)。

## 安全規則 (遠端/VPN)

簡易版：除非您確定需要綁定，否則 **讓 Gateway 僅限回環 (loopback-only)**。

- **Loopback + SSH/Tailscale Serve** 是最安全的預設選項 (無公開暴露)。
- 純文字 `ws://` 預設僅限回環 (loopback)。對於受信任的私人網路，
  在客戶端程序上設定 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作為緊急手段 (break-glass)。
- **非回環綁定**（`lan`/`tailnet`/`custom`，或當無法使用回環時的 `auto`）必須使用 gateway 驗證：token、密碼，或是具備身分感知能力的反向代理並搭配 `gateway.auth.mode: "trusted-proxy"`。
- `gateway.remote.token` / `.password` 是客戶端憑證來源。它們**不**會單獨設定伺服器驗證。
- 本機呼叫路徑僅當 `gateway.auth.*` 未設定時，才能使用 `gateway.remote.*` 作為後備。
- 如果 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確設定且未解析，解析將會以失敗封閉（無遠端後備遮罩）。
- `gateway.remote.tlsFingerprint` 會在使用 `wss://` 時釘選遠端 TLS 憑證。
- 當 `gateway.auth.allowTailscale: true` 時，**Tailscale Serve** 可以透過身分標頭驗證 Control UI/WebSocket 流量；HTTP API 端點不使用該 Tailscale 標頭驗證，而是遵循閘道的正常 HTTP 驗證模式。此無權杖流程假設閘道主機是受信任的。如果您希望到處都使用共用的金鑰驗證，請將其設定為 `false`。
- **Trusted-proxy** 驗證僅適用於非本機迴路的身分感知 Proxy 設定。同主機的本機迴路反向 Proxy 不滿足 `gateway.auth.mode: "trusted-proxy"`。
- 將瀏覽器控制視為操作員存取：僅限 tailnet + 故意的節點配對。

深入探討：[安全性](/en/gateway/security)。

### macOS：透過 LaunchAgent 建立持續性 SSH 通道

對於連接到遠端閘道的 macOS 用戶端，最簡單的持續性設定是使用 SSH `LocalForward` 設定項目加上 LaunchAgent，以在重新啟動和當機時保持通道運作。

#### 步驟 1：新增 SSH 設定

編輯 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

將 `<REMOTE_IP>` 和 `<REMOTE_USER>` 取換為您的值。

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

注意：如果您有來自較舊設定的殘留 `com.openclaw.ssh-tunnel` LaunchAgent，請將其卸載並刪除。

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
