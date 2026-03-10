---
summary: "OpenClaw Gateway CLI (`openclaw gateway`) — 运行、查询和发现Gateway"
read_when:
  - "Running the Gateway from the CLI (dev or servers)"
  - "Debugging Gateway auth, bind modes, and connectivity"
  - "Discovering gateways via Bonjour (LAN + tailnet)"
title: "gateway"
---

# Gateway CLI

Gateway 是 OpenClaw 的 WebSocket 服务器（通道、节点、会话、钩子）。

此页面中的子命令位于 `openclaw gateway …` 下。

相关文档：

- [/gateway/bonjour](/en/gateway/bonjour)
- [/gateway/discovery](/en/gateway/discovery)
- [/gateway/configuration](/en/gateway/configuration)

## 运行 Gateway

运行本地 Gateway 进程：

```bash
openclaw gateway
```

前台别名：

```bash
openclaw gateway run
```

注意：

- 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则 Gateway 拒绝启动。使用 `--allow-unconfigured` 进行临时/开发运行。
- 没有认证的环回绑定被阻止（安全防护）。
- 当获得授权时，`SIGUSR1` 触发进程内重启（启用 `commands.restart` 或使用 gateway tool/config apply/update）。
- `SIGINT`/`SIGTERM` 处理程序停止 gateway 进程，但它们不会恢复任何自定义终端状态。如果您使用 TUI 或原始模式输入包装 CLI，请在退出前恢复终端。

### 选项

- `--port <port>`：WebSocket 端口（默认值来自配置/环境；通常是 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：侦听器绑定模式。
- `--auth <token|password>`：认证模式覆盖。
- `--token <token>`：令牌覆盖（同时为进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密码覆盖（同时为进程设置 `OPENCLAW_GATEWAY_PASSWORD`）。
- `--tailscale <off|serve|funnel>`：通过 Tailscale 暴露 Gateway。
- `--tailscale-reset-on-exit`：在关闭时重置 Tailscale serve/funnel 配置。
- `--allow-unconfigured`：允许在没有配置 `gateway.mode=local` 的情况下启动 gateway。
- `--dev`：创建开发配置 + 工作区（如果缺少）（跳过 BOOTSTRAP.md）。
- `--reset`：重置开发配置 + 凭据 + 会话 + 工作区（需要 `--dev`）。
- `--force`：在启动之前终止所选端口上的任何现有侦听器。
- `--verbose`：详细日志。
- `--claude-cli-logs`：仅在控制台中显示 claude-cli 日志（并启用其 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日志样式（默认 `auto`）。
- `--compact`：`--ws-log compact` 的别名。
- `--raw-stream`：将原始模型流事件记录到 jsonl。
- `--raw-stream-path <path>`：原始流 jsonl 路径。

## 查询运行中的 Gateway

所有查询命令使用 WebSocket RPC。

输出模式：

- 默认：人类可读（TTY 中着色）。
- `--json`：机器可读的 JSON（无样式/微调器）。
- `--no-color`（或 `NO_COLOR=1`）：在保持人类布局的同时禁用 ANSI。

共享选项（在支持的地方）：

- `--url <url>`：Gateway WebSocket URL。
- `--token <token>`：Gateway 令牌。
- `--password <password>`：Gateway 密码。
- `--timeout <ms>`：超时/预算（因命令而异）。
- `--expect-final`：等待”最终”响应（代理调用）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
显式传递 `--token` 或 `--password`。缺少显式凭据是一个错误。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` 显示 Gateway 服务（launchd/systemd/schtasks）以及可选的 RPC 探测。

```bash
openclaw gateway status
openclaw gateway status --json
```

选项：

- `--url <url>`：覆盖探测 URL。
- `--token <token>`：探测的令牌认证。
- `--password <password>`：探测的密码认证。
- `--timeout <ms>`：探测超时（默认 `10000`）。
- `--no-probe`：跳过 RPC 探测（仅服务视图）。
- `--deep`：也扫描系统级服务。

### `gateway probe`

`gateway probe` 是”调试所有内容”命令。它总是探测：

- 您配置的远程 gateway（如果已设置），以及
- localhost（环回）**即使配置了远程**。

如果多个 gateway 可达，它将打印所有这些 gateway。当您使用隔离的配置文件/端口（例如，救援机器人）时，支持多个 gateway，但大多数安装仍然运行单个 gateway。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

#### 通过 SSH 远程（Mac 应用对等）

macOS 应用”通过 SSH 远程”模式使用本地端口转发，以便远程 gateway（可能仅绑定到环回）可以在 `ws://127.0.0.1:<port>` 处访问。

等效 CLI：

```bash
openclaw gateway probe --ssh user@gateway-host
```

选项：

- `--ssh <target>`：`user@host` 或 `user@host:port`（端口默认为 `22`）。
- `--ssh-identity <path>`：身份文件。
- `--ssh-auto`：选择第一个发现的 gateway 主机作为 SSH 目标（仅 LAN/WAB）。

配置（可选，用作默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

底层 RPC 辅助工具。

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

注意：

- `gateway install` 支持 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 生命周期命令接受 `--json` 用于脚本编写。

## 发现 Gateway (Bonjour)

`gateway discover` 扫描 Gateway 信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD（Wide-Area Bonjour）：选择一个域（例如：`openclaw.internal.`）并设置拆分 DNS + DNS 服务器；参见 [/gateway/bonjour](/en/gateway/bonjour)

仅启用了 Bonjour 发现（默认）的 Gateway 才会广播信标。

广域发现记录包括 (TXT)：

- `role`（gateway 角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常是 `18789`）
- `sshPort`（SSH 端口；如果不存在，默认为 `22`）
- `tailnetDns`（MagicDNS 主机名，如果可用）
- `gatewayTls` / `gatewayTlsSha256`（已启用 TLS + 证书指纹）
- `cliPath`（远程安装的可选提示）

### `gateway discover`

```bash
openclaw gateway discover
```

选项：

- `--timeout <ms>`：每个命令的超时（浏览/解析）；默认 `2000`。
- `--json`：机器可读输出（也禁用样式/微调器）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```
