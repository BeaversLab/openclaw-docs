---
summary: "OpenClaw Gateway(网关) CLI (`openclaw gateway`) — run, query, and discover gateways"
read_when:
  - Running the Gateway(网关) from the CLI (dev or servers)
  - Debugging Gateway(网关) auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (LAN + tailnet)
title: "gateway"
---

# Gateway(网关) CLI

The Gateway(网关) is OpenClaw’s WebSocket server (channels, nodes, sessions, hooks).

Subcommands in this page live under `openclaw gateway …`.

相关文档：

- [/gateway/bonjour](/zh/gateway/bonjour)
- [/gateway/discovery](/zh/gateway/discovery)
- [/gateway/configuration](/zh/gateway/configuration)

## Run the Gateway(网关)

Run a local Gateway(网关) process:

```bash
openclaw gateway
```

Foreground alias:

```bash
openclaw gateway run
```

Notes:

- By default, the Gateway(网关) refuses to start unless `gateway.mode=local` is set in `~/.openclaw/openclaw.json`. Use `--allow-unconfigured` for ad-hoc/dev runs.
- Binding beyond loopback without auth is blocked (safety guardrail).
- `SIGUSR1` triggers an in-process restart when authorized (`commands.restart` is enabled by default; set `commands.restart: false` to block manual restart, while gateway 工具/config apply/update remain allowed).
- `SIGINT`/`SIGTERM` handlers stop the gateway process, but they don’t restore any custom terminal state. If you wrap the CLI with a TUI or raw-mode input, restore the terminal before exit.

### Options

