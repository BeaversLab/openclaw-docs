---
summary: "从 Gateway 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - "Integrating tools that expect OpenAI Chat Completions"
title: "OpenAI Chat Completions"
---

# OpenAI Chat Completions (HTTP)

OpenClaw 的 Gateway 可以提供一个兼容 OpenAI 的 Chat Completions 端点。

此端点**默认禁用**。请先在配置中启用它。

- `POST /v1/chat/completions`
- 与 Gateway 使用相同端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/chat/completions`

在底层，请求作为普通的 Gateway 代理运行执行（与 `openclaw agent` 相同的代码路径），因此路由/权限/配置与您的 Gateway 匹配。

## 身份验证

使用 Gateway 身份验证配置。发送 bearer token：

- `Authorization: Bearer <token>`

注意事项：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。

## 选择代理

无需自定义标头：在 OpenAI `model` 字段中编码代理 id：

- `model: "openclaw:<agentId>"`（示例：`"openclaw:main"`、`"openclaw:beta"`）
- `model: "agent:<agentId>"`（别名）

或者通过标头指定特定的 OpenClaw 代理：

- `x-openclaw-agent-id: <agentId>`（默认：`main`）

高级：

- 使用 `x-openclaw-session-key: <sessionKey>` 完全控制会话路由。

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

默认情况下，此端点是**每次请求无状态的**（每次调用都会生成新的会话密钥）。

如果请求包含 OpenAI `user` 字符串，Gateway 将从中派生一个稳定的会话密钥，因此重复调用可以共享一个代理会话。

## 流式传输（SSE）

设置 `stream: true` 以接收服务器发送事件（SSE）：

- `Content-Type: text/event-stream`
- 每个事件行都是 `data: <json>`
- 流以 `data: [DONE]` 结束

## 示例

非流式：

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

流式：

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
