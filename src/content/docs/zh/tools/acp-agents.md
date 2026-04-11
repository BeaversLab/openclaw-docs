---
summary: "对 Codex、Claude Code、Cursor、Gemini CLI、OpenClaw ACP 及其他 harness 代理使用 ACP 运行时会话"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理"
---

# ACP 代理

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话允许 OpenClaw 通过 ACP 后端插件运行外部编码工具（例如 Pi、Claude Code、Codex、Cursor、Copilot、OpenClaw ACP、OpenCode、Gemini CLI 及其他受支持的 ACPX 工具）。

如果您用自然语言要求 OpenClaw“在 Codex 中运行此操作”或“在线程中启动 Claude Code”，OpenClaw 应将该请求路由到 ACP 运行时（而非原生子代理运行时）。每次 ACP 会话的生成都被跟踪为[后台任务](/en/automation/tasks)。

如果您希望 Codex 或 Claude Code 作为外部 MCP 客户端直接连接到现有的 OpenClaw 渠道对话，请使用 [`openclaw mcp serve`](/en/cli/mcp) 而非 ACP。

## 我需要哪个页面？

这里有三个容易混淆的相似界面：

| 您想要...                                                           | 使用此                               | 备注                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| _通过_ CLI 运行 Codex、Claude Code、Gemini OpenClaw 或其他外部工具  | 本页面：ACP 代理                     | 聊天绑定会话，`/acp spawn`，`sessions_spawn({ runtime: "acp" })`，后台任务，运行时控制 |
| 将 OpenClaw Gateway(网关) 会话*作为*编辑器或客户端的 ACP 服务器公开 | [`openclaw acp`](/en/cli/acp)        | 桥接模式。IDE/客户端通过 stdio/WebSocket 以 ACP 协议与 OpenClaw 通信                   |
| 将本地 AI CLI 重用为纯文本回退模型                                  | [CLI 后端](/en/gateway/cli-backends) | 非 ACP。无 OpenClaw 工具，无 ACP 控制，无工具运行时                                    |

## 这能开箱即用吗？

通常可以。

- 全新安装现在默认启用随附的 `acpx` 运行时插件。
- 随附的 `acpx` 插件优先使用其插件本地的固定 `acpx` 二进制文件。
- 启动时，OpenClaw 会探测该二进制文件并在需要时自行修复。
- 如果您想进行快速的就绪检查，请从 `/acp doctor` 开始。

首次使用时仍可能发生的情况：

- 第一次使用该工具时，可能会使用 `npx` 按需获取目标工具适配器。
- 该工具的供应商身份验证仍必须存在于主机上。
- 如果主机没有 npm/网络访问权限，首次运行的适配器获取可能会失败，直到缓存预热或通过其他方式安装适配器。

示例：

- `/acp spawn codex`：OpenClaw 应该准备好引导 `acpx`，但 Codex ACP 适配器可能仍需要首次运行的获取。
- `/acp spawn claude`：Claude ACP 适配器的情况相同，此外还需要在该主机上进行 Claude 端的身份验证。

## 快速操作流程

当您需要一个实用的 `/acp` 操作手册时使用此方法：

1. 生成一个会话：
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. 在绑定的对话或线程中工作（或者显式定位该会话密钥）。
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

## 快速开始指南

自然请求示例：

- “将此 Discord 渠道绑定到 Codex。”
- “在此处的线程中启动一个持久的 Codex 会话并保持其专注。”
- “将其作为一次性 Claude Code ACP 会话运行并总结结果。”
- “将此 iMessage 聊天绑定到 Codex，并将后续跟进保留在同一工作区中。”
- “在线程中使用 Gemini CLI 完成此任务，然后在该同一线程中继续跟进。”

OpenClaw 应该执行的操作：

1. 选择 `runtime: "acp"`。
2. 解析请求的 harness 目标（`agentId`，例如 `codex`）。
3. 如果请求了当前对话绑定且活动渠道支持，则将 ACP 会话绑定到该对话。
4. 否则，如果请求了线程绑定且当前渠道支持，则将 ACP 会话绑定到该线程。
5. 将后续的绑定消息路由到同一个 ACP 会话，直到其失去焦点/关闭/过期。

