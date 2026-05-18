---
summary: "用于跨会话状态、召回、消息传递和子代理编排的代理工具"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect status or control spawned sub-agents
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
| `subagents`        | 列出、引导或终止为此会话生成的子代理                      |
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

`sessions_list` 返回会话及其 key、agentId、kind、渠道、模型、
token 计数和时间戳。按 kind (`main`, `group`, `cron`, `hook`,
`node`)、精确 `label`、精确 `agentId`、搜索文本或最近性
(`activeMinutes`) 进行筛选。当您需要类似邮箱的整理功能时，它还可以请求
具有可见性范围的派生标题、最后一条消息预览片段，或每行有限数量的
最近消息。派生标题和预览仅针对调用者在配置的会话工具
可见性策略下已经可以看到的会话生成，因此不相关的会话保持隐藏。

`sessions_history` 获取特定会话的对话记录。
默认情况下，工具结果被排除在外 -- 传递 `includeTools: true` 以查看它们。
返回的视图是有意限制的且经过安全过滤：

- 助手文本在回溯前已被规范化：
  - thinking 标签被剥离
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块被剥离
  - 纯文本工具调用 XML 负载块（例如 `<tool_call>...</tool_call>`,
    `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, 和
    `<function_calls>...</function_calls>`）被剥离，包括
    从未干净关闭的被截断负载
  - 降级的工具调用/结果脚手架（例如 `[Tool Call: ...]`,
    `[Tool Result ...]`, 和 `[Historical context ...]`）被剥离
  - 泄露的模型控制令牌（例如 `<|assistant|>`）、其他 ASCII
    `<|...|>` 令牌和全角 `<｜...｜>` 变体被剥离
  - 格式错误的 MiniMax 工具调用 XML（例如 `<invoke ...>` /
    `</minimax:tool_call>`）被剥离
- 凭证/类似令牌的文本在返回前被编辑
- 长文本块被截断
- 非常大的历史记录可以删除旧行或将超大的行替换为
  `[sessions_history omitted: message too large]`
- 该工具会报告摘要标志，例如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

这两种工具都接受 **会话密钥**（如 `"main"`）或来自先前列表调用的 **会话 ID**。

如果您需要精确的字节级逐字记录，请检查磁盘上的记录文件，而不是将 `sessions_history` 视为原始转储。

## 发送跨会话消息

`sessions_send` 向另一个会话传递消息，并可选择等待响应：

- **即发即弃：** 设置 `timeoutSeconds: 0` 以立即排队并返回。
- **等待回复：** 设置超时时间并内联获取响应。

线程范围的聊天会话（例如以 `:thread:<id>` 结尾的 Slack 或 Discord 密钥）不是有效的 `sessions_send` 目标。请使用父渠道会话密钥进行代理间协调，以免通过工具路由的消息出现在活跃的面向人类的线程中。

消息和 A2A 后续回复在接收提示（`[Inter-session message ... isUser=false]`）和记录踪来源中都被标记为会话间数据。接收代理应将它们视为通过工具路由的数据，而不是直接由最终用户编写的指令。

目标响应后，OpenClaw 可以运行一个 **回复循环**，其中
代理交替发送消息（最多 `session.agentToAgent.maxPingPongTurns` 次，范围
0-20，默认为 5）。目标代理可以回复
`REPLY_SKIP` 以提前停止。

## 状态和编排辅助工具

`session_status` 是针对当前
或另一个可见会话的轻量级 `/status` 等效工具。它会报告使用情况、时间、模型/运行时状态以及
关联的后台任务上下文（如果存在）。与 `/status` 类似，它可以从最新的脚本使用记录中回填
稀疏的令牌/缓存计数器，而
`model=default` 则清除每个会话的覆盖设置。使用 `sessionKey="current"` 来获取
调用方当前会话的信息；可见的客户端标签（如 `openclaw-tui`）
不是会话键。

`sessions_yield` 有意结束当前轮次，以便下一条消息可以是您正在等待的后续事件。在生成子代理后使用它，当您希望完成结果作为下一条消息到达，而不是构建轮询循环时。

`subagents` 是已生成的 OpenClaw 子代理的控制平面辅助工具。它支持：

- `action: "list"` 用于检查活动/最近的运行
- `action: "steer"` 用于向正在运行的子代理发送后续指导
- `action: "kill"` 用于停止一个子代理或 `all`

## 生成子代理

`sessions_spawn` 默认为后台任务创建一个隔离会话。
它始终是非阻塞的——它立即返回一个 `runId` 和
`childSessionKey`。原生子代理运行在子会话的第一个可见 `[Subagent Task]` 消息中接收委派的任务，而系统提示仅包含子代理运行时规则和路由上下文。

关键选项：

- `runtime: "subagent"`（默认）或 `"acp"` 用于外部代理工具。
- 子会话的 `model` 和 `thinking` 覆盖。
- `thread: true` 将生成绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"` 对子会话强制执行沙箱隔离。
- 当子会话需要当前请求者记录时，原生子代理使用 `context: "fork"`；省略它或使用 `context: "isolated"` 以获得一个干净的子会话。
  线程绑定的原生子代理默认为 `context: "fork"`，除非
  `threadBindings.defaultSpawnContext` 另有说明。

默认的叶子子代理不会获取会话工具。当
`maxSpawnDepth >= 2` 时，深度为 1 的编排器子代理还会接收
`sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们
可以管理自己的子级。叶子运行仍然不会获取递归
编排工具。

完成后，一个通知步骤会将结果发布到请求者的渠道。
完成交付在可用时保留绑定的线程/主题路由，如果
完成源仅标识一个渠道，OpenClaw 仍可重用
请求者会话的存储路由（`lastChannel` / `lastTo`）进行直接
交付。

有关 ACP 特定的行为，请参阅 [ACP 代理](/zh/tools/acp-agents)。

## 可见性

会话工具具有作用域，以限制代理可以看到的内容：

| 级别    | 范围                             |
| ------- | -------------------------------- |
| `self`  | 仅当前会话                       |
| `tree`  | 当前会话 + 生成的子代理          |
| `agent` | 此代理的所有会话                 |
| `all`   | 所有会话（如果已配置，则跨代理） |

默认值为 `tree`。沙箱隔离的会话无论如何配置都将被限制为 `tree`。

## 延伸阅读

- [会话管理](/zh/concepts/session) —— 路由、生命周期、维护
- [ACP Agents](/zh/tools/acp-agents) —— 外部适配器生成
- [Multi-agent](/zh/concepts/multi-agent) —— 多智能体架构
- [Gateway Configuration](<Gateway(网关)/en/gateway/configuration>) —— 会话工具配置选项

## 相关

- [Session management](/zh/concepts/session)
- [Session pruning](/zh/concepts/session-pruning)
