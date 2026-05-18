---
summary: "OpenClawGateway(网关)CLIOpenClaw Gateway(网关) CLI (`openclaw gateway`) — 运行、查询和发现网关"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "Gateway(网关)Gateway(网关)"
sidebarTitle: "Gateway(网关)Gateway(网关)"
---

Gateway(网关) 是 OpenClaw 的 WebSocket 服务器（通道、节点、会话、钩子）。本页面中的子命令位于 Gateway(网关)OpenClaw`openclaw gateway …` 下。

<CardGroup cols={3}>
  <Card title="BonjourBonjour discovery" href="/zh/gateway/bonjour">
    本地 mDNS + 广域 DNS-SD 设置。
  </Card>
  <Card title="设备发现 overview" href="/zh/gateway/discovery" OpenClaw>
    OpenClaw 如何通告和查找网关。
  </Card>
  <Card title="Configuration" href="/zh/gateway/configuration">
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
  <Accordion title="Startup behavior"Gateway(网关)>
    - 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则 Gateway(网关) 将拒绝启动。对于临时/开发运行，请使用 `--allow-unconfigured`。
    - `openclaw onboard --mode local` 和 `openclaw setup` 预期会写入 `gateway.mode=local`。如果文件存在但缺少 `gateway.mode`，请将其视为损坏或被破坏的配置并进行修复，而不是隐式地假定处于本地模式。
    - 如果文件存在且缺少 `gateway.mode`Gateway(网关)，Gateway(网关) 会将其视为可疑的配置损坏，并拒绝为您“猜测本地”模式。
    - 未经身份验证而绑定到环回地址之外的操作会被阻止（安全防护）。
    - `SIGUSR1` 在获得授权时会触发进程内重启（`commands.restart` 默认启用；设置 `commands.restart: false` 以阻止手动重启，但仍允许 gateway 工具/config apply/update 操作）。
    - `SIGINT`/`SIGTERM`CLITUI 处理程序会停止 Gateway(网关) 进程，但它们不会恢复任何自定义终端状态。如果您使用 TUI 或原始模式输入包装了 CLI，请在退出前恢复终端状态。

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
  身份验证模式覆盖。
</ParamField>
<ParamField path="--token <token>" type="string">
  令牌覆盖（同时为该进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
</ParamField>
<ParamField path="--password <password>" type="string">
  密码覆盖。
</ParamField>
<ParamField path="--password-file <path>" type="string">
  从文件读取 Gateway 密码。
</ParamField>
<ParamField path="--tailscale <off|serve|funnel>" type="string"Gateway(网关)Tailscale>
  通过 Tailscale 暴露 Gateway。
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean"Tailscale>
  关闭时重置 Tailscale serve/funnel 配置。
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  允许在没有配置中的 `gateway.mode=local` 的情况下启动 Gateway。仅绕过临时/开发引导的启动保护；不会写入或修复配置文件。
</ParamField>
<ParamField path="--dev" type="boolean">
  如果缺失则创建开发配置 + 工作区（跳过 BOOTSTRAP.md）。
</ParamField>
<ParamField path="--reset" type="boolean">
  重置开发配置 + 凭证 + 会话 + 工作区（需要 `--dev`）。
</ParamField>
<ParamField path="--force" type="boolean">
  在启动之前终止选定端口上的任何现有监听器。
</ParamField>
<ParamField path="--verbose" type="boolean">
  详细日志。
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean"CLI>
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

## 重启 Gateway(网关)

```bash
openclaw gateway restart
openclaw gateway restart --safe
openclaw gateway restart --safe --skip-deferral
openclaw gateway restart --force
```

`openclaw gateway restart --safe`Gateway(网关)OpenClawGateway(网关) 请求正在运行的 Gateway(网关) 在重启之前对活动的 OpenClaw 工作进行预检。如果存在排队的操作、回复传递、嵌入式运行或任务运行，Gateway(网关) 会报告阻碍因素，合并重复的安全重启请求，并在活动工作耗尽后重启。普通的 `restart` 为了兼容性保留了现有的服务管理器行为。仅当您明确想要立即覆盖路径时才使用 `--force`。

`openclaw gateway restart --safe --skip-deferral`OpenClaw 运行与 `--safe`Gateway(网关) 相同的感知 OpenClaw 的协调重启，但绕过活动工作延迟门，因此即使报告了阻碍因素，Gateway(网关) 也会立即发出重启信号。当延迟被卡住的任务运行固定，且仅靠 `--safe` 会无限期等待时，请将其用作操作员的逃生舱口。`--skip-deferral` 需要 `--safe`。

