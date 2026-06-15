---
summary: "OpenAIGateway(网关)从 Gateway(网关) 公开一个与 OpenAI 兼容的 /v1/chat/completions HTTP 端点"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAIOpenAI 聊天补全"
---

OpenClaw 的 Gateway(网关) 可以提供一个小型的与 OpenAI 兼容的 Chat Completions 端点。

该端点默认处于禁用状态。请先在配置中启用它。

- `POST /v1/chat/completions`
- 与 Gateway(网关) 相同的端口（WS + HTTP 多路复用）：Gateway(网关)`http://<gateway-host>:<port>/v1/chat/completions`

当 Gateway(网关) 的 OpenAI 兼容 HTTP 表面启用时，它还提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底层，请求作为正常的 Gateway(网关) 代理运行执行（与 Gateway(网关)`openclaw agent`Gateway(网关) 代码路径相同），因此路由/权限/配置与您的 Gateway(网关) 匹配。

## 身份验证

使用 Gateway(网关) 身份验证配置。

常见的 HTTP 身份验证路径：

- 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：
  `Authorization: Bearer <token-or-password>`
- 可信身份承载 HTTP 认证（`gateway.auth.mode="trusted-proxy"`）：
  通过配置的身份感知代理进行路由，并让它注入
  所需的身份标头
- 私有入口开放认证（`gateway.auth.mode="none"`）：
  不需要认证标头

注意：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 当 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自
  配置的可信代理源；同主机环回代理需要显式
  `gateway.auth.trustedProxy.allowLoopback = true`。
- 绕过代理的内部同主机调用者可以使用
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 作为本地直接
  回退。任何 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 标头证据
  都会使请求保持在可信代理路径上。
- 如果配置了 `gateway.auth.rateLimit` 并且发生了太多认证失败，端点将返回带有 `Retry-After` 的 `429`。

## 安全边界（重要）

应将此端点视为 Gateway 实例的**完全操作员访问**接口。

- 此处的 HTTP 承载者认证并非狭义的每用户范围模型。
- 此端点的有效 Gateway(网关) 令牌/密码应被视为所有者/操作员凭证。
- 请求通过受信任操作员操作相同的控制平面代理路径运行。
- 此端点上没有单独的非所有者/每用户工具边界；一旦调用者在此通过了 Gateway(网关) 身份验证，OpenClaw 就会将该调用者视为此网关的受信任操作员。
- 对于共享密钥认证模式（`token` 和 `password`），即使调用方发送了范围更窄的 `x-openclaw-scopes` 标头，该端点也会恢复正常的完整操作员默认值。
- 承载受信任身份的 HTTP 模式（例如受信任的代理认证或 `gateway.auth.mode="none"`）会在存在时遵守 `x-openclaw-scopes`，否则回退到正常的操作员默认范围集。
- 如果目标代理策略允许敏感工具，此端点可以使用它们。
- 请将此端点保持在环回/tailnet/专用入口上；不要将其直接暴露给公共互联网。

身份验证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享的网关操作员密钥
  - 忽略较窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 将此端点上的聊天轮次视为所有者-发送者轮次
- 承载受信任身份的 HTTP 模式（例如受信任的代理认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 对某个外层受信任身份或部署边界进行身份验证
  - 当标头存在时遵守 `x-openclaw-scopes`
  - 当该标头不存在时，回退到常规的操作员默认作用域集
  - 仅当调用方明确缩小范围并省略 `operator.admin` 时，才会丢失所有者语义

请参阅[安全](/zh/gateway/security)和[远程访问](/zh/gateway/remote)。

## 何时使用此端点

当您将工具或受信任的应用端后端与现有 Gateway(网关) 集成并能够安全地持有 Gateway(网关) 操作员凭据时，请使用 `/v1/chat/completions`。

- 当您的集成只是同一 Gateway(网关) 的另一个操作员/客户端界面时，首选此方式而非添加新的内置渠道。
- 对于直接连接到远程Gateway(网关)的原生移动客户端，优先使用[WebChat](<WebChat/en/web/webchatGateway(网关)>)或[Gateway(网关)协议](/zh/gateway/protocol)，并实现配对设备引导/设备令牌流，以便设备不需要共享的HTTP令牌/密码。
- 当您集成具有自己的用户、房间、Webhook传递或出站传输的外部消息网络时，请改为构建渠道插件。请参阅[构建插件](/zh/plugins/building-plugins)。

## Agent-first 模型合约

OpenClaw 将 OpenAI OpenClawOpenAI`model` 字段视为一个**代理目标**，而不是原始提供商模型 ID。

- `model: "openclaw"` 路由到配置的默认代理。
- `model: "openclaw/default"` 也路由到配置的默认代理。
- `model: "openclaw/<agentId>"` 路由到特定的代理。

