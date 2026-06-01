---
summary: "用于跨会话状态、召回、消息传递和子代理编排的代理工具"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect spawned sub-agent status
title: "会话工具"
---

OpenClaw 为代理提供了跨会话工作、检查状态和编排子代理的工具。

## 可用工具

| 工具               | 功能                                                      |
| ------------------ | --------------------------------------------------------- |
| `sessions_list`    | 使用可选过滤器（类型、标签、代理、最近性、预览）列出会话  |
| `sessions_history` | 读取特定会话的记录                                        |
| `sessions_send`    | 向另一个会话发送消息并可选择等待                          |
| `sessions_spawn`   | 生成一个隔离的子代理会话以进行后台工作                    |
| `sessions_yield`   | 结束当前回合并等待后续的子代理结果                        |
| `subagents`        | 列出此会话已生成的子代理状态                              |
| `session_status`   | 显示 `/status` 样式的卡片，并可选择设置每个会话的模型覆盖 |

这些工具仍受活动工具配置文件以及允许/拒绝策略的约束。`tools.profile: "coding"` 包含完整的会话编排集，包括 `sessions_spawn`、`sessions_yield` 和 `subagents`。
`tools.profile: "messaging"` 包含跨会话消息传递工具
(`sessions_list`、`sessions_history`、`sessions_send`、`session_status`)，但
不包括子代理生成。若要保留消息传递配置文件并仍然
允许原生委托，请添加：

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"],
  },
}
```

组、提供商、沙箱和每个代理的策略仍可在配置文件阶段后删除这些工具。
使用受影响会话中的 `/tools` 来检查有效工具列表。

## 列出和读取会话

`sessions_list` 返回会话及其 key、agentId、kind、渠道、模型、token计数和时间戳。可以按 kind（`main`、`group`、`cron`、`hook`、`node`）、精确的 `label`、精确的 `agentId`、搜索文本或最近程度（`activeMinutes`）进行筛选。当您需要类似邮箱的分流处理时，它还可以请求具有可见性作用域的派生标题、最后一条消息预览片段，或者每行有界的最近消息。派生标题和预览仅针对调用者在配置的会话工具可见性策略下已经可以看到的会话生成，因此不相关的会话保持隐藏。当可见性受到限制时，`sessions_list` 会返回可选的 `visibility` 元数据，显示有效模式以及结果可能受限于作用域的警告。

`sessions_history` 获取特定会话的对话记录。默认情况下，工具结果被排除在外——传递 `includeTools: true` 以查看它们。返回的视图是有意的有界且经过安全过滤的：

- 助手文本在回溯前已被规范化：
  - thinking 标签被剥离
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块被剥离
  - 纯文本工具调用 XML 载荷块，如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>` 被剥离，包括从未干净关闭的截断
    载荷
  - 降级的工具调用/结果脚手架，如 `[Tool Call: ...]`、
    `[Tool Result ...]` 和 `[Historical context ...]` 被剥离
  - 泄漏的模型控制令牌，如 `<|assistant|>`、其他 ASCII
    `<|...|>` 令牌和全角 `<｜...｜>` 变体被剥离
  - 格式错误的 MiniMax 工具调用 XML，如 MiniMax`<invoke ...>` /
    `</minimax:tool_call>` 被剥离
- 凭证/类似令牌的文本在返回前被编辑
- 长文本块被截断
- 非常大的历史记录可能会删除旧行或用
  `[sessions_history omitted: message too large]` 替换过大的行
- 该工具报告摘要标志，如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

这两个工具都接受**会话密钥**（例如 `"main"`）或**会话 ID**
（来自先前的列表调用）。

如果您需要精确的字节级逐字逐句的会话记录，请检查磁盘上的会话记录文件，
而不要将 `sessions_history` 视为原始转储。

## 发送跨会话消息

`sessions_send` 将消息传递到另一个会话，并可选择等待
响应：

- **发送后不管：**设置 `timeoutSeconds: 0` 以立即入队并
  返回。
- **等待回复：** 设置超时时间并内联获取响应。

