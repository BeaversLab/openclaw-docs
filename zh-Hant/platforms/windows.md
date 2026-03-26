---
summary: "Windows 支援：原生與 WSL2 安裝途徑、守護程式，以及目前的注意事項"
read_when:
  - Installing OpenClaw on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

# Windows

OpenClaw 同時支援 **原生 Windows** 和 **WSL2**。WSL2 是較穩定的途徑，建議用於完整體驗 — CLI、Gateway 和工具在 Linux 內部執行，具有完整相容性。原生 Windows 適用於核心 CLI 和 Gateway 使用，但有一些下述注意事項。

原生 Windows 伴隨應用程式正在規劃中。

## WSL2 (推薦)

- [快速入門](/zh-Hant/start/getting-started) (在 WSL 內使用)
- [安裝與更新](/zh-Hant/install/updating)
- 官方 WSL2 指南 (Microsoft)：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 狀態

原生 Windows CLI 流程正在改善，但 WSL2 仍然是推薦的途徑。

目前在原生 Windows 上運作良好的功能：

- 透過 `install.ps1` 安裝網站安裝程式
- 本機 CLI 使用，例如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 嵌入式本地代理程式/提供者測試，例如：

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

目前注意事項：

- `openclaw onboard --non-interactive` 仍然預期一個可連線的本機閘道，除非您傳遞 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 和 `openclaw gateway install` 會先嘗試使用 Windows 排程的工作
- 如果建立排程的工作被拒絕，OpenClaw 會改用每個使用者的啟動資料夾登入項目，並立即啟動閘道
- 如果 `schtasks` 本身卡住或停止回應，OpenClaw 現在會快速中止該路徑並改用備案，而不是永遠掛起
- 如果有的話，排程的工作仍然是首選，因為它們提供更好的監督者狀態

如果您只需要原生 CLI 而不需要安装網關服務，請使用以下其中一種方式：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果您確實需要在原生 Windows 上進行受管理的啟動：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果建立「排定的工作」被阻擋，備用服務模式仍會透過目前使用者的「啟動」資料夾在登入後自動啟動。

## Gateway

- [Gateway runbook](/zh-Hant/gateway)
- [Configuration](/zh-Hant/gateway/configuration)

## Gateway service install (CLI)

在 WSL2 內部：

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

系統提示時選擇 **Gateway service**。

修復/遷移：

```
openclaw doctor
```

## Gateway auto-start before Windows login

對於無外接顯示器的設定，請確保即使沒有人登入 Windows，完整的啟動鏈也能運行。

### 1) Keep user services running without login

在 WSL 內部：

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) Install the OpenClaw gateway user service

在 WSL 內部：

```bash
openclaw gateway install
```

### 3) Start WSL automatically at Windows boot

在以系統管理員身分執行的 PowerShell 中：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

將 `Ubuntu` 替換為您的發行版本名稱，可從以下位置取得：

```powershell
wsl --list --verbose
```

### 驗證啟動鏈

重新啟動後（在 Windows 登入前），請從 WSL 檢查：

```bash
systemctl --user is-enabled openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

## 進階：透過 LAN 暴露 WSL 服務

WSL 擁有自己的虛擬網路。如果另一台機器需要連接到在 **WSL 內部** 執行的服務（SSH、本機 TTS 伺服器或 Gateway），您必須將 Windows 連接埠轉送到目前的 WSL IP。WSL IP 會在重新啟動後變更，因此您可能需要重新整理轉送規則。

範例（PowerShell **以系統管理員身分**）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

在 Windows 防火牆中允許該連接埠（一次性）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

WSL 重新啟動後重新整理 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

備註：

- 從另一台機器進行 SSH 連線時，目標是 **Windows 主機 IP**（例如：`ssh user@windows-host -p 2222`）。
- 遠端節點必須指向 **可連線** 的 Gateway URL（而不是 `127.0.0.1`）；請使用 `openclaw status --all` 進行確認。
- 使用 `listenaddress=0.0.0.0` 進行 LAN 存取；`127.0.0.1` 則僅限本機存取。
- 如果您希望自動完成此操作，請註冊一個「工作排程器」工作以在登入時執行重新整理步驟。

## WSL2 逐步安裝

### 1) 安裝 WSL2 + Ubuntu

開啟 PowerShell (系統管理員)：

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 提示，請重新啟動。

### 2) 啟用 systemd (安裝 gateway 必需)

在您的 WSL 終端機中：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然後在 PowerShell 中執行：

```powershell
wsl --shutdown
```

重新開啟 Ubuntu，然後驗證：

```bash
systemctl --user status
```

### 3) 安裝 OpenClaw (在 WSL 中)

請依照 WSL 內的 Linux 快速入門流程操作：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard
```

完整指南：[快速入門](/zh-Hant/start/getting-started)

## Windows 伴隨應用程式

我們尚未有 Windows 伴隨應用程式。如果您希望透過貢獻來實現它，我們歡迎您的貢獻。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
