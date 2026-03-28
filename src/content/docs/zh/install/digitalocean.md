---
summary: "在 DigitalOcean Droplet 上托管 OpenClaw"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

# DigitalOcean

在 DigitalOcean Droplet 上运行持久化的 OpenClaw Gateway(网关)。

## 先决条件

- DigitalOcean 账户 ([注册](https://cloud.digitalocean.com/registrations/new))
- SSH 密钥对（或愿意使用密码认证）
- 大约 20 分钟

## 设置

<Steps>
  <Step title="创建 Droplet">
    <Warning>
    请使用纯净的基础镜像（Ubuntu 24.04 LTS）。除非您已审查过第三方 Marketplace 一键镜像的启动脚本和防火墙默认设置，否则请避免使用它们。
    </Warning>

    1. 登录 [DigitalOcean](https://cloud.digitalocean.com/)。
    2. 点击 **Create > Droplets**。
    3. 选择：
       - **Region（区域）：** 距离您最近的区域
       - **Image（镜像）：** Ubuntu 24.04 LTS
       - **Size（规格）：** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Authentication（认证）：** SSH 密钥（推荐）或密码
    4. 点击 **Create Droplet** 并记录 IP 地址。

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
    openclaw --version
    ```

  </Step>

  <Step title="运行新手引导">
    ```bash
    openclaw onboard --install-daemon
    ```

    向导将引导您完成模型认证、渠道设置、网关令牌生成和守护程序安装（systemd）。

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

  <Step title="访问控制界面">
    网关默认绑定到环回地址。请选择以下选项之一。

    **选项 A：SSH 隧道（最简单）**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    然后打开 `http://localhost:18789`。

    **选项 B：Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    然后从 tailnet 上的任何设备打开 `https://<magicdns>/`。

    **选项 C：Tailnet 绑定（不使用 Serve）**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    然后打开 `http://<tailscale-ip>:18789`（需要令牌）。

  </Step>
</Steps>

## 故障排除

**Gateway(网关) 无法启动** -- 运行 `openclaw doctor --non-interactive` 并使用 `journalctl --user -u openclaw-gateway.service -n 50` 检查日志。

**端口已被占用** -- 运行 `lsof -i :18789` 查找进程，然后将其停止。

**内存不足** -- 使用 `free -h` 验证交换空间是否处于活动状态。如果仍然遇到内存不足（OOM），请使用基于 API 的模型（Claude、GPT）而不是本地模型，或者升级到 2 GB 的 Droplet。

## 后续步骤

- [频道](/en/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway(网关) 配置](/en/gateway/configuration) -- 所有配置选项
- [更新](/en/install/updating) -- 保持 OpenClaw 为最新版本
