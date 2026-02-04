---
title: "GCP"
summary: "在 GCP Compute Engine VM 上 24/7 运行 OpenClaw Gateway（Docker），具备持久化状态"
read_when:
  - 你想在 GCP 上 24/7 运行 OpenClaw
  - 你想在自有 VM 上部署生产级常驻 Gateway
  - 你想完全掌控持久化、二进制与重启行为
---

# OpenClaw on GCP Compute Engine（Docker，生产 VPS 指南）

## 目标

在 GCP Compute Engine VM 上使用 Docker 运行持久化 OpenClaw Gateway，具备持久状态、内置二进制与安全的重启行为。

如果你想要“OpenClaw 24/7 约 $5-12/月”，这是在 Google Cloud 上可靠的方案。
价格取决于机型与区域；选最小可用 VM，遇到 OOM 再扩容。

## 我们在做什么（简单说）

- 创建 GCP 项目并开启计费
- 创建 Compute Engine VM
- 安装 Docker（隔离运行时）
- 在 Docker 中启动 OpenClaw Gateway
- 在宿主机持久化 `~/.openclaw` + `~/.openclaw/workspace`（重启/重建不丢）
- 通过 SSH 隧道从笔记本访问 Control UI

Gateway 可通过以下方式访问：

- 笔记本 SSH 端口转发
- 直接暴露端口（需自行处理防火墙与 token）

本指南使用 GCP Compute Engine 上的 Debian。
Ubuntu 也可用；按需调整包名。
通用 Docker 流程见 [Docker](/zh/install/docker)。

---

## 快速路径（熟练运维）

1. 创建 GCP 项目 + 启用 Compute Engine API
2. 创建 Compute Engine VM（e2-small，Debian 12，20GB）
3. SSH 进入 VM
4. 安装 Docker
5. 克隆 OpenClaw 仓库
6. 创建持久化宿主目录
7. 配置 `.env` 与 `docker-compose.yml`
8. 烘焙所需二进制、构建并启动

---

## 你需要什么

- GCP 账号（e2-micro 可用免费额度）
- 已安装 gcloud CLI（或用 Cloud Console）
- 从笔记本 SSH 访问
- 基本的 SSH + 复制粘贴能力
- ~20–30 分钟
- Docker 和 Docker Compose
- 模型认证凭据
- 可选 provider 凭据
  - WhatsApp QR
  - Telegram bot token
  - Gmail OAuth

---

## 1) 安装 gcloud CLI（或用 Console）

**选项 A：gcloud CLI**（推荐用于自动化）

安装： https://cloud.google.com/sdk/docs/install

初始化并认证：

```bash
gcloud init
gcloud auth login
```

**选项 B：Cloud Console**

所有步骤可在 https://console.cloud.google.com 上完成。

---

## 2) 创建 GCP 项目

**CLI：**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

在 https://console.cloud.google.com/billing 启用计费（Compute Engine 必需）。

启用 Compute Engine API：

```bash
gcloud services enable compute.googleapis.com
```

**Console：**

1. 进入 IAM & Admin > Create Project
2. 命名并创建
3. 为项目启用计费
4. 进入 APIs & Services > Enable APIs > 搜索 “Compute Engine API” > Enable

---

## 3) 创建 VM

**机型：**

| Type     | Specs                   | Cost               | Notes    |
| -------- | ----------------------- | ------------------ | -------- |
| e2-small | 2 vCPU, 2GB RAM         | ~$12/mo            | 推荐     |
| e2-micro | 2 vCPU（共享）, 1GB RAM | Free tier eligible | 可能 OOM |

**CLI：**

```bash
gcloud compute instances create openclaw-gateway   --zone=us-central1-a   --machine-type=e2-small   --boot-disk-size=20GB   --image-family=debian-12   --image-project=debian-cloud
```

**Console：**

1. 进入 Compute Engine > VM instances > Create instance
2. 名称：`openclaw-gateway`
3. 区域：`us-central1`，可用区：`us-central1-a`
4. 机型：`e2-small`
5. 启动盘：Debian 12，20GB
6. 创建

---

## 4) SSH 进入 VM

**CLI：**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**Console：**

在 Compute Engine 控制台，点击 VM 旁的 “SSH” 按钮。

注意：VM 创建后 SSH key 传播可能需要 1–2 分钟。如连接被拒，等待并重试。

---

## 5) 安装 Docker（VM 上）

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

退出并重新登录使组变更生效：

```bash
exit
```

然后重新 SSH：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

验证：

```bash
docker --version
docker compose version
```

---

## 6) 克隆 OpenClaw 仓库

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

本指南假设你会构建自定义镜像，以保证二进制持久化。

---

## 7) 创建持久化宿主目录

Docker 容器是临时的。
所有长期状态必须存放在宿主机上。

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
```

---

## 8) 配置环境变量

在仓库根目录创建 `.env`。

```bash
OPENCLAW_IMAGE=openclaw:latest
OPENCLAW_GATEWAY_TOKEN=change-me-now
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_PORT=18789

