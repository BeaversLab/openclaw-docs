---
summary: "OpenClaw 的可选 Docker 设置和入门"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

# Docker（可选）

Docker 是**可选的**。仅在您需要容器化网关或验证 Docker 流程时使用。

## Docker 适合我吗？

- **是**：您需要一个隔离的、可丢弃的网关环境，或者希望在未进行本地安装的主机上运行 OpenClaw。
- **否**：你在自己的机器上运行，只想要最快的开发循环。请改用正常安装流程。
- **沙盒说明**：代理沙盒也使用 Docker，但**不**要求整个网关在 Docker 中运行。请参阅 [沙盒](/zh/en/gateway/sandboxing)。

本指南涵盖：

- 容器化网关（Docker 中的完整 OpenClaw）
- 每会话代理沙箱（主机网关 + Docker 隔离的代理工具）

沙盒详情：[沙盒](/zh/en/gateway/sandboxing)

## 要求

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 构建镜像至少需要 2 GB RAM（在 1 GB 主机上，`pnpm install` 可能会因 OOM 被终止，退出代码为 137）
- 足够的磁盘空间用于镜像 + 日志
- 如果在 VPS/公共主机上运行，请查看
  [针对网络暴露的安全加固](/zh/en/gateway/security#04-network-exposure-bind--port--firewall)，
  特别是 Docker `DOCKER-USER` 防火墙策略。

## 容器化网关 (Docker Compose)

### 快速入门（推荐）

<Note>
此处 Docker 默认值假定绑定模式（`lan`/`loopback`），而非主机别名。请使用 `gateway.bind` 中的绑定模式值（例如 `lan` 或 `loopback`），而不要使用类似
`0.0.0.0` 或 `localhost` 的主机别名。
</Note>

从仓库根目录：

```bash
./docker-setup.sh
```

此脚本：

- 在本地构建网关镜像（如果设置了 `OPENCLAW_IMAGE` 则拉取远程镜像）
- 运行入门向导
- 打印可选的提供程序设置提示
- 通过 Docker Compose 启动网关
- 生成一个网关令牌并将其写入 `.env`

可选环境变量：

- `OPENCLAW_IMAGE` — 使用远程镜像而不是在本地构建（例如 `ghcr.io/openclaw/openclaw:latest`）
- `OPENCLAW_DOCKER_APT_PACKAGES` — 在构建期间安装额外的 apt 软件包
- `OPENCLAW_EXTENSIONS` — 在构建时预先安装扩展依赖（以空格分隔的扩展名称，例如 `diagnostics-otel matrix`）
- `OPENCLAW_EXTRA_MOUNTS` — 添加额外的主机绑定挂载
- `OPENCLAW_HOME_VOLUME` — 在命名卷中持久化 `/home/node`
- `OPENCLAW_SANDBOX` — 选择加入 Docker 网关沙箱引导。仅显式的真值会启用它：`1`、`true`、`yes`、`on`
- `OPENCLAW_INSTALL_DOCKER_CLI` — 本地镜像构建的构建参数传递（`1` 在镜像中安装 Docker CLI）。当本地构建 `OPENCLAW_SANDBOX=1` 时，`docker-setup.sh` 会自动设置此项。
- `OPENCLAW_DOCKER_SOCKET` — 覆盖 Docker 套接字路径（默认：`DOCKER_HOST=unix://...` 路径，否则为 `/var/run/docker.sock`）
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` — 紧急情况：允许受信任的专用网络
  `ws://` 针对 CLI/入门客户端路径的目标（默认为仅限环回）
- `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` — 禁用容器浏览器强化标志
  当您需要
  WebGL/3D 兼容性时，`--disable-3d-apis`，`--disable-software-rasterizer`，`--disable-gpu`。
- `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` — 在浏览器运行时保持扩展程序启用
  流程需要它们（默认情况下，扩展在沙盒浏览器中保持禁用状态）。
- `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` — 设置 Chromium 渲染进程
  限制；设置为 `0` 可跳过该标志并使用 Chromium 的默认行为。

完成后：

- 在浏览器中打开 `http://127.0.0.1:18789/`。
- 将令牌粘贴到控制 UI（Settings → token）中。
- 需要再次获取 URL？请运行 `docker compose run --rm openclaw-cli dashboard --no-open`。

### 为 Docker 网关启用代理沙盒（可选加入）

`docker-setup.sh` 也可以为 Docker 部署引导 `agents.defaults.sandbox.*`。

启用方式：

```bash
export OPENCLAW_SANDBOX=1
./docker-setup.sh
```

自定义套接字路径（例如无根 Docker）：

```bash
export OPENCLAW_SANDBOX=1
export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
./docker-setup.sh
```

注意事项：

- 该脚本仅在沙箱先决条件通过后才会挂载 `docker.sock`。
- 如果沙盒设置无法完成，脚本将重置
  `agents.defaults.sandbox.mode` 以 `off` 从而在重新运行时避免过时/损坏的沙箱配置。
- 如果缺少 `Dockerfile.sandbox`，脚本会打印警告并继续；
  如果需要，请使用 `scripts/sandbox-setup.sh` 构建 `openclaw-sandbox:bookworm-slim`。
- 对于非本地的 `OPENCLAW_IMAGE` 值，镜像必须已包含 Docker
  CLI 支持沙箱执行。

### 自动化/CI（非交互，无 TTY 噪音）

对于脚本和 CI，请使用 `-T` 禁用 Compose 伪 TTY 分配：

```bash
docker compose run -T --rm openclaw-cli gateway probe
docker compose run -T --rm openclaw-cli devices list --json
```

如果您的自动化流程不导出 Claude 会话变量，现在不设置它们，在 `docker-compose.yml` 中默认会解析为空值，以避免重复出现“变量未设置”警告。

### 共享网络安全注意事项（CLI + 网关）

`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 命令
能够通过 Docker 中的 `127.0.0.1` 可靠地访问网关。

请将此视为共享信任边界：回环绑定并不是这两个容器之间的隔离机制。如果您需要更强的隔离，请从单独的容器/主机网络路径运行命令，而不是使用捆绑的 `openclaw-cli` 服务。

为了在 CLI 进程受损时降低影响，compose 配置会删除
`NET_RAW`/`NET_ADMIN` 并在 `openclaw-cli` 上启用 `no-new-privileges`。

它在宿主机上写入 config/workspace：

- `~/.openclaw/`
- `~/.openclaw/workspace`

在 VPS 上运行？请参阅 [Hetzner (Docker VPS)](/zh/en/install/hetzner)。

### 使用远程镜像（跳过本地构建）

官方预构建镜像发布于：

- [GitHub Container Registry 包](https://github.com/openclaw/openclaw/pkgs/container/openclaw)

请使用镜像名称 `ghcr.io/openclaw/openclaw`（而不是名称相似的 Docker Hub 镜像）。

常用标签：

- `main` — 来自 `main` 的最新构建
- `<version>` — 发布标签构建（例如 `2026.2.26`）
- `latest` — 最新稳定版本标签

### 基础镜像元数据

主要的 Docker 镜像目前使用：

- `node:24-bookworm`

Docker 镜像现已发布 OCI 基础镜像注解（sha256 是一个示例，指向该标签固定多架构清单列表）：

- `org.opencontainers.image.base.name=docker.io/library/node:24-bookworm`
- `org.opencontainers.image.base.digest=sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b`
- `org.opencontainers.image.source=https://github.com/openclaw/openclaw`
- `org.opencontainers.image.url=https://openclaw.ai`
- `org.opencontainers.image.documentation=https://docs.openclaw.ai/install/docker`
- `org.opencontainers.image.licenses=MIT`
- `org.opencontainers.image.title=OpenClaw`
- `org.opencontainers.image.description=OpenClaw gateway and CLI runtime container image`
- `org.opencontainers.image.revision=<git-sha>`
- `org.opencontainers.image.version=<tag-or-main>`
- `org.opencontainers.image.created=<rfc3339 timestamp>`

参考：[OCI 镜像注解](https://github.com/opencontainers/image-spec/blob/main/annotations.md)

发布上下文：此仓库的带标签历史记录在 `v2026.2.22` 和更早的 2026 标签（例如 `v2026.2.21`、`v2026.2.9`）中已经使用了 Bookworm。

默认情况下，安装脚本会从源代码构建镜像。要改为拉取预构建的
镜像，请在运行脚本之前设置 `OPENCLAW_IMAGE`：

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
./docker-setup.sh
```

脚本检测到 `OPENCLAW_IMAGE` 不是默认的 `openclaw:local`，并运行 `docker pull` 而不是 `docker build`。其他所有内容（入门、网关启动、令牌生成）的工作方式相同。

`docker-setup.sh` 仍然从存储库根目录运行，因为它使用本地的 `docker-compose.yml` 和辅助文件。`OPENCLAW_IMAGE` 跳过本地镜像构建时间；它不替代 compose/setup 工作流。

### Shell 助手（可选）

为了更轻松地进行日常 Docker 管理，请安装 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
```

**添加到您的 shell 配置（zsh）：**

```bash
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。为所有命令运行 `clawdock-help`。

有关详细信息，请参阅 [`ClawDock` Helper README](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md)。

### 手动流程（Compose）

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

注意：请从仓库根目录运行 `docker compose ...`。如果您启用了
`OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，设置脚本将写入
`docker-compose.extra.yml`；在其他位置运行 Compose 时请包含该文件：

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml <command>
```

### 控制 UI 令牌 + 配对 (Docker)

如果您看到“unauthorized”或“disconnected (1008): pairing required”，请获取新的仪表板链接并批准浏览器设备：

```bash
docker compose run --rm openclaw-cli dashboard --no-open
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

更多信息：[Dashboard](/zh/en/web/dashboard)、[Devices](/zh/en/cli/devices)。

### 额外挂载（可选）

如果要将其他主机目录挂载到容器中，请在运行 `docker-setup.sh` 之前设置 `OPENCLAW_EXTRA_MOUNTS`。这接受以逗号分隔的 Docker 绑定挂载列表，并通过生成 `docker-compose.extra.yml` 将其应用于 `openclaw-gateway` 和 `openclaw-cli`。

示例：

```bash
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意事项：

- 路径必须与 macOS/Windows 上的 Docker Desktop 共享。
- 每个条目必须是 `source:target[:options]`，且不能有空格、制表符或换行符。
- 如果编辑 `OPENCLAW_EXTRA_MOUNTS`，请重新运行 `docker-setup.sh` 以重新生成
  额外的 compose 文件。
- `docker-compose.extra.yml` 是自动生成的。请勿手动编辑。

### 持久化整个容器主目录（可选）

如果您希望 `/home/node` 在重新创建容器后仍然保留，请通过 `OPENCLAW_HOME_VOLUME` 设置命名卷。这会创建一个 Docker 卷并将其挂载到 `/home/node`，同时保留标准的 config/workspace 绑定挂载。请在此处使用命名卷（而非绑定路径）；对于绑定挂载，请使用 `OPENCLAW_EXTRA_MOUNTS`。

示例：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

您可以将其与额外的挂载结合使用：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意事项：

- 命名卷必须匹配 `^[A-Za-z0-9][A-Za-z0-9_.-]*$`。
- 如果您更改 `OPENCLAW_HOME_VOLUME`，请重新运行 `docker-setup.sh` 以重新生成
  额外的 compose 文件。
- 命名卷会一直保留，直到使用 `docker volume rm <name>` 将其删除。

### 安装额外的 apt 软件包（可选）

如果您在镜像内需要系统软件包（例如，构建工具或媒体库），请在运行 `docker-setup.sh` 之前设置 `OPENCLAW_DOCKER_APT_PACKAGES`。
这会在镜像构建期间安装这些软件包，因此即使删除容器，它们也会保留。

示例：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

备注：

- 此选项接受一个以空格分隔的 apt 软件包名称列表。
- 如果您更改 `OPENCLAW_DOCKER_APT_PACKAGES`，请重新运行 `docker-setup.sh` 以进行重新构建
  镜像。

### 预安装扩展依赖（可选）

拥有自己的 `package.json`（例如 `diagnostics-otel`、`matrix`、
`msteams`）的扩展会在首次加载时安装其 npm 依赖项。要将这些
依赖项直接构建到镜像中，请在运行
`docker-setup.sh` 之前设置 `OPENCLAW_EXTENSIONS`：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel matrix"
./docker-setup.sh
```

或者在直接构建时：

```bash
docker build --build-arg OPENCLAW_EXTENSIONS="diagnostics-otel matrix" .
```

注意事项：

- 这接受一个以空格分隔的扩展目录名称列表（位于 `extensions/` 下）。
- 只有带有 `package.json` 的扩展会受到影响；没有此标记的轻量级插件会被忽略。
- 如果更改 `OPENCLAW_EXTENSIONS`，请重新运行 `docker-setup.sh` 以进行重新构建
  该镜像。

### 高级用户 / 功能齐全的容器（可选）

默认 Docker 镜像是 **security-first**（安全优先）的，并以非 root `node`
用户身份运行。这减小了攻击面，但也意味着：

- 运行时不进行系统软件包安装
- 默认没有 Homebrew
- 无捆绑的 Chromium/Playwright 浏览器

如果您想要功能更全的容器，请使用这些可选配置：

1. **持久化 `/home/node`** 以便浏览器下载和工具缓存得以保留：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

2. **将系统依赖项烘焙到镜像中**（可重复 + 持久）：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"
./docker-setup.sh
```

3. **在不使用 `npx` 的情况下安装 Playwright 浏览器**（避免 npm 覆盖冲突）：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

如果您需要 Playwright 安装系统依赖，请使用
`OPENCLAW_DOCKER_APT_PACKAGES` 重新构建镜像，而不是在运行时使用 `--with-deps`。

4. **持久化 Playwright 浏览器下载**：

- 在 `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 中设置
  `docker-compose.yml`。
- 确保 `/home/node` 通过 `OPENCLAW_HOME_VOLUME` 持久化，或者挂载
  `/home/node/.cache/ms-playwright` 通过 `OPENCLAW_EXTRA_MOUNTS`。

### 权限 + EACCES

镜像以 `node`（uid 1000）身份运行。如果您在 `/home/node/.openclaw` 上看到权限错误，请确保您的主机绑定挂载归 uid 1000 所有。

示例（Linux 主机）：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您为了方便选择以 root 用户身份运行，则意味着您接受相应的安全权衡。

### 更快的重建（推荐）

为了加快重新构建的速度，请排列您的 Dockerfile 以便缓存依赖层。
这可以避免重新运行 `pnpm install`，除非锁定文件发生了变化：

```dockerfile
FROM node:24-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# Cache dependencies unless package metadata changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

### 通道设置（可选）

使用 CLI 容器来配置通道，然后在必要时重启网关。

WhatsApp（二维码）：

```bash
docker compose run --rm openclaw-cli channels login
```

Telegram (bot token)：

```bash
docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"
```

Discord（机器人令牌）：

```bash
docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
```

文档：[WhatsApp](/zh/en/channels/whatsapp)、[Telegram](/zh/en/channels/telegram)、[Discord](/zh/en/channels/discord)

### OpenAI Codex OAuth（无头 Docker）

如果您在向导中选择 OpenAI Codex OAuth，它会打开一个浏览器 URL 并尝试在 `http://127.0.0.1:1455/auth/callback` 上捕获回调。在 Docker 或无头（headless）设置中，该回调可能会显示浏览器错误。请复制您重定向到的完整 URL 并将其粘贴回向导以完成身份验证。

### 健康检查

容器探测端点（无需认证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz
curl -fsS http://127.0.0.1:18789/readyz
```

别名：`/health` 和 `/ready`。

`/healthz` 是一个用于检查“网关进程已启动”的浅层存活探针。
`/readyz` 在启动宽限期内保持就绪，然后仅当所需的托管通道在宽限期后仍未连接或随后断开连接时，才变为 `503`。

Docker 镜像包含一个内置的 `HEALTHCHECK`，它会在后台 ping `/healthz`。通俗地说：Docker 会持续检查 OpenClaw 是否仍然响应。如果检查持续失败，Docker 会将容器标记为 `unhealthy`，编排系统（Docker Compose 重启策略、Swarm、Kubernetes 等）可以自动重启或替换它。

经过身份验证的深度健康快照（网关 + 通道）：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### E2E 冒烟测试 (Docker)

```bash
scripts/e2e/onboard-docker.sh
```

### QR 导入冒烟测试（Docker）

```bash
pnpm test:docker:qr
```

### 局域网 vs 回环 (Docker Compose)

`docker-setup.sh` 默认为 `OPENCLAW_GATEWAY_BIND=lan`，以便主机对
`http://127.0.0.1:18789` 的访问可通过 Docker 端口发布正常工作。

- `lan` (默认)：主机浏览器 + 主机 CLI 可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程可以访问
  直接访问网关；主机发布的端口访问可能会失败。

设置脚本在加入后还会固定 `gateway.mode=local`，以便 Docker CLI 命令默认指向本地回环。

旧配置说明：在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` /
`custom` / `tailnet` / `auto`），而不是主机别名（`0.0.0.0`, `127.0.0.1`,
`localhost`, `::`, `::1`）。

如果您从 Docker CLI 命令中看到 `Gateway target: ws://172.x.x.x:18789` 或重复的 `pairing required` 错误，请运行：

```bash
docker compose run --rm openclaw-cli config set gateway.mode local
docker compose run --rm openclaw-cli config set gateway.bind lan
docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
```

### 注意事项

- 网关绑定默认为 `lan` 用于容器使用 (`OPENCLAW_GATEWAY_BIND`)。
- Dockerfile CMD 使用 `--allow-unconfigured`；挂载配置 `gateway.mode` 但没有 `local` 仍会启动。覆盖 CMD 以强制执行保护措施。
- 网关容器是会话的单一事实来源（`~/.openclaw/agents/<agentId>/sessions/`）。

### 存储模型

- **持久主机数据：** Docker Compose 将 `OPENCLAW_CONFIG_DIR` 绑定挂载到 `/home/node/.openclaw`，并将 `OPENCLAW_WORKSPACE_DIR` 绑定挂载到 `/home/node/.openclaw/workspace`，因此这些路径在容器替换后仍然保留。
- **临时沙盒 tmpfs：**当启用 `agents.defaults.sandbox` 时，沙盒容器会对 `/tmp`、`/var/tmp` 和 `/run` 使用 `tmpfs`。这些挂载与顶层 Compose 栈是分离的，并会随沙盒容器一起消失。
- **磁盘增长热点：** 请关注 `media/`、`agents/<agentId>/sessions/sessions.json`、transcript JSONL 文件、`cron/runs/*.jsonl` 以及 `/tmp/openclaw/`（或您配置的 `logging.file`）下的滚动文件日志。如果您还在 Docker 之外运行 macOS 应用，其服务日志是分开的：`~/.openclaw/logs/gateway.log`、`~/.openclaw/logs/gateway.err.log` 和 `/tmp/openclaw/openclaw-gateway.log`。

## Agent Sandbox（主机网关 + Docker 工具）

深入探讨：[沙箱机制](/zh/en/gateway/sandboxing)

### 其作用

当启用 `agents.defaults.sandbox` 时，**非主会话**在 Docker 容器内运行工具。网关保留在您的主机上，但工具执行是隔离的：

- scope：默认为 `"agent"`（每个代理一个容器 + 工作区）
- scope: `"session"` 用于每会话隔离
- 挂载在 `/workspace` 的每个作用域工作区文件夹
- 可选的代理工作区访问（`agents.defaults.sandbox.workspaceAccess`）
- 允许/拒绝工具策略（拒绝优先）
- 入站媒体会被复制到活动的沙盒工作区 (`media/inbound/*`)，以便工具可以读取它（使用 `workspaceAccess: "rw"` 时，它会存放在代理工作区中）

警告：`scope: "shared"` 禁用跨会话隔离。所有会话共享
一个容器和一个工作区。

### Per-agent sandbox profiles (multi-agent)

如果您使用多代理路由，每个代理都可以覆盖沙箱 + 工具设置：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上 `agents.list[].tools.sandbox.tools`）。这允许您在一个网关中运行
混合访问级别：

- 完全访问（个人代理）
- 只读工具 + 只读工作区（家庭/工作代理）
- 无文件系统/Shell 工具（公开代理）

有关示例、优先级和故障排除，请参阅[Multi-Agent Sandbox & Tools](/zh/en/tools/multi-agent-sandbox-tools)。

### 默认行为

- 镜像：`openclaw-sandbox:bookworm-slim`
- 每个 Agent 一个容器
- Agent 工作区访问：`workspaceAccess: "none"`（默认）使用 `~/.openclaw/sandboxes`
  - `"ro"` 将沙箱工作区保留在 `/workspace`，并以只读方式将代理工作区挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）
  - `"rw"` 以读/写方式将代理工作区挂载到 `/workspace`
- 自动清理：空闲 > 24h 或 年龄 > 7d
- 网络：默认情况下 `none`（如果需要出口流量，请明确选择加入）
  - `host` 被阻止。
  - `container:<id>` 默认被阻止（存在命名空间加入风险）。
- 默认允许：`exec`、`process`、`read`、`write`、`edit`、`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- 默认拒绝：`browser`，`canvas`，`nodes`，`cron`，`discord`，`gateway`

### 启用沙盒隔离

如果您计划在 `setupCommand` 中安装软件包，请注意：

- 默认 `docker.network` 为 `"none"`（无出口）。
- `docker.network: "host"` 被阻止。
- `docker.network: "container:<id>"` 默认被阻止。
- Break-glass 覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。
- `readOnlyRoot: true` 会阻止软件包安装。
- `user` 对于 `apt-get` 必须是 root 用户（省略 `user` 或设置 `user: "0:0"`）。
  当 `setupCommand`（或 docker 配置）发生变化时，OpenClaw 会自动重新创建容器，
  除非该容器是**最近使用过的**（约 5 分钟内）。热容器
  会记录一条包含确切 `openclaw sandbox recreate ...` 命令的警告。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared (agent is default)
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
        },
        prune: {
          idleHours: 24, // 0 disables idle pruning
          maxAgeDays: 7, // 0 disables max-age pruning
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

加固开关位于 `agents.defaults.sandbox.docker` 下：
`network`, `user`, `pidsLimit`, `memory`, `memorySwap`, `cpus`, `ulimits`,
`seccompProfile`, `apparmorProfile`, `dns`, `extraHosts`,
`dangerouslyAllowContainerNamespaceJoin`（仅限紧急情况）。

多代理：通过 `agents.list[].sandbox.{docker,browser,prune}.*` 为每个代理覆盖 `agents.defaults.sandbox.{docker,browser,prune}.*`
（当 `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` 为 `"shared"` 时将被忽略）。

### 构建默认沙箱镜像

```bash
scripts/sandbox-setup.sh
```

这将使用 `Dockerfile.sandbox` 构建 `openclaw-sandbox:bookworm-slim`。

### Sandbox 通用镜像（可选）

如果您想要一个包含常用构建工具（Node、Go、Rust 等）的沙箱镜像，请构建通用镜像：

```bash
scripts/sandbox-common-setup.sh
```

这将构建 `openclaw-sandbox-common:bookworm-slim`。要使用它：

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "openclaw-sandbox-common:bookworm-slim" } },
    },
  },
}
```

### Sandbox 浏览器镜像

要在沙盒内运行浏览器工具，请构建浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

这使用
`Dockerfile.sandbox-browser` 构建 `openclaw-sandbox-browser:bookworm-slim`。容器运行启用了 CDP 的 Chromium，
以及一个可选的 noVNC 观察器（通过 Xvfb 进行有头操作）。

注意事项：

- Headful (Xvfb) 比无头模式更能减少机器人拦截。
- 通过设置 `agents.defaults.sandbox.browser.headless=true` 仍然可以使用 Headless。
- 不需要完整的桌面环境（GNOME）；Xvfb 提供显示。
- 浏览器容器默认使用专用 Docker 网络 (`openclaw-sandbox-browser`)，而不是全局 `bridge`。
- 可选 `agents.defaults.sandbox.browser.cdpSourceRange` 通过 CIDR 限制容器边缘 CDP 入站流量（例如 `172.21.0.1/32`）。
- noVNC 观察者访问默认受密码保护；OpenClaw 提供一个短期的观察者令牌 URL，该 URL 提供一个本地引导页面并将密码保留在 URL 片段中（而不是 URL 查询中）。
- 针对共享/容器工作负载，浏览器容器启动默认值较为保守，包括：
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-software-rasterizer`
  - `--disable-gpu`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--metrics-recording-only`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--disable-extensions`
  - 如果设置了 `agents.defaults.sandbox.browser.noSandbox`，`--no-sandbox` 和
    `--disable-setuid-sandbox` 也会被追加。
  - 上述三个图形加固标志是可选的。如果您的工作负载需要
    WebGL/3D，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 以在不使用
    `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 的情况下运行。
  - 扩展行为由 `--disable-extensions` 控制，并且可以通过
    `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 禁用（启用扩展），用于
    依赖扩展的页面或重度使用扩展的工作流。
  - `--renderer-process-limit=2` 也可以通过
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT` 进行配置；设置 `0` 以让 Chromium 在
    需要调整浏览器并发性时选择其默认进程限制。

默认情况下，捆绑的映像会应用默认值。如果您需要不同的
Chromium 标志，请使用自定义浏览器映像并提供您自己的入口点。

使用配置：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true },
      },
    },
  },
}
```

自定义浏览器镜像：

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-openclaw-browser" } },
    },
  },
}
```

