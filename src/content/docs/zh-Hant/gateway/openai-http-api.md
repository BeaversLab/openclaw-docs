---
summary: "從 Gateway 公開相容 OpenAI 的 /v1/chat/completions HTTP 端點"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI 聊天完成"
---

# OpenAI 聊天完成 (HTTP)

OpenClaw 的 Gateway 可以提供一個小型的相容 OpenAI 的聊天完成端點。

此端點**預設為停用**。請先在設定中啟用它。

- `POST /v1/chat/completions`
- 與 Gateway 相同的連接埠 (WS + HTTP 多工)：`http://<gateway-host>:<port>/v1/chat/completions`

當啟用 Gateway 的相容 OpenAI HTTP 介面時，它也會提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底層，請求會像正常的 Gateway 執行代理一樣執行（與 `openclaw agent` 的程式碼路徑相同），因此路由/權限/設定會與您的 Gateway 相符。

## 身份驗證

使用 Gateway 驗證設定。請發送 bearer token：

- `Authorization: Bearer <token>`

備註：

- 當 `gateway.auth.mode="token"` 時，請使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當 `gateway.auth.mode="password"` 時，請使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 如果設定 `gateway.auth.rateLimit` 且發生過多驗證失敗，端點會傳回 `429` 並包含 `Retry-After`。

## 安全邊界 (重要)

請將此端點視為 Gateway 實例的**完整操作員存取**介面。

- 此處的 HTTP bearer 驗證並非狹隘的個別使用者範圍模型。
- 此端點的有效 Gateway token/密碼應被視為擁有者/操作員憑證。
- 請求會透過與信任操作員操作相同的控制平面代理路徑執行。
- 此端點沒有單獨的非擁有者/個別使用者工具邊界；一旦呼叫者在這裡通過 Gateway 驗證，OpenClaw 會將該呼叫者視為此 Gateway 的信任操作員。
- 對於共享金鑰驗證模式（`token` 和 `password`），即使呼叫者發送了較狹窄的 `x-openclaw-scopes` 標頭，該端點仍會恢復正常的完整操作員預設值。
- 受信任的身分驗證 HTTP 模式（例如受信任的 Proxy 驗證或 `gateway.auth.mode="none"`）仍然會遵守請求上宣告的操作員範圍。
- 如果目標代理原則允許敏感工具，此端點可以使用它們。
- 請僅將此端點保留在 loopback/tailnet/private ingress 上；不要直接將其暴露給公共網際網路。

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共享閘道操作員金鑰
  - 忽略較狹窄的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集
  - 將此端點上的對話輪次視為擁有者-傳送者輪次
- 受信任的身分驗證 HTTP 模式（例如受信任的 Proxy 驗證，或 private ingress 上的 `gateway.auth.mode="none"`）
  - 驗證某些外部受信任身分或部署邊界
  - 遵守宣告的 `x-openclaw-scopes` 標頭
  - 僅當 `operator.admin` 實際存在於那些宣告的範圍中時，才會獲得擁有者語意

請參閱 [安全性](/en/gateway/security) 和 [遠端存取](/en/gateway/remote)。

## 代理優先模型合約

OpenClaw 將 OpenAI `model` 欄位視為 **代理目標**，而非原始提供者模型 ID。

- `model: "openclaw"` 路由至已設定的預設代理。
- `model: "openclaw/default"` 也會路由至已設定的預設代理。
- `model: "openclaw/<agentId>"` 路由至特定代理。

可選請求標頭：

- `x-openclaw-model: <provider/model-or-bare-id>` 會覆寫所選代理的後端模型。
- `x-openclaw-agent-id: <agentId>` 仍作為相容性覆寫受到支援。
- `x-openclaw-session-key: <sessionKey>` 完全控制會話路由。
- `x-openclaw-message-channel: <channel>` 設定適用於通道感知提示和原則的綜合 ingress 通道語境。

仍接受的相容性別名：

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

## 啟用端點

