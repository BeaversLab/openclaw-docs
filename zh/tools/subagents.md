---
summary: "子代理：生成向请求者聊天频道通告结果的独立代理运行"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
---

# 子代理

子代理是从现有代理运行中生成的后台代理运行。它们在自己的会话（`agent:<agentId>:subagent:<uuid>`）中运行，并在完成后向请求者聊天频道**通告**其结果。

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

### 生成行为

`/subagents spawn` 作为用户命令启动后台子代理，而不是内部中继，并在运行完成时向请求者聊天发送最后一次完成更新。

- 生成命令是非阻塞的；它立即返回一个运行 ID。
- 完成后，子代理会将摘要/结果消息通告回请求者聊天频道。
- 对于手动生成，传递是具有韧性的：
  - OpenClaw 首先尝试使用稳定的幂等密钥直接传送 `agent`。
  - 如果直接传送失败，它将回退到队列路由。
  - 如果队列路由仍然不可用，则会在最终放弃之前，使用短暂的指数退避重试发送公告。
- 完成后的交接给请求者会话的是运行时生成的内部上下文（不是用户编写的文本），包括：
  - `Result`（`assistant` 回复文本，如果助手回复为空，则为最新的 `toolResult`）
  - `Status`（`completed successfully` / `failed` / `timed out` / `unknown`）
  - 紧凑的运行时/token 统计信息
  - 一条传送指令，告诉请求者代理以正常的助手语调重写（而不是转发原始的内部元数据）
- `--model` 和 `--thinking` 会覆盖该特定运行的默认设置。
- 使用 `info`/`log` 在完成后检查详细信息和输出。
- `/subagents spawn` 是单次模式（`mode: "run"`）。对于持久的线程绑定会话，请将 `sessions_spawn` 与 `thread: true` 和 `mode: "session"` 一起使用。
- 对于 ACP 约束会话（Codex、Claude Code、Gemini CLI），请将 `sessions_spawn` 与 `runtime: "acp"` 一起使用，并参阅 [ACP Agents](/en/tools/acp-agents)。

主要目标：

- 并行化“研究 / 长任务 / 慢速工具”工作，而不阻塞主运行。
- 默认情况下保持子代理隔离（会话分离 + 可选的沙箱隔离）。
- 使工具表面难以被滥用：子代理默认情况下**不会**获取会话工具。
- 支持可配置的嵌套深度，以实现编排器模式。

成本说明：每个子代理都有其**独立**的上下文和令牌使用情况。对于繁重或重复的任务，请为子代理设置更便宜的模型，并将主代理保持在更高质量的模型上。您可以通过 `agents.defaults.subagents.model` 或每个代理的覆盖配置来设置此选项。

## 工具

使用 `sessions_spawn`：

- 启动子代理运行（`deliver: false`，全局通道：`subagent`）
- 然后运行宣布步骤，并将宣布回复发布到请求者聊天渠道
- 默认模型：继承调用者，除非您设置了 `agents.defaults.subagents.model`（或每个代理的 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 仍然优先。
- 默认思考：继承调用者，除非您设置了 `agents.defaults.subagents.thinking`（或每个代理的 `agents.list[].subagents.thinking`）；显式的 `sessions_spawn.thinking` 仍然优先。
- 默认运行超时：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 将使用已设置的 `agents.defaults.subagents.runTimeoutSeconds`；否则回退到 `0`（无超时）。

工具参数：

- `task`（必需）
- `label?`（可选）
- `agentId?`（可选；如果允许，则在另一个代理 ID 下生成）
- `model?`（可选；覆盖子代理模型；无效值将被跳过，子代理将在默认模型上运行，并在工具结果中显示警告）
- `thinking?`（可选；覆盖子代理运行的思考级别）
- `runTimeoutSeconds?`（设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`；设置后，子代理运行将在 N 秒后中止）
- `thread?`（默认 `false`；当为 `true` 时，请求为此子代理会话进行渠道线程绑定）
- `mode?`（`run|session`）
  - 默认为 `run`
  - 如果省略了 `thread: true` 和 `mode`，则默认为 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?` (`delete|keep`，默认 `keep`)
