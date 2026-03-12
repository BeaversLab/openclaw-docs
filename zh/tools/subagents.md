---
summary: "子代理：生成孤立的代理运行，将其结果通告回请求者聊天"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
---

# 子代理

子代理是从现有代理运行生成的后台代理运行。它们在自己的会话 (`agent:<agentId>:subagent:<uuid>`) 中运行，并在完成后将其结果**通告**回请求者聊天频道。

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

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、记录路径、清理）。

### 生成行为

`/subagents spawn` 作为用户命令（而非内部中继）启动后台子代理，并在运行完成时向请求者聊天发送一条最终完成更新。

- 生成命令是非阻塞的；它立即返回一个运行 ID。
- 完成后，子代理会将摘要/结果消息通告回请求者聊天频道。
- 对于手动生成，传递是具有韧性的：
  - OpenClaw 首先尝试使用稳定的幂等密钥进行直接 `agent` 传递。
  - 如果直接传递失败，它会回退到队列路由。
  - 如果队列路由仍然不可用，通告将在最终放弃前使用短指数退避进行重试。
- 移交给请求者会话的完成上下文是运行时生成的内部上下文（非用户编写的文本），包括：
  - `Result` (`assistant` 回复文本，如果助手回复为空，则为最新的 `toolResult`)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - 紧凑的运行时/Token 统计
  - 一条交付指令，告知请求者代理以正常的助手语调重写（而不是转发原始的内部元数据）
- `--model` 和 `--thinking` 会覆盖该次运行的默认设置。
- 使用 `info`/`log` 在完成后检查详细信息和输出。
- `/subagents spawn` 是单次模式 (`mode: "run"`)。对于持久化的线程绑定会话，请使用带有 `thread: true` 和 `mode: "session"` 的 `sessions_spawn`。
- 对于 ACP harness 会话（Codex、Claude Code、Gemini CLI），请使用带有 `runtime: "acp"` 的 `sessions_spawn` 并参阅 [ACP Agents](/zh/en/tools/acp-agents)。

主要目标：

- 并行化“研究/长任务/慢工具”工作，而不阻塞主运行。
- 默认情况下保持子代理隔离（会话隔离 + 可选的沙箱化）。
- 使工具界面难以被滥用：子代理默认**不**获取会话工具。
- 支持可配置的嵌套深度，以用于编排器模式。

成本说明：每个子代理都有其**自己的**上下文和 Token 使用量。对于繁重或重复性
任务，请为子代理设置更便宜的模型，并将主代理保持在更高质量的模型上。
您可以通过 `agents.defaults.subagents.model` 或每个代理的覆盖配置来设置此项。

## 工具

使用 `sessions_spawn`：

- 启动子代理运行 (`deliver: false`, 全局通道: `subagent`)
- 然后运行公告步骤，并将公告回复发布到请求者聊天通道
- 默认模型：继承调用者，除非您设置 `agents.defaults.subagents.model` (或每个代理的 `agents.list[].subagents.model`)；显式的 `sessions_spawn.model` 仍然优先。
- 默认思考：继承调用者，除非您设置 `agents.defaults.subagents.thinking` (或每个代理的 `agents.list[].subagents.thinking`)；显式的 `sessions_spawn.thinking` 仍然优先。
- 默认运行超时：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则回退到 `0`（无超时）。

工具参数：

- `task`（必需）
- `label?`（可选）
- `agentId?`（可选；如果允许，则在另一个代理 ID 下生成）
- `model?`（可选；覆盖子代理模型；无效值将被跳过，子代理将在默认模型上运行，并在工具结果中显示警告）
- `thinking?`（可选；覆盖子代理运行的思考级别）
- `runTimeoutSeconds?`（设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`；设置后，子代理运行将在 N 秒后中止）
- `thread?`（默认 `false`；当为 `true` 时，请求此子代理会话的频道线程绑定）
- `mode?` (`run|session`)
  - 默认为 `run`
  - 如果省略了 `thread: true` 和 `mode`，默认值变为 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?` (`delete|keep`, 默认 `keep`)
- `sandbox?` (`inherit|require`, 默认 `inherit`; `require` 会拒绝生成，除非目标子运行时是沙盒化的)
- `sessions_spawn` **不**接受频道传递参数（`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`）。如需传递，请使用生成运行中的 `message`/`sessions_send`。

## 线程绑定会话

当为频道启用线程绑定时，子代理可以保持与线程的绑定，以便该线程中的后续用户消息继续路由到同一个子代理会话。

### 支持线程的频道

- Discord（目前唯一支持的频道）：支持持久化线程绑定的子代理会话（`sessions_spawn` 配合 `thread: true`），手动线程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及适配器键 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `sessions_spawn` 通过 `thread: true` 生成（可选地使用 `mode: "session"`）。
2. OpenClaw 在当前频道中创建一个线程或将其绑定到该会话目标。
3. 该线程中的回复和后续消息会路由到绑定的会话。
4. 使用 `/session idle` 检查/更新非活动自动取消聚焦，并使用 `/session max-age` 控制硬上限。
5. 使用 `/unfocus` 进行手动分离。

手动控制：

- `/focus <target>` 将当前线程（或创建一个新线程）绑定到子代理/会话目标。
- `/unfocus` 移除当前绑定线程的绑定关系。
- `/agents` 列出活跃运行和绑定状态（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 仅适用于聚焦的绑定线程。

配置开关：

- 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 频道覆盖和生成自动绑定键是特定于适配器的。请参阅上面的 **支持线程的频道**。

有关当前适配器详细信息，请参阅[配置参考](/zh/en/gateway/configuration-reference)和 [斜杠命令](/zh/en/tools/slash-commands)。

允许列表：

