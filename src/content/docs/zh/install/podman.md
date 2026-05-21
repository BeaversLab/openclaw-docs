---
summary: "在无根 Podman 容器中运行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

在无根 Podman 容器中运行 OpenClaw Gateway(网关)，由您当前的非 root 用户管理。

预期的模型是：

- Podman 运行网关容器。
- 您主机上的 `openclaw` CLI 是控制平面。
- 持久化状态默认位于主机上的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...` 而不是 `sudo -u openclaw`、`podman exec` 或单独的服务用户。

## 先决条件

- **Podman** 处于无根模式
- 主机上安装了 **OpenClaw CLI**
- **可选：** `systemd --user`，如果您想要由 Quadlet 管理的自动启动
- **可选：** `sudo`，仅当您想要 `loginctl enable-linger "$(whoami)"` 以在无头主机上实现启动持久化时

## 快速开始

<Steps>
  <Step title="一次性设置">
    从仓库根目录运行 `./scripts/podman/setup.sh`。
  </Step>

<Step title="启动 Gateway(网关) 容器">使用 `./scripts/run-openclaw-podman.sh launch` 启动容器。</Step>

<Step title="在容器内运行新手引导">运行 `./scripts/run-openclaw-podman.sh launch setup`，然后打开 `http://127.0.0.1:18789/`。</Step>

  <Step title="从主机 CLI 管理正在运行的容器">
    设置 `OPENCLAW_CONTAINER=openclaw`，然后从主机使用正常的 `openclaw` 命令。
  </Step>
</Steps>

设置详细信息：

- `./scripts/podman/setup.sh` 默认在您的无根 Podman 存储中构建 `openclaw:local`，或者如果您设置了一个，则使用 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE`。
- 如果缺失，它会使用 `gateway.mode: "local"` 创建 `~/.openclaw/openclaw.json`。
- 如果缺失，它会使用 `OPENCLAW_GATEWAY_TOKEN` 创建 `~/.openclaw/.env`。
- 对于手动启动，辅助程序仅从 `~/.openclaw/.env` 读取一小部分与 Podman 相关的键的白名单，并将显式的运行时环境变量传递给容器；它不会将整个环境文件交给 Podman。

Quadlet 管理的设置：

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet 是一个仅限 Linux 的选项，因为它依赖于 systemd 用户服务。

您也可以设置 `OPENCLAW_PODMAN_QUADLET=1`。

可选的构建/设置环境变量：

- `OPENCLAW_IMAGE` 或 `OPENCLAW_PODMAN_IMAGE` —— 使用现有的/已拉取的镜像，而不是构建 `openclaw:local`
- `OPENCLAW_IMAGE_APT_PACKAGES` -- 在镜像构建期间安装额外的 apt 软件包（也接受旧的 `OPENCLAW_DOCKER_APT_PACKAGES`）
- `OPENCLAW_IMAGE_PIP_PACKAGES` -- 在镜像构建期间安装额外的 Python 包；固定版本并仅使用您信任的包索引
- `OPENCLAW_EXTENSIONS` -- 在构建时预安装插件依赖项
- `OPENCLAW_INSTALL_BROWSER` -- 预安装 Chromium 和 Xvfb 用于浏览器自动化（设置为 `1` 以启用）

容器启动：

```bash
./scripts/run-openclaw-podman.sh launch
```

该脚本以您当前的 uid/gid 使用 `--userns=keep-id`OpenClaw 启动容器，并将您的 OpenClaw 状态绑定挂载到容器中。

新手引导：

```bash
./scripts/run-openclaw-podman.sh launch setup
```

然后打开 `http://127.0.0.1:18789/` 并使用来自 `~/.openclaw/.env` 的令牌。

主机 CLI 默认值：

```bash
export OPENCLAW_CONTAINER=openclaw
```

