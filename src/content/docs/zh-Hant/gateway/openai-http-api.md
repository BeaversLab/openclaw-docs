---
summary: "從 Gateway 公開與 OpenAI 相容的 /v1/chat/completions HTTP 端點"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI 聊天補全"
---

OpenClaw 的 Gateway 可以提供一個小型的 OpenAI 相容 Chat Completions 端點。

此端點預設為**已停用**。請先在設定中啟用它。

- `POST /v1/chat/completions`
- 與 Gateway 相同的連接埠（WS + HTTP 多工）：`http://<gateway-host>:<port>/v1/chat/completions`

當啟用 Gateway 的 OpenAI 相容 HTTP 介面時，它還提供：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/responses`

在底層，請求會作為一般的 Gateway agent 執行執行（與 `openclaw agent` 的程式碼路徑相同），因此路由/權限/設定會與您的 Gateway 相符。

## 驗證

使用 Gateway 驗證設定。

常見的 HTTP 驗證路徑：

- shared-secret auth (`gateway.auth.mode="token"` 或 `"password"`)：
  `Authorization: Bearer <token-or-password>`
- trusted identity-bearing HTTP auth (`gateway.auth.mode="trusted-proxy"`)：
  透過設定的身分感知代理伺服器進行路由，並讓其注入
  所需的身分標頭
- private-ingress open auth (`gateway.auth.mode="none"`)：
  不需要 auth 標頭

備註：

- 當 `gateway.auth.mode="token"` 時，請使用 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
- 當 `gateway.auth.mode="password"` 時，請使用 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
- 當 `gateway.auth.mode="trusted-proxy"` 時，HTTP 請求必須來自
  設定的受信任代理伺服器來源；同主機回送代理伺服器需要明確的
  `gateway.auth.trustedProxy.allowLoopback = true`。
- 繞過代理伺服器的內部同主機呼叫端可以使用
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 作為本機直接
  後備方案。任何 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 標頭證據
  都會讓請求保持在受信任代理伺服器路徑上。
- 如果設定了 `gateway.auth.rateLimit` 且發生過多驗證失敗，端點會傳回 `429` 並附帶 `Retry-After`。

## 安全邊界 (重要)

將此端點視為 gateway 實例的 **完整操作員存取** 層面。

- 此處的 HTTP bearer 驗證並非狹隘的單一使用者範圍模型。
- 此端點的有效 Gateway token/password 應視為擁有者/操作員憑證。
- 請求會通過與可信操作員動作相同的控制平面代理路徑。
- 此端點上沒有獨立的非擁有者/單一使用者工具邊界；一旦呼叫者通過此處的 Gateway 驗證，OpenClaw 會將該呼叫者視為此 gateway 的可信操作員。
- 對於 shared-secret auth 模式（`token` 和 `password`），即使呼叫端發送了較狹窄的 `x-openclaw-scopes` 標頭，端點也會還原正常的完整運算子預設值。
- 攜帶受信任身分識別的 HTTP 模式（例如受信任的 Proxy 驗證或 `gateway.auth.mode="none"`）會在存在時遵守 `x-openclaw-scopes`，否則會回退到正常的操作員預設範圍集。
- 如果目標代理策略允許敏感工具，此端點可以使用它們。
- 請將此端點保留在 loopback/tailnet/private ingress 上；不要將其直接暴露於公共網際網路。

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共享的 gateway operator secret
  - 忽略較窄的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 將此端點上的聊天對話視為 owner-sender 對話
- 攜帶受信任身分識別的 HTTP 模式（例如受信任的 Proxy 驗證，或私人入口上的 `gateway.auth.mode="none"`）
  - 驗證某個外部受信任的身份或部署邊界
  - 當標頭存在時遵守 `x-openclaw-scopes`
  - 當標頭不存在時，回退到正常的 operator 預設 scope set
  - 僅當呼叫者明確縮小範圍並省略 `operator.admin` 時，才會失去擁有者語意

請參閱 [安全](/zh-Hant/gateway/security) 和 [遠端存取](/zh-Hant/gateway/remote)。

## 何時使用此端點

當您整合工具或受信任的應用程式端後端與現有閘道，並能安全地持有閘道操作員憑證時，請使用 `/v1/chat/completions`。

- 當您的整合只是同一閘道的另一個操作員/客戶端介面時，優先使用此方式，而非新增新的內建頻道。
- 對於直接連接到遠端閘道的原生行動客戶端，建議優先使用 [WebChat](/zh-Hant/web/webchat) 或 [閘道協定](/zh-Hant/gateway/protocol)，並實作配對設備引導/設備令牌流程，以便設備不需要共享的 HTTP 令牌/密碼。
- 當您整合具有自己的使用者、聊天室、Webhook 傳遞或出站傳輸的外部訊息網路時，請改為建構通道外掛程式。請參閱 [建構外掛程式](/zh-Hant/plugins/building-plugins)。

## Agent-first 模型合約

OpenClaw 將 OpenAI `model` 欄位視為 **agent 目標**，而非原始的提供者模型 ID。

- `model: "openclaw"` 路由至已設定的預設代理程式。
- `model: "openclaw/default"` 也會路由至已設定的預設代理程式。
- `model: "openclaw/<agentId>"` 路由至特定的代理程式。

可選的請求標頭：

- `x-openclaw-model: <provider/model-or-bare-id>` 會覆寫所選代理程式的後端模型。
- `x-openclaw-agent-id: <agentId>` 仍作為相容性覆寫獲得支援。
- `x-openclaw-session-key: <sessionKey>` 完全控制會話路由。
- `x-openclaw-message-channel: <channel>` 設定用於通道感知提示和原則的綜合輸入通道上下文。

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

根據預設，端點為**每個請求無狀態**（每次呼叫都會產生新的會話金鑰）。

如果請求包含 OpenAI `user` 字串，閘道會從中衍生出穩定的會話金鑰，以便重複的呼叫能共用代理程式會話。

對於自訂應用程式，最安全的預設值是每個對話執行緒重複使用相同的 `user` 值。除非您明確希望多個對話或裝置共用一個 OpenClaw 會話，否則請避免使用帳戶層級的識別碼。當您需要跨多個用戶端或執行緒進行明確路由控制時，請使用 `x-openclaw-session-key`。

## 為何此介面很重要

這是自託管前端和工具最高槓桿的相容性集合：

- 大多數 Open WebUI、LobeChat 和 LibreChat 設定都預期 `/v1/models`。
- 許多 RAG 系統預期 `/v1/embeddings`。
- 現有的 OpenAI 聊天用戶端通常可以從 `/v1/chat/completions` 開始。
- 更多代理程式原生用戶端越來越偏好 `/v1/responses`。

## 模型清單與代理程式路由

<AccordionGroup>
  <Accordion title="`/v1/models` 會傳回什麼？">
    OpenClaw 代理程式目標清單。

    傳回的 id 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 項目。
    直接將其作為 OpenAI `model` 值使用。

  </Accordion>
  <Accordion title="Does `/v1/models` list agents or sub-agents?">
    它列出的是頂層代理目標，而非後端提供者模型，也不是子代理。

    子代理仍保留為內部執行拓撲。它們不會顯示為虛擬模型。

  </Accordion>
  <Accordion title="Why is `openclaw/default` included?">
    `openclaw/default` 是所設定的預設代理的穩定別名。

    這意味著即使實際的預設代理 ID 在不同環境之間發生變化，客戶端仍可繼續使用同一個可預測的 ID。

  </Accordion>
  <Accordion title="How do I override the backend model?">
    使用 `x-openclaw-model`。

    範例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果您省略該參數，所選代理將以其正常設定的模型選擇執行。

  </Accordion>
  <Accordion title="How do embeddings fit this contract?">
    `/v1/embeddings` 使用相同的代理目標 `model` id。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    當您需要特定的嵌入模型時，請在 `x-openclaw-model` 中發送。
    如果沒有該標頭，請求將傳遞至所選代理的正常嵌入設定。

  </Accordion>
</AccordionGroup>

## 串流 (SSE)

設定 `stream: true` 以接收伺服器推送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行都是 `data: <json>`
- 串流以 `data: [DONE]` 結束

## Chat tool contract

`/v1/chat/completions` 支援與常見 OpenAI Chat 客戶端相容的 function-tool 子集。

### 支援的請求欄位

- `tools`：`{ "type": "function", "function": { ... } }` 陣列
- `tool_choice`：`"auto"`, `"none"`
- `messages[*].role: "tool"` 後續對話輪次
- `messages[*].tool_call_id` 用於將工具結果綁定回先前的工具呼叫
- `max_completion_tokens`: number; 每次呼叫總完成 token 的上限（包含推理 token）。這是目前 OpenAI Chat Completions 的欄位名稱；當同時傳送 `max_completion_tokens` 和 `max_tokens` 時，偏好使用此欄位。
- `max_tokens`: number; 為了向後相容而接受的舊版別名。如果同時存在 `max_completion_tokens`，則會忽略此欄位。
- `temperature`: number; 透過代理串流參數通道盡力轉發至上游供應商的採樣溫度。
- `top_p`: number; 透過代理串流參數通道盡力轉發至上游供應商的核心採樣。
- `frequency_penalty`: number；盡力透過代理程式串流參數通道轉發到上游提供者的頻率懲罰。驗證範圍：-2.0 到 2.0。對於超出範圍的值，傳回 `400 invalid_request_error`。
- `presence_penalty`: number；盡力透過代理程式串流參數通道轉發到上游提供者的存在懲罰。驗證範圍：-2.0 到 2.0。對於超出範圍的值，傳回 `400 invalid_request_error`。
- `seed`: number (整數)；盡力透過代理程式串流參數通道轉發到上游提供者的種子。對於非整數值，傳回 `400 invalid_request_error`。
- `stop`：字串或最多 4 個字串的陣列；透過代理串流參數通道盡力轉發至上游提供者的停止序列。如果序列超過 4 個或是非字串/空條目，則傳回 `400 invalid_request_error`。

當設定任一 token 欄位時，該值會透過代理串流參數通道轉發至上游提供者。實際發送到上游提供者的連線欄位名稱由提供者傳輸決定：OpenAI 系列端點為 `max_completion_tokens`，而僅接受舊名稱的提供者（例如 Mistral 和 Chutes）則為 `max_tokens`。採樣欄位（`temperature`、`top_p`、`frequency_penalty`、`presence_penalty`、`seed`）遵循相同的串流參數通道；由於 ChatGPT 型的 Codex Responses 後端使用固定採樣，因此會在伺服器端將其剝離。`stop` 也使用串流參數通道，並對應到傳輸的停止欄位（Chat Completions 後端為 `stop`，Anthropic 則為 `stop_sequences`）；OpenAI Responses API 沒有停止參數，因此 `stop` 不會套用在以 Responses 為基礎的模型上。

### 不支援的變體

對於不支援的工具變體，端點會傳回 `400 invalid_request_error`，包括：

- 非陣列 `tools`
- 非函式工具條目
- 缺少 `tool.function.name`
- `tool_choice` 變體，例如 `allowed_tools` 和 `custom`
- `tool_choice: "required"`（尚未在執行時強制執行；一旦實施強制執行將會支援）
- `tool_choice: { "type": "function", "function": { "name": "..." } }`（理由與 `required` 相同）
- 與提供的 `tools` 不相符的 `tool_choice.function.name` 值

### 非串流工具回應形狀

當代理決定呼叫工具時，回應會使用：

- `choices[0].finish_reason = "tool_calls"`
- `choices[0].message.tool_calls[]` 項目包含：
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments`（JSON 字串）

