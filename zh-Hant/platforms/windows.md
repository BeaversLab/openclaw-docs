---
summary: "Windows (WSL2) 支援 + 伴隨應用程式狀態"
read_when:
  - Installing OpenClaw on Windows
  - Looking for Windows companion app status
title: "Windows (WSL2)"
---

# Windows (WSL2)

建議在 Windows 上透過 **WSL2**（建議使用 Ubuntu）使用 OpenClaw。CLI 和 Gateway 在 Linux 內執行，這能保持執行環境一致，並讓工具相容性大幅提高（Node/Bun/pnpm、Linux 二進位檔、技能）。原生 Windows 可能會比較棘手。WSL2 能提供完整的 Linux 體驗——安裝只需一個指令：`wsl --install`。

原生 Windows 伴隨應用程式已在規劃中。

## 安裝 (WSL2)

- [入門指南](/zh-Hant/start/getting-started) （在 WSL 內使用）
- [安裝與更新](/zh-Hant/install/updating)
- 官方 WSL2 指南 (Microsoft)：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 狀態

原生 Windows CLI 流程正在改進，但 WSL2 仍是建議途徑。

目前在原生 Windows 上運作良好的功能：

- 透過 `install.ps1` 進行網站安裝程式
- 本機 CLI 使用，例如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 嵌入式 local-agent/provider 測試，例如：

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

目前注意事項：

- `openclaw onboard --non-interactive` 仍預期有可連線的本機 gateway，除非您傳遞 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 和 `openclaw gateway install` 會先嘗試 Windows 排定的工作
- 如果建立排定工作被拒絕，OpenClaw 會退回到每個使用者的啟動資料夾登入項目，並立即啟動 gateway
- 如果 `schtasks` 本身卡住或停止回應，OpenClaw 現在會快速中止該途徑並退回，而不是永遠掛起
- 在可用的情況下，仍優先使用排定的工作，因為它們能提供更好的監督狀態

如果您只想要原生 CLI，而不安裝 gateway 服務，請使用以下其中一種：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果您確實想要在原生 Windows 上進行管理的啟動：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果排定工作的建立被封鎖，退回服務模式仍會透過目前使用者的啟動資料夾在登入後自動啟動。

## Gateway

- [Gateway 操作手冊](/zh-Hant/gateway)
- [組態](/zh-Hant/gateway/configuration)

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

出現提示時，選取 **Gateway service**。

修復/遷移：

```
openclaw doctor
```

## 在 Windows 登入前自動啟動 Gateway

對於無人值守設置，請確保完整的啟動鏈即使沒有人登入 Windows 也能運作。

### 1) 在不登入的情況下保持使用者服務運行

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

將 `Ubuntu` 替換為來自此處的您的發行版本名稱：

```powershell
wsl --list --verbose
```

### 驗證啟動鏈

重新啟動後（在 Windows 登入前），從 WSL 檢查：

```bash
systemctl --user is-enabled openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

## 進階：透過 LAN 暴露 WSL 服務 (portproxy)

WSL 擁有自己的虛擬網路。如果另一台機器需要連接到 **WSL 內部** 運行的服務（SSH、本機 TTS 伺服器或 Gateway），您必須將 Windows 連接埠轉發到目前的 WSL IP。WSL IP 會在重啟後改變，因此您可能需要重新整理轉發規則。

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

允許連接埠通過 Windows 防火牆（僅需一次）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

在 WSL 重啟後重新整理 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

備註：

- 從另一台機器進行 SSH 時，目標是 **Windows 主機 IP**（例如：`ssh user@windows-host -p 2222`）。
- 遠端節點必須指向一個 **可連線** 的 Gateway URL（而非 `127.0.0.1`）；使用
  `openclaw status --all` 進行確認。
- 使用 `listenaddress=0.0.0.0` 進行 LAN 存取；`127.0.0.1` 將其保持僅限本機。
- 如果您希望自動執行此操作，請註冊一個「排定的工作」以在登入時執行重新整理步驟。

## 逐步 WSL2 安裝

### 1) 安裝 WSL2 + Ubuntu

開啟 PowerShell (系統管理員)：

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 要求，請重新啟動。

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

### 3) 安裝 OpenClaw（在 WSL 內部）

請在 WSL 內部依照 Linux 入門流程操作：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard
```

完整指南：[Getting Started](/zh-Hant/start/getting-started)

## Windows 伴隨應用程式

我們尚未有 Windows 伴隨應用程式。如果您希望促成此事，歡迎貢獻。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
