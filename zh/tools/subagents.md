---
summary: "Sub-agents: 生成将结果公布回请求者聊天的独立代理运行"
read_when:
  - 您希望通过代理进行后台/并行工作
  - 您正在更改 sessions_spawn 或子代理工具策略
  - 您正在实现或排查线程绑定子代理会话
title: "Sub-Agents"
---

# 子代理

子代理是从现有代理运行生成的后台代理运行。它们在自己的会话 (`agent:<agentId>:subagent:<uuid>`) 中运行，并在完成后将其结果**公布**回请求者聊天渠道。

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

这些命令适用于支持持久线程绑定的渠道。请参阅下面的**线程支持渠道**。

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、脚本路径、清理）。

### 生成行为

`/subagents spawn` 作为用户命令启动后台子代理，而不是内部中继，并在运行完成时向请求者聊天发送一条最终的完成更新。

- 生成命令是非阻塞的；它立即返回运行 ID。
- 完成后，子代理会将摘要/结果消息公布回请求者聊天渠道。
- 对于手动生成，传递具有弹性：
  - OpenClaw 首先尝试使用稳定的幂等密钥进行直接 `agent` 传递。
  - 如果直接传递失败，它将回退到队列路由。
  - 如果队列路由仍然不可用，则在最终放弃之前，会以短指数退避重试该公告。
- 移交给请求者会话的完成上下文是运行时生成的内部上下文（非用户编写的文本），包括：
  - `Result`（`assistant` 回复文本，如果助手回复为空，则使用最新的 `toolResult`）
  - `Status`（`completed successfully` / `failed` / `timed out` / `unknown`）
  - 紧凑的运行时/Token 统计
  - 一条投递指令，指示请求者代理以正常的助手口吻重写（不转发原始的内部元数据）
- `--model` 和 `--thinking` 会覆盖该特定运行的默认值。
- 使用 `info`/`log` 在完成后检查详细信息和输出。
- `/subagents spawn` 是单次模式（`mode: "run"`）。对于持久的线程绑定会话，请将 `sessions_spawn` 与 `thread: true` 和 `mode: "session"` 一起使用。
- 对于 ACP 框架会话（Codex、Claude Code、Gemini CLI），请将 `sessions_spawn` 与 `runtime: "acp"` 一起使用，并参阅 [ACP Agents](/zh/tools/acp-agents)。

主要目标：

- 并行化“研究/长任务/慢速工具”的工作，而不阻塞主运行。
- 默认情况下保持子代理隔离（会话分离 + 可选沙箱隔离）。
- 确保工具表面难以被滥用：子代理默认情况下**不会**获得会话工具。
- 支持可配置的嵌套深度以实现编排器模式。

成本说明：每个子代理都有其**自己的**上下文和 Token 使用量。对于繁重或重复的任务，请为子代理设置更便宜的模型，并将主代理保持在更高质量的模型上。您可以通过 `agents.defaults.subagents.model` 或每个代理的覆盖配置来设置此选项。

## 工具

使用 `sessions_spawn`：

- 启动子代理运行（`deliver: false`，全局通道：`subagent`）
- 然后运行一个公告步骤，并将公告回复发布到请求者聊天渠道
- 默认模型：继承调用者，除非您设置了 `agents.defaults.subagents.model`（或每个代理的 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 仍然优先。
- 默认思考：继承调用者，除非你设置了 `agents.defaults.subagents.thinking`（或每个智能体的 `agents.list[].subagents.thinking`）；明确的 `sessions_spawn.thinking` 仍然获胜。
- 默认运行超时：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 会在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则回退到 `0`（无超时）。

工具参数：

- `task`（必需）
- `label?`（可选）
- `agentId?`（可选；如果允许，则在另一个智能体 ID 下生成）
- `model?`（可选；覆盖子智能体模型；无效值将被跳过，子智能体在默认模型上运行，并在工具结果中显示警告）
- `thinking?`（可选；覆盖子智能体运行的思考级别）
- `runTimeoutSeconds?`（设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`；设置后，子智能体运行将在 N 秒后中止）
- `thread?`（默认 `false`；当为 `true` 时，请求为此子智能体会话绑定渠道线程）
- `mode?` (`run|session`)
  - 默认为 `run`
  - 如果省略 `thread: true` 和 `mode`，则默认变为 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?` (`delete|keep`，默认 `keep`)
