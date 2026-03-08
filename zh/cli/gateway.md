---
summary: "OpenClaw Gateway CLI（`openclaw gateway`）— 运行、查询与发现 gateway"
read_when:
  - 通过 CLI 运行 Gateway（dev 或服务器）
  - 调试 Gateway 认证、绑定模式与连接性
  - 通过 Bonjour 发现 gateway（LAN + tailnet）
title: "gateway"
---

# Gateway CLI

Gateway 是 OpenClaw 的 WebSocket 服务器（channels、nodes、sessions、hooks）。

本页子命令均为 `openclaw gateway …`。

相关文档：

- [/gateway/bonjour](/zh/gateway/bonjour)
- [/gateway/discovery](/zh/gateway/discovery)
- [/gateway/configuration](/zh/gateway/configuration)

## 运行 Gateway

运行本地 Gateway 进程：

```bash
openclaw gateway
```

前台别名：

```bash
openclaw gateway run
```

说明：

- 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置 `gateway.mode=local`，Gateway 会拒绝启动。用于临时/dev 运行请使用 `--allow-unconfigured`。
- 未启用认证时禁止绑定到 loopback 之外（安全护栏）。
- `SIGUSR1` 在授权时触发进程内重启（启用 `commands.restart` 或使用 gateway 工具/配置 apply/update）。
- `SIGINT`/`SIGTERM` 会停止 gateway 进程，但不会恢复自定义终端状态。若你用 TUI 或 raw-mode 输入包裹 CLI，请在退出前恢复终端。

### 选项

- `--port <port>`：WebSocket 端口（默认来自 config/env；通常 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：监听绑定模式。
- `--auth <token|password>`：认证模式覆盖。
- `--token <token>`：token 覆盖（同时为进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密码覆盖（同时为进程设置 `OPENCLAW_GATEWAY_PASSWORD`）。
- `--tailscale <off|serve|funnel>`：通过 Tailscale 暴露 Gateway。
- `--tailscale-reset-on-exit`：退出时重置 Tailscale serve/funnel 配置。
- `--allow-unconfigured`：允许在未设置 `gateway.mode=local` 时启动。
- `--dev`：缺少时创建 dev 配置 + workspace（跳过 BOOTSTRAP.md）。
- `--reset`：重置 dev 配置 + 凭据 + 会话 + workspace（需 `--dev`）。
- `--force`：启动前杀掉占用所选端口的已有监听器。
- `--verbose`：详细日志。
- `--claude-cli-logs`：控制台仅显示 claude-cli 日志（并启用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日志样式（默认 `auto`）。
- `--compact`：`--ws-log compact` 的别名。
- `--raw-stream`：将原始模型流事件记录为 jsonl。
- `--raw-stream-path <path>`：原始流 jsonl 路径。

## 查询运行中的 Gateway

所有查询命令都使用 WebSocket RPC。

输出模式：

- 默认：可读格式（TTY 里有颜色）。
- `--json`：机器可读 JSON（无样式/转圈）。
- `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，但保留布局。

共享选项（支持时）：

- `--url <url>`：Gateway WebSocket URL。
- `--token <token>`：Gateway token。
- `--password <password>`：Gateway 密码。
- `--timeout <ms>`：超时/预算（各命令不同）。
- `--expect-final`：等待 “final” 响应（agent 调用）。

注意：设置 `--url` 时，CLI 不会回退到配置或环境凭证。
显式传递 `--token` 或 `--password`。缺少显式凭证会报错。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 显示 Gateway 服务（launchd/systemd/schtasks）以及可选 RPC 探测。

```bash
openclaw gateway status
openclaw gateway status --json
```

选项：

- `--url <url>`：覆盖探测 URL。
- `--token <token>`：探测的 token 认证。
- `--password <password>`：探测的密码认证。
- `--timeout <ms>`：探测超时（默认 `10000`）。
- `--no-probe`：跳过 RPC 探测（仅服务视图）。
- `--deep`：同时扫描系统级服务。

### `gateway probe`

`gateway probe` 是"全量调试"命令。它总会探测：

- 你配置的 remote gateway（若已设置），以及
- localhost（loopback），**即使设置了 remote**。

若多个 gateway 可达，会全部输出。你可以用隔离 profile/端口同时跑多个 gateway（如 rescue bot），但多数安装只运行单个 gateway。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

#### 通过 SSH 访问远程（与 Mac app 一致）

macOS app 的 “Remote over SSH” 模式会建立本地端口转发，因此远程 gateway（即使只绑定 loopback）也可通过 `ws://127.0.0.1:<port>` 访问。

CLI 等价：

```bash
openclaw gateway probe --ssh user@gateway-host
```

选项：

- `--ssh <target>`：`user@host` 或 `user@host:port`（端口默认 `22`）。
- `--ssh-identity <path>`：identity 文件。
- `--ssh-auto`：自动选择首个发现的 gateway 主机作为 SSH 目标（仅 LAN/WAB）。

配置（可选，作默认）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

底层 RPC 辅助。

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
- 生命周期命令支持 `--json` 用于脚本化。

## 发现 gateway（Bonjour）

`gateway discover` 扫描 Gateway 广播（`_openclaw-gw._tcp`）。

- Multicast DNS-SD：`local.`
- Unicast DNS-SD（Wide-Area Bonjour）：选择域名（如 `openclaw.internal.`），并配置 split DNS + DNS 服务器；见 [/gateway/bonjour](/zh/gateway/bonjour)

只有开启 Bonjour 发现（默认开启）的 gateway 才会广播。

Wide-Area 发现记录包含（TXT）：

- `role`（gateway 角色提示）
- `transport`（传输提示，如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常 `18789`）
- `sshPort`（SSH 端口；缺省时为 `22`）
- `tailnetDns`（MagicDNS hostname，如可用）
- `gatewayTls` / `gatewayTlsSha256`（TLS 启用与证书指纹）
- `cliPath`（可选：远程安装提示）

### `gateway discover`

```bash
openclaw gateway discover
```

选项：

- `--timeout <ms>`：每次命令的超时（browse/resolve）；默认 `2000`。
- `--json`：机器可读输出（同时禁用样式/转圈）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```
