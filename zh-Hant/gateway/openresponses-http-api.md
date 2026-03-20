---
summary: "從 Gateway 公開相容於 OpenResponses 的 /v1/responses HTTP 端點"
read_when:
  - 整合使用 OpenResponses API 的客戶端
  - 您需要基於項目的輸入、客戶端工具呼叫或 SSE 事件
title: "OpenResponses API"
---

# OpenResponses API (HTTP)

OpenClaw 的 Gateway 可以提供相容於 OpenResponses 的 `POST /v1/responses` 端點。

此端點**預設為停用**。請先在設定中啟用它。

- `POST /v1/responses`
- 與 Gateway 相同的連接埠 (WS + HTTP 多工): `http://<gateway-host>:<port>/v1/responses`

在底層，請求會被作為正常的 Gateway agent 執行來執行 (與 `openclaw agent` 的程式碼路徑相同)，因此路由/權限/設定會與您的 Gateway 相符。

## 驗證、安全性和路由

操作行為符合 [OpenAI Chat Completions](/zh-Hant/gateway/openai-http-api):

- 使用 `Authorization: Bearer <token>` 搭配正常的 Gateway 驗證設定
- 將此端點視為對於 gateway 實例的完整操作員存取權限
- 使用 `model: "openclaw:<agentId>"`、`model: "agent:<agentId>"` 或 `x-openclaw-agent-id` 選擇 agent
- 使用 `x-openclaw-session-key` 進行明確的會話路由

使用 `gateway.http.endpoints.responses.enabled` 啟用或停用此端點。

## 會話行為

預設情況下，此端點**針對每個請求是無狀態的** (每次呼叫都會產生新的會話金鑰)。

如果請求包含 OpenResponses `user` 字串，Gateway 會從中衍生出穩定的會話金鑰，因此重複的呼叫可以共享 agent 會話。

## 請求形狀 (支援)

請求遵循具有基於項目輸入的 OpenResponses API。目前的支援：

- `input`: 字串或項目物件的陣列。
- `instructions`: 合併到系統提示中。
- `tools`: 客戶端工具定義 (函數工具)。
- `tool_choice`: 過濾或要求客戶端工具。
- `stream`: 啟用 SSE 串流。
- `max_output_tokens`: 盡力而為的輸出限制 (取決於提供者)。
- `user`: 穩定的會話路由。

已接受但**目前被忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `previous_response_id`
- `truncation`

## 項目（輸入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 會附加到系統提示詞。
- 最新的 `user` 或 `function_call_output` 項目會成為「目前訊息」。
- 較早的使用者/助理訊息會包含在歷史記錄中作為背景。

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

為了架構相容性而接受，但在建構提示詞時會被忽略。

## 工具（客戶端函式工具）

使用 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果代理程式決定呼叫工具，回應會傳回 `function_call` 輸出項目。
您接著傳送包含 `function_call_output` 的後續要求以繼續該回合。

## 影像 (`input_image`)

支援 base64 或 URL 來源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允許的 MIME 類型（目前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大大小（目前）：10MB。

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

允許的 MIME 類型（目前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

最大大小（目前）：5MB。

目前行為：

- 檔案內容會被解碼並加入到**系統提示詞**中，而非使用者訊息，
因此它會保持暫時性（不會儲存在工作階段歷史記錄中）。
- PDF 會被解析以取得文字。如果發現的文字很少，首頁會被點陣化
為影像並傳遞給模型。

PDF 解析使用對 Node 友善的 `pdfjs-dist` 舊版建置（無 worker）。新版 PDF.js 建置預期使用瀏覽器 workers/DOM 全域變數，因此未在 Gateway 中使用。

URL 擷取預設值：

- `files.allowUrl`: `true`
- `images.allowUrl`: `true`
- `maxUrlParts`: `8` (每個請求總共基於 URL 的 `input_file` + `input_image` 部分)
- 請求受到防護（DNS 解析、私有 IP 封鎖、重新導向上限、逾時）。
- 支援每種輸入類型選用的主機名稱允許清單 (`files.urlAllowlist`、`images.urlAllowlist`)。
  - 精確主機：`"cdn.example.com"`
  - 萬用字元子網域：`"*.assets.example.com"` (不符合頂層網域)
  - 空白或省略的允許清單表示沒有主機名稱允許清單限制。
- 若要完全停用基於 URL 的擷取，請設定 `files.allowUrl: false` 和/或 `images.allowUrl: false`。

## 檔案 + 圖片限制 (設定)

可在 `gateway.http.endpoints.responses` 下調整預設值：

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
            allowedMimes: [
              "text/plain",
              "text/markdown",
              "text/html",
              "text/csv",
              "application/json",
              "application/pdf",
            ],
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
            allowedMimes: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/heic",
              "image/heif",
            ],
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
- `images.maxBytes`: 10MB
- `images.maxRedirects`: 3
- `images.timeoutMs`: 10s
- HEIC/HEIF `input_image` 來源會被接受，並在傳送給供應商之前正規化為 JPEG。

安全性注意事項：

- URL 允許清單會在擷取之前和重新導向跳躍時強制執行。
- 將主機名稱加入允許清單並不會繞過私有/內部 IP 封鎖。
- 對於暴露於網際網路的閘道，除了應用程式層級的防護外，還應套用網路出口控制。
  請參閱 [安全性](/zh-Hant/gateway/security)。

## 串流 (SSE)

設定 `stream: true` 以接收 Server-Sent Events (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行都是 `event: <type>` 和 `data: <json>`
- 資料流以 `data: [DONE]` 結束

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

當底層供應商回報 token 計數時，會填入 `usage`。

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

import en from "/components/footer/en.mdx";

<en />
