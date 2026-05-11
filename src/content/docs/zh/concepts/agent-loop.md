---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Agent loop"
---

An agentic loop is the full “real” run of an agent: intake → context assembly → 模型 inference →
工具 execution → streaming replies → persistence. It’s the authoritative path that turns a message
into actions and a final reply, while keeping 会话 state consistent.

In OpenClaw, a loop is a single, serialized run per 会话 that emits lifecycle and stream events
as the 模型 thinks, calls tools, and streams output. This doc explains how that authentic loop is
wired end-to-end.

## 入口点

- Gateway(网关) RPC: `agent` 和 `agent.wait`。
- CLI: `agent` 命令。

## 工作原理（高层级）

1. `agent` RPC 验证参数，解析会话（sessionKey/sessionId），持久化会话元数据，立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行 Agent：
   - 解析模型以及 thinking/verbose/trace 的默认值
   - 加载技能快照
   - 调用 `runEmbeddedPiAgent`（pi-agent-core 运行时）
   - 如果嵌入的循环未发出事件，则发出 **生命周期结束/错误**
3. `runEmbeddedPiAgent`：
   - 通过每个会话 + 全局队列串行化运行
   - 解析模型 + 认证配置文件并构建 pi 会话
   - 订阅 pi 事件并流式传输助手/工具增量
   - 强制执行超时 -> 如果超时则中止运行
   - 返回负载 + 使用情况元数据
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw `agent` 流：
   - 工具事件 => `stream: "tool"`
   - 助手增量 => `stream: "assistant"`
   - 生命周期事件 => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentRun`：
   - 等待 `runId` 的 **生命周期结束/错误**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 运行按会话键（会话通道）串行化，并可选择通过全局通道。
- 这可以防止工具/会话竞争，并保持会话历史记录的一致性。
- 消息传递通道可以选择队列模式（collect/steer/followup），这些模式输入到此通道系统。
  请参阅 [Command Queue](/zh/concepts/queue)。
- Transcript 写入也由会话文件上的会话写入锁保护。该锁是进程感知的且基于文件的，因此它会捕获绕过进程内队列或来自另一个进程的写入者。
- 会话写入锁默认是不可重入的。如果一个辅助程序在保持一个逻辑写入者的同时故意嵌套获取同一个锁，则必须使用 `allowReentrant: true` 显式选择加入。

## 会话 + 工作区准备

- 工作区被解析并创建；沙箱隔离运行可能会重定向到沙箱工作区根目录。
- Skills 被加载（或从快照中重用）并注入到环境和提示中。
- Bootstrap/context 文件被解析并注入到系统提示报告中。
- 获取会话写入锁；`SessionManager` 在流式传输之前被打开并准备。任何后续的 transcript 重写、压缩或截断路径必须在打开或更改 transcript 文件之前获取相同的锁。

## 提示组装 + 系统提示

- 系统提示由 OpenClaw 的基础提示、skills 提示、bootstrap 上下文和每次运行的覆盖构建而成。
- 特定于模型的限制和压缩保留令牌将被强制执行。
- 有关模型看到的内容，请参阅 [System prompt](/zh/concepts/system-prompt)。

## 挂钩点（您可以拦截的地方）

OpenClaw 有两个挂钩系统：

- **内部挂钩**（Gateway(网关) 挂钩）：用于命令和生命周期事件的事件驱动脚本。
- **插件挂钩**：agent/工具 生命周期和 gateway 管道内的扩展点。

### 内部挂钩（Gateway(网关) 挂钩）

- **`agent:bootstrap`**：在系统提示完成之前构建 bootstrap 文件时运行。
  使用它来添加/删除 bootstrap 上下文文件。
- **命令挂钩**：`/new`、`/reset`、`/stop` 和其他命令事件（请参阅挂钩文档）。

有关设置和示例，请参阅 [Hooks](/zh/automation/hooks)。

### 插件挂钩（agent + gateway 生命周期）

这些在 agent 循环或 gateway 管道内运行：

- **`before_model_resolve`**：在会话之前运行（无 `messages`），以便在模型解析之前确定性地覆盖提供商/模型。
- **`before_prompt_build`**：在加载会话后（带有 `messages`）运行，以便在提交提示之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。使用 `prependContext` 处理每轮动态文本，使用 system-context 字段处理应位于系统提示空间内的稳定指导。
- **`before_agent_start`**：遗留兼容性挂钩，可能在任一阶段运行；首选上述显式挂钩。
- **`before_agent_reply`**：在内联操作之后和 LLM 调用之前运行，允许插件声明该轮次并返回合成回复或完全静默该轮次。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或注释压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`before_install`**：检查内置扫描结果，并可选择阻止技能或插件安装。
- **`tool_result_persist`**：在工具结果写入 OpenClaw 拥有的会话记录之前，同步转换工具结果。
- **`message_received` / `message_sending` / `message_sent`**：入站和出站消息挂钩。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：网关生命周期事件。

出站/工具防护的挂钩决策规则：

- `before_tool_call`：`{ block: true }` 是终止性的，会停止低优先级的处理程序。
- `before_tool_call`：`{ block: false }` 是无操作，不会清除先前的阻止。
- `before_install`：`{ block: true }` 是终止性的，会停止低优先级的处理程序。
- `before_install`：`{ block: false }` 是一个空操作，不会清除先前的阻塞。
- `message_sending`：`{ cancel: true }` 是终止性的，会停止较低优先级的处理程序。
- `message_sending`：`{ cancel: false }` 是一个空操作，不会清除先前的取消。

有关 hook API 和注册详细信息，请参阅 [Plugin hooks](/zh/plugins/hooks)。

Harness 可能会以不同方式调整这些 hooks。Codex 应用服务器 harness 将 OpenClaw 插件 hooks 作为已记录镜像表面的兼容性契约，而 Codex 原生 hooks 仍然是单独的较低级别的 Codex 机制。

## 流式传输 + 部分回复

- Assistant 增量从 pi-agent-core 流式传输，并作为 `assistant` 事件发出。
- 分块流式传输可以在 `text_end` 或 `message_end` 上发出部分回复。
- 推理流式传输可以作为单独的流或作为分块回复发出。
- 有关分块和块回复行为，请参阅 [Streaming](/zh/concepts/streaming)。

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
- 有关压缩管道，请参阅 [Compaction](/zh/concepts/compaction)。

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
- 模型空闲超时：如果在空闲窗口内没有响应块到达，OpenClaw 会中止模型请求。`models.providers.<id>.timeoutSeconds` 会针对缓慢的本地/自托管提供商延长此空闲监视程序；否则，如果配置了 `agents.defaults.timeoutSeconds`，OpenClaw 将使用该值，默认上限为 120 秒。没有显式模型或代理超时的 Cron 触发运行会禁用空闲监视程序，并依赖 cron 外部超时。
- 提供商 HTTP 请求超时：`models.providers.<id>.timeoutSeconds` 适用于该提供商的模型 HTTP 获取，包括连接、标头、正文、SDK 请求超时、总的受保护获取中止处理和模型流空闲监视程序。对于像 Ollama 这样缓慢的本地/自托管提供商，请在增加整个代理运行时超时之前使用此设置。

## 提前结束的情况

- 代理超时（中止）
- AbortSignal（取消）
- Gateway(网关) 断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止代理）

## 相关

- [Tools](/zh/tools) — 可用的代理工具
- [Hooks](/zh/automation/hooks) — 由代理生命周期事件触发的 event-driven 脚本
- [Compaction](/zh/concepts/compaction) — 长对话的摘要方式
- [Exec Approvals](/zh/tools/exec-approvals) — shell 命令的批准门控
- [Thinking](/zh/tools/thinking) — 思考/推理级别配置
