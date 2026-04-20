---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
title: "Agent Loop"
---

# Agent 循环（OpenClaw）

Agent 循环是 Agent 完整的“真实”运行过程：输入 → 上下文组装 → 模型推理 → 工具执行 → 流式回复 → 持久化。这是一条权威路径，将消息转换为操作和最终回复，同时保持会话状态一致。

在 OpenClaw 中，循环是每个会话的单次序列化运行，随着模型思考、调用工具和流式输出，发出生命周期和流事件。本文档解释了该真实循环是如何端到端连接的。

## 入口点

- Gateway(网关) 网关 RPC: `agent` 和 `agent.wait`。
- CLI: `agent` 命令。

## 工作原理（高层）

1. `agent` RPC 验证参数，解析会话（sessionKey/sessionId），持久化会话元数据，立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行代理：
   - 解析 模型 + thinking/verbose/trace 默认值
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
5. `agent.wait` 使用 `waitForAgentRun`：
   - 等待 `runId` 的 **lifecycle end/error**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 运行按会话密钥（会话通道）以及可选地通过全局通道进行串行化。
- 这可以防止工具/会话竞争，并保持会话历史记录一致。
- 消息传递通道可以选择队列模式（collect/steer/followup）来输入此通道系统。
  请参阅 [Command Queue](/en/concepts/queue)。

## 会话 + 工作区准备

- 解析并创建工作区；沙箱隔离运行可能会重定向到沙箱工作区根目录。
- 加载 Skills（或从快照中重用）并将其注入到环境和提示中。
- 解析 Bootstrap/上下文文件并将其注入到系统提示报告中。
- 获取会话写锁；在流式传输之前打开并准备 `SessionManager`。

## 提示组装 + 系统提示

- 系统提示词由 OpenClaw 的基础提示词、技能提示词、引导上下文和单次运行覆盖项构建而成。
- 强制执行特定于模型的限制和压缩保留令牌。
- 请参阅 [System prompt](/en/concepts/system-prompt) 以了解模型看到的内容。

## 挂钩点（您可以拦截的位置）

OpenClaw 有两个钩子系统：

- **内部钩子** (Gateway(网关) 钩子)：用于命令和生命周期事件的事件驱动脚本。
- **插件挂钩**：代理/工具生命周期和 Gateway 管道内的扩展点。

### 内部钩子 (Gateway(网关) hooks)

- **`agent:bootstrap`**：在系统提示词最终确定之前构建引导文件时运行。
  使用此挂钩添加/删除引导上下文文件。
- **命令挂钩**：`/new`、`/reset`、`/stop` 和其他命令事件（请参阅挂钩文档）。

请参阅 [Hooks](/en/automation/hooks) 了解设置和示例。

### 插件挂钩（代理 + Gateway 生命周期）

这些在代理循环或 Gateway 管道中运行：

- **`before_model_resolve`**：在会话前运行（无 `messages`），以便在模型解析之前确定性地覆盖提供商/模型。
- **`before_prompt_build`**：在加载会话后（包含 `messages`）运行，以便在提交提示词之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。使用 `prependContext` 处理每轮动态文本，并使用系统上下文字段处理应位于系统提示词空间的稳定指导信息。
- **`before_agent_start`**：旧版兼容性挂钩，可能在任一阶段运行；优先使用上述显式挂钩。
- **`before_agent_reply`**：在内联操作之后、LLM 调用之前运行，允许插件认领该轮次并返回合成回复或完全静默该轮次。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或注释压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`before_install`**：检查内置扫描结果，并可选择阻止技能或插件的安装。
- **`tool_result_persist`**：在将工具结果写入会话记录之前同步转换工具结果。
- **`message_received` / `message_sending` / `message_sent`**：入站 + 出站消息钩子。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：网关生命周期事件。

出站/工具守卫的钩子决策规则：

- `before_tool_call`：`{ block: true }` 是终止性的，会停止较低优先级的处理程序。
- `before_tool_call`：`{ block: false }` 是空操作，不会清除先前的阻止。
- `before_install`：`{ block: true }` 是终止性的，会停止较低优先级的处理程序。
- `before_install`：`{ block: false }` 是空操作，不会清除先前的阻止。
- `message_sending`：`{ cancel: true }` 是终止性的，会停止较低优先级的处理程序。
- `message_sending`：`{ cancel: false }` 是空操作，不会清除先前的取消。

请参阅 [Plugin hooks](/en/plugins/architecture#provider-runtime-hooks) 了解 hook API 和注册详细信息。

## 流式传输 + 部分回复

- 助手增量数据从 pi-agent-core 流式传输，并作为 `assistant` 事件发出。
- 分块流式传输可以在 `text_end` 或 `message_end` 上发出部分回复。
- 推理流式传输可以作为单独的流或作为块回复发出。
- 请参阅 [Streaming](/en/concepts/streaming) 了解分块和块回复行为。

## 工具执行 + 消息传递工具

- 工具开始/更新/结束事件在 `tool` 流上发出。
- 工具结果在记录/发出之前会针对大小和图像负载进行清理。
- 消息传递工具的发送会被跟踪，以抑制重复的助手确认。

## 回复整形 + 抑制

- 最终负载由以下内容组装而成：
  - 助手文本（以及可选的推理）
  - 内联工具摘要（当启用详细模式且允许时）
  - 模型出错时的助手错误文本
- 确切的静默令牌 `NO_REPLY` / `no_reply` 会从传出负载中被过滤掉。
- 重复的消息传递工具会从最终负载列表中移除。
- 如果没有可渲染的负载且工具出错，则会发出回退工具错误回复（除非消息传递工具已发送用户可见的回复）。

## 压缩 + 重试

- 自动压缩会发出 `compaction` 流事件并可以触发重试。
- 重试时，内存缓冲区和工具摘要会被重置，以避免重复输出。
- 请参阅 [Compaction](/en/concepts/compaction) 了解压缩管道。

## 事件流（当前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（以及作为回退由 `agentCommand` 发出）
- `assistant`：来自 pi-agent-core 的流式增量
- `tool`：来自 pi-agent-core 的流式工具事件

## 聊天渠道处理

- 助手增量被缓冲到聊天 `delta` 消息中。
- 聊天 `final` 在 **生命周期结束/错误** 时发出。

## 超时

- `agent.wait` 默认值：30s（仅等待时间）。`timeoutMs` 参数覆盖。
- Agent 运行时：`agents.defaults.timeoutSeconds` 默认 172800s（48 小时）；在 `runEmbeddedPiAgent` 中止计时器中强制执行。
- LLM 空闲超时：如果在空闲窗口之前没有响应块到达，`agents.defaults.llm.idleTimeoutSeconds` 将中止模型请求。对于速度较慢的本地模型或推理/工具调用提供商，请显式设置它；设置为 0 可将其禁用。如果未设置，OpenClaw 将在配置时使用 `agents.defaults.timeoutSeconds`，否则为 120s。没有显式 LLM 或代理超时的 Cron 触发运行将禁用空闲监视程序，并依赖 cron 外部超时。

## 事物可能提前结束的地方

- Agent 超时（中止）
- AbortSignal（取消）
- Gateway(网关) 断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止代理）

## 相关

- [Tools](/en/tools) — 可用的代理工具
- [Hooks](/en/automation/hooks) — 由代理生命周期事件触发的事件驱动脚本
- [Compaction](/en/concepts/compaction) — 长对话如何被总结
- [Exec Approvals](/en/tools/exec-approvals) — shell 命令的审批门
- [Thinking](/en/tools/thinking) — 思考/推理级别配置
