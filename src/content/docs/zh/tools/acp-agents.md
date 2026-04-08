---
summary: "对 Codex、Claude Code、Cursor、Gemini CLI、OpenClaw ACP 及其他工具代理使用 ACP 运行时会话"
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

如果您用通俗语言要求 OpenClaw“在 Codex 中运行此程序”或“在线程中启动 Claude Code”，OpenClaw 应将该请求路由到 ACP 运行时（而非原生子代理运行时）。每次 ACP 会话的生成都作为[后台任务](/en/automation/tasks)进行跟踪。

如果您希望 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到现有的 OpenClaw 渠道会话，请使用 [`openclaw mcp serve`](/en/cli/mcp) 而不是 ACP。

## 我需要哪个页面？

这里有三个容易混淆的相似界面：

| 您想要...                                                           | 使用此                        | 备注                                                                                   |
| ------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| _通过_ CLI 运行 Codex、Claude Code、Gemini OpenClaw 或其他外部工具  | 本页面：ACP 代理              | 聊天绑定会话，`/acp spawn`，`sessions_spawn({ runtime: "acp" })`，后台任务，运行时控制 |
| 将 OpenClaw Gateway(网关) 会话*作为*编辑器或客户端的 ACP 服务器公开 | [`openclaw acp`](/en/cli/acp) | 桥接模式。IDE/客户端通过 stdio/WebSocket 以 ACP 协议与 OpenClaw 通信                   |

## 这是开箱即用的吗？

通常是的。

- 全新安装现在默认启用随附的 `acpx` 运行时插件。
- 随附的 `acpx` 插件优先使用其插件本地的固定 `acpx` 二进制文件。
- 启动时，OpenClaw 会探测该二进制文件，并在需要时自行修复。
- 如果您想进行快速就绪检查，请从 `/acp doctor` 开始。

首次使用时可能发生的情况：

- 首次使用该工具时，可能会通过 `npx` 按需获取目标工具适配器。
- 针对该工具的供应商身份验证仍然必须存在于主机上。
- 如果主机没有 npm/网络访问权限，首次运行的适配器获取可能会失败，直到缓存预热或适配器通过其他方式安装。

示例：

- `/acp spawn codex`：OpenClaw 应该准备好引导 `acpx`，但 Codex ACP 适配器可能仍需要首次运行获取。
- `/acp spawn claude`：Claude ACP 适配器的情况相同，此外在该主机上还需要 Claude 端的身份验证。

## 快速操作流程

当您需要一个实用的 `/acp` 运维手册时使用此方法：

1. 生成一个会话：
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. 在绑定的对话或线程中工作（或显式以该会话密钥为目标）。
3. 检查运行时状态：
   - `/acp status`
