---
summary: "OpenClaw on DigitalOcean (simple paid VPS option)"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for cheap VPS hosting for OpenClaw
title: "DigitalOcean"
---

# DigitalOcean 上的 OpenClaw

## 目标

在 DigitalOcean 上运行持久化的 OpenClaw Gateway 网关，费用为 **$6/月**（预留价格则为 $4/月）。

如果您希望选择 $0/月的选项，并且不介意 ARM 架构和特定于提供商的设置，请参阅 [Oracle Cloud 指南](/zh/en/platforms/oracle)。

## 成本比较 (2026)

| 服务商      | 方案             | 规格                     | 月费        | 备注                                       |
| ------------ | --------------- | ---------------------- | ----------- | ------------------------------------------ |
| Oracle Cloud | Always Free ARM | 最多 4 个 OCPU, 24GB RAM | $0          | ARM，容量有限 / 注册流程怪异               |
| Hetzner      | CX22            | 2 vCPU, 4GB RAM        | €3.79 (~$4) | 最便宜的付费选项                            |
| DigitalOcean | Basic           | 1 vCPU, 1GB RAM        | $6          | 界面简单，文档完善                          |
| Vultr        | Cloud Compute   | 1 vCPU, 1GB RAM        | $6          | 机房位置多                                 |
| Linode       | Nanode          | 1 vCPU, 1GB RAM        | $5          | 现为 Akamai 旗下                            |

**选择服务商：**

- DigitalOcean：最简单的用户体验 + 可预期的设置（本指南）
- Hetzner：性价比高（参见 [Hetzner 指南](/zh/en/install/hetzner)）
- Oracle Cloud：可以免费 ($0/月)，但较为挑剔且仅限 ARM（参见 [Oracle 指南](/zh/en/platforms/oracle)）

---

## 前提条件

- DigitalOcean 账户（[注册获得 $200 额度](https://m.do.co/c/signup)）
- SSH 密钥对（或者愿意使用密码验证）
- 约 20 分钟

## 1) 创建 Droplet

<Warning>
使用纯净的基础镜像 (Ubuntu 24.04 LTS)。除非您审查过其启动脚本和防火墙默认设置，否则请避免使用第三方 Marketplace 一键镜像。
</Warning>

1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)
2. 点击 **Create → Droplets**
3. 选择：
   - **区域：** 离您（或您的用户）最近的
   - **镜像：** Ubuntu 24.04 LTS
   - **规格：** Basic → Regular → **$6/月** (1 vCPU, 1GB RAM, 25GB SSD)
   - **认证：** SSH 密钥（推荐）或密码
4. 点击 **Create Droplet**
5. 记录下 IP 地址

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

## 4) 运行入门向导

```bash
openclaw onboard --install-daemon
```

向导将引导您完成：

- 模型认证（API 密钥或 OAuth）
- 频道设置（Telegram, WhatsApp, Discord 等）
- Gateway 网关 令牌（自动生成）
- 守护进程安装 (systemd)

## 5) 验证 Gateway 网关

```bash
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f
```

## 6) 访问仪表板

网关默认绑定到环回地址。要访问控制界面：

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

- Serve 保持 Gateway 网关 仅限环回访问，并通过 Tailscale 身份标头验证控制界面/WebSocket 流量（无令牌认证假定 Gateway 网关 主机受信任；HTTP API 仍需令牌/密码）。
- 若要改为需要令牌/密码，请设置 `gateway.auth.allowTailscale: false` 或使用 `gateway.auth.mode: "password"`。

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

查看 [频道](/zh/en/channels) 了解其他提供商。

---

## 1GB 内存优化

$6 的 Droplet 只有 1GB 内存。为了保持流畅运行：

### 添加交换空间（推荐）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更轻量的模型

如果遇到内存不足 (OOM) 的情况，请考虑：

- 使用基于 API 的模型（Claude, GPT）而不是本地模型
- 将 `agents.defaults.model.primary` 设置为更小的模型

### 监控内存

```bash
free -h
htop
```

---

## 持久化

所有状态均位于：

- `~/.openclaw/` — 配置、凭据、会话数据
- `~/.openclaw/workspace/` — 工作区（SOUL.md、记忆等）

这些数据在重启后依然存在。请定期备份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Oracle Cloud 免费替代方案

Oracle Cloud 提供 **Always Free** ARM 实例，其性能比此处任何付费选项都要强大得多 —— 费用为 $0/月。

| 所获内容      | 规格                  |
| ----------------- | ---------------------- |
| **4 OCPUs**       | ARM Ampere A1          |
| **24GB RAM**      |绰绰有余       |
| **200GB 存储** | 块存储卷           |
| **永久免费**  | 无信用卡扣费 |

**注意事项：**

- 注册过程可能比较棘手（如果失败请重试）
- ARM 架构 —— 大多数程序可以运行，但部分二进制文件需要 ARM 版本

有关完整设置指南，请参阅 [Oracle Cloud](/zh/en/platforms/oracle)。有关注册提示和故障排除注册过程，请参阅此 [社区指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## 故障排除

### Gateway 网关 无法启动

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

- [Hetzner 指南](/zh/en/install/hetzner) — 更便宜、更强大
- [Docker 安装](/zh/en/install/docker) — 容器化部署
- [Tailscale](/zh/en/gateway/tailscale) — 安全的远程访问
- [配置](/zh/en/gateway/configuration) — 完整配置参考

import zh from '/components/footer/zh.mdx';

<zh />
