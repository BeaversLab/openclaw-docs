---
summary: "Windows 支援：原生與 WSL2 安裝路徑、daemon 以及目前的注意事項"
read_when:
  - Installing OpenClaw on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

OpenClaw 同時支援 **原生 Windows** 和 **WSL2**。WSL2 是較穩定的路徑，且為獲得完整體驗的推薦選項 — CLI、Gateway 和工具均在 Linux 內執行，具備完整相容性。原生 Windows 適用於核心 CLI 和 Gateway 使用，但有一些下方註明的注意事項。

原生 Windows 的伴隨應用程式已列在計畫中。

## WSL2 (推薦)

- [入門指南](/zh-Hant/start/getting-started) （在 WSL 內使用）
- [安裝與更新](/zh-Hant/install/updating)
- 官方 WSL2 指南： [https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 狀態

原生 Windows CLI 流程正在改善中，但 WSL2 仍然是推薦的路徑。

目前在原生 Windows 上運作良好的項目：

- 透過 `install.ps1` 從網站安裝
- 本機 CLI 使用，例如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 嵌入式本機代理/提供者測試，例如：

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

目前的注意事項：

- `openclaw onboard --non-interactive` 仍然預期有一個可連線的本機 gateway，除非您傳遞 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 和 `openclaw gateway install` 會先嘗試 Windows 排程的工作
- 如果建立排定的工作被拒絕，OpenClaw 會改用每個使用者的啟動資料夾登入項目，並立即啟動 gateway
- 如果 `schtasks` 本身卡住或停止回應，OpenClaw 現在會快速中止該路徑並改為後備，而不是永遠掛起
- 當可使用時，排定的工作仍然較受偏好，因為它們能提供更好的監督者狀態

如果您只想要原生 CLI，而不安裝 gateway 服務，請使用下列其中一項：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果您確實想要在原生 Windows 上進行管理的啟動：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果建立排定的工作被封鎖，備用服務模式仍會透過目前使用者的啟動資料夾在登入後自動啟動。

## Gateway

- [Gateway 手冊](/zh-Hant/gateway)
- [設定](/zh-Hant/gateway/configuration)

## Gateway 服務安裝 (CLI)

在 WSL2 內：

```
openclaw onboard --install-daemon
```

或：

```
openclaw gateway install
```

或者：

```
openclaw configure
```

當系統提示時，選取 **Gateway 服務**。

修復/遷移：

```
openclaw doctor
```

## Gateway 在 Windows 登入前自動啟動

對於無頭式 (headless) 設定，請確保完整的啟動鏈即使沒有人登入 Windows 也會執行。

### 1) 保持使用者服務在未登入時執行

在 WSL 內：

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) 安裝 OpenClaw gateway 使用者服務

在 WSL 中：

```bash
openclaw gateway install
```

### 3) 在 Windows 啟動時自動啟動 WSL

在系統管理員身分的 PowerShell 中：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

將 `Ubuntu` 替換為您從以下位置取得的發行版本名稱：

```powershell
wsl --list --verbose
```

### 驗證啟動鏈

重新啟動後（在 Windows 登入前），從 WSL 檢查：

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## 進階：透過 LAN (portproxy) 對外暴露 WSL 服務

WSL 擁有自己的虛擬網路。如果另一台機器需要連接到運作於 **WSL 內部** 的服務
（SSH、本地 TTS 伺服器或 Gateway），您必須
將 Windows 連接埠轉發到目前的 WSL IP。WSL IP 會在重新啟動後改變，
因此您可能需要重新整理轉發規則。

範例（以**系統管理員**身分執行 PowerShell）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

在 Windows 防火牆中允許該連接埠（僅需一次）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

在 WSL 重新啟動後重新整理 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

備註：

- 從另一台機器進行 SSH 以 **Windows 主機 IP** 為目標（例如：`ssh user@windows-host -p 2222`）。
- 遠端節點必須指向一個**可連線** 的 Gateway URL（而不是 `127.0.0.1`）；請使用
  `openclaw status --all` 進行確認。
- 使用 `listenaddress=0.0.0.0` 進行區域網路存取；`127.0.0.1` 則僅限本機使用。
- 如果您希望自動完成此操作，請註冊一個排定的工作，以便在登�入時執行重新整理步驟。

## WSL2 逐步安裝

### 1) 安裝 WSL2 + Ubuntu

開啟 PowerShell（系統管理員）：

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

然後從 PowerShell 執行：

```powershell
wsl --shutdown
```

重新開啟 Ubuntu，然後驗證：

```bash
systemctl --user status
```

### 3) 安裝 OpenClaw（在 WSL 中）

若要在 WSL 中進行一般的首次設定，請依照 Linux 入門流程操作：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build
pnpm openclaw onboard --install-daemon
```

如果您是從原始碼進行開發，而不是進行初次入門，請使用
[設定](/zh-Hant/start/setup) 中的原始碼開發迴圈：

```bash
pnpm install
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

完整指南：[入門指南](/zh-Hant/start/getting-started)

## Windows 伴隨應用程式

我們尚未有 Windows 伴隨應用程式。如果您想協助實現，歡迎貢獻。

## Git 和 GitHub 連線（貢獻者）

部分網路會封鎖或限制連往 GitHub 的 HTTPS。如果 `git clone` 因逾時
或連線重設而失敗，請嘗試其他網路、VPN，或您的組織提供的 HTTP/HTTPS 代理伺服器。

如果 `gh auth login` 在瀏覽器裝置流程期間失敗（例如連線到 `github.com:443` 時逾時），請改用個人存取權杖進行驗證：

1. 建立一個至少具有 `repo` 範圍（經典 PAT）或同等
   細粒度存取權限的 Token。
2. 在目前工作階段的 PowerShell 中：

```powershell
$env:GH_TOKEN="<your-token>"
gh auth status
gh auth setup-git
```

3. 如果 `gh auth status` 警告缺少 `read:org`，請建立一個包含
   該範圍的 Token 並重新指派變數：

```powershell
$env:GH_TOKEN="<your-token-with-repo-and-read:org>"
gh auth status
```

`gh auth refresh -s read:org` 僅適用於當您透過 `gh auth login` 進行驗證
並儲存了用於重新整理的憑證時（不適用於使用 `GH_TOKEN` 時）。

切勿提交 Token 或將其貼上到問題或 Pull Request 中。

## 相關

- [安裝概覽](/zh-Hant/install)
- [平台](/zh-Hant/platforms)
