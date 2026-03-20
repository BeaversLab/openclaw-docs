---
summary: "OpenClaw 的代理工具表面（browser、canvas、nodes、message、cron），用于取代旧的 `openclaw-*` 技能"
read_when:
  - 添加或修改代理工具
  - 停用或更改 `openclaw-*` 技能
title: "工具"
---

# 工具 (OpenClaw)

OpenClaw 为 browser、canvas、nodes 和 cron 提供了**一流的代理工具**。
这些取代了旧的 `openclaw-*` 技能：这些工具是类型化的，无需 shelling，
代理应该直接依赖它们。

## 停用工具

你可以通过 `openclaw.json` 中的 `tools.allow` / `tools.deny` 全局允许/拒绝工具
（拒绝优先）。这可以防止不允许的工具被发送到模型提供商。

```json5
{
  tools: { deny: ["browser"] },
}
```

注意：

- 匹配不区分大小写。
- 支持 `*` 通配符（`"*"` 表示所有工具）。
- 如果 `tools.allow` 仅引用未知或未加载的插件工具名称，OpenClaw 将记录警告并忽略允许列表，以便核心工具保持可用。

## 工具配置文件（基础允许列表）

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置一个**基础工具允许列表**。
每个代理的覆盖：`agents.list[].tools.profile`。

配置文件：

- `minimal`：仅 `session_status`
- `coding`：`group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`
- `messaging`：`group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`
- `full`：无限制（与未设置相同）

示例（默认仅限消息传递，也允许 Slack 和 Discord 工具）：

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

示例（编程配置文件，但在任何地方都拒绝 exec/process）：

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

示例（全局编程配置文件，仅限消息传递的支持代理）：

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

使用 `tools.byProvider` 为特定提供商（或单个 `provider/model`）**进一步限制**工具，而无需更改全局默认设置。
按代理覆盖：`agents.list[].tools.byProvider`。

这在基础工具配置文件**之后**且在允许/拒绝列表**之前**应用，因此它只能缩小工具集。
提供商键接受 `provider`（例如 `google-antigravity`）或
`provider/model`（例如 `openai/gpt-5.2`）。

示例（保留全局编码配置文件，但为 Google Antigravity 提供最少工具）：

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

示例（针对不稳定终端的提供商/模型特定允许列表）：

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

示例（针对单个提供商的代理特定覆盖）：

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

工具策略（全局、代理、沙箱）支持扩展为多个工具的 `group:*` 条目。
在 `tools.allow` / `tools.deny` 中使用这些。

可用组：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
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

插件可以在核心集之外注册**其他工具**（和 CLI 命令）。
请参阅 [插件](/zh/tools/plugin) 了解安装和配置，以及 [Skills](/zh/tools/skills) 了解如何
将工具使用指导注入到提示词中。一些插件会随工具一起提供自己的技能
（例如，语音通话插件）。

可选插件工具：

- [Lobster](/zh/tools/lobster)：具有可恢复审批的类型化工作流运行时（需要在网关主机上安装 Lobster CLI）。
- [LLM Task](/zh/tools/llm-task)：用于结构化工作流输出的仅 JSON LLM 步骤（可选架构验证）。
- [Diffs](/zh/tools/diffs)：用于前后文本或统一差异补丁的只读差异查看器和 PNG 或 PDF 文件渲染器。

## 工具清单

### `apply_patch`

对一个或多个文件应用结构化补丁。用于多块编辑。
实验性功能：通过 `tools.exec.applyPatch.enabled` 启用（仅限 OpenAI 模型）。
`tools.exec.applyPatch.workspaceOnly` 默认为 `true`（包含在工作区内）。仅当您有意希望 `apply_patch` 在工作区目录之外进行写入/删除时，才将其设置为 `false`。

### `exec`

在工作区中运行 Shell 命令。

核心参数：

- `command`（必需）
- `yieldMs`（超时后自动转为后台，默认 10000）
- `background`（立即转为后台）
- `timeout`（秒；如果超时则终止进程，默认 1800）
- `elevated`（布尔值；如果启用/允许提升模式，则在主机上运行；仅当代理处于沙箱隔离状态时会改变行为）
- `host`（`sandbox | gateway | node`）
- `security`（`deny | allowlist | full`）
- `ask`（`off | on-miss | always`）
- `node`（`host=node` 的节点 ID/名称）
- 需要真正的 TTY？设置 `pty: true`。

注意：

