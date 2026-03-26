---
summary: "在无根 Podman 容器中运行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

在 **rootless** Podman 容器中运行 OpenClaw Gateway(网关)。使用与 Docker 相同的镜像（从代码库 [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) 构建）。

## 先决条件

- **Podman**（rootless 模式）
- **sudo** 权限用于一次性设置（创建专用用户和构建镜像）

## 快速开始

<Steps>
  <Step title="一次性设置">
    在代码库根目录下，运行设置脚本。它会创建一个专用的 `openclaw` 用户，构建容器镜像，并安装启动脚本：

    ```bash
    ./scripts/podman/setup.sh
    ```

    这还会在 `~openclaw/.openclaw/openclaw.json` 处创建一个最小配置（将 `gateway.mode` 设置为 `"local"`），以便 Gateway(网关) 无需运行向导即可启动。

    默认情况下，容器 **不会** 被安装为 systemd 服务 —— 您需要在下一步中手动启动它。对于具有自动启动和重启功能的生产环境设置，请改用 `--quadlet`：

    ```bash
    ./scripts/podman/setup.sh --quadlet
    ```

    （或者设置 `OPENCLAW_PODMAN_QUADLET=1`。使用 `--container` 仅安装容器和启动脚本。）

    **可选的构建时环境变量**（在运行 `scripts/podman/setup.sh` 之前设置）：

    - `OPENCLAW_DOCKER_APT_PACKAGES` -- 在镜像构建期间安装额外的 apt 软件包。
    - `OPENCLAW_EXTENSIONS` -- 预安装扩展依赖项（以空格分隔的名称，例如 `diagnostics-otel matrix`）。

  </Step>

  <Step title="启动 Gateway(网关)">
    为了快速手动启动：

    ```bash
    ./scripts/run-openclaw-podman.sh launch
    ```

  </Step>

  <Step title="运行新手引导向导">
    若要以交互方式添加频道或提供商：

    ```bash
    ./scripts/run-openclaw-podman.sh launch setup
    ```

    然后打开 `http://127.0.0.1:18789/` 并使用 `~openclaw/.openclaw/.env` 中的令牌（或设置打印的值）。

  </Step>
</Steps>

## Systemd (Quadlet, 可选)

如果您运行了 `./scripts/podman/setup.sh --quadlet`（或 `OPENCLAW_PODMAN_QUADLET=1`），则会安装一个 [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) 单元，以便网关作为 openclaw 用户的 systemd 用户服务运行。该服务在设置结束时被启用并启动。

- **启动：** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **停止：** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **状态：** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **日志：** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

quadlet 文件位于 `~openclaw/.config/containers/systemd/openclaw.container`。要更改端口或环境变量，请编辑该文件（或它引用的 `.env`），然后 `sudo systemctl --machine openclaw@ --user daemon-reload` 并重启服务。在启动时，如果为 openclaw 启用了 linger，服务将自动启动（如果 loginctl 可用，安装脚本会执行此操作）。

要在最初未使用 quadlet 的安装**之后**添加它，请重新运行：`./scripts/podman/setup.sh --quadlet`。

## The openclaw 用户（无登录）

`scripts/podman/setup.sh` 会创建一个专用的系统用户 `openclaw`：

- **Shell：** `nologin` — 无交互式登录；减少攻击面。
- **Home：** 例如 `/home/openclaw` — 保存 `~/.openclaw`（配置、工作区）和启动脚本 `run-openclaw-podman.sh`。
- **Rootless Podman：** 该用户必须拥有 **subuid** 和 **subgid** 范围。许多发行版在创建用户时会自动分配这些。如果安装程序打印警告，请将行添加到 `/etc/subuid` 和 `/etc/subgid`：

  ```text
  openclaw:100000:65536
  ```

  然后以该用户身份启动网关（例如从 cron 或 systemd）：

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **配置：** 只有 `openclaw` 和 root 可以访问 `/home/openclaw/.openclaw`。要编辑配置：在网关运行后使用控制 UI，或 `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`。

## 环境和配置

- **Token：** 作为 `OPENCLAW_GATEWAY_TOKEN` 存储在 `~openclaw/.openclaw/.env` 中。如果丢失，`scripts/podman/setup.sh` 和 `run-openclaw-podman.sh` 会生成它（使用 `openssl`、`python3` 或 `od`）。
- **可选：** 在该 `.env` 中，您可以设置提供商密钥（例如 `GROQ_API_KEY`、`OLLAMA_API_KEY`）和其他 OpenClaw 环境变量。
- **主机端口：** 默认情况下，脚本映射 `18789`（网关）和 `18790`（桥接）。启动时，使用 `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` 和 `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` 覆盖 **主机** 端口映射。
- **Gateway 绑定：** 默认情况下，`run-openclaw-podman.sh` 启动 gateway 时使用 `--bind loopback` 以实现安全的本地访问。要在局域网暴露，请在 `openclaw.json` 中设置 `OPENCLAW_GATEWAY_BIND=lan` 并配置 `gateway.controlUi.allowedOrigins`（或显式启用 host-header 回退）。
- **路径：** 主机配置和工作区默认为 `~openclaw/.openclaw` 和 `~openclaw/.openclaw/workspace`。使用 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 覆盖启动脚本使用的主机路径。

