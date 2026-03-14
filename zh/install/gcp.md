---
summary: "在 GCP Compute Engine 虚拟机 (Docker) 上 24/7 运行 OpenClaw Gateway 网关，并保持持久化状态"
read_when:
  - You want OpenClaw running 24/7 on GCP
  - You want a production-grade, always-on Gateway on your own VM
  - You want full control over persistence, binaries, and restart behavior
title: "GCP"
---

# OpenClaw 在 GCP Compute Engine 上 (Docker，生产环境 VPS 指南)

## 目标

在 GCP Compute Engine 虚拟机上使用 Docker 运行持久化的 OpenClaw Gateway 网关，具备持久化状态、内置二进制文件和安全重启行为。

如果您希望“OpenClaw 全天候 (24/7) 运行，月费约 $5-12”，这是在 Google Cloud 上的可靠设置。
价格因机器类型和地区而异；请选择适合您工作负载的最小虚拟机，如果遇到内存不足 (OOM) 再进行扩容。

## 我们要做什么（简单来说）？

- 创建一个 GCP 项目并启用计费
- 创建一个 Compute Engine 虚拟机
- 安装 Docker (隔离的应用运行时)
- 在 Docker 中启动 OpenClaw Gateway 网关
- 在主机上持久化 `~/.openclaw` + `~/.openclaw/workspace`（在重启/重建后存活）
- 通过 SSH 隧道从您的笔记本电脑访问控制 UI

可以通过以下方式访问 Gateway 网关：

- 从您的笔记本电脑进行 SSH 端口转发
- 如果您自行管理防火墙和令牌，可直接暴露端口

本指南使用 GCP Compute Engine 上的 Debian。
Ubuntu 也可以使用；请相应地映射软件包。
有关通用 Docker 流程，请参阅 [Docker](/zh/en/install/docker)。

---

## 快速路径 (经验丰富的操作员)

1. 创建 GCP 项目 + 启用 Compute Engine API
2. 创建 Compute Engine 虚拟机 (e2-small, Debian 12, 20GB)
3. SSH 进入虚拟机
4. 安装 Docker
5. 克隆 OpenClaw 仓库
6. 创建持久化的主机目录
7. 配置 `.env` 和 `docker-compose.yml`
8. 打包所需的二进制文件，构建并启动

---

## 您需要什么

- GCP 账户 (e2-micro 符合免费层级条件)
- 已安装 gcloud CLI (或使用 Cloud Console)
- 从您的笔记本电脑进行 SSH 访问
- 对 SSH + 复制/粘贴的基本了解
- 大约 20-30 分钟
- Docker 和 Docker Compose
- 模型认证凭据
- 可选的提供商凭据
  - WhatsApp QR
  - Telegram 机器人令牌
  - Gmail OAuth

---

## 1) 安装 gcloud CLI (或使用 Console)

**选项 A: gcloud CLI** (推荐用于自动化)

