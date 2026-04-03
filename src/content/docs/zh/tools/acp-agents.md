---
summary: "使用 ACP 运行时会话来运行 Codex、Claude Code、Cursor、Gemini CLI、OpenClaw ACP 及其他工具代理"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理"
---

# ACP 代理

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话允许 OpenClaw 通过 ACP 后端插件运行外部编码工具（例如 Pi、Claude Code、Codex、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI 和其他受支持的 ACPX 工具）。

如果你用自然语言要求 OpenClaw“在 Codex 中运行此命令”或“在线程中启动 Claude Code”，OpenClaw 应将该请求路由到 ACP 运行时（而不是原生子代理运行时）。每个 ACP 会话的生成都被跟踪为[后台任务](/en/automation/tasks)。

如果你希望 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到现有的 OpenClaw 渠道会话，请使用 [`openclaw mcp serve`](/en/cli/mcp) 而不是 ACP。

## Fast operator flow

当你需要实用的 `/acp` 操作手册时，请使用以下方法：

1. 生成会话：
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. 在绑定的会话或主题中工作（或明确指定该会话密钥作为目标）。
3. 检查运行时状态：
   - `/acp status`
4. 根据需要调整运行时选项：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 在不替换上下文的情况下推动活动会话：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel`（停止当前轮次），或
   - `/acp close`（关闭会话 + 移除绑定）

## 快速开始 for humans

自然请求示例：

- "将此 Discord 渠道绑定到 Codex。"
- "在此处的主题中启动一个持久的 Codex 会话并保持其专注。"
- "将此作为一次性 Claude Code ACP 会话运行并总结结果。"
- "将此 iMessage 聊天绑定到 Codex，并将后续跟进保持在同一工作区中。"
- "在该主题中使用 Gemini CLI 完成此任务，然后将后续跟进保持在同一主题中。"

OpenClaw 应该做什么：

1. 选择 `runtime: "acp"`。
2. 解析请求的工具目标（`agentId`，例如 `codex`）。
3. 如果请求了当前会话绑定且活动渠道支持，则将 ACP 会话绑定到该会话。
4. 否则，如果请求了主题绑定且当前渠道支持，则将 ACP 会话绑定到该主题。
5. 将后续绑定消息路由到同一个 ACP 会话，直到其失去焦点/关闭/过期。

## ACP versus sub-agents

当您需要外部工具运行时，请使用 ACP。当您需要 OpenClaw 原生委托运行时，请使用 sub-agents。

| 领域     | ACP 会话                                   | Sub-agent 运行                    |
| -------- | ------------------------------------------ | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）                  | OpenClaw 原生 sub-agent 运行时    |
| 会话密钥 | `agent:<agentId>:acp:<uuid>`               | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                                 | `/subagents ...`                  |
| 生成工具 | 使用 `sessions_spawn` 配合 `runtime:"acp"` | `sessions_spawn`（默认运行时）    |

另请参阅[子代理](/en/tools/subagents)。

## 绑定会话

### 当前对话绑定

当你希望当前会话成为持久的 ACP 工作区而不创建子线程时，请使用 `/acp spawn <harness> --bind here`。

行为：

- OpenClaw 继续拥有传输、身份验证、安全和递送的所有权。
- 当前对话固定到生成的 ACP 会话密钥。
- 该对话中的后续消息路由到同一个 ACP 会话。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭会话并移除当前对话的绑定。

实际意义：

- `--bind here` 保持相同的聊天界面。在 Discord 上，当前渠道保持为当前渠道。
- `--bind here` 如果您正在启动新工作，仍然可以创建新的 ACP 会话。该绑定将会话附加到当前对话。
- `--bind here` 不会自行创建子 Discord 线程或 Telegram 话题。
- ACP 运行时仍然可以拥有自己的工作目录 (`cwd`) 或后端管理的磁盘工作区。该运行时工作区与聊天界面分离，并不意味着新的消息线程。

心智模型：

- 聊天界面：人们持续交谈的地方 (`Discord channel`, `Telegram topic`, `iMessage chat`)
- ACP 会话：OpenClaw 路由到的持久 Codex/Claude/Gemini 运行时状态
- 子线程/话题：仅由 `--thread ...` 创建的可选额外消息界面
- 运行时工作区：工具运行的文件系统位置 (`cwd`, 仓库检出, 后端工作区)

示例：

- `/acp spawn codex --bind here`：保留此聊天，生成或附加 Codex ACP 会话，并将此处的未来消息路由到该会话
- `/acp spawn codex --thread auto`：OpenClaw 可能会创建子线程/话题并在那里绑定 ACP 会话
- `/acp spawn codex --bind here --cwd /workspace/repo`：与上述聊天绑定相同，但 Codex 运行在 `/workspace/repo` 中

当前对话绑定支持：

- 宣称支持当前对话绑定的聊天/消息渠道可以通过共享的对话绑定路径使用 `--bind here`。
- 具有自定义线程/主题语义的渠道仍然可以在同一共享接口后提供特定于渠道的规范化。
- `--bind here` 始终意味着“就地绑定当前对话”。
- 通用当前对话绑定使用共享的 OpenClaw 绑定存储，并在正常网关重启后保留。

注意：

- `--bind here` 和 `--thread ...` 在 `/acp spawn` 上是互斥的。
- 在 Discord 上，`--bind here` 就地绑定当前渠道或线程。仅当 OpenClaw 需要为 `--thread auto|here` 创建子线程时，才需要 `spawnAcpSessions`。
- 如果活动渠道未暴露当前对话 ACP 绑定，OpenClaw 会返回明确的“不支持”消息。
- `resume` 和“新会话”问题是 ACP 会话问题，而不是渠道问题。您可以在不更改当前聊天界面的情况下重用或替换运行时状态。

### 线程绑定会话

当为渠道适配器启用线程绑定时，ACP 会话可以绑定到线程：

- OpenClaw 将线程绑定到目标 ACP 会话。
- 该线程中的后续消息将路由到绑定的 ACP 会话。
- ACP 输出将传送回同一线程。
- 失去焦点/关闭/归档/空闲超时或最大期限到期将移除绑定。

线程绑定支持取决于适配器。如果活动渠道适配器不支持线程绑定，OpenClaw 会返回明确的“不支持/不可用”消息。

线程绑定 ACP 所需的功能标志：

- `acp.enabled=true`
- `acp.dispatch.enabled` 默认开启（设置 `false` 以暂停 ACP 调度）
- 渠道适配器 ACP 线程生成标志已启用（特定于适配器）
  - Discord： `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram： `channels.telegram.threadBindings.spawnAcpSessions=true`