## ACP 与子代理

当您需要外部 harness 运行时时，请使用 ACP。当您需要 OpenClaw 原生委托运行时，请使用子代理。

| 领域     | ACP 会话                              | 子代理运行                        |
| -------- | ------------------------------------- | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）             | OpenClaw 原生子代理运行时         |
| 会话密钥 | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                            | `/subagents ...`                  |
| 生成工具 | `sessions_spawn` 搭配 `runtime:"acp"` | `sessions_spawn`（默认运行时）    |

另请参阅 [子代理](/en/tools/subagents)。

## ACP 如何运行 Claude Code

对于通过 ACP 运行的 Claude Code，技术栈如下：

1. OpenClaw ACP 会话控制平面
2. 捆绑的 `acpx` 运行时插件
3. Claude ACP 适配器
4. Claude 端运行时/会话机制

重要区别：

- ACP Claude 是一个具有 ACP 控制、会话恢复、后台任务跟踪以及可选对话/线程绑定的套接会话。
- CLI 后端是独立的纯文本本地后备运行时。请参阅 [CLI 后端](/en/gateway/cli-backends)。

对于操作员来说，实用的规则是：

- 如果需要 `/acp spawn`、可绑定会话、运行时控制或持久化套接工作：请使用 ACP
- 如果希望通过原始 CLI 进行简单的本地文本回退：请使用 CLI 后端

## 绑定会话

### 当前对话绑定

当您希望当前对话成为持久的 ACP 工作区而不创建子线程时，请使用 `/acp spawn <harness> --bind here`。

行为：

- OpenClaw 仍拥有渠道传输、身份验证、安全和投递权。
- 当前对话被固定到生成的 ACP 会话密钥。
- 该对话中的后续消息将路由到同一个 ACP 会话。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭会话并移除当前对话的绑定。

这在实践中意味着：

- `--bind here` 保持相同的聊天界面。在 Discord 上，当前渠道仍然是当前渠道。
- 如果您正在启动新工作，`--bind here` 仍然可以创建新的 ACP 会话。绑定将该会话附加到当前对话。
- `--bind here` 本身不会创建子 Discord 线程或 Telegram 主题。
- ACP 运行时仍然可以拥有自己的工作目录（`cwd`）或由后端管理的磁盘工作区。该运行时工作区与聊天界面是分开的，并不意味着新的消息传递线程。
- 如果您派生到另一个 ACP 代理且未传递 `--cwd`，OpenClaw 默认继承**目标代理的**工作区，而不是请求者的工作区。
- 如果该继承的工作区路径缺失（`ENOENT`/`ENOTDIR`），OpenClaw 将回退到后端默认 cwd，而不是静默重用错误的树。
- 如果继承的工作区存在但无法访问（例如 `EACCES`），派生将返回真实的访问错误，而不是丢弃 `cwd`。

心智模型：

- chat surface：人们持续交谈的地方（`Discord channel`、`Telegram topic`、`iMessage chat`）
- ACP 会话：OpenClaw 路由到的持久 Codex/Claude/Gemini 运行时状态
- child thread/topic：仅由 `--thread ...` 创建的可选额外消息传递界面
- runtime workspace：工具运行的文件系统位置（`cwd`、repo checkout、backend workspace）

示例：

- `/acp spawn codex --bind here`：保留此聊天，派生或附加 Codex ACP 会话，并将此处的未来消息路由到该会话
- `/acp spawn codex --thread auto`：OpenClaw 可以创建子 thread/topic 并在此处绑定 ACP 会话
- `/acp spawn codex --bind here --cwd /workspace/repo`：与上述聊天绑定相同，但 Codex 在 `/workspace/repo` 中运行

Current-conversation 绑定支持：

