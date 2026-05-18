---
summary: "Agent loop lifecycle, streams, and wait semantics"
read_when:
  - You need an exact walkthrough of the agent loop or lifecycle events
  - You are changing session queueing, transcript writes, or session write lock behavior
title: "Agent loop"
---

Agent 循环是 agent 的完整“真实”运行过程：intake → context assembly → 模型 inference → 工具 execution → streaming replies → persistence。这是一条权威路径，将消息转换为操作和最终回复，同时保持 会话 状态一致。

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
   - 对于 Codex app-server 轮次，中止已接受的轮次，该轮次在终止事件之前停止产生 app-server 进度
   - 返回 payloads + usage metadata
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw `agent` stream：
   - 工具 events => `stream: "tool"`
   - assistant deltas => `stream: "assistant"`
   - lifecycle events => `stream: "lifecycle"` (`phase: "start" | "end" | "error"`)
5. `agent.wait` 使用 `waitForAgentRun`：
   - 等待 `runId` 的 **lifecycle end/error**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 队列 + 并发

- 运行是按 会话 键（会话 lane）序列化的，并且可以选择通过全局 lane 进行。
- 这可以防止 工具/会话 竞争，并保持 会话 历史记录的一致性。
- 消息传递通道可以选择队列模式（steer/followup/collect/interrupt）来为该通道系统提供输入。
  请参阅 [Command Queue](/zh/concepts/queue)。
- Transcript 写入也受到 会话 文件上的 会话 写锁保护。该锁是进程感知且基于文件的，因此它可以捕获绕过进程内队列或来自另一个进程的写入者。Session transcript 写入者最多等待 `session.writeLock.acquireTimeoutMs`
  然后将 会话 报告为忙碌；默认值为 `60000` 毫秒。
- Session 写锁默认是不可重入的。如果辅助程序有意在保持一个逻辑写入者的同时嵌套获取同一锁，则必须使用
  `allowReentrant: true` 显式选择加入。

## Session + 工作区准备

- 工作区被解析和创建；沙箱隔离运行可能会重定向到沙箱工作区根目录。
- Skills 被加载（或从快照中重用）并注入到 env 和 prompt 中。
- Bootstrap/context 文件被解析并注入到系统 prompt 报告中。
- 获取会话写锁；在流式传输之前，`SessionManager` 被打开并准备就绪。任何后续的转录重写、压缩或截断路径必须在打开或变更转录文件之前获取相同的锁。

## 提示词组装 + 系统提示词

- 系统提示词由 OpenClaw 的基础提示词、技能提示词、引导上下文以及每次运行的覆盖内容构建而成。
- 执行特定于模型的限制和压缩保留令牌。
- 有关模型看到的内容，请参阅 [System prompt](/zh/concepts/system-prompt)。

## Hook 点（您可以拦截的位置）

OpenClaw 有两个 Hook 系统：

- **内部 Hooks** (Gateway(网关) hooks)：用于命令和生命周期事件的事件驱动脚本。
- **Plugin hooks**：agent/工具 生命周期和 gateway 管道内部的扩展点。

### 内部 Hooks (Gateway(网关) hooks)

- **`agent:bootstrap`**：在系统提示词最终确定之前构建引导文件时运行。使用此方法添加/删除引导上下文文件。
- **命令 Hooks**：`/new`、`/reset`、`/stop` 和其他命令事件（请参阅 Hooks 文档）。

有关设置和示例，请参阅 [Hooks](/zh/automation/hooks)。

### Plugin hooks (agent + gateway lifecycle)

这些在 agent 循环或 gateway 管道内运行：

- **`before_model_resolve`**：在会话前运行（无 `messages`），以便在模型解析之前确定性地覆盖 提供商/模型。
- **`before_prompt_build`**：在加载会话后运行（具有 `messages`），以便在提交提示词之前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。使用 `prependContext` 获取每轮动态文本，并使用 system-context 字段获取应位于系统提示词空间中的稳定指导。
- **`before_agent_start`**：遗留兼容性 Hook，可能在此任一阶段中运行；最好使用上述显式 Hooks。
- **`before_agent_reply`**：在内联操作之后和 LLM 调用之前运行，允许插件声明该轮次并返回合成回复或完全静默该轮次。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或注释压缩周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`before_install`**：检查内置扫描结果，并可选择阻止技能或插件的安装。
- **`tool_result_persist`**：在工具结果写入 OpenClaw 拥有的会话记录之前，同步转换工具结果。
- **`message_received` / `message_sending` / `message_sent`**：入站 + 出站消息钩子。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：网关生命周期事件。

出站/工具守卫的钩子决策规则：

- `before_tool_call`：`{ block: true }` 是终止操作，会停止较低优先级的处理程序。
- `before_tool_call`：`{ block: false }` 是空操作，不会清除先前的阻止。
- `before_install`：`{ block: true }` 是终止操作，会停止较低优先级的处理程序。
- `before_install`：`{ block: false }` 是空操作，不会清除先前的阻止。
- `message_sending`：`{ cancel: true }` 是终止操作，会停止较低优先级的处理程序。
- `message_sending`：`{ cancel: false }` 是空操作，不会清除先前的取消。

