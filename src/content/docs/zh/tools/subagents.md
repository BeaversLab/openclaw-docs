---
summary: "子代理：生成向请求者聊天频道通告结果的独立代理运行"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
---

# 子代理

子代理是从现有代理运行中生成的后台代理运行。它们在自己的会话（`agent:<agentId>:subagent:<uuid>`）中运行，并在完成后将结果**通知**回请求者聊天渠道。每个子代理运行都被跟踪为一个[后台任务](/zh/automation/tasks)。

## 斜杠命令

使用 `/subagents` 来检查或控制**当前会话**的子代理运行：

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

线程绑定控制：

这些命令适用于支持持久线程绑定的频道。请参阅下面的**支持线程的频道**。

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、转录路径、清理）。
使用 `sessions_history` 获取有界的、经过安全过滤的召回视图；当您需要原始完整转录时，请检查磁盘上的转录路径。

### 生成行为

`/subagents spawn` 作为用户命令（而非内部中继）启动后台子代理，并在运行完成时向请求者聊天发送一个最终完成更新。

- 生成命令是非阻塞的；它立即返回一个运行 ID。
- 完成后，子代理会将摘要/结果消息通告回请求者聊天频道。
- 完成是推送式的。一旦生成，不要在循环中轮询 `/subagents list`、
  `sessions_list` 或 `sessions_history` 以等待其
  完成；仅在按需调试或干预时检查状态。
- 完成后，OpenClaw 会尽力关闭由该子代理会话打开的被跟踪的浏览器选项卡/进程，然后再继续通知清理流程。
- 对于手动生成，传递具有弹性：
  - OpenClaw 首先尝试使用稳定的幂等密钥进行直接 `agent` 传递。
  - 如果直接传递失败，它将回退到队列路由。
  - 如果队列路由仍然不可用，则在最终放弃之前，通知将使用短指数退避进行重试。
- 完成传递保留解析后的请求者路由：
  - 线程绑定或对话绑定的完成路由在可用时优先
  - 如果完成源仅提供渠道，OpenClaw 会从请求者会话的解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填充缺失的目标/账户，以便直接传递仍然有效
- 向请求者会话的完成传递是运行时生成的内部上下文（非用户编写的文本），包括：
  - `Result`（最新的可见 `assistant` 回复文本，否则为经过清理的最新工具/工具结果文本；终端失败运行不会重复使用捕获的回复文本）
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - 紧凑的运行时/Token 统计信息
  - 一条交付指令，告诉请求代理以正常的助手口吻重写（而不是转发原始的内部元数据）