將 `gateway.http.endpoints.chatCompletions.enabled` 設定為 `true`：

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

將 `gateway.http.endpoints.chatCompletions.enabled` 設定為 `false`：

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

## Session 行為

預設情況下，此端點是 **每次請求無狀態的**（每次呼叫都會產生新的 session 金鑰）。

如果請求包含 OpenAI 的 `user` 字串，Gateway 會從中衍生出一個穩定的 session 金鑰，以便重複的呼叫可以共用 agent session。

## 為何此介面重要

這是針對自託管前端和工具而言，槓桿率最高的相容性集合：

- 大多數 Open WebUI、LobeChat 和 LibreChat 設定都預期 `/v1/models`。
- 許多 RAG 系統預期 `/v1/embeddings`。
- 現有的 OpenAI 聊天客戶端通常可以從 `/v1/chat/completions` 開始。
- 更多原生的 agent 客戶端逐漸偏好 `/v1/responses`。

## 模型清單與 agent 路由

<AccordionGroup>
  <Accordion%%PH:JSX_ATTR:13:da09ded0%`/v1/models` 會傳回什麼？">
    OpenClaw agent 目標清單。

    傳回的 id 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 項目。
    直接將它們用作 OpenAI `model` 值。

  </Accordion>
  <Accordion%%PH:JSX_ATTR:15:da09ded0%`/v1/models` 列出的是 agent 還是 sub-agent？">
    它列出的是頂層 agent 目標，而非後端提供者模型，也非 sub-agent。

    Sub-agent 仍屬內部執行拓撲。它們不會以虛擬模型的形式出現。

  </Accordion>
  <Accordion title="為什麼包含 `openclaw/default`？">
    `openclaw/default` 是所設定預設 agent 的穩定別名。

    這意味著即使實際的預設 agent id 在不同環境之間發生變更，客戶端仍可繼續使用一個可預測的 id。

  </Accordion>
  <Accordion title="如何覆寫後端模型？">
    使用 `x-openclaw-model`。

    範例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.4`

    如果您省略它，所選的 agent 將以其正常設定的模型選項執行。

  </Accordion>
  <Accordion title="嵌入功能如何適用此協定？">
    `/v1/embeddings` 使用相同的代理目標 `model` id。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    當您需要特定的嵌入模型時，請在 `x-openclaw-model` 中發送。
    如果沒有該標頭，請求將傳遞至所選代理的一般嵌入設定。

  </Accordion>
</AccordionGroup>

## 串流 (SSE)

設定 `stream: true` 以接收伺服器發送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行都是 `data: <json>`
- 串流以 `data: [DONE]` 結束

## Open WebUI 快速設定

若要進行基本的 Open WebUI 連線：

- Base URL：`http://127.0.0.1:18789/v1`
- macOS 上的 Docker Base URL：`http://host.docker.internal:18789/v1`
- API 金鑰：您的 Gateway bearer token
- 模型：`openclaw/default`

預期行為：

- `GET /v1/models` 應列出 `openclaw/default`
- Open WebUI 應使用 `openclaw/default` 作為聊天模型 id
- 如果您希望該代理使用特定的後端供應商/模型，請設定代理的一般預設模型或發送 `x-openclaw-model`

快速測試：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果該操作傳回 `openclaw/default`，則大多數 Open WebUI 設定都可以使用相同的 Base URL 和 token 進行連線。

## 範例

非串流：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

串流：

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

取得單一模型：

```bash
curl -sS http://127.0.0.1:18789/v1/models/openclaw%2Fdefault \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

建立嵌入：

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

備註：

- `/v1/models` 傳回 OpenClaw 代理目標，而非原始供應商目錄。
- `openclaw/default` 始終存在，因此一個穩定的 id 可在各環境中運作。
- 後端供應商/模型覆寫應置於 `x-openclaw-model` 中，而非 OpenAI 的 `model` 欄位。
- `/v1/embeddings` 支援 `input` 為字串或字串陣列。
