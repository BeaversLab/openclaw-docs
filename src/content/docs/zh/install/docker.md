---
summary: "可选的基于 Docker 的 OpenClaw 设置和新手引导"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

Docker 是**可选**的。仅当您想要容器化网关或验证 Docker 流程时才使用它。

## Docker 适合我吗？

- **适合**：您想要一个隔离的、用完即弃的网关环境，或者希望在无需本地安装的主机上运行 OpenClaw。
- **不适合**：您在您自己的机器上运行，只想要最快的开发循环。请改用常规安装流程。
- **沙箱注意事项**：当启用沙箱隔离时，默认的沙箱后端使用 Docker，但沙箱隔离默认是关闭的，并且**不**要求完整的网关在 Docker 中运行。也可以使用 SSH 和 OpenShell 沙箱后端。请参阅 [沙箱隔离](/zh/gateway/sandboxing)。

## 先决条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 至少 2 GB RAM 用于镜像构建（在 1 GB 主机上 `pnpm install` 可能会因 OOM 被终止，退出码 137）
- 足够的磁盘空间用于镜像和日志
- 如果在 VPS/公共主机上运行，请查阅
  [网络安全加固](/zh/gateway/security)，
  尤其是 Docker `DOCKER-USER` 防火墙策略。

## 容器化网关

<Steps>
  <Step title="构建镜像">
    在仓库根目录下，运行设置脚本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这会在本地构建网关镜像。要改为使用预构建的镜像：

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

    在设置期间，启动前的引导和配置写入直接通过
    `openclaw-gateway` 运行。`openclaw-cli` 用于在
    网关容器已存在后运行的命令。

  </Step>

  <Step title="打开控制 UI">
    在浏览器中打开 `http://127.0.0.1:18789/` 并将配置好的
    共享密钥粘贴到设置中。安装脚本默认会将令牌写入 `.env`；
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

    文档：[WhatsApp](/zh/channels/whatsapp)、[Telegram](/zh/channels/telegram)、[Discord](/zh/channels/discord)

  </Step>
</Steps>

### 手动流程

如果您希望自行运行每个步骤而不是使用安装脚本：

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>从仓库根目录运行 `docker compose`。如果您启用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，安装脚本会写入 `docker-compose.extra.yml`； 请将其包含在 `-f docker-compose.yml -f docker-compose.extra.yml` 中。</Note>

<Note>由于 `openclaw-cli` 共享 `openclaw-gateway` 的网络命名空间，因此它是一个 启动后工具。在 `docker compose up -d openclaw-gateway` 之前，请通过 `openclaw-gateway` 使用 `--no-deps --entrypoint node` 运行新手引导 和设置时的配置写入。</Note>

### 环境变量

安装脚本接受这些可选的环境变量：

| 变量                                       | 用途                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | 使用远程镜像而不是在本地构建                              |
| `OPENCLAW_DOCKER_APT_PACKAGES`             | 在构建期间安装额外的 apt 软件包（以空格分隔）             |
| `OPENCLAW_EXTENSIONS`                      | 在构建时预安装插件依赖项（以空格分隔的名称）              |
| `OPENCLAW_EXTRA_MOUNTS`                    | 额外的主机绑定挂载（以逗号分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`                     | 将 `/home/node` 持久化在命名的 Docker 卷中                |
| `OPENCLAW_SANDBOX`                         | 选择加入沙盒引导（`1`、`true`、`yes`、`on`）              |
| `OPENCLAW_DOCKER_SOCKET`                   | 覆盖 Docker 套接字路径                                    |
| `OPENCLAW_DISABLE_BONJOUR`                 | 禁用 Bonjour/mDNS 广播（对于 Docker 默认为 `1`）          |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | 禁用捆绑插件源绑定挂载覆盖                                |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | 用于 OpenTelemetry 导出的共享 OTLP/HTTP 收集器端点        |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | 用于链路、指标或日志的 Signal 特定 OTLP 端点              |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | OTLP 协议覆盖。目前仅支持 `http/protobuf`                 |
| `OTEL_SERVICE_NAME`                        | 用于 OpenTelemetry 资源的服务名称                         |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | 启用最新的实验性 GenAI 语义属性                           |
| `OPENCLAW_OTEL_PRELOADED`                  | 如果已预加载一个 OpenTelemetry SDK，则跳过启动第二个 SDK  |

维护人员可以通过将一个插件源目录挂载到其打包的源路径（例如
`OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`）上来测试捆绑插件源与打包镜像的对比。
该挂载的源目录将覆盖相同插件 ID 的匹配编译
`/app/dist/extensions/synology-chat` 捆绑包。

### 可观测性

OpenTelemetry 导出是从 Gateway(网关) 容器出站到您的 OTLP
收集器的。它不需要已发布的 Docker 端口。如果您在本地
构建镜像并希望镜像内包含捆绑的 OpenTelemetry 导出器，
请包括其运行时依赖项：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

官方 OpenClaw Docker 发布镜像包含捆绑的
`diagnostics-otel` 插件源。根据镜像和缓存状态，
Gateway(网关) 可能仍会在首次启用插件时暂存插件本地的 OpenTelemetry
运行时依赖项，因此请允许该首次启动访问包注册表，或在发布通道中预热镜像。
要启用导出，请在配置中允许并启用 `diagnostics-otel` 插件，然后设置
`diagnostics.otel.enabled=true` 或使用
[OpenTelemetry 导出](/zh/gateway/opentelemetry) 中的配置示例。
收集器身份验证标头是通过 `diagnostics.otel.headers` 配置的，而不是通过 Docker 环境变量。

Prometheus 指标使用已发布的 Gateway(网关) 端口。启用
`diagnostics-prometheus` 插件，然后抓取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

该路由受 Gateway(网关) 身份验证保护。请勿暴露单独的公共 `/metrics` 端口或未经验证的反向代理路径。请参阅 [Prometheus metrics](/zh/gateway/prometheus)。

### 健康检查

容器探查端点（无需身份验证）：

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

Docker 镜像包含一个内置的 `HEALTHCHECK`，用于 ping `/healthz`。如果检查持续失败，Docker 会将容器标记为 `unhealthy`，编排系统可以重启或替换它。

经过身份验证的深度健康快照：

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### 局域网 vs 回环

`scripts/docker/setup.sh` 默认为 `OPENCLAW_GATEWAY_BIND=lan`，因此主机对 `http://127.0.0.1:18789` 的访问配合 Docker 端口发布即可工作。

