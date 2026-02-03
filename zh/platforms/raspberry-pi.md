---
summary: "在树莓派上运行 OpenClaw（预算自托管方案）"
read_when:
  - 在树莓派上部署 OpenClaw
  - 在 ARM 设备上运行 OpenClaw
  - 构建便宜的常驻个人 AI
title: "树莓派"
---

# OpenClaw on Raspberry Pi

## 目标

在树莓派上运行一个持久化、常驻的 OpenClaw Gateway，**一次性成本约 $35-80**（无月费）。

适合：
- 24/7 个人 AI 助手
- 家庭自动化中枢
- 低功耗、常在线的 Telegram/WhatsApp bot

## 硬件要求

| Pi Model | RAM | Works? | Notes |
|----------|-----|--------|-------|
| **Pi 5** | 4GB/8GB | ✅ Best | 最快，推荐 |
| **Pi 4** | 4GB | ✅ Good | 多数用户甜 spot |
| **Pi 4** | 2GB | ✅ OK | 可用，建议加 swap |
| **Pi 4** | 1GB | ⚠️ Tight | 可用但紧张，需最小化配置 |
| **Pi 3B+** | 1GB | ⚠️ Slow | 可用但偏慢 |
| **Pi Zero 2 W** | 512MB | ❌ | 不推荐 |

**最低规格：** 1GB RAM，1 核，500MB 磁盘  
**推荐：** 2GB+ RAM，64-bit OS，16GB+ SD 卡（或 USB SSD）

## 你需要什么

- Raspberry Pi 4 或 5（推荐 2GB+）
- MicroSD 卡（16GB+）或 USB SSD（性能更好）
- 电源（推荐官方电源）
- 网络连接（有线或 WiFi）
- ~30 分钟

## 1) 刷入系统

使用 **Raspberry Pi OS Lite (64-bit)** —— 无桌面即可做无头服务器。

1. 下载 [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. 选择 OS：**Raspberry Pi OS Lite (64-bit)**
3. 点击齿轮（⚙️）预配置：
   - 设置 hostname：`gateway-host`
   - 启用 SSH
   - 设置用户名/密码
   - 配置 WiFi（若非有线）
4. 刷入 SD 卡 / USB 盘
5. 插入并启动 Pi

## 2) SSH 连接

```bash
ssh user@gateway-host
# 或使用 IP
ssh user@192.168.x.x
```

## 3) 系统设置

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必需包
sudo apt install -y git curl build-essential

# 设置时区（对 cron/提醒很重要）
sudo timedatectl set-timezone America/Chicago  # 改成你的时区
```

## 4) 安装 Node.js 22（ARM64）

```bash
# 通过 NodeSource 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node --version  # 应显示 v22.x.x
npm --version
```

## 5) 添加 Swap（2GB 或更低内存必做）

Swap 可避免内存不足崩溃：

```bash
# 创建 2GB swap 文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 持久化
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 优化低内存（降低 swappiness）
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) 安装 OpenClaw

### 方案 A：标准安装（推荐）

```bash
curl -fsSL https://openclaw.bot/install.sh | bash
```

### 方案 B：可 Hack 安装（便于折腾）

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

可 Hack 安装让你更容易查看日志与代码，便于排查 ARM 特有问题。

## 7) 运行 Onboarding

```bash
openclaw onboard --install-daemon
```

向导步骤：
1. **Gateway mode：** Local
2. **Auth：** 推荐 API keys（OAuth 在 headless Pi 上可能较麻烦）
3. **Channels：** 最容易起步的是 Telegram
4. **Daemon：** Yes（systemd）

## 8) 验证安装

```bash
# 查看状态
openclaw status

# 查看服务
sudo systemctl status openclaw

# 查看日志
journalctl -u openclaw -f
```

## 9) 访问 Dashboard

Pi 是 headless，用 SSH 隧道：

```bash
# 在你的笔记本/台式机
ssh -L 18789:localhost:18789 user@gateway-host

# 然后在浏览器打开
open http://localhost:18789
```

或使用 Tailscale 进行常驻访问：

```bash
# 在 Pi 上
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# 更新配置
openclaw config set gateway.bind tailnet
sudo systemctl restart openclaw
```

