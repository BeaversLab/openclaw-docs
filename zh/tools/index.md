---
summary: "OpenClaw 的代理工具面（browser、canvas、nodes、message、cron），用于替代旧的 `openclaw-*` 技能"
read_when:
  - Adding or modifying agent tools
  - Retiring or changing `openclaw-*` skills
title: "工具"
---

# 工具 (OpenClaw)

OpenClaw 公开了用于 browser、canvas、nodes 和 cron 的**一流代理工具**。
这些替代了旧的 `openclaw-*` 技能：工具是类型化的，不使用 shell，
代理应直接依赖它们。

## 禁用工具

您可以通过 `openclaw.json` 中的 `tools.allow` / `tools.deny` 全局允许/禁止工具
（禁止优先）。这可以防止不允许的工具被发送到模型提供商。

```json5
{
  tools: { deny: ["browser"] },
}
```

注意：

- 匹配不区分大小写。
- 支持 `*` 通配符（`"*"` 表示所有工具）。
- 如果 `tools.allow` 仅引用未知或未加载的插件工具名称，OpenClaw 会记录警告并忽略允许列表，以便核心工具保持可用。

## 工具配置文件（基本允许列表）

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置**基本工具允许列表**。
每个代理的覆盖：`agents.list[].tools.profile`。

配置文件：

- `minimal`：仅限 `session_status`
- `coding`：`group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`
- `messaging`：`group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`
- `full`：无限制（与未设置相同）

示例（默认仅限消息传递，也允许 Slack + Discord 工具）：

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

示例（编码配置文件，但在任何地方拒绝 exec/process）：

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

示例（全局编码配置文件，仅消息传递支持代理）：

```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] },
      },
    ],
  },
}
```

## 特定于提供商的工具策略

使用 `tools.byProvider` 针对特定提供商
（或单个 `provider/model`）**进一步限制**工具，
而无需更改您的全局默认值。
每个代理的覆盖：`agents.list[].tools.byProvider`。

这在基础工具配置文件**之后**、允许/拒绝列表**之前**应用，因此它只能缩小工具集。Provider 键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

示例（保留全局编码配置文件，但 Google Antigravity 使用最小工具集）：

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```

示例（针对不稳定端点的特定提供商/模型允许列表）：

```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

示例（针对单个提供商的特定代理覆盖）：

```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-antigravity": { allow: ["message", "sessions_list"] },
          },
        },
      },
    ],
  },
}
```

## 工具组（简写）

工具策略（全局、代理、沙盒）支持可扩展为多个工具的 `group:*` 条目。请在 `tools.allow` / `tools.deny` 中使用它们。

可用组：

- `group:runtime`：`exec`，`bash`，`process`
- `group:fs`：`read`，`write`，`edit`，`apply_patch`
- `group:sessions`：`sessions_list`，`sessions_history`，`sessions_send`，`sessions_spawn`，`session_status`
- `group:memory`：`memory_search`，`memory_get`
- `group:web`：`web_search`，`web_fetch`
- `group:ui`：`browser`，`canvas`
- `group:automation`：`cron`，`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有内置 OpenClaw 工具（不包括提供商插件）

示例（仅允许文件工具 + 浏览器）：

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## 插件 + 工具

插件可以在核心集之外注册**其他工具**（以及 CLI 命令）。请参阅[插件](/en/tools/plugin)了解安装和配置，参阅[Skills](/en/tools/skills)了解如何将工具使用指南注入到提示词中。某些插件会随工具一起提供自己的技能（例如语音通话插件）。

可选插件工具：

- [Lobster](/en/tools/lobster)：具有可恢复审批功能的类型化工作流运行时（需要在网关主机上安装 Lobster CLI）。
- [LLM Task](/en/tools/llm-task)：仅限 LLM 的步骤，用于结构化工作流输出（可选架构验证）。
- [Diffs](/en/tools/diffs)：用于显示之前/之后文本或统一补丁的只读差异查看器和 PNG 或 PDF 文件渲染器。

## 工具清单

### `apply_patch`

在一个或多个文件中应用结构化补丁。用于多块编辑。
实验性功能：通过 `tools.exec.applyPatch.enabled` 启用（仅限 OpenAI 模型）。
`tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限于工作区内）。仅当您有意希望 `apply_patch` 在工作区目录之外进行写入/删除操作时，才将其设置为 `false`。