4. 根据需要调整运行时选项：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 在不替换上下文的情况下激活会话：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel`（停止当前轮次），或
   - `/acp close`（关闭会话 + 移除绑定）

## 面向人类的快速入门

自然语言请求示例：

- "将此 Discord 渠道绑定到 Codex。"
- "在此处的线程中启动一个持久的 Codex 会话并保持其专注。"
- "将其作为一次性 Claude Code ACP 会话运行并总结结果。"
- "将此 iMessage 聊天绑定到 Codex，并将后续跟进保持在同一工作区中。"
- "在线程中使用 Gemini CLI 完成此任务，然后将后续跟进保持在同一线程中。"

OpenClaw 应该执行的操作：

1. 选择 `runtime: "acp"`。
2. 解析请求的 harness 目标（`agentId`，例如 `codex`）。
3. 如果请求了当前对话绑定且活动渠道支持，则将 ACP 会话绑定到该对话。
4. 否则，如果请求了线程绑定且当前渠道支持，则将 ACP 会话绑定到该线程。
5. 将后续绑定的消息路由到同一个 ACP 会话，直到其失焦/关闭/过期。

## ACP 与子代理

当您需要外部 harness 运行时时，请使用 ACP。当您需要 OpenClaw 原生委托运行时，请使用子代理。

| 领域     | ACP 会话                            | 子代理运行                        |
| -------- | ----------------------------------- | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）           | OpenClaw 原生子代理运行时         |
| 会话密钥 | `agent:<agentId>:acp:<uuid>`        | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                          | `/subagents ...`                  |
| 生成工具 | `sessions_spawn` 与 `runtime:"acp"` | `sessions_spawn`（默认运行时）    |

另请参阅 [Sub-agents](/en/tools/subagents)。

## ACP 如何运行 Claude Code

对于通过 ACP 运行的 Claude Code，技术栈如下：

1. OpenClaw ACP 会话控制平面
2. 捆绑的 `acpx` 运行时插件
3. Claude ACP 适配器
4. Claude 端运行时/会话机制

重要区别：

- ACP Claude 是一个具有 ACP 控制、会话恢复、后台任务跟踪和可选会话/线程绑定的工具会话。
  对于操作员来说，实用规则是：

- 如果需要 `/acp spawn`、可绑定会话、运行时控制或持久化工具工作：请使用 ACP

## 绑定会话

### 当前会话绑定

当你希望当前对话成为持久的 ACP 工作区而不创建子线程时，请使用 `/acp spawn <harness> --bind here`。

行为：

- OpenClaw 保留对渠道传输、身份验证、安全和交付的所有权。
- 当前对话被固定到生成的 ACP 会话密钥。
- 该对话中的后续消息将路由到同一个 ACP 会话。
- `/new` 和 `/reset` 就地重置同一个绑定的 ACP 会话。
- `/acp close` 关闭会话并移除当前会话绑定。

这意味着在实际操作中：

- `--bind here` 保持相同的聊天界面。在 Discord 上，当前渠道保持为当前渠道。
- 如果你正在启动新的工作，`--bind here` 仍然可以创建一个新的 ACP 会话。该绑定将该会话附加到当前对话。
- `--bind here` 不会自行创建子 Discord 线程或 Telegram 话题。
- ACP 运行时仍然可以拥有自己的工作目录 (`cwd`) 或后端管理的磁盘工作区。该运行时工作区与聊天界面分离，并不暗示新的消息线程。
- 如果您派生到不同的 ACP 代理且未传递 `--cwd`，OpenClaw 默认继承**目标代理的**工作区，而非请求者的工作区。
- 如果该继承的工作区路径缺失（`ENOENT`/`ENOTDIR`），OpenClaw 将回退到后端默认 cwd，而不是静默重用错误的目录树。
- 如果继承的工作区存在但无法访问（例如 `EACCES`），派生将返回真实的访问错误，而不是丢弃 `cwd`。

心智模型：

- 聊天界面：人们持续交谈的地方（`Discord channel`、`Telegram topic`、`iMessage chat`）
- ACP 会话：OpenClaw 路由到的持久 Codex/Claude/Gemini 运行时状态
- 子线程/话题：仅由 `--thread ...` 创建的可选额外消息界面
- 运行时工作区：线束运行的文件系统位置（`cwd`、repo checkout、后端工作区）

示例：

- `/acp spawn codex --bind here`：保留此聊天，派生或附加 Codex ACP 会话，并将未来的消息路由到此会话
- `/acp spawn codex --thread auto`：OpenClaw 可能会创建子线程/话题并将 ACP 会话绑定到此处
- `/acp spawn codex --bind here --cwd /workspace/repo`：与上述相同的聊天绑定，但 Codex 在 `/workspace/repo` 中运行

当前会话绑定支持：

- 提供当前会话绑定支持的聊天/消息渠道可以通过共享的会话绑定路径使用 `--bind here`。
- 具有自定义线程/话题语义的渠道仍可在同一共享接口后提供特定渠道的规范化处理。
- `--bind here` 始终表示“原地绑定当前会话”。
- 通用当前会话绑定使用共享的 OpenClaw 绑定存储，并在正常的网关重启后保留。

注意：

- `--bind here` 和 `--thread ...` 在 `/acp spawn` 上互斥。
- 在 Discord 上，`--bind here` 就地绑定当前的渠道或主题。仅当 OpenClaw 需要为 `--thread auto|here` 创建子主题时，才需要 `spawnAcpSessions`。
- 如果活动渠道未公开当前对话的 ACP 绑定，OpenClaw 将返回一条明确的不支持消息。
- `resume` 和“新会话”问题是 ACP 会话问题，而非渠道问题。您可以在不更改当前聊天界面的情况下重用或替换运行时状态。

### 主题绑定会话

当为渠道适配器启用主题绑定时，ACP 会话可以绑定到主题：

- OpenClaw 将主题绑定到目标 ACP 会话。
- 该主题中的后续消息将路由到绑定的 ACP 会话。
- ACP 输出将传回同一个主题。
- 失焦/关闭/归档/空闲超时或最长存续时间到期将移除绑定。

主题绑定支持取决于适配器。如果活动渠道适配器不支持主题绑定，OpenClaw 将返回一条明确的不支持/不可用消息。

主题绑定 ACP 所需的功能标志：

- `acp.enabled=true`
- `acp.dispatch.enabled` 默认开启（设置 `false` 以暂停 ACP 分发）
- 渠道适配器 ACP 主题生成标志已启用（特定于适配器）
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

### 支持主题的渠道

- 任何公开会话/主题绑定功能的渠道适配器。
- 当前内置支持：
  - Discord 主题/渠道
  - Telegram 话题（群组/超级群组中的论坛话题以及私信话题）
- 插件渠道可以通过相同的绑定接口添加支持。

## 渠道特定设置

对于非临时工作流，请在顶级 `bindings[]` 条目中配置持久性 ACP 绑定。

### 绑定模型

- `bindings[].type="acp"` 标记持久性 ACP 对话绑定。
- `bindings[].match` 标识目标对话：
  - Discord 渠道或主题：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 论坛话题：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles 私信/群组聊天：`match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    对于稳定的群组绑定，建议使用 `chat_id:*` 或 `chat_identifier:*`。
  - iMessage 私信/群组聊天：`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    对于稳定的群组绑定，建议使用 `chat_id:*`。
- `bindings[].agentId` 是拥有者 OpenClaw 代理 ID。
- 可选的 ACP 覆盖设置位于 `bindings[].acp` 下：
  - `mode` (`persistent` 或 `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### 每个代理的运行时默认值