---

## 性能优化

### 使用 USB SSD（巨大提升）

SD 卡慢且易损。USB SSD 性能提升明显：

```bash
# 查看是否从 USB 启动
lsblk
```

设置参考：[Pi USB boot guide](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot)

### 降低内存占用

```bash
# 禁用 GPU 内存分配（headless）
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# 若不需要蓝牙
sudo systemctl disable bluetooth
```

### 监控资源

```bash
# 查看内存
free -h

# 查看 CPU 温度
vcgencmd measure_temp

# 实时监控
htop
```

---

## ARM 特性说明

### 二进制兼容性

多数 OpenClaw 功能在 ARM64 可用，但部分外部二进制需要 ARM 版本：

| Tool | ARM64 Status | Notes |
|------|--------------|-------|
| Node.js | ✅ | 工作良好 |
| WhatsApp (Baileys) | ✅ | 纯 JS，无问题 |
| Telegram | ✅ | 纯 JS，无问题 |
| gog (Gmail CLI) | ⚠️ | 检查是否有 ARM 版本 |
| Chromium (browser) | ✅ | `sudo apt install chromium-browser` |

若某个 skill 失败，检查其二进制是否有 ARM 构建。很多 Go/Rust 工具有，部分没有。

### 32-bit vs 64-bit

**务必使用 64-bit OS。** Node.js 和许多现代工具要求 64 位。检查：

```bash
uname -m
# 应显示：aarch64（64-bit），而非 armv7l（32-bit）
```

---

## 推荐模型配置

树莓派只作为 Gateway（模型在云端）。使用 API 模型：

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

**不要尝试在 Pi 上跑本地 LLM** —— 即便小模型也太慢。让 Claude/GPT 扛。

---

## 开机自启

Onboarding 向导会设置，但可验证：

```bash
# 确认已启用
sudo systemctl is-enabled openclaw

# 若未启用
sudo systemctl enable openclaw

# 开机启动
sudo systemctl start openclaw
```

---

## Troubleshooting

### 内存不足（OOM）

```bash
# 查看内存
free -h

# 添加更多 swap（见第 5 步）
# 或减少运行中的服务
```

### 性能慢

- 用 USB SSD 替代 SD 卡
- 禁用不需要的服务：`sudo systemctl disable cups bluetooth avahi-daemon`
- 检查 CPU 降频：`vcgencmd get_throttled`（应返回 `0x0`）

### 服务无法启动

```bash
# 查看日志
journalctl -u openclaw --no-pager -n 100

# 常见修复：重新构建
cd ~/openclaw  # 如果用可 hack 安装
npm run build
sudo systemctl restart openclaw
```

### ARM 二进制问题

若 skill 报 “exec format error”：
1. 检查是否有 ARM64 构建
2. 尝试从源码构建
3. 或使用支持 ARM 的 Docker 容器

### WiFi 掉线

无头 Pi 使用 WiFi 时：

```bash
# 关闭 WiFi 省电
sudo iwconfig wlan0 power off

# 持久化
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## 成本对比

| Setup | One-Time Cost | Monthly Cost | Notes |
|-------|---------------|--------------|-------|
| **Pi 4 (2GB)** | ~$45 | $0 | + 电费（~$5/年） |
| **Pi 4 (4GB)** | ~$55 | $0 | 推荐 |
| **Pi 5 (4GB)** | ~$60 | $0 | 性能最好 |
| **Pi 5 (8GB)** | ~$80 | $0 | 过度但长远 |
| DigitalOcean | $0 | $6/mo | $72/年 |
| Hetzner | $0 | €3.79/mo | ~$50/年 |

**回本：** 相对云 VPS，Pi 大约 6-12 个月回本。

---

## See Also

- [Linux guide](/zh/platforms/linux) — 通用 Linux 设置
- [DigitalOcean guide](/zh/platforms/digitalocean) — 云端替代方案
- [Hetzner guide](/zh/platforms/hetzner) — Docker 方案
- [Tailscale](/zh/gateway/tailscale) — 远程访问
- [Nodes](/zh/nodes) — 配对你的笔记本/手机到 Pi gateway
