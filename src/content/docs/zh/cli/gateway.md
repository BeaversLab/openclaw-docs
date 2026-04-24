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

本页面中的子命令位于 `openclaw gateway …` 之下。

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

- 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则 Gateway(网关) 将拒绝启动。对于临时/开发运行，请使用 `--allow-unconfigured`。
- `openclaw onboard --mode local` 和 `openclaw setup` 预期会写入 `gateway.mode=local`。如果文件存在但缺少 `gateway.mode`，请将其视为损坏或被覆盖的配置并进行修复，而不是隐式地假定本地模式。
- 如果文件存在且缺少 `gateway.mode`，Gateway(网关) 会将其视为可疑的配置损坏，并拒绝为您“猜测本地”。
- 未经身份验证的超出环回地址的绑定将被阻止（安全防护）。
- `SIGUSR1` 在获得授权时会触发进程内重启（默认启用 `commands.restart`；设置 `commands.restart: false` 以阻止手动重启，而仍然允许 gateway 工具/config apply/update）。
- `SIGINT`/`SIGTERM` 处理程序会停止网关进程，但不会恢复任何自定义终端状态。如果您用 CLI 或原始模式输入包装 TUI，请在退出前恢复终端。

### 选项

- `--port <port>`：WebSocket 端口（默认值来自配置/环境变量；通常为 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：监听器绑定模式。
- `--auth <token|password>`：身份验证模式覆盖。
- `--token <token>`：令牌覆盖（同时为该进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密码覆盖。警告：内联密码可能会在本地进程列表中暴露。
- `--password-file <path>`：从文件读取网关密码。
- `--tailscale <off|serve|funnel>`：通过 Gateway(网关) 暴露 Tailscale。
- `--tailscale-reset-on-exit`：在关闭时重置 Tailscale serve/funnel 配置。
- `--allow-unconfigured`：允许网关在没有配置 `gateway.mode=local` 的情况下启动。这仅绕过用于临时/开发引导的启动守卫；它不会写入或修复配置文件。
- `--dev`：如果缺失，则创建开发配置 + 工作区（跳过 BOOTSTRAP.md）。
- `--reset`：重置开发配置 + 凭证 + 会话 + 工作区（需要 `--dev`）。
- `--force`：在启动之前终止所选端口上任何现有的侦听器。
- `--verbose`：详细日志。
- `--cli-backend-logs`：仅在控制台中显示 CLI 后端日志（并启用 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日志样式（默认为 `auto`）。
- `--compact`: `--ws-log compact` 的别名。
- `--raw-stream`: 将原始模型流事件记录到 l。
- `--raw-stream-path <path>`: 原始流 l 路径。

启动分析：

- 设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以记录 Gateway(网关) 启动期间的阶段计时。
- 运行 `pnpm test:startup:gateway -- --runs 5 --warmup 1` 以对 Gateway(网关) 启动进行基准测试。该基准测试记录第一个进程输出、`/healthz`、`/readyz` 以及启动跟踪计时。

## 查询正在运行的 Gateway(网关)

所有查询命令均使用 WebSocket RPC。

输出模式：

