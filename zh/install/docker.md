---
summary: "基于 Docker 的可选 OpenClaw 设置和引导"
read_when:
  - "您想要一个容器化的 gateway 而不是本地安装"
  - "您正在验证 Docker 流程"
title: "Docker"
---

# Docker（可选）

Docker **可选**。只有在你想用容器化 gateway，或验证 Docker 流程时才需要。

## Docker 适合我吗？

- **是**：你想要一个隔离、可丢弃的 gateway 环境，或在没有本地安装的主机上运行 OpenClaw。
- **否**：你在自己的机器上只想要最快的开发循环。请用常规安装流程。
- **Sandboxing 说明**：agent sandboxing 也会用到 Docker，但**不要求** gateway 运行在 Docker 中。见 [沙盒隔离](/zh/gateway/sandboxing)。

本指南涵盖：

- 容器化 Gateway（完整 OpenClaw in Docker）
- 按会话的 Agent Sandbox（宿主机 gateway + Docker 隔离工具）

Sandboxing 细节：[沙盒隔离](/zh/gateway/sandboxing)

## 要求

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 足够磁盘空间存镜像与日志

## 容器化 Gateway（Docker Compose）

### 快速开始（推荐）

在仓库根目录：

```bash
./docker-setup.sh
```

该脚本会：

- 构建 gateway 镜像
- 运行 onboarding 向导
- 打印可选的 provider 设置提示
- 通过 Docker Compose 启动 gateway
- 生成 gateway token 并写入 `.env`

可选环境变量：

- `OPENCLAW_DOCKER_APT_PACKAGES` — 构建时安装额外 apt 包
- `OPENCLAW_EXTRA_MOUNTS` — 添加额外的宿主机 bind mount
- `OPENCLAW_HOME_VOLUME` — 使用命名卷持久化 `/home/node`

完成后：

- 在浏览器打开 `http://127.0.0.1:18789/`。
- 在 Control UI 中粘贴 token（Settings → token）。
- 再次需要带 token 的 URL？运行 `docker compose run --rm openclaw-cli dashboard --no-open`。

运行在 VPS？见 [Hetzner (Docker VPS)](/zh/platforms/hetzner)。

- `~/.openclaw/`
- `~/.openclaw/workspace`

在 VPS 上运行？见 [Hetzner (/zh/platforms/hetzner)](/zh/platforms/hetzner)。

### 额外挂载（可选）

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

如果你想把更多宿主机目录挂进容器，在运行 `docker-setup.sh` 前设置
`OPENCLAW_EXTRA_MOUNTS`。它接受逗号分隔的 Docker bind mount 列表，
并通过生成 `docker-compose.extra.yml` 应用于 `openclaw-gateway` 和 `openclaw-cli`。

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml <command>
```

### Control UI token + 配对 (Docker)

注意：

```bash
docker compose run --rm openclaw-cli dashboard --no-open
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

更多详情：[Dashboard](/zh/web/dashboard), [Devices](/zh/cli/devices)。

### 额外挂载（可选）

如果您想将更多宿主机目录挂载到容器中，请在运行 `docker-setup.sh` 前设置
`OPENCLAW_EXTRA_MOUNTS`。这接受逗号分隔的 Docker bind mount 列表，
并通过生成 `docker-compose.extra.yml` 将其应用于 `openclaw-gateway` 和 `openclaw-cli`。

为了加速重建，请按依赖缓存层来组织 Dockerfile，避免在锁文件不变时
重复运行 `pnpm install`：

