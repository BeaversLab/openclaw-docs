---
summary: "使用 Ansible、Tailscale VPN 和防火墙隔离进行自动化、加固的 OpenClaw 安装"
read_when:
  - You want automated server deployment with security hardening
  - You need firewall-isolated setup with VPN access
  - You're deploying to remote Debian/Ubuntu servers
title: "Ansible"
---

# Ansible 安装

将 OpenClaw 部署到生产服务器的推荐方式是通过 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** —— 一种采用安全优先架构的自动化安装程序。

## 快速开始

单命令安装：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

> **📦 完整指南：[github.com/openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**
>
> openclaw-ansible 仓库是 Ansible 部署的真实来源。本页面是一个快速概览。

## 您将获得

- 🔒 **防火墙优先的安全**：UFW + Docker 隔离（仅 SSH + Tailscale 可访问）
- 🔐 **Tailscale VPN**：安全的远程访问，无需公开暴露服务
- 🐳 **Docker**：隔离的沙箱容器，仅本地主机绑定
- 🛡️ **纵深防御**：4层安全架构
- 🚀 **一键设置**：数分钟内完成部署
- 🔧 **Systemd 集成**：开机自启并带安全加固

## 要求

- **操作系统**：Debian 11+ 或 Ubuntu 20.04+
- **权限**：Root 或 sudo 权限
- **网络**：用于软件包安装的互联网连接
- **Ansible**：2.14+（由快速入门脚本自动安装）

## 安装内容

Ansible playbook 将安装和配置以下内容：

1. **Tailscale**（用于安全远程访问的网状 VPN）
2. **UFW 防火墙**（仅开放 SSH + Tailscale 端口）
3. **Docker CE + Compose V2**（用于代理沙箱）
4. **Node.js 24 + pnpm**（运行时依赖；Node 22 LTS，目前为 `22.16+`，为保持兼容性仍受支持）
5. **OpenClaw**（基于主机，非容器化）
6. **Systemd 服务**（带安全加固的自动启动）

注意：网关 **直接在主机上运行**（不在 Docker 中），但代理沙箱使用 Docker 进行隔离。详情请参阅 [沙箱隔离](/zh/gateway/sandboxing)。

## 安装后设置

安装完成后，切换到 openclaw 用户：

```bash
sudo -i -u openclaw
```

安装后脚本将引导您完成以下步骤：

1. **入职向导**：配置 OpenClaw 设置
2. **提供商登录**：连接 WhatsApp/Telegram/Discord/Signal
3. **Gateway 网关 测试**：验证安装
4. **Tailscale 设置**：连接到您的 VPN 网络

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

### 4 层防御

1. **防火墙**：仅 SSH (22) + Tailscale (41641/udp) 向公网暴露
2. **VPN (Tailscale)**：Gateway 网关 仅可通过 VPN 网络访问
3. **Docker 隔离**：DOCKER-USER iptables 链防止外部端口暴露
4. **Systemd 加固**：NoNewPrivileges, PrivateTmp, 非特权用户

### 验证

测试外部攻击面：

```bash
nmap -p- YOUR_SERVER_IP
```

应该显示**仅端口 22** (SSH) 开放。所有其他服务（网关、Docker）均已锁定。

### Docker 可用性

安装 Docker 是为了**代理沙箱**（隔离的工具执行），而不是为了运行网关本身。网关仅绑定到 localhost 并通过 Tailscale VPN 访问。

关于沙箱配置，请参阅 [多代理沙箱与工具](/zh/tools/multi-agent-sandbox-tools)。

## 手动安装

如果您更喜欢手动控制而非自动化：

```bash
# 1. Install prerequisites
sudo apt update && sudo apt install -y ansible git

# 2. Clone repository
git clone https://github.com/openclaw/openclaw-ansible.git
cd openclaw-ansible

# 3. Install Ansible collections
ansible-galaxy collection install -r requirements.yml

# 4. Run playbook
./run-playbook.sh

# Or run directly (then manually execute /tmp/openclaw-setup.sh after)
# ansible-playbook playbook.yml --ask-become-pass
```

## 更新 OpenClaw

Ansible 安装程序将 OpenClaw 设置为手动更新。有关标准更新流程，请参阅 [更新](/zh/install/updating)。

要重新运行 Ansible playbook（例如，用于配置更改）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

注意：这是幂等的，多次运行是安全的。

## 故障排除

### 防火墙阻止了我的连接

如果您被锁定在外：

- 确保您首先可以通过 Tailscale VPN 访问
- SSH 访问（端口 22）始终是允许的
- 根据设计，网关**仅**可通过 Tailscale 访问

### 服务无法启动

```bash
# Check logs
sudo journalctl -u openclaw -n 100

# Verify permissions
sudo ls -la /opt/openclaw

# Test manual start
sudo -i -u openclaw
cd ~/openclaw
pnpm start
```

### Docker 沙箱问题

```bash
# Verify Docker is running
sudo systemctl status docker

# Check sandbox image
sudo docker images | grep openclaw-sandbox

# Build sandbox image if missing
cd /opt/openclaw/openclaw
sudo -u openclaw ./scripts/sandbox-setup.sh
```

### 提供商登录失败

请确保您正在以 `openclaw` 用户身份运行：

```bash
sudo -i -u openclaw
openclaw channels login
```

## 高级配置

有关详细的安全架构和故障排除：

- [安全架构](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [技术细节](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [故障排除指南](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相关

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — 完整部署指南
- [Docker](/zh/install/docker) — 容器化网关设置
- [沙箱隔离](/zh/gateway/sandboxing) — 代理沙箱配置
- [多代理沙箱与工具](/zh/tools/multi-agent-sandbox-tools) — 每个代理的隔离

import zh from '/components/footer/zh.mdx';

<zh />
