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

操作行為符合 [OpenAI Chat Completions](/zh-Hant/gateway/openai-http-api)：

- 使用相符的 Gateway HTTP 驗證路徑：
  - shared-secret 驗證（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
  - trusted-proxy 驗證（`gateway.auth.mode="trusted-proxy"`）：來自已設定非本機信任來源的具身份感知代理標頭
  - private-ingress open 驗證（`gateway.auth.mode="none"`）：無驗證標頭
- 將該端點視為對於 gateway 執行個體的完整操作員存取權限
- 對於 shared-secret 驗證模式（`token` 和 `password`），忽略較狹隘的 bearer 宣告 `x-openclaw-scopes` 值，並還原正常的完整操作員預設值
- 對於攜帶信任身份的 HTTP 模式（例如 trusted proxy 驗證或 `gateway.auth.mode="none"`），當 `x-openclaw-scopes` 存在時予以遵守，否則回退到正常的操作員預設範圍集
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 選擇 agent
- 當您想要覆寫所選 agent 的後端模型時，使用 `x-openclaw-model`
- 使用 `x-openclaw-session-key` 進行明確的會話路由
- 當您需要非預設的合成進入通道上下文時，使用 `x-openclaw-message-channel`

驗證矩陣：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 證明擁有共用的 gateway 操作員密鑰
  - 忽略較狹隘的 `x-openclaw-scopes`
  - 恢復完整的預設操作員範圍集合：
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - 將此端點上的聊天輪次視為擁有者-發送者輪次
- 受信任的身分驗證 HTTP 模式（例如受信任的代理驗證，或私人入口上的 `gateway.auth.mode="none"`）
  - 當標頭存在時遵守 `x-openclaw-scopes`
  - 當標頭不存在時，回退到正常的操作員預設範圍集合
  - 僅當呼叫者明確縮小範圍並省略 `operator.admin` 時，才會失去擁有者語意

使用 `gateway.http.endpoints.responses.enabled` 啟用或停用此端點。

相同的相容性層面也包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

關於代理目標模型、`openclaw/default`、嵌入傳遞和後端模型覆寫如何協同工作的正式說明，請參閱 [OpenAI Chat Completions](/zh-Hant/gateway/openai-http-api#agent-first-model-contract) 和 [Model list and agent routing](/zh-Hant/gateway/openai-http-api#model-list-and-agent-routing)。

## 工作階段行為

預設情況下，此端點是 **每次請求無狀態的**（每次呼叫都會生成一個新的工作階段金鑰）。

如果請求包含 OpenResponses `user` 字串，Gateway 會從中衍生出一個穩定的工作階段金鑰，
以便重複呼叫可以共用一個代理工作階段。

## 請求形狀（已支援）

請求遵循 OpenResponses API，採用基於項目的輸入。目前支援：

- `input`：字串或項目物件陣列。
- `instructions`：合併到系統提示詞中。
- `tools`：客戶端工具定義（函式工具）。
- `tool_choice`：篩選或要求客戶端工具。
- `stream`：啟用 SSE 串流。
- `max_output_tokens`：盡力而為的輸出限制（取決於提供者）。
- `user`：穩定的工作階段路由。

已接受但 **目前忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

支援：

- `previous_response_id`：當請求保持在相同的 agent/user/requested-session 範圍內時，OpenClaw 會重用先前的回應工作階段。

## 項目（輸入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 會附加到系統提示詞。
- 最近的 `user` 或 `function_call_output` 項目會成為「當前訊息」。
- 較早的使用者/助手訊息會作為歷史記錄包含在內以提供背景。

### `function_call_output`（回合式工具）

將工具結果傳回給模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 和 `item_reference`

為了架構相容性而被接受，但在建立提示詞時會被忽略。

## 工具（客戶端函式工具）

透過 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果代理程式決定呼叫工具，回應會傳回一個 `function_call` 輸出項目。
然後您會傳送一個包含 `function_call_output` 的後續請求以繼續該回合。

## 圖片（`input_image`）

支援 base64 或 URL 來源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允許的 MIME 類型（目前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大大小（目前）：10MB。

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

最大大小（目前）：5MB。

目前行為：

- 檔案內容會被解碼並新增到**系統提示詞**中，而不是使用者訊息中，
  因此它是暫時性的（不會持久儲存在工作階段歷史中）。
- 解碼後的檔案文字會在加入前包裝為**不受信的外部內容**，因此檔案位元組會被視為資料，而非受信的指令。
- 注入的區塊會使用明確的邊界標記，例如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，並包含一個
  `Source: External` 中繼資料行。
- 此檔案輸入路徑故意省略了長 `SECURITY NOTICE:` 橫幅以
  保留提示詞預算；邊界標記和中繼資料仍然保持不變。
- PDF 會先解析文字。如果發現的文字很少，前幾頁會
  轉換為圖像並傳遞給模型，且注入的檔案區塊會使用
  預留位置 `[PDF content rendered to images]`。

PDF 解析由附帶的 `document-extract` 外掛程式提供，它使用
Node 相容的 `pdfjs-dist` 舊版建置（無 worker）。現代 PDF.js 建置
需要瀏覽器 worker/DOM 全域變數，因此未在 Gateway 中使用。

URL 取得預設值：

- `files.allowUrl`： `true`
- `images.allowUrl`： `true`
- `maxUrlParts`： `8`（每個請求總共基於 URL 的 `input_file` + `input_image` 部件）
- 請求受到保護（DNS 解析、私人 IP 封鎖、重新導向上限、逾時）。
- 支援每種輸入類型（`files.urlAllowlist`、 `images.urlAllowlist`）的選擇性主機名稱允許清單。
  - 精確主機： `"cdn.example.com"`
  - 萬用字元子網域： `"*.assets.example.com"`（不匹配頂層網域）
  - 空白或省略的允許清單表示沒有主機名稱允許清單限制。
- 若要完全停用基於 URL 的取得，請設定 `files.allowUrl: false` 和/或 `images.allowUrl: false`。

## 檔案 + 圖像限制（設定）

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

- `maxBodyBytes`： 20MB
- `maxUrlParts`： 8
- `files.maxBytes`： 5MB
- `files.maxChars`： 200k
- `files.maxRedirects`： 3
- `files.timeoutMs`： 10s
- `files.pdf.maxPages`： 4
- `files.pdf.maxPixels`: 4,000,000
- `files.pdf.minTextChars`: 200
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10s
- 接受 HEIC/HEIF `input_image` 來源，並在提供者交付前將其正規化為 JPEG。

安全備註：

- URL 允許清單會在擷取之前以及重新導向跳躴時執行。
- 將主機名稱加入允許清單並不會繞過私人/內部 IP 封鎖。
- 對於暴露至網際網路的閘道，除了應用程式層級的防護外，還應套用網路出口控制。
  請參閱 [安全性](/zh-Hant/gateway/security)。

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
- `response.failed` (發生錯誤時)

## 使用量

當基礎提供者回報 Token 計數時，會填入 `usage`。
在這些計數器到達下游狀態/會話表面之前，OpenClaw 會先正規化常見的 OpenAI 風格別名，包括 `input_tokens` / `output_tokens`
以及 `prompt_tokens` / `completion_tokens`。

## 錯誤

錯誤使用類似以下的 JSON 物件：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常見情況：

- `401` 遺漏/無效的驗證
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