- 宣传支持 current-conversation 绑定的聊天/消息渠道可以通过共享的 conversation-binding 路径使用 `--bind here`。
- 具有自定义 thread/topic 语义的渠道仍然可以在同一共享接口后面提供特定于渠道的规范化。
- `--bind here` 始终表示“原地绑定当前对话”。
- 通用 current-conversation 绑定使用共享的 OpenClaw 绑定存储，并且在正常的网关重启后仍然存在。

注：

- `--bind here` 和 `--thread ...` 在 `/acp spawn` 上互斥。
- 在 Discord 上，`--bind here` 会就地绑定当前渠道或线程。仅当 OpenClaw 需要为 `--thread auto|here` 创建子线程时，才需要 `spawnAcpSessions`。
- 如果当前渠道未公开当前会话 ACP 绑定，OpenClaw 将返回一条明确的不支持消息。
- `resume` 和“新会话”问题是 ACP 会话问题，而非渠道问题。您可以复用或替换运行时状态，而无需更改当前聊天界面。

### 线程绑定会话

当为渠道适配器启用线程绑定时，ACP 会话可以绑定到线程：

- OpenClaw 将线程绑定到目标 ACP 会话。
- 该线程中的后续消息将路由到已绑定的 ACP 会话。
- ACP 输出将传回同一线程。
- 失焦/关闭/归档/空闲超时或最大期限过期将移除绑定。

线程绑定支持取决于具体的适配器。如果当前渠道适配器不支持线程绑定，OpenClaw 将返回一条明确的不支持/不可用消息。

线程绑定 ACP 所需的功能标志：

- `acp.enabled=true`
- `acp.dispatch.enabled` 默认开启（设置 `false` 以暂停 ACP 调度）
- 已启用渠道适配器 ACP 线程生成标志（特定于适配器）
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

### 支持线程的渠道

- 任何公开会话/线程绑定功能的渠道适配器。
- 当前内置支持：
  - Discord 线程/渠道
  - Telegram 话题（群组/超级群组中的论坛话题以及私信话题）
- 插件渠道可以通过相同的绑定接口添加支持。

## 特定渠道设置

对于非临时工作流，请在顶层 `bindings[]` 条目中配置持久的 ACP 绑定。

### 绑定模型

- `bindings[].type="acp"` 标记持久的 ACP 会话绑定。
- `bindings[].match` 标识目标会话：
  - Discord 渠道或线程：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 论坛话题：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles 私信/群组聊天：`match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    为了稳定的群组绑定，优先使用 `chat_id:*` 或 `chat_identifier:*`。
  - iMessage 私信/群组聊天：`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    为了稳定的群组绑定，优先使用 `chat_id:*`。
- `bindings[].agentId` 是所属的 OpenClaw 代理 ID。
- 可选的 ACP 覆盖项位于 `bindings[].acp` 之下：
  - `mode`（`persistent` 或 `oneshot`）
  - `label`
  - `cwd`
  - `backend`

### 每个代理的运行时默认值

