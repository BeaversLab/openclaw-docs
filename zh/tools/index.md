---
summary: "OpenClaw 的代理工具界面（浏览器、画布、节点、消息、cron），用于取代旧的 `openclaw-*` 技能"
read_when:
  - Adding or modifying agent tools
  - Retiring or changing `openclaw-*` skills
title: "工具"
---

# 工具 (OpenClaw)

OpenClaw 为浏览器、画布、节点和 cron 提供了**一流的代理工具**。
这些取代了旧的 `openclaw-*` 技能：工具是类型化的，无需 shell 调用，
代理应该直接依赖它们。

## 禁用工具

您可以通过 `openclaw.json` 中的 `tools.allow` / `tools.deny` 全局允许/拒绝工具
（拒绝优先）。这可以防止不允许的工具被发送到模型提供商。

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

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置一个**基本工具允许列表**。
每个代理的覆盖设置：`agents.list[].tools.profile`。

配置文件：

- `minimal`：仅 `session_status`
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

使用 `tools.byProvider` 为特定提供商
（或单个 `provider/model`）**进一步限制**工具，而无需更改全局默认值。
每个代理的覆盖设置：`agents.list[].tools.byProvider`。

这在**基本工具配置文件之后**和**允许/拒绝列表之前**应用，因此它只能缩小工具集。
提供商键接受 `provider`（例如 `google-antigravity`）或
`provider/model`（例如 `openai/gpt-5.2`）。

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

工具策略（全局、代理、沙盒）支持可扩展为多个工具的 `group:*` 条目。
请在 `tools.allow` / `tools.deny` 中使用它们。

可用组：

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: 所有内置 OpenClaw 工具（不包括提供商插件）

示例（仅允许文件工具 + 浏览器）：

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## 插件 + 工具

插件可以注册核心集合之外的**额外工具**（和 CLI 命令）。
请参阅 [Plugins](/zh/en/tools/plugin) 了解安装和配置，参阅 [Skills](/zh/en/tools/skills) 了解
工具使用指南是如何注入到提示词中的。一些插件随工具一起附带自己的技能
（例如，语音通话插件）。

可选插件工具：

- [Lobster](/zh/en/tools/lobster)：具有可恢复审批的类型化工作流运行时（需要在网关主机上安装 Lobster CLI）。
- [LLM Task](/zh/en/tools/llm-task)：用于结构化工作流输出的仅限 JSON 的 LLM 步骤（可选架构验证）。
- [Diffs](/zh/en/tools/diffs)：用于文本前后对比或统一补丁的只读差异查看器和 PNG 或 PDF 文件渲染器。

## 工具清单

### `apply_patch`

对一个或多个文件应用结构化补丁。用于多块编辑。
实验性功能：通过 `tools.exec.applyPatch.enabled` 启用（仅限 OpenAI 模型）。
`tools.exec.applyPatch.workspaceOnly` 默认为 `true`（包含在工作区内）。仅当您有意让 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。

### `exec`

在工作区中运行 Shell 命令。

核心参数：

- `command`（必需）
- `yieldMs`（超时后自动后台运行，默认 10000）
- `background`（立即后台运行）
- `timeout`（秒；超过该时间将终止进程，默认 1800）
- `elevated`（布尔值；如果启用/允许提升模式，则在主机上运行；仅当代理处于沙箱中时才会改变行为）
- `host` (`sandbox | gateway | node`)
- `security` (`deny | allowlist | full`)
- `ask` (`off | on-miss | always`)
- `node`（用于 `host=node` 的节点 ID/名称）
- 需要真正的 TTY？请设置 `pty: true`。

注意：

