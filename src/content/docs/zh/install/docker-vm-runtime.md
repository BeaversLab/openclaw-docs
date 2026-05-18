---
summary: "面向长期运行的 OpenClaw Gateway(网关) 主机的共享 Docker VM 运行时步骤"
read_when:
  - You are deploying OpenClaw on a cloud VM with Docker
  - You need the shared binary bake, persistence, and update flow
title: "Docker VM runtime"
---

基于虚拟机的 Docker 安装（例如 GCP、Hetzner 和类似的 VPS 提供商）的通用运行时步骤。

## 将所需的二进制文件烘焙到镜像中

在运行中的容器内安装二进制文件是一个陷阱。
在运行时安装的任何内容都将在重启时丢失。

技能所需的所有外部二进制文件必须在镜像构建时安装。

下面的示例仅展示了三种常见的二进制文件：

- `gog` (来自 `gogcli`) 用于 Gmail 访问
- `goplaces` 用于 Google Places
- `wacli` 用于 WhatsApp

这些只是示例，并非完整列表。
您可以使用相同的模式安装所需的任意数量的二进制文件。

如果您稍后添加依赖于额外二进制文件的新技能，则必须：

1. 更新 Dockerfile
2. 重新构建镜像
3. 重启容器

**示例 Dockerfile**

```dockerfile
FROM node:24-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI (gogcli — installs as `gog`)
# Copy the current Linux asset URL from https://github.com/steipete/gogcli/releases
RUN curl -L https://github.com/steipete/gogcli/releases/latest/download/gogcli_linux_amd64.tar.gz \
  | tar -xzO gog > /usr/local/bin/gog; \
  chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
# Copy the current Linux asset URL from https://github.com/steipete/goplaces/releases
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_linux_amd64.tar.gz \
  | tar -xzO goplaces > /usr/local/bin/goplaces; \
  chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
# Copy the current Linux asset URL from https://github.com/steipete/wacli/releases
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli-linux-amd64.tar.gz \
  | tar -xzO wacli > /usr/local/bin/wacli; \
  chmod +x /usr/local/bin/wacli

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

<Note>上述 URL 仅作示例。对于基于 ARM 的虚拟机，请选择 `arm64` 资产。为了实现可复现的构建，请固定版本化的发布 URL。</Note>

## 构建和启动

```bash
docker compose build
docker compose up -d openclaw-gateway
```

如果在 `pnpm install --frozen-lockfile` 期间构建因 `Killed` 或 `exit code 137` 而失败，则表示虚拟机内存不足。
请在重试前使用更大规格的机器。

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

验证 Gateway(网关)：

```bash
docker compose logs -f openclaw-gateway
```

预期输出：

```
[gateway] listening on ws://0.0.0.0:18789
```

## 什么内容在哪里持久化

OpenClaw 在 Docker 中运行，但 Docker 并不是事实的来源。
所有长期存在的状态必须在重启、重新构建和系统重启后依然存在。

| 组件                 | 位置                                                   | 持久化机制    | 备注                                                          |
| -------------------- | ------------------------------------------------------ | ------------- | ------------------------------------------------------------- |
| Gateway(网关) 配置   | `/home/node/.openclaw/`                                | 主机卷挂载    | 包括 `openclaw.json`、`.env`                                  |
| 模型身份验证配置文件 | `/home/node/.openclaw/agents/`                         | 主机卷挂载    | `agents/<agentId>/agent/auth-profiles.json` (OAuth、API 密钥) |
| Auth 配置文件密钥    | `/home/node/.config/openclaw/`                         | 主机卷挂载    | OAuth auth 配置文件令牌材料的本地加密密钥                     |
| 技能配置             | `/home/node/.openclaw/skills/`                         | 主机卷挂载    | 技能级别状态                                                  |
| Agent 工作区         | `/home/node/.openclaw/workspace/`                      | 主机卷挂载    | 代码和 Agent 制品                                             |
| WhatsApp 会话        | `/home/node/.openclaw/`                                | 主机卷挂载    | 保留 QR 登录                                                  |
| Gmail 密钥环         | `/home/node/.openclaw/`                                | 主机卷 + 密码 | 需要 `GOG_KEYRING_PASSWORD`                                   |
| 插件包               | `/home/node/.openclaw/npm`, `/home/node/.openclaw/git` | 主机卷挂载    | 可下载的插件包根目录                                          |
| 外部二进制文件       | `/usr/local/bin/`                                      | Docker 镜像   | 必须在构建时烘焙                                              |
| Node 运行时          | 容器文件系统                                           | Docker 镜像   | 每次镜像构建时重新构建                                        |
| OS 包                | 容器文件系统                                           | Docker 镜像   | 不要在运行时安装                                              |
| Docker 容器          | 临时                                                   | 可重启        | 可安全销毁                                                    |

## 更新

要在 VM 上更新 OpenClaw：

```bash
git pull
docker compose build
docker compose up -d
```

## 相关

- [Docker](Docker/en/install/docker)
- [Podman](/zh/install/podman)
- [ClawDock](/zh/install/clawdock)
