---
summary: "从 Gateway 网关 暴露兼容 OpenResponses 的 /v1/responses HTTP 端点"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "OpenResponses API"
---

# OpenResponses API (HTTP)

OpenClaw 的 Gateway 网关 可以提供兼容 OpenResponses 的 `POST /v1/responses` 端点。

此端点**默认处于禁用状态**。请先在配置中启用它。

- `POST /v1/responses`
- 与 Gateway 网关 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/responses`

在底层，请求作为正常的 Gateway 网关 代理运行执行（与 `openclaw agent` 代码路径相同），因此路由/权限/配置与您的 Gateway 网关 相匹配。

## 身份验证

使用 Gateway 网关 身份验证配置。发送 bearer token：

- `Authorization: Bearer <token>`

注意：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果配置了 `gateway.auth.rateLimit` 并且发生过多的身份验证失败，端点将返回 `429` 并附带 `Retry-After`。

## 安全边界（重要）

将此端点视为网关实例的**完全操作员访问**接口。

- 此处的 HTTP bearer 身份验证并非狭义的单用户范围模型。
- 此端点的有效 Gateway 网关 令牌/密码应被视为所有者/操作员凭据。
- 请求通过受信任的操作员操作所使用的同一控制平面代理路径运行。
- 此端点上没有单独的非所有者/每用户工具边界；一旦调用者在此处通过 Gateway 网关 身份验证，OpenClaw 会将该调用者视为此 Gateway 网关 的受信任操作员。
- 如果目标代理策略允许敏感工具，此端点可以使用它们。
- 请将此端点保持在环回/tailnet/专用入口上；不要将其直接暴露给公共互联网。

请参阅 [Security](/zh/gateway/security) 和 [Remote access](/zh/gateway/remote)。

## 选择代理

不需要自定义标头：在 OpenResponses `model` 字段中编码代理 ID：

- `model: "openclaw:<agentId>"`（示例：`"openclaw:main"`，`"openclaw:beta"`）
- `model: "agent:<agentId>"`（别名）

或者通过标头定位特定的 OpenClaw 代理：

- `x-openclaw-agent-id: <agentId>`（默认值：`main`）

高级：

- `x-openclaw-session-key: <sessionKey>` 以完全控制会话路由。

## 启用端点

将 `gateway.http.endpoints.responses.enabled` 设置为 `true`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: true },
      },
    },
  },
}
```

## 禁用端点

将 `gateway.http.endpoints.responses.enabled` 设置为 `false`：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: { enabled: false },
      },
    },
  },
}
```

## 会话行为

默认情况下，该端点是**每个请求无状态的**（每次调用都会生成新的会话密钥）。

如果请求包含 OpenResponses `user` 字符串，Gateway 网关 将从中派生一个稳定的会话密钥，以便重复调用可以共享代理会话。

## 请求形状（已支持）

该请求遵循 OpenResponses API，采用基于项目的输入。当前支持：

- `input`：字符串或项对象数组。
- `instructions`：合并到系统提示中。
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
- `previous_response_id`
- `truncation`

## 项目（输入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 会附加到系统提示词。
- 最近的 `user` 或 `function_call_output` 项将成为“当前消息”。
- 较早的用户/助手消息作为历史记录包含在上下文中。

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

出于模式兼容性考虑而被接受，但在构建提示词时被忽略。

## 工具（客户端函数工具）

使用 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果代理决定调用工具，响应将返回 `function_call` 输出项。
然后，您发送一个包含 `function_call_output` 的后续请求以继续该回合。

## 图像 (`input_image`)

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大大小（当前）：10MB。

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

最大大小（当前）：5MB。

当前行为：

- 文件内容将被解码并添加到 **系统提示词** 中，而不是用户消息中，因此它是临时的（不会持久保存在会话历史记录中）。
- PDF 会被解析为文本。如果找到的文本很少，前几页将被光栅化为图像并传递给模型。

PDF 解析使用对 Node 友好的 `pdfjs-dist` 旧版构建（无 worker）。现代
PDF.js 构建期望浏览器 worker/DOM 全局对象，因此 Gateway 中未使用它。

URL 获取默认值：

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8`（每个请求基于 URL 的 `input_file` + `input_image` 部分总计）
- 请求受保护（DNS 解析、私有 IP 阻止、重定向限制、超时）。
- 支持按输入类型设置可选的主机名允许列表（`files.urlAllowlist`, `images.urlAllowlist`）。
  - 精确主机：`"cdn.example.com"`
  - 通配符子域：`"*.assets.example.com"`（不匹配顶级域名）

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
            allowedMimes: [
              "text/plain",
              "text/markdown",
              "text/html",
              "text/csv",
              "application/json",
              "application/pdf",
            ],
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
            allowedMimes: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/heic",
              "image/heif",
            ],
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

- URL 允许列表在获取之前和重定向跳转时强制执行。
- 将主机名加入允许列表并不能绕过对私有/内部 IP 的阻止。
- 对于面向互联网的网关，除了应用级别的防护措施外，还应应用网络出口控制。
  请参阅 [安全性](/zh/gateway/security)。

## 流式传输 (SSE)

设置 `stream: true` 以接收服务器发送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每个事件行由 `event: <type>` 和 `data: <json>` 组成
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
- `response.failed` （发生错误时）

## 使用情况

当底层提供商报告 token 计数时，将填充 `usage`。

## 错误

错误使用类似如下的 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：

- `401` 身份验证缺失/无效
- `400` 请求正文无效
- `405` 方法错误

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

import zh from '/components/footer/zh.mdx';

<zh />
