---
summary: "OpenClaw on Raspberry Pi (budget self-hosted setup)"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# OpenClaw 在Raspberry Pi上（Raspberry Pi）

## 目标

在Raspberry Pi上运行一个持久、在线的 OpenClaw Gateway 网关，一次性成本约为 **~35-80 美元**（无月费）（Raspberry Pi）。

适用于：

- 24/7 个人 AI 助手
- 家庭自动化中心
- 低功耗、随时待命的 Telegram/WhatsApp 机器人

## 硬件要求

| Pi 型号         | RAM     | 是否可用？ | 备注                     |
| --------------- | ------- | ---------- | ------------------------ |
| **Pi 5**        | 4GB/8GB | ✅ 最佳    | 最快，推荐               |
| **Pi 4**        | 4GB     | ✅ 良好    | 大多数用户的最佳选择     |
| **Pi 4**        | 2GB     | ✅ 可行    | 可用，添加 swap          |
| **Pi 4**        | 1GB     | ⚠️ 紧张    | 配合 swap 可行，最小配置 |
| **Pi 3B+**      | 1GB     | ⚠️ 缓慢    | 可用但迟缓               |
| **Pi Zero 2 W** | 512MB   | ❌         | 不推荐                   |

**最低规格：** 1GB RAM，1 核心，500MB 磁盘  
**推荐配置：** 2GB+ RAM，64 位操作系统，16GB+ SD 卡（或 USB SSD）

## 所需物品

- Raspberry Pi 4 或 5（建议 2GB 以上）
- MicroSD 卡（16GB+）或 USB SSD（性能更好）
- 电源（推荐使用官方 Pi 电源适配器）
- 网络连接（以太网或 WiFi）
- ~30 分钟

## 1) 刷入操作系统

使用 **Raspberry Pi OS Lite (64-bit)** — 无头服务器不需要桌面环境。

1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. 选择操作系统：**Raspberry Pi OS Lite (64-bit)**
3. 点击齿轮图标 (⚙️) 进行预配置：
   - 设置主机名：`gateway-host`
   - 启用 SSH
   - 设置用户名/密码
   - 配置 WiFi（如果不使用以太网）
4. 刷入到您的 SD 卡 / USB 驱动器
5. 插入并启动 Pi

## 2) 通过 SSH 连接

```bash
ssh user@gateway-host
# or use the IP address
ssh user@192.168.x.x
```

## 3) 系统设置

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y git curl build-essential

# Set timezone (important for cron/reminders)
sudo timedatectl set-timezone America/Chicago  # Change to your timezone
```

## 4) 安装 Node.js 24 (ARM64)

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v24.x.x
npm --version
```

## 5) 添加 Swap（对于 2GB 或更少内存很重要）

Swap 可防止内存耗尽崩溃：

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

## 6) 安装 OpenClaw

### 选项 A：标准安装（推荐）

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### 选项 B：可破解安装（适合折腾）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

可破解安装让您可以直接访问日志和代码 — 这对于调试 ARM 特定问题很有用。

## 7) 运行新手引导

```bash
openclaw onboard --install-daemon
```

跟随向导操作：

1. **Gateway(网关) 模式：** 本地
2. **Auth：** 推荐 API keys（在无头 Pi 上 OAuth 可能比较麻烦）
3. **Channels：** Telegram 最容易上手
4. **守护进程：** 是

## 8) 验证安装

```bash
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f
```

## 9) 访问 OpenClaw 控制台

将 `user@gateway-host` 替换为您的 Pi 用户名和主机名或 IP 地址。

在您的计算机上，让 Pi 打印一个新的仪表板 URL：

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

该命令会打印 `Dashboard URL:`。根据 `gateway.auth.token`
的配置方式，该 URL 可能是一个普通的 `http://127.0.0.1:18789/` 链接，
也可能是一个包含 `#token=...` 的链接。

在计算机上的另一个终端中，创建 SSH 隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

然后在本地浏览器中打开打印出来的 Dashboard URL。

如果 UI 要求身份验证，请将 `gateway.auth.token`
（或 `OPENCLAW_GATEWAY_TOKEN`）中的令牌粘贴到控制 UI 设置中。

如需始终在线的远程访问，请参阅 [Tailscale](/en/gateway/tailscale)。

---

## 性能优化

### 使用 USB SSD（巨大改进）

SD 卡速度慢且容易磨损。使用 USB SSD 可以显著提高性能：