```bash
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

如果希望 `/home/node` 在容器重建后仍保持，设置 `OPENCLAW_HOME_VOLUME`
创建一个命名卷并挂载到 `/home/node`，同时仍保留标准的 config/workspace 绑定。
这里请用**命名卷**（而非 bind path）；bind mount 请用 `OPENCLAW_EXTRA_MOUNTS`。

- 路径必须在 macOS/Windows 上与 Docker Desktop 共享。
- 如果您编辑 `OPENCLAW_EXTRA_MOUNTS`，请重新运行 `docker-setup.sh` 来重新生成
  额外的 compose 文件。
- `docker-compose.extra.yml` 是生成的。不要手动编辑它。

### 持久化整个容器主目录（可选）

如果您希望 `/home/node` 在容器重建后仍然保留，请通过 `OPENCLAW_HOME_VOLUME` 设置命名卷。
这会创建一个 Docker 卷并将其挂载到 `/home/node`，同时保留标准的 config/workspace 绑定挂载。
这里请使用命名卷（而非绑定路径）；对于绑定挂载，请使用 `OPENCLAW_EXTRA_MOUNTS`。

为了加速重建，请按依赖缓存层来组织 Dockerfile，避免在锁文件不变时
重复运行 `pnpm install`：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

如果你需要镜像内的系统包（如构建工具或媒体库），在运行 `docker-setup.sh` 前设置
`OPENCLAW_DOCKER_APT_PACKAGES`。它会在镜像构建时安装这些包，即便容器删除也会保留。

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

如果希望 `/home/node` 在容器重建后仍保持，设置 `OPENCLAW_HOME_VOLUME`
创建一个命名卷并挂载到 `/home/node`，同时仍保留标准的 config/workspace 绑定。
这里请用**命名卷**（而非 bind path）；bind mount 请用 `OPENCLAW_EXTRA_MOUNTS`。

- 如果您更改 `OPENCLAW_HOME_VOLUME`，请重新运行 `docker-setup.sh` 来重新生成
  额外的 compose 文件。
- 该变量接受空格分隔的 apt 包名列表。

### 安装额外的 apt 包（可选）

如果您需要镜像内的系统包（例如，构建工具或媒体
库），请在运行 `docker-setup.sh` 前设置 `OPENCLAW_DOCKER_APT_PACKAGES`。
这会在镜像构建期间安装这些包，因此即使容器被删除，它们也会保留。

为了加速重建，请按依赖缓存层来组织 Dockerfile，避免在锁文件不变时
重复运行 `pnpm install`：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

如果希望 `/home/node` 在容器重建后仍保持，设置 `OPENCLAW_HOME_VOLUME`
创建一个命名卷并挂载到 `/home/node`，同时仍保留标准的 config/workspace 绑定。
这里请用**命名卷**（而非 bind path）；bind mount 请用 `OPENCLAW_EXTRA_MOUNTS`。

- 这接受空格分隔的 apt 包名列表。
- 如果您更改 `OPENCLAW_DOCKER_APT_PACKAGES`，请重新运行 `docker-setup.sh` 来重新构建
  镜像。

### 高级用户 / 功能齐全的容器（可选启用）

Discord（bot token）：

- 运行时不安装系统包
- 默认不安装 Homebrew
- 不捆绑 Chromium/Playwright 浏览器

如果您想要一个功能更齐全的容器，可以使用这些可选的控制选项：

1. **持久化 `/home/node`**，以便浏览器下载和工具缓存得以保留：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

- Gateway 绑定在容器场景默认是 `lan`。

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"
./docker-setup.sh
```

- Gateway 容器是会话的唯一事实来源（`~/.openclaw/agents/<agentId>/sessions/`）。

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

如果您需要 Playwright 安装系统依赖，请使用 `OPENCLAW_DOCKER_APT_PACKAGES` 重新构建镜像，
而不是在运行时使用 `--with-deps`。

4. **持久化 Playwright 浏览器下载**：

- 在 `docker-compose.yml` 中
  设置 `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright`。
- 确保 `/home/node` 通过 `OPENCLAW_HOME_VOLUME` 持久化，或
  通过 `OPENCLAW_EXTRA_MOUNTS` 挂载 `/home/node/.cache/ms-playwright`。

### 权限 + EACCES

镜像以 `node`（uid 1000）身份运行。如果您在 `/home/node/.openclaw` 上看到权限错误，
请确保您的宿主机绑定挂载的所有者为 uid 1000。

示例（Linux 宿主机）：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果您选择为了方便而以 root 身份运行，则意味着您接受安全权衡。

### 更快的重建（推荐）

为了加快重建速度，请按依赖顺序排列您的 Dockerfile 以便缓存层。
这样可以避免重新运行 `pnpm install`，除非锁文件发生变化：

