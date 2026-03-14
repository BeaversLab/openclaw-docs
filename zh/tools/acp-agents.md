---
summary: "使用 ACP 运行时会话来运行 Pi、Claude Code、Codex、OpenCode、Gemini CLI 和其他 harness 代理"
read_when:
  - Running coding harnesses through ACP
  - Setting up thread-bound ACP sessions on thread-capable channels
  - Binding Discord channels or Telegram forum topics to persistent ACP sessions
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP 代理"
---

# ACP 代理

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话允许 OpenClaw 通过 ACP 后端插件运行外部编码 harness（例如 Pi、Claude Code、Codex、OpenCode 和 Gemini CLI）。

如果您用自然语言要求 OpenClaw “在 Codex 中运行此操作”或“在线程中启动 Claude Code”，OpenClaw 应将该请求路由到 ACP 运行时（而非原生子代理运行时）。

## 快速操作流程

当您需要实用的 `/acp` 运行手册时，请使用此功能：

1. 生成会话：
   - `/acp spawn codex --mode persistent --thread auto`
2. 在绑定的线程中工作（或明确指定该会话密钥）。
3. 检查运行时状态：
   - `/acp status`
4. 根据需要调整运行时选项：
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. 在不替换上下文的情况下推动活动会话：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel` (停止当前轮次)，或
   - `/acp close` (关闭会话 + 移除绑定)

## 面向人类用户的快速入门

自然语言请求示例：

- “在此处的主题中启动一个持久的 Codex 会话，并保持其专注。”
- “将此作为一次性 Claude Code ACP 会话运行，并总结结果。”
- “在主题中使用 Gemini CLI 完成此任务，随后在该主题中保持后续对话。”

OpenClaw 应采取的操作：

1. 选择 `runtime: "acp"`。
2. 解析请求的 harness 目标 (`agentId`，例如 `codex`)。
3. 如果请求了主题绑定且当前频道支持，则将 ACP 会话绑定到该主题。
4. 在该 ACP 会话失去焦点、关闭或过期之前，将后续的线程消息路由到该会话。

## ACP 与子代理

当您需要外部驱动运行时，请使用 ACP。当您需要 OpenClaw 原生委托运行时，请使用子代理。

| 区域          | ACP 会话                           | Sub-agent 运行                      |
| ------------- | ------------------------------------- | ---------------------------------- |
| 运行时       | ACP 后端插件 (例如 acpx) | OpenClaw 原生 sub-agent 运行时  |
| 会话键   | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`  |
| 主要命令 | `/acp ...`                            | `/subagents ...`                   |
| 生成工具    | `sessions_spawn` 搭配 `runtime:"acp"` | `sessions_spawn` (默认运行时) |

另请参阅 [Sub-agents](/zh/en/tools/subagents)。

## 线程绑定会话（与通道无关）

当为通道适配器启用线程绑定时，ACP 会话可以绑定到线程：

- OpenClaw 将线程绑定到目标 ACP 会话。
- 该线程中的后续消息会路由到绑定的 ACP 会话。
- ACP 输出会传回同一线程。
- 取消焦点/关闭/归档/空闲超时或最大期限过期会移除绑定。

线程绑定支持取决于适配器。如果活动的通道适配器不支持线程绑定，OpenClaw 会返回明确的不可用/不支持消息。

线程绑定 ACP 所需的功能标志：

- `acp.enabled=true`
- `acp.dispatch.enabled` 默认开启 (设置 `false` 以暂停 ACP 调度)
- 通道适配器 ACP 线程生成标志已启用（特定于适配器）
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### 支持会话的渠道

- 任何公开会话/会话绑定功能的渠道适配器。
- 当前内置支持：
  - Discord 会话/频道
  - Telegram 话题（群组/超级群组中的论坛话题和私信话题）
- 插件渠道可以通过相同的绑定接口添加支持。

## 渠道特定设置

对于非临时工作流，请在顶级 `bindings[]` 条目中配置持久的 ACP 绑定。

### 绑定模型