可选请求头：

- `x-openclaw-model: <provider/model-or-bare-id>` 覆盖所选代理的后端模型。
- `x-openclaw-agent-id: <agentId>` 仍作为兼容性覆盖项受到支持。
- `x-openclaw-session-key: <sessionKey>` 完全控制会话路由。
- `x-openclaw-message-channel: <channel>` 为感知渠道的提示和策略设置合成入站渠道上下文。

仍接受的兼容性别名：

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

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

如果请求包含 OpenAI OpenAI`user`Gateway(网关) 字符串，Gateway 会据此派生一个稳定的会话密钥，以便重复调用可以共享一个代理会话。

对于自定义应用程序，最安全的默认做法是在每个对话线程中重用相同的 `user`OpenClaw 值。除非您明确希望多个对话或设备共享一个 OpenClaw 会话，否则避免使用账户级标识符。当您需要跨多个客户端或线程进行显式路由控制时，请使用 `x-openclaw-session-key`。

## 为什么此接口很重要

这是自托管前端和工具中杠杆率最高的兼容性集合：

- 大多数 Open WebUI、LobeChat 和 LibreChat 设置都期望 `/v1/models`。
- 许多 RAG 系统期望 `/v1/embeddings`。
- 现有的 OpenAI 聊天客户端通常可以从 OpenAI`/v1/chat/completions` 开始。
- 更多面向代理的客户端越来越倾向于 `/v1/responses`。

## 模型列表和代理路由

<AccordionGroup>
  <Accordion title="`/v1/models` 返回什么？"OpenClaw>
    一个 OpenClaw 代理目标列表。

    返回的 id 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`OpenAI 条目。
    将它们直接用作 OpenAI `model` 值。

  </Accordion>
  <Accordion title="`/v1/models`%PH:INLINE_CODE:97:70c695da%% 列出的是代理还是子代理？">
    它列出的是顶级代理目标，而不是后端提供商模型，也不是子代理。

    子代理仍然是内部执行拓扑。它们不会显示为伪模型。

  </Accordion>
  <Accordion title="为什么要包含 `openclaw/default`？">
    `openclaw/default` 是配置的默认代理的稳定别名。

    这意味着即使实际的默认代理 id 在不同环境之间发生变化，客户端也可以继续使用一个可预测的 id。

  </Accordion>
  <Accordion title="如何覆盖后端模型？">
    使用 `x-openclaw-model`。

    示例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果省略它，所选代理将使用其正常配置的模型选择运行。

  </Accordion>
  <Accordion title="嵌入如何适应此协议？">
    `/v1/embeddings` 使用相同的代理目标 `model` id。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    当您需要特定的嵌入模型时，请在 `x-openclaw-model` 中发送它。
    如果没有该标头，请求将传递到所选代理的正常嵌入设置。

  </Accordion>
</AccordionGroup>

## 流式传输 (SSE)

设置 `stream: true` 以接收服务器发送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每个事件行是 `data: <json>`
- 流以 `data: [DONE]` 结束

## 聊天工具协议

`/v1/chat/completions`OpenAI 支持与常见 OpenAI 聊天客户端兼容的功能工具子集。

### 支持的请求字段

- `tools`: `{ "type": "function", "function": { ... } }` 数组
- `tool_choice`：`"auto"`、`"none"`、`"required"`或`{ "type": "function", "function": { "name": "..." } }`
- `messages[*].role: "tool"` 后续轮次
- `messages[*].tool_call_id` 用于将工具结果绑定回先前的工具调用
- `max_completion_tokens`OpenAI：数字；每次调用的补全总令牌（包括推理令牌）上限。当前的OpenAI Chat Completions字段名称；当同时发送`max_completion_tokens`和`max_tokens`时首选此项。
- `max_tokens`：数字；为向后兼容而接受的旧别名。如果同时存在`max_completion_tokens`，则此项将被忽略。
- `temperature`：数字；通过代理流参数渠道转发给上游提供商的最佳采样温度。
- `top_p`：数字；通过代理流参数渠道转发给上游提供商的最佳核心采样。
- `frequency_penalty`：数字；通过代理流参数渠道转发给上游提供商的最佳频率惩罚。有效范围：-2.0 到 2.0。对于超出范围的值，返回`400 invalid_request_error`。
- `presence_penalty`：数字；通过代理流参数渠道转发给上游提供商的最佳存在惩罚。有效范围：-2.0 到 2.0。对于超出范围的值，返回`400 invalid_request_error`。
- `seed`：number（整数）；通过 agent stream-param 渠道尽力转发给上游提供商的种子。对于非整数值，返回 `400 invalid_request_error`。
- `stop`：字符串或最多包含 4 个字符串的数组；通过 agent stream-param 渠道尽力转发给上游提供商的停止序列。对于超过 4 个序列或非字符串/空条目，返回 `400 invalid_request_error`。

当设置了任一 token-cap 字段时，该值会通过 agent stream-param 渠道转发给上游提供商。发送给上游提供商的实际线端字段名称由提供商传输选择：OpenAI 系列端点使用 `max_completion_tokens`，而只接受旧名称的提供商（如 Mistral 和 Chutes）使用 `max_tokens`。采样字段（`temperature`、`top_p`、`frequency_penalty`、`presence_penalty`、`seed`）遵循相同的 stream-param 渠道；由于使用固定采样，基于 ChatGPT 的 Codex Responses 后端会在服务器端将其剥离。`stop` 也通过 stream-param 渠道传输，并映射到传输的 stop 字段（Chat Completions 后端为 `stop`，Anthropic 为 `stop_sequences`）；OpenAI Responses API 没有 stop 参数，因此 `stop` 不会应用于基于 Responses 的模型。

### 不支持的变体

对于不支持的工具变体，端点返回 `400 invalid_request_error`，包括：

- 非数组 `tools`
- 非函数工具条目
- 缺少 `tool.function.name`
- `tool_choice` 变体，如 `allowed_tools` 和 `custom`
- 与提供的 `tools` 不匹配的 `tool_choice.function.name` 值

对于 `tool_choice: "required"` 和函数固定的 `tool_choice`，该端点会缩小暴露的客户端函数工具集，指示运行时在响应之前调用客户端工具，并在代理响应未包含匹配的结构化客户端工具调用时返回错误。此契约适用于调用方提供的 HTTP `tools`OpenClaw 列表，而非每个内部 OpenClaw 代理工具。

### 非流式工具响应结构

当代理决定调用工具时，响应使用：

- `choices[0].finish_reason = "tool_calls"`
- `choices[0].message.tool_calls[]` 条目包含：
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments` (JSON 字符串)