- `lan`（默认）：主机浏览器和主机 CLI 可以访问发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程可以直接访问网关。

<Note>在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），而不是像 `0.0.0.0` 或 `127.0.0.1` 这样的主机别名。</Note>

### 主机本地提供程序

当 OpenClaw 在 Docker 中运行时，容器内的 `127.0.0.1` 是容器本身，而不是您的主机。对于在主机上运行的 AI 提供程序，请使用 `host.docker.internal`：

| 提供程序  | 主机默认 URL             | Docker 设置 URL                     |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

捆绑的 Docker 设置使用这些主机 URL 作为 LM Studio 和 Ollama 新手引导的默认值，并且 `docker-compose.yml` 将 `host.docker.internal` 映射到 Linux Docker Engine 的 Docker 主机网关。Docker Desktop 已在 macOS 和 Windows 上提供了相同的主机名。

主机服务还必须监听一个可从 Docker 访问的地址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

如果您使用自己的 Compose 文件或 `docker run` 命令，请自行添加相同的主机映射，例如 `--add-host=host.docker.internal:host-gateway`。

### Bonjour / mDNS

Docker 桥接网络通常无法可靠地转发 Bonjour/mDNS 多播 (`224.0.0.251:5353`)。因此，随附的 Compose 设置默认使用 `OPENCLAW_DISABLE_BONJOUR=1`，这样当桥接丢弃多播流量时，Gateway 不会崩溃循环或重复重启广告。

对于 Docker 主机，请使用已发布的 Gateway URL、Tailscale 或广域 DNS-SD。仅在使用主机网络、macvlan 或已知 mDNS 多播有效的其他网络运行时，才设置 `OPENCLAW_DISABLE_BONJOUR=0`。

有关常见问题和故障排除，请参阅 [Bonjour discovery](/zh/gateway/bonjour)。

### 存储和持久性

Docker Compose 将 `OPENCLAW_CONFIG_DIR` 绑定挂载到 `/home/node/.openclaw`，并将 `OPENCLAW_WORKSPACE_DIR` 绑定挂载到 `/home/node/.openclaw/workspace`，因此这些路径在容器替换后仍然保留。

该挂载的配置目录是 OpenClaw 保存以下内容的位置：

- `openclaw.json` 用于行为配置
- `agents/<agentId>/agent/auth-profiles.json` 用于存储的提供商 OAuth/API 密钥身份验证
- `.env` 用于支持环境变量的运行时机密，例如 `OPENCLAW_GATEWAY_TOKEN`

