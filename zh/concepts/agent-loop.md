---
summary: "Agent 循环生命周期、流和等待语义"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
title: "Agent 循环"
---

# Agent 循环

Agent 循环是 Agent 完整的“真实”运行过程：输入 → 上下文组装 → 模型推理 → 工具执行 → 流式回复 → 持久化。这是一条权威路径，将消息转换为操作和最终回复，同时保持会话状态一致。

在 OpenClaw 中，循环是每个会话的单次序列化运行，随着模型思考、调用工具和流式输出，发出生命周期和流事件。本文档解释了该真实循环是如何端到端连接的。

## 入口点

- Gateway RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 命令。

## 工作原理（高层）

1. `agent` RPC 验证参数，解析会话，持久化会话元数据，并立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行 agent：
   - 解析模型 + thinking/verbose 默认值
   - 加载 skills 快照
   - 调用 `runEmbeddedPiAgent` (pi-agent-core runtime)
   - 如果嵌入的循环没有发出，则发出 **lifecycle end/error**
3. `runEmbeddedPiAgent`：
   - 通过每个会话 + 全局队列序列化运行
   - 解析模型 + auth 配置文件并构建 pi 会话
   - 订阅 pi 事件并流式传输 assistant/tool 增量
   - 强制执行超时 -> 如果超过则中止运行
   - 返回 payloads + 使用元数据
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw `agent` 流：
   - tool events => `stream: "tool"`
   - assistant deltas => `stream: "assistant"`
   - lifecycle events => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentJob`：
   - 等待 **lifecycle end/error** 以进行 `runId`
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 队列 + 并发

- 运行按会话密钥进行序列化，并可选择通过全局通道。
- 这可以防止工具/会话竞争，并保持会话历史一致。
- 消息传递通道可以选择队列模式，这些模式馈送到该通道系统。
  请参阅 [命令队列](/zh/en/concepts/queue)。

## 会话 + 工作区准备

- 工作区被解析并创建；沙盒运行可能会重定向到沙盒工作区根目录。
- 技能被加载（或从快照重用）并注入到环境和提示词中。
- Bootstrap/上下文文件被解析并注入到系统提示词报告中。
- 获取会话写入锁；`SessionManager` 在流式传输之前被打开并准备就绪。

## 提示词组装 + 系统提示词

- 系统提示词由 OpenClaw 的基础提示词、技能提示词、启动上下文和每次运行的覆盖项构建而成。
- 强制执行特定于模型的限制和压缩保留令牌（tokens）。
- 请参阅 [系统提示词](/zh/en/concepts/system-prompt) 以了解模型看到的内容。

## 挂钩点（您可以进行拦截的位置）

OpenClaw 有两个挂钩系统：

- **内部挂钩**（网关挂钩）：用于命令和生命周期事件的事件驱动脚本。
- **插件挂钩**：代理/工具生命周期和网关管道内部的扩展点。

### 内部挂钩（网关挂钩）

- **`agent:bootstrap`**：在系统提示词完成之前构建引导文件时运行。
  使用此挂钩来添加/删除引导上下文文件。
- **命令挂钩**：`/new`、`/reset`、`/stop` 和其他命令事件（请参阅挂钩文档）。

请参阅 [挂钩](/zh/en/automation/hooks) 以了解设置和示例。

### 插件挂钩（代理 + 网关生命周期）

这些在代理循环或网关管道内运行：

- **`before_model_resolve`**：在会话前运行（无 `messages`），以便在模型解析之前确定性地覆盖提供商/模型。
- **`before_prompt_build`**：在会话加载后运行（带有 `messages`），以便在提交提示词之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。请使用 `prependContext` 获取每轮动态文本，并使用 system-context 字段获取应位于系统提示词空间中的稳定指导。
- **`before_agent_start`**：遗留兼容性挂钩，可能在任一阶段运行；首选上述显式挂钩。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或注释压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`tool_result_persist`**：在将工具结果写入会话记录之前同步转换它们。
- **`message_received` / `message_sending` / `message_sent`**：入站和出站消息钩子。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：网关生命周期事件。

有关钩子 API 和注册详细信息，请参阅 [插件](/zh/en/tools/plugin#plugin-hooks)。

## 流式传输 + 部分回复

- Assistant 增量从 pi-agent-core 流式传输并作为 `assistant` 事件发出。
- 块流式传输可以在 `text_end` 或 `message_end` 上发出部分回复。
- 推理流式传输可以作为单独的流或作为块回复发出。
- 有关分块和块回复行为，请参阅 [流式传输](/zh/en/concepts/streaming)。

## 工具执行 + 消息传递工具

- 工具开始/更新/结束事件在 `tool` 流上发出。
- 工具结果在记录/发出之前会经过大小和图像负载的清理。
- 会跟踪消息传递工具的发送，以抑制重复的助手确认。

## 回复塑形 + 抑制

- 最终负载由以下部分组装而成：
  - 助手文本（以及可选的推理）
  - 内联工具摘要（当详细模式 + 允许时）
  - 模型出错时的助手错误文本
- `NO_REPLY` 被视为静默令牌，并从传出负载中过滤掉。
- 消息传递工具的重复项会从最终负载列表中移除。
- 如果没有剩余的可渲染负载且工具出错，则会发出后备工具错误回复
  （除非消息传递工具已经发送了用户可见的回复）。

## 压缩 + 重试

- 自动压缩会发出 `compaction` 流事件并可能触发重试。
- 重试时，内存缓冲区和工具摘要会被重置以避免重复输出。
- 有关压缩管道，请参阅 [Compaction](/zh/en/concepts/compaction)。

## 事件流（目前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（以及作为备用由 `agentCommand` 发出）
- `assistant`：来自 pi-agent-core 的流式增量
- `tool`：来自 pi-agent-core 的流式工具事件

## 聊天通道处理

- 助手增量被缓冲到聊天 `delta` 消息中。
- 在 **生命周期结束/错误** 时会发出一个聊天 `final`。

## 超时

- `agent.wait` 默认值：30秒（仅等待）。`timeoutMs` 参数覆盖。
- Agent 运行时：`agents.defaults.timeoutSeconds` 默认 600秒；在 `runEmbeddedPiAgent` 中止计时器中强制执行。

## 可能提前结束的情况

- Agent 超时（中止）
- AbortSignal（取消）
- 网关断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止 agent）

import zh from '/components/footer/zh.mdx';

<zh />