### 支持线程的渠道

- 任何公开会话/线程绑定功能的渠道适配器。
- 当前内置支持：
  - Discord 线程/频道
  - Telegram 话题（群组/超级群组中的论坛话题和私信话题）
- 插件渠道可以通过相同的绑定接口添加支持。

## 渠道特定设置

对于非临时工作流，请在顶级 `bindings[]` 条目中配置持久的 ACP 绑定。

### 绑定模型

- `bindings[].type="acp"` 标记一个持久的 ACP 会话绑定。
- `bindings[].match` 标识目标会话：
  - Discord 渠道或话题： `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 论坛话题： `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles 私信/群聊： `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    为稳定的群组绑定，优先使用 `chat_id:*` 或 `chat_identifier:*`。
  - iMessage 私信/群聊： `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    为稳定的群组绑定，优先使用 `chat_id:*`。
- `bindings[].agentId` 是所属的 OpenClaw 代理 ID。
- 可选的 ACP 覆盖设置位于 `bindings[].acp` 下：
  - `mode` （`persistent` 或 `oneshot`）
  - `label`
  - `cwd`
  - `backend`

### 每个代理的运行时默认值

使用 `agents.list[].runtime` 为每个代理定义一次 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` （工具 ID，例如 `codex` 或 `claude`）
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

ACP 绑定会话的覆盖优先级：

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全局 ACP 默认值（例如 `acp.backend`）

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

行为：

- OpenClaw 确保在使用前已配置 ACP 会话。
- 该渠道或主题中的消息将路由到已配置的 ACP 会话。
- 在绑定会话中，`/new` 和 `/reset` 会原位重置同一个 ACP 会话密钥。
- 临时运行时绑定（例如由线程聚焦流程创建）在存在时仍然适用。

## 启动 ACP 会话（接口）

### 来自 `sessions_spawn`

使用 `runtime: "acp"` 从代理回合或工具调用启动 ACP 会话。

```json
{
  "task": "Open the repo and summarize failing tests",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

注意：

- `runtime` 默认为 `subagent`，因此请为 ACP 会话显式设置 `runtime: "acp"`。
- 如果省略 `agentId`，OpenClaw 在配置时将使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 来保持持久的绑定会话。

接口详情：

- `task`（必填）：发送到 ACP 会话的初始提示。
- `runtime`（ACP 必填）：必须是 `"acp"`。
- `agentId`（可选）：ACP 目标 harness ID。如果已设置，则回退到 `acp.defaultAgent`。
- `thread`（可选，默认 `false`）：在支持的地方请求线程绑定流程。
- `mode`（可选）：`run`（一次性）或 `session`（持久）。
  - 默认为 `run`
  - 如果省略 `thread: true` 和 mode，OpenClaw 可能会根据运行时路径默认为持久行为
  - `mode: "session"` 需要 `thread: true`
- `cwd`（可选）：请求的运行时工作目录（由后端/运行时策略验证）。
- `label`（可选）：在会话/横幅文本中使用的面向操作员的标签。
- `resumeSessionId`（可选）：恢复现有的 ACP 会话而不是创建新会话。代理通过 `session/load` 重放其对话历史。需要 `runtime: "acp"`。
- `streamTo`（可选）：`"parent"` 将初始 ACP 运行进度摘要作为系统事件流式传输回请求者会话。
  - 可用时，接受的响应包括 `streamLogPath`，指向会话范围的 JSONL 日志 (`<sessionId>.acp-stream.jsonl`)，您可以对其进行尾随以获取完整的转发历史记录。

### 恢复现有会话

使用 `resumeSessionId` 继续之前的 ACP 会话，而不是重新开始。代理通过 `session/load` 回放其对话历史，因此它能够获取之前的完整上下文。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常见用例：

- 将 Codex 会话从笔记本电脑移交给手机 —— 告诉您的 Agent 从中断的地方继续
- 继续您在 CLI 中以交互方式开始的编码会话，现在通过 Agent 以无头方式继续
- 接续因网关重启或空闲超时而中断的工作

注意事项：

- `resumeSessionId` 需要 `runtime: "acp"` —— 如果与子代理运行时一起使用，将返回错误。
- `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然正常应用于您正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目标代理必须支持 `session/load`（Codex 和 Claude Code 支持）。
- 如果找不到会话 ID，生成将失败并返回明确的错误 —— 不会静默回退到新会话。

### 操作员冒烟测试

在网关部署后使用此功能，当您想要快速实时检查 ACP 生成
是否真的端到端工作时，而不仅仅是通过单元测试。

建议的关卡：

1. 验证目标主机上部署的网关版本/提交。
2. 确认部署的源代码包含 ACP 世系接受，位于
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`) 中。
3. 打开一个到实时代理的临时 ACPX 桥接会话（例如
   `razor(main)` 上的 `jpclawhq`）。
