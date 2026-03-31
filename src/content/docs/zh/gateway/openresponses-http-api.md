---
summary: "从Gateway(网关)暴露一个OpenResponses兼容的 /v1/responses HTTP 端点"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "OpenResponses API"
---

# OpenResponses API (HTTP)

OpenClaw 的 Gateway(网关)可以提供一个 OpenResponses 兼容的 `POST /v1/responses` 端点。

此端点**默认处于禁用状态**。请先在配置中启用它。

- `POST /v1/responses`
- 与 Gateway(网关) 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/responses`

在底层，请求作为正常的 Gateway(网关) 代理运行执行（与 `openclaw agent` 代码路径相同），因此路由/权限/配置与您的 Gateway(网关) 匹配。

## 身份验证、安全和路由

操作行为与 [OpenAI Chat Completions](/en/gateway/openai-http-api) 匹配：

- 使用 `Authorization: Bearer <token>` 配合正常的 Gateway(网关) 身份验证配置
- 将该端点视为对 gateway 实例的完整操作员访问权限
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 选择代理
- 当您想覆盖所选代理的后端模型时，请使用 `x-openclaw-model`
- 使用 `x-openclaw-session-key` 进行显式会话路由
- 当您需要非默认的合成入站渠道上下文时，请使用 `x-openclaw-message-channel`

使用 `gateway.http.endpoints.responses.enabled` 启用或禁用此端点。

相同的兼容性界面还包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

有关代理目标模型、`openclaw/default`、嵌入传递和后端模型覆盖如何组合在一起的规范说明，请参阅 [OpenAI Chat Completions](/en/gateway/openai-http-api#agent-first-model-contract) 和 [模型列表和代理路由](/en/gateway/openai-http-api#model-list-and-agent-routing)。

## 会话行为

默认情况下，该端点是**每个请求无状态的**（每次调用都会生成一个新的会话密钥）。

如果请求包含 OpenResponses `user` 字符串，Gateway(网关) 会从中派生出一个稳定的会话密钥，以便重复调用可以共享代理会话。

## 请求形状（已支持）

请求遵循具有基于项目输入的 OpenResponses API。当前支持：

- `input`：字符串或项目对象数组。
- `instructions`：合并到系统提示词中。
- `tools`：客户端工具定义（函数工具）。
- `tool_choice`：过滤或要求客户端工具。
- `stream`：启用 SSE 流式传输。
- `max_output_tokens`：尽力而为的输出限制（取决于提供商）。
- `user`：稳定的会话路由。

已接受但**当前被忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

支持：

- `previous_response_id`：当请求保持在同一个 agent/user/requested-会话 范围内时，OpenClaw 会重用之前的响应会话。

## Items（输入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 会被附加到系统提示词中。
- 最近的 `user` 或 `function_call_output` 项将成为“当前消息”。
- 之前的用户/助手消息会作为上下文历史包含在内。

### `function_call_output`（基于回合的工具）

将工具结果发送回模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 和 `item_reference`

出于架构兼容性而被接受，但在构建提示词时被忽略。

## 工具（客户端函数工具）

使用 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果 Agent 决定调用工具，响应将返回一个 `function_call` 输出项。
随后，您需要发送一个带有 `function_call_output` 的后续请求以继续该回合。

## 图像 (`input_image`)

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大尺寸（当前）：10MB。

## 文件 (`input_file`)

支持 base64 或 URL 来源：

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

允许的 MIME 类型（当前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

最大尺寸（当前）：5MB。

当前行为：

- 文件内容将被解码并添加到**系统提示词**中，而不是用户消息中，
  因此它保持临时状态（不会持久保存在会话历史中）。
- PDF 将解析文本。如果发现的文本很少，前几页将被光栅化
  为图像并传递给模型。

PDF 解析使用兼容 Node 的 `pdfjs-dist` 旧版构建（无 worker）。现代版 PDF.js 构建需要浏览器 worker/DOM 全局变量，因此未在 Gateway(网关) 中使用。

URL 获取默认值：

- `files.allowUrl`：`true`
- `images.allowUrl`：`true`
- `maxUrlParts`：`8`（每个请求中基于 URL 的 `input_file` + `input_image` 部分总计）
- 请求受保护（DNS 解析、私有 IP 阻断、重定向上限、超时）。
- 支持按输入类型（`files.urlAllowlist`、`images.urlAllowlist`）设置可选的主机名允许列表。
  - 精确主机：`"cdn.example.com"`
  - 通配符子域：`"*.assets.example.com"`（不匹配顶点域）
  - 允许列表为空或省略表示没有主机名允许列表限制。
- 要完全禁用基于 URL 的获取，请设置 `files.allowUrl: false` 和/或 `images.allowUrl: false`。

## 文件 + 图像限制（配置）

可以在 `gateway.http.endpoints.responses` 下调整默认值：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          maxUrlParts: 8,
          files: {
            allowUrl: true,
            urlAllowlist: ["cdn.example.com", "*.assets.example.com"],
            allowedMimes: ["text/plain", "text/markdown", "text/html", "text/csv", "application/json", "application/pdf"],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200,
            },
          },
          images: {
            allowUrl: true,
            urlAllowlist: ["images.example.com"],
            allowedMimes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000,
          },
        },
      },
    },
  },
}
```

省略时的默认值：

- `maxBodyBytes`：20MB
- `maxUrlParts`：8
- `files.maxBytes`：5MB
- `files.maxChars`：200k
- `files.maxRedirects`：3
- `files.timeoutMs`：10s
- `files.pdf.maxPages`：4
- `files.pdf.maxPixels`：4,000,000
- `files.pdf.minTextChars`：200
- `images.maxBytes`：10MB
- `images.maxRedirects`：3
- `images.timeoutMs`：10s
- 接受 HEIC/HEIF `input_image` 源，并在交付给提供商之前将其规范化为 JPEG。

安全提示：

- 在获取之前和重定向跳转时会强制执行 URL 允许列表。
- 将主机名加入允许列表并不能绕过私有/内部 IP 阻断。
- 对于暴露于互联网的 Gateway(网关)，除了应用级防护外，还应应用网络出口控制。
  请参阅 [安全](/en/gateway/security)。

## 流式传输 (SSE)

设置 `stream: true` 以接收服务器发送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每个事件行都是 `event: <type>` 和 `data: <json>`
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
- `response.failed` (错误时)

## 使用情况

当底层提供商报告 token 计数时，会填充 `usage`。

## 错误

错误使用如下 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：

- `401` 缺失/无效的认证
- `400` 无效的请求体
- `405` 错误的方法

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