使用 `agents.list[].runtime` 为每个代理定义一次 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent`（harness id，例如 `codex` 或 `claude`）
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

- OpenClaw 在使用前确保配置的 ACP 会话存在。
- 该渠道或主题中的消息路由到配置的 ACP 会话。
- 在绑定对话中，`/new` 和 `/reset` 会原地重置同一个 ACP 会话密钥。
- 临时运行时绑定（例如由线程聚焦流创建）在存在的地方仍然适用。
- 对于没有明确 `cwd` 的跨代理 ACP 生成，OpenClaw 会从代理配置继承目标代理工作区。
- 缺失的继承工作区路径会回退到后端默认 cwd；非缺失的访问失败会显示为生成错误。

## 启动 ACP 会话（接口）

### 来自 `sessions_spawn`

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

注意：

- `runtime` 默认为 `subagent`，因此请为 ACP 会话显式设置 `runtime: "acp"`。
- 如果省略 `agentId`，OpenClaw 在配置后将使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 来保持持久的绑定会话。

接口详细信息：

- `task`（必需）：发送到 ACP 会话的初始提示。
- `runtime`（ACP 必需）：必须为 `"acp"`。
- `agentId`（可选）：ACP 目标连接线 ID。如果设置，则回退到 `acp.defaultAgent`。
- `thread`（可选，默认 `false`）：在支持的情况下请求线程绑定流程。
- `mode`（可选）：`run`（一次性）或 `session`（持久）。
  - 默认为 `run`
  - 如果省略 `thread: true` 和模式，OpenClaw 可能会根据运行时路径默认为持久性行为
  - `mode: "session"` 需要 `thread: true`
- `cwd`（可选）：请求的运行时工作目录（由后端/运行时策略验证）。如果省略，ACP 生成在配置时继承目标代理工作区；缺少的继承路径回退到后端默认值，而返回实际访问错误。
- `label`（可选）：用于会话/横幅文本的操作员面向标签。
- `resumeSessionId`（可选）：恢复现有的 ACP 会话而不是创建新的。代理通过 `session/load` 重放其对话历史。需要 `runtime: "acp"`。
- `streamTo`（可选）：`"parent"` 将初始 ACP 运行进度摘要作为系统事件流式传输回请求者会话。
  - 如果可用，接受的响应包括 `streamLogPath` 指向会话范围的 JSONL 日志（`<sessionId>.acp-stream.jsonl`），您可以跟踪以获取完整的中继历史记录。

### 恢复现有会话

使用 `resumeSessionId` 继续之前的 ACP 会话，而不是重新开始。代理通过 `session/load` 重放其对话历史，因此它能够获取之前上下文的全部内容。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常见用例：

- 将 Codex 会话从笔记本电脑交接到手机 — 告诉您的代理从您上次中断的地方继续
- 继续您在 CLI 中交互式启动的编码会话，现在通过代理以无头模式进行
- 接续因网关重启或空闲超时而中断的工作

注意：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果与子代理运行时一起使用，将返回错误。
- `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然正常应用于您正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目标代理必须支持 `session/load`（Codex 和 Claude Code 支持）。
- 如果找不到会话 ID，生成会话将失败并返回清晰的错误 — 不会静默回退到新会话。

### 冒烟测试

在部署网关后使用此功能，当您想要快速实时检查 ACP 生成
是否真正端到端工作时，而不仅仅是通过单元测试。

建议的关卡：

1. 验证目标主机上部署的网关版本/提交。
2. 确认部署的源代码在
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`) 中包含 ACP 世系接受。
3. 打开一个到实时代理的临时 ACPX 桥接会话（例如
   `razor(main)` 上的 `jpclawhq`）。
4. 请求该代理调用 `sessions_spawn`，参数如下：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 验证代理报告：
   - `accepted=yes`
   - 一个真实的 `childSessionKey`
   - 无验证器错误
6. 清理临时 ACPX 桥接会话。

向实时代理提示的示例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

注意：

- 请将此冒烟测试保留在 `mode: "run"` 上，除非您有意测试
  线程绑定的持久 ACP 会话。
- 基本网关不需要 `streamTo: "parent"`。该路径取决于
  请求者/会话的能力，并且是一个单独的集成检查。
- 将线程绑定的 `mode: "session"` 测试视为第二次、更丰富的集成
  测试，通过真实的 Discord 线程或 Telegram 话题进行。

## 沙箱兼容性

ACP 会话当前在主机运行时上运行，而不是在 OpenClaw 沙箱内部。

当前限制：

- 如果请求者会话是沙箱隔离的，则 ACP 生成操作对于 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 均被阻止。
  - 错误： `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 具有 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。
  - 错误： `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

当您需要沙箱强制执行时，请使用 `runtime: "subagent"`。

### 从 `/acp` 命令

需要时，使用 `/acp spawn` 从聊天中进行显式操作员控制。

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

大多数 `/acp` 操作都接受可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

解析顺序：

1. 显式目标参数（或 `/acp steer` 的 `--session`）
   - 尝试键
   - 然后是 UUID 形状的会话 ID
   - 然后是标签
2. 当前线程绑定（如果此对话/线程绑定到 ACP 会话）
3. 当前请求者会话回退

当前对话绑定和线程绑定都参与第 2 步。

如果没有解析到目标，OpenClaw 将返回一个清晰的错误 (`Unable to resolve session target: ...`)。

## 生成绑定模式

`/acp spawn` 支持 `--bind here|off`。

| 模式   | 行为                                                   |
| ------ | ------------------------------------------------------ |
| `here` | 将当前活动的对话绑定在原位；如果没有活动的对话则失败。 |
| `off`  | 不要创建当前对话绑定。                                 |

注意：

- `--bind here` 是“让此渠道或聊天由 Codex 支持”的最简单操作路径。
- `--bind here` 不会创建子线程。
- `--bind here` 仅在暴露当前会话绑定支持的渠道上可用。
- `--bind` 和 `--thread` 不能在同一个 `/acp spawn` 调用中组合使用。

## 生成线程模式

`/acp spawn` 支持 `--thread auto|here|off`。

| 模式   | 行为                                                              |
| ------ | ----------------------------------------------------------------- |
| `auto` | 在活动线程中：绑定该线程。在线程外：如果支持，则创建/绑定子线程。 |
| `here` | 需要当前活动线程；如果不在活动线程中则失败。                      |
| `off`  | 无绑定。会话启动时未绑定。                                        |

注：

- 在非线程绑定界面上，默认行为实际上是 `off`。
- 线程绑定生成需要渠道策略支持：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`
- 当您想要固定当前对话而不创建子线程时，请使用 `--bind here`。

