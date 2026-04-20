---
summary: "OpenClaw Gateway(网关) CLI (`openclaw gateway`) — 运行、查询和发现网关"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "gateway"
---

# Gateway(网关) 网关 CLI

Gateway(网关) 网关 是 OpenClaw 的 WebSocket 服务器（通道、节点、会话、钩子）。

本页中的子命令位于 `openclaw gateway …` 下。

相关文档：

- [/gateway/bonjour](/zh/gateway/bonjour)
- [/gateway/discovery](/zh/gateway/discovery)
- [/gateway/configuration](/zh/gateway/configuration)

## 运行 Gateway(网关) 网关

运行本地 Gateway(网关) 网关 进程：

```bash
openclaw gateway
```

前台别名：

```bash
openclaw gateway run
```

注意：

- 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则 Gateway(网关) 拒绝启动。使用 `--allow-unconfigured` 进行临时/开发运行。
- `openclaw onboard --mode local` 和 `openclaw setup` 预期会写入 `gateway.mode=local`。如果文件存在但缺少 `gateway.mode`，请将其视为损坏或被篡改的配置并进行修复，而不是隐式地假设为本地模式。
- 如果文件存在但缺少 `gateway.mode`，Gateway(网关) 会将其视为可疑的配置损坏，并拒绝为您“猜测本地”。
- 未经身份验证的超出环回地址的绑定将被阻止（安全防护）。
- `SIGUSR1` 在获得授权时触发进程内重启（`commands.restart` 默认启用；设置 `commands.restart: false` 以阻止手动重启，而 gateway 工具/config apply/update 仍然允许）。
- `SIGINT`/`SIGTERM` 处理程序会停止网关进程，但它们不会恢复任何自定义终端状态。如果您使用 TUI 或原始模式输入包装 CLI，请在退出之前恢复终端。

### 选项

- `--port <port>`：WebSocket 端口（默认值来自配置/环境；通常为 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：监听器绑定模式。
- `--auth <token|password>`：身份验证模式覆盖。
- `--token <token>`：令牌覆盖（同时也为该进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密码覆盖。警告：内联密码可能会暴露在本地进程列表中。
- `--password-file <path>`：从文件读取网关密码。
- `--tailscale <off|serve|funnel>`: 通过 Tailscale 暴露 Gateway(网关)。
- `--tailscale-reset-on-exit`: 在关闭时重置 Tailscale serve/funnel 配置。
- `--allow-unconfigured`: 允许在没有 `gateway.mode=local` 的情况下启动网关。这仅绕过特别/开发引导的启动保护；它不会写入或修复配置文件。
- `--dev`: 如果缺失，则创建开发配置 + 工作区（跳过 BOOTSTRAP.md）。
- `--reset`: 重置开发配置 + 凭证 + 会话 + 工作区（需要 `--dev`）。
- `--force`: 在启动之前终止所选端口上任何现有的监听器。
- `--verbose`: 详细日志。
- `--cli-backend-logs`: 仅在控制台中显示 CLI 后端日志（并启用 stdout/stderr）。
- `--ws-log <auto|full|compact>`: websocket 日志样式（默认为 `auto`）。
- `--compact`: `--ws-log compact` 的别名。
- `--raw-stream`: 将原始模型流事件记录到 l。
- `--raw-stream-path <path>`: 原始流 l 路径。

## 查询正在运行的 Gateway(网关)

所有查询命令均使用 WebSocket RPC。

输出模式：

- 默认：人类可读（在 TTY 中显示彩色）。
- `--json`: 机器可读的 JSON（无样式/旋转指示器）。
- `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，同时保留人类可读布局。

共享选项（在支持的情况下）：

- `--url <url>`: Gateway(网关) WebSocket URL。
- `--token <token>`: Gateway(网关) 令牌。
- `--password <password>`: Gateway(网关) 密码。
- `--timeout <ms>`: 超时/预算（因命令而异）。
- `--expect-final`: 等待“最终”响应（代理调用）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据即为错误。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway usage-cost`

