---
summary: "Gateway(网关) 服务的操作手册、生命周期和运维"
read_when:
  - Running or debugging the gateway process
title: "Gateway(网关) 操作手册"
---

# Gateway(网关) 网关 运行手册

使用此页面进行 Gateway(网关) 网关 服务的第 1 天启动和第 2 天运维。

<CardGroup cols={2}>
  <Card title="Deep 故障排除" icon="siren" href="/zh/gateway/troubleshooting">
    针对症状的诊断，提供确切的命令阶梯和日志特征。
  </Card>
  <Card title="Configuration" icon="sliders" href="/zh/gateway/configuration">
    面向任务的设置指南 + 完整配置参考。
  </Card>
  <Card title="Secrets management" icon="key-round" href="/zh/gateway/secrets">
    SecretRef 协定、运行时快照行为以及迁移/重载操作。
  </Card>
  <Card title="Secrets plan contract" icon="shield-check" href="/zh/gateway/secrets-plan-contract">
    精确的 `secrets apply` 目标/路径规则以及仅引用身份配置文件行为。
  </Card>
</CardGroup>

## 5 分钟本地启动

<Steps>
  <Step title="Start the Gateway">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="Verify service health">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基准：`Runtime: running` 和 `RPC probe: ok`。

  </Step>

  <Step title="Validate 渠道 readiness">

```bash
openclaw channels status --probe
```

如果网关可达，这将运行针对每个账户的实时渠道探测和可选审计。
如果网关不可达，CLI 将回退到仅配置的渠道摘要，
而不是实时探测输出。

  </Step>
</Steps>

<Note>Gateway(网关) 配置重载会监视活动配置文件路径（从配置文件/状态默认值解析，或在设置时从 `OPENCLAW_CONFIG_PATH` 解析）。 默认模式为 `gateway.reload.mode="hybrid"`。 在首次成功加载后，运行进程将提供活动内存内配置快照；成功的重载将以原子方式交换该快照。</Note>

## 运行时模型

- 一个常驻进程用于路由、控制平面和渠道连接。
- 单一多路复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 兼容 (`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`)
  - 控制 UI 和钩子
- 默认绑定模式：`loopback`。
- 默认情况下需要身份验证。共享密钥设置使用
  `gateway.auth.token` / `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），非环回
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
- 许多 RAG 和内存流水线期望使用 `/v1/embeddings`。
- Agent 原生客户端越来越倾向于使用 `/v1/responses`。

规划说明：

- `/v1/models` 是 Agent 优先的：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是一个稳定的别名，始终映射到配置的默认 Agent。
- 当您想要后端提供商/模型覆盖时，请使用 `x-openclaw-model`；否则所选 Agent 的正常模型和嵌入设置将保持控制状态。

所有这些都在主 Gateway(网关) 端口上运行，并使用与 Gateway(网关) HTTP API 其余部分相同的可信操作员身份验证边界。

### 端口和绑定优先级

| 设置               | 解析顺序                                                      |
| ------------------ | ------------------------------------------------------------- |
| Gateway(网关) 端口 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 绑定模式           | CLI/覆盖 → `gateway.bind` → `loopback`                        |

### 热加载模式

| `gateway.reload.mode` | 行为                     |
| --------------------- | ------------------------ |
| `off`                 | 无配置重载               |
| `hot`                 | 仅应用热安全更改         |
| `restart`             | 需要重新加载时更改时重启 |
| `hybrid`（默认）      | 安全时热应用，需要时重启 |

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

`gateway status --deep` 用于额外的服务发现（LaunchDaemons/systemd 系统
单元/schtasks），而非更深入的 RPC 运行状况探测。

## 多个网关（同一主机）

大多数安装应在每台计算机上运行一个网关。单个网关可以托管多个
Agent 和通道。

仅当您有意想要隔离或救援机器人时，才需要多个网关。

有用的检查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

预期情况：

- `gateway status --deep` 可以报告 `Other gateway-like services detected (best effort)`
  并在存在过时的 launchd/systemd/schtasks 安装时打印清理提示。
- 当多个目标响应时，`gateway probe` 可以针对 `multiple reachable gateways` 发出警告。
- 如果是有意为之，请为每个 Gateway 隔离端口、配置/状态和工作区根目录。

详细设置：[/gateway/multiple-gateways](/zh/gateway/multiple-gateways)。

## 远程访问

首选：Tailscale/VPN。
备选：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然后在本地将客户端连接到 `ws://127.0.0.1:18789`。

