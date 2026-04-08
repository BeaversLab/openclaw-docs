---
summary: "Windows 支援：原生與 WSL2 安裝路徑、daemon 以及當前注意事項"
read_when:
  - Installing OpenClaw on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

# Windows

OpenClaw 支援 **原生 Windows** 和 **WSL2**。WSL2 是更穩定的路徑，建議用於完整體驗 — CLI、Gateway 和工具在 Linux 內部執行，具有完全相容性。原生 Windows 適用於核心 CLI 和 Gateway 使用，但有一些注意事項如下所述。

原生 Windows 伴隨應用程式已在規劃中。

## WSL2 (建議)

- [快速入門](/en/start/getting-started) (在 WSL 內使用)
- [安裝與更新](/en/install/updating)
- 官方 WSL2 指南 (Microsoft)：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 狀態

原生 Windows CLI 流程正在改善，但 WSL2 仍然是建議的路徑。

目前原生 Windows 上運作良好的功能：

- 透過 `install.ps1` 進行網站安裝
- 本機 CLI 使用，例如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 嵌入式本機代理程式/提供者測試例如：

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

當前注意事項：

- `openclaw onboard --non-interactive` 仍然預期可連線的本地 gateway，除非您傳遞 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 和 `openclaw gateway install` 會先嘗試 Windows 工作排程器
- 如果工作排程器建立被拒絕，OpenClaw 會退回到個別使用者的啟動資料夾登入項目，並立即啟動 gateway
- 如果 `schtasks` 本身卡住或停止回應，OpenClaw 現在會快速中止該路徑並退回，而不是永遠卡住
- 當可用時，工作排程器仍然是首選，因為它們提供更好的監督者狀態

如果您只想要原生 CLI，而不安裝 gateway 服務，請使用以下其中之一：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果您確實想要原生 Windows 上的管理啟動：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果工作排程器建立被封鎖，退回服務模式仍會透過目前使用者的啟動資料夾在登入後自動啟動。

## Gateway

- [Gateway 手冊](/en/gateway)
- [組態](/en/gateway/configuration)

## Gateway 服務安裝 (CLI)

在 WSL2 內：

```
openclaw onboard --install-daemon
```

或者：

```
openclaw gateway install
```

或者：

```
openclaw configure
```

出現提示時，選擇 **Gateway service**。

修復/遷移：

```
openclaw doctor
```

## Windows 登入前自動啟動 Gateway

對於無介面設置，請確保即使沒有人登入 Windows，完整的啟動鏈也能運行。

### 1) 保持使用者服務在未登入時運行

在 WSL 內部：

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) 安裝 OpenClaw gateway 使用者服務

在 WSL 內部：

```bash
openclaw gateway install
```

### 3) 在 Windows 開機時自動啟動 WSL

以系統管理員身分在 PowerShell 中：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

將 `Ubuntu` 替換為您從以下位置取得的發行版本名稱：

```powershell
wsl --list --verbose
```

### 驗證啟動鏈

重新開機後（在 Windows 登入前），從 WSL 檢查：

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## 進階：透過 LAN 暴露 WSL 服務 (portproxy)

WSL 擁有自己的虛擬網路。如果另一台機器需要連線到在 **WSL 內部** 執行的服務
（SSH、本地 TTS 伺服器或 Gateway），您必須將 Windows 埠轉發到目前的 WSL IP。WSL IP 會在重啟後變更，
因此您可能需要重新整理轉發規則。

範例（以 **系統管理員** 身分執行 PowerShell）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

允許埠通過 Windows 防火牆（一次性）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

WSL 重啟後重新整理 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

備註：

- 從另一台機器進行 SSH 會指向 **Windows 主機 IP**（例如：`ssh user@windows-host -p 2222`）。
- 遠端節點必須指向一個 **可連線** 的 Gateway URL（而不是 `127.0.0.1`）；使用
  `openclaw status --all` 進行確認。
- 使用 `listenaddress=0.0.0.0` 進行 LAN 存取；`127.0.0.1` 僅保留在本地。
- 如果您希望自動執行此操作，請註冊一個排程任務以在登入時執行重新整理
  步驟。

## WSL2 逐步安裝

### 1) 安裝 WSL2 + Ubuntu

開啟 PowerShell (系統管理員)：

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 要求，請重新開機。

### 2) 啟用 systemd（安裝 gateway 所需）

在您的 WSL 終端機中：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然後從 PowerShell：

```powershell
wsl --shutdown
```

重新開啟 Ubuntu，然後驗證：

```bash
systemctl --user status
```

### 3) 安裝 OpenClaw（在 WSL 內）

在 WSL 內按照 Linux 快速入門流程操作：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard
```

完整指南：[快速入門](/en/start/getting-started)

## Windows 伴隨應用程式

我們尚未有 Windows 伴隨應用程式。如果您希望
貢獻使其實現，歡迎提供貢獻。