使用 `agents.list[].runtime` 为每个代理定义一次 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id，例如 `codex` 或 `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

ACP 绑定会话的覆盖优先级：

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. 全局 ACP 默认值 (例如 `acp.backend`)

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

- OpenClaw 确保配置的 ACP 会话在使用前已存在。
- 该渠道或主题中的消息会路由到配置的 ACP 会话。
- 在绑定的对话中，`/new` 和 `/reset` 会就地重置相同的 ACP 会话密钥。
- 临时运行时绑定（例如由线程关注流程创建的）在存在的地方仍然适用。
- 对于没有显式 `cwd` 的跨代理 ACP 生成，OpenClaw 会从代理配置继承目标代理工作区。
- 缺失的继承工作区路径会回退到后端默认 cwd；非缺失的访问失败将显示为生成错误。

## 启动 ACP 会话（接口）

### 从 `sessions_spawn`

使用 `runtime: "acp"` 从代理轮次或工具调用启动 ACP 会话。

```json
{
  "task": "Open the repo and summarize failing tests",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

说明：

- `runtime` 默认为 `subagent`，因此请为 ACP 会话显式设置 `runtime: "acp"`。
- 如果省略 `agentId`，OpenClaw 在配置时将使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 来保持持久绑定对话。

接口详细信息：

- `task`（必需）：发送到 ACP 会话的初始提示。
- `runtime`（ACP 必需）：必须是 `"acp"`。
- `agentId`（可选）：ACP 目标工具 ID。如果设置，则回退到 `acp.defaultAgent`。
- `thread`（可选，默认为 `false`）：在支持的情况下请求线程绑定流。
- `mode`（可选）：`run`（一次性）或 `session`（持久）。
  - 默认为 `run`
  - 如果省略 `thread: true` 和模式，OpenClaw 可能会根据运行时路径默认为持久行为
  - `mode: "session"` 需要 `thread: true`
- `cwd`（可选）：请求的运行时工作目录（由后端/运行时策略验证）。如果省略，ACP 生成在配置时继承目标代理工作区；缺少的继承路径回退到后端默认值，而返回实际的访问错误。
- `label`（可选）：在会话/横幅文本中使用的面向操作员的标签。
- `resumeSessionId`（可选）：恢复现有的 ACP 会话而不是创建新会话。代理通过 `session/load` 重放其对话历史。需要 `runtime: "acp"`。
- `streamTo`（可选）：`"parent"` 将初始 ACP 运行进度摘要作为系统事件流回传给请求者会话。
  - 如果可用，接受的响应包括 `streamLogPath`，指向会话范围的 JSONL 日志 (`<sessionId>.acp-stream.jsonl`)，您可以跟踪该日志以获取完整的转发历史记录。

### 恢复现有会话

使用 `resumeSessionId` 继续之前的 ACP 会话，而不是重新开始。代理通过 `session/load` 重放其对话历史，因此它能获取之前发生的全部上下文。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常见用例：

- 将 Codex 会话从笔记本电脑转移到手机——告诉您的代理从您上次离开的地方继续
- 继续您在 CLI 中以交互方式开始的编码会话，现在通过您的代理以无头方式继续
- 恢复因网关重启或空闲超时而中断的工作

注意事项：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果与子代理运行时一起使用，则返回错误。
- `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然正常适用于您正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目标代理必须支持 `session/load`（Codex 和 Claude Code 支持）。
- 如果找不到会话 ID，生成操作将失败并显示明确的错误——不会静默回退到新会话。

### 冒烟测试

在网关部署后，当您想快速实时检查 ACP 生成
是否真正端到端工作，而不仅仅是通过单元测试时，请使用此方法。

建议的检查点：

1. 验证目标主机上部署的网关版本/提交。
2. 确认部署的源代码包含 ACP 世系接受在
   `src/gateway/sessions-patch.ts`（`subagent:* or acp:* sessions`）中。
3. 打开一个到实时代理的临时 ACPX 桥接会话（例如
   `razor(main)` 上的 `jpclawhq`）。
4. 要求该代理调用 `sessions_spawn` 并使用：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - 任务：`Reply with exactly LIVE-ACP-SPAWN-OK`
5. 验证代理报告：
   - `accepted=yes`
   - 一个真实的 `childSessionKey`
   - 无验证器错误
6. 清理临时 ACPX 桥接会话。

向实时代理发送提示示例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

注意事项：

- 请保持此冒烟测试在 `mode: "run"` 上，除非您有意测试
  线程绑定的持久 ACP 会话。
- 不要为基本关卡要求 `streamTo: "parent"`。该路径取决于
  请求者/会话能力，并且是一个单独的集成检查。
- 将线程绑定的 `mode: "session"` 测试视为第二次、更丰富的集成
  过程，从真实的 Discord 线程或 Telegram 话题中进行。

## 沙箱兼容性

ACP 会话当前在主机运行时上运行，而不是在 OpenClaw 沙箱内运行。

当前限制：

- 如果请求者会话处于沙箱隔离状态，则会阻止 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 的 ACP 生成。
  - 错误：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 带有 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。
  - 错误：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

当需要沙箱强制执行时，请使用 `runtime: "subagent"`。

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

请参阅 [斜杠命令](/en/tools/slash-commands)。

## 会话目标解析

大多数 `/acp` 操作都接受一个可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

解析顺序：

1. 显式目标参数（或 `/acp steer` 的 `--session`）
   - 尝试密钥
   - 然后是 UUID 形状的会话 ID
   - 然后是标签
2. 当前线程绑定（如果此对话/线程绑定到 ACP 会话）
3. 当前请求者会话回退

当前对话绑定和线程绑定都参与第 2 步。

如果未解析到目标，OpenClaw 将返回一个清晰的错误（`Unable to resolve session target: ...`）。

## 生成绑定模式

`/acp spawn` 支持 `--bind here|off`。

| 模式   | 行为                                               |
| ------ | -------------------------------------------------- |
| `here` | 在原位绑定当前活动对话；如果没有活动对话，则失败。 |
| `off`  | 不要创建当前对话绑定。                             |

注意：

- `--bind here` 是“使此渠道或聊天支持 Codex”的最简单操作路径。
- `--bind here` 不会创建子线程。
- `--bind here` 仅在暴露当前会话绑定支持的渠道上可用。
- `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中组合使用。

## 生成线程模式

`/acp spawn` 支持 `--thread auto|here|off`。

| 模式   | 行为                                                              |
| ------ | ----------------------------------------------------------------- |
| `auto` | 在活动线程中：绑定该线程。在线程外：如果支持，则创建/绑定子线程。 |
| `here` | 需要当前活动线程；如果不在活动线程中则失败。                      |
| `off`  | 无绑定。会话在未绑定状态下启动。                                  |

备注：

- 在非线程绑定界面上，默认行为实际上是 `off`。
- 线程绑定生成需要渠道策略支持：
  - Discord： `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram： `channels.telegram.threadBindings.spawnAcpSessions=true`
- 当您想要固定当前对话而不创建子线程时，请使用 `--bind here`。

## ACP 控件

可用的命令系列：

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

`/acp status` 显示有效的运行时选项，如果可用，还会显示运行时级和后端级的会话标识符。

某些控件取决于后端功能。如果后端不支持某个控件，OpenClaw 会返回明确的“不支持控件”错误。

## ACP 命令指南

| 命令                 | 作用                                     | 示例                                                          |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选当前绑定或线程绑定。  | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话进行中的轮次。               | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向运行中的会话发送引导指令。             | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解除线程绑定目标。             | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、功能。 | `/acp status`                                                 |
| `/acp set-mode`      | 设置目标会话的运行时模式。               | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置选项写入。                 | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                 | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置批准策略配置文件。                   | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                   | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                     | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                 | `/acp reset-options`                                          |
| `/acp sessions`      | 列出存储中最近的 ACP 会话。              | `/acp sessions`                                               |
| `/acp doctor`        | 后端健康状况、功能、可执行的修复。       | `/acp doctor`                                                 |
| `/acp install`       | 打印确定性安装和启用步骤。               | `/acp install`                                                |

`/acp sessions` 会读取当前绑定或请求者会话的存储。接受 `session-key`、`session-id` 或 `session-label` 令牌的命令通过网关会话发现来解析目标，包括自定义的每个代理 `session.store` 根目录。

## 运行时选项映射

`/acp` 提供便捷命令和通用设置器。

等效操作：

- `/acp model <id>` 映射到运行时配置键 `model`。
- `/acp permissions <profile>` 映射到运行时配置键 `approval_policy`。
- `/acp timeout <seconds>` 映射到运行时配置键 `timeout`。
- `/acp cwd <path>` 直接更新运行时 cwd 覆盖设置。
- `/acp set <key> <value>` 是通用路径。
  - 特殊情况：`key=cwd` 使用 cwd 覆盖路径。
- `/acp reset-options` 清除目标会话的所有运行时覆盖设置。

## acpx 约束支持（当前）

当前的 acpx 内置约束别名：

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI: `cursor-agent acp`)
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

当 OpenClaw 使用 acpx 后端时，除非您的 acpx 配置定义了自定义代理别名，否则请优先使用 `agentId` 的这些值。
如果您的本地 Cursor 安装仍将 ACP 暴露为 `agent acp`，请在您的 acpx 配置中覆盖 `cursor` 代理命令，而不是更改内置默认值。

直接使用 acpx CLI 也可以通过 `--agent <command>` 定位任意适配器，但该原始逃生舱口是 acpx CLI 的功能（而不是正常的 OpenClaw `agentId` 路径）。

## 必需配置

核心 ACP 基线：

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

如果线程绑定的 ACP 生成不起作用，请首先验证适配器功能标志：

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

当前对话绑定不需要创建子线程。它们需要活动的对话上下文和暴露 ACP 对话绑定的渠道适配器。

参见[配置参考](/en/gateway/configuration-reference)。

## acpx 后端的插件设置

全新安装默认启用捆绑的 `acpx` 运行时插件，因此 ACP
通常无需手动安装插件步骤即可工作。

从以下开始：

```text
/acp doctor
```

如果您禁用了 `acpx`，通过 `plugins.allow` / `plugins.deny` 拒绝了它，或者想要
切换到本地开发签出版本，请使用显式插件路径：

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
2. 期望的版本默认为扩展的固定版本。
3. 启动时立即将 ACP 后端注册为未就绪。
4. 后台确保作业会验证 `acpx --version`。
5. 如果插件本地二进制文件缺失或版本不匹配，它将运行：
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

注意事项：

- `command` 接受绝对路径、相对路径或命令名称 (`acpx`)。
- 相对路径从 OpenClaw 工作区目录解析。
- `expectedVersion: "any"` 禁用严格的版本匹配。
- 当 `command` 指向自定义二进制文件/路径时，插件本地自动安装将被禁用。
- OpenClaw 启动在运行后端健康检查时保持非阻塞状态。

请参阅 [Plugins](/en/tools/plugin)。

### 自动依赖项安装

当您使用 `npm install -g openclaw` 全局安装 OpenClaw 时，acpx
运行时依赖项（特定平台的二进制文件）会通过
postinstall 钩子自动安装。如果自动安装失败，网关仍会
正常启动并通过 `openclaw acp doctor` 报告缺失的依赖项。

### 插件工具 MCP 桥接

默认情况下，ACPX 会话**不会**将 OpenClaw 插件注册的工具
暴露给 ACP 驱动程序。

如果您希望 ACP 代理（如 Codex 或 Claude Code）调用已安装的
OpenClaw 插件工具（例如内存调用/存储），请启用专用桥接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用如下：

- 将名为 `openclaw-plugin-tools` 的内置 MCP 服务器注入到 ACPX 会话
  引导过程中。
- 暴露已安装并启用的 OpenClaw
  插件已注册的插件工具。
- 保持该功能显式且默认关闭。

安全性和信任说明：

- 这扩展了 ACP harness 工具表面。
- ACP 代理只能访问网关中已激活的插件工具。
- 请将其视为与允许这些插件在 OpenClaw 本身中执行相同的信任边界。
- 在启用之前，请查看已安装的插件。

自定义 `mcpServers` 仍像以前一样工作。内置的 plugin-tools bridge 是一项额外的可选便利功能，并非通用 MCP 服务器配置的替代品。

## 权限配置

ACP 会话以非交互方式运行 — 没有用于批准或拒绝文件写入和 shell 执行权限提示的 TTY。acpx 插件提供了两个控制如何处理权限的配置键：

这些 ACPX harness 权限与 OpenClaw exec 批准是分开的，也与 CLI-backend 供应商绕过标志（如 Claude CLI `--permission-mode bypassPermissions`）分开。ACPX `approve-all` 是 ACP 会话的 harness 级应急开关。

### `permissionMode`

控制 harness 代理可以在不提示的情况下执行哪些操作。

| 值              | 行为                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自动批准所有文件写入和 Shell 命令。  |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制在将显示权限提示但没有可用的交互式 TTY 时会发生什么（对于 ACP 会话，情况总是如此）。

| 值     | 行为                                        |
| ------ | ------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**(默认)** |
| `deny` | 静默拒绝权限并继续（优雅降级）。            |

### 配置

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后重启网关。

> **重要提示：** OpenClaw 目前默认为 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失败。
>
> 如果需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话能够优雅降级而不是崩溃。

## 故障排除

| 症状                                                                        | 可能原因                                                       | 修复方法                                                                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 后端插件缺失或已禁用。                                         | 安装并启用后端插件，然后运行 `/acp doctor`。                                                                                                       |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 已全局禁用。                                               | 设置 `acp.enabled=true`。                                                                                                                          |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已禁用从普通线程消息进行调度。                                 | 设置 `acp.dispatch.enabled=true`。                                                                                                                 |
| `ACP agent "<id>" is not allowed by policy`                                 | 代理不在允许列表中。                                           | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                  |
| `Unable to resolve session target: ...`                                     | 错误的 key/id/label 标记。                                     | 运行 `/acp sessions`，复制确切的 key/label，然后重试。                                                                                             |
| `--bind here requires running /acp spawn inside an active ... conversation` | 在没有活动可绑定会话的情况下使用了 `--bind here`。             | 移动到目标聊天/渠道并重试，或使用非绑定生成。                                                                                                      |
| `Conversation bindings are unavailable for <channel>.`                      | 适配器缺少当前会话 ACP 绑定功能。                              | 在支持的地方使用 `/acp spawn ... --thread ...`，配置顶级 `bindings[]`，或移动到支持的渠道。                                                        |
| `--thread here requires running /acp spawn inside an active ... thread`     | 在线程上下文之外使用了 `--thread here`。                       | 移动到目标线程或使用 `--thread auto`/`off`。                                                                                                       |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 活动绑定目标由另一个用户拥有。                                 | 以所有者身份重新绑定，或使用不同的会话或线程。                                                                                                     |
| `Thread bindings are unavailable for <channel>.`                            | 适配器缺少线程绑定功能。                                       | 使用 `--thread off` 或移动到支持的适配器/渠道。                                                                                                    |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 运行时位于主机端；请求者会话处于沙箱隔离状态。             | 从沙箱隔离会话使用 `runtime="subagent"`，或从非沙箱隔离会话运行 ACP 生成。                                                                         |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | 为 ACP 运行时请求了 `sandbox="require"`。                      | 使用 `runtime="subagent"` 进行所需的沙箱隔离，或者在非沙箱隔离会话中使用带有 `sandbox="inherit"` 的 ACP。                                          |
| 绑定会话缺少 ACP 元数据                                                     | ACP 会话元数据过期/已删除。                                    | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 在非交互式 ACP 会话中阻止写入/执行。          | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启网关。请参阅 [权限配置](#permission-configuration)。                    |
| ACP 会话很快失败且输出很少                                                  | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。 | 检查网关日志中的 `AcpRuntimeError`。要获取完整权限，请设置 `permissionMode=approve-all`；要实现优雅降级，请设置 `nonInteractivePermissions=deny`。 |
| ACP 会话在完成工作后无限期停滞                                              | Harness 进程已完成，但 ACP 会话未报告完成。                    | 使用 `ps aux \| grep acpx` 监控；手动终止陈旧进程。                                                                                                |
