---
summary: "從 Gateway 公開相容 OpenResponses 的 /v1/responses HTTP 端點"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "OpenResponses API"
---

# OpenResponses API (HTTP)

OpenClaw 的 Gateway 可以提供與 OpenResponses 相容的 `POST /v1/responses` 端點。

此端點**預設為停用**。請先在設定中啟用它。

- `POST /v1/responses`
- 與 Gateway (WS + HTTP 多工) 相同的連接埠：`http://<gateway-host>:<port>/v1/responses`

在底層，請求是作為正常的 Gateway 執行個體執行 (與 `openclaw agent` 相同的路徑)，因此路由/權限/組態符合您的 Gateway。

## 驗證、安全性和路由

操作行為符合 [OpenAI Chat Completions](/en/gateway/openai-http-api)：

- 使用相符的 Gateway HTTP 驗證路徑：
  - shared-secret 驗證 (`gateway.auth.mode="token"` 或 `"password"`)：`Authorization: Bearer <token-or-password>`
  - trusted-proxy 驗證 (`gateway.auth.mode="trusted-proxy"`)：來自已設定非回送信任來源的身分感知代理標頭
  - private-ingress open 驗證 (`gateway.auth.mode="none"`)：無驗證標頭
- 將該端點視為對於閘道執行個體的完整操作員存取
- 對於 shared-secret 驗證模式 (`token` 和 `password`)，忽略較狹窄的 bearer 宣告 `x-openclaw-scopes` 值並恢復正常的完整操作員預設值
- 對於受信任身分承載 HTTP 模式 (例如 trusted proxy 驗證或 `gateway.auth.mode="none"`)，當存在時遵循 `x-openclaw-scopes`，否則回退到正常的操作員預設範圍設定
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 選擇代理程式
- 當您想要覆寫所選代理程式的後端模型時，使用 `x-openclaw-model`
- 使用 `x-openclaw-session-key` 進行明確的工作階段路由
- 當您想要非預設的合成輸入通道上下文時，使用 `x-openclaw-message-channel`

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共用閘道操作員金鑰
  - 忽略較狹窄的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 將此端點上的聊天輪次視為擁有者-發送者輪次
- 可承載身分的受信任 HTTP 模式（例如受信任的代理驗證，或私人入口上的 `gateway.auth.mode="none"`）
  - 當標頭存在時，遵守 `x-openclaw-scopes`
  - 當標頭不存在時，回退至正常的操作員預設範圍集
  - 僅當呼叫者明確縮小範圍並省略 `operator.admin` 時，才會失去擁有者語意

使用 `gateway.http.endpoints.responses.enabled` 啟用或停用此端點。

相同的相容性介面還包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

