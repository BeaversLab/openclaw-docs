---
title: "Ansible 安装"
---
---
summary: "使用 Ansible + Tailscale VPN + 防火墙隔离的自动化加固安装"
read_when:
  - 你希望自动化部署并进行安全加固
  - 你需要通过 VPN 访问的防火墙隔离方案
  - 你要部署到远程 Debian/Ubuntu 服务器
---

# Ansible 安装

在生产服务器上部署 OpenClaw 的推荐方式是 **[openclaw-ansible](https://github.com/openclaw/openclaw-ansible)** —— 一个以安全优先为架构的自动化安装器。

## 快速开始

一条命令安装：

```bash
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw-ansible/main/install.sh | bash
```

> **📦 完整指南：[github.com/openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible)**
>
> openclaw-ansible 仓库是 Ansible 部署的唯一权威来源。本页只是快速概览。

## 你会得到什么

- 🔒 **防火墙优先安全**：UFW + Docker 隔离（仅 SSH + Tailscale 可访问）
- 🔐 **Tailscale VPN**：不公开暴露服务的安全远程访问
- 🐳 **Docker**：隔离的 sandbox 容器，仅本机绑定
- 🛡️ **纵深防御**：4 层安全架构
- 🚀 **一键部署**：几分钟完成全部部署
- 🔧 **Systemd 集成**：开机自启 + 安全加固

## 要求

- **OS**：Debian 11+ 或 Ubuntu 20.04+
- **权限**：Root 或 sudo
- **网络**：可联网安装依赖
- **Ansible**：2.14+（快速安装脚本会自动安装）

## 会安装什么

Ansible playbook 会安装并配置：

1. **Tailscale**（安全远程访问的 mesh VPN）
2. **UFW 防火墙**（仅开放 SSH + Tailscale 端口）
3. **Docker CE + Compose V2**（用于 agent sandboxes）
4. **Node.js 22.x + pnpm**（运行时依赖）
5. **OpenClaw**（在宿主机上运行，非容器化）
6. **Systemd service**（开机自启 + 安全加固）

注意：Gateway **直接运行在宿主机**（不在 Docker 中），但 agent sandboxes 使用 Docker 做隔离。详情见 [Sandboxing](/zh/gateway/sandboxing)。

## 安装后设置

安装完成后，切换到 openclaw 用户：

```bash
sudo -i -u openclaw
```

安装后的脚本会引导你完成：

1. **Onboarding 向导**：配置 OpenClaw
2. **Provider 登录**：连接 WhatsApp/Telegram/Discord/Signal
3. **Gateway 测试**：验证安装
4. **Tailscale 设置**：加入 VPN mesh

### 快捷命令

```bash
# 查看服务状态
sudo systemctl status openclaw

# 实时日志
sudo journalctl -u openclaw -f

# 重启 gateway
sudo systemctl restart openclaw

# Provider 登录（以 openclaw 用户运行）
sudo -i -u openclaw
openclaw channels login
```

## 安全架构

### 4 层防御

1. **防火墙（UFW）**：仅对公网开放 SSH (22) + Tailscale (41641/udp)
2. **VPN（Tailscale）**：Gateway 仅通过 VPN mesh 访问
3. **Docker 隔离**：DOCKER-USER iptables 链阻止外部端口暴露
4. **Systemd 加固**：NoNewPrivileges、PrivateTmp、非特权用户

### 验证

测试外网暴露面：

```bash
nmap -p- YOUR_SERVER_IP
```

应该**只显示 22 端口**（SSH）开放。所有其他服务（gateway、Docker）都被锁定。

### Docker 可用性

Docker 用于**agent sandboxes**（隔离的工具执行），不是用来运行 gateway 本体。Gateway 仅绑定在 localhost，通过 Tailscale VPN 访问。

Sandbox 配置见 [Multi-Agent Sandbox & Tools](/zh/multi-agent-sandbox-tools)。

## 手动安装

如果你更偏好手动控制而不是自动化：

```bash
# 1. 安装前置依赖
sudo apt update && sudo apt install -y ansible git

# 2. 克隆仓库
git clone https://github.com/openclaw/openclaw-ansible.git
cd openclaw-ansible

# 3. 安装 Ansible collections
ansible-galaxy collection install -r requirements.yml

# 4. 运行 playbook
./run-playbook.sh

# 或直接运行（然后手动执行 /tmp/openclaw-setup.sh）
# ansible-playbook playbook.yml --ask-become-pass
```

## 更新 OpenClaw

Ansible 安装器默认使用手动更新。标准更新流程见 [Updating](/zh/install/updating)。

重新运行 Ansible playbook（例如修改配置）：

```bash
cd openclaw-ansible
./run-playbook.sh
```

注意：该过程是幂等的，多次运行是安全的。

## 故障排查

### 防火墙阻断了连接

如果你被锁在外面：
- 先确保能通过 Tailscale VPN 访问
- SSH（22 端口）始终允许
- Gateway **设计上只通过 Tailscale 访问**

### 服务无法启动

```bash
# 查看日志
sudo journalctl -u openclaw -n 100

# 验证权限
sudo ls -la /opt/openclaw

# 手动启动测试
sudo -i -u openclaw
cd ~/openclaw
pnpm start
```

### Docker sandbox 问题

```bash
# 确认 Docker 正在运行
sudo systemctl status docker

# 检查 sandbox 镜像
sudo docker images | grep openclaw-sandbox

# 如果缺失，构建 sandbox 镜像
cd /opt/openclaw/openclaw
sudo -u openclaw ./scripts/sandbox-setup.sh
```

### Provider 登录失败

确保你以 `openclaw` 用户运行：

```bash
sudo -i -u openclaw
openclaw channels login
```

## 高级配置

安全架构与排障细节：
- [Security Architecture](https://github.com/openclaw/openclaw-ansible/blob/main/docs/security.md)
- [Technical Details](https://github.com/openclaw/openclaw-ansible/blob/main/docs/architecture.md)
- [Troubleshooting Guide](https://github.com/openclaw/openclaw-ansible/blob/main/docs/troubleshooting.md)

## 相关

- [openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — 完整部署指南
- [Docker](/zh/install/docker) — 容器化 gateway 方案
- [Sandboxing](/zh/gateway/sandboxing) — agent sandbox 配置
- [Multi-Agent Sandbox & Tools](/zh/multi-agent-sandbox-tools) — 按 agent 隔离
