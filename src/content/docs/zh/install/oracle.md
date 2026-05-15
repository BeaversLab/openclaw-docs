---
summary: "OpenClawOracle在 Oracle Cloud 的 Always Free ARM 层上托管 OpenClaw"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "OracleOracle Cloud"
---

在 Oracle Cloud 的 **Always Free** ARM 层（最高 4 个 OCPU，24 GB 内存，200 GB 存储）上免费运行持久的 OpenClaw Gateway(网关)。

## 先决条件

- Oracle Cloud 帐户（[注册](Oraclehttps://www.oracle.com/cloud/free/)）——如果遇到问题，请参阅[社区注册指南](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd)
- Tailscale 帐户（在 [tailscale.com](Tailscalehttps://tailscale.com) 上免费）
- 一个 SSH 密钥对
- 大约 30 分钟

## 设置

<Steps>
  <Step title="创建 OCI 实例"Oracle>
    1. 登录 [Oracle Cloud 控制台](https://cloud.oracle.com/)。
    2. 导航到 **Compute > Instances > Create Instance**。
    3. 配置：
       - **Name:** `openclaw`
       - **Image:** Ubuntu 24.04 (aarch64)
       - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs:** 2（最多 4 个）
       - **Memory:** 12 GB（最多 24 GB）
       - **Boot volume:** 50 GB（最多 200 GB 免费空间）
       - **SSH key:** 添加您的公钥
    4. 点击 **Create** 并记录公共 IP 地址。

    <Tip>
    如果实例创建失败并提示“Out of capacity”，请尝试不同的可用性域或稍后重试。免费层容量有限。
    </Tip>

  </Step>

  <Step title="连接并更新系统">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` 是编译某些依赖项的 ARM 版本所必需的。

  </Step>

  <Step title="配置用户和主机名">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    启用 linger 可使用户服务在注销后继续运行。

  </Step>

  <Step title="Tailscale安装 Tailscale">
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=openclaw
    ```Tailscale

    从现在开始，请通过 Tailscale 连接：`ssh ubuntu@openclaw`。

  </Step>

  <Step title="OpenClaw安装 OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    source ~/.bashrc
    ```

    当提示“How do you want to hatch your bot?”时，选择 **Do this later**。

  </Step>

  <Step title="配置 Gateway"Tailscale>
    使用令牌认证结合 Tailscale Serve 以实现安全的远程访问。

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    此处的 `gateway.trustedProxies=["127.0.0.1"]`Tailscale 仅用于本地 Tailscale Serve 代理的转发 IP/本地客户端处理。它**不是** `gateway.auth.mode: "trusted-proxy"`。在此配置中，Diff 查看器路由保持故障关闭行为：没有转发代理头的原始 `127.0.0.1` 查看器请求可能会返回 `Diff not found`。使用 `mode=file` / `mode=both` 处理附件，或者如果您需要可共享的查看器链接，请有意启用远程查看器并设置 `plugins.entries.diffs.config.viewerBaseUrl`（或传递代理 `baseUrl`）。

  </Step>

  <Step title="锁定 VCN 安全"Tailscale>
    在网络边缘拦截除 Tailscale 之外的所有流量：

    1. 在 OCI 控制台中，前往 **Networking > Virtual Cloud Networks**。
    2. 点击您的 VCN，然后点击 **Security Lists > Default Security List**。
    3. **移除**除了 `0.0.0.0/0 UDP 41641`TailscaleTailscale (Tailscale) 之外的所有入站规则。
    4. 保留默认的出站规则（允许所有出站流量）。

    这会在网络边缘屏蔽端口 22 上的 SSH、HTTP、HTTPS 以及其他所有内容。从此时起，您只能通过 Tailscale 进行连接。

  </Step>

  <Step title="验证">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
    tailscale serve status
    curl http://localhost:18789
    ```

    从您 tailnet 上的任何设备访问控制 UI：

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    将 `<tailnet-name>` 替换为您的 tailnet 名称（在 `tailscale status` 中可见）。

  </Step>
</Steps>

## 验证安全态势

由于 VCN 已锁定（仅开放 UDP 41641）且 Gateway 绑定到 loopback，公共流量在网络边缘被拦截，且管理员访问仅限 tailnet。这消除了对许多传统 VPS 加固步骤的需求：

| 传统步骤        | 是否需要？ | 原因                                                      |
| --------------- | ---------- | --------------------------------------------------------- |
| UFW 防火墙      | 否         | VCN 会在流量到达实例之前将其拦截。                        |
| fail2ban        | 否         | 端口 22 在 VCN 处被拦截；没有暴力破解的攻击面。           |
| sshd 加固       | 否         | Tailscale SSH 不使用 sshd。                               |
| 禁用 root 登录  | 否         | Tailscale 通过 tailnet 身份进行身份验证，而不是系统用户。 |
| 仅 SSH 密钥认证 | 否         | 相同 — tailnet 身份取代了系统 SSH 密钥。                  |
| IPv6 加固       | 通常不需要 | 取决于 VCN/子网设置；请验证实际分配/暴露的内容。          |

仍然建议：

- `chmod 700 ~/.openclaw` 用于限制凭证文件权限。
- `openclaw security audit` 用于针对 OpenClaw 的特定姿态检查。
- 定期 `sudo apt update && sudo apt upgrade` 以进行操作系统补丁更新。
- 定期在 [Tailscale 管理控制台](https://login.tailscale.com/admin) 中检查设备。

快速验证命令：

```bash
# Confirm no public ports are listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely once Tailscale SSH is confirmed working
sudo systemctl disable --now ssh
```

## ARM 说明

Always Free 层是 ARM (`aarch64`)。大多数 OpenClaw 功能运行良好；少量原生二进制文件需要 ARM 构建：

- Node.js、Telegram、WhatsApp (Baileys)：纯 JavaScript，没有问题。
- 大多数带有原生代码的 npm 包：提供预构建的 `linux-arm64` 制品。
- 可选的 CLI 辅助工具（例如技能附带的 Go/Rust 二进制文件）：在安装之前检查是否有 `aarch64` / `linux-arm64` 版本。

使用 `uname -m` 验证架构（应该打印 `aarch64`）。对于没有 ARM 构建的二进制文件，请从源代码安装或跳过它们。

## 持久化和备份

OpenClaw 状态位于：

- `~/.openclaw/` — `openclaw.json`，每个代理的 `auth-profiles.json`，渠道/提供商状态和会话数据。
- `~/.openclaw/workspace/` — 代理工作区（SOUL.md、记忆、制品）。

这些内容在重启后仍然保留。要创建可移植的快照：

```bash
openclaw backup create
```

## 回退方案：SSH 隧道

如果 Tailscale Serve 不工作，请从本地计算机使用 SSH 隧道：

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

然后打开 `http://localhost:18789`。

## 故障排除

**实例创建失败（“容量不足”）** -- 免费层 ARM 实例很受欢迎。请尝试不同的可用性域或在非高峰时段重试。

**Tailscale 无法连接** -- 运行 Tailscale`sudo tailscale up --ssh --hostname=openclaw --reset` 以重新进行身份验证。

**Gateway(网关) 无法启动** -- 运行 Gateway(网关)`openclaw doctor --non-interactive` 并使用 `journalctl --user -u openclaw-gateway.service -n 50` 检查日志。

**ARM 二进制文件问题** -- 大多数 npm 包在 ARM64 上运行。对于原生二进制文件，请查找 npm`linux-arm64` 或 `aarch64` 版本。使用 `uname -m` 验证架构。

## 后续步骤

- [Channels](/zh/channelsTelegramWhatsAppDiscord) -- 连接 Telegram、WhatsApp、Discord 等
- [Gateway(网关) configuration](<Gateway(网关)/en/gateway/configuration>) -- 所有配置选项
- [Updating](/zh/install/updatingOpenClaw) -- 保持 OpenClaw 为最新版本

## 相关

- [Install overview](/zh/install)
- [GCP](GCP/en/install/gcp)
- [VPS hosting](/zh/vps)