在工具呼叫之前的助理評論會在 `choices[0].message.content` 中回傳（可能為空）。

### 串流工具回應形狀

當 `stream: true` 時，工具呼叫會以增量 SSE 區塊發出：

- 初始助理角色增量
- 可選助理評論增量
- 一個或多個 `delta.tool_calls` 區塊，攜帶工具身分和參數片段
- 最後一個帶有 `finish_reason: "tool_calls"` 的區塊
- `data: [DONE]`

如果 `stream_options.include_usage=true`，會在 `[DONE]` 之前發出一個結尾的使用量區塊。

### 工具後續迴圈

收到 `tool_calls` 後，客戶端應執行請求的函數並發送包含以下內容的後續請求：

- 先前的助理工具呼叫訊息
- 一或多個帶有相符 `tool_call_id` 的 `role: "tool"` 訊息

這允許閘道代理執行繼續相同的推理迴圈並產生最終的助理回答。

## Open WebUI 快速設定

基本的 Open WebUI 連線：

- Base URL：`http://127.0.0.1:18789/v1`
- macOS 上的 Docker Base URL：`http://host.docker.internal:18789/v1`
- API 金鑰：您的 Gateway bearer token
- 模型：`openclaw/default`

預期行為：

- `GET /v1/models` 應列出 `openclaw/default`
- Open WebUI 應使用 `openclaw/default` 作為聊天模型 ID
- 如果您希望為該代理指定特定的後端提供商/模型，請設定代理的正常預設模型或傳送 `x-openclaw-model`

快速驗證：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，大多數 Open WebUI 設定可以使用相同的基礎 URL 和 Token 進行連接。

## 範例

針對單一應用程式對話的穩定會話：

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "openclaw/default",
    "user": "conv:YOUR_CONVERSATION_ID",
    "messages": [{"role":"user","content":"Summarize my tasks for today"}]
  }'
```

在後續針對該對話的呼叫中重複使用相同的 `user` 值，以延續相同的代理會話。

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

- `/v1/models` 返回 OpenClaw 代理目標，而非原始提供商目錄。
- `openclaw/default` 始終存在，因此一個穩定的 ID 可在各環境中運作。
- 後端提供商/模型覆寫應置於 `x-openclaw-model`，而非 OpenAI 的 `model` 欄位中。
- `/v1/embeddings` 支援 `input` 作為字串或字串陣列。

## 相關

- [設定參考](/zh-Hant/gateway/configuration-reference)
- [OpenAI](/zh-Hant/providers/openai)
