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

启动分析：

- 设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以在 Gateway(网关) 启动期间记录阶段计时。
- 运行 `pnpm test:startup:gateway -- --runs 5 --warmup 1` 对 Gateway(网关) 启动进行基准测试。该基准测试记录第一个进程输出、`/healthz`、`/readyz` 和启动跟踪计时。

## 查询正在运行的 Gateway(网关)

所有查询命令均使用 WebSocket RPC。

输出模式：

- 默认：人类可读（TTY 中显示颜色）。
- `--json`：机器可读的 JSON（无样式/加载动画）。
- `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，同时保持人类布局。

共享选项（在支持的情况下）：

- `--url <url>`：Gateway(网关) WebSocket URL。
- `--token <token>`：Gateway(网关) 令牌。
- `--password <password>`：Gateway(网关) 密码。
- `--timeout <ms>`：超时/预算（因命令而异）。
- `--expect-final`：等待“最终”响应（代理调用）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据将报错。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端点是一个存活探测：一旦服务器可以回答 HTTP，它就会返回。HTTP `/readyz` 端点更严格，在启动边车、通道或配置的挂钩仍在完成设置时保持红色。

### `gateway usage-cost`

从会话日志中获取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

选项：

- `--days <days>`：包含的天数（默认为 `30`）。

### `gateway status`

`gateway status` 显示 Gateway(网关) 服务（launchd/systemd/schtasks）以及可选的连接/身份验证能力探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

选项：

- `--url <url>`：添加显式探测目标。配置的远程 + 本地主机仍会被探测。
- `--token <token>`：用于探测的令牌身份验证。
- `--password <password>`：探测器的密码认证。
- `--timeout <ms>`：探测器超时（默认为 `10000`）。
- `--no-probe`：跳过连接性探测器（仅限服务视图）。
- `--deep`：同时扫描系统级服务。
- `--require-rpc`：将默认连接性探测器升级为读取探测器，并在读取探测器失败时以非零状态退出。不能与 `--no-probe` 结合使用。

注意：

- 即使本地 CLI 配置缺失或无效，`gateway status` 仍可用于诊断。
- 默认 `gateway status` 证明服务状态、WebSocket 连接以及握手时可见的身份验证功能。它不证明读取/写入/管理操作。
- `gateway status` 会尽可能解析用于探测器身份验证的已配置身份验证 SecretRef。
- 如果在此命令路径中未解析所需的身份验证 SecretRef，则当探测器连接/身份验证失败时，`gateway status --json` 会报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析密钥源。
- 如果探测器成功，则抑制未解析的身份验证引用警告，以避免误报。
- 在脚本和自动化中，当仅拥有侦听服务不足且您需要读取范围的 RPC 调用也保持健康时，请使用 `--require-rpc`。
- `--deep` 会添加针对额外的 launchd/systemd/schtasks 安装的最佳尝试扫描。当检测到多个类似网关的服务时，人工输出会打印清理提示，并警告大多数设置应在每台计算机上运行一个网关。
- 人工输出包括已解析的文件日志路径以及 CLI 与服务的配置路径/有效性快照，以帮助诊断配置文件或状态目录漂移。
- 在 Linux systemd 安装上，服务身份验证漂移检查会从单元中读取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、带引号的路径、多个文件以及可选的 `-` 文件）。
- 漂移检查使用合并的运行时环境（优先服务命令环境，然后是进程环境回退）来解析 `gateway.auth.token` SecretRef。
- 如果令牌身份验证未实际生效（明确 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或模式未设置且密码可获胜且无令牌候选者可获胜），令牌漂移检查将跳过配置令牌解析。

### `gateway probe`

`gateway probe` 是“调试所有内容”的命令。它始终探测：

- 您配置的远程网关（如果已设置），以及
- 本地主机（环回）**即使已配置远程**。

如果您传递 `--url`，该显式目标将添加到两者之前。人工输出将目标标记为：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

如果可以到达多个网关，它将打印所有网关。当您使用隔离的配置文件/端口（例如，救援机器人）时，支持多个网关，但大多数安装仍运行单个网关。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解释：

- `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
- `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 报告探测关于身份验证能证明的内容。它与可达性是分开的。
- `Read probe: ok` 表示读取范围详细信息 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `Read probe: limited - missing scope: operator.read` 表示连接成功但读取范围 RPC 受到限制。这被报告为 **降级** 的可达性，而不是完全失败。
- 仅当没有任何探测目标可达时，退出代码才为非零。

JSON 说明（`--json`）：

- 顶层：
  - `ok`：至少有一个目标可达。
  - `degraded`：至少有一个目标具有范围限制的详细信息 RPC。
  - `capability`：在可达目标中看到的最佳功能（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
  - `primaryTargetId`：按以下顺序视为活动获胜者的最佳目标：显式 URL、SSH 隧道、已配置的远程，然后是 local loopback。
  - `warnings[]`：带有 `code`、`message` 和可选 `targetIds` 的尽力而为警告记录。
  - `network`：从当前配置和主机网络派生的 local loopback/tailnet URL 提示。
  - `discovery.timeoutMs` 和 `discovery.count`：用于此探测轮次的实际发现预算/结果计数。
- 每个目标（`targets[].connect`）：
  - `ok`：连接后的可达性 + 降级分类。
  - `rpcOk`：完整详情 RPC 成功。
  - `scopeLimited`：由于缺少操作员范围，详情 RPC 失败。
- 每个目标（`targets[].auth`）：
  - `role`：可用时在 `hello-ok` 中报告的身份验证角色。
  - `scopes`：可用时在 `hello-ok` 中报告的授予范围。
  - `capability`：该目标呈现的身份验证功能分类。

常见警告代码：

- `ssh_tunnel_failed`：SSH 隧道设置失败；该命令回退到直接探测。
- `multiple_gateways`：有多个目标是可达的；除非您故意运行隔离的配置文件（例如救援机器人），否则这很不寻常。
- `auth_secretref_unresolved`：无法为失败的目标解析已配置的身份验证 SecretRef。
- `probe_scope_limited`：WebSocket 连接成功，但读取探测因缺少 `operator.read` 而受限。

#### 通过 SSH 远程（Mac 应用对等）

macOS 应用的“通过 SSH 远程”模式使用本地端口转发，以便远程网关（可能仅绑定到环回）可在 `ws://127.0.0.1:<port>` 处访问。

