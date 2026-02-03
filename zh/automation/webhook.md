---
summary: "用于唤醒与隔离代理运行的 Webhook 入站"
read_when:
  - 新增或修改 webhook 端点
  - 将外部系统接入 OpenClaw
title: "Webhooks"
---

# Webhook

Gateway 可对外暴露一个小型 HTTP webhook 端点，用于外部触发。

## 启用

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
  },
}
```

注意：

- 当 `hooks.enabled=true` 时必须设置 `hooks.token`。
- `hooks.path` 默认为 `/hooks`。

## 鉴权

每个请求都必须携带 hook token。推荐使用请求头：

- `Authorization: Bearer <token>`（推荐）
- `x-openclaw-token: <token>`
- `?token=<token>`（已弃用；会记录警告，并将在未来主版本移除）

## 端点

### `POST /hooks/wake`

Payload：

```json
{ "text": "System line", "mode": "now" }
```

- `text` **必填** (string)：事件描述（例如 "New email received"）。
- `mode` 可选 (`now` | `next-heartbeat`)：是否触发即时 heartbeat（默认 `now`）或等待下一次周期检查。

效果：

- 为**主**会话排队一个系统事件
- 若 `mode=now`，触发一次即时 heartbeat

### `POST /hooks/agent`

Payload：

```json
{
  "message": "Run this",
  "name": "Email",
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

- `message` **必填** (string)：代理要处理的提示或消息。
- `name` 可选 (string)：hook 的易读名称（例如 "GitHub"），用作会话摘要中的前缀。
- `sessionKey` 可选 (string)：用于标识代理会话的 key。默认为随机 `hook:<uuid>`。使用一致的 key 可以在 hook 上下文中进行多轮对话。
- `wakeMode` 可选 (`now` | `next-heartbeat`)：是否触发即时 heartbeat（默认 `now`）或等待下一次周期检查。
- `deliver` 可选 (boolean)：若为 `true`，代理的响应将发送到消息渠道。默认为 `true`。仅 heartbeat 确认的响应会自动跳过。
- `channel` 可选 (string)：消息投递渠道。支持：`last`、`whatsapp`、`telegram`、`discord`、`slack`、`mattermost`（插件）、`signal`、`imessage`、`msteams`。默认为 `last`。
- `to` 可选 (string)：渠道的收件人标识（例如 WhatsApp/Signal 的手机号、Telegram 的 chat ID、Discord/Slack/Mattermost（插件）的 channel ID、MS Teams 的 conversation ID）。默认主会话的最后一次收件人。
- `model` 可选 (string)：模型覆盖（例如 `anthropic/claude-3-5-sonnet` 或别名）。如果受限，必须在允许的模型列表中。
- `thinking` 可选 (string)：思考等级覆盖（例如 `low`、`medium`、`high`）。
- `timeoutSeconds` 可选 (number)：代理运行的最长时间（秒）。

效果：

- 运行一次**隔离**的代理回合（独立的 session key）
- 总会在**主**会话中发布摘要
- 若 `wakeMode=now`，触发一次即时 heartbeat

### `POST /hooks/<name>` (mapped)

自定义 hook 名称通过 `hooks.mappings` 解析（见配置）。映射可以将任意 payload 转换为 `wake` 或 `agent` 动作，并可选地使用模板或代码转换。

映射选项（概要）：

- `hooks.presets: ["gmail"]` 启用内置的 Gmail 映射。
- `hooks.mappings` 允许在配置中定义 `match`、`action` 和模板。
- `hooks.transformsDir` + `transform.module` 加载 JS/TS 模块以实现自定义逻辑。
- 使用 `match.source` 保留通用接收端点（按 payload 路由）。
- TS 转换需要 TS loader（例如 `bun` 或 `tsx`）或在运行时使用预编译的 `.js`。
- 在映射上设置 `deliver: true` + `channel`/`to` 可以将回复路由到聊天界面
  （`channel` 默认为 `last`，回退到 WhatsApp）。
- `allowUnsafeExternalContent: true` 禁用该 hook 的外部内容安全包裹
  （危险；仅用于受信任的内部来源）。
- `openclaw webhooks gmail setup` 写入 `hooks.gmail` 配置供 `openclaw webhooks gmail run` 使用。
  参见 [Gmail Pub/Sub](/zh/automation/gmail-pubsub) 了解完整的 Gmail watch 流程。

## 响应

- `/hooks/wake` 返回 `200`
- `/hooks/agent` 返回 `202`（异步运行已启动）
- 鉴权失败返回 `401`
- 无效 payload 返回 `400`
- 过大 payload 返回 `413`

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

### 使用不同模型

在 agent payload（或映射）里添加 `model` 以覆盖本次运行模型：

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

如果你强制使用 `agents.defaults.models`，请确保覆盖模型包含在其中。

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## 安全

- 将 hook 端点放在 loopback、tailnet 或可信反向代理之后。
- 使用专用 hook token，不要复用 gateway 认证 token。
- 避免在 webhook 日志中包含敏感原始 payload。
- Hook payload 默认视为不可信，并包裹安全边界。
  如需为特定 hook 禁用，请在该 hook 映射中设置 `allowUnsafeExternalContent: true`
  （危险）。
