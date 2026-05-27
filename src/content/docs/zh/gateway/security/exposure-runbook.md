---
summary: "OpenClawGateway(网关)在将 OpenClaw Gateway(网关) 暴露到环回之外之前的预检和回滚检查清单"
title: "Gateway(网关)Gateway(网关) 暴露手册"
sidebarTitle: "暴露手册"
read_when:
  - Exposing the Gateway over LAN, tailnet, Tailscale Serve, Funnel, or a reverse proxy
  - Reviewing a deployment before allowing real messaging users
  - Rolling back a risky remote access or DM configuration
---

<Warning>只有当您能够解释谁能访问 Gateway(网关)、他们如何进行身份验证、他们可以触发哪些代理以及这些代理可以使用哪些工具时，才暴露 Gateway(网关)。如有疑问，请恢复为仅环回访问并重新运行审计。</Warning>

本手册将更广泛的 [安全](/zh/gateway/security) 指南转化为用于远程访问和消息传递暴露的操作员检查清单。

## 选择暴露模式

首选满足工作流的最窄模式。

| 模式                   | 建议在以下情况使用                         | 必需控制                                                                         |
| ---------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| 环回 + SSH 隧道        | 个人使用、管理员访问、调试                 | 保持 `gateway.bind: "loopback"` 并通过隧道传输 `127.0.0.1:18789`                 |
| 环回 + Tailscale Serve | 通过个人 tailnet 访问 Control UI/WebSocket | 保持 Gateway(网关) 仅环回；仅对支持的表面依赖 Tailscale 身份标头                 |
| Tailnet/LAN 绑定       | 具有已知设备的专用专用网络                 | Gateway(网关) 身份验证、防火墙允许列表、无公共端口转发                           |
| 受信任的反向代理       | Gateway(网关) 前的组织 SSO/OIDC            | `trusted-proxy` 身份验证、严格 `trustedProxies`、标头覆盖/去除规则、显式允许用户 |
| 公共互联网             | 罕见、高风险的部署                         | 具有感知能力的代理、TLS、速率限制、严格允许列表、沙箱隔离非主会话                |

避免直接向 Gateway(网关) 进行公共端口转发。如果您需要公共访问，请在它前面放置一个具有感知能力的代理，并使该代理成为通往 Gateway(网关) 的唯一网络路径。

## 预检清单

在更改绑定、代理、Tailscale 或渠道策略之前，请记录以下内容：

- Gateway(网关) 主机、操作系统用户和状态目录。
- Gateway(网关) URL 和绑定模式。
- 身份验证模式、令牌/密码源或受信任代理的身份源。
- 所有已启用的渠道，以及它们是否接受私信、群组或 Webhook。
- 可从非本地发送者触发的代理。
- 每个可触达代理的配置文件、沙盒模式和提升的工具策略。
- 这些代理可用的外部凭证。
- `~/.openclaw/openclaw.json` 和凭证的备份位置。

如果不止一个人可以向机器人发送消息，请将其视为共享的委托工具权限，而不是每用户的主机隔离。

## 基线检查

在开放访问权限之前运行以下操作：

```bash
openclaw doctor
openclaw security audit
openclaw security audit --deep
openclaw health
```

首先解决关键发现。只有当警告是故意的并且已针对部署进行文档记录时，才可能被接受。

对于远程 CLI 验证，请显式传递凭证：