```bash
# Check if booting from USB
lsblk
```

有关设置，请参阅 [Pi USB 启动指南](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)。

### 加快 CLI 启动速度（模块编译缓存）

在低功耗 Pi 主机上，启用 Node 的模块编译缓存，以便加快重复运行 CLI 的速度：

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

注意：

- `NODE_COMPILE_CACHE` 可以加快后续运行的速度（`status`、`health`、`--help`）。
- 与 `/tmp` 相比，`/var/tmp` 在重启后更能保持有效。
- `OPENCLAW_NO_RESPAWN=1` 避免了 CLI 自我重启带来的额外启动开销。
- 首次运行会预热缓存；后续运行获益最大。

### systemd 启动调优（可选）

如果此 Pi 主要运行 OpenClaw，请添加一个 service drop-in 以减少重启抖动并保持启动环境稳定：

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

如果可能，请将 OpenClaw 的状态/缓存保留在 SSD 支持的存储上，以避免冷启动期间 SD 卡的随机 I/O 瓶颈。

`Restart=` 策略如何有助于自动恢复：
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

大多数 OpenClaw 功能可在 ARM64 上运行，但某些外部二进制文件可能需要 ARM 构建：

| 工具               | ARM64 状态 | 说明                                |
| ------------------ | ---------- | ----------------------------------- |
| Node.js            | ✅         | 运行良好                            |
| WhatsApp (Baileys) | ✅         | 纯 JS，无问题                       |
| Telegram           | ✅         | 纯 JS，无问题                       |
| gog (Gmail CLI)    | ⚠️         | 检查是否有 ARM 版本                 |
| Chromium（浏览器） | ✅         | `sudo apt install chromium-browser` |

如果某个技能失败，请检查其二进制文件是否有 ARM 构建版本。许多 Go/Rust 工具都有；有些则没有。

### 32 位与 64 位

**始终使用 64 位操作系统。** Node.js 和许多现代工具都需要它。使用以下命令检查：

```bash
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)
```

---

## 推荐型号设置

由于 Pi 只是 Gateway(网关)（模型在云端运行），请使用 API-基于的模型：

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

**不要尝试在 Pi 上运行本地 LLM** —— 即使是小型模型也太慢了。让 Claude/GPT 来完成繁重的工作。

---

## 开机自启动

新手向导会自动设置此项，但若要验证：

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

- 使用 USB SSD 而不是 SD 卡
- 禁用未使用的服务：`sudo systemctl disable cups bluetooth avahi-daemon`
- 检查 CPU 限流：`vcgencmd get_throttled`（应返回 `0x0`）

### 服务无法启动

```bash
# Check logs
journalctl -u openclaw --no-pager -n 100

# Common fix: rebuild
cd ~/openclaw  # if using hackable install
npm run build
sudo systemctl restart openclaw
```

### ARM 二进制问题

如果某个技能因“exec format error”而失败：

1. 检查该二进制文件是否有 ARM64 构建版本
2. 尝试从源代码构建
3. 或使用支持 ARM 的 Docker 容器

### WiFi 掉线

对于使用 WiFi 的无头 Pi：

```bash
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 成本对比

| 设置           | 一次性成本 | 每月成本 | 备注               |
| -------------- | ---------- | -------- | ------------------ |
| **Pi 4 (2GB)** | ~$45       | $0       | + 电源（约 $5/年） |
| **Pi 4 (4GB)** | ~$55       | $0       | 推荐               |
| **Pi 5 (4GB)** | ~$60       | $0       | 最佳性能           |
| **Pi 5 (8GB)** | ~$80       | $0       | 性能过剩但面向未来 |
| DigitalOcean   | $0         | $6/月    | $72/年             |
| Hetzner        | $0         | €3.79/月 | ~$50/年            |

**回本点：** 与云 VPS 相比，Pi 在大约 6-12 个月内即可收回成本。

---

## 另请参阅

- [Linux 指南](/en/platforms/linux) — 常规 Linux 设置
- [DigitalOcean 指南](/en/platforms/digitalocean) — 云端替代方案
- [Hetzner 指南](/en/install/hetzner) — Docker 设置
- [Tailscale](/en/gateway/tailscale) — 远程访问
- [节点](/en/nodes) — 将您的笔记本电脑/手机与 Pi 网关联动

import zh from "/components/footer/zh.mdx";

<zh />
