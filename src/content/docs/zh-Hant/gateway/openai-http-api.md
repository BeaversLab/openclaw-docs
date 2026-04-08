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

使用 Gateway 驗證配置。

常見的 HTTP 驗證路徑：

- 共享密鑰驗證 (`gateway.auth.mode="token"` 或 `"password"`)：
  `Authorization: Bearer <token-or-password>`
- 可信的身分承載 HTTP 驗證 (`gateway.auth.mode="trusted-proxy"`)：
  透過配置的身分感知代理路由，並讓其注入所需的身分標頭
- 私有入口開放驗證 (`gateway.auth.mode="none"`)：
  不需要驗證標頭

備註：

- 當 `gateway.auth.mode="token"` 時，使用 `gateway.auth.token` (或 `OPENCLAW_GATEWAY_TOKEN`)。
- 當 `gateway.auth.mode="password"` 時，使用 `gateway.auth.password` (或 `OPENCLAW_GATEWAY_PASSWORD`)。
- 當 `gateway.auth.mode="trusted-proxy"` 時，HTTP 請求必須來自於配置的非回圈可信代理來源；同主機回圈代理不滿足此模式。
- 如果配置了 `gateway.auth.rateLimit` 並且發生過多驗證失敗，端點將傳回 `429` 並帶有 `Retry-After`。

## 安全邊界 (重要)

將此端點視為 gateway 實例的 **完整操作員存取** 層面。

- 此處的 HTTP bearer 驗證並非狹隘的單一使用者範圍模型。
- 此端點的有效 Gateway token/password 應視為擁有者/操作員憑證。
- 請求會通過與可信操作員動作相同的控制平面代理路徑。
- 此端點上沒有獨立的非擁有者/單一使用者工具邊界；一旦呼叫者通過此處的 Gateway 驗證，OpenClaw 會將該呼叫者視為此 gateway 的可信操作員。
- 對於共享密鑰驗證模式 (`token` 和 `password`)，即使呼叫者發送了較狹隘的 `x-openclaw-scopes` 標頭，端點也會恢復正常的完整操作員預設值。
- 可信的身分承載 HTTP 模式 (例如可信代理驗證或 `gateway.auth.mode="none"`) 會在存在時遵守 `x-openclaw-scopes`，否則回退到正常的操作員預設範圍設定。
- 如果目標代理策略允許敏感工具，此端點可以使用它們。
- 請將此端點保留在 loopback/tailnet/private ingress 上；不要將其直接暴露於公共網際網路。

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共享的 gateway operator secret
  - 忽略較窄的 `x-openclaw-scopes`
  - 恢復完整的預設 operator scope set：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 將此端點上的聊天對話視為 owner-sender 對話
- 受信任的攜帶身份的 HTTP 模式（例如受信任的 proxy auth，或私有 ingress 上的 `gateway.auth.mode="none"`）
  - 驗證某個外部受信任的身份或部署邊界
  - 當標頭存在時，遵守 `x-openclaw-scopes`
  - 當標頭不存在時，回退到正常的 operator 預設 scope set
  - 僅當呼叫者明確縮小 scope 並省略 `operator.admin` 時，才會失去 owner 語意

請參閱 [安全性](/en/gateway/security) 和 [遠端存取](/en/gateway/remote)。

## Agent-first 模型合約

OpenClaw 將 OpenAI `model` 欄位視為 **agent 目標**，而非原始的提供者模型 ID。

- `model: "openclaw"` 路由至設定的預設 agent。
- `model: "openclaw/default"` 也路由至設定的預設 agent。
- `model: "openclaw/<agentId>"` 路由至特定的 agent。

可選的要求標頭：

- `x-openclaw-model: <provider/model-or-bare-id>` 會覆寫所選 agent 的後端模型。
- `x-openclaw-agent-id: <agentId>` 作為相容性覆寫仍然受到支援。
- `x-openclaw-session-key: <sessionKey>` 完全控制 session 路由。
- `x-openclaw-message-channel: <channel>` 設定用於通道感知提示和原則的合成 ingress 通道上下文。

