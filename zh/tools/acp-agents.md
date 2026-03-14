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

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 会话让 OpenClaw 能够通过 ACP 后端插件运行外部编码工具（例如 Pi、Claude Code、Codex、OpenCode 和 Gemini CLI）。

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
5. 在不替换上下文的情况下激活活动会话：
   - `/acp steer tighten logging and continue`
6. 停止工作：
   - `/acp cancel`（停止当前轮次），或者
   - `/acp close`（关闭会话并移除绑定）

## 人员快速开始

自然请求示例：

- "在此处的线程中启动一个持久的 Codex 会话并保持其关注。"
- "将其作为一次性 Claude Code ACP 会话运行并总结结果。"
- "在线程中对此任务使用 Gemini CLI，然后将后续跟进保留在同一线程中。"

OpenClaw 应该执行的操作：

1. 选择 `runtime: "acp"`。
2. 解析请求的工具目标（`agentId`，例如 `codex`）。
3. 如果请求了线程绑定并且当前渠道支持它，则将 ACP 会话绑定到该线程。
4. 将后续的线程消息路由到同一个 ACP 会话，直到该会话失去焦点/关闭/过期。

## ACP 与子代理

当您需要外部工具运行时，请使用 ACP。当您需要 OpenClaw 原生委托运行时，请使用子代理。

| 领域     | ACP 会话                                   | 子代理运行                        |
| -------- | ------------------------------------------ | --------------------------------- |
| 运行时   | ACP 后端插件（例如 acpx）                  | OpenClaw 原生子代理运行时         |
| 会话密钥 | `agent:<agentId>:acp:<uuid>`               | `agent:<agentId>:subagent:<uuid>` |
| 主要命令 | `/acp ...`                                 | `/subagents ...`                  |
| 生成工具 | 使用 `runtime:"acp"` 进行 `sessions_spawn` | `sessions_spawn`（默认运行时）    |

另请参阅 [子代理](/en/tools/subagents)。

## 线程绑定会话（与渠道无关）

当为渠道适配器启用线程绑定时，ACP 会话可以绑定到线程：

- OpenClaw 将线程绑定到目标 ACP 会话。
- 该线程中的后续消息将路由到已绑定的 ACP 会话。
- ACP 输出将传回同一个线程。
- 取消聚焦、关闭、归档、空闲超时或最大到期时间会移除绑定。

线程绑定支持取决于特定的适配器。如果活动的渠道适配器不支持线程绑定，OpenClaw 将返回明确的“不支持/不可用”消息。

线程绑定 ACP 所需的功能标志：

- `acp.enabled=true`
- `acp.dispatch.enabled` 默认开启（设置 `false` 以暂停 ACP 分发）
- 渠道适配器 ACP 线程生成标志已启用（取决于适配器）
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

### 支持线程的渠道

- 任何公开会话/线程绑定功能的渠道适配器。
- 当前内置支持：
  - Discord 线程/频道
  - Telegram 话题（群组/超级群组中的论坛话题以及私信话题）
- 插件渠道可以通过相同的绑定接口添加支持。

## 渠道特定设置

对于非临时工作流，请在顶级 `bindings[]` 条目中配置持久化 ACP 绑定。

### 绑定模型

- `bindings[].type="acp"` 标记持久化 ACP 会话绑定。
- `bindings[].match` 标识目标会话：
  - Discord 频道或线程：`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Telegram 论坛话题：`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` 是拥有它的 OpenClaw 代理 ID。
- 可选的 ACP 覆盖项位于 `bindings[].acp` 下：
  - `mode`（`persistent` 或 `oneshot`）
  - `label`
  - `cwd`
  - `backend`

### 每个代理的运行时默认值

使用 `agents.list[].runtime` 为每个代理定义一次 ACP 默认值：

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent`（工具 ID，例如 `codex` 或 `claude`）
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

- OpenClaw 确保配置的 ACP 会话在使用前已存在。
- 该渠道或主题中的消息路由到已配置的 ACP 会话。
- 在绑定对话中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话密钥。
- 临时的运行时绑定（例如由线程聚焦流程创建的）在存在的地方仍然适用。

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

注意：

- `runtime` 默认为 `subagent`，因此请为 ACP 会话显式设置 `runtime: "acp"`。
- 如果省略 `agentId`，OpenClaw 在配置时会使用 `acp.defaultAgent`。
- `mode: "session"` 需要 `thread: true` 来保持持久绑定的对话。

接口详情：

