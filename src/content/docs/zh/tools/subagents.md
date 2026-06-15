---
summary: "生成独立的后台代理运行，将结果宣布回请求聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

Sub-agents 是从现有 agent 运行中生成的后台 agent 运行。它们在自己的会话 (`agent:<agentId>:subagent:<uuid>`) 中运行，并在完成后将结果 **announce**（宣布）回请求者的聊天渠道。每个 sub-agent 运行都作为一个[后台任务](/zh/automation/tasks)进行跟踪。

主要目标：

- 在不阻塞主运行的情况下，并行化“研究 / 长任务 / 慢工具”工作。
- 默认保持子代理隔离（会话分离 + 可选的沙箱隔离）。
- 保持工具接口难以滥用：子代理默认**不**获取会话工具。
- 支持可配置的嵌套深度，用于编排器模式。

<Note>
  **成本说明：** 默认情况下，每个 sub-agent 都有自己的上下文和 token 使用量。对于繁重或重复的任务，请为 sub-agents 设置更便宜的模型，并将主代理保持在更高质量的模型上。通过 `agents.defaults.subagents.model` 或每个代理的覆盖进行配置。当子代理确实需要请求者的当前记录时，代理可以在该次生成时请求 `context: "fork"`。线程绑定的子代理会话默认为 `context: "fork"`，因为它们将当前对话分支到后续线程中。
</Note>

## 斜杠命令

