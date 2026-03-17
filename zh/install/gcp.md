---
summary: "在 GCP Compute Engine 虚拟机 (Docker) 上全天候运行 OpenClaw Gateway(网关)，并持久化状态"
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

本指南在 GCP Compute Engine 上使用 Debian。
Ubuntu 也可以用；请相应地映射软件包。
有关通用 Docker 流程，请参阅 [Docker](/zh/install/docker)。

---

## 快速路径（经验丰富的操作员）

1. 创建 GCP 项目 + 启用 Compute Engine API
2. 创建 Compute Engine VM (e2-small, Debian 12, 20GB)
3. SSH 进入 VM
4. 安装 Docker
5. 克隆 OpenClaw 仓库
6. 创建持久化主机目录
7. 配置 `.env` 和 `docker-compose.yml`
8. 烘焙所需的二进制文件，构建并启动

---

## 您需要什么

- GCP 账户（免费层级适用于 e2-micro）
- 已安装 gcloud CLI（或使用 Cloud Console）
- 从您的笔记本电脑进行 SSH 访问
- 对 SSH + 复制/粘贴有基本了解
- 约 20-30 分钟
- Docker 和 Docker Compose
- 模型身份验证凭据
- 可选提供商凭据
  - WhatsApp 二维码
  - Telegram 机器人令牌
  - Gmail OAuth

---

## 1) 安装 gcloud CLI（或使用 Console）

**选项 A：gcloud CLI**（推荐用于自动化）

从 [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install) 安装

初始化并进行身份验证：

```bash
gcloud init
gcloud auth login
```

**选项 B：Cloud Console**

所有步骤都可以通过 [https://console.cloud.google.com](https://console.cloud.google.com) 的 Web UI 完成

---

## 2) 创建 GCP 项目

**CLI：**

```bash
gcloud projects create my-openclaw-project --name="OpenClaw Gateway"
gcloud config set project my-openclaw-project
```

在 [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing) 启用计费（Compute Engine 必需）。

启用 Compute Engine API：

```bash
gcloud services enable compute.googleapis.com
```

**Console：**

1. 转到 IAM & Admin > Create Project
2. 命名并创建
3. 为项目启用计费
4. 导航至 APIs & Services > Enable APIs > 搜索 "Compute Engine API" > Enable

---

## 3) 创建 VM

**机型：**

| 类型      | 规格                   | 费用             | 备注                                             |
| --------- | ---------------------- | ---------------- | ------------------------------------------------ |
| e2-medium | 2 vCPU, 4GB RAM        | ~$25/mo          | 对于本地 Docker 构建最可靠                       |
| e2-small  | 2 vCPU, 2GB RAM        | ~$12/mo          | Docker 构建的最低推荐配置                        |
| e2-micro  | 2 vCPU (共享), 1GB RAM | 符合免费层级条件 | 经常因 Docker 构建出现 OOM（退出代码 137）而失败 |

**CLI：**

```bash
gcloud compute instances create openclaw-gateway \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --boot-disk-size=20GB \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

**Console：**

1. 转到 Compute Engine > VM instances > Create instance
2. 名称：`openclaw-gateway`
3. 区域：`us-central1`，可用区：`us-central1-a`
4. 机器类型：`e2-small`
5. 启动盘：Debian 12, 20GB
6. 创建

---

## 4) SSH 进入虚拟机

**CLI:**

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a
```

**控制台:**

在 Compute Engine 仪表板中，点击您虚拟机旁边的“SSH”按钮。

注意：SSH 密钥传播可能在虚拟机创建后需要 1-2 分钟。如果连接被拒绝，请稍后重试。

---

## 5) 安装 Docker（在虚拟机上）

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

## 7) 创建持久化主机目录

Docker 容器是临时的。
所有长期存在的状态必须存在于主机上。

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

生成强密码：

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

## 10) 共享 Docker 虚拟机运行时步骤

使用共享运行时指南了解通用 Docker 主机流程：

- [将所需的二进制文件烘焙到镜像中](/zh/install/docker-vm-runtime#bake-required-binaries-into-the-image)
- [构建并启动](/zh/install/docker-vm-runtime#build-and-launch)
- [什么内容持久化在哪里](/zh/install/docker-vm-runtime#what-persists-where)
- [更新](/zh/install/docker-vm-runtime#updates)

---

## 11) GCP 特定启动说明

在 GCP 上，如果在 `pnpm install --frozen-lockfile` 期间构建失败并显示 `Killed` 或 `exit code 137`，则虚拟机内存不足。至少使用 `e2-small`，或者使用 `e2-medium` 以进行更可靠的首次构建。

绑定到 LAN (`OPENCLAW_GATEWAY_BIND=lan`) 时，请在继续之前配置受信任的浏览器源：

```bash
docker compose run --rm openclaw-cli config set gateway.controlUi.allowedOrigins '["http://127.0.0.1:18789"]' --strict-json
```

如果您更改了网关端口，请将 `18789` 替换为您配置的端口。

## 12) 从您的笔记本电脑访问

创建 SSH 隧道以转发 Gateway(网关) 端口：

```bash
gcloud compute ssh openclaw-gateway --zone=us-central1-a -- -L 18789:127.0.0.1:18789
```

在浏览器中打开：

`http://127.0.0.1:18789/`

获取一个新的带令牌的仪表板链接：

```bash
docker compose run --rm openclaw-cli dashboard --no-open
```

从该 URL 中粘贴令牌。

如果控制 UI 显示 `unauthorized` 或 `disconnected (1008): pairing required`，请批准浏览器设备：

```bash
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

还需要了解共享持久化和更新参考吗？
请参阅 [Docker VM Runtime](/zh/install/docker-vm-runtime#what-persists-where) 和 [Docker VM Runtime 更新](/zh/install/docker-vm-runtime#updates)。

---

## 故障排除

**SSH 连接被拒绝**

SSH 密钥传播可能需要在 VM 创建后 1-2 分钟。请等待并重试。

**操作系统登录问题**

检查您的操作系统登录配置文件：

```bash
gcloud compute os-login describe-profile
```

确保您的帐户拥有所需的 IAM 权限（Compute OS Login 或 Compute OS Admin Login）。

**内存不足 (OOM)**

如果 Docker 构建失败并显示 `Killed` 和 `exit code 137`，则该 VM 已被 OOM 终止。升级到 e2-small（最低）或 e2-medium（建议用于可靠的本地构建）：

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

对于个人使用，您的默认用户帐户即可正常工作。

对于自动化或 CI/CD 流水线，请创建一个具有最小权限的专用服务帐户：

1. 创建服务帐户：

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

有关 IAM 角色的详细信息，请参阅 [https://cloud.google.com/iam/docs/understanding-roles](https://cloud.google.com/iam/docs/understanding-roles)。

---

## 后续步骤

- 设置消息通道：[Channels](/zh/channels)
- 将本地设备配对为节点：[Nodes](/zh/nodes)
- 配置 Gateway(网关)：[Gateway(网关) configuration](/zh/gateway/configuration)

import zh from "/components/footer/zh.mdx";

<zh />