### `exec`

在工作区中运行 Shell 命令。

核心参数：

- `command` （必需）
- `yieldMs` （超时后自动后台运行，默认为 10000）
- `background` （立即后台运行）
- `timeout` （秒；如果超时则终止进程，默认为 1800）
- `elevated` （布尔值；如果启用/允许提升模式则在主机上运行；仅在代理处于沙盒中时改变行为）
- `host` （`sandbox | gateway | node`）
- `security` （`deny | allowlist | full`）
- `ask` （`off | on-miss | always`）
- `node` （用于 `host=node` 的节点 ID/名称）
- 需要真正的 TTY？设置 `pty: true`。

注意：

- 后台运行时返回带有 `sessionId` 的 `status: "running"`。
- 使用 `process` 来轮询/记录/写入/终止/清除后台会话。
- 如果 `process` 被禁止，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 以及任何 `agents.list[].tools.elevated` 覆盖限制（两者都必须允许），并且是 `host=gateway` + `security=full` 的别名。
- `elevated` 仅在代理处于沙盒中时改变行为（否则它是一个空操作）。
- `host=node` 可以定位 macOS 伴随应用程序或无头节点主机（`openclaw node run`）。
- 网关/节点审批和允许列表：[Exec approvals](/en/tools/exec-approvals)。

### `process`

管理后台 exec 会话。

核心操作：

- `list`，`poll`，`log`，`write`，`kill`，`clear`，`remove`

注意：

- `poll` 在完成时返回新的输出和退出状态。
- `log` 支持基于行的 `offset`/`limit`（省略 `offset` 以获取最后 N 行）。
- `process` 的范围限于每个代理；来自其他代理的会话不可见。

### `loop-detection`（工具调用循环护栏）

OpenClaw 跟踪最近的工具调用历史，并在检测到重复的无进展循环时进行阻止或警告。
通过 `tools.loopDetection.enabled: true` 启用（默认为 `false`）。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      historySize: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

- `genericRepeat`：重复相同工具 + 相同参数的调用模式。
- `knownPollNoProgress`：重复输出相同的类似轮询的工具。
- `pingPong`：交替的 `A/B/A/B` 无进展模式。
- 每个代理的覆盖设置：`agents.list[].tools.loopDetection`。

### `web_search`

使用 Perplexity、Brave、Gemini、Grok 或 Kimi 搜索网络。

核心参数：

- `query`（必需）
- `count`（1–10；默认值来自 `tools.web.search.maxResults`）

备注：

- 需要所选提供商的 API 密钥（推荐：`openclaw configure --section web`）。
- 通过 `tools.web.search.enabled` 启用。
- 响应会被缓存（默认 15 分钟）。
- 有关设置，请参阅 [Web 工具](/en/tools/web)。

### `web_fetch`

从 URL 获取并提取可读内容（HTML → markdown/文本）。

核心参数：

- `url`（必需）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

备注：

- 通过 `tools.web.fetch.enabled` 启用。
- `maxChars` 受 `tools.web.fetch.maxCharsCap` 限制（默认为 50000）。
- 响应会被缓存（默认 15 分钟）。
- 对于重度使用 JS 的网站，首选浏览器工具。
- 有关设置，请参阅 [Web 工具](/en/tools/web)。
- 有关可选的反机器人回退方案，请参阅 [Firecrawl](/en/tools/firecrawl)。

### `browser`

控制由 OpenClaw 管理的专用浏览器。

核心操作：

- `status`、`start`、`stop`、`tabs`、`open`、`focus`、`close`
- `snapshot` (aria/ai)
- `screenshot`（返回图像块 + `MEDIA:<path>`）
- `act` (UI 操作：click/type/press/hover/drag/select/fill/resize/wait/evaluate)
- `navigate`, `console`, `pdf`, `upload`, `dialog`

配置文件管理：

- `profiles` — 列出所有浏览器配置文件及其状态
- `create-profile` — 创建具有自动分配端口的新配置文件（或 `cdpUrl`）
- `delete-profile` — 停止浏览器，删除用户数据，并从配置中移除（仅限本地）
- `reset-profile` — 终止配置文件端口上的孤立进程（仅限本地）

