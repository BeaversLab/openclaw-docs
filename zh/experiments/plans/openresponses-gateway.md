---
summary: "计划：添加 OpenResponses /v1/responses 端点并逐步淘汰 chat completions"
owner: "openclaw"
status: "draft"
last_updated: "2026-01-19"
title: "OpenResponses Gateway 计划"
---

# OpenResponses Gateway 集成计划

## 背景

OpenClaw Gateway 目前在 `/v1/chat/completions` 暴露了一个最小的 OpenAI 兼容 Chat Completions 端点
（参阅 [OpenAI Chat Completions](/zh/gateway/openai-http-api)）。

Open Responses 是一个基于 OpenAI Responses API 的开放推理标准。它专为代理工作流设计，
使用基于项目的输入和语义流式传输事件。OpenResponses 规范定义了 `/v1/responses`，而不是 `/v1/chat/completions`。

## 目标

- 添加一个遵循 OpenResponses 语义的 `/v1/responses` 端点。
- 将 Chat Completions 保留为兼容层，易于禁用并最终移除。
- 使用独立的、可重用的模式标准化验证和解析。

## 非目标

- 在第一阶段实现完整的 OpenResponses 功能对等（图像、文件、托管工具）。
- 替换内部代理执行逻辑或工具编排。
- 在第一阶段改变现有的 `/v1/chat/completions` 行为。

## 研究总结

来源：OpenResponses OpenAPI、OpenResponses 规范网站和 Hugging Face 博客文章。

提取的关键点：

- `POST /v1/responses` 接受 `CreateResponseBody` 字段，如 `model`、`input`（字符串或
  `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens` 和
  `max_tool_calls`。
- `ItemParam` 是一个可区分联合体：
  - 具有角色 `system`、`developer`、`user`、`assistant` 的 `message` 项目
  - `function_call` 和 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功的响应返回一个带有 `object: "response"`、`status` 和
  `output` 项目的 `ResponseResource`。
- 流式传输使用语义事件，例如：
  - `response.created`、`response.in_progress`、`response.completed`、`response.failed`
  - `response.output_item.added`、`response.output_item.done`
  - `response.content_part.added`、`response.content_part.done`
  - `response.output_text.delta`、`response.output_text.done`
- 规范要求：
  - `Content-Type: text/event-stream`
  - `event:` 必须与 JSON `type` 字段匹配
  - 终端事件必须是字面量 `[DONE]`
- 推理项目可能暴露 `content`、`encrypted_content` 和 `summary`。
- HF 示例在请求中包含 `OpenResponses-Version: latest`（可选标头）。

## 建议的架构

- 添加 `src/gateway/open-responses.schema.ts`，仅包含 Zod 模式（无 Gateway 导入）。
- 为 `/v1/responses` 添加 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）。
- 保持 `src/gateway/openai-http.ts` 完整，作为传统兼容适配器。
- 添加配置 `gateway.http.endpoints.responses.enabled`（默认 `false`）。
- 保持 `gateway.http.endpoints.chatCompletions.enabled` 独立；允许两个端点单独切换。
- 当启用 Chat Completions 时发出启动警告以表示传统状态。

## Chat Completions 的逐步淘汰路径

- 维护严格的模块边界：responses 和 chat completions 之间没有共享的模式类型。
- 通过配置使 Chat Completions 成为可选，以便无需代码更改即可禁用。
- 更新文档，一旦 `/v1/responses` 稳定，就将 Chat Completions 标记为传统。
- 可选的未来步骤：将 Chat Completions 请求映射到 Responses 处理程序，以实现更简单的删除路径。

## 第 1 阶段支持的子集

- 接受 `input` 为字符串或 `ItemParam[]`，带有消息角色和 `function_call_output`。
- 将系统消息和开发者消息提取到 `extraSystemPrompt` 中。
- 使用最新的 `user` 或 `function_call_output` 作为代理运行的当前消息。
- 使用 `invalid_request_error` 拒绝不支持的内容部分（图像/文件）。
- 返回带有 `output_text` 内容的单个助手消息。
- 返回带有零值的 `usage`，直到令牌计费连接完成。

## 验证策略（无 SDK）

- 为支持的子集实现 Zod 模式：
  - `CreateResponseBody`
  - `ItemParam` + 消息内容部分联合
  - `ResponseResource`
  - Gateway 使用的流式传输事件形状
- 将模式保留在单个、隔离的模块中，以避免漂移并允许未来的代码生成。

## 流式传输实现（第 1 阶段）

- 包含 `event:` 和 `data:` 的 SSE 行。
- 必需的序列（最小可行）：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta`（根据需要重复）
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 测试和验证计划

- 为 `/v1/responses` 添加 e2e 覆盖：
  - 需要身份验证
  - 非流式响应形状
  - 流式事件排序和 `[DONE]`
  - 使用标头和 `user` 进行会话路由
- 保持 `src/gateway/openai-http.e2e.test.ts` 不变。
- 手动：使用 `stream: true` curl 到 `/v1/responses` 并验证事件排序和终端
  `[DONE]`。

## 文档更新（后续）

- 为 `/v1/responses` 用法和示例添加新的文档页面。
- 使用传统说明更新 `/gateway/openai-http-api` 并指向 `/v1/responses`。