```dockerfile
FROM node:22-bookworm

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

### 渠道设置（可选）

使用 CLI 容器配置渠道，然后根据需要重启 gateway。

如果你使用多 agent 路由，每个 agent 可以覆盖 sandbox 与工具设置：
`agents.list[].sandbox` 和 `agents.list[].tools`（以及 `agents.list[].tools.sandbox.tools`）。
这样可以在同一 gateway 内混合不同访问级别：

```bash
docker compose run --rm openclaw-cli channels login
```

Telegram（bot token）：

```bash
docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"
```

Discord（bot token）：

```bash
docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
```

文档：[WhatsApp](/zh/channels/whatsapp), [Telegram](/zh/channels/telegram), [Discord](/zh/channels/discord)

### OpenAI Codex OAuth（无头 Docker）

如果您在向导中选择 OpenAI Codex OAuth，它会打开浏览器 URL 并尝试
在 `http://127.0.0.1:1455/auth/callback` 上捕获回调。在 Docker 或
无头设置中，该回调可能会显示浏览器错误。复制您跳转到的完整重定向
URL 并将其粘贴回向导以完成身份验证。

### 健康检查

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### E2E 冒烟测试（Docker）

```bash
scripts/e2e/onboard-docker.sh
```

### QR 导入冒烟测试（Docker）

```bash
pnpm test:docker:qr
```

### 说明