从会话日志中获取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

选项：

- `--days <days>`: 包含的天数（默认 `30`）。

### `gateway status`

`gateway status` 显示 Gateway(网关) 服务（launchd/systemd/schtasks）以及可选的 RPC 探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

选项：

- `--url <url>`: 添加显式探测目标。配置的远程 + localhost 仍会被探测。
- `--token <token>`: 探测的令牌认证。
- `--password <password>`: 探测的密码认证。
- `--timeout <ms>`: 探测超时（默认 `10000`）。
- `--no-probe`：跳过 RPC 探测（仅限服务视图）。
- `--deep`：同时扫描系统级服务。
- `--require-rpc`：当 RPC 探测失败时以非零值退出。不能与 `--no-probe` 结合使用。

注意：

- 即使本地 CLI 配置丢失或无效，`gateway status` 仍可用于诊断。
- `gateway status` 会在可能的情况下解析已配置的身份验证 SecretRefs 以进行探测认证。
- 如果在此命令路径中未解析所需的身份验证 SecretRef，当探测连接/身份验证失败时，`gateway status --json` 会报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析密钥源。
- 如果探测成功，将抑制未解析的 auth-ref 警告以避免误报。
- 在脚本和自动化中，当侦听服务不足且需要 Gateway(网关) RPC 本身处于健康状态时，请使用 `--require-rpc`。
- `--deep` 增加了对额外的 launchd/systemd/schtasks 安装的尽力扫描。当检测到多个类似 gateway 的服务时，人工输出会打印清理提示，并警告大多数设置应每台机器运行一个 gateway。
- 人工输出包括解析的文件日志路径以及 CLI 与服务的配置路径/有效性快照，以帮助诊断配置文件或状态目录漂移。
- 在 Linux systemd 安装中，服务身份验证漂移检查会从单元中读取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、带引号的路径、多个文件和可选的 `-` 文件）。
- 漂移检查使用合并的运行时环境（首先是服务命令环境，然后是进程环境回退）来解析 `gateway.auth.token` SecretRefs。
- 如果令牌身份验证未实际生效（明确 `gateway.auth.mode` `password`/`none`/`trusted-proxy`，或者未设置模式且密码可能获胜而令牌候选者无法获胜），令牌漂移检查将跳过配置令牌解析。

### `gateway probe`

`gateway probe` 是“调试所有内容”的命令。它始终探测：

- 您配置的远程网关（如果已设置），以及
- localhost（本地回环）**即使配置了远程**。

如果您传递 `--url`，该显式目标将添加到两者之前。面向人类的输出会将目标标记为：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

如果可以到达多个网关，它将打印所有网关。当您使用隔离的配置文件/端口（例如，救援机器人）时，支持多个网关，但大多数安装仍然运行单个网关。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解读：

- `Reachable: yes` 意味着至少有一个目标接受了 WebSocket 连接。
- `RPC: ok` 意味着详细的 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `RPC: limited - missing scope: operator.read` 意味着连接成功，但详细的 RPC 受范围限制。这被报告为 **降级** 的可达性，而不是完全失败。
- 只有当没有探测到的目标可达时，退出代码才为非零。

JSON 说明（`--json`）：

- 顶层：
  - `ok`：至少有一个目标是可达的。
  - `degraded`：至少有一个目标的详细 RPC 受范围限制。
  - `primaryTargetId`：按此顺序视为活动优胜者的最佳目标：显式 URL、SSH 隧道、配置的远程，然后是本地回环。
  - `warnings[]`：尽力而为的警告记录，包含 `code`、`message` 和可选的 `targetIds`。
  - `network`：从当前配置和主机网络派生的本地回环/tailnet URL 提示。
  - `discovery.timeoutMs` 和 `discovery.count`：此探测过程使用的实际发现预算/结果计数。
