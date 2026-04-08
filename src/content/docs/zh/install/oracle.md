---
summary: "在 Oracle Cloud 的 Always Free ARM 层上托管 OpenClaw"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

# Oracle Cloud

在 Oracle Cloud 的 **Always Free** ARM 层（最多 4 个 OCPU，24 GB 内存，200 GB 存储）上免费运行持久的 OpenClaw Gateway(网关)。

## 先决条件

- Oracle Cloud 账户（[注册](https://www.oracle.com/cloud/free/)）——如果遇到问题，请参阅 [社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 账户（在 [tailscale.com](https://tailscale.com) 免费注册）
- 一个 SSH 密钥对
- 大约 30 分钟

## 设置

<Steps>
  <Step title="创建 OCI 实例">
    1. 登录 [Oracle Cloud 控制台](https://cloud.oracle.com/)。
    2. 导航至 **Compute > Instances > Create Instance**。
    3. 配置：
       - **Name：** `openclaw`
       - **Image：** Ubuntu 24.04 (aarch64)
       - **Shape：** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs：** 2（或最多 4 个）
       - **Memory：** 12 GB（或最多 24 GB）
       - **Boot volume：** 50 GB（最多 200 GB 免费）
       - **SSH key：** 添加您的公钥
    4. 点击 **Create** 并记录公网 IP 地址。

    <Tip>
    如果实例创建失败并显示 "Out of capacity"，请尝试更换其他可用性域或稍后重试。免费层容量有限。
    </Tip>

  </Step>

  <Step title="连接并更新系统">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` 是某些依赖项进行 ARM 编译所必需的。

  </Step>

  <Step title="配置用户和主机名">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    启用 linger 可以在注销后保持用户服务运行。

  </Step>

  <Step title="安装 Tailscale">
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=openclaw
    ```

    从现在起，通过 Tailscale 连接：`ssh ubuntu@openclaw`。

  </Step>

  <Step title="安装 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    source ~/.bashrc
    ```

    当系统提示“How do you want to hatch your bot?”时，选择 **Do this later**。

  </Step>

  <Step title="配置网关">
    使用令牌认证配合 Tailscale Serve 以实现安全的远程访问。

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    此处的 `gateway.trustedProxies=["127.0.0.1"]` 仅用于本地 Tailscale Serve 代理的转发 IP/本地客户端处理。它**不是** `gateway.auth.mode: "trusted-proxy"`。在此设置中，差异查看器路由保持故障关闭行为：没有转发代理头部的原始 `127.0.0.1` 查看器请求可能会返回 `Diff not found`。请使用 `mode=file` / `mode=both` 处理附件，或者如果需要可共享的查看器链接，可以有目的地启用远程查看器并设置 `plugins.entries.diffs.config.viewerBaseUrl`（或传递代理 `baseUrl`）。

  </Step>

  <Step title="锁定 VCN 安全">
    在网络边缘阻止除 Tailscale 之外的所有流量：

    1. 在 OCI 控制台中转到 **Networking > Virtual Cloud Networks**。
    2. 点击您的 VCN，然后点击 **Security Lists > Default Security List**。
    3. **移除**除 `0.0.0.0/0 UDP 41641` (Tailscale) 之外的所有入站规则。
    4. 保留默认出站规则（允许所有出站流量）。

    这会阻止网络边缘的 SSH (端口 22)、HTTP、HTTPS 以及其他所有流量。此后，您只能通过 Tailscale 进行连接。

  </Step>

  <Step title="验证">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
    tailscale serve status
    curl http://localhost:18789
    ```

    从 tailnet 上的任何设备访问控制 UI：

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    将 `<tailnet-name>` 替换为您的 tailnet 名称（在 `tailscale status` 中可见）。

  </Step>
</Steps>

## 备选方案：SSH 隧道

如果 Tailscale Serve 无法正常工作，请从您的本地计算机使用 SSH 隧道：

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然后打开 `http://localhost:18789`。

## 故障排除

**实例创建失败（"Out of capacity"）** -- 免费套餐的 ARM 实例非常受欢迎。请尝试不同的可用性域，或在非高峰时段重试。

**Tailscale 无法连接** -- 运行 `sudo tailscale up --ssh --hostname=openclaw --reset` 以重新进行身份验证。

**Gateway(网关) 无法启动** -- 运行 `openclaw doctor --non-interactive` 并使用 `journalctl --user -u openclaw-gateway.service -n 50` 检查日志。

**ARM 二进制文件问题** -- 大多数 npm 软件包都可以在 ARM64 上运行。对于原生二进制文件，请查找 `linux-arm64` 或 `aarch64` 版本。使用 `uname -m` 验证架构。

## 后续步骤

- [Channels](/en/channels) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway(网关) configuration](/en/gateway/configuration) -- 所有配置选项
- [Updating](/en/install/updating) -- 保持 OpenClaw 为最新状态
