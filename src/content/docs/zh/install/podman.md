---
summary: "在无根模式的 Podman 容器中运行 OpenClaw"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

在无根模式的 Podman 容器中运行 OpenClaw Gateway(网关)，由当前非 root 用户管理。

预期的模型是：

- Podman 运行网关容器。
- 您的主机 `openclaw` CLI 是控制平面。
- 持久化状态默认位于主机上的 `~/.openclaw` 下。
- 日常管理使用 `openclaw --container <name> ...`，而不是 `sudo -u openclaw`、`podman exec` 或单独的服务用户。

## 先决条件

- 无根模式下的 **Podman**
- 主机上已安装 **OpenClaw CLI**
- **可选：** 如果您希望由 Quadlet 管理自动启动，则需要 `systemd --user`
- **可选：** 仅当您希望在无头主机上实现启动持久化时才需要 `sudo` 和 `loginctl enable-linger "$(whoami)"`

## 快速开始

<Steps>
  <Step title="一次性设置">
    从代码库根目录运行 `./scripts/podman/setup.sh`。
  </Step>

<Step title="启动 Gateway(网关) 容器">使用 `./scripts/run-openclaw-podman.sh launch` 启动容器。</Step>

<Step title="在容器内运行新手引导">运行 `./scripts/run-openclaw-podman.sh launch setup`，然后打开 `http://127.0.0.1:18789/`。</Step>

  <Step title="从主机 CLI 管理运行中的容器">
    设置 `OPENCLAW_CONTAINER=openclaw`，然后从主机使用普通的 `openclaw` 命令。
  </Step>
</Steps>

设置详情：

- `./scripts/podman/setup.sh` 默认在您的无根 Podman 存储中构建 `openclaw:local`，或者如果您设置了某个变量，则使用 `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE`。
- 如果缺失，它会使用 `gateway.mode: "local"` 创建 `~/.openclaw/openclaw.json`。
- 如果缺失，它会使用 `OPENCLAW_GATEWAY_TOKEN` 创建 `~/.openclaw/.env`。
- 对于手动启动，辅助脚本仅从 `~/.openclaw/.env` 读取一小部分与 Podman 相关的键，并将显式的运行时环境变量传递给容器；它不会将整个 env 文件交给 Podman。

Quadlet 托管设置：

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet 是仅适用于 Linux 的选项，因为它依赖于 systemd 用户服务。

您也可以设置 `OPENCLAW_PODMAN_QUADLET=1`。

可选的构建/设置环境变量：

- `OPENCLAW_IMAGE` 或 `OPENCLAW_PODMAN_IMAGE` -- 使用现有的/已拉取的镜像，而不是构建 `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` -- 在镜像构建期间安装额外的 apt 软件包
- `OPENCLAW_EXTENSIONS` -- 在构建时预装扩展依赖项

容器启动：

```bash
./scripts/run-openclaw-podman.sh launch
```

脚本使用 `--userns=keep-id` 以您当前的 uid/gid 启动容器，并将您的 OpenClaw 状态绑定挂载到容器中。

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
openclaw gateway status --deep
openclaw doctor
openclaw channels login
```

在 macOS 上，Podman machine 可能会使浏览器对网关来说看起来不是本地的。
如果启动后控制 UI 报告设备身份验证错误，请优先使用 [macOS Podman SSH 隧道](#macos-podman-ssh-tunnel) 中的 SSH
隧道流程。对于远程 HTTPS 访问，请使用
[Podman + Tailscale](#podman--tailscale) 中的 Tailscale 指南。

## macOS Podman SSH 隧道

在 macOS 上，即使发布的端口仅在 `127.0.0.1` 上，Podman machine 也可能使浏览器对网关来说看起来不是本地的。

对于本地浏览器访问，请使用 SSH 隧道进入 Podman VM，并改为打开隧道后的本地主机端口。

推荐的本地隧道端口：

- Mac 主机上的 `28889`
- 转发到 Podman VM 内部的 `127.0.0.1:18789`

在单独的终端中启动隧道：

```bash
ssh -N \
  -i ~/.local/share/containers/podman/machine/machine \
  -p <podman-vm-ssh-port> \
  -L 28889:127.0.0.1:18789 \
  core@127.0.0.1
```

在该命令中，`<podman-vm-ssh-port>` 是 Podman VM 在 Mac 主机上的 SSH 端口。使用以下命令检查您的当前值：

```bash
podman system connection list
```

允许一次隧道浏览器来源。这是首次使用隧道时所必需的，因为启动器可以自动填充 Podman 发布的端口，但它无法推断您选择的浏览器隧道端口：

```bash
OPENCLAW_CONTAINER=openclaw openclaw config set gateway.controlUi.allowedOrigins \
  '["http://127.0.0.1:18789","http://localhost:18789","http://127.0.0.1:28889","http://localhost:28889"]' \
  --strict-json
podman restart openclaw
```

这是默认 `28889` 隧道的一次性步骤。

然后打开：

```text
http://127.0.0.1:28889/
```

注意：

- `18789` 通常已被 Mac 主机上的 Podman 发布网关端口占用，因此隧道使用 `28889` 作为本地浏览器端口。
- 如果 UI 请求配对批准，请优先使用针对特定容器的显式命令或显式 URL 命令，以防止主机 CLI 回退到本地配对文件：

```bash
openclaw --container openclaw devices list
openclaw --container openclaw devices approve --latest
```

- 等效的显式 URL 形式：

```bash
openclaw devices list \
  --url ws://127.0.0.1:28889 \
  --token "$(sed -n 's/^OPENCLAW_GATEWAY_TOKEN=//p' ~/.openclaw/.env | head -n1)"