- `bindings[].type="acp"` 标记持久化 ACP 会话绑定。
- `bindings[].match` 标识目标对话：
  - Discord 频道或线程：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 论坛主题：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` 是所属的 OpenClaw 代理 ID。
- 可选的 ACP 覆盖项位于 `bindings[].acp` 之下：
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

- OpenClaw 会确保配置的 ACP 会话在使用前已存在。
- 该频道或主题中的消息会路由到配置的 ACP 会话。
- 在绑定的对话中，`/new` 和 `/reset` 就地重置相同的 ACP 会话密钥。
- 临时运行时绑定（例如由线程聚焦流程创建的）在存在的地方仍然适用。

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

备注：

- `runtime` 默认为 `subagent`，因此为 ACP 会话显式设置 `runtime: "acp"`。
- 如果省略 `agentId`，OpenClaw 在配置时将使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 来保持持久化的绑定对话。

接口详细信息：

- `task` (必需)：发送到 ACP 会话的初始提示。
- `runtime` (ACP 必需)：必须是 `"acp"`。
- `agentId` (可选)：ACP 目标工具包 ID。如果设置了，则回退到 `acp.defaultAgent`。
- `thread` (可选，默认 `false`)：在支持的情况下请求线程绑定流程。
- `mode` (可选)：`run` (单次) 或 `session` (持久)。
  - 默认为 `run`
  - 如果设置了 `thread: true` 且省略了模式，OpenClaw 可能会根据运行时路径默认为持久行为
  - `mode: "session"` 需要 `thread: true`
- `cwd` (可选)：请求的运行时工作目录（由后端/运行时策略验证）。
- `label` (可选)：用于会话/横幅文本的操作员面向标签。
- `resumeSessionId` (可选)：恢复现有的 ACP 会话而不是创建新的会话。代理通过 `session/load` 重放其对话历史。需要 `runtime: "acp"`。
- `streamTo` (可选)：`"parent"` 将初始 ACP 运行进度摘要作为系统事件流式传输回请求者会话。
  - 可用时，接受的响应包括指向会话作用域 JSONL 日志 (`<sessionId>.acp-stream.jsonl`) 的 `streamLogPath`，您可以跟踪该日志以获取完整的中继历史。

### 恢复现有会话

使用 `resumeSessionId` 继续之前的 ACP 会话而不是重新开始。代理通过 `session/load` 重放其对话历史，因此它会获取之前内容的完整上下文。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常见用例：

- 将 Codex 会话从笔记本电脑交接到手机 — 告诉你的代理从你上次停止的地方继续
- 继续你在 CLI 中以交互方式开始的编码会话，现在通过你的代理以无头模式进行
- 接手因网关重启或空闲超时而中断的工作

备注：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果与子代理运行时一起使用，则返回错误。
- `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然正常适用于您正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目标代理必须支持 `session/load`（Codex 和 Claude Code 支持）。
- 如果找不到会话 ID，生成过程将失败并显示明确的错误 — 不会静默回退到新会话。

### 操作员冒烟测试

在网关部署后使用此方法，当您想快速实时检查 ACP 生成是否确实端到端工作时，而不仅仅是通过单元测试。

建议的关卡：

1. 验证目标主机上部署的网关版本/提交。
2. 确认部署的源代码包含 ACP 血缘接受，位于
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`)。
3. 打开到实时代理的临时 ACPX 桥接会话（例如
   `razor(main)` 在 `jpclawhq` 上)。
4. 要求该代理调用 `sessions_spawn` 并携带以下参数：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 验证代理报告：
   - `accepted=yes`
   - 一个真实的 `childSessionKey`
   - 没有验证器错误
6. 清理临时 ACPX 桥接会话。

发送给实时代理的示例提示：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

注意事项：

- 除非您有意测试，否则请将此冒烟测试保留在 `mode: "run"` 上
  线程绑定的持久化 ACP 会话。
- 不要为基础门禁要求 `streamTo: "parent"`。该路径依赖于
  请求者/会话能力，是一项单独的集成检查。
- 将线程绑定 `mode: "session"` 测试视为第二个更丰富的集成
  通过真实的 Discord 线程或 Telegram 主题进行。

## 沙盒兼容性

ACP 会话当前在主机运行时上运行，而不是在 OpenClaw 沙盒内运行。

当前限制：

- 如果请求者会话处于沙盒中，则对于 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn`，ACP 生成都会被阻止。
  - 错误：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 带有 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。
  - 错误：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

当您需要强制沙盒执行时，请使用 `runtime: "subagent"`。

