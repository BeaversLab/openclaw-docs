---
summary: "Gateway(网关)Gateway(网关) 服务的运行手册、生命周期和操作"
read_when:
  - Running or debugging the gateway process
title: "Gateway(网关)Gateway(网关) 运行手册"
---

使用此页面进行 Gateway(网关) 服务的第 1 天启动和第 2 天运维。

<CardGroup cols={2}>
  <Card title="深度故障排除" icon="siren" href="/zh/gateway/troubleshooting">
    以症状为第一位的诊断，包含确切的命令阶梯和日志签名。
  </Card>
  <Card title="配置" icon="sliders" href="/zh/gateway/configuration">
    面向任务的设置指南 + 完整配置参考。
  </Card>
  <Card title="机密管理" icon="key-round" href="/zh/gateway/secrets">
    SecretRef 协约、运行时快照行为以及迁移/重载操作。
  </Card>
  <Card title="机密计划协议" icon="shield-check" href="/zh/gateway/secrets-plan-contract">
    确切的 `secrets apply` 目标/路径规则以及仅引用的 auth-profile 行为。
  </Card>
</CardGroup>

## 5 分钟本地启动

<Steps>
  <Step title="Gateway(网关)启动 Gateway(网关)">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="验证服务健康">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基线：`Runtime: running`、`Connectivity probe: ok` 和 `Capability: ...` 符合您的预期。当您需要读取范围的 RPC 证明而不仅仅是可达性时，请使用 `openclaw gateway status --require-rpc`RPC。

  </Step>

  <Step title="验证渠道就绪状态">

````bash
openclaw channels status --probe
```CLI

如果 gateway(网关) 可达，这将运行每个账户的实时渠道探测和可选审计。
如果 gateway(网关) 不可达，CLI 将回退到仅基于配置的渠道摘要，而不是
实时探测输出。

  </Step>
</Steps>

<Note>
Gateway(网关) 配置重载监视活动配置文件路径（从配置文件/状态默认值解析，或在设置时从 Gateway(网关)`OPENCLAW_CONFIG_PATH` 解析）。
默认模式为 `gateway.reload.mode="hybrid"`。
首次成功加载后，运行进程提供活动内存配置快照；成功重载会以原子方式交换该快照。
</Note>

## 运行时模型

- 一个常驻进程用于路由、控制平面和渠道连接。
- 单一多路复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 兼容（OpenAI`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - 控制 UI 和钩子
- 默认绑定模式：`loopback`。
- 默认情况下需要身份验证。共享密钥设置使用
  `gateway.auth.token` / `gateway.auth.password`（或
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），而非回环
  反向代理设置可以使用 `gateway.auth.mode: "trusted-proxy"`。

## OpenAI 兼容端点

OpenClaw 的高杠杆兼容性表面现在是：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

为什么这一组很重要：

- 大多数 Open WebUI、LobeChat 和 LibreChat 集成首先探测 `/v1/models`。
- 许多 RAG 和内存流水线期望 `/v1/embeddings`。
- 原生 Agent 客户端越来越倾向于 `/v1/responses`。

规划说明：

- `/v1/models` 是 Agent 优先的：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是稳定别名，始终映射到配置的默认 Agent。
- 当您希望后端提供商/模型覆盖时，请使用 `x-openclaw-model`；否则所选 Agent 的正常模型和嵌入设置保持控制。

所有这些都在主 Gateway(网关) 端口上运行，并使用与 Gateway(网关) HTTP API 其余部分相同的可信操作员身份验证边界。

### 端口和绑定优先级

| 设置      | 解析顺序                                              |
| ------------ | ------------------------------------------------------------- |
| Gateway(网关) 端口 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 绑定模式    | CLI/覆盖 → CLI`gateway.bind` → `loopback`                    |

已安装的 Gateway 服务会在 supervisor 元数据中记录已解析的 `--port`。更改 `gateway.port` 后，请运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，以便 launchd/systemd/schtasks 在新端口上启动进程。

Gateway(网关) 启动时，在为非环回绑定初始化本地 Control UI 源时，使用相同的有效端口和绑定。例如，Gateway(网关)`--bind lan --port 3000` 在运行时验证之前会初始化 `http://localhost:3000` 和 `http://127.0.0.1:3000`。请将任何远程浏览器源（例如 HTTPS 代理 URL）显式添加到 `gateway.controlUi.allowedOrigins` 中。

### 热重载模式

| `gateway.reload.mode` | 行为                                   |
| --------------------- | ------------------------------------------ |
| `off`                 | 不重载配置                           |
| `hot`                 | 仅应用热安全更改                |
| `restart`             | 需要重载更改时重启         |
| `hybrid` (默认)    | 安全时热应用，必要时重启 |

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
````

`gateway status --deep`RPC 用于额外的服务发现（LaunchDaemons/systemd system units/schtasks），而不是更深入的 RPC 健康检查。

## 多个 Gateway（同一主机）

大多数安装应在每台机器上运行一个 Gateway。单个 Gateway 可以承载多个代理和通道。

只有在您有意进行隔离或需要救援机器人时，才需要多个 Gateway。

有用的检查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

预期情况：

