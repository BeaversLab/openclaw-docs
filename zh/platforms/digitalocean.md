---
summary: "在 DigitalOcean 上运行 OpenClaw（简单的付费 VPS 选项）"
read_when:
  - "Setting up OpenClaw on DigitalOcean"
  - "Looking for cheap VPS hosting for OpenClaw"
title: "DigitalOcean"
---

# 在 DigitalOcean 上运行 OpenClaw

## 目标

在 DigitalOcean 上运行持久的 OpenClaw Gateway，价格为 **$6/月**（或使用保留定价 $4/月）。

如果您想要 $0/月的选项，并且不介意 ARM + provider 特定设置，请参阅 [Oracle Cloud 指南](/zh/platforms/oracle)。

## 成本比较（2026 年）

| Provider     | Plan            | Specs                  | Price/mo    | Notes                                 |
| ------------ | --------------- | ---------------------- | ----------- | ------------------------------------- |
| Oracle Cloud | Always Free ARM | up to 4 OCPU, 24GB RAM | $0          | ARM, limited capacity / signup quirks |
| Hetzner      | CX22            | 2 vCPU, 4GB RAM        | €3.79 (~$4) | Cheapest paid option                  |
| DigitalOcean | Basic           | 1 vCPU, 1GB RAM        | $6          | Easy UI, good docs                    |
| Vultr        | Cloud Compute   | 1 vCPU, 1GB RAM        | $6          | Many locations                        |
| Linode       | Nanode          | 1 vCPU, 1GB RAM        | $5          | Now part of Akamai                    |

**选择服务提供商：**

- DigitalOcean：最简单的用户体验 + 可预测的设置（本指南）
- Hetzner：良好的性价比（参见 [Hetzner 指南](/zh/platforms/hetzner)）
- Oracle Cloud：可以是 $0/月，但比较麻烦且仅限 ARM（参见 [Oracle 指南](/zh/platforms/oracle)）

---

## 前置条件

- DigitalOcean 账户（[注册可获得 $200 免费额度](https://m.do.co/c/signup)）
- SSH 密钥对（或愿意使用密码认证）
- 大约 20 分钟

## 1) 创建 Droplet

1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)
2. 点击 **Create → Droplets**
3. 选择：
   - **Region：** 离您最近（或您的用户）的地区
   - **Image：** Ubuntu 24.04 LTS
   - **Size：** Basic → Regular → **$6/月**（1 vCPU，1GB RAM，25GB SSD）
   - **Authentication：** SSH 密钥（推荐）或密码
4. 点击 **Create Droplet**
5. 记录 IP 地址

## 2) 通过 SSH 连接

```bash
ssh root@YOUR_DROPLET_IP
```

## 3) 安装 OpenClaw

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# Verify
openclaw --version
```

## 4) 运行入门引导

```bash
openclaw onboard --install-daemon
```

向导将引导您完成：

- 模型认证（API 密钥或 OAuth）
- 频道设置（Telegram、WhatsApp、Discord 等）
- Gateway 令牌（自动生成）
- 守护进程安装（systemd）

## 5) 验证 Gateway

```bash
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f
```

## 6) 访问仪表板

Gateway 默认绑定到环回接口。要访问 Control UI：

**选项 A：SSH 隧道（推荐）**

```bash
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789
```

**选项 B：Tailscale Serve（HTTPS，仅环回）**

```bash
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

打开：`https://<magicdns>/`

注意事项：

- Serve 使 Gateway 保持仅环回访问，并通过 Tailscale 身份标头进行认证。
- 要改为需要令牌/密码，请设置 `gateway.auth.allowTailscale: false` 或使用 `gateway.auth.mode: "password"`。

**选项 C：Tailnet 绑定（不使用 Serve）**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

打开：`http://<tailscale-ip>:18789`（需要令牌）。

## 7) 连接您的频道

### Telegram

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

### WhatsApp

```bash
openclaw channels login whatsapp
# Scan QR code
```

其他提供商请参阅 [Channels](/zh/channels)。

---

## 1GB RAM 优化

$6 的 Droplet 只有 1GB RAM。为了保持流畅运行：

### 添加交换空间（推荐）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更轻量的模型

如果遇到内存不足（OOM），请考虑：

- 使用基于 API 的模型（Claude、GPT）而不是本地模型
- 将 `agents.defaults.model.primary` 设置为更小的模型

### 监控内存

```bash
free -h
htop
```

---

## 持久化

所有状态存储在：

- `~/.openclaw/` — 配置、凭据、会话数据
- `~/.openclaw/workspace/` — 工作区（SOUL.md、内存等）

这些在重启后仍然存在。请定期备份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Oracle Cloud 免费替代方案

Oracle Cloud 提供 **Always Free** ARM 实例，比这里的任何付费选项都要强大得多 — 而且是 $0/月。

| What you get      | Specs                  |
| ----------------- | ---------------------- |
| **4 OCPUs**       | ARM Ampere A1          |
| **24GB RAM**      | More than enough       |
| **200GB storage** | Block volume           |
| **Forever free**  | No credit card charges |

**注意事项：**

- 注册可能比较麻烦（如果失败请重试）
- ARM 架构 — 大多数东西都能工作，但某些二进制文件需要 ARM 构建

完整的设置指南请参阅 [Oracle Cloud](/zh/platforms/oracle)。有关注册提示和注册过程故障排除，请参阅此 [社区指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 故障排除

### Gateway 无法启动

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl -u openclaw --no-pager -n 50
```

### 端口已被占用

```bash
lsof -i :18789
kill <PID>
```

### 内存不足

```bash
# Check memory
free -h

# Add more swap
# Or upgrade to $12/mo droplet (2GB RAM)
```

---

## 另请参阅

- [Hetzner 指南](/zh/platforms/hetzner) — 更便宜、更强大
- [Docker 安装](/zh/install/docker) — 容器化设置
- [Tailscale](/zh/gateway/tailscale) — 安全远程访问
- [配置](/zh/gateway/configuration) — 完整配置参考