<Warning>内联 `--password` 可能会暴露在本地进程列表中。请优先使用 `--password-file`、env 或 SecretRef 支持的 `gateway.auth.password`。</Warning>

### Gateway(网关) 性能分析

- 设置 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`Gateway(网关) 以在 Gateway(网关) 启动期间记录阶段计时，包括每个阶段的 `eventLoopMax` 延迟以及用于 installed-index、清单注册表、启动规划和 owner-map 工作的插件查找表计时。
- 设置 `OPENCLAW_GATEWAY_RESTART_TRACE=1` 以记录与重启范围相关的 `restart trace:` 行，涵盖重启信号处理、活跃工作排空、关闭阶段、下次启动、就绪时间以及内存指标。
- 设置 `OPENCLAW_DIAGNOSTICS=timeline` 并附带 `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=<path>`，以写入尽力而为的 JSONL 启动诊断时间线，供外部 QA 程序使用。您也可以在配置中通过 `diagnostics.flags: ["timeline"]` 启用该标志；路径仍由环境变量提供。添加 `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` 以包含事件循环采样。
- 运行 `pnpm test:startup:gateway -- --runs 5 --warmup 1`Gateway(网关) 以对 Gateway(网关) 启动进行基准测试。该基准测试记录首次进程输出、`/healthz`、`/readyz`、启动跟踪计时、事件循环延迟以及插件查找表计时详细信息。

## 查询正在运行的 Gateway(网关)

所有查询命令均使用 WebSocket RPC。

<Tabs>
  <Tab title="输出模式">
    - 默认：人类可读（TTY 中彩色显示）。
    - `--json`：机器可读的 JSON（无样式/旋转图标）。
    - `--no-color`（或 `NO_COLOR=1`）：在保留人类可读布局的同时禁用 ANSI。

  </Tab>
  <Tab title="共享选项">
    - `--url <url>`Gateway(网关)：Gateway(网关) WebSocket URL。
    - `--token <token>`Gateway(网关)：Gateway(网关) 令牌。
    - `--password <password>`Gateway(网关)：Gateway(网关) 密码。
    - `--timeout <ms>`：超时/预算（因命令而异）。
    - `--expect-final`：等待“最终”响应（代理调用）。

  </Tab>
</Tabs>

<Note>当您设置 `--url`CLI 时，CLI 不会回退到配置或环境凭据。请显式传递 `--token` 或 `--password`。缺少显式凭据将被视为错误。</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

HTTP `/healthz` 端点是一个存活探针：一旦服务器能够响应 HTTP，它就会返回。HTTP `/readyz` 端点更为严格，在启动插件 sidecar、通道或配置的 hook 尚在 settling 时，它将保持红色（未就绪）。本地或已认证的详细就绪响应包含一个 `eventLoop` 诊断块，其中包括事件循环延迟、事件循环利用率、CPU 核心比率以及一个 `degraded` 标志。

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

从运行中的 Gateway(网关) 获取最近的诊断稳定性记录器。

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
  仅包含特定诊断序列号之后的事件。
</ParamField>
<ParamField path="--bundle [path]" type="string">
  读取持久化的稳定性包，而不是调用正在运行的 Gateway(网关)。使用 `--bundle latest`（或者直接用 `--bundle`）来获取状态目录下的最新包，或者直接传递包 JSON 的路径。
</ParamField>
<ParamField path="--export" type="boolean">
  写入可共享的支持诊断 zip 文件，而不是打印稳定性详细信息。
</ParamField>
<ParamField path="--output <path>" type="string">
  `--export` 的输出路径。
</ParamField>

<AccordionGroup>
  <Accordion title="隐私和打包行为">
    - 记录保存操作元数据：事件名称、计数、字节大小、内存读数、队列/会话状态、渠道/插件名称以及编辑过的会话摘要。它们不保存聊天文本、webhook 主体、工具输出、原始请求或响应主体、令牌、cookies、机密值、主机名或原始会话 ID。设置 `diagnostics.enabled: false`Gateway(网关)OpenClaw 以完全禁用记录器。
    - 在 Gateway 严重退出、关闭超时和重启启动失败时，如果记录器有事件，OpenClaw 会将相同的诊断快照写入 `~/.openclaw/logs/stability/openclaw-stability-*.json`。使用 `openclaw gateway stability --bundle latest` 检查最新的包；`--limit`、`--type` 和 `--since-seq` 也适用于包输出。

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

写入一个专为附加到错误报告而设计的本地诊断 zip 文件。有关隐私模型和包内容，请参阅 [Diagnostics Export](/zh/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  输出 zip 路径。默认为状态目录下的支持导出。
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  要包含的最大已清理日志行数。
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  要检查的最大日志字节数。
</ParamField>
<ParamField path="--url <url>" type="string">
  用于运行状况快照的 Gateway(网关) WebSocket URL。
</ParamField>
<ParamField path="--token <token>" type="string">
  用于运行状况快照的 Gateway(网关) 令牌。
</ParamField>
<ParamField path="--password <password>" type="string">
  用于运行状况快照的 Gateway(网关) 密码。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  状态/运行状况快照超时时间。
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  跳过持久化的稳定性包查找。
</ParamField>
<ParamField path="--json" type="boolean">
  以 JSON 格式打印写入的路径、大小和清单。
</ParamField>

该导出包含清单、Markdown 摘要、配置形状、已清理的配置详细信息、已清理的日志摘要、已清理的 Gateway(网关) 状态/运行状况快照，以及最新的稳定性包（如果存在）。

该导出旨在共享。它保留了有助于调试的操作详细信息，例如安全的 OpenClaw 日志字段、子系统名称、状态代码、持续时间、配置模式、端口、插件 ID、提供商 ID、非机密功能设置以及已编辑的操作日志消息。它会省略或编辑聊天文本、Webhook 主体、工具输出、凭据、Cookie、帐户/消息标识符、提示/指令文本、主机名和机密值。当 LogTape 风格的消息看起来像用户/聊天/工具负载文本时，导出仅保留一条关于消息被省略的说明及其字节计数。

### `gateway status`

`gateway status` 显示 Gateway(网关) 服务（launchd/systemd/schtasks）以及可选的连接/身份验证能力探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  添加明确的探测目标。配置的远程 + localhost 仍会被探测。
</ParamField>
<ParamField path="--token <token>" type="string">
  探测的 Token 身份验证。
</ParamField>
<ParamField path="--password <password>" type="string">
  探测的密码身份验证。
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  探测超时。
</ParamField>
<ParamField path="--no-probe" type="boolean">
  跳过连接探测（仅限服务视图）。
</ParamField>
<ParamField path="--deep" type="boolean">
  同时扫描系统级服务。
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  将默认的连接探测升级为读取探测，并在读取探测失败时返回非零退出码。不能与 `--no-probe` 结合使用。
</ParamField>

<AccordionGroup>
  <Accordion title="状态语义">
    - 即使本地 CLI 配置缺失或无效，`gateway status` 仍可用于诊断。
    - 默认 `gateway status` 证明服务状态、WebSocket 连接以及握手时可见的身份验证功能。它不证明读/写/管理操作。
    - 诊断探测对于首次设备身份验证是非变更的：如果存在现有的缓存设备令牌，它们会重用该令牌，但它们不会仅为了检查状态而创建新的 CLI 设备身份或只读设备配对记录。
    - `gateway status` 在可能的情况下解析为探测身份验证配置的身份验证 SecretRefs。
    - 如果在此命令路径中所需的身份验证 SecretRef 未解析，则当探测连接/身份验证失败时，`gateway status --json` 会报告 `rpc.authWarning`；请显式传递 `--token`/`--password` 或先解析秘密源。
    - 如果探测成功，将抑制未解析的 auth-ref 警告以避免误报。
    - 当监听服务不足且您需要读范围 RPC 调用也健康时，请在脚本和自动化中使用 `--require-rpc`。
    - `--deep` 添加了针对额外的 launchd/systemd/schtasks 安装的最佳尝试扫描。当检测到多个类网关服务时，人工输出会打印清理提示并警告大多数设置应在每台机器上运行一个网关。
    - `--deep` 还会在服务进程因外部主管重启而干净退出时报告最近的 Gateway(网关) 主管重启交接。
    - `--deep` 在插件感知模式（`pluginValidation: "full"`）下运行配置验证，并显示配置的插件清单警告（例如缺少渠道配置元数据），以便安装和更新冒烟测试能捕获它们。默认 `gateway status` 保持跳过插件验证的快速只读路径。
    - 人工输出包括解析的文件日志路径以及 CLI 与服务的配置路径/有效性快照，以帮助诊断配置文件或状态目录漂移。

  </Accordion>
  <Accordion title="LinuxLinux systemd auth-drift checks"Linux>
    - 在 Linux systemd 安装中，服务 auth drift 检查会从单元读取 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、带引号的路径、多个文件以及可选的 `-` 文件）。
    - Drift 检查使用合并的运行时环境（优先使用服务命令环境，然后回退到进程环境）来解析 `gateway.auth.token` SecretRefs。
    - 如果令牌认证未有效激活（显式 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或模式未设置且密码可能获胜而无令牌候选者可能获胜），令牌漂移检查将跳过配置令牌解析。

  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` 是“调试所有内容”的命令。它始终探测：

