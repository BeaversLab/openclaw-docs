---
summary: "通过 Gateway(网关) 网关 HTTP 端点直接调用单个工具"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "Tools Invoke API"
---

# Tools Invoke (HTTP)

OpenClaw 的 Gateway(网关) 公开了一个简单的 HTTP 端点，用于直接调用单个工具。它始终启用，并使用 Gateway(网关) 身份验证加上工具策略。与 OpenAI 兼容的 `/v1/*` 表面类似，共享密钥不记名身份验证被视为对整个 Gateway(网关) 的受信任操作员访问。

- `POST /tools/invoke`
- 与 Gateway(网关) 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大负载大小为 2 MB。

## 身份验证

使用 Gateway(网关) 认证配置。

常见的 HTTP 认证路径：

- 共享密钥认证 (`gateway.auth.mode="token"` 或 `"password"`)：
  `Authorization: Bearer <token-or-password>`
- 可信的承载身份的 HTTP 认证 (`gateway.auth.mode="trusted-proxy"`)：
  通过配置的感知身份代理进行路由，并让其注入
  所需的身份标头
- 私有入口开放认证 (`gateway.auth.mode="none"`)：
  不需要认证标头

注意事项：

- 当使用 `gateway.auth.mode="token"` 时，请使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 当使用 `gateway.auth.mode="password"` 时，请使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 当使用 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自
  配置的非本地可信代理源；同主机本地代理
  不满足此模式。
- 如果配置了 `gateway.auth.rateLimit` 且发生过多认证失败，端点将返回带有 `Retry-After` 的 `429`。

## 安全边界（重要）

将此端点视为网关实例的**完全操作员访问**表面。

- 此处的 HTTP 持有者认证并非狭义的每用户范围模型。
- 此端点的有效 Gateway(网关) 令牌/密码应被视为所有者/操作员凭据。
- 对于共享密钥认证模式 (`token` 和 `password`)，即使调用方发送了更窄的 `x-openclaw-scopes` 标头，端点也会恢复正常的完全操作员默认值。
- 共享密钥认证还将此端点上的直接工具调用视为所有者发送方轮次。
- 可信的承载身份的 HTTP 模式（例如，在私有入口上的可信代理认证或 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会遵守该标头，否则回退到正常的操作员默认范围集。
- 请将此端点仅保留在本地/tailnet/私有入口上；不要将其直接暴露给公共互联网。

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明持有共享网关操作员机密
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的直接工具调用视为所有者发送方轮次
- 可信的身份承载 HTTP 模式（例如可信代理身份验证，或私有入口上的 `gateway.auth.mode="none"`）
  - 对外部某些可信身份或部署边界进行身份验证
  - 当标头存在时遵守 `x-openclaw-scopes`
  - 当标头不存在时，回退到正常的操作员默认范围集
  - 仅当调用方显式缩小范围并省略 `operator.admin` 时，才会失去所有者语义

## 请求体

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

字段：

- `tool`（字符串，必填）：要调用的工具名称。
- `action`（字符串，可选）：如果工具模式支持 `action` 且参数负载中省略了它，则将其映射到参数中。
- `args`（对象，可选）：特定于工具的参数。
- `sessionKey`（字符串，可选）：目标会话密钥。如果省略或为 `"main"`，则 Gateway(网关) 使用配置的主会话密钥（遵守 `session.mainKey` 和默认代理，或全局范围内的 `global`）。
- `dryRun`（布尔值，可选）：保留供将来使用；当前被忽略。

## 策略 + 路由行为

工具可用性通过与 Gateway(网关) 代理使用的相同策略链进行过滤：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（如果会话密钥映射到组或渠道）
- 子代理策略（使用子代理会话密钥进行调用时）

如果策略不允许使用某个工具，该端点将返回 **404**。

重要的边界说明：

- 执行批准是操作员护栏，而不是此 HTTP 端点的单独授权边界。如果工具可通过 Gateway(网关) 身份验证 + 工具策略在此处访问，则 `/tools/invoke` 不会添加额外的每次调用批准提示。
- 请勿与不受信任的调用者共享 Gateway(网关) 持有者凭据。如果需要在信任边界之间进行隔离，请运行单独的网关（理想情况下还应使用独立的操作系统用户/主机）。

Gateway(网关) HTTP 默认也会应用硬性拒绝列表（即使会话策略允许该工具）：

- `exec` — 直接命令执行（RCE 攻击面）
- `spawn` — 任意子进程创建（RCE 攻击面）
- `shell` — Shell 命令执行（RCE 攻击面）
- `fs_write` — 主机上的任意文件变更
- `fs_delete` — 主机上的任意文件删除
- `fs_move` — 主机上的任意文件移动/重命名
- `apply_patch` — 补丁应用可能会重写任意文件
- `sessions_spawn` — 会话编排；远程生成代理属于 RCE
- `sessions_send` — 跨会话消息注入
- `cron` — 持久化自动化控制平面
- `gateway` — 网关控制平面；防止通过 HTTP 重新配置
- `nodes` — 节点命令中继可以访问配对主机上的 system.run
- `whatsapp_login` — 需要终端二维码扫描的交互式设置；在 HTTP 上会挂起

您可以通过 `gateway.tools` 自定义此拒绝列表：

```json5
{
  gateway: {
    tools: {
      // Additional tools to block over HTTP /tools/invoke
      deny: ["browser"],
      // Remove tools from the default deny list
      allow: ["gateway"],
    },
  },
}
```

为了帮助组策略解析上下文，您可以选择性地设置：

- `x-openclaw-message-channel: <channel>`（例如：`slack`，`telegram`）
- `x-openclaw-account-id: <accountId>`（当存在多个账户时）

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（无效请求或工具输入错误）
- `401` → 未授权
- `429` → 认证速率受限（设置了 `Retry-After`）
- `404` → 工具不可用（未找到或未被允许）
- `405` → 不允许的方法
- `500` → `{ ok: false, error: { type, message } }`（意外的工具执行错误；已清理的消息）

## 示例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
