---
title: "Docker"
summary: "可选的 Docker 化安装与 OpenClaw onboarding 流程"
read_when:
  - 你想用容器化 gateway 而非本地安装
  - 你在验证 Docker 流程
---

# Docker（可选）

Docker **可选**。只有在你想用容器化 gateway，或验证 Docker 流程时才需要。

## Docker 适合我吗？

- **是**：你想要一个隔离、可丢弃的 gateway 环境，或在没有本地安装的主机上运行 OpenClaw。
- **否**：你在自己的机器上只想要最快的开发循环。请用常规安装流程。
- **Sandboxing 说明**：agent sandboxing 也会用到 Docker，但**不要求** gateway 运行在 Docker 中。见 [Sandboxing](/zh/gateway/sandboxing)。

本指南涵盖：
- 容器化 Gateway（完整 OpenClaw in Docker）
- 按会话的 Agent Sandbox（宿主机 gateway + Docker 隔离工具）

Sandboxing 细节：[Sandboxing](/zh/gateway/sandboxing)

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

它会在宿主机写入 config/workspace：
- `~/.openclaw/`
- `~/.openclaw/workspace`

运行在 VPS？见 [Hetzner (Docker VPS)](/zh/platforms/hetzner)。

### 手动流程（compose）

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

### 额外挂载（可选）

如果你想把更多宿主机目录挂进容器，在运行 `docker-setup.sh` 前设置
`OPENCLAW_EXTRA_MOUNTS`。它接受逗号分隔的 Docker bind mount 列表，
并通过生成 `docker-compose.extra.yml` 应用于 `openclaw-gateway` 和 `openclaw-cli`。

示例：

