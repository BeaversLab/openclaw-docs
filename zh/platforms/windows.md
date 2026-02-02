---
title: "Windows（WSL2）"
summary: "Windows（WSL2）支持 + 伴侣应用状态"
read_when:
  - 在 Windows 上安装 OpenClaw
  - 了解 Windows 伴侣应用状态
---
# Windows（WSL2）

在 Windows 上运行 OpenClaw **推荐使用 WSL2**（推荐 Ubuntu）。
CLI + Gateway 在 Linux 内运行，运行时更一致，工具链兼容性更好（Node/Bun/pnpm、Linux 二进制、skills）。
原生 Windows 安装未充分测试且问题更多。

原生 Windows 伴侣应用在规划中。

## 安装（WSL2）
- [Getting Started](/zh/start/getting-started)（在 WSL 中使用）
- [Install & updates](/zh/install/updating)
- 官方 WSL2 指南（Microsoft）：https://learn.microsoft.com/windows/wsl/install

## Gateway
- [Gateway runbook](/zh/gateway)
- [Configuration](/zh/gateway/configuration)

## Gateway 服务安装（CLI）

在 WSL2 中：

```
openclaw onboard --install-daemon
```

或：

```
openclaw gateway install
```

或：

```
openclaw configure
```

提示时选择 **Gateway service**。

修复/迁移：

```
openclaw doctor
```

## 高级：通过 LAN 暴露 WSL 服务（portproxy）

WSL 有独立虚拟网络。如果另一台机器需要访问**运行在 WSL 内**的服务
（SSH、本地 TTS 服务器或 Gateway），你必须把 Windows 端口转发到当前 WSL IP。
WSL IP 在重启后会变化，因此可能需要刷新转发规则。

示例（PowerShell **以管理员**运行）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

放行 Windows 防火墙（一次性）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

WSL 重启后刷新 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

注意：
- 从另一台机器 SSH 时，目标是**Windows 主机 IP**（例如 `ssh user@windows-host -p 2222`）。
- 远程节点必须指向**可达**的 Gateway URL（不是 `127.0.0.1`）；可用
  `openclaw status --all` 确认。
- 用 `listenaddress=0.0.0.0` 才能 LAN 访问；`127.0.0.1` 仅本机。
- 若需自动化，可注册计划任务在登录时运行刷新步骤。

## WSL2 安装步骤

### 1) 安装 WSL2 + Ubuntu

打开 PowerShell（管理员）：

```powershell
wsl --install
# 或显式选择发行版：
wsl --list --online
wsl --install -d Ubuntu-24.04
```

若 Windows 提示，请重启。

### 2) 启用 systemd（安装 gateway 服务必需）

在 WSL 终端：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然后在 PowerShell：

```powershell
wsl --shutdown
```

重新打开 Ubuntu，并验证：

```bash
systemctl --user status
```

### 3) 安装 OpenClaw（在 WSL 中）

在 WSL 内按 Linux Getting Started 流程：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # 首次运行会自动安装 UI 依赖
pnpm build
openclaw onboard
```

完整指南：[Getting Started](/zh/start/getting-started)

## Windows 伴侣应用

目前还没有 Windows 伴侣应用。如果你想推动它，欢迎贡献。