關於代理目標模型、`openclaw/default`、嵌入透傳和後端模型覆寫如何協同運作的標準解釋，請參閱 [OpenAI Chat Completions](/en/gateway/openai-http-api#agent-first-model-contract) 和 [Model list and agent routing](/en/gateway/openai-http-api#model-list-and-agent-routing)。

## Session 行為

根據預設，該端點是 **每次請求無狀態的**（每次呼叫都會產生新的 session 金鑰）。

如果請求包含 OpenResponses `user` 字串，Gateway 會從中衍生出一個穩定的 session 金鑰，
因此重複的呼叫可以共用一個代理 session。

## 請求形狀（已支援）

請求遵循具有基於項目輸入的 OpenResponses API。目前支援：

- `input`：字串或項目物件的陣列。
- `instructions`：合併到系統提示中。
- `tools`：用戶端工具定義（函式工具）。
- `tool_choice`：篩選或要求用戶端工具。
- `stream`：啟用 SSE 串流。
- `max_output_tokens`：盡力而為的輸出限制（取決於供應商）。
- `user`：穩定的 session 路由。

已接受但目前 **被忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

支援：

- `previous_response_id`：當請求保持在相同的代理/使用者/請求會話範圍內時，OpenClaw 會重複使用先前的回應會話。

## 項目（輸入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 會附加到系統提示詞。
- 最近的 `user` 或 `function_call_output` 項目會成為「目前訊息」。
- 較早的使用者/助理訊息會包含作為歷史記錄以提供背景。

### `function_call_output`（基於回合的工具）

將工具結果傳回給模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 和 `item_reference`

為了架構相容性而接受，但在建立提示詞時會被忽略。

## 工具（用戶端函數工具）

使用 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果代理決定呼叫工具，回應會傳回 `function_call` 輸出項目。
然後您會傳送包含 `function_call_output` 的後續請求以繼續該回合。

## 圖片（`input_image`）

支援 base64 或 URL 來源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允許的 MIME 類型（目前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
大小上限（目前）：10MB。

## 檔案（`input_file`）

支援 base64 或 URL 來源：

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "hello.txt"
  }
}
```

允許的 MIME 類型（目前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

大小上限（目前）：5MB。

目前行為：

- 檔案內容會被解碼並加入 **系統提示詞**，而非使用者訊息，
  因此它保持暫時性（不會保存在會話歷史記錄中）。
- 解碼後的檔案文字在加入前會被封裝為 **不受信任的外部內容**，因此檔案位元組會被視為資料，而非受信任的指令。
- 注入的區塊使用明確的邊界標記，例如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，並包含
  `Source: External` 中繼資料行。
- 此檔案輸入路徑刻意省略了冗長的 `SECURITY NOTICE:` 橫幅以
  保留提示詞預算；邊界標記和中繼資料仍然會保留。
- PDF 會先進行文字解析。如果發現的文字很少，首頁將會
  被點陣化為圖像並傳遞給模型，且注入的檔案區塊會使用
  預留位置 `[PDF content rendered to images]`。

PDF 解析使用適用於 Node 的 `pdfjs-dist` 舊版建置（無 worker）。現代
PDF.js 建置預期瀏覽器 worker/DOM 全域變數，因此未在 Gateway 中使用。

URL 擷取預設值：

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8` (每個請求的 URL 式 `input_file` + `input_image` 部分總計)
- 請求受到防護（DNS 解析、私有 IP 封鎖、重新導向上限、逾時）。
- 支援依輸入類型（`files.urlAllowlist`、`images.urlAllowlist`）設定選用主機名稱允許清單。
  - 精確主機：`"cdn.example.com"`
  - 萬用字元子網域：`"*.assets.example.com"` (不匹配 apex)
  - 空白或省略的允許清單表示沒有主機名稱允許清單限制。
- 若要完全停用基礎 URL 的擷取，請設定 `files.allowUrl: false` 和/或 `images.allowUrl: false`。

## 檔案 + 圖像限制 (config)

預設值可以在 `gateway.http.endpoints.responses` 下調整：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          maxUrlParts: 8,
          files: {
            allowUrl: true,
            urlAllowlist: ["cdn.example.com", "*.assets.example.com"],
            allowedMimes: ["text/plain", "text/markdown", "text/html", "text/csv", "application/json", "application/pdf"],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200,
            },
          },
          images: {
            allowUrl: true,
            urlAllowlist: ["images.example.com"],
            allowedMimes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000,
          },
        },
      },
    },
  },
}
```

省略時的預設值：

- `maxBodyBytes`: 20MB
- `maxUrlParts`: 8
- `files.maxBytes`: 5MB
- `files.maxChars`: 200k
- `files.maxRedirects`: 3
- `files.timeoutMs`: 10s
- `files.pdf.maxPages`: 4
- `files.pdf.maxPixels`: 4,000,000
- `files.pdf.minTextChars`: 200
- `images.maxBytes`：10MB
- `images.maxRedirects`：3
- `images.timeoutMs`：10s
- 接受 HEIC/HEIF `input_image` 來源，並在交付給提供者之前將其正規化為 JPEG。

安全提示：

- URL 允許清單會在擷取之前和重新導向跳轉時強制執行。
- 將主機名稱加入允許清單並不會繞過私人/內部 IP 封鎖。
- 對於暴露於網際網路的閘道，除了應用程式層級的防護之外，還應套用網路出口控制。
  請參閱 [安全性](/en/gateway/security)。

## 串流 (SSE)

設定 `stream: true` 以接收伺服器發送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行都是 `event: <type>` 和 `data: <json>`
- 串流以 `data: [DONE]` 結束

目前發出的事件類型：

- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed` (發生錯誤時)

## 使用量

當底層提供者回報 token 計數時，會填入 `usage`。
OpenClaw 會在這些計數器到達下游狀態/工作階段表面之前，將常見的 OpenAI 風格別名正規化，包括 `input_tokens` / `output_tokens`
和 `prompt_tokens` / `completion_tokens`。

## 錯誤

錯誤使用如下的 JSON 物件：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常見情況：

- `401` 缺少/無效的驗證
- `400` 無效的要求主體
- `405` 錯誤的方法

## 範例

非串流：

```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "input": "hi"
  }'
```

串流：

```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "input": "hi"
  }'
```
