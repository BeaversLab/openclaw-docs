---
summary: "计划：新增 OpenResponses /v1/responses 端点并平滑弃用 chat completions"
title: "OpenResponses Gateway Plan"
owner: "openclaw"
status: "draft"
last_updated: "2026-01-19"
---

# OpenResponses Gateway 集成计划

## 背景

OpenClaw Gateway 当前暴露一个最小化的 OpenAI 兼容 Chat Completions 端点：
`/v1/chat/completions`（见 [OpenAI Chat Completions](/zh/gateway/openai-http-api)）。

Open Responses 是基于 OpenAI Responses API 的开放推理标准，面向 agentic 工作流，使用 item 级输入与语义流事件。OpenResponses 规范定义的是 `/v1/responses`，而非 `/v1/chat/completions`。

## 目标

- 新增 `/v1/responses` 端点，遵循 OpenResponses 语义。
- 保留 Chat Completions 作为兼容层，易于关闭并最终移除。
- 用隔离、可复用的 schemas 统一校验与解析。

## 非目标

- 首个版本实现完整 OpenResponses 功能（图像、文件、托管工具）。
- 替换内部 agent 执行逻辑或工具编排。
- 第一阶段改动现有 `/v1/chat/completions` 行为。

## 调研摘要

来源：OpenResponses OpenAPI、OpenResponses 规范站点、Hugging Face 博客。

关键点：

- `POST /v1/responses` 接受 `CreateResponseBody`，包含 `model`、`input`（字符串或
  `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens`、
  `max_tool_calls`。
- `ItemParam` 是判别联合：
  - `message` items，角色 `system`、`developer`、`user`、`assistant`
  - `function_call` 与 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功响应返回 `ResponseResource`，含 `object: "response"`、`status` 与 `output` items。
- Streaming 使用语义事件，如：
  - `response.created`、`response.in_progress`、`response.completed`、`response.failed`
  - `response.output_item.added`、`response.output_item.done`
  - `response.content_part.added`、`response.content_part.done`
  - `response.output_text.delta`、`response.output_text.done`
- 规范要求：
  - `Content-Type: text/event-stream`
  - `event:` 必须匹配 JSON `type` 字段
  - 终止事件必须为字面量 `[DONE]`
- Reasoning items 可暴露 `content`、`encrypted_content` 与 `summary`。
- HF 示例请求包含 `OpenResponses-Version: latest`（可选 header）。

## 拟议架构

- 新增 `src/gateway/open-responses.schema.ts`，仅包含 Zod schemas（不引入 gateway）。
- 新增 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）用于 `/v1/responses`。
- 保持 `src/gateway/openai-http.ts` 作为 legacy 兼容适配器。
- 新增配置 `gateway.http.endpoints.responses.enabled`（默认 `false`）。
- 让 `gateway.http.endpoints.chatCompletions.enabled` 独立；允许两个端点分别开关。
- 当启用 Chat Completions 时输出启动警告，提示其 legacy 状态。

## Chat Completions 的弃用路径

- 保持模块边界严格：responses 与 chat completions 不共享 schema 类型。
- 让 Chat Completions 通过配置 opt-in，以便无需改代码即可关闭。
- `/v1/responses` 稳定后将文档标记 Chat Completions 为 legacy。
- 可选：将 Chat Completions 请求映射到 Responses handler，以简化后续移除。

## Phase 1 支持子集

- 接受 `input` 为字符串或带 message roles 与 `function_call_output` 的 `ItemParam[]`。
- 将 system 与 developer 消息提取为 `extraSystemPrompt`。
- 使用最新的 `user` 或 `function_call_output` 作为 agent 当前消息。
- 对不支持的 content parts（image/file）返回 `invalid_request_error`。
- 返回单条 assistant 消息，内容为 `output_text`。
- `usage` 先返回 0 值，直到 token 统计接入。

## 校验策略（无 SDK）

- 用 Zod 实现支持子集的 schemas：
  - `CreateResponseBody`
  - `ItemParam` + message content part unions
  - `ResponseResource`
  - gateway 使用的 streaming 事件形态
- Schemas 保持在单一隔离模块以避免漂移并便于后续 codegen。

## Streaming 实现（Phase 1）

- SSE 行同时包含 `event:` 与 `data:`。
- 必需事件序列（最小可用）：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta`（可重复）
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 测试与验证计划

- 为 `/v1/responses` 增加 e2e 覆盖：
  - 需要认证
  - 非流式响应形态
  - Stream 事件顺序与 `[DONE]`
  - 通过 headers 与 `user` 的会话路由
- 保持 `src/gateway/openai-http.e2e.test.ts` 不变。
- 手工：`curl` 调 `/v1/responses` 且 `stream: true`，验证事件顺序与终止 `[DONE]`。

## 文档更新（后续）

- 新增 `/v1/responses` 用法与示例页面。
- 在 `/gateway/openai-http-api` 标注 legacy，并指向 `/v1/responses`。
