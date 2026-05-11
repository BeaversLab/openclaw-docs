---
summary: "從 Gateway 公開相容 OpenAI 的 /v1/chat/completions HTTP 端點"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI chat completions"
---

OpenClaw 的 Gateway 可以提供一個小型 OpenAI 相容的 Chat Completions 端點。

此端點預設為**已停用**。請先在設定中啟用它。

- `POST /v1/chat/completions`
- 與 Gateway 相同的連接埠 (WS + HTTP 多工): `http://<gateway-host>:<port>/v1/chat/completions`

當啟用 Gateway 的 OpenAI 相容 HTTP 介面時，它還會提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底層，請求是作為正常的 Gateway 執行個體執行的（與 `openclaw agent` 的程式碼路徑相同），因此路由/權限/設定與您的 Gateway 相符。

## 驗證

使用 Gateway 驗證設定。

常見的 HTTP 驗證路徑：

- shared-secret 驗證 (`gateway.auth.mode="token"` 或 `"password"`):
  `Authorization: Bearer <token-or-password>`
- 受信任的身分識別承載 HTTP 驗證 (`gateway.auth.mode="trusted-proxy"`):
  透過設定的身分識別感知代理進行路由，並讓它注入所需的身分標頭
- private-ingress open 驗證 (`gateway.auth.mode="none"`):
  不需要驗證標頭

備註：

- 當使用 `gateway.auth.mode="token"` 時，請使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當使用 `gateway.auth.mode="password"` 時，請使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 當使用 `gateway.auth.mode="trusted-proxy"` 時，HTTP 請求必須來自設定的非本機受信任代理來源；相同主機的本機迴圈代理不滿足此模式。
- 如果設定了 `gateway.auth.rateLimit` 且發生過多驗證失敗，端點會傳回 `429` 並帶有 `Retry-After`。

## 安全邊界 (重要)

將此端點視為 Gateway 執行個體的**完整操作員存取**介面。

- 此處的 HTTP bearer 驗證並非狹隘的單一使用者範圍模型。
- 此端點的有效 Gateway 權杖/密碼應視為擁有者/操作員憑證。
- 請求會透過與受信任操作員操作相同的控制平面代理路徑執行。
- 此端點沒有獨立的非擁有者/每個使用者的工具邊界；一旦呼叫者在此處通過 Gateway 身分驗證，OpenClaw 會將該呼叫者視為此 Gateway 的受信任操作員。
- 對於共用金鑰驗證模式（`token` 和 `password`），即使呼叫者發送了較窄的 `x-openclaw-scopes` 標頭，該端點也會恢復正常的完整操作員預設值。
- 承載受信任身分的 HTTP 模式（例如受信任的 Proxy 驗證或 `gateway.auth.mode="none"`）在存在時會遵守 `x-openclaw-scopes`，否則會回退到正常的操作員預設範圍集。
- 如果目標 Agent 原則允許敏感工具，此端點可以使用它們。
- 請僅將此端點保留在 loopback/tailnet/private 入口上；不要直接將其暴露於公共網際網路。

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共用的 Gateway 操作員金鑰
  - 忽略較窄的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 將此端點上的聊天輪次視為擁有者-發送者輪次
- 承載受信任身分的 HTTP 模式（例如受信任的 Proxy 驗證，或 private ingress 上的 `gateway.auth.mode="none"`）
  - 驗證某個外部受信任身分或部署邊界
  - 當標頭存在時遵守 `x-openclaw-scopes`
  - 當標頭不存在時，回退到正常的操作員預設範圍集
  - 僅當呼叫者明確縮小範圍並省略 `operator.admin` 時，才會失去擁有者語意

請參閱 [安全性](/zh-Hant/gateway/security) 和 [遠端存取](/zh-Hant/gateway/remote)。

## Agent 優先模型合約

OpenClaw 將 OpenAI `model` 欄位視為 **Agent 目標**，而非原始提供者模型 ID。

- `model: "openclaw"` 路由到設定的預設 Agent。
- `model: "openclaw/default"` 也會路由到設定的預設 Agent。
- `model: "openclaw/<agentId>"` 路由到特定的 Agent。

