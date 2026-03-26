---
summary: "面向长期运行的 OpenClaw Gateway 主机的共享 Docker VM 运行时步骤"
read_when:
  - You are deploying OpenClaw on a cloud VM with Docker
  - You need the shared binary bake, persistence, and update flow
title: "Docker VM Runtime"
---

# Docker VM Runtime

基于 VM 的 Docker 安装（例如 GCP、Hetzner 和类似的 VPS 提供商）的共享运行时步骤。

## 将所需的二进制文件烘焙到镜像中

在正在运行的容器内安装二进制文件是一个陷阱。
在运行时安装的任何内容都将在重启时丢失。

技能所需的所有外部二进制文件必须在镜像构建时安装。

下面的示例仅显示了三种常见的二进制文件：

- `gog` 用于 Gmail 访问
- `goplaces` 用于 Google Places
- `wacli` 用于 WhatsApp

这些是示例，并非完整列表。
您可以使用相同的模式安装所需的任意数量的二进制文件。

如果您稍后添加依赖于其他二进制文件的新技能，则必须：

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

<Note>
  上述下载 URL 适用于 x86_64 (amd64)。对于基于 ARM 的虚拟机（例如 Hetzner ARM、GCP Tau T2A），
  请将下载 URL 替换为各工具发布页面中相应的 ARM64 版本。
</Note>

## 构建并启动

```bash
docker compose build
docker compose up -d openclaw-gateway
```

如果在 `pnpm install --frozen-lockfile` 期间构建因 `Killed` 或 `exit code 137` 而失败，则表明虚拟机内存不足。
请在重试前使用更大的机器类型。

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

## 什么在哪里持久化

OpenClaw 在 Docker 中运行，但 Docker 并不是事实来源。
所有长期存在的状态必须在重启、重建和重新启动后依然保留。

| 组件                 | 位置                              | 持久化机制    | 备注                        |
| -------------------- | --------------------------------- | ------------- | --------------------------- |
| Gateway(网关) 配置   | `/home/node/.openclaw/`           | 主机卷挂载    | 包含 `openclaw.json`、令牌  |
| 模型身份验证配置文件 | `/home/node/.openclaw/`           | 主机卷挂载    | OAuth 令牌、API 密钥        |
| 技能配置             | `/home/node/.openclaw/skills/`    | 主机卷挂载    | 技能级状态                  |
| Agent 工作区         | `/home/node/.openclaw/workspace/` | 主机卷挂载    | 代码和 agent 产物           |
| WhatsApp 会话        | `/home/node/.openclaw/`           | 主机卷挂载    | 保留 QR 登录                |
| Gmail 密钥环         | `/home/node/.openclaw/`           | 主机卷 + 密码 | 需要 `GOG_KEYRING_PASSWORD` |
| 外部二进制文件       | `/usr/local/bin/`                 | Docker 镜像   | 必须在构建时烘焙            |
| Node 运行时          | 容器文件系统                      | Docker 镜像   | 每次镜像构建时重建          |
| OS 软件包            | 容器文件系统                      | Docker 镜像   | 不要在运行时安装            |
| Docker 容器          | 临时的                            | 可重启        | 可安全销毁                  |

## 更新

要在虚拟机上更新 OpenClaw：

```bash
git pull
docker compose build
docker compose up -d
```

import zh from "/components/footer/zh.mdx";

<zh />