工具调用之前的助手注释在 `choices[0].message.content` 中返回（可能为空）。

### 流式工具响应结构

当 `stream: true` 时，工具调用作为增量 SSE 块发出：

- 初始助手角色增量
- 可选的助手评论增量
- 一个或多个 `delta.tool_calls` 块，携带工具标识和参数片段
- 带有 `finish_reason: "tool_calls"` 的最后一个块
- `data: [DONE]`

如果 `stream_options.include_usage=true`，则在 `[DONE]` 之前发出一个尾随的使用情况块。

### 工具后续循环

收到 `tool_calls` 后，客户端应执行请求的函数并发送包含以下内容的后续请求：

- 先前的助手工具调用消息
- 一个或多个带有匹配 `tool_call_id` 的 `role: "tool"` 消息

这允许 Gateway 代理运行继续相同的推理循环并生成最终的助手答案。

## Open WebUI 快速设置

对于基本的 Open WebUI 连接：

- 基础 URL：`http://127.0.0.1:18789/v1`
- macOS 上的 Docker 基础 URL：DockermacOS`http://host.docker.internal:18789/v1`
- API key: 您的 Gateway(网关) bearer token
- 模型：`openclaw/default`

预期行为：

- `GET /v1/models` 应列出 `openclaw/default`
- Open WebUI 应使用 `openclaw/default` 作为聊天模型 ID
- 如果您希望该代理使用特定的后端提供商/模型，请设置代理的正常默认模型或发送 `x-openclaw-model`

快速测试：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，大多数 Open WebUI 设置可以使用相同的基础 URL 和令牌进行连接。

## 示例

单个应用对话的稳定会话：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "user": "conv:YOUR_CONVERSATION_ID",
    "messages": [{"role":"user","content":"Summarize my tasks for today"}]
  }'
```

在后续针对该对话的调用中重用相同的 `user` 值，以继续同一个代理会话。

非流式：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

流式：

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/gpt-5.4' \
  -d '{
    "model": "openclaw/research",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

列出模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

获取单个模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models/openclaw%2Fdefault \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

创建嵌入：

```bash
curl -sS http://127.0.0.1:18789/v1/embeddings \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-model: openai/text-embedding-3-small' \
  -d '{
    "model": "openclaw/default",
    "input": ["alpha", "beta"]
  }'
```

注意：

- `/v1/models`OpenClaw 返回 OpenClaw 代理目标，而不是原始提供商目录。
- `openclaw/default` 始终存在，因此一个稳定的 ID 可以在不同环境中使用。
- 后端提供商/模型覆盖属于 `x-openclaw-model`OpenAI，而不是 OpenAI `model` 字段。
- `/v1/embeddings` 支持 `input` 作为字符串或字符串数组。

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [OpenAI](OpenAI/en/providers/openai)