- 当转入后台时，返回带有 `sessionId` 的 `status: "running"`。
- 使用 `process` 来轮询/记录/写入/终止/清除后台会话。
- 如果 `process` 被禁用，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 以及任何 `agents.list[].tools.elevated` 覆盖设置（两者都必须允许）的限制，并且是 `host=gateway` + `security=full` 的别名。
- 仅当代理处于沙箱中时，`elevated` 才会改变行为（否则它是一个空操作）。
- `host=node` 可以定位 macOS 伴侣应用或无头节点主机 (`openclaw node run`)。
- 网关/节点 批准和允许列表：[Exec approvals](/zh/en/tools/exec-approvals)。

### `process`

管理后台 exec 会话。

核心操作：

- `list`、`poll`、`log`、`write`、`kill`、`clear`、`remove`

注意：

- `poll` 在完成时返回新的输出和退出状态。
- `log` 支持基于行的 `offset`/`limit`（省略 `offset` 以获取最后 N 行）。
- `process` 的范围限定为每个代理；来自其他代理的会话是不可见的。

### `loop-detection`（工具调用循环护栏）

OpenClaw 会跟踪最近的工具调用历史，并在检测到重复的无进展循环时进行阻止或警告。
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

- `genericRepeat`：重复的相同工具 + 相同参数调用模式。
- `knownPollNoProgress`：重复输出相同的轮询类工具。
- `pingPong`：交替的 `A/B/A/B` 无进展模式。
- 每个代理的覆盖设置：`agents.list[].tools.loopDetection`。

### `web_search`

使用 Perplexity、Brave、Gemini、Grok 或 Kimi 搜索网络。

核心参数：

- `query`（必需）
- `count`（1–10；默认来自 `tools.web.search.maxResults`）

备注：

- 需要所选提供商的 API 密钥（推荐：`openclaw configure --section web`）。
- 通过 `tools.web.search.enabled` 启用。
- 响应会被缓存（默认 15 分钟）。
- 请参阅 [Web tools](/zh/en/tools/web) 了解设置方法。

### `web_fetch`

从 URL 获取并提取可读内容（HTML → markdown/文本）。

核心参数：

- `url`（必需）
- `extractMode` (`markdown` | `text`)
- `maxChars`（截断长页面）

备注：

- 通过 `tools.web.fetch.enabled` 启用。
- `maxChars` 受 `tools.web.fetch.maxCharsCap` 限制（默认 50000）。
- 响应会被缓存（默认 15 分钟）。
- 对于重度使用 JS 的网站，首选浏览器工具。
- 请参阅 [Web tools](/zh/en/tools/web) 了解设置方法。
- 请参阅 [Firecrawl](/zh/en/tools/firecrawl) 了解可选的反机器人回退方案。

### `browser`

控制由 OpenClaw 管理的专用浏览器。

核心操作：

- `status`, `start`, `stop`, `tabs`, `open`, `focus`, `close`
- `snapshot` (aria/ai)
- `screenshot`（返回图像块 + `MEDIA:<path>`）
- `act` (UI 操作：click/type/press/hover/drag/select/fill/resize/wait/evaluate)
- `navigate`, `console`, `pdf`, `upload`, `dialog`

配置文件管理：

- `profiles` — 列出所有浏览器配置文件及其状态
- `create-profile` — 创建新配置文件并自动分配端口 (或 `cdpUrl`)
- `delete-profile` — 停止浏览器，删除用户数据，并从配置中移除 (仅限本地)
- `reset-profile` — 终止配置文件端口上的孤立进程 (仅限本地)

通用参数：

