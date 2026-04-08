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
- **沙箱注意事项**：agent 沙箱隔离也使用 Docker，但它**不**要求完整的 gateway 在 Docker 中运行。请参阅 [沙箱隔离](/en/gateway/sandboxing)。

## 先决条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 至少 2 GB RAM 用于镜像构建（在 1 GB 主机上 `pnpm install` 可能会因 OOM 被终止并退出代码 137）
- 足够的磁盘空间用于存储镜像和日志
- 如果在 VPS/公共主机上运行，请查看
  [网络暴露的安全加固](/en/gateway/security)，
  尤其是 Docker `DOCKER-USER` 防火墙策略。

## 容器化 Gateway(网关)

<Steps>
  <Step title="构建镜像">
    在仓库根目录下，运行设置脚本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这会在本地构建 gateway 镜像。要使用预构建的镜像：

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

  <Step title="打开控制 UI">
    在浏览器中打开 `http://127.0.0.1:18789/` 并将配置的
    共享密钥粘贴到设置中。设置脚本默认将 token 写入 `.env`；
    如果你将容器配置切换为密码认证，请改用该密码。

    需要再次获取 URL？

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

    文档：[CLI](/en/channels/whatsapp)、[WhatsApp](/en/channels/telegram)、[Telegram](/en/channels/discord)

  </Step>
</Steps>

### 手动流程

如果您希望自己运行每个步骤而不是使用设置脚本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>从仓库根目录运行 `docker compose`。如果你启用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，设置脚本会写入 `docker-compose.extra.yml`； 请将其包含在 `-f docker-compose.yml -f docker-compose.extra.yml` 中。</Note>

<Note>由于 `openclaw-cli` 共享 `openclaw-gateway` 的网络命名空间，它是一个 启动后工具。在 `docker compose up -d openclaw-gateway` 之前，通过 `openclaw-gateway` 使用 `--no-deps --entrypoint node` 运行新手引导 和设置时的配置写入。</Note>

### 环境变量

设置脚本接受以下可选环境变量：

| 变量                           | 用途                                                    |
| ------------------------------ | ------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | 使用远程镜像而不是在本地构建                            |
| `OPENCLAW_DOCKER_APT_PACKAGES` | 在构建期间安装额外的 apt 软件包（以空格分隔）           |
| `OPENCLAW_EXTENSIONS`          | 在构建时预安装扩展依赖（以空格分隔的名称）              |
| `OPENCLAW_EXTRA_MOUNTS`        | 额外的主机绑定挂载（逗号分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`         | 将 `/home/node` 持久化到命名 Docker 卷中                |
| `OPENCLAW_SANDBOX`             | 选择加入沙箱引导（`1`，`true`，`yes`，`on`）            |
| `OPENCLAW_DOCKER_SOCKET`       | 覆盖 Docker 套接字路径                                  |

### 健康检查

容器探查端点（无需身份验证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 镜像包含一个内置的 `HEALTHCHECK`，用于 ping `/healthz`。
如果检查持续失败，Docker 会将容器标记为 `unhealthy`，
编排系统可以重新启动或替换它。

经过身份验证的深度健康快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 局域网 vs 回环

`scripts/docker/setup.sh` 默认为 `OPENCLAW_GATEWAY_BIND=lan`，以便主机对
`http://127.0.0.1:18789` 的访问配合 Docker 端口发布正常工作。

- `lan`（默认）：主机浏览器和主机 CLI 可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程可以直接访问
  网关。

<Note>请在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），而不要使用主机别名，如 `0.0.0.0` 或 `127.0.0.1`。</Note>

### 存储和持久化

Docker Compose 将 `OPENCLAW_CONFIG_DIR` 绑定挂载到 `/home/node/.openclaw`，并将
`OPENCLAW_WORKSPACE_DIR` 绑定挂载到 `/home/node/.openclaw/workspace`，因此这些路径
在容器替换后仍然存在。

该挂载的配置目录是 OpenClaw 存放以下内容的位置：

- `openclaw.json` 用于行为配置
- `agents/<agentId>/agent/auth-profiles.json` 用于存储的提供商 OAuth/API 密钥认证
- `.env` 用于支持环境变量的运行时密钥，例如 `OPENCLAW_GATEWAY_TOKEN`

