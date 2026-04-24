---
summary: "用于跨会话状态、召回、消息传递和子代理编排的代理工具"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect status or control spawned sub-agents
title: "会话工具"
---

# 会话工具

OpenClaw 为代理提供了跨会话工作、检查状态和编排子代理的工具。

## 可用工具

| 工具               | 功能                                                         |
| ------------------ | ------------------------------------------------------------ |
| `sessions_list`    | 列出带有可选筛选器（种类、标签、代理、最近时间、预览）的会话 |
| `sessions_history` | 读取特定会话的记录                                           |
| `sessions_send`    | 向另一个会话发送消息并可选择等待                             |
| `sessions_spawn`   | 为后台任务生成一个隔离的子代理会话                           |
| `sessions_yield`   | 结束当前轮次并等待后续子代理的结果                           |
| `subagents`        | 列出、引导或终止为此会话生成的子代理                         |
| `session_status`   | 显示 `/status` 风格的卡片，并可选择设置每个会话的模型覆盖    |

## 列出和读取会话

`sessions_list` 返回会话的 key、agentId、种类、渠道、模型、token 计数和时间戳。按种类（`main`、`group`、`cron`、`hook`、`node`）、确切的 `label`、确切的 `agentId`、搜索文本或最近时间（`activeMinutes`）进行筛选。当您需要邮件箱风格的分诊时，它还可以请求可见性范围的派生标题、最后消息预览片段，或每行有界最近消息。派生标题和预览仅为调用者在配置的会话工具可见性策略下已可见的会话生成，因此不相关的会话保持隐藏。

`sessions_history` 获取特定会话的对话记录。
默认情况下，工具结果被排除在外 -- 传递 `includeTools: true` 以查看它们。
返回的视图是经过有意限制和安全过滤的：

- 助手文本在召回前被标准化：
  - 思考标签被剥离
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块被剥离
  - 纯文本工具调用 XML 负载块，例如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>` 被剥离，包括从未干净闭合的
    截断负载
  - 降级的工具调用/结果脚手架，例如 `[Tool Call: ...]`、
    `[Tool Result ...]` 和 `[Historical context ...]` 被剥离
  - 泄露的模型控制标记（如 `<|assistant|>`）、其他 ASCII
    `<|...|>` 标记以及全角 `<｜...｜>` 变体都会被剥离
  - 格式错误的 MiniMax 工具调用 XML，例如 `<invoke ...>` /
    `</minimax:tool_call>`，会被剥离
- 凭证/令牌类文本在返回前被编辑
- 长文本块被截断
- 非常大的历史记录可能会丢弃旧行，或者用
  `[sessions_history omitted: message too large]` 替换过大的行
- 该工具会报告摘要标记，例如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

这两种工具都接受 **会话 key**（会话密钥，例如 `"main"`）或来自先前列表调用的 **会话 ID**（会话 ID）。

如果您需要精确的字节级逐字记录，请检查磁盘上的记录文件，而不是将 `sessions_history` 视为原始转储。

## 发送跨会话消息

`sessions_send` 将消息传递给另一个会话，并可选择等待响应：

- **即发即弃（Fire-and-forget）：** 设置 `timeoutSeconds: 0` 以入队并立即返回。
- **等待回复：** 设置超时时间并直接获取响应。

目标响应后，OpenClaw 可以运行一个**回复循环（reply-back loop）**，其中代理交替发送消息（最多 5 个回合）。目标代理可以回复 `REPLY_SKIP` 以提前停止。

## 状态和编排助手

`session_status` 是针对当前
或另一个可见会话的轻量级 `/status` 等效工具。它报告使用情况、时间、模型/运行时状态，
并在存在时报告链接的后台任务上下文。与 `/status` 一样，它可以从最新的记录使用条目中回填
稀疏的令牌/缓存计数器，并且
`model=default` 清除每会话覆盖。

`sessions_yield` 故意结束当前轮次，以便下一条消息可以是
您正在等待的后续事件。在生成子代理后使用它，当
您希望完成结果作为下一条消息到达而不是构建
轮询循环时。

`subagents` 是已生成的 OpenClaw
子代理的控制平面助手。它支持：

- `action: "list"` 检查活动/最近的运行
- `action: "steer"` 向正在运行的子级发送后续指导
- `action: "kill"` 停止一个子级或 `all`

## 生成子代理

`sessions_spawn` 为后台任务创建一个隔离会话。它总是非阻塞的——它立即返回一个 `runId` 和 `childSessionKey`。

关键选项：

- `runtime: "subagent"`（默认）或 `"acp"` 用于外部代理。
- `model` 和 `thinking` 覆盖子会话的设置。
- `thread: true` 将生成的子级绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"` 对子级强制执行沙箱隔离。

默认的叶子子代理不会获得会话工具。当
`maxSpawnDepth >= 2` 时，深度为 1 的编排器子代理还会额外接收
`sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们
能够管理自己的子级。叶子运行仍然不会获得递归的
编排工具。

完成后，一个公告步骤会将结果发布到请求者的渠道。
完成交付会在可用时保留绑定的线程/主题路由，并且如果
完成来源仅标识了一个渠道，OpenClaw 仍然可以重用
请求者会话的存储路由（`lastChannel` / `lastTo`）来进行直接
交付。

有关 ACP 特定的行为，请参阅 [ACP Agents](/zh/tools/acp-agents)。

## 可见性

会话工具具有作用域，用于限制代理可以看到的内容：

| 级别    | 作用域                               |
| ------- | ------------------------------------ |
| `self`  | 仅当前会话                           |
| `tree`  | 当前会话 + 生成的子代理              |
| `agent` | 该代理的所有会话                     |
| `all`   | 所有会话（如果已配置，则包括跨代理） |

默认为 `tree`。沙箱隔离的会话无论配置如何，都会被限制为 `tree`。

## 延伸阅读

- [会话管理](/zh/concepts/session) -- 路由、生命周期、维护
- [ACP 代理](/zh/tools/acp-agents) -- 外部工具生成
- [多代理](/zh/concepts/multi-agent) -- 多代理架构
- [Gateway(网关) 配置](/zh/gateway/configuration) -- 会话工具配置旋钮
