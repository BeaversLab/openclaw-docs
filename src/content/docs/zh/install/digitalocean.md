---
summary: "OpenClawDigitalOcean在 DigitalOcean Droplet 上托管 OpenClaw"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOceanDigitalOcean"
---

在 DigitalOcean Droplet 上运行持久的 OpenClaw Gateway（1 GB 基础套餐约 $6/月）。

DigitalOcean 是最简单的付费 VPS 途径。如果您更喜欢更便宜或免费的选项：

- [Hetzner](Hetzner/en/install/hetzner) — €3.79/月，每美元可获更多核心/RAM。
- [Oracle Cloud](Oracle/en/install/oracle) — 永久免费 ARM（最高 4 OCPU，24 GB RAM），但注册可能比较繁琐且仅限 ARM。

## 先决条件

- DigitalOcean 账户（[注册](DigitalOceanhttps://cloud.digitalocean.com/registrations/new)）
- SSH 密钥对（或愿意使用密码认证）
- 大约 20 分钟

## 设置

<Steps>
  <Step title="创建 Droplet"DigitalOcean>
    <Warning>
    使用干净的镜像（Ubuntu 24.04 LTS）。除非您已审查过其启动脚本和防火墙默认设置，否则请避免使用第三方市场一键镜像。
    </Warning>

    1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)。
    2. 点击 **Create > Droplets**。
    3. 选择：
       - **Region：** 离您最近的区域
       - **Image：** Ubuntu 24.04 LTS
       - **Size：** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Authentication：** SSH 密钥（推荐）或密码
    4. 点击 **Create Droplet** 并记下 IP 地址。

  </Step>

  <Step title="连接并安装">
    ```bash
    ssh root@YOUR_DROPLET_IP

    apt update && apt upgrade -y

    # Install Node.js 24
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs

    # Install OpenClaw
    curl -fsSL https://openclaw.ai/install.sh | bash

    # Create the non-root user that will own OpenClaw state and services.
    adduser openclaw
    usermod -aG sudo openclaw
    loginctl enable-linger openclaw

    su - openclaw
    openclaw --version
    ```OpenClaw

    仅将 root shell 用于系统引导。以非 root `openclaw` 用户身份运行 OpenClaw 命令，以便状态保存在 `/home/openclaw/.openclaw/`Gateway(网关) 下，并且 Gateway 作为该用户的 systemd 服务安装。

  </Step>

  <Step title="运行新手引导">
    ```bash
    openclaw onboard --install-daemon
    ```

    向导将引导您完成模型认证、渠道设置、网关令牌生成以及守护进程安装（systemd）。

  </Step>

  <Step title="添加交换空间（推荐用于 1 GB Droplet）">
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ```
  </Step>

<Step title="验证网关">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="访问控制 UI">
    网关默认绑定到环回地址。请选择以下选项之一。

    **选项 A：SSH 隧道（最简单）**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    然后打开 `http://localhost:18789`Tailscale。

    **选项 B：Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sudo sh
    sudo tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    然后从 tailnet 上的任何设备打开 `https://<magicdns>/`TailscaleAPI。

    Tailscale Serve 通过 tailnet 身份标头对控制 UI 和 WebSocket 流量进行身份验证，这假设网关主机本身是受信任的。无论如何，HTTP API 端点都遵循网关的正常身份验证模式（令牌/密码）。如果需要通过 Serve 进行显式的共享密钥凭据验证，请设置 `gateway.auth.allowTailscale: false` 并使用 `gateway.auth.mode: "token"` 或 `"password"`。

    **选项 C：Tailnet 绑定（不使用 Serve）**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    然后打开 `http://<tailscale-ip>:18789`（需要令牌）。

  </Step>
</Steps>

## 持久化和备份

OpenClaw 状态位于：

- `~/.openclaw/` — `openclaw.json`，每个代理的 `auth-profiles.json`，渠道/提供商状态以及会话数据。
- `~/.openclaw/workspace/` — 代理工作区（SOUL.md，内存，产物）。

这些内容在 Droplet 重启后仍然存在。要创建可移植的快照：

```bash
openclaw backup create
```

DigitalOcean 快照会备份整个 Droplet；DigitalOcean`openclaw backup create` 可跨主机移植。

## 1 GB RAM 提示

6 美元的 Droplet 只有 1 GB RAM。为了保持运行流畅：

- 确保上面的交换空间步骤包含在 `/etc/fstab` 中，以便在重启后仍然有效。
- 优先使用基于 API 的模型（Claude, GPT）而非本地模型 —— 本地 LLM 推理无法在 1 GB 内存中运行。
- 如果在大型提示词上遇到 OOM（内存不足），请将 `agents.defaults.model.primary` 设置为更小的模型。
- 使用 `free -h` 和 `htop` 进行监控。

## 故障排除

**Gateway(网关) 无法启动** -- 运行 Gateway(网关)`openclaw doctor --non-interactive` 并使用 `journalctl --user -u openclaw-gateway.service -n 50` 检查日志。

**端口已被占用** -- 运行 `lsof -i :18789` 查找该进程，然后停止它。

**内存不足** -- 使用 `free -h`API 验证 swap 是否已激活。如果仍然遇到内存不足（OOM），请使用基于 API 的模型（Claude、GPT）而不是本地模型，或者升级到 2 GB 的 Droplet。

## 后续步骤

- [Channels](/zh/channelsTelegramWhatsAppDiscord) -- 连接 Telegram、WhatsApp、Discord 等平台
- [Gateway(网关) 配置](<Gateway(网关)/en/gateway/configuration>) -- 所有配置选项
- [更新](/zh/install/updatingOpenClaw) -- 保持 OpenClaw 为最新版本

## 相关内容

- [安装概览](/zh/install)
- [Fly.io](Fly.io/en/install/fly)
- [Hetzner](Hetzner/en/install/hetzner)
- [VPS 托管](/zh/vps)
