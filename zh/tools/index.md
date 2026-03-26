---
summary: "OpenClaw（浏览器、画布、节点、消息、cron）的代理工具表面，用于替换旧版 `openclaw-*` 技能"
read_when:
  - Adding or modifying agent tools
  - Retiring or changing `openclaw-*` skills
title: "工具"
---

# 工具 (OpenClaw)

OpenClaw 为浏览器、画布、节点和 cron 提供了一等代理工具。
这些工具取代了旧的 `openclaw-*` 技能：这些工具是有类型的，无 shell 操作，
代理应直接依赖它们。

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

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置基础工具允许列表。
每代理覆盖：`agents.list[].tools.profile`。

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

使用 `tools.byProvider` 针对特定提供商（或单个 `provider/model`）进一步限制工具，
而无需更改全局默认值。
每代理覆盖：`agents.list[].tools.byProvider`。

这将在基本工具配置文件**之后**以及允许/拒绝列表**之前**应用，因此它只能缩小工具集。提供商密钥接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.2`）。

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

工具策略（全局、代理、沙盒）支持 `group:*` 条目，这些条目可扩展为多个工具。请在 `tools.allow` / `tools.deny` 中使用这些条目。

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

插件可以在核心集之外注册**其他工具**（以及 CLI 命令）。有关安装和配置，请参阅 [插件](/zh/tools/plugin)；有关如何将工具使用指南注入到提示词中，请参阅 [Skills](/zh/tools/skills)。某些插件会随工具一起提供自己的 skills（例如语音通话插件）。

可选插件工具：

- [Lobster](/zh/tools/lobster)：具有可恢复批准的类型化工作流运行时（需要在网关主机上安装 Lobster CLI）。
- [LLM Task](/zh/tools/llm-task)：仅限 JSON 的 LLM 步骤，用于结构化工作流输出（可选的模式验证）。
- [Diffs](/zh/tools/diffs)：用于前后文本或统一补丁的只读 diff 查看器和 PNG 或 PDF 文件渲染器。

## 工具清单

### `apply_patch`

对一个或多个文件应用结构化补丁。用于多块编辑。
实验性功能：通过 `tools.exec.applyPatch.enabled` 启用（仅限 OpenAI 模型）。
`tools.exec.applyPatch.workspaceOnly` 默认为 `true`（工作区包含）。仅当您有意希望 `apply_patch` 在工作区目录之外写入/删除时，才将其设置为 `false`。

### `exec`

在工作区中运行 Shell 命令。

核心参数：

- `command` （必需）
- `yieldMs` （超时后自动后台运行，默认 10000）
- `background` （立即后台运行）
- `timeout` （秒数；如果超过则终止进程，默认 1800）
- `elevated` （布尔值；如果启用/允许提升模式，则在主机上运行；仅当代理处于沙箱隔离状态时才会更改行为）
- `host` （`sandbox | gateway | node`）
- `security` （`deny | allowlist | full`）
- `ask` （`off | on-miss | always`）
- `node` （`host=node` 的节点 ID/名称）
- 需要真正的 TTY？设置 `pty: true`。

注意：

- 后台运行时返回带有 `sessionId` 的 `status: "running"`。
- 使用 `process` 来轮询/记录/写入/终止/清除后台会话。
- 如果不允许 `process`，`exec` 将同步运行并忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 加上任何 `agents.list[].tools.elevated` 覆盖的限制（两者都必须允许），并且是 `host=gateway` + `security=full` 的别名。
- `elevated` 仅在代理处于沙箱隔离状态时才会更改行为（否则为空操作）。
- `host=node` 可以针对 macOS 伴侣应用或无头节点主机（`openclaw node run`）。
- gateway/node 审批和允许列表：[Exec 审批](/zh/tools/exec-approvals)。

### `process`

管理后台 exec 会话。

核心操作：

- `list`, `poll`, `log`, `write`, `kill`, `clear`, `remove`

注意：

- `poll` 完成时返回新的输出和退出状态。
- `log` 支持基于行的 `offset`/`limit`（省略 `offset` 以获取最后 N 行）。
- `process` 的作用域限于每个代理；来自其他代理的会话不可见。

### `loop-detection`（工具调用循环防护措施）

OpenClaw 跟踪最近的工具调用历史，并在检测到重复的无法取得进展的循环时进行阻止或发出警告。
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

- `genericRepeat`：重复相同的工具 + 相同参数的调用模式。
- `knownPollNoProgress`：重复输出相同的轮询类工具。
- `pingPong`：交替的 `A/B/A/B` 无法取得进展的模式。
- 按代理覆盖：`agents.list[].tools.loopDetection`。

### `web_search`

使用 Brave、Firecrawl、Gemini、Grok、Kimi、Perplexity 或 Tavily 搜索网络。

核心参数：

- `query`（必需）
- `count`（1–10；默认值来自 `tools.web.search.maxResults`）

备注：

- 需要所选提供商的 API 密钥（推荐：`openclaw configure --section web`）。
- 通过 `tools.web.search.enabled` 启用。
- 响应会被缓存（默认 15 分钟）。
- 有关设置，请参阅 [Web 工具](/zh/tools/web)。

### `web_fetch`

从 URL 获取并提取可读内容（HTML → markdown/文本）。

核心参数：

- `url`（必需）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

备注：

- 通过 `tools.web.fetch.enabled` 启用。
- `maxChars` 受 `tools.web.fetch.maxCharsCap` 限制（默认 50000）。
- 响应会被缓存（默认 15 分钟）。
- 对于重度使用 JS 的网站，首选浏览器工具。
- 有关设置，请参阅 [Web 工具](/zh/tools/web)。
- 有关可选的反机器人回退方案，请参阅 [Firecrawl](/zh/tools/firecrawl)。

### `browser`

控制由 OpenClaw 管理的专用浏览器。

核心操作：

- `status`, `start`, `stop`, `tabs`, `open`, `focus`, `close`
- `snapshot` (aria/ai)
- `screenshot` (返回图像块 + `MEDIA:<path>`)
- `act` (UI 操作：click/type/press/hover/drag/select/fill/resize/wait/evaluate)
- `navigate`, `console`, `pdf`, `upload`, `dialog`

配置文件管理：

- `profiles` — 列出所有浏览器配置文件及其状态
- `create-profile` — 创建具有自动分配端口的新配置文件（或 `cdpUrl`）
- `delete-profile` — 停止浏览器，删除用户数据，从配置中移除（仅限本地）
- `reset-profile` — 终止配置文件端口上的孤立进程（仅限本地）

通用参数：

- `profile` (可选；默认为 `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (可选；选择特定的节点 ID/名称)
  Notes:
- 需要 `browser.enabled=true`（默认为 `true`；设置 `false` 以禁用）。
- 所有操作都接受可选的 `profile` 参数以支持多实例。
- 省略 `profile` 以使用安全默认值：隔离的 OpenClaw 托管浏览器 (`openclaw`)。
- 当现有的登录信息/Cookies 很重要且用户在场点击/批准任何附加提示时，请使用 `profile="user"` 以连接真实的本地主机浏览器。
- `profile="user"` 仅限主机；不要将其与 sandbox/node 目标结合使用。
- 当省略 `profile` 时，使用 `browser.defaultProfile`（默认为 `openclaw`）。
- 配置文件名称：仅限小写字母数字和连字符（最多 64 个字符）。
- 端口范围：18800-18899（最多约 100 个配置文件）。
- 远程配置文件仅支持附加（不可启动/停止/重置）。
- 如果连接了支持浏览器的节点，该工具可能会自动路由到该节点（除非您固定 `target`）。
- 安装 Playwright 时，`snapshot` 默认为 `ai`；使用 `aria` 获取辅助功能树。
- `snapshot` 还支持角色快照选项（`interactive`、`compact`、`depth`、`selector`），它们返回类似 `e12` 的引用。
- `act` 需要来自 `snapshot` 的 `ref`（来自 AI 快照的数字 `12` 或来自角色快照的 `e12`）；对于罕见的 CSS 选择器需求，请使用 `evaluate`。
- 默认情况下避免 `act` → `wait`；仅在特殊情况下使用它（没有可靠的 UI 状态可等待）。
- `upload` 可以选择传递 `ref` 以在准备后自动点击。
- `upload` 还支持 `inputRef` (aria ref) 或 `element` (CSS selector) 来直接设置 `<input type="file">`。