- 默认：人类可读（TTY 中显示颜色）。
- `--json`: 机器可读的 JSON（无样式/进度指示器）。
- `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI 同时保留人类可读的布局。

共享选项（在支持的情况下）：

- `--url <url>`: Gateway(网关) WebSocket URL。
- `--token <token>`: Gateway(网关) 令牌。
- `--password <password>`: Gateway(网关) 密码。
- `--timeout <ms>`：超时/预算（因命令而异）。
- `--expect-final`：等待“最终”响应（代理调用）。

注意：当您设置 `--url` 时，CLI 不会回退到配置或环境凭据。
请显式传递 `--token` 或 `--password`。缺少显式凭据将导致错误。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端点是一个存活探针：它在服务器可以响应 HTTP 时返回。HTTP `/readyz` 端点更严格，并且在启动边车、通道或配置的挂钩仍在 settling 时保持红色。

### `gateway usage-cost`

从会话日志中获取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

选项：

- `--days <days>`：包含的天数（默认 `30`）。

### `gateway stability`

从正在运行的 Gateway(网关) 获取最近的诊断稳定性记录器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

选项：

- `--limit <limit>`：要包含的最近事件的最大数量（默认 `25`，最大 `1000`）。
- `--type <type>`：按诊断事件类型过滤，例如 `payload.large` 或 `diagnostic.memory.pressure`。
- `--since-seq <seq>`：仅包含诊断序列号之后的事件。
- `--bundle [path]`：读取持久化的稳定性包，而不是调用正在运行的 Gateway(网关)。对状态目录下的最新包使用 `--bundle latest`（或仅使用 `--bundle`），或直接传递包 JSON 路径。
- `--export`：写入可共享的支持诊断 zip 文件，而不是打印稳定性详细信息。
- `--output <path>`：`--export` 的输出路径。

注意事项：

- 记录器默认处于活动状态且不包含负载：它仅捕获操作元数据，不捕获聊天文本、工具输出或原始请求或响应正文。仅当您需要完全禁用 Gateway(网关) 诊断心跳收集时，才设置 `diagnostics.enabled: false`。
- 记录保留操作元数据：事件名称、计数、字节大小、内存读数、队列/会话状态、渠道/插件名称以及经过编辑的会话摘要。它们不保留聊天文本、Webhook 正文、工具输出、原始请求或响应正文、令牌、Cookie、密钥值、主机名或原始会话 ID。
- 当 Gateway(网关) 发生致命退出、关闭超时和重启启动失败时，如果记录器中有事件，OpenClaw 会将相同的诊断快照写入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。使用 `openclaw gateway stability --bundle latest` 检查最新的打包文件；`--limit`、`--type` 和 `--since-seq` 也适用于打包文件输出。

### `gateway diagnostics export`

写入一个本地诊断 zip 文件，该文件设计用于附加到错误报告中。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

选项：

- `--output <path>`：输出 zip 路径。默认为状态目录下的支持导出文件。
- `--log-lines <count>`：要包含的最大已清理日志行数（默认 `5000`）。
- `--log-bytes <bytes>`：要检查的最大日志字节数（默认 `1000000`）。
- `--url <url>`：用于健康快照的 Gateway(网关) WebSocket URL。
- `--token <token>`：用于健康快照的 Gateway(网关) 令牌。
- `--password <password>`：用于健康快照的 Gateway(网关) 密码。
- `--timeout <ms>`：状态/健康快照超时（默认为 `3000`）。
- `--no-stability-bundle`：跳过持久化的稳定性包查找。
- `--json`：以 JSON 格式打印写入的路径、大小和清单。

导出内容包括清单、Markdown 摘要、配置形状、清理后的配置详细信息、清理后的日志摘要、清理后的 Gateway(网关) 状态/健康快照，以及最新的稳定性包（如果存在）。

它旨在共享。它保留有助于调试的操作详细信息，例如安全的 OpenClaw 日志字段、子系统名称、状态代码、持续时间、配置模式、端口、插件 ID、提供商 ID、非机密功能设置以及经过编辑的操作日志消息。它会省略或编辑聊天文本、Webhook 正文、工具输出、凭据、Cookie、帐户/消息标识符、提示/指令文本、主机名和机密值。当 LogTape 风格的消息看起来像用户/聊天/工具有效负载文本时，导出仅保留一条消息被省略及其字节计数。

### `gateway status`

`gateway status` 显示 Gateway(网关) 服务（launchd/systemd/schtasks）以及对连接/身份验证功能的可选探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

选项：

- `--url <url>`：添加显式探测目标。配置的远程主机 + 本地主机仍会被探测。
- `--token <token>`：探测器的令牌身份验证。
- `--password <password>`：探测器的密码身份验证。
- `--timeout <ms>`：探测器超时（默认 `10000`）。
- `--no-probe`：跳过连接性探测器（仅限服务视图）。
- `--deep`：也扫描系统级服务。
- `--require-rpc`：将默认连接性探测器升级为读取探测器，并在该读取探测器失败时以非零状态退出。不能与 `--no-probe` 结合使用。

备注：

- 即使本地 CLI 配置缺失或无效，`gateway status` 仍可用于诊断。
- 默认 `gateway status` 证明服务状态、WebSocket 连接以及握手时可见的身份验证功能。它不证明读/写/管理操作。
- 如果可能，`gateway status` 会解析配置的身份验证 SecretRefs 以用于探测身份验证。
- 如果在此命令路径中所需的身份验证 SecretRef 未解析，当探测连接性/身份验证失败时，`gateway status --json` 会报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析密钥源。
- 如果探测成功，未解析的 auth-ref 警告将被抑制以避免误报。
- 在脚本和自动化中使用 `--require-rpc`，当仅靠侦听服务不足且您需要读取作用域 RPC 调用也保持健康时。
- `--deep` 增加了对额外的 launchd/systemd/schtasks 安装的最佳尝试扫描。当检测到多个类网关服务时，人工输出会打印清理提示，并警告大多数设置应每台机器运行一个网关。
- Human 输出包含已解析的文件日志路径以及 CLI 与服务的配置路径/有效性快照，以帮助诊断配置文件或状态目录的漂移。
- 在 Linux systemd 安装中，服务身份验证漂移检查会从单元中读取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、加引号的路径、多个文件以及可选的 `-` 文件）。
- 漂移检查使用合并的运行时环境（首先是服务命令环境，然后是进程环境回退）来解析 `gateway.auth.token` SecretRefs。
- 如果令牌身份验证未实际生效（明确设置 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或在密码可获胜且没有令牌候选者可获胜的情况下未设置模式），令牌漂移检查将跳过配置令牌解析。

### `gateway probe`

`gateway probe` 是“调试所有内容”的命令。它总是探测：

- 您配置的远程网关（如果已设置），以及
- localhost（环回地址）**即使配置了远程网关**。

如果您传递 `--url`，该显式目标将被添加到两者之前。人工输出将目标标记为：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

如果可以访问多个网关，它将打印所有网关。当您使用隔离的配置文件/端口时（例如救援机器人），支持多个网关，但大多数安装仍然只运行单个网关。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解释：

- `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
- `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 报告探测可以证明的关于身份验证的信息。这与可达性分开。
- `Read probe: ok` 表示读取作用域的详细 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `Read probe: limited - missing scope: operator.read` 表示连接成功，但读取作用域的 RPC 受到限制。这被报告为 **降级** 的可达性，而不是完全失败。
- 仅当没有任何探测到的目标可达时，退出代码才为非零。

JSON 说明（`--json`）：

- 顶层：
  - `ok`：至少有一个目标是可达的。
  - `degraded`：至少有一个目标具有作用域受限的详细 RPC。
  - `capability`：在所有可达目标中看到的最佳功能（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
  - `primaryTargetId`：按此顺序视为活动获胜者的最佳目标：显式 URL、SSH 隧道、配置的远程，然后是 local loopback。
  - `warnings[]`：尽力而为的警告记录，包含 `code`、`message` 和可选的 `targetIds`。
  - `network`：从当前配置和主机网络派生的 local loopback/tailnet URL 提示。
  - `discovery.timeoutMs` 和 `discovery.count`：此探测传递使用的实际发现预算/结果计数。
- 每个目标 (`targets[].connect`)：
  - `ok`：连接后的可达性以及降级分类。
  - `rpcOk`：详细信息 RPC 成功。
  - `scopeLimited`：详细信息 RPC 失败，原因是缺少操作员作用域。
- 每个目标 (`targets[].auth`)：
  - `role`：在 `hello-ok` 中报告的授权角色（如果可用）。
  - `scopes`：在 `hello-ok` 中报告的已授予作用域（如果可用）。
  - `capability`：针对该目标呈现的授权能力分类。

常见警告代码：

- `ssh_tunnel_failed`：SSH 隧道设置失败；该命令回退到了直接探测。
- `multiple_gateways`：有多个目标可达；除非您有意运行隔离的配置文件（例如救援机器人），否则这种情况很少见。
- `auth_secretref_unresolved`：无法为失败的目标解析已配置的身份验证 SecretRef。
- `probe_scope_limited`：WebSocket 连接成功，但由于缺少 `operator.read`，读取探测受到限制。

#### 通过 SSH 远程（Mac 应用同等功能）

macOS 应用的“通过 SSH 远程”模式使用本地端口转发，以便在 `ws://127.0.0.1:<port>` 访问远程网关（该网关可能仅绑定到环回地址）。

