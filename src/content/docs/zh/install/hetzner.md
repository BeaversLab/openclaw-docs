---
summary: "OpenClawGateway(网关)HetznerDocker在便宜的 Hetzner VPS (Docker) 上 24/7 运行 OpenClaw Gateway(网关)，具有持久状态和内置二进制文件"
read_when:
  - You want OpenClaw running 24/7 on a cloud VPS (not your laptop)
  - You want a production-grade, always-on Gateway on your own VPS
  - You want full control over persistence, binaries, and restart behavior
  - You are running OpenClaw in Docker on Hetzner or a similar provider
title: "HetznerHetzner"
---

## 目标

使用 Docker 在 Hetzner VPS 上运行持久的 OpenClaw Gateway(网关)，具有持久状态、内置二进制文件和安全的重启行为。

如果您想要“以约 5 美元的价格 24/7 运行 OpenClaw”，这是最简单可靠的设置。
Hetzner 的价格可能会变动；选择最小的 Debian/Ubuntu VPS，如果遇到内存不足 (OOM) 的情况再进行扩容。

安全模型提醒：

- 当所有人都处于同一信任边界且运行时仅用于业务时，公司共享的代理是可以的。
- 保持严格的隔离：专用的 VPS/运行时 + 专用帐户；在该主机上不存放个人 Apple/Google/浏览器/密码管理器配置文件。
- 如果用户之间存在敌对关系，请按 Gateway(网关)/主机/操作系统用户进行拆分。

请参阅 [安全性](/zh/gateway/security) 和 [VPS 托管](/zh/vps)。

## 我们在做什么（简单来说）？

- 租用一个小型 Linux 服务器 (Hetzner VPS)
- 安装 Docker (隔离的应用运行时)
- 在 Docker 中启动 OpenClaw Gateway(网关)
- 在主机上持久化 `~/.openclaw` + `~/.openclaw/workspace`（在重启/重建后仍然存在）
- 通过 SSH 隧道从您的笔记本电脑访问控制 UI

该挂载的 `~/.openclaw` 状态包括 `openclaw.json`、每个代理的
`agents/<agentId>/agent/auth-profiles.json` 和 `.env`。

可以通过以下方式访问 Gateway(网关)：

- 从您的笔记本电脑进行 SSH 端口转发
- 如果您自行管理防火墙和令牌，则可以直接暴露端口

本指南假设在 Hetzner 上使用 Ubuntu 或 Debian。  
如果您使用的是其他 Linux VPS，请相应地映射软件包。
有关通用的 Docker 流程，请参阅 [Docker](/zh/install/docker)。

---

## 快速路径（经验丰富的操作员）

1. 配置 Hetzner VPS
2. 安装 Docker
3. 克隆 OpenClaw 仓库
4. 创建持久主机目录
5. 配置 `.env` 和 `docker-compose.yml`
6. 将所需的二进制文件烘焙到镜像中
7. `docker compose up -d`
8. 验证持久化和 Gateway(网关) 访问

---

## 您需要什么

