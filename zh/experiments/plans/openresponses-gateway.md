---
summary: "计划：添加 OpenResponses /v1/responses 端点并干净地弃用聊天补全"
read_when:
  - 设计或实现 `/v1/responses` 网关支持
  - 规划从聊天补全兼容性迁移
owner: "openclaw"
status: "draft"
last_updated: "2026-01-19"
title: "OpenResponses Gateway(网关) 计划"
---

# OpenResponses Gateway(网关) 集成计划

## 上下文

OpenClaw Gateway(网关) 目前在 `/v1/chat/completions` 公开了一个最小的 OpenAI 兼容的聊天补全端点（请参阅 [OpenAI 聊天补全](/zh/gateway/openai-http-api)）。

Open Responses 是一个基于 OpenAI Responses API 的开放推理标准。它专为代理工作流设计，使用基于项的输入和语义流式传输事件。OpenResponses 规范定义的是 `/v1/responses`，而不是 `/v1/chat/completions`。

## 目标

- 添加一个遵循 OpenResponses 语义的 `/v1/responses` 端点。
- 将聊天补全作为兼容性层保留，使其易于禁用并最终移除。
- 使用隔离的、可重用的模式来标准化验证和解析。

## 非目标

- 在第一阶段实现完整的 OpenResponses 功能对等性（图像、文件、托管工具）。
- 替换内部代理执行逻辑或工具编排。
- 在第一阶段期间更改现有的 `/v1/chat/completions` 行为。

## 研究摘要

来源：OpenResponses OpenAPI、OpenResponses 规范站点以及 Hugging Face 博客文章。

提取的关键点：

- `POST /v1/responses` 接受 `CreateResponseBody` 字段，例如 `model`、`input`（字符串或
  `ItemParam[]`）、`instructions`、`tools`、`tool_choice`、`stream`、`max_output_tokens` 和
  `max_tool_calls`。
- `ItemParam` 是以下内容的可区分联合：
  - 角色为 `system`、`developer`、`user`、`assistant` 的 `message` 项
  - `function_call` 和 `function_call_output`
  - `reasoning`
  - `item_reference`
- 成功的响应返回一个 `ResponseResource`，其中包含 `object: "response"`、`status` 和
  `output` 项目。
- 流式传输使用如下语义事件：
  - `response.created`、`response.in_progress`、`response.completed`、`response.failed`
  - `response.output_item.added`、`response.output_item.done`
  - `response.content_part.added`、`response.content_part.done`
  - `response.output_text.delta`、`response.output_text.done`
- 规范要求：
  - `Content-Type: text/event-stream`
  - `event:` 必须与 JSON `type` 字段匹配
  - 终止事件必须是字面量 `[DONE]`
- 推理项目可能会公开 `content`、`encrypted_content` 和 `summary`。
- HF 示例在请求中包含 `OpenResponses-Version: latest`（可选标头）。

## 建议的架构

- 添加 `src/gateway/open-responses.schema.ts`，其中仅包含 Zod 模式（不导入网关）。
- 为 `/v1/responses` 添加 `src/gateway/openresponses-http.ts`（或 `open-responses-http.ts`）。
- 保持 `src/gateway/openai-http.ts` 完整，作为遗留兼容适配器。
- 添加配置 `gateway.http.endpoints.responses.enabled`（默认为 `false`）。
- 保持 `gateway.http.endpoints.chatCompletions.enabled` 独立；允许分别切换两个端点。
- 当启用 Chat Completions 时，发出启动警告以指示其遗留状态。

## Chat Completions 的弃用路径

- 保持严格的模块边界：responses 和 chat completions 之间不共享架构类型。
- 使 Chat Completions 在配置中成为可选项，以便无需更改代码即可将其禁用。
- 一旦 `/v1/responses` 稳定，更新文档将 Chat Completions 标记为遗留。
- 可选的未来步骤：将 Chat Completions 请求映射到 Responses 处理程序，以便简化移除路径。

## 第 1 阶段支持子集

- 接受 `input` 作为字符串或包含消息角色和 `function_call_output` 的 `ItemParam[]`。
- 将系统消息和开发者消息提取到 `extraSystemPrompt` 中。
- 将最新的 `user` 或 `function_call_output` 作为代理运行的当前消息。
- 使用 `invalid_request_error` 拒绝不支持的内容部分（图像/文件）。
- 返回包含 `output_text` 内容的单条助手消息。
- 返回值为零的 `usage`，直到连接 token 计费功能。

## 验证策略（无 SDK）

- 为受支持的子集实现 Zod 模式：
  - `CreateResponseBody`
  - `ItemParam` + 消息内容部分联合
  - `ResponseResource`
  - 网关使用的流式事件形状
- 将模式保存在单个隔离模块中，以避免差异并允许未来的代码生成。

## 流式实现（第一阶段）

- 同时包含 `event:` 和 `data:` 的 SSE 行。
- 所需序列（最小可行性）：
  - `response.created`
  - `response.output_item.added`
  - `response.content_part.added`
  - `response.output_text.delta`（根据需要重复）
  - `response.output_text.done`
  - `response.content_part.done`
  - `response.completed`
  - `[DONE]`

## 测试和验证计划

- 为 `/v1/responses` 添加端到端覆盖：
  - 需要身份验证
  - 非流式响应形状
  - 流事件排序和 `[DONE]`
  - 使用 headers 和 `user` 进行会话路由
- 保持 `src/gateway/openai-http.test.ts` 不变。
- 手动：使用 `stream: true` curl 到 `/v1/responses` 并验证事件排序和终端 `[DONE]`。

## 文档更新（后续）

- 为 `/v1/responses` 的用法和示例添加一个新的文档页面。
- 更新 `/gateway/openai-http-api`，添加遗留说明并指向 `/v1/responses`。

import zh from "/components/footer/zh.mdx";

<zh />
