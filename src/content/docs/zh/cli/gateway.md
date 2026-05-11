---
summary: "OpenClaw Gateway(网关) CLI (`openclaw gateway`) — 运行、查询和发现网关"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "Gateway(网关)"
sidebarTitle: "Gateway(网关)"
---

Gateway(网关) 是 OpenClaw 的 WebSocket 服务器（通道、节点、会话、钩子）。本页中的子命令位于 `openclaw gateway …` 下。

<CardGroup cols={3}>
  <Card title="Bonjour 设备发现" href="/zh/gateway/bonjour">
    本地 mDNS + 广域 DNS-SD 设置。
  </Card>
  <Card title="设备发现概览" href="/zh/gateway/discovery">
    OpenClaw 如何通告和查找网关。
  </Card>
  <Card title="配置" href="/zh/gateway/configuration">
    顶级网关配置键。
  </Card>
</CardGroup>

## 运行 Gateway(网关)

运行本地 Gateway(网关)进程：

```bash
openclaw gateway
```

前台别名：

```bash
openclaw gateway run
```

<AccordionGroup>
  <Accordion title="启动行为">
    - 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则 Gateway(网关) 将拒绝启动。对于临时/开发运行，请使用 `--allow-unconfigured`。 - `openclaw onboard --mode local` 和 `openclaw setup` 预期会写入 `gateway.mode=local`。如果文件存在但缺少 `gateway.mode`，请将其视为损坏或被篡改的配置并进行修复，而不是隐式地假定处于本地模式。 - 如果文件存在且缺少
    `gateway.mode`，Gateway(网关) 会将其视为可疑的配置损坏，并拒绝为您“猜测本地模式”。 - 未经身份验证而绑定到环回地址之外的操作会被阻止（安全防护措施）。 - 当获得授权时，`SIGUSR1` 会触发进程内重启（默认启用 `commands.restart`；设置 `commands.restart: false` 以阻止手动重启，而 gateway 工具/config apply/update 仍然被允许）。 - `SIGINT`/`SIGTERM`
    处理程序会停止网关进程，但它们不会恢复任何自定义终端状态。如果您使用 CLI 或原始模式输入封装了 TUI，请在退出前恢复终端状态。
  </Accordion>
</AccordionGroup>

### 选项

<ParamField path="--port <port>" type="number">
  WebSocket 端口（默认值来自配置/环境；通常为 `18789`）。
</ParamField>
<ParamField path="--bind <loopback|lan|tailnet|auto|custom>" type="string">
  监听器绑定模式。
</ParamField>
<ParamField path="--auth <token|password>" type="string">
  认证模式覆盖。
</ParamField>
<ParamField path="--token <token>" type="string">
  令牌覆盖（也会为该进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
</ParamField>
<ParamField path="--password <password>" type="string">
  密码覆盖。
</ParamField>
<ParamField path="--password-file <path>" type="string">
  从文件读取 Gateway 密码。
</ParamField>
<ParamField path="--tailscale <off|serve|funnel>" type="string">
  通过 Gateway(网关) 暴露 Tailscale。
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  关闭时重置 Tailscale serve/funnel 配置。
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  允许在没有配置 `gateway.mode=local` 的情况下启动 Gateway。仅绕过针对临时/开发引导的启动守卫；不写入或修复配置文件。
</ParamField>
<ParamField path="--dev" type="boolean">
  如果缺失则创建开发配置 + 工作区（跳过 BOOTSTRAP.md）。
</ParamField>
<ParamField path="--reset" type="boolean">
  重置开发配置 + 凭据 + 会话 + 工作区（需要 `--dev`）。
</ParamField>
<ParamField path="--force" type="boolean">
  在启动之前终止选定端口上的任何现有监听器。
</ParamField>
<ParamField path="--verbose" type="boolean">
  详细日志。
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean">
  仅在控制台中显示 CLI 后端日志（并启用 stdout/stderr）。
</ParamField>
<ParamField path="--ws-log <auto|full|compact>" type="string" default="auto">
  Websocket 日志样式。
</ParamField>
<ParamField path="--compact" type="boolean">
  `--ws-log compact` 的别名。
</ParamField>
<ParamField path="--raw-stream" type="boolean">
  将原始模型流事件记录到 l。
