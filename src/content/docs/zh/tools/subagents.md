---
summary: "生成隔离的后台代理运行，将结果公布回请求者聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

子代理是从现有代理运行生成的后台代理运行。
它们在自己的会话 (`agent:<agentId>:subagent:<uuid>`) 中运行，并在完成后，将其结果**公布**（announce）回
请求者聊天渠道。每个子代理运行都被跟踪为
[后台任务](/zh/automation/tasks)。

主要目标：

- 在不阻塞主运行的情况下，并行化“研究 / 长任务 / 慢工具”工作。
- 默认保持子代理隔离（会话分离 + 可选的沙箱隔离）。
- 保持工具接口难以滥用：子代理默认**不**获取会话工具。
- 支持可配置的嵌套深度，用于编排器模式。

<Note>**成本提示：** 默认情况下，每个子代理都有自己的上下文和令牌使用量。 对于繁重或重复性任务，请为子代理设置更便宜的模型， 并将主代理保持在更高质量的模型上。通过 `agents.defaults.subagents.model` 或每个代理的覆盖进行配置。当子项 确实需要请求者的当前转录记录时，代理可以针对该生成请求 `context: "fork"`。</Note>

## 斜杠命令

使用 `/subagents` 来检查或控制**当前会话**的子代理运行：

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、
转录记录路径、清理）。使用 `sessions_history` 获取有限的、
经过安全过滤的召回视图；当您需要原始完整转录记录时，
请检查磁盘上的转录记录路径。

### 线程绑定控制