然后，此类命令将自动在该容器内运行：

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # includes extra service scan
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman 虚拟机可能会使浏览器对网关来说显示为非本地。
如果控制 UI 在启动后报告设备认证错误，请遵循
[Podman 和 Tailscale](macOSTailscaleTailscale#podman--tailscale) 中的 Tailscale 指南。

<a id="podman--tailscale"></a>

## Podman 和 Tailscale

对于 HTTPS 或远程浏览器访问，请遵循主要的 Tailscale 文档。

Podman 特定说明：

- 将 Podman 发布主机保持在 `127.0.0.1`。
- 优先使用主机管理的 `tailscale serve` 而不是 `openclaw gateway --tailscale serve`。
- 在 macOS 上，如果本地浏览器设备认证上下文不可靠，请使用 Tailscale 访问代替临时的本地隧道变通方法。

参见：

- [Tailscale](Tailscale/en/gateway/tailscale)
- [控制 UI](/zh/web/control-ui)

## Systemd (Quadlet，可选)

如果您运行了 `./scripts/podman/setup.sh --quadlet`，设置会将 Quadlet 文件安装在：

```bash
~/.config/containers/systemd/openclaw.container
```

有用的命令：

- **启动：** `systemctl --user start openclaw.service`
- **停止：** `systemctl --user stop openclaw.service`
- **状态：** `systemctl --user status openclaw.service`
- **日志：** `journalctl --user -u openclaw.service -f`

编辑 Quadlet 文件后：

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

为了在 SSH/无主机上实现开机持久化，请为您当前用户启用 lingering：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 配置、环境和存储

- **配置目录：** `~/.openclaw`
- **工作区目录：** `~/.openclaw/workspace`
- **令牌文件：** `~/.openclaw/.env`
- **启动助手：** `./scripts/run-openclaw-podman.sh`

启动脚本和 Quadlet 将主机状态绑定挂载到容器中：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

默认情况下，这些是主机目录，而不是匿名的容器状态，因此
`openclaw.json`、每个代理的 `auth-profiles.json`、渠道/提供商状态、
会话和工作区在容器替换后仍然保留。
Podman 设置还会为 `127.0.0.1` 和 `localhost` 在发布的网关端口上植入 `gateway.controlUi.allowedOrigins`，以便本地仪表板可以使用容器的非环回绑定。

适用于手动启动器的有用环境变量：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名称（默认为 `openclaw`）
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要运行的镜像
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 映射到容器 `18789` 的主机端口
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 映射到容器 `18790` 的主机端口
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 已发布端口的主机接口；默认为 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器内的网关绑定模式；默认为 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id`（默认）、`auto` 或 `host`

手动启动器在最终确定容器/镜像默认值之前会读取 `~/.openclaw/.env`，因此您可以在那里持久保存这些设置。

如果您使用非默认的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，请为 `./scripts/podman/setup.sh` 和随后的 `./scripts/run-openclaw-podman.sh launch` 命令设置相同的变量。仓库本地启动器不会跨 Shell 持久保存自定义路径覆盖。

Quadlet 说明：

- 生成的 Quadlet 服务有意保持一个固定的、经过加固的默认形状：`127.0.0.1` 发布的端口、`--bind lan` 容器内部以及 `keep-id` 用户命名空间。
- 它固定了 `OPENCLAW_NO_RESPAWN=1`、`Restart=on-failure` 和 `TimeoutStartSec=300`。
- 它同时发布了 `127.0.0.1:18789:18789` (Gateway(网关)) 和 `127.0.0.1:18790:18790` (桥接)。
- 它将 `~/.openclaw/.env` 作为运行时 `EnvironmentFile` 来读取诸如 `OPENCLAW_GATEWAY_TOKEN` 之类的值，但它不会使用手动启动器的 Podman 特定覆盖允许列表。
- 如果您需要自定义发布端口、发布主机或其他容器运行标志，请使用手动启动器或直接编辑 `~/.config/containers/systemd/openclaw.container`，然后重新加载并重启服务。

## 常用命令

- **容器日志：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **从主机 CLI 打开仪表板 URL：** CLI`openclaw dashboard --no-open`
- **通过主机 CLI 检查健康/状态：** CLI`openclaw gateway status --deep`RPC (RPC 探测 + 额外的服务扫描)

## 故障排除

- **配置或工作区权限被拒绝 (EACCES)：** 容器默认以 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 运行。请确保主机配置/工作区路径归您的当前用户所有。
- **Gateway(网关) 启动受阻 (缺少 Gateway(网关)`gateway.mode=local`)：** 确保存在 `~/.openclaw/openclaw.json` 并设置了 `gateway.mode="local"`。如果缺失，`scripts/podman/setup.sh` 会创建它。
- **容器 CLI 命令命中了错误的目标：** 请显式使用 CLI`openclaw --container <name> ...`，或在您的 shell 中导出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 失败并显示 `--container`：** 这是预期的。重新构建/拉取镜像，然后重启容器或 Quadlet 服务。
- **Quadlet 服务无法启动：** 运行 `systemctl --user daemon-reload`，然后运行 `systemctl --user start openclaw.service`。在无头系统上，您可能还需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻止绑定挂载：** 请保持默认的挂载行为不变；当 SELinux 处于 enforcing 或 permissive 模式时，启动器会在 Linux 上自动添加 `:Z`。

## 相关

- [Docker](/zh/install/docker)
- [Gateway(网关) 后台进程](/zh/gateway/background-process)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)