启用后，代理将接收：

- 沙盒浏览器控制 URL（用于 `browser` 工具）
- noVNC URL（如果已启用且 headless=false）

请记住：如果您使用工具允许列表，请添加 `browser`（并将其从拒绝列表中移除），否则该工具仍将被阻止。修剪规则（`agents.defaults.sandbox.prune`）也适用于浏览器容器。

### 自定义沙箱镜像

构建您自己的镜像并将配置指向它：

```bash
docker build -t my-openclaw-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-openclaw-sbx" } },
    },
  },
}
```

### 工具策略（允许/拒绝）

- `deny` 优先于 `allow`。
- 如果 `allow` 为空：所有工具（拒绝除外）均可用。
- 如果 `allow` 非空：则仅 `allow` 中的工具可用（减去拒绝项）。

### 清理策略

两个选项：

- `prune.idleHours`：移除 X 小时内未使用的容器（0 = 禁用）
- `prune.maxAgeDays`：移除超过 X 天的容器（0 = 禁用）

示例：

- 保持繁忙会话但限制生存期：
  `idleHours: 24`，`maxAgeDays: 7`
- 从不修剪：
  `idleHours: 0`, `maxAgeDays: 0`

### 安全注意事项

- 硬性墙仅适用于 **工具**（exec/read/write/edit/apply_patch）。
- 仅限主机的工具（如浏览器/相机/画布）默认被阻止。
- 在沙箱中允许 `browser` 会**破坏隔离性**（浏览器在主机上运行）。

## 故障排除

- 镜像缺失：使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) 构建，或设置 `agents.defaults.sandbox.docker.image`。
- 容器未运行：它将根据每个会话的需求自动创建。
- 沙盒中的权限错误：将 `docker.user` 设置为与您的用户组匹配的 UID:GID
  挂载的工作区所有权（或对工作区文件夹执行 chown）。
- 未找到自定义工具：OpenClaw 使用 `sh -lc`（登录 shell）运行命令，这
  获取 `/etc/profile` 并且可能会重置 PATH。设置 `docker.env.PATH` 以将您的
  自定义工具路径（例如，`/custom/bin:/usr/local/share/npm-global/bin`）添加到前面，或者在 Dockerfile 中的 `/etc/profile.d/` 下
  添加脚本。

import zh from '/components/footer/zh.mdx';

<zh />
