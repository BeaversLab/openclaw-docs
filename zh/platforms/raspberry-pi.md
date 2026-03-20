---
summary: "OpenClaw on Raspberry Pi (budget self-hosted setup)"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# OpenClaw on Raspberry Pi

## Goal

Run a persistent, always-on OpenClaw Gateway(网关) on a Raspberry Pi for **~$35-80** one-time cost (no monthly fees).

Perfect for:

- 24/7 personal AI assistant
- Home automation hub
- Low-power, always-available Telegram/WhatsApp bot

## Hardware Requirements

| Pi Model        | RAM     | Works?   | Notes                              |
| --------------- | ------- | -------- | ---------------------------------- |
| **Pi 5**        | 4GB/8GB | ✅ Best  | Fastest, recommended               |
| **Pi 4**        | 4GB     | ✅ Good  | Sweet spot for most users          |
| **Pi 4**        | 2GB     | ✅ OK    | Works, add swap                    |
| **Pi 4**        | 1GB     | ⚠️ Tight | Possible with swap, minimal config |
| **Pi 3B+**      | 1GB     | ⚠️ Slow  | Works but sluggish                 |
| **Pi Zero 2 W** | 512MB   | ❌       | Not recommended                    |

**Minimum specs:** 1GB RAM, 1 core, 500MB disk  
**Recommended:** 2GB+ RAM, 64-bit OS, 16GB+ SD card (or USB SSD)

## What you need

- Raspberry Pi 4 or 5 (2GB+ recommended)
- MicroSD card (16GB+) or USB SSD (better performance)
- Power supply (official Pi PSU recommended)
- Network connection (Ethernet or WiFi)
- ~30 minutes

## 1) Flash the OS

Use **Raspberry Pi OS Lite (64-bit)** — no desktop needed for a headless server.

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Choose OS: **Raspberry Pi OS Lite (64-bit)**
3. Click the gear icon (⚙️) to pre-configure:
   - Set hostname: `gateway-host`
   - Enable SSH
   - Set username/password
   - Configure WiFi (if not using Ethernet)
4. Flash to your SD card / USB drive
5. Insert and boot the Pi

## 2) Connect via SSH

```bash
ssh user@gateway-host
# or use the IP address
ssh user@192.168.x.x
```

## 3) System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y git curl build-essential

# Set timezone (important for cron/reminders)
sudo timedatectl set-timezone America/Chicago  # Change to your timezone
```

## 4) Install Node.js 24 (ARM64)

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v24.x.x
npm --version
```

## 5) Add Swap (Important for 2GB or less)

Swap prevents out-of-memory crashes:

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize for low RAM (reduce swappiness)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) Install OpenClaw

### Option A: Standard Install (Recommended)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### Option B: Hackable Install (For tinkering)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

The hackable install gives you direct access to logs and code — useful for debugging ARM-specific issues.

## 7) Run 新手引导

```bash
openclaw onboard --install-daemon
```

Follow the wizard:

1. **Gateway(网关) mode:** Local
2. **Auth:** API keys recommended (OAuth can be finicky on headless Pi)
3. **Channels:** Telegram is easiest to start with
4. **Daemon:** Yes (systemd)

## 8) Verify Installation

```bash
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f
```

## 9) Access the OpenClaw Dashboard

Replace `user@gateway-host` with your Pi username and hostname or IP address.

在您的电脑上，让 Pi 打印一个新的仪表板 URL：

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

该命令会打印 `Dashboard URL:`。根据 `gateway.auth.token`
的配置方式，该 URL 可能是一个普通的 `http://127.0.0.1:18789/` 链接，
也可能是一个包含 `#token=...` 的链接。

在您电脑上的另一个终端中，创建 SSH 隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

然后在本地浏览器中打开打印出来的仪表板 URL。

如果界面要求身份验证，请将 `gateway.auth.token`
（或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到控制 UI 设置中。

如需永久远程访问，请参阅 [Tailscale](/zh/gateway/tailscale)。

---

## 性能优化

### 使用 USB SSD（巨大提升）

SD 卡速度慢且容易磨损。USB SSD 可以显著提升性能：

```bash
# Check if booting from USB
lsblk
```

有关设置，请参阅 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

### 加快 CLI 启动速度（模块编译缓存）

在低功耗 Pi 主机上，启用 Node 的模块编译缓存，以便重复运行 CLI 时速度更快：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

注意：

- `NODE_COMPILE_CACHE` 可以加快后续运行速度（`status`、`health`、`--help`）。
- `/var/tmp` 比 `/tmp` 在重启后的存活效果更好。
- `OPENCLAW_NO_RESPAWN=1` 避免了 CLI 自重启产生的额外启动开销。
- 首次运行会预热缓存；后续运行受益最大。

