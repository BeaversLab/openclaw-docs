---
summary: "使用 OpenClaw、Ansible VPN 和防火墙隔离进行自动化、加固的 Tailscale 安装"
read_when:
  - You want automated server deployment with security hardening
  - You need firewall-isolated setup with VPN access
  - You're deploying to remote Debian/Ubuntu servers
title: "Ansible"
---

# Ansible 安装

使用 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** 将 OpenClaw 部署到生产服务器 —— 这是一款具有安全优先架构的自动化安装程序。

<Info>
  [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) 仓库是 Ansible
  部署的事实来源。本页面仅作快速概览。
</Info>

## 先决条件

| 需求         | 详情                            |
| ------------ | ------------------------------- |
| **操作系统** | Debian 11+ 或 Ubuntu 20.04+     |
| **访问权限** | Root 或 sudo 权限               |
| **网络**     | 用于安装软件包的互联网连接      |
| **Ansible**  | 2.14+（由快速入门脚本自动安装） |

## 您将获得

- **防火墙优先的安全性** —— UFW + Docker 隔离（仅 SSH + Tailscale 可访问）
- **Tailscale VPN** —— 安全的远程访问，无需公开暴露服务
- **Docker** —— 隔离的沙箱容器，仅限本地主机绑定
- **纵深防御** —— 4 层安全架构
- **Systemd 集成** —— 开机自启动并带有安全加固
- **单命令设置** —— 数分钟内完成部署

## 快速开始

单命令安装：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

## 安装内容

Ansible playbook 将安装并配置以下内容：

1. **Tailscale** —— 用于安全远程访问的网格 VPN
2. **UFW 防火墙** —— 仅开放 SSH + Tailscale 端口
3. **Docker CE + Compose V2** —— 用于代理沙箱
4. **Node.js 24 + pnpm** —— 运行时依赖（Node 22 LTS，目前为 `22.16+`，仍受支持）
5. **OpenClaw** —— 基于主机，非容器化
6. **Systemd 服务** —— 自动启动并带有安全加固

<Note>
  网关直接在主机上运行（不在 Docker 中），但代理沙箱使用 Docker 进行 隔离。详情请参阅
  [沙箱隔离](/zh/gateway/sandboxing)。
</Note>

## 安装后设置

<Steps>
  <Step title="Switch to the openclaw user">```bash sudo -i -u openclaw ```</Step>
  <Step title="运行新手向导">安装后脚本将指导您完成 OpenClaw 设置的配置。</Step>
  <Step title="连接消息提供商">
    登录 WhatsApp、Telegram、Discord 或 Signal： ```bash openclaw channels login ```
  </Step>
  <Step title="验证安装">
    ```bash sudo systemctl status openclaw sudo journalctl -u openclaw -f ```
  </Step>
  <Step title="连接到 Tailscale">加入您的 VPN 网状网络以进行安全的远程访问。</Step>
</Steps>

### 快速命令

```bash
# Check service status
sudo systemctl status openclaw

# View live logs
sudo journalctl -u openclaw -f

# Restart gateway
sudo systemctl restart openclaw

# Provider login (run as openclaw user)
sudo -i -u openclaw
openclaw channels login
```

## 安全架构

该部署使用了 4 层防御模型：

1. **防火墙 (UFW)** —— 仅公开 SSH (22) + Tailscale (41641/udp)
2. **VPN (Tailscale)** —— 网关只能通过 VPN 网状网络访问
3. **Docker 隔离** —— DOCKER-USER iptables 链防止外部端口暴露
4. **Systemd 强化** —— NoNewPrivileges、PrivateTmp、非特权用户

要验证您的外部攻击面：

```bash
nmap -p- YOUR_SERVER_IP
```

只有端口 22 (SSH) 应该是开放的。所有其他服务（网关、Docker）都已锁定。

安装 Docker 是为了用于代理沙箱（隔离的工具执行），而不是为了运行网关本身。有关沙箱配置，请参阅 [Multi-Agent 沙箱 and Tools](/en/tools/multi-agent-sandbox-tools)。

## 手动安装

如果您更喜欢手动控制而非自动化：

<Steps>
  <Step title="Install prerequisites">
    ```bash
    sudo apt update && sudo apt install -y ansible git
    ```
  </Step>
  <Step title="Clone the repository">
    ```bash
    git clone https://github.com/openclaw/openclaw-ansible.git
    cd openclaw-ansible
    ```
  </Step>
  <Step title="Install Ansible collections">
    ```bash
    ansible-galaxy collection install -r requirements.yml
    ```
  </Step>
  <Step title="运行 playbook">
    ```bash
    ./run-playbook.sh
    ```

    或者，直接运行，然后手动执行后续的设置脚本：
    ```bash
    ansible-playbook playbook.yml --ask-become-pass
    # Then run: /tmp/openclaw-setup.sh
    ```

  </Step>
</Steps>

## 更新

Ansible 安装程序将 OpenClaw 设置为手动更新。有关标准更新流程，请参阅 [Updating](/en/install/updating)。

要重新运行 Ansible playbook（例如，用于配置更改）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

这是幂等的，并且可以安全地多次运行。

## 故障排除

<AccordionGroup>
  <Accordion title="防火墙阻止了我的连接">
    - 首先确保您可以通过 Tailscale VPN 访问
    - 始终允许 SSH 访问（端口 22）
    - 按照设计，网关只能通过 Tailscale 访问
  </Accordion>
  <Accordion title="服务无法启动">
    ```bash
    # Check logs
    sudo journalctl -u openclaw -n 100

    # Verify permissions
    sudo ls -la /opt/openclaw

    # Test manual start
    sudo -i -u openclaw
    cd ~/openclaw
    openclaw gateway run
    ```

  </Accordion>
  <Accordion title="Docker sandbox issues">
    ```bash
    # Verify Docker is running
    sudo systemctl status docker

    # Check sandbox image
    sudo docker images | grep openclaw-sandbox

    # Build sandbox image if missing
    cd /opt/openclaw/openclaw
    sudo -u openclaw ./scripts/sandbox-setup.sh
    ```

  </Accordion>
  <Accordion title="提供商登录失败">
    确保您正以 `openclaw` 用户身份运行：
    ```bash
    sudo -i -u openclaw
    openclaw channels login
    ```
  </Accordion>
</AccordionGroup>

## 高级配置

有关详细的安全架构和故障排除，请参阅 openclaw-ansible 仓库：

- [安全架构](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [技术详情](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [故障排除指南](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相关

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) -- 完整部署指南
- [Docker](/en/install/docker) -- 容器化网关设置
- [沙箱隔离](/en/gateway/sandboxing) -- 代理沙箱配置
- [多代理沙箱和工具](/en/tools/multi-agent-sandbox-tools) -- 每个代理隔离

import zh from "/components/footer/zh.mdx";

<zh />