<Warning>SSH 隧道不会绕过 Gateway 认证。对于共享密钥认证，客户端即使通过隧道，也必须发送 `token`/`password`。对于基于身份的模式，请求仍必须满足该认证路径。</Warning>

请参阅：[Remote Gateway(网关)](/zh/gateway/remote)、[Authentication](/zh/gateway/authentication)、[Tailscale](/zh/gateway/tailscale)。

## 监管与服务生命周期

使用受监管的运行方式以获得类似生产环境的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 标签为 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名配置文件）。`openclaw doctor` 会审核并修复服务配置漂移。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

为了在注销后保持持久性，请启用 lingering：

```bash
sudo loginctl enable-linger <user>
```

当您需要自定义安装路径时的手动用户单元示例：

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

原生 Windows 托管启动使用名为 `OpenClaw Gateway`
的计划任务（对于命名配置文件则为 `OpenClaw Gateway (<profile>)`）。如果计划任务创建被拒绝，OpenClaw 将回退到指向状态目录中 `gateway.cmd` 的每用户启动文件夹启动器。

  </Tab>

  <Tab title="Linux (系统服务)">

针对多用户/永久在线主机使用系统单元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

使用与用户单元相同的服务主体，但将其安装在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 下，如果您的 `openclaw` 二进制文件位于其他位置，请调整
`ExecStart=`。

  </Tab>
</Tabs>

## 单主机上的多个网关

大多数设置应运行 **一个** Gateway(网关)。
仅在需要严格隔离/冗余（例如救援配置文件）时使用多个。

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

参见：[多个网关](/zh/gateway/multiple-gateways)。

### 开发配置文件快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认值包括隔离的状态/配置和基本网关端口 `19001`。

## 协议快速参考（操作员视图）

- 第一个客户端帧必须是 `connect`。
- Gateway(网关) 返回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、限制/策略）。
- `hello-ok.features.methods` / `events` 是一个保守的发现列表，而不是
  每个可调用辅助路由的生成转储。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.tool`、`sessions.changed`、`presence`、`tick`、
  `health`、`heartbeat`、配对/批准生命周期事件以及 `shutdown`。

代理运行分为两个阶段：

1. 立即接受的确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），其间包含流式 `agent` 事件。

查看完整的协议文档：[Gateway(网关) 协议](/zh/gateway/protocol)。

## 操作检查

### 存活探测

- 打开 WS 并发送 `connect`。
- 期望收到带有快照的 `hello-ok` 响应。

### 就绪探测

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 间隙恢复

事件不会重放。在出现序列间隙时，继续操作前请刷新状态 (`health`, `system-presence`)。

## 常见故障特征

| 特征                                                           | 可能的问题                                           |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回环绑定且没有有效的网关认证路径                   |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                                             |
| `Gateway start blocked: set gateway.mode=local`                | 配置设置为远程模式，或者损坏的配置中缺少本地模式标记 |
| 连接期间出现 `unauthorized`                                    | 客户端和网关之间的认证不匹配                         |

如需完整的诊断流程，请使用 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)。

## 安全保证

- 当 Gateway(网关) 不可用时，Gateway(网关) 协议客户端会快速失败（没有隐式的直接渠道回退）。
- 无效的或非连接的首帧会被拒绝并关闭连接。
- 优雅关闭会在 socket 关闭之前发出 `shutdown` 事件。

---

相关：

- [故障排除](/zh/gateway/troubleshooting)
- [后台进程](/zh/gateway/background-process)
- [配置](/zh/gateway/configuration)
- [健康检查](/zh/gateway/health)
- [诊断工具](/zh/gateway/doctor)
- [认证](/zh/gateway/authentication)