通用参数：

- `profile` (可选；默认为 `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` （可选；选择特定的节点 ID/名称）
  备注：
- 需要 `browser.enabled=true` （默认为 `true`；设置 `false` 以禁用）。
- 所有操作均接受可选的 `profile` 参数以支持多实例。
- 省略 `profile` 以使用安全的默认设置：隔离的 OpenClaw 托管浏览器 (`openclaw`)。
- 当现有的登录/Cookie 很重要且用户在场可以点击/批准任何附加提示时，使用 `profile="user"` 以连接真实的本地主机浏览器。
- 仅对于 Chrome 扩展程序/工具栏按钮附加流程，使用 `profile="chrome-relay"`。
- `profile="user"` 和 `profile="chrome-relay"` 仅限主机；不要将它们与 sandbox/node 目标结合使用。
- 当省略 `profile` 时，使用 `browser.defaultProfile`（默认为 `openclaw`）。
- 配置文件名称：仅限小写字母数字和连字符（最多 64 个字符）。
- 端口范围：18800-18899（最多约 100 个配置文件）。
- 远程配置文件仅可附加（无法启动/停止/重置）。
- 如果连接了具有浏览器功能的节点，该工具可能会自动路由到该节点（除非您固定 `target`）。
- 当安装 Playwright 时，`snapshot` 默认为 `ai`；使用 `aria` 获取辅助功能树。
- `snapshot` 也支持角色快照选项（`interactive`、`compact`、`depth`、`selector`），这些选项返回类似 `e12` 的引用。
- `act` 需要来自 `snapshot` 的 `ref`（来自 AI 快照的数字 `12` 或来自角色快照的 `e12`）；对于罕见的 CSS 选择器需求，请使用 `evaluate`。
- 默认情况下避免使用 `act` → `wait`；仅在例外情况下（没有可靠的 UI 状态可供等待）使用它。
- `upload` 可以选择传递一个 `ref` 以在准备就绪后自动点击。
- `upload` 也支持 `inputRef`（aria 引用）或 `element`（CSS 选择器）来直接设置 `<input type="file">`。

### `canvas`

驱动节点 Canvas（展示、评估、快照、A2UI）。

核心操作：

- `present`、`hide`、`navigate`、`eval`
- `snapshot`（返回图像块 + `MEDIA:<path>`）
- `a2ui_push`、`a2ui_reset`

备注：

- 底层使用网关 `node.invoke`。
- 如果未提供 `node`，该工具将选择一个默认值（单个连接的节点或本地 mac 节点）。
- A2UI 仅限 v0.8（无 `createSurface`）；CLI 会拒绝带有行错误的 v0.9 JSONL。
- 快速冒烟测试：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

发现并定位配对的节点；发送通知；捕获相机/屏幕。

核心操作：

- `status`、`describe`
- `pending`、`approve`、`reject`（配对）
- `notify`（macOS `system.notify`）
- `run` (macOS `system.run`)
- `camera_list`, `camera_snap`, `camera_clip`, `screen_record`
- `location_get`, `notifications_list`, `notifications_action`
- `device_status`, `device_info`, `device_permissions`, `device_health`

Notes:

- Camera/screen commands require the node app to be foregrounded.
- Images return image blocks + `MEDIA:<path>`.
- Videos return `FILE:<path>` (mp4).
- Location returns a JSON payload (lat/lon/accuracy/timestamp).
- `run` params: `command` argv array; optional `cwd`, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`.

Example (`run`):

```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`

Analyze an image with the configured image 模型.

Core parameters:

- `image` (required path or URL)
- `prompt` (optional; defaults to "Describe the image.")
- `model` (optional override)
- `maxBytesMb` (optional size cap)

Notes:

- Only available when `agents.defaults.imageModel` is configured (primary or fallbacks), or when an implicit image 模型 can be inferred from your default 模型 + configured auth (best-effort pairing).
- Uses the image 模型 directly (independent of the main chat 模型).

### `pdf`

Analyze one or more PDF documents.

For full behavior, limits, config, and examples, see [PDF 工具](/en/tools/pdf).

### `message`

Send messages and 渠道 actions across Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams.

Core actions:

- `send` (text + optional media; MS Teams also supports `card` for Adaptive Cards)
- `poll` (WhatsApp/Discord/MS Teams 投票)
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

备注：

- `send` 通过网关(Gateway) 路由 WhatsApp；其他通道直接发送。
- `poll` 对 WhatsApp 和 MS Teams 使用网关(Gateway)；Discord 投票直接发送。
- 当消息工具调用绑定到活动的聊天会话时，发送将限制在该会话的目标上，以避免跨上下文泄漏。

### `cron`

管理网关(Gateway) 的定时任务 和唤醒。

核心操作：

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (将系统事件加入队列 + 可选的立即心跳)

备注：

- `add` 期望一个完整的定时任务 对象（与 `cron.add` RPC 架构相同）。
- `update` 使用 `{ jobId, patch }` (`id` 被接受以确保兼容性)。

### `gateway`

重新启动或对正在运行的网关(Gateway) 进程应用更新（就地）。

核心操作：

- `restart`（授权 + 发送 `SIGUSR1` 以进行进程内重启；`openclaw gateway` 原地重启）
- `config.schema.lookup`（每次检查一个配置路径，而无需将完整架构加载到提示上下文中）
- `config.get`
- `config.apply`（验证 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并部分更新 + 重启 + 唤醒）
- `update.run`（运行更新 + 重启 + 唤醒）

说明：

- `config.schema.lookup` 期望一个目标配置路径，例如 `gateway.auth` 或 `agents.list.*.heartbeat`。
- 当寻址 `plugins.entries.<id>` 时，路径可能包含以斜杠分隔的插件 ID，例如 `plugins.entries.pack/one.config`。
- 使用 `delayMs`（默认为 2000）以避免中断正在进行的回复。
- `config.schema` 仍然可供内部控制 UI 流使用，并且不通过代理 `gateway` 工具公开。
- `restart` 默认启用；设置 `commands.restart: false` 以禁用它。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出会话、检查对话历史记录或发送到另一个会话。

核心参数：

- `sessions_list`：`kinds?`、`limit?`、`activeMinutes?`、`messageLimit?`（0 = 无）
- `sessions_history`：`sessionKey`（或 `sessionId`）、`limit?`、`includeTools?`
- `sessions_send`：`sessionKey`（或 `sessionId`）、`message`、`timeoutSeconds?`（0 = 即发即弃）
- `sessions_spawn`: `task`, `label?`, `runtime?`, `agentId?`, `model?`, `thinking?`, `cwd?`, `runTimeoutSeconds?`, `thread?`, `mode?`, `cleanup?`, `sandbox?`, `streamTo?`, `attachments?`, `attachAs?`
- `session_status`: `sessionKey?` (默认为当前；接受 `sessionId`), `model?` (`default` 清除覆盖)

备注：

- `main` 是规范直接聊天键；global/unknown 被隐藏。
- `messageLimit > 0` 获取每个会话的最后 N 条消息（过滤掉工具消息）。
- 会话定位由 `tools.sessions.visibility` 控制（默认 `tree`：当前会话 + 生成的子代理会话）。如果您为多个用户运行共享代理，请考虑设置 `tools.sessions.visibility: "self"` 以防止跨会话浏览。
- 当 `timeoutSeconds > 0` 时，`sessions_send` 会等待最终完成。
- 交付/公告在完成后进行，并采用尽力而为原则；`status: "ok"` 确认代理运行已结束，而非公告已送达。
- `sessions_spawn` 支持 `runtime: "subagent" | "acp"` (`subagent` 默认)。有关 ACP 运行时行为，请参阅 [ACP Agents](/en/tools/acp-agents)。
- 对于 ACP 运行时，`streamTo: "parent"` 将初始运行进度摘要作为系统事件路由回请求者会话，而不是直接子交付。
- `sessions_spawn` 启动子代理运行，并将公告回复发回给请求者聊天。
  - 支持单次模式 (`mode: "run"`) 和持久线程绑定模式 (`mode: "session"` 配合 `thread: true`)。
  - 如果省略了 `thread: true` 和 `mode`，模式默认为 `session`。
  - `mode: "session"` 需要 `thread: true`。
  - 如果省略 `runTimeoutSeconds`，OpenClaw 将在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则超时默认为 `0`（无超时）。
  - Discord 线程绑定流依赖于 `session.threadBindings.*` 和 `channels.discord.threadBindings.*`。
  - 回复格式包括 `Status`、`Result` 和紧凑统计信息。
  - `Result` 是助手完成文本；如果缺失，则使用最新的 `toolResult` 作为后备。
- 手动完成模式首先直接生成发送，并在瞬态故障时使用队列后备和重试（`status: "ok"` 表示运行完成，而非公告已发送）。
- `sessions_spawn` 仅支持子代理运行时的内联文件附件（ACP 会拒绝它们）。每个附件具有 `name`、`content` 以及可选的 `encoding`（`utf8` 或 `base64`）和 `mimeType`。文件会被实例化到子工作区的 `.openclaw/attachments/<uuid>/` 中，并附带一个 `.manifest.json` 元数据文件。该工具返回一个包含 `count`、`totalBytes`、每个文件的 `sha256` 以及 `relDir` 的回执。附件内容会从转录持久化中自动编辑掉。
  - 通过 `tools.sessions_spawn.attachments` 配置限制（`enabled`、`maxTotalBytes`、`maxFiles`、`maxFileBytes`、`retainOnSessionKeep`）。
  - `attachAs.mountPath` 是为未来挂载实现保留的提示。
- `sessions_spawn` 是非阻塞的，并立即返回 `status: "accepted"`。
- ACP `streamTo: "parent"` 响应可能包含 `streamLogPath`（会话作用域 `*.acp-stream.jsonl`），用于跟踪进度历史。
- `sessions_send` 运行回传乒乓（回复 `REPLY_SKIP` 以停止；通过 `session.agentToAgent.maxPingPongTurns` 设置最大回合数，0–5）。
- 在乒乓之后，目标代理运行一个 **announce step**；回复 `ANNOUNCE_SKIP` 以取消公告。
- 沙箱限制：当当前会话处于沙箱隔离状态且 `agents.defaults.sandbox.sessionToolsVisibility: "spawned"` 时，OpenClaw 会将 `tools.sessions.visibility` 限制为 `tree`。

### `agents_list`

列出当前会话可以通过 `sessions_spawn` 针对的代理 ID。

注意：

- 结果仅限于每个代理的允许列表（`agents.list[].subagents.allowAgents`）。
- 当配置 `["*"]` 时，该工具包含所有已配置的代理并标记 `allowAny: true`。

## 参数（通用）

Gateway(网关) 支持的工具（`canvas`、`nodes`、`cron`）：

- `gatewayUrl`（默认 `ws://127.0.0.1:18789`）
- `gatewayToken`（如果启用了身份验证）
- `timeoutMs`

注意：当设置 `gatewayUrl` 时，必须显式包含 `gatewayToken`。工具不会继承用于覆盖的配置或环境凭据，缺少显式凭据将报错。

浏览器工具：

- `profile`（可选；默认为 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；指定特定的节点 ID/名称）
- 故障排除指南：
  - Linux 启动/CDP 问题：[浏览器故障排除（Linux）](/en/tools/browser-linux-troubleshooting)
  - WSL2 Gateway(网关) + Windows 远程 Chrome CDP：[WSL2 + Windows + 远程 Chrome CDP 故障排除](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## 推荐的代理流程

浏览器自动化：

1. `browser` → `status` / `start`
2. `snapshot` (ai or aria)
3. `act` (click/type/press)
4. `screenshot` if you need visual confirmation

Canvas render:

1. `canvas` → `present`
2. `a2ui_push` (optional)
3. `snapshot`

Node targeting:

1. `nodes` → `status`
2. `describe` on the chosen node
3. `notify` / `run` / `camera_snap` / `screen_record`

## Safety

- Avoid direct `system.run`; use `nodes` → `run` only with explicit user consent.
- Respect user consent for camera/screen capture.
- Use `status/describe` to ensure permissions before invoking media commands.

## How tools are presented to the agent

Tools are exposed in two parallel channels:

1. **System prompt text**: a human-readable list + guidance.
2. **Tool schema**: the structured function definitions sent to the 模型 API.

That means the agent sees both “what tools exist” and “how to call them.” If a 工具
doesn’t appear in the system prompt or the schema, the 模型 cannot call it.

import zh from "/components/footer/zh.mdx";

<zh />
