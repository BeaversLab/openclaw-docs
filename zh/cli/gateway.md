---
summary: "OpenClaw Gateway 网关 CLI (`openclaw gateway`) — 运行、查询和发现网关"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (LAN + tailnet)
title: "gateway"
---

# Gateway 网关 CLI

Gateway 网关 是 OpenClaw 的 WebSocket 服务器（通道、节点、会话、钩子）。

本页中的子命令位于 `openclaw gateway …` 之下。

相关文档：

- [/gateway/bonjour](/zh/gateway/bonjour)
- [/gateway/discovery](/zh/gateway/discovery)
- [/gateway/configuration](/zh/gateway/configuration)

## 运行 Gateway 网关

运行本地 Gateway 网关 进程：

```bash
openclaw gateway
```

前台别名：

```bash
openclaw gateway run
```

注意：

- 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则 Gateway 网关 将拒绝启动。对于临时/开发运行，请使用 `--allow-unconfigured`。
- 在未经过身份验证的情况下绑定到回环地址之外会被阻止（安全防护措施）。
- 当获得授权时，`SIGUSR1` 会触发进程内重启（`commands.restart` 默认启用；设置 `commands.restart: false` 可阻止手动重启，但仍允许 gateway 工具/config apply/update）。
- `SIGINT`/`SIGTERM` 处理程序会停止网关进程，但不会恢复任何自定义终端状态。如果您使用 TUI 或原始模式输入封装 CLI，请在退出前恢复终端。

### 选项

- `--port <port>`: WebSocket 端口（默认值来自配置/环境；通常为 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`: 监听器绑定模式。
- `--auth <token|password>`: 认证模式覆盖。
- `--token <token>`: 令牌覆盖（同时为该进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`: 密码覆盖。警告：内联密码可能会在本地进程列表中暴露。
- `--password-file <path>`: 从文件读取网关密码。
- `--tailscale <off|serve|funnel>`: 通过 Tailscale 暴露 Gateway 网关。
- `--tailscale-reset-on-exit`: 关闭时重置 Tailscale serve/funnel 配置。
- `--allow-unconfigured`: 允许在没有配置 `gateway.mode=local` 的情况下启动网关。
- `--dev`: 如果缺失，则创建开发配置 + 工作区（跳过 BOOTSTRAP.md）。
- `--reset`: 重置开发配置 + 凭证 + 会话 + 工作区（需要 `--dev`）。
- `--force`：在启动之前终止所选端口上的任何现有监听器。
- `--verbose`：详细日志。
- `--claude-cli-logs`：仅在控制台中显示 claude-cli 日志（并启用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日志样式（默认 `auto`）。
- `--compact`：`--ws-log compact` 的别名。
- `--raw-stream`：将原始模型流事件记录到 l。
- `--raw-stream-path <path>`：原始流 l 路径。

## 查询正在运行的 Gateway 网关

所有查询命令均使用 WebSocket RPC。

输出模式：

- 默认：人类可读格式（在 TTY 中着色）。
- `--json`：机器可读的 JSON（无样式/旋转光标）。
- `--no-color`（或 `NO_COLOR=1`）：在保持人工布局的同时禁用 ANSI。

共享选项（在支持的情况下）：

- `--url <url>`：Gateway 网关 WebSocket URL。
- `--token <token>`：Gateway 网关 令牌。
- `--password <password>`：Gateway 网关 密码。
- `--timeout <ms>`：超时/预算（因命令而异）。
- `--expect-final`：等待“最终”响应（代理调用）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
显式传递 `--token` 或 `--password`。缺少显式凭据是一个错误。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 显示 Gateway 网关 服务（launchd/systemd/schtasks）以及可选的 RPC 探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

选项：

- `--url <url>`：覆盖探测 URL。
- `--token <token>`：探测的令牌认证。
- `--password <password>`：探测的密码认证。
- `--timeout <ms>`：探测超时（默认 `10000`）。
- `--no-probe`：跳过 RPC 探测（仅服务视图）。
- `--deep`：也扫描系统级服务。
- `--require-rpc`: 当 RPC 探测失败时以非零值退出。不能与 `--no-probe` 组合使用。

