---
summary: "从 Gateway 网关 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI Chat Completions"
---

# OpenAI Chat Completions (HTTP)

OpenClaw 的 Gateway 网关 可以提供一个小型的兼容 OpenAI 的 Chat Completions 端点。

该端点**默认处于禁用状态**。请先在配置中启用它。

- `POST /v1/chat/completions`
- 与 Gateway 网关 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/chat/completions`

在底层，请求作为正常的 Gateway 网关 代理运行执行（与 `openclaw agent` 代码路径相同），因此路由/权限/配置与您的 Gateway 网关 匹配。

## 身份验证

使用 Gateway 网关 身份验证配置。发送不记名令牌（bearer token）：

- `Authorization: Bearer <token>`

注意事项：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果配置了 `gateway.auth.rateLimit` 并且发生了过多的身份验证失败，端点将返回 `429` 并带有 `Retry-After`。

## 安全边界（重要）

将此端点视为网关实例的**完整操作员访问**接口。

- 此处的 HTTP 不记名身份验证并非狭窄的按用户范围模型。
- 此端点的有效 Gateway 网关 令牌/密码应被视为所有者/操作员凭据。
- 请求通过与受信任操作员操作相同的控制平面代理路径运行。
- 此端点上没有单独的非所有者/按用户工具边界；一旦调用者在此处通过 Gateway 网关 身份验证，OpenClaw 会将该调用者视为此 Gateway 网关 的受信任操作员。
- 如果目标代理策略允许敏感工具，此端点可以使用它们。
- 请将此端点保持在环回/tailnet/私有入口上；不要将其直接暴露给公共互联网。

请参阅 [安全](/en/gateway/security) 和 [远程访问](/en/gateway/remote)。

## 选择代理

不需要自定义标头：在 OpenAI `model` 字段中编码代理 ID：

- `model: "openclaw:<agentId>"`（例如：`"openclaw:main"`，`"openclaw:beta"`）
- `model: "agent:<agentId>"`（别名）

或者通过标头定位特定的 OpenClaw 代理：

- `x-openclaw-agent-id: <agentId>`（默认值：`main`）

高级：

- `x-openclaw-session-key: <sessionKey>` 以完全控制会话路由。

## 启用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设置为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

## 禁用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设置为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## 会话行为

默认情况下，该端点是**每次请求无状态**的（每次调用都会生成一个新的会话密钥）。

如果请求包含 OpenAI `user` 字符串，Gateway 网关 会从中派生一个稳定的会话密钥，以便重复调用可以共享代理会话。

## 流式传输 (SSE)

设置 `stream: true` 以接收服务器发送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每个事件行都是 `data: <json>`
- 流以 `data: [DONE]` 结束

## 示例

非流式传输：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

流式传输：

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

import zh from "/components/footer/zh.mdx";

<zh />