### `canvas`

驱动节点 Canvas（present、eval、snapshot、A2UI）。

核心操作：

- `present`、`hide`、`navigate`、`eval`
- `snapshot`（返回图像块 + `MEDIA:<path>`）
- `a2ui_push`、`a2ui_reset`

注意：

- 底层使用网关 `node.invoke`。
- 如果未提供 `node`，该工具会选择一个默认值（单个连接的节点或本地 mac 节点）。
- A2UI 仅支持 v0.8（无 `createSurface`）；CLI 会拒绝带有行错误的 v0.9 JSONL。
- 快速冒烟测试：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

发现并定位已配对的节点；发送通知；捕获摄像头/屏幕。

核心操作：

- `status`, `describe`
- `pending`, `approve`, `reject` (配对)
- `notify` (macOS `system.notify`)
- `run` (macOS `system.run`)
- `camera_list`, `camera_snap`, `camera_clip`, `screen_record`
- `location_get`, `notifications_list`, `notifications_action`
- `device_status`, `device_info`, `device_permissions`, `device_health`

注意：

- 相机/屏幕命令需要节点应用处于前台。
- 图像返回图像块 + `MEDIA:<path>`。
- 视频返回 `FILE:<path>` (mp4)。
- 位置返回 JSON 有效载荷（lat/lon/accuracy/timestamp）。
- `run` 参数：`command` argv 数组；可选 `cwd`，`env` (`KEY=VAL`)，`commandTimeoutMs`，`invokeTimeoutMs`，`needsScreenRecording`。

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

- `image` (必需的路径或 URL)
- `prompt` (可选；默认为 "描述该图片。")
- `model` (可选覆盖)
- `maxBytesMb` (可选大小上限)

注意：

- 仅当配置了 `agents.defaults.imageModel`（主备或回退），或者可以从默认模型 + 已配置的身份验证推断出隐式图像模型时可用（尽力配对）。
- 直接使用图像模型（独立于主聊天模型）。

### `image_generate`

使用配置的或推断的图像生成模型生成一张或多张图像。

核心参数：

- `action` (可选：`generate` 或 `list`；默认为 `generate`)
- `prompt` (必需)
- `image` 或 `images` (可选的编辑模式参考图像路径/URL)
- `model` （可选的 提供商/模型 覆盖）
- `size` （可选的尺寸提示）
- `resolution` （可选的 `1K|2K|4K` 提示）
- `count` （可选，`1-4`，默认为 `1`）

注意：

- 当配置了 `agents.defaults.imageGenerationModel`，或者当 OpenClaw 可以从已启用的提供商和可用的身份验证中推断出兼容的图像生成默认值时可用。
- 显式的 `agents.defaults.imageGenerationModel` 仍然优先于任何推断出的默认值。
- 使用 `action: "list"` 来检查已注册的提供商、默认模型、支持的模型 ID、尺寸、分辨率以及编辑支持。
- 返回本地 `MEDIA:<path>` 行，以便渠道可以直接传递生成的文件。
- 直接使用图像生成模型（独立于主聊天模型）。
- Google 支持的流程（包括用于原生 Nano Banana 风格路径的 `google/gemini-3-pro-image-preview`）支持参考图像编辑以及显式的 `1K|2K|4K` 分辨率提示。
- 编辑时如果省略了 `resolution`，OpenClaw 会根据输入图像尺寸推断草稿/最终分辨率。
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

有关完整的行为、限制、配置和示例，请参阅 [PDF 工具](/zh/tools/pdf)。

### `message`

在 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/Microsoft Teams 上发送消息和渠道操作。

核心操作：

- `send` （文本 + 可选媒体；Microsoft Teams 还支持 `card` 用于自适应卡片）
- `poll` （WhatsApp/Discord/Microsoft Teams 投票）
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

注意：

- `send` 通过 WhatsApp 路由 Gateway(网关)；其他通道直接连接。
- `poll` 对 Gateway(网关) 和 WhatsApp 使用 Microsoft Teams；Discord 轮询直接连接。
- 当消息工具调用绑定到活动聊天会话时，发送操作将限制在该会话的目标，以避免跨上下文泄漏。

### `cron`