这些命令适用于支持持久线程绑定的渠道。
请参阅下方的[支持线程的渠道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 生成行为

`/subagents spawn` 作为用户命令（而非内部中继）启动后台子代理，
并在运行完成时向请求者聊天发送一条最终完成更新。

<AccordionGroup>
  <Accordion title="非阻塞、基于推送的完成">
    - spawn 命令是非阻塞的；它立即返回一个运行 ID。
    - 完成时，子代理会将摘要/结果消息通告回请求者聊天渠道。
    - 完成是基于推送的。一旦生成，**切勿**为了等待其完成而在循环中轮询 `/subagents list`、`sessions_list` 或 `sessions_history`；仅在需要调试或干预时按需检查状态。
    - 完成时，在通告清理流程继续之前，OpenClaw 会尽力关闭由该子代理会话打开的已跟踪浏览器标签页/进程。
  </Accordion>
  <Accordion title="手动生成的传递弹性">
    - OpenClaw 首先尝试使用稳定的幂等密钥直接传递 `agent`。
    - 如果直接传递失败，它会回退到队列路由。
    - 如果队列路由仍然不可用，则会在最终放弃前以短指数退避重试通告。
    - 完成传递保留解析后的请求者路由：当可用时，线程绑定或对话绑定的完成路由优先；如果完成源仅提供渠道，OpenClaw 会从请求者会话的解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填充缺失的目标/帐户，以便直接传递仍然有效。
  </Accordion>
  <Accordion title="完成交接元数据">
    传递给请求者会话的完成交接是运行时生成的
    内部上下文（非用户编写的文本），包括：

    - `Result` — 最新的可见 `assistant` 回复文本，否则为经过清理的最新工具/toolResult 文本。终结失败的运行不会重用捕获的回复文本。
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`。
    - 紧凑的运行时/令牌统计信息。
    - 一条传递指令，告知请求者代理以正常的助手语音重写（而非转发原始内部元数据）。

  </Accordion>
  <Accordion title="模式和 ACP 运行时">
    - `--model` 和 `--thinking` 会覆盖该次运行的默认设置。
    - 使用 `info`/`log` 在完成后检查详细信息和输出。
    - `/subagents spawn` 是一次性模式（`mode: "run"`）。对于持久的线程绑定会话，请使用带有 `thread: true` 和 `mode: "session"` 的 `sessions_spawn`。
    - 对于 ACP 驱动会话（Claude Code、Gemini CLI、OpenCode 或显式的 Codex ACP/acpx），当工具宣传该运行时时，请使用带有 `runtime: "acp"` 的 `sessions_spawn`。在调试补全或代理到代理循环时，请参阅 [ACP 交付模型](/zh/tools/acp-agents#delivery-model)。当启用 `codex` 插件时，除非用户明确要求 ACP/acpx，否则 Codex 聊天/线程控制应优先选择 `/codex ...` 而非 ACP。
    - OpenClaw 会隐藏 `runtime: "acp"`，直到启用 ACP、请求者未处于沙箱隔离状态，并且加载了后端插件（如 `acpx`）。`runtime: "acp"` 期望一个外部 ACP 驱动 ID，或带有 `runtime.type="acp"` 的 `agents.list[]` 条目；对于来自 `agents_list` 的普通 OpenClaw 配置代理，请使用默认的子代理运行时。
  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理启动时是隔离的，除非调用者明确要求分叉当前记录。

| 模式       | 何时使用                                                               | 行为                                                                  |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `isolated` | 新的研究、独立实现、慢速工具工作，或可以在任务文本中简要说明的任何内容 | 创建一个干净的子记录。这是默认设置，并且可以保持较低的 Token 使用量。 |
| `fork`     | 依赖于当前对话、先前工具结果或请求者记录中已存在的细微指令的工作       | 在子进程开始之前，将请求者记录分支到子会话中。                        |

请节制使用 `fork`。它适用于上下文相关的委派，而不是为了替代编写清晰的任务提示。

## 工具：`sessions_spawn`

在全局 `subagent` 通道上使用 `deliver: false` 启动子代理运行，然后运行一个通知步骤并将通知回复发布到请求者聊天渠道。

可用性取决于调用者的有效工具策略。`coding` 和 `full` 配置文件默认暴露 `sessions_spawn`。`messaging` 配置文件则不暴露；对于应该委派工作的代理，添加 `tools.alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"]` or use `tools.profile: "coding"`。渠道/组、提供商、沙箱和每代理允许/拒绝策略仍可在配置文件阶段之后移除该工具。使用同一会话中的 `/tools` 以确认有效工具列表。

**默认值：**

- **模型：** 继承调用者，除非您设置了 `agents.defaults.subagents.model`（或每代理 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 仍然优先。
- **思考：** 继承调用者，除非您设置了 `agents.defaults.subagents.thinking`（或每代理 `agents.list[].subagents.thinking`）；显式的 `sessions_spawn.thinking` 仍然优先。
- **运行超时：** 如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则回退到 `0`（无超时）。

### 工具参数

<ParamField path="task" type="string" required>
  子代理的任务描述。
</ParamField>
<ParamField path="label" type="string">
  可选的人类可读标签。
</ParamField>
<ParamField path="agentId" type="string">
  当 `subagents.allowAgents` 允许时，在另一个代理 ID 下生成。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 仅适用于外部 ACP 驱动程序（`claude`、`droid`、`gemini`、`opencode` 或明确请求的 Codex ACP/acpx）以及 `runtime.type` 为 `acp` 的 `agents.list[]` 条目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  仅限 ACP。当 `runtime: "acp"` 时恢复现有的 ACP 驱动程序会话；对于原生子代理生成将被忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  仅限 ACP。当 `runtime: "acp"` 时将 ACP 运行输出流式传输到父会话；对于原生子代理生成请省略。
</ParamField>
<ParamField path="model" type="string">
  覆盖子代理模型。无效值将被跳过，子代理将在默认模型上运行，并在工具结果中显示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆盖子代理运行的思考级别。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  设置时默认为 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`。设置后，子代理运行将在 N 秒后中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  当为 `true` 时，请求此子代理会话的渠道线程绑定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略了 `thread: true` 和 `mode`，默认值将变为 `session`。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在宣布后立即归档（仍然通过重命名保留记录）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 拒绝生成，除非目标子运行时是沙箱隔离的。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 将请求者的当前记录分支到子会话中。仅适用于原生子代理。仅在子代理需要当前记录时才使用 `fork`。
</ParamField>

<Warning>`sessions_spawn` **不**接受 渠道交付 参数 (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`)。如需交付，请使用 `message`/`sessions_send`。</Warning>

## 绑定线程的会话

当为某个 渠道 启用了线程绑定时，子代理可以保持绑定到某个线程，以便该线程中的后续用户消息继续路由到同一个子代理 会话。

### 支持线程的渠道