OPENCLAW_CONFIG_DIR=/home/$USER/.openclaw
OPENCLAW_WORKSPACE_DIR=/home/$USER/.openclaw/workspace

GOG_KEYRING_PASSWORD=change-me-now
XDG_CONFIG_HOME=/home/node/.openclaw
```

生成强随机密钥：

```bash
openssl rand -hex 32
```

**不要提交这个文件。**

---

## 9) Docker Compose 配置

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
      # 推荐：让 Gateway 在 VM 上保持 loopback-only；通过 SSH 隧道访问。
      # 若要对公网暴露，移除 `127.0.0.1:` 前缀并自行配置防火墙。
      - "127.0.0.1:${OPENCLAW_GATEWAY_PORT}:18789"

      # 可选：仅当 iOS/Android nodes 连接此 VM 且需要 Canvas host 时启用。
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
        "${OPENCLAW_GATEWAY_PORT}",
      ]
```

---

## 10) 将所需二进制烘焙进镜像（关键）

在运行中的容器里安装二进制是个坑。
**运行时安装的任何内容都会在重启后丢失**。

所有 skills 依赖的外部二进制必须在镜像构建时安装。

下面示例只展示三种常见二进制：

- Gmail 访问：`gog`
- Google Places：`goplaces`
- WhatsApp：`wacli`

这些只是示例，并非完整清单。
可用相同模式安装更多二进制。

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

## 11) 构建并启动

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

## 12) 验证 Gateway

```bash
docker compose logs -f openclaw-gateway
```

成功示例：

```
[gateway] listening on ws://0.0.0.0:18789
```

---

## 13) 从笔记本访问

创建 SSH 隧道转发 Gateway 端口：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

在浏览器打开：

`http://127.0.0.1:18789/`

粘贴 gateway token。

---

## 何处持久化（source of truth）

OpenClaw 运行在 Docker 中，但 Docker 不是事实来源。
所有长期状态必须在重启、重建、重启机后仍保留。

| Component           | Location                          | Persistence mechanism | Notes                        |
| ------------------- | --------------------------------- | --------------------- | ---------------------------- |
| Gateway config      | `/home/node/.openclaw/`           | 宿主机卷挂载          | 包含 `openclaw.json`、tokens |
| Model auth profiles | `/home/node/.openclaw/`           | 宿主机卷挂载          | OAuth tokens、API keys       |
| Skill configs       | `/home/node/.openclaw/skills/`    | 宿主机卷挂载          | Skill 级状态                 |
| Agent workspace     | `/home/node/.openclaw/workspace/` | 宿主机卷挂载          | 代码与 agent 产物            |
| WhatsApp session    | `/home/node/.openclaw/`           | 宿主机卷挂载          | 保留 QR 登录                 |
| Gmail keyring       | `/home/node/.openclaw/`           | 宿主机卷 + 密码       | 需要 `GOG_KEYRING_PASSWORD`  |
| External binaries   | `/usr/local/bin/`                 | Docker 镜像           | 必须构建时烘焙               |
| Node runtime        | 容器文件系统                      | Docker 镜像           | 每次构建重建                 |
| OS packages         | 容器文件系统                      | Docker 镜像           | 不要在运行时安装             |
| Docker container    | 临时                              | 可重启                | 可安全删除                   |

---

## 更新

更新 VM 上的 OpenClaw：

```bash
cd ~/openclaw
git pull
docker compose build
docker compose up -d
```

---

## Troubleshooting

**SSH connection refused**

VM 创建后 SSH key 传播可能需要 1–2 分钟。等待后重试。

**OS Login issues**

检查你的 OS Login 配置：

```bash
gcloud compute os-login describe-profile
```

确保账号具备必要 IAM 权限（Compute OS Login 或 Compute OS Admin Login）。

**Out of memory (OOM)**

如果使用 e2-micro 出现 OOM，升级到 e2-small 或 e2-medium：

```bash
# 先停止 VM
gcloud compute instances stop openclaw-gateway --zone=us-central1-a

# 修改机型
gcloud compute instances set-machine-type openclaw-gateway   --zone=us-central1-a   --machine-type=e2-small

# 启动 VM
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

---

## Service accounts（安全最佳实践）

个人使用时，默认账号足够。

用于自动化或 CI/CD 时，创建最小权限的服务账号：

1. 创建服务账号：

   ```bash
   gcloud iam service-accounts create openclaw-deploy      --display-name="OpenClaw Deployment"
   ```

2. 授予 Compute Instance Admin 角色（或更窄的自定义角色）：
   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project      --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com"      --role="roles/compute.instanceAdmin.v1"
   ```

不要用 Owner 角色做自动化。遵循最小权限原则。

IAM 角色详情见 https://cloud.google.com/iam/docs/understanding-roles

---

## 下一步

- 配置消息通道：[通道](/zh/channels)
- 配对本地设备为 nodes：[节点](/zh/nodes)
- 配置 Gateway：[Gateway 配置](/zh/gateway/configuration)