- 具有 root 访问权限的 Hetzner VPS
- 来自您笔记本电脑的 SSH 访问权限
- 对 SSH + 复制/粘贴的基本了解
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

    以 root 身份连接：

    ```bash
    ssh root@YOUR_VPS_IP
    ```

    本指南假设 VPS 是有状态的。
    请不要将其视为一次性基础设施。

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

    本指南假设您将构建自定义镜像以保证二进制文件的持久性。

  </Step>

  <Step title="创建持久主机目录">
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
    OPENCLAW_GATEWAY_TOKEN=
    OPENCLAW_GATEWAY_BIND=lan
    OPENCLAW_GATEWAY_PORT=18789

    OPENCLAW_CONFIG_DIR=/root/.openclaw
    OPENCLAW_WORKSPACE_DIR=/root/.openclaw/workspace

    GOG_KEYRING_PASSWORD=
    XDG_CONFIG_HOME=/home/node/.openclaw
    ```

    当您希望通过 `.env` 管理稳定的网关
    令牌时，请设置 `OPENCLAW_GATEWAY_TOKEN`；否则请在
    依赖重启期间的客户端之前配置 `gateway.auth.token`OpenClaw。如果这两个来源都不存在，OpenClaw
    将为该启动使用仅运行时令牌。生成一个密钥环密码并将其
    粘贴到 `GOG_KEYRING_PASSWORD` 中：

    ```bash
    openssl rand -hex 32
    ```

    **不要提交此文件。**

    此 `.env` 文件用于容器/运行时环境，例如 `OPENCLAW_GATEWAY_TOKEN`OAuthAPI。
    存储的提供商 OAuth/API 密钥认证位于挂载的
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

  </Step>

  <Step title="DockerDocker Compose 配置">
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

    `--allow-unconfigured` 仅为了引导方便，它不能替代正确的网关配置。仍然需要设置认证（`gateway.auth.token` 或密码）并为您的部署使用安全的绑定设置。

  </Step>

  <Step title="Docker共享 Docker VM 运行时步骤"Docker>
    使用共享运行时指南了解常见的 Docker 主机流程：

    - [将所需的二进制文件嵌入镜像](/zh/install/docker-vm-runtime#bake-required-binaries-into-the-image)
    - [构建并启动](/zh/install/docker-vm-runtime#build-and-launch)
    - [数据持久化位置](/zh/install/docker-vm-runtime#what-persists-where)
    - [更新](/zh/install/docker-vm-runtime#updates)

  </Step>

  <Step title="HetznerHetzner 专用访问">
    在完成共享的构建和启动步骤后，完成以下设置以打开隧道：

    **前提条件：** 确保您的 VPS sshd 配置允许 TCP 转发。如果您
    加固了 SSH 配置，请检查 `/etc/ssh/sshd_config` 并设置为：

    ```
    AllowTcpForwarding local
    ```

    `local` 允许从您的笔记本电脑进行 `ssh -L` 本地转发，同时阻止
    来自服务器的远程转发。将其设置为 `no` 将导致隧道
    失败并显示：
    `channel 3: open failed: administratively prohibited: open failed`

    确认已启用 TCP 转发后，重启 SSH 服务
    (`systemctl restart ssh`) 并从您的笔记本电脑运行隧道：

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 root@YOUR_VPS_IP
    ```

    打开：

    `http://127.0.0.1:18789/`

    粘贴配置好的共享密钥。本指南默认使用网关令牌；
    如果您切换到了密码认证，请改用该密码。

  </Step>
</Steps>

共享持久化映射位于 [Docker VM Runtime](Docker/en/install/docker-vm-runtime#what-persists-where) 中。

## 基础设施即代码

对于偏好基础设施即代码工作流的团队，社区维护的 Terraform 设置提供了：

- 具有远程状态管理的模块化 Terraform 配置
- 通过 cloud-init 自动配置
- 部署脚本（bootstrap、deploy、backup/restore）
- 安全加固（防火墙、UFW、仅 SSH 访问）
- 用于网关访问的 SSH 隧道配置

**代码仓库：**

- 基础设施：[openclaw-terraform-hetzner](https://github.com/andreesg/openclaw-terraform-hetzner)
- Docker 配置：[openclaw-docker-config](Dockerhttps://github.com/andreesg/openclaw-docker-config)

此方法通过可复现的部署、版本控制的基础设施和自动化的灾难恢复，补充了上述 Docker 设置。

<Note>社区维护。如需报告问题或做出贡献，请参阅上面的仓库链接。</Note>

## 后续步骤

- 设置消息通道：[Channels](/zh/channels)
- 配置网关：[Gateway configuration](<Gateway(网关)Gateway(网关)/en/gateway/configuration>)
- 保持 OpenClaw 为最新版本：[更新](/zh/install/updating)

## 相关

- [安装概览](/zh/install)
- [Fly.io](/zh/install/fly)
- [Docker](/zh/install/docker)
- [VPS 托管](/zh/vps)