**Discord** 目前是唯一支持的 渠道。它支持
持久的绑定线程的子代理 会话 (`sessions_spawn` 与
`thread: true`)，手动线程控制 (`/focus`, `/unfocus`, `/agents`,
`/session idle`, `/session max-age`)，以及适配器密钥
`channels.discord.threadBindings.enabled`,
`channels.discord.threadBindings.idleHours`,
`channels.discord.threadBindings.maxAgeHours` 和
`channels.discord.threadBindings.spawnSubagentSessions`。

### 快速流程

<Steps>
  <Step title="生成">使用 `thread: true` 调用 `sessions_spawn`（并可选择 `mode: "session"`）。</Step>
  <Step title="绑定">OpenClaw 在当前 渠道 中为该 会话 目标创建或绑定一个线程。</Step>
  <Step title="路由后续消息">该线程中的回复和后续消息会路由到绑定的 会话。</Step>
  <Step title="检查超时">使用 `/session idle` 检查/更新不活动自动失去焦点 并 使用 `/session max-age` 控制硬性上限。</Step>
  <Step title="分离">使用 `/unfocus` 进行手动分离。</Step>
</Steps>

### 手动控制

| 命令               | 效果                                                |
| ------------------ | --------------------------------------------------- |
| `/focus <target>`  | 将当前线程（或创建一个新线程）绑定到子代理/会话目标 |
| `/unfocus`         | 移除当前绑定线程的绑定                              |
| `/agents`          | 列出活动运行和绑定状态 (`thread:<id>` 或 `unbound`) |
| `/session idle`    | 检查/更新空闲自动取消聚焦（仅限聚焦的绑定线程）     |
| `/session max-age` | 检查/更新硬上限（仅限聚焦的绑定线程）               |

### 配置开关

