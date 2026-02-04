---
summary: "在 DigitalOcean 上运行 OpenClaw（简单的付费 VPS 方案）"
read_when:
  - 在 DigitalOcean 上部署 OpenClaw
  - 寻找便宜的 OpenClaw VPS 托管方案
title: "DigitalOcean"
---

# OpenClaw on DigitalOcean

## 目标

在 DigitalOcean 上以 **$6/月**（或保留价 $4/月）运行持久化 OpenClaw Gateway。

如果你想要 $0/月 且不介意 ARM + provider 特有配置，见 [Oracle Cloud guide](/zh/platforms/oracle)。

## 成本对比（2026）

| Provider     | Plan            | Specs                  | Price/mo    | Notes                  |
| ------------ | --------------- | ---------------------- | ----------- | ---------------------- |
| Oracle Cloud | Always Free ARM | up to 4 OCPU, 24GB RAM | $0          | ARM，容量有限/注册有坑 |
| Hetzner      | CX22            | 2 vCPU, 4GB RAM        | €3.79 (~$4) | 最便宜付费选项         |
| DigitalOcean | Basic           | 1 vCPU, 1GB RAM        | $6          | UI 简单，文档完善      |
| Vultr        | Cloud Compute   | 1 vCPU, 1GB RAM        | $6          | 机房多                 |
| Linode       | Nanode          | 1 vCPU, 1GB RAM        | $5          | 现属 Akamai            |

**选择建议：**

- DigitalOcean：最简单的 UX + 可预测（本指南）
- Hetzner：价格/性能更好（见 [Hetzner guide](/zh/platforms/hetzner)）
- Oracle Cloud：可 $0/月，但更折腾且仅 ARM（见 [Oracle guide](/zh/platforms/oracle)）

---

## 前置条件

- DigitalOcean 账号（[signup with $200 free credit](https://m.do.co/c/signup)）
- SSH key（或愿意用密码登录）
- ~20 分钟

## 1) 创建 Droplet

1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)
2. 点击 **Create → Droplets**
3. 选择：
   - **Region：** 离你最近（或用户最近）
   - **Image：** Ubuntu 24.04 LTS
   - **Size：** Basic → Regular → **$6/mo**（1 vCPU，1GB RAM，25GB SSD）
   - **Authentication：** SSH key（推荐）或密码
4. 点击 **Create Droplet**
5. 记下 IP 地址

## 2) 通过 SSH 连接

```bash
ssh root@YOUR_DROPLET_IP
```

## 3) 安装 OpenClaw

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 安装 OpenClaw
curl -fsSL https://openclaw.bot/install.sh | bash

# 验证
openclaw --version
```

## 4) 运行 Onboarding

```bash
openclaw onboard --install-daemon
```

向导会引导完成：

- 模型认证（API keys 或 OAuth）
- 频道设置（Telegram、WhatsApp、Discord 等）
- Gateway token（自动生成）
- Daemon 安装（systemd）

## 5) 验证 Gateway

```bash
# 检查状态
openclaw status

# 检查服务
systemctl --user status openclaw-gateway.service

# 查看日志
journalctl --user -u openclaw-gateway.service -f
```

## 6) 访问 Dashboard

Gateway 默认绑定在 loopback。访问 Control UI：

**选项 A：SSH 隧道（推荐）**

```bash
# 在本地机器
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# 然后打开：http://localhost:18789
```

**选项 B：Tailscale Serve（HTTPS，loopback-only）**

```bash
# 在 droplet 上
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# 配置 Gateway 使用 Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

打开：`https://<magicdns>/`

注意：

- Serve 让 Gateway 保持 loopback-only，并通过 Tailscale 身份头认证。
- 若要 token/password 认证，设置 `gateway.auth.allowTailscale: false` 或 `gateway.auth.mode: "password"`。

**选项 C：Tailnet bind（不使用 Serve）**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

打开：`http://<tailscale-ip>:18789`（需要 token）。

## 7) 连接你的频道

### Telegram

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

### WhatsApp

```bash
openclaw channels login whatsapp
# 扫描二维码
```

其它 providers 见 [通道](/zh/channels)。

---

## 1GB RAM 优化

$6 的 droplet 只有 1GB RAM。保持稳定运行建议：

### 添加 swap（推荐）

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 使用更轻量的模型

若出现 OOM，考虑：

- 用 API 模型（Claude、GPT）替代本地模型
- 将 `agents.defaults.model.primary` 设为更小模型

### 监控内存

```bash
free -h
htop
```

---

## 持久化

所有状态位于：

- `~/.openclaw/` — 配置、凭据、会话数据
- `~/.openclaw/workspace/` — workspace（SOUL.md、memory 等）

这些会在重启后保留。定期备份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Oracle Cloud 免费替代

Oracle Cloud 提供 **Always Free** ARM 实例，性能显著高于上述付费方案 —— $0/月。

| What you get      | Specs         |
| ----------------- | ------------- |
| **4 OCPUs**       | ARM Ampere A1 |
| **24GB RAM**      | 足够使用      |
| **200GB storage** | 块存储        |
| **Forever free**  | 永久免费      |

**注意事项：**

- 注册可能比较折腾（失败就重试）
- ARM 架构 — 大多可用，但部分二进制需要 ARM 构建

完整指南见 [Oracle Cloud](/zh/platforms/oracle)。注册与排障提示见这个 [社区指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)。

---

## Troubleshooting

### Gateway 无法启动

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl -u openclaw --no-pager -n 50
```

### 端口占用

```bash
lsof -i :18789
kill <PID>
```

### 内存不足

```bash
# 查看内存
free -h

# 添加更多 swap
# 或升级到 $12/mo droplet（2GB RAM）
```

---

## See Also

- [Hetzner guide](/zh/platforms/hetzner) — 更便宜、性能更好