注意：

- `gateway status` 会在可能的情况下解析配置的身份验证 SecretRefs 以用于探测身份验证。
- 如果在此命令路径中未解析所需的 auth SecretRef，则当探测连接/身份验证失败时，`gateway status --json` 会报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析密钥源。
- 如果探测成功，则将抑制未解析的 auth-ref 警告以避免误报。
- 在脚本和自动化中使用 `--require-rpc`，当侦听服务不足且您需要 Gateway(网关) RPC 本身健康时。
- 在 Linux systemd 安装中，服务身份验证漂移检查会从单元中读取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、带引号的路径、多个文件和可选的 `-` 文件）。

### `gateway probe`

`gateway probe` 是“调试所有内容”的命令。它始终探测：

- 您配置的远程 Gateway(网关)（如果已设置），以及
- localhost（环回）**即使已配置远程**。

如果可以到达多个 Gateway(网关)，它将打印所有 Gateway(网关)。当您使用隔离的配置文件/端口（例如，救援机器人）时，支持多个 Gateway(网关)，但大多数安装仍运行单个 Gateway(网关)。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解释：

- `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
- `RPC: ok` 表示详细的 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `RPC: limited - missing scope: operator.read` 表示连接成功，但详细的 RPC 受到范围限制。这被报告为**降级**的可访问性，而不是完全失败。
- 仅当没有任何探测目标可访问时，退出代码才为非零。

JSON 说明（`--json`）：

- 顶层：
  - `ok`：至少有一个目标可访问。
  - `degraded`：至少有一个目标的详细 RPC 受到范围限制。
- 每个目标（`targets[].connect`）：
  - `ok`：连接后的可达性 + 降级分类。
  - `rpcOk`：详细的 RPC 成功。
  - `scopeLimited`：由于缺少操作员作用域，详细 RPC 失败。

#### 通过 SSH 远程（Mac 应用同等功能）

macOS 应用“通过 SSH 远程”模式使用本地端口转发，以便远程网关（可能仅绑定到环回）在 `ws://127.0.0.1:<port>` 处可达。

CLI 等效项：

```bash
openclaw gateway probe --ssh user@gateway-host
```

选项：

- `--ssh <target>`：`user@host` 或 `user@host:port`（端口默认为 `22`）。
- `--ssh-identity <path>`：身份文件。
- `--ssh-auto`：选择第一个发现的网关主机作为 SSH 目标（仅限 LAN/WAB）。

配置（可选，用作默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低级 RPC 辅助工具。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

## 管理 Gateway(网关) 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

注意：

- `gateway install` 支持 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证 SecretRef 是否可解析，但不会将解析出的令牌持久化到服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，安装将以失败告终（封闭），而不是持久化回退明文。
- 对于 `gateway run` 上的密码认证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
- 在推断的认证模式下，仅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD`/`CLAWDBOT_GATEWAY_PASSWORD` 不会放宽安装令牌要求；安装托管服务时，请使用持久化配置（`gateway.auth.password` 或配置 `env`）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则在显式设置模式之前将阻止安装。
- 生命周期命令接受 `--json` 以用于脚本编写。

## 发现网关（Bonjour）

`gateway discover` 扫描 Gateway(网关) 信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（例如：`openclaw.internal.`）并设置分离 DNS + DNS 服务器；参见 [/gateway/bonjour](/zh/gateway/bonjour)

只有启用了 Bonjour 发现功能（默认）的网关才会发布信标。

广域发现记录包括（TXT）：

- `role`（网关角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（SSH 端口；如果不存在，默认为 `22`）
- `tailnetDns`（MagicDNS 主机名，如果可用）
- `gatewayTls` / `gatewayTlsSha256`（已启用 TLS + 证书指纹）
- `cliPath`（用于远程安装的可选提示）

### `gateway discover`

```bash
openclaw gateway discover
```

选项：

- `--timeout <ms>`：每个命令的超时时间（浏览/解析）；默认为 `2000`。
- `--json`：机器可读输出（同时禁用样式/加载指示符）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

import zh from "/components/footer/zh.mdx";

<zh />
