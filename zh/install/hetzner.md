---
summary: "Run OpenClaw Gateway(网关) 24/7 on a cheap Hetzner VPS (Docker) with durable state and baked-in binaries"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway(网关) on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar 提供商
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## Goal

Run a persistent OpenClaw Gateway(网关) on a Hetzner VPS using Docker, with durable state, baked-in binaries, and safe restart behavior.

If you want “OpenClaw 24/7 for ~$5”, this is the simplest reliable setup.
Hetzner pricing changes; pick the smallest Debian/Ubuntu VPS and scale up if you hit OOMs.

Security 模型 reminder:

- Company-shared agents are fine when everyone is in the same trust boundary and the runtime is business-only.
- Keep strict separation: dedicated VPS/runtime + dedicated accounts; no personal Apple/Google/browser/password-manager profiles on that host.
- If users are adversarial to each other, split by gateway/host/OS user.

See [Security](/zh/gateway/security) and [VPS hosting](/zh/vps).

## What are we doing (simple terms)?

- Rent a small Linux server (Hetzner VPS)
- Install Docker (isolated app runtime)
- Start the OpenClaw Gateway(网关) in Docker
- Persist `~/.openclaw` + `~/.openclaw/workspace` on the host (survives restarts/rebuilds)
- Access the Control UI from your laptop via an SSH tunnel

The Gateway(网关) can be accessed via:

- SSH port forwarding from your laptop
- Direct port exposure if you manage firewalling and tokens yourself

This guide assumes Ubuntu or Debian on Hetzner.  
If you are on another Linux VPS, map packages accordingly.
For the generic Docker flow, see [Docker](/zh/install/docker).

---

## Quick path (experienced operators)

1. Provision Hetzner VPS
2. Install Docker
3. Clone OpenClaw repository
4. Create persistent host directories
5. Configure `.env` and `docker-compose.yml`
6. Bake required binaries into the image
7. `docker compose up -d`
8. Verify persistence and Gateway(网关) access

---

## What you need

- Hetzner VPS with root access
- SSH access from your laptop
- Basic comfort with SSH + copy/paste
- ~20 分钟
- Docker 和 Docker Compose
- 模型认证凭据
- 可选的提供商凭据
  - WhatsApp QR
  - Telegram bot token
  - Gmail OAuth

---

## 1) 配置 VPS

在 Hetzner 中创建 Ubuntu 或 Debian VPS。

以 root 身份连接：

```bash
ssh root@YOUR_VPS_IP
```

本指南假设 VPS 是有状态的。
请勿将其视为一次性基础设施。

---

## 2) 安装 Docker（在 VPS 上）

```bash
apt-get update
apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sh
```

验证：

```bash
docker --version
docker compose version
```

---

## 3) 克隆 OpenClaw 仓库

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

本指南假设您将构建自定义镜像以保证二进制文件的持久性。

---

## 4) 创建持久化主机目录

Docker 容器是临时的。
所有长期保存的状态必须驻留在主机上。

```bash
mkdir -p /root/.openclaw/workspace

# Set ownership to the container user (uid 1000):
chown -R 1000:1000 /root/.openclaw
```

---

## 5) 配置环境变量

在仓库根目录中创建 `.env`。

```bash
OPENCLAW_IMAGE=openclaw:latest
OPENCLAW_GATEWAY_TOKEN=change-me-now
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_PORT=18789

OPENCLAW_CONFIG_DIR=/root/.openclaw
OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

GOG_KEYRING_PASSWORD=change-me-now
XDG_CONFIG_HOME=/home/node/.openclaw
```

生成强密钥：

```bash
openssl rand -hex 32
```

**不要提交此文件。**

---

## 6) Docker Compose 配置

创建或更新 `docker-compose.yml`。

```yaml
services:
  openclaw-gateway:
    image: ${OPENCLAW_IMAGE}
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - HOME=/home/node
      - NODE_ENV=production
      - TERM=xterm-256color
      - OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND}
      - OPENCLAW_GATEWAY_PORT=${OPENCLAW_GATEWAY_PORT}
      - OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
      - GOG_KEYRING_PASSWORD=${GOG_KEYRING_PASSWORD}
      - XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
      - PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
    volumes:
      - ${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR}:/home/node/.openclaw/workspace
    ports:
      # Recommended: keep the Gateway loopback-only on the VPS; access via SSH tunnel.
      # To expose it publicly, remove the `127.0.0.1:` prefix and firewall accordingly.
      - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND}",
        "--port",
        "${OPENCLAW_GATEWAY_PORT}",
        "--allow-unconfigured",
      ]
```

`--allow-unconfigured` 仅为了引导方便，它不能替代正确的网关配置。仍然要设置认证（`gateway.auth.token` 或密码）并为您的部署使用安全的绑定设置。

---

## 7) 共享 Docker VM 运行时步骤

使用共享运行时指南了解通用的 Docker 主机流程：

- [将所需的二进制文件烘焙到镜像中](/zh/install/docker-vm-runtime#bake-required-binaries-into-the-image)
- [构建并启动](/zh/install/docker-vm-runtime#build-and-launch)
- [什么内容会持久化在哪里](/zh/install/docker-vm-runtime#what-persists-where)
- [更新](/zh/install/docker-vm-runtime#updates)

---

## 8) Hetzner 特定的访问

在完成共享的构建和启动步骤后，从您的笔记本电脑进行隧道连接：

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

打开：

`http://127.0.0.1:18789/`

粘贴您的网关令牌。

---

共享持久化映射位于 [Docker VM Runtime](/zh/install/docker-vm-runtime#what-persists-where)。

## 基础设施即代码

对于偏好基础设施即代码工作流的团队，社区维护的 Terraform 设置提供了：

- 模块化的 Terraform 配置，具有远程状态管理
- 通过 cloud-init 自动配置
- 部署脚本（bootstrap、deploy、backup/restore）
- 安全加固（防火墙、UFW、仅 SSH 访问）
- 用于网关访问的 SSH 隧道配置

**仓库：**

- 基础设施：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 配置：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

此方法通过可复现的部署、版本控制的基础架构和自动化灾难恢复，补充了上述 Docker 设置。

> **注意：** 由社区维护。如有问题或贡献，请参阅上面的仓库链接。

import zh from "/components/footer/zh.mdx";

<zh />