- 每个目标（`targets[].connect`）：
  - `ok`：连接后的可达性 + 降级分类。
  - `rpcOk`：完全详细的 RPC 成功。
  - `scopeLimited`: 由于缺少操作员作用域，详细信息 RPC 失败。

常见警告代码：

- `ssh_tunnel_failed`: SSH 隧道设置失败；该命令回退到直接探测。
- `multiple_gateways`: 多个目标可达；除非您有意运行隔离的配置文件（例如救援机器人），否则这通常是不正常的。
- `auth_secretref_unresolved`: 无法为失败的目标解析已配置的身份验证 SecretRef。
- `probe_scope_limited`: WebSocket 连接成功，但详细信息 RPC 受到缺少 `operator.read` 的限制。

#### 通过 SSH 远程连接（Mac 应用功能对等）

macOS 应用的“通过 SSH 远程连接”模式使用本地端口转发，因此远程 Gateway（可能仅绑定到环回地址）可以在 `ws://127.0.0.1:<port>` 访问。

CLI 等效项：

```bash
openclaw gateway probe --ssh user@gateway-host
```

选项：

- `--ssh <target>`: `user@host` 或 `user@host:port`（端口默认为 `22`）。
- `--ssh-identity <path>`: 身份文件。
- `--ssh-auto`: 从解析的发现端点中选择第一个发现的 Gateway 主机作为 SSH 目标（`local.` 加上配置的广域名（如果有））。仅 TXT 的提示将被忽略。

配置（可选，用作默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

底层 RPC 辅助工具。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

选项：

- `--params <json>`: 参数的 JSON 对象字符串（默认为 `{}`）
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

说明：

- `--params` 必须是有效的 JSON。
- `--expect-final` 主要用于在最终有效负载之前流式传输中间事件的代理式 RPC。

## 管理 Gateway(网关) 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

命令选项：

- `gateway status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `gateway install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- `gateway uninstall|start|stop|restart`：`--json`

注：

- `gateway install` 支持 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证 SecretRef 是否可解析，但不会将解析出的令牌持久化到服务环境元数据中。
- 如果令牌认证需要令牌但配置的令牌 SecretRef 未解析，安装将以安全失败模式终止，而不是持久化回退明文。
- 对于 `gateway run` 上的密码认证，建议优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
- 在推断出的身份验证模式下，仅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装令牌要求；安装托管服务时，请使用持久化配置（`gateway.auth.password` 或配置 `env`）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则安装将被阻止，直到显式设置模式。
- 生命周期命令接受 `--json` 以便编写脚本。

## 发现 Gateway（Bonjour）

`gateway discover` 扫描 Gateway(网关) 信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（例如：`openclaw.internal.`）并设置分离 DNS + DNS 服务器；请参阅 [/gateway/bonjour](/zh/gateway/bonjour)

只有启用了 Bonjour 发现功能的网关（默认）才会发布信标。

广域发现记录包括 (TXT)：

- `role`（网关角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（可选；当其不存在时，客户端默认 SSH 目标为 `22`）
- `tailnetDns`（MagicDNS 主机名，如果可用）
- `gatewayTls` / `gatewayTlsSha256`（已启用 TLS + 证书指纹）
- `cliPath`（写入广域区域的远程安装提示）

### `gateway discover`

```bash
openclaw gateway discover
```

选项：

- `--timeout <ms>`：每条命令的超时时间（浏览/解析）；默认 `2000`。
- `--json`：机器可读输出（同时禁用样式/加载动画）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

说明：

- CLI 会扫描 `local.` 以及配置的广域域（如果已启用）。
- JSON 输出中的 `wsUrl` 派生自已解析的服务端点，而非来自仅 TXT 的提示，例如 `lanHost` 或 `tailnetDns`。
- 在 `local.` mDNS 上，仅当 `discovery.mdns.mode` 为 `full` 时才会广播 `sshPort` 和 `cliPath`。广域 DNS-SD 仍会写入 `cliPath`；`sshPort` 在那里也保持可选状态。