</ParamField>
<ParamField path="--raw-stream-path <path>" type="string">
  原始流 l 路径。
</ParamField>

<Warning>Inline `--password` 可能在本地进程列表中暴露。建议优先使用 `--password-file`、环境变量或由 SecretRef 支持的 `gateway.auth.password`。</Warning>

### 启动性能分析

- 设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1` 以在 Gateway(网关) 启动期间记录各阶段计时，包括每个阶段的 `eventLoopMax` 延迟，以及安装索引、清单注册表、启动规划和所有者映射工作的插件查找表计时。
- 运行 `pnpm test:startup:gateway -- --runs 5 --warmup 1` 以对 Gateway(网关) 启动进行基准测试。基准测试会记录首次进程输出、`/healthz`、`/readyz`、启动跟踪计时、事件循环延迟以及插件查找表计时详情。

## 查询运行中的 Gateway(网关)

所有查询命令都使用 WebSocket RPC。

<Tabs>
  <Tab title="Output modes">
    - 默认：人类可读（在 TTY 中显示颜色）。
    - `--json`：机器可读的 JSON（无样式/无加载提示）。
    - `--no-color`（或 `NO_COLOR=1`）：在保留人类可读布局的同时禁用 ANSI。
  </Tab>
  <Tab title="Shared options">
    - `--url <url>`：Gateway(网关) WebSocket URL。
    - `--token <token>`：Gateway(网关) 令牌。
    - `--password <password>`：Gateway(网关) 密码。
    - `--timeout <ms>`：超时/预算（因命令而异）。
    - `--expect-final`：等待“最终”响应（用于代理调用）。
  </Tab>
</Tabs>

<Note>当您设置 `--url` 时，CLI 不会回退到配置文件或环境变量中的凭据。请显式传递 `--token` 或 `--password`。缺少显式凭据将被视为错误。</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端点是一个存活探测：一旦服务器能够响应 HTTP，它就会返回。HTTP `/readyz` 端点则更严格，当启动 sidecar、通道或配置的钩子仍在就绪过程中时，它会保持红色（未就绪）状态。

### `gateway usage-cost`

从会话日志中获取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

<ParamField path="--days <days>" type="number" default="30">
  要包含的天数。
</ParamField>

### `gateway stability`

从正在运行的 Gateway(网关) 获取最近的诊断稳定性记录器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

<ParamField path="--limit <limit>" type="number" default="25">
  要包含的最近事件的最大数量（最多 `1000`）。
</ParamField>
<ParamField path="--type <type>" type="string">
  按诊断事件类型筛选，例如 `payload.large` 或 `diagnostic.memory.pressure`。
</ParamField>
<ParamField path="--since-seq <seq>" type="number">
  仅包含诊断序列号之后的事件。
</ParamField>
<ParamField path="--bundle [path]" type="string">
  读取持久化的稳定性包，而不是调用正在运行的 Gateway(网关)。对状态目录下的最新包使用 `--bundle latest`（或仅使用 `--bundle`），或直接传递包 JSON 路径。
</ParamField>
<ParamField path="--export" type="boolean">
  写入可共享的支持诊断 zip 压缩包，而不是打印稳定性详细信息。
</ParamField>
<ParamField path="--output <path>" type="string">
  `--export` 的输出路径。
</ParamField>

<AccordionGroup>
  <Accordion title="隐私和打包行为">
    - 记录保留操作元数据：事件名称、计数、字节大小、内存读数、队列/会话状态、渠道/插件名称以及编辑过的会话摘要。它们不保留聊天文本、webhook 主体、工具输出、原始请求或响应主体、令牌、cookie、机密值、主机名或原始会话 ID。设置 `diagnostics.enabled: false` 以完全禁用记录器。 - 在发生致命 Gateway 退出、关闭超时和重新启动启动失败时，如果记录器有事件，OpenClaw 会将相同的诊断快照写入
    `~/.openclaw/logs/stability/openclaw-stability-*.json`。使用 `openclaw gateway stability --bundle latest` 检查最新的打包；`--limit`、`--type` 和 `--since-seq` 也适用于打包输出。
  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

写入一个旨在附加到错误报告的本地诊断 zip 文件。有关隐私模型和打包内容，请参阅 [Diagnostics Export](/zh/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  输出 zip 路径。默认为状态目录下的支持导出。
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  要包含的最大清理日志行数。
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  要检查的最大日志字节数。
</ParamField>
<ParamField path="--url <url>" type="string">
  健康快照的 Gateway(网关) WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  健康快照的 Gateway(网关) 令牌。
</ParamField>
<ParamField path="--password <password>" type="string">
  健康快照的 Gateway(网关) 密码。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  状态/健康快照超时。
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  跳过持久化的稳定性包查找。
</ParamField>
<ParamField path="--json" type="boolean">
  将写入的路径、大小和清单打印为 JSON。
</ParamField>

导出包含一个清单、一个 Markdown 摘要、配置形状、清理后的配置详细信息、清理后的日志摘要、清理后的 Gateway(网关) 状态/健康快照，以及存在时的最新稳定性包。

它是为了共享而设计的。它保留有助于调试的操作细节，例如安全的 OpenClaw 日志字段、子系统名称、状态代码、持续时间、配置的模式、端口、插件 ID、提供商 ID、非机密功能设置以及编辑过的操作日志消息。它会省略或编辑聊天文本、webhook 主体、工具输出、凭据、cookie、账户/消息标识符、提示/指令文本、主机名和机密值。当 LogTape 风格的消息看起来像用户/聊天/工具负载文本时，导出仅保留消息已被省略及其字节计数。

### `gateway status`

`gateway status` 显示 Gateway(网关) 服务 (launchd/systemd/schtasks) 以及可选的连接性/身份验证能力探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  添加一个显式探测目标。已配置的远程主机 + 本地主机仍会被探测。
</ParamField>
<ParamField path="--token <token>" type="string">
  探测的令牌认证。
</ParamField>
<ParamField path="--password <password>" type="string">
  探测的密码认证。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  探测超时。
</ParamField>
<ParamField path="--no-probe" type="boolean">
  跳过连接性探测（仅服务视图）。
</ParamField>
<ParamField path="--deep" type="boolean">
  同时扫描系统级服务。
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  将默认的连接性探测升级为读取探测，并在读取探测失败时返回非零状态码。不能与 `--no-probe` 组合使用。
</ParamField>

<AccordionGroup>
  <Accordion title="状态语义">
    - 即使本地CLI配置缺失或无效，`gateway status`仍可用于诊断。 - 默认`gateway status`可证明服务状态、WebSocket 连接以及握手时可见的鉴权功能。它不能证明读/写/管理操作。 - 对于首次设备鉴权，诊断探针是非变更性的：当存在现有的缓存设备令牌时，它们会复用该令牌，但不会仅仅为了检查状态而创建新的CLI设备身份或只读设备配对记录。 - `gateway status`会在可能的情况下解析配置的鉴权 SecretRefs 以用于探针鉴权。 -
    如果在此命令路径中所需的 auth SecretRef 未解析，当探针连接/鉴权失败时，`gateway status --json`将报告`rpc.authWarning`；请显式传递`--token`/`--password`或先解析密钥源。 - 如果探针成功，将抑制未解析的 auth-ref 警告以避免误报。 - 在脚本和自动化中，当仅靠侦听服务不够且您需要读取作用域RPC调用也处于健康状态时，请使用`--require-rpc`。 - `--deep`会增加对额外的 launchd/systemd/schtasks
    安装的最佳尝试扫描。当检测到多个类似网关的服务时，面向人类的输出将打印清理提示，并警告大多数设置应在每台机器上运行一个网关。 - 面向人类的输出包括解析后的文件日志路径以及CLI与服务配置路径/有效性快照，以帮助诊断配置文件或状态目录漂移。
  </Accordion>
  <Accordion title="Linux systemd auth-drift checks">
    - 在 Linux systemd 安装中，服务认证漂移检查会从单元中读取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、带引号的路径、多个文件以及可选的 `-` 文件）。 - 漂移检查使用合并的运行时环境（首先使用服务命令环境，然后是进程环境回退）来解析 `gateway.auth.token` SecretRefs。 - 如果令牌认证未实际生效（明确 `gateway.auth.mode` 为
    `password`/`none`/`trusted-proxy`，或未设置模式且密码可能获胜而没有令牌候选者可以获胜），令牌漂移检查将跳过配置令牌解析。
  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` 是“调试所有内容”的命令。它总是探测：