- `sandbox?` (`inherit|require`，默认 `inherit`；如果目标子运行时未进行沙箱隔离，`require` 将拒绝生成)
- `sessions_spawn` **不**接受渠道传递参数 (`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`)。如需传递，请从生成的运行中使用 `message`/`sessions_send`。

## 线程绑定会话

当为渠道启用了线程绑定时，子代理可以保持与线程的绑定，以便该线程中的后续用户消息继续路由到同一个子代理会话。

### 支持线程的渠道

- Discord（目前唯一支持的渠道）：支持持久的线程绑定子代理会话（`sessions_spawn` 带有 `thread: true`）、手动线程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）以及适配器键 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `thread: true` 通过 `sessions_spawn` 生成（可选 `mode: "session"`）。
2. OpenClaw 在活动渠道中为该会话目标创建或绑定一个线程。
3. 该线程中的回复和后续消息会路由到绑定的会话。
4. 使用 `/session idle` 检查/更新不活跃自动取消聚焦，并使用 `/session max-age` 控制硬上限。
5. 使用 `/unfocus` 手动分离。

手动控制：

- `/focus <target>` 将当前线程（或创建一个）绑定到子代理/会话目标。
- `/unfocus` 移除当前绑定线程的绑定。
- `/agents` 列出活动运行和绑定状态（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 仅适用于聚焦的绑定线程。

配置开关：

- 全局默认：`session.threadBindings.enabled`，`session.threadBindings.idleHours`，`session.threadBindings.maxAgeHours`
- 通道覆盖和生成自动绑定键特定于适配器。请参阅上面的 **支持线程的通道**。

有关当前适配器的详细信息，请参阅 [配置参考](/en/gateway/configuration-reference) 和 [斜杠命令](/en/tools/slash-commands)。

允许列表：

- `agents.list[].subagents.allowAgents`：可通过 `agentId` 定位的代理 ID 列表（`["*"]` 表示允许任何）。默认值：仅请求者代理。
- 沙箱继承保护：如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝以非沙箱隔离方式运行的目标。

设备发现：

- 使用 `agents_list` 查看当前允许用于 `sessions_spawn` 的代理 ID。

自动归档：

- 子代理会话在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认值：60）。
- 归档使用 `sessions.delete` 并将对话记录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在宣布后立即归档（仍然通过重命名保留对话记录）。
- 自动归档是尽力而为的；如果网关重启，挂起的计时器将丢失。
- `runTimeoutSeconds` **不会**自动归档；它仅停止运行。该会话会一直保留直到自动归档。
- 自动归档同样适用于深度 1 和深度 2 的会话。

## 嵌套子代理

默认情况下，子代理无法生成自己的子代理（`maxSpawnDepth: 1`）。您可以通过设置 `maxSpawnDepth: 2` 来启用一级嵌套，从而实现**编排器模式**（orchestrator pattern）：主代理 → 编排器子代理 → 工作器子子代理。

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

| 深度 | 会话密钥形状                                 | 角色                              | 能否生成？                   |
| ---- | -------------------------------------------- | --------------------------------- | ---------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                            | 始终                         |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（当允许深度 2 时为编排器） | 仅当 `maxSpawnDepth >= 2` 时 |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶工作器）              | 从不                         |

### 公告链

结果沿着链向上回流：

1. 深度 2 工作器完成 → 向其父级（深度 1 编排器）公告
2. 深度 1 编排器接收公告，综合结果，完成 → 向主代理公告
3. 主代理接收公告并传递给用户

每一层只能看到其直接子代的公告。

### 按深度划分的工具策略