### 从 `/acp` 命令

需要时，使用 `/acp spawn` 从聊天中进行显式操作员控制。

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

关键标志：

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

请参阅 [斜杠命令](/zh/en/tools/slash-commands)。

## 会话目标解析

大多数 `/acp` 操作都接受可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

解析顺序：

1. 显式目标参数（或针对 `/acp steer` 使用 `--session`）
   - 尝试键
   - 然后是 UUID 格式的会话 ID
   - 然后是标签
2. 当前线程绑定（如果此对话/线程已绑定到 ACP 会话）
3. 当前请求者会话回退

如果未解析到任何目标，OpenClaw 将返回一个明确的错误（`Unable to resolve session target: ...`）。

## 生成线程模式

`/acp spawn` 支持 `--thread auto|here|off`。

| 模式   | 行为                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------- |
| `auto` | 在活动线程中：绑定该线程。在线程外：如果支持，则创建/绑定子线程。 |
| `here` | 要求当前活动线程；如果不在其中则失败。                                                  |
| `off`  | 无绑定。会话以未绑定状态启动。                                                                 |

注：

- 在不支持线程绑定的表面上，默认行为实际上是 `off`。
- 线程绑定生成需要通道策略支持：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

## ACP 控件

可用命令系列：

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

`/acp status` 显示有效的运行时选项，并且在可用时显示运行时级和后端级的会话标识符。

某些控件取决于后端功能。如果后端不支持某个控件，OpenClaw 会返回明确的“不支持的控件”错误。

## ACP 命令手册

| 命令                | 作用                                                      | 示例                                                            |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选地绑定到线程。                          | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | 取消目标会话的进行中轮次。                                | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | 向正在运行的会话发送引导指令。                             | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | 关闭会话并解除线程目标的绑定。                             | `/acp close`                                                   |
| `/acp status`        | 显示后端、模式、状态、运行时选项、功能。                  | `/acp status`                                                  |
| `/acp set-mode`      | 设置目标会话的运行时模式。                                | `/acp set-mode plan`                                           |
| `/acp set`           | 通用运行时配置选项写入。                                   | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | 设置运行时工作目录覆盖。                                   | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | 设置审批策略配置文件。                                    | `/acp permissions strict`                                      |
| `/acp timeout`       | 设置运行时超时（秒）。                                     | `/acp timeout 120`                                             |
| `/acp model`         | 设置运行时模型覆盖。                                       | `/acp model anthropic/claude-opus-4-5`                         |
| `/acp reset-options` | 移除会话运行时选项覆盖。                                   | `/acp reset-options`                                           |
| `/acp sessions`      | 列出存储中的最近 ACP 会话。                                | `/acp sessions`                                                |
| `/acp doctor`        | 后端健康状况、功能、可执行的修复措施。                    | `/acp doctor`                                                  |
| `/acp install`       | 打印确定的安装和启用步骤。                                 | `/acp install`                                                 |

`/acp sessions` 读取当前绑定或请求者会话的存储。接受 `session-key`、`session-id` 或 `session-label` 令牌的命令通过网关会话发现来解析目标，包括自定义的每个代理 `session.store` 根目录。

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

## acpx harness 支持（当前）

当前的 acpx 内置 harness 别名：

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

当 OpenClaw 使用 acpx 后端时，除非您的 acpx 配置定义了自定义代理别名，否则首选 `agentId` 的这些值。

直接使用 acpx CLI 还可以通过 `--agent <command>` 定位任意适配器，但这种原始逃生舱门是 acpx CLI 的功能（不是正常的 OpenClaw `agentId` 路径）。

## 所需配置

核心 ACP 基线：

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["pi", "claude", "codex", "opencode", "gemini", "kimi"],
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

线程绑定配置是特定于通道适配器的。Discord 示例：

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

- Discord：`channels.discord.threadBindings.spawnAcpSessions=true`

参见 [配置参考](/zh/en/gateway/configuration-reference)。

## acpx 后端的插件设置

安装并启用插件：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

开发期间的本地工作区安装：

```bash
openclaw plugins install ./extensions/acpx
```

然后验证后端运行状况：

```text
/acp doctor
```

### acpx 命令和版本配置

默认情况下，acpx 插件（发布为 `@openclaw/acpx`）使用插件本地固定的二进制文件：