- `--port <port>`: WebSocket port (default comes from config/env; usually `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>`: listener bind mode.
- `--auth <token|password>`: auth mode override.
- `--token <token>`: token override (also sets `OPENCLAW_GATEWAY_TOKEN` for the process).
- `--password <password>`: password override. Warning: inline passwords can be exposed in local process listings.
- `--password-file <path>`: read the gateway password from a file.
- `--tailscale <off|serve|funnel>`: expose the Gateway(网关) via Tailscale.
- `--tailscale-reset-on-exit`: reset Tailscale serve/funnel config on shutdown.
- `--allow-unconfigured`: 允许在没有 `gateway.mode=local` 的配置中启动 gateway。
- `--dev`: 如果缺少，创建开发配置 + 工作区（跳过 BOOTSTRAP.md）。
- `--reset`: 重置开发配置 + 凭据 + 会话 + 工作区（需要 `--dev`）。
- `--force`: 在启动之前终止所选端口上的任何现有侦听器。
- `--verbose`: 详细日志。
- `--claude-cli-logs`: 仅在控制台中显示 claude-cli 日志（并启用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`: websocket 日志样式（默认为 `auto`）。
- `--compact`: `--ws-log compact` 的别名。
- `--raw-stream`: 将原始模型流事件记录到 l。
- `--raw-stream-path <path>`: 原始流 l 路径。

## 查询正在运行的 Gateway(网关)

所有查询命令都使用 WebSocket RPC。

输出模式：

- 默认：人类可读（在 TTY 中着色）。
- `--json`: 机器可读的 JSON（无样式/加载动画）。
- `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，同时保持人类布局。

共享选项（在支持的情况下）：

- `--url <url>`: Gateway(网关) WebSocket URL。
- `--token <token>`: Gateway(网关) 令牌。
- `--password <password>`: Gateway(网关) 密码。
- `--timeout <ms>`: 超时/预算（因命令而异）。
- `--expect-final`: 等待“最终”响应（代理调用）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
显式传递 `--token` 或 `--password`。缺少显式凭据将导致错误。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 显示 Gateway(网关) 服务（launchd/systemd/schtasks）以及可选的 RPC 探针。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

选项：

- `--url <url>`: 覆盖探针 URL。
- `--token <token>`: 探针的令牌身份验证。
- `--password <password>`: 探针的密码身份验证。
- `--timeout <ms>`：探测超时（默认 `10000`）。
- `--no-probe`：跳过 RPC 探测（仅服务视图）。
- `--deep`：同时扫描系统级服务。
- `--require-rpc`：当 RPC 探测失败时以非零状态退出。不能与 `--no-probe` 组合使用。

说明：

- `gateway status` 会在可能的情况下解析为探测认证配置的 auth SecretRefs。
- 如果在此命令路径中所需的 auth SecretRef 未解析，当探测连接/认证失败时，`gateway status --json` 将报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析密钥源。
- 如果探测成功，将抑制未解析的 auth-ref 警告以避免误报。
- 在脚本和自动化中使用 `--require-rpc`，当仅靠监听服务不足且需要 Gateway(网关) RPC 本身健康时。
- 在 Linux systemd 安装中，服务认证漂移检查会从单元中读取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、带引号的路径、多个文件和可选的 `-` 文件）。

### `gateway probe`

`gateway probe` 是“调试所有内容”的命令。它始终探测：

- 您配置的远程网关（如果已设置），以及
- 本地主机（loopback）**即使已配置远程**。

如果可访问多个网关，它将打印所有网关。当您使用隔离的配置文件/端口（例如，救援机器人）时，支持多个网关，但大多数安装仍运行单个网关。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解读：

- `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
- `RPC: ok` 表示详细的 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `RPC: limited - missing scope: operator.read` 表示连接成功但详细 RPC 受范围限制。这被报告为 **降级** 的可访问性，而非完全失败。
- 仅当没有探测到的目标可访问时，退出代码才为非零。

JSON 说明 (`--json`)：

- 顶层：
  - `ok`：至少有一个目标可达。
  - `degraded`：至少有一个目标具有范围受限的详细信息 RPC。
- 每个目标 (`targets[].connect`)：
  - `ok`：连接后的可达性 + 降级分类。
  - `rpcOk`：完整的详细信息 RPC 成功。
  - `scopeLimited`：由于缺少操作员范围，详细信息 RPC 失败。

#### 通过 SSH 远程

macOS 应用程序“通过 SSH 远程”模式使用本地端口转发，因此远程网关（可能仅绑定到环回）可以在 `ws://127.0.0.1:<port>` 访问。

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

## 管理 Gateway 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

说明：

- `gateway install` 支持 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 当令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
- 如果令牌身份验证需要令牌但配置的令牌 SecretRef 未解析，安装将以失败告终，而不是持久化回退纯文本。
- 对于 `gateway run` 上的密码身份验证，建议优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
- 在推断身份验证模式下，仅限 shell 的 `OPENCLAW_GATEWAY_PASSWORD`/`CLAWDBOT_GATEWAY_PASSWORD` 不会放宽安装令牌要求；安装托管服务时，请使用持久化配置（`gateway.auth.password` 或 config `env`）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 并且未设置 `gateway.auth.mode`，安装将被阻止，直到显式设置模式。
- 生命周期命令接受 `--json` 用于脚本编写。

## 发现网关 (Bonjour)

`gateway discover` 扫描 Gateway(网关) 信标（`_openclaw-gw._tcp`）。

- 组播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（例如：`openclaw.internal.`）并设置拆分 DNS 和 DNS 服务器；请参阅 [/gateway/bonjour](/zh/gateway/bonjour)

只有启用了 Bonjour 发现（默认）的网关才会通告信标。

广域发现记录包括 (TXT)：

- `role`（网关角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（SSH 端口；如果不存在，默认为 `22`）
- `tailnetDns`（MagicDNS 主机名，如果有）
- `gatewayTls` / `gatewayTlsSha256`（启用 TLS + 证书指纹）
- `cliPath`（用于远程安装的可选提示）

### `gateway discover`

```bash
openclaw gateway discover
```

选项：

- `--timeout <ms>`：每个命令的超时（浏览/解析）；默认 `2000`。
- `--json`：机器可读的输出（同时禁用样式/加载动画）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

import zh from "/components/footer/zh.mdx";

<zh />
