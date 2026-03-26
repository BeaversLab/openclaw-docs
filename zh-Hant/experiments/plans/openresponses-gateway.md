---
summary: "計畫：新增 OpenResponses /v1/responses 端點並乾淨地棄用 chat completions"
read_when:
  - Designing or implementing `/v1/responses` gateway support
  - Planning migration from Chat Completions compatibility
owner: "openclaw"
status: "草稿"
last_updated: "2026-01-19"
title: "OpenResponses Gateway 計畫"
---

# OpenResponses Gateway 整合計劃

## 背景

OpenClaw Gateway 目前在
`/v1/chat/completions` 公開了一個最小化的 OpenAI 相容 Chat Completions 端點（請參閱 [OpenAI Chat Completions](/zh-Hant/gateway/openai-http-api)）。

Open Responses 是一種基於 OpenAI Responses API 的開放推理標準。它是為
代理工作流程而設計的，並使用基於項目的輸入和語義串流事件。OpenResponses
規範定義的是 `/v1/responses`，而不是 `/v1/chat/completions`。

## 目標

- 新增一個遵循 OpenResponses 語義的 `/v1/responses` 端點。
- 將 Chat Completions 保留為一個易於停用並最終移除的相容層。
- 使用獨立、可重複使用的架構標準化驗證和解析。

## 非目標

- 在第一版中實現完整的 OpenResponses 功能同等性（圖片、檔案、託管工具）。
- 取代內部代理執行邏輯或工具協調。
- 在第一階段改變現有的 `/v1/chat/completions` 行為。

## 研究摘要

來源：OpenResponses OpenAPI、OpenResponses 規範網站以及 Hugging Face 部落格文章。

關鍵要點：

- `POST /v1/responses` 接受 `CreateResponseBody` 欄位，例如 `model`、`input`（字串或
  `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens` 和
  `max_tool_calls`。
- `ItemParam` 是一個可辨別聯集（discriminated union），包含：
  - 角色為 `system`、`developer`、`user`、`assistant` 的 `message` 項目
  - `function_call` 和 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功的回應會返回一個 `ResponseResource`，其中包含 `object: "response"`、`status` 和 `output` 項目。
- 串流使用語義事件，例如：
  - `response.created`、`response.in_progress`、`response.completed`、`response.failed`
  - `response.output_item.added`、`response.output_item.done`
  - `response.content_part.added`、`response.content_part.done`
  - `response.output_text.delta`、`response.output_text.done`
- 規格要求：
  - `Content-Type: text/event-stream`
  - `event:` 必須符合 JSON `type` 欄位
  - 終端事件必須是字面量 `[DONE]`
- Reasoning items 可能會公開 `content`、`encrypted_content` 和 `summary`。
- HF 範例包含請求中的 `OpenResponses-Version: latest`（選用標頭）。

## 建議的架構

- 新增僅包含 Zod 綱要的 `src/gateway/open-responses.schema.ts`（不匯入 gateway）。
- 為 `/v1/responses` 新增 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）。
- 保持 `src/gateway/openai-http.ts` 完整，作為舊版相容性轉接器。
- 新增設定 `gateway.http.endpoints.responses.enabled`（預設 `false`）。
- 保持 `gateway.http.endpoints.chatCompletions.enabled` 獨立；允許兩個端點分別切換。
- 啟用 Chat Completions 時發出啟動警告，以標示其舊版狀態。

## Chat Completions 的棄用路徑

- 維持嚴格的模組邊界：responses 與 chat completions 之間不得共用 schema types。
- 將 Chat Completions 設定為透過 config 選擇性啟用，以便無需修改程式碼即可停用。
- 一旦 `/v1/responses` 變為穩定版，請更新文件將 Chat Completions 標記為舊版（legacy）。
- 可選的未來步驟：將 Chat Completions 請求對應至 Responses 處理程式，以簡化移除路徑。

## 第 1 階段支援子集

- 接受 `input` 作為字串或帶有訊息角色與 `function_call_output` 的 `ItemParam[]`。
- 將系統與開發者訊息提取至 `extraSystemPrompt` 中。
- 使用最新的 `user` 或 `function_call_output` 作為 agent 執行的當前訊息。
- 使用 `invalid_request_error` 拒絕不支援的內容部分（圖片/檔案）。
- 返回包含 `output_text` 內容的單一助手訊息。
- 返回 `usage`，其值為零，直到接通 Token 計算。

## 驗證策略（無 SDK）

- 為以下支援的子集實施 Zod 架構：
  - `CreateResponseBody`
  - `ItemParam` + 訊息內容部分聯集
  - `ResponseResource`
  - 閘道使用的串流事件形狀
- 將架構保留在單一的獨立模組中，以避免變動並允許未來的程式碼生成。

## 串流實作（階段 1）

- 同時包含 `event:` 和 `data:` 的 SSE 行。
- 必要序列（最小可行）：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta`（視需要重複）
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 測試與驗證計畫

- 為 `/v1/responses` 新增端對端覆蓋率：
  - 需要驗證
  - 非串流回應形狀
  - 串流事件順序和 `[DONE]`
  - 使用標頭和 `user` 的工作階段路由
- 保持 `src/gateway/openai-http.test.ts` 不變。
- 手動：使用 `stream: true` curl 至 `/v1/responses` 並驗證事件順序和最終
  `[DONE]`。

## 文件更新（後續）

- 為 `/v1/responses` 的用法和範例新增一個新的文件頁面。
- 更新 `/gateway/openai-http-api`，加入舊版說明並指向 `/v1/responses`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