- `profile` (可选；默认为 `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (可选；选择特定的节点 ID/名称)
  注意：
- 需要 `browser.enabled=true` (默认为 `true`；设置 `false` 以禁用)。
- 所有操作均接受可选的 `profile` 参数以支持多实例。
- 当省略 `profile` 时，使用 `browser.defaultProfile` (默认为 "chrome")。
- 配置文件名称：仅限小写字母数字和连字符 (最多 64 个字符)。
- 端口范围：18800-18899 (最多约 100 个配置文件)。
- 远程配置文件仅支持附加 (不支持启动/停止/重置)。
- 如果连接了支持浏览器的节点，该工具可能会自动路由到该节点 (除非您固定了 `target`)。
- 当安装 Playwright 时，`snapshot` 默认为 `ai`；使用 `aria` 获取可访问性树。
- `snapshot` 还支持角色快照选项 (`interactive`, `compact`, `depth`, `selector`)，它们会返回类似 `e12` 的引用。
- `act` 需要来自 `snapshot` 的 `ref` (来自 AI 快照的数字 `12`，或来自角色快照的 `e12`)；针对罕见的 CSS 选择器需求，请使用 `evaluate`。
- 默认情况下避免使用 `act` → `wait`；仅在特殊情况下使用 (没有可靠的 UI 状态可供等待)。
- `upload` 可以选择传递 `ref` 以在准备后自动点击。
- `upload` 还支持 `inputRef` (aria ref) 或 `element` (CSS 选择器) 来直接设置 `<input type="file">`。

### `canvas`

驱动节点画布（present, eval, snapshot, A2UI）。

核心操作：

- `present`, `hide`, `navigate`, `eval`
- `snapshot`（返回图像块 + `MEDIA:<path>`）
- `a2ui_push`, `a2ui_reset`

说明：

- 底层使用网关 `node.invoke`。
- 如果未提供 `node`，该工具将选择默认值（单个连接的节点或本地 mac 节点）。
- A2UI 仅支持 v0.8（不支持 `createSurface`）；CLI 会拒绝带有行错误的 v0.9 JSONL。
- 快速测试：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

发现并定位配对的节点；发送通知；捕获摄像头/屏幕。

核心操作：

- `status`, `describe`
- `pending`, `approve`, `reject` (配对)
- `notify` (macOS `system.notify`)
- `run` (macOS `system.run`)
- `camera_list`, `camera_snap`, `camera_clip`, `screen_record`
- `location_get`, `notifications_list`, `notifications_action`
- `device_status`, `device_info`, `device_permissions`, `device_health`

说明：

- 摄像头/屏幕命令要求节点应用处于前台。
- 图像返回图像块 + `MEDIA:<path>`。
- 视频返回 `FILE:<path>` (mp4)。
- 位置返回 JSON 负载（纬度/经度/精度/时间戳）。
- `run` 参数：`command` argv 数组；可选 `cwd`, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`。

示例 (`run`)：

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

使用配置的图像模型分析图像。

核心参数：

- `image`（必需的路径或 URL）
- `prompt`（可选；默认为“描述该图像。”）
- `model`（可选覆盖）
- `maxBytesMb` (可选的大小上限)

备注：

- 仅当配置了 `agents.defaults.imageModel`（主模型或备用模型），或者可以从默认模型 + 已配置的身份验证中推断出隐式图像模型时才可用（尽力而为的配对）。
- 直接使用图像模型（独立于主聊天模型）。

### `pdf`

分析一个或多个 PDF 文档。

有关完整行为、限制、配置和示例，请参阅 [PDF 工具](/zh/en/tools/pdf)。

### `message`

跨 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams 发送消息和频道操作。

核心操作：

- `send` (文本 + 可选媒体；MS Teams 还支持用于自适应卡片的 `card`)
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

- `send` 通过网关路由 WhatsApp；其他通道直连。
- `poll` 对 WhatsApp 和 MS Teams 使用网关；Discord 投票直连。
- 当消息工具调用绑定到活动聊天会话时，发送操作将限制在该会话的目标，以避免跨上下文泄露。

### `cron`

管理网关 cron 作业和唤醒。

核心操作：

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (将系统事件加入队列 + 可选的即时心跳)

备注：

- `add` 期望一个完整的 cron 作业对象（与 `cron.add` RPC 的架构相同）。
- `update` 使用 `{ jobId, patch }`（接受 `id` 以保持兼容性）。

### `gateway`

重启或将更新应用于正在运行的 Gateway 进程（原地）。

核心操作：

- `restart`（授权并发送 `SIGUSR1` 以进行进程内重启；`openclaw gateway` 原地重启）
- `config.schema.lookup`（一次检查一个配置路径，而无需将完整架构加载到提示上下文中）
- `config.get`
- `config.apply`（验证 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并部分更新 + 重启 + 唤醒）
- `update.run`（运行更新 + 重启 + 唤醒）

备注：

- `config.schema.lookup` 期望一个目标配置路径，例如 `gateway.auth` 或 `agents.list.*.heartbeat`。
- 在针对 `plugins.entries.<id>` 时，路径可能包含以斜杠分隔的插件 ID，例如 `plugins.entries.pack/one.config`。
- 使用 `delayMs`（默认为 2000）以避免中断正在进行的回复。
- `config.schema` 仍可用于内部 Control UI 流程，不通过代理 `gateway` 工具暴露。
- `restart` 默认启用；设置 `commands.restart: false` 以禁用它。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出会话、检查对话记录历史或发送到另一个会话。

核心参数：

- `sessions_list`： `kinds?`、 `limit?`、 `activeMinutes?`、 `messageLimit?`（0 = 无）
- `sessions_history`： `sessionKey`（或 `sessionId`）、 `limit?`、 `includeTools?`
- `sessions_send`： `sessionKey`（或 `sessionId`）、 `message`、 `timeoutSeconds?`（0 = 即发即弃）
- `sessions_spawn`：`task`、`label?`、`runtime?`、`agentId?`、`model?`、`thinking?`、`cwd?`、`runTimeoutSeconds?`、`thread?`、`mode?`、`cleanup?`、`sandbox?`、`streamTo?`、`attachments?`、`attachAs?`
- `session_status`：`sessionKey?`（默认为当前；接受 `sessionId`），`model?`（`default` 清除覆盖）

备注：

- `main` 是规范的直接聊天密钥；全局/未知密钥被隐藏。
- `messageLimit > 0` 获取每个会话的最后 N 条消息（已过滤工具消息）。
- 会话定位由 `tools.sessions.visibility` 控制（默认 `tree`：当前会话 + 生成的子代理会话）。如果您为多个用户运行共享代理，请考虑设置 `tools.sessions.visibility: "self"` 以防止跨会话浏览。
- 当 `timeoutSeconds > 0` 时，`sessions_send` 等待最终完成。
- 传递/公告在完成后进行，属于尽力而为；`status: "ok"` 确认代理运行已结束，而非公告已传递。
- `sessions_spawn` 支持 `runtime: "subagent" | "acp"`（`subagent` 默认）。有关 ACP 运行时行为，请参阅 [ACP Agents](/zh/en/tools/acp-agents)。
- 对于 ACP 运行时，`streamTo: "parent"` 将初始运行进度摘要作为系统事件而不是直接子传递路由回请求者会话。
- `sessions_spawn` 启动子代理运行，并将公告回复发布回请求者聊天。
  - 支持单次模式（`mode: "run"`）和持久化线程绑定模式（`mode: "session"` 搭配 `thread: true`）。
  - 如果省略 `thread: true` 和 `mode`，模式默认为 `session`。
  - `mode: "session"` 需要 `thread: true`。
  - 如果省略 `runTimeoutSeconds`，OpenClaw 在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则超时默认为 `0`（无超时）。
  - Discord 线程绑定流程取决于 `session.threadBindings.*` 和 `channels.discord.threadBindings.*`。
  - 回复格式包括 `Status`、`Result` 和紧凑统计信息。
  - `Result` 是助手完成文本；如果缺失，则使用最新的 `toolResult` 作为后备。
- 手动完成模式生成首先直接发送，并在发生瞬时故障时进行队列回退和重试（`status: "ok"` 表示运行已完成，而非通知已送达）。
- `sessions_spawn` 仅支持子代理运行时的内联文件附件（ACP 会拒绝它们）。每个附件具有 `name`、`content` 和可选的 `encoding`（`utf8` 或 `base64`）以及 `mimeType`。文件会在 `.openclaw/attachments/<uuid>/` 处实现于子工作空间中，并附带一个 `.manifest.json` 元数据文件。该工具返回一个包含 `count`、`totalBytes`、每个文件的 `sha256` 和 `relDir` 的回执。附件内容会从转录持久化中自动编辑。
  - 通过 `tools.sessions_spawn.attachments` 配置限制（`enabled`、`maxTotalBytes`、`maxFiles`、`maxFileBytes`、`retainOnSessionKeep`）。
  - `attachAs.mountPath` 是为未来挂载实现保留的提示。
- `sessions_spawn` 是非阻塞的，并立即返回 `status: "accepted"`。
- ACP `streamTo: "parent"` 响应可能包含 `streamLogPath`（会话范围的 `*.acp-stream.jsonl`）用于追踪进度历史。
- `sessions_send` 运行一个回复乒乓（回复 `REPLY_SKIP` 停止；通过 `session.agentToAgent.maxPingPongTurns` 设置最大回合数，0–5）。
- 乒乓结束后，目标代理运行一个 **announce step**（公告步骤）；回复 `ANNOUNCE_SKIP` 以抑制公告。
- 沙箱限制：当当前会话处于沙箱模式且 `agents.defaults.sandbox.sessionToolsVisibility: "spawned"` 时，OpenClaw 会将 `tools.sessions.visibility` 限制为 `tree`。

### `agents_list`

列出当前会话可以使用 `sessions_spawn` 定位的目标代理 ID。

注意事项：

- 结果受限于每个代理的允许列表（`agents.list[].subagents.allowAgents`）。
- 当配置了 `["*"]` 时，该工具包含所有已配置的代理并标记 `allowAny: true`。

## 参数（通用）

网关支持的工具（`canvas`，`nodes`，`cron`）：

- `gatewayUrl`（默认 `ws://127.0.0.1:18789`）
- `gatewayToken`（如果启用了身份验证）
- `timeoutMs`

注意：当设置了 `gatewayUrl` 时，必须显式包含 `gatewayToken`。工具不会继承配置或环境凭据用于覆盖，缺少显式凭据将被视为错误。

浏览器工具：

- `profile`（可选；默认为 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；指定特定的节点 ID/名称）
- 故障排除指南：
  - Linux 启动/CDP 问题：[浏览器故障排除 (Linux)](/zh/en/tools/browser-linux-troubleshooting)
  - WSL2 网关 + Windows 远程 Chrome CDP：[WSL2 + Windows + 远程 Chrome CDP 故障排除](/zh/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## 推荐的代理流程

浏览器自动化：

1. `browser` → `status` / `start`
2. `snapshot`（ai 或 aria）
3. `act`（点击/输入/按键）
4. 如果需要视觉确认，则 `screenshot`

Canvas 渲染：

1. `canvas` → `present`
2. `a2ui_push`（可选）
3. `snapshot`

节点定位：

1. `nodes` → `status`
2. `describe` 在所选节点上
3. `notify` / `run` / `camera_snap` / `screen_record`

## 安全性

- 避免直接 `system.run`；仅在获得明确用户同意的情况下，使用 `nodes` → `run`。
- 尊重用户对相机/屏幕采集的同意。
- 使用 `status/describe` 在调用媒体命令之前确保已获得权限。

## 工具如何呈现给代理

工具通过两个并行通道展示：

1. **系统提示文本**：供人阅读的列表 + 指引。
2. **工具架构**：发送到模型 API 的结构化函数定义。

这意味着代理既能看到“存在哪些工具”，也能看到“如何调用它们”。如果工具未出现在系统提示或架构中，模型将无法调用它。

import zh from '/components/footer/zh.mdx';

<zh />