- 当转入后台时，返回带有 `sessionId` 的 `status: "running"`。
- 使用 `process` 轮询/记录/写入/终止/清除后台会话。
- 如果 `process` 不被允许，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 以及任何 `agents.list[].tools.elevated` 覆盖设置的限制（两者都必须允许），并且是 `host=gateway` + `security=full` 的别名。
- `elevated` 仅在代理处于沙箱隔离状态时才会改变行为（否则它是空操作）。
- `host=node` 可以目标定为 macOS 伴侣应用或无头节点主机 (`openclaw node run`)。
- 网关/节点审批和允许列表：[执行审批](/zh/tools/exec-approvals)。

### `process`

管理后台执行会话。

核心操作：

- `list`、`poll`、`log`、`write`、`kill`、`clear`、`remove`

说明：

- `poll` 在完成时返回新的输出和退出状态。
- `log` 支持基于行的 `offset`/`limit`（省略 `offset` 以获取最后 N 行）。
- `process` 的作用域限于每个代理；其他代理的会话不可见。

### `loop-detection` (工具调用循环护栏)

OpenClaw 跟踪最近的工具调用历史，并在检测到重复的无进展循环时进行拦截或警告。
使用 `tools.loopDetection.enabled: true` 启用（默认为 `false`）。

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

使用 Brave、Firecrawl、Gemini、Grok、Kimi 或 Perplexity 搜索网络。

核心参数：

- `query`（必需）
- `count`（1–10；默认来自 `tools.web.search.maxResults`）

注：

- 所选提供商需要 API 密钥（推荐：`openclaw configure --section web`）。
- 通过 `tools.web.search.enabled` 启用。
- 响应会被缓存（默认 15 分钟）。
- 请参阅 [Web tools](/zh/tools/web) 了解设置方法。

### `web_fetch`

获取并提取 URL 中的可读内容（HTML → markdown/text）。

核心参数：

- `url`（必需）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

注：

- 通过 `tools.web.fetch.enabled` 启用。
- `maxChars` 受 `tools.web.fetch.maxCharsCap` 限制（默认 50000）。
- 响应会被缓存（默认 15 分钟）。
- 对于重度依赖 JS 的网站，建议使用 browser 工具。
- 请参阅 [Web tools](/zh/tools/web) 了解设置方法。
- 关于可选的反机器人回退方案，请参阅 [Firecrawl](/zh/tools/firecrawl)。

### `browser`

控制专用的 OpenClaw 托管浏览器。

核心操作：

- `status`、`start`、`stop`、`tabs`、`open`、`focus`、`close`
- `snapshot`（aria/ai）
- `screenshot`（返回图像块 + `MEDIA:<path>`）
- `act`（UI 操作：click/type/press/hover/drag/select/fill/resize/wait/evaluate）
- `navigate`、`console`、`pdf`、`upload`、`dialog`

配置文件管理：

- `profiles` — 列出所有浏览器配置文件及其状态
- `create-profile` — 使用自动分配的端口创建新配置文件（或 `cdpUrl`）
- `delete-profile` — 停止浏览器，删除用户数据，从配置中移除（仅本地）
- `reset-profile` — 终止配置文件端口上的孤立进程（仅本地）

通用参数：

- `profile`（可选；默认为 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；选择特定的节点 ID/名称）
  备注：
- 需要 `browser.enabled=true`（默认为 `true`；设置 `false` 以禁用）。
- 所有操作均接受可选的 `profile` 参数以支持多实例。
- 省略 `profile` 以使用安全的默认设置：隔离的 OpenClaw 托管浏览器（`openclaw`）。
- 当现有的登录/cookie 很重要且用户在场点击/批准任何附加提示时，使用 `profile="user"` 作为真实的本地主机浏览器。
- `profile="user"` 仅限主机；请勿将其与沙箱/节点目标组合使用。
- 当省略 `profile` 时，使用 `browser.defaultProfile`（默认为 `openclaw`）。
- 配置文件名称：仅限小写字母数字和连字符（最多 64 个字符）。
- 端口范围：18800-18899（最多约 100 个配置文件）。
- 远程配置文件仅可附加（无法启动/停止/重置）。
- 如果连接了支持浏览器的节点，该工具可能会自动路由到该节点（除非您固定 `target`）。
- 当安装了 Playwright 时，`snapshot` 默认为 `ai`；使用 `aria` 获取辅助功能树。
- `snapshot` 还支持角色快照选项（`interactive`、`compact`、`depth`、`selector`），它们返回类似 `e12` 的引用。
- `act` 需要 `snapshot` 中的 `ref`（来自 AI 快照的数字 `12`，或来自角色快照的 `e12`）；针对罕见的 CSS 选择器需求，请使用 `evaluate`。
- 默认情况下避免 `act` → `wait`；仅在例外情况下（没有可靠的 UI 状态可供等待）使用。
- `upload` 可以选择传递 `ref` 以在准备就绪后自动点击。
- `upload` 还支持 `inputRef` (aria ref) 或 `element` (CSS selector) 以直接设置 `<input type="file">`。

