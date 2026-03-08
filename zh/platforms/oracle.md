---
summary: "在 Oracle Cloud（Always Free ARM）上运行 OpenClaw"
read_when:
  - 在 Oracle Cloud 上部署 OpenClaw
  - 寻找低成本 OpenClaw VPS 托管方案
  - 想让 OpenClaw 24/7 运行在小服务器上
title: "Oracle 云"
---

# OpenClaw on Oracle Cloud (OCI)

## 目标

在 Oracle Cloud 的 **Always Free** ARM 套餐上运行持久化 OpenClaw Gateway。

Oracle 免费层很适合 OpenClaw（尤其你已有 OCI 账号），但有取舍：

- ARM 架构（大多可用，但部分二进制可能只提供 x86）
- 容量与注册可能比较挑剔

## 成本对比（2026）

| Provider     | Plan            | Specs                  | Price/mo | Notes             |
| ------------ | --------------- | ---------------------- | -------- | ----------------- |
| Oracle Cloud | Always Free ARM | up to 4 OCPU, 24GB RAM | $0       | ARM，容量有限     |
| Hetzner      | CX22            | 2 vCPU, 4GB RAM        | ~ $4     | 最便宜付费选项    |
| DigitalOcean | Basic           | 1 vCPU, 1GB RAM        | $6       | UI 简单，文档完善 |
| Vultr        | Cloud Compute   | 1 vCPU, 1GB RAM        | $6       | 机房多            |
| Linode       | Nanode          | 1 vCPU, 1GB RAM        | $5       | 现属 Akamai       |

---

## 前置条件