- 您配置的远程网关（如果已设置），以及
- localhost（环回地址）**即使配置了远程网关**。

如果您传递 `--url`，该显式目标将添加在两者之前。人工输出将这些目标标记为：

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
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 报告了探测关于身份验证可以证明的内容。这与可达性是分开的。
    - `Read probe: ok`RPC 表示读取范围详细信息 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
    - `Read probe: limited - missing scope: operator.read`RPC 表示连接成功但读取范围的 RPC 受到限制。这被报告为 **degraded**（降级）的可达性，而不是完全失败。
    - `Read probe: failed` 在 `Connect: ok`Gateway(网关)Gateway(网关) 之后，表示 Gateway（网关）接受了 WebSocket 连接，但后续读取诊断超时或失败。这也是 **degraded**（降级）的可达性，而不是无法访问的 Gateway（网关）。
    - 与 `gateway status` 类似，探测重用现有的缓存设备身份验证，但不会创建首次设备身份或配对状态。
    - 仅当没有探测到的目标可达时，退出代码才为非零。

  </Accordion>
  <Accordion title="JSON 输出">
    顶层：

    - `ok`：至少有一个目标可达。
    - `degraded`RPC：至少有一个目标接受了连接，但未完成完整的 RPC 诊断。
    - `capability`：在可达目标中看到的最佳能力（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`：按此顺序视为活动获胜者的最佳目标：显式 URL、SSH 隧道、配置的远程地址，然后是 local loopback。
    - `warnings[]`：尽力的警告记录，包含 `code`、`message` 和可选的 `targetIds`。
    - `network`：根据当前配置和主机网络派生的 local loopback/tailnet URL 提示。
    - `discovery.timeoutMs` 和 `discovery.count`：此探测过程中实际使用的发现预算/结果计数。

    每个目标（`targets[].connect`）：

    - `ok`：连接后的可达性 + 降级分类。
    - `rpcOk`RPC：完整的 RPC 诊断成功。
    - `scopeLimited`RPC：由于缺少操作员作用域，RPC 诊断失败。

    每个目标（`targets[].auth`）：

    - `role`：在 `hello-ok` 中报告的身份验证角色（如果可用）。
    - `scopes`：在 `hello-ok` 中报告的已授予作用域（如果可用）。
    - `capability`：该目标显示的身份验证能力分类。

  </Accordion>
  <Accordion title="Common warning codes">
    - `ssh_tunnel_failed`：SSH 隧道设置失败；命令回退到直接探测。
    - `multiple_gateways`：有多个目标可达；除非您有意运行隔离的配置文件（例如救援机器人），否则这不寻常。
    - `auth_secretref_unresolved`：无法为失败的目标解析配置的身份验证 SecretRef。
    - `probe_scope_limited`：WebSocket 连接成功，但读取探测因缺少 `operator.read` 而受限。

  </Accordion>
</AccordionGroup>

#### 通过 SSH 远程连接（Mac 应用同等功能）

macOS 应用“通过 SSH 远程连接”模式使用本地端口转发，因此远程网关（可能仅绑定到环回地址）可以在 macOS`ws://127.0.0.1:<port>` 访问。

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
  从解析的发现端点（`local.` 加上配置的广域域（如果有））中选择第一个发现的网关主机作为 SSH 目标。仅限 TXT 的提示将被忽略。