### `canvas`

驱动节点 Canvas（展示、评估、快照、A2UI）。

核心操作：

- `present`、`hide`、`navigate`、`eval`
- `snapshot`（返回图像块 + `MEDIA:<path>`）
- `a2ui_push`、`a2ui_reset`

备注：

- 底层使用网关 `node.invoke`。
- 如果未提供 `node`，该工具会选取默认值（单个连接的节点或本地 mac 节点）。
- A2UI 仅支持 v0.8（无 `createSurface`）；CLI 会拒绝带有行错误的 v0.9 JSONL。
- 快速冒烟测试：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

发现并定位配对的节点；发送通知；捕获相机/屏幕。

核心操作：

- `status`、`describe`
- `pending`、`approve`、`reject`（配对）
- `notify`（macOS `system.notify`）
- `run`（macOS `system.run`）
- `camera_list`、`camera_snap`、`camera_clip`、`screen_record`
- `location_get`、`notifications_list`、`notifications_action`
- `device_status`、`device_info`、`device_permissions`、`device_health`

Notes:

- Camera/screen commands require the node app to be foregrounded.
- 图像返回图像块 + `MEDIA:<path>`。
- 视频返回 `FILE:<path>` (mp4)。
- Location returns a JSON payload (lat/lon/accuracy/timestamp).
- `run` 参数：`command` argv 数组；可选的 `cwd`、`env` (`KEY=VAL`)、`commandTimeoutMs`、`invokeTimeoutMs`、`needsScreenRecording`。

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

Analyze an image with the configured image 模型.

Core parameters:

- `image` (必需的路径或 URL)
- `prompt` (可选；默认为 "Describe the image.")
- `model` (可选覆盖)
- `maxBytesMb` (可选大小上限)

Notes:

- 仅在配置了 `agents.defaults.imageModel` 时可用（主要或回退），或者在可以从默认模型 + 配置的身份验证推断出隐式图像模型时可用（尽力而为的配对）。
- Uses the image 模型 directly (independent of the main chat 模型).

### `image_generate`

使用配置的或推断的图像生成模型生成一张或多张图像。

核心参数：

- `action` (可选：`generate` 或 `list`；默认 `generate`)
- `prompt` (必需)
- `image` 或 `images` (可选的参考图像路径/URL，用于编辑模式)
- `model` (可选的提供商/模型覆盖)
- `size` (可选大小提示)
- `resolution` (可选 `1K|2K|4K` 提示)
- `count` (可选，`1-4`，默认 `1`)

注意：

- 当配置了 `agents.defaults.imageGenerationModel` 时可用，或者当 OpenClaw 可以从您启用的提供商和可用的身份验证推断出兼容的图像生成默认值时可用。
- 显式的 `agents.defaults.imageGenerationModel` 仍然优先于任何推断的默认值。
- 使用 `action: "list"` 检查已注册的提供商、默认模型、支持的模型 ID、大小、分辨率和编辑支持。
- 返回本地 `MEDIA:<path>` 行，以便通道可以直接传送生成的文件。
- 直接使用图像生成模型（独立于主聊天模型）。
- Google 支持的流程，包括用于原生 Nano Banana 风格路径的 `google/gemini-3-pro-image-preview`，支持参考图像编辑以及明确的 `1K|2K|4K` 分辨率提示。
- 编辑且省略 `resolution` 时，OpenClaw 会根据输入图像尺寸推断草稿/最终分辨率。
- 这是旧 `nano-banana-pro` 技能工作流的内置替代品。对于库存图像生成，请使用 `agents.defaults.imageGenerationModel`，而不是 `skills.entries`。

