---
summary: "通过 Gateway 暴露 OpenAI 兼容的 /v1/chat/completions HTTP 端点"
read_when:
  - 集成依赖 OpenAI Chat Completions 的工具
---
# OpenAI Chat Completions（HTTP）

OpenClaw 的 Gateway 可提供一个小型 OpenAI 兼容的 Chat Completions 端点。

该端点**默认禁用**，需先在配置中启用。

- `POST /v1/chat/completions`
- 与 Gateway 相同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/v1/chat/completions`

底层请求会作为普通 Gateway agent 运行执行（与 `openclaw agent` 相同路径），因此路由/权限/配置与 Gateway 一致。

## 认证

使用 Gateway 认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

注：
- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。

## 选择 agent

无需自定义 headers：在 OpenAI `model` 字段中编码 agent id：

- `model: "openclaw:<agentId>"`（例如：`"openclaw:main"`、`"openclaw:beta"`）
- `model: "agent:<agentId>"`（别名）

或通过 header 指定 OpenClaw agent：

- `x-openclaw-agent-id: <agentId>`（默认：`main`）

高级：
- `x-openclaw-session-key: <sessionKey>` 用于完全控制会话路由。

## 启用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true }
      }
    }
  }
}
```

## 禁用端点

将 `gateway.http.endpoints.chatCompletions.enabled` 设为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false }
      }
    }
  }
}
```

## 会话行为

默认该端点**每个请求无状态**（每次调用都会生成新的 session key）。

若请求包含 OpenAI `user` 字符串，Gateway 会基于它派生稳定 session key，以便重复调用共享同一 agent 会话。

## Streaming（SSE）

设置 `stream: true` 以接收 Server-Sent Events（SSE）：

- `Content-Type: text/event-stream`
- 每个事件行：`data: <json>`
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