- 您配置的远程网关（如果已设置），以及
- 本地主机（环回）**即使配置了远程**。

如果您传递 `--url`，该显式目标将添加到两者之前。人工输出将目标标记为：

- `URL (explicit)`
- `Remote (configured)` 或 `Remote (configured, inactive)`
- `Local loopback`

<Note>如果可以到达多个网关，它将打印所有网关。当您使用隔离的配置文件/端口（例如，救援机器人）时，支持多个网关，但大多数安装仍然运行单个网关。</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="解读">
    - `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 报告探针关于身份验证所能证实的内容。这与可达性是分开的。
    - `Read probe: ok` 表示读取范围的详细信息 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
    - `Read probe: limited - missing scope: operator.read` 表示连接成功但读取范围 RPC 受到限制。这被报告为 **降级**（degraded）可达性，而不是完全失败。
    - 与 `gateway status` 类似，探针重用现有的缓存设备身份验证，但不会创建首次设备身份或配对状态。
    - 仅当没有探测到的目标可达时，退出代码才为非零。
  </Accordion>
  <Accordion title="JSON output">
    顶层：

    - `ok`: 至少有一个目标可达。
    - `degraded`: 至少有一个目标具有范围受限的详细信息 RPC。
    - `capability`: 在所有可达目标中看到的最佳功能（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`: 按此顺序视为活动获胜者的最佳目标：显式 URL、SSH 隧道、配置的远程，然后是 local loopback。
    - `warnings[]`: 包含 `code`、`message` 和可选 `targetIds` 的尽力警告记录。
    - `network`: 根据当前配置和主机网络推导出的 local loopback/tailnet URL 提示。
    - `discovery.timeoutMs` 和 `discovery.count`: 此探测轮次中使用的实际发现预算/结果计数。

    每个目标（`targets[].connect`）：

    - `ok`: 连接后的可达性 + 降级分类。
    - `rpcOk`: 完整详细信息 RPC 成功。
    - `scopeLimited`: 由于缺少操作员范围，详细信息 RPC 失败。

    每个目标（`targets[].auth`）：

    - `role`: 可用时在 `hello-ok` 中报告的身份验证角色。
    - `scopes`: 可用时在 `hello-ok` 中报告的授权范围。
    - `capability`: 该目标显示的身份验证功能分类。

  </Accordion>
  <Accordion title="常见警告代码">
    - `ssh_tunnel_failed`: SSH 隧道设置失败；该命令已回退到直接探测。
    - `multiple_gateways`: 有多个目标可达；除非您有意运行隔离的配置文件（例如救援机器人），否则这通常是不正常的。
    - `auth_secretref_unresolved`: 无法为失败的目标解析配置的身份验证 SecretRef。
    - `probe_scope_limited`: WebSocket 连接成功，但读取探测因缺少 `operator.read` 而受限。
  </Accordion>
