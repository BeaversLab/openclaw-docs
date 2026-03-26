---
summary: "Windows 支持：原生和 WSL2 安装路径、守护程序以及当前注意事项"
read_when:
  - Installing OpenClaw on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

# Windows

OpenClaw 同时支持 **原生 Windows** 和 **WSL2**。WSL2 是更稳定的路径，推荐用于完整体验 —— CLI、Gateway 和工具在 Linux 内部运行，具有完全兼容性。原生 Windows 适用于核心 CLI 和 Gateway 使用，但有一些注意事项，如下所述。

原生 Windows 配套应用已在计划中。

## WSL2 (推荐)

- [入门指南](/zh/start/getting-started) (在 WSL 内使用)
- [安装与更新](/zh/install/updating)
- 官方 WSL2 指南 (Microsoft)：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## 原生 Windows 状态

原生 Windows CLI 流程正在改进，但 WSL2 仍然是推荐的路径。

目前在原生 Windows 上运行良好的功能：

- 通过 `install.ps1` 进行网站安装程序安装
- 本地 CLI 使用，例如 `openclaw --version`、`openclaw doctor` 和 `openclaw plugins list --json`
- 嵌入式本地代理/提供商试运行，例如：

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

当前注意事项：

- `openclaw onboard --non-interactive` 仍然需要一个可访问的本地 Gateway(网关)，除非您传递 `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` 和 `openclaw gateway install` 首先尝试 Windows 计划任务
- 如果创建计划任务被拒绝，OpenClaw 将回退到每用户的启动文件夹登录项，并立即启动网关
- 如果 `schtasks` 本身卡死或停止响应，OpenClaw 现在会快速中止该路径并回退，而不是永远挂起
- 如果可用，计划任务仍然是首选，因为它们提供更好的监督状态

如果您只需要原生 CLI，而不安装网关服务，请使用以下之一：

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

如果您确实想要在原生 Windows 上进行管理的启动：

```powershell
openclaw gateway install
openclaw gateway status --json
```

如果计划任务创建被阻止，回退服务模式仍会在通过当前用户的启动文件夹登录后自动启动。

## Gateway(网关)

- [Gateway(网关) 运维手册](/zh/gateway)
- [配置](/zh/gateway/configuration)

## Gateway(网关) 服务安装 (CLI)

在 WSL2 内部：

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

出现提示时选择 **Gateway(网关) 服务**。

修复/迁移：

```
openclaw doctor
```

## Gateway(网关) 在 Windows 登录前自动启动

对于无头设置，确保即使没有人登录 Windows，完整的启动链也能运行。

### 1) 在未登录的情况下保持用户服务运行

在 WSL 内部：

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) 安装 OpenClaw gateway 用户服务

在 WSL 内部：

```bash
openclaw gateway install
```

### 3) 在 Windows 启动时自动启动 WSL

以管理员身份在 PowerShell 中：

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

将 `Ubuntu` 替换为您的发行版名称，来源于：

```powershell
wsl --list --verbose
```

### 验证启动链

重启后（在 Windows 登录前），从 WSL 检查：

```bash
systemctl --user is-enabled openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

## 高级：通过 LAN 暴露 WSL 服务

WSL 拥有自己的虚拟网络。如果另一台机器需要访问运行于 WSL 内部的服务（SSH、本地 TTS 服务器或 Gateway(网关)），您必须将一个 Windows 端口转发到当前的 WSL IP。WSL IP 在重启后会改变，因此您可能需要刷新转发规则。

示例（PowerShell **以管理员身份**）：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

允许该端口通过 Windows 防火墙（一次性）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

在 WSL 重启后刷新端口代理：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

说明：

- 从另一台机器进行 SSH 会指向 **Windows 主机 IP** (例如：`ssh user@windows-host -p 2222`)。
- 远程节点必须指向一个 **可访问的** Gateway(网关) URL (而不是 `127.0.0.1`)；请使用
  `openclaw status --all` 进行确认。
- 使用 `listenaddress=0.0.0.0` 进行 LAN 访问；`127.0.0.1` 将其保持在本地。
- 如果您希望自动执行此操作，请注册一个计划任务以在登录时运行刷新步骤。

## WSL2 分步安装

### 1) 安装 WSL2 + Ubuntu

打开 PowerShell (管理员)：

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

如果 Windows 提示，请重启。

### 2) 启用 systemd（安装 gateway 所需）

在您的 WSL 终端中：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然后从 PowerShell：

```powershell
wsl --shutdown
```

重新打开 Ubuntu，然后验证：

```bash
systemctl --user status
```

### 3) 安装 OpenClaw（在 WSL 内部）

在 WSL 内部遵循 Linux 入门指南流程：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard
```

完整指南：[入门指南](/zh/start/getting-started)

## Windows 伴侣应用

我们还没有 Windows 伴侣应用。如果您希望贡献使其成为可能，我们欢迎贡献。

import zh from "/components/footer/zh.mdx";

<zh />