- `task`（必填）：发送到 ACP 会话的初始提示词。
- `runtime`（ACP 必填）：必须是 `"acp"`。
- `agentId`（可选）：ACP 目标工具 ID。如果设置，则回退到 `acp.defaultAgent`。
- `thread`（可选，默认 `false`）：在支持的地方请求线程绑定流程。
- `mode`（可选）：`run`（一次性）或 `session`（持久）。
  - 默认为 `run`
  - 如果省略 `thread: true` 和 mode，OpenClaw 可能会根据运行时路径默认为持久性行为
  - `mode: "session"` 需要 `thread: true`
- `cwd`（可选）：请求的运行时工作目录（由后端/运行时策略验证）。
- `label`（可选）：用于会话/横幅文本的操作员面向标签。
- `resumeSessionId`（可选）：恢复现有的 ACP 会话而不是创建新会话。代理通过 `session/load` 重放其对话历史。需要 `runtime: "acp"`。
- `streamTo`（可选）：`"parent"` 将初始 ACP 运行进度摘要作为系统事件流式传输回请求者会话。
  - 当可用时，接受的响应包括 `streamLogPath`，指向会话范围的 JSONL 日志（`<sessionId>.acp-stream.jsonl`），您可以跟踪该日志以获取完整的中继历史记录。

### 恢复现有会话

使用 `resumeSessionId` 继续之前的 ACP 会话而不是重新开始。代理通过 `session/load` 重放其对话历史，因此它会获取之前发生的全部上下文。

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

常见用例：

- 将 Codex 会话从笔记本电脑移交给手机——告诉您的代理从中断的地方继续
- 继续您在 CLI 中以交互方式开始的编码会话，现在通过您的代理以无头方式继续
- 接手因网关重启或空闲超时而中断的工作

注：

- `resumeSessionId` 需要 `runtime: "acp"` — 如果与子代理运行时一起使用，将返回错误。
- `resumeSessionId` 恢复上游 ACP 对话历史；`thread` 和 `mode` 仍然适用于您正在创建的新 OpenClaw 会话，因此 `mode: "session"` 仍然需要 `thread: true`。
- 目标代理必须支持 `session/load`（Codex 和 Claude Code 支持）。
- 如果未找到会话 ID，生成将失败并显示明确的错误——不会静默回退到新会话。

### 操作员冒烟测试

在网关部署后使用此功能，当你想要快速实时检查 ACP 生成
是否真正端到端工作，而不仅仅是通过单元测试时。

建议的门禁：

1. 验证目标主机上部署的网关版本/提交记录。
2. 确认部署的源代码在
   `src/gateway/sessions-patch.ts`（`subagent:* or acp:* sessions`）中包含了 ACP 血统接受。
3. 打开一个到实时代理（例如
   `razor(main)` 上的 `jpclawhq`）的临时 ACPX 桥接会话。
4. 要求该代理调用 `sessions_spawn` 并附带：
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - task: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. 验证代理报告：
   - `accepted=yes`
   - 一个真实的 `childSessionKey`
   - 无验证器错误
6. 清理临时 ACPX 桥接会话。

向实时代理发送的提示示例：

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

注意事项：

- 除非你特意测试
  线程绑定的持久 ACP 会话，否则请在 `mode: "run"` 上进行此冒烟测试。
- 对于基本门禁，不要要求 `streamTo: "parent"`。该路径取决于
  请求者/会话的功能，并且是一个单独的集成检查。
- 将线程绑定的 `mode: "session"` 测试视为从真实的 Discord 线程或 Telegram 主题进行的第二次、更丰富的集成过程。

## 沙箱兼容性

ACP 会话目前在主机运行时上运行，而不是在 OpenClaw 沙箱内。

当前限制：

- 如果请求者会话是沙箱隔离的，ACP 生成将对 `sessions_spawn({ runtime: "acp" })` 和 `/acp spawn` 都被阻止。
  - 错误：`Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- 带有 `runtime: "acp"` 的 `sessions_spawn` 不支持 `sandbox: "require"`。
  - 错误：`sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

当您需要强制执行沙盒环境时，请使用 `runtime: "subagent"`。

### 从 `/acp` 命令

在需要时使用 `/acp spawn` 从聊天中进行明确的操作员控制。

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

主要标志：

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

请参阅 [Slash Commands](/en/tools/slash-commands)。

## 会话目标解析

大多数 `/acp` 操作都接受一个可选的会话目标（`session-key`、`session-id` 或 `session-label`）。

解析顺序：

