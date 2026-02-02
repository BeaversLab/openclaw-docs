> [!NOTE]
> 本页正在翻译中。

---
summary: "在便宜的 Hetzner VPS 上 24/7 运行 OpenClaw Gateway（Docker），具备持久化状态与内置二进制"
read_when:
  - 你希望 OpenClaw 24/7 运行在云 VPS（非本机）
  - 你想在自有 VPS 上部署生产级常驻 Gateway
  - 你想完全掌控持久化、二进制与重启行为
  - 你在 Hetzner 或类似平台用 Docker 运行 OpenClaw
---

# OpenClaw on Hetzner（Docker，生产 VPS 指南）

## 目标

用 Docker 在 Hetzner VPS 上运行一个持久化 OpenClaw Gateway，拥有持久状态、内置二进制与安全的重启行为。

如果你想要“OpenClaw 24/7 约 $5”，这是最简单可靠的方案。
Hetzner 价格可能变动；选择最小 Debian/Ubuntu VPS，若出现 OOM 再扩容。

## 我们在做什么（简单说）

- 租一台小型 Linux 服务器（Hetzner VPS）
- 安装 Docker（隔离运行时）
- 在 Docker 中启动 OpenClaw Gateway
- 在宿主机上持久化 `~/.openclaw` + `~/.openclaw/workspace`（重启/重建不丢）
- 通过 SSH 隧道从笔记本访问 Control UI

Gateway 可通过以下方式访问：
- 笔记本 SSH 端口转发
- 直接暴露端口（需自行处理防火墙与 token）

本指南以 Hetzner 上的 Ubuntu/Debian 为例。  
若你在其它 Linux VPS 上，按需替换包名。  
通用 Docker 流程见 [Docker](/zh/install/docker)。

---

## 快速路径（熟练运维）

1) 创建 Hetzner VPS  
2) 安装 Docker  
3) 克隆 OpenClaw 仓库  
4) 创建持久化宿主目录  
5) 配置 `.env` 与 `docker-compose.yml`  
6) 将所需二进制烘焙进镜像  
7) `docker compose up -d`  
8) 验证持久化与 Gateway 访问  

---

## 你需要什么

- Hetzner VPS（root 权限）  
- 从笔记本 SSH 访问  
- 基本的 SSH + 复制粘贴能力  
- ~20 分钟  
- Docker 和 Docker Compose  
- 模型认证凭据  
- 可选 provider 凭据  
  - WhatsApp QR  
  - Telegram bot token  
  - Gmail OAuth  

---

## 1) 创建 VPS

在 Hetzner 上创建 Ubuntu 或 Debian VPS。

以 root 连接：

```bash
ssh root@YOUR_VPS_IP
```

本指南假设该 VPS 是有状态的。不要把它当成一次性基础设施。

---

## 2) 安装 Docker（VPS 上）

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

本指南假设你会构建自定义镜像，以保证二进制持久化。

---

## 4) 创建持久化宿主目录

Docker 容器是临时的。
所有长期状态必须存放在宿主机上。

```bash
mkdir -p /root/.openclaw
mkdir -p /root/.openclaw/workspace

# 将属主设置为容器用户（uid 1000）：
chown -R 1000:1000 /root/.openclaw
chown -R 1000:1000 /root/.openclaw/workspace
```

---

## 5) 配置环境变量

在仓库根目录创建 `.env`。

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

生成强随机密钥：

```bash
openssl rand -hex 32
```

**不要提交这个文件。**

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
      # 推荐：让 Gateway 在 VPS 上保持 loopback-only；通过 SSH 隧道访问。
      # 若要对公网暴露，移除 `127.0.0.1:` 前缀并自行配置防火墙。
      - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"

      # 可选：仅当 iOS/Android nodes 连接此 VPS 且需要 Canvas host 时启用。
      # 若对公网暴露，先阅读 /gateway/security 并配置防火墙。
      # - "18793:18793"
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${OPENCLAW_GATEWAY_BIND}",
        "--port",
        "${OPENCLAW_GATEWAY_PORT}"
      ]
```

---

## 7) 将所需二进制烘焙进镜像（关键）

在运行中的容器里安装二进制是个坑。
**运行时安装的任何内容都会在重启后丢失**。

所有 skills 依赖的外部二进制必须在镜像构建时安装。

下面示例只展示三种常见二进制：
- Gmail 访问：`gog`
- Google Places：`goplaces`
- WhatsApp：`wacli`

这些只是示例，并非完整清单。
若你后续添加依赖其它二进制的 skill，你必须：
1. 更新 Dockerfile
2. 重建镜像
3. 重启容器

**示例 Dockerfile**

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# 示例二进制 1：Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz   | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# 示例二进制 2：Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz   | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# 示例二进制 3：WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz   | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# 按同样模式添加更多二进制

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

验证二进制：

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

## 9) 验证 Gateway

```bash
docker compose logs -f openclaw-gateway
```

成功示例：

```
[gateway] listening on ws://0.0.0.0:18789
```

在你的笔记本上：

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
```

打开：

`http://127.0.0.1:18789/`

粘贴你的 gateway token。

---

## 何处持久化（source of truth）

OpenClaw 运行在 Docker 中，但 Docker 不是事实来源。
所有长期状态必须在重启、重建、重启机后仍保留。

| Component | Location | Persistence mechanism | Notes |
|---|---|---|---|
| Gateway config | `/home/node/.openclaw/` | 宿主机卷挂载 | 包含 `openclaw.json`、tokens |
| Model auth profiles | `/home/node/.openclaw/` | 宿主机卷挂载 | OAuth tokens、API keys |
| Skill configs | `/home/node/.openclaw/skills/` | 宿主机卷挂载 | Skill 级状态 |
| Agent workspace | `/home/node/.openclaw/workspace/` | 宿主机卷挂载 | 代码与 agent 产物 |
| WhatsApp session | `/home/node/.openclaw/` | 宿主机卷挂载 | 保留 QR 登录 |
| Gmail keyring | `/home/node/.openclaw/` | 宿主机卷 + 密码 | 需要 `GOG_KEYRING_PASSWORD` |
| External binaries | `/usr/local/bin/` | Docker 镜像 | 必须构建时烘焙 |
| Node runtime | 容器文件系统 | Docker 镜像 | 每次构建重建 |
| OS packages | 容器文件系统 | Docker 镜像 | 不要在运行时安装 |
| Docker container | 临时 | 可重启 | 可安全删除 |