4. 请求该代理调用 `sessions_spawn` 并提供以下内容：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 验证 Agent 报告：
   - `accepted=yes`
   - 一个真正的 `childSessionKey`
   - 没有验证器错误
6. 清理临时 ACPX 桥接会话。

向实时 Agent 发送的提示示例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

注：

- 请将此冒烟测试保留在 `mode: "run"` 上，除非您正在有意测试
  线程绑定的持久 ACP 会话。
- 对于基本网关，不要要求 `streamTo: "parent"`。该路径取决于
  请求者/会话的能力，并且是一个单独的集成检查。
- 将线程绑定的 `mode: "session"` 测试视为第二阶段、更丰富的集成
  过程，从真正的 Discord 线程或 Telegram 话题进行。

## 沙箱兼容性

ACP 会话当前在主机运行时上运行，而不是在 OpenClaw 沙箱内部。

当前限制：

- 如果请求者会话处于沙箱隔离状态，ACP 生成将被阻止，无论是对于 `sessions_spawn({ runtime: "acp" })` 还是 `/acp spawn`。
  - 错误：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 带有 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。
  - 错误：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

当您需要强制沙箱执行时，请使用 `runtime: "subagent"`。

### 来自 `/acp` 命令

在需要时，使用 `/acp spawn` 从聊天中进行显式操作员控制。

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --bind here
/acp spawn codex --thread here
```

关键标志：

- `--mode persistent|oneshot`
- `--bind here|off`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

请参阅 [Slash Commands](/en/tools/slash-commands)。

## 会话目标解析

大多数 `/acp` 操作都接受一个可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

解析顺序：

1. 显式目标参数（或针对 `/acp steer` 的 `--session`）
   - 尝试键
   - 然后是 UUID 形状的会话 ID
   - 然后是标签
2. 当前线程绑定（如果此对话/线程已绑定到 ACP 会话）
3. 当前请求者会话回退

当前对话绑定和线程绑定都参与步骤 2。

如果未解析到任何目标，OpenClaw 会返回一个清晰的错误（`Unable to resolve session target: ...`）。

## 生成绑定模式

`/acp spawn` 支持 `--bind here|off`。

| 模式   | 行为                                           |
| ------ | ---------------------------------------------- |
| `here` | 就地绑定当前活动对话；如果没有活动对话则失败。 |
| `off`  | 不创建当前对话绑定。                           |

备注：

- `--bind here` 是“使此渠道或聊天支持 Codex”的最简单的操作员路径。
- `--bind here` 不会创建子线程。
- `--bind here` 仅在暴露当前会话绑定支持的渠道上可用。
- `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中组合使用。

