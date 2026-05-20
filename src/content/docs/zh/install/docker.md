---
summary: "DockerOpenClaw可选的基于 Docker 的 OpenClaw 设置和新手引导"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "DockerDocker"
---

Docker 是**可选**的。仅当您想要容器化网关或验证 Docker 流程时才使用它。

## Docker 适合我吗？

- **适合**：您想要一个隔离的、用完即弃的网关环境，或者希望在无需本地安装的主机上运行 OpenClaw。
- **不适合**：您在您自己的机器上运行，只想要最快的开发循环。请改用常规安装流程。
- **沙箱注意事项**：启用沙箱隔离时，默认的沙箱后端使用 Docker，但沙箱隔离默认处于关闭状态，并且**不**要求整个网关在 Docker 中运行。SSH 和 OpenShell 沙箱后端也可用。请参阅 [沙箱隔离](/zh/gateway/sandboxing)。

## 先决条件

- Docker Desktop（或 Docker Engine）+ Docker Compose v2
- 镜像构建至少需要 2 GB RAM（在 1 GB 主机上，`pnpm install` 可能会因 OOM 被终止，退出码为 137）
- 足够的磁盘空间用于镜像和日志
- 如果在 VPS/公共主机上运行，请查看
  [网络暴露的安全加固](/zh/gateway/security)，
  特别是 Docker `DOCKER-USER` 防火墙策略。

## 容器化网关

<Steps>
  <Step title="构建镜像">
    从仓库根目录运行设置脚本：

    ```bash
    ./scripts/docker/setup.sh
    ```

    这将在本地构建网关镜像。要改用预构建的镜像：

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    预构建的镜像发布于
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)。
    常用标签：`main`、`latest`、`<version>`（例如 `2026.2.26`）。

  </Step>

  <Step title="Complete 新手引导">
    设置脚本会自动运行新手引导。它将：

    - 提示输入提供商 API 密钥
    - 生成网关令牌并将其写入 `.env`
    - 创建 auth-profile 密钥目录
    - 通过 Docker Compose 启动网关

    在设置期间，启动前的引导和配置写入直接通过
    `openclaw-gateway` 运行。`openclaw-cli` 用于在网关容器已存在后运行的命令。

  </Step>

  <Step title="打开控制界面">
    在浏览器中打开 `http://127.0.0.1:18789/` 并将配置的
    共享密钥粘贴到设置中。设置脚本默认会将令牌写入 `.env`；
    如果您将容器配置切换为密码身份验证，请改用该
    密码。

    需要再次获取 URL？

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="配置频道（可选）">
    使用 CLI 容器添加消息频道：

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

<Note>请从仓库根目录运行 `docker compose`。如果您启用了 `OPENCLAW_EXTRA_MOUNTS` 或 `OPENCLAW_HOME_VOLUME`，设置脚本会写入 `docker-compose.extra.yml`； 请将其包含在 `-f docker-compose.yml -f docker-compose.extra.yml` 中。</Note>

<Note>由于 `openclaw-cli` 共享 `openclaw-gateway` 的网络命名空间，因此它是一个 启动后工具。在 `docker compose up -d openclaw-gateway` 之前，请通过 `openclaw-gateway` 使用 `--no-deps --entrypoint node` 运行新手引导 和设置时的配置写入。</Note>

### 环境变量

安装脚本接受这些可选的环境变量：

