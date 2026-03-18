---
summary: "從 Gateway 公開一個與 OpenAI 相容的 /v1/chat/completions HTTP 端點"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI Chat Completions"
---

# OpenAI Chat Completions (HTTP)

OpenClaw 的 Gateway 可以提供一個小型的 OpenAI 相容 Chat Completions 端點。

此端點**預設為停用**。請先在設定中啟用它。

- `POST /v1/chat/completions`
- 與 Gateway 相同的連接埠（WS + HTTP 多工）：`http://<gateway-host>:<port>/v1/chat/completions`

在底層，請求是作為一般的 Gateway agent 執行來執行的（與 `openclaw agent` 的程式碼路徑相同），因此路由/權限/設定會與您的 Gateway 相符。

## 驗證

使用 Gateway 驗證設定。傳送 bearer token：

- `Authorization: Bearer <token>`

注意：

- 當 `gateway.auth.mode="token"` 時，請使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 當 `gateway.auth.mode="password"` 時，請使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 如果設定了 `gateway.auth.rateLimit` 且發生過多驗證失敗，端點會傳回 `429` 並帶有 `Retry-After`。

## 安全邊界（重要）

請將此端點視為 gateway 執行個體的**完整操作員存取**介面。

- 此處的 HTTP bearer 驗證並非狹隘的個別使用者範圍模型。
- 此端點的有效 Gateway token/密碼應視為擁有者/操作員憑證。
- 請求會透過與受信任操作員動作相同的控制平面 agent 路徑執行。
- 此端點沒有個別的非擁有者/個別使用者工具邊界；一旦呼叫者通過此處的 Gateway 驗證，OpenClaw 會將該呼叫者視為此 gateway 的受信任操作員。
- 如果目標 agent 原則允許敏感工具，此端點可以使用它們。
- 請將此端點保持在 loopback/tailnet/私有入口僅限存取；不要將其直接公開至公用網際網路。

請參閱[安全性](/zh-Hant/gateway/security)和[遠端存取](/zh-Hant/gateway/remote)。

## 選擇 agent

不需要自訂標頭：在 OpenAI `model` 欄位中編碼 agent id：

- `model: "openclaw:<agentId>"` (例如：`"openclaw:main"`, `"openclaw:beta"`)
- `model: "agent:<agentId>"` (別名)

或者透過標頭指定特定的 OpenClaw 代理：

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

預設情況下，端點是**每次請求無狀態的**（每次呼叫都會產生新的會話金鑰）。

如果請求包含 OpenAI `user` 字串，Gateway 會據此推導出穩定的會話金鑰，以便重複呼叫可以共用代理會話。

## 串流 (SSE)

設定 `stream: true` 以接收 Server-Sent Events (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行為 `data: <json>`
- 串流以 `data: [DONE]` 結束

## 範例

非串流：

```bash
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

```bash
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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