- `--model` 和 `--thinking` 会覆盖该特定运行的默认设置。
- 使用 `info`/`log` 在完成后检查详细信息和输出。
- `/subagents spawn` 是一次性模式 (`mode: "run"`)。对于持久化的线程绑定会话，请将 `sessions_spawn` 与 `thread: true` 和 `mode: "session"` 结合使用。
- 对于 ACP 线程会话（Codex、Claude Code、Gemini CLI），请将 `sessions_spawn` 与 `runtime: "acp"` 结合使用，并参阅 [ACP 代理](/zh/tools/acp-agents)，特别是在调试补全或代理对代理循环时参阅 [ACP 交付模型](/zh/tools/acp-agents#delivery-model)。

主要目标：

- 并行化“研究/长任务/慢速工具”工作，而不阻塞主运行。
- 默认情况下保持子代理隔离（会话分离 + 可选的沙箱隔离）。
- 保持工具接口难以被滥用：子代理默认**不**获取会话工具。
- 支持可配置的嵌套深度，以实现编排器模式。

成本说明：每个子代理都有其**自己的**上下文和 Token 使用量。对于繁重或重复性任务，请为子代理设置更便宜的模型，并将主代理保持在更高质量的模型上。您可以通过 `agents.defaults.subagents.model` 或按代理覆盖来配置此设置。

## 工具

使用 `sessions_spawn`：

- 启动子代理运行 (`deliver: false`，全局通道：`subagent`)
- 然后运行一个公告步骤，并将公告回复发布到请求聊天渠道
- 默认模型：继承调用者，除非您设置了 `agents.defaults.subagents.model`（或按代理 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 仍然优先。
- 默认思考：继承调用者，除非您设置了 `agents.defaults.subagents.thinking`（或按代理 `agents.list[].subagents.thinking`）；显式的 `sessions_spawn.thinking` 仍然优先。
- 默认运行超时：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 将在设置了 `agents.defaults.subagents.runTimeoutSeconds` 时使用它；否则回退到 `0`（无超时）。

工具参数：

- `task`（必需）
- `label?`（可选）
- `agentId?`（可选；如果允许，则在另一个代理 ID 下生成）
- `model?`（可选；覆盖子代理模型；无效值将被跳过，子代理将在默认模型上运行，并在工具结果中显示警告）
- `thinking?`（可选；覆盖子代理运行的思考级别）
- `runTimeoutSeconds?`（设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`；设置后，子代理运行将在 N 秒后中止）
- `thread?`（默认 `false`；当为 `true` 时，请求为此子代理会话绑定渠道线程）
- `mode?`（`run|session`）
  - 默认为 `run`
  - 如果省略了 `thread: true` 和 `mode`，默认值将变为 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?`（`delete|keep`，默认 `keep`）
- `sandbox?`（`inherit|require`，默认 `inherit`；`require` 拒绝生成，除非目标子运行时是沙箱隔离的）
- `sessions_spawn` **不**接受渠道传递参数（`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`）。如需传递，请使用生成运行中的 `message`/`sessions_send`。

## 线程绑定会话

当为渠道启用线程绑定时，子代理可以保持与线程的绑定，以便该线程中的后续用户消息继续路由到同一个子代理会话。

### 支持线程的渠道

- Discord（目前唯一支持的渠道）：支持持久的线程绑定子代理会话（`sessions_spawn` 带有 `thread: true`）、手动线程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）以及适配器密钥 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `sessions_spawn` 并通过 `thread: true`（以及可选的 `mode: "session"`）来生成。
2. OpenClaw 在当前渠道中为该会话目标创建或绑定一个线程。
3. 该线程中的回复和后续消息会路由到绑定的会话。
4. 使用 `/session idle` 检查/更新非活动自动取消聚焦，并使用 `/session max-age` 控制硬性上限。
5. 使用 `/unfocus` 手动分离。

手动控制：

- `/focus <target>` 将当前线程（或创建一个新线程）绑定到子代理/会话目标。
- `/unfocus` 移除当前绑定线程的绑定关系。
- `/agents` 列出活动的运行和绑定状态（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 仅适用于聚焦的绑定线程。

配置开关：

- 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 渠道覆盖和生成自动绑定键是特定于适配器的。请参阅上方的**支持线程的渠道**。

有关当前适配器的详细信息，请参阅[配置参考](/zh/gateway/configuration-reference)和[斜杠命令](/zh/tools/slash-commands)。

允许列表：

- `agents.list[].subagents.allowAgents`：可以通过 `agentId` 指定的代理 ID 列表（`["*"]` 表示允许任意代理）。默认值：仅限请求者代理。
- `agents.defaults.subagents.allowAgents`：当请求者代理未设置其自己的 `subagents.allowAgents` 时使用的默认目标代理允许列表。
- 沙箱继承保护：如果请求者会话处于沙箱隔离状态，`sessions_spawn` 将拒绝以非沙箱隔离方式运行的目标。
- `agents.defaults.subagents.requireAgentId` / `agents.list[].subagents.requireAgentId`：如果为 true，则阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件）。默认值：false。

设备发现：

- 使用 `agents_list` 查看当前允许哪些代理 ID 用于 `sessions_spawn`。

自动归档：

- 子代理会话将在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认值：60）。
- 归档操作使用 `sessions.delete` 并将文字记录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在宣布后立即归档（仍通过重命名保留文字记录）。
- 自动归档是尽力而为的；如果网关重启，待处理的计时器将丢失。
- `runTimeoutSeconds` **不会**自动归档；它只是停止运行。该会话将一直保留直到自动归档。
- 自动归档同等地应用于深度 1 和深度 2 的会话。
- 浏览器清理与归档清理是分开的：当运行完成时，被跟踪的浏览器选项卡/进程会被尽力关闭，即使文字记录/会话记录被保留。

## 嵌套子代理

默认情况下，子代理无法生成自己的子代理（`maxSpawnDepth: 1`）。您可以通过设置 `maxSpawnDepth: 2` 来启用一级嵌套，这允许**编排器模式**：主代理 → 编排器子代理 → 工作子子代理。

### 如何启用

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
      },
    },
  },
}
```

### 深度级别

| 深度 | 会话键结构                                   | 角色                            | 能否生成？                |
| ---- | -------------------------------------------- | ------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                          | 始终                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（允许深度 2 时为编排器） | 仅当 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶节点工作器）        | 从不                      |

### 宣布链

结果沿链向上传递：

1. 深度 2 工作器完成 → 向其父级（深度 1 编排器）宣布
2. 深度 1 编排器接收通告，综合结果，完成 → 向主代理通告
3. 主代理接收通告并交付给用户

每个层级只能看到其直接子级的通告。

操作指南：

- 启动子任务一次并等待完成事件，而不是围绕 `sessions_list`、`sessions_history`、`/subagents list` 或 `exec` sleep 命令构建轮询循环。
- 如果在您已经发送最终答案后子任务完成事件到达，正确的后续操作是精确的静默令牌 `NO_REPLY` / `no_reply`。

### 按深度划分的工具策略

- 角色和控制范围在生成时写入会话元数据。这可以防止扁平化或恢复的会话密钥意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）**：获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以管理其子级。其他会话/系统工具仍然被拒绝。
- **深度 1（叶节点，当 `maxSpawnDepth == 1` 时）**：没有会话工具（当前的默认行为）。
- **深度 2（叶节点工作线程）**：没有会话工具 —— `sessions_spawn` 在深度 2 处始终被拒绝。无法生成更多子级。

### 每个代理的生成限制

每个代理会话（在任何深度）一次最多可以有 `maxChildrenPerAgent`（默认：5）个活动子级。这可以防止来自单个编排器的失控扇出。

### 级联停止

停止深度 1 编排器会自动停止其所有深度 2 子级：

- 主聊天中的 `/stop` 停止所有深度 1 代理并级联到其深度 2 子级。
- `/subagents kill <id>` 停止特定的子代理并级联到其子级。
- `/subagents kill all` 停止请求者的所有子代理并进行级联。

## 身份验证

子代理身份验证由 **代理 ID** 解析，而不是由会话类型解析：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 身份验证存储是从该代理的 `agentDir` 加载的。
- 主代理的授权配置文件作为**备用**合并进来；代理配置文件在冲突时覆盖主配置文件。

注意：合并是累加的，因此主配置文件始终可用作备用。每个代理完全隔离的授权目前尚不支持。

## 公告

子代理通过公告步骤报告结果：

- 公告步骤在子代理会话内运行（而非请求者会话）。
- 如果子代理完全回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新的助手文本是完全的静默令牌 `NO_REPLY` / `no_reply`，
  即使之前存在可见进度，也会抑制公告输出。
- 否则传递取决于请求者深度：
  - 顶级请求者会话使用后续 `agent` 调用进行外部传递 (`deliver=true`)
  - 嵌套请求者子代理会话接收内部后续注入 (`deliver=false`)，以便编排器可以在会话内合成子结果
  - 如果嵌套的请求者子代理会话已消失，OpenClaw 会在可用时回退到该会话的请求者
- 对于顶级请求者会话，完成模式直接传递首先解析任何绑定的对话/线程路由和钩子覆盖，然后从请求者会话的存储路由中填充缺失的渠道目标字段。这可以确保完成结果保持在正确的聊天/主题上，即使完成源仅标识了渠道。
- 子完成聚合在构建嵌套完成发现时作用于当前请求者运行，从而防止过时的先前运行子输出泄漏到当前公告中。
- 公告回复在渠道适配器上可用时会保留线程/主题路由。
- 公告上下文被规范化为稳定的内部事件块：
  - 源 (`subagent` 或 `cron`)
  - 子会话密钥/ID
  - 公告类型 + 任务标签
  - 从运行结果派生的状态行 (`success`, `error`, `timeout`, 或 `unknown`)
  - 从最新的可见助手文本中选择的结果内容，否则为经过清理的最新工具/工具结果文本；终端失败运行报告失败状态，而不重播捕获的回复文本
  - 一条后续指令，描述何时回复以及何时保持静默
- `Status` 不是从模型输出推断出来的；它来自运行时结果信号。
- 超时时，如果子代仅完成了工具调用，announce 可以将那段历史折叠为一个简短的部分进度摘要，而不是重播原始工具输出。

Announce 负载在末尾包含一个统计行（即使被换行）：

- 运行时（例如 `runtime 5m12s`）
- Token 使用量（输入/输出/总计）
- 配置了模型定价时的估算成本（`models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 和副本路径（以便主代理可以通过 `sessions_history` 获取历史记录或在磁盘上检查文件）
- 内部元数据仅供编排使用；面向用户的回复应以正常的助手语气重写。