| 变量                                       | 用途                                                      |
| ------------------------------------------ | --------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | 使用远程镜像而不是在本地构建                              |
| `OPENCLAW_IMAGE_APT_PACKAGES`              | 在构建期间安装额外的 apt 软件包（以空格分隔）             |
| `OPENCLAW_EXTENSIONS`                      | 在构建时预安装插件依赖（以空格分隔的名称）                |
| `OPENCLAW_EXTRA_MOUNTS`                    | 额外的主机绑定挂载（以逗号分隔的 `source:target[:opts]`） |
| `OPENCLAW_HOME_VOLUME`                     | 将 `/home/node` 持久化存储在命名的 Docker 卷中            |
| `OPENCLAW_SANDBOX`                         | 选择加入沙箱引导（`1`、`true`、`yes`、`on`）              |
| `OPENCLAW_SKIP_ONBOARDING`                 | 跳过交互式新手引导步骤（`1`、`true`、`yes`、`on`）        |
| `OPENCLAW_DOCKER_SOCKET`                   | 覆盖 Docker 套接字路径                                    |
| `OPENCLAW_DISABLE_BONJOUR`                 | 禁用 Bonjour/mDNS 广告（对于 Docker 默认为 `1`）          |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | 禁用捆绑的插件源绑定挂载覆盖                              |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | 用于 OpenTelemetry 导出的共享 OTLP/HTTP 收集器端点        |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | 用于跟踪、指标或日志的 Signal 特定 OTLP 端点              |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | OTLP 协议覆盖。目前仅支持 `http/protobuf`                 |
| `OTEL_SERVICE_NAME`                        | 用于 OpenTelemetry 资源的服务名称                         |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | 选择启用最新的实验性 GenAI 语义属性                       |
| `OPENCLAW_OTEL_PRELOADED`                  | 当预加载了一个 OpenTelemetry SDK 时，跳过启动第二个 SDK   |

官方 Docker 镜像不附带 Homebrew。在新手引导期间，如果 OpenClaw
在没有 `brew` 的 Linux 容器中运行，它将隐藏仅限 brew 的技能依赖安装程序；这些依赖必须由自定义镜像提供
或手动安装。对于可从 Debian 包获得的依赖，请在镜像构建期间使用
`OPENCLAW_IMAGE_APT_PACKAGES`。旧版
`OPENCLAW_DOCKER_APT_PACKAGES` 名称仍然被接受。

维护人员可以通过将一个插件源目录挂载到其打包源路径（例如
`OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`），来针对打包镜像测试捆绑的插件源。
该挂载的源目录将覆盖具有相同插件 ID 的匹配编译
`/app/dist/extensions/synology-chat` 包。

### Observability

OpenTelemetry 导出是从 Gateway(网关) 容器出站到您的 OTLP 收集器的。它不需要发布的 Docker 端口。如果您在本地构建镜像并希望在镜像内部使用捆绑的 OpenTelemetry 导出器，请包含其运行时依赖项：

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

在启用导出之前，请从 ClawHub 安装官方的 `@openclaw/diagnostics-otel` 插件，
用于打包的 Docker 安装。自定义源构建的镜像仍然可以
通过 `OPENCLAW_EXTENSIONS=diagnostics-otel` 包含本地插件源。要启用导出，请在配置中允许并启用
`diagnostics-otel` 插件，然后设置
`diagnostics.otel.enabled=true` 或使用 [OpenTelemetry
导出](/zh/gateway/opentelemetry) 中的配置示例。收集器身份验证标头通过
`diagnostics.otel.headers` 配置，而不是通过 Docker 环境变量。

Prometheus 指标使用已发布的 Gateway(网关) 端口。安装
`clawhub:@openclaw/diagnostics-prometheus`，启用
`diagnostics-prometheus` 插件，然后抓取：

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

该路由受 Gateway(网关) 身份验证保护。请勿暴露单独的
公共 `/metrics` 端口或未经身份验证的反向代理路径。请参阅
[Prometheus 指标](/zh/gateway/prometheus)。

### Health checks

容器探测端点（无需身份验证）：

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

### 局域网 vs 环回

`scripts/docker/setup.sh` 默认为 `OPENCLAW_GATEWAY_BIND=lan`，以便主机对
`http://127.0.0.1:18789` 的访问可以通过 Docker 端口发布正常工作。

- `lan`（默认）：主机浏览器和主机 CLI 可以访问已发布的网关端口。
- `loopback`：只有容器网络命名空间内的进程可以直接
  访问网关。

<Note>在 `gateway.bind` 中使用绑定模式值（`lan` / `loopback` / `custom` / `tailnet` / `auto`），而不是像 `0.0.0.0` 或 `127.0.0.1` 这样的主机别名。</Note>

