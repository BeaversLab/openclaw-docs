---
summary: "通过 Gateway(网关) HTTP 端点直接调用单个工具"
read_when:
  - 在不运行完整代理回合的情况下调用工具
  - 构建需要工具策略执行的自动化
title: "工具调用 API"
---

# 工具调用 (HTTP)

OpenClaw 的 Gateway(网关) 公开了一个简单的 HTTP 端点，用于直接调用单个工具。它始终启用，但受 Gateway(网关) 身份验证和工具策略的限制。

- `POST /tools/invoke`
- 与 Gateway(网关) 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大负载大小为 2 MB。

## 身份验证

使用 Gateway(网关) 身份验证配置。发送不记名令牌 (bearer token)：

- `Authorization: Bearer <token>`

说明：

- 当 `gateway.auth.mode="token"` 时，请使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，请使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果配置了 `gateway.auth.rateLimit` 且发生过多的身份验证失败，端点将返回 `429` 并附带 `Retry-After`。

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

- `tool`（字符串，必需）：要调用的工具名称。
- `action`（字符串，可选）：如果工具架构支持 `action` 且 args 负载中未包含该参数，则将其映射到 args 中。
- `args`（对象，可选）：特定于工具的参数。
- `sessionKey`（字符串，可选）：目标会话密钥。如果省略或为 `"main"`，Gateway(网关) 将使用配置的主会话密钥（遵从 `session.mainKey` 和默认代理，或全局范围内的 `global`）。
- `dryRun`（布尔值，可选）：保留供将来使用；目前被忽略。

## 策略 + 路由行为

工具可用性通过 Gateway(网关) 代理使用的相同策略链进行过滤：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（如果会话密钥映射到组或渠道）
- 子代理策略（使用子代理会话密钥调用时）

如果策略不允许某工具，该端点将返回 **404**。

Gateway(网关) HTTP 默认还会应用一个硬拒绝列表（即使会话策略允许该工具）：

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

为了帮助组策略解析上下文，您可以选择设置：

- `x-openclaw-message-channel: <channel>`（例如：`slack`、`telegram`）
- `x-openclaw-account-id: <accountId>`（当存在多个账户时）

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（无效请求或工具输入错误）
- `401` → 未经授权
- `429` → 认证速率受限（已设置 `Retry-After`）
- `404` → 工具不可用（未找到或未被列入允许列表）
- `405` → 不允许的方法
- `500` → `{ ok: false, error: { type, message } }`（意外的工具执行错误；已清理的消息）

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

import zh from "/components/footer/zh.mdx";

<zh />