```bash
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：
- 在 macOS/Windows 上必须先把这些路径共享给 Docker Desktop。
- 如果你修改了 `OPENCLAW_EXTRA_MOUNTS`，请重新运行 `docker-setup.sh` 以重新生成
  额外的 compose 文件。
- `docker-compose.extra.yml` 是自动生成的，不要手工编辑。

### 持久化整个容器 home（可选）

如果希望 `/home/node` 在容器重建后仍保持，设置 `OPENCLAW_HOME_VOLUME`
创建一个命名卷并挂载到 `/home/node`，同时仍保留标准的 config/workspace 绑定。
这里请用**命名卷**（而非 bind path）；bind mount 请用 `OPENCLAW_EXTRA_MOUNTS`。

示例：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

你可以与额外挂载组合：

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

注意：
- 若修改 `OPENCLAW_HOME_VOLUME`，请重新运行 `docker-setup.sh` 以重新生成
  额外的 compose 文件。
- 命名卷会一直保留，直到使用 `docker volume rm <name>` 删除。

### 安装额外 apt 包（可选）

如果你需要镜像内的系统包（如构建工具或媒体库），在运行 `docker-setup.sh` 前设置
`OPENCLAW_DOCKER_APT_PACKAGES`。它会在镜像构建时安装这些包，即便容器删除也会保留。

示例：

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

注意：
- 该变量接受空格分隔的 apt 包名列表。
- 若修改 `OPENCLAW_DOCKER_APT_PACKAGES`，请重新运行 `docker-setup.sh` 以重建镜像。

### 更快的重建（推荐）

为了加速重建，请按依赖缓存层来组织 Dockerfile，避免在锁文件不变时
重复运行 `pnpm install`：

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

### Channel setup（可选）

使用 CLI 容器配置各频道，然后按需重启 gateway。

WhatsApp（二维码）：
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

Docs: [WhatsApp](/zh/channels/whatsapp), [Telegram](/zh/channels/telegram), [Discord](/zh/channels/discord)

### Health check

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### E2E smoke test（Docker）

```bash
scripts/e2e/onboard-docker.sh
```

### QR 导入 smoke test（Docker）

```bash
pnpm test:docker:qr
```

### 备注

- Gateway 绑定在容器场景默认是 `lan`。
- Gateway 容器是会话的唯一事实来源（`~/.openclaw/agents/<agentId>/sessions/`）。

## Agent Sandbox（宿主机 gateway + Docker 工具）

深度说明：[Sandboxing](/zh/gateway/sandboxing)

### 作用

当启用 `agents.defaults.sandbox` 时，**非主会话**会在 Docker 容器内运行工具。
Gateway 仍在宿主机上，但工具执行被隔离：
- scope：默认是 `"agent"`（每个 agent 一个容器 + workspace）
- scope：`"session"` 为每会话隔离
- 每个 scope 的 workspace 挂载到 `/workspace`
- 可选的 agent workspace 访问（`agents.defaults.sandbox.workspaceAccess`）
- allow/deny 工具策略（deny 优先）
- 入站媒体会复制到活动 sandbox workspace（`media/inbound/*`），以便工具读取（`workspaceAccess: "rw"` 时会落到 agent workspace）

警告：`scope: "shared"` 会禁用跨会话隔离。所有会话共享一个容器与一个 workspace。

### 按 agent 的 sandbox 配置（多 agent）

如果你使用多 agent 路由，每个 agent 可以覆盖 sandbox 与工具设置：
`agents.list[].sandbox` 和 `agents.list[].tools`（以及 `agents.list[].tools.sandbox.tools`）。
这样可以在同一 gateway 内混合不同访问级别：
- 完全访问（个人 agent）
- 只读工具 + 只读 workspace（家庭/工作 agent）
- 无文件系统/ shell 工具（公开 agent）

示例、优先级与排障见 [Multi-Agent Sandbox & Tools](/zh/multi-agent-sandbox-tools)。

### 默认行为

- 镜像：`openclaw-sandbox:bookworm-slim`
- 每个 agent 一个容器
- Agent workspace 访问：`workspaceAccess: "none"`（默认）使用 `~/.openclaw/sandboxes`
  - `"ro"` 让 sandbox workspace 在 `/workspace`，并将 agent workspace 只读挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）
  - `"rw"` 将 agent workspace 读写挂载到 `/workspace`
- 自动清理：空闲 > 24h 或年龄 > 7d
- 网络：默认 `none`（需要外联时显式开启）
- 默认允许：`exec`, `process`, `read`, `write`, `edit`, `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- 默认拒绝：`browser`, `canvas`, `nodes`, `cron`, `discord`, `gateway`

### 启用 sandboxing

如果你计划在 `setupCommand` 中安装包，请注意：
- 默认 `docker.network` 为 `"none"`（无外联）。
- `readOnlyRoot: true` 会阻止安装包。
- `user` 需要是 root 才能 `apt-get`（省略 `user` 或设为 `user: "0:0"`）。
当 `setupCommand`（或 docker 配置）变更时，OpenClaw 会自动重建容器，
除非该容器**刚刚被使用**（约 5 分钟内）。热容器会记录警告，并给出
精确的 `openclaw sandbox recreate ...` 命令。

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
            nproc: 256
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"]
        },
        prune: {
          idleHours: 24, // 0 disables idle pruning
          maxAgeDays: 7  // 0 disables max-age pruning
        }
      }
    }
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"]
      }
    }
  }
}
```

加固参数在 `agents.defaults.sandbox.docker` 下：
`network`, `user`, `pidsLimit`, `memory`, `memorySwap`, `cpus`, `ulimits`,
`seccompProfile`, `apparmorProfile`, `dns`, `extraHosts`。

多 agent：可在 `agents.list[].sandbox.{docker,browser,prune}.*` 中按 agent 覆盖
`agents.defaults.sandbox.{docker,browser,prune}.*`
（当 `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` 为 `"shared"` 时忽略）。

### 构建默认 sandbox 镜像

```bash
scripts/sandbox-setup.sh
```

该脚本会使用 `Dockerfile.sandbox` 构建 `openclaw-sandbox:bookworm-slim`。

### Sandbox common 镜像（可选）

如果你需要带常用构建工具（Node、Go、Rust 等）的 sandbox 镜像，构建 common 镜像：

```bash
scripts/sandbox-common-setup.sh
```

会构建 `openclaw-sandbox-common:bookworm-slim`。使用方式：

```json5
{
  agents: { defaults: { sandbox: { docker: { image: "openclaw-sandbox-common:bookworm-slim" } } } }
}
```

### Sandbox browser 镜像

要在 sandbox 中运行 browser 工具，构建 browser 镜像：

```bash
scripts/sandbox-browser-setup.sh
```

这会使用 `Dockerfile.sandbox-browser` 构建 `openclaw-sandbox-browser:bookworm-slim`。
容器内运行启用 CDP 的 Chromium，并可选 noVNC 观察器（Xvfb 下的 headful）。

注意：
- Headful（Xvfb）比 headless 更不易被拦截。
- 可通过 `agents.defaults.sandbox.browser.headless=true` 使用 headless。
- 不需要完整桌面环境（GNOME）；Xvfb 提供显示。

配置：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true }
      }
    }
  }
}
```

自定义 browser 镜像：

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-openclaw-browser" } }
    }
  }
}
```

启用后，agent 会收到：
- sandbox browser 控制 URL（用于 `browser` 工具）
- noVNC URL（如启用且 headless=false）

记住：如果你使用工具 allowlist，需要把 `browser` 加入 allow，并从 deny 中移除，否则该工具仍被阻止。
Prune 规则（`agents.defaults.sandbox.prune`）也会应用到 browser 容器。

### 自定义 sandbox 镜像

构建自定义镜像并在配置中引用：

```bash
docker build -t my-openclaw-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-openclaw-sbx" } }
    }
  }
}
```

### 工具策略（allow/deny）

- `deny` 优先于 `allow`。
- 若 `allow` 为空：除 deny 之外的所有工具可用。
- 若 `allow` 非空：仅 allow 中的工具可用（再剔除 deny）。

### 清理策略

两项参数：
- `prune.idleHours`：移除 X 小时未使用的容器（0 = 禁用）
- `prune.maxAgeDays`：移除超过 X 天的容器（0 = 禁用）

示例：
- 保持活跃会话但限制生命周期：
  `idleHours: 24`, `maxAgeDays: 7`
- 永不清理：
  `idleHours: 0`, `maxAgeDays: 0`

### 安全说明

- 硬隔离只作用于**工具**（exec/read/write/edit/apply_patch）。
- browser/camera/canvas 等 host-only 工具默认被阻止。
- 在 sandbox 中允许 `browser` 会**破坏隔离**（browser 在宿主机上运行）。

## Troubleshooting

- 镜像缺失：用 [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) 构建，或设置 `agents.defaults.sandbox.docker.image`。
- 容器未运行：按需会在每个会话自动创建。
- sandbox 内权限错误：将 `docker.user` 设为与挂载 workspace 所有权匹配的 UID:GID
  （或对 workspace 文件夹执行 chown）。
- 自定义工具找不到：OpenClaw 通过 `sh -lc`（登录 shell）运行命令，会加载 `/etc/profile` 并可能重置 PATH。把 `docker.env.PATH` 设置为包含自定义工具路径（例如 `/custom/bin:/usr/local/share/npm-global/bin`），或在 Dockerfile 中添加脚本到 `/etc/profile.d/`。
