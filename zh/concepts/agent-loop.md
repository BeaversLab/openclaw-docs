---
summary: "Agent loop 生命周期、流与等待语义"
read_when:
  - 需要对 agent loop 或生命周期事件的准确解析
title: "Agent 循环"
---

# Agent Loop（OpenClaw）

Agentic loop 是一次 agent 的完整“真实”运行：接入 → 上下文组装 → 模型推理 →
工具执行 → 流式回复 → 持久化。这是一条权威路径，会把一条消息变为行动与最终回复，
同时保持会话状态一致。

在 OpenClaw 中，loop 是每个会话的单次串行运行，会在模型思考、调用工具与流式输出时
发出生命周期与流事件。本文档解释这条真实 loop 如何端到端串起来。

## 入口

- Gateway RPC：`agent` 与 `agent.wait`。
- CLI：`agent` 命令。

## 工作方式（高层）

1. `agent` RPC 校验参数，解析会话（sessionKey/sessionId），持久化会话元数据，立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行 agent：
   - 解析模型与 thinking/verbose 默认值
   - 加载技能快照
   - 调用 `runEmbeddedPiAgent`（pi-agent-core runtime）
   - 若内置 loop 未发出 **lifecycle end/error**，则补发
3. `runEmbeddedPiAgent`：
   - 通过每会话 + 全局队列进行串行化
   - 解析模型 + auth profile 并构建 pi session
   - 订阅 pi 事件并流式输出 assistant/tool 增量
   - 强制超时 -> 超时即终止
   - 返回 payloads + usage 元数据
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw 的 `agent` 流：
   - 工具事件 => `stream: "tool"`
   - assistant 增量 => `stream: "assistant"`
   - 生命周期事件 => `stream: "lifecycle"`（`phase: "start" | "end" | "error"`）
5. `agent.wait` 使用 `waitForAgentJob`：
   - 等待 `runId` 的 **lifecycle end/error**
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队 + 并发

- 按 session key（session lane）串行，必要时还会经过全局 lane。
- 防止 tool/session 竞争，并保持会话历史一致。
- 消息频道可选择队列模式（collect/steer/followup）进入 lane 系统。
  见 [命令 Queue](/zh/concepts/queue)。

## 会话 + 工作区准备

- 解析并创建工作区；sandbox 运行可能重定向到 sandbox 工作区根目录。
- 加载技能（或复用快照），并注入 env 与 prompt。
- 解析并注入 bootstrap/context 文件到 system prompt 报告。
- 获取会话写锁；在流式输出前打开并准备 `SessionManager`。

## Prompt 组装 + system prompt

- system prompt 由 OpenClaw 基础提示、技能提示、bootstrap context 与每次运行覆盖项组成。
- 强制执行模型特定限制与 compaction 预留 token。
- 参考 [System prompt](/zh/concepts/system-prompt) 了解模型看到的内容。

## Hook 点（可拦截处）

OpenClaw 有两套 hook 系统：

- **内部 hooks**（Gateway hooks）：面向命令与生命周期事件的事件驱动脚本。
- **插件 hooks**：agent/tool 生命周期与 gateway pipeline 内的扩展点。

### 内部 hooks（Gateway hooks）

- **`agent:bootstrap`**：在系统提示定稿前构建 bootstrap 文件时运行。
  可用来添加/移除 bootstrap context 文件。
- **Command hooks**：`/new`、`/reset`、`/stop` 等命令事件（见 Hooks 文档）。

见 [Hooks](/zh/hooks) 获取设置与示例。

### 插件 hooks（agent + gateway 生命周期）

这些在 agent loop 或 gateway pipeline 内运行：

- **`before_agent_start`**：在运行开始前注入上下文或覆盖 system prompt。
- **`agent_end`**：完成后检查最终消息列表与运行元数据。
- **`before_compaction` / `after_compaction`**：观察或标注 compaction 周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数/结果。
- **`tool_result_persist`**：在写入会话转录前同步转换工具结果。
- **`message_received` / `message_sending` / `message_sent`**：入站/出站消息 hooks。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：gateway 生命周期事件。

见 [插件](/zh/plugin#plugin-hooks) 了解 hook API 与注册细节。

## 流式输出 + 部分回复

- assistant 增量由 pi-agent-core 流式输出并作为 `assistant` 事件发出。
- Block streaming 可在 `text_end` 或 `message_end` 输出部分回复。
- Reasoning streaming 可作为独立流或 block 回复发出。
- 分块与 block 回复行为见 [Streaming](/zh/concepts/streaming)。

## 工具执行 + 消息工具

- 工具 start/update/end 事件在 `tool` 流中发出。
- 工具结果在记录/发送前会进行大小与图片 payload 清洗。
- 消息工具发送会被跟踪，用于抑制重复的 assistant 确认。

## 回复整形 + 抑制

- 最终 payload 由以下部分组装：
  - assistant 文本（以及可选 reasoning）
  - 内联工具摘要（verbose + 允许时）
  - 模型出错时的 assistant 错误文本
- `NO_REPLY` 被视为静默 token，会从出站 payload 中过滤。
- 消息工具重复项会从最终 payload 列表移除。
- 若无可渲染 payload 且工具出错，会发送回退的工具错误回复
  （除非消息工具已发送对用户可见的回复）。

## Compaction + 重试

- 自动 compaction 会发出 `compaction` 流事件并可能触发重试。
- 重试时会重置内存缓冲与工具摘要，避免重复输出。
- compaction 流程见 [压缩](/zh/concepts/compaction)。

## 事件流（当前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（`agentCommand` 也会兜底）。
- `assistant`：来自 pi-agent-core 的流式增量。
- `tool`：来自 pi-agent-core 的流式工具事件。

## 聊天频道处理

- assistant 增量会缓冲为 chat `delta` 消息。
- 在 **lifecycle end/error** 时发出 chat `final`。

## 超时

- `agent.wait` 默认：30s（仅等待）。`timeoutMs` 参数可覆盖。
- Agent 运行：`agents.defaults.timeoutSeconds` 默认 600s；在 `runEmbeddedPiAgent` 中由中止计时器强制执行。

## 提前结束的情况

- Agent 超时（中止）
- AbortSignal（取消）
- Gateway 断开或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止 agent）