使用 `/subagents` 检查 **当前会话** 的 sub-agent 运行情况：

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` 显示运行元数据（状态、时间戳、会话 ID、记录路径、清理）。使用 `sessions_history` 获取有限的、经过安全过滤的召回视图；当您需要原始完整记录时，请检查磁盘上的记录路径。

### 线程绑定控制

这些命令适用于支持持久线程绑定的渠道。请参阅下方的[支持线程的渠道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 生成行为

Agents 使用 `sessions_spawn` 启动后台 sub-agents。Sub-agent 完成作为内部父会话事件返回；父代理/请求代理决定是否需要面向用户的更新。

<AccordionGroup>
  <Accordion title="非阻塞、基于推送的完成">
    - `sessions_spawn` 是非阻塞的；它会立即返回运行 ID。
    - 完成后，子代理会向父/请求者会话报告。
    - 需要子结果的代理回合应在生成所需工作后调用 `sessions_yield`。这将结束当前回合，并允许完成事件作为下一条模型可见的消息到达。
    - 完成是基于推送的。一旦生成，请**不要**在循环中轮询 `/subagents list`、`sessions_list` 或 `sessions_history` 以等待其完成；仅在按需调试时检查状态。
    - 子输出是供请求者代理综合的报告/证据。它不是用户编写的指令文本，不能覆盖系统、开发者或用户策略。
    - 完成后，OpenClaw 会尽力关闭由该子代理会话打开的已跟踪浏览器标签页/进程，然后再继续公告清理流程。

  </Accordion>
  <Accordion title="补全交付">
    - OpenClaw 通过具有稳定幂等密钥的 `agent` 轮次将补全交还给请求者会话。
    - 如果请求者运行仍处于活动状态，OpenClaw 会首先尝试唤醒/引导该运行，而不是启动第二条可见的回复路径。
    - 如果无法唤醒活动的请求者，OpenClaw 将回退到具有相同补全上下文的请求者代理移交，而不是丢弃通知。
    - 即使父级决定不需要可见的用户更新，成功的父级移交也意味着子代理交付完成。
    - 原生子代理不会获得消息工具。它们向父级/请求者代理返回纯助手文本；人类可见的回复由父级/请求者代理的常规交付策略所有。
    - 如果无法使用直接移交，它将回退到队列路由。
    - 如果队列路由仍然不可用，则在最终放弃之前，会以短指数退避重试该通知。
    - 补全交付保留已解析的请求者路由：线程绑定或对话绑定的补全路由在可用时优先；如果补全源仅提供渠道，OpenClaw 会从请求者会话的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填充缺失的目标/账户，以便直接交付仍然有效。

  </Accordion>
  <Accordion title="完成交接元数据">
    传递给请求者会话的完成交接是运行时生成的
    内部上下文（非用户编写的文本），包括：

    - `Result` — 来自子级的最新可见 `assistant` 回复文本。工具/toolResult 输出不会提升到子级结果中。终端失败运行不会重用捕获的回复文本。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`。
    - 紧凑的运行时/token 统计信息。
    - 审查指令，告诉请求者代理在决定原始任务是否完成之前验证结果。
    - 后续指导，告诉请求者代理在子级结果留有更多操作时继续任务或记录后续行动。
    - 针对无更多操作路径的最终更新指令，以正常助手语气编写，不转发原始内部元数据。

  </Accordion>
  <Accordion title="模式和 ACP 运行时">
    - `--model` 和 `--thinking` 会覆盖该特定运行的默认设置。
    - 使用 `info`/`log` 在完成后检查详细信息和输出。
    - 对于持久化的线程绑定会话，请将 `sessions_spawn` 与 `thread: true` 和 `mode: "session"` 结合使用。
    - 如果请求者渠道不支持线程绑定，请使用 `mode: "run"`CLI，而不是重试不可能实现的线程绑定组合。
    - 对于 ACP 驱动程序会话（Claude Code、Gemini CLI、OpenCode 或显式的 Codex ACP/acpx），当该工具声明支持该运行时时，请使用带有 `runtime: "acp"` 的 `sessions_spawn`。在调试补全或代理到代理循环时，请参阅 [ACP 交付模型](/zh/tools/acp-agents#delivery-model)。当启用 `codex` 插件时，除非用户明确要求 ACP/acpx，否则 Codex 聊天/线程控制应优先选择 `/codex ...` 而非 ACP。
    - OpenClaw 会隐藏 `runtime: "acp"`，直到启用 ACP、请求者未被沙箱隔离，并且加载了 `acpx` 等后端插件。`runtime: "acp"` 需要一个外部 ACP 驱动程序 ID，或一个带有 `runtime.type="acp"` 的 `agents.list[]` 条目；对于来自 `agents_list` 的普通 OpenClaw 配置代理，请使用默认的子代理运行时。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理启动时是隔离的，除非调用者明确要求分叉当前记录。

| 模式       | 何时使用                                                               | 行为                                                                  |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `isolated` | 新的研究、独立实现、慢速工具工作，或可以在任务文本中简要说明的任何内容 | 创建一个干净的子记录。这是默认设置，并且可以保持较低的 Token 使用量。 |
| `fork`     | 依赖于当前对话、先前工具结果或请求者记录中已存在的细微指令的工作       | 在子进程开始之前，将请求者记录分支到子会话中。                        |

请谨慎使用 `fork`。它适用于上下文相关的委托，而不是编写清晰任务提示的替代方案。

## 工具：`sessions_spawn`

使用 `deliver: false` 在全局 `subagent` 通道上启动子代理运行，
然后运行公告步骤，并将公告回复发布到请求者
聊天渠道。

可用性取决于调用者的有效工具策略。`coding` 和
`full` 配置文件默认暴露 `sessions_spawn`。`messaging` 配置文件
则不包含；对于应该委派工作的智能体，请添加 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。频道/群组、提供商、沙箱以及每个智能体的允许/拒绝策略
仍可在配置文件阶段之后移除该工具。使用同一会话中的 `/tools` 来确认有效工具列表。

**默认值：**

- **模型：** 除非您设置了 `agents.defaults.subagents.model`（或每个智能体的 `agents.list[].subagents.model`），否则原生子智能体将继承调用者的模型。ACP 运行时生成的实例如果存在配置的子智能体模型，则使用该模型；否则 ACP harness 将保持其自身的默认值。显式的 `sessions_spawn.model` 仍然优先。
- **思考：** 除非您设置了 `agents.defaults.subagents.thinking`（或每个智能体的 `agents.list[].subagents.thinking`），否则原生子智能体将继承调用者的思考模式。ACP 运行时生成的实例还会对所选模型应用 `agents.defaults.models["provider/model"].params.thinking`。显式的 `sessions_spawn.thinking` 仍然优先。
- **运行超时：** 如果设置了 `agents.defaults.subagents.runTimeoutSeconds`，OpenClaw 将使用该值；否则将回退到 `0`（无超时）。`sessions_spawn` 不接受每次调用的超时覆盖。
- **任务交付：** 原生子智能体在其第一条可见的 `[Subagent Task]` 消息中接收委派的任务。子智能体系统提示词包含运行时规则和路由上下文，而不是隐藏的任务副本。

接受的原生子智能体生成操作会在工具结果中包含解析后的子模型元数据：
`resolvedModel` 包含应用的模型引用，
`resolvedProvider` 包含提供商前缀（如果引用有前缀）。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 仅控制提示指导；它不会更改工具策略或强制执行委派。

- `suggest`（默认）：保留针对较大或较慢工作使用子智能体的标准提示引导。
- `prefer`：指示主代理保持响应，并通过 `sessions_spawn` 将比直接回复更复杂的任何事项进行委派。

每个代理的覆盖使用 `agents.list[].subagents.delegationMode`。

```json5
{
  agents: {
    defaults: {
      subagents: {
        delegationMode: "prefer",
        maxConcurrent: 4,
      },
    },
    list: [
      {
        id: "coordinator",
        subagents: { delegationMode: "prefer" },
      },
    ],
  },
}
```

### 工具参数

<ParamField path="task" type="string" required>
  子代理的任务描述。
</ParamField>
<ParamField path="taskName" type="string">
  可选的稳定句柄，用于在后续的状态输出中标识特定的子项。必须匹配 `[a-z][a-z0-9_-]{0,63}`，且不能是 `last` 或 `all` 等保留目标。
</ParamField>
<ParamField path="label" type="string">
  可选的可读标签。
</ParamField>
<ParamField path="agentId" type="string">
  当 `subagents.allowAgents` 允许时，在另一个已配置的代理 ID 下生成。
</ParamField>
<ParamField path="cwd" type="string">
  子运行的可选任务工作目录。原生子代理仍从目标代理工作区加载引导文件；`cwd` 仅更改运行时工具和 CLI 线束执行委派工作的位置。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 仅适用于外部 ACP 线束（`claude`、`droid`、`gemini`、`opencode` 或明确请求的 Codex ACP/acpx）以及 `agents.list[]` 条目中 `runtime.type` 为 `acp` 的情况。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  仅限 ACP。当 `runtime: "acp"` 时恢复现有的 ACP 线束会话；对于原生子代理生成将被忽略。
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
<ParamField path="thread" type="boolean" default="false">
  当 `true` 时，请求为此子代理会话进行渠道线程绑定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略了 `thread: true` 和 `mode`，默认值变为 `session`。`mode: "session"` 需要 `thread: true`。
  如果请求渠道无法使用线程绑定，请改用 `mode: "run"`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在公告后立即归档（仍通过重命名保留记录）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 拒绝生成，除非目标子运行时是沙箱隔离的。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 将请求者当前的记录分支到子会话中。仅限原生子代理。线程绑定的生成默认为 `fork`；非线程生成默认为 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不**接受渠道传递参数（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。原生子代理将其 最新的助手轮次报告给请求者；外部传递则保留在 父代理/请求者代理处。</Warning>

### 任务名称和定位

`taskName` 是供编排使用的面向模型的句柄，而非会话密钥。
当协调器稍后可能需要检查该子代时，请将其用于稳定的子代名称，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目标解析接受精确的 `taskName` 匹配项和无歧义的
前缀。匹配范围限定为与编号 `/subagents` 目标使用的相同活动/近期目标窗口，因此
陈旧的已完成的子代不会导致重用的句柄产生歧义。如果两个活动或近期的子代共享相同的
`taskName`，则该目标具有歧义；请改用列表索引、会话密钥或
运行 ID。

保留目标 `last` 和 `all` 不是有效的 `taskName` 值，
因为它们已具有控制含义。

## 工具：`sessions_yield`

结束当前的模型回合并等待运行时事件（主要是
子代理完成事件）作为下一条消息到达。在
生成所需的子代理工作之后使用它，当请求者在这些完成到达之前
无法生成最终答案时。

`sessions_yield` 是等待原语。不要仅仅为了检测子代完成而用针对
`subagents`、`sessions_list`、`sessions_history`、shell
`sleep` 或进程的轮询循环来替换它。

仅当会话的有效工具列表包含 `sessions_yield` 时才使用它。某些最小化或自定义工具配置文件可能会暴露 `sessions_spawn` 和
`subagents` 而不暴露 `sessions_yield`；在这种情况下，请勿
仅仅为了等待完成而发明一个轮询循环。

当存在活跃的子会话时，OpenClaw 会向正常轮次中注入一个紧凑的运行时生成的
OpenClaw`Active Subagents` 提示块，以便请求者无需轮询即可查看
当前的子会话、运行 ID、状态、标签、任务和
`taskName` 别名。该块中的任务和标签字段作为数据引用，而非指令，
因为它们可能源自用户/模型提供的生成参数。

## 工具：`subagents`

列出请求者会话拥有的已生成的子代理运行。其范围限定
于当前请求者；子进程只能看到其自己控制的子进程。

使用 `subagents` 进行按需状态检查和调试。使用 `sessions_yield`
等待完成事件。

## 线程绑定会话

当为渠道启用了线程绑定时，子代理可以保持与
线程的绑定，以便该线程中的后续用户消息继续路由到
同一个子代理会话。

### 支持线程的渠道

任何具有会话绑定适配器的渠道都可以支持持久的
线程绑定子代理会话（带有 `thread: true`DiscordMatrixTelegram 的 `sessions_spawn`）。
捆绑的适配器目前包括 Discord 线程、Matrix 线程、
Telegram 论坛主题以及飞书的当前对话绑定。
使用每个渠道的 `threadBindings` 配置键进行启用、
超时设置和 `spawnSessions`。

### 快速流程

<Steps>
  <Step title="生成">带有 `thread: true` 的 `sessions_spawn`（以及可选的 `mode: "session"`）。</Step>
  <Step title="绑定" OpenClaw>
    OpenClaw 在活动渠道中创建或绑定一个线程到该会话目标。
  </Step>
  <Step title="路由后续消息">该线程中的回复和后续消息会路由到绑定的会话。</Step>
  <Step title="检查超时">使用 `/session idle` 检查/更新非活动自动取消聚焦并 使用 `/session max-age` 控制硬性上限。</Step>
  <Step title="分离">使用 `/unfocus` 进行手动分离。</Step>
</Steps>

### 手动控制

| 命令               | 效果                                                 |
| ------------------ | ---------------------------------------------------- |
| `/focus <target>`  | 将当前线程（或创建一个）绑定到子代理/会话目标        |
| `/unfocus`         | 移除当前绑定线程的绑定                               |
| `/agents`          | 列出活跃运行和绑定状态（`thread:<id>` 或 `unbound`） |
| `/session idle`    | 检查/更新空闲自动取消聚焦（仅限聚焦的绑定线程）      |
| `/session max-age` | 检查/更新硬性上限（仅限聚焦的绑定线程）              |

### 配置开关

- **全局默认值：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **频道覆盖和生成自动绑定键** 因适配器而异。请参阅上方的 [Thread supporting channels](#thread-supporting-channels)。

有关当前适配器的详细信息，请参阅 [Configuration reference](/zh/gateway/configuration-reference) 和
[Slash commands](/zh/tools/slash-commands)。

### 白名单

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可通过显式 `agentId` 定位的已配置代理 ID 列表（`["*"]` 允许任何已配置的目标）。默认值：仅请求者代理。如果您设置了列表但仍希望请求者通过 `agentId` 自行生成，请将请求者 ID 包含在列表中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  当请求者代理未设置自己的 `subagents.allowAgents` 时使用的默认已配置目标代理允许列表。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件）。每代理覆盖：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  网关 `agent` 公告传递尝试的每次调用超时。值为正整数毫秒，并被钳制到平台安全计时器最大值。瞬态重试可能会使总公告等待时间长于一个配置的超时。
</ParamField>

如果请求者会话处于沙箱隔离状态，`sessions_spawn` 将拒绝以非沙箱隔离方式运行的目标。

### 设备发现

使用 `agents_list` 查看当前允许用于 `sessions_spawn` 的 agent ID。响应包含每个列出的 agent 的有效模型和嵌入的运行时元数据，以便调用者可以区分 OpenClaw、Codex app-server 和其他配置的本地运行时。

`allowAgents` 条目必须指向 `agents.list[]` 中已配置的 agent ID。`["*"]` 意味着任何已配置的目标 agent 加上请求者。如果删除了 agent 配置但其 ID 仍保留在 `allowAgents` 中，则 `sessions_spawn` 将拒绝该 ID，并且 `agents_list` 将将其省略。运行 `openclaw doctor --fix` 以清理过时的允许列表条目，或者在目标应在继承默认值的同时保持可生成时，添加一个最小的 `agents.list[]` 条目。

### 自动归档

- 子代理会话在 `agents.defaults.subagents.archiveAfterMinutes` 后会自动归档（默认为 `60`）。
- 归档使用 `sessions.delete` 并将脚本重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 在 announce 后立即归档（仍通过重命名保留脚本）。
- 自动归档是尽力而为的；如果网关重启，挂起的计时器将丢失。
- 配置的运行超时并**不**会自动归档；它们只是停止运行。该会话将保留直到自动归档。
- 自动归档同样适用于深度 1 和深度 2 的会话。
- 浏览器清理与归档清理是分开的：当运行完成时，被跟踪的浏览器标签/进程会被尽力关闭，即使对话记录/会话记录被保留。

## 嵌套子代理

默认情况下，子代理无法生成其自己的子代理
(`maxSpawnDepth: 1`)。设置 `maxSpawnDepth: 2` 以启用一级嵌套 —— 即 **编排器模式 (orchestrator pattern)**：主代理 → 编排器子代理 →
工作者子子代理。

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn (0 = no timeout)
        announceTimeoutMs: 120000, // per-call gateway announce timeout
      },
    },
  },
}
```

### 深度级别

| 深度 | 会话键结构                                   | 角色                              | 能否生成？                |
| ---- | -------------------------------------------- | --------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                            | 始终                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（当允许深度 2 时为编排器） | 仅当 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（叶子工作器）            | 从不                      |

### 宣布链

结果沿链向上回流：

1. 深度 2 工作器完成 → 向其父级（深度 1 编排器）宣布。
2. 深度 1 编排器接收宣布，综合结果，完成 → 向主代理宣布。
3. 主代理接收公告并交付给用户。

每一层只能看到其直接子级的公告。

<Note>
  **操作指南：** 启动子任务一次并等待完成事件，而不是围绕 `sessions_list`、`sessions_history`、`/subagents list` 或 `exec` sleep 命令构建轮询循环。 `sessions_list` 和 `/subagents list` 使子会话关系专注于实时工作——实时子项保持附加，已结束的子项在最近的短时间内保持可见，而陈旧的仅存储子链接在其新鲜度窗口后被忽略。这可以防止旧的 `spawnedBy` / `parentSessionKey`
  元数据在重启后复活幽灵子项。如果子完成事件在您已经发送最终答案后到达，正确的后续操作是确切的静默令牌 `NO_REPLY` / `no_reply`。
</Note>

### 按深度划分的工具策略

- 角色和控制范围在生成时写入会话元数据。这可以防止扁平化或恢复的会话密钥意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）：** 获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以生成子项并检查其状态。其他会话/系统工具仍然被拒绝。
- **深度 1（叶子，当 `maxSpawnDepth == 1` 时）：** 没有会话工具（当前默认行为）。
- **深度 2（叶子工作器）：** 没有会话工具——`sessions_spawn` 在深度 2 处始终被拒绝。无法生成更多的子项。

### 每个代理的生成限制

每个代理会话（在任何深度）一次最多可以有 `maxChildrenPerAgent`（默认 `5`）个活动子项。这可以防止单个编排器出现失控的扇出。

### 级联停止

停止深度 1 编排器会自动停止其所有深度 2
子级：

- 主聊天中的 `/stop` 会停止所有深度 1 的代理并级联到它们的深度 2 子项。

## 身份验证

子代理身份验证由 **代理 ID** 解析，而非由会话类型：

- 子代理会话密钥是 `agent:<agentId>:subagent:<uuid>`。
- 身份验证存储是从该代理的 `agentDir` 加载的。
- 主代理的身份验证配置文件作为 **后备** 合并；如果发生冲突，代理配置文件会覆盖主配置文件。

合并是累加的，因此主配置文件始终可用作后备。目前尚不支持每个代理的完全隔离的身份验证。

## 通告

子代理通过通告步骤进行回报：

- 通告步骤在子代理会话（而非请求者会话）内部运行。
- 如果子代理完全回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新的助手文本是确切的静默令牌 `NO_REPLY` / `no_reply`，则即使存在早期可见的进度，也会抑制公告输出。

交付取决于请求者深度：

- 顶层请求者会话使用带有外部传递 (`deliver=true`) 的后续 `agent` 调用。
- 嵌套的请求者子代理会话接收内部后续注入 (`deliver=false`)，以便编排器可以在会话内综合子结果。
- 如果嵌套的请求者子代理会话已消失，OpenClaw 会在可用时回退到该会话的请求者。

对于顶级请求者会话，完成模式直接交付首先解析任何绑定的对话/线程路由和挂钩覆盖，然后从请求者会话的存储路由中填充缺失的渠道目标字段。这可以确保即使完成源仅标识了渠道，完成内容也会保留在正确的聊天/主题上。

在构建嵌套完成发现时，子完成聚合范围限定为当前请求者运行，从而防止过时的先前运行的子输出泄漏到当前的通告中。当渠道适配器可用时，通告回复会保留线程/主题路由。

### 通告上下文

通告上下文被规范化为一个稳定的内部事件块：

| 字段     | 来源                                                                                    |
| -------- | --------------------------------------------------------------------------------------- |
| 来源     | `subagent` 或 `cron`                                                                    |
| 会话 ID  | 子会话密钥/ID                                                                           |
| 类型     | 通告类型 + 任务标签                                                                     |
| 状态     | 源自运行时结果 (`success`, `error`, `timeout`, 或 `unknown`) —— **而非** 从模型文本推断 |
| 结果内容 | 来自子级的最新可见助手文本                                                              |
| 后续跟进 | 描述何时回复与保持静默的指令                                                            |

终止失败的运行会报告失败状态，而不会重放捕获的
回复文本。工具/toolResult 输出不会被提升到子级结果文本中。

### 统计行

公告负载在末尾包含一行统计信息（即使被换行）：

- 运行时 (例如 `runtime 5m12s`)。
- Token 使用量（输入/输出/总计）。
- 配置了模型定价时的估算成本 (`models.providers.*.models[].cost`)。
- `sessionKey`、`sessionId` 和转录路径，以便主代理可以通过 `sessions_history` 获取历史记录或检查磁盘上的文件。

内部元数据仅供编排使用；面向用户的回复
应以正常的助手口吻重写。

### 为何优先使用 `sessions_history`

`sessions_history` 是更安全的编排路径：

- 助手回忆首先会被标准化：去除 thinking 标签；去除 `<relevant-memories>` / `<relevant_memories>` 脚手架；去除纯文本工具调用 XML 载荷块 (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`)，包括无法干净关闭的截断载荷；去除降级的工具调用/结果脚手架和历史上下文标记；去除泄漏的模型控制令牌 (`<|assistant|>`, 其他 ASCII `<|...|>`, 全角 `<｜...｜>`)；去除格式错误的 MiniMax 工具调用 XML。
- 类似凭证/Token 的文本会被编辑。
- 长块可能会被截断。
- 非常大的历史记录可能会丢弃旧行，或者用 `[sessions_history omitted: message too large]` 替换过大的行。
- 当您需要逐字节完整的抄本时，原始磁盘抄本检查是备选方案。