管理 Gateway(网关) 的 cron 任务和唤醒操作。

核心操作：

- `status`、`list`
- `add`、`update`、`remove`、`run`、`runs`
- `wake`（将系统事件加入队列 + 可选的立即心跳）

注意：

- `add` 期望一个完整的 cron 任务对象（与 `cron.add` RPC 的架构相同）。
- `update` 使用 `{ jobId, patch }`（`id` 接受以保持兼容性）。

### `gateway`

重启或应用更新到正在运行的 Gateway(网关) 进程（就地）。

核心操作：

- `restart`（授权 + 发送 `SIGUSR1` 以进行进程内重启；`openclaw gateway` 就地重启）
- `config.schema.lookup` （在不将完整架构加载到提示上下文的情况下，一次检查一个配置路径）
- `config.get`
- `config.apply` （验证 + 写入配置 + 重启 + 唤醒）
- `config.patch` （合并部分更新 + 重启 + 唤醒）
- `update.run` （运行更新 + 重启 + 唤醒）

备注：

- `config.schema.lookup` 期望一个特定的配置路径，例如 `gateway.auth` 或 `agents.list.*.heartbeat`。
- 在定位 `plugins.entries.<id>` 时，路径可能包含用斜杠分隔的插件 ID，例如 `plugins.entries.pack/one.config`。
- 使用 `delayMs` （默认为 2000）以避免中断正在进行的回复。
- `config.schema` 仍然可供内部 Control UI 流使用，并且不通过代理 `gateway` 工具公开。
- `restart` 默认处于启用状态；设置 `commands.restart: false` 可将其禁用。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出会话、检查记录历史，或发送到另一个会话。

核心参数：

- `sessions_list`： `kinds?`、`limit?`、`activeMinutes?`、`messageLimit?`（0 = 无）
- `sessions_history`： `sessionKey`（或 `sessionId`）、`limit?`、`includeTools?`
- `sessions_send`： `sessionKey`（或 `sessionId`）、`message`、`timeoutSeconds?`（0 = 发后即忘）
- `sessions_spawn`: `task`, `label?`, `runtime?`, `agentId?`, `model?`, `thinking?`, `cwd?`, `runTimeoutSeconds?`, `thread?`, `mode?`, `cleanup?`, `sandbox?`, `streamTo?`, `attachments?`, `attachAs?`
- `session_status`: `sessionKey?` (默认为当前；接受 `sessionId`), `model?` (`default` 清除覆盖)

说明：

- `main` 是规范化的直接聊天键；global/unknown 会被隐藏。
- `messageLimit > 0` 获取每个会话的最后 N 条消息（已过滤工具消息）。
- 会话定位由 `tools.sessions.visibility` 控制（默认 `tree`：当前会话 + 生成的子代理会话）。如果您运行一个多用户共享的代理，考虑设置 `tools.sessions.visibility: "self"` 以防止跨会话浏览。
- 当 `timeoutSeconds > 0` 时，`sessions_send` 会等待最终完成。
- 投递/通知在完成后进行，并尽最大努力完成；`status: "ok"` 确认代理运行已完成，而非通知已投递。
- `sessions_spawn` 支持 `runtime: "subagent" | "acp"`（默认 `subagent`）。有关 ACP 运行时行为，请参阅 [ACP Agents](/zh/tools/acp-agents)。
- 对于 ACP 运行时，`streamTo: "parent"` 将初始运行的进度摘要作为系统事件（而非直接子级投递）路由回请求者会话。
- `sessions_spawn` 启动子代理运行，并将通知回复发布回请求者聊天。
  - 支持单次运行模式（`mode: "run"`）和持久化线程绑定模式（`mode: "session"` 配合 `thread: true`）。
  - 如果省略了 `thread: true` 和 `mode`，模式默认为 `session`。
  - `mode: "session"` 需要 `thread: true`。
  - 如果省略了 `runTimeoutSeconds`，OpenClaw 将在设置时使用 `agents.defaults.subagents.runTimeoutSeconds`；否则超时默认为 `0`（无超时）。
  - Discord 线程绑定流依赖于 `session.threadBindings.*` 和 `channels.discord.threadBindings.*`。
  - 回复格式包括 `Status`、`Result` 和紧凑统计信息。
  - `Result` 是助手完成文本；如果缺失，将使用最新的 `toolResult` 作为后备。
