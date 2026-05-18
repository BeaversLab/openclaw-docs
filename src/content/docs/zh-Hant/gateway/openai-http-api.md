---
summary: "從 Gateway 公開相容 OpenAI 的 /v1/chat/completions HTTP 端點"
read_when:
  - Integrating tools that expect OpenAI Chat Completions
title: "OpenAI chat completions"
---

OpenClaw 的 Gateway 可以提供一個小型的 OpenAI 相容 Chat Completions 端點。

此端點預設為**已停用**。請先在設定中啟用它。

- `POST /v1/chat/completions`
- 與 Gateway 相同的連接埠 (WS + HTTP 多工): `http://<gateway-host>:<port>/v1/chat/completions`

當啟用 Gateway 的 OpenAI 相容 HTTP 介面時，它還提供：

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
- 當 `gateway.auth.mode="trusted-proxy"` 時，HTTP 請求必須來自
  已設定的信任來源；同主機的 loopback 代理需要明確的
  `gateway.auth.trustedProxy.allowLoopback = true`。
- 繞過代理的內部同主機呼叫者可以使用
  `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` 作為本機直接
  備援。任何 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 標頭證據
  都會將請求保持在信任代理路徑上。
- 如果設定了 `gateway.auth.rateLimit` 且發生過多驗證失敗，端點會傳回 `429` 並帶有 `Retry-After`。

## 安全邊界 (重要)

將此端點視為 gateway 實例的 **完整操作員存取** 層面。

- 此處的 HTTP bearer 驗證並非狹隘的單一使用者範圍模型。
- 此端點的有效 Gateway token/password 應視為擁有者/操作員憑證。
- 請求會通過與可信操作員動作相同的控制平面代理路徑。
- 此端點上沒有獨立的非擁有者/單一使用者工具邊界；一旦呼叫者通過此處的 Gateway 驗證，OpenClaw 會將該呼叫者視為此 gateway 的可信操作員。
- 對於共享金鑰驗證模式（`token` 和 `password`），即使呼叫者發送了較狹隘的 `x-openclaw-scopes` 標頭，端點也會還原正常的完整運算子預設值。
- 承載身分識別的受信任 HTTP 模式（例如受信任代理驗證或 `gateway.auth.mode="none"`）會在存在時遵守 `x-openclaw-scopes`，否則會回退到正常的運算子預設範圍集。
- 如果目標代理策略允許敏感工具，此端點可以使用它們。
- 請將此端點保留在 loopback/tailnet/private ingress 上；不要將其直接暴露於公共網際網路。

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共享的 gateway operator secret
  - 忽略較狹隘的 `x-openclaw-scopes`
  - 還原完整的預設運算子範圍集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 將此端點上的聊天對話視為 owner-sender 對話
- 承載身分識別的受信任 HTTP 模式（例如受信任代理驗證，或在私有入口上的 `gateway.auth.mode="none"`）
  - 驗證某個外部受信任的身份或部署邊界
  - 當標頭存在時遵守 `x-openclaw-scopes`
  - 當標頭不存在時，回退到正常的 operator 預設 scope set
  - 僅當呼叫者明確縮小範圍並省略 `operator.admin` 時，才會失去擁有者語意

請參閱 [安全性](/zh-Hant/gateway/security) 和 [遠端存取](/zh-Hant/gateway/remote)。

## Agent-first 模型合約

OpenClaw 將 OpenAI `model` 欄位視為 **代理目標**，而非原始提供者模型 ID。

- `model: "openclaw"` 路由至設定的預設代理。
- `model: "openclaw/default"` 也路由至設定的預設代理。
- `model: "openclaw/<agentId>"` 路由至特定代理。

可選的要求標頭：

- `x-openclaw-model: <provider/model-or-bare-id>` 會覆寫所選代理的後端模型。
- `x-openclaw-agent-id: <agentId>` 作為相容性覆寫仍受支援。
- `x-openclaw-session-key: <sessionKey>` 完全控制工作階段路由。
- `x-openclaw-message-channel: <channel>` 為具通道感知能力的提示與策略設定合成入站通道情境。

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

## Session 行為

預設情況下，該端點是 **無狀態的（每次請求）**（每次呼叫都會產生新的 session 金鑰）。

如果請求包含 OpenAI `user` 字串，閘道會從中衍生穩定的會話金鑰，因此重複呼叫可以共用代理程式會話。

## 為何此介面重要

這是自託管前端和工具具最高杠杆作用的相容性集合：

- 大多數 Open WebUI、LobeChat 和 LibreChat 設定都期望 `/v1/models`。
- 許多 RAG 系統期望 `/v1/embeddings`。
- 現有的 OpenAI 聊天客戶端通常可以從 `/v1/chat/completions` 開始。
- 更多原生代理程式客戶端越來越傾向於 `/v1/responses`。

## 模型列表和代理程式路由