## ACP 控制

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

`/acp status` 显示有效的运行时选项，以及（如果可用）运行时级别和后端级别的会话标识符。

某些控制取决于后端功能。如果后端不支持某项控制，OpenClaw 会返回明确的不支持控制错误。

## ACP 命令示例

| 命令                 | 作用                                     | 示例                                                          |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选当前绑定或线程绑定。  | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | 取消目标会话中正在进行的轮次。           | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | 向正在运行的会话发送引导指令。           | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | 关闭会话并解除线程目标的绑定。           | `/acp close`                                                  |
| `/acp status`        | 显示后端、模式、状态、运行时选项、功能。 | `/acp status`                                                 |
| `/acp set-mode`      | 设置目标会话的运行时模式。               | `/acp set-mode plan`                                          |
| `/acp set`           | 通用运行时配置选项写入。                 | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | 设置运行时工作目录覆盖。                 | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | 设置批准策略配置文件。                   | `/acp permissions strict`                                     |
| `/acp timeout`       | 设置运行时超时（秒）。                   | `/acp timeout 120`                                            |
| `/acp model`         | 设置运行时模型覆盖。                     | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | 移除会话运行时选项覆盖。                 | `/acp reset-options`                                          |
| `/acp sessions`      | 列出存储中最近的 ACP 会话。              | `/acp sessions`                                               |
| `/acp doctor`        | 后端健康状态、功能、可执行的修复。       | `/acp doctor`                                                 |
| `/acp install`       | 打印确定性的安装和启用步骤。             | `/acp install`                                                |

`/acp sessions` 读取当前绑定或请求者会话的存储。接受 `session-key`、`session-id` 或 `session-label` 令牌的命令通过网关会话发现来解析目标，包括每个代理自定义的 `session.store` 根目录。

## 运行时选项映射

`/acp` 提供便捷命令和一个通用设置器。

等效操作：

- `/acp model <id>` 映射到运行时配置键 `model`。
- `/acp permissions <profile>` 映射到运行时配置键 `approval_policy`。
- `/acp timeout <seconds>` 映射到运行时配置键 `timeout`。
- `/acp cwd <path>` 直接更新运行时 cwd 覆盖。
- `/acp set <key> <value>` 是通用路径。
  - 特殊情况：`key=cwd` 使用 cwd 覆盖路径。
- `/acp reset-options` 清除目标会话的所有运行时覆盖。

