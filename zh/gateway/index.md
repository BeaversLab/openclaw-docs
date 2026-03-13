---
summary: "Gateway 服务、生命周期和运行手册"
read_when:
  - Running or debugging the gateway process
title: "Gateway 运行手册"
---

# Gateway 运行手册

使用此页面进行 Gateway 服务的第 1 天启动和第 2 天运维。

<CardGroup cols={2}>
  <Card title="Deep troubleshooting" icon="siren" href="/zh/en/gateway/troubleshooting">
    以症状为起点的诊断，包含确切的命令阶梯和日志签名。
  </Card>
  <Card title="Configuration" icon="sliders" href="/zh/en/gateway/configuration">
    面向任务的设置指南 + 完整配置参考。
  </Card>
  <Card title="Secrets management" icon="key-round" href="/zh/en/gateway/secrets">
    SecretRef 契约、运行时快照行为以及迁移/重新加载操作。
  </Card>
  <Card title="Secrets plan contract" icon="shield-check" href="/zh/en/gateway/secrets-plan-contract">
    确切的 `secrets apply` 目标/路径规则和仅引用 auth-profile 行为。
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

健康基线：`Runtime: running` 和 `RPC probe: ok`。

  </Step>

  <Step title="Validate channel readiness">

```bash
openclaw channels status --probe
```

  </Step>
</Steps>

<Note>
Gateway 配置重新加载监视活动配置文件路径（从配置文件/状态默认值解析，或在设置时为 `OPENCLAW_CONFIG_PATH`）。
默认模式为 `gateway.reload.mode="hybrid"`。
</Note>

## 运行时模型

- 一个常驻进程，用于路由、控制平面和通道连接。
- 单个多路复用端口用于：
  - WebSocket 控制/RPC
  - HTTP API（OpenAI 兼容、Responses、工具调用）
  - 控制界面和钩子
- 默认绑定模式：`loopback`。
- 默认情况下需要身份验证（`gateway.auth.token` / `gateway.auth.password`，或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。

### 端口和绑定优先级

| 设置      | 解析顺序                                              |
| ------------ | ------------------------------------------------------------- |
| Gateway 端口 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| 绑定模式    | CLI/override → `gateway.bind` → `loopback`                    |

### 热重载模式

| `gateway.reload.mode` | 行为                                   |
| --------------------- | ------------------------------------------ |
| `off`                 | 不重载配置                           |
| `hot`                 | 仅应用热安全更改                |
| `restart`             | 在需要重载的更改时重启         |
| `hybrid` (默认)    | 安全时热应用，需要时重启 |

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
备用：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

然后将客户端连接到本地的 `ws://127.0.0.1:18789`。

<Warning>
如果配置了网关认证，客户端即使通过 SSH 隧道也仍必须发送认证信息 (`token`/`password`)。
</Warning>

参见：[远程网关](/zh/en/gateway/remote)、[身份验证](/zh/en/gateway/authentication)、[Tailscale](/zh/en/gateway/tailscale)。

## 监管与服务生命周期

使用监管运行以获得类似生产环境的可靠性。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

LaunchAgent 标签为 `ai.openclaw.gateway` (默认) 或 `ai.openclaw.<profile>` (命名配置文件)。`openclaw doctor` 会审计并修复服务配置偏差。

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

为了在注销后保持持久化，请启用 lingering：

```bash
sudo loginctl enable-linger <user>
```

  </Tab>

  <Tab title="Linux (system service)">

对于多用户/常驻主机，请使用系统单元。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## 单主机上的多个网关

大多数设置应运行 **一个** Gateway。
仅在需要严格隔离/冗余时（例如救援配置文件）才使用多个。

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

参见：[多网关](/zh/en/gateway/multiple-gateways)。

### 开发配置快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认设置包括隔离的状态/配置和基础网关端口 `19001`。

## 协议快速参考（操作员视图）

- 首个客户端帧必须是 `connect`。
- 网关返回 `hello-ok` 快照（`presence`、`health`、`stateVersion`、`uptimeMs`、limits/policy）。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件：`connect.challenge`、`agent`、`chat`、`presence`、`tick`、`health`、`heartbeat`、`shutdown`。

代理运行分为两个阶段：

1. 立即接受的确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），其间包含流式 `agent` 事件。

查看完整协议文档：[网关协议](/zh/en/gateway/protocol)。

## 操作检查

### 存活检查

- 打开 WS 并发送 `connect`。
- 预期收到带有快照的 `hello-ok` 响应。

### 就绪检查

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### 间隙恢复

事件不会重放。在出现序列间隙时，继续之前请刷新状态（`health`、`system-presence`）。

## 常见故障特征

| 特征                                                      | 可能的问题                             |
| -------------------------------------------------------------- | ---------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回环绑定且未使用令牌/密码 |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                            |
| `Gateway start blocked: set gateway.mode=local`                | 配置设置为远程模式                |
| `unauthorized` during connect                                  | 客户端与网关之间的身份验证不匹配 |

要获取完整的诊断步骤，请使用 [网关故障排除](/zh/en/gateway/troubleshooting)。

## 安全保证

- 当网关不可用时，网关协议客户端会快速失败（没有隐式的直接通道回退）。
- 无效或非连接的首帧会被拒绝并关闭连接。
- 优雅关闭在 socket 关闭之前发出 `shutdown` 事件。

---

相关：

- [故障排查](/zh/en/gateway/troubleshooting)
- [后台进程](/zh/en/gateway/background-process)
- [配置](/zh/en/gateway/configuration)
- [健康检查](/zh/en/gateway/health)
- [诊断工具](/zh/en/gateway/doctor)
- [身份验证](/zh/en/gateway/authentication)

import zh from '/components/footer/zh.mdx';

<zh />