## 工具策略

Sub-agents 首先使用与父代理或目标代理相同的配置文件和工具策略管道。在此之后，OpenClaw 会应用子代理限制层。

在没有限制性的 `tools.profile` 的情况下，子代理将获得**除消息工具、会话工具和系统工具以外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` 在此处仍然是一个有界的、经过净化的召回视图——它不是原始的记录转储。

当 `maxSpawnDepth >= 2` 时，深度为 1 的编排器子代理还会接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理其子级。

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

`tools.subagents.tools.allow` 是一个最终的仅允许过滤器。它可以缩小已解析的工具集，但不能“加回”被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。要让编码配置文件的子代理使用浏览器自动化，请在配置文件阶段添加 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

当只有一个代理应该获得浏览器自动化时，请使用按代理划分的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 并发

Sub-agents 使用专用的进程内队列通道：

- **通道名称：** `subagent`
- **并发数：** `agents.defaults.subagents.maxConcurrent`（默认为 `8`）

## 活跃度与恢复

OpenClaw 不会将缺少 OpenClaw`endedAt` 视为子代理仍然存活的永久证明。超过停滞运行窗口的未结束运行将不再计入 `/subagents list`、状态摘要、后代完成阻塞和每个会话的并发检查中的活动/待处理状态。

网关重启后，除非其子会话被标记为 `abortedLastRun: true`，否则会修剪停滞的未结束恢复运行。那些因重启而中止的子会话仍可通过子代理孤立恢复流程进行恢复，该流程在清除中止标记之前会发送一条合成恢复消息。

自动重启恢复受每个子会话的限制。如果同一个子代理子级在快速重新楔入窗口内被重复接受进行孤立恢复，OpenClaw 将在该会话上持久化一个恢复墓碑，并在随后的重启中停止自动恢复它。运行 OpenClaw`openclaw tasks maintenance --apply` 以协调任务记录，或运行 `openclaw doctor --fix` 以清除已标记墓碑的会话上的停滞中止恢复标志。

<Note>
  如果子代理生成失败，并出现 Gateway Gateway(网关)`PAIRING_REQUIRED` / `scope-upgrade`RPC，请在编辑配对状态前检查 RPC 调用方。 内部 `sessions_spawn` 协调应作为 `client.id: "gateway-client"` 并携带 `client.mode: "backend"`CLI 通过直接 环回共享令牌/密码身份验证进行连接；该路径不依赖于 CLI 的配对设备范围基线。远程调用方、显式 `deviceIdentity`、显式设备令牌路径以及浏览器/node 客户端
  仍然需要正常的设备批准以进行范围升级。
</Note>

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话并停止从其生成的任何活动的子代理运行，并级联到嵌套的子项。

## 限制

- 子代理公告是**尽力而为** 的。如果网关重启，挂起的“回传公告”工作将丢失。
- 子代理仍然共享同一个网关进程资源；将 `maxConcurrent` 视为安全阀。
- `sessions_spawn` 始终是非阻塞的：它立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文仅注入 `AGENTS.md` 和 `TOOLS.md`（不包含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。Codex 原生子代理遵循相同的边界：`TOOLS.md` 保留在继承的 Codex 线程指令中，而仅限父级的人设、身份和用户文件作为回合范围的协作指令注入，以便子项不会克隆它们。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，建议深度为 2。
- `maxChildrenPerAgent` 限制每个会话的活动子项数量（默认 `5`，范围 `1–20`）。

## 相关内容

- [ACP agents](/zh/tools/acp-agents)
- [Agent send](/zh/tools/agent-send)
- [Background tasks](/zh/automation/tasks)
- [Multi-agent sandbox tools](/zh/tools/multi-agent-sandbox-tools)