```bash
openclaw gateway probe --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

不要假设本地配置凭证适用于显式的远程 URL。

## 最低安全基线

使用此配置作为暴露部署的起点：

```json5
{
  gateway: {
    bind: "loopback",
    auth: {
      mode: "token",
      token: "replace-with-a-long-random-token",
    },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  agents: {
    defaults: {
      sandbox: { mode: "non-main" },
    },
  },
  tools: {
    profile: "messaging",
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

然后一次放宽一个控制。例如，在启用具有写入功能的工具之前添加特定的渠道允许列表，或者在接受远程控制 UI 流量之前启用反向代理。

严格的 `exec.security: "deny"` 基线会阻止所有 exec 调用，包括良性诊断。如果需要诊断或低风险命令，请仅在选择了与您的威胁模型匹配的特定发送者、代理、命令和批准模式后，再放宽此限制。

## 私信和群组暴露

消息渠道是不可信的输入面。在允许私信或群组之前：

- 首选 `dmPolicy: "pairing"` 或严格的 `allowFrom` 列表。
- 除非每个发送者都是受信任的，否则请避免使用 `dmPolicy: "open"`。
- 不要将 `"*"` 允许列表与广泛的工具访问权限结合使用。
- 除非房间受到严格控制，否则要求在群组中提及。
- 当多个人可以向机器人发送私信时，请使用 `session.dmScope: "per-channel-peer"`。
- 将共享渠道路由到具有最少工具且没有个人凭证的代理。

配对批准发送者触发机器人。这并不会使该发送者成为独立的主机安全边界。

## 反向代理检查

对于具有身份感知能力的代理：

- 代理必须在转发到 Gateway(网关) 之前对用户进行身份验证。
- 必须通过防火墙或网络策略阻止对 Gateway(网关) 端口的直接访问。
- `gateway.trustedProxies` 必须仅包含代理源 IP。
- 代理必须剥离或覆盖客户端提供的身份和转发标头。
- 当代理服务于多个受众时，`gateway.auth.trustedProxy.allowUsers` 应列出预期的用户。
- 仅当信任本地进程且代理拥有身份标头时，同主机回环代理模式才应使用 `allowLoopback`。

在代理更改后运行 `openclaw security audit --deep`。受信任代理的发现结果特意具有较高的信号量，因为代理成为了身份验证边界。

## 工具和沙箱审查

在将 Agent 暴露给远程发送方之前：

- 确认哪些会话在主机与沙箱上运行。
- 拒绝或要求批准主机执行。
- 保持提升的工具处于禁用状态，除非特定的受信任发送方需要它们。
- 对于开放或半开放的消息传递表面，请避免使用 browser、canvas、node、cron、gateway 和 会话-spawn 工具。
- 保持绑定挂载狭窄，并避免凭据、主目录、Docker 套接字和系统路径。
- 针对实质性不同的信任边界，请使用独立的 Gateway、OS 用户或主机。

如果远程用户不完全受信任，隔离必须来自独立的部署，而不仅仅是提示或会话标签。

## 变更后验证

每次暴露更改后：

1. 重新运行 `openclaw security audit --deep`。
2. 测试一次成功的授权连接。
3. 测试未授权的发送方或浏览器会话是否被拒绝。
4. 确认日志已编辑敏感信息。
5. 确认私信/组路由仅到达预期的 Agent。
6. 确认高影响的工具会请求批准或被拒绝。
7. 记录接受的残留警告。

在理解当前更改之前，不要继续进行下一次暴露更改。

## 回滚计划

如果 Gateway(网关) 可能过度暴露：

```json5
{
  gateway: {
    bind: "loopback",
  },
  channels: {
    whatsapp: { dmPolicy: "disabled" },
    telegram: { dmPolicy: "disabled" },
    discord: { dmPolicy: "disabled" },
    slack: { dmPolicy: "disabled" },
  },
  tools: {
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

然后：

1. 停止公共转发、Tailscale Funnel 或反向代理路由。
2. 轮换 Gateway(网关) 令牌/密码以及受影响的集成凭据。
3. 从允许列表中删除 `"*"` 和意外的发送方。
4. 查看最近的审计日志、运行历史、工具调用和配置更改。
5. 重新运行 `openclaw security audit --deep`。
6. 使用满足工作流程的最窄模式重新启用访问。

## 审查清单

- Gateway(网关)保持仅环回访问，除非有记录在案的原因。
- 非环回访问具有身份验证、防火墙保护，且没有公共直接路由。
- 受信任代理部署具有严格的代理 IP 和标头控制。
- 私信使用配对或允许列表，默认情况下不开放访问。
- 群组需要提及或明确的允许列表。
- 共享频道无法访问个人凭据。
- 非主会话在沙盒模式下运行。
- 主机执行和提升权限的工具被拒绝或需经过批准。
- 日志会对密钥进行脱敏处理。
- 关键审计发现已解决。
- 回滚步骤已测试并记录在案。