## acpx harness 支持（当前）

当前 acpx 内置 harness 别名：

- `claude`
- `codex`
- `copilot`
- `cursor`（Cursor CLI：`cursor-agent acp`）
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

当 OpenClaw 使用 acpx 后端时，优先使用这些 `agentId` 的值，除非您的 acpx 配置定义了自定义代理别名。
如果您的本地 Cursor 安装仍然将 ACP 暴露为 `agent acp`，请在您的 acpx 配置中覆盖 `cursor` 代理命令，而不是更改内置默认值。

直接使用 acpx CLI 也可以通过 `--agent <command>` 定位任意适配器，但该原始逃生舱门是 acpx CLI 的功能（不是正常的 OpenClaw `agentId` 路径）。

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

如果线程绑定的 ACP 生成不起作用，请先验证适配器功能标志：

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

当前会话绑定不需要创建子线程。它们需要一个活动的会话上下文和一个暴露 ACP 会话绑定的渠道适配器。

请参阅 [配置参考](/en/gateway/configuration-reference)。

## acpx 后端的插件设置

全新安装默认启用捆绑的 `acpx` 运行时插件，因此 ACP
通常无需手动安装插件即可工作。

从以下开始：

```text
/acp doctor
```

如果您禁用了 `acpx`，通过 `plugins.allow` / `plugins.deny` 拒绝了它，或者想要切换到本地开发检出版本，请使用显式插件路径：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

开发期间的本地工作区安装：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然后验证后端健康状况：

```text
/acp doctor
```

### acpx 命令和版本配置

默认情况下，捆绑的 acpx 后端插件 (`acpx`) 使用插件本地固定的二进制文件：

1. 命令默认为 ACPX 插件包内的插件本地 `node_modules/.bin/acpx`。
2. 预期版本默认为扩展的固定版本。
3. 启动时会立即将 ACP 后端注册为未就绪状态。
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
- 相对路径从 OpenClaw 工作区目录开始解析。
- `expectedVersion: "any"` 禁用严格的版本匹配。
- 当 `command` 指向自定义二进制文件/路径时，插件本地的自动安装将被禁用。
- 在后端健康检查运行期间，OpenClaw 启动保持非阻塞状态。

参见 [插件](/en/tools/plugin)。

### 自动依赖项安装

当您使用 `npm install -g openclaw` 全局安装 OpenClaw 时，acpx 运行时依赖项（特定平台的二进制文件）会通过 postinstall 钩子自动安装。如果自动安装失败，网关仍会正常启动，并通过 `openclaw acp doctor` 报告缺失的依赖项。

### 插件工具 MCP 网桥

默认情况下，ACPX 会话**不会**将 OpenClaw 插件注册的工具暴露给 ACP 驱动程序。

如果您希望 Codex 或 Claude Code 等 ACP 代理调用已安装的 OpenClaw 插件工具（例如内存调用/存储），请启用专用网桥：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用如下：

- 将一个名为 `openclaw-plugin-tools` 的内置 MCP 服务器注入到 ACPX 会话引导过程中。
- 暴露由已安装并启用的 OpenClaw 插件注册的插件工具。
- 保持该功能显式且默认关闭。

安全性和信任注意事项：

- 这扩展了 ACP harness 工具的覆盖范围。
- ACP 代理只能访问网关中已激活的插件工具。
- 应将此视为与让这些插件在 OpenClaw 本身中执行相同的信任边界。
- 在启用此功能之前，请检查已安装的插件。

自定义 `mcpServers` 仍像以前一样工作。内置的 plugin-tools 桥接是一个额外的可选便利功能，并非通用 MCP 服务器配置的替代品。

### 运行时超时配置

捆绑的 `acpx` 插件将嵌入式运行时的默认值设置为 120 秒超时。这为较慢的 harness（如 Gemini CLI）提供了足够的时间来完成 ACP 启动和初始化。如果您的主机需要不同的运行时限制，请覆盖它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

更改此值后重启网关。

## 权限配置

