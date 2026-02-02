---
summary: "通过 Gateway HTTP 端点直接调用单个工具"
read_when:
  - 想在不运行完整 agent 轮次的情况下调用工具
  - 构建需要工具策略约束的自动化
---
# Tools Invoke（HTTP）

OpenClaw 的 Gateway 提供一个简单的 HTTP 端点，可直接调用单个工具。该端点始终启用，但受 Gateway 认证与工具策略约束。

- `POST /tools/invoke`
- 与 Gateway 相同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大 payload 为 2 MB。

## 认证

使用 Gateway 的认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

说明：
- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。

## 请求体

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

字段：
- `tool`（string，必需）：要调用的工具名。
- `action`（string，可选）：若工具 schema 支持 `action` 且 args 未提供该字段，会将其映射进 args。
- `args`（object，可选）：工具参数。
- `sessionKey`（string，可选）：目标会话 key。若省略或为 `"main"`，Gateway 使用配置的 main 会话 key（遵循 `session.mainKey` 与默认 agent，或全局作用域中的 `global`）。
- `dryRun`（boolean，可选）：预留未来使用；当前忽略。

## 策略 + 路由行为

工具可用性经过与 Gateway agents 相同的策略链过滤：
- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（当 session key 映射到群或频道）
- subagent 策略（使用 subagent session key 调用时）

若工具被策略禁止，该端点会返回 **404**。

为帮助群策略解析上下文，可选设置：
- `x-openclaw-message-channel: <channel>`（例如 `slack`, `telegram`）
- `x-openclaw-account-id: <accountId>`（存在多账号时）

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（请求无效或工具错误）
- `401` → 未授权
- `404` → 工具不可用（未找到或不在 allowlist）
- `405` → 方法不允许

## 示例

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```
