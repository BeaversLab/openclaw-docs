---
summary: "Gateway(网关)服务的操作手册、生命周期和运维"
read_when:
  - Running or debugging the gateway process
title: "Gateway(网关) 运行手册"
---

使用此页面进行 Gateway(网关) 服务的第 1 天启动和第 2 天运维。

<CardGroup cols={2}>
  <Card title="深度故障排除" icon="siren" href="/zh/gateway/troubleshooting">
    基于症状的诊断，提供确切的命令阶梯和日志签名。
  </Card>
  <Card title="配置" icon="sliders" href="/zh/gateway/configuration">
    面向任务的设置指南 + 完整配置参考。
  </Card>
  <Card title="密钥管理" icon="key-round" href="/zh/gateway/secrets">
    SecretRef 协定、运行时快照行为以及迁移/重载操作。
  </Card>
  <Card title="密钥计划协定" icon="shield-check" href="/zh/gateway/secrets-plan-contract">
    精确的 `secrets apply` 目标/路径规则以及仅引用的授权配置文件行为。
  </Card>
</CardGroup>

## 5 分钟本地启动

<Steps>
  <Step title="启动 Gateway">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="验证服务健康度">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基线：`Runtime: running`、`Connectivity probe: ok` 和符合您预期的 `Capability: ...`。当您需要读取范围的 RPC 证明而不仅仅是连接可达性时，请使用 `openclaw gateway status --require-rpc`。

  </Step>

  <Step title="验证渠道就绪情况">

```bash
openclaw channels status --probe
```

如果 gateway 可达，这将运行针对每个账户的实时渠道探测和可选审计。
如果 gateway 不可达，CLI 将回退到仅基于配置的渠道摘要，而不是实时探测输出。

  </Step>
</Steps>

<Note>Gateway 配置重新加载会监视活动配置文件路径（从配置文件/状态默认值解析，或在设置时从 `OPENCLAW_CONFIG_PATH` 解析）。 默认模式为 `gateway.reload.mode="hybrid"`。 在首次成功加载后，运行中的进程将提供活动内存配置快照；成功的重新加载将以原子方式交换该快照。</Note>

## 运行时模型

- 一个常驻进程用于路由、控制平面和渠道连接。
- 单一多路复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 兼容（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - 控制 UI 和钩子
- 默认绑定模式：`loopback`。
- 默认情况下需要身份验证。共享密钥设置使用
  `gateway.auth.token` / `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），而非环回
  反向代理设置可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 兼容端点

OpenClaw 目前最高杠杆的兼容性接口是：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

为什么这一组很重要：

- 大多数 Open WebUI、LobeChat 和 LibreChat 集成首先探测 `/v1/models`。
- 许多 RAG 和内存管道期望 `/v1/embeddings`。
- 原生代理客户端越来越倾向于 `/v1/responses`。

规划说明：

- `/v1/models` 以代理为先：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是一个稳定的别名，始终映射到配置的默认代理。
- 当您想要后端提供商/模型覆盖时，请使用 `x-openclaw-model`；否则，所选代理的常规模型和嵌入设置将保持控制。

所有这些都在主 Gateway(网关) 端口上运行，并使用与 Gateway(网关) HTTP API 其余部分相同的可信操作员身份验证边界。

### 端口和绑定优先级

| 设置               | 解析顺序                                                      |
| ------------------ | ------------------------------------------------------------- |
| Gateway(网关) 端口 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 绑定模式           | CLI/覆盖 → `gateway.bind` → `loopback`                        |

已安装的 Gateway 服务会在监管程序（supervisor）元数据中记录已解析的 `--port`。更改 `gateway.port` 后，请运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，以便 launchd/systemd/schtasks 在新端口上启动进程。

Gateway 启动时会为非环回绑定设定本地 Control UI 源，此时使用相同的有效端口和绑定。例如，`--bind lan --port 3000` 会在运行时验证运行之前设定 `http://localhost:3000` 和 `http://127.0.0.1:3000`。请将任何远程浏览器源（例如 HTTPS 代理 URL）显式添加到 `gateway.controlUi.allowedOrigins` 中。

### 热重载模式

| `gateway.reload.mode` | 行为                     |
| --------------------- | ------------------------ |
| `off`                 | 不重载配置               |
| `hot`                 | 仅应用热安全更改         |
| `restart`             | 需要重载更改时重启       |
| `hybrid` (默认)       | 安全时热应用，必要时重启 |

## 操作员命令集

