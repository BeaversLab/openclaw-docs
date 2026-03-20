---
summary: "用于唤醒和隔离代理运行的 Webhook 入口"
read_when:
  - 添加或更改 Webhook 端点
  - 将外部系统连接到 OpenClaw
title: "Webhooks"
---

# Webhooks

Gateway(网关) 可以暴露一个小型 HTTP Webhook 端点以用于外部触发器。

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

注意：

- 当存在 `hooks.enabled=true` 时，`hooks.token` 是必需的。
- `hooks.path` 默认为 `/hooks`。

## 身份验证

每个请求必须包含 hook 令牌。优先使用请求头：

- `Authorization: Bearer <token>` （推荐）
- `x-openclaw-token: <token>`
- 查询字符串令牌将被拒绝（`?token=...` 返回 `400`）。
- 将 `hooks.token` 持有者视为该网关上 hook 入口表面的完全信任调用者。Hook 载荷内容仍然不可信，但这不是一个独立的非所有者身份验证边界。

## 端点

### `POST /hooks/wake`

载荷：

```json
{ "text": "System line", "mode": "now" }
```

- `text` **必需** (字符串)：事件的描述（例如，“收到新电子邮件”）。
- `mode` 可选 (`now` | `next-heartbeat`)：是否触发立即的心跳（默认 `now`）或等待下一次定期检查。

效果：

- 为 **主** 会话 将系统事件排队
- 如果为 `mode=now`，则触发立即心跳

### `POST /hooks/agent`

载荷：

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

- `message` **必需** (字符串)：供代理处理的提示或消息。
- `name` 可选 (字符串)：hook 的人类可读名称（例如，“GitHub”），用作会话摘要中的前缀。
- `agentId` 可选 (字符串)：将此 hook 路由到特定的代理。未知 ID 将回退到默认代理。设置后，hook 将使用解析后的代理的工作区和配置运行。
- `sessionKey` 可选 (字符串)：用于标识代理会话的密钥。默认情况下，除非 `hooks.allowRequestSessionKey=true`，否则拒绝此字段。
- `wakeMode` 可选（`now` | `next-heartbeat`）：是否触发即时心跳（默认为 `now`）或等待下一次定期检查。
- `deliver` 可选（布尔值）：如果为 `true`，则 Agent 的响应将发送到消息渠道。默认为 `true`。仅包含心跳确认的响应将被自动跳过。
- `channel` 可选（字符串）：用于投递的消息渠道。可选项包括：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`mattermost`（插件）、`signal`、`imessage`、`msteams`。默认为 `last`。
- `to` 可选（字符串）：该渠道的接收者标识符（例如，WhatsApp/Signal 的电话号码，Telegram 的聊天 ID，Discord/Slack/Mattermost（插件）的频道 ID，MS Teams 的对话 ID）。默认为主会话中的最后一个接收者。
- `model` 可选（字符串）：模型覆盖（例如，`anthropic/claude-3-5-sonnet` 或别名）。如果受限，则必须在允许的模型列表中。
- `thinking` 可选（字符串）：思考级别覆盖（例如，`low`、`medium`、`high`）。
- `timeoutSeconds` 可选（数字）：Agent 运行的最长时间（秒）。

效果：

- 运行一个**独立**的 Agent 轮次（拥有自己的会话密钥）
- 始终将摘要发布到**主**会话中
- 如果 `wakeMode=now`，则触发即时心跳

## 会话密钥策略（重大变更）

默认情况下，`/hooks/agent` 有效载荷 `sessionKey` 覆盖已禁用。

- 建议：设置固定的 `hooks.defaultSessionKey` 并保持请求覆盖处于关闭状态。
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

### `POST /hooks/<name>` (已映射)

自定义挂钩名称通过 `hooks.mappings` 解析（请参阅配置）。映射可以将任意负载转换为 `wake` 或 `agent` 操作，并支持可选的模板或代码转换。

映射选项（摘要）：

- `hooks.presets: ["gmail"]` 启用内置的 Gmail 映射。
- `hooks.mappings` 允许您在配置中定义 `match`、`action` 和模板。
- `hooks.transformsDir` + `transform.module` 加载用于自定义逻辑的 JS/TS 模块。
  - `hooks.transformsDir`（如果设置）必须位于 OpenClaw 配置目录下的转换根目录内（通常是 `~/.openclaw/hooks/transforms`）。
  - `transform.module` 必须在有效的转换目录内解析（拒绝路径遍历/转义）。
- 使用 `match.source` 保留通用接入端点（由负载驱动的路由）。
- TS 转换需要 TS 加载器（例如 `bun` 或 `tsx`）或在运行时提供预编译的 `.js`。
- 在映射上设置 `deliver: true` + `channel`/`to` 以将回复路由到聊天界面（`channel` 默认为 `last`，并回退到 WhatsApp）。
- `agentId` 将挂钩路由到特定代理；未知 ID 回退到默认代理。
- `hooks.allowedAgentIds` 限制显式 `agentId` 路由。省略它（或包含 `*`）以允许任何代理。设置 `[]` 以拒绝显式 `agentId` 路由。
- 当没有提供显式密钥时，`hooks.defaultSessionKey` 为挂钩代理运行设置默认会话。
- `hooks.allowRequestSessionKey` 控制是否允许 `/hooks/agent` 负载设置 `sessionKey`（默认值：`false`）。
- `hooks.allowedSessionKeyPrefixes` 可选择性地限制来自请求负载和映射中的显式 `sessionKey` 值。
- `allowUnsafeExternalContent: true` 禁用该 hook 的外部内容安全封装
  （危险；仅适用于受信任的内部源）。
- `openclaw webhooks gmail setup` 为 `openclaw webhooks gmail run` 写入 `hooks.gmail` 配置。
  有关完整的 Gmail watch 流程，请参阅 [Gmail Pub/Sub](/zh/automation/gmail-pubsub)。

## 响应

- `200` 针对 `/hooks/wake`
- `200` 针对 `/hooks/agent`（异步运行已接受）
- 身份验证失败时的 `401`
- 来自同一客户端的重复身份验证失败后的 `429`（检查 `Retry-After`）
- 负载无效时的 `400`
- 负载过大时的 `413`

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

将 `model` 添加到 agent 负载（或映射）中以覆盖该运行的模型：

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

- 将 hook 端点置于回环地址、tailnet 或受信任的反向代理之后。
- 使用专用的 hook 令牌；不要重复使用网关身份验证令牌。
- 首选具有严格 `tools.profile` 和沙箱隔离的专用 hook agent，以便 hook 入站具有更小的爆炸半径。
- 针对每个客户端地址对重复的身份验证失败进行速率限制，以减缓暴力破解尝试。
- 如果您使用多 agent 路由，请设置 `hooks.allowedAgentIds` 以限制显式 `agentId` 选择。
- 保持 `hooks.allowRequestSessionKey=false`，除非您需要调用方选择的会话。
- 如果您启用请求 `sessionKey`，请限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 避免在 webhook 日志中包含敏感的原始负载。
- 默认情况下，Hook 负载被视为不受信任，并使用安全边界进行封装。
  如果您必须针对特定 hook 禁用此功能，请在该 hook 的映射中设置 `allowUnsafeExternalContent: true`
  （危险）。

import zh from "/components/footer/zh.mdx";

<zh />
