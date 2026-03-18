---
summary: "計劃：新增 OpenResponses /v1/responses 端點並整潔地棄用聊天完成"
read_when:
  - Designing or implementing `/v1/responses` gateway support
  - Planning migration from Chat Completions compatibility
owner: "openclaw"
status: "草稿"
last_updated: "2026-01-19"
title: "OpenResponses Gateway 計劃"
---

# OpenResponses Gateway 整合計劃

## 背景

OpenClaw Gateway 目前在 `/v1/chat/completions` 公開一個最精簡的相容 OpenAI 的聊天完成端點（請參閱 [OpenAI Chat Completions](/zh-Hant/gateway/openai-http-api)）。

Open Responses 是一個基於 OpenAI Responses API 的開放推論標準。它是為代理工作流程而設計的，並使用基於項目的輸入以及語意串流事件。OpenResponses 規範定義的是 `/v1/responses`，而非 `/v1/chat/completions`。

## 目標

- 新增一個遵循 OpenResponses 語意的 `/v1/responses` 端點。
- 將聊天完成保留為一個相容層，使其易於停用並最終移除。
- 使用獨立、可重複使用的架構來標準化驗證和解析。

## 非目標

- 在第一階段實現完整的 OpenResponses 功能對等性（圖片、檔案、託管工具）。
- 取代內部代理執行邏輯或工具協調。
- 在第一個階段變更現有的 `/v1/chat/completions` 行為。

## 研究摘要

來源：OpenResponses OpenAPI、OpenResponses 規格網站以及 Hugging Face 部落格文章。

重點摘錄：

- `POST /v1/responses` 接受 `CreateResponseBody` 欄位，例如 `model`、`input`（字串或 `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens` 和 `max_tool_calls`。
- `ItemParam` 是以下項目的辨別聯集：
  - `message` 項目具有角色 `system`、`developer`、`user`、`assistant`
  - `function_call` 和 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功的回應會傳回一個 `ResponseResource`，其中包含 `object: "response"`、`status` 和
  `output` 項目。
- 串流使用語義事件，例如：
  - `response.created`、`response.in_progress`、`response.completed`、`response.failed`
  - `response.output_item.added`、`response.output_item.done`
  - `response.content_part.added`、`response.content_part.done`
  - `response.output_text.delta`、`response.output_text.done`
- 規格要求：
  - `Content-Type: text/event-stream`
  - `event:` 必須符合 JSON `type` 欄位
  - 終端事件必須是字面量 `[DONE]`
- 推理項目可能會公開 `content`、`encrypted_content` 和 `summary`。
- HF 範例在請求中包含 `OpenResponses-Version: latest`（選用標頭）。

## 提議的架構

- 新增僅包含 Zod schemas 的 `src/gateway/open-responses.schema.ts`（不匯入 gateway）。
- 為 `/v1/responses` 新增 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）。
- 將 `src/gateway/openai-http.ts` 保持原樣，作為舊版相容性介面卡。
- 新增設定 `gateway.http.endpoints.responses.enabled`（預設 `false`）。
- 保持 `gateway.http.endpoints.chatCompletions.enabled` 獨立；允許這兩個端點
  分別切換。
- 當啟用 Chat Completions 時，發出啟動警告以標示其為舊版狀態。

## Chat Completions 的淘汰路徑

- 維持嚴格的模組邊界：responses 與 chat completions 之間不共享 schema 類型。
- 透過設定讓 Chat Completions 成為選用功能，以便無需修改程式碼即可停用。
- 一旦 `/v1/responses` 穩定後，更新文件將 Chat Completions 標記為舊版。
- 可選的未來步驟：將 Chat Completions 請求映射到 Responses 處理程式，以便更簡單地
  移除路徑。

## 第 1 階段支援子集

- 接受 `input` 作為字串或具有訊息角色和 `function_call_output` 的 `ItemParam[]`。
- 將系統和開發者訊息提取到 `extraSystemPrompt` 中。
- 使用最新的 `user` 或 `function_call_output` 作為代理執行的當前訊息。
- 使用 `invalid_request_error` 拒絕不支援的內容部分（圖片/檔案）。
- 返回包含 `output_text` 內容的單一助理訊息。
- 返回值為零的 `usage`，直到 Token 計算連接完畢。

## 驗證策略（無 SDK）

- 為以下支援的子集實作 Zod 架構：
  - `CreateResponseBody`
  - `ItemParam` + 訊息內容部分聯集
  - `ResponseResource`
  - 閘道使用的串流事件形狀
- 將架構保留在單一、獨立的模組中，以避免差異並允許未來的程式碼生成。

## 串流實作（第 1 階段）

- 包含 `event:` 和 `data:` 的 SSE 行。
- 必需的序列（最小可行性）：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta`（視需要重複）
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 測試與驗證計畫

- 為 `/v1/responses` 增加端對端覆蓋率：
  - 需要驗證
  - 非串流回應形狀
  - 串流事件排序和 `[DONE]`
  - 使用標頭和 `user` 進行會話路由
- 保持 `src/gateway/openai-http.test.ts` 不變。
- 手動：使用 `stream: true` curl 至 `/v1/responses` 並驗證事件排序和終端
  `[DONE]`。

## 文件更新（後續）

- 新增 `/v1/responses` 使用範例的文件頁面。
- 使用舊版註記和指向 `/v1/responses` 的指標更新 `/gateway/openai-http-api`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