仍接受相容性別名：

- `model: "openclaw:<agentId>"`
- `model: "agent:<agentId>"`

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

## Session 行為

預設情況下，該端點是 **無狀態的（每次請求）**（每次呼叫都會產生新的 session 金鑰）。

如果請求包含 OpenAI `user` 字串，閘道會從中推導出穩定的會話金鑰，因此重複呼叫可以共用一個代理程式會話。

## 為何此介面重要

這是自託管前端和工具具最高杠杆作用的相容性集合：

- 大多數 Open WebUI、LobeChat 和 LibreChat 設定都預期 `/v1/models`。
- 許多 RAG 系統預期 `/v1/embeddings`。
- 現有的 OpenAI 聊天客戶端通常可以從 `/v1/chat/completions` 開始。
- 更多代理程式原生的客戶端越來越傾向於使用 `/v1/responses`。

## 模型列表和代理程式路由

<AccordionGroup>
  <Accordion title="`/v1/models` 會傳回什麼？">
    OpenClaw 代理程式目標列表。

    傳回的 id 是 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>` 項目。
    直接將它們用作 OpenAI `model` 值。

  </Accordion>
  <Accordion title="`/v1/models` 列出的是代理程式還是子代理程式？">
    它列出的是頂層代理程式目標，而不是後端提供者模型，也不是子代理程式。

    子代理程式仍然是內部執行拓撲。它們不會顯示為虛擬模型。

  </Accordion>
  <Accordion title="為什麼包含 `openclaw/default`？">
    `openclaw/default` 是所設定預設代理程式的穩定別名。

    這意味著即使真實的預設代理程式 id 在環境之間發生變化，客戶端仍可繼續使用一個可預測的 id。

  </Accordion>
  <Accordion title="如何覆寫後端模型？">
    使用 `x-openclaw-model`。

    範例：
    `x-openclaw-model: openai/gpt-5.4`
    `x-openclaw-model: gpt-5.4`

    如果省略它，所選的代理程式將以其正常設定的模型選擇運行。

  </Accordion>
  <Accordion title="嵌入功能如何符合此合約？">
    `/v1/embeddings` 使用相同的代理目標 `model` id。

    使用 `model: "openclaw/default"` 或 `model: "openclaw/<agentId>"`。
    當您需要特定的嵌入模型時，請在 `x-openclaw-model` 中發送它。
    如果沒有該標頭，請求將傳遞給所選代理的常規嵌入設置。

  </Accordion>
</AccordionGroup>

## 串流 (SSE)

設定 `stream: true` 以接收伺服器發送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行為 `data: <json>`
- 串流以 `data: [DONE]` 結束

## Open WebUI 快速設置

對於基本的 Open WebUI 連接：

- Base URL: `http://127.0.0.1:18789/v1`
- macOS 上的 Docker Base URL: `http://host.docker.internal:18789/v1`
- API key: 您的 Gateway bearer token
- Model: `openclaw/default`

預期行為：

- `GET /v1/models` 應該列出 `openclaw/default`
- Open WebUI 應該使用 `openclaw/default` 作為聊天模型 id
- 如果您想要該代理的特定後端提供者/模型，請設定代理的常規預設模型或發送 `x-openclaw-model`

快速測試：

```bash
curl -sS http://127.0.0.1:18789/v1/models \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

如果返回 `openclaw/default`，大多數 Open WebUI 設置都可以使用相同的 Base URL 和 token 進行連接。

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

獲取一個模型：

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

註解：

- `/v1/models` 返回 OpenClaw 代理目標，而不是原始提供者目錄。
- `openclaw/default` 始終存在，因此一個穩定的 id 可以跨環境工作。
- 後端提供者/模型覆蓋屬於 `x-openclaw-model`，而不是 OpenAI `model` 欄位。
- `/v1/embeddings` 支援 `input` 作為字串或字串陣列。
