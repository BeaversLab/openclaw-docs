---
summary: "用于唤醒和独立代理运行的 Webhook 接入"
read_when:
  - Adding or changing webhook endpoints
  - Wiring external systems into OpenClaw
title: "Webhooks"
---

# Webhooks

Gateway 网关 可以暴露一个小型的 HTTP webhook 端点用于外部触发。

## 启用

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    // Optional: restrict explicit `agentId` routing to this allowlist.
    // Omit or include "*" to allow any agent.
    // Set [] to deny all explicit `agentId` routing.
    allowedAgentIds: ["hooks", "main"],
  },
}
```

注意事项：

- 当 `hooks.enabled=true` 时，需要 `hooks.token`。
- `hooks.path` 默认为 `/hooks`。

## 认证

每个请求必须包含 hook token。优先使用标头：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`
- 查询字符串令牌会被拒绝（`?token=...` 返回 `400`）。
- 将 `hooks.token` 持有者视为该网关上挂钩入口表面的完全信任调用者。挂钩有效负载内容仍然不受信任，但这不是单独的非所有者身份验证边界。

## 端点

### `POST /hooks/wake`

有效负载：

```json
{ "text": "System line", "mode": "now" }
```

- `text` **必填**（字符串）：事件的描述（例如，“收到新电子邮件”）。
- `mode` 可选（`now` | `next-heartbeat`）：是否触发立即心跳（默认 `now`）或等待下一次定期检查。

效果：

- 为 **主** 会话排队系统事件
- 如果为 `mode=now`，则触发立即心跳

### `POST /hooks/agent`

有效负载：

```json
{
  "message": "Run this",
  "name": "Email",
  "agentId": "hooks",
  "sessionKey": "hook:email:msg-123",
  "wakeMode": "now",
  "deliver": true,
  "channel": "last",
  "to": "+15551234567",
  "model": "openai/gpt-5.2-mini",
  "thinking": "low",
  "timeoutSeconds": 120
}
```

- `message` **必填**（字符串）：供代理处理的提示或消息。
- `name` 可选（字符串）：挂钩的可读名称（例如“GitHub”），用作会话摘要中的前缀。
- `agentId` 可选（字符串）：将此挂钩路由到特定代理。未知的 ID 将回退到默认代理。设置后，挂钩将使用已解析代理的工作空间和配置运行。
- `sessionKey` 可选（字符串）：用于标识代理会话的密钥。默认情况下，除非 `hooks.allowRequestSessionKey=true`，否则拒绝此字段。
- `wakeMode` 可选（`now` | `next-heartbeat`）：是否触发立即心跳（默认 `now`）或等待下一次定期检查。
- `deliver` 可选（布尔值）：如果为 `true`，代理的响应将发送到消息渠道。默认为 `true`。仅包含心跳确认的响应将被自动跳过。
- `channel` 可选（字符串）：用于传递的消息渠道。核心渠道包括：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`、`irc`、`googlechat`、`line`。扩展渠道（插件）：`msteams`、`mattermost` 等。默认为 `last`。
- `to` 可选（字符串）：渠道的接收方标识符（例如 WhatsApp/Signal 的电话号码，Telegram 的聊天 ID，Discord/Slack/Mattermost（插件）的频道 ID，Microsoft Teams 的对话 ID）。默认为主会话中的最后一个接收方。
- `model` 可选（字符串）：模型覆盖（例如 `anthropic/claude-sonnet-4-6` 或别名）。如果受限，必须在允许的模型列表中。
- `thinking` 可选（字符串）：思考级别覆盖（例如 `low`、`medium`、`high`）。
- `timeoutSeconds` 可选（数字）：代理运行的最大持续时间（秒）。

效果：

- 运行一个**隔离的**代理轮次（拥有自己的会话密钥）
- 始终将摘要发布到**主**会话中
- 如果为 `wakeMode=now`，则会触发立即的心跳检测

## 会话密钥策略（重大变更）

`/hooks/agent` 载荷 `sessionKey` 覆盖默认禁用。

- 建议：设置固定的 `hooks.defaultSessionKey` 并保持请求覆盖关闭。
- 可选：仅在需要时允许请求覆盖，并限制前缀。

推荐配置：

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
  },
}
```

