---
summary: "OpenClawRaspberry Pi在 Raspberry Pi 上托管 OpenClaw 以实现始终在线的自托管"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry PiRaspberry Pi"
---

在 Raspberry Pi 上运行持久、始终在线的 OpenClaw Gateway(网关)。由于 Pi 只是网关（模型通过 API 在云端运行），即使是配置一般的 Pi 也能很好地处理工作负载 —— 典型的硬件成本为 **$35–80（一次性费用）**，无月费。

## 硬件兼容性

| Pi 型号     | 内存   | 可用？ | 备注                               |
| ----------- | ------ | ------ | ---------------------------------- |
| Pi 5        | 4/8 GB | 最佳   | 最快，推荐。                       |
| Pi 4        | 4 GB   | 良好   | 大多数用户的最佳选择。             |
| Pi 4        | 2 GB   | 尚可   | 添加交换空间（swap）。             |
| Pi 4        | 1 GB   | 紧张   | 可以通过交换分区实现，需最小配置。 |
| Pi 3B+      | 1 GB   | 慢     | 可以使用但运行缓慢。               |
| Pi Zero 2 W | 512 MB | 否     | 不推荐。                           |

**最低配置：** 1 GB RAM，1 核，500 MB 可用磁盘空间，64 位操作系统。
**推荐配置：** 2 GB+ RAM，16 GB+ SD 卡（或 USB SSD），以太网连接。

## 先决条件

- Raspberry Pi 4 或 5，配备 2 GB+ RAM（推荐 4 GB）
- MicroSD 卡（16 GB+）或 USB SSD（性能更好）
- 官方 Pi 电源
- 网络连接（以太网或 WiFi）
- 64 位 Raspberry Pi OS（必须 —— 请勿使用 32 位）
- 大约 30 分钟

## 设置

<Steps>
  <Step title="刷入操作系统">
    使用 **Raspberry PiRaspberry Pi OS Lite (64-bit)** —— 无头服务器不需要桌面环境。

    1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)。
    2. 选择操作系统：**Raspberry Pi OS Lite (64-bit)**。
    3. 在设置对话框中，预先配置：
       - Hostname: `gateway-host`
       - 启用 SSH
       - 设置用户名和密码
       - 配置 WiFi（如果不使用以太网）
    4. 刷入到您的 SD 卡或 USB 驱动器，插入并启动 Pi。

  </Step>

<Step title="通过 SSH 连接">```bash ssh user@gateway-host ```</Step>

  <Step title="更新系统">
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential

    # Set timezone (important for cron and reminders)
    sudo timedatectl set-timezone America/Chicago
    ```

  </Step>

<Step title="安装 Node.js 24">```bash curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - sudo apt install -y nodejs node --version ```</Step>

  <Step title="添加交换空间（对于 2 GB 或更小的内存很重要）">
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

    # Reduce swappiness for low-RAM devices
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    ```

  </Step>

<Step title="安装 OpenClaw">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Step>

  <Step title="运行新手引导">
    ```bash
    openclaw onboard --install-daemon
    ```

    按照向导操作。对于无头设备，推荐使用 API 密钥而非 OAuth。Telegram 是最简单的入门渠道。

  </Step>

<Step title="验证">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="访问控制界面">
    在您的电脑上，从 Pi 获取仪表板 URL：

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    然后在另一个终端中创建 SSH 隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    在本地浏览器中打开打印出的 URL。如需始终在线的远程访问，请参阅 [Tailscale 集成](/zh/gateway/tailscale)。

  </Step>
</Steps>

## 性能提示

**使用 USB SSD** —— SD 卡速度慢且容易磨损。USB SSD 可以显著提高性能。请参阅 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

**启用模块编译缓存** —— 加速在低功耗 Pi 主机上重复的 CLI 调用：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

`OPENCLAW_NO_RESPAWN=1`Gateway(网关) 保持常规的 Gateway(网关) 重启在进程内进行，这避免了额外的进程交接，并让小型主机上的 PID 跟踪保持简单。

**减少内存使用** —— 对于无头设置，释放 GPU 内存并禁用未使用的服务：

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

**用于稳定重启的 systemd drop-in** —— 如果这台 Pi 主要运行 OpenClaw，请添加一个服务 drop-in：

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

然后 `systemctl --user daemon-reload && systemctl --user restart openclaw-gateway.service`。在无头 Pi 上，还要启用一次 linger，以便用户服务在注销后继续运行：`sudo loginctl enable-linger "$(whoami)"`。

## 推荐的模型设置

由于 Pi 仅运行 Gateway(网关)，请使用云端托管的 API 模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6",
        "fallbacks": ["openai/gpt-5.4-mini"]
      }
    }
  }
}
```

不要在 Pi 上运行本地 LLM —— 即使是小模型也太慢而无法发挥作用。让 Claude 或 GPT 来处理模型的工作。

## ARM 二进制文件说明

大多数 OpenClaw 功能无需修改即可在 ARM64 上运行（Node.js、Telegram、WhatsApp/Baileys、Chromium）。偶尔缺少 ARM 构建版的二进制文件通常是技能随附的可选 Go/Rust CLI 工具。在回退到从源代码构建之前，请验证缺失二进制文件的发布页面是否有 `linux-arm64` / `aarch64` 构件。

## 持久化与备份

OpenClaw 的状态存储在：

- `~/.openclaw/` — `openclaw.json`，每个代理的 `auth-profiles.json`，渠道/提供商状态，会话。
- `~/.openclaw/workspace/` — 代理工作区（SOUL.md，记忆，构件）。

这些数据在重启后仍然存在。使用以下命令创建便携式快照：

```bash
openclaw backup create
```

如果您将这些数据保存在 SSD 上，性能和耐用性都将比使用 SD 卡有所提升。

## 故障排除

**内存不足** -- 使用 `free -h` 验证交换空间是否处于活动状态。禁用未使用的服务（`sudo systemctl disable cups bluetooth avahi-daemon`）。仅使用基于 API 的模型。

**性能缓慢** -- 使用 USB SSD 代替 SD 卡。使用 `vcgencmd get_throttled` 检查 CPU 降频情况（应返回 `0x0`）。

**服务无法启动** -- 使用 `journalctl --user -u openclaw-gateway.service --no-pager -n 100` 检查日志并运行 `openclaw doctor --non-interactive`。如果是无头 Pi，还需验证是否启用了 lingering：`sudo loginctl enable-linger "$(whoami)"`。

**ARM 二进制文件问题** -- 如果技能因“exec format error”而失败，请检查该二进制文件是否有 ARM64 构建版。使用 `uname -m` 验证架构（应显示 `aarch64`）。

**WiFi 断连** -- 禁用 WiFi 电源管理：`sudo iwconfig wlan0 power off`。

## 后续步骤

- [渠道](/zh/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway(网关) 配置](/zh/gateway/configuration) -- 所有配置选项
- [更新](/zh/install/updating) -- 保持 OpenClaw 为最新版本

## 相关内容

- [安装概览](/zh/install)
- [Linux 服务器](Linux/en/vps)
- [平台](/zh/platforms)
