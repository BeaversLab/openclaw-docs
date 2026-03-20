---
summary: "計劃：新增 OpenResponses /v1/responses 端點並乾淨地棄用 chat completions"
read_when:
  - 正在設計或實作 `/v1/responses` gateway 支援
  - 規劃從 Chat Completions 相容性遷移
owner: "openclaw"
status: "draft"
last_updated: "2026-01-19"
title: "OpenResponses Gateway Plan"
---

# OpenResponses Gateway 整合計劃

## 背景

OpenClaw Gateway 目前在 `/v1/chat/completions` 公開了最小化的 OpenAI 相容 Chat Completions 端點
（請參閱 [OpenAI Chat Completions](/zh-Hant/gateway/openai-http-api)）。

Open Responses 是一個基於 OpenAI Responses API 的開放推理標準。它是為
agentic workflows 設計的，並使用基於項目的輸入加上語意串流事件。OpenResponses
規範定義了 `/v1/responses`，而非 `/v1/chat/completions`。

## 目標

- 新增一個遵循 OpenResponses 語意的 `/v1/responses` 端點。
- 將 Chat Completions 保留為易於停用並最終移除的相容層。
- 使用獨立、可重複使用的 schema 標準化驗證和解析。

## 非目標

- 在第一階段實現完整的 OpenResponses 功能對等（圖片、檔案、託管工具）。
- 取代內部的 agent 執行邏輯或工具編排。
- 在第一階段期間改變現有的 `/v1/chat/completions` 行為。

## 研究摘要

來源：OpenResponses OpenAPI、OpenResponses 規範網站以及 Hugging Face 部落格文章。

重點摘要：

- `POST /v1/responses` 接受 `CreateResponseBody` 欄位，例如 `model`、`input`（字串或
  `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens` 以及
  `max_tool_calls`。
- `ItemParam` 是一個可識別聯集（discriminated union），包含：
  - 具有角色 `system`、`developer`、`user`、`assistant` 的 `message` 項目
  - `function_call` 和 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功的回應會傳回包含 `object: "response"`、`status` 和
  `output` 項目的 `ResponseResource`。
- 串流使用語義事件，例如：
  - `response.created`、`response.in_progress`、`response.completed`、`response.failed`
  - `response.output_item.added`、`response.output_item.done`
  - `response.content_part.added`、`response.content_part.done`
  - `response.output_text.delta`、`response.output_text.done`
- 規格要求：
  - `Content-Type: text/event-stream`
  - `event:` 必須符合 JSON `type` 欄位
  - 終端事件必須是字面值 `[DONE]`
- 推理項目可能會公開 `content`、`encrypted_content` 和 `summary`。
- HF 範例在請求中包含 `OpenResponses-Version: latest`（選用標頭）。

## 提議的架構

- 新增僅包含 Zod schemas 的 `src/gateway/open-responses.schema.ts`（不匯入 gateway）。
- 為 `/v1/responses` 新增 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）。
- 將 `src/gateway/openai-http.ts` 保持為舊版相容性配接器的完整狀態。
- 新增設定 `gateway.http.endpoints.responses.enabled`（預設值為 `false`）。
- 讓 `gateway.http.endpoints.chatCompletions.enabled` 保持獨立；允許兩個端點分別
  切換。
- 啟用 Chat Completions 時發出啟動警告，以標示其舊版狀態。

## Chat Completions 的淘汰路徑

- 維持嚴格的模組邊界：responses 與 chat completions 之間不共用 schema 類型。
- 讓 Chat Completions 在設定中為選用（opt-in），以便無需更改程式碼即可停用。
- 在 `/v1/responses` 穩定後，更新文件將 Chat Completions 標記為舊版。
- 未來的選用步驟：將 Chat Completions 請求對應到 Responses 處理程式，以便更簡單地移除功能。

## 第 1 階段支援的子集

- 接受 `input` 作為字串，或是包含訊息角色和 `function_call_output` 的 `ItemParam[]`。
- 將系統和開發者訊息提取到 `extraSystemPrompt` 中。
- 對於代理程式執行，使用最近的 `user` 或 `function_call_output` 作為當前訊息。
- 使用 `invalid_request_error` 拒絕不支援的內容部分（圖片/檔案）。
- 傳回包含 `output_text` 內容的單一助理訊息。
- 傳回值為零的 `usage`，直到連接 token 計算。

## 驗證策略（無 SDK）

- 為支援的子集實作 Zod schemas：
  - `CreateResponseBody`
  - `ItemParam` + 訊息內容部分聯集
  - `ResponseResource`
  - Gateway 使用的串流事件形狀
- 將 schemas 保存在單一的獨立模組中，以避免偏移並允許未來的 codegen。

## 串流實作（第 1 階段）

- 包含 `event:` 和 `data:` 的 SSE 行。
- 必要序列（最小可行性）：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta`（視需要重複）
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 測試與驗證計劃

- 為 `/v1/responses` 新增 e2e 覆蓋範圍：
  - 需要驗證
  - 非串流回應形狀
  - 串流事件順序和 `[DONE]`
  - 使用標頭和 `user` 進行會話路由
- 保持 `src/gateway/openai-http.test.ts` 不變。
- 手動：使用 `stream: true` curl 到 `/v1/responses` 並驗證事件順序和終端
  `[DONE]`。

## 文件更新（後續）

- 為 `/v1/responses` 的使用和範例新增一個新的文件頁面。
- 使用舊版註記和指向 `/v1/responses` 的指標更新 `/gateway/openai-http-api`。

import en from "/components/footer/en.mdx";

<en />