可選的請求標頭：

- `x-openclaw-model: <provider/model-or-bare-id>` 會覆寫所選代理程式的後端模型。
- `x-openclaw-agent-id: <agentId>` 仍然作為相容性覆寫受到支援。
- `x-openclaw-session-key: <sessionKey>` 完全控制會話路由。
- `x-openclaw-message-channel: <channel>` 設定通道感知提示和原則的合成輸入通道上下文。

仍接受相容性別名：

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

預設情況下，該端點是**每個請求無狀態的**（每次呼叫都會產生新的會話金鑰）。

如果請求包含 OpenAI `user` 字串，閘道會從中衍生出穩定的會話金鑰，因此重複呼叫可以共用代理程式會話。

## 為何此介面很重要

這是對於自託管前端和工具而言，杠杆率最高的相容性組合：

- 大多數 Open WebUI、LobeChat 和 LibreChat 設定都預期使用 `/v1/models`。
- 許多 RAG 系統預期使用 `/v1/embeddings`。
- 現有的 OpenAI 聊天客戶端通常可以從 `/v1/chat/completions` 開始。
- 更多代理程式原生客戶端越來越傾向於使用 `/v1/responses`。

## 模型清單與代理程式路由

<AccordionGroup>
  <Accordion title="`/v1/models` 會回傳什麼？">
    OpenClaw 代理程式目標清單。

    傳回的 id 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 項目。
    直接將它們作為 OpenAI `model` 值使用。

  </Accordion>
  <Accordion title="`/v1/models` 列出的是代理程式還是子代理程式？">
    它列出的是頂層代理程式目標，而非後端提供者模型，也不是子代理程式。

    子代理程式仍是內部執行拓撲。它們不會顯示為虛擬模型。

  </Accordion>
  <Accordion title="為什麼包含 `openclaw/default`？">
    `openclaw/default` 是所設定預設代理程式的穩定別名。

    這意味著即使實際的預設代理程式 ID 在環境之間發生變化，用戶端仍可繼續使用一個可預測的 ID。

  </Accordion>
  <Accordion title="如何覆寫後端模型？">
    使用 `x-openclaw-model`。

    範例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果省略它，所選的代理程式將以其正常設定的模型選擇執行。

  </Accordion>
  <Accordion title="嵌入如何符合此合約？">
    `/v1/embeddings` 使用相同的代理程式目標 `model` ID。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    當您需要特定的嵌入模型時，請在 `x-openclaw-model` 中發送它。
    如果沒有該標頭，請求將傳遞至所選代理程式的正常嵌入設定。

  </Accordion>
</AccordionGroup>

## 串流 (SSE)

設定 `stream: true` 以接收伺服器傳送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行是 `data: <json>`
- 串流以 `data: [DONE]` 結束

## Open WebUI 快速設定

針對基本的 Open WebUI 連線：

- Base URL: `http://127.0.0.1:18789/v1`
- macOS 上 Docker 的 base URL: `http://host.docker.internal:18789/v1`
- API key: 您的 Gateway bearer token
- Model: `openclaw/default`

預期行為：

- `GET /v1/models` 應該列出 `openclaw/default`
- Open WebUI 應該使用 `openclaw/default` 作為聊天模型 ID
- 如果您希望該代理程式使用特定的後端供應商/模型，請設定代理程式的正常預設模型或發送 `x-openclaw-model`

快速測試：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，大多數 Open WebUI 設定都可以使用相同的 base URL 和 token 連接。

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

擷取一個模型：

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

註記：

- `/v1/models` 返回 OpenClaw 代理程式目標，而非原始供應商目錄。
- `openclaw/default` 始終存在，因此一個穩定的 ID 可在不同環境中使用。
- 後端供應商/模型覆寫應放在 `x-openclaw-model` 中，而非 OpenAI 的 `model` 欄位。
- `/v1/embeddings` 支援 `input` 為字串或字串陣列。

## 相關

- [設定參考](/zh-Hant/gateway/configuration-reference)
- [OpenAI](/zh-Hant/providers/openai)
