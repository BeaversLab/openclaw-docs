---
summary: "OpenClaw on DigitalOcean (simple paid VPS option)"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for cheap VPS hosting for OpenClaw
title: "DigitalOcean (平台)"
---

# DigitalOcean 上的 OpenClaw

## 目标

在 DigitalOcean 上运行持久化的 OpenClaw Gateway(网关) 网关，费用为 **$6/月**（预留价格则为 $4/月）。

如果您想要一个 $0/月的选项，并且不介意 ARM 和特定于提供商的设置，请参阅 [Oracle Cloud 指南](/zh/platforms/oracle)。

## 成本比较 (2026)

| 提供商       | 方案            | 规格                  | 价格/月     | 备注                       |
| ------------ | --------------- | --------------------- | ----------- | -------------------------- |
| Oracle Cloud | Always Free ARM | 最多 4 OCPU，24GB RAM | $0          | ARM，容量有限 / 注册有怪癖 |
| Hetzner      | CX22            | 2 vCPU，4GB RAM       | €3.79 (~$4) | 最便宜的付费选项           |
| DigitalOcean | 基础版          | 1 vCPU，1GB RAM       | $6          | UI 简单，文档完善          |
| Vultr        | Cloud Compute   | 1 vCPU，1GB RAM       | $6          | 机房位置多                 |
| Linode       | Nanode          | 1 vCPU，1GB RAM       | $5          | 现属于 Akamai              |

**选择提供商：**

- DigitalOcean：最简单的用户体验 + 可预测的设置（本指南）
- Hetzner：性价比高（请参阅 [Hetzner 指南](/zh/install/hetzner)）
- Oracle Cloud：可能免费（$0/月），但比较挑剔且仅限 ARM（请参阅 [Oracle 指南](/zh/platforms/oracle)）

---

## 先决条件

- DigitalOcean 账户（[注册并获取 $200 免费额度](https://m.do.co/c/signup)）
- SSH 密钥对（或者愿意使用密码认证）
- 约 20 分钟

## 1) 创建 Droplet

<Warning>请使用干净的基镜像（Ubuntu 24.04 LTS）。除非您已审查了第三方 Marketplace 一键镜像的启动脚本和防火墙默认设置，否则请避免使用。</Warning>

1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)
2. 点击 **Create → Droplets**
3. 选择：
   - **Region（区域）：** 离您最近（或离您的用户最近）
   - **Image（镜像）：** Ubuntu 24.04 LTS
   - **Size（规格）：** Basic → Regular → **$6/mo**（1 vCPU，1GB RAM，25GB SSD）
   - **Authentication（认证方式）：** SSH 密钥（推荐）或密码
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

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# Verify
openclaw --version
```

## 4) 运行新手引导

```bash
openclaw onboard --install-daemon
```

向导将引导您完成以下步骤：

- 模型认证（API 密钥或 OAuth）
- 通道设置（Telegram、WhatsApp、Discord 等）
- Gateway(网关) 令牌（自动生成）
- 守护进程安装（systemd）

## 5) 验证 Gateway(网关)

```bash
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f
```

## 6) 访问仪表板

网关默认绑定到回环地址。要访问控制 UI：

**选项 A：SSH 隧道（推荐）**

```bash
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789
```

**选项 B：Tailscale Serve（HTTPS，仅限环回）**

```bash
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

打开：`https://<magicdns>/`

备注：

- Serve 保持 Gateway(网关) 仅限本地回环，并通过 Tailscale 身份标头对控制 UI/WebSocket 流量进行身份验证（无令牌身份验证假定受信任的网关主机；HTTP API 不使用那些 Tailscale 标头，而是遵循网关的正常 HTTP 身份验证模式）。
- 若需要显式的共享密钥凭证，请设置 `gateway.auth.allowTailscale: false` 并使用 `gateway.auth.mode: "token"` 或 `"password"`。

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

有关其他提供商，请参阅[渠道](/zh/channels)。

---

## 针对 1GB 内存的优化

$6 的 Droplet 只有 1GB 内存。为了保持运行流畅：

### 添加交换空间（推荐）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更轻量的模型

如果您遇到内存不足（OOM）的情况，请考虑：

- 使用基于 API 的模型（Claude、GPT）代替本地模型
- 将 `agents.defaults.model.primary` 设置为较小的模型

### 监控内存

```bash
free -h
htop
```

---

## 持久性

所有状态都存在于：

- `~/.openclaw/` — `openclaw.json`，每个代理的 `auth-profiles.json`，渠道/提供商状态以及会话数据
- `~/.openclaw/workspace/` — 工作区（SOUL.md，内存等）

这些在重启后依然保留。请定期备份它们：

```bash
openclaw backup create
```

---

## Oracle Cloud Free Alternative

Oracle Cloud 提供 **Always Free** ARM 实例，其性能明显优于此处的任何付费选项——每月费用为 $0。

| 您将获得       | 规格             |
| -------------- | ---------------- |
| **4 个 OCPU**  | ARM Ampere A1    |
| **24GB 内存**  | 绰绰有余         |
| **200GB 存储** | 块存储卷         |
| **永久免费**   | 不产生信用卡费用 |

**注意事项：**

- 注册可能比较棘手（如果失败请重试）
- ARM 架构 —— 大多数东西都能用，但某些二进制文件需要 ARM 构建

有关完整的设置指南，请参阅 [Oracle Cloud](/zh/platforms/oracle)。有关注册提示和注册过程的故障排除，请参阅此[社区指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 故障排除

### Gateway(网关) 无法启动

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway.service --no-pager -n 50
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

- [Hetzner 指南](/zh/install/hetzner) — 更便宜，更强大
- [Docker 安装](/zh/install/docker) — 容器化设置
- [Tailscale](/zh/gateway/tailscale) — 安全远程访问
- [配置](/zh/gateway/configuration) — 完整配置参考
