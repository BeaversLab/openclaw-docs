---
summary: "Windows (WSL2) 支援 + 同伴應用程式狀態"
read_when:
  - 在 Windows 上安裝 OpenClaw
  - 尋找 Windows 同伴應用程式狀態
title: "Windows (WSL2)"
---

# Windows (WSL2)

建議在 Windows 上透過 **WSL2** 使用 OpenClaw（建議使用 Ubuntu）。CLI 與 Gateway 在 Linux 內運行，這能保持執行環境一致，並讓工具相容性大幅提升（Node/Bun/pnpm、Linux 二進位檔、Skills）。原生 Windows 可能會比較棘手。WSL2 能提供完整的 Linux 體驗 — 只需一個指令即可安裝：`wsl --install`。

原生 Windows 同伴應用程式已在規劃中。

## 安裝 (WSL2)

- [入門指南](/zh-Hant/start/getting-started) (在 WSL 內使用)
- [安裝與更新](/zh-Hant/install/updating)
- 官方 WSL2 指南 (Microsoft)：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 狀態

原生 Windows CLI 流程正在改善，但 WSL2 仍是推薦的路徑。

目前在原生 Windows 上運作良好的項目：

- 透過 `install.ps1` 進行網站安裝
- 本地 CLI 使用，例如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 嵌入式 local-agent/provider 測試，例如：

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

目前注意事項：

- `openclaw onboard --non-interactive` 仍預期有一個可連線的本地 gateway，除非您傳遞 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 和 `openclaw gateway install` 會先嘗試 Windows 排定的工作
- 如果建立排定的工作被拒絕，OpenClaw 會退回到每個使用者的啟動資料夾登入項目，並立即啟動 gateway
- 如果 `schtasks` 本身卡住或停止回應，OpenClaw 現在會快速中止該路徑並退回，而不是永遠掛起
- 在可用的情況下，仍偏好使用排定的工作，因為它們提供更好的監督者狀態

如果您只想在原生 Windows 上使用 CLI，而不安裝 gateway 服務，請使用其中之一：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果您確實想在原生 Windows 上進行受管理的啟動：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果建立排定的工作被阻擋，退回服務模式仍會透過目前使用者的啟動資料夾在登入後自動啟動。

## Gateway

- [Gateway 操作手冊](/zh-Hant/gateway)
- [設定](/zh-Hant/gateway/configuration)

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

當提示時，選取 **Gateway service**。

修復/遷移：

```
openclaw doctor
```

## Windows 登入前自動啟動閘道

對於無介面設定，請確保即使沒有人登入 Windows，完整的啟動程序也能執行。

### 1) 讓使用者服務在未登入時保持運行

在 WSL 內部：

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) 安裝 OpenClaw 閘道使用者服務

在 WSL 內部：

```bash
openclaw gateway install
```

### 3) 在 Windows 開機時自動啟動 WSL

在 PowerShell (以管理員身分)：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

將 `Ubuntu` 取換為您的發行版本名稱，來源為：

```powershell
wsl --list --verbose
```

### 驗證啟動鏈

重新開機後 (Windows 登入前)，從 WSL 檢查：

```bash
systemctl --user is-enabled openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

## 進階：透過 LAN 存取 WSL 服務

WSL 擁有自己的虛擬網路。如果其他機器需要連接到 **WSL 內部** 執行的服務 (SSH、本機 TTS 伺服器或閘道)，您必須將 Windows 連接埠轉發到目前的 WSL IP。WSL IP 會在重新啟動後改變，因此您可能需要重新整理轉發規則。

範例 (PowerShell **以管理員身分**)：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

允許連接埠通過 Windows 防火牆 (僅需一次)：

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

- 從其他機器進行 SSH 時，目標是 **Windows 主機 IP** (例如：`ssh user@windows-host -p 2222`)。
- 遠端節點必須指向 **可連線** 的閘道 URL (而非 `127.0.0.1`)；使用
  `openclaw status --all` 確認。
- 使用 `listenaddress=0.0.0.0` 進行 LAN 存取；`127.0.0.1` 則僅保留在本機。
- 如果您希望自動執行此操作，請註冊一個「排定的工作」，在登入時執行重新整理步驟。

## WSL2 逐步安裝

### 1) 安裝 WSL2 + Ubuntu

開啟 PowerShell (管理員)：

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 提示，請重新開機。

### 2) 啟用 systemd (安裝閘道所需)

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

### 3) 安裝 OpenClaw (在 WSL 內)

在 WSL 內依照 Linux 快速入門流程操作：

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

我們尚未有 Windows 伴隨應用程式。如果您希望能促成此應用程式，歡迎貢獻。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