线程范围的聊天会话（例如 Slack 或 Discord 密钥以
`:thread:<id>` 结尾）不是有效的 `sessions_send` 目标。请使用父渠道
会话密钥进行智能体间协调，以免工具路由的消息出现在
面向用户的活动线程内。

消息和 A2A 后续回复在接收提示（`[Inter-session message ... isUser=false]`）和会话记录
来源中标记为会话间数据。接收方智能体应将其视为工具路由数据，而不是
直接由最终用户编写的指令。

目标响应后，OpenClaw 可以运行**回复循环**，其中
智能体交替发送消息（最多 `session.agentToAgent.maxPingPongTurns` 次，范围
0-20，默认为 5）。目标智能体可以回复
`REPLY_SKIP` 以提前停止。

## 状态和编排辅助工具

`session_status` 是用于当前
或另一个可见会话的轻量级 `/status` 等效工具。它报告使用情况、时间、模型/运行时状态以及
链接的后台任务上下文（如果存在）。与 `/status` 类似，它可以从最新的会话记录使用条目中回填
稀疏的令牌/缓存计数器，并且
`model=default` 会清除每个会话的覆盖设置。使用 `sessionKey="current"` 来表示
调用者当前的会话；可见的客户端标签（如 `openclaw-tui`）
不是会话密钥。

`sessions_yield` 会故意结束当前轮次，以便下一条消息可以是您正在等待的后续事件。在生成子代理后使用它，当您希望完成结果作为下一条消息到达而不是构建轮询循环时。

`subagents`OpenClaw 是已生成的 OpenClaw 子代理的可见性辅助工具。它支持 `action: "list"` 以检查活动/最近的运行。

## 生成子代理

`sessions_spawn` 默认为后台任务创建隔离会话。它始终是非阻塞的——它会立即返回 `runId` 和 `childSessionKey`。原生子代理运行在子会话的第一个可见 `[Subagent Task]` 消息中接收委派的任务，而系统提示仅携带子代理运行时规则和路由上下文。

关键选项：

- `runtime: "subagent"`（默认）或 `"acp"` 用于外部代理程代理。
- `model` 和 `thinking` 覆盖子会话。
- `thread: true`DiscordSlack 将生成绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"` 对子代理强制执行沙箱隔离。
- 当子代理需要当前请求者记录时，原生子代理使用 `context: "fork"`；省略它或使用 `context: "isolated"` 以获得干净的子代理。绑定到线程的原生子代理默认为 `context: "fork"`，除非 `threadBindings.defaultSpawnContext` 另有说明。

默认的叶子子代理不会获得会话工具。当 `maxSpawnDepth >= 2` 时，深度 1 的编排器子代理还会接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们可以管理自己的子代理。叶子运行仍然不会获得递归编排工具。

完成后，一个公告步骤会将结果发布到请求者的渠道。完成交付会在可用时保留绑定的线程/主题路由，并且如果完成源仅标识一个渠道，OpenClaw 仍然可以重用请求者会话的存储路由 (`lastChannel` / `lastTo`) 进行直接投递。

有关 ACP 特定的行为，请参阅 [ACP Agents](/zh/tools/acp-agents)。

## 可见性

会话工具具有范围限制，用于限制代理可以看到的内容：

| 级别    | 范围                             |
| ------- | -------------------------------- |
| `self`  | 仅当前会话                       |
| `tree`  | 当前会话 + 生成的子代理          |
| `agent` | 该代理的所有会话                 |
| `all`   | 所有会话（如果已配置，则跨代理） |

默认值为 `tree`。沙箱隔离会话无论配置如何，都会被限制为 `tree`。

## 延伸阅读

- [会话管理](/zh/concepts/session) -- 路由、生命周期、维护
- [ACP Agents](/zh/tools/acp-agents) -- 外部 harness 生成
- [Multi-agent](/zh/concepts/multi-agent) -- 多代理架构
- [Gateway(网关) Configuration](/zh/gateway/configuration) -- 会话工具配置旋钮

## 相关

- [会话管理](/zh/concepts/session)
- [会话修剪](/zh/concepts/session-pruning)