兼容性配置（旧行为）：

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:"], // strongly recommended
  },
}
```

### `POST /hooks/<name>`（已映射）

自定义钩子名称通过 `hooks.mappings` 解析（请参阅配置）。映射可以将任意载荷转换为 `wake` 或 `agent` 操作，并带有可选模板或代码转换。

映射选项（摘要）：

- `hooks.presets: ["gmail"]` 启用内置的 Gmail 映射。
- `hooks.mappings` 允许您在配置中定义 `match`、`action` 和模板。
- `hooks.transformsDir` + `transform.module` 加载用于自定义逻辑的 JS/TS 模块。
  - `hooks.transformsDir`（如果设置）必须位于您的 OpenClaw 配置目录下的 transforms 根目录内（通常是 `~/.openclaw/hooks/transforms`）。
  - `transform.module` 必须在有效的 transforms 目录内解析（拒绝遍历/转义路径）。
- 使用 `match.source` 以保留通用接收端点（基于负载的路由）。
- TS 转换需要 TS 加载器（例如 `bun` 或 `tsx`）或在运行时预编译的 `.js`。
- 在映射上设置 `deliver: true` + `channel`/`to` 以将回复路由到聊天界面
  (`channel` 默认为 `last`，回退到 WhatsApp)。
- `agentId` 将 hook 路由到特定代理；未知 ID 回退到默认代理。
- `hooks.allowedAgentIds` 限制显式 `agentId` 路由。省略它（或包含 `*`）以允许任何代理。设置 `[]` 以拒绝显式 `agentId` 路由。
- 当未提供显式密钥时，`hooks.defaultSessionKey` 设置 hook 代理运行的默认会话。
- `hooks.allowRequestSessionKey` 控制 `/hooks/agent` 负载是否可以设置 `sessionKey`（默认：`false`）。
- `hooks.allowedSessionKeyPrefixes` 可选择限制来自请求负载和映射的显式 `sessionKey` 值。
- `allowUnsafeExternalContent: true` 为该 hook 禁用外部内容安全包装器
  （危险；仅限受信任的内部源）。
- `openclaw webhooks gmail setup` 为 `openclaw webhooks gmail run` 写入 `hooks.gmail` 配置。
  有关完整的 Gmail watch 流程，请参阅 [Gmail Pub/Sub](/en/automation/gmail-pubsub)。

## 响应

- `200` 用于 `/hooks/wake`
- `200` 用于 `/hooks/agent`（接受异步运行）
- 身份验证失败时返回 `401`
- 同一客户端重复身份验证失败后返回 `429`（检查 `Retry-After`）
- 负载无效时返回 `400`
- 负载过大时返回 `413`

## 示例

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","wakeMode":"next-heartbeat"}'
```

### 使用不同的模型

将 `model` 添加到代理负载（或映射）中以覆盖该运行的模型：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

如果您强制执行 `agents.defaults.models`，请确保覆盖模型包含在其中。

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## 安全性

- 将 Hook 端点置于环回接口、Tailnet 或可信反向代理之后。
- 使用专用的 Hook 令牌；不要复用网关身份验证令牌。
- 首选具有严格 `tools.profile` 和沙箱隔离的专用挂钩代理，以便挂钩入口的影响范围更小。
- 每个客户端地址会限制重复身份验证失败的速率，以减缓暴力破解尝试。
- 如果您使用多代理路由，请设置 `hooks.allowedAgentIds` 以限制显式 `agentId` 选择。
- 除非您需要调用方选择的会话，否则请保留 `hooks.allowRequestSessionKey=false`。
- 如果启用请求 `sessionKey`，请限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 避免在 Webhook 日志中包含敏感的原始负载。
- 默认情况下，挂钩负载被视为不受信任，并用安全边界包裹。
  如果必须为特定挂钩禁用此功能，请在该挂钩的映射中设置 `allowUnsafeExternalContent: true`
  （危险）。