ACP 会话以非交互方式运行 — 没有 TTY 来批准或拒绝文件写入和 shell 执行权限提示。acpx 插件提供了两个配置键来控制权限的处理方式：

这些 ACPX harness 权限与 OpenClaw 执行批准是分开的，也与 CLI-后端供应商绕过标志（如 Claude CLI `--permission-mode bypassPermissions`）是分开的。ACPX `approve-all` 是 ACP 会话的 harness 级紧急开关。

### `permissionMode`

控制 harness 代理可以在未经提示的情况下执行哪些操作。

| 值              | 行为                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自动批准所有文件写入和 shell 命令。  |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制当将显示权限提示但没有可用的交互式 TTY 时发生的情况（这对于 ACP 会话始终如此）。

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

> **重要提示：** OpenClaw 目前默认为 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能会因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失败。
>
> 如果需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话能够优雅降级而不是崩溃。

## 故障排除

| 症状                                                                        | 可能原因                                                       | 修复                                                                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | 后端插件缺失或已禁用。                                         | 安装并启用后端插件，然后运行 `/acp doctor`。                                                                                                   |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP 全局已禁用。                                               | 设置 `acp.enabled=true`。                                                                                                                      |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | 已禁止从普通线程消息进行调度。                                 | 设置 `acp.dispatch.enabled=true`。                                                                                                             |
| `ACP agent "<id>" is not allowed by policy`                                 | 代理不在允许列表中。                                           | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                              |
| `Unable to resolve session target: ...`                                     | 错误的密钥/ID/标签令牌。                                       | 运行 `/acp sessions`，复制确切的密钥/标签，然后重试。                                                                                          |
| `--bind here requires running /acp spawn inside an active ... conversation` | 在未激活可绑定会话的情况下使用了 `--bind here`。               | 移动到目标聊天/渠道并重试，或使用非绑定生成。                                                                                                  |
| `Conversation bindings are unavailable for <channel>.`                      | 适配器缺乏当前对话 ACP 绑定功能。                              | 在支持的地方使用 `/acp spawn ... --thread ...`，配置顶级 `bindings[]`，或移动到支持的渠道。                                                    |
| `--thread here requires running /acp spawn inside an active ... thread`     | 在线程上下文之外使用了 `--thread here`。                       | 移动到目标线程或使用 `--thread auto`/`off`。                                                                                                   |
| `Only <user-id> can rebind this channel/conversation/thread.`               | 另一个用户拥有活动绑定目标。                                   | 以所有者身份重新绑定，或使用不同的对话或线程。                                                                                                 |
| `Thread bindings are unavailable for <channel>.`                            | 适配器缺乏线程绑定功能。                                       | 使用 `--thread off` 或移动到支持的适配器/渠道。                                                                                                |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | ACP 运行时位于主机端；请求者会话处于沙箱隔离状态。             | 从沙箱隔离会话使用 `runtime="subagent"`，或从非沙箱隔离会话运行 ACP 生成。                                                                     |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | ACP 运行时请求了 `sandbox="require"`。                         | 使用 `runtime="subagent"` 进行所需的沙箱隔离，或者在非沙箱隔离的会话中，将 ACP 与 `sandbox="inherit"` 配合使用。                               |
| 绑定会话缺少 ACP 元数据                                                     | 陈旧/已删除的 ACP 会话元数据。                                 | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                            |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` 阻止在非交互式 ACP 会话中进行写入/执行操作。  | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启网关。请参阅[权限配置](#permission-configuration)。                 |
| ACP 会话过早失败且输出很少                                                  | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。 | 检查网关日志中的 `AcpRuntimeError`。如需完整权限，请设置 `permissionMode=approve-all`；如需优雅降级，请设置 `nonInteractivePermissions=deny`。 |
| ACP 会话在完成工作后无限期停滞                                              | Harness 进程已结束，但 ACP 会话未报告完成。                    | 使用 `ps aux \| grep acpx` 进行监控；手动终止陈旧进程。                                                                                        |