有关 hook API 和注册详细信息，请参阅 [Plugin hooks](/zh/plugins/hooksAPI)。

Harness 可能会以不同方式调整这些钩子。Codex app-server harness 将 OpenClaw 插件钩子作为已记录的镜像表面的兼容性契约，而 Codex 原生钩子仍然是一个单独的较低级别的 Codex 机制。

## 流式传输 + 部分回复

- Assistant 增量从 pi-agent-core 流式传输并作为 `assistant` 事件发出。
- 分块流式传输可以在 `text_end` 或 `message_end` 上发出部分回复。
- 推理流式传输可以作为单独的流或作为块回复发出。
- 有关分块和块回复行为，请参阅 [Streaming](/zh/concepts/streaming)。

## 工具执行 + 消息传递工具

- 工具开始/更新/结束事件在 `tool` 流上发出。
- 工具结果在记录/发出之前会经过大小和图像负载的清理。
- 消息传递工具的发送会被跟踪，以抑制重复的助理确认。

## 回复塑形 + 抑制

- 最终负载由以下内容组装而成：
  - 助理文本（和可选的推理）
  - 内联工具摘要（当详细模式 + 允许时）
  - 当模型出错时的助理错误文本
- 确切的静默令牌 `NO_REPLY` / `no_reply` 会从传出负载中过滤掉。
- 重复的消息传递工具会从最终负载列表中删除。
- 如果没有剩余可呈现的负载且工具出错，则会发出后备工具错误回复（除非消息传递工具已发送用户可见的回复）。

## 压缩 + 重试

- 自动压缩会发出 `compaction` 流事件，并可以触发重试。
- 重试时，内存缓冲区和工具摘要会被重置，以避免重复输出。
- 有关压缩管道，请参阅 [Compaction](/zh/concepts/compaction)。

## 事件流（当前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（并由 `agentCommand` 作为后备发出）
- `assistant`：来自 pi-agent-core 的流式增量
- `tool`：来自 pi-agent-core 的流式工具事件

## 聊天渠道处理

- Assistant 增量被缓冲到聊天 `delta` 消息中。
- 当**生命周期结束/出错**时，会发出一个聊天 `final`。

## 超时

- `agent.wait` 默认值：30秒（仅等待）。`timeoutMs` 参数会覆盖此设置。
- Agent 运行时：`agents.defaults.timeoutSeconds` 默认为 172800秒（48小时）；在 `runEmbeddedPiAgent` 中止计时器中强制执行。
- Cron 运行时：孤立的 agent-turn `timeoutSeconds` 归 cron 所有。调度器在执行开始时启动该计时器，在配置的截止时间中止底层运行，然后在记录超时之前运行有界的清理工作，以确保过时的子会话不会阻塞通道。
- 会话活跃度诊断：启用诊断后，`diagnostics.stuckSessionWarnMs` 会对没有观察到回复、工具、状态、块或 ACP 进展的长时间 `processing` 会话进行分类。活动的嵌入运行、模型调用和工具调用报告为 `session.long_running`；没有近期进度报告的活动工作报告为 `session.stalled`；`session.stuck` 保留用于没有活动的陈旧会话记录。陈旧的会话记录会立即释放受影响的会话通道；仅当停滞的嵌入运行超过 `diagnostics.stuckSessionAbortMs`（默认：至少 5 分钟且为警告阈值的 3 倍）后，才会中止并排空它们，以便排队的任务能够恢复而不会切断仅仅是缓慢的运行。恢复操作会发出结构化的请求/完成结果，仅当相同的处理世代仍然当前时，诊断状态才会被标记为空闲。在会话保持不变的情况下，重复的 `session.stuck` 诊断会退避。
- 模型空闲超时：当在空闲窗口内没有响应数据包到达时，OpenClaw 会中止模型请求。`models.providers.<id>.timeoutSeconds` 会为缓慢的本地/自托管提供商延长此空闲监视程序，但它仍受限于任何较低的 `agents.defaults.timeoutSeconds` 或特定于运行的超时，因为那些控制整个代理运行。否则，如果已配置 OpenClaw 将使用 `agents.defaults.timeoutSeconds`，默认上限为 120 秒。没有显式模型或代理超时的 Cron 触发运行将禁用空闲监视程序，并依赖于 cron 外部超时。
- 提供商 HTTP 请求超时：`models.providers.<id>.timeoutSeconds` 适用于该提供商的模型 HTTP 获取，包括连接、标头、正文、SDK 请求超时、总的受保护获取中止处理以及模型流空闲监视。在提高整个代理运行时超时之前，请先针对缓慢的本地/自托管提供商（如 Ollama）使用此设置，并且在模型请求需要运行更长时间时，请保持代理/运行时超时至少与之一样高。

## 流程可能提前结束的位置

- 代理超时 (中止)
- AbortSignal (取消)
- Gateway(网关) 断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止代理）

## 相关内容

- [工具](/zh/tools) — 可用的代理工具
- [钩子](/zh/automation/hooks) — 由代理生命周期事件触发的脚本
- [压缩](/zh/concepts/compaction) — 长对话的摘要方式
- [执行批准](/zh/tools/exec-approvals) — Shell 命令的批准关卡
- [思考](/zh/tools/thinking) — 思考/推理级别配置
