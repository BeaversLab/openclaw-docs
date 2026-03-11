---
summary: "通过 Gateway HTTP 端点直接调用单个工具"
read_when:
  - "Calling tools without running a full agent turn"
  - "Building automations that need tool policy enforcement"
title: "工具调用 API"
---

# 工具调用 (HTTP)

OpenClaw 的 Gateway 提供了一个简单的 HTTP 端点用于直接调用单个工具。它始终启用，但受 Gateway 认证和工具策略限制。

- `POST /tools/invoke`
- 与 Gateway 相同的端口（WS + HTTP 多路复用）：`http://<gateway-host>:<port>/tools/invoke`

默认最大负载大小为 2 MB。

## 认证

使用 Gateway 认证配置。发送 bearer token：

- `Authorization: Bearer <token>`

注意：

- 当 `gateway.auth.mode="token"` 时，使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 当 `gateway.auth.mode="password"` 时，使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。

## 请求正文

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

- `tool`（字符串，必需）：要调用的工具名称。
- `action`（字符串，可选）：如果工具架构支持 `action` 且 args 负载中省略了它，则映射到 args。
- `args`（对象，可选）：特定于工具的参数。
- `sessionKey`（字符串，可选）：目标会话密钥。如果省略或 `"main"`，Gateway 使用配置的主会话密钥（遵守 `session.mainKey` 和默认 agent，或全局作用域中的 `global`）。
- `dryRun`（布尔值，可选）：保留供将来使用；当前被忽略。

## 策略 + 路由行为

工具可用性通过 Gateway agent 使用的相同策略链进行过滤：

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- 组策略（如果会话密钥映射到组或频道）
- 子 agent 策略（使用子 agent 会话密钥调用时）

如果策略不允许某个工具，端点返回 **404**。

为了帮助组策略解析上下文，您可以选择设置：

- `x-openclaw-message-channel: <channel>`（例如：`slack`、`telegram`）
- `x-openclaw-account-id: <accountId>`（当存在多个账户时）

## 响应

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }`（无效请求或工具错误）
- `401` → 未授权
- `404` → 工具不可用（未找到或未允许）
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
