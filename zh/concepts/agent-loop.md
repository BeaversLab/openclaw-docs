---
summary: "Agent loop 生命周期、流和等待语义"
read_when:
  - 您需要 agent 循环或生命周期事件的详细演练
title: "Agent Loop"
---

# Agent 循环（OpenClaw）

Agent 循环是 agent 的完整“真实”运行：接收输入 → 上下文组装 → 模型推理 →
工具执行 → 流式回复 → 持久化。这是将消息转换为操作和最终回复的权威路径，同时保持会话状态一致。

在 OpenClaw 中，循环是每个会话的单次序列化运行，当模型思考、调用工具和流式输出时，会发出生命周期和流事件。本文档解释了该真实循环是如何端到端连接的。

## 入口点

- Gateway(网关) RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 命令。

## 工作原理（高层）

1. `agent` RPC 验证参数，解析会话 (sessionKey/sessionId)，持久化会话元数据，立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行 agent：
   - 解析模型 + 思考/详细输出的默认值
   - 加载 Skills 快照
   - 调用 `runEmbeddedPiAgent` (pi-agent-core runtime)
   - 如果嵌入式循环未发出 **lifecycle end/error** 事件，则发出该事件
3. `runEmbeddedPiAgent`：
   - 通过每会话 + 全局队列对运行进行串行化
   - 解析模型 + 身份验证配置文件并构建 pi 会话
   - 订阅 pi 事件并流式传输助手/工具增量
   - 强制执行超时 -> 如果超时则中止运行
   - 返回负载 + 使用情况元数据
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw `agent` 流：
   - 工具事件 => `stream: "tool"`
   - 助手增量 => `stream: "assistant"`
   - 生命周期事件 => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentJob`：
   - 等待 `runId` 的 **生命周期结束/错误**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 运行按会话密钥（会话通道）以及可选地通过全局通道进行串行化。
- 这可以防止工具/会话竞争，并保持会话历史记录一致。
- 消息传递通道可以选择队列模式 (collect/steer/followup) 来馈送到该通道系统。
  参见 [Command Queue](/zh/concepts/queue)。

## 会话 + 工作区准备

- 解析并创建工作区；沙箱隔离运行可能会重定向到沙箱工作区根目录。
- 加载 Skills（或从快照中重用）并将其注入到环境和提示中。
- 解析 Bootstrap/上下文文件并将其注入到系统提示报告中。
- 获取会话写锁；在流式传输之前打开并准备 `SessionManager`。

## 提示组装 + 系统提示

- 系统提示词由 OpenClaw 的基础提示词、技能提示词、引导上下文和单次运行覆盖项构建而成。
- 强制执行特定于模型的限制和压缩保留令牌。
- 关于模型看到的内容，请参阅 [System prompt](/zh/concepts/system-prompt)。

## 挂钩点（您可以拦截的位置）

OpenClaw 有两个钩子系统：

- **内部钩子** (Gateway(网关) 钩子)：用于命令和生命周期事件的事件驱动脚本。
- **插件挂钩**：代理/工具生命周期和 Gateway 管道内的扩展点。

### 内部钩子 (Gateway hooks)

- **`agent:bootstrap`**：在系统提示词最终确定之前，在构建引导文件时运行。
  使用此钩子添加/删除引导上下文文件。
- **命令挂钩**：`/new`、`/reset`、`/stop` 和其他命令事件（请参阅挂钩文档）。

有关设置和示例，请参阅[挂钩](/zh/automation/hooks)。

### 插件挂钩（代理 + Gateway 生命周期）

这些在代理循环或 Gateway 管道中运行：

- **`before_model_resolve`**：在会话前运行（无 `messages`），以便在模型解析之前确定性地覆盖提供商/模型。
- **`before_prompt_build`**：在加载会话后运行（包含 `messages`），以便在提交提示之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。请使用 `prependContext` 处理每轮动态文本，并使用系统上下文字段处理应位于系统提示空间中的稳定指导。
- **`before_agent_start`**：遗留兼容性挂钩，可能在任一阶段运行；请优先使用上述显式挂钩。
- **`agent_end`**：在完成后检查最终消息列表并运行元数据。
- **`before_compaction` / `after_compaction`**：观察或标注压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`tool_result_persist`**：在工具结果写入会话记录之前同步转换这些结果。
- **`message_received` / `message_sending` / `message_sent`**：入站和出站消息挂钩。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：网关生命周期事件。

有关挂钩 API 和注册详细信息，请参阅[插件](/zh/tools/plugin#plugin-hooks)。

## 流式传输 + 部分回复

- 助手增量从 pi-agent-core 流式传输，并作为 `assistant` 事件发出。
- 分块流式传输可以在 `text_end` 或 `message_end` 上发出部分回复。
- 推理流式传输可以作为单独的流或作为块回复发出。
- 有关分块和块回复行为，请参阅[流式传输](/zh/concepts/streaming)。

## 工具执行 + 消息传递工具

- 工具启动/更新/结束事件在 `tool` 流上发出。
- 在记录/发出之前，会对工具结果的大小和图像负载进行清理。
- 会跟踪消息传递工具的发送，以抑制重复的 Assistant 确认。

## 回复塑形 + 抑制

- 最终负载由以下内容组装而成：
  - Assistant 文本（以及可选的推理）
  - 内联工具摘要（当启用详细模式且允许时）
  - 模型出错时的 Assistant 错误文本
- `NO_REPLY` 被视为静默令牌，并从传出负载中过滤掉。
- 重复的消息传递工具会从最终负载列表中移除。
- 如果没有剩余的可渲染负载，并且工具出错，则会发出回退工具错误回复
  （除非消息传递工具已经发送了用户可见的回复）。

## 压缩 + 重试

- 自动压缩会发出 `compaction` 流事件，并且可以触发重试。
- 重试时，内存缓冲区和工具摘要会重置，以避免重复输出。
- 有关压缩管道，请参阅 [压缩](/zh/concepts/compaction)。

## 事件流（当前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（并且作为 `agentCommand` 的回退）
- `assistant`：来自 pi-agent-core 的流式增量
- `tool`：来自 pi-agent-core 的流式工具事件

## 聊天渠道处理

- 助手增量被缓冲到聊天 `delta` 消息中。
- 聊天 `final` 在 **生命周期结束/错误** 时发出。

## 超时

- `agent.wait` 默认值：30s（仅等待）。`timeoutMs` 参数覆盖。
- 代理运行时：`agents.defaults.timeoutSeconds` 默认 600s；在 `runEmbeddedPiAgent` 中止计时器中强制执行。

## 可能提前结束的位置

- Agent 超时（中止）
- AbortSignal（取消）
- Gateway(网关) 断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止代理）

import en from "/components/footer/en.mdx";

<en />