有关 VM 部署的完整持久性详细信息，请参阅
[Docker VM Runtime - What persists where](/en/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：** 监控 `media/`、会话 JSONL 文件、`cron/runs/*.jsonl`
以及 `/tmp/openclaw/` 下的滚动日志文件。

### Shell 辅助工具（可选）

为了更轻松地进行日常 Docker 管理，请安装 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您是从较旧的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路径安装的 ClawDock，请重新运行上面的安装命令，以便您的本地辅助文件跟踪新位置。

然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。运行
`clawdock-help` 查看所有命令。
请参阅 [ClawDock](/en/install/clawdock) 了解完整的辅助指南。

<AccordionGroup>
  <Accordion title="为 Docker 网关启用代理沙盒">
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

    该脚本仅在沙盒先决条件通过后才挂载 `docker.sock`。如果
    沙盒设置无法完成，脚本会将 `agents.defaults.sandbox.mode`
    重置为 `off`。

  </Accordion>

  <Accordion title="自动化 / CI（非交互式）">
    使用 `-T` 禁用 Compose 伪 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="共享网络安全说明">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 命令可以通过 `127.0.0.1` 访问网关。请将此视为共享的 信任边界。Compose 配置丢弃了 `NET_RAW`/`NET_ADMIN` 并在 `openclaw-cli` 上 启用了 `no-new-privileges`。</Accordion>

  <Accordion title="权限和 EACCES">
    该镜像以 `node` (uid 1000) 身份运行。如果您在
    `/home/node/.openclaw` 上遇到权限错误，请确保您的主机绑定挂载归 uid 1000 所有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="更快的重新构建">
    排序你的 Dockerfile 以缓存依赖层。这样可以避免
    除非锁定文件更改否则重新运行
    `pnpm install`：

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
    默认镜像以安全为优先，并以非 root `node` 运行。如需
    功能更全的容器：

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

<Accordion title="OpenAI Codex OAuth（无头 Docker）">如果你在向导中选择 OpenAI Codex OAuth，它会打开一个浏览器 URL。在 Docker 或无头环境中，复制你访问到的完整重定向 URL 并 将其粘贴回向导以完成身份验证。</Accordion>

  <Accordion title="基础镜像元数据">
    主 Docker 镜像使用 `node:24-bookworm` 并发布 OCI 基础镜像
    注解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。请参阅
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上运行？

请参阅 [Hetzner (Docker VPS)](/en/install/hetzner) 和
[Docker VM Runtime](/en/install/docker-vm-runtime) 了解共享 VM 部署步骤，
包括二进制文件预装、持久化和更新。

## 代理沙箱

当启用 `agents.defaults.sandbox` 时，网关会在隔离的 Docker 容器内运行代理工具执行
（Shell、文件读/写等），而
网关本身仍保留在主机上。这为不受信任的或
多租户代理会话提供了一道坚实的防火墙，而无需容器化整个网关。

沙箱范围可以是每个代理（默认）、每个会话或共享的。每个范围
都有自己的工作区，挂载于 `/workspace`。您还可以配置
允许/拒绝工具策略、网络隔离、资源限制和浏览器
容器。

有关完整的配置、镜像、安全说明和多代理配置文件，请参阅：

- [沙箱隔离](/en/gateway/sandboxing) -- 完整的沙箱参考
- [OpenShell](/en/gateway/openshell) -- 对沙箱容器的交互式 Shell 访问
- [多代理沙箱和工具](/en/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖设置

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
  <Accordion title="镜像缺失或沙箱容器未启动">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    构建沙箱镜像，或将 `agents.defaults.sandbox.docker.image` 设置为您的自定义镜像。
    容器会根据需求按会话自动创建。
  </Accordion>

<Accordion title="沙箱中的权限错误">将 `docker.user` 设置为与您挂载的工作区所有权匹配的 UID:GID， 或更改工作区文件夹的所有者。</Accordion>

<Accordion title="沙箱中找不到自定义工具">OpenClaw 使用 `sh -lc` (login shell) 运行命令，该操作会调用 `/etc/profile` 并且可能会重置 PATH。设置 `docker.env.PATH` 以在前面添加您的 自定义工具路径，或者在您的 Dockerfile 中的 `/etc/profile.d/` 下添加脚本。</Accordion>

<Accordion title="镜像构建期间 OOM-killed（退出代码 137）">虚拟机至少需要 2 GB RAM。使用更大的机器类型并重试。</Accordion>

  <Accordion title="控制 UI 中未授权或需要配对">
    获取一个新的仪表板链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详细信息：[仪表板](/en/web/dashboard)、[设备](/en/cli/devices)。

  </Accordion>

  <Accordion title="Gateway(网关) 目标显示 ws://172.x.x.x 或来自 Docker CLI 的配对错误">
    重置网关模式并绑定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## 相关

- [安装概述](/en/install) — 所有安装方法
- [Podman](/en/install/podman) — Podman 作为 Docker 的替代方案
- [ClawDock](/en/install/clawdock) — Docker Compose 社区设置
- [更新](/en/install/updating) — 保持 OpenClaw 最新
- [配置](/en/gateway/configuration) — 安装后的网关配置