从 [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安装

初始化并认证：

```bash
gcloud init
gcloud auth login
```

**选项 B: Cloud Console**

所有步骤均可通过位于 [https://console.cloud.google.com](https://console.cloud.google.com) 的 Web UI 完成

---

## 2) 创建 GCP 项目

**命令行 (CLI):**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

在 [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) 启用计费（Compute Engine 必需）。

启用 Compute Engine API：

```bash
gcloud services enable compute.googleapis.com
```

**控制台:**

1. 转到 IAM 和管理 > 创建项目
2. 命名并创建
3. 为项目启用计费
4. 导航至 API 和服务 > 启用 API > 搜索 "Compute Engine API" > 启用

---

## 3) 创建虚拟机 (VM)

**机器类型:**

| 类型      | 规格                    | 费用               | 备注                                        |
| --------- | ------------------------ | ------------------ | -------------------------------------------- |
| e2-medium | 2 vCPU, 4GB 内存          | ~$25/月            | 本地 Docker 构建最可靠                     |
| e2-small  | 2 vCPU, 2GB 内存          | ~$12/月            | Docker 构建的最低推荐配置                  |
| e2-micro  | 2 vCPU (共享), 1GB 内存 | 符合免费层条件       | 通常因 Docker 构建 OOM (退出代码 137) 而失败 |

**命令行 (CLI):**

```bash
gcloud compute instances create openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --boot-disk-size=20GB \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

**控制台:**

1. 转到 Compute Engine > 虚拟机实例 > 创建实例
2. 名称： `openclaw-gateway`
3. 区域： `us-central1`，可用区： `us-central1-a`
4. 机器类型： `e2-small`
5. 启动磁盘: Debian 12, 20GB
6. 创建

---

## 4) SSH 登录到虚拟机

**命令行 (CLI):**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**控制台:**

在 Compute Engine 控制台中，点击您虚拟机旁边的 "SSH" 按钮。

注意：虚拟机创建后，SSH 密钥传播可能需要 1-2 分钟。如果连接被拒绝，请稍后重试。

---

## 5) 安装 Docker (在虚拟机上)

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

注销并重新登录以使组更改生效：

```bash
exit
```

然后重新 SSH 登录：

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

本指南假设您将构建自定义镜像以保证二进制文件的持久性。

---

## 7) 创建持久主机目录

Docker 容器是临时的。
所有长期存在的状态必须驻留在主机上。

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
```

---

## 8) 配置环境变量

在仓库根目录中创建 `.env`。

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

生成强密钥：

```bash
openssl rand -hex 32
```

**不要提交此文件。**

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
      # Recommended: keep the Gateway loopback-only on the VM; access via SSH tunnel.
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
      ]
```

---

## 10) 将所需的二进制文件打包到镜像中（关键）

在正在运行的容器中安装二进制文件是一个陷阱。
在运行时安装的任何内容都将在重启时丢失。

技能所需的所有外部二进制文件必须在镜像构建时安装。

下面的示例仅展示了三种常见的二进制文件：

- `gog` 用于 Gmail 访问
- `goplaces` 用于 Google Places
- `wacli` 用于 WhatsApp

这些只是示例，并非完整列表。
您可以使用相同的模式安装所需的任意数量的二进制文件。

如果您稍后添加了依赖于其他二进制文件的新技能，您必须：

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

## 11) 构建并启动

```bash
docker compose build
docker compose up -d openclaw-gateway
```

如果在 `pnpm install --frozen-lockfile` 期间因 `Killed` / `exit code 137` 导致构建失败，则虚拟机内存不足。请至少使用 `e2-small`，或使用 `e2-medium` 以获得更可靠的首次构建。

绑定到 LAN (`OPENCLAW_GATEWAY_BIND=lan`) 时，请先配置受信任的浏览器源：

```bash
docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
```

如果您更改了网关端口，请将 `18789` 替换为您配置的端口。

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

## 12) 验证 Gateway 网关

```bash
docker compose logs -f openclaw-gateway
```

成功：

```
[gateway] listening on ws://0.0.0.0:18789
```

---

## 13) 从笔记本电脑访问

创建 SSH 隧道以转发 Gateway 网关 端口：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

在浏览器中打开：

`http://127.0.0.1:18789/`

获取一个新的带令牌的仪表板链接：

```bash
docker compose run --rm openclaw-cli dashboard --no-open
```

粘贴该 URL 中的令牌。

如果控制 UI 显示 `unauthorized` 或 `disconnected (1008): pairing required`，请批准浏览器设备：

```bash
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

---

## 什么内容在哪里持久化（事实来源）

OpenClaw 在 Docker 中运行，但 Docker 并非事实来源。
所有长期存在的状态必须在重启、重新构建和重新引导后保留。

| 组件 | 位置 | 持久化机制 | 备注 |
| ------------------- | --------------------------------- | ---------------------- | -------------------------------- |
| Gateway 网关 config | `/home/node/.openclaw/` | 主机卷挂载 | Includes `openclaw.json`, tokens |
| Model auth profiles | `/home/node/.openclaw/` | 主机卷挂载 | OAuth tokens, API keys |
| Skill configs | `/home/node/.openclaw/skills/` | 主机卷挂载 | Skill-level state |
| Agent workspace | `/home/node/.openclaw/workspace/` | 主机卷挂载 | Code and agent artifacts |
| WhatsApp 会话 | `/home/node/.openclaw/` | 主机卷挂载 | Preserves QR login |
| Gmail keyring | `/home/node/.openclaw/` | 主机卷 + 密码 | Requires `GOG_KEYRING_PASSWORD` |
| External binaries | `/usr/local/bin/` | Docker 镜像 | Must be baked at build time |
| Node runtime | 容器文件系统 | Docker 镜像 | Rebuilt every image build |
| OS packages | 容器文件系统 | Docker 镜像 | Do not install at runtime |
| Docker container | 临时性 | 可重启 | Safe to destroy |

---

## 更新

要在 VM 上更新 OpenClaw：

```bash
cd ~/openclaw
git pull
docker compose build
docker compose up -d
```

---

## 故障排除

**SSH 连接被拒绝**

在 VM 创建后，SSH 密钥传播可能需要 1-2 分钟。请等待并重试。

**OS Login 问题**

检查您的 OS Login 个人资料：

```bash
gcloud compute os-login describe-profile
```

确保您的帐户具有所需的 IAM 权限（Compute OS Login 或 Compute OS Admin Login）。

**内存不足 (OOM)**

如果 Docker 构建失败并显示 `Killed` 和 `exit code 137`，说明 VM 被 OOM 杀死了。请升级到 e2-small（最低）或 e2-medium（推荐用于可靠的本地构建）：

```bash
# Stop the VM first
gcloud compute instances stop openclaw-gateway --zone=us-central1-a

# Change machine type
gcloud compute instances set-machine-type openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small

# Start the VM
gcloud compute instances start openclaw-gateway --zone=us-central1-a
```

---

## 服务帐户（安全最佳实践）

对于个人用途，您的默认用户账户即可正常工作。

对于自动化或 CI/CD 流水线，请创建一个具有最小权限的专用服务账户：

1. 创建服务账户：

   ```bash
   gcloud iam service-accounts create openclaw-deploy \
     --display-name="OpenClaw Deployment"
   ```

2. 授予 Compute Instance Admin 角色（或更窄的自定义角色）：

   ```bash
   gcloud projects add-iam-policy-binding my-openclaw-project \
     --member="serviceAccount:openclaw-deploy@my-openclaw-project.iam.gserviceaccount.com" \
     --role="roles/compute.instanceAdmin.v1"
   ```

避免使用 Owner 角色进行自动化操作。请遵循最小权限原则。

请参阅 [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles) 了解 IAM 角色的详细信息。

---

## 后续步骤

- 设置消息通道：[Channels](/zh/en/channels)
- 将本地设备配对为节点：[Nodes](/zh/en/nodes)
- 配置 Gateway 网关：[Gateway 网关 configuration](/zh/en/gateway/configuration)

import zh from '/components/footer/zh.mdx';

<zh />