原生示例：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3-pro-image-preview", // native Nano Banana path
        fallbacks: ["fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### `pdf`

分析一个或多个 PDF 文档。

有关完整行为、限制、配置和示例，请参阅 [PDF 工具](/zh/tools/pdf)。

### `message`

跨 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams 发送消息和渠道操作。

核心操作：

- `send`（文本 + 可选媒体；MS Teams 还支持 `card` 用于自适应卡片）
- `poll`（WhatsApp/Discord/MS Teams 投票）
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

- `send` 通过 WhatsApp 路由 Gateway(网关)；其他通道直接连接。
- `poll` 对 Gateway(网关) 和 MS Teams 使用 WhatsApp；Discord 轮询直接连接。
- 当消息工具调用绑定到活动的聊天会话时，发送将受到该会话目标的约束，以避免跨上下文泄漏。

### `cron`

管理 Gateway(网关) cron 作业和唤醒。

核心操作：

- `status`，`list`
- `add`，`update`，`remove`，`run`，`runs`
- `wake`（将系统事件加入队列 + 可选的即时心跳检测）

备注：

- `add` 期望一个完整的 cron 作业对象（与 `cron.add` RPC 具有相同的架构）。
- `update` 使用 `{ jobId, patch }`（为兼容性接受 `id`）。

### `gateway`

重启或将更新应用于正在运行的 Gateway(网关) 进程（原地）。

核心操作：

- `restart`（授权 + 发送 `SIGUSR1` 以进行进程内重启；`openclaw gateway` 原地重启）
- `config.schema.lookup`（每次检查一个配置路径，而无需将完整架构加载到提示词上下文中）
- `config.get`
- `config.apply`（验证 + 写入配置 + 重启 + 唤醒）
- `config.patch`（合并部分更新 + 重启 + 唤醒）
- `update.run`（运行更新 + 重启 + 唤醒）

备注：

- `config.schema.lookup` 期望一个有针对性的配置路径，例如 `gateway.auth` 或 `agents.list.*.heartbeat`。
- 当寻址 `plugins.entries.<id>` 时，路径可能包含以斜杠分隔的插件 ID，例如 `plugins.entries.pack/one.config`。
- 使用 `delayMs`（默认为 2000）以避免中断正在进行的回复。
- `config.schema` 仍可供内部控制 UI 流使用，且不通过代理 `gateway` 工具暴露。
- `restart` 默认启用；设置 `commands.restart: false` 以将其禁用。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出会话、检查对话记录历史或发送到另一个会话。

核心参数：

- `sessions_list`: `kinds?`, `limit?`, `activeMinutes?`, `messageLimit?` (0 = 无)
- `sessions_history`: `sessionKey` (或 `sessionId`), `limit?`, `includeTools?`
- `sessions_send`: `sessionKey` (或 `sessionId`), `message`, `timeoutSeconds?` (0 = 即发即弃)
- `sessions_spawn`: `task`, `label?`, `runtime?`, `agentId?`, `model?`, `thinking?`, `cwd?`, `runTimeoutSeconds?`, `thread?`, `mode?`, `cleanup?`, `sandbox?`, `streamTo?`, `attachments?`, `attachAs?`
- `session_status`: `sessionKey?` (默认为当前；接受 `sessionId`), `model?` (`default` 清除覆盖)

备注：

- `main` 是标准的直接聊天密钥；全局/未知密钥会被隐藏。
- `messageLimit > 0` 获取每个会话的最后 N 条消息（工具消息已过滤）。
- 会话定位由 `tools.sessions.visibility` 控制（默认 `tree`: 当前会话 + 生成的子代理会话）。如果您为多个用户运行共享代理，请考虑设置 `tools.sessions.visibility: "self"` 以防止跨会话浏览。
- `sessions_send` 等待最终完成，当 `timeoutSeconds > 0` 时。
- 投递/公告在完成后发生，且为尽力而为；`status: "ok"` 确认代理运行已结束，而非公告已投递。
- `sessions_spawn` 支持 `runtime: "subagent" | "acp"`（`subagent` 默认）。有关 ACP 运行时行为，请参阅 [ACP 代理](/zh/tools/acp-agents)。
- 对于 ACP 运行时，`streamTo: "parent"` 将初始运行进度摘要作为系统事件而不是直接子投递回传给请求者会话。
- `sessions_spawn` 启动子代理运行，并将公告回复发布回请求者聊天。
  - 支持单次模式（`mode: "run"`）和持久线程绑定模式（`mode: "session"` 与 `thread: true`）。
  - 如果省略 `thread: true` 和 `mode`，模式默认为 `session`。
  - `mode: "session"` 需要 `thread: true`。
  - 如果省略 `runTimeoutSeconds`，OpenClaw 在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则超时默认为 `0`（无超时）。
  - Discord 线程绑定流程依赖于 `session.threadBindings.*` 和 `channels.discord.threadBindings.*`。
  - 回复格式包括 `Status`、`Result` 和紧凑统计信息。
  - `Result` 是助手完成文本；如果缺失，则使用最新的 `toolResult` 作为后备。
- 手动完成模式首先直接生成发送，并在短暂故障时进行队列后备和重试（`status: "ok"` 表示运行完成，而非公告已投递）。
- `sessions_spawn` 仅支持子代理运行时的内联文件附件（ACP 会拒绝它们）。每个附件都有 `name`、`content` 以及可选的 `encoding`（`utf8` 或 `base64`）和 `mimeType`。文件被具体化到子工作空间的 `.openclaw/attachments/<uuid>/` 中，并附带一个 `.manifest.json` 元数据文件。该工具返回一个包含 `count`、`totalBytes`、每个文件的 `sha256` 和 `relDir` 的回执。附件内容会从记录持久化中自动编辑掉。
  - 通过 `tools.sessions_spawn.attachments` 配置限制（`enabled`、`maxTotalBytes`、`maxFiles`、`maxFileBytes`、`retainOnSessionKeep`）。
  - `attachAs.mountPath` 是为未来挂载实现保留的提示。
- `sessions_spawn` 是非阻塞的，并立即返回 `status: "accepted"`。
- ACP `streamTo: "parent"` 响应可能包含 `streamLogPath`（会话范围的 `*.acp-stream.jsonl`）用于跟踪进度历史。
- `sessions_send` 运行一个回复式乒乓（回复 `REPLY_SKIP` 以停止；最大轮次通过 `session.agentToAgent.maxPingPongTurns`，0–5）。
- 在乒乓之后，目标代理运行一个 **公告步骤**；回复 `ANNOUNCE_SKIP` 以取消该公告。
- 沙箱钳制：当当前会话处于沙箱隔离且 `agents.defaults.sandbox.sessionToolsVisibility: "spawned"` 时，OpenClaw 会将 `tools.sessions.visibility` 钳制为 `tree`。

### `agents_list`

列出当前会话可以使用 `sessions_spawn` 定位的代理 ID。

说明：

- 结果被限制在每个代理的允许列表（`agents.list[].subagents.allowAgents`）内。
- 当配置了 `["*"]` 时，该工具包含所有已配置的代理并标记 `allowAny: true`。

## 参数（通用）

Gateway(网关) 支持的工具 (`canvas`, `nodes`, `cron`)：

- `gatewayUrl` (默认 `ws://127.0.0.1:18789`)
- `gatewayToken` (如果启用了认证)
- `timeoutMs`

注意：当设置了 `gatewayUrl` 时，必须明确包含 `gatewayToken`。工具不会继承用于覆盖的配置
或环境凭据，缺少明确的凭据是一个错误。

浏览器工具：

- `profile` (可选；默认为 `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (可选；指定特定的节点 ID/名称)
- 故障排除指南：
  - Linux 启动/CDP 问题：[浏览器故障排除 (Linux)](/zh/tools/browser-linux-troubleshooting)
  - WSL2 Gateway(网关) + Windows 远程 Chrome CDP：[WSL2 + Windows + 远程 Chrome CDP 故障排除](/zh/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## 推荐的代理流程

浏览器自动化：

1. `browser` → `status` / `start`
2. `snapshot` (ai 或 aria)
3. `act` (点击/输入/按键)
4. 如果您需要视觉确认，请使用 `screenshot`

Canvas 渲染：

1. `canvas` → `present`
2. `a2ui_push` (可选)
3. `snapshot`

节点定位：

1. `nodes` → `status`
2. 在所选节点上 `describe`
3. `notify` / `run` / `camera_snap` / `screen_record`

## 安全

- 避免直接 `system.run`；仅在获得明确用户同意时使用 `nodes` → `run`。
- 尊重用户对相机/屏幕捕获的同意。
- 使用 `status/describe` 确保在调用媒体命令前已获得权限。

## 工具如何呈现给代理

工具通过两个并行通道公开：

1. **系统提示文本**：人类可读的列表 + 指南。
2. **工具架构**：发送到模型 API 的结构化函数定义。

这意味着代理既能看到“存在哪些工具”，也能看到“如何调用它们”。如果工具未出现在系统提示或架构中，模型将无法调用它。

import en from "/components/footer/en.mdx";

<en />