### systemd 启动调优（可选）

如果这台 Pi 主要运行 OpenClaw，请添加服务 drop-in 以减少重启抖动
并保持启动环境稳定：

```bash
sudo systemctl edit openclaw
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

然后应用：

```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw
```

如果可能，请将 OpenClaw 状态/缓存保留在 SSD 支持的存储上，以避免冷启动期间 SD 卡的随机 I/O 瓶颈。

`Restart=` 策略如何帮助自动恢复：
[systemd 可以自动化服务恢复](https://www.redhat.com/en/blog/systemd-automate-recovery)。

### 减少内存使用

```bash
# Disable GPU memory allocation (headless)
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# Disable Bluetooth if not needed
sudo systemctl disable bluetooth
```

### 监控资源

```bash
# Check memory
free -h

# Check CPU temperature
vcgencmd measure_temp

# Live monitoring
htop
```

---

## ARM 特定说明

### 二进制兼容性

大多数 OpenClaw 功能都可以在 ARM64 上运行，但某些外部二进制文件可能需要 ARM 版本：

| 工具               | ARM64 状态 | 说明                                |
| ------------------ | ---------- | ----------------------------------- |
| Node.js            | ✅         | 运行良好                            |
| WhatsApp (Baileys) | ✅         | 纯 JS，无问题                       |
| Telegram           | ✅         | 纯 JS，无问题                       |
| gog (Gmail CLI)    | ⚠️         | 检查是否有 ARM 版本                 |
| Chromium (浏览器)  | ✅         | `sudo apt install chromium-browser` |

如果某个技能运行失败，请检查其二进制文件是否有 ARM 版本。许多 Go/Rust 工具有；有些则没有。

### 32位 vs 64位

**始终使用 64 位操作系统。** Node.js 和许多现代工具都要求使用 64 位。检查方法：

```bash
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)
```

---

## 推荐的型号设置

由于 Pi 只是 Gateway(网关)（模型在云端运行），请使用基于 API 的模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["openai/gpt-4o-mini"]
      }
    }
  }
}
```

**不要尝试在 Pi 上运行本地 LLM** —— 即使是小模型也太慢了。让 Claude/GPT 来处理繁重的工作。

---

## 开机自动启动

新手引导会设置此项，但要验证：

```bash
# Check service is enabled
sudo systemctl is-enabled openclaw

# Enable if not
sudo systemctl enable openclaw

# Start on boot
sudo systemctl start openclaw
```

---

## 故障排除

### 内存不足 (OOM)

```bash
# Check memory
free -h

# Add more swap (see Step 5)
# Or reduce services running on the Pi
```

### 性能缓慢

- 使用 USB SSD 代替 SD 卡
- 禁用未使用的服务：`sudo systemctl disable cups bluetooth avahi-daemon`
- 检查 CPU 降频：`vcgencmd get_throttled`（应返回 `0x0`）

### 服务无法启动

```bash
# Check logs
journalctl -u openclaw --no-pager -n 100

# Common fix: rebuild
cd ~/openclaw  # if using hackable install
npm run build
sudo systemctl restart openclaw
```

### ARM 二进制文件问题

如果某个技能因“exec format error”而失败：

1. 检查该二进制文件是否有 ARM64 版本
2. 尝试从源代码构建
3. 或者使用支持 ARM 的 Docker 容器

### WiFi 掉线

对于使用 WiFi 的无头 Pi：

```bash
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 成本比较

| 设置           | 一次性成本 | 每月成本 | 备注               |
| -------------- | ---------- | -------- | ------------------ |
| **Pi 4 (2GB)** | ~$45       | $0       | + 电费 (~$5/年)    |
| **Pi 4 (4GB)** | ~$55       | $0       | 推荐               |
| **Pi 5 (4GB)** | ~$60       | $0       | 性能最佳           |
| **Pi 5 (8GB)** | ~$80       | $0       | 性能过剩但面向未来 |
| DigitalOcean   | $0         | $6/月    | $72/年             |
| Hetzner        | $0         | €3.79/月 | ~$50/年            |

**盈亏平衡：** 与云 VPS 相比，Pi 在大约 6-12 个月内即可回本。

---

## 另请参阅

- [Linux 指南](/zh/platforms/linux) — 通用 Linux 设置
- [DigitalOcean 指南](/zh/platforms/digitalocean) — 云端替代方案
- [Hetzner 指南](/zh/install/hetzner) — Docker 设置
- [Tailscale](/zh/gateway/tailscale) — 远程访问
- [节点](/zh/nodes) — 将您的笔记本电脑/手机与 Pi 网关联动

import zh from "/components/footer/zh.mdx";

<zh />
