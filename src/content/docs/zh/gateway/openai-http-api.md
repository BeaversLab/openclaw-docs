---
summary: "从 Gateway(网关) 暴露一个兼容 OpenAI 的 /v1/chat/completions HTTP 端点"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI chat completions"
---

OpenClaw 的 Gateway(网关) 可以提供一个小的与 OpenAI 兼容的 Chat Completions 端点。

该端点默认处于禁用状态。请先在配置中启用它。

- `POST /v1/chat/completions`
- 与 Gateway(网关) 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/v1/chat/completions`

当启用 Gateway(网关) 的 OpenAI 兼容 HTTP 表面时，它还提供：

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
- 当使用 `gateway.auth.mode="trusted-proxy"` 时，HTTP 请求必须来自
  配置的非环回受信任代理源；同主机环回代理
  不满足此模式。
- 如果配置了 `gateway.auth.rateLimit` 并且发生了太多的身份验证失败，端点将返回 `429` 并带有 `Retry-After`。

## 安全边界（重要）

请将此端点视为网关实例的 **完全操作员访问** 表面。

- 此处的 HTTP 持有者身份验证并非狭窄的每用户范围模型。
- 此端点的有效 Gateway(网关) 令牌/密码应被视为所有者/操作员凭据。
- 请求通过与受信任的操作员操作相同的控制平面代理路径运行。
- 在此端点上，没有单独的非所有者/每用户工具边界；一旦调用者在此处通过了 Gateway(网关) 身份验证，OpenClaw 就会将该调用者视为此网关的可信操作员。
- 对于共享密钥身份验证模式（`token` 和 `password`），即使调用者发送了较窄的 `x-openclaw-scopes` 标头，该端点也会恢复正常的标准完整操作员默认设置。
- 可信的承载身份的 HTTP 模式（例如可信代理身份验证或 `gateway.auth.mode="none"`）在存在 `x-openclaw-scopes` 时会遵守该标头，否则回退到标准操作员默认范围集。
- 如果目标代理策略允许敏感工具，此端点可以使用它们。
- 请将此端点保持在 loopback/tailnet/私有入口上；不要将其直接暴露给公共互联网。

身份验证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明拥有共享网关操作员密钥
  - 忽略较窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员范围集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 将此端点上的聊天轮次视为所有者发送者轮次
- 可信的承载身份的 HTTP 模式（例如可信代理身份验证，或私有入口上的 `gateway.auth.mode="none"`）
  - 验证某些外部可信身份或部署边界
  - 当标头存在时遵守 `x-openclaw-scopes`
  - 当标头不存在时，回退到标准操作员默认范围集
  - 仅当调用者显式缩小范围并省略 `operator.admin` 时，才会丢失所有者语义

参见 [安全](/zh/gateway/security) 和 [远程访问](/zh/gateway/remote)。

## 代理优先模型合约

OpenClaw 将 OpenAI `model` 字段视为 **代理目标**，而不是原始提供商模型 ID。

- `model: "openclaw"` 路由到配置的默认代理。
- `model: "openclaw/default"` 也路由到配置的默认代理。
- `model: "openclaw/<agentId>"` 路由到特定的代理。

可选请求头：

- `x-openclaw-model: <provider/model-or-bare-id>` 覆盖所选代理的后端模型。
- `x-openclaw-agent-id: <agentId>` 仍作为兼容性覆盖项受支持。
- `x-openclaw-session-key: <sessionKey>` 完全控制会话路由。
- `x-openclaw-message-channel: <channel>` 设置针对渠道感知提示词和策略的综合入口渠道上下文。

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

如果请求包含 OpenAI `user` 字符串，Gateway(网关) 会从中派生出一个稳定的会话密钥，以便重复调用可以共享代理会话。

## 为什么这个接口很重要

这是针对自托管前端和工具的杠杆率最高的兼容性集合：

- 大多数 Open WebUI、LobeChat 和 LibreChat 设置都期望 `/v1/models`。
- 许多 RAG 系统期望 `/v1/embeddings`。
- 现有的 OpenAI 聊天客户端通常可以从 `/v1/chat/completions` 开始使用。
- 更多代理原生客户端越来越倾向于 `/v1/responses`。

## 模型列表和代理路由

<AccordionGroup>
  <Accordion title="`/v1/models` 返回什么？">
    一个 OpenClaw 代理目标列表。

    返回的 ID 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 条目。
    直接将它们用作 OpenAI `model` 值。

  </Accordion>
  <Accordion title="`/v1/models` 列出的是代理还是子代理？">
    它列出的是顶级代理目标，而不是后端提供商模型，也不是子代理。

    子代理仍然是内部执行拓扑。它们不会显示为伪模型。

  </Accordion>
  <Accordion title="为什么包含 `openclaw/default`？">
    `openclaw/default` 是已配置默认代理的稳定别名。

    这意味着客户端可以继续使用一个可预测的 ID，即使真正的默认代理 ID 在不同环境之间发生了变化。

  </Accordion>
  <Accordion title="如何覆盖后端模型？">
    使用 `x-openclaw-model`。

    示例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果省略它，所选代理将使用其正常配置的模型选择运行。

  </Accordion>
  <Accordion title="嵌入如何适应此合约？">
    `/v1/embeddings` 使用相同的代理目标 `model` ids。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    当您需要特定的嵌入模型时，请在 `x-openclaw-model` 中发送它。
    如果没有该 header，请求将传递到所选代理的正常嵌入设置。

  </Accordion>
</AccordionGroup>

## 流式传输 (SSE)

设置 `stream: true` 以接收服务器发送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每个事件行是 `data: <json>`
- 流以 `data: [DONE]` 结束

## Open WebUI 快速设置

对于基本的 Open WebUI 连接：

- Base URL: `http://127.0.0.1:18789/v1`
- Docker 在 macOS 上的 base URL: `http://host.docker.internal:18789/v1`
- API 密钥：您的 Gateway(网关) bearer token
- Model: `openclaw/default`

预期行为：

- `GET /v1/models` 应该列出 `openclaw/default`
- Open WebUI 应该使用 `openclaw/default` 作为聊天模型 id
- 如果您希望为该代理使用特定的后端提供商/模型，请设置代理的正常默认模型或发送 `x-openclaw-model`

快速冒烟测试：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，大多数 Open WebUI 设置都可以使用相同的 base URL 和 token 进行连接。

## 示例

非流式传输：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

流式传输：

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

备注：

- `/v1/models` 返回 OpenClaw 代理目标，而不是原始提供商目录。
- `openclaw/default` 始终存在，因此一个稳定的 ID 可在不同环境中工作。
- 后端提供商/模型覆盖属于 `x-openclaw-model`，而非 OpenAI `model` 字段。
- `/v1/embeddings` 支持 `input` 作为字符串或字符串数组。

## 相关

- [配置参考](/zh/gateway/configuration-reference)
- [OpenAI](/zh/providers/openai)