## 生成线程模式

`/acp spawn` 支持 `--thread auto|here|off`。

| 模式   | 行为                                                              |
| ------ | ----------------------------------------------------------------- |
| `auto` | 在活动线程中：绑定该线程。在线程外：如果支持，则创建/绑定子线程。 |
| `here` | 需要当前活动线程；如果不在其中则失败。                            |
| `off`  | 无绑定。会话以未绑定状态启动。                                    |

备注：

- 在非线程绑定表面上，默认行为实际上是 `off`。
- 线程绑定生成需要渠道策略支持：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`
- 当您想要固定当前对话而不创建子线程时，请使用 `--bind here`。

## ACP 控件

可用的命令族：

- `/acp spawn`
- `/acp cancel`
- `/acp steer`
- `/acp close`
- `/acp status`
- `/acp set-mode`
- `/acp set`
- `/acp cwd`
- `/acp permissions`
- `/acp timeout`
- `/acp model`
- `/acp reset-options`
- `/acp sessions`
- `/acp doctor`
- `/acp install`

`/acp status` 显示有效的运行时选项，以及在可用时显示运行时级和后端级的会话标识符。

某些控件取决于后端功能。如果后端不支持某个控件，OpenClaw 会返回一个明确的“不支持控件”错误。

## ACP 命令指南

| 命令                 | 作用                                     | 示例                                                          |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选当前绑定或线程绑定。  | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话的进行中轮次。               | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向正在运行的会话发送引导指令。           | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解除线程目标绑定。             | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、功能。 | `/acp status`                                                 |
| `/acp set-mode`      | 为目标会话设置运行时模式。               | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置选项写入。                 | `/acp set model openai/gpt-5.2`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                 | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置审批策略配置文件。                   | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                   | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                     | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                 | `/acp reset-options`                                          |
| `/acp sessions`      | 列出存储中最近的 ACP 会话。              | `/acp sessions`                                               |
| `/acp doctor`        | 后端健康状态、功能、可执行的修复。       | `/acp doctor`                                                 |
| `/acp install`       | 打印确定性的安装和启用步骤。             | `/acp install`                                                |

`/acp sessions` 读取当前绑定或请求者会话的存储。接受 `session-key`、`session-id` 或 `session-label` 令牌的命令通过网关会话发现来解析目标，包括自定义的每代理 `session.store` 根目录。

## 运行时选项映射

`/acp` 具有便捷命令和通用设置器。

等效操作：

- `/acp model <id>` 映射到运行时配置键 `model`。
- `/acp permissions <profile>` 映射到运行时配置键 `approval_policy`。
- `/acp timeout <seconds>` 映射到运行时配置键 `timeout`。
- `/acp cwd <path>` 直接更新运行时 cwd 覆盖。
- `/acp set <key> <value>` 是通用路径。
  - 特殊情况：`key=cwd` 使用 cwd 覆盖路径。
- `/acp reset-options` 清除目标会话的所有运行时覆盖。

## acpx harness 支持列表（当前）

当前 acpx 内置 harness 别名：

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI：`cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