CLI 对应项：

```bash
openclaw gateway probe --ssh user@gateway-host
```

选项：

- `--ssh <target>`：`user@host` 或 `user@host:port`（端口默认为 `22`）。
- `--ssh-identity <path>`：身份文件。
- `--ssh-auto`: 从解析的
  发现端点（`local.` 加上配置的广域域（如果有））中选择第一个发现的网关主机作为 SSH 目标。仅 TXT 的
  提示将被忽略。

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

注：

- `--params` 必须是有效的 JSON。
- `--expect-final` 主要用于代理风格的 RPC，该 RPC 在最终有效负载之前流式传输中间事件。

## 管理 Gateway(网关) 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

命令选项：

- `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `gateway uninstall|start|stop|restart`: `--json`

注：

- `gateway install` 支持 `--port`, `--runtime`, `--token`, `--force`, `--json`。
- 当令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证 SecretRef 是否可解析，但不会将解析后的令牌持久化到服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，安装将以失败关闭（fail closed）的方式进行，而不是持久化回退纯文本。
- 对于 `gateway run` 上的密码认证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
- 在推断的认证模式下，仅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装令牌的要求；在安装托管服务时，请使用持久配置（`gateway.auth.password` 或配置 `env`）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则在显式设置模式之前将阻止安装。
- 生命周期命令接受 `--json` 以用于脚本编写。

## 发现网关 (Bonjour)

`gateway discover` 扫描 Gateway(网关) 信标 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD (广域 Bonjour)：选择一个域（例如：`openclaw.internal.`）并设置分裂 DNS + DNS 服务器；参见 [/gateway/bonjour](/zh/gateway/bonjour)

只有启用了 Bonjour 发现功能（默认）的网关才会通告信标。

广域发现记录包括 (TXT)：

- `role` (网关角色提示)
- `transport` (传输提示，例如 `gateway`)
- `gatewayPort` (WebSocket 端口，通常为 `18789`)
- `sshPort` (可选；当它不存在时，客户端默认将 SSH 目标设置为 `22`)
- `tailnetDns` (MagicDNS 主机名，如果可用)
- `gatewayTls` / `gatewayTlsSha256` (启用 TLS + 证书指纹)
- `cliPath` (写入广域区域的远程安装提示)

### `gateway discover`

```bash
openclaw gateway discover
```

选项：

- `--timeout <ms>`：每个命令的超时时间（浏览/解析）；默认为 `2000`。
- `--json`：机器可读的输出（同时也禁用样式/加载动画）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

注释：

- CLI 会扫描 `local.` 以及已配置的广域域（如果已启用）。
- JSON 输出中的 `wsUrl` 源自已解析的服务端点，而非来自仅 TXT 的提示（如 `lanHost` 或 `tailnetDns`）。
- 在 `local.` mDNS 上，仅当 `discovery.mdns.mode` 为 `full` 时才会广播 `sshPort` 和 `cliPath`。广域 DNS-SD 仍会写入 `cliPath`；`sshPort` 在那里也是可选的。