</AccordionGroup>

#### 通过 SSH 远程（Mac 应用同等功能）

macOS 应用的“通过 SSH 远程”模式使用本地端口转发，以便远程网关（可能仅绑定到环回地址）可在 `ws://127.0.0.1:<port>` 访问。

CLI 等效项：

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` 或 `user@host:port`（端口默认为 `22`）。
</ParamField>
<ParamField path="--ssh-identity <path>" type="string">
  身份文件。
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  从解析的发现端点（`local.` 加上配置的广域域（如果有））中选择第一个发现的网关主机作为 SSH 目标。仅 TXT 的提示将被忽略。
</ParamField>

配置（可选，用作默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

低级 RPC 辅助工具。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

<ParamField path="--params <json>" type="string" default="{}">
  参数的 JSON 对象字符串。
</ParamField>
<ParamField path="--url <url>" type="string">
  Gateway(网关) WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  Gateway(网关) 令牌。
</ParamField>
<ParamField path="--password <password>" type="string">
  Gateway(网关) 密码。
</ParamField>
<ParamField path="--timeout <ms>" type="number">
  超时预算。
</ParamField>
<ParamField path="--expect-final" type="boolean">
  主要用于在最终负载之前流式传输中间事件的代理式 RPC。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的 JSON 输出。
</ParamField>

<Note>`--params` 必须是有效的 JSON。</Note>

## 管理 Gateway(网关) 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

### 使用包装器安装

当托管服务必须通过另一个可执行文件启动时，请使用 `--wrapper`，例如密钥管理器填充程序或以特定用户身份运行的助手。包装器接收正常的 Gateway(网关) 参数，并负责最终执行 `openclaw` 或带有这些参数的 Node。

```bash
cat > ~/.local/bin/openclaw-doppler <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec doppler run --project my-project --config production -- openclaw "$@"
EOF
chmod +x ~/.local/bin/openclaw-doppler

