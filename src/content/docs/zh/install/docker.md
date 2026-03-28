---
summary: "可选的基于 Docker 的 OpenClaw 设置和 OpenClaw"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

# Docker（可选）

Docker 是**可选的**。仅在您需要容器化网关或验证 Docker 流程时使用。

## Docker 适合我吗？

- **是**：您需要一个隔离的、可丢弃的网关环境，或者希望在未进行本地安装的主机上运行 OpenClaw。
- **否**：你在自己的机器上运行，并且只想要最快的开发循环。请改用常规安装流程。
- **沙箱注意事项**：代理沙箱隔离也使用 Docker，但**不**要求完整的网关在 Docker 中运行。请参阅 [沙箱隔离](/zh/gateway/sandboxing)。

## 先决条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 至少 2 GB RAM 用于镜像构建（在 1 GB 主机上 `pnpm install` 可能会因 OOM 被终止并退出代码 137）
- 足够的磁盘空间用于存储镜像和日志
- 如果在 VPS/公共主机上运行，请查看
  [Security hardening for network exposure](/zh/gateway/security)，
  特别是 Docker `DOCKER-USER` 防火墙策略。

## 容器化 Gateway(网关)

<Steps>
  <Step title="构建镜像">
    在仓库根目录下，运行设置脚本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这会在本地构建网关镜像。要改用预构建的镜像：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    预构建的镜像发布于
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常用标签：`main`、`latest`、`<version>`（例如 `2026.2.26`）。

  </Step>

  <Step title="完成新手引导">
    设置脚本会自动运行新手引导。它将：

    - 提示输入提供商 API 密钥
    - 生成网关令牌并将其写入 `.env`
    - 通过 Docker Compose 启动网关

    在设置期间，预启动的新手引导和配置写入直接通过
    `openclaw-gateway` 运行。`openclaw-cli` 用于在
    网关容器已存在后运行的命令。

  </Step>

  <Step title="打开控制界面">
    在浏览器中打开 `http://127.0.0.1:18789/` 并将令牌粘贴到
    设置中。

    再次需要该 URL？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="配置渠道（可选）">
    使用 CLI 容器添加消息渠道：

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    文档：[WhatsApp](/zh/channels/whatsapp)、[Telegram](/zh/channels/telegram)、[Discord](/zh/channels/discord)

  </Step>
</Steps>

### 手动流程

如果您希望自己运行每个步骤而不是使用设置脚本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.mode local
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.bind lan
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.controlUi.allowedOrigins \
  '["http://localhost:18789","http://127.0.0.1:18789"]' --strict-json
docker compose up -d openclaw-gateway
```

<Note>从仓库根目录运行 `docker compose`。如果您启用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，设置脚本会写入 `docker-compose.extra.yml`；请使用 `-f docker-compose.yml -f docker-compose.extra.yml` 包含它。</Note>

<Note>由于 `openclaw-cli` 共享 `openclaw-gateway` 的网络命名空间，因此它是一个启动后工具。 在 `docker compose up -d openclaw-gateway` 之前，请通过 `openclaw-gateway` 使用 `--no-deps --entrypoint node` 运行新手引导和设置时配置写入。</Note>

### 环境变量

设置脚本接受以下可选环境变量：

| 变量                           | 用途                                                      |
| ------------------------------ | --------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | 使用远程镜像而不是在本地构建                              |
| `OPENCLAW_DOCKER_APT_PACKAGES` | 在构建期间安装额外的 apt 软件包（以空格分隔）             |
| `OPENCLAW_EXTENSIONS`          | 在构建时预安装扩展依赖（以空格分隔的名称）                |
| `OPENCLAW_EXTRA_MOUNTS`        | 额外的主机绑定挂载（以逗号分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`         | 将 `/home/node` 持久化到命名的 Docker 卷中                |
| `OPENCLAW_SANDBOX`             | 选择加入沙盒引导（`1`、`true`、`yes`、`on`）              |
| `OPENCLAW_DOCKER_SOCKET`       | 覆盖 Docker 套接字路径                                    |

### 健康检查

容器探查端点（无需身份验证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 镜像包含一个内置的 `HEALTHCHECK`，用于 ping `/healthz`。
如果检查持续失败，Docker 会将容器标记为 `unhealthy`，
并且编排系统可以重启或替换它。

经过身份验证的深度健康快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 局域网 vs 回环

`scripts/docker/setup.sh` 默认为 `OPENCLAW_GATEWAY_BIND=lan`，因此主机对 `http://127.0.0.1:18789` 的访问
可以配合 Docker 端口发布正常工作。

- `lan`（默认）：主机浏览器和主机 CLI 可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程才能
  直接访问网关。

<Note>在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），而不要 使用像 `0.0.0.0` 或 `127.0.0.1` 这样的主机别名。</Note>

### 存储和持久化

Docker Compose 将 `OPENCLAW_CONFIG_DIR` 绑定挂载到 `/home/node/.openclaw`，并将
`OPENCLAW_WORKSPACE_DIR` 绑定挂载到 `/home/node/.openclaw/workspace`，因此这些路径
在容器更换后仍然保留。

