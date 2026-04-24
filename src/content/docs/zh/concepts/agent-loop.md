---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
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
- 消息传递通道可以选择队列模式（collect/steer/followup）来填充此车道系统。
  请参阅 [Command Queue](/zh/concepts/queue)。
- Transcript 写入也受会话文件上的会话写锁保护。该锁是进程感知的且基于文件的，因此它会捕获绕过进程内队列或来自其他进程的写入程序。
- 会话写锁默认是不可重入的。如果辅助程序在保持一个逻辑写入者的同时有意嵌套获取同一锁，则必须使用 `allowReentrant: true` 显式选择加入。

## 会话 + 工作区准备

- 工作区被解析并创建；沙箱隔离的运行可能会重定向到沙箱工作区根目录。
- Skills 被加载（或从快照中重用）并注入到 env 和 prompt 中。
- Bootstrap/context 文件被解析并注入到系统提示报告中。
- 获取会话写锁；`SessionManager` 在流式传输之前被打开并准备。任何后续的转录本重写、压缩或截断路径必须在打开或更改转录本文件之前获取相同的锁。

## 提示组装 + 系统提示

- 系统提示由 OpenClaw 的基本提示、技能提示、引导上下文和每次运行的覆盖内容构建而成。
- 强制执行特定于模型的限制和压缩保留令牌。
- 有关模型看到的内容，请参阅 [系统提示](/zh/concepts/system-prompt)。

## 挂钩点（您可以拦截的位置）

OpenClaw 有两个挂钩系统：

- **内部挂钩**（Gateway(网关) 挂钩）：用于命令和生命周期事件的事件驱动脚本。
- **插件挂钩**：代理/工具生命周期和网关管道内的扩展点。

### 内部挂钩（Gateway(网关) 挂钩）

- **`agent:bootstrap`**：在系统提示词完成之前构建引导文件时运行。
  使用此项添加/删除引导上下文文件。
- **Command hooks**：`/new`、`/reset`、`/stop` 和其他命令事件（请参阅 Hooks 文档）。

请参阅 [Hooks](/zh/automation/hooks) 了解设置和示例。

### Plugin hooks（agent + gateway 生命周期）

这些在 agent 循环或 gateway 管道内运行：

- **`before_model_resolve`**：在会话前运行（无 `messages`），以便在模型解析之前确定性覆盖提供商/模型。
- **`before_prompt_build`**：在会话加载之后（带有 `messages`）运行，以便在提交提示之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。请使用 `prependContext` 来处理每轮动态文本，并使用系统上下文字段来处理应位于系统提示空间中的稳定指导。
- **`before_agent_start`**：旧版兼容性挂钩，可能在任一阶段运行；优先使用上述显式挂钩。
- **`before_agent_reply`**：在内联操作之后和 LLM 调用之前运行，允许插件声明该轮次并返回合成回复，或者完全静默该轮次。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或注释压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`before_install`**：检查内置扫描结果，并可选择阻止技能或插件安装。
- **`tool_result_persist`**：在工具结果写入会话记录之前同步转换工具结果。
- **`message_received` / `message_sending` / `message_sent`**：入站和出站消息钩子。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：网关生命周期事件。

出站/工具守卫的钩子决策规则：

- `before_tool_call`：`{ block: true }` 是终态的，会停止低优先级的处理程序。
- `before_tool_call`：`{ block: false }` 是空操作，不会清除之前的阻止。
- `before_install`：`{ block: true }` 是终态的，会停止低优先级的处理程序。
- `before_install`：`{ block: false }` 是空操作，不会清除之前的阻止。
- `message_sending`：`{ cancel: true }` 是终态的，会停止低优先级的处理程序。
- `message_sending`：`{ cancel: false }` 是空操作，不会清除之前的取消。

有关 hook API 和注册详细信息，请参阅 [Plugin hooks](/zh/plugins/architecture#provider-runtime-hooks)。

## 流式传输 + 部分回复

- Assistant 增量从 pi-agent-core 流式传输，并作为 `assistant` 事件发出。
- 分块流式传输可以在 `text_end` 或 `message_end` 上发出部分回复。
- 推理流式传输可以作为单独的流或作为分块回复发出。
- 有关分块和分块回复行为，请参阅 [Streaming](/zh/concepts/streaming)。

## 工具执行 + 消息传递工具

- 工具开始/更新/结束事件在 `tool` 流上发出。
- 工具结果在记录/发出之前会针对大小和图像负载进行清理。
- 消息传递工具的发送会被跟踪，以抑制重复的 Assistant 确认。

## 回复整形 + 抑制

- 最终负载由以下内容组装：
  - assistant 文本（和可选推理）
  - 内联工具摘要（当详细且被允许时）
  - 模型错误时的 assistant 错误文本
- 确切的静默令牌 `NO_REPLY` / `no_reply` 会从传出负载中过滤掉。
- 消息工具的重复项会从最终负载列表中移除。
- 如果没有剩余的可渲染负载且工具出错，则会发送回退工具错误回复（除非消息工具已发送了用户可见的回复）。

## 压缩 + 重试

- 自动压缩会发出 `compaction` 流事件并可能触发重试。
- 重试时，内存缓冲区和工具摘要会被重置，以避免重复输出。
- 有关压缩管道，请参阅 [压缩](/zh/concepts/compaction)。

## 事件流（今天）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（并作为 `agentCommand` 的回退）
- `assistant`：来自 pi-agent-core 的流式增量
- `tool`：来自 pi-agent-core 的流式工具事件

## 聊天渠道处理

- Assistant 增量被缓冲到聊天 `delta` 消息中。
- 在 **生命周期结束/错误** 时发出聊天 `final`。

## 超时

- `agent.wait` 默认值：30s（仅等待）。`timeoutMs` 参数覆盖。
- Agent 运行时：`agents.defaults.timeoutSeconds` 默认 172800s（48 小时）；在 `runEmbeddedPiAgent` 中止计时器中强制执行。
- LLM 空闲超时：如果在空闲窗口内没有收到响应块，`agents.defaults.llm.idleTimeoutSeconds` 将中止模型请求。针对速度较慢的本地模型或推理/工具调用提供商，请显式设置此值；将其设置为 0 可禁用。如果未设置，当配置了 `agents.defaults.timeoutSeconds` 时，OpenClaw 将使用该值，否则默认为 120秒。未指定显式 LLM 或代理超时的 Cron 触发运行将禁用空闲监视，并依赖 cron 外部超时。

## 进程可能提前结束的地方

- 代理超时（中止）
- AbortSignal（取消）
- Gateway(网关) 断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止代理）

## 相关内容

- [工具](/zh/tools) — 可用的代理工具
- [钩子](/zh/automation/hooks) — 由代理生命周期事件触发的事件驱动脚本
- [压缩](/zh/concepts/compaction) — 长对话的摘要方式
- [Exec Approvals](/zh/tools/exec-approvals) — shell 命令的批准闸门
- [Thinking](/zh/tools/thinking) — 思考/推理级别配置
