---
summary: "从Gateway(网关)暴露一个OpenResponses兼容的 /v1/responses HTTP 端点"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "OpenResponses API"
---

# OpenResponses API (HTTP)

OpenClaw 的 Gateway 可以提供与 OpenResponses 兼容的 `POST /v1/responses` 端点。

此端点**默认处于禁用状态**。请先在配置中启用它。

- `POST /v1/responses`
- 与 Gateway 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/responses`

在底层，请求作为正常的 Gateway 代理运行执行（与 `openclaw agent` 的代码路径相同），因此路由/权限/配置与您的 Gateway 匹配。

## 身份验证、安全和路由

操作行为与 [OpenAI Chat Completions](/en/gateway/openai-http-api) 相匹配：

- 使用匹配的 Gateway HTTP 认证路径：
  - shared-secret 认证（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
  - trusted-proxy 认证（`gateway.auth.mode="trusted-proxy"`）：来自配置的非环回受信任代理源的具有身份感知的代理标头
  - private-ingress 开放认证（`gateway.auth.mode="none"`）：无认证标头
- 将该端点视为网关实例的完全操作员访问权限
- 对于 shared-secret 认证模式（`token` 和 `password`），忽略较窄的 bearer 声明的 `x-openclaw-scopes` 值并恢复正常的标准操作员默认值
- 对于受信任的承载身份的 HTTP 模式（例如受信任的代理认证或 `gateway.auth.mode="none"`），如果存在 `x-openclaw-scopes` 则遵循，否则回退到正常的操作员默认范围集
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 选择代理
- 当您想要覆盖所选代理的后端模型时，使用 `x-openclaw-model`
- 使用 `x-openclaw-session-key` 进行显式会话路由
- 当您需要非默认的合成入站渠道上下文时，使用 `x-openclaw-message-channel`

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享的网关操作员密钥
  - 忽略较窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的聊天轮次视为所有者-发送者轮次
- 可信的身份承载 HTTP 模式（例如可信代理身份验证，或私有入口上的 `gateway.auth.mode="none"`）
  - 当标头存在时遵守 `x-openclaw-scopes`
  - 当标头不存在时，回退到正常的操作员默认范围集
  - 仅当调用方显式缩小范围并省略 `operator.admin` 时，才会失去所有者语义

使用 `gateway.http.endpoints.responses.enabled` 启用或禁用此端点。

相同的兼容性表面还包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

有关代理目标模型、`openclaw/default`、嵌入直通和后端模型覆盖如何组合在一起的权威说明，请参阅 [OpenAI 聊天补全](/en/gateway/openai-http-api#agent-first-model-contract) 和 [模型列表和代理路由](/en/gateway/openai-http-api#model-list-and-agent-routing)。

## 会话行为

默认情况下，该端点是**每个请求无状态的**（每次调用都会生成一个新的会话密钥）。

如果请求包含 OpenResponses `user` 字符串，Gateway(网关) 会从中派生一个稳定的会话密钥，以便重复调用可以共享一个代理会话。

## 请求形状（支持的）

请求遵循 OpenResponses API 并采用基于项的输入。当前支持：

- `input`：字符串或项对象数组。
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

- `previous_response_id`：当请求保持在同一代理/用户/请求会话范围内时，OpenClaw 会重用之前的响应会话。

## Items (input)

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 会被附加到系统提示词中。
- 最近的 `user` 或 `function_call_output` 项将成为“当前消息”。
- 较早的用户/助理消息会作为历史记录包含在内以提供上下文。

### `function_call_output` (turn-based tools)

将工具结果发送回模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 和 `item_reference`

接受此项以保持架构兼容性，但在构建提示词时会被忽略。

## Tools (client-side function tools)

通过 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果代理决定调用工具，响应将返回一个 `function_call` 输出项。
然后，您发送一个包含 `function_call_output` 的后续请求以继续该轮次。

## Images (`input_image`)

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大大小（当前）：10MB。

## Files (`input_file`)

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

最大大小（当前）：5MB。

当前行为：

- 文件内容会被解码并添加到 **系统提示词** 中，而不是用户消息中，
  因此它保持临时状态（不会保留在会话历史记录中）。
- 解码后的文件文本在添加之前会被包装为**不受信任的外部内容**，因此文件字节被视为数据，而不是受信任的指令。
- 注入的块使用显式边界标记，如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，并且包含
  `Source: External` 元数据行。
- 此文件输入路径有意省略了冗长的 `SECURITY NOTICE:` 横幅以
  保留提示词预算；边界标记和元数据仍然保留。
- PDF 首先被解析为文本。如果发现的文本很少，首页将被
  光栅化为图像并传递给模型，并且注入的文件块使用
  占位符 `[PDF content rendered to images]`。

PDF 解析使用兼容 Node 的 `pdfjs-dist` 旧版构建（无 worker）。现代
PDF.js 构建需要浏览器 worker/DOM 全局变量，因此未在 Gateway 中使用。

URL 获取默认值：

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8`（每个请求基于 URL 的 `input_file` + `input_image` 部分总计）
- 请求受到保护（DNS 解析、私有 IP 阻断、重定向限制、超时）。
- 支持按输入类型（`files.urlAllowlist`，`images.urlAllowlist`）配置可选的主机名允许列表。
  - 精确主机： `"cdn.example.com"`
  - 通配符子域名： `"*.assets.example.com"`（不匹配顶级域名）
  - 空或省略的允许列表意味着没有主机名允许列表限制。
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

- `maxBodyBytes`: 20MB
- `maxUrlParts`: 8
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
- 接受 HEIC/HEIF `input_image` 源，并在交付给提供商之前将其标准化为 JPEG。

安全提示：

- URL 允许列表在获取之前以及重定向跳转时强制执行。
- 将主机名列入允许列表并不会绕过私有/内部 IP 阻止。
- 对于暴露于互联网的网关，除应用程序级别的防护措施外，还应应用网络出口控制。
  请参阅[安全性](/en/gateway/security)。

## 流式传输 (SSE)

设置 `stream: true` 以接收服务器发送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每个事件行包含 `event: <type>` 和 `data: <json>`
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
- `response.failed` (出错时)

## 使用情况

当底层提供商报告令牌计数时，将填充 `usage`。
在那些计数器到达下游状态/会话表面之前，OpenClaw 会标准化常见的 OpenAI 样式别名，包括 `input_tokens` / `output_tokens`
和 `prompt_tokens` / `completion_tokens`。

## 错误

错误使用类似以下的 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：

- `401` 缺失/无效的身份验证
- `400` 无效的请求正文
- `405` 错误的方法

## 示例

非流式传输：

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

流式传输：

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
