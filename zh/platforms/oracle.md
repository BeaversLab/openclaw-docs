---
summary: "OpenClaw on Oracle Cloud (Always Free ARM)"
read_when:
  - 在 Oracle Cloud 上设置 OpenClaw
  - 寻找低成本的 OpenClaw VPS 托管
  - 想要在小型服务器上全天候 24/7 运行 OpenClaw
title: "Oracle Cloud"
---

# OpenClaw on Oracle Cloud (OCI)

## 目标

在 Oracle Cloud 的 **Always Free** ARM 层上运行持久化的 OpenClaw Gateway(网关)。

Oracle 的免费层非常适合 OpenClaw（尤其是如果您已经拥有 OCI 账户），但它也有一些取舍：

- ARM 架构（大多数东西都可以运行，但某些二进制文件可能仅限 x86）
- 容量和注册可能会比较棘手

## 成本比较 (2026)

| 提供商       | 方案            | 规格                  | 月费 | 备注                     |
| ------------ | --------------- | --------------------- | ---- | ------------------------ |
| Oracle Cloud | Always Free ARM | 高达 4 OCPU, 24GB RAM | $0   | ARM，容量有限            |
| Hetzner      | CX22            | 2 vCPU, 4GB RAM       | ~ $4 | 最便宜的付费选项         |
| DigitalOcean | Basic           | 1 vCPU, 1GB RAM       | $6   | 界面简单，文档齐全       |
| Vultr        | Cloud Compute   | 1 vCPU, 1GB RAM       | $6   | 数据中心众多             |
| Linode       | Nanode          | 1 vCPU, 1GB RAM       | $5   | 现已成为 Akamai 的一部分 |

---

## 先决条件

