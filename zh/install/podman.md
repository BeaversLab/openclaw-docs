---
summary: "在 rootless Podman 容器中运行 OpenClaw"
read_when:
  - "You want a containerized gateway with Podman instead of Docker"
title: "Podman"
---

# Podman

在 **rootless** Podman 容器中运行 OpenClaw Gateway。使用与 Docker 相同的镜像（从仓库 [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) 构建）。

## 要求

- Podman (rootless)
- Sudo 用于一次性设置（创建用户、构建镜像）

## 快速开始

**1. 一次性设置**（从仓库根目录；创建用户、构建镜像、安装启动脚本）：

```bash
./setup-podman.sh
```

这还会创建一个最小的 `~openclaw/.openclaw/openclaw.json`（设置 `gateway.mode="local"`），以便 Gateway 可以在不运行向导的情况下启动。

默认情况下，容器**不**作为 systemd 服务安装，您手动启动它（见下文）。对于具有自动启动和重启的生产风格设置，应将其安装为 systemd Quadlet 用户服务：

```bash
./setup-podman.sh --quadlet
```

（或设置 `OPENCLAW_PODMAN_QUADLET=1`；使用 `--container` 仅安装容器和启动脚本。）

可选的构建时环境变量（在运行 `setup-podman.sh` 之前设置）：

- `OPENCLAW_DOCKER_APT_PACKAGES` — 在镜像构建期间安装额外的 apt 包
- `OPENCLAW_EXTENSIONS` — 预安装扩展依赖项（以空格分隔的扩展名称，例如 `diagnostics-otel matrix`）

**2. 启动 Gateway**（手动，用于快速冒烟测试）：

```bash
./scripts/run-openclaw-podman.sh launch
```

**3. 入门向导**（例如添加通道或提供商）：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然后打开 `http://127.0.0.1:18789/` 并使用来自 `~openclaw/.openclaw/.env` 的令牌（或设置打印的值）。

## Systemd (Quadlet，可选)

如果您运行了 `./setup-podman.sh --quadlet`（或 `OPENCLAW_PODMAN_QUADLET=1`），则会安装 [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) 单元，以便 Gateway 作为 openclaw 用户的 systemd 用户服务运行。该服务在设置结束时被启用并启动。

- **启动：** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **停止：** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **状态：** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **日志：** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

quadlet 文件位于 `~openclaw/.config/containers/systemd/openclaw.container`。要更改端口或环境变量，请编辑该文件（或它获取的 `.env`），然后 `sudo systemctl --machine openclaw@ --user daemon-reload` 并重启服务。在启动时，如果为 openclaw 启用了 lingering，该服务将自动启动（当 loginctl 可用时，设置会执行此操作）。

要在未使用 quadlet 的初始设置**之后**添加 quadlet，请重新运行：`./setup-podman.sh --quadlet`。

## openclaw 用户（非登录）

`setup-podman.sh` 创建一个专用系统用户 `openclaw`：

- **Shell：** `nologin` — 无交互式登录；减少攻击面。
- **主目录：** 例如 `/home/openclaw` — 保存 `~/.openclaw`（配置、工作区）和启动脚本 `run-openclaw-podman.sh`。
- **Rootless Podman：** 用户必须具有 **subuid** 和 **subgid** 范围。许多发行版在创建用户时自动分配这些。如果设置打印警告，请向 `/etc/subuid` 和 `/etc/subgid` 添加行：

  ```text
  openclaw:100000:65536
  ```

  Then start the gateway as that user (e.g. from cron or systemd):

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **配置：** 只有 `openclaw` 和 root 可以访问 `/home/openclaw/.openclaw`。要编辑配置：在 Gateway 运行后使用控制 UI，或 `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`。

## 环境和配置

- **令牌：** 作为 `OPENCLAW_GATEWAY_TOKEN` 存储在 `~openclaw/.openclaw/.env` 中。如果缺失，`setup-podman.sh` 和 `run-openclaw-podman.sh` 会生成它（使用 `openssl`、`python3` 或 `od`）。
- **可选：** 在该 `.env` 中，您可以设置提供商密钥（例如 `GROQ_API_KEY`、`OLLAMA_API_KEY`）和其他 OpenClaw 环境变量。
- **主机端口：** 默认情况下，脚本映射 `18789`（Gateway）和 `18790`（桥接）。在启动时使用 `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` 和 `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` 覆盖 **主机** 端口映射。
- **Gateway 绑定：** 默认情况下，`run-openclaw-podman.sh` 使用 `--bind loopback` 启动 Gateway 以实现安全的本地访问。要在 LAN 上暴露，请设置 `OPENCLAW_GATEWAY_BIND=lan` 并在 `openclaw.json` 中配置 `gateway.controlUi.allowedOrigins`（或明确启用主机头回退）。
- **路径：** 主机配置和工作区默认为 `~openclaw/.openclaw` 和 `~openclaw/.openclaw/workspace`。使用 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 覆盖启动脚本使用的主机路径。

