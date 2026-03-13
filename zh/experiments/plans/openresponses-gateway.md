---
summary: "计划：添加 OpenResponses /v1/responses 端点并干净地弃用聊天补全"
read_when:
  - Designing or implementing `/v1/responses` gateway support
  - Planning migration from Chat Completions compatibility
owner: "openclaw"
status: "草稿"
last_updated: "2026-01-19"
title: "OpenResponses 网关计划"
---

# OpenResponses 网关集成计划

## 背景

OpenClaw 网关目前在
`/v1/chat/completions` 暴露了一个最小的 OpenAI 兼容聊天补全端点（请参阅 [OpenAI Chat Completions](/en/gateway/openai-http-api)）。

Open Responses 是一个基于 OpenAI Responses API 的开放推理标准。它专为
代理工作流设计，并使用基于项目的输入和语义流事件。OpenResponses
规范定义了 `/v1/responses`，而不是 `/v1/chat/completions`。

## 目标

- 添加一个遵循 OpenResponses 语义的 `/v1/responses` 端点。
- 将聊天补全保留为易于禁用并最终移除的兼容层。
- 通过隔离的、可重用的模式标准化验证和解析。

## 非目标

- 在第一阶段实现完全的 OpenResponses 功能对等（图像、文件、托管工具）。
- 替换内部代理执行逻辑或工具编排。
- 在第一阶段期间更改现有的 `/v1/chat/completions` 行为。

## 研究摘要

来源：OpenResponses OpenAPI、OpenResponses 规范网站以及 Hugging Face 博客文章。

提取的关键点：

- `POST /v1/responses` 接受 `CreateResponseBody` 字段，如 `model`、`input`（字符串或
  `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens` 和
  `max_tool_calls`。
- `ItemParam` 是一个可区分联合，包含：
  - 角色 `system`、`developer`、`user`、`assistant` 的 `message` 项目
  - `function_call` 和 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功的响应返回一个 `ResponseResource`，其中包含 `object: "response"`、`status` 和
  `output` 项目的 `ResponseResource`。
- 流式传输使用语义事件，例如：
  - `response.created`, `response.in_progress`, `response.completed`, `response.failed`
  - `response.output_item.added`, `response.output_item.done`
  - `response.content_part.added`, `response.content_part.done`
  - `response.output_text.delta`, `response.output_text.done`
- 该规范要求：
  - `Content-Type: text/event-stream`
  - `event:` 必须与 JSON `type` 字段匹配
  - 终端事件必须是字面量 `[DONE]`
- 推理项可能暴露 `content`、`encrypted_content` 和 `summary`。
- HF 示例包括请求中的 `OpenResponses-Version: latest`（可选头部）。

## 提议的架构

- 添加 `src/gateway/open-responses.schema.ts`，其中仅包含 Zod 模式（不包含 gateway 导入）。
- 为 `/v1/responses` 添加 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）。
- 保持 `src/gateway/openai-http.ts` 完整，作为传统兼容适配器。
- 添加配置 `gateway.http.endpoints.responses.enabled`（默认为 `false`）。
- 保持 `gateway.http.endpoints.chatCompletions.enabled` 独立；允许两个端点
  单独切换。
- 当启用 Chat Completions 时，发出启动警告以提示其旧版状态。

## Chat Completions 的弃用路径

- 保持严格的模块边界：responses 和 chat completions 之间不共享架构类型。
- 将 Chat Completions 设为通过配置选择加入（opt-in），以便无需更改代码即可将其禁用。
- 一旦 `/v1/responses` 稳定，更新文档将 Chat Completions 标记为传统版本。
- 可选的未来步骤：将 Chat Completions 请求映射到 Responses 处理程序，以便更简单地
  移除。

## 第一阶段支持子集

- 接受 `input` 作为字符串或包含消息角色和 `function_call_output` 的 `ItemParam[]`。
- 将系统和开发者消息提取到 `extraSystemPrompt` 中。
- 使用最近的 `user` 或 `function_call_output` 作为代理运行的当前消息。
- 使用 `invalid_request_error` 拒绝不支持的内容部分（图像/文件）。
- 返回包含 `output_text` 内容的单条助手消息。
- 返回 `usage`，其中值为零，直到连接 token 计费功能。

## 验证策略（无 SDK）

- 为以下支持子集实现 Zod 架构：
  - `CreateResponseBody`
  - `ItemParam` + message content part unions
  - `ResponseResource`
  - Streaming event shapes used by the gateway
- 将架构保留在单个隔离模块中，以避免差异并允许将来的代码生成。

## 流式实现（阶段 1）

- 同时包含 `event:` 和 `data:` 的 SSE 行。
- 所需序列（最小可行性）：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta` (根据需要重复)
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 测试和验证计划

- 为 `/v1/responses` 添加端到端覆盖：
  - 需要认证
  - 非流式响应形状
  - 流事件排序和 `[DONE]`
  - 带有 headers 和 `user` 的会话路由
- 保持 `src/gateway/openai-http.test.ts` 不变。
- 手动：使用 `stream: true` curl 到 `/v1/responses` 并验证事件排序和终端
  `[DONE]`。

## 文档更新（后续跟进）

- 为 `/v1/responses` 的使用和示例添加一个新的文档页面。
- 使用遗留说明和指向 `/v1/responses` 的指针更新 `/gateway/openai-http-api`。

import zh from '/components/footer/zh.mdx';

<zh />
