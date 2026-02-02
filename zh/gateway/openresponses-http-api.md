---
summary: "通过 Gateway 暴露 OpenResponses 兼容的 /v1/responses HTTP 端点"
read_when:
  - 集成使用 OpenResponses API 的客户端
  - 需要基于 item 的输入、客户端工具调用或 SSE 事件
title: "OpenResponses API"
---
# OpenResponses API（HTTP）

OpenClaw 的 Gateway 可提供 OpenResponses 兼容的 `POST /v1/responses` 端点。

该端点**默认禁用**，需先在配置中启用。

- `POST /v1/responses`
- 与 Gateway 相同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/v1/responses`

底层请求会作为普通 Gateway agent 运行执行（与
`openclaw agent` 相同路径），因此路由/权限/配置与 Gateway 一致。

## 认证

使用 Gateway 认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

注：
- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。

## 选择 agent

无需自定义 headers：在 OpenResponses `model` 字段中编码 agent id：

- `model: "openclaw:<agentId>"`（例如：`"openclaw:main"`、`"openclaw:beta"`）
- `model: "agent:<agentId>"`（别名）

或通过 header 指定 OpenClaw agent：

- `x-openclaw-agent-id: <agentId>`（默认：`main`）

高级：
- `x-openclaw-session-key: <sessionKey>` 用于完全控制会话路由。

## 启用端点

将 `gateway.http.endpoints.responses.enabled` 设为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: true }
      }
    }
  }
}
```

## 禁用端点

将 `gateway.http.endpoints.responses.enabled` 设为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: false }
      }
    }
  }
}
```

## 会话行为

默认该端点**每个请求无状态**（每次调用都会生成新的 session key）。

若请求包含 OpenResponses `user` 字符串，Gateway 会基于它派生稳定 session key，以便重复调用共享同一 agent 会话。

## 请求形态（已支持）

请求遵循 OpenResponses API 的 item 输入。目前支持：

- `input`：字符串或 item 数组。
- `instructions`：合并到 system prompt。
- `tools`：客户端工具定义（function tools）。
- `tool_choice`：过滤或要求客户端工具。
- `stream`：启用 SSE streaming。
- `max_output_tokens`：best-effort 输出限制（依赖 provider）。
- `user`：稳定会话路由。

接受但**目前忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `previous_response_id`
- `truncation`

## Items（输入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 与 `developer` 会追加到 system prompt。
- 最新的 `user` 或 `function_call_output` item 将作为“当前消息”。
- 更早的 user/assistant 消息会作为历史用于上下文。

### `function_call_output`（回合式工具）

将工具结果发回模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 与 `item_reference`

为兼容 schema 接受，但在构建 prompt 时忽略。

## Tools（客户端侧 function tools）

通过 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

若 agent 决定调用工具，响应会返回一个 `function_call` 输出 item。随后发送带 `function_call_output` 的跟进请求继续回合。

## Images（`input_image`）

支持 base64 或 URL：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`。
最大大小（当前）：10MB。

## Files（`input_file`）

支持 base64 或 URL：

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "hello.txt"
  }
}
```

允许的 MIME（当前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

最大大小（当前）：5MB。

当前行为：
- 文件内容解码后加入 **system prompt**，而非 user 消息，因此仅为临时内容（不会写入会话历史）。
- PDF 会解析文本；若文本太少，会将首页渲染为图片并传给模型。

PDF 解析使用 Node 友好的 `pdfjs-dist` legacy build（无 worker）。现代
PDF.js build 需要浏览器 worker/DOM globals，因此不用于 Gateway。

URL 拉取默认：
- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- 请求带保护（DNS 解析、私网 IP 阻止、重定向上限、超时）。

## 文件 + 图片限制（配置）

默认值可在 `gateway.http.endpoints.responses` 下调整：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          files: {
            allowUrl: true,
            allowedMimes: ["text/plain", "text/markdown", "text/html", "text/csv", "application/json", "application/pdf"],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200
            }
          },
          images: {
            allowUrl: true,
            allowedMimes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000
          }
        }
      }
    }
  }
}
```

默认值（未设置时）：
- `maxBodyBytes`: 20MB
- `files.maxBytes`: 5MB
- `files.maxChars`: 200k
- `files.maxRedirects`: 3
- `files.timeoutMs`: 10s
- `files.pdf.maxPages`: 4
- `files.pdf.maxPixels`: 4,000,000
- `files.pdf.minTextChars`: 200
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10s

## Streaming（SSE）

设置 `stream: true` 以接收 Server-Sent Events（SSE）：

- `Content-Type: text/event-stream`
- 每个事件行：`event: <type>` 与 `data: <json>`
- 流以 `data: [DONE]` 结束

当前发出的事件类型：
- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed`（出错时）

## 用量

当底层 provider 报告 token 计数时，`usage` 会填充。

## 错误

错误使用如下 JSON 形态：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：
- `401` 缺少/无效认证
- `400` 请求体无效
- `405` 方法错误

## 示例

非流式：
```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "input": "hi"
  }'
```

流式：
```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "input": "hi"
  }'
```
