---
summary: "从 Gateway(网关) 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI Chat Completions"
---

# OpenAI Chat Completions (HTTP)

OpenClaw 的 Gateway(网关) 网关 可以提供一个小型的兼容 OpenAI 的 Chat Completions 端点。

该端点**默认处于禁用状态**。请先在配置中启用它。

- `POST /v1/chat/completions`
- 与 Gateway(网关) 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/chat/completions`

当 Gateway(网关) 的兼容 OpenAI 的 HTTP 表面启用时，它还提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底层，请求作为正常的 Gateway(网关) agent 运行执行（与 `openclaw agent` 代码路径相同），因此路由/权限/配置与您的 Gateway(网关) 匹配。

## 身份验证

使用 Gateway(网关) 身份验证配置。发送 bearer token：

- `Authorization: Bearer <token>`

说明：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果配置了 `gateway.auth.rateLimit` 并且发生太多身份验证失败，端点将返回 `429` 并带有 `Retry-After`。

## 安全边界（重要）

将此端点视为网关实例的 **完全操作员访问** 表面。

- 此处的 HTTP bearer 身份验证不是狭窄的每用户范围模型。
- 此端点的有效 Gateway(网关) 令牌/密码应被视为所有者/操作员凭据。
- 请求通过与受信任的操作员操作相同的控制平面 agent 路径运行。
- 此端点上没有单独的非所有者/每用户工具边界；一旦调用者通过 Gateway(网关) 身份验证，OpenClaw 会将该调用者视为此网关的受信任操作员。
- 对于共享密钥身份验证模式（`token` 和 `password`），即使调用方发送了范围更窄的 `x-openclaw-scopes` 标头，该端点也会恢复正常的完整操作员默认值。
- 携带身份的可信 HTTP 模式（例如可信代理身份验证或 `gateway.auth.mode="none"`）仍然会遵守请求中声明的操作员范围。
- 如果目标代理策略允许敏感工具，此端点可以使用它们。
- 请将此端点保持在环回/tailnet/专用入站访问；不要直接将其暴露给公共互联网。

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享的网关操作员密钥
  - 忽略更狭义的 `x-openclaw-scopes`
  - 恢复完整的默认操作员作用域集
  - 将此端点上的聊天轮次视为所有者发送者的轮次
- 承载身份的可信 HTTP 模式（例如可信代理身份验证，或专用入口上的 `gateway.auth.mode="none"`）
  - 对某些外部受信任身份或部署边界进行身份验证
  - 遵守声明的 `x-openclaw-scopes` 标头
  - 只有当 `operator.admin` 实际存在于这些声明的作用域中时，才会获得所有者语义

请参阅[安全性](/en/gateway/security)和[远程访问](/en/gateway/remote)。

## Agent-first 模型契约

OpenClaw 将 OpenAI `model` 字段视为 **智能体目标**，而非原始提供商模型 ID。

- `model: "openclaw"` 路由到配置的默认智能体。
- `model: "openclaw/default"` 也路由到配置的默认代理。
- `model: "openclaw/<agentId>"` 路由到特定的代理。

可选的请求标头：

- `x-openclaw-model: <provider/model-or-bare-id>` 会覆盖所选代理的模型。
- `x-openclaw-agent-id: <agentId>` 作为兼容性覆盖参数仍然受支持。
- `x-openclaw-session-key: <sessionKey>` 完全控制会话路由。
- `x-openclaw-message-channel: <channel>` 为感知渠道的提示词和策略设置合成入站渠道上下文。

仍然接受的兼容别名：

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

如果请求包含 OpenAI `user` 字符串，Gateway(网关) 会从中派生一个稳定的会话密钥，以便重复调用可以共享一个代理会话。

## 为什么此接口很重要

对于自托管前端和工具来说，这是性价比最高的兼容性集合：

- 大多数 Open WebUI、LobeChat 和 LibreChat 设置都需要 `/v1/models`。
- 许多 RAG 系统都期望使用 `/v1/embeddings`。
- 现有的 OpenAI 聊天客户端通常可以从 `/v1/chat/completions` 开始。
- 更多代理原生的客户端越来越倾向于使用 `/v1/responses`。

## 模型列表和代理路由

<AccordionGroup>
  <Accordion title="`/v1/models` 会返回什么？">
    一个 OpenClaw 代理目标列表。

    返回的 ID 为 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 条目。
    可以直接将它们用作 OpenAI `model` 值。

  </Accordion>
  <Accordion title="`/v1/models` 是否列出代理或子代理？">
    它列出的是顶层代理目标，而不是后端提供商模型，也不是子代理。

    子代理仍然是内部执行拓扑。它们不会显示为伪模型。

  </Accordion>
  <Accordion title="为何包含 `openclaw/default`？">
    `openclaw/default` 是已配置默认代理的稳定别名。

    这意味着即使各环境间的实际默认代理 ID 发生变化，客户端仍可继续使用一个可预测的 ID。

  </Accordion>
  <Accordion title="如何覆盖后端模型？">
    使用 `x-openclaw-model`。

    示例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.4`

    如果省略它，所选的代理将使用其正常配置的模型运行。

  </Accordion>
  <Accordion title="嵌入如何适应此合约？">
    `/v1/embeddings` 使用相同的 agent-target `model` ids。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    当您需要特定的嵌入模型时，请在 `x-openclaw-model` 中发送它。
    如果没有该标头，请求将传递到所选代理的常规嵌入设置。

  </Accordion>
</AccordionGroup>

## 流式传输 (SSE)

设置 `stream: true` 以接收服务器发送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每个事件行都是 `data: <json>`
- 流结束于 `data: [DONE]`

## Open WebUI 快速设置

对于基本的 Open WebUI 连接：

- 基础 URL：`http://127.0.0.1:18789/v1`
- macOS 上的 Docker 基础 URL：`http://host.docker.internal:18789/v1`
- API 密钥：您的 Gateway(网关) Bearer 令牌
- 模型：`openclaw/default`

预期行为：

- `GET /v1/models` 应列出 `openclaw/default`
- Open WebUI 应使用 `openclaw/default` 作为聊天模型 ID
- 如果需要为该代理指定特定的后端提供商/模型，请设置代理的正常默认模型或发送 `x-openclaw-model`

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

获取一个模型：

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

- `/v1/models` 返回 OpenClaw 代理目标，而不是原始提供商目录。
- `openclaw/default` 始终存在，因此一个稳定的 ID 可以在不同环境中使用。
- 后端提供商/模型覆盖属于 `x-openclaw-model`，而非 OpenAI `model` 字段。
- `/v1/embeddings` 支持将 `input` 作为字符串或字符串数组。
