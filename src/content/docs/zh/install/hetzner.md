---
summary: "在便宜的 OpenClaw VPS (Gateway(网关)) 上全天候运行 Hetzner Docker，并具有持久状态和内置二进制文件"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "Hetzner"
---

# OpenClaw on Hetzner (Docker, Production VPS Guide)

## 目标

在 Hetzner VPS 上使用 Docker 运行持久化的 OpenClaw Gateway(网关) 网关，具有持久状态、内置二进制文件和安全的重启行为。

如果您想要“以约 5 美元的价格全天候运行 OpenClaw”，这是最简单可靠的设置。
Hetzner 定价可能会有所变化；选择最小的 Debian/Ubuntu VPS，如果遇到 OOM（内存不足）则进行扩容。

安全模型提醒：

- 当每个人都处于同一信任边界且运行时仅用于业务时，公司共享的代理是可以的。
- 保持严格的分离：专用的 VPS/运行时 + 专用账户；该主机上不得有个人 Apple/Google/浏览器/密码管理器配置文件。
- 如果用户之间存在敌对关系，请按 Gateway/主机/操作系统用户进行拆分。

请参阅 [Security](/en/gateway/security) 和 [VPS hosting](/en/vps)。

## 我们要做什么（简单来说）？

- 租一台小型 Linux 服务器 (Hetzner VPS)
- 安装 Docker (隔离的应用运行时)
- 在 Docker 中启动 OpenClaw Gateway(网关) 网关
- 在主机上持久化 `~/.openclaw` + `~/.openclaw/workspace`（在重启/重建后存活）
- 通过 SSH 隧道从您的笔记本电脑访问控制 UI

该挂载的 `~/.openclaw` 状态包括 `openclaw.json`、针对每个代理的
`agents/<agentId>/agent/auth-profiles.json` 以及 `.env`。

可以通过以下方式访问 Gateway：

- 从笔记本电脑进行 SSH 端口转发
- 如果您自行管理防火墙和令牌，则直接暴露端口

本指南假定 Hetzner 上运行的是 Ubuntu 或 Debian。  
如果您使用的是其他 Linux VPS，请相应地映射软件包。
有关通用的 Docker 流程，请参阅 [Docker](/en/install/docker)。

---

## 快速路径（有经验的操作员）

1. 配置 Hetzner VPS
2. 安装 Docker
3. 克隆 OpenClaw 仓库
4. 创建持久化主机目录
5. 配置 `.env` 和 `docker-compose.yml`
6. 将所需的二进制文件烘焙到镜像中
7. `docker compose up -d`
8. 验证持久化和 Gateway 访问

---

## 您需要什么

- 具有 root 访问权限的 Hetzner VPS
- 从笔记本电脑进行 SSH 访问
- 基本掌握 SSH + 复制/粘贴操作
- 约 20 分钟
- Docker 和 Docker Compose
- 模型身份验证凭据
- 可选的提供商凭据
  - WhatsApp 二维码
  - Telegram 机器人令牌
  - Gmail OAuth

---

<Steps>
  <Step title="配置 VPS">
    在 Hetzner 中创建 Ubuntu 或 Debian VPS。

    以 root 用户身份连接：

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    本指南假定 VPS 是有状态的。
    不要将其视为一次性基础设施。

  </Step>

  <Step title="安装 Docker（在 VPS 上）">
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

  </Step>

  <Step title="克隆 OpenClaw 仓库">
    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    ```

    本指南假定您将构建自定义镜像以确保二进制文件的持久性。

  </Step>

  <Step title="创建持久化主机目录">
    Docker 容器是临时的。
    所有长期存在的状态必须驻留在主机上。

    ```bash
    mkdir -p /root/.openclaw/workspace

    # Set ownership to the container user (uid 1000):
    chown -R 1000:1000 /root/.openclaw
    ```

  </Step>

  <Step title="配置环境变量">
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

    此 `.env` 文件用于容器/运行时环境，例如 `OPENCLAW_GATEWAY_TOKEN`。
    存储的提供商 OAuth/API 密钥身份验证位于挂载的
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

  </Step>

  <Step title="Docker Compose 配置">
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

    `--allow-unconfigured` 仅为了引导方便，它不能替代适当的网关配置。仍然需要设置身份验证（`gateway.auth.token` 或密码）并为您的部署使用安全的绑定设置。

  </Step>

  <Step title="共享 Docker VM 运行时步骤">
    使用共享运行时指南了解常见的 Docker 主机流程：

    - [将所需的二进制文件烘焙到镜像中](/en/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [构建并启动](/en/install/docker-vm-runtime#build-and-launch)
    - [什么在哪里持久化](/en/install/docker-vm-runtime#what-persists-where)
    - [更新](/en/install/docker-vm-runtime#updates)

  </Step>

  <Step title="Hetzner 特定访问">
    在完成共享的构建和启动步骤后，从您的笔记本电脑进行隧道连接：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    打开：

    `http://127.0.0.1:18789/`

    粘贴配置的共享密钥。本指南默认使用网关令牌；如果您切换到密码身份验证，请改用该密码。

  </Step>
</Steps>

共享持久化映射位于 [Docker VM Runtime](/en/install/docker-vm-runtime#what-persists-where) 中。

## 基础设施即代码 (Terraform)

对于倾向于使用基础设施即代码工作流的团队，社区维护的 Terraform 设置提供了：

- 模块化的 Terraform 配置以及远程状态管理
- 通过 cloud-init 自动配置
- 部署脚本（引导、部署、备份/恢复）
- 安全加固（防火墙、UFW、仅 SSH 访问）
- 用于网关访问的 SSH 隧道配置

**代码仓库：**

- 基础架构：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 配置：[openclaw-docker-config](https://github.com/andreesg/openclaw-docker-config)

此方法在上述 Docker 设置的基础上增加了可复现的部署、版本控制的基础架构和自动灾难恢复功能。

> **注意：** 由社区维护。如有问题或贡献，请参阅上面的仓库链接。

## 后续步骤

- 设置消息通道：[通道](/en/channels)
- 配置 Gateway(网关)：[Gateway(网关) 配置](/en/gateway/configuration)
- 保持 OpenClaw 更新：[更新](/en/install/updating)