`sessions_history` 是更安全的编排路径：

- 首先对助手回溯进行规范化：
  - thinking 标签被剥离
  - `<relevant-memories>` / `<relevant_memories>` 脚手架块被剥离
  - 纯文本工具调用 XML 负载块，例如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>` 被剥离，包括未正确
    闭合的截断负载
  - 降级的工具调用/结果脚手架和历史上下文标记被剥离
  - 泄露的模型控制令牌（如 `<|assistant|>`）、其他 ASCII
    `<|...|>` 令牌以及全角 `<｜...｜>` 变体被剥离
  - 格式错误的 MiniMax 工具调用 XML 被剥离
- 凭证/令牌类文本被编辑
- 长块可能会被截断
- 非常大的历史记录可能会丢弃旧行或将超大的行替换为
  `[sessions_history omitted: message too large]`
- 当您需要完整的逐字节副本时，原始磁盘副本检查是后备方案

## 工具策略（子代理工具）

默认情况下，子代理获得除会话工具和系统工具之外的**所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在这里仍然是一个受限制的、经过净化的回顾视图；它不是原始记录的转储。

当 `maxSpawnDepth >= 2` 时，深度为 1 的编排器子代理还会额外接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理其子级。

通过配置覆盖：

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

## 并发

子代理使用一个专用的进程内队列通道：

- 通道名称：`subagent`
- 并发数：`agents.defaults.subagents.maxConcurrent`（默认为 `8`）

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话并停止由其产生的任何活动的子代理运行，并级联到嵌套的子级。
- `/subagents kill <id>` 会停止特定的子代理并级联到其子级。

## 限制

- 子代理的宣告是 **尽力而为** 的。如果网关重启，待处理的“宣告返回”工作将丢失。
- 子代理仍然共享相同的网关进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它会立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` + `TOOLS.md`（不包括 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，建议深度为 2。
- `maxChildrenPerAgent` 限制了每个会话的活动子级数量（默认：5，范围：1–20）。
