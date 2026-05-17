---
summary: "从 Gateway(网关) 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI chat completions"
---

OpenClaw 的 Gateway(网关) 可以提供一个小型的与 OpenAI 兼容的 Chat Completions 端点。

该端点默认处于禁用状态。请先在配置中启用它。

- `POST /v1/chat/completions`
- 与 Gateway(网关) 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/chat/completions`

当 Gateway(网关) 的 OpenAI 兼容 HTTP 表面启用时，它还提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底层，请求作为正常的 Gateway(网关) 代理运行执行（与 `openclaw agent` 代码路径相同），因此路由/权限/配置与您的 Gateway(网关) 匹配。

## 身份验证

使用 Gateway(网关) 身份验证配置。

常见的 HTTP 身份验证路径：

- 共享密钥身份验证 (`gateway.auth.mode="token"` 或 `"password"`):
  `Authorization: Bearer <token-or-password>`
- 受信任的承载身份的 HTTP 身份验证 (`gateway.auth.mode="trusted-proxy"`):
  通过配置的感知身份代理进行路由，并让其注入
  所需的身份标头
- 私有入口开放身份验证 (`gateway.auth.mode="none"`):
  不需要身份验证标头

注意：

- 当使用 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 当使用 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 当 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自
  配置的受信任代理源；同主机回环代理需要显式
  `gateway.auth.trustedProxy.allowLoopback = true`。
- 如果配置了 `gateway.auth.rateLimit` 并且发生太多身份验证失败，端点将返回带有 `Retry-After` 的 `429`。

## 安全边界（重要）

请将此端点视为网关实例的 **完全操作员访问** 表面。

- 此处的 HTTP 持有者身份验证并非狭窄的每用户范围模型。
- 此端点的有效 Gateway(网关) 令牌/密码应被视为所有者/操作员凭据。
- 请求通过与受信任的操作员操作相同的控制平面代理路径运行。
- 在此端点上，没有单独的非所有者/每用户工具边界；一旦调用者在此处通过了 Gateway(网关) 身份验证，OpenClaw 就会将该调用者视为此网关的可信操作员。
- 对于共享密钥身份验证模式（`token` 和 `password`），即使调用方发送了更窄的 `x-openclaw-scopes` 标头，端点也会恢复正常的完整操作员默认值。
- 受信任的承载身份的 HTTP 模式（例如受信任的代理身份验证或 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会遵从它，否则回退到正常的操作员默认范围集。
- 如果目标代理策略允许敏感工具，此端点可以使用它们。
- 请将此端点保持在 loopback/tailnet/私有入口上；不要将其直接暴露给公共互联网。

身份验证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享网关操作员密钥
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 将此端点上的聊天轮次视为所有者发送者轮次
- 受信任的承载身份的 HTTP 模式（例如受信任的代理身份验证，或私有入口上的 `gateway.auth.mode="none"`）
  - 验证某些外部可信身份或部署边界
  - 当标头存在时遵从 `x-openclaw-scopes`
  - 当标头不存在时，回退到标准操作员默认范围集
  - 仅当调用方显式缩小范围并省略 `operator.admin` 时才会失去所有者语义

请参阅 [安全性](/zh/gateway/security) 和 [远程访问](/zh/gateway/remote)。

## 代理优先模型合约

OpenClaw 将 OpenAI OpenClawOpenAI`model` 字段视为 **代理目标**，而不是原始提供商模型 ID。

- `model: "openclaw"` 路由到配置的默认代理。
- `model: "openclaw/default"` 也路由到配置的默认代理。
- `model: "openclaw/<agentId>"` 路由到特定的代理。

可选请求头：

- `x-openclaw-model: <provider/model-or-bare-id>` 覆盖所选代理的后端模型。
- `x-openclaw-agent-id: <agentId>` 仍作为兼容性覆盖项受到支持。
- `x-openclaw-session-key: <sessionKey>` 完全控制会话路由。
- `x-openclaw-message-channel: <channel>` 为感知渠道的提示词和策略设置合成入站渠道上下文。

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

默认情况下，该端点是**每个请求无状态的**（每次调用都会生成一个新的会话密钥）。

如果请求包含 OpenAI `user` 字符串，Gateway(网关) 会从中派生一个稳定的会话密钥，以便重复调用可以共享一个代理会话。

## 为什么这个接口很重要

这是针对自托管前端和工具的杠杆率最高的兼容性集合：

- 大多数 Open WebUI、LobeChat 和 LibreChat 设置都期望 `/v1/models`。
- 许多 RAG 系统期望 `/v1/embeddings`。
- 现有的 OpenAI 聊天客户端通常可以从 `/v1/chat/completions` 开始。
- 更多代理原生客户端 increasingly 偏好 `/v1/responses`。

## 模型列表和代理路由

<AccordionGroup>
  <Accordion title="`/v1/models` 返回什么？">
    一个 OpenClaw 代理目标列表。

    返回的 ID 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 条目。
    将它们直接用作 OpenAI `model` 值。

  </Accordion>
  <Accordion title="`/v1/models` 列出的是代理还是子代理？">
    它列出的是顶层代理目标，而不是后端提供商模型，也不是子代理。

    子代理仍然是内部执行拓扑。它们不会作为伪模型出现。

  </Accordion>
  <Accordion title="为什么包含 `openclaw/default`？">
    `openclaw/default` 是已配置默认代理的稳定别名。

    这意味着即使实际默认代理 ID 在不同环境之间发生变化，客户端仍可继续使用一个可预测的 ID。

  </Accordion>
  <Accordion title="如何覆盖后端模型？">
    使用 `x-openclaw-model`。

    示例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果省略它，所选代理将使用其正常配置的模型选择运行。

  </Accordion>
  <Accordion title="嵌入如何适配此契约？">
    `/v1/embeddings` 使用相同的代理目标 `model` ID。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    当您需要特定的嵌入模型时，请在 `x-openclaw-model` 中发送它。
    如果没有该标头，请求将传递到所选代理的正常嵌入设置。

  </Accordion>
</AccordionGroup>

## 流式传输 (SSE)

设置 `stream: true` 以接收服务器发送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每行事件均为 `data: <json>`
- 流以 `data: [DONE]` 结束

## Chat 工具 contract

`/v1/chat/completions` 支持与常见 OpenAI Chat 客户端兼容的 function-工具 子集。

### 支持的请求字段

- `tools`：`{ "type": "function", "function": { ... } }` 的数组
- `tool_choice`: `"auto"`, `"none"`
- `messages[*].role: "tool"` 后续轮次
- `messages[*].tool_call_id` 用于将工具结果绑定回先前的工具调用
- `max_completion_tokens`: number; 单次调用总补全令牌（包括推理令牌）的上限。当前 OpenAI Chat Completions 字段名称；当同时发送 `max_completion_tokens` 和 `max_tokens` 时优先使用。
- `max_tokens`: number; 为向后兼容而接受的旧别名。当同时存在 `max_completion_tokens` 时将被忽略。

当任一字段被设置时，该值会通过代理流参数通道转发给上游提供商。发送给上游提供商的实际线端字段名称由提供商传输方式选择：对于 OpenAI 系列端点，使用 `max_completion_tokens`；对于仅接受传统名称的提供商（例如 Mistral 和 Chutes），使用 `max_tokens`。

### 不支持的变体

对于不受支持的工具变体，端点将返回 `400 invalid_request_error`，包括：

- 非数组 `tools`
- 非函数工具条目
- 缺少 `tool.function.name`
- `tool_choice` 变体，例如 `allowed_tools` 和 `custom`
- `tool_choice: "required"`（尚未在运行时强制执行；将在实施严格强制执行后支持）
- `tool_choice: { "type": "function", "function": { "name": "..." } }`（理由与 `required` 相同）
- 与提供的 `tools` 不匹配的 `tool_choice.function.name` 值

### 非流式工具响应形状

当代理决定调用工具时，响应使用：

- `choices[0].finish_reason = "tool_calls"`
- `choices[0].message.tool_calls[]` 条目包含：
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments` （JSON 字符串）