1. 显式目标参数（或者对于 `/acp steer` 使用 `--session`）
   - 尝试键（tries key）
   - 然后是 UUID 形状的会话 ID
   - 然后是标签
2. 当前线程绑定（如果此对话/线程已绑定到 ACP 会话）
3. 当前请求者会话回退（fallback）

如果没有解析到目标，OpenClaw 会返回一个清晰的错误（`Unable to resolve session target: ...`）。

## 生成线程模式

`/acp spawn` 支持 `--thread auto|here|off`。

| 模式   | 行为                                                              |
| ------ | ----------------------------------------------------------------- |
| `auto` | 在活动线程中：绑定该线程。在线程外：如果支持，则创建/绑定子线程。 |
| `here` | 需要当前的活动线程；如果不在其中则失败。                          |
| `off`  | 无绑定。会话以未绑定状态启动。                                    |

注：

- 在不支持线程绑定的表面上，默认行为实际上是 `off`。
- 线程绑定生成需要渠道策略支持：
  - Discord：`channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram：`channels.telegram.threadBindings.spawnAcpSessions=true`

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

`/acp status` 显示有效的运行时选项，并且在可用时显示运行时级别和后端级别的会话标识符。

某些控件取决于后端功能。如果后端不支持某个控件，OpenClaw 会返回一个明确的不支持控件错误。

## ACP 命令手册

| 命令                 | 作用                                     | 示例                                                           |
| -------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | 创建 ACP 会话；可选线程绑定。            | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | 取消目标会话的进行中轮次。               | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | 向正在运行的会话发送引导指令。           | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | 关闭会话并解绑线程目标。                 | `/acp close`                                                   |
| `/acp status`        | 显示后端、模式、状态、运行时选项、功能。 | `/acp status`                                                  |
| `/acp set-mode`      | 为目标会话设置运行时模式。               | `/acp set-mode plan`                                           |
| `/acp set`           | 通用运行时配置选项写入。                 | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | 设置运行时工作目录覆盖。                 | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | 设置审批策略配置文件。                   | `/acp permissions strict`                                      |
| `/acp timeout`       | 设置运行时超时（秒）。                   | `/acp timeout 120`                                             |
| `/acp model`         | 设置运行时模型覆盖。                     | `/acp model anthropic/claude-opus-4-5`                         |
| `/acp reset-options` | 移除会话运行时选项覆盖。                 | `/acp reset-options`                                           |
| `/acp sessions`      | 列出存储中的最近 ACP 会话。              | `/acp sessions`                                                |
| `/acp doctor`        | 后端健康状况、功能、可执行的修复措施。   | `/acp doctor`                                                  |
| `/acp install`       | 打印确定性的安装和启用步骤。             | `/acp install`                                                 |

`/acp sessions` 读取当前绑定或请求者会话的存储。接受 `session-key`、`session-id` 或 `session-label` 令牌的命令通过网关会话发现来解析目标，包括自定义的每个代理 `session.store` 根目录。

## 运行时选项映射

`/acp` 具有便捷命令和一个通用设置器。

等效操作：

- `/acp model <id>` 映射到运行时配置键 `model`。
- `/acp permissions <profile>` 映射到运行时配置键 `approval_policy`。
- `/acp timeout <seconds>` 映射到运行时配置键 `timeout`。
- `/acp cwd <path>` 直接更新运行时 cwd 覆盖。
- `/acp set <key> <value>` 是通用路径。
  - 特殊情况：`key=cwd` 使用 cwd 覆盖路径。
- `/acp reset-options` 清除目标会话的所有运行时覆盖。

## acpx 工具支持（当前）

当前 acpx 内置工具别名：

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

当 OpenClaw 使用 acpx 后端时，除非您的 acpx 配置定义了自定义代理别名，否则建议为 `agentId` 使用这些值。

直接使用 acpx CLI 也可以通过 `--agent <command>` 针对任意适配器，但这种原始的逃生口是 acpx CLI 的功能（而非正常的 OpenClaw `agentId` 路径）。

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

线程绑定配置特定于渠道适配器。Discord 的示例：

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

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

请参阅 [配置参考](/en/gateway/configuration-reference)。

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

然后验证后端健康状况：

```text
/acp doctor
```

### acpx 命令和版本配置

默认情况下，acpx 插件（发布为 `@openclaw/acpx`）使用插件本地固定的二进制文件：

1. 命令默认为 `extensions/acpx/node_modules/.bin/acpx`。
2. 预期版本默认为扩展的固定版本。
3. 启动时会立即将 ACP 后端注册为未就绪状态。
4. 后台确保作业会验证 `acpx --version`。
5. 如果插件本地的二进制文件缺失或版本不匹配，它将运行：
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
- 相对路径从 OpenClaw 工作区目录开始解析。
- `expectedVersion: "any"` 禁用严格的版本匹配。
- 当 `command` 指向自定义二进制文件/路径时，插件本地的自动安装将被禁用。
- 在后端健康检查运行期间，OpenClaw 启动保持非阻塞状态。

请参阅 [插件](/en/tools/plugin)。

## 权限配置

ACP 会话以非交互方式运行 — 没有可用于批准或拒绝文件写入和 shell 执行权限提示的 TTY。acpx 插件提供了两个控制权限处理方式的配置键：

### `permissionMode`

控制工具代理可以在未经提示的情况下执行哪些操作。

| 值              | 行为                                 |
| --------------- | ------------------------------------ |
| `approve-all`   | 自动批准所有文件写入和 Shell 命令。  |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                   |

### `nonInteractivePermissions`

控制当出现权限提示但没有可用的交互式 TTY 时发生的情况（对于 ACP 会话来说总是如此）。

| 值     | 行为                                        |
| ------ | ------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**(默认)** |
| `deny` | 静默拒绝该权限并继续（优雅降级）。          |

### 配置

通过插件配置进行设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后重启网关。

> **重要提示：** OpenClaw 目前默认为 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能会因 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` 而失败。
>
> 如果您需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话能够优雅降级而不是崩溃。