</ParamField>

配置（可选，用作默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

底层 RPC 辅助工具。

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
  主要用于在最终有效负载之前流式传输中间事件的代理式 RPC。
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

当托管服务必须通过另一个可执行文件（例如机密管理器 shims 或 run-as 辅助程序）启动时，请使用 `--wrapper`。包装器接收正常的 Gateway(网关) 参数，并负责最终使用这些参数 exec `openclaw` 或 Node。

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

您也可以通过环境设置包装器。`gateway install` 会验证该路径是否为可执行文件，将包装器写入服务 `ProgramArguments`，并将 `OPENCLAW_WRAPPER` 持久化在服务环境中，以便稍后进行强制重新安装、更新和 doctor 修复。

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
    - `gateway restart`: `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`
    - `gateway uninstall|start`: `--json`
    - `gateway stop`: `--disable`, `--json`

  </Accordion>
  <Accordion title="Lifecycle behavior">
    - 使用 `gateway restart` 重启托管服务。不要将 `gateway stop` 和 `gateway start` 链接在一起作为重启的替代方案。
    - 在 macOS 上，`gateway stop` 默认使用 `launchctl bootout`，这会从当前启动会话中移除 LaunchAgent 而不持久化禁用状态——KeepAlive 自动恢复在未来的崩溃中保持活动，并且 `gateway start` 可以在没有手动 `launchctl enable` 的情况下干净地重新启用。传递 `--disable` 以持久化抑制 KeepAlive 和 RunAtLoad，这样网关在下次显式 `gateway start` 之前不会重生；当手动停止应该在重启或系统重启后保持有效时使用此选项。
    - `gateway restart --safe` 要求正在运行的 Gateway(网关) 对活跃的 OpenClaw 工作进行预检，并推迟重启直到回复交付、嵌入式运行和任务运行耗尽。`--safe` 不能与 `--force` 或 `--wait` 组合使用。
    - `gateway restart --wait 30s` 覆盖该次重启配置的重启排空预算。纯数字表示毫秒；接受诸如 `s`、`m` 和 `h` 之类的单位。`--wait 0` 表示无限期等待。
    - `gateway restart --safe --skip-deferral` 运行 OpenClaw 感知的安全重启，但绕过推迟门控，因此即使报告了阻止程序，Gateway(网关) 也会立即发出重启信号。这是用于卡住的任务运行推迟的操作员逃生舱门；需要 `--safe`。
    - `gateway restart --force` 跳过活跃工作排空并立即重启。当操作员已经检查了列出的任务阻止程序并希望立即恢复网关时使用它。
    - 生命周期命令接受 `--json` 用于脚本编写。

  </Accordion>
  <Accordion title="安装时的身份验证和 SecretRefs">
    - 当令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证 SecretRef 是否可解析，但不会将解析出的令牌持久化到服务环境元数据中。
    - 如果令牌身份验证需要令牌但配置的令牌 SecretRef 无法解析，安装将以失败关闭（fail closed）的方式处理，而不是持久化回退明文。
    - 对于 `gateway run` 上的密码身份验证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支持的 `gateway.auth.password`，而不是内联 `--password`。
    - 在推断身份验证模式下，仅限 Shell 的 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装令牌要求；在安装托管服务时，请使用持久化配置（`gateway.auth.password` 或配置 `env`）。
    - 如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置但 `gateway.auth.mode` 未设置，则在显式设置模式之前，安装将被阻止。

  </Accordion>
