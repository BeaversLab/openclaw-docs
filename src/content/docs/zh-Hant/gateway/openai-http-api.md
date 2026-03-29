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
- 如果目標代理原則允許敏感工具，此端點可以使用它們。
- 請將此端點保留在 loopback/tailnet/私人入口上；不要將其直接公開至公用網際網路。

請參閱 [安全性](/en/gateway/security) 和 [遠端存取](/en/gateway/remote)。

## 代理程式優先的模型合約

OpenClaw 將 OpenAI `model` 欄位視為 **代理程式目標**，而非原始提供者模型 ID。

- `model: "openclaw"` 路由至設定的預設代理程式。
- `model: "openclaw/default"` 也會路由至設定的預設代理程式。
- `model: "openclaw/<agentId>"` 路由至特定的代理程式。

選用的請求標頭：

- `x-openclaw-model: <provider/model-or-bare-id>` 會覆寫所選代理程式的後端模型。
- `x-openclaw-agent-id: <agentId>` 作為相容性覆寫仍然受到支援。
- `x-openclaw-session-key: <sessionKey>` 完全控制會話路由。
- `x-openclaw-message-channel: <channel>` 為具通道感知功能的提示詞和原則設定合成輸入通道內容。

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

## 會話行為

根據預設，該端點是 **每個請求無狀態** 的 (每次呼叫都會產生新的會話金鑰)。

如果請求包含 OpenAI `user` 字串，閘道會從中衍生出穩定的會話金鑰，以便重複呼叫可以共用代理程式會話。

## 為何此介面很重要

這是自託管前端和工具最高槓桿的相容性組合：

- 大多數 Open WebUI、LobeChat 和 LibreChat 設定都預期 `/v1/models`。
- 許多 RAG 系統預期 `/v1/embeddings`。
- 現有的 OpenAI 聊天客戶端通常可以從 `/v1/chat/completions` 開始。
- 更多代理程式原生客戶端越來越偏好 `/v1/responses`。

## 模型列表與代理程式路由

<AccordionGroup>
  <Accordion title="`/v1/models` 會傳回什麼？">
    OpenClaw 代理程式目標清單。

    傳回的 id 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 項目。
    直接將它們作為 OpenAI `model` 值使用。

  </Accordion>
  <Accordion title="`/v1/models` 列出的是代理程式還是子代理程式？">
    它列出的是頂層代理程式目標，而非後端提供者模型或子代理程式。

    子代理程式仍是內部執行拓撲的一部分。它們不會顯示為虛擬模型。

  </Accordion>
  <Accordion title="為什麼包含 `openclaw/default`？">
    `openclaw/default` 是已設定預設代理程式的穩定別名。

    這意味著即使實際的預設代理程式 ID 在環境之間發生變更，客戶端仍可繼續使用同一個可預測的 ID。

  </Accordion>
  <Accordion title="我該如何覆寫後端模型？">
    使用 `x-openclaw-model`。

    範例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.4`

    若省略它，所選的代理程式將以其正常設定的模型選擇執行。

  </Accordion>
  <Accordion title="嵌入模型如何適用此合約？">
    `/v1/embeddings` 使用相同的代理程式目標 `model` id。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    當您需要特定嵌入模型時，請在 `x-openclaw-model` 中傳送它。
    若沒有該標頭，請求將傳遞至所選代理程式的正常嵌入設定。

  </Accordion>
</AccordionGroup>

## 串流 (SSE)

設定 `stream: true` 以接收伺服器傳送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行都是 `data: <json>`
- 串流以 `data: [DONE]` 結束

## Open WebUI 快速設定

若要進行基本的 Open WebUI 連線：

- Base URL: `http://127.0.0.1:18789/v1`
- Docker on macOS base URL: `http://host.docker.internal:18789/v1`
- API key: 您的 Gateway bearer token
- 模型：`openclaw/default`

預期行為：

- `GET /v1/models` 應該列出 `openclaw/default`
- Open WebUI 應該使用 `openclaw/default` 作為聊天模型 ID
- 如果您想要為該代理程式指定特定的後端提供者/模型，請設定代理程式的正常預設模型或傳送 `x-openclaw-model`

快速驗證：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果該請求返回 `openclaw/default`，大多數 Open WebUI 設定都可以使用相同的基礎 URL 和權杖進行連接。

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

獲取單一模型：

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

- `/v1/models` 返回的是 OpenClaw 代理程式目標，而不是原始提供者目錄。
- `openclaw/default` 始終存在，因此一個穩定的 ID 可以在不同環境中運作。
- 後端提供者/模型覆寫應放在 `x-openclaw-model` 中，而不是 OpenAI 的 `model` 欄位。
- `/v1/embeddings` 支援將 `input` 作為字串或字串陣列。