- 角色和控制范围在生成时被写入会话元数据。这可以防止扁平化的或恢复的会话密钥意外地重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）**：获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以管理其子代。其他会话/系统工具仍然被拒绝。
- **深度 1（叶节点，当 `maxSpawnDepth == 1` 时）**：没有会话工具（当前默认行为）。
- **深度 2（叶工作器）**：没有会话工具 —— `sessions_spawn` 在深度 2 始终被拒绝。无法生成更多子代。

### 每个代理的生成限制

每个代理会话（任何深度）一次最多可以有 `maxChildrenPerAgent`（默认：5）个活动子项。这可以防止来自单个编排器的失控扩散。

### 级联停止

停止深度为 1 的编排器会自动停止其所有深度为 2 的子项：

- 主聊天中的 `/stop` 会停止所有深度为 1 的代理并级联到其深度为 2 的子项。
- `/subagents kill <id>` 会停止特定的子代理并级联到其子项。
- `/subagents kill all` 会停止请求者的所有子代理并级联。

## 身份验证

子代理的身份验证由**代理 ID** 解析，而不是由会话类型解析：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 身份验证存储从该代理的 `agentDir` 加载。
- 主代理的身份验证配置文件作为**后备**合并进来；发生冲突时，代理配置文件会覆盖主配置文件。

注意：合并是相加的，因此主配置文件始终可用作后备。尚不支持每个代理完全隔离的身份验证。

## 宣布

子代理通过宣布步骤进行报告：

- 宣布步骤在子代理会话（而不是请求者会话）内部运行。
- 如果子代理准确回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 否则，传递取决于请求者深度：
  - 顶级请求者会话使用具有外部传递（`deliver=true`）的后续 `agent` 调用
  - 嵌套请求者子代理会话接收内部后续注入（`deliver=false`），以便编排器可以在会话中综合子项结果
  - 如果嵌套请求者子代理会话已消失，OpenClaw 会在可用时回退到该会话的请求者
- 在构建嵌套完成发现时，子完成聚合的范围限定为当前请求者运行，从而防止陈旧的先前运行子输出泄漏到当前宣布中。
- 当渠道适配器可用时，宣布回复会保留会话/主题路由。
- 通告上下文被规范化为一个稳定的内部事件块：
  - source (`subagent` 或 `cron`)
  - 子会话 key/id
  - 通告类型 + 任务标签
  - 根据运行结果派生的状态行 (`success`, `error`, `timeout`, 或 `unknown`)
  - 来自通告步骤的结果内容（如果缺失则为 `(no output)`）
  - 一条后续指令，描述何时回复以及何时保持静默
- `Status` 不是根据模型输出推断出来的；它来自运行结果信号。

通告载荷在末尾包含一个统计行（即使在被包裹的情况下）：

- 运行时（例如 `runtime 5m12s`）
- Token 使用量（输入/输出/总计）
- 配置了模型定价时的估算成本 (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId`, 和转录路径（以便主代理可以通过 `sessions_history` 获取历史记录或在磁盘上检查文件）
- 内部元数据仅供编排使用；面向用户的回复应以正常的助手语音重写。

## 工具策略（子代理工具）

默认情况下，子代理获得**除会话工具和系统工具外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

当 `maxSpawnDepth >= 2` 时，深度为 1 的编排器子代理还会额外获得 `sessions_spawn`, `subagents`, `sessions_list`, 和 `sessions_history`，以便它们管理其子级。

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
- 并发数：`agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话并停止由此产生的任何活动子代理运行，并级联到嵌套的子级。
- `/subagents kill <id>` 停止特定的子代理并级联到其子级。

## 限制

- 子代理公告是 **尽力而为** 的。如果网关重启，待处理的“公告回传”工作将丢失。
- 子代理仍然共享相同的网关进程资源；将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` + `TOOLS.md`（没有 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，建议深度为 2。
- `maxChildrenPerAgent` 限制每个会话的活动子级数（默认：5，范围：1–20）。

import zh from "/components/footer/zh.mdx";

<zh />