<AccordionGroup>
  <Accordion title="`/v1/models`%PH:INLINE_CODE:88:70c695da%% 會回傳什麼？">
    一份 OpenClaw 代理程式目標清單。

    回傳的 id 為 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 項目。
    直接將它們用作 OpenAI `model` 值。

  </Accordion>
  <Accordion title="`/v1/models`%PH:INLINE_CODE:93:70c695da%% 列出的是代理程式還是子代理程式？">
    它列出的是頂層代理程式目標，而非後端提供者模型，也非子代理程式。

    子代理程式仍屬於內部執行拓撲。它們不會以虛擬模型形式出現。

  </Accordion>
  <Accordion title="為什麼包含 `openclaw/default`？">
    `openclaw/default` 是所設定預設代理程式的穩定別名。

    這意味著即使實際的預設代理程式 id 在環境之間發生變更，客戶端仍可繼續使用一個可預測的 id。

  </Accordion>
  <Accordion title="如何覆寫後端模型？">
    使用 `x-openclaw-model`。

    範例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.5`

    如果您省略它，所選的 Agent 將以其正常配置的模型選項運作。

  </Accordion>
  <Accordion title="嵌入功能如何適用此合約？">
    `/v1/embeddings` 使用相同的 Agent 目標 `model` ID。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    當您需要特定的嵌入模型時，請在 `x-openclaw-model` 中發送它。
    如果沒有該標頭，請求將傳遞給所選 Agent 的正常嵌入設定。

  </Accordion>
</AccordionGroup>

## 串流 (SSE)

設定 `stream: true` 以接收伺服器傳送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行為 `data: <json>`
- 串流以 `data: [DONE]` 結束

## 聊天工具合約

`/v1/chat/completions` 支援與常見 OpenAI Chat 用戶端相容的函數工具子集。

### 支援的請求欄位

- `tools`：`{ "type": "function", "function": { ... } }` 的陣列
- `tool_choice`：`"auto"`、`"none"`
- `messages[*].role: "tool"` 後續輪次
- `messages[*].tool_call_id` 用於將工具結果綁定回先前的工具呼叫
- `max_completion_tokens`：數字；每次呼叫總完成 Token 的上限（包含推理 Token）。目前的 OpenAI Chat Completions 欄位名稱；當同時發送 `max_completion_tokens` 和 `max_tokens` 時，優先使用此欄位。
- `max_tokens`：數字；為了向後相容而接受的舊版別名。當同時存在 `max_completion_tokens` 時將被忽略。
- `temperature`：數字；透過 Agent 串流參數通道轉發至上游提供者的盡力而為的採樣溫度。
- `top_p`：數字；透過 Agent 串流參數通道轉發至上游提供者的盡力而為的原子核採樣。

當設定了其中一個 token 欄位時，該值會透過代理串流參數通道轉發至上游提供者。實際傳送給上游提供者的實體欄位名稱是由提供者傳輸層決定的：針對 OpenAI 系列端點為 `max_completion_tokens`，而針對僅接受舊名稱的提供者（例如 Mistral 和 Chutes）則為 `max_tokens`。採樣欄位（`temperature`、`top_p`）同樣遵循相同的串流參數通道；由於 ChatGPT 型態的 Codex Responses 後端使用固定採樣，因此會在伺服器端將其剔除。

### 不支援的變體

針對不支援的工具變體，端點會傳回 `400 invalid_request_error`，包括：

- 非陣列的 `tools`
- 非函式工具項目
- 缺少 `tool.function.name`
- `tool_choice` 變體，例如 `allowed_tools` 和 `custom`
- `tool_choice: "required"`（目前尚未在執行時期強制執行；將在實施嚴格強制執行後提供支援）
- `tool_choice: { "type": "function", "function": { "name": "..." } }`（理由與 `required` 相同）
- 不符合所提供 `tools` 的 `tool_choice.function.name` 值

### 非串流工具回應形狀

當代理決定呼叫工具時，回應會使用：

- `choices[0].finish_reason = "tool_calls"`
- 具有以下內容的 `choices[0].message.tool_calls[]` 項目：
  - `id`
  - `type: "function"`
  - `function.name`
  - `function.arguments`（JSON 字串）

工具呼叫之前的助理評論會在 `choices[0].message.content` 中傳回（可能為空）。

### 串流工具回應形狀

當 `stream: true` 時，工具呼叫會以遞增式 SSE 區塊發出：

- 初始助理角色增量
- 選用助理評論增量
- 一或多個 `delta.tool_calls` 區塊，攜帶工具識別碼和參數片段
- 帶有 `finish_reason: "tool_calls"` 的最終區塊
- `data: [DONE]`

如果 `stream_options.include_usage=true`，則會在 `[DONE]` 之前發出一個結尾的使用量區塊。

### 工具後續迴圈

收到 `tool_calls` 後，用戶端應執行請求的函數並發送後續請求，其中包括：

- 先前的助理工具呼叫訊息
- 一或多條具有匹配 `tool_call_id` 的 `role: "tool"` 訊息

這允許閘道代理程式執行繼續相同的推理迴圈，並產生最終的助理回答。

## Open WebUI 快速設定

基本的 Open WebUI 連線：

- Base URL: `http://127.0.0.1:18789/v1`
- macOS 上 Docker 的 Base URL: `http://host.docker.internal:18789/v1`
- API 金鑰：您的 Gateway bearer token
- 模型：`openclaw/default`

預期行為：

- `GET /v1/models` 應列出 `openclaw/default`
- Open WebUI 應使用 `openclaw/default` 作為聊天模型 ID
- 如果您希望該代理程式使用特定的後端提供者/模型，請設定代理程式的正常預設模型，或發送 `x-openclaw-model`

快速驗證：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果該請求返回 `openclaw/default`，則大多數 Open WebUI 設定都可以使用相同的 Base URL 和 token 進行連線。

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

擷取單一模型：

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

- `/v1/models` 會返回 OpenClaw 代理程式目標，而非原始提供者目錄。
- `openclaw/default` 始終存在，因此一個穩定的 ID 可在不同環境中使用。
- 後端提供者/模型的覆寫屬於 `x-openclaw-model`，而非 OpenAI 的 `model` 欄位。
- `/v1/embeddings` 支援 `input` 為字串或字串陣列。

## 相關

- [設定參考](/zh-Hant/gateway/configuration-reference)
- [OpenAI](/zh-Hant/providers/openai)