### 主机本地提供商

当 OpenClaw 在 Docker 中运行时，容器内的 `127.0.0.1` 是容器
本身，而不是您的主机。对于在主机上运行的 AI 提供商，请使用 `host.docker.internal`：

| 提供商    | 主机默认 URL             | Docker 设置 URL                     |
| --------- | ------------------------ | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`  | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |

随附的 Docker 设置使用这些主机 URL 作为 LM Studio 和 Ollama
的新手引导默认值，并且 `docker-compose.yml` 将 `host.docker.internal` 映射到
Docker Linux 引擎的 Docker 主机网关。Docker Desktop 已在
macOS 和 Windows 上提供相同的主机名。

主机服务还必须监听 Docker 可访问的地址：

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

如果您使用自己的 Compose 文件或 `docker run` 命令，请自行添加相同的主机
映射，例如
`--add-host=host.docker.internal:host-gateway`。

### Bonjour / mDNS

Docker 网桥网络通常无法可靠地转发 Bonjour/mDNS 多播
（`224.0.0.251:5353`）。因此，随附的 Compose 设置默认
`OPENCLAW_DISABLE_BONJOUR=1`，以免当网桥丢弃多播流量时，Gateway(网关) 发生崩溃循环或重复
重启通告。

对于 Gateway(网关) 主机，请使用已发布的 Tailscale URL、Docker 或广域 DNS-SD。
仅当使用主机网络、macvlan
或已知 mDNS 多播可用的其他网络运行时，才设置 `OPENCLAW_DISABLE_BONJOUR=0`。

有关注意事项和故障排除，请参阅 [Bonjour 发现](/zh/gateway/bonjour)。

### 存储和持久化

Docker Compose 将 Docker`OPENCLAW_CONFIG_DIR` 绑定挂载到 `/home/node/.openclaw`，
将 `OPENCLAW_WORKSPACE_DIR` 绑定挂载到 `/home/node/.openclaw/workspace`，并将
`OPENCLAW_AUTH_PROFILE_SECRET_DIR` 绑定挂载到 `/home/node/.config/openclaw`，因此这些
路径在容器替换后仍然保留。当任何变量未设置时，捆绑的
`docker-compose.yml` 会回退到 `${HOME}` 之下，或者当 `HOME` 本身
也缺失时回退到 `/tmp`。这可以防止 `docker compose up` 在裸机环境中
发出空源卷规范。

该挂载的配置目录是 OpenClaw 存放以下内容的位置：

- `openclaw.json` 用于行为配置
- `agents/<agentId>/agent/auth-profiles.json`OAuthAPI 用于存储的提供商 OAuth/API 密钥身份验证
- `.env` 用于环境支持的运行时密钥，例如 `OPENCLAW_GATEWAY_TOKEN`

auth-profile 密钥目录存储用于 OAuth 支持的身份配置文件令牌材料的本地加密密钥。请将其与 Docker 主机状态保存在一起，
但需与 OAuthDocker`OPENCLAW_CONFIG_DIR` 分开。

已安装的可下载插件将其包状态存储在已挂载的
OpenClaw 主目录下，因此插件安装记录和包根目录在容器
替换后得以保留。Gateway(网关) 启动不会生成捆绑插件的依赖树。

有关 VM 部署的完整持久性详细信息，请参阅
[Docker VM Runtime - What persists where](Docker/en/install/docker-vm-runtime#what-persists-where)。

**磁盘增长热点：** 关注 `media/`、会话 JSONL 文件、
`cron/runs/*.jsonl`、已安装的插件包根目录以及 `/tmp/openclaw/` 下的滚动日志文件。

### Shell 辅助工具（可选）

为了更轻松地进行日常 Docker 管理，请安装 Docker`ClawDock`：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果您是从较旧的 `scripts/shell-helpers/clawdock-helpers.sh` 原始路径安装的 ClawDock，请重新运行上面的安装命令，以便您的本地帮助文件跟踪新位置。

然后使用 `clawdock-start`、`clawdock-stop`、`clawdock-dashboard` 等。运行
`clawdock-help` 查看所有命令。
有关完整的帮助指南，请参阅 [ClawDock](/zh/install/clawdock)。

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

    该脚本仅在沙盒先决条件通过后才会挂载 `docker.sock`。如果沙盒设置无法完成，脚本会将 `agents.defaults.sandbox.mode` 重置为 `off`。在 OpenClaw 沙盒处于活动状态时，Codex 代码模式轮次仍受限于 Codex `workspace-write`；切勿将主机 Docker 套接字挂载到代理沙盒容器中。

  </Accordion>

  <Accordion title="自动化 / CI（非交互式）">
    使用 `-T` 禁用 Compose 伪 TTY 分配：

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="共享网络安全说明">`openclaw-cli` 使用 `network_mode: "service:openclaw-gateway"`，以便 CLI 命令可以通过 `127.0.0.1` 访问网关。请将此视为共享信任边界。Compose 配置会丢弃 `NET_RAW`/`NET_ADMIN`，并在 `openclaw-gateway` 和 `openclaw-cli` 上启用 `no-new-privileges`。</Accordion>

  <Accordion title="Dockeropenclaw-cli 中的 Docker Desktop DNS 故障"Docker>
    某些 Docker Desktop 设置在 `NET_RAW` 被丢弃后，无法从共享网络
    `openclaw-cli` sidecar 执行 DNS 查找，这在 `openclaw plugins install` 等 npm 支持的命令期间表现为
    `EAI_AGAIN`。
    对于正常的网关操作，请保留默认的强化 compose 文件。下面
    的本地覆盖通过恢复 CLI 的默认功能降低了 Docker 容器的安全性姿态，因此仅将其用于需要访问软件包注册表的一次性 CLI
    命令，而不是作为您的默认 Compose
    调用方式：

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    如果您已经创建了长时间运行的 `openclaw-cli` 容器，请使用相同的覆盖重新创建它。
    `docker compose exec` 和 `docker exec` 无法
    在已创建的容器上更改 Linux 功能。

  </Accordion>

  <Accordion title="权限和 EACCES">
    该镜像以 `node` (uid 1000) 身份运行。如果您在
    `/home/node/.openclaw` 上看到权限错误，请确保您的主机绑定挂载由 uid 1000 拥有：

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    相同的不匹配可能显示为插件警告，例如
    `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
    随后是 `plugin present but blocked`。这意味着进程 uid 和
    挂载的插件目录所有者不一致。首选以默认 uid 1000 运行容器并修复绑定挂载所有权。仅当您有意长期以 root 身份运行
    OpenClaw 时，才将 `/path/to/openclaw-config/npm` chown 为 `root:root`。

  </Accordion>

  <Accordion title="更快的重建">
    排序您的 Dockerfile 以便缓存依赖层。除非锁定文件更改，否则这可以避免重新运行
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

  <Accordion title="Power-user container options">
    默认镜像是安全优先的，并且以非 root `node` 身份运行。对于一个功能更齐全的容器：

    1. **持久化 `/home/node`**: `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **预构建系统依赖**: `export OPENCLAW_IMAGE_APT_PACKAGES="git curl jq"`
    3. **预构建 Playwright Chromium**: `export OPENCLAW_INSTALL_BROWSER=1`
    4. **或者将 Playwright 浏览器安装到持久化卷中**：
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    5. **持久化浏览器下载**: 使用 `OPENCLAW_HOME_VOLUME` 或
       `OPENCLAW_EXTRA_MOUNTS`OpenClaw。OpenClaw 会自动检测 Docker 镜像在 Linux 上由 Playwright 管理的 Chromium。

  </Accordion>

<Accordion title="OpenAIOAuthDockerOpenAI Codex OAuth (无头 Docker)" OpenAIOAuthDocker>
  如果您在向导中选择 OpenAI Codex OAuth，它会打开一个浏览器 URL。在 Docker 或无头设置中，复制您跳转到的完整重定向 URL 并将其 粘贴回向导以完成身份验证。
</Accordion>

  <Accordion title="Base image metadata">
    主要的 Docker 运行时镜像使用 `node:24-bookworm-slim` 并包含 `tini` 作为入口点初始化进程 (PID 1)，以确保回收僵尸进程并在长时间运行的容器中正确处理信号。它发布 OCI 基础镜像注解，包括 `org.opencontainers.image.base.name`，
    `org.opencontainers.image.source` 等。Node 基础摘要通过 Dependabot Docker 基础镜像 PR 进行更新；发布构建不运行
    发行版升级层。请参阅
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md)。
  </Accordion>
</AccordionGroup>

### 在 VPS 上运行？

请参阅 [Hetzner (Docker VPS)](/zh/install/hetzner) 和
[Docker VM Runtime](/zh/install/docker-vm-runtime) 以获取共享 VM 部署步骤
包括二进制文件烘焙、持久化和更新。

## Agent 沙箱

当使用 Docker 后端启用 `agents.defaults.sandbox` 时，网关
在隔离的 Docker 容器内运行代理工具执行（shell、文件读/写等），
而网关本身保留在主机上。这为您提供了针对不受信任或多租户代理会话的坚固屏障，而无需将整个
网关容器化。

沙箱作用域可以是每个代理（默认）、每个会话或共享的。每个作用域
都会在 `/workspace` 挂载自己的工作区。您还可以配置
允许/拒绝工具策略、网络隔离、资源限制和浏览器
容器。

有关完整配置、镜像、安全说明和多 agent 配置文件，请参阅：

- [沙箱隔离](/zh/gateway/sandboxing) -- 完整的沙箱参考
- [OpenShell](/zh/gateway/openshell) -- 访问沙箱容器的交互式 Shell
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

构建默认沙箱镜像（从源代码检出）：

```bash
scripts/sandbox-setup.sh
```

对于没有源代码检出（source checkout）的 npm 安装，请参阅 [沙箱隔离 § 镜像和设置](/zh/gateway/sandboxing#images-and-setup) 中的内联 `docker build` 命令。

## 故障排除

<AccordionGroup>
  <Accordion title="镜像丢失或沙箱容器无法启动">
    使用
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    （源代码检出）或来自 [沙箱隔离 § 镜像和设置](/zh/gateway/sandboxing#images-and-setup) 的内联 `docker build` 命令（npm 安装）构建沙箱镜像，
    或者将 `agents.defaults.sandbox.docker.image` 设置为您的自定义镜像。
    容器将根据需求按会话自动创建。
  </Accordion>

<Accordion title="沙箱中的权限错误">将 `docker.user` 设置为与您挂载的工作区所有权匹配的 UID:GID， 或者修改工作区文件夹的所有者（chown）。</Accordion>

<Accordion title="在沙箱中找不到自定义工具">OpenClaw 使用 `sh -lc` （登录 shell）运行命令，这将导入 `/etc/profile` 并可能重置 PATH。设置 `docker.env.PATH` 以添加您的 自定义工具路径，或者在 Dockerfile 中 `/etc/profile.d/` 下添加脚本。</Accordion>

<Accordion title="镜像构建期间 OOM-killed (退出码 137)">虚拟机至少需要 2 GB RAM。使用更大规格的机器类并重试。</Accordion>

  <Accordion title="控制 UI 中未授权或需要配对">
    获取新的仪表板链接并批准浏览器设备：

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    更多详情：[仪表板](/zh/web/dashboard)、[设备](/zh/cli/devices)。

  </Accordion>

  <Accordion title="Gateway(网关) 目标显示 ws://172.x.x.x 或来自 Docker CLI 的配对错误">
    重置网关模式和绑定：

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## 相关

- [安装概览](/zh/install) — 所有安装方法
- [Podman](/zh/install/podman) — Podman 替代 Docker 的方案
- [ClawDock](/zh/install/clawdock) — Docker Compose 社区版配置
- [更新](/zh/install/updating) — 保持 OpenClaw 最新
- [配置](/zh/gateway/configuration) — 安装后网关配置