- Oracle Cloud 账号（[signup](https://www.oracle.com/cloud/free/)）— 若遇问题，参考 [社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 账号（[tailscale.com](https://tailscale.com)，免费）
- ~30 分钟

## 1) 创建 OCI 实例

1. 登录 [Oracle Cloud Console](https://cloud.oracle.com/)
2. 进入 **Compute → Instances → Create Instance**
3. 配置：
   - **Name:** `openclaw`
   - **Image:** Ubuntu 24.04 (aarch64)
   - **Shape:** `VM.Standard.A1.Flex`（Ampere ARM）
   - **OCPUs:** 2（或最高 4）
   - **Memory:** 12 GB（或最高 24 GB）
   - **Boot volume:** 50 GB（免费最高 200 GB）
   - **SSH key:** 添加你的公钥
4. 点击 **Create**
5. 记下公网 IP

**提示：** 若提示 “Out of capacity”，换可用区或稍后重试。免费层容量有限。

## 2) 连接并更新

```bash
# Connect via public IP
ssh ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**注意：** `build-essential` 用于 ARM 上某些依赖编译。

## 3) 配置用户与主机名

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

这会启用 Tailscale SSH，你可通过 `ssh openclaw` 从 tailnet 内任意设备连接 —— 无需公网 IP。

验证：

```bash
tailscale status
```

**从此使用 Tailscale 连接：** `ssh ubuntu@openclaw`（或使用 Tailscale IP）。

## 5) 安装 OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc
```

当出现 “How do you want to hatch your bot?” 时，选择 **"Do this later"**。

> 注意：若遇 ARM 构建问题，先安装系统包（如 `sudo apt install -y build-essential`），再考虑 Homebrew。

## 6) 配置 Gateway（loopback + token 认证）并启用 Tailscale Serve

默认使用 token 认证，稳定可控，避免 Control UI 使用不安全标志。

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

## 8) 收紧 VCN 安全

现在一切正常后，收紧 VCN，只保留 Tailscale 相关流量。OCI 的 VCN 作为网络边界防火墙，在流量到达实例前就被拦截。

1. 在 OCI 控制台进入 **Networking → Virtual Cloud Networks**
2. 点击你的 VCN → **Security Lists** → Default Security List
3. **移除**所有入站规则，仅保留：
   - `0.0.0.0/0 UDP 41641`（Tailscale）
4. 保留默认出站规则（允许所有出站）

这会在网络边界阻断 22 端口 SSH、HTTP、HTTPS 等。之后只能通过 Tailscale 连接。

---

## 访问 Control UI

在你的 Tailscale 网络任意设备上：

```
https://openclaw.<tailnet-name>.ts.net/
```

将 `<tailnet-name>` 替换为你的 tailnet 名称（`tailscale status` 可见）。

无需 SSH 隧道。Tailscale 提供：

- 自动 HTTPS 证书
- Tailscale 身份认证
- tailnet 内任意设备访问（笔记本、手机等）

---

## 安全：VCN + Tailscale（推荐基线）

VCN 收紧（仅 UDP 41641）+ Gateway loopback 绑定，可获得强防御纵深：公网流量在网络边界被阻断，管理访问通过 tailnet。

这通常**不再需要**额外的主机防火墙来阻止 SSH 爆破 —— 但仍应保持系统更新、运行 `openclaw security audit`，并确认没有意外监听公网接口。

### 已经保护的项

| Traditional Step   | Needed?     | Why                                      |
| ------------------ | ----------- | ---------------------------------------- |
| UFW firewall       | No          | VCN 在流量到达实例前阻断                 |
| fail2ban           | No          | VCN 阻断 22 端口，无暴力破解             |
| sshd hardening     | No          | Tailscale SSH 不使用 sshd                |
| Disable root login | No          | Tailscale 使用身份认证，不依赖系统用户   |
| SSH key-only auth  | No          | Tailscale 通过 tailnet 身份认证          |
| IPv6 hardening     | Usually not | 取决于 VCN/子网设置；需确认实际分配/暴露 |

### 仍建议

- **凭据权限：** `chmod 700 ~/.openclaw`
- **安全审计：** `openclaw security audit`
- **系统更新：** 定期 `sudo apt update && sudo apt upgrade`
- **监控 Tailscale：** 在 [Tailscale admin console](https://login.tailscale.com/admin) 检查设备

### 验证安全状态

```bash
# Confirm no public ports listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely
sudo systemctl disable --now ssh
```

---

## 备选：SSH 隧道

如果 Tailscale Serve 不可用，可用 SSH 隧道：

```bash
# From your local machine (via Tailscale)
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然后打开 `http://localhost:18789`。

---

## Troubleshooting

### 实例创建失败（"Out of capacity"）

免费 ARM 实例很热门。可尝试：

- 换可用区
- 在非高峰时段重试（清晨）
- 选择 shape 时使用 “Always Free” 过滤

### Tailscale 无法连接

```bash
# Check status
sudo tailscale status

# Re-authenticate
sudo tailscale up --ssh --hostname=openclaw --reset
```

### Gateway 无法启动

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway -n 50
```

### 无法访问 Control UI

```bash
# Verify Tailscale Serve is running
tailscale serve status

# Check gateway is listening
curl http://localhost:18789

# Restart if needed
systemctl --user restart openclaw-gateway
```

### ARM 二进制问题

某些工具可能没有 ARM 版本。检查：

```bash
uname -m  # Should show aarch64
```

多数 npm 包可用。二进制请寻找 `linux-arm64` 或 `aarch64` 发布版本。

---

## 持久化

所有状态位于：

- `~/.openclaw/` — 配置、凭据、会话数据
- `~/.openclaw/workspace/` — workspace（SOUL.md、memory、产物）

定期备份：

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## See Also

- [Gateway 远程 access](/zh/gateway/remote) — 其他远程访问方案
- [Tailscale integration](/zh/gateway/tailscale) — 完整 Tailscale 文档
- [Gateway 配置](/zh/gateway/configuration) — 全部配置项
- [DigitalOcean guide](/zh/platforms/digitalocean) — 若你想要付费 + 更好注册体验
- [Hetzner guide](/zh/platforms/hetzner) — Docker 方案替代