- **全局默认值：** `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- **频道覆盖和生成自动绑定键** 是特定于适配器的。请参阅上面的 [支持线程的频道](#thread-supporting-channels)。

有关当前适配器的详细信息，请参阅 [配置参考](/zh/gateway/configuration-reference) 和
[斜杠命令](/zh/tools/slash-commands)。

### 允许列表

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可通过显式 `agentId` 定位的代理 ID 列表（`["*"]` 允许任何 ID）。默认值：仅请求者代理。如果您设置了列表，并且仍然希望请求者通过 `agentId` 自行生成，请将请求者 ID 包含在列表中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  当请求者代理未设置自己的 `subagents.allowAgents` 时使用的默认目标代理允许列表。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择）。每代理覆盖：`agents.list[].subagents.requireAgentId`。
</ParamField>

如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝
以非沙箱隔离模式运行的目标。

### 设备发现

使用 `agents_list` 查看 `sessions_spawn` 当前允许的代理 ID。
响应包括每个列出代理的有效模型和嵌入式运行时元数据，以便调用者可以区分 PI、Codex
应用服务器和其他配置的原生运行时。

### 自动归档

- 子代理会话会在 `agents.defaults.subagents.archiveAfterMinutes` 后自动归档（默认为 `60`）。
- 归档操作使用 `sessions.delete` 并将记录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 会在宣布后立即归档（仍通过重命名保留记录）。
- 自动归档是尽力而为的；如果网关重启，挂起的计时器将丢失。
- `runTimeoutSeconds` **不会**自动归档；它仅停止运行。该会话将保留直到自动归档。
- 自动归档同等地适用于深度 1 和深度 2 的会话。
- 浏览器清理与归档清理是分开的：当运行结束时，被跟踪的浏览器标签页/进程会尽力关闭，即使记录/会话条目被保留。

## 嵌套子代理

默认情况下，子代理无法生成自己的子代理
(`maxSpawnDepth: 1`)。设置 `maxSpawnDepth: 2` 以启用一级
嵌套 —— 即 **编排器模式**：主 → 编排器子代理 →
工作器子子代理。

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

| 深度 | 会话键形状                                   | 角色                              | 能否生成？                |
| ---- | -------------------------------------------- | --------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                            | 始终                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（当允许深度 2 时为编排器） | 仅当 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶子工作器）            | 从不                      |

### 宣布链

结果沿着链向上回流：

1. 深度 2 工作器完成 → 向其父级（深度 1 编排器）宣布。
2. 深度 1 编排器收到宣布，综合结果，完成 → 向主代理宣布。
3. 主代理收到宣布并传递给用户。

每一层只能看到其直接子级的宣布。

<Note>
  **操作指南：** 启动子任务一次并等待完成事件，而不是围绕 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 命令构建轮询循环。 `sessions_list` 和 `/subagents list` 使子会话关系专注于实时工作 — 实时子会话保持附加，已结束的子会话在最近的短时间内保持可见，而过时的仅存储子链接在过期后被忽略。这可以防止旧的 `spawnedBy` / `parentSessionKey`
  元数据在重启后复活幽灵子会话。如果子完成事件在您已发送最终答案后到达，正确的后续操作是精确的无声令牌 `NO_REPLY` / `no_reply`。
</Note>

### 按深度划分的工具策略

- 角色和控制范围在生成时被写入会话元数据。这可以防止扁平化或恢复的会话密钥意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）：** 获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便它可以管理其子级。其他会话/系统工具仍然被拒绝。
- **深度 1（叶节点，当 `maxSpawnDepth == 1` 时）：** 无会话工具（当前的默认行为）。
- **深度 2（叶节点工作器）：** 无会话工具 — `sessions_spawn` 在深度 2 始终被拒绝。无法生成更多的子级。

### 每个代理的生成限制

每个代理会话（在任何深度）一次最多可以有 `maxChildrenPerAgent`
（默认 `5`）个活动子级。这可以防止来自单个编排器的失控扩散。

### 级联停止

停止深度 1 的编排器会自动停止其所有深度 2 的子级：

- 主聊天中的 `/stop` 会停止所有深度 1 的代理并级联到其深度 2 的子级。
- `/subagents kill <id>` 会停止特定的子代理并级联到其子级。
- `/subagents kill all` 会停止请求者的所有子代理并级联。

## 身份验证

子代理认证通过**代理 ID** 解析，而不是通过会话类型：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 认证存储从该代理的 `agentDir` 加载。
- 主代理的认证配置文件作为**后备**合并；在冲突时，代理配置文件会覆盖主配置文件。

合并是累加的，因此主配置文件始终可作为后备使用。暂不支持每个代理完全隔离的认证。

## 通告

子代理通过通告步骤进行汇报：

- 通告步骤在子代理会话（而非请求者会话）内运行。
- 如果子代理完全回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新的助手文本是完全静默令牌 `NO_REPLY` / `no_reply`，则即使之前存在可见进度，也会抑制通告输出。

传递取决于请求者深度：

- 顶级请求者会话使用具有外部传递（`deliver=true`）的后续 `agent` 调用。
- 嵌套请求者子代理会话接收内部后续注入（`deliver=false`），以便编排器可以在会话中综合子结果。
- 如果嵌套请求者子代理会话已消失，OpenClaw 会在可用时回退到该会话的请求者。

对于顶级请求者会话，完成模式的直接传递首先解析任何绑定的对话/线程路由和挂钩覆盖，然后从请求者会话的存储路由中填充缺失的渠道目标字段。这即使完成来源仅标识了渠道，也能使完成保持在正确的聊天/主题上。

在构建嵌套完成结果时，子完成聚合范围限定为当前请求者运行，以防止陈旧的先前运行子输出泄漏到当前通告中。通告回复在渠道适配器上可用时会保留线程/主题路由。

### 通告上下文

通告上下文被规范化为稳定的内部事件块：

| 字段     | 来源                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 来源     | `subagent` 或 `cron`                                                                 |
| 会话 ID  | 子会话密钥/ID                                                                        |
| 类型     | 通告类型 + 任务标签                                                                  |
| 状态     | 源自运行时结果 (`success`、`error`、`timeout` 或 `unknown`) — **而非**从模型文本推断 |
| 结果内容 | 最新的可见助手文本，否则为经过清理的最新工具/toolResult文本                          |
| 后续跟进 | 描述何时回复以及何时保持静默的指令                                                   |

最终失败的运行会报告失败状态，而不会重播捕获的回复文本。在超时时，如果子代理仅执行了工具调用，announce可以将该历史记录折叠为简短的局部进度摘要，而不是重播原始工具输出。

### 统计行

Announce 负载在末尾包含一个统计行（即使被包装）：

- 运行时（例如 `runtime 5m12s`）。
- Token 使用量（输入/输出/总计）。
- 配置了模型定价时的估算成本 (`models.providers.*.models[].cost`)。
- `sessionKey`、`sessionId` 和转录本路径，以便主代理可以通过 `sessions_history` 获取历史记录或在磁盘上检查文件。

内部元数据仅用于编排；面向用户的回复应以正常的助手声音重写。

### 为什么优先使用 `sessions_history`

`sessions_history` 是更安全的编排路径：

- 助手回忆首先会进行标准化处理：剥离思考标签；剥离 `<relevant-memories>` / `<relevant_memories>` 脚手架；剥离纯文本工具调用 XML 负载块 (`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`)，包括无法正确关闭的截断负载；剥离降级的工具调用/结果脚手架和历史上下文标记；剥离泄露的模型控制令牌 (`<|assistant|>`、其他 ASCII `<|...|>`、全角 `<｜...｜>`)；剥离格式错误的 MiniMax 工具调用 XML。
- 凭证/类似令牌的文本会被编辑。
- 长块可能会被截断。
- 非常大的历史记录可能会丢弃旧行，或用 `[sessions_history omitted: message too large]` 替换过大的行。
- 当您需要完整的逐字节记录时，原始磁盘记录检查是后备方案。

## 工具策略

子代理首先使用与父代理或目标代理相同的配置文件和工具策略管道。在此之后，OpenClaw 会应用子代理限制层。

如果没有限制性的 `tools.profile`，子代理将获得**除会话工具**和系统工具之外的所有工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在这里仍然是一个受限的、经过清理的召回视图——它不是原始记录转储。

当 `maxSpawnDepth >= 2` 时，深度为 1 的编排器子代理还会额外接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理其子代理。

### 通过配置覆盖

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

`tools.subagents.tools.allow` 是一个最终的仅允许过滤器。它可以缩小已解析的工具集，但无法**重新添加**被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。要允许代码配置文件的子代理使用浏览器自动化，请在配置文件阶段添加浏览器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

当只有一个代理应该获得浏览器自动化时，请使用特定于代理的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 并发

子代理使用专用的进程内队列通道：

- **通道名称：** `subagent`
- **并发数：** `agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 活跃性与恢复