## 存储模型

- **持久主机数据：** `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 被绑定挂载到容器中，并在主机上保留状态。
- **临时沙箱 tmpfs：** 如果启用 `agents.defaults.sandbox`，工具沙箱容器将在 `/tmp`、`/var/tmp` 和 `/run` 处挂载 `tmpfs`。这些路径是内存支持的，并随沙箱容器消失；顶层 Podman 容器设置不会添加自己的 tmpfs 挂载。
- **磁盘增长热点：** 需要观察的主要路径是 `media/`、`agents/<agentId>/sessions/sessions.json`、转录 JSONL 文件、`cron/runs/*.jsonl` 和 `/tmp/openclaw/` 下的滚动文件日志（或您配置的 `logging.file`）。

`setup-podman.sh` 现在将镜像 tar 放在私有临时目录中，并在设置期间打印选择的基本目录。对于非 root 运行，仅当该基本目录安全使用时才接受 `TMPDIR`；否则它回退到 `/var/tmp`，然后 `/tmp`。保存的 tar 保持仅所有者访问，并被流式传输到目标用户的 `podman load`，因此私有调用者临时目录不会阻止设置。

## 有用的命令

- **日志：** 使用 quadlet：`sudo journalctl --machine openclaw@ --user -u openclaw.service -f`。使用脚本：`sudo -u openclaw podman logs -f openclaw`
- **停止：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user stop openclaw.service`。使用脚本：`sudo -u openclaw podman stop openclaw`
- **再次启动：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user start openclaw.service`。使用脚本：重新运行启动脚本或 `podman start openclaw`
- **删除容器：** `sudo -u openclaw podman rm -f openclaw` — 主机上的配置和工作区被保留

## 故障排除

- **配置或身份验证文件的权限被拒绝 (EACCES)：** 容器默认为 `--userns=keep-id`，并以运行脚本的主机用户的相同 uid/gid 运行。确保您的主机 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 由该用户拥有。
- **Gateway 启动被阻止（缺少 `gateway.mode=local`）：** 确保 `~openclaw/.openclaw/openclaw.json` 存在并设置 `gateway.mode="local"`。`setup-podman.sh` 如果缺失会创建此文件。
- **用户 openclaw 的 Rootless Podman 失败：** 检查 `/etc/subuid` 和 `/etc/subgid` 包含 `openclaw` 的行（例如 `openclaw:100000:65536`）。如果缺失则添加它并重启。
- **容器名称正在使用：** 启动脚本使用 `podman run --replace`，因此当您再次启动时，现有容器将被替换。要手动清理：`podman rm -f openclaw`。
- **作为 openclaw 运行时找不到脚本：** 确保 `setup-podman.sh` 已运行，以便 `run-openclaw-podman.sh` 被复制到 openclaw 的主目录（例如 `/home/openclaw/run-openclaw-podman.sh`）。
- **找不到 Quadlet 服务或无法启动：** 编辑 `.container` 文件后运行 `sudo systemctl --machine openclaw@ --user daemon-reload`。Quadlet 需要 cgroups v2：`podman info --format '{{.Host.CgroupsVersion}}'` 应显示 `2`。

## 可选：作为您自己的用户运行

要以您的普通用户身份运行 Gateway（无专用 openclaw 用户）：构建镜像，使用 `OPENCLAW_GATEWAY_TOKEN` 创建 `~/.openclaw/.env`，并使用 `--userns=keep-id` 运行容器并挂载到您的 `~/.openclaw`。启动脚本专为 openclaw 用户流程设计；对于单用户设置，您可以手动从脚本运行 `podman run` 命令，将配置和工作区指向您的主目录。推荐大多数用户：使用 `setup-podman.sh` 并作为 openclaw 用户运行，以便配置和进程被隔离。