- 当过时的 launchd/systemd/schtasks 安装仍然存在时，`gateway status --deep` 可以报告 `Other gateway-like services detected (best effort)` 并打印清理提示。
- 当有多个目标响应时，`gateway probe` 可以针对 `multiple reachable gateways` 发出警告。
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

## 远程访问

首选：Tailscale/VPN。
备用：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然后让客户端在本地连接到 `ws://127.0.0.1:18789`。

<Warning>SSH 隧道不会绕过 Gateway 身份验证。对于共享密钥身份验证，客户端即使通过隧道连接，仍必须发送 `token`/`password`。对于承载身份的模式，请求仍必须满足该身份验证路径。</Warning>

请参阅：[Remote Gateway](<Gateway(网关)/en/gateway/remote>)、[Authentication](/zh/gateway/authenticationTailscale)、[Tailscale](/zh/gateway/tailscale)。

## 监督与服务生命周期

使用监督运行以获得类似生产环境的可靠性。

<Tabs>
  <Tab title="macOSmacOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

使用 `openclaw gateway restart` 进行重启。不要将 `openclaw gateway stop` 和 `openclaw gateway start`macOS 链接起来作为重启的替代方案。

在 macOS 上，`gateway stop` 默认使用 `launchctl bootout` —— 这会从当前启动会话中移除 LaunchAgent 而不持久化禁用状态，因此 KeepAlive 自动恢复在意外崩溃后仍然有效，并且 `gateway start` 可以干净地重新启用。要在重启之间持久化抑制自动重生，请传递 `--disable`：`openclaw gateway stop --disable`。

LaunchAgent 标签为 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名配置文件）。`openclaw doctor` 审计并修复服务配置偏差。

  </Tab>

  <Tab title="LinuxLinux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

要在登出后保持持久性，请启用 lingering：

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

  <Tab title="WindowsWindows (native)">

````powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```Windows

原生 Windows 托管启动使用名为 `OpenClaw Gateway` 的计划任务
（对于命名配置文件则为 `OpenClaw Gateway (<profile>)`OpenClaw）。如果创建计划任务
被拒绝，OpenClaw 将回退到指向状态目录中 `gateway.cmd` 的
每用户启动文件夹启动器。

  </Tab>

  <Tab title="LinuxLinux（系统服务）">

对多用户/常驻主机使用系统单元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
````

使用与用户单元相同的服务主体，但将其安装在
`/etc/systemd/system/openclaw-gateway[-<profile>].service` 下，并根据需要调整
`ExecStart=`（如果您的 `openclaw` 二进制文件位于其他位置）。

不要同时让 `openclaw doctor --fix`OpenClaw 为相同的配置文件/端口安装用户级 Gateway(网关) 服务。当 Doctor 发现系统级 OpenClaw Gateway(网关) 服务时，它将拒绝该自动安装；当系统单元拥有生命周期时，请使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Tab>
</Tabs>

## Dev profile 快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认值包括隔离的状态/配置和基础 Gateway(网关) 端口 `19001`。

## 协议快速参考（操作员视图）

- 第一个客户端帧必须是 `connect`。
- Gateway(网关) 返回 Gateway(网关)`hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、限制/策略）。
- `hello-ok.features.methods` / `events` 是一个保守的发现列表，
  而不是生成的每个可调用辅助路由的转储。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件包括 `connect.challenge`、`agent`、`chat`、
  `session.message`、`session.tool`、`sessions.changed`、`presence`、`tick`、
  `health`、`heartbeat`、配对/批准生命周期事件以及 `shutdown`。

Agent 运行分两个阶段：

1. 立即接受确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），中间伴随着流式 `agent` 事件。

查看完整的协议文档：[Gateway(网关) 协议](<Gateway(网关)/en/gateway/protocol>)。

## 操作检查

### 存活状态

- 打开 WS 并发送 `connect`。
- 期望收到带有快照的 `hello-ok` 响应。

### 就绪状态

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 间隔恢复

事件不会重放。在序列间隔时，在继续之前刷新状态 (`health`, `system-presence`)。

## 常见故障特征

| 特征                                                           | 可能的问题                                             |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| `refusing to bind gateway ... without auth`                    | 非回环绑定且没有有效的网关身份验证路径                 |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                                               |
| `Gateway start blocked: set gateway.mode=local`                | 配置设置为远程模式，或者本地模式标记从损坏的配置中丢失 |
| 连接期间发生 `unauthorized`                                    | 客户端和网关之间的身份验证不匹配                       |

有关完整的诊断步骤，请使用 [Gateway(网关) 故障排除](<Gateway(网关)/en/gateway/troubleshooting>)。

## 安全保证

- 当 Gateway(网关) 不可用时，Gateway(网关) 协议客户端会快速失败（没有隐式的直接渠道回退）。
- 无效/非连接的第一帧会被拒绝并关闭。
- 优雅关闭会在套接字关闭之前发出 `shutdown` 事件。

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
- [Gateway(网关) 故障排除](<Gateway(网关)/en/gateway/troubleshooting>)
- [远程访问](/zh/gateway/remote)
- [密钥管理](/zh/gateway/secrets)
