---
summary: "從 Gateway 公開一個相容 OpenAI 的 /v1/chat/completions HTTP 端點"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI Chat Completions"
---

# OpenAI Chat Completions (HTTP)

OpenClaw 的 Gateway 可以提供一個小型的相容 OpenAI 的 Chat Completions 端點。

此端點預設為**停用**。請先在設定中啟用它。

- `POST /v1/chat/completions`
- 與 Gateway (WS + HTTP 多工傳輸) 使用相同的連接埠：`http://<gateway-host>:<port>/v1/chat/completions`

在底層，請求會作為正常的 Gateway agent 執行來執行（與 `openclaw agent` 程式碼路徑相同），因此路由/權限/設定會與您的 Gateway 一致。

## 驗證

使用 Gateway 驗證設定。傳送 bearer token：

- `Authorization: Bearer <token>`

備註：

- 當 `gateway.auth.mode="token"` 時，請使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 當 `gateway.auth.mode="password"` 時，請使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果設定了 `gateway.auth.rateLimit` 且發生過多驗證失敗，端點會傳回 `429` 以及 `Retry-After`。

## 安全邊界（重要）

請將此端點視為閘道實例的 **完整操作員存取** 介面。

- 此處的 HTTP 持有者驗證並非狹隘的單一使用者範圍模型。
- 此端點的有效閘道權杖/密碼應被視為擁有者/操作員憑證。
- 請求會透過與受信任操作員動作相同的控制平面代理路徑執行。
- 此端點沒有單獨的非擁有者/每用戶工具邊界；一旦呼叫者通過此處的 Gateway 驗證，OpenClaw 會將該呼叫者視為此 Gateway 的受信任操作員。
- 如果目標代理程式原則允許敏感工具，此端點可以使用它們。
- 請將此端點僅保留在 loopback/tailnet/private ingress 上；請勿將其直接暴露給公用網際網路。

請參閱 [安全性](/zh-Hant/gateway/security) 和 [遠端存取](/zh-Hant/gateway/remote)。

## 選擇代理程式

無需自訂標頭：將代理程式 ID 編碼在 OpenAI `model` 欄位中：

- `model: "openclaw:<agentId>"` (例如：`"openclaw:main"`, `"openclaw:beta"`)
- `model: "agent:<agentId>"` (別名)

或透過標頭以特定的 OpenClaw 代理程式為目標：

- `x-openclaw-agent-id: <agentId>` (預設值：`main`)

進階：

- `x-openclaw-session-key: <sessionKey>` 以完全控制會話路由。

## 啟用端點

將 `gateway.http.endpoints.chatCompletions.enabled` 設為 `true`：

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

## 停用端點

將 `gateway.http.endpoints.chatCompletions.enabled` 設為 `false`：

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

## 會話行為

根據預設，該端點是 **每次請求無狀態**（每次呼叫都會產生新的會話金鑰）。

如果請求包含 OpenAI `user` 字串，閘道會從中衍生出穩定的會話金鑰，因此重複的呼叫可以共用代理程式會話。

## 串流 (SSE)

設定 `stream: true` 以接收伺服器傳送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行為 `data: <json>`
- 串流結束於 `data: [DONE]`

## 範例

非串流：

```exec
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

串流：

```exec
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```
