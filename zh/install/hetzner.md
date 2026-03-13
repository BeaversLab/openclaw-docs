---
summary: "在便宜的 Hetzner VPS (Docker) 上 24/7 运行 OpenClaw Gateway，具有持久状态和内置二进制文件"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## 目标

在 Hetzner VPS 上使用 Docker 运行持久化的 OpenClaw Gateway，具有持久状态、内置二进制文件和安全的重启行为。

如果您想要“以约 5 美元的价格全天候运行 OpenClaw”，这是最简单可靠的设置。
Hetzner 定价可能会有所变化；选择最小的 Debian/Ubuntu VPS，如果遇到 OOM（内存不足）则进行扩容。

安全模型提醒：

- 当每个人都处于同一信任边界且运行时仅用于业务时，公司共享的代理是可以的。
- 保持严格的分离：专用的 VPS/运行时 + 专用账户；该主机上不得有个人 Apple/Google/浏览器/密码管理器配置文件。
- 如果用户之间存在敌对关系，请按 Gateway/主机/操作系统用户进行拆分。

请参阅 [安全](/en/gateway/security) 和 [VPS 托管](/en/vps)。

## 我们要做什么（简单来说）？

- 租一台小型 Linux 服务器 (Hetzner VPS)
- 安装 Docker (隔离的应用运行时)
- 在 Docker 中启动 OpenClaw Gateway
- 在主机上持久化 `~/.openclaw` + `~/.openclaw/workspace`（在重启/重建后存活）
- 通过 SSH 隧道从您的笔记本电脑访问控制 UI

可以通过以下方式访问 Gateway：

- 从您的笔记本电脑进行 SSH 端口转发
- 如果您自己管理防火墙和令牌，则可以直接暴露端口

本指南假设 Hetzner 上使用的是 Ubuntu 或 Debian。  
如果您使用的是其他 Linux VPS，请相应地映射软件包。
有关通用 Docker 流程，请参阅 [Docker](/en/install/docker)。

---

## 快速路径（经验丰富的操作员）

1. 配置 Hetzner VPS
2. 安装 Docker
3. 克隆 OpenClaw 仓库
4. 创建持久的主机目录
5. 配置 `.env` 和 `docker-compose.yml`
6. 将所需的二进制文件内置到镜像中
7. `docker compose up -d`
8. 验证持久性和 Gateway 访问

---

## 您需要什么

- 具有 root 访问权限的 Hetzner VPS
- 从您的笔记本电脑进行 SSH 访问
- 对 SSH + 复制/粘贴的基本了解
- 约 20 分钟
- Docker 和 Docker Compose
- 模型身份验证凭据
- 可选的提供商凭据
  - WhatsApp QR
  - Telegram bot token
  - Gmail OAuth

---

## 1) 配置 VPS

在 Hetzner 中创建 Ubuntu 或 Debian VPS。

以 root 用户身份连接：

```bash
ssh root@YOUR_VPS_IP
```

本指南假定 VPS 是有状态的。
不要将其视为一次性基础架构。

---

## 2) 安装 Docker (在 VPS 上)

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
所有长期存在的状态必须位于主机上。

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

`--allow-unconfigured` 仅为了引导方便，它不能替代正确的网关配置。仍然要设置身份验证（`gateway.auth.token` 或密码）并为您的部署使用安全的绑定设置。

---

## 7) 将所需的二进制文件 baked 到镜像中 (关键)

在正在运行的容器中安装二进制文件是一个陷阱。
在运行时安装的任何内容都将在重启时丢失。

技能所需的所有外部二进制文件必须在镜像构建时安装。

下面的示例仅展示了三种常见的二进制文件：

- `gog` 用于 Gmail 访问
- `goplaces` 用于 Google Places
- `wacli` 用于 WhatsApp

这些只是示例，并非完整列表。
您可以使用相同的模式安装所需数量的二进制文件。

如果您稍后添加依赖于其他二进制文件的新技能，您必须：

1. 更新 Dockerfile
2. 重新构建镜像
3. 重启容器

**示例 Dockerfile**

```dockerfile
FROM node:24-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# Add more binaries below using the same pattern

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

---

## 8) 构建并启动

```bash
docker compose build
docker compose up -d openclaw-gateway
```

验证二进制文件：

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

预期输出：

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

---

## 9) 验证网关

```bash
docker compose logs -f openclaw-gateway
```

成功：

```
[gateway] listening on ws://0.0.0.0:18789
```

从您的笔记本电脑：

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

打开：

`http://127.0.0.1:18789/`

粘贴您的网关令牌。

---

## 什么保留在哪里 (事实来源)

OpenClaw 在 Docker 中运行，但 Docker 不是事实来源。
所有长期存在的状态必须在重启、重新构建和重新启动后存活下来。

| 组件           | 位置                          | 持久化机制  | 备注                            |
| ------------------- | --------------------------------- | ---------------------- | -------------------------------- |
| Gateway 配置      | `/home/node/.openclaw/`           | 主机卷挂载      | 包括 `openclaw.json`, tokens |
| 模型认证配置文件 | `/home/node/.openclaw/`           | 主机卷挂载      | OAuth tokens, API keys           |
| Skill 配置       | `/home/node/.openclaw/skills/`    | 主机卷挂载      | Skill 级别的状态                |
| Agent 工作区     | `/home/node/.openclaw/workspace/` | 主机卷挂载      | 代码和 agent 制品         |
| WhatsApp 会话    | `/home/node/.openclaw/`           | 主机卷挂载      | 保留 QR 登录               |
| Gmail 密钥环       | `/home/node/.openclaw/`           | 主机卷 + 密码 | 需要 `GOG_KEYRING_PASSWORD`  |
| 外部二进制文件   | `/usr/local/bin/`                 | Docker 镜像           | 必须在构建时烘焙      |
| Node 运行时        | 容器文件系统              | Docker 镜像           | 每次镜像构建时重新构建        |
| OS 软件包         | 容器文件系统              | Docker 镜像           | 不要在运行时安装        |
| Docker 容器    | 临时                         | 可重启            | 可安全销毁                  |

---

## 基础设施即代码

对于喜欢基础设施即代码工作流的团队，社区维护的 Terraform 设置提供了：

- 具有远程状态管理的模块化 Terraform 配置
- 通过 cloud-init 自动配置
- 部署脚本（bootstrap、deploy、backup/restore）
- 安全加固（防火墙、UFW、仅限 SSH 访问）
- 用于网关访问的 SSH 隧道配置

**代码库：**

- 基础设施：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 配置：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

这种方法通过可复现的部署、版本控制的基础架构和自动灾难恢复，补充了上述 Docker 设置。

> **注意：** 社区维护。如有问题或贡献，请参阅上面的仓库链接。

import zh from '/components/footer/zh.mdx';

<zh />