- `sandbox?` (`inherit|require`，默认 `inherit`；`require` 拒绝生成，除非目标子运行时是沙箱隔离的)
- `sessions_spawn` **不**接受渠道传递参数（`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`）。如需传递，请使用衍生运行中的 `message`/`sessions_send`。

## 线程绑定会话

当为渠道启用线程绑定时，子代理可以保持绑定到某个线程，以便该线程中的后续用户消息继续路由到同一个子代理会话。

### 支持线程的渠道

- Discord（目前唯一支持的渠道）：支持持久的线程绑定子代理会话（`sessions_spawn` 配合 `thread: true`）、手动线程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及适配器密钥 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `thread: true` 进行衍生（并可选地使用 `mode: "session"`）调用 `sessions_spawn`。
2. OpenClaw 会在活动渠道中为该会话目标创建或绑定一个线程。
3. 该线程中的回复和后续消息会路由到绑定的会话。
4. 使用 `/session idle` 检查/更新非活动自动取消聚焦，并使用 `/session max-age` 控制硬性上限。
5. 使用 `/unfocus` 手动分离。

手动控制：

- `/focus <target>` 将当前线程（或创建一个新线程）绑定到子代理/会话目标。
- `/unfocus` 移除当前绑定线程的绑定。
- `/agents` 列出活动运行和绑定状态（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 仅适用于聚焦的绑定线程。

配置开关：

- 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 频道覆盖和生成自动绑定键是特定于适配器的。请参见上面的 **Thread supporting channels**。

有关当前适配器的详细信息，请参阅 [Configuration Reference](/zh/gateway/configuration-reference) 和 [Slash commands](/zh/tools/slash-commands)。

Allowlist：

- `agents.list[].subagents.allowAgents`：可以通过 `agentId` 定向的代理 ID 列表（`["*"]` 表示允许任意）。默认：仅请求者代理。
- 沙箱继承保护：如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝非沙箱隔离运行的目标。

设备发现：

- 使用 `agents_list` 查看当前允许 `sessions_spawn` 使用的代理 ID。

Auto-archive：

- 子代理会话将在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认：60）。
- 归档使用 `sessions.delete` 并将记录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在通知后立即归档（仍通过重命名保留记录）。
- 自动归档是尽力而为的；如果网关重启，挂起的计时器将丢失。
- `runTimeoutSeconds` **不**会自动归档；它仅停止运行。该会话将保留直到自动归档。
- 自动归档同等地适用于深度 1 和深度 2 的会话。

## Nested Sub-Agents

默认情况下，子代理无法生成自己的子代理（`maxSpawnDepth: 1`）。您可以通过设置 `maxSpawnDepth: 2` 来启用一级嵌套，这允许 **orchestrator pattern**：主 → 编排子代理 → 工作子子代理。

### How to enable

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

### Depth levels

| Depth | Session key shape                            | Role                                          | Can spawn?                |
| ----- | -------------------------------------------- | --------------------------------------------- | ------------------------- |
| 0     | `agent:<id>:main`                            | Main agent                                    | Always                    |
| 1     | `agent:<id>:subagent:<uuid>`                 | Sub-agent (orchestrator when depth 2 allowed) | 仅当 `maxSpawnDepth >= 2` |
| 2     | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | Sub-sub-agent (leaf worker)                   | Never                     |

### Announce chain

结果沿链回传：

1. Depth-2 worker 完成 → 向其父级（depth-1 orchestrator）宣布
2. Depth-1 orchestrator 收到宣布，合成结果，完成 → 向 Main 宣布
3. Main agent 收到宣布并传递给用户

每一层只能看到其直接子级的宣布。

### 按深度的工具策略

