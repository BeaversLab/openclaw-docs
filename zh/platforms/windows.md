---
summary: "Windows (WSL2) 支持及配套应用状态"
read_when:
  - Installing OpenClaw on Windows
  - Looking for Windows companion app status
title: "Windows (WSL2)"
---

# Windows (WSL2)

建议通过 **WSL2**（推荐 Ubuntu）在 Windows 上使用 OpenClaw。CLI +
Gateway 网关 在 Linux 内部运行，这保持了运行时的一致性，并使工具更加兼容（Node/Bun/pnpm、Linux 二进制文件、skills）。原生 Windows 可能会更棘手。WSL2 为您提供完整的 Linux 体验——只需一个命令即可安装：`wsl --install`。

原生 Windows 配套应用已在计划中。

## 安装 (WSL2)

- [入门指南](/zh/en/start/getting-started) （在 WSL 内使用）
- [安装与更新](/zh/en/install/updating)
- 官方 WSL2 指南 (Microsoft)：[https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Gateway 网关

- [Gateway 网关 操作手册](/zh/en/gateway)
- [配置](/zh/en/gateway/configuration)

## Gateway 网关 服务安装 (CLI)

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

当提示时，选择 **Gateway 网关 服务**。

修复/迁移：

```
openclaw doctor
```

## 在 Windows 登录前自动启动 Gateway 网关

对于无头设置，确保即使没有人登录 Windows，完整的启动链也能运行。

### 1) 在不登录的情况下保持用户服务运行

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

将 `Ubuntu` 替换为您的发行版名称（来自）：

```powershell
wsl --list --verbose
```

### 验证启动链

重启后（在 Windows 登录前），从 WSL 检查：

```bash
systemctl --user is-enabled openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

## 高级：通过 LAN 暴露 WSL 服务 (portproxy)

WSL 拥有自己的虚拟网络。如果另一台机器需要访问运行在 **WSL 内部**
的服务（SSH、本地 TTS 服务器或 Gateway 网关），您必须将 Windows 端口转发
到当前的 WSL IP。WSL IP 在重启后会改变，因此您可能需要刷新转发规则。

示例 (PowerShell **以管理员身份**)：

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

允许端口通过 Windows 防火墙（一次性）：

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

在 WSL 重启后刷新 portproxy：

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

注意：

- 从另一台机器进行 SSH 连接的目标是 **Windows 主机 IP**（例如：`ssh user@windows-host -p 2222`）。
- 远程节点必须指向一个 **可访问的** Gateway 网关 URL（而不是 `127.0.0.1`）；使用
  `openclaw status --all` 进行确认。
- 使用 `listenaddress=0.0.0.0` 进行 LAN 访问；`127.0.0.1` 将其限制为本地访问。
- 如果您希望自动执行此操作，请注册一个计划任务以在登录时运行刷新
  步骤。

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

### 2) 启用 systemd（安装网关所必需）

在您的 WSL 终端中：

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

然后从 PowerShell 执行：

```powershell
wsl --shutdown
```

重新打开 Ubuntu，然后验证：

```bash
systemctl --user status
```

### 3) 安装 OpenClaw（在 WSL 内部）

在 WSL 内部按照 Linux 入门流程操作：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard
```

完整指南：[入门指南](/zh/en/start/getting-started)

## Windows 伴侣应用

我们还没有 Windows 伴侣应用。如果您希望通过贡献实现它，欢迎贡献代码。

import zh from '/components/footer/zh.mdx';

<zh />
