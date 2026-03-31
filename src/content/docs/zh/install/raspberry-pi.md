---
summary: "在 Raspberry Pi 上托管 OpenClaw 以实现始终在线的自托管"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# Raspberry Pi

在 Raspberry Pi 上运行持久、始终在线的 OpenClaw Gateway(网关)。由于 Pi 仅作为 Gateway(网关)（模型通过 API 在云端运行），即使是配置一般的 Pi 也能很好地处理工作负载。

## 先决条件

- Raspberry Pi 4 或 5，配备 2 GB 或更大内存（推荐 4 GB）
- MicroSD 卡（16 GB 或更大）或 USB SSD（性能更佳）
- 官方 Pi 电源
- 网络连接（以太网或 WiFi）
- 64 位 Raspberry Pi OS（必须 —— 请勿使用 32 位）
- 大约 30 分钟

## 设置

<Steps>
  <Step title="刷入操作系统">
    使用 **Raspberry Pi OS Lite (64-bit)** —— 无头服务器不需要桌面环境。

    1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)。
    2. 选择操作系统：**Raspberry Pi OS Lite (64-bit)**。
    3. 在设置对话框中，预先配置：
       - 主机名：`gateway-host`
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

  <Step title="添加交换空间（对于 2 GB 或更小内存的设备很重要）">
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

    按照向导操作。对于无头设备，推荐使用 API 密钥而不是 OAuth。Telegram 是最简单的入门渠道。

  </Step>

<Step title="验证">```bash openclaw status sudo systemctl status openclaw journalctl -u openclaw -f ```</Step>

  <Step title="访问控制界面">
    在您的计算机上，从 Pi 获取仪表板 URL：

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    然后在另一个终端中创建 SSH 隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    在本地浏览器中打开打印出的 URL。要实现始终开启的远程访问，请参阅 [Tailscale 集成](/en/gateway/tailscale)。

  </Step>
</Steps>

## 性能提示

**使用 USB SSD** -- SD 卡速度较慢且容易磨损。USB SSD 可以显著提高性能。请参阅 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

**启用模块编译缓存** -- 加速在低功耗 Pi 主机上重复调用 CLI：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

**减少内存使用** -- 对于无头设置，释放 GPU 内存并禁用未使用的服务：

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

## 故障排除

**内存不足** -- 使用 `free -h` 验证 swap 是否处于活动状态。禁用未使用的服务 (`sudo systemctl disable cups bluetooth avahi-daemon`)。仅使用基于 API 的模型。

**性能缓慢** -- 使用 USB SSD 代替 SD 卡。使用 `vcgencmd get_throttled` 检查 CPU 降频（应返回 `0x0`）。

**服务无法启动** -- 使用 `journalctl -u openclaw --no-pager -n 100` 检查日志并运行 `openclaw doctor --non-interactive`。

**ARM 二进制文件问题** -- 如果某个技能因“exec format error”而失败，请检查该二进制文件是否具有 ARM64 构建。使用 `uname -m` 验证架构（应显示 `aarch64`）。

**WiFi 掉线** -- 禁用 WiFi 电源管理：`sudo iwconfig wlan0 power off`。

## 后续步骤

- [通道](/en/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway(网关) 配置](/en/gateway/configuration) -- 所有配置选项
- [更新](/en/install/updating) -- 保持 OpenClaw 为最新