## 故障排除

| 症状                                                                     | 可能原因                                                       | 修复方法                                                                                                                                           |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | 后端插件缺失或已禁用。                                         | 安装并启用后端插件，然后运行 `/acp doctor`。                                                                                                       |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP 全局已禁用。                                               | 设置 `acp.enabled=true`。                                                                                                                          |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | 已禁用从普通线程消息进行分发。                                 | 设置 `acp.dispatch.enabled=true`。                                                                                                                 |
| `ACP agent "<id>" is not allowed by policy`                              | 代理不在允许列表中。                                           | 使用允许的 `agentId` 或更新 `acp.allowedAgents`。                                                                                                  |
| `Unable to resolve session target: ...`                                  | 错误的 key/id/label 标记。                                     | 运行 `/acp sessions`，复制确切的 key/label，然后重试。                                                                                             |
| `--thread here requires running /acp spawn inside an active ... thread`  | 在线程上下文之外使用了 `--thread here`。                       | 移至目标线程或使用 `--thread auto`/`off`。                                                                                                         |
| `Only <user-id> can rebind this thread.`                                 | 另一个用户拥有线程绑定。                                       | 以所有者身份重新绑定或使用不同的线程。                                                                                                             |
| `Thread bindings are unavailable for <channel>.`                         | 适配器缺乏线程绑定功能。                                       | 使用 `--thread off` 或移至受支持的适配器/渠道。                                                                                                    |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | ACP 运行时位于主机端；请求者会话已沙箱隔离。                   | 从沙箱隔离会话中使用 `runtime="subagent"`，或者从非沙箱隔离会话运行 ACP 生成。                                                                     |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | `sandbox="require"` 请求用于 ACP 运行时。                      | 对所需的沙箱隔离使用 `runtime="subagent"`，或者从非沙箱隔离会话中将 ACP 与 `sandbox="inherit"` 一起使用。                                          |
| 绑定会话缺少 ACP 元数据                                                  | 陈旧/已删除的 ACP 会话元数据。                                 | 使用 `/acp spawn` 重新创建，然后重新绑定/聚焦线程。                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` 阻止在非交互式 ACP 会话中进行写入/执行。      | 将 `plugins.entries.acpx.config.permissionMode` 设置为 `approve-all` 并重启网关。请参阅 [权限配置](#permission-configuration)。                    |
| ACP 会话过早失败且输出很少                                               | 权限提示被 `permissionMode`/`nonInteractivePermissions` 阻止。 | 检查网关日志中的 `AcpRuntimeError`。要获取完整权限，请设置 `permissionMode=approve-all`；要实现优雅降级，请设置 `nonInteractivePermissions=deny`。 |
| ACP 会话在完成工作后无限期停滞                                           | 进程已完成，但 ACP 会话未报告完成。                            | 使用 `ps aux \| grep acpx` 监控；手动终止陈旧进程。                                                                                                |

import zh from '/components/footer/zh.mdx';

<zh />
