---
summary: "Gateway 网关 服务、生命周期和操作的运行手册"
read_when:
  - Running or debugging the gateway process
title: "Gateway 网关 运行手册"
---

# Gateway 网关 运行手册

使用此页面进行 Gateway 网关 服务的第 1 天启动和第 2 天运维。

<CardGroup cols={2}>
  <Card title="深度故障排除" icon="siren" href="/zh/gateway/troubleshooting">
    基于症状的诊断，包含精确的命令阶梯和日志特征。
  </Card>
  <Card title="配置" icon="sliders" href="/zh/gateway/configuration">
    面向任务的设置指南 + 完整配置参考。
  </Card>
  <Card title="机密管理" icon="key-round" href="/zh/gateway/secrets">
    SecretRef 契约、运行时快照行为以及迁移/重新加载操作。
  </Card>
  <Card title="机密计划契约" icon="shield-check" href="/zh/gateway/secrets-plan-contract">
    精确的 `secrets apply` 目标/路径规则以及仅引用认证配置文件行为。
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

  <Step title="验证服务运行状况">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基线：`Runtime: running` 和 `RPC probe: ok`。

  </Step>

  <Step title="验证渠道就绪情况">

```bash
openclaw channels status --probe
```

  </Step>
</Steps>

<Note>Gateway(网关) 配置重新加载监视活动配置文件路径（从配置文件/状态默认值解析， 或设置时的 `OPENCLAW_CONFIG_PATH`）。默认模式为 `gateway.reload.mode="hybrid"`。</Note>

## 运行时模型

- 一个常驻进程用于路由、控制平面和渠道连接。
- 单一多路复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API，OpenAI 兼容（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、`/tools/invoke`）
  - 控制 UI 和钩子
- 默认绑定模式：`loopback`。
- 默认情况下需要身份验证（`gateway.auth.token` / `gateway.auth.password`，或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。

## OpenAI 兼容端点

OpenClaw 目前最高杠杆的兼容性接口是：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

为什么这一组很重要：

- 大多数 Open WebUI、LobeChat 和 LibreChat 集成首先探测 `/v1/models`。
- 许多 RAG 和内存流水线期望 `/v1/embeddings`。
- Agent 原生客户端越来越倾向于 `/v1/responses`。

规划说明：

- `/v1/models` 是 Agent 优先的：它返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。
- `openclaw/default` 是一个稳定的别名，始终映射到配置的默认 Agent。
- 当您想要后端提供商/模型覆盖时，请使用 `x-openclaw-model`；否则，所选 Agent 的正常模型和嵌入设置将保持控制。

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
openclaw gateway status --deep
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

## 远程访问

首选：Tailscale/VPN。
回退：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然后在本地将客户端连接到 `ws://127.0.0.1:18789`。

<Warning>如果配置了 Gateway 身份验证，即使通过 SSH 隧道，客户端仍必须发送身份验证信息（`token`/`password`）。</Warning>

参见：[远程 Gateway](/zh/gateway/remote)、[身份验证](/zh/gateway/authentication)、[Tailscale](/zh/gateway/tailscale)。

## 监督和服务生命周期

使用监督运行以获得类似生产环境的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 标签为 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名配置文件）。`openclaw doctor` 会审计并修复服务配置漂移。

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

  </Tab>

  <Tab title="Linux (system service)">

对于多用户/始终在线的主机，请使用系统单元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## 在一台主机上运行多个 Gateway

大多数设置应运行 **一个** Gateway。
仅在需要严格隔离/冗余（例如救援配置文件）时才使用多个。

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

参见：[多个 Gateway](/zh/gateway/multiple-gateways)。

### 开发配置文件快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认值包括隔离的状态/配置和基础 Gateway 端口 `19001`。

## 协议快速参考（操作员视图）

- 第一个客户端帧必须是 `connect`。
- Gateway 返回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、限制/策略）。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件：`connect.challenge`，`agent`，`chat`，`presence`，`tick`，`health`，`heartbeat`，`shutdown`。

Agent 运行分两个阶段：

1. 立即接受的确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），中间穿插流式 `agent` 事件。

查看完整协议文档：[Gateway(网关) 协议](/zh/gateway/protocol)。

## 操作检查

### 存活检查

- 打开 WS 并发送 `connect`。
- 期望带有快照的 `hello-ok` 响应。

### 就绪检查

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 间隔恢复

事件不会重播。遇到序列间隔时，在继续之前刷新状态（`health`，`system-presence`）。

## 常见故障特征

| 特征                                                           | 可能的问题                   |
| -------------------------------------------------------------- | ---------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回环绑定且无令牌/密码      |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                     |
| `Gateway start blocked: set gateway.mode=local`                | 配置设置为远程模式           |
| 连接期间的 `unauthorized`                                      | 客户端与网关之间的认证不匹配 |

如需完整的诊断步骤，请使用 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)。

## 安全保证

- 当 Gateway(网关) 不可用时，Gateway(网关) 协议客户端会快速失败（没有隐式的直接渠道回退）。
- 无效/非连接的首帧将被拒绝并关闭。
- 优雅关闭会在套接字关闭之前发出 `shutdown` 事件。

---

相关：

- [故障排除](/zh/gateway/troubleshooting)
- [后台进程](/zh/gateway/background-process)
- [配置](/zh/gateway/configuration)
- [健康检查](/zh/gateway/health)
- [诊断工具](/zh/gateway/doctor)
- [认证](/zh/gateway/authentication)