- Role 和控制范围在生成时被写入会话元数据中。这防止了扁平化或恢复的会话密钥意外重新获得 orchestrator 权限。
- **Depth 1 (orchestrator, 当 `maxSpawnDepth >= 2`)**：获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便管理其子级。其他会话/系统工具保持拒绝状态。
- **Depth 1 (leaf, 当 `maxSpawnDepth == 1`)**：没有会话工具（当前的默认行为）。
- **Depth 2 (leaf worker)**：没有会话工具 —— `sessions_spawn` 在深度 2 处始终被拒绝。无法生成更多子级。

### 每个代理的生成限制

每个代理会话（在任何深度）一次最多可以有 `maxChildrenPerAgent`（默认：5）个活跃子级。这可以防止单个 orchestrator 出现失控的扩散。

### 级联停止

停止 depth-1 orchestrator 会自动停止其所有 depth-2 子级：

- 主聊天中的 `/stop` 会停止所有 depth-1 代理并级联到其 depth-2 子级。
- `/subagents kill <id>` 会停止特定的子代理并级联到其子级。
- `/subagents kill all` 会停止请求者的所有子代理并级联。

## 身份验证

子代理的身份验证由 **agent id** 解析，而不是由会话类型：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 身份验证存储从该代理的 `agentDir` 加载。
- 主代理的身份验证配置文件作为 **后备** 合并进来；发生冲突时，代理配置文件会覆盖主配置文件。

注意：合并是累加的，因此主配置文件始终可作为后备使用。每个代理完全隔离的身份验证尚不支持。

## 宣布

子代理通过宣布步骤进行汇报：

- 宣布步骤在子代理会话（而非请求者会话）内部运行。
- 如果子代理完全回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 否则，传递方式取决于请求者的深度：
  - 顶级请求者会话使用带有外部传递（`deliver=true`）的后续 `agent` 调用
  - 嵌套请求者子代理会话接收内部后续注入（`deliver=false`），以便编排器可以在会话内综合子结果
  - 如果嵌套请求者子代理会话已消失，OpenClaw 将在该会话的请求者可用时回退到它
- 在构建嵌套完成发现时，子完成聚合范围限定于当前请求者运行，从而防止过时的先前运行的子输出泄漏到当前公告中。
- 当渠道适配器上可用时，公告回复会保留线程/主题路由。
- 公告上下文被规范化为稳定的内部事件块：
  - 来源（`subagent` 或 `cron`）
  - 子会话键/id
  - 公告类型 + 任务标签
  - 源自运行结果的状态行（`success`、`error`、`timeout` 或 `unknown`）
  - 公告步骤的结果内容（如果缺失则为 `(no output)`）
  - 描述何时回复与保持静默的后续指令
- `Status` 不是从模型输出推断出来的；它来自运行结果信号。

公告有效负载在末尾包含一个统计行（即使被包装时）：

- 运行时间（例如 `runtime 5m12s`）
- 令牌使用量（输入/输出/总计）
- 配置了模型定价时的估算成本（`models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 和记录路径（以便主代理可以通过 `sessions_history` 获取历史记录或检查磁盘上的文件）
- 内部元数据仅供编排使用；面向用户的回复应以正常的助手语音重写。

## 工具策略（子代理工具）

默认情况下，子代理获得**除会话工具**和系统工具之外的所有工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

当 `maxSpawnDepth >= 2` 时，深度 1 的编排器子代理还会接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理其子代理。

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

- 在请求者聊天中发送 `/stop` 将中止请求者会话，并停止由其生成的任何活动的子代理运行，并级联到嵌套的子代理。
- `/subagents kill <id>` 会停止特定的子代理并级联到其子代理。

## 限制

- 子代理公告是 **尽力而为（best-effort）** 的。如果网关重启，待处理的“回传公告”工作将丢失。
- 子代理仍然共享相同的网关进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它会立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` + `TOOLS.md`（无 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。大多数用例建议使用深度 2。
- `maxChildrenPerAgent` 限制每个会话的活动子代理数量（默认：5，范围：1–20）。

import zh from "/components/footer/zh.mdx";

<zh />