- 网络：默认 `none`（需要外联时显式开启）
- 默认允许：`exec`, `process`, `read`, `write`, `edit`, `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- 默认拒绝：`browser`, `canvas`, `nodes`, `cron`, `discord`, `gateway`

### 启用 sandboxing

如果你计划在 `setupCommand` 中安装包，请注意：

### 它的作用

当启用 `agents.defaults.sandbox` 时，**非主会话**在 Docker 容器内运行工具。
Gateway 保留在您的宿主机上，但工具执行是隔离的：

- `user` 需要是 root 才能 `apt-get`（省略 `user` 或设为 `user: "0:0"`）。
  当 `setupCommand`（或 docker 配置）变更时，OpenClaw 会自动重建容器，
  除非该容器**刚刚被使用**（约 5 分钟内）。热容器会记录警告，并给出
  精确的 `openclaw sandbox recreate ...` 命令。
- 作用域：`"session"` 用于每个会话的隔离
- 每个作用域的 workspace 文件夹挂载到 `/workspace`
- 可选的 agent workspace 访问（`agents.defaults.sandbox.workspaceAccess`）
- 允许/拒绝工具策略（拒绝优先）
- 入站媒体被复制到活动的 sandbox workspace（`media/inbound/*`），以便工具可以读取它（使用 `workspaceAccess: "rw"` 时，这会落在 agent workspace 中）

如果你需要带常用构建工具（Node、Go、Rust 等）的 sandbox 镜像，构建 common 镜像：

### 每个代理的 sandbox 配置文件（多代理）

如果您使用多代理路由，每个代理可以覆盖 sandbox + 工具设置：
`agents.list[].sandbox` 和 `agents.list[].tools`（加上 `agents.list[].tools.sandbox.tools`）。这允许您在一个
gateway 中运行混合访问级别：

- 完全访问（个人代理）
- 只读工具 + 只读 workspace（家庭/工作代理）
- 无文件系统/Shell 工具（公共代理）

有关示例、优先级和故障排查，请参阅 [Multi-Agent Sandbox & Tools](/zh/multi-agent-sandbox-tools)。

### 默认行为

- 不需要完整桌面环境（GNOME）；Xvfb 提供显示。
- 每个代理一个容器
- Agent workspace 访问：`workspaceAccess: "none"`（默认）使用 `~/.openclaw/sandboxes`
  - `"ro"` 将 sandbox workspace 保持在 `/workspace` 并以只读方式在 `/agent` 挂载 agent workspace（禁用 `write`/`edit`/`apply_patch`）
  - `"rw"` 以读写方式在 `/workspace` 挂载 agent workspace
- 自动清理：空闲 > 24小时 或 年龄 > 7天
- sandbox browser 控制 URL（用于 `browser` 工具）
- noVNC URL（如启用且 headless=false）
- 默认拒绝：`browser`, `canvas`, `nodes`, `cron`, `discord`, `gateway`

### 自定义 sandbox 镜像

构建自定义镜像并在配置中引用：

- 默认 `docker.network` 是 `"none"`（无出口）。
- `deny` 优先于 `allow`。
- 若 `allow` 为空：除 deny 之外的所有工具可用。

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

强化控制选项位于 `agents.defaults.sandbox.docker` 下：
`network`, `user`, `pidsLimit`, `memory`, `memorySwap`, `cpus`, `ulimits`,
`seccompProfile`, `apparmorProfile`, `dns`, `extraHosts`。

多代理：通过 `agents.list[].sandbox.{docker,browser,prune}.*` 为每个代理覆盖 `agents.defaults.sandbox.{docker,browser,prune}.*`
（当 `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` 为 `"shared"` 时忽略）。

### 构建默认 sandbox 镜像

```bash
scripts/sandbox-setup.sh
```

这使用 `Dockerfile.sandbox` 构建 `openclaw-sandbox:bookworm-slim`。

### Sandbox 通用镜像（可选）

示例：

```bash
scripts/sandbox-common-setup.sh
```

这构建 `openclaw-sandbox-common:bookworm-slim`。要使用它：

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

要在 sandbox 中运行浏览器工具，请构建浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

这使用 `Dockerfile.sandbox-browser` 构建 `openclaw-sandbox-browser:bookworm-slim`。
容器运行启用 CDP 的 Chromium 和
可选的 noVNC 观察器（通过 Xvfb 进行有头操作）。

如果希望 `/home/node` 在容器重建后仍保持，设置 `OPENCLAW_HOME_VOLUME`
创建一个命名卷并挂载到 `/home/node`，同时仍保留标准的 config/workspace 绑定。
这里请用**命名卷**（而非 bind path）；bind mount 请用 `OPENCLAW_EXTRA_MOUNTS`。

- 在 sandbox 中允许 `browser` 会**破坏隔离**（browser 在宿主机上运行）。
- 仍然可以通过设置 `agents.defaults.sandbox.browser.headless=true` 来使用无头模式。
- 镜像缺失：用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) 构建，或设置 `agents.defaults.sandbox.docker.image`。

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

启用后，代理将收到：

- 一个 sandbox 浏览器控制 URL（用于 `browser` 工具）
- 一个 noVNC URL（如果启用且 headless=false）

请记住：如果您对工具使用允许列表，请添加 `browser`（并从拒绝列表中删除它），
否则该工具仍将被阻止。
清理规则（`agents.defaults.sandbox.prune`）也适用于浏览器容器。

### 自定义 sandbox 镜像

构建您自己的镜像并在配置中指向它：

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
- 如果 `allow` 为空：所有工具（除拒绝列表外）都可用。
- 如果 `allow` 非空：仅 `allow` 中的工具可用（减去拒绝列表）。

### 清理策略

两个控制选项：

- `prune.idleHours`：移除 X 小时内未使用的容器（0 = 禁用）
- `prune.maxAgeDays`：移除超过 X 天的容器（0 = 禁用）

为了加速重建，请按依赖缓存层来组织 Dockerfile，避免在锁文件不变时
重复运行 `pnpm install`：

- 保留活动会话但限制生命周期：
  `idleHours: 24`, `maxAgeDays: 7`
- 从不清理：
  `idleHours: 0`, `maxAgeDays: 0`

### 安全说明

- 硬性限制仅适用于**工具**（exec/read/write/edit/apply_patch）。
- 仅限宿主机的工具（如 browser/camera/canvas）默认被阻止。
- 在 sandbox 中允许 `browser` 会**破坏隔离**（browser 在宿主机上运行）。

## 故障排查

- 镜像缺失：使用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) 构建，或设置 `agents.defaults.sandbox.docker.image`。
- 容器未运行：它会按需为每个会话自动创建。
- Sandbox 中的权限错误：将 `docker.user` 设置为与您挂载的 workspace 所有权匹配的 UID:GID（或修改 workspace 文件夹的所有权）。
- 找不到自定义工具：OpenClaw 使用 `sh -lc`（登录 shell）运行命令，它会加载 `/etc/profile` 并可能重置 PATH。设置 `docker.env.PATH` 来前置您的自定义工具路径（例如，`/custom/bin:/usr/local/share/npm-global/bin`），或在 Dockerfile 中的 `/etc/profile.d/` 下添加脚本。