```bash
openclaw gateway status
openclaw gateway status --deep   # adds a system-level service scan
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

`gateway status --deep` 用于额外的服务发现（LaunchDaemons/systemd 系统单元/schtasks），而不是更深层的 RPC 健康检查。

## 多个 Gateway（同一主机）

大多数安装应在每台机器上运行一个 Gateway。单个 Gateway 可以承载多个代理和通道。

只有在您有意进行隔离或需要救援机器人时，才需要多个 Gateway。

有用的检查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

预期情况：

- 当存在过时的 launchd/systemd/schtasks 安装时，`gateway status --deep` 可能会报告 `Other gateway-like services detected (best effort)` 并打印清理提示。
- 当有多个目标响应时，`gateway probe` 可能会发出有关 `multiple reachable gateways` 的警告。
- 如果这是有意为之，请为每个 Gateway 隔离端口、配置/状态和工作区根目录。

每个实例的检查清单：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一的 `OPENCLAW_STATE_DIR`
- 唯一的 `agents.defaults.workspace`

示例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

详细设置：[/gateway/multiple-gateways](/zh/gateway/multiple-gateways)。

## VoiceClaw 实时大脑端点

OpenClaw 在 `/voiceclaw/realtime` 暴露了一个与 VoiceClaw 兼容的实时 WebSocket 端点。当 VoiceClaw 桌面客户端需要直接与实时 OpenClaw 大脑通信，而不是通过单独的中继进程时，请使用此端点。

该端点使用 Gemini Live 进行实时音频，并通过将 OpenClaw 工具直接暴露给 Gemini Live 来调用 OpenClaw 作为大脑。工具调用会返回一个即时的 `working` 结果以保持语音会话的响应性，随后 OpenClaw 异步执行实际工具并将结果注入回实时会话。在 gateway 进程环境中设置 `GEMINI_API_KEY`。如果启用了 gateway 认证，桌面客户端需要在其第一条 `session.config` 消息中发送 gateway 令牌或密码。

实时大脑访问运行所有者授权的 OpenClaw 代理命令。请将 `gateway.auth.mode: "none"` 限制为仅限本地回环的测试实例。非本地的实时大脑连接需要 gateway 认证。

对于隔离的测试 gateway，请运行一个单独的实例，该实例拥有自己的端口、配置和状态：

```bash
OPENCLAW_CONFIG_PATH=/path/to/openclaw-realtime/openclaw.json \
OPENCLAW_STATE_DIR=/path/to/openclaw-realtime/state \
OPENCLAW_SKIP_CHANNELS=1 \
GEMINI_API_KEY=... \
openclaw gateway --port 19789
```

然后将 VoiceClaw 配置为使用：

```text
ws://127.0.0.1:19789/voiceclaw/realtime
```

## 远程访问

首选：Tailscale/VPN。
备选：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然后在本地将客户端连接到 `ws://127.0.0.1:18789`。

<Warning>SSH 隧道无法绕过 gateway 认证。对于共享密钥认证，客户端即使通过隧道也必须发送 `token`/`password`。对于承载身份的模式，请求仍必须满足该认证路径。</Warning>

请参阅：[远程 Gateway](/zh/gateway/remote)、[身份验证](/zh/gateway/authentication)、[Tailscale](/zh/gateway/tailscale)。

## 监督与服务生命周期

请使用受监督的运行以获得类生产环境的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

使用 `openclaw gateway restart` 进行重启。不要将 `openclaw gateway stop` 和 `openclaw gateway start` 链式调用；在 macOS 上，`gateway stop` 会在停止之前有意禁用 LaunchAgent。

LaunchAgent 标签为 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名配置文件）。`openclaw doctor` 审计并修复服务配置漂移。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在注销后保持持久性，请启用 lingering：

```bash
sudo loginctl enable-linger <user>
```

当您需要自定义安装路径时的手动 user-unit 示例：

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

  </Tab>

  <Tab title="Windows (native)">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

原生 Windows 托管启动使用名为 `OpenClaw Gateway` 的计划任务
（或针对命名配置文件使用 `OpenClaw Gateway (<profile>)`）。如果拒绝创建
计划任务，OpenClaw 将回退到指向状态目录中
`gateway.cmd` 的每用户启动文件夹启动器。

  </Tab>

  <Tab title="Linux (system service)">

针对多用户/始终在线的主机使用 system unit。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用与 user unit 相同的服务主体，但将其安装在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 下，并在您的 `openclaw` 二进制文件位于
其他位置时调整 `ExecStart=`。

不要同时让 `openclaw doctor --fix` 为同一配置文件/端口安装用户级网关服务。当 Doctor 发现系统级 OpenClaw 网关服务时，它会拒绝该自动安装；当系统 unit 拥有生命周期时，请使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Tab>
</Tabs>

## Dev profile quick path

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认值包括隔离的状态/配置和基础网关端口 `19001`。

## Protocol quick reference (operator view)

- 第一个客户端帧必须是 `connect`。
- Gateway(网关) 返回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、limits/policy）。
- `hello-ok.features.methods` / `events` 是一个保守的发现列表，而不是每个可调用辅助路由的生成转储。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.tool`、`sessions.changed`、`presence`、`tick`、
  `health`、`heartbeat`、配对/审批生命周期事件以及 `shutdown`。

Agent 运行分两个阶段：

1. 立即接受的确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），中间传输 `agent` 事件。

请参阅完整的协议文档：[Gateway(网关) 协议](/zh/gateway/protocol)。

## 运行检查

### 存活检查

- 打开 WS 并发送 `connect`。
- 期望收到带有快照的 `hello-ok` 响应。

### 就绪检查

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 缺口恢复

事件不会重放。遇到序列缺口时，在继续之前刷新状态（`health`、`system-presence`）。

## 常见故障特征

| 特征                                                           | 可能的问题                                             |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| `refusing to bind gateway ... without auth`                    | 没有有效的网关认证路径的非环回绑定                     |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                                               |
| `Gateway start blocked: set gateway.mode=local`                | 配置设置为远程模式，或者本地模式标记从损坏的配置中丢失 |
| 连接期间出现 `unauthorized`                                    | 客户端和网关之间的认证不匹配                           |

如需完整的诊断流程，请使用 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)。

## 安全保证

- 当 Gateway(网关) 不可用时，Gateway 协议客户端会快速失败（没有隐式的直连渠道回退）。
- 无效/非连接的首帧将被拒绝并关闭。
- 优雅关闭会在 socket 关闭之前发出 `shutdown` 事件。

---

相关：

- [故障排除](/zh/gateway/troubleshooting)
- [后台进程](/zh/gateway/background-process)
- [配置](/zh/gateway/configuration)
- [健康检查](/zh/gateway/health)
- [诊断工具](/zh/gateway/doctor)
- [身份验证](/zh/gateway/authentication)

## 相关

- [配置](/zh/gateway/configuration)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)
- [远程访问](/zh/gateway/remote)
- [密钥管理](/zh/gateway/secrets)