当 OpenClaw 使用 acpx 后端时，除非您的 acpx 配置定义了自定义代理别名，否则优先为 `agentId` 使用这些值。
如果您的本地 Cursor 安装仍将 ACP 暴露为 `agent acp`，请在您的 acpx 配置中覆盖 `cursor` 代理命令，而不是更改内置默认值。

直接使用 acpx CLI 也可以通过 `--agent <command>` 定位任意适配器，但这个原始逃生舱是 acpx CLI 的一项功能（不是正常的 OpenClaw `agentId` 路径）。

## 必需配置

ACP 核心基线：

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "pi", "qwen"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

线程绑定配置特定于渠道适配器。Discord 示例：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnAcpSessions: true,
      },
    },
  },
}
```

如果线程绑定的 ACP 生成不起作用，请先验证适配器功能标志：

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

当前对话绑定不需要创建子线程。它们需要一个活动的对话上下文和一个暴露 ACP 对话绑定的渠道适配器。

请参阅 [配置参考](/en/gateway/configuration-reference)。

## acpx 后端的插件设置

安装并启用插件：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

开发期间的本地工作区安装：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然后验证后端运行状况：

```text
/acp doctor
```

### acpx 命令和版本配置

默认情况下，捆绑的 acpx 后端插件 (`acpx`) 使用插件本地固定的二进制文件：

1. 命令默认为 ACPX 插件包内的插件本地 `node_modules/.bin/acpx`。
2. 预期版本默认为扩展固定版本。
3. 启动时会立即将 ACP 后端注册为未就绪状态。
4. 后台确保作业会验证 `acpx --version`。
5. 如果插件本地二进制文件丢失或匹配错误，它将运行：
   `npm install --omit=dev --no-save acpx@<pinned>` 并重新验证。

您可以在插件配置中覆盖命令/版本：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

注意：

- `command` 接受绝对路径、相对路径或命令名称 (`acpx`)。
- 相对路径从 OpenClaw 工作区目录开始解析。
- `expectedVersion: "any"` 禁用严格版本匹配。
- 当 `command` 指向自定义二进制文件/路径时，插件本地自动安装将被禁用。
- 在运行后端运行状况检查期间，OpenClaw 启动保持非阻塞状态。

请参阅 [插件](/en/tools/plugin)。

### 自动依赖安装

当您使用 `npm install -g openclaw` 全局安装 OpenClaw 时，acpx 运行时依赖项（特定平台的二进制文件）会通过 postinstall 钩子自动安装。如果自动安装失败，网关仍会正常启动，并通过 `openclaw acp doctor` 报告缺失的依赖项。

### 插件工具 MCP 桥接

默认情况下，ACPX 会话 **不会** 将 OpenClaw 插件注册的工具暴露给 ACP 接口。

如果您希望 ACP 代理（如 Codex 或 Claude Code）调用已安装的 OpenClaw 插件工具（例如记忆调用/存储），请启用专用桥接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用如下：

- 将名为 `openclaw-plugin-tools` 的内置 MCP 服务器注入到 ACPX 会话引导中。
- 暴露已安装并启用的 OpenClaw 插件已注册的插件工具。
- 保持该功能显性且默认关闭。

安全和信任说明：

- 这扩展了 ACP 接口的工具表面。
- ACP 代理只能访问网关中已处于活动状态的插件工具。
- 请将其视为与让这些插件在 OpenClaw 本身中执行相同的信任边界。
- 在启用之前，请检查已安装的插件。

自定义 `mcpServers` 仍像以前一样工作。内置的 plugin-tools 桥接是一个额外的可选便利功能，而非通用 MCP 服务器配置的替代品。

## 权限配置

ACP 会话以非交互方式运行——没有 TTY 来批准或拒绝文件写入和 shell 执行权限提示。acpx 插件提供了两个配置键来控制权限的处理方式：

这些 ACPX 接口权限与 OpenClaw 执行批准是分开的，也与 CLI 后端供应商绕过标志（如 Claude CLI `--permission-mode bypassPermissions`）分开。ACPX `approve-all` 是 ACP 会话的接口级紧急开关。

### `permissionMode`

控制接口代理可以在未经提示的情况下执行哪些操作。

| 值              | 行为                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自动批准所有文件写入和 shell 命令。  |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制当应显示权限提示但没有可用的交互式 TTY 时（这对于 ACP 会话来说始终是这种情况）会发生什么。

| 值     | 行为                                          |
| ------ | --------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**（默认）** |
| `deny` | 静默拒绝权限并继续（优雅降级）。              |

### 配置

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后重启网关。

> **重要：** OpenClaw 目前默认为 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或 exec 操作都可能因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失败。
>
> 如果需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话优雅降级而不是崩溃。

## 故障排除

| 症状                                                                        | 可能原因                                                       | 修复                                                                                                                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 后端插件缺失或已禁用。                                         | 安装并启用后端插件，然后运行 `/acp doctor`。                                                                                                       |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 全局已禁用。                                               | 设置 `acp.enabled=true`。                                                                                                                          |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已禁用从普通线程消息进行调度。                                 | 设置 `acp.dispatch.enabled=true`。                                                                                                                 |
| `ACP agent "<id>" is not allowed by policy`                                 | Agent 不在允许列表中。                                         | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                  |
| `Unable to resolve session target: ...`                                     | 密钥/id/标签令牌错误。                                         | 运行 `/acp sessions`，复制确切的密钥/标签，然后重试。                                                                                              |
| `--bind here requires running /acp spawn inside an active ... conversation` | 在没有活动可绑定对话的情况下使用了 `--bind here`。             | 移动到目标聊天/渠道并重试，或者使用非绑定生成。                                                                                                    |
| `Conversation bindings are unavailable for <channel>.`                      | 适配器缺少当前对话 ACP 绑定功能。                              | 在支持的地方使用 `/acp spawn ... --thread ...`，配置顶级 `bindings[]`，或移动到支持的渠道。                                                        |
| `--thread here requires running /acp spawn inside an active ... thread`     | 在线程上下文之外使用了 `--thread here`。                       | 移动到目标线程或使用 `--thread auto`/`off`。                                                                                                       |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一位用户拥有活动绑定目标。                                   | 以所有者身份重新绑定，或使用不同的对话或线程。                                                                                                     |
| `Thread bindings are unavailable for <channel>.`                            | 适配器缺少线程绑定功能。                                       | 使用 `--thread off` 或移动到支持的适配器/渠道。                                                                                                    |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 运行时位于主机端；请求者会话已沙箱隔离。                   | 从沙箱隔离的会话使用 `runtime="subagent"`，或从非沙箱隔离的会话运行 ACP 生成。                                                                     |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 为 ACP 运行时请求了 `sandbox="require"`。                      | 使用 `runtime="subagent"` 进行所需的沙箱隔离，或在非沙箱隔离的会话中将 ACP 与 `sandbox="inherit"` 一起使用。                                       |
| 绑定会话缺少 ACP 元数据                                                     | 陈旧/已删除的 ACP 会话元数据。                                 | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 阻止在非交互式 ACP 会话中进行写入/执行。      | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启网关。请参阅 [权限配置](#permission-configuration)。                    |
| ACP 会话提前失败且输出很少                                                  | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。 | 检查网关日志中的 `AcpRuntimeError`。要获得完全权限，请设置 `permissionMode=approve-all`；要获得优雅降级，请设置 `nonInteractivePermissions=deny`。 |
| ACP 会话在完成工作后无限期停滞                                              | 工具进程已完成，但 ACP 会话未报告完成。                        | 使用 `ps aux \| grep acpx` 进行监控；手动终止陈旧进程。                                                                                            |