- Oracle Cloud 账户（[注册](https://www.oracle.com/cloud/free/)） — 如果遇到问题，请参阅[社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 账户（在 [tailscale.com](https://tailscale.com) 上免费注册）
- 约 30 分钟

## 1) 创建 OCI 实例

1. 登录到 [Oracle Cloud Console](https://cloud.oracle.com/)
2. 导航至 **Compute → Instances → Create Instance**
3. 配置：
   - **Name:** `openclaw`
   - **Image:** Ubuntu 24.04 (aarch64)
   - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)
   - **OCPUs:** 2 (或最多 4 个)
   - **Memory:** 12 GB (或最多 24 GB)
   - **Boot volume:** 50 GB (最多 200 GB 免费)
   - **SSH key:** 添加您的公钥
4. 点击 **Create**
5. 记下公共 IP 地址

**提示：** 如果实例创建失败并显示“Out of capacity”（容量不足），请尝试不同的可用性域或稍后重试。免费层的容量是有限的。

## 2) 连接并更新

```bash
# Connect via public IP
ssh ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**注意：** ARM 编译某些依赖项需要 `build-essential`。

## 3) 配置用户和主机名

```bash
# Set hostname
sudo hostnamectl set-hostname openclaw

# Set password for ubuntu user
sudo passwd ubuntu

# Enable lingering (keeps user services running after logout)
sudo loginctl enable-linger ubuntu
```

## 4) 安装 Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw
```

这将启用 Tailscale SSH，因此您可以从 tailnet 上的任何设备通过 `ssh openclaw` 连接 — 无需公共 IP。

验证：

```bash
tailscale status
```

**从现在起，通过 Tailscale 连接：** `ssh ubuntu@openclaw` (或使用 Tailscale IP)。

## 5) 安装 OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc
```

当提示“你希望如何孵化你的机器人？”时，选择 **“稍后执行”**。

> 注意：如果遇到 ARM 原生构建问题，请在尝试使用 Homebrew 之前先从系统软件包（例如 `sudo apt install -y build-essential`）开始。

## 6) 配置 Gateway(网关)（环回 + 令牌认证）并启用 Tailscale Serve

默认使用令牌认证。这种方式可预测，并且避免了需要任何“不安全认证”控制 UI 标志。

```bash
# Keep the Gateway private on the VM
openclaw config set gateway.bind loopback

# Require auth for the Gateway + Control UI
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token

# Expose over Tailscale Serve (HTTPS + tailnet access)
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart openclaw-gateway
```

## 7) 验证

```bash
# Check version
openclaw --version

# Check daemon status
systemctl --user status openclaw-gateway

# Check Tailscale Serve
tailscale serve status

# Test local response
curl http://localhost:18789
```

## 8) 锁定 VCN 安全

既然一切正常，请锁定 VCN 以阻止除 Tailscale 之外的所有流量。OCI 的虚拟云网络充当网络边缘的防火墙——流量在到达实例之前就被阻止了。

1. 在 OCI 控制台中，转到 **Networking → Virtual Cloud Networks**
2. 点击你的 VCN → **Security Lists** → Default Security List
3. **移除**所有入站规则，除了：
   - `0.0.0.0/0 UDP 41641` (Tailscale)
4. 保留默认出站规则（允许所有出站）

这会在网络边缘阻止端口 22 上的 SSH、HTTP、HTTPS 以及其他所有内容。从现在起，你只能通过 Tailscale 进行连接。

---

## 访问控制 UI

从你的 Tailscale 网络上的任何设备：

```
https://openclaw.<tailnet-name>.ts.net/
```

将 `<tailnet-name>` 替换为你的 tailnet 名称（在 `tailscale status` 中可见）。

无需 SSH 隧道。Tailscale 提供：

- HTTPS 加密（自动证书）
- 通过 %%PH:GLOSSARY:76:9699d7a1\*\* 身份进行身份验证
- 从你 tailnet 上的任何设备（笔记本电脑、手机等）进行访问

---

## 安全性：VCN + Tailscale（推荐基线）

随着 VCN 被锁定（仅开放 UDP 41641）并且 Gateway(网关) 绑定到环回，你可以获得强大的深度防御：公共流量在网络边缘被阻止，而管理员访问通过你的 tailnet 进行。

这种设置通常消除了纯粹为了阻止全网 SSH 暴力破解而对额外基于主机的防火墙规则的 _需求_ ——但你仍应保持操作系统更新，运行 `openclaw security audit`，并验证你没有意外地在公共接口上监听。

### 已受保护

| 传统步骤        | 需要吗？   | 原因                                               |
| --------------- | ---------- | -------------------------------------------------- |
| UFW 防火墙      | 否         | VCN 在流量到达实例之前将其阻止                     |
| fail2ban        | 否         | 如果端口 22 在 VCN 处被阻止，则不会受到暴力破解    |
| sshd 加固       | 否         | Tailscale SSH 不使用 sshd                          |
| 禁用 root 登录  | 否         | Tailscale 使用 Tailscale 身份，而不是系统用户      |
| 仅 SSH 密钥认证 | 否         | Tailscale 通过你的 tailnet 进行身份验证            |
| IPv6 加固       | 通常不需要 | 取决于您的 VCN/子网设置；请验证实际分配/暴露的内容 |

### 仍然推荐

- **凭证权限：** `chmod 700 ~/.openclaw`
- **安全审计：** `openclaw security audit`
- **系统更新：** 定期运行 `sudo apt update && sudo apt upgrade`
- **监控 Tailscale：** 在 [Tailscale 管理控制台](https://login.tailscale.com/admin) 中查看设备

### 验证安全态势

```bash
# Confirm no public ports listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely
sudo systemctl disable --now ssh
```

---

## 备用方案：SSH 隧道

如果 Tailscale Serve 无法工作，请使用 SSH 隧道：

```bash
# From your local machine (via Tailscale)
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然后打开 `http://localhost:18789`。

---

## 故障排除

### 实例创建失败（“容量不足”）

免费层 ARM 实例很受欢迎。请尝试：

- 不同的可用性域
- 在非高峰时段重试（清晨）
- 在选择配置时使用“Always Free”筛选器

### Tailscale 无法连接

```bash
# Check status
sudo tailscale status

# Re-authenticate
sudo tailscale up --ssh --hostname=openclaw --reset
```

### Gateway(网关) 无法启动

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway -n 50
```

### 无法访问控制 UI

```bash
# Verify Tailscale Serve is running
tailscale serve status

# Check gateway is listening
curl http://localhost:18789

# Restart if needed
systemctl --user restart openclaw-gateway
```

### ARM 二进制文件问题

某些工具可能没有 ARM 版本。请检查：

```bash
uname -m  # Should show aarch64
```

大多数 npm 包都能正常工作。对于二进制文件，请查找 `linux-arm64` 或 `aarch64` 版本。

---

## 持久化

所有状态存在于：

- `~/.openclaw/` — 配置、凭证、会话数据
- `~/.openclaw/workspace/` — 工作区（SOUL.md、记忆、工件）

定期备份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## 另请参阅

- [Gateway(网关) 远程访问](/zh/gateway/remote) — 其他远程访问模式
- [Tailscale 集成](/zh/gateway/tailscale) — 完整的 Tailscale 文档
- [Gateway(网关) 配置](/zh/gateway/configuration) — 所有配置选项
- [DigitalOcean 指南](/zh/platforms/digitalocean) — 如果您需要付费 + 更简单的注册
- [Hetzner 指南](/zh/install/hetzner) — 基于 Docker 的替代方案

import zh from "/components/footer/zh.mdx";

<zh />