有关 VM 部署的完整持久性详细信息，请参阅 [Docker VM Runtime - What persists where](/zh/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：** 关注 `media/`、会话 JSONL 文件、`cron/runs/*.jsonl` 以及 `/tmp/openclaw/` 下的滚动文件日志。

### Shell 辅助工具（可选）

为了更轻松地进行日常 Docker 管理，请安装 `ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您是从较旧的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路径安装的 ClawDock，请重新运行上面的安装命令，以便您的本地辅助文件跟踪新位置。

然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。运行 `clawdock-help` 查看所有命令。有关完整的辅助指南，请参阅 [ClawDock](/zh/install/clawdock)。

<AccordionGroup>
  <Accordion title="为 Docker 网关启用代理沙箱">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    自定义套接字路径（例如 rootless Docker）：

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    该脚本仅在沙箱先决条件通过后才会挂载 `docker.sock`。如果
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

<Accordion title="共享网络安全说明">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 命令可以通过 `127.0.0.1` 访问网关。请将其视为共享信任边界。Compose 配置会丢弃 `NET_RAW`/`NET_ADMIN` 并在 `openclaw-cli` 上 启用 `no-new-privileges`。</Accordion>

  <Accordion title="权限和 EACCES">
    镜像以 `node` (uid 1000) 身份运行。如果您在
    `/home/node/.openclaw` 上遇到权限错误，请确保您的主机绑定挂载归 uid 1000 所有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="更快的重新构建">
    排序您的 Dockerfile 以便缓存依赖层。这样可以避免重新运行
    `pnpm install`，除非 lockfile 发生变化：

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

  <Accordion title="Power-user 容器选项">
    默认镜像以安全为先，并以非 root `node` 身份运行。如需功能更全面的容器：

    1. **持久化 `/home/node`**：`export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **打包系统依赖项**：`export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **安装 Playwright 浏览器**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **持久化浏览器下载**：设置
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` 并使用
       `OPENCLAW_HOME_VOLUME` 或 `OPENCLAW_EXTRA_MOUNTS`。

  </Accordion>

<Accordion title="OpenAI Codex OAuth (无头 Docker)">如果您在向导中选择 OpenAI Codex OAuth，它将打开一个浏览器 URL。在 Docker 或无头设置中，复制您跳转到的完整重定向 URL 并将其 粘贴回向导以完成身份验证。</Accordion>

  <Accordion title="基础镜像元数据">
    主要的 Docker 运行时镜像使用 `node:24-bookworm-slim` 并发布 OCI
    基础镜像注解，包括 `org.opencontainers.image.base.name`、
    `org.opencontainers.image.source` 等。Node 基础摘要通过
    Dependabot Docker 基础镜像 PR 刷新；发布构建不运行
    发行版升级层。请参阅
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上运行？

请参阅 [Hetzner (Docker VPS)](/zh/install/hetzner) 和
[Docker VM Runtime](/zh/install/docker-vm-runtime) 了解共享 VM 部署步骤，
包括二进制打包、持久化和更新。

## Agent 沙箱

当使用 Docker 后端启用 `agents.defaults.sandbox` 时，网关
在隔离的 Docker 容器内运行 Agent 工具执行（Shell、文件读/写等），
而网关本身保持在主机上。这为不受信任或多租户 Agent 会话提供了
一道坚固的隔离墙，而无需将整个网关容器化。

沙箱范围可以是每个 Agent（默认）、每个会话或共享的。每个范围
都有自己的工作区，挂载于 `/workspace`。您还可以配置
允许/拒绝工具策略、网络隔离、资源限制和浏览器
容器。

有关完整配置、镜像、安全说明和多代理配置文件，请参阅：

- [沙箱隔离](/zh/gateway/sandboxing) -- 完整的沙箱参考
- [OpenShell](/zh/gateway/openshell) -- 沙箱容器的交互式 Shell 访问
- [多代理沙箱和工具](/zh/tools/multi-agent-sandbox-tools) -- 每个代理的覆盖设置

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

构建默认沙箱镜像：

```bash
scripts/sandbox-setup.sh
```

## 故障排除

<AccordionGroup>
  <Accordion title="镜像缺失或沙箱容器未启动">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    构建沙箱镜像，或将 `agents.defaults.sandbox.docker.image` 设置为您的自定义镜像。
    容器会根据每个会话按需自动创建。
  </Accordion>

<Accordion title="沙箱中的权限错误">将 `docker.user` 设置为与您挂载的工作区所有权相匹配的 UID:GID， 或使用 chown 修改工作区文件夹的所有权。</Accordion>

<Accordion title="沙箱中找不到自定义工具">OpenClaw 使用 `sh -lc` (login shell) 运行命令，这将加载 `/etc/profile` 并且可能会重置 PATH。设置 `docker.env.PATH` 来前置您的 自定义工具路径，或者在您的 Dockerfile 中的 `/etc/profile.d/` 下添加脚本。</Accordion>

<Accordion title="构建镜像期间 OOM-killed (退出代码 137)">虚拟机至少需要 2 GB RAM。使用更大的机器类型并重试。</Accordion>

  <Accordion title="控制 UI 中显示未授权或需要配对">
    获取一个新的仪表板链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详情：[仪表板](/zh/web/dashboard)、[设备](/zh/cli/devices)。

  </Accordion>

  <Accordion title="Gateway(网关) 目标显示 ws://172.x.x.x 或来自 Docker CLI 的配对错误">
    重置 Gateway(网关) 模式和绑定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## 相关内容

- [安装概览](/zh/install) — 所有安装方法
- [Podman](/zh/install/podman) — Podman 的 Docker 替代方案
- [ClawDock](/zh/install/clawdock) — Docker Compose 社区设置
- [Updating](/zh/install/updating) — 保持 OpenClaw 为最新
- [Configuration](/zh/gateway/configuration) — 安装后的网关配置