OpenClaw 不会将 `endedAt` 的缺失视为子代理仍然存活的永久证明。超过陈旧运行窗口的未结束运行将不再计入 `/subagents list`、状态摘要、后代完成门控和每会话并发检查中的活动/待处理状态。

在 Gateway 重启后，除非子会话被标记为 `abortedLastRun: true`，否则陈旧的未结束已恢复运行将被清理。那些因重启而中止的子会话仍可通过子代理孤岛恢复流程进行恢复，该流程在清除中止标记之前会发送一条合成的恢复消息。

<Note>
  如果子代理生成失败并显示 Gateway `PAIRING_REQUIRED` / `scope-upgrade`，请在编辑配对状态之前检查 RPC 调用方。 内部 `sessions_spawn` 协调应作为 `client.id: "gateway-client"` 并带有 `client.mode: "backend"` 通过直接 环回共享令牌/密码认证进行连接；该路径不依赖于 CLI 的配对设备范围基线。远程调用方、显式 `deviceIdentity`、显式设备令牌路径以及浏览器/node 客户端 仍然需要正常的设备批准才能进行范围升级。
</Note>

## 停止

- 在请求者聊天中发送 `/stop` 将中止请求者会话，并停止由其生成的任何活动子代理运行，级联影响嵌套的子级。
- `/subagents kill <id>` 会停止特定的子代理，并级联影响其子级。

## 限制

- 子代理的公告是“尽力而为”的。如果 Gateway 重启，待处理的“公告回传”工作将丢失。
- 子代理仍然共享相同的 Gateway 进程资源；请将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` + `TOOLS.md`（不包括 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，建议深度为 2。
- `maxChildrenPerAgent` 限制了每个会话的活动子级数量（默认 `5`，范围 `1–20`）。

## 相关

- [ACP agents](/zh/tools/acp-agents)
- [Agent send](/zh/tools/agent-send)
- [后台任务](/zh/automation/tasks)
- [多代理沙盒工具](/zh/tools/multi-agent-sandbox-tools)