```

## Podman + Tailscale

如需 HTTPS 或远程浏览器访问，请遵循主要的 Tailscale 文档。

针对 Podman 的特别说明：

- 将 Podman 发布主机保持在 `127.0.0.1`。
- 相比 `openclaw gateway --tailscale serve`，首选主机管理的 `tailscale serve`。
- 对于不使用 HTTPS 的本地 macOS 浏览器访问，请优先使用上述 SSH 隧道部分。

请参阅：

- [Tailscale](/en/gateway/tailscale)
- [控制 UI](/en/web/control-ui)

## Systemd (Quadlet，可选)

如果您运行了 `./scripts/podman/setup.sh --quadlet`，设置程序将在以下位置安装 Quadlet 文件：

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

若要在 SSH/无头主机上实现开机持久化，请为当前用户启用 lingering：

```bash
sudo loginctl enable-linger "$(whoami)"
```

## 配置、环境变量和存储

- **配置目录：** `~/.openclaw`
- **工作区目录：** `~/.openclaw/workspace`
- **令牌文件：** `~/.openclaw/.env`
- **启动辅助程序：** `./scripts/run-openclaw-podman.sh`

启动脚本和 Quadlet 将主机状态绑定挂载到容器中：

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

默认情况下，这些是主机目录，而非匿名的容器状态，因此在替换容器后配置和工作区得以保留。Podman 设置还会为 `127.0.0.1` 和发布的网关端口上的 `localhost` 预设 `gateway.controlUi.allowedOrigins`，以便本地仪表板可与容器的非环回绑定配合使用。

手动启动器的有用环境变量：

- `OPENCLAW_PODMAN_CONTAINER` -- 容器名称（默认为 `openclaw`）
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- 要运行的镜像
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- 映射到容器端口 `18789` 的主机端口
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- 映射到容器端口 `18790` 的主机端口
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- 用于发布端口的主机接口；默认为 `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- 容器内的网关绑定模式；默认为 `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id`（默认）、`auto` 或 `host`

手动启动器在最终确定容器/镜像默认值之前会读取 `~/.openclaw/.env`，因此您可以在其中持久化这些设置。

如果您使用非默认的 `OPENCLAW_CONFIG_DIR` 或 `OPENCLAW_WORKSPACE_DIR`，请为 `./scripts/podman/setup.sh` 和随后的 `./scripts/run-openclaw-podman.sh launch` 命令设置相同的变量。仓库本地启动器不会跨 shell 会话持久化自定义路径覆盖。

Quadlet 说明：

- 生成的 Quadlet 服务有意保持固定的、经过强化的默认形状：`127.0.0.1` 发布的端口、容器内的 `--bind lan` 以及 `keep-id` 用户命名空间。
- 它仍然会读取 `~/.openclaw/.env` 以获取网关运行时环境变量（如 `OPENCLAW_GATEWAY_TOKEN`），但它不会使用手动启动器的 Podman 特定覆盖允许列表。
- 如果您需要自定义发布端口、发布主机或其他容器运行标志，请使用手动启动器或直接编辑 `~/.config/containers/systemd/openclaw.container`，然后重新加载并重启服务。

## 有用的命令

- **容器日志：** `podman logs -f openclaw`
- **停止容器：** `podman stop openclaw`
- **移除容器：** `podman rm -f openclaw`
- **从主机 CLI 打开仪表板 URL：** `openclaw dashboard --no-open`
- **通过主机 CLI 检查健康/状态：** `openclaw gateway status --deep`

## 故障排除

- **配置或工作区权限被拒绝 (EACCES)：** 容器默认以 `--userns=keep-id` 和 `--user <your uid>:<your gid>` 运行。请确保主机配置/工作区路径由您的当前用户拥有。
- **Gateway(网关) 启动受阻 (缺少 `gateway.mode=local`)：** 请确保 `~/.openclaw/openclaw.json` 存在并设置了 `gateway.mode="local"`。如果缺失，`scripts/podman/setup.sh` 会创建它。
- **容器 CLI 命令访问了错误的目标：** 请显式使用 `openclaw --container <name> ...`，或在您的 shell 中导出 `OPENCLAW_CONTAINER=<name>`。
- **`openclaw update` 失败并显示 `--container`：** 这是预期的。重新构建/拉取镜像，然后重启容器或 Quadlet 服务。
- **Quadlet 服务无法启动：** 运行 `systemctl --user daemon-reload`，然后运行 `systemctl --user start openclaw.service`。在无头系统 上，您可能还需要 `sudo loginctl enable-linger "$(whoami)"`。
- **SELinux 阻止绑定挂载：** 保持默认挂载行为不变；当 SELinux 处于强制或宽容模式时，启动器会在 Linux 上自动添加 `:Z`。

## 相关

- [Docker](/en/install/docker)
- [Gateway(网关) 后台进程](/en/gateway/background-process)
- [Gateway(网关) 故障排除](/en/gateway/troubleshooting)