- 手动完成模式首先直接生成发送，并在发生短暂故障时使用队列回退和重试（`status: "ok"` 表示运行已完成，而非公告已送达）。
- `sessions_spawn` 仅支持子代理运行时的内联文件附件（ACP 会拒绝它们）。每个附件都有 `name`、`content` 以及可选的 `encoding`（`utf8` 或 `base64`）和 `mimeType`。文件会通过 `.manifest.json` 元数据文件实例化到子工作区的 `.openclaw/attachments/<uuid>/` 中。该工具会返回包含 `count`、`totalBytes`、每个文件的 `sha256` 和 `relDir` 的收据。附件内容会自动从持久化的脚本记录中编辑掉。
  - 通过 `tools.sessions_spawn.attachments` 配置限制（`enabled`、`maxTotalBytes`、`maxFiles`、`maxFileBytes`、`retainOnSessionKeep`）。
  - `attachAs.mountPath` 是为未来挂载实现保留的提示。
- `sessions_spawn` 是非阻塞的，并立即返回 `status: "accepted"`。
- ACP `streamTo: "parent"` 响应可能包含 `streamLogPath`（会话作用域的 `*.acp-stream.jsonl`）用于跟踪进度历史。
- `sessions_send` 运行回传乒乓（回复 `REPLY_SKIP` 以停止；最大轮数通过 `session.agentToAgent.maxPingPongTurns` 设置，0–5）。
- 乒乓结束后，目标代理运行一个 **announce step**；回复 `ANNOUNCE_SKIP` 以取消通知。
- 沙箱限制：当当前会话处于沙箱隔离状态且 `agents.defaults.sandbox.sessionToolsVisibility: "spawned"` 时，OpenClaw 会将 `tools.sessions.visibility` 限制为 `tree`。

### `agents_list`

列出当前会话可以通过 `sessions_spawn` 定位的代理 ID。

注意事项：

- 结果仅限于按代理的允许列表（`agents.list[].subagents.allowAgents`）。
- 配置 `["*"]` 后，该工具包含所有已配置的代理并标记 `allowAny: true`。

## 参数（通用）

Gateway(网关) 支持的工具（`canvas`、`nodes`、`cron`）：

- `gatewayUrl`（默认 `ws://127.0.0.1:18789`）
- `gatewayToken`（如果启用了身份验证）
- `timeoutMs`

注意：当设置了 `gatewayUrl` 时，必须显式包含 `gatewayToken`。工具不会继承覆盖的配置或环境凭证，缺少显式凭证将导致错误。

浏览器工具：

- `profile`（可选；默认为 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可选；指定特定的节点 ID/名称）
- 故障排除指南：
  - Linux 启动/CDP 问题：[浏览器故障排除（Linux）](/zh/tools/browser-linux-troubleshooting)
  - WSL2 Gateway(网关) + Windows 远程 Chrome CDP：[WSL2 + Windows + 远程 Chrome CDP 故障排除](/zh/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## 推荐的代理流程

浏览器自动化：

1. `browser` → `status` / `start`
2. `snapshot` (ai 或 aria)
3. `act` (点击/输入/按压)
4. `screenshot` 如果您需要视觉确认

Canvas 渲染：

1. `canvas` → `present`
2. `a2ui_push` （可选）
3. `snapshot`

节点定位：

1. `nodes` → `status`
2. 在所选节点上执行 `describe`
3. `notify` / `run` / `camera_snap` / `screen_record`

## 安全

- 避免直接使用 `system.run`；仅在获得用户明确同意时才使用 `nodes` → `run`。
- 尊重用户对相机/屏幕截取的同意。
- 在调用媒体命令之前，使用 `status/describe` 确保权限。

## 工具如何呈现给智能体

工具通过两个并行通道展示：

1. **系统提示词文本**：人类可读的列表 + 指南。
2. **工具架构**：发送到模型 API 的结构化函数定义。

这意味着智能体既能看到“有哪些工具”，也能看到“如何调用它们”。如果某个工具未出现在系统提示词或架构中，模型将无法调用它。

import zh from "/components/footer/zh.mdx";

<zh />