1. 命令默认为 `extensions/acpx/node_modules/.bin/acpx`。
2. 预期版本默认为扩展固定版本。
3. 启动时会立即将 ACP 后端注册为未就绪状态。
4. 后台确保作业验证 `acpx --version`。
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

注意：

- `command` 接受绝对路径、相对路径或命令名称（`acpx`）。
- 相对路径从 OpenClaw 工作区目录解析。
- `expectedVersion: "any"` 禁用严格的版本匹配。
- 当 `command` 指向自定义二进制文件/路径时，将禁用插件本地的自动安装。
- 当后端健康检查运行时，OpenClaw 启动保持非阻塞。

参见 [插件](/zh/en/tools/plugin)。

## 权限配置

ACP 会话以非交互方式运行 — 没有 TTY 来批准或拒绝文件写入和 Shell 执行权限提示。acpx 插件提供了两个配置键来控制权限的处理方式：

### `permissionMode`

控制代理可以在不提示的情况下执行哪些操作。

| 值 | 行为 |
| --------------- | --------------------------------------------------------- |
| `approve-all`   | 自动批准所有文件写入和 Shell 命令。          |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                              |

### `nonInteractivePermissions`

控制在将显示权限提示但没有可用的交互式 TTY 时会发生什么情况（对于 ACP 会话，情况始终如此）。

| 值 | 行为                                                          |
| ------ | ----------------------------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**（默认）**           |
| `deny` | 静默拒绝权限并继续（优雅降级）。 |

### 配置

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后重启网关。

> **重要提示：** OpenClaw 目前默认使用 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能会因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失败。
>
> 如果您需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话优雅降级而不是崩溃。

## 故障排除

| 症状                                                                  | 可能原因                                                                    | 修复方法                                                                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | 后端插件缺失或已禁用。                                             | 安装并启用后端插件，然后运行 `/acp doctor`。                                                                                                        |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP 已全局禁用。                                                          | 设置 `acp.enabled=true`。                                                                                                                                           |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | 已禁用从普通线程消息进行调度。                                  | 设置 `acp.dispatch.enabled=true`。                                                                                                                                  |
| `ACP agent "<id>" is not allowed by policy`                              | 代理不在允许列表中。                                                         | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                              |
| `Unable to resolve session target: ...`                                  | 错误的键/id/标签令牌。                                                         | 运行 `/acp sessions`，复制确切的键/标签，然后重试。                                                                                                                 |
| `--thread here requires running /acp spawn inside an active ... thread`  | `--thread here` 在线程上下文之外使用。                                  | 移动到目标线程或使用 `--thread auto`/`off`。                                                                                                               |
| `Only <user-id> can rebind this thread.`                                 | 另一个用户拥有线程绑定。                                               | 以所有者身份重新绑定或使用不同的线程。                                                                                                                        |
| `Thread bindings are unavailable for <channel>.`                         | 适配器缺乏线程绑定能力。                                        | 使用 `--thread off` 或移动到支持的适配器/频道。                                                                                                          |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | ACP 运行时位于主机端；请求者会话处于沙盒中。                       | 在沙盒会话中使用 `runtime="subagent"`，或从非沙盒会话运行 ACP 生成。                                                                  |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | 请求为 ACP 运行时使用 `sandbox="require"`。                                  | 为所需的沙盒使用 `runtime="subagent"`，或在非沙盒会话中使用带有 `sandbox="inherit"` 的 ACP。                                               |
| 绑定会话缺少 ACP 元数据                                   | 过期/已删除的 ACP 会话元数据。                                             | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                             |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 阻止在非交互式 ACP 会话中写入/执行。             | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启网关。参见 [权限配置](#permission-configuration)。                 |
| ACP 会话早期失败且输出很少                               | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。 | 检查网关日志中的 `AcpRuntimeError`。 要获得完整权限，设置 `permissionMode=approve-all`；要优雅降级，设置 `nonInteractivePermissions=deny`。 |
| ACP 会话在完成工作后无限期停滞                    | Harness 进程已完成，但 ACP 会话未报告完成。             | 使用 `ps aux \| grep acpx` 监控；手动终止陈旧进程。                                                                                                |

import zh from '/components/footer/zh.mdx';

<zh />