openclaw gateway install --wrapper ~/.local/bin/openclaw-doppler --force
openclaw gateway restart
```

您也可以通过环境设置包装器。`gateway install` 会验证该路径是否为可执行文件，将包装器写入服务 `ProgramArguments`，并将 `OPENCLAW_WRAPPER` 持久化保存在服务环境中，以便稍后进行强制重新安装、更新和诊断修复。

```bash
OPENCLAW_WRAPPER="$HOME/.local/bin/openclaw-doppler" openclaw gateway install --force
openclaw doctor
```

要移除持久化的包装器，请在重新安装时清除 `OPENCLAW_WRAPPER`：

```bash
OPENCLAW_WRAPPER= openclaw gateway install --force
openclaw gateway restart
```

<AccordionGroup>
  <Accordion title="命令选项">
    - `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
    - `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`
    - `gateway uninstall|start|stop|restart`: `--json`
  </Accordion>
  <Accordion title="生命周期行为">
    - 使用 `gateway restart` 重启托管服务。不要将 `gateway stop` 和 `gateway start` 串联作为重启的替代方法；在 macOS 上，`gateway stop` 会在停止之前有意禁用 LaunchAgent。
    - 生命周期命令接受 `--json` 用于脚本编写。
  </Accordion>
  <Accordion title="安装时的身份验证和 SecretRef">
    - 当令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证 SecretRef 是否可解析，但不会将解析出的令牌持久化到服务环境元数据中。
    - 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，安装将以失败告终，而不是回退持久化明文。
    - 对于 `gateway run` 上的密码身份验证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支持的 `gateway.auth.password`，而非内联的 `--password`。
    - 在推断身份验证模式下，仅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装令牌要求；安装托管服务时，请使用持久化配置（`gateway.auth.password` 或配置 `env`）。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则安装将被阻止，直到显式设置模式。
  </Accordion>
</AccordionGroup>

## 发现 Gateway (Bonjour)

`gateway discover` 扫描 Gateway(网关) 信标 (`_openclaw-gw._tcp`)。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD (广域 Bonjour)：选择一个域（例如：`openclaw.internal.`）并设置拆分 DNS 和 DNS 服务器；请参阅 [Bonjour](/zh/gateway/bonjour)。

只有启用了 Bonjour 发现功能（默认）的 Gateway 才会通告信标。

广域发现记录包括 (TXT)：

- `role` (Gateway 角色提示)
- `transport` (传输提示，例如 `gateway`)
- `gatewayPort` (WebSocket 端口，通常为 `18789`)
- `sshPort` (可选；当其缺失时，客户端默认将 SSH 目标设为 `22`)
- `tailnetDns` (MagicDNS 主机名，如果可用)
- `gatewayTls` / `gatewayTlsSha256` (启用 TLS + 证书指纹)
- `cliPath` （远程安装提示已写入广域区域）

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  每个命令的超时时间（浏览/解析）。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的输出（同时禁用样式/加载动画）。
</ParamField>

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>- CLI 会扫描 `local.` 以及已配置的广域域名（如果已启用）。 - JSON 输出中的 `wsUrl` 源自解析后的服务端点，而非来自仅 TXT 的提示（如 `lanHost` 或 `tailnetDns`）。 - 在 `local.` mDNS 上，仅当 `discovery.mdns.mode` 为 `full` 时才会广播 `sshPort` 和 `cliPath`。广域 DNS-SD 仍会写入 `cliPath`；在那里 `sshPort` 也保持可选。</Note>

## 相关

- [CLI 参考](/zh/cli)
- [Gateway(网关) 运维手册](/zh/gateway)
