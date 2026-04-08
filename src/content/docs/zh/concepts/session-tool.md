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

| 工具               | 功能                                                      |
| ------------------ | --------------------------------------------------------- |
| `sessions_list`    | 使用可选过滤器（种类、最近时间）列出会话                  |
| `sessions_history` | 读取特定会话的记录                                        |
| `sessions_send`    | 向另一个会话发送消息并可选择等待                          |
| `sessions_spawn`   | 为后台任务生成一个隔离的子代理会话                        |
| `sessions_yield`   | 结束当前轮次并等待后续子代理的结果                        |
| `subagents`        | 列出、引导或终止为此会话生成的子代理                      |
| `session_status`   | 显示 `/status` 风格的卡片，并可选择设置每个会话的模型覆盖 |

## 列出和读取会话

`sessions_list` 返回会话及其键、种类、渠道、模型、令牌计数和时间戳。可按种类（`main`、`group`、`cron`、`hook` 或 `node`）或最近程度（`activeMinutes`）进行筛选。

`sessions_history` 获取特定会话的对话记录。默认情况下，工具结果被排除在外——传递 `includeTools: true` 以查看它们。返回的视图是有意限制的并经过安全过滤：

- 助手文本在召回前被标准化：
  - 思考标签被剥离
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块被剥离
  - 纯文本工具调用 XML 载荷块（例如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>`）被剥离，包括从未干净关闭的截断
    载荷
  - 降级的工具调用/结果脚手架（例如 `[Tool Call: ...]`、
    `[Tool Result ...]` 和 `[Historical context ...]`）被剥离
  - 泄露的模型控制令牌（例如 `<|assistant|>`、其他 ASCII
    `<|...|>` 令牌和全角 `<｜...｜>` 变体）被剥离
  - 格式错误的 MiniMax 工具调用 XML（例如 `<invoke ...>` /
    `</minimax:tool_call>`）被剥离
- 凭证/令牌类文本在返回前被编辑
- 长文本块被截断
- 非常大的历史记录可能会丢弃旧行，或者用一个超大的行替换
  `[sessions_history omitted: message too large]`
- 该工具会报告摘要标志，例如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

这两个工具都接受 **会话密钥**（例如 `"main"`）或 **会话 ID**（来自之前的列表调用）。

如果您需要精确的字节级逐字记录，请检查磁盘上的记录文件，而不是将 `sessions_history` 视为原始转储。

## 发送跨会话消息

`sessions_send` 将消息传递给另一个会话，并可选择等待响应：

- **即发即弃：** 设置 `timeoutSeconds: 0` 以立即排队并返回。
- **等待回复：** 设置超时时间并直接获取响应。

目标响应后，OpenClaw 可以运行 **回复循环**，让代理交替发送消息（最多 5 轮）。目标代理可以回复 `REPLY_SKIP` 以提前停止。

## 状态和编排助手

`session_status` 是用于当前或另一个可见会话的轻量级 `/status` 等效工具。它报告使用情况、时间、模型/运行时状态以及链接的后台任务上下文（如果存在）。与 `/status` 一样，它可以从最新的记录使用条目中回填稀疏的令牌/缓存计数器，而 `model=default` 会清除每会话覆盖。

`sessions_yield` 有意结束当前回合，以便下一条消息可以是您正在等待的后续事件。在生成子代理后使用它，当您希望完成结果作为下一条消息到达而不是构建轮询循环时。

`subagents` 是已生成的 OpenClaw 子代理的控制平面助手。它支持：

- `action: "list"` 以检查活动/最近的运行
- `action: "steer"` 向正在运行的子代理发送后续指导
- `action: "kill"` 以停止一个子代理或 `all`

## 生成子代理

`sessions_spawn` 为后台任务创建一个隔离的会话。它始终是非阻塞的 —— 会立即返回一个 `runId` 和 `childSessionKey`。

关键选项：

- 用于外部代理（harness）代理的 `runtime: "subagent"`（默认）或 `"acp"`。
- 子会话的 `model` 和 `thinking` 覆盖设置。
- `thread: true` 将生成的子代理绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"` 用于对子代理强制执行沙箱隔离。

默认的叶子子代理不会获得会话工具。当设置 `maxSpawnDepth >= 2` 时，深度为 1 的编排子代理还会额外获得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理自己的子代。叶子运行仍然不会获得递归的编排工具。

完成后，一个公告步骤会将结果发布到请求者的渠道。完成交付在可用时会保留绑定的线程/主题路由，如果完成来源仅标识了一个渠道，OpenClaw 仍然可以重用请求者会话存储的路由（`lastChannel` / `lastTo`）进行直接投递。

有关 ACP 特定的行为，请参阅 [ACP Agents](/en/tools/acp-agents)。

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

- [会话管理](/en/concepts/session) -- 路由、生命周期、维护
- [ACP Agents](/en/tools/acp-agents) -- 外部代理生成
- [多代理](/en/concepts/multi-agent) -- 多代理架构
- [Gateway(网关) 配置](/en/gateway/configuration) -- 会话工具配置旋钮
