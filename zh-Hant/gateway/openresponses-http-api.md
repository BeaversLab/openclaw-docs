---
summary: "從 Gateway 公開相容於 OpenResponses 的 /v1/responses HTTP 端點"
read_when:
  - Integrating clients that speak the OpenResponses API
  - You want item-based inputs, client tool calls, or SSE events
title: "OpenResponses API"
---

# OpenResponses API (HTTP)

OpenClaw 的 Gateway 可以提供一個相容於 OpenResponses 的 `POST /v1/responses` 端點。

此端點**預設為停用**。請先在設定中啟用它。

- `POST /v1/responses`
- 與 Gateway 相同的連接埠（WS + HTTP 多工）：`http://<gateway-host>:<port>/v1/responses`

在底層，請求會以正常的 Gateway agent 執行方式執行（與
`openclaw agent` 程式碼路徑相同），因此路由/權限/設定會與您的 Gateway 相符。

## 驗證、安全性與路由

操作行為與 [OpenAI Chat Completions](/zh-Hant/gateway/openai-http-api) 相符：

- 將 `Authorization: Bearer <token>` 與正常的 Gateway 驗證設定搭配使用
- 將此端點視為對於 gateway 實例的完整操作員存取權
- 使用 `model: "openclaw:<agentId>"`、`model: "agent:<agentId>"` 或 `x-openclaw-agent-id` 來選擇 agent
- 使用 `x-openclaw-session-key` 進行明確的會話路由

使用 `gateway.http.endpoints.responses.enabled` 來啟用或停用此端點。

## 會話行為

預設情況下，此端點是**每個請求無狀態的**（每次呼叫都會產生新的會話金鑰）。

如果請求包含 OpenResponses `user` 字串，Gateway 會從中推導出穩定的會話金鑰，
因此重複的呼叫可以共用一個 agent 會話。

## 請求形狀（已支援）

請求遵循使用基於項目輸入的 OpenResponses API。目前支援：

- `input`：字串或項目物件陣列。
- `instructions`：合併至系統提示中。
- `tools`：用戶端工具定義（函式工具）。
- `tool_choice`：過濾或要求用戶端工具。
- `stream`：啟用 SSE 串流。
- `max_output_tokens`：盡力而為的輸出限制（取決於提供者）。
- `user`：穩定的會話路由。

已接受但**目前忽略**：

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
- 最近的 `user` 或 `function_call_output` 項目會成為「當前訊息」。
- 較早的使用者/助理訊息會作為歷史記錄包含在內，以提供上下文。

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

為了架構相容性而接受，但在建構提示詞時會被忽略。

## 工具（客戶端函數工具）

使用 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果代理程式決定呼叫工具，回應會傳回 `function_call` 輸出項目。
然後您會使用 `function_call_output` 傳送後續請求以繼續該回合。

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

- 檔案內容會被解碼並新增到 **系統提示詞** 中，而非使用者訊息，
  因此它保持暫時性（不會保存在會話歷史中）。
- PDF 會被解析為文字。如果找到的文字很少，前幾頁會被點陣化
  為圖片並傳遞給模型。

PDF 剖析使用相容於 Node 的 `pdfjs-dist` 舊版版本 (無 worker)。現代 PDF.js 版本預期瀏覽器 worker/DOM 全域變數，因此未用於 Gateway 中。

URL 擷取預設值：

- `files.allowUrl`：`true`
- `images.allowUrl`：`true`
- `maxUrlParts`：`8` (每個請求總計 URL 式 `input_file` + `input_image` 部件)
- 請求受到防護 (DNS 解析、私有 IP 封鎖、重新導向上限、逾時)。
- 支援依輸入類型指定的選用主機名稱允許清單 (`files.urlAllowlist`、`images.urlAllowlist`)。
  - 確切主機：`"cdn.example.com"`
  - 萬用字元子網域：`"*.assets.example.com"` (不符配頂層網域)

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
- 接受 HEIC/HEIF `input_image` 來源，並在提供者傳遞前將其正規化為 JPEG。

安全性備註：

- 會在擷取前和重新導向跳躍時執行 URL 允許清單。
- 將主機名稱加入允許清單並不會繞過私有/內部 IP 封鎖。
- 對於暴露於網際網路的 Gateway，請除了應用程式層級的防護之外，也套用網路出口控制。
  請參閱 [安全性](/zh-Hant/gateway/security)。

## 串流 (SSE)

設定 `stream: true` 以接收伺服器推送事件 (SSE)：

- `Content-Type: text/event-stream`
- 每個事件行為 `event: <type>` 和 `data: <json>`
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

## 用量

當底層提供者回報 token 數量時，會填入 `usage`。

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

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
