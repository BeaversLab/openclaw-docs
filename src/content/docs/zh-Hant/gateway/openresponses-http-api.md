---
summary: "從 Gateway 公開相容 OpenResponses 的 /v1/responses HTTP 端點"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "OpenResponses API"
---

OpenClaw 的 Gateway 可以提供一個與 OpenResponses 相容的 `POST /v1/responses` 端點。

此端點**預設為停用**。請先在設定中啟用它。

- `POST /v1/responses`
- 與 Gateway 相同的連接埠（WS + HTTP 多工）：`http://<gateway-host>:<port>/v1/responses`

在底層，請求會作為正常的 Gateway agent 執行（與 `openclaw agent` 的程式碼路徑相同），因此路由/權限/設定會符合您的 Gateway。

## 驗證、安全性和路由

運作行為符合 [OpenAI 聊天補全](/zh-Hant/gateway/openai-http-api)：

- 使用相符的 Gateway HTTP 驗證路徑：
  - shared-secret 驗證（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
  - trusted-proxy auth (`gateway.auth.mode="trusted-proxy"`)：來自已設定信任代理來源的身分感知代理標頭；同主機 loopback 代理需要明確的 `gateway.auth.trustedProxy.allowLoopback = true`
  - trusted-proxy local direct fallback：沒有 `Forwarded`、`X-Forwarded-*` 或 `X-Real-IP` 標頭的同主機呼叫者可以使用 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`
  - private-ingress open auth (`gateway.auth.mode="none"`)：無 auth 標頭
- 將該端點視為對於閘道執行個體的完整操作員存取
- 對於共用金鑰驗證模式 (`token` 和 `password`)，請忽略較狹窄的 bearer 宣告 `x-openclaw-scopes` 值，並恢復正常的完整操作員預設值
- 對於攜帶受信任身分的 HTTP 模式（例如受信任代理驗證或 `gateway.auth.mode="none"`），請在存在時遵守 `x-openclaw-scopes`，否則回退至正常的操作員預設範圍集
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 選擇代理程式
- 當您想要覆寫所選代理程式的後端模型時，請使用 `x-openclaw-model`
- 使用 `x-openclaw-session-key` 進行明確的會話路由
- 當您想要非預設的合成入口通道上下文時，請使用 `x-openclaw-message-channel`

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共用閘道操作員金鑰
  - 忽略較狹窄的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 將此端點上的聊天輪次視為擁有者-發送者輪次
- 攜帶受信任身分的 HTTP 模式（例如受信任代理驗證，或私人入口上的 `gateway.auth.mode="none"`）
  - 當標頭存在時遵守 `x-openclaw-scopes`
  - 當標頭不存在時，回退至正常的操作員預設範圍集
  - 僅當呼叫者明確縮小範圍並省略 `operator.admin` 時，才會失去擁有者語意

使用 `gateway.http.endpoints.responses.enabled` 啟用或停用此端點。

相同的相容性介面還包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

關於代理目標模型、`openclaw/default`、嵌入層直通 以及後端模型覆寫如何結合的標準解釋，請參閱 [OpenAI 聊天補全](/zh-Hant/gateway/openai-http-api#agent-first-model-contract) 和 [模型列表與代理路由](/zh-Hant/gateway/openai-http-api#model-list-and-agent-routing)。

## Session 行為

根據預設，該端點是 **每次請求無狀態的**（每次呼叫都會產生新的 session 金鑰）。

如果請求包含 OpenResponses `user` 字串，閘道會從中衍生出穩定的會話金鑰，以便重複呼叫可以共用代理會話。

## 請求形狀（已支援）

請求遵循具有基於項目輸入的 OpenResponses API。目前支援：

- `input`：字串或項目物件陣列。
- `instructions`：合併至系統提示中。
- `tools`：用戶端工具定義（函式工具）。
- `tool_choice`：`"auto"`、`"none"`、`"required"` 或 `{ "type": "function", "name": "..." }` 用於篩選或要求用戶端工具。
- `stream`：啟用 SSE 串流。
- `max_output_tokens`：盡力而為的輸出限制（取決於供應商）。
- `temperature`：盡力而為的取樣溫度，會轉發給提供者。對於基於 ChatGPT 的 Codex Responses 後端會忽略此參數，該後端使用固定的服務器端取樣。
- `top_p`：盡力而為的核取樣，會轉發給提供者。與 `temperature` 相同，對 Codex Responses 也有相同的注意事項。
- `user`：穩定的會話路由。

接受但 **目前忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

支援：

- `previous_response_id`：當請求保持在同一個代理/使用者/請求的會話範圍內時，OpenClaw 會重用先前的回應會話。

## 項目（輸入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 會附加到系統提示詞。
- 最近的 `user` 或 `function_call_output` 項目會變成「目前訊息」。
- 先前的使用者/助理訊息會作為上下文歷史記錄包含在內。

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

為了架構相容性而接受，但在建立提示時會被忽略。

## 工具 (用戶端函式工具)

透過 `tools: [{ type: "function", name, description?, parameters? }]` 提供工具。

如果代理決定呼叫工具，回應會傳回一個 `function_call` 輸出項目。
然後，您傳送一個包含 `function_call_output` 的後續請求以繼續此回合。

對於 `tool_choice: "required"` 和函數釘選的 `tool_choice`，端點會縮小公開的用戶端函數工具集，指示執行階段在回應前呼叫用戶端工具，並且如果回合未包含相符的結構化用戶端工具呼叫則予以拒絕。此合約適用於呼叫者提供的 HTTP `tools` 列表，而非每個內部 OpenClaw 代理工具。非串流請求會傳回帶有 `api_error` 的 `502`；串流請求則會發出 `response.failed` 事件。這符合 `/v1/chat/completions` 合約。

## 圖片 (`input_image`)

支援 base64 或 URL 來源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允許的 MIME 類型 (目前)：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大大小 (目前)：10MB。

## 檔案 (`input_file`)

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

允許的 MIME 類型 (目前)：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

最大大小 (目前)：5MB。

目前行為：

- 檔案內容會被解碼並加入 **系統提示詞** 中，而非使用者訊息，
  因此它保持暫時性 (不會保存在會話歷史中)。
- 解碼後的檔案文字在加入前會被包裝為 **不受信任的外部內容**，
  因此檔案位元組被視為資料，而非受信任的指令。
- 注入的區塊使用明確的邊界標記，例如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，並包含一個
  `Source: External` 中繼資料行。
- 此檔案輸入路徑故意省略長 `SECURITY NOTICE:` 橫幅以
  保留提示詞預算；邊界標記和中繼資料仍然保留。
- PDF 會先剖析文字。如果找到的文字很少，前幾頁會
  轉換成圖像並傳遞給模型，且插入的檔案區塊會使用
  預留位置 `[PDF content rendered to images]`。

PDF 解析由內建的 `document-extract` 外掛程式提供，該外掛程式使用
`clawpdf` 及其封裝的 PDFium WebAssembly 執行時進行文字提取和
頁面渲染。

URL 擷取預設值：

- `files.allowUrl`：`true`
- `images.allowUrl`：`true`
- `maxUrlParts`：`8`（每個請求總共基於 URL 的 `input_file` + `input_image` 部分數量）
- 請求受保護（DNS 解析、私有 IP 封鎖、重新導向上限、逾時）。
- 支援依輸入類型設定可選的主機名稱允許清單（`files.urlAllowlist`、`images.urlAllowlist`）。
  - 完全相符的主機：`"cdn.example.com"`
  - 萬用字元子網域：`"*.assets.example.com"`（不符合 apex 網域）
  - 空白或省略的允許清單代表沒有主機名允許清單限制。
- 若要完全停用基於 URL 的擷取，請設定 `files.allowUrl: false` 和/或 `images.allowUrl: false`。

## 檔案 + 圖片限制 (config)

可以在 `gateway.http.endpoints.responses` 下調整預設值：

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

- `maxBodyBytes`：20MB
- `maxUrlParts`：8
- `files.maxBytes`：5MB
- `files.maxChars`：200k
- `files.maxRedirects`：3
- `files.timeoutMs`：10s
- `files.pdf.maxPages`：4
- `files.pdf.maxPixels`：4,000,000
- `files.pdf.minTextChars`：200
- `images.maxBytes`：10MB
- `images.maxRedirects`：3
- `images.timeoutMs`：10s
- 當系統轉換器可用時，會接受 HEIC/HEIF `input_image` 來源，並在交付給供應商之前將其正規化為 JPEG。支援的轉換器包括 macOS `sips`、ImageMagick、GraphicsMagick 或 ffmpeg。

安全性注意：

- URL 允許清單會在擷取之前以及重新導向跳躍時強制執行。
- 允許清單中的主機名稱並不會繞過私有/內部 IP 封鎖。
- 對於暴露於網際網路的閘道，除了應用程式層級的防護外，還應套用網路出口控制。
  請參閱[安全性](/zh-Hant/gateway/security)。

## 串流 (SSE)

設定 `stream: true` 以接收伺服器傳送事件 (SSE)：

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
- `response.failed` (錯誤時)

## 使用量

當底層供應商回報 token 計數時，會填入 `usage`。
OpenClaw 會在這些計數器到達下游狀態/會話表面之前，正規化常見的 OpenAI 風格別名，包括 `input_tokens` / `output_tokens`
和 `prompt_tokens` / `completion_tokens`。

## 錯誤

錯誤使用類似以下的 JSON 物件：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常見情況：

- `401` 缺少/無效的驗證
- `400` 無效的請求主體
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

## 相關

- [OpenAI 聊天完成](/zh-Hant/gateway/openai-http-api)
- [OpenAI](/zh-Hant/providers/openai)