</AccordionGroup>

## 发现 Gateway（Bonjour）

`gateway discover` 扫描 Gateway(网关) 信标（`_openclaw-gw._tcp`）。

- 多播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（例如：`openclaw.internal.`）并设置拆分 DNS + DNS 服务器；请参阅 [Bonjour](/zh/gateway/bonjour)。

只有启用了 Bonjour 发现（默认）的 Gateway 才会广播信标。

广域发现记录可以包含以下 TXT 提示：

- `role`（Gateway 角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（仅限完整发现模式；当其不存在时，客户端默认将 SSH 目标设为 `22`）
- `tailnetDns` (MagicDNS 主机名，如果可用)
- `gatewayTls` / `gatewayTlsSha256` (已启用 TLS + 证书指纹)
- `cliPath` (仅限完整发现模式)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  每个命令的超时时间 (浏览/解析)。
</ParamField>
<ParamField path="--json" type="boolean">
  机器可读的输出（同时禁用样式和加载动画）。
</ParamField>

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
- CLI 会扫描 `local.` 以及已配置的广域网域名（如果已启用）。
- JSON 输出中的 `wsUrl` 派生自已解析的服务端点，而非源自 `lanHost` 或 `tailnetDns` 等仅 TXT 提示。
- 在 `local.` mDNS 和广域网 DNS-SD 上，仅当 `discovery.mdns.mode` 为 `full` 时，才会发布 `sshPort` 和 `cliPath`。

</Note>

## 相关

- [CLI 参考](/zh/cli)
- [Gateway(网关) 运维手册](/zh/gateway)