工具调用之前的助手评论在 `choices[0].message.content` 中返回（可能为空）。

### 流式工具响应结构

当 `stream: true` 时，工具调用以增量 SSE 块的形式发出：

- 初始助手角色增量
- 可选的助手注释增量
- 一个或多个携带工具标识和参数片段的 `delta.tool_calls` 块
- 带有 `finish_reason: "tool_calls"` 的最终块
- `data: [DONE]`

如果 `stream_options.include_usage=true`，则在 `[DONE]` 之前发出一个尾随的使用量块。

### 工具后续循环

收到 `tool_calls` 后，客户端应执行请求的函数并发送包含以下内容的后续请求：

- 之前的助手工具调用消息
- 一条或多条具有匹配 `tool_call_id` 的 `role: "tool"` 消息

这允许网关代理运行继续相同的推理循环并生成最终的助手回答。

## Open WebUI 快速设置

对于基本的 Open WebUI 连接：

- 基础 URL：`http://127.0.0.1:18789/v1`
- macOS 上的 Docker 基础 URL：DockermacOS`http://host.docker.internal:18789/v1`
- API 密钥：您的 Gateway(网关) bearer token
- 模型：`openclaw/default`

预期行为：

- `GET /v1/models` 应该列出 `openclaw/default`
- Open WebUI 应将 `openclaw/default` 用作聊天模型 ID
- 如果您希望为该代理指定特定的后端提供商/模型，请设置代理的常规默认模型或发送 `x-openclaw-model`

快速冒烟测试：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，大多数 Open WebUI 设置可以使用相同的基础 URL 和令牌进行连接。

## 示例

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

- `/v1/models`OpenClaw 返回 OpenClaw agent 目标，而非原始提供商目录。
- `openclaw/default` 始终存在，因此一个稳定的 ID 可在所有环境中使用。
- 后端提供商/模型覆盖应位于 `x-openclaw-model`OpenAI 中，而非 OpenAI 的 `model` 字段。
- `/v1/embeddings` 支持 `input` 为字符串或字符串数组。

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [OpenAI](/zh/providers/openai)