有关 VM 部署的完整持久化详细信息，请参阅
[Docker VM Runtime - 什么持久化在哪里](/zh/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：** 请注意 `media/`、会话 JSONL 文件、`cron/runs/*.jsonl`
以及 `/tmp/openclaw/` 下的滚动文件日志。

### Shell 辅助脚本（可选）

为了更轻松地进行日常 Docker 管理，请安装 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。运行
`clawdock-help` 查看所有命令。
请参阅 [`ClawDock` Helper README](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md)。

<AccordionGroup>
  <Accordion title="为 Docker 网关启用代理沙箱">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自定义套接字路径（例如无根 Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    该脚本仅在沙箱先决条件通过后才挂载 `docker.sock`。如果
    沙箱设置无法完成，脚本会将 `agents.defaults.sandbox.mode`
    重置为 `off`。

  </Accordion>

  <Accordion title="自动化 / CI（非交互式）">
    使用 `-T` 禁用 Compose 伪 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="共享网络安全注意事项">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 命令可以通过 `127.0.0.1` 访问 网关。请将其视为共享信任边界。Compose 配置丢弃了 `NET_RAW`/`NET_ADMIN` 并在 `openclaw-cli` 上启用了 `no-new-privileges`。</Accordion>

  <Accordion title="权限和 EACCES">
    该镜像以 `node` (uid 1000) 身份运行。如果您在 `/home/node/.openclaw` 上遇到权限错误，
    请确保主机绑定挂载的所有者为 uid 1000：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="更快的重新构建">
    请对您的 Dockerfile 进行排序，以便缓存依赖层。这可以避免重新运行
    `pnpm install`，除非锁文件发生变化：

    ```dockerfile
    FROM node:24-bookworm
    RUN curl -fsSL https://bun.sh/install | bash
    ENV PATH="/root/.bun/bin:${PATH}"
    RUN corepack enable
    WORKDIR /app
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

  </Accordion>

  <Accordion title="高级用户容器选项">
    默认镜像以安全为先，并以非 root 用户 `node` 运行。如需功能更全面的容器：

    1. **持久化 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **预装系统依赖**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **安装 Playwright 浏览器**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **持久化浏览器下载**：设置
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 并使用
       `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。

  </Accordion>

<Accordion title="OpenAI Codex OAuth (无头 Docker)">如果您在向导中选择 OpenAI Codex OAuth，它将打开一个浏览器 URL。在 Docker 或无头 设置中，复制您跳转到的完整重定向 URL 并将其粘贴回向导以完成身份验证。</Accordion>

  <Accordion title="基础镜像元数据">
    主要的 Docker 镜像使用 `node:24-bookworm` 并发布 OCI 基础镜像
    注解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。请参阅
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上运行？

请参阅 [Hetzner (Docker VPS)](/zh/install/hetzner) 和
[Docker VM Runtime](/zh/install/docker-vm-runtime) 了解共享 VM 部署步骤，
包括二进制文件烘焙、持久化和更新。

## Agent 沙箱

启用 `agents.defaults.sandbox` 后，网关会在独立的 Docker 容器内运行 agent 工具执行
（shell、文件读/写等），而网关本身则保留在宿主机上。这为您提供了一道坚实的防火墙，用于隔离不受信任的
或多租户 agent 会话，而无需将整个网关容器化。

沙箱作用域可以是每个 agent（默认）、每个会话或共享的。每个作用域
都有自己的工作区，挂载于 `/workspace`。您还可以配置
允许/拒绝工具策略、网络隔离、资源限制和浏览器
容器。

有关完整的配置、镜像、安全说明和多 agent 配置文件，请参阅：

- [沙箱隔离](/zh/gateway/sandboxing) -- 完整的沙箱参考
- [OpenShell](/zh/gateway/openshell) -- 对沙箱容器的交互式 shell 访问
- [Multi-Agent 沙箱 and Tools](/zh/tools/multi-agent-sandbox-tools) -- 每个 agent 的覆盖设置

### 快速启用

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

构建默认的沙箱镜像：

```bash
scripts/sandbox-setup.sh
```

## 故障排除

<AccordionGroup>
  <Accordion title="镜像缺失或沙箱容器无法启动">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    构建沙箱镜像
    或将 `agents.defaults.sandbox.docker.image` 设置为您的自定义镜像。
    容器会根据需要按会话自动创建。
  </Accordion>

<Accordion title="沙箱中的权限错误">将 `docker.user` 设置为与您挂载的工作区所有权匹配的 UID:GID，或对 工作区文件夹执行 chown。</Accordion>

<Accordion title="沙盒中找不到自定义工具">OpenClaw 使用 `sh -lc`（登录 shell）运行命令，它会加载 `/etc/profile` 并可能会重置 PATH。设置 `docker.env.PATH` 以添加您的自定义工具路径，或者在 Dockerfile 中的 `/etc/profile.d/` 下添加一个脚本。</Accordion>

<Accordion title="镜像构建期间 OOM-killed（退出代码 137）">虚拟机至少需要 2 GB RAM。请使用更大的机器规格并重试。</Accordion>

  <Accordion title="控制 UI 中显示未授权或需要配对">
    获取一个新的仪表板链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详情：[仪表板](/zh/web/dashboard)，[设备](/zh/cli/devices)。

  </Accordion>

  <Accordion title="Gateway 目标显示 ws://172.x.x.x 或来自 Docker CLI 的配对错误">
    重置网关模式和绑定：

    ```bash
    docker compose run --rm openclaw-cli config set gateway.mode local
    docker compose run --rm openclaw-cli config set gateway.bind lan
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>
