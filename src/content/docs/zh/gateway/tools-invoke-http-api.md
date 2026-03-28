---
summary: "通过 Gateway 网关 HTTP 端点直接调用单个工具"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "Tools Invoke API"
---

# Tools Invoke (HTTP)

OpenClaw 的 Gateway(网关) 公开了一个简单的 HTTP 端点，用于直接调用单个工具。该端点始终处于启用状态，并使用 Gateway(网关) 身份验证以及工具策略，但通过 Gateway(网关) 持有者身份验证的调用者会被视为该 Gateway(网关) 的受信任操作员。

- `POST /tools/invoke`
- 与 Gateway 网关 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大负载大小为 2 MB。

## 身份验证

使用 Gateway 网关 身份验证配置。发送 bearer token：

- `Authorization: Bearer <token>`

注意：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果配置了 `gateway.auth.rateLimit` 并且发生了过多的身份验证失败，该端点将返回 `429` 并附带 `Retry-After`。
- 请将此凭据视为该 API 的完全访问操作员机密。它不是针对更狭窄 `/tools/invoke` 角色的作用域 API 令牌。

## 请求正文

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

- `tool` (字符串，必填)：要调用的工具名称。
- `action` (字符串，可选)：如果工具架构支持 `action` 且 args 负载中未包含该字段，则将其映射到 args 中。
- `args` (对象，可选)：特定于工具的参数。
- `sessionKey` (字符串，可选)：目标会话密钥。如果省略或为 `"main"`，Gateway(网关) 将使用配置的主会话密钥（遵守 `session.mainKey` 和默认代理，或全局范围内的 `global`）。
- `dryRun` (布尔值，可选)：保留供将来使用；当前会被忽略。

## 策略 + 路由行为

工具的可用性通过 Gateway(网关) 代理使用的相同策略链进行过滤：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（如果会话密钥映射到组或渠道）
- 子代理策略（当使用子代理会话密钥进行调用时）

如果策略不允许使用某个工具，该端点将返回 **404**。

重要的边界注意事项：

- `POST /tools/invoke` 与其他 Gateway(网关) HTTP API（如 `/v1/chat/completions`、`/v1/responses` 和 `/api/channels/*`）一样，处于同一个受信任操作员类别中。
- 执行批准 是操作员护栏，而不是此 HTTP 端点的单独授权边界。如果工具在此处可通过 Gateway(网关) 身份验证 + 工具策略进行访问，则 `/tools/invoke` 不会添加额外的每次调用批准提示。
- 请勿与不受信任的调用者共享 Gateway(网关) 持有者凭据。如果需要在信任边界之间进行隔离，请运行单独的 Gateway(网关)（理想情况下，还应使用单独的操作系统用户/主机）。

Gateway(网关) HTTP 默认也会应用硬拒绝列表（即使会话策略允许该工具）：

- `cron`
- `sessions_spawn`
- `sessions_send`
- `gateway`
- `whatsapp_login`

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

- `x-openclaw-message-channel: <channel>` (示例: `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (当存在多个账户时)

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (无效请求或工具输入错误)
- `401` → 未经授权
- `429` → 身份验证速率受限 (`Retry-After` 已设置)
- `404` → 工具不可用 (未找到或未在允许列表中)
- `405` → 不允许的方法
- `500` → `{ ok: false, error: { type, message } }` (意外的工具执行错误；已清理消息)

## 示例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