## 存储模型

- **持久化主机数据：** `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 被绑定挂载到容器中，并在主机上保留状态。
- **临时沙盒 tmpfs：** 如果启用 `agents.defaults.sandbox`，工具沙盒容器会将 `tmpfs` 挂载到 `/tmp`、`/var/tmp` 和 `/run`。这些路径由内存支持，并随沙盒容器一起消失；顶层的 Podman 容器设置不会添加自己的 tmpfs 挂载。
- **磁盘增长热点：** 需要观察的主要路径是 `media/`、`agents/<agentId>/sessions/sessions.json`、转录 JSONL 文件、`cron/runs/*.jsonl` 以及 `/tmp/openclaw/` 下的滚动文件日志（或您配置的 `logging.file`）。

`scripts/podman/setup.sh` 现在将镜像 tar 文件暂存到私有临时目录中，并在设置期间打印所选的基本目录。对于非 root 运行，仅当该基础目录安全可用时才接受 `TMPDIR`；否则它会回退到 `/var/tmp`，然后是 `/tmp`。保存的 tar 文件保持仅所有者可访问，并被流式传输到目标用户的 `podman load` 中，因此私有调用方临时目录不会阻止设置。

## 有用命令

- **日志：** 使用 quadlet：`sudo journalctl --machine openclaw@ --user -u openclaw.service -f`。使用脚本：`sudo -u openclaw podman logs -f openclaw`
- **停止：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user stop openclaw.service`。使用脚本：`sudo -u openclaw podman stop openclaw`
- **重新开始：** 使用 quadlet：`sudo systemctl --machine openclaw@ --user start openclaw.service`。使用脚本：重新运行启动脚本或 `podman start openclaw`
- **移除容器：** `sudo -u openclaw podman rm -f openclaw` — 主机上的配置和工作空间将被保留

## 故障排除

- **配置或 auth-profiles 权限被拒绝 (EACCES)：** 容器默认为 `--userns=keep-id`，并以与运行脚本的主机用户相同的 uid/gid 运行。请确保您的主机 `OPENCLAW_CONFIG_DIR` 和 `OPENCLAW_WORKSPACE_DIR` 归该用户所有。
- **Gateway(网关) 启动被阻止 (缺少 `gateway.mode=local`)：** 确保 `~openclaw/.openclaw/openclaw.json` 存在并设置了 `gateway.mode="local"`。如果缺少该文件，`scripts/podman/setup.sh` 会创建它。
- **Rootless Podman 对用户 openclaw 失败：** 检查 `/etc/subuid` 和 `/etc/subgid` 是否包含 `openclaw` 的行 (例如 `openclaw:100000:65536`)。如果缺少则添加它并重启。
- **容器名称已被占用：** 启动脚本使用 `podman run --replace`，因此当您重新启动时，现有容器将被替换。要手动清理：`podman rm -f openclaw`。
- **以 openclaw 身份运行时找不到脚本：** 确保已运行 `scripts/podman/setup.sh`，以便将 `run-openclaw-podman.sh` 复制到 openclaw 的主目录 (例如 `/home/openclaw/run-openclaw-podman.sh`)。
- **找不到 Quadlet 服务或启动失败：** 编辑 `.container` 文件后，运行 `sudo systemctl --machine openclaw@ --user daemon-reload`。Quadlet 需要 cgroups v2：`podman info --format '{{.Host.CgroupsVersion}}'` 应该显示 `2`。

## 可选：以您自己的用户身份运行

要以您的普通用户身份运行网关（无专用 openclaw 用户）：构建镜像，使用 `OPENCLAW_GATEWAY_TOKEN` 创建 `~/.openclaw/.env`，并使用 `--userns=keep-id` 和挂载到您的 `~/.openclaw` 的挂载项运行容器。启动脚本是为 openclaw 用户流程设计的；对于单用户设置，您可以改为手动运行脚本中的 `podman run` 命令，将配置和工作区指向您的主目录。推荐大多数用户使用：使用 `scripts/podman/setup.sh` 并作为 openclaw 用户运行，以便隔离配置和进程。

import zh from "/components/footer/zh.mdx";

<zh />