- `agents.list[].subagents.allowAgents`：可以通过 `agentId` 定位的代理 ID 列表（`["*"]` 表示允许任何代理）。默认值：仅请求者代理。
- 沙盒继承保护：如果请求者会话在沙盒中运行，`sessions_spawn` 将拒绝在非沙盒模式下运行的目标。

发现：

- 使用 `agents_list` 查看 `sessions_spawn` 当前允许的代理 ID。

自动归档：

- 子代理会话会在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认值：60）。
- Archive 使用 `sessions.delete` 并将脚本记录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在通告后立即归档（仍通过重命名保留脚本记录）。
- 自动归档是尽力而为的；如果网关重启，待处理的计时器将丢失。
- `runTimeoutSeconds` **不会**自动归档；它仅停止运行。会话保留直到自动归档。
- 自动归档同样适用于深度 1 和深度 2 的会话。

## 嵌套子代理

默认情况下，子代理无法生成自己的子代理 (`maxSpawnDepth: 1`)。您可以通过设置 `maxSpawnDepth: 2` 来启用一级嵌套，这允许使用 **编排器模式**：主代理 → 编排器子代理 → 工作器子子代理。

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

| 深度 | 会话密钥形状                            | 角色                                          | 能否生成？                   |
| ----- | -------------------------------------------- | --------------------------------------------- | ---------------------------- |
| 0     | `agent:<id>:main`                            | 主代理                                    | 始终                       |
| 1     | `agent:<id>:subagent:<uuid>`                 | 子代理（允许深度 2 时的编排器） | 仅当 `maxSpawnDepth >= 2` 时 |
| 2     | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶工作器）                   | 从不                        |

### 通告链

结果沿链向上回流：

1. 深度 2 工作器完成 → 向其父级（深度 1 编排器）通告
2. 深度 1 编排器接收通告，综合结果，完成 → 向主代理通告
3. 主代理接收通告并交付给用户

每个层级只能看到其直接子级的通告。

### 按深度的工具策略

- 角色和控制范围在生成时被写入会话元数据中。这可以防止扁平化或恢复的会话密钥意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）**：获取 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便管理其子级。其他会话/系统工具保持拒绝状态。
- **深度 1（叶节点，当 `maxSpawnDepth == 1` 时）**：无会话工具（当前默认行为）。
- **深度 2（叶节点工作器）**：无会话工具 —— `sessions_spawn` 在深度 2 始终被拒绝。无法生成更多子级。

### 每个代理的生成限制

每个代理会话（在任何深度）一次最多可以有 `maxChildrenPerAgent`（默认：5）个活动子级。这可以防止单个编排器出现失控的扇出。

### 级联停止

停止深度 1 的编排器会自动停止其所有深度 2 的子级：

- 主聊天中的 `/stop` 会停止所有深度 1 的代理并级联至其深度 2 的子级。
- `/subagents kill <id>` 会停止特定的子代理并级联至其子级。
- `/subagents kill all` 会停止请求者的所有子代理并级联。

## 身份验证

子代理的身份验证由 **代理 ID** 解析，而不是由会话类型解析：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 身份验证存储从该代理的 `agentDir` 加载。
- 主代理的身份验证配置文件作为 **后备** 合并进去；发生冲突时，代理配置文件覆盖主配置文件。

注意：合并是相加的，因此主配置文件始终可用作后备。尚不支持每个代理完全隔离的身份验证。

## 公告

子代理通过公告步骤进行回复：

- 公告步骤在子代理会话内运行（而非请求者会话）。
- 如果子代理准确回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 否则，传递取决于请求者深度：
  - 顶层请求者会话使用带有外部传递（`deliver=true`）的后续 `agent` 调用
  - 嵌套请求者子代理会话接收内部后续注入（`deliver=false`），以便编排器可以在会话内综合子结果
  - 如果嵌套请求者子代理会话已消失，OpenClaw 将回退到该会话的请求者（如果可用）
- 在构建嵌套完成结果时，子完成聚合仅限于当前请求者运行，以防止陈旧的先前运行子输出泄漏到当前公告中。
- 当通道适配器支持时，公告回复会保留线程/主题路由。
- 公告上下文被标准化为稳定的内部事件块：
  - 源（`subagent` 或 `cron`）
  - 子会话密钥/ID
  - 公告类型 + 任务标签
  - 源自运行结果的状态行（`success`、`error`、`timeout` 或 `unknown`）
  - 来自公告步骤的结果内容（如果缺失则为 `(no output)`）
  - 描述何时回复与保持静默的后续指令
- `Status` 不是从模型输出推断出来的；它来自运行结果信号。

公告负载在末尾包含一个统计行（即使在包装时）：

- 运行时（例如 `runtime 5m12s`）
- Token 使用量（输入/输出/总计）
- 配置模型定价时的估算成本（`models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 和转录本路径（以便主代理可以通过 `sessions_history` 获取历史记录或检查磁盘上的文件）
- 内部元数据仅用于编排；面向用户的回复应以正常的助手语气重写。

## 工具策略（子代理工具）

默认情况下，子代理获得除会话工具和系统工具之外的所有工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

当 `maxSpawnDepth >= 2` 时，深度为 1 的编排器子代理还会接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理其子代理。

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

子代理使用专用的进程内队列通道：

- 通道名称：`subagent`
- 并发数：`agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话并停止由其生成的任何活动的子代理运行，并级联到嵌套的子代理。
- `/subagents kill <id>` 停止特定的子代理并级联到其子代理。

## 限制

- 子代理公告是**尽力而为**的。如果网关重启，待处理的“公告回传”工作将丢失。
- 子代理仍然共享相同的网关进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它会立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` + `TOOLS.md`（不注入 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。大多数用例建议深度为 2。
- `maxChildrenPerAgent` 限制每个会话的活动子代理数量（默认：5，范围：1–20）。