CLI 等效项：

```bash
openclaw gateway probe --ssh user@gateway-host
```

选项：

- `--ssh <target>`：`user@host` 或 `user@host:port`（端口默认为 `22`）。
- `--ssh-identity <path>`：身份文件。
- `--ssh-auto`：从解析出的发现端点（`local.` 加上配置的广域域，如果有）中选择第一个发现的网关主机作为 SSH 目标。仅 TXT 的提示将被忽略。

配置（可选，用作默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低级 RPC 助手。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

选项：

- `--params <json>`：参数的 JSON 对象字符串（默认 `{}`）
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

注意：

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

- `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `gateway uninstall|start|stop|restart`: `--json`

注意：

- `gateway install` 支持 `--port`、`--runtime`、`--token`、`--force` 和 `--json`。
- 当令牌认证需要令牌并且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证 SecretRef 是否可解析，但不会将解析出的令牌持久化到服务环境元数据中。
- 如果令牌认证需要令牌但配置的令牌 SecretRef 未解析，安装将以失败告终，而不会持久化回退的纯文本。
- 对于 `gateway run` 上的密码认证，相较于内联 `--password`，优先选择 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支持的 `gateway.auth.password`。
- 在推断身份验证模式下，仅限 shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装令牌要求；在安装托管服务时，请使用持久化配置（`gateway.auth.password` 或 config `env`）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 并且未设置 `gateway.auth.mode`，则在显式设置模式之前，安装将被阻止。
- 生命周期命令接受 `--json` 用于脚本编写。

## 发现网关 (Bonjour)

`gateway discover` 扫描 Gateway(网关) 信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（例如：`openclaw.internal.`）并设置分离 DNS + DNS 服务器；请参阅 [/gateway/bonjour](/zh/gateway/bonjour)

只有启用了 Bonjour 发现功能（默认）的网关才会广播信标。

广域网发现记录包括 (TXT)：

- `role`（网关角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（可选；当其不存在时，客户端默认将 SSH 目标设为 `22`）
- `tailnetDns`（MagicDNS 主机名，如果可用）
- `gatewayTls` / `gatewayTlsSha256`（已启用 TLS + 证书指纹）
- `cliPath`（写入广域网区域的远程安装提示）

### `gateway discover`

```bash
openclaw gateway discover
```

选项：

- `--timeout <ms>`：每个命令的超时时间（浏览/解析）；默认为 `2000`。
- `--json`：机器可读的输出（同时禁用样式和加载指示器）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

注意：

- 当启用广播域时，CLI 会扫描 `local.` 以及已配置的广域域。
- JSON 输出中的 `wsUrl` 派生自已解析的服务端点，而不是来自仅 TXT 的提示（如 `lanHost` 或 `tailnetDns`）。
- 在 `local.` mDNS 上，仅当 `discovery.mdns.mode` 为 `full` 时，才会广播 `sshPort` 和 `cliPath`。广域 DNS-SD 仍然会写入 `cliPath`；那里的 `sshPort` 也保持可选状态。
